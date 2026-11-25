/*! kai3d.js - a small rotatable 3D view for the interactive figures (needs kai.js). No dependencies.
   Orthographic projection, z up. Drag the picture (or use the arrow keys when it has focus) to turn it.
   Usage:  var V = KAI.view3(svgElement, { range: 3 });   V.onDraw(function () { ...draw with V.line, V.poly, ... });  V.redraw(); */
(function (global) {
  'use strict';
  var KAI = global.KAI;
  if (!KAI) throw new Error('kai3d.js needs kai.js first');

  KAI.view3 = function (svg, o) {
    o = o || {};
    var R = o.range || 3, V = { svg: svg, R: R }, yaw = o.yaw === undefined ? -38 : o.yaw, pitch = o.pitch === undefined ? 22 : o.pitch;
    var W = 400, H = 320, S = 40, cx = 200, cy = 160, drawFns = [], dragging = false, last = null;
    var gMain = KAI.s('g', { class: 'g3' });
    svg.appendChild(gMain);
    svg.style.touchAction = 'none';
    svg.setAttribute('tabindex', '0');
    svg.setAttribute('role', 'application');
    svg.setAttribute('aria-roledescription', '3D picture');
    V.layer = gMain;

    function trig() { var y = yaw * Math.PI / 180, p = pitch * Math.PI / 180; return { cy: Math.cos(y), sy: Math.sin(y), cp: Math.cos(p), sp: Math.sin(p) }; }
    V.project = function (q) {
      var t = trig(), x1 = q[0] * t.cy - q[1] * t.sy, y1 = q[0] * t.sy + q[1] * t.cy, z1 = q[2];
      var sx = x1, sy = z1 * t.cp + y1 * t.sp, d = y1 * t.cp - z1 * t.sp;
      return [cx + S * sx, cy - S * sy, d];
    };
    V.depth = function (pts) { var s = 0; pts.forEach(function (p) { s += V.project(p)[2]; }); return s / pts.length; };
    V.view = function () { return { yaw: yaw, pitch: pitch }; };
    V.setView = function (a, b) { yaw = a; pitch = KAI.clamp(b, -88, 88); V.redraw(); };

    function size() {
      var w = Math.max(240, Math.floor(svg.parentNode.clientWidth) || 400);
      W = w; H = Math.round(Math.min(w * 0.82, 460));
      S = (o.zoom || 1) * Math.min(W, H * 1.15) / (2.35 * R); cx = W / 2; cy = H / 2 + 6;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', W); svg.setAttribute('height', H);
    }
    V.size = function () { return { W: W, H: H, S: S }; };
    /* change the half-width of the box shown (no redraw: call it at the start of a draw function) */
    V.setRange = function (r) { if (r === R) return; R = r; V.R = r; size(); };
    function pp(list) { return list.map(function (q) { var p = V.project(q); return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '); }

    V.line = function (a, b, attrs, layer) {
      var p = V.project(a), q = V.project(b);
      var e = KAI.s('line', Object.assign({ x1: p[0], y1: p[1], x2: q[0], y2: q[1] }, attrs)); (layer || gMain).appendChild(e); return e;
    };
    V.poly = function (list, attrs, layer) { var e = KAI.s('polygon', Object.assign({ points: pp(list) }, attrs)); (layer || gMain).appendChild(e); return e; };
    V.polyline = function (list, attrs, layer) { var e = KAI.s('polyline', Object.assign({ points: pp(list), fill: 'none' }, attrs)); (layer || gMain).appendChild(e); return e; };
    V.dot = function (q, r, attrs, layer) { var p = V.project(q), e = KAI.s('circle', Object.assign({ cx: p[0], cy: p[1], r: r }, attrs)); (layer || gMain).appendChild(e); return e; };
    V.text = function (q, str, attrs, layer) {
      var p = V.project(q), e = KAI.s('text', Object.assign({ x: p[0], y: p[1], class: 'lbl' }, attrs)); e.textContent = str; (layer || gMain).appendChild(e); return e;
    };
    V.arrow = function (a, b, attrs, layer) {
      attrs = attrs || {};
      var p = V.project(a), q = V.project(b), col = attrs.stroke || 'var(--ink)', w = attrs.width || 2.6, hl = attrs.head || 10;
      var dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy), g = KAI.s('g');
      if (len < 2) { g.appendChild(KAI.s('circle', { cx: q[0], cy: q[1], r: w, fill: col })); (layer || gMain).appendChild(g); return g; }
      var ux = dx / len, uy = dy / len, h = Math.min(hl, len * 0.7), px = -uy, py = ux;
      g.appendChild(KAI.s('line', { x1: p[0], y1: p[1], x2: q[0] - ux * h * 0.8, y2: q[1] - uy * h * 0.8, stroke: col, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-dasharray': attrs.dash || null, opacity: attrs.opacity || null }));
      g.appendChild(KAI.s('polygon', { points: [q[0], q[1], q[0] - ux * h + px * h * 0.38, q[1] - uy * h + py * h * 0.38, q[0] - ux * h - px * h * 0.38, q[1] - uy * h - py * h * 0.38].map(function (v) { return v.toFixed(1); }).join(' '), fill: col, opacity: attrs.opacity || null }));
      (layer || gMain).appendChild(g); return g;
    };
    /* floor grid and three axes; labels x, y, z */
    V.axes = function (opt) {
      opt = opt || {}; var k;
      if (opt.floor !== false) for (k = -R; k <= R; k++) {
        V.line([k, -R, 0], [k, R, 0], { stroke: 'var(--grid)', 'stroke-width': 1 });
        V.line([-R, k, 0], [R, k, 0], { stroke: 'var(--grid)', 'stroke-width': 1 });
      }
      [['x', [R, 0, 0]], ['y', [0, R, 0]], ['z', [0, 0, R]]].forEach(function (a) {
        V.line([0, 0, 0], a[1], { stroke: 'var(--axis)', 'stroke-width': 1.4 });
        V.line([0, 0, 0], a[1].map(function (v) { return -v; }), { stroke: 'var(--axis)', 'stroke-width': 1, 'stroke-dasharray': '3 4', opacity: 0.7 });
        V.text(a[1].map(function (v) { return v * 1.06; }), a[0], { class: 'lbl sm', 'text-anchor': 'middle', dy: 4 });
      });
    };

    V.onDraw = function (fn) { drawFns.push(fn); };
    V.redraw = function () { KAI.clear(gMain); drawFns.forEach(function (f) { f(V); }); };

    /* turning: drag the picture, or arrow keys when it has focus */
    function turn(dx, dy) { yaw += dx * 0.5; pitch = KAI.clamp(pitch - dy * 0.5, -88, 88); V.redraw(); }
    svg.addEventListener('pointerdown', function (e) { dragging = true; last = [e.clientX, e.clientY]; try { svg.setPointerCapture(e.pointerId); } catch (x) { } svg.focus({ preventScroll: true }); });
    svg.addEventListener('pointermove', function (e) { if (!dragging) return; turn(e.clientX - last[0], e.clientY - last[1]); last = [e.clientX, e.clientY]; });
    function end() { dragging = false; }
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end); svg.addEventListener('lostpointercapture', end);
    svg.addEventListener('touchstart', function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false });
    svg.addEventListener('touchmove', function (e) { if (dragging && e.cancelable) e.preventDefault(); }, { passive: false });
    svg.addEventListener('keydown', function (e) {
      var st = e.shiftKey ? 15 : 5, d = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key];
      if (!d) return; e.preventDefault(); turn(d[0] * 2, d[1] * 2);
    });
    svg.style.cursor = 'grab';

    size();
    if (global.ResizeObserver) new ResizeObserver(function () { var w = Math.floor(svg.parentNode.clientWidth); if (w && Math.abs(w - W) > 1) { size(); V.redraw(); } }).observe(svg.parentNode);
    else global.addEventListener('resize', function () { size(); V.redraw(); });
    return V;
  };
})(window);
