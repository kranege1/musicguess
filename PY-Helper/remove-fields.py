import json

# Pfad zur Datei
file_path = r"hot-10-unique.json"

# JSON lesen
with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Felder entfernen
fields_to_remove = ["last_week", "current_week", "wks_on_chart"]
for entry in data:
    for field in fields_to_remove:
        entry.pop(field, None)

# JSON schreiben
with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"✅ Fertig! Felder {fields_to_remove} aus {len(data)} Einträgen entfernt.")
