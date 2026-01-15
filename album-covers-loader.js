// Lade lokale Album-Cover aus dem covers/ Verzeichnis
async function loadLocalAlbumCovers() {
    try {
        const albumListPath = './json/AlbumList.json';
        const response = await fetch(albumListPath);
        const albums = await response.json();
        
        // Erstelle Map von Album -> lokaler Cover-Pfad
        const coverMap = {};
        
        for (const { album, artist } of albums) {
            // Generiere Dateiname (gleiche Logik wie im Download-Script)
            const safeName = album.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.jpg';
            const coverPath = `/covers/${safeName}`;
            coverMap[album.toLowerCase()] = coverPath;
        }
        
        console.log(`📚 Album-Cover Map erstellt: ${Object.keys(coverMap).length} Einträge`);
        return coverMap;
    } catch (error) {
        console.error('Fehler beim Laden der Album-Cover Map:', error);
        return {};
    }
}

// Globale Variable für Cover-Map
let albumCoverMap = {};

// Initialisiere Cover-Map beim Start
loadLocalAlbumCovers().then(map => {
    albumCoverMap = map;
    console.log('✅ Album-Cover Map bereit');
});

// Hilfsfunktion um lokales Cover zu bekommen
function getLocalCoverUrl(albumName) {
    return albumCoverMap[albumName.toLowerCase()] || null;
}
