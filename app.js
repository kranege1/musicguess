const APP_VERSION = '11.01.2026 00:00';
window.APP_VERSION = APP_VERSION;

// Language system
let currentLanguage = localStorage.getItem('gameLanguage') || 'de';
let translations = {};

// Load translations
async function loadTranslations() {
    try {
        const response = await fetch('/translations.json');
        translations = await response.json();
        updateUILanguage();
    } catch (error) {
        console.error('Failed to load translations:', error);
        translations = { de: {}, en: {}, it: {} }; // Fallback
    }
}

// Change language
function changeLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('gameLanguage', lang);
    updateUILanguage();
}

// Update all UI elements with current language
function updateUILanguage() {
    const t = translations[currentLanguage] || translations['de'];
    
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            el.textContent = t[key];
        }
    });
    
    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (t[key]) {
            el.placeholder = t[key];
        }
    });
    
    // Update titles
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (t[key]) {
            el.title = t[key];
        }
    });
    
    // Update active language button
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === currentLanguage);
    });
    
    // Update song count options
    updateSongCountOptions();
}

// Update song count dropdown with translated text
function updateSongCountOptions() {
    const t = translations[currentLanguage] || translations['de'];
    const select = document.getElementById('songCount');
    if (select) {
        Array.from(select.options).forEach(option => {
            const count = option.value;
            option.text = `${count} ${t.songs || 'Songs'}`;
        });
    }
}

// Get translation by key
function t(key) {
    return translations[currentLanguage]?.[key] || translations['de']?.[key] || key;
}

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
let currentSearchType = 'track'; // 'track' oder 'album'
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

// Store genres, decades, and countries for two-tier dropdown
let genresData = {
    decades: [],
    genres: [],
    countries: [],
    classical: []
};

// Lade verfügbare Genres beim Seitenstart
async function loadAvailableGenres() {
    console.log('loadAvailableGenres() wird aufgerufen...');
    debugLog('🔄 Lade Genres...');
    try {
        // Load consolidated genres.json
        const cacheBuster = new Date().getTime();
        const genresResponse = await fetch(`genres.json?v=${cacheBuster}`, { cache: 'no-store' });
        
        if (!genresResponse.ok) {
            throw new Error(t('errorLoadingGenres'));
        }

        const genresFileData = await genresResponse.json();
        
        // Populate genresData from consolidated file
        genresData.decades = genresFileData.decades || [];
        genresData.genres = genresFileData.genres || [];
        genresData.classical = (genresFileData.classical && genresFileData.classical.composers) || [];
        
        // Convert countries object to array format
        genresData.countries = Object.keys(genresFileData.countries || {}).map(code => ({
            code: code,
            name: genresFileData.countries[code].name,
            value: `Country:${code}`,
            artists: genresFileData.countries[code].artists
        }));
        
        console.log('📅 Decades found:', genresData.decades);
        console.log('🎵 Genres found:', genresData.genres);
        console.log('🌍 Countries found:', genresData.countries.map(c => c.name));
        
        // Initialize subcategory dropdown with "All Genres"
        updateSubcategoryDropdown();
        
        console.log('✅ Genre-Daten erfolgreich geladen');
        debugLog(`✅ Genres kategorisiert: ${genresData.decades.length} Dekaden, ${genresData.genres.length} Genres, ${genresData.countries.length} Länder`);
    } catch (error) {
        console.error(t('errorLoadingGenres') + ':', error);
        debugLog(`[F1] ❌ Load failed: ${error.message}`, 'F1');
    }
}

// Update subcategory dropdown based on selected category
function updateSubcategoryDropdown() {
    const categorySelect = document.getElementById('categorySelect');
    const subcategorySelect = document.getElementById('subcategorySelect');
    const yearSelect = document.getElementById('yearSelect');
    const yearSelectLabel = document.getElementById('yearSelectLabel');
    
    if (!categorySelect || !subcategorySelect) {
        console.error('Category or subcategory select not found!');
        return;
    }
    
    const category = categorySelect.value;
    subcategorySelect.innerHTML = '';
    
    // Hide year select by default, show only for decades
    if (yearSelect) yearSelect.style.display = 'none';
    if (yearSelectLabel) yearSelectLabel.style.display = 'none';
    
    console.log(`🔄 Updating subcategory for category: ${category}`);
    console.log(`📊 genresData:`, genresData);
    
    if (category === 'all') {
        // All Genres
        const option = document.createElement('option');
        option.value = 'Alle';
        option.setAttribute('data-i18n', 'allGenres');
        option.textContent = translations && currentLanguage ? t('allGenres') : 'All Genres';
        subcategorySelect.appendChild(option);
    } else if (category === 'decades') {
        // Show year select for decades
        if (yearSelect) yearSelect.style.display = 'block';
        if (yearSelectLabel) yearSelectLabel.style.display = 'block';
        // Decades
        console.log(`📅 Loading ${genresData.decades.length} decades...`);
        genresData.decades.forEach(decade => {
            const option = document.createElement('option');
            option.value = decade;
            option.textContent = decade;
            subcategorySelect.appendChild(option);
            console.log(`  ✅ Added decade: ${decade}`);
        });
        // Load available years for the first decade
        setTimeout(() => loadAvailableYears(), 100);
    } else if (category === 'genres') {
        // Regular genres
        console.log(`🎵 Loading ${genresData.genres.length} genres...`);
        genresData.genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            subcategorySelect.appendChild(option);
        });
    } else if (category === 'countries') {
        // Countries
        console.log(`🌍 Loading ${genresData.countries.length} countries...`);
        genresData.countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country.value;
            option.textContent = `🌍 ${country.name}`;
            subcategorySelect.appendChild(option);
        });
    } else if (category === 'classical') {
        // Classical subcategories (Komponist, Oper, Operette, etc.)
        console.log(`🎼 Loading classical subcategories...`);
        const subcategories = [
            { key: 'Komponist', i18nKey: 'classicalKomponist' },
            { key: 'Oper', i18nKey: 'classicalOper' },
            { key: 'Operette', i18nKey: 'classicalOperette' },
            { key: 'Symphonie', i18nKey: 'classicalSymphonie' },
            { key: 'Kammermusik', i18nKey: 'classicalKammermusik' },
            { key: 'Kirchenmusik', i18nKey: 'classicalKirchenmusik' }
        ];
        subcategories.forEach(sub => {
            const option = document.createElement('option');
            option.value = `Classical:${sub.key}`;
            option.textContent = translations && currentLanguage ? t(sub.i18nKey) : sub.key;
            subcategorySelect.appendChild(option);
            console.log(`  ✅ Added classical subcategory: ${sub.key}`);
        });
    } else if (category === 'billboard') {
        // Billboard years
        console.log(`🔥 Loading Billboard years...`);
        loadBillboardYears().then(years => {
            subcategorySelect.innerHTML = '';
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = `Billboard:${year}`;
                option.textContent = year;
                subcategorySelect.appendChild(option);
            });
            console.log(`  ✅ Added ${years.length} Billboard years`);
        }).catch(err => {
            console.error('Error loading Billboard years:', err);
        });
    }
    
    console.log(`✅ Subcategory dropdown updated: ${subcategorySelect.options.length} options`);
}

// Load Billboard years for genre category
async function loadBillboardYears() {
    console.log('🔥 loadBillboardYears() wird aufgerufen...');
    try {
        const cacheBuster = new Date().getTime();
        const response = await fetch(`hot-10-unique.json?v=${cacheBuster}`, { cache: 'no-store' });
        
        if (!response.ok) {
            throw new Error('Fehler beim Laden der Billboard Daten');
        }

        const songs = await response.json();
        
        console.log(`${songs.length} Billboard Songs geladen`);
        
        // Extract unique years from chart_week
        const years = [...new Set(songs.map(song => {
            const year = song.chart_week.substring(0, 4);
            return year;
        }))].sort((a, b) => b - a); // Newest first
        
        console.log('🔥 Gefundene Jahre:', years);
        return years;
    } catch (error) {
        console.error('Fehler beim Laden der Billboard-Jahre:', error);
        return [];
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
        console.error(t('errorLoadingYears') + ':', error);
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
            const statsVersion = document.getElementById('statsVersion');
            if (statsVersion) {
                statsVersion.textContent = `v${data.version}`;
            }
            // Update footer version (only the span to preserve links)
            const versionText = document.getElementById('versionText');
            if (versionText) {
                versionText.textContent = `v${data.version}`;
            }
        }
    } catch (error) {
        console.log('Version konnte nicht geladen werden:', error);
    }
}

