/**
 * Deja `catalogo-info.json` con todos los campos de cada examen.
 *
 * Por qué hace falta: `examenes.json` es un archivo derivado. Se arma con el
 * Excel del laboratorio, con lo redactado en `catalogo-info.json` y con los
 * datos operativos de la plantilla de asociados. Volver a importar el Excel lo
 * reescribe entero, así que **todo lo que no esté en `catalogo-info.json` se
 * pierde en la siguiente importación**.
 *
 * El tiempo de entrega y la técnica venían solo de la plantilla de asociados y
 * nunca se guardaban aquí. Mientras siga así, el panel no puede dejar que nadie
 * los corrija: el trabajo de rellenar 495 plazos desaparecería con el próximo
 * Excel. Este script los copia a `catalogo-info.json`, que pasa a ser la copia
 * buena de lo que una persona escribió.
 *
 * Es idempotente: ejecutarlo dos veces no cambia nada la segunda. Conviene
 * pasarlo si alguna vez se edita `examenes.json` a mano.
 *
 * Uso:  node scripts/completar-catalogo-info.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const raiz = dirname(dirname(new URL(import.meta.url).pathname.slice(1)));
const rutaExamenes = join(raiz, 'src/data/examenes.json');
const rutaInfo = join(raiz, 'src/data/catalogo-info.json');

const examenes = JSON.parse(readFileSync(rutaExamenes, 'utf8'));
const info = JSON.parse(readFileSync(rutaInfo, 'utf8'));

/**
 * Nombre comparable, igual que en el panel: sin acentos, sin mayúsculas y sin
 * puntuación. Sirve para reconocer el mismo examen cuando solo cambió cómo está
 * escrito —una tilde, un espacio de más— y mudar su texto a la clave nueva en vez
 * de dejarlo huérfano y empezar de cero.
 */
const clave = (texto) =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const porClave = new Map(Object.keys(info).map((n) => [clave(n), n]));

const nuevo = {};
const rellenado = {};
const mudados = [];

for (const examen of examenes) {
  let guardado = info[examen.nombre];
  if (!guardado) {
    const anterior = porClave.get(clave(examen.nombre));
    if (anterior && anterior !== examen.nombre) {
      guardado = info[anterior];
      mudados.push([anterior, examen.nombre]);
      delete info[anterior];
    }
  }
  guardado ??= {};

  // Mismo orden de campos que en examenes.json, para que los dos archivos se
  // lean igual al compararlos.
  const entrada = {
    especialidad: guardado.especialidad ?? examen.especialidad,
    utilidad: guardado.utilidad ?? examen.utilidad,
    condicionesClinicas: guardado.condicionesClinicas ?? examen.condicionesClinicas,
    tiempoEntrega: guardado.tiempoEntrega ?? examen.tiempoEntrega,
    tipoMuestra: guardado.tipoMuestra ?? examen.tipoMuestra,
    tecnica: guardado.tecnica ?? examen.tecnica,
    sinonimos: guardado.sinonimos ?? examen.sinonimos ?? [],
  };

  for (const campo of Object.keys(entrada)) {
    if (guardado[campo] === undefined) rellenado[campo] = (rellenado[campo] ?? 0) + 1;
  }

  nuevo[examen.nombre] = entrada;
}

const sobrantes = Object.keys(info).filter((n) => nuevo[n] === undefined);

// Lo que ya no está en el catálogo se conserva: si una prueba vuelve a
// ofrecerse, su texto sigue aquí y no hay que volver a redactarlo.
for (const nombre of sobrantes) nuevo[nombre] = info[nombre];

// Sangría de 1 y sin salto final, como lo deja el importador. Cambiar el
// formato haría que el primer cambio de un campo se viera como 559 exámenes
// reescritos.
const antes = readFileSync(rutaInfo, 'utf8');
const texto = JSON.stringify(nuevo, null, 1);
writeFileSync(rutaInfo, texto);

console.log('exámenes en el catálogo  ' + examenes.length);
console.log('entradas en el archivo   ' + Object.keys(nuevo).length);
if (sobrantes.length) console.log('guardadas sin ofrecerse  ' + sobrantes.length);
console.log();
if (mudados.length) {
  console.log('Texto mudado a un nombre escrito de otra forma:');
  for (const [antes, ahora] of mudados) console.log(`  «${antes}» → «${ahora}»`);
  console.log();
}
if (Object.keys(rellenado).length === 0) {
  console.log('No faltaba nada.');
} else {
  console.log('Campos rellenados:');
  for (const [campo, veces] of Object.entries(rellenado)) {
    console.log('  ' + String(veces).padStart(4) + '  ' + campo);
  }
}
console.log();
console.log(antes === texto ? 'El archivo no cambió.' : 'Archivo actualizado.');
