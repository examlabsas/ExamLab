/**
 * Datos estructurados Schema.org.
 *
 * El tipo principal del sitio es MedicalBusiness (con MedicalClinic como
 * subtipo adicional), declarado en todas las páginas desde BaseLayout.
 * Las páginas de detalle añaden su propio bloque (MedicalTest, Article…).
 */
import {
  site,
  sedes,
  mapaEnlace,
  fechasEspecialesDe,
  type Sede,
  type HorarioSemanal,
  type Tramo,
} from './site';
import { tieneDato, type Examen } from './examenes';
import { fotoOg, FOTO_POR_DEFECTO } from './fotos';

const abs = (ruta: string) => new URL(ruta, site.url).toString();

/** Nombres de día que espera Schema.org. Índice 0 = domingo, igual que JS. */
const DIAS_SCHEMA = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Traduce el horario de una sede al formato de Schema.org, agrupando los días
 * que comparten franja.
 *
 * Antes estaba escrito a mano aquí, duplicando lo que ya vivía en site.ts. Al
 * corregir los horarios reales, la ficha de Google habría seguido anunciando
 * los antiguos: el laboratorio abierto según la página y cerrado según Google,
 * o al revés.
 */
function horarioSchema(semana: HorarioSemanal) {
  // Se agrupa por la lista completa de tramos del día (no solo uno), porque
  // un día con pausa de mediodía tiene dos tramos que deben viajar juntos.
  const porFranja = new Map<string, { dias: string[]; tramos: Tramo[] }>();

  semana.forEach((franja, dia) => {
    if (!franja) return; // día cerrado: Schema.org simplemente no lo lista
    const clave = franja.map((t) => `${t.abre}|${t.cierra}`).join(',');
    const entrada = porFranja.get(clave);
    if (entrada) entrada.dias.push(DIAS_SCHEMA[dia]!);
    else porFranja.set(clave, { dias: [DIAS_SCHEMA[dia]!], tramos: franja });
  });

  // Un OpeningHoursSpecification por tramo, compartiendo los mismos días.
  return [...porFranja.values()].flatMap(({ dias, tramos }) =>
    tramos.map((t) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: dias,
      opens: t.abre,
      closes: t.cierra,
    })),
  );
}

/**
 * Feriados y jornadas distintas, en el campo que Schema.org reserva para eso.
 *
 * Sin esto, Google sigue anunciando el horario normal un día que el
 * laboratorio está cerrado. Un día cerrado se declara con `opens` y `closes`
 * iguales, que es como la especificación indica el cierre.
 */
function fechasEspecialesSchema(slug: string) {
  return fechasEspecialesDe(slug).map((f) =>
    f.franja && f.franja.length > 0
      ? {
          '@type': 'OpeningHoursSpecification',
          validFrom: f.fecha,
          validThrough: f.fecha,
          opens: f.franja[0]!.abre,
          closes: f.franja[f.franja.length - 1]!.cierra,
        }
      : {
          '@type': 'OpeningHoursSpecification',
          validFrom: f.fecha,
          validThrough: f.fecha,
          opens: '00:00',
          closes: '00:00',
        },
  );
}

function sucursal(sede: Sede) {
  return {
    '@type': 'MedicalBusiness',
    '@id': abs(`/sedes#${sede.slug}`),
    name: `${site.nombre} · ${sede.nombre}`,
    parentOrganization: { '@id': abs('/#organizacion') },
    address: {
      '@type': 'PostalAddress',
      streetAddress: sede.direccion,
      addressLocality: sede.ciudad,
      addressRegion: sede.provincia,
      addressCountry: 'EC',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: sede.geo.lat,
      longitude: sede.geo.lng,
    },
    telephone: sede.telefonoE164,
    openingHoursSpecification: horarioSchema(sede.horarioSemanal),
    specialOpeningHoursSpecification: fechasEspecialesSchema(sede.slug),
    hasMap: mapaEnlace(sede),
    ...(sede.foto && { image: abs(fotoOg(sede.foto)) }),
  };
}

