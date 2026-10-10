# GENERADOR DE LA VERSIÓN 3 (11-10-2026). No volver a ejecutarlo sobre datos/cristina/plan.json si el plan
# ya se ha editado a mano: lo machacaría. Uso: python3 herramientas/cristina_generar_plan.py datos/cristina/plan.json
# Genera datos/cristina/plan.json: plan de carrera de Cristina (12-10-2026 → octubre de 2027).
# Versión 2 (11-10-2026): con los dos diagnósticos (eficacia y riesgo) aplicados.
# Solo carrera. Versión 3 (11-10-2026): corre lunes, miércoles y sábado, como Daniel; martes y jueves Martín Freire (confirmado el 11-10); viernes y domingo CrossFit.
# Sin test el 17-10: el punto de partida es la estimación de Daniel (más de 5:00) y el primer control es el sábado 21-11.
import json, sys, datetime as dt

SALIDA = sys.argv[1]
INICIO = dt.date(2026, 10, 12)
DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

CAL = 'Calentamiento: 15 min suave + movilidad + 4 rectas.'
ENF = 'Después, 10 min muy suave.'
GEM = ' Al acabar, 3 × 15 elevaciones de talón a una pierna.'
K = 'Ritmo K: el mejor de tus dos últimos controles (ver Ritmos).'
K4 = 'Ritmo K + 4: 4 s más lento por cada 400 que el ritmo K (ver Ritmos).'
O = 'Ritmo O: el del objetivo del próximo control (ver Ritmos).'
UMB = 'Umbral: el ritmo de la tabla de Ritmos; puedes decir frases cortas, pero no conversar.'


def suave(m, extra='', detalle='', gemelo=False):
    d = {'tipo': 'suave', 'titulo': f'{m} min suave' + (f' + {extra}' if extra else ''), 'min': m}
    det = detalle or 'Suave: puedes hablar con frases enteras.'
    if gemelo:
        det += GEM
    d['detalle'] = det
    return d


def control(n):
    n = n - 1
    return {'tipo': 'control', 'titulo': f'Control de 1.000 m ({n}.º)',
            'detalle': 'En la pista de Arucas, a la misma hora que los demás controles. ' + CAL + ' 1.000 m a tope con el reparto más regular posible: '
                       'el primer 200 al mismo ritmo que los demás, no a sprint. ' + ENF +
                       ' Apunta el tiempo y, si puedes, los cinco parciales de 200.',
            'objetivo': 'Con este control y el anterior se fija el ritmo K del bloque siguiente (el mejor de los dos).' if n > 1 else
                        'Tu primer tiempo de referencia: fija el ritmo K del bloque siguiente.'}


def calidad(titulo, detalle, objetivo=''):
    d = {'tipo': 'calidad', 'titulo': titulo, 'detalle': CAL + ' ' + detalle + ' ' + ENF}
    if objetivo:
        d['objetivo'] = objetivo
    return d


def descarga_mar(texto_ritmo):
    return calidad('4 × 400 m a ritmo ' + ('O' if 'O:' in texto_ritmo else 'K') + ', rec. 2 min', texto_ritmo + ' Semana de descarga: solo 4.')


def cuestas(m, n, s, gem=False):
    return suave(m, f'{n} cuestas de {s} s', f'Suave y, al final, {n} cuestas: en una subida del 5 al 8 %, {s} s subiendo fuerte sin llegar a tope; bajas andando.', gem)


def doscientos_k(m):
    return suave(m, '6 × 200 m a ritmo K', 'Suave y, al final, 6 × 200 m a ritmo K con 200 m andando entre cada uno. Sueltos, sin apretar.' + GEM)


def umbral_mie(m_suave, bloques):
    return calidad(f'{bloques} a umbral + {m_suave} min suave',
                   UMB + f' Después de la parte de umbral, {m_suave} min suaves. Solo si el lunes salió sin dolor y no llegas cargada; si no, 50 min suave.')


