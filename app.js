const APP_VERSION = '11.01.2026 00:00';
window.APP_VERSION = APP_VERSION;

// Detect if running on server or static hosting
const API_BASE = window.location.origin; // Will use /api endpoints if available
const USE_SERVER_API = () => {
    // Try to use /api/preview if available (Render/Node server)
    return typeof fetch !== 'undefined';
};

// Debug Log Helper (disabled - logs go to console only)
function debugLog(message, errorCode = null) {
    // Just log to console, don't display in UI
    const prefix = errorCode ? `[${errorCode}] ` : '';
    console.log(prefix + message);
}

// Removed: debugLog display on page load

// Globale Variablen
let gameState = {
    songs: [],
    currentQuestion: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    totalPoints: 0,
    currentSong: null,
    currentAudio: null,
    isAnswered: false,
    previewDuration: 5,
    audioSource: null,
    audioContext: null,
    progressInterval: null,
    lastError: '',
    // Tracking für aktuelle Frage
    currentPlayCount: 0,
    currentPlayedReverse: false,
    totalPlayTime: 0,  // Gesamt-Abspielzeit in Sekunden für aktuelle Frage
    previewFinished: false,
    pointsCountdownValue: 0,
    pointsCountdownBase: 0,
    pointsCountdownTimer: null,
    pointsCountdownActive: false,
    pointsCountdownInitial: 0,
    pointsCountdownStartTime: null,
    firstPlayDone: false, // Flag ob bereits einmal abgespielt wurde
};

// Lade verfügbare Genres beim Seitenstart
async function loadAvailableGenres() {
    console.log('loadAvailableGenres() wird aufgerufen...');
    debugLog('🔄 Lade Genres...');
    try {
        let response;
        // Try server API first, fallback to direct songs.json
        try {
            response = await fetch(`${API_BASE}/api/songs`, { cache: 'no-store' });
        } catch (apiErr) {
            console.log('API nicht verfügbar, nutze direktes songs.json');
            const cacheBuster = new Date().getTime();
            response = await fetch(`songs.json?v=${cacheBuster}`, { cache: 'no-store' });
        }
        
        console.log('Songs Response:', response.status);
        debugLog(`📥 Songs geladen: ${response.status}`);
        
        if (!response.ok) {
            debugLog(`[F1] ❌ Songs HTTP ${response.status}`, 'F1');
            throw new Error('Fehler beim Laden der Songs');
        }

        const songs = await response.json();
        console.log(`${songs.length} Songs geladen`);
        debugLog(`✅ ${songs.length} Songs geladen`);
        
        // Extrahiere einzigartige Genres
        const genres = [...new Set(songs.map(song => song.genre))].sort();
        console.log('Gefundene Genres:', genres);
        debugLog(`🎵 Genres: ${genres.join(', ')}`);
        
        // Fülle die Genre-Dropdown
        const genreSelect = document.getElementById('genreSelect');
        
        if (!genreSelect) {
            console.error('genreSelect Element nicht gefunden!');
            return;
        }
        
        console.log('genreSelect Element gefunden, füge Genres hinzu...');
        
        // Lösche alle Optionen und füge "Alle Genres" wieder hinzu
        genreSelect.innerHTML = '';
        
        const alleOption = document.createElement('option');
        alleOption.value = 'Alle';
        alleOption.textContent = 'Alle Genres';
        genreSelect.appendChild(alleOption);
        
        // Füge alle gefundenen Genres hinzu
        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            genreSelect.appendChild(option);
            console.log(`Genre hinzugefügt: ${genre}`);
        });
        
        console.log(`✅ ${genres.length} Genres erfolgreich geladen!`);
    } catch (error) {
        console.error('❌ Fehler beim Laden der Genres:', error);
        debugLog(`[F1] ❌ Load failed: ${error.message}`, 'F1');
    }
}

// Lade verfügbare Jahre für Billboard
async function loadAvailableYears() {
    console.log('loadAvailableYears() wird aufgerufen...');
    try {
        const cacheBuster = new Date().getTime();
        const response = await fetch(`hot-10-unique.json?v=${cacheBuster}`, { cache: 'no-store' });
        
        if (!response.ok) {
            throw new Error('Fehler beim Laden der Billboard Daten');
        }

        const songs = await response.json();
        
        console.log(`${songs.length} Billboard Songs geladen`);
        
        // Extrahiere einzigartige Jahre aus chart_week
        const years = [...new Set(songs.map(song => {
            const year = song.chart_week.substring(0, 4);
            return year;
        }))].sort((a, b) => b - a); // Neueste zuerst
        
        console.log('Gefundene Jahre:', years);
        
        // Fülle die Jahr-Dropdown
        const yearSelect = document.getElementById('yearSelect');
        
        if (!yearSelect) {
            console.error('yearSelect Element nicht gefunden!');
            return;
        }
        
        // Lösche alle Optionen außer der ersten
        yearSelect.innerHTML = '<option value="">Jahr auswählen...</option>';
        
        // Füge alle gefundenen Jahre hinzu
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });
        
        console.log(`✅ ${years.length} Jahre erfolgreich geladen!`);
    } catch (error) {
        console.error('❌ Fehler beim Laden der Jahre:', error);
    }
}

// Lade Billboard Songs für ausgewähltes Jahr
async function loadBillboardSongsForYear() {
    const yearSelect = document.getElementById('yearSelect');
    const songInfoSelect = document.getElementById('billboardSongInfo');
    const selectedYear = yearSelect.value;
    
    if (!selectedYear) {
        songInfoSelect.innerHTML = '<option value="">Wähle zuerst ein Jahr...</option>';
        songInfoSelect.disabled = true;
        return;
    }
    
    try {
        const cacheBuster = new Date().getTime();
        const response = await fetch(`hot-10-unique.json?v=${cacheBuster}`, { cache: 'no-store' });
        
        if (!response.ok) {
            throw new Error('Fehler beim Laden der Billboard Daten');
        }

        const allSongs = await response.json();
        
        // Filtere Songs nach Jahr
        const yearSongs = allSongs.filter(song => song.chart_week.startsWith(selectedYear));
        
        console.log(`${yearSongs.length} Songs für Jahr ${selectedYear} gefunden`);
        
        // Fülle Info-Dropdown
        songInfoSelect.innerHTML = `<option value="">${yearSongs.length} Songs aus ${selectedYear}</option>`;
        
        yearSongs.forEach(song => {
            const option = document.createElement('option');
            option.value = `${song.performer} - ${song.title}`;
            option.textContent = `${song.performer} - ${song.title}`;
            songInfoSelect.appendChild(option);
        });
        
        songInfoSelect.disabled = false;
    } catch (error) {
        console.error('❌ Fehler beim Laden der Songs:', error);
        songInfoSelect.innerHTML = '<option value="">Fehler beim Laden...</option>';
        songInfoSelect.disabled = true;
    }
}

// Lade Version
async function loadVersion() {
    try {
        const response = await fetch('version.json');
        if (response.ok) {
            const data = await response.json();
            const versionSpan = document.getElementById('version');
            if (versionSpan) {
                versionSpan.textContent = `v${data.version}`;
            }
        }
    } catch (error) {
        console.log('Version konnte nicht geladen werden:', error);
    }
}

// Initialisierung beim Laden der Seite
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        loadVersion();
        loadAvailableGenres();
        loadAvailableYears();
        loadArtistNames();
    });
} else {
    // DOM ist bereits geladen
    loadVersion();
    loadAvailableGenres();
    loadAvailableYears();
    loadArtistNames();
}

// Artist Bubbles Animation
let artistNames = [];
let bubbleInterval = null;
let activeBubbles = 0;

// Lade Künstlernamen aus ArtistsList.json
async function loadArtistNames() {
    try {
        const cacheBuster = new Date().getTime();
        const response = await fetch(`ArtistsList.json?v=${cacheBuster}`, { cache: 'no-store' });
        
        if (!response.ok) {
            throw new Error('Fehler beim Laden der Künstler');
        }

        const data = await response.json();
        artistNames = data.famous_song_interpreters || [];
        
        console.log(`${artistNames.length} Künstler für Bubbles geladen`);
    } catch (error) {
        console.error('❌ Fehler beim Laden der Künstler:', error);
    }
}

// Starte Artist Bubbles Animation
function startArtistBubbles() {
    const container = document.getElementById('artistBubblesContainer');
    if (!container || artistNames.length === 0) return;
    
    container.classList.add('active');
    activeBubbles = 0;
    
    // Stoppe vorherige Animation
    if (bubbleInterval) {
        clearInterval(bubbleInterval);
    }
    container.innerHTML = '';
    
    // Erstelle kontinuierlich neue Bubbles
    // Intervall für ~10px Abstand bei durchschnittlich 120px Bubble-Breite
    bubbleInterval = setInterval(() => {
        createArtistBubble();
    }, 1350);
    
    // Erstelle erste Bubble sofort
    createArtistBubble();
}

