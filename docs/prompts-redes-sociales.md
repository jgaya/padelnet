# Redes sociales: plan de integracion paso a paso

El objetivo, dicho como lo pediste:

> El admin carga una imagen, un titulo y un texto, asociados a un **evento**.
> Cuando los torneos de ese evento se hacen publicos, se dispara la publicacion
> en las redes del complejo configuradas previamente.

Cada paso trae al final un bloque **PROMPT** autocontenido para pegar en una
sesion nueva. Estan en orden de dependencia.

Tercer plan de la serie, despues de `docs/prompts-mercadopago.md` y
`docs/prompts-whatsapp.md`. Se cruza con el de WhatsApp en un punto que vale
plata y tiempo: **es la misma app de Meta**. Esta marcado abajo.

---

## 0. Lo que hay hoy, y los cinco agujeros

### Lo que ya esta y se reusa entero

| Pieza | Donde | Para que sirve aca |
|---|---|---|
| Momento exacto de publicacion | `actions/torneos.ts:769`, `:860`, `:939` | Son los tres lugares donde un torneo pasa a publico |
| `safe()` | `actions/notificaciones-eventos.ts:159` | Un aviso que falla nunca voltea la operacion |
| Feature flags por complejo | `lib/complejo-features.ts` | El molde exacto para sumar `REDES_SOCIALES` |
| Cola + cron con `CRON_SECRET` | `app/api/cron/imagenes/route.ts` | El molde exacto de reintentos |
| Auditoria por modelo | `lib/auditoria-config.ts` | Todo modelo nuevo hay que clasificarlo o el check falla |
| `enTransaccion()` | `lib/prisma.ts` | Obligatorio; `prisma.$transaction` suelto rompe el check |
| `conOrigen("cron", fn)` | `lib/auditoria-contexto.ts` | Para que el log diga quien escribio |
| Recorte en el cliente | `app/perfil/components/AvatarCropper.tsx` | El repo **no tiene sharp**: se recorta en canvas |
| `BASE_URL` | `lib/email.ts:35` | Ya existe la nocion de URL absoluta del sitio |

### Agujero 1: el disparo natural es por torneo, y eso es spam

`notifyTorneoPublicado()` se llama **una vez por torneo**. Un evento tipico
tiene una categoria por sexo y nivel: 4ta, 5ta, 6ta, damas A, damas B. Son
cinco o seis torneos que se publican casi juntos.

Si la publicacion cuelga del torneo, ese evento genera **seis posts identicos**
en Instagram, seis en Facebook y seis en X. Seis veces el costo, seis veces el
limite diario quemado, y un feed que parece hackeado.

La publicacion es **una por evento**, disparada por el primer torneo que se
hace publico. Los otros cinco encuentran que ya se mando y no hacen nada. Eso
no es un detalle de implementacion: es la decision que ordena todo el resto.

### Agujero 2: no hay ninguna imagen publica en la app

Esto es lo contrario de todo lo que hace hoy el repo, y hay que decirlo fuerte.

`lib/imagenes-perfil-rutas.ts` pone las subidas en `var/uploads`,
**deliberadamente fuera de `public/`**, y la unica forma de leerlas es
`/api/imagenes/perfil/<id>/<variante>`, que a quien no corresponde le responde
**404 y no 403**, para no confirmar siquiera que el archivo existe.

Instagram no puede consumir nada de eso. **Meta descarga la imagen el mismo:
le pasas una URL y su servidor le hace un GET.** No hay upload de bytes en la
API de publicacion de Instagram. La imagen tiene que estar en una URL publica,
sin cookie, sin sesion, alcanzable desde internet.

Consecuencias directas:

- Hace falta un camino de imagenes **publico a proposito**, separado del de
  perfil, y que no comparta ni una funcion de autorizacion con el.
- `BASE_URL` deja de ser cosmetico: si apunta a `localhost`, Instagram
  **no puede publicar**. Esta parte no se prueba desde tu maquina.

### Agujero 3: `Evento.posterUrl` no sirve para esto

`prisma/schema.prisma:407` ya tiene `posterUrl String?`, y el form
(`EventoForm.tsx:152`) lo pide como un campo de texto con
`z.string().url()` (`types/forms.ts:243`).

Es una URL que el admin **pega a mano**. Nadie valida que sea una imagen, ni
que siga viva, ni que tenga la relacion de aspecto que Instagram acepta, ni que
el servidor de destino no bloquee al crawler de Meta.

No se toca ni se borra: sigue siendo el poster del evento en la web. Pero la
imagen del post es **otra cosa**, subida y recortada, con medidas conocidas.
Mismo criterio que `telefono` / `telefonoE164` en el plan de WhatsApp.

### Agujero 4: no existe una URL publica del evento

Hay `/complejos/[slug]/eventos` (la lista) y `/torneos/[id]` (un torneo).
**No hay pagina publica de un evento.**

Y el post es por evento. Si el link apunta a un torneo, apunta a una de seis
categorias arbitraria; si apunta a la lista, el que llega tiene que buscar.

Hay que crear `/complejos/[slug]/eventos/[eventoId]`. Es trabajo que no parece
de redes sociales y sin embargo lo es: **el link del post es el producto**. Un
post que lleva a una lista generica no convierte.

Bonus: esa pagina es tambien la que va a levantar el preview con imagen en
WhatsApp y en los mismos posts, via Open Graph.

### Agujero 5: no hay lugar donde guardar un secreto de tercero

Igual que en el plan de Mercado Pago. Los tokens de las cuentas sociales de
cada club son credenciales que publican en nombre de otro. `lib/crypto-secretos.ts`
sale del **paso 1 del plan de Mercado Pago**; si ese plan no se hizo, este paso
lo crea igual y el otro lo reusa.

---

## Lo que cada red obliga y no es negociable

Datos al momento de escribir esto (agosto 2026). **Verificalos antes de
empezar**: las tres plataformas cambiaron condiciones en los ultimos 18 meses y
X cambio el modelo de precios entero.

| Red | Auth | Revision de app | Imagen | Texto | Limite | Costo |
|---|---|---|---|---|---|---|
| **Facebook** Page | OAuth Meta, Page Access Token | Si | Opcional | Sin limite practico | Amplio | Gratis |
| **Instagram** Business | OAuth Meta | Si | **Obligatoria, por URL publica** | 2200 | 100 posts/24h | Gratis |
| **Threads** | OAuth Meta | Si | Opcional | 500 | 250 posts/24h | Gratis |
| **X** | OAuth 2.0 + PKCE | No | Opcional, se suben bytes | 280 | Segun consumo | **Pago por uso** |
| **Bluesky** | App password | **No** | Opcional, se suben bytes | 300 | 5000 puntos/h | Gratis |

### Instagram: el flujo es en dos actos y hay que esperar

No existe "publicar una foto" en una sola llamada:

1. `POST /{ig-user-id}/media` con `image_url`, `caption` y `alt_text` → devuelve
   un **container id**. Ahi Meta se pone a bajar la imagen.
2. `GET /{container-id}?fields=status_code` → `IN_PROGRESS`, `FINISHED`,
   `ERROR` o `EXPIRED`. Se consulta **una vez por minuto, no mas**, hasta 5
   minutos.
3. `POST /{ig-user-id}/media_publish` con `creation_id` → recien ahi existe el
   post.

Los containers **expiran a las 24 horas**. Un container `FINISHED` que no se
publica se pierde: hay que rehacer el paso 1.

Esto tiene una consecuencia de arquitectura: **la publicacion en Instagram no
entra en el request del admin.** Son minutos de espera. Va a la cola, si o si.

Dos caminos de permisos, y hay que elegir uno:

- **Instagram API con Facebook Login**: la cuenta de IG tiene que estar
  vinculada a una Pagina de Facebook. Es el camino tradicional y el que ademas
  habilita metricas y anuncios.
- **Instagram API con Instagram Login**: permiso
  `instagram_business_content_publish`, no necesita Pagina. Mas simple para el
  club que no tiene Facebook, pero pierde la parte de ads.

**Recomendado: Facebook Login**, porque el mismo token sirve para publicar en la
Pagina, que es la otra red que pediste. Un solo consentimiento del club, dos
redes.

### El App Review es obligatorio y es por lo que hace la app, no por su tamaño

Meta exige revision cuando la app pide permisos para actuar sobre cuentas **de
terceros**. Nuestro caso es exactamente ese: cada club conecta su cuenta.

No alcanza con "somos chicos". Los permisos en juego —`pages_manage_posts`,
`pages_read_engagement`, `instagram_content_publish`, `business_management`—
piden screencast del flujo completo, credenciales de prueba, y politica de
privacidad publicada. Semanas, no dias.

