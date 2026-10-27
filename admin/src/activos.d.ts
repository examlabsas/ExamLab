/**
 * Los archivos binarios que el Worker lleva dentro.
 *
 * `wrangler.jsonc` los declara como módulos `Data`, y entonces un `import`
 * devuelve un `ArrayBuffer`. TypeScript no lo sabe por su cuenta: sin estas
 * declaraciones, `tsc` corta con «no se encuentra el módulo» aunque el
 * despliegue funcione.
 */
declare module '*.woff2' {
  const contenido: ArrayBuffer;
  export default contenido;
}

declare module '*.webp' {
  const contenido: ArrayBuffer;
  export default contenido;
}

declare module '*.png' {
  const contenido: ArrayBuffer;
  export default contenido;
}
