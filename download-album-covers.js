const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Lade AlbumList.json
const albumListPath = path.join(__dirname, 'AlbumList.json');
console.log('📂 Lese Datei:', albumListPath);

let albumList = [];
try {
    const fileContent = fs.readFileSync(albumListPath, 'utf-8');
    console.log('📄 Dateiinhalt Länge:', fileContent.length);
    albumList = JSON.parse(fileContent);
    console.log('✅ AlbumList geladen:', albumList.length, 'Alben\n');
} catch (error) {
    console.error('❌ Fehler beim Laden von AlbumList.json:', error.message);
    process.exit(1);
}

// Erstelle covers Verzeichnis falls nicht vorhanden
const coversDir = path.join(__dirname, 'covers');
if (!fs.existsSync(coversDir)) {
    fs.mkdirSync(coversDir, { recursive: true });
    console.log('📁 Verzeichnis erstellt: covers/');
}

// Downloade Cover für jedes Album
async function downloadCover(album, artist, index, total) {
    try {
        // Generiere Dateiname
        const safeName = `${album.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
        const filePath = path.join(coversDir, safeName);

        // Überspringe wenn bereits vorhanden
        if (fs.existsSync(filePath)) {
            console.log(`⏭️  [${index + 1}/${total}] ${album} - existiert bereits`);
            return { album, artist, filename: safeName, status: 'skipped' };
        }

        // Suche Album auf iTunes
        const searchQuery = `${album} ${artist}`.replace(/[^\w\s]/g, '');
        const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&entity=album&limit=1&media=music&country=US`;

        return new Promise((resolve, reject) => {
            https.get(searchUrl, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const results = JSON.parse(data);
                        if (results.results && results.results.length > 0) {
                            const albumData = results.results[0];
                            const artworkUrl = albumData.artworkUrl100 || albumData.artworkUrl60;
                            
                            if (artworkUrl) {
                                // Konvertiere zu 600x600
                                const highResUrl = artworkUrl.replace(/\d+x\d+bb(-\d+)?\.(jpg|png)/, '600x600bb.$2');
                                
                                // Downloade Cover
                                const protocol = highResUrl.startsWith('https') ? https : http;
                                protocol.get(highResUrl, (coverRes) => {
                                    const file = fs.createWriteStream(filePath);
                                    coverRes.pipe(file);
                                    
                                    file.on('finish', () => {
                                        file.close();
                                        console.log(`✅ [${index + 1}/${total}] ${album} - heruntergeladen`);
                                        resolve({ album, artist, filename: safeName, status: 'downloaded' });
                                    });
                                    
                                    file.on('error', (err) => {
                                        fs.unlink(filePath, () => {});
                                        console.error(`❌ [${index + 1}/${total}] ${album} - Fehler beim Download:`, err.message);
                                        resolve({ album, artist, filename: safeName, status: 'error' });
                                    });
                                }).on('error', (err) => {
                                    console.error(`❌ [${index + 1}/${total}] ${album} - Cover URL Fehler:`, err.message);
                                    resolve({ album, artist, filename: safeName, status: 'error' });
                                });
                            } else {
                                console.log(`⚠️  [${index + 1}/${total}] ${album} - kein Cover gefunden`);
                                resolve({ album, artist, filename: safeName, status: 'no_cover' });
                            }
                        } else {
                            console.log(`⚠️  [${index + 1}/${total}] ${album} - Album nicht gefunden`);
                            resolve({ album, artist, filename: safeName, status: 'not_found' });
                        }
                    } catch (err) {
                        console.error(`❌ [${index + 1}/${total}] ${album} - Parse Fehler:`, err.message);
                        resolve({ album, artist, filename: safeName, status: 'parse_error' });
                    }
                });
            }).on('error', (err) => {
                console.error(`❌ [${index + 1}/${total}] ${album} - Suche Fehler:`, err.message);
                resolve({ album, artist, filename: safeName, status: 'search_error' });
            });
        });
    } catch (error) {
        console.error(`❌ Error processing ${album}:`, error.message);
        return { album, artist, status: 'error' };
    }
}

// Sequentiell herunterladen mit Verzögerung um Rate Limiting zu vermeiden
async function downloadAllCovers() {
    console.log(`\n🎵 Starte Download von ${albumList.length} Album-Covern...\n`);
    
    const results = [];
    for (let i = 0; i < albumList.length; i++) {
        const { album, artist } = albumList[i];
        const result = await downloadCover(album, artist, i, albumList.length);
        results.push(result);
        
        // Verzögerung zwischen Requests (1000ms) um Rate Limiting zu vermeiden
        if (i < albumList.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    // Statistik
    const stats = {
        downloaded: results.filter(r => r.status === 'downloaded').length,
        skipped: results.filter(r => r.status === 'skipped').length,
        not_found: results.filter(r => r.status === 'not_found').length,
        errors: results.filter(r => r.status === 'error' || r.status === 'search_error' || r.status === 'parse_error').length
    };
    
    console.log(`\n📊 Zusammenfassung:`);
    console.log(`   ✅ Heruntergeladen: ${stats.downloaded}`);
    console.log(`   ⏭️  Übersprungen: ${stats.skipped}`);
    console.log(`   ⚠️  Nicht gefunden: ${stats.not_found}`);
    console.log(`   ❌ Fehler: ${stats.errors}`);
    console.log(`\n✨ Fertig! Cover befinden sich im Ordner: ./covers/\n`);
}

// Starte Download
downloadAllCovers().catch(console.error);