// Initialisierung beim Laden der Seite
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        await loadTranslations();
        loadVersion();
        loadAvailableGenres();
        loadAvailableYears();
        loadArtistNames();
        loadAlbumList();
        initializePlayer();
        // Setze Standard auf "Freie Wahl" mit kurzer Verzögerung
        setTimeout(() => {
            const freieWahlBtn = document.querySelector('[data-mode="search"]');
            if (freieWahlBtn) freieWahlBtn.click();
        }, 100);
    });
} else {
    // DOM ist bereits geladen
    (async () => {
        await loadTranslations();
        loadVersion();
        loadAvailableGenres();
        loadAvailableYears();
        loadArtistNames();
        loadAlbumList();
        initializePlayer();
    })();
    loadAlbumList();
    // Setze Standard auf "Freie Wahl" mit kurzer Verzögerung
    setTimeout(() => {
        const freieWahlBtn = document.querySelector('[data-mode="search"]');
        if (freieWahlBtn) freieWahlBtn.click();
    }, 100);
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
            throw new Error(t('errorLoadingArtists'));
        }

        const data = await response.json();
        artistNames = data.famous_song_interpreters || [];
        
        console.log(`${artistNames.length} Künstler für Bubbles geladen`);
    } catch (error) {
        console.error(t('errorLoadingArtists') + ':', error);
    }
}

// Speichere Album- und Artist-Listen
let albumListData = [];
let selectedArtistForAlbums = null; // Tracks selected artist in album mode

// Hilfsfunktion um lokales Album-Cover zu bekommen
function getLocalAlbumCover(albumName) {
    if (!albumName) return null;
    // Generiere Dateiname (gleiche Logik wie im Download-Script)
    const safeName = albumName.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.jpg';
    const localPath = `/covers/${safeName}`;
    return localPath;
}

