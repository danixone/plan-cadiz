/* 70_pruebas.js · «Las tres pruebas» en Marcas (solo en la web de Cristina), debajo de la nota.
   Las tres pruebas de mujeres del BOE (circuito, barra y 1.000 m) con su texto literal, el baremo de 0 a 10, dónde está ella
   y un simulador de la nota (media de las tres; un cero en cualquiera elimina).
   · Todo sale de plan.pruebasMujeres (leído del XML oficial del BOE): aquí no hay ninguna cifra escrita.
   · Lo que se teclea en el simulador se guarda solo en este móvil (PC.store, «cr-pruebas-sim»).
   · Tiempos sin redondear: un 4:09,5 en el 1.000 ya no es el tramo de 4:09 (el BOE no dice qué hace con las décimas). */
(function () {
  'use strict';
  var PC = window.PC;
  if (!PC || !PC.PERFIL || !PC.CR) return;
  var esc = PC.esc, PM = (PC.D.plan || {}).pruebasMujeres;
  if (!PM || !PM.pruebas) return;

  function num(t) { if (t === null || t === undefined || t === '') return null; var v = parseFloat(String(t).replace(',', '.')); return isNaN(v) ? null : v; }
  function valor(pr, t) { return pr.unidad === 'm:ss' ? PC.fmt.parseT(t) : num(t); }
  /* puntos de un valor con los tramos del BOE: «menos» es mejor en circuito y 1.000; «más», en la barra */
  function puntos(pr, v) {
    if (v === null || v === undefined || isNaN(v)) return null;
    if (pr.id === 'barra') v = Math.floor(v + 1e-9);
    if (pr.id === 'cir') v = Math.round(v * 10) / 10;
    var T = pr.tramos.slice().sort(function (a, b) { return b.puntos - a.puntos; });
    for (var i = 0; i < T.length; i++) {
      var t = T[i], d = valor(pr, t.desde), h = valor(pr, t.hasta);
      if (pr.mejor === 'menos') {
        var tope = h === null ? null : (d === null ? h : Math.max(d, h));
        if (t.hasta === null && t.desde !== null) return t.puntos;          /* «12,8 s o más», «4:46 o más» */
        if (tope !== null && v <= tope + 1e-9) return t.puntos;
      } else {
        var suelo = d === null ? h : (h === null ? d : Math.min(d, h));
        if (suelo !== null && v >= suelo - 1e-9) return t.puntos;
      }
    }
    return 0;
  }
  function rangoTxt(pr, t) {
    var u = pr.unidad === 'm:ss' ? '' : ' s';
    if (t.desde !== null && t.hasta === null) return t.desde + u + ' o más';
    if (t.desde === null && t.hasta !== null) return t.hasta + u + ' o menos';
    return t.desde + '–' + t.hasta + u;
  }

  var CLAVE = 'pruebas-sim';
  function leerSim() {
    var s = PC.store.get(CLAVE, null);
    if (s) return s;
    var o = {};
    PM.pruebas.forEach(function (pr) { o[pr.id] = pr.marca && pr.marca.valor !== null && pr.marca.valor !== undefined ? String(pr.marca.valor).replace('.', ',') : ''; });
    return o;
  }

  function tabla(pr, pMarca) {
    var filas = pr.tramos.slice().sort(function (a, b) { return b.puntos - a.puntos; }).map(function (t) {
      var cls = t.puntos === 0 ? ' class="mc-td-elim"' : (pMarca === t.puntos ? ' class="cr-pr-suya"' : '');
      return '<tr><th scope="row">' + t.puntos + '</th><td' + cls + '>' + esc(rangoTxt(pr, t)) + (t.puntos === 0 ? ' · elimina' : '') + (pMarca === t.puntos && t.puntos !== 0 ? ' · tú' : '') + '</td></tr>';
    }).join('');
    return '<div class="tscroll"><table class="t mc-baremo"><thead><tr><th scope="col">Puntos</th><th scope="col">' + esc(pr.nombre) + '</th></tr></thead><tbody>' + filas + '</tbody></table></div>';
  }
  function lista(xs) { return xs && xs.length ? '<ul class="cr-pr-l">' + xs.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : ''; }
  function acc(t, c) { return '<details class="acc why"><summary>' + PC.icon('info', 'sm') + esc(t) + PC.icon('chev', 'sm chev') + '</summary><div class="in">' + c + '</div></details>'; }

  function resultado(sim) {
    var pts = PM.pruebas.map(function (pr) { return puntos(pr, valor(pr, sim[pr.id])); });
    var faltan = pts.filter(function (p) { return p === null; }).length, cero = pts.some(function (p) { return p === 0; });
    var media = faltan ? null : pts.reduce(function (a, b) { return a + b; }, 0) / pts.length;
    var txt, cls;
    if (cero) { txt = 'Eliminada: un cero en una prueba elimina aunque la media dé 5'; cls = 'bad'; }
    else if (faltan) { txt = (faltan === 1 ? 'Falta una prueba' : 'Faltan ' + faltan + ' pruebas') + ' para calcular la media'; cls = 'warn'; }
    else if (media >= 5) { txt = 'Media ' + PC.fmt.num(media, 2) + ': apta'; cls = 'ok'; }
    else { txt = 'Media ' + PC.fmt.num(media, 2) + ': no apta (hacen falta 5)'; cls = 'bad'; }
    return { pts: pts, txt: txt, cls: cls };
  }

  function pintar(host) {
    var sim = leerSim(), R = resultado(sim);
    var h = ['<div class="card"><div class="card-h"><div class="ic">' + PC.icon('marcas') + '</div><div class="t"><h2 id="cr-pruebas-t">Las tres pruebas</h2><small>Baremo de mujeres del BOE, con tus marcas y un simulador de la nota</small></div></div>'];
    h.push('<div class="cr-pr-sim" role="group" aria-label="Simulador de la nota">');
    PM.pruebas.forEach(function (pr, i) {
      var p = R.pts[i], ph = pr.unidad === 'm:ss' ? '4:30' : (pr.id === 'cir' ? '11,5' : '51');
      h.push('<label class="cr-pr-in"><span>' + esc(pr.orden + '. ' + pr.nombre) + (pr.unidad === 'm:ss' ? ' (m:ss)' : ' (s)') + '</span>' +
        '<input inputmode="decimal" autocomplete="off" data-pr="' + pr.id + '" value="' + esc(sim[pr.id] || '') + '" placeholder="' + ph + '" aria-label="' + esc(pr.nombre) + '">' +
        '<em class="chip ' + (p === null ? 'sup' : p === 0 ? 'bad' : p >= 5 ? 'ok' : 'warn') + '">' + (p === null ? 'sin dato' : p === 0 ? '0 · elimina' : p + (p === 1 ? ' punto' : ' puntos')) + '</em></label>');
    });
    h.push('<p class="cr-pr-res ' + R.cls + '" aria-live="polite"><b>' + esc(R.txt) + '</b></p>');
    h.push('<div class="cr-pr-pie"><button type="button" class="btn ghost" data-pra="marcas">Volver a sus marcas</button></div></div>');
    h.push('<p class="cr-pr-nota">' + esc(PM.orden) + '</p><p class="cr-pr-nota">' + esc(PM.calificacion.join(' ')) + '</p>');
    PM.pruebas.forEach(function (pr) {
      var m = pr.marca || {}, pM = m.valor !== null && m.valor !== undefined ? puntos(pr, valor(pr, m.valor)) : null;
      var cab = '<p class="cr-pr-m"><b>Tú:</b> ' + esc(m.txt || 'sin dato') + (pM !== null ? ' · ' + pM + (pM === 1 ? ' punto' : ' puntos') : '') + ' <small>(' + esc(m.fuente || '') + ')</small></p>';
      var desc = '<p><b>Objetivo.</b> ' + esc(pr.objetivo) + '</p><p><b>Posición inicial.</b> ' + esc(pr.posicion) + '</p>' +
        (pr.ejecucion ? '<p><b>Ejecución.</b> ' + esc(pr.ejecucion) + '</p>' : '') + '<p><b>Reglas</b></p>' + lista(pr.reglas) + '<p><b>Intento nulo</b></p>' + lista(pr.nulo);
      h.push('<section class="cr-pr" aria-label="' + esc(pr.nombre) + '"><h3 class="cr-pr-h">' + esc(pr.orden + '. ' + pr.nombre) + '</h3>' + cab + tabla(pr, pM) + acc('Qué dice el BOE de esta prueba', desc) + '</section>');
    });
    h.push('<p class="cr-pr-fuente"><small>' + esc(PM.fuente) + '</small></p></div>');
    host.innerHTML = h.join('');
  }

  function montar() {
    if (PC.vistaActual && PC.vistaActual() !== 'marcas') return;
    var nota = document.getElementById('mc-nota');
    if (!nota) return;
    var host = document.getElementById('cr-pruebas');
    if (!host) {
      host = PC.el('section', { id: 'cr-pruebas', 'class': 'mc-sec', 'data-ancla': 'pruebas', 'aria-labelledby': 'cr-pruebas-t' });
      nota.parentNode.insertBefore(host, nota.nextSibling);
      var nav = document.querySelector('#v-marcas .subnav, .subnav[aria-label="En esta pestaña"]');
      var vista = nota.closest('[id^="v-"]');
      var sn = vista ? vista.querySelector('.subnav') : nav;
      if (sn && !sn.querySelector('a[href="#marcas/pruebas"]')) {
        var a = PC.el('a', { href: '#marcas/pruebas' }, 'Pruebas');
        var ref = sn.querySelector('a[href="#marcas/controles"]');
        sn.insertBefore(a, ref || null);
      }
      host.addEventListener('input', function (e) {
        var x = e.target.closest('[data-pr]'); if (!x) return;
        var s = leerSim(); s[x.getAttribute('data-pr')] = x.value; PC.store.set(CLAVE, s);
        var pos = x.selectionStart, id = x.getAttribute('data-pr');
        pintar(host);
        var n = host.querySelector('[data-pr="' + id + '"]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (er) {} }
      });
      host.addEventListener('click', function (e) {
        if (e.target.closest('[data-pra="marcas"]')) { PC.store.del(CLAVE); pintar(host); }
      });
    }
    pintar(host);
  }
  document.addEventListener('pc:vista', function () { try { montar(); } catch (x) { if (PC._err) PC._err('cristina · pruebas', x); } });
  PC.CR.pruebas = { puntos: puntos, valor: valor };
})();
