/* 50_tecnica.js · M5 · Técnica (§5.4 · T6, T7, T8 de §6.2 · G15 de §6.3)
   Todo lo que se ve sale de plan.json, historial.json o web.json (literal) o de una cuenta explícita sobre ellos.
   API para otros módulos (§10.3):
   · PC.herr.reparto(host)                                   T6 · reparto del 1.000 con carrera fantasma (pc-reparto)
   · PC.herr.contador(host, {fecha})                         T7 · dominadas válidas al revisar el vídeo (pc-dom-<fecha>).
                                                              Sin fecha (Técnica): elige entre hoy y el día del simulacro.
   · PC.herr.circuito(host, {fecha, intentos:1|3, lectura})  T8 · registro del jueves (pc-cir-<fecha>). Solo Hoy lo escribe;
                                                              con lectura:true (Técnica) solo lo enseña. intentos, si falta, sale
                                                              de la `sesion` del día («UN intento» → 1, «3 intentos» → 3).
   Añadidos (para Hoy, «Cómo fue» y la condición del 17-10):
   · PC.herr.dom(fecha) → {reps:[{v:1}|{v:0,r:6}], contadas, validas, pts, nulas:{regla:n}, masAnula, t} | null
   · PC.herr.cir(fecha) → {intentos:[{t, nulo, motivo}], quien, t} | null
   · PC.herr.cirResumen(fecha) → {comparable, techo, ptsComparable, ptsTecho, banda, asterisco, texto} | null
   Recortes de visualización (se anotan para web.recortes): el paréntesis «(Antes decía …)» del paso 1 del calentamiento y
   la frase «Corregido el … antes decía «…».» de las fichas (E16: «"antes decía…" eliminados»). */
