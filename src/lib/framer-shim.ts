/**
 * Sustituto del paquete `framer`.
 *
 * Los componentes creados en Framer importan utilidades de `"framer"` para
 * declarar sus controles de propiedades en el editor. Ese paquete solo existe
 * dentro de Framer, así que fuera de ahí la importación falla y el componente
 * no carga.
 *
 * Este archivo devuelve versiones inertes de esas utilidades: mantienen la
 * firma que el componente espera, pero no hacen nada. El componente renderiza
 * igual; simplemente no hay editor que muestre sus controles.
 *
 * Está enlazado como alias de `framer` en astro.config.mjs.
 *
 * Si algún componente importa algo que no esté aquí, el build falla con un
 * mensaje claro indicando qué falta y se agrega en este archivo.
 */
import * as React from 'react';

/** En Framer registra los controles del panel lateral. Fuera de Framer, no aplica. */
export function addPropertyControls(_component: unknown, _controls: unknown): void {
  // Intencionalmente vacío.
}

/** Catálogo de tipos de control. Solo se usa como valor en las declaraciones. */
export const ControlType = {
  Boolean: 'boolean',
  Number: 'number',
  String: 'string',
  RichText: 'richtext',
  Color: 'color',
  Enum: 'enum',
  SegmentedEnum: 'segmentedenum',
  File: 'file',
  Image: 'image',
  ResponsiveImage: 'responsiveimage',
  ComponentInstance: 'componentinstance',
  Array: 'array',
  Object: 'object',
  Link: 'link',
  Date: 'date',
  Transition: 'transition',
  BoxShadow: 'boxshadow',
  FusedNumber: 'fusednumber',
  Padding: 'padding',
  BorderRadius: 'borderradius',
  EventHandler: 'eventhandler',
  Font: 'font',
  CustomCursor: 'customcursor',
  Cursor: 'cursor',
} as const;

/**
 * Indica dónde se está dibujando el componente.
 *
 * Los componentes preguntan `RenderTarget.current() === RenderTarget.canvas`
 * para mostrar un marcador de posición mientras se los edita en Framer.
 * Aquí se devuelve `preview`, que es el modo del sitio publicado: así
 * renderizan su contenido real y no el marcador del editor.
 */
export const RenderTarget = {
  canvas: 'CANVAS',
  export: 'EXPORT',
  thumbnail: 'THUMBNAIL',
  preview: 'PREVIEW',
  current: () => 'PREVIEW',
} as const;

/** Framer la usa para saber si está en render estático. Aquí nunca lo está. */
export function useIsStaticRenderer(): boolean {
  return false;
}

export function useIsOnFramerCanvas(): boolean {
  return false;
}

/** HOC que en Framer inyecta CSS. Aquí devuelve el componente sin tocarlo. */
export function withCSS<T>(Component: T, _css?: unknown): T {
  return Component;
}

/**
 * Enlace de Framer. Se reemplaza por un `<a>` normal, que es lo correcto en un
 * sitio estático: la navegación la maneja Astro.
 */
export const Link = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { href?: string }
>(({ href, children, ...resto }, ref) =>
  React.createElement('a', { ref, href: href ?? '#', ...resto }, children),
);
Link.displayName = 'FramerLink';

/** Algunos componentes leen el idioma activo. El sitio es solo español. */
export function useLocaleInfo() {
  return [{ activeLocale: { id: 'es', code: 'es-EC', name: 'Español' }, locales: [] }] as const;
}
