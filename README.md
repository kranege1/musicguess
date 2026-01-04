# 🎵 Musik Ratespiel

Ein interaktives Web-basiertes Musikratespiel, das die **iTunes Search API** nutzt, um Songs zu laden und Spieler zu testen, ob sie das Lied anhand eines 30-Sekunden-Previews erraten können.

## 🎮 Funktionen

### Grundfunktionen
- ✅ **iTunes Search API Integration** - Dynamisches Laden von Songs basierend auf Künstler/Titel-Suche
- ✅ **Audio Preview** - Abspielen von 30-Sekunden-Vorschauen
- ✅ **Albumcover** - Visuelle Darstellung des Albumcovers
- ✅ **Punktesystem** - Verfolgung von richtigen und falschen Antworten

### Spielmodi
- ✅ **Multiple Choice Modus** - 4 Antwortoptionen (1 richtig, 3 zufällige Falsche)
- ✅ **Freie Eingabe Modus** - Direktes Eingeben der Antwort
- ✅ **Genre-Hinweis** - Optional: Genre als zusätzlicher Hinweis
- ✅ **Anpassbare Preview-Dauer** - 3-10 Sekunden wählbar

### Einstellungen
- 🎯 Anzahl der Songs: 5, 10, 15 oder 20
- ⏱️ Preview-Dauer: 3, 5, 7 oder 10 Sekunden
- 🏷️ Genre-Modus an/aus
- 🎯 Multiple Choice an/aus

## 📋 Dateien

### `index.html`
- Haupt-Interface des Spiels
- Responsive Design für Desktop und Mobile
- Gradient-Styling mit modernem UI

### `app.js`
- Gesamte Spiellogik
- iTunes API Integration
- Audio-Playback Management
- Quiz-Logik und Score-Tracking

### `songs.json`
- Referenzdatei der Song-Struktur
- Kann für Offline-Songs genutzt werden

## 🚀 Wie man das Spiel nutzt

### Installation
1. Speichere alle Dateien im gleichen Verzeichnis
2. Öffne `index.html` in einem modernen Webbrowser

### Spielablauf

#### Schritt 1: Einstellungen
```
1. Gebe einen Künstler oder Songtitel ein (z.B. "The Beatles")
2. Wähle die Anzahl der Songs
3. Aktiviere/Deaktiviere Multiple Choice Modus
4. Stelle die Preview-Dauer ein
5. Klicke "Spiel Starten"
```

#### Schritt 2: Spielen
```
1. Höre dir die 30-Sekunden Vorschau an (oder weniger)
2. Rate das Lied anhand der Antwortoptionen
3. Erhale sofort Feedback (richtig/falsch)
4. Sehe Künstler, Album und Genre des Songs
5. Klicke "Nächste Frage" zum Fortfahren
```

#### Schritt 3: Ergebnis
```
- Sieh dein endgültiges Ergebnis
- Prozentsatz der richtigen Antworten
- Starte ein neues Spiel
```

## 🎨 Design

- **Farben**: Lila Gradient (#667eea zu #764ba2)
- **Responsive**: Funktioniert auf Desktop, Tablet und Smartphone
- **Icons**: Emoji für intuitive Bedienung
- **Animationen**: Sanfte Übergänge und Ladeeffekte

## 🔧 Technologie

- **HTML5** - Struktur
- **CSS3** - Styling mit Flexbox/Grid und Animationen
- **JavaScript ES6** - Spiellogik
- **Web Audio API** - Audio-Playback
- **Fetch API** - iTunes API-Aufrufe
- **CORS** - Sichere API-Integration

## 📱 Browser-Kompatibilität

- ✅ Chrome/Chromium (empfohlen)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile Browser

## 🎯 iTunes Search API

Das Spiel nutzt die öffentliche iTunes Search API ohne API-Schlüssel:

```
https://itunes.apple.com/search?term={search}&entity=song&limit=50&media=music
```

**Parameter:**
- `term` - Suchbegriff (Künstler, Album, Song)
- `entity=song` - Suche nur nach Liedern
- `limit` - Anzahl der Ergebnisse (max. 200)
- `media=music` - Nur Musik-Content

## 🔊 Audio-Features

### Preview-Längen
Das Spiel bietet verschiedene Vorschau-Längen:
- **3 Sekunden** - Sehr schwierig
- **5 Sekunden** - Standard (empfohlen)
- **7 Sekunden** - Leicht
- **10 Sekunden** - Sehr leicht

### Audio-Kontrolle
- ▶️ **Play** - Startet die Vorschau
- ⏹️ **Stop** - Stoppt die Wiedergabe
- **Progress-Bar** - Zeigt die Wiedergabe-Position
- **Auto-Stop** - Stoppt automatisch nach eingestellter Zeit

## 💡 Tipps zum Spielen

1. **Starte mit längeren Previews** - Leichter für Anfänger
2. **Nutze Genre-Hinweis** - Hilft bei schwierigen Songs
3. **Versuche verschiedene Künstler** - Erweitere dein Musikwissen
4. **Multiple Choice** - Gutes Trainings-Feature
5. **Ohne Multiple Choice** - Für fortgeschrittene Spieler

## 🐛 Bekannte Probleme & Lösungen

### Preview funktioniert nicht
- **Grund**: CORS-Beschränkung bei manchen Previews
- **Lösung**: Einige iTunes Previews können auf lokalen Servern blockiert sein

### Keine Songs gefunden
- **Grund**: Suchbegriff zu spezifisch oder falsch geschrieben
- **Lösung**: Versuche Künstlername statt Songtitel

### Audio stoppt plötzlich
- **Grund**: Browser-Sicherheitsrichtlinien
- **Lösung**: Erlaube Audio-Wiedergabe in Browser-Einstellungen

## 🌟 Verbesserungsideen

- [ ] Schwierigkeitsstufen
- [ ] Multiplayer-Modus
- [ ] Leaderboards
- [ ] Kategorien/Genres
- [ ] Lokale Song-Datenbank
- [ ] Offline-Modus
- [ ] Achievements/Badges
- [ ] Musikgeschichte & Trivia

## 📄 Lizenz

Dieses Projekt nutzt die öffentliche iTunes Search API von Apple.
Alle Songs und Metadaten stammen vom iTunes Music Store.

## 👨‍💻 Entwicklung

Wenn du das Spiel erweitern möchtest:

1. **Neue Features in app.js** hinzufügen
2. **Styling in index.html <style>** anpassen
3. **Neue Spielmodi** in der `startGame()` Funktion definieren

---

**Viel Spaß beim Spielen! 🎵🎮**
