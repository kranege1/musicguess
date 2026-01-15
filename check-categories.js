const fs = require('fs');

// Read genres.json and check all categories
const genres = JSON.parse(fs.readFileSync('genres.json', 'utf8'));

console.log('=== CLASSICAL CATEGORIES ===');
Object.keys(genres.classical).forEach(key => {
  const artists = genres.classical[key];
  if (Array.isArray(artists)) {
    console.log(`${key}: ${artists.length} artists`);
  } else if (artists.artists) {
    console.log(`${key}: ${artists.artists.length} artists`);
  }
});

console.log('\n=== SPECIAL GENRES ===');
Object.keys(genres.specialGenres).forEach(key => {
  const genre = genres.specialGenres[key];
  console.log(`${genre.name}: ${genre.artists.length} artists`);
});

console.log('\n=== COUNTRIES ===');
Object.keys(genres.countries).forEach(key => {
  const country = genres.countries[key];
  console.log(`${country.name}: ${country.artists.length} artists`);
});

console.log('\n=== GENRES ===');
genres.genres.forEach(genre => {
  console.log(`${genre}: (uses general artist list)`);
});

console.log('\n=== DECADES ===');
genres.decades.forEach(decade => {
  console.log(`${decade}: (filters songs.json)`);
});