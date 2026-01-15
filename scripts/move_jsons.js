const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const jsonDir = path.join(root, 'json');
if (!fs.existsSync(jsonDir)) fs.mkdirSync(jsonDir);

const filesToMove = [
  'songs.json',
  'songs.json.bak',
  'classical-performers.json',
  'genres.json',
  'ArtistsList.json',
  'AlbumList.json',
  'hot-10-unique.json',
  'highscores.json',
  'translations.json',
  'version.json'
];

for (const f of filesToMove) {
  const src = path.join(root, f);
  const dest = path.join(jsonDir, f);
  if (fs.existsSync(src)) {
    try {
      fs.renameSync(src, dest);
      console.log('Moved', f);
    } catch (e) {
      console.error('Failed to move', f, e.message);
    }
  } else {
    console.log('Not found, skipping', f);
  }
}

// Move mappings into json/mappings
const mappingsSrc = path.join(root, 'mappings');
const mappingsDest = path.join(jsonDir, 'mappings');
if (fs.existsSync(mappingsSrc)) {
  if (!fs.existsSync(mappingsDest)) fs.mkdirSync(mappingsDest);
  for (const f of fs.readdirSync(mappingsSrc)) {
    if (f.endsWith('.json')) {
      try {
        fs.renameSync(path.join(mappingsSrc, f), path.join(mappingsDest, f));
        console.log('Moved mapping', f);
      } catch (e) {
        console.error('Failed to move mapping', f, e.message);
      }
    }
  }
  // remove old mappings dir if empty
  try { fs.rmdirSync(mappingsSrc); } catch(e) {}
} else {
  console.log('No mappings directory found, skipping');
}

console.log('Done');