// Stoppe Artist Bubbles Animation
function stopArtistBubbles() {
    const container = document.getElementById('artistBubblesContainer');
    if (container) {
        container.classList.remove('active');
        container.innerHTML = '';
    }
    
    if (bubbleInterval) {
        clearInterval(bubbleInterval);
        bubbleInterval = null;
    }
    
    activeBubbles = 0;
}

// Reverse Preview (Web Audio)
let reverseCtx = null;
let reverseSource = null;
let reversePlaying = false;

function stopReversePlayback() {
    if (reverseSource) {
        try {
            reverseSource.onended = null;
            reverseSource.stop(0);
        } catch (e) {
            console.warn('reverse stop error', e);
        }
        reverseSource = null;
    }
    if (reverseCtx && reverseCtx.state !== 'closed') {
        reverseCtx.close();
        reverseCtx = null;
    }
    reversePlaying = false;
}

// Erstelle eine einzelne Artist Bubble
function createArtistBubble() {
    if (artistNames.length === 0) return;
    
    const container = document.getElementById('artistBubblesContainer');
    if (!container || !container.classList.contains('active')) return;
    
    // Wähle zufälligen Künstler
    const randomArtist = artistNames[Math.floor(Math.random() * artistNames.length)];
    
    // Erstelle Bubble
    const bubble = document.createElement('div');
    bubble.className = 'artist-bubble';
    bubble.textContent = randomArtist;
    
    // Starte immer rechts außerhalb (100%)
    bubble.style.left = '100%';
    
    container.appendChild(bubble);
    activeBubbles++;
    
    // Click Handler
    bubble.onclick = () => {
        const searchInput = document.getElementById('searchQuery');
        if (searchInput) {
            searchInput.value = randomArtist;
            searchInput.focus();
        }
    };
    
    // Entferne Bubble nach Animation (11 Sekunden = 10s Animation + 1s Buffer)
    setTimeout(() => {
        if (bubble.parentElement) {
            bubble.remove();
            activeBubbles--;
        }
    }, 11000);
}


// Toggle zwischen Genre-, Billboard- und Suchmodus
function toggleGameMode() {
    const selectedMode = document.querySelector('input[name="gameMode"]:checked');
    if (!selectedMode) return;
    
    const mode = selectedMode.value;
    const genreSelection = document.getElementById('genreSelection');
    const billboardSelection = document.getElementById('billboardSelection');
    const searchSelection = document.getElementById('searchSelection');
    const artistBubblesContainer = document.getElementById('artistBubblesContainer');

    if (mode === 'genre') {
        genreSelection.style.display = 'flex';
        billboardSelection.style.display = 'none';
        searchSelection.style.display = 'none';
        stopArtistBubbles();
    } else if (mode === 'billboard') {
        genreSelection.style.display = 'none';
        billboardSelection.style.display = 'flex';
        searchSelection.style.display = 'none';
        stopArtistBubbles();
    } else {
        genreSelection.style.display = 'none';
        billboardSelection.style.display = 'none';
        searchSelection.style.display = 'flex';
        startArtistBubbles();
    }
    
    // Update Leaderboard bei Modus-Wechsel
    showSetupLeaderboard();
}

// Starte das Spiel
async function startGame() {
    const selectedMode = document.querySelector('input[name="gameMode"]:checked');
    const gameMode = selectedMode ? selectedMode.value : 'genre';
    const songCount = parseInt(document.getElementById('songCount').value);

    // State speichern (previewDuration wird während des Spiels per Button gewählt)
    gameState.previewDuration = 5; // Standard-Wert, wird beim Klicken auf Duration-Button überschrieben
    gameState.currentQuestion = 0;
    gameState.correctAnswers = 0;
    gameState.wrongAnswers = 0;
    gameState.totalPoints = 0;
    // currentGameMode wird nach Subtitle-Set pro Modus gesetzt

    // UI aktualisieren
    document.getElementById('setupScreen').style.display = 'none';
    document.getElementById('quizScreen').style.display = 'block';

    // Lade Fehler-Message aus
    document.getElementById('errorMessage').classList.remove('show');

    // Zeige Lade-Zustand
    showLoadingState();

    try {
        if (gameMode === 'genre') {
            // Genre-Modus: Lade Songs aus songs.json
            const selectedGenre = document.getElementById('genreSelect').value;
            await loadSongsFromGenre(selectedGenre, songCount);
            // Update Subtitle
            const genreText = selectedGenre === 'Alle' ? 'Alle Genres' : selectedGenre;
            const subtitleText = `Genre: ${genreText}`;
            document.getElementById('gameSubtitle').textContent = subtitleText;
            gameState.currentGameMode = subtitleText;
        } else if (gameMode === 'billboard') {
            // Billboard-Modus: Lade Songs nach Jahr
            const selectedYear = document.getElementById('yearSelect').value;
            if (!selectedYear) {
                showError('Bitte wählen Sie ein Jahr aus!');
                document.getElementById('setupScreen').style.display = 'block';
                document.getElementById('quizScreen').style.display = 'none';
                hideLoadingState();
                return;
            }
            await loadSongsFromBillboard(selectedYear, songCount);
            // Update Subtitle
            const subtitleText = `Billboard Charts aus ${selectedYear}`;
            document.getElementById('gameSubtitle').textContent = subtitleText;
            gameState.currentGameMode = subtitleText;
        } else {
            // iTunes Suchmodus
            const searchQuery = document.getElementById('searchQuery').value.trim();
            if (!searchQuery) {
                showError('Bitte geben Sie einen Künstler oder Titel ein!');
                document.getElementById('setupScreen').style.display = 'block';
                document.getElementById('quizScreen').style.display = 'none';
                hideLoadingState();
                return;
            }
            await loadSongsFromItunes(searchQuery, songCount);
            // Update Subtitle
            const subtitleText = `Songs von ${searchQuery}`;
            document.getElementById('gameSubtitle').textContent = subtitleText;
            gameState.currentGameMode = subtitleText;
        }

        // Verstecke Loading-Indicator
        hideLoadingState();

        if (gameState.songs.length === 0) {
            showError('Keine Songs gefunden. Bitte versuchen Sie einen anderen Suchbegriff!');
            document.getElementById('setupScreen').style.display = 'block';
            document.getElementById('quizScreen').style.display = 'none';
            return;
        }

        // Starte erste Frage
        nextQuestion();
        
        // Lade Motivations-Leaderboard
        setTimeout(() => {
            showGameLeaderboard();
        }, 500);
    } catch (error) {
        console.error('Fehler beim Laden der Songs:', error);
        showError('Fehler beim Laden der Songs. Bitte versuchen Sie es erneut!');
        document.getElementById('setupScreen').style.display = 'block';
        document.getElementById('quizScreen').style.display = 'none';
        hideLoadingState();
    }
}

// Lade Songs aus songs.json basierend auf Genre
async function loadSongsFromGenre(genre, limit) {
    try {
        // Lade songs.json
        const cacheBuster = Date.now();
        const response = await fetch(`songs.json?v=${cacheBuster}`, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error('Fehler beim Laden von songs.json');
        }

        const allSongs = await response.json();
        let filteredSongs = [];

        if (genre === 'Alle') {
            // Alle Songs
            filteredSongs = allSongs;
        } else {
            // Filtere nach Genre
            filteredSongs = allSongs.filter(song => song.genre === genre);
        }

        if (filteredSongs.length === 0) {
            throw new Error('Keine Songs für dieses Genre gefunden');
        }

        // Mische und begrenze die Anzahl
        const selectedSongs = shuffleArray(filteredSongs).slice(0, Math.min(limit, filteredSongs.length));
        
        // Speichere Songs - artwork wird später von iTunes API geladen
        gameState.songs = selectedSongs;
        
        console.log(`${gameState.songs.length} Songs aus Genre "${genre}" geladen`);
    } catch (error) {
        console.error('Fehler beim Laden der Songs:', error);
        throw error;
    }
}

// Lade Songs aus Billboard Hot 10 basierend auf Jahr
async function loadSongsFromBillboard(year, limit) {
    try {
        // Lade hot-10-unique.json
        const cacheBuster = Date.now();
        const response = await fetch(`hot-10-unique.json?v=${cacheBuster}`, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error('Fehler beim Laden von hot-10-unique.json');
        }

        const allSongs = await response.json();
        
        // Filtere nach Jahr
        const filteredSongs = allSongs.filter(song => song.chart_week.startsWith(year));

        if (filteredSongs.length === 0) {
            throw new Error('Keine Songs für dieses Jahr gefunden');
        }

        // Mische und begrenze die Anzahl
        const selectedSongs = shuffleArray(filteredSongs).slice(0, Math.min(limit, filteredSongs.length));
        
        // Konvertiere Billboard Format zu app Format
        gameState.songs = selectedSongs.map(song => ({
            artist: song.performer,
            track: song.title,
            genre: year // Jahr als Genre verwenden
        }));
        
        console.log(`${gameState.songs.length} Billboard Songs aus Jahr "${year}" geladen`);
    } catch (error) {
        console.error('Fehler beim Laden der Billboard Songs:', error);
        throw error;
    }
}

