const APP_VERSION = '17.01.2026 07:15';
window.APP_VERSION = APP_VERSION;

// English strings (no more translation system)
const strings = {
    setupSubtitle: 'Select your game mode and start playing!',
    errorLoadingGenres: 'Error loading genres',
    errorLoadingYears: 'Error loading years',
    errorLoadingArtists: 'Error loading artists',
    errorLoadingClassicalList: 'Error loading classical composers list',
    errorLoadingCountryList: 'Error loading country list',
    errorNoArtistsForCountry: 'No artists found for this country',
    errorNoSongsForCountry: 'No songs found for this country',
    errorSongDataMissing: 'Error: Song data not available',
    errorNoSongLoaded: 'No song loaded.',
    errorLastError: 'Last error:',
    errorLoadingNextQuestion: 'Loading next question...',
    errorNoPreview: 'Unfortunately, no preview is available for this song. Skipping...',
    errorPlayback: 'Playback error. Please tap Play again or skip the song.',
    errorReversePlayback: 'Could not play reverse preview.',
    errorNotEnoughSongs: 'Not enough songs available! {0} found, but {1} needed. Please select a smaller number.',
    answerCorrect: '✅ Correct!',
    answerWrong: '❌ Wrong!',
    points: 'Points',
    questionsProgress: 'of',
    questions: 'Questions',
    allGenres: 'All Genres',
    minQuestionsRequired: '⚠️ At least 10 questions required',
    scoreNotSaved: 'Your score was not saved',
    scoreSavedSuccess: '✅ Score saved successfully!',
    scoreInLeaderboard: 'You made it to the leaderboard'
};

// Helper function to get strings
function t(key) {
    return strings[key] || key;
}

let sharedAudioCtx = null;
function getSharedAudioContext() {
    try {
        if (!sharedAudioCtx) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            sharedAudioCtx = new Ctx();
        }
        if (sharedAudioCtx.state === 'suspended') {
            sharedAudioCtx.resume().catch(err => console.warn('Failed to resume AudioContext:', err));
        }
    } catch (e) {
        console.warn('Web Audio API not supported or context creation failed:', e);
    }
    return sharedAudioCtx;
}

function unlockAudio() {
    console.log('Interacting - attempting to unlock audio');
    
    // Unlock HTML5 Audio element
    const audio = document.getElementById('audioPlayer');
    if (audio) {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                audio.pause();
                console.log('HTML5 Audio unlocked successfully');
            }).catch(err => {
                console.log('HTML5 Audio unlock info:', err);
            });
        }
    }

    // Unlock Web Audio API context
    const ctx = getSharedAudioContext();
    if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => {
            console.log('Web Audio Context unlocked successfully');
        }).catch(err => {
            console.log('Web Audio Context unlock info:', err);
        });
    }

    // Remove event listeners once unlock action is triggered
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
}
window.addEventListener('click', unlockAudio);
window.addEventListener('touchstart', unlockAudio);

// Play winning sound effect
function playWinSound() {
    // Create a simple winning chime using Web Audio API
    try {
        const audioContext = getSharedAudioContext();
        if (!audioContext) return;
        const notes = [
            { freq: 523.25, duration: 0.1 }, // C5
            { freq: 659.25, duration: 0.1 }, // E5
            { freq: 783.99, duration: 0.3 }  // G5
        ];

        let time = audioContext.currentTime;
        setDifficultyMeta(gameState.songs.length, results.length, currentSearchType === 'album' ? 'Album search' : 'Artist search');
        notes.forEach(note => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();

            osc.connect(gain);
            gain.connect(audioContext.destination);

            osc.frequency.value = note.freq;
            osc.type = 'sine';

            gain.gain.setValueAtTime(0.3, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + note.duration);

            osc.start(time);
            osc.stop(time + note.duration);

            time += note.duration;
        });
    } catch (e) {
        console.log('Audio context not available, skipping win sound');
    }
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
    questionCount: 0,
    candidatePoolSize: 0,
    difficultyRatio: 0,
    difficultyLabel: '',
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
    fadeOutInterval: null, // Interval for audio fade-out
};

// Classical/Opera mappings (generated)
let mappingComposers = null;
let mappingOperas = null;
let mappingOperettas = null;
let mappingActive = false; // when true, bubbles represent mapping keys (works/composers)
let mappingType = null; // 'composer' | 'opera' | 'operetta'


// Store genres, decades, and countries for two-tier dropdown
let genresData = {
    decades: [],
    genres: [],
    countries: [],
    classical: []
};

// Composer -> performer/hint mapping for classical/opera searches
let classicalPerformersMap = {};

// Composer name mapping for abbreviations to full names
const composerNameMapping = {
    'Bach': 'Johann Sebastian Bach',
    'Handel': 'George Frideric Handel',
    'Vivaldi': 'Antonio Vivaldi',
    'Mozart': 'Wolfgang Amadeus Mozart',
    'Haydn': 'Joseph Haydn',
    'Beethoven': 'Ludwig van Beethoven',
    'Schubert': 'Franz Schubert',
    'Brahms': 'Johannes Brahms',
    'Schumann': 'Robert Schumann',
    'Mendelssohn': 'Felix Mendelssohn',
    'Chopin': 'Frédéric Chopin',
    'Liszt': 'Franz Liszt',
    'Wagner': 'Richard Wagner',
    'Verdi': 'Giuseppe Verdi',
    'Puccini': 'Giacomo Puccini',
    'Bizet': 'Georges Bizet',
    'Rossini': 'Gioachino Rossini',
    'Donizetti': 'Gaetano Donizetti',
    'Bellini': 'Vincenzo Bellini',
    'Offenbach': 'Jacques Offenbach',
    'Strauss': 'Johann Strauss II',
    'Lehar': 'Franz Lehár',
    'Kalman': 'Emmerich Kálmán',
    'Suppe': 'Franz von Suppé',
    'Millecker': 'Carl Millöcker',
    // Composers without performer data - just map to themselves
    'Pachelbel': 'Pachelbel',
    'Tomaso Albinoni': 'Tomaso Albinoni',
    'Albinoni': 'Tomaso Albinoni',
    'Gilbert Sullivan': 'Gilbert Sullivan',
    'Sullivan': 'Gilbert Sullivan',
    'Benatzky': 'Benatzky',
    'Audran': 'Edmond Audran'
};

// Curated classical works loaded from JSON (per sub area)
let classicalWorks = {};

// Lade verfügbare Genres beim Seitenstart
async function loadAvailableGenres() {
    debugLog('🔄 Lade Genres...');
    try {
        // Load consolidated genres.json
        const cacheBuster = new Date().getTime();
        const genresResponse = await fetch(`json/genres.json?v=${cacheBuster}`, { cache: 'no-store' });

        if (!genresResponse.ok) {
            throw new Error(t('errorLoadingGenres'));
        }

        const genresFileData = await genresResponse.json();

        // Populate genresData from consolidated file
        genresData.decades = genresFileData.decades || [];
        genresData.genres = genresFileData.genres || [];
        genresData.classical = genresFileData.classical || {};

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

        // Load classical performer map
        await loadClassicalPerformers();
        // Load curated classical works per sub area
        await loadClassicalWorks();
        // Load generated mappings if available
        await loadClassicalMappings();

        // Initialize dedicated classical dropdowns
        populateClassicalAreaDropdown();
        handleClassicalAreaChange();

        // Initialize subcategory dropdown with "All Genres"
        updateSubcategoryDropdown();

        console.log('✅ Genre-Daten erfolgreich geladen');
        debugLog(`✅ Genres kategorisiert: ${genresData.decades.length} Dekaden, ${genresData.genres.length} Genres, ${genresData.countries.length} Länder`);
    } catch (error) {
        console.error(t('errorLoadingGenres') + ':', error);
        debugLog(`[F1] ❌ Load failed: ${error.message}`, 'F1');
    }
}

// Load composer -> performer map for classical/opera searches
async function loadClassicalPerformers() {
    const cacheBuster = new Date().getTime();
    try {
        const response = await fetch(`json/classical-performers.json?v=${cacheBuster}`, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error('Failed to load classical performer map');
        }
        const data = await response.json();
        classicalPerformersMap = {};
        Object.keys(data).forEach(name => {
            classicalPerformersMap[name.toLowerCase()] = data[name];
        });
        console.log(`🎼 Classical performer map loaded: ${Object.keys(classicalPerformersMap).length} composers`);
    } catch (error) {
        classicalPerformersMap = {};
        console.warn('⚠️ Could not load classical performer map:', error.message);
    }
}

// Load curated classical works per sub area
async function loadClassicalWorks() {
    const cacheBuster = new Date().getTime();
    try {
        const response = await fetch(`json/classical-works.json?v=${cacheBuster}`, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error('Failed to load classical works list');
        }
        classicalWorks = await response.json();
        console.log('🎼 Classical works loaded:', Object.keys(classicalWorks));
    } catch (error) {
        classicalWorks = {};
        console.warn('⚠️ Could not load classical works:', error.message);
    }
}

// Load generated composers/operas/operettas mappings
async function loadClassicalMappings() {
    const cacheBuster = new Date().getTime();
    try {
        const base = 'json/mappings';
        const [cRes, oRes, opRes] = await Promise.all([
            fetch(`${base}/composers.json?v=${cacheBuster}`, { cache: 'no-store' }),
            fetch(`${base}/operas.json?v=${cacheBuster}`, { cache: 'no-store' }),
            fetch(`${base}/operettas.json?v=${cacheBuster}`, { cache: 'no-store' })
        ]);

        if (cRes.ok) mappingComposers = await cRes.json(); else mappingComposers = null;
        if (oRes.ok) mappingOperas = await oRes.json(); else mappingOperas = null;
        if (opRes.ok) mappingOperettas = await opRes.json(); else mappingOperettas = null;

        console.log('📚 Classical mappings loaded:', {
            composers: mappingComposers ? Object.keys(mappingComposers).length : 0,
            operas: mappingOperas ? Object.keys(mappingOperas).length : 0,
            operettas: mappingOperettas ? Object.keys(mappingOperettas).length : 0
        });
    } catch (err) {
        mappingComposers = mappingOperas = mappingOperettas = null;
        console.warn('⚠️ Could not load classical mappings:', err.message);
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

    if (category === 'all') {
        const option = document.createElement('option');
        option.value = 'All';
        option.textContent = 'All Genres';
        subcategorySelect.appendChild(option);
    } else if (category === 'decades') {
        // Populate decades
        genresData.decades.forEach(decade => {
            const option = document.createElement('option');
            option.value = decade;
            option.textContent = decade;
            subcategorySelect.appendChild(option);
        });
        // On decade change, update artist bubbles
        subcategorySelect.onchange = () => {
            const val = subcategorySelect.value;
            if (val) updateDecadeArtists(val);
        };
        if (subcategorySelect.options.length > 0) {
            // Initialize with first decade
            setTimeout(() => updateDecadeArtists(subcategorySelect.options[0].value), 50);
        }
    } else if (category === 'genres') {
        genresData.genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            subcategorySelect.appendChild(option);
        });
    } else if (category === 'countries') {
        genresData.countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country.value;
            option.textContent = `🌍 ${country.name}`;
            subcategorySelect.appendChild(option);
        });
    } else if (category === 'classical') {
        const classicalKeys = Object.keys(genresData.classical || {});
        classicalKeys.forEach(key => {
            const option = document.createElement('option');
            option.value = `Classical:${key}`;
            option.textContent = key;
            subcategorySelect.appendChild(option);
        });
    } else if (category === 'billboard') {
        loadBillboardYears().then(years => {
            subcategorySelect.innerHTML = '';
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = `Billboard:${year}`;
                option.textContent = year;
                subcategorySelect.appendChild(option);
            });
        }).catch(err => console.error('Error loading Billboard years:', err));
    }

    console.log(`✅ Subcategory dropdown updated: ${subcategorySelect.options.length} options`);
}

// Change bubble visualization style
function changeBubbleStyle() {
    // Only spheres style available - function kept for compatibility
}

// Populate dedicated classical area dropdown (new mode)
function populateClassicalAreaDropdown() {
    const areaSelect = document.getElementById('classicalAreaSelect');
    if (!areaSelect) return;

    const classicalOrder = ['Baroque', 'Classical', 'Romantic', 'Modern', 'Komponist', 'Oper', 'Operette', 'Symphonie', 'Kammermusik', 'Kirchenmusik'];
    const availableKeys = Object.keys(genresData.classical || {});
    const orderedKeys = classicalOrder.filter(key => availableKeys.includes(key)).concat(availableKeys.filter(key => !classicalOrder.includes(key)));

    areaSelect.innerHTML = '<option value="">Select a sub area...</option>';
    orderedKeys.forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = key;
        areaSelect.appendChild(option);
    });
}