def larga(m, ultimos=False):
    if ultimos:
        return {'tipo': 'suave', 'titulo': f'{m} min: suave y los 10 últimos alegres', 'min': m,
                'detalle': 'La larga: suave y los últimos 10 min a ritmo alegre (respiras fuerte pero controlas).' + GEM}
    return suave(m, '', 'La larga: suave de principio a fin.', True)


def ca(reps, corre, anda=1):
    tot = reps * (corre + anda)
    return {'tipo': 'suave', 'titulo': f'{reps} × ({corre} min corriendo + {anda} andando)', 'min': tot,
            'detalle': f'Correr y andar: {reps} veces {corre} min corriendo suave y {anda} min andando. '
                       'Si sale entero y puedes hablar con frases, la próxima vez subes un escalón (ver Reglas).'}


S = {}
# F0 · Evaluación
S[1] = (dict(ca(7, 2), detalle=ca(7, 2)['detalle'] + ' Más despacio que el rodaje del 10-10 con Daniel: ese ritmo, para ti, no es suave.'),
        ca(6, 3), dict(ca(7, 3), titulo='28 min: 7 × (3 min corriendo + 1 andando)',
        detalle='La larga: 7 veces 3 min corriendo suave y 1 min andando. Si corres con Daniel, él va a tu ritmo, no tú al suyo.' + GEM))
S[2] = (ca(6, 3), ca(5, 4), dict(ca(5, 4), titulo='28 min: correr y andar al escalón que toque', min=28,
        detalle='La larga: 28 min con el escalón de correr y andar en el que estés (ver Reglas).' + GEM))
# F1 · Base I (S3–S10)
SE = 'Seguido o, si aún no llegas, con tu escalón de correr y andar.'
S[3] = (suave(25, '4 rectas', SE + ' Al final, 4 rectas.'), suave(25, '', SE, True), suave(31, '', 'La larga. ' + SE, True))
S[4] = (suave(28, '5 rectas', SE + ' Al final, 5 rectas.'), suave(28, '', SE, True), suave(34, '', 'La larga. ' + SE, True))
S[5] = (suave(30, '6 rectas', 'Al final, 6 rectas.'), suave(30, '', '', True), larga(37))
S[6] = (suave(25, '4 rectas', 'Semana de descarga. Al final, 4 rectas.'), suave(20, '3 rectas', 'Al final, 3 rectas.'), control(2))
S[7] = (cuestas(30, 6, 15), suave(32, '', '', True), larga(40))
S[8] = (cuestas(32, 8, 15), suave(35, '', '', True), larga(44))
S[9] = (dict(suave(35), titulo='35 min con 6 × (1 min alegre + 1 min suave)',
             detalle='Fartlek: 10 min suaves, 6 veces 1 min a ritmo alegre (respiras fuerte pero controlas) y 1 min suave, y suave hasta el final.'),
        suave(35, '6 rectas', 'Al final, 6 rectas.' + GEM), larga(48))