function fetchItunesJsonp(searchTerm, { limit = 10, country = 'DE' } = {}) {
    return new Promise((resolve, reject) => {
        const encodedQuery = encodeURIComponent(searchTerm);
        const callbackName = `itunesJsonp_${country}_${Date.now()}_${Math.floor(Math.random()*10000)}`;
        const url = `https://itunes.apple.com/search?term=${encodedQuery}&entity=song&limit=${limit}&media=music&country=${country}&lang=de_DE&callback=${callbackName}`;

        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('JSONP Timeout'));
        }, 6000);

        function cleanup() {
            clearTimeout(timeout);
            if (window[callbackName]) {
                try { delete window[callbackName]; } catch (_) {}
            }
            if (script && script.parentNode) {
                script.parentNode.removeChild(script);
            }
        }

        window[callbackName] = (data) => {
            cleanup();
            if (!data || !data.results) {
                reject(new Error('JSONP: Keine Ergebnisse'));
            } else {
                resolve(data.results);
            }
        };

        const script = document.createElement('script');
        script.src = url;
        script.onerror = () => {
            cleanup();
            reject(new Error('JSONP Script Error'));
        };
        document.body.appendChild(script);
    });
}

// Fetch preview from server API (or fallback to direct iTunes if no server)
async function fetchPreviewFromServer(artist, track) {
    try {
        // Try server API first
        const response = await fetch(`${API_BASE}/api/preview?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}`, {
            cache: 'no-store'
        });
        
        if (response.ok) {
            const data = await response.json();
            debugLog(`🎵 Server: "${track}" (${data.country || 'cached'})`);
            return data.preview;
        } else {
            throw new Error(`Server API: ${response.status}`);
        }
    } catch (err) {
        console.log('Server API failed, trying direct iTunes:', err.message);
        throw err;
    }
}

async function fetchItunes(searchTerm, { limit = 10, country = 'DE' } = {}) {
    const encodedQuery = encodeURIComponent(searchTerm);
    const url = `https://itunes.apple.com/search?term=${encodedQuery}&entity=song&limit=${limit}&media=music&country=${country}&lang=de_DE`;
    debugLog(`🔍 iTunes ${country}: "${searchTerm}"`);
    let response;
    try {
        response = await fetch(url, { cache: 'no-store', mode: 'cors' });
    } catch (networkError) {
        const errCode = country === 'DE' ? 'F3' : 'F4';
        debugLog(`❌ iTunes Fetch ${country} fehlgeschlagen: ${networkError.message}`, errCode);
        debugLog(`↩️ Versuche JSONP ${country}`, errCode);
        const jsonpResults = await fetchItunesJsonp(searchTerm, { limit, country });
        debugLog(`📦 ${jsonpResults.length} Ergebnisse (JSONP ${country})`);
        return jsonpResults;
    }
    if (!response.ok) {
        const errCode = country === 'DE' ? 'F3' : 'F4';
        debugLog(`❌ iTunes API Fehler ${country}: ${response.status} ${response.statusText || ''}`.trim(), errCode);
        debugLog(`↩️ Versuche JSONP ${country}`, errCode);
        const jsonpResults = await fetchItunesJsonp(searchTerm, { limit, country });
        debugLog(`📦 ${jsonpResults.length} Ergebnisse (JSONP ${country})`);
        return jsonpResults;
    }
    const data = await response.json();
    console.log(`iTunes Suche ${country} für "${searchTerm}": ${data.results.length} Ergebnisse`);
    debugLog(`📦 ${data.results.length} Ergebnisse (${country})`);
    return data.results;
}

// Versucht mehrere Länder in Reihe, um F3/F4 zu reduzieren
async function fetchItunesWithFallback(searchTerm, countries = ['DE', 'US', 'GB', 'FR', 'AU'], limit = 10) {
    let lastError = null;
    for (const country of countries) {
        try {
            const results = await fetchItunes(searchTerm, { limit, country });
            return { results, country };
        } catch (err) {
            lastError = err;
            const errCode = country === 'DE' ? 'F3' : 'F4';
            debugLog(`⚠️ ${country} fehlgeschlagen: ${err.message}`, errCode);
        }
    }
    debugLog(`❌ iTunes Suche komplett fehlgeschlagen: ${lastError ? lastError.message : 'Unbekannt'}`, 'F4');
    throw lastError || new Error('iTunes Suche fehlgeschlagen');
}

// Lade Song-Daten live von iTunes API basierend auf Suchbegriffen (mit Länder-Fallback DE -> US)
async function loadSongDataLive(artist, track, cachedPreview = null) {
    try {
        // Immer live von iTunes API laden - songs.json ist nur Suchbegriff-Liste
        const searchTerm = `${artist} ${track}`;
        const { results, country: usedCountry } = await fetchItunesWithFallback(searchTerm, ['DE', 'US', 'GB', 'CA'], 10);

        // Finde Songs mit Preview
        const songsWithPreview = results.filter(result => 
            result.previewUrl && 
            result.trackName && 
            result.artistName
        );
        
        if (songsWithPreview.length === 0) {
            debugLog(`❌ Keine Preview für "${artist} - ${track}"`, 'F5');
            throw new Error(`Keine Preview-URL für "${artist} - ${track}" verfügbar (DE/US)`);
        }
        
        // Versuche besten Match zu finden
        let song = songsWithPreview.find(result => 
            result.trackName.toLowerCase().includes(track.toLowerCase()) &&
            result.artistName.toLowerCase().includes(artist.toLowerCase())
        );
        
        // Fallback: Nimm ersten Song mit Preview
        if (!song) {
            song = songsWithPreview[0];
            console.log(`Verwende Fallback: "${song.artistName} - ${song.trackName}"`);
        }

        const safePreview = (song.previewUrl || '').replace(/^http:/, 'https:');
        
        debugLog(`✅ Song geladen: "${song.trackName}" (${usedCountry})`);
        return {
            id: song.trackId,
            track: song.trackName,
            artist: song.artistName,
            album: song.collectionName || 'Unbekannt',
            previewUrl: safePreview,
            image: song.artworkUrl600 || song.artworkUrl100 || song.artworkUrl60 || '',
            genre: song.primaryGenreName || 'Unbekannt'
        };
    } catch (error) {
        console.error(`Fehler beim Laden von "${artist} - ${track}":`, error);
        const errMsg = error.message || String(error);
        gameState.lastError = errMsg;
        const lower = errMsg.toLowerCase();
        const errCode = errMsg.includes('Preview-URL')
            ? 'F5'
            : (errMsg.includes('API') || lower.includes('fetch') || lower.includes('network'))
                ? 'F3/F4'
                : 'F?';
        const icon = errCode === 'F?' ? '❓' : '⚠️';
        debugLog(`${icon} Fehler bei "${artist} - ${track}": ${errMsg}`, errCode);
        showError(`iTunes-Fehler: ${gameState.lastError}`);
        throw error;
    }
}

// Lade Songs von iTunes Search API
async function loadSongsFromItunes(searchQuery, limit) {
    try {
        let results = [];
        try {
            results = await fetchItunes(searchQuery, { limit: 50, country: 'DE' });
        } catch (errDe) {
            console.warn('DE-Suche fehlgeschlagen (Suchmodus), versuche US:', errDe);
            results = await fetchItunes(searchQuery, { limit: 50, country: 'US' });
        }

        const songs = results
            .filter(song => 
                song.previewUrl && 
                song.trackName && 
                song.artistName && 
                song.collectionName
            )
            .slice(0, limit)
            .map(song => ({
                id: song.trackId,
                track: song.trackName,
                artist: song.artistName,
                album: song.collectionName,
                previewUrl: (song.previewUrl || '').replace(/^http:/, 'https:'),
                image: song.artworkUrl600 || song.artworkUrl100 || song.artworkUrl60,
                genre: song.primaryGenreName || 'Unbekannt'
            }));

        gameState.songs = shuffleArray(songs);
        console.log(`${gameState.songs.length} Songs geladen`);
    } catch (error) {
        console.error('iTunes API Fehler:', error);
        throw error;
    }
}

