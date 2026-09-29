/* M6 · Ilustración (§7, §10.3). Escrito a mano. Usa los dibujos de 15_ilus_datos.js (generado).
 *
 *   PC.ill.corredor(pose, {h, contorno, x, y, ancla, sombra, estelas}) -> '<g>…</g>'
 *       pose: 'corre' | 'celebra' | 'dePie' | 'arriba' | 'valla'.
 *       h: alto en px (unidades del SVG que lo recibe) del suelo a la gorra; por defecto, el de la pose.
 *       x, y: dónde va el ancla; y es el suelo. ancla: 'origen' (cadera, por defecto), 'pie' (punta del pie
 *       adelantado, solo «corre») o 'centro' (centro de la caja).
 *       contorno: true (--text-2) o 'meta' (--ill-meta): escenario, simulación o referencia, nunca un dato real.
 *   PC.ill.medidas(pose, h) -> {s, alto, caja:[x0,y0,x1,y1], pie}   (px, respecto al origen)
 *   PC.ill.pista1000(host, {s, real})              I2 · tu marca entre el 3:49 y la meta de 3:30
 *   PC.ill.barra(host, {reps, validado, real})     I3 · agente arriba de la dominada y contador de 17
 *   PC.ill.valla(host, {t, real, medido, etiqueta}) I4 · franqueo de la valla, cronómetro y escala del baremo
 *   PC.ill.lamina(host, id, {titulo})              I5 · 'dominada'; I6 · 'sentadilla', 'peso-muerto-rumano',
 *                                                  'remo-barra', 'elevacion-talon'. Leyenda HTML incluida.
 *   PC.ill.laminas() -> ids disponibles
 *
 * Reglas: colores solo con variables; el 3:49 lleva data-umbral="229"; el agente relleno es un dato real y en
 * contorno un escenario; solo celebra con un dato real; se mueve (600 ms) solo cuando cambia el dato.
 * Texto de las escenas: font-size = max(ref, 12 × 400 / ancho pintado), recalculado al redimensionar.
 */