S[10] = (suave(25, '4 rectas', 'Semana de descarga. Al final, 4 rectas.'), suave(20, '3 rectas', 'Al final, 3 rectas.'), control(3))
# F2 · Base II: intervalos cerca del ritmo de la prueba, algo de umbral y cuestas (S11–S22)
S[11] = (calidad('6 × 2 min a ritmo K + 4, rec. 2 min trotando', K4), suave(30, '', '', True), larga(48))
S[12] = (calidad('4 × 5 min a umbral, rec. 1 min', UMB), cuestas(35, 8, 20, True), larga(52))
S[13] = (calidad('8 × 2 min a ritmo K + 4, rec. 2 min', K4), doscientos_k(38), larga(55))
S[14] = (suave(25, '4 rectas', 'Semana de descarga. Al final, 4 rectas.'), suave(20, '3 rectas', 'Al final, 3 rectas.'), control(4))
S[15] = (calidad('5 × 3 min a ritmo K + 4, rec. 2 min 30 s', K4), cuestas(40, 8, 20, True), larga(58))
S[16] = (calidad('3 × 8 min a umbral, rec. 2 min', UMB), doscientos_k(40), larga(60))
S[17] = (calidad('6 × 3 min a ritmo K + 4, rec. 2 min 30 s', K4), suave(40, '6 rectas', 'Al final, 6 rectas.' + GEM), larga(60))
S[18] = (suave(25, '4 rectas', 'Semana de descarga. Al final, 4 rectas.'), suave(20, '3 rectas', 'Al final, 3 rectas.'), control(5))
S[19] = (calidad('6 × 400 m a ritmo K, rec. 2 min', K, 'Las seis dentro de 3 s del objetivo.'), doscientos_k(45), larga(60))
S[20] = (calidad('2 × 12 min a umbral, rec. 2 min', UMB), cuestas(45, 8, 20, True), larga(62))
S[21] = (calidad('4 × 600 m a ritmo K, rec. 3 min', K, 'Las cuatro dentro de 3 s del objetivo.'), doscientos_k(45), larga(65))
S[22] = (suave(25, '4 rectas', 'Semana de descarga. Al final, 4 rectas.'), suave(20, '3 rectas', 'Al final, 3 rectas.'), control(6))
# F3 · Desarrollo: potencia aeróbica (S23–S34). Tope a ritmo K: unos 2.400 m por sesión.
S[23] = (calidad('6 × 400 m a ritmo K, rec. 2 min trotando', K, 'Las seis dentro de 3 s del objetivo.'), suave(50, '6 rectas', 'Al final, 6 rectas.' + GEM), larga(65))
S[24] = (calidad('4 × 600 m a ritmo K, rec. 3 min', K, 'Las cuatro dentro de 3 s del objetivo.'), umbral_mie(15, '2 × 8 min'), larga(65))
S[25] = (calidad('4 × 800 m a ritmo K + 4, rec. 3 min', K4, 'Las cuatro dentro de 4 s del objetivo.'), cuestas(50, 8, 20, True), larga(65, True))
S[26] = (descarga_mar(K), suave(20, '3 rectas', 'Al final, 3 rectas.'), control(7))
S[27] = (calidad('6 × 400 m a ritmo K, rec. 1 min 45 s', K, 'Misma velocidad que en marzo, algo menos de descanso.'), suave(50, '6 rectas', 'Al final, 6 rectas.' + GEM), larga(65))
S[28] = (calidad('5 × 600 m a ritmo K, rec. 3 min', K), umbral_mie(15, '2 × 8 min'), larga(68))
S[29] = (calidad('5 × 800 m a ritmo K + 4, rec. 3 min', K4), cuestas(50, 8, 20, True), larga(70, True))
S[30] = (descarga_mar(K), suave(20, '3 rectas', 'Al final, 3 rectas.'), control(8))
S[31] = (calidad('3 × 1.000 m a ritmo K + 4, rec. 4 min', K4), suave(50, '6 rectas', 'Al final, 6 rectas.' + GEM), larga(65))
S[32] = (calidad('6 × 400 m a ritmo K, rec. 1 min 30 s', K), umbral_mie(15, '2 × 10 min'), larga(68))
S[33] = (calidad('5 × 600 m a ritmo K, rec. 3 min', K), cuestas(50, 8, 20, True), larga(70, True))
S[34] = (descarga_mar(K), suave(20, '3 rectas', 'Al final, 3 rectas.'), control(9))
# F4 · Específico: ritmo objetivo O (S35–S46)
DOS = calidad('8 × 200 m rápidos, rec. 200 m andando', 'Más rápidos que el ritmo O pero sueltos, sin llegar a sprint. Recuperación completa: andando.' + GEM)
JS = suave(50, '6 rectas', 'Al final, 6 rectas.' + GEM)
S[35] = (calidad('5 × 400 m a ritmo O, rec. 2 min', O, 'Las cinco dentro de 3 s del objetivo.'), JS, larga(60))
S[36] = (calidad('3 × 600 m a ritmo O, rec. 3 min', O, 'Las tres dentro de 3 s del objetivo.'), DOS, larga(60))
S[37] = (calidad('2 × (600 + 400 m) a ritmo O: 1 min entre el 600 y el 400, 5 min entre las dos', O + ' Es el kilómetro partido.'), JS, larga(60))
S[38] = (descarga_mar(O), suave(20, '3 rectas', 'Al final, 3 rectas.'), control(10))
S[39] = (calidad('6 × 400 m a ritmo O, rec. 1 min 45 s', O), JS, larga(60))
S[40] = (calidad('3 × 600 m a ritmo O, rec. 2 min 30 s + 2 × 200 m rápidos', O), DOS, larga(60))
S[41] = (calidad('2 × (600 + 400 m) a ritmo O: 1 min y 4 min', O), JS, larga(55))
S[42] = (descarga_mar(O), suave(20, '3 rectas', 'Al final, 3 rectas.'), control(11))
S[43] = (calidad('5 × 400 m a ritmo O, rec. 1 min 30 s', O), JS, larga(55))
S[44] = (calidad('2 × 600 m a ritmo O, rec. 3 min + 3 × 200 m rápidos', O), DOS, larga(55))
S[45] = (calidad('2 × (600 + 400 m) a ritmo O: 1 min y 3 min', O), JS, larga(55))
S[46] = (descarga_mar(O), suave(20, '3 rectas', 'Al final, 3 rectas.'), control(12))
# F5 · Afinado (S47–S52)
S[47] = (calidad('5 × 400 m a ritmo O, rec. 2 min', O), DOS, larga(55))
S[48] = (calidad('3 × 600 m a ritmo O, rec. 3 min', O), suave(45, '6 rectas', 'Al final, 6 rectas.' + GEM), larga(50))
S[49] = (calidad('2 × (600 + 400 m) a ritmo O: 1 min y 4 min', O), suave(45, '6 rectas', 'Al final, 6 rectas.' + GEM), larga(50))
S[50] = (calidad('4 × 400 m a ritmo O, rec. 2 min', O), suave(25, '4 rectas', 'Al final, 4 rectas.'),
         {'tipo': 'control', 'titulo': 'SIMULACRO: circuito, barra y 1.000 m',
          'detalle': 'En el orden del BOE: circuito, barra y 1.000 m, con los descansos que te den. ' + CAL + ' ' + ENF + ' El viernes antes, descanso.',
          'objetivo': 'El último dato antes de la prueba. Decide el ritmo de la última semana.'})
