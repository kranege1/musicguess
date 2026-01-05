import csv

# Pfad zur Eingabedatei
input_file = r"C:\Users\User\Downloads\hot-100-filtered.csv"
output_file = r"C:\Users\User\Downloads\hot-100-unique.csv"

# CSV lesen und Duplikate entfernen
unique_rows = []
seen_titles = set()

with open(input_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    
    for row in reader:
        title = row['title']
        if title not in seen_titles:
            seen_titles.add(title)
            unique_rows.append(row)

# Eindeutige Daten schreiben
with open(output_file, 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(unique_rows)

print(f"✅ Fertig! {len(unique_rows)} eindeutige Titel gespeichert.")
print(f"📁 Output: {output_file}")
