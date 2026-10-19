/**
 * Arma el catálogo público de pacientes.
 *
 * Fuentes, en orden de autoridad:
 *
 *   1. `pruebas.xls`          la lista de pruebas que se ofrece al paciente.
 *                             Es un .xls binario de Excel 97, no un .xlsx, y
 *                             solo trae nombre y código interno.
 *   2. `catalogo-info.json`   todo lo que una persona escribió: especialidad,
 *                             para qué sirve, preparación, tipo de muestra,
 *                             plazo de entrega, técnica y sinónimos. Se mantiene
 *                             aparte para que reimportar el Excel no lo borre, y
 *                             es lo que escribe el panel de administración.
 *   3. Plantilla de asociados  tiempo de entrega y método, solo cuando el
 *                             nombre coincide exactamente. No se cruza por
 *                             parecido: emparejar «CREATININA» con
 *                             «CREATININA ORINA» pondría el dato equivocado.
 *                             Solo rellena lo que nadie haya escrito todavía.
 *
 * El código de Avalab no se importa: se descartó porque los nombres de las dos
 * listas no coinciden y un código mal asignado abriría otra prueba.
 *
 * Uso:  node scripts/importar-catalogo-publico.mjs <ruta-a-pruebas.xls>
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import XLSX from 'xlsx';

const origen = process.argv[2];
if (!origen) {
  console.error('Falta la ruta de pruebas.xls');
  process.exit(1);
}

const raiz = dirname(dirname(new URL(import.meta.url).pathname.slice(1)));

/*
  Tiene que quitar exactamente lo mismo que `normalizar()` de
  `src/lib/examenes-comun.ts`, que es la que usa el panel. Aquí había un rango
  `[̀-ͯ]`, que cubre los acentos combinantes pero no los sueltos:
  `\p{Diacritic}` sí. Con la diferencia, un nombre con un acento suelto —el
  `´` de «TEST DE O´SULLIVAN», fácil de teclear en un teclado español— recibía
  un slug del panel y otro del script, y se emparejaba distinto en cada uno.
  Era la misma trampa que ya hizo desaparecer un examen: dos deducciones
  separadas de lo mismo acaban discrepando.

  Medido al unificarlas: cambia 1 nombre de los 788 de los tres catálogos y
  **ninguno de los 559 publicados**, así que no se mueve ninguna URL del sitio.
*/
const acentos = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
const clave = (s) => acentos(s).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();

const hacerSlug = (s) =>
  acentos(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 70).replace(/-+$/, '');

// ── 1 · La lista del laboratorio ──────────────────────────────────────────
const libro = XLSX.readFile(origen);
const hoja = libro.Sheets[libro.SheetNames[0]];
const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: '' }).slice(1);
// Los espacios de más se quitan aquí: diecisiete nombres los traían dobles
// («ANTI-LKM   (IFI)»). El HTML los junta al mostrarlos, así que no se veían,
// pero quedaban en el JSON, en el título de la página y en el buscador.
const pruebas = filas
  .map((f) => String(f[2] ?? '').replace(/\s+/g, ' ').trim())
  .filter(Boolean);

// ── 2 · El contenido redactado ────────────────────────────────────────────
const rutaInfo = join(raiz, 'src/data/catalogo-info.json');
const info = existsSync(rutaInfo) ? JSON.parse(readFileSync(rutaInfo, 'utf8')) : {};
// Por si el Excel escribe el nombre de otra forma —una tilde, un espacio—: sin
// esto, corregir la ortografía de una prueba borraría su texto redactado.
const infoPorClave = new Map(Object.keys(info).map((n) => [clave(n), n]));

// ── 3 · Datos operativos de la plantilla de asociados ─────────────────────
const rutaAsoc = join(raiz, 'src/data/catalogo-asociados.json');
const asociados = existsSync(rutaAsoc) ? JSON.parse(readFileSync(rutaAsoc, 'utf8')).pruebas : [];
const porNombre = new Map(asociados.map((p) => [clave(p.nombre), p]));