// Nächste Frage laden
async function nextQuestion() {
    // Stoppe vorherige Audio
    stopPreview();

    if (gameState.currentQuestion >= gameState.songs.length) {
        endGame();
        return;
    }

    // Setze State zurück
    gameState.isAnswered = false;
    gameState.currentPlayCount = 0;
    gameState.currentPlayedReverse = false;
    gameState.totalPlayTime = 0;
    gameState.previewFinished = false;
    stopPointsCountdown(); // Ensure countdown is stopped before starting a new question
    let idx = gameState.currentQuestion;

    console.log('nextQuestion start, index:', idx, 'song:', gameState.songs[idx]);
    debugLog(`🎯 Frage ${idx + 1}: Lade Song...`);

    let attempts = 0;
    const maxAttempts = Math.min(8, gameState.songs.length);

    while (attempts < maxAttempts && idx < gameState.songs.length) {
        const candidate = gameState.songs[idx];
        let loadingShown = false;
        try {
            if (candidate.artist && candidate.track) {
                loadingShown = true;
                showLoadingState();
                // Lade alles live von iTunes API (kein Cache)
                const fullSongData = await loadSongDataLive(candidate.artist, candidate.track);
                gameState.currentSong = fullSongData;
            } else {
                gameState.currentSong = candidate;
            }

            if (gameState.currentSong && gameState.currentSong.previewUrl) {
                gameState.currentQuestion = idx + 1; // Nächster Song für den nächsten Aufruf
                break;
            }
        } catch (error) {
            console.error('Fehler beim Laden der Song-Daten, versuche nächsten:', error);
            gameState.lastError = error.message || String(error);
        } finally {
            if (loadingShown) hideLoadingState();
        }

        attempts++;
        idx++;
    }

    if (!gameState.currentSong || !gameState.currentSong.previewUrl) {
        debugLog('❌ Keine abspielbaren Songs gefunden', 'F6');
        showError('[F6] Keine abspielbaren Songs gefunden. Bitte anderes Genre oder Suchbegriff versuchen.');
        endGame();
        return;
    }

    // UI aktualisieren
    updateStats();
    updatePlayTimeDisplay(); // Setze Abspielzeit-Anzeige auf 0
    displayAlbumCover();
    displayAnswers();

    // Verstecke die nächste Frage Button
    document.getElementById('nextBtn').classList.remove('show');
    document.getElementById('resultMessage').textContent = '';
    document.getElementById('errorMessage').classList.remove('show');
    document.getElementById('songInfo').classList.remove('show');
}

// Zeige Albumcover an
function displayAlbumCover() {
    const albumCover = document.getElementById('albumCover');
    const song = gameState.currentSong;

    if (song.image) {
        albumCover.innerHTML = `<img src="${song.image}" alt="Album Cover" onerror="this.parentElement.innerHTML='<div class=&quot;cover-placeholder&quot;></div>'">`;
    } else {
        albumCover.innerHTML = '<div class="cover-placeholder"></div>';
    }
    
    // Click-to-Zoom Funktionalität
    albumCover.removeEventListener('click', toggleAlbumZoom);
    albumCover.addEventListener('click', toggleAlbumZoom);
}

// Toggle Funktion für Album Cover Zoom
function toggleAlbumZoom(e) {
    const albumCover = document.getElementById('albumCover');
    albumCover.classList.toggle('expanded');
}

// Zeige Antworten an
function displayAnswers() {
    try {
        const song = gameState.currentSong;
        
        if (!song || !song.track) {
            console.error('Song oder song.track ist undefined:', song);
            document.getElementById('answersContainer').innerHTML = '<p style="color: red;">Fehler: Song-Daten nicht vorhanden</p>';
            return;
        }

        let answers = [song.track];

        // Generiere immer 3 falsche Antworten (4 Antworten gesamt) mit Fallbacks
        let wrongAnswers = [];
        if (gameState.songs && gameState.songs.length > 1) {
            wrongAnswers = getRandomWrongAnswers(3);
        }

        // Fallback: nimm weitere Tracks aus dem Pool, wenn zu wenige
        if (wrongAnswers.length < 3 && gameState.songs && gameState.songs.length > 0) {
            const pool = shuffleArray(
                gameState.songs
                    .map(s => s.track)
                    .filter(t => t && t !== song.track && !wrongAnswers.includes(t))
            );
            for (const t of pool) {
                if (wrongAnswers.length >= 3) break;
                wrongAnswers.push(t);
            }
        }

        // Letzter Fallback: statische Dummy-Antworten, damit immer 4 Optionen existieren
        if (wrongAnswers.length < 3) {
            const fallbackTitles = ['Neon Nights', 'Golden Sky', 'Silent Echo', 'Velvet Road', 'Midnight Drive'];
            for (const t of fallbackTitles) {
                if (wrongAnswers.length >= 3) break;
                if (!wrongAnswers.includes(t) && t !== song.track) {
                    wrongAnswers.push(t);
                }
            }
        }

        // Baue finalen Antwortsatz und mische
        answers = answers.concat(wrongAnswers.slice(0, 3));
        answers = [...new Set(answers)];

        // Sicherheit: falls nach Deduplizierung weniger als 4 übrig sind, mit Fallbacks auffüllen
        const fallbackTitles = ['Neon Nights', 'Golden Sky', 'Silent Echo', 'Velvet Road', 'Midnight Drive'];
        for (const t of fallbackTitles) {
            if (answers.length >= 4) break;
            if (!answers.includes(t)) answers.push(t);
        }

        answers = shuffleArray(answers);

        const answersContainer = document.getElementById('answersContainer');
        if (!answersContainer) {
            console.error('answersContainer nicht gefunden');
            return;
        }

        // Leere den Container komplett
        answersContainer.innerHTML = '';

        // Erstelle die Buttons
        answers.forEach((answer, index) => {
            if (answer && answer.trim()) {
                const btn = document.createElement('button');
                btn.className = 'answer-btn';
                btn.textContent = formatSongTitleForDisplay(answer);
                btn.onclick = () => selectAnswer(answer, index);
                answersContainer.appendChild(btn);
            }
        });

    } catch (error) {
        console.error('Fehler in displayAnswers:', error);
        document.getElementById('answersContainer').innerHTML = '<p style="color: red;">Fehler bei der Anzeige der Antworten</p>';
    }
}

// Normalisiere Song-Titel (entfernt Versionsangaben, Klammern, etc.)
function normalizeSongTitle(title) {
    if (!title) return '';
    
    // Konvertiere zu Kleinbuchstaben
    let normalized = title.toLowerCase();
    
    // Entferne gängige Versionsangaben und Klammern
    normalized = normalized
        .replace(/\s*\(.*?(remix|mix|version|edit|remaster|live|acoustic|radio|extended|instrumental|feat\.|featuring|ft\.).*?\)/gi, '')
        .replace(/\s*\[.*?(remix|mix|version|edit|remaster|live|acoustic|radio|extended|instrumental|feat\.|featuring|ft\.).*?\]/gi, '')
        .replace(/\s*-\s*(remix|mix|version|edit|remaster|live|acoustic|radio edit|extended|instrumental).*/gi, '')
        // Entferne alle restlichen Klammer-Inhalte wie "(feat. ...)" oder "(with ...)"
        .replace(/\s*\([^)]*\)/g, '')
        .replace(/\s*\[[^\]]*\]/g, '')
        .replace(/\s+/g, ' ')  // Mehrfache Leerzeichen auf eines reduzieren
        .trim();
    
    return normalized;
}

// Für Anzeige: entferne Klammer-/Versionsinfos, behalte aber die Original-Schreibweise
function formatSongTitleForDisplay(title) {
    if (!title) return '';

    return title
        .replace(/\s*\(.*?(remix|mix|version|edit|remaster|live|acoustic|radio|extended|instrumental|feat\.|featuring|ft\.).*?\)/gi, '')
        .replace(/\s*\[.*?(remix|mix|version|edit|remaster|live|acoustic|radio|extended|instrumental|feat\.|featuring|ft\.).*?\]/gi, '')
        .replace(/\s*-\s*(remix|mix|version|edit|remaster|live|acoustic|radio edit|extended|instrumental).*/gi, '')
        .replace(/\s*\([^)]*\)/g, '')
        .replace(/\s*\[[^\]]*\]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Prüfe ob zwei Song-Titel zu ähnlich sind
function areSongsTooSimilar(title1, title2) {
    const normalized1 = normalizeSongTitle(title1);
    const normalized2 = normalizeSongTitle(title2);
    
    // Exakte Übereinstimmung nach Normalisierung
    if (normalized1 === normalized2) {
        return true;
    }
    
    // Prüfe ob ein Titel im anderen enthalten ist (für sehr kurze Titel)
    if (normalized1.length < 15 || normalized2.length < 15) {
        if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
            return true;
        }
    }
    
    return false;
}

