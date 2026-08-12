# Despliegue y dominio · ExamLab

Documento de trabajo. Todo lo necesario para publicar el sitio, conectar el
dominio y traspasar la administración al laboratorio.

---

## 1. Datos del dominio

| | |
|---|---|
| Dominio | `examlabsas.com` |
| Registrador | Netlife — renovación a su cargo |
| Registrado | 11 feb 2026 · vence 11 feb 2027 |
| Panel | `admin.tuconstructorweb.com` (CW = Constructor Web) |
| Nameservers | `matteo.ns.cloudflare.com` · `virginia.ns.cloudflare.com` |

La zona DNS vive en una cuenta de Cloudflare **de Netlife**, no nuestra.

### Zona DNS completa

Verificado por consulta DNS pública el 11 de agosto de 2026. No existen
registros DKIM (probados 8 selectores) ni `_dmarc`.

| Tipo | Nombre | Contenido | Proxy | Prio |
|---|---|---|---|---|
| A | examlabsas.com | `18.159.234.214` | Proxied | — |
| CNAME | www | `examlabsas.com` | Proxied | — |
| MX | examlabsas.com | `mail.korreoweb.com` | DNS only | 10 |
| TXT | examlabsas.com | `v=spf1 a mx ip4:52.58.173.206 ~all` | DNS only | — |
| TXT | examlabsas.com | `google-site-verification=nNWnRd-8feHrOk7gexEHTKwy04u5Q8ToAC3xik4KIIo` | DNS only | — |

> **El registro A es el único que se cambia.** El MX y los dos TXT sostienen el
> correo del laboratorio y la verificación de Google: no se tocan nunca.

### Correo

Cinco buzones de 1 GB, administrados por Netlife en korreoweb. Se crean y
eliminan desde CW → Mail → Add user.

```
administracion@examlabsas.com
examlab.ficoa@examlabsas.com
examlab.castillo@examlabsas.com
examlab.cevallos@examlabsas.com
examlab.pelileo@examlabsas.com
```

Configuración para clientes de correo:

```
Entrante   mail.korreoweb.com   IMAP 143 TLS  (o 993 SSL)
                                POP3 110 TLS  (o 995 SSL)
Saliente   mail.korreoweb.com   SMTP 587 TLS
```

---

## 2. Publicar el sitio

```bash
npm run build
```

Genera `dist/`. El despliegue se hace por repositorio: cada `git push` a `main`
compila y publica solo.

Configuración del proyecto en Cloudflare:

| Campo | Valor |
|---|---|
| Project name | `examlabsas` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| `NODE_VERSION` (variable) | `22.12.0` |

`examlab` no sirve como nombre: ese subdominio pertenece a un tercero.

---

## 3. Conectar el dominio

> **La zona DNS tiene que estar en la MISMA cuenta de Cloudflare que el
> proyecto.** Los Workers solo aceptan dominios propios de su cuenta, así que
> el cambio de nameservers no es opcional. Por eso conviene hacerlo
> directamente en la cuenta del laboratorio y no en una personal: mover una
> zona entre cuentas obliga a repetir todo el procedimiento.

> Un dominio **no puede estar en dos cuentas a la vez**. Si quedó agregado en
> otra cuenta, quitarlo primero: *Overview → Advanced Actions → Remove Site*.
> Mientras no se hayan apuntado los nameservers, borrarlo no tiene efecto.

### 3.1 Agregar el dominio

*Domains → Overview → Add domain → **Connect a domain*** → `examlabsas.com` →
plan **Free**.

En la pantalla previa, dejar **Search: Allow** — son los rastreadores de Google
y bloquearlos tumbaría el SEO local. Apagar *«Block training in robots.txt»*:
el sitio ya sirve su propio `robots.txt` desde el repositorio y no conviene que
dos sitios distintos editen el mismo archivo.

### 3.2 Revisar lo que importó el escaneo

**Comprobado en un ensayo del 11 de agosto de 2026:**

✅ **Los tres registros de correo se importan bien** — MX, SPF y la
verificación de Google. Era la preocupación principal y está resuelta.

❌ **Los registros A y AAAA se importan mal.** El escaneo consulta el DNS
público, y como el dominio ya está tras el proxy de Cloudflare, lo que
encuentra son **las IP del propio Cloudflare**, no las del servidor real:

```
A     examlabsas.com   104.21.21.169     ← Cloudflare, no el origen
A     examlabsas.com   172.67.199.163    ← Cloudflare, no el origen
A     www              104.21.21.169
A     www              172.67.199.163
AAAA  (cuatro más, 2606:4700:303…)
```

Activar así deja el dominio apuntándose a sí mismo (error 1000 de Cloudflare).
Además, el `CNAME www` original se pierde: el escaneo lo ve ya resuelto a IP.

**Qué hacer:** borrar los ocho registros A y AAAA, y dejar solo un registro A
del dominio raíz apuntando al origen real `18.159.234.214`. Así el sitio
antiguo sigue en pie durante el cambio de nameservers y no hay ventana de
caída. En el paso 3.5 se reemplaza por el sitio nuevo.