// React to classical area changes (show/hide work selector)
// Handle classical work selection to show interpreters
function handleClassicalWorkChange() {
    const areaSelect = document.getElementById('classicalAreaSelect');
    const workSelect = document.getElementById('classicalWorkSelect');
    const performerGroup = document.getElementById('classicalPerformerGroup');
    const performerSelect = document.getElementById('classicalPerformerSelect');
    
    console.log('🎭 handleClassicalWorkChange called');
    console.log('performerGroup:', performerGroup, 'performerSelect:', performerSelect);
    
    if (!performerGroup || !performerSelect) {
        console.warn('❌ Missing DOM elements for performer dropdown');
        return;
    }
    
    const selectedWork = workSelect ? workSelect.value : '';
    const selectedArea = areaSelect ? areaSelect.value : '';
    
    console.log('Selected work:', selectedWork, 'Selected area:', selectedArea);
    
    // Clear previous selections
    performerSelect.innerHTML = '<option value="">Select an interpreter...</option>';
    
    if (!selectedWork) {
        performerGroup.style.display = 'none';
        console.log('No work selected, hiding performer group');
        return;
    }
    
    // Get composers for the selected work from classical works data
    const areaData = classicalWorks[selectedArea] || {};
    const worksForArea = areaData.works || areaData || [];
    
    console.log('Works for area:', worksForArea.length, 'entries');
    
    let composerName = '';
    let composerAbbrev = '';
    for (const work of worksForArea) {
        const title = typeof work === 'string' ? work : (work.title || '');
        if (title === selectedWork) {
            composerName = typeof work === 'string' ? '' : (work.composer || '');
            composerAbbrev = composerName;
            console.log('Found work:', title, 'with composer:', composerName);
            break;
        }
    }
    
    // For operas, try to get performers directly from mapping
    if (selectedArea === 'Oper' && mappingOperas && mappingOperas[selectedWork]) {
        console.log('Checking opera mapping for:', selectedWork);
        const opRecordings = mappingOperas[selectedWork] || [];
        if (opRecordings.length > 0) {
            // Show performers directly from opera mapping
            const performerSet = new Set();
            opRecordings.forEach(rec => {
                if (rec && rec.artist) {
                    performerSet.add(rec.artist);
                }
            });
            const performers = Array.from(performerSet).sort();
            if (performers.length > 0) {
                console.log('Found performers for opera:', performers);
                performers.forEach(perf => {
                    const option = document.createElement('option');
                    option.value = perf;
                    option.textContent = perf;
                    performerSelect.appendChild(option);
                });
                performerGroup.style.display = 'block';
                return;
            }
        }
    }
    
    // For classical works, search for composer in classicalPerformersMap
    // Try both full name and abbreviated name
    let performersData = null;
    let composerFullName = composerName;
    
    console.log('classicalPerformersMap has', Object.keys(classicalPerformersMap).length, 'entries');
    console.log('Sample keys:', Object.keys(classicalPerformersMap).slice(0, 3));
    
    if (composerName && classicalPerformersMap) {
        // Try exact match first (check both original case and lowercase)
        if (classicalPerformersMap[composerName]) {
            performersData = classicalPerformersMap[composerName];
            console.log('✅ Found exact match for composer:', composerName);
        } else if (classicalPerformersMap[composerName.toLowerCase()]) {
            performersData = classicalPerformersMap[composerName.toLowerCase()];
            console.log('✅ Found lowercase match for composer:', composerName);
        } else if (composerNameMapping[composerName]) {
            // Try mapping from abbreviation to full name
            composerFullName = composerNameMapping[composerName];
            const composerKey = composerFullName.toLowerCase();
            console.log('Trying mapping:', composerName, '→', composerFullName, '(key:', composerKey + ')');
            if (classicalPerformersMap[composerKey]) {
                performersData = classicalPerformersMap[composerKey];
                console.log('✅ Found composer by name mapping:', composerName, '→', composerFullName);
            } else {
                console.log('❌ Composer not found even after mapping:', composerFullName);
            }
        } else {
            console.log('❌ No mapping found for:', composerName);
        }
    }
    
    if (performersData) {
        const preferredPerformers = performersData.preferredPerformers || [];
        console.log('Performer data found, performers count:', preferredPerformers.length);
        
        if (preferredPerformers.length > 0) {
            console.log('Adding performers:', preferredPerformers);
            preferredPerformers.forEach(perf => {
                const option = document.createElement('option');
                option.value = perf;
                option.textContent = perf;
                performerSelect.appendChild(option);
            });
            performerGroup.style.display = 'block';
            console.log('✅ Performer group displayed');
            console.log('DOM check - performerSelect innerHTML:', performerSelect.innerHTML.substring(0, 200));
            console.log('performerGroup element:', performerGroup);
            console.log('classicalWorkGroup display:', document.getElementById('classicalWorkGroup').style.display);
        } else {
            console.log('No performers in performer data');
            performerGroup.style.display = 'none';
        }
    } else {
        console.log('❌ No performer data found');
        performerGroup.style.display = 'none';
    }
}

// Handle classical area selection
function handleClassicalAreaChange() {
    const areaSelect = document.getElementById('classicalAreaSelect');
    const workGroup = document.getElementById('classicalWorkGroup');
    const workSelect = document.getElementById('classicalWorkSelect');
    const performerGroup = document.getElementById('classicalPerformerGroup');
    const performerSelect = document.getElementById('classicalPerformerSelect');
    const area = areaSelect ? areaSelect.value : '';

    if (!workGroup) return;

    // Reset performers when area changes
    if (performerGroup) {
        performerGroup.style.display = 'none';
    }
    if (performerSelect) {
        performerSelect.innerHTML = '<option value="">Select an interpreter...</option>';
    }

    const areaData = classicalWorks[area] || {};
    const worksForArea = areaData.works || areaData || [];
    const hasWorks = worksForArea && worksForArea.length > 0;

    if (hasWorks || area === 'Oper' || area === 'Operette') {
        populateClassicalWorkDropdown(area);
    } else {
        workGroup.style.display = 'none';
        if (workSelect) {
            workSelect.innerHTML = '<option value="">Select a work...</option>';
        }
    }
}

// Populate opera/operetta dropdowns using mapping data
async function populateClassicalWorkDropdown(area) {
    const workGroup = document.getElementById('classicalWorkGroup');
    const workSelect = document.getElementById('classicalWorkSelect');
    const performerGroup = document.getElementById('classicalPerformerGroup');
    if (!workGroup || !workSelect) return;

    workSelect.innerHTML = '<option value="">Select a work...</option>';
    if (performerGroup) {
        performerGroup.style.display = 'none';
        const performerSelect = document.getElementById('classicalPerformerSelect');
        if (performerSelect) {
            performerSelect.innerHTML = '<option value="">Select an interpreter...</option>';
        }
    }

    const areaData = classicalWorks[area] || {};
    const worksForArea = areaData.works || areaData || [];

    // Use curated works list from JSON for every sub area
    if (worksForArea && worksForArea.length > 0) {
        worksForArea.forEach(item => {
            const option = document.createElement('option');
            // Handle both old format (string) and new format (object with title/composer)
            const title = typeof item === 'string' ? item : (item.title || '');
            option.value = title;
            option.textContent = title;
            option.dataset.composer = typeof item === 'string' ? '' : (item.composer || '');
            workSelect.appendChild(option);
        });
        workGroup.style.display = 'block';
        return;
    }

    // Fallback for Opera using mappings with previews
    try {
        if (area === 'Oper' && !mappingOperas) {
            await loadClassicalMappings();
        }
    } catch (err) {
        console.warn('Could not load classical mappings for dropdown:', err.message);
    }

    const mapping = mappingOperas;
    if (!mapping) {
        workGroup.style.display = 'none';
        return;
    }

    const workNames = Object.keys(mapping)
        .filter(name => {
            const recs = mapping[name] || [];
            return recs.some(rec => rec && rec.previewUrl);
        })
        .sort((a, b) => a.localeCompare(b));

    workNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        workSelect.appendChild(option);
    });

    workGroup.style.display = workNames.length ? 'block' : 'none';
}