**Aca esta el cruce con el plan de WhatsApp.** WhatsApp Cloud API, Facebook
Pages, Instagram y Threads viven todos en la **misma app de Meta** y comparten
la **misma verificacion de negocio**. Si el plan de WhatsApp ya se hizo, el paso
0 de este ya esta medio pago. Si no se hizo ninguno, **hacer la verificacion de
negocio una sola vez, con los dos productos en mente**.

### X: desde 2026 se paga por post, y los links salen 13 veces mas caros

X reemplazo los tiers por consumo. El numero que importa:

- **USD 0.015 por post.**
- **USD 0.20 por post si el post contiene un link.**

No es un error de tipeo: son mas de trece veces. Y nuestro post es
justamente "hay torneo nuevo, anotate **aca**".

La salida conocida es poner el link en una **respuesta al propio post**: el post
principal sale al precio barato y el hilo lleva la URL. Cuesta 0.015 + 0.20 de
todas formas si la respuesta lleva link, asi que hay que decidir con el numero
adelante:

| Estrategia | Costo por evento | Que pierde |
|---|---|---|
| Post con link | USD 0.20 | Nada |
| Post sin link, "link en bio" | USD 0.015 | Clicks |
| Post + reply con link | USD 0.215 | Nada, y sale mas caro |

Con 20 eventos al mes son USD 4 o USD 0.30. Poca plata en absoluto, pero
**es la unica red del plan que factura por uso**, y por eso es la unica que
necesita un tope configurable. Un bug que reintenta en loop en Instagram es
molesto; en X es una factura.

Ademas: **no hay tier gratis para desarrolladores nuevos** y los planes Basic y
Pro estan cerrados a altas nuevas. Hay que entrar por el esquema de consumo.

### Bluesky: la unica sin friccion

Sin revision de app, sin verificacion de negocio, sin costo. El club genera una
**app password** desde su configuracion, la pega, y funciona.

`com.atproto.server.createSession` → `uploadBlob` → `createRecord`. Es la que
conviene implementar **primera**, porque permite tener el motor entero andando
end to end mientras Meta revisa.

### Threads: barato de sumar si ya hiciste Meta

Mismo pipeline de dos actos que Instagram, mismo consentimiento, 500 caracteres.
Una vez resuelto Instagram, Threads son un par de horas. Vale la pena.

### WhatsApp Estados y Canales: no existen por API

Lo aclaro porque el plan de WhatsApp esta al lado y la pregunta aparece sola.
**No se puede publicar un Estado ni postear en un Canal de WhatsApp desde la
Cloud API.** No hay endpoint. Lo unico automatizable ahi son mensajes uno a uno,
que es lo que cubre el otro documento.

---

## Decisiones de arquitectura

**1. Una publicacion por evento, no por torneo.** Un `PublicacionSocial` cuelga
de `Evento`, con un `@@unique([eventoId, motivo])`. El primero de los seis
torneos que se publica la dispara; los otros cinco chocan contra el unique y
siguen de largo. La idempotencia esta en la base, no en un `if`.

**2. El disparo es asincronico y no puede voltear nada.** Publicar un torneo es
la operacion de negocio. Que Instagram este caido no puede impedirla. Todo el
disparador va envuelto en el `safe()` que ya existe, y lo unico que hace en
linea es **encolar**.

**3. La imagen es publica a proposito, y por una ruta aparte.** No se toca
`lib/imagenes-perfil*.ts` ni por conveniencia. Archivo en
`var/publico/social/`, servido por `/api/social/imagen/[archivo]` con
`Cache-Control: public, immutable`. Sin sesion, sin autorizacion, y comentado
arriba del handler por que esta bien que asi sea.

**4. Recorte en el cliente, como el avatar.** El repo no tiene `sharp` ni nada
que procese imagenes en el servidor, y no se agrega por esto. Se recorta a
1080x1080 en canvas reusando el patron de `AvatarCropper`, y se manda como data
URL, igual que `app/api/perfil/avatar/route.ts`. Cuadrado entra en las cinco
redes sin recorte de nadie.

**5. Preview obligatorio antes de disparar.** Esto sale a la cara publica del
club. El admin ve como queda en cada red, con el texto ya truncado, **antes** de
que exista nada. Y por defecto la publicacion queda en `BORRADOR`: si no la
armaron, la publicacion del torneo no postea nada. El silencio es el default.

**6. Una entrega por red, con estado propio.** `PublicacionEntrega` por cada
cuenta. Instagram puede fallar mientras Bluesky salio: la publicacion queda
`PARCIAL` y se reintenta **solo** la que fallo. Nunca se republica una que ya
salio; ese es el bug que llena de duplicados el feed de un cliente.

**7. Truncado por red, escrito una vez.** 280 / 300 / 500 / 2200. Una funcion
pura, testeable, que corta en palabra y no en medio de una tilde, y que reserva
el largo del link cuando el link va incluido.

**8. Instagram sin imagen no publica.** Las otras cuatro aceptan texto solo. Si
no hay imagen, la entrega de Instagram nace `OMITIDA` con motivo, no `FALLIDA`.
Un fallo es algo que hay que arreglar; esto es una decision del admin.

**9. Los tokens cifrados, siempre.** `lib/crypto-secretos.ts`, compartido con el
plan de Mercado Pago. Nunca en texto plano, nunca en un log, nunca en la
respuesta de una action.

**10. El costo de X es configurable y tiene tope.** Un contador mensual por
complejo y un limite; pasado el limite las entregas de X nacen `OMITIDA`.

---

## Variables de entorno nuevas

```bash
# Base publica. Ya la usa lib/email.ts, pero aca pasa a ser critica:
# Instagram descarga la imagen desde esta URL. Con localhost no publica.
BASE_URL="https://padelnet.ar"

# Cifrado de los tokens de las cuentas de los clubes.
# Compartida con el plan de Mercado Pago: si ya existe, NO generar otra.
# openssl rand -base64 32
SECRETOS_CLAVE=""

# --- Meta (Facebook Pages + Instagram + Threads) ---
# La MISMA app que WhatsApp Cloud API si ese plan ya se hizo.
META_APP_ID=""
META_APP_SECRET=""
META_API_VERSION="v26.0"
# Redirect del OAuth de vinculacion. Tiene que estar declarada igual en el panel.
META_OAUTH_REDIRECT="https://padelnet.ar/admin/complejos/redes/callback/meta"

# --- X ---
X_CLIENT_ID=""
X_CLIENT_SECRET=""
X_OAUTH_REDIRECT="https://padelnet.ar/admin/complejos/redes/callback/x"
# Tope de posts por mes en toda la plataforma. X factura por uso.
X_TOPE_POSTS_MES="200"

# --- Bluesky ---
# No hay app global: cada club pega su propia app password. Nada aca.

# Donde viven las imagenes publicas de los posts.
# Igual que UPLOADS_DIR, fuera de public/ y servido por una route.
UPLOADS_SOCIAL_DIR="/var/lib/padelnet/social"
```

---

## Paso 0 — Cuentas, apps y verificaciones

**Objetivo:** tener credenciales. **No es codigo y es lo que mas tarda.**
Arrancalo hoy y hace los pasos 1 a 5 mientras Meta revisa.

**Terminado cuando:** tenes `META_APP_ID`, `META_APP_SECRET`, `X_CLIENT_ID`,
`X_CLIENT_SECRET`, y una cuenta de Bluesky de prueba con su app password.

### Meta (Facebook + Instagram + Threads)

1. **Business Manager** en `business.facebook.com`, con el negocio real del
   sitio. **Verificacion de negocio**: documentacion de la empresa, factura de
   servicios, dominio verificado. Es lo que mas demora.
2. App en `developers.facebook.com`, tipo **Business**.
3. Agregar los productos: **Facebook Login for Business**, **Instagram**, y
   **Threads** si lo vas a usar. Si vas a hacer el plan de WhatsApp, agrega
   tambien **WhatsApp** ahora: misma app, misma verificacion.
4. Declarar la redirect URI **exacta** de `META_OAUTH_REDIRECT`. Meta compara
   caracter por caracter, incluida la barra final.
5. **App Review** para: `pages_show_list`, `pages_manage_posts`,
   `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`,
   `business_management`. Piden screencast del flujo completo de vinculacion y
   publicacion, usuario de prueba, y politica de privacidad **publicada en el
   dominio**. Si el sitio no tiene pagina de privacidad, eso es lo primero.
6. Mientras revisan: la app en modo desarrollo publica en cuentas donde vos
   tengas rol. Alcanza para todo el desarrollo.

### X

1. Portal de desarrolladores, cuenta de la plataforma (no la de un club).
2. Alta en el esquema de **consumo**. Cargar metodo de pago. Revisar el precio
   por post vigente y **el recargo por link**, que es el que decide el diseño
   del texto.
