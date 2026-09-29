/* 00_core.js · M0 · núcleo común PC (especificación §10.3)
   Sin librerías. Todo lo que depende de la fecha se calcula al cargar.
   Los módulos leen los días con PC.cal.* y los derivados con PC.D.derivados.*

   Además de la interfaz de §10.3, el núcleo ofrece (para no reimplementarlo en cada módulo):
   · PC.q(nombre) parámetro de la URL (hoy, hora, tema, prueba, qa, abrir, sem, sinvibrar…).
     abrir=focus, abrir=fue y sem=… los aplica la vista Hoy (M2) en su show().
   · PC.sumarDias(iso, n) · PC.lunes(iso) · PC.fmt.dia(iso, 'dm') → '29-9' · PC.$ / PC.$$ · PC.reduceMotion()
   · PC.store.claves(prefijo) · PC.sstore (sessionStorage, misma interfaz)
   · PC.baremo.nota({mil, dom, cir}) → {pts:{mil,dom,cir}, media, suma, txt}
   · PC.cal.bloqueInfo(clave) · PC.cal.sinFecha() (entradas de la semana final sin fecha: «Prueba», «−2 días»…)
   · Dia (PC.cal.dia) lleva también: titulo, numeros, plan (el objeto crudo de plan.calendario), der (el derivado),
     final ({version, entradas, elegida, sinFecha, enSemanaFinal, ventana} en la semana de la prueba) y
     version ({clave, nombre, dia, key} si pc-prueba o ?prueba= eligen una versión que tiene ese día).
   · PC.notaActual() → {media, resultado, pts, txt:'4,67 · no apto', cls:'warn'|'ok'|'bad'}
     Todo elemento con data-pc="notaChip" recibe ese texto y clase; data-pc="datosHasta" la fecha corta.
   · PC.tema.{actual, efectivo, poner, pintar}; evento 'pc:tema' en document al cambiar.
   · PC.destello() · PC.puedeVibrar() · PC.focus.cuerpo() · PC.sheet.abierta() · PC.timer.revisar()
   · PC.vista(nombre, {init(root, ruta), show(sub, ruta), resize(), repintar()}): si show() devuelve true,
     el núcleo no desplaza (la vista gestiona su propio ancla); si no, va al [data-ancla="<sub>"] o recupera la posición.
     Evento 'pc:vista' en document tras cada cambio de ruta.
   · QA: data-qa-clave="fecha|lamparas|titulo|numeros|hoyhaces" marca los elementos que mide primeraPantalla. */
