/* Acorta los nombres de las variables LOCALES de un script (M8 · integración).
 *
 *   node --expose-internals herramientas/acortar_nombres.js entrada.js salida.js
 *
 * Usa el analizador acorn que trae Node dentro (sin descargar nada). Solo renombra ligaduras que
 * viven dentro de una función o de un bloque; el ámbito global de cada script (lo que comparten
 * los <script> entre sí, como PC) no se toca, ni las propiedades, ni las claves de objeto.
 *
 * Reglas de seguridad:
 *  - si el archivo usa eval o with, no se renombra nada;
 *  - una función declarada dentro de un bloque (anexo B) deja su nombre sin tocar en todo el archivo;
 *  - una propiedad abreviada {a} pasa a {a:x};
 *  - al final se vuelve a analizar la salida y el árbol tiene que ser idéntico al original salvo los
 *    nombres de las ligaduras, que tienen que corresponderse uno a uno. Si no, se para con error.
 */
'use strict';
const fs = require('fs');
const acorn = require('internal/deps/acorn/acorn/dist/acorn');

const RESERVADAS = new Set(('break case catch class const continue debugger default delete do else enum export extends ' +
  'false finally for function if import in instanceof new null return super switch this throw true try typeof var void ' +
  'while with yield let static implements interface package private protected public await async of arguments eval ' +
  'undefined NaN Infinity').split(' '));

const PRIMERA = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$';
const RESTO = PRIMERA + '0123456789';
function nombreN(n) {
  if (n < PRIMERA.length) return PRIMERA[n];
  n -= PRIMERA.length;
  let s = PRIMERA[n % PRIMERA.length];
  n = Math.floor(n / PRIMERA.length);
  do { s += RESTO[n % RESTO.length]; n = Math.floor(n / RESTO.length) - 1; } while (n >= 0);
  return s;
}

function parse(src) {
  return acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', allowHashBang: true });
}

function esNodo(v) { return v && typeof v === 'object' && typeof v.type === 'string'; }

function hijos(node, fn) {
  for (const k of Object.keys(node)) {
    if (k === 'type' || k === 'start' || k === 'end' || k === 'loc' || k === 'range') continue;
    const v = node[k];
    if (Array.isArray(v)) { v.forEach((x, i) => { if (esNodo(x)) fn(x, k, i); }); }
    else if (esNodo(v)) fn(v, k, null);
  }
}

function idsDePatron(p, out) {
  if (!p) return;
  switch (p.type) {
    case 'Identifier': out.push(p); break;
    case 'ObjectPattern': for (const pr of p.properties) idsDePatron(pr.type === 'RestElement' ? pr.argument : pr.value, out); break;
    case 'ArrayPattern': for (const e of p.elements) idsDePatron(e, out); break;
    case 'RestElement': idsDePatron(p.argument, out); break;
    case 'AssignmentPattern': idsDePatron(p.left, out); break;
    default: break; // MemberExpression en asignaciones con destructuración: no declara nada
  }
}

const FUNC = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);