3. App con **OAuth 2.0**, tipo confidential client, redirect
   `X_OAUTH_REDIRECT`, scopes `tweet.read tweet.write users.read
   offline.access` y `media.write` si vas a subir imagenes.
   `offline.access` es obligatorio: sin el no hay refresh token y la
   vinculacion del club se muere sola en horas.
4. Configurar una **alerta de gasto**.

### Bluesky

1. Cuenta de prueba en `bsky.app`.
2. Configuracion → Privacidad y seguridad → **App passwords** → generar una.
3. No hay nada que registrar. Ya podes publicar.

### Lo que hay que escribir para la revision

- Politica de privacidad publicada, que mencione que se publican contenidos en
  las cuentas conectadas.
- Terminos de uso.
- Un texto de una linea para el admin del club, que va a ver en la pantalla de
  OAuth, explicando **que** vamos a publicar y **cuando**.

---

## Paso 1 — Pagina publica del evento y Open Graph

**Objetivo:** que exista una URL a la que llevar. Cierra el agujero 4.
**No toca ninguna red social**, se puede hacer en paralelo con el paso 0.

**Archivos:** `app/complejos/[slug]/eventos/[eventoId]/page.tsx` (nuevo),
`actions/complejos-public.ts`, `app/complejos/[slug]/eventos/page.tsx`.

**Terminado cuando:** `/complejos/<slug>/eventos/<id>` muestra el evento con sus
torneos publicados, y el HTML trae las etiquetas `og:` correctas.

````
PROMPT PASO 1

Contexto: repo padelnet, Next 16 App Router, Prisma 7 con adapter mariadb,
TypeScript estricto, Tailwind 4 con tokens de tema. Estoy siguiendo
docs/prompts-redes-sociales.md.

Problema que resuelve este paso: hoy hay /complejos/[slug]/eventos (lista) y
/torneos/[id] (un torneo), pero NO hay pagina publica de un evento. La
publicacion en redes es una por evento, asi que no tiene a donde linkear.

Este paso NO toca redes sociales. Es solo una pagina publica nueva.

1. actions/complejos-public.ts: agregar getPublicEvento(slug, eventoId).
   - Reusar requireComplejoPublico(slug, ...) como hacen las paginas hermanas.
   - Devolver el evento solo si esta visible y no borrado, con los MISMOS
     criterios que ya usa listPublicComplejoEventos. Miralos y replicalos, no
     inventes criterios nuevos: si un evento no aparece en la lista publica
     tampoco puede aparecer por URL directa.
   - Incluir los torneos PUBLICADOS del evento con lo que se necesita para
     mostrarlos (nombre, sexo, categoria, fechas, estado de inscripcion).
   - Si no corresponde mostrarlo: notFound(), no un 403.

2. app/complejos/[slug]/eventos/[eventoId]/page.tsx:
   - Server component, mismo layout y componentes que las paginas hermanas
     (SectionCard, EmptyState, Badge, los helpers de format).
   - Cabecera con nombre, fechas, descripcion y el posterUrl si hay.
   - Lista de torneos, cada uno con link a /torneos/<id> y a
     /torneos/<id>/registrarse si esta abierto.
   - Breadcrumbs con el patron del repo. Corre npm run check:breadcrumbs.

3. generateMetadata en esa pagina:
   - title y description del evento.
   - openGraph: title, description, url absoluta con BASE_URL, type "website",
     y images con el posterUrl si es absoluto.
   - twitter: card "summary_large_image".
   IMPORTANTE: esto es lo que va a levantar el preview cuando el link se pegue
   en WhatsApp y en los propios posts. Dejalo comentado asi.

4. app/complejos/[slug]/eventos/page.tsx: que cada tarjeta de la lista linkee a
   la pagina nueva.

Convenciones del repo: comentarios en castellano sin acentos que expliquen el
por que y no el que. Nada de any. Nada de clases de Bootstrap: Tailwind y
tokens del tema.

Al terminar: npx tsc --noEmit && npm run lint && npm run check:breadcrumbs
````

---

## Paso 2 — Cifrado de secretos y feature flag

**Objetivo:** los cimientos. Chico y sin dependencias.

**Archivos:** `lib/crypto-secretos.ts` (nuevo o ya existente),
`prisma/schema.prisma`, `lib/complejo-features.ts`, `.env`.

**Terminado cuando:** el toggle `REDES_SOCIALES` aparece en el panel del
superadmin y `npm run check:auditoria` pasa.

**Si ya hiciste el paso 1 del plan de Mercado Pago**, `lib/crypto-secretos.ts`
existe: no lo toques, salteate ese punto.

````
PROMPT PASO 2

Contexto: repo padelnet, Next 16 App Router, Prisma 7 con adapter mariadb,
TypeScript estricto. Estoy siguiendo docs/prompts-redes-sociales.md.

Este paso son los cimientos: cifrado de secretos y feature flag.

1. lib/crypto-secretos.ts (SI YA EXISTE, no lo toques y anda al punto 2):
   - AES-256-GCM con el crypto nativo de node. Sin dependencias nuevas.
   - export function cifrar(texto: string): string
     export function descifrar(cifrado: string): string
     Formato de salida: "v1:<iv-base64>:<tag-base64>:<datos-base64>". El
     prefijo de version es para poder rotar el algoritmo sin adivinar despues
     que es cada fila.
   - Clave de process.env.SECRETOS_CLAVE, 32 bytes en base64.
     Si falta, TIRAR al importar y no seguir con una clave vacia: un secreto
     "cifrado" con clave vacia es un secreto en texto plano que ademas nadie
     mira.
   - Comentar arriba: esto guarda credenciales de TERCEROS (cuentas de redes de
     los clubes). Nunca loguear el descifrado, nunca devolverlo desde una
     action al cliente.

2. prisma/schema.prisma: agregar REDES_SOCIALES al enum ComplejoFeatureKey.
   Migracion: "feature_redes_sociales"

3. lib/complejo-features.ts: agregar la entrada al catalogo COMPLEJO_FEATURES.
   key "REDES_SOCIALES", label "Redes sociales",
   description "Publicar automaticamente en las redes del club cuando se
   publican los torneos de un evento.", defaultEnabled: false.
   Mirar el comentario de arriba del archivo: dice los tres pasos que hay que
   hacer para sumar una feature. Hacelos los tres.

4. .env.example (o el que use el repo): documentar SECRETOS_CLAVE con el
   comando openssl para generarla y la advertencia de que rotarla deja
   ilegibles todos los tokens guardados.

Convenciones del repo: comentarios en castellano sin acentos que expliquen el
por que y no el que. Nada de any.

Al terminar: npx tsc --noEmit && npm run lint && npm run prisma:check
````

---

## Paso 3 — Schema: cuentas, publicaciones y entregas

**Objetivo:** el modelo de datos completo. **El paso que mas define el resto.**

**Archivos:** `prisma/schema.prisma`, `lib/auditoria-config.ts`.

**Terminado cuando:** la migracion corre y `npm run check:auditoria` pasa.

La forma importa mas que los campos. Son **tres** modelos y cada uno responde
una pregunta distinta:

| Modelo | Pregunta | Cardinalidad |
|---|---|---|
| `CuentaSocial` | A que cuentas puede postear este club | N por complejo |
| `PublicacionSocial` | Que se quiere decir, y de que evento | **1 por evento y motivo** |
| `PublicacionEntrega` | Como le fue en cada red | 1 por publicacion y cuenta |

El `@@unique([eventoId, motivo])` de `PublicacionSocial` **es** la idempotencia
del agujero 1. No es un indice de performance.

````
PROMPT PASO 3

Contexto: repo padelnet, Next 16 App Router, Prisma 7 con adapter mariadb,
TypeScript estricto. Estoy siguiendo docs/prompts-redes-sociales.md.
Los pasos 1 y 2 (pagina publica del evento, crypto-secretos, feature flag) ya
estan hechos.

Este paso es solo schema. No hay logica todavia.

1. prisma/schema.prisma, enums nuevos:

   enum RedSocial { FACEBOOK INSTAGRAM THREADS X BLUESKY }

   enum EstadoPublicacion {
     BORRADOR     // el admin la esta armando; NO se dispara
     PROGRAMADA   // lista, esperando que se publiquen los torneos
     ENVIANDO
     PUBLICADA    // todas las entregas salieron
     PARCIAL      // al menos una salio y al menos una fallo
     FALLIDA      // ninguna salio
     CANCELADA
   }

   enum EstadoEntrega {
     PENDIENTE ENVIANDO PUBLICADA FALLIDA
     OMITIDA   // decision, no error: p.ej. Instagram sin imagen
   }

