const fs = require('fs');
const path = require('path');

const HIGHSCORES_FILE = path.join(__dirname, 'json', 'highscores.json');
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
    const { username, playerId, gameMode, points, totalQuestions, correctAnswers } = gameData;
    
    if (!username || !gameMode || points === undefined) {
        throw new Error('Unvollständige Daten: username, gameMode, points erforderlich');
    }

    // Verwende playerId wenn vorhanden, sonst IP
    const playerKey = playerId ? `${ip}_${playerId}` : ip;

    let scores = loadScores();
    const now = new Date().toISOString();
    
    // Wenn noch nicht vorhanden, initialisiere Player
    if (!scores.players[playerKey]) {
        scores.players[playerKey] = {
            username: username,
            ip: ip,
            playerId: playerId || null,
            firstSeen: now,
            lastSeen: now,
            scores: []
        };
    } else {
        // Update username falls geändert
        if (username !== scores.players[playerKey].username) {
            scores.players[playerKey].username = username;
        }
        scores.players[playerKey].lastSeen = now;
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
    scores.players[playerKey].scores.push(scoreEntry);
    if (scores.players[playerKey].scores.length > MAX_SCORES_PER_PLAYER) {
        scores.players[playerKey].scores = scores.players[playerKey].scores.slice(-MAX_SCORES_PER_PLAYER);
    }

    // Rebuild Leaderboards from all player scores (no summing per mode; keep best per mode)
    rebuildLeaderboards(scores);
    
    // Speichern
    scores.lastUpdated = now;
    saveScores(scores);

    return scoreEntry;
}

/**
 * Update Leaderboard für Modus und Global
 */
function rebuildLeaderboards(scores) {
    const leaderboard = {};

    // Sammle pro Spieler und Modus: bestes Punkte-Ergebnis + Stats
    Object.keys(scores.players).forEach(playerIp => {
        const player = scores.players[playerIp];
        const modeGroups = {};

        player.scores.forEach(s => {
            if (!modeGroups[s.gameMode]) {
                modeGroups[s.gameMode] = [];
            }
            modeGroups[s.gameMode].push(s);
        });

        Object.keys(modeGroups).forEach(mode => {
            const arr = modeGroups[mode];
            if (!leaderboard[mode]) leaderboard[mode] = [];

            const bestPoints = Math.max(...arr.map(s => s.points));
            const avgAccuracy = Math.round(arr.reduce((sum, s) => sum + s.accuracy, 0) / arr.length);
            const lastScoreDate = arr[arr.length - 1].date;

            leaderboard[mode].push({
                ip: playerIp,
                username: player.username,
                gameMode: mode,
                points: bestPoints,
                totalPoints: bestPoints,
                avgAccuracy,
                gamesPlayed: arr.length,
                lastScore: lastScoreDate
            });
        });
    });

    // Sortiere jede Modus-Liste nach Punkten
    Object.keys(leaderboard).forEach(mode => {
        leaderboard[mode].sort((a, b) => b.points - a.points);
        leaderboard[mode] = leaderboard[mode].slice(0, MAX_SCORES_PER_MODE);
    });

    // Global: ALLE einzelnen Scores von allen Spielern, sortiert nach Punkten
    const allScores = [];
    Object.keys(scores.players).forEach(playerIp => {
        const player = scores.players[playerIp];
        if (!player.scores || player.scores.length === 0) return;
        player.scores.forEach(score => {
            allScores.push({
                ip: playerIp,
                username: player.username,
                gameMode: score.gameMode,
                points: score.points,
                totalPoints: score.points,
                accuracy: score.accuracy,
                date: score.date
            });
        });
    });

    allScores.sort((a, b) => b.points - a.points);
    leaderboard['Global'] = allScores.slice(0, 100); // Top 100

    scores.leaderboard = leaderboard;
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
    saveScores,
    rebuildLeaderboards
};
