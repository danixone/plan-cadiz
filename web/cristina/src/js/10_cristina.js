/* 10_cristina.js · ajusta el núcleo de Daniel (web/src/js/00_core.js) a la web de Cristina y ofrece PC.CR,
   las utilidades comunes de sus cuatro pestañas. Va detrás del núcleo y delante de los módulos.
   · Solo carrera: el 1.000 m con el baremo de mujeres (BOE-A-2026-15055): elimina desde 4:46.
   · Los días de Martín Freire y de CrossFit tienen tipo «otro»: no se registran aquí y no salen como «sin registrar».
   · El almacenamiento local usa el prefijo «cr-» (lo cambia construir.py en el núcleo): no se mezcla con el de Daniel.
   PC.CR:
   · dia(iso) → el día compuesto (PC.cal.dia) con .der (derivado: cr = estructura de la sesión, ej, K…)
   · ej(id) → la ficha de plan.ejercicios con ese id (o null) · ejs(ids) → lista
   · fase(id) → {clave, nombre, objetivo, desde, hasta, semanas} · faseDe(iso) → la fase de esa fecha
   · K() → {s, txt, de} o null (el mejor de los dos últimos controles) · ritmos() → derivados.ritmos
   · suave() → plan.ritmosEstimados.suave (estimación vigente del ritmo suave) o null
   · pts(s) → puntos del 1.000 con el baremo de mujeres · ELIMINA = 286 (4:46) · tramoTxt(t) → '4:01–4:09'
   · semana(n) → derivados.semanas[n-1] · proxima(desde) → el siguiente día de carrera (excluido «desde»)
   · tipoTxt(dia) → 'carrera suave', 'series', 'control', 'Martín Freire', 'CrossFit'… · icono(dia) → nombre de icono */
