const https = require('https');
const fs = require('fs');
const path = require('path');

const SONGS_FILE = path.join(__dirname, '..', 'json', 'songs.json');

const songsToSearch = [
    // 1940s / 1950s
    { artist: "Frank Sinatra", track: "Fly Me to the Moon", genre: "1950s" },
    { artist: "Elvis Presley", track: "Jailhouse Rock", genre: "1950s" },
    { artist: "Chuck Berry", track: "Johnny B. Goode", genre: "1950s" },

    // 1960s
    { artist: "The Beatles", track: "Hey Jude", genre: "1960s" },
    { artist: "The Rolling Stones", track: "Paint It Black", genre: "1960s" },
    { artist: "Jimi Hendrix", track: "Purple Haze", genre: "1960s" },
    { artist: "The Doors", track: "Light My Fire", genre: "1960s" },
    { artist: "Aretha Franklin", track: "Respect", genre: "1960s" },
    { artist: "Simon & Garfunkel", track: "The Sound of Silence", genre: "1960s" },
    
    // 1970s
    { artist: "Queen", track: "Bohemian Rhapsody", genre: "1970s" },
    { artist: "ABBA", track: "Dancing Queen", genre: "1970s" },
    { artist: "Led Zeppelin", track: "Stairway to Heaven", genre: "1970s" },
    { artist: "Pink Floyd", track: "Another Brick in the Wall", genre: "1970s" },
    { artist: "The Bee Gees", track: "Stayin' Alive", genre: "1970s" },
    { artist: "The Eagles", track: "Hotel California", genre: "1970s" },
    
    // 1980s
    { artist: "Michael Jackson", track: "Billie Jean", genre: "1980s" },
    { artist: "Madonna", track: "Like a Virgin", genre: "1980s" },
    { artist: "Prince", track: "Purple Rain", genre: "1980s" },
    { artist: "Cyndi Lauper", track: "Girls Just Want to Have Fun", genre: "1980s" },
    { artist: "Bon Jovi", track: "Livin' on a Prayer", genre: "1980s" },
    { artist: "A-ha", track: "Take On Me", genre: "1980s" },
    
    // 1990s
    { artist: "Nirvana", track: "Smells Like Teen Spirit", genre: "1990s" },
    { artist: "Backstreet Boys", track: "I Want It That Way", genre: "1990s" },
    { artist: "Britney Spears", track: "...Baby One More Time", genre: "1990s" },
    { artist: "Whitney Houston", track: "I Will Always Love You", genre: "1990s" },
    { artist: "Spice Girls", track: "Wannabe", genre: "1990s" },
    
    // 2000s
    { artist: "Coldplay", track: "Yellow", genre: "2000s" },
    { artist: "Beyoncé", track: "Crazy in Love", genre: "2000s" },
    { artist: "Eminem", track: "Lose Yourself", genre: "2000s" },
    { artist: "Linkin Park", track: "In the End", genre: "2000s" },
    { artist: "Outkast", track: "Hey Ya!", genre: "2000s" },

    // 2010s
    { artist: "Adele", track: "Rolling in the Deep", genre: "2010s" },
    { artist: "Ed Sheeran", track: "Shape of You", genre: "2010s" },
    { artist: "Daft Punk", track: "Get Lucky", genre: "2010s" },
    { artist: "Avicii", track: "Wake Me Up", genre: "2010s" },
    { artist: "Bruno Mars", track: "Uptown Funk", genre: "2010s" },

    // 2020s
    { artist: "The Weeknd", track: "Blinding Lights", genre: "2020s" },
    { artist: "Dua Lipa", track: "Levitating", genre: "2020s" },
    { artist: "Billie Eilish", track: "Bad Guy", genre: "2020s" },
    { artist: "Harry Styles", track: "As It Was", genre: "2020s" },
    { artist: "Olivia Rodrigo", track: "Drivers License", genre: "2020s" },

    // EDM Genre
    { artist: "Martin Garrix", track: "Animals", genre: "EDM" },
    { artist: "David Guetta", track: "Titanium", genre: "EDM" },
    { artist: "Calvin Harris", track: "Summer", genre: "EDM" },
    { artist: "Swedish House Mafia", track: "Don't You Worry Child", genre: "EDM" },
    { artist: "Avicii", track: "Levels", genre: "EDM" },
    
    // Latin Genre
    { artist: "Luis Fonsi", track: "Despacito", genre: "Latin" },
    { artist: "Bad Bunny", track: "Dakiti", genre: "Latin" },
    { artist: "J Balvin", track: "Mi Gente", genre: "Latin" },
    { artist: "Shakira", track: "Hips Don't Lie", genre: "Latin" },
    { artist: "Daddy Yankee", track: "Gasolina", genre: "Latin" },
    
    // Disney Genre
    { artist: "Idina Menzel", track: "Let It Go", genre: "Disney" },
    { artist: "Jodi Benson", track: "Part of Your World", genre: "Disney" },
    { artist: "Elton John", track: "Can You Feel the Love Tonight", genre: "Disney" },
    { artist: "Samuel E. Wright", track: "Under the Sea", genre: "Disney" },
    
    // Movie Soundtrack Genre
    { artist: "John Williams", track: "Star Wars Main Title", genre: "Movie Soundtrack" },
    { artist: "Hans Zimmer", track: "Time", genre: "Movie Soundtrack" },
    { artist: "Celine Dion", track: "My Heart Will Go On", genre: "Movie Soundtrack" },
    { artist: "Survivor", track: "Eye of the Tiger", genre: "Movie Soundtrack" },
    
    // Volksmusik / German Folk Genre
    { artist: "Helene Fischer", track: "Atemlos durch die Nacht", genre: "Volksmusik" },
    { artist: "Andreas Gabalier", track: "I sing a Liad für di", genre: "Volksmusik" },
    { artist: "DJ Ötzi", track: "Anton aus Tirol", genre: "Volksmusik" },
    { artist: "Schürzenjäger", track: "Sierra Madre", genre: "Volksmusik" }
];