// Lade Alben aus AlbumList.json
async function loadAlbumList() {
    try {
        const cacheBuster = new Date().getTime();
        const response = await fetch(`AlbumList.json?v=${cacheBuster}`, { cache: 'no-store' });
        
        if (!response.ok) {
            throw new Error('Fehler beim Laden der Alben');
        }

        albumListData = await response.json();
        
        console.log(`${albumListData.length} Alben geladen`);
    } catch (error) {
        console.warn('AlbumList.json konnte nicht geladen werden:', error);
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

// Erstelle eine einzelne Artist Bubble (oder Album Bubble im Album-Modus)
function createArtistBubble() {
    const container = document.getElementById('artistBubblesContainer');
    if (!container || !container.classList.contains('active')) return;
    
    let bubbleText = '';
    let isAlbumBubble = false;
    
    // Two-stage approach for album mode:
    // Stage 1: Show artist bubbles (selectedArtistForAlbums is null)
    // Stage 2: Show album bubbles for selected artist (selectedArtistForAlbums is set)
    if (currentSearchType === 'album' && selectedArtistForAlbums) {
        // Stage 2: Show albums from selected artist
        if (albumListData.length > 0) {
            const artistAlbums = albumListData.filter(album => 
                album.artist.toLowerCase() === selectedArtistForAlbums.toLowerCase()
            );
            if (artistAlbums.length > 0) {
                const randomAlbum = artistAlbums[Math.floor(Math.random() * artistAlbums.length)];
                bubbleText = randomAlbum.album;
                isAlbumBubble = true;
            } else {
                return; // No albums found for this artist
            }
        } else {
            return;
        }
    } else if (artistNames.length > 0) {
        // Stage 1: Show artist bubbles (default for all modes)
        bubbleText = artistNames[Math.floor(Math.random() * artistNames.length)];
    } else {
        return;
    }
    
    // Erstelle Bubble
    const bubble = document.createElement('div');
    bubble.className = 'artist-bubble';
    
    // Füge album-bubble Klasse hinzu wenn wir Albums zeigen
    if (isAlbumBubble) {
        bubble.classList.add('album-bubble');
    }
    
    bubble.textContent = bubbleText;
    
    // Starte immer rechts außerhalb (100%)
    bubble.style.left = '100%';
    
    container.appendChild(bubble);
    activeBubbles++;
    
    // Click Handler
    bubble.onclick = () => {
        const searchInput = document.getElementById('searchQuery');
        
        if (currentSearchType === 'album' && !selectedArtistForAlbums) {
            // Stage 1: Artist bubble clicked in album mode -> select artist and show albums
            selectedArtistForAlbums = bubbleText;
            if (searchInput) {
                searchInput.value = bubbleText;
                searchInput.disabled = true;
            }
            // Restart bubbles to show albums instead of artists
            stopArtistBubbles();
            setTimeout(() => startArtistBubbles(), 100);
        } else if (isAlbumBubble) {
            // Stage 2: Album bubble clicked -> set as final selection
            if (searchInput) {
                searchInput.value = bubbleText;
                searchInput.disabled = false;
                searchInput.focus();
            }
        } else {
            // Normal artist/track search mode
            if (searchInput) {
                searchInput.value = bubbleText;
                searchInput.focus();
            }
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


// Toggle zwischen Genre- und Suchmodus
function selectGameMode(mode) {
    // Entferne active Klasse von allen Buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Füge active Klasse zum gewählten Button hinzu
    document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
    
    // Ändere Body-Klasse für Hintergrundfarbe
    document.body.className = `mode-${mode}`;
    
    const genreSelection = document.getElementById('genreSelection');
    const searchSelection = document.getElementById('searchSelection');
    const subtitle = document.getElementById('gameSubtitle');
    const searchInput = document.getElementById('searchQuery');
    const checkArtistBtn = document.getElementById('checkArtistBtn');

    if (mode === 'genre') {
        genreSelection.style.display = 'flex';
        searchSelection.style.display = 'none';
        stopArtistBubbles();
        if (checkArtistBtn) checkArtistBtn.style.display = 'none';
        // Setze Subtitle zurück
        setSubtitle(t('setupSubtitle'));
    } else {
        genreSelection.style.display = 'none';
        searchSelection.style.display = 'flex';
        
        // Setze currentSearchType basierend auf Modus
        if (mode === 'album') {
            currentSearchType = 'album';
            selectedArtistForAlbums = null; // Reset artist selection
            startArtistBubbles(); // Show artist bubbles in album mode too
            if (searchInput) {
                searchInput.placeholder = "Enter artist name (e.g. 'The Beatles')";
                searchInput.disabled = false;
                searchInput.value = '';
            }
            if (checkArtistBtn) checkArtistBtn.style.display = 'block';
        } else {
            currentSearchType = 'track';
            selectedArtistForAlbums = null; // Reset
            startArtistBubbles(); // Show bubbles for artist/track mode
            if (searchInput) {
                searchInput.placeholder = "e.g. 'Taylor Swift' or 'Bohemian Rhapsody'";
                searchInput.disabled = false;
            }
            if (checkArtistBtn) checkArtistBtn.style.display = 'block'; // Show button in Free Choice mode too
        }
        // Setze Subtitle zurück
        setSubtitle(t('setupSubtitle'));
    }
    
    // Update Leaderboard bei Modus-Wechsel
    showSetupLeaderboard();
}

// Check Artist function for album mode
async function checkArtist() {
    const searchInput = document.getElementById('searchQuery');
    const artistName = searchInput?.value?.trim();
    
    if (!artistName) {
        showError('Please enter an artist name');
        return;
    }
    
    try {
        // Search for artist via iTunes API
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=musicArtist&limit=10`);
        const data = await response.json();
        
        if (!data.results || data.results.length === 0) {
            showError(`No artist found for "${artistName}". Please try a different name.`);
            return;
        }
        
        // Filter for exact or close matches
        const artists = data.results.filter(artist => artist.artistName);
        
        if (artists.length === 0) {
            showError(`No artist found for "${artistName}". Please try a different name.`);
            return;
        }
        
        if (artists.length === 1) {
            // Single artist found - proceed directly
            selectArtistAndLoadAlbums(artists[0]);
        } else {
            // Multiple artists found - show selection modal
            showArtistSelectionModal(artists);
        }
    } catch (error) {
        console.error('Error checking artist:', error);
        showError('Error checking artist. Please try again.');
    }
}

// Show artist selection modal
function showArtistSelectionModal(artists) {
    const modal = document.getElementById('artistSelectionModal');
    const list = document.getElementById('artistSelectionList');
    
    if (!modal || !list) return;
    
    // Clear previous options
    list.innerHTML = '';
    
    // Create radio button options for each artist
    artists.forEach((artist, index) => {
        const option = document.createElement('div');
        option.style.cssText = 'padding: 10px; margin: 5px 0; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; transition: all 0.2s;';
        option.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <input type="radio" name="artistChoice" value="${index}" id="artist_${index}" style="cursor: pointer;">
                <label for="artist_${index}" style="cursor: pointer; flex: 1; margin: 0;">
                    <strong>${artist.artistName}</strong>
                    ${artist.primaryGenreName ? `<br><small style="color: #666;">${artist.primaryGenreName}</small>` : ''}
                </label>
            </div>
        `;
        
        option.onclick = (e) => {
            if (e.target.tagName !== 'INPUT') {
                option.querySelector('input').checked = true;
            }
            selectArtistAndLoadAlbums(artist);
            closeArtistSelectionModal();
        };
        
        list.appendChild(option);
    });
    
    modal.classList.add('show');
}

// Close artist selection modal
function closeArtistSelectionModal() {
    const modal = document.getElementById('artistSelectionModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Select artist and load their albums
async function selectArtistAndLoadAlbums(artist) {
    const searchInput = document.getElementById('searchQuery');
    selectedArtistForAlbums = artist.artistName;
    
    // If in Free Choice mode (track search), just populate the input and return
    if (currentSearchType === 'track') {
        if (searchInput) {
            searchInput.value = `✅ ${artist.artistName}`;
            searchInput.disabled = false;
        }
        return;
    }
    
    // Album mode: fetch and show albums
    if (searchInput) {
        searchInput.value = `✅ ${artist.artistName} - Loading albums...`;
        searchInput.disabled = true;
    }
    
    try {
        // Fetch albums from iTunes API
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artist.artistName)}&entity=album&limit=200`);
        const data = await response.json();
        
        if (!data.results || data.results.length === 0) {
            showError(`No albums found for ${artist.artistName}`);
            if (searchInput) {
                searchInput.value = '';
                searchInput.disabled = false;
            }
            return;
        }
        
        // Filter unique albums by collection ID (prevents duplicates from different regions)
        const uniqueAlbums = [];
        const seen = new Set();
        
        data.results.forEach(item => {
            if (item.collectionId && !seen.has(item.collectionId)) {
                seen.add(item.collectionId);
                uniqueAlbums.push(item);
            }
        });
        
        if (uniqueAlbums.length === 0) {
            showError(`No albums found for ${artist.artistName}`);
            if (searchInput) {
                searchInput.value = '';
                searchInput.disabled = false;
            }
            return;
        }
        
        // Update search input
        if (searchInput) {
            searchInput.value = `✅ ${artist.artistName}`;
            searchInput.disabled = false;
        }
        
        // Show album selection modal with cover art
        showAlbumSelectionModal(artist.artistName, uniqueAlbums);
        
    } catch (error) {
        console.error('Error loading albums:', error);
        showError('Error loading albums. Please try again.');
        if (searchInput) {
            searchInput.value = '';
            searchInput.disabled = false;
        }
    }
}

// Global variable to store all albums for filtering
let allAlbumsForModal = [];
let currentArtistName = '';

// Show album selection modal with cover art
function showAlbumSelectionModal(artistName, albums) {
    const modal = document.getElementById('albumSelectionModal');
    const header = document.getElementById('albumSelectionHeader');
    const grid = document.getElementById('albumSelectionGrid');
    
    if (!modal || !header || !grid) return;
    
    // Store albums and artist name for filtering
    allAlbumsForModal = albums;
    currentArtistName = artistName;
    
    // Set header with artist name
    header.textContent = `💿 Select Album by ${artistName}`;
    
    // Reset filter buttons
    const filterBoth = document.getElementById('filterBoth');
    const filterPrimary = document.getElementById('filterPrimary');
    const filterSampler = document.getElementById('filterSampler');
    if (filterBoth) filterBoth.classList.add('active');
    if (filterPrimary) filterPrimary.classList.remove('active');
    if (filterSampler) filterSampler.classList.remove('active');
    
    // Display all albums initially
    displayFilteredAlbums(albums);
    
    // Show modal
    modal.classList.add('show');
}

// Truncate text to max 12 words (less than 13 words)
function truncateToMaxWords(text, maxWords = 12) {
    const words = text.split(' ');
    if (words.length > maxWords) {
        return words.slice(0, maxWords).join(' ') + '...';
    }
    return text;
}

// Display filtered albums in grid
function displayFilteredAlbums(albums) {
    const grid = document.getElementById('albumSelectionGrid');
    const countDisplay = document.getElementById('albumCount');
    
    if (!grid) return;
    
    // Clear previous albums
    grid.innerHTML = '';
    
    // Update count display
    if (countDisplay) {
        countDisplay.textContent = `${albums.length} album${albums.length !== 1 ? 's' : ''}`;
    }
    
    if (albums.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: #666;">No albums found for this filter</div>';
        return;
    }
    
    // Create album cards with cover art
    albums.forEach(album => {
        const card = document.createElement('div');
        const isPrimary = isAlbumPrimary(album, currentArtistName);
        const borderColor = isPrimary ? '#667eea' : '#ff9f1c';
        
        card.style.cssText = `cursor: pointer; border: 2px solid ${borderColor}; border-radius: 8px; overflow: hidden; transition: all 0.2s; background: white; position: relative;`;
        
        const coverUrl = album.artworkUrl100 || album.artworkUrl60 || '';
        const coverUrlHiRes = coverUrl.replace('100x100', '300x300').replace('60x60', '300x300');
        const albumNameTruncated = truncateToMaxWords(album.collectionName);
        
        const badge = isPrimary ? '' : '<div style="position: absolute; top: 4px; right: 4px; background: rgba(255, 159, 28, 0.9); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.65em; font-weight: 700;">COMP</div>';
        
        card.innerHTML = `
            ${badge}
            <img src="${coverUrlHiRes}" alt="${album.collectionName}" style="width: 100%; height: auto; display: block;" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\'%3E%3Crect fill=\'%23667eea\' width=\'100\' height=\'100\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' font-size=\'40\' fill=\'white\'%3E💿%3C/text%3E%3C/svg%3E'">
            <div style="padding: 8px; font-size: 0.75em; text-align: center; font-weight: 600; line-height: 1.2; min-height: 50px; display: flex; align-items: center; justify-content: center;" title="${album.collectionName}">
                ${albumNameTruncated}
            </div>
        `;
        
        card.onmouseover = () => {
            card.style.borderColor = isPrimary ? '#764ba2' : '#f857a6';
            card.style.transform = 'scale(1.05)';
            card.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
        };
        
        card.onmouseout = () => {
            card.style.borderColor = borderColor;
            card.style.transform = 'scale(1)';
            card.style.boxShadow = 'none';
        };
        
        card.onclick = () => {
            selectAlbumAndStartGame(album.collectionName);
        };
        
        grid.appendChild(card);
    });
}

// Check if album is primary (artist is the main album artist) or compilation
function isAlbumPrimary(album, artistName) {
    const collectionArtist = (album.collectionArtistName || album.artistName || '').toLowerCase().trim();
    const searchArtist = artistName.toLowerCase().trim();
    const collectionType = (album.collectionType || '').toLowerCase();
    const wrapperType = (album.wrapperType || '').toLowerCase();
    
    // Check if it's marked as compilation
    if (collectionType === 'compilation' || wrapperType === 'compilation') return false;
    
    // Check if collection artist is "Various Artists" or compilation-related
    if (collectionArtist.includes('various') || 
        collectionArtist.includes('compilation') ||
        collectionArtist.includes('sampler')) return false;
    
    // Check for exact match or very close match (artist name is the collection artist)
    // Use exact match or "starts with" to avoid false positives
    return collectionArtist === searchArtist || 
           collectionArtist.startsWith(searchArtist) ||
           searchArtist.startsWith(collectionArtist);
}

// Filter albums based on type
function filterAlbums(filterType) {
    // Update button states
    const filterBoth = document.getElementById('filterBoth');
    const filterPrimary = document.getElementById('filterPrimary');
    const filterSampler = document.getElementById('filterSampler');
    
    if (filterBoth) filterBoth.classList.remove('active');
    if (filterPrimary) filterPrimary.classList.remove('active');
    if (filterSampler) filterSampler.classList.remove('active');
    
    if (filterType === 'both' && filterBoth) filterBoth.classList.add('active');
    if (filterType === 'primary' && filterPrimary) filterPrimary.classList.add('active');
    if (filterType === 'sampler' && filterSampler) filterSampler.classList.add('active');
    
    // Filter albums
    let filteredAlbums = allAlbumsForModal;
    
    if (filterType === 'primary') {
        filteredAlbums = allAlbumsForModal.filter(album => isAlbumPrimary(album, currentArtistName));
    } else if (filterType === 'sampler') {
        filteredAlbums = allAlbumsForModal.filter(album => !isAlbumPrimary(album, currentArtistName));
    }
    
    // Display filtered albums
    displayFilteredAlbums(filteredAlbums);
}

// Close album selection modal
function closeAlbumSelectionModal() {
    const modal = document.getElementById('albumSelectionModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Select album and prepare to start game
function selectAlbumAndStartGame(albumName) {
    const searchInput = document.getElementById('searchQuery');
    if (searchInput) {
        searchInput.value = albumName;
        searchInput.disabled = false;
    }
    
    // Close modal
    closeAlbumSelectionModal();
    
    // Scroll to start button or highlight it
    const startBtn = document.querySelector('.start-game-btn');
    if (startBtn) {
        startBtn.style.animation = 'pulse-highlight 1s ease-out';
        startBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => {
            startBtn.style.animation = '';
        }, 1000);
    }
}

// Subtitle synchron halten (Header + Stats)
function setSubtitle(text) {
    const subtitle = document.getElementById('gameSubtitle');
    if (subtitle) subtitle.textContent = text;
    const statsSubtitle = document.getElementById('statsSubtitle');
    if (statsSubtitle) statsSubtitle.textContent = text;
}

// Toggle zwischen Künstler/Titel und Album Suche
function toggleSearchType() {
    const btn = document.getElementById('searchTypeBtn');
    if (currentSearchType === 'track') {
        currentSearchType = 'album';
        btn.textContent = '💿 Album';
        btn.classList.add('active');
        document.getElementById('searchQuery').placeholder = "e.g. 'Kuschelrock 5' or 'Abbey Road'";
    } else {
        currentSearchType = 'track';
        btn.textContent = '🎤 Artist/Titel';
        btn.classList.remove('active');
        document.getElementById('searchQuery').placeholder = "e.g. 'Taylor Swift' or 'Bohemian Rhapsody'";
    }
}

// Starte das Spiel
async function startGame() {
    // Finde den aktiven Mode-Button statt Radio-Button
    const activeButton = document.querySelector('.mode-btn.active');
    const gameMode = activeButton ? activeButton.dataset.mode : 'search'; // Default zu 'search'
    const songCount = parseInt(document.getElementById('songCount').value);

    // State speichern (previewDuration wird während des Spiels per Button gewählt)
    gameState.previewDuration = 5; // Standard-Wert, wird beim Klicken auf Duration-Button überschrieben
    gameState.currentQuestion = 0;
    gameState.correctAnswers = 0;
    gameState.wrongAnswers = 0;
    gameState.totalPoints = 0;
    // currentGameMode wird nach Subtitle-Set pro Modus gesetzt

    // Blende Game-Over-Zustand aus (Footer wieder sichtbar)
    document.body.classList.remove('game-over-active');

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
            const selectedGenre = document.getElementById('subcategorySelect').value;
            
            // Check if it's a Billboard selection
            if (selectedGenre.startsWith('Billboard:')) {
                const year = selectedGenre.replace('Billboard:', '');
                await loadSongsFromBillboard(year, songCount);
                // Update Subtitle
                const subtitleText = `🔥 Billboard Charts aus ${year}`;
                setSubtitle(subtitleText);
                gameState.currentGameMode = subtitleText;
            } else {
                await loadSongsFromGenre(selectedGenre, songCount);
                // Update Subtitle
                const genreText = selectedGenre === 'Alle' ? 'Alle Genres' : selectedGenre;
                const subtitleText = `Genre: ${genreText}`;
                setSubtitle(subtitleText);
                gameState.currentGameMode = subtitleText;
            }
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
            setSubtitle(subtitleText);
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
        // Handle Classical genre (subcategory selection like Classical:Oper, Classical:Komponist, etc.)
        if (genre === 'Classical' || genre.startsWith('Classical:')) {
            const cacheBuster = Date.now();
            const response = await fetch(`genres.json?v=${cacheBuster}`, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(t('errorLoadingClassicalList'));
            }
            const genresFile = await response.json();
            const classicalData = genresFile.classical || {};
            
            // Determine which subcategory was selected
            const selectedSubcategory = genre.startsWith('Classical:') ? genre.replace('Classical:', '') : null;
            
            if (!selectedSubcategory) {
                throw new Error(t('errorLoadingClassicalList'));
            }

            // Get artists from the selected subcategory
            const artists = classicalData[selectedSubcategory] || [];
            
            if (!artists.length) {
                throw new Error(t('errorLoadingClassicalList'));
            }

            // Randomly select artists and search their works on iTunes
            const selectedArtists = artists.sort(() => 0.5 - Math.random()).slice(0, Math.max(limit, 10));
            const searchPromises = selectedArtists.map(async (artist) => {
                try {
                    // Search with multiple country fallbacks for better results
                    const { results } = await fetchItunesWithFallback(artist, ['DE', 'US', 'GB', 'AT'], 5);
                    return results && results.length ? results[0] : null;
                } catch (err) {
                    console.warn(`Failed to load artist ${artist}:`, err);
                    return null;
                }
            });
            const results = await Promise.all(searchPromises);
            const mapped = results
                .filter(song => song && song.previewUrl && song.trackName && song.artistName)
                .map(song => {
                    const originalCover = song.artworkUrl600 || song.artworkUrl100 || song.artworkUrl60 || '';
                    const highResCover = originalCover ? originalCover.replace(/\d+x\d+bb(-\d+)?\.(jpg|png)/, '600x600bb.$2') : '';
                    return {
                        id: song.trackId,
                        track: song.trackName,
                        artist: song.artistName,
                        album: song.collectionName || 'Unbekannt',
                        previewUrl: (song.previewUrl || '').replace(/^http:/, 'https:'),
                        image: highResCover,
                        genre: `Classical:${selectedSubcategory}`
                    };
                })
                .slice(0, limit);

            if (!mapped.length) {
                throw new Error(t('errorLoadingClassicalList'));
            }

            gameState.songs = mapped;
            return;
        }
        
        // Handle Country-based genres
        if (genre.startsWith('Country:')) {
            const countryCode = genre.replace('Country:', '');
            const cacheBuster = Date.now();
            const response = await fetch(`genres.json?v=${cacheBuster}`, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(t('errorLoadingCountryList'));
            }
            const genresFile = await response.json();
            const countryInfo = genresFile.countries?.[countryCode];
            const artists = countryInfo?.artists || [];
            
            if (artists.length === 0) {
                throw new Error(t('errorNoArtistsForCountry'));
            }
            
            // Randomly select artists from country and search their songs
            const selectedArtists = artists.sort(() => 0.5 - Math.random()).slice(0, limit);
            const searchPromises = selectedArtists.map(async (artist) => {
                try {
                    // Try country first, then fallback to DE/US/GB
                    const { results } = await fetchItunesWithFallback(artist, [countryCode.toUpperCase(), 'DE', 'US', 'GB'], 5);
                    return results && results.length ? results[0] : null;
                } catch (err) {
                    console.warn(`Failed to load artist ${artist}:`, err);
                    return null;
                }
            });
            const results = await Promise.all(searchPromises);
            const mapped = results
                .filter(song => song && song.previewUrl && song.trackName && song.artistName)
                .map(song => {
                    const originalCover = song.artworkUrl600 || song.artworkUrl100 || song.artworkUrl60 || '';
                    const highResCover = originalCover ? originalCover.replace(/\d+x\d+bb(-\d+)?\.(jpg|png)/, '600x600bb.$2') : '';
                    return {
                        id: song.trackId,
                        track: song.trackName,
                        artist: song.artistName,
                        album: song.collectionName || 'Unbekannt',
                        previewUrl: (song.previewUrl || '').replace(/^http:/, 'https:'),
                        image: highResCover,
                        genre: `Country:${countryCode}`
                    };
                });
            gameState.songs = mapped;
            
            if (gameState.songs.length === 0) {
                throw new Error(t('errorNoSongsForCountry'));
            }
            return;
        }
        
        // Lade songs.json for regular genres
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

async function fetchItunes(searchTerm, { limit = 10, country = 'DE', entity = 'song', attribute = '', useLookup = false } = {}) {
    let url;
    
    if (useLookup) {
        // Lookup API für Album-Songs (collectionId)
        url = `https://itunes.apple.com/lookup?id=${searchTerm}&entity=${entity}&limit=${limit}&country=${country}`;
        debugLog(`🔍 iTunes Lookup ${country}: ID ${searchTerm}`);
    } else {
        // Search API
        const encodedQuery = encodeURIComponent(searchTerm);
        const attributeParam = attribute ? `&attribute=${attribute}` : '';
        url = `https://itunes.apple.com/search?term=${encodedQuery}&entity=${entity}&limit=${limit}&media=music&country=${country}&lang=de_DE${attributeParam}`;
        debugLog(`🔍 iTunes ${country}: "${searchTerm}"`);
    }
    
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
    console.log(`iTunes ${useLookup ? 'Lookup' : 'Suche'} ${country} für "${searchTerm}": ${data.results.length} Ergebnisse`);
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
        
        // Nutze hochauflösendes Cover (600x600)
        const originalCover = song.artworkUrl600 || song.artworkUrl100 || song.artworkUrl60 || '';
        const highResCover = originalCover ? originalCover.replace(/\d+x\d+bb(-\d+)?\.(jpg|png)/, '600x600bb.$2') : '';
        
        debugLog(`✅ Song geladen: "${song.trackName}" (${usedCountry})`);
        return {
            id: song.trackId,
            track: song.trackName,
            artist: song.artistName,
            album: song.collectionName || 'Unbekannt',
            previewUrl: safePreview,
            image: highResCover,
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
        let albumArtwork = null;  // Speichere das Album-Cover
        
        if (currentSearchType === 'album') {
            // Album-Suche: Suche zuerst das Album selbst, dann alle Songs von diesem Album
            try {
                // Schritt 1: Suche das Album
                const albumResults = await fetchItunes(searchQuery, { limit: 10, country: 'DE', entity: 'album' });
                
                // Finde das beste Match für die Suchanfrage
                let bestMatch = null;
                if (albumResults.length > 0) {
                    const normalizedQuery = searchQuery.toLowerCase().trim();
                    
                    // 1. Priorität: Exaktes Match
                    bestMatch = albumResults.find(album => 
                        album.collectionName && album.collectionName.toLowerCase() === normalizedQuery
                    );
                    
                    // 2. Priorität: Album beginnt mit Suchbegriff
                    if (!bestMatch) {
                        bestMatch = albumResults.find(album => 
                            album.collectionName && album.collectionName.toLowerCase().startsWith(normalizedQuery)
                        );
                    }
                    
                    // 3. Priorität: Kürzestes Album das Suchbegriff enthält (vermeidet Compilations)
                    if (!bestMatch) {
                        const matches = albumResults.filter(album => 
                            album.collectionName && album.collectionName.toLowerCase().includes(normalizedQuery)
                        );
                        if (matches.length > 0) {
                            bestMatch = matches.reduce((shortest, current) => 
                                current.collectionName.length < shortest.collectionName.length ? current : shortest
                            );
                        }
                    }
                    
                    // 4. Fallback: erstes Ergebnis
                    if (!bestMatch) {
                        bestMatch = albumResults[0];
                    }
                }
                
                if (!bestMatch) {
                    console.warn('DE-Album nicht gefunden, versuche US:');
                    const usAlbumResults = await fetchItunes(searchQuery, { limit: 10, country: 'US', entity: 'album' });
                    if (usAlbumResults.length > 0) {
                        const normalizedQuery = searchQuery.toLowerCase().trim();
                        
                        bestMatch = usAlbumResults.find(album => 
                            album.collectionName && album.collectionName.toLowerCase() === normalizedQuery
                        );
                        
                        if (!bestMatch) {
                            bestMatch = usAlbumResults.find(album => 
                                album.collectionName && album.collectionName.toLowerCase().startsWith(normalizedQuery)
                            );
                        }
                        
                        if (!bestMatch) {
                            const matches = usAlbumResults.filter(album => 
                                album.collectionName && album.collectionName.toLowerCase().includes(normalizedQuery)
                            );
                            if (matches.length > 0) {
                                bestMatch = matches.reduce((shortest, current) => 
                                    current.collectionName.length < shortest.collectionName.length ? current : shortest
                                );
                            }
                        }
                        
                        if (!bestMatch) {
                            bestMatch = usAlbumResults[0];
                        }
                        
                        const albumId = bestMatch.collectionId;
                        const coverUrl = bestMatch.artworkUrl100 || '';
                        albumArtwork = coverUrl.replace(/\d+x\d+bb(-\d+)?\.(jpg|png)/, '600x600bb.$2');
                        console.log('Album Cover URL (US):', albumArtwork, 'für:', bestMatch.collectionName);
                        results = await fetchItunes(albumId, { limit: 300, country: 'US', entity: 'song', useLookup: true });
                        results = results.filter(item => item.wrapperType === 'track');
                    } else {
                        console.log('Versuche Album+Artist Fallback für:', searchQuery);
                        const albumArtistResults = await fetchItunes(searchQuery, { limit: 50, country: 'US', entity: 'album', attribute: 'albumTerm' });
                        if (albumArtistResults.length > 0) {
                            const normalizedQuery = searchQuery.toLowerCase().trim();
                            
                            bestMatch = albumArtistResults.find(album => 
                                album.collectionName && album.collectionName.toLowerCase() === normalizedQuery
                            );
                            
                            if (!bestMatch) {
                                bestMatch = albumArtistResults.find(album => 
                                    album.collectionName && album.collectionName.toLowerCase().startsWith(normalizedQuery)
                                );
                            }
                            
                            if (!bestMatch) {
                                const matches = albumArtistResults.filter(album => 
                                    album.collectionName && album.collectionName.toLowerCase().includes(normalizedQuery)
                                );
                                if (matches.length > 0) {
                                    bestMatch = matches.reduce((shortest, current) => 
                                        current.collectionName.length < shortest.collectionName.length ? current : shortest
                                    );
                                }
                            }
                            
                            if (!bestMatch) {
                                bestMatch = albumArtistResults[0];
                            }
                            
                            const albumId = bestMatch.collectionId;
                            const coverUrl = bestMatch.artworkUrl100 || '';
                            albumArtwork = coverUrl.replace(/\d+x\d+bb(-\d+)?\.(jpg|png)/, '600x600bb.$2');
                            console.log('Album Cover URL (Fallback):', albumArtwork, 'für:', bestMatch.collectionName);
                            results = await fetchItunes(albumId, { limit: 300, country: 'US', entity: 'song', useLookup: true });
                            results = results.filter(item => item.wrapperType === 'track');
                        }
                    }
                } else {
                    const albumId = bestMatch.collectionId;
                    const coverUrl = bestMatch.artworkUrl100 || '';
                    albumArtwork = coverUrl.replace(/\d+x\d+bb(-\d+)?\.(jpg|png)/, '600x600bb.$2');
                    console.log('Album Cover URL (DE):', albumArtwork, 'für:', bestMatch.collectionName);
                    results = await fetchItunes(albumId, { limit: 300, country: 'DE', entity: 'song', useLookup: true });
                    results = results.filter(item => item.wrapperType === 'track');
                }
            } catch (err) {
                console.warn('Album-Suche fehlgeschlagen:', err);
                try {
                    results = await fetchItunes(searchQuery, { limit: 200, country: 'US', entity: 'song', attribute: 'albumTerm' });
                } catch (err2) {
                    console.error('Album-Fallback fehlgeschlagen:', err2);
                }
            }
        } else {
            // Standard Künstler/Titel Suche
            try {
                results = await fetchItunes(searchQuery, { limit: 50, country: 'DE' });
            } catch (errDe) {
                console.warn('DE-Suche fehlgeschlagen (Suchmodus), versuche US:', errDe);
                results = await fetchItunes(searchQuery, { limit: 50, country: 'US' });
            }
        }

        // Im Album-Modus: Stelle sicher dass albumArtwork gesetzt ist BEVOR wir die Songs mappen
        if (currentSearchType === 'album' && !albumArtwork && results.length > 0) {
            // Nutze das erste Ergebnis um das Album-Cover zu bestimmen
            const firstSong = results[0];
            if (firstSong.collectionName) {
                // Versuche lokales Cover
                const localCover = getLocalAlbumCover(firstSong.collectionName);
                if (localCover) {
                    albumArtwork = localCover;
                    console.log('✅ Lokales Album-Cover gesetzt:', albumArtwork);
                } else {
                    // Nutze iTunes Cover in hoher Auflösung
                    const iCover = firstSong.artworkUrl600 || firstSong.artworkUrl100 || firstSong.artworkUrl60;
                    albumArtwork = iCover ? iCover.replace(/\d+x\d+bb(-\d+)?\.(jpg|png)/, '600x600bb.$2') : iCover;
                    console.log('✅ iTunes Album-Cover gesetzt:', albumArtwork);
                }
            }
        }
        
        // Debug: Zeige albumArtwork Status
        if (currentSearchType === 'album') {
            console.log(`📀 Album-Modus: albumArtwork = ${albumArtwork || 'NULL'}`);
        }

        const songs = results
            .filter(song => 
                song.previewUrl && 
                song.trackName && 
                song.artistName && 
                song.collectionName
            )
            .slice(0, limit)
            .map((song, index) => {
                // Bestimme Cover-URL
                let coverUrl = null;
                
                if (currentSearchType === 'album') {
                    // Im Album-Modus: nutze das bereits gesetzte albumArtwork für ALLE Songs
                    coverUrl = albumArtwork;
                    console.log(`🎵 Song ${index + 1}: ${song.trackName} - Cover: ${coverUrl ? 'SET' : 'NULL'}`);
                } else {
                    // Bei normaler Suche: individuelles Song-Cover in hoher Auflösung
                    const originalCover = song.artworkUrl600 || song.artworkUrl100 || song.artworkUrl60;
                    coverUrl = originalCover ? originalCover.replace(/\d+x\d+bb(-\d+)?\.(jpg|png)/, '600x600bb.$2') : originalCover;
                }
                
                return {
                    id: song.trackId,
                    track: song.trackName,
                    artist: song.artistName,
                    album: song.collectionName,
                    previewUrl: (song.previewUrl || '').replace(/^http:/, 'https:'),
                    image: coverUrl,
                    genre: song.primaryGenreName || 'Unbekannt'
                };
            });

        gameState.songs = shuffleArray(songs);
        console.log(`${gameState.songs.length} Songs geladen aus: ${currentSearchType === 'album' ? 'Album' : 'Künstler/Titel'}`);
        
        // Aktualisiere Subtitle im Album-Modus
        if (currentSearchType === 'album' && songs.length > 0) {
            const albumName = songs[0].album;
            const artistName = songs[0].artist;
            setSubtitle(`Album '${albumName}' von '${artistName}'`);
        }
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
    gameState.firstPlayDone = false; // WICHTIG: Reset für nächsten Song
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
                
                // WICHTIG: Bewahre das ursprüngliche Cover (besonders wichtig im Album-Modus!)
                if (candidate.image) {
                    fullSongData.image = candidate.image;
                    console.log('🖼️ Album-Cover vom Original übernommen:', candidate.image);
                }
                
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
    const container = document.querySelector('.container');
    const song = gameState.currentSong;

    if (song.image) {
        albumCover.innerHTML = `<img src="${song.image}" alt="Album Cover" onerror="this.parentElement.innerHTML='<div class=&quot;cover-placeholder&quot;></div>'">`;
    } else {
        albumCover.innerHTML = '<div class="cover-placeholder"></div>';
    }

    // Enable fullscreen cover by default
    if (!container.classList.contains('cover-filled') && song.image) {
        container.classList.add('cover-filled');
    }
    applyContainerCoverBackground(song.image);
    
    // Click-to-Zoom Funktionalität
    albumCover.removeEventListener('click', toggleAlbumZoom);
    albumCover.addEventListener('click', toggleAlbumZoom);
}

// Toggle Funktion für Album Cover Zoom
function toggleAlbumZoom(e) {
    const container = document.querySelector('.container');
    const song = gameState.currentSong;
    if (!container || !song || !song.image) return;

    const shouldFill = !container.classList.contains('cover-filled');
    container.classList.toggle('cover-filled', shouldFill);
    applyContainerCoverBackground(shouldFill ? song.image : null);
}

// Setzt oder entfernt das Cover als Hintergrund der weißen Box
function applyContainerCoverBackground(imageUrl) {
    const container = document.querySelector('.container');
    if (!container) return;

    const isActive = container.classList.contains('cover-filled');
    if (isActive && imageUrl) {
        container.style.backgroundImage = `linear-gradient(rgba(255,255,255,0.5), rgba(255,255,255,0.5)), url("${imageUrl}")`;
        container.style.backgroundSize = 'cover';
        container.style.backgroundPosition = 'center';
    } else {
        container.style.backgroundImage = '';
        container.style.backgroundSize = '';
        container.style.backgroundPosition = '';
        container.classList.remove('cover-filled');
    }
}

// Zeige Antworten an
function displayAnswers() {
    try {
        const song = gameState.currentSong;
        
        if (!song || !song.track) {
            console.error('Song oder song.track ist undefined:', song);
            document.getElementById('answersContainer').innerHTML = `<p style="color: red;">${t('errorSongDataMissing')}</p>`;
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
        
        // Nutze aktiven Countdown (falls vorhanden), ansonsten Basiswert abhängig vom Modus
        const countdownActive = gameState.pointsCountdownActive;
        const countdownPoints = countdownActive ? Math.max(0, Math.round(gameState.pointsCountdownValue)) : null;
        const basePoints = gameState.currentPlayedReverse ? 2200 : 2000;
        const awardedPoints = countdownPoints !== null ? countdownPoints : basePoints;

        gameState.totalPoints += awardedPoints;
        
        // Stempel auf gewählter Antwort
        if (selectedBtn) {
            selectedBtn.dataset.stamp = `+${awardedPoints}`;
            selectedBtn.classList.add('stamp', 'stamp-correct');
        }

        const resultMsg = document.getElementById('resultMessage');
        resultMsg.textContent = `${t('answerCorrect')} +${awardedPoints} ${t('points')}`;
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
        resultMsg.textContent = t('answerWrong');
        resultMsg.classList.remove('correct');
        resultMsg.classList.add('incorrect');
        resultMsg.style.fontSize = '1.3em';
        resultMsg.style.animation = 'shake 0.5s ease-out';
    }

    // Stoppe Countdown-Animation aber verstecke die Box NICHT - zeige Punkte für 3 Sekunden
    if (gameState.pointsCountdownActive) {
        if (gameState.pointsCountdownTimer) {
            cancelAnimationFrame(gameState.pointsCountdownTimer);
            gameState.pointsCountdownTimer = null;
        }
        gameState.pointsCountdownActive = false;
    }

    // Zeige Song-Infos
    showSongInfo();

    // Zeige nächste Frage Button (deaktiviert während 3s Wartezeit)
    const nextBtn = document.getElementById('nextBtn');
    nextBtn.classList.add('show');
    nextBtn.disabled = true;
    updateStats();

    // Automatisch zur nächsten Frage nach 3 Sekunden
    setTimeout(() => {
        // Verstecke Punkte-Countdown Box bevor nächste Frage geladen wird
        const container = document.getElementById('pointsCountdown');
        if (container) {
            container.classList.remove('show');
        }
        nextBtn.disabled = false;
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
    // Countdown ist führend; wenn nicht aktiv, nimm Basiswert je nach Richtung
    const countdownActive = gameState.pointsCountdownActive;
    const countdownPoints = countdownActive ? Math.max(0, Math.round(gameState.pointsCountdownValue)) : null;
    const basePoints = gameState.currentPlayedReverse ? 2200 : 2000;
    const points = countdownPoints !== null ? countdownPoints : basePoints;
    return Math.max(0, Math.round(points));
}

// Finale Punkte: Durchschnitt pro Frage
function calculateFinalScore() {
    const answeredQuestions = (gameState.correctAnswers || 0) + (gameState.wrongAnswers || 0);
    if (answeredQuestions === 0) return 0;
    return Math.round(gameState.totalPoints / answeredQuestions);
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

// Wendet eine fixe Straf-Punktzahl auf den laufenden Countdown an (z.B. bei erneutem Abspielen)
function applyReplayPenalty(penalty = 300) {
    const penaltyValue = Math.max(0, Math.round(penalty));
    const basePoints = gameState.currentPlayedReverse ? 2200 : 2000;

    // Falls kein Countdown aktiv ist, neu starten
    if (!gameState.pointsCountdownActive) {
        startPointsCountdown(basePoints);
    }

    const valueEl = document.getElementById('pointsCountdownValue');
    const barEl = document.getElementById('pointsCountdownBar');
    const initial = gameState.pointsCountdownInitial || basePoints;
    const currentPoints = Math.max(0, Math.round(gameState.pointsCountdownValue ?? initial));
    const effectiveInitial = Math.max(initial, basePoints);
    const newPoints = Math.max(0, currentPoints - penaltyValue);
    const totalDurationMs = 60000;

    // Passe Startzeit an, damit der lineare Verlauf zur neuen Punktzahl passt
    const pointsLost = effectiveInitial - newPoints;
    const newProgress = Math.min(1, pointsLost / effectiveInitial);
    const newElapsed = newProgress * totalDurationMs;

    gameState.pointsCountdownInitial = effectiveInitial;
    gameState.pointsCountdownStartTime = performance.now() - newElapsed;
    gameState.pointsCountdownValue = newPoints;
    gameState.pointsCountdownActive = true;

    if (valueEl) valueEl.textContent = newPoints;
    if (barEl) barEl.style.width = `${(1 - newProgress) * 100}%`;

    // Sicherstellen, dass der Timer läuft
    if (!gameState.pointsCountdownTimer) {
        const tick = (now) => {
            if (!gameState.pointsCountdownActive) return;
            const elapsed = now - gameState.pointsCountdownStartTime;
            const prog = Math.min(1, elapsed / totalDurationMs);
            const cur = Math.max(0, Math.round(gameState.pointsCountdownInitial * (1 - prog)));
            gameState.pointsCountdownValue = cur;
            if (valueEl) valueEl.textContent = cur;
            if (barEl) barEl.style.width = `${(1 - prog) * 100}%`;
            if (prog < 1) {
                gameState.pointsCountdownTimer = requestAnimationFrame(tick);
            } else {
                stopPointsCountdown(false);
            }
        };
        gameState.pointsCountdownTimer = requestAnimationFrame(tick);
    }

    console.log(`Replay penalty: -${penaltyValue} Punkte (${currentPoints} → ${newPoints})`);
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
        
        // Aufsteigender fröhlicher Akkord - LAUTER und LÄNGER
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
            gainNode.gain.linearRampToValueAtTime(0.35, startTime + 0.02); // 0.35 statt 0.15
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5); // 0.5 statt 0.3
            
            oscillator.start(startTime);
            oscillator.stop(startTime + 0.5);
        });
    } catch (err) {
        console.log('Correct sound error:', err);
    }
}

// Spiele "Falsch" Sound ab
function playWrongSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Zwei absteigendi Buzzer für mehr Deutlichkeit
        // Erster Buzzer
        const oscillator1 = audioContext.createOscillator();
        const gainNode1 = audioContext.createGain();
        
        oscillator1.connect(gainNode1);
        gainNode1.connect(audioContext.destination);
        
        oscillator1.type = 'sawtooth';
        oscillator1.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator1.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.4);
        
        gainNode1.gain.setValueAtTime(0.35, audioContext.currentTime); // 0.35 statt 0.2
        gainNode1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        
        oscillator1.start(audioContext.currentTime);
        oscillator1.stop(audioContext.currentTime + 0.4);
        
        // Zweiter Buzzer (nach kurzer Pause)
        const oscillator2 = audioContext.createOscillator();
        const gainNode2 = audioContext.createGain();
        
        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);
        
        oscillator2.type = 'sawtooth';
        oscillator2.frequency.setValueAtTime(300, audioContext.currentTime + 0.25);
        oscillator2.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.65);
        
        gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime + 0.25);
        gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.65);
        
        oscillator2.start(audioContext.currentTime + 0.25);
        oscillator2.stop(audioContext.currentTime + 0.65);
    } catch (err) {
        console.log('Wrong sound error:', err);
    }
}

