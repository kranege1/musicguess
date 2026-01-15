const http = require('http');
const { exec } = require('child_process');
const args = process.argv.slice(2);
const count = Math.max(1, Math.min(50, parseInt(args[0]) || 5));

function get(url){
  return new Promise((res,rej)=>{
    http.get(url, r=>{
      let d='';
      r.on('data', c=> d+=c);
      r.on('end', ()=> res(d));
    }).on('error', e=> rej(e));
  });
}

function shuffle(array){
  for(let i = array.length -1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

(async ()=>{
  try{
    const raw = await get('http://localhost:3000/json/mappings/composers.json');
    const comp = JSON.parse(raw);
    const candidates = [];
    for(const k of Object.keys(comp)){
      const arr = comp[k];
      if(Array.isArray(arr)){
        const s = arr.find(x=> x.previewUrl);
        if(s) candidates.push({key: k, rec: s});
      }
    }
    if(candidates.length === 0){
      console.log('NO_PLAYABLE_COMPOSERS_FOUND');
      process.exit(1);
    }

    shuffle(candidates);
    const selected = candidates.slice(0, Math.min(count, candidates.length));
    console.log('Selected', selected.length, 'composer(s) to play.');

    for(const item of selected){
      console.log('\nPLAYING:', item.key);
      console.log(JSON.stringify({artist: item.rec.artist, track: item.rec.track, previewUrl: item.rec.previewUrl}, null, 2));
      exec('start "" "' + item.rec.previewUrl + '"');
      await new Promise(r=>setTimeout(r, 1500));
    }
    console.log('\nDone.');
  }catch(e){
    console.error('ERR', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
