(function(){
  'use strict';
  const KEY_ENABLED = 'nivus_aim_enabled';
  const KEY_LENGTH = 'nivus_aim_length';
  const KEY_COLOR = 'nivus_aim_color';
  if (localStorage.getItem(KEY_ENABLED) === null) localStorage.setItem(KEY_ENABLED, '1');
  if (localStorage.getItem(KEY_LENGTH) === null) localStorage.setItem(KEY_LENGTH, '800');
  if (localStorage.getItem(KEY_COLOR) === null) localStorage.setItem(KEY_COLOR, 'rgba(255,60,60,0.95)');

  function safeLog(){ try{ console.log.apply(console, ['[Nivus.features]'].concat(Array.from(arguments))); }catch(e){} }

  let canvas, ctx;
  function ensureCanvas(){
    if (canvas) return canvas;
    canvas = document.getElementById('nivus-aim-canvas');
    if (!canvas){
      canvas = document.createElement('canvas');
      canvas.id = 'nivus-aim-canvas';
      canvas.style.position = 'fixed';
      canvas.style.left = '0'; canvas.style.top = '0';
      canvas.style.width = '100%'; canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none'; canvas.style.zIndex = 2147483645;
      document.body.appendChild(canvas);
    }
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx = canvas.getContext('2d');
    if (dpr !== 1) ctx.setTransform(dpr,0,0,dpr,0,0);
    return canvas;
  }
  function clearCanvas(){ if (ctx) ctx.clearRect(0,0,canvas.width, canvas.height); }

  function createUI(){
    if (document.getElementById('nivus-aim-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'nivus-aim-btn';
    btn.textContent = localStorage.getItem(KEY_ENABLED) === '1' ? 'AIM ON' : 'AIM OFF';
    Object.assign(btn.style,{ position: 'fixed', left: '8px', bottom: '8px', zIndex: 2147483646, padding: '8px 10px', background: '#111', color:'#fff', border:'1px solid #444', borderRadius:'8px', fontSize:'13px' });
    btn.addEventListener('click', ()=>{ const enabled = localStorage.getItem(KEY_ENABLED) !== '1'; localStorage.setItem(KEY_ENABLED, enabled ? '1' : '0'); btn.textContent = enabled ? 'AIM ON' : 'AIM OFF'; if (!enabled) clearCanvas(); });
    const cfg = document.createElement('button');
    cfg.id = 'nivus-aim-cfg'; cfg.textContent = '⚙';
    Object.assign(cfg.style,{ position: 'fixed', left: '8px', bottom: '52px', zIndex: 2147483646, padding: '6px 8px', background: '#111', color:'#fff', border:'1px solid #444', borderRadius:'8px', fontSize:'13px' });
    cfg.addEventListener('click', ()=> openSettings());
    document.body.appendChild(btn); document.body.appendChild(cfg);
  }

  function openSettings(){
    if (document.getElementById('nivus-aim-settings')) return;
    const modal = document.createElement('div'); modal.id = 'nivus-aim-settings';
    Object.assign(modal.style, {position:'fixed', right:'8px', bottom:'8px', zIndex:2147483647, background:'#111', color:'#fff', padding:'10px', borderRadius:'8px', border:'1px solid #444', width:'220px'});
    modal.innerHTML = `
      <div style="font-weight:bold;margin-bottom:6px">Nivus Aim</div>
      <label style="display:block;margin-bottom:6px">Length: <input id="nivus-aim-len" type="range" min="100" max="2000" step="50"></label>
      <label style="display:block;margin-bottom:6px">Color: <input id="nivus-aim-color" type="color"></label>
      <div style="display:flex;gap:8px;margin-top:8px"><button id="nivus-aim-close">Close</button><button id="nivus-aim-reset">Reset</button></div>
    `;
    document.body.appendChild(modal);
    const len = document.getElementById('nivus-aim-len');
    const color = document.getElementById('nivus-aim-color');
    const currentLen = parseInt(localStorage.getItem(KEY_LENGTH),10) || 800;
    len.value = currentLen;
    function rgbaToHex(rgba){
      const m = rgba.match(/rgba?\(([^)]+)\)/);
      if(!m) return '#ff3c3c';
      const parts = m[1].split(',').map(s=>parseInt(s.trim()));
      const r = parts[0], g = parts[1], b = parts[2];
      return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
    }
    const rgba = localStorage.getItem(KEY_COLOR) || 'rgba(255,60,60,0.95)';
    color.value = rgbaToHex(rgba);
    document.getElementById('nivus-aim-close').addEventListener('click',()=>{ modal.remove(); });
    document.getElementById('nivus-aim-reset').addEventListener('click',()=>{ localStorage.setItem(KEY_LENGTH,'800'); localStorage.setItem(KEY_COLOR,'rgba(255,60,60,0.95)'); len.value=800; color.value='#ff3c3c'; });
    len.addEventListener('input', ()=>{ localStorage.setItem(KEY_LENGTH, String(len.value)); });
    color.addEventListener('input', ()=>{ const hex = color.value; const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16); localStorage.setItem(KEY_COLOR, `rgba(${r},${g},${b},0.95)`); });
  }

  function getJoystickCenter(){
    try{
      let el = document.getElementById('joystick');
      if(!el){
        const gf = document.querySelector('.gameframe');
        if(gf && gf.contentWindow){
          try{ el = gf.contentWindow.document.getElementById('joystick'); }catch(e){}
        }
      }
      if(el){ const r = el.getBoundingClientRect(); return {x: r.left + r.width/2, y: r.top + r.height/2}; }
    }catch(e){}
    return { x: window.innerWidth * 0.18, y: window.innerHeight * 0.82 };
  }

  function drawAimFrom(source, angle, length, color){
    ensureCanvas(); if(!ctx) return; clearCanvas();
    const segs = []; let x = source.x, y = source.y; let vx = Math.cos(angle), vy = Math.sin(angle); let remaining = length;
    for(let iter=0; iter<12 && remaining>0; iter++){
      let t = Infinity, nx = null, ny = null;
      if (vx > 1e-6) { const tx = (window.innerWidth - x) / vx; if (tx>0 && tx < t) { t = tx; nx = -1; ny = 0; } }
      if (vx < -1e-6) { const tx = (0 - x) / vx; if (tx>0 && tx < t) { t = tx; nx = 1; ny = 0; } }
      if (vy > 1e-6) { const ty = (window.innerHeight - y) / vy; if (ty>0 && ty < t) { t = ty; nx = 0; ny = -1; } }
      if (vy < -1e-6) { const ty = (0 - y) / vy; if (ty>0 && ty < t) { t = ty; nx = 0; ny = 1; } }
      if (!isFinite(t)) { segs.push({x2: x + vx * remaining, y2: y + vy * remaining}); break; }
      const dist = Math.hypot(vx * t, vy * t);
      if (dist >= remaining){ segs.push({x2: x + vx * (remaining), y2: y + vy * (remaining)}); break; }
      const hitX = x + vx * t; const hitY = y + vy * t;
      segs.push({x2: hitX, y2: hitY});
      remaining -= dist;
      if (nx !== null){ if (nx !== 0) vx = -vx; if (ny !== 0) vy = -vy; }
      x = hitX + vx * 0.01; y = hitY + vy * 0.01;
    }
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(source.x, source.y);
    for(const s of segs){ ctx.lineTo(s.x2, s.y2); }
    ctx.stroke(); ctx.restore();
  }

  let lastPointer = null;
  function onPointerDown(e){ if (e.clientX <= window.innerWidth * 0.6){ lastPointer = {id: e.pointerId, x: e.clientX, y: e.clientY}; } }
  function onPointerMove(e){ if (!lastPointer) return; if (e.pointerId !== lastPointer.id) return; lastPointer.x = e.clientX; lastPointer.y = e.clientY; }
  function onPointerUp(e){ if(lastPointer && e.pointerId === lastPointer.id) lastPointer = null; }

  let rafId = null;
  function frame(){
    try{
      const enabled = localStorage.getItem(KEY_ENABLED) === '1';
      if(!enabled){ clearCanvas(); rafId = requestAnimationFrame(frame); return; }
      ensureCanvas(); createUI();
      const len = parseInt(localStorage.getItem(KEY_LENGTH),10) || 800;
      const color = localStorage.getItem(KEY_COLOR) || 'rgba(255,60,60,0.95)';
      const center = getJoystickCenter();
      if (lastPointer){
        const dx = lastPointer.x - center.x; const dy = lastPointer.y - center.y;
        const angle = Math.atan2(dy, dx);
        drawAimFrom(center, angle, len, color);
      } else {
        let thumb = document.getElementById('thumb');
        if(!thumb){
          try{ const gf = document.querySelector('.gameframe'); if(gf && gf.contentWindow) thumb = gf.contentWindow.document.getElementById('thumb'); }catch(e){}
        }
        if(thumb){
          const tr = thumb.getBoundingClientRect(); const j = document.getElementById('joystick'); var jc = null;
          if(j){ const jr = j.getBoundingClientRect(); jc = {x: jr.left + jr.width/2, y: jr.top + jr.height/2}; }
          const tx = tr.left + tr.width/2, ty = tr.top + tr.height/2;
          const source = jc || center;
          const dx = tx - source.x, dy = ty - source.y;
          const angle = Math.atan2(dy, dx);
          drawAimFrom(source, angle, len, color);
        } else { clearCanvas(); }
      }
    }catch(e){ safeLog('frame error', e); }
    rafId = requestAnimationFrame(frame);
  }

  function start(){ createUI(); ensureCanvas(); window.addEventListener('pointerdown', onPointerDown, {passive:true}); window.addEventListener('pointermove', onPointerMove, {passive:true}); window.addEventListener('pointerup', onPointerUp, {passive:true}); if (!rafId) rafId = requestAnimationFrame(frame); }
  function stop(){ window.removeEventListener('pointerdown', onPointerDown); window.removeEventListener('pointermove', onPointerMove); window.removeEventListener('pointerup', onPointerUp); if (rafId) cancelAnimationFrame(rafId); rafId = null; clearCanvas(); }

  try{ const oldBtn = document.getElementById('nivus-aim-btn'); if(oldBtn) oldBtn.remove(); const oldCfg = document.getElementById('nivus-aim-cfg'); if(oldCfg) oldCfg.remove(); const oldSettings = document.getElementById('nivus-aim-settings'); if(oldSettings) oldSettings.remove(); const oldCanvas = document.getElementById('nivus-aim-canvas'); if(oldCanvas) oldCanvas.remove(); }catch(e){}
  start();
  window.NivusAim = { enable: ()=>{ localStorage.setItem(KEY_ENABLED,'1'); }, disable: ()=>{ localStorage.setItem(KEY_ENABLED,'0'); clearCanvas(); }, toggle: ()=>{ const v = localStorage.getItem(KEY_ENABLED)!=='1'; localStorage.setItem(KEY_ENABLED, v?'1':'0'); }, setLength: (n)=>{ localStorage.setItem(KEY_LENGTH,String(n)); }, setColor: (rgba)=>{ localStorage.setItem(KEY_COLOR, rgba); } };
  safeLog('Nivus.features (visual aim) loaded');
})();