// Entfernt: playPreviewWithDuration - nicht mehr benötigt

// Staccato-Modus entfernt

// Spiele Preview ab (iOS-kompatibel)
function playPreview() {
    if (!gameState.currentSong) {
        debugLog('❌ Kein Song geladen', 'F8');
        alert(`[F8] ${t('errorNoSongLoaded')} ${gameState.lastError ? t('errorLastError') + ' ' + gameState.lastError : ''} ${t('errorLoadingNextQuestion')}`);
        nextQuestion();
        return;
    }
    
    if (!gameState.currentSong.previewUrl) {
        alert(t('errorNoPreview'));
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
        applyReplayPenalty(300);
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
        alert('[F7] ' + t('errorPlayback'));
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

    // Reverse-Modus: Punkte-Countdown/Strafen handhaben
    gameState.previewFinished = false;
    if (gameState.firstPlayDone && !gameState.isAnswered) {
        // Erneutes Reverse: -300 Punkte Abzug aus dem laufenden Countdown
        applyReplayPenalty(300);
    } else if (!gameState.firstPlayDone && !gameState.isAnswered) {
        // Erstes Abspielen im Reverse: Countdown von 2200 starten (+200 Bonus)
        gameState.firstPlayDone = true;
        startPointsCountdown(2200);
    }

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
        
        alert(t('errorReversePlayback'));
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
    const answeredQuestions = (gameState.correctAnswers || 0) + (gameState.wrongAnswers || 0);
    const totalEl = document.getElementById('totalProgress');
    if (totalEl) {
        totalEl.textContent = `${displayedQuestion} ${t('questionsProgress')} ${totalQuestions} ${t('questions')}`;
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
        const avgPoints = answeredQuestions > 0 ? Math.round(gameState.totalPoints / answeredQuestions) : 0;
        pointsEl.textContent = avgPoints;
    }
}

// Spiel beenden
function endGame() {
    stopPointsCountdown();

    const total = gameState.correctAnswers + gameState.wrongAnswers;
    const percentage = total > 0 ? Math.round((gameState.correctAnswers / total) * 100) : 0;
    const finalScore = calculateFinalScore();

    // Markiere Game-Over-Zustand, damit Footer ausgeblendet wird
    document.body.classList.add('game-over-active');

    // Remove cover background when showing game over screen
    const container = document.querySelector('.container');
    if (container) {
        container.classList.remove('cover-filled');
        container.style.backgroundImage = '';
        container.style.backgroundSize = '';
        container.style.backgroundPosition = '';
    }

    document.getElementById('quizScreen').style.display = 'none';
    document.getElementById('gameOverScreen').classList.add('show');
    document.getElementById('finalScore').textContent = `${gameState.correctAnswers}/${total}`;
    document.getElementById('scorePercentage').textContent = `${percentage}%`;
    document.getElementById('finalPoints').textContent = `🏆 ${finalScore} ${t('points')}`;

    // Display high score message
    const highScoreMessageEl = document.getElementById('highScoreMessage');
    if (total < 10) {
        highScoreMessageEl.innerHTML = `${t('minQuestionsRequired')}<br/><small style="font-size: 0.9em; font-weight: 500;">${t('scoreNotSaved')}</small>`;
        highScoreMessageEl.style.color = '#ff9800';
    } else {
        highScoreMessageEl.innerHTML = `${t('scoreSavedSuccess')}<br/><small style="font-size: 0.9em; font-weight: 500;">${t('scoreInLeaderboard')}</small>`;
        highScoreMessageEl.style.color = '#2e7d32';
    }

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

// Initialize player name from localStorage
function initializePlayer() {
    let playerId = localStorage.getItem('playerId');
    if (!playerId) {
        playerId = generateUUID();
        localStorage.setItem('playerId', playerId);
    }
    
    const playerName = localStorage.getItem('playerName') || 'Anon';
    updatePlayerNameDisplay(playerName);
}

// Update Player-Name Button im Header
function updatePlayerNameDisplay(name) {
    const playerId = getOrCreatePlayerID();
    const shortId = playerId.substring(0, 4).toUpperCase();
    const country = localStorage.getItem('playerCountry') || '🌍';
    const displayName = `👤 ${name} ${country} #${shortId}`;
    
    const btn = document.getElementById('playerNameBtn');
    if (btn) {
        btn.textContent = displayName;
    }
    const statsBtn = document.getElementById('statsPlayerNameBtn');
    if (statsBtn) {
        statsBtn.textContent = displayName;
    }
}

// Öffne Player-Name Modal
function openPlayerNameModal() {
    const modal = document.getElementById('playerNameModal');
    const input = document.getElementById('playerNameInput');
    const currentName = localStorage.getItem('playerName') || 'Anon';
    const playerId = getOrCreatePlayerID();
    const shortId = playerId.substring(0, 4).toUpperCase();
    
    if (currentName !== 'Anon') {
        input.value = currentName;
    }
    
    // Show player ID info
    const idInfo = document.getElementById('playerIdInfo');
    const idDisplay = document.getElementById('playerIdDisplay');
    if (idInfo && idDisplay) {
        idDisplay.textContent = `${currentName} #${shortId}`;
        idInfo.style.display = 'block';
    }
    
    input.focus();
    modal.classList.add('show');
}

// Copy player ID to clipboard
function copyPlayerIdToClipboard() {
    const idDisplay = document.getElementById('playerIdDisplay');
    if (idDisplay) {
        const text = idDisplay.textContent;
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById('copyIdBtn');
            const originalText = btn.textContent;
            btn.textContent = '✓ Copied';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        });
    }
}

