// Füge diese Funktion nach startNewPlayer() ein:

// Starte Spiel aus gameMode-String (z.B. "Songs von Dire Straits" oder "Billboard Charts aus 2009")
function startGameFromMode(gameModeStr) {
    console.log('Starte Spiel für Modus:', gameModeStr);
    
    // Parse gameMode string
    if (gameModeStr.startsWith('Songs von ')) {
        // Freie Wahl / iTunes Suche
        const query = gameModeStr.replace('Songs von ', '').trim();
        document.querySelector('input[name="gameMode"][value="search"]').checked = true;
        toggleGameMode();
        document.getElementById('searchQuery').value = query;
    } else if (gameModeStr.startsWith('Billboard Charts aus ')) {
        // Billboard Modus
        const year = gameModeStr.replace('Billboard Charts aus ', '').trim();
        document.querySelector('input[name="gameMode"][value="billboard"]').checked = true;
        toggleGameMode();
        document.getElementById('yearSelect').value = year;
        loadBillboardSongsForYear();
    } else if (gameModeStr.startsWith('Genre: ')) {
        // Genre Modus
        const genre = gameModeStr.replace('Genre: ', '').trim();
        document.querySelector('input[name="gameMode"][value="genre"]').checked = true;
        toggleGameMode();
        document.getElementById('genreSelect').value = genre;
    }
    
    // Starte Spiel nach kurzer Verzögerung
    setTimeout(() => {
        startGame();
    }, 300);
}

// Ersetze die renderLeaderboardTicker Funktion mit dieser Version:

function renderLeaderboardTicker(scores, gameMode) {
    const ticker = document.getElementById('leaderboardTicker');
    const track = document.getElementById('leaderboardTickerTrack');
    if (!ticker || !track) return;

    if (!scores || scores.length === 0) {
        track.innerHTML = '<span class="ticker-empty">Keine Scores vorhanden</span>';
        track.style.setProperty('--ticker-duration', '18s');
        return;
    }

    const items = scores.map((score, idx) => {
        const points = score.points ?? score.totalPoints ?? 0;
        const modeLabel = score.gameMode || gameMode || 'Modus';
        return `
            <span class="ticker-item" data-gamemode="${modeLabel}" style="cursor: pointer;" title="Klicken um ${modeLabel} zu spielen">
                <span class="leaderboard-rank">#${idx + 1}</span>
                <span class="leaderboard-name">${score.username}</span>
                <span class="ticker-mode">${modeLabel}</span>
                <span class="ticker-points">🏆 ${points}</span>
            </span>
        `;
    });

    // Dupliziere Items für endlosen Scroll
    const repeated = items.concat(items);
    track.innerHTML = repeated.join('<span style="width: 32px;"></span>');

    // Geschwindigkeit abhängig von Anzahl Elemente
    const durationSec = Math.max(12, scores.length * 3);
    track.style.setProperty('--ticker-duration', `${durationSec}s`);

    // Click-Handler für Ticker-Items
    track.querySelectorAll('.ticker-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const mode = item.dataset.gamemode;
            if (mode) {
                startGameFromMode(mode);
            }
        });
    });
}
