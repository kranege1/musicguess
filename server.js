const express = require('express');
const cors = require('cors');
require('dotenv').config();
const http = require('http');
const path = require('path');
const { saveScore, getLeaderboard, getPlayerByIP, getClientIP } = require('./highscoreManager');
const { db } = require('./firebaseConfig');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory cache for iTunes previews
const previewCache = {};
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Get country code from IP (simple mapping - can be enhanced with geoip library)
function getCountryFromIP(ip) {
    // For localhost/private IPs, return a default
    if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return 'XX';
    }
    // In production, use a geoip library like geoip2 or maxmind
    // For now, return XX as placeholder
    return 'XX';
}

/**
 * Fetch preview URL from iTunes API
 */
async function fetchFromItunes(searchTerm, countries = ['DE', 'US', 'GB', 'FR', 'AU']) {
    for (const country of countries) {
        try {
            const encodedQuery = encodeURIComponent(searchTerm);
            const url = `https://itunes.apple.com/search?term=${encodedQuery}&entity=song&limit=10&media=music&country=${country}`;
            
            const response = await fetch(url, { 
                cache: 'no-store',
                timeout: 10000
            });
            
            if (!response.ok) {
                console.log(`[${country}] HTTP ${response.status}`);
                continue;
            }
            
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                // Find song with preview
                for (const result of data.results) {
                    if (result.previewUrl) {
                        const preview = result.previewUrl.replace(/^http:/, 'https:');
                        console.log(`[${country}] ✓ Found: "${result.trackName}" by ${result.artistName}`);
                        return {
                            preview,
                            country,
                            track: result.trackName,
                            artist: result.artistName
                        };
                    }
                }
            }
        } catch (err) {
            console.log(`[${country}] Error: ${err.message}`);
            continue;
        }
    }
    
    throw new Error('No preview found in any country');
}

/**
 * API: GET /api/songs
 * Returns songs.json content
 */
app.get('/api/songs', (req, res) => {
    try {
        const songs = require('./json/songs.json');
        res.json(songs);
    } catch (err) {
        console.error('Error loading songs.json:', err);
        res.status(500).json({ error: 'Failed to load songs' });
    }
});

/**
 * API: GET /api/preview?artist=X&track=Y
 * Returns preview URL with caching
 */
app.get('/api/preview', async (req, res) => {
    const { artist, track } = req.query;
    
    if (!artist || !track) {
        return res.status(400).json({ error: 'Missing artist or track parameter' });
    }
    
    const cacheKey = `${artist}||${track}`;
    const now = Date.now();
    
    // Check cache
    if (previewCache[cacheKey]) {
        const cached = previewCache[cacheKey];
        if (now - cached.timestamp < CACHE_TTL) {
            console.log(`[CACHE HIT] ${artist} - ${track}`);
            return res.json(cached.data);
        }
    }
    
    // Fetch from iTunes
    try {
        console.log(`[API] Fetching: ${artist} - ${track}`);
        const result = await fetchFromItunes(`${artist} ${track}`);
        
        // Cache result
        previewCache[cacheKey] = {
            data: result,
            timestamp: now
        };
        
        console.log(`[CACHE] Stored: ${artist} - ${track} (${Object.keys(previewCache).length} items)`);
        res.json(result);
    } catch (err) {
        console.error(`[ERROR] ${artist} - ${track}: ${err.message}`);
        res.status(404).json({ 
            error: 'Preview not found',
            message: err.message
        });
    }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        version: 'v39',
        cached: Object.keys(previewCache).length
    });
});

/**
 * HIGHSCORE API ENDPOINTS
 */

// GET /api/player - Spieler-Info basierend auf IP
app.get('/api/player', (req, res) => {
    const ip = getClientIP(req);
    const player = getPlayerByIP(ip);
    
    if (player) {
        res.json({
            username: player.username,
            ip: ip,
            totalScores: player.scores.length
        });
    } else {
        res.json({
            username: null,
            ip: ip,
            totalScores: 0
        });
    }
});

// GET /api/check-name/:name - Check if player name is unique (DISABLED - allow duplicate names)
app.get('/api/check-name/:name', async (req, res) => {
    // Allow duplicate names - return always false
    res.json({ exists: false });
});

// POST /api/score - Neuen Score speichern (Firebase)
app.post('/api/score', async (req, res) => {
    try {
        const { username, playerId, gameMode, points, totalQuestions, correctAnswers } = req.body;
        
        console.log('📨 Score-Request erhalten:', { username, playerId, gameMode, points, totalQuestions, correctAnswers });
        
        if (!username || !gameMode || points === undefined || !totalQuestions || correctAnswers === undefined) {
            console.error('❌ Unvollständige Daten:', { username, playerId, gameMode, points, totalQuestions, correctAnswers });
            return res.status(400).json({ error: 'Unvollständige Daten', success: false });
        }

        // Validate: minimum 10 questions required
        if (totalQuestions < 10) {
            console.log('⚠️  Score nicht gespeichert: Weniger als 10 Fragen beantwortet');
            return res.json({
                success: false,
                message: 'Mindestens 10 Fragen erforderlich',
                saved: false
            });
        }

        // Save to Firestore
        const scoreRef = db.collection('scores').doc();
        const scoreData = {
            userId: playerId,
            username: username,
            gameMode: gameMode,
            points: points,
            totalQuestions: totalQuestions,
            correctAnswers: correctAnswers,
            timestamp: new Date(),
            country: getCountryFromIP(getClientIP(req)),
            documentId: scoreRef.id
        };

        await scoreRef.set(scoreData);
        
        console.log('✅ Score erfolgreich in Firestore gespeichert:', scoreData);
        
        res.json({
            success: true,
            message: 'Score gespeichert',
            score: scoreData,
            saved: true
        });
    } catch (err) {
        console.error('❌ Fehler beim Speichern des Scores:', err);
        res.status(500).json({ 
            error: err.message,
            success: false,
            saved: false
        });
    }
});

