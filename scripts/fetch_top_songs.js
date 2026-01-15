const https = require('https');
const fs = require('fs');
const path = require('path');

const ARTISTS_FILE = path.join(__dirname, '..', 'json', 'ArtistsList.json');
const SONGS_FILE = path.join(__dirname, '..', 'json', 'songs.json');
const BACKUP_FILE = path.join(__dirname, '..', 'json', 'songs.json.bak');

function searchItunes(term, limit = 200, country='US') {
  return new Promise((resolve, reject) => {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=${limit}&country=${country}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.results || []);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function fetchTopSongsForArtist(artistName, want=20) {
  try {
    const results = await searchItunes(artistName, 200, 'US');
    const seen = new Set();
    const songs = [];
    for (const r of results) {
      if (!r.trackName || !r.previewUrl) continue;
      const trackKey = `${(r.artistName||'').toLowerCase()}||${r.trackName.toLowerCase()}`;
      if (seen.has(trackKey)) continue;
      seen.add(trackKey);
      songs.push({
        artist: r.artistName || artistName,
        track: r.trackName,
        genre: r.primaryGenreName || '',
        previewUrl: (r.previewUrl || '').replace(/^http:/, 'https:')
      });
      if (songs.length >= want) break;
    }
    return songs;
  } catch (err) {
    console.warn('Error searching iTunes for', artistName, err.message);
    return [];
  }
}

(async function main(){
  try {
    if (!fs.existsSync(ARTISTS_FILE)) {
      console.error('ArtistsList.json not found at', ARTISTS_FILE);
      process.exit(1);
    }

    const artistsJson = JSON.parse(fs.readFileSync(ARTISTS_FILE, 'utf8'));
    // artists may be in different arrays inside file; try to collect known arrays
    let artistList = [];
    if (Array.isArray(artistsJson.famous_song_interpreters)) artistList = artistList.concat(artistsJson.famous_song_interpreters);
    if (Array.isArray(artistsJson.recent)) artistList = artistList.concat(artistsJson.recent);
    if (Array.isArray(artistsJson.popular)) artistList = artistList.concat(artistsJson.popular);
    // fallback: if the root is an array
    if (Array.isArray(artistsJson) && artistList.length === 0) artistList = artistsJson;

    // Deduplicate and limit (avoid enormous run)
    artistList = [...new Set(artistList)].filter(Boolean);
    console.log('Artists to process:', artistList.length);

    // Load existing songs
    let existingSongs = [];
    if (fs.existsSync(SONGS_FILE)) {
      try { existingSongs = JSON.parse(fs.readFileSync(SONGS_FILE, 'utf8')); } catch(e){ console.warn('Could not parse songs.json, starting empty'); existingSongs = []; }
    }

    const existingSet = new Set(existingSongs.map(s => `${(s.artist||'').toLowerCase()}||${(s.track||'').toLowerCase()}`));

    // Backup existing songs
    if (fs.existsSync(SONGS_FILE)) {
      fs.copyFileSync(SONGS_FILE, BACKUP_FILE);
      console.log('Backup written to', BACKUP_FILE);
    }

    // For each artist, fetch up to 20 tracks and merge if not present
    for (const artist of artistList) {
      console.log('\n→ Processing artist:', artist);
      const top = await fetchTopSongsForArtist(artist, 20);
      console.log(`  Found ${top.length} candidate tracks for ${artist}`);
      let addedCount = 0;
      for (const t of top) {
        const key = `${(t.artist||'').toLowerCase()}||${(t.track||'').toLowerCase()}`;
        if (existingSet.has(key)) continue;
        existingSongs.push(t);
        existingSet.add(key);
        addedCount++;
      }
      console.log(`  Added ${addedCount} new tracks for ${artist}`);
      // polite short delay to avoid hammering API
      await new Promise(r => setTimeout(r, 300));
    }

    // Write merged songs back
    fs.writeFileSync(SONGS_FILE, JSON.stringify(existingSongs, null, 2), 'utf8');
    console.log('\nDone. Total songs now:', existingSongs.length);
    console.log('Original songs backed up to', BACKUP_FILE);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
})();