// Load Billboard years for genre category
async function loadBillboardYears() {
    console.log('🔥 loadBillboardYears() wird aufgerufen...');
    try {
        const cacheBuster = new Date().getTime();
        const response = await fetch(`json/hot-10-unique.json?v=${cacheBuster}`, { cache: 'no-store' });

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
        const response = await fetch(`json/hot-10-unique.json?v=${cacheBuster}`, { cache: 'no-store' });

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
        const response = await fetch(`json/hot-10-unique.json?v=${cacheBuster}`, { cache: 'no-store' });

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
        const response = await fetch('json/version.json');
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
            // Set default graphics style to spheres
            const graphicsSelect = document.getElementById('graphicsSelect');
            if (graphicsSelect) graphicsSelect.value = 'spheres';
        }, 100);
    });
} else {
    // DOM ist bereits geladen
    (async () => {
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
let artistNamesRemaining = []; // Track which artists haven't been shown yet
let artistNamesPromise = null;
let bubbleInterval = null;
let activeBubbles = 0;
let currentBubbleCategory = 'All Artists';

// Lade Künstlernamen aus ArtistsList.json
async function loadArtistNames() {
    if (artistNames.length > 0) return artistNames;
    if (artistNamesPromise) return artistNamesPromise;
    artistNamesPromise = (async () => {
        try {
            const cacheBuster = new Date().getTime();
            const response = await fetch(`json/ArtistsList.json?v=${cacheBuster}`, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(t('errorLoadingArtists'));
            }
            const data = await response.json();
            artistNames = data.famous_song_interpreters || [];
            currentBubbleCategory = 'All Artists';
            console.log(`${artistNames.length} Künstler für Bubbles geladen`);
            return artistNames;
        } catch (error) {
            console.error(t('errorLoadingArtists') + ':', error);
            return [];
        }
    })();
    return artistNamesPromise;
}

// Speichere Album- und Artist-Listen
let albumListData = [];
let selectedArtistForAlbums = null; // Tracks selected artist in album mode
let selectedAlbumName = null; // Tracks selected album in album mode

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
        const response = await fetch(`json/AlbumList.json?v=${cacheBuster}`, { cache: 'no-store' });

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
async function startArtistBubbles() {
    const container = document.getElementById('artistBubblesContainer');
    if (!container) {
        console.warn('Cannot start bubbles: container exists:', !!container, 'artistNames:', artistNames.length);
        return;
    }

    // Ensure artists are loaded
    if (artistNames.length === 0) {
        await loadArtistNames();
    }
    if (artistNames.length === 0) {
        console.warn('Cannot start bubbles: artistNames still empty after load');
        return;
    }

    console.log(`🫧 Starting bubbles with ${artistNames.length} artists`);
    container.classList.add('active');
    activeBubbles = 0;

    // Initialize the remaining artists pool (shuffled)
    artistNamesRemaining = shuffleArray([...artistNames]);

    // Update subtitle with bubble category
    setSubtitle(`🫧 Bubbles: ${currentBubbleCategory}`);

    // Stoppe vorherige Animation
    if (bubbleInterval) {
        clearInterval(bubbleInterval);
    }
    container.innerHTML = '';

    // Erstelle kontinuierlich neue Bubbles
    // Intervall für größeren Abstand zwischen Bubbles
    bubbleInterval = setInterval(() => {
        // Call async function without awaiting (fire and forget)
        createArtistBubble().catch(err => {
            console.error('Bubble creation error:', err);
            // Continue trying even if one fails
        });
    }, 2000);

    // Erstelle erste Bubble sofort
    createArtistBubble().catch(err => console.error('Bubble creation error:', err));
}

// Update artist list based on selected decade (loads artists from songs.json)
async function updateDecadeArtists(decade) {
    try {
        const cacheBuster = new Date().getTime();
        const resp = await fetch(`json/songs.json?v=${cacheBuster}`, { cache: 'no-store' });
        if (!resp.ok) {
            console.warn('Could not load songs.json for decade artists');
            return;
        }
        const allSongs = await resp.json();
        const artistsSet = new Set();
        for (const s of allSongs) {
            if (!s) continue;
            const g = s.genre || s.genres || '';
            if (g === decade || (Array.isArray(g) && g.includes(decade))) {
                if (s.artist) artistsSet.add(s.artist);
            }
        }
        const artists = Array.from(artistsSet);
        if (artists.length === 0) {
            // Fallback: use a curated list for older decades with sparse data
            const fallbackMap = {
                '1940s': [
                    'Frank Sinatra',
                    'Bing Crosby',
                    'Ella Fitzgerald',
                    'Duke Ellington',
                    'Glenn Miller',
                    'Billie Holiday',
                    'Nat King Cole'
                ],
                '1950s': [
                    'Elvis Presley',
                    'Chuck Berry',
                    'Little Richard',
                    'Buddy Holly',
                    'Ray Charles',
                    'Fats Domino',
                    'The Platters'
                ]
            };
            const fallback = fallbackMap[decade] || [];
            if (fallback.length) {
                console.warn(`No artists in songs.json for ${decade}; using curated fallback list`);
                artistNames = fallback;
                stopArtistBubbles();
                startArtistBubbles();
                return;
            } else {
                console.log(`No artists found for decade ${decade}`);
                return;
            }
        }
        // Shuffle and limit list for performance
        const shuffled = shuffleArray(artists);
        artistNames = shuffled.slice(0, Math.min(80, shuffled.length));
        // Restart bubbles with new artist list
        stopArtistBubbles();
        startArtistBubbles();
    } catch (err) {
        console.error('Error updating decade artists:', err);
    }
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
    // Do not close the shared AudioContext (reverseCtx is sharedAudioCtx)
    reversePlaying = false;
}

// Erstelle eine einzelne Artist Bubble (oder Album Bubble im Album-Modus)
async function createArtistBubble() {
    const container = document.getElementById('artistBubblesContainer');
    if (!container) {
        console.warn('Container not found');
        return;
    }
    if (!container.classList.contains('active')) {
        console.warn('Container not active');
        return;
    }

    console.log('Creating bubble...'); // Debug log

    let bubbleText = '';

    // Show artist bubbles - ensure no repeats until all shown
    if (artistNames.length > 0) {
        // Refill remaining pool if empty
        if (artistNamesRemaining.length === 0) {
            console.log('🔄 All artists shown, reshuffling pool');
            artistNamesRemaining = shuffleArray([...artistNames]);
        }
        // Pop from remaining array
        bubbleText = artistNamesRemaining.pop();
    } else {
        console.warn('No artist names available');
        return;
    }

    // If mappingActive, show mapping-style bubble; otherwise fetch Deezer data
    let artistData = { image: null, fans: 0 };
    const bubble = document.createElement('div');
    bubble.className = 'artist-bubble';

    // Using default sphere style only

    // Assign random color gradient to each bubble
    const bubbleColors = [
        'linear-gradient(135deg, #FF1744 0%, #D50000 100%)', // bright red
        'linear-gradient(135deg, #FFEA00 0%, #FFD600 100%)', // bright yellow
        'linear-gradient(135deg, #2979FF 0%, #1565C0 100%)', // bright blue
        'linear-gradient(135deg, #00E676 0%, #00C853 100%)', // bright green
        'linear-gradient(135deg, #D500F9 0%, #AA00FF 100%)', // bright purple
        'linear-gradient(135deg, #FF6D00 0%, #FF3D00 100%)', // bright orange
        'linear-gradient(135deg, #1DE9B6 0%, #00BFA5 100%)', // bright teal
        'linear-gradient(135deg, #FF4081 0%, #F50057 100%)'  // bright pink
    ];
    const randomColor = bubbleColors[Math.floor(Math.random() * bubbleColors.length)];
    bubble.style.background = randomColor;

    if (mappingActive) {
        // Mapping bubbles: show simple icon and track-count badge
        const icon = document.createElement('div');
        icon.className = 'bubble-image mapping-icon';
        icon.textContent = '🎼';
        bubble.appendChild(icon);
        // show badge with number of mapped tracks if available
        let count = 0;
        if (mappingType === 'operetta' && mappingOperettas && mappingOperettas[bubbleText]) count = mappingOperettas[bubbleText].length;
        if (mappingType === 'opera' && mappingOperas && mappingOperas[bubbleText]) count = mappingOperas[bubbleText].length;
        if (mappingType === 'composer' && mappingComposers && mappingComposers[bubbleText]) count = mappingComposers[bubbleText].length;
        if (count > 0) {
            const fanBadge = document.createElement('div');
            fanBadge.className = 'fan-badge';
            fanBadge.textContent = count >= 1000 ? (count / 1000).toFixed(0) + 'K' : String(count);
            fanBadge.title = `${count} recordings available`;
            bubble.appendChild(fanBadge);
        }
    } else {
        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), 2000)
            );
            artistData = await Promise.race([
                fetchArtistImageFromDeezer(bubbleText),
                timeoutPromise
            ]);
            
            // Skip artists with less than 100 fans (only if we got valid data)
            if (artistData.fans > 0 && artistData.fans < 100) {
                console.log(`⏭️ Skipping "${bubbleText}" - only ${artistData.fans} fans (less than 100)`);
                // Retry immediately with another artist instead of stopping
                setTimeout(() => createArtistBubble().catch(err => console.error('Retry bubble error:', err)), 100);
                return;
            }
        } catch (err) {
            console.warn(`Deezer fetch skipped for "${bubbleText}": ${err.message}`);
            // Continue with empty artistData - show bubble without image
        }

        // Create bubble content with image and text
        if (artistData.image) {
            const img = document.createElement('img');
            img.src = artistData.image;
            img.alt = bubbleText;
            img.className = 'bubble-image';
            bubble.appendChild(img);
            
            // Also use image as sphere texture background
            const beforeElement = bubble.querySelector('::before') || 
                                  window.getComputedStyle(bubble, '::before');
            bubble.style.setProperty('--image-url', `url('${artistData.image}')`);
        }
        // Add fan badge if available
        if (artistData.fans > 0) {
            const fanBadge = document.createElement('div');
            fanBadge.className = 'fan-badge';
            const fanCount = artistData.fans >= 1000000 ? (artistData.fans / 1000000).toFixed(1) + 'M' :
                artistData.fans >= 1000 ? (artistData.fans / 1000).toFixed(0) + 'K' :
                    artistData.fans;
            fanBadge.textContent = fanCount;
            fanBadge.title = `${artistData.fans.toLocaleString()} fans`;
            bubble.appendChild(fanBadge);
        }
    }

    const textSpan = document.createElement('span');
    textSpan.className = 'bubble-text';
    textSpan.textContent = bubbleText;
    bubble.appendChild(textSpan);

    // Starte immer rechts außerhalb (100%)
    bubble.style.left = '100%';
    
    container.appendChild(bubble);
    activeBubbles++;

    // Click Handler
    bubble.onclick = (e) => {
        e.preventDefault();
        const searchInput = document.getElementById('searchQuery');

        if (mappingActive) {
            // If mapping is active, treat bubbleText as a work/composer and play one of its recordings
            try {
                let candidates = [];
                if (mappingType === 'operetta' && mappingOperettas && mappingOperettas[bubbleText]) candidates = mappingOperettas[bubbleText];
                else if (mappingType === 'opera' && mappingOperas && mappingOperas[bubbleText]) candidates = mappingOperas[bubbleText];
                else if (mappingType === 'composer' && mappingComposers && mappingComposers[bubbleText]) candidates = mappingComposers[bubbleText];

                if (candidates && candidates.length > 0) {
                    // pick random recording
                    const rec = candidates[Math.floor(Math.random() * candidates.length)];
                    // Normalize to expected song object shape
                    const songObj = {
                        artist: rec.artist || 'Unknown',
                        track: rec.track || rec.title || 'Unknown',
                        previewUrl: (rec.previewUrl || '').replace(/^http:/, 'https:'),
                        album: rec.album || null
                    };
                    gameState.currentSong = songObj;
                    // ensure UI updates that a mapped selection is active
                    currentBubbleCategory = `${currentBubbleCategory} (mapped)`;
                    setSubtitle(`🎼 Prepared: ${bubbleText} - Click START GAME to play`);
                    return;
                } else {
                    showError('No recordings found for this selection');
                    return;
                }
            } catch (err) {
                console.error('Error playing mapped recording:', err);
                showError('Could not play mapped recording');
                return;
            }
        }

        if (currentSearchType === 'album' && !selectedArtistForAlbums) {
            // Artist bubble clicked in album mode -> trigger check artist to show album modal
            if (searchInput) {
                searchInput.value = bubbleText;
            }
            checkArtist(); // This will show the album selection modal
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
    const classicalSelection = document.getElementById('classicalSelection');
    const subtitle = document.getElementById('gameSubtitle');
    const searchInput = document.getElementById('searchQuery');
    const checkArtistBtn = document.getElementById('checkArtistBtn');
    const bubbleCategoryBtn = document.getElementById('bubbleCategoryBtn');

    if (mode === 'genre') {
        genreSelection.style.display = 'flex';
        searchSelection.style.display = 'none';
        if (classicalSelection) classicalSelection.style.display = 'none';
        stopArtistBubbles();
        if (checkArtistBtn) checkArtistBtn.style.display = 'none';
        if (bubbleCategoryBtn) bubbleCategoryBtn.style.display = 'none';
        // Setze Subtitle zurück
        setSubtitle(t('setupSubtitle'));
    } else if (mode === 'classical') {
        genreSelection.style.display = 'none';
        searchSelection.style.display = 'none';
        if (classicalSelection) classicalSelection.style.display = 'flex';
        stopArtistBubbles();
        currentSearchType = 'track';
        selectedArtistForAlbums = null;
        selectedAlbumName = null;
        mappingActive = false;
        if (checkArtistBtn) checkArtistBtn.style.display = 'none';
        if (bubbleCategoryBtn) bubbleCategoryBtn.style.display = 'none';
        handleClassicalAreaChange();
        setSubtitle('Select a classical sub area');
    } else {
        genreSelection.style.display = 'none';
        searchSelection.style.display = 'flex';
        if (classicalSelection) classicalSelection.style.display = 'none';

        currentSearchType = 'track';
        selectedArtistForAlbums = null; // Reset
        selectedAlbumName = null; // Reset
        startArtistBubbles(); // Show bubbles for artist/track mode
        if (searchInput) {
            searchInput.placeholder = "e.g. 'Taylor Swift' or 'Bohemian Rhapsody'";
            searchInput.disabled = false;
            // Preserve existing text if present
        }
        if (checkArtistBtn) checkArtistBtn.style.display = 'block'; // Show button in Free Choice mode too
        if (bubbleCategoryBtn) bubbleCategoryBtn.style.display = 'block';
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
async function showArtistSelectionModal(artists) {
    const modal = document.getElementById('artistSelectionModal');
    const list = document.getElementById('artistSelectionList');

    if (!modal || !list) return;

    // Clear previous options
    list.innerHTML = '';

    let displayedCount = 0;

    // Create radio button options for each artist with images
    for (const [index, artist] of artists.entries()) {
        // Fetch artist image and fan count from Deezer
        const artistData = await fetchArtistImageFromDeezer(artist.artistName);
        const artistLower = artist.artistName.toLowerCase();
        const isClassicalComposer = !!classicalPerformersMap[artistLower];
        const isClassicalGenre = (artist.primaryGenreName || '').toLowerCase().includes('classical');
        const minFans = (isClassicalComposer || isClassicalGenre) ? 0 : 1000;

        // Skip only if below threshold for non-classical artists
        if (artistData.fans < minFans) {
            console.log(`⏭️ Skipping "${artist.artistName}" - only ${artistData.fans} fans (threshold: ${minFans})`);
            continue;
        }

        const option = document.createElement('div');
        option.style.cssText = 'padding: 10px; margin: 5px 0; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; transition: all 0.2s;';

        const fanCountText = artistData.fans > 0 ?
            (artistData.fans >= 1000000 ? (artistData.fans / 1000000).toFixed(1) + 'M fans' :
                artistData.fans >= 1000 ? (artistData.fans / 1000).toFixed(0) + 'K fans' :
                    artistData.fans + ' fans') : '';

        option.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 50px; height: 50px; border-radius: 8px; overflow: hidden; background: #f0f0f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    ${artistData.image ?
                `<img src="${artistData.image}" alt="${artist.artistName}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'font-size: 20px; color: #999;\\'>🎤</div>';">` :
                '<div style="font-size: 20px; color: #999;">🎤</div>'
            }
                </div>
                <div style="flex: 1;">
                    <input type="radio" name="artistChoice" value="${displayedCount}" id="artist_${displayedCount}" style="cursor: pointer; margin-right: 8px;">
                    <label for="artist_${displayedCount}" style="cursor: pointer; margin: 0;">
                        <strong>${artist.artistName}</strong>
                        ${fanCountText ? `<br><small style="color: #0066cc; font-weight: 600;">${fanCountText}</small>` : ''}
                        ${artist.primaryGenreName ? `<br><small style="color: #666;">${artist.primaryGenreName}</small>` : ''}
                    </label>
                </div>
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
        displayedCount++;
    }

    // Show error if no artists with 1000+ fans found
    if (displayedCount === 0) {
        showError('No artists found with 1000+ fans. Please search for a more popular artist.');
        return;
    }

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
        const seenIds = new Set();
        const seenBaseNames = new Map(); // Track by base name (without edition info) to deduplicate versions

        data.results.forEach(item => {
            if (item.collectionId && !seenIds.has(item.collectionId)) {
                // Get the base album name without edition info for comparison
                const baseAlbumName = getAlbumBaseName(item.collectionName);

                if (seenBaseNames.has(baseAlbumName)) {
                    const existingAlbum = seenBaseNames.get(baseAlbumName);
                    // Keep the one with more tracks (full version likely has more)
                    if (item.trackCount && existingAlbum.trackCount && item.trackCount > existingAlbum.trackCount) {
                        // Remove old one and add new one
                        uniqueAlbums.splice(uniqueAlbums.findIndex(a => a.collectionId === existingAlbum.collectionId), 1);
                        seenIds.delete(existingAlbum.collectionId);
                        uniqueAlbums.push(item);
                        seenIds.add(item.collectionId);
                        seenBaseNames.set(baseAlbumName, item);
                    }
                    // Otherwise skip this version
                } else {
                    seenIds.add(item.collectionId);
                    uniqueAlbums.push(item);
                    seenBaseNames.set(baseAlbumName, item);
                }
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

    // Reset filter buttons - set "Primary Only" as default
    const filterBoth = document.getElementById('filterBoth');
    const filterPrimary = document.getElementById('filterPrimary');
    const filterCompilations = document.getElementById('filterCompilations');
    if (filterBoth) filterBoth.classList.remove('active');
    if (filterPrimary) filterPrimary.classList.add('active');
    if (filterCompilations) filterCompilations.classList.remove('active');

    // Display primary albums only initially (exclude singles and compilations)
    const primaryAlbums = albums.filter(album => isAlbumPrimary(album, artistName) && !isAlbumSingle(album));
    displayFilteredAlbums(primaryAlbums);

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
        const trackCount = album.trackCount || 0;

        const badge = isPrimary ? '' : '<div style="position: absolute; top: 4px; right: 4px; background: rgba(255, 159, 28, 0.9); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.65em; font-weight: 700;">COMP</div>';

        card.innerHTML = `
            ${badge}
            <img src="${coverUrlHiRes}" alt="${album.collectionName}" style="width: 100%; height: auto; display: block;" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\'%3E%3Crect fill=\'%23667eea\' width=\'100\' height=\'100\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' font-size=\'40\' fill=\'white\'%3E💿%3C/text%3E%3C/svg%3E'">
            <div style="padding: 8px; font-size: 0.75em; text-align: center; font-weight: 600; line-height: 1.2; min-height: 50px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;" title="${album.collectionName}">
                <div>${albumNameTruncated}</div>
                <div style="font-size: 0.85em; color: #667eea; font-weight: 700;">🎵 ${trackCount}</div>
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

// Helper function to strip edition info from album names for deduplication
function getAlbumBaseName(albumName) {
    if (!albumName) return '';
    // Remove common edition markers: (Deluxe), (Remastered), (Tour Edition), (Wembley Edition), etc.
    return albumName
        .toLowerCase()
        .trim()
        .replace(/\s*\([^)]*(?:deluxe|remaster|edition|remix|live|demo|version|explicit|clean|alternate|bonus|expanded|anniversary|special|collectors?|digi|digipack|anniversary|explicit|clean|alternate|bonus|expanded|anniversary|special|vinyl|record|lp|cd|cassette|box)\s*[^)]*\)/gi, '')
        .replace(/\s*-\s*(?:deluxe|remaster|edition|remix|live|demo|version|explicit|clean|alternate|bonus|expanded|anniversary|special|collectors?|digi|digipack|anniversary|explicit|clean|alternate|bonus|expanded|anniversary|special|vinyl|record|lp|cd|cassette|box)\s*$/gi, '')
        .trim();
}

// Check if album is a single based on collectionType and track count
function isAlbumSingle(album) {
    const collectionType = (album.collectionType || '').toLowerCase();
    const trackCount = album.trackCount || 0;

    // Check collectionType for 'single'
    if (collectionType.includes('single')) return true;

    // Check track count (only 1 track is a single, 2-3 could be EPs)
    if (trackCount === 1) return true;

    return false;
}

// Filter albums based on type
function filterAlbums(filterType) {
    // Update button states
    const filterBoth = document.getElementById('filterBoth');
    const filterPrimary = document.getElementById('filterPrimary');
    const filterCompilations = document.getElementById('filterCompilations');
    const filterSingles = document.getElementById('filterSingles');

    if (filterBoth) filterBoth.classList.remove('active');
    if (filterPrimary) filterPrimary.classList.remove('active');
    if (filterCompilations) filterCompilations.classList.remove('active');
    if (filterSingles) filterSingles.classList.remove('active');

    if (filterType === 'both' && filterBoth) filterBoth.classList.add('active');
    if (filterType === 'primary' && filterPrimary) filterPrimary.classList.add('active');
    if (filterType === 'compilations' && filterCompilations) filterCompilations.classList.add('active');
    if (filterType === 'singles' && filterSingles) filterSingles.classList.add('active');

    // Filter albums
    let filteredAlbums = allAlbumsForModal;

    if (filterType === 'primary') {
        filteredAlbums = allAlbumsForModal.filter(album => {
            return isAlbumPrimary(album, currentArtistName) && !isAlbumSingle(album);
        });
    } else if (filterType === 'compilations') {
        filteredAlbums = allAlbumsForModal.filter(album => {
            return !isAlbumPrimary(album, currentArtistName) && !isAlbumSingle(album);
        });
    } else if (filterType === 'singles') {
        filteredAlbums = allAlbumsForModal.filter(album => isAlbumSingle(album));
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

    // Store the selected album name
    selectedAlbumName = albumName;

    // Update search input to show artist + album selected
    if (searchInput && selectedArtistForAlbums) {
        searchInput.value = `✅ ${selectedArtistForAlbums} - ${albumName}`;
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
    const songCount = 10; // Always play 10 questions

    // State speichern (previewDuration jetzt vom Dropdown)
    // State speichern (previewDuration fixed 30s)
    gameState.previewDuration = 30;
    gameState.currentQuestion = 0;
    gameState.correctAnswers = 0;
    gameState.wrongAnswers = 0;
    gameState.totalPoints = 0;
    gameState.questionCount = 0;
    gameState.candidatePoolSize = 0;
    gameState.difficultyRatio = 0;
    gameState.difficultyLabel = '';
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
        // Check if a mapped song is already prepared (from operetta/opera/composer bubbles)
        if (gameState.currentSong && mappingActive && gameState.currentSong.previewUrl) {
            // Mapped selection is ready — start game directly
            const subtitleText = `🎼 ${currentBubbleCategory || 'Mapped'}`;
            setSubtitle(subtitleText);
            gameState.currentGameMode = subtitleText;
            // Initialize game with the prepared mapped song
            gameState.songs = [gameState.currentSong];
            setDifficultyMeta(1, 1, 'Mapped pick');
            hideLoadingState();
            nextQuestion();
            return;
        }

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
        } else if (gameMode === 'classical') {
            const areaSelect = document.getElementById('classicalAreaSelect');
            const workSelect = document.getElementById('classicalWorkSelect');
            const selectedArea = areaSelect ? areaSelect.value : '';

            if (!selectedArea) {
                showError('Please choose a classical sub area');
                document.getElementById('setupScreen').style.display = 'block';
                document.getElementById('quizScreen').style.display = 'none';
                hideLoadingState();
                return;
            }

            const areaData = classicalWorks[selectedArea] || {};
            const worksForArea = areaData.works || areaData || [];

            if (selectedArea === 'Oper' || selectedArea === 'Operette' || worksForArea.length > 0) {
                const selectedWork = workSelect ? workSelect.value : '';
                if (!selectedWork) {
                    showError('Please choose a work');
                    document.getElementById('setupScreen').style.display = 'block';
                    document.getElementById('quizScreen').style.display = 'none';
                    hideLoadingState();
                    return;
                }

                try {
                    const workTypeLabel = (selectedArea || '').toLowerCase();
                    gameState.songs = await loadSongsForWork(selectedWork, workTypeLabel, songCount, selectedArea, worksForArea);
                } catch (err) {
                    showError(err.message || 'No recordings found for this selection');
                    document.getElementById('setupScreen').style.display = 'block';
                    document.getElementById('quizScreen').style.display = 'none';
                    hideLoadingState();
                    return;
                }

                const subtitleText = `${selectedArea}: ${selectedWork}`;
                setSubtitle(`🎼 ${subtitleText}`);
                gameState.currentGameMode = subtitleText;
            } else {
                await loadSongsFromGenre(`Classical:${selectedArea}`, songCount);
                // Update Subtitle
                const subtitleText = `Classical: ${selectedArea}`;
                setSubtitle(subtitleText);
                gameState.currentGameMode = subtitleText;
            }
        } else {
            // iTunes Suchmodus
            // In album mode, use selectedAlbumName; otherwise use searchQuery
            let searchQuery;
            if (currentSearchType === 'album' && selectedAlbumName) {
                searchQuery = selectedAlbumName;
            } else {
                searchQuery = document.getElementById('searchQuery').value.trim();
                // Remove checkmark emoji if present
                searchQuery = searchQuery.replace(/^✅\s*/, '');
            }

            if (!searchQuery) {
                showError('Please enter an Artist!');
                document.getElementById('setupScreen').style.display = 'block';
                document.getElementById('quizScreen').style.display = 'none';
                hideLoadingState();
                return;
            }
            await loadSongsFromItunes(searchQuery, songCount);
            // Update Subtitle
            let subtitleText;
            if (currentSearchType === 'album' && selectedAlbumName && selectedArtistForAlbums) {
                subtitleText = `Album: ${selectedAlbumName} by ${selectedArtistForAlbums}`;
            } else {
                subtitleText = `Songs by ${searchQuery}`;
            }
            setSubtitle(subtitleText);
            gameState.currentGameMode = subtitleText;
        }

        // Verstecke Loading-Indicator
        hideLoadingState();

        if (gameState.songs.length === 0) {
            showError('No Songs found!');
            document.getElementById('setupScreen').style.display = 'block';
            document.getElementById('quizScreen').style.display = 'none';
            return;
        }

        // Check if there are enough songs for the requested count
        if (gameState.songs.length < songCount) {
            console.warn(`⚠️ Only ${gameState.songs.length} songs found, but ${songCount} requested. Using all available songs.`);
            // Don't show error - just use all available songs
        }

        // Starte erste Frage
        nextQuestion();

        // Lade Motivations-Leaderboard
        setTimeout(() => {
            showGameLeaderboard();
        }, 500);
    } catch (error) {
        console.error('Load error while loading songs:', error);
        showError('Error loading songs. Please try again!');
        document.getElementById('setupScreen').style.display = 'block';
        document.getElementById('quizScreen').style.display = 'none';
        hideLoadingState();
    }
}

// Load songs for opera/operetta by searching iTunes for the work name
// If loading from a category with multiple works (Operette, Oper, etc), mix songs from 2-3 related works for variety
async function loadSongsForWork(workName, workType, limit, area = '', allWorksInArea = []) {
    // Try to get composer hint from selected dropdown if available
    let composer = '';
    const workSelect = document.getElementById('classicalWorkSelect');
    if (workSelect && workSelect.selectedOptions.length > 0) {
        const selectedOption = workSelect.selectedOptions[0];
        composer = selectedOption.dataset.composer || '';
    }

    // Determine which works to load from - mix multiple for variety
    let worksToLoad = [workName];

    // If we have a list of available works in this area, pick 1-2 related ones for variety
    if (allWorksInArea && allWorksInArea.length > 3) {
        // Get all work titles
        const workTitles = allWorksInArea.map(w => typeof w === 'string' ? w : w.title);
        const currentIndex = workTitles.indexOf(workName);

        if (currentIndex !== -1) {
            // Add 1-2 related works (adjacent or random from category)
            const relatedWorks = [];

            // Try to get adjacent works for thematic similarity
            if (currentIndex > 0) {
                relatedWorks.push(workTitles[currentIndex - 1]);
            }
            if (currentIndex < workTitles.length - 1 && relatedWorks.length < 2) {
                relatedWorks.push(workTitles[currentIndex + 1]);
            }

            // If not enough adjacent, add random works from category
            while (relatedWorks.length < 2 && relatedWorks.length < workTitles.length - 1) {
                const randomIdx = Math.floor(Math.random() * workTitles.length);
                const randomWork = workTitles[randomIdx];
                if (!relatedWorks.includes(randomWork) && randomWork !== workName) {
                    relatedWorks.push(randomWork);
                }
            }

            worksToLoad = [workName, ...relatedWorks];
            console.log(`🎭 Multi-work mode: mixing "${workName}" with ${relatedWorks.join('", "')}`);
        }
    }

    // Determine target songs per work (distribute limit evenly)
    const songsPerWork = Math.ceil(limit / worksToLoad.length);
    const remainderSongs = limit % worksToLoad.length;

    const seen = new Set();
    const collected = [];

    // Load songs from each selected work
    for (let workIdx = 0; workIdx < worksToLoad.length; workIdx++) {
        const currentWork = worksToLoad[workIdx];
        const targetForThisWork = songsPerWork + (workIdx === 0 ? remainderSongs : 0);

        // Get composer hint for this work if available
        let currentComposer = composer;
        if (!currentComposer && allWorksInArea && allWorksInArea.length > 0) {
            const workObj = allWorksInArea.find(w => (typeof w === 'string' ? w : w.title) === currentWork);
            if (workObj && typeof workObj === 'object') {
                currentComposer = workObj.composer || '';
            }
        }

        // Build query variants with composer information
        const queries = [];
        if (currentComposer && currentComposer.trim()) {
            queries.push(`${currentComposer} ${currentWork}`.trim());
            queries.push(`${currentWork} ${currentComposer}`.trim());
        }
        queries.push(`${currentWork} ${workType || ''}`.trim());
        queries.push(currentWork);
        if (!currentComposer) {
            queries.push(`${currentWork} classical`.trim());
        }

        // Remove duplicates
        const uniqueQueries = [...new Set(queries)];

        console.log(`🎼 Loading from work ${workIdx + 1}/${worksToLoad.length}: "${currentWork}" (target: ${targetForThisWork} songs)`);

        for (const query of uniqueQueries) {
            console.log(`  🔍 Query: "${query}"`);
            try {
                const { results } = await fetchItunesWithFallback(query, ['DE', 'US', 'GB', 'AT', 'FR'], 40);
                console.log(`    📦 Got ${results.length} total results`);

                const filtered = (results || [])
                    .filter(r => r && r.previewUrl && r.trackName && r.artistName)
                    .filter(r => {
                        const genre = (r.primaryGenreName || '').toLowerCase();
                        // Strict classical/opera/ballet genres only
                        const match = genre.includes('classical') || genre.includes('klassik') || // German for classical
                            genre.includes('orchestral') || genre.includes('symphony') ||
                            genre.includes('opera') || genre.includes('operette') ||
                            genre.includes('ballet') || genre.includes('stage') ||
                            genre.includes('vocal');  // Vocal for opera singers
                        return match;
                    })
                    .map((song, index) => {
                        const originalCover = song.artworkUrl600 || song.artworkUrl100 || song.artworkUrl60 || '';
                        const highResCover = originalCover ? originalCover.replace(/\d+x\d+bb(-\d+)?\.(jpg|png)/, '600x600bb.$2') : '';
                        const idVal = song.trackId ? String(song.trackId) : `${currentWork}-${index}`;
                        return {
                            id: idVal,
                            track: song.trackName,
                            artist: song.artistName,
                            album: song.collectionName || 'Unknown',
                            previewUrl: (song.previewUrl || '').replace(/^http:/, 'https:'),
                            image: highResCover,
                            genre: `Classical:${workType}`,
                            workSource: currentWork  // Track which work this came from
                        };
                    })
                    .filter(item => {
                        const key = `${item.artist}-${item.track}-${item.previewUrl}`;
                        if (seen.has(key)) {
                            return false;
                        }
                        seen.add(key);
                        return true;
                    });

                console.log(`    ✅ Added ${filtered.length} songs from "${query}"`);
                collected.push(...filtered);

                // Stop if we have enough for this work
                if (collected.length >= targetForThisWork) {
                    break;
                }
            } catch (err) {
                console.warn(`    ⚠️  Query failed:`, err.message);
            }
        }
    }

    const shuffled = shuffleArray(collected);
    const trimmed = shuffled.slice(0, Math.min(limit, shuffled.length));

    console.log(`🎵 loadSongsForWork final: ${trimmed.length} songs from ${worksToLoad.length} work(s) (limit: ${limit})`);
    if (!trimmed.length) {
        throw new Error('No recordings found for this work');
    }

    setDifficultyMeta(trimmed.length, collected.length || trimmed.length, `${workType || 'Work'} pool`);

    return trimmed;
}

// Lade Songs aus songs.json basierend auf Genre
async function fetchSongsJsonWithFallback() {
    const cacheBuster = Date.now();
    const urls = [
        `json/songs.json?v=${cacheBuster}`,
        `/api/songs?v=${cacheBuster}`
    ];

    let lastError = null;
    for (const url of urls) {
        try {
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} for ${url}`);
            }
            return await response.json();
        } catch (err) {
            console.warn('Songs fetch failed:', url, err);
            lastError = err;
        }
    }

    throw lastError || new Error('Error loading songs.json');
}

async function loadSongsFromGenre(genre, limit) {
    try {
        // Handle Classical genre (subcategory selection like Classical:Oper, Classical:Komponist, etc.)
        if (genre === 'Classical' || genre.startsWith('Classical:')) {
            const cacheBuster = Date.now();
            const response = await fetch(`json/genres.json?v=${cacheBuster}`, { cache: 'no-store' });
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
            setDifficultyMeta(Math.min(limit, mapped.length), mapped.length, `Classical:${selectedSubcategory}`);
            return;
        }

        // Handle Country-based genres
        if (genre.startsWith('Country:')) {
            const countryCode = genre.replace('Country:', '');
            const cacheBuster = Date.now();
            const response = await fetch(`json/genres.json?v=${cacheBuster}`, { cache: 'no-store' });
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
                        album: song.collectionName || 'Unknown',
                        previewUrl: (song.previewUrl || '').replace(/^http:/, 'https:'),
                        image: highResCover,
                        genre: `Country:${countryCode}`
                    };
                });
            gameState.songs = mapped;
            const candidatePoolCountry = Math.max(mapped.length, artists.length || mapped.length);
            setDifficultyMeta(Math.min(limit, mapped.length), candidatePoolCountry, `Country:${countryCode}`);

            if (gameState.songs.length === 0) {
                throw new Error(t('errorNoSongsForCountry'));
            }
            return;
        }

        // Lade songs.json for regular genres
        const allSongs = await fetchSongsJsonWithFallback();
        let filteredSongs = [];

        if (genre === 'Alle') {
            // Alle Songs
            filteredSongs = allSongs;
        } else {
            // Filtere nach Genre
            filteredSongs = allSongs.filter(song => song.genre === genre);
        }

        if (filteredSongs.length === 0) {
            // Fallback for decades without songs in songs.json
            const decadeFallbacks = {
                '1940s': [
                    'Frank Sinatra',
                    'Bing Crosby',
                    'Ella Fitzgerald',
                    'Duke Ellington',
                    'Glenn Miller',
                    'Billie Holiday',
                    'Nat King Cole'
                ],
                '1950s': [
                    'Elvis Presley',
                    'Chuck Berry',
                    'Little Richard',
                    'Buddy Holly',
                    'Ray Charles',
                    'Fats Domino',
                    'The Platters'
                ]
            };

            const fallbackArtists = decadeFallbacks[genre];
            if (fallbackArtists) {
                console.warn(`No songs in songs.json for ${genre}; using curated artist fallback`);
                // Search iTunes for songs by these artists
                const searchPromises = fallbackArtists.map(async (artist) => {
                    try {
                        const { results } = await fetchItunesWithFallback(artist, ['US', 'GB', 'DE'], 3);
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
                            album: song.collectionName || 'Unknown',
                            previewUrl: (song.previewUrl || '').replace(/^http:/, 'https:'),
                            image: highResCover,
                            genre: genre
                        };
                    })
                    .slice(0, limit);

                if (mapped.length === 0) {
                    throw new Error(`No songs found for ${genre} (fallback failed)`);
                }

                gameState.songs = mapped;
                setDifficultyMeta(Math.min(limit, mapped.length), mapped.length, `${genre} curated`);
                console.log(`${gameState.songs.length} songs loaded from ${genre} fallback`);
                return;
            } else {
                throw new Error('No songs found for this genre');
            }
        }

        // Shuffle and limit the number
        const selectedSongs = shuffleArray(filteredSongs).slice(0, Math.min(limit, filteredSongs.length));

        // Speichere Songs - artwork wird später von iTunes API geladen
        gameState.songs = selectedSongs;
        setDifficultyMeta(selectedSongs.length, filteredSongs.length, genre === 'Alle' ? 'All genres' : genre);

        console.log(`${gameState.songs.length} songs loaded from genre "${genre}"`);
    } catch (error) {
        console.error('Error loading songs:', error);
        throw error;
    }
}

