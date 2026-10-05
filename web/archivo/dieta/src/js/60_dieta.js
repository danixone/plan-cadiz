/* 60_dieta.js · M7 · Dieta (especificación §5.5 y §9.1)
   La pauta es de la nutricionista: la lógica de la app se traslada sin tocarla.

   Tres partes:
   1. Observador de §9.1.8 (P3), fuera del IIFE de la app: en el primer pintado deja abierta solo la comida
      que toca por la hora (antes de las 10:00 desayuno, de las 12:30 media mañana, de las 16:00 comida,
      de las 19:00 merienda; después, cena). Solo el primer pintado.
   2. La app: el bloque de la web antigua desde «var F» hasta antes de «['s-mil','s-dom','s-cir'].forEach»,
      copiado entre las marcas BLOQUE TRASLADADO, con la lista cerrada de cambios de §9.1 y nada más:
        §9.1.2 arranca en el día de hoy (PC.hoy()) y marca ese día con aria-pressed;
        §9.1.3 g de proteína por kg con PC.D.plan.atleta.pesoKg (66,5) en vez de 67.4;
        §9.1.4 verde de la proteína de 130 a 145 g (lo que dice el texto), no hasta 150;
        §9.1.5 sin aviso «Ese día repite…» con la combinación original (selC === diaSel && selN === diaSel);
        §9.1.6 font-size en línea < .75rem → .75rem; hexadecimales en línea → var(--…) (alias de #v-dieta);
               la fuente monoespaciada en línea → cifras tabulares (§4.3 y §5.9: esa fuente desaparece de toda la web);
        §9.1.9 los dos triángulos de «empezar» (U+25B6) de los temporizadores de receta → secuencia de escape \u25B6\uFE0E (presentación de texto).
      qa/paridad_dieta.py reconstruye el bloque desde docs/anterior/index.html con esa lista y falla si hay
      cualquier otra diferencia.
   3. Bloques nuevos de la vista (§5.5): #di-entreno («Alrededor del entreno», horas restadas a PC.cal.horaIni del
      día y textos de plan.reglas[comer] y [dormir]; en control con 1.000 y en prueba, planDeCarrera.examen.comida)
      y #di-calidad (chip que pulsa «Día de calidad» de #lg-modo; solo si web.dias[hoy].calidad === true;
      nunca se activa solo).
   Se conservan pc-reg y su formato, jsPDF desde cdnjs bajo demanda y el texto «Daniel ·» del PDF. */

/* ---------------------------------------------------------------------------------------------
   §9.1.8 (P3) · fuera del IIFE de la app. pintaDieta pinta cada comida como <details open> hijo de
   #dieta-body; en ese primer pintado se cierran las que no tocan por la hora (PC.ahoraMin admite ?hora=).
   --------------------------------------------------------------------------------------------- */
(function () {
  var PC = window.PC, cuerpo = document.getElementById('dieta-body');
  if (!cuerpo || !window.MutationObserver) return;
  /* límites de §9.1.8, en minutos: 10:00, 12:30, 16:00 y 19:00 */
  var CORTES = [[600, 'Desayuno'], [750, 'Media mañana'], [960, 'Comida'], [1140, 'Merienda']];
  function toca() {
    var m = PC && PC.ahoraMin ? PC.ahoraMin() : (new Date().getHours() * 60 + new Date().getMinutes());
    for (var i = 0; i < CORTES.length; i++) if (m < CORTES[i][0]) return CORTES[i][1];
    return 'Cena';
  }
  var obs = new MutationObserver(function () {
    var hijos = [].slice.call(cuerpo.children).filter(function (n) { return n.tagName === 'DETAILS'; });
    if (!hijos.length) return;
    obs.disconnect();
    var t = toca();
    hijos.forEach(function (d) {
      var r = d.querySelector('summary > span > span');
      var nombre = r ? r.textContent.trim() : '';
      if (nombre && nombre !== t) d.open = false;
    });
  });
  obs.observe(cuerpo, { childList: true });
})();

/* ---------------------------------------------------------------------------------------------
   App de Dieta (§9.1.1): el código de la web antigua, tal cual, dentro de su propio IIFE.
   Corre al cargar, como en la web antigua: la vista está en el DOM aunque esté oculta.
   --------------------------------------------------------------------------------------------- */
