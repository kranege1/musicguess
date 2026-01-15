const fs = require('fs');
const path = require('path');

const SONGS_PATH = path.join(__dirname, '..', 'json', 'songs.json');
const CLASSICAL_MAP_PATH = path.join(__dirname, '..', 'json', 'classical-performers.json');
const OUT_DIR = path.join(__dirname, '..', 'json', 'mappings');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

const songs = JSON.parse(fs.readFileSync(SONGS_PATH, 'utf8'));
const classical = JSON.parse(fs.readFileSync(CLASSICAL_MAP_PATH, 'utf8'));

function normalize(s) {
  return (s || '').toLowerCase();
}

function containsAny(text, arr) {
  const t = normalize(text);
  return arr.some(a => t.includes(normalize(a)));
}

const composersOutput = {};
const worksOutput = {};

// Collect per composer
for (const composer of Object.keys(classical)) {
  const entry = { composer, tracks: [] };
  const hints = classical[composer].searchHints || [];

  // gather tracks where track/artist/album contains composer name or any hint
  for (const s of songs) {
    if (!s.previewUrl) continue;
    const hay = `${s.track || ''} ${s.artist || ''} ${s.album || ''}`;
    if (hay.toLowerCase().includes(composer.toLowerCase()) || containsAny(hay, hints)) {
      entry.tracks.push({ artist: s.artist, track: s.track, previewUrl: s.previewUrl, album: s.album || null });
      if (entry.tracks.length >= 20) break;
    }
  }

  composersOutput[composer] = entry.tracks;

  // Also map hints to works
  for (const h of hints) {
    // try to extract work name by removing composer token if present
    let work = h;
    const idx = h.toLowerCase().indexOf(composer.toLowerCase());
    if (idx >= 0) {
      work = h.substr(idx + composer.length).trim();
    }
    // if composer not in hint, try to strip composer last name
    const parts = h.split(' ');
    if (parts.length > 2) {
      // heuristics: drop leading composer token if it's the same as composer first name
      // but keep full hint as fallback
    }

    const key = work || h;
    if (!worksOutput[key]) worksOutput[key] = { works: key, tracks: [] };

    for (const s of songs) {
      if (!s.previewUrl) continue;
      const hay = `${s.track || ''} ${s.artist || ''} ${s.album || ''}`.toLowerCase();
      if (hay.includes(key.toLowerCase()) || containsAny(hay, [key])) {
        worksOutput[key].tracks.push({ artist: s.artist, track: s.track, previewUrl: s.previewUrl, album: s.album || null });
        if (worksOutput[key].tracks.length >= 20) break;
      }
    }
  }
}

// Heuristic classify works into operas vs operettas using keyword lists
const operaKeywords = ['opera', 'la', 'il', 'le', 'die', 'das', 'the', 'traviata', 'turb', 'tosca', 'carmen', 'barbiere', 'magic flute', 'figaro', 'donizetti', 'verdi', 'puccini', 'rossini'];
const operettaKeywords = ['operetta', 'fledermaus', 'offenbach', 'orph','hofmann','die lustige','giuditta'];

const operas = {};
const operettas = {};

for (const k of Object.keys(worksOutput)) {
  const low = k.toLowerCase();
  if (operaKeywords.some(x => low.includes(x))) {
    operas[k] = worksOutput[k].tracks;
  } else if (operettaKeywords.some(x => low.includes(x))) {
    operettas[k] = worksOutput[k].tracks;
  } else {
    // fallback: if tracks include famous opera performers, classify as opera
    const performers = ['pavarotti','callas','domingo','netrebko','berenice','karajan','vienna philharmonic','berliner philharmoniker'];
    const matches = worksOutput[k].tracks || [];
    if (matches.some(t => containsAny(`${t.artist} ${t.track} ${t.album}`, performers))) {
      operas[k] = worksOutput[k].tracks;
    }
  }
}

fs.writeFileSync(path.join(OUT_DIR, 'composers.json'), JSON.stringify(composersOutput, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'works.json'), JSON.stringify(worksOutput, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'operas.json'), JSON.stringify(operas, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'operettas.json'), JSON.stringify(operettas, null, 2));

console.log('Mappings written to', OUT_DIR);
console.log('Composers:', Object.keys(composersOutput).length);
console.log('Works:', Object.keys(worksOutput).length);
console.log('Operas:', Object.keys(operas).length);
console.log('Operettas:', Object.keys(operettas).length);
