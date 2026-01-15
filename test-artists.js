const https = require('https');

function searchItunes(term) {
  return new Promise((resolve, reject) => {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=10&country=DE`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`Search for "${term}": ${result.results.length} results`);
          if (result.results.length > 0) {
            result.results.slice(0, 3).forEach((song, i) => {
              console.log(`  ${i+1}. ${song.artistName} - ${song.trackName} (preview: ${!!song.previewUrl})`);
            });
          }
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function testArtists() {
  const artists = ['Antonín Dvořák', 'Gustav Mahler', 'Ludwig van Beethoven', 'Taylor Swift'];

  for (const artist of artists) {
    try {
      await searchItunes(artist);
      console.log('');
    } catch (e) {
      console.error(`Error searching ${artist}:`, e.message);
    }
  }
}

testArtists();