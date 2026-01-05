const APP_VERSION = 'v51';
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
    currentSong: null,
    currentAudio: null,
    isAnswered: false,
    multipleChoice: true,
    showGenre: false,
    previewDuration: 5,
    audioSource: null,
    audioContext: null,
    progressInterval: null,
    lastError: ''
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
    });
} else {
    // DOM ist bereits geladen
    loadVersion();
    loadAvailableGenres();
}

// Toggle zwischen Genre- und Suchmodus
function toggleGameMode() {
    const mode = document.getElementById('gameMode').value;
    const genreSelection = document.getElementById('genreSelection');
    const searchSelection = document.getElementById('searchSelection');

    if (mode === 'genre') {
        genreSelection.style.display = 'flex';
        searchSelection.style.display = 'none';
    } else {
        genreSelection.style.display = 'none';
        searchSelection.style.display = 'flex';
    }
}

// Starte das Spiel
async function startGame() {
    const gameMode = document.getElementById('gameMode').value;
    const songCount = parseInt(document.getElementById('songCount').value);
    const multipleChoice = document.getElementById('multipleChoice').checked;
    const showGenre = document.getElementById('genreMode').checked;
    const previewDuration = parseInt(document.getElementById('previewDuration').value);

    // State speichern
    gameState.multipleChoice = multipleChoice;
    gameState.showGenre = showGenre;
    gameState.previewDuration = previewDuration;
    gameState.currentQuestion = 0;
    gameState.correctAnswers = 0;
    gameState.wrongAnswers = 0;

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
            image: song.artworkUrl100 || song.artworkUrl60 || '',
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
                image: song.artworkUrl100 || song.artworkUrl60,
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
    displayAlbumCover();
    displayAnswers();

    // Verstecke die nächste Frage Button
    document.getElementById('nextBtn').classList.remove('show');
    document.getElementById('resultMessage').textContent = '';
    document.getElementById('errorMessage').classList.remove('show');
    document.getElementById('songInfo').classList.remove('show');
    document.getElementById('playBtn').disabled = false;

    gameState.currentQuestion++;
}

// Zeige Albumcover an
function displayAlbumCover() {
    const albumCover = document.getElementById('albumCover');
    const song = gameState.currentSong;

    if (song.image) {
        albumCover.innerHTML = `<img src="${song.image}" alt="Album Cover" onerror="this.parentElement.innerHTML='<div class=\"cover-placeholder\">🎵</div>'">`;
    } else {
        albumCover.innerHTML = '<div class="cover-placeholder">🎵</div>';
    }
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

        if (gameState.multipleChoice && gameState.songs && gameState.songs.length > 1) {
            // Generiere 3 falsche Antworten
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
                btn.textContent = answer;
                btn.onclick = () => selectAnswer(answer, index);
                answersContainer.appendChild(btn);
            }
        });

    } catch (error) {
        console.error('Fehler in displayAnswers:', error);
        document.getElementById('answersContainer').innerHTML = '<p style="color: red;">Fehler bei der Anzeige der Antworten</p>';
    }
}

// Generiere zufällige falsche Antworten
function getRandomWrongAnswers(count) {
    const wrongAnswers = [];
    const usedTracks = new Set([gameState.currentSong.track]);

    let attempts = 0;
    const maxAttempts = gameState.songs.length * 2;

    while (wrongAnswers.length < count && attempts < maxAttempts) {
        const randomSong = gameState.songs[Math.floor(Math.random() * gameState.songs.length)];
        
        if (!usedTracks.has(randomSong.track)) {
            usedTracks.add(randomSong.track);
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
        document.getElementById('resultMessage').textContent = '✅ Richtig!';
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
    if (gameState.showGenre) {
        document.getElementById('infoGenre').textContent = song.genre;
        genreRow.style.display = 'flex';
    } else {
        genreRow.style.display = 'none';
    }

    document.getElementById('songInfo').classList.add('show');
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
        playBtn.disabled = true;
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
    const playBtn = document.getElementById('playBtn');
    const stopBtn = document.getElementById('stopBtn');

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

    playBtn.disabled = false;
    stopBtn.classList.remove('active');
    document.getElementById('progressFill').style.width = '0%';
    updateTimeDisplay(0);
}

// Update Zeit-Anzeige
function updateTimeDisplay(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const duration = gameState.previewDuration;
    document.getElementById('timeDisplay').textContent = 
        `${mins}:${String(secs).padStart(2, '0')} / 0:${String(duration).padStart(2, '0')}`;
}

// Update Statistiken
function updateStats() {
    document.getElementById('currentQuestion').textContent = gameState.currentQuestion;
    document.getElementById('correctCount').textContent = gameState.correctAnswers;
    document.getElementById('wrongCount').textContent = gameState.wrongAnswers;
}

// Spiel beenden
function endGame() {
    const total = gameState.correctAnswers + gameState.wrongAnswers;
    const percentage = total > 0 ? Math.round((gameState.correctAnswers / total) * 100) : 0;

    document.getElementById('quizScreen').style.display = 'none';
    document.getElementById('gameOverScreen').classList.add('show');
    document.getElementById('finalScore').textContent = `${gameState.correctAnswers}/${total}`;
    document.getElementById('scorePercentage').textContent = `${percentage}%`;

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
