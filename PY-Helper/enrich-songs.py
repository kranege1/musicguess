#!/usr/bin/env python3
"""
Enriches songs.json with preview URLs from iTunes API.
Reads songs.json, fetches preview URLs for each song, and writes back.
"""

import json
import time
import urllib.request
import urllib.parse
import sys

def fetch_preview_url(artist, track, countries=['DE', 'US', 'GB']):
    """Fetch preview URL from iTunes API with country fallback."""
    search_term = f"{artist} {track}"
    
    for country in countries:
        retries = 3
        for attempt in range(retries):
            try:
                encoded_query = urllib.parse.quote(search_term)
                url = f"https://itunes.apple.com/search?term={encoded_query}&entity=song&limit=5&media=music&country={country}"
                
                with urllib.request.urlopen(url, timeout=10) as response:
                    data = json.loads(response.read().decode('utf-8'))
                    
                    if data.get('results'):
                        # Find best match with preview URL
                        for result in data['results']:
                            if result.get('previewUrl'):
                                # Force https
                                preview = result['previewUrl'].replace('http:', 'https:')
                                print(f"  ✓ Found preview ({country}): {artist} - {track}")
                                return preview
                    break  # Success, no retry needed
            except Exception as e:
                error_msg = str(e)
                if '429' in error_msg or '403' in error_msg:
                    # Rate limit or forbidden - wait longer
                    wait_time = (attempt + 1) * 5  # 5, 10, 15 seconds
                    print(f"  ⚠️ {country} rate limited (attempt {attempt+1}/{retries}), waiting {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    print(f"  ✗ {country} failed: {e}")
                    break
        time.sleep(1)  # Small delay between countries
    
    print(f"  ✗ No preview found: {artist} - {track}")
    return None

def main():
    print("🎵 Enriching songs.json with iTunes preview URLs...\n")
    
    # Load songs.json
    try:
        with open('songs.json', 'r', encoding='utf-8') as f:
            songs = json.load(f)
    except Exception as e:
        print(f"❌ Error loading songs.json: {e}")
        sys.exit(1)
    
    print(f"📥 Loaded {len(songs)} songs\n")
    
    # Track progress
    enriched = 0
    skipped = 0
    failed = 0
    
    # Process each song
    for i, song in enumerate(songs, 1):
        artist = song.get('artist', '')
        track = song.get('track', '')
        
        print(f"[{i}/{len(songs)}] {artist} - {track}")
        
        # Skip if already has preview URL
        if song.get('previewUrl'):
            print(f"  → Already has preview, skipping")
            skipped += 1
            continue
        
        # Fetch preview URL
        preview_url = fetch_preview_url(artist, track)
        
        if preview_url:
            song['previewUrl'] = preview_url
            enriched += 1
        else:
            failed += 1
        
        # Rate limiting to avoid API blocks (3 seconds between songs)
        time.sleep(3)
        
        # Save progress every 10 songs
        if i % 10 == 0:
            try:
                with open('songs.json', 'w', encoding='utf-8') as f:
                    json.dump(songs, f, indent=2, ensure_ascii=False)
                print(f"\n💾 Progress saved ({enriched} enriched, {failed} failed, {skipped} skipped)\n")
            except Exception as e:
                print(f"\n⚠️ Error saving progress: {e}\n")
    
    # Final save
    try:
        with open('songs.json', 'w', encoding='utf-8') as f:
            json.dump(songs, f, indent=2, ensure_ascii=False)
        print(f"\n✅ Done! Final stats:")
        print(f"   - Enriched: {enriched}")
        print(f"   - Failed: {failed}")
        print(f"   - Skipped (already had URL): {skipped}")
        print(f"   - Total: {len(songs)}")
    except Exception as e:
        print(f"\n❌ Error saving final file: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
