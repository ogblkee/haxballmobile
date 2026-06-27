// Nivus extra features: mobile UI glue, aim assist (trajectory overlay), chat button
// This file is loaded alongside Nivus.js to add optional features without editing the main file.
(function(){
  const OWNER = 'ogblkee';
  const ASSIST_KEY = 'nivus_aim_assist';
  const ASSIST_LENGTH_KEY = 'nivus_aim_length';

  function safeLog(...args){ try{ console.log('[Nivus.features]',...args) }catch{} }

  function waitFor(conditionFn, cb, interval=200, timeout=10000){
    const start = Date.now();
    const t = setInterval(()=>{
      try{
        if(conditionFn()){
          clearInterval(t); cb();
        } else if(Date.now()-start>timeout){ clearInterval(t); safeLog('waitFor timeout'); }
      }catch(e){ clearInterval(t); safeLog('waitFor error',e) }
    }, interval);
  }

  function injectStyles(){
    const css = `
      .nivus-btn{position:fixed;z-index:2147483646;background:rgba(0,0,0,0.5);color:#fff;border-radius:10px;padding:8px;display:flex;align-items:center;justify-content:center;font-size:14px}
      .nivus-kick{right:4vw;bottom:10vh;width:12vw;height:12vw;border-radius:50%}
      .nivus-chat{right:4vw;bottom:25vh;width:10vw;height:10vw;border-radius:8px}
      .nivus-aim-toggle{left:4vw;bottom:4vh;width:10vw;height:8vh;border-radius:8px}
      #nivus-aim-canvas{position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483645}
    `;
    const s = document.createElement('style'); s.innerHTML = css; document.head.appendChild(s);
  }

  function createButtons(){
    // Kick button - if original exists, we won't duplicate
    if(!document.getElementById('nivus-kick')){
      const b = document.createElement('button'); b.id='nivus-kick'; b.className='nivus-btn nivus-kick'; b.innerText='KICK';
      b.addEventListener('pointerdown', (e)=>{ e.preventDefault(); try{ if(typeof kick==='function') kick('keydown'); else dispatchKey('keydown','KeyX'); }catch{} });
      b.addEventListener('pointerup', (e)=>{ e.preventDefault(); try{ if(typeof kick==='function') kick('keyup'); else dispatchKey('keyup','KeyX'); }catch{} });
      document.body.appendChild(b);
    }
    if(!document.getElementById('nivus-chat')){
      const c = document.createElement('button'); c.id='nivus-chat'; c.className='nivus-btn nivus-chat'; c.innerText='CHAT';
      c.addEventListener('click', ()=>{ try{ if(typeof chatToggle==='function'){ chatToggle(); setTimeout(()=>{ const inp = document.querySelector('.chatbox-view input'); if(inp) inp.focus(); },150); }else{ const inp=document.querySelector('.chatbox-view input'); if(inp){ inp.focus(); } } }catch(e){}});
      document.body.appendChild(c);
    }
    if(!document.getElementById('nivus-aim-toggle')){
      const t = document.createElement('button'); t.id='nivus-aim-toggle'; t.className='nivus-btn nivus-aim-toggle';
      t.innerText = localStorage.getItem(ASSIST_KEY)==='0' ? 'AIM OFF' : 'AIM ON';
      t.addEventListener('click', ()=>{ const enabled = localStorage.getItem(ASSIST_KEY)!=='1'; localStorage.setItem(ASSIST_KEY, enabled? '1':'0'); t.innerText = enabled? 'AIM ON':'AIM OFF'; if(!enabled) clearAim(); });
      document.body.appendChild(t);
    }
  }

  // Dispatch keyboard to gameFrame if available
  function dispatchKey(type, code){
    try{
      const ev = new KeyboardEvent(type, {code, bubbles:true, cancelable:true});
      if(window.gameFrame && gameFrame.document) gameFrame.document.dispatchEvent(ev);
      window.dispatchEvent(ev);
    }catch(e){ safeLog('dispatchKey err',e) }
  }

  // Aim canvas
  let aimCanvas, aimCtx;
  function ensureAimCanvas(){
    if(aimCanvas) return;
    aimCanvas = document.createElement('canvas'); aimCanvas.id='nivus-aim-canvas'; document.body.appendChild(aimCanvas);
    function resize(){ aimCanvas.width = window.innerWidth; aimCanvas.height = window.innerHeight; }
    resize(); window.addEventListener('resize', resize);
    aimCtx = aimCanvas.getContext('2d');
  }

  function drawAim(x,y,angle,len){
    if(localStorage.getItem(ASSIST_KEY)==='0') return; ensureAimCanvas();
    aimCtx.clearRect(0,0,aimCanvas.width,aimCanvas.height);
    aimCtx.strokeStyle = 'rgba(255,60,60,0.95)';
    aimCtx.lineWidth = 3;
    aimCtx.beginPath();
    aimCtx.moveTo(x,y);
    const dx = Math.cos(angle)*len;
    const dy = Math.sin(angle)*len;
    aimCtx.lineTo(x+dx, y+dy);
    aimCtx.stroke();
    // arrowhead
    const ah = 10; const a1 = angle + Math.PI*0.75; const a2 = angle - Math.PI*0.75;
    aimCtx.beginPath(); aimCtx.moveTo(x+dx,y+dy); aimCtx.lineTo(x+dx+Math.cos(a1)*ah, y+dy+Math.sin(a1)*ah); aimCtx.lineTo(x+dx+Math.cos(a2)*ah, y+dy+Math.sin(a2)*ah); aimCtx.closePath(); aimCtx.fillStyle='rgba(255,60,60,0.95)'; aimCtx.fill();
  }
  function clearAim(){ if(aimCtx) aimCtx.clearRect(0,0,aimCanvas.width,aimCanvas.height); }

  // Monkeypatch updateJoystick to compute angle and render aim
  function patchUpdateJoystick(){
    if(typeof window.updateJoystick !== 'function') return safeLog('updateJoystick not found yet');
    const orig = window.updateJoystick;
    window.updateJoystick = function(touch){
      try{ orig.call(this, touch); }catch(e){ safeLog('orig updateJoystick failed',e); }
      try{
        // compute angle same way as original
        const rect = joystick.getBoundingClientRect();
        const centerX = rect.left + rect.width/2;
        const centerY = rect.top + rect.height/2;
        const deltaX = (touch && touch.clientX? touch.clientX: centerX) - centerX;
        const deltaY = (touch && touch.clientY? touch.clientY: centerY) - centerY;
        const angle = Math.atan2(deltaY, deltaX);
        const dist = Math.min(joystick.clientWidth/2, Math.hypot(deltaX, deltaY));
        // aim length configurable
        const cfgLen = parseFloat(localStorage.getItem(ASSIST_LENGTH_KEY)) || Math.max(window.innerWidth, window.innerHeight)/3;
        drawAim(centerX, centerY, angle, cfgLen);
      }catch(e){ /*ignore*/ }
    }
  }

  // Also clear aim on resetJoystick
  function patchResetJoystick(){ if(typeof window.resetJoystick!=='function') return; const orig = window.resetJoystick; window.resetJoystick = function(){ try{ orig.call(this); }catch(e){} clearAim(); } }

  // Wait for joystick to exist and then wire things up
  waitFor(()=> typeof joystick !== 'undefined' && joystick && typeof updateJoystick === 'function', ()=>{
    injectStyles(); createButtons(); ensureAimCanvas(); patchUpdateJoystick(); patchResetJoystick(); safeLog('Nivus.features active');
  }, 200, 20000);

  // Allow external toggles via console
  window.NivusFeatures = {
    toggleAim: ()=>{ const enabled = localStorage.getItem(ASSIST_KEY)!=='1'; localStorage.setItem(ASSIST_KEY, enabled? '1':'0'); return enabled; },
    setAimLength: (v)=>{ localStorage.setItem(ASSIST_LENGTH_KEY, String(v)); },
    clearAim
  };
})();
