/**
 * Convierte «Plantilla Asociados.xlsx» en el JSON que consume el catálogo.
 *
 * Reglas que salieron de inspeccionar la hoja, no de suponer:
 *
 *  · Una fila es PRUEBA si tiene método (col. B) o precio (col. E). Las filas
 *    que solo llevan texto son la descripción de la prueba anterior: así están
 *    los paneles, cuyo contenido se lista en las filas siguientes.
 *  · Las especialidades van en una lista explícita. El estilo de celda no sirve
 *    para distinguirlas: solo 7 de las 19 comparten formato.
 *  · Las notas 1 a 9 viven arriba de la tabla y las cita la columna de muestra.
 *
 * Uso:  node extraer.mjs <ruta-al-xlsx>   →  escribe catalogo.json al lado
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

const xlsx = process.argv[2];
if (!xlsx) {
  console.error('Falta la ruta del .xlsx');
  process.exit(1);
}

const tmp = mkdtempSync(join(tmpdir(), 'xlsx-'));
try {
  /*
    Un .xlsx es un zip. Se usa ZipFile de .NET y no `Expand-Archive`, porque
    ese último rechaza cualquier extensión que no sea .zip.
  */
  execFileSync('powershell', [
    '-NoProfile', '-Command',
    'Add-Type -AssemblyName System.IO.Compression.FileSystem; ' +
      `[System.IO.Compression.ZipFile]::ExtractToDirectory('${xlsx.replace(/\//g, '\\')}', '${tmp}')`,
  ]);

  const desescapar = (s) =>
    s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/&#10;/g, ' ').replace(/\s+/g, ' ').trim();

  const ss = readFileSync(join(tmp, 'xl/sharedStrings.xml'), 'utf8');
  const cadenas = [...ss.matchAll(/<si>(.*?)<\/si>/gs)].map((m) =>
    desescapar([...m[1].matchAll(/<t[^>]*>(.*?)<\/t>/gs)].map((x) => x[1]).join('')),
  );

  const hoja = readFileSync(join(tmp, 'xl/worksheets/sheet1.xml'), 'utf8');
  const filas = [...hoja.matchAll(/<row[^>]*r="(\d+)"[^>]*>(.*?)<\/row>/gs)];

  const leer = (f) => {
    const o = {};
    for (const c of f[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*)>(?:<v>(.*?)<\/v>)?<\/c>/gs)) {
      if (c[3] === undefined) continue;
      o[c[1]] = (c[2] || '').includes('t="s"') ? cadenas[+c[3]] : c[3];
    }
    return o;
  };

  const ESPECIALIDADES = new Set([
    'HEMATOLOGIA', 'BIOQUIMICA SANGUINEA', 'METABOLISMO FERRICO Y VITAMINAS',
    'HORMONAS', 'MARCADORES TUMORALES', 'ELECTROLITOS', 'PRUEBAS DE COAGULACION',
    'MARCADORES CARDIOVASCULARES', 'INMUNOLOGIA', 'PRUEBAS INFECCIOSAS',
    'BIOLOGIA MOLECULAR', 'PRUEBAS TOXICOLOGICAS', 'PRUEBAS EN ORINA',
    'PRUEBAS EN HECES', 'MICROBIOLOGIA', 'BACTERIOLOGIA MANUAL',
    'BACTERIOLOGIA AUTOMATIZADA', 'MICOLOGIA', 'PRUEBAS ESPECIALES',
  ]);

  /*
    El archivo escribe el mismo plazo de varias formas. Solo se unifican
    variantes tipográficas evidentes: «3 días» y «3 días hábiles» se dejan
    distintas porque pueden significar cosas distintas y eso lo decide el
    laboratorio, no este script.
  */
  const normalizarEntrega = (t) => {
    let s = (t || '').trim();
    if (!s) return '';
    if (/^el mismo d[ií]a$/i.test(s)) return 'El mismo día';
    if (/^a partir de las 6\s?pm$/i.test(s)) return 'A partir de las 18:00';
    if (/^2 d[ií]as labor$/i.test(s)) return '2 días hábiles';
    s = s.replace(/(\d)\s*-\s*(\d)/g, '$1-$2')          // «3 -5» → «3-5»
         .replace(/(\d)d[ií]as/gi, '$1 días')            // «3días» → «3 días»
         .replace(/\bdias\b/gi, 'días')
         .replace(/\blaborables\b/gi, 'hábiles')
         .replace(/\bHoras\b/g, 'horas')
         .replace(/\s+/g, ' ');
    return s;
  };

  /*
    El nombre de la prueba se deja EXACTAMENTE como lo escribe el laboratorio.
    Se intentó pasarlo a mayúscula inicial y el resultado fue peor: «IGF-1» se
    convertía en «Igf- 1» y «IgG» en «Igg». Un catálogo clínico se escribe en
    mayúsculas por convención y su personal lo lee así; cualquier reescritura
    automática arriesga corromper un nombre médico a cambio de nada.
  */

  const avisos = [];
  const notas = [];
  const pruebas = [];
  let especialidad = null;

  for (const f of filas) {
    const n = +f[1];
    const c = leer(f);
    const A = (c.A || '').trim();
    if (!A) continue;

    // Cabecera del documento: avisos generales y notas de muestra.
    if (n < 37) {
      if (/^Nota\s*\d+\s*:/i.test(A)) notas.push(A);
      else if (n >= 10 && n <= 14) avisos.push(A);
      continue;
    }
    if (A === 'NOMBRE') continue;

    if (ESPECIALIDADES.has(A)) {
      especialidad = A;
      continue;
    }

    const esPrueba = !!(c.B || c.E);

    if (!esPrueba) {
      // Texto suelto: amplía la prueba anterior.
      const previa = pruebas[pruebas.length - 1];
      if (!previa) continue;
      previa.incluye.push(A);
      if (c.C) previa.muestraExtra.push(c.C.trim());
      continue;
    }

    pruebas.push({
      fila: n,
      especialidad,
      nombre: A,
      incluye: [],
      muestraExtra: [],
      metodo: (c.B || '').trim(),
      muestra: (c.C || '').trim(),
      entrega: normalizarEntrega(c.D),
      // Sin `isFinite` una celda no numérica dejaba NaN, que al serializar se
      // vuelve null y hacía que el recuento de «sin precio» diera cero de más.
      precio: (() => {
        const v = parseFloat(c.E);
        return Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
      })(),
    });
  }

  const salida = {
    fuente: 'Plantilla Asociados · lista de precios para laboratorios',
    generado: new Date().toISOString().slice(0, 10),
    avisos,
    notas,
    pruebas: pruebas.map((p) => {
      const muestra = [p.muestra, ...p.muestraExtra].filter(Boolean).join(' ');
      return {
        especialidad: p.especialidad,
        nombre: p.nombre,
        incluye: p.incluye.length ? p.incluye.join(' · ') : undefined,
        metodo: p.metodo || undefined,
        muestra: muestra || undefined,
        entrega: p.entrega || undefined,
        precio: p.precio,
        // Notas de muestra que cita esta prueba, para mostrarlas en la ficha.
        notas: [...new Set([...muestra.matchAll(/nota\s*(\d+)/gi)].map((m) => +m[1]))].sort((a, b) => a - b),
      };
    }),
  };

  // Escribe directamente donde lo consume el sitio, para que reimportar el
  // Excel actualizado sea un solo comando y no haya que copiar nada a mano.
  //
  // Son dos archivos a propósito. El despliegue va por repositorio, así que lo
  // que se versiona acaba al alcance de cualquiera que tenga acceso a él: el
  // tarifario mayorista no puede viajar ahí. El sitio no muestra precios
  // (`MOSTRAR_PRECIOS = false`), así que la versión sin importes le basta para
  // compilar igual; la que los trae se queda fuera de git (ver .gitignore).
  const raiz = dirname(dirname(new URL(import.meta.url).pathname.slice(1)));
  const destino = join(raiz, 'src/data/catalogo-asociados.json');
  const destinoPrivado = join(raiz, 'src/data/catalogo-asociados.privado.json');

  writeFileSync(destinoPrivado, JSON.stringify(salida, null, 1));
  writeFileSync(
    destino,
    JSON.stringify(
      {
        ...salida,
        fuente: 'Plantilla Asociados · cartera de pruebas para laboratorios (sin tarifario)',
        pruebas: salida.pruebas.map((p) => ({ ...p, precio: null })),
      },
      null,
      1,
    ),
  );

  const porEsp = {};
  salida.pruebas.forEach((p) => (porEsp[p.especialidad] = (porEsp[p.especialidad] || 0) + 1));

  console.log('pruebas          ' + salida.pruebas.length);
  console.log('especialidades   ' + Object.keys(porEsp).length);
  console.log('con contenido    ' + salida.pruebas.filter((p) => p.incluye).length);
  console.log('citan nota       ' + salida.pruebas.filter((p) => p.notas.length).length);
  console.log('notas            ' + notas.length);
  console.log('avisos           ' + avisos.length);
  console.log('sin precio       ' + salida.pruebas.filter((p) => p.precio === null).length);
  console.log('sin entrega      ' + salida.pruebas.filter((p) => !p.entrega).length);
  console.log('sin método       ' + salida.pruebas.filter((p) => !p.metodo).length);
  console.log();
  Object.entries(porEsp).forEach(([k, v]) => console.log('  ' + String(v).padStart(4) + '  ' + k));
  console.log();
  console.log('plazos: ' + [...new Set(salida.pruebas.map((p) => p.entrega).filter(Boolean))].sort().join(' · '));
  console.log();
  console.log('→ ' + destino + '  (se versiona, sin precios)');
  console.log('→ ' + destinoPrivado + '  (con precios, fuera de git)');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
