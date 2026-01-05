import json

# Lese die Textdatei
with open('InterpreteList.json', 'r', encoding='utf-8') as f:
    lines = [line.strip() for line in f if line.strip()]

# Schreibe als JSON Array
with open('InterpreteList.json', 'w', encoding='utf-8') as f:
    json.dump(lines, f, indent=2, ensure_ascii=False)

print(f"✅ {len(lines)} Künstler als JSON Array gespeichert")
