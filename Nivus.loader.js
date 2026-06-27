(function(){
  // Nivus.loader.js - loads Nivus.js (original) and Nivus.features.js (visual-only) in order
  // Modified: always wait 5 seconds after injection, then load both scripts sequentially.

  function loadScript(src, cb){
    var s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onload = function(){ console.log('[Nivus.loader] Loaded', src); cb && cb(null); };
    s.onerror = function(e){ console.error('[Nivus.loader] Failed to load', src, e); cb && cb(e); };
    document.head.appendChild(s);
  }

  var NivusURL = 'https://raw.githubusercontent.com/ogblkee/haxballmobile/main/Nivus.js';
  var FeaturesURL = 'https://raw.githubusercontent.com/ogblkee/haxballmobile/main/Nivus.features.js';

  try{
    console.log('[Nivus.loader] Waiting 5 seconds before loading scripts...');
    setTimeout(function(){
      loadScript(NivusURL, function(err){
        if(err) return console.error('[Nivus.loader] Could not load Nivus.js');
        // small delay to let Nivus initialize DOM/widgets
        setTimeout(function(){
          loadScript(FeaturesURL, function(err2){
            if(err2) return console.warn('[Nivus.loader] Could not load features');
            console.log('[Nivus.loader] Nivus + features loaded (after 5s delay)');
          });
        }, 400);
      });
    }, 5000);
  }catch(e){ console.error('[Nivus.loader] error', e); }
})();
