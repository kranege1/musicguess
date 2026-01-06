const fs = require('fs');
const path = require('path');

const HIGHSCORES_FILE = path.join(__dirname, 'highscores.json');
const MAX_SCORES_PER_MODE = 10;
const MAX_SCORES_PER_PLAYER = 100;

/**
 * Lade highscores.json
 */
function loadScores() {
    try {
        if (!fs.existsSync(HIGHSCORES_FILE)) {
            return initializeScores();
        }
        const data = fs.readFileSync(HIGHSCORES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Fehler beim Laden von highscores.json:', err);
        return initializeScores();
    }
}

/**
 * Initialisiere leere Struktur
 */
function initializeScores() {
    return {
        players: {},
        leaderboard: {
            'Genre': [],
            'Billboard Hot 100': [],
            'Freie Wahl (iTunes Suche)': [],
            'Global': []
        },
        lastUpdated: new Date().toISOString()
    };
}

/**
 * Speichere Scores in JSON
 */
function saveScores(data) {
    try {
        fs.writeFileSync(HIGHSCORES_FILE, JSON.stringify(data, null, 2), 'utf8');
        console.log('✅ Highscores gespeichert');
        return true;
    } catch (err) {
        console.error('Fehler beim Speichern von highscores.json:', err);
        return false;
    }
}

/**
 * Extrahiere IP-Adresse aus Request
 */
function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           req.connection.remoteAddress ||
           'unknown';
}

/**
 * Speichere einen neuen Score
 */
function saveScore(req, gameData) {
    const ip = getClientIP(req);
    const { username, gameMode, points, totalQuestions, correctAnswers } = gameData;
    
    if (!username || !gameMode || points === undefined) {
        throw new Error('Unvollständige Daten: username, gameMode, points erforderlich');
    }

    let scores = loadScores();
    const now = new Date().toISOString();
    
    // Wenn noch nicht vorhanden, initialisiere Player
    if (!scores.players[ip]) {
        scores.players[ip] = {
            username: username,
            ip: ip,
            firstSeen: now,
            lastSeen: now,
            scores: []
        };
    } else {
        // Update username falls geändert
        if (username !== scores.players[ip].username) {
            scores.players[ip].username = username;
        }
        scores.players[ip].lastSeen = now;
    }

    // Neuer Score-Eintrag
    const scoreEntry = {
        id: `score-${Date.now()}`,
        gameMode: gameMode,
        points: Math.round(points),
        totalQuestions: totalQuestions,
        correctAnswers: correctAnswers,
        accuracy: Math.round((correctAnswers / totalQuestions) * 100),
        date: now
    };

    // Zu Player hinzufügen (max 100)
    scores.players[ip].scores.push(scoreEntry);
    if (scores.players[ip].scores.length > MAX_SCORES_PER_PLAYER) {
        scores.players[ip].scores = scores.players[ip].scores.slice(-MAX_SCORES_PER_PLAYER);
    }

    // Update Leaderboards
    updateLeaderboards(scores, ip, username, scoreEntry);
    
    // Speichern
    scores.lastUpdated = now;
    saveScores(scores);

    return scoreEntry;
}

/**
 * Update Leaderboard für Modus und Global
 */
function updateLeaderboards(scores, ip, username, scoreEntry) {
    const gameMode = scoreEntry.gameMode;
    
    // Überprüfe ob Modus existiert, wenn nicht, erstelle ihn
    if (!scores.leaderboard[gameMode]) {
        scores.leaderboard[gameMode] = [];
    }

    // Berechne durchschnittliche Stats für Player
    const playerScores = scores.players[ip].scores;
    const totalPoints = playerScores.reduce((sum, s) => sum + s.points, 0);
    const avgAccuracy = Math.round(
        playerScores.reduce((sum, s) => sum + s.accuracy, 0) / playerScores.length
    );
    const gamesPlayed = playerScores.length;

    const leaderboardEntry = {
        ip: ip,
        username: username,
        points: scoreEntry.points,
        totalPoints: totalPoints,
        avgAccuracy: avgAccuracy,
        gamesPlayed: gamesPlayed,
        lastScore: scoreEntry.date
    };

    // Entferne alte Entry falls vorhanden (für diesen IP)
    scores.leaderboard[gameMode] = scores.leaderboard[gameMode].filter(e => e.ip !== ip);
    scores.leaderboard[gameMode].push(leaderboardEntry);

    // Sortiere und limitiere auf TOP 10
    scores.leaderboard[gameMode].sort((a, b) => b.totalPoints - a.totalPoints);
    scores.leaderboard[gameMode] = scores.leaderboard[gameMode].slice(0, MAX_SCORES_PER_MODE);

    // Global Leaderboard (alle Modi combined)
    scores.leaderboard['Global'] = scores.leaderboard[gameMode].filter(e => e.ip !== ip);
    
    // Sammle beste Scores von allen Modi für Global
    const globalEntries = {};
    Object.keys(scores.leaderboard).forEach(mode => {
        if (mode !== 'Global') {
            scores.leaderboard[mode].forEach(entry => {
                if (!globalEntries[entry.ip]) {
                    globalEntries[entry.ip] = {
                        ip: entry.ip,
                        username: entry.username,
                        totalPoints: 0,
                        avgAccuracy: 0,
                        gamesPlayed: 0,
                        modesPlayed: 0
                    };
                }
                globalEntries[entry.ip].totalPoints += entry.totalPoints;
                globalEntries[entry.ip].avgAccuracy += entry.avgAccuracy;
                globalEntries[entry.ip].gamesPlayed += entry.gamesPlayed;
                globalEntries[entry.ip].modesPlayed++;
            });
        }
    });

    scores.leaderboard['Global'] = Object.values(globalEntries)
        .map(e => ({
            ...e,
            avgAccuracy: Math.round(e.avgAccuracy / e.modesPlayed)
        }))
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, MAX_SCORES_PER_MODE);
}

/**
 * Hole Top 10 für einen Modus
 */
function getLeaderboard(gameMode) {
    let scores = loadScores();
    
    if (gameMode === 'Global') {
        return scores.leaderboard['Global'] || [];
    }

    return scores.leaderboard[gameMode] || [];
}

/**
 * Hole Player-Info basierend auf IP
 */
function getPlayerByIP(ip) {
    let scores = loadScores();
    return scores.players[ip] || null;
}

/**
 * Hole alle Player Stats für ein Leaderboard
 */
function getAllPlayers() {
    let scores = loadScores();
    return scores.players;
}

module.exports = {
    saveScore,
    getLeaderboard,
    getPlayerByIP,
    getAllPlayers,
    getClientIP,
    loadScores,
    saveScores
};
