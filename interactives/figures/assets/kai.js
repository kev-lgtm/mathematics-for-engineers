/*! kai.js - small helper library for the interactive figures. No dependencies. */
(function (global) {
  'use strict';
  var KAI = global.KAI = {};
  var SVGNS = 'http://www.w3.org/2000/svg';
  var MINUS = '−';
  var uid = 0;

  /* ---------- environment ---------- */
  var params = new URLSearchParams(location.search);
  KAI.params = params;
  var theme = params.get('theme');
  if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme', theme);
  if (params.get('title') === '0') document.documentElement.classList.add('no-title');
  KAI.reducedMotion = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- DOM helpers ---------- */
  function setAttrs(el, attrs, isSvg) {
    for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      var v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') { for (var s in v) el.style.setProperty(s, v[s]); }
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (isSvg && /^(fill|stroke|color|stop-color)$/.test(k) && String(v).indexOf('var(') === 0) el.style.setProperty(k, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  function append(el, kids) {
    kids.forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      if (Array.isArray(c)) append(el, c);
      else el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
    });
  }
  KAI.h = function (tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) setAttrs(el, attrs, false);
    append(el, Array.prototype.slice.call(arguments, 2));
    return el;
  };
  KAI.s = function (tag, attrs) {
    var el = document.createElementNS(SVGNS, tag);
    if (attrs) setAttrs(el, attrs, true);
    append(el, Array.prototype.slice.call(arguments, 2));
    return el;
  };
  KAI.$ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  KAI.clear = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };
  KAI.clamp = function (x, a, b) { return Math.min(b, Math.max(a, x)); };
  KAI.rad = function (d) { return d * Math.PI / 180; };
  KAI.deg = function (r) { return r * 180 / Math.PI; };

  /* ---------- number formatting ---------- */
  KAI.fmt = function (x, d) {
    if (d === undefined) d = 2;
    if (!isFinite(x)) return x > 0 ? '∞' : (x < 0 ? MINUS + '∞' : '—');
    var f = Math.pow(10, d), r = Math.round(x * f) / f;
    if (r === 0) r = 0;
    return String(parseFloat(r.toFixed(d))).replace('-', MINUS);
  };
  KAI.fmtSigned = function (x, d) { var s = KAI.fmt(x, d); return (s.charAt(0) === MINUS || s === '0') ? s : '+' + s; };

  /* ---------- matrix maths ---------- */
  var M = KAI.M = {
    I: function () { return [[1, 0], [0, 1]]; },
    mul: function (A, B) {
      var m = A.length, n = B.length, p = B[0].length, C = [], i, j, k, s;
      for (i = 0; i < m; i++) { C.push([]); for (j = 0; j < p; j++) { s = 0; for (k = 0; k < n; k++) s += A[i][k] * B[k][j]; C[i].push(s); } }
      return C;
    },
    T: function (A) { return A[0].map(function (_, j) { return A.map(function (r) { return r[j]; }); }); },
    add: function (A, B) { return A.map(function (r, i) { return r.map(function (v, j) { return v + B[i][j]; }); }); },
    sub: function (A, B) { return A.map(function (r, i) { return r.map(function (v, j) { return v - B[i][j]; }); }); },
    scale: function (k, A) { return A.map(function (r) { return r.map(function (v) { return k * v; }); }); },
    det2: function (A) { return A[0][0] * A[1][1] - A[0][1] * A[1][0]; },
    apply: function (A, v) { return [A[0][0] * v[0] + A[0][1] * v[1], A[1][0] * v[0] + A[1][1] * v[1]]; },
    rot: function (deg) { var t = deg * Math.PI / 180, c = Math.cos(t), s = Math.sin(t); return [[c, -s], [s, c]]; },
    lerp: function (A, B, t) { return A.map(function (r, i) { return r.map(function (v, j) { return v + t * (B[i][j] - v); }); }); },
    near: function (A, B, eps) { eps = eps || 1e-9; return A.every(function (r, i) { return r.every(function (v, j) { return Math.abs(v - B[i][j]) <= eps; }); }); },
    copy: function (A) { return A.map(function (r) { return r.slice(); }); },
    rank2: function (A, eps) {
      eps = eps || 1e-9;
      if (Math.abs(M.det2(A)) > eps) return 2;
      var z = A.every(function (r) { return r.every(function (v) { return Math.abs(v) <= eps; }); });
      return z ? 0 : 1;
    }
  };
  /* Gaussian elimination with partial pivoting; returns null if singular */
  KAI.solve = function (A, b) {
    var n = A.length, a = A.map(function (r, i) { return r.concat([b[i]]); }), i, j, k, t, f, piv;
    for (i = 0; i < n; i++) {
      piv = i;
      for (j = i + 1; j < n; j++) if (Math.abs(a[j][i]) > Math.abs(a[piv][i])) piv = j;
      if (Math.abs(a[piv][i]) < 1e-12) return null;
      t = a[i]; a[i] = a[piv]; a[piv] = t;
      for (j = i + 1; j < n; j++) { f = a[j][i] / a[i][i]; for (k = i; k <= n; k++) a[j][k] -= f * a[i][k]; }
    }
    var x = new Array(n);
    for (i = n - 1; i >= 0; i--) { var s = a[i][n]; for (j = i + 1; j < n; j++) s -= a[i][j] * x[j]; x[i] = s / a[i][i]; }
    return x;
  };

  /* ---------- matrix as HTML (CSS brackets) ---------- */
  KAI.matEl = function (A, o) {
    o = o || {};
    var d = o.digits === undefined ? 2 : o.digits;
    var el = KAI.h('span', { class: 'mat' + (o.class ? ' ' + o.class : ''), role: 'img' });
    el.style.setProperty('--n', A[0].length);
    var rows = [];
    A.forEach(function (row, i) {
      var vals = [];
      row.forEach(function (v, j) {
        var txt = o.text ? o.text(i, j, v) : KAI.fmt(v, d);
        var cls = o.cls ? (o.cls(i, j, v) || '') : '';
        el.appendChild(KAI.h('span', { class: 'c' + (cls ? ' ' + cls : ''), text: txt }));
        vals.push(txt);
      });
      rows.push('row ' + (i + 1) + ': ' + vals.join(', '));
    });
    el.setAttribute('aria-label', (o.name ? o.name + ', ' : '') + 'matrix ' + A.length + ' by ' + A[0].length + ', ' + rows.join('; '));
    return el;
  };

  /* ---------- controls ---------- */
  KAI.slider = function (o) {
    var id = 'sl' + (++uid), d = o.digits === undefined ? 2 : o.digits, unit = o.unit || '';
    var out = KAI.h('output', { for: id });
    var input = KAI.h('input', { type: 'range', id: id, min: o.min, max: o.max, step: o.step || 0.01, value: o.value });
    var lab = KAI.h('label', { for: id, html: o.label });
    var el = KAI.h('div', { class: 'sl' }, lab, out, input);
    function show() {
      var v = +input.value;
      out.innerHTML = (o.format ? o.format(v) : KAI.fmt(v, d)) + unit;
      input.setAttribute('aria-valuetext', out.textContent);
    }
    input.addEventListener('input', function () { show(); if (o.onInput) o.onInput(+input.value); });
    show();
    return {
      el: el, input: input, label: lab,
      get: function () { return +input.value; },
      set: function (v) { input.value = v; show(); },
      limits: function (a, b) { input.min = a; input.max = b; show(); },
      disable: function (b) { input.disabled = !!b; el.style.opacity = b ? .5 : ''; }
    };
  };
  KAI.seg = function (o) {
    var name = o.name || 'seg' + (++uid), fs = KAI.h('fieldset', { class: 'seg' }), inputs = {};
    if (o.legend) fs.appendChild(KAI.h('legend', { html: o.legend }));
    o.options.forEach(function (op) {
      var inp = KAI.h('input', { type: 'radio', name: name, value: op.value });
      if (String(op.value) === String(o.value)) inp.checked = true;
      inp.addEventListener('change', function () { if (inp.checked && o.onChange) o.onChange(String(op.value)); });
      inputs[op.value] = inp;
      fs.appendChild(KAI.h('label', { title: op.title || null }, inp, KAI.h('span', { html: op.label })));
    });
    return {
      el: fs,
      get: function () { for (var k in inputs) if (inputs[k].checked) return k; return null; },
      set: function (v) { var any = false; for (var k in inputs) { inputs[k].checked = (String(k) === String(v)); any = any || inputs[k].checked; } }
    };
  };
  KAI.check = function (o) {
    var inp = KAI.h('input', { type: 'checkbox' });
    inp.checked = !!o.checked;
    inp.addEventListener('change', function () { if (o.onChange) o.onChange(inp.checked); });
    var el = KAI.h('label', { class: 'chk' }, inp, KAI.h('span', { html: o.label }));
    return { el: el, input: inp, get: function () { return inp.checked; }, set: function (v) { inp.checked = !!v; } };
  };
  KAI.button = function (o) {
    var b = KAI.h('button', { type: 'button', class: 'btn' + (o.kind ? ' ' + o.kind : ''), html: o.label, title: o.title || null });
    b.addEventListener('click', o.onClick);
    return b;
  };
  KAI.select = function (o) {
    var id = 'se' + (++uid), sel = KAI.h('select', { class: 'sel', id: id });
    o.options.forEach(function (op) { var e = KAI.h('option', { value: op.value, text: op.label }); if (String(op.value) === String(o.value)) e.selected = true; sel.appendChild(e); });
    sel.addEventListener('change', function () { if (o.onChange) o.onChange(sel.value); });
    var el = KAI.h('div', { class: 'stack', style: { gap: '3px' } }, KAI.h('label', { for: id, class: 'note', html: o.label }), sel);
    return { el: el, sel: sel, get: function () { return sel.value; }, set: function (v) { sel.value = v; } };
  };
  KAI.numin = function (o) {
    var inp = KAI.h('input', { type: 'number', class: 'numin', step: o.step || 0.1, value: o.value, 'aria-label': o.aria || null, min: o.min, max: o.max });
    inp.addEventListener('input', function () { var v = parseFloat(inp.value); if (isFinite(v) && o.onInput) o.onInput(v); });
    return inp;
  };

  /* ---------- screen-reader announcements (debounced) ---------- */
  var liveEl = null, liveTimer = null;
  KAI.live = function (msg) {
    if (!liveEl) { liveEl = KAI.h('div', { class: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' }); document.body.appendChild(liveEl); }
    clearTimeout(liveTimer);
    liveTimer = setTimeout(function () { liveEl.textContent = msg; }, 500);
  };

  /* ---------- coordinate plane in SVG ---------- */
  KAI.plane = function (svg, o) {
    var xr = o.x, yr = o.y, P = { svg: svg, xr: xr, yr: yr }, listeners = [];
    var pad = { l: o.labels === false ? 6 : 30, r: 10, t: 8, b: o.labels === false ? 6 : 24 };
    if (o.pad) for (var kk in o.pad) pad[kk] = o.pad[kk];
    var id = 'clip' + (++uid);
    var clipRect = KAI.s('rect');
    var gGrid = KAI.s('g', { class: 'g-grid' });
    var gContent = KAI.s('g', { 'clip-path': 'url(#' + id + ')', class: 'g-content' });
    var gTop = KAI.s('g', { class: 'g-top' });
    var gHand = KAI.s('g', { class: 'g-handles' });
    svg.appendChild(KAI.s('defs', null, KAI.s('clipPath', { id: id }, clipRect)));
    [gGrid, gContent, gTop, gHand].forEach(function (g) { svg.appendChild(g); });
    P.grid = gGrid; P.content = gContent; P.top = gTop; P.handles = gHand;
    P.minW = o.minW || 240;

    function layout() {
      var w = Math.max(P.minW, Math.floor(svg.parentNode.clientWidth) || 600);
      P.W = w;
      P.sx = (w - pad.l - pad.r) / (xr[1] - xr[0]);
      P.sy = P.sx;
      P.H = Math.round(pad.t + pad.b + (yr[1] - yr[0]) * P.sy);
      svg.setAttribute('viewBox', '0 0 ' + P.W + ' ' + P.H);
      svg.setAttribute('width', P.W); svg.setAttribute('height', P.H);
      clipRect.setAttribute('x', pad.l); clipRect.setAttribute('y', pad.t);
      clipRect.setAttribute('width', P.W - pad.l - pad.r); clipRect.setAttribute('height', P.H - pad.t - pad.b);
    }
    P.X = function (x) { return pad.l + (x - xr[0]) * P.sx; };
    P.Y = function (y) { return pad.t + (yr[1] - y) * P.sy; };
    P.pt = function (p) { return [P.X(p[0]), P.Y(p[1])]; };
    P.inv = function (px, py) { return [xr[0] + (px - pad.l) / P.sx, yr[1] - (py - pad.t) / P.sy]; };
    P.fromEvent = function (ev) {
      var r = svg.getBoundingClientRect();
      return P.inv((ev.clientX - r.left) * P.W / r.width, (ev.clientY - r.top) * P.H / r.height);
    };

    function drawGrid() {
      KAI.clear(gGrid);
      var step = o.step || 1, i, x, y;
      var i0 = Math.ceil(xr[0] / step - 1e-9), i1 = Math.floor(xr[1] / step + 1e-9);
      var j0 = Math.ceil(yr[0] / step - 1e-9), j1 = Math.floor(yr[1] / step + 1e-9);
      var every = Math.max(1, Math.ceil(30 / (P.sx * step)));
      if (o.grid !== false) {
        for (i = i0; i <= i1; i++) { x = i * step; gGrid.appendChild(KAI.s('line', { class: i === 0 ? 'ax' : 'gl', x1: P.X(x), x2: P.X(x), y1: P.Y(yr[0]), y2: P.Y(yr[1]) })); }
        for (i = j0; i <= j1; i++) { y = i * step; gGrid.appendChild(KAI.s('line', { class: i === 0 ? 'ax' : 'gl', y1: P.Y(y), y2: P.Y(y), x1: P.X(xr[0]), x2: P.X(xr[1]) })); }
      } else {
        if (xr[0] <= 0 && xr[1] >= 0) gGrid.appendChild(KAI.s('line', { class: 'ax', x1: P.X(0), x2: P.X(0), y1: P.Y(yr[0]), y2: P.Y(yr[1]) }));
        if (yr[0] <= 0 && yr[1] >= 0) gGrid.appendChild(KAI.s('line', { class: 'ax', y1: P.Y(0), y2: P.Y(0), x1: P.X(xr[0]), x2: P.X(xr[1]) }));
      }
      if (o.labels !== false) {
        for (i = i0; i <= i1; i++) {
          if (i === 0 || i % every) continue;
          gGrid.appendChild(KAI.s('text', { class: 'tk', x: P.X(i * step), y: P.H - pad.b + 15, 'text-anchor': 'middle', text: KAI.fmt(i * step, 2) }));
        }
        for (i = j0; i <= j1; i++) {
          if (i === 0 || i % every) continue;
          gGrid.appendChild(KAI.s('text', { class: 'tk', x: pad.l - 5, y: P.Y(i * step) + 4, 'text-anchor': 'end', text: KAI.fmt(i * step, 2) }));
        }
      }
      if (o.axisNames !== false && yr[0] <= 0 && yr[1] >= 0 && xr[0] <= 0 && xr[1] >= 0) {
        gGrid.appendChild(KAI.s('text', { class: 'lbl sm', x: P.X(xr[1]) - 6, y: P.Y(0) - 7, 'text-anchor': 'end', text: o.xname || 'x' }));
        gGrid.appendChild(KAI.s('text', { class: 'lbl sm', x: P.X(0) + 7, y: pad.t + 12, text: o.yname || 'y' }));
      }
    }
    P.onResize = function (fn) { listeners.push(fn); };
    P.refresh = function () { layout(); drawGrid(); listeners.forEach(function (f) { f(); }); };
    if (global.ResizeObserver) {
      new ResizeObserver(function () { var w = Math.floor(svg.parentNode.clientWidth); if (w && Math.abs(w - P.W) > 1) P.refresh(); }).observe(svg.parentNode);
    } else global.addEventListener('resize', P.refresh);
    layout(); drawGrid();

    /* drawing helpers (model coordinates in, pixels out) */
    P.line = function (layer, a, b, attrs) {
      var e = KAI.s('line', Object.assign({ x1: P.X(a[0]), y1: P.Y(a[1]), x2: P.X(b[0]), y2: P.Y(b[1]) }, attrs));
      layer.appendChild(e); return e;
    };
    function pts(list) { return list.map(function (p) { return P.X(p[0]).toFixed(1) + ',' + P.Y(p[1]).toFixed(1); }).join(' '); }
    P.poly = function (layer, list, attrs) { var e = KAI.s('polygon', Object.assign({ points: pts(list) }, attrs)); layer.appendChild(e); return e; };
    P.polyline = function (layer, list, attrs) { var e = KAI.s('polyline', Object.assign({ points: pts(list), fill: 'none' }, attrs)); layer.appendChild(e); return e; };
    P.dot = function (layer, p, r, attrs) { var e = KAI.s('circle', Object.assign({ cx: P.X(p[0]), cy: P.Y(p[1]), r: r }, attrs)); layer.appendChild(e); return e; };
    P.text = function (layer, p, str, attrs) {
      var e = KAI.s('text', Object.assign({ x: P.X(p[0]), y: P.Y(p[1]), class: 'lbl' }, attrs));
      e.textContent = str; layer.appendChild(e); return e;
    };
    P.arrow = function (layer, a, b, attrs) {
      attrs = attrs || {};
      var col = attrs.stroke || 'var(--ink)', w = attrs.width || 2.6, hl = attrs.head || 11;
      var x1 = P.X(a[0]), y1 = P.Y(a[1]), x2 = P.X(b[0]), y2 = P.Y(b[1]);
      var dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), g = KAI.s('g');
      if (len < 2) { g.appendChild(KAI.s('circle', { cx: x2, cy: y2, r: w, fill: col })); layer.appendChild(g); return g; }
      var ux = dx / len, uy = dy / len, h = Math.min(hl, len * 0.7), px = -uy, py = ux;
      g.appendChild(KAI.s('line', { x1: x1, y1: y1, x2: x2 - ux * h * 0.8, y2: y2 - uy * h * 0.8, stroke: col, 'stroke-width': w, 'stroke-dasharray': attrs.dash || null, 'stroke-linecap': 'round', opacity: attrs.opacity || null }));
      g.appendChild(KAI.s('polygon', { points: [x2, y2, x2 - ux * h + px * h * 0.38, y2 - uy * h + py * h * 0.38, x2 - ux * h - px * h * 0.38, y2 - uy * h - py * h * 0.38].map(function (v) { return v.toFixed(1); }).join(' '), fill: col, opacity: attrs.opacity || null }));
      layer.appendChild(g); return g;
    };
    return P;
  };

  /* ---------- draggable, keyboard-operable point ---------- */
  KAI.handle = function (P, o) {
    var r = o.r || 8, pos = o.pos.slice(), dragging = false, col = o.color || 'var(--blue)';
    var g = KAI.s('g', { class: 'handle', tabindex: 0, role: 'button', 'aria-roledescription': 'draggable point' });
    g.appendChild(KAI.s('circle', { class: 'hit', r: Math.max(r + 12, 20) }));
    g.appendChild(KAI.s('circle', { class: 'ring', r: r + 5, fill: 'none', stroke: col, 'stroke-opacity': 0.3, 'stroke-width': 2 }));
    g.appendChild(KAI.s('circle', { class: 'dot', r: r, fill: col, stroke: 'var(--bg)', 'stroke-width': 2 }));
    var H = { el: g };
    function place() {
      g.setAttribute('transform', 'translate(' + P.X(pos[0]).toFixed(1) + ',' + P.Y(pos[1]).toFixed(1) + ')');
      var lab = typeof o.label === 'function' ? o.label(pos.slice()) : (o.label || 'point');
      g.setAttribute('aria-label', lab + '. Drag, or use the arrow keys to move it.');
    }
    function apply(p, how) {
      p = [KAI.clamp(p[0], P.xr[0], P.xr[1]), KAI.clamp(p[1], P.yr[0], P.yr[1])];
      if (o.constrain) p = o.constrain(p, how);
      pos = p; place();
      if (o.onMove) o.onMove(pos.slice(), how);
    }
    H.set = function (x, y) { if (Array.isArray(x)) { y = x[1]; x = x[0]; } pos = [x, y]; place(); };
    H.pos = function () { return pos.slice(); };
    H.show = function (b) { g.style.display = b ? '' : 'none'; };
    g.addEventListener('pointerdown', function (e) { e.preventDefault(); dragging = true; try { g.setPointerCapture(e.pointerId); } catch (x) { } g.focus(); });
    g.addEventListener('pointermove', function (e) { if (dragging) apply(P.fromEvent(e), 'pointer'); });
    function end() { dragging = false; if (o.onEnd) o.onEnd(pos.slice()); }
    g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end);
    g.addEventListener('keydown', function (e) {
      var dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
      if (!dir) return;
      e.preventDefault();
      var st = (o.step || 0.1) * (e.shiftKey ? 5 : 1);
      apply([pos[0] + dir[0] * st, pos[1] + dir[1] * st], 'key');
    });
    P.handles.appendChild(g);
    P.onResize(place);
    place();
    return H;
  };

  /* ---------- shared drawing: a map of the plane ---------- */
  KAI.glyphF = [[.2, .1], [.2, .9], [.75, .9], [.75, .75], [.38, .75], [.38, .58], [.65, .58], [.65, .43], [.38, .43], [.38, .1]];
  KAI.UNIT = [[0, 0], [1, 0], [1, 1], [0, 1]];
  KAI.imgPts = function (A, list) { return list.map(function (p) { return M.apply(A, p); }); };
  /* Draws the image of the plane under A: grid, unit square, F glyph, columns.
     Horizontal grid lines map to lines parallel to A i (blue); vertical ones parallel to A j (vermilion). */
  KAI.drawMap = function (P, layer, A, o) {
    o = o || {};
    var N = o.N || 12, k, ghost = o.ghost !== false;
    if (o.grid !== false) {
      for (k = -N; k <= N; k++) {
        P.line(layer, M.apply(A, [-N, k]), M.apply(A, [N, k]), { stroke: 'var(--blue)', 'stroke-width': k === 0 ? 1.6 : 1, 'stroke-opacity': k === 0 ? 0.55 : 0.28 });
        P.line(layer, M.apply(A, [k, -N]), M.apply(A, [k, N]), { stroke: 'var(--verm)', 'stroke-width': k === 0 ? 1.6 : 1, 'stroke-opacity': k === 0 ? 0.55 : 0.28 });
      }
    }
    if (ghost) {
      P.poly(layer, KAI.UNIT, { fill: 'none', stroke: 'var(--axis)', 'stroke-dasharray': '4 4', 'stroke-width': 1.3 });
      P.poly(layer, KAI.glyphF, { fill: 'none', stroke: 'var(--axis)', 'stroke-dasharray': '3 3', 'stroke-width': 1.1 });
    }
    if (o.square !== false) P.poly(layer, KAI.imgPts(A, KAI.UNIT), { fill: 'var(--sky-t)', stroke: 'var(--blue)', 'stroke-width': 2, 'stroke-linejoin': 'round' });
    if (o.glyph !== false) P.poly(layer, KAI.imgPts(A, KAI.glyphF), { fill: 'var(--verm-t)', stroke: 'var(--verm)', 'stroke-width': 1.6, 'stroke-linejoin': 'round' });
  };

  /* ---------- embedding: tell the host page how tall we are ---------- */
  KAI.autoHeight = function () {
    if (global.parent === global) return;
    var el = document.querySelector('.fig') || document.body;
    function send() {
      var h = Math.ceil(el.getBoundingClientRect().height) + 4;
      try { global.parent.postMessage({ kai: 'height', h: h }, '*'); } catch (e) { }
    }
    if (global.ResizeObserver) new ResizeObserver(send).observe(el); else global.addEventListener('resize', send);
    global.addEventListener('load', send);
    send();
  };
})(window);