S[51] = (calidad('4 × 300 m a ritmo O, rec. 2 min', O), suave(30, '4 rectas', 'Al final, 4 rectas.'), suave(40, '', 'Suave, sin nada más.'))
S[52] = (calidad('3 × 300 m a ritmo O, rec. 2 min', O), suave(20, '4 rectas', 'Al final, 4 rectas.'),
         {'tipo': 'prueba', 'titulo': 'Prueba (fecha por confirmar)', 'detalle': 'La fecha real la fija la convocatoria de 2027. Cuando salga, se recolocan las semanas finales. El viernes antes, descanso.'})

FASES = [
    {'id': 'F0', 'nombre': 'Evaluación', 'desde': 1, 'hasta': 2,
     'objetivo': 'Correr y andar, y tu primer 1.000: saber de dónde partes.'},
    {'id': 'F1', 'nombre': 'Base: correr seguido', 'desde': 3, 'hasta': 10,
     'objetivo': 'Llegar a correr 35-48 min seguidos y suave. Es lo que más mejora el 1.000 al principio.'},
    {'id': 'F2', 'nombre': 'Base II: primeros intervalos', 'desde': 11, 'hasta': 22,
     'objetivo': 'Intervalos cortos cerca del ritmo de la prueba, algo de umbral y la larga a 60-65 min.'},
    {'id': 'F3', 'nombre': 'Potencia aeróbica', 'desde': 23, 'hasta': 34,
     'objetivo': 'Series de 400 a 1.000 m a ritmo K y K + 4: subir el techo.'},
    {'id': 'F4', 'nombre': 'Ritmo del examen', 'desde': 35, 'hasta': 46,
     'objetivo': 'Series al ritmo objetivo y 200 rápidos: aprender a sostener el ritmo del 1.000.'},
    {'id': 'F5', 'nombre': 'Afinado', 'desde': 47, 'hasta': 52,
     'objetivo': 'Simulacro y llegar fresca a la prueba.'},
]


