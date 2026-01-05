import json

with open('InterpreteList.txt', 'r', encoding='utf-8') as f:
    artists = [line.strip() for line in f.readlines() if line.strip()]

with open('InterpreteList.json', 'w', encoding='utf-8') as f:
    json.dump(artists, f, indent=2, ensure_ascii=False)

print(f"✅ {len(artists)} artists converted to JSON")
