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
  const performers = classical[composer].preferredPerformers || [];

  // gather tracks where track/artist/album contains composer name or any hint
  for (const s of songs) {
    if (!s.previewUrl) continue;
    const hay = `${s.track || ''} ${s.artist || ''} ${s.album || ''}`;
    if (hay.toLowerCase().includes(composer.toLowerCase()) || containsAny(hay, hints) || containsAny(hay, performers)) {
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
    if (!worksOutput[key]) worksOutput[key] = { works: key, tracks: [], composer };

    // Broaden matching: consider full hint, parts of the hint, and preferred performers
    const hintParts = key.split(/\W+/).filter(p => p.length > 3);
    for (const s of songs) {
      if (!s.previewUrl) continue;
      const hay = `${s.track || ''} ${s.artist || ''} ${s.album || ''}`;
      // match full key, any hint part, or preferred performers
      if (hay.toLowerCase().includes(key.toLowerCase()) || containsAny(hay, hintParts) || containsAny(hay, performers)) {
        worksOutput[key].tracks.push({ artist: s.artist, track: s.track, previewUrl: s.previewUrl, album: s.album || null });
        if (worksOutput[key].tracks.length >= 20) break;
      }
    }
  }
}

// Heuristic classify works into operas vs operettas using keyword lists
const operaKeywords = ['opera', 'traviata', 'tosca', 'carmen', 'barbiere', 'magic flute', 'figaro', 'donizetti', 'verdi', 'puccini', 'rossini', 'wald','walkure','walküre','il','la','le','die','das','the'];
const operettaKeywords = ['operetta', 'fledermaus', 'the merry widow', 'merry widow', 'offenbach', 'orph','hofmann','die lustige','giuditta','lehár','lehar','kalman','kálmán','zarzuela','vogelhandler','bird seller','poet and peasant','light cavalry','cloches','corneville','fille de madame','giroflé','dollar princess','gipsy love','bettelstudent','beggar student','mascotte','poupée','walzertraum','chocolate soldier','geisha','san toy','keusche susanne','frau luna','lysistrata','zeller','suppé','planquette','lecocq','caryll','millöcker','audran','fall','straus','jones','gilbert','lincke','sullivan','mikado','pinafore','iolanthe','delibes','lakme','coppelia','eysler','edwards','florodora','runaway girl'];

// Known operetta composers — if a work is associated with these composers, prefer operetta classification
const operettaComposers = new Set(['Johann Strauss II','Jacques Offenbach','Franz Lehár','Emmerich Kálmán','Arthur Sullivan','Carl Zeller','Franz von Suppé','Robert Planquette','Charles Lecocq','Ivan Caryll','Carl Millöcker','Edmond Audran','Leo Fall','Oscar Straus','Sidney Jones','Jean Gilbert','Paul Lincke','Léo Delibes','Edmund Eysler','George Edwards']);

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

// Secondary pass: classify works tied to known operetta composers as operettas when not already classified
for (const k of Object.keys(worksOutput)) {
  if (operas[k] || operettas[k]) continue;
  const meta = worksOutput[k];
  if (meta && meta.composer && operettaComposers.has(meta.composer)) {
    operettas[k] = meta.tracks;
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
