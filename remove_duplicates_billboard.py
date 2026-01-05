import pandas as pd

# URL der CSV-Datei
url = "https://raw.githubusercontent.com/utdata/rwd-billboard-data/refs/heads/main/data-out/hot-100-current.csv"

# CSV-Datei laden
print("Lade die Datei herunter...")
df = pd.read_csv(url)

# Anzahl Zeilen vor der Bereinigung
print(f"Ursprüngliche Anzahl Zeilen: {len(df)}")

# Duplikate basierend auf der Spalte 'title' entfernen (behalte die erste Occurrence)
df_unique = df.drop_duplicates(subset=['title'], keep='first')

# Anzahl Zeilen nach der Bereinigung
print(f"Anzahl Zeilen nach Entfernen der Duplikate: {len(df_unique)}")
print(f"Entfernte Duplikate: {len(df) - len(df_unique)}")

# Bereinigte Datei speichern (z. B. als 'hot-100-unique-songs.csv')
output_file = "hot-100-unique-songs.csv"
df_unique.to_csv(output_file, index=False)

print(f"Bereinigte Datei gespeichert als: {output_file}")