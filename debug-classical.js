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
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function testClassicalFiltering() {
  const searchQuery = 'Antonín Dvořák';
  const normalizedSearchQuery = searchQuery.toLowerCase().trim();

  console.log(`Testing search for: "${searchQuery}"`);
  console.log(`Normalized: "${normalizedSearchQuery}"`);

  const result = await searchItunes(searchQuery);
  console.log(`\nFound ${result.results.length} results`);

  // Check if this might be a classical composer search
  const hasClassicalResults = result.results.some(song =>
    song.trackName && song.trackName.toLowerCase().includes(normalizedSearchQuery)
  );
  console.log(`Has classical results (track contains composer): ${hasClassicalResults}`);

  // Check if results look like classical music (orchestras, conductors, etc.)
  const looksLikeClassical = result.results.some(song => {
    const artist = (song.artistName || '').toLowerCase();
    const genre = (song.primaryGenreName || '').toLowerCase();
    return genre.includes('classical') ||
           artist.includes('philharmon') ||
           artist.includes('orchestra') ||
           artist.includes('symphony') ||
           artist.includes('chamber') ||
           artist.includes('quartet') ||
           artist.includes('piano') && artist.includes('solo');
  });
  console.log(`Looks like classical music: ${looksLikeClassical}`);

  // Apply filtering like the game does
  const filtered = result.results.filter(song => {
    if (!song.artistName) return false;
    const artistLower = song.artistName.toLowerCase();
    const trackLower = (song.trackName || '').toLowerCase();

    // Accept songs if the search query matches the artist name (in either direction)
    const artistMatch = artistLower.includes(normalizedSearchQuery) || normalizedSearchQuery.includes(artistLower);

    // For classical music: accept all results if they look classical
    const classicalMatch = looksLikeClassical || (hasClassicalResults && trackLower.includes(normalizedSearchQuery));

    console.log(`Song: "${song.artistName}" - "${song.trackName}" (genre: ${song.primaryGenreName})`);
    console.log(`  Artist match: ${artistMatch}, Classical match: ${classicalMatch}, Preview: ${!!song.previewUrl}`);

    return artistMatch || classicalMatch;
  });

  console.log(`\nAfter filtering: ${filtered.length} results`);

  // Check final results with previews
  const withPreviews = filtered.filter(song => song.previewUrl);
  console.log(`With previews: ${withPreviews.length} results`);
}

testClassicalFiltering();