import json

# Read the file
with open('songs.json', 'r', encoding='utf-8') as f:
    songs = json.load(f)

# Replace decade names
replacements = {
    '1960er': '1960s',
    '1970er': '1970s',
    '1980er': '1980s',
    '1990er': '1990s',
    '2000er': '2000s',
    '2010er': '2010s',
    '2020er': '2020s'
}

count = 0
for song in songs:
    if 'genre' in song and song['genre'] in replacements:
        old_genre = song['genre']
        song['genre'] = replacements[old_genre]
        count += 1

# Write back
with open('songs.json', 'w', encoding='utf-8') as f:
    json.dump(songs, f, ensure_ascii=False, indent=2)

print(f"✅ Replaced {count} decade names")
