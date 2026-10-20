/* 60_consejo.js · «Cómo llegas hoy» (solo en la web de Cristina), debajo de la tarjeta del día en Hoy.
   Marca dolor, rigidez, piernas, sueño, estrés, energía, lo de ayer y las alarmas, y aplica la regla
   plan.reglas[como-llegas] a la sesión del día: tal cual, con frenos, más suave y más corta, sin carrera o al médico.
   · Lo marcado se guarda solo en este móvil (PC.store, prefijo «cr-»): no va a los datos ni al repositorio.
   · Las cifras de ritmo salen de plan.ritmosEstimados; las frases de las reglas, de plan.reglas.
   · Solo para el día de hoy (PC.hoyIso(), que respeta ?hoy=). */
(function () {
  'use strict';
  var PC = window.PC;
  if (!PC || !PC.PERFIL || !PC.CR) return;
  var esc = PC.esc, plan = PC.D.plan || {};

  var ZONAS = [['gemelo', 'Gemelo'], ['talon', 'Talón'], ['aquiles', 'Aquiles'], ['espinilla', 'Espinilla'], ['rodilla', 'Rodilla'], ['cadera', 'Cadera'], ['otra', 'Otra']];
  var ALARMAS = [['hueso', 'Me duele un punto del hueso al apretarlo'], ['pata', 'Me duele al saltar a la pata coja o al andar'],
    ['reposo', 'Me duele en reposo o de noche'], ['enferma', 'Fiebre, pecho cargado o tos']];
  var PIERNAS = [['frescas', 'Frescas'], ['normales', 'Normales'], ['cargadas', 'Cargadas'], ['muy', 'Muy cargadas']];
  var SUENO = [['bien', '7 h o más'], ['regular', '6–7 h'], ['mal', 'Menos de 6 h']];
  var ESTRES = [['poco', 'Poco'], ['normal', 'Normal'], ['mucho', 'Mucho']];
  var ENERGIA = [['bien', 'Bien'], ['floja', 'Floja']];
  var SINO = [['no', 'No'], ['si', 'Sí']];
  var COMP = [['mejor', 'Mejor'], ['igual', 'Igual'], ['peor', 'Peor']];

  function regla(id) { return (plan.reglas || []).filter(function (r) { return r.id === id; })[0] || null; }
  function frase(id, re) { var r = regla(id), m = r ? re.exec(r.texto || '') : null, t = m ? m[0].trim() : ''; return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''; }
  function clave(f) { return 'consejo-' + f; }
  function leer(f) { return PC.store.get(clave(f), null); }
  function guardar(f, o) { PC.store.set(clave(f), o); }
  function etq(lista, v) { for (var i = 0; i < lista.length; i++) if (lista[i][0] === v) return lista[i][1]; return ''; }
  function seg(t) { return PC.fmt.parseT(t); }
  function mmss(s) { return PC.fmt.t(Math.round(s / 5) * 5); }

  /* «mitad lenta» de un rango de ritmo de plan.ritmosEstimados: 7:20-8:00 → 7:40-8:00 */
  function mitadLenta(r) {
    if (!r || !r.porKm || r.porKm.length < 2) return null;
    var a = seg(r.porKm[0]), b = seg(r.porKm[1]);
    if (a === null || b === null) return null;
    return mmss((a + b) / 2) + '–' + PC.fmt.t(b) + ' /km';
  }

  /* ---------------------------------------------------------------- tipo del día */
  function infoDia(f) {
    var d = PC.CR.dia(f);
    if (!d) return null;
    var cr = d.der && d.der.cr, sub = (d.plan && d.plan.sub) || (d.der && d.der.sub) || null;
    var correr = d.tipo === 'carrera' && !!cr;
    var calidad = !!(cr && /^(intervalos|series|kmPartido)$/.test(cr.tipo || ''));
    var dow = PC.fecha(f).getDay();
    var manana = PC.CR.dia(PC.sumarDias(f, 1));
    return { d: d, f: f, cr: cr, sub: sub, correr: correr, calidad: calidad, control: d.tipo === 'control', prueba: d.tipo === 'prueba',
      otro: d.tipo === 'otro', dow: dow, mananaCorre: !!(manana && (manana.tipo === 'carrera' || manana.tipo === 'control')),
      mananaControl: !!(manana && manana.tipo === 'control'), ayerOtro: (function () { var a = PC.CR.dia(PC.sumarDias(f, -1)); return !!(a && a.tipo === 'otro'); })() };
  }

  /* ---------------------------------------------------------------- la regla «Cómo llegas hoy» */
  function evaluar(I, r) {
    var out = { nivel: 'verde', titulo: '', que: [], porque: [], suma: 0 };
    var al = r.alarmas || {};
    var dolor = +r.dolor || 0, zona = etq(ZONAS, r.zona).toLowerCase(), comp = r.comp || 'igual';
    var dolorTxt = dolor ? 'dolor ' + dolor + '/10' + (zona ? ' en ' + (r.zona === 'otra' ? 'otra zona' : 'el ' + zona) : '') + (r.comp ? ', ' + etq(COMP, comp).toLowerCase() + ' que ayer' : '') : '';
    var pierna = dolor && r.zona !== 'otra';

    if (al.hueso || al.pata || al.reposo) {
      out.nivel = 'medico'; out.titulo = 'No corras ni saltes: al médico';
      out.que.push(frase('dolor', /No se corre y se va al médico[^.]*\./) || 'No se corre y se va al médico.');
      out.porque = ALARMAS.filter(function (a) { return al[a[0]] && a[0] !== 'enferma'; }).map(function (a) { return a[1]; });
      return out;
    }
    if (al.enferma) {
      out.nivel = 'no'; out.titulo = 'Hoy no se entrena';
      out.que.push('Con fiebre, pecho cargado o tos, descanso hasta que pase.');
      out.porque.push('Fiebre, pecho cargado o tos');
      return out;
    }
    if (dolor >= 4 || (dolor >= 1 && comp === 'peor')) {
      out.nivel = 'sin';
      out.porque.push(dolorTxt + (dolor >= 4 ? ': 4 o más' : ': va a más'));
      if (I.otro) { out.titulo = 'Sin piernas ni saltos'; out.que.push('Solo tren superior y sin saltos, comba ni carrera; o descanso. Díselo a quien te entrene hoy.'); }
      else { out.titulo = 'Hoy sin carrera'; out.que.push('Si andar no duele, 20–30 min andando; si no, descanso.'); }
      out.que.push('Si en tres días no baja, fisio o médico.');
      return out;
    }

    /* factores */
    function f(txt, n) { out.porque.push(txt + ' (+' + n + ')'); out.suma += n; }
    if (r.piernas === 'cargadas') f('piernas cargadas', 1);
    if (r.piernas === 'muy') f('piernas muy cargadas', 2);
    if (r.sueno === 'mal') f('menos de 6 h de sueño', 1);
    if (r.estres === 'mucho') f('mucho estrés', 1);
    if (r.energia === 'floja') f('energía floja', 1);
    if (r.ayer === 'si' && (I.correr || I.control)) f('piernas o saltos ayer', 1);
    if (dolor) f(dolorTxt, 1);
    if (r.rigidez === 'si') f('talón o Aquiles rígidos al levantarte', 1);
    var F = out.suma, cargada = r.piernas === 'cargadas' || r.piernas === 'muy';

    if (I.prueba) {
      out.nivel = F ? 'freno' : 'verde'; out.titulo = 'Día de prueba: lo escrito';
      out.que.push('Nada nuevo hoy. Si algo de lo marcado te preocupa, díselo al entrenador antes de salir.');
      return out;
    }
    if (I.otro && I.sub !== 'martin' && I.sub !== 'crossfit') {
      out.nivel = F >= 2 ? 'freno' : 'verde'; out.titulo = 'Hoy no corres';
      out.que.push(F >= 2 ? 'Descanso de verdad: nada de piernas ni saltos.' : 'Descanso.');
      return out;
    }
    if (I.otro) {
      var nombre = I.sub === 'martin' ? 'Martín Freire' : I.sub === 'crossfit' ? 'CrossFit' : 'el entreno';
      if (F >= 3) { out.nivel = 'sin'; out.titulo = 'Descanso, o solo movilidad'; out.que.push('Hoy, sin ' + nombre + ' o solo movilidad suave.'); }
      else if (pierna || r.rigidez === 'si') { out.nivel = 'suave'; out.titulo = nombre + ': sin saltos, comba ni carrera'; out.que.push('El resto, normal. Díselo a quien te entrene hoy.'); }
      else if (F === 2) { out.nivel = 'suave'; out.titulo = nombre + ': sin piernas pesadas ni saltos'; out.que.push('Tren superior, core y técnica, sí.'); }
      else { out.nivel = F ? 'freno' : 'verde'; out.titulo = nombre + ', normal'; }
      if (I.dow === 0 && I.mananaCorre) out.que.push(frase('descanso', /el domingo, si puedes, sin piernas pesadas[^.]*\./) || 'El domingo, sin piernas pesadas: mañana corres.');
      if (I.mananaControl) out.que.push(frase('descanso', /El viernes antes de un control[^.]*\./) || 'Mañana hay control: sin piernas ni saltos.');
      return out;
    }
    if (I.control) {
      if (F >= 3) { out.nivel = 'sin'; out.titulo = 'Hoy no hay control'; out.que.push('Con tres factores o más, el control se mueve: díselo al entrenador.'); }
      else if (F) { out.nivel = 'freno'; out.titulo = 'Control, con asterisco'; out.que.push(frase('ritmos', /Un control malo con asterisco[^.]*\./) || 'Un control malo con asterisco se apunta, pero no baja nada.'); }
      else { out.nivel = 'verde'; out.titulo = 'Control, tal cual'; }
      return out;
    }
    if (!I.correr) { out.nivel = 'verde'; out.titulo = 'Hoy no corres'; return out; }

    var miercoles = I.dow === 3;
    if (miercoles && cargada && (dolor || r.sueno === 'mal' || r.rigidez === 'si')) { out.nivel = 'sin'; out.regla = 'cansancio'; }
    else if (F >= 3) out.nivel = 'sin';
    else if (F === 2 || r.rigidez === 'si' || (miercoles && cargada)) out.nivel = 'suave';
    else if (F === 1) out.nivel = 'freno';
    else out.nivel = 'verde';

    var ses = (I.d && I.d.sesion) || '', cr = I.cr || {};
    if (out.nivel === 'sin') {
      out.titulo = 'Hoy sin carrera';
      out.que.push(out.regla === 'cansancio' ? (frase('cansancio', /Primero se toca el miércoles[^.]*\./) || 'El miércoles se quita.') : 'Con tres factores o más, la carrera se quita.');
      out.que.push('Si te apetece y no duele, 20–30 min andando. ' + (frase('cansancio', /Lo que se pierde no se recupera\./) || ''));
    } else if (out.nivel === 'suave') {
      out.titulo = 'Más suave y más corta';
      var ritmo = mitadLenta(cr.tipo === 'correrAndar' ? (plan.ritmosEstimados || {}).suaveTramos : (plan.ritmosEstimados || {}).suave);
      if (I.calidad) out.que.push((I.dow === 1 ? (frase('cansancio', /Si hace falta, el lunes se queda en 30 min suaves\./) + ' ') : '') + 'Hoy, 30 min suaves en lugar de la calidad.');
      else if (cr.tipo === 'correrAndar' && cr.n) {
        var n2 = Math.max(2, Math.round(cr.n * 2 / 3));
        out.que.push(n2 + ' × (' + cr.corre + ' + ' + cr.anda + ') en lugar de ' + cr.n + ' × (' + cr.corre + ' + ' + cr.anda + ').');
      } else if (cr.min) out.que.push(Math.max(10, Math.round(cr.min * 2 / 3 / 5) * 5) + ' min en lugar de ' + cr.min + ', con el mismo escalón.');
      if (ritmo && !I.calidad) out.que.push('A ' + ritmo + ' o más despacio, pudiendo hablar con frases.');
      out.que.push('Sin rectas ni cuestas.');
      if (r.rigidez === 'si') out.que.push('Con el talón o el Aquiles rígidos al levantarte, la carrera va suave y más corta (regla «Dolor»).');
    } else if (out.nivel === 'freno') {
      out.titulo = 'La sesión, con los frenos';
      out.que.push(ses + '.');
      if (dolor) out.que.push(frase('dolor', /Se para ese día[^.]*\./) || 'Se para ese día si el dolor va a más o te cambia la forma de correr.');
      else out.que.push(frase('suave', /Si un día vas ahogada[^.]*\./) || 'Si vas ahogada, anda un minuto.');
    } else {
      out.titulo = 'La sesión, tal cual';
      out.que.push(ses + '.');
      out.que.push(frase('suave', /Si un día vas ahogada[^.]*\./) || '');
    }
    if (cr.tipo === 'correrAndar' && out.nivel !== 'sin') out.que.push(frase('correr-andar', /Se sube de escalón[^.]*\./));
    return out;
  }

  /* ---------------------------------------------------------------- pintar */
  var NIVEL = { verde: ['ok', 'g', 'Adelante'], freno: ['ok', 'g', 'Con frenos'], suave: ['warn', 'a', 'Rebaja'], sin: ['bad', 'r', 'Sin carrera'], no: ['bad', 'r', 'No se entrena'], medico: ['bad', 'r', 'Médico'] };
  function segHTML(campo, valor, ops, nombre) {
    return '<div class="seg" role="group" aria-label="' + esc(nombre) + '">' + ops.map(function (o) {
      return '<button type="button" data-ck="' + campo + '" data-v="' + o[0] + '" aria-pressed="' + (valor === o[0] ? 'true' : 'false') + '">' + esc(o[1]) + '</button>';
    }).join('') + '</div>';
  }
  function opsHTML(campo, valor, ops, nombre) {
    return '<div class="cr-cl-ops" role="group" aria-label="' + esc(nombre) + '">' + ops.map(function (o) {
      return '<button type="button" data-ck="' + campo + '" data-v="' + o[0] + '" aria-pressed="' + (valor === o[0] ? 'true' : 'false') + '">' + esc(o[1]) + '</button>';
    }).join('') + '</div>';
  }
  function fila(t, html, nota) { return '<div class="cr-cl-q"><span class="cr-cl-t">' + esc(t) + '</span>' + html + (nota ? '<small>' + esc(nota) + '</small>' : '') + '</div>'; }

  function resumenTxt(I, r, E) {
    var p = [];
    if (+r.dolor) p.push('dolor ' + r.dolor + '/10' + (r.zona ? ' (' + etq(ZONAS, r.zona).toLowerCase() + ')' : '') + (r.comp ? ', ' + etq(COMP, r.comp).toLowerCase() + ' que ayer' : ''));
    else p.push('sin dolor');
    if (r.rigidez === 'si') p.push('rígida al levantarte');
    if (r.piernas) p.push('piernas ' + etq(PIERNAS, r.piernas).toLowerCase());
    if (r.sueno) p.push('sueño ' + etq(SUENO, r.sueno).toLowerCase());
    if (r.estres) p.push('estrés ' + etq(ESTRES, r.estres).toLowerCase());
    if (r.energia) p.push('energía ' + etq(ENERGIA, r.energia).toLowerCase());
    if (r.ayer === 'si') p.push('piernas o saltos ayer');
    ALARMAS.forEach(function (a) { if ((r.alarmas || {})[a[0]]) p.push(a[1].toLowerCase()); });
    return 'Cristina · ' + PC.fmt.dia(I.f, 'larga') + ' · ' + ((I.d && I.d.sesion) || '') + '\n' + p.join(' · ') + '\n→ ' + E.titulo + (E.que.length ? ': ' + E.que.filter(Boolean).join(' ') : '');
  }

  function pintar(host, f) {
    var I = infoDia(f);
    if (!I) { host.hidden = true; host.innerHTML = ''; return; }
    host.hidden = false;
    var r = leer(f), vacio = !r;
    r = r || {};
    var h = ['<div class="card-h"><div class="ic">' + PC.icon('info') + '</div><div class="t"><h2>Cómo llegas hoy</h2><small>Marca cómo estás y aquí sale qué hacer con la sesión. Se queda en este móvil.</small></div></div>'];
    var E = vacio ? null : evaluar(I, r);
    if (E) {
      var nv = NIVEL[E.nivel] || NIVEL.verde;
      h.push('<div class="cr-cl-r ' + nv[0] + '" aria-live="polite"><p class="cr-cl-rt"><i class="lamp ' + nv[1] + '" aria-hidden="true"></i><b>' + esc(E.titulo) + '</b></p>' +
        (E.que.filter(Boolean).length ? '<ul class="cr-cl-que">' + E.que.filter(Boolean).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
        '<p class="cr-cl-pq"><span>Por qué:</span> ' + (E.porque.length ? esc(E.porque.join(' · ')) + (E.suma ? ' · suma ' + E.suma : '') : 'nada de lo marcado frena la sesión') + '</p></div>');
    } else {
      h.push('<div class="cr-cl-r vacio"><p class="cr-cl-rt"><b>Marca abajo cómo llegas</b></p><p class="cr-cl-pq">Dolor, piernas, sueño y estrés: con eso sale si la sesión va tal cual, más suave o no va.</p></div>');
    }
    var dolor = +r.dolor || 0;
    h.push('<div class="cr-cl-f">');
    h.push(fila('Dolor, el que más (0–10)', '<div class="stepper" role="group" aria-label="Dolor, de 0 a 10"><button type="button" data-cst="dolor" data-d="-1" aria-label="Menos">−</button><output class="num">' + dolor + '</output><button type="button" data-cst="dolor" data-d="1" aria-label="Más">+</button></div>'));
    if (dolor) {
      h.push(fila('Dónde', opsHTML('zona', r.zona, ZONAS, 'Dónde duele')));
      h.push(fila('Comparado con ayer', segHTML('comp', r.comp, COMP, 'Comparado con ayer')));
    }
    h.push(fila('Talón o Aquiles rígidos al levantarte', segHTML('rigidez', r.rigidez, SINO, 'Rigidez al levantarte'), 'En los primeros pasos de la mañana'));
    h.push(fila('Piernas', segHTML('piernas', r.piernas, PIERNAS, 'Piernas')));
    h.push(fila('Sueño de anoche', segHTML('sueno', r.sueno, SUENO, 'Sueño')));
    h.push(fila('Estrés del día', segHTML('estres', r.estres, ESTRES, 'Estrés'), 'Trabajo, casa: lo que te tenga cargada de cabeza'));
    h.push(fila('Energía', segHTML('energia', r.energia, ENERGIA, 'Energía'), 'Floja: comiste poco o es un día malo de regla'));
    if ((I.correr || I.control) && I.ayerOtro) h.push(fila('Ayer, piernas o saltos', segHTML('ayer', r.ayer, SINO, 'Ayer, piernas o saltos'), 'En CrossFit o con Martín Freire'));
    h.push('<div class="cr-cl-q"><span class="cr-cl-t">Alarmas</span><div class="cr-cl-al" role="group" aria-label="Alarmas">' + ALARMAS.map(function (a) {
      var on = !!(r.alarmas || {})[a[0]];
      return '<button type="button" data-cal="' + a[0] + '" aria-pressed="' + on + '">' + PC.icon(on ? 'check' : 'alerta', 'sm') + '<span>' + esc(a[1]) + '</span></button>';
    }).join('') + '</div></div>');
    h.push('</div>');
    h.push('<div class="cr-cl-pie">' + (E ? '<button type="button" class="btn sec" data-ca="copiar">' + PC.icon('copiar', 'sm') + 'Copiar para el entrenador</button>' : '') +
      (E ? '<button type="button" class="btn ghost" data-ca="borrar">Borrar</button>' : '') + '<a class="btn ghost" href="#plan/reglas">La regla →</a></div>');
    host.innerHTML = h.join('');
    host.__I = I; host.__E = E;
  }

  function cambiar(host, f, fn) {
    var r = leer(f) || {};
    fn(r);
    guardar(f, r);
    var y = window.scrollY;
    pintar(host, f);
    window.scrollTo(0, y);
  }
  function enlazar(host) {
    if (host.__cl) return;
    host.__cl = true;
    host.addEventListener('click', function (e) {
      try {
        var f = PC.hoyIso(), b;
        if ((b = e.target.closest('[data-ck]'))) {
          var c = b.getAttribute('data-ck'), v = b.getAttribute('data-v');
          cambiar(host, f, function (r) { r[c] = r[c] === v ? null : v; });
        } else if ((b = e.target.closest('[data-cst]'))) {
          var d = +b.getAttribute('data-d');
          cambiar(host, f, function (r) { r.dolor = Math.max(0, Math.min(10, (+r.dolor || 0) + d)); if (!r.dolor) { r.zona = null; r.comp = null; } });
        } else if ((b = e.target.closest('[data-cal]'))) {
          var a = b.getAttribute('data-cal');
          cambiar(host, f, function (r) { r.alarmas = r.alarmas || {}; r.alarmas[a] = !r.alarmas[a]; });
        } else if ((b = e.target.closest('[data-ca="copiar"]'))) {
          if (host.__E) PC.copiar(resumenTxt(host.__I, leer(f) || {}, host.__E));
        } else if ((b = e.target.closest('[data-ca="borrar"]'))) {
          PC.store.del(clave(f)); pintar(host, f);
        }
      } catch (x) { if (PC._err) PC._err('cristina · cómo llegas', x); }
    });
  }

  function montar() {
    if (PC.vistaActual && PC.vistaActual() !== 'hoy') return;
    var ses = document.getElementById('hoy-ses');
    if (!ses) return;
    var host = document.getElementById('cr-consejo');
    if (!host) {
      host = PC.el('section', { id: 'cr-consejo', 'class': 'card cr-cl', 'aria-label': 'Cómo llegas hoy' });
      ses.parentNode.insertBefore(host, ses.nextSibling);
      enlazar(host);
    }
    var m = /^#hoy\/(\d{4}-\d{2}-\d{2})/.exec(location.hash || ''), hoy = PC.hoyIso();
    if (m && m[1] !== hoy) { host.hidden = true; return; }
    pintar(host, hoy);
  }
  document.addEventListener('pc:vista', function () { try { montar(); } catch (x) { if (PC._err) PC._err('cristina · cómo llegas', x); } });
  PC.CR.consejo = { evaluar: evaluar, infoDia: infoDia };
})();