// Generiere zufällige falsche Antworten
function getRandomWrongAnswers(count) {
    const wrongAnswers = [];
    const usedTracks = new Set([gameState.currentSong.track]);
    const usedNormalizedTitles = new Set([normalizeSongTitle(gameState.currentSong.track)]);

    let attempts = 0;
    const maxAttempts = gameState.songs.length * 3;

    while (wrongAnswers.length < count && attempts < maxAttempts) {
        const randomSong = gameState.songs[Math.floor(Math.random() * gameState.songs.length)];
        const normalizedTitle = normalizeSongTitle(randomSong.track);
        
        // Prüfe ob exakter Titel bereits verwendet
        if (usedTracks.has(randomSong.track)) {
            attempts++;
            continue;
        }
        
        // Prüfe ob normalisierter Titel bereits verwendet (filtert Remixe etc.)
        if (usedNormalizedTitles.has(normalizedTitle)) {
            attempts++;
            continue;
        }
        
        // Prüfe ob zu ähnlich zu bereits verwendeten Songs
        let tooSimilar = false;
        for (const usedAnswer of wrongAnswers) {
            if (areSongsTooSimilar(randomSong.track, usedAnswer)) {
                tooSimilar = true;
                break;
            }
        }
        
        if (!tooSimilar) {
            usedTracks.add(randomSong.track);
            usedNormalizedTitles.add(normalizedTitle);
            wrongAnswers.push(randomSong.track);
        }
        
        attempts++;
    }

    return wrongAnswers.slice(0, count);
}

// Benutzer wählt Antwort
function selectAnswer(answer, index) {
    if (gameState.isAnswered) return;

    gameState.isAnswered = true;
    stopPreview();

    const isCorrect = answer === gameState.currentSong.track;
    const buttons = document.querySelectorAll('.answer-btn');
    const selectedBtn = buttons[index];

    // Markiere alle Buttons
    buttons.forEach((btn, i) => {
        btn.disabled = true;
        if (btn.textContent === gameState.currentSong.track) {
            btn.classList.add('correct');
        } else if (btn === selectedBtn && !isCorrect) {
            btn.classList.add('incorrect');
        }
    });

    // Update Score + Stempel
    if (isCorrect) {
        gameState.correctAnswers++;
        
        // Spiele Erfolgs-Sound
        playCorrectSound();
        
        // Nutze aktiven Countdown (falls vorhanden), sonst Standardberechnung
        const countdownActive = gameState.pointsCountdownActive;
        const countdownPoints = countdownActive ? Math.max(0, Math.round(gameState.pointsCountdownValue)) : null;
        const guessedWithoutPlay = gameState.totalPlayTime <= 0 && gameState.currentPlayCount === 0;
        const basePoints = guessedWithoutPlay
            ? 1500
            : (countdownPoints !== null ? countdownPoints : calculatePoints());
        const awardedPoints = basePoints;

        gameState.totalPoints += awardedPoints;
        
        // Stempel auf gewählter Antwort
        if (selectedBtn) {
            selectedBtn.dataset.stamp = `+${awardedPoints}`;
            selectedBtn.classList.add('stamp', 'stamp-correct');
        }

        const resultMsg = document.getElementById('resultMessage');
        resultMsg.textContent = `✅ Richtig! +${awardedPoints} Punkte`;
        resultMsg.classList.remove('incorrect');
        resultMsg.classList.add('correct');
        resultMsg.style.fontSize = '1.3em';
        resultMsg.style.animation = 'bounce-in 0.5s ease-out';
    } else {
        gameState.wrongAnswers++;
        
        // Spiele Fehler-Sound
        playWrongSound();
        
        if (selectedBtn) {
            selectedBtn.dataset.stamp = '✕';
            selectedBtn.classList.add('stamp', 'stamp-wrong');
        }
        
        const resultMsg = document.getElementById('resultMessage');
        resultMsg.textContent = '❌ Falsch!';
        resultMsg.classList.remove('correct');
        resultMsg.classList.add('incorrect');
        resultMsg.style.fontSize = '1.3em';
        resultMsg.style.animation = 'shake 0.5s ease-out';
    }

    // Countdown stoppen (kein weiteres Abbauen nach Antwort)
    stopPointsCountdown();

    // Zeige Song-Infos
    showSongInfo();

    // Zeige nächste Frage Button
    document.getElementById('nextBtn').classList.add('show');
    updateStats();

    // Automatisch zur nächsten Frage nach 3 Sekunden
    setTimeout(() => {
        nextQuestion();
    }, 3000);
}

// Zeige Song-Informationen
function showSongInfo() {
    const song = gameState.currentSong;
    document.getElementById('infoArtist').textContent = song.artist;
    document.getElementById('infoTrack').textContent = song.track;
    document.getElementById('infoAlbum').textContent = song.album;

    const genreRow = document.getElementById('genreRow');
    genreRow.style.display = 'none';

    document.getElementById('songInfo').classList.add('show');
}

// Berechne Punkte für richtige Antwort
function calculatePoints() {
    // Basispunkte basierend auf Gesamt-Abspielzeit
    // Formel: 1000 * (5 / totalPlayTime)
    const playTime = Math.max(1, gameState.totalPlayTime); // Mindestens 1 Sekunde
    const basePoints = 1000;
    let points = basePoints * (5 / playTime);
    
    // Multiplikator für Rückwärts-Abspielen
    if (gameState.currentPlayedReverse) {
        points *= 2;
    }
    
    // Runde auf ganze Zahl
    return Math.round(points);
}

// Finale Punkte: Durchschnitt pro Frage
function calculateFinalScore() {
    const totalQuestions = gameState.songs ? gameState.songs.length : 0;
    if (totalQuestions === 0) return 0;
    return Math.round(gameState.totalPoints / totalQuestions);
}

// Punkte-Countdown für aktuelle Frage anzeigen und langsam abbauen
function startPointsCountdown(basePoints) {
    const container = document.getElementById('pointsCountdown');
    const valueEl = document.getElementById('pointsCountdownValue');
    const barEl = document.getElementById('pointsCountdownBar');
    if (!container || !valueEl || !barEl) return;

    const normalizedBase = Math.max(0, Math.round(basePoints));

    // Wenn schon aktiv: nicht erhöhen, nur ggf. Basis absenken
    if (gameState.pointsCountdownActive) {
        gameState.pointsCountdownInitial = Math.min(gameState.pointsCountdownInitial, normalizedBase);
    } else {
        gameState.pointsCountdownActive = true;
        gameState.pointsCountdownInitial = normalizedBase;
        gameState.pointsCountdownStartTime = performance.now();
    }

    // Initiale Anzeige nicht erhöhen
    const elapsedMs = gameState.pointsCountdownStartTime ? (performance.now() - gameState.pointsCountdownStartTime) : 0;
    const totalDurationMs = 60000; // 60 Sekunden bis 0
    const progress = Math.min(1, elapsedMs / totalDurationMs);
    const current = Math.max(0, Math.round(gameState.pointsCountdownInitial * (1 - progress)));

    gameState.pointsCountdownValue = current;
    gameState.pointsCountdownBase = gameState.pointsCountdownInitial;

    valueEl.textContent = current;
    barEl.style.width = `${(1 - progress) * 100}%`;
    container.classList.add('show');

    const tick = (now) => {
        if (!gameState.pointsCountdownActive) return;
        const elapsed = now - gameState.pointsCountdownStartTime;
        const prog = Math.min(1, elapsed / totalDurationMs);
        const cur = Math.max(0, Math.round(gameState.pointsCountdownInitial * (1 - prog)));
        gameState.pointsCountdownValue = cur;
        valueEl.textContent = cur;
        barEl.style.width = `${(1 - prog) * 100}%`;
        if (prog < 1) {
            gameState.pointsCountdownTimer = requestAnimationFrame(tick);
        } else {
            stopPointsCountdown(false);
        }
    };

    // Nur einen Timer laufen lassen
    if (!gameState.pointsCountdownTimer) {
        gameState.pointsCountdownTimer = requestAnimationFrame(tick);
    }
}

// Countdown stoppen und optional ausblenden
function stopPointsCountdown(hide = true) {
    if (gameState.pointsCountdownTimer) {
        cancelAnimationFrame(gameState.pointsCountdownTimer);
        gameState.pointsCountdownTimer = null;
    }
    gameState.pointsCountdownActive = false;
    gameState.pointsCountdownValue = 0;
    gameState.pointsCountdownInitial = 0;
    gameState.pointsCountdownStartTime = null;

    const container = document.getElementById('pointsCountdown');
    const barEl = document.getElementById('pointsCountdownBar');
    const valueEl = document.getElementById('pointsCountdownValue');
    if (barEl) barEl.style.width = '0%';
    if (valueEl) valueEl.textContent = '0';
    if (container && hide) {
        container.classList.remove('show');
    }
}

