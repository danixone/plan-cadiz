/* 20_hoy.js · M2 · Hoy (especificación §5.1, §6.2 T1-T4 y T11, G11).
   API pública (§10.3):
     PC.sem.calcular(entrada) → salida        pura; entrada {fecha, banda, min, reloj, sintomas, codo, talon, cintillo, agujetas, ayerRojo, rachaAyer}
     PC.sem.hoy() → salida guardada de hoy | null · PC.sem.leer(fecha) · PC.sem.guardar(fecha, entrada) · PC.sem.salida(fecha)
     PC.sesion.pasos(dia, color, opcion) · PC.sesion.reloj(dia) → [líneas] · PC.sesion.tarjeta(dia, {modo:'hoy'|'hoja'}) → Element
       (opcion: el contexto de PC.sesion.contexto; si falta, se usa la opción de condición guardada en este móvil)
     PC.sesion.contexto(dia, color) · PC.sesion.numeros(dia, color) · PC.sesion.haces(dia, color)
     PC.cond.de(dia) → {tipo, …} | null · PC.cond.todas(dia) · PC.cond.valor(dia) → opción elegida | cifra | null
     PC.graf.camino(host)                      G11
   Todo texto de datos es literal de plan.json, historial.json o web.json; las cifras nuevas salen de cuentas
   explícitas (cena = luz − 2 h, días que faltan, ±3 s, ritmo del 3:49 = 229 / 5 por 200).
   Almacenamiento (§10.4): pc-sem-AAAA-MM-DD, pc-ses-AAAA-MM-DD, pc-cond-AAAA-MM-DD, pc-bloqueC, pc-prueba (lo lee M0). */
