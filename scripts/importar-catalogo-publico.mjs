/**
 * Arma el catálogo público de pacientes.
 *
 * Fuentes, en orden de autoridad:
 *
 *   1. `pruebas.xls`          la lista de pruebas que se ofrece al paciente.
 *                             Es un .xls binario de Excel 97, no un .xlsx, y
 *                             solo trae nombre y código interno.
 *   2. `catalogo-info.json`   especialidad, para qué sirve, preparación,
 *                             tipo de muestra y sinónimos. Se mantiene aparte
 *                             para que reimportar el Excel no lo borre.
 *   3. Plantilla de asociados  tiempo de entrega y método, solo cuando el
 *                             nombre coincide exactamente. No se cruza por
 *                             parecido: emparejar «CREATININA» con
 *                             «CREATININA ORINA» pondría el dato equivocado.
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

const acentos = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const clave = (s) => acentos(s).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();

const hacerSlug = (s) =>
  acentos(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 70).replace(/-+$/, '');

// ── 1 · La lista del laboratorio ──────────────────────────────────────────
const libro = XLSX.readFile(origen);
const hoja = libro.Sheets[libro.SheetNames[0]];
const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: '' }).slice(1);
const pruebas = filas
  .map((f) => String(f[2] ?? '').trim())
  .filter(Boolean);

// ── 2 · El contenido redactado ────────────────────────────────────────────
const rutaInfo = join(raiz, 'src/data/catalogo-info.json');
const info = existsSync(rutaInfo) ? JSON.parse(readFileSync(rutaInfo, 'utf8')) : {};

// ── 3 · Datos operativos de la plantilla de asociados ─────────────────────
const rutaAsoc = join(raiz, 'src/data/catalogo-asociados.json');
const asociados = existsSync(rutaAsoc) ? JSON.parse(readFileSync(rutaAsoc, 'utf8')).pruebas : [];
const porNombre = new Map(asociados.map((p) => [clave(p.nombre), p]));

const usados = new Set();
let conPlantilla = 0;

const examenes = pruebas.map((nombre) => {
  let slug = hacerSlug(nombre) || 'examen';
  let n = 2;
  while (usados.has(slug)) slug = `${hacerSlug(nombre)}-${n++}`;
  usados.add(slug);

  const propio = info[nombre] ?? {};
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
    tiempoEntrega: gemelo?.entrega ?? 'Consultar',
    tipoMuestra: propio.tipoMuestra ?? gemelo?.muestra?.replace(/\s*\(?\bnotas?\s*\d+[^)]*\)?/gi, '').trim() ?? 'Consultar',
    tecnica: gemelo?.metodo ?? 'Consultar',
    sinonimos: propio.sinonimos ?? [],
    ficha: null,
  };
});

writeFileSync(join(raiz, 'src/data/examenes.json'), JSON.stringify(examenes, null, 1));

const porEsp = {};
examenes.forEach((e) => (porEsp[e.especialidad] = (porEsp[e.especialidad] || 0) + 1));

console.log('exámenes             ' + examenes.length);
console.log('slugs únicos         ' + new Set(examenes.map((e) => e.slug)).size);
console.log('con especialidad     ' + examenes.filter((e) => e.especialidad !== 'Pruebas especiales').length);
console.log('con utilidad         ' + examenes.filter((e) => e.utilidad).length);
console.log('con preparación      ' + examenes.filter((e) => e.condicionesClinicas).length);
console.log('con tipo de muestra  ' + examenes.filter((e) => e.tipoMuestra !== 'Consultar').length);
console.log('con tiempo real      ' + examenes.filter((e) => e.tiempoEntrega !== 'Consultar').length + '  (de la plantilla de asociados: ' + conPlantilla + ')');
console.log('sin redactar         ' + examenes.filter((e) => !e.utilidad).length);
console.log();
Object.entries(porEsp).sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => console.log('  ' + String(v).padStart(4) + '  ' + k));