// Spiele "Katching" Sound ab
function playKatchingSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Erzeuge einen einfachen "Cash Register" / "Katching" Sound
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Frequenz-Sweep für "Katching" Effekt
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
        
        // Lautstärke-Envelope
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
    } catch (err) {
        console.log('Katching sound error:', err);
    }
}

// Spiele "Richtig" Sound ab
function playCorrectSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Aufsteigender fröhlicher Akkord
        const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
        frequencies.forEach((freq, i) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
            oscillator.type = 'sine';
            
            const startTime = audioContext.currentTime + (i * 0.08);
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + 0.3);
        });
    } catch (err) {
        console.log('Correct sound error:', err);
    }
}

// Spiele "Falsch" Sound ab
function playWrongSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Absteigender "Buzzer" Sound
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (err) {
        console.log('Wrong sound error:', err);
    }
}

// Entfernt: playPreviewWithDuration - nicht mehr benötigt

// Spiele Preview im Staccato-Modus (jede 2. Sekunde Pause)
function playPreviewStaccato() {
    if (!gameState.currentSong || !gameState.currentSong.previewUrl) {
        alert('Für diesen Song ist keine Preview verfügbar.');
        return;
    }

    const audio = document.getElementById('audioPlayer');
    const stopBtn = document.getElementById('stopBtn');

    // Stoppe evtl. laufende Playbacks
    stopReversePlayback();
    stopPreview();

    // iOS-Sicherheit
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    audio.setAttribute('preload', 'none');
    audio.crossOrigin = 'anonymous';

    const safeSrc = gameState.currentSong.previewUrl.replace(/^http:/, 'https:');
    audio.src = safeSrc;
    audio.currentTime = 0;
    audio.load();

    const playBtn = document.getElementById('playBtn');
    if (playBtn) playBtn.disabled = true;
    stopBtn.classList.add('active');

    const duration = 5; // Staccato spielt immer 5 Sekunden
    let currentSecond = 0;
    let staccatoInterval = null;
    let lastSecondCounted = -1; // Zähler für gezählte Sekunden

    // Starte Audio
    audio.play().then(() => {
        console.log('Staccato Playback gestartet');
        
        // Tracking: Staccato markiert Play-Count
        gameState.currentPlayCount++;

        const startTime = Date.now();

        // Interval für Staccato-Effekt (jede Sekunde)
        staccatoInterval = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            
            if (elapsed >= duration) {
                clearInterval(staccatoInterval);
                audio.pause();
                stopPreview();
                return;
            }

            currentSecond = Math.floor(elapsed);
            
            // Zähle jede volle Sekunde als 2 Sekunden zur Abspielzeit
            if (currentSecond > lastSecondCounted && currentSecond < duration) {
                gameState.totalPlayTime += 2;
                updatePlayTimeDisplay();
                lastSecondCounted = currentSecond;
            }
            
            // Gerade Sekunden (0, 2, 4, ...): Musik (Lautstärke 1)
            // Ungerade Sekunden (1, 3, ...): Stille (Lautstärke 0)
            if (currentSecond % 2 === 0) {
                audio.volume = 1;
            } else {
                audio.volume = 0;
            }

            // Update Progress
            const progress = Math.min((elapsed / duration) * 100, 100);
            document.getElementById('progressFill').style.width = progress + '%';
            updateTimeDisplay(elapsed, duration);
        }, 100); // Alle 100ms checken für genauere Steuerung

        // Stoppe nach Dauer
        gameState.stopTimeout = setTimeout(() => {
            if (staccatoInterval) clearInterval(staccatoInterval);
            audio.pause();
            audio.volume = 1; // Lautstärke zurücksetzen
            stopPreview();
        }, duration * 1000);

    }).catch(error => {
        console.error('Staccato Playback error:', error);
        if (staccatoInterval) clearInterval(staccatoInterval);
        audio.volume = 1;
        const playBtn = document.getElementById('playBtn');
        if (playBtn) playBtn.disabled = false;
        stopBtn.classList.remove('active');
        alert('Fehler beim Abspielen im Staccato-Modus.');
    });
}

// Spiele Preview ab (iOS-kompatibel)
function playPreview() {
    if (!gameState.currentSong) {
        debugLog('❌ Kein Song geladen', 'F8');
        alert(`[F8] Kein Song geladen. ${gameState.lastError ? 'Letzter Fehler: ' + gameState.lastError : ''} Lade nächste Frage...`);
        nextQuestion();
        return;
    }
    
    if (!gameState.currentSong.previewUrl) {
        alert('Für diesen Song ist leider keine Preview verfügbar. Überspringe...');
        // Automatisch nächsten Song laden
        setTimeout(() => {
            gameState.currentQuestion++;
            nextQuestion();
        }, 1500);
        return;
    }

    // Spiele Katching-Sound
    playKatchingSound();

    // Prüfe ob bereits abgespielt wurde
    if (gameState.firstPlayDone && !gameState.isAnswered) {
        // 300 Punkte Abzug bei erneutem Drücken
        if (gameState.pointsCountdownActive) {
            const currentPoints = Math.max(0, Math.round(gameState.pointsCountdownValue));
            const newPoints = Math.max(0, currentPoints - 300);
            
            // Berechne neue Zeit basierend auf reduzierten Punkten
            const elapsed = gameState.pointsCountdownStartTime ? (performance.now() - gameState.pointsCountdownStartTime) : 0;
            const pointsLost = gameState.pointsCountdownInitial - newPoints;
            const totalDurationMs = 60000;
            const newProgress = pointsLost / gameState.pointsCountdownInitial;
            const newElapsed = newProgress * totalDurationMs;
            
            // Setze neue Startzeit basierend auf reduzierten Punkten
            gameState.pointsCountdownStartTime = performance.now() - newElapsed;
            gameState.pointsCountdownValue = newPoints;
            
            console.log(`Erneutes Abspielen: -300 Punkte (${currentPoints} → ${newPoints})`);
        }
    } else if (!gameState.firstPlayDone && !gameState.isAnswered) {
        // Erstes Abspielen: Starte Punkte-Countdown von 2000
        gameState.firstPlayDone = true;
        startPointsCountdown(2000);
    }

    const audio = document.getElementById('audioPlayer');
    const playBtn = document.getElementById('playBtn');
    const stopBtn = document.getElementById('stopBtn');

    // Stoppe evtl. Reverse-Playback
    stopReversePlayback();

    // iOS-Sicherheit: Stelle sicher, dass das Element korrekt vorbereitet ist
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    audio.setAttribute('preload', 'none');
    audio.crossOrigin = 'anonymous';

    // Setze Audio-Quelle (erzwinge https, falls noch http)
    const safeSrc = gameState.currentSong.previewUrl.replace(/^http:/, 'https:');
    audio.src = safeSrc;
    audio.currentTime = 0;
    audio.load();

    // Setze Flags zurück
    gameState.previewFinished = false;
    
    // Feste Preview-Dauer: 15 Sekunden
    const previewDuration = 15;
    
    console.log('Versuche Preview abzuspielen:', gameState.currentSong.previewUrl);
    debugLog(`▶️ Starte Preview...`);
    
    // Starte Playback
    audio.play().then(() => {
        console.log('Playback gestartet');
        debugLog(`🔊 Playback läuft`);
        
        // Tracking: Erhöhe Play-Count und addiere Abspielzeit
        gameState.currentPlayCount++;
        gameState.totalPlayTime += previewDuration;
        updatePlayTimeDisplay();
        
        // Deaktiviere Play-Button während Playback
        if (playBtn) playBtn.disabled = true;
        stopBtn.classList.add('active');

        // Update Progress
        const updateProgress = () => {
            const progress = Math.min((audio.currentTime / previewDuration) * 100, 100);
            document.getElementById('progressFill').style.width = progress + '%';
            updateTimeDisplay(audio.currentTime, previewDuration);

            if (audio.currentTime < previewDuration && !audio.paused) {
                gameState.progressInterval = requestAnimationFrame(updateProgress);
            } else if (audio.currentTime >= previewDuration) {
                gameState.previewFinished = true;
                audio.pause();
                stopPreview();
            }
        };

        // Stoppe nach Preview-Duration (15 Sekunden)
        gameState.stopTimeout = setTimeout(() => {
            gameState.previewFinished = true;
            audio.pause();
            stopPreview();
        }, previewDuration * 1000);

        updateProgress();
    }).catch(error => {
        console.error('Playback error:', error);
        debugLog(`❌ Playback-Fehler: ${error.message}`, 'F7');
        alert('[F7] Fehler beim Abspielen. Bitte tippe erneut auf Play oder überspringe den Song.');
        stopPreview();
    });
}