2. model CuentaSocial:
     id, complejoId, red RedSocial
     cuentaExternaId String @db.VarChar(191)
       // page id, ig user id, x user id, o el did de bluesky
     nombreVisible String
     handle String?
     tokenCifrado    String  @db.Text
     refreshCifrado  String? @db.Text
     tokenExpiraAt   DateTime?
     scopes          String? @db.Text
     activa          Boolean @default(true)
     ultimoError     String? @db.Text
     ultimoErrorAt   DateTime?
     vinculadaPorId  Int?
     createdAt / updatedAt
     relaciones a Complejo (onDelete: Cascade) y User (onDelete: SetNull)
     @@unique([complejoId, red, cuentaExternaId])
     @@index([complejoId, activa])

   Comentar: los dos campos cifrados NUNCA se seleccionan en una action que
   devuelve datos al cliente. Que quede escrito ahi.

3. model PublicacionSocial:
     id, complejoId, eventoId
     motivo String @db.VarChar(32)   // "torneos_publicados" por ahora
     titulo String
     texto  String @db.Text
     enlace String? @db.VarChar(500)
     imagenArchivo String? @db.VarChar(191)  // nombre del archivo, no la URL
     imagenAlt     String? @db.VarChar(500)
     estado EstadoPublicacion @default(BORRADOR)
     creadaPorId Int?
     disparadaAt DateTime?
     createdAt / updatedAt
     @@unique([eventoId, motivo])
     @@index([estado])

   Comentar el unique con estas palabras: un evento tiene N torneos por
   categoria y los seis se publican casi juntos. Este unique es lo que hace
   que salga UN post y no seis. Es idempotencia en la base, no una
   optimizacion.

   imagenArchivo guarda el NOMBRE del archivo, no la URL: si cambia BASE_URL o
   la ruta que las sirve, las filas viejas siguen siendo validas.

4. model PublicacionEntrega:
     id, publicacionId, cuentaSocialId, red RedSocial
     estado EstadoEntrega @default(PENDIENTE)
     intentos Int @default(0)
     proximoIntentoAt DateTime?
     contenedorExternoId String?  // el container de instagram/threads
     postExternoId String?
     urlPublica String? @db.VarChar(500)
     error String? @db.Text
     enviadaAt DateTime?
     createdAt / updatedAt
     @@unique([publicacionId, cuentaSocialId])
     @@index([estado, proximoIntentoAt])

   Comentar el unique: sin el, un reintento mal hecho publica dos veces en el
   feed de un cliente. Es el bug mas caro de este subsistema porque no se
   puede deshacer.

   contenedorExternoId: instagram y threads publican en dos actos y el
   container expira a las 24h. Guardarlo permite retomar sin recrear.

5. lib/auditoria-config.ts: agregar los tres modelos.
   - CuentaSocial y PublicacionSocial van a MODELOS_AUDITADOS: los edita una
     persona y son la cara publica del club.
   - PublicacionEntrega va a MODELOS_EXCLUIDOS, con el comentario del por que:
     las escribe el cron en cada reintento y su historia ya esta en sus propios
     campos (intentos, error, enviadaAt).
   - Revisar CAMPOS_OCULTOS: tokenCifrado y refreshCifrado tienen que estar
     ahi. Ya estan cifrados, pero un log de auditoria no es lugar ni para el
     texto cifrado.

6. Migracion: "redes_sociales_modelo"

Convenciones del repo: comentarios en castellano sin acentos que expliquen el
por que y no el que.

Al terminar: npx tsc --noEmit && npm run lint && npm run prisma:check &&
npm run check:auditoria
````

---

## Paso 4 — La imagen publica

**Objetivo:** cerrar el agujero 2. Que exista una URL de imagen que el servidor
de Meta pueda descargar.

**Archivos:** `lib/imagenes-social.ts` (nuevo),
`app/api/social/imagen/[archivo]/route.ts` (nuevo),
`app/api/social/imagen/subir/route.ts` (nuevo), `.gitignore`.

**Terminado cuando:** subis una imagen desde el admin y `curl` la baja desde el
dominio publico **sin ninguna cookie**.

**Este es el paso que no se puede terminar de verificar en localhost.** El
codigo se prueba local; que Instagram efectivamente pueda bajarla, no.

````
PROMPT PASO 4

Contexto: repo padelnet, Next 16 App Router, Prisma 7 con adapter mariadb,
TypeScript estricto. Estoy siguiendo docs/prompts-redes-sociales.md.
Los pasos 1 a 3 estan hechos.

Problema que resuelve este paso: Instagram NO acepta que le subas bytes. Le
pasas una image_url y el servidor de Meta le hace un GET. La imagen tiene que
estar en una URL publica, sin sesion.

Eso es lo OPUESTO a como funciona todo lo demas en este repo: mira
lib/imagenes-perfil-rutas.ts, que pone las subidas en var/uploads fuera de
public/ a proposito, y app/api/imagenes/perfil/[imagenId]/[variante]/route.ts,
que responde 404 en vez de 403 para no confirmar que el archivo existe.

Por eso este camino es SEPARADO. No compartas ni una funcion de autorizacion
con el de perfil, ni "aproveches" nada de ahi. Un dia alguien va a tocar uno de
los dos y el otro no puede seguirlo.

1. lib/imagenes-social.ts (con "server-only"):
   - RAIZ = process.env.UPLOADS_SOCIAL_DIR ?? path.join(process.cwd(), "var",
     "publico", "social")
     Fuera de public/ igual que el otro, pero servido por una route que SI es
     publica. Explicar esa diferencia en un comentario arriba del archivo.
   - export function urlDeImagenSocial(archivo: string): string
     -> `${BASE_URL}/api/social/imagen/${archivo}` ABSOLUTA, con la misma
     normalizacion de BASE_URL que hace lib/email.ts:35.
     Si BASE_URL no esta seteada o apunta a localhost, TIRAR con un mensaje
     que diga "Instagram no puede descargar imagenes de localhost". Es mejor
     un error claro aca que un ERROR opaco de Meta tres pasos despues.
   - export async function guardarImagenSocial(complejoId, dataUrl):
     Promise<{ archivo: string; bytes: number }>
     * Reusar el parseo de data URL de lib/imagenes-perfil.ts si es reusable
       sin acoplar los dos modulos; si no, escribir uno propio y chico.
     * Aceptar SOLO image/jpeg e image/png.
     * Rechazar arriba de 8 MB (limite de Instagram).
     * Nombre del archivo: <complejoId>-<timestamp>-<uuid>.<ext>. Que el nombre
       no sea adivinable, aunque la ruta sea publica: no queremos que se pueda
       enumerar lo que otros clubes tienen sin publicar todavia.
   - export async function borrarImagenSocial(archivo: string)
     Validar que el nombre matchee un regex estricto ANTES de tocar el
     filesystem. Path traversal aca borra archivos del servidor.

2. app/api/social/imagen/[archivo]/route.ts:
   - runtime nodejs. GET publico, SIN getSession.
   - Comentario grande arriba explicando por que esta ruta no tiene auth y por
     que eso esta bien: son imagenes promocionales que el club quiere que se
     vean, y ademas el servidor de Meta tiene que poder bajarlas sin cookie.
   - Validar el nombre contra el mismo regex estricto. Cualquier cosa rara: 404.
   - Content-Type segun la extension.
   - Cache-Control: public, max-age=31536000, immutable. El nombre lleva uuid,
     asi que nunca cambia el contenido de una misma URL.
   - 404 si no existe.

3. app/api/social/imagen/subir/route.ts:
   - POST, CON getSession, y verificando que la persona sea admin DEL COMPLEJO
     que dice. Usar los helpers que ya existen (lib/authz.ts,
     lib/complejo-access.ts) y no escribir la comprobacion a mano.
   - Verificar que el complejo tenga la feature REDES_SOCIALES.
   - Body: { complejoId, imageDataUrl }. Mismo estilo que
     app/api/perfil/avatar/route.ts.
   - Devuelve { archivo, url }.

4. .gitignore: agregar /var/publico, con el comentario de por que.

Convenciones del repo: comentarios en castellano sin acentos que expliquen el
por que y no el que. Nada de any. enTransaccion de lib/prisma.ts si escribis en
la base, nunca prisma.$transaction suelto.

Al terminar: npx tsc --noEmit && npm run lint
Y decime que comando exacto tengo que correr contra el dominio publico para
confirmar que Meta va a poder bajar la imagen.
````

---

## Paso 5 — El compositor y el preview

**Objetivo:** que el admin pueda cargar imagen, titulo y texto para un evento, y
ver como queda en cada red antes de que exista nada.

