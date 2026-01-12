const http = require('http');

// Test 1: Health check
console.log('\n🧪 TEST 1: Health Check');
http.get('http://localhost:3000/api/health', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('✅ Server is healthy:', JSON.parse(data));
    });
});

// Test 2: Check leaderboard for any mode
setTimeout(() => {
    console.log('\n🧪 TEST 2: Leaderboard - Billboard Charts aus 2009');
    http.get('http://localhost:3000/api/leaderboard/Billboard%20Charts%20aus%202009', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            const result = JSON.parse(data);
            console.log(`✅ Found ${result.count} scores in mode: "${result.mode}"`);
            if (result.scores.length > 0) {
                console.log('   Top score:', {
                    username: result.scores[0].username,
                    points: result.scores[0].points,
                    correctAnswers: result.scores[0].correctAnswers,
                    totalQuestions: result.scores[0].totalQuestions
                });
            }
        });
    });
}, 500);

// Test 3: Check global leaderboard
setTimeout(() => {
    console.log('\n🧪 TEST 3: Global Leaderboard');
    http.get('http://localhost:3000/api/leaderboard-global', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            const result = JSON.parse(data);
            console.log(`✅ Global leaderboard has ${result.count} scores`);
            if (result.scores.length > 0) {
                console.log('   Top 3 players:');
                result.scores.slice(0, 3).forEach((score, i) => {
                    console.log(`   ${i + 1}. ${score.username} - ${score.points}pts (${score.gameMode})`);
                });
            }
        });
    });
}, 1000);

// Test 4: Instructions
setTimeout(() => {
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Open http://localhost:3000 in your browser');
    console.log('2. Set a player name');
    console.log('3. Select a game mode (e.g., "Freie Wahl")');
    console.log('4. Complete a game (10+ questions)');
    console.log('5. Run this script again to verify score was saved');
    console.log('\n✅ If you see scores above, Firebase is working!');
}, 1500);