/* Analiza ámbitos y devuelve {ocurrencias:[{node, lig|null, nombre, abreviada}], ambitos, raiz, bloqueadas:Set} */
function analizar(ast) {
  let nId = 0;
  function Ambito(padre, tipo, node) {
    const a = { id: nId++, padre, tipo, node, ligs: new Map(), hijos: [], exteriores: new Set(), libres: new Set() };
    if (padre) padre.hijos.push(a);
    return a;
  }
  const raiz = Ambito(null, 'global', ast);
  const ambitoDe = new Map(); // nodo -> ámbito que crea
  const bloqueadas = new Set();
  let hayEval = false;

  function funcionDe(a) { while (a.tipo !== 'funcion' && a.tipo !== 'global') a = a.padre; return a; }
  function declarar(a, idNode, clase) {
    const nombre = idNode.name;
    let l = a.ligs.get(nombre);
    if (!l) { l = { nombre, ambito: a, usos: 0, nuevo: null, clase }; a.ligs.set(nombre, l); }
    return l;
  }

  // pasada 1: ámbitos y declaraciones
  function p1(node, a, padre, clave) {
    let dentro = a;
    switch (node.type) {
      case 'FunctionDeclaration': {
        if (node.id) {
          if (a.tipo === 'funcion' || a.tipo === 'global') declarar(a, node.id, 'funcion');
          else { declarar(a, node.id, 'funcion-bloque'); bloqueadas.add(node.id.name); }
        }
        dentro = Ambito(a, 'funcion', node);
        ambitoDe.set(node, dentro);
        for (const p of node.params) { const ids = []; idsDePatron(p, ids); ids.forEach(i => declarar(dentro, i, 'param')); }
        break;
      }
      case 'FunctionExpression':
      case 'ArrowFunctionExpression': {
        dentro = Ambito(a, 'funcion', node);
        ambitoDe.set(node, dentro);
        if (node.id) declarar(dentro, node.id, 'nombre-fx');
        for (const p of node.params) { const ids = []; idsDePatron(p, ids); ids.forEach(i => declarar(dentro, i, 'param')); }
        break;
      }
      case 'ClassDeclaration':
        if (node.id) declarar(a, node.id, 'clase');
        break;
      case 'ClassExpression':
        if (node.id) { dentro = Ambito(a, 'bloque', node); ambitoDe.set(node, dentro); declarar(dentro, node.id, 'clase'); }
        break;
      case 'VariableDeclaration': {
        const destino = node.kind === 'var' ? funcionDe(a) : a;
        for (const d of node.declarations) { const ids = []; idsDePatron(d.id, ids); ids.forEach(i => declarar(destino, i, node.kind)); }
        break;
      }
      case 'BlockStatement':
        if (!(padre && FUNC.has(padre.type) && clave === 'body') && !(padre && padre.type === 'CatchClause')) {
          dentro = Ambito(a, 'bloque', node); ambitoDe.set(node, dentro);
        }
        break;
      case 'ForStatement': case 'ForInStatement': case 'ForOfStatement': case 'SwitchStatement': case 'StaticBlock':
        dentro = Ambito(a, 'bloque', node); ambitoDe.set(node, dentro);
        break;
      case 'CatchClause':
        dentro = Ambito(a, 'bloque', node); ambitoDe.set(node, dentro);
        if (node.param) { const ids = []; idsDePatron(node.param, ids); ids.forEach(i => declarar(dentro, i, 'catch')); }
        break;
      case 'WithStatement': hayEval = true; break;
      case 'Identifier': if (node.name === 'eval' && padre && padre.type === 'CallExpression' && clave === 'callee') hayEval = true; break;
      default: break;
    }
    hijos(node, (h, k) => p1(h, dentro, node, k));
  }
  p1(ast, raiz, null, null);

  // pasada 2: ocurrencias de identificadores
  const ocurrencias = [];
  function esOcurrencia(node, padre, clave) {
    if (!padre) return true;
    switch (padre.type) {
      case 'MemberExpression': return !(clave === 'property' && !padre.computed);
      case 'Property': return !(clave === 'key' && !padre.computed);
      case 'MethodDefinition': case 'PropertyDefinition': return !(clave === 'key' && !padre.computed);
      case 'LabeledStatement': case 'BreakStatement': case 'ContinueStatement': return clave !== 'label';
      case 'MetaProperty': return false;
      case 'ExportSpecifier': case 'ImportSpecifier': case 'ImportDefaultSpecifier': case 'ImportNamespaceSpecifier': return false;
      default: return true;
    }
  }
  function resolver(a, nombre) {
    for (let s = a; s; s = s.padre) if (s.ligs.has(nombre)) return s.ligs.get(nombre);
    return null;
  }
  function p2(node, a, padre, clave, abreviada) {
    let dentro = ambitoDe.get(node) || a;
    // el nombre de una declaración de función se resuelve fuera de la función; el de una expresión, dentro
    if (node.type === 'Identifier') {
      if (esOcurrencia(node, padre, clave)) {
        const lig = resolver(a, node.name);
        ocurrencias.push({ node, lig, nombre: node.name, abreviada: abreviada || null });
        if (lig) {
          lig.usos++;
          for (let s = a; s && s !== lig.ambito; s = s.padre) s.exteriores.add(lig);
        } else {
          for (let s = a; s; s = s.padre) s.libres.add(node.name);
        }
      }
      return;
    }
    hijos(node, (h, k) => {
      let amb = dentro;
      if (node.type === 'FunctionDeclaration' && k === 'id') amb = a;
      if (node.type === 'ClassDeclaration' && k === 'id') amb = a;
      let abr = null;
      if (node.type === 'Property' && node.shorthand && k === 'value') abr = node.key.name;
      if (node.type === 'AssignmentPattern' && abreviada && k === 'left') abr = abreviada;
      p2(h, amb, node, k, abr);
    });
  }
  p2(ast, raiz, null, null, null);
  return { ocurrencias, raiz, bloqueadas, hayEval };
}