**Archivos:** `actions/publicaciones-sociales.ts` (nuevo),
`lib/redes-limites.ts` (nuevo),
`app/admin/complejos/[id]/eventos/[eventoId]/redes/page.tsx` (nuevo),
`app/admin/complejos/[id]/eventos/[eventoId]/redes/components/*` (nuevo),
`types/forms.ts`.

**Terminado cuando:** guardas un borrador para un evento y lo ves renderizado
como se veria en Instagram, X y Bluesky, con el texto ya truncado.

````
PROMPT PASO 5

Contexto: repo padelnet, Next 16 App Router, Prisma 7, TypeScript estricto,
Tailwind 4 con tokens de tema, react-hook-form + zod.
Estoy siguiendo docs/prompts-redes-sociales.md. Los pasos 1 a 4 estan hechos:
existen los modelos CuentaSocial / PublicacionSocial / PublicacionEntrega, la
feature REDES_SOCIALES, y el camino de imagen publica.

Este paso es la pantalla donde el admin arma el post. Todavia NO publica nada
en ninguna red.

1. lib/redes-limites.ts (SIN "use server" ni "server-only": lo importan
   componentes client para el preview en vivo):
   - export const LIMITES: Record<RedSocial, { texto: number; alt: number;
     requiereImagen: boolean; aceptaLink: boolean }>
     X 280, BLUESKY 300, THREADS 500, INSTAGRAM 2200, FACEBOOK 63206.
     INSTAGRAM requiereImagen: true. El resto false.
   - export function componerTexto(red, { titulo, texto, enlace }): string
     Arma el texto final y lo TRUNCA al limite de la red.
     * Cortar en palabra, nunca en medio de una.
     * Terminar en "..." y que los puntos cuenten dentro del limite.
     * Si el link va incluido, reservarle el largo ANTES de truncar, para no
       quedarte con una URL cortada que no lleva a ningun lado.
     * En INSTAGRAM el link no es clickeable en el caption: no lo incluyas, y
       dejalo comentado.
   - Funcion pura, sin fetch, sin prisma. Testeable a mano.

2. types/forms.ts: schema zod publicacionSocialSchema.
   titulo min 3 max 120, texto min 10 max 2000, imagenArchivo opcional,
   imagenAlt opcional max 500, enlace url opcional.

3. actions/publicaciones-sociales.ts ("use server"):
   - guardarPublicacion(complejoId, eventoId, data)
     * Verificar admin del complejo y feature REDES_SOCIALES con los helpers
       que ya existen.
     * upsert por [eventoId, motivo:"torneos_publicados"].
     * Si la publicacion ya esta en estado PUBLICADA o PARCIAL, NO la pises:
       devolver error explicando que ya salio. Editar el texto de algo ya
       publicado da la falsa impresion de que cambia lo que se ve en la red, y
       no cambia nada.
     * enTransaccion de lib/prisma.ts.
     * revalidatePath de la pantalla.
   - obtenerPublicacion(complejoId, eventoId)
   - marcarLista(complejoId, eventoId): BORRADOR -> PROGRAMADA.
     Este es el gesto explicito del admin que habilita el disparo. Sin el, la
     publicacion de los torneos no postea nada. Dejar comentado que el default
     es el silencio.
   - cancelarPublicacion(complejoId, eventoId): -> CANCELADA.
   NINGUNA de estas devuelve tokenCifrado ni refreshCifrado de nada.

4. Pantalla en app/admin/complejos/[id]/eventos/[eventoId]/redes/page.tsx:
   - Server component que carga el evento, la publicacion si existe, y las
     cuentas sociales activas del complejo.
   - Si la feature esta apagada: cartel explicandolo y nada mas.
   - Si no hay ninguna cuenta vinculada: cartel con link al paso de
     vinculacion, y el form igual disponible (se puede dejar armado antes).

5. Componentes client:
   - CompositorPublicacion.tsx: react-hook-form + zodResolver, titulo, texto,
     alt, y el subidor de imagen.
   - ImagenPostCropper.tsx: recorte CUADRADO 1080x1080 en canvas, reusando el
     patron de app/perfil/components/AvatarCropper.tsx.
     IMPORTANTE: el repo no tiene sharp ni ninguna libreria de imagenes del
     lado del servidor, y no se agrega una por esto. El recorte va en el
     cliente y se manda como data URL a /api/social/imagen/subir, igual que
     hace app/api/perfil/avatar/route.ts. Dejalo comentado.
     Cuadrado porque entra sin recorte ajeno en las cinco redes.
   - PreviewRedes.tsx: una tarjeta por red vinculada, mostrando el texto YA
     truncado por componerTexto() y el contador de caracteres restantes.
     Que se vea en rojo cuando el texto se esta truncando: el admin tiene que
     enterarse ANTES de que le corten la frase en X.
     Si hay cuenta de Instagram y no hay imagen, avisar ahi mismo que esa red
     se va a omitir.
   - Todo con Tailwind y tokens del tema. Nada de clases de Bootstrap: estan en
     package.json pero no hacen nada.

6. Link a esta pantalla desde la pagina de administracion del evento y desde
   TorneosPageClient, que es donde el admin esta parado cuando publica.

Convenciones del repo: comentarios en castellano sin acentos que expliquen el
por que y no el que. Nada de any. enTransaccion, nunca prisma.$transaction.

Al terminar: npx tsc --noEmit && npm run lint && npm run check:breadcrumbs
````

---

## Paso 6 — Vinculacion de cuentas por club

**Objetivo:** que cada club conecte sus cuentas. OAuth para Meta y X, app
password para Bluesky.

**Archivos:** `lib/social/meta-oauth.ts`, `lib/social/x-oauth.ts`,
`lib/social/bluesky-auth.ts`, `actions/cuentas-sociales.ts`,
`app/admin/complejos/[id]/redes/page.tsx`,
`app/admin/complejos/[id]/redes/callback/[red]/route.ts` (todos nuevos).

**Terminado cuando:** vinculas una Pagina de Facebook con su Instagram, una
cuenta de X y una de Bluesky, y las tres aparecen en la pantalla con su nombre y
su handle.

**Se puede hacer con la app de Meta en modo desarrollo**, antes de que termine
el App Review, mientras uses cuentas donde tengas rol.

````
PROMPT PASO 6

Contexto: repo padelnet, Next 16 App Router, Prisma 7, TypeScript estricto.
Estoy siguiendo docs/prompts-redes-sociales.md. Los pasos 1 a 5 estan hechos:
modelo CuentaSocial, lib/crypto-secretos.ts, feature REDES_SOCIALES,
compositor.

Este paso es la vinculacion de las cuentas de cada club. Todavia no se publica.

Env que ya estan cargadas: META_APP_ID, META_APP_SECRET, META_API_VERSION,
META_OAUTH_REDIRECT, X_CLIENT_ID, X_CLIENT_SECRET, X_OAUTH_REDIRECT.

1. lib/social/meta-oauth.ts:
   - urlAutorizacion(complejoId, state): scopes pages_show_list,
     pages_manage_posts, pages_read_engagement, instagram_basic,
     instagram_content_publish, business_management.
   - intercambiarCodigo(code): code -> user access token de corta duracion.
   - aLargaDuracion(token): grant_type fb_exchange_token -> token de 60 dias.
   - listarPaginas(userTokenLargo): GET /me/accounts -> id, name,
     access_token de cada Pagina.
   - instagramDeLaPagina(pageId, pageToken):
     GET /{page-id}?fields=instagram_business_account{id,username}
   COMENTAR ESTO, que es lo que siempre se olvida: el Page Access Token
   derivado de un user token de LARGA duracion no expira. El derivado de uno
   de corta, si. Por eso el orden es: codigo -> corto -> LARGO -> paginas.
   Saltearse el paso del largo da una integracion que anda una hora en la demo
   y se muere de noche.

2. lib/social/x-oauth.ts:
   - OAuth 2.0 con PKCE. Generar code_verifier y code_challenge S256.
   - Scopes: tweet.read tweet.write users.read offline.access media.write
   - offline.access es OBLIGATORIO: sin refresh token la vinculacion del club
     se muere en horas y hay que pedirsela de nuevo. Comentalo.
   - refrescarToken(refresh): X ROTA el refresh token en cada uso. Guardar
     SIEMPRE el nuevo. Si guardas el viejo, el proximo refresh falla y la
     cuenta queda desvinculada sin que nadie toque nada. Comentalo fuerte.
   - El code_verifier se guarda entre el redirect y el callback. Usar una
     cookie httpOnly de vida corta, no un modelo nuevo.