### 3.3 Cambiar los nameservers

Anotar el par que asigne Cloudflare —serán distintos de `matteo` y `virginia`,
cada cuenta tiene los suyos— y ponerlos en CW → Domains → Manage → **Update
nameservers**.

**Este es el punto de cambio real.** Todo lo anterior es preparación y no
afecta a nada.

### 3.4 Esperar

Cloudflare marca el dominio como **Active**. Normalmente entre 10 minutos y 2
horas; el plazo formal es de hasta 24.

### 3.5 Conectar el sitio

Worker `examlabsas` → **Domains & Routes → Add → Custom domain** →
`examlabsas.com`. Repetir con `www.examlabsas.com`. Cloudflare ajusta el
registro y emite el certificado.

### 3.6 Verificar

1. `https://examlabsas.com` y `https://www.examlabsas.com` cargan con candado
2. `https://examlabsas.com/preparacion` abre el manual
3. **Enviar un correo de prueba a `administracion@examlabsas.com` y confirmar
   que llega.** Este paso no se omite.

### Marcha atrás

Poner en CW los nameservers originales:

```
matteo.ns.cloudflare.com
virginia.ns.cloudflare.com
```

Todo vuelve al estado actual, correo incluido.

---

## 4. Traspaso a la cuenta del laboratorio

El proyecto del sitio se mueve en unos 10 minutos: se crea en la otra cuenta,
se conecta el mismo repositorio y se traslada el dominio propio. La zona DNS es
lo caro de mover, así que **debe crearse ya en la cuenta definitiva**.

1. Crear el buzón `sistemas@examlabsas.com` en CW → Mail → Add user
2. Abrir la cuenta de Cloudflare con ese correo
3. Conectar el repositorio y comprobar que responde en su dirección de pruebas
4. Quitar el dominio propio del proyecto viejo y agregarlo al nuevo
5. Verificar el sitio y **repetir la prueba de correo**
6. Recién entonces, borrar el proyecto viejo

El paso 4 implica unos minutos de caída: dos proyectos no pueden reclamar el
mismo dominio a la vez. Hacerlo fuera del horario de atención.

---

## 5. Códigos QR

Generados por `scripts/generar-qr.mjs`, sin depender de ningún servicio externo
que pudiera desaparecer. Nivel de corrección H: se lee con hasta un 30 % del
código dañado, que es lo adecuado para algo que se pega en frascos.

```bash
npm run qr                                                          # definitivo
npm run qr https://examlabsas.juanp155441.workers.dev/preparacion   # pruebas
```

| Archivo | Destino | Uso |
|---|---|---|
| `public/descargas/qr-preparacion.*` | `examlabsas.com/preparacion` | **Imprenta** |
| `public/descargas/qr-preparacion-pruebas.*` | dirección de despliegue actual | Revisión |

Cualquier dirección distinta a la definitiva genera archivos marcados como
pruebas, para que un QR provisional no acabe impreso por confusión.

> **No enviar a imprenta hasta haber completado el paso 3.6.** Un QR impreso no
> se corrige.

Pendiente de decidir: versión con el logo al centro para afiches (el nivel H lo
permite), margen de 4 módulos en vez de 2 para impresión, y el hábito de
imprimir la dirección en texto debajo del código.

---

## 6. Pendientes

**Antes de publicar**

- [x] ~~Borrar la página `/prueba-framer`~~ — hecho
- [ ] `REPETIR = false` en `BaseLayout.astro` y en `Cifras.astro`
- [ ] Valorar quitar la integración de React de `astro.config.mjs`: sin la
      página de pruebas ya no hay ningún componente que la use, y sigue
      emitiendo un archivo de 187 KB que ninguna página carga
- [ ] Validar los códigos LOINC de `examenes-laboratorios.json`
- [ ] Revisión legal de `/privacidad`, `/terminos` y `/cookies`
- [ ] Respaldo del código fuera del equipo de desarrollo

**Del laboratorio**

- [ ] Cartera completa de exámenes y códigos definitivos
- [ ] Sedes de Pelileo, Castillo y Cevallos: dirección, horario, teléfono
- [ ] Confirmar el WhatsApp oficial (0963820177 vs 0983360974)
- [ ] Imagen de la recolección de heces → `public/images/preparacion-heces.jpg`
- [ ] Manual de Servicios en PDF → `public/descargas/`
- [ ] Logo definitivo y fotografías
- [ ] URLs reales de Avalab y activar `avalabDisponible`
- [ ] Nombres reales de convenios y seguros
- [ ] Acceso a Google Search Console (el dominio ya está verificado)

**Mejoras sugeridas a Netlife**

- [ ] Habilitar **DKIM** — hoy no existe, y sin él los correos del laboratorio
      tienen más probabilidad de caer en spam
- [ ] Consultar el límite de buzones del plan y el costo de cuentas adicionales