def fase(n):
    for f in FASES:
        if f['desde'] <= n <= f['hasta']:
            return f['id']


OTRO = {1: 'Martín Freire: barra y circuito', 3: 'Martín Freire: barra y circuito', 4: 'CrossFit', 6: 'CrossFit'}
semanas = []
for n in range(1, 53):
    lunes = INICIO + dt.timedelta(weeks=n - 1)
    mar, jue, sab = S[n]
    dias = []
    for i in range(7):
        f = (lunes + dt.timedelta(days=i)).isoformat()
        if i in OTRO:
            dias.append({'fecha': f, 'dia': DIAS[i], 'tipo': 'otro', 'titulo': OTRO[i]})
        else:
            s = {0: mar, 2: jue, 5: sab}[i]
            d = {'fecha': f, 'dia': DIAS[i]}
            d.update(s)
            dias.append(d)
    descarga = sab.get('tipo') == 'control' and n != 50
    semanas.append({'n': n, 'desde': lunes.isoformat(), 'fase': fase(n), 'descarga': descarga, 'dias': dias})

plan = {
    'meta': {'atleta': 'Cristina', 'creado': '2026-10-11', 'version': 3, 'diasCarrera': 'lunes, miércoles y sábado',
             'nota': 'Plan de carrera de Cristina para las pruebas físicas de la Escala Básica de 2027 (turno libre). Solo carrera. '
                     'Los datos personales (edad, altura, pulso, salud) no van aquí: el repositorio es público.',
             'revision': 'Versión 2 del 11-10-2026: aplicados un diagnóstico de eficacia y otro de riesgo, hechos por separado sobre la versión 1. '
                         'Cambios: correr y andar al principio, larga que sube poco a poco, intervalos cerca del ritmo de la prueba desde diciembre, '
                         'tope de metros a ritmo K, rodajes de entre semana más largos, regla del dolor completa, día libre recomendado, calor y energía. '
                         'Versión 3 del mismo día, a petición de Daniel: corre lunes, miércoles y sábado, como él; martes y jueves Martín Freire; el domingo sigue con CrossFit (sin día libre, decidido por ellos); no hay test el 17-10 (el primer control es el 21-11); se quita el cuarto rodaje opcional, que pedía el domingo libre.'},
    'objetivo': {
        'prueba': 'Pruebas físicas de la Escala Básica, convocatoria de 2027 (44.ª promoción), turno libre',
        'fecha': 'sin convocar: se supone el sábado 9 de octubre de 2027 y se recoloca el final cuando salga la fecha',
        'fechaSupuesta': '2027-10-09',
        'escalones': [
            {'id': 'E1', 'marca': '4:45', 'que': 'Dejar de eliminar (4:46 o más da 0 y elimina)'},
            {'id': 'E2', 'marca': '4:09', 'que': '5 puntos'},
            {'id': 'E3', 'marca': '4:00', 'que': '6 puntos, y desde ahí cada punto son 8-9 s'},
        ],
        'porQue': 'Va por turno libre: la nota física suma para la plaza. El 1.000 es lo que hoy la elimina, así que es lo primero.',
        'primerControl': '2026-11-21',
        'expectativa': 'Sin una marca medida no hay previsión. Hoy solo hay una estimación: más de 5:00. El rodaje del 10-10 apunta a que puede estar bastante por encima, '
                       'pero eso tampoco es una medida: el punto de partida lo da el primer control, el sábado 21-11. Criterio de entrenador, no dato: si ese control sale entre 5:00 y 5:15 '
                       'y el año va sin lesiones, lo razonable es acabar entre 4:05 y 4:35; si sale de 5:30 o más, el objetivo del año es alejarse de la eliminación, en torno a 4:30. '
                       '4:00 o menos (6 puntos) pide una respuesta muy buena. Se revisa tras el control de diciembre.',
    },
    'baremo1000Mujeres': {
        'fuente': 'BOE-A-2026-15055 (convocatoria de la 43.ª), Anexo II, tercer ejercicio. Comprobado en boe.es el 11-10-2026. La convocatoria de 2027 no ha salido: se supone el mismo baremo.',
        'tramos': [
            {'puntos': 10, 'desde': None, 'hasta': '3:24'}, {'puntos': 9, 'desde': '3:25', 'hasta': '3:33'},
            {'puntos': 8, 'desde': '3:34', 'hasta': '3:42'}, {'puntos': 7, 'desde': '3:43', 'hasta': '3:51'},
            {'puntos': 6, 'desde': '3:52', 'hasta': '4:00'}, {'puntos': 5, 'desde': '4:01', 'hasta': '4:09'},
            {'puntos': 4, 'desde': '4:10', 'hasta': '4:18'}, {'puntos': 3, 'desde': '4:19', 'hasta': '4:27'},
            {'puntos': 2, 'desde': '4:28', 'hasta': '4:36'}, {'puntos': 1, 'desde': '4:37', 'hasta': '4:45'},
            {'puntos': 0, 'desde': '4:46', 'hasta': None, 'elimina': True},
        ],
        'reglasBOE': 'En grupo, sobre superficie lisa, plana y dura. Calzado deportivo, sin clavos. Un solo intento. Salida de pie con «listo»… «ya».',
        'calificacion': 'La nota física es la media de los tres ejercicios; hace falta un 5 de media y un 0 en cualquiera elimina.',
    },
    'semanaTipo': [
        {'dia': 'Lun', 'que': 'Carrera: la sesión de calidad (en las primeras semanas, correr y andar o suave con rectas o cuestas)'},
        {'dia': 'Mar', 'que': 'Martín Freire: barra y circuito'},
        {'dia': 'Mié', 'que': 'Carrera: suave con rectas, cuestas o 200 a ritmo K'},
        {'dia': 'Jue', 'que': 'Martín Freire: barra y circuito'},
        {'dia': 'Vie', 'que': 'CrossFit (sin piernas ni saltos antes de un control: ver Reglas)'},
        {'dia': 'Sáb', 'que': 'Carrera: la larga suave, o el control de 1.000 m cada cuatro semanas'},
        {'dia': 'Dom', 'que': 'CrossFit (sin piernas pesadas si puedes: el lunes toca la calidad)'},
    ],
    'fases': FASES,
    'glosario': [
        {'t': 'Suave', 'd': 'Puedes hablar con frases enteras. Manda poder hablar, no el reloj.'},
        {'t': 'Correr y andar', 'd': 'Al principio, bloques de correr y andar: 2:1, 3:1, 4:1, 6:1, 8:1 y seguido. No es hacer trampa: es como se construye la base sin lesionarse.'},
        {'t': 'Rectas', 'd': '80 m acelerando poco a poco hasta un ritmo rápido pero suelto, sin sprintar. Vuelves andando. Mejoran la zancada sin cansar.'},
        {'t': 'Cuestas', 'd': 'En una subida del 5 al 8 %: subir fuerte sin llegar a tope el tiempo que diga la sesión y bajar andando.'},
        {'t': 'Umbral', 'd': '«Cómodamente duro»: frases cortas, no conversación. Su ritmo sale de tu ritmo K (ver Ritmos).'},
        {'t': 'Ritmo K', 'd': 'El mejor de tus dos últimos controles de 1.000 m. Por ejemplo, con 5:00, cada 400 en 2:00 y cada 200 en 1:00.'},
        {'t': 'Ritmo K + 4', 'd': '4 s más lento por cada 400 que el ritmo K. Para series de 2-4 min.'},
        {'t': 'Ritmo O', 'd': 'El ritmo del objetivo del próximo control: K menos 2 s por cada 400. Desde junio.'},
        {'t': 'Descarga', 'd': 'La cuarta semana de cada bloque: menos carrera para llegar fresca al control del sábado.'},
    ],
    'reglas': [
        {'id': 'suave', 'titulo': 'Lo suave, suave de verdad', 'texto': 'Los rodajes suaves son la mayor parte del plan y lo que más te va a mejorar. Si un día vas ahogada, vas demasiado rápido: baja o anda un minuto.'},
        {'id': 'correr-andar', 'titulo': 'Correr y andar', 'texto': 'Escalones: 2:1 → 3:1 → 4:1 → 6:1 → 8:1 → seguido (minutos corriendo : andando). Se sube de escalón cuando el anterior sale entero, pudiendo hablar con frases y sin dolor al día siguiente. Si en la semana 6 aún no corres 20 min seguidos, la base se alarga.'},
        {'id': 'primer200', 'titulo': 'El primer 200 no se regala', 'texto': 'En series y controles, el primer 200 sale al ritmo de los demás. Salir a sprint es el error más caro del 1.000.'},
        {'id': 'dos-rep', 'titulo': 'Regla de las dos repeticiones', 'texto': 'Si dos repeticiones seguidas salen más de 3 s más lentas que el objetivo, se acaba la sesión: 10 min suaves y a casa.'},
        {'id': 'ritmos', 'titulo': 'Cómo se fijan los ritmos', 'texto': 'Ritmo K: el mejor de tus dos últimos controles. K + 4: K más 4 s por cada 400. Umbral: K más un 20-25 % por kilómetro (con K a 5:00/km, de 6:00 a 6:15). Ritmo O (desde junio): K menos 2 s por cada 400. Todo se recalcula en cada control. Un control malo con asterisco (mala noche, enferma, calor, CrossFit de piernas el día antes) se apunta pero no baja nada.'},
        {'id': 'dolor', 'titulo': 'Dolor', 'texto': 'Dolor de 0 a 10. Se puede correr con molestia de 3 o menos si no sube mientras corres y a la mañana siguiente está igual o mejor. Se para ese día si cambia tu forma de correr, si va a más o si pasa de 3. No se corre y se va al médico si te duele un punto concreto de un hueso al apretarlo con el dedo, al saltar a la pata coja o al andar, o si duele en reposo o de noche. Aquiles o talón rígidos los primeros pasos de la mañana, rodilla que duele al bajar escaleras o cadera que duele al tumbarte de lado: avisas ese día y la siguiente carrera es suave y más corta.'},
        {'id': 'cansancio', 'titulo': 'Si llegas cargada', 'texto': 'Primero se toca el miércoles: todo suave, sin rectas ni cuestas; y si además hay molestia o dormiste mal, se quita. Si hace falta, el lunes se queda en 30 min suaves. Lo que se pierde no se recupera.'},
        {'id': 'descanso', 'titulo': 'Sin día libre', 'texto': 'Decidido el 11-10: el domingo sigue con CrossFit, así que no tienes ningún día sin entrenar. Eso es lo que más riesgo de lesión mete en el año, y se compensa así: el domingo, si puedes, sin piernas pesadas, porque el lunes toca la calidad. El viernes antes de un control, del simulacro o de la prueba, sin CrossFit, o sin piernas ni saltos. Si la larga del sábado es de 50 min o más, el CrossFit del viernes sin saltos. Y la regla «Si llegas cargada» se cumple siempre.'},
        {'id': 'gemelo', 'titulo': 'Elevaciones de talón', 'texto': 'Después del rodaje del miércoles y de la larga del sábado: 3 × 15 elevaciones de talón a una pierna. Tres minutos que protegen el tendón de Aquiles y la tibia.'},
        {'id': 'energia', 'titulo': 'Comer y descansar', 'texto': 'Come lo suficiente para entrenar; las calidades no se hacen en ayunas. Si la regla se vuelve irregular o falta tres meses, no es «normal por entrenar»: vas al médico. Si el cansancio no se va al descansar, también; que sea el médico quien decida si te pide una analítica. No tomes hierro por tu cuenta. Un día de regla malo cuenta como día malo: el control lleva asterisco.'},
        {'id': 'calor', 'titulo': 'Calor (julio y agosto)', 'texto': 'En verano se corre al amanecer o al anochecer. Si AEMET avisa de calor o calima en tu zona, la calidad pasa a rodaje suave por sensación. Un control con calor no baja el ritmo K. Si corres más de 45 min con calor, llevas agua. Si te mareas, tienes náuseas o te duele la cabeza: paras, sombra y agua. Si hay confusión, 112.'},
        {'id': 'zapatillas', 'titulo': 'Zapatillas de correr', 'texto': 'Para correr, zapatillas de correr, no las de CrossFit. En los controles, las mismas que el día de la prueba: el BOE prohíbe los clavos.'},
        {'id': 'datos', 'titulo': 'Qué mandar después de cada sesión', 'texto': 'El entreno del Apple Watch (ver Reloj) y una línea: cómo te has sentido de 1 a 10 y si algo te ha molestado. También del CrossFit y de Martín Freire: minutos y esfuerzo de 1 a 10. Si un WOD lleva carrera, apúntalo: cuenta como carrera.'},
    ],
    'reloj': {
        'modelo': 'Apple Watch Series 10',
        'pasos': [
            'Rodajes: app Entreno → Carrera al aire libre, con las zonas de frecuencia cardiaca en pantalla. Pero en lo suave manda poder hablar: las zonas automáticas salen de una máxima estimada y pueden fallar.',
            'Después del primer control, las zonas se pueden poner a mano (en la guía de Apple: Ajustes › Entreno › Zonas de frecuencia cardiaca › Manual; los nombres en español sin comprobar).',
            'Series: la app Entreno permite entrenos personalizados con calentamiento, series, recuperaciones y aviso de ritmo. En los controles manda el cronómetro, no el GPS.',
            'Mandar cada entreno por separado: lo ideal es un archivo .fit por entreno, exportado desde Salud con una app de iPhone (por ejemplo HealthFit; precio y versión sin comprobar). La exportación completa de la app Salud saca TODOS tus datos de salud: solo si no hay otra forma, y nunca se sube a ningún sitio.',
        ],
        'nota': 'El pulso de muñeca va con retraso en las series cortas y no vale en CrossFit ni en la barra: ahí manda el esfuerzo de 1 a 10.',
    },
    'calendario': semanas,
    'pendientes': [
        {'id': 'primer-control', 'texto': 'Primer control de 1.000 m el sábado 21-11 en Arucas: fija el ritmo K. Hasta entonces, todo por sensación.', 'desde': '2026-10-11'},
        {'id': 'fecha-2027', 'texto': 'Fecha de la prueba de 2027: cuando salga la convocatoria, recolocar las semanas finales.', 'desde': '2026-10-11'},
    ],
}
json.dump(plan, open(SALIDA, 'w'), ensure_ascii=False, indent=2)
open(SALIDA, 'a').write('\n')
print('ok', len(semanas), 'semanas')
