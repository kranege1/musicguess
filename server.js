const express = require('express');
const cors = require('cors');
require('dotenv').config();
const http = require('http');
const path = require('path');
const { saveScore, getLeaderboard, getPlayerByIP, getClientIP } = require('./highscoreManager');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory cache for iTunes previews
const previewCache = {};
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

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
        const songs = require('./songs.json');
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

// POST /api/score - Neuen Score speichern
app.post('/api/score', (req, res) => {
    try {
        const { username, playerId, gameMode, points, totalQuestions, correctAnswers } = req.body;
        
        console.log('📨 Score-Request erhalten:', { username, playerId, gameMode, points, totalQuestions, correctAnswers });
        
        if (!username || !gameMode || points === undefined || !totalQuestions || correctAnswers === undefined) {
            console.error('❌ Unvollständige Daten:', { username, playerId, gameMode, points, totalQuestions, correctAnswers });
            return res.status(400).json({ error: 'Unvollständige Daten' });
        }

        const scoreEntry = saveScore(req, {
            username,
            playerId,
            gameMode,
            points,
            totalQuestions,
            correctAnswers
        });

        console.log('✅ Score erfolgreich gespeichert:', scoreEntry);
        
        res.json({
            success: true,
            score: scoreEntry
        });
    } catch (err) {
        console.error('❌ Fehler beim Speichern des Scores:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/leaderboard/:mode - Top 10 für einen Modus
app.get('/api/leaderboard/:mode', (req, res) => {
    try {
        const mode = decodeURIComponent(req.params.mode);
        const leaderboard = getLeaderboard(mode);
        
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

// GET /api/leaderboard-global - Globales Leaderboard
app.get('/api/leaderboard-global', (req, res) => {
    try {
        const leaderboard = getLeaderboard('Global');
        
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

// Static files (AFTER API routes to avoid conflicts)
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
app.listen(PORT, () => {
    console.log(`🎵 MusicGuess Server running on port ${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api`);
    console.log(`🌐 Web: http://localhost:${PORT}`);
});