// Stoppe Preview (iOS-kompatibel)
function stopPreview() {
    const audio = document.getElementById('audioPlayer');
    const stopBtn = document.getElementById('stopBtn');
    const playBtn = document.getElementById('playBtn');

    stopReversePlayback();

    // Stoppe Audio Element
    audio.pause();
    audio.currentTime = 0;
    
    // Stoppe Progress Animation
    if (gameState.progressInterval) {
        cancelAnimationFrame(gameState.progressInterval);
        gameState.progressInterval = null;
    }
    
    // Stoppe Timeout
    if (gameState.stopTimeout) {
        clearTimeout(gameState.stopTimeout);
        gameState.stopTimeout = null;
    }

    // Aktiviere Play-Button wieder
    if (playBtn) playBtn.disabled = false;
    stopBtn.classList.remove('active');
    document.getElementById('progressFill').style.width = '0%';
    updateTimeDisplay(0, 15);
}

// Entfernt: disableDurationButtons - nicht mehr benötigt

// Reverse Preview abspielen
async function playPreviewReverse() {
    if (!gameState.currentSong) return;

    const stopBtn = document.getElementById('stopBtn');
    const audio = document.getElementById('audioPlayer');

    // Reverse-Modus: Countdown ausblenden und Flags zurücksetzen
    stopPointsCountdown();
    gameState.previewFinished = false;

    // Stoppe normales Preview und laufende Reverse-Instanzen
    audio.pause();
    stopReversePlayback();

    const safeSrc = gameState.currentSong.previewUrl.replace(/^http:/, 'https:');
    stopBtn.classList.add('active');

    try {
        if (!reverseCtx || reverseCtx.state === 'closed') {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            reverseCtx = new Ctx();
        }

        const resp = await fetch(safeSrc, { cache: 'no-store' });
        const arrBuf = await resp.arrayBuffer();
        const decoded = await reverseCtx.decodeAudioData(arrBuf);

        for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
            decoded.getChannelData(ch).reverse();
        }

        const source = reverseCtx.createBufferSource();
        source.buffer = decoded;
        source.connect(reverseCtx.destination);
        reverseSource = source;
        reversePlaying = true;
        
        // Tracking: Markiere, dass rückwärts abgespielt wurde (erhöht NICHT den playCount und NICHT die totalPlayTime)
        gameState.currentPlayedReverse = true;

        const duration = 5; // Reverse spielt immer 5 Sekunden ab
        const startTime = reverseCtx.currentTime;
        let lastSecondCounted = 0; // Zähler für Sekunden

        // Progress Update für Reverse
        const updateReverseProgress = () => {
            if (!reversePlaying) return;
            const elapsed = reverseCtx.currentTime - startTime;
            const progress = Math.min((elapsed / duration) * 100, 100);
            document.getElementById('progressFill').style.width = progress + '%';
            updateTimeDisplay(elapsed);

            // Zähle jede volle Sekunde, aber maximal 2 Sekunden anrechnen
            const currentSecond = Math.floor(elapsed);
            if (currentSecond > lastSecondCounted && currentSecond <= duration && currentSecond <= 2) {
                gameState.totalPlayTime += 1;
                updatePlayTimeDisplay();
                lastSecondCounted = currentSecond;
            }

            if (elapsed < duration && reversePlaying) {
                requestAnimationFrame(updateReverseProgress);
            }
        };

        source.onended = () => {
            reversePlaying = false;
            reverseSource = null;
            stopBtn.classList.remove('active');
            document.getElementById('progressFill').style.width = '0%';
            updateTimeDisplay(0, 15);
            
            const playBtn = document.getElementById('playBtn');
            if (playBtn) playBtn.disabled = false;
        };

        // Stoppe nach Preview-Dauer
        setTimeout(() => {
            if (reversePlaying && reverseSource) {
                try {
                    reverseSource.stop(0);
                } catch (e) {
                    console.warn('reverse stop timeout error', e);
                }
                stopReversePlayback();
                stopBtn.classList.remove('active');
                document.getElementById('progressFill').style.width = '0%';
                updateTimeDisplay(0, 15);
                
                const playBtn = document.getElementById('playBtn');
                if (playBtn) playBtn.disabled = false;
            }
        }, duration * 1000);

        source.start(0);
        updateReverseProgress();
    } catch (err) {
        console.error('Reverse playback error:', err);
        stopBtn.classList.remove('active');
        
        const playBtn = document.getElementById('playBtn');
        if (playBtn) playBtn.disabled = false;
        
        alert('Konnte Reverse-Preview nicht abspielen.');
    }
}

// Update Zeit-Anzeige
function updateTimeDisplay(seconds, duration = 15) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    document.getElementById('timeDisplay').textContent = 
        `${mins}:${String(secs).padStart(2, '0')} / 0:${String(duration).padStart(2, '0')}`;
}

// Update Gesamt-Abspielzeit-Anzeige
function updatePlayTimeDisplay() {
    const playTimeEl = document.getElementById('totalPlayTimeDisplay');
    if (playTimeEl) {
        playTimeEl.textContent = `${gameState.totalPlayTime}s`;
    }
}

// Update Statistiken
function updateStats() {
    const totalQuestions = gameState.songs ? gameState.songs.length : 0;
    const displayedQuestion = Math.min(gameState.currentQuestion + 1, totalQuestions);
    const totalEl = document.getElementById('totalProgress');
    if (totalEl) {
        totalEl.textContent = `${displayedQuestion} von ${totalQuestions} Fragen`;
    }

    const correctEl = document.getElementById('correctCount');
    if (correctEl) {
        correctEl.textContent = gameState.correctAnswers;
    }

    const wrongEl = document.getElementById('wrongCount');
    if (wrongEl) {
        wrongEl.textContent = gameState.wrongAnswers;
    }
    
    const pointsEl = document.getElementById('pointsCount');
    if (pointsEl) {
        pointsEl.textContent = gameState.totalPoints;
    }
}

// Spiel beenden
function endGame() {
    stopPointsCountdown();

    const total = gameState.correctAnswers + gameState.wrongAnswers;
    const percentage = total > 0 ? Math.round((gameState.correctAnswers / total) * 100) : 0;
    const finalScore = calculateFinalScore();

    document.getElementById('quizScreen').style.display = 'none';
    document.getElementById('gameOverScreen').classList.add('show');
    document.getElementById('finalScore').textContent = `${gameState.correctAnswers}/${total}`;
    document.getElementById('scorePercentage').textContent = `${percentage}%`;
    document.getElementById('finalPoints').textContent = `🏆 ${finalScore} Punkte`;

    stopPreview();
    
    // Speichere Score nach kurzer Verzögerung (UI-Update zuerst)
    setTimeout(() => {
        saveGameScore();
    }, 500);
}

// Helper-Funktionen
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function showLoadingState() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }
    document.getElementById('answersContainer').innerHTML = '';
}

function hideLoadingState() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = '⚠️ ' + message;
    errorDiv.classList.add('show');
}

// Verhindere mehrfaches Abspielen
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        stopPreview();
    }
});

/**
 * HIGHSCORE SYSTEM
 */

// Generiere UUID v4
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Lade oder erstelle Spieler-ID
function getOrCreatePlayerID() {
    let playerId = localStorage.getItem('playerId');
    if (!playerId) {
        playerId = generateUUID();
        localStorage.setItem('playerId', playerId);
        console.log('Neue Spieler-ID erstellt:', playerId);
    }
    return playerId;
}

// Lade Spieler-Name aus localStorage oder vom Server
async function initializePlayerName() {
    // Stelle sicher, dass Spieler-ID existiert
    getOrCreatePlayerID();
    
    let playerName = localStorage.getItem('playerName');
    
    if (!playerName) {
        // Versuche vom Server zu laden
        try {
            const res = await fetch('/api/player');
            const data = await res.json();
            if (data.username) {
                playerName = data.username;
                localStorage.setItem('playerName', playerName);
            } else {
                playerName = 'Anon';
            }
        } catch (err) {
            playerName = 'Anon';
        }
    }
    
    updatePlayerNameDisplay(playerName);
}

// Update Player-Name Button im Header
function updatePlayerNameDisplay(name) {
    const btn = document.getElementById('playerNameBtn');
    if (btn) {
        btn.textContent = `👤 ${name}`;
    }
}

// Öffne Player-Name Modal
function openPlayerNameModal() {
    const modal = document.getElementById('playerNameModal');
    const input = document.getElementById('playerNameInput');
    const currentName = localStorage.getItem('playerName') || 'Anon';
    
    if (currentName !== 'Anon') {
        input.value = currentName;
    }
    input.focus();
    modal.classList.add('show');
}

// Schließe Player-Name Modal
function closePlayerNameModal() {
    const modal = document.getElementById('playerNameModal');
    modal.classList.remove('show');
}

