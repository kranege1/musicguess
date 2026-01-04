// Song-Datenbank
const SONG_DATABASE = {
  "genres": {
    "Rock": [
      {
        "id": 1440650428,
        "track": "Bohemian Rhapsody",
        "artist": "Queen",
        "album": "A Night At the Opera (2011 Remaster)",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/62/0c/e8/620ce8c7-773f-9f4b-dca1-b64d7e6b7728/mzaf_13341178261601793605.plus.aac.p.m4a",
        "image": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/3c/1b/a9/3c1ba9e1-15b1-03b3-3bfd-5d794d144bfc/16UMGIM04543.rgb.jpg/100x100bb.jpg",
        "genre": "Rock"
      },
      {
        "id": 1440879651,
        "track": "Stairway to Heaven",
        "artist": "Led Zeppelin",
        "album": "Led Zeppelin IV (Remaster)",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/2f/58/9b/2f589b8e-e8b5-8ddd-a91b-a3f348e9e6e6/mzaf_4592662581403413837.plus.aac.p.m4a",
        "image": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/26/30/43/26304357-23bb-3f13-c8f8-d71da73d88c5/16UMGIM24989.rgb.jpg/100x100bb.jpg",
        "genre": "Rock"
      },
      {
        "id": 1440879099,
        "track": "Imagine",
        "artist": "John Lennon",
        "album": "Imagine",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/9d/70/8e/9d708e5e-64a1-8e73-f01e-6c2d5e6b5e5a/mzaf_5592662581403413838.plus.aac.p.m4a",
        "image": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/74/db/8a/74db8ae3-598a-d4d6-8c6d-cfc6a5aa0e9e/00602547954893.rgb.jpg/100x100bb.jpg",
        "genre": "Rock"
      },
      {
        "id": 1440831180,
        "track": "Sweet Child O' Mine",
        "artist": "Guns N' Roses",
        "album": "Appetite for Destruction",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/3e/4c/d9/3e4cd9e0-5f5e-5e5e-5e5e-5e5e5e5e5e5e/mzaf_5592662581403413839.plus.aac.p.m4a",
        "image": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/a4/68/ab/a468ab95-679e-6b29-5b6d-7e6e7e6e7e6e/00720642442753.rgb.jpg/100x100bb.jpg",
        "genre": "Rock"
      },
      {
        "id": 1440831181,
        "track": "Hotel California",
        "artist": "Eagles",
        "album": "Hotel California (2013 Remaster)",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/5f/5f/5f/5f5f5f5f-5f5f-5f5f-5f5f-5f5f5f5f5f5f/mzaf_5592662581403413840.plus.aac.p.m4a",
        "image": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/8b/8b/8b/8b8b8b8b-8b8b-8b8b-8b8b-8b8b8b8b8b8b/00081227971984.rgb.jpg/100x100bb.jpg",
        "genre": "Rock"
      }
    ],
    "Pop": [
      {
        "id": 1440901021,
        "track": "Billie Jean",
        "artist": "Michael Jackson",
        "album": "Thriller",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/1a/1a/1a/1a1a1a1a-1a1a-1a1a-1a1a-1a1a1a1a1a1a/mzaf_1592662581403413841.plus.aac.p.m4a",
        "image": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/2c/2c/2c/2c2c2c2c-2c2c-2c2c-2c2c-2c2c2c2c2c2c/00194690265365.rgb.jpg/100x100bb.jpg",
        "genre": "Pop"
      },
      {
        "id": 1440901022,
        "track": "Like a Prayer",
        "artist": "Madonna",
        "album": "Like a Prayer",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/3d/3d/3d/3d3d3d3d-3d3d-3d3d-3d3d-3d3d3d3d3d3d/mzaf_3592662581403413842.plus.aac.p.m4a",
        "image": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/4e/4e/4e/4e4e4e4e-4e4e-4e4e-4e4e-4e4e4e4e4e4e/00093624932949.rgb.jpg/100x100bb.jpg",
        "genre": "Pop"
      },
      {
        "id": 1440901023,
        "track": "Uptown Funk",
        "artist": "Mark Ronson",
        "album": "Uptown Special",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/5a/5a/5a/5a5a5a5a-5a5a-5a5a-5a5a-5a5a5a5a5a5a/mzaf_5592662581403413843.plus.aac.p.m4a",
        "image": "https://is1-ssl.mzstatic.com/image/thumb/Music3/v4/6b/6b/6b/6b6b6b6b-6b6b-6b6b-6b6b-6b6b6b6b6b6b/886445635850.jpg/100x100bb.jpg",
        "genre": "Pop"
      },
      {
        "id": 1440901024,
        "track": "Shape of You",
        "artist": "Ed Sheeran",
        "album": "÷ (Deluxe)",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/7c/7c/7c/7c7c7c7c-7c7c-7c7c-7c7c-7c7c7c7c7c7c/mzaf_7592662581403413844.plus.aac.p.m4a",
        "image": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/8d/8d/8d/8d8d8d8d-8d8d-8d8d-8d8d-8d8d8d8d8d8d/00190295859572.rgb.jpg/100x100bb.jpg",
        "genre": "Pop"
      },
      {
        "id": 1440901025,
        "track": "Rolling in the Deep",
        "artist": "Adele",
        "album": "21",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/9e/9e/9e/9e9e9e9e-9e9e-9e9e-9e9e-9e9e9e9e9e9e/mzaf_9592662581403413845.plus.aac.p.m4a",
        "image": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/af/af/af/afafafaf-afaf-afaf-afaf-afafafafafaf/00634904023515.rgb.jpg/100x100bb.jpg",
        "genre": "Pop"
      }
    ],
    "Hip-Hop": [
      {
        "id": 1440920001,
        "track": "Lose Yourself",
        "artist": "Eminem",
        "album": "8 Mile",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/b1/b1/b1/b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1/mzaf_b592662581403413846.plus.aac.p.m4a",
        "image": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/c2/c2/c2/c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2/00606949335458.rgb.jpg/100x100bb.jpg",
        "genre": "Hip-Hop"
      },
      {
        "id": 1440920002,
        "track": "HUMBLE.",
        "artist": "Kendrick Lamar",
        "album": "DAMN.",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/d3/d3/d3/d3d3d3d3-d3d3-d3d3-d3d3-d3d3d3d3d3d3/mzaf_d592662581403413847.plus.aac.p.m4a",
        "image": "https://is1-ssl.mzstatic.com/image/thumb/Music117/v4/e4/e4/e4/e4e4e4e4-e4e4-e4e4-e4e4-e4e4e4e4e4e4/00602557650686.rgb.jpg/100x100bb.jpg",
        "genre": "Hip-Hop"
      },
      {
        "id": 1440920003,
        "track": "Sicko Mode",
        "artist": "Travis Scott",
        "album": "ASTROWORLD",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/f5/f5/f5/f5f5f5f5-f5f5-f5f5-f5f5-f5f5f5f5f5f5/mzaf_f592662581403413848.plus.aac.p.m4a",
        "image": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/06/06/06/06060606-0606-0606-0606-060606060606/00888072086784.rgb.jpg/100x100bb.jpg",
        "genre": "Hip-Hop"
      },
      {
        "id": 1440920004,
        "track": "God's Plan",
        "artist": "Drake",
        "album": "Scorpion",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/17/17/17/17171717-1717-1717-1717-171717171717/mzaf_1792662581403413849.plus.aac.p.m4a",
        "image": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/28/28/28/28282828-2828-2828-2828-282828282828/00602567696629.rgb.jpg/100x100bb.jpg",
        "genre": "Hip-Hop"
      },
      {
        "id": 1440920005,
        "track": "Old Town Road",
        "artist": "Lil Nas X",
        "album": "7 - EP",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/39/39/39/39393939-3939-3939-3939-393939393939/mzaf_3992662581403413850.plus.aac.p.m4a",
        "image": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/4a/4a/4a/4a4a4a4a-4a4a-4a4a-4a4a-4a4a4a4a4a4a/886447945810.jpg/100x100bb.jpg",
        "genre": "Hip-Hop"
      }
    ],
    "Jazz": [
      {
        "id": 1440930001,
        "track": "What a Wonderful World",
        "artist": "Louis Armstrong",
        "album": "What a Wonderful World",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/4b/4b/4b/4b4b4b4b-4b4b-4b4b-4b4b-4b4b4b4b4b4b/mzaf_4b92662581403413851.plus.aac.p.m4a",
        "image": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/5c/5c/5c/5c5c5c5c-5c5c-5c5c-5c5c-5c5c5c5c5c5c/00888072022577.rgb.jpg/100x100bb.jpg",
        "genre": "Jazz"
      },
      {
        "id": 1440930002,
        "track": "Take Five",
        "artist": "Dave Brubeck",
        "album": "Time Out",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/6d/6d/6d/6d6d6d6d-6d6d-6d6d-6d6d-6d6d6d6d6d6d/mzaf_6d92662581403413852.plus.aac.p.m4a",
        "image": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/7e/7e/7e/7e7e7e7e-7e7e-7e7e-7e7e-7e7e7e7e7e7e/00886976451110.rgb.jpg/100x100bb.jpg",
        "genre": "Jazz"
      },
      {
        "id": 1440930003,
        "track": "Fly Me to the Moon",
        "artist": "Frank Sinatra",
        "album": "It Might as Well Be Swing",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/8f/8f/8f/8f8f8f8f-8f8f-8f8f-8f8f-8f8f8f8f8f8f/mzaf_8f92662581403413853.plus.aac.p.m4a",
        "image": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/90/90/90/90909090-9090-9090-9090-909090909090/00602557385694.rgb.jpg/100x100bb.jpg",
        "genre": "Jazz"
      },
      {
        "id": 1440930004,
        "track": "So What",
        "artist": "Miles Davis",
        "album": "Kind of Blue",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/a1/a1/a1/a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1/mzaf_a192662581403413854.plus.aac.p.m4a",
        "image": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b2/b2/b2/b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2/00886977920721.rgb.jpg/100x100bb.jpg",
        "genre": "Jazz"
      },
      {
        "id": 1440930005,
        "track": "Feeling Good",
        "artist": "Nina Simone",
        "album": "I Put a Spell On You",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/c3/c3/c3/c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3/mzaf_c392662581403413855.plus.aac.p.m4a",
        "image": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/d4/d4/d4/d4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4/00600753465684.rgb.jpg/100x100bb.jpg",
        "genre": "Jazz"
      }
    ],
    "Electronic": [
      {
        "id": 1440940001,
        "track": "One More Time",
        "artist": "Daft Punk",
        "album": "Discovery",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/e5/e5/e5/e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5/mzaf_e592662581403413856.plus.aac.p.m4a",
        "image": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/f6/f6/f6/f6f6f6f6-f6f6-f6f6-f6f6-f6f6f6f6f6f6/00724384260538.rgb.jpg/100x100bb.jpg",
        "genre": "Electronic"
      },
      {
        "id": 1440940002,
        "track": "Levels",
        "artist": "Avicii",
        "album": "Levels - Single",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/07/07/07/07070707-0707-0707-0707-070707070707/mzaf_0792662581403413857.plus.aac.p.m4a",
        "image": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/18/18/18/18181818-1818-1818-1818-181818181818/00602527834764.rgb.jpg/100x100bb.jpg",
        "genre": "Electronic"
      },
      {
        "id": 1440940003,
        "track": "Titanium",
        "artist": "David Guetta",
        "album": "Nothing but the Beat",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/29/29/29/29292929-2929-2929-2929-292929292929/mzaf_2992662581403413858.plus.aac.p.m4a",
        "image": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/3a/3a/3a/3a3a3a3a-3a3a-3a3a-3a3a-3a3a3a3a3a3a/00724383117031.rgb.jpg/100x100bb.jpg",
        "genre": "Electronic"
      },
      {
        "id": 1440940004,
        "track": "Wake Me Up",
        "artist": "Avicii",
        "album": "True",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/4b/4b/4b/4b4b4b4b-4b4b-4b4b-4b4b-4b4b4b4b4b4b/mzaf_4b92662581403413859.plus.aac.p.m4a",
        "image": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/5c/5c/5c/5c5c5c5c-5c5c-5c5c-5c5c-5c5c5c5c5c5c/00602537518241.rgb.jpg/100x100bb.jpg",
        "genre": "Electronic"
      },
      {
        "id": 1440940005,
        "track": "Strobe",
        "artist": "Deadmau5",
        "album": "For Lack of a Better Name",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/6d/6d/6d/6d6d6d6d-6d6d-6d6d-6d6d-6d6d6d6d6d6d/mzaf_6d92662581403413860.plus.aac.p.m4a",
        "image": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/7e/7e/7e/7e7e7e7e-7e7e-7e7e-7e7e-7e7e7e7e7e7e/00602527241319.rgb.jpg/100x100bb.jpg",
        "genre": "Electronic"
      }
    ]
  }
};

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
        // Nutze die eingebettete Datenbank (kein fetch nötig)
        const data = SONG_DATABASE;
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
        console.error('Fehler beim Laden der Songs:', error);
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