(function () {
  'use strict';
  var W = window, DOC = document;
  var PC = W.PC = W.PC || {};
  var noop = function () {};
  function err(donde, e) {
    try { (W.__errores = W.__errores || []).push(donde + ': ' + (e && e.message ? e.message : String(e))); } catch (x) {}
    if (W.console && console.error) console.error(donde, e);
  }
  PC._err = err;

  /* ------------------------------------------------------------------ parámetros de URL */
  var Q = {};
  (location.search || '').replace(/^\?/, '').split('&').forEach(function (p) {
    if (!p) return;
    var i = p.indexOf('=');
    var k = decodeURIComponent(i < 0 ? p : p.slice(0, i));
    var v = i < 0 ? '' : decodeURIComponent(p.slice(i + 1).replace(/\+/g, ' '));
    Q[k] = v;
  });
  PC.q = function (k) { return Object.prototype.hasOwnProperty.call(Q, k) ? Q[k] : null; };
  PC.qa = Q.qa === '1';

  /* sinvibrar=1: imita Safari de iOS (sin navigator.vibrate) antes de que nadie lo mire */
  if (Q.sinvibrar === '1') {
    try { delete Navigator.prototype.vibrate; } catch (e) {}
    try { if ('vibrate' in navigator) Object.defineProperty(navigator, 'vibrate', { value: undefined, configurable: true }); } catch (e) {}
  }

  /* ------------------------------------------------------------------ reloj (la QA puede adelantarlo) */
  var desfase = 0;
  PC.ahora = function () { return Date.now() + desfase; };

  /* ------------------------------------------------------------------ datos */
  (function leer() {
    var n = DOC.getElementById('datos');
    var d = {};
    if (n) { try { d = JSON.parse(n.textContent || '{}'); } catch (e) { err('datos', e); } }
    d.plan = d.plan || {}; d.historial = d.historial || {}; d.web = d.web || {};
    d.derivados = d.derivados || {}; d.fuente = d.fuente || {};
    PC.D = d;
  })();

  /* ------------------------------------------------------------------ utilidades de nodos */
  PC.esc = function (t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  PC.el = function (tag, attrs, html) {
    var e = DOC.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (typeof v === 'function' && /^on/.test(k)) { e.addEventListener(k.slice(2), v); return; }
      e.setAttribute(k === 'className' ? 'class' : k, v === true ? '' : v);
    });
    if (html !== undefined && html !== null) {
      if (typeof html === 'string') e.innerHTML = html;
      else if (Array.isArray(html)) html.forEach(function (h) { if (h) e.appendChild(typeof h === 'string' ? DOC.createTextNode(h) : h); });
      else e.appendChild(html);
    }
    return e;
  };
  var SVGNS = 'http://www.w3.org/2000/svg';
  PC.svg = function (tag, attrs, parent) {
    var e = DOC.createElementNS(SVGNS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') { e.textContent = v; return; }
      if (k === 'href') { e.setAttribute('href', v); return; }
      e.setAttribute(k, v === true ? '' : v);
    });
    if (parent) parent.appendChild(e);
    return e;
  };
  PC.icon = function (nombre, cls) {
    return '<svg class="icon' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + nombre + '"/></svg>';
  };
  PC.$ = function (sel, root) { return (root || DOC).querySelector(sel); };
  PC.$$ = function (sel, root) { return Array.prototype.slice.call((root || DOC).querySelectorAll(sel)); };
  PC.reduceMotion = function () { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

  /* ------------------------------------------------------------------ almacenamiento (prefijo pc-, JSON, nunca falla) */
  function hacerStore(tipo) {
    var mem = {};
    var S = null;
    try { S = W[tipo]; var p = '__pc_prueba'; S.setItem(p, '1'); S.removeItem(p); } catch (e) { S = null; }
    function k(c) { return /^pc-/.test(c) ? c : 'pc-' + c; }
    return {
      get: function (c, def) {
        var v = null;
        try { v = S ? S.getItem(k(c)) : (k(c) in mem ? mem[k(c)] : null); } catch (e) { v = null; }
        if (v === null || v === undefined) return def === undefined ? null : def;
        try { return JSON.parse(v); } catch (e) { return v; }
      },
      set: function (c, v) {
        var s; try { s = JSON.stringify(v); } catch (e) { return false; }
        try { if (S) S.setItem(k(c), s); else mem[k(c)] = s; return true; } catch (e) { mem[k(c)] = s; return false; }
      },
      del: function (c) { try { if (S) S.removeItem(k(c)); } catch (e) {} delete mem[k(c)]; },
      claves: function (prefijo) {
        var out = [], p = k(prefijo || '');
        try {
          if (S) { for (var i = 0; i < S.length; i++) { var x = S.key(i); if (x && x.indexOf(p) === 0) out.push(x); } }
          else Object.keys(mem).forEach(function (x) { if (x.indexOf(p) === 0) out.push(x); });
        } catch (e) {}
        return out.sort();
      },
      disponible: !!S
    };
  }
  PC.store = hacerStore('localStorage');
  PC.sstore = hacerStore('sessionStorage');

  /* ------------------------------------------------------------------ fechas */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  PC.fecha = function (iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  };
  PC.iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var hoyFijo = /^\d{4}-\d{2}-\d{2}$/.test(Q.hoy || '') && PC.fecha(Q.hoy) ? Q.hoy : null;
  PC.hoy = function () {
    if (hoyFijo) return PC.fecha(hoyFijo);
    var d = new Date(PC.ahora()); d.setHours(0, 0, 0, 0); return d;
  };
  PC.hoyIso = function () { return PC.iso(PC.hoy()); };
  PC.ahoraMin = function () {
    var m = /^(\d{1,2}):(\d{2})$/.exec(Q.hora || '');
    if (m) return (+m[1]) * 60 + (+m[2]);
    var d = new Date(PC.ahora()); return d.getHours() * 60 + d.getMinutes();
  };
  PC.dias = function (a, b) {
    var A = PC.fecha(a), B = PC.fecha(b);
    if (!A || !B) return null;
    return Math.round((Date.UTC(B.getFullYear(), B.getMonth(), B.getDate()) - Date.UTC(A.getFullYear(), A.getMonth(), A.getDate())) / 864e5);
  };
  PC.sumarDias = function (iso, n) { var d = PC.fecha(iso); d.setDate(d.getDate() + n); return PC.iso(d); };
  PC.lunes = function (iso) { var d = PC.fecha(iso); var w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return PC.iso(d); };

  /* ------------------------------------------------------------------ formatos */
  var DOW_L = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var DOW_C = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  var MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function coma(txt) { return String(txt).replace('.', ','); }
  PC.fmt = {
    dia: function (iso, modo) {
      var d = PC.fecha(iso); if (!d) return '';
      if (modo === 'larga') return DOW_L[d.getDay()] + ' ' + d.getDate() + ' de ' + MES[d.getMonth()];
      if (modo === 'dow') { var c = DOW_C[d.getDay()]; return c.charAt(0).toUpperCase() + c.slice(1); }
      if (modo === 'dm') return d.getDate() + '-' + (d.getMonth() + 1);
      return DOW_C[d.getDay()] + ' ' + d.getDate() + '-' + (d.getMonth() + 1);
    },
    /* 214 → '3:34' · (86.9, 1) → '1:26,9' · (43.5, 1) → '0:43,5' */
    t: function (seg, dec) {
      if (seg === null || seg === undefined || isNaN(seg)) return '';
      dec = dec || 0;
      var neg = seg < 0; seg = Math.abs(seg);
      var f = Math.pow(10, dec);
      var tot = Math.round(seg * f) / f;
      var m = Math.floor(tot / 60 + 1e-9);
      var s = tot - m * 60;
      var sTxt = dec ? s.toFixed(dec) : String(Math.round(s));
      if (parseFloat(sTxt) >= 60) { m += 1; s = 0; sTxt = dec ? (0).toFixed(dec) : '0'; }
      var ent = sTxt.split('.')[0], fr = sTxt.split('.')[1];
      return (neg ? '−' : '') + m + ':' + pad(+ent) + (fr ? ',' + fr : '');
    },
    s: function (seg, dec) {
      if (seg === null || seg === undefined || isNaN(seg)) return '';
      return coma(Number(seg).toFixed(dec === undefined ? 1 : dec)) + ' s';
    },
    num: function (v, dec) {
      if (v === null || v === undefined || isNaN(v)) return '';
      var t = dec === undefined ? String(v) : Number(v).toFixed(dec);
      return t.replace('-', '−').replace('.', ',');
    },
    /* Formatos: 87,5 · 87.5 · 1:27 · 1:27,5 · 1.27.5 · 1,27,5 · 127,5 · 0:43,5 · 3:34 · 334 · 9,4 */
    parseT: function (txt) {
      if (txt === null || txt === undefined) return null;
      var s = String(txt).trim().replace(/\s+/g, '').replace(/[’'´″"]/g, '');
      if (!s) return null;
      if (!/^[0-9:.,]+$/.test(s)) return null;
      var r = null, m;
      if (s.indexOf(':') >= 0) {
        m = /^(\d{1,2}):(\d{1,2})(?:[.,](\d+))?$/.exec(s);
        if (!m) return null;
        if (+m[2] >= 60) return null;
        r = (+m[1]) * 60 + (+m[2]) + (m[3] ? +('0.' + m[3]) : 0);
      } else {
        var seps = s.match(/[.,]/g) || [];
        if (seps.length === 2) {
          m = /^(\d{1,2})[.,](\d{1,2})[.,](\d+)$/.exec(s);
          if (!m || +m[2] >= 60) return null;
          r = (+m[1]) * 60 + (+m[2]) + +('0.' + m[3]);
        } else if (seps.length === 1) {
          m = /^(\d+)[.,](\d+)$/.exec(s);
          if (!m) return null;
          if (m[1].length >= 3) {
            var mm = m[1].slice(0, -2), ss = m[1].slice(-2);
            if (+ss >= 60) return null;
            r = (+mm) * 60 + (+ss) + +('0.' + m[2]);
          } else r = +(m[1] + '.' + m[2]);
        } else if (seps.length === 0) {
          if (s.length >= 3) {
            var m2 = s.slice(0, -2), s2 = s.slice(-2);
            if (+s2 >= 60) return null;
            r = (+m2) * 60 + (+s2);
          } else r = +s;
        } else return null;
      }
      if (r === null || isNaN(r)) return null;
      return Math.round(r * 1000) / 1000;
    },
    sueno: function (min) {
      if (min === null || min === undefined || isNaN(min)) return '';
      min = Math.round(min);
      return Math.floor(min / 60) + 'h' + pad(min % 60);
    },
    parseSueno: function (txt) {
      var m = /(\d{1,2})\s*h\s*(\d{1,2})/.exec(String(txt || ''));
      return m ? (+m[1]) * 60 + (+m[2]) : null;
    }
  };

  /* ------------------------------------------------------------------ baremo (BOE-A-2026-15055) */
  (function () {
    var cache = {};
    function segTxt(t) { if (t === null || t === undefined) return null; var m = /^(\d+):(\d{2})(?:[.,](\d+))?$/.exec(String(t).trim()); return m ? (+m[1]) * 60 + (+m[2]) + (m[3] ? +('0.' + m[3]) : 0) : null; }
    function numTxt(t) { return +String(t).replace(',', '.'); }
    function rango(txt) {
      txt = String(txt).trim();
      var m;
      if ((m = /^([\d,.]+)\s*o\s*menos$/.exec(txt))) return { min: 0, max: numTxt(m[1]) };
      if ((m = /^([\d,.]+)\s*o\s*más$/.exec(txt))) return { min: numTxt(m[1]), max: null };
      if ((m = /^([\d,.]+)\s*[-–]\s*([\d,.]+)$/.exec(txt))) return { min: numTxt(m[1]), max: numTxt(m[2]) };
      if ((m = /^([\d,.]+)$/.exec(txt))) return { min: numTxt(m[1]), max: numTxt(m[1]) };
      return null;
    }
    function tramos(prueba) {
      if (cache[prueba]) return cache[prueba];
      var B = PC.D.plan.baremo || {};
      var out = [];
      if (prueba === 'mil') (B.mil_metros || []).forEach(function (t) { out.push({ pts: t.puntos, min: segTxt(t.desde) || 0, max: t.hasta ? segTxt(t.hasta) : null, elimina: !!t.elimina }); });
      else if (prueba === 'cir') (B.circuito_agilidad || []).forEach(function (t) { var r = rango(t.seg); if (r) out.push({ pts: t.puntos, min: r.min, max: r.max, elimina: !!t.elimina }); });
      else if (prueba === 'dom') (B.dominadas || []).forEach(function (t) { var r = rango(t.reps); if (r) out.push({ pts: t.puntos, min: r.min, max: r.max, elimina: !!t.elimina }); });
      out.sort(function (a, b) { return b.pts - a.pts; });
      cache[prueba] = out;
      return out;
    }
    function pts(prueba, v) {
      if (v === null || v === undefined || v === '' || isNaN(v)) return null;
      v = +v;
      var T = tramos(prueba);
      if (!T.length) return null;
      if (prueba === 'dom') {
        v = Math.floor(v + 1e-9);
        for (var i = 0; i < T.length; i++) if (v >= T[i].min && (T[i].max === null || v <= T[i].max)) return T[i].pts;
        return 0;
      }
      /* tiempos: primer tramo cuyo límite superior ≥ valor, sin redondear (3:30,4 da 3) */
      for (var j = 0; j < T.length; j++) if (T[j].max !== null && v <= T[j].max + 1e-9) return T[j].pts;
      return 0;
    }
    function tramoDe(prueba, p) { var T = tramos(prueba); for (var i = 0; i < T.length; i++) if (T[i].pts === p) return T[i]; return null; }
    function peorMarca(prueba, p) {
      var t = tramoDe(prueba, p); if (!t) return null;
      return prueba === 'dom' ? t.min : t.max;
    }
    PC.baremo = {
      tramos: tramos,
      pts: pts,
      /* {pts, objetivo, diferencia}: objetivo = peor marca que ya da un punto más */
      siguiente: function (prueba, v) {
        var p = pts(prueba, v); if (p === null || p >= 10) return null;
        var obj = peorMarca(prueba, p + 1); if (obj === null) return null;
        return { pts: p + 1, objetivo: obj, diferencia: Math.round((obj - v) * 1000) / 1000 };
      },
      /* marca de corte viva (G10): peor marca que da esos puntos; null si pasan de 10 */
      corte: function (prueba, ptsNecesarios) {
        if (ptsNecesarios === null || ptsNecesarios === undefined || isNaN(ptsNecesarios)) return null;
        if (ptsNecesarios > 10) return null;
        return peorMarca(prueba, Math.max(1, Math.ceil(ptsNecesarios)));
      },
      resultado: function (lista) {
        var ps = (lista || []).map(function (x) { return +x; });
        var suma = ps.reduce(function (a, b) { return a + b; }, 0);
        var media = Math.round(suma / 3 * 100) / 100;
        var txt = ps.some(function (x) { return x === 0; }) ? 'ELIMINADO' : (suma >= 15 ? 'APTO' : 'NO APTO');
        return { media: media, suma: suma, txt: txt };
      },
      /* {mil:s, dom:reps, cir:s} → {pts:{mil,dom,cir}, media, txt} */
      nota: function (m) {
        var p = { mil: pts('mil', m.mil), dom: pts('dom', m.dom), cir: pts('cir', m.cir) };
        var r = PC.baremo.resultado([p.mil, p.dom, p.cir]);
        return { pts: p, media: r.media, suma: r.suma, txt: r.txt };
      },
      ELIMINA_MIL: 229
    };
  })();

  /* ------------------------------------------------------------------ web.json y pendientes */
  (function () {
    function activo(x, hoy) { return (!x.desde || x.desde <= hoy) && (!x.hasta || x.hasta >= hoy); }
    var resSet = null;
    function resueltos() {
      if (resSet) return resSet;
      resSet = {};
      (PC.D.web.resueltos || []).forEach(function (id) { resSet[id] = true; });
      var r = PC.D.plan.resueltos29sep;
      if (typeof r === 'string') (r.match(/\bK\d{1,2}\b/g) || []).forEach(function (id) { resSet[id] = true; });
      return resSet;
    }
    PC.web = {
      avisos: function (donde) {
        var hoy = PC.hoyIso();
        return (PC.D.web.avisos || []).filter(function (a) {
          var d = a.donde; var ok = !donde || d === donde || (Array.isArray(d) && d.indexOf(donde) >= 0);
          return ok && activo(a, hoy);
        });
      },
      /* fuente: plan.pendientes (desde el 29-9); si no existe, web.pendientes */
      pendientes: function () {
        var hoy = PC.hoyIso();
        var lista = Array.isArray(PC.D.plan.pendientes) ? PC.D.plan.pendientes : (PC.D.web.pendientes || []);
        var marcados = PC.store.get('pend', []) || [];
        return lista.filter(function (p) { return activo(p, hoy); }).map(function (p, i) {
          var o = {}; Object.keys(p).forEach(function (k) { o[k] = p[k]; });
          o.marcado = marcados.indexOf(p.id) >= 0; o._i = i; return o;
        }).sort(function (a, b) { return (a.marcado - b.marcado) || (a._i - b._i); });
      },
      resuelto: function (id) { return !!resueltos()[id]; },
      _reiniciar: function () { resSet = null; }
    };
  })();

  /* ------------------------------------------------------------------ calendario: días compuestos al vuelo */
  (function () {
    var idx = null;
    function indice() {
      if (idx) return idx;
      idx = {};
      (PC.D.derivados.dias || []).forEach(function (d) { if (d && d.fecha) idx[d.fecha] = d; });
      return idx;
    }
    var CAMPOS = ['sesion', 'objetivo', 'hora', 'lugar', 'regla', 'protocolo', 'decide', 'semaforo', 'medir', 'nota', 'porQue', 'registro', 'hecho'];
    function semanaDe(ref) {
      var cal = PC.D.plan.calendario || [];
      return ref && cal[ref[0]] ? cal[ref[0]] : null;
    }
    function crudo(dd) {
      var sem = semanaDe(dd.ref);
      if (sem && sem.dias && sem.dias[dd.ref[1]]) return sem.dias[dd.ref[1]];
      return dd.plan || dd;           /* muestra o datos sin ref: el propio derivado */
    }
    function claveVersion(clave) {
      var F = PC.cal.final(); if (!F || !F.versiones) return null;
      for (var i = 0; i < F.versiones.length; i++) if (F.versiones[i].clave === clave) return 'v' + (i + 1);
      return null;
    }
    function entradasFinal(iso) {
      var F = PC.cal.final(); var out = [];
      if (!F || !F.versiones) return out;
      F.versiones.forEach(function (v, i) {
        (v.dias || []).forEach(function (e) {
          if (e.fecha === iso) out.push({ clave: v.clave, nombre: v.nombre, v: 'v' + (i + 1), key: e.key || ('v' + (i + 1) + ':' + (e.dia || '')), entrada: e });
        });
      });
      return out;
    }
    /* entradas de una versión sin fecha fija («Prueba», «−2 días», «−1 día»): dependen del día exacto */
    function sinFecha() {
      var F = PC.cal.final(); var out = [];
      if (!F || !F.versiones) return out;
      F.versiones.forEach(function (v, i) {
        (v.dias || []).forEach(function (e) {
          if (!e.fecha) out.push({ clave: v.clave, nombre: v.nombre, v: 'v' + (i + 1), key: e.key || ('v' + (i + 1) + ':' + (e.dia || '')), entrada: e });
        });
      });
      return out;
    }
    function enSemanaFinal(iso) {
      var F = PC.cal.final(); if (!F || !F.semana) return false;
      var p = String(F.semana).split('/'); return iso >= p[0] && iso <= (p[1] || p[0]);
    }
    function conflictosDe(extra, dd) {
      var lista = [].concat((extra && extra.conflictos) || [], (dd && dd.conflictos) || []);
      var vistos = {};
      return lista.filter(function (c) {
        if (!c || !c.id || vistos[c.id]) return false; vistos[c.id] = true;
        return !PC.web.resuelto(c.id);
      });
    }
    function condicionDe(extra) {
      if (!extra || !extra.condicion) return null;
      var c = extra.condicion;
      if (c.compartida) {
        var sh = (PC.D.web.condiciones || {})[c.compartida] || {};
        var o = {}; Object.keys(sh).forEach(function (k) { o[k] = sh[k]; });
        Object.keys(c).forEach(function (k) { o[k] = c[k]; });
        return o;
      }
      return c;
    }
    function componer(iso, dd, base) {
      var sem = dd && dd.ref ? semanaDe(dd.ref) : null;
      var F = PC.cal.final();
      var WD = PC.D.web.dias || {};
      var d = {
        fecha: iso,
        dia: (base && base.dia) || PC.fmt.dia(iso, 'dow'),
        semana: (sem && sem.semana) || (dd && dd.semana) || null,
        semanaTitulo: (sem && sem.titulo) || (dd && dd.semanaTitulo) || null,
        semanaNota: (sem && sem.nota) || (dd && dd.semanaNota) || null,
        tipo: (base && base.tipo) || null,
        clave: !!(base && base.clave),
        titulo: (dd && dd.titulo) || null,
        hist: (dd && dd.hist) || [],
        bloque: (dd && dd.bloque) || PC.cal.bloque(iso),
        variantes: (dd && dd.variantes) || {},
        principal: (dd && dd.principal) || null,
        numeros: (dd && dd.numeros) || null,
        ref: (dd && dd.ref) || null,
        plan: base || null,
        der: dd || null
      };
      CAMPOS.forEach(function (k) { d[k] = base && base[k] !== undefined ? base[k] : null; });
      var extra = WD[iso] || null;
      var cond = (dd && dd.condicion) || null;
      var confl = [].concat((dd && dd.conflictos) || []);
      /* semana final: versión elegida (pc-prueba o ?prueba=) */
      var ents = entradasFinal(iso);
      var ver = PC.cal.version();
      if (ents.length || enSemanaFinal(iso)) {
        var elegida = null;
        ents.forEach(function (e) { if (e.clave === ver) elegida = e; });
        d.final = { version: ver, entradas: ents, elegida: elegida, sinFecha: sinFecha(), enSemanaFinal: enSemanaFinal(iso), ventana: PC.D.derivados.ventanaPrueba || null };
        if (!sem && F) { d.semana = F.semana || d.semana; d.semanaTitulo = F.titulo || d.semanaTitulo; d.semanaNota = F.nota || d.semanaNota; }
        if (elegida) {
          var en = elegida.entrada;
          d.tipo = en.tipo || d.tipo;
          d.sesion = en.sesion || d.sesion;
          if (en.clave) d.clave = true;
          if (en.titulo) d.titulo = en.titulo;
          if (en.principal !== undefined) d.principal = en.principal;
          if (en.variantes) d.variantes = en.variantes;
          if (en.numeros) d.numeros = en.numeros;
          cond = en.condicion || null;
          if (en.conflictos) confl = confl.concat(en.conflictos);
          extra = WD[elegida.key] || null;
          d.version = { clave: elegida.clave, nombre: elegida.nombre, dia: en.dia, key: elegida.key };
        }
      } else d.final = null;
      d.extra = extra;
      if (extra && extra.titulo) d.titulo = extra.titulo;
      if (extra && extra.variantes) d.variantes = extra.variantes;
      if (extra && extra.principal) d.principal = extra.principal;
      if (extra && extra.numeros) d.numeros = extra.numeros;
      d.condicion = cond || condicionDe(extra) || null;
      d.conflictos = conflictosDe({ conflictos: confl.concat((extra && extra.conflictos) || []) }, null);
      d.hechoAntiguo = (dd && dd.hechoAntiguo) || ((PC.D.web.hechosAntiguos || {})[iso]) || null;
      d.estado = PC.cal.estado(d);
      return d;
    }
    function horaTxt(h) { var m = /^(\d{1,2}):(\d{2})/.exec(h); return m ? (+m[1]) * 60 + (+m[2]) : null; }
    PC.cal = {
      dia: function (iso) {
        if (!iso) return null;
        var dd = indice()[iso] || null;
        if (dd) return componer(iso, dd, crudo(dd));
        if (entradasFinal(iso).length || enSemanaFinal(iso)) return componer(iso, null, null);
        return null;
      },
      semana: function (iso) {
        var l = PC.lunes(iso), out = [];
        for (var i = 0; i < 7; i++) out.push(PC.cal.dia(PC.sumarDias(l, i)));
        return out;
      },
      /* estado en tiempo de ejecución (hoy es el del dispositivo) */
      estado: function (dia) {
        if (!dia) return null;
        var hoy = PC.hoyIso();
        if (dia.fecha === hoy) return 'hoy';
        if (dia.tipo === 'descanso') return 'rest';
        if (dia.fecha > hoy) return 'futuro';
        var h = dia.hist || [];
        if (h.some(function (x) { return x.hecho === false; })) return 'miss';
        if (h.some(function (x) { return x.valida === false; })) return 'nomide';
        if (h.length) return 'hecho';
        if (dia.tipo === 'examen' || !dia.tipo) return 'rest';
        return 'noreg';
      },
      bloque: function (iso) {
        var B = PC.D.derivados.bloques || [];
        for (var i = 0; i < B.length; i++) if (B[i].desde <= iso && iso <= B[i].hasta) return B[i].clave;
        return null;
      },
      bloqueInfo: function (clave) {
        var B = PC.D.derivados.bloques || [];
        for (var i = 0; i < B.length; i++) if (B[i].clave === clave) return B[i];
        return null;
      },
      hitos: function () { return (PC.D.derivados.hitos || []).slice(); },
      proximo: function (iso) {
        iso = iso || PC.hoyIso();
        var H = PC.cal.hitos().filter(function (h) { return (h.hasta || h.fecha) >= iso; });
        H.sort(function (a, b) { return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0; });
        return H[0] || null;
      },
      version: function () {
        var q = Q.prueba;
        if (q === '26-27' || q === '28-30') return q;
        var v = PC.store.get('prueba', null);
        return v === '26-27' || v === '28-30' ? v : null;
      },
      final: function () { return PC.D.derivados.final || null; },
      claveVersion: claveVersion,
      sinFecha: sinFecha,
      /* 'hora' ('18:00-19:30' → 1080/1170); si falta, la hora con la que EMPIEZA 'sesion';
         en circuito, sesionesTipo.juevesCircuito.hora. Nunca una hora en medio de 'sesion'. */
      horaIni: function (dia) {
        if (!dia) return null;
        var v = null;
        if (dia.hora) v = horaTxt(String(dia.hora).trim());
        if (v === null && dia.sesion) v = horaTxt(String(dia.sesion).trim());
        if (v === null && dia.tipo === 'circuito') {
          var jc = ((PC.D.plan.sesionesTipo || {}).juevesCircuito || {}).hora;
          if (jc) v = horaTxt(String(jc).trim());
        }
        return v;
      },
      horaFin: function (dia) {
        var ini = PC.cal.horaIni(dia);
        if (ini === null) return null;
        if (dia.hora) {
          var m = /^\d{1,2}:\d{2}\s*[-–]\s*(\d{1,2}):(\d{2})/.exec(String(dia.hora).trim());
          if (m) return (+m[1]) * 60 + (+m[2]);
        }
        return ini + 60;
      },
      _reiniciar: function () { idx = null; }
    };
  })();

  /* ------------------------------------------------------------------ nota actual (chip) */
  PC.notaActual = function () {
    var M = PC.D.derivados.marcas;
    if (!M) return null;
    var p = [M.cir && M.cir.pts, M.dom && M.dom.pts, M.mil && M.mil.pts];
    var r = PC.baremo.resultado(p);
    var media = typeof M.media === 'number' ? M.media : r.media;
    var res = M.resultado || r.txt;
    var o = { media: media, resultado: res, pts: { cir: p[0], dom: p[1], mil: p[2] } };
    if (res === 'ELIMINADO') {
      var cual = p[1] === 0 ? 'dominadas' : p[2] === 0 ? '1.000 m' : 'circuito';
      o.txt = 'eliminado · ' + cual; o.cls = 'bad';
    } else if (res === 'APTO') { o.txt = PC.fmt.num(media, 2) + ' · apto'; o.cls = 'ok'; }
    else { o.txt = PC.fmt.num(media, 2) + ' · no apto'; o.cls = 'warn'; }
    return o;
  };

  /* ------------------------------------------------------------------ notificación, copiar, vibrar, destello */
  var toastT = null;
  PC.toast = function (txt, ms) {
    var t = DOC.getElementById('toast'); if (!t) return;
    t.textContent = txt; t.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.hidden = true; }, ms || 1800);
  };
  PC.copiar = function (texto) {
    function viejo() {
      try {
        var ta = DOC.createElement('textarea');
        ta.value = texto; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '-1000px'; ta.style.opacity = '0';
        DOC.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, texto.length);
        var ok = DOC.execCommand && DOC.execCommand('copy');
        DOC.body.removeChild(ta); return !!ok;
      } catch (e) { return false; }
    }
    return new Promise(function (res) {
      function fin(ok) { PC.toast(ok ? 'Copiado' : 'No se pudo copiar: selecciónalo a mano'); res(!!ok); }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText && W.isSecureContext) {
          navigator.clipboard.writeText(texto).then(function () { fin(true); }, function () { fin(viejo()); });
        } else fin(viejo());
      } catch (e) { fin(viejo()); }
    });
  };
  PC.puedeVibrar = function () { return typeof navigator.vibrate === 'function'; };
  PC.vibrar = function (patron) { if (!PC.puedeVibrar()) return false; try { return navigator.vibrate(patron); } catch (e) { return false; } };
  var destT = null;
  PC.destello = function () {
    var d = DOC.querySelector('.destello'); if (!d) return;
    d.hidden = true; void d.offsetWidth; d.hidden = false;
    clearTimeout(destT); destT = setTimeout(function () { d.hidden = true; }, 1400);
  };

  /* ------------------------------------------------------------------ audio (pitidos de 880 Hz) */
  (function () {
    var ctx = null, n = 0;
    function contexto() {
      if (ctx) return ctx;
      var AC = W.AudioContext || W.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { ctx = null; }
      return ctx;
    }
    PC.audio = {
      desbloquear: function () {
        try {
          var c = contexto(); if (!c) return false;
          if (c.state === 'suspended' && c.resume) { var p = c.resume(); if (p && p.catch) p.catch(noop); }
          var b = c.createBuffer(1, 1, 22050), s = c.createBufferSource();
          s.buffer = b; s.connect(c.destination); s.start(0);
          return true;
        } catch (e) { return false; }
      },
      pitido: function (veces) {
        n++;
        veces = veces || 1;
        if (!PC.audio.activo()) return false;
        try {
          var c = contexto(); if (!c) return false;
          if (c.state === 'suspended' && c.resume) { var p = c.resume(); if (p && p.catch) p.catch(noop); }
          var t0 = c.currentTime + 0.02;
          for (var i = 0; i < veces; i++) {
            var o = c.createOscillator(), g = c.createGain(), t = t0 + i * 0.24;
            o.type = 'sine'; o.frequency.value = 880;
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
            g.gain.setValueAtTime(0.5, t + 0.11);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
            o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.13);
          }
          return true;
        } catch (e) { return false; }
      },
      activo: function () { return PC.store.get('sonido', true) !== false; },
      poner: function (v) { PC.store.set('sonido', !!v); },
      _llamadas: function () { return n; }
    };
  })();

  /* ------------------------------------------------------------------ pantalla encendida */
  (function () {
    var lock = null, quiere = false;
    PC.wake = {
      pedir: function () {
        quiere = true;
        try {
          if (!navigator.wakeLock || !navigator.wakeLock.request) return Promise.resolve(false);
          return navigator.wakeLock.request('screen').then(function (l) {
            lock = l; try { l.addEventListener('release', function () { lock = null; }); } catch (e) {}
            return true;
          }, function () { return false; });
        } catch (e) { return Promise.resolve(false); }
      },
      soltar: function () {
        quiere = false;
        try { if (lock) { var p = lock.release(); if (p && p.catch) p.catch(noop); } } catch (e) {}
        lock = null;
      },
      activo: function () { return !!lock; },
      _quiere: function () { return quiere; }
    };
    DOC.addEventListener('visibilitychange', function () {
      if (DOC.visibilityState === 'visible' && quiere && !lock) PC.wake.pedir();
    });
  })();

  /* ------------------------------------------------------------------ temporizadores por hora de fin */
  (function () {
    var vivos = {}, cuenta = 0;
    function guardarTodo() {
      var o = {};
      Object.keys(vivos).forEach(function (k) { var t = vivos[k]; if (t._estado) o[k] = t._estado(); });
      PC.sstore.set('timer', o);
    }
    PC.timer = {
      crear: function (op) {
        op = op || {};
        var id = op.clave || ('t' + (++cuenta));
        var total = Math.max(0, +op.seg || 0) * 1000;
        var avisoSeg = op.avisoSeg === undefined ? 10 : op.avisoSeg;
        var fin = null, resto = total, avisado = false, acabado = false, finReal = null, iv = null;
        var api = {};
        function restante() {
          if (acabado) return 0;
          if (fin === null) return resto / 1000;
          return Math.max(0, (fin - PC.ahora()) / 1000);
        }
        function parar_iv() { if (iv) { clearInterval(iv); iv = null; } }
        function arrancar_iv() { parar_iv(); iv = setInterval(tick, 250); }
        function tick() {
          if (fin === null || acabado) return;
          var r = restante();
          if (!avisado && avisoSeg > 0 && r <= avisoSeg && r > 0) {
            avisado = true;
            PC.audio.pitido(1); PC.vibrar([100]);
            try { op.alAviso && op.alAviso(api); } catch (e) { err('timer.alAviso', e); }
          }
          if (r <= 0) { cero(); return; }
          try { op.alTick && op.alTick(r, api); } catch (e) { err('timer.alTick', e); }
        }
        function cero() {
          acabado = true; finReal = fin; fin = null; parar_iv();
          PC.audio.pitido(3); PC.destello(); PC.vibrar([300, 150, 300]);
          guardarTodo();
          var tarde = Math.max(0, (PC.ahora() - finReal) / 1000);
          try { op.alTick && op.alTick(0, api); } catch (e) { err('timer.alTick', e); }
          try { op.alCero && op.alCero(api, tarde); } catch (e) { err('timer.alCero', e); }
        }
        api.empezar = function () {
          if (acabado) { acabado = false; resto = total; avisado = false; finReal = null; }
          if (fin === null) fin = PC.ahora() + resto;
          arrancar_iv(); guardarTodo(); tick();
          return api;
        };
        api.pausa = function () {
          if (fin !== null) { resto = Math.max(0, fin - PC.ahora()); fin = null; parar_iv(); guardarTodo(); }
          return api;
        };
        api.sumar = function (s) {
          var ms = (+s || 0) * 1000;
          if (acabado) { acabado = false; resto = ms; fin = PC.ahora() + ms; avisado = false; arrancar_iv(); }
          else if (fin !== null) fin += ms; else resto += ms;
          if (restante() > avisoSeg) avisado = false;
          guardarTodo(); tick();
          return api;
        };
        api.saltar = function () {
          if (acabado) return api;
          acabado = true; finReal = PC.ahora(); fin = null; parar_iv(); guardarTodo();
          try { op.alSaltar ? op.alSaltar(api) : (op.alTick && op.alTick(0, api)); } catch (e) { err('timer.alSaltar', e); }
          return api;
        };
        api.parar = function () {
          parar_iv(); fin = null; resto = total; avisado = false; acabado = false; finReal = null;
          delete vivos[id]; guardarTodo();
          return api;
        };
        api.restante = restante;
        api.activo = function () { return fin !== null && !acabado; };
        api.acabado = function () { return acabado; };
        api.terminoHace = function () { return acabado && finReal !== null ? Math.max(0, (PC.ahora() - finReal) / 1000) : null; };
        api.total = function () { return total / 1000; };
        api.clave = id;
        api._revisar = function () { if (fin !== null && !acabado) tick(); };
        api._estado = function () { return { fin: fin, resto: resto, total: total, acabado: acabado, finReal: finReal }; };
        /* recuperación tras recargar (misma clave, en sessionStorage) */
        if (op.clave) {
          var g = (PC.sstore.get('timer', {}) || {})[op.clave];
          if (g && g.total === total) {
            if (g.fin !== null && g.fin !== undefined) { fin = g.fin; avisado = (fin - PC.ahora()) / 1000 <= avisoSeg; arrancar_iv(); setTimeout(tick, 0); }
            else if (g.acabado) { acabado = true; finReal = g.finReal; }
            else if (g.resto !== undefined) resto = g.resto;
          }
        }
        if (vivos[id] && vivos[id] !== api) { try { vivos[id]._soltar && vivos[id]._soltar(); } catch (e) {} }
        api._soltar = parar_iv;
        vivos[id] = api;
        return api;
      },
      /* al volver de segundo plano se recalcula todo */
      revisar: function () { Object.keys(vivos).forEach(function (k) { try { vivos[k]._revisar(); } catch (e) { err('timer.revisar', e); } }); },
      vivos: function () { return Object.keys(vivos); }
    };
    DOC.addEventListener('visibilitychange', function () { if (DOC.visibilityState === 'visible') PC.timer.revisar(); });
    W.addEventListener('pageshow', function () { PC.timer.revisar(); });
  })();

  /* ------------------------------------------------------------------ foco atrapado (hoja y modo pista) */
  function focables(root) {
    return PC.$$('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])', root)
      .filter(function (e) { return e.offsetParent !== null || e === DOC.activeElement; });
  }
  function atrapar(root, e) {
    if (e.key !== 'Tab') return;
    var f = focables(root); if (!f.length) { e.preventDefault(); root.focus(); return; }
    var a = f[0], z = f[f.length - 1];
    if (e.shiftKey && (DOC.activeElement === a || DOC.activeElement === root)) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && DOC.activeElement === z) { e.preventDefault(); a.focus(); }
  }

  /* ------------------------------------------------------------------ hoja */
  (function () {
    var previo = null, alCerrar = null;
    function nodos() { return { bg: DOC.querySelector('.sheet-bg'), sh: DOC.querySelector('.sheet') }; }
    PC.sheet = {
      abrir: function (titulo, contenido, op) {
        var n = nodos(); if (!n.sh) return null;
        op = op || {};
        if (!n.sh.hidden) PC.sheet.cerrar(true);
        previo = DOC.activeElement; alCerrar = op.alCerrar || null;
        n.sh.querySelector('#sh-t').textContent = titulo || '';
        var box = n.sh.querySelector('.sh-in'); box.innerHTML = '';
        if (typeof contenido === 'string') box.innerHTML = contenido; else if (contenido) box.appendChild(contenido);
        n.bg.hidden = false; n.sh.hidden = false; n.sh.scrollTop = 0;
        DOC.documentElement.classList.add('bloqueo');
        setTimeout(function () { var f = focables(box)[0]; (f || n.sh).focus({ preventScroll: true }); }, 30);
        return box;
      },
      cerrar: function (silencio) {
        var n = nodos(); if (!n.sh || n.sh.hidden) return;
        n.sh.hidden = true; n.bg.hidden = true;
        if (DOC.getElementById('focus').hidden) DOC.documentElement.classList.remove('bloqueo');
        var f = alCerrar; alCerrar = null;
        if (!silencio && f) { try { f(); } catch (e) { err('sheet.alCerrar', e); } }
        if (previo && previo.focus) { try { previo.focus({ preventScroll: true }); } catch (e) {} }
        previo = null;
      },
      abierta: function () { var n = nodos(); return !!(n.sh && !n.sh.hidden); }
    };
  })();

  /* ------------------------------------------------------------------ modo pista y gimnasio */
  (function () {
    var previo = null, alCerrar = null;
    function f() { return DOC.getElementById('focus'); }
    function pintarBotones() {
      var F = f(); if (!F) return;
      var bs = F.querySelector('[data-act="sonido"]'), bc = F.querySelector('[data-act="sol"]');
      if (bs) bs.setAttribute('aria-pressed', PC.audio.activo() ? 'true' : 'false');
      var sol = !!PC.store.get('sol', false);
      F.classList.toggle('sol', sol);
      if (bc) bc.setAttribute('aria-pressed', sol ? 'true' : 'false');
    }
    PC.focus = {
      abrir: function (op) {
        op = op || {};
        var F = f(); if (!F) return null;
        if (PC.sheet.abierta()) PC.sheet.cerrar(true);
        previo = DOC.activeElement; alCerrar = op.alCerrar || null;
        F.querySelector('.focus-t').textContent = op.titulo || '';
        F.setAttribute('aria-label', op.etiqueta || (op.gimnasio ? 'Modo gimnasio' : 'Modo pista'));
        var b = F.querySelector('.focus-b'); b.innerHTML = '';
        if (typeof op.nodo === 'string') b.innerHTML = op.nodo; else if (op.nodo) b.appendChild(op.nodo);
        F.querySelector('[data-f="vibrar"]').hidden = PC.puedeVibrar();
        F.querySelector('[data-f="wake"]').hidden = true;
        pintarBotones();
        F.hidden = false; F.scrollTop = 0;
        DOC.documentElement.classList.add('bloqueo');
        PC.wake.pedir().then(function (ok) { if (!ok && !F.hidden) F.querySelector('[data-f="wake"]').hidden = false; });
        setTimeout(function () { var x = focables(b)[0]; (x || F).focus({ preventScroll: true }); }, 30);
        return b;
      },
      cerrar: function () {
        var F = f(); if (!F || F.hidden) return;
        F.hidden = true; PC.wake.soltar();
        if (!PC.sheet.abierta()) DOC.documentElement.classList.remove('bloqueo');
        var cb = alCerrar; alCerrar = null;
        if (cb) { try { cb(); } catch (e) { err('focus.alCerrar', e); } }
        if (previo && previo.focus) { try { previo.focus({ preventScroll: true }); } catch (e) {} }
        previo = null;
      },
      abierto: function () { var F = f(); return !!(F && !F.hidden); },
      cuerpo: function () { var F = f(); return F ? F.querySelector('.focus-b') : null; }
    };
    var enlazado = false;
    function enlazar() {
      var F = f(); if (!F || enlazado) return;
      enlazado = true;
      F.addEventListener('pointerdown', function () { PC.audio.desbloquear(); }, { passive: true });
      F.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('[data-act]'); if (!a || !F.contains(a)) return;
        var act = a.getAttribute('data-act');
        if (act === 'cerrar') PC.focus.cerrar();
        else if (act === 'sonido') { PC.audio.poner(!PC.audio.activo()); pintarBotones(); if (PC.audio.activo()) PC.audio.desbloquear(); }
        else if (act === 'sol') { PC.store.set('sol', !PC.store.get('sol', false)); pintarBotones(); }
      });
      F.addEventListener('keydown', function (e) { if (e.key === 'Escape') PC.focus.cerrar(); else atrapar(F, e); });
      var sh = DOC.querySelector('.sheet'), bg = DOC.querySelector('.sheet-bg');
      if (sh) {
        sh.querySelector('.sh-x').addEventListener('click', function () { PC.sheet.cerrar(); });
        sh.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); PC.sheet.cerrar(); } else atrapar(sh, e); });
      }
      if (bg) bg.addEventListener('click', function () { PC.sheet.cerrar(); });
    }
    /* los scripts van al final del body: los nodos ya existen */
    if (f()) enlazar(); else DOC.addEventListener('DOMContentLoaded', enlazar);
  })();

  /* ------------------------------------------------------------------ redimensionado */
  PC.alRedimensionar = function (el, fn) {
    if (!el || !fn) return noop;
    var t = null, ultimo = el.clientWidth;
    function lanzar() {
      clearTimeout(t);
      t = setTimeout(function () {
        var w = el.clientWidth;
        if (w === ultimo || w === 0) return;
        ultimo = w;
        try { fn(w); } catch (e) { err('alRedimensionar', e); }
      }, 120);
    }
    if (W.ResizeObserver) { var ro = new ResizeObserver(lanzar); ro.observe(el); return function () { ro.disconnect(); }; }
    W.addEventListener('resize', lanzar);
    return function () { W.removeEventListener('resize', lanzar); };
  };

  /* ------------------------------------------------------------------ gráficas (§6.1) */
  (function () {
    var cont = 0;
    function lineal(d0, d1, r0, r1) {
      var k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
      var f = function (v) { return r0 + (v - d0) * k; };
      f.inv = function (p) { return k === 0 ? d0 : d0 + (p - r0) / k; };
      f.d = [d0, d1]; f.r = [r0, r1];
      return f;
    }
    PC.chart = {
      base: function (figure, op) {
        op = op || {};
        var host = figure.querySelector('.chart-c');
        if (!host) { host = PC.el('div', { 'class': 'chart-c' }); var cap = figure.querySelector('figcaption'); if (cap && cap.nextSibling) figure.insertBefore(host, cap.nextSibling); else figure.appendChild(host); }
        host.innerHTML = '';
        var m = { t: 12, r: 12, b: 28, l: 40 };
        if (op.m) Object.keys(op.m).forEach(function (k) { m[k] = op.m[k]; });
        var w = Math.floor(host.clientWidth || figure.clientWidth || 320);
        var h = op.h || 200;
        var svg = PC.svg('svg', { width: w, height: h, viewBox: '0 0 ' + w + ' ' + h, role: 'img', 'aria-label': op.label || '' }, host);
        var g = PC.svg('g', { transform: 'translate(' + m.l + ',' + m.t + ')' }, svg);
        return { svg: svg, w: w, h: h, iw: Math.max(10, w - m.l - m.r), ih: Math.max(10, h - m.t - m.b), g: g, m: m, figure: figure, host: host, id: 'g' + (++cont) };
      },
      lineal: lineal,
      tiempo: function (iso0, iso1, r0, r1) {
        var n = PC.dias(iso0, iso1);
        var f0 = lineal(0, n, r0, r1);
        var f = function (iso) { return f0(PC.dias(iso0, iso)); };
        f.inv = function (p) { return PC.sumarDias(iso0, Math.round(f0.inv(p))); };
        f.d = [iso0, iso1]; f.r = [r0, r1];
        return f;
      },
      ejeY: function (ctx, f, valores, fmt) {
        fmt = fmt || function (v) { return PC.fmt.num(v); };
        var g = PC.svg('g', { 'class': 'eje-y' }, ctx.g);
        (valores || []).forEach(function (v) {
          var y = Math.round(f(v)) + 0.5;
          PC.svg('line', { 'class': 'gl', x1: 0, x2: ctx.iw, y1: y, y2: y }, g);
          PC.svg('text', { x: -6, y: y, 'text-anchor': 'end', 'dominant-baseline': 'middle', text: fmt(v) }, g);
        });
        return g;
      },
      ejeFechas: function (ctx, f, iso0, iso1) {
        var g = PC.svg('g', { 'class': 'eje-x' }, ctx.g);
        PC.svg('line', { 'class': 'eje', x1: 0, x2: ctx.iw, y1: ctx.ih + 0.5, y2: ctx.ih + 0.5 }, g);
        var d = PC.lunes(iso0); if (d < iso0) d = PC.sumarDias(d, 7);
        var ultimoX = -1e9;
        while (d <= iso1) {
          var x = f(d);
          if (x - ultimoX >= 40) {
            PC.svg('line', { 'class': 'eje', x1: x, x2: x, y1: ctx.ih, y2: ctx.ih + 4 }, g);
            PC.svg('text', { x: x, y: ctx.ih + 18, 'text-anchor': 'middle', text: PC.fmt.dia(d, 'dm') }, g);
            ultimoX = x;
          }
          d = PC.sumarDias(d, 7);
        }
        return g;
      },
      /* puntos: [{x, y, nodo (o lista de nodos), html}] · la más reciente por defecto */
      seleccion: function (ctx, puntos, iPorDefecto) {
        var fig = ctx.figure;
        var pick = fig.querySelector('.pick');
        if (!pick) { pick = PC.el('div', { 'class': 'pick', 'aria-live': 'polite' }); ctx.host.parentNode.insertBefore(pick, ctx.host.nextSibling); }
        var actual = -1;
        function nodosDe(p) { return p && p.nodo ? (Array.isArray(p.nodo) ? p.nodo : [p.nodo]) : []; }
        function sel(i) {
          if (!puntos.length) return;
          i = Math.max(0, Math.min(puntos.length - 1, i));
          actual = i;
          puntos.forEach(function (p, j) {
            nodosDe(p).forEach(function (n) { n.classList.toggle('sel', j === i); n.classList.toggle('dim', j !== i); });
          });
          pick.innerHTML = puntos[i].html || '';
        }
        /* zona de toque bajo los puntos: un toque en cualquier sitio elige el punto más cercano en X */
        var zona = PC.svg('rect', { 'class': 'toque', x: 0, y: 0, width: ctx.iw, height: ctx.ih + ctx.m.b });
        ctx.g.insertBefore(zona, ctx.g.firstChild);
        function cerca(ev) {
          var r = ctx.svg.getBoundingClientRect();
          var x = (ev.clientX - r.left) * (ctx.w / (r.width || ctx.w)) - ctx.m.l;
          var best = 0, dist = 1e9;
          puntos.forEach(function (p, j) { var dd = Math.abs(p.x - x); if (dd < dist) { dist = dd; best = j; } });
          return best;
        }
        zona.addEventListener('click', function (ev) { sel(cerca(ev)); });
        puntos.forEach(function (p, j) { nodosDe(p).forEach(function (n) { n.style.cursor = 'pointer'; n.addEventListener('click', function (ev) { ev.stopPropagation(); sel(j); }); }); });
        ctx.svg.setAttribute('tabindex', '0');
        ctx.svg.addEventListener('keydown', function (e) {
          if (e.key === 'ArrowLeft') { e.preventDefault(); sel(actual - 1); }
          else if (e.key === 'ArrowRight') { e.preventDefault(); sel(actual + 1); }
          else if (e.key === 'Home') { e.preventDefault(); sel(0); }
          else if (e.key === 'End') { e.preventDefault(); sel(puntos.length - 1); }
        });
        sel(iPorDefecto === undefined || iPorDefecto === null ? puntos.length - 1 : iPorDefecto);
        return { sel: sel, actual: function () { return actual; }, pick: pick };
      },
      /* línea o raya del 3:49 con data-umbral="229" y rótulo siempre visible */
      umbral1000: function (ctx, op) {
        op = op || {};
        var etq = op.etiqueta || '3:49 elimina';
        var g = PC.svg('g', { 'class': 'umbral-1000', 'data-umbral': '229' }, op.padre || ctx.g);
        if (op.orient === 'v') {
          var x = Math.round(op.x) + 0.5;
          PC.svg('line', { 'class': 'umbral', x1: x, x2: x, y1: 0, y2: ctx.ih, 'data-umbral': '229' }, g);
          var izq = x > ctx.iw - 90;
          PC.svg('text', { 'class': 'lab elim', x: izq ? x - 4 : x + 4, y: 12, 'text-anchor': izq ? 'end' : 'start', text: etq }, g);
        } else {
          var y = Math.round(op.y) + 0.5;
          PC.svg('line', { 'class': 'umbral', x1: 0, x2: ctx.iw, y1: y, y2: y, 'data-umbral': '229' }, g);
          var ty = y < 16 ? y + 14 : y - 5;
          PC.svg('text', { 'class': 'lab elim', x: ctx.iw - 2, y: ty, 'text-anchor': 'end', text: etq }, g);
        }
        return g;
      },
      tabla: function (figure, cabeceras, filas) {
        var viejo = figure.querySelector('details.acc.datos'); if (viejo) viejo.remove();
        var th = cabeceras.map(function (c) { return '<th scope="col">' + PC.esc(c) + '</th>'; }).join('');
        var tb = filas.map(function (f) { return '<tr>' + f.map(function (c) { return '<td>' + PC.esc(c) + '</td>'; }).join('') + '</tr>'; }).join('');
        var d = PC.el('details', { 'class': 'acc datos' },
          '<summary>Ver datos' + PC.icon('chev', 'sm chev') + '</summary><div class="in"><div class="tscroll"><table class="t"><thead><tr>' + th + '</tr></thead><tbody>' + tb + '</tbody></table></div></div>');
        figure.appendChild(d);
        return d;
      },
      etiqueta: function (ctx, txt) { ctx.svg.setAttribute('aria-label', txt); }
    };
  })();

  /* ------------------------------------------------------------------ enrutador (§3.2) */
  (function () {
    var VISTAS = ['hoy', 'plan', 'marcas', 'tecnica', 'dieta'];
    var ALIAS = { 'marcas/simulador': 'marcas/nota' };
    var reg = {}, pos = {}, actual = null, iniciado = false, primera = true;
    PC.VISTAS = VISTAS.slice();
    PC.vista = function (nombre, obj) {
      var r = reg[nombre] = reg[nombre] || { iniciada: false };
      Object.keys(obj || {}).forEach(function (k) { r[k] = obj[k]; });
      if (iniciado && actual === nombre && !r.iniciada) mostrar(PC.ruta(), true);
      return r;
    };
    PC.ruta = function () {
      var h = decodeURIComponent((location.hash || '').replace(/^#\/?/, ''));
      var sub = '';
      var v = h.split('/')[0];
      if (VISTAS.indexOf(v) < 0) return { vista: 'hoy', sub: '', partes: [], hash: '#hoy' };
      sub = h.slice(v.length + 1);
      var full = v + (sub ? '/' + sub : '');
      if (ALIAS[full]) { full = ALIAS[full]; sub = full.slice(v.length + 1); }
      return { vista: v, sub: sub, partes: sub ? sub.split('/') : [], hash: '#' + full };
    };
    PC.ir = function (hash) {
      hash = hash.charAt(0) === '#' ? hash : '#' + hash;
      if (location.hash === hash) mostrar(PC.ruta(), true);
      else location.hash = hash;
    };
    PC.vistaActual = function () { return actual; };
    function tabs() { return PC.$$('.tabbar [role=tab], .ab-tabs [role=tab]'); }
    function marcarTabs(v) {
      tabs().forEach(function (t) {
        var si = t.getAttribute('data-v') === v;
        t.setAttribute('aria-selected', si ? 'true' : 'false');
        t.tabIndex = si ? 0 : -1;
      });
    }
    function anclaDe(root, r) {
      if (!r.sub) return null;
      var cands = [r.sub, r.partes[0]];
      for (var i = 0; i < cands.length; i++) {
        var a = root.querySelector('[data-ancla="' + cands[i].replace(/"/g, '') + '"]');
        if (a) return a;
      }
      return null;
    }
    function llevarArriba(suave) {
      W.scrollTo({ top: 0, behavior: suave && !PC.reduceMotion() ? 'smooth' : 'auto' });
    }
    function mostrar(r, forzar) {
      var root = DOC.getElementById('v-' + r.vista);
      if (!root) return;
      var cambia = actual !== r.vista;
      if (cambia && actual) pos[actual] = W.scrollY;
      if (cambia || forzar) {
        VISTAS.forEach(function (v) { var s = DOC.getElementById('v-' + v); if (s) s.hidden = v !== r.vista; });
        marcarTabs(r.vista);
      }
      actual = r.vista;
      var R = reg[r.vista];
      var manejado = false;
      if (R) {
        if (!R.iniciada && R.init) {
          R.iniciada = true;
          try { R.init(root, r); } catch (e) { err('init ' + r.vista, e); }
          try { activarSubnav(root); } catch (e) { err('subnav ' + r.vista, e); }
        } else if (!R.iniciada) R.iniciada = true;
        if (R.show) { try { manejado = R.show(r.sub, r) === true; } catch (e) { err('show ' + r.vista, e); } }
      }
      PC.pintarComunes(root);
      var ancla = manejado ? null : anclaDe(root, r);
      var destino = cambia ? (pos[r.vista] || 0) : null;
      var suave = !!ancla && !cambia && !primera && !PC.reduceMotion();
      /* se desplaza en el acto (el contenido ya está pintado: init y show son síncronos) y se repite
         en el siguiente fotograma solo si nadie ha movido la página entretanto (contenido que crece) */
      function aplicar(comportamiento) {
        if (ancla) { try { ancla.scrollIntoView({ block: 'start', behavior: comportamiento }); } catch (e) { ancla.scrollIntoView(); } }
        else if (!manejado && destino !== null) W.scrollTo(0, destino);
      }
      aplicar(suave ? 'smooth' : 'auto');
      primera = false;
      if (!suave && (ancla || destino !== null)) {
        var y0 = W.scrollY;
        W.requestAnimationFrame(function () { if (Math.abs(W.scrollY - y0) < 2) aplicar('auto'); });
      }
      try { DOC.dispatchEvent(new CustomEvent('pc:vista', { detail: r })); } catch (e) {}
    }
    PC._mostrar = mostrar;
    /* subnavegación: aria-current con IntersectionObserver sobre [data-ancla] */
    function activarSubnav(root) {
      var nav = root.querySelector('.subnav'); if (!nav || nav._pc) return;
      nav._pc = true;
      var links = PC.$$('a[href^="#"]', nav);
      function marcar(ancla) {
        links.forEach(function (a) {
          var h = a.getAttribute('href').split('/'); var si = h[h.length - 1] === ancla || h.slice(1).join('/') === ancla;
          /* M8: solo se desplaza la subnavegación en horizontal; scrollIntoView movía la página
             (la subnav está pegada y html lleva scroll-padding-top) y dejaba el ancla corta */
          if (si) {
            a.setAttribute('aria-current', 'true');
            try {
              var nl = a.getBoundingClientRect().left - nav.getBoundingClientRect().left + nav.scrollLeft, nw = nav.clientWidth;
              if (nl < nav.scrollLeft) nav.scrollLeft = Math.max(0, nl - 8);
              else if (nl + a.offsetWidth > nav.scrollLeft + nw) nav.scrollLeft = nl + a.offsetWidth - nw + 8;
            } catch (e) {}
          }
          else a.removeAttribute('aria-current');
        });
      }
      if (!W.IntersectionObserver) return;
      var vis = {};
      var io = new IntersectionObserver(function (ents) {
        ents.forEach(function (e) { vis[e.target.getAttribute('data-ancla')] = e.isIntersecting ? e.boundingClientRect.top : null; });
        var mejor = null, top = 1e9;
        Object.keys(vis).forEach(function (k) { if (vis[k] !== null && vis[k] < top) { top = vis[k]; mejor = k; } });
        if (mejor) marcar(mejor);
      }, { rootMargin: '-80px 0px -55% 0px' });
      PC.$$('[data-ancla]', root).forEach(function (s) { io.observe(s); });
    }
    PC.subnav = activarSubnav;
    PC.iniciarRutas = function () {
      if (iniciado) return;
      iniciado = true;
      W.addEventListener('hashchange', function () { mostrar(PC.ruta()); });
      tabs().forEach(function (t) {
        t.addEventListener('click', function () {
          var v = t.getAttribute('data-v');
          if (v === actual) {
            if (location.hash !== '#' + v) { try { history.replaceState(null, '', '#' + v); } catch (e) {} }
            llevarArriba(true);
            var R = reg[v]; if (R && R.show) { try { R.show('', { vista: v, sub: '', partes: [], hash: '#' + v, arriba: true }); } catch (e) { err('show ' + v, e); } }
          } else location.hash = '#' + v;
        });
        t.addEventListener('keydown', function (e) {
          var lista = PC.$$('[role=tab]', t.parentNode);
          var i = lista.indexOf(t), j = -1;
          if (e.key === 'ArrowRight') j = (i + 1) % lista.length;
          else if (e.key === 'ArrowLeft') j = (i - 1 + lista.length) % lista.length;
          else if (e.key === 'Home') j = 0;
          else if (e.key === 'End') j = lista.length - 1;
          if (j < 0) return;
          e.preventDefault(); lista[j].focus(); lista[j].click();
        });
      });
      var rsT = null;
      W.addEventListener('resize', function () {
        clearTimeout(rsT);
        rsT = setTimeout(function () { var R = reg[actual]; if (R && R.resize) { try { R.resize(); } catch (e) { err('resize ' + actual, e); } } }, 150);
      });
      mostrar(PC.ruta(), true);
    };
    /* cambio de día con la página abierta: se repintan las vistas ya iniciadas */
    PC.repintar = function () {
      PC.cal._reiniciar();
      VISTAS.forEach(function (v) { var R = reg[v]; if (R && R.iniciada && R.repintar) { try { R.repintar(); } catch (e) { err('repintar ' + v, e); } } });
      var R = reg[actual]; if (R && R.show) { try { R.show(PC.ruta().sub, PC.ruta()); } catch (e) { err('show ' + actual, e); } }
      PC.pintarComunes();
    };
    PC._reg = reg;
  })();

  /* ------------------------------------------------------------------ piezas comunes: chip de nota, pie, tema */
  (function () {
    function temaActual() { var t = DOC.documentElement.getAttribute('data-theme'); return t === 'light' || t === 'dark' ? t : ''; }
    function efectivo() {
      var t = temaActual(); if (t) return t;
      try { return W.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (e) { return 'light'; }
    }
    PC.tema = {
      actual: temaActual,
      efectivo: efectivo,
      poner: function (t) {
        if (t === 'light' || t === 'dark') { DOC.documentElement.setAttribute('data-theme', t); PC.store.set('tema', t); }
        else { DOC.documentElement.removeAttribute('data-theme'); PC.store.del('tema'); }
        PC.tema.pintar();
        try { DOC.dispatchEvent(new CustomEvent('pc:tema', { detail: efectivo() })); } catch (e) {}
      },
      pintar: function () {
        var t = temaActual();
        PC.$$('.seg.tema button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-tema') === t ? 'true' : 'false'); });
        var ab = DOC.getElementById('ab-tema');
        if (ab) {
          var ef = efectivo();
          ab.innerHTML = PC.icon(ef === 'dark' ? 'sol' : 'luna');
          ab.setAttribute('aria-label', ef === 'dark' ? 'Pasar a tema claro' : 'Pasar a tema oscuro');
        }
        var metas = PC.$$('meta[name="theme-color"]');
        metas.forEach(function (m) {
          var med = m.getAttribute('data-media') || m.getAttribute('media');
          if (!m.getAttribute('data-media') && med) m.setAttribute('data-media', med);
          if (t) { m.removeAttribute('media'); m.setAttribute('content', t === 'dark' ? '#0B1117' : '#F3F5F8'); }
          else { m.setAttribute('media', m.getAttribute('data-media') || ''); m.setAttribute('content', /dark/.test(m.getAttribute('data-media') || '') ? '#0B1117' : '#F3F5F8'); }
        });
      }
    };
    function faltaRegistrar() {
      var hoy = PC.hoyIso();
      var D = (PC.D.derivados.dias || []).filter(function (d) { return d.fecha < hoy; }).sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
      for (var i = 0; i < D.length; i++) {
        var dia = PC.cal.dia(D[i].fecha);
        if (!dia || dia.tipo === 'descanso' || dia.tipo === 'examen' || !dia.tipo) continue;
        return (dia.hist && dia.hist.length) ? null : dia.fecha;
      }
      return null;
    }
    PC.pintarComunes = function (root) {
      var scope = root || DOC;
      var der = PC.D.derivados, fu = PC.D.fuente;
      var dh = der.datosHasta ? PC.fmt.dia(der.datosHasta, 'corta') : '';
      PC.$$('[data-pc="datosHasta"]', scope).forEach(function (e) { e.textContent = dh || 'sin datos'; });
      var falta = faltaRegistrar();
      var pie = 'Datos hasta ' + (dh || 'sin datos') + ' · construido ' + (fu.construido ? PC.fmt.dia(fu.construido, 'dm') : 'sin fecha');
      PC.$$('[data-pc="pie"]', scope).forEach(function (e) {
        e.textContent = pie;
        if (falta) { var s = PC.el('span', { 'class': 'falta' }, ' · falta registrar ' + PC.esc(PC.fmt.dia(falta, 'corta'))); e.appendChild(s); }
      });
      var n = PC.notaActual();
      PC.$$('[data-pc="notaChip"]').forEach(function (e) {
        if (!n) { e.hidden = true; return; }
        e.hidden = false; e.textContent = n.txt;
        e.className = e.className.replace(/\b(ok|warn|bad)\b/g, '').replace(/\s+/g, ' ').trim() + ' ' + n.cls;
        e.setAttribute('aria-label', 'Nota con las marcas de hoy: ' + n.txt);
      });
      PC.tema.pintar();
    };
    DOC.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.seg.tema button[data-tema]');
      if (b) { PC.tema.poner(b.getAttribute('data-tema')); return; }
      if (e.target.closest && e.target.closest('#ab-tema')) PC.tema.poner(efectivo() === 'dark' ? 'light' : 'dark');
    });
    try {
      var mq = W.matchMedia('(prefers-color-scheme: dark)');
      var fn = function () { PC.tema.pintar(); try { DOC.dispatchEvent(new CustomEvent('pc:tema', { detail: efectivo() })); } catch (e) {} };
      if (mq.addEventListener) mq.addEventListener('change', fn); else if (mq.addListener) mq.addListener(fn);
    } catch (e) {}
  })();

  /* ------------------------------------------------------------------ impresión: todo abierto */
  (function () {
    var abiertos = [];
    W.addEventListener('beforeprint', function () {
      abiertos = PC.$$('details:not([open])'); abiertos.forEach(function (d) { d.open = true; });
    });
    W.addEventListener('afterprint', function () { abiertos.forEach(function (d) { d.open = false; }); abiertos = []; });
  })();

  /* ------------------------------------------------------------------ cambio de día con la página abierta */
  (function () {
    var dia = null;
    function comprobar() {
      if (hoyFijo) return;
      var h = PC.hoyIso();
      if (dia === null) { dia = h; return; }
      if (h !== dia) { dia = h; try { PC.repintar(); } catch (e) { err('repintar', e); } }
    }
    PC._comprobarDia = comprobar;
    DOC.addEventListener('visibilitychange', function () { if (DOC.visibilityState === 'visible') comprobar(); });
    setInterval(comprobar, 10 * 60 * 1000);
  })();

  /* ------------------------------------------------------------------ modo QA (?qa=1) · §10.6 */
  (function () {
    PC._qa = {
      adelantar: function (ms) { desfase += ms; },
      desfase: function () { return desfase; }
    };
    if (!PC.qa) return;
    function visible(e) {
      if (!e || !e.getClientRects || !e.getClientRects().length) return false;
      var cs = getComputedStyle(e);
      if (cs.visibility === 'hidden' || cs.display === 'none') return false;
      var r = e.getBoundingClientRect();
      return r.width > 0 || r.height > 0;
    }
    function selector(e) {
      var s = [], n = e;
      for (var i = 0; n && n.nodeType === 1 && i < 4; i++, n = n.parentElement) {
        var p = n.tagName.toLowerCase();
        if (n.id) { s.unshift(p + '#' + n.id); break; }
        var c = (n.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
        s.unshift(p + (c ? '.' + c : ''));
      }
      return s.join('>');
    }
    function caja(r) { return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) }; }
    function recortado(e, cw) {
      for (var n = e.parentElement; n && n !== DOC.body; n = n.parentElement) {
        var ox = getComputedStyle(n).overflowX;
        if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') return n.getBoundingClientRect().right <= cw + 1;
      }
      return false;
    }
    function medir(ruta, t0) {
      var cw = DOC.documentElement.clientWidth;
      var vista = DOC.getElementById('v-' + ruta.vista) || DOC.querySelector('main');
      var capas = [vista, DOC.querySelector('.tabbar'), DOC.querySelector('.appbar'), DOC.getElementById('focus'), DOC.querySelector('.sheet')].filter(function (x) { return x && visible(x); });
      var desb = [], toques = [], letra = [];
      capas.forEach(function (capa) {
        PC.$$('*', capa).concat([capa]).forEach(function (e) {
          if (!visible(e)) return;
          var r = e.getBoundingClientRect();
          var fija = getComputedStyle(e).position === 'fixed';
          if (r.right > cw + 1 && !recortado(e, cw) && !(fija && e === capa)) { if (desb.length < 40) desb.push({ sel: selector(e), caja: caja(r) }); }
          var tag = e.tagName.toLowerCase();
          var tocable = /^(button|select|textarea|summary)$/.test(tag) || (tag === 'input' && e.type !== 'hidden') ||
            (tag === 'a' && e.hasAttribute('href')) || /^(button|tab|radio|checkbox|switch|slider|link)$/.test(e.getAttribute('role') || '') ||
            (e.getAttribute('tabindex') === '0' && tag !== 'svg');
          if (tocable) {
            var cs = getComputedStyle(e);
            var exento = (tag === 'a' && cs.display === 'inline') || e.closest('.appbar .chip') || (e.closest('[data-deco]'));
            if (!exento && (r.height < 43.5 || r.width < 43.5)) { if (toques.length < 40) toques.push({ sel: selector(e), caja: caja(r), txt: (e.textContent || '').trim().slice(0, 40) }); }
          }
        });
        var tw = DOC.createTreeWalker(capa, NodeFilter.SHOW_TEXT, null);
        var nodo;
        while ((nodo = tw.nextNode())) {
          if (!nodo.nodeValue || !nodo.nodeValue.trim()) continue;
          var p = nodo.parentElement; if (!p || p.closest('[data-deco]') || p.closest('script,style,noscript')) continue;
          if (!visible(p)) continue;
          var fs;
          if (p instanceof SVGElement) {
            var t = p.closest('text') || p;
            var m = t.getScreenCTM ? t.getScreenCTM() : null;
            fs = parseFloat(getComputedStyle(t).fontSize) * (m ? Math.sqrt(m.a * m.a + m.b * m.b) : 1);
          } else fs = parseFloat(getComputedStyle(p).fontSize);
          if (fs < 11.5 && letra.length < 40) letra.push({ sel: selector(p), px: Math.round(fs * 10) / 10, txt: nodo.nodeValue.trim().slice(0, 40) });
        }
      });
      var umb = PC.$$('[data-umbral="229"]').filter(function (e) { return visible(e); }).length;
      var inv = {}, src = {};
      PC.$$('[data-inv]').forEach(function (e) { e.getAttribute('data-inv').split(',').forEach(function (x) { x = x.trim(); if (x) inv[x] = 1; }); });
      PC.$$('[data-src]').forEach(function (e) { var s = e.getAttribute('data-src'); if (s) src[s] = 1; });
      var pref = { hoy: 'hoy-', plan: 'pl-', marcas: 'mc-', tecnica: 'te-', dieta: 'di-' }[ruta.vista];
      var orden = [];
      if (vista) {
        var ids = PC.$$('[id^="' + pref + '"]', vista);
        ids.forEach(function (e) { var up = e.parentElement && e.parentElement.closest('[id^="' + pref + '"]'); if (!up || !vista.contains(up)) orden.push(e.id); });
      }
      var tb = DOC.querySelector('.tabbar');
      var tbTop = tb && visible(tb) ? tb.getBoundingClientRect().top : W.innerHeight;
      var sb = DOC.querySelector('.sb-fondo'); var sbH = sb ? sb.getBoundingClientRect().height : 0;
      var claves = { fecha: '#hoy-cab h1', lamparas: '#hoy-ses .lamps', titulo: '#hoy-ses .card-h h2', numeros: '#hoy-ses .stats', hoyhaces: '#hoy-ses [data-qa-clave="hoyhaces"]' };
      var pp = { util: { top: Math.round(sbH), bottom: Math.round(tbTop) } };
      PC.$$('[data-qa-clave]').forEach(function (e) { claves[e.getAttribute('data-qa-clave')] = '[data-qa-clave="' + e.getAttribute('data-qa-clave') + '"]'; });
      Object.keys(claves).forEach(function (k) {
        var e = DOC.querySelector(claves[k]);
        if (!e || !visible(e)) { pp[k] = null; return; }
        var r = e.getBoundingClientRect();
        pp[k] = caja(r); pp[k].visible = r.top >= sbH - 1 && r.bottom <= tbTop + 1;
      });
      return {
        ruta: location.hash || '#hoy', vista: ruta.vista, ancho: W.innerWidth, alto: W.innerHeight, tema: PC.tema.efectivo(),
        hoy: PC.hoyIso(), hora: PC.ahoraMin(),
        errores: (W.__errores || []).slice(), scrollW: DOC.documentElement.scrollWidth, clientW: cw,
        desbordan: desb, toques: toques, letra: letra, umbral1000: umb,
        inv: Object.keys(inv).sort(), src: Object.keys(src).sort(),
        texto: vista ? vista.innerText : '', orden: orden, primeraPantalla: pp,
        pitidos: PC.audio._llamadas(), msArranque: Math.round(PC._msArranque || 0),
        focus: PC.focus.abierto(), hoja: PC.sheet.abierta(), vibrar: PC.puedeVibrar(), t: Math.round(performance.now() - t0)
      };
    }
    /* pruebas del núcleo que no dependen de datos de casos (temporizador, audio sin vibrar) */
    function pruebasNucleo() {
      var out = {};
      try {
        var avisos = 0, ceros = 0, tarde = null;
        var t = PC.timer.crear({ seg: 90, alAviso: function () { avisos++; }, alCero: function (a, x) { ceros++; tarde = x; } });
        t.empezar();
        PC._qa.adelantar(30000);
        DOC.dispatchEvent(new Event('visibilitychange'));
        PC.timer.revisar();
        var r1 = t.restante();
        PC._qa.adelantar(55000);
        PC.timer.revisar();
        var r2 = t.restante(), av = avisos;
        PC._qa.adelantar(15000);
        PC.timer.revisar();
        out.timer = { tras30: Math.round(r1 * 10) / 10, tras85: Math.round(r2 * 10) / 10, avisos: av, ceros: ceros, terminoHace: Math.round((tarde || 0) * 10) / 10,
          ok: Math.abs(r1 - 60) < 0.6 && Math.abs(r2 - 5) < 0.6 && av === 1 && ceros === 1 && Math.abs(tarde - 10) < 0.6 };
        t.parar();
        var p = PC.timer.crear({ seg: 60 }); p.empezar(); PC._qa.adelantar(10000); p.pausa(); PC._qa.adelantar(20000); var rp = p.restante(); p.sumar(15); var rs = p.restante(); p.parar();
        out.pausa = { tras10yPausa20: Math.round(rp * 10) / 10, mas15: Math.round(rs * 10) / 10, ok: Math.abs(rp - 50) < 0.6 && Math.abs(rs - 65) < 0.6 };
        PC._qa.adelantar(-desfase);
      } catch (e) { out.timer = { ok: false, error: String(e && e.message || e) }; }
      try {
        var a = PC.audio.desbloquear(), b = PC.audio.pitido(1), c = PC.vibrar([100]), d = PC.vibrar([300, 150, 300]);
        out.audio = { ok: true, desbloquear: a, pitido: b, vibra: PC.puedeVibrar(), vibrar: c, vibrar2: d };
      } catch (e) { out.audio = { ok: false, error: String(e && e.message || e) }; }
      return out;
    }
    PC._qa.medir = medir;
    PC._qa.pruebasNucleo = pruebasNucleo;
    PC._qa.lanzar = function () {
      var t0 = performance.now();
      setTimeout(function () {
        var r = PC.ruta();
        if (Q.abrir === '1') {
          var v = DOC.getElementById('v-' + r.vista);
          PC.$$('details', v).forEach(function (d) { d.open = true; });
        }
        setTimeout(function () {
          var res;
          try { res = medir(r, t0); } catch (e) { res = { error: String(e && e.message || e), errores: (W.__errores || []).slice() }; }
          if (Q.pruebas === '1') { try { res.pruebas = pruebasNucleo(); } catch (e) { res.pruebas = { error: String(e) }; } }
          W.__qa = res;
          DOC.documentElement.setAttribute('data-qa', 'listo');
        }, 60);
      }, 1500);
    };
  })();
})();