(function () {
  'use strict';
  var PC = window.PC;
  if (!PC) return;
  var DOC = document;
  var P = PC.D.plan || {}, HI = PC.D.historial || {}, WB = PC.D.web || {}, DV = PC.D.derivados || {};
  var T = WB.textos || {};
  var esc = PC.esc, ic = PC.icon;
  var herr = PC.herr = PC.herr || {};

  /* ------------------------------------------------------------------ utilidades */
  function el(tag, cls, html) { var e = DOC.createElement(tag); if (cls) e.className = cls; if (html !== undefined && html !== null) e.innerHTML = html; return e; }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function ej(id) { var l = arr(P.ejercicios); for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  function ritmo(k) { var l = arr(P.ritmos); for (var i = 0; i < l.length; i++) if (l[i].clave === k) return l[i]; return null; }
  function regla(id) { var l = arr(P.reglas); for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  /* segundos de un tiempo escrito («3:49», «0:42»); en un rango («3:29-3:30») vale el último */
  function seg(t) { if (t === null || t === undefined) return null; return PC.fmt.parseT(String(t).split(/[-–]/).pop().trim()); }
  function dm(iso) { return PC.fmt.dia(iso, 'dm'); }
  function t1(s) { return PC.fmt.t(s, Math.abs(s - Math.round(s)) > 1e-6 ? 1 : 0); }
  function c1(v) { return coma(v, Math.abs(v - Math.round(v)) > 1e-6 ? 1 : 0); }
  function coma(v, d) { return PC.fmt.num(v, d === undefined ? 1 : d); }
  function raya(t) { return String(t).replace(/(\d)-(\d)/g, '$1–$2'); }
  function p(t, cls) { return t ? '<p' + (cls ? ' class="' + cls + '"' : '') + '>' + esc(t) + '</p>' : ''; }
  function sup(t) { return '<span class="chip sup">' + esc(t) + '</span>'; }
  function why(titulo, html, extra) {
    return html ? '<details class="acc why"><summary>' + ic('info', 'sm') + '<span>' + esc(titulo) + '</span>' + (extra || '') + ic('chev', 'sm chev') + '</summary><div class="in">' + html + '</div></details>' : '';
  }
  function cardH(icono, titulo, sub, letra) {
    return '<div class="card-h"><span class="ic" aria-hidden="true">' + (letra ? '<b>' + esc(letra) + '</b>' : ic(icono)) + '</span><div class="t"><h3>' + esc(titulo) + '</h3>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div></div>';
  }
  /* quita notas históricas de un texto literal (recorte permitido, §5.8; E16) */
  function limpio(t) {
    return String(t || '').replace(/\s*\(Antes decía[^)]*\)/g, '').replace(/\s*Corregido el \d{1,2}-\d{1,2}[^:.]*:\s*antes decía «[^»]*»\.?/g, '').trim();
  }
  /* lista con las 3 primeras visibles y el resto tras «Más» */
  function tecnica(lista) {
    var L = arr(lista).map(limpio).filter(Boolean);
    if (!L.length) return '';
    var li = function (x) { return '<li>' + esc(x) + '</li>'; };
    var h = '<ol class="te-tec">' + L.slice(0, 3).map(li).join('') + '</ol>';
    if (L.length > 3) h += '<details class="te-mas"><summary>Más (' + (L.length - 3) + ')' + ic('chev', 'sm') + '</summary><ol class="te-tec" start="4">' + L.slice(3).map(li).join('') + '</ol></details>';
    return h;
  }
  function video(id, nombre) {
    var q = (WB.videos || {})[id] || (nombre ? nombre + ' técnica' : '');
    if (!q) return '';
    return '<a class="btn sec" href="https://www.youtube.com/results?search_query=' + encodeURIComponent(q) + '" target="_blank" rel="noopener">' + ic('video', 'sm') + 'Vídeo</a>';
  }
  function norm(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  var STOP = { de: 1, del: 1, la: 1, el: 1, en: 1, al: 1, con: 1, y: 1, o: 1, a: 1, los: 1, las: 1 };
  function claveNombre(t) { return norm(t).replace(/\(.*?\)/g, ' ').split(/[^a-z0-9]+/).filter(function (w) { return w && !STOP[w]; }).slice(0, 2).join(' '); }
  function ejDeNombre(nombre) {
    var k = claveNombre(nombre), l = arr(P.ejercicios);
    for (var i = 0; i < l.length; i++) if (claveNombre(l[i].nombre) === k) return l[i];
    return null;
  }
  function tieneLamina(id) { return !!(PC.ill && PC.ill.laminas && PC.ill.laminas().indexOf(id) >= 0); }
  function boeId() {
    var m = /BOE-A-\d{4}-\d+/.exec(((P.baremo || {}).fuente || '') + ' ' + ((P.protocoloDominadas || {}).tecnicaExamen || ''));
    return m ? m[0] : null;
  }
  function rangoTxt(k) {   /* «9,0-9,3» → {gte, lte}; «9,8 o más» → {gte}; «8,2 o menos» → {lte} */
    var s = String(k).replace(/\s/g, ' ').trim(), m, n = function (x) { return +String(x).replace(',', '.'); };
    if ((m = /^([\d,]+)\s*[-–]\s*([\d,]+)/.exec(s))) return { gte: n(m[1]), lte: n(m[2]) };
    if ((m = /^([\d,]+)\s*o\s*más/.exec(s))) return { gte: n(m[1]) };
    if ((m = /^([\d,]+)\s*o\s*menos/.exec(s))) return { lte: n(m[1]) };
    return null;
  }
  function dentro(v, r) { return r && (r.gte === undefined || v >= r.gte - 1e-9) && (r.lte === undefined || v <= r.lte + 1e-9) && (r.gt === undefined || v > r.gt + 1e-9); }
  /* texto corto (≤ 6 palabras, subcadena literal) para dentro de un tramo .umb */
  function corto(t) {
    var s = String(t || '');
    var m = /^[^.:]*?(?:\.\s|:\s)(.+)$/.exec(s);
    if (m && /^\d/.test(s)) s = m[1];
    s = s.replace(/\.$/, '');
    var w = s.split(/\s+/);
    if (w.length <= 6) return s;
    var i = s.indexOf(' de ');
    if (i > 0 && s.slice(0, i).split(/\s+/).length >= 2 && s.slice(0, i).split(/\s+/).length <= 6) return s.slice(0, i);
    return w.slice(0, 6).join(' ');
  }
  /* barra .umb (§4.8). tramos: [{b, corto, efecto, tono, r:{gte,lte,gt}, w}] · valor: dato del usuario o null */
  function umb(etq, tramos, valor) {
    var tu = -1;
    if (valor !== null && valor !== undefined && isFinite(valor)) tramos.forEach(function (t, i) { if (tu < 0 && dentro(valor, t.r)) tu = i; });
    var aria = etq + ': ' + tramos.map(function (t) { return t.b + ' ' + t.corto; }).join('; ');
    var h = '<div class="umb-w"><div class="umb" role="group" aria-label="' + esc(aria) + '">';
    tramos.forEach(function (t, i) {
      h += '<button type="button" class="' + t.tono + (i === tu ? ' tu' : '') + '" style="--w:' + (t.w || 1) + '" aria-pressed="false" data-i="' + i + '"' + (t.umbral ? ' data-umbral="229"' : '') + '><b>' + esc(t.b) + '</b>' + esc(t.corto) + '</button>';
    });
    var ini = tramos[tu >= 0 ? tu : 0];
    h += '</div><p class="umb-t">' + (tu >= 0 ? '<b>Tu dato: ' + esc(t1v(valor)) + '.</b> ' + esc(ini.efecto) : 'Toca un tramo para ver qué pasa.') + '</p></div>';
    return h;
    function t1v(v) { return tramos.unidad === 's' ? coma(v) + ' s' : String(v); }
  }
  function enlazarUmb(root, tramos) {
    PC.$$('.umb-w', root).forEach(function (w) {
      if (w._te) return; w._te = true;
      w.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('.umb>button'); if (!b) return;
        var L = w._tramos || tramos, i = +b.getAttribute('data-i');
        PC.$$('.umb>button', w).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        var t = w.querySelector('.umb-t'); if (t && L && L[i]) t.textContent = L[i].b + ': ' + L[i].efecto;
      });
    });
  }
  /* tramos de juevesCircuito.decisionSegunEl24 */
  function tramosCircuito() {
    var dec = ((P.sesionesTipo || {}).juevesCircuito || {}).decisionSegunEl24 || {};
    var K = Object.keys(dec);
    var L = K.map(function (k, i) {
      var r = rangoTxt(k) || {};
      var w = (r.gte !== undefined && r.lte !== undefined) ? Math.max(1, Math.round((r.lte - r.gte) * 10) + 1) : 5;
      return { b: raya(k) + ' s', corto: corto(dec[k]), efecto: dec[k], tono: i === 0 ? 'ok' : 'warn', r: r, w: w };   /* rojo solo para lo que elimina (§4.2) */
    });
    L.unidad = 's';
    return L;
  }

  /* ------------------------------------------------------------------ cabecera: las tres pruebas en orden (N4) */
  function pintarCabecera() {
    var host = DOC.getElementById('vt-tecnica'); if (!host) return;
    var ex = (P.planDeCarrera || {}).examen || {};
    var orden = String(ex.orden || 'circuito → dominadas → 1.000 m').split(/\s*→\s*/);
    var partes = orden.map(function (o) {
      var a = /circ/i.test(o) ? ['circuito', 'circuito'] : (/domin/i.test(o) ? ['dominada', 'tecnica'] : ['mil', 'carrera']);
      return '<a class="te-pr" href="#tecnica/' + a[0] + '">' + ic(a[1]) + '<span>' + esc(o) + '</span></a>';
    });
    /* M8: la flecha va pegada a la prueba que sigue (.te-pr-g no se parte), para que a 390 px no quede
       una flecha colgando al final de la línea */
    host.innerHTML = '<div id="te-pruebas" data-inv="N4"><p class="te-pr-l"><span>El día de la prueba: </span>' +
      partes.map(function (x, i) { return i ? ' <span class="te-pr-g"><span class="te-pr-f" aria-hidden="true">→ </span>' + x + '</span>' : x; }).join('') +
      '</p>' + p(T.N4, 'te-pr-n') + '</div>';
  }

  /* ------------------------------------------------------------------ T7 · contador de dominadas válidas */
  var CORTAS = { 1: ['brazos completamente extendidos'], 2: ['permanecer totalmente extendido'], 3: ['oscilaciones, balanceos ni movimientos de impulso'],
    4: ['cabeza permanecerá en posición anatómica'], 5: ['barbilla debe superar claramente la barra'], 6: ['mínima pausa entre cada repetición'],
    7: ['soltarse de la barra', 'más de 5 segundos suspendido'] };
  function reglasBOE() {
    var te = (P.protocoloDominadas || {}).tecnicaExamen || '';
    var a = te.indexOf('Reglas:'), b = te.indexOf('Intento nulo:');
    var rs = te.slice(a >= 0 ? a + 7 : 0, b > a ? b : te.length), out = {};
    rs.replace(/(\d)\.\s([\s\S]*?)(?=\s\d\.\s|$)/g, function (m, n, t) { out[n] = t.trim(); return m; });
    return out;
  }
  function reglaCorta(n, txt) {
    var c = CORTAS[n] || [];
    var ok = c.filter(function (s) { return txt.indexOf(s) >= 0; });
    return c.length && ok.length === c.length ? ok.join(' · ') : txt;
  }
  function domCalc(reps) {
    var nul = {}, v = 0;
    reps.forEach(function (r) { if (r.v) v++; else nul[r.r] = (nul[r.r] || 0) + 1; });
    var top = null;
    Object.keys(nul).forEach(function (k) { if (top === null || nul[k] > nul[top]) top = k; });
    return { contadas: reps.length, validas: v, pts: reps.length ? PC.baremo.pts('dom', v) : null, nulas: nul, masAnula: top === null ? null : +top };
  }
  herr.dom = function (fecha) { var o = PC.store.get('dom-' + fecha, null); return o && Array.isArray(o.reps) ? o : null; };
  function domGuardar(fecha, reps) {
    if (!reps.length) { PC.store.del('dom-' + fecha); return domCalc([]); }
    var o = domCalc(reps); o.reps = reps; o.t = Date.now();
    PC.store.set('dom-' + fecha, o);
    return o;
  }
  /* el día que decide con las dominadas válidas (web.decide con una barra de dominadas) */
  function decideDom() {
    var L = arr(WB.decide);
    for (var i = 0; i < L.length; i++) {
      var bs = arr(L[i].barras);
      for (var j = 0; j < bs.length; j++) if (bs[j].prueba === 'dom') return { fecha: L[i].fecha, titulo: L[i].titulo, barra: bs[j] };
    }
    return null;
  }
  herr.contador = function (host, op) {
    if (!host) return;
    op = op || {};
    var R = reglasBOE(), nums = Object.keys(R).filter(function (n) { return +n >= 1 && +n <= 7; });
    var dd = decideDom();
    var hoy = PC.hoyIso();
    var fecha = op.fecha || hoy;
    var elegir = !op.fecha && dd && dd.fecha !== hoy;
    var conf = false, abierto = false;
    host.classList.add('te-dom');
    function reps() { var o = herr.dom(fecha); return o ? o.reps.slice() : []; }
    function pintar() {
      var L = reps(), C = domCalc(L);
      var h = '';
      if (elegir) {
        h += '<div class="seg" role="group" aria-label="Qué vídeo revisas"><button type="button" data-f="' + hoy + '" aria-pressed="' + (fecha === hoy) + '">Hoy · ' + esc(PC.fmt.dia(hoy, 'corta')) + '</button>' +
          '<button type="button" data-f="' + dd.fecha + '" aria-pressed="' + (fecha === dd.fecha) + '">Simulacro del ' + esc(dm(dd.fecha)) + '</button></div>';
      }
      h += '<div class="te-dom-b"><button type="button" class="te-big ok" data-a="v">' + ic('check') + 'Válida</button>' +
        '<button type="button" class="te-big bad" data-a="n" aria-expanded="' + abierto + '">' + ic('x') + 'Nula…</button></div>';
      h += '<div class="te-dom-n"' + (abierto ? '' : ' hidden') + '><p>¿Qué regla del BOE incumple?</p>' + nums.map(function (n) {
        return '<button type="button" data-r="' + n + '" aria-label="' + esc('Nula por la regla ' + n + ': ' + R[n]) + '"><b>' + n + '</b><span>' + esc(reglaCorta(n, R[n])) + '</span></button>';
      }).join('') + '</div>';
      h += '<ol class="te-tira" aria-label="Repeticiones">' + (L.length ? L.map(function (r, i) {
        return r.v ? '<li class="v"><span class="vh-oculto">Repetición ' + (i + 1) + ': válida</span><span aria-hidden="true">' + (i + 1) + '</span>' + ic('check') + '</li>'
          : '<li class="n"><span class="vh-oculto">Repetición ' + (i + 1) + ': nula por la regla ' + r.r + '</span><span aria-hidden="true">' + (i + 1) + ' · R' + r.r + '</span></li>';
      }).join('') : '<li class="vacia">Aún no has marcado ninguna repetición.</li>') + '</ol>';
      var elim = C.contadas && C.pts === 0;
      h += '<div class="stats" aria-live="polite"><div class="stat"><b>' + C.contadas + '</b><span>contadas</span></div><div class="stat"><b>' + C.validas + '</b><span>válidas</span></div>' +
        '<div class="stat"><b class="' + (elim ? 'elim' : '') + '">' + (C.pts === null ? '—' : C.pts + ' pts') + '</b><span>' + (elim ? 'elimina' : 'de las válidas') + '</span></div></div>';
      if (C.masAnula !== null) h += '<p class="te-dom-mas">Regla que más anula: <b>' + C.masAnula + '</b> · ' + esc(reglaCorta(C.masAnula, R[C.masAnula] || '')) + ' (' + C.nulas[C.masAnula] + ')</p>';
      if (dd && fecha === dd.fecha) {
        var tr = arr(dd.barra.tramos).map(function (t, i, a) {
          var r = {}; if (t.gte !== undefined) r.gte = +String(t.gte).replace(',', '.'); if (t.lte !== undefined) r.lte = +String(t.lte).replace(',', '.');
          return { b: t.txt, corto: t.corto, efecto: t.efecto, tono: tonoTramo(t.tono, i), r: r, w: 1 };
        });
        h += '<div class="te-dec"><h4>' + esc(dd.titulo) + ' · ' + esc(dd.barra.etiqueta || '') + '</h4>' + umb(dd.barra.etiqueta || 'Dominadas válidas', tr, C.contadas ? C.validas : null);
        if (dd.barra.aparte) {
          var dif = C.contadas - C.validas;
          h += '<p class="te-aparte">' + (C.contadas && dif >= 2 ? '<span class="chip warn">diferencia ' + dif + '</span>' : (C.contadas ? '<span class="chip">diferencia ' + dif + '</span>' : '')) + '<span>Aparte: ' + esc(dd.barra.aparte) + '</span></p>';
        }
        h += '</div>';
        host._tramos = tr;
      }
      h += '<div class="te-acc"><button type="button" class="btn sec" data-a="d"' + (L.length ? '' : ' disabled') + '>Deshacer</button>' +
        '<button type="button" class="btn sec" data-a="c"' + (L.length ? '' : ' disabled') + '>' + ic('copiar', 'sm') + 'Copiar</button>' +
        '<button type="button" class="btn ghost" data-a="o"' + (L.length ? '' : ' disabled') + '>Empezar otra</button></div>';
      if (conf && L.length) h += '<div class="te-conf" role="alert"><span>¿Borrar las ' + L.length + ' repeticiones de este vídeo?</span><button type="button" class="btn sec" data-a="si">Sí, borrar</button><button type="button" class="btn ghost" data-a="no">No</button></div>';
      h += '<p class="faint">Se guarda solo en este móvil. «Copiar» lo deja listo para el entrenador.</p>';
      host.innerHTML = h;
      var w = host.querySelector('.umb-w'); if (w) w._tramos = host._tramos;
      enlazarUmb(host);
    }
    function texto() {
      var o = herr.dom(fecha); if (!o) return '';
      var nul = Object.keys(o.nulas || {}).sort(function (a, b) { return o.nulas[b] - o.nulas[a]; }).map(function (k) { return 'regla ' + k + ' ×' + o.nulas[k]; }).join(', ');
      return 'Dominadas ' + dm(fecha) + ': contadas ' + o.contadas + ' · válidas ' + o.validas + ' (' + o.pts + ' pts) · nulas: ' + (nul || 'ninguna');
    }
    if (!host._teDom) {
      host._teDom = true;
      host.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('button'); if (!b || !host.contains(b) || b.disabled) return;
        var L = reps();
        if (b.hasAttribute('data-f')) { fecha = b.getAttribute('data-f'); conf = false; abierto = false; pintar(); return; }
        if (b.hasAttribute('data-r')) { L.push({ v: 0, r: +b.getAttribute('data-r') }); domGuardar(fecha, L); abierto = false; conf = false; pintar(); foco('[data-a="n"]'); return; }
        var a = b.getAttribute('data-a');
        if (a === 'v') { L.push({ v: 1 }); domGuardar(fecha, L); conf = false; pintar(); foco('[data-a="v"]'); }
        else if (a === 'n') { abierto = !abierto; pintar(); foco(abierto ? '.te-dom-n button' : '[data-a="n"]'); }
        else if (a === 'd') { L.pop(); domGuardar(fecha, L); pintar(); foco('[data-a="v"]'); }
        else if (a === 'o') { conf = true; pintar(); foco('[data-a="si"]'); }
        else if (a === 'si') { domGuardar(fecha, []); conf = false; pintar(); foco('[data-a="v"]'); }
        else if (a === 'no') { conf = false; pintar(); foco('[data-a="o"]'); }
        else if (a === 'c') { var t = texto(); if (t) PC.copiar(t); }
      });
    }
    function foco(sel) { var x = host.querySelector(sel); if (x && !x.disabled) { try { x.focus({ preventScroll: true }); } catch (e) {} } }
    pintar();
  };

  /* ------------------------------------------------------------------ G15 · escalera del lastre */
  function pintarLastre(box) {
    var L = arr(DV.lastre), hoy = PC.hoyIso(), PD = P.protocoloDominadas || {};
    if (!L.length) { box.remove(); return; }
    var items = L.map(function (r, i) {
      var est = r.hist && r.hist.length ? 'hecho' : (r.hasta && r.hasta < hoy ? 'sin registrar' : (r.desde && r.desde <= hoy && hoy <= r.hasta ? 'esta semana' : 'por venir'));
      var cls = est === 'esta semana' ? 'ahora' : (est === 'hecho' || est === 'sin registrar' ? 'pasada' : 'futura');
      var sem = /^\d{4}-\d{2}-\d{2}$/.test(r.semana) ? (r.desde && r.hasta ? dm(r.desde) + ' a ' + dm(r.hasta) : dm(r.semana)) : cap1(r.semana);
      var chip = est === 'hecho' ? '<span class="chip ok">hecho' + (r.kg ? ' · ' + esc(coma(r.kg, r.kg % 1 ? 1 : 0)) + ' kg' : '') + '</span>'
        : (est === 'esta semana' ? '<span class="chip pri">esta semana</span>' : '<span class="chip">' + est + '</span>');
      var f = /^[—–-]?$/.test(String(r.fuerza || '').trim()) ? '' : String(r.fuerza);
      var m = /^(\d+ × \d+(?: con [\d,]+ kg)?)/.exec(f);
      var cab = m ? m[1] : '';
      var resto = cab && f.length > cab.length ? f : (cab ? '' : f);
      var h = '<li class="' + cls + '" style="--n:' + i + '"' + (cls === 'ahora' ? ' aria-current="true"' : '') + '><div class="te-esc-h"><b>' + esc(sem) + '</b>' + chip + '</div>';
      if (cab) h += '<p class="te-esc-p">' + esc(cab) + '</p>';
      if (resto) h += '<p class="te-esc-f">' + esc(resto) + '</p>';
      var x = [];
      if (r.habituacion) x.push('Habituación: ' + r.habituacion);
      if (r.sabado) x.push('Sábado ' + r.sabado);
      if (x.length) h += '<p class="te-esc-x">' + esc(x.join(' · ')) + '</p>';
      if (r.porQue) h += why('Por qué', p(r.porQue));
      return h + '</li>';
    });
    box.innerHTML = cardH('fuerza', 'Escalera del lastre', 'Semana a semana, con su condición. La de esta semana va resaltada; las pasadas, en gris.') +
      '<ol class="te-esc" aria-label="Progresión del lastre">' + items.join('') + '</ol>' +
      why('Por qué lastre y no más repeticiones', p(PD.diagnostico));
  }
  /* [cabeza, resto] de un texto literal, sin cambiar ni un carácter: la cabeza acaba en «: » (si es corta) o en el primer «. » */
  function cabeza(t, soloPunto) {
    t = String(t || '');
    var i = soloPunto ? -1 : t.indexOf(': ');
    if (i > 0 && i <= 45 && t.slice(0, i).indexOf('(') < 0) return [t.slice(0, i + 1), t.slice(i + 1)];
    var j = t.search(/\.\s/);
    if (j > 0 && j <= 90) return [t.slice(0, j + 1), t.slice(j + 1)];
    return [t, ''];
  }
  function cap1(t) { t = String(t || ''); return t.charAt(0).toUpperCase() + t.slice(1); }

  /* ------------------------------------------------------------------ TE-1 · dominada */
  function tituloRegla(r) {
    var m = /\.\s/.exec(r), a = m ? r.slice(0, m.index + 1) : r, b = m ? r.slice(m.index + 2) : '';
    var c = a.indexOf(': ');
    if (a.length > 80 && c > 0 && c < 60) { b = a.slice(c + 2) + (b ? ' ' + b : ''); a = a.slice(0, c); }
    return [a, b];
  }
  function pintarDominada(c) {
    var PD = P.protocoloDominadas || {}, ex = (P.planDeCarrera || {}).examen || {}, R28 = P.revision28sep || {};
    var h = '';
    h += '<div class="card te-lam" id="te-lamina"><div class="te-lam-in"></div></div>';
    h += '<div class="te-dom-g"><div class="card" id="te-contador"></div><div class="card" id="te-lastre"></div>';
    var reglas = arr(PD.reglas).map(function (r, i) {
      var t = tituloRegla(r), id = /^Test máximo/.test(r) ? 'r-no-testear' : 'r-barra-' + (i + 1);
      return '<article class="rule" id="' + id + '"><h3><span class="num" aria-hidden="true">' + (i + 1) + '</span>' + esc(t[0]) + '</h3>' + p(t[1]) + '</article>';
    }).join('');
    h += '<div class="card te-reglas" id="te-reglas">' + cardH('lista', 'Reglas de la barra', arr(PD.reglas).length + ' reglas para toda sesión de barra') + reglas +
      why('Tu estándar en cada repetición', p(PD.estandarPropio)) + '</div>';
    var ph = ej('prep-hombro');
    h += '<div class="te-dom-prep">';
    if (ph) {
      h += '<div class="card te-ej" id="te-ej-prep-hombro">' + cardH('fuerza', ph.nombre, 'Antes de cualquier trabajo en barra') +
        '<div class="chips">' + arr(ph.material).map(function (m) { return '<span class="chip">' + esc(m) + '</span>'; }).join('') + '</div>' +
        '<ol class="te-tec">' + arr(ph.tecnica).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol>' +
        why('Por qué la barra va antes de correr', p(PD.porQueAntesDeCorrer)) + '</div>';
    }
    var exp = (R28.expectativa ? '<h4>Revisión del 28-9</h4>' + p(R28.expectativa) : '') + (PD.objetivoDaniel28sep ? '<h4>Lo que pides</h4>' + p(PD.objetivoDaniel28sep) : '');
    if (exp) h += '<div id="te-expectativa">' + why('Válidas esperables en la prueba', exp, sup('supuesto')) + '</div>';
    h += '<p class="te-link"><a class="btn ghost" href="#plan/semana">' + ic('plan', 'sm') + 'Cuándo hay barra: Semana tipo →</a></p>';
    h += '</div></div>';
    c.innerHTML = h;
    /* lámina I5 (M6) con la frase del examen debajo del título */
    var lam = c.querySelector('.te-lam-in');
    if (PC.ill && PC.ill.lamina && tieneLamina('dominada')) {
      PC.ill.lamina(lam, 'dominada');
      if (ex.dominadas) {
        var sub = lam.querySelector('.ill-lam-sub') || lam.querySelector('.ill-lam-t');
        var fr = el('p', 'te-clave', ic('alerta', 'sm') + '<span>' + esc(ex.dominadas) + '</span>');
        if (sub && sub.parentNode) sub.parentNode.insertBefore(fr, sub.nextSibling); else lam.insertBefore(fr, lam.firstChild);
      }
    } else {
      lam.innerHTML = '<h3 class="te-card-h3">Qué mira el tribunal en tu vídeo</h3>' + (ex.dominadas ? '<p class="te-clave">' + ic('alerta', 'sm') + '<span>' + esc(ex.dominadas) + '</span></p>' : '') + p(PD.tecnicaExamen);
    }
    var cont = c.querySelector('#te-contador');
    cont.innerHTML = cardH('video', 'Contador de válidas', 'Revisa el vídeo y marca cada repetición: válida o nula, con la regla que incumple.') + '<div class="te-dom-h"></div>' +
      why('Punto de partida', p(PD.puntoDePartida));
    herr.contador(cont.querySelector('.te-dom-h'), {});
    pintarLastre(c.querySelector('#te-lastre'));
  }

  /* ------------------------------------------------------------------ T6 · reparto del 1.000 con carrera fantasma */
  function examen() { return (P.planDeCarrera || {}).examen || {}; }
  function eliminaS() { return seg(examen().elimina) || (PC.baremo && PC.baremo.ELIMINA_MIL) || null; }
  function presetsReparto() {
    var ex = examen(), R = ex.reparto || {}, out = [];
    var cum = ['200', '400', '600', '800'].map(function (k) { return seg(R[k]); }), meta = seg(R.meta);
    if (meta && cum.every(function (x) { return x !== null; })) {
      var tr = [], prev = 0;
      cum.concat([meta]).forEach(function (c) { tr.push(Math.round((c - prev) * 10) / 10); prev = c; });
      var plano = tr.every(function (x) { return x === tr[0]; });
      out.push({ id: 'examen', txt: 'Examen · ' + PC.fmt.t(meta) + (plano ? ' plano' : ''), tr: tr, meta: meta });
    }
    var ctl = null;
    arr(HI.carrera).forEach(function (c) {
      var pz = c.resultado && c.resultado.parciales200;
      if (pz && arr(pz.tramosS).length === 5 && (!ctl || c.fecha > ctl.fecha)) ctl = c;
    });
    if (ctl) {
      var trc = ctl.resultado.parciales200.tramosS.map(Number);
      out.push({ id: 'control', txt: 'Control ' + dm(ctl.fecha), tr: trc, real: true, fecha: ctl.fecha });
      var cp = (((P.objetivo || {}).objetivoNuevo23sep) || {}).comoSePersigue || '';
      var ms = cp.match(/\d+(?:,\d)?(?:\s*\/\s*\d+(?:,\d)?){4}/g) || [];
      var alt = null;
      ms.forEach(function (m) {
        var a = m.split('/').map(function (x) { return +x.trim().replace(',', '.'); });
        if (!alt && a.join() !== trc.join()) alt = a;
      });
      if (alt) {
        var de = [], en = [];
        alt.forEach(function (v, i) { if (v !== trc[i]) { if (de.indexOf(trc[i]) < 0) de.push(trc[i]); if (en.indexOf(v) < 0) en.push(v); } });
        out.push({ id: 'central', txt: dm(ctl.fecha) + ' con los ' + de.map(function (x) { return coma(x, x % 1 ? 1 : 0); }).join(' y ') + ' en ' + en.map(function (x) { return coma(x, x % 1 ? 1 : 0); }).join(' y '), tr: alt });
      }
    }
    var mA = /(\d+,\d)\s*s por 200/.exec(((ritmo('A') || {}).porQue) || '');
    if (mA) { var v = +mA[1].replace(',', '.'); out.push({ id: 'plano', txt: PC.fmt.t(v * 5) + ' plano', tr: [v, v, v, v, v] }); }
    return out;
  }
  /* avisos literales de planDeCarrera.examen.reglaDeSalida y condición del bloque C */
  function avisosReparto() {
    var rs = examen().reglaDeSalida || '', o = {};
    var m6 = /[^.]*\b600\b[^.]*?(\d:\d{2})[^.]*/.exec(rs);
    if (m6) o.s600 = { txt: m6[0].trim(), lim: PC.fmt.parseT(m6[1]) };
    var m2 = /El primer 200 va en (\d:\d{2}(?:,\d)?)/.exec(rs);
    if (m2) o.p200 = { txt: m2[0], lim: PC.fmt.parseT(m2[1]) };
    var mc = /400-600 y 600-800 en (\d+(?:,\d)?)/.exec(((ritmo('C') || {}).condicion) || '');
    if (mc) o.centro = +mc[1].replace(',', '.');
    return o;
  }
  herr.reparto = function (host) {
    if (!host) return;
    var PR = presetsReparto(), ex = examen(), R = ex.reparto || {}, E = eliminaS(), AV = avisosReparto();
    if (!PR.length || !E) { host.innerHTML = '<p class="empty">Faltan el reparto del examen o la marca que elimina en los datos.</p>'; return; }
    var guardado = PC.store.get('reparto', null);
    var st = guardado && arr(guardado.tr).length === 5 && guardado.tr.every(function (x) { return isFinite(x) && x > 0; }) ? { tr: guardado.tr.map(Number), preset: guardado.preset || null } : { tr: PR[0].tr.slice(), preset: PR[0].id };
    var ghost = PR[0].meta || PR[0].tr.reduce(function (a, b) { return a + b; }, 0);
    var nombres = ['0–200 m', '200–400', '400–600', '600–800', '800–1.000'];
    host.classList.add('te-rp');
    host.innerHTML = '<div class="chips" role="group" aria-label="Repartos">' + PR.map(function (x) { return '<button type="button" class="chip" data-p="' + x.id + '" aria-pressed="false">' + esc(x.txt) + '</button>'; }).join('') + '</div>' +
      '<div class="te-rp-g"><div class="te-rp-ed"><p>Cada 200, en segundos</p>' + nombres.map(function (n, i) {
        return '<div class="te-rp-row"><span>' + n + '</span><div class="stepper te-stp" role="group" aria-label="Tramo ' + n + '"><button type="button" data-i="' + i + '" data-d="-0.5" aria-label="Medio segundo menos">−</button>' +
          '<input inputmode="decimal" autocomplete="off" data-i="' + i + '" aria-label="Segundos del tramo ' + n + '"><button type="button" data-i="' + i + '" data-d="0.5" aria-label="Medio segundo más">+</button></div></div>';
      }).join('') + '</div><div class="te-rp-sal" aria-live="polite"></div></div>' +
      '<div class="te-rp-av"></div>' +
      '<figure class="te-fant" aria-labelledby="te-fant-t"><figcaption class="chart-h"><h4 id="te-fant-t">Carrera fantasma</h4><small>Dónde está cada uno cuando cruzas la meta.</small></figcaption><div class="te-fant-c"></div>' +
      '<div class="te-fant-b"><button type="button" class="btn sec" data-a="correr">' + ic('play', 'sm') + 'Correr</button><small>8 s para todo el 1.000</small></div></figure>';
    if (PC.reduceMotion()) host.querySelector('.te-fant-b').hidden = true;
    var inputs = PC.$$('input', host), anim = null;
    function presetDe(id) { for (var i = 0; i < PR.length; i++) if (PR[i].id === id) return PR[i]; return null; }
    function real() { var x = presetDe(st.preset); return !!(x && x.real); }
    function calc() {
      var cum = [], s = 0;
      st.tr.forEach(function (t) { s = Math.round((s + t) * 10) / 10; cum.push(s); });
      var meta = cum[4];
      return { cum: cum, meta: meta, pts: PC.baremo.pts('mil', meta), margen: Math.round((E - meta) * 10) / 10, metros: Math.round(1000 - meta * 1000 / E) };
    }
    function guardar() { PC.store.set('reparto', { tr: st.tr, preset: st.preset }); }
    function pintar(salvo) {
      var C = calc();
      PC.$$('[data-p]', host).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-p') === st.preset ? 'true' : 'false'); });
      inputs.forEach(function (inp, i) { if (inp !== salvo) inp.value = coma(st.tr[i]); inp.removeAttribute('aria-invalid'); });
      var elim = C.meta >= E;
      var sal = '<div class="stats"><div class="stat"><b>' + esc(t1(C.meta)) + '</b><span>meta</span></div>' +
        '<div class="stat"><b class="' + (C.pts === 0 ? 'elim' : '') + '">' + (C.pts === null ? '—' : C.pts + ' pts') + '</b><span>' + (C.pts === 0 ? 'elimina' : 'baremo') + '</span></div>' +
        '<div class="stat"><b class="' + (elim ? 'elim' : '') + '">' + (elim ? 'elimina' : c1(C.margen) + ' s') + '</b><span>' + (elim ? PC.fmt.t(E) + ' o más' : 'de margen al ' + PC.fmt.t(E) + ' · ' + C.metros + ' m') + '</span></div></div>';
      var claves = ['200', '400', '600', '800', 'meta'];
      sal += '<div class="tscroll"><table class="t te-rp-t"><thead><tr><th scope="col">Paso</th><th scope="col">Tú</th><th scope="col">Examen</th><th scope="col" class="elim" data-umbral="229">Ritmo del ' + PC.fmt.t(E) + '</th></tr></thead><tbody>' +
        claves.map(function (k, i) {
          return '<tr><td>' + (k === 'meta' ? 'Meta' : k) + '</td><td>' + esc(t1(C.cum[i])) + '</td><td>' + esc(raya(R[k] || '—')) + '</td><td class="elim">' + esc(t1(E / 5 * (i + 1))) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      host.querySelector('.te-rp-sal').innerHTML = sal;
      var av = [];
      if (AV.s600 && C.cum[2] < AV.s600.lim) av.push('<div class="aviso warn" role="note">' + ic('alerta') + '<div>' + esc(AV.s600.txt) + '<small>Pasas el 600 en ' + esc(t1(C.cum[2])) + '</small></div></div>');
      if (AV.p200 && st.tr[0] < AV.p200.lim) av.push('<div class="aviso warn" role="note">' + ic('alerta') + '<div>' + esc(AV.p200.txt) + '<small>Tu primer 200: ' + esc(t1(st.tr[0])) + '</small></div></div>');
      if (AV.centro) {
        var ok = st.tr[2] <= AV.centro && st.tr[3] <= AV.centro;
        av.push('<div class="chips"><span class="chip ' + (ok ? 'ok' : 'warn') + '">' + (ok ? 'tramos centrales en ' + c1(AV.centro) + ': condición del bloque C'
          : 'tramos centrales en ' + c1(st.tr[2]) + ' y ' + c1(st.tr[3]) + ': el bloque C pide ' + c1(AV.centro)) + '</span></div>');
      }
      host.querySelector('.te-rp-av').innerHTML = av.join('');
      fantasma();
    }
    function fantasma(tSim) {
      var box = host.querySelector('.te-fant-c'); if (!box) return;
      var C = calc(), w = Math.max(240, Math.floor(box.clientWidth || 320));
      var hR = Math.round(Math.max(40, Math.min(64, w / 16))), g1 = 28 + hR, g2 = g1 + hR + 32, Hh = g2 + 36;
      var x0 = 10, x1 = w - 16, X = function (m) { return x0 + (x1 - x0) * Math.max(0, Math.min(1000, m)) / 1000; };
      var t = tSim === undefined ? C.meta : tSim;
      var posTu = function (tt) { var c0 = 0; for (var i = 0; i < 5; i++) { if (tt <= C.cum[i] + 1e-9) return 200 * i + 200 * (tt - c0) / (C.cum[i] - c0 || 1); c0 = C.cum[i]; } return 1000; };
      var pT = posTu(t), pG = Math.min(1000, 1000 * t / ghost), p49 = Math.min(1000, 1000 * t / E);
      var fin = tSim === undefined;
      var tuTxt = 'Tú · ' + t1(C.meta);
      var dG = C.meta - ghost, gTxt = PC.fmt.t(ghost) + (Math.abs(dG) < 0.05 ? ' · a la par' : (dG > 0 ? ' · llega ' + c1(Math.round(dG * 10) / 10) + ' s antes' : ' · ' + Math.round(1000 - 1000 * C.meta / ghost) + ' m detrás'));
      var l49 = PC.fmt.t(E) + (fin ? (C.meta >= E ? ' · elimina' : ' · ' + C.metros + ' m detrás') : '');
      var s = '<svg width="' + w + '" height="' + Hh + '" viewBox="0 0 ' + w + ' ' + Hh + '" role="img" aria-label="' + esc('Carrera fantasma: cruzas la meta en ' + t1(C.meta) + '; el ritmo del ' + PC.fmt.t(E) + ' va ' + (C.meta >= E ? 'por delante: elimina' : C.metros + ' m detrás') + '; el de ' + PC.fmt.t(ghost) + ': ' + gTxt.split(' · ')[1] + '.') + '">';
      s += '<rect class="calle" x="' + x0 + '" y="' + (g1 - 6) + '" width="' + (x1 - x0) + '" height="8" rx="2"/><rect class="calle" x="' + x0 + '" y="' + (g2 - 6) + '" width="' + (x1 - x0) + '" height="8" rx="2"/>';
      s += '<line class="meta" x1="' + X(1000) + '" x2="' + X(1000) + '" y1="20" y2="' + (g2 + 4) + '"/>';
      s += '<g class="te-l49" data-umbral="229"><line class="l349" data-umbral="229" x1="' + X(p49) + '" x2="' + X(p49) + '" y1="20" y2="' + (g2 + 4) + '"/>';
      s += '<text class="elim" x="' + Math.max(x0 + 4, X(p49) - 4) + '" y="14" text-anchor="' + (X(p49) - 4 > x0 + 120 ? 'end' : 'start') + '">' + esc(l49) + '</text></g>';
      s += '<text class="lab" x="' + x0 + '" y="14">' + esc(tuTxt) + '</text><text class="lab" x="' + x0 + '" y="' + (g1 + 22) + '">' + esc(gTxt) + '</text>';
      s += '<g class="te-run" data-k="tu" transform="translate(' + X(pT).toFixed(1) + ' ' + g1 + ')">' + (PC.ill && PC.ill.corredor ? PC.ill.corredor('corre', { h: hR, ancla: 'pie', contorno: real() ? false : true, sombra: false }) : '') + '</g>';
      s += '<g class="te-run" data-k="g" transform="translate(' + X(pG).toFixed(1) + ' ' + g2 + ')">' + (PC.ill && PC.ill.corredor ? PC.ill.corredor('corre', { h: hR, ancla: 'pie', contorno: 'meta' }) : '') + '</g>';
      s += '<line class="eje" x1="' + x0 + '" x2="' + x1 + '" y1="' + (g2 + 12) + '" y2="' + (g2 + 12) + '"/>';
      for (var m = 0; m <= 1000; m += 200) {
        s += '<line class="eje" x1="' + X(m) + '" x2="' + X(m) + '" y1="' + (g2 + 12) + '" y2="' + (g2 + 16) + '"/><text x="' + X(m) + '" y="' + (g2 + 30) + '" text-anchor="' + (m === 0 ? 'start' : (m === 1000 ? 'end' : 'middle')) + '">' + (m === 1000 ? '1.000 m' : m) + '</text>';
      }
      box.innerHTML = s + '</svg>';
    }
    function correr() {
      if (anim) return;
      var C = calc(), btn = host.querySelector('[data-a="correr"]'), t0 = null, dur = 8000;
      if (btn) btn.disabled = true;
      /* cada fotograma con requestAnimationFrame y, de respaldo, un temporizador (sin cabecera o con la pestaña
         en segundo plano el rAF puede no llegar); el que llegue primero pinta y el otro no hace nada */
      function sig() {
        var hecho = false;
        var f = function () { if (hecho) return; hecho = true; paso(Date.now()); };
        requestAnimationFrame(f); setTimeout(f, 50);
      }
      function paso(now) {
        if (t0 === null) t0 = now;
        var r = Math.min(1, (now - t0) / dur);
        if (!host.isConnected) { anim = null; return; }
        fantasma(r < 1 ? r * C.meta : undefined);
        if (r < 1) sig();
        else { anim = null; if (btn) btn.disabled = false; }
      }
      anim = true; sig();
    }
    host.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('button'); if (!b || !host.contains(b)) return;
      if (b.hasAttribute('data-p')) { var x = presetDe(b.getAttribute('data-p')); if (x) { st = { tr: x.tr.slice(), preset: x.id }; guardar(); pintar(); } return; }
      if (b.hasAttribute('data-d')) {
        var i = +b.getAttribute('data-i');
        st.tr[i] = Math.max(30, Math.min(70, Math.round((st.tr[i] + +b.getAttribute('data-d')) * 10) / 10));
        st.preset = null; guardar(); pintar(); return;
      }
      if (b.getAttribute('data-a') === 'correr') correr();
    });
    inputs.forEach(function (inp) {
      inp.addEventListener('change', function () {
        var v = PC.fmt.parseT(inp.value), i = +inp.getAttribute('data-i');
        if (v === null || v < 30 || v > 70) { inp.setAttribute('aria-invalid', 'true'); PC.toast('Escribe los segundos del tramo, por ejemplo con coma decimal'); return; }
        st.tr[i] = Math.round(v * 10) / 10; st.preset = null; guardar(); pintar();
      });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') inp.blur(); });
    });
    PC.alRedimensionar(host.querySelector('.te-fant-c'), function () { if (!anim) fantasma(); });
    pintar();
  };

  /* «Última prueba del día, después de circuito y dominadas», sacado de planDeCarrera.examen.orden */
  function posicionMil(orden) {
    var L = String(orden || '').split(/\s*→\s*/).filter(Boolean), i = -1;
    L.forEach(function (x, k) { if (/1\.000/.test(x)) i = k; });
    if (i < 0 || L.length < 2) return '';
    var antes = L.slice(0, i);
    return (i === L.length - 1 ? 'Última prueba del día' : 'Prueba ' + (i + 1) + ' de ' + L.length) + (antes.length ? ', después de ' + antes.join(' y ') : '');
  }
  function pintarMil(c) {
    var ex = examen(), N6 = T.N6 || {};
    var h = '<div class="card" id="te-reparto">' + cardH('carrera', 'Reparto del 1.000', 'Toca un reparto o ajusta cada 200: la meta, los puntos y el margen al 3:49 se recalculan.') + p(ex.nota, 'te-nota') + '<div class="te-rp-h"></div></div>';
    var kv = '';
    if (ex.suelo) kv += '<dt>Suelo</dt><dd>' + esc(ex.suelo) + '</dd>';
    if (ex.elimina) kv += '<dt>Elimina</dt><dd><b class="te-el" data-umbral="229">' + esc(ex.elimina) + '</b></dd>';
    if (ex.margenPrevisto) kv += '<dt>Margen previsto</dt><dd>' + esc(ex.margenPrevisto) + '</dd>';
    h += '<div class="te-g2"><div class="card" id="te-carrera-examen">' + cardH('prueba', 'La carrera del examen', posicionMil(ex.orden)) +
      (kv ? '<dl class="te-kv">' + kv + '</dl>' : '') +
      (arr(ex.consejos).length ? '<h4>Consignas</h4><ol class="te-tec">' + arr(ex.consejos).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' : '') +
      (ex.reglaDeSalida ? '<h4>La salida</h4>' + p(ex.reglaDeSalida) : '') + '</div>';
    h += '<div class="card" id="te-dia-prueba">' + cardH('examen', 'El día de la prueba', '') +
      (ex.comida ? '<h4>Comida</h4>' + p(ex.comida) : '') +
      (T.N7 ? '<h4>Pista</h4><p>' + esc(T.N7) + ' ' + sup('sin verificar') + '</p>' : '') +
      why('Cádiz', p(N6.mar) + (N6.clima ? '<p>' + esc(N6.clima) + ' ' + sup('supuesto') + '</p>' : '') + (ex.pendiente ? '<h4>Pendiente</h4>' + p(ex.pendiente) : '')) + '</div></div>';
    c.innerHTML = h;
    herr.reparto(c.querySelector('.te-rp-h'));
  }

  /* ------------------------------------------------------------------ T8 · registro del circuito */
  /* intentos del día: de la `sesion` («UN intento» → 1, «3 intentos» → 3); si no lo dice, de juevesCircuito.bloques */
  function nIntentos(dia) {
    var re = /\b(UN|un|Un|\d+)\s+intentos?\b/;
    var m = re.exec(String((dia && dia.sesion) || ''));
    if (!m) arr(((P.sesionesTipo || {}).juevesCircuito || {}).bloques).some(function (b) { m = re.exec(String(b.ejercicio || '')); return !!m; });
    return m ? (/^un$/i.test(m[1]) ? 1 : Math.max(1, Math.min(4, +m[1]))) : 3;
  }
  herr.cir = function (fecha) { var o = PC.store.get('cir-' + fecha, null); return o && Array.isArray(o.intentos) ? o : null; };
  function cirCalc(o) {
    var I = arr(o && o.intentos), comp = null, iComp = -1, techo = null, nulos = 0;
    I.forEach(function (x, i) {
      if (!x) return;
      if (x.nulo) { nulos++; return; }
      if (typeof x.t === 'number' && isFinite(x.t) && x.t > 0) {
        if (comp === null) { comp = x.t; iComp = i; }
        if (techo === null || x.t < techo) techo = x.t;
      }
    });
    return { comparable: comp, iComparable: iComp, techo: techo, nulos: nulos,
      ptsComparable: comp === null ? null : PC.baremo.pts('cir', comp), ptsTecho: techo === null ? null : PC.baremo.pts('cir', techo) };
  }
  /* sueño de la noche anterior, del semáforo (T1) de ese día */
  function suenoDe(fecha) {
    var s = null;
    try { s = PC.sem && PC.sem.salida ? PC.sem.salida(fecha) : PC.store.get('sem-' + fecha, null); } catch (e) { s = null; }
    if (!s || (!s.banda && (s.min === null || s.min === undefined))) return null;
    var min = s.min !== null && s.min !== undefined && isFinite(s.min) ? +s.min : null;
    var banda = s.banda || (min !== null && PC.sem && PC.sem.bandaDeMin ? PC.sem.bandaDeMin(min) : null);
    return { banda: banda, min: min };
  }
  var NBANDA = { verde: 'verde', ambar: 'ámbar', rojo: 'rojo' };
  herr.cirResumen = function (fecha) {
    var o = herr.cir(fecha); if (!o) return null;
    var C = cirCalc(o), S = suenoDe(fecha);
    C.banda = S ? S.banda : null; C.min = S ? S.min : null;
    C.asterisco = !!(S && S.banda && S.banda !== 'verde');
    var partes = arr(o.intentos).map(function (x, i) {
      if (!x) return null;
      if (x.nulo) return 'intento ' + (i + 1) + ': nulo' + (x.motivo ? ' (' + x.motivo + ')' : '');
      if (typeof x.t !== 'number') return null;
      return 'intento ' + (i + 1) + ': ' + PC.fmt.s(x.t) + (i === C.iComparable ? ' (' + C.ptsComparable + ' pts, el comparable)' : '');
    }).filter(Boolean);
    if (C.techo !== null) partes.push('mejor: ' + PC.fmt.s(C.techo) + ' (' + C.ptsTecho + ' pts)');
    if (o.quien) partes.push('cronometra: ' + o.quien);
    if (S) partes.push('sueño ' + (S.min !== null ? PC.fmt.sueno(S.min) + ' ' : '') + '(' + (NBANDA[S.banda] || S.banda) + ')' + (C.asterisco ? ', con asterisco' : ''));
    C.texto = 'Circuito ' + dm(fecha) + ': ' + (partes.length ? partes.join(' · ') : 'sin tiempos');
    return C;
  };
  /* tramos de la barra de decisión: la de web.decide para esa fecha o la genérica de juevesCircuito */
  function tramosDeBarra(barra) {
    var L = arr(barra.tramos).map(function (t, i) {
      var r = {}, num = function (x) { return +String(x).replace(',', '.'); };
      if (t.gte !== undefined) r.gte = num(t.gte);
      if (t.lte !== undefined) r.lte = num(t.lte);
      if (t.gt !== undefined) r.gt = num(t.gt);
      var w = (r.gte !== undefined && r.lte !== undefined) ? Math.max(1, Math.round((r.lte - r.gte) * 10) + 1) : 5;
      return { b: raya(t.txt) + (barra.prueba === 'cir' && /\d$/.test(t.txt) ? ' s' : ''), corto: t.corto, efecto: t.efecto, tono: tonoTramo(t.tono, i), r: r, w: barra.prueba === 'cir' ? w : 1 };
    });
    L.unidad = barra.prueba === 'cir' ? 's' : '';
    return L;
  }
  /* rojo solo para lo que elimina o anula (§4.2): un tramo de decisión que no elimina va en ámbar aunque el dato diga «bad» */
  function tonoTramo(t, i) { return t === 'ok' || (!t && i === 0) ? 'ok' : 'warn'; }
  function decideCir(fecha) {
    var L = arr(WB.decide);
    for (var i = 0; i < L.length; i++) {
      if (fecha && L[i].fecha !== fecha) continue;
      var bs = arr(L[i].barras);
      for (var j = 0; j < bs.length; j++) if (bs[j].prueba === 'cir') return { fecha: L[i].fecha, titulo: L[i].titulo, barra: bs[j], nota: L[i].nota };
    }
    return null;
  }
  function tramosCir(fecha) { var d = decideCir(fecha); return d ? tramosDeBarra(d.barra) : tramosCircuito(); }

  herr.circuito = function (host, op) {
    if (!host) return;
    op = op || {};
    var fecha = op.fecha || PC.hoyIso();
    var dia = PC.cal && PC.cal.dia ? PC.cal.dia(fecha) : null;
    var n = op.intentos || nIntentos(dia);
    host.classList.add('te-cir');
    if (op.lectura) { host.innerHTML = lecturaCir(fecha); return; }
    var base = (DV.marcas && DV.marcas.cir && DV.marcas.cir.s) || null;   /* punto de partida de −/+ con el campo vacío */
    function reg() { var o = herr.cir(fecha); return o ? JSON.parse(JSON.stringify(o)) : { intentos: [], quien: '' }; }
    function guardar(o) {
      var algo = arr(o.intentos).some(function (x) { return x && (x.nulo || typeof x.t === 'number' || x.motivo); }) || o.quien;
      if (!algo) { PC.store.del('cir-' + fecha); return; }
      o.t = Date.now(); PC.store.set('cir-' + fecha, o);
    }
    function filas(o) {
      var k = n;
      if (n === 1 && o.intentos[0] && o.intentos[0].nulo) k = 2;   /* segundo solo si el primero es nulo */
      return k;
    }
    function rotulo(i) {
      if (i === 0) return n === 1 ? 'Intento 1 · el que cuenta' : 'Intento 1 · el comparable';
      if (n === 1) return 'Intento 2 · solo porque el 1 fue nulo';
      return 'Intento ' + (i + 1);
    }
    function pintar() {
      var o = reg(), k = filas(o), h = '';
      if (n === 1) h += '<p class="te-cir-sue">Un solo intento, como en el examen: segundo solo si nulo.</p>';
      for (var i = 0; i < k; i++) {
        var x = o.intentos[i] || {};
        h += '<div class="te-cir-i" data-i="' + i + '"><div class="te-cir-l"><span>' + esc(rotulo(i)) + '</span>' +
          '<button type="button" class="chip" data-nulo="' + i + '" aria-pressed="' + (!!x.nulo) + '" aria-label="Intento ' + (i + 1) + ' nulo">nulo</button></div>' +
          '<div class="te-cir-r"><button type="button" class="te-pm" data-i="' + i + '" data-d="-0.1" aria-label="Una décima menos"' + (x.nulo ? ' disabled' : '') + '>−0,1</button>' +
          '<input class="te-in t" inputmode="decimal" autocomplete="off" data-i="' + i + '" aria-label="' + esc('Tiempo del intento ' + (i + 1) + ' en segundos, con décimas') + '" value="' + (typeof x.t === 'number' ? esc(coma(x.t)) : '') + '"' + (x.nulo ? ' disabled' : '') + '>' +
          '<button type="button" class="te-pm" data-i="' + i + '" data-d="0.1" aria-label="Una décima más"' + (x.nulo ? ' disabled' : '') + '>+0,1</button><em class="dv" data-dv="' + i + '"></em></div>' +
          (x.nulo ? '<input class="te-in" data-m="' + i + '" autocomplete="off" placeholder="Motivo del nulo" aria-label="' + esc('Motivo del nulo del intento ' + (i + 1)) + '" value="' + esc(x.motivo || '') + '">' : '') + '</div>';
      }
      h += '<label class="te-quien">Quién cronometra y con qué<input class="te-in" data-q autocomplete="off" value="' + esc(o.quien || '') + '"></label>';
      h += '<div class="te-cir-out" aria-live="polite"></div>';
      host.innerHTML = h;
      salidas();
    }
    function salidas() {
      var o = reg(), C = cirCalc(o), S = suenoDe(fecha);
      PC.$$('[data-dv]', host).forEach(function (e) {
        var i = +e.getAttribute('data-dv'), x = o.intentos[i] || {};
        var pts = !x.nulo && typeof x.t === 'number' ? PC.baremo.pts('cir', x.t) : null;
        e.textContent = x.nulo ? 'nulo' : (pts === null ? '' : pts + ' pts');
        e.className = 'dv' + (x.nulo || pts === 0 ? ' bad' : '');
      });
      var h = '<div class="stats"><div class="stat"><b class="' + (C.ptsComparable === 0 ? 'elim' : '') + '">' + (C.comparable === null ? '—' : esc(PC.fmt.s(C.comparable))) + '</b><span>comparable' + (C.comparable === null ? '' : ' · ' + C.ptsComparable + ' pts') + '</span></div>' +
        (n > 1 ? '<div class="stat"><b>' + (C.techo === null ? '—' : esc(PC.fmt.s(C.techo))) + '</b><span>mejor, el techo' + (C.techo === null ? '' : ' · ' + C.ptsTecho + ' pts') + '</span></div>' : '') + '</div>';
      h += '<p class="te-cir-sue">' + ic('sueno', 'sm') + '<span>Sueño de anoche: ' + (S ? (S.min !== null ? esc(PC.fmt.sueno(S.min)) + ' · ' : '') + esc(NBANDA[S.banda] || S.banda || '') : 'sin anotar en el semáforo de hoy') + '</span>' +
        (S && S.banda && S.banda !== 'verde' ? '<span class="chip warn">con asterisco</span>' : '') + '</p>';
      var tr = tramosCir(fecha);
      if (tr.length) h += umb('Qué decide el primer intento', tr, C.comparable);
      h += '<div class="te-acc"><button type="button" class="btn sec" data-a="copiar"' + (herr.cir(fecha) ? '' : ' disabled') + '>' + ic('copiar', 'sm') + 'Copiar</button></div>';
      var out = host.querySelector('.te-cir-out');
      out.innerHTML = h;
      var w = out.querySelector('.umb-w'); if (w) w._tramos = tr;
      enlazarUmb(out, tr);
    }
    function poner(i, v) {
      var o = reg();
      while (o.intentos.length <= i) o.intentos.push({ t: null, nulo: false, motivo: '' });
      o.intentos[i].t = v === null ? null : Math.round(v * 10) / 10;
      guardar(o);
      var inp = host.querySelector('input[data-i="' + i + '"]'); if (inp && v !== null) { inp.value = coma(o.intentos[i].t); inp.removeAttribute('aria-invalid'); }
      salidas();
    }
    if (!host._teCir) {
      host._teCir = true;
      host.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('button'); if (!b || !host.contains(b) || b.disabled) return;
        if (b.hasAttribute('data-nulo')) {
          var i = +b.getAttribute('data-nulo'), o = reg();
          while (o.intentos.length <= i) o.intentos.push({ t: null, nulo: false, motivo: '' });
          o.intentos[i].nulo = !o.intentos[i].nulo;
          if (n === 1 && i === 0 && !o.intentos[0].nulo) o.intentos = o.intentos.slice(0, 1);
          guardar(o); pintar();
          var nb = host.querySelector('[data-nulo="' + i + '"]'); if (nb) { try { nb.focus({ preventScroll: true }); } catch (x) {} }
          return;
        }
        if (b.hasAttribute('data-d')) {
          var j = +b.getAttribute('data-i'), cur = (reg().intentos[j] || {}).t;
          if (typeof cur !== 'number') { var prev = reg().intentos.slice(0, j).reverse().filter(function (x) { return x && typeof x.t === 'number'; })[0]; cur = prev ? prev.t : base; }
          if (typeof cur !== 'number') return;
          poner(j, Math.max(5, Math.min(20, cur + +b.getAttribute('data-d'))));
          return;
        }
        if (b.getAttribute('data-a') === 'copiar') { var R = herr.cirResumen(fecha); if (R) PC.copiar(R.texto); }
      });
      host.addEventListener('change', function (e) {
        var t = e.target;
        if (t.hasAttribute('data-i') && t.tagName === 'INPUT') {
          var i = +t.getAttribute('data-i'), txt = t.value.trim();
          if (!txt) { poner(i, null); t.removeAttribute('aria-invalid'); return; }
          var v = PC.fmt.parseT(txt);
          if (v === null || v < 5 || v > 20) { t.setAttribute('aria-invalid', 'true'); PC.toast('Escribe el tiempo en segundos con décimas, por ejemplo 9,4'); return; }
          poner(i, v);
        } else if (t.hasAttribute('data-m')) {
          var o = reg(), k = +t.getAttribute('data-m');
          if (o.intentos[k]) { o.intentos[k].motivo = t.value.trim(); guardar(o); salidas(); }
        } else if (t.hasAttribute('data-q')) {
          var o2 = reg(); o2.quien = t.value.trim(); guardar(o2); salidas();
        }
      });
      host.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.target.blur(); });
    }
    pintar();
  };
  /* un registro del móvil en lectura */
  function lecturaCir(fecha) {
    var o = herr.cir(fecha), R = herr.cirResumen(fecha);
    if (!o || !R) return '<p class="faint">Sin registro de ese día en este móvil.</p>';
    var li = arr(o.intentos).map(function (x, i) {
      if (!x || (!x.nulo && typeof x.t !== 'number')) return '';
      return '<li><span>Intento ' + (i + 1) + '</span>' + (x.nulo ? '<span class="n">nulo' + (x.motivo ? ' · ' + esc(x.motivo) : '') + '</span>'
        : '<b>' + esc(PC.fmt.s(x.t)) + '</b><span>' + PC.baremo.pts('cir', x.t) + ' pts' + (i === R.iComparable ? ' · el comparable' : '') + '</span>') + '</li>';
    }).join('');
    return '<ul class="te-cir-sec">' + li + '</ul>' + (o.quien ? '<p class="te-cir-sue">Cronometra: ' + esc(o.quien) + '</p>' : '') +
      (R.asterisco ? '<p class="te-cir-sue"><span class="chip warn">con asterisco</span><span>sueño ' + (R.min !== null ? esc(PC.fmt.sueno(R.min)) : esc(NBANDA[R.banda] || '')) + '</span></p>' : '');
  }

  /* ------------------------------------------------------------------ TE-3 · circuito */
  function hSerio(c) {   /* entrada del historial que vale como medición: con intentos, o con segundos y sin «al 60 %» */
    if (!c || c.hecho === false) return false;
    if (arr(c.intentos).length) return true;
    return typeof c.segundos === 'number' && !/60\s*%|sin saber/i.test(c.condiciones || '');
  }
  function hComparable(c) {
    if (arr(c.intentos).length) return cirCalc({ intentos: c.intentos.map(function (x) { return typeof x === 'number' ? { t: x } : x; }) }).comparable;
    return typeof c.segundos === 'number' ? c.segundos : null;
  }
  function proximoCircuito() {
    var hoy = PC.hoyIso(), L = arr(DV.dias);
    for (var i = 0; i < L.length; i++) { if (L[i].fecha < hoy) continue; var d = PC.cal.dia(L[i].fecha); if (d && d.tipo === 'circuito') return d; }
    return null;
  }
  function pintarCircuito(c) {
    var JC = (P.sesionesTipo || {}).juevesCircuito || {}, CU = P.contextoDelUsuario || {};
    var cron = arr(JC.bloques).filter(function (b) { return /cronometr/i.test(b.ejercicio || ''); })[0] || {};
    /* registros: los del móvil y los del historial, del más reciente al más antiguo */
    var filas = [];
    PC.store.claves('cir-').forEach(function (k) {
      var f = k.replace(/^pc-cir-/, ''); if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return;
      var R = herr.cirResumen(f); if (R && (R.comparable !== null || R.nulos)) filas.push({ fecha: f, movil: true, R: R });
    });
    arr(HI.circuito).forEach(function (h) { filas.push({ fecha: h.fecha, h: h }); });
    filas.sort(function (a, b) { return a.fecha < b.fecha ? 1 : (a.fecha > b.fecha ? -1 : (a.movil ? -1 : 1)); });
    var ultValido = null;
    filas.some(function (f) {
      if (f.movil && f.R.comparable !== null) { ultValido = { fecha: f.fecha, s: f.R.comparable, pts: f.R.ptsComparable, movil: true }; return true; }
      if (f.h && hSerio(f.h)) { var s = hComparable(f.h); if (s !== null) { ultValido = { fecha: f.fecha, s: s, pts: PC.baremo.pts('cir', s) }; return true; } }
      return false;
    });
    var ref = DV.marcas && DV.marcas.cir;
    var titulo = ultValido ? 'Último intento comparable: ' + PC.fmt.s(ultValido.s) + ' · ' + ultValido.pts + ' pts'
      : (ref && ref.s ? 'Sin medición seria: ' + PC.fmt.s(ref.s) + (ref.fiab ? ' ' + ref.fiab : '') : 'Sin medición seria');
    var h = '<div class="te-g2"><div class="card" id="te-cir-como">' + cardH('circuito', 'Cómo se cronometra', 'Igual que en el examen') +
      '<div class="te-valla"></div>' + p(cron.detalle) + p(JC.regla) +
      (CU.preparadorJueves ? '<p class="faint"><b>Jueves con el preparador</b> · ' + esc(CU.preparadorJueves) + '</p>' : '') +
      why('Por qué el jueves y fresco', p(JC.porQue) + p(JC.inamovible)) +
      (boeId() ? '<p class="te-link"><a class="btn ghost" href="https://www.boe.es/buscar/doc.php?id=' + boeId() + '" target="_blank" rel="noopener">' + ic('lista', 'sm') + 'Recorrido y normas: ' + boeId() + ' →</a></p>' : '') + '</div>';
    /* último registro en lectura */
    var rows = filas.slice(0, 3).map(function (f) {
      if (f.movil) {
        return '<li><b>' + esc(PC.fmt.dia(f.fecha, 'corta')) + '</b>' + (f.R.comparable !== null ? '<b>' + esc(PC.fmt.s(f.R.comparable)) + '</b><span>' + f.R.ptsComparable + ' pts, el comparable</span>' : '') +
          (f.R.techo !== null && f.R.techo !== f.R.comparable ? '<span>mejor ' + esc(PC.fmt.s(f.R.techo)) + ' · ' + f.R.ptsTecho + ' pts</span>' : '') +
          (f.R.nulos ? '<span class="n">' + f.R.nulos + (f.R.nulos === 1 ? ' nulo' : ' nulos') + '</span>' : '') +
          (f.R.asterisco ? '<span class="chip warn">con asterisco</span>' : '') + '<span class="chip">en este móvil</span></li>';
      }
      var x = f.h;
      if (x.hecho === false) return '<li><b>' + esc(PC.fmt.dia(f.fecha, 'corta')) + '</b><span class="nh">no se hizo</span><span class="te-cir-x">' + esc(x.motivo || '') + '</span></li>';
      var s = hComparable(x);
      var fi = /60\s*%/.test(x.condiciones || '') ? 'al 60 %' : '';
      return '<li><b>' + esc(PC.fmt.dia(f.fecha, 'corta')) + '</b>' + (s !== null ? '<b>' + esc(PC.fmt.s(s)) + '</b><span>' + (typeof x.puntos === 'number' ? x.puntos : PC.baremo.pts('cir', s)) + ' pts</span>' : '') +
        (fi ? sup(fi) : '') + (x.condiciones ? '<span class="te-cir-x">' + esc(x.condiciones) + '</span>' : '') + '</li>';
    }).join('');
    var prox = proximoCircuito();
    var enlace = prox ? '<p class="te-link"><a class="btn sec" href="#hoy' + (prox.fecha === PC.hoyIso() ? '' : '/' + prox.fecha) + '">' + ic('hoy', 'sm') + 'Se registra el jueves en Hoy →</a></p>' : '';
    var tr = tramosCir(null), dc = decideCir(null);
    var etq = dc && dc.fecha >= PC.hoyIso() ? dc.titulo : 'Qué decide el primer intento';
    h += '<div class="card" id="te-cir-ult">' + cardH('lista', titulo, 'Último registro del jueves, en lectura') +
      (rows ? '<ul class="te-cir-sec">' + rows + '</ul>' : '<p class="faint">Sin registros.</p>') + enlace +
      (tr.length ? '<h4>' + esc(etq) + '</h4>' + umb(etq, tr, ultValido ? ultValido.s : null) : '') +
      (dc && dc.nota && dc.fecha >= PC.hoyIso() ? p(dc.nota, 'faint') : '') + '</div></div>';
    c.innerHTML = h;
    var w = c.querySelector('#te-cir-ult .umb-w'); if (w) w._tramos = tr;
    enlazarUmb(c, tr);
    var vh = c.querySelector('.te-valla');
    if (PC.ill && PC.ill.valla) {
      if (ultValido) PC.ill.valla(vh, { t: ultValido.s, real: true, medido: ultValido.s });
      else PC.ill.valla(vh, { t: ref && ref.s ? ref.s : null, real: false, medido: null, etiqueta: ref && ref.fiab ? ref.fiab : undefined });
    } else vh.remove();
  }

  /* ------------------------------------------------------------------ TE-4 · gimnasio (fichas desde ejercicios[].tecnica) */
  function chipsMaterial(e) { var m = arr(e && e.material); return m.length ? '<div class="chips">' + m.map(function (x) { return '<span class="chip">' + esc(x) + '</span>'; }).join('') + '</div>' : ''; }
  /* ficha de un ejercicio: con lámina (su leyenda ya es la lista de técnica) o con la lista 3 + «Más» */
  function ficha(e, o) {
    o = o || {};
    var lam = !o.sinLamina && tieneLamina(e.id);
    var h = '<article class="card te-ej' + (o.ancha || lam ? ' ancha' : '') + '" id="te-ej-' + esc(e.id) + '">' + cardH(o.icono || 'fuerza', e.nombre, o.sub || '', o.letra) +
      chipsMaterial(e) + (o.para ? p(o.para, 'te-para') : '') +
      (lam ? '<div class="te-lamh" data-lam="' + esc(e.id) + '"></div>' : tecnica(e.tecnica)) + (o.extra || '') +
      '<div class="te-ej-f">' + (o.enlace || '') + video(e.id, e.nombre) + '</div></article>';
    return h;
  }
  function montarLaminas(c) {
    PC.$$('[data-lam]', c).forEach(function (hst) {
      if (PC.ill && PC.ill.lamina) PC.ill.lamina(hst, hst.getAttribute('data-lam'), {});
    });
  }
  function pintarGimnasio(c) {
    var MF = (P.sesionesTipo || {}).martesFuerza || {}, SC = (P.sesionesTipo || {}).sabadoComplemento || {};
    var bloques = arr(MF.bloques);
    var hora = String(MF.hora || '').split(/[,\s]/)[0];
    var lugar = String(MF.lugar || '').replace(/^Gimnasio del\s+/i, '');
    var entr = ['Martes', hora ? raya(hora) : '', lugar, MF.duracionMin ? 'unos ' + MF.duracionMin + ' min' + (MF.superseries ? ' con superseries' : '') : ''].filter(Boolean).join(' · ');
    var h = '<p class="te-nota">' + esc(entr) + '</p><div class="te-fichas">';
    /* prep-hombro: su casa es Dominada (TE-1); aquí, solo el enlace */
    var ph = ej('prep-hombro');
    if (ph) h += '<div class="card flat te-mini" id="te-gim-prep"><p><b>' + esc(ph.nombre) + '</b> · antes de A. ' + esc(arr(ph.tecnica).slice(0, 2).join(' ')) + '</p><a class="btn ghost" href="#tecnica/dominada">Ver en Dominada →</a></div>';
    var ORDEN = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'I', 'H'];
    ORDEN.forEach(function (k) {
      var b = bloques.filter(function (x) { return x.clave === k; })[0]; if (!b) return;
      var sub = 'Martes · bloque ' + k;
      if (k === 'H') {
        var gH = '<article class="card te-ej" id="te-ej-gluteo-medio">' + cardH(null, b.ejercicio, sub, k) + chipsMaterial({ material: b.peso ? [b.peso] : [] }) +
          (arr(b.detalle).length ? '<ol class="te-tec">' + arr(b.detalle).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' : '') +
          (b.formato ? p(b.formato, 'te-aviso-ej') : '') + why('Por qué', p(b.porQue) + p(b.orden)) + '</article>';
        h += gH; return;
      }
      var e = ejDeNombre(b.ejercicio); if (!e) return;
      var o = { sub: sub, letra: k };
      if (k === 'A') o.enlace = '<a class="btn sec" href="#tecnica/dominada">' + ic('tecnica', 'sm') + 'Lámina del BOE →</a>';
      if (e.id === 'sentadilla') o.extra = (T.S10garmin ? '<p class="te-aviso-ej">' + esc(T.S10garmin) + '</p>' : '') + why('Por qué «con barra»', p(e.aviso));
      else if (e.aviso) o.extra = p(e.aviso, 'te-aviso-ej');
      h += ficha(e, o);
    });
    var sab = arr(SC.bloques).map(function (b) { var e = ejDeNombre(b.ejercicio); return e ? ficha(e, { sub: 'Sábado · ' + String(SC.cuando || '').toLowerCase(), para: b.para, icono: 'fuerza' }) : ''; }).join('');
    if (sab) h += '<div class="te-sub"><h3>Sábados</h3>' + p(SC.cuando ? SC.cuando + (SC.duracionMin ? ', unos ' + SC.duracionMin + ' min' : '') : '') + '</div>' + sab;
    h += '</div>';
    c.innerHTML = h;
    montarLaminas(c);
  }

  /* ------------------------------------------------------------------ TE-5 · carrera */
  function pintarCarrera(c) {
    var ST = P.sesionesTipo || {}, CE = ST.calentamientoEstandar || {}, VC = ST.vueltaALaCalma || {}, RS = ritmo('RS') || {};
    var pasos = arr(CE.pasos).map(function (x, i) {
      var t = limpio(x), c = cabeza(t);
      var ob = /dominadas/i.test(t) && CE.obligatorio;
      return '<li><span class="dot" aria-hidden="true"></span><p class="te-paso"><b>' + esc(c[0]) + '</b>' + esc(c[1]) + '</p>' +
        (ob ? '<p class="te-oblig">' + ic('alerta', 'sm') + '<span>' + esc(CE.obligatorio) + '</span></p><a class="btn ghost" href="#tecnica/dominada">Técnica de la dominada →</a>' : '') + '</li>';
    }).join('');
    var dur = [CE.duracionMin ? CE.duracionMin + ' min' : '', CE.duracionConDominadasMin ? CE.duracionConDominadasMin + ' con las dominadas del día' : ''].filter(Boolean).join(' · ');
    var h = '<div class="te-fichas">';
    h += '<article class="card te-ej ancha" id="te-ej-calentamiento">' + cardH('carrera', 'Calentamiento estándar', dur) + '<ol class="tl">' + pasos + '</ol>' +
      '<div class="te-ej-f">' + video('calentamiento', '') + '</div></article>';
    if (VC.detalle) h += '<article class="card te-ej" id="te-ej-vuelta-calma">' + cardH('descanso', 'Vuelta a la calma', VC.duracionMin ? VC.duracionMin + ' min' : '') + p(VC.detalle) + '</article>';
    if (RS.nombre) {
      var rsl = String(RS.reglaDeSalida || ''), i1 = rsl.indexOf('. ');
      h += '<article class="card te-ej" id="te-ej-rodaje">' + cardH('carrera', RS.nombre, (RS.gobernadoPor ? 'por ' + RS.gobernadoPor : '') + (RS.techoFC ? ' · techo ' + RS.techoFC + ' ppm' : '')) +
        (RS.ritmoEsperado ? p('Ritmo: ' + RS.ritmoEsperado) : '') + (rsl ? p(i1 > 0 ? rsl.slice(0, i1 + 1) : rsl) : '') + (i1 > 0 ? why('Por qué', p(rsl.slice(i1 + 2))) : '') + '</article>';
    }
    ['progresivos', 'tecnica-carrera', 'series-cortas', 'series-largas', 'kilometro-partido'].forEach(function (id) {
      var e = ej(id); if (e) h += ficha(e, { icono: 'carrera', sub: e.grupo === 'carrera' ? '' : e.grupo });
    });
    var dr = regla('dos-repeticiones');
    h += '</div><p class="te-link"><a class="btn ghost" href="#plan/reglas">' + ic('lista', 'sm') + esc(dr && dr.titulo ? dr.titulo : 'Regla de las dos repeticiones') + ' →</a></p>';
    c.innerHTML = h;
  }

  /* ------------------------------------------------------------------ TE-6 · reloj */
  function diaEjemplo(prueba) {
    var hoy = PC.hoyIso(), L = arr(DV.dias), fut = [], pas = [];
    L.forEach(function (x) { (x.fecha >= hoy ? fut : pas).push(x); });
    var orden = fut.concat(pas.reverse());
    for (var i = 0; i < orden.length; i++) { var d = PC.cal.dia(orden[i].fecha); if (d && prueba(d, orden[i])) return d; }
    return null;
  }
  function pintarReloj(c) {
    var A = P.atleta || {}, ZF = P.zonasFC || {};
    var h = '<div class="te-g2"><div class="card" id="te-reloj-conf">' + cardH('reloj', A.reloj ? 'Configuración del ' + A.reloj : 'Configuración del reloj', 'Lo que tiene puesto ahora') +
      (A.relojConfigurado ? p(A.relojConfigurado) : '') + (A.fcMaximaNota ? '<h4>FC máxima</h4>' + p(A.fcMaximaNota) : '') +
      (ZF.configurarEnGarmin ? '<h4>Zonas por FCR en el reloj</h4><p>' + esc(ZF.configurarEnGarmin) + ' ' + sup('ruta sin verificar') + '</p>' : '') + '</div>';
    /* qué programar: generado con PC.sesion.reloj (M2) sobre un día real de cada tipo */
    var tipos = [
      ['Series', function (d, x) { return d.tipo === 'carrera' && x.principal && !/kil[oó]metro partido|600 m \+ 400/i.test(d.sesion || ''); }],
      ['Kilómetro partido', function (d) { return d.tipo === 'carrera' && /kil[oó]metro partido|600 m \+ 400/i.test(d.sesion || ''); }],
      ['Rodaje', function (d, x) { return d.tipo === 'carrera' && !x.principal && /rodaje/i.test(d.sesion || '') && !/progresivos/i.test(d.sesion || ''); }],
      ['Rodaje con progresivos', function (d, x) { return d.tipo === 'carrera' && !x.principal && /rodaje/i.test(d.sesion || '') && /progresivos/i.test(d.sesion || ''); }],
      ['Control', function (d) { return d.tipo === 'control'; }]
    ];
    var prog = '';
    if (PC.sesion && PC.sesion.reloj) {
      prog = tipos.map(function (t) {
        var d = diaEjemplo(t[1]); if (!d) return '';
        var L = []; try { L = PC.sesion.reloj(d) || []; } catch (e) { PC._err('técnica · reloj', e); }
        if (!L.length) return '';
        return '<li><h4>' + esc(t[0]) + '</h4><small>Como el ' + esc(PC.fmt.dia(d.fecha, 'corta')) + ' · ' + esc(d.titulo || d.sesion || '') + '</small><ul>' + L.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></li>';
      }).join('');
    }
    h += '<div class="card" id="te-reloj-prog">' + cardH('lista', 'Qué programar en cada sesión', 'La tarjeta de cada día lo trae en «Configura el reloj»') +
      (prog ? '<ul class="te-prog">' + prog + '</ul>' : '<p class="te-link"><a class="btn sec" href="#hoy">Configura el reloj en la tarjeta de Hoy →</a></p>') + '</div></div>';
    var E28 = arr(T.E28), E31 = arr(T.E31), E32 = arr(T.E32).filter(function (x) { return !/umbral/i.test(x); });
    var e34 = arr(T.E34).filter(function (x) { return x && /archivo|cadencia/i.test(x.cosa || ''); })[0];
    h += '<div class="te-g2"><div class="card" id="te-reloj-connect">' + cardH('reloj', 'Crear una sesión en Garmin Connect', '') + '<div class="chips">' + sup('ruta sin verificar') + '</div>' +
      (E28.length ? '<ol class="te-tec">' + E28.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' : '') +
      why('Alternativa rápida desde el reloj', E31.length ? '<ol class="te-tec">' + E31.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' : '') +
      why('Alertas', E32.length ? '<ol class="te-tec">' + E32.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' : '') + '</div>';
    if (e34) h += '<div class="card" id="te-reloj-export">' + cardH('copiar', 'Exportar el archivo original', e34.cosa) + p(e34.texto) + '</div>';
    h += '</div>';
    c.innerHTML = h;
  }

  /* ------------------------------------------------------------------ TE-7 · material y salud */
  function pintarMaterial(c) {
    var A = P.atleta || {}, CU = P.contextoDelUsuario || {}, PD = P.protocoloDominadas || {}, LE = P.lesiones || {};
    var pend = arr(P.pendientes).filter(function (x) { return x.id === 'zapatilla'; })[0];
    var crono = arr(T.E34).filter(function (x) { return x && /cron[oó]metro/i.test(x.cosa || ''); })[0];
    var kv = '';
    function fila(k, v) { if (v) kv += '<dt>' + esc(k) + '</dt><dd>' + v + '</dd>'; }
    fila('Zapatilla', A.zapatillas ? esc(A.zapatillas) + (pend ? '<br><a href="#plan/decisiones">Pendiente: ' + esc(pend.texto) + ' →</a>' : '') : '');
    fila('Banda', A.banda ? esc(A.banda) : '');
    fila('Lastre', [PD.lastre, A.lastreDisponible].filter(Boolean).map(function (x) { return esc(x); }).join('<br>'));
    fila('Pista', CU.pista ? esc(CU.pista) + '<br>' + sup('homologación sin confirmar') : '');
    fila('Barra de Arucas', CU.barraArucas ? esc(CU.barraArucas) : '');
    if (crono) fila(crono.cosa, esc(crono.texto));
    var h = '<div class="te-g2"><div class="card" id="te-mat">' + cardH('lista', 'Material', '') + '<dl class="te-kv">' + kv + '</dl></div>';
    var cint = (DV.recortados || {})['plan.lesiones.cintillo'] || LE.cintillo;
    h += '<div><div class="card" id="te-pies">' + cardH('alerta', 'Pies', '') + p(LE.pies) +
      (arr(T.E33).length ? '<ol class="te-tec">' + arr(T.E33).map(function (x) { var c = cabeza(x, true); return '<li><b>' + esc(c[0]) + '</b>' + esc(c[1]) + '</li>'; }).join('') + '</ol>' : '') + '</div>' +
      (cint ? '<div class="card" id="te-cintillo">' + cardH('alerta', 'Cintillo', '') + p(cint) + '</div>' : '') + '</div></div>';
    var R7 = T.R7 || {};
    var tabla = arr(R7.filas).length ? '<div class="tscroll"><table class="t stack"><thead><tr><th scope="col">Suplemento</th><th scope="col">Qué aporta</th></tr></thead><tbody>' +
      arr(R7.filas).map(function (f) { return '<tr><th scope="row">' + esc(f[0]) + '</th><td>' + esc(f[1]) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '';
    if (T.R6 || tabla || T.R8) {
      h += '<div class="card" id="te-suple">' + cardH('dieta', 'Suplementos', '') + (T.R6 ? p(T.R6) : '') +
        why(R7.titulo || 'El resto', tabla) + why('Control y contaminación cruzada', p(T.R8)) + '</div>';
    }
    c.innerHTML = h;
  }

  /* ------------------------------------------------------------------ vista */
  var root = null;
  var SECC = [['dominada', pintarDominada], ['mil', pintarMil], ['circuito', pintarCircuito], ['gimnasio', pintarGimnasio], ['carrera', pintarCarrera], ['reloj', pintarReloj], ['material', pintarMaterial]];
  function pintarTodo() {
    try { pintarCabecera(); } catch (e) { PC._err('técnica · cabecera', e); }
    SECC.forEach(function (s) {
      var c = root.querySelector('#te-' + s[0] + ' > .te-c'); if (!c) return;
      try { s[1](c); } catch (e) { PC._err('técnica · ' + s[0], e); c.innerHTML = '<p class="empty">No se ha podido pintar esta sección.</p>'; }
    });
  }
  function irEjercicio(id) {
    var t = DOC.getElementById('te-ej-' + id);
    if (!t) return false;
    try { t.scrollIntoView({ block: 'start' }); } catch (e) { t.scrollIntoView(); }
    t.classList.remove('te-foco'); void t.offsetWidth; t.classList.add('te-foco');
    return true;
  }
  PC.vista('tecnica', {
    init: function (r) { root = r; pintarTodo(); },
    show: function (sub) {
      if (!root) return false;
      var m = /^ej\/([a-z0-9-]+)/i.exec(sub || '');
      if (m) return irEjercicio(m[1]);
      return false;
    },
    repintar: function () { if (root) pintarTodo(); }
  });
})();