(function () {
  var PC = window.PC;
  /* apoyos del principio del script antiguo: legend() literal, el() literal (no se llama) y C con variables */
  var NS = 'http://www.w3.org/2000/svg';
  var C = {ink:'var(--text)', muted:'var(--text-2)', faint:'var(--text-3)', rule:'var(--border)', alert:'var(--bad)', ok:'var(--ok)', warn:'var(--warn)', blue:'var(--s1)', band:'var(--surface-2)'};
  function el(t, a) { var n = document.createElementNS(NS, t); for (var k in a) n.setAttribute(k, a[k]); return n; }

  function legend(hostId, items, onToggle) {
    var host = document.getElementById(hostId); if (!host) return;
    items.forEach(function (it) {
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('aria-pressed', 'true');
      b.innerHTML = '<span class="sw" style="background:' + it.color + '"></span>' + it.label;
      b.addEventListener('click', function () {
        var on = b.getAttribute('aria-pressed') === 'true';
        b.setAttribute('aria-pressed', on ? 'false' : 'true');
        onToggle(it.key, !on);
      });
      host.appendChild(b);
    });
  }

  /* ==== BLOQUE TRASLADADO: inicio (web antigua, var F … pintaDieta();) ==== */
  var F = {
    leche:['Leche desnatada',35,4.8,3.4,0.1], avena_b:['Bebida de avena',45,7,0.8,1.3],
    gofio:['Gofio',380,72,9,4.5], avena:['Avena',375,60,13,7],
    fruta:['Fruta',55,12,0.7,0.2], platano:['Plátano',89,20,1.1,0.3],
    pan:['Pan integral sin gluten',250,43,6,4.5], panfaj:['Pan de fajita sin gluten',280,48,6,6],
    salmon_a:['Salmón ahumado',180,0,22,10], salmon:['Salmón fresco',200,0,20,13],
    aguacate:['Aguacate',160,2,2,15], queso_t:['Queso tierno',300,2,22,23],
    queso_f:['Queso feta',260,4,14,21], queso_c:['Rulo de cabra',290,2,18,23],
    queso_l:['Queso light en lonchas',180,5,20,9], batido:['Queso batido 0 %',47,4,8,0.2],
    yogur:['Yogur natural',60,4.5,3.5,3],
    huevo:['Huevo',143,0.7,12.6,9.5], atun:['Atún al natural',108,0,24,1],
    caballa:['Caballa en aceite',200,0,22,12], gambas:['Gambas',85,0,19,1],
    jamon:['Jamón serrano',240,0.5,31,12], pollo:['Pechuga de pollo',110,0,23,1.5],
    ternera:['Ternera magra',150,0,21,7], albondiga:['Albóndigas',200,5,18,12],
    hamburguesa:['Hamburguesa de ternera',220,2,18,16], pavo:['Solomillo de pavo',110,0,23,2],
    arroz:['Arroz integral (crudo)',355,73,7.5,2.5], pasta:['Pasta sin gluten (cruda)',355,78,6,1.5],
    legumbre:['Legumbre (cruda)',340,55,22,3], papa:['Papa',80,17,2,0.1], batata:['Batata',90,20,1.6,0.1],
    tomate:['Tomate',18,3.5,0.9,0.2], salsat:['Salsa de tomate casera',50,7,1.5,1.5],
    verdura:['Verduras variadas',35,5,1.8,0.4], ensalada:['Hoja verde',20,2,2.5,0.5],
    cebolla:['Cebolla',40,8,1.1,0.1], calabacin:['Calabacín',17,2,1.3,0.3],
    zanahoria:['Zanahoria',35,7,0.9,0.2], pepino:['Pepino',15,2,0.7,0.1],
    espinaca:['Espinacas',23,1.5,2.8,0.4], champi:['Champiñones',22,1,3,0.3],
    edamame:['Edamame',120,9,11,5], hummus:['Hummus',170,14,8,9],
    aove:['Aceite de oliva',900,0,0,100], frutosec:['Frutos secos',620,8,20,55],
    choco:['Chocolate 85 %',590,20,10,48], datil:['Dátiles',280,65,2.5,0.4],
    proteina:['Proteína en polvo',380,5,80,4], sesamo:['Sésamo',570,12,18,50],
    soja:['Salsa de soja',60,5,8,0], cesar:['Salsa césar',450,5,2,46],
    pan_n:['Pan sin gluten',270,48,5,5], tortita:['Tortitas de arroz',385,81,8,3],
    miel:['Miel',300,80,0,0], mermelada:['Mermelada',250,60,0.5,0.1],
    cacahuete:['Crema de cacahuete',600,12,25,50], almendra:['Almendras',580,5,21,50],
    nuez:['Nueces',650,7,15,65], pasa:['Pasas',300,70,3,0.5],
    leche_ent:['Leche entera',63,4.7,3.2,3.6], requeson:['Requesón',95,3,11,4],
    manzana:['Manzana',52,12,0.3,0.2], naranja:['Naranja',47,9,0.9,0.1],
    uva:['Uva',69,16,0.6,0.2], fresa:['Fresas',33,6,0.7,0.3],
    kiwi:['Kiwi',61,12,1.1,0.5], pina:['Piña',50,12,0.5,0.1],
    cerveza:['Cerveza',43,3.6,0.5,0], refresco:['Refresco azucarado',42,10.6,0,0],
    zumo:['Zumo de naranja',45,10,0.7,0.2], helado:['Helado',200,24,3.5,10],
    galleta:['Galletas sin gluten',470,65,6,20], chocolate_l:['Chocolate con leche',540,57,7,31],
    patatas_f:['Patatas fritas de bolsa',540,50,6,34], pizza:['Pizza sin gluten',250,30,10,10],
    bacalao:['Bacalao',80,0,18,0.7], merluza:['Merluza',72,0,17,0.6],
    sardina:['Sardinas en lata',210,0,24,12], mejillon:['Mejillones',86,4,12,2],
    lomo:['Lomo de cerdo',145,0,21,6.5], pavo_l:['Pavo en lonchas',105,1,18,3],
    quinoa:['Quinoa (cruda)',368,64,14,6], cuscus:['Cuscús sin gluten (crudo)',360,72,12,1.5],
    maiz:['Maíz dulce',86,19,3.2,1.2], guisante:['Guisantes',81,14,5.4,0.4],
    brocoli:['Brócoli',34,7,2.8,0.4], judia_v:['Judía verde',31,7,1.8,0.1],
    berenjena:['Berenjena',25,6,1,0.2], setas:['Setas',22,1,3,0.3],
    aceituna:['Aceitunas',145,6,1,15], tofu:['Tofu',120,2,13,7],
    pimienta:['Pimienta negra molida',255,39,11,3], sal:['Sal',0,0,0,0],
    comino:['Comino molido',375,44,18,22], pimenton:['Pimentón',282,34,14,13],
    oregano:['Orégano',265,69,9,4], ajo:['Ajo',149,33,6,0.5], perejil:['Perejil',36,6,3,0.8],
    curry:['Curry en polvo',325,58,14,14], canela:['Canela',247,81,4,1.2],
    laurel:['Laurel',313,75,8,8], vinagre:['Vinagre',20,0.9,0,0], limon:['Limón',29,9,1.1,0.3],
    lechuga:['Lechuga',15,1.5,1.4,0.2], col:['Col',25,5,1.3,0.1], coliflor:['Coliflor',25,4,1.9,0.3],
    calabaza:['Calabaza',26,6,1,0.1], puerro:['Puerro',61,14,1.5,0.3], apio:['Apio',16,3,0.7,0.2],
    esparrago:['Espárragos',20,2,2.2,0.1], alcachofa:['Alcachofa',47,10,3.3,0.2],
    remolacha:['Remolacha',43,9,1.6,0.2], pera:['Pera',57,15,0.4,0.1], melon:['Melón',34,8,0.8,0.2],
    sandia:['Sandía',30,7,0.6,0.2], melocoton:['Melocotón',39,9,0.9,0.3], ciruela:['Ciruela',46,11,0.7,0.3],
    mango:['Mango',60,15,0.8,0.4], pimiento_v:['Pimiento verde',20,4,0.9,0.2],
    pimiento:['Pimiento rojo',30,5,1,0.3], picatoste:['Picatostes sin gluten',450,60,8,20], leche_e:['Leche semidesnatada',47,4.8,3.3,1.6]
  };
  var FIJAS = {
    desayuno: [['leche',200],['gofio',40],['fruta',150]],
    merienda: [['batido',150],['proteina',30],['gofio',20],['fruta',120],['choco',10]],
    post:     [['platano',120],['proteina',35],['leche_e',275]]
  };
  var DIAS = [
    {d:'Lun', hc:[0,'cereal'], hn:[6,'cereal'], pc:[1,'arroz'], pn:[3,'sarten'], tc:{p:'ternera',c:'arroz'}, tn:{p:'huevo y marisco',c:'arroz'}, nm:'Bocadillo de salmón ahumado con aguacate', nc:'{h} con {p} y salteado de verduras', nn:'Tortilla de espinacas y champiñones con {p}',
      media:[['pan',60],['salmon_a',50],['aguacate',50],['fruta',150]],
      comida:[['arroz',80],['albondiga',150],['zanahoria',80],['calabacin',80],['salsat',60],['fruta',150]],
      cena:[['huevo',110],['espinaca',80],['champi',60],['gambas',80],['tomate',80],['ensalada',40],['arroz',50]]},
    {d:'Mar', hc:[0,'potaje'], hn:[1,'cereal'], pc:[0,'potaje'], pn:[0,'pasta'], tc:{p:'legumbre',c:'legumbre'}, tn:{p:'pescado azul',c:'pasta'}, nm:'Bocadillo de queso tierno con calabacín y orégano', nc:'Potaje de verduras con {p}', nn:'{p} al horno con {h} y verduras',
      media:[['pan',60],['queso_t',40],['calabacin',50],['fruta',150]],
      comida:[['legumbre',80],['verdura',200],['queso_t',40],['gofio',30],['fruta',150]],
      cena:[['salmon',160],['pasta',70],['verdura',150]]},
    {d:'Mié', hc:[0,'cereal'], hn:null, pc:[4,'pasta'], pn:[7,'ensalada'], tc:{p:'pescado y huevo',c:'pasta'}, tn:{p:'pollo',c:'sin cereal'}, nm:'Bocadillo de rúcula, tomate y huevo sancochado', nc:'{h} con {p}, huevo y cebolla pochada', nn:'Ensalada Bolaños con {p}',
      media:[['pan',60],['ensalada',20],['tomate',50],['huevo',55],['fruta',150]],
      comida:[['pasta',80],['huevo',55],['salsat',80],['cebolla',50],['atun',80],['fruta',150]],
      cena:[['queso_c',50],['datil',25],['tomate',80],['ensalada',50],['cebolla',40],['aguacate',70],['caballa',80],['pollo',120]]},
    {d:'Jue', hc:[1,'tuberculo'], hn:[5,'tuberculo'], pc:[0,'potaje'], pn:[1,'fajita'], tc:{p:'legumbre',c:'legumbre'}, tn:{p:'pollo',c:'pan y batata'}, nm:'Bocadillo de atún, pimiento rojo y aceite de oliva', nc:'Puchero con {p}', nn:'Fajitas de {p} con gajos de {h}',
      media:[['pan',60],['atun',60],['pimiento',50],['aove',5],['fruta',150]],
      comida:[['legumbre',80],['papa',150],['verdura',150],['queso_t',40],['fruta',150]],
      cena:[['panfaj',100],['pollo',150],['aguacate',60],['ensalada',40],['tomate',60],['batata',150]]},
    {d:'Vie', hc:[0,'tuberculo'], hn:[2,'cereal'], pc:[2,'papa'], pn:[1,'wok'], tc:{p:'pescado y huevo',c:'papa'}, tn:{p:'pavo',c:'arroz'}, nm:'Bocadillo de tortilla francesa con tomate triturado', nc:'{h} sancochadas con {p} y ensalada de aguacate', nn:'Wok de {p} con verduras y {h}',
      media:[['pan',60],['huevo',55],['tomate',50],['fruta',150]],
      comida:[['papa',250],['huevo',55],['caballa',90],['aguacate',70],['tomate',80],['cebolla',40],['aove',8],['fruta',150]],
      cena:[['verdura',200],['pavo',160],['arroz',60]]},
    {d:'Sáb', hc:[1,'cereal'], hn:[5,'tuberculo'], pc:[0,'poke'], pn:[0,'hamburguesa'], tc:{p:'pescado azul',c:'arroz'}, tn:{p:'ternera',c:'pan y batata'}, nm:'Bocadillo de hummus de garbanzo con queso', nc:'Poké de {p} con {h}', nn:'{p} con gajos de {h}',
      media:[['pan',60],['hummus',50],['queso_t',30],['fruta',150]],
      comida:[['salmon',150],['arroz',80],['edamame',60],['pepino',60],['zanahoria',60],['aguacate',60],['sesamo',8],['soja',10],['fruta',150]],
      cena:[['hamburguesa',150],['pan',80],['queso_l',20],['tomate',50],['cebolla',30],['batata',150]]},
    {d:'Dom', hc:[0,'tuberculo'], hn:null, pc:[1,'tortilla'], pn:[0,'ensalada'], tc:{p:'huevo',c:'papa'}, tn:{p:'pollo',c:'sin cereal'}, nm:'Bocadillo de jamón serrano con tomate y aceite', nc:'Tortilla de {h} al horno con ensalada mixta', nn:'Ensalada César con {p}',
      media:[['pan',60],['jamon',40],['tomate',50],['aove',5],['fruta',150]],
      comida:[['papa',250],['huevo',110],['aove',10],['ensalada',60],['tomate',80],['cebolla',30],['fruta',150]],
      cena:[['pollo',150],['ensalada',70],['aguacate',60],['picatoste',25],['queso_f',40],['cesar',15]]}
  ];

  // ---- recetas: {tot, eq, pasos:[[minuto, duracion, texto, zona]], truco} ----
  var REC = {
  'Lun|comida':{tot:35,eq:['Inducción 24 cm','Inducción 18 cm'],truco:'La zanahoria siempre entra 4 o 5 minutos antes que el calabacín: si las echas a la vez, o la zanahoria queda cruda o el calabacín se deshace.',pasos:[
    [0,6,'Olla con agua abundante y sal. Cuando rompa a hervir, echa el arroz integral.','24 cm · nivel 9 + Sprint',['arroz']],
    [6,28,'Arroz integral tapado. Programa el temporizador de la zona y olvídate.','24 cm · nivel 5',['arroz']],
    [8,6,'Mientras: zanahoria en medias lunas finas y calabacín en medias lunas más gruesas.','—',['zanahoria','calabacin']],
    [14,10,'Albóndigas en la sartén con un hilo de aceite, dándoles vuelta cada 2–3 min. Reserva.','18 cm · nivel 7',['albondiga']],
    [24,5,'Misma sartén: zanahoria sola.','18 cm · nivel 6',['zanahoria']],
    [29,4,'Añade el calabacín.','18 cm · nivel 6',['calabacin']],
    [33,5,'Devuelve las albóndigas, añade la salsa de tomate y tapa.','18 cm · nivel 3',['albondiga','salsat']]]},
  'Lun|cena':{tot:18,eq:['Inducción 18 cm'],truco:'Escurre bien el relleno antes de meterlo en la tortilla. Si va húmedo, se rompe al doblarla.',pasos:[
    [0,4,'Champiñones laminados, en seco y sin aceite, hasta que suelten el agua y se evapore.','18 cm · nivel 7',['champi']],
    [4,2,'Añade las gambas.','18 cm · nivel 7',['gambas']],
    [6,2,'Espinacas hasta que bajen. Sal. Escurre y reserva.','18 cm · nivel 6',['espinaca']],
    [8,1,'Sartén limpia con muy poco aceite. Bate los dos huevos y échalos.','18 cm · nivel 6',['huevo']],
    [9,2,'Cuando cuaje el fondo, pon el relleno en media tortilla y dobla. Un minuto más.','18 cm · nivel 5',['huevo']],
    [11,5,'Ensalada de cherris y rúcula. Si no te sobró arroz del mediodía, cuécelo antes.','—',['arroz']]]},
  'Mar|comida':{tot:100,eq:['Inducción 24 cm','Olla rápida opcional'],truco:'La sal siempre al final: si la echas al principio, la piel de la legumbre se endurece y no ablanda nunca.',pasos:[
    [0,8,'Sofrito: cebolla, pimiento y zanahoria picados con aceite, hasta que la cebolla transparente.','24 cm · nivel 6',['cebolla']],
    [8,6,'Añade la legumbre remojada desde la noche anterior, agua que cubra tres dedos y una hoja de laurel. Lleva a hervir.','24 cm · nivel 9 + Sprint',['legumbre']],
    [14,70,'Tapado y a fuego suave. Garbanzo 1h30 · lenteja 35 min · judía 1h15. En olla rápida, un tercio del tiempo.','24 cm · nivel 3',['legumbre']],
    [84,15,'Últimos 15 min: papa en cachelos y calabaza.','24 cm · nivel 4',['papa']],
    [99,1,'Sal ahora. Prueba y rectifica.','—',[]]]},
  'Mar|cena':{tot:22,eq:['Horno 200°','Inducción 24 cm','Inducción 18 cm'],truco:'La pasta sin gluten se pasa de golpe y se apelmaza al escurrirla. Pruébala un minuto antes de lo que diga el paquete y guárdate medio vaso del agua de cocción para soltarla.',pasos:[
    [0,10,'Precalienta el horno a 200°. Mientras, salmón sobre papel de horno, piel abajo, con sal, un hilo de aceite y limón.','Horno 200°',['salmon']],
    [10,13,'Salmón al horno. Sabrás que está cuando la carne se abra en láminas al presionarla.','Horno 200°',['salmon']],
    [10,6,'Agua con sal para la pasta.','24 cm · nivel 9 + Sprint',['pasta']],
    [16,8,'Pasta sin gluten. Prueba un minuto antes del tiempo del paquete.','24 cm · nivel 6',['pasta']],
    [14,6,'Verduras al gusto en la sartén.','18 cm · nivel 7',['verdura']]]},
  'Mié|comida':{tot:25,eq:['Inducción 24 cm','Inducción 18 cm'],truco:'El atún entra con el fuego ya apagado. Si lo cocinas se reseca y pierde todo lo bueno.',pasos:[
    [0,15,'Cebolla en juliana fina con aceite, removiendo de vez en cuando, hasta dorada. Paciencia: esto no se acelera.','18 cm · nivel 4',['cebolla']],
    [0,10,'A la vez: huevo en agua ya hirviendo, 10 min exactos, y luego a agua fría.','15 cm · nivel 6',['huevo']],
    [12,8,'Pasta sin gluten en agua con sal.','24 cm · nivel 6',['pasta']],
    [20,3,'Junta la cebolla pochada con la salsa de tomate.','18 cm · nivel 3',['cebolla','salsat']],
    [23,2,'Apaga. Añade el atún escurrido, la pasta y el huevo en cuartos.','—',['atun']]]},
  'Mié|cena':{tot:20,eq:['Inducción 18 cm','Horno con grill'],truco:'Mete el rulo de cabra 3 minutos al grill a 200° antes de ponerlo encima. Cambia la ensalada entera.',pasos:[
    [0,8,'Pechuga abierta en filetes de 1,5 cm, sal. Plancha bien caliente, 3–4 min por lado sin tocarla.','18 cm · nivel 8',['pollo']],
    [8,3,'Sácala y déjala reposar. Si la cortas ahora, pierde todo el jugo.','—',['pollo']],
    [8,7,'Mientras: rúcula, tomate, cebolla en pluma, aguacate, caballa escurrida y dátiles en tiras.','—',['ensalada','tomate','aguacate','caballa']],
    [15,3,'Rulo de cabra al grill.','Horno grill 200°',['queso_c']],
    [18,2,'Monta y aliña con aceite, vinagre o limón y sal.','—',[]]]},
  'Jue|comida':{tot:110,eq:['Inducción 24 cm','Olla rápida recomendada'],truco:'Haz el doble y congela en raciones. El puchero está mejor al día siguiente y te resuelve dos comidas de la semana.',pasos:[
    [0,10,'Carne y hueso en la olla con agua fría. Lleva a hervir y retira la espuma con una espumadera.','24 cm · nivel 9 + Sprint',['legumbre']],
    [10,80,'Garbanzo remojado desde la noche anterior. Tapado y muy suave. En olla rápida, 25 min desde que sube la válvula.','24 cm · nivel 3',['legumbre']],
    [60,30,'Verduras duras: zanahoria, papa, calabaza.','24 cm · nivel 3',['papa']],
    [75,15,'Verduras blandas: col, judía verde.','24 cm · nivel 3',['verdura']],
    [105,5,'Sal al final. Reposa 10 min antes de servir.','—',[]]]},
  'Jue|cena':{tot:28,eq:['Horno 200°','Airfryer','Inducción 18 cm','Microondas'],truco:'Seca los gajos de batata con papel de cocina antes de aceitarlos. El agua de la superficie es lo que impide que queden crujientes.',pasos:[
    [0,5,'Batata en gajos, seca, con aceite, sal y pimentón. Precalienta el horno a 200°.','Horno 200°',['batata']],
    [5,25,'Al horno 25 min, o 18 min en airfryer a 200°, dándoles la vuelta a mitad.','Horno / Airfryer 200°',['batata']],
    [18,6,'Pollo en tiras con sal, en la sartén bien caliente.','18 cm · nivel 8',['pollo']],
    [26,1,'Calienta el pan de fajita: 20 s en el microondas o 30 s por cara en la sartén.','Microondas',['panfaj']],
    [27,2,'Monta: pollo, aguacate, rúcula y tomate.','—',['aguacate','ensalada','tomate']]]},
  'Vie|comida':{tot:30,eq:['Inducción 24 cm'],truco:'Las papas se empiezan en agua fría para que se hagan por igual. El huevo, al revés: siempre desde agua ya hirviendo.',pasos:[
    [0,8,'Papas enteras con piel, en agua fría con sal gorda. Lleva a hervir.','24 cm · nivel 9 + Sprint',['papa']],
    [8,22,'Baja y deja cocer. Sabrás que están cuando el cuchillo entre sin resistencia.','24 cm · nivel 5',['papa']],
    [20,10,'Huevo a la misma olla los últimos 10 min.','24 cm · nivel 5',['huevo']],
    [10,10,'Mientras: aguacate, tomate y cebolla roja en juliana. Aliño de aceite, vinagre y sal.','—',['aguacate','tomate','cebolla']],
    [30,1,'Emplata con la caballa escurrida.','—',['caballa']]]},
  'Vie|cena':{tot:32,eq:['Inducción 24 cm','Sartén amplia'],truco:'En salteado, la sartén nunca llena y el fuego al máximo. Si amontonas la verdura, suelta agua y acabas cociéndola en vez de salteándola.',pasos:[
    [0,6,'Agua para el arroz integral.','24 cm · nivel 9 + Sprint',['arroz']],
    [6,28,'Arroz tapado.','24 cm · nivel 5',['arroz']],
    [20,3,'Pavo en tacos, sartén muy caliente, sellado por fuera. Reserva.','18 cm · nivel 9',['pavo']],
    [23,4,'Verduras duras primero: zanahoria y pimiento.','18 cm · nivel 8',['verdura']],
    [27,3,'Blandas después: calabacín y cebolla.','18 cm · nivel 8',['verdura']],
    [30,2,'Devuelve el pavo y un chorrito de soja. Salteando sin parar.','18 cm · nivel 9',['pavo']]]},
  'Sáb|comida':{tot:35,eq:['Inducción 24 cm','Microondas'],truco:'Si vas a comer el salmón crudo, tiene que haber estado congelado 5 días a −18° por el anisakis. Si no lo has congelado, pásalo por la plancha 2 min por lado y listo.',pasos:[
    [0,6,'Agua para el arroz.','24 cm · nivel 9 + Sprint',['arroz']],
    [6,28,'Arroz integral. Después déjalo templar destapado: el poké se monta con el arroz tibio, no caliente.','24 cm · nivel 5',['arroz']],
    [10,10,'Corta pepino y zanahoria en bastones, aguacate en láminas y el salmón en dados de 2 cm.','—',['salmon','pepino','zanahoria','aguacate']],
    [20,4,'Edamame: 4 min en agua hirviendo o 3 min en el microondas con un dedo de agua.','Microondas',['edamame']],
    [34,3,'Monta en bol: arroz abajo y el resto por sectores. Sésamo y un hilo de soja.','—',[]]]},
  'Sáb|cena':{tot:32,eq:['Horno 200°','Airfryer','Inducción 18 cm'],truco:'No aplastes la hamburguesa con la espátula. Cada vez que lo haces le sacas el jugo. Una vuelta y ya.',pasos:[
    [0,5,'Batata en gajos, seca, aceite y sal. Precalienta el horno.','Horno 200°',['batata']],
    [5,25,'Al horno 25 min o airfryer 18 min a 200°, volteando a mitad.','Horno / Airfryer 200°',['batata']],
    [22,3,'Sartén muy caliente. Hamburguesa, sal por encima, y no la toques.','18 cm · nivel 9',['hamburguesa']],
    [25,3,'Vuelta. El queso encima el último minuto, tapada para que funda.','18 cm · nivel 8',['hamburguesa','queso_l']],
    [28,2,'Tosta el pan por dentro en la misma sartén. Monta con tomate, cebolla morada y pepinillo.','18 cm · nivel 6',['pan']]]},
  'Dom|comida':{tot:45,eq:['Airfryer','Horno 180°','Inducción 18 cm'],truco:'Deja reposar la mezcla de papa y huevo 5 minutos antes de cuajarla. La papa absorbe el huevo y la tortilla sale mucho más jugosa.',pasos:[
    [0,8,'Papa en láminas finas y cebolla en juliana, con un poco de aceite y sal.','—',['papa','cebolla']],
    [8,20,'Airfryer 180° removiendo a mitad, o horno 200° unos 30 min, hasta que esté tierna.','Airfryer 180°',['papa']],
    [28,5,'Bate 5 o 6 huevos con sal, mezcla con la papa y deja reposar.','—',['huevo']],
    [33,10,'En sartén: 4 min por lado a nivel 5, con un plato para darle la vuelta. En horno: molde a 180°, 20–25 min.','18 cm · nivel 5',['huevo']],
    [43,2,'Ensalada mixta mientras cuaja.','—',['ensalada','tomate']]]},
  'Dom|cena':{tot:20,eq:['Inducción 18 cm','Horno 190°'],truco:'La salsa césar al final y con mano corta: ahí está casi toda la grasa del plato.',pasos:[
    [0,8,'Pechuga en filetes, sal, plancha caliente, 3–4 min por lado.','18 cm · nivel 8',['pollo']],
    [8,3,'Reposa antes de cortarla en tiras.','—',['pollo']],
    [8,8,'Picatostes: pan sin gluten en dados con aceite, al horno 190° 8 min. O 3 min en sartén.','Horno 190°',['picatoste']],
    [16,4,'Monta: hoja verde, pollo, aguacate, feta y los picatostes por encima.','—',['ensalada','aguacate','queso_f']],
    [20,1,'Salsa césar justo antes de comer para que no se ablande todo.','—',['cesar']]]}
  };

  // ================= GENERADOR DE RECETAS =================
  var MET = {
    base:   {arroz:34, pasta:14, legumbre:90, papa:28, quinoa:20, cuscus:7},
    horno:  {batata:30, salmon:14, pizza:18},
    plancha:{pollo:11, pavo:6, ternera:10, lomo:10, albondiga:10, hamburguesa:7, merluza:8, bacalao:8, tofu:10, gambas:3, pavo_l:3, panfaj:2, pan:2, pan_n:2},
    huevo:  {huevo:12},
    hervir: {brocoli:5, judia_v:5, coliflor:6, esparrago:5, alcachofa:15, guisante:5, edamame:4, maiz:3, calabaza:12, remolacha:25, mejillon:6},
    saltear:{cebolla:6, zanahoria:6, calabacin:5, pimiento:5, pimiento_v:5, berenjena:6, puerro:6, champi:4, setas:4, espinaca:2, apio:5, verdura:6, salsat:5},
    lata:   {atun:1, caballa:1, sardina:1},
    crudo:  {tomate:0, pepino:0, aguacate:0, lechuga:0, ensalada:0, aceituna:0, queso_t:0, queso_f:0, queso_c:0, queso_l:0, requeson:0, jamon:0, salmon_a:0, datil:0, hummus:0, picatoste:0, col:0, cebolla_c:0},
    alino:  {aove:0, vinagre:0, limon:0, sal:0, pimienta:0, soja:0, cesar:0, sesamo:0, comino:0, pimenton:0, oregano:0, ajo:0, perejil:0, curry:0, canela:0, laurel:0, miel:0},
    postre: {fruta:0, platano:0, manzana:0, naranja:0, uva:0, fresa:0, kiwi:0, pina:0, pera:0, melon:0, sandia:0, melocoton:0, ciruela:0, mango:0, choco:0, yogur:0}
  };
  function metodo(k) { for (var m in MET) if (MET[m][k] !== undefined) return m; return 'crudo'; }
  function durac(k) { var m = metodo(k); return MET[m][k] || 0; }
  function ml(g) { return Math.round(g); }
  function txtBase(k, g) {
    if (k === 'arroz')   return ['Pon ' + Math.max(1000, g * 10) + ' ml de agua con una cucharadita de sal. Cuando hierva, echa los ' + g + ' g de arroz integral y tapa: 28 min.', '24 cm · nivel 9 con Sprint, luego 5'];
    if (k === 'pasta')   return ['Pon ' + Math.max(1000, g * 10) + ' ml de agua con sal. Cuando hierva, echa los ' + g + ' g de pasta sin gluten. Pruébala un minuto antes de lo que diga el paquete: se pasa de golpe.', '24 cm · nivel 9 con Sprint, luego 6'];
    if (k === 'legumbre')return [g + ' g de legumbre remojada desde la noche anterior, con ' + (g * 4) + ' ml de agua y una hoja de laurel. Garbanzo 1h30 · lenteja 35 min · judía 1h15. En olla rápida, un tercio. La sal, al final.', '24 cm · nivel 9, luego 3'];
    if (k === 'papa')    return [g + ' g de papas enteras con piel, desde agua fría con sal gorda, unos ' + (g * 2) + ' ml. 20–25 min desde que hierve: están cuando el cuchillo entra sin resistencia.', '24 cm · nivel 9 con Sprint, luego 5'];
    if (k === 'quinoa')  return ['Enjuaga los ' + g + ' g de quinoa bajo el grifo para quitarle el amargor. ' + (g * 2) + ' ml de agua, 15 min tapada.', '18 cm · nivel 5'];
    if (k === 'cuscus')  return ['Hierve ' + g + ' ml de agua, échala sobre los ' + g + ' g de cuscús, tapa 5 min fuera del fuego y suéltalo con un tenedor.', '15 cm · nivel 9'];
    return ['', '—'];
  }
  function pasosGen(sec, lista) {
    var G = {};
    lista.forEach(function (it) {
      var k = it[0], g = it[1], m = metodo(k);
      (G[m] = G[m] || []).push([k, g]);
    });
    var P = [];
    function nom(k, g) { return FF(k)[0] + ' (' + g + ' g)'; }

    // duración de la parte caliente
    var maxCal = 0;
    ['base', 'horno', 'plancha', 'huevo', 'hervir', 'saltear'].forEach(function (m) {
      (G[m] || []).forEach(function (e) { maxCal = Math.max(maxCal, durac(e[0])); });
    });

    (G.base || []).forEach(function (e) {
      var t = txtBase(e[0], e[1]);
      P.push([Math.max(0, maxCal - durac(e[0])), durac(e[0]), t[0], t[1]]);
    });
    (G.horno || []).forEach(function (e) {
      var k = e[0], g = e[1], d = durac(k);
      var t = k === 'batata'
        ? g + ' g de batata en gajos, secos con papel y con aceite y sal. Horno a 200° 25 min, o airfryer 18 min, volteando a mitad.'
        : k === 'salmon'
          ? g + ' g de salmón sobre papel de horno, piel abajo, con sal, un hilo de aceite y limón. 200° durante 12–14 min: está cuando la carne se abre en láminas.'
          : nom(k, g) + ' al horno a 200°.';
      P.push([Math.max(0, maxCal - d), d, t, 'Horno 200°']);
    });
    (G.plancha || []).forEach(function (e) {
      var k = e[0], g = e[1], d = durac(k);
      var t = COC[k] ? COC[k][1] : 'A la plancha hasta que esté hecho.';
      P.push([Math.max(0, maxCal - d), d, nom(k, g) + '. ' + t, COC[k] ? COC[k][2] : '18 cm · nivel 8']);
    });
    (G.huevo || []).forEach(function (e) {
      P.push([Math.max(0, maxCal - 12), 12, nom(e[0], e[1]) + '. Cocido: en agua ya hirviendo, 10 min exactos, y después a agua fría para que la cáscara salga sola. En tortilla: batido, sartén a nivel 6, 1 min por lado.', '15 cm · nivel 6']);
    });
    if (G.hervir) {
      var dh = Math.max.apply(null, G.hervir.map(function (e) { return durac(e[0]); }));
      P.push([Math.max(0, maxCal - dh), dh, G.hervir.map(function (e) { return nom(e[0], e[1]); }).join(', ') + '. En agua hirviendo con sal o al vapor, que queden al dente: pasadas pierden color y textura.', '24 cm · nivel 7']);
    }
    if (G.saltear) {
      var orden = G.saltear.slice().sort(function (a, b) { return durac(b[0]) - durac(a[0]); });
      var ds = orden.reduce(function (x, e) { return x + Math.max(2, durac(e[0]) - 2); }, 2);
      var txt = 'Con un hilo de aceite y en este orden, dejando 3–4 min entre cada uno: ' +
                orden.map(function (e) { return '<strong>' + nom(e[0], e[1]) + '</strong>' }).join(' → ') +
                '. La sal al final, cuando ya estén hechas: si la echas antes sueltan el agua y se cuecen en su jugo.';
      P.push([Math.max(0, maxCal - ds), ds, txt, '18 cm · nivel 6']);
    }
    (G.lata || []).forEach(function (e) {
      P.push([maxCal, 1, nom(e[0], e[1]) + '. De lata: escúrrelo bien y añádelo con el fuego ya apagado. Cocinarlo lo reseca.', '—']);
    });
    if (G.crudo) {
      P.push([maxCal, 3, 'Prepara en frío: ' + G.crudo.map(function (e) { return nom(e[0], e[1]); }).join(', ') + '. Lavado, escurrido y cortado. Todo esto va al final y fuera del fuego.', '—']);
    }
    if (G.alino) {
      var al = G.alino.map(function (e) {
        var k = e[0], g = e[1];
        if (k === 'aove') return ml(g) + ' ml de aceite de oliva virgen extra';
        if (k === 'vinagre') return ml(g) + ' ml de vinagre';
        if (k === 'limon') return 'el zumo de medio limón (' + ml(g) + ' ml)';
        if (k === 'soja') return ml(g) + ' ml de salsa de soja';
        if (k === 'cesar') return ml(g) + ' ml de salsa césar';
        return g + ' g de ' + FF(k)[0].toLowerCase();
      });
      P.push([maxCal + 3, 2, 'Aliña con ' + al.join(', ') + '. Emulsiona el aceite con el ácido antes de echarlo: se reparte mucho mejor.', '—']);
    }
    P.push([maxCal + 4, 2, 'Monta el plato y sirve.', '—']);
    (G.postre || []).forEach(function (e) {
      P.push([maxCal + 6, 1, nom(e[0], e[1]) + ' de postre.', '—']);
    });
    P.sort(function (a, b) { return a[0] - b[0] || b[1] - a[1]; });
    return P;
  }

  function pintaReceta(dia, sec) {
    var r = REC[dia + '|' + sec] || {eq: [], truco: ''};
    var S = secciones().filter(function (x) { return x[0] === sec; })[0];
    if (!S) return '';
    var lista = [];
    S[2].forEach(function (it, i) {
      if (quitados(sec).indexOf(i) >= 0) return;
      lista.push([it[0], gramos(sec, i, it[1])]);
    });
    (EXTRAS[exKey(sec)] || []).forEach(function (e) { lista.push([e[0], e[1]]); });
    if (!lista.length) return '<div class="rec"><p style="color:var(--faint);font-size:.88rem">Sin ingredientes.</p></div>';

    var P = pasosGen(sec, lista);
    var tot = Math.max.apply(null, P.map(function (q) { return q[0] + q[1]; }));

    var eq = {};
    P.forEach(function (q) {
      if (/Horno|Airfryer/.test(q[3])) eq['Horno 200°'] = 1;
      else if (/24 cm/.test(q[3])) eq['Inducción 24 cm'] = 1;
      else if (/18 cm/.test(q[3])) eq['Inducción 18 cm'] = 1;
      else if (/15 cm/.test(q[3])) eq['Inducción 15 cm'] = 1;
    });
    var h = '<div class="rec"><div class="eq">';
    Object.keys(eq).forEach(function (e) { h += '<span' + (/Horno/.test(e) ? ' class="hot"' : '') + '>' + e + '</span>'; });
    h += '<span>' + tot + ' min en total</span></div>';

    h += '<div class="ln">';
    var cols = ['var(--blue)', 'var(--ok)', 'var(--warn)', 'var(--muted)', 'var(--alert)'];
    P.forEach(function (q, k) { h += '<i style="width:' + Math.max(2, q[1] / tot * 100) + '%;background:' + cols[k % 5] + ';opacity:.72"></i>'; });
    h += '</div>';

    P.forEach(function (q) {
      h += '<div class="step"><div class="mm">' + (q[0] === 0 ? 'inicio' : 'min ' + q[0]) + '</div><div>' +
           '<div class="tx">' + q[2] + '</div>' +
           (q[3] !== '—' ? '<div class="zn">' + q[3] + '</div>' : '') +
           (q[1] >= 2 ? '<button type="button" class="tm" data-min="' + q[1] + '">\u25B6\uFE0E ' + q[1] + ' min</button>' : '') +
           '</div></div>';
    });
    if (r.truco) h += '<div class="box" style="margin:12px 0 0"><p class="hd">El truco</p><p>' + r.truco + '</p></div>';
    return h + '</div>';
  }
  function bindTimers(root) {
    root.querySelectorAll('.tm').forEach(function (b) {
      if (b.__b) return; b.__b = 1;
      b.addEventListener('click', function () {
        if (b.__iv) { clearInterval(b.__iv); b.__iv = null; b.className = 'tm'; b.textContent = '\u25B6\uFE0E ' + b.dataset.min + ' min'; return; }
        var left = +b.dataset.min * 60;
        b.className = 'tm run';
        function tick() {
          var m = Math.floor(left / 60), sg = left % 60;
          b.textContent = '■ ' + m + ':' + (sg < 10 ? '0' : '') + sg;
          if (left-- <= 0) { clearInterval(b.__iv); b.__iv = null; b.className = 'tm done'; b.textContent = '✓ listo'; }
        }
        tick(); b.__iv = setInterval(tick, 1000);
      });
    });
  }
  var diaSel = (PC.hoy().getDay() + 6) % 7, modo = { calidad:false, post:false };
  var selC = diaSel, selN = diaSel;          // de qué día vienen la comida y la cena elegidas
  var EXTRAS = {};                 // 'sec|idx' -> [[clave, gramos], ...]
  var CUSTOM = {};                 // alimentos añadidos a mano
  function srcIdx(sec){ return sec === 'comida' ? selC : (sec === 'cena' ? selN : null); }
  function exKey(sec){ return sec + '|' + (srcIdx(sec) === null ? 'x' : srcIdx(sec)); }
  function FF(k){ return CUSTOM[k] || F[k]; }
  function compat(ci, ni){
    var a = DIAS[ci].tc, b = DIAS[ni].tn, m = [];
    if (a.p === b.p) m.push('repite ' + a.p);
    if (a.c === b.c && a.c !== 'sin cereal') m.push('repite ' + a.c);
    return m;
  }
  var EDIT = {};   // clave "seccion|i" -> gramos

  function gramos(sec, i, def) {
    var k = sec + '|' + i + '|' + (srcIdx(sec) === null ? (sec === 'media' ? 'd' + diaSel : 'x') : srcIdx(sec));
    if (EDIT[k] === undefined) {
      EDIT[k] = def;
      if (sec === 'merienda' && F[FIJAS.merienda[i][0]][0] === 'Gofio' && modo.calidad) EDIT[k] = 40;
    }
    return EDIT[k];
  }
  function setGramos(sec, i, v) {
    EDIT[sec + '|' + i + '|' + (srcIdx(sec) === null ? (sec === 'media' ? 'd' + diaSel : 'x') : srcIdx(sec))] = v;
  }
  function defecto(sec, i, base) {
    if (sec === 'merienda' && FIJAS.merienda[i][0] === 'gofio') return modo.calidad ? 40 : 20;
    return base;
  }
  function hayCambios() {
    return secciones().some(function (S) {
      return S[2].some(function (it, i) { return gramos(S[0], i, it[1]) !== defecto(S[0], i, it[1]); });
    });
  }
  function pintaReset() {
    var b = document.getElementById('btn-reset'); if (!b) return;
    var h = hayCambios();
    b.disabled = !h;
    b.classList.toggle('act', h);
    b.textContent = h ? 'Restablecer cantidades' : 'Cantidades originales';
  }
  function filtra(sec, arr) {
    var q = quitados(sec);
    if (!q.length) return arr;
    return arr.filter(function (it, i) { return q.indexOf(i) < 0; });
  }
  function secciones() {
    var d = DIAS[diaSel], dc = DIAS[selC], dn = DIAS[selN];
    var out = [
      ['desayuno', 'Desayuno', FIJAS.desayuno, 'Gofio con leche y fruta'],
      ['media', 'Media mañana', d.media, d.nm],
      ['comida', 'Comida', aplicaCarb('comida', aplicaProt('comida', dc.comida, dc.pc), dc.hc), dc.nc],
      ['merienda', 'Merienda', FIJAS.merienda, 'Queso batido con proteína, gofio y fruta'],
      ['cena', 'Cena', aplicaCarb('cena', aplicaProt('cena', dn.cena, dn.pn), dn.hn), dn.nn]
    ];
    if (modo.post) out.push(['post', 'Post-entreno', FIJAS.post, 'Plátano y batido de proteínas']);
    return out;
  }
  function calcMacros() {
    var t = [0, 0, 0, 0];
    secciones().forEach(function (S) {
      S[2].forEach(function (it, i) {
        if (quitados(S[0]).indexOf(i) >= 0) return;
        var f = FF(it[0]), g = gramos(S[0], i, it[1]) / 100;
        t[0] += f[1] * g; t[1] += f[2] * g; t[2] += f[3] * g; t[3] += f[4] * g;
      });
      (EXTRAS[exKey(S[0])] || []).forEach(function (e) {
        var f = FF(e[0]), g = e[1] / 100;
        t[0] += f[1] * g; t[1] += f[2] * g; t[2] += f[3] * g; t[3] += f[4] * g;
      });
    });
    return t;
  }
  function pintaMacros() {
    var t = calcMacros();
    document.getElementById('m-kcal').textContent = Math.round(t[0]);
    document.getElementById('m-hc').textContent = Math.round(t[1]) + ' g';
    document.getElementById('m-pr').textContent = Math.round(t[2]) + ' g';
    document.getElementById('m-gr').textContent = Math.round(t[3]) + ' g';
    var kc = [t[1] * 4, t[2] * 4, t[3] * 9], tot = kc[0] + kc[1] + kc[2] || 1;
    var cols = ['var(--blue)', 'var(--ok)', 'var(--warn)'], nm = ['Hidratos', 'Proteína', 'Grasa'];
    var bar = '<div style="display:flex;height:9px;border-radius:5px;overflow:hidden;margin-bottom:6px">';
    kc.forEach(function (v, i) { bar += '<span style="width:' + (v / tot * 100) + '%;background:' + cols[i] + '"></span>'; });
    bar += '</div><div style="display:flex;gap:12px;font-size:.75rem;color:var(--muted);flex-wrap:wrap">';
    kc.forEach(function (v, i) { bar += '<span>' + nm[i] + ' ' + Math.round(v / tot * 100) + ' %</span>'; });
    bar += '<span style="margin-left:auto">' + (t[2] / PC.D.plan.atleta.pesoKg).toFixed(1).replace('.', ',') + ' g de proteína por kg</span></div>';
    var pr = Math.round(t[2]);
    bar += '<div style="font-size:.75rem;margin-top:5px;color:' + (pr >= 130 && pr <= 145 ? 'var(--ok)' : 'var(--warn)') + '">Tu nutricionista trabaja con 130–145 g de proteína al día. Hoy: ' + pr + ' g</div>';
    document.getElementById('m-bars').innerHTML = bar;
  }


  var PROT = {
    pollo:['pollo',150], pavo:['pavo',150], ternera:['ternera',140], albondiga:['ternera',150],
    hamburguesa:['ternera',150], lomo:['cerdo',140], huevo:['huevo',110],
    salmon:['pescado azul',150], caballa:['pescado azul',90], sardina:['pescado azul',80],
    atun:['pescado blanco',80], merluza:['pescado blanco',180], bacalao:['pescado blanco',180],
    gambas:['marisco',150], mejillon:['marisco',200],
    legumbre:['legumbre',80], tofu:['legumbre',150], queso_t:['lácteo',60]
  };
  var ENCAJA = {
    arroz:      ['pollo','pavo','ternera','albondiga','salmon','gambas','huevo','tofu','lomo'],
    pasta:      ['atun','pollo','ternera','gambas','salmon','huevo','albondiga'],
    potaje:     ['legumbre','pollo','ternera','lomo'],
    papa:       ['caballa','atun','sardina','huevo','merluza','bacalao','pollo','mejillon'],
    ensalada:   ['pollo','atun','caballa','huevo','gambas','salmon','pavo','queso_t','sardina'],
    wok:        ['pavo','pollo','ternera','gambas','tofu','lomo'],
    fajita:     ['pollo','pavo','ternera','lomo'],
    hamburguesa:['hamburguesa','pollo','pavo'],
    poke:       ['salmon','pollo','atun','gambas','tofu'],
    sarten:     ['huevo','gambas','atun','pollo','queso_t'],
    tortilla:   ['huevo','atun','queso_t']
  };

  // ---- hidratos intercambiables: clave -> gramos con hidratos equivalentes ----
  var CARB = { arroz:75, pasta:70, quinoa:85, cuscus:75, papa:320, batata:270, legumbre:100, pan_n:115 };
  var CARB_OK = {
    cereal:     ['arroz','pasta','quinoa','cuscus','papa','batata'],
    tuberculo:  ['papa','batata','arroz','quinoa','cuscus'],
    potaje:     ['legumbre','papa','arroz']
  };
  // ---- cómo se cocina cada alimento intercambiable ----
  var COC = {
    arroz:    [34,'Agua abundante con sal. Cuando hierva, echa el arroz integral y tapa. 28 min.','24 cm · nivel 9 + Sprint, luego 5'],
    pasta:    [14,'Agua con sal. Pasta sin gluten 7–9 min. Pruébala un minuto antes de lo que diga el paquete: se pasa de golpe.','24 cm · nivel 9 + Sprint, luego 6'],
    quinoa:   [20,'Enjuágala bien bajo el grifo para quitarle el amargor. Doble de agua que de quinoa, 15 min tapada.','18 cm · nivel 5'],
    cuscus:   [7,'Mismo volumen de agua hirviendo que de cuscús. Tapa, 5 min fuera del fuego y suelta con un tenedor.','15 cm · nivel 9'],
    papa:     [28,'Enteras con piel, desde agua fría con sal gorda. 20–25 min desde que hierve. Listas cuando el cuchillo entre sin resistencia.','24 cm · nivel 9 + Sprint, luego 5'],
    batata:   [30,'En gajos, secos con papel y con aceite y sal. Horno 200° 25 min, o airfryer 18 min, volteando a mitad.','Horno / Airfryer 200°'],
    legumbre: [90,'Remojada desde la noche anterior. Garbanzo 1h30 · lenteja 35 min · judía 1h15. En olla rápida, un tercio. La sal al final.','24 cm · nivel 3'],
    pan_n:    [2,'Tuesta el pan por dentro, en la sartén o la tostadora.','18 cm · nivel 6'],
    pollo:     [11,'Abierto en filetes de 1,5 cm y con sal. Plancha muy caliente, 3–4 min por lado sin tocarlo. Reposa 3 min antes de cortarlo.','18 cm · nivel 8'],
    pavo:      [6,'En tacos, sartén al máximo, 2–3 min sellando por fuera sin removerlo todo el rato.','18 cm · nivel 9'],
    ternera:   [10,'Filetes con sal. Plancha muy caliente, 3 min por lado para el punto. Reposa antes de cortar.','18 cm · nivel 9'],
    albondiga: [10,'Con un hilo de aceite, dándoles vuelta cada 2–3 min hasta doradas por todos lados.','18 cm · nivel 7'],
    hamburguesa:[7,'Sartén muy caliente, sal por encima y no la toques. Una vuelta a los 3 min. El queso el último minuto, tapada.','18 cm · nivel 9'],
    lomo:      [10,'Filetes finos con sal. Plancha caliente, 3 min por lado.','18 cm · nivel 8'],
    huevo:     [12,'Cocido: en agua ya hirviendo, 10 min exactos, y luego a agua fría para que la cáscara salga sola. En tortilla: batido, sartén a nivel 6, 1 min por lado.','15 cm · nivel 6'],
    salmon:    [14,'Al horno a 200°, piel abajo, con sal, aceite y limón, 12–14 min. Está cuando la carne se abre en láminas. A la plancha: 3 min piel, 2 min el otro lado.','Horno 200°'],
    caballa:   [1,'De lata: escúrrela bien y añádela al final, ya sin fuego. Cocinarla la reseca.','—'],
    atun:      [1,'De lata: escurrido y con el fuego apagado. Si lo cocinas se reseca y pierde todo lo bueno.','—'],
    sardina:   [1,'De lata: escurrida y directamente al plato.','—'],
    merluza:   [8,'Lomos con sal. Plancha caliente, 3 min por lado. O al horno 180° 12 min. Pasarse la reseca enseguida.','18 cm · nivel 7'],
    bacalao:   [8,'Si es salado, desalado 24 h cambiando el agua. Plancha 3 min por lado o horno 180° 12 min.','18 cm · nivel 7'],
    gambas:    [3,'Sartén caliente, 1 min por lado. En cuanto cambian de color están: un minuto de más y quedan gomosas.','18 cm · nivel 8'],
    mejillon:  [6,'Al vapor con un dedo de agua y tapados. 5 min, hasta que se abran. Los que no se abran, fuera.','18 cm · nivel 8'],
    tofu:      [10,'Escúrrelo y prénsalo 10 min con un peso encima. En dados, a la sartén con un poco de aceite, 8 min girándolos hasta dorados.','18 cm · nivel 7'],
    queso_t:   [1,'Sin cocción. Al plato tal cual, o 3 min al grill si quieres que funda.','—']
  };

  var EXCOC = {
    hoja:   ['lechuga','ensalada','espinaca','rucula'],
    saltear:['calabacin','berenjena','pimiento','pimiento_v','cebolla','zanahoria','puerro','apio','setas','champi'],
    hervir: ['brocoli','judia_v','coliflor','esparrago','alcachofa','guisante','edamame','remolacha','calabaza','maiz'],
    crudo:  ['tomate','pepino','aguacate','aceituna','queso_t','queso_f','queso_l','requeson'],
    fruta:  ['fruta','manzana','naranja','uva','fresa','kiwi','pina','platano','pera','melon','sandia','melocoton','ciruela','mango','datil','pasa']
  };
  var EXTXT = {
    hoja:   [1,'Lavada y bien escurrida. Va en crudo, al final y fuera del fuego: si la calientas se apelmaza.','—'],
    saltear:[6,'En rodajas o dados. A la sartén con un hilo de aceite, 5–6 min, hasta que esté tierna pero con algo de mordida.','18 cm · nivel 6'],
    hervir: [5,'4–5 min en agua hirviendo con sal, o al vapor. Que quede al dente: pasada pierde color y textura.','24 cm · nivel 7'],
    crudo:  [2,'En crudo, cortado y añadido al final.','—'],
    fruta:  [1,'De postre, al terminar.','—']
  };
  function catEx(k) {
    for (var c in EXCOC) if (EXCOC[c].indexOf(k) >= 0) return c;
    return null;
  }
  function pasoEx(k) {
    var c = catEx(k);
    if (c) return EXTXT[c];
    if (COC[k]) return COC[k];
    return [2, 'Añádelo donde encaje. Si no necesita cocción, al final y con el fuego apagado.', '—'];
  }


  var RACION = { hoja:60, saltear:100, hervir:150, crudo:80, fruta:150 };

  // ración por defecto de cada alimento, en gramos
  var RAC = {
    pimienta:2, sal:2, comino:2, pimenton:3, oregano:2, ajo:6, perejil:5, curry:3, canela:2,
    laurel:1, vinagre:10, limon:15, aove:10, soja:10, sesamo:8, cesar:15, salsat:60,
    miel:15, mermelada:20, cacahuete:20, choco:12, chocolate_l:25, aceituna:30,
    frutosec:30, almendra:30, nuez:30, pasa:25, datil:25, proteina:30,
    leche:200, leche_e:250, leche_ent:200, avena_b:200, zumo:200, refresco:330, cerveza:330,
    yogur:125, batido:150, requeson:100, queso_t:40, queso_f:40, queso_l:20, queso_c:50,
    pan:60, pan_n:60, panfaj:100, tortita:20, galleta:30, picatoste:25,
    gofio:30, avena:40, quinoa:80, cuscus:70, arroz:75, pasta:70, legumbre:80,
    papa:250, batata:200, maiz:80, guisante:100, edamame:60,
    huevo:110, pollo:150, pavo:150, ternera:140, lomo:140, albondiga:150, hamburguesa:150,
    salmon:150, merluza:180, bacalao:180, atun:80, caballa:90, sardina:80, gambas:120,
    mejillon:200, tofu:150, jamon:50, pavo_l:50, salmon_a:50, hummus:50,
    aguacate:70, tomate:80, cebolla:50, pepino:60, zanahoria:70, calabacin:100, berenjena:100,
    pimiento:60, pimiento_v:60, champi:80, setas:80, espinaca:80, ensalada:50, lechuga:60,
    brocoli:150, judia_v:150, coliflor:150, col:120, calabaza:150, puerro:80, apio:60,
    esparrago:120, alcachofa:120, remolacha:80, verdura:150,
    fruta:150, platano:120, manzana:180, naranja:200, uva:120, fresa:150, kiwi:100,
    pina:150, pera:170, melon:200, sandia:250, melocoton:150, ciruela:120, mango:150,
    patatas_f:30, helado:80, pizza:250, croqueta:100
  };
  function sugiere(k, off) {
    if (RAC[k]) return RAC[k];
    if (PROT[k]) return PROT[k][1];
    if (CARB[k]) return CARB[k];
    if (off) {                                  // datos reales del producto
      if (off.serving_quantity) return Math.round(+off.serving_quantity);
      var c = (off.categories_tags || []).join(' ');
      if (/spice|condiment|herb|especia/.test(c)) return 3;
      if (/sauce|salsa|dressing/.test(c)) return 20;
      if (/oil|aceite|vinegar/.test(c)) return 10;
      if (/beverage|bebida|juice|zumo|water/.test(c)) return 250;
      if (/yogurt|yogur|dairy-dessert/.test(c)) return 125;
      if (/cheese|queso/.test(c)) return 40;
      if (/cereal|muesli/.test(c)) return 40;
      if (/biscuit|galleta|snack|chocolate/.test(c)) return 30;
      if (/bread|pan/.test(c)) return 60;
      if (/meat|carne|fish|pescado/.test(c)) return 150;
    }
    var c2 = catEx(k);
    if (c2 && RACION[c2]) return RACION[c2];
    var f = FF(k);
    if (!f) return 100;
    if (f[1] >= 250 && f[2] + f[3] + f[4] > 60) return 15;   // muy denso: condimento o grasa
    if (f[1] >= 450) return 25;
    if (f[1] < 40) return 120;
    return 100;
  }

  var CSWAP = {};      // 'sec|idx' -> clave de hidrato
  var QUITA = {};      // 'sec|idx' -> [indices de ingredientes quitados]
  function quitados(sec) { return QUITA[sec + '|' + srcIdx(sec)] || []; }
  function carbActual(sec) {
    var d = DIAS[srcIdx(sec)], meta = sec === 'comida' ? d.hc : d.hn;
    if (!meta) return null;
    return CSWAP[sec + '|' + srcIdx(sec)] || (sec === 'comida' ? d.comida : d.cena)[meta[0]][0];
  }
  function aplicaCarb(sec, arr, meta) {
    var k = CSWAP[sec + '|' + srcIdx(sec)];
    if (!k || !meta) return arr;
    return arr.map(function (it, i) { return i === meta[0] ? [k, CARB[k]] : it; });
  }
  function pintaCarbSel(sec) {
    var d = DIAS[srcIdx(sec)], meta = sec === 'comida' ? d.hc : d.hn;
    if (!meta) return '';
    var lista = CARB_OK[meta[1]] || [], act = carbActual(sec);
    if (!lista.length) return '';
    var h = '<div class="protsel"><span class="lb">Hidrato</span><select data-carb="' + sec + '">';
    lista.forEach(function (k) {
      if (!F[k]) return;
      h += '<option value="' + k + '"' + (k === act ? ' selected' : '') + '>' + F[k][0] + '  ·  ' + CARB[k] + ' g</option>';
    });
    return h + '</select></div>';
  }

  var PSWAP = {};
  function aplicaProt(sec, arr, meta) {
    var k = PSWAP[sec + '|' + srcIdx(sec)];
    if (!k || !meta) return arr;
    return arr.map(function (it, i) { return i === meta[0] ? [k, PROT[k][1]] : it; });
  }
  function protActual(sec) {
    var d = DIAS[srcIdx(sec)], meta = sec === 'comida' ? d.pc : d.pn;
    return PSWAP[sec + '|' + srcIdx(sec)] || (sec === 'comida' ? d.comida : d.cena)[meta[0]][0];
  }
  function otraProt(sec) {
    var k = protActual(sec === 'comida' ? 'cena' : 'comida');
    return PROT[k] ? PROT[k][0] : null;
  }
  function pintaProtSel(sec) {
    var d = DIAS[srcIdx(sec)], meta = sec === 'comida' ? d.pc : d.pn;
    var lista = ENCAJA[meta[1]] || [];
    if (!lista.length) return '';
    var act = protActual(sec), fam = otraProt(sec), buenas = [], repes = [];
    lista.forEach(function (k) {
      if (!PROT[k] || !F[k]) return;
      (PROT[k][0] === fam ? repes : buenas).push(k);
    });
    function op(k) {
      return '<option value="' + k + '"' + (k === act ? ' selected' : '') + '>' + F[k][0] + '  ·  ' + PROT[k][1] + ' g</option>';
    }
    var h = '<div class="protsel"><span class="lb">Proteína</span><select data-prot="' + sec + '">' +
            (buenas.length ? '<optgroup label="Recomendadas hoy">' + buenas.map(op).join('') + '</optgroup>' : '') +
            (repes.length ? '<optgroup label="Repiten ' + fam + ', que ya tienes en la otra comida">' + repes.map(op).join('') + '</optgroup>' : '') +
            '</select></div>';
    var famAct = PROT[act] ? PROT[act][0] : '';
    h += famAct === fam
      ? '<div class="pw">Hoy comes ' + fam + ' dos veces. Tu nutricionista alterna la fuente en cada comida: elige otra de las recomendadas.</div>'
      : '<div class="po">' + (fam ? 'Bien: ' + famAct + ' aquí, ' + fam + ' en la otra comida.' : 'Sin repeticiones.') + '</div>';
    return h;
  }

  var NOMC = {
    pollo:'pollo', pavo:'pavo', ternera:'ternera', albondiga:'albóndigas', hamburguesa:'hamburguesa',
    lomo:'lomo', huevo:'huevo', salmon:'salmón', caballa:'caballa', sardina:'sardinas',
    atun:'atún', merluza:'merluza', bacalao:'bacalao', gambas:'gambas', mejillon:'mejillones',
    legumbre:'legumbres', tofu:'tofu', queso_t:'queso',
    arroz:'arroz integral', pasta:'pasta sin gluten', papa:'papas', batata:'batata',
    quinoa:'quinoa', cuscus:'cuscús', pan_n:'pan'
  };
  function nomC(k) { return NOMC[k] || (FF(k) ? FF(k)[0].toLowerCase() : ''); }
  function titulo(sec, base) {
    if (!base || base.indexOf('{') < 0) return base;
    var ck = carbActual(sec);
    var t = base.replace('{p}', nomC(protActual(sec))).replace('{h}', ck ? nomC(ck) : '');
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function tituloBase(d, campo) {
    var b = d[campo];
    if (!b || b.indexOf('{') < 0) return b;
    var arr = campo === 'nc' ? d.comida : d.cena, mp = campo === 'nc' ? d.pc : d.pn, mh = campo === 'nc' ? d.hc : d.hn;
    var t = b.replace('{p}', nomC(arr[mp[0]][0])).replace('{h}', mh ? nomC(arr[mh[0]][0]) : '');
    return t.charAt(0).toUpperCase() + t.slice(1);
  }


  // ================= SUGERENCIAS =================
  var VEG_OK = {
    arroz:['brocoli','judia_v','calabacin','pimiento','zanahoria','champi','espinaca','guisante'],
    pasta:['calabacin','champi','espinaca','tomate','berenjena','pimiento','brocoli'],
    potaje:['calabaza','judia_v','puerro','apio','col','zanahoria'],
    papa:['tomate','pimiento','cebolla','judia_v','esparrago','brocoli'],
    ensalada:['tomate','pepino','cebolla','zanahoria','remolacha','esparrago','aceituna','maiz','aguacate'],
    wok:['brocoli','pimiento','zanahoria','judia_v','champi','cebolla'],
    fajita:['tomate','cebolla','pimiento','aguacate','ensalada'],
    hamburguesa:['tomate','cebolla','ensalada','aceituna','pepino'],
    poke:['pepino','zanahoria','aguacate','edamame','maiz'],
    sarten:['espinaca','champi','tomate','calabacin','pimiento'],
    tortilla:['cebolla','pimiento','calabacin','espinaca']
  };
  function sugerencias(sec) {
    var d = DIAS[srcIdx(sec)], meta = sec === 'comida' ? d.pc : d.pn;
    var tipo = meta ? meta[1] : 'ensalada';
    var S = secciones().filter(function (x) { return x[0] === sec; })[0];
    var hay = {};
    S[2].forEach(function (it, i) { if (quitados(sec).indexOf(i) < 0) hay[it[0]] = 1; });
    (EXTRAS[exKey(sec)] || []).forEach(function (e) { hay[e[0]] = 1; });

    var t = calcMacros(), out = [];
    var nVeg = Object.keys(hay).filter(function (k) { return metodo(k) === 'saltear' || metodo(k) === 'hervir' || ['tomate','pepino','lechuga','ensalada','aguacate'].indexOf(k) >= 0; }).length;
    var hayAlino = Object.keys(hay).some(function (k) { return metodo(k) === 'alino'; });
    var hayPostre = Object.keys(hay).some(function (k) { return metodo(k) === 'postre'; });

    if (Math.round(t[2]) < 130) {
      (ENCAJA[tipo] || []).forEach(function (k) {
        if (hay[k] || out.length >= 4 || !F[k]) return;
        if (PROT[k]) out.push([k, 'te faltan ' + Math.round(130 - t[2]) + ' g de proteína hoy']);
      });
    }
    if (nVeg < 4) {
      (VEG_OK[tipo] || VEG_OK.ensalada).forEach(function (k) {
        if (hay[k] || out.length >= 4 || !F[k]) return;
        out.push([k, nVeg < 2 ? 'el plato va corto de verdura' : 'suma volumen con casi nada de calorías']);
      });
    }
    if (!hayAlino) out.push(['aove', tipo === 'ensalada' ? 'sin aliño' : 'un hilo al final redondea el plato']);
    if (!hayPostre && (sec === 'comida')) out.push(['fruta', 'tu pauta lleva fruta de postre']);
    return out.slice(0, 3);
  }
  function pintaSug(sec) {
    var sg = sugerencias(sec);
    if (!sg.length) return '';
    var h = '<div class="sug"><span class="st">Podrías añadir</span>';
    sg.forEach(function (e) {
      h += '<button type="button" class="sugb" data-sug="' + sec + '" data-k="' + e[0] + '">+ ' + F[e[0]][0] +
           ' <em>' + sugiere(e[0]) + ' g</em><span>' + e[1] + '</span></button>';
    });
    return h + '</div>';
  }

  // ================= REGISTRO DE DÍAS =================
  var REG = {};
  try { REG = JSON.parse(localStorage.getItem('pc-reg') || '{}'); } catch (e) { REG = {}; }
  function guardaReg() { try { localStorage.setItem('pc-reg', JSON.stringify(REG)); } catch (e) {} }
  function claveDia() {
    var hoy = new Date(), off = diaSel - ((hoy.getDay() + 6) % 7);
    var f = new Date(hoy.getTime() + off * 86400000);
    return f.getFullYear() + '-' + ('0' + (f.getMonth() + 1)).slice(-2) + '-' + ('0' + f.getDate()).slice(-2);
  }
  function registraDia() {
    var t = calcMacros(), k = claveDia();
    var comidas = {};
    secciones().forEach(function (S) {
      var items = [];
      S[2].forEach(function (it, i) { if (quitados(S[0]).indexOf(i) < 0) items.push(FF(it[0])[0] + ' ' + gramos(S[0], i, it[1]) + ' g'); });
      (EXTRAS[exKey(S[0])] || []).forEach(function (e) { items.push(FF(e[0])[0] + ' ' + e[1] + ' g'); });
      comidas[S[1]] = { t: (S[0] === 'comida' || S[0] === 'cena') ? titulo(S[0], S[3]) : S[3], i: items };
    });
    REG[k] = { dia: DIAS[diaSel].d, fecha: k, kcal: Math.round(t[0]), hc: Math.round(t[1]), pr: Math.round(t[2]), gr: Math.round(t[3]), c: comidas };
    guardaReg(); pintaReg();
  }
  function borraReg() { delete REG[claveDia()]; guardaReg(); pintaReg(); }
  function pintaReg() {
    var n = document.getElementById('reg-box'); if (!n) return;
    var k = claveDia(), hecho = !!REG[k], total = Object.keys(REG).length;
    n.innerHTML =
      '<button type="button" class="regb ' + (hecho ? 'si' : '') + '" id="reg-t">' + (hecho ? '✓ Día registrado' : '○ Marcar día como hecho') + '</button>' +
      '<span class="rc">' + total + (total === 1 ? ' día guardado' : ' días guardados') + '</span>' +
      (total ? '<button type="button" class="btn" id="reg-pdf">Generar PDF</button><button type="button" class="btn" id="reg-clr">Vaciar</button>' : '');
    document.getElementById('reg-t').addEventListener('click', function () { hecho ? borraReg() : registraDia(); });
    var pb = document.getElementById('reg-pdf');
    if (pb) pb.addEventListener('click', abrePDF);
    var cb = document.getElementById('reg-clr');
    if (cb) cb.addEventListener('click', function () { REG = {}; guardaReg(); pintaReg(); });
  }
  function cargaJsPDF() {
    return new Promise(function (ok, ko) {
      if (window.jspdf && window.jspdf.jsPDF) return ok(window.jspdf.jsPDF);
      var sc = document.createElement('script');
      sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      sc.onload = function () { ok(window.jspdf.jsPDF); };
      sc.onerror = function () { ko(); };
      document.head.appendChild(sc);
    });
  }
  function abrePDF() {
    var box = document.getElementById('pdf-opts');
    var ks = Object.keys(REG).sort(), max = ks.length;
    if (!max) return;
    var ops = [3, 7, 14].filter(function (n) { return n < max; }).concat([max]);
    box.innerHTML = '<span class="st">¿Cuántos días?</span>' +
      ops.map(function (n) { return '<button type="button" class="btn" data-n="' + n + '">' + (n === max ? 'Todos · ' + n : 'Últimos ' + n) + '</button>'; }).join('') +
      '<button type="button" class="btn" data-n="0">Cancelar</button>';
    box.style.display = 'flex';
    box.querySelectorAll('[data-n]').forEach(function (b) {
      b.addEventListener('click', function () {
        box.style.display = 'none';
        var n = +b.dataset.n;
        if (n) generaPDF(ks.slice(-n));
      });
    });
  }
  function generaPDF(sel) {
    var av = document.getElementById('pdf-opts');
    av.style.display = 'flex';
    av.innerHTML = '<span class="st">Generando el PDF…</span>';
    cargaJsPDF().then(function (JsPDF) {
      var doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      var M = 10, W = 297 - M * 2, LW = 26, CW = (W - LW) / sel.length;
      var y = M;

      doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
      doc.text('Educación alimentaria · registro', M, y + 4);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(110);
      doc.text('Daniel · ' + sel.length + (sel.length === 1 ? ' día registrado' : ' días registrados'), M, y + 9);
      doc.setTextColor(0);
      y += 14;

      var filas = ['Desayuno', 'Media mañana', 'Comida', 'Merienda', 'Cena'];
      // cabecera
      doc.setFillColor(238); doc.setDrawColor(170);
      doc.rect(M, y, LW, 9, 'FD');
      sel.forEach(function (k, c) {
        var r = REG[k];
        doc.rect(M + LW + c * CW, y, CW, 9, 'FD');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
        doc.text(r.dia, M + LW + c * CW + 2, y + 4);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(110);
        doc.text(r.fecha.split('-').reverse().slice(0, 2).join('/'), M + LW + c * CW + 2, y + 7.5);
        doc.setTextColor(0);
      });
      y += 9;

      filas.forEach(function (f) {
        var celdas = sel.map(function (k) {
          var c = REG[k].c[f];
          if (!c) return { t: [], i: [] };
          return {
            t: doc.splitTextToSize(c.t, CW - 4),
            i: doc.splitTextToSize(c.i.join(' · '), CW - 4)
          };
        });
        var alto = Math.max(11, Math.max.apply(null, celdas.map(function (c) { return 4 + c.t.length * 3.1 + c.i.length * 2.7; })));
        if (y + alto > 200) { doc.addPage(); y = M; }
        doc.setFillColor(247); doc.setDrawColor(170);
        doc.rect(M, y, LW, alto, 'FD');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
        doc.text(f, M + 2, y + 5);
        celdas.forEach(function (c, ci) {
          var x = M + LW + ci * CW;
          doc.setFillColor(255);
          doc.rect(x, y, CW, alto, 'FD');
          var yy = y + 4;
          doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(0);
          c.t.forEach(function (l) { doc.text(l, x + 2, yy); yy += 3.1; });
          doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(90);
          c.i.forEach(function (l) { doc.text(l, x + 2, yy); yy += 2.7; });
          doc.setTextColor(0);
        });
        y += alto;
      });

      // macros
      doc.setFillColor(240); doc.setDrawColor(170);
      doc.rect(M, y, LW, 11, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
      doc.text('Macros', M + 2, y + 5);
      sel.forEach(function (k, c) {
        var r = REG[k], x = M + LW + c * CW;
        doc.setFillColor(252); doc.rect(x, y, CW, 11, 'FD');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
        doc.text(r.kcal + ' kcal', x + 2, y + 4.5);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(90);
        doc.text('HC ' + r.hc + '  ·  P ' + r.pr + '  ·  G ' + r.gr, x + 2, y + 8.5);
        doc.setTextColor(0);
      });
      y += 11;

      doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(130);
      doc.text('Pauta elaborada con la nutricionista. Valores aproximados de tablas de composición; pesos de cereales, legumbres, carne y pescado en crudo.', M, y + 5);

      var nombre = 'dieta-' + sel[0] + '_' + sel[sel.length - 1] + '.pdf';
      try {
        doc.save(nombre);
        av.innerHTML = '<span class="st">Listo. Búscalo en Archivos o en Descargas.</span>';
      } catch (e) {
        window.open(doc.output('bloburl'), '_blank');
        av.innerHTML = '<span class="st">Se ha abierto en otra pestaña: compártelo para guardarlo.</span>';
      }
      setTimeout(function () { av.style.display = 'none'; }, 4000);
    }).catch(function () {
      av.innerHTML = '<span class="st" style="color:var(--alert)">No he podido cargar el generador de PDF. Necesitas conexión la primera vez.</span>';
      setTimeout(function () { av.style.display = 'none'; }, 4000);
    });
  }
  function pintaSwap() {
    var w = document.getElementById('swap'); if (!w) return;
    var opt = function (sel, campo) {
      return DIAS.map(function (d, i) {
        return '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + tituloBase(d, campo) +
               (i === diaSel ? '  ·  el de hoy' : '  ·  del ' + d.d.toLowerCase()) + '</option>';
      }).join('');
    };
    var m = compat(selC, selN);
    w.innerHTML =
      '<div class="row"><span class="lb">Comida</span><select id="sel-c">' + opt(selC, 'nc') + '</select></div>' +
      '<div class="row"><span class="lb">Cena</span><select id="sel-n">' + opt(selN, 'nn') + '</select></div>' +
      (m.length
        ? (selC === diaSel && selN === diaSel ? '' : '<div class="warn">Ese día ' + m.join(' y ') + '. Tu nutricionista alterna las fuentes: prueba otra cena.</div>')
        : '<div class="ok2">Día compensado: ' + DIAS[selC].tc.p + ' al mediodía y ' + DIAS[selN].tn.p + ' por la noche.</div>') +
      (selC !== diaSel || selN !== diaSel
        ? '<div class="warn" style="color:var(--muted)">Estás viendo un menú movido de sitio. Sigue siendo comida de tu semana, solo que en otro día.</div>' : '');
    document.getElementById('sel-c').addEventListener('change', function (e) {
      selC = +e.target.value; selN = selC;   // la cena que venía con esa comida
      pintaDieta();
    });
    document.getElementById('sel-n').addEventListener('change', function (e) {
      selN = +e.target.value; pintaDieta();
    });
  }
  function bindExtras() {
    var root = document.getElementById('dieta-body');
    root.querySelectorAll('[data-sug]').forEach(function (b) {
      b.addEventListener('click', function () {
        var key = exKey(b.dataset.sug);
        EXTRAS[key] = EXTRAS[key] || [];
        EXTRAS[key].push([b.dataset.k, sugiere(b.dataset.k)]);
        pintaDieta();
      });
    });
    root.querySelectorAll('[data-carb]').forEach(function (sl) {
      sl.addEventListener('change', function () {
        var sec = sl.dataset.carb, d = DIAS[srcIdx(sec)], meta = sec === 'comida' ? d.hc : d.hn;
        CSWAP[sec + '|' + srcIdx(sec)] = sl.value;
        delete EDIT[sec + '|' + meta[0] + '|' + srcIdx(sec)];
        var qk2 = sec + '|' + srcIdx(sec);
        if (QUITA[qk2]) QUITA[qk2] = QUITA[qk2].filter(function (x) { return x !== meta[0]; });
        pintaDieta();
      });
    });
    root.querySelectorAll('[data-q]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.q + '|' + srcIdx(b.dataset.q);
        QUITA[k] = QUITA[k] || [];
        QUITA[k].push(+b.dataset.qi);
        pintaDieta();
      });
    });
    root.querySelectorAll('[data-undo]').forEach(function (b) {
      b.addEventListener('click', function () {
        delete QUITA[b.dataset.undo + '|' + srcIdx(b.dataset.undo)];
        pintaDieta();
      });
    });
    root.querySelectorAll('[data-prot]').forEach(function (sl) {
      sl.addEventListener('change', function () {
        var sec = sl.dataset.prot, d = DIAS[srcIdx(sec)], meta = sec === 'comida' ? d.pc : d.pn;
        PSWAP[sec + '|' + srcIdx(sec)] = sl.value;
        delete EDIT[sec + '|' + meta[0] + '|' + srcIdx(sec)];
        var qk = sec + '|' + srcIdx(sec);
        if (QUITA[qk]) QUITA[qk] = QUITA[qk].filter(function (x) { return x !== meta[0]; });
        pintaDieta();
      });
    });
    root.querySelectorAll('[data-add]').forEach(function (b) {
      b.addEventListener('click', function () {
        var f = root.querySelector('[data-form="' + b.dataset.add + '"]');
        if (f.style.display === 'flex') { f.style.display = 'none'; f.innerHTML = ''; return; }
        f.style.display = 'flex';
        f.innerHTML =
          '<input class="q" placeholder="Busca un alimento o un producto de super…" style="flex:1;min-width:100%">' +
          '<div class="res" style="width:100%;margin-top:8px"></div>' +
          '<div class="man" style="display:none;width:100%;gap:6px;flex-wrap:wrap;margin-top:6px">' +
          '<input class="mn" placeholder="Nombre" style="flex:1;min-width:120px">' +
          '<input class="mk" type="number" placeholder="kcal" style="width:72px">' +
          '<input class="mh" type="number" placeholder="HC" style="width:60px">' +
          '<input class="mp" type="number" placeholder="Prot" style="width:60px">' +
          '<input class="mg" type="number" placeholder="Grasa" style="width:62px">' +
          '<button type="button" class="btn conf">Añadir a mano</button>' +
          '<span style="font-size:.75rem;color:var(--faint);width:100%">Valores por 100 g, como vienen en la etiqueta</span></div>';
        var q = f.querySelector('.q'), res = f.querySelector('.res'), man = f.querySelector('.man'), token = 0;

        function pideGramos(nom, base, onOk) {
          var med = Math.round(base / 2 / 5) * 5, gen = Math.round(base * 1.5 / 5) * 5;
          var box = document.createElement('div');
          box.className = 'gsel';
          box.innerHTML = '<div class="gt">¿Cuánto de <strong>' + nom + '</strong>?</div>' +
            '<button type="button" data-g="' + med + '">Media ración<span>' + med + ' g</span></button>' +
            '<button type="button" data-g="' + base + '" class="rec">Recomendada para este plato<span>' + base + ' g</span></button>' +
            '<button type="button" data-g="' + gen + '">Ración generosa<span>' + gen + ' g</span></button>' +
            '<div class="libre"><input type="number" class="gl" value="' + base + '" min="1" max="900" step="5"><span>g</span>' +
            '<button type="button" class="btn ok">Añadir</button></div>';
          res.innerHTML = ''; res.appendChild(box);
          box.querySelectorAll('[data-g]').forEach(function (bt) {
            bt.addEventListener('click', function () { onOk(+bt.dataset.g); });
          });
          box.querySelector('.ok').addEventListener('click', function () {
            onOk(Math.max(1, +box.querySelector('.gl').value || base));
          });
        }
        function añade(k, vals, g) {
          if (vals) CUSTOM[k] = vals;
          var key = exKey(b.dataset.add);
          EXTRAS[key] = EXTRAS[key] || [];
          EXTRAS[key].push([k, g]);
          pintaDieta();
        }
        function fila(nom, sub, onc) {
          var dd = document.createElement('button');
          dd.type = 'button'; dd.className = 'resrow';
          dd.innerHTML = '<span class="rn">' + nom + '</span><span class="rs">' + sub + '</span>';
          dd.addEventListener('click', onc);
          return dd;
        }
        var deb;
        q.addEventListener('input', function () {
          var t = q.value.trim().toLowerCase(), mine = ++token;
          res.innerHTML = ''; man.style.display = 'none';
          clearTimeout(deb);
          if (t.length < 2) return;
          var loc = Object.keys(F).filter(function (k) { return F[k][0].toLowerCase().indexOf(t) >= 0; }).slice(0, 6);
          loc.forEach(function (k) {
            res.appendChild(fila(F[k][0], F[k][1] + ' kcal · HC ' + F[k][2] + ' · P ' + F[k][3] + ' · G ' + F[k][4] + '  ·  tabla de composición',
              function () { pideGramos(F[k][0], sugiere(k), function (g) { añade(k, null, g); }); }));
          });
          deb = setTimeout(function () { buscaOFF(t, mine, loc.length); }, 500);
        });
        function buscaOFF(t, mine, yaHay) {
          var aviso = document.createElement('div');
          aviso.style.cssText = 'font-size:.75rem;color:var(--faint);padding:7px 2px';
          aviso.textContent = 'Buscando productos de supermercado…';
          res.appendChild(aviso);
          var intento = 0;
          function pide() {
            intento++;
            fetch('https://es.openfoodfacts.org/cgi/search.pl?search_terms=' + encodeURIComponent(t) +
                  '&json=1&page_size=6&fields=product_name,brands,nutriments,serving_quantity,categories_tags')
              .then(function (r) { if (!r.ok) throw 0; return r.json(); })
              .then(function (d) {
                if (mine !== token) return;
                aviso.remove();
                var hay = 0;
                (d.products || []).forEach(function (pr) {
                  var n = pr.nutriments || {}, kc = n['energy-kcal_100g'];
                  if (!pr.product_name || kc === undefined) return;
                  hay++;
                  var nom = pr.product_name + (pr.brands ? ' · ' + pr.brands.split(',')[0] : '');
                  var vals = [nom, Math.round(kc), +(n.carbohydrates_100g || 0), +(n.proteins_100g || 0), +(n.fat_100g || 0)];
                  res.appendChild(fila(nom, vals[1] + ' kcal · HC ' + vals[2] + ' · P ' + vals[3] + ' · G ' + vals[4] + '  ·  Open Food Facts',
                    function () { var k = 'off' + Date.now(); CUSTOM[k] = vals; pideGramos(nom, sugiere(k, pr), function (g) { añade(k, vals, g); }); }));
                });
                if (!hay && !yaHay) manual('Ese producto no aparece en la base de datos. Métele los valores de la etiqueta:');
              })
              .catch(function () {
                if (mine !== token) return;
                if (intento < 2) { setTimeout(pide, 900); return; }
                aviso.remove();
                if (!yaHay) manual('La base de datos de productos no responde ahora mismo. Métele los valores de la etiqueta:');
                else {
                  var nn = document.createElement('div');
                  nn.style.cssText = 'font-size:.75rem;color:var(--faint);padding:5px 2px';
                  nn.textContent = 'Los productos de supermercado no han cargado. Arriba tienes los de la tabla de composición.';
                  res.appendChild(nn);
                }
              });
          }
          pide();
        }
        function manual(txt) {
          var m = document.createElement('div');
          m.style.cssText = 'font-size:.75rem;color:var(--warn);padding:6px 2px;width:100%';
          m.textContent = txt;
          res.appendChild(m);
          man.style.display = 'flex';
          man.querySelector('.mn').value = q.value.trim();
        }
        f.querySelector('.conf').addEventListener('click', function () {
          var nm = (f.querySelector('.mn').value || 'Alimento').trim();
          var vals = [nm, +f.querySelector('.mk').value || 0, +f.querySelector('.mh').value || 0,
                      +f.querySelector('.mp').value || 0, +f.querySelector('.mg').value || 0];
          var k = 'c' + Date.now(); CUSTOM[k] = vals;
          pideGramos(nm, sugiere(k), function (g) { añade(k, vals, g); });
        });
      });
    });
    root.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        EXTRAS[exKey(b.dataset.del)].splice(+b.dataset.j, 1);
        pintaDieta();
      });
    });
    root.querySelectorAll('[data-ex]').forEach(function (n) {
      n.addEventListener('input', function () {
        EXTRAS[exKey(n.dataset.ex)][+n.dataset.j][1] = Math.max(0, +n.value || 0);
        pintaMacros();
      });
      n.addEventListener('change', function () { pintaDieta(); });
    });
  }
  function pintaDieta() {
    var h = '';
    secciones().forEach(function (S) {
      var sub = [0, 0, 0, 0];
      S[2].forEach(function (it, i) { if (quitados(S[0]).indexOf(i) >= 0) return; var f = FF(it[0]), g = gramos(S[0], i, it[1]) / 100; sub[0] += f[1] * g; sub[1] += f[2] * g; sub[2] += f[3] * g; sub[3] += f[4] * g; });
      (EXTRAS[exKey(S[0])] || []).forEach(function (e) { var f = FF(e[0]), g = e[1] / 100; sub[0] += f[1] * g; sub[1] += f[2] * g; sub[2] += f[3] * g; sub[3] += f[4] * g; });
      h += '<details class="acc" open><summary><span style="flex:1"><span style="display:block;font-size:.75rem;color:var(--faint);font-weight:400">' + S[1] + '</span>' + ((S[0] === 'comida' || S[0] === 'cena') ? titulo(S[0], S[3]) : S[3]) + '</span><span class="when">' + Math.round(sub[0]) + ' kcal<br>HC ' + Math.round(sub[1]) + ' · P ' + Math.round(sub[2]) + ' · G ' + Math.round(sub[3]) + '</span></summary><div class="in">';
      if (S[0] === 'comida' || S[0] === 'cena') h += pintaProtSel(S[0]) + pintaCarbSel(S[0]);
      S[2].forEach(function (it, i) {
        if (quitados(S[0]).indexOf(i) >= 0) return;
        var f = FF(it[0]), g = gramos(S[0], i, it[1]);
        var dd = srcIdx(S[0]) === null ? null : DIAS[srcIdx(S[0])];
        var mp = dd ? (S[0] === 'comida' ? dd.pc : dd.pn) : null;
        var mh = dd ? (S[0] === 'comida' ? dd.hc : dd.hn) : null;
        var cam = dd && ((mp && i === mp[0] && PSWAP[S[0] + '|' + srcIdx(S[0])]) || (mh && i === mh[0] && CSWAP[S[0] + '|' + srcIdx(S[0])]));
        h += '<div style="display:flex;align-items:center;gap:10px;padding:7px 9px;border-radius:6px;margin:2px -9px;border-bottom:1px solid var(--rule)' + (cam ? ';background:var(--primary-soft)' : '') + '">' +
             '<span style="flex:1;font-size:.9rem">' + f[0] + '</span>' +
             '<input type="number" min="0" max="600" step="5" value="' + g + '" data-s="' + S[0] + '" data-i="' + i + '" data-def="' + defecto(S[0], i, it[1]) + '" class="' + (g !== defecto(S[0], i, it[1]) ? 'mod' : '') + '" ' +
             'style="width:74px;padding:5px 7px;border:1px solid var(--rule2);border-radius:6px;font:inherit;font-variant-numeric:tabular-nums;font-size:.85rem;text-align:right">' +
             '<span style="font-size:.76rem;color:var(--faint);width:24px">g</span>' +
             '<span class="num" style="font-size:.78rem;color:var(--muted);width:62px;text-align:right">' + Math.round(f[1] * g / 100) + ' kcal</span>' +
             ((S[0] === 'comida' || S[0] === 'cena') ? '<button type="button" class="del" data-q="' + S[0] + '" data-qi="' + i + '" title="Quitar">×</button>' : '') +
             '</div>';
      });
      if ((S[0] === 'comida' || S[0] === 'cena') && quitados(S[0]).length) {
        h += '<div style="font-size:.77rem;color:var(--faint);padding:6px 0">Has quitado ' +
             quitados(S[0]).map(function (ix) { return F[(S[0] === 'comida' ? DIAS[selC].comida : DIAS[selN].cena)[ix][0]][0].toLowerCase(); }).join(', ') +
             '. <button type="button" class="addbtn" style="margin:0 0 0 6px;padding:2px 10px" data-undo="' + S[0] + '">deshacer</button></div>';
      }
      (EXTRAS[exKey(S[0])] || []).forEach(function (e, j) {
        var f = FF(e[0]);
        h += '<div class="exrow" style="display:flex;align-items:center;gap:10px;padding:7px 9px;border-radius:6px;margin:4px 0">' +
             '<span style="flex:1;font-size:.88rem">' + f[0] + '</span>' +
             '<input type="number" min="0" max="900" step="5" value="' + e[1] + '" data-ex="' + S[0] + '" data-j="' + j + '" style="width:70px;padding:5px 7px;border:1px solid var(--rule2);border-radius:6px;font:inherit;font-variant-numeric:tabular-nums;font-size:.83rem;text-align:right">' +
             '<span style="font-size:.75rem;color:var(--faint)">g</span>' +
             '<span class="num" style="font-size:.76rem;color:var(--muted);width:58px;text-align:right">' + Math.round(f[1] * e[1] / 100) + ' kcal</span>' +
             '<button type="button" class="del" data-del="' + S[0] + '" data-j="' + j + '">×</button></div>';
      });
      if (S[0] === 'comida' || S[0] === 'cena') h += pintaSug(S[0]);
      h += '<button type="button" class="addbtn" data-add="' + S[0] + '">+ añadir algo que hayas comido</button>';
      h += '<div class="addrow" data-form="' + S[0] + '" style="display:none"></div>';
      if (S[0] === 'comida' || S[0] === 'cena') {
        h += '<details class="acc" style="margin:12px 0 2px"><summary><span style="flex:1">Cómo se cocina</span><span class="when">' + (REC[DIAS[S[0] === 'comida' ? selC : selN].d + '|' + S[0]] || {tot:''}).tot + ' min</span></summary><div class="in">' + pintaReceta(DIAS[S[0] === 'comida' ? selC : selN].d, S[0]) + '</div></details>';
      }
      h += '</div></details>';
    });
    document.getElementById('dieta-body').innerHTML = h;
    pintaSwap();
    pintaReg();
    bindExtras();
    bindTimers(document.getElementById('dieta-body'));
    document.querySelectorAll('#dieta-body input[type=number]').forEach(function (n) {
      n.addEventListener('input', function () {
        setGramos(n.dataset.s, +n.dataset.i, Math.max(0, +n.value || 0));
        n.classList.toggle('mod', (+n.value || 0) !== +n.dataset.def);
        pintaMacros(); pintaReset();
        document.querySelectorAll('#dieta-body details').forEach(function (d, k) {
          var S = secciones()[k]; if (!S) return;
          var sub = [0, 0, 0, 0];
          S[2].forEach(function (it, i) { var f = F[it[0]], g = gramos(S[0], i, it[1]) / 100; sub[0] += f[1] * g; sub[1] += f[2] * g; sub[2] += f[3] * g; sub[3] += f[4] * g; });
          d.querySelector('.when').innerHTML = Math.round(sub[0]) + ' kcal<br>HC ' + Math.round(sub[1]) + ' · P ' + Math.round(sub[2]) + ' · G ' + Math.round(sub[3]);
        });
        var row = n.parentNode.querySelector('.num');
        var S2 = secciones().filter(function (x) { return x[0] === n.dataset.s; })[0];
        if (row && S2) row.textContent = Math.round(F[S2[2][+n.dataset.i][0]][1] * (+n.value || 0) / 100) + ' kcal';
      });
    });
    pintaMacros(); pintaReset();
  }
  function reset() {
    EDIT = {}; PSWAP = {}; CSWAP = {}; QUITA = {};
    FIJAS.merienda.forEach(function (it, i) { if (it[0] === 'gofio') EDIT['merienda|' + i + '|x'] = modo.calidad ? 40 : 20; });
    pintaDieta();
  }
  legend('lg-dia', DIAS.map(function (m) { return { key: m.d, label: m.d, color: C.ink }; }), function (k) {
    diaSel = DIAS.findIndex(function (m) { return m.d === k; });
    selC = diaSel; selN = diaSel;
    document.querySelectorAll('#lg-dia button').forEach(function (b, i) { b.setAttribute('aria-pressed', i === diaSel ? 'true' : 'false'); });
    pintaDieta();
  });
  legend('lg-modo', [
    { key: 'calidad', label: 'Día de calidad · gofio a 40 g', color: C.blue },
    { key: 'post', label: 'Añadir post-entreno', color: C.ok }
  ], function (k, on) {
    modo[k] = on;
    if (k === 'calidad') {
      FIJAS.merienda.forEach(function (it, i) { if (it[0] === 'gofio') EDIT['merienda|' + i + '|x'] = on ? 40 : 20; });
    }
    pintaDieta();
  });
  document.querySelectorAll('#lg-modo button').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
  document.getElementById('btn-reset').addEventListener('click', reset);
  document.querySelectorAll('#lg-dia button').forEach(function (b, i) { b.setAttribute('aria-pressed', i === diaSel ? 'true' : 'false'); });
  pintaDieta();
  /* ==== BLOQUE TRASLADADO: fin ==== */
})();

