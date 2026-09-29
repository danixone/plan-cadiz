#!/usr/bin/env python3
"""Banco de pruebas de M6 (no forma parte de la web).

Toma out/index.html ya construido (mismo CSS en capas, tokens, núcleo PC y bloque de datos reales) y escribe
herramientas/ilus/prueba.html: una página que pinta con la API PC.ill el agente en todas sus poses, las escenas
I2, I3 e I4 en varios estados, ejemplos de uso para I8, I9 e I10 y las cinco láminas. Al final comprueba sola:
letra por debajo de 12 px (fuera de [data-deco]), ids repetidos, hexadecimales, data-umbral="229" en I2,
la punta del pie en x(s) ±1 px y la cota de margen = (229 − s) × 12. El resultado queda en <pre id="res">.

Uso:
  python3 build.py && python3 herramientas/ilus/prueba.py
  Chrome sin cabecera: prueba.html?tema=dark  (ancho con --window-size)
"""
import json, os, re

AQUI = os.path.dirname(os.path.abspath(__file__))
IMPL = os.path.abspath(os.path.join(AQUI, '..', '..'))
html = open(os.path.join(IMPL, 'out', 'index.html'), encoding='utf-8').read()

cuerpo = r'''
<div id="ill-prueba">
<style>
#ill-prueba{max-width:1120px;margin:0 auto;padding:16px}
#ill-prueba h2{font-size:22px;margin:24px 0 8px}
#ill-prueba .rej{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,420px),1fr));gap:16px}
#ill-prueba .caja{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px;min-width:0}
#ill-prueba .caja>p{margin:0 0 8px;font-size:14px;color:var(--text-3)}
#ill-prueba .lam{margin-bottom:16px}
#ill-prueba pre{white-space:pre-wrap;font-size:12px;background:var(--surface-2);padding:8px;border-radius:8px}
body>*:not(#ill-prueba):not(script):not(svg[hidden]){display:none!important}
</style>
<h2>Agente (poses)</h2>
<div class="caja"><p>corre · corre en contorno · fantasma 3:30 · celebra · de pie · arriba · valla · 24 px</p><div id="t-poses"></div></div>
<h2>I2 · Pista del 1.000</h2><div class="rej" id="t-i2"></div>
<h2>I3 · Barra</h2><div class="rej" id="t-i3"></div>
<h2>I4 · Valla</h2><div class="rej" id="t-i4"></div>
<h2>Uso por otros módulos: I8 (pista de la nota), I9 (carrera fantasma), I10 (camino)</h2><div class="rej" id="t-uso"></div>
<h2>Láminas</h2><div id="t-lam"></div>
<h2>Comprobación</h2><pre id="res">…</pre>
</div>
<script>
(function(){
  var ill = PC.ill;
  var solo = (location.search.match(/solo=(\w+)/) || [])[1];
  if (solo) [].forEach.call(document.querySelectorAll('#ill-prueba > h2, #ill-prueba > .caja, #ill-prueba > .rej'), function (e) {
    var id = (e.id || (e.nextElementSibling && e.nextElementSibling.id) || (e.querySelector('[id]') || {}).id || '');
    if (id.indexOf(solo) < 0) e.style.display = 'none';
  });
  function caja(dest, titulo){ var d=document.createElement('div'); d.className='caja'; d.innerHTML='<p>'+titulo+'</p><div class="h"></div>'; document.getElementById(dest).appendChild(d); return d.querySelector('.h'); }
  // poses
  var P = ill._poses, H = 120, x = 60, g = '';
  g += ill.corredor('corre',{h:H,x:x,y:150}); x+=110;
  g += ill.corredor('corre',{h:H,x:x,y:150,contorno:true}); x+=110;
  g += ill.corredor('corre',{h:H,x:x,y:150,contorno:'meta'}); x+=100;
  g += ill.corredor('celebra',{h:H,x:x,y:150}); x+=80;
  g += ill.corredor('dePie',{h:H,x:x,y:150}); x+=90;
  g += ill.corredor('arriba',{h:H,x:x,y:136}); x+=100;
  g += ill.corredor('valla',{h:H,x:x,y:150}); x+=110;
  g += ill.corredor('corre',{h:24,x:x,y:150}) + ill.corredor('corre',{h:24,x:x+40,y:150,contorno:true});
  document.getElementById('t-poses').innerHTML = '<svg class="ill" viewBox="0 0 860 170" style="max-width:860px">'+g+'</svg>';
  // I2
  [[214,true,'3:34 real (marcas de hoy)'],[214,false,'3:34 simulado'],[226,true,'3:46 real'],[212,true,'3:32 real'],
   [229,true,'3:49 real: elimina'],[240,false,'4:00 simulado'],[210,true,'3:30 real: celebra'],[205,false,'3:25 simulado'],[190,true,'3:10 real']]
   .forEach(function(c){ ill.pista1000(caja('t-i2', c[2]), {s:c[0], real:c[1]}); });
  // I3
  [[11,false,true,'11 autoinformadas (hoy)'],[12,true,true,'12 válidas en vídeo'],[15,false,false,'15 simuladas'],[3,false,true,'3 reales: elimina']]
   .forEach(function(c){ ill.barra(caja('t-i3', c[3]), {reps:c[0], validado:c[1], real:c[2]}); });
  // I4
  ill.valla(caja('t-i4','9,9 al 60 % (hoy): sin medir'), {t:9.9, real:false, etiqueta:'al 60 %'});
  ill.valla(caja('t-i4','9,4 medido'), {t:9.4, real:true});
  ill.valla(caja('t-i4','simulado 10,2 sin medición'), {t:10.2, real:false, etiqueta:'simulado'});
  ill.valla(caja('t-i4','sin dato'), {t:null});
  // I8: pista de la nota (lo dibuja M4 con PC.ill.corredor)
  (function(){
    var h = caja('t-uso','I8 · pista de la nota 0–10: agente relleno en la media real 4,67 y en contorno en el escenario 5,67');
    var w = 400, X = function(v){ return 20 + v*36; }, s='';
    s += '<rect x="20" y="96" width="360" height="10" rx="5" style="fill:var(--surface-3)"/>';
    s += '<rect x="'+X(5)+'" y="84" width="3" height="34" style="fill:var(--ill-meta)"/><text x="'+(X(5)+6)+'" y="80" font-size="19" font-weight="700" style="fill:var(--ill-meta)">5,00 apto</text>';
    s += ill.corredor('corre',{h:70,x:X(4.67),y:101,ancla:'pie'}) + ill.corredor('corre',{h:70,x:X(5.67),y:101,ancla:'pie',contorno:true});
    h.innerHTML = '<svg viewBox="0 0 400 124" style="display:block;width:100%;max-width:560px;margin:0 auto">'+s+'</svg>';   /* sin .ill: como en G1 */
  })();
  // I9: carrera fantasma (la dibuja M5)
  (function(){
    var h = caja('t-uso','I9 · carrera fantasma: tú (contorno, preset) y 3:30 (contorno --ill-meta); el 3:49 es una raya');
    var s = '<rect x="10" y="40" width="380" height="30" style="fill:var(--ill-pista)"/><rect x="10" y="90" width="380" height="30" style="fill:var(--ill-pista)"/>';
    s += ill.corredor('corre',{h:44,x:370,y:66,ancla:'pie',contorno:true}) + ill.corredor('corre',{h:44,x:372,y:116,ancla:'pie',contorno:'meta'});
    s += '<g data-umbral="229"><path d="M300 30V128" style="stroke:var(--elim)" stroke-width="2"/><text x="296" y="24" font-size="19" font-weight="700" text-anchor="end" style="fill:var(--bad)">3:49 · 83 m detrás</text></g>';
    h.innerHTML = '<svg class="ill ill-esc" viewBox="0 0 400 134">'+s+'</svg>';
  })();
  // I10: camino a Cádiz (lo dibuja M2): agente de 24 px en la fecha de hoy
  (function(){
    var h = caja('t-uso','I10 · camino a Cádiz: agente de 24 px');
    var s = '<path d="M10 40H390" style="stroke:var(--border-strong)" stroke-width="3" stroke-linecap="round"/>' + ill.corredor('corre',{h:24,x:120,y:40,ancla:'pie'});
    h.innerHTML = '<svg viewBox="0 0 400 56" style="display:block;width:100%;max-width:560px;margin:0 auto">'+s+'</svg>';   /* sin .ill: como en G11 */
  })();
  // láminas
  ill.laminas().forEach(function(id){ var d=document.createElement('div'); d.className='caja lam'; document.getElementById('t-lam').appendChild(d); ill.lamina(d, id); });
  var act = (location.search.match(/activar=([\w-]+):([\w-]+)/) || []);
  if (act[1]) setTimeout(function(){ var b = document.querySelector('[data-lamina="'+act[1]+'"] .ill-ley li[data-n="'+act[2]+'"] button'); if (b) b.click(); }, 400);

  if (/anim=1/.test(location.search)) {
    var hA = document.querySelector('#t-i2 .caja .h');
    setTimeout(function(){
      ill.pista1000(hA, {s:220, real:true});
      var g = hA.querySelector('.ill-mov'), r = [];
      r.push(['t0', g.style.transform, getComputedStyle(g).transitionDuration, getComputedStyle(g).transform]);
      setTimeout(function(){ r.push(['t300', getComputedStyle(g).transform]); }, 300);
      setTimeout(function(){ r.push(['t700', getComputedStyle(g).transform]); window.__anim = r; }, 700);
    }, 200);
  }
  // ---------------- comprobación
  setTimeout(function(){
    var out = {errores:(window.__errores||[]).slice(), letra:[], ids:[], hex:[], i2:[], umbral:0, ancho: document.documentElement.clientWidth, desborda:[]};
    var raiz = document.getElementById('ill-prueba');
    [].forEach.call(raiz.querySelectorAll('svg text'), function(t){
      if (t.closest('[data-deco]')) return;
      var r = t.getBoundingClientRect(); if (!r.width) return;
      var sv = t.ownerSVGElement, m = t.getScreenCTM(); if (!m) return;
      var fs = parseFloat(getComputedStyle(t).fontSize) * Math.sqrt(m.a*m.a + m.b*m.b);
      if (fs < 11.95) out.letra.push((sv.getAttribute('data-escena')||sv.closest('.ill-lamina') && sv.closest('.ill-lamina').dataset.lamina || '?') + ': «' + t.textContent + '» ' + fs.toFixed(1) + ' px');
    });
    var vistos = {};
    [].forEach.call(document.querySelectorAll('[id]'), function(e){ if (vistos[e.id]) out.ids.push(e.id); vistos[e.id]=1; });
    [].forEach.call(raiz.querySelectorAll('svg.ill'), function(sv){ var m = sv.outerHTML.match(/#[0-9A-Fa-f]{3,8}\b(?![^<]*<\/text>)/g); if (m) out.hex.push(m.slice(0,3).join(' ')); });
    out.umbral = raiz.querySelectorAll('#t-i2 [data-umbral="229"]').length;
    [].forEach.call(raiz.querySelectorAll('#t-i2 svg'), function(sv){
      var host = sv.parentNode, o = host.__illO, vb = sv.viewBox.baseVal, r = sv.getBoundingClientRect(), k = vb.width / r.width;
      var fila = {s:o.s, real:o.real};
      var mov = sv.querySelector('.ill-mov[data-x-pie]');
      if (mov) {
        var zap = mov.querySelector('.if-zapa2');
        var zr = zap.getBoundingClientRect();
        fila.pie = +((zr.right - r.left) * k).toFixed(2);
        fila.esperado = +(60 + (229 - Math.min(Math.max(o.s, 201.7), 229)) * 12).toFixed(2);
        fila.okPie = Math.abs(fila.pie - fila.esperado) <= 1 / (vb.width / r.width) ;
      }
      var c = sv.querySelector('[data-cota="margen"]');
      if (c) { fila.cota = +c.getAttribute('data-x1') - +c.getAttribute('data-x0'); fila.cotaEsperada = (229 - o.s) * 12; }
      out.i2.push(fila);
    });
    [].forEach.call(raiz.querySelectorAll('svg.ill, .ill-lamina'), function(e){ var r=e.getBoundingClientRect(); if (r.right > document.documentElement.clientWidth + 0.5) out.desborda.push((e.getAttribute('data-escena')||e.getAttribute('data-lamina')||'svg') + ' ' + Math.round(r.right)); });
    out.toques = [];
    [].forEach.call(raiz.querySelectorAll('button, summary, [role="button"], [tabindex="0"]'), function(e){
      if (e.tagName.toLowerCase() === 'svg') return;
      var r = e.getBoundingClientRect(); if (!r.width && !r.height) return;
      if (r.width < 43.5 || r.height < 43.5) out.toques.push((e.getAttribute('data-n') || e.className.baseVal || e.className || e.tagName) + ' ' + Math.round(r.width) + '×' + Math.round(r.height));
    });
    out.scrollW = document.documentElement.scrollWidth;
    out.anim = window.__anim || null;
    document.getElementById('res').textContent = JSON.stringify(out, null, 1);
  }, 1200);
})();
</script>
'''
# el cuerpo de prueba va justo tras <body…>; el resto de la app queda oculto por CSS
m = re.search(r'<body[^>]*>', html)
out = html[:m.end()] + cuerpo + html[m.end():]
# los scripts de prueba deben ir después del núcleo y de M6: movemos nuestro <script> al final
i = out.index('<script>\n(function(){\n  var ill = PC.ill;')
j = out.index('</script>', i) + len('</script>')
bloque = out[i:j]
out = out[:i] + out[j:]
k = out.rindex('</body>')
out = out[:k] + bloque + out[k:]
open(os.path.join(AQUI, 'prueba.html'), 'w', encoding='utf-8').write(out)
print(os.path.join(AQUI, 'prueba.html'))
