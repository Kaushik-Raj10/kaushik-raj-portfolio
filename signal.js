const SignalLab = (() => {
  const TAU=Math.PI*2;

  function sampleWave(wave, phase) {
    const sine=Math.sin(phase);
    if(wave==='triangle')return Math.asin(sine)*2/Math.PI;
    if(wave==='square')return Math.tanh(5*sine);
    return sine;
  }

  function paintSignal(ctx,w,h,{time=0,wave='sine',frequency=220}={}) {
    ctx.clearRect(0,0,w,h);
    const background=ctx.createLinearGradient(0,0,w,h);
    background.addColorStop(0,'#171327');background.addColorStop(.5,'#221831');background.addColorStop(1,'#14131e');
    ctx.fillStyle=background;ctx.fillRect(0,0,w,h);
    const halo=ctx.createRadialGradient(w*.59,h*.47,0,w*.59,h*.47,w*.6);
    halo.addColorStop(0,'rgba(119,79,167,.19)');halo.addColorStop(1,'rgba(17,14,25,0)');
    ctx.fillStyle=halo;ctx.fillRect(0,0,w,h);
    const ink=ctx.createLinearGradient(w*.05,h,w*.94,0);
    ink.addColorStop(0,'#6c55cb');ink.addColorStop(.33,'#a994ff');ink.addColorStop(.63,'#d8adff');ink.addColorStop(1,'#f0bef7');
    const rows=46, columns=110;
    ctx.lineWidth=Math.max(.8,w*.00155);ctx.lineJoin='round';ctx.strokeStyle=ink;
    for(let row=0;row<rows;row++){
      const v=row/(rows-1);
      ctx.globalAlpha=.32+.66*Math.sin(Math.PI*(.1+.77*v));
      ctx.beginPath();
      for(let i=0;i<=columns;i++){
        const u=i/columns;
        const amplitude=Math.pow(Math.sin(Math.PI*u),.77)*Math.pow(Math.sin(Math.PI*(.11+.77*v)),.8);
        const phase=(u*1.38+v*.57)*TAU+time*.66+.8;
        const ripple=sampleWave(wave,phase*(.64+.36*frequency/220))*.66+.34*Math.sin(phase*.65-v*3.6);
        const x=w*(.025+.79*u+.16*v);
        const y=h*(.67-.42*v-.12*u)-ripple*amplitude*h*.38;
        if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha=1;
  }

  function mountSignal(shouldMove) {
    const preview=document.querySelector('#signal-preview'), screen=document.querySelector('#signal-screen');
    const dialog=document.querySelector('#signal-dialog'), slider=document.querySelector('#pitch');
    const previewCtx=preview.getContext('2d'), screenCtx=screen.getContext('2d');
    const output=document.querySelector('#pitch-value'), readout=document.querySelector('#lab-readout');
    const sound=document.querySelector('#sound-toggle'), audioStatus=document.querySelector('#audio-status');
    const choices=[...document.querySelectorAll('[data-wave]')];
    let wave='sine', hz=220, audio=null, gain=null, osc=null, soundRequest=0;
    let previewVisible=false, frame=0, last=0, elapsed=0, dirty=true;
    function draw(canvas,ctx,state){
      if(!ctx)return;
      const rect=canvas.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      const ratio=Math.min(window.devicePixelRatio||1,1.6);
      const w=Math.round(rect.width*ratio),h=Math.round(rect.height*ratio);
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
      paintSignal(ctx,w,h,state);
    }
    function request(){if(!frame)frame=requestAnimationFrame(render);}
    function render(now){
      frame=0;
      if(document.hidden||(!previewVisible&&!dialog.open)){last=0;return;}
      const running=shouldMove();
      if(running && last && now-last<48 && !dirty){request();return;}
      if(running&&last)elapsed+=Math.min((now-last)/1000,.09);
      last=now;
      if(previewVisible&&!dialog.open)draw(preview,previewCtx,{time:elapsed*.48});
      if(dialog.open)draw(screen,screenCtx,{time:elapsed,wave,frequency:hz});
      dirty=false;
      if(running)request();
    }
    function refresh(){dirty=true;last=0;request();}
    new IntersectionObserver(([entry])=>{previewVisible=entry.isIntersecting;refresh();}).observe(preview);
    const resize=new ResizeObserver(refresh);resize.observe(preview);resize.observe(screen);
    window.addEventListener('portfolio-motion',refresh);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stopSound();refresh();});
    function update(){
      output.value=hz+' Hz';readout.textContent=wave.toUpperCase()+' / '+hz+' HZ';
      choices.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.wave===wave)));
      if(osc){osc.type=wave;osc.frequency.setTargetAtTime(hz,audio.currentTime,.02);}
      refresh();
    }
    choices.forEach(b=>b.addEventListener('click',()=>{wave=b.dataset.wave;update();}));
    slider.addEventListener('input',()=>{hz=Number(slider.value);update();});
    function stopSound(){
      soundRequest++;
      if(osc){
        const oldOsc=osc, oldGain=gain, oldAudio=audio;
        const t=oldAudio.currentTime;
        oldGain.gain.cancelScheduledValues(t);oldGain.gain.setTargetAtTime(.0001,t,.012);
        oldOsc.onended=()=>{oldOsc.disconnect();oldGain.disconnect();};
        oldOsc.stop(t+.065);osc=null;gain=null;
      }
      sound.setAttribute('aria-pressed','false');sound.querySelector('span').textContent='Play sound';
    }
    sound.addEventListener('click',async()=>{
      if(osc||sound.getAttribute('aria-busy')==='true'){stopSound();sound.removeAttribute('aria-busy');return;}
      const attempt=++soundRequest;
      const Audio=window.AudioContext||window.webkitAudioContext;
      if(!Audio){audioStatus.textContent='Audio playback is unavailable in this browser.';return;}
      sound.setAttribute('aria-busy','true');
      try{
        audio=audio||new Audio();
        if(audio.state!=='running')await audio.resume();
        if(attempt!==soundRequest||!dialog.open)return;
        gain=audio.createGain();osc=audio.createOscillator();
        osc.type=wave;osc.frequency.value=hz;
        gain.gain.setValueAtTime(.0001,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.075,audio.currentTime+.06);
        osc.connect(gain);gain.connect(audio.destination);osc.start();
        sound.setAttribute('aria-pressed','true');sound.querySelector('span').textContent='Stop sound';audioStatus.textContent='';
      }catch{audioStatus.textContent='Your browser could not start audio playback.';stopSound();}
      finally{sound.removeAttribute('aria-busy');}
    });
    dialog.addEventListener('portfolio-open',refresh);
    dialog.addEventListener('close',()=>{stopSound();refresh();});
  }
  return { mount: mountSignal };
})();