function searchItunes(artist, track) {
  return new Promise((resolve) => {
    const term = `${artist} ${track}`;
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=5&media=music`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.results || []);
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

async function run() {
    console.log('Loading songs.json...');
    let existingSongs = [];
    if (fs.existsSync(SONGS_FILE)) {
        existingSongs = JSON.parse(fs.readFileSync(SONGS_FILE, 'utf8'));
    }
    
    // Track unique keys to avoid duplicate addition
    const existingSet = new Set(existingSongs.map(s => `${s.artist.toLowerCase()}||${s.track.toLowerCase()}`));
    
    let addedCount = 0;
    
    for (const song of songsToSearch) {
        const key = `${song.artist.toLowerCase()}||${song.track.toLowerCase()}`;
        if (existingSet.has(key)) {
            console.log(`✓ Already exists: ${song.artist} - ${song.track}`);
            continue;
        }
        
        console.log(`🔍 Searching iTunes for: ${song.artist} - ${song.track} (${song.genre})`);
        const results = await searchItunes(song.artist, song.track);
        
        // Find best match with previewUrl
        const match = results.find(r => r.previewUrl && r.trackName && r.artistName);
        if (match) {
            const newSong = {
                artist: match.artistName,
                track: match.trackName,
                genre: song.genre,
                previewUrl: match.previewUrl.replace(/^http:/, 'https:')
            };
            existingSongs.push(newSong);
            existingSet.add(key);
            addedCount++;
            console.log(`  ➕ Added: ${newSong.artist} - ${newSong.track} with preview`);
        } else {
            console.log(`  ❌ No preview match found for: ${song.artist} - ${song.track}`);
        }
        
        await new Promise(r => setTimeout(r, 200));
    }
    
    if (addedCount > 0) {
        fs.writeFileSync(SONGS_FILE, JSON.stringify(existingSongs, null, 2), 'utf8');
        console.log(`\nSuccess! Added ${addedCount} new songs for different genres and decades to songs.json`);
    } else {
        console.log('\nNo new songs were added (all already exist or no previews found).');
    }
}

run();