/* ---------------------------------------------------------------------------------------------
   Bloques nuevos de la vista (§5.5.2 y §5.5.3). Se pintan al mostrar la vista y al cambiar de día.
   Ninguna cifra nueva: las horas son restas sobre la hora de inicio del día (PC.cal.horaIni) con los
   números que trae el texto de la regla; si el texto de la regla cambia y no casa, se enseña literal.
   --------------------------------------------------------------------------------------------- */
(function () {
  var PC = window.PC;
  if (!PC || !PC.vista || !PC.cal) return;
  var D = PC.D || {};

  function regla(id) {
    var R = (D.plan && D.plan.reglas) || [];
    for (var i = 0; i < R.length; i++) if (R[i] && R[i].id === id) return R[i];
    return null;
  }
  function hm(min) {
    min = ((Math.round(min) % 1440) + 1440) % 1440;
    var h = Math.floor(min / 60), m = min % 60;
    return h + ':' + (m < 10 ? '0' : '') + m;
  }
  function num(t) { return parseFloat(String(t).replace(',', '.')); }

  /* «Alrededor del entreno»: {texto, nota} o null si hoy no hay sesión a una hora conocida */
  function entreno(dia) {
    if (!dia || !dia.tipo || dia.tipo === 'descanso' || dia.tipo === 'examen') return null;
    var ini = PC.cal.horaIni(dia);
    var ex = ((D.plan && D.plan.planDeCarrera) || {}).examen || {};
    var comidaEx = typeof ex.comida === 'string' ? ex.comida : '';
    /* el 1.000 de control y la prueba siguen la comida del día de la prueba (planDeCarrera.examen.comida) */
    var deExamen = dia.tipo === 'prueba' || (dia.tipo === 'control' && /1\.000/.test((dia.sesion || '') + ' ' + (dia.protocolo || '')));
    if (ini === null && !(deExamen && comidaEx)) return null;
    var partes = [], nota = '';
    if (ini !== null) partes.push('Hoy entrenas a las ' + hm(ini) + '.');
    if (deExamen && comidaEx) {
      var e = /(\d+(?:,\d+)?) a (\d+(?:,\d+)?) h antes de la primera prueba/i.exec(comidaEx);
      if (e && ini !== null) {
        partes.push('Comida entre las ' + hm(ini - num(e[2]) * 60) + ' y las ' + hm(ini - num(e[1]) * 60) +
          ' (' + e[1] + ' a ' + e[2] + ' h antes de la primera prueba).');
      }
      nota = 'Comida del día de la prueba: ' + comidaEx;
    } else {
      var c = regla('comer'), t = c && c.texto ? c.texto : '';
      var a = /(\d+)[–-](\d+) horas antes: (.+?hidratos)(?: \([^)]*\))?( más proteína)?\./.exec(t);
      var b = /(\d+)[–-](\d+) min antes: ([^(.]+?)(?: \(|\.)/.exec(t);
      if (a && b) {
        partes.push('Comida principal entre las ' + hm(ini - (+a[2]) * 60) + ' y las ' + hm(ini - (+a[1]) * 60) +
          ' (' + a[1] + '–' + a[2] + ' h antes, ' + a[3] + (a[4] || '') + '); ' + b[3] + ' entre las ' +
          hm(ini - (+b[2])) + ' y las ' + hm(ini - (+b[1])) + ' (' + b[1] + '–' + b[2] + ' min antes).');
      } else if (t) partes.push(t);
    }
    /* cafeína: la regla de dormir vale los días de entreno por la tarde (sesión que empieza después de la hora de corte) */
    var dr = regla('dormir'), dt = dr && dr.texto ? dr.texto : '';
    var cf = /Sin cafeína después de las (\d{1,2}):(\d{2})/.exec(dt);
    if (cf && ini !== null && ini >= (+cf[1]) * 60 + (+cf[2])) partes.push('Sin cafeína después de las ' + cf[1] + ':' + cf[2] + '.');
    return { texto: partes.join(' '), nota: nota };
  }

  function botonCalidad() {
    var bs = PC.$$ ? PC.$$('#lg-modo button') : [].slice.call(document.querySelectorAll('#lg-modo button'));
    for (var i = 0; i < bs.length; i++) if (/^Día de calidad/.test((bs[i].textContent || '').trim())) return bs[i];
    return null;
  }
  function sincronizar() {
    var chip = document.querySelector('#di-calidad button'), b = botonCalidad();
    if (chip && b) chip.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'true' : 'false');
  }

  function pintar() {
    var hoy = PC.hoyIso(), dia = null;
    try { dia = PC.cal.dia(hoy); } catch (e) { PC._err && PC._err('dieta: día', e); }
    var caja = document.getElementById('di-entreno');
    if (caja) {
      var r = entreno(dia);
      caja.hidden = !r || !r.texto;
      if (r && r.texto) {
        caja.querySelector('.di-ent-t').textContent = r.texto;
        var s = caja.querySelector('.di-ent-n');
        s.textContent = r.nota; s.hidden = !r.nota;
      }
    }
    var cal = document.getElementById('di-calidad');
    if (cal) {
      cal.hidden = !(dia && dia.extra && dia.extra.calidad === true);
      sincronizar();
    }
  }

  var enlazado = false;
  function enlazar() {
    if (enlazado) return;
    enlazado = true;
    var chip = document.querySelector('#di-calidad button');
    /* tocar el chip pulsa el botón «Día de calidad» de #lg-modo: la app hace lo mismo que si lo tocaras allí */
    if (chip) chip.addEventListener('click', function () { var b = botonCalidad(); if (b) b.click(); sincronizar(); });
    var modo = document.getElementById('lg-modo');
    if (modo) modo.addEventListener('click', sincronizar);
    var reset = document.getElementById('btn-reset');
    if (reset) reset.addEventListener('click', sincronizar);
  }

  PC.vista('dieta', {
    init: function () { enlazar(); pintar(); },
    show: function () { pintar(); },
    repintar: function () { pintar(); }
  });
})();