// ── 4 · Los slugs que ya están publicados ─────────────────────────────────
// El slug es la dirección de la ficha: está en Google y en los enlaces que el
// laboratorio ya repartió. Un examen que sigue en la lista conserva el suyo,
// aunque cambie de orden en la hoja.
const rutaExamenes = join(raiz, 'src/data/examenes.json');
const publicados = existsSync(rutaExamenes) ? JSON.parse(readFileSync(rutaExamenes, 'utf8')) : [];
// Por clave y no por nombre exacto: así un examen al que solo le cambió la
// ortografía conserva la dirección de su ficha.
const slugPrevio = new Map(publicados.map((e) => [clave(e.nombre), e.slug]));

const usados = new Set();
let conPlantilla = 0;
let heredados = 0;

/**
 * Un dato escrito gana al de la plantilla. «Consultar» no es un dato: es la
 * marca de que nadie lo ha entregado todavía, así que ahí sí entra la plantilla.
 */
const preferido = (escrito, plantilla) =>
  escrito && escrito !== 'Consultar' ? escrito : plantilla || 'Consultar';

const examenes = pruebas.map((nombre) => {
  let slug = slugPrevio.get(clave(nombre)) ?? '';
  if (slug && !usados.has(slug)) {
    heredados++;
  } else {
    const base = hacerSlug(nombre) || 'examen';
    slug = base;
    let n = 2;
    while (usados.has(slug)) slug = `${base}-${n++}`;
  }
  usados.add(slug);

  const propio = info[nombre] ?? info[infoPorClave.get(clave(nombre))] ?? {};
  const gemelo = porNombre.get(clave(nombre));
  if (gemelo) conPlantilla++;

  return {
    // El código está en Avalab y se descartó por no poder cruzarlo con
    // seguridad. La ficha oculta el campo mientras esté vacío.
    codigo: '',
    slug,
    nombre,
    especialidad: propio.especialidad ?? 'Pruebas especiales',
    utilidad: propio.utilidad ?? '',
    condicionesClinicas: propio.condicionesClinicas ?? '',
    // El tiempo de entrega es operativo del laboratorio: no se deduce.
    tiempoEntrega: preferido(propio.tiempoEntrega, gemelo?.entrega),
    tipoMuestra: preferido(
      propio.tipoMuestra,
      gemelo?.muestra?.replace(/\s*\(?\bnotas?\s*\d+[^)]*\)?/gi, '').trim(),
    ),
    tecnica: preferido(propio.tecnica, gemelo?.metodo),
    sinonimos: propio.sinonimos ?? [],
    ficha: null,
  };
});

writeFileSync(join(raiz, 'src/data/examenes.json'), JSON.stringify(examenes, null, 1));

const porEsp = {};
examenes.forEach((e) => (porEsp[e.especialidad] = (porEsp[e.especialidad] || 0) + 1));

console.log('exámenes             ' + examenes.length);
console.log('slugs únicos         ' + new Set(examenes.map((e) => e.slug)).size);
console.log('slugs conservados    ' + heredados + '  (los demás son nuevos)');
console.log('con especialidad     ' + examenes.filter((e) => e.especialidad !== 'Pruebas especiales').length);
console.log('con utilidad         ' + examenes.filter((e) => e.utilidad).length);
console.log('con preparación      ' + examenes.filter((e) => e.condicionesClinicas).length);
console.log('con tipo de muestra  ' + examenes.filter((e) => e.tipoMuestra !== 'Consultar').length);
console.log('con tiempo real      ' + examenes.filter((e) => e.tiempoEntrega !== 'Consultar').length + '  (de la plantilla de asociados: ' + conPlantilla + ')');
console.log('sin redactar         ' + examenes.filter((e) => !e.utilidad).length);
console.log();
Object.entries(porEsp).sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => console.log('  ' + String(v).padStart(4) + '  ' + k));