3. lib/social/bluesky-auth.ts:
   - crearSesion(handle, appPassword): POST a
     https://bsky.social/xrpc/com.atproto.server.createSession
     -> did, handle, accessJwt, refreshJwt.
   - Validar la app password al vincular haciendo esa llamada. Si falla, no
     guardar nada y devolver el motivo.
   - Se guarda la APP PASSWORD cifrada, no el accessJwt: el jwt dura poco y se
     renueva en cada publicacion. Comentalo.
   - Avisar en la UI que tiene que ser una app password y NO la contraseña
     principal de la cuenta.

4. app/admin/complejos/[id]/redes/callback/[red]/route.ts:
   - Valida el state contra el complejo (state firmado o cookie; no aceptes un
     complejoId que venga suelto en la query: eso deja que alguien vincule su
     cuenta al club de otro).
   - Verifica admin del complejo y feature REDES_SOCIALES.
   - Intercambia, cifra con lib/crypto-secretos.ts, hace upsert de
     CuentaSocial por [complejoId, red, cuentaExternaId].
   - Redirige a la pantalla con un mensaje. Nunca poner un token en la URL.

5. actions/cuentas-sociales.ts:
   - listarCuentas(complejoId): SIN los campos cifrados. Solo red,
     nombreVisible, handle, activa, tokenExpiraAt, ultimoError.
   - vincularBluesky(complejoId, handle, appPassword)
   - desvincular(complejoId, cuentaId): borra la fila. Comentar que las
     PublicacionEntrega historicas quedan (onDelete correspondiente) porque son
     el registro de lo que ya se publico.
   - activarDesactivar(complejoId, cuentaId, activa): pausar sin desvincular.

6. app/admin/complejos/[id]/redes/page.tsx:
   - Una tarjeta por red: vinculada o no, nombre, handle, y si el token esta
     por vencer.
   - Boton "Conectar" que va al OAuth, y form propio para Bluesky.
   - Cartel de estado si ultimoError no es null.
   - Tailwind y tokens del tema.

Convenciones del repo: comentarios en castellano sin acentos que expliquen el
por que y no el que. Nada de any. enTransaccion, nunca prisma.$transaction.
Nunca loguear un token, ni cifrado ni descifrado.

Al terminar: npx tsc --noEmit && npm run lint && npm run check:auditoria
````

---

## Paso 7 — Publicadores: Bluesky y Facebook

**Objetivo:** publicar de verdad, en las dos redes mas faciles. **Bluesky
primero**, porque no depende de que Meta apruebe nada.

**Archivos:** `lib/social/tipos.ts`, `lib/social/publicar-bluesky.ts`,
`lib/social/publicar-facebook.ts` (nuevos).

**Terminado cuando:** una funcion de prueba postea en tu cuenta de Bluesky y en
una Pagina de Facebook de prueba, y devuelve la URL del post.

````
PROMPT PASO 7

Contexto: repo padelnet, Next 16 App Router, Prisma 7, TypeScript estricto.
Estoy siguiendo docs/prompts-redes-sociales.md. Los pasos 1 a 6 estan hechos:
ya se pueden vincular cuentas y armar el contenido del post.

Este paso publica de verdad, en las dos redes mas faciles.

1. lib/social/tipos.ts: el contrato que van a cumplir los cinco publicadores.

   export type ContenidoPost = {
     texto: string;          // ya truncado por lib/redes-limites.ts
     enlace: string | null;
     imagenUrl: string | null;   // absoluta y publica
     imagenAlt: string | null;
   };

   export type ResultadoPublicacion =
     | { ok: true; postId: string; url: string | null }
     | { ok: false; error: string; reintentable: boolean }
     | { ok: "pendiente"; contenedorId: string };  // instagram y threads

   export type Publicador = (
     cuenta: CuentaSocialDescifrada,
     contenido: ContenidoPost,
   ) => Promise<ResultadoPublicacion>;

   El campo `reintentable` es lo que decide todo el comportamiento del cron del
   paso 9. Escribir arriba la regla, corta y clara:
   - reintentable: red caida, timeout, 429, 5xx.
   - NO reintentable: token revocado, permiso faltante, imagen rechazada,
     texto invalido, cuenta suspendida. Reintentar eso es quemar cuota y, en X,
     plata, para obtener exactamente el mismo error.

2. lib/social/publicar-bluesky.ts:
   - createSession con la app password descifrada -> accessJwt.
   - Si hay imagen: bajarla de imagenUrl y subirla con
     com.atproto.repo.uploadBlob. Bluesky SI acepta bytes, al reves que
     Instagram.
   - createRecord con collection app.bsky.feed.post:
     * text, createdAt en ISO.
     * langs: ["es-AR"].
     * embed app.bsky.embed.images con alt. El alt no es opcional para
       nosotros: es accesibilidad y ademas lo mira el algoritmo.
     * facets para que el link sea clickeable. Bluesky NO autolinkea: sin
       facets el link se ve como texto muerto. Calcular los byteStart/byteEnd
       en UTF-8, NO en indices de string de JS. Con una tilde antes del link,
       los indices de JS dan distinto y el link queda corrido. Comentalo.
   - Devolver la URL https://bsky.app/profile/<handle>/post/<rkey>.

3. lib/social/publicar-facebook.ts:
   - Con imagen: POST /{page-id}/photos con url=<imagenUrl>, caption=<texto>,
     published=true.
   - Sin imagen: POST /{page-id}/feed con message y link.
   - Token: el Page Access Token de la cuenta, descifrado.
   - Devolver la URL del post armada con el id que responde Meta.
   - Mapear los errores de Meta: code 190 (token invalido) NO es reintentable;
     code 4 y 17 (rate limit) SI. Que el mapeo este en una funcion aparte,
     porque los otros tres publicadores de Meta la van a reusar.

4. Un script scripts/probar-publicador.ts para probar a mano contra una cuenta
   real, con --red y --dry-run, sin pasar por la cola. Que NO quede en
   package.json como script: es una herramienta de desarrollo.

Convenciones del repo: comentarios en castellano sin acentos que expliquen el
por que y no el que. Nada de any. Nunca loguear un token.
Estos modulos NO tocan prisma: reciben la cuenta ya descifrada y el contenido
ya armado. Eso es lo que los hace probables sin base de datos.

Al terminar: npx tsc --noEmit && npm run lint
Y proba con el script contra Bluesky, que no necesita esperar a Meta. Pegame la
URL del post.
````

---

## Paso 8 — Publicadores: Instagram, Threads y X

**Objetivo:** las tres que faltan. Instagram y Threads son en dos actos; X
factura.

**Archivos:** `lib/social/publicar-instagram.ts`,
`lib/social/publicar-threads.ts`, `lib/social/publicar-x.ts` (nuevos).

**Terminado cuando:** el script del paso 7 publica en las tres.

````
PROMPT PASO 8

Contexto: repo padelnet, Next 16 App Router, Prisma 7, TypeScript estricto.
Estoy siguiendo docs/prompts-redes-sociales.md. El paso 7 dejo el contrato en
lib/social/tipos.ts y andando los publicadores de Bluesky y Facebook.

Este paso suma los tres que faltan. Cumplen el mismo contrato Publicador.

1. lib/social/publicar-instagram.ts:
   - Instagram publica en DOS ACTOS y esto define el diseño:
     a) POST /{ig-user-id}/media con image_url, caption, alt_text
        -> devuelve un container id. Meta se pone a bajar la imagen.
     b) GET /{container-id}?fields=status_code
        -> IN_PROGRESS | FINISHED | ERROR | EXPIRED
     c) POST /{ig-user-id}/media_publish con creation_id.
   - La funcion NO espera adentro. Hace (a) y devuelve
     { ok: "pendiente", contenedorId }. El cron del paso 9 hace (b) y (c).
     Comentar por que: bajar la imagen le puede llevar minutos a Meta, y eso
     no puede pasar dentro del request de un admin ni de un action.
   - Exportar aparte:
     * consultarContenedor(cuenta, contenedorId)
     * publicarContenedor(cuenta, contenedorId)
   - Reglas que hay que respetar y comentar:
     * SIN IMAGEN NO SE PUEDE PUBLICAR. Si imagenUrl es null, devolver
       { ok:false, reintentable:false, error:"instagram requiere imagen" }.
       El paso 9 traduce eso a OMITIDA y no a FALLIDA.
     * La image_url tiene que ser publica y alcanzable por Meta. JPEG o PNG,
       hasta 8 MB, relacion de aspecto entre 4:5 y 1.91:1. La nuestra es
       cuadrada y entra siempre.
     * El container EXPIRA a las 24 h. Si status_code es EXPIRED, hay que
       rehacer desde (a): eso es reintentable, pero con contenedorId limpiado.
     * No consultar el status mas de una vez por minuto. El limite de la API
       es de 200 llamadas por hora por cuenta y un polling apretado lo come
       solo.
     * Limite: 100 publicaciones por 24 h por cuenta.
   - Reusar el mapeo de errores de Meta que dejo publicar-facebook.ts.