(function (PC) {
  'use strict';
  var ill = PC.ill = PC.ill || {};
  var REF = 400;              // ancho de referencia de las escenas
  var LAM_W = 360;            // ancho de referencia de un panel de lámina
  var cont = 0;

  // ------------------------------------------------------------------ utilidades
  function poses() { return ill._poses || {}; }
  function uid(p) { cont += 1; return p + '-' + cont; }
  function nx(v) { return String(Math.round(v * 10) / 10); }
  function esc(t) {
    if (PC.esc) return PC.esc(t);
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function coma(v, dec) { return (dec == null ? String(v) : Number(v).toFixed(dec)).replace('.', ','); }
  function difS(d) {       // «15» o «14,5»: segundos de diferencia
    var r = Math.round(d * 10) / 10;
    return Math.abs(r - Math.round(r)) < 1e-9 ? String(Math.round(r)) : coma(r, 1);
  }
  function mmss(s) {
    var dec = Math.abs(s - Math.round(s)) > 1e-6 ? 1 : 0;
    if (PC.fmt && PC.fmt.t) return PC.fmt.t(s, dec);
    var m = Math.floor(s / 60), r = s - m * 60;
    var rs = dec ? r.toFixed(1).replace('.', ',') : String(Math.round(r));
    return m + ':' + (r < 10 ? '0' : '') + rs;
  }
  function reducido() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  var ctx2d = null, familia = null;
  function anchoTexto(t, px, peso) {
    try {
      if (!ctx2d) ctx2d = document.createElement('canvas').getContext('2d');
      if (!familia) familia = (getComputedStyle(document.documentElement).getPropertyValue('--font') || '').trim() || 'Barlow, system-ui, sans-serif';
      ctx2d.font = (peso || 400) + ' ' + px + 'px ' + familia;
      return ctx2d.measureText(String(t)).width;
    } catch (e) { return String(t).length * px * .56; }
  }
  function anchoPintado(host, max) {
    var w = host.clientWidth || (host.getBoundingClientRect ? host.getBoundingClientRect().width : 0) || 0;
    if (!w) return 0;
    return Math.min(w, max || 560);
  }
  // Tamaño de letra en unidades de la caja de referencia para que se vea a 12 px como mínimo.
  function letra(base, pintado) { return pintado ? Math.max(base, 12 * REF / pintado) : base; }

  function observar(host, pintar) {
    host.__illPintar = pintar;
    if (host.__illObs) return;
    host.__illObs = true;
    var w0 = host.clientWidth;
    var repinta = function () {
      var w = host.clientWidth;
      if (w === w0) return;
      w0 = w;
      if (host.__illPintar) host.__illPintar();
    };
    if (PC.alRedimensionar) { PC.alRedimensionar(host, repinta); }
    else if (window.ResizeObserver) {
      var t = 0;
      new ResizeObserver(function () { clearTimeout(t); t = setTimeout(repinta, 120); }).observe(host);
    }
    if (document.fonts && document.fonts.status !== 'loaded' && document.fonts.ready) {
      document.fonts.ready.then(function () { if (host.__illPintar) host.__illPintar(); });
    }
  }
  function baremoTramos(prueba) {
    try { if (PC.baremo && PC.baremo.tramos) return PC.baremo.tramos(prueba) || []; } catch (e) { /* sin baremo */ }
    return [];
  }
  function baremoPts(prueba, v) {
    try { if (PC.baremo && PC.baremo.pts) return PC.baremo.pts(prueba, v); } catch (e) { /* sin baremo */ }
    return null;
  }
  function colorPts(p) {
    if (p === 0) return 'var(--elim)';
    return 'var(--p' + Math.min(5, Math.ceil(p / 2)) + ')';
  }
  function escenario(fn) {
    var e = (PC.D && PC.D.plan && PC.D.plan.escenariosNota) || [];
    for (var i = 0; i < e.length; i++) if (fn(e[i])) return e[i];
    return null;
  }
  // Hace únicos los ids internos de un SVG (título, desc, clipPath, filtros) por página.
  function unicos(svg, suf) {
    return svg.replace(/\bid=(['"])([^'"]+)\1/g, function (m, q, id) { return 'id=' + q + id + '-' + suf + q; })
      .replace(/url\(#([^)]+)\)/g, function (m, id) { return 'url(#' + id + '-' + suf + ')'; })
      .replace(/aria-labelledby=(['"])([^'"]+)\1/g, function (m, q, ids) {
        return 'aria-labelledby=' + q + ids.split(/\s+/).map(function (x) { return x + '-' + suf; }).join(' ') + q;
      });
  }

  // Los dibujos llegan con los trozos repetidos (cabezas, troncos) como «@A»…; se expanden una vez.
  (function expandir() {
    var d = ill._dic;
    if (!d || ill._expandido) return;
    ill._expandido = true;
    var ex = function (t) { return t.replace(/@([A-L])/g, function (m, k) { return d[k] || m; }); };
    var P = ill._poses || {}, L = ill._laminas || {};
    Object.keys(P).forEach(function (k) { P[k].cuerpo = ex(P[k].cuerpo); });
    Object.keys(L).forEach(function (k) { L[k].paneles.forEach(function (p) { p.svg = ex(p.svg); }); });
  })();

  // ------------------------------------------------------------------ el agente
  ill.medidas = function (pose, h) {
    var P = poses()[pose]; if (!P) return null;
    var s = (h || P.alto) / P.alto;
    return { s: s, alto: P.alto * s, caja: P.caja.map(function (v) { return v * s; }), pie: P.pie != null ? P.pie * s : null };
  };

  ill.corredor = function (pose, o) {
    o = o || {};
    var P = poses()[pose];
    if (!P) return '';
    var h = o.h || P.alto, s = h / P.alto;
    var dx = 0;
    if (o.ancla === 'pie' && P.pie != null) dx = -P.pie;
    else if (o.ancla === 'centro') dx = -(P.caja[0] + P.caja[2]) / 2;
    var x = (o.x || 0) + dx * s, y = o.y || 0;
    var mini = h < 40;
    var c = o.contorno, cuerpo;
    if (c) {
      var id = uid('ill-f');
      var col = c === 'meta' ? 'var(--ill-meta)' : (typeof c === 'string' && c.indexOf('var(') === 0 ? c : 'var(--text-2)');
      var r = (o.trazo || 1.5) / s, m = r * 2 + 2, k = P.caja;
      cuerpo = '<defs><filter id="' + id + '" filterUnits="userSpaceOnUse" x="' + nx(k[0] - m) + '" y="' + nx(k[1] - m) +
        '" width="' + nx(k[2] - k[0] + 2 * m) + '" height="' + nx(k[3] - k[1] + 2 * m) + '">' +
        '<feMorphology in="SourceAlpha" operator="dilate" radius="' + r.toFixed(2) + '" result="d"/>' +
        '<feComposite in="d" in2="SourceAlpha" operator="out" result="o"/>' +
        '<feFlood style="flood-color:' + col + '"/><feComposite in2="o" operator="in"/></filter></defs>' +
        '<g filter="url(#' + id + ')">' + P.cuerpo + '</g>';
    } else {
      cuerpo = (o.sombra === false ? '' : P.sombra) + (mini || o.estelas === false ? '' : P.estelas) + P.cuerpo;
    }
    return '<g class="ill-agente' + (mini ? ' ill-mini' : '') + (c ? ' ill-cont' : '') + '" data-pose="' + pose + '"' +
      (c ? ' data-contorno="1"' : '') + ' transform="translate(' + nx(x) + ' ' + nx(y) + ') scale(' + s.toFixed(4) + ')">' +
      cuerpo + '</g>';
  };

  // Pinta un SVG nuevo en el host. Si ya había uno con el mismo agente, el agente se desliza (600 ms).
  function montar(host, svg, mov) {
    var viejo = host.querySelector('svg.ill-esc');
    var antes = null;
    if (viejo && mov) {
      var g0 = viejo.querySelector('.ill-mov');
      if (g0 && g0.getAttribute('data-clave') === mov.clave) antes = g0.style.transform;
    }
    host.innerHTML = svg;
    if (antes && !reducido()) {
      var g1 = host.querySelector('.ill-mov');
      if (g1 && antes !== g1.style.transform) {
        var fin = g1.style.transform;
        g1.style.transition = 'none';
        g1.style.transform = antes;
        void g1.getBoundingClientRect();
        g1.style.transition = '';
        g1.style.transform = fin;
      }
    }
  }

  function globo(cx, yTip, txt, fs) {
    var tw = anchoTexto(txt, fs, 700), w = tw + fs * 1.3, h = fs * 1.62, tip = fs * .36;
    var y0 = yTip - tip - h;
    return '<g class="ill-globo">' +
      '<rect x="' + nx(cx - w / 2) + '" y="' + nx(y0) + '" width="' + nx(w) + '" height="' + nx(h) + '" rx="' + nx(h / 2) + '" style="fill:var(--text)"/>' +
      '<path d="M' + nx(cx - tip) + ' ' + nx(yTip - tip - .5) + 'L' + nx(cx) + ' ' + nx(yTip) + 'L' + nx(cx + tip) + ' ' + nx(yTip - tip - .5) + 'Z" style="fill:var(--text)"/>' +
      '<text x="' + nx(cx) + '" y="' + nx(y0 + h * .69) + '" font-size="' + nx(fs) + '" font-weight="700" text-anchor="middle" style="fill:var(--surface)">' + esc(txt) + '</text></g>';
  }

  // ------------------------------------------------------------------ I2 · pista del 1.000
  ill.pista1000 = function (host, o) {
    if (!host) return;
    host.__illO = o || {};
    observar(host, function () { pintarPista(host, host.__illO); });
    pintarPista(host, host.__illO);
  };

  function limitesMil() {
    var t = baremoTramos('mil'), elim = 229, meta = 210;
    for (var i = 0; i < t.length; i++) {
      if (t[i].pts === 0 && t[i].min != null) elim = t[i].min;
      if (t[i].pts === 4 && t[i].max != null) meta = t[i].max;
    }
    return { elim: elim, meta: meta };
  }

  function pintarPista(host, o) {
    var s = Number(o.s), real = !!o.real;
    if (!isFinite(s)) { host.innerHTML = ''; return; }
    var pint = anchoPintado(host, 560), fs = letra(14, pint), k = fs / 14;
    var lim = limitesMil(), SE = lim.elim, SM = lim.meta;
    var xE = 60, K = 12;
    var X = function (t) { return xE + (SE - t) * K; };
    var xM = X(SM);
    var tE = 'ELIMINA ' + mmss(SE), tM = 'META ' + mmss(SM);
    var fh = 26 * k, fpad = 8;
    var wE = anchoTexto(tE, fs, 700) + 2 * fpad + 8, wM = anchoTexto(tM, fs, 700) + 2 * fpad + 8;
    var y0 = 22, filas = 1, metaIzq = false, yM = y0;
    if (xM + 1.5 + wM > REF - 2) {
      metaIzq = true;
      if (xM - 1.5 - wM < xE + 1.5 + wE + 6) { filas = 2; yM = y0 + fh + 6; }
    }
    var fondoBanderas = y0 + filas * fh + (filas - 1) * 6;
    var P = poses();
    var escFig = .64;
    var cabeza = 207 - (P.corre ? P.corre.alto : 169.6) * escFig;
    var topeGlobo = cabeza - 2 - 29 * k;
    var dy = Math.max(0, fondoBanderas + 8 - topeGlobo);
    var yT = 176 + dy, yS = 207 + dy, yB = 226 + dy, yC = 236 + dy, yL = yC + 6 + fs;
    var H = Math.ceil(yL + 6);
    var id = uid('i2');
    var g = [];
    // ciudad genérica, tenue (solo en I2)
    g.push('<g transform="translate(236 ' + nx(yT) + ') scale(.72)" style="fill:var(--ill-ciudad)" aria-hidden="true">' +
      '<path d="M0 0V-18H22V-24H40V-14H58V-28H70V-20H92V0Z"/><path d="M96 0V-30H176V0Z"/><path d="M112 -30Q136 -66 160 -30Z"/>' +
      '<rect x="133" y="-70" width="6" height="10"/><circle cx="136" cy="-72" r="3"/><rect x="98" y="-58" width="12" height="28"/>' +
      '<path d="M98 -58L104 -66L110 -58Z"/><rect x="162" y="-58" width="12" height="28"/><path d="M162 -58L168 -66L174 -58Z"/>' +
      '<path d="M180 0V-22H198V-16H214V-32H222V-40H230V-32H238V-18H262V0Z"/></g>');
    // pista
    g.push('<rect x="0" y="' + nx(yT) + '" width="400" height="50" style="fill:var(--ill-pista)"/>');
    g.push('<g style="stroke:var(--surface)" stroke-width="1.6" aria-hidden="true"><path d="M0 ' + nx(yT + 12.5) + 'H400"/><path d="M0 ' +
      nx(yT + 25) + 'H400"/><path d="M0 ' + nx(yT + 37.5) + 'H400"/></g>');
    // meta: cuadros, poste y banderín
    var cuadros = '';
    for (var q = 0; q < 8; q++) cuadros += '<rect x="' + (q % 2 ? 288 : 281.75) + '" y="' + nx(yT + q * 6.25) + '" width="6.25" height="6.25"/>';
    var xm0 = metaIzq ? xM - 1.5 - wM : xM + 1.5;
    var flagM = metaIzq
      ? 'M' + nx(xM - 1.5) + ' ' + nx(yM) + 'h' + nx(-wM) + 'l' + nx(8 * k) + ' ' + nx(fh / 2) + 'l' + nx(-8 * k) + ' ' + nx(fh / 2) + 'h' + nx(wM) + 'Z'
      : 'M' + nx(xM + 1.5) + ' ' + nx(yM) + 'h' + nx(wM) + 'l' + nx(-8 * k) + ' ' + nx(fh / 2) + 'l' + nx(8 * k) + ' ' + nx(fh / 2) + 'h' + nx(-wM) + 'Z';
    g.push('<g class="ill-meta"><g style="fill:var(--text)" aria-hidden="true">' + cuadros + '</g>' +
      '<rect x="' + nx(xM - 1.5) + '" y="' + nx(yM) + '" width="3" height="' + nx(yT - yM) + '" style="fill:var(--text)"/>' +
      '<path d="' + flagM + '" style="fill:var(--ill-meta)"/>' +
      '<text x="' + nx(metaIzq ? xm0 + fpad + 8 * k : xm0 + fpad) + '" y="' + nx(yM + fh * .69) + '" font-size="' + nx(fs) + '" font-weight="700" style="fill:var(--ill-flag-txt)">' + esc(tM) + '</text></g>');
    // el 3:49: tramo que elimina, poste y banderín (data-umbral)
    g.push('<g class="ill-elim" data-umbral="' + SE + '">' +
      '<rect x="0" y="' + nx(yT) + '" width="' + nx(xE) + '" height="50" style="fill:var(--ill-pista-elim)"/>' +
      '<rect x="' + nx(xE - 1.5) + '" y="' + nx(y0) + '" width="3" height="' + nx(yB - y0) + '" style="fill:var(--ill-elim)"/>' +
      '<path d="M' + nx(xE + 1.5) + ' ' + nx(y0) + 'h' + nx(wE) + 'l' + nx(-8 * k) + ' ' + nx(fh / 2) + 'l' + nx(8 * k) + ' ' + nx(fh / 2) + 'h' + nx(-wE) + 'Z" style="fill:var(--ill-elim)"/>' +
      '<text x="' + nx(xE + 1.5 + fpad) + '" y="' + nx(y0 + fh * .69) + '" font-size="' + nx(fs) + '" font-weight="700" style="fill:var(--ill-flag-txt)">' + esc(tE) + '</text></g>');
    // el corredor
    var estado = s >= SE ? 'elim' : (s <= SM ? 'meta' : 'normal');
    var fig = '', xPie = null, cx, yTip, clave;
    if (estado === 'elim') {
      cx = 30;
      fig = ill.corredor('dePie', { h: (P.dePie ? P.dePie.alto : 167.5) * escFig, contorno: !real, ancla: 'centro', x: 0, y: 0 });
      yTip = -(P.dePie ? P.dePie.alto : 167.5) * escFig - 3;
      clave = 'dePie' + real;
    } else if (estado === 'meta' && real) {
      cx = Math.min(Math.max(X(s), 304), 372);
      fig = ill.corredor('celebra', { h: 167.5 * escFig, ancla: 'centro', x: 0, y: 0 });
      yTip = -((P.celebra ? -P.celebra.caja[1] : 182)) * escFig - 3;
      clave = 'celebra';
    } else {
      xPie = X(Math.min(Math.max(s, SE - (REF - 12 - xE) / K), SE));
      var pie = P.corre ? P.corre.pie * escFig : 24.8;
      cx = xPie;
      fig = ill.corredor('corre', { h: (P.corre ? P.corre.alto : 169.6) * escFig, contorno: !real, ancla: 'pie', x: 0, y: 0 });
      yTip = -(P.corre ? P.corre.alto : 169.6) * escFig - 2;
      clave = 'corre' + real;
      var gx = -pie + 9.8;       // globo sobre la cabeza: origen + 9,8
      g.push('<g class="ill-mov" data-clave="' + clave + '" data-x-pie="' + nx(xPie) + '" style="transform:translate(' + nx(xPie) + 'px,' + nx(yS) + 'px)">' +
        fig + globo(gx, yTip, mmss(s), 15 * k) + '</g>');
    }
    if (estado !== 'normal' && !(estado === 'meta' && !real)) {
      g.push('<g class="ill-mov" data-clave="' + clave + '" style="transform:translate(' + nx(cx) + 'px,' + nx(yS) + 'px)">' +
        fig + globo(0, yTip, mmss(s), 15 * k) + '</g>');
    } else if (estado === 'meta' && !real && !xPie) {
      /* simulado por debajo de 3:30: corre en contorno (ya pintado arriba) */
    }
    // cotas con la misma escala k = 12 px/s
    var c = [];
    var etq = [];
    if (s < SE) {
      var xs = Math.max(xE, Math.min(X(s), REF - 4));
      c.push('<g style="stroke:var(--border-strong)" stroke-width="1.5" fill="none" aria-hidden="true"><path d="M' + xE + ' ' + nx(yC - 5) + 'V' + nx(yC + 5) + '"/>' +
        '<path d="M' + nx(xs) + ' ' + nx(yC - 5) + 'V' + nx(yC + 5) + '"/><path data-cota="margen" data-x0="' + xE + '" data-x1="' + nx(xs) + '" d="M' + (xE + 2) + ' ' + nx(yC) + 'H' + nx(xs - 2) + '" stroke-dasharray="4 3"/></g>');
      etq.push({ a: xE, b: xs, largo: difS(SE - s) + ' s de margen', corto: difS(SE - s) + ' s', col: 'var(--text-2)', peso: 400 });
      if (s > SM) {
        c.push('<g style="stroke:var(--ok)" stroke-width="1.5" fill="none" aria-hidden="true"><path d="M' + nx(xs + 2) + ' ' + nx(yC) + 'H' + nx(xM - 3) + '" stroke-dasharray="4 3"/>' +
          '<path d="M' + nx(xM - 7) + ' ' + nx(yC - 4) + 'L' + nx(xM - 2) + ' ' + nx(yC) + 'L' + nx(xM - 7) + ' ' + nx(yC + 4) + '"/></g>');
        etq.push({ a: xs, b: xM, largo: 'faltan ' + difS(s - SM) + ' s', corto: difS(s - SM) + ' s', col: 'var(--ok)', peso: 600 });
      } else if (s < SM) {
        c.push('<g style="stroke:var(--ok)" stroke-width="1.5" fill="none" aria-hidden="true"><path d="M' + nx(xM + 2) + ' ' + nx(yC) + 'H' + nx(xs - 2) + '" stroke-dasharray="4 3"/></g>');
        etq.push({ a: xM, b: xs, largo: difS(SM - s) + ' s por debajo de ' + mmss(SM), corto: difS(SM - s) + ' s', col: 'var(--ok)', peso: 600 });
      }
    } else {
      etq.push({ a: 4, b: xE - 4, largo: 'elimina', corto: 'elimina', col: 'var(--bad)', peso: 700 });
    }
    // rótulos: centrados en su cota; si se acercan, se separan y, si aún se montan, pasan a «N s»
    var medir = function (e, t) { e.txt = t; e.w = anchoTexto(t, fs, e.peso) * 1.05; };
    var encaja = function (e) { e.x = Math.max(e.w / 2 + 2, Math.min(REF - e.w / 2 - 2, e.x)); };
    etq.forEach(function (e) { medir(e, e.largo); e.x = (e.a + e.b) / 2; encaja(e); });
    if (etq.length > 1) {
      var A = etq[0], B = etq[1], hueco = 10;
      var solapa = function () { return A.x + A.w / 2 + hueco > B.x - B.w / 2; };
      var separa = function () {
        if (!solapa()) return;
        var falta = A.x + A.w / 2 + hueco - (B.x - B.w / 2);
        A.x -= falta / 2; B.x += falta / 2; encaja(A); encaja(B);
        if (solapa()) { A.x = B.x - B.w / 2 - hueco - A.w / 2; encaja(A); }
        if (solapa()) { B.x = A.x + A.w / 2 + hueco + B.w / 2; encaja(B); }
      };
      separa();
      if (solapa()) { var c1 = (A.b - A.a) < (B.b - B.a) ? A : B; medir(c1, c1.corto); c1.x = (c1.a + c1.b) / 2; encaja(c1); separa(); }
      if (solapa()) { [A, B].forEach(function (e) { medir(e, e.corto); e.x = (e.a + e.b) / 2; encaja(e); }); separa(); }
    }
    etq.forEach(function (e) {
      e.x = Math.max(e.w / 2 + 2, Math.min(REF - e.w / 2 - 2, e.x));
      c.push('<text x="' + nx(e.x) + '" y="' + nx(yL) + '" font-size="' + nx(fs) + '"' + (e.peso !== 400 ? ' font-weight="' + e.peso + '"' : '') +
        ' text-anchor="middle" style="fill:' + e.col + '">' + esc(e.txt) + '</text>');
    });
    g.push(c.join(''));
    // accesibilidad
    var desc;
    if (s >= SE) desc = (real ? 'Tu marca, ' : 'Marca simulada, ') + mmss(s) + ', llega al ' + mmss(SE) + ', que elimina.';
    else if (s <= SM) desc = (real ? 'Tu marca, ' : 'Marca simulada, ') + mmss(s) + ', está ' + difS(SM - s) + ' s por debajo de la meta de ' + mmss(SM) + ' y a ' + difS(SE - s) + ' s del ' + mmss(SE) + ', que elimina.';
    else desc = (real ? 'Tu marca, ' : 'Marca simulada, ') + mmss(s) + ', está a ' + difS(s - SM) + ' s de la meta de ' + mmss(SM) + ' y a ' + difS(SE - s) + ' s del ' + mmss(SE) + ', que elimina.';
    var svg = '<svg class="ill ill-esc" data-escena="I2" viewBox="0 0 400 ' + H + '" role="img" aria-labelledby="' + id + '-t ' + id + '-d" data-k="' + K + '" data-x-elim="' + xE + '">' +
      '<title id="' + id + '-t">1.000 m: tu marca frente a la meta y al ' + esc(mmss(SE)) + '</title><desc id="' + id + '-d">' + esc(desc) + '</desc>' +
      g.join('') + '</svg>';
    montar(host, svg, { clave: clave });
  }

  // ------------------------------------------------------------------ I3 · barra
  ill.barra = function (host, o) {
    if (!host) return;
    host.__illO = o || {};
    observar(host, function () { pintarBarra(host, host.__illO); });
    pintarBarra(host, host.__illO);
  };

  function pintarBarra(host, o) {
    var reps = o.reps == null ? null : Math.max(0, Math.round(Number(o.reps)));
    var validado = !!o.validado, real = o.real !== false;
    var pint = anchoPintado(host, 560), fs = letra(14, pint);
    var P = poses().arriba;
    var id = uid('i3');
    var g = [];
    var suelo = 236, bx = 104, by = 58, sc = 1.06, px = 176;
    // estructura vista de lado: la barra en sección, sujeta por un brazo al poste, que queda delante del agente
    g.push('<path d="M' + bx + ' ' + by + 'H' + px + 'M' + px + ' ' + (by - 8) + 'V' + suelo + '" style="fill:none;stroke:var(--ill-hierro);stroke-linecap:round;stroke-linejoin:round" stroke-width="6"/>');
    g.push('<path d="M' + (px - 18) + ' ' + suelo + 'H' + (px + 18) + '" style="stroke:var(--ill-hierro);stroke-linecap:round" stroke-width="5"/>');
    g.push('<path d="M20 ' + suelo + 'H212" style="stroke:var(--border)" stroke-width="2"/>');
    if (P) {
      var ox = bx - P.barra[0] * sc, oy = by - P.barra[1] * sc;
      g.push(ill.corredor('arriba', { h: P.alto * sc, x: ox, y: oy, contorno: !real, sombra: false }));
    }
    var rb = 4.6;
    g.push('<circle cx="' + bx + '" cy="' + by + '" r="' + rb + '" style="fill:var(--ill-hierro)"/>');
    var arc = 'M' + nx(bx - rb - 2) + ' ' + nx(by + 1.5) + 'A' + nx(rb + 2) + ' ' + nx(rb + 2) + ' 0 0 1 ' + nx(bx + rb + 2) + ' ' + nx(by + 1.5);
    if (real) {
      g.push('<path d="' + arc + '" style="fill:none;stroke:var(--ill-piel-2);stroke-linecap:round" stroke-width="5"/>');
      g.push('<path d="' + arc + '" style="fill:none;stroke:var(--ill-piel);stroke-linecap:round" stroke-width="3.4"/>');
    }
    // contador de 17 píldoras con el baremo
    var x0 = 250, pw = 26, ph = 7.6, step = 11.2, base = suelo - 2;
    var ys = function (i) { return base - i * step; };
    var e1 = escenario(function (e) { return e.vigente; }), e2 = escenario(function (e) { return e.nombre === 'Objetivo'; });
    var suelo12 = o.suelo != null ? o.suelo : (e1 ? e1.dominadas : null);
    var obj15 = o.objetivo != null ? o.objetivo : (e2 ? e2.dominadas : null);
    var cont17 = [];
    for (var i = 1; i <= 17; i++) {
      var y = ys(i), p = baremoPts('dom', i);
      if (p != null) cont17.push('<rect x="' + (x0 - 9) + '" y="' + nx(y - step / 2 + .6) + '" width="4" height="' + nx(step - 1.2) + '" style="fill:' + colorPts(p) + '"/>');
      var marco = (i === suelo12 || i === obj15) ? 'var(--ok)' : 'var(--border-strong)';
      if (reps != null && i <= reps) {
        cont17.push(validado
          ? '<rect x="' + x0 + '" y="' + nx(y - ph / 2) + '" width="' + pw + '" height="' + ph + '" rx="' + ph / 2 + '" style="fill:var(--s2)"/>'
          : '<rect x="' + (x0 + .75) + '" y="' + nx(y - ph / 2 + .75) + '" width="' + (pw - 1.5) + '" height="' + (ph - 1.5) + '" rx="' + (ph / 2 - .75) + '" style="fill:var(--s2);fill-opacity:.18;stroke:var(--s2)" stroke-width="1.5" stroke-dasharray="3 2"/>');
      } else {
        cont17.push('<rect x="' + (x0 + .75) + '" y="' + nx(y - ph / 2 + .75) + '" width="' + (pw - 1.5) + '" height="' + (ph - 1.5) + '" rx="' + (ph / 2 - .75) + '" style="fill:none;stroke:' + marco + '" stroke-width="1.5"/>');
      }
    }
    g.push('<g class="ill-contador">' + cont17.join('') + '</g>');
    var xl = x0 + pw + 10, rot = [];
    var ptsTxt = function (n) { var p = baremoPts('dom', n); return p == null ? '' : ' · ' + p + ' pts'; };
    var t4 = null, t0 = 0, tr = baremoTramos('dom');
    for (var j = 0; j < tr.length; j++) if (tr[j].pts === 0 && tr[j].max != null) { t4 = tr[j].max; t0 = tr[j].min || 0; }
    if (t4 != null) rot.push([t4, t0 + '–' + t4 + ' elimina', 'var(--bad)', 600]);
    if (suelo12 != null) rot.push([suelo12, suelo12 + ptsTxt(suelo12), 'var(--ok)', 600]);
    if (obj15 != null && obj15 !== suelo12) rot.push([obj15, obj15 + ptsTxt(obj15), 'var(--ok)', 600]);
    rot.push([17, '17' + ptsTxt(17), 'var(--text-3)', 400]);
    var ultimo = -1e9;
    rot.sort(function (a, b) { return a[0] - b[0]; }).forEach(function (r) {
      var y = ys(r[0]) + fs * .36;
      if (ultimo > -1e9 && ultimo - y < fs + 2) return;      // no se montan
      ultimo = y;
      g.push('<text x="' + xl + '" y="' + nx(y) + '" font-size="' + nx(fs) + '"' + (r[3] !== 400 ? ' font-weight="' + r[3] + '"' : '') + ' style="fill:' + r[2] + '">' + esc(r[1]) + '</text>');
    });
    if (reps != null && reps > 0) {
      var ry = ys(Math.min(reps, 17)), tx = x0 - 16;
      g.push('<path d="M' + (x0 - 12) + ' ' + nx(ry - 5) + 'L' + (x0 - 4) + ' ' + nx(ry) + 'L' + (x0 - 12) + ' ' + nx(ry + 5) + 'Z" style="fill:var(--text)"/>');
      g.push('<text x="' + tx + '" y="' + nx(ry + fs * .36) + '" font-size="' + nx(fs) + '" font-weight="700" text-anchor="end" style="fill:var(--text)">tú ' + reps + '</text>');
      var pr = baremoPts('dom', reps);
      if (pr != null) g.push('<text x="' + tx + '" y="' + nx(ry + fs * 1.5) + '" font-size="' + nx(fs) + '" text-anchor="end" style="fill:var(--text-3)">' + pr + ' pts</text>');
    }
    var pie = reps == null ? '' : (validado ? 'Rellenas: válidas en vídeo' : (real ? 'Huecas: autoinformadas, sin vídeo' : 'Huecas: simuladas'));
    var H = suelo + (pie ? 10 + fs : 8);
    if (pie) g.push('<text x="20" y="' + nx(suelo + 6 + fs) + '" font-size="' + nx(fs) + '" style="fill:var(--text-3)">' + esc(pie) + '</text>');
    var desc = reps == null ? 'Sin máximo registrado.' : ((real ? 'Tu máximo: ' : 'Simulado: ') + reps + ' dominadas' + (baremoPts('dom', reps) != null ? ', ' + baremoPts('dom', reps) + ' puntos' : '') + (validado ? ', válidas en vídeo.' : ', sin validar en vídeo.'));
    var svg = '<svg class="ill ill-esc" data-escena="I3" viewBox="0 0 400 ' + Math.ceil(H) + '" role="img" aria-labelledby="' + id + '-t ' + id + '-d">' +
      '<title id="' + id + '-t">Dominadas: tu máximo frente al baremo</title><desc id="' + id + '-d">' + esc(desc) + '</desc>' + g.join('') + '</svg>';
    montar(host, svg, null);
  }

  // ------------------------------------------------------------------ I4 · valla
  ill.valla = function (host, o) {
    if (!host) return;
    host.__illO = o || {};
    observar(host, function () { pintarValla(host, host.__illO); });
    pintarValla(host, host.__illO);
  };

  function pintarValla(host, o) {
    var t = o.t == null || o.t === '' ? null : Number(o.t);
    var real = !!o.real;
    var medido = o.medido !== undefined ? o.medido : (real ? t : null);
    var pint = anchoPintado(host, 560), fs = letra(14, pint), k = fs / 14;
    var id = uid('i4');
    var P = poses().valla;
    var g = [];
    var suelo = 170;
    g.push('<path d="M16 ' + suelo + 'H384" style="stroke:var(--border)" stroke-width="2"/>');
    // valla de verdad: dos patas con su pie y un travesaño, vista de tres cuartos
    var sc = .88, ox = 134, oy = suelo;
    var tv = P ? P.valla : [32, -76];
    var cxv = ox + tv[0] * sc, cyv = oy + tv[1] * sc;
    var dxp = 20, dyp = 13;                        // profundidad: la pata lejana, arriba y a la derecha
    var near = [cxv - dxp, cyv + dyp], far = [cxv + dxp, cyv - dyp];
    var patas = function (p, sombra) {
      var yb = suelo - (p === far ? 2 * dyp : 0);
      return '<path d="M' + nx(p[0]) + ' ' + nx(p[1]) + 'V' + nx(yb) + 'M' + nx(p[0] - 18) + ' ' + nx(yb) + 'H' + nx(p[0] + 3) + '" style="fill:none;stroke:var(--ill-hierro);stroke-linecap:round" stroke-width="' + (sombra ? 3.2 : 4) + '"/>';
    };
    g.push('<ellipse cx="' + nx(cxv) + '" cy="' + suelo + '" rx="46" ry="4" style="fill:var(--ill-sombra)"/>');
    g.push('<g class="ill-valla">' + patas(far, true) +
      '<path d="M' + nx(near[0]) + ' ' + nx(near[1] - 3) + 'L' + nx(far[0]) + ' ' + nx(far[1] - 3) + '" style="stroke:var(--s3);stroke-linecap:round" stroke-width="8"/>' +
      '<path d="M' + nx(near[0]) + ' ' + nx(near[1] + 1.5) + 'L' + nx(far[0]) + ' ' + nx(far[1] + 1.5) + '" style="stroke:var(--ill-hierro);stroke-linecap:round" stroke-width="1.5"/></g>');
    if (P) g.push(ill.corredor('valla', { h: P.alto * sc, x: ox, y: oy, contorno: !real }));
    g.push(patas(near, false));
    // cronómetro: hueco hasta el primer intento válido
    var cx = 334, cy = 78, r = 31;
    g.push('<rect x="' + (cx - 6) + '" y="' + (cy - r - 10) + '" width="12" height="7" rx="2" style="fill:var(--text)"/>');
    g.push('<path d="M' + nx(cx + r * .72) + ' ' + nx(cy - r * .72) + 'l5 -5" style="stroke:var(--text);stroke-linecap:round" stroke-width="3"/>');
    if (medido != null && isFinite(medido)) {
      g.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" style="fill:var(--text)"/>');
      g.push('<text x="' + cx + '" y="' + nx(cy + fs * .5) + '" font-size="' + nx(Math.max(18, fs * 1.2)) + '" font-weight="700" text-anchor="middle" style="fill:var(--surface)">' + esc(coma(medido, 1)) + '</text>');
      g.push('<text x="' + cx + '" y="' + nx(cy + r + 6 + fs) + '" font-size="' + nx(fs) + '" text-anchor="middle" style="fill:var(--text-3)">segundos</text>');
    } else {
      g.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" style="fill:var(--surface);stroke:var(--text)" stroke-width="2" stroke-dasharray="5 4"/>');
      g.push('<text x="' + cx + '" y="' + nx(cy + 7) + '" font-size="' + nx(Math.max(20, fs * 1.3)) + '" font-weight="700" text-anchor="middle" style="fill:var(--text)">¿?</text>');
      g.push('<text x="' + cx + '" y="' + nx(cy + r + 6 + fs) + '" font-size="' + nx(fs) + '" text-anchor="middle" style="fill:var(--text-2)">sin medir</text>');
    }
    // escala del baremo, lo mejor a la derecha: de 12,0 s a 8,0 s
    var L0 = 24, L1 = 376, T0 = 12, T1 = 8;
    var X = function (v) { return L0 + (T0 - v) / (T0 - T1) * (L1 - L0); };
    var yb = 220 + (k - 1) * 30, bh = 9;
    var tr = baremoTramos('cir'), elim = null;
    tr.forEach(function (q) {
      var izq = q.max == null ? T0 : Math.min(T0, q.max + .05), der = q.min == null ? T1 : Math.max(T1, q.min - .05);
      if (izq <= der) return;
      if (q.pts === 0) elim = q.min;
      g.push('<rect x="' + nx(X(izq)) + '" y="' + nx(yb) + '" width="' + nx(X(der) - X(izq) - .8) + '" height="' + bh + '" style="fill:' + colorPts(q.pts) + '"' + (q.pts === 0 ? ' data-tramo="elimina"' : '') + '/>');
    });
    g.push('<text x="' + L0 + '" y="' + nx(yb - 8) + '" font-size="' + nx(fs) + '" style="fill:var(--text-3)">' + coma(T0, 1) + ' s</text>');
    g.push('<text x="' + L1 + '" y="' + nx(yb - 8) + '" font-size="' + nx(fs) + '" text-anchor="end" style="fill:var(--text-3)">' + coma(T1, 1) + ' s</text>');
    var yl = yb + bh + 6 + fs;
    if (elim != null) g.push('<text x="' + L0 + '" y="' + nx(yl) + '" font-size="' + nx(fs) + '" font-weight="600" style="fill:var(--bad)">' + coma(elim, 1) + ' elimina</text>');
    var e2 = escenario(function (e) { return e.nombre === 'Objetivo'; });
    var obj = o.objetivo != null ? o.objetivo : (e2 ? e2.circuito : null);
    if (obj != null) {
      g.push('<path d="M' + nx(X(obj)) + ' ' + nx(yb - 3) + 'V' + nx(yb + bh + 3) + '" style="stroke:var(--ok)" stroke-width="2.5"/>');
      var wo = anchoTexto('objetivo ' + coma(obj, 1), fs, 600);
      g.push('<text x="' + nx(Math.min(X(obj), L1 - wo / 2)) + '" y="' + nx(yl) + '" font-size="' + nx(fs) + '" font-weight="600" text-anchor="middle" style="fill:var(--ok)">objetivo ' + coma(obj, 1) + '</text>');
    }
    if (t != null && isFinite(t)) {
      var xt = X(Math.max(T1, Math.min(T0, t)));
      g.push('<path d="M' + nx(xt - 6) + ' ' + nx(yb - 10) + 'L' + nx(xt + 6) + ' ' + nx(yb - 10) + 'L' + nx(xt) + ' ' + nx(yb - 2) + 'Z" style="' +
        (real ? 'fill:var(--text)' : 'fill:var(--surface);stroke:var(--text);stroke-width:1.5;stroke-dasharray:2 1.5') + '"/>');
      var lt = 'tú ' + coma(t, 1) + (o.etiqueta ? ' · ' + o.etiqueta : '');
      var wt = anchoTexto(lt, fs, 700);
      var xlt = Math.max(L0 + anchoTexto(coma(T0, 1) + ' s', fs) + 8 + wt / 2, Math.min(L1 - anchoTexto(coma(T1, 1) + ' s', fs) - 8 - wt / 2, xt));
      g.push('<text x="' + nx(xlt) + '" y="' + nx(yb - 14) + '" font-size="' + nx(fs) + '" font-weight="700" text-anchor="middle" style="fill:var(--text)">' + esc(lt) + '</text>');
    }
    var H = Math.ceil(yl + 6);
    var desc = (medido != null ? 'Circuito medido: ' + coma(medido, 1) + ' s.' : 'Circuito sin medición seria.') +
      (t != null ? ' Marca en la escala: ' + coma(t, 1) + ' s' + (o.etiqueta ? ' (' + o.etiqueta + ')' : '') + '.' : '') +
      (obj != null ? ' Objetivo ' + coma(obj, 1) + ' s.' : '') + (elim != null ? ' Elimina ' + coma(elim, 1) + ' s o más.' : '');
    var svg = '<svg class="ill ill-esc" data-escena="I4" viewBox="0 0 400 ' + H + '" role="img" aria-labelledby="' + id + '-t ' + id + '-d">' +
      '<title id="' + id + '-t">Circuito: franqueo de la valla y tiempo frente al baremo</title><desc id="' + id + '-d">' + esc(desc) + '</desc>' + g.join('') + '</svg>';
    montar(host, svg, null);
  }

  // ------------------------------------------------------------------ I5 e I6 · láminas técnicas
  ill.laminas = function () { return Object.keys(ill._laminas || {}); };

  function ejercicio(idEj) {
    var e = (PC.D && PC.D.plan && PC.D.plan.ejercicios) || [];
    for (var i = 0; i < e.length; i++) if (e[i].id === idEj) return e[i];
    return null;
  }
  // Corta el texto literal de protocoloDominadas.tecnicaExamen en sus piezas (sin reescribir nada).
  function reglasBOE(te) {
    var out = { fuente: '', pi: [], reglas: {}, nula: '' };
    if (!te) return out;
    var i = te.indexOf('Posición inicial:');
    out.fuente = (i > 0 ? te.slice(0, i) : '').trim();
    var q = te.match(/«[^»]+»/g) || [];
    var pi = q[0] ? q[0].slice(1, -1) : '';
    var fr = pi.match(/[^.]+\.(?=\s|$)/g) || [pi];
    out.pi = [(fr[0] || '').trim(), fr.slice(1).join(' ').trim(), q[1] ? q[1].slice(1, -1) : ''];
    var a = te.indexOf('Reglas:'), b = te.indexOf('Intento nulo:');
    var rs = te.slice(a >= 0 ? a + 7 : 0, b > a ? b : te.length);
    rs.replace(/(\d)\.\s([\s\S]*?)(?=\s\d\.\s|$)/g, function (m, n, t) { out.reglas[n] = t.trim(); return m; });
    out.nula = q.length > 2 ? q[q.length - 1].slice(1, -1) : '';
    return out;
  }

  function itemLeyenda(n, clase, etiqueta, texto, interactivo, prefijo) {
    var bdg = '<span class="ill-bdg' + (clase ? ' ' + clase : '') + '" aria-hidden="true">' + esc(etiqueta) + '</span>';
    var lt = '<span class="ill-lt">' + (prefijo ? '<span class="ill-vh">' + esc(prefijo) + ' </span>' : '') + esc(texto) + '</span>';
    if (!interactivo) return '<li data-n="' + esc(n) + '"><div class="ill-lb">' + bdg + lt + '</div></li>';
    return '<li data-n="' + esc(n) + '"><button type="button" class="ill-lb" aria-pressed="false">' + bdg + lt + '</button></li>';
  }

  function leyendaDominada(L) {
    var plan = PC.D && PC.D.plan;
    var te = plan && plan.protocoloDominadas && plan.protocoloDominadas.tecnicaExamen;
    var R = reglasBOE(te || '');
    var marcadas = {};
    L.paneles.forEach(function (p) { p.marcas.forEach(function (m) { marcadas[m] = 1; }); });
    var h = ['<ol class="ill-ley">'];
    if (!te) return '<p class="ill-fuente">Falta protocoloDominadas.tecnicaExamen en los datos.</p>';
    h.push('<li class="ill-grp" aria-hidden="true">Posición inicial (BOE)</li>');
    ['PI-1', 'PI-2', 'PI-3'].forEach(function (n, i) { if (R.pi[i]) h.push(itemLeyenda(n, '', n, R.pi[i], !!marcadas[n], 'Posición inicial ' + n + ':')); });
    h.push('<li class="ill-grp" aria-hidden="true">Reglas del BOE (número negro)</li>');
    for (var r = 1; r <= 9; r++) if (R.reglas[r]) h.push(itemLeyenda(String(r), '', String(r), R.reglas[r], !!marcadas[String(r)], 'Regla ' + r + ':'));
    if (R.nula) h.push(itemLeyenda('nula', 'nula', 'nula', R.nula, true, ''));
    var ej = ejercicio(L.ejercicio), cons = L.consejos || {};
    if (ej && ej.tecnica) {
      h.push('<li class="ill-grp" aria-hidden="true">Consejos del plan (letra azul)</li>');
      Object.keys(cons).forEach(function (letra) {
        var t = ej.tecnica[cons[letra]];
        if (t) h.push(itemLeyenda(letra, 'plan', letra, t, !!marcadas[letra], 'Consejo ' + letra + ':'));
      });
    }
    h.push('</ol>');
    if (R.fuente) h.push('<p class="ill-fuente">' + esc(R.fuente) + '</p>');
    return h.join('');
  }

  function leyendaEjercicio(L) {
    var ej = ejercicio(L.ejercicio);
    if (!ej || !ej.tecnica) return '';
    var marcadas = {};
    L.paneles.forEach(function (p) { p.marcas.forEach(function (m) { marcadas[m] = 1; }); });
    var items = ej.tecnica.map(function (t, i) {
      var letra = String.fromCharCode(97 + i);
      return itemLeyenda(letra, 'plan', letra, t, !!marcadas[letra], 'Consejo ' + letra + ':');
    });
    var h = '<ol class="ill-ley">' + items.slice(0, 3).join('');
    if (items.length > 3) h += '<li class="ill-mas"><details><summary>Más (' + (items.length - 3) + ')</summary><ol>' + items.slice(3).join('') + '</ol></details></li>';
    return h + '</ol>';
  }

  function textoMarca(root, n) {
    var li = root.querySelector('.ill-ley li[data-n="' + n + '"] .ill-lt');
    return li ? li.textContent : '';
  }

  ill.lamina = function (host, id, o) {
    o = o || {};
    var L = (ill._laminas || {})[id];
    if (!host || !L) return;
    var suf = uid('l');
    var esDom = id === 'dominada';
    var h = ['<div class="ill-lamina" data-lamina="' + esc(id) + '">'];
    if (o.titulo !== false) {
      h.push('<h3 class="ill-lam-t">' + esc(L.titulo) + '</h3>');
      h.push('<p class="ill-lam-sub">' + (esDom ? 'Número negro: regla del BOE · PI: posición inicial · letra azul: consejo del plan · aspa: nula. Toca un número para verlo en el dibujo.'
        : 'Letra azul: consejo del plan · en gris claro, la posición de partida · aspa: lo que no. Toca una letra para verla en el dibujo.') + '</p>');
    }
    h.push('<div class="ill-car' + (L.paneles.length === 1 ? ' uno' : '') + '" tabindex="0" role="group" aria-label="' + esc(L.titulo) + ': ' + L.paneles.length + ' paneles; desliza para ver el siguiente">');
    L.paneles.forEach(function (p, i) {
      h.push('<figure class="ill-pan" data-i="' + i + '"><figcaption><b>' + (i + 1) + ' · ' + esc(p.titulo) + '</b><small>' + esc(p.sub) + '</small></figcaption>' + unicos(p.svg, suf) + '</figure>');
    });
    h.push('</div>');
    if (L.paneles.length > 1) {
      h.push('<div class="ill-dots" role="group" aria-label="Paneles">');
      L.paneles.forEach(function (p, i) {
        h.push('<button type="button" aria-label="Panel ' + (i + 1) + ': ' + esc(p.titulo) + '"' + (i === 0 ? ' aria-current="true"' : '') + ' data-i="' + i + '"></button>');
      });
      h.push('</div>');
    }
    h.push(esDom ? leyendaDominada(L) : leyendaEjercicio(L));
    h.push('</div>');
    host.innerHTML = h.join('');
    var root = host.querySelector('.ill-lamina');
    enlazar(root);
    observar(host, function () { ajustarLetra(root); });
    ajustarLetra(root);
  };

  // Mantiene la letra de los paneles a 12 px como mínimo (la insignia crece entera con --ill-k).
  function ajustarLetra(root) {
    [].forEach.call(root.querySelectorAll('svg.ill-lam'), function (sv) {
      var w = sv.getBoundingClientRect().width;
      if (!w) return;
      var f = w / LAM_W;
      sv.style.setProperty('--ill-k', Math.max(1, 12 / (12 * f)).toFixed(3));
      var rh = Math.max(24, 23 / f).toFixed(1);          // zona de toque de 46 px de pantalla como mínimo
      [].forEach.call(sv.querySelectorAll('.ill-hit'), function (c) { c.setAttribute('r', rh); });
      [].forEach.call(sv.querySelectorAll('text.ill-t'), function (t) {
        if (t.closest('.ill-b')) return;
        var base = +(t.getAttribute('data-fs') || t.getAttribute('font-size'));
        if (!t.getAttribute('data-fs')) t.setAttribute('data-fs', base);
        t.setAttribute('font-size', Math.max(base, 12 / f).toFixed(2));
      });
    });
  }

  function enlazar(root) {
    var svgs = root.querySelectorAll('svg.ill-lam');
    var car = root.querySelector('.ill-car');
    var activo = null;
    function selector(n) { return n === 'nula' ? '.ill-m[data-nula]' : '.ill-m[data-n="' + n + '"]'; }
    function activar(n, desdeLeyenda) {
      activo = (activo === n) ? null : n;
      [].forEach.call(svgs, function (sv) {
        [].forEach.call(sv.querySelectorAll('.ill-m.on'), function (m) { m.classList.remove('on'); m.setAttribute('aria-pressed', 'false'); });
        if (activo) {
          [].forEach.call(sv.querySelectorAll(selector(activo)), function (m) { m.classList.add('on'); m.setAttribute('aria-pressed', 'true'); });
        }
        sv.classList.toggle('hay-on', !!activo);
      });
      [].forEach.call(root.querySelectorAll('.ill-ley li[data-n]'), function (li) {
        var on = activo && li.getAttribute('data-n') === activo;
        li.classList.toggle('on', !!on);
        var b = li.querySelector('button');
        if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (on && !desdeLeyenda) {
          var d = li.closest('details');
          if (d && !d.open) d.open = true;
        }
      });
      if (activo && desdeLeyenda && car && car.scrollWidth > car.clientWidth + 4) {
        var pan = null;
        [].some.call(root.querySelectorAll('.ill-pan'), function (p) { if (p.querySelector(selector(activo))) { pan = p; return true; } return false; });
        if (pan) {
          car.scrollTo({ left: pan.offsetLeft - car.offsetLeft, behavior: reducido() ? 'auto' : 'smooth' });
          marcarPunto(+pan.getAttribute('data-i'));
        }
      }
    }
    function marcarPunto(k) {
      [].forEach.call(root.querySelectorAll('.ill-dots button'), function (d, i) {
        if (i === k) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
      });
    }
    [].forEach.call(root.querySelectorAll('.ill-ley button.ill-lb'), function (b) {
      b.addEventListener('click', function () { activar(b.parentNode.getAttribute('data-n'), true); });
    });
    [].forEach.call(root.querySelectorAll('svg.ill-lam .ill-m'), function (m) {
      var n = m.getAttribute('data-n');
      var txt = textoMarca(root, n);
      var k = m.getAttribute('data-k');
      var nombre = k === 'boe' ? 'Regla ' + n : (k === 'pi' ? 'Posición inicial ' + n : 'Consejo ' + n);
      m.setAttribute('tabindex', '0');
      m.setAttribute('role', 'button');
      m.setAttribute('aria-pressed', 'false');
      m.setAttribute('aria-label', nombre + (txt ? ': ' + txt : ''));
      m.addEventListener('click', function () { activar(n, false); });
      m.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activar(n, false); }
      });
    });
    root.addEventListener('keydown', function (e) { if (e.key === 'Escape' && activo) activar(activo, false); });
    // puntos de página del carrusel
    var dots = root.querySelectorAll('.ill-dots button');
    if (car && dots.length) {
      var pans = root.querySelectorAll('.ill-pan');
      [].forEach.call(dots, function (d) {
        d.addEventListener('click', function () {
          var p = pans[+d.getAttribute('data-i')];
          if (p) { car.scrollTo({ left: p.offsetLeft - car.offsetLeft, behavior: reducido() ? 'auto' : 'smooth' }); marcarPunto(+d.getAttribute('data-i')); }
        });
      });
      var t = 0;
      car.addEventListener('scroll', function () {
        clearTimeout(t);
        t = setTimeout(function () {
          var best = 0, dist = 1e9;
          [].forEach.call(pans, function (p, i) {
            var dd = Math.abs(p.offsetLeft - car.offsetLeft - car.scrollLeft);
            if (dd < dist) { dist = dd; best = i; }
          });
          marcarPunto(best);
        }, 60);
      }, { passive: true });
    }
  }
})(typeof PC !== 'undefined' ? PC : (window.PC = window.PC || {}));