// Load songs from Billboard Hot 10 based on year
async function loadSongsFromBillboard(year, limit) {
    try {
        // Lade hot-10-unique.json
        const cacheBuster = Date.now();
        const response = await fetch(`json/hot-10-unique.json?v=${cacheBuster}`, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error('Error loading hot-10-unique.json');
        }

        const allSongs = await response.json();

        // Filtere nach Jahr
        const filteredSongs = allSongs.filter(song => song.chart_week.startsWith(year));

        if (filteredSongs.length === 0) {
            throw new Error('No songs found for this year');
        }

        // Shuffle and limit the number
        const selectedSongs = shuffleArray(filteredSongs).slice(0, Math.min(limit, filteredSongs.length));

        // Konvertiere Billboard Format zu app Format
        gameState.songs = selectedSongs.map(song => ({
            artist: song.performer,
            track: song.title,
            genre: year // Jahr als Genre verwenden
        }));

        setDifficultyMeta(gameState.songs.length, filteredSongs.length, `Billboard ${year}`);

        console.log(`${gameState.songs.length} Billboard Songs from year "${year}" loaded`);
    } catch (error) {
        console.error('Error loading Billboard songs:', error);
        throw error;
    }
}

function fetchItunesJsonp(searchTerm, { limit = 10, country = 'DE' } = {}) {
    return new Promise((resolve, reject) => {
        const encodedQuery = encodeURIComponent(searchTerm);
        const callbackName = `itunesJsonp_${country}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const url = `https://itunes.apple.com/search?term=${encodedQuery}&entity=song&limit=${limit}&media=music&country=${country}&lang=de_DE&callback=${callbackName}`;

        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('JSONP Timeout'));
        }, 6000);

        function cleanup() {
            clearTimeout(timeout);
            if (window[callbackName]) {
                try { delete window[callbackName]; } catch (_) { }
            }
            if (script && script.parentNode) {
                script.parentNode.removeChild(script);
            }
        }

        window[callbackName] = (data) => {
            cleanup();
            if (!data || !data.results) {
                reject(new Error('JSONP: No results'));
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
        debugLog(`❌ iTunes Fetch ${country} failed: ${networkError.message}`, errCode);
        debugLog(`↩️ Try JSONP ${country}`, errCode);
        const jsonpResults = await fetchItunesJsonp(searchTerm, { limit, country });
        debugLog(`📦 ${jsonpResults.length} results (JSONP ${country})`);
        return jsonpResults;
    }
    if (!response.ok) {
        const errCode = country === 'DE' ? 'F3' : 'F4';
        debugLog(`❌ iTunes API error ${country}: ${response.status} ${response.statusText || ''}`.trim(), errCode);
        debugLog(`↩️ Try JSONP ${country}`, errCode);
        const jsonpResults = await fetchItunesJsonp(searchTerm, { limit, country });
        debugLog(`📦 ${jsonpResults.length} results (JSONP ${country})`);
        return jsonpResults;
    }
    const data = await response.json();
    console.log(`iTunes ${useLookup ? 'Lookup' : 'Search'} ${country} for "${searchTerm}": ${data.results.length} results`);
    debugLog(`📦 ${data.results.length} results (${country})`);
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
            debugLog(`⚠️ ${country} failed: ${err.message}`, errCode);
        }
    }
    debugLog(`❌ iTunes search completely failed: ${lastError ? lastError.message : 'Unknown'}`, 'F4');
    throw lastError || new Error('iTunes search failed in all countries');
}

