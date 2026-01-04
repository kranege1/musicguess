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
};

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
            // Lade Songs aus songs.json
            const selectedGenre = document.getElementById('genreSelect').value;
            await loadSongsFromGenre(selectedGenre, songCount);
        } else {
            // Lade Songs von iTunes API
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
    }
}

// Lade Songs aus songs.json basierend auf Genre
async function loadSongsFromGenre(genre, limit) {
    try {
        const response = await fetch('songs.json');
        if (!response.ok) {
            throw new Error('Fehler beim Laden von songs.json');
        }

        const data = await response.json();
        let allSongs = [];

        if (genre === 'Alle') {
            // Kombiniere alle Genres
            for (const genreName in data.genres) {
                allSongs = allSongs.concat(data.genres[genreName]);
            }
        } else {
            // Nur ausgewähltes Genre
            allSongs = data.genres[genre] || [];
        }

        if (allSongs.length === 0) {
            throw new Error('Keine Songs für dieses Genre gefunden');
        }

        // Mische und begrenze die Anzahl
        gameState.songs = shuffleArray(allSongs).slice(0, Math.min(limit, allSongs.length));
        console.log(`${gameState.songs.length} Songs aus Genre "${genre}" geladen`);
    } catch (error) {
        console.error('Fehler beim Laden der Songs aus JSON:', error);
        throw error;
    }
}

// Lade Songs von iTunes Search API
async function loadSongsFromItunes(searchQuery, limit) {
    try {
        const encodedQuery = encodeURIComponent(searchQuery);
        const response = await fetch(
            `https://itunes.apple.com/search?term=${encodedQuery}&entity=song&limit=50&media=music`
        );

        if (!response.ok) {
            throw new Error('API Anfrage fehlgeschlagen');
        }

        const data = await response.json();
        const songs = data.results
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
                previewUrl: song.previewUrl,
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
function nextQuestion() {
    // Stoppe vorherige Audio
    stopPreview();

    if (gameState.currentQuestion >= gameState.songs.length) {
        endGame();
        return;
    }

    // Setze State zurück
    gameState.isAnswered = false;
    gameState.currentSong = gameState.songs[gameState.currentQuestion];

    // UI aktualisieren
    updateStats();
    displayAlbumCover();
    displayAnswers();

    // Verstecke die nächste Frage Button
    document.getElementById('nextBtn').classList.remove('show');
    document.getElementById('resultMessage').textContent = '';
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

// Spiele Preview ab
function playPreview() {
    if (!gameState.currentSong || !gameState.currentSong.previewUrl) {
        alert('Preview nicht verfügbar');
        return;
    }

    const audio = document.getElementById('audioPlayer');
    const playBtn = document.getElementById('playBtn');
    const stopBtn = document.getElementById('stopBtn');

    // Erstelle neuen Audio wenn nötig
    if (!gameState.currentAudio) {
        gameState.currentAudio = new Audio(gameState.currentSong.previewUrl);
        gameState.currentAudio.crossOrigin = 'anonymous';
    }

    if (audio.paused) {
        // Starte Playback
        const xhr = new XMLHttpRequest();
        xhr.open('GET', gameState.currentSong.previewUrl, true);
        xhr.responseType = 'arraybuffer';

        xhr.onload = function() {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioContext.decodeAudioData(xhr.response, function(buffer) {
                const source = audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(audioContext.destination);

                const startTime = audioContext.currentTime;
                source.start(0);

                playBtn.disabled = true;
                stopBtn.classList.add('active');

                // Stoppiere nach Preview-Duration
                const duration = gameState.previewDuration * 1000;
                setTimeout(() => {
                    source.stop();
                    stopPreview();
                }, duration);

                // Update Progress
                const interval = setInterval(() => {
                    const elapsed = (audioContext.currentTime - startTime) * 1000;
                    const progress = Math.min((elapsed / duration) * 100, 100);
                    document.getElementById('progressFill').style.width = progress + '%';
                    updateTimeDisplay(elapsed / 1000);

                    if (elapsed >= duration) {
                        clearInterval(interval);
                    }
                }, 50);
            }, function(error) {
                console.error('Audio decode error:', error);
                playSimplePreview();
            });
        };

        xhr.onerror = function() {
            playSimplePreview();
        };

        xhr.send();
    }
}

// Einfache Preview (Fallback)
function playSimplePreview() {
    const audio = document.getElementById('audioPlayer');
    const playBtn = document.getElementById('playBtn');
    const stopBtn = document.getElementById('stopBtn');

    audio.src = gameState.currentSong.previewUrl;
    audio.currentTime = 0;
    audio.play().then(() => {
        playBtn.disabled = true;
        stopBtn.classList.add('active');

        // Update Progress
        const updateProgress = () => {
            const duration = gameState.previewDuration;
            const progress = Math.min((audio.currentTime / duration) * 100, 100);
            document.getElementById('progressFill').style.width = progress + '%';
            updateTimeDisplay(audio.currentTime);

            if (audio.currentTime < duration && !audio.paused) {
                requestAnimationFrame(updateProgress);
            } else {
                audio.pause();
                stopPreview();
            }
        };

        // Stoppe nach Preview-Duration
        setTimeout(() => {
            audio.pause();
            stopPreview();
        }, gameState.previewDuration * 1000);

        updateProgress();
    }).catch(error => {
        console.error('Playback error:', error);
        alert('Fehler beim Abspielen des Previews');
        stopPreview();
    });
}

// Stoppe Preview
function stopPreview() {
    const audio = document.getElementById('audioPlayer');
    const playBtn = document.getElementById('playBtn');
    const stopBtn = document.getElementById('stopBtn');

    audio.pause();
    audio.currentTime = 0;
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
