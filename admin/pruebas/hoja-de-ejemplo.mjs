/**
 * Escribe una hoja de ejemplo para probar la carga del catálogo.
 *
 * Se genera del catálogo de ahora y no se guarda un archivo fijo, que se queda
 * viejo en cuanto el catálogo cambia y entonces la prueba enseña bajas que no
 * son.
 *
 * Trae los 559 nombres y rellena el plazo de entrega de los veinte primeros que
 * no lo tengan, así la comparación muestra algo interesante sin dar de baja
 * nada: «0 entran, 0 salen, 20 datos cambian».
 *
 *   npm run pruebas:hoja
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const aqui = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const raiz = dirname(dirname(aqui));

const examenes = JSON.parse(readFileSync(join(raiz, 'src/data/examenes.json'), 'utf8'));

/** Entre comillas solo si hace falta, como lo haría Excel. */
const celda = (valor) => (/[;\n"]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor);

let rellenados = 0;
const lineas = ['PRUEBA;TIEMPO DE ENTREGA'];
for (const e of examenes) {
  const nuevo = e.tiempoEntrega === 'Consultar' && rellenados < 20 ? '24 horas' : '';
  if (nuevo) rellenados++;
  lineas.push([e.nombre, nuevo].map(celda).join(';'));
}

const destino = join(aqui, 'hoja-de-ejemplo.csv');
writeFileSync(destino, lineas.join('\n'), 'utf8');

console.log(`
  Hoja de ejemplo escrita en:

    admin/pruebas/hoja-de-ejemplo.csv

  ${examenes.length} exámenes, con el plazo de entrega puesto en ${rellenados}.
  Súbala en /catalogo-importar: debería decir 0 entran, 0 salen y
  ${rellenados} datos cambian.
`);