// Fetch artist image and fan count from Deezer API via proxy
async function fetchArtistImageFromDeezer(artistName) {
    try {
        const response = await fetch(`/api/deezer/artist?q=${encodeURIComponent(artistName)}`);

        if (!response.ok) {
            throw new Error(`Proxy API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.data && data.data.length > 0) {
            const artist = data.data[0];
            // Return object with image and fan count
            return {
                image: artist.picture_medium || artist.picture_big || artist.picture_small || null,
                fans: artist.nb_fan || artist.fans || 0
            };
        }

        return { image: null, fans: 0 };
    } catch (error) {
        debugLog(`❌ Deezer API proxy error for "${artistName}": ${error.message}`, 'D1');
        return { image: null, fans: 0 };
    }
}

// Fetch album fan count from Deezer API via server proxy
async function fetchAlbumFanCount(albumName, artistName) {
    try {
        // Clean album name - remove common suffixes that don't match in Deezer
        let cleanAlbum = albumName
            .replace(/\s*\(.*?(Remaster|Deluxe|Edition|Version|Anniversary|Expanded|Special|Archive|Collection|Bonus).*?\)/gi, '')
            .replace(/\s*\[.*?(Remaster|Deluxe|Edition|Version|Anniversary|Expanded|Special|Archive|Collection|Bonus).*?\]/gi, '')
            .replace(/\s*-\s*(Remaster|Deluxe|Edition|Version|Anniversary|Expanded|Special).*/gi, '')
            .trim();

        const searchQuery = `${cleanAlbum} ${artistName}`;
        console.log(`🔍 Fetching album fans for: "${cleanAlbum}" (original: "${albumName}") by ${artistName}`);
        const response = await fetch(`/api/deezer/album?q=${encodeURIComponent(searchQuery)}`);

        if (!response.ok) {
            console.log(`❌ Album fetch failed with status: ${response.status}`);
            return 0;
        }

        const data = await response.json();
        console.log('📀 Deezer album search response:', data);
        if (data.data && data.data.length > 0) {
            const albumId = data.data[0].id;
            console.log(`🔍 Fetching full album details for ID: ${albumId}`);

            // Fetch full album details to get fan count via server proxy
            const detailResponse = await fetch(`/api/deezer/album/${albumId}`);
            if (detailResponse.ok) {
                const albumDetails = await detailResponse.json();
                console.log('📀 Full album details:', albumDetails);
                const fans = albumDetails.fans || 0;
                console.log(`✅ Album has ${fans.toLocaleString()} fans`);
                return fans;
            }
        }

        console.log('⚠️ No album found in Deezer');
        return 0;
    } catch (error) {
        console.warn(`Failed to fetch album fan count for "${albumName}": ${error.message}`);
        return 0;
    }
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
            debugLog(`❌ No preview available for "${artist} - ${track}"`, 'F5');
            throw new Error(`No preview URL available for "${artist} - ${track}" (DE/US)`);
        }

        // Try to find the best match
        let song = songsWithPreview.find(result =>
            result.trackName.toLowerCase().includes(track.toLowerCase()) &&
            result.artistName.toLowerCase().includes(artist.toLowerCase())
        );

        // Fallback: Take the first song with preview
        if (!song) {
            song = songsWithPreview[0];
            console.log(`Using fallback: "${song.artistName} - ${song.trackName}"`);
        }

        const safePreview = (song.previewUrl || '').replace(/^http:/, 'https:');

        // Use high-resolution cover (600x600)
        const originalCover = song.artworkUrl600 || song.artworkUrl100 || song.artworkUrl60 || '';
        const highResCover = originalCover ? originalCover.replace(/\d+x\d+bb(-\d+)?\.(jpg|png)/, '600x600bb.$2') : '';

        // Fetch artist image from Deezer
        const artistData = await fetchArtistImageFromDeezer(song.artistName);

        debugLog(`✅ Song loaded: "${song.trackName}" (${usedCountry})`);
        return {
            id: song.trackId,
            track: song.trackName,
            artist: song.artistName,
            album: song.collectionName || 'Unknown',
            previewUrl: safePreview,
            image: highResCover,
            artistImageUrl: artistData.image,
            genre: song.primaryGenreName || 'Unknown'
        };
    } catch (error) {
        console.error(`Error loading "${artist} - ${track}":`, error);
        const errMsg = error.message || String(error);
        gameState.lastError = errMsg;
        const lower = errMsg.toLowerCase();
        const errCode = errMsg.includes('Preview-URL')
            ? 'F5'
            : (errMsg.includes('API') || lower.includes('fetch') || lower.includes('network'))
                ? 'F3/F4'
                : 'F?';
        const icon = errCode === 'F?' ? '❓' : '⚠️';
        debugLog(`${icon} Error loading "${artist} - ${track}": ${errMsg}`, errCode);
        showError(`iTunes error: ${gameState.lastError}`);
        throw error;
    }
}

// Heuristic to detect classical/opera style results
function isClassicalLikeSong(song) {
    const artist = (song.artistName || '').toLowerCase();
    const genre = (song.primaryGenreName || '').toLowerCase();
    const track = (song.trackName || '').toLowerCase();
    return genre.includes('classical') ||
        genre.includes('klassik') ||
        artist.includes('philharmon') ||
        artist.includes('orchestra') ||
        artist.includes('symphony') ||
        artist.includes('sinfon') ||
        artist.includes('chamber') ||
        artist.includes('quartet') ||
        artist.includes('ensemble') ||
        artist.includes('opera') ||
        artist.includes('chor') ||
        artist.includes('choir') ||
        artist.includes('kapell') ||
        track.includes('aria') ||
        track.includes('requiem') ||
        track.includes('concerto') ||
        track.includes('suite');
}

// For composer queries: try targeted performer/hint searches before generic search
async function tryComposerPerformerSearch(searchQuery) {
    const composerKey = searchQuery.toLowerCase().trim();
    const entry = classicalPerformersMap[composerKey];
    if (!entry) return null;

    const searchTerms = [];
    (entry.preferredPerformers || []).forEach(performer => {
        searchTerms.push(`${searchQuery} ${performer}`);
        searchTerms.push(`${performer} ${searchQuery}`);
    });
    (entry.searchHints || []).forEach(hint => searchTerms.push(hint));

    const tried = new Set();
    for (const term of searchTerms) {
        const key = term.toLowerCase();
        if (tried.has(key)) continue;
        tried.add(key);

        try {
            let candidateResults = await fetchItunes(term, { limit: 80, country: 'DE' });
            if (candidateResults.length === 0) {
                candidateResults = await fetchItunes(term, { limit: 80, country: 'US' });
            }

            const filtered = candidateResults.filter(song => song.previewUrl && isClassicalLikeSong(song));
            if (filtered.length > 0) {
                console.log(`✅ Composer search hit for ${searchQuery} via "${term}" -> ${filtered.length} tracks`);
                return { composer: searchQuery, results: filtered };
            }
        } catch (err) {
            console.warn(`Composer search term failed (${term}):`, err.message);
        }
    }

    return null;
}

// Load songs from iTunes Search API
async function loadSongsFromItunes(searchQuery, limit) {
    try {
        let results = [];
        let albumArtwork = null;  // Store the album cover
        let composerForResults = null; // Store composer if we searched via performer map

        if (currentSearchType === 'album') {
            // Album-Suche: Suche zuerst das Album selbst, dann alle Songs von diesem Album
            try {
                // Step 1: Search for the album
                console.log('🔍 Album search for:', searchQuery);
                const albumResults = await fetchItunes(searchQuery, { limit: 50, country: 'DE', entity: 'album' });
                console.log(`📀 Album search found: ${albumResults.length} albums`);

                // Find the best match for the search query
                let bestMatch = null;
                if (albumResults.length > 0) {
                    const normalizedQuery = searchQuery.toLowerCase().trim();
                    const normalizedArtist = selectedArtistForAlbums ? selectedArtistForAlbums.toLowerCase().trim() : null;

                    // Filter: Only albums from the selected artist
                    let filteredAlbums = albumResults;
                    if (normalizedArtist) {
                        filteredAlbums = albumResults.filter(album =>
                            album.artistName && album.artistName.toLowerCase().includes(normalizedArtist)
                        );
                    }

                    // 1. Priority: Exact match (with artist filter)
                    bestMatch = filteredAlbums.find(album =>
                        album.collectionName && album.collectionName.toLowerCase() === normalizedQuery
                    );

                    // 2. Priority: Album starts with search query (with artist filter)
                    if (!bestMatch) {
                        bestMatch = filteredAlbums.find(album =>
                            album.collectionName && album.collectionName.toLowerCase().startsWith(normalizedQuery)
                        );
                    }

                    // 3. Priority: Shortest album that contains the search query (with artist filter)
                    if (!bestMatch) {
                        const matches = filteredAlbums.filter(album =>
                            album.collectionName && album.collectionName.toLowerCase().includes(normalizedQuery)
                        );
                        if (matches.length > 0) {
                            bestMatch = matches.reduce((shortest, current) =>
                                current.collectionName.length < shortest.collectionName.length ? current : shortest
                            );
                        }
                    }

                    // 4. Fallback: erstes Ergebnis (mit Artist-Filter)
                    if (!bestMatch && filteredAlbums.length > 0) {
                        bestMatch = filteredAlbums[0];
                    }
                }

                if (!bestMatch) {
                    console.warn('DE album not found, trying US:');
                    const usAlbumResults = await fetchItunes(searchQuery, { limit: 50, country: 'US', entity: 'album' });
                    if (usAlbumResults.length > 0) {
                        const normalizedQuery = searchQuery.toLowerCase().trim();
                        const normalizedArtist = selectedArtistForAlbums ? selectedArtistForAlbums.toLowerCase().trim() : null;

                        // Filter: Only albums from the selected artist
                        let filteredAlbums = usAlbumResults;
                        if (normalizedArtist) {
                            filteredAlbums = usAlbumResults.filter(album =>
                                album.artistName && album.artistName.toLowerCase().includes(normalizedArtist)
                            );
                        }

                        bestMatch = filteredAlbums.find(album =>
                            album.collectionName && album.collectionName.toLowerCase() === normalizedQuery
                        );

                        if (!bestMatch) {
                            bestMatch = filteredAlbums.find(album =>
                                album.collectionName && album.collectionName.toLowerCase().startsWith(normalizedQuery)
                            );
                        }

                        if (!bestMatch) {
                            const matches = filteredAlbums.filter(album =>
                                album.collectionName && album.collectionName.toLowerCase().includes(normalizedQuery)
                            );
                            if (matches.length > 0) {
                                bestMatch = matches.reduce((shortest, current) =>
                                    current.collectionName.length < shortest.collectionName.length ? current : shortest
                                );
                            }
                        }

                        if (!bestMatch && filteredAlbums.length > 0) {
                            bestMatch = filteredAlbums[0];
                        }

                        const albumId = bestMatch.collectionId;
                        const coverUrl = bestMatch.artworkUrl100 || '';
                        albumArtwork = coverUrl.replace(/\d+x\d+bb(-\d+)?\.(jpg|png)/, '600x600bb.$2');
                        console.log('Album Cover URL (US):', albumArtwork, 'für:', bestMatch.collectionName);
                        results = await fetchItunes(albumId, { limit: 500, country: 'US', entity: 'song', useLookup: true });
                        results = results.filter(item => item.wrapperType === 'track');
                    } else {
                        console.log('Trying album+artist fallback for:', searchQuery);
                        const albumArtistResults = await fetchItunes(searchQuery, { limit: 50, country: 'US', entity: 'album', attribute: 'albumTerm' });
                        if (albumArtistResults.length > 0) {
                            const normalizedQuery = searchQuery.toLowerCase().trim();
                            const normalizedArtist = selectedArtistForAlbums ? selectedArtistForAlbums.toLowerCase().trim() : null;

                            // Filter: Only albums from the selected artist
                            let filteredAlbums = albumArtistResults;
                            if (normalizedArtist) {
                                filteredAlbums = albumArtistResults.filter(album =>
                                    album.artistName && album.artistName.toLowerCase().includes(normalizedArtist)
                                );
                            }

                            bestMatch = filteredAlbums.find(album =>
                                album.collectionName && album.collectionName.toLowerCase() === normalizedQuery
                            );

                            if (!bestMatch) {
                                bestMatch = filteredAlbums.find(album =>
                                    album.collectionName && album.collectionName.toLowerCase().startsWith(normalizedQuery)
                                );
                            }

                            if (!bestMatch) {
                                const matches = filteredAlbums.filter(album =>
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
                            results = await fetchItunes(albumId, { limit: 500, country: 'US', entity: 'song', useLookup: true });
                            results = results.filter(item => item.wrapperType === 'track');
                        }
                    }
                } else {
                    const albumId = bestMatch.collectionId;
                    const coverUrl = bestMatch.artworkUrl100 || '';
                    albumArtwork = coverUrl.replace(/\d+x\d+bb(-\d+)?\.(jpg|png)/, '600x600bb.$2');
                    console.log('Album Cover URL (DE):', albumArtwork, 'für:', bestMatch.collectionName);
                    results = await fetchItunes(albumId, { limit: 500, country: 'DE', entity: 'song', useLookup: true });
                    results = results.filter(item => item.wrapperType === 'track');
                }
            } catch (err) {
                console.warn('Album search failed:', err);
                try {
                    console.log('🔍 Album fallback: Searching for songs with albumTerm for:', searchQuery);
                    results = await fetchItunes(searchQuery, { limit: 200, country: 'US', entity: 'song', attribute: 'albumTerm' });
                    console.log(`📀 Album fallback found: ${results.length} songs`);
                } catch (err2) {
                    console.error('Album fallback failed:', err2);
                }
            }
        } else {
            // Standard artist/title search
            const composerHit = await tryComposerPerformerSearch(searchQuery);
            if (composerHit && composerHit.results.length > 0) {
                results = composerHit.results;
                composerForResults = composerHit.composer;
                console.log(`🎼 Using performer map for composer: ${composerForResults}`);
            } else {
                try {
                    results = await fetchItunes(searchQuery, { limit: 100, country: 'DE' });
                } catch (errDe) {
                    console.warn('DE search failed (search mode), trying US:', errDe);
                    results = await fetchItunes(searchQuery, { limit: 100, country: 'US' });
                }
            }

            // Filter results to only include songs by the searched artist
            // This prevents songs that just have the artist name in the title from appearing
            if (results.length > 0) {
                const normalizedSearchQuery = searchQuery.toLowerCase().trim();

                // Check if this might be a classical composer search
                // Classical composers often appear in track names but not as artistName
                const hasClassicalResults = results.some(song =>
                    song.trackName && song.trackName.toLowerCase().includes(normalizedSearchQuery)
                );

                // Check if results look like classical music (orchestras, conductors, etc.)
                const looksLikeClassical = results.some(song => isClassicalLikeSong(song));

                // Filter to only keep songs by the same artist (more lenient approach)
                results = results.filter(song => {
                    if (!song.artistName) return false;
                    const artistLower = song.artistName.toLowerCase();
                    const trackLower = (song.trackName || '').toLowerCase();

                    // Accept songs if the search query matches the artist name (in either direction)
                    const artistMatch = artistLower.includes(normalizedSearchQuery) || normalizedSearchQuery.includes(artistLower);

                    // For classical music: accept all results if they look classical
                    const classicalMatch = looksLikeClassical || (hasClassicalResults && trackLower.includes(normalizedSearchQuery));

                    return artistMatch || classicalMatch;
                });

                console.log(`Filtered to ${results.length} songs by matching artist from ${normalizedSearchQuery} (classical: ${looksLikeClassical})`);
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
                    console.log('✅ Local album cover set:', albumArtwork);
                } else {
                    // Use iTunes cover in high resolution
                    const iCover = firstSong.artworkUrl600 || firstSong.artworkUrl100 || firstSong.artworkUrl60;
                    albumArtwork = iCover ? iCover.replace(/\d+x\d+bb(-\d+)?\.(jpg|png)/, '600x600bb.$2') : iCover;
                    console.log('✅ iTunes album cover set:', albumArtwork);
                }
            }
        }

        // Debug: Zeige albumArtwork Status
        if (currentSearchType === 'album') {
            console.log(`📀 Album-Mode: albumArtwork = ${albumArtwork || 'NULL'}`);
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
                    // In album mode: use the already set albumArtwork for ALL songs
                    coverUrl = albumArtwork;
                    console.log(`🎵 Song ${index + 1}: ${song.trackName} - Cover: ${coverUrl ? 'SET' : 'NULL'}`);
                } else {
                    // In normal search: individual song cover in high resolution
                    const originalCover = song.artworkUrl600 || song.artworkUrl100 || song.artworkUrl60;
                    coverUrl = originalCover ? originalCover.replace(/\d+x\d+bb(-\d+)?\.(jpg|png)/, '600x600bb.$2') : originalCover;
                }

                return {
                    id: song.trackId,
                    track: song.trackName,
                    artist: song.artistName,
                    composer: composerForResults,
                    album: song.collectionName,
                    previewUrl: (song.previewUrl || '').replace(/^http:/, 'https:'),
                    image: coverUrl,
                    genre: song.primaryGenreName || 'Unknown',
                    albumFans: song.albumFans || 0  // Will be set later for album mode
                };
            });

        gameState.songs = shuffleArray(songs);
        setDifficultyMeta(gameState.songs.length, results.length, currentSearchType === 'album' ? 'Album search' : 'Artist search');
        console.log(`${gameState.songs.length} songs loaded from: ${currentSearchType === 'album' ? 'Album' : 'Artist/Title'}`);

        // Fetch album fan counts for all songs
        if (gameState.songs.length > 0) {
            if (currentSearchType === 'album') {
                // In Album-Modus: All songs have the same album
                const firstSong = gameState.songs[0];
                const albumFans = await fetchAlbumFanCount(firstSong.album, firstSong.artist);
                gameState.songs.forEach(song => {
                    song.albumFans = albumFans;
                });
                console.log(`📀 Album "${firstSong.album}" has ${albumFans.toLocaleString()} fans`);
            } else {
                // In Track mode: Fetch fan count for each unique album
                const albumCache = new Map();
                for (const song of gameState.songs) {
                    const albumKey = `${song.album}|${song.artist}`;
                    if (!albumCache.has(albumKey)) {
                        const albumFans = await fetchAlbumFanCount(song.album, song.artist);
                        albumCache.set(albumKey, albumFans);
                        console.log(`📀 Album "${song.album}" by ${song.artist} hat ${albumFans.toLocaleString()} fans`);
                    }
                    song.albumFans = albumCache.get(albumKey);
                }
            }
        }

        // Aktualisiere Subtitle im Album-Modus
        if (currentSearchType === 'album' && songs.length > 0) {
            const albumName = songs[0].album;
            const artistName = songs[0].artist;
            setSubtitle(`Album '${albumName}' by '${artistName}'`);
        }
    } catch (error) {
        console.error('iTunes API error:', error);
        throw error;
    }
}

// Load next question
async function nextQuestion() {
    // Stop previous audio
    stopPreview();

    // Close song info popup if open
    const songInfo = document.getElementById('songInfo');
    if (songInfo) {
        songInfo.classList.remove('show');
    }

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
    gameState.firstPlayDone = false; // IMPORTANT: Reset for next song
    stopPointsCountdown(); // Ensure countdown is stopped before starting a new question
    let idx = gameState.currentQuestion;

    console.log('nextQuestion start, index:', idx, 'song:', gameState.songs[idx]);
    debugLog(`🎯 Question ${idx + 1}: Loading song...`);

    let attempts = 0;
    const maxAttempts = Math.min(8, gameState.songs.length);

    while (attempts < maxAttempts && idx < gameState.songs.length) {
        const candidate = gameState.songs[idx];
        let loadingShown = false;
        try {
            if (candidate.artist && candidate.track) {
                loadingShown = true;
                showLoadingState(`Preparing question ${idx + 1}...`);
                updateLoadingProgress(20, `Loading "${candidate.track}" by ${candidate.artist}...`);
                
                // Lade alles live von iTunes API (kein Cache)
                const fullSongData = await loadSongDataLive(candidate.artist, candidate.track);
                updateLoadingProgress(60);

                // WICHTIG: Bewahre das ursprüngliche Cover (besonders wichtig im Album-Modus!)
                if (candidate.image) {
                    fullSongData.image = candidate.image;
                    console.log('🖼️ Album cover preserved from original:', candidate.image);
                }

                updateLoadingProgress(80, 'Fetching album details...');
                
                // Check if album changed - if so, fetch new album's fan count
                if (fullSongData.album !== candidate.album) {
                    console.log(`⚠️ Album changed from "${candidate.album}" to "${fullSongData.album}" - fetching new fan count`);
                    const newAlbumFans = await fetchAlbumFanCount(fullSongData.album, fullSongData.artist);
                    fullSongData.albumFans = newAlbumFans;
                    console.log(`📀 New album has ${newAlbumFans.toLocaleString()} fans`);
                } else if (candidate.albumFans !== undefined) {
                    // Preserve album fan count from original song if album didn't change
                    fullSongData.albumFans = candidate.albumFans;
                    console.log('📀 Album fans preserved from original:', candidate.albumFans);
                }

                updateLoadingProgress(100, 'Ready!');
                gameState.currentSong = fullSongData;
            } else {
                gameState.currentSong = candidate;
            }

            if (gameState.currentSong && gameState.currentSong.previewUrl) {
                gameState.currentQuestion = idx + 1; // Nächster Song für den nächsten Aufruf
                break;
            }
        } catch (error) {
            console.error('Error loading song data, trying next:', error);
            gameState.lastError = error.message || String(error);
        } finally {
            if (loadingShown) hideLoadingState();
        }

        attempts++;
        idx++;
    }

    if (!gameState.currentSong || !gameState.currentSong.previewUrl) {
        debugLog('❌ No playable songs found', 'F6');
        showError('[F6] No playable songs found. Please try a different genre or search term.');
        endGame();
        return;
    }

    // UI aktualisieren
    updateStats();
    updatePlayTimeDisplay(); // Setze Abspielzeit-Anzeige auf 0
    displayAlbumCover();
    displayAnswers();

    // Enable play and reverse buttons for new question
    document.getElementById('playBtn').disabled = false;
    document.getElementById('reverseBtn').disabled = false;

    // Verstecke die nächste Frage Button
    document.getElementById('nextBtn').classList.remove('show');
    document.getElementById('resultMessage').textContent = '';
    document.getElementById('errorMessage').classList.remove('show');
}

// Zeige Albumcover an
function displayAlbumCover() {
    const albumCover = document.getElementById('albumCover');
    const container = document.querySelector('.container');
    const song = gameState.currentSong;

    console.log('🎨 displayAlbumCover - Album:', song.album, 'Fans:', song.albumFans);

    if (song.image) {
        albumCover.innerHTML = `<img src="${song.image}" alt="Album Cover" onerror="this.parentElement.innerHTML='<div class=&quot;cover-placeholder&quot;></div>'">`;

        // Add fan count badge if available
        if (song.albumFans && song.albumFans > 0) {
            console.log('✅ Creating badge with', song.albumFans, 'fans');
            const badge = document.createElement('div');
            badge.className = 'album-fan-badge';
            const fanCount = song.albumFans >= 1000000 ? (song.albumFans / 1000000).toFixed(1) + 'M' :
                song.albumFans >= 1000 ? (song.albumFans / 1000).toFixed(0) + 'K' :
                    song.albumFans;
            badge.textContent = fanCount;
            badge.title = `${song.albumFans.toLocaleString()} album fans`;
            albumCover.appendChild(badge);
        }
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

        // Baue finalen Antwortsatz und entferne Duplikate per Normalisierung
        answers = answers.concat(wrongAnswers.slice(0, 3));

        const uniqueAnswers = [];
        const seenNormalized = new Set();
        for (const ans of answers) {
            if (!ans) continue;
            const norm = normalizeSongTitle(ans);
            if (seenNormalized.has(norm)) continue;
            seenNormalized.add(norm);
            uniqueAnswers.push(ans);
        }
        answers = uniqueAnswers;

        // Sicherheit: falls nach Deduplizierung weniger als 4 übrig sind, mit Fallbacks auffüllen (auch dedupliziert)
        const fallbackTitles = ['Neon Nights', 'Golden Sky', 'Silent Echo', 'Velvet Road', 'Midnight Drive'];
        for (const t of fallbackTitles) {
            if (answers.length >= 4) break;
            const norm = normalizeSongTitle(t);
            const already = answers.some(a => normalizeSongTitle(a) === norm);
            if (!already) answers.push(t);
        }

        answers = shuffleArray(answers).slice(0, 4);

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
                btn.dataset.answer = answer; // Store raw answer
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

    // Disable play and reverse buttons
    document.getElementById('playBtn').disabled = true;
    document.getElementById('reverseBtn').disabled = true;

    // Do not fade out audio on guess completion, let it keep playing
    // fadeOutAndStop(3000);

    const isCorrect = answer === gameState.currentSong.track;
    const buttons = document.querySelectorAll('.answer-btn');
    const selectedBtn = buttons[index];

    // Markiere alle Buttons
    buttons.forEach((btn, i) => {
        btn.disabled = true;
        if (btn.dataset.answer === gameState.currentSong.track) {
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

        // Check if song was never played - give bonus 1700 points
        if (!gameState.firstPlayDone) {
            const bonusPoints = 1700;
            gameState.totalPoints += bonusPoints;

            // Stempel auf gewählter Antwort
            if (selectedBtn) {
                selectedBtn.dataset.stamp = `+${bonusPoints} 🎯`;
                selectedBtn.classList.add('stamp', 'stamp-correct');
            }

            const resultMsg = document.getElementById('resultMessage');
            resultMsg.textContent = `${t('answerCorrect')} +${bonusPoints} ${t('points')} 🎯 Never played bonus!`;
            resultMsg.classList.remove('incorrect');
            resultMsg.classList.add('correct');
            resultMsg.style.fontSize = '1.3em';
            resultMsg.style.animation = 'bounce-in 0.5s ease-out';
        } else {
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
        }
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

    // Zeige nächste Frage Button
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        nextBtn.classList.add('show');
        nextBtn.disabled = false;
    }
    updateStats();

    // Verstecke Punkte-Countdown Box
    const container = document.getElementById('pointsCountdown');
    if (container) {
        container.classList.remove('show');
    }
}

// Zeige Song-Informationen
function showSongInfo() {
    const song = gameState.currentSong;
    document.getElementById('infoArtist').textContent = song.artist;
    document.getElementById('infoTrack').textContent = song.track;
    document.getElementById('infoAlbum').textContent = song.album;

    const composerRow = document.getElementById('infoComposerRow');
    const composerNote = document.getElementById('infoComposerNote');
    if (composerRow && composerNote) {
        if (song.composer && song.composer !== song.artist) {
            composerRow.style.display = 'flex';
            composerNote.textContent = `${song.composer} (performed by ${song.artist})`;
        } else {
            composerRow.style.display = 'none';
            composerNote.textContent = '';
        }
    }

    console.log('Song info images:', {
        albumCover: song.albumCover,
        artworkUrl: song.artworkUrl,
        coverUrl: song.coverUrl,
        artistImageUrl: song.artistImageUrl
    });

    // Prefer album art; also use it as fallback for artist image
    const albumImg = document.getElementById('infoAlbumImage');
    const albumArt = song.image || song.albumCover || song.artworkUrl || song.coverUrl;
    if (albumArt) {
        albumImg.src = albumArt;
        albumImg.style.display = 'block';
        console.log('Album image set to:', albumArt);
    } else {
        albumImg.style.display = 'none';
        console.log('No album image available');
    }

    const artistImg = document.getElementById('infoArtistImage');
    const artistArt = song.artistImageUrl || albumArt;
    if (artistArt) {
        artistImg.src = artistArt;
        artistImg.style.display = 'block';
        console.log('Artist image set to:', artistArt);
    } else {
        artistImg.style.display = 'none';
        console.log('No artist image available');
    }

    const songInfoEl = document.getElementById('songInfo');
    const infoDetails = document.getElementById('infoDetails');

    // Reset details area on open
    if (infoDetails) {
        infoDetails.textContent = '';
        infoDetails.classList.remove('show');
    }
    songInfoEl.classList.add('show');

    // Wire buttons (stop propagation to keep popup open)
    const artistBtn = document.getElementById('infoArtistBtn');
    const albumBtn = document.getElementById('infoAlbumBtn');
    const listenBtn = document.getElementById('infoListenBtn');

    if (artistBtn) {
        artistBtn.onclick = async (e) => {
            e.stopPropagation();
            infoDetails.classList.add('show');
            infoDetails.innerHTML = 'Loading artist summary...';
            const details = await fetchArtistSummary(song.artist);
            const imgHtml = song.artistImageUrl ? `<img class="info-detail-img" src="${song.artistImageUrl}" alt="${song.artist}">` : '';
            infoDetails.innerHTML = `<div class="info-detail-row">${imgHtml}<div class="info-detail-text">${details || 'No artist summary found.'}</div></div>`;
        };
    }

    if (albumBtn) {
        albumBtn.onclick = async (e) => {
            e.stopPropagation();
            infoDetails.classList.add('show');
            infoDetails.innerHTML = 'Loading album summary...';
            const details = await fetchAlbumSummary(song.artist, song.album);
            const albumImgSrc = song.image || song.albumCover || song.artworkUrl;
            const imgHtml = albumImgSrc ? `<img class="info-detail-img" src="${albumImgSrc}" alt="${song.album}">` : '';
            infoDetails.innerHTML = `<div class="info-detail-row">${imgHtml}<div class="info-detail-text">${details || 'No album summary found.'}</div></div>`;
        };
    }

    if (listenBtn) {
        listenBtn.onclick = (e) => {
            e.stopPropagation();
            const searchQuery = encodeURIComponent(`${song.artist} ${song.track}`);
            const youtubeMusicUrl = `https://music.youtube.com/search?q=${searchQuery}`;
            window.open(youtubeMusicUrl, '_blank');
        };
    }

    // Click outside buttons closes
    songInfoEl.onclick = function (e) {
        if (e.target.tagName === 'BUTTON') return;
        this.classList.remove('show');
        stopPreview();
    };
}

function closeSongInfo() {
    document.getElementById('songInfo').classList.remove('show');
    stopPreview();
}

// Fetch a short summary from Wikipedia (single search + summary fetch to avoid noisy 404s)
async function fetchWikiSummary(title) {
    try {
        const cleaned = title.replace(/\s*&\s*/g, ' and ');
        const searchResp = await fetch(`https://en.wikipedia.org/w/rest.php/v1/search/title?q=${encodeURIComponent(cleaned)}&limit=1`);
        if (!searchResp.ok) return null;
        const searchData = await searchResp.json();
        const hit = searchData.pages && searchData.pages[0];
        if (!hit || !hit.key) return null;
        const summaryResp = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hit.key)}`);
        if (!summaryResp.ok) return null;
        const summaryData = await summaryResp.json();
        return summaryData.extract || null;
    } catch (e) {
        return null;
    }
}

async function fetchArtistSummary(artistName) {
    return fetchWikiSummary(artistName);
}

async function fetchAlbumSummary(artistName, albumName) {
    return fetchWikiSummary(`${albumName} ${artistName}`);
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
        const audioContext = getSharedAudioContext();
        if (!audioContext) return;

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
        const audioContext = getSharedAudioContext();
        if (!audioContext) return;

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
        const audioContext = getSharedAudioContext();
        if (!audioContext) return;

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
    if (gameState.isAnswered) return;

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
    audio.setAttribute('preload', 'auto');
    audio.onerror = () => {
        const mediaError = audio.error ? { code: audio.error.code, message: audio.error.message } : null;
        console.error('Audio element error:', mediaError, {
            networkState: audio.networkState,
            readyState: audio.readyState,
            src: audio.src
        });
    };

    // Setze Audio-Quelle (erzwinge https, falls noch http)
    const safeSrc = gameState.currentSong.previewUrl.replace(/^http:/, 'https:');
    audio.src = safeSrc;
    audio.currentTime = 0;
    audio.load();

    // Setze Flags zurück
    gameState.previewFinished = false;

    // Preview-Dauer aus Auswahl (Default bereits gesetzt beim Start)
    const previewDuration = gameState.previewDuration || 15;

    console.log('Versuche Preview abzuspielen:', gameState.currentSong.previewUrl);
    debugLog(`▶️ Starte Preview...`);

    // Starte Playback — mit Sicherheitsmaßnahmen gegen Abbruchfehler
    const playAttempt = () => {
        audio.play()
            .then(() => {
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
            })
            .catch(error => {
                const mediaError = audio.error ? { code: audio.error.code, message: audio.error.message } : null;
                console.error('Playback error:', error, mediaError, {
                    networkState: audio.networkState,
                    readyState: audio.readyState,
                    src: audio.src
                });
                // If it's an AbortError, retry once
                if (error.name === 'AbortError' && !playAttempt.retried) {
                    console.log('Retrying playback after AbortError...');
                    playAttempt.retried = true;
                    setTimeout(playAttempt, 100);
                } else {
                    debugLog(`❌ Playback-Fehler: ${error.message}`, 'F7');
                    alert('[F7] ' + t('errorPlayback'));
                    stopPreview();
                }
            });
    };

    // Starte Playback sofort
    playAttempt();
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
    audio.volume = 1.0; // Reset volume

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

    // Stoppe fade-out interval if any
    if (gameState.fadeOutInterval) {
        clearInterval(gameState.fadeOutInterval);
        gameState.fadeOutInterval = null;
    }

    // Aktiviere Play-Button wieder
    if (playBtn) playBtn.disabled = false;
    stopBtn.classList.remove('active');
    document.getElementById('progressFill').style.width = '0%';
    updateTimeDisplay(0, 15);
}

// Fade out audio over duration (in milliseconds) and then stop
function fadeOutAndStop(duration = 3000) {
    const audio = document.getElementById('audioPlayer');

    // If audio is not playing, just stop immediately
    if (audio.paused || !audio.src) {
        stopPreview();
        return;
    }

    const startVolume = audio.volume;
    const fadeSteps = 60; // 60 steps for smooth fade
    const stepDuration = duration / fadeSteps;
    const volumeDecrement = startVolume / fadeSteps;

    let currentStep = 0;

    gameState.fadeOutInterval = setInterval(() => {
        currentStep++;
        const newVolume = Math.max(0, startVolume - (volumeDecrement * currentStep));
        audio.volume = newVolume;

        if (currentStep >= fadeSteps || newVolume <= 0) {
            clearInterval(gameState.fadeOutInterval);
            gameState.fadeOutInterval = null;
            stopPreview();
        }
    }, stepDuration);
}

// Entfernt: disableDurationButtons - nicht mehr benötigt

// Reverse Preview abspielen
async function playPreviewReverse() {
    if (gameState.isAnswered) return;

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
        reverseCtx = getSharedAudioContext();
        if (reverseCtx && reverseCtx.state === 'suspended') {
            await reverseCtx.resume();
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

// Update difficulty/pool tracking in state
function setDifficultyMeta(questionCount, poolSize, label = '') {
    const safeQuestions = Math.max(1, questionCount || 0);
    const safePool = Math.max(safeQuestions, poolSize || safeQuestions);
    gameState.questionCount = safeQuestions;
    gameState.candidatePoolSize = safePool;
    gameState.difficultyRatio = safePool ? Math.min(1, safeQuestions / safePool) : 0;
    gameState.difficultyLabel = label || `${safeQuestions}/${safePool}`;
}

// Update Statistiken
function updateStats() {
    const totalQuestions = gameState.songs ? gameState.songs.length : 0;
    const plannedQuestions = gameState.questionCount || totalQuestions;
    const poolSize = gameState.candidatePoolSize || plannedQuestions;
    const difficultyRatio = poolSize ? Math.min(1, plannedQuestions / poolSize) : 0;
    const difficultyPercent = poolSize ? Math.round(difficultyRatio * 100) : 0;
    const difficultyLabel = gameState.difficultyLabel || `${plannedQuestions}/${poolSize}`;
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

    const poolEl = document.getElementById('candidatePoolDisplay');
    if (poolEl) {
        poolEl.textContent = poolSize ? `${plannedQuestions}/${poolSize}` : `${plannedQuestions}`;
    }

    const difficultyEl = document.getElementById('difficultyDisplay');
    if (difficultyEl) {
        if (poolSize) {
            difficultyEl.textContent = `${difficultyLabel} • ${difficultyPercent}%`;
        } else {
            difficultyEl.textContent = '-';
        }
    }
}

// Skip to menu without showing game-over screen
function skipToMenu() {
    stopPointsCountdown();
    stopPreview();

    // Remove cover background
    const container = document.querySelector('.container');
    if (container) {
        container.classList.remove('cover-filled');
        container.style.backgroundImage = '';
        container.style.backgroundSize = '';
        container.style.backgroundPosition = '';
    }

    // Return to menu
    document.getElementById('quizScreen').style.display = 'none';
    document.getElementById('setupScreen').style.display = 'block';
    document.body.classList.remove('game-over-active');
    document.getElementById('gameOverScreen').classList.remove('show');
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
        // Play winning sound and add pulsating animation for successful games
        playWinSound();
        document.getElementById('gameOverScreen').classList.add('pulsating');
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

function showLoadingState(text = 'Loading songs...') {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }
    const loadingText = document.getElementById('loadingText');
    if (loadingText) {
        loadingText.textContent = text;
    }
    updateLoadingProgress(0);
    document.getElementById('answersContainer').innerHTML = '';
}

function hideLoadingState() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
    updateLoadingProgress(0);
}

function updateLoadingProgress(percent, text = null) {
    const progressFill = document.getElementById('loadingProgressFill');
    if (progressFill) {
        progressFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    }
    if (text) {
        const loadingText = document.getElementById('loadingText');
        if (loadingText) {
            loadingText.textContent = text;
        }
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = '⚠️ ' + message;
    errorDiv.classList.add('show');
}

// Verhindere mehrfaches Abspielen
document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
        stopPreview();
    }
});

/**
 * HIGHSCORE SYSTEM
 */

// Generiere UUID v4
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
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

// Öffne my Scores - wiederverwendet Leaderboard Modal mit Player-Filter
function openPlayerSearchModal() {
    const playerName = localStorage.getItem('playerName') || 'Anon';
    openLeaderboardModal('Global', playerName);
}

// Open Bubble Category Modal
async function openBubbleCategoryModal() {
    const modal = document.getElementById('bubbleCategoryModal');
    const grid = document.getElementById('bubbleCategoryGrid');

    if (!modal || !grid) return;

    // Build category options from genres.json
    const categories = [];

    // Add genre categories (excluding specialized genres from bubble selector)
    if (genresData.genres && genresData.genres.length > 0) {
        const excludedGenres = ['Movie Soundtrack', 'Disney', 'Volksmusik'];
        genresData.genres.forEach(genre => {
            if (!excludedGenres.includes(genre)) {
                categories.push({ name: genre, type: 'genre' });
            }
        });
    }

    // Add special genres (Jazz, Blues, Country, etc.)
    if (genresData.specialGenres) {
        Object.keys(genresData.specialGenres).forEach(key => {
            const genreData = genresData.specialGenres[key];
            categories.push({
                name: genreData.name || key,
                type: 'specialGenre',
                key: key
            });
        });
    }

    // Add country categories
    if (genresData.countries) {
        Object.keys(genresData.countries).forEach(countryKey => {
            const countryData = genresData.countries[countryKey];
            categories.push({
                name: countryData.name,
                value: countryKey,
                type: 'country'
            });
        });
    }

    // Classical categories removed from bubble selector
    // (keeping classical-performers.json and mapping functionality for potential future use)

    // Add decades
    if (genresData.decades && genresData.decades.length > 0) {
        genresData.decades.forEach(decade => {
            categories.push({ name: decade, type: 'decade' });
        });
    }

    // Create buttons
    grid.innerHTML = '';
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'modal-btn modal-btn-primary';
        btn.textContent = cat.name;
        btn.style.width = '100%';
        btn.style.padding = '12px 8px';
        btn.style.fontSize = '0.9em';
        btn.onclick = () => selectBubbleCategory(cat);
        grid.appendChild(btn);
    });

    modal.classList.add('show');
}

// Close Bubble Category Modal
function closeBubbleCategoryModal() {
    const modal = document.getElementById('bubbleCategoryModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Select a bubble category and load artists
async function selectBubbleCategory(category) {
    closeBubbleCategoryModal();

    try {
        let artists = [];

        if (category.type === 'genre') {
            // For music genres (Pop, Rock, etc.), use ArtistsList.json as base
            // We'll filter by popularity since we don't have genre-specific artist lists
            console.log(`🫧 Loading artists for genre "${category.name}" (using general artist list)...`);
            const allArtists = await loadArtistNames();
            artists = allArtists.slice(0, 150); // Take more for better filtering
        } else if (category.type === 'specialGenre') {
            // Special genres (Jazz, Blues, Country, etc.) have artist lists in genres.json
            const genreData = genresData.specialGenres[category.key];
            if (genreData && genreData.artists) {
                artists = genreData.artists;
                console.log(`🫧 Loaded ${artists.length} artists from ${category.name}`);
            } else {
                console.log(`⚠️ No artist data for ${category.name}`);
                artists = [];
            }
        } else if (category.type === 'country') {
            // Countries have artist lists directly in genres.json
            const countryKey = (category.value || category.name).toLowerCase();
            const countryData = genresData.countries[countryKey];
            if (countryData && countryData.artists) {
                artists = countryData.artists;
                console.log(`🫧 Loaded ${artists.length} artists from ${category.name}`);
            } else {
                console.log(`⚠️ No artist data for country ${category.name}`);
                artists = [];
            }
        } else if (category.type === 'classical') {
            // Load from classical subcategory in genres.json
            const classicalData = genresData.classical[category.key || category.name];
            if (classicalData) {
                // Check if it's a period category (has 'artists' property) or traditional list
                artists = classicalData.artists || classicalData;
                console.log(`🫧 Loaded ${artists.length} ${category.name} artists`);
            } else {
                console.log(`⚠️ No artist data for ${category.name}`);
                artists = [];
            }
            // detect mapping categories (composer/opera/operetta)
            const lower = (category.name || '').toLowerCase();
            const key = (category.key || category.name || '').toLowerCase();
            if ((lower.includes('operett') || lower.includes('operetta') || key === 'operette') && mappingOperettas) {
                // Use operettas mapping keys as bubbles — filter only those with recordings
                artists = Object.keys(mappingOperettas || {}).filter(k =>
                    Array.isArray(mappingOperettas[k]) && mappingOperettas[k].length > 0
                );
                mappingActive = true;
                mappingType = 'operetta';
                console.log(`🎼 Loaded ${artists.length} Operetta mappings (with recordings)`);
            } else if ((lower.includes('opera') || key === 'oper') && mappingOperas) {
                // Use operas mapping keys as bubbles — filter only those with recordings
                artists = Object.keys(mappingOperas || {}).filter(k =>
                    Array.isArray(mappingOperas[k]) && mappingOperas[k].length > 0
                );
                mappingActive = true;
                mappingType = 'opera';
                console.log(`🎼 Loaded ${artists.length} Opera mappings (with recordings)`);
            } else if ((lower.includes('kompon') || lower.includes('composer') || lower.includes('componist') || key === 'komponist') && mappingComposers) {
                // Use composers mapping keys as bubbles — filter only those with recordings
                artists = Object.keys(mappingComposers || {}).filter(k =>
                    Array.isArray(mappingComposers[k]) && mappingComposers[k].length > 0
                );
                mappingActive = true;
                mappingType = 'composer';
                console.log(`🎼 Loaded ${artists.length} Composer mappings (with recordings)`);
            } else {
                // Not a mapping category
                mappingActive = false;
                mappingType = null;
            }
        } else if (category.type === 'decade') {
            // Load artists from songs.json filtered by decade
            const songsResponse = await fetch('json/songs.json', { cache: 'no-store' });
            const songsData = await songsResponse.json();
            const decadeSongs = songsData.filter(song => {
                const g = song.genre;
                return g === category.name || (Array.isArray(g) && g.includes(category.name));
            });
            const uniqueArtists = [...new Set(decadeSongs.map(song => song.artist))];
            artists = uniqueArtists;

            // Fallback for decades without artists in songs.json
            if (artists.length === 0) {
                const fallbackMap = {
                    '1940s': [
                        'Frank Sinatra',
                        'Bing Crosby',
                        'Ella Fitzgerald',
                        'Duke Ellington',
                        'Glenn Miller',
                        'Billie Holiday',
                        'Nat King Cole'
                    ],
                    '1950s': [
                        'Elvis Presley',
                        'Chuck Berry',
                        'Little Richard',
                        'Buddy Holly',
                        'Ray Charles',
                        'Fats Domino',
                        'The Platters'
                    ]
                };
                const fallback = fallbackMap[category.name] || [];
                if (fallback.length) {
                    console.warn(`No artists in songs.json for ${category.name}; using curated fallback list`);
                    artists = fallback;
                }
            }

            console.log(`🫧 Loaded ${artists.length} artists from ${category.name}`);
        }

        if (artists.length === 0) {
            showError(`No artists found for ${category.name}`);
            return;
        }

        // Fetch Deezer data for all artists to get fan counts and sort by popularity
        console.log(`🫧 Fetching popularity data for ${artists.length} artists...`);
        const artistsWithFans = await Promise.all(
            artists.map(async (artistName) => {
                const data = await fetchArtistImageFromDeezer(artistName);
                return {
                    name: artistName,
                    fans: data.fans || 0,
                    image: data.image
                };
            })
        );

        // Sort by fan count (most popular first)
        artistsWithFans.sort((a, b) => b.fans - a.fans);

        // Take top 80 most popular
        const topArtists = artistsWithFans.slice(0, 80).map(a => a.name);

        // Update global artistNames and restart bubbles
        artistNames = topArtists;
        currentBubbleCategory = category.name;
        console.log(`🫧 Showing top ${artistNames.length} popular artists from "${category.name}"`);

        // Update category label
        const categoryLabel = document.getElementById('bubbleCategoryLabel');
        if (categoryLabel) {
            categoryLabel.textContent = `🫧 Bubbles: ${category.name} (${artistNames.length} artists)`;
            categoryLabel.style.display = 'block';
        }

        // Restart bubbles with new artist list
        stopArtistBubbles();
        startArtistBubbles();

    } catch (error) {
        console.error('Error loading bubble category:', error);
        showError('Error loading artists for this category');
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

    // Sortiere nach Punkten (fallback auf totalPoints)
    const sorted = [...scores].sort((a, b) => {
        const ap = (a.points ?? a.totalPoints ?? 0);
        const bp = (b.points ?? b.totalPoints ?? 0);
        return bp - ap; // absteigend
    });
    const topScores = sorted; // Show all scores

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

async function openLeaderboardModal(gameMode, playerFilter = null) {
    const modal = document.getElementById('leaderboardModal');
    const titleEl = document.getElementById('leaderboardModalTitle');
    const listEl = document.getElementById('leaderboardModalList');
    if (!modal || !listEl) return;

    let scores = await loadLeaderboard(gameMode);
    let allGlobalScores = null;
    
    // If filtering by player or gameMode, load all global scores for ranking calculation
    if (playerFilter || gameMode !== 'Global') {
        allGlobalScores = await loadLeaderboard('Global');
        if (playerFilter) {
            scores = scores.filter(score => score.username === playerFilter);
        }
    }
    
    if (titleEl) {
        const scoreCount = scores ? scores.length : 0;
        const backBtn = (gameMode !== 'Global' || playerFilter) ? `<button onclick="openLeaderboardModal('Global')" style="margin-left: 10px; padding: 4px 10px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.7em;">← Show All</button>` : '';
        const titlePrefix = playerFilter ? `my Scores – ${gameMode}` : `Highscores – ${gameMode}`;
        titleEl.innerHTML = `${titlePrefix}${backBtn}<br><small style="font-size: 0.65em; font-weight: 400; color: #888;">${scoreCount} registered score${scoreCount !== 1 ? 's' : ''}</small>`;
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
                const totalQuestions = score.totalQuestions || score.questionCount || score.questions || 0;
                const poolSize = score.candidatePoolSize || score.poolSize || score.songPoolSize || 0;
                const difficultyMeta = (poolSize && totalQuestions)
                    ? `${totalQuestions}/${poolSize} pool (${Math.round((totalQuestions / poolSize) * 100)}%)`
                    : '';
                const metaParts = [modeLabel];
                if (difficultyMeta) metaParts.push(difficultyMeta);
                if (date) metaParts.push(date);
                const metaText = metaParts.join(' • ');
                
                // Calculate global rank if filtering (by player or gameMode)
                let rank = idx + 1;
                if (allGlobalScores) {
                    rank = allGlobalScores.filter(s => (s.points ?? s.totalPoints ?? 0) > points).length + 1;
                }
                
                // Make item clickable to filter by game mode (only in Global view without player filter)
                const clickHandler = gameMode === 'Global' && !playerFilter && score.gameMode ? `onclick="openLeaderboardModal('${score.gameMode.replace(/'/g, "\\'")}')" style="cursor: pointer;" title="Click to filter by: ${score.gameMode}"` : '';
                return `
                    <li class="leaderboard-modal-item" ${clickHandler}>
                        <span class="leaderboard-modal-rank">#${rank}</span>
                        <div>
                            <div class="leaderboard-modal-name">${playerDisplay}</div>
                            <div class="leaderboard-modal-meta">${metaText}</div>
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
    const questionCount = gameState.questionCount || answeredQuestions;
    const candidatePoolSize = gameState.candidatePoolSize || questionCount;
    const difficultyRatio = candidatePoolSize ? Math.min(1, questionCount / candidatePoolSize) : 0;
    const difficultyLabel = gameState.difficultyLabel || `${questionCount}/${candidatePoolSize}`;

    // Only save if more than 9 questions were answered
    if (answeredQuestions <= 9) {
        console.log('⚠️ Score not saved: Less than 10 questions answered');
        return false;
    }

    console.log('💾 Saving score:', {
        playerName,
        playerId,
        gameMode,
        points: finalScore,
        totalQuestions: answeredQuestions,
        correctAnswers,
        candidatePoolSize,
        questionCount,
        difficultyRatio,
        difficultyLabel
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
                correctAnswers: correctAnswers,
                candidatePoolSize,
                questionCount,
                difficultyRatio,
                difficultyLabel
            })
        });

        const data = await res.json();

        if (data.success) {
            console.log('✅ Score saved:', data.score);
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
        return searchQuery ? `Songs by ${searchQuery}` : 'Free Choice (iTunes Search)';
    }

    return 'Genre';
}

// Rufe initializePlayerName beim Laden auf
document.addEventListener('DOMContentLoaded', function () {
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
