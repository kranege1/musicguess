const http = require('http');
function get(url){
  return new Promise((res,rej)=>{
    http.get(url, r=>{
      let d='';
      r.on('data', c=> d+=c);
      r.on('end', ()=> res(d));
    }).on('error', e=> rej(e));
  });
}

(async ()=>{
  try{
    const compRaw = await get('http://localhost:3000/json/mappings/composers.json');
    const comp = JSON.parse(compRaw);
    for(const k of Object.keys(comp)){
      const arr = comp[k];
      if(Array.isArray(arr) && arr.length){
        const s = arr.find(x=> x.previewUrl);
        if(s){
          console.log('PLAYING: ' + k);
          console.log(JSON.stringify({artist: s.artist, track: s.track, previewUrl: s.previewUrl}, null, 2));
          const { exec } = require('child_process');
          exec('start "" "' + s.previewUrl + '"');
          return;
        }
      }
    }
    console.log('NO_PLAYABLE_COMPOSER_FOUND');
  }catch(e){
    console.error('ERR', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