// Open Restore Player ID modal
function openRestoreIdModal() {
    const modal = document.getElementById('restoreIdModal');
    if (modal) {
        modal.classList.add('show');
    }
}

// Close Restore Player ID modal
function closeRestoreIdModal() {
    const modal = document.getElementById('restoreIdModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Restore player ID and name
function restorePlayerIdAndName() {
    const input = document.getElementById('restoreIdInput');
    const restoreString = input.value.trim();
    
    if (!restoreString) {
        alert('Please paste your player ID');
        return;
    }
    
    // Parse restore string: "Gerald 🇦🇹 #a3f2"
    // Extract name and short ID
    const parts = restoreString.split('#');
    if (parts.length !== 2) {
        alert('Invalid format. Use: Name Country #ID');
        return;
    }
    
    const namePart = parts[0].trim();
    const idPart = parts[1].trim();
    
    if (!namePart || !idPart) {
        alert('Invalid format. Use: Name Country #ID');
        return;
    }
    
    // Extract name (remove country emoji and extra spaces)
    // Split by whitespace, remove any emoji, and rejoin
    const words = namePart.split(/\s+/);
    // Filter out words that are only emoji or special characters
    const name = words.filter(word => /[a-zA-Z0-9]/.test(word)).join(' ').trim();
    
    if (!name || name.length < 2) {
        alert('Invalid player name');
        return;
    }
    
    // Store the name and short ID (for reference)
    localStorage.setItem('playerName', name);
    localStorage.setItem('playerIdShort', idPart);
    
    updatePlayerNameDisplay(name);
    closeRestoreIdModal();
    closePlayerNameModal();
    
    alert('Player ID restored successfully!');
}

// Schließe Player-Name Modal
function closePlayerNameModal() {
    const modal = document.getElementById('playerNameModal');
    modal.classList.remove('show');
}

// Open Legal/About Modal
function openLegalModal() {
    const modal = document.getElementById('legalModal');
    if (modal) {
        modal.classList.add('show');
    }
}

// Close Legal/About Modal
function closeLegalModal() {
    const modal = document.getElementById('legalModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Speichere Player-Name (ohne Uniqueness-Check - Hybrid-System mit Land + ID)
function savePlayerName() {
    const input = document.getElementById('playerNameInput');
    const name = input.value.trim();
    
    if (!name || name.length < 2) {
        alert(t('playerNameTooShort'));
        return;
    }
    
    localStorage.setItem('playerName', name);
    updatePlayerNameDisplay(name);
    closePlayerNameModal();
}

// Neuer Spieler: Lösche localStorage und erstelle neue ID
function startNewPlayer() {
    if (confirm(t('newPlayerConfirm'))) {
        localStorage.removeItem('playerId');
        localStorage.removeItem('playerName');
        const newId = generateUUID();
        localStorage.setItem('playerId', newId);
        localStorage.setItem('playerName', 'Anon');
        updatePlayerNameDisplay('Anon');
        console.log('Neuer Spieler gestartet. ID:', newId);
        alert(t('newPlayerCreated'));
        openPlayerNameModal();
    }
}

// Öffne Player-Suche Modal
async function openPlayerSearchModal() {
    const modal = document.getElementById('playerSearchModal');
    const resultsDiv = document.getElementById('playerSearchResults');
    const playerName = localStorage.getItem('playerName') || 'Anon';
    
    if (!modal || !resultsDiv) return;
    
    resultsDiv.innerHTML = `<p style="text-align: center; color: #999;">${t('searchingScores')}</p>`;
    modal.classList.add('show');
    
    try {
        // Lade ALL scores für globales Ranking
        const response = await fetch('/api/all-scores');
        const data = await response.json();
        const allScores = data.scores || [];
        
        console.log('Total scores loaded:', allScores.length);
        console.log('Searching for playerName:', playerName);
        console.log('Sample score usernames:', allScores.slice(0, 5).map(s => s.username));
        
        // Filtere Player-Scores
        const playerScores = allScores.filter(score => score.username === playerName);
        
        console.log('Player scores found:', playerScores.length);
        
        if (!playerScores || playerScores.length === 0) {
            resultsDiv.innerHTML = `<p style="text-align: center; color: #666;">${t('noScoresFound')}</p>`;
            return;
        }
        
        // Sortiere Player-Scores nach Punkte (absteigend)
        const sorted = playerScores.sort((a, b) => {
            const ap = (a.points ?? a.totalPoints ?? 0);
            const bp = (b.points ?? b.totalPoints ?? 0);
            return bp - ap;
        });
        
        // Rendera HTML mit globalem Ranking
        const html = sorted.map((score) => {
            const points = score.points ?? score.totalPoints ?? 0;
            const modeLabel = score.gameMode || 'Modus';
            const date = score.timestamp ? new Date(score.timestamp).toLocaleDateString() : 'Unbekannt';
            const country = score.country || '🌍';
            const shortId = (score.userId || score.playerId || '').substring(0, 4).toUpperCase();
            const playerDisplay = shortId ? `${score.username} ${country} #${shortId}` : score.username;
            
            // Finde globale Position (alle Scores mit höheren Punkten + 1)
            const globalRank = allScores.filter(s => (s.points ?? s.totalPoints ?? 0) > points).length + 1;
            
            return `
                <div class="leaderboard-modal-item" style="background: rgba(102, 126, 234, 0.1); border-radius: 8px; padding: 12px; margin-bottom: 8px; border-bottom: 1px solid #e0e0e0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <strong style="color: #667eea;">#${globalRank}</strong>
                        <span style="font-weight: bold; color: #764ba2;">🏆 ${points} Pkt</span>
                    </div>
                    <div style="font-size: 0.9em; color: #555; margin-bottom: 4px;">${playerDisplay}</div>
                    <div style="font-size: 0.85em; color: #999;">${modeLabel} • ${date}</div>
                </div>
            `;
        }).join('');
        
        resultsDiv.innerHTML = `<div style="text-align: center; color: #667eea; margin-bottom: 12px; font-weight: bold;">${sorted.length} ${t('entriesFound')}</div>` + html;
    } catch (error) {
        console.error('Error searching player scores:', error);
        resultsDiv.innerHTML = '<p style="text-align: center; color: #d32f2f;">Fehler beim Laden der Scores.</p>';
    }
}

// Schließe Player-Suche Modal
function closePlayerSearchModal() {
    const modal = document.getElementById('playerSearchModal');
    if (modal) {
        modal.classList.remove('show');
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
        const country = score.country || '🌍';
        const shortId = (score.userId || score.playerId || '').substring(0, 4).toUpperCase();
        const playerDisplay = shortId ? `${score.username} ${country} #${shortId}` : score.username;
        return `
            <span class="ticker-item">
                <span class="leaderboard-rank">#${idx + 1}</span>
                <span class="leaderboard-name">${playerDisplay}</span>
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
                const date = score.timestamp ? new Date(score.timestamp).toLocaleDateString() : '';
                const country = score.country || '🌍';
                const shortId = (score.userId || score.playerId || '').substring(0, 4).toUpperCase();
                const playerDisplay = shortId ? `${score.username} ${country} #${shortId}` : score.username;
                return `
                    <li class="leaderboard-modal-item">
                        <span class="leaderboard-modal-rank">#${idx + 1}</span>
                        <div>
                            <div class="leaderboard-modal-name">${playerDisplay}</div>
                            <div class="leaderboard-modal-meta">${modeLabel}${date ? ' • ' + date : ''}</div>
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
    const html = scores.slice(0, 3).map((score, index) => {
        const country = score.country || '🌍';
        const shortId = (score.userId || score.playerId || '').substring(0, 4).toUpperCase();
        const playerDisplay = shortId ? `${score.username} ${country} #${shortId}` : score.username;
        return `
        <div class="leaderboard-item">
            <span class="leaderboard-rank">#${index + 1}</span>
            <span class="leaderboard-name">${playerDisplay}</span>
            <span class="leaderboard-points">🏆 ${score.totalPoints}</span>
        </div>
    `}).join('');
    
    listDiv.innerHTML = html;
    leaderboardDiv.classList.add('show');
}

// Speichere Score nach Spielende
async function saveGameScore() {
    const playerName = localStorage.getItem('playerName') || 'Anon';
    const playerId = getOrCreatePlayerID();
    const gameMode = gameState.currentGameMode || 'Genre';
    const answeredQuestions = (gameState.correctAnswers || 0) + (gameState.wrongAnswers || 0);
    const correctAnswers = gameState.correctAnswers || 0;
    const finalScore = calculateFinalScore();
    
    // Only save if more than 9 questions were answered
    if (answeredQuestions <= 9) {
        console.log('⚠️ Score nicht gespeichert: Weniger als 10 Fragen beantwortet');
        return false;
    }
    
    console.log('💾 Speichere Score:', {
        playerName,
        playerId,
        gameMode,
        points: finalScore,
        totalQuestions: answeredQuestions,
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
                totalQuestions: answeredQuestions,
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
    // Load saved font size
    loadFontSize();
});

// Font size control functions
function increaseFontSize() {
    const root = document.documentElement;
    const currentSize = getComputedStyle(root).getPropertyValue('--base-font-size').trim();
    const numSize = parseFloat(currentSize);
    const newSize = numSize + 1;
    root.style.setProperty('--base-font-size', `${newSize}px`);
    localStorage.setItem('fontSize', newSize);
    console.log('Font size increased to:', newSize);
}

function decreaseFontSize() {
    const root = document.documentElement;
    const currentSize = getComputedStyle(root).getPropertyValue('--base-font-size').trim();
    const numSize = parseFloat(currentSize);
    const newSize = Math.max(12, numSize - 1); // Minimum 12px
    root.style.setProperty('--base-font-size', `${newSize}px`);
    localStorage.setItem('fontSize', newSize);
    console.log('Font size decreased to:', newSize);
}

function loadFontSize() {
    const savedSize = localStorage.getItem('fontSize');
    if (savedSize) {
        document.documentElement.style.setProperty('--base-font-size', `${savedSize}px`);
        console.log('Font size loaded from storage:', savedSize);
    } else {
        // Initialize with default 18px
        document.documentElement.style.setProperty('--base-font-size', '18px');
    }
}