// Speichere Player-Name
function savePlayerName() {
    const input = document.getElementById('playerNameInput');
    const name = input.value.trim();
    
    if (!name || name.length < 2) {
        alert('Bitte geben Sie einen Namen ein (min. 2 Zeichen)');
        return;
    }
    
    localStorage.setItem('playerName', name);
    updatePlayerNameDisplay(name);
    closePlayerNameModal();
}

// Neuer Spieler: Lösche localStorage und erstelle neue ID
function startNewPlayer() {
    if (confirm('Neuen Spieler starten? Dein aktueller Name wird zurückgesetzt.')) {
        localStorage.removeItem('playerId');
        localStorage.removeItem('playerName');
        const newId = generateUUID();
        localStorage.setItem('playerId', newId);
        localStorage.setItem('playerName', 'Anon');
        updatePlayerNameDisplay('Anon');
        console.log('Neuer Spieler gestartet. ID:', newId);
        alert('Neuer Spieler erstellt! Bitte Namen festlegen.');
        openPlayerNameModal();
    }
}

// Lade Leaderboard für einen Spielmodus
async function loadLeaderboard(gameMode) {
    try {
        const encodedMode = encodeURIComponent(gameMode);
        const res = await fetch(`/api/leaderboard/${encodedMode}`);
        const data = await res.json();
        return data.scores || [];
    } catch (err) {
        console.error('Fehler beim Laden des Leaderboards:', err);
        return [];
    }
}

// Lauftext mit Scores anzeigen
function renderLeaderboardTicker(scores, gameMode) {
    const ticker = document.getElementById('leaderboardTicker');
    const track = document.getElementById('leaderboardTickerTrack');
    if (!ticker || !track) return;

    if (!scores || scores.length === 0) {
        track.innerHTML = '<span class="ticker-empty">Keine Scores vorhanden</span>';
        track.style.setProperty('--ticker-duration', '18s');
        return;
    }

    // Sortiere nach Punkten (fallback auf totalPoints) und zeige nur Top 10
    const sorted = [...scores].sort((a, b) => {
        const ap = (a.points ?? a.totalPoints ?? 0);
        const bp = (b.points ?? b.totalPoints ?? 0);
        return bp - ap; // absteigend
    });
    const topScores = sorted.slice(0, 10);

    const items = topScores.map((score, idx) => {
        const points = score.points ?? score.totalPoints ?? 0; // show per-score points, avoid summed totals
        const modeLabel = score.gameMode || gameMode || 'Modus';
        return `
            <span class="ticker-item">
                <span class="leaderboard-rank">#${idx + 1}</span>
                <span class="leaderboard-name">${score.username}</span>
                <span class="ticker-mode">${modeLabel}</span>
                <span class="ticker-points">🏆 ${points}</span>
            </span>
        `;
    });

    // Dupliziere Items für endlosen Scroll
    const repeated = items.concat(items);
    track.innerHTML = repeated.join('<span style="width: 32px;"></span>');

    // Geschwindigkeit abhängig von Anzahl Elemente
    const durationSec = Math.max(12, topScores.length * 3);
    track.style.setProperty('--ticker-duration', `${durationSec}s`);
}

async function openLeaderboardModal(gameMode) {
    const modal = document.getElementById('leaderboardModal');
    const titleEl = document.getElementById('leaderboardModalTitle');
    const listEl = document.getElementById('leaderboardModalList');
    if (!modal || !listEl) return;

    const scores = await loadLeaderboard(gameMode);
    if (titleEl) {
        titleEl.textContent = `Highscores – ${gameMode}`;
    }

    if (!scores || scores.length === 0) {
        listEl.innerHTML = '<li class="leaderboard-modal-item" style="border-bottom:none; color:#888;">Keine Scores vorhanden</li>';
    } else {
        const html = scores
            .map((score, idx) => {
                const points = score.points ?? score.totalPoints ?? 0; // show per-score points
                const modeLabel = score.gameMode || gameMode || 'Modus';
                return `
                    <li class="leaderboard-modal-item">
                        <span class="leaderboard-modal-rank">#${idx + 1}</span>
                        <div>
                            <div class="leaderboard-modal-name">${score.username}</div>
                            <div class="leaderboard-modal-meta">${modeLabel}</div>
                        </div>
                        <span class="leaderboard-modal-points">🏆 ${points}</span>
                    </li>
                `;
            })
            .join('');
        listEl.innerHTML = html;
    }

    modal.classList.add('show');
}

function closeLeaderboardModal(event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const modal = document.getElementById('leaderboardModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Zeige Leaderboard im Setup-Screen
async function showSetupLeaderboard() {
    const leaderboardDiv = document.getElementById('setupLeaderboard');
    const titleEl = document.querySelector('#setupLeaderboard .leaderboard-title');
    
    if (!leaderboardDiv) return;
    
    // Lade Global Leaderboard (alle Scores)
    const gameMode = 'Global';
    if (titleEl) {
        titleEl.textContent = `🏆 Highscores – ${gameMode}`;
    }
    const scores = await loadLeaderboard(gameMode);
    renderLeaderboardTicker(scores, gameMode);
    if (leaderboardDiv && !leaderboardDiv.dataset.clickBound) {
        leaderboardDiv.addEventListener('click', () => {
            openLeaderboardModal('Global');
        });
        leaderboardDiv.dataset.clickBound = 'true';
    }
    
    leaderboardDiv.classList.add('show');
}

// Zeige Top 3 während des Spiels (Motivation)
async function showGameLeaderboard() {
    const leaderboardDiv = document.getElementById('quizLeaderboard');
    const listDiv = document.getElementById('quizLeaderboardList');
    const titleEl = document.querySelector('#quizLeaderboard .leaderboard-title');
    
    if (!leaderboardDiv) return;
    
    const gameMode = gameState.currentGameMode || 'Genre';
    if (titleEl) {
        titleEl.textContent = `🏆 Top 3 – ${gameMode}`;
    }
    const scores = await loadLeaderboard(gameMode);
    
    if (!scores || scores.length === 0) {
        leaderboardDiv.classList.remove('show');
        return;
    }
    
    // Render Top 3
    const html = scores.slice(0, 3).map((score, index) => `
        <div class="leaderboard-item">
            <span class="leaderboard-rank">#${index + 1}</span>
            <span class="leaderboard-name">${score.username}</span>
            <span class="leaderboard-points">🏆 ${score.totalPoints}</span>
        </div>
    `).join('');
    
    listDiv.innerHTML = html;
    leaderboardDiv.classList.add('show');
}

// Speichere Score nach Spielende
async function saveGameScore() {
    const playerName = localStorage.getItem('playerName') || 'Anon';
    const playerId = getOrCreatePlayerID();
    const gameMode = gameState.currentGameMode || 'Genre';
    const totalQuestions = gameState.songs ? gameState.songs.length : 0;
    const correctAnswers = gameState.correctAnswers || 0;
    const finalScore = calculateFinalScore();
    
    console.log('💾 Speichere Score:', {
        playerName,
        playerId,
        gameMode,
        points: finalScore,
        totalQuestions,
        correctAnswers
    });
    
    try {
        const res = await fetch('/api/score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: playerName,
                playerId: playerId,
                gameMode: gameMode,
                points: finalScore,
                totalQuestions: totalQuestions,
                correctAnswers: correctAnswers
            })
        });
        
        const data = await res.json();
        
        if (data.success) {
            console.log('✅ Score gespeichert:', data.score);
            return true;
        } else {
            console.error('❌ Score-Speichern fehlgeschlagen:', data.error);
            return false;
        }
    } catch (err) {
        console.error('❌ Fehler beim Speichern des Scores:', err);
        return false;
    }
}

// Hole aktuell ausgewählten Spielmodus
function getSelectedGameMode() {
    const selected = document.querySelector('input[name="gameMode"]:checked');
    
    if (!selected) return 'Genre';
    
    const value = selected.value;
    
    if (value === 'genre') {
        const genreSelect = document.getElementById('genreSelect');
        const genre = genreSelect ? genreSelect.value : 'Alle';
        return `Genre: ${genre}`;
    } else if (value === 'billboard') {
        const selectedYear = document.getElementById('yearSelect')?.value;
        return selectedYear ? `Billboard Charts aus ${selectedYear}` : 'Billboard Hot 100';
    } else if (value === 'search') {
        const searchQuery = document.getElementById('searchQuery')?.value?.trim();
        return searchQuery ? `Songs von ${searchQuery}` : 'Freie Wahl (iTunes Suche)';
    }
    
    return 'Genre';
}

// Rufe initializePlayerName beim Laden auf
document.addEventListener('DOMContentLoaded', function() {
    initializePlayerName();
    // Initial Leaderboard laden
    setTimeout(() => {
        showSetupLeaderboard();
    }, 300);
});
