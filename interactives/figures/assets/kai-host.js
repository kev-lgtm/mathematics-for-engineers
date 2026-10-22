/* kai-host.js - include once on the HTML page that embeds the figures in <iframe>s.
   Each figure reports its height; this script sizes the matching iframe so
   nothing is clipped and no inner scrollbar appears. It reads only a number. */
(function () {
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.kai !== 'height' || typeof d.h !== 'number' || !isFinite(d.h)) return;
    var frames = document.getElementsByTagName('iframe');
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].contentWindow === e.source) {
        frames[i].style.height = Math.min(Math.max(d.h, 120), 2400) + 'px';
      }
    }
  });
})();