// GET /api/leaderboard/:mode - Top 10 für einen Modus (Firestore)
app.get('/api/leaderboard/:mode', async (req, res) => {
    try {
        const mode = decodeURIComponent(req.params.mode);
        
        // Handle Global leaderboard (all scores regardless of mode)
        if (mode === 'Global') {
            const snapshot = await db.collection('scores')
                .orderBy('points', 'desc')
                .limit(10)
                .get();
            
            const leaderboard = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                leaderboard.push({
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : null
                });
            });
            
            return res.json({
                mode: 'Global',
                count: leaderboard.length,
                scores: leaderboard
            });
        }
        
        // Handle mode-specific leaderboard without requiring a composite index
        // Fetch all scores for the mode, then sort in-memory by points desc and take top 10
        const snapshot = await db.collection('scores')
            .where('gameMode', '==', mode)
            .get();
        
        const allScores = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            allScores.push({
                id: doc.id,
                ...data,
                timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : null
            });
        });
        
        const leaderboard = allScores
            .sort((a, b) => (b.points || 0) - (a.points || 0))
            .slice(0, 10);
        
        res.json({
            mode: mode,
            count: leaderboard.length,
            scores: leaderboard
        });
    } catch (err) {
        console.error('Fehler beim Laden des Leaderboards:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/leaderboard-global - Globales Leaderboard (Firestore)
app.get('/api/leaderboard-global', async (req, res) => {
    try {
        const snapshot = await db.collection('scores')
            .orderBy('points', 'desc')
            .limit(10)
            .get();
        
        const leaderboard = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            leaderboard.push({
                id: doc.id,
                ...data,
                timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : null
            });
        });
        
        res.json({
            mode: 'Global',
            count: leaderboard.length,
            scores: leaderboard
        });
    } catch (err) {
        console.error('Fehler beim Laden des globalen Leaderboards:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/all-scores - All scores for ranking calculation
app.get('/api/all-scores', async (req, res) => {
    try {
        const snapshot = await db.collection('scores')
            .orderBy('points', 'desc')
            .get();
        
        const allScores = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            allScores.push({
                id: doc.id,
                ...data,
                timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : null
            });
        });
        
        res.json({
            count: allScores.length,
            scores: allScores
        });
    } catch (err) {
        console.error('Fehler beim Laden aller Scores:', err);
        res.status(500).json({ error: err.message });
    }
});

// Proxy endpoint for Deezer API to bypass CORS
app.get('/api/deezer/artist', async (req, res) => {
    try {
        const artistName = req.query.q;
        if (!artistName) {
            return res.status(400).json({ error: 'Artist name required' });
        }

        const encodedArtist = encodeURIComponent(artistName);
        const deezerUrl = `https://api.deezer.com/search/artist?q=${encodedArtist}&limit=1`;

        const response = await fetch(deezerUrl, {
            headers: {
                'User-Agent': 'MusicGuess/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Deezer API error: ${response.status}`);
        }

        const data = await response.json();
        
        // If we found an artist, fetch their full details to get fan count
        if (data.data && data.data.length > 0) {
            const artistId = data.data[0].id;
            const detailUrl = `https://api.deezer.com/artist/${artistId}`;
            
            const detailResponse = await fetch(detailUrl, {
                headers: {
                    'User-Agent': 'MusicGuess/1.0'
                }
            });
            
            if (detailResponse.ok) {
                const detailData = await detailResponse.json();
                // Enrich the search result with fan count
                data.data[0].nb_fan = detailData.nb_fan;
                data.data[0].fans = detailData.nb_fan;
            }
        }
        
        res.json(data);
    } catch (error) {
        console.error('Deezer API proxy error:', error);
        res.status(500).json({ error: 'Failed to fetch artist data from Deezer' });
    }
});

// Proxy endpoint for Deezer album search to bypass CORS
app.get('/api/deezer/album', async (req, res) => {
    try {
        const searchQuery = req.query.q;
        if (!searchQuery) {
            return res.status(400).json({ error: 'Search query required' });
        }

        const encodedQuery = encodeURIComponent(searchQuery);
        const deezerUrl = `https://api.deezer.com/search/album?q=${encodedQuery}&limit=1`;

        const response = await fetch(deezerUrl, {
            headers: {
                'User-Agent': 'MusicGuess/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Deezer API error: ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Deezer album API proxy error:', error);
        res.status(500).json({ error: 'Failed to fetch album data from Deezer' });
    }
});

// Proxy endpoint for Deezer album details by ID to bypass CORS
app.get('/api/deezer/album/:id', async (req, res) => {
    try {
        const albumId = req.params.id;
        const deezerUrl = `https://api.deezer.com/album/${albumId}`;

        const response = await fetch(deezerUrl, {
            headers: {
                'User-Agent': 'MusicGuess/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Deezer API error: ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Deezer album details API proxy error:', error);
        res.status(500).json({ error: 'Failed to fetch album details from Deezer' });
    }
});

// Static files (AFTER API routes to avoid conflicts)
// Add no-cache headers to prevent browser caching
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

app.use(express.static(path.join(__dirname), {
    etag: false,
    maxAge: 0 // No client-side caching
}));

/**
 * Serve index.html for any unknown routes (SPA routing)
 * MUST be AFTER all other routes and static files!
 */
app.get('/*', (req, res) => {
    // Don't serve index.html for API calls or real files
    if (req.path.includes('/api') || req.path.includes('.')) {
        return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`🎵 MusicGuess Server running on port ${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api`);
    console.log(`🌐 Web: http://localhost:${PORT}`);
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
