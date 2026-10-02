/* 40_marcas.js · M4 · Marcas (especificación §5.3, T5, T10, G1–G10, G12, G16)
   Vista «¿Cómo voy y qué nota saco?». Todo sale del bloque de datos (PC.D): ninguna cifra escrita a mano.

   Exporta (§10.3):
   · PC.graf.series(host, sesion)        G5 · series de una sesión. `sesion` puede ser una entrada de
       derivados.series ({fecha, sesion, valida, objetivo:'1:27', tiemposS:[…], parciales, fcMax}) o una vista
       previa {fecha, objetivo:'1:27', reps:[{t:86.9|null, cat:'dentro'|'lenta'|'rapida'|null}, …]} (o reps como
       números). Sin tiempos, cada categoría va como punto hueco en su franja. Si `host` no es un figure.chart,
       crea uno dentro. Se redibuja sola al cambiar el ancho.
   · PC.graf.notaPista(host, {media, real, resultado, escenarios, pose, rotulo})   G1 · pista de la nota.
       En la web solo la usa Marcas M-1 (una sola vez).
   Convenciones: relleno = medido; hueco o discontinuo = supuesto, autoinformado, «al 60 %» o simulado.
   El 3:49 (data-umbral="229") está en la pista del 1.000, en I2, en G3, en G3b, en G12 y en cada tira de parciales. */
