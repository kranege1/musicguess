const https = require('https');
const fs = require('fs');
const path = require('path');

const TARGET_FILE = path.join(__dirname, '..', 'json', 'classical-works.json');
const API_BASE = 'https://api.openopus.org';

// Existing local data
let localData = {};
try {
    if (fs.existsSync(TARGET_FILE)) {
        localData = JSON.parse(fs.readFileSync(TARGET_FILE, 'utf8'));
    }
} catch (e) {
    console.error('Error reading local file:', e);
    process.exit(1);
}

// Helper to make HTTPS requests
function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

// Normalize strings for deduplication
const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const processedWorks = new Set();
// Pre-seed with existing works to avoid duplicates
Object.values(localData).forEach(category => {
    const works = category.works || category || [];
    works.forEach(w => {
        const title = typeof w === 'string' ? w : w.title;
        const composer = typeof w === 'string' ? '' : w.composer;
        processedWorks.add(normalize(title + composer));
    });
});

async function run() {
    console.log('🎻 Starting Classical Data Enrichment (v2)...');

    // Mapping OpenOpus Epochs to our Categories
    const epochMap = {
        'Baroque': 'Baroque',
        'Classical': 'Classical',
        'Early Romantic': 'Romantic',
        'Late Romantic': 'Romantic',
        '20th Century': 'Modern'
    };

    // Filter logic for specific sub-genres
    const specialFilters = {
        'Oper': (w) => w.genre === 'Opera' || w.genre === 'Stage',
        'Symphonie': (w) => (w.title.includes('Symphony') || w.title.includes('Symphonie')) && w.genre === 'Orchestral',
        'Kammermusik': (w) => w.genre === 'Chamber',
        'Kirchenmusik': (w) => w.genre === 'Vocal' && /Mass|Requiem|Te Deum|Stabat Mater|Magnificat/i.test(w.title)
    };

    // Fetch by Epoch
    for (const [opusEpoch, localCat] of Object.entries(epochMap)) {
        console.log(`\n🔍 Fetching Composers for ${opusEpoch} -> ${localCat}...`);
        try {
            // 1. Get Composers
            const url = `${API_BASE}/composer/list/epoch/${encodeURIComponent(opusEpoch)}.json`;
            const data = await fetchJson(url);

            if (!data.composers) continue;

            // Prioritize Popular/Recommended composers
            let topComposers = data.composers.filter(c => c.popular == '1' || c.recommended == '1');
            // Fallback if none marked popular
            if (topComposers.length === 0) topComposers = data.composers.slice(0, 10);

            // Limit to top 10 to avoid excessive requests
            topComposers = topComposers.slice(0, 10);

            console.log(`   Selected ${topComposers.length} top composers (e.g. ${topComposers[0]?.complete_name})`);

            let addedCount = 0;
            if (!localData[localCat]) localData[localCat] = { works: [] };
            const targetList = localData[localCat].works;

            // 2. Fetch Works for each Composer
            for (const composer of topComposers) {
                // Short delay to be nice to API
                await new Promise(r => setTimeout(r, 200));

                try {
                    const workUrl = `${API_BASE}/work/list/composer/${composer.id}/genre/all.json`;
                    const workData = await fetchJson(workUrl);

                    if (!workData.works) continue;

                    // Filter for popular works
                    let candidates = workData.works.filter(w => w.popular == '1' || w.recommended == '1');
                    if (candidates.length === 0) candidates = workData.works.slice(0, 5); // Fallback

                    for (const work of candidates) {
                        const composerName = composer.complete_name;
                        const title = work.title;
                        const uniqueKey = normalize(title + composerName);

                        if (processedWorks.has(uniqueKey)) continue;

                        // Add to main Period list (limit size)
                        if (targetList.length < 50) {
                            targetList.push({
                                title: title,
                                composer: composerName
                            });
                            processedWorks.add(uniqueKey);
                            addedCount++;
                        }

                        // Add to Special Categories
                        for (const [specialCat, filterFn] of Object.entries(specialFilters)) {
                            if (filterFn(work)) {
                                if (!localData[specialCat]) localData[specialCat] = { works: [] };
                                const specialList = localData[specialCat].works;

                                // Local dedup for special list
                                const exists = specialList.some(ex => {
                                    const exTitle = typeof ex === 'string' ? ex : ex.title;
                                    return normalize(exTitle) === normalize(title);
                                });

                                if (!exists && specialList.length < 50) {
                                    specialList.push({
                                        title: title,
                                        composer: composerName
                                    });
                                }
                            }
                        }
                    }

                } catch (innerErr) {
                    console.error(`   Error fetching works for ${composer.name}: ${innerErr.message}`);
                }
            }
            console.log(`   ✅ Added ${addedCount} new works to ${localCat}`);

        } catch (err) {
            console.error(`   ❌ Failed to fetch epoch ${opusEpoch}:`, err.message);
        }
    }

    // Write back
    fs.writeFileSync(TARGET_FILE, JSON.stringify(localData, null, 2));
    console.log(`\n💾 Saved updated works to ${TARGET_FILE}`);
}

run();
