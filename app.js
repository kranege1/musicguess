const APP_VERSION = 'v73';
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
    totalPlayTime: 0  // Gesamt-Abspielzeit in Sekunden für aktuelle Frage
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
            document.getElementById('gameSubtitle').textContent = `Genre: ${genreText}`;
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
            document.getElementById('gameSubtitle').textContent = `Billboard Charts aus ${selectedYear}`;
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
            document.getElementById('gameSubtitle').textContent = `Songs von ${searchQuery}`;
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
                gameState.currentQuestion = idx;
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
    
    // Aktiviere Duration-Buttons für neue Frage
    disableDurationButtons(false);

    gameState.currentQuestion++;
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

        // Generiere immer 3 falsche Antworten (4 Antworten gesamt)
        if (gameState.songs && gameState.songs.length > 1) {
            const wrongAnswers = getRandomWrongAnswers(3);
            if (wrongAnswers.length > 0) {
                answers = answers.concat(wrongAnswers);
                answers = shuffleArray(answers);
            }
        }

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

    // Update Score
    if (isCorrect) {
        gameState.correctAnswers++;
        
        // Berechne Punkte
        const points = calculatePoints();
        gameState.totalPoints += points;
        
        document.getElementById('resultMessage').textContent = `✅ Richtig! +${points} Punkte`;
        document.getElementById('resultMessage').classList.remove('incorrect');
        document.getElementById('resultMessage').classList.add('correct');
    } else {
        gameState.wrongAnswers++;
        document.getElementById('resultMessage').textContent = '❌ Falsch!';
        document.getElementById('resultMessage').classList.remove('correct');
        document.getElementById('resultMessage').classList.add('incorrect');
    }

    // Zeige Song-Infos
    showSongInfo();

    // Zeige nächste Frage Button
    document.getElementById('nextBtn').classList.add('show');
    updateStats();
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
    // Formel: 100 * (5 / totalPlayTime)
    const playTime = Math.max(1, gameState.totalPlayTime); // Mindestens 1 Sekunde
    let points = 100 * (5 / playTime);
    
    // Multiplikator für Rückwärts-Abspielen
    if (gameState.currentPlayedReverse) {
        points *= 2;
    }
    
    // Runde auf ganze Zahl
    return Math.round(points);
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

