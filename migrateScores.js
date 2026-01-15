const { db } = require('./firebaseConfig');
const fs = require('fs');
const path = require('path');

async function migrateScores() {
    try {
        console.log('🚀 Starting score migration to Firestore...\n');
        
        // Read highscores.json
        const highscoresPath = path.join(__dirname, 'json', 'highscores.json');
        const data = JSON.parse(fs.readFileSync(highscoresPath, 'utf8'));
        
        let totalMigrated = 0;
        let skipped = 0;
        
        // Iterate through all players
        for (const [ip, playerData] of Object.entries(data.players)) {
            const { username, scores } = playerData;
            
            console.log(`👤 Player: ${username} (${ip})`);
            
            // Iterate through player's scores
            if (scores && Array.isArray(scores)) {
                for (const score of scores) {
                    // Only migrate scores with 10+ questions (matching the new requirement)
                    if (score.totalQuestions >= 10) {
                        const migratedScore = {
                            userId: ip, // Use IP as userId for legacy scores
                            username: username,
                            gameMode: score.gameMode,
                            points: score.points,
                            totalQuestions: score.totalQuestions,
                            correctAnswers: score.correctAnswers,
                            timestamp: new Date(score.date),
                            migrated: true,
                            legacyId: score.id
                        };
                        
                        await db.collection('scores').add(migratedScore);
                        totalMigrated++;
                        console.log(`   ✅ Migrated: ${score.gameMode} - ${score.points} pts`);
                    } else {
                        skipped++;
                        console.log(`   ⏭️  Skipped: ${score.gameMode} (${score.totalQuestions} questions < 10)`);
                    }
                }
            }
        }
        
        console.log(`\n✨ Migration complete!`);
        console.log(`✅ Migrated: ${totalMigrated} scores`);
        console.log(`⏭️  Skipped: ${skipped} scores (< 10 questions)`);
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration error:', err);
        process.exit(1);
    }
}

migrateScores();