function acortar(src) {
  const ast = parse(src);
  const A = analizar(ast);
  if (A.hayEval) return { codigo: src, renombradas: 0, motivo: 'eval/with' };
  const bloqueadas = A.bloqueadas;
  // nombres que ninguna ligadura renombrada puede tomar: los bloqueados
  let renombradas = 0;
  function asignar(amb) {
    if (amb.tipo !== 'global') {
      const prohibidos = new Set(bloqueadas);
      for (const l of amb.exteriores) prohibidos.add(l.nuevo || l.nombre);
      for (const n of amb.libres) prohibidos.add(n);
      const ligs = [...amb.ligs.values()];
      for (const l of ligs) if (bloqueadas.has(l.nombre)) { l.nuevo = l.nombre; prohibidos.add(l.nombre); }
      ligs.filter(l => !l.nuevo).sort((x, y) => y.usos - x.usos || (x.nombre < y.nombre ? -1 : 1)).forEach(l => {
        let i = 0, n;
        do { n = nombreN(i++); } while (prohibidos.has(n) || RESERVADAS.has(n));
        l.nuevo = n; prohibidos.add(n);
        if (n !== l.nombre) renombradas++;
      });
    }
    amb.hijos.forEach(asignar);
  }
  asignar(A.raiz);
  // aplicar
  const cambios = [];
  for (const o of A.ocurrencias) {
    if (!o.lig || o.lig.ambito.tipo === 'global') continue;
    const nuevo = o.lig.nuevo;
    if (nuevo === o.nombre) { if (o.abreviada) continue; else continue; }
    cambios.push({ i: o.node.start, f: o.node.end, t: o.abreviada ? o.abreviada + ':' + nuevo : nuevo });
  }
  cambios.sort((x, y) => x.i - y.i);
  let out = '', pos = 0;
  for (const c of cambios) {
    if (c.i < pos) throw new Error('cambios solapados en ' + c.i);
    out += src.slice(pos, c.i) + c.t; pos = c.f;
  }
  out += src.slice(pos);
  comprobar(src, out);
  return { codigo: out, renombradas };
}

/* Árbol canónico: sin posiciones, sin «shorthand», y cada ocurrencia ligada sustituida por el índice de su
 * ligadura (en orden de primera aparición). Los libres y las propiedades conservan su nombre. */
function canonico(src) {
  const ast = parse(src);
  const A = analizar(ast);
  const idx = new Map();
  const etiqueta = new Map();
  for (const o of A.ocurrencias) {
    if (o.lig && o.lig.ambito.tipo !== 'global') {
      if (!idx.has(o.lig)) idx.set(o.lig, idx.size);
      etiqueta.set(o.node, '#L' + idx.get(o.lig));
    } else etiqueta.set(o.node, '#G' + o.nombre);
  }
  function ser(n) {
    if (Array.isArray(n)) return n.map(ser);
    if (!esNodo(n)) return n;
    const o = {};
    for (const k of Object.keys(n)) {
      if (k === 'start' || k === 'end' || k === 'loc' || k === 'range' || k === 'shorthand') continue;
      o[k] = ser(n[k]);
    }
    if (n.type === 'Identifier' && etiqueta.has(n)) o.name = etiqueta.get(n);
    // en una propiedad abreviada original, key y value eran el mismo nombre; en la salida la key conserva el
    // nombre original: ya coincide porque las keys no se renombran.
    return o;
  }
  return JSON.stringify(ser(ast));
}

function comprobar(a, b) {
  const ca = canonico(a), cb = canonico(b);
  if (ca !== cb) {
    let i = 0; while (i < ca.length && ca[i] === cb[i]) i++;
    throw new Error('el árbol cambia al acortar nombres, cerca de: ' + ca.slice(Math.max(0, i - 120), i + 80) + '\n  →  ' + cb.slice(Math.max(0, i - 120), i + 80));
  }
}

if (require.main === module) {
  const [, , ent, sal] = process.argv;
  const src = fs.readFileSync(ent, 'utf8');
  try {
    const r = acortar(src);
    fs.writeFileSync(sal, r.codigo);
    process.stdout.write(JSON.stringify({ renombradas: r.renombradas, motivo: r.motivo || null }) + '\n');
  } catch (e) {
    process.stderr.write(String(e && e.stack || e) + '\n');
    process.exit(1);
  }
}
module.exports = { acortar };
