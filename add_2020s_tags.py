import json

# Artists primarily active in 2020s
artists_2020s = [
    "Billie Eilish", "Olivia Rodrigo", "The Weeknd", "Dua Lipa", 
    "Harry Styles", "Bad Bunny", "Lil Nas X", "Megan Thee Stallion",
    "Lizzo", "SZA", "Sabrina Carpenter", "Tate McRae", "Ice Spice",
    "Charli XCX", "Chappell Roan", "Doja Cat", "Lil Baby",
    "Jack Harlow", "BTS", "BLACKPINK", "NewJeans", "Stray Kids"
]

# Also tag some songs from established artists if they're recent hits
recent_artists = [
    "Taylor Swift", "Ed Sheeran", "Ariana Grande", "Post Malone",
    "Drake", "Kendrick Lamar", "Beyoncé", "Adele", "Justin Bieber",
    "The Kid LAROI", "Lil Wayne", "Future", "21 Savage"
]

# Load songs
with open('json/songs.json', 'r', encoding='utf-8') as f:
    songs = json.load(f)

count = 0
for song in songs:
    artist = song.get('artist', '')
    genre = song.get('genre', '')
    
    # Add "2020s" for primary 2020s artists
    if artist in artists_2020s:
        if isinstance(genre, list):
            if "2020s" not in genre:
                genre.append("2020s")
                count += 1
        else:
            song['genre'] = [genre, "2020s"] if genre else ["2020s"]
            count += 1
    
    # For recent artists, only tag specific hits (you might want to refine this)
    elif artist in recent_artists:
        # Check track names for recent hits (2020s era)
        track = song.get('track', '').lower()
        recent_hits = [
            'anti-hero', 'cruel summer', 'blank space', 'shake it off',  # Taylor recent
            'shivers', 'bad habits', 'eyes closed',  # Ed Sheeran
            'positions', 'yes, and?', '7 rings',  # Ariana
            'circles', 'sunflower', 'rockstar',  # Post Malone
            'easy on me', 'hello',  # Adele
            'peaches', 'stay', 'ghost',  # Justin Bieber recent
        ]
        
        if any(hit in track for hit in recent_hits):
            if isinstance(genre, list):
                if "2020s" not in genre:
                    genre.append("2020s")
                    count += 1
            else:
                song['genre'] = [genre, "2020s"] if genre else ["2020s"]
                count += 1

print(f"Tagged {count} songs with '2020s'")

# Save
with open('json/songs.json', 'w', encoding='utf-8') as f:
    json.dump(songs, f, ensure_ascii=False, indent=2)

print("✅ songs.json updated")