(function (PC) {
  'use strict';
  if (!PC) return;
  var W = window, DOC = document;
  var D = PC.D || {}, P = D.plan || {}, H = D.historial || {}, DV = D.derivados || {}, WJ = D.web || {};
  var esc = PC.esc, fmt = PC.fmt;
  var ELIM = 229;
  var raiz = null;

  /* ------------------------------------------------------------------ utilidades */
  function num(v, dec) { return fmt.num(v, dec); }
  function mmss(s) { return fmt.t(s, Math.abs(s - Math.round(s)) > 1e-6 ? 1 : 0); }
  function seg(txt) { return typeof txt === 'number' ? txt : fmt.parseT(txt); }
  function corta(iso) { return fmt.dia(iso, 'corta'); }
  function dm(iso) { return fmt.dia(iso, 'dm'); }
  function ptsTxt(p) { return p === 1 ? '1 pt' : p + ' pts'; }
  function dif(v, dec, unidad) {           /* −0,2 s · +1 · −4 s */
    var r = Math.round(v * Math.pow(10, dec || 0)) / Math.pow(10, dec || 0);
    return (r > 0 ? '+' : r < 0 ? '−' : '±') + num(Math.abs(r), dec) + (unidad || '');
  }
  function lista(a) { return Array.isArray(a) ? a : []; }
  function ordenFecha(a, b) { return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0; }
  function el(tag, attrs, html) { return PC.el(tag, attrs, html); }
  function svgEl(tag, attrs, parent) { return PC.svg(tag, attrs, parent); }
  function primeraFrase(t) { var m = /^(.+?[.!?])(\s|$)/.exec(String(t || '')); return m ? m[1] : String(t || ''); }
  function restoFrase(t) { var p = primeraFrase(t); return String(t || '').slice(p.length).trim(); }
  function cap(t) { t = String(t || ''); return t.charAt(0).toUpperCase() + t.slice(1); }
  function minus(t) { t = String(t || ''); return t === t.toUpperCase() ? t.toLowerCase() : t; }
  var uidN = 0;
  function uid(p) { uidN += 1; return (p || 'mc') + '-' + uidN; }
  function histDe(arr, fecha) { var r = null; lista(H[arr]).forEach(function (e) { if (e.fecha === fecha) r = e; }); return r; }
  function acc(titulo, contenido, cls, abierto) {
    return '<details class="acc ' + (cls || '') + '"' + (abierto ? ' open' : '') + '><summary>' + titulo + PC.icon('chev', 'sm chev') +
      '</summary><div class="in">' + contenido + '</div></details>';
  }
  function porQue(contenido, titulo) {
    return acc(PC.icon('info', 'sm') + (titulo || 'Por qué'), contenido, 'why');
  }
  /* dibuja cuando el host tiene ancho y vuelve a dibujar al cambiar el ancho (también al abrir un details) */
  function montar(host, dibujar) {
    function d() { if (host.clientWidth > 0) { try { dibujar(); } catch (e) { PC._err('marcas', e); } } }
    d();
    if (!host.__mcObs) { host.__mcObs = true; PC.alRedimensionar(host, d); }
    host.__mcDibujar = d;
  }

  /* ------------------------------------------------------------------ baremo y pruebas */
  var BT = { cir: PC.baremo.tramos('cir'), dom: PC.baremo.tramos('dom'), mil: PC.baremo.tramos('mil') };
  function tramo0(k) { var t = null; BT[k].forEach(function (x) { if (x.pts === 0) t = x; }); return t; }
  /* Cada prueba con su regla: v del deslizador (0..N), mejor a la derecha (§6.2 T5) */
  var PR = {
    cir: { n: 'Circuito', N: 47, icono: 'circuito',
      v2s: function (v) { return Math.round(125 - v) / 10; }, s2v: function (s) { return Math.round((12.5 - s) * 10); },
      txt: function (s) { return num(s, 1) + ' s'; }, corte: function (s) { return num(s, 1) + ' s o menos'; },
      sig: function (o) { return num(o.objetivo, 1) + ' s (' + dif(o.diferencia, 1, ' s') + ')'; } },
    dom: { n: 'Dominadas', N: 22, icono: 'fuerza',
      v2s: function (v) { return v; }, s2v: function (s) { return Math.round(s); },
      txt: function (s) { return String(s); }, corte: function (s) { return s + ' o más'; },
      sig: function (o) { return o.objetivo + ' (' + dif(o.diferencia, 0) + ')'; } },
    mil: { n: '1.000 m', N: 100, icono: 'carrera',
      v2s: function (v) { return 265 - v; }, s2v: function (s) { return Math.round(265 - s); },
      txt: function (s) { return mmss(s); }, corte: function (s) { return mmss(s) + ' o menos'; },
      sig: function (o) { return mmss(o.objetivo) + ' (' + dif(o.diferencia, 0, ' s') + ')'; } }
  };
  var ORDEN = ['cir', 'dom', 'mil'];            /* el orden de la prueba: circuito → dominadas → 1.000 m */
  function elimTxt(k) {
    var t = tramo0(k); if (!t) return '';
    if (k === 'dom') return t.max + ' o menos elimina';
    if (k === 'cir') return num(t.min, 1) + ' s o más elimina';
    return mmss(t.min) + ' o más elimina';
  }
  function clampV(k, v) { return Math.max(0, Math.min(PR[k].N, v)); }

  /* marcas reales (derivados.marcas) */
  var M = DV.marcas || {};
  var REAL = {
    mil: M.mil ? M.mil.s : null, dom: M.dom ? M.dom.reps : null, cir: M.cir ? M.cir.s : null
  };
  var FIAB = { mil: M.mil && M.mil.fiab, dom: M.dom && M.dom.fiab, cir: M.cir && M.cir.fiab };
  function fiabHueca(k) { return FIAB[k] && FIAB[k] !== 'medido'; }

  /* escenarios de plan.json */
  var ESC = lista(P.escenariosNota).map(function (e, i) {
    var corto = String(e.nombre || '').split(/ \(|:/)[0].trim();
    return { i: i, e: e, corto: corto, v: { mil: seg(e.mil), dom: +e.dominadas, cir: +e.circuito } };
  });
  function igualV(a, b) { return ORDEN.every(function (k) { return Math.abs(a[k] - b[k]) < 1e-6; }); }
  function notaDe(v) { return PC.baremo.nota({ mil: v.mil, dom: v.dom, cir: v.cir }); }
  var NR = notaDe(REAL);                         /* nota con las marcas registradas */
  if (typeof M.media === 'number') NR.media = M.media;
  if (M.resultado) NR.txt = M.resultado;

  /* estado del simulador (T5) */
  var ST = { v: { mil: REAL.mil, dom: REAL.dom, cir: REAL.cir }, base: 'hoy', estado: 'hoy' };
  function valoresBase(base) {
    if (base === 'hoy') return REAL;
    var x = ESC[+String(base).replace('esc', '')]; return x ? x.v : REAL;
  }
  function recalcEstado() {
    ST.estado = igualV(ST.v, valoresBase(ST.base)) ? ST.base : 'sim';
    if (ST.estado !== 'hoy' && igualV(ST.v, REAL)) ST.estado = 'hoy';
  }
  function esReal() { return ST.estado === 'hoy'; }
  function quienElimina(p) {
    return p.dom === 0 ? 'las dominadas' : p.mil === 0 ? 'el 1.000' : p.cir === 0 ? 'el circuito' : '';
  }
  function clsRes(txt) { return txt === 'APTO' ? 'ok' : txt === 'ELIMINADO' ? 'bad' : 'warn'; }

  /* marca de corte viva (G10): la peor marca de k que todavía da un 5,00 con las otras dos */
  function corteVivo(k, v) {
    var p = notaDe(v).pts, otras = 0;
    ORDEN.forEach(function (j) { if (j !== k) otras += p[j] || 0; });
    var need = 15 - otras;
    if (need > 10) return { tipo: 'no', txt: 'con estas dos no llega' };
    if (need <= 1) return { tipo: 'todo', txt: 'cualquier marca que no elimine' };
    var c = PC.baremo.corte(k, need);
    if (c === null) return { tipo: 'no', txt: 'con estas dos no llega' };
    return { tipo: 'marca', s: c, need: need, txt: 'para el 5,00: ' + PR[k].corte(c) };
  }
  PC._mcCorte = corteVivo;      /* para la QA: PC._mcCorte('cir', {mil:214, dom:12, cir:9}) */

  /* ------------------------------------------------------------------ G1 · pista de la nota (I8) */
  PC.graf = PC.graf || {};
  /* o: {media, real:bool, resultado:'APTO'|'NO APTO'|'ELIMINADO', mediaReal, escenarios:[media…], rotulo, eliminaPor} */
  PC.graf.notaPista = function (host, o) {
    if (!host) return;
    host.__g1o = o || {};
    montar(host, function () { g1Pintar(host); });
  };
  function g1Pintar(host) {
    var o = host.__g1o || {}, w = Math.floor(host.clientWidth);
    if (!w) return;
    var viejo = host.__g1;
    if (viejo && viejo.w === w) { g1Mover(host, o); return; }
    var h = 138, pl = 18, pr = 18, y0 = 98;
    var X = function (v) { return pl + Math.max(0, Math.min(10, v)) / 10 * (w - pl - pr); };
    var s = [];
    s.push('<rect class="mc-g1-pista" x="' + X(0) + '" y="' + y0 + '" width="' + (X(10) - X(0)) + '" height="8" rx="4"/>');
    s.push('<rect class="mc-g1-apto" x="' + X(5) + '" y="' + y0 + '" width="' + (X(10) - X(5)) + '" height="8" rx="0"/>');
    for (var i = 0; i <= 10; i++) s.push('<path class="mc-g1-tic" d="M' + X(i).toFixed(1) + ' ' + (y0 + 9) + 'v4"/>');
    s.push('<text x="' + X(0) + '" y="' + (y0 + 26) + '" text-anchor="start">0</text><text x="' + X(10) + '" y="' + (y0 + 26) + '" text-anchor="end">10</text>');
    /* raya de la media real (no se mueve) */
    s.push('<g class="mc-g1-hoy"></g>');
    s.push('<g class="mc-g1-esc"></g>');
    /* cinta del 5,00: poste y banderín en --ill-meta */
    s.push('<rect class="mc-g1-poste" x="' + (X(5) - 1.5).toFixed(1) + '" y="18" width="3" height="' + (y0 + 8 - 18) + '"/>');
    s.push('<g class="mc-g1-flag"></g><text class="mc-g1-rot lab" y="66"></text>');
    s.push('<g class="mc-g1-ag ill-mov"></g>');
    var svg = '<svg class="mc-g1-svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" role="img">' + s.join('') + '</svg>';
    host.innerHTML = svg;
    host.__g1 = { w: w, X: X, y0: y0, svg: host.firstChild };
    g1Mover(host, o, true);
  }
  function g1Mover(host, o, primera) {
    var G = host.__g1; if (!G) return;
    var X = G.X, y0 = G.y0, svg = G.svg;
    var media = +o.media || 0, real = !!o.real, res = o.resultado || '';
    /* raya «hoy» con la media real */
    var hoy = svg.querySelector('.mc-g1-hoy');
    if (typeof o.mediaReal === 'number') {
      var xr = X(o.mediaReal), izq = o.mediaReal < 5;
      hoy.innerHTML = '<rect x="' + (xr - 1).toFixed(1) + '" y="' + (y0 - 6) + '" width="2" height="20"/>' +
        '<text class="lab" x="' + (izq ? xr + 3 : xr - 3).toFixed(1) + '" y="' + (y0 + 26) + '" text-anchor="' + (izq ? 'end' : 'start') + '">hoy ' + esc(num(o.mediaReal, 2)) + '</text>';
    } else hoy.innerHTML = '';
    /* escenarios: marcadores huecos */
    svg.querySelector('.mc-g1-esc').innerHTML = lista(o.escenarios).map(function (m) {
      return '<circle cx="' + X(m).toFixed(1) + '" cy="' + (y0 + 4) + '" r="4.5"/>';
    }).join('');
    /* banderín al lado contrario del agente */
    var ladoDer = media < 5;
    var fw = 84, xp = X(5), fx = ladoDer ? xp + 1.5 : xp - 1.5 - fw;
    var flag = ladoDer
      ? 'M' + fx.toFixed(1) + ' 18h' + fw + 'l-7 12l7 12h-' + fw + 'Z'
      : 'M' + (fx + fw).toFixed(1) + ' 18h-' + fw + 'l7 12l-7 12h' + fw + 'Z';
    svg.querySelector('.mc-g1-flag').innerHTML = '<path d="' + flag + '"/><text x="' + (ladoDer ? fx + 8 : fx + fw - 8).toFixed(1) + '" y="34" text-anchor="' + (ladoDer ? 'start' : 'end') + '">5,00 apto</text>';
    var rot = svg.querySelector('.mc-g1-rot'), rtxt = '', rcls = '';
    if (res === 'ELIMINADO') { rtxt = 'eliminado' + (o.eliminaPor ? ' por ' + o.eliminaPor : ''); rcls = 'bad'; }
    else if (media < 5) { rtxt = 'faltan ' + num(Math.round((5 - media) * 100) / 100, 2); rcls = 'warn'; }
    else { rtxt = num(Math.round((media - 5) * 100) / 100, 2) + ' de margen'; rcls = 'ok'; }
    rot.textContent = rtxt;
    rot.setAttribute('class', 'mc-g1-rot lab ' + rcls);
    rot.setAttribute('x', (ladoDer ? xp + 8 : xp - 8).toFixed(1));
    rot.setAttribute('text-anchor', ladoDer ? 'start' : 'end');
    /* el agente: relleno con marcas reales, en contorno con escenario o simulado; celebra solo real, APTO y con las tres marcas medidas */
    var pose = res === 'ELIMINADO' ? 'dePie' : (real && o.medido !== false && res === 'APTO' ? 'celebra' : 'corre');
    var ag = svg.querySelector('.mc-g1-ag');
    var clave = pose + (real ? 'r' : 'c');
    if (ag.getAttribute('data-clave') !== clave) {
      ag.innerHTML = PC.ill && PC.ill.corredor ? PC.ill.corredor(pose, { h: 62, x: 0, y: y0, ancla: pose === 'corre' ? 'pie' : 'centro', contorno: !real, estelas: false }) : '';
      ag.setAttribute('data-clave', clave);
    }
    var xa = X(media);
    if (primera) ag.style.transition = 'none';
    ag.style.transform = 'translate(' + xa.toFixed(1) + 'px,0px)';
    if (primera) { void ag.getBoundingClientRect(); ag.style.transition = ''; }
    svg.setAttribute('aria-label', 'Pista de la nota de 0 a 10: ' + (real ? 'con tus marcas, ' : 'simulado, ') + num(media, 2) +
      '; hace falta 5,00; ' + rtxt + (typeof o.mediaReal === 'number' ? '. Hoy: ' + num(o.mediaReal, 2) : '') + '.');
  }

  /* ------------------------------------------------------------------ M-1 · tu nota y simulador (T5, G1, G2, G10) */
  function tituloReal() {
    if (NR.txt === 'APTO') return 'Con las marcas de hoy apruebas: ' + num(NR.media, 2);
    if (NR.txt === 'ELIMINADO') return 'Con las marcas de hoy quedas eliminado por ' + quienElimina(NR.pts);
    return 'Con las marcas de hoy no apruebas: ' + num(NR.media, 2);
  }
  function tramosV(k) {                       /* tramos del baremo en unidades del deslizador */
    var N = PR[k].N, out = [];
    BT[k].forEach(function (t) {
      var a, b;
      if (k === 'dom') { a = t.min; b = t.max === null ? N : t.max; }
      else { a = t.max === null ? 0 : PR[k].s2v(t.max); b = PR[k].s2v(t.min); }
      a = Math.max(0, a); b = Math.min(N, b);
      if (a > N || b < 0 || a > b) return;
      out.push({ pts: t.pts, a: a, b: b, f0: (a - 0.5) / N, f1: (b + 0.5) / N });
    });
    return out.sort(function (x, y) { return x.a - y.a; });
  }
  function pct(f) { return (f * 100).toFixed(3) + '%'; }
  function filaHtml(k) {
    var R = PR[k], T = tramosV(k), t0 = T[0];
    var mil = k === 'mil' ? ' data-umbral="229"' : '';
    var bloques = T.map(function (t) {
      return '<i class="mc-tb mc-c' + Math.ceil(t.pts / 2) + '" style="left:' + pct(t.f0) + ';width:' + pct(t.f1 - t.f0) + '"' +
        (t.pts === 0 ? ' data-tramo="elimina"' + mil : '') + '></i>';
    }).join('');
    var vr = REAL[k] === null ? null : clampV(k, R.s2v(REAL[k]));
    return '<div class="mc-fila" data-k="' + k + '">' +
      '<div class="mc-fh"><span class="mc-fn">' + PC.icon(R.icono, 'sm') + esc(R.n) + '</span>' +
      '<b class="mc-fv num" data-f="val"></b><span class="chip" data-f="pts"></span><span class="chip" data-f="fiab"></span></div>' +
      '<div class="mc-pista"><div class="mc-tr" aria-hidden="true">' + bloques +
      (vr === null ? '' : '<i class="mc-real" style="left:' + pct(vr / R.N) + '" title="tu marca"></i>') +
      '<i class="mc-corte" data-f="cmark"></i></div>' +
      '<input type="range" class="mc-rango" min="0" max="' + R.N + '" step="1" aria-label="' + esc(R.n) + ': simular una marca"></div>' +
      '<div class="mc-ej"><span class="mc-elim"' + mil + ' style="left:' + pct(t0 ? Math.max(0, t0.f0) : 0) + '">' + esc(elimTxt(k)) + '</span><span class="mc-mejor">mejor →</span></div>' +
      '<p class="mc-ct"><i class="mc-ct-i" aria-hidden="true"></i><span data-f="corte"></span></p>' +
      '<p class="mc-sg" data-f="sig"></p>' +
      '<details class="acc mc-det" data-f="det"><summary>Detalle' + PC.icon('chev', 'sm chev') + '</summary><div class="in">' +
      '<div class="mc-escena" data-f="escena"></div>' + textosMarca(k) + '</div></details>' +
      '</div>';
  }
  var TEXTOS_MARCA = [['marca', 'Marca'], ['base', 'De dónde sale'], ['margen', 'Margen'], ['margenALaEliminacion', 'Margen a la eliminación'],
    ['supera', 'La estimación anterior'], ['maximoRegistrado', 'Máximo registrado'], ['condiciones', 'Condiciones'], ['aviso', 'Aviso'],
    ['protocolo', 'Protocolo'], ['urgente', 'Lo urgente']];
  function textosMarca(k) {
    var MA = P.marcasActuales || {};
    var o = k === 'mil' ? MA.mil_metros : k === 'dom' ? MA.dominadas : MA.circuito;
    if (!o) return '';
    var dl = TEXTOS_MARCA.filter(function (x) { return typeof o[x[0]] === 'string' && !(k === 'cir' && x[0] === 'marca') && !(k === 'mil' && x[0] === 'marca'); })
      .map(function (x) { return '<dt>' + esc(x[1]) + '</dt><dd>' + esc(o[x[0]]) + '</dd>'; }).join('');
    return dl ? '<dl class="mc-txt">' + dl + '</dl>' : '';
  }

  function pintarNota(sec) {
    var h = [];
    h.push('<article class="card mc-nc">');
    h.push('<h2 class="mc-nc-t">' + esc(tituloReal()) + '</h2>');
    h.push('<div class="mc-est"><div class="stat hero"><b class="num" data-m="media"></b><span data-m="estado"></span></div>' +
      '<div class="mc-est-r"><span class="chip" data-m="res"></span><span class="chip sup" data-m="sim" hidden></span>' +
      '<button type="button" class="btn sec" data-m="volver" hidden>Volver a hoy</button></div></div>');
    if (P.objetivo && P.objetivo.reglaDeNota) h.push('<p class="mc-regla">' + esc(P.objetivo.reglaDeNota) + '</p>');
    h.push('<div class="mc-g1" data-m="g1"></div>');
    h.push('<div class="chips mc-escs" role="group" aria-label="Escenarios del plan">' + ESC.map(function (x) {
      return '<button type="button" class="chip" aria-pressed="false" data-esc="' + x.i + '">' + esc(x.corto) + '</button>';
    }).join('') + '</div>');
    h.push('<div class="mc-esct" data-m="esct" aria-live="polite"></div>');
    h.push('<div class="mc-filas">');
    ORDEN.forEach(function (k) {
      h.push(filaHtml(k));
      if (k === 'cir') h.push(avisosHtml('marcas'));
    });
    h.push('</div>');
    h.push(sensibilidadHtml());
    h.push(diagnosticoHtml());
    h.push(baremoHtml());
    h.push('</article>');
    sec.innerHTML = h.join('');
    enlazarNota(sec);
    actualizar();
  }
  function avisosHtml(donde) {
    return PC.web.avisos(donde).map(function (a) {
      return '<div class="aviso ' + esc(a.tono || 'warn') + ' mc-aviso" role="note" data-inv="H11">' + PC.icon('alerta') + '<div>' +
        (a.titulo ? '<b>' + esc(a.titulo) + '</b> ' : '') + esc(a.texto || '') +
        (a.hasta ? '<small>hasta el ' + esc(dm(a.hasta)) + '</small>' : '') + '</div></div>';
    }).join('');
  }
  function sensibilidadHtml() {
    var S = P.sensibilidad; if (!S) return '';
    var h = '';
    if (S.peorCasoQueTumba) h += '<p class="mc-peor">' + PC.icon('alerta', 'sm') + '<span>' + esc(S.peorCasoQueTumba) + '</span></p>';
    var d = '';
    if (S.nota) d += '<p>' + esc(S.nota) + '</p>';
    if (lista(S.circuito).length) {
      d += '<h4 class="mc-h4">Circuito</h4><dl class="kv mc-sens">' + S.circuito.map(function (r) {
        return '<dt>' + esc(num(r.seg, 1) + ' s') + ' →</dt><dd>' + esc(num(r.media, 2)) + (r.nota ? ' · ' + esc(minus(r.nota)) : '') + '</dd>';
      }).join('') + '</dl>';
    }
    if (lista(S.dominadas).length) {
      d += '<h4 class="mc-h4">Dominadas</h4><dl class="kv mc-sens">' + S.dominadas.map(function (r) {
        return '<dt>' + esc(String(r.reps)) + ' →</dt><dd>' + esc(num(r.media, 2)) + (r.nota ? ' · ' + esc(minus(r.nota)) : '') + '</dd>';
      }).join('') + '</dl>';
    }
    if (S.riesgoRealDeLasDominadas) d += '<p>' + esc(S.riesgoRealDeLasDominadas) + ' <a href="#tecnica/dominada">Contar válidas →</a></p>';
    var C = S.cuestaCadaPunto;
    if (C) {
      var ET = { circuito: 'Circuito', dominadas: 'Dominadas', kilometro: 'Kilómetro' };
      d += '<h4 class="mc-h4">Cuánto cuesta cada punto</h4><dl class="mc-txt">' + Object.keys(C).map(function (k) {
        return '<dt>' + esc(ET[k] || cap(k)) + '</dt><dd>' + esc(C[k]) + '</dd>';
      }).join('') + '</dl>';
    }
    return h + acc('Cuánto aguanta el escenario realista', d, 'mc-sensib');
  }
  function diagnosticoHtml() {
    var G = P.diagnostico; if (!G || !G.resumen) return '';
    var resto = restoFrase(G.resumen), d = '';
    if (resto) d += '<p>' + esc(resto) + '</p>';
    var L = [['limitanteEspecifico', 'Lo que limita'], ['termometro', 'Termómetro'], ['focoCargaGarmin', 'Foco de carga, según el plan']];
    var dl = L.filter(function (x) { return G[x[0]]; }).map(function (x) { return '<dt>' + x[1] + '</dt><dd>' + esc(G[x[0]]) + '</dd>'; }).join('');
    if (dl) d += '<dl class="mc-txt">' + dl + '</dl>';
    var ult = ultimaCarga();
    if (ult) d += '<p class="mc-nota-pie">Última lectura del reloj: «' + esc(ult.focoCarga) + '» (' + esc(corta(ult.fecha)) + ') · <a href="#marcas/graficas/carga">Carga →</a></p>';
    return '<div class="mc-diag"><h3 class="mc-h3">El diagnóstico</h3><p class="mc-diag-1">' + esc(primeraFrase(G.resumen)) + '</p>' +
      (d ? acc('El resto del diagnóstico', d, '') : '') + '</div>';
  }
  function baremoHtml() {
    var B = P.baremo; if (!B) return '';
    var fil = {};
    function rangoT(txt) { return String(txt).replace(/(\d)-(\d)/g, '$1–$2'); }
    lista(B.mil_metros).forEach(function (t) {
      var txt = t.hasta ? (seg(t.desde) === 0 ? t.hasta + ' o menos' : t.desde + '–' + t.hasta) : t.desde + ' o más';
      (fil[t.puntos] = fil[t.puntos] || {}).mil = { txt: txt, elim: !!t.elimina };
    });
    lista(B.dominadas).forEach(function (t) { (fil[t.puntos] = fil[t.puntos] || {}).dom = { txt: rangoT(t.reps) }; });
    lista(B.circuito_agilidad).forEach(function (t) { (fil[t.puntos] = fil[t.puntos] || {}).cir = { txt: rangoT(t.seg) }; });
    var ps = Object.keys(fil).map(Number).sort(function (a, b) { return b - a; });
    var fuente = String(B.fuente || '');
    var mB = /(BOE-[A-Z]-\d{4}-\d+)/.exec(fuente), mV = /verificado el (\d{1,2}-\d{1,2})/.exec(fuente);
    var chip = mB ? '<span class="chip">' + esc(mB[1] + (mV ? ' · verificado el ' + mV[1] : '')) + '</span>' : '';
    var tb = ps.map(function (p) {
      var f = fil[p], cel = function (c, u) { return c ? '<td' + (u && c.elim ? ' class="mc-td-elim" data-umbral="229"' : (p === 0 ? ' class="mc-td-elim"' : '')) + '>' + esc(c.txt) + '</td>' : '<td></td>'; };
      return '<tr><th scope="row">' + p + '</th>' + cel(f.mil, true) + cel(f.dom) + cel(f.cir) + '</tr>';
    }).join('');
    var d = '<p class="chips">' + chip + '</p>' +
      '<div class="tscroll"><table class="t mc-baremo"><thead><tr><th scope="col">Puntos</th><th scope="col">1.000 m</th><th scope="col">Dominadas</th><th scope="col">Circuito (s)</th></tr></thead><tbody>' + tb + '</tbody></table></div>';
    return acc('Baremo completo, hombres', d, 'mc-bar');
  }

  function enlazarNota(sec) {
    PC.$$('.mc-escs [data-esc]', sec).forEach(function (b) {
      b.addEventListener('click', function () {
        var x = ESC[+b.getAttribute('data-esc')]; if (!x) return;
        ST.base = igualV(x.v, REAL) ? 'hoy' : 'esc' + x.i;
        ST.v = { mil: x.v.mil, dom: x.v.dom, cir: x.v.cir };
        recalcEstado(); actualizar();
      });
    });
    var volver = sec.querySelector('[data-m="volver"]');
    volver.addEventListener('click', function () {
      ST.base = 'hoy'; ST.v = { mil: REAL.mil, dom: REAL.dom, cir: REAL.cir };
      recalcEstado(); actualizar();
      var c = sec.querySelector('.mc-escs [aria-pressed="true"]'); if (c) c.focus();
    });
    PC.$$('.mc-fila', sec).forEach(function (f) {
      var k = f.getAttribute('data-k'), inp = f.querySelector('.mc-rango');
      inp.addEventListener('input', function () {
        ST.v[k] = PR[k].v2s(+inp.value);
        recalcEstado(); actualizar(k);
      });
      var det = f.querySelector('[data-f="det"]');
      det.addEventListener('toggle', function () { if (det.open) escena(f, k); });
    });
  }
  function escena(fila, k) {
    var host = fila.querySelector('[data-f="escena"]');
    if (!host || !PC.ill) return;
    var v = ST.v[k], real = esReal() && Math.abs(v - REAL[k]) < 1e-6;   /* escenario o simulado: en contorno */
    try {
      if (k === 'mil' && PC.ill.pista1000) PC.ill.pista1000(host, { s: v, real: real });
      else if (k === 'dom' && PC.ill.barra) PC.ill.barra(host, { reps: v, validado: real && /v[ií]deo|v[aá]lid/.test(FIAB.dom || ''), real: real });
      else if (k === 'cir' && PC.ill.valla) {
        var medido = FIAB.cir === 'medido';
        PC.ill.valla(host, { t: v, real: real && medido, medido: medido ? REAL.cir : null, etiqueta: real ? (medido ? '' : FIAB.cir) : 'simulado' });
      }
    } catch (e) { PC._err('marcas escena', e); }
  }
  function actualizar(fuente) {
    var sec = raiz && raiz.querySelector('#mc-nota'); if (!sec) return;
    var n = notaDe(ST.v), real = ST.estado === 'hoy';
    var media = real ? NR.media : n.media, res = real ? NR.txt : n.txt;
    var q = function (s) { return sec.querySelector(s); };
    q('[data-m="media"]').textContent = num(media, 2);
    var iEsc = ST.estado.indexOf('esc') === 0 ? +ST.estado.slice(3) : -1;
    if (real) ESC.forEach(function (x) { if (iEsc < 0 && igualV(x.v, REAL)) iEsc = x.i; });
    q('[data-m="estado"]').textContent = real ? 'media · Marcas de hoy' : ST.estado === 'sim' ? 'media · Simulado' : 'media · ' + ESC[iEsc].corto;
    var cr = q('[data-m="res"]'); cr.textContent = res; cr.className = 'chip ' + clsRes(res);
    var cs = q('[data-m="sim"]');
    cs.hidden = real; cs.textContent = ST.estado === 'sim' ? 'simulado' : 'supuesto';
    q('[data-m="volver"]').hidden = real;
    PC.$$('.mc-escs [data-esc]', sec).forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-esc') === iEsc && ST.estado !== 'sim' ? 'true' : 'false'); });
    /* texto del escenario elegido */
    var et = q('[data-m="esct"]');
    if (ST.estado !== 'sim' && iEsc >= 0) {
      var e = ESC[iEsc].e, txt = e.nota || e.razon || '';
      et.innerHTML = '<p class="mc-esc-p"><b>' + esc(e.nombre) + '</b>' + (txt ? ' · ' + esc(txt) : '') + '</p>' +
        (e.porQueNoEsEstancamiento ? porQue('<p>' + esc(e.porQueNoEsEstancamiento) + '</p>') : '');
    } else et.innerHTML = '';
    /* G1 */
    var escM = ESC.filter(function (x) { return !igualV(x.v, REAL); }).map(function (x) { return notaDe(x.v).media; });
    PC.graf.notaPista(q('[data-m="g1"]'), { media: media, real: real, medido: !ORDEN.some(fiabHueca), resultado: res, mediaReal: NR.media, escenarios: escM, eliminaPor: quienElimina(n.pts) });
    /* filas */
    ORDEN.forEach(function (k) {
      var f = sec.querySelector('.mc-fila[data-k="' + k + '"]'), R = PR[k], v = ST.v[k], p = n.pts[k];
      var esRealK = Math.abs(v - REAL[k]) < 1e-6;
      f.querySelector('[data-f="val"]').textContent = R.txt(v);
      var cp = f.querySelector('[data-f="pts"]');
      cp.textContent = p === 0 ? '0 pts · elimina' : ptsTxt(p); cp.className = 'chip' + (p === 0 ? ' bad' : '');
      var cf = f.querySelector('[data-f="fiab"]');
      if (esRealK) { cf.textContent = FIAB[k] || ''; cf.className = 'chip' + (fiabHueca(k) ? ' sup' : ''); cf.hidden = !FIAB[k]; }
      else { cf.textContent = ST.estado === 'sim' ? 'simulado' : 'supuesto'; cf.className = 'chip sup'; cf.hidden = false; }
      var inp = f.querySelector('.mc-rango');
      if (fuente !== k) inp.value = clampV(k, R.s2v(v));
      inp.setAttribute('aria-valuetext', R.txt(v) + ', ' + (p === 1 ? '1 punto' : p + ' puntos') + (p === 0 ? ', elimina' : ''));
      var c = corteVivo(k, ST.v), cm = f.querySelector('[data-f="cmark"]');
      f.querySelector('[data-f="corte"]').textContent = c.txt;
      f.querySelector('.mc-ct').className = 'mc-ct ' + c.tipo;
      if (c.tipo === 'marca') { cm.hidden = false; cm.style.left = pct((clampV(k, R.s2v(c.s)) - 0.5) / R.N); }
      else cm.hidden = true;
      var sg = PC.baremo.siguiente(k, v);
      f.querySelector('[data-f="sig"]').textContent = sg ? 'siguiente punto: ' + R.sig(sg) : 'el máximo del baremo: 10 puntos';
      var det = f.querySelector('[data-f="det"]'); if (det.open) escena(f, k);
    });
  }

  /* ------------------------------------------------------------------ piezas comunes de las gráficas */
  function figura(id, titulo, sub, inv) {
    return '<figure class="chart mc-fig" id="' + id + '"' + (inv ? ' data-inv="' + inv + '"' : '') + ' role="group" aria-labelledby="' + id + '-t">' +
      '<figcaption class="chart-h"><h3 id="' + id + '-t">' + esc(titulo) + '</h3>' + (sub ? '<small>' + sub + '</small>' : '') + '</figcaption>' +
      '<div class="chart-c"></div></figure>';
  }
  function larga(filas, j) { return filas.some(function (f) { return String(f[j] == null ? '' : f[j]).length > 28; }); }
  function tablaDatos(fig, tablas) {
    var viejo = fig.querySelector('details.acc.datos'); if (viejo) viejo.remove();
    var h = tablas.map(function (t) {
      return (t.titulo ? '<p class="mc-tt">' + esc(t.titulo) + '</p>' : '') + '<div class="tscroll"><table class="t"><thead><tr>' +
        t.cab.map(function (c) { return '<th scope="col">' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        t.filas.map(function (f) { return '<tr>' + f.map(function (c, j) { return larga(t.filas, j) ? '<td class="mc-larga"><span>' + esc(c == null ? '' : c) + '</span></td>' : '<td>' + esc(c == null ? '' : c) + '</td>'; }).join('') + '</tr>'; }).join('') +
        '</tbody></table></div>';
    }).join('');
    var d = el('details', { 'class': 'acc datos' }, '<summary>Ver datos' + PC.icon('chev', 'sm chev') + '</summary><div class="in">' + h + '</div>');
    fig.appendChild(d);
    return d;
  }
  function leyenda(fig, items) {
    var l = fig.querySelector('.legend');
    if (!items || !items.length) { if (l) l.remove(); return; }
    if (!l) { l = el('div', { 'class': 'legend' }); fig.insertBefore(l, fig.querySelector('.chart-c').nextSibling); }
    l.innerHTML = items.map(function (x) { return '<span><i class="' + x[0] + '"></i>' + esc(x[1]) + '</span>'; }).join('');
  }
  function tx(g, x, y, txt, cls, anchor, attrs) {
    var e = svgEl('text', { x: (+x).toFixed(1), y: (+y).toFixed(1), 'class': cls || null, 'text-anchor': anchor || null, text: txt }, g);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }
  function hl(g, y, x1, cls) { return svgEl('line', { x1: 0, x2: x1, y1: y.toFixed(1), y2: y.toFixed(1), 'class': cls }, g); }
  function punto(g, x, y, cls, r) { return svgEl('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: r || 5, 'class': 'mc-pt ' + (cls || '') }, g); }
  /* rótulos en fila sin montarse (filas: y de cada fila) */
  function colocar(g, items, filas, xmax) {
    var ocup = filas.map(function () { return []; });
    items.sort(function (a, b) { return a.x - b.x; }).forEach(function (it) {
      var w = it.txt.length * 6.6 + 6;
      if (xmax) it.x = Math.max(w / 2, Math.min(xmax - w / 2, it.x));
      var x0 = it.x - w / 2, x1 = it.x + w / 2;
      for (var f = 0; f < filas.length; f++) {
        if (ocup[f].every(function (o) { return x1 < o[0] || x0 > o[1]; })) { ocup[f].push([x0, x1]); tx(g, it.x, filas[f], it.txt, it.cls, 'middle'); return; }
      }
    });
  }
  function yTiempos(ctx, a, b) { return PC.chart.lineal(a, b, 0, ctx.ih); }
  function rangoTxt(t) {                 /* "3:48-3:56" → [228, 236] · "≈4:00" → [240, 240] */
    var ts = String(t || '').match(/\d:\d{2}(?:,\d)?/g) || [];
    var v = ts.map(function (x) { return fmt.parseT(x); }).filter(function (x) { return x !== null; });
    return v.length ? [Math.min.apply(null, v), Math.max.apply(null, v)] : null;
  }
  function primerTiempo(t) { var m = /\d:\d{2}(?:,\d)?/.exec(String(t || '')); return m ? fmt.parseT(m[0]) : null; }   /* el primero que aparece en el texto */
  var REF200 = (function () { var r = ((P.planDeCarrera || {}).examen || {}).reparto; return r && r['200'] ? fmt.parseT(r['200']) : null; })();
  var ELIM200 = Math.round(ELIM / 5 * 10) / 10;            /* 45,8 s por 200: el ritmo del 3:49 */

  /* ------------------------------------------------------------------ M-2 · controles */
  var CT = lista(DV.controles);
  function evolDe(fecha) { var r = null; lista(H.evolucionEstimacion).forEach(function (e) { if (e.fecha === fecha) r = e; }); return r; }
  function hecho(c) { return !!(c.hist && histDe(String(c.hist).split(':')[0], c.fecha)); }
  function tramosDe(r) {
    if (!r) return null;
    var p = r.parciales200;
    if (p && Array.isArray(p.tramosS)) return p.tramosS.map(Number);
    if (Array.isArray(p) && p.length && !Array.isArray(p[0])) return p.map(function (x) { return +String(x).replace(',', '.'); });
    return null;
  }
  function tiraHtml(tramos, ref, titulo, acumulado, sinDif) {
    if (!tramos || !tramos.length) return '';
    var celdas = tramos.map(function (t, i) {
      var d = ref === null || sinDif ? null : Math.round((t - ref) * 10) / 10;
      var cls = d === null ? '' : d > 0 ? ' lenta' : ' ok';
      return '<div class="mc-p' + cls + '"><small>' + (acumulado ? esc(acumulado[i]) : ((i + 1) * 200 === 1000 ? '1.000' : (i + 1) * 200)) + '</small><b class="num">' + esc(num(t, 1)) + '</b>' +
        (d === null ? '' : '<small class="num">' + esc(dif(d, 1)) + '</small>') + '</div>';
    }).join('');
    return '<div class="mc-tira-w">' + (titulo ? '<p class="mc-tira-t">' + esc(titulo) + (ref !== null && !sinDif ? ' · frente a ' + esc(num(ref, 1)) + ' s por 200' : '') + '</p>' : '') +
      '<div class="mc-tira">' + celdas + '<div class="mc-p mc-ref" data-umbral="229"><b class="num">' + esc(num(ELIM200, 1)) + '</b><small>ritmo del 3:49</small></div></div></div>';
  }
  function cifrasHtml(c) {
    var src = String(c.hist).split(':'), e = histDe(src[0], c.fecha) || {}, r = e.resultado || {};
    var ev = evolDe(c.fecha), cif = [];
    var t = ev && ev.medido ? ev.estimacion : (r.tiempo || null);
    if (t) cif.push([t, (c.extra ? c.titulo : '1.000 m') + (ev && ev.banda ? ' · banda ' + ev.banda.join('–') : '')]);
    if (c.histDom) {
      var dd = histDe('dominadas', String(c.histDom).split(':')[1]);
      if (dd && dd.maximo != null) cif.push([String(dd.maximo), 'dominadas' + (M.dom && M.dom.fecha === dd.fecha && M.dom.fiab ? ' · ' + M.dom.fiab : '')]);
    }
    if (r.fcMax) cif.push([String(r.fcMax), 'FC máx (ppm)']);
    if (cif.length < 3 && r.fcMedia) cif.push([String(r.fcMedia), 'FC media (ppm)']);
    return '<div class="stats mc-cif">' + cif.slice(0, 3).map(function (x) { return '<div class="stat"><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></div>'; }).join('') + '</div>';
  }
  function pasosObjetivo(txt) {        /* "(0:42 / 1:24 / 2:06 / 2:48)" → tramos de 200 */
    var m = /(\d:\d{2}(?:,\d)?(?:\s*\/\s*\d:\d{2}(?:,\d)?){2,})/.exec(String(txt || ''));
    if (!m) return null;
    var ac = m[1].split('/').map(function (x) { return fmt.parseT(x.trim()); });
    if (ac.some(function (x) { return x === null; })) return null;
    return { pasos: m[1].split('/').map(function (x) { return x.trim(); }), tramos: ac.map(function (v, i) { return Math.round((v - (i ? ac[i - 1] : 0)) * 10) / 10; }) };
  }
  function pasosDe(arr) {              /* ['0:42','1:24','2:06','2:48'] → tramos de 200 */
    var ac = arr.map(function (x) { return fmt.parseT(x); });
    if (ac.some(function (x) { return x === null; })) return null;
    return { pasos: arr.slice(), tramos: ac.map(function (v, i) { return Math.round((v - (i ? ac[i - 1] : 0)) * 10) / 10; }) };
  }
  function controlHtml(c, hoy) {
    var h = [], dia = c.ref ? PC.cal.dia(c.fecha) : null, ok = hecho(c);
    var cls = (c.fecha === hoy || (c.hasta && c.fecha <= hoy && hoy <= c.hasta)) ? 'hoy' : ok ? 'hecho' : (c.hasta || c.fecha) < hoy ? '' : 'futuro';
    var fechaT = c.hasta ? dm(c.fecha).split('-')[0] + '–' + dm(c.hasta) : corta(c.fecha);
    h.push('<li class="' + cls + '"><span class="dot" aria-hidden="true"></span><b>' + esc(fechaT + ' · ' + (c.titulo || 'Control')) + '</b>');
    if (ok) {
      var e = histDe(String(c.hist).split(':')[0], c.fecha) || {};
      h.push(cifrasHtml(c));
      h.push(tiraHtml(tramosDe(e.resultado), REF200, 'Parciales de 200'));
      var ev = evolDe(c.fecha), cambio = c.queCambio || (ev && ev.motivo);
      if (cambio) h.push('<p class="mc-cambio"><span>Qué cambió</span> ' + esc(cambio) + '</p>');
      var dg = (WJ.textos || {})['diag' + (+c.fecha.slice(8, 10))];
      if (dg && e.resultado && tramosDe(e.resultado)) {
        var L = [['salida', 'La salida'], ['debil', 'Por qué te sentiste débil'], ['recuperacion', 'Recuperación'], ['tramos', 'Los tramos']];
        var txt = L.filter(function (x) { return dg[x[0]]; }).map(function (x) { return '<dt>' + x[1] + '</dt><dd>' + esc(dg[x[0]]) + '</dd>'; }).join('');
        h.push(acc('Diagnóstico del control', figura('g-tramos', 'Tramos del control', 'Tiempo de cada 200 frente a ' + num(REF200, 1) + ' s; debajo, pulso y potencia. Toca un tramo.') +
          '<dl class="mc-txt">' + txt + '</dl>', 'mc-diag19" data-fecha="' + c.fecha));
      }
    } else if (c.prueba) {
      var PF = (P.objetivo || {}).pruebasFisicas || {}, EX = (P.planDeCarrera || {}).examen || {};
      if (PF.lugar || PF.fecha) h.push('<p>' + esc([PF.lugar, PF.fecha].filter(Boolean).join(' · ')) + '</p>');
      if (EX.orden) h.push('<p class="mc-sub">Orden: ' + esc(EX.orden) + '</p>');
      if (EX.pendiente) h.push('<p class="mc-sub">' + esc(EX.pendiente) + '</p>');
    } else if (dia) {
      var pr = dia.principal || null, nums = lista(dia.numeros);
      if (nums.length) h.push('<div class="stats mc-cif">' + nums.slice(0, 3).map(function (x) { return '<div class="stat"><b>' + esc(x.v) + '</b><span>' + esc(x.l) + '</span></div>'; }).join('') + '</div>');
      if (dia.objetivo) h.push('<p class="mc-obj"><span class="chip">objetivo</span> ' + esc(dia.objetivo) + '</p>');
      var rep = pr && pr.repartos && lista(pr.repartos.objetivo).length ? pasosDe(pr.repartos.objetivo) : null;
      var po = rep || pasosObjetivo(dia.objetivo);
      if (po) h.push(tiraHtml(po.tramos, REF200, 'Reparto del día: paso por cada 200 y tramo', po.pasos, true));
      var ex = [];
      if (pr && pr.primer200) ex.push('primer 200 entre ' + String(pr.primer200).replace('-', ' y '));
      if (pr && pr.aviso) ex.push('aviso de ritmo ' + String(pr.aviso).replace('-', '–'));
      if (pr && pr.meta) ex.push('meta ' + String(pr.meta).replace('-', '–'));
      if (ex.length) h.push('<p class="mc-sub">' + esc(cap(ex.join(' · '))) + '</p>');
      if (dia.sesion) h.push('<p class="mc-sub">' + esc(dia.sesion) + '</p>');
      if (c.circuitoDia) h.push('<p class="mc-sub">Circuito: ' + esc(corta(c.circuitoDia)) + '</p>');
      h.push('<p><a href="#plan/' + c.fecha + '">' + (dia.decide ? 'Qué decide →' : 'El día en Plan →') + '</a></p>');
    } else if ((c.hasta || c.fecha) < hoy) h.push('<p class="mc-sub">Sin registrar</p>');
    h.push('</li>');
    return h.join('');
  }
  function pintarControles(sec) {
    var hoy = PC.hoyIso();
    var hechos = CT.filter(hecho), ult = null;
    hechos.forEach(function (c) { var ev = evolDe(c.fecha); if (ev && ev.medido) ult = { c: c, t: ev.estimacion }; });
    var sig = CT.filter(function (c) { return !hecho(c) && c.fecha >= hoy; })[0];
    var tit = (ult ? 'Último control del 1.000: ' + ult.t + ' el ' + corta(ult.c.fecha) : 'Controles') + (sig ? ' · siguiente: ' + (sig.hasta ? dm(sig.fecha) + ' a ' + dm(sig.hasta) : corta(sig.fecha)) : '');
    var h = [];
    h.push('<header class="section-t mc-st"><h2 id="mc-controles-t">' + esc(tit) + '</h2></header>');
    h.push('<div class="card mc-card">');
    h.push('<div class="chips mc-tog"><button type="button" class="chip" aria-pressed="false" data-t="est">Ver estimaciones</button>' +
      (lista(DV.perfiles).length ? '<button type="button" class="chip" aria-pressed="false" data-t="perf">Superponer perfiles</button>' : '') + '</div>');
    h.push(figura('g-mil', 'El 1.000, control a control', 'Relleno: medido. Franjas: puntos del baremo. Toca un punto.'));
    h.push('<div data-m="perf" hidden>' + figura('g-perfil', 'Perfil por 200 m', 'Segundos de cada 200. Toca un tramo.') + '</div>');
    h.push('</div>');
    h.push('<div class="card mc-card"><ol class="tl mc-tl">' + CT.map(function (c) { return controlHtml(c, hoy); }).join('') + '</ol>');
    var g9 = (WJ.textos || {}).G9;
    if (g9) h.push('<p class="mc-comp"><b>Lo que hace comparables dos controles.</b> ' + esc(g9) + '</p>');
    h.push('</div>');
    sec.innerHTML = h.join('');
    var fig = sec.querySelector('#g-mil'), bEst = sec.querySelector('[data-t="est"]'), bPerf = sec.querySelector('[data-t="perf"]');
    fig.insertBefore(sec.querySelector('.mc-tog'), fig.querySelector('.chart-c'));
    var verEst = false;
    montar(fig.querySelector('.chart-c'), function () { g3(fig, verEst); });
    bEst.addEventListener('click', function () {
      verEst = !verEst; bEst.setAttribute('aria-pressed', verEst ? 'true' : 'false'); g3(fig, verEst);
    });
    if (bPerf) bPerf.addEventListener('click', function () {
      var box = sec.querySelector('[data-m="perf"]'), on = box.hidden;
      box.hidden = !on; bPerf.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) { var f2 = box.querySelector('#g-perfil'); montar(f2.querySelector('.chart-c'), function () { g3b(f2); }); }
    });
    PC.$$('details.mc-diag19', sec).forEach(function (d) {
      var f = d.querySelector('#g-tramos'), e = histDe('carrera', d.getAttribute('data-fecha'));
      function go() { if (d.open) montar(f.querySelector('.chart-c'), function () { g12(f, e); }); }
      d.addEventListener('toggle', go); go();
    });
  }

  /* G3 · evolución del 1.000 */
  function g3(fig, verEst) {
    var host = fig.querySelector('.chart-c'); if (!host.clientWidth) return;
    var ctx = PC.chart.base(fig, { h: host.clientWidth < 480 ? 262 : 290, m: { t: 38, r: 46, b: 28, l: 40 } });
    var EV = lista(H.evolucionEstimacion).slice().sort(ordenFecha);
    var fechas = EV.map(function (e) { return e.fecha; }).concat(CT.map(function (c) { return c.fecha; })).sort();
    var x0 = fechas[0], x1 = (DV.ventanaPrueba && DV.ventanaPrueba.hasta) || fechas[fechas.length - 1];
    var fx = PC.chart.tiempo(x0, x1, 6, ctx.iw - 6), Y0 = 190, Y1 = 265, fy = yTiempos(ctx, Y0, Y1), g = ctx.g;
    /* franjas del baremo, con sus puntos a la derecha */
    var bandas = svgEl('g', { 'class': 'mc-bandas' }, g), prev = Y0;
    BT.mil.slice().sort(function (a, b) { return b.pts - a.pts; }).forEach(function (t) {
      var top = Math.max(Y0, t.pts === 0 ? t.min : prev), bot = t.max === null ? Y1 : Math.min(Y1, t.max);
      if (t.max !== null) prev = t.max;
      if (bot <= Y0 || top >= Y1 || bot <= top) return;
      var y0 = fy(top), y1 = fy(bot);
      svgEl('rect', { x: 0, y: y0.toFixed(1), width: ctx.iw, height: (y1 - y0).toFixed(1), 'class': 'mc-band ' + (t.pts === 0 ? 'mc-band-elim' : 'mc-band-' + (t.pts % 2 ? 'i' : 'p')) }, bandas);
      if (y1 - y0 >= 12) tx(bandas, ctx.iw + 6, (y0 + y1) / 2 + 4, String(t.pts), 'mc-bpts');
    });
    tx(g, ctx.iw + 6, ctx.ih + 18, 'pts', 'mc-bpts');
    PC.chart.ejeY(ctx, fy, [195, 210, 225, 240, 255], function (v) { return mmss(v); });
    PC.chart.ejeFechas(ctx, fx, x0, x1);
    /* prueba y controles por venir */
    var hoy = PC.hoyIso(), rot = [];
    var VP = DV.ventanaPrueba;
    if (VP) {
      var xa = fx(VP.desde) - 3, xb = Math.min(ctx.iw, fx(VP.hasta) + 3);
      svgEl('rect', { x: xa.toFixed(1), y: 0, width: Math.max(4, xb - xa).toFixed(1), height: ctx.ih, 'class': 'mc-ventana' }, g);
      rot.push({ x: (xa + xb) / 2, txt: 'prueba', cls: 'mc-rot' });
    }
    CT.forEach(function (c) {
      if (c.prueba || hecho(c) || c.fecha < hoy || c.extra) return;
      var x = fx(c.fecha);
      svgEl('line', { x1: x.toFixed(1), x2: x.toFixed(1), y1: 0, y2: ctx.ih, 'class': 'mc-guia' }, g);
      punto(g, x, ctx.ih - 7, 'mc-hueco', 4.5);
      rot.push({ x: x, txt: minus(String(c.titulo || 'control').split(' o ')[0]).toLowerCase(), cls: 'mc-rot' });
    });
    colocar(g, rot, [-24, -10], ctx.iw + ctx.m.r - 4);
    /* referencias: objetivo, suelo y 3:49 */
    var obj = primerTiempo(((P.objetivo || {}).objetivoNuevo23sep || {}).mil), suelo = primerTiempo(((P.planDeCarrera || {}).examen || {}).suelo);
    if (obj !== null) { hl(g, fy(obj), ctx.iw, 'mc-l-obj'); tx(g, 4, fy(obj) - 4, mmss(obj) + ' objetivo', 'lab mc-t-ok'); }
    if (suelo !== null) { hl(g, fy(suelo), ctx.iw, 'mc-l-suelo'); tx(g, 4, fy(suelo) - 4, mmss(suelo) + ' suelo', 'mc-t-3'); }
    PC.chart.umbral1000(ctx, { y: fy(ELIM) });
    /* puntos */
    var pts = [], iDef = null;
    EV.forEach(function (e) {
      var r = e.medido ? (e.banda ? [fmt.parseT(e.banda[0]), fmt.parseT(e.banda[1])] : null) : rangoTxt(e.estimacion);
      var v = e.medido ? fmt.parseT(e.estimacion) : (r ? (r[0] + r[1]) / 2 : null);
      if (v === null || (!e.medido && !verEst)) return;
      var x = fx(e.fecha), nodos = [];
      if (r && r[1] > r[0]) nodos.push(svgEl('path', { d: 'M' + (x - 4).toFixed(1) + ' ' + fy(r[0]).toFixed(1) + 'h8M' + x.toFixed(1) + ' ' + fy(r[0]).toFixed(1) + 'V' + fy(r[1]).toFixed(1) + 'M' + (x - 4).toFixed(1) + ' ' + fy(r[1]).toFixed(1) + 'h8', 'class': e.medido ? 'mc-banda-m' : 'mc-banda-e' }, g));
      nodos.push(punto(g, x, fy(Math.min(Y1, v)), e.medido ? 'mc-s1' : 'mc-est'));
      var p = e.medido ? PC.baremo.pts('mil', v) : null;
      pts.push({ x: x, nodo: nodos, e: e, html: '<b>' + esc(corta(e.fecha) + ' · ' + e.estimacion) + '</b>' + (e.banda ? ' · banda ' + esc(e.banda.join('–')) : '') +
        (p !== null ? ' · ' + esc(ptsTxt(p)) : '') + ' · ' + (e.medido ? 'medido' : 'estimación') + '<br>' + esc(e.motivo || '') });
      if (e.medido) iDef = pts.length - 1;
    });
    if (iDef !== null) { var u = pts[iDef]; tx(g, u.x + 9, fy(fmt.parseT(u.e.estimacion)) + 4, u.e.estimacion, 'lab'); }
    PC.chart.seleccion(ctx, pts, iDef === null ? pts.length - 1 : iDef);
    leyenda(fig, verEst ? [['mc-lg-s1', 'medido'], ['mc-lg-est', 'estimación (hueca, con su rango)']] : null);
    var med = EV.filter(function (e) { return e.medido; }), um = med[med.length - 1];
    PC.chart.etiqueta(ctx, 'Evolución del 1.000 del ' + dm(x0) + ' a la prueba: ' + (um ? 'medido ' + um.estimacion + ' el ' + dm(um.fecha) + (um.banda ? ' (banda ' + um.banda.join('–') + ')' : '') : 'sin medición') +
      (obj !== null ? '; objetivo ' + mmss(obj) : '') + (suelo !== null ? '; suelo ' + mmss(suelo) : '') + '; 3:49 elimina' + (verEst ? '; con ' + (EV.length - med.length) + ' estimaciones' : '') + '.');
    tablaDatos(fig, [{ cab: ['Fecha', 'Valor', 'Tipo', 'Motivo'], filas: EV.map(function (e) { return [corta(e.fecha), e.estimacion + (e.banda ? ' (' + e.banda.join('–') + ')' : ''), e.medido ? 'medido' : 'estimación', e.motivo || '']; }) }]);
  }

  /* G3b · perfil por 200 m */
  function g3b(fig) {
    var host = fig.querySelector('.chart-c'); if (!host.clientWidth) return;
    var PF = lista(DV.perfiles);
    var ctx = PC.chart.base(fig, { h: 230, m: { t: 14, r: 14, b: 30, l: 40 } }), g = ctx.g;
    var fx = PC.chart.lineal(0, 4, 14, ctx.iw - 14), fy = yTiempos(ctx, 38, 48);
    PC.chart.ejeY(ctx, fy, [40, 42, 44, 46], function (v) { return v + ' s'; });
    var eje = svgEl('g', { 'class': 'eje-x' }, g);
    hl(eje, ctx.ih + 0.5, ctx.iw, 'eje');
    ['200', '400', '600', '800', '1.000'].forEach(function (t, i) { tx(eje, fx(i), ctx.ih + 18, t, null, 'middle'); });
    if (REF200 !== null) { hl(g, fy(REF200), ctx.iw, 'mc-l-obj'); tx(g, 4, fy(REF200) - 4, num(REF200, 1) + ' objetivo', 'lab mc-t-ok'); }
    var u3b = PC.chart.umbral1000(ctx, { y: fy(ELIM200), etiqueta: 'ritmo del 3:49 · ' + num(ELIM200, 1) + ' s' });
    var t3b = u3b && u3b.querySelector('text'); if (t3b) { t3b.setAttribute('x', 4); t3b.setAttribute('text-anchor', 'start'); t3b.setAttribute('y', (fy(ELIM200) + 15).toFixed(1)); }
    var nodos = [[], [], [], [], []];
    PF.forEach(function (p, j) {
      var ts = lista(p.tramosS), c = 'mc-s' + (j % 3 + 1);
      var d = ts.map(function (t, i) { return (i ? 'L' : 'M') + fx(i).toFixed(1) + ' ' + fy(Math.max(38, Math.min(48, t))).toFixed(1); }).join('');
      svgEl('path', { d: d, 'class': 'mc-linea ' + c }, g);
      ts.forEach(function (t, i) { nodos[i].push(punto(g, fx(i), fy(Math.max(38, Math.min(48, t))), c)); });
    });
    var puntos = [0, 1, 2, 3, 4].map(function (i) {
      var etq = ['0–200', '200–400', '400–600', '600–800', '800–1.000'][i];
      return { x: fx(i), nodo: nodos[i], html: '<b>Tramo ' + etq + '</b>' + PF.map(function (p) {
        var t = lista(p.tramosS)[i];
        return t == null ? '' : '<br>' + esc(p.etiqueta) + ': ' + esc(num(t, 1)) + ' s' + (REF200 !== null ? ' (' + esc(dif(t - REF200, 1)) + ')' : '');
      }).join('') };
    });
    PC.chart.seleccion(ctx, puntos, 2);
    leyenda(fig, PF.map(function (p, j) { return ['mc-lg-s' + (j % 3 + 1), p.etiqueta]; }));
    PC.chart.etiqueta(ctx, 'Perfil por 200 m: ' + PF.map(function (p) { return p.etiqueta + ' ' + lista(p.tramosS).map(function (t) { return num(t, 1); }).join(', '); }).join('; ') + '. Objetivo ' + num(REF200, 1) + ' s; ritmo del 3:49, ' + num(ELIM200, 1) + ' s.');
    tablaDatos(fig, [{ cab: ['Perfil'].concat(['200', '400', '600', '800', '1.000']), filas: PF.map(function (p) { return [p.etiqueta].concat([0, 1, 2, 3, 4].map(function (i) { var t = lista(p.tramosS)[i]; return t == null ? '' : num(t, 1); })); }) }]);
  }

  /* G12 · tramos del control (19-9) */
  function g12(fig, e) {
    var host = fig.querySelector('.chart-c'); if (!host.clientWidth || !e) return;
    var r = e.resultado || {}, T = tramosDe(r) || [], n = T.length;
    var FC = lista(r.fcPorTramo), PW = lista(r.potenciaPorTramoW);
    var alto = 130, fila = 50;
    var ctx = PC.chart.base(fig, { h: alto + 2 * fila + 44, m: { t: 14, r: 12, b: 30, l: 44 } }), g = ctx.g;
    var cw = ctx.iw / n, fxc = function (i) { return cw * (i + .5); };
    var lo = Math.min(38, Math.min.apply(null, T) - 1), hi = Math.max(48, Math.max.apply(null, T) + 1);
    var fy = PC.chart.lineal(lo, hi, 0, alto);
    PC.chart.ejeY({ g: g, iw: ctx.iw }, fy, [40, 42, 44, 46], function (v) { return v + ' s'; });
    var nod = [];
    T.forEach(function (t, i) {
      var y0 = fy(REF200), y1 = fy(t), bw = Math.min(34, cw * .56);
      var b = svgEl('rect', { x: (fxc(i) - bw / 2).toFixed(1), y: Math.min(y0, y1).toFixed(1), width: bw.toFixed(1), height: Math.max(2, Math.abs(y1 - y0)).toFixed(1), rx: 2, 'class': 'mc-bar ' + (t > REF200 ? 'lenta' : 'ok') }, g);
      tx(g, fxc(i), t > REF200 ? y1 + 14 : y1 - 5, num(t, 1), 'lab', 'middle');
      nod.push([b]);
    });
    hl(g, fy(REF200), ctx.iw, 'mc-l-obj'); tx(g, -6, fy(REF200) + 4, '', null, 'end');
    var u12 = PC.chart.umbral1000({ g: g, iw: ctx.iw, ih: alto }, { y: fy(ELIM200), etiqueta: 'ritmo del 3:49 · ' + num(ELIM200, 1) + ' s' });
    var t12 = u12 && u12.querySelector('text'); if (t12) { t12.setAttribute('x', 4); t12.setAttribute('text-anchor', 'start'); t12.setAttribute('y', (fy(ELIM200) + 15).toFixed(1)); }
    function filaPuntos(vals, y, etq, uni) {
      if (!vals.length) return;
      var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), gg = svgEl('g', { transform: 'translate(0,' + y + ')' }, g);
      hl(gg, fila - 8, ctx.iw, 'gl');
      tx(gg, -6, fila / 2 + 4, etq, 'lab', 'end');
      var yv = function (v) { return 34 - (mx === mn ? 10 : (v - mn) / (mx - mn) * 20); };
      svgEl('path', { d: vals.map(function (v, i) { return (i ? 'L' : 'M') + fxc(i).toFixed(1) + ' ' + yv(v).toFixed(1); }).join(''), 'class': 'mc-linea mc-s3 fina' }, gg);
      vals.forEach(function (v, i) { nod[i] && nod[i].push(punto(gg, fxc(i), yv(v), 'mc-s3', 4)); tx(gg, fxc(i), yv(v) - 8, String(v), null, 'middle'); });
    }
    filaPuntos(FC, alto + 8, 'FC', 'ppm');
    filaPuntos(PW, alto + 8 + fila, 'W', 'W');
    var ejeY = alto + 2 * fila + 22;
    T.forEach(function (t, i) { tx(g, fxc(i), ejeY, ['200', '400', '600', '800', '1.000'][i] || '', null, 'middle'); });
    var S = [['Tiempo (s)', T, 1], ['FC (ppm)', FC, 0], ['Potencia (W)', PW, 0], ['Contacto (ms)', lista(r.contactoSueloMs), 1], ['Cadencia', lista(r.cadenciaPorTramo), 1], ['Zancada (mm)', lista(r.zancadaMm), 1], ['Respiración (rpm)', lista(r.respiracionRpm), 1]];
    var puntos = T.map(function (t, i) {
      return { x: fxc(i), nodo: nod[i], html: '<b>Tramo ' + ['0–200', '200–400', '400–600', '600–800', '800–1.000'][i] + ': ' + esc(num(t, 1)) + ' s</b> (' + esc(dif(t - REF200, 1)) + ')<br>' +
        S.slice(1).filter(function (s) { return s[1][i] != null; }).map(function (s) { return esc(s[0] + ' ' + num(s[1][i], s[2] && s[1][i] % 1 ? 1 : 0)); }).join(' · ') };
    });
    PC.chart.seleccion(ctx, puntos, 3);
    PC.chart.etiqueta(ctx, 'Tramos del control del ' + dm(e.fecha) + ': ' + T.map(function (t) { return num(t, 1); }).join(', ') + ' s por 200 frente a ' + num(REF200, 1) + '; pulso ' + FC.join(', ') + '; potencia ' + PW.join(', ') + ' W.');
    var rec = r.recuperacionFC || {};
    tablaDatos(fig, [
      { cab: ['Dato'].concat(T.map(function (t, i) { return ['200', '400', '600', '800', '1.000'][i]; })), filas: S.filter(function (s) { return s[1].length; }).map(function (s) { return [s[0]].concat(s[1].map(function (v) { return num(v, s[2] && v % 1 ? 1 : 0); })); }) },
      { titulo: 'Recuperación de la FC tras la meta', cab: Object.keys(rec), filas: [Object.keys(rec).map(function (k) { return num(rec[k]) + ' ppm'; })] }
    ]);
  }

  /* ------------------------------------------------------------------ G5 · series de una sesión (también para Hoy) */
  function nocheDe(fecha) { var r = null; lista(DV.noches).forEach(function (n) { if (n.fecha === fecha) r = n; }); return r; }
  function motivoNoMide(s) {
    var n = nocheDe(s.fecha), cv = DV.cortesSueno || {};
    if (n && typeof n.min === 'number' && cv.verde && n.min < cv.verde) return 'no mide: ' + fmt.sueno(n.min) + ' de sueño';
    return 'no mide';
  }
  function normSesion(s) {
    s = s || {};
    var obj = typeof s.objetivo === 'number' ? s.objetivo : fmt.parseT(s.objetivo || (s.obj || ''));
    var reps = [];
    if (Array.isArray(s.tiemposS)) reps = s.tiemposS.map(function (t) { return { t: +t, cat: null }; });
    else if (Array.isArray(s.reps)) reps = s.reps.map(function (r) { return typeof r === 'number' ? { t: r, cat: null } : { t: r && r.t != null ? +r.t : null, cat: r ? (r.cat || null) : null }; });
    return { fecha: s.fecha || null, sesion: s.sesion || '', valida: s.valida, obj: obj, objTxt: s.objetivo || null, reps: reps, parciales: s.parciales || null, fcMax: s.fcMax || null };
  }
  PC.graf.series = function (host, sesion) {
    if (!host) return null;
    var fig = host.matches && host.matches('figure.chart') ? host : null;
    if (!fig) {
      host.innerHTML = '';
      fig = el('figure', { 'class': 'chart mc-fig mc-series', role: 'group' }, '<div class="chart-c"></div>');
      host.appendChild(fig);
    }
    if (!fig.querySelector('.chart-c')) fig.appendChild(el('div', { 'class': 'chart-c' }));
    fig.__serie = sesion;
    montar(fig.querySelector('.chart-c'), function () { g5(fig, fig.__serie); });
    return fig;
  };
  function g5(fig, sesion) {
    var host = fig.querySelector('.chart-c'); if (!host.clientWidth) return;
    var S = normSesion(sesion), n = S.reps.length;
    if (!n) { host.innerHTML = '<p class="empty">Sin repeticiones</p>'; return; }
    var conT = S.reps.filter(function (r) { return r.t !== null && !isNaN(r.t); }).map(function (r) { return r.t; });
    var w = host.clientWidth, estrecho = w < 420;
    var colP = S.parciales ? (estrecho ? 78 : 96) : 0, colF = S.fcMax ? 44 : 0, fila = 30;
    var ctx = PC.chart.base(fig, { h: n * fila + 40, m: { t: 26, r: 8 + colP + colF, b: 14, l: 30 } }), g = ctx.g;
    var o = S.obj, lo, hi;
    var vals = conT.concat(o !== null ? [o - 3, o + 3] : []);
    if (!vals.length) vals = [o || 0];
    lo = Math.min.apply(null, vals); hi = Math.max.apply(null, vals);
    var pad = Math.max(1.5, (hi - lo) * 0.12); lo -= pad; hi += pad;
    if (o !== null && conT.length === 0) { lo = o - 7; hi = o + 7; }
    var fx = PC.chart.lineal(lo, hi, 0, ctx.iw), fyc = function (i) { return fila * (i + .5); };
    if (o !== null) {
      svgEl('rect', { x: fx(o - 3).toFixed(1), y: 0, width: (fx(o + 3) - fx(o - 3)).toFixed(1), height: n * fila, 'class': 'mc-franja' }, g);
      svgEl('line', { x1: fx(o).toFixed(1), x2: fx(o).toFixed(1), y1: -4, y2: n * fila, 'class': 'mc-l-obj' }, g);
      tx(g, fx(o), -10, (S.objTxt || mmss(o)) + ' ± 3 s', 'lab mc-t-ok', 'middle');
    }
    if (S.parciales) tx(g, ctx.iw + 10, -10, 'parciales', 'mc-t-3');
    if (S.fcMax) tx(g, ctx.iw + colP + colF, -10, 'FC máx', 'mc-t-3', 'end');
    var puntos = [], sinTiempo = { dentro: 0, lenta: 4.5, rapida: -4.5 };
    S.reps.forEach(function (r, i) {
      var y = fyc(i), nodos = [];
      hl(g, y + fila / 2, ctx.iw, 'gl');
      tx(g, -8, y + 4, String(i + 1), null, 'end');
      var t = r.t, hueco = t === null || isNaN(t);
      var xv = hueco ? (o !== null && r.cat && sinTiempo[r.cat] !== undefined ? fx(o + sinTiempo[r.cat]) : null) : fx(Math.max(lo, Math.min(hi, t)));
      if (xv !== null) {
        var d = !hueco && o !== null ? t - o : null;
        var fuera = d !== null && Math.abs(d) > 3 + 1e-9;
        nodos.push(punto(g, xv, y, hueco ? 'mc-hueco' : fuera ? 'mc-fuera' : 'mc-s1'));
        if (!hueco) tx(g, xv, y - 8 < 6 ? y + 16 : y - 8, (d === null ? mmss(t) : dif(d, 1)), 'mc-t-2', 'middle');
      }
      if (S.parciales && S.parciales[i]) tx(g, ctx.iw + 10, y + 4, S.parciales[i].map(function (x) { return num(x, 1); }).join(' + '), 'num');
      if (S.fcMax && S.fcMax[i] != null) tx(g, ctx.iw + colP + colF, y + 4, String(S.fcMax[i]), 'num', 'end');
      puntos.push({ y: y, nodo: nodos, html: '<b>Repetición ' + (i + 1) + (hueco ? '' : ': ' + esc(mmss(t)) + (t < 60 ? ' s' : '')) + '</b>' +
        (!hueco && o !== null ? ' · ' + esc(dif(t - o, 1, ' s')) + ' frente a ' + esc(S.objTxt || mmss(o)) : '') + (hueco && r.cat ? ' · ' + esc(r.cat === 'rapida' ? 'rápida' : r.cat) + ', sin tiempo' : '') +
        (S.parciales && S.parciales[i] ? ' · parciales: ' + esc(S.parciales[i].map(function (x) { return num(x, 1); }).join(' + ')) : '') +
        (S.fcMax && S.fcMax[i] != null ? ' · FC máx ' + S.fcMax[i] : '') });
    });
    /* eje de tiempo, abajo */
    var ejeG = svgEl('g', { 'class': 'eje-x' }, g);
    selFilas(ctx, puntos, n - 1);
    var fuera = conT.filter(function (t) { return o !== null && Math.abs(t - o) > 3 + 1e-9; }).length;
    if (conT.length) tablaDatos(fig, [{ cab: ['Rep.', 'Tiempo', 'Frente al objetivo'].concat(S.parciales ? ['parciales'] : []).concat(S.fcMax ? ['FC máx'] : []), filas: S.reps.map(function (r, i) {
      var t = r.t; return [String(i + 1), t === null || isNaN(t) ? (r.cat || '') : mmss(t), t !== null && !isNaN(t) && o !== null ? dif(t - o, 1, ' s') : ''].concat(S.parciales ? [S.parciales[i] ? S.parciales[i].map(function (x) { return num(x, 1); }).join(' + ') : ''] : []).concat(S.fcMax ? [S.fcMax[i] != null ? String(S.fcMax[i]) : ''] : []);
    }) }]);
    else { var vd = fig.querySelector('details.acc.datos'); if (vd) vd.remove(); }
    PC.chart.etiqueta(ctx, 'Series del ' + (S.fecha ? dm(S.fecha) : 'día') + ': ' + n + ' repeticiones' + (o !== null ? ', objetivo ' + (S.objTxt || mmss(o)) + ' ± 3 s, ' + (conT.length - fuera) + ' dentro y ' + fuera + ' fuera' : '') +
      (conT.length ? '; tiempos ' + conT.map(function (t) { return num(t, 1); }).join(', ') : '') + '.');
    return ejeG;
  }
  /* selección por filas (eje Y): misma ficha fija que PC.chart.seleccion */
  function selFilas(ctx, puntos, iDef) {
    var fig = ctx.figure, pick = fig.querySelector('.pick');
    if (!pick) { pick = el('div', { 'class': 'pick', 'aria-live': 'polite' }); ctx.host.parentNode.insertBefore(pick, ctx.host.nextSibling); }
    var act = -1;
    function sel(i) {
      if (!puntos.length) return;
      i = Math.max(0, Math.min(puntos.length - 1, i)); act = i;
      puntos.forEach(function (p, j) { p.nodo.forEach(function (nn) { nn.classList.toggle('sel', j === i); nn.classList.toggle('dim', j !== i); }); });
      pick.innerHTML = puntos[i].html;
    }
    var zona = svgEl('rect', { 'class': 'toque', x: -ctx.m.l, y: -ctx.m.t, width: ctx.w, height: ctx.h });
    ctx.g.insertBefore(zona, ctx.g.firstChild);
    zona.addEventListener('click', function (ev) {
      var r = ctx.svg.getBoundingClientRect(), y = ev.clientY - r.top - ctx.m.t, best = 0, dd = 1e9;
      puntos.forEach(function (p, j) { var d = Math.abs(p.y - y); if (d < dd) { dd = d; best = j; } });
      sel(best);
    });
    ctx.svg.setAttribute('tabindex', '0');
    ctx.svg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); sel(act - 1); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); sel(act + 1); }
    });
    sel(iDef);
  }

  /* ------------------------------------------------------------------ M-3 · gráficas (G4–G9) */
  function ultimaCarga() {
    var r = null;
    lista(H.garmin).slice().sort(ordenFecha).forEach(function (g) { if (g.focoCarga) r = g; });
    return r;
  }
  function esIso(f) { return /^\d{4}-\d{2}-\d{2}$/.test(String(f || '')); }
  var NOCHES = lista(DV.noches).filter(function (n) { return typeof n.min === 'number' && esIso(n.fecha); }).slice().sort(ordenFecha);
  var CS = DV.cortesSueno || {};
  var NECES = fmt.parseSueno(H.necesidadSueno);
  var SERIES = lista(DV.series).filter(function (s) { return lista(s.tiemposS).length; }).slice().sort(ordenFecha);
  var VP = DV.ventanaPrueba || null;
  function hastaX(ultima) { return VP && VP.hasta > ultima ? VP.hasta : PC.sumarDias(ultima, 4); }
  function ventana(ctx, fx, g) {           /* ventana de la prueba, rayada y rotulada */
    if (!VP) return;
    var xa = fx(VP.desde) - 3, xb = Math.min(ctx.iw, fx(VP.hasta) + 3);
    svgEl('rect', { x: xa.toFixed(1), y: 0, width: Math.max(4, xb - xa).toFixed(1), height: ctx.ih, 'class': 'mc-ventana' }, g);
    tx(g, Math.min(ctx.iw - 2, (xa + xb) / 2), -4, 'prueba', 'mc-rot', xb > ctx.iw - 24 ? 'end' : 'middle');
  }
  function unDato(fig, txt) {
    var p = fig.querySelector('.mc-uno');
    if (!txt) { if (p) p.remove(); return; }
    if (!p) { p = el('p', { 'class': 'mc-uno' }); fig.insertBefore(p, fig.querySelector('.chart-c').nextSibling); }
    p.textContent = txt;
  }
  function pctDe(txt) {                   /* "−2,7 %" → -2.7 · "menos del 5 %" → 5 */
    var m = /([−-]?\s*\d+(?:[.,]\d+)?)\s*%/.exec(String(txt || ''));
    return m ? +m[1].replace('−', '-').replace(/\s/g, '').replace(',', '.') : null;
  }
  function termometro(re) { var r = null; lista((P.zonasFC || {}).termometros).forEach(function (t) { if (re.test(t.nombre || '')) r = t; }); return r; }

  /* G4 · sueño */
  function g4(fig) {
    var host = fig.querySelector('.chart-c'); if (!host.clientWidth || !NOCHES.length) return;
    var N = NOCHES, x0 = N[0].fecha, x1 = N[N.length - 1].fecha, nd = PC.dias(x0, x1) + 1;
    var ctx = PC.chart.base(fig, { h: 230, m: { t: 16, r: 12, b: 28, l: 44 } }), g = ctx.g;
    var paso = ctx.iw / nd, bw = Math.max(3, Math.min(16, paso * 0.66));
    var fx = PC.chart.tiempo(x0, x1, paso / 2, ctx.iw - paso / 2);
    var mx = Math.max.apply(null, N.map(function (n) { return n.min; }).concat([NECES || 0, 540])) + 30;
    var fy = PC.chart.lineal(0, mx, ctx.ih, 0);
    var rojo = CS.rojo || 300, verde = CS.verde || 390;
    [[0, rojo, 'mc-sb-rojo'], [rojo, verde, 'mc-sb-ambar'], [verde, mx, 'mc-sb-verde']].forEach(function (b) {
      svgEl('rect', { x: 0, y: fy(b[1]).toFixed(1), width: ctx.iw, height: (fy(b[0]) - fy(b[1])).toFixed(1), 'class': 'mc-sbanda ' + b[2] }, g);
    });
    PC.chart.ejeY(ctx, fy, [rojo, verde], function (v) { return fmt.sueno(v); });
    PC.chart.ejeFechas(ctx, fx, x0, x1);
    /* noches sin CSV: marca rayada baja */
    var pid = 'mc-' + ctx.id + '-ray', defs = svgEl('defs', {}, ctx.svg);
    var pat = svgEl('pattern', { id: pid, width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    svgEl('rect', { width: 2, height: 5, 'class': 'mc-ray' }, pat);
    var hay = {}; N.forEach(function (n) { hay[n.fecha] = n; });
    var faltan = 0;
    for (var d = x0; d <= x1; d = PC.sumarDias(d, 1)) {
      if (hay[d]) continue;
      faltan++;
      svgEl('rect', { x: (fx(d) - bw / 2).toFixed(1), y: (ctx.ih - 12).toFixed(1), width: bw.toFixed(1), height: 12, 'class': 'mc-sindato', style: 'fill:url(#' + pid + ')' }, g);
    }
    var pts = N.map(function (n) {
      var x = fx(n.fecha), y = fy(n.min);
      var b = svgEl('rect', { x: (x - bw / 2).toFixed(1), y: y.toFixed(1), width: bw.toFixed(1), height: Math.max(1, ctx.ih - y).toFixed(1), rx: 2, 'class': 'mc-sbar mc-sb-' + (n.color || 'verde') }, g);
      var campos = [n.duracion ? '<b>' + esc(corta(n.fecha) + ' · ' + n.duracion) + '</b>' : '<b>' + esc(corta(n.fecha)) + '</b>',
        n.color ? esc({ verde: 'verde', ambar: 'ámbar', rojo: 'rojo' }[n.color] || n.color) : '',
        n.puntuacion != null ? 'puntuación ' + esc(n.puntuacion) : '', n.calidad ? esc(minus(n.calidad)) : '',
        n.fcReposo != null ? 'FC en reposo ' + esc(n.fcReposo) + ' ppm' : '', n.vfc != null ? 'VFC ' + esc(n.vfc) + ' ms' : '',
        n.vfc7dias ? 'VFC de 7 días: ' + esc(n.vfc7dias) : ''].filter(Boolean);
      return { x: x, nodo: b, html: campos.join(' · ') + (n.nota ? '<br>' + esc(n.nota) : '') };
    });
    if (NECES) {
      hl(g, fy(NECES), ctx.iw, 'mc-l-neces');
      tx(g, 2, fy(NECES) - 5, fmt.sueno(NECES) + ' según el reloj', 'mc-t-2');
    }
    var u = N[N.length - 1];
    tx(g, Math.max(14, Math.min(ctx.iw - 14, fx(u.fecha))), fy(u.min) - 5, u.duracion || fmt.sueno(u.min), 'lab', 'middle');
    PC.chart.seleccion(ctx, pts, pts.length - 1);
    leyenda(fig, [['mc-lg-verde', fmt.sueno(verde) + ' o más'], ['mc-lg-ambar', fmt.sueno(rojo) + '–' + fmt.sueno(verde - 1)], ['mc-lg-rojo', 'menos de ' + fmt.sueno(rojo)], ['mc-lg-sin', 'sin dato']]);
    var encima = N.filter(function (n) { return n.min >= verde; }).length;
    PC.chart.etiqueta(ctx, 'Sueño del ' + dm(x0) + ' al ' + dm(x1) + ': ' + N.length + ' noches, ' + encima + ' de ' + fmt.sueno(verde) + ' o más, la última ' + (u.duracion || fmt.sueno(u.min)) + '; ' + faltan + ' noches sin dato.');
    tablaDatos(fig, [{ cab: ['Noche', 'Duración', 'Puntuación', 'Calidad', 'FC reposo', 'VFC'], filas: N.slice().reverse().map(function (n) { return [corta(n.fecha), n.duracion || fmt.sueno(n.min), n.puntuacion, n.calidad, n.fcReposo, n.vfc]; }) }]);
  }

  /* G6 · dominadas en dos paneles */
  function testsMaximos() {
    var out = {};
    lista(H.dominadas).forEach(function (e) {
      if (typeof e.maximo === 'number') out[e.fecha] = { fecha: e.fecha, reps: e.maximo, validas: typeof e.validas === 'number' ? e.validas : null, e: e };
    });
    var MR = ((P.marcasActuales || {}).dominadas || {}).maximoRegistrado;
    var m = /^(\d+),\s*el\s*(\d{1,2})-(\d{1,2})-(\d{4})/.exec(String(MR || ''));
    if (m) {
      var f = m[4] + '-' + ('0' + m[3]).slice(-2) + '-' + ('0' + m[2]).slice(-2);
      if (!out[f]) out[f] = { fecha: f, reps: +m[1], validas: null, e: histDe('dominadas', f) || {}, desde: MR };
    }
    return Object.keys(out).sort().map(function (k) { return out[k]; });
  }
  function lastradas() {
    return lista(H.dominadas).filter(function (e) { return typeof e.lastreKg === 'number' && Array.isArray(e.series); }).slice().sort(ordenFecha);
  }
  function habituacion(desde, hasta) {
    var n = 0, reps = 0;
    lista(H.dominadas).forEach(function (e) {
      if (e.fecha <= desde || e.fecha >= hasta || !Array.isArray(e.series) || typeof e.lastreKg === 'number' || typeof e.maximo === 'number') return;
      n++; reps += e.series.reduce(function (a, b) { return a + (+b || 0); }, 0);
    });
    return { n: n, reps: reps };
  }
  function panel(fig, id, titulo) {
    var p = fig.querySelector('#' + id);
    if (!p) { p = el('div', { 'class': 'chart mc-panel', id: id }, '<p class="mc-ptit">' + esc(titulo) + '</p><div class="chart-c"></div>'); fig.appendChild(p); }
    return p;
  }
  function g6(fig) {
    if (!fig.clientWidth) return;
    var T = testsMaximos(), L = lastradas(), todas = lista(H.dominadas).map(function (e) { return e.fecha; }).filter(esIso).sort();
    if (!todas.length) return;
    var x0 = PC.sumarDias(todas[0], -3), x1 = hastaX(todas[todas.length - 1]);
    var base = fig.querySelector(':scope > .chart-c'); if (base) base.remove();
    /* (a) test máximo */
    var pa = panel(fig, fig.id + '-a', 'Test máximo a peso corporal');
    var ca = PC.chart.base(pa, { h: 210, m: { t: 18, r: 30, b: 28, l: 34 } }), g = ca.g;
    var fx = PC.chart.tiempo(x0, x1, 8, ca.iw - 8), YM = 17, fy = PC.chart.lineal(0, YM, ca.ih, 0);
    BT.dom.slice().sort(function (a, b) { return a.min - b.min; }).forEach(function (t) {
      var a = Math.max(0, t.pts === 0 ? 0 : t.min - 0.5), b = Math.min(YM, t.max === null ? YM : t.max + 0.5);
      if (a >= YM) return;
      var y0 = fy(b), y1 = fy(a);
      svgEl('rect', { x: 0, y: y0.toFixed(1), width: ca.iw, height: (y1 - y0).toFixed(1), 'class': 'mc-band ' + (t.pts === 0 ? 'mc-band-elim' : 'mc-band-' + (t.pts % 2 ? 'i' : 'p')) }, g);
      if (y1 - y0 >= 12) tx(g, ca.iw + 6, (y0 + y1) / 2 + 4, String(t.pts), 'mc-bpts');
    });
    tx(g, ca.iw + 6, -6, 'pts', 'mc-bpts');
    var t0 = tramo0('dom');
    if (t0) tx(g, 4, fy(t0.max) + 16, elimTxt('dom'), 'lab elim');
    PC.chart.ejeY(ca, fy, [0, 5, 10, 15], function (v) { return String(v); });
    PC.chart.ejeFechas(ca, fx, x0, x1);
    ventana(ca, fx, g);
    var ptsA = T.map(function (t, i) {
      var x = fx(t.fecha), nodos = [];
      nodos.push(punto(g, x, fy(t.reps), 'mc-s2 mc-hueco2'));
      if (t.validas !== null) nodos.push(punto(g, x, fy(t.validas), 'mc-s2'));
      tx(g, x, fy(t.reps) - 10, String(t.reps), 'lab', 'middle');
      var ant = i ? T[i - 1].fecha : null, hb = ant ? habituacion(ant, t.fecha) : null;
      var p = PC.baremo.pts('dom', t.validas !== null ? t.validas : t.reps);
      return { x: x, nodo: nodos, html: '<b>' + esc(corta(t.fecha) + ' · ' + t.reps + ' dominadas') + '</b> · contadas por ti' + (t.validas !== null ? ' · ' + t.validas + ' válidas en vídeo' : '') + ' · ' + esc(ptsTxt(p)) +
        (t.e && t.e.contexto ? '<br>' + esc(t.e.contexto) : '') +
        (hb && hb.n ? '<br>Entre el ' + esc(dm(ant)) + ' y el ' + esc(dm(t.fecha)) + ': ' + hb.n + ' sesiones de habituación a peso corporal, ' + hb.reps + ' repeticiones en total.' : '') };
    });
    PC.chart.seleccion(ca, ptsA, ptsA.length - 1);
    PC.chart.etiqueta(ca, 'Tests máximos de dominadas: ' + T.map(function (t) { return t.reps + ' el ' + dm(t.fecha); }).join(', ') + '; contadas por ti, sin vídeo. 4 o menos elimina.');
    /* (b) lastre en 5 × 3 */
    var pb = panel(fig, fig.id + '-b', 'Lastre en las series de fuerza');
    if (!L.length) { pb.querySelector('.chart-c').innerHTML = '<p class="empty">Aún no hay series lastradas</p>'; return; }
    var kmax = Math.max.apply(null, L.map(function (e) { return e.lastreKg; }));
    var YB = Math.ceil((kmax + 2.5) / 5) * 5;
    var cb = PC.chart.base(pb, { h: 150, m: { t: 18, r: 30, b: 28, l: 34 } }), gb = cb.g;
    var fxb = PC.chart.tiempo(x0, x1, 8, cb.iw - 8), fyb = PC.chart.lineal(0, YB, cb.ih, 0);
    var tk = []; for (var k = 0; k <= YB; k += 5) tk.push(k);
    PC.chart.ejeY(cb, fyb, tk, function (v) { return v + ' kg'; });
    PC.chart.ejeFechas(cb, fxb, x0, x1);
    ventana(cb, fxb, gb);
    var hoy = PC.hoyIso();
    /* escalón: M x0 y0 H x1 V y1 H x2 … */
    var dPath = L.map(function (e, i) {
      var xa = fxb(e.fecha), y = fyb(e.lastreKg).toFixed(1);
      var xb = i < L.length - 1 ? fxb(L[i + 1].fecha) : Math.max(xa + 6, Math.min(cb.iw, fxb(hoy > e.fecha ? hoy : e.fecha)));
      return (i ? 'V' + y : 'M' + xa.toFixed(1) + ' ' + y) + 'H' + xb.toFixed(1);
    }).join('');
    svgEl('path', { d: dPath, 'class': 'mc-linea mc-s2' }, gb);
    var ptsB = L.map(function (e, i) {
      var x = fxb(e.fecha), y = fyb(e.lastreKg), n = punto(gb, x, y, 'mc-s2');
      var ser = e.series.join('-');
      if (i === L.length - 1 || L[i + 1].lastreKg !== e.lastreKg) tx(gb, x, y - 10, num(e.lastreKg, e.lastreKg % 1 ? 1 : 0) + ' kg', 'lab', 'middle');
      if (e.repeticionesEnReserva != null) tx(gb, x, y + 18, 'reserva ' + e.repeticionesEnReserva, 'mc-t-2', 'middle');
      return { x: x, nodo: n, html: '<b>' + esc(corta(e.fecha) + ' · ' + num(e.lastreKg, e.lastreKg % 1 ? 1 : 0) + ' kg') + '</b> · ' + esc(ser) +
        ' · reserva de la 5.ª: ' + (e.repeticionesEnReserva != null ? esc(e.repeticionesEnReserva) : 'no registrada') + (e.sesion ? '<br>' + esc(e.sesion) : '') };
    });
    PC.chart.seleccion(cb, ptsB, ptsB.length - 1);
    PC.chart.etiqueta(cb, 'Lastre en las series de fuerza: ' + L.map(function (e) { return num(e.lastreKg, e.lastreKg % 1 ? 1 : 0) + ' kg el ' + dm(e.fecha) + ' (' + e.series.join('-') + ')'; }).join('; ') + '.');
    tablaDatos(fig, [{ cab: ['Fecha', 'Series', 'Total', 'Lastre', 'Reserva', 'Máximo'], filas: lista(H.dominadas).slice().sort(ordenFecha).reverse().map(function (e) {
      return [corta(e.fecha), Array.isArray(e.series) ? e.series.join('-') : String(e.series || ''), e.total, e.lastreKg != null ? num(e.lastreKg) + ' kg' : '', e.repeticionesEnReserva, e.maximo];
    }) }]);
  }

  /* G7 · circuito de los jueves */
  function intentosDe(e) {
    if (Array.isArray(e.intentos)) return e.intentos.map(function (x) { return typeof x === 'number' ? { t: x, nulo: false } : { t: x && x.t != null ? +x.t : null, nulo: !!(x && x.nulo) }; });
    return null;
  }
  function g7(fig) {
    var host = fig.querySelector('.chart-c'); if (!host.clientWidth) return;
    var C = lista(H.circuito).filter(function (e) { return esIso(e.fecha); }).slice().sort(ordenFecha);
    if (!C.length) return;
    var ctx = PC.chart.base(fig, { h: 230, m: { t: 18, r: 30, b: 28, l: 40 } }), g = ctx.g;
    var x0 = PC.sumarDias(C[0].fecha, -3), x1 = hastaX(C[C.length - 1].fecha);
    var fx = PC.chart.tiempo(x0, x1, 8, ctx.iw - 8), Y0 = 8, Y1 = 12.5, fy = PC.chart.lineal(Y0, Y1, 0, ctx.ih);
    var prev = Y0;
    BT.cir.slice().sort(function (a, b) { return b.pts - a.pts; }).forEach(function (t) {
      var top = Math.max(Y0, t.pts === 0 ? t.min : prev), bot = t.max === null ? Y1 : Math.min(Y1, t.max);
      if (t.max !== null) prev = t.max;
      if (bot <= Y0 || top >= Y1 || bot <= top) return;
      var y0 = fy(top), y1 = fy(bot);
      svgEl('rect', { x: 0, y: y0.toFixed(1), width: ctx.iw, height: (y1 - y0).toFixed(1), 'class': 'mc-band ' + (t.pts === 0 ? 'mc-band-elim' : 'mc-band-' + (t.pts % 2 ? 'i' : 'p')) }, g);
      if (y1 - y0 >= 12) tx(g, ctx.iw + 6, (y0 + y1) / 2 + 4, String(t.pts), 'mc-bpts');
    });
    tx(g, ctx.iw + 6, -6, 'pts', 'mc-bpts');
    PC.chart.ejeY(ctx, fy, [8, 9, 10, 11, 12], function (v) { return num(v, 1) + ' s'; });
    PC.chart.ejeFechas(ctx, fx, x0, x1);
    ventana(ctx, fx, g);
    var t0 = tramo0('cir');
    if (t0) { hl(g, fy(t0.min), ctx.iw, 'mc-l-elim'); tx(g, ctx.iw - 2, fy(t0.min) - 5, num(t0.min, 1) + ' s elimina', 'lab elim', 'end'); }
    var pts = [], medidos = [];
    C.forEach(function (e) {
      var x = fx(e.fecha), nodos = [], I = intentosDe(e);
      if (e.hecho === false) {
        svgEl('line', { x1: x.toFixed(1), x2: x.toFixed(1), y1: 22, y2: ctx.ih, 'class': 'mc-guia' }, g);
        nodos.push(svgEl('path', { d: 'M' + (x - 5).toFixed(1) + ' 8l10 10m0 -10l-10 10', 'class': 'mc-nohecho' }, g));
        tx(g, x + 9, 17, 'no hecho', 'mc-t-2');
        pts.push({ x: x, nodo: nodos, html: '<b>' + esc(corta(e.fecha)) + ' · no hecho</b>' + (e.motivo ? '<br>' + esc(e.motivo) : '') + (e.valoracion ? '<br>' + esc(e.valoracion) : '') });
        return;
      }
      var val = I ? I.filter(function (x2) { return !x2.nulo && x2.t != null; }) : [];
      var primero = I ? (val[0] || null) : null, mejor = val.length ? Math.min.apply(null, val.map(function (x2) { return x2.t; })) : null;
      var t = I ? (primero ? primero.t : null) : (typeof e.segundos === 'number' ? e.segundos : null);
      if (t === null) return;
      var sup = !I, fiab = M.cir && M.cir.fecha === e.fecha && M.cir.fiab ? M.cir.fiab : (sup ? 'supuesto' : '');
      if (sup) nodos.push(svgEl('line', { x1: x.toFixed(1), x2: x.toFixed(1), y1: fy(t).toFixed(1), y2: ctx.ih, 'class': 'mc-guia' }, g));
      nodos.push(punto(g, x, fy(t), sup ? 'mc-s3 mc-hueco2' : 'mc-s3'));
      if (mejor !== null && mejor < t) nodos.push(svgEl('circle', { cx: x.toFixed(1), cy: fy(mejor).toFixed(1), r: 7, 'class': 'mc-anillo' }, g));
      tx(g, x + 10, fy(t) + 4, num(t, 1) + ' s' + (fiab ? ' · ' + fiab : ''), 'lab');
      medidos.push({ e: e, t: t, fiab: fiab, sup: sup });
      var p = PC.baremo.pts('cir', t);
      pts.push({ x: x, nodo: nodos, medida: true, html: '<b>' + esc(corta(e.fecha) + ' · ' + num(t, 1) + ' s') + '</b>' + (I ? ' · primer intento' + (mejor !== null && mejor < t ? ' · mejor ' + esc(num(mejor, 1)) + ' s' : '') : '') + ' · ' + esc(ptsTxt(p)) +
        (e.condiciones ? '<br>' + esc(cap(e.condiciones)) : '') + (e.valoracion ? '<br>' + esc(e.valoracion) : '') });
    });
    var iMed = -1; pts.forEach(function (p, j) { if (p.medida) iMed = j; });
    PC.chart.seleccion(ctx, pts, iMed >= 0 ? iMed : pts.length - 1);
    var hayAnillo = C.some(function (e) { var I = intentosDe(e); return I && I.length > 1; });
    var hayLleno = medidos.some(function (m) { return !m.sup; });
    leyenda(fig, (hayLleno ? [['mc-lg-s3', 'primer intento (el comparable)']] : []).concat(hayAnillo ? [['mc-lg-anillo', 'mejor intento']] : []).concat(medidos.some(function (m) { return m.fiab && m.fiab !== 'medido'; }) ? [['mc-lg-hueco3', 'hueco: no es una medición seria']] : []));
    unDato(fig, medidos.length === 1 ? 'Un solo dato: ' + num(medidos[0].t, 1) + ' s el ' + dm(medidos[0].e.fecha) + (medidos[0].fiab ? ', ' + medidos[0].fiab : '') + '.' : '');
    PC.chart.etiqueta(ctx, 'Circuito: ' + C.map(function (e) { return e.hecho === false ? dm(e.fecha) + ' no hecho' : (typeof e.segundos === 'number' ? num(e.segundos, 1) + ' s el ' + dm(e.fecha) : dm(e.fecha)); }).join('; ') + '. ' + (t0 ? num(t0.min, 1) + ' s elimina.' : ''));
    tablaDatos(fig, [{ cab: ['Fecha', 'Tiempo', 'Estado', 'Condiciones'], filas: C.slice().reverse().map(function (e) { return [corta(e.fecha), typeof e.segundos === 'number' ? num(e.segundos, 1) + ' s' : '', e.hecho === false ? 'no hecho' : '', e.condiciones || e.motivo || '']; }) }]);
  }

  /* G8 · pulso en rodaje: deriva de cada rodaje (y ritmo a 145 cuando exista) */
  function derivas() {
    return lista(H.carrera).filter(function (e) { return e.resultado && e.resultado.deriva && typeof e.resultado.deriva.pct === 'number' && esIso(e.fecha); }).slice().sort(ordenFecha);
  }
  function ritmos145() {
    return lista(H.carrera).filter(function (e) { var m = e.resultado && e.resultado.metricas; return m && m.ritmoA145 && fmt.parseT(String(m.ritmoA145).split('/')[0]) !== null; }).slice().sort(ordenFecha);
  }
  function metodoDe(dv) {
    var ks = Object.keys(dv).filter(function (k) { return /^min\d+a\d+$/.test(k); });
    if (ks.length < 2) return '';
    var r = ks.map(function (k) { var m = /^min(\d+)a(\d+)$/.exec(k); return 'min ' + m[1] + '–' + m[2]; });
    return r[0] + ' frente a ' + r[r.length - 1];
  }
  function g8(fig) {
    var host = fig.querySelector('.chart-c'); if (!host.clientWidth) return;
    var E = derivas(); if (!E.length) return;
    var TD = termometro(/deriva/i) || {}, base = pctDe(TD.normal), alarma = pctDe(TD.alarma);
    var vals = [];
    E.forEach(function (e) { vals.push(e.resultado.deriva.pct); var m = pctDe(e.resultado.deriva.mitadesDesdeMin15); if (m !== null) vals.push(m); });
    if (base !== null) vals.push(base); if (alarma !== null) vals.push(alarma);
    var lo = Math.min(0, Math.min.apply(null, vals)) - 2, hi = Math.max.apply(null, vals) + 3;
    var ctx = PC.chart.base(fig, { h: 220, m: { t: 16, r: 14, b: 28, l: 40 } }), g = ctx.g;
    var x0 = PC.sumarDias(E[0].fecha, -3), x1 = PC.sumarDias(E[E.length - 1].fecha, 3);
    var fx = PC.chart.tiempo(x0, x1, 10, ctx.iw - 10), fy = PC.chart.lineal(lo, hi, ctx.ih, 0);
    var tk = []; for (var v = Math.ceil(lo / 5) * 5; v <= hi; v += 5) tk.push(v);
    PC.chart.ejeY(ctx, fy, tk, function (x) { return num(x) + ' %'; });
    PC.chart.ejeFechas(ctx, fx, x0, x1);
    if (lo < 0) hl(g, fy(0), ctx.iw, 'eje');
    if (base !== null) { hl(g, fy(base), ctx.iw, 'mc-l-obj'); tx(g, 4, fy(base) + 14, num(base) + ' % base asentada', 'lab mc-t-ok'); }
    if (alarma !== null) { hl(g, fy(alarma), ctx.iw, 'mc-l-alarma'); tx(g, 4, fy(alarma) - 5, num(alarma) + ' % alarma en llano', 'lab mc-t-warn'); }
    var pts = [], hayMit = false;
    E.forEach(function (e) {
      var dv = e.resultado.deriva, x = fx(e.fecha), nodos = [], mit = pctDe(dv.mitadesDesdeMin15);
      nodos.push(punto(g, x, fy(dv.pct), 'mc-s1'));
      tx(g, x - 9, fy(dv.pct) + 4, num(dv.pct) + ' %', 'lab', 'end');
      if (mit !== null) {
        hayMit = true;
        var ym = fy(mit);
        nodos.push(svgEl('path', { d: 'M' + x.toFixed(1) + ' ' + (ym - 6).toFixed(1) + 'l6 6l-6 6l-6 -6z', 'class': 'mc-pt mc-rombo' }, g));
        tx(g, x - 9, ym + 4, num(mit) + ' %', 'mc-t-2', 'end');
      }
      var met = metodoDe(dv), ks = Object.keys(dv).filter(function (k) { return /^min\d+a\d+$/.test(k); });
      pts.push({ x: x, nodo: nodos, html: '<b>' + esc(corta(e.fecha) + ' · deriva ' + num(dv.pct) + ' %') + '</b>' + (dv.sKm != null ? ' (' + esc(dv.sKm) + ' s/km)' : '') +
        (met ? ' · ' + esc(met) + ': ' + ks.map(function (k) { return esc(dv[k]); }).join(' → ') : '') +
        (mit !== null ? '<br>Por mitades desde el minuto 15: ' + esc(dv.mitadesDesdeMin15) : '<br>Sin el dato de deriva por mitades desde el minuto 15.') +
        (dv.analizador ? '<br>Analizador: ' + esc(dv.analizador) : '') + (e.sesion ? '<br>' + esc(e.sesion) : '') });
    });
    PC.chart.seleccion(ctx, pts, pts.length - 1);
    leyenda(fig, hayMit ? [['mc-lg-s1', 'deriva del rodaje (primer bloque frente al último)'], ['mc-lg-rombo', 'por mitades desde el minuto 15']] : null);
    PC.chart.etiqueta(ctx, 'Deriva cardíaca de los rodajes: ' + E.map(function (e) { var m = e.resultado.deriva.mitadesDesdeMin15; return num(e.resultado.deriva.pct) + ' % el ' + dm(e.fecha) + (m ? ' (por mitades ' + m + ')' : ''); }).join('; ') +
      (base !== null ? '. Base asentada por debajo del ' + num(base) + ' %' : '') + (alarma !== null ? '; alarma por encima del ' + num(alarma) + ' % en llano.' : '.'));
    tablaDatos(fig, [{ cab: ['Fecha', 'Deriva', 's/km', 'Método', 'Por mitades'], filas: E.slice().reverse().map(function (e) { var d = e.resultado.deriva; return [corta(e.fecha), num(d.pct) + ' %', d.sKm, metodoDe(d), d.mitadesDesdeMin15 || '—']; }) }]);
    /* termómetros del plan, literales */
    var T145 = termometro(/145/), R = ritmos145(), notas = [];
    if (TD.nombre) notas.push('<dt>' + esc(TD.nombre) + '</dt><dd>' + esc([TD.normal ? 'Normal: ' + TD.normal : '', TD.alarma ? 'Alarma: ' + TD.alarma : ''].filter(Boolean).join('. ')) + '</dd>');
    if (T145) notas.push('<dt>' + esc(T145.nombre) + '</dt><dd>' + (R.length ? '' : 'Aún no hay datos estructurados del ritmo a 145 ppm: esta parte no se pinta. ') + esc([T145.normal ? 'Normal: ' + T145.normal : '', T145.alarma ? 'Alarma: ' + T145.alarma : ''].filter(Boolean).join('. ')) + '</dd>');
    var viejo = fig.querySelector('.mc-termo'); if (viejo) viejo.remove();
    if (notas.length) fig.insertBefore(el('dl', { 'class': 'mc-txt mc-termo' }, notas.join('')), fig.querySelector('details.acc.datos'));
    if (R.length && T145) g8b(fig, R, T145);
  }
  function g8b(fig, R, T145) {
    var p = panel(fig, fig.id + '-b', 'Ritmo a 145 ppm en rodaje');
    fig.insertBefore(p, fig.querySelector('.mc-termo'));
    var c = PC.chart.base(p, { h: 170, m: { t: 16, r: 14, b: 28, l: 44 } }), g = c.g;
    var nr = (String(T145.normal || '').match(/\d:\d{2}/g) || []).map(fmt.parseT), al = (String(T145.alarma || '').match(/\d:\d{2}/g) || []).map(fmt.parseT);
    var vs = R.map(function (e) { return fmt.parseT(String(e.resultado.metricas.ritmoA145).split('/')[0]); }).concat(nr, al);
    var lo = Math.min.apply(null, vs) - 15, hi = Math.max.apply(null, vs) + 15;
    var x0 = PC.sumarDias(R[0].fecha, -3), x1 = PC.sumarDias(R[R.length - 1].fecha, 3);
    var fx = PC.chart.tiempo(x0, x1, 10, c.iw - 10), fy = PC.chart.lineal(lo, hi, 0, c.ih);
    if (nr.length === 2) { svgEl('rect', { x: 0, y: fy(nr[0]).toFixed(1), width: c.iw, height: (fy(nr[1]) - fy(nr[0])).toFixed(1), 'class': 'mc-franja' }, g); tx(g, 2, fy(nr[0]) - 4, 'normal', 'mc-t-ok'); }
    if (al.length) { hl(g, fy(al[0]), c.iw, 'mc-l-alarma'); tx(g, c.iw - 2, fy(al[0]) - 5, mmss(al[0]) + ' alarma', 'lab mc-t-warn', 'end'); }
    PC.chart.ejeY(c, fy, [Math.ceil(lo / 30) * 30, Math.ceil(lo / 30) * 30 + 30, Math.ceil(lo / 30) * 30 + 60].filter(function (v) { return v < hi; }), function (v) { return mmss(v); });
    PC.chart.ejeFechas(c, fx, x0, x1);
    var pts = R.map(function (e) { var t = fmt.parseT(String(e.resultado.metricas.ritmoA145).split('/')[0]), x = fx(e.fecha); return { x: x, nodo: punto(g, x, fy(t), 'mc-s1'), html: '<b>' + esc(corta(e.fecha)) + '</b> · ' + esc(e.resultado.metricas.ritmoA145) }; });
    PC.chart.seleccion(c, pts, pts.length - 1);
    PC.chart.etiqueta(c, 'Ritmo a 145 ppm: ' + R.map(function (e) { return e.resultado.metricas.ritmoA145 + ' el ' + dm(e.fecha); }).join('; ') + '.');
  }

  /* G9 · foco de carga del reloj (sin rangos óptimos: no hay fuente) */
  var CARGAS = [['anaerobica', 'anaeróbica', 'mc-s2'], ['aerobicaAlta', 'aeróbica alta', 'mc-s1'], ['aerobicaBaja', 'aeróbica baja', 'mc-s3']];
  function lecturasCarga() {
    return lista(H.garmin).filter(function (g) { return esIso(g.fecha) && CARGAS.some(function (c) { return typeof g[c[0]] === 'number'; }); }).slice().sort(ordenFecha);
  }
  function g9(fig) {
    var host = fig.querySelector('.chart-c'); if (!host.clientWidth) return;
    var L = lecturasCarga(); if (!L.length) return;
    var mx = 0; L.forEach(function (x) { CARGAS.forEach(function (c) { if (typeof x[c[0]] === 'number') mx = Math.max(mx, x[c[0]]); }); });
    var YM = Math.ceil((mx + 40) / 200) * 200;
    var ctx = PC.chart.base(fig, { h: 230, m: { t: 16, r: 14, b: 28, l: 40 } }), g = ctx.g;
    var x0 = PC.sumarDias(L[0].fecha, -2), x1 = PC.sumarDias(L[L.length - 1].fecha, 2);
    var fx = PC.chart.tiempo(x0, x1, 8, ctx.iw - 8), fy = PC.chart.lineal(0, YM, ctx.ih, 0);
    var tk = []; for (var v = 0; v <= YM; v += 200) tk.push(v);
    PC.chart.ejeY(ctx, fy, tk, function (x) { return String(x); });
    PC.chart.ejeFechas(ctx, fx, x0, x1);
    var nodosF = L.map(function () { return []; }), finales = [];
    CARGAS.forEach(function (c) {
      var P2 = []; L.forEach(function (x, i) { if (typeof x[c[0]] === 'number') P2.push({ i: i, x: fx(x.fecha), y: fy(x[c[0]]), v: x[c[0]] }); });
      if (!P2.length) return;
      svgEl('path', { d: P2.map(function (p, j) { return (j ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1); }).join(''), 'class': 'mc-linea ' + c[2] }, g);
      P2.forEach(function (p) { nodosF[p.i].push(punto(g, p.x, p.y, c[2], 4)); });
      var u = P2[P2.length - 1]; finales.push({ y: u.y, x: u.x, txt: u.v + ' ' + c[1] });
    });
    /* rótulos del último punto sin montarse */
    finales.sort(function (a, b) { return a.y - b.y; });
    var ult = -1e9;
    finales.forEach(function (f) { var y = Math.max(f.y + 4, ult + 14); ult = y; tx(g, f.x - 8, y, f.txt, 'lab', 'end'); });
    var pts = L.map(function (x, i) {
      return { x: fx(x.fecha), nodo: nodosF[i], html: '<b>' + esc(corta(x.fecha)) + '</b> · ' + CARGAS.filter(function (c) { return typeof x[c[0]] === 'number'; }).map(function (c) { return esc(c[1]) + ' ' + x[c[0]]; }).join(' · ') +
        (x.ventanaFocoCarga ? '<br>Ventana: ' + esc(x.ventanaFocoCarga) : '') + (x.focoCarga ? '<br>Foco: ' + esc(x.focoCarga) : '') +
        (x.mensajeGarmin ? '<br>Reloj: «' + esc(x.mensajeGarmin) + '»' : '') + (x.estado ? '<br>Estado: ' + esc(x.estado) : '') };
    });
    PC.chart.seleccion(ctx, pts, pts.length - 1);
    leyenda(fig, CARGAS.map(function (c) { return ['mc-lg-' + c[2].slice(3), c[1]]; }));
    var u = L[L.length - 1];
    PC.chart.etiqueta(ctx, 'Foco de carga del reloj, ' + L.length + ' lecturas del ' + dm(L[0].fecha) + ' al ' + dm(u.fecha) + '; la última: ' + CARGAS.filter(function (c) { return typeof u[c[0]] === 'number'; }).map(function (c) { return c[1] + ' ' + u[c[0]]; }).join(', ') + (u.focoCarga ? ', ' + u.focoCarga : '') + '.');
    tablaDatos(fig, [{ cab: ['Fecha'].concat(CARGAS.map(function (c) { return cap(c[1]); })).concat(['Foco', 'Ventana']), filas: L.slice().reverse().map(function (x) { return [corta(x.fecha)].concat(CARGAS.map(function (c) { return x[c[0]]; })).concat([x.focoCarga || '', x.ventanaFocoCarga || '']); }) }]);
  }

  /* G5 dentro de Marcas: selector de sesión */
  function motivoSerie(s) {
    if (s.valida !== false) return '';
    return motivoNoMide(s);
  }
  function pSeries(fig) {
    var sel = +(fig.getAttribute('data-ses') || SERIES.length - 1);
    if (!(sel >= 0 && sel < SERIES.length)) sel = SERIES.length - 1;
    var box = fig.querySelector('.mc-ses');
    if (!box) {
      box = el('div', { 'class': 'mc-ses' });
      fig.insertBefore(box, fig.querySelector('.chart-c'));
      box.innerHTML = '<div class="chips" role="group" aria-label="Sesión">' + SERIES.map(function (s, i) {
        return { s: s, i: i };
      }).reverse().map(function (o) {
        var s = o.s, i = o.i;
        return '<button type="button" class="chip" aria-pressed="false" data-i="' + i + '">' + esc(corta(s.fecha) + ' · ' + (s.dist ? s.n + ' × ' + num(s.dist) : /partido/i.test(s.sesion || '') ? 'km partido' : s.n + ' rep.')) + '</button>';
      }).join('') + '</div><div class="mc-ses-i" aria-live="polite"></div>';
      PC.$$('[data-i]', box).forEach(function (b) {
        b.addEventListener('click', function () { fig.setAttribute('data-ses', b.getAttribute('data-i')); pSeries(fig); });
      });
    }
    PC.$$('[data-i]', box).forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-i') === sel ? 'true' : 'false'); });
    var s = SERIES[sel], e = histDe('carrera', s.fecha) || {}, mot = motivoSerie(s);
    box.querySelector('.mc-ses-i').innerHTML = '<p class="mc-sub">' + (mot ? '<span class="chip warn">' + esc(mot) + '</span> ' : '<span class="chip ok">mide</span> ') + esc(s.sesion || '') +
      (s.objetivo ? ' · objetivo ' + esc(s.objetivo) : ' · sin objetivo por repetición') + '</p>' +
      (e.valoracion ? porQue('<p>' + esc(e.valoracion) + '</p>', 'Valoración') : '');
    var fs = fig.__serie;
    if (fs !== s) { var pk = fig.querySelector('.pick'); if (pk) pk.innerHTML = ''; }
    PC.graf.series(fig, s);
  }

  var GR = [
    { id: 'series', chip: 'Series', t: 'Series, repetición a repetición', sub: 'Franja: objetivo ± 3 s. Toca una repetición.', hay: function () { return SERIES.length > 0; }, motivo: 'Aún no hay sesiones de series con tiempos', pinta: pSeries, propio: true },
    { id: 'sueno', chip: 'Sueño', t: 'Sueño, noche a noche', sub: 'Fondo con los cortes del semáforo. Toca una barra.', hay: function () { return NOCHES.length > 0; }, motivo: 'Aún no hay noches registradas', pinta: g4 },
    { id: 'barra', chip: 'Barra', t: 'Dominadas: test máximo y lastre', sub: 'Hueco: contadas por ti. Relleno: válidas en vídeo. Toca un punto.', hay: function () { return testsMaximos().length > 0 || lastradas().length > 0; }, motivo: 'Aún no hay tests máximos ni series lastradas', pinta: g6, paneles: true },
    { id: 'circuito', chip: 'Circuito', t: 'Circuito de los jueves', sub: 'Arriba, más rápido. Franjas: puntos del baremo.', hay: function () { return lista(H.circuito).some(function (e) { return typeof e.segundos === 'number' || Array.isArray(e.intentos); }); }, motivo: 'Aún no hay ningún circuito cronometrado', pinta: g7 },
    { id: 'pulso', chip: 'Pulso', t: 'Pulso en rodaje: deriva cardíaca', sub: 'Deriva de cada rodaje frente a las dos líneas del plan. Toca un punto.', hay: function () { return derivas().length > 0 || ritmos145().length > 0; }, motivo: 'Aún no hay rodajes con la deriva calculada', pinta: g8 },
    { id: 'carga', chip: 'Carga', t: 'Foco de carga del reloj', sub: '', hay: function () { return lecturasCarga().length > 0; }, motivo: 'Aún no hay lecturas del foco de carga', pinta: g9 }
  ];
  function grDe(id) { var r = null; GR.forEach(function (x) { if (x.id === id) r = x; }); return r; }
  function subCarga() {
    var u = ultimaCarga();
    return u ? '<span class="chip">' + esc(u.focoCarga + ' · ' + dm(u.fecha)) + '</span> Las tres cargas de la ventana de cuatro semanas del reloj. Toca un punto.' : 'Las tres cargas de la ventana de cuatro semanas del reloj.';
  }
  function figHtml(x) {
    return '<figure class="chart mc-fig" id="g-' + x.id + '" role="group" aria-labelledby="g-' + x.id + '-t">' +
      '<figcaption class="chart-h"><h3 id="g-' + x.id + '-t">' + esc(x.t) + '</h3><small>' + (x.id === 'carga' ? subCarga() : esc(x.sub)) + '</small></figcaption>' +
      (x.paneles ? '' : '<div class="chart-c"></div>') + '</figure>';
  }
  function montarGraf(card, x) {
    var fig = card.querySelector('figure.chart');
    if (x.propio) { x.pinta(fig); return; }
    var host = x.paneles ? fig : fig.querySelector('.chart-c');
    montar(host, function () { x.pinta(fig); });
  }
  var MQ = W.matchMedia ? W.matchMedia('(min-width: 768px)') : null;
  var grElegida = null;
  function grInicial() {
    var g = PC.store.get('graf', null), x = grDe(g);
    if (x && x.hay()) return g;
    var p = GR.filter(function (y) { return y.hay(); })[0];
    return p ? p.id : 'series';
  }
  function pintarGraficas(sec) {
    var ancho = MQ ? MQ.matches : W.innerWidth >= 768;
    sec.setAttribute('data-modo', ancho ? 'todas' : 'una');
    var con = GR.filter(function (x) { return x.hay(); }), sin = GR.filter(function (x) { return !x.hay(); });
    var h = ['<header class="section-t mc-st"><h2 id="mc-graficas-t">' + (ancho ? 'Gráficas' : 'Gráficas, una cada vez') + '</h2></header>'];
    if (ancho) {
      h.push('<div class="grid-2 mc-ggrid">' + con.map(function (x) { return '<div class="card mc-gcard" data-g="' + x.id + '">' + figHtml(x) + '</div>'; }).join('') + '</div>');
      if (sin.length) h.push('<p class="mc-sub mc-sin">Sin gráfica todavía: ' + sin.map(function (x) { return esc(x.chip) + ' (' + esc(minus(x.motivo)) + ')'; }).join(' · ') + '</p>');
    } else {
      if (!grElegida) grElegida = grInicial();
      h.push('<div class="chips mc-gchips" role="group" aria-label="Elige la gráfica">' + GR.map(function (x) {
        var no = !x.hay();
        return '<button type="button" class="chip" data-g="' + x.id + '" aria-pressed="' + (x.id === grElegida && !no ? 'true' : 'false') + '"' +
          (no ? ' aria-disabled="true" data-motivo="' + esc(x.motivo) + '" aria-label="' + esc(x.chip + ': ' + x.motivo) + '"' : '') + '>' + esc(x.chip) + '</button>';
      }).join('') + '</div>');
      h.push('<div class="card mc-gcard" data-m="gsel"></div>');
      if (sin.length) h.push('<p class="mc-sub mc-sin">Sin gráfica todavía: ' + sin.map(function (x) { return esc(x.chip) + ' (' + esc(minus(x.motivo)) + ')'; }).join(' · ') + '</p>');
    }
    sec.innerHTML = h.join('');
    if (ancho) {
      PC.$$('.mc-gcard[data-g]', sec).forEach(function (c) { var x = grDe(c.getAttribute('data-g')); try { montarGraf(c, x); } catch (e) { PC._err('marcas gráfica ' + x.id, e); } });
    } else {
      PC.$$('.mc-gchips [data-g]', sec).forEach(function (b) {
        b.addEventListener('click', function () {
          var x = grDe(b.getAttribute('data-g'));
          if (!x.hay()) { PC.toast(x.motivo); return; }
          elegirGraf(x.id);
        });
      });
      verGraf(sec);
    }
  }
  function verGraf(sec) {
    var card = sec.querySelector('[data-m="gsel"]'); if (!card) return;
    var x = grDe(grElegida); if (!x || !x.hay()) { card.innerHTML = '<p class="empty">No hay datos para esta gráfica</p>'; return; }
    card.innerHTML = figHtml(x);
    PC.$$('.mc-gchips [data-g]', sec).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-g') === x.id ? 'true' : 'false'); });
    try { montarGraf(card, x); } catch (e) { PC._err('marcas gráfica ' + x.id, e); }
  }
  function elegirGraf(id) {
    var x = grDe(id); if (!x || !x.hay()) return;
    grElegida = id; PC.store.set('graf', id);
    var sec = raiz && raiz.querySelector('#mc-graficas');
    if (sec && sec.getAttribute('data-modo') === 'una') verGraf(sec);
  }
  if (MQ) {
    var alCambiar = function () { var sec = raiz && raiz.querySelector('#mc-graficas'); if (sec) { try { pintarGraficas(sec); } catch (e) { PC._err('marcas gráficas', e); } } };
    if (MQ.addEventListener) MQ.addEventListener('change', alCambiar); else if (MQ.addListener) MQ.addListener(alCambiar);
  }

  /* ------------------------------------------------------------------ M-4 · registro (T10) */
  var REG = [
    { a: 'carrera', f: 'carrera', ic: 'carrera' },
    { a: 'evolucionEstimacion', f: 'carrera', ic: 'control' },
    { a: 'dominadas', f: 'barra', ic: 'fuerza' },
    { a: 'circuito', f: 'circuito', ic: 'circuito' },
    { a: 'sueno', f: 'sueno', ic: 'sueno' },
    { a: 'garmin', f: 'reloj', ic: 'reloj' },
    { a: 'composicion', f: 'cuerpo', ic: 'lista' }
  ];
  var FILTROS = [['todo', 'Todo'], ['carrera', 'Carrera'], ['barra', 'Barra y fuerza'], ['circuito', 'Circuito'], ['sueno', 'Sueño'], ['reloj', 'Reloj'], ['cuerpo', 'Cuerpo']];
  var PAL = { duracion: 'duración', recuperacion: 'recuperación', recuperaciones: 'recuperaciones', respiracion: 'respiración', estres: 'estrés', minimo: 'mínimo', maximo: 'máximo',
    anaerobica: 'anaeróbica', aerobica: 'aeróbica', aerobico: 'aeróbico', anaerobico: 'anaeróbico', sesion: 'sesión', valoracion: 'valoración', puntuacion: 'puntuación', metabolica: 'metabólica',
    osea: 'ósea', proteinas: 'proteínas', indice: 'índice', interpolacion: 'interpolación', instantaneo: 'instantáneo', predisposicion: 'predisposición', fisiologico: 'fisiológico',
    musculo: 'músculo', ultimos: 'últimos', ritmo: 'ritmo', dia: 'día', calculo: 'cálculo', geometria: 'geometría', munecac: 'muñeca (°C)', muneca: 'muñeca', condicion: 'condición', tecnica: 'técnica',
    fc: 'FC', vfc: 'VFC', fit: 'FIT', gps: 'GPS', spo2: 'SpO2', imc: 'IMC', imm: 'IMM', vo2max: 'VO2 máx', kcal: 'kcal', w: 'W', ms: 'ms', mm: 'mm', rpm: 'rpm', kg: 'kg', pct: '%', s: 's', km: 'km',
    brazod: 'brazo derecho', brazoi: 'brazo izquierdo', piernad: 'pierna derecha', piernai: 'pierna izquierda', aec: 'AEC', act: 'ACT', min: 'min', seg: 's' };
  function etq(k) {
    var w = String(k).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([a-zA-Z])(\d)/g, '$1 $2').replace(/_/g, ' ').toLowerCase().split(/\s+/);
    var t = w.map(function (x) { return PAL[x] !== undefined ? PAL[x] : x; }).join(' ');
    return /^[A-Z]{2}/.test(t) ? t : cap(t);
  }
  function prim(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'boolean') return v ? 'sí' : 'no';
    if (typeof v === 'number') return num(v);
    if (Array.isArray(v)) return v.map(function (x) { return Array.isArray(x) ? x.map(prim).join('/') : (x && typeof x === 'object' ? objTxt(x, 3) : prim(x)); }).join(' · ');
    if (typeof v === 'object') return objTxt(v, 3);
    return String(v);
  }
  function objTxt(o, prof) {
    return Object.keys(o).map(function (k) {
      var v = o[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && prof >= 3) return etq(k) + ': ' + Object.keys(v).map(function (j) { return etq(j) + ' ' + (typeof v[j] === 'object' ? JSON.stringify(v[j]) : prim(v[j])); }).join(', ');
      return etq(k) + ': ' + (Array.isArray(v) ? v.map(function (x) { return Array.isArray(x) ? x.map(prim).join('/') : (x && typeof x === 'object' ? JSON.stringify(x) : prim(x)); }).join(', ') : prim(v));
    }).join(' · ');
  }
  function kvHtml(o, fuera) {
    var ks = Object.keys(o).filter(function (k) { return !fuera || fuera.indexOf(k) < 0; }).filter(function (k) { var v = o[k]; return v !== null && v !== undefined && v !== ''; });
    if (!ks.length) return '';
    return '<dl class="kv mc-kv">' + ks.map(function (k) {
      var v = o[k], txt = v && typeof v === 'object' && !Array.isArray(v) ? objTxt(v, 2) : prim(v);
      return '<dt>' + esc(etq(k)) + '</dt><dd>' + esc(txt) + '</dd>';
    }).join('') + '</dl>';
  }
  function fechaReg(f) {
    if (esIso(f)) return corta(f);
    var m = /^(\d{4})-(\d{2})-(\d{2})\/(\d{1,2})$/.exec(String(f || ''));
    return m ? (+m[3]) + '–' + (+m[4]) + '-' + (+m[2]) : String(f || '');
  }
  function lineaReg(a, e) {
    if (a === 'carrera') return e.sesion || 'Carrera';
    if (a === 'evolucionEstimacion') return e.medido ? 'Control del 1.000 medido: ' + e.estimacion + (e.banda ? ' (banda ' + e.banda.join('–') + ')' : '') : 'Estimación del 1.000: ' + e.estimacion;
    if (a === 'dominadas') {
      if (e.sesion) return e.sesion;
      var s = Array.isArray(e.series) ? 'Dominadas ' + e.series.join('-') : String(e.series || 'Dominadas');
      return s + (Array.isArray(e.series) && e.total != null ? ' · total ' + e.total : '') + (e.contexto && Array.isArray(e.series) ? ' · ' + e.contexto : '');
    }
    if (a === 'circuito') return e.sesion || ('Circuito: ' + (typeof e.segundos === 'number' ? num(e.segundos, 1) + ' s' : '') + (e.condiciones ? ', ' + e.condiciones : ''));
    if (a === 'sueno') return (esIso(e.fecha) ? 'Noche: ' : 'Semana: ') + (e.duracion || '') + (e.puntuacion != null ? ' · puntuación ' + e.puntuacion : '') + (e.calidad ? ' · ' + minus(e.calidad) : '');
    if (a === 'garmin') {
      var z = [e.estadoEntreno, e.estado, e.focoCarga].filter(function (x) { return typeof x === 'string' && x; });
      if (typeof e.vfc === 'number') z.push('VFC ' + e.vfc);
      if (!z.length && e.tiempoRecuperacion) z.push('recuperación ' + prim(e.tiempoRecuperacion));
      return 'Reloj' + (z.length ? ': ' + z.join(' · ') : '');
    }
    if (a === 'composicion') return (e.serie === 'dietista' ? 'Tanita del dietista' : 'Otra báscula') + (typeof e.pesoKg === 'number' ? ' · ' + num(e.pesoKg, 1) + ' kg' : '') + (typeof e.grasaPct === 'number' ? ' · ' + num(e.grasaPct, 1) + ' % de grasa' : '');
    return e.sesion || '';
  }
  function chipsReg(a, e) {
    var c = [];
    if (e.hecho === false) c.push(['warn', 'no hecho']);
    else if (e.valida === false) c.push(['warn', 'no mide']);
    if (a === 'evolucionEstimacion') c.push(e.medido ? ['ok', 'medido'] : ['sup', 'estimación']);
    if (a === 'dominadas' && typeof e.maximo === 'number' && /autoinformad/i.test(String(e.maximoConfirmado || '') + String(e.valoracion || ''))) c.push(['sup', 'autoinformado']);
    if (a === 'circuito' && M.cir && M.cir.fecha === e.fecha && M.cir.fiab && M.cir.fiab !== 'medido') c.push(['sup', M.cir.fiab]);
    if (a === 'composicion' && e.serie !== 'dietista') c.push(['sup', 'no comparable']);
    return c.map(function (x) { return '<span class="chip ' + x[0] + '">' + esc(x[1]) + '</span>'; }).join('');
  }
  function detalleReg(a, e) {
    var h = '';
    if (e.objetivo) h += '<p class="mc-obj"><span class="chip">objetivo</span> ' + esc(e.objetivo) + '</p>';
    var fuera = ['fecha', 'sesion', 'objetivo', 'valoracion', 'resultado', 'valida', 'hecho', 'serie'];
    if (e.resultado && typeof e.resultado === 'object') h += kvHtml(e.resultado);
    else if (e.resultado != null) h += '<p>' + esc(prim(e.resultado)) + '</p>';
    h += kvHtml(e, fuera);
    if (e.valoracion) h += '<p class="mc-val"><span>Valoración</span> ' + esc(e.valoracion) + '</p>';
    return h || '<p class="mc-sub">Sin más datos</p>';
  }
  function pintarRegistro(sec) {
    var filas = [], cuenta = { todo: 0 };
    REG.forEach(function (r) {
      lista(H[r.a]).forEach(function (e, i) {
        filas.push({ r: r, e: e, i: i, k: String(e.fecha || '') });
        cuenta[r.f] = (cuenta[r.f] || 0) + 1; cuenta.todo++;
      });
    });
    filas.sort(function (a, b) { return a.k < b.k ? 1 : a.k > b.k ? -1 : 0; });
    var n = function (a) { return lista(H[a]).length; };
    var resumen = [n('carrera') + ' de carrera', n('evolucionEstimacion') + ' estimaciones del 1.000', n('dominadas') + ' de barra', n('circuito') + ' de circuito', n('sueno') + ' de sueño', n('garmin') + ' lecturas del reloj', n('composicion') + ' de composición'];
    var h = ['<header class="section-t mc-st"><h2 id="mc-registro-t">Registro: ' + cuenta.todo + ' entradas del historial</h2></header>'];
    h.push('<div class="card mc-card mc-reg">');
    h.push('<p class="mc-sub mc-cuenta">' + esc(resumen.join(' · ')) + '</p>');
    h.push('<div class="chips mc-filtros" role="group" aria-label="Filtrar el registro">' + FILTROS.map(function (f) {
      return '<button type="button" class="chip" data-f="' + f[0] + '" aria-pressed="' + (f[0] === 'todo' ? 'true' : 'false') + '">' + esc(f[1]) + ' <span class="num">' + (cuenta[f[0]] || 0) + '</span></button>';
    }).join('') + '</div>');
    h.push('<ul class="mc-rl">' + filas.map(function (x, j) {
      var id = 'mc-rd-' + j, src = x.r.a + ':' + x.k;
      return '<li data-fil="' + x.r.f + '"><button type="button" class="reg-row" aria-expanded="false" aria-controls="' + id + '" data-src="' + esc(src) + '" data-j="' + j + '">' +
        '<span class="reg-f num">' + esc(fechaReg(x.k)) + '</span>' + PC.icon(x.r.ic, 'sm') + '<span class="reg-t">' + esc(lineaReg(x.r.a, x.e)) + '</span>' +
        '<span class="reg-c">' + chipsReg(x.r.a, x.e) + '</span>' + PC.icon('chev', 'sm chev') + '</button><div class="reg-det" id="' + id + '" hidden></div></li>';
    }).join('') + '</ul></div>');
    sec.innerHTML = h.join('');
    PC.$$('.mc-filtros [data-f]', sec).forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.getAttribute('data-f');
        PC.$$('.mc-filtros [data-f]', sec).forEach(function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); });
        PC.$$('.mc-rl > li', sec).forEach(function (li) { li.hidden = f !== 'todo' && li.getAttribute('data-fil') !== f; });
      });
    });
    PC.$$('.reg-row', sec).forEach(function (b) {
      b.addEventListener('click', function () {
        var abierto = b.getAttribute('aria-expanded') === 'true', det = b.nextElementSibling;
        if (!abierto && !det.__lleno) { var x = filas[+b.getAttribute('data-j')]; det.innerHTML = detalleReg(x.r.a, x.e); det.__lleno = true; }
        b.setAttribute('aria-expanded', abierto ? 'false' : 'true'); det.hidden = abierto;
      });
    });
  }

  /* ------------------------------------------------------------------ M-5 · cuerpo (G16): solo la serie de la Tanita del dietista */
  var SEG = { tronco: 'Tronco', brazoD: 'Brazo derecho', brazoI: 'Brazo izquierdo', piernaD: 'Pierna derecha', piernaI: 'Pierna izquierda' };
  function pintarCuerpo(sec) {
    var S = lista(H.composicion).filter(function (c) { return c.serie === 'dietista' && esIso(c.fecha); }).slice().sort(ordenFecha);
    var AC = (P.atleta || {}).composicion || {};
    var h = ['<header class="section-t mc-st"><h2 id="mc-cuerpo-t">Cuerpo</h2></header>'];
    if (!S.length) { sec.innerHTML = h.join('') + '<div class="card"><p class="empty">Sin mediciones de la Tanita del dietista</p></div>'; return; }
    var u = S[S.length - 1];
    var linea = 'Composición con la Tanita del dietista, ' + dm(u.fecha) + ': ' + [typeof u.pesoKg === 'number' ? num(u.pesoKg, 1) + ' kg' : '', typeof u.grasaPct === 'number' ? num(u.grasaPct, 1) + ' % de grasa' : '', u.grasaVisceral != null ? 'grasa visceral ' + num(u.grasaVisceral) : ''].filter(Boolean).join(' · ');
    h.push('<div class="card mc-card"><p class="mc-linea1">' + esc(linea) + '</p>');
    var d = '<div class="mc-minis">' + [['pesoKg', 'Peso'], ['masaMuscularKg', 'Músculo'], ['masaGrasaKg', 'Grasa']].map(function (x) {
      return '<figure class="chart mc-mini" data-k="' + x[0] + '"><figcaption class="chart-h"><h3>' + esc(x[1]) + ' (kg)</h3></figcaption><div class="chart-c"></div></figure>';
    }).join('') + '</div>';
    var V = [['pesoKg', 'Peso', 'kg', 1], ['imc', 'IMC', '', 1, 'estadoIMC'], ['grasaPct', 'Grasa', '%', 1, 'estadoGrasa'], ['masaGrasaKg', 'Masa grasa', 'kg', 1], ['masaMuscularKg', 'Masa muscular', 'kg', 1],
      ['masaLibreGrasaKg', 'Masa libre de grasa', 'kg', 1], ['masaOseaKg', 'Masa ósea', 'kg', 1], ['proteinasKg', 'Proteínas', 'kg', 1], ['aguaPct', 'Agua', '%', 1], ['aguaTotalKg', 'Agua total', 'kg', 1],
      ['aguaIntracelularKg', 'Agua intracelular', 'kg', 1], ['aguaExtracelularKg', 'Agua extracelular', 'kg', 1], ['ratioAEC_ACT', 'Ratio AEC/ACT', '', 1], ['grasaVisceral', 'Grasa visceral', '', 0, 'estadoVisceral'],
      ['indiceMasaMuscular', 'Índice de masa muscular', '', 0, 'estadoIMM'], ['metabolismoBasalKcal', 'Metabolismo basal', 'kcal', 0], ['edadMetabolica', 'Edad metabólica', '', 0], ['estadoFisiologico', 'Estado fisiológico', '', null]];
    var kv = V.filter(function (x) { return u[x[0]] != null; }).map(function (x) {
      var v = u[x[0]], t = typeof v === 'number' ? num(v, x[3] === null ? undefined : x[3]) + (x[2] ? (x[2] === '%' ? ' %' : ' ' + x[2]) : '') : String(v);
      return '<dt>' + esc(x[1]) + '</dt><dd>' + esc(t + (x[4] && u[x[4]] ? ' · ' + minus(u[x[4]]) : '')) + '</dd>';
    }).join('');
    d += '<h3 class="mc-h3">Valores del ' + esc(dm(u.fecha)) + '</h3><dl class="kv mc-kv">' + kv + '</dl>';
    var SM = u.segmentalMusculoKg, SG = u.segmentalGrasaKg;
    if (SM || SG) {
      var partes = Object.keys(SM || SG);
      var seg = '<div class="tscroll"><table class="t"><thead><tr><th scope="col">Zona</th><th scope="col">Músculo</th><th scope="col">Grasa</th></tr></thead><tbody>' + partes.map(function (p) {
        return '<tr><th scope="row">' + esc(SEG[p] || etq(p)) + '</th><td>' + (SM && SM[p] != null ? esc(num(SM[p], 1)) + ' kg' : '') + '</td><td>' + (SG && SG[p] != null ? esc(num(SG[p], 1)) + ' kg' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>' + (u.nota ? '<p>' + esc(u.nota) + '</p>' : '');
      d += acc('Por segmentos', seg, '');
    }
    if (AC.avisoBasculas) d += '<div class="aviso info mc-aviso" role="note">' + PC.icon('info') + '<div>' + esc(AC.avisoBasculas) + '</div></div>';
    h.push(acc('Evolución y valores', d, 'mc-cuerpo-d') + '</div>');
    sec.innerHTML = h.join('');
    PC.$$('.mc-mini', sec).forEach(function (f) { montar(f.querySelector('.chart-c'), function () { g16(f, S, f.getAttribute('data-k')); }); });
    var fig0 = sec.querySelector('.mc-minis');
    tablaDatosCuerpo(fig0.parentNode, S, fig0);
  }
  function g16(fig, S, k) {
    var host = fig.querySelector('.chart-c'); if (!host.clientWidth) return;
    var P2 = S.filter(function (c) { return typeof c[k] === 'number'; }); if (!P2.length) return;
    var vs = P2.map(function (c) { return c[k]; }), lo = Math.min.apply(null, vs), hi = Math.max.apply(null, vs), pad = Math.max(0.6, (hi - lo) * 0.35);
    var ctx = PC.chart.base(fig, { h: 118, m: { t: 22, r: 22, b: 26, l: 22 } }), g = ctx.g;
    var fx = PC.chart.tiempo(P2[0].fecha, P2[P2.length - 1].fecha, 6, ctx.iw - 6), fy = PC.chart.lineal(lo - pad, hi + pad, ctx.ih, 0);
    hl(g, ctx.ih + 0.5, ctx.iw, 'eje');
    svgEl('path', { d: P2.map(function (c, i) { return (i ? 'L' : 'M') + fx(c.fecha).toFixed(1) + ' ' + fy(c[k]).toFixed(1); }).join(''), 'class': 'mc-linea mc-s1' }, g);
    P2.forEach(function (c, i) {
      var x = fx(c.fecha);
      punto(g, x, fy(c[k]), 'mc-s1', 4);
      tx(g, x, fy(c[k]) - 9, num(c[k], 1), i === P2.length - 1 ? 'lab' : null, i === 0 ? 'start' : i === P2.length - 1 ? 'end' : 'middle');
      tx(g, x, ctx.ih + 18, dm(c.fecha), null, i === 0 ? 'start' : i === P2.length - 1 ? 'end' : 'middle');
    });
    PC.chart.etiqueta(ctx, fig.querySelector('h3').textContent + ', Tanita del dietista: ' + P2.map(function (c) { return num(c[k], 1) + ' el ' + dm(c.fecha); }).join(', ') + '.');
  }
  function tablaDatosCuerpo(padre, S, antes) {
    var t = '<div class="tscroll"><table class="t"><thead><tr><th scope="col">Fecha</th><th scope="col">Peso</th><th scope="col">Músculo</th><th scope="col">Grasa</th></tr></thead><tbody>' +
      S.slice().reverse().map(function (c) { return '<tr><td>' + esc(corta(c.fecha)) + '</td><td>' + esc(num(c.pesoKg, 1)) + ' kg</td><td>' + esc(num(c.masaMuscularKg, 1)) + ' kg</td><td>' + esc(num(c.masaGrasaKg, 1)) + ' kg</td></tr>'; }).join('') + '</tbody></table></div>';
    var d = el('details', { 'class': 'acc datos' }, '<summary>Ver datos' + PC.icon('chev', 'sm chev') + '</summary><div class="in">' + t + '</div>');
    padre.insertBefore(d, antes.nextSibling);
  }

  /* ------------------------------------------------------------------ la vista */
  function pintarTodo() {
    [['mc-nota', pintarNota], ['mc-controles', pintarControles], ['mc-graficas', pintarGraficas], ['mc-registro', pintarRegistro], ['mc-cuerpo', pintarCuerpo]].forEach(function (x) {
      var s = raiz.querySelector('#' + x[0]);
      if (s) { try { x[1](s); } catch (e) { PC._err('marcas ' + x[0], e); } }
    });
  }
  PC.vista('marcas', {
    init: function (root) { raiz = root; pintarTodo(); },
    show: function (sub, r) {
      if (!raiz) return false;
      var p = (r && r.partes) || String(sub || '').split('/');
      if (p[0] === 'graficas' && p[1]) elegirGraf(p[1]);
      if (p[0] === 'cuerpo') { var d = raiz.querySelector('#mc-cuerpo details.mc-cuerpo-d'); if (d) d.open = true; }
      return false;
    },
    repintar: function () { if (raiz) pintarTodo(); }
  });
})(window.PC);