2. lib/social/publicar-threads.ts:
   - Mismo esquema de dos actos:
     POST /{threads-user-id}/threads (media_type TEXT o IMAGE)
     -> POST /{threads-user-id}/threads_publish
   - 500 caracteres. Imagen opcional, tambien por URL publica.
   - Limite 250 por 24 h.
   - Reusar todo lo que se pueda de publicar-instagram.ts sin forzar: si la
     diferencia son dos strings, que compartan; si no, que sean dos archivos.

3. lib/social/publicar-x.ts:
   - OAuth 2.0 user context con el access token descifrado. Refrescar si vencio
     ANTES de publicar, y guardar el refresh token NUEVO (X lo rota).
   - Con imagen: subir los bytes al endpoint de media (bajarla de imagenUrl
     primero) y despues POST /2/tweets con media.media_ids.
     X SI acepta bytes, al reves que Instagram.
   - Sin imagen: POST /2/tweets con text.
   - 280 caracteres. El truncado ya lo hizo lib/redes-limites.ts; aca solo
     verificar y fallar como NO reintentable si se paso, porque reintentar un
     texto largo da el mismo error para siempre.
   - EL COSTO: X factura POR POST, y un post con link sale mas de diez veces
     mas caro que uno sin link. Antes de publicar, chequear un tope:
     * process.env.X_TOPE_POSTS_MES
     * contar las PublicacionEntrega de red X con estado PUBLICADA del mes
       corriente.
     * Si se paso: devolver { ok:false, reintentable:false,
       error:"tope mensual de X alcanzado" }.
     Comentar arriba de la funcion, con estas palabras: esta es la unica red
     del sistema que cobra por uso. Un bug de reintentos en Instagram es
     molesto; aca es una factura.
   - Exportar el costo estimado del post (con y sin link) para poder mostrarlo
     en el panel del paso 10.

4. Actualizar scripts/probar-publicador.ts para las tres redes nuevas.
   Para X, que --dry-run sea el DEFAULT y publicar requiera --publicar.
   Ninguna prueba accidental deberia costar plata.

Convenciones del repo: comentarios en castellano sin acentos que expliquen el
por que y no el que. Nada de any. Nunca loguear un token.

Al terminar: npx tsc --noEmit && npm run lint
Probá Instagram con el script, en dos corridas (crear container, despues
publicarlo), y pegame que status_code devolvio en el medio.
````

---

## Paso 9 — El disparador y la cola

**Objetivo:** el corazon del plan. Que publicar el primer torneo de un evento
dispare **una** publicacion, y que la cola la lleve hasta el final.

**Archivos:** `lib/social/disparador.ts`, `lib/social/cola.ts`,
`cron/social-cron.ts`, `app/api/cron/social/route.ts` (nuevos),
`actions/torneos.ts`, `lib/auditoria-config.ts`.

**Terminado cuando:** publicas seis torneos de un mismo evento y se genera
**una** publicacion con una entrega por red.

````
PROMPT PASO 9

Contexto: repo padelnet, Next 16 App Router, Prisma 7 con adapter mariadb,
TypeScript estricto. Estoy siguiendo docs/prompts-redes-sociales.md.
Los pasos 1 a 8 estan hechos: modelos, cuentas vinculadas, compositor, y los
cinco publicadores cumpliendo el contrato de lib/social/tipos.ts.

Este es el paso central. Dos piezas: el disparador y la cola.

=== EL DISPARADOR ===

El problema, y es el que ordena todo: un evento tiene N torneos (uno por
categoria y sexo). Cuando el admin publica el evento, los seis torneos pasan a
publico casi al mismo tiempo. Si la publicacion cuelga del torneo salen SEIS
posts identicos en cada red.

1. lib/social/disparador.ts:
   export async function dispararPublicacionDeEvento(torneoId: number)

   - Buscar el eventoId y el complejoId del torneo.
   - Si el complejo no tiene la feature REDES_SOCIALES: salir sin ruido.
   - Buscar la PublicacionSocial de [eventoId, "torneos_publicados"].
     * No existe -> salir. El admin no armo nada y el default es el silencio.
     * estado BORRADOR -> salir. No la marcaron como lista.
     * estado CANCELADA -> salir.
     * estado distinto de PROGRAMADA -> salir. Ya se disparo.
   - Solo si esta PROGRAMADA: dentro de enTransaccion de lib/prisma.ts,
     * pasar la publicacion a ENVIANDO y setear disparadaAt,
     * crear una PublicacionEntrega PENDIENTE por cada CuentaSocial activa del
       complejo.
   - LA CONDICION DE CARRERA: los seis torneos se publican casi juntos y
     pueden entrar dos a la vez. La proteccion NO es un if: es el
     @@unique([publicacionId, cuentaSocialId]) de PublicacionEntrega mas un
     update condicionado por el estado
     (updateMany where estado: PROGRAMADA -> ENVIANDO, y seguir SOLO si
     count === 1). El que pierde la carrera ve count 0 y se va.
     Comentar esto con estas palabras, porque es el nucleo del diseño.
   - Instagram sin imagen: crear la entrega directamente OMITIDA, con el motivo
     en el campo error. Es una decision del admin, no una falla.
   - La funcion NO publica nada. Solo encola. Devuelve cuantas entregas creo.

2. actions/torneos.ts: llamar al disparador en los TRES lugares donde hoy se
   llama notifyTorneoPublicado (lineas 769, 860 y 939). Los tres, no dos.
   - Envuelto igual que las notificaciones, con el patron de safe() de
     actions/notificaciones-eventos.ts:159, o reusando esa funcion si es
     exportable.
   - Comentar: que una red este caida NO puede impedir que se publique un
     torneo. La operacion de negocio es publicar el torneo; el post es un
     efecto.

=== LA COLA ===

3. lib/social/cola.ts:
   export async function procesarEntregasPendientes(limite = 20)

   - Tomar PublicacionEntrega con estado PENDIENTE y proximoIntentoAt null o
     vencido, mas las ENVIANDO de instagram/threads que tienen
     contenedorExternoId (esas van a consultar el status, no a crear nada).
   - Marcar ENVIANDO antes de salir a la red, con un update condicionado, para
     que dos corridas del cron no manden lo mismo dos veces.
   - Descifrar la cuenta, armar el ContenidoPost con componerTexto() de
     lib/redes-limites.ts y urlDeImagenSocial(), y llamar al publicador.
   - Segun el resultado:
     * ok:true -> PUBLICADA, guardar postExternoId, urlPublica, enviadaAt.
     * ok:"pendiente" -> queda ENVIANDO con contenedorExternoId y
       proximoIntentoAt a 60 segundos. La proxima corrida consulta el status.
     * ok:false reintentable -> intentos++, backoff exponencial
       (1, 5, 15, 60 minutos), y a los 5 intentos FALLIDA definitiva.
     * ok:false NO reintentable -> FALLIDA de una. Reintentar un token
       revocado no lo arregla, y en X cuesta plata.
   - Contenedor de instagram EXPIRED: limpiar contenedorExternoId y volver a
     PENDIENTE, para que se rehaga desde cero.
   - Al terminar cada publicacion, recalcular su estado:
     todas PUBLICADA (u OMITIDA) -> PUBLICADA;
     algunas si y algunas no -> PARCIAL;
     ninguna -> FALLIDA.
   - Si un publicador devuelve token invalido: marcar la CuentaSocial con
     ultimoError y ultimoErrorAt, y desactivarla. Que el admin lo vea en la
     pantalla del paso 6 en vez de que fallen todos los posts en silencio.

4. cron/social-cron.ts + app/api/cron/social/route.ts:
   - Copiar EXACTAMENTE el molde de app/api/cron/imagenes/route.ts: runtime
     nodejs, dynamic force-dynamic, Bearer CRON_SECRET, fail-closed si no hay
     secret, y conOrigen("cron", ...) de lib/auditoria-contexto.ts.
   - Devolver el resumen: procesadas, publicadas, pendientes, fallidas.

5. Decime la linea de crontab para el VPS. Cada 2 minutos: instagram tarda
   minutos en bajar la imagen y con menos frecuencia el post sale tarde, con
   mas se desperdicia cuota de la API.

Convenciones del repo: comentarios en castellano sin acentos que expliquen el
por que y no el que. Nada de any. enTransaccion de lib/prisma.ts, nunca
prisma.$transaction suelto (scripts/check-auditoria.ts falla si aparece).

