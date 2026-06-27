(function(){
  'use strict';

  // Nivus.features.js - visual-only aim overlay (always-on aimbot lines)
  // This version draws the trajectory line persistently (always visible) as requested.

  const ASSIST_KEY = 'nivus_aim_assist';
  const ASSIST_LENGTH_KEY = 'nivus_aim_length';
  const ASSIST_COLOR_KEY = 'nivus_aim_color';

  // Ensure defaults
  if (localStorage.getItem(ASSIST_KEY) === null) localStorage.setItem(ASSIST_KEY, '1');
  if (localStorage.getItem(ASSIST_LENGTH_KEY) === null) localStorage.setItem(ASSIST_LENGTH_KEY, '800');
  if (localStorage.getItem(ASSIST_COLOR_KEY) === null) localStorage.setItem(ASSIST_COLOR_KEY, 'rgba(255,60,60,0.95)');

  function safeLog(){ try{ console.log.apply(console, ['[Nivus.features]'].concat(Array.from(arguments))); }catch(e){} }

  // Cleanup previous UI if present
  function cleanupOld(){ ['nivus-aim-btn','nivus-aim-cfg','nivus-aim-settings','nivus-aim-canvas'].forEach(id=>{ try{ const el = document.getElementById(id); if(el) el.remove(); }catch(e){} }); }
  cleanupOld();

  // Canvas setup
  let canvas, ctx;
  function ensureCanvas(){
    if (canvas) return canvas;
    canvas = document.createElement('canvas');
    canvas.id = 'nivus-aim-canvas';
    Object.assign(canvas.style,{position:'fixed',left:0,top:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:2147483645});
    document.body.appendChild(canvas);
    const dpr = window.devicePixelRatio || 1;
    function resize(){
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx = canvas.getContext('2d');
      if (dpr !== 1) ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    resize();
    window.addEventListener('resize', resize);
    return canvas;
  }
  function clearCanvas(){ if (ctx) ctx.clearRect(0,0,canvas.width, canvas.height); }

  // UI: keep small controls but lines will remain always-on
  function createUI(){
    if (document.getElementById('nivus-aim-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'nivus-aim-btn';
    btn.textContent = 'AIM'; // simplified label
    Object.assign(btn.style,{position:'fixed',left:'8px',bottom:'8px',zIndex:2147483646,padding:'6px 8px',background:'#111',color:'#fff',border:'1px solid #444',borderRadius:'8px',fontSize:'12px'});
    // Clicking the button opens settings (does not disable the persistent drawing)
    btn.addEventListener('click', ()=> openSettings());

    const cfg = document.createElement('button'); cfg.id = 'nivus-aim-cfg'; cfg.textContent = '⚙';
    Object.assign(cfg.style,{position:'fixed',left:'8px',bottom:'44px',zIndex:2147483646,padding:'6px 8px',background:'#111',color:'#fff',border:'1px solid #444',borderRadius:'8px',fontSize:'12px'});
    cfg.addEventListener('click', ()=> openSettings());

    document.body.appendChild(btn);
    document.body.appendChild(cfg);
  }

  function openSettings(){
    if (document.getElementById('nivus-aim-settings')) return;
    const modal = document.createElement('div'); modal.id = 'nivus-aim-settings';
    Object.assign(modal.style,{position:'fixed',right:'8px',bottom:'8px',zIndex:2147483647,background:'#111',color:'#fff',padding:'10px',borderRadius:'8px',border:'1px solid #444',width:'260px',fontSize:'13px'});
    modal.innerHTML = `
      <div style="font-weight:bold;margin-bottom:6px">Nivus Aim (always on)</div>
      <label style="display:block;margin-bottom:6px">Length: <input id="nivus-aim-len" type="range" min="100" max="2000" step="50" style="width:100%"></label>
      <label style="display:block;margin-bottom:6px">Color: <input id="nivus-aim-color" type="color" style="width:100%"></label>
      <div style="display:flex;gap:8px;margin-top:8px"><button id="nivus-aim-close">Close</button><button id="nivus-aim-reset">Reset</button></div>
      <div style="margin-top:8px;font-size:12px;color:#ccc">A mira é desenhada permanentemente. Use o mouse (desktop) ou toque (mobile) para direcionar.</div>
    `;
    document.body.appendChild(modal);
    const len = document.getElementById('nivus-aim-len');
    const color = document.getElementById('nivus-aim-color');
    const currentLen = parseInt(localStorage.getItem(ASSIST_LENGTH_KEY),10) || 800;
    len.value = currentLen;
    function rgbaToHex(rgba){
      const m = rgba.match(/rgba?\(([^)]+)\)/);
      if(!m) return '#ff3c3c';
      const parts = m[1].split(',').map(s=>parseInt(s.trim()));
      const r = parts[0], g = parts[1], b = parts[2];
      return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
    }
    const rgba = localStorage.getItem(ASSIST_COLOR_KEY) || 'rgba(255,60,60,0.95)';
    color.value = rgbaToHex(rgba);
    document.getElementById('nivus-aim-close').addEventListener('click',()=>{ modal.remove(); });
    document.getElementById('nivus-aim-reset').addEventListener('click',()=>{ localStorage.setItem(ASSIST_LENGTH_KEY,'800'); localStorage.setItem(ASSIST_COLOR_KEY,'rgba(255,60,60,0.95)'); len.value=800; color.value='#ff3c3c'; });
    len.addEventListener('input', ()=>{ localStorage.setItem(ASSIST_LENGTH_KEY, String(len.value)); });
    color.addEventListener('input', ()=>{ const hex = color.value; const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16); localStorage.setItem(ASSIST_COLOR_KEY, `rgba(${r},${g},${b},0.95)`); });
  }

  // joystick center detection
  function getJoystickCenter(){
    try{
      let el = document.getElementById('joystick');
      if(!el){
        const gf = document.querySelector('.gameframe');
        if(gf && gf.contentWindow){ try{ el = gf.contentWindow.document.getElementById('joystick'); }catch(e){} }
      }
      if(el){ const r = el.getBoundingClientRect(); return {x: r.left + r.width/2, y: r.top + r.height/2}; }
    }catch(e){}
    return { x: window.innerWidth * 0.18, y: window.innerHeight * 0.82 };
  }

  // draw single-line aimbot from source -> pointer/mouse
  function drawAimFrom(source, targetX, targetY, length, color){
    ensureCanvas(); if(!ctx) return; clearCanvas();
    const dx = targetX - source.x; const dy = targetY - source.y; const angle = Math.atan2(dy, dx);
    const dist = Math.hypot(dx, dy); const drawLen = Math.min(length, dist || length);
    const endX = source.x + Math.cos(angle) * drawLen; const endY = source.y + Math.sin(angle) * drawLen;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(source.x, source.y); ctx.lineTo(endX, endY); ctx.stroke();
    const ah = 10; const a1 = angle + Math.PI*0.75; const a2 = angle - Math.PI*0.75; ctx.beginPath(); ctx.moveTo(endX, endY); ctx.lineTo(endX + Math.cos(a1)*ah, endY + Math.sin(a1)*ah); ctx.lineTo(endX + Math.cos(a2)*ah, endY + Math.sin(a2)*ah); ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.restore();
  }

  // track mouse and pointers
  let lastMouse = {x: window.innerWidth/2, y: window.innerHeight/2};
  function onMouseMove(e){ lastMouse.x = e.clientX; lastMouse.y = e.clientY; }
  window.addEventListener('mousemove', onMouseMove, {passive:true});

  let lastPointer = null;
  function onPointerDown(e){ if (e.clientX <= window.innerWidth * 0.95){ lastPointer = {id:e.pointerId, x:e.clientX, y:e.clientY}; } }
  function onPointerMove(e){ if(!lastPointer) return; if(e.pointerId !== lastPointer.id) return; lastPointer.x = e.clientX; lastPointer.y = e.clientY; }
  function onPointerUp(e){ if(lastPointer && e.pointerId === lastPointer.id) lastPointer = null; }
  window.addEventListener('pointerdown', onPointerDown, {passive:true});
  window.addEventListener('pointermove', onPointerMove, {passive:true});
  window.addEventListener('pointerup', onPointerUp, {passive:true});

  // keyboard: keep G toggle for backwards compatibility but drawing remains persistent
  function onKeyDown(e){ const active = document.activeElement; if(active && (active.tagName==='INPUT' || active.tagName==='TEXTAREA' || active.isContentEditable)) return; if(e.code === 'KeyG'){ const enabled = localStorage.getItem(ASSIST_KEY)!=='1'; localStorage.setItem(ASSIST_KEY, enabled? '1':'0'); const btn = document.getElementById('nivus-aim-btn'); if(btn) btn.textContent = 'AIM'; } }
  window.addEventListener('keydown', onKeyDown, false);

  // patch updateJoystick if present to draw when joystick moves
  function patchUpdateJoystick(){ try{ if(typeof window.updateJoystick !== 'function') return; const orig = window.updateJoystick; window.updateJoystick = function(touch){ try{ orig.call(this, touch); }catch(e){ safeLog('orig updateJoystick failed',e); } try{ const j = document.getElementById('joystick') || (document.querySelector('.gameframe') && document.querySelector('.gameframe').contentWindow && document.querySelector('.gameframe').contentWindow.document.getElementById('joystick')); if(!j) return; const rect = j.getBoundingClientRect(); const centerX = rect.left + rect.width/2; const centerY = rect.top + rect.height/2; const tx = (touch && touch.clientX)? touch.clientX : (lastPointer ? lastPointer.x : lastMouse.x); const ty = (touch && touch.clientY)? touch.clientY : (lastPointer ? lastPointer.y : lastMouse.y); const len = parseFloat(localStorage.getItem(ASSIST_LENGTH_KEY)) || Math.max(window.innerWidth, window.innerHeight)/3; const color = localStorage.getItem(ASSIST_COLOR_KEY) || 'rgba(255,60,60,0.95)'; drawAimFrom({x:centerX,y:centerY}, tx, ty, len, color); }catch(e){} }; }catch(e){} }

  // main loop - always draw (persistent aimbot)
  let raf = null;
  function frame(){
    try{
      ensureCanvas(); createUI();
      const center = getJoystickCenter();
      const len = parseInt(localStorage.getItem(ASSIST_LENGTH_KEY),10) || 800;
      const color = localStorage.getItem(ASSIST_COLOR_KEY) || 'rgba(255,60,60,0.95)';
      if(lastPointer){ drawAimFrom(center, lastPointer.x, lastPointer.y, len, color); }
      else { drawAimFrom(center, lastMouse.x, lastMouse.y, len, color); }
    }catch(e){ safeLog('frame error', e); }
    raf = requestAnimationFrame(frame);
  }

  // start
  ensureCanvas(); createUI(); patchUpdateJoystick(); if(!raf) raf = requestAnimationFrame(frame);

  // expose API
  window.NivusFeatures = {
    setAimLength: (v)=>{ localStorage.setItem(ASSIST_LENGTH_KEY, String(v)); },
    setAimColor: (rgba)=>{ localStorage.setItem(ASSIST_COLOR_KEY, rgba); }
  };

  safeLog('Nivus.features (always-on) loaded');
})();
