/*! kai3d.js - rotatable 3D pictures in plain SVG for the interactive figures. Needs kai.js first. No dependencies.
   Two interfaces live in this file:
   KAI.view3(svg, {range, zoom})  - immediate drawing (V.line, V.poly, V.onDraw, V.redraw); used by the Linear Algebra figures.
   KAI.scene3(svg, {range})       - depth-sorted scene (S.line, S.poly, S.arrow, S.grid, S.axes, S.onDraw, S.refresh); used by the Analytic Geometry figures.
   Drag to rotate, or use the arrow keys when the picture has focus (Home resets scene3). */
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

/*! kai3d.js - 3D scenes in plain SVG for the kai figures. Load AFTER kai.js, only on pages that need it.
   Drag to rotate (or use the arrow keys, Home resets). World axes: x, y, z with z pointing up (right-handed). */
(function (g) {
  'use strict';
  var KAI = g.KAI;
  KAI.scene3 = function (svg, o) {
    o = o || {};
    var R = o.range || 5, az0 = o.az === undefined ? 110 : o.az, el0 = o.el === undefined ? 22 : o.el;
    var az = az0, el = el0, W = 600, H = 480, items = [], draw = null, drag = null, S = { svg: svg }, grp = KAI.s('g');
    svg.appendChild(grp);
    svg.setAttribute('tabindex', '0'); svg.style.touchAction = 'none'; svg.style.cursor = 'grab'; svg.style.userSelect = 'none'; svg.style.webkitUserSelect = 'none';
    function layout() {
      W = Math.max(260, Math.floor(svg.parentNode.clientWidth) || 600); H = Math.round(W * (o.aspect || 0.82));
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', W); svg.setAttribute('height', H);
    }
    /* world point -> [screen x, screen y, depth]; larger depth = farther from the viewer */
    S.p = function (q) {
      var A = KAI.rad(az), E = KAI.rad(el), k = Math.min(W, H) / (2.3 * R);
      var a = q[0] * Math.cos(A) + q[1] * Math.sin(A), d = -q[0] * Math.sin(A) + q[1] * Math.cos(A);
      return [W / 2 + a * k, H / 2 - (q[2] * Math.cos(E) + d * Math.sin(E)) * k, d * Math.cos(E) - q[2] * Math.sin(E)];
    };
    function add(d, make) { items.push({ d: d, make: make }); }
    function mid(ps) { var s = 0; ps.forEach(function (q) { s += q[2]; }); return s / ps.length; }
    S.line = function (a, b, at, bias) {
      var pa = S.p(a), pb = S.p(b);
      add((pa[2] + pb[2]) / 2 + (bias || 0), function () { return KAI.s('line', Object.assign({ x1: pa[0], y1: pa[1], x2: pb[0], y2: pb[1], 'stroke-linecap': 'round' }, at)); });
    };
    S.poly = function (list, at, bias) {
      var ps = list.map(S.p);
      add(mid(ps) + (bias || 0), function () { return KAI.s('polygon', Object.assign({ points: ps.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '), 'stroke-linejoin': 'round' }, at)); });
    };
    S.dot = function (q, r, at) { var p = S.p(q); add(p[2], function () { return KAI.s('circle', Object.assign({ cx: p[0], cy: p[1], r: r }, at)); }); };
    S.text = function (q, str, at) { var p = S.p(q); add(-1e6, function () { return KAI.s('text', Object.assign({ x: p[0] + 6, y: p[1] - 6, class: 'lbl', text: str }, at)); }); };
    S.arrow = function (a, b, at) {
      at = at || {};
      var pa = S.p(a), pb = S.p(b), col = at.stroke || 'var(--ink)', w = at.width || 2.6, dx = pb[0] - pa[0], dy = pb[1] - pa[1], len = Math.hypot(dx, dy);
      add((pa[2] + pb[2]) / 2, function () {
        var e = KAI.s('g');
        if (len < 2) { e.appendChild(KAI.s('circle', { cx: pb[0], cy: pb[1], r: w, fill: col })); return e; }
        var ux = dx / len, uy = dy / len, hh = Math.min(11, len * 0.7), px = -uy, py = ux;
        e.appendChild(KAI.s('line', { x1: pa[0], y1: pa[1], x2: pb[0] - ux * hh * 0.8, y2: pb[1] - uy * hh * 0.8, stroke: col, 'stroke-width': w, 'stroke-dasharray': at.dash || null, 'stroke-linecap': 'round' }));
        e.appendChild(KAI.s('polygon', { points: [pb[0], pb[1], pb[0] - ux * hh + px * hh * 0.38, pb[1] - uy * hh + py * hh * 0.38, pb[0] - ux * hh - px * hh * 0.38, pb[1] - uy * hh - py * hh * 0.38].map(function (v) { return v.toFixed(1); }).join(' '), fill: col }));
        return e;
      });
    };
    S.axes = function (L, names) {
      names = names || ['x', 'y', 'z'];
      [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach(function (e, i) {
        var t = [e[0] * L, e[1] * L, e[2] * L];
        S.line([0, 0, 0], t, { stroke: 'var(--axis)', 'stroke-width': 1.5 }, 1e5);
        S.text([t[0] * 1.05, t[1] * 1.05, t[2] * 1.05], names[i], { class: 'lbl sm' });
      });
    };
    S.grid = function (n) { for (var i = -n; i <= n; i++) { S.line([i, -n, 0], [i, n, 0], { stroke: 'var(--grid)' }, 1e6); S.line([-n, i, 0], [n, i, 0], { stroke: 'var(--grid)' }, 1e6); } };
    S.refresh = function () {
      layout(); KAI.clear(grp); items = []; if (draw) draw(S);
      items.sort(function (a, b) { return b.d - a.d; });
      items.forEach(function (it) { grp.appendChild(it.make()); });
      svg.setAttribute('aria-label', (o.label || '3D scene') + '. Drag or use the arrow keys to rotate; Home resets the view.');
    };
    S.onDraw = function (fn) { draw = fn; S.refresh(); };
    S.reset = function () { az = az0; el = el0; S.refresh(); };
    svg.addEventListener('pointerdown', function (e) { e.preventDefault(); drag = { x: e.clientX, y: e.clientY, az: az, el: el }; try { svg.setPointerCapture(e.pointerId); } catch (x) { } svg.focus(); svg.style.cursor = 'grabbing'; });
    svg.addEventListener('pointermove', function (e) { if (!drag) return; az = drag.az - (e.clientX - drag.x) * 0.5; el = KAI.clamp(drag.el + (e.clientY - drag.y) * 0.4, -85, 85); S.refresh(); });
    function end() { drag = null; svg.style.cursor = 'grab'; }
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end); svg.addEventListener('lostpointercapture', end);
    /* touch screens: stop the page from scrolling while the picture is being turned */
    svg.addEventListener('touchstart', function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false });
    svg.addEventListener('touchmove', function (e) { if (drag && e.cancelable) e.preventDefault(); }, { passive: false });
    svg.addEventListener('keydown', function (e) {
      var k = { ArrowLeft: [5, 0], ArrowRight: [-5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] }[e.key];
      if (e.key === 'Home') { e.preventDefault(); S.reset(); return; }
      if (!k) return; e.preventDefault(); az += k[0]; el = KAI.clamp(el + k[1], -85, 85); S.refresh();
    });
    if (g.ResizeObserver) new ResizeObserver(function () { var w = Math.floor(svg.parentNode.clientWidth); if (w && Math.abs(w - W) > 1) S.refresh(); }).observe(svg.parentNode);
    return S;
  };
})(window);