(function () {
  'use strict';
  var PC = window.PC;
  if (!PC) return;
  var D = PC.D, der = D.derivados || {}, plan = D.plan || {};
  PC.ATLETA = 'cristina';
  /* lo leen los módulos de Daniel (20_hoy.js…): nombre en «Sesión de …», bandera del camino y monigote rosa */
  var ESCALON = ((plan.objetivo || {}).escalones || []).reduce(function (o, e) { o[e.id] = PC.fmt.parseT(e.marca); return o; }, {});
  PC.PERFIL = { id: 'cristina', nombre: 'Cristina', meta: 'Prueba', fechaMeta: (plan.objetivo || {}).fecha || '', rosa: true,
    primerControl: (plan.objetivo || {}).primerControl || null,
    inicio1000: ESCALON.E1 || null,      /* Marcas: el simulador arranca en «dejar de eliminar» (4:45) mientras no haya control */
    meta1000: ESCALON.E2 || null };      /* la meta dibujada en la pista del 1.000: 5 puntos (4:09) */

  /* ---------------------------------------------------------------- baremo: solo el 1.000 de mujeres */
  PC.baremo.ELIMINA_MIL = 286;

  /* ---------------------------------------------------------------- chip de nota: el 1.000 */
  PC.notaActual = function () {
    var M = (der.marcas || {}).mil;
    if (!M) return { media: null, resultado: null, pts: { mil: null }, txt: '1.000 sin medir', cls: 'warn', sinMarca: true };
    var p = M.pts;
    var o = { media: p, resultado: p === 0 ? 'ELIMINA' : null, pts: { mil: p }, marca: M };
    if (p === 0) { o.txt = M.txt + ' · elimina'; o.cls = 'bad'; }
    else { o.txt = M.txt + ' · ' + p + (p === 1 ? ' punto' : ' puntos'); o.cls = p >= 5 ? 'ok' : 'warn'; }
    return o;
  };

  /* ---------------------------------------------------------------- estado de los días «otro» */
  var estado0 = PC.cal.estado;
  PC.cal.estado = function (dia) {
    if (dia && dia.tipo === 'otro') {
      var hoy = PC.hoyIso();
      if (dia.fecha === hoy) return 'hoy';
      if (dia.hist && dia.hist.length) return dia.hist.some(function (x) { return x.hecho === false; }) ? 'miss' : 'hecho';
      return 'otro';
    }
    return estado0(dia);
  };

  /* ---------------------------------------------------------------- pie: «falta registrar» solo con días de carrera */
  var comunes0 = PC.pintarComunes;
  function faltaCarrera() {
    var hoy = PC.hoyIso();
    var L = (der.dias || []).filter(function (d) { return d.fecha < hoy && d.cr; }).sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
    if (!L.length) return null;
    return (L[0].hist && L[0].hist.length) ? null : L[0].fecha;
  }
  PC.pintarComunes = function (root) {
    comunes0(root);
    var falta = faltaCarrera();
    PC.$$('[data-pc="pie"]', root || document).forEach(function (e) {
      PC.$$('.falta', e).forEach(function (s) { s.parentNode.removeChild(s); });
      if (falta) e.appendChild(PC.el('span', { 'class': 'falta' }, ' · falta registrar ' + PC.esc(PC.fmt.dia(falta, 'corta'))));
    });
    PC.$$('[data-pc="notaChip"]').forEach(function (e) {
      var n = PC.notaActual();
      if (n && n.sinMarca) e.setAttribute('aria-label', 'Tu 1.000: todavía sin medir; el primer control es el ' + PC.fmt.dia(plan.objetivo.primerControl, 'larga'));
      else if (n) e.setAttribute('aria-label', 'Tu 1.000: ' + n.txt);
    });
  };

  /* ---------------------------------------------------------------- PC.CR */
  var idxDer = {};
  (der.dias || []).forEach(function (d) { idxDer[d.fecha] = d; });
  var idxEj = {};
  (plan.ejercicios || []).forEach(function (e) { idxEj[e.id] = e; });
  function seg(txt) { var m = /^(\d+):(\d{2})(?:[.,](\d+))?$/.exec(String(txt || '').trim()); return m ? (+m[1]) * 60 + (+m[2]) + (m[3] ? +('0.' + m[3]) : 0) : null; }
  var CR = PC.CR = {
    ELIMINA: 286,
    dia: function (iso) { var d = PC.cal.dia(iso); if (d) d.der = idxDer[iso] || d.der || null; return d; },
    derivado: function (iso) { return idxDer[iso] || null; },
    ej: function (id) { return idxEj[id] || null; },
    ejs: function (ids) { return (ids || []).map(function (i) { return idxEj[i]; }).filter(Boolean); },
    fase: function (id) { var B = der.bloques || []; for (var i = 0; i < B.length; i++) if (B[i].clave === id) return B[i]; return null; },
    faseDe: function (iso) { var B = der.bloques || []; for (var i = 0; i < B.length; i++) if (B[i].desde <= iso && iso <= B[i].hasta) return B[i]; return null; },
    K: function () { return (der.ritmos || {}).K || null; },
    ritmos: function () { return der.ritmos || {}; },
    suave: function () { return (plan.ritmosEstimados || {}).suave || null; },
    seg: seg,
    pts: function (s) { return PC.baremo.pts('mil', s); },
    tramoTxt: function (t) {
      if (!t) return '';
      if (t.min === 0 || t.min === null) return PC.fmt.t(t.max) + ' o menos';
      if (t.max === null) return PC.fmt.t(t.min) + ' o más';
      return PC.fmt.t(t.min) + '–' + PC.fmt.t(t.max);
    },
    semana: function (n) { return (der.semanas || [])[n - 1] || null; },
    proxima: function (desde) {
      var L = (der.dias || []).filter(function (d) { return d.fecha > desde && d.cr; });
      return L.length ? CR.dia(L[0].fecha) : null;
    },
    tipoTxt: function (dia) {
      if (!dia) return '';
      var p = dia.der && dia.der.cr, sub = (dia.plan && dia.plan.sub) || (dia.der && dia.der.sub);
      if (dia.tipo === 'otro') return sub === 'martin' ? 'Martín Freire' : sub === 'crossfit' ? 'CrossFit' : 'otro entreno';
      if (dia.tipo === 'control') return p && p.tipo === 'simulacro' ? 'simulacro' : 'control';
      if (dia.tipo === 'prueba') return 'prueba';
      if (!p) return 'carrera';
      return { correrAndar: 'correr y andar', rodaje: p.larga ? 'la larga' : 'carrera suave', intervalos: p.ritmo === 'umbral' ? 'umbral' : 'intervalos', series: 'series', kmPartido: 'kilómetro partido' }[p.tipo] || 'carrera';
    },
    icono: function (dia) {
      if (!dia) return 'descanso';
      if (dia.tipo === 'otro') return (dia.plan && dia.plan.sub) === 'crossfit' || (dia.der && dia.der.sub) === 'crossfit' ? 'fuerza' : 'circuito';
      if (dia.tipo === 'control') return 'control';
      if (dia.tipo === 'prueba') return 'prueba';
      return 'carrera';
    }
  };
})();
