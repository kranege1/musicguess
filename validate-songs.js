// Script zum Validieren welche Songs Previews haben
const fs = require('fs');

async function checkPreview(artist, track) {
    try {
        const searchTerm = `${artist} ${track}`;
        const encodedQuery = encodeURIComponent(searchTerm);
        const url = `https://itunes.apple.com/search?term=${encodedQuery}&entity=song&limit=10&media=music`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        // Finde Songs mit Preview
        const songsWithPreview = data.results.filter(result => 
            result.previewUrl && 
            result.trackName && 
            result.artistName
        );
        
        if (songsWithPreview.length === 0) {
            return false;
        }
        
        // Versuche besten Match zu finden
        const exactMatch = songsWithPreview.find(result => 
            result.trackName.toLowerCase().includes(track.toLowerCase()) &&
            result.artistName.toLowerCase().includes(artist.toLowerCase())
        );
        
        return exactMatch ? true : songsWithPreview.length > 0;
    } catch (error) {
        console.error(`Error checking ${artist} - ${track}:`, error);
        return false;
    }
}

async function validateSongs() {
    console.log('Lade songs.json...');
    const songs = JSON.parse(fs.readFileSync('json/songs.json', 'utf8'));
    
    console.log(`Überprüfe ${songs.length} Songs...\n`);
    
    const validSongs = [];
    const invalidSongs = [];
    
    for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        const hasPreview = await checkPreview(song.artist, song.track);
        
        if (hasPreview) {
            validSongs.push(song);
            console.log(`✅ ${i + 1}/${songs.length}: ${song.artist} - ${song.track}`);
        } else {
            invalidSongs.push(song);
            console.log(`❌ ${i + 1}/${songs.length}: ${song.artist} - ${song.track} (KEINE PREVIEW)`);
        }
        
        // Warte kurz um API nicht zu überlasten
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n=== ERGEBNIS ===`);
    console.log(`✅ Songs mit Preview: ${validSongs.length}`);
    console.log(`❌ Songs ohne Preview: ${invalidSongs.length}`);
    
    // Nach Genre gruppieren
    const byGenre = {};
    validSongs.forEach(song => {
        if (!byGenre[song.genre]) byGenre[song.genre] = [];
        byGenre[song.genre].push(song);
    });
    
    console.log(`\n=== Pro Genre ===`);
    Object.keys(byGenre).sort().forEach(genre => {
        console.log(`${genre}: ${byGenre[genre].length} Songs`);
    });
    
    // Speichere validierte Songs
    fs.writeFileSync('json/songs-validated.json', JSON.stringify(validSongs, null, 2));
    console.log(`\n✅ Validierte Songs gespeichert in json/songs-validated.json`);
    
    // Speichere auch die invaliden zur Info
    fs.writeFileSync('json/songs-invalid.json', JSON.stringify(invalidSongs, null, 2));
    console.log(`ℹ️  Ungültige Songs gespeichert in json/songs-invalid.json`);
}

validateSongs();