(function (PC) {
  'use strict';
  if (!PC) return;
  var DOC = document;
  var esc = PC.esc;

  /* ================================================================ utilidades */
  function plan() { return PC.D.plan || {}; }
  function web() { return PC.D.web || {}; }
  function der() { return PC.D.derivados || {}; }
  function clon(o) { return o === null || o === undefined ? o : JSON.parse(JSON.stringify(o)); }
  function mezclar() {
    var o = {};
    for (var i = 0; i < arguments.length; i++) { var x = arguments[i]; if (x) Object.keys(x).forEach(function (k) { if (x[k] !== undefined) o[k] = x[k]; }); }
    return o;
  }
  function regla(id) { return (plan().reglas || []).filter(function (r) { return r.id === id; })[0] || null; }
  function reglaTxt(id) { var r = regla(id); return r ? (r.texto || '') : ''; }
  /* frase literal que empieza por «ini» y acaba en el primer «. » (con el punto) o al final del texto */
  function frase(txt, ini) {
    txt = String(txt || ''); var i = txt.indexOf(ini); if (i < 0) return '';
    var j = txt.indexOf('. ', i);
    return (j < 0 ? txt.slice(i) : txt.slice(i, j + 1)).trim();
  }
  function frases(txt) {
    var out = [], s = String(txt || ''), i = 0, j;
    while ((j = s.indexOf('. ', i)) >= 0) { out.push(s.slice(i, j + 1).trim()); i = j + 2; }
    if (s.slice(i).trim()) out.push(s.slice(i).trim());
    return out;
  }
  function mayus(t) { t = String(t || ''); return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }
  /* segundos de una duración escrita: «90 s», «2 min», «2:30», «3-4 min» (el primero), «20:00» */
  function segDe(txt) {
    if (txt === null || txt === undefined || txt === '') return null;
    if (typeof txt === 'number') return txt;
    var s = String(txt), m;
    if ((m = /^\s*(\d{1,2}):(\d{2})\b/.exec(s))) return (+m[1]) * 60 + (+m[2]);
    if ((m = /(\d+(?:[.,]\d+)?)\s*(?:[–-]\s*\d+(?:[.,]\d+)?\s*)?(min|s)\b/.exec(s))) return parseFloat(m[1].replace(',', '.')) * (m[2] === 'min' ? 60 : 1);
    return null;
  }
  /* «1:27» → {lo:87, hi:87} · «0:41-0:43» → {lo:41, hi:43} */
  function rangoT(txt) {
    var s = String(txt || '').trim(), m = /^(\d{1,2}:\d{2}(?:,\d+)?)\s*[-–]\s*(\d{1,2}:\d{2}(?:,\d+)?)$/.exec(s);
    if (m) return { lo: PC.fmt.parseT(m[1]), hi: PC.fmt.parseT(m[2]) };
    var v = PC.fmt.parseT(s);
    return v === null ? null : { lo: v, hi: v };
  }
  function num(txt) { if (txt === null || txt === undefined || txt === '') return null; var v = parseFloat(String(txt).replace(',', '.')); return isNaN(v) ? null : v; }
  function sinHora(t) { return String(t || '').replace(/^\s*\d{1,2}:\d{2}\s+/, ''); }
  function hm(min) { if (min === null || min === undefined) return ''; var h = Math.floor(min / 60), m = Math.round(min % 60); return h + ':' + (m < 10 ? '0' : '') + m; }
  function unico(lista) { var v = {}; return lista.filter(function (x) { if (!x || v[x]) return false; v[x] = 1; return true; }); }
  function st() { return PC.store; }
  function claveFecha(clave) { var m = /(\d{4}-\d{2}-\d{2})/.exec(clave || ''); return m ? m[1] : null; }
  function histEntrada(src) {
    var p = String(src || '').split(':'), arr = (PC.D.historial || {})[p[0]] || [];
    for (var i = 0; i < arr.length; i++) if (arr[i].fecha === p.slice(1).join(':')) return arr[i];
    return null;
  }
  var ICONO = { carrera: 'carrera', fuerza: 'fuerza', circuito: 'circuito', descanso: 'descanso', control: 'control', examen: 'examen', prueba: 'prueba' };
  var LETRA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  var NCOLOR = { verde: 'Verde', ambar: 'Ámbar', rojo: 'Rojo', parada: 'No se entrena' };
  var CCOLOR = { verde: 'ok', ambar: 'warn', rojo: 'bad', parada: 'bad' };
  var LAMP = { verde: 'g', ambar: 'a', rojo: 'r' };

  /* ================================================================ T1 · semáforo (PC.sem) */
  var SEM = PC.sem = PC.sem || {};
  var SEM_DEF = { banda: null, min: null, reloj: 'normal', sintomas: 'ninguno', codo: 0, talon: 'nada', cintillo: 'nada', agujetas: 0, ayerRojo: null };
  function cortes() { var c = der().cortesSueno || {}; return { verde: c.verde || 390, rojo: c.rojo || 300 }; }
  SEM.bandaDeMin = function (min) { var c = cortes(); return min >= c.verde ? 'verde' : (min >= c.rojo ? 'ambar' : 'rojo'); };
  function wsem() { return web().semaforo || {}; }
  function motivoRojo() {
    var m = /ROJO \(menos[^)]*\)/.exec(reglaTxt('dia-torcido'));
    return m ? m[0] : 'ROJO';
  }
  function motivoAgujetas(dia) {
    var m = /ÁMBAR \([^)]*agujetas[^)]*\)/.exec((dia && dia.objetivo) || '');
    return m ? m[0] : 'agujetas 3-4';
  }
  function textoRacha() { return wsem().racha || frase(reglaTxt('dia-torcido'), 'RACHA'); }
  SEM.calcular = function (ent) {
    var e = mezclar(SEM_DEF, ent || {});
    var cu = wsem().cuello || {};
    var min = (e.min === null || e.min === undefined || e.min === '') ? null : +e.min;
    if (min !== null && isNaN(min)) min = null;
    var banda = e.banda || (min !== null ? SEM.bandaDeMin(min) : null);
    var out = { banda: banda, min: min, color: banda, mide: false, racha: false, motivos: [], avisos: [] };
    if (!banda) { out.color = null; return out; }
    var dia = null;
    try { dia = e.fecha && PC.cal ? PC.cal.dia(e.fecha) : null; } catch (x) { dia = null; }
    var color = banda;
    if (e.reloj === 'vfc' || e.reloj === 'sobrecarga') { color = 'rojo'; out.motivos.push(motivoRojo()); }
    if (banda === 'rojo' && e.ayerRojo === true) { color = 'rojo'; out.racha = true; out.motivos.push(textoRacha()); }
    if (e.rachaAyer === true) { color = 'rojo'; if (out.motivos.indexOf(textoRacha()) < 0) out.motivos.push(textoRacha()); }
    var agu = +e.agujetas || 0;
    if (agu >= 3 && agu <= 4 && color === 'verde') { color = 'ambar'; out.motivos.push(motivoAgujetas(dia)); }
    if (agu >= 5) out.avisos.push({ txt: 'el plan no fija qué hacer con agujetas de 5 o más: pregúntale al entrenador', tono: 'warn' });
    if (e.sintomas === 'encima') {
      if (color === 'verde' || color === 'ambar') color = cu.colorEncima || 'rojo';
      out.avisos.push({ txt: cu.encima || frase(reglaTxt('dia-torcido'), 'Síntomas por encima'), tono: 'warn' });
    }
    var reg10 = ((plan().protocoloDominadas || {}).reglas || [])[10] || '';
    var codo = +e.codo || 0;
    if (codo >= 3 && codo <= 4) out.avisos.push({ txt: frase(reg10, '3-4/10'), tono: 'warn' });
    else if (codo >= 5) out.avisos.push({ txt: frase(reg10, '5/10 o más'), tono: 'bad' });
    if (e.talon === 'duele') out.avisos.push({ txt: frase((plan().lesiones || {}).pies, 'Señal de alarma'), tono: 'warn' });
    if (e.cintillo === 'molesta') out.avisos.push({ txt: frase((plan().lesiones || {}).cintillo, 'Regla de parada'), tono: 'bad' });
    if (e.sintomas === 'debajo') { color = 'parada'; out.motivos.push(cu.debajo || 'Por debajo del cuello: no se entrena'); }
    if (color === 'ambar' || color === 'rojo') out.avisos.push({ txt: frase(reglaTxt('dormir'), 'Siesta solo'), tono: 'info' });
    out.color = color;
    out.mide = color === 'verde';
    return out;
  };
  SEM.leer = function (fecha) { var g = st().get('sem-' + fecha, null); return g && typeof g === 'object' ? g : null; };
  /* ¿la noche anterior también fue roja? pc-sem de ayer o, si no, historial.sueno (derivados.noches) */
  SEM.ayerRojo = function (fecha) {
    var ay = PC.sumarDias(fecha, -1), g = SEM.leer(ay);
    if (g && (g.banda || g.min !== null && g.min !== undefined)) return (g.banda || SEM.bandaDeMin(+g.min)) === 'rojo';
    var n = (der().noches || []).filter(function (x) { return x.fecha === ay; })[0];
    if (n && n.color) return n.color === 'rojo';
    return null;
  };
  function entradaCompleta(fecha, g) {
    var e = mezclar(SEM_DEF, g || {});
    e.fecha = fecha;
    if (e.ayerRojo === null || e.ayerRojo === undefined) e.ayerRojo = SEM.ayerRojo(fecha);
    var ga = SEM.leer(PC.sumarDias(fecha, -1));
    e.rachaAyer = !!(ga && ga.racha);
    return e;
  }
  SEM.salida = function (fecha) {
    var g = SEM.leer(fecha); if (!g || (!g.banda && (g.min === null || g.min === undefined))) return null;
    var s = SEM.calcular(entradaCompleta(fecha, g));
    s.entrada = g;
    return s;
  };
  SEM.guardar = function (fecha, ent) {
    var e = mezclar(SEM_DEF, ent || {});
    var s = SEM.calcular(entradaCompleta(fecha, e));
    var g = { banda: s.banda, min: s.min, reloj: e.reloj, sintomas: e.sintomas, codo: +e.codo || 0, talon: e.talon, cintillo: e.cintillo,
      agujetas: +e.agujetas || 0, ayerRojo: e.ayerRojo === undefined ? null : e.ayerRojo, color: s.color, racha: s.racha, t: Date.now() };
    st().set('sem-' + fecha, g);
    s.entrada = g;
    return s;
  };
  SEM.hoy = function () { return SEM.salida(PC.hoyIso()); };
  /* racha semanal (P3): noches por debajo de 360 min entre el 28-9 y el 4-10 */
  SEM.rachaSemana = function (fecha) {
    var m = /entre el (\d{1,2})-(\d{1,2}) y el (\d{1,2})-(\d{1,2})|semana del (\d{1,2})-(\d{1,2}) al (\d{1,2})-(\d{1,2})/.exec(wsem().horario || '');
    if (!m) return null;
    var d1 = m[5] || m[1], m1 = m[6] || m[2], d2 = m[7] || m[3], m2 = m[8] || m[4];
    var anio = String(fecha).slice(0, 4);
    function iso(d, mm) { return anio + '-' + (mm < 10 ? '0' : '') + (+mm) + '-' + (d < 10 ? '0' : '') + (+d); }
    var a = iso(+d1, +m1), b = iso(+d2, +m2);
    if (fecha < a || fecha > b) return null;
    var seguro = 0, dudosas = 0;
    for (var f = a; f <= b && f <= fecha; f = PC.sumarDias(f, 1)) {
      var g = SEM.leer(f), minN = null, banda = null;
      if (g) { minN = g.min !== null && g.min !== undefined ? +g.min : null; banda = g.banda; }
      else { var n = (der().noches || []).filter(function (x) { return x.fecha === f; })[0]; if (n) { minN = n.min; banda = n.color; } }
      if (minN !== null) { if (minN < 360) seguro++; }
      else if (banda === 'rojo') seguro++;
      else if (banda === 'ambar') dudosas++;
    }
    return { seguro: seguro, dudosas: dudosas, texto: wsem().horario || '', salta: seguro >= 3 };
  };

  /* ================================================================ T11 · condición del día (PC.cond) */
  var COND = PC.cond = PC.cond || {};
  var NINGUNA = { id: 'ninguna', txt: 'Ninguna de estas' };
  COND.todas = function (dia) {
    var out = [];
    if (!dia) return out;
    var cp = (der().condiciones || {}).prueba;
    if (cp && !PC.cal.version() && dia.fecha >= (cp.desde || '9') && dia.fecha <= (cp.hasta || '0')) {
      out.push({ tipo: 'prueba', pregunta: cp.pregunta || '¿Cuándo es la prueba?', opciones: (cp.opciones || []).map(function (o) { return { id: o.id, txt: o.id.replace('-', '–'), nombre: o.nombre }; }) });
    }
    var c = dia.condicion;
    if (c) {
      var t = c.compartida ? 'compartida' : (c.calculo ? 'calculo' : (c.tipo || 'opciones'));
      if (t === 'compartida') out.push({ tipo: t, pregunta: c.pregunta, opciones: [{ id: 'si', txt: 'Sí' }, { id: 'no', txt: 'No' }], base: c.base, si: c.si, desde: c.desde, decide: c.decide, src: c });
      else out.push({ tipo: t, pregunta: c.pregunta, opciones: (c.opciones || []).slice(), prellenar: c.prellenar, comun: c.comun, calculo: c.calculo, src: c });
    }
    out.forEach(function (x) { elegir(dia, x); });
    return out;
  };
  function claveCond(dia, c) {
    if (c.tipo === 'compartida') return 'bloqueC';
    if (c.tipo === 'prueba') return 'cond-' + dia.fecha + '-prueba';
    return 'cond-' + dia.fecha;
  }
  function buscarSem(desde, hasta, fn) {
    for (var f = desde; f <= hasta; f = PC.sumarDias(f, 1)) { var g = SEM.leer(f); if (g && fn(g)) return f; }
    return null;
  }
  function sesionApuntada(o) { return !!(o && ((o.reps && o.reps.length) || o.fue)); }
  function prellenar(dia, c) {
    var p = c.prellenar; if (!p) return null;
    if (p.sem && typeof p.sem === 'object' && p.sem.campo) {
      var f = buscarSem(p.sem.desde, p.sem.hasta, function (g) { return g[p.sem.campo] === p.sem.igual; });
      return f ? { id: p.opcion, de: f } : null;
    }
    if (p.reglas) {
      var s = st().get(p.sem, null), g = st().get(p.gym, null);
      if (!s || !s.color) return null;
      var res = g && g.gym && g.gym.reserva5 !== undefined && g.gym.reserva5 !== null ? +g.gym.reserva5 : null;
      for (var i = 0; i < p.reglas.length; i++) {
        var r = p.reglas[i], cols = [].concat(r.color);
        if (cols.indexOf(s.color) < 0) continue;
        if (r.reserva5 !== undefined) {
          if (res === null) continue;
          var mm = /^(>=)?(\d+)$/.exec(String(r.reserva5)); if (!mm) continue;
          if (mm[1] ? res < +mm[2] : res !== +mm[2]) continue;
        }
        return { id: r.opcion, de: claveFecha(p.gym) || claveFecha(p.sem) };
      }
      return null;
    }
    if (p.clave && p.campo && Object.prototype.hasOwnProperty.call(p, 'si')) {
      var o = st().get(p.clave, null); if (!o) return null;
      if (o[p.campo] === p.si) return { id: 'si', de: claveFecha(p.clave) };
      if (sesionApuntada(o) && (o[p.campo] === p.no || o[p.campo] === undefined)) return { id: 'no', de: claveFecha(p.clave) };
      return null;
    }
    if (p.clave && p.campo && p.igual !== undefined) {
      var o2 = st().get(p.clave, null);
      return o2 && o2[p.campo] === p.igual ? { id: p.opcion, de: claveFecha(p.clave) } : null;
    }
    if (p.ses) {
      var hay = false, pasa = false, cual = null;
      for (var f2 = p.ses.desde; f2 <= p.ses.hasta; f2 = PC.sumarDias(f2, 1)) {
        var x = st().get('ses-' + f2, null), y = SEM.leer(f2), vals = [];
        if (x) [x.gym, x.fue].forEach(function (z) { if (z) (p.ses.campos || []).forEach(function (k) { if (z[k] !== undefined && z[k] !== null && z[k] !== '') vals.push(+z[k]); }); });
        if (y && y.codo) vals.push(+y.codo);
        if (vals.length) hay = true;
        if (vals.some(function (v) { return v > p.ses.mayorQue; })) { pasa = true; cual = f2; }
      }
      if (pasa) return { id: p.opcion, de: cual };
      return hay && p.sinRegistros !== undefined && p.sinRegistros !== null ? { id: p.sinRegistros } : null;
    }
    return null;
  }
  function elegir(dia, c) {
    var v = st().get(claveCond(dia, c), null), auto = null;
    if (c.tipo === 'compartida' && v !== 'si' && v !== 'no' && v !== 'ninguna') v = null;
    if (v === null || v === undefined) { auto = prellenar(dia, c); if (auto) v = auto.id; }
    c.elegida = v === 'ninguna' ? NINGUNA : ((c.opciones || []).filter(function (o) { return o.id === v; })[0] || null);
    c.auto = c.elegida && auto && auto.id === v ? auto : null;
    if (c.tipo === 'calculo') c.cifra = calculo(c);
    return c;
  }
  function validasDel(clave) {
    var o = st().get(clave, null);
    if (o) {
      if (typeof o.validas === 'number') return o.validas;
      if (Array.isArray(o.reps)) return o.reps.filter(function (r) { return r && (r.valida === true || r.v === true || r.cat === 'valida' || r === 'v'); }).length;
    }
    var f = claveFecha(clave), s = f ? st().get('ses-' + f, null) : null;
    if (s && s.fue && s.fue.validas !== undefined && s.fue.validas !== null && s.fue.validas !== '') return +s.fue.validas;
    return null;
  }
  function calculo(c) {
    var k = c.calculo; if (!k) return null;
    var v = validasDel(k.de);
    if (v === null || isNaN(v)) return null;
    return Math.max(0, Math.min(v - (+k.resta || 0), k.max === undefined ? Infinity : +k.max));
  }
  COND.guardar = function (dia, c, id) {
    var k = claveCond(dia, c);
    if (c.tipo === 'prueba') {
      if (id === 'ninguna') { st().set(k, 'ninguna'); return; }
      st().del(k); st().set('prueba', id); return;
    }
    if (id === null) st().del(k); else st().set(k, id);
  };
  COND.de = function (dia) { var t = COND.todas(dia); return t.length ? t[t.length - 1] : null; };
  COND.valor = function (dia) {
    var c = COND.de(dia); if (!c) return null;
    if (c.tipo === 'calculo' && c.cifra !== null && c.cifra !== undefined) return c.cifra;
    return c.elegida ? c.elegida.id : null;
  };

  /* ================================================================ la sesión del día (PC.sesion) */
  var SES = PC.sesion = PC.sesion || {};
  function fundir(p, ov) {
    if (!ov) return p;
    if (!p || (ov.tipo && ov.tipo !== p.tipo)) return clon(ov);
    var o = clon(p);
    Object.keys(ov).forEach(function (k) {
      if (k === 'partes' && Array.isArray(ov.partes) && Array.isArray(o.partes)) {
        ov.partes.forEach(function (x, i) { if (x && o.partes[i]) Object.keys(x).forEach(function (kk) { o.partes[i][kk] = clon(x[kk]); }); });
      } else if (k !== 'desde' && k !== 'fuente') o[k] = clon(ov[k]);
    });
    return o;
  }
  function normSes(s) { return String(s || '').replace(/\s*\(rec\.[^)]*\)/g, '').replace(/(\d) m\b/g, '$1'); }
  /* recorte del ámbar («6 × 400 → 4») sacado de web.semaforo.recortes (literal de reglas[dia-torcido]) */
  function recorte(dia) {
    var s = ' ' + normSes(dia && dia.sesion), rs = wsem().recortes || [];
    for (var i = 0; i < rs.length; i++) {
      var de = rs[i][0], re = new RegExp('(^|[^\\d])' + de.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      if (re.test(s)) return { de: de, a: rs[i][1] };
    }
    return null;
  }
  function aplicarRecorte(p, rc) {
    if (!p || !rc) return p;
    var o = clon(p), a = String(rc.a);
    if (/^\d+$/.test(a) && o.tipo === 'series') o.n = +a;
    else if (/^×\s*(\d+)$/.test(a)) o.n = +/(\d+)/.exec(a)[1];
    else if (/^\d+ \+ \d+$/.test(a) && o.partes) { var ns = a.split('+').map(function (x) { return +x.trim(); }); o.partes.forEach(function (pt, i) { pt.n = ns[i] || 1; }); }
    else if (/^solo el /.test(a) && o.partes) o.partes = o.partes.slice(0, 1);
    o.recorte = rc;
    return o;
  }
  function plantilla(dia, p) {
    var ex = dia.extra || {};
    if (ex.plantilla) return ex.plantilla;
    if (p && p.tipo === 'rodaje') return 'rodaje';
    if (p && p.tipo === 'control1000') return 'control';
    if ((dia.tipo === 'carrera' || dia.tipo === 'control') && p) return 'series';
    if (dia.tipo === 'carrera' && /rodaje/i.test(dia.sesion || '')) return 'rodaje';
    return dia.tipo || null;
  }
  /* contexto de la tarjeta: condiciones elegidas, principal, fuerza y plantilla para un color */
  SES.contexto = function (dia, color) {
    color = color || 'verde';
    var conds = COND.todas(dia);
    var p = clon(dia.principal || null), opF = null, opN = null, tec = null, cambio = false, sinElegir = false, opTxt = [];
    conds.forEach(function (c) {
      var op = c.elegida;
      if (c.tipo === 'prueba') return;
      if (!op && c.opciones && c.opciones.length) sinElegir = true;
      if (c.tipo === 'compartida') {
        var ov = op && op.id === 'si' ? c.si : c.base;
        if (ov) p = fundir(p, ov);
        if (op && op.id === 'si') cambio = true;
        return;
      }
      if (!op || op.id === 'ninguna') return;
      if (op.principal) { p = fundir(p, op.principal); cambio = true; }
      if (op.fuerza) opF = op.fuerza;
      if (op.numeros) opN = op.numeros;
      if (op.bloqueTecnico) tec = true; else if (c.opciones.some(function (o) { return o.bloqueTecnico; })) tec = false;
      opTxt.push(op.txt);
    });
    var tpl = plantilla(dia, p);
    if (tpl === 'series' && color === 'ambar' && p && !(p.n && typeof p.n === 'object')) p = aplicarRecorte(p, recorte(dia));
    if (p && p.tipo === 'km-partido' && typeof p.n === 'object') p.nColor = p.n[color] || p.n.verde || 1;
    var R = { conds: conds, principal: p, opF: color === 'verde' ? opF : null, opN: color === 'verde' ? opN : null, tec: tec, cambio: cambio,
      sinElegir: sinElegir, opTxt: opTxt, tpl: tpl, color: color };
    if (tpl === 'fuerza') R.fuerza = fuerzaDe(dia, color, R);
    return R;
  };

  /* ---------------------------------------------------------------- fuerza (martes) */
  var ORDEN_F = [['A'], ['H'], ['B', 'D'], ['C', 'F'], ['E', 'G'], ['I']];
  function fuerzaDe(dia, color, R) {
    var mf = (plan().sesionesTipo || {}).martesFuerza || {};
    var B = {}; (mf.bloques || []).forEach(function (b) { B[b.clave] = clon(b); });
    var fz = (dia.extra && dia.extra.fuerza) || {};
    var ov = fz[color] || (color !== 'verde' ? fz.verde : null) || null;
    function aplicar(o) {
      if (!o) return;
      Object.keys(o).forEach(function (k) { if (/^[A-I]$/.test(k) && B[k] && o[k]) Object.keys(o[k]).forEach(function (kk) { B[k][kk] = o[k][kk]; }); });
      (o.quitar || []).forEach(function (k) { delete B[k]; });
      if (o.solo) Object.keys(B).forEach(function (k) { if (o.solo.indexOf(k) < 0) delete B[k]; });
    }
    aplicar(ov);
    if (R && R.opF) aplicar(R.opF);
    var pares = {}; ((mf.superseries || {}).pares || []).forEach(function (p) { pares[p.par.replace(/\s/g, '')] = p; });
    var grupos = [];
    ORDEN_F.forEach(function (g) {
      var ks = g.filter(function (k) { return B[k]; });
      if (!ks.length) return;
      var par = ks.length === 2 ? pares[ks.join('+')] : null;
      grupos.push({ claves: ks, bloques: ks.map(function (k) { return B[k]; }), par: par,
        descanso: par ? segDe(par.descanso) : segDe(B[ks[ks.length - 1]].descanso) });
    });
    return { bloques: B, grupos: grupos, mf: mf };
  }
  function pesoCorto(p) { var m = /^\s*(\d+(?:,\d+)?\s*kg)\b/.exec(String(p || '')); return m ? m[1] : null; }

  /* ---------------------------------------------------------------- números del día (3 como mucho) */
  function numsPrincipal(p) {
    if (!p) return [];
    var t = p.tipo;
    if (t === 'series') return [{ v: p.n + ' × ' + p.dist + ' m', l: 'series' }, { v: p.obj, l: 'objetivo' }, p.rec ? { v: p.rec, l: 'recuperación' } : null].filter(Boolean);
    if (t === 'km-partido') {
      var pr = (p.partes || []).filter(function (x) { return x.dist; }), pa = (p.partes || []).filter(function (x) { return x.pausa; })[0];
      var o = pr.map(function (x, i) { return { v: x.dist + ' en ' + x.obj, l: i === 0 ? 'primera parte' : (pa ? 'tras ' + pa.pausa : 'segunda parte') }; });
      o.push({ v: '× ' + (p.nColor || (typeof p.n === 'object' ? p.n.verde : p.n) || 1), l: 'kilómetro partido' });
      return o;
    }
    if (t === 'compuesta') return (p.partes || []).map(function (x) {
      return { v: ((x.n || 1) > 1 ? x.n + ' × ' : '') + x.dist + ' m', l: [x.obj, x.rec || p.rec ? 'rec. ' + (x.rec || p.rec) : ''].filter(Boolean).join(' · ') };
    });
    if (t === 'rodaje') return [{ v: p.min + ' min', l: 'rodaje' }].concat(techoNum());
    if (t === 'control1000') return [{ v: '≤ ' + p.obj, l: '1.000' }];
    return [];
  }
  function rs() { return (plan().ritmos || []).filter(function (r) { return r.clave === 'RS'; })[0] || {}; }
  function techoSalida() { var m = /techo (\d+)/.exec(rs().reglaDeSalida || ''); return m ? m[1] : null; }
  function techoNum() { var t = rs().techoFC, s = techoSalida(); return t ? [{ v: 'techo ' + t, l: s ? 'primeros 10 min a ' + s : 'ppm' }] : []; }
  function genTxt(tipo, color) { return ((wsem().generico || {})[tipo] || {})[color] || ''; }
  function minRodaje(dia, R) {
    if (R && R.principal && R.principal.tipo === 'rodaje' && R.principal.min) return +R.principal.min;
    var m = /rodaje (\d+) min/i.exec(dia.sesion || ''); return m ? +m[1] : null;
  }
  SES.numeros = function (dia, color, R) {
    color = color || 'verde'; R = R || SES.contexto(dia, color);
    var n = numerosBase(dia, color, R), cc = (R.conds || []).filter(function (c) { return c.tipo === 'calculo'; })[0];
    if (cc && cc.cifra !== null && cc.cifra !== undefined && n && n[0] && n[0].v === 'serie técnica') { n = n.slice(); n[0] = { v: 'serie técnica de ' + cc.cifra, l: n[0].l }; }
    return n;
  };
  function numerosBase(dia, color, R) {
    if (!dia || color === 'parada') return [];
    var N = dia.numeros, porColor = N && !Array.isArray(N) ? N : null, arr = Array.isArray(N) ? N : null, tpl = R.tpl, out;
    if (tpl === 'control' || dia.tipo === 'control' || dia.tipo === 'prueba') return arr || (porColor && (porColor[color] || porColor.verde)) || numsPrincipal(R.principal);
    if (color === 'verde') {
      if (tpl === 'fuerza' && R.opF) return numsFuerza(R.fuerza, R.opN);
      if (R.opN) return R.opN;
      if (R.cambio && R.principal) { out = numsPrincipal(R.principal); if (out.length) return out.slice(0, 3); }
      if (porColor && porColor.verde) return porColor.verde;
      if (arr) return arr;
      if (tpl === 'fuerza') return numsFuerza(R.fuerza);
      return numsPrincipal(R.principal).slice(0, 3);
    }
    if (porColor && porColor[color]) return porColor[color];
    if (tpl === 'series') {
      if (color === 'ambar') {
        var m = /(\d+-\d+ min) con techo (\d+)/.exec(genTxt('carrera', 'ambar'));
        out = numsPrincipal(R.principal).slice(0, 2);
        if (m) out.push({ v: m[1], l: 'techo ' + m[2] });
        return out;
      }
      var r = /(\d+-\d+ min) con techo (\d+)/.exec((dia.variantes || {}).rojo || genTxt('carrera', 'rojo'));
      return r ? [{ v: r[1], l: 'rodaje · techo ' + r[2] }] : [];
    }
    if (tpl === 'rodaje') {
      var mn = minRodaje(dia, R), r2 = /(\d+)-(\d+) min con techo (\d+)/.exec(genTxt('carrera', 'rojo'));
      if (color === 'rojo' && r2 && mn > +r2[2]) return [{ v: r2[1] + '-' + r2[2] + ' min', l: 'rodaje · techo ' + r2[3] }];
      return (porColor && porColor.verde) || arr || numsPrincipal(R.principal);
    }
    if (tpl === 'fuerza') {
      if (color === 'rojo') { var f = /A en (\d+ × \d+) con (el peso dominado)/.exec(genTxt('fuerza', 'rojo')); if (f) return [{ v: f[1], l: 'lastradas · ' + f[2].replace(/^el /, '') }]; }
      var A = R.fuerza && R.fuerza.bloques.A;
      if (A && color === 'ambar') { var ga = /con (el peso ya dominado)/.exec(genTxt('fuerza', 'ambar')); return [{ v: A.series + ' × ' + A.reps, l: 'lastradas' + (ga ? ' · ' + ga[1].replace(/^el /, '') : '') }]; }
      return numsFuerza(R.fuerza);
    }
    if (tpl === 'circuito') {
      if (color === 'rojo') return [];
      return arr || [];
    }
    return arr || [];
  }
  function numsFuerza(F, extra) {
    if (!F || !F.bloques.A) return extra || [];
    var A = F.bloques.A, pc = pesoCorto(A.peso), out = [{ v: A.series + ' × ' + A.reps, l: 'lastradas' }];
    if (pc) out.push({ v: pc, l: 'lastre' }); else if (extra && extra[0]) out.push(extra[0]);
    if (A.descanso) out.push({ v: A.descanso, l: 'descanso' });
    return out.slice(0, 3);
  }

  /* ---------------------------------------------------------------- «Hoy haces:» (literal del color) */
  SES.haces = function (dia, color, R) {
    color = color || 'verde'; R = R || SES.contexto(dia, color);
    var v = dia.variantes || {}, ws = wsem(), ses = sinHora(dia.sesion), p = [];
    if (color === 'parada') return (ws.cuello || {}).debajo || '';
    if (R.tpl === 'control' || /^(control|prueba|examen|descanso)$/.test(dia.tipo || '')) return ses;
    var extras = ws.extras || [];
    if (color === 'verde') {
      if (String(tituloDe(dia)).toLowerCase() !== ses.trim().toLowerCase()) p.push(ses);
      p.push(v.verde && v.verde.length > 20 ? v.verde : (v.base || dia.objetivo));
    } else if (color === 'ambar') {
      if (v.ambar) {
        var va = String(v.ambar).replace(/^\([^)]*\)\s*/, ''), rc0 = recorte(dia);
        if (/^×/.test(va) && rc0 && / × \d+$/.test(rc0.de)) va = rc0.de.replace(/ × \d+$/, '') + ' ' + va;
        p.push(va);
      }
      else if (R.tpl === 'rodaje') { p.push(ses); p.push(extras[2]); }
      else if (genTxt(dia.tipo, 'ambar')) { p.push(genTxt(dia.tipo, 'ambar')); var rc = recorte(dia); if (rc && R.tpl === 'series') p.push(rc.de + ' → ' + rc.a); }
      else p.push(ses);
    } else if (color === 'rojo') {
      var mn = minRodaje(dia, R);
      if (v.rojo) p.push(v.rojo);
      else if (R.tpl === 'rodaje' && !(mn > 40)) p.push(ses);
      else if (genTxt(dia.tipo, 'rojo')) p.push(genTxt(dia.tipo, 'rojo'));
      else p.push(ses);
      if (dia.extra && dia.extra.calidad && extras[1]) p.push(extras[1]);
    }
    if (v.comun) p.push(v.comun);
    return unico(p.map(function (x) { return String(x || '').trim(); })).join(' · ');
  };

  /* ---------------------------------------------------------------- secuencia de repeticiones (tarjeta y modo pista) */
  SES.secuencia = function (p, color) {
    var out = [];
    if (!p) return out;
    function rep(dist, obj, rec, extra) { var r = mezclar({ dist: dist, obj: obj, rec: rec }, extra || {}); var rg = rangoT(obj); if (rg) { r.lo = rg.lo; r.hi = rg.hi; } out.push(r); }
    if (p.tipo === 'series') {
      for (var i = 0; i < (+p.n || 1); i++) rep(p.dist, p.obj, p.rec, { criterio: p.criterio || null });
    } else if (p.tipo === 'km-partido') {
      var n = p.nColor || (typeof p.n === 'object' ? (p.n[color] || p.n.verde) : p.n) || 1;
      var partes = p.partes || [];
      for (var k = 0; k < n; k++) {
        partes.forEach(function (pt, j) {
          if (!pt.dist) return;
          var sig = partes[j + 1], pausa = sig && sig.pausa ? sig.pausa : null;
          rep(pt.dist, pt.obj, pausa || p.rec, { pausa: !!pausa, km: k + 1, kmN: n });
        });
      }
    } else if (p.tipo === 'compuesta') {
      (p.partes || []).forEach(function (pt) {
        for (var i2 = 0; i2 < (+pt.n || 1); i2++) rep(pt.dist, pt.obj, pt.rec || p.rec, { primer200: pt.primer200 || null });
      });
    }
    out.forEach(function (r, i) { r.k = i + 1; r.n = out.length; if (i === out.length - 1) r.rec = null; });
    return out;
  };

  /* ---------------------------------------------------------------- pasos (§5.1, composición de H-1) */
  function ejId(nombre) {
    var w = function (t) { return String(t || '').toLowerCase().replace(/[+]/g, ' ').split(/\s+/).filter(function (x) { return x && x !== 'o' && x !== 'y' && x !== 'de' && x !== 'con'; }); };
    var a = w(nombre), mejor = null, pm = 0;
    (plan().ejercicios || []).forEach(function (e) {
      var b = w(e.nombre), n = 0; while (n < a.length && n < b.length && a[n] === b[n]) n++;
      if (n > pm) { pm = n; mejor = e.id; }
    });
    return mejor;
  }
  var TXT_ENL = { '#tecnica/dominada': 'Técnica de la dominada →', '#tecnica/mil': 'Reparto del 1.000 →', '#tecnica/circuito': 'Técnica del circuito →' };
  function tecnica(href, txt) { return { href: href, txt: txt || TXT_ENL[href] || 'Técnica →' }; }
  SES.pasos = function (dia, color, opcion) {
    color = color || 'verde';
    var R = opcion && opcion.tpl ? opcion : SES.contexto(dia, color);
    if (!dia || color === 'parada') return [];
    var ex = dia.extra || {};
    if (ex.pasos && R.tpl !== 'rodaje') return ex.pasos.map(function (x) {
      return { t: x.t, d: x.d || '', timer: x.timer ? segDe(x.timer) : null, enlace: x.enlace ? tecnica(x.enlace) : null };
    });
    if (R.tpl === 'series') return pasosSeries(dia, color, R);
    if (R.tpl === 'rodaje') return pasosRodaje(dia, color, R);
    if (R.tpl === 'fuerza') return pasosFuerza(dia, color, R);
    if (R.tpl === 'circuito') return pasosCircuito(dia, color, R);
    if (dia.tipo === 'prueba' && dia.sesion) return [{ t: sinHora(dia.sesion) }];
    return [];
  };
  function calentamiento(dia) {
    var ce = (plan().sesionesTipo || {}).calentamientoEstandar || {};
    var conDom = /dominadas/i.test(dia.sesion || '');
    var dom = /(\d+ × \d+) dominadas/.exec(dia.sesion || '');
    var pasos = (ce.pasos || []).map(function (t, i) {
      if (i === 2 && !conDom) return null;
      var txt = String(t).replace(/\s*\(Antes decía[^)]*\)\.?/, '').trim();
      var o = { t: txt, timer: /^Pausa/.test(txt) || i === 2 ? segDe(txt) : null };
      if (i === 2) { o.d = ce.obligatorio || ''; o.enlace = tecnica('#tecnica/dominada', 'Técnica de la dominada →'); if (dom) o.tags = [dom[1] + ' dominadas']; }
      return o;
    }).filter(Boolean);
    return { grupo: true, t: 'Calentamiento estándar', meta: (conDom ? ce.duracionConDominadasMin : ce.duracionMin) + ' min', pasos: pasos };
  }
  function vueltaCalma() { var vc = (plan().sesionesTipo || {}).vueltaALaCalma || {}; return { t: 'Vuelta a la calma' + (vc.duracionMin ? ' · ' + vc.duracionMin + ' min' : ''), d: vc.detalle || '' }; }
  function pasosSeries(dia, color, R) {
    if (color === 'rojo') return [{ t: mayus((dia.variantes || {}).rojo || genTxt('carrera', 'rojo')) }];
    var out = [calentamiento(dia)], seq = SES.secuencia(R.principal, color);
    seq.forEach(function (r) {
      var d = r.km ? 'Kilómetro partido ' + r.km + ' de ' + r.kmN : 'Repetición ' + r.k + ' de ' + r.n;
      out.push({ t: r.dist + ' m · ' + r.obj, d: d + (r.rec ? (r.pausa ? ' · pausa ' : ' · recuperación ') + r.rec : ''), timer: r.rec ? segDe(r.rec) : null, rep: true });
    });
    if (color === 'ambar') { var m = /(\d+-\d+ min con techo \d+)/.exec(genTxt('carrera', 'ambar')); if (m) out.push({ t: mayus(m[1]) }); }
    out.push(vueltaCalma());
    return out;
  }
  /* barra del sábado paso a paso (web.dias[f].pasos): numerados, descansos aparte con temporizador;
     «si» = id de la opción de la condición del día que hace falta para ese paso; «tN» lleva {n} = cifra del cálculo */
  function pasosBarra(bp, R) {
    var c = (R.conds || []).filter(function (x) { return x.tipo !== 'prueba'; })[0] || null;
    var elegida = c && c.elegida ? c.elegida.id : null;
    var cifra = c && c.tipo === 'calculo' && c.cifra !== null && c.cifra !== undefined ? c.cifra : null;
    var k = 0, out = [];
    bp.forEach(function (x) {
      if (x.si && elegida && elegida !== 'ninguna' && elegida !== x.si) return;
      var t = x.tN && cifra !== null ? x.tN.replace('{n}', cifra) : x.t;
      var o = { t: x.antes ? t : 'Barra ' + (++k) + ' · ' + t, d: x.d || '', timer: x.timer ? segDe(x.timer) : null, enlace: x.enlace ? tecnica(x.enlace) : null, barra: true };
      if (x.tag && !(elegida && elegida === x.si)) o.tags = [x.tag];
      out.push(o);
    });
    return out;
  }
  function pasosRodaje(dia, color, R) {
    var out = [], sab = PC.fecha(dia.fecha).getDay() === 6;
    var mb = /Sesión corta de barra[^+]*/.exec(dia.sesion || '');
    var bp = (dia.extra || {}).pasos;
    if (mb && Array.isArray(bp) && bp.length) out = out.concat(pasosBarra(bp, R));
    else if (mb) {
      var ob = /^(Barra:.*?)(?:\s*Rodaje:|$)/.exec(dia.objetivo || '');
      var cs = ((plan().protocoloDominadas || {}).cuando || []).filter(function (c) { return /^Sáb/.test(c.dia); })[0] || {};
      out.push({ t: mb[0].trim(), d: ob ? ob[1].trim() : (cs.prescripcion || ''), enlace: tecnica('#tecnica/dominada', 'Técnica de la dominada →') });
    }
    var mn = minRodaje(dia, R), r2 = /(\d+)-(\d+) min con techo (\d+)/.exec(genTxt('carrera', 'rojo'));
    if (color === 'rojo' && r2 && mn > +r2[2]) out.push({ t: mayus(genTxt('carrera', 'rojo')) });
    else if (mn) out.push({ t: 'Rodaje ' + mn + ' min · techo ' + (rs().techoFC || ''), d: frases(rs().reglaDeSalida)[0] || '' });
    var pg = /(\d+) progresivos de (\d+) m/.exec(dia.sesion || '');
    if (pg && color !== 'rojo') {
      var pr = (plan().ejercicios || []).filter(function (e) { return e.id === 'progresivos'; })[0];
      out.push({ t: pg[0], d: pr ? frase((pr.tecnica || [])[4], 'programar') : '', enlace: pr ? tecnica('#tecnica/carrera') : null });
    }
    if (sab && color !== 'rojo' && /gemelo|talón/i.test(dia.sesion || '')) {
      (((plan().sesionesTipo || {}).sabadoComplemento || {}).bloques || []).forEach(function (b) {
        var id = ejId(b.ejercicio);
        out.push({ t: b.ejercicio + ' · ' + b.series + ' × ' + b.reps, d: b.para || '', enlace: id ? tecnica('#tecnica/ej/' + id) : null });
      });
    }
    return out;
  }
  function pasosFuerza(dia, color, R) {
    var F = R.fuerza, mf = F.mf, out = [];
    if (mf.calentamiento) out.push({ t: 'Calentamiento', d: mf.calentamiento });
    if (mf.aproximacion && F.bloques.A) out.push({ t: 'Aproximación', d: mf.aproximacion });
    F.grupos.forEach(function (g) {
      var tit = g.claves.join(' + ') + ' · ' + g.bloques.map(function (b) { return b.ejercicio; }).join(' + ');
      var tags = g.bloques.map(function (b) {
        var ronda = /^[HI]$/.test(b.clave);
        return (g.claves.length > 1 ? b.clave + ' ' : '') + (ronda ? b.series + ' rondas' : b.series + ' × ' + b.reps) + (b.peso && !/peso corporal|banda/.test(b.peso) ? ' · ' + (pesoCorto(b.peso) || b.peso) : '');
      });
      var d = g.bloques.map(function (b) { return b.detalle ? [].concat(b.detalle).join(' · ') : (b.clave === 'A' ? b.tecnica : ''); }).filter(Boolean).join(' · ');
      var id = ejId(g.bloques[0].ejercicio);
      out.push({ t: tit, d: d, tags: tags, timer: g.descanso, enlace: tecnica(id && g.claves[0] !== 'H' ? '#tecnica/ej/' + id : '#tecnica/gimnasio'), bloque: g.claves.join('+') });
    });
    return out;
  }
  function pasosCircuito(dia, color, R) {
    var jc = (plan().sesionesTipo || {}).juevesCircuito || {}, out = [];
    var mi = /(UN intento|\d+ intentos)[^,.(:]*/.exec(dia.sesion || '');
    (jc.bloques || []).forEach(function (b, i) {
      if (/técnico/i.test(b.ejercicio)) {
        if (color === 'rojo' || R.tec === false || /sin bloque técnico/i.test(dia.objetivo || '')) return;
        if (R.tec !== true && dia.condicion) return;
        out.push({ t: b.ejercicio, d: b.detalle || '' });
        return;
      }
      if (/intento/i.test(b.ejercicio)) {
        if (color === 'rojo') { out.push({ t: mayus(genTxt('circuito', 'rojo')) }); return; }
        out.push({ t: mi ? mi[0].trim() : b.ejercicio, d: b.detalle || '', timer: segDe(b.descanso), registro: true, enlace: tecnica('#tecnica/circuito') });
        return;
      }
      out.push({ t: b.ejercicio + (b.duracionMin ? ' · ' + b.duracionMin + ' min' : '') });
    });
    return out;
  }

  /* ---------------------------------------------------------------- «Configura el reloj» (también Técnica › Reloj) */
  function avisoBloque(dia) {
    var r = (plan().ritmos || []).filter(function (x) { return x.clave === (dia.bloque || PC.cal.bloque(dia.fecha || '')); })[0] || {};
    var m = /rango de ritmo ([\d:]+-[\d:]+) \/km/.exec(r.avisoReloj || ''); return m ? m[1] : null;
  }
  SES.reloj = function (dia) {
    if (!dia) return [];
    var R = SES.contexto(dia, 'verde'), p = R.principal, L = [], tpl = R.tpl;
    var medir = (der().recortados || {})['plan.reglas[medir-distancias].texto'] || reglaTxt('medir-distancias');
    if (tpl === 'control') {
      L.push(medir);
      frases(dia.protocolo).forEach(function (f) { if (/botón de vuelta|Primer 200 por reloj|Aviso de ritmo|calibración/i.test(f)) L.push(f); });
      return L;
    }
    if (tpl === 'series') {
      L.push(medir);
      var av = (p && p.aviso) || avisoBloque(dia);
      if (av) L.push('Rango de ritmo ' + av + ' /km en cada paso de series');
      var b = PC.cal.bloqueInfo(dia.bloque || PC.cal.bloque(dia.fecha || '')) || {};
      var d0 = p ? (p.dist || (p.partes && p.partes[0] && p.partes[0].dist) || 0) : 0;
      var p2 = (p && (p.primer200 || (p.partes && p.partes[0] && p.partes[0].primer200))) || (d0 >= 400 ? b.primer200 : null);
      if (p2) L.push('Primer 200 por reloj: ' + p2);
      var fr = (p && p.freno) || (/freno si (?:un 400 )?baja de (\d:\d{2})/.exec(dia.objetivo || '') || [])[1];
      if (fr) L.push('Freno: si un 400 baja de ' + fr + ', la siguiente sale más lenta');
      var i = String(dia.lugar || '').search(/perfil/i);
      if (i >= 0) L.push(mayus(dia.lugar.slice(i)));
      return L;
    }
    if (tpl === 'rodaje') {
      var t = rs().techoFC, s = techoSalida();
      if (t) L.push('Alerta de FC máxima ' + t + ' ppm' + (s ? '; los diez primeros minutos, ' + s : ''));
      L.push('Sin alerta de ritmo en rodajes');
      if (/progresivos/i.test(dia.sesion || '')) {
        var pr = (plan().ejercicios || []).filter(function (e) { return e.id === 'progresivos'; })[0];
        var f = pr ? frase((pr.tecnica || [])[4], 'programar') : '';
        if (f) L.push(mayus(f));
      }
      return L;
    }
    if (tpl === 'fuerza') { var g = (web().textos || {}).S10garmin; if (g) L.push(g); return L; }
    return L;
  };

  /* ================================================================ G11 · camino a Cádiz */
  PC.graf = PC.graf || {};
  function limitesPlan() {
    var cal = plan().calendario || [], v = der().ventanaPrueba || ((PC.cal.final() || {}).ventana) || null;
    var ini = cal.length && cal[0].semana ? String(cal[0].semana).split('/')[0] : null;
    return { ini: ini, fin: v ? v.hasta : null, desde: v ? v.desde : null };
  }
  var nCamino = 0;
  PC.graf.camino = function (host) {
    if (!host) return;
    var L = limitesPlan(), hoy = PC.hoyIso();
    if (!L.ini || !L.fin || hoy > L.fin) { host.hidden = true; host.innerHTML = ''; return; }
    host.hidden = false;
    var w = Math.floor(host.clientWidth || (host.parentNode && host.parentNode.clientWidth) || 320), h = 56, y = 40;
    var faltan = PC.dias(hoy, L.desde);
    var flagTxt = hoy < L.desde ? 'Cádiz · ≥ ' + faltan + (faltan === 1 ? ' día' : ' días') : 'Cádiz · semana de la prueba';
    var flagW = Math.ceil(flagTxt.length * 6.6) + 16;
    var id = 'hoy-cm-' + (++nCamino);
    var x0 = 6, x1 = w - flagW - 4, total = PC.dias(L.ini, L.fin) || 1;
    function fx(iso) { return x0 + Math.max(0, Math.min(total, PC.dias(L.ini, iso))) / total * (x1 - x0); }
    var paso = (x1 - x0) / total, s = [];
    s.push('<defs><pattern id="' + id + '-r" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" style="fill:var(--warn-soft)"/><rect width="2.5" height="6" style="fill:var(--warn)"/></pattern></defs>');
    s.push('<line x1="' + x0 + '" x2="' + x1 + '" y1="' + y + '" y2="' + y + '" style="stroke:var(--border-strong);stroke-width:2;stroke-linecap:round"/>');
    var colB = { A: 'var(--p2)', B: 'var(--p3)', C: 'var(--p5)' };
    (der().bloques || []).forEach(function (b) {
      var a = fx(b.desde), z = Math.min(x1, fx(b.hasta) + paso);
      s.push('<rect x="' + a.toFixed(1) + '" y="' + (y - 2.5) + '" width="' + Math.max(2, z - a - 1).toFixed(1) + '" height="5" rx="2.5" style="fill:' + (colB[b.clave] || 'var(--p3)') + '"/>');
      s.push('<text class="hoy-cm-b" x="' + ((a + z) / 2).toFixed(1) + '" y="' + (y + 15) + '" text-anchor="middle">' + esc(b.clave) + '</text>');
    });
    if (L.desde) {
      var va = fx(L.desde), vz = Math.min(x1, fx(L.fin) + paso);
      s.push('<rect x="' + va.toFixed(1) + '" y="' + (y - 6) + '" width="' + Math.max(3, vz - va).toFixed(1) + '" height="12" rx="2" style="fill:url(#' + id + '-r)"/>');
    }
    var etiquetas = w >= 600, ultimo = -1e9;
    PC.cal.hitos().forEach(function (hi) {
      if (hi.hasta) return;
      var x = fx(hi.fecha);
      s.push('<circle cx="' + x.toFixed(1) + '" cy="' + y + '" r="4" style="fill:var(--s2);stroke:var(--surface);stroke-width:1.5' + (hi.fecha < hoy ? ';opacity:.45' : '') + '"/>');
      if (etiquetas && hi.fecha > hoy && hi.etiqueta) {
        var t = String(hi.etiqueta).split(' · ')[0], tw = t.length * 6.4;
        if (x - tw / 2 > ultimo + 8 && x + tw / 2 < x1) { s.push('<text x="' + x.toFixed(1) + '" y="12" text-anchor="middle">' + esc(t) + '</text>'); ultimo = x + tw / 2; }
      }
    });
    var xa = fx(hoy < L.ini ? L.ini : hoy);
    if (PC.ill && PC.ill.corredor) s.push(PC.ill.corredor('corre', { h: 24, ancla: 'pie', x: xa, y: y - 1 }));
    else s.push('<circle cx="' + xa.toFixed(1) + '" cy="' + (y - 10) + '" r="6" style="fill:var(--primary)"/>');
    s.push('<g class="hoy-cm-flag"><title>fecha sin confirmar: ' + esc(((plan().objetivo || {}).pruebasFisicas || {}).fecha || '') + '</title>' +
      '<line x1="' + x1 + '" x2="' + x1 + '" y1="10" y2="' + (y + 2) + '" style="stroke:var(--text-2);stroke-width:1.5"/>' +
      '<rect x="' + x1 + '" y="10" width="' + flagW + '" height="22" rx="3" style="fill:var(--text)"/>' +
      '<text x="' + (x1 + 8) + '" y="25" style="fill:var(--surface)">' + esc(flagTxt) + '</text></g>');
    var bl = PC.cal.bloque(hoy);
    var lab = 'Camino a Cádiz del ' + PC.fmt.dia(L.ini, 'dm') + ' al ' + PC.fmt.dia(L.fin, 'dm') + ': hoy ' + PC.fmt.dia(hoy, 'dm') +
      (bl ? ', bloque ' + bl : '') + '; ' + flagTxt + ' (fecha sin confirmar). Abre el calendario.';
    host.innerHTML = '<a href="#plan/calendario" aria-label="' + esc(lab) + '"><svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true">' + s.join('') + '</svg></a>';
    var tx = host.querySelector('.hoy-cm-flag text');
    try {
      var real = tx && tx.getComputedTextLength ? tx.getComputedTextLength() : 0;
      if (real && Math.abs(real + 16 - flagW) > 2 && !host.__ajuste) { host.__ajuste = true; flagW = Math.ceil(real) + 16; host.__flagW = flagW; PC.graf.camino(host); host.__ajuste = false; return; }
    } catch (e) {}
  };

  /* ================================================================ piezas de la tarjeta */
  var UI = { sel: null, lunes: null, abierto: {}, opc: {}, mas: {}, root: null, timer: null, aplicado: false };
  function relDe(fecha) { var h = PC.hoyIso(); return fecha === h ? 'hoy' : (fecha < h ? 'pasado' : 'futuro'); }
  function tituloDe(dia) {
    if (!dia) return '';
    if (dia.tipo === 'descanso') return 'Descanso';
    if (dia.titulo) return dia.titulo;
    if (dia.sesion) { var t = sinHora(dia.sesion).split(/[:(+·]/)[0].trim(); return mayus(t.toLowerCase()); }
    if (dia.final || dia.semanaTitulo) return (PC.cal.final() || {}).titulo || dia.semanaTitulo || '';
    return '';
  }
  function lugarCorto(dia) {
    if (/^Arsenal\b/.test(dia.sesion || '')) return 'Arsenal';
    if (dia.tipo === 'circuito') return ((plan().sesionesTipo || {}).juevesCircuito || {}).lugar || null;
    var l = dia.lugar; if (!l || / si /.test(l)) return null;
    return l.split(',')[0].trim();
  }
  function horaTxt(dia) {
    var ini = PC.cal.horaIni(dia); if (ini === null) return null;
    var rango = dia.hora && /^\s*\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}/.test(dia.hora);
    return rango ? hm(ini) + '–' + hm(PC.cal.horaFin(dia)) : hm(ini);
  }
  function tipoTxt(t) { return { carrera: 'carrera', fuerza: 'fuerza', circuito: 'circuito', descanso: 'descanso', control: 'control', examen: 'examen', prueba: 'prueba' }[t] || ''; }
  function ses(fecha) { return st().get('ses-' + fecha, {}) || {}; }
  function guardarSes(fecha, cambio) { var o = ses(fecha); Object.keys(cambio).forEach(function (k) { o[k] = cambio[k]; }); o.t = Date.now(); st().set('ses-' + fecha, o); return o; }
  function chipCab(dia, rel, sal) {
    if (rel === 'futuro') return '<span class="chip">futuro</span>';
    if (rel === 'pasado') {
      var e = PC.cal.estado(dia);
      var m = { hecho: ['ok', 'hecho'], nomide: ['warn', 'no mide'], miss: ['bad', 'no hecho'], noreg: ['', 'sin registrar'], rest: ['', 'descanso'] }[e];
      return m ? '<span class="chip ' + m[0] + '">' + m[1] + '</span>' : '';
    }
    if (dia.tipo === 'descanso' || dia.tipo === 'examen') return sal && sal.color ? '<span class="chip ' + CCOLOR[sal.color] + '">' + NCOLOR[sal.color] + '</span>' : '';
    if (!sal || !sal.color) return '<span class="chip sup">semáforo sin rellenar</span>';
    return '<span class="chip ' + CCOLOR[sal.color] + '">' + NCOLOR[sal.color] + '</span>';
  }
  function consecuencia(dia, sal) {
    if (!sal || !sal.color) return '';
    if (dia.tipo === 'descanso' || dia.tipo === 'examen') return 'Hoy es descanso';
    if (sal.color === 'parada') return 'No se entrena: regla del cuello';
    if (dia.semaforo) return dia.semaforo;
    return sal.color === 'verde' ? 'Sesión como está escrita. Es la única que mide.' : 'Solo la versión verde mide.';
  }
  function diaConBarra(dia) { return dia.tipo === 'fuerza' || /dominadas|barra/i.test(dia.sesion || ''); }
  function diaConCintillo(dia) { return /^(carrera|control|circuito|prueba)$/.test(dia.tipo || ''); }
  function resumenOpc(g) {
    g = g || {};
    var p = [];
    p.push(g.reloj === 'vfc' ? 'VFC de 7 días desequilibrada o baja' : g.reloj === 'sobrecarga' ? 'Sobrecarga' : 'Reloj normal');
    p.push(g.sintomas === 'encima' ? 'síntomas por encima del cuello' : g.sintomas === 'debajo' ? 'síntomas por debajo del cuello' : 'sin síntomas');
    var d = [];
    if (+g.codo) d.push('codo u hombro ' + g.codo + '/10');
    if (g.talon === 'duele') d.push('talón');
    if (g.cintillo === 'noto') d.push('cintillo: lo noto'); else if (g.cintillo === 'molesta') d.push('cintillo: molesta al correr');
    if (+g.agujetas) d.push('agujetas ' + g.agujetas + '/10');
    p.push(d.length ? d.join(' · ') : 'sin dolor');
    return p.join(' · ');
  }
  function segHTML(campo, valor, ops, etq) {
    return '<div class="seg" role="group" aria-label="' + esc(etq) + '">' + ops.map(function (o) {
      return '<button type="button" data-s="' + campo + '" data-v="' + o[0] + '" aria-pressed="' + (valor === o[0] ? 'true' : 'false') + '">' + esc(o[1]) + '</button>';
    }).join('') + '</div>';
  }
  function stepperHTML(campo, valor, etq) {
    return '<div class="stepper" role="group" aria-label="' + esc(etq) + '"><button type="button" data-st="' + campo + '" data-d="-1" aria-label="Menos">−</button><output class="num">' + (valor || 0) + '</output><button type="button" data-st="' + campo + '" data-d="1" aria-label="Más">+</button></div>';
  }
  function htmlSem(dia) {
    var f = dia.fecha, g = SEM.leer(f), sal = SEM.salida(f), desc = dia.tipo === 'descanso' || dia.tipo === 'examen';
    var abierto = UI.abierto[f] || (!sal && !desc), opc = UI.opc[f];
    var h = [];
    if (!abierto && !sal) {
      return '<div class="hoy-sem cerrado"><div class="hoy-sem-l"><span>Hoy es descanso</span><button type="button" class="btn ghost" data-a="anotar">Anotar la noche (opcional)</button></div></div>';
    }
    if (!abierto) {
      var lamp = LAMP[sal.color] || (sal.color === 'parada' ? 'r' : 'g');
      h.push('<div class="hoy-sem cerrado"><div class="hoy-sem-l"><div class="hoy-sem-c"><i class="lamp ' + lamp + '" aria-hidden="true"></i><div><b>' + NCOLOR[sal.color] +
        (sal.min !== null && sal.min !== undefined ? ' · ' + PC.fmt.sueno(sal.min) : '') + '</b><span>' + esc(consecuencia(dia, sal)) + '</span></div></div>' +
        '<button type="button" class="btn ghost" data-a="cambiar" aria-expanded="false">Cambiar</button></div>');
    } else {
      var ban = g ? g.banda : null;
      h.push('<div class="hoy-sem"><p class="hoy-sem-q" id="hoy-sem-q-' + f + '">¿Cómo has dormido? (Garmin, sin la siesta)</p>' +
        '<div class="lamps" role="radiogroup" aria-labelledby="hoy-sem-q-' + f + '" data-qa-clave="lamparas">' +
        [['verde', 'g', 'Verde', '6h30 o más'], ['ambar', 'a', 'Ámbar', '5h00–6h29'], ['rojo', 'r', 'Rojo', 'menos de 5h00']].map(function (l) {
          return '<button type="button" role="radio" aria-checked="' + (ban === l[0] ? 'true' : 'false') + '" data-a="lamp" data-banda="' + l[0] + '"><i class="lamp ' + l[1] + '"></i><b>' + l[2] + '</b><small>' + l[3] + '</small></button>';
        }).join('') + '</div>' +
        '<div class="hoy-sem-l"><span>' + esc(resumenOpc(g)) + '</span><button type="button" class="btn ghost" data-a="opc" aria-expanded="' + (opc ? 'true' : 'false') + '">Cambiar</button></div>');
      if (opc) h.push(htmlOpciones(dia, g || {}));
    }
    if (sal && sal.color && sal.banda === 'rojo' && (!g || g.ayerRojo === null || g.ayerRojo === undefined) && SEM.ayerRojo(f) === null) {
      h.push('<div class="hoy-ayer"><p>¿Anoche también por debajo de 5h00?</p>' + segHTML('ayer', null, [['no', 'No'], ['si', 'Sí']], '¿Anoche también por debajo de 5h00?') + '</div>');
    }
    if (sal && sal.color && !abierto) {
      var li = [];
      sal.motivos.forEach(function (m) { li.push('<li class="bad">' + esc(m) + '</li>'); });
      sal.avisos.forEach(function (a) { li.push('<li class="' + (a.tono === 'info' ? '' : a.tono) + '">' + esc(a.txt) + '</li>'); });
      var rr = SEM.rachaSemana(f);
      if (rr && rr.salta) li.push('<li class="warn">' + esc(rr.texto) + ' (' + rr.seguro + ' noches seguro' + (rr.dudosas ? '; ' + rr.dudosas + ' ámbar sin minutos' : '') + ')</li>');
      if (li.length) h.push('<ul class="hoy-sem-av">' + li.join('') + '<li><a href="#plan/reglas">Reglas del semáforo →</a></li></ul>');
    }
    h.push('</div>');
    return h.join('');
  }
  function htmlOpciones(dia, g) {
    var o = [], min = g.min !== null && g.min !== undefined ? +g.min : null;
    o.push('<div class="hoy-opt">');
    o.push('<div><label for="hoy-min-' + dia.fecha + '">Horas exactas: <output class="num">' + (min !== null ? PC.fmt.sueno(min) : 'sin fijar') + '</output></label>' +
      '<input type="range" class="rango sueno" id="hoy-min-' + dia.fecha + '" data-s="min" min="180" max="600" step="5" value="' + (min !== null ? min : 390) + '" aria-valuetext="' +
      (min !== null ? esc(PC.fmt.sueno(min).replace('h', ' horas ') + ' minutos, ' + NCOLOR[SEM.bandaDeMin(min)].toLowerCase()) : 'sin fijar') + '"></div>');
    o.push('<div><span class="hoy-opt-t">Reloj</span>' + segHTML('reloj', g.reloj || 'normal', [['normal', 'Normal'], ['vfc', 'VFC de 7 días desequilibrada o baja'], ['sobrecarga', 'Sobrecarga']], 'Reloj') + '</div>');
    o.push('<div><span class="hoy-opt-t">Síntomas</span>' + segHTML('sintomas', g.sintomas || 'ninguno', [['ninguno', 'Ninguno'], ['encima', 'Encima del cuello'], ['debajo', 'Debajo del cuello']], 'Síntomas') + '</div>');
    if (diaConBarra(dia)) o.push('<div><span class="hoy-opt-t">Codo u hombro, el que más duela (0–10)</span>' + stepperHTML('codo', g.codo, 'Codo u hombro, de 0 a 10') + '</div>');
    o.push('<div><span class="hoy-opt-t">Talón al dar los primeros pasos</span>' + segHTML('talon', g.talon || 'nada', [['nada', 'Nada'], ['duele', 'Duele']], 'Talón') + '</div>');
    if (diaConCintillo(dia)) o.push('<div><span class="hoy-opt-t">Cintillo (rodilla izquierda)</span>' + segHTML('cintillo', g.cintillo || 'nada', [['nada', 'Nada'], ['noto', 'Lo noto'], ['molesta', 'Molesta al correr']], 'Cintillo') + '</div>');
    if (/agujetas/i.test(dia.objetivo || '')) o.push('<div><span class="hoy-opt-t">Agujetas (0–10)</span>' + stepperHTML('agujetas', g.agujetas, 'Agujetas, de 0 a 10') + '</div>');
    o.push('</div>');
    return o.join('');
  }
  function htmlConds(dia, R) {
    return R.conds.map(function (c, i) {
      var h = ['<div class="hoy-cond" data-ci="' + i + '"><p class="hoy-cond-q">' + esc(c.pregunta || '') + '</p>'];
      if (c.tipo === 'calculo') {
        h.push('<p class="hoy-cond-r">' + (c.cifra !== null && c.cifra !== undefined ?
          'Serie técnica de <span class="hoy-cifra">' + c.cifra + '</span> <small>' + esc(c.calculo.desde || '') + '</small>' :
          'falta el número de válidas del ' + ((/(\d{4})-(\d{2})-(\d{2})$/.exec(c.calculo.de || '') || []).slice(2).reverse().join('-') || '') + ' (<a href="#tecnica/dominada">cuéntalas en Técnica →</a>)') + '</p>');
      }
      var ops = (c.opciones || []).concat([NINGUNA]);
      var elegida = c.elegida ? c.elegida.id : null;
      var corto = ops.every(function (o) { return String(o.txt).length <= 18; });
      if (corto) h.push('<div class="seg" role="group" aria-label="' + esc(c.pregunta || 'Condición') + '">' + ops.map(function (o) {
        return '<button type="button" data-a="cond" data-ci="' + i + '" data-v="' + esc(o.id) + '" aria-pressed="' + (elegida === o.id ? 'true' : 'false') + '">' + esc(o.txt) + '</button>';
      }).join('') + '</div>');
      else h.push('<div class="hoy-opc" role="group" aria-label="' + esc(c.pregunta || 'Condición') + '">' + ops.map(function (o) {
        return '<button type="button" data-a="cond" data-ci="' + i + '" data-v="' + esc(o.id) + '" aria-pressed="' + (elegida === o.id ? 'true' : 'false') + '">' + esc(o.txt) + '</button>';
      }).join('') + '</div>');
      if (c.tipo === 'prueba' && c.elegida && c.elegida.nombre) h.push('<p class="hoy-cond-r">' + esc(c.elegida.nombre) + '</p>');
      if (c.tipo === 'prueba') h.push('<p class="hoy-cond-r">' + (c.opciones || []).map(function (o) { return esc(o.txt) + ': ' + esc(o.nombre || ''); }).join(' · ') + '</p>');
      if (elegida === 'ninguna') h.push('<p class="hoy-cond-r"><b>El plan no lo fija: pregúntale al entrenador</b></p>');
      if (c.tipo === 'compartida' && c.desde) h.push('<p class="hoy-cond-r">' + esc(c.desde) + '</p>');
      if (c.comun) h.push('<p class="hoy-cond-r">' + esc(c.comun) + '</p>');
      if (c.auto && c.auto.de) h.push('<small>rellenado con lo que apuntaste el ' + esc(PC.fmt.dia(c.auto.de, 'dm')) + '</small>');
      if (c.tipo === 'compartida') { var ay = ayuda10(); if (ay) h.push('<small>' + esc(ay) + '</small>'); }
      h.push('</div>');
      return h.join('');
    }).join('');
  }
  /* ayuda del bloque C: lo apuntado el 10-10 en este móvil (no decide por ti) */
  function ayuda10() {
    var d = ((web().decide || []).filter(function (x) { return (x.barras || []).some(function (b) { return b.prueba === 'mil'; }); })[0] || {}).fecha;
    if (!d) return null;
    var o = ses(d), fue = o.fue || {}, t = o.mil || fue.mil;
    if (!t) return null;
    var par = (o.parciales || fue.parciales || []).filter(function (x) { return x !== null && x !== '' && x !== undefined; });
    return 'Tu ' + PC.fmt.dia(d, 'dm') + ' aquí: ' + PC.fmt.t(t, t % 1 ? 1 : 0) + (par.length >= 4 ? ' · tramos ' + PC.fmt.num(par[2]) + ' y ' + PC.fmt.num(par[3]) : '');
  }
  function htmlStats(nums) {
    if (!nums || !nums.length) return '';
    var largo = nums.slice(0, 3).some(function (n) { return String(n.v).length > 8; });
    return '<div class="stats" data-qa-clave="numeros">' + nums.slice(0, 3).map(function (n) {
      return '<div class="stat' + (largo ? ' largo' : '') + '"><b>' + esc(n.v) + '</b><span>' + esc(n.l || '') + '</span></div>';
    }).join('') + '</div>';
  }
  function chipsSesion(dia, R) {
    var p = R.principal, c = [];
    if (R.tpl === 'series' && p && R.color !== 'rojo') {
      var b = PC.cal.bloqueInfo(dia.bloque || '') || {};
      var d0 = p.dist || (p.partes && p.partes[0] && p.partes[0].dist) || 0;
      var p2 = p.primer200 || (p.partes && p.partes[0] && p.partes[0].primer200) || (d0 >= 400 ? b.primer200 : null);
      if (p2) c.push('primer 200 en ' + p2);
      if (p.freno) c.push('freno ' + p.freno);
      if (p.aviso) c.push('aviso ' + p.aviso);
    }
    if (R.tpl === 'circuito' && R.color !== 'rojo') { var mi = /(UN intento|\d+ intentos)/.exec(dia.sesion || ''); if (mi) c.push(mi[1]); }
    return c.length ? '<div class="chips">' + c.map(function (x) { return '<span class="chip">' + esc(x) + '</span>'; }).join('') + '</div>' : '';
  }
  function htmlReparto(dia, p) {
    var rep = p && p.repartos ? p.repartos : null, cols = [];
    if (rep) Object.keys(rep).forEach(function (k) {
      if (k !== 'objetivo' && (k !== 'protocolo' || PC.web.resuelto('K5'))) return;
      cols.push({ t: k === 'objetivo' ? 'objetivo del día' : 'protocolo del día', v: rep[k] });
    });
    if (!cols.length && dia.tipo === 'prueba') {
      var r = ((plan().planDeCarrera || {}).examen || {}).reparto || {};
      if (r['200']) cols.push({ t: 'reparto del examen', v: [r['200'], r['400'], r['600'], r['800']], meta: r.meta });
    }
    if (!cols.length) return '';
    var el = PC.baremo.ELIMINA_MIL || 229, por = el / 5;
    var filas = [200, 400, 600, 800].map(function (m, i) {
      return '<tr><td>' + m + ' m</td>' + cols.map(function (c) { return '<td>' + esc(c.v[i] || '') + '</td>'; }).join('') + '<td class="hoy-elim">' + PC.fmt.t(por * (i + 1), 1) + '</td></tr>';
    });
    filas.push('<tr><td>1.000 m</td>' + cols.map(function (c) { return '<td>' + esc(c.meta || p.meta || (p.obj ? '≤ ' + p.obj : '')) + '</td>'; }).join('') +
      '<td class="hoy-elim" data-umbral="229">3:49 elimina</td></tr>');
    return '<div class="hoy-rep"><div class="tscroll"><table class="t"><caption>Paso por cada 200 m</caption><thead><tr><th scope="col">paso</th>' +
      cols.map(function (c) { return '<th scope="col">' + esc(c.t) + '</th>'; }).join('') + '<th scope="col" class="hoy-elim" data-umbral="229">ritmo del 3:49</th></tr></thead><tbody>' +
      filas.join('') + '</tbody></table></div></div>';
  }
  function htmlPaso(p, clave, conCk, conTimer, hecho) {
    var tags = (p.tags || []).map(function (t) { return '<span class="chip">' + esc(t) + '</span>'; }).join('');
    var d = p.d ? esc(p.d) : '';
    if (p.enlace) d += (d ? ' ' : '') + '<a href="' + esc(p.enlace.href) + '">' + esc(p.enlace.txt) + '</a>';
    var ck = conCk ? '<button type="button" class="ck" data-ck="' + clave + '" aria-pressed="' + (hecho ? 'true' : 'false') + '" aria-label="Hecho: ' + esc(p.t) + '"><svg viewBox="0 0 26 26" aria-hidden="true"><rect class="cbox" x="2" y="2" width="22" height="22" rx="6"/><path class="tick" d="M7.5 13.5l4 4 7-8.5"/></svg></button>' : '';
    var tm = conTimer && p.timer ? '<button type="button" class="timer" data-tm="' + clave + '" data-t="' + p.timer + '" aria-label="Descanso de ' + PC.fmt.t(p.timer) + '">' + PC.icon('temporizador', 'sm') + '<span>' + PC.fmt.t(p.timer) + '</span></button>' : (conTimer ? '<span></span>' : '');
    return '<div class="ex' + (hecho ? ' done' : '') + (conCk ? '' : ' hoy-ex-sin') + '">' + ck + '<div class="nm">' + esc(p.t) + (d ? '<small>' + d + '</small>' : '') +
      (tags ? '<div class="tags">' + tags + '</div>' : '') + '</div>' + tm + '</div>';
  }
  function htmlPasos(dia, pasos, interactivo, R) {
    if (!pasos.length) return '';
    var S = ses(dia.fecha), cks = S.ck || [], h = ['<div class="hoy-pasos">'];
    var reg = ((plan().sesionesTipo || {}).juevesCircuito || {}).regla;
    if (R.tpl === 'circuito' && reg) h.push('<p class="hoy-regla">' + esc(reg) + '</p>');
    pasos.forEach(function (p, i) {
      if (p.grupo) {
        h.push('<details class="acc"><summary>' + esc(p.t) + ' <small>' + esc(p.meta || '') + '</small>' + PC.icon('chev', 'sm chev') + '</summary><div class="in">' +
          p.pasos.map(function (q, j) { var k = 'c' + i + '-' + j; return htmlPaso(q, k, interactivo, interactivo, cks.indexOf(k) >= 0); }).join('') + '</div></details>');
      } else {
        h.push(htmlPaso(p, 'p' + i, interactivo, interactivo, cks.indexOf('p' + i) >= 0));
        if (p.registro && R.color !== 'rojo') h.push('<div class="hoy-t8" data-t8="' + i + '"></div>');
      }
    });
    if (R.tpl === 'fuerza') { var pr = frases(((plan().sesionesTipo || {}).martesFuerza || {}).prioridad); if (pr.length) h.push('<p class="hoy-pie-f">' + esc(pr[pr.length - 1]) + '</p>'); }
    h.push('</div>');
    return h.join('');
  }
  function htmlPlegados(dia, R) {
    var h = [], rl = SES.reloj(dia);
    if (rl.length && R.tpl !== 'circuito') h.push('<details class="acc why"><summary>' + PC.icon('reloj', 'sm') + 'Configura el reloj' + PC.icon('chev', 'sm chev') + '</summary><div class="in"><ul>' +
      rl.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul></div></details>');
    var q = [];
    [['porQue', 'Por qué'], ['regla', 'Regla'], ['protocolo', 'Protocolo'], ['decide', 'Qué decide'], ['medir', 'Qué medir'], ['registro', 'Qué apuntar'], ['nota', 'Nota']].forEach(function (k) {
      if (dia[k[0]]) q.push('<dt>' + k[1] + '</dt><dd>' + esc(dia[k[0]]) + '</dd>');
    });
    if (dia.lugar && / si /.test(dia.lugar)) q.push('<dt>Lugar</dt><dd>' + esc(dia.lugar) + '</dd>');
    if (R.tpl === 'fuerza') {
      var pr = frases(((plan().sesionesTipo || {}).martesFuerza || {}).prioridad);
      if (pr.length > 1) q.push('<dt>Prioridad</dt><dd>' + esc(pr.slice(0, -1).join(' ')) + '</dd>');
    }
    var F = PC.cal.final() || {};
    if (dia.final && dia.final.enSemanaFinal && F.nota) q.push('<dt>La semana de la prueba</dt><dd>' + esc(F.nota) + '</dd>');
    if (q.length) h.push('<details class="acc why"><summary>' + PC.icon('info', 'sm') + 'Por qué' + PC.icon('chev', 'sm chev') + '</summary><div class="in"><dl>' + q.join('') + '</dl></div></details>');
    return h.length ? '<div class="hoy-plg">' + h.join('') + '</div>' : '';
  }
  function htmlRegistrado(dia) {
    var h = ['<div class="hoy-reg"><p class="hoy-sub">Registrado</p>'];
    (dia.hist || []).forEach(function (x) {
      var e = histEntrada(x.src) || {}, tono = x.hecho === false ? 'bad' : x.valida === false ? 'warn' : 'ok';
      var chip = x.hecho === false ? 'no hecho' : x.valida === false ? 'no mide' : 'hecho';
      var val = frases(e.valoracion || '');
      h.push('<div class="aviso ' + tono + '"><div><b>' + esc(x.resumen || e.sesion || '') + '</b> <span class="chip ' + tono + '">' + chip + '</span>' +
        (e.motivo ? '<small>' + esc(e.motivo) + '</small>' : '') + (val.length ? '<small>' + esc(val[0]) + '</small>' : '') + '</div></div>');
      if (val.length > 1) h.push('<details class="acc why"><summary>Valoración completa' + PC.icon('chev', 'sm chev') + '</summary><div class="in"><p>' + esc(e.valoracion) + '</p></div></details>');
    });
    if (!(dia.hist || []).length) {
      if (dia.hechoAntiguo) h.push('<p class="hoy-reg-l">' + esc(dia.hechoAntiguo.texto || dia.hechoAntiguo) + ' <span class="chip sup">de la web antigua</span></p>');
      else h.push('<p class="empty">Sin registrar</p>');
    }
    h.push('</div>');
    return h.join('');
  }
  function siguienteSesion(desde) {
    for (var i = 1; i <= 40; i++) {
      var f = PC.sumarDias(desde, i), d = PC.cal.dia(f);
      if (d && d.tipo && d.tipo !== 'descanso') return d;
    }
    return null;
  }
  function htmlFinal(dia) {
    var v = PC.cal.version(), fi = dia.final || {}, h = [], lista, tit;
    if (!v && (fi.entradas || []).length) { lista = fi.entradas; tit = 'Según la fecha de la prueba'; }
    else if (fi.enSemanaFinal) { lista = (fi.sinFecha || PC.cal.sinFecha()).filter(function (e) { return !v || e.clave === v; }); tit = v ? 'Según el día exacto de la prueba' : 'Las dos versiones'; }
    else return '';
    if (!lista.length) return '';
    h.push('<p class="hoy-sub">' + tit + '</p><div class="hoy-pasos">');
    lista.forEach(function (e) { h.push(htmlPaso({ t: (v ? '' : e.clave.replace('-', '–') + ' · ') + (e.entrada.dia || ''), d: e.entrada.sesion || '' }, 'f', false, false, false)); });
    h.push('</div>');
    return h.join('');
  }

  /* ================================================================ tarjeta del día (H-1) · PC.sesion.tarjeta */
  function avisoConflicto(dia) {
    return (dia.conflictos || []).map(function (c) {
      return '<div class="aviso warn" role="note">' + PC.icon('alerta') + '<div><b>El plan de este día no coincide consigo mismo. Pregúntalo antes de la sesión</b><div class="dos">' +
        [c.a || {}, c.b || {}].map(function (x) { return '<div><q>' + esc(x.texto) + '</q><small>' + esc(x.campo || '') + '</small></div>'; }).join('') + '</div></div></div>';
    }).join('');
  }
  function metaTxt(dia, rel) {
    var p = [rel === 'hoy' ? 'hoy' : PC.fmt.dia(dia.fecha, 'corta')], ht = horaTxt(dia), l = lugarCorto(dia);
    if (ht) p.push(ht);
    if (l) p.push(l);
    if (dia.bloque) p.push('bloque ' + dia.bloque);
    return p.join(' · ');
  }
  function colorTarjeta(dia, rel) {
    if (rel !== 'hoy') return 'verde';
    var s = SEM.salida(dia.fecha);
    return s && s.color ? s.color : 'verde';
  }
  function htmlDescanso(dia, rel, modo) {
    var h = [];
    if (dia.sesion && !/^descanso\.?$/i.test(String(dia.sesion).trim())) h.push('<p class="hoy-linea">' + esc(dia.sesion) + '</p>');
    if (dia.objetivo) h.push('<p class="hoy-linea">' + esc(dia.objetivo) + '</p>');
    var r = regla('descanso');
    if (dia.tipo === 'descanso' && r) h.push('<div class="hoy-plg"><details class="acc why"><summary>' + PC.icon('info', 'sm') + 'La regla del descanso' + PC.icon('chev', 'sm chev') + '</summary><div class="in"><p>' + esc(r.texto) + '</p></div></details></div>');
    var m = PC.cal.dia(PC.sumarDias(dia.fecha, 1));
    if (m && m.tipo) h.push('<p class="hoy-linea"><b>Mañana:</b> ' + esc(tipoTxt(m.tipo)) + (m.sesion && m.tipo !== 'descanso' ? ' · ' + esc(sinHora(m.sesion)) : '') + '</p>');
    return h.join('');
  }
  function htmlTarjeta(dia, modo) {
    var f = dia.fecha, rel = relDe(f), vivo = modo === 'hoy' && rel === 'hoy';
    var reposo = dia.tipo === 'descanso' || dia.tipo === 'examen';
    var sal = rel === 'hoy' ? SEM.salida(f) : null, color = colorTarjeta(dia, rel);
    var R = SES.contexto(dia, color === 'parada' ? 'verde' : color);
    R.color = color;
    var h = [], qa = modo === 'hoy';
    h.push('<div class="card-h"><div class="ic">' + PC.icon(ICONO[dia.tipo] || (dia.final ? 'prueba' : 'plan')) + '</div><div class="t"><h2' + (qa ? ' data-qa-clave="titulo"' : '') + '>' +
      esc(tituloDe(dia) || 'Sin sesión') + '</h2><small>' + esc(metaTxt(dia, rel)) + '</small><div class="hoy-vchip">' + chipCab(dia, rel, sal) + '</div></div></div>');
    h.push(avisoConflicto(dia));
    if (rel === 'hoy' && (dia.hist || []).length) h.push(htmlRegistrado(dia));   /* registrada el mismo día */
    if (vivo) h.push(htmlSem(dia));
    if (rel === 'pasado') {
      if (dia.sesion) h.push('<p class="hoy-linea">' + esc(dia.sesion) + '</p>');
      h.push(htmlRegistrado(dia));
      return h.join('');
    }
    if (reposo) { h.push(htmlDescanso(dia, rel, modo)); return h.join(''); }
    if (R.conds.length && color !== 'parada') h.push(htmlConds(dia, R));
    if (!dia.tipo && dia.final) { h.push(htmlFinal(dia)); h.push(htmlPlegados(dia, R)); return h.join(''); }
    h.push(htmlStats(SES.numeros(dia, color, R)).replace(qa ? '' : ' data-qa-clave="numeros"', ''));
    var hx = SES.haces(dia, color, R);
    if (hx) {
      h.push('<p class="hoy-haces"' + (qa ? ' data-qa-clave="hoyhaces"' : '') + '><b>' + (rel === 'hoy' ? 'Hoy haces:' : 'Toca:') + '</b> ' + esc(hx) + '</p>');
      if (hx.length > 110) h.push('<button type="button" class="btn ghost hoy-mas" data-a="mas" aria-expanded="false">más</button>');
    }
    var ch = chipsSesion(dia, R);
    if (R.sinElegir) ch = ch ? ch.replace('</div>', '<span class="chip sup">elige arriba</span></div>') : '<div class="chips"><span class="chip sup">elige arriba</span></div>';
    h.push(ch);
    /* M8: si 'hora' trae algo más que la hora («18:00 · acabar antes de las 20:30 · cena terminada a las 20:15…»,
       «09:30-10:00, la misma que el 24 de octubre»), la cabecera solo enseña la hora y el resto se perdía: va literal aquí */
    var hn = String(dia.hora || '').trim();
    if (hn && !/^\d{1,2}:\d{2}(\s*[-–]\s*\d{1,2}:\d{2})?$/.test(hn)) h.push('<p class="hoy-linea hoy-horan"><b>Hora:</b> ' + esc(hn) + '</p>');
    if (color !== 'parada' && (R.tpl === 'control' || dia.tipo === 'prueba')) h.push(htmlReparto(dia, R.principal));
    if (color !== 'parada') h.push(htmlPasos(dia, SES.pasos(dia, color, R), vivo, R));
    if (dia.final && !dia.version) h.push(htmlFinal(dia));
    h.push(htmlPlegados(dia, R));
    if (vivo && color !== 'parada') {
      var mb = /^(carrera|control|prueba)$/.test(dia.tipo || '') ? '<button type="button" class="btn pri lg" data-a="pista">' + PC.icon('play', 'sm') + 'Modo pista</button>' :
        (dia.tipo === 'fuerza' ? '<button type="button" class="btn pri lg" data-a="gym">' + PC.icon('fuerza', 'sm') + 'Modo gimnasio</button>' : '');
      h.push('<div class="card-f">' + mb + '<button type="button" class="btn sec" data-a="fue">' + PC.icon('editar', 'sm') + 'Cómo fue</button></div>');
      var fin = PC.cal.horaFin(dia);
      if (fin !== null && PC.ahoraMin() >= fin) {
        var S = ses(f);
        h.push(S.fue && S.fue.t ? '<button type="button" class="franja" data-a="copiar"><span>Apuntado · Copiar otra vez</span>' + PC.icon('copiar', 'sm') + '</button>' :
          '<button type="button" class="franja" data-a="fue"><span>¿Ya has terminado? Apunta cómo fue →</span></button>');
      }
    }
    return h.join('');
  }
  function montarT8(card, dia) {
    PC.$$('.hoy-t8', card).forEach(function (host) {
      var mi = /(UN intento|\d+ intentos)/i.exec(dia.sesion || ''), n = mi ? (/^UN/i.test(mi[1]) ? 1 : parseInt(mi[1], 10)) : 3;
      if (PC.herr && PC.herr.circuito) { try { PC.herr.circuito(host, { fecha: dia.fecha, intentos: n, lectura: false }); return; } catch (e) { PC._err('hoy · T8', e); } }
      host.innerHTML = '<p class="hoy-linea"><a href="#tecnica/circuito">Registro del circuito →</a></p>';
    });
  }
  function ajustarMas(card) {
    var p = card.querySelector('.hoy-haces'), b = card.querySelector('.hoy-mas');
    if (p && b && card.isConnected && p.scrollHeight <= p.clientHeight + 2) b.hidden = true;
  }
  function pintarTarjeta(card) {
    var dia = PC.cal.dia(card.__fecha);
    if (!dia) { card.className = 'card hoy-card'; card.innerHTML = htmlSinSesion(card.__fecha); return; }
    card.__dia = dia;
    var rel = relDe(dia.fecha);
    card.className = 'card hoy-card' + (dia.tipo === 'descanso' ? ' flat' : (card.__modo === 'hoy' && rel === 'hoy' ? ' hi' : ''));
    card.setAttribute('data-fecha', dia.fecha);
    card.innerHTML = htmlTarjeta(dia, card.__modo);
    if (card.__modo === 'hoy' && rel === 'hoy') montarT8(card, dia);
    PC.$$('[data-tm]', card).forEach(function (b) { var t = TM[tmClave(dia.fecha, b)]; if (t && t.activo()) pintarTm(b, t.restante()); });
    ajustarMas(card);
  }
  function htmlSinSesion(fecha) {
    var s = siguienteSesion(fecha || PC.hoyIso());
    return '<p class="empty">El plan no tiene sesión para ' + (fecha === PC.hoyIso() ? 'hoy' : 'este día') + '</p>' +
      (s ? '<p class="hoy-linea"><b>Siguiente sesión:</b> <a href="#hoy/' + s.fecha + '">' + esc(PC.fmt.dia(s.fecha, 'corta')) + ' · ' + esc(tituloDe(s)) + '</a></p>' : '');
  }
  SES.tarjeta = function (dia, op) {
    op = op || {};
    var card = DOC.createElement('article');
    card.__fecha = dia && dia.fecha ? dia.fecha : PC.hoyIso();
    card.__modo = op.modo === 'hoja' ? 'hoja' : 'hoy';
    pintarTarjeta(card);
    card.addEventListener('click', function (e) { try { clickTarjeta(card, e); } catch (x) { PC._err('hoy · tarjeta', x); } });
    card.addEventListener('input', function (e) { inputTarjeta(card, e, false); });
    card.addEventListener('change', function (e) { inputTarjeta(card, e, true); });
    if (card.__modo === 'hoja') setTimeout(function () { ajustarMas(card); }, 60);
    return card;
  };

  /* ---------------------------------------------------------------- temporizadores de la tarjeta */
  var TM = {};
  function tmClave(fecha, b) { return 'hoy-' + fecha + '-' + b.getAttribute('data-tm'); }
  function pintarTm(b, r) {
    var run = r > 0.05, sp = b.querySelector('span');
    b.classList.toggle('run', run);
    if (sp) sp.textContent = PC.fmt.t(run ? Math.ceil(r) : +b.getAttribute('data-t'));
  }
  function timerTarjeta(card, b) {
    PC.audio.desbloquear();
    var f = card.__fecha, k = tmClave(f, b), seg = +b.getAttribute('data-t'), sel = '.hoy-card[data-fecha="' + f + '"] [data-tm="' + b.getAttribute('data-tm') + '"]';
    if (TM[k]) TM[k].parar();
    function pinta(r) { PC.$$(sel).forEach(function (x) { pintarTm(x, r); }); }
    TM[k] = PC.timer.crear({ seg: seg, clave: k, alTick: pinta, alCero: function () { pinta(0); }, alSaltar: function () { pinta(0); } });
    TM[k].empezar();
  }

  /* ---------------------------------------------------------------- eventos de la tarjeta */
  function semGuardar(fecha, cambio) {
    var g = mezclar(SEM_DEF, SEM.leer(fecha) || {}, cambio);
    delete g.color; delete g.racha; delete g.t;
    SEM.guardar(fecha, g);
  }
  function repintarTodo(card) {
    pintarTarjeta(card);
    if (card.__modo === 'hoy' && UI.root) { pintarDecide(); pintarCab(); }
  }
  function clickTarjeta(card, e) {
    var t = e.target.closest ? e.target.closest('button,[data-a]') : null;
    if (!t || !card.contains(t)) return;
    var f = card.__fecha, dia = card.__dia || PC.cal.dia(f), a = t.getAttribute('data-a');
    if (a === 'lamp') {
      semGuardar(f, { banda: t.getAttribute('data-banda'), min: null });
      UI.abierto[f] = false; UI.opc[f] = false; repintarTodo(card);
      var h2 = card.querySelector('.hoy-sem'); if (h2 && h2.focus) { h2.setAttribute('tabindex', '-1'); h2.focus({ preventScroll: true }); }
      return;
    }
    if (a === 'cambiar' || a === 'anotar') { UI.abierto[f] = true; repintarTodo(card); var l = card.querySelector('.lamps button'); if (l) l.focus({ preventScroll: true }); return; }
    if (a === 'opc') { UI.opc[f] = !UI.opc[f]; if (!SEM.salida(f)) UI.abierto[f] = true; repintarTodo(card); return; }
    if (t.hasAttribute('data-s')) {
      var campo = t.getAttribute('data-s'), v = t.getAttribute('data-v');
      if (campo === 'ayer') semGuardar(f, { ayerRojo: v === 'si' });
      else { var c = {}; c[campo] = v; semGuardar(f, c); }
      if (campo !== 'ayer') { UI.abierto[f] = true; UI.opc[f] = true; }
      repintarTodo(card); return;
    }
    if (t.hasAttribute('data-st')) {
      var cs = t.getAttribute('data-st'), g = SEM.leer(f) || {}, nv = Math.max(0, Math.min(10, (+g[cs] || 0) + (+t.getAttribute('data-d'))));
      var o = {}; o[cs] = nv; semGuardar(f, o); UI.abierto[f] = true; UI.opc[f] = true; repintarTodo(card); return;
    }
    if (a === 'cond') {
      var conds = COND.todas(dia), cd = conds[+t.getAttribute('data-ci')], id = t.getAttribute('data-v');
      if (!cd) return;
      COND.guardar(dia, cd, t.getAttribute('aria-pressed') === 'true' && cd.tipo !== 'prueba' ? null : id);
      if (cd.tipo === 'prueba' && UI.root) { PC.cal._reiniciar(); pintarVista(); PC.pintarComunes(); return; }
      repintarTodo(card); return;
    }
    if (t.hasAttribute('data-ck')) {
      var k = t.getAttribute('data-ck'), S = ses(f), cks = (S.ck || []).slice(), i = cks.indexOf(k);
      if (i >= 0) cks.splice(i, 1); else cks.push(k);
      guardarSes(f, { ck: cks });
      t.setAttribute('aria-pressed', i >= 0 ? 'false' : 'true');
      var ex = t.closest('.ex'); if (ex) ex.classList.toggle('done', i < 0);
      return;
    }
    if (t.hasAttribute('data-tm')) { timerTarjeta(card, t); return; }
    if (a === 'mas') { var p = card.querySelector('.hoy-haces'), ab = !p.classList.contains('abierto'); p.classList.toggle('abierto', ab); t.textContent = ab ? 'menos' : 'más'; t.setAttribute('aria-expanded', ab ? 'true' : 'false'); return; }
    if (a === 'pista' || a === 'gym') { abrirModo(dia); return; }
    if (a === 'fue') { abrirFue(dia); return; }
    if (a === 'copiar') { PC.copiar(textoCopia(dia)); return; }
  }
  function inputTarjeta(card, e, fin) {
    var t = e.target; if (!t || t.getAttribute('data-s') !== 'min') return;
    var f = card.__fecha, v = +t.value, b = SEM.bandaDeMin(v), o = t.parentNode.querySelector('output');
    if (o) o.textContent = PC.fmt.sueno(v);
    t.setAttribute('aria-valuetext', PC.fmt.sueno(v).replace('h', ' horas ') + ' minutos, ' + NCOLOR[b].toLowerCase());
    PC.$$('.lamps button', card).forEach(function (x) { x.setAttribute('aria-checked', x.getAttribute('data-banda') === b ? 'true' : 'false'); });
    if (fin) { semGuardar(f, { min: v, banda: b }); UI.abierto[f] = true; UI.opc[f] = true; repintarTodo(card); var r = card.querySelector('input[data-s="min"]'); if (r) r.focus({ preventScroll: true }); }
  }

  /* ================================================================ vista Hoy: H-0 · H-2 · H-3 · H-4 */
  function dm(iso) { return PC.fmt.dia(iso, 'dm'); }
  function rangoPlan() {
    var cal = plan().calendario || [], F = PC.cal.final() || {};
    var ini = cal.length && cal[0].semana ? String(cal[0].semana).split('/')[0] : null;
    var fin = F.semana ? String(F.semana).split('/')[1] : (cal.length && cal[cal.length - 1].semana ? String(cal[cal.length - 1].semana).split('/')[1] : null);
    return { ini: ini ? PC.lunes(ini) : null, fin: fin ? PC.lunes(fin) : null };
  }
  var EST_CLS = { hecho: 'done', nomide: 'nomide', miss: 'miss', noreg: 'noreg', rest: 'rest' };
  var EST_TXT = { hecho: 'hecho', nomide: 'hecho, no mide', miss: 'no hecho', noreg: 'sin registrar', rest: 'descanso', futuro: 'por venir' };
  function pintarSemana() {
    var root = UI.root, hoy = PC.hoyIso(), sel = UI.sel || hoy, lun = UI.lunes || PC.lunes(sel);
    UI.lunes = lun;
    var dias = PC.cal.semana(lun), wk = root.querySelector('.week');
    wk.innerHTML = dias.map(function (d, i) {
      var f = PC.sumarDias(lun, i), cls = [], e = d ? PC.cal.estado(d) : null;
      var vp = der().ventanaPrueba || {}, tipo = d ? (d.tipo || (d.final && vp.desde && f >= vp.desde && f <= vp.hasta ? 'prueba' : null)) : null;
      if (f === hoy) cls.push('today'); else if (EST_CLS[e]) cls.push(EST_CLS[e]);
      if (d && d.clave) cls.push('key');
      if (!d) cls.push('hoy-fuera');
      var lab = PC.fmt.dia(f, 'larga') + ', ' + (tipo ? tipoTxt(tipo) : 'sin sesión en el plan') + (f === hoy ? ', hoy' : (e && EST_TXT[e] && e !== 'rest' ? ', ' + EST_TXT[e] : '')) + (d && d.clave ? ', día clave' : '');
      return '<button type="button" class="' + cls.join(' ') + '" data-f="' + f + '" aria-pressed="' + (f === sel ? 'true' : 'false') + '"' + (f === hoy ? ' aria-current="date"' : '') +
        ' aria-label="' + esc(lab) + '"><span aria-hidden="true">' + LETRA[i] + '</span><b aria-hidden="true">' + (+f.slice(8)) + '</b>' + (tipo ? PC.icon(ICONO[tipo]) : '<svg class="icon" aria-hidden="true"></svg>') + '</button>';
    }).join('');
    var R = rangoPlan();
    root.querySelector('.hoy-prev').disabled = !!(R.ini && lun <= R.ini);
    root.querySelector('.hoy-next').disabled = !!(R.fin && lun >= R.fin);
    root.querySelector('.hoy-leyenda summary').innerHTML = '<span class="hoy-rango">' + dm(lun) + ' al ' + dm(PC.sumarDias(lun, 6)) + '</span> · Qué significa cada color';
  }
  function pintarCab() {
    var root = UI.root, hoy = PC.hoyIso(), dh = PC.cal.dia(hoy), sub = [], bl = PC.cal.bloque(hoy);
    root.querySelector('#hoy-cab h1').textContent = PC.fmt.dia(hoy, 'larga');
    if (bl) sub.push('bloque ' + bl);
    var tit = dh ? (dh.semanaTitulo || (dh.final ? (PC.cal.final() || {}).titulo : null)) : null;
    if (tit) sub.push(tit);
    root.querySelector('.hoy-semt').textContent = sub.join(' · ');
    PC.graf.camino(root.querySelector('.hoy-camino'));
    pintarSemana();
  }
  function pintarSes() {
    var host = UI.root.querySelector('#hoy-ses'), hoy = PC.hoyIso(), f = UI.sel || hoy;
    host.innerHTML = '';
    if (f !== hoy) host.appendChild(PC.el('p', { 'class': 'hoy-volver' }, '<a class="chip pri" href="#hoy">' + PC.icon('hoy', 'sm') + 'Volver a hoy</a><span>' + esc(PC.fmt.dia(f, 'larga')) + '</span>'));
    var dia = PC.cal.dia(f);
    UI.card = SES.tarjeta(dia || { fecha: f }, { modo: 'hoy' });
    host.appendChild(UI.card);
    ajustarMas(UI.card);
    UI.franja = franjaVisible();
  }
  function franjaVisible() {
    var d = UI.card && UI.card.__dia, fin = d ? PC.cal.horaFin(d) : null;
    return !!(d && relDe(d.fecha) === 'hoy' && fin !== null && PC.ahoraMin() >= fin);
  }

  /* H-2 · lo que decide lo siguiente */
  function valorDecide(fecha, prueba) {
    var H = PC.herr || {};
    if (prueba === 'cir') { var r = H.cirResumen ? H.cirResumen(fecha) : null; return r && r.comparable !== null && r.comparable !== undefined ? +r.comparable : null; }
    if (prueba === 'dom') { var d = H.dom ? H.dom(fecha) : null; return d && d.validas !== null && d.validas !== undefined ? +d.validas : null; }
    if (prueba === 'mil') { var o = ses(fecha), fu = o.fue || {}, t = o.mil || fu.mil; return t ? +t : null; }
    return null;
  }
  function tramoIdx(tramos, v) {
    if (v === null || v === undefined || isNaN(v)) return -1;
    function pv(x) { return x === null || x === undefined ? null : PC.fmt.parseT(x); }
    for (var i = 0; i < tramos.length; i++) {
      var t = tramos[i], g = pv(t.gte), l = pv(t.lte), gt = pv(t.gt), lt = pv(t.lt);
      if ((g === null || v >= g - 1e-9) && (l === null || v <= l + 1e-9) && (gt === null || v > gt) && (lt === null || v < lt)) return i;
    }
    return -1;
  }
  /* subcadena literal de 6 palabras como mucho, sin cortar en una palabra de enlace */
  function corto(txt) {
    var w = String(txt || '').split(/\s+/);
    if (w.length <= 6) return w.join(' ');
    w = w.slice(0, 6);
    while (w.length > 1 && /^(y|o|con|el|la|los|las|de|del|a|al|en|por|para)$/i.test(w[w.length - 1])) w.pop();
    return w.join(' ');
  }
  function raya(t) { return String(t || '').replace(/(\d)-(\d)/g, '$1–$2'); }
  function htmlBarra(bar, fecha) {
    var v = valorDecide(fecha, bar.prueba), tu = tramoIdx(bar.tramos || [], v), mil = bar.prueba === 'mil';
    var elimTu = mil && v !== null && v >= (PC.baremo.ELIMINA_MIL || 229);
    if (elimTu) tu = -1;
    var sel = tu >= 0 ? tu : 0, txts = [];
    var partes = (bar.tramos || []).map(function (tr, i) {
      var full = tr.efecto + (tr.condicion ? ', ' + tr.condicion : '');
      txts.push(full);
      return '<button type="button" class="' + (tr.tono || '') + (i === tu ? ' tu' : '') + '" style="--w:4" aria-pressed="false" data-a="tramo" data-txt="' + esc(full) + '"><b>' + esc(raya(tr.txt)) + '</b>' + esc(corto(tr.corto || tr.efecto)) + '</button>';
    });
    if (mil) partes.push('<button type="button" class="elim' + (elimTu ? ' tu' : '') + '" data-umbral="229" aria-pressed="false" data-a="tramo" data-txt="3:49 o más · elimina"><b>3:49 o más</b>elimina</button>');
    var aria = (bar.etiqueta || '') + ': ' + (bar.tramos || []).map(function (tr) { return tr.txt + ', ' + corto(tr.corto || tr.efecto); }).join('; ') + (mil ? '; 3:49 o más, elimina' : '');
    var dato = v === null ? '' : ' · tu dato: ' + (bar.prueba === 'dom' ? v : (bar.prueba === 'cir' ? PC.fmt.s(v) : PC.fmt.t(v, v % 1 ? 1 : 0)));
    return '<div class="hoy-dec-b"><h3>' + esc(bar.etiqueta || '') + esc(dato) + '</h3><div class="umb-w"><div class="umb" role="group" aria-label="' + esc(aria) + '">' + partes.join('') +
      '</div><p class="umb-t" aria-live="polite">' + esc(elimTu ? '3:49 o más · elimina' : txts[sel] || '') + '</p></div>' + (bar.aparte ? '<p class="hoy-dec-ap">' + esc(bar.aparte) + '</p>' : '') + '</div>';
  }
  function pintarDecide() {
    var host = UI.root.querySelector('#hoy-decide'), hoy = PC.hoyIso();
    var lista = (web().decide || []).filter(function (x) { return x.fecha >= hoy; }).sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });
    var d = lista[0], av = PC.web.avisos('hoy'), h = [];
    var avH = av.map(function (a) {
      return '<div class="aviso ' + (a.tono || 'warn') + '" role="note">' + PC.icon('alerta') + '<div><b>' + esc(a.titulo || '') + '</b>' + esc(a.texto || '') + (a.hasta ? '<small>hasta el ' + esc(dm(a.hasta)) + '</small>' : '') + '</div></div>';
    }).join('');
    if (d) {
      h.push('<div class="card"><p class="hoy-sub">Lo que decide lo siguiente</p><h2 class="hoy-dec-t">' + esc(d.titulo || '') + '</h2>' + (d.que ? '<p class="hoy-dec-q">' + esc(d.que) + '</p>' : ''));
      (d.barras || []).forEach(function (b) { h.push(htmlBarra(b, d.fecha)); });
      if (d.nota) h.push('<p class="hoy-dec-n">' + esc(d.nota) + '</p>');
      var en = [];
      (d.barras || []).forEach(function (b) {
        if (b.prueba === 'cir') en.push('<a href="#tecnica/circuito">Técnica del circuito →</a>');
        if (b.prueba === 'dom') en.push('<a href="#tecnica/dominada">Contador de válidas →</a>');
        if (b.prueba === 'mil') en.push('<a href="#tecnica/mil">Reparto del 1.000 →</a>');
      });
      en.push('<a href="#plan/' + d.fecha + '">El ' + esc(PC.fmt.dia(d.fecha, 'corta')) + ' en el plan →</a>');
      h.push('<div class="hoy-enl">' + unico(en).join('') + '</div>');
      if (avH) h.push('<div class="hoy-dec-av">' + avH + '</div>');
      h.push('</div>');
    } else if (avH) h.push(avH);
    host.innerHTML = h.join('');
  }

  /* H-3 · esta noche (cena = luz − 2 h, de reglas[dormir] y atleta.horaApagarLuz) */
  function minDe(txt) { var m = /(\d{1,2}):(\d{2})/.exec(txt || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; }
  function lineaNoche(iso) {
    var txt = reglaTxt('dormir'), dow = PC.fecha(iso).getDay(), m;
    if (dow === 4 && (m = /del circuito a la cama/i.exec(txt))) return mayus(m[0]);
    if ((dow === 5 || dow === 6) && (m = /El fin de semana, [^.]*/.exec(txt))) return m[0];
    var luz = minDe((plan().atleta || {}).horaApagarLuz) || minDe(frase(txt, 'Luz apagada'));
    if (luz === null) return '';
    var ant = /al menos (\d+) h antes/.exec(txt), horas = ant ? +ant[1] : 2;
    return 'Cena terminada antes de las ' + hm(luz - horas * 60) + ' · luz apagada a las ' + hm(luz);
  }
  function pintarNoche() {
    var host = UI.root.querySelector('#hoy-noche'), l = lineaNoche(PC.hoyIso());
    host.innerHTML = l ? '<div class="hoy-noche">' + PC.icon('luna') + '<p><small>Esta noche</small>' + esc(l) + '</p></div>' : '';
  }
  /* H-4 · pendientes */
  function pintarPend() {
    var host = UI.root.querySelector('#hoy-pend'), n = PC.web.pendientes().filter(function (p) { return !p.marcado; }).length;
    host.innerHTML = n ? '<a href="#plan/decisiones"><span>' + n + (n === 1 ? ' pendiente' : ' pendientes') + '</span><span aria-hidden="true">→</span></a>' : '';
  }
  function pintarVista() {
    if (!UI.root) return;
    pintarCab(); pintarSes(); pintarDecide(); pintarNoche(); pintarPend();
  }
  function aplicarParams() {
    if (UI.aplicado) return;
    UI.aplicado = true;
    var s = PC.q('sem');
    if (s && /^(verde|ambar|rojo)$/.test(s)) semGuardar(PC.hoyIso(), { banda: s, min: null });
  }
  function abrirParams() {
    if (UI.abiertoParam) return;
    UI.abiertoParam = true;
    var a = PC.q('abrir'), d = PC.cal.dia(UI.sel || PC.hoyIso());
    if (!d) return;
    if (a === 'focus') abrirModo(d); else if (a === 'fue') abrirFue(d);
  }
  PC.vista('hoy', {
    init: function (root) {
      UI.root = root;
      root.querySelector('.week').addEventListener('click', function (e) {
        var b = e.target.closest('button[data-f]'); if (!b) return;
        var f = b.getAttribute('data-f');
        PC.ir(f === PC.hoyIso() ? '#hoy' : '#hoy/' + f);
      });
      root.querySelector('.hoy-prev').addEventListener('click', function () { UI.lunes = PC.sumarDias(UI.lunes || PC.lunes(UI.sel || PC.hoyIso()), -7); pintarSemana(); });
      root.querySelector('.hoy-next').addEventListener('click', function () { UI.lunes = PC.sumarDias(UI.lunes || PC.lunes(UI.sel || PC.hoyIso()), 7); pintarSemana(); });
      root.querySelector('#hoy-decide').addEventListener('click', function (e) {
        var b = e.target.closest('button[data-a="tramo"]'); if (!b) return;
        var w = b.closest('.umb-w');
        PC.$$('button', w).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        w.querySelector('.umb-t').textContent = b.getAttribute('data-txt');
      });
      var cam = root.querySelector('.hoy-camino');
      PC.alRedimensionar(cam, function () { PC.graf.camino(cam); });
      setInterval(function () {
        if (PC.vistaActual() !== 'hoy' || PC.focus.abierto() || PC.sheet.abierta() || !UI.card) return;
        var v = franjaVisible(); if (v !== UI.franja) { UI.franja = v; pintarTarjeta(UI.card); }
      }, 60000);
    },
    show: function (sub, ruta) {
      var hoy = PC.hoyIso(), f = /^\d{4}-\d{2}-\d{2}$/.test(sub || '') ? sub : hoy;
      if (ruta && ruta.arriba) f = hoy;
      if (f !== UI.sel) UI.lunes = null;
      UI.sel = f;
      aplicarParams();
      pintarVista();
      abrirParams();
      return false;
    },
    resize: function () { if (UI.root) PC.graf.camino(UI.root.querySelector('.hoy-camino')); },
    repintar: function () { UI.sel = null; UI.lunes = null; pintarVista(); }
  });

  /* ================================================================ T2 · modo pista · T3 · modo gimnasio */
  var FZ = null;
  function fmtT(s) { return PC.fmt.t(s, Math.abs(s % 1) > 0.001 ? 1 : 0); }
  function ritmoBloque(dia) { var rr = plan().ritmos || []; return rr.filter(function (x) { return x.clave === dia.bloque; })[0] || rr.filter(function (x) { return x.avisoReloj; })[0] || {}; }
  function frenoDe(dia, p) {
    if (p && p.freno) return p.freno;
    var m = /freno si (?:un \d+ )?baja de (\d:\d{2})/.exec(dia.objetivo || ''); if (m) return m[1];
    m = new RegExp('(\\d:\\d{2}) el ' + dm(dia.fecha) + '\\b').exec(ritmoBloque(dia).avisoReloj || '');
    return m ? m[1] : null;
  }
  function frenoFrase(dia) { var m = /la siguiente sale más lenta, no se abandona/.exec(ritmoBloque(dia).avisoReloj || ''); return m ? m[0] : ''; }
  function tramosCriterio(c) {
    var P = PC.fmt.parseT, a = P(c.ok[0]), b = P(c.ok[1]), mn = P(c.min), co = P(c.corte);
    return [
      { id: 'bajo', cls: 'warn', b: 'menos de ' + c.min, s: 'ninguna por debajo de ' + c.min, ok: function (t) { return t < mn; } },
      { id: 'f1', cls: 'warn', b: c.min + '–' + c.ok[0], s: 'fuera del criterio', ok: function (t) { return t >= mn && t < a; } },
      { id: 'ok', cls: 'ok', b: c.ok[0] + '–' + c.ok[1], s: 'dentro del criterio', ok: function (t) { return t >= a && t <= b; } },
      { id: 'f2', cls: 'warn', b: c.ok[1] + '–' + c.corte, s: 'fuera del criterio', ok: function (t) { return t > b && t < co; } },
      { id: 'corte', cls: 'bad', b: c.corte + ' o más', s: 'corte a ' + c.corte, ok: function (t) { return t >= co; } }
    ];
  }
  /* ±3 s: «por más de 3 s», así que 3,0 exacto es «Dentro» */
  function catDe(r, t) {
    if (r.criterio) { var T = tramosCriterio(r.criterio); for (var i = 0; i < T.length; i++) if (T[i].ok(t)) return T[i].id; return 'ok'; }
    return t > r.hi + 3 + 1e-9 ? 'lenta' : (t < r.lo - 3 - 1e-9 ? 'rapida' : 'dentro');
  }
  var CAT = { dentro: ['ok', 'Dentro'], lenta: ['bad', 'Lenta'], rapida: ['warn', 'Rápida'], bajo: ['warn', 'Menos de'], f1: ['warn', 'Fuera'], ok: ['ok', 'Dentro'], f2: ['warn', 'Fuera'], fuera: ['warn', 'Fuera'], corte: ['bad', 'Corte'] };
  function esRodaje(R, color) { return R.tpl === 'rodaje' || (R.tpl === 'series' && color === 'rojo'); }
  function tituloFocus(dia, R, color) {
    var p = R.principal, t = tituloDe(dia);
    if (esRodaje(R, color)) t = 'Rodaje ' + durRodaje(dia, R, color).txt;
    else if (p && p.tipo === 'series') t = (p.n || 1) + ' × ' + p.dist;
    else if (p && p.tipo === 'km-partido') t = 'Kilómetro partido × ' + (p.nColor || 1);
    else if (p && p.tipo === 'compuesta') t = (p.partes || []).map(function (x) { return ((x.n || 1) > 1 ? x.n + ' × ' : '') + x.dist; }).join(' + ');
    return t + (dia.bloque ? ' · bloque ' + dia.bloque : '') + ' · ' + (NCOLOR[color] || '').toLowerCase();
  }
  function durRodaje(dia, R, color) {
    var mn = R.tpl === 'rodaje' ? minRodaje(dia, R) : null, m;
    if (R.tpl === 'rodaje' && color === 'rojo' && (m = /(\d+)-(\d+) min/.exec(genTxt('carrera', 'rojo'))) && mn > +m[2]) mn = null;
    if (mn) return { seg: mn * 60, txt: mn + ' min' };
    m = /(\d+)-(\d+) min/.exec((dia.variantes || {}).rojo || genTxt('carrera', 'rojo'));
    return m ? { seg: +m[1] * 60, txt: m[1] + '-' + m[2] + ' min' } : { seg: 1800, txt: '' };
  }
  function abrirModo(dia) {
    if (!dia || !dia.tipo || /^(descanso|examen)$/.test(dia.tipo)) return;
    var color = colorTarjeta(dia, relDe(dia.fecha)); if (color === 'parada') return;
    var gym = dia.tipo === 'fuerza';
    FZ = { f: dia.fecha, color: color };
    cargarFZ();
    var b = PC.focus.abrir({ titulo: tituloFocus(FZ.dia, FZ.R, color), gimnasio: gym, etiqueta: gym ? 'Modo gimnasio' : 'Modo pista', alCerrar: alCerrarModo });
    if (!b) { FZ = null; return; }
    if (!b.__hoy) { b.__hoy = true; b.addEventListener('click', function (e) { try { clickFocus(e); } catch (x) { PC._err('hoy · modo', x); } }); b.addEventListener('change', changeFocus); }
    pintarFocus();
  }
  function cargarFZ() {
    var dia = FZ.dia = PC.cal.dia(FZ.f), R = FZ.R = SES.contexto(dia, FZ.color);
    R.color = FZ.color;
    FZ.tipo = dia.tipo === 'fuerza' ? 'gym' : (R.tpl === 'control' ? 'control' : (esRodaje(R, FZ.color) ? 'rodaje' : (R.principal ? 'series' : 'texto')));
    var S = ses(FZ.f);
    if (FZ.tipo === 'series') { FZ.seq = SES.secuencia(R.principal, FZ.color); FZ.reps = (S.reps || []).slice(0, FZ.seq.length); FZ.fase = FZ.reps.length >= nEf() ? 'fin' : 'rep'; }
    if (FZ.tipo === 'gym') {
      FZ.g = S.gym || { series: {}, reserva5: null, codo: 0, hombro: 0 };
      var A = R.fuerza && R.fuerza.bloques.A; if (A && !FZ.g.lastre) FZ.g.lastre = pesoCorto(A.peso) || null;
    }
    if (FZ.tipo === 'rodaje') { FZ.dur = durRodaje(dia, R, FZ.color); }
    if (FZ.tipo === 'control') FZ.paso = FZ.paso || 0;
  }
  function nEf() { var u = ses(FZ.f).ultima200; return u ? Math.min(FZ.seq.length, u) : FZ.seq.length; }
  function timerFZ(seg, clave, alCero) {
    if (FZ.t) FZ.t.parar();
    FZ.t = PC.timer.crear({ seg: seg, clave: clave, avisoSeg: FZ.tipo === 'rodaje' ? 0 : 10,
      alTick: function (r) { tickFZ(r); }, alCero: function (api, tarde) { alCero(tarde); }, alSaltar: function () { alCero(0); } });
    FZ.t.empezar();
  }
  function bigFZ(txt) { var b = PC.focus.cuerpo(), e = b && b.querySelector('[data-z="big"]'); if (e) e.textContent = txt; }
  function tickFZ(r) {
    if (!FZ) return;
    if (FZ.tipo === 'rodaje') {
      var el = FZ.dur.seg - r; bigFZ(PC.fmt.t(Math.floor(el)));
      if (el >= 600 && !FZ.diez) { FZ.diez = true; PC.audio.pitido(1); PC.vibrar([100]); msgFZ('Desde aquí, techo ' + (rs().techoFC || '')); }
      return;
    }
    bigFZ(PC.fmt.t(Math.ceil(r)));
  }
  function msgFZ(t) { var b = PC.focus.cuerpo(), e = b && b.querySelector('[data-z="msg"]'); if (e) e.textContent = t; }
  function arrancarRec(r) {
    var s = segDe(r.rec);
    if (!s) { FZ.fase = FZ.reps.length >= nEf() ? 'fin' : 'rep'; return; }
    timerFZ(s, 'hoy-fz-' + FZ.f, function (tarde) { FZ.tarde = tarde; FZ.fase = FZ.reps.length >= nEf() ? 'fin' : 'rep'; pintarFocus(); });
  }
  function anotar(cat, t) {
    var k = FZ.reps.length, r = FZ.seq[k]; if (!r) return;
    FZ.reps.push({ cat: cat, t: t === undefined ? null : t });
    var upd = { reps: FZ.reps };
    FZ.freno = cat === 'rapida'; FZ.exacto = false; FZ.tarde = 0;
    if (!r.criterio && cat === 'lenta' && k > 0 && FZ.reps[k - 1].cat === 'lenta') { upd.aviso2 = true; FZ.fase = 'dos'; }
    else if (cat === 'corte') FZ.fase = 'corte';
    else FZ.fase = FZ.reps.length >= nEf() ? 'fin' : 'rec';
    guardarSes(FZ.f, upd);
    if (FZ.fase === 'rec') arrancarRec(r);
    pintarFocus();
  }
  function seguirTras(k) { var r = FZ.seq[k]; FZ.fase = FZ.reps.length >= nEf() ? 'fin' : 'rec'; if (FZ.fase === 'rec') arrancarRec(r); }
  function histHTML() {
    if (!FZ.reps.length) return '';
    return '<ul class="hoy-fz-hist" aria-label="Repeticiones anotadas">' + FZ.reps.map(function (x, i) {
      var c = CAT[x.cat] || ['', x.cat];
      return '<li class="' + c[0] + '">' + (i + 1) + ' · ' + esc(x.t !== null && x.t !== undefined ? fmtT(x.t) : c[1].toLowerCase()) + '</li>';
    }).join('') + '</ul><button type="button" class="btn ghost" data-z="deshacer">Deshacer la última</button>';
  }
  function resumenCats(reps, crit) {
    var c = {}; (reps || []).forEach(function (x) { c[x.cat] = (c[x.cat] || 0) + 1; });
    if (crit) return 'dentro ' + (c.ok || 0) + ' · fuera ' + ((c.bajo || 0) + (c.f1 || 0) + (c.f2 || 0) + (c.fuera || 0)) + ' · corte ' + (c.corte || 0);
    return 'dentro ' + (c.dentro || 0) + ' · lenta ' + (c.lenta || 0) + ' · rápida ' + (c.rapida || 0);
  }
  function dosSeguidas(reps) { for (var i = 1; i < (reps || []).length; i++) if (reps[i].cat === 'lenta' && reps[i - 1].cat === 'lenta') return true; return false; }
  function lineaRep(dia, R, r) {
    var p = R.principal || {}, b = PC.cal.bloqueInfo(dia.bloque || '') || {}, l = [];
    var p2 = r.primer200 || p.primer200 || (p.partes && p.partes[0] && p.partes[0].primer200) || b.primer200;
    if (p2 && (r.dist >= 400 || r.primer200)) l.push('primer 200 en ' + p2);
    var fr = frenoDe(dia, p); if (fr && r.dist === 400) l.push('freno ' + fr);
    return l.join(' · ');
  }
  function htmlSeries() {
    var h = [], d = FZ.dia, R = FZ.R, k = FZ.reps.length, n = nEf(), S = ses(FZ.f);
    if (FZ.fase === 'fin') {
      var crit = FZ.seq[0] && FZ.seq[0].criterio;
      h.push('<p class="focus-k">Series terminadas</p><p class="hoy-fz-l">' + esc(resumenCats(FZ.reps, crit) + (crit ? '' : ' · dos repeticiones: ' + (dosSeguidas(FZ.reps) || S.aviso2 ? 'sí' : 'no'))) + '</p>');
      var vc = vueltaCalma(); h.push('<p class="hoy-fz-l"><b>' + esc(vc.t) + '.</b> ' + esc(vc.d) + '</p>');
      h.push('<button type="button" class="btn pri lg block" data-z="fue">Apuntar cómo fue</button>' + histHTML());
      return h.join('');
    }
    if (FZ.fase === 'rec' && FZ.t) {
      var hecho = FZ.seq[k - 1] || {}, sig = FZ.seq[k];
      h.push('<p class="focus-k">' + (hecho.pausa ? 'Pausa' : 'Recuperación') + (sig ? ' · luego ' + esc(sig.dist + ' m en ' + sig.obj) : '') + '</p>');
      h.push('<p class="big num" data-z="big">' + PC.fmt.t(Math.ceil(FZ.t.restante())) + '</p>');
      h.push('<div class="hoy-fz-ctl"><button type="button" class="btn sec" data-z="mas15">+15 s</button><button type="button" class="btn sec" data-z="saltar">Saltar</button><button type="button" class="btn sec" data-z="pausa">' + (FZ.t.activo() ? 'Pausa' : 'Seguir') + '</button></div>');
    } else {
      var r = FZ.seq[k];
      var kt = r.km ? 'Kilómetro partido ' + r.km + ' de ' + r.kmN + ' · ' + r.dist + ' m' : 'Repetición ' + (k + 1) + ' de ' + n + ' · ' + r.dist + ' m';
      h.push('<p class="focus-k">' + esc(kt) + '</p><p class="big num' + (r.lo !== r.hi ? ' hoy-rg' : '') + '">' + esc(r.obj) + '</p>');
      var ln = lineaRep(d, R, r); if (ln) h.push('<p class="hoy-fz-l">' + esc(ln) + '</p>');
      if (FZ.tarde > 1) h.push('<p class="hoy-fz-l"><b>Terminó hace ' + PC.fmt.t(Math.round(FZ.tarde)) + '</b></p>');
      if (r.criterio) h.push('<div class="rep-btns hoy-fz-tr">' + tramosCriterio(r.criterio).map(function (tr) {
        return '<button type="button" class="' + tr.cls + '" data-z="cat" data-v="' + tr.id + '">' + esc(tr.b) + '<small>' + esc(tr.s) + '</small></button>';
      }).join('') + '</div>');
      else h.push('<div class="rep-btns"><button type="button" class="ok" data-z="cat" data-v="dentro">Dentro<small>' + fmtT(r.lo - 3) + '–' + fmtT(r.hi + 3) + '</small></button>' +
        '<button type="button" class="bad" data-z="cat" data-v="lenta">Lenta<small>más de ' + fmtT(r.hi + 3) + '</small></button>' +
        '<button type="button" class="warn" data-z="cat" data-v="rapida">Rápida<small>menos de ' + fmtT(r.lo - 3) + '</small></button></div>');
      if (FZ.exacto) {
        if (FZ.tval === undefined || FZ.tval === null) FZ.tval = r.lo;
        h.push('<div class="hoy-fz-t"><div class="stepper" role="group" aria-label="Tiempo exacto"><button type="button" data-z="tst" data-d="-0.5" aria-label="Medio segundo menos">−</button>' +
          (FZ.escribir ? '<input type="text" inputmode="decimal" autocomplete="off" data-z="tin" value="' + fmtT(FZ.tval) + '" aria-label="Tiempo exacto">' : '<output class="num" data-z="tout" tabindex="0" aria-label="Tocar para escribir el tiempo">' + fmtT(FZ.tval) + '</output>') +
          '<button type="button" data-z="tst" data-d="0.5" aria-label="Medio segundo más">+</button></div><button type="button" class="btn pri" data-z="tok">Anotar ' + fmtT(FZ.tval) + '</button></div>');
      } else h.push('<button type="button" class="btn sec" data-z="exacto">Poner el tiempo</button>');
      if (FZ.color === 'ambar' && !S.ultima200) h.push('<p class="hoy-fz-l">' + esc((wsem().extras || [])[0] || '') + '</p><button type="button" class="btn sec" data-z="u200">Llegué a 200 ppm: esta es la última</button>');
      if (S.ultima200 && S.ultima200 === k + 1) h.push('<p class="hoy-fz-l"><b>Esta es la última.</b></p>');
      if (R.principal && R.principal.criterios && R.principal.tipo === 'km-partido') h.push('<ul class="hoy-fz-crit">' + R.principal.criterios.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>');
    }
    if (FZ.freno && frenoFrase(d)) h.push('<div class="aviso warn" role="note">' + PC.icon('alerta') + '<div><b>Freno</b> ' + esc(frenoFrase(d)) + '</div></div>');
    h.push(histHTML());
    if (FZ.fase === 'dos' || FZ.fase === 'corte') {
      var dos = FZ.fase === 'dos';
      h.push('<div class="hoy-fz-dos"><div class="aviso bad" role="alertdialog" aria-labelledby="hoy-fz-dos-t">' + PC.icon('alerta') + '<div><b id="hoy-fz-dos-t">' +
        (dos ? 'Regla de las dos repeticiones' : 'corte a ' + esc(FZ.seq[0].criterio.corte)) + '</b><p>' + esc(dos ? reglaTxt('dos-repeticiones') : (R.principal.desde || '')) + '</p>' +
        '<div class="hoy-fz-bb"><button type="button" class="btn pri lg" data-z="terminar">Terminar</button><button type="button" class="btn sec lg" data-z="seguir">Seguir (se anotará)</button></div></div></div></div>');
    }
    return h.join('');
  }
  function htmlRodaje() {
    var t = FZ.t && FZ.t.clave === 'hoy-rod-' + FZ.f ? FZ.t : null, el = t ? FZ.dur.seg - t.restante() : 0, h = [];
    FZ.diez = el >= 600;
    var otros = SES.pasos(FZ.dia, FZ.color, FZ.R).filter(function (q) { return !/^Rodaje|^Rodaje de/i.test(q.t) && !/rodaje de \d/i.test(q.t); });
    var antes = otros.filter(function (q) { return q.barra || /barra/i.test(q.t); });
    otros = otros.filter(function (q) { return antes.indexOf(q) < 0; });
    if (antes.length) h.push('<ul class="hoy-fz-crit">' + antes.map(function (q) { return '<li>' + esc(q.t) + '</li>'; }).join('') + '</ul>');
    h.push('<p class="focus-k">Rodaje · ' + esc(FZ.dur.txt) + ' · techo ' + esc(rs().techoFC || '') + '</p><p class="big num" data-z="big">' + PC.fmt.t(Math.floor(el)) + '</p>');
    h.push('<p class="hoy-fz-l" data-z="msg">' + esc(t && t.acabado() ? 'Tiempo cumplido' : (FZ.diez ? 'Desde aquí, techo ' + (rs().techoFC || '') : frases(rs().reglaDeSalida)[0] || '')) + '</p>');
    if (!t) h.push('<button type="button" class="btn pri lg block" data-z="rodar">Empezar</button>');
    else if (!t.acabado()) h.push('<div class="hoy-fz-ctl"><button type="button" class="btn sec" data-z="pausa">' + (t.activo() ? 'Pausa' : 'Seguir') + '</button><button type="button" class="btn sec" data-z="parar">Terminar</button><span></span></div>');
    if (otros.length) h.push('<ul class="hoy-fz-crit">' + otros.map(function (q) { return '<li>' + esc(q.t) + '</li>'; }).join('') + '</ul>');
    return h.join('');
  }
  function htmlControl() {
    var d = FZ.dia, R = FZ.R, p = R.principal || {}, S = ses(FZ.f), h = [];
    SES.pasos(d, FZ.color, R).forEach(function (q, i) {
      var act = i === FZ.paso, mil = /1\.000/.test(q.t);
      h.push('<section class="hoy-fz-card' + (act ? ' act' : '') + '"><h3>' + esc(q.t) + '</h3>' + (q.d ? '<p>' + esc(q.d) + '</p>' : ''));
      if (q.timer) {
        var t = FZ.t && FZ.t.clave === 'hoy-ctl-' + FZ.f ? FZ.t : null;
        h.push('<p class="big num" data-z="big">' + PC.fmt.t(Math.ceil(t ? t.restante() : q.timer)) + '</p>');
        h.push(t && !t.acabado() ? '<div class="hoy-fz-ctl"><button type="button" class="btn sec" data-z="mas15">+15 s</button><button type="button" class="btn sec" data-z="saltar">Saltar</button><button type="button" class="btn sec" data-z="pausa">' + (t.activo() ? 'Pausa' : 'Seguir') + '</button></div>' :
          '<button type="button" class="btn pri" data-z="espera" data-t="' + q.timer + '" data-i="' + i + '">' + (t ? 'Otra vez' : 'Empezar') + '</button>');
      }
      if (mil) {
        h.push(htmlReparto(d, p));
        if (p.criterios) h.push('<ul class="hoy-fz-crit">' + p.criterios.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>');
        var tv = S.mil ? fmtT(S.mil) : '', pts = S.mil ? PC.baremo.pts('mil', S.mil) : null;
        h.push('<label class="tin"><span>Final</span><input inputmode="decimal" autocomplete="off" placeholder="' + esc(p.obj || '') + '" data-z="mil" value="' + esc(tv) + '" aria-label="Tiempo final del 1.000">' +
          '<em class="dv' + (pts === 0 ? ' bad' : '') + '">' + (pts === null ? '' : pts === 0 ? 'elimina' : pts + ' pts') + '</em></label>');
        var par = S.parciales || [];
        h.push('<p class="hoy-fz-l">Parciales de 200, opcionales</p><div class="hoy-fz-par">' + [0, 1, 2, 3, 4].map(function (j) {
          return '<label>' + TRAMO200[j] + ' m<input inputmode="decimal" autocomplete="off" data-z="par" data-j="' + j + '" value="' + esc(par[j] ? PC.fmt.num(par[j]) : '') + '" placeholder="' + ph200(p) + '"></label>';
        }).join('') + '</div>');
      }
      if (q.enlace) h.push('<p class="hoy-enl"><a href="' + esc(q.enlace.href) + '">' + esc(/dominada/.test(q.enlace.href) ? 'Contador de válidas →' : /mil/.test(q.enlace.href) ? 'Reparto del 1.000 →' : q.enlace.txt) + '</a></p>');
      if (act && i < 2) h.push('<button type="button" class="btn ghost" data-z="paso" data-i="' + (i + 1) + '">Hecho: siguiente paso</button>');
      h.push('</section>');
    });
    h.push('<button type="button" class="btn pri lg block" data-z="fue">Apuntar cómo fue</button>');
    return h.join('');
  }
  var TRAMO200 = ['0–200', '200–400', '400–600', '600–800', '800–1.000'];
  /* marcador de los parciales: el primer paso del reparto del día (0:42 → 42,0) */
  function ph200(p) { var r = p && p.repartos && p.repartos.objetivo, v = r ? PC.fmt.parseT(r[0]) : null; return v ? PC.fmt.num(v, 1) : ''; }
  function circulos(g) {
    var out = [], bs = g.bloques, n = Math.max.apply(null, bs.map(function (b) { return parseInt(b.series, 10) || 1; }));
    for (var i = 0; i < n; i++) bs.forEach(function (b, j) {
      if (i < (parseInt(b.series, 10) || 1)) out.push({ k: b.clave + '-' + i, lab: (/^[HI]$/.test(b.clave) ? 'R' : b.clave) + (i + 1), clave: b.clave, i: i, timer: j === bs.length - 1 });
    });
    return out;
  }
  function htmlGym() {
    var F = FZ.R.fuerza, G = FZ.g, h = [], d = FZ.dia, t = FZ.t && /^hoy-gym-/.test(FZ.t.clave) ? FZ.t : null;
    h.push('<div class="hoy-gtimer">' + (t && !t.acabado() ? '<p class="focus-k">Descanso · ' + esc(FZ.gtLab || '') + '</p><p class="big num" data-z="big">' + PC.fmt.t(Math.ceil(t.restante())) + '</p>' +
      '<div class="hoy-fz-ctl"><button type="button" class="btn sec" data-z="mas15">+15 s</button><button type="button" class="btn sec" data-z="saltar">Saltar</button><button type="button" class="btn sec" data-z="pausa">' + (t.activo() ? 'Pausa' : 'Seguir') + '</button></div>' :
      '<p class="hoy-fz-l">Toca el círculo al acabar cada serie: el descanso arranca solo.</p>') + '</div>');
    var vid = /vídeo lateral y frontal de la 1\.ª y la 5\.ª/i.exec(d.objetivo || ''), res = /Si la quinta deja 1 en reserva o menos, es la última serie/.exec(d.objetivo || '');
    if (!F) return h.join('');
    F.grupos.forEach(function (g, gi) {
      var tit = g.claves.join(' + ') + ' · ' + g.bloques.map(function (b) { return b.ejercicio; }).join(' + ');
      h.push('<section class="hoy-gb" data-g="' + gi + '"><h3>' + esc(tit) + '</h3><div class="chips">');
      g.bloques.forEach(function (b) {
        var ronda = /^[HI]$/.test(b.clave), pc = pesoCorto(b.peso);
        h.push('<span class="chip">' + esc((g.claves.length > 1 ? b.clave + ' ' : '') + (ronda ? b.series + ' rondas' : b.series + ' × ' + b.reps)) + '</span>' + (pc ? '<span class="chip">' + esc(pc) + '</span>' : ''));
      });
      if (g.descanso) h.push('<span class="chip">descanso ' + esc(PC.fmt.t(g.descanso)) + '</span>');
      h.push('</div>');
      if (g.claves[0] === 'A') { if (vid) h.push('<p class="hoy-rec">' + esc(mayus(vid[0])) + '</p>'); if (res) h.push('<p class="hoy-rec">' + esc(res[0]) + '</p>'); }
      h.push('<div class="hoy-circ" role="group" aria-label="Series de ' + esc(g.claves.join(' y ')) + '">' + circulos(g).map(function (c) {
        return '<button type="button" data-z="serie" data-k="' + c.k + '" data-g="' + gi + '" data-tm="' + (c.timer ? 1 : 0) + '" aria-pressed="' + (G.series[c.k] ? 'true' : 'false') + '" aria-label="' + esc(c.lab) + '">' + esc(c.lab) + '</button>';
      }).join('') + '</div>');
      var A = g.claves[0] === 'A' ? g.bloques[0] : null, nA = A ? parseInt(A.series, 10) : 0;
      if (A && G.series['A-' + (nA - 1)]) {
        h.push('<div class="hoy-rec"><span class="hoy-opt-t">Reserva de la 5.ª</span>' + segHTML('reserva5', G.reserva5 === null || G.reserva5 === undefined ? null : String(G.reserva5), [['0', '0'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4']], 'Reserva de la quinta serie').replace(/data-s=/g, 'data-z="res" data-s=') + '</div>');
        if (G.reserva5 !== null && G.reserva5 !== undefined && +G.reserva5 <= 1 && res) h.push('<p class="hoy-rec"><b>' + esc(res[0]) + '</b></p>');
      }
      h.push('</section>');
    });
    h.push('<section class="hoy-fz-fin"><h3>Al terminar</h3><div class="hoy-fue-st"><div>Codo (0–10)' + stepperHTML('codo', G.codo, 'Codo, de 0 a 10').replace(/data-st=/g, 'data-z="gst" data-st=') + '</div>' +
      '<div>Hombro (0–10)' + stepperHTML('hombro', G.hombro, 'Hombro, de 0 a 10').replace(/data-st=/g, 'data-z="gst" data-st=') + '</div></div>');
    var pr = frases(F.mf.prioridad); if (pr.length) h.push('<p class="hoy-pie-f">' + esc(pr[pr.length - 1]) + '</p>');
    h.push('<button type="button" class="btn pri lg block" data-z="fue">Apuntar cómo fue</button></section>');
    return h.join('');
  }
  function pintarFocus() {
    if (!FZ) return;
    var b = PC.focus.cuerpo(); if (!b) return;
    var h = ['<div class="hoy-fz">'];
    h.push(avisoConflicto(FZ.dia));
    if (FZ.R.conds.length && !(FZ.tipo === 'rodaje' && FZ.R.tpl === 'series')) h.push(htmlConds(FZ.dia, FZ.R));
    if (FZ.tipo === 'series') h.push(htmlSeries());
    else if (FZ.tipo === 'rodaje') h.push(htmlRodaje());
    else if (FZ.tipo === 'control') h.push(htmlControl());
    else if (FZ.tipo === 'gym') h.push(htmlGym());
    else h.push('<p class="focus-k">' + esc(SES.haces(FZ.dia, FZ.color, FZ.R)) + '</p>' + (FZ.dia.tipo === 'prueba' ? htmlReparto(FZ.dia, FZ.R.principal) : ''));
    h.push('</div>');
    b.innerHTML = h.join('');
    var foco = b.querySelector('.hoy-fz-dos button, .rep-btns button');
    if (foco && FZ.fase !== 'rec') { try { foco.focus({ preventScroll: true }); } catch (e) {} }
  }
  function clickFocus(e) {
    if (!FZ) return;
    var a = e.target.closest('a[href^="#"]'); if (a) { PC.focus.cerrar(); return; }
    var t = e.target.closest('[data-z],[data-a="cond"]'); if (!t) return;
    var z = t.getAttribute('data-z');
    PC.audio.desbloquear();
    if (t.getAttribute('data-a') === 'cond') {
      var cd = FZ.R.conds[+t.getAttribute('data-ci')]; if (!cd) return;
      COND.guardar(FZ.dia, cd, t.getAttribute('aria-pressed') === 'true' && cd.tipo !== 'prueba' ? null : t.getAttribute('data-v'));
      PC.cal._reiniciar(); cargarFZ(); pintarFocus();
      var ft = DOC.querySelector('#focus .focus-t'); if (ft) ft.textContent = tituloFocus(FZ.dia, FZ.R, FZ.color);
      return;
    }
    if (z === 'cat') { anotar(t.getAttribute('data-v')); return; }
    if (z === 'exacto') { FZ.exacto = true; FZ.tval = null; FZ.escribir = false; pintarFocus(); return; }
    if (z === 'tst') { FZ.tval = Math.max(0, Math.round(((FZ.tval || 0) + parseFloat(t.getAttribute('data-d'))) * 10) / 10); pintarFocus(); return; }
    if (z === 'tout') { FZ.escribir = true; pintarFocus(); var i = PC.focus.cuerpo().querySelector('[data-z="tin"]'); if (i) { i.focus(); i.select(); } return; }
    if (z === 'tok') { var r = FZ.seq[FZ.reps.length]; if (r && FZ.tval) anotar(catDe(r, FZ.tval), FZ.tval); return; }
    if (z === 'u200') { guardarSes(FZ.f, { ultima200: FZ.reps.length + 1 }); pintarFocus(); return; }
    if (z === 'deshacer') {
      if (FZ.t) { FZ.t.parar(); FZ.t = null; }
      if (FZ.tipo === 'series' && FZ.reps.length) { FZ.reps.pop(); guardarSes(FZ.f, { reps: FZ.reps, aviso2: dosSeguidas(FZ.reps) }); FZ.fase = 'rep'; FZ.freno = false; }
      pintarFocus(); return;
    }
    if (z === 'terminar') { FZ.fase = 'fin'; if (FZ.t) { FZ.t.parar(); FZ.t = null; } pintarFocus(); return; }
    if (z === 'seguir') { seguirTras(FZ.reps.length - 1); pintarFocus(); return; }
    if (z === 'mas15' && FZ.t) { FZ.t.sumar(15); return; }
    if (z === 'saltar' && FZ.t) { FZ.t.saltar(); return; }
    if (z === 'pausa' && FZ.t) { if (FZ.t.activo()) FZ.t.pausa(); else FZ.t.empezar(); pintarFocus(); return; }
    if (z === 'rodar') {
      timerFZ(FZ.dur.seg, 'hoy-rod-' + FZ.f, function () { msgFZ('Tiempo cumplido'); bigFZ(FZ.dur.txt); pintarFocus(); });
      pintarFocus(); return;
    }
    if (z === 'parar' && FZ.t) { guardarSes(FZ.f, { min: Math.round((FZ.dur.seg - FZ.t.restante()) / 60) }); FZ.t.parar(); FZ.t = null; PC.focus.cerrar(); return; }
    if (z === 'espera') { FZ.paso = +t.getAttribute('data-i'); timerFZ(+t.getAttribute('data-t'), 'hoy-ctl-' + FZ.f, function () { FZ.paso = Math.min(2, FZ.paso + 1); pintarFocus(); }); pintarFocus(); return; }
    if (z === 'paso') { FZ.paso = +t.getAttribute('data-i'); pintarFocus(); return; }
    if (z === 'serie') {
      var k = t.getAttribute('data-k'), on = !FZ.g.series[k];
      FZ.g.series[k] = on; guardarSes(FZ.f, { gym: FZ.g });
      if (on && t.getAttribute('data-tm') === '1') {
        var g = FZ.R.fuerza.grupos[+t.getAttribute('data-g')];
        FZ.gtLab = g.claves.join(' + ');
        timerFZ(g.descanso || 45, 'hoy-gym-' + FZ.f, function () { pintarFocus(); });
      }
      pintarFocus(); return;
    }
    if (z === 'res') { FZ.g.reserva5 = +t.getAttribute('data-v'); guardarSes(FZ.f, { gym: FZ.g }); pintarFocus(); return; }
    if (z === 'gst') { var c = t.getAttribute('data-st'); FZ.g[c] = Math.max(0, Math.min(10, (+FZ.g[c] || 0) + (+t.getAttribute('data-d')))); guardarSes(FZ.f, { gym: FZ.g }); pintarFocus(); return; }
    if (z === 'fue') { var d = FZ.dia; PC.focus.cerrar(); if (!PC.sheet.abierta()) abrirFue(d); return; }
  }
  function changeFocus(e) {
    if (!FZ) return;
    var t = e.target, z = t.getAttribute('data-z');
    if (z === 'tin') { var v = PC.fmt.parseT(t.value); if (v) FZ.tval = v; FZ.escribir = false; pintarFocus(); return; }
    if (z === 'mil') { var m = PC.fmt.parseT(t.value); guardarSes(FZ.f, { mil: m }); pintarFocus(); return; }
    if (z === 'par') { var S = ses(FZ.f), par = (S.parciales || [null, null, null, null, null]).slice(); par[+t.getAttribute('data-j')] = PC.fmt.parseT(t.value); guardarSes(FZ.f, { parciales: par }); return; }
  }
  function hayDatos(S) {
    if (!S) return false;
    if (S.reps && S.reps.length) return true;
    if (S.mil || S.min) return true;
    var g = S.gym; return !!(g && Object.keys(g.series || {}).some(function (k) { return g.series[k]; }));
  }
  function alCerrarModo() {
    if (!FZ) return;
    var d = FZ.dia, f = FZ.f;
    if (FZ.t) {
      if (FZ.tipo === 'rodaje' && FZ.t.restante() < FZ.dur.seg) guardarSes(f, { min: Math.round((FZ.dur.seg - FZ.t.restante()) / 60) });
      FZ.t.parar();
    }
    FZ = null;
    if (UI.card && UI.card.__fecha === f) pintarTarjeta(UI.card);
    if (hayDatos(ses(f)) && !(ses(f).fue && ses(f).fue.t)) setTimeout(function () { if (!PC.sheet.abierta() && !PC.focus.abierto()) abrirFue(d); }, 30);
  }

  /* ================================================================ T4 · Cómo fue (hoja) y «Copiar para el entrenador» */
  function tipoFue(dia, R) {
    if (dia.tipo === 'fuerza') return 'fuerza';
    if (dia.tipo === 'circuito') return 'circuito';
    if (R.tpl === 'control') return 'control';
    if (esRodaje(R, R.color)) return 'rodaje';
    if (R.tpl === 'series' && R.principal) return 'series';
    return 'otro';
  }
  function ctxFue(dia) {
    var color = colorTarjeta(dia, relDe(dia.fecha)), R = SES.contexto(dia, color === 'parada' ? 'verde' : color);
    R.color = color;
    return R;
  }
  /* valores de la hoja: lo guardado en «Cómo fue» manda; si no, lo del modo pista o gimnasio y el semáforo */
  function datosFue(dia, R) {
    var S = ses(dia.fecha), g = S.gym || {}, sm = SEM.leer(dia.fecha) || {}, o = {};
    o.talon = sm.talon || 'nada'; o.cintillo = sm.cintillo || 'nada';
    o.codo = g.codo || 0; o.hombro = g.hombro || 0; o.reserva5 = g.reserva5 === undefined ? null : g.reserva5; o.lastre = g.lastre || null;
    o.mil = S.mil || null; o.parciales = S.parciales || null; o.min = S.min || null; o.nota = '';
    if (R.fuerza) {
      var A = R.fuerza.bloques.A, nA = A ? parseInt(A.series, 10) || 0 : 0;
      o.repsA = []; for (var i = 0; i < nA; i++) o.repsA.push(g.series && g.series['A-' + i] ? String(A.reps) : '');
      if (!o.lastre && A) o.lastre = pesoCorto(A.peso);
      o.bloques = R.fuerza.grupos.filter(function (gr) { var cs = circulos(gr); return cs.length && cs.every(function (c) { return g.series && g.series[c.k]; }); }).map(function (gr) { return gr.claves.join('+'); });
    }
    return mezclar(o, S.fue || {});
  }
  function guardarFue(f, cambio) {
    var S = ses(f), fu = mezclar(S.fue || {}, cambio); fu.t = Date.now();
    guardarSes(f, { fue: fu });
  }
  function semTxt(f) {
    var s = SEM.salida(f); if (!s || !s.color) return 'semáforo sin rellenar';
    var g = s.entrada || {}, p = [];
    if (s.min !== null && s.min !== undefined) p.push(PC.fmt.sueno(s.min));
    p.push(g.reloj === 'vfc' ? 'VFC de 7 días desequilibrada o baja' : g.reloj === 'sobrecarga' ? 'sobrecarga' : 'reloj normal');
    if (g.sintomas === 'encima') p.push('síntomas por encima del cuello'); else if (g.sintomas === 'debajo') p.push('síntomas por debajo del cuello');
    return 'semáforo ' + NCOLOR[s.color].toLowerCase() + ' (' + p.join(', ') + ')';
  }
  function repsDe(dia, R) {
    var seq = SES.secuencia(R.principal, R.color), S = ses(dia.fecha);
    return { seq: seq, reps: (S.reps || []).slice(0, seq.length), crit: !!(seq[0] && seq[0].criterio) };
  }
  function resumenSeriesTxt(dia, R, X) {
    var p = R.principal || {}, d;
    if (p.tipo === 'series') d = p.n + ' × ' + p.dist + ' a ' + p.obj;
    else if (p.tipo === 'km-partido') d = 'kilómetro partido × ' + (p.nColor || 1) + ' (' + (p.partes || []).filter(function (x) { return x.dist; }).map(function (x) { return x.dist + ' en ' + x.obj; }).join(' + ') + ')';
    else d = (p.partes || []).map(function (x) { return ((x.n || 1) > 1 ? x.n + ' × ' : '') + x.dist + ' a ' + x.obj; }).join(' + ');
    return d + ' · ' + resumenCats(X.reps, X.crit) + (X.crit ? '' : ' · dos repeticiones: ' + (dosSeguidas(X.reps) || ses(dia.fecha).aviso2 ? 'sí' : 'no'));
  }
  function textoCopia(dia) {
    var R = ctxFue(dia), tipo = tipoFue(dia, R), fu = datosFue(dia, R), f = dia.fecha, L = [], lug = lugarCorto(dia);
    var cab = PC.fmt.dia(f, 'corta') + (lug ? ' · ' + lug : '') + ' · ' + semTxt(f);
    var dolor = (fu.talon && fu.talon !== 'nada' ? 'talón: duele' : '') + (fu.cintillo && fu.cintillo !== 'nada' ? (fu.talon !== 'nada' ? ' · ' : '') + 'cintillo: ' + (fu.cintillo === 'noto' ? 'lo noto' : 'molesta al correr') : '');
    if (tipo === 'series') {
      var X = repsDe(dia, R);
      L.push(PC.fmt.dia(f, 'corta') + ' · ' + resumenSeriesTxt(dia, R, X));
      L.push(mayus(semTxt(f)));
      var ts = X.reps.filter(function (x) { return x.t; });
      if (ts.length) L.push('Tiempos: ' + X.reps.map(function (x) { return x.t ? fmtT(x.t) : '—'; }).join(' · '));
      if (dolor) L.push(mayus(dolor));
    } else {
      L.push(cab);
      if (tipo === 'fuerza') {
        var rA = (fu.repsA || []).map(function (x) { return x === '' || x === null || x === undefined ? '?' : x; });
        if (rA.some(function (x) { return x !== '?'; }) || fu.lastre) L.push('A: ' + (rA.length ? rA.join('-') : '?') + (fu.lastre ? ' con ' + fu.lastre : '') + (fu.reserva5 !== null && fu.reserva5 !== undefined ? ' · reserva de la 5.ª: ' + fu.reserva5 : ''));
        L.push('Codo ' + (+fu.codo || 0) + '/10 · hombro ' + (+fu.hombro || 0) + '/10 al terminar');
        if (fu.bloques && fu.bloques.length) L.push('Hecho: ' + fu.bloques.join(', '));
      } else if (tipo === 'rodaje') {
        L.push('Rodaje: ' + (fu.min ? fu.min + ' min' : 'sin apuntar los minutos'));
        if (dolor) L.push(mayus(dolor));
      } else if (tipo === 'circuito') {
        var cr = PC.herr && PC.herr.cirResumen ? PC.herr.cirResumen(f) : null;
        L.push(cr && cr.texto ? cr.texto : 'Circuito: sin registro de intentos');
      } else if (tipo === 'control') {
        var dm2 = PC.herr && PC.herr.dom ? PC.herr.dom(f) : null;
        if (dm2) L.push('Dominadas: contadas ' + dm2.contadas + ' · válidas ' + dm2.validas + (dm2.pts !== undefined && dm2.pts !== null ? ' (' + dm2.pts + ' pts)' : ''));
        if (fu.mil) L.push('1.000: ' + fmtT(fu.mil) + ' (' + PC.baremo.pts('mil', fu.mil) + ' pts)' + ((fu.parciales || []).some(function (x) { return x; }) ? ' · parciales ' + fu.parciales.map(function (x) { return x ? PC.fmt.num(x) : '—'; }).join(' · ') : ''));
      }
    }
    if (fu.nota && String(fu.nota).trim()) L.push('Nota: ' + String(fu.nota).trim().replace(/\s*\n\s*/g, ' '));
    return L.join('\n');
  }
  function segFue(k, v, ops, etq, extra) {
    return '<div class="seg" role="group" aria-label="' + esc(etq) + '">' + ops.map(function (o) {
      return '<button type="button" data-fk="' + k + '"' + (extra || '') + ' data-v="' + o[0] + '" aria-pressed="' + (String(v) === String(o[0]) ? 'true' : 'false') + '">' + esc(o[1]) + '</button>';
    }).join('') + '</div>';
  }
  function stFue(k, v, etq) {
    return '<div class="stepper" role="group" aria-label="' + esc(etq) + '"><button type="button" data-fst="' + k + '" data-d="-1" aria-label="Menos">−</button><output class="num">' + (+v || 0) + '</output><button type="button" data-fst="' + k + '" data-d="1" aria-label="Más">+</button></div>';
  }
  function campo(t, html) { return '<div class="hoy-fue-c"><span class="hoy-fue-t">' + esc(t) + '</span>' + html + '</div>'; }
  function htmlFue(dia) {
    var R = ctxFue(dia), tipo = tipoFue(dia, R), fu = datosFue(dia, R), f = dia.fecha, h = [];
    if (dia.registro) h.push('<div class="aviso info" role="note">' + PC.icon('info') + '<div><b>Qué apuntar</b> ' + esc(dia.registro) + '</div></div>');
    var dolor = campo('Talón al dar los primeros pasos', segFue('talon', fu.talon, [['nada', 'Nada'], ['duele', 'Duele']], 'Talón')) +
      campo('Cintillo (rodilla izquierda)', segFue('cintillo', fu.cintillo, [['nada', 'Nada'], ['noto', 'Lo noto'], ['molesta', 'Molesta al correr']], 'Cintillo'));
    if (tipo === 'series') {
      var X = repsDe(dia, R), n = Math.max(X.reps.length, X.seq.length);
      h.push('<div class="hoy-fue-c"><span class="hoy-fue-t">Cada repetición</span>');
      for (var i = 0; i < n; i++) {
        var r = X.seq[i] || X.seq[X.seq.length - 1], x = X.reps[i] || {};
        var ops = r.criterio ? [['ok', 'Dentro'], ['fuera', 'Fuera'], ['corte', 'Corte']] : [['dentro', 'Dentro'], ['lenta', 'Lenta'], ['rapida', 'Rápida']];
        var cv = r.criterio && /^(bajo|f1|f2)$/.test(x.cat || '') ? 'fuera' : x.cat;
        h.push('<div class="hoy-fue-rep"><span>' + (i + 1) + ' · ' + r.dist + '</span>' + segFue('rep', cv, ops, 'Repetición ' + (i + 1), ' data-i="' + i + '"') +
          '<input type="text" inputmode="decimal" autocomplete="off" data-fi="t" data-i="' + i + '" value="' + esc(x.t ? fmtT(x.t) : '') + '" placeholder="' + esc(r.obj) + '" aria-label="Tiempo de la repetición ' + (i + 1) + ', opcional"></div>');
      }
      h.push('<p class="hoy-linea">' + esc(resumenCats(X.reps, X.crit) + (X.crit ? '' : ' · dos repeticiones: ' + (dosSeguidas(X.reps) || ses(f).aviso2 ? 'sí' : 'no'))) + '</p></div>');
      if (R.principal && R.principal.tipo === 'series' && !X.crit && PC.graf && PC.graf.series && X.reps.length) h.push('<div class="hoy-fue-g"></div>');
      h.push(dolor);
    } else if (tipo === 'rodaje') {
      h.push(campo('Minutos reales', '<input type="text" inputmode="numeric" autocomplete="off" data-fi="min" value="' + esc(fu.min || '') + '" placeholder="' + esc(durRodaje(dia, R, R.color).txt) + '" aria-label="Minutos reales">'));
      h.push(dolor);
    } else if (tipo === 'fuerza') {
      h.push(campo('Repeticiones por serie de A', '<div class="hoy-fue-a">' + (fu.repsA || []).map(function (v, i) {
        return '<input type="text" inputmode="numeric" autocomplete="off" data-fi="repA" data-i="' + i + '" value="' + esc(v) + '" aria-label="Serie ' + (i + 1) + ' de A">';
      }).join('') + '</div>'));
      h.push(campo('Lastre', '<input type="text" inputmode="decimal" autocomplete="off" data-fi="lastre" value="' + esc(fu.lastre || '') + '" aria-label="Lastre">'));
      h.push(campo('Reserva de la 5.ª', segFue('reserva5', fu.reserva5, [['0', '0'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4']], 'Reserva de la quinta serie')));
      h.push('<div class="hoy-fue-st"><div>Codo al terminar (0–10)' + stFue('codo', fu.codo, 'Codo, de 0 a 10') + '</div><div>Hombro al terminar (0–10)' + stFue('hombro', fu.hombro, 'Hombro, de 0 a 10') + '</div></div>');
      h.push(campo('Bloques hechos', '<div class="chips">' + R.fuerza.grupos.map(function (g) {
        var k = g.claves.join('+'); return '<button type="button" class="chip" data-fb="' + k + '" aria-pressed="' + ((fu.bloques || []).indexOf(k) >= 0 ? 'true' : 'false') + '">' + esc(k) + '</button>';
      }).join('') + '</div>'));
    } else if (tipo === 'circuito') {
      var cr = PC.herr && PC.herr.cirResumen ? PC.herr.cirResumen(f) : null;
      h.push(campo('Intentos', '<p class="hoy-linea">' + (cr && cr.texto ? esc(cr.texto) : 'Los intentos se apuntan en la tarjeta del día.') + '</p>'));
    } else if (tipo === 'control') {
      var dm2 = PC.herr && PC.herr.dom ? PC.herr.dom(f) : null;
      h.push(campo('Dominadas', '<p class="hoy-linea">' + (dm2 ? 'contadas ' + dm2.contadas + ' · válidas ' + dm2.validas : 'Sin contar todavía.') + ' <a href="#tecnica/dominada">Contador de válidas →</a></p>'));
      var pts = fu.mil ? PC.baremo.pts('mil', fu.mil) : null;
      h.push(campo('Tiempo del 1.000', '<label class="tin"><span>1.000</span><input inputmode="decimal" autocomplete="off" data-fi="mil" value="' + esc(fu.mil ? fmtT(fu.mil) : '') + '" placeholder="' + esc((R.principal || {}).obj || '') + '" aria-label="Tiempo del 1.000">' +
        '<em class="dv' + (pts === 0 ? ' bad' : '') + '">' + (pts === null ? '' : pts === 0 ? 'elimina' : pts + ' pts') + '</em></label><div class="hoy-mini"></div>'));
      h.push(campo('Parciales de 200', '<div class="hoy-fz-par">' + [0, 1, 2, 3, 4].map(function (j) {
        var v = (fu.parciales || [])[j];
        return '<label>' + TRAMO200[j] + ' m<input inputmode="decimal" autocomplete="off" data-fi="par" data-j="' + j + '" value="' + esc(v ? PC.fmt.num(v) : '') + '" placeholder="' + ph200(R.principal) + '"></label>';
      }).join('') + '</div>'));
    }
    h.push('<div class="hoy-fue-c"><label for="hoy-fue-nota">Nota</label><textarea id="hoy-fue-nota" rows="2" data-fi="nota">' + esc(fu.nota || '') + '</textarea></div>');
    h.push('<button type="button" class="btn pri block" data-fa="copiar">' + PC.icon('copiar', 'sm') + 'Copiar para el entrenador</button>');
    h.push('<pre class="hoy-copia" aria-label="Texto que se copia">' + esc(textoCopia(dia)) + '</pre>');
    h.push('<p class="hoy-fue-pie">Se guarda en este móvil. Lo que cuenta es lo que le mandes al entrenador</p>');
    return h.join('');
  }
  function dibujarMini(box, dia) {
    var host = box.querySelector('.hoy-mini'); if (!host) return;
    var t = datosFue(dia, ctxFue(dia)).mil, w = Math.max(240, Math.floor(host.clientWidth || 300)), s0 = 250, s1 = 195, el = PC.baremo.ELIMINA_MIL || 229;
    function x(s) { return Math.max(0, Math.min(w, (s0 - s) / (s0 - s1) * w)); }
    function col(p) { return p === 0 ? 'var(--elim)' : 'var(--p' + Math.min(5, Math.ceil(p / 2)) + ')'; }
    var H = t ? 64 : 44, s = ['<svg width="' + w + '" height="' + H + '" viewBox="0 0 ' + w + ' ' + H + '" role="img" aria-label="Baremo del 1.000: 3:49 o más elimina' + (t ? '; tu tiempo ' + fmtT(t) + ', ' + PC.baremo.pts('mil', t) + ' puntos' : '') + '">'];
    PC.baremo.tramos('mil').forEach(function (tr) {
      var a = x(tr.max === null ? s0 : tr.max + 1), b = x(tr.min);
      if (b - a < 0.5) return;
      s.push('<rect x="' + a.toFixed(1) + '" y="22" width="' + (b - a).toFixed(1) + '" height="14" style="fill:' + col(tr.pts) + '"' + (tr.pts === 0 ? ' data-umbral="229"' : '') + '/>');
    });
    s.push('<text class="hoy-mini-e" x="2" y="14" data-umbral="229">3:49 elimina</text><line x1="' + x(el).toFixed(1) + '" x2="' + x(el).toFixed(1) + '" y1="18" y2="40" style="stroke:var(--elim);stroke-width:2"/>');
    if (t) {
      var xm = x(t), an = xm > w - 60 ? 'end' : (xm < 60 ? 'start' : 'middle');
      s.push('<path d="M' + xm.toFixed(1) + ' 40l-5 8h10z" style="fill:var(--text)"/><text class="hoy-mini-m" x="' + xm.toFixed(1) + '" y="62" text-anchor="' + an + '">' + esc(fmtT(t) + ' · ' + PC.baremo.pts('mil', t) + ' pts') + '</text>');
    }
    s.push('</svg>');
    host.innerHTML = s.join('');
  }
  function pintarFue(box) {
    var dia = PC.cal.dia(box.__fecha); if (!dia) return;
    box.innerHTML = htmlFue(dia);
    dibujarMini(box, dia);
    var g = box.querySelector('.hoy-fue-g');
    if (g) { var R = ctxFue(dia), X = repsDe(dia, R); try { PC.graf.series(g, { fecha: dia.fecha, objetivo: R.principal.obj, reps: X.reps }); } catch (e) { PC._err('hoy · G5', e); } }
  }
  function actualizarCopia(box) { var p = box.querySelector('.hoy-copia'), d = PC.cal.dia(box.__fecha); if (p && d) p.textContent = textoCopia(d); }
  function abrirFue(dia) {
    if (!dia || !dia.fecha) return;
    var box = PC.el('div', { 'class': 'hoy-fue' });
    box.__fecha = dia.fecha;
    box.addEventListener('click', function (e) { try { clickFue(box, e); } catch (x) { PC._err('hoy · cómo fue', x); } });
    box.addEventListener('input', function () { actualizarCopia(box); });
    box.addEventListener('change', function (e) { try { changeFue(box, e); } catch (x) { PC._err('hoy · cómo fue', x); } });
    PC.sheet.abrir('Cómo fue · ' + PC.fmt.dia(dia.fecha, 'corta'), box, { alCerrar: function () { if (UI.card) pintarTarjeta(UI.card); } });
    pintarFue(box);
  }
  function clickFue(box, e) {
    var t = e.target.closest('button'); if (!t || !box.contains(t)) return;
    var f = box.__fecha, dia = PC.cal.dia(f), R = ctxFue(dia), fu = datosFue(dia, R);
    if (t.getAttribute('data-fa') === 'copiar') { guardarFue(f, {}); actualizarCopia(box); PC.copiar(textoCopia(dia)); return; }
    if (t.hasAttribute('data-fk')) {
      var k = t.getAttribute('data-fk'), v = t.getAttribute('data-v');
      if (k === 'rep') {
        var X = repsDe(dia, R), i = +t.getAttribute('data-i'), reps = X.reps.slice();
        while (reps.length <= i) reps.push({ cat: null, t: null });
        reps[i] = { cat: v, t: reps[i].t || null };
        guardarSes(f, { reps: reps, aviso2: dosSeguidas(reps) }); guardarFue(f, {});
      } else { var o = {}; o[k] = k === 'reserva5' ? +v : v; guardarFue(f, o); }
      pintarFue(box); return;
    }
    if (t.hasAttribute('data-fst')) { var c = t.getAttribute('data-fst'), o2 = {}; o2[c] = Math.max(0, Math.min(10, (+fu[c] || 0) + (+t.getAttribute('data-d')))); guardarFue(f, o2); pintarFue(box); return; }
    if (t.hasAttribute('data-fb')) {
      var b = t.getAttribute('data-fb'), bl = (fu.bloques || []).slice(), j = bl.indexOf(b);
      if (j >= 0) bl.splice(j, 1); else bl.push(b);
      var orden = R.fuerza.grupos.map(function (g) { return g.claves.join('+'); });
      bl.sort(function (a, z) { return orden.indexOf(a) - orden.indexOf(z); });
      guardarFue(f, { bloques: bl }); pintarFue(box); return;
    }
  }
  function changeFue(box, e) {
    var t = e.target, k = t.getAttribute('data-fi'); if (!k) return;
    var f = box.__fecha, dia = PC.cal.dia(f), R = ctxFue(dia), fu = datosFue(dia, R), v = t.value;
    if (k === 'nota') guardarFue(f, { nota: v });
    else if (k === 'min') guardarFue(f, { min: parseInt(v, 10) || null });
    else if (k === 'lastre') guardarFue(f, { lastre: v.trim() });
    else if (k === 'repA') { var ra = (fu.repsA || []).slice(); ra[+t.getAttribute('data-i')] = v.trim(); guardarFue(f, { repsA: ra }); }
    else if (k === 'mil') { var m = PC.fmt.parseT(v); guardarSes(f, { mil: m }); guardarFue(f, { mil: m }); pintarFue(box); return; }
    else if (k === 'par') { var p = (fu.parciales || [null, null, null, null, null]).slice(); p[+t.getAttribute('data-j')] = PC.fmt.parseT(v); guardarSes(f, { parciales: p }); guardarFue(f, { parciales: p }); }
    else if (k === 't') {
      var X = repsDe(dia, R), i = +t.getAttribute('data-i'), reps = X.reps.slice(), tv = PC.fmt.parseT(v);
      while (reps.length <= i) reps.push({ cat: null, t: null });
      var r = X.seq[i] || X.seq[X.seq.length - 1];
      reps[i] = { cat: tv ? (r.criterio && catDe(r, tv) !== 'ok' && catDe(r, tv) !== 'corte' ? 'fuera' : catDe(r, tv)) : reps[i].cat, t: tv };
      guardarSes(f, { reps: reps, aviso2: dosSeguidas(reps) }); guardarFue(f, {}); pintarFue(box); return;
    }
    actualizarCopia(box);
  }
})(window.PC);
