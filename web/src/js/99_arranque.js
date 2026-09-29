/* 99_arranque.js · M0 · arranque (§10.3)
   Chip de nota, enrutador, borrado de la clave antigua de pestaña, primera ruta y modo QA.
   init de cada vista se llama solo la primera vez que se muestra. */
(function () {
  'use strict';
  var PC = window.PC;
  if (!PC) { (window.__errores = window.__errores || []).push('arranque: falta el núcleo PC'); return; }
  /* la clave antigua de pestaña se guardaba y nunca se leía: se borra (el nombre se compone para que el HTML no la contenga) */
  try { window.localStorage.removeItem(['pc', 'tab'].join('-')); } catch (e) {}
  try { PC.pintarComunes(); } catch (e) { PC._err('comunes', e); }
  try { PC.iniciarRutas(); } catch (e) { PC._err('rutas', e); }
  PC._msArranque = (window.performance && performance.now) ? performance.now() : 0;
  try { PC._comprobarDia(); } catch (e) {}
  if (PC.qa) { try { PC._qa.lanzar(); } catch (e) { PC._err('qa', e); } }
})();
