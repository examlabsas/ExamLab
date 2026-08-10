/**
 * Datos estructurados Schema.org.
 *
 * El tipo principal del sitio es MedicalBusiness (con MedicalClinic como
 * subtipo adicional), declarado en todas las páginas desde BaseLayout.
 * Las páginas de detalle añaden su propio bloque (MedicalTest, Article…).
 */
import { site, sedes, mapaEnlace, type Sede } from './site';
import type { Examen } from './examenes';

const abs = (ruta: string) => new URL(ruta, site.url).toString();

const horarioBase = [
  {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    opens: '06:30',
    closes: '19:00',
  },
  {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Saturday'],
    opens: '07:00',
    closes: '13:00',
  },
];

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
    openingHoursSpecification: horarioBase,
    hasMap: mapaEnlace(sede),
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
    image: [abs('/images/Fotolaboratorio.png'), abs('/images/Fotoequipo.png')],
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
    openingHoursSpecification: horarioBase,
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
    code: {
      '@type': 'MedicalCode',
      codeValue: examen.codigo,
      codingSystem: 'ExamLab',
    },
    preparation: examen.condicionesClinicas,
    usesDevice: examen.tecnica,
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
    image: post.imagen ? abs(post.imagen) : abs('/images/Fotolaboratorio.png'),
    mainEntityOfPage: abs(`/noticias/${post.slug}`),
  };
}
