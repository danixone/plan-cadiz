/* Página de Cristina: Hoy, la semana y la cuenta atrás. Los datos van en window.CR (construir.py). */
(function () {
  var D = window.CR || { dias: [] };
  var POR = {};
  D.dias.forEach(function (d) { POR[d.fecha] = d; });
  function iso(dt) { return dt.getFullYear() + '-' + ('0' + (dt.getMonth() + 1)).slice(-2) + '-' + ('0' + dt.getDate()).slice(-2); }
  function deIso(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function mas(s, n) { var d = deIso(s); d.setDate(d.getDate() + n); return iso(d); }
  var q = /[?&]hoy=(\d{4}-\d{2}-\d{2})/.exec(location.search);
  var HOY = q ? q[1] : iso(new Date());
  var MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DSEM = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  function largo(s) { var d = deIso(s); return DSEM[d.getDay()] + ' ' + d.getDate() + ' de ' + MES[d.getMonth()]; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function corre(d) { return d && d.tipo && d.tipo !== 'otro'; }

  /* ---------- Hoy ---------- */
  var caja = document.getElementById('cr-hoy');
  var d = POR[HOY];
  var primero = D.dias.length ? D.dias[0].fecha : null;
  var h = [];
  if (!d) {
    if (primero && HOY < primero) { d = POR[primero]; h.push('<p class="cr-h-f">El plan empieza el ' + esc(largo(primero)) + '</p>'); }
    else h.push('<p class="cr-h-f">' + esc(largo(HOY)) + '</p><p class="cr-h-t">Fuera del plan</p><p>El plan termina con la prueba de 2027.</p>');
  } else {
    h.push('<p class="cr-h-f">Hoy · ' + esc(largo(HOY)) + ' · semana ' + d.sem + (d.descarga ? ' · descarga' : '') + '</p>');
  }
  if (d && corre(d)) {
    var hecho = (D.hechos || {})[d.fecha];
    caja.className = 'card cr-hoy' + (d.tipo === 'control' || d.tipo === 'prueba' ? ' ctl' : '');
    h.push('<p class="cr-h-t">' + esc(d.titulo) + '</p>');
    if (d.detalle) h.push('<p class="cr-h-d">' + esc(d.detalle) + '</p>');
    if (d.objetivo) h.push('<p class="cr-h-o">' + esc(d.objetivo) + '</p>');
    if (hecho) h.push('<p class="cr-h-sig"><b>' + (hecho.hecho === false ? 'No hecho' : 'Hecho') + '</b>' + (hecho.resumen ? ' · ' + esc(hecho.resumen) : '') + '</p>');
  } else if (d) {
    h.push('<p class="cr-h-t">' + esc(d.titulo) + '</p><p class="muted">No es de este plan: hoy no se corre.</p>');
    var f = d.fecha;
    for (var i = 1; i < 8; i++) { var n = POR[mas(f, i)]; if (corre(n)) { h.push('<p class="cr-h-sig">Próxima carrera, el ' + esc(largo(n.fecha)) + ': <b>' + esc(n.titulo) + '</b></p>'); break; } }
  }
  caja.innerHTML = h.join('');

  /* ---------- la semana ---------- */
  var sem = document.getElementById('cr-semana');
  var base = deIso(d ? d.fecha : HOY), lun = new Date(base); lun.setDate(base.getDate() - ((base.getDay() + 6) % 7));
  var LETRA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'], s = [];
  for (var k = 0; k < 7; k++) {
    var dd = new Date(lun); dd.setDate(lun.getDate() + k);
    var f2 = iso(dd), x = POR[f2];
    var cls = !x ? '' : (x.tipo === 'otro' ? 'otro' : (x.tipo === 'control' || x.tipo === 'prueba' ? 'corre ctl' : 'corre'));
    var lab = !x ? '' : (x.tipo === 'otro' ? (/CrossFit/.test(x.titulo) ? 'CrossFit' : 'Barra') : (x.tipo === 'control' ? 'Control' : (x.tipo === 'calidad' ? 'Series' : 'Suave')));
    s.push('<a href="?hoy=' + f2 + '#hoy" class="' + cls + '"' + (f2 === HOY ? ' aria-current="date"' : '') + '><span>' + LETRA[k] + '</span><b>' + dd.getDate() + '</b><span>' + lab + '</span></a>');
  }
  sem.innerHTML = s.join('');

  /* ---------- cuenta atrás y fase de ahora ---------- */
  var cu = document.getElementById('cr-cuenta');
  if (D.prueba) {
    var dias = Math.round((deIso(D.prueba) - deIso(HOY)) / 864e5);
    if (dias >= 0) cu.textContent = 'Quedan unos ' + dias + ' días hasta la prueba (fecha supuesta: 9 de octubre de 2027).';
  }
  if (d) {
    document.querySelectorAll('[data-fase="' + d.fase + '"]').forEach(function (el) {
      if (el.tagName === 'DETAILS') el.open = true; else el.classList.add('ahora');
    });
    var li = document.querySelector('.cr-d[data-fecha="' + d.fecha + '"]');
    if (li) li.classList.add('hoy');
  }
})();
