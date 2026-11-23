/* 70_estudio.js · pestaña «Estudio» de la web de Cristina. La lleva la sesión del estudio (web/cristina/doc/integracion-estudio.md, §5).
   · El plan sale de PC.D.estudio (datos/cristina/estudio.json), que genera el pipeline de la oposición y es PÚBLICO:
     solo temas, tareas y minutos. Nada de horas, trabajo, sueño, salud ni lugares.
   · Lo que marca Cristina se guarda solo en este móvil (PC.store «estudio-AAAA-MM-DD» → índices de tareas hechas).
     «Copiar para el tutor» lo convierte en el parte diario que pega en el chat del estudio.
   · Fechas con PC.hoyIso() (respeta ?hoy=). Clases e ids con prefijo «es-». */
(function () {
  'use strict';
  var PC = window.PC;
  if (!PC || !PC.D || !PC.D.estudio || !PC.vista) return;
  var E = PC.D.estudio, esc = PC.esc, LETRA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  var NIV = { f: 'fácil', m: 'medio', a: 'alto' }, FASE = { '1': '1.ª vuelta', '2': '2.ª vuelta', f: 'Simulacros' };
  var UI = { sel: null };
  var DIAS = Object.keys(E.dias || {}).sort(), PRIMERO = DIAS[0] || E.desde, ULTIMO = E.hasta;

  function tema(n) { return (E.temas || {})[n] || ''; }
  /* tarea → [título, detalle, minutos, icono] */
  function desc(t) {
    var c = t[0].replace('+', '');
    if (c === 'c') return ['Clase del tema ' + t[1] + (t[3] > 1 ? ', parte ' + t[2] + ' de ' + t[3] : ''), tema(t[1]) + '.', t[4] || 90, 'video'];
    if (c === 'l' && t[5]) return ['Tema ' + t[1] + ' con el resumen: ' + t[5], 'Lee, subraya y haz tu esquema. Lo que no entiendas, míralo en ese trozo de la clase.', t[4] || 50, 'editar'];
    if (c === 'l') return ['Estudia el tema ' + t[1] + (t[3] > 1 ? ', parte ' + t[2] + ' de ' + t[3] : ''), tema(t[1]) + '. Sin clase: con tu material.', t[4] || 50, 'editar'];
    if (c === 'e') return ['Estudio activo del tema ' + t[1], 'Esquema propio, ley literal y lo que más cae.', t[2], 'editar'];
    if (c === 't') return ['Test ' + NIV[t[2]] + ' del tema ' + t[1], 'ACRAPOL, 50 preguntas. Marca con ? las que dudes.', 45, 'examen'];
    if (c === 'r') return ['Reto de ' + t[2] + ' preguntas', (t[1] && t[1].length ? 'Temas ' + t[1].join(', ') : 'Las materias donde más puntos se van') + '.', t[2], 'temporizador'];
    if (c === 'h') return [t[1], t[2] || 'Apuntado con tu parte diario.', t[3] || 0, 'check'];
    if (c === 'o') return [t[1], t[2] || '', t[3] || 0, 'lista'];
    if (c === 'p') return ['Psicotécnicos' + (t[1] ? ', semana ' + t[1] : ''), t[2] === 'v' ? 'Los 3 vídeos de la semana.' : 'Ómnibus cronometrado.', t[2] === 'v' ? 50 : 60, 'reloj'];
    if (c === 'v') return ['Segunda vuelta del tema ' + t[1], tema(t[1]) + '. Resumen, ley literal y esquema.', 90, 'lista'];
    if (c === 's') return ['Simulacro de 100 preguntas', '50 minutos, con ? en las dudas.', 60, 'examen'];
    if (c === 'k') return ['Colchón', 'Lo que no salió esta semana. Si no queda nada, libre.', 60, 'descanso'];
    if (c === 'R') return ({ s: ['Repaso de la semana', 'Relee tus esquemas de lo visto.', 30], e: ['Repaso de esquemas', 'Los de los últimos temas.', 45],
      l: ['Libro de errores', 'El bloque más antiguo sin repasar.', 60], c: ['Corrección del simulacro', 'Fallos, blancos y dudas.', 60] })[t[1]].concat('lista');
    return [c, '', 0, 'info'];
  }
  function extra(t) { return t[0].charAt(0) === '+'; }
  function fijo(t) { return t[0] === 'h'; }   /* «h»: ya hecho, apuntado por el tutor con el parte diario */
  function tareas(f) { var T = (E.dias || {})[f] || []; return T.length && T[0][0] === 'x' ? [] : T; }
  function bloqueado(f) { var T = (E.dias || {})[f] || []; return !!(T.length && T[0][0] === 'x'); }
  function hechas(f) { var h = PC.store.get('estudio-' + f, null); return Array.isArray(h) ? h : []; }
  function hecho(f, i, H) { var t = tareas(f)[i]; return !!t && (fijo(t) || (H || hechas(f)).indexOf(i) >= 0); }
  function marcar(f, i) { if (fijo(tareas(f)[i] || ['x'])) return; var h = hechas(f), k = h.indexOf(i); if (k < 0) h.push(i); else h.splice(k, 1); PC.store.set('estudio-' + f, h); }
  function minimas(f) { return tareas(f).map(function (t, i) { return extra(t) ? -1 : i; }).filter(function (i) { return i >= 0; }); }
  function lunesDe(f) { return PC.sumarDias(f, -((PC.fecha(f).getDay() + 6) % 7)); }
  function semanaDe(f) { var l = lunesDe(f); return (E.sem || []).filter(function (s) { return s[0] === l; })[0] || null; }
  function faseDe(f) { var s = semanaDe(f); return s ? FASE[s[1]] : ''; }
  function cuenta(dias) {
    var m = 0, h = 0;
    dias.forEach(function (f) { var H = hechas(f); minimas(f).forEach(function (i) { m++; if (hecho(f, i, H)) h++; }); });
    return { m: m, h: h };
  }
  function minTxt(n) { return n >= 60 ? Math.floor(n / 60) + ' h' + (n % 60 ? ' ' + (n % 60) + ' min' : '') : n + ' min'; }
  function semana(l) { return [0, 1, 2, 3, 4, 5, 6].map(function (i) { return PC.sumarDias(l, i); }); }

  /* ------------------------------------------------------------------ partes */
  function pintarSemana(root, hoy) {
    var l = lunesDe(UI.sel), S = semanaDe(UI.sel), dias = semana(l), c = cuenta(dias);
    root.querySelector('#es-sem-t').textContent = 'Del ' + PC.fmt.dia(l, 'dm') + ' al ' + PC.fmt.dia(dias[6], 'dm') + (S ? ' · ' + FASE[S[1]] : '');
    root.querySelector('#es-sem-c').textContent = c.m ? c.h + ' de ' + c.m + ' tareas hechas' : 'sin tareas';
    root.querySelector('#es-week').innerHTML = dias.map(function (f, i) {
      var m = minimas(f), H = hechas(f), cls = [], ok = m.length && m.every(function (x) { return hecho(f, x, H); });
      if (f === hoy) cls.push('today'); else if (!m.length) cls.push('rest'); else if (ok) cls.push('done'); else if (f < hoy) cls.push('miss');
      var lab = PC.fmt.dia(f, 'larga') + (bloqueado(f) ? ', sin estudio' : (m.length ? ', ' + m.length + ' tareas' : ', descanso')) + (ok ? ', hecho' : '');
      return '<button type="button" class="' + cls.join(' ') + '" data-f="' + f + '" aria-pressed="' + (f === UI.sel) + '"' + (f === hoy ? ' aria-current="date"' : '') +
        ' aria-label="' + esc(lab) + '"><span aria-hidden="true">' + LETRA[i] + '</span><b aria-hidden="true">' + (+f.slice(8)) + '</b>' +
        PC.icon(ok ? 'check' : (m.length ? 'examen' : 'descanso')) + '</button>';
    }).join('');
    root.querySelector('[data-es="ant"]').disabled = l <= lunesDe(PRIMERO);
    root.querySelector('[data-es="sig"]').disabled = l >= lunesDe(E.hasta);
  }

  function pintarDia(root, hoy) {
    var f = UI.sel, T = tareas(f), H = hechas(f), host = root.querySelector('#es-dia');
    var mins = T.reduce(function (a, t) { return a + (extra(t) ? 0 : desc(t)[2]); }, 0);
    var cuando = f === hoy ? 'Hoy' : PC.fmt.dia(f, 'larga').replace(/^./, function (x) { return x.toUpperCase(); });
    var tit, sub;
    if (bloqueado(f)) { tit = cuando + ': sin estudio'; sub = 'Día libre en el plan.'; }
    else if (!T.length) { tit = cuando + ': descanso'; sub = 'No hay nada de estudio.'; }
    else {
      var pri = T.filter(function (t) { return !extra(t) && !fijo(t); })[0] || T.filter(function (t) { return !extra(t); })[0] || T[0];
      tit = cuando + ': ' + desc(pri)[0].replace(/^./, function (x) { return x.toLowerCase(); });
      sub = minTxt(mins) + ' de mínimo' + (T.length > 1 ? ' · ' + T.length + ' tareas' : '');
    }
    var h = ['<div class="es-dcab"><button type="button" class="icon-btn es-ant" data-es="dant" aria-label="Día anterior"' + (f <= PRIMERO ? ' disabled' : '') + '>' + PC.icon('flecha') + '</button>' +
      '<div class="card-h"><div class="t"><h2>' + esc(tit) + '</h2><small>' + esc(sub) + '</small></div></div>' +
      '<button type="button" class="icon-btn" data-es="dsig" aria-label="Día siguiente"' + (f >= ULTIMO ? ' disabled' : '') + '>' + PC.icon('flecha') + '</button></div>'];
    if (T.length) {
      var orden = T.map(function (t, i) { return i; }).sort(function (a, b) { return (extra(T[a]) - extra(T[b])) || (a - b); });
      h.push('<ul class="es-l">' + orden.map(function (i) {
        var t = T[i], d = desc(t), on = hecho(f, i, H);
        return '<li><button type="button" class="es-t' + (on ? ' on' : '') + '" data-i="' + i + '" aria-pressed="' + on + '">' +
          '<span class="es-c" aria-hidden="true">' + (on ? PC.icon('check', 'sm') : '') + '</span>' +
          '<span class="es-tx"><b>' + esc(d[0]) + '</b><small>' + esc(d[1]) + '</small></span>' +
          '<span class="es-m">' + (d[2] ? '<span class="num">' + d[2] + ' min</span>' : (fijo(t) ? '<span class="chip ok">hecho</span>' : '')) + (extra(t) ? '<span class="chip sup">si da tiempo</span>' : '') + '</span></button></li>';
      }).join('') + '</ul>');
      h.push('<div class="es-pie"><button type="button" class="btn sec" data-es="copiar">' + PC.icon('copiar', 'sm') + 'Copiar para el tutor</button>' +
        '<small class="muted">Lo que marcas se queda en este móvil.</small></div>');
    }
    host.innerHTML = h.join('');
  }

  function pintarCamino(root, hoy) {
    var vistos = 0, ultimo = null;
    Object.keys(E.dias || {}).forEach(function (f) {
      if (f > hoy) return;
      var H = hechas(f);
      tareas(f).forEach(function (t, i) { if ((t[0] === 'c' || t[0] === 'l') && t[2] === t[3] && H.indexOf(i) >= 0) vistos++; });
    });
    var sl = (E.sem || []).filter(function (s) { return s[0] > lunesDe(hoy) && s[2].length; }).slice(0, 6);
    var fases = (E.fases || []).map(function (x) {
      var dentro = hoy >= x[1] && hoy <= PC.sumarDias(x[2], 6);
      return '<li class="' + (dentro ? 'on' : (hoy > x[2] ? 'ya' : '')) + '"><b>' + FASE[x[0]] + '</b><span class="muted">' + PC.fmt.dia(x[1], 'dm') + ' al ' + PC.fmt.dia(PC.sumarDias(x[2], 6), 'dm') + '</span></li>';
    }).join('');
    var semPas = cuenta(semana(PC.sumarDias(lunesDe(hoy), -7)));
    root.querySelector('#es-camino').innerHTML =
      '<div class="card-h"><div class="ic">' + PC.icon('plan') + '</div><div class="t"><h2>' + esc(faseDe(hoy) || 'Plan de estudio') + ' hasta el examen</h2><small>Examen previsto: ' + esc(E.examen || '') + '.</small></div></div>' +
      '<div class="stats"><div class="stat"><b class="num">' + vistos + '</b><span>temas que has marcado como terminados en esta vuelta</span></div>' +
      '<div class="stat"><b class="num">' + (semPas.m ? Math.round(100 * semPas.h / semPas.m) + ' %' : '–') + '</b><span>de lo mínimo hecho la semana pasada</span></div></div>' +
      '<ol class="es-fases">' + fases + '</ol>' +
      (sl.length ? '<details class="acc"><summary>' + PC.icon('plan', 'sm') + 'Próximas semanas' + PC.icon('chev', 'sm chev') + '</summary><div class="in"><ul class="es-prox">' +
        sl.map(function (s) { return '<li><span class="num">' + PC.fmt.dia(s[0], 'dm') + '</span>' + (s[1] === '2' ? 'Segunda vuelta: ' : 'Temas nuevos: ') + s[2].join(', ') + '</li>'; }).join('') + '</ul></div></details>' : '') +
      '<details class="acc why"><summary>' + PC.icon('info', 'sm') + 'Cómo está hecho el plan' + PC.icon('chev', 'sm chev') + '</summary><div class="in"><ul>' +
      '<li>Cada tema vuelve a salir para que no se olvide: test fácil a los 5 días, medio a las 2 semanas y retos mezclados a las 3 semanas, a los 49 días y a los 90. El test alto, en la segunda vuelta.</li>' +
      '<li>Lo mínimo no debería faltar. Lo de «si da tiempo» suma, pero no pasa nada si no sale.</li>' +
      '<li>Lo que no salga entre semana va al colchón del domingo.</li>' +
      '<li>Con tu parte diario, el tutor rehace el plan si una semana queda por debajo del 70 % o si cambia algo. Lo que se mueve son los temas nuevos, nunca los repasos.</li>' +
      '</ul><p class="muted">Plan generado el ' + PC.fmt.dia(E.gen, 'dm') + '.</p></div></details>';
  }

  function parte(f) {
    var T = tareas(f), H = hechas(f), si = [], no = [];
    T.forEach(function (t, i) { var d = desc(t)[0] + (extra(t) ? ' (si da tiempo)' : ''); (hecho(f, i, H) ? si : no).push(d); });
    var c = cuenta(semana(lunesDe(f)));
    return 'Estudio, ' + PC.fmt.dia(f) + '\nHecho: ' + (si.join('; ') || 'nada') + '\nSin hacer: ' + (no.join('; ') || 'nada') +
      '\nSemana: ' + c.h + ' de ' + c.m + ' tareas mínimas.';
  }

  /* lo mínimo sin marcar de los 14 días anteriores a hoy; cada fila lleva a su día */
  function pintarPendiente(root, hoy) {
    var lista = [], f = PC.sumarDias(hoy, -14);
    if (f < PRIMERO) f = PRIMERO;
    for (; f < hoy; f = PC.sumarDias(f, 1)) {
      var T = tareas(f), H = hechas(f);
      minimas(f).forEach(function (i) { if (!hecho(f, i, H)) lista.push([f, desc(T[i])[0]]); });
    }
    var host = root.querySelector('#es-pend');
    host.innerHTML = '<div class="card-h"><div class="ic">' + PC.icon(lista.length ? 'alerta' : 'check') + '</div><div class="t"><h2>' +
      (lista.length ? 'Te quedan ' + lista.length + ' tarea' + (lista.length > 1 ? 's' : '') + ' de días anteriores' : 'Nada pendiente de días anteriores') +
      '</h2><small>' + (lista.length ? 'Toca una para ir a su día y marcarla si ya la hiciste.' : 'Últimos 14 días, según lo que has marcado.') + '</small></div></div>' +
      (lista.length ? '<ul class="es-pl">' + lista.map(function (x) {
        return '<li><button type="button" data-ir="' + x[0] + '"><span class="num">' + esc(PC.fmt.dia(x[0])) + '</span>' + esc(x[1]) + '</button></li>'; }).join('') + '</ul>' : '');
  }

  function pintar(root) {
    var hoy = PC.hoyIso();
    if (!UI.sel || UI.sel < PRIMERO || UI.sel > ULTIMO) UI.sel = hoy < PRIMERO ? PRIMERO : (hoy > ULTIMO ? ULTIMO : hoy);
    root.querySelector('#vt-estudio').textContent = PC.fmt.dia(hoy, 'larga') + (faseDe(hoy) ? ' · ' + faseDe(hoy) : '');
    pintarSemana(root, hoy); pintarDia(root, hoy); pintarPendiente(root, hoy); pintarCamino(root, hoy);
  }

  function init(root) {
    var raiz = root.querySelector('#es-raiz');
    raiz.innerHTML =
      '<section class="card es-semana" aria-label="Semana de estudio"><div class="es-cab"><button type="button" class="icon-btn es-ant" data-es="ant" aria-label="Semana anterior">' + PC.icon('flecha') + '</button>' +
      '<div class="es-cab-t"><b id="es-sem-t"></b><small class="muted" id="es-sem-c"></small></div>' +
      '<button type="button" class="icon-btn" data-es="sig" aria-label="Semana siguiente">' + PC.icon('flecha') + '</button></div>' +
      '<div class="week" id="es-week" role="group" aria-label="Días de la semana"></div></section>' +
      '<section class="card es-dia" id="es-dia" aria-live="polite"></section>' +
      '<section class="card es-pend" id="es-pend"></section>' +
      '<section class="card es-camino" id="es-camino"></section>';
    raiz.addEventListener('click', function (e) {
      try {
        var b, hoy = PC.hoyIso();
        if ((b = e.target.closest('#es-week button'))) { UI.sel = b.getAttribute('data-f'); }
        else if ((b = e.target.closest('[data-es="ant"]'))) { UI.sel = PC.sumarDias(lunesDe(UI.sel), -7); }
        else if ((b = e.target.closest('[data-es="sig"]'))) { UI.sel = PC.sumarDias(lunesDe(UI.sel), 7); }
        else if ((b = e.target.closest('[data-es="dant"]'))) { UI.sel = PC.sumarDias(UI.sel, -1); }
        else if ((b = e.target.closest('[data-es="dsig"]'))) { UI.sel = PC.sumarDias(UI.sel, 1); }
        else if ((b = e.target.closest('[data-ir]'))) { UI.sel = b.getAttribute('data-ir'); try { root.querySelector('#es-dia').scrollIntoView({ block: 'start', behavior: PC.reduceMotion() ? 'auto' : 'smooth' }); } catch (x) {} }
        else if ((b = e.target.closest('.es-t'))) { marcar(UI.sel, +b.getAttribute('data-i')); }
        else if ((b = e.target.closest('[data-es="copiar"]'))) { PC.copiar(parte(UI.sel)); return; }
        else return;
        pintar(root);
      } catch (x) { if (PC._err) PC._err('cristina · estudio', x); }
    });
    pintar(root);
  }

  PC.vista('estudio', { init: init, show: function () { pintar(document.getElementById('v-estudio')); }, repintar: function () { pintar(document.getElementById('v-estudio')); } });
})();
