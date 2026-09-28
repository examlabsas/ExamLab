# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dos públicos con el mismo peso; ninguno cede jerarquía al otro.

**Pacientes.** Personas de Ambato y Pelileo que tienen una orden médica en la mano
y necesitan resolver tres cosas: qué implica el examen, cómo prepararse y a dónde
ir. Llegan por búsqueda en Google, por WhatsApp o escaneando un código QR impreso
en el propio laboratorio. Muchos consultan desde el celular, con datos móviles, a
veces a las seis de la mañana antes de acudir en ayunas.

**Médicos referentes.** Profesionales que derivan pacientes y consultan la ficha
técnica de un examen —tipo de muestra, tiempo de entrega, técnica— o las
condiciones de los convenios.

**Laboratorios asociados.** Público secundario: laboratorios que derivan muestras
a ExamLab para pruebas que no procesan. Envían una petición junto con la muestra,
identificada con su propio código.

## Product Purpose

Sitio del laboratorio clínico ExamLab S.A.S. Reemplaza una página de una sola
sección y debe cumplir cuatro objetivos que el cliente considera igual de
importantes:

1. Atraer pacientes nuevos desde búsquedas locales
2. Responder por sí solo las dudas que hoy llegan por teléfono
3. Proyectar una imagen profesional frente a la competencia local
4. Captar convenios, médicos referentes y laboratorios asociados

El segundo es el que más define el contenido: cada pregunta que la web resuelve
es una llamada que recepción no atiende.

## Positioning

El laboratorio se presenta como «Laboratorio clínico de innovación y desarrollo»,
con cartera propia y servicio de derivación para otros laboratorios de la
provincia. **Sin confirmar:** no está establecido qué hace a ExamLab distinto de
otro laboratorio de Tungurahua en términos que un competidor no pudiera copiar.
Futuro trabajo no debe inventar un diferenciador.

## Operating Context

- El paciente casi siempre llega **con una orden médica**, no buscando un examen
  suelto. El sitio tiene que dejarle encontrar ese examen por nombre o por código.
- **El QR impreso es una puerta física al sitio.** Se imprime en frascos, órdenes
  y afiches de sala de espera, y lleva a `/preparacion`. Esa URL no puede cambiar.
- **WhatsApp es el canal de contacto principal.** No hay reserva de cita en línea;
  cada sección abre el chat con un mensaje distinto ya escrito.
- **Los resultados no viven aquí.** Los entrega Saluto (`erp.salutoapps.com`),
  el sistema del laboratorio; reemplazó a Avalab en septiembre de 2026. El
  sitio solo enlaza.
- La toma de muestra a domicilio la realiza un laboratorista del propio
  laboratorio, que etiqueta en el sitio.
- El laboratorio deriva exámenes marcados como REMISIÓN a laboratorios de
  referencia, y a su vez recibe derivaciones de laboratorios asociados.

## Capabilities and Constraints

**Arquitectura, por contrato.** Sitio estático, sin base de datos expuesta ni
panel de administración público. Cabeceras de seguridad configuradas, HTTPS
forzado y prioridad explícita a la velocidad de carga. Estas no son preferencias
técnicas: son compromisos de la proforma.

**Stack.** Astro con salida estática y Tailwind CSS. Se publica desde el
repositorio a Cloudflare en cada push.

**Catálogo.** Los exámenes viven en JSON con los campos que entrega el
laboratorio: código, nombre, especialidad, utilidad, condiciones clínicas, tiempo
de entrega, tipo de muestra y técnica. Dos catálogos separados: público y de
laboratorios asociados.

**Reglas derivadas, no etiquetadas a mano.** El ayuno se interpreta del texto de
las condiciones clínicas, y la sección de preparación que corresponde a cada
examen se deduce del tipo de muestra. Con 400 exámenes por llegar, ninguna regla
puede depender de etiquetar caso por caso.

**Sin formulario de contacto.** La página anterior tenía uno; el sitio actual no.
Pendiente de decidir si se repone.

**Degradación progresiva.** Buscador, calculadora de ayuno y navegación funcionan
sin JavaScript; las animaciones están condicionadas a que el visitante no tenga
el movimiento reducido desactivado en su sistema.

## Brand Commitments

**Todo lo aprobado es intocable.** El diseño salió de un maquetado que el cliente
aprobó, y el marco completo queda fijo: colores, tipografías, logo y estructura.
El trabajo futuro refina dentro de ese marco; no lo reemplaza.

- Nombre: ExamLab · razón social ExamLab S.A.S.
- Paleta: `#005A8C` · `#00A3C4` · `#6D6E71` · `#E1251B`
- Tipografías: Chakra Petch (títulos) y Montserrat (cuerpo)
- Logo: emblema circular sobre fondo oscuro cuadrado, en PNG. **Pendiente** el
  SVG con fondo transparente
- Claim: «Laboratorio clínico de innovación y desarrollo»
- Dominio: `examlabsas.com` · Teléfono: 096 382 0177 ·
  Correos: `laboratorio@` (pacientes, médicos y laboratorios asociados),
  `administracion@` (legal y datos personales), `facturacion@`

## Evidence on Hand

**Real y verificado:**

- Manual de preparación para pacientes, ocho tipos de muestra, entregado por el
  laboratorio. Las indicaciones médicas están textuales; solo se corrigió
  ortografía
- Teléfono, correo, dirección con parroquia y código postal, y horarios de
  atención
- Fotografías: `public/images/Fotolaboratorio.png`, `Fotoequipo.png`, `logo.png`
- `public/images/preparacion-heces.png` — la entregó el laboratorio, pero es una
  foto comercial de producto. **Provisional**, conviene reemplazarla por una
  ilustración propia
- Códigos QR generados en el proyecto, verificados por decodificación

**Ausencias que el trabajo futuro no debe inventar:**

- Tiempo de entrega y tipo de muestra de la mayoría de los 559 exámenes (solo
  64 tienen tiempo real), y los códigos definitivos
- Revisión del bioquímico de las utilidades y horas de ayuno escritas con
  criterio estándar
- URL del portal de resultados para pacientes en Saluto, si es distinta del
  ERP (hoy todos entran por `erp.salutoapps.com`)
- Identificador de Google Business Profile para las reseñas
- Volúmenes, estadísticas y cifras de actividad del laboratorio

## Product Principles

1. **Cada duda resuelta es una llamada que no entra.** El contenido se mide por
   si evita una consulta telefónica, no por si se ve completo.
2. **Dos públicos, ninguno relegado.** Paciente y médico llegan buscando cosas
   distintas del mismo examen; ambos caminos deben ser cortos.
3. **Nada inventado.** Antes que un dato plausible, un vacío declarado. Aplica a
   nombres de convenios, cifras, códigos y direcciones.
4. **Las reglas se deducen de los datos del laboratorio.** Con 400 exámenes por
   llegar, cualquier lógica que exija mantenimiento manual está mal diseñada.
5. **El marco visual aprobado es el terreno, no un borrador.** Se refina dentro
   de él.

## Accessibility & Inclusion

El público incluye **adultos mayores leyendo instrucciones médicas en un celular,
con datos móviles**. Eso fija el suelo: contraste real, tamaños de toque
generosos, texto que no dependa del color para significar, y peso de página bajo.

La página de preparación se consulta a menudo **de pie en el mostrador o en casa
a primera hora**, con una mano y con prisa. Su lectura no puede exigir precisión
ni calma.

Quien tiene las animaciones desactivadas en su sistema recibe el contenido
completo sin movimiento; quien no tiene JavaScript conserva buscador, navegación
y todas las instrucciones.
