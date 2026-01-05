import csv
import json

# Pfad zur Eingabedatei
input_file = r"hot-10-unique.csv"
output_file = r"hot-10-unique.json"

# CSV lesen
data = []
with open(input_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        data.append(row)

# JSON schreiben
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"✅ Fertig! {len(data)} Einträge in JSON konvertiert.")
print(f"📁 Output: {output_file}")
