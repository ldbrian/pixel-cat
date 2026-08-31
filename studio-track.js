// studio-track.js — 工作室通用埋点（一次接入，所有小玩意儿复用）
//
// 接入方式（每个作品）：
//   1. 页面加载本文件前设置：window.STUDIO_CONFIG = { siteId: '作品名' }
//   2. 之后可调 window.STUDIO.track(...) / .start() / .interact() / .share()
//
// 事件定义：
//   view      看到了（页面加载，自动触发）
//   return    回来了（此前访问过，再次加载，自动触发）
//   start     开始玩（首次有效交互，作品调用 STUDIO.start()）
//   interact  发生一次核心互动（作品调用 STUDIO.interact()）
//   share     点击分享（作品调用 STUDIO.share()）
//
// 后端（三选一，按优先级）：
//   A. Umami：页面加 <script async src="https://你的umami/script.js" data-website-id="XXX"></script>
//      并设 STUDIO_CONFIG.umamiWebsiteId 或用默认。自动走 umami.track()
//   B. 自定义接口：设 STUDIO_CONFIG.endpoint = 'https://.../event'，用 sendBeacon POST
//   C. 都没有：落到 console.log（开发调试），不影响功能
(function () {
  var C = window.STUDIO_CONFIG = window.STUDIO_CONFIG || {};
  var SITE = C.siteId || 'default';
  var KEY = 'studio_visit_' + SITE;
  var started = false;

  function send(name, props) {
    props = props || {};
    if (C.umamiWebsiteId && typeof window.umami !== 'undefined' && window.umami.track) {
      try { window.umami.track(name, props); } catch (e) {}
      return;
    }
    if (C.endpoint) {
      try {
        var data = JSON.stringify({ event: name, props: props, site: SITE, ts: Date.now() });
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          navigator.sendBeacon(C.endpoint, new Blob([data], { type: 'application/json' }));
        } else if (typeof fetch !== 'undefined') {
          fetch(C.endpoint, { method: 'POST', body: data, keepalive: true });
        }
      } catch (e) {}
      return;
    }
    if (C.debug !== false) console.log('[studio-track]', SITE, name, props);
  }

  // view + return（页面加载时自动）
  var isReturn = false;
  try {
    isReturn = localStorage.getItem(KEY) !== null;
    localStorage.setItem(KEY, String(Date.now()));
  } catch (e) {}
  send('view');
  if (isReturn) send('return');

  window.STUDIO = {
    track: function (name, props) { send(name, props); },
    start: function (props) { if (!started) { started = true; send('start', props); } },
    interact: function (props) { send('interact', props); },
    share: function (props) { send('share', props); }
  };
})();
