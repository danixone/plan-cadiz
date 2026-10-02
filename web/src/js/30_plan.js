/* 30_plan.js · M3 · vista Plan (especificación §5.2, T9, G13 y G14)
   P-1 calendario en rejilla con bloques, hitos, estados del historial, ventana de la prueba y
       conmutador de versión de la última semana (pc-prueba); hoja de cada día.
   P-2 semana tipo (única casa de «cuándo hay barra») · P-3 escalera de ritmos y escala del 1.000 con el 3:49
   P-4 zonas y termómetros · P-5 reglas en cuatro grupos · P-6 decisiones y pendientes (plan.pendientes, pc-pend)
   P-7 «Por qué el plan es así».
   Ninguna cifra se escribe aquí: todo sale de PC.D (plan, historial, web, derivados) o de una cuenta sobre ellos.
   La hoja usa PC.sesion.tarjeta(dia, {modo:'hoja'}) de M2 si existe; si no, una ficha de lectura con los campos
   literales del día. */
(function () {
  'use strict';
  var PC = window.PC;
  if (!PC || !PC.vista) return;
  var DOC = document;
  var P = PC.D.plan || {}, DER = PC.D.derivados || {}, WEB = PC.D.web || {}, HIS = PC.D.historial || {};
  var esc = PC.esc;
  var root = null;
  var hojaDe = null;                 /* fecha o clave de la hoja abierta desde Plan */
  var dibujos = [];                  /* gráficas que se redibujan al cambiar de ancho */

  /* ------------------------------------------------------------------ utilidades */
  function cap(t) { t = String(t || ''); return t.charAt(0).toUpperCase() + t.slice(1); }
  function dm(iso) { return PC.fmt.dia(iso, 'dm'); }
  function corta(iso) { return PC.fmt.dia(iso, 'corta'); }
  function porId(lista, campo, v) { return (lista || []).filter(function (x) { return x && x[campo] === v; })[0] || null; }
  function regla(id) { return porId(P.reglas, 'id', id); }
  function ritmo(clave) { return porId(P.ritmos, 'clave', clave); }
  /* frases: corta en «. » seguido de mayúscula (no en «rec. 2 min») */
  function frases(t) {
    t = String(t || '').trim();
    var out = [], re = /\.\s+(?=[A-ZÁÉÍÓÚÑ¿«(])/g, m, ini = 0;
    while ((m = re.exec(t))) { out.push(t.slice(ini, m.index + 1)); ini = m.index + m[0].length; }
    if (ini < t.length) out.push(t.slice(ini));
    return out;
  }
  function palabras(t) { return String(t).trim().split(/\s+/).length; }
  /* escapa y evita que una fecha corta («17-10») o un «3 × 5» se partan entre líneas; el texto no cambia */
  function sinCorte(t) { return esc(t).replace(/(\d{1,2}-\d{1,2}|\d+ × \d+)/g, '<span class="pl-nw">$1</span>'); }
  /* §3.4.3: lo visible, 40 palabras como mucho (al menos una frase); el resto, plegado */
  function partir(t, max) {
    var fs = frases(t), n = 0, i = 0, vis = [];
    max = max || 40;
    for (; i < fs.length; i++) { var w = palabras(fs[i]); if (i > 0 && n + w > max) break; vis.push(fs[i]); n += w; }
    return { vis: vis.join(' '), resto: fs.slice(i).join(' ') };
  }
  function acc(titulo, html, op) {
    op = op || {};
    return '<details class="acc' + (op.why === false ? '' : ' why') + (op.cls ? ' ' + op.cls : '') + '"' + (op.id ? ' id="' + op.id + '"' : '') + '><summary>' +
      (op.why === false ? '' : PC.icon('info', 'sm')) + '<span class="pl-sum">' + esc(titulo) + '</span>' + PC.icon('chev', 'sm chev') + '</summary><div class="in">' + html + '</div></details>';
  }
  function parrafos(v) {
    if (Array.isArray(v)) return '<ul class="pl-ul">' + v.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
    return v ? '<p>' + esc(v) + '</p>' : '';
  }
  function tiempos(txt) { return (String(txt || '').match(/\d:\d{2}(?:,\d)?/g) || []).map(function (x) { return PC.fmt.parseT(x); }); }
  /* «1:25 → 1:24» → ['1:25', '1:24'] */
  function dosValores(txt) { var p = String(txt || '').split(/\s*→\s*/); return [p[0], p[1] || null]; }
  var ICONO = { carrera: 'carrera', fuerza: 'fuerza', circuito: 'circuito', descanso: 'descanso', control: 'control', examen: 'examen', prueba: 'prueba' };
  var TIPO_TXT = { carrera: 'carrera', fuerza: 'fuerza', circuito: 'circuito', descanso: 'descanso', control: 'control', examen: 'examen', prueba: 'prueba' };
  var EST_CLS = { hoy: 'today', hecho: 'done', nomide: 'nomide', miss: 'miss', noreg: 'noreg', futuro: 'fut', rest: 'rest' };
  var EST_TXT = { hoy: 'hoy', hecho: 'hecho', nomide: 'no mide', miss: 'no hecho', noreg: 'sin registrar', futuro: 'futuro', rest: 'descanso' };
  var EST_CHIP = { hecho: 'ok', nomide: 'warn', miss: 'bad', noreg: 'sup', futuro: 'sup', hoy: 'pri', rest: '' };
  function estadoTxt(dia) { return dia.tipo === 'examen' && dia.estado === 'rest' ? 'examen' : EST_TXT[dia.estado] || ''; }
  function bloqueColor(b) { return b === 'A' ? 'a' : b === 'B' ? 'b' : b === 'C' ? 'c' : 'x'; }
  function bloques() { return (DER.bloques || []).slice(); }
  /* ritmos de un bloque para un rótulo: «1:27 / 2:11» o, con escalón, «1:25 / 2:07 → 1:24 / 2:06» */
  function ritmoBloque(bl, conCondicion) {
    var a = dosValores(bl.m400), c = dosValores(bl.m600);
    var t = a[0] + ' / ' + c[0];
    if (a[1] || c[1]) {
      var esc2 = (a[1] || a[0]) + ' / ' + (c[1] || c[0]);
      if (conCondicion) {
        var m = /→\s*\d:\d{2}(?:,\d)?\s+(si .+)$/.exec(bl.objetivo1000 || '');
        t += ', o ' + esc2 + (m ? ' ' + m[1] : '');
      } else t += ' → ' + esc2;
    }
    return t;
  }
  function hitosPorFecha() {
    var o = {};
    PC.cal.hitos().forEach(function (h) { if (!h.hasta) o[h.fecha] = h; });
    return o;
  }
  function ventana() {
    var v = DER.ventanaPrueba || (PC.cal.final() || {}).ventana || null;
    if (v && v.desde) return { desde: v.desde, hasta: v.hasta || v.desde };
    var h = PC.cal.hitos().filter(function (x) { return x.tipo === 'prueba' && x.hasta; })[0];
    return h ? { desde: h.fecha, hasta: h.hasta } : null;
  }
  function hitoPrueba() { return PC.cal.hitos().filter(function (x) { return x.tipo === 'prueba'; })[0] || null; }
  /* rango de fechas de una versión a partir de su clave («26-27» → 26 y 27 del mes de la ventana) */
  function rangoVersion(clave) {
    var v = ventana(); if (!v || !clave) return null;
    var m = /^(\d{1,2})-(\d{1,2})$/.exec(clave); if (!m) return null;
    var pre = v.desde.slice(0, 8);
    function d(n) { return pre + (n < 10 ? '0' : '') + n; }
    return { desde: d(+m[1]), hasta: d(+m[2]) };
  }
  function versionActual() { return PC.cal.version(); }
  function versiones() { var F = PC.cal.final(); return (F && F.versiones) || []; }
  function semanas() {
    var out = [];
    (P.calendario || []).forEach(function (s, i) {
      var r = String(s.semana || '').split('/');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(r[0] || '')) return;
      out.push({ i: i, desde: r[0], hasta: r[1] || PC.sumarDias(r[0], 6), titulo: s.titulo || '', nota: s.nota || '', final: !!s.versiones });
    });
    return out;
  }

  /* ------------------------------------------------------------------ cabecera: «Bloque A hasta el dom 4-10 · después, bloque B a 1:26 / 2:08» */
  function lineaCabecera() {
    var hoy = PC.hoyIso(), B = bloques();
    var b = PC.cal.bloque(hoy);
    for (var i = 0; i < B.length; i++) {
      if (B[i].clave !== b) continue;
      var t = 'Bloque ' + b + ' hasta el ' + corta(B[i].hasta);
      if (B[i + 1]) t += ' · después, bloque ' + B[i + 1].clave + ' a ' + ritmoBloque(B[i + 1], true);
      return t;
    }
    var prox = B.filter(function (x) { return x.desde > hoy; })[0];
    if (prox) return 'Bloque ' + prox.clave + ' desde el ' + corta(prox.desde) + ' a ' + ritmoBloque(prox, true);
    var S = semanas(), ult = S.length ? S[S.length - 1].hasta : null;
    if (ult && hoy > ult) return 'El plan terminó el ' + corta(ult);
    return '';
  }

  /* ------------------------------------------------------------------ P-1 · calendario en rejilla (T9) */
  function celda(iso, H, vent, verRango) {
    var dia = PC.cal.dia(iso);
    var n = +iso.slice(8);
    var enVent = !!(vent && iso >= vent.desde && iso <= vent.hasta);
    var rayada = enVent && (!verRango || (iso >= verRango.desde && iso <= verRango.hasta));
    if (!dia || (!dia.tipo && !rayada)) return '<div class="cal-d vacio" aria-hidden="true"><span class="n">' + n + '</span></div>';
    var est = dia.estado || 'futuro';
    var cls = ['cal-d', EST_CLS[est] || 'fut'];
    var hito = H[iso] || null;
    if (hito || dia.clave) cls.push('key');
    if (rayada) cls.push('vent');
    var tipo = dia.tipo || (rayada ? 'prueba' : null);
    var rot = hito ? hito.etiqueta : (dia.titulo || (rayada ? 'Prueba' : ''));
    var etq = [cap(PC.fmt.dia(iso, 'larga'))];
    if (rot) etq.push(rot);
    if (dia.tipo) etq.push(estadoTxt(dia)); else if (rayada) etq.push('semana de la prueba, la fecha llega con el llamamiento');
    if (dia.version) etq.push(dia.version.nombre);
    return '<button type="button" class="' + cls.join(' ') + '" data-f="' + iso + '" aria-label="' + esc(etq.join(' · ')) + '"' +
      (est === 'hoy' ? ' aria-current="date"' : '') + '>' +
      '<span class="n num">' + n + '</span>' + (tipo ? PC.icon(ICONO[tipo] || 'plan', 'ti') : '') +
      (rot ? '<span class="rot">' + esc(rot) + '</span>' : '') + '</button>';
  }
  function cabSemana(s) {
    var b = PC.cal.bloque(s.desde) || PC.cal.bloque(s.hasta);
    var bl = b ? PC.cal.bloqueInfo(b) : null;
    var rango = dm(s.desde) + ' al ' + dm(s.hasta);
    var dentro = '<span class="cs-r num">' + esc(rango) + '</span><span class="cs-t">' + esc(s.titulo) + '</span>' +
      (bl ? '<span class="chip pri cs-b">' + esc(b + ' · ' + ritmoBloque(bl, false)) + '</span>' : '');
    if (s.nota) return '<details class="cal-sem b-' + bloqueColor(b) + '"><summary>' + dentro + PC.icon('chev', 'sm chev') + '</summary><p class="cs-n">' + esc(s.nota) + '</p></details>';
    return '<div class="cal-sem b-' + bloqueColor(b) + '">' + dentro + '</div>';
  }
  function semanaHtml(s, H, vent, ver) {
    var hoy = PC.hoyIso();
    var actual = hoy >= s.desde && hoy <= s.hasta;
    var verRango = s.final ? rangoVersion(ver) : null;
    var h = '<div class="pl-w' + (actual ? ' actual' : '') + (s.final ? ' final' : '') + '" data-semana="' + s.desde + '">' + cabSemana(s);
    h += '<div class="cal-g" role="group" aria-label="' + esc('Semana del ' + dm(s.desde) + ' al ' + dm(s.hasta)) + '">';
    for (var i = 0; i < 7; i++) h += celda(PC.sumarDias(s.desde, i), H, s.final ? vent : null, verRango);
    h += '</div>';
    if (s.final) h += finalHtml(s, vent, ver, verRango);
    return h + '</div>';
  }
  /* fila bajo la última semana: ventana de la prueba y entradas de las versiones */
  function finalHtml(s, vent, ver, verRango) {
    var hp = hitoPrueba();
    var r = verRango || vent;
    var h = '';
    if (r) {
      var c0 = PC.dias(s.desde, r.desde) + 1, span = PC.dias(r.desde, r.hasta) + 1;
      h += '<div class="cal-g cal-vent" aria-hidden="false"><p class="cv-t" style="grid-column:' + c0 + ' / span ' + span + '">' +
        PC.icon('prueba', 'sm') + '<span>' + esc((hp ? hp.etiqueta : 'Prueba') + (ver ? ' · ' + versionNombre(ver) : '')) +
        ' · la fecha llega con el llamamiento</span></p></div>';
    }
    return h + versionesHtml(ver);
  }
  function versionNombre(clave) { var v = porId(versiones(), 'clave', clave); return v ? v.nombre : clave; }
  function entradaBtn(v, e) {
    return '<li><button type="button" class="pl-ent" data-key="' + esc(e.key) + '">' + PC.icon(ICONO[e.tipo] || 'plan', 'sm') +
      '<b>' + esc(e.dia) + '</b><span>' + esc(e.titulo || e.sesion || '') + '</span>' + (e.clave ? '<i class="pt" aria-label="clave"></i>' : '') + '</button></li>';
  }
  function versionesHtml(ver) {
    var V = versiones(); if (!V.length) return '';
    if (ver) {
      var v = porId(V, 'clave', ver); if (!v) return '';
      var sin = (v.dias || []).filter(function (e) { return !e.fecha; });
      if (!sin.length) return '';
      return '<div class="pl-vers"><p class="pl-rot">Sin fecha fija hasta el llamamiento · ' + esc(v.nombre) + '</p><ul class="pl-ents">' +
        sin.map(function (e) { return entradaBtn(v, e); }).join('') + '</ul></div>';
    }
    return '<div class="pl-vers dos"><p class="pl-rot">Según la fecha de la prueba</p><div class="pl-vers-g">' + V.map(function (v) {
      return '<div class="pl-ver"><p class="pl-vn">' + esc(v.nombre) + '</p><ul class="pl-ents">' + (v.dias || []).map(function (e) { return entradaBtn(v, e); }).join('') + '</ul></div>';
    }).join('') + '</div></div>';
  }
  function conmutadorHtml(ver) {
    var ops = [['', 'sin confirmar'], ['26-27', '26–27'], ['28-30', '28–30']];
    return '<div class="pl-prueba"><p class="pl-rot" id="pl-prueba-t">La prueba es:</p><div class="seg" role="group" aria-labelledby="pl-prueba-t">' +
      ops.map(function (o) { return '<button type="button" data-prueba="' + o[0] + '" aria-pressed="' + ((ver || '') === o[0] ? 'true' : 'false') + '">' + esc(o[1]) + '</button>'; }).join('') +
      '</div></div>';
  }
  function leyendaHtml() {
    var est = [['today', 'hoy'], ['done', 'hecho'], ['nomide', 'no mide'], ['miss', 'no hecho'], ['noreg', 'sin registrar'], ['fut', 'futuro'], ['rest', 'descanso'], ['fut key', 'clave'], ['vent', 'semana de la prueba']];
    var h = '<ul class="pl-ley">' + est.map(function (e) { return '<li><span class="cal-d mini ' + e[0] + '" aria-hidden="true"></span>' + esc(e[1]) + '</li>'; }).join('') + '</ul>';
    h += '<ul class="pl-ley">' + bloques().map(function (b) { return '<li><span class="pl-banda b-' + bloqueColor(b.clave) + '" aria-hidden="true"></span>' + esc('bloque ' + b.clave + ' · ' + dm(b.desde) + ' al ' + dm(b.hasta)) + '</li>'; }).join('') + '</ul>';
    return acc('Qué significa cada color', h, { cls: 'pl-leyenda' });
  }
  function macHtml() {
    var t = (P.contextoDelUsuario || {}).calendarioMac;
    if (!t) return '';
    var f = frases(t);
    return '<p class="pl-mac">' + PC.icon('plan', 'sm') + '<span>' + esc(f[0]) + '</span></p>';
  }
  function pintarCalendario() {
    var box = root.querySelector('.pl-cal-in'); if (!box) return;
    var abiertos = {};
    PC.$$('details[data-k]', box).forEach(function (d) { abiertos[d.getAttribute('data-k')] = d.open; });
    var hoy = PC.hoyIso(), lun = PC.lunes(hoy);
    var H = hitosPorFecha(), vent = ventana(), ver = versionActual();
    var S = semanas();
    var pasadas = S.filter(function (s) { return s.hasta < lun; });
    var resto = S.filter(function (s) { return s.hasta >= lun; });
    var dows = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
    var cab = '<div class="cal-g cal-dows" aria-hidden="true">' + dows.map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div>';
    var h = macHtml() + leyendaHtml().replace('<details class="acc', '<details data-k="ley" class="acc');
    if (pasadas.length) {
      h += '<details class="pl-pas" data-k="pas"><summary><span class="pl-sum">Semanas pasadas (' + pasadas.length + ')</span>' + PC.icon('chev', 'sm chev') + '</summary><div class="pl-pas-in">' +
        cab + pasadas.map(function (s) { return semanaHtml(s, H, vent, ver); }).join('') + '</div></details>';
    }
    h += cab;
    resto.forEach(function (s) {
      if (s.final) h += conmutadorHtml(ver);
      h += semanaHtml(s, H, vent, ver);
    });
    if (!resto.length && pasadas.length) h += '<p class="empty">No quedan semanas del plan por delante.</p>';
    box.innerHTML = h;
    PC.$$('details[data-k]', box).forEach(function (d) { var k = d.getAttribute('data-k'); if (abiertos[k]) d.open = true; });
    /* las notas de semana conservan su estado por semana */
    PC.$$('.pl-w', box).forEach(function (w) { var d = w.querySelector('details.cal-sem'); if (d) { d.setAttribute('data-k', 'n' + w.getAttribute('data-semana')); if (abiertos['n' + w.getAttribute('data-semana')]) d.open = true; } });
    if (hojaDe && /^\d{4}-\d{2}-\d{2}$/.test(hojaDe)) marcarCelda(hojaDe, true);
  }
  function marcarCelda(iso, si) {
    if (!root) return;
    PC.$$('.cal-d[aria-pressed]', root).forEach(function (b) { b.removeAttribute('aria-pressed'); });
    if (si) { var b = root.querySelector('.cal-d[data-f="' + iso + '"]'); if (b) b.setAttribute('aria-pressed', 'true'); }
  }
  function ponerVersion(v) {
    if (v === '26-27' || v === '28-30') PC.store.set('prueba', v); else PC.store.del('prueba');
    pintarCalendario();
    var b = root.querySelector('.pl-prueba button[data-prueba="' + (v || '') + '"]');
    if (b) { try { b.focus({ preventScroll: true }); } catch (e) {} }
    if (PC.cal.version() !== (v || null) && PC.q('prueba')) PC.toast('La dirección fija la versión con ?prueba=');
    try { DOC.dispatchEvent(new CustomEvent('pc:prueba', { detail: v || null })); } catch (e) {}
  }

  /* ------------------------------------------------------------------ hoja del día (modo lectura) */
  var CAMPOS_HOJA = [['objetivo', 'Objetivo'], ['hora', 'Hora'], ['lugar', 'Lugar'], ['protocolo', 'Protocolo'], ['decide', 'Decide'],
    ['semaforo', 'Semáforo del día'], ['regla', 'Regla'], ['medir', 'Medir'], ['registro', 'Qué apuntar'], ['nota', 'Nota'], ['porQue', 'Por qué']];
  function chipsDia(dia) {
    var c = [];
    if (dia.tipo) c.push('<span class="chip">' + PC.icon(ICONO[dia.tipo] || 'plan', 'sm') + esc(TIPO_TXT[dia.tipo] || dia.tipo) + '</span>');
    var et = estadoTxt(dia);
    if (et && dia.estado !== 'rest') c.push('<span class="chip ' + (EST_CHIP[dia.estado] || '') + '">' + esc(et) + '</span>');
    if (dia.bloque) c.push('<span class="chip pri">' + esc('bloque ' + dia.bloque) + '</span>');
    if (dia.clave) c.push('<span class="chip">clave</span>');
    if (dia.version) c.push('<span class="chip sup">' + esc('versión ' + dia.version.clave.replace('-', '–') + ' elegida en este móvil') + '</span>');
    return c.length ? '<p class="chips pl-chips">' + c.join('') + '</p>' : '';
  }
  function conflictosHtml(dia) {
    return (dia.conflictos || []).map(function (k) {
      return '<div class="aviso warn" role="note">' + PC.icon('alerta') + '<div><b>El plan de este día no coincide consigo mismo. Pregúntalo antes de la sesión</b>' +
        '<div class="dos"><q>' + esc(k.a && k.a.texto) + '</q><small>' + esc((k.a && k.a.campo) === 'protocolo' ? 'protocolo del día' : 'objetivo del día') + '</small>' +
        '<q>' + esc(k.b && k.b.texto) + '</q><small>' + esc((k.b && k.b.campo) === 'protocolo' ? 'protocolo del día' : 'objetivo del día') + '</small></div></div></div>';
    }).join('');
  }
  function registradoHtml(dia) {
    var hoy = PC.hoyIso();
    if (dia.fecha > hoy) return '';
    var h = '';
    (dia.hist || []).forEach(function (x) {
      var e = x.arr && HIS[x.arr] ? HIS[x.arr][x.i] : null;
      var st = x.hecho === false ? ['bad', 'no hecho'] : x.valida === false ? ['warn', 'no mide'] : ['ok', 'hecho'];
      h += '<div class="pl-reg" data-hist="' + esc(x.src) + '"><p><span class="chip ' + st[0] + '">' + st[1] + '</span> ' + esc(x.resumen || (e && e.sesion) || '') + '</p>' +
        (e && e.valoracion ? '<p class="faint">' + esc(e.valoracion) + '</p>' : '') + '</div>';
    });
    if (dia.hecho) h += '<p class="pl-hecho">' + esc(dia.hecho) + '</p>';
    if (dia.hechoAntiguo) h += '<p class="pl-hecho">' + esc(dia.hechoAntiguo.texto || dia.hechoAntiguo) + ' <span class="chip sup">de la web antigua</span></p>';
    if (!h && dia.tipo && dia.tipo !== 'descanso' && dia.tipo !== 'examen' && dia.fecha < hoy) h = '<p class="faint">Sin registrar</p>';
    return h ? '<h3 class="pl-hh">Registrado</h3>' + h : '';
  }
  function condicionHtml(dia) {
    var c = dia.condicion; if (!c) return '';
    var h = '<h3 class="pl-hh">Depende de</h3>';
    if (c.pregunta) h += '<p>' + esc(c.pregunta) + '</p>';
    if (c.opciones && c.opciones.length) h += '<ul class="pl-ul">' + c.opciones.map(function (o) { return '<li>' + esc(o.txt) + '</li>'; }).join('') + '</ul>';
    if (c.calculo && c.calculo.desde) h += '<p>' + esc(c.calculo.desde) + '</p>';
    if (c.compartida && c.desde) h += '<p>' + esc(c.desde) + '</p>';
    return h + '<p class="faint">Se elige en Hoy, en la tarjeta del día.</p>';
  }
  /* §6.1.7: todo día que pinta un tiempo de 1.000 enseña el 3:49 */
  function umbralHtml(dia) {
    var t = [dia.sesion, dia.objetivo, dia.protocolo].join(' ');
    if (!/1\.000/.test(t) || !/\b\d:\d{2}\b/.test(t)) return '';
    var e = elimSeg(); if (!e) return '';
    return '<p class="pl-umb1000" data-umbral="229"><span class="chip bad">' + esc(PC.fmt.t(e) + ' elimina') + '</span><span>' +
      esc('ritmo del ' + PC.fmt.t(e) + ' · ' + PC.fmt.num(e / 5, 1) + ' s por 200') + '</span></p>';
  }
  function fichaLectura(dia, iso) {
    var box = PC.el('div', { 'class': 'pl-ficha' });
    if (!dia || !dia.tipo) {
      var vt = ventana(), enV = vt && iso >= vt.desde && iso <= vt.hasta;
      box.innerHTML = enV ? '<p class="pl-vent-t">' + PC.icon('prueba', 'sm') + '<span>Semana de la prueba · la fecha llega con el llamamiento</span></p>'
        : '<p class="empty">El plan no tiene sesión para este día.</p>';
      return box;
    }
    var h = chipsDia(dia) + conflictosHtml(dia);
    if (dia.titulo) h += '<h3 class="pl-ht">' + esc(dia.titulo) + '</h3>';
    if (dia.sesion) h += '<p class="pl-ses">' + esc(dia.sesion) + '</p>';
    var kv = '';
    CAMPOS_HOJA.forEach(function (c) { var v = dia[c[0]]; if (v && typeof v === 'string') kv += '<dt>' + esc(c[1]) + '</dt><dd>' + esc(v) + '</dd>'; });
    if (kv) h += '<dl class="kv pl-kv">' + kv + '</dl>';
    h += umbralHtml(dia) + condicionHtml(dia) + registradoHtml(dia);
    box.innerHTML = h;
    return box;
  }
  /* versiones de la última quincena que afectan a este día, cuando no se ha elegido ninguna */
  function versionesDelDia(dia, iso) {
    if (!dia || !dia.final) return null;
    var ver = versionActual();
    var ents = dia.final.entradas || [];
    var vent = ventana();
    var enVent = vent && iso >= vent.desde && iso <= vent.hasta;
    var h = '';
    if (!ver && ents.length) {
      h = '<h3 class="pl-hh">Según la fecha de la prueba</h3>' + ents.map(function (e) {
        return '<div class="pl-vd"><p class="pl-vn">' + esc(e.nombre) + '</p><p>' + esc(e.entrada.sesion) + '</p></div>';
      }).join('');
    } else if (enVent && !ents.some(function (e) { return e.clave === ver; })) {
      var V = versiones().filter(function (v) { return !ver || v.clave === ver; });
      h = '<h3 class="pl-hh">Sin fecha fija hasta el llamamiento</h3>' + V.map(function (v) {
        var sin = (v.dias || []).filter(function (e) { return !e.fecha; });
        return '<div class="pl-vd"><p class="pl-vn">' + esc(v.nombre) + '</p><ul class="pl-ul">' + sin.map(function (e) { return '<li><b>' + esc(e.dia) + '</b> · ' + esc(e.sesion) + '</li>'; }).join('') + '</ul></div>';
      }).join('');
      var F = PC.cal.final();
      if (F && F.nota) h += acc('Nota de la semana', '<p>' + esc(F.nota) + '</p>');
    }
    if (!h) return null;
    return PC.el('div', { 'class': 'pl-hvers' }, h);
  }
  function pieHoja(iso) {
    var hoy = PC.hoyIso();
    var a = PC.el('a', { 'class': 'btn sec block pl-abrir', href: iso === hoy ? '#hoy' : '#hoy/' + iso }, PC.icon('hoy', 'sm') + 'Abrir en Hoy');
    a.addEventListener('click', function () { hojaDe = null; marcarCelda(null, false); PC.sheet.cerrar(true); });
    return a;
  }
  function abrirDia(iso) {
    var dia = PC.cal.dia(iso);
    /* la celda queda visible y con el foco, para que al cerrar la hoja el foco vuelva a ella */
    var cel = root && root.querySelector('.cal-d[data-f="' + iso + '"]');
    if (cel) {
      var pas = cel.closest('details'); if (pas && !pas.open) pas.open = true;
      if (DOC.activeElement !== cel) { try { cel.focus({ preventScroll: true }); } catch (e) {} }
    }
    var cont = PC.el('div', { 'class': 'pl-hoja' });
    var tarjeta = null;
    if (dia && dia.tipo && PC.sesion && typeof PC.sesion.tarjeta === 'function') {
      try { tarjeta = PC.sesion.tarjeta(dia, { modo: 'hoja' }); } catch (e) { PC._err('plan · tarjeta', e); tarjeta = null; }
    }
    if (tarjeta && tarjeta.nodeType === 1) cont.appendChild(tarjeta); else cont.appendChild(fichaLectura(dia, iso));
    var v = versionesDelDia(dia, iso); if (v) cont.appendChild(v);
    cont.appendChild(pieHoja(iso));
    hojaDe = iso;
    marcarCelda(iso, true);
    PC.sheet.abrir(cap(PC.fmt.dia(iso, 'larga')), cont, {
      alCerrar: function () {
        hojaDe = null; marcarCelda(null, false);
        if (location.hash === '#plan/' + iso) { try { history.replaceState(null, '', '#plan/calendario'); } catch (e) {} }
      }
    });
  }
  /* entrada de una versión (con o sin fecha): su texto literal */
  function abrirEntrada(key) {
    var V = versiones(), v = null, e = null;
    V.forEach(function (x) { (x.dias || []).forEach(function (d) { if (d.key === key) { v = x; e = d; } }); });
    if (!e) return;
    var dia = { tipo: e.tipo, clave: !!e.clave, estado: 'futuro', fecha: e.fecha || '' };
    var h = '<p class="pl-vn">' + esc(v.nombre) + '</p>' + chipsDia(dia) + (e.titulo ? '<h3 class="pl-ht">' + esc(e.titulo) + '</h3>' : '') + '<p class="pl-ses">' + esc(e.sesion) + '</p>';
    if (e.fecha) h += '<p class="faint">' + esc(cap(PC.fmt.dia(e.fecha, 'larga'))) + '</p>';
    var cont = PC.el('div', { 'class': 'pl-hoja' }, '<div class="pl-ficha">' + h + '</div>');
    hojaDe = key;
    PC.sheet.abrir(e.dia + (e.fecha ? '' : ' · sin fecha fija'), cont, { alCerrar: function () { hojaDe = null; } });
  }

  /* ------------------------------------------------------------------ P-2 · semana tipo */
  var NUM = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete'];
  function resumenSemana(E) {
    var orden = ['carrera', 'fuerza', 'circuito'], cuenta = {};
    E.forEach(function (d) { cuenta[d.tipo] = (cuenta[d.tipo] || 0) + 1; });
    var partes = [];
    orden.forEach(function (t, i) {
      var n = cuenta[t]; if (!n) return;
      if (!partes.length) partes.push(cap(n === 1 ? 'un día' : NUM[n] + ' días') + ' de ' + t);
      else partes.push((n === 1 ? 'uno' : NUM[n]) + ' de ' + t);
    });
    if (partes.length < 2) return partes.join('');
    return partes.slice(0, -1).join(', ') + ' y ' + partes[partes.length - 1];
  }
  function pintarSemana() {
    var box = root.querySelector('.pl-semana-in'); if (!box) return;
    var E = P.estructuraSemanal || [];
    var C = (P.protocoloDominadas || {}).cuando || [];
    var jc = ((P.sesionesTipo || {}).juevesCircuito || {}).hora || null;
    var h = '<p class="pl-lead">' + esc(resumenSemana(E)) + '</p><ol class="pl-st">';
    E.forEach(function (d) {
      var c = porId(C, 'dia', d.dia);
      var barra = c && c.tipo && c.tipo !== 'ninguna';
      var hora = d.hora || (d.tipo === 'circuito' && jc ? jc : '');
      h += '<li class="pl-dt t-' + esc(d.tipo) + (barra ? ' barra' : '') + '">' +
        '<div class="pl-dt-c"><span class="ic">' + PC.icon(ICONO[d.tipo] || 'plan') + '</span><div class="pl-dt-d"><b>' + esc(d.dia) + '</b>' +
        (hora ? '<small class="num">' + esc(hora) + '</small>' : '') + '</div></div>' +
        '<p class="pl-dt-t">' + sinCorte(d.contenido) + '</p>';
      if (barra) {
        /* la etiqueta de la barra es a la vez el desplegable con lo que se hace en ella */
        var det = '';
        if (c.prescripcion) det += '<p>' + esc(c.prescripcion) + '</p>';
        if (c.donde) det += '<p class="faint">' + esc(c.donde) + '</p>';
        if (c.nota) det += '<p class="faint">' + esc(c.nota) + '</p>';
        var et = '<span>Barra · ' + sinCorte(c.tipo) + '</span>';
        h += det ? '<details class="pl-barra-d"><summary class="pl-barra">' + PC.icon('tecnica', 'sm') + et + PC.icon('chev', 'sm chev') + '</summary><div class="in">' + det + '</div></details>'
          : '<p class="pl-barra">' + PC.icon('tecnica', 'sm') + et + '</p>';
      } else if (c && c.nota) h += '<p class="pl-sinbarra faint">' + esc(c.nota) + '</p>';
      if (d.nota) h += '<details class="pl-dt-por"><summary>' + PC.icon('info', 'sm') + '<span>Por qué</span>' + PC.icon('chev', 'sm chev') + '</summary><div class="in"><p>' + esc(d.nota) + '</p></div></details>';
      h += '</li>';
    });
    h += '</ol>';
    box.innerHTML = h;
  }

  /* ------------------------------------------------------------------ P-3 · ritmos: escalera A → B → C (G14) */
  function statVal(txt) {
    var p = dosValores(txt);
    return '<b class="num">' + esc(p[0]) + (p[1] ? '<small class="pl-esc">→ ' + esc(p[1]) + '</small>' : '') + '</b>';
  }
  function tarjetaBloque(bl, R, actual) {
    var o = '<article class="card pl-rb' + (actual ? ' hi' : '') + '" data-bloque="' + bl.clave + '">' +
      '<div class="card-h"><span class="ic pl-rb-l b-' + bloqueColor(bl.clave) + '" aria-hidden="true">' + esc(bl.clave) + '</span><div class="t"><h3>' + esc('Bloque ' + bl.clave) + '</h3>' +
      '<small>' + esc((R && R.cuando) || (dm(bl.desde) + ' al ' + dm(bl.hasta))) + '</small></div>' + (actual ? '<span class="end chip pri">ahora</span>' : '') + '</div>' +
      '<div class="stats pl-stats">' +
      '<div class="stat">' + statVal(bl.m200) + '<span>200 m</span></div>' +
      '<div class="stat">' + statVal(bl.m400) + '<span>400 m</span></div>' +
      '<div class="stat">' + statVal(bl.m600) + '<span>600 m</span></div>' +
      '<div class="stat">' + statVal(String(bl.objetivo1000 || '').replace(/\s+si .*$/, '')) + '<span>ritmo de 1.000</span></div></div>';
    if (R && R.porQue) o += acc('Por qué', '<p>' + esc(R.porQue) + '</p>');
    if (bl.clave === 'B' && bl.condicion) o += acc('Condición del bloque B', '<p>' + esc(bl.condicion) + '</p>');
    return o + '</article>';
  }
  function compuertaHtml(C) {
    var h = PC.cal.hitos().filter(function (x) { return x.decide && x.tipo === 'control'; })[0];
    return '<div class="pl-gate">' + (h ? '<span class="chip warn">' + PC.icon('control', 'sm') + esc('decide el ' + corta(h.fecha)) + '</span>' : '') +
      '<p>' + esc(C.condicion || '') + '</p></div>';
  }
  function flecha() { return '<span class="pl-fl" aria-hidden="true">' + PC.icon('flecha') + '</span>'; }
  function pintarRitmos() {
    var box = root.querySelector('.pl-ritmos-in'); if (!box) return;
    var B = bloques(), act = PC.cal.bloque(PC.hoyIso());
    var h = '<div class="pl-esc-g">';
    B.forEach(function (bl, i) {
      if (i > 0) h += bl.clave === 'C' && bl.condicion ? compuertaHtml(bl) : flecha();
      h += tarjetaBloque(bl, ritmo(bl.clave), bl.clave === act);
    });
    h += '</div>';
    h += '<figure class="chart pl-escala" id="pl-g14" data-inv="P8" role="group" aria-labelledby="pl-g14-t"><figcaption class="chart-h"><h3 id="pl-g14-t">Ritmo de 1.000 de cada bloque</h3>' +
      '<small>Más rápido a la derecha. En rojo, lo que elimina.</small></figcaption><div class="chart-c"></div></figure>';
    /* tabla de ritmos que no son de bloque: RS, TR y VEL */
    var RS = ritmo('RS'), TR = ritmo('TR'), VEL = ritmo('VEL');
    var filas = [];
    if (RS) filas.push([RS.clave, RS.nombre, 'techo ' + RS.techoFC + ' ppm' + (RS.mediaFC ? ' · media ' + RS.mediaFC.join('–') : '') + (RS.ritmoEsperado ? ' · ' + RS.ritmoEsperado : ''), frases(RS.reglaDeSalida)[0] || '']);
    if (TR) filas.push([TR.clave, TR.nombre, (TR.ritmoKm || '') + ' /km', '']);
    if (VEL) filas.push([VEL.clave, VEL.nombre, ['200 en ' + VEL.m200, VEL.m400 ? '400 en ' + VEL.m400 : '', VEL.ritmoKm ? VEL.ritmoKm + ' /km' : ''].filter(Boolean).join(' · '), VEL.criterio19oct ? 'Criterio del 19-10: ' + (frases(VEL.criterio19oct)[0] || '') : '']);
    var cab = ['Clave', 'Ritmo', 'Pulso o ritmo', 'Regla de salida o criterio'];
    h += '<div class="card pl-otros"><h3 class="pl-gt">Rodaje, trote y velocidad</h3><div class="tscroll pl-tabla"><table class="t stack"><thead><tr>' + cab.map(function (c) { return '<th scope="col">' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      filas.map(function (f) { return '<tr>' + f.map(function (c, i) { return '<td data-l="' + esc(cab[i]) + '"' + (c ? '' : ' class="pl-vacia"') + '>' + esc(c || '—') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    var por = '';
    if (RS && RS.reglaDeSalida) { var r = frases(RS.reglaDeSalida).slice(1).join(' '); if (r) por += '<p><span class="pl-rot">Rodaje suave</span> ' + esc(r) + '</p>'; }
    if (RS && RS.aplicaTambienA) por += '<p><span class="pl-rot">Calentamiento</span> ' + esc(RS.aplicaTambienA) + '</p>';
    if (VEL && VEL.porQue) por += '<p><span class="pl-rot">Velocidad</span> ' + esc(VEL.porQue) + '</p>';
    if (VEL && VEL.criterio19oct && frases(VEL.criterio19oct).length > 1) por += '<p><span class="pl-rot">Criterio del 19-10</span> ' + esc(frases(VEL.criterio19oct).slice(1).join(' ')) + '</p>';
    if (por) h += acc('Por qué', por);
    h += '</div>';
    var A = ritmo('A');
    if (A && (A.primer200 || A.avisoReloj)) {
      h += '<div class="card pl-otros"><h3 class="pl-gt">En el reloj, en cada sesión de series</h3><dl class="kv pl-reloj">';
      if (A.primer200) h += '<dt>Primer 200</dt><dd>' + esc(A.primer200) + '</dd>';
      if (A.avisoReloj) h += '<dt>Aviso y freno</dt><dd>' + esc(A.avisoReloj) + '</dd>';
      h += '</dl></div>';
    }
    box.innerHTML = h;
    var fig = box.querySelector('#pl-g14');
    dibujar(fig, dibujarEscala);
  }
  /* segundos del 1.000 que eliminan (tramo de 0 puntos del baremo) */
  function elimSeg() {
    var e = null;
    PC.baremo.tramos('mil').forEach(function (t) { if (t.pts === 0) e = t.min; });
    if (e === null) e = PC.fmt.parseT((P.planDeCarrera && P.planDeCarrera.examen && P.planDeCarrera.examen.elimina) || '');
    return e;
  }
  /* escala del ritmo de 1.000 por bloque, de 3:52 a 3:25 (más rápido a la derecha) */
  function dibujarEscala(fig) {
    var B = bloques(); if (!B.length) return;
    var act = PC.cal.bloque(PC.hoyIso());
    var elim = elimSeg();
    var objetivo = tiempos(((P.objetivo || {}).objetivoNuevo23sep || {}).mil)[0] || null;
    var S0 = PC.fmt.parseT('3:52'), S1 = PC.fmt.parseT('3:25');
    var lane = 30, top = 22;
    var ctx = PC.chart.base(fig, { h: top + B.length * lane + 30, m: { t: 0, r: 12, b: 30, l: 12 } });
    var x = PC.chart.lineal(S0, S1, 0, ctx.iw);
    var g = ctx.g, alto = top + B.length * lane;
    /* tramo que elimina */
    if (elim !== null) {
      var ge = PC.svg('g', { 'class': 'pl-elim', 'data-umbral': '229' }, g);
      PC.svg('rect', { x: 0, y: top - 4, width: Math.max(0, x(elim)), height: alto - top + 4, 'class': 'pl-elim-b' }, ge);
      PC.svg('line', { 'class': 'umbral', x1: Math.round(x(elim)) + .5, x2: Math.round(x(elim)) + .5, y1: top - 6, y2: alto, 'data-umbral': '229' }, ge);
      PC.svg('text', { 'class': 'lab elim', x: x(elim) + 4, y: 12, 'text-anchor': 'start', text: PC.fmt.t(elim) + ' elimina' }, ge);
    }
    if (objetivo !== null) {
      var xo = Math.round(x(objetivo)) + .5;
      PC.svg('line', { 'class': 'pl-obj', x1: xo, x2: xo, y1: top - 6, y2: alto }, g);
      PC.svg('text', { 'class': 'lab ok', x: xo - 4, y: 12, 'text-anchor': 'end', text: PC.fmt.t(objetivo) + ' objetivo' }, g);
    }
    /* eje */
    PC.svg('line', { 'class': 'eje', x1: 0, x2: ctx.iw, y1: alto + .5, y2: alto + .5 }, g);
    ['3:50', '3:45', '3:40', '3:35', '3:30', '3:25'].forEach(function (t) {
      var s = PC.fmt.parseT(t), xx = Math.round(x(s)) + .5;
      PC.svg('line', { 'class': 'eje', x1: xx, x2: xx, y1: alto, y2: alto + 4 }, g);
      PC.svg('text', { x: xx, y: alto + 18, 'text-anchor': s === S1 ? 'end' : 'middle', text: t }, g);
    });
    var partes = [];
    B.forEach(function (bl, i) {
      var ts = tiempos(bl.objetivo1000);
      if (!ts.length) return;
      var y = top + i * lane + lane / 2;
      var gb = PC.svg('g', { 'class': 'pl-lane' + (bl.clave === act ? ' act' : '') }, g);
      var x0 = x(ts[0]), x1 = ts[1] ? x(ts[1]) : null;
      if (x1 !== null) {
        PC.svg('line', { 'class': 'pl-paso', x1: x0, x2: x1, y1: y, y2: y }, gb);
        PC.svg('circle', { 'class': 'pl-pt hueco', cx: x1, cy: y, r: 5 }, gb);
      }
      PC.svg('circle', { 'class': 'pl-pt b-' + bloqueColor(bl.clave), cx: x0, cy: y, r: bl.clave === act ? 6 : 5 }, gb);
      var txt = bl.clave + ' · ' + PC.fmt.t(ts[0]) + (ts[1] ? ' → ' + PC.fmt.t(ts[1]) : '');
      /* el rótulo va a la izquierda del punto más lento para no cruzar la línea del objetivo;
         si no cabe sin pisar la línea del 3:49, a la derecha */
      var derecha = Math.max(x0, x1 || 0) + 10;
      var izq = Math.min(x0, x1 === null ? x0 : x1) - 10;
      var ancho = txt.length * 7;
      var limite = elim !== null ? x(elim) + 4 : 0;
      if (izq - ancho >= limite) PC.svg('text', { 'class': 'lab', x: izq, y: y + 4, 'text-anchor': 'end', text: txt }, gb);
      else PC.svg('text', { 'class': 'lab', x: Math.min(derecha, ctx.iw - ancho), y: y + 4, 'text-anchor': 'start', text: txt }, gb);
      partes.push(bl.clave + ' ' + PC.fmt.t(ts[0]) + (ts[1] ? ', o ' + PC.fmt.t(ts[1]) + ' si el simulacro lo respalda' : ''));
    });
    PC.chart.etiqueta(ctx, 'Ritmo de 1.000 por bloque: ' + partes.join('; ') + '.' + (objetivo ? ' Objetivo ' + PC.fmt.t(objetivo) + '.' : '') + (elim ? ' ' + PC.fmt.t(elim) + ' elimina.' : ''));
  }
  function dibujar(fig, fn) {
    if (!fig) return;
    try { fn(fig); } catch (e) { PC._err('plan · gráfica', e); }
    var host = fig.querySelector('.chart-c') || fig;
    var quitar = PC.alRedimensionar(host, function () { try { fn(fig); } catch (e) { PC._err('plan · gráfica', e); } });
    dibujos.push({ fig: fig, fn: fn, quitar: quitar });
  }
  function soltarDibujos() { dibujos.forEach(function (d) { try { d.quitar(); } catch (e) {} }); dibujos = []; }

  /* ------------------------------------------------------------------ P-4 · zonas y termómetros (G13) */
  function marcasFC() {
    var RS = ritmo('RS') || {}, U = ritmo('UMB') || {};
    var m = /techo (\d{3})/.exec(RS.reglaDeSalida || '');
    return { techo: RS.techoFC || null, salida: m ? +m[1] : null, umbral: Array.isArray(U.rangoFC) ? U.rangoFC : null };
  }
  function pintarZonas() {
    var box = root.querySelector('.pl-zonas-in'); if (!box) return;
    var A = P.atleta || {}, Z = P.zonasFC || {}, M = marcasFC();
    var cab = [];
    if (A.fcMaxima) cab.push('FC máx ≥ ' + A.fcMaxima + (A.fcMaximaMedidaEl ? ' (' + dm(A.fcMaximaMedidaEl) + ')' : ''));
    if (A.fcReposo) cab.push('reposo ' + A.fcReposo);
    if (/FCR/.test(Z.metodo || '')) cab.push('zonas por FCR');
    var h = '<p class="pl-lead num">' + esc(cab.join(' · ')) + '</p>';
    var como = '';
    if (A.fcMaximaNota) como += '<p>' + esc(A.fcMaximaNota) + '</p>';
    if (Z.metodo) como += '<p class="faint">' + esc(Z.metodo) + '</p>';
    if (como) h += acc('Cómo se calculan', como);
    h += '<figure class="chart pl-zbar" id="pl-g13" data-inv="P5" role="group" aria-labelledby="pl-g13-t"><figcaption class="chart-h"><h3 id="pl-g13-t">Zonas de pulso (ppm)</h3>' +
      '<small>' + esc([M.salida ? M.salida + ': los diez primeros minutos del rodaje' : '', M.techo ? M.techo + ': techo de rodaje' : '', M.umbral ? M.umbral.join('–') + ': umbral, sin sesiones hasta Cádiz' : ''].filter(Boolean).join(' · ')) + '</small></figcaption><div class="chart-c"></div></figure>';
    h += '<ol class="pl-zl">' + (Z.zonas || []).map(function (z) {
      return '<li><span class="pl-sw z' + z.zona + '" aria-hidden="true"></span><b class="num">' + esc('Z' + z.zona + ' · ' + z.min + '–' + z.max) + '</b><span>' + esc(z.uso) + '</span></li>';
    }).join('') + '</ol>';
    if (M.techo && M.umbral) {
      h += '<p class="pl-concl">' + esc('El techo ' + M.techo + ' y el umbral ' + M.umbral.join('–') + ' no suben') + '</p>';
      if (Z.porQueNoSubeElTecho) h += acc('Por qué', '<p>' + esc(Z.porQueNoSubeElTecho) + '</p>');
    }
    var T = Z.termometros || [];
    if (T.length) {
      h += '<h3 class="pl-hh">Termómetros</h3><div class="pl-termos">';
      T.forEach(function (t) {
        var kv = '';
        [['normal', 'Normal'], ['medido', 'Medido'], ['alarma', 'Alarma'], ['estado', 'Estado']].forEach(function (c) { if (t[c[0]]) kv += '<dt>' + c[1] + '</dt><dd>' + esc(t[c[0]]) + '</dd>'; });
        var sinVer = !!t.estado && /NO VERIFICADO/i.test(t.estado);
        h += '<div class="pl-termo"><h4>' + esc(t.nombre) + (sinVer ? ' <span class="chip sup">no verificado</span>' : '') + '</h4><dl class="kv">' + kv + '</dl></div>';
      });
      h += '</div><p class="pl-link"><a class="btn ghost" href="#marcas/graficas/pulso">Ver los termómetros en Marcas →</a></p>';
    }
    box.innerHTML = h;
    dibujar(box.querySelector('#pl-g13'), dibujarZonas);
  }
  function dibujarZonas(fig) {
    var Z = (P.zonasFC || {}).zonas || []; if (!Z.length) return;
    var M = marcasFC(), A = P.atleta || {};
    var ctx = PC.chart.base(fig, { h: 116, m: { t: 18, r: 12, b: 50, l: 12 } });
    var lo = 120, hi = 205;
    var x = PC.chart.lineal(lo, hi, 0, ctx.iw), g = ctx.g, bh = 30;
    Z.forEach(function (z) {
      PC.svg('rect', { 'class': 'pl-zr z' + z.zona, x: x(z.min), y: 0, width: Math.max(1, x(z.max) - x(z.min)), height: bh }, g);
      PC.svg('text', { x: (x(z.min) + x(z.max)) / 2, y: -5, 'text-anchor': 'middle', 'class': 'lab', text: 'Z' + z.zona }, g);
    });
    var id = ctx.id + '-ray';
    var defs = PC.svg('defs', null, ctx.svg);
    var pat = PC.svg('pattern', { id: id, width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    PC.svg('rect', { width: 6, height: 6, 'class': 'pl-ray-f' }, pat);
    PC.svg('line', { x1: 0, y1: 0, x2: 0, y2: 6, 'class': 'pl-ray-l' }, pat);
    var fila1 = bh + 16, fila2 = bh + 34;
    if (M.umbral) {
      var u0 = x(M.umbral[0]), u1 = x(M.umbral[1]);
      PC.svg('rect', { x: u0, y: -2, width: u1 - u0, height: bh + 4, style: 'fill:url(#' + id + ')', 'class': 'pl-umb' }, g);
      var cx = (u0 + u1) / 2, txt = M.umbral.join('–') + ' umbral · sin sesiones';
      var w = txt.length * 6.4;
      var tx = Math.max(w / 2, Math.min(ctx.iw - w / 2, cx));
      PC.svg('text', { x: tx, y: fila2, 'text-anchor': 'middle', text: txt }, g);
    }
    if (M.salida) {
      var xs = Math.round(x(M.salida)) + .5;
      PC.svg('line', { 'class': 'pl-mk', x1: xs, x2: xs, y1: -2, y2: bh + 4 }, g);
      PC.svg('text', { x: xs - 3, y: fila1, 'text-anchor': 'end', 'class': 'lab', text: String(M.salida) }, g);
    }
    if (M.techo) {
      var xt = Math.round(x(M.techo)) + .5;
      PC.svg('line', { 'class': 'pl-mk techo', x1: xt, x2: xt, y1: -2, y2: bh + 4 }, g);
      PC.svg('text', { x: xt + 3, y: fila1, 'text-anchor': 'start', 'class': 'lab', text: M.techo + ' techo' }, g);
    }
    var ult = Z[Z.length - 1];
    PC.svg('text', { x: ctx.iw, y: fila1, 'text-anchor': 'end', text: 'máx ≥ ' + (A.fcMaxima || ult.max) }, g);
    PC.chart.etiqueta(ctx, 'Zonas de pulso: ' + Z.map(function (z) { return 'Z' + z.zona + ' de ' + z.min + ' a ' + z.max; }).join(', ') + '.' +
      (M.salida ? ' Marca ' + M.salida + ' para los diez primeros minutos.' : '') + (M.techo ? ' Techo de rodaje ' + M.techo + '.' : '') + (M.umbral ? ' Umbral ' + M.umbral.join(' a ') + ', sin sesiones.' : ''));
  }

  /* ------------------------------------------------------------------ P-5 · reglas en cuatro grupos (cada regla, una sola vez en la web) */
  /* texto largo en párrafos: uno nuevo en cada frase que arranca con un rótulo en mayúsculas («VERDE (…)», «RACHA:»)
     o con «Palabra:» («Controles:»). El texto no cambia, solo se reparte */
  function enParrafos(t) {
    var P2 = [], cur = [];
    frases(t).forEach(function (f) {
      if (cur.length && (/^[A-ZÁÉÍÓÚÑ]{4,}\b/.test(f) || /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+:/.test(f))) { P2.push(cur.join(' ')); cur = []; }
      cur.push(f);
    });
    if (cur.length) P2.push(cur.join(' '));
    return P2.map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('');
  }
  function reglaHtml(o) {
    var h = '<article class="rule" id="pl-r-' + o.id + '" data-inv="' + o.inv + '"><h4>' + esc(o.titulo) + '</h4>';
    if (o.visHtml) h += o.visHtml; else if (o.vis) h += '<p>' + esc(o.vis) + '</p>';
    if (o.enlace) h += '<p class="pl-link"><a class="btn ghost" href="' + o.enlace.href + '">' + esc(o.enlace.txt + ' →') + '</a></p>';
    var por = '';
    if (o.resto) por += enParrafos(o.resto);
    if (o.origen) por += '<p class="faint"><span class="pl-rot">Origen</span> ' + esc(o.origen) + '</p>';
    if (por) h += acc(o.porTitulo || 'Por qué', por);
    return h + '</article>';
  }
  function reglaPlan(id, inv, extra) {
    var r = regla(id); if (!r) return null;
    var t = partir(r.texto);
    var o = { id: id, inv: inv, titulo: r.titulo, vis: t.vis, resto: t.resto, origen: r.origen || '' };
    Object.keys(extra || {}).forEach(function (k) { o[k] = extra[k]; });
    return o;
  }
  function frase(txt, re) { return frases(txt).filter(function (f) { return re.test(f); })[0] || ''; }
  /* leyenda de las lámparas con los cortes del plan (derivados.cortesSueno en minutos; web.semaforo.cortes en texto) */
  function lamparas() {
    var C = DER.cortesSueno || {}, T = (WEB.semaforo || {}).cortes || {};
    var v = typeof C.verde === 'number' ? C.verde : PC.fmt.parseSueno(T.verde || '');
    var r = typeof C.rojo === 'number' ? C.rojo : PC.fmt.parseSueno(T.rojo || '');
    if (!v || !r) return '';
    return '<p class="pl-lamps"><span><i class="lp g"></i>' + esc('Verde · ' + PC.fmt.sueno(v) + ' o más') + '</span>' +
      '<span><i class="lp a"></i>' + esc('Ámbar · ' + PC.fmt.sueno(r) + '–' + PC.fmt.sueno(v - 1)) + '</span>' +
      '<span><i class="lp r"></i>' + esc('Rojo · menos de ' + PC.fmt.sueno(r)) + '</span></p>';
  }
  function grupos() {
    var L = P.lesiones || {}, rec = DER.recortados || {};
    var G = [];
    /* por la mañana */
    var m = [];
    var dt = regla('dia-torcido');
    if (dt) {
      m.push({ id: 'semaforo', inv: 'R12,H5', titulo: dt.titulo, visHtml: lamparas(), enlace: { href: '#hoy', txt: 'Hacerlo ahora' }, resto: dt.texto, origen: dt.origen, porTitulo: 'Texto completo' });
    }
    var cu = reglaPlan('cuello', 'R10');
    if (cu) {
      /* el 29-9 (K10) el semáforo trata los síntomas por encima del cuello como día rojo como mínimo */
      var ce = ((WEB.semaforo || {}).cuello || {}).colorEncima;
      if (ce) {
        var COL = { verde: ['g', 'verde'], ambar: ['a', 'ámbar'], 'ámbar': ['a', 'ámbar'], rojo: ['r', 'rojo'] }[ce];
        if (COL) cu.visHtml = '<p>' + esc(cu.vis) + '</p><p class="pl-lamps pl-cuello"><span><i class="lp ' + COL[0] + '"></i>' +
          esc('En el semáforo, síntomas por encima del cuello: día ' + COL[1] + ' como mínimo') + '</span></p>';
      }
      m.push(cu);
    }
    var talon = frase(L.pies, /^Señal de alarma/);
    if (talon) m.push({ id: 'talon', inv: 'R14', titulo: 'Alarma de talón', vis: talon });
    G.push(['Por la mañana', m]);
    /* durante */
    var d = [];
    var dr = reglaPlan('dos-repeticiones', 'R14'); if (dr) d.push(dr);
    d.push({ id: 'prep-hombro', inv: 'R14', titulo: 'Prep-hombro obligatorio antes de la barra', enlace: { href: '#tecnica/dominada', txt: 'Técnica de la dominada' } });
    var ci = frase(rec['plan.lesiones.cintillo'] || L.cintillo, /^Regla de parada/);
    if (ci) d.push({ id: 'cintillo', inv: 'R9', titulo: 'Parada del cintillo', vis: ci });
    var md = regla('medir-distancias');
    if (md) {
      var txt = rec['plan.reglas[medir-distancias].texto'] || md.texto;
      var pm = partir(txt);
      d.push({ id: 'medir-distancias', inv: 'P10', titulo: md.titulo, vis: pm.vis, resto: pm.resto, origen: md.origen || '' });
    }
    G.push(['Durante', d]);
    /* por la noche */
    var n = [];
    var dor = reglaPlan('dormir', 'R1,R2'); if (dor) n.push(dor);
    G.push(['Por la noche', n]);
    /* la semana */
    var s = [];
    var de = reglaPlan('descanso', 'R11'); if (de) s.push(de);
    var nt = regla('no-testear');
    if (nt) s.push({ id: 'no-testear', inv: 'R13', titulo: nt.titulo, enlace: { href: '#tecnica/dominada', txt: 'Reglas de la barra' } });
    G.push(['La semana', s]);
    return G;
  }
  function pintarReglas() {
    var box = root.querySelector('.pl-reglas-in'); if (!box) return;
    box.innerHTML = '<div class="pl-grupos">' + grupos().map(function (g) {
      return '<div class="card pl-grupo"><h3 class="pl-gt">' + esc(g[0]) + '</h3>' + g[1].map(reglaHtml).join('') + '</div>';
    }).join('') + '</div>';
  }

  /* ------------------------------------------------------------------ P-6 · decisiones y pendientes */
  /* decisiones cuyo texto ya tiene su casa en otro sitio de la web: aquí solo la fecha, el arranque y el enlace */
  var CASAS = [
    { re: /protocoloDominadas\.reglas/, href: '#tecnica/dominada', txt: 'Reglas de la barra', corte: 'frase' },
    { re: /reglas\[dia-torcido\]/, href: '#plan/reglas', txt: 'cómo cuenta en el semáforo de la mañana', corte: 'dospuntos' },
    { re: /contextoDelUsuario\.calendarioMac/, href: '#plan/calendario', txt: 'Los entrenos, en el Calendario del Mac', corte: 'nada' },
    /* la condición de cada bloque vive en su tarjeta de Ritmos (B plegada, C en la compuerta): aquí no se repite el porqué */
    { re: /ritmos\[([A-Z]+)\]\.condicion/, href: '#plan/ritmos', txt: 'Escalera de ritmos', corte: 'corta', sinPor: true }
  ];
  function casaDe(fuente) { for (var i = 0; i < CASAS.length; i++) if (CASAS[i].re.test(fuente || '')) return CASAS[i]; return null; }
  function decisiones() {
    return (WEB.decisiones || []).map(function (d, i) { return { d: d, i: i }; })
      .sort(function (a, b) { return a.d.fecha < b.d.fecha ? 1 : a.d.fecha > b.d.fecha ? -1 : a.i - b.i; })
      .map(function (x) { return x.d; });
  }
  function decisionHtml(d) {
    var casa = casaDe(d.fuente);
    var h = '<li class="hecho"><span class="dot"></span><b class="num">' + esc(corta(d.fecha)) + '</b>';
    if (casa) {
      /* el texto vive en su casa: aquí, el arranque literal y el enlace */
      var arr = casa.corte === 'frase' ? frases(d.texto)[0] : casa.corte === 'dospuntos' ? String(d.texto).split(':')[0] + ':' : '';
      if (casa.corte === 'corta') {
        /* una frase corta se enseña; si es larga, solo su nombre («Condición del bloque C») */
        var f0 = frases(d.texto)[0] || '', mb = casa.re.exec(d.fuente || '');
        arr = palabras(f0) <= 12 ? f0 : (mb ? 'Condición del bloque ' + mb[1] + '.' : '');
      }
      var txt = arr ? casa.txt : cap(casa.txt);
      h += '<p>' + (arr ? esc(arr) + ' ' : '') + '<a href="' + casa.href + '">' + esc(txt) + ' →</a></p>';
    } else h += '<p>' + esc(d.texto) + '</p>';
    if (d.porQue && !(casa && casa.sinPor)) h += acc('Por qué', parrafos(d.porQue));
    return h + '</li>';
  }
  var CK_SVG = '<svg viewBox="0 0 26 26" aria-hidden="true"><rect class="cbox" x="2" y="2" width="22" height="22" rx="6"/><path class="tick" d="M7.5 13.5l3.8 3.8 7.2-8"/></svg>';
  function pendientesHtml() {
    var L = PC.web.pendientes();
    if (!L.length) return '<p class="faint">No hay pendientes.</p>';
    return '<div class="pl-pend-l">' + L.map(function (p) {
      var cuando = p.hasta ? 'hasta el ' + corta(p.hasta) : p.desde ? 'desde el ' + corta(p.desde) : '';
      return '<div class="ex' + (p.marcado ? ' done' : '') + '" data-id="' + esc(p.id) + '"><button type="button" class="ck" role="checkbox" aria-checked="' + (p.marcado ? 'true' : 'false') + '" aria-label="' + esc('Marcar: ' + p.texto) + '">' + CK_SVG + '</button>' +
        '<div class="nm">' + esc(p.texto) + (cuando ? '<small>' + esc(cuando) + '</small>' : '') + '</div></div>';
    }).join('') + '</div><p class="faint pl-pie">Se marcan en este móvil</p>';
  }
  function entrenadorHtml() {
    var lista = (WEB.pendientesEntrenador || []).slice();
    (DER.conflictosK || []).forEach(function (k) { if (k.detectado && !PC.web.resuelto(k.id)) lista.push({ id: k.id, texto: k.texto + (k.detalle ? ': ' + k.detalle : '') }); });
    if (lista.length) {
      return acc('Pendiente de decidir por el entrenador (' + lista.length + ')', '<ul class="pl-ul">' + lista.map(function (k) {
        return '<li>' + (k.id ? '<b>' + esc(k.id) + '</b> · ' : '') + esc(k.texto || k) + '</li>';
      }).join('') + '</ul>', { why: false });
    }
    if (P.resueltos29sep) return acc('Contradicciones del plan ya resueltas', '<p>' + esc(P.resueltos29sep) + '</p>', { why: false });
    return '';
  }
  function pintarDecisiones() {
    var box = root.querySelector('.pl-decisiones-in'); if (!box) return;
    var D = decisiones();
    var h = '<div class="pl-dec-g"><div class="card pl-dec"><h3 class="pl-gt">Decisiones</h3>' +
      (D.length ? '<ol class="tl pl-tl">' + D.map(decisionHtml).join('') + '</ol>' : '<p class="faint">Sin decisiones registradas.</p>') + '</div>' +
      '<div class="card pl-pend" id="pl-pend" data-inv="H16"><h3 class="pl-gt">Pendientes</h3>' + pendientesHtml() + '</div></div>' + entrenadorHtml();
    box.innerHTML = h;
  }
  function marcarPendiente(btn) {
    var fila = btn.closest('.ex'); if (!fila) return;
    var id = fila.getAttribute('data-id');
    var L = PC.store.get('pend', []) || [];
    if (!Array.isArray(L)) L = [];
    var i = L.indexOf(id), si = i < 0;
    if (si) L.push(id); else L.splice(i, 1);
    PC.store.set('pend', L);
    fila.classList.toggle('done', si);
    btn.setAttribute('aria-checked', si ? 'true' : 'false');
    try { DOC.dispatchEvent(new CustomEvent('pc:pendientes', { detail: L.slice() })); } catch (e) {}
  }

  /* ------------------------------------------------------------------ P-7 · por qué el plan es así (plegado) */
  function norm(t) { return String(Array.isArray(t) ? t.join(' ') : t || '').replace(/\s+/g, ' ').trim(); }
  /* un campo ya está en Decisiones si alguna decisión contiene su arranque y casi todo su texto */
  function enDecisiones(v) {
    var f = norm(v); if (!f) return false;
    return (WEB.decisiones || []).some(function (d) {
      var c = norm(d.texto) + ' ' + norm(d.porQue);
      return c.indexOf(f.slice(0, 60)) >= 0 && c.length >= f.length * 0.8;
    });
  }
  function fechaDeClave(k) { var m = /(\d{1,2})sep$/.exec(k); return m ? m[1] + '-9' : ''; }
  function pintarPorque() {
    var box = root.querySelector('.pl-porque-in'); if (!box) return;
    var G = [];
    function grupo(titulo, obj, campos) {
      if (!obj) return;
      var h = '', saltados = false;
      campos.forEach(function (c) {
        var v = obj[c[0]]; if (!v) return;
        if (enDecisiones(v)) { saltados = true; return; }
        h += '<div class="pl-pq"><p class="pl-rot">' + esc(c[1]) + (c[2] ? ' <span class="chip sup">' + esc(c[2]) + '</span>' : '') + '</p>' + parrafos(v) + '</div>';
      });
      if (saltados) h += '<p class="faint">' + esc('El veredicto de esta revisión está en Decisiones.') + '</p>';
      if (h) G.push('<div class="pl-pqg"><h3 class="pl-gt">' + esc(titulo) + '</h3>' + h + '</div>');
    }
    grupo('Revisión del ' + fechaDeClave('revision23sep'), P.revision23sep, [['veredicto', 'Veredicto'], ['razones', 'Razones'], ['loQueSiCambia', 'Lo que sí cambia']]);
    grupo('Revisión del ' + fechaDeClave('revision28sep'), P.revision28sep, [['pregunta', 'Pregunta'], ['veredictoDominadas', 'Dominadas'], ['palancaPrincipal', 'Palanca principal'], ['expectativa', 'Expectativa', 'supuesto'], ['sueno', 'Sueño'], ['loQueNoCambia', 'Lo que no cambia']]);
    var on = (P.objetivo || {}).objetivoNuevo23sep;
    grupo('Objetivo nuevo del ' + fechaDeClave('objetivoNuevo23sep'), on, [['comoSePersigue', 'Cómo se persigue'], ['condiciones', 'Condiciones'], ['riesgo', 'Riesgo'], ['actualizacion28sep', 'Actualización del ' + fechaDeClave('actualizacion28sep')]]);
    box.innerHTML = G.length ? acc('Por qué el plan es así', G.join(''), { why: false, cls: 'pl-pq-acc', id: 'pl-porque-d' }) : '';
  }

  /* ------------------------------------------------------------------ vista */
  function pintarTodo() {
    soltarDibujos();
    var sub = DOC.getElementById('vt-plan');
    if (sub) sub.textContent = lineaCabecera();
    [pintarCalendario, pintarSemana, pintarRitmos, pintarZonas, pintarReglas, pintarDecisiones, pintarPorque].forEach(function (f) {
      try { f(); } catch (e) { PC._err('plan · ' + (f.name || 'bloque'), e); }
    });
  }
  function enlazar() {
    root.addEventListener('click', function (e) {
      var t = e.target;
      var c = t.closest && t.closest('.cal-d[data-f]');
      if (c && root.contains(c)) {
        var iso = c.getAttribute('data-f');
        if (location.hash === '#plan/' + iso) abrirDia(iso); else location.hash = '#plan/' + iso;
        return;
      }
      var en = t.closest && t.closest('.pl-ent[data-key]');
      if (en) { abrirEntrada(en.getAttribute('data-key')); return; }
      var pr = t.closest && t.closest('.pl-prueba button[data-prueba]');
      if (pr) { ponerVersion(pr.getAttribute('data-prueba')); return; }
      var ck = t.closest && t.closest('.pl-pend .ck');
      if (ck) { marcarPendiente(ck); return; }
    });
  }
  PC.vista('plan', {
    init: function (r) { root = r; pintarTodo(); enlazar(); },
    show: function (sub) {
      if (!root) return false;
      var sb = DOC.getElementById('vt-plan'); if (sb) sb.textContent = lineaCabecera();
      var m = /^(\d{4}-\d{2}-\d{2})$/.exec(sub || '');
      if (m) {
        var cel = root.querySelector('.cal-d[data-f="' + m[1] + '"]');
        if (cel) {
          var pas = cel.closest('details'); if (pas && !pas.open) pas.open = true;
          try { cel.scrollIntoView({ block: 'center' }); } catch (e) { cel.scrollIntoView(); }
        }
        abrirDia(m[1]);
        return true;
      }
      if (hojaDe && PC.sheet.abierta()) { hojaDe = null; marcarCelda(null, false); PC.sheet.cerrar(true); }
      return false;
    },
    resize: function () { dibujos.forEach(function (d) { try { d.fn(d.fig); } catch (e) { PC._err('plan · gráfica', e); } }); },
    repintar: function () { if (root) pintarTodo(); }
  });
})();