Al terminar: npx tsc --noEmit && npm run lint && npm run check:auditoria
Y explicame en tres lineas que pasa exactamente si dos torneos del mismo evento
se publican en el mismo segundo.
````

---

## Paso 10 — Panel de estado y republicacion

**Objetivo:** que el admin vea que salio, que fallo y por que, y pueda
reintentar una red sin tocar las otras.

**Archivos:** `app/admin/complejos/[id]/redes/publicaciones/page.tsx` (nuevo),
`actions/publicaciones-sociales.ts`.

**Terminado cuando:** ves el listado con el estado por red, los links a los
posts reales, y el boton de reintentar solo en las que fallaron.

````
PROMPT PASO 10

Contexto: repo padelnet, Next 16 App Router, Prisma 7, TypeScript estricto,
Tailwind 4 con tokens de tema. Estoy siguiendo docs/prompts-redes-sociales.md.
Los pasos 1 a 9 estan hechos: el sistema ya publica solo.

Este paso es la visibilidad. Sin esto, cuando algo falla nadie se entera hasta
que un socio del club pregunta por que no salio el post.

1. actions/publicaciones-sociales.ts, agregar:
   - listarPublicaciones(complejoId, { pagina }): publicaciones con sus
     entregas, evento, estado, fechas. Nunca campos cifrados.
   - reintentarEntrega(complejoId, entregaId):
     * Solo si la entrega esta FALLIDA. Si esta PUBLICADA, ERROR EXPLICITO.
       Republicar algo que ya salio deja dos posts identicos en el feed de un
       cliente y no se puede deshacer desde la app. Comentalo con esas
       palabras.
     * Resetea intentos a 0, error a null, estado a PENDIENTE,
       proximoIntentoAt a ahora. El cron hace el resto.
   - cancelarEntrega(complejoId, entregaId): FALLIDA -> OMITIDA, para poder
     cerrar una publicacion que quedo PARCIAL y no se va a arreglar.

2. app/admin/complejos/[id]/redes/publicaciones/page.tsx:
   - Tabla o tarjetas: evento, fecha de disparo, y un chip por red con su
     estado.
   - Cada chip PUBLICADA linkea al post real con urlPublica.
   - Cada chip FALLIDA muestra el error y ofrece reintentar.
   - Chip OMITIDA en gris con el motivo. Que se distinga visualmente de
     FALLIDA: una es una decision y la otra es un problema.
   - Contador del mes de posts de X y el costo estimado, usando lo que exporta
     lib/social/publicar-x.ts, con el tope al lado. Es la unica red que cobra
     y el admin tiene que verlo sin buscarlo.
   - Tailwind y tokens del tema. Nada de clases de Bootstrap.

3. En la pantalla del evento (paso 5), si ya hay publicacion disparada, mostrar
   ahi mismo el resumen por red en vez del compositor editable.

4. Breadcrumbs con el patron del repo.

Convenciones del repo: comentarios en castellano sin acentos que expliquen el
por que y no el que. Nada de any. enTransaccion, nunca prisma.$transaction.

Al terminar: npx tsc --noEmit && npm run lint && npm run check:breadcrumbs
````

---

## Paso 11 — Pruebas y salida a produccion

**Objetivo:** que la primera publicacion real no sea la primera prueba.

````
PROMPT PASO 11

Contexto: repo padelnet. Estoy siguiendo docs/prompts-redes-sociales.md, pasos
1 a 10 hechos. Quiero salir a produccion.

1. Repaso de seguridad. Revisá y pegame que encontraste:
   - Que ninguna action devuelva tokenCifrado ni refreshCifrado. Grepealo.
   - Que ningun console.log toque un token, ni cifrado ni descifrado.
   - Que /api/social/imagen/[archivo] valide el nombre contra el regex
     estricto y no permita path traversal. Probá con "../" y con "%2e%2e%2f".
   - Que el callback de OAuth no acepte un complejoId suelto de la query.
     Intentá vincular una cuenta a un complejo del que no sos admin y contame
     que pasa.
   - Que la pantalla de redes verifique admin DEL complejo y no solo admin.

2. Prueba de la idempotencia, que es lo que mas importa:
   - Crear un evento con 6 torneos en DRAFT.
   - Armar la publicacion y marcarla como lista.
   - Publicar los 6 torneos lo mas rapido que puedas.
   - Confirmar en la base: UNA PublicacionSocial, y exactamente una
     PublicacionEntrega por cuenta activa.
   Si aparece mas de una, pará todo y arreglá eso antes de seguir.

3. Prueba de fallas, una por una:
   - Cuenta con token revocado a mano -> la entrega queda FALLIDA no
     reintentable y la CuentaSocial queda desactivada con ultimoError.
   - Instagram sin imagen -> OMITIDA, no FALLIDA.
   - Texto de 400 caracteres -> se trunca en X y en Bluesky, y el preview lo
     avisaba antes.
   - Cortar la red en medio del cron -> la entrega queda ENVIANDO y la corrida
     siguiente la recupera, sin duplicar.
   - Correr el cron dos veces en paralelo -> no se publica dos veces.

4. Checklist de produccion, decime cual falta:
   - BASE_URL con el dominio real y https. Verificar que
     urlDeImagenSocial() no devuelva localhost.
   - SECRETOS_CLAVE generada y respaldada FUERA del servidor. Si se pierde,
     todas las cuentas vinculadas hay que rehacerlas.
   - UPLOADS_SOCIAL_DIR existe, con permisos del usuario que corre node, y
     esta en el backup.
   - App de Meta en modo LIVE y con el App Review aprobado.
   - Las redirect URI de produccion declaradas en Meta y en X, exactas.
   - X_TOPE_POSTS_MES en un numero conservador la primera semana.
   - Alerta de gasto configurada en X.
   - Crontab del VPS con la entrada de /api/cron/social.
   - La feature REDES_SOCIALES apagada para TODOS los complejos menos uno de
     prueba.

5. Salida escalonada:
   - Semana 1: un solo club, un solo evento real, y mirar los cinco posts a
     mano.
   - Semana 2: ese club sin supervision.
   - Despues: habilitar de a uno.

Pegame el resultado de cada prueba, no un resumen de que "todo anda".
````

---

## Cronograma realista

| Semana | Codigo | En paralelo, esperando |
|---|---|---|
| 1 | Pasos 1, 2, 3 | Verificacion de negocio en Meta |
| 2 | Pasos 4, 5 | App Review |
| 3 | Pasos 6, 7 (Bluesky ya publica) | App Review |
| 4 | Pasos 8, 9 | App Review |
| 5 | Pasos 10, 11 | — |

El camino critico **no es el codigo**: es el App Review de Meta. Por eso el paso
0 va primero aunque no se toque un archivo, y por eso Bluesky se implementa
antes que Instagram aunque sea la red mas chica de las cinco: permite tener el
motor entero funcionando y probado mientras Meta decide.

---

## Lo que este plan deja afuera

**Programar un post para una fecha.** El disparo es por evento publicado. Que el
admin elija "publicar el jueves a las 19" es otro modelo mental —y `scheduledAt`
en la cola— y se puede sumar despues sin romper nada de lo de arriba.

**Multiples posts por evento.** Uno solo, con motivo `"torneos_publicados"`. El
campo `motivo` esta puesto justamente para que sumar
`"ultimos_lugares"` o `"resultados"` mas adelante sea una fila, no una migracion.

**Carruseles y videos.** Una imagen. El carrusel de Instagram son N containers
mas uno de tipo carousel, y los Reels son otro pipeline con su propio polling.

**Publicar resultados y llaves.** Es lo obvio que sigue —y probablemente lo que
mas engagement genera—, pero necesita generar una imagen del cuadro en el
servidor, y el repo hoy no procesa imagenes del lado del servidor.

**Responder comentarios y mensajes.** Otra familia de permisos, otro webhook, y
un problema de moderacion que no es tecnico.

**Metricas.** Cuantos vieron el post, cuantos clickearon. Los endpoints de
insights existen para Facebook e Instagram, pero es un subsistema de lectura
completo con su propia cadencia.

**TikTok.** Solo video. No hay forma de postear una imagen fija.

**LinkedIn.** El API esta, pero no es donde estan los jugadores de padel.

**Mastodon.** Trivial de sumar si algun club lo pide: es una API sencilla y sin
revision, muy parecida a la de Bluesky. Nadie lo va a pedir.

**Google Business Profile.** Vale la pena mencionarlo aunque no sea una red
social: los **Local Posts** aparecen en la ficha del club en Google Maps y en la
busqueda, que para un complejo de padel probablemente convierta mas que X. Otro
plan, y el API es distinto.

**Estados y Canales de WhatsApp.** Como se dijo arriba: **no existen por API.**
No es que quede afuera por alcance, es que no se puede.
