(function(){
  // Nivus.loader.js - loads Nivus.js (original) and Nivus.features.js (visual-only) in order
  // Usage: point your injector to the raw URL of this file and enable URL execution.

  function loadScript(src, cb){
    var s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onload = function(){ console.log('[Nivus.loader] Loaded', src); cb && cb(null); };
    s.onerror = function(e){ console.error('[Nivus.loader] Failed to load', src, e); cb && cb(e); };
    document.head.appendChild(s);
  }

  function whenGameframeReady(cb, timeout){
    timeout = timeout || 15000;
    if(document.querySelector('.gameframe')) return cb();
    var start = Date.now();
    var iv = setInterval(function(){
      if(document.querySelector('.gameframe')){ clearInterval(iv); return cb(); }
      if(Date.now() - start > timeout){ clearInterval(iv); console.warn('[Nivus.loader] timeout waiting for .gameframe'); return cb(); }
    }, 200);
  }

  var NivusURL = 'https://raw.githubusercontent.com/ogblkee/haxballmobile/main/Nivus.js';
  var FeaturesURL = 'https://raw.githubusercontent.com/ogblkee/haxballmobile/main/Nivus.features.js';

  // Start sequence
  try{
    whenGameframeReady(function(){
      loadScript(NivusURL, function(err){
        if(err) return console.error('[Nivus.loader] Could not load Nivus.js');
        // small delay to let Nivus initialize DOM/widgets
        setTimeout(function(){
          loadScript(FeaturesURL, function(err2){
            if(err2) return console.warn('[Nivus.loader] Could not load features');
            console.log('[Nivus.loader] Nivus + features loaded');
          });
        }, 400);
      });
    }, 15000);
  }catch(e){ console.error('[Nivus.loader] error', e); }
})();
