const https = require('https');

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    // console.error('Raw data:', data);
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function test() {
    try {
        console.log('Fetching Baroque Composers...');
        const composers = await fetchJson('https://api.openopus.org/composer/list/epoch/Baroque.json');
        console.log('Keys:', Object.keys(composers));
        if (composers.composers) {
            console.log('First Composer:', composers.composers[0]);
            console.log('Count:', composers.composers.length);
        }

        console.log('\nFetching Popular Works (generic)...');
        // valid endpoints usually found in docs: /work/list/popular.json ??
        // Let's try to see if we can get works for one composer ID
        if (composers.composers && composers.composers[0]) {
            const id = composers.composers[0].id;
            console.log(`Fetching works for composer ${id}...`);
            const works = await fetchJson(`https://api.openopus.org/work/list/composer/${id}/genre/all.json`);
            console.log('Works Data Keys:', Object.keys(works));
            if (works.works) {
                console.log('First Work:', works.works[0]);
            }
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
}

test();