/** Ficha principal del laboratorio. Se inyecta en todas las páginas. */
export function medicalBusinessSchema() {
  const matriz = sedes[0]!;

  return {
    '@context': 'https://schema.org',
    '@type': ['MedicalBusiness', 'MedicalClinic'],
    '@id': abs('/#organizacion'),
    name: site.nombre,
    legalName: site.razonSocial,
    description: site.descripcion,
    slogan: site.claim,
    url: site.url,
    logo: abs('/images/logo.png'),
    image: [abs(fotoOg('matriz-ficoa-fachada')), abs(fotoOg('laboratorio-equipo-trabajando'))],
    foundingDate: site.fundacion,
    medicalSpecialty: ['Pathology', 'PublicHealth'],
    priceRange: '$$',
    currenciesAccepted: 'USD',
    paymentAccepted: 'Efectivo, tarjeta de débito, tarjeta de crédito, transferencia',
    email: site.email,
    telephone: site.telefonoE164,
    address: {
      '@type': 'PostalAddress',
      streetAddress: matriz.direccion,
      addressLocality: matriz.ciudad,
      addressRegion: matriz.provincia,
      addressCountry: 'EC',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: matriz.geo.lat,
      longitude: matriz.geo.lng,
    },
    hasMap: mapaEnlace(matriz),
    openingHoursSpecification: horarioSchema(matriz.horarioSemanal),
    specialOpeningHoursSpecification: fechasEspecialesSchema(matriz.slug),
    areaServed: [
      { '@type': 'City', name: 'Ambato' },
      { '@type': 'City', name: 'Pelileo' },
      { '@type': 'AdministrativeArea', name: 'Tungurahua' },
    ],
    availableService: [
      {
        '@type': 'MedicalTest',
        name: 'Exámenes de laboratorio clínico',
        description: 'Más de 400 análisis clínicos: hematología, química sanguínea, hormonas, microbiología y pruebas especializadas.',
      },
      {
        '@type': 'MedicalProcedure',
        name: 'Toma de muestra a domicilio',
        description: 'Toma de muestra en casa u oficina dentro de Ambato con agendamiento previo.',
      },
    ],
    department: sedes.map(sucursal),
    sameAs: [site.redes.facebook, site.redes.instagram, site.redes.tiktok],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: abs('/catalogo?q={search_term_string}'),
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function webSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': abs('/#sitio'),
    url: site.url,
    name: site.nombre,
    inLanguage: 'es-EC',
    publisher: { '@id': abs('/#organizacion') },
  };
}

/** Migas de pan para páginas internas. */
export function breadcrumbSchema(items: { nombre: string; href: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.nombre,
      item: abs(item.href),
    })),
  };
}

/** Ficha de un examen del catálogo. */
export function medicalTestSchema(examen: Examen) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalTest',
    '@id': abs(`/catalogo/${examen.slug}#examen`),
    name: examen.nombre,
    alternateName: examen.sinonimos,
    description: examen.utilidad,
    /*
      Los dos campos de abajo se omiten cuando no hay dato, en vez de publicar
      el relleno. `JSON.stringify` descarta las claves `undefined`, así que
      desaparecen del bloque.

      Es el mismo error que se corrigió en la descripción que lee Google
      —«Entrega en consultar»— y que aquí seguía: 495 de los 559 exámenes
      declaraban `usesDevice: "Consultar"`, o sea que el aparato con el que se
      procesan se llama «Consultar», y los 559 un `codeValue` vacío dentro de
      un `MedicalCode` con sistema propio. Un código vacío afirma que existe y
      no vale nada; no declararlo dice la verdad.
    */
    code: examen.codigo
      ? { '@type': 'MedicalCode', codeValue: examen.codigo, codingSystem: 'ExamLab' }
      : undefined,
    preparation: examen.condicionesClinicas,
    usesDevice: tieneDato(examen.tecnica) ? examen.tecnica : undefined,
    relevantSpecialty: { '@type': 'MedicalSpecialty', name: examen.especialidad },
    availableService: { '@id': abs('/#organizacion') },
    provider: { '@id': abs('/#organizacion') },
    url: abs(`/catalogo/${examen.slug}`),
  };
}

/** Ficha de una sede para su página propia. */
export function sedeSchema(sede: Sede) {
  return {
    '@context': 'https://schema.org',
    ...sucursal(sede),
  };
}

/** Artículo del blog de noticias. */
export function articleSchema(post: {
  titulo: string;
  descripcion: string;
  fecha: Date;
  actualizado?: Date;
  autor: string;
  imagen?: string;
  slug: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': abs(`/noticias/${post.slug}#articulo`),
    headline: post.titulo,
    description: post.descripcion,
    datePublished: post.fecha.toISOString(),
    dateModified: (post.actualizado ?? post.fecha).toISOString(),
    inLanguage: 'es-EC',
    author: { '@type': 'Organization', name: post.autor },
    publisher: { '@id': abs('/#organizacion') },
    image: abs(post.imagen ?? fotoOg(FOTO_POR_DEFECTO)),
    mainEntityOfPage: abs(`/noticias/${post.slug}`),
  };
}


/**
 * Serializa un bloque para `<script type="application/ld+json">`.
 *
 * `JSON.stringify` no neutraliza `</script>`, así que un dato que lo
 * contuviera cerraría la etiqueta y lo que viniera detrás se interpretaría
 * como marcado. Hoy está limpio —lo comprobé sobre las 583 páginas— pero los
 * nombres de examen salen de un Excel del laboratorio, no de código revisado.
 */
export function serializarSchema(bloque: Record<string, unknown>): string {
  return JSON.stringify(bloque).replace(/</g, '\u003c');
}