// Spiele Preview mit gewählter Dauer ab
function playPreviewWithDuration(duration) {
    // Wenn bereits einmal abgespielt wurde, spiele "Katching" Sound
    if (gameState.currentPlayCount > 0) {
        playKatchingSound();
    }
    
    // Setze die gewählte Dauer für diese Frage
    gameState.previewDuration = duration;
    
    // Rufe die normale playPreview Funktion auf
    playPreview();
}

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

    // Deaktiviere Duration-Buttons während Staccato-Playback
    disableDurationButtons(true);
    stopBtn.classList.add('active');

    const duration = 5; // Staccato spielt immer 5 Sekunden
    let currentSecond = 0;
    let staccatoInterval = null;

    // Starte Audio
    audio.play().then(() => {
        console.log('Staccato Playback gestartet');
        
        // Tracking: Staccato zählt nur 3 Sekunden zur Abspielzeit (obwohl 5 Sekunden gespielt werden)
        gameState.currentPlayCount++;
        gameState.totalPlayTime += 3;
        updatePlayTimeDisplay();

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
            updateTimeDisplay(elapsed);
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
        disableDurationButtons(false);
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
    
    console.log('Versuche Preview abzuspielen:', gameState.currentSong.previewUrl);
    debugLog(`▶️ Starte Preview...`);
    
    // Starte Playback
    audio.play().then(() => {
        console.log('Playback gestartet');
        debugLog(`🔊 Playback läuft`);
        
        // Tracking: Erhöhe Play-Count und addiere Abspielzeit
        gameState.currentPlayCount++;
        gameState.totalPlayTime += gameState.previewDuration;
        updatePlayTimeDisplay();
        
        // Deaktiviere alle Duration-Buttons während Playback
        disableDurationButtons(true);
        stopBtn.classList.add('active');

        // Update Progress
        const updateProgress = () => {
            const duration = gameState.previewDuration;
            const progress = Math.min((audio.currentTime / duration) * 100, 100);
            document.getElementById('progressFill').style.width = progress + '%';
            updateTimeDisplay(audio.currentTime);

            if (audio.currentTime < duration && !audio.paused) {
                gameState.progressInterval = requestAnimationFrame(updateProgress);
            } else if (audio.currentTime >= duration) {
                audio.pause();
                stopPreview();
            }
        };

        // Stoppe nach Preview-Duration
        gameState.stopTimeout = setTimeout(() => {
            audio.pause();
            stopPreview();
        }, gameState.previewDuration * 1000);

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

    // Aktiviere Duration-Buttons wieder
    disableDurationButtons(false);
    stopBtn.classList.remove('active');
    document.getElementById('progressFill').style.width = '0%';
    updateTimeDisplay(0);
}

// Helper: Duration-Buttons aktivieren/deaktivieren
function disableDurationButtons(disabled) {
    const buttons = document.querySelectorAll('.duration-btn');
    buttons.forEach(btn => {
        btn.disabled = disabled;
    });
}

// Reverse Preview abspielen
async function playPreviewReverse() {
    if (!gameState.currentSong) return;

    const stopBtn = document.getElementById('stopBtn');
    const audio = document.getElementById('audioPlayer');

    // Stoppe normales Preview und laufende Reverse-Instanzen
    audio.pause();
    stopReversePlayback();

    const safeSrc = gameState.currentSong.previewUrl.replace(/^http:/, 'https:');
    stopBtn.classList.add('active');
    
    // Deaktiviere Duration-Buttons während Reverse-Playback
    disableDurationButtons(true);

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

        // Progress Update für Reverse
        const updateReverseProgress = () => {
            if (!reversePlaying) return;
            const elapsed = reverseCtx.currentTime - startTime;
            const progress = Math.min((elapsed / duration) * 100, 100);
            document.getElementById('progressFill').style.width = progress + '%';
            updateTimeDisplay(elapsed);

            if (elapsed < duration && reversePlaying) {
                requestAnimationFrame(updateReverseProgress);
            }
        };

        source.onended = () => {
            reversePlaying = false;
            reverseSource = null;
            stopBtn.classList.remove('active');
            document.getElementById('progressFill').style.width = '0%';
            updateTimeDisplay(0);
            
            // Aktiviere Duration-Buttons wieder
            disableDurationButtons(false);
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
                updateTimeDisplay(0);
                
                // Aktiviere Duration-Buttons wieder
                disableDurationButtons(false);
            }
        }, duration * 1000);

        source.start(0);
        updateReverseProgress();
    } catch (err) {
        console.error('Reverse playback error:', err);
        stopBtn.classList.remove('active');
        
        // Aktiviere Duration-Buttons wieder
        disableDurationButtons(false);
        
        alert('Konnte Reverse-Preview nicht abspielen.');
    }
}

// Update Zeit-Anzeige
function updateTimeDisplay(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const duration = gameState.previewDuration;
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
    const total = gameState.correctAnswers + gameState.wrongAnswers;
    const percentage = total > 0 ? Math.round((gameState.correctAnswers / total) * 100) : 0;

    document.getElementById('quizScreen').style.display = 'none';
    document.getElementById('gameOverScreen').classList.add('show');
    document.getElementById('finalScore').textContent = `${gameState.correctAnswers}/${total}`;
    document.getElementById('scorePercentage').textContent = `${percentage}%`;
    document.getElementById('finalPoints').textContent = `🏆 ${gameState.totalPoints} Punkte`;

    stopPreview();
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
