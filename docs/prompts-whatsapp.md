# WhatsApp: plan de integracion paso a paso

Tres objetivos, en orden de dificultad creciente:

1. **Avisar a los jugadores** por WhatsApp lo que hoy se avisa por push.
2. **Avisar al admin del club** lo que hoy no se avisa por ningun lado.
3. **Conversar**: que el jugador pida un turno o se anote a un torneo desde el
   chat.

Cada paso trae al final un bloque **PROMPT** autocontenido para pegar en una
sesion nueva. Estan en orden de dependencia.

Complemento de `docs/prompts-mercadopago.md`. Los dos planes se cruzan en un
punto que esta marcado abajo.

---

## 0. Lo que hay hoy, y los cuatro agujeros

### La cola de notificaciones que ya existe

El repo ya tiene un sistema de notificaciones completo. **WhatsApp tiene que
entrar ahi adentro, no al lado.** El camino actual:

```
actions/notificaciones-eventos.ts   (disparadores: notifyTorneoPublicado, etc.)
        |  filtrarDestinatarios()   <- gate de preferencias + feature NOTIFICACIONES
        v
lib/notificaciones.ts               createBulkNotifications()
        v
model Notification                  (status PENDING, scheduledAt)
        v
/api/cron/notifications  ->  cron/notification-cron.ts  processPendingNotifications()
        v
lib/push.ts                         sendPushToUser()  ->  Firebase FCM
```

Lo que ya esta resuelto y se reusa entero:

| Pieza | Donde | Para que sirve aca |
|---|---|---|
| 8 disparadores de dominio | `actions/notificaciones-eventos.ts` | Ya deciden *cuando* avisar y *a quien* |
| Preferencias por usuario | `types/notificationPreferences.ts` | `User.notificationPreferences` Json |
| Feature flag por complejo | `lib/complejo-features.ts` | `NOTIFICACIONES` ya gatea todo |
| Cola con `scheduledAt` | `model Notification` | Los recordatorios ya se programan |
| Cron con `CRON_SECRET` | `app/api/cron/notifications/route.ts` | El molde exacto a copiar |
| `safe()` | `actions/notificaciones-eventos.ts:159` | Un aviso que falla nunca voltea la operacion |

### Agujero 1: el envio esta cableado a push, en dos lugares

No es una arquitectura de canales con FCM como uno de ellos. Es push y nada mas:

- `filtrarDestinatarios()` (`actions/notificaciones-eventos.ts:85`) **descarta a
  todo el que no tenga un `PushToken` registrado**, y lo hace *antes* de mirar
  las preferencias. Un jugador sin la app instalada hoy no existe para el
  sistema de avisos.
- `processPendingNotifications()` (`cron/notification-cron.ts`) llama derecho a
  `sendPushToUser()`. No hay indireccion de canal.

Ademas `Notification` tiene un solo `status` para la notificacion entera. Con dos
canales eso no alcanza: el push puede salir y el WhatsApp fallar. Hace falta
**una fila de entrega por canal**. Es el paso 5.

### Agujero 2: el telefono es texto libre

`User.telefono` es `String?`, y el schema zod que lo valida, en los tres lugares
donde aparece (`types/forms.ts:183`, `429`, `491`), es:

```ts
telefono: z.string().trim().optional()
```

Sin formato, sin largo minimo, sin unicidad, sin verificar, sin codigo de pais.
Hoy ahi puede haber `"3541 15 234567"`, `"+54 9 3541 234567"`, `"nose"` o vacio.

**WhatsApp necesita E.164** (`+5493541234567`). Y necesita que el numero sea de
verdad de esa persona: mandarle un aviso al numero equivocado no es un bug
cosmetico, es filtrarle a un tercero donde juega alguien y a que hora.

Es el paso 1 (normalizar) y el paso 4 (verificar). El equivalente exacto del
`valorInsc` del plan de Mercado Pago.

### Agujero 3: al admin no se le avisa nada

Los 8 disparadores de `notificaciones-eventos.ts` le hablan **solo a jugadores**.
No hay ni un aviso al club: ni "se anoto una pareja", ni "se cancelo un turno de
mañana", ni "hay una foto de perfil esperando moderacion".

Los admins de un complejo salen de `ComplejoMembership` con `role: ADMIN` y
`isActive: true`. Es el paso 7.

### Agujero 4 (el importante): no se puede reservar un turno desde ningun lado

Esto es un cruce con el otro plan y conviene verlo antes de empezar.

`actions/turnos.ts` arranca todo con `ensureTurnosHabilitados()`, que adentro
llama a `ensureComplejoManagerAccess()`. **No existe ninguna pantalla ni action
donde un jugador reserve una cancha.** Solo el panel del admin.

Entonces: *"que pueda pedir un turno por WhatsApp"* no se puede construir hasta
que exista el flujo publico de reserva, que es el **paso 8 de
`docs/prompts-mercadopago.md`**. WhatsApp seria una puerta de entrada a algo que
todavia no tiene habitacion.

El paso 9 de este documento declara esa dependencia y no arranca sin ella. La
parte de *anotarse a un torneo* no tiene el problema:
`registerPublicTorneoPair` + `app/torneos/[id]/registrarse/` ya existen.

---

## Lo que WhatsApp obliga y no es negociable

Esto no son decisiones nuestras: son reglas de Meta. Condicionan todo el diseño,
asi que van antes de las decisiones.

### La ventana de 24 horas

Fuera de las 24 horas desde el ultimo mensaje **del usuario**, solo se puede
mandar una **plantilla aprobada**. Nada de texto libre.

Toda notificacion que salga del sistema (recordatorio de partido, torneo nuevo,
turno confirmado) es business-initiated y por definicion cae afuera de la
ventana. **Todas necesitan plantilla aprobada.** No hay atajo.

Adentro de la ventana si se puede mandar texto libre y botones interactivos, y
por eso el flujo conversacional del paso 8 es viable.

### Cada plantilla se aprueba de a una, y tarda

Una plantilla se envia a Meta, se revisa, y vuelve `APPROVED` o `REJECTED`.
Tarda de minutos a un par de dias. Cambiar el texto de un aviso **no es editar
un string**: es crear una plantilla nueva y esperar. Esto cambia como se
escriben los mensajes y por eso el catalogo del paso 2 vive versionado en
codigo.

Las categorias (`UTILITY`, `MARKETING`, `AUTHENTICATION`) cambian el precio y el
riesgo de rechazo. Un recordatorio de partido es `UTILITY`. "Se abrio un torneo
nuevo en tu categoria" es `MARKETING` y cuesta bastante mas.

### Se paga por mensaje entregado, y desde el 1 de octubre de 2026 se paga mas

Desde julio de 2025 Meta cobra **por mensaje de plantilla entregado**, con
precio por categoria y por pais del *destinatario*.

**El dato que hay que tener en la cabeza al planificar esto en agosto de 2026:**
a partir del **1 de octubre de 2026** las plantillas `UTILITY` y los mensajes de
servicio **dentro** de la ventana de 24 horas pasan a cobrarse. Hasta el 30 de
septiembre de 2026 son gratis. O sea que el flujo conversacional del paso 8, que
hoy seria casi gratis, deja de serlo justo despues.

Consecuencia de diseño: el paso 11 (limites y anti-spam) **no es opcional ni es
para despues**. Sin tope de frecuencia, un bug en un disparador es una factura.

Los rate cards se actualizan por trimestre; el numero de Argentina hay que
mirarlo en la pagina oficial al momento de presupuestar, no aca.

### Opt-in explicito

Meta exige consentimiento previo para mandar plantillas. No alcanza con tener el
numero cargado en el perfil. Y ademas conviene: los reportes de spam bajan el
*quality rating* del numero, y un numero con calidad baja recibe menos limite de
envio hasta quedar bloqueado. **El opt-in protege el canal, no solo cumple.**

---

## Decisiones de arquitectura

Cinco. Si alguna no cierra, cambiarla **antes del paso 2**.

### D1. Cloud API de Meta, directo. Ni BSP, ni libreria no oficial

- **`whatsapp-web.js` / Baileys** (automatizar WhatsApp Web): violan los
  terminos de servicio y el riesgo es que Meta banee el numero. Un club que
  perdio su numero de WhatsApp perdio su canal con los socios. Descartado sin
  discusion.
- **BSP** (Twilio, 360dialog, Infobip): onboarding mas facil, pero el markup
  sobre el precio de Meta puede casi duplicar el costo por mensaje, y agrega una
  dependencia mas en el medio.
- **Cloud API directo**: Meta hostea, se paga solo el mensaje. Mas trabajo de
  setup inicial (paso 0), menos costo y menos intermediarios despues.

Va **Cloud API directo**, contra `graph.facebook.com`. La version vigente al
escribir esto es **v26.0** (29 de julio de 2026); va en una constante, no
desparramada por el codigo.

### D2. Un numero de PadelNet para todos los clubes (fase 1)

**Esta decision es deliberadamente la contraria a la que se tomo con Mercado
Pago**, y vale entender por que, porque a primera vista son el mismo problema
multi-tenant.

Con Mercado Pago **habia** que darle una cuenta a cada club: la plata es del
club, y si PadelNet la cobra queda como intermediario de fondos de terceros, que
es un problema fiscal, no tecnico.

Con WhatsApp no pasa nada de eso. Un mensaje no es plata. Que a un jugador le
llegue *"Tu partido en Club Norte es mañana a las 20:00"* desde el numero de
PadelNet es perfectamente razonable: PadelNet **es** el sistema donde se anoto.

Y el costo de la alternativa es alto. Para que cada club tenga su propio numero
hay que entrar al **programa Tech Provider** de Meta: verificacion de negocio,
App Review, Access Verification, e implementar Embedded Signup. Suele llevar
**semanas** de revision, y hasta completar la verificacion el limite es de **10
clientes nuevos cada 7 dias** (200 despues). Es un muro enorme antes del primer
mensaje.

Entonces: **fase 1, un numero de PadelNet.** Pero el schema se diseña con la
fase 2 puesta: el numero emisor es una **columna por complejo** que hoy apunta al
default de la plataforma. Migrar despues es cargar datos, no reescribir.

Lo que se pierde mientras tanto, dicho de frente: el nombre que ve el jugador es
PadelNet y no el club, y el club no puede contestar como el club. Para avisos y
para reservar, alcanza.

> Si se decide ir a Tech Provider mas adelante: **Embedded Signup v2 se
> discontinua el 15 de octubre de 2026**, asi que hay que implementar
> directamente **v4**.

### D3. WhatsApp es un canal mas de la cola que ya existe

No un sistema paralelo. Concretamente:

- `Notification` sigue siendo **el hecho logico** ("a este usuario hay que
  avisarle esto"). No se toca su significado.
- Se agrega `NotificationEntrega`: **una fila por notificacion y por canal**,
  con su propio estado, sus reintentos y el id del proveedor.
- El cron deja de llamar a `sendPushToUser()` y pasa a recorrer entregas,
  despachando cada una por su canal.

Asi el push sigue andando igual, WhatsApp entra como canal, y mañana entra mail
sin volver a tocar nada. Y se resuelve el problema de un solo `status` para dos
canales.

### D4. El catalogo de plantillas vive en codigo, versionado

Un archivo `lib/whatsapp-plantillas.ts` que es la **unica fuente de verdad**:
nombre, categoria, idioma, cantidad de parametros, el texto exacto que se mando
a aprobar, y a que `NotificationType` corresponde.

Por que en codigo y no en la base: el texto de la plantilla y el orden de los
`{{1}}`, `{{2}}` tienen que estar *acoplados* al codigo que arma los parametros.
Si viven separados, alguien edita el texto en el panel de Meta y los avisos
salen con los datos cambiados de lugar, sin que falle nada.

En la base va solo **el estado de aprobacion**, que lo sincroniza el webhook
`message_template_status_update`.

### D5. Para reservar y para inscribirse: deep link firmado, no WhatsApp Flows

WhatsApp Flows son formularios que se abren adentro del chat. Suenan ideales
para "elegi cancha y horario". El costo real de usarlos:

- un par de claves **RSA-2048** por WABA, firmado para cada numero;
- registrar la clave publica contra `whatsapp_business_encryption`;
- un endpoint que descifra **RSA-OAEP-SHA256 + AES-128-GCM** en cada request,
  y cifra la respuesta;
- el Flow en si, en un JSON con su propio lenguaje de pantallas;
- y aun asi, una UI mas pobre que la del sitio.

Contra eso: un **deep link firmado** (`/r/<token>`) que abre la pantalla real de
reserva, con la grilla entera, el precio y Mercado Pago ya integrado. Es una
funcion de firma y una pagina que ya existe.

Va el **deep link**. Flows queda anotado como posible fase 3 para los casos
simples.

Ojo que esto **no** significa renunciar a lo conversacional: los **mensajes
interactivos** (botones y listas) no necesitan nada de la parafernalia de Flows
y se usan de lleno en el paso 8. La conversacion pasa en WhatsApp; el unico
salto al navegador es la transaccion.

---

## Variables de entorno nuevas

```bash
# Cloud API. Todo esto sale del panel de Meta (paso 0).
WHATSAPP_API_VERSION=v26.0
WHATSAPP_PHONE_NUMBER_ID=...      # id del numero emisor, NO el numero
WHATSAPP_WABA_ID=...              # WhatsApp Business Account
WHATSAPP_ACCESS_TOKEN=...         # token de system user, permanente

# Firma de los webhooks entrantes (X-Hub-Signature-256).
# Es el App Secret de la app de Meta.
WHATSAPP_APP_SECRET=...

# String inventado por nosotros para el handshake GET del webhook.
WHATSAPP_VERIFY_TOKEN=...

# Pais por defecto para normalizar telefonos sin codigo de pais.
TELEFONO_PAIS_DEFAULT=AR
```

`BASE_URL` y `CRON_SECRET` ya existen y se reusan.

---

# Los pasos

| # | Paso | Depende de |
|---|---|---|
| 0 | Cuenta de Meta y numero (sin codigo, tiene demora) | — |
| 1 | Telefono en E.164 y opt-in | — |
| 2 | Cliente de Cloud API y catalogo de plantillas | 0 |
| 3 | Webhook: handshake, firma, entrantes y estados | 2 |
| 4 | Verificacion del telefono por OTP | 1, 2, 3 |
| 5 | WhatsApp como canal de la cola (`NotificationEntrega`) | 2, 4 |
| 6 | Los 8 disparadores existentes, por WhatsApp | 5 |
| 7 | Notificaciones al admin del club | 5 |
| 8 | Router conversacional: menu, botones, ventana de 24h | 3, 5 |
| 9 | Reservar turno / anotarse a torneo desde el chat | 8 + **paso 8 del plan de MP** |
| 10 | Panel de admin del canal | 5, 6 |
| 11 | Limites, calidad y anti-spam | 5 |
| 12 | Pruebas y salida a produccion | todos |

Los pasos 1 y 0 se pueden hacer en paralelo: el 0 tiene demora de dias y no
depende de codigo.

**Corte natural de entrega:** los pasos 0 a 7 son un producto completo y
mergeable — notificaciones por WhatsApp a jugadores y admins. Del 8 en adelante
es lo conversacional, que es otra bestia. Si el 8 y el 9 se demoran, no pasa
nada.

---

## Paso 0 — Cuenta de Meta y numero

**No hay codigo en este paso.** Va primero porque la verificacion de negocio
puede tardar dias y bloquea todo lo demas.

**Terminado cuando:** desde una `curl` se le puede mandar un mensaje de prueba a
un numero propio.

````
PROMPT PASO 0

Contexto: repo padelnet. Voy a integrar WhatsApp Cloud API segun
docs/prompts-whatsapp.md. Este paso no toca codigo: es el alta en Meta.

Necesito que investigues en la documentacion oficial VIGENTE de Meta (no de
memoria, y citando el link de cada cosa) y me armes docs/whatsapp-setup.md con
el procedimiento exacto y actualizado para:

1. Crear el portfolio de negocio (business portfolio) y la app de Meta con el
   caso de uso de WhatsApp.

2. Crear la WhatsApp Business Account (WABA) y dar de alta el numero emisor.
   Aclarar:
   - si conviene un numero nuevo o se puede migrar uno existente, y que se
     pierde al migrar (el historial de WhatsApp Business app)
   - que el numero NO puede estar activo en la app de WhatsApp comun
   - si sirve un numero virtual

3. Generar un token de System User permanente (no el token temporal de 24hs
   que da el panel para probar) con los permisos whatsapp_business_messaging
   y whatsapp_business_management.

4. Donde salen exactamente: PHONE_NUMBER_ID, WABA_ID y APP_SECRET.

5. Verificacion de negocio: que pide, cuanto tarda, y que limites de envio
   rigen antes y despues (los tiers de mensajes por dia).

6. El rate card VIGENTE para Argentina: precio por mensaje entregado de
   plantilla UTILITY, MARKETING y AUTHENTICATION. Y confirmar el cambio
   anunciado para el 1 de octubre de 2026, donde las plantillas UTILITY y los
   mensajes de servicio DENTRO de la ventana de 24 horas pasan a cobrarse.
   Con eso calculame el costo mensual estimado para un escenario de 500
   jugadores activos y 3000 avisos UTILITY por mes.

7. El numero de prueba que Meta da automaticamente: que limitaciones tiene y
   si sirve para probar los pasos 2 a 5 sin verificacion de negocio.

8. Confirmar cual es la version vigente de la Graph API (al escribir esto era
   v26.0, del 29 de julio de 2026) y hasta cuando tiene soporte.

Al final, una checklist en orden con los tiempos estimados de cada tramite,
para saber que se puede hacer en paralelo mientras Meta revisa.
````

---

## Paso 1 — Telefono en E.164 y opt-in

**Objetivo:** cerrar el agujero 2. Que exista un numero al que se pueda mandar.
**No toca WhatsApp**, se puede hacer en paralelo con el paso 0.

**Archivos:** `prisma/schema.prisma`, `lib/telefono.ts` (nuevo), `types/forms.ts`,
`actions/perfil.ts`, `PerfilForm.tsx`, `scripts/backfill-telefonos.ts` (nuevo).

**Terminado cuando:** el perfil guarda el telefono normalizado y el backfill
reporta cuantos no pudo normalizar.

**El criterio, igual que con los precios del otro plan:** `telefono` no se toca
ni se borra. Queda como el texto que cargo la persona. `telefonoE164` es un campo
nuevo al lado, derivado y validado. Convertir a ciegas texto libre a un numero
al que despues se le manda un mensaje es exactamente como se le filtran los datos
de alguien a un tercero.

````
PROMPT PASO 1

Contexto: repo padelnet, Next 16 App Router, Prisma 7 con adapter mariadb,
TypeScript estricto. Voy a integrar WhatsApp segun docs/prompts-whatsapp.md.

Problema que resuelve este paso: User.telefono es String? y el zod que lo valida
en types/forms.ts (lineas 183, 429 y 491) es `z.string().trim().optional()`.
Texto libre, sin formato, sin verificar. WhatsApp necesita E.164.

Este paso NO toca WhatsApp. Es solo modelo de telefono.

1. lib/telefono.ts (nuevo, SIN "use server" ni "server-only": lo importan
   components client para validar en vivo):
   - export function normalizarE164(entrada: string, paisDefault = "AR"):
       { ok: true; e164: string } | { ok: false; motivo: string }
     Para Argentina: aceptar "3541234567", "03541 15 234567",
     "+54 9 3541 23-4567", "5493541234567" y devolver siempre
     "+5493541234567".
     Las reglas argentinas que hay que contemplar y comentar en el codigo:
       * el 0 inicial del codigo de area se saca
       * el 15 despues del codigo de area se saca
       * para celular se agrega el 9 despues del +54
       * el largo final sin el "+" tiene que ser 13 para celular argentino
     Devolver ok:false con motivo legible en vez de tirar. Ser ESTRICTA:
     preferimos rechazar a normalizar mal, porque el resultado es a que
     numero se le manda un mensaje.
   - export function formatearParaMostrar(e164: string): string
     "+54 9 3541 23-4567", solo para pantalla.
   - export function esMovilArgentino(e164: string): boolean
     WhatsApp practicamente no existe en fijos; sirve para avisar en el form.
   - Evaluar si conviene la libreria libphonenumber-js en vez de escribir las
     reglas a mano. Mirar el peso que agrega al bundle del cliente y decidir;
     si la agregas, justifica por que. Si la escribis a mano, que sea SOLO
     Argentina y que quede comentado que ampliar a otro pais es tocar esto.

2. prisma/schema.prisma, en User agregar:
     telefonoE164        String?   @db.VarChar(20)
     whatsappOptIn       Boolean   @default(false)
     whatsappOptInAt     DateTime?
     whatsappOptInOrigen String?   @db.VarChar(24)  // "perfil" | "chat" | "admin"
     whatsappVerificadoAt DateTime?
     whatsappBloqueadoAt  DateTime?   // el usuario bloqueo el numero o pidio baja
   Con comentarios explicando:
   - telefono queda como el texto que cargo la persona; telefonoE164 es el
     derivado validado y es lo UNICO que se usa para mandar.
   - Meta exige opt-in explicito para mandar plantillas, y ademas los reportes
     de spam bajan el quality rating del numero, que se traduce en menos
     limite de envio. El opt-in protege el canal, no solo cumple.
   - whatsappVerificadoAt: null significa que el numero no probo ser de esta
     persona. Sin eso no se manda NADA que tenga datos (paso 4).
   Indice: @@index([telefonoE164])
   NO poner @unique en telefonoE164: hay parejas y familias que comparten
   telefono, y un unique romperia altas legitimas. Dejarlo comentado asi.
   Migracion: "telefono_e164_whatsapp"

3. types/forms.ts: en los tres schemas donde aparece telefono, reemplazar
   `z.string().trim().optional()` por un refinamiento que acepte vacio o un
   telefono que normalizarE164 pueda procesar, con mensaje de error util
   ("Poné el codigo de area sin el 0 y el numero sin el 15").
   OJO: esto puede romper formularios de admin que hoy guardan cualquier cosa.
   Revisar los tres usos (perfil, alta de usuario del admin, complejo) y
   decidir en cada uno si el telefono es obligatorio o no. Pegame que decidiste.

4. actions/perfil.ts y actions/usuarios.ts: al guardar, escribir telefono
   (crudo) Y telefonoE164 (normalizado, o null si no se pudo).
   IMPORTANTE: si telefonoE164 cambia, resetear whatsappVerificadoAt a null y
   whatsappOptIn a false. Cambiar de numero invalida la verificacion anterior:
   si no, alguien pone el numero de otro y le empiezan a llegar los avisos.
   Dejarlo comentado con esas palabras.

5. En PerfilForm.tsx (app/perfil/components/), mostrar debajo del campo el
   numero ya normalizado ("Vamos a escribirte al +54 9 3541 23-4567") cuando
   la normalizacion sale bien, y el motivo cuando no. Tailwind y tokens del
   tema; nada de clases de Bootstrap.

6. scripts/backfill-telefonos.ts + script "backfill:telefonos" en package.json:
   - Recorre los User con telefono no vacio y telefonoE164 null.
   - Usa normalizarE164. Si sale bien escribe; si no, NO escribe.
   - NO marca nada como verificado ni como opt-in. Un backfill no puede
     inventar un consentimiento que nadie dio.
   - Dry-run por defecto, escribe solo con --aplicar.
   - Imprime al final el listado de los que no pudo normalizar (id, nombre,
     telefono crudo) y el total de cada grupo. Ese listado es el entregable.

Convenciones del repo: comentarios en castellano sin acentos que expliquen el
por que y no el que. Nada de `any`. Usar enTransaccion de lib/prisma.ts para
las escrituras, nunca prisma.$transaction suelto.

Al terminar: npx tsc --noEmit && npm run lint && npm run prisma:check
Y corre el backfill en dry-run y pegame los totales.
````

---

## Paso 2 — Cliente de Cloud API y catalogo de plantillas

**Objetivo:** poder mandar un mensaje, y tener escrito en codigo que mensajes
existen.

**Archivos:** `lib/whatsapp.ts` (nuevo), `lib/whatsapp-plantillas.ts` (nuevo),
`.env`.

**Terminado cuando:** un script suelto manda una plantilla de prueba al numero
propio y vuelve el `wamid`.

**Sin SDK.** Meta no publica uno oficial para Node; los de terceros envejecen
mal. Son llamadas `fetch` a `graph.facebook.com` y el `fetch` de Node 20 alcanza.

````
PROMPT PASO 2

Contexto: repo padelnet. Integrando WhatsApp Cloud API segun
docs/prompts-whatsapp.md. Paso 1 hecho (telefonoE164 + opt-in en User).
Paso 0 hecho: tengo PHONE_NUMBER_ID, WABA_ID, ACCESS_TOKEN y APP_SECRET.

NO usar ningun SDK de terceros: son llamadas fetch a graph.facebook.com y el
fetch nativo de Node 20 alcanza. Meta no publica SDK oficial de Node.

1. lib/whatsapp.ts ("server-only"):
   - const API_VERSION = process.env.WHATSAPP_API_VERSION ?? "v26.0"
     Comentar: la version va en una constante y no desparramada; Meta
     discontinua versiones y la migracion tiene que ser un solo cambio.
   - Helper interno postMensajes(body) que hace
     POST https://graph.facebook.com/{API_VERSION}/{PHONE_NUMBER_ID}/messages
     con Authorization: Bearer {ACCESS_TOKEN}, y:
       * timeout de 10s con AbortSignal.timeout
       * si la respuesta no es ok, parsear el error de Meta
         (error.code, error.error_subcode, error.message) y tirar una clase
         propia ErrorWhatsapp con esos campos + si es reintentable.
         Reintentables: 429 (rate limit), 5xx, y el codigo 131056. NO
         reintentable: 131047 (fuera de ventana de 24hs), 132000/132001
         (plantilla mal), 131026 (el numero no recibe).
         Investigar en la doc vigente los codigos exactos y comentarlos.
   - export async function enviarPlantilla(args: {
       a: string;                  // E.164 con "+"
       plantilla: string;          // name
       idioma: string;             // "es_AR" o "es"
       parametros?: string[];      // los {{1}}, {{2}} en orden
       parametrosBoton?: string[]; // para botones dinamicos (paso 9)
     }): Promise<{ wamid: string }>
   - export async function enviarTexto(a: string, texto: string):
       Promise<{ wamid: string }>
     Con un comentario grande: SOLO es valido dentro de la ventana de 24hs
     desde el ultimo mensaje del usuario. Afuera, Meta lo rechaza con 131047.
     Quien lo llame tiene que haber verificado la ventana.
   - export async function enviarBotones(args: {
       a: string; texto: string;
       botones: { id: string; titulo: string }[];  // max 3, titulo max 20 chars
     })
   - export async function enviarLista(args: {
       a: string; texto: string; boton: string;
       secciones: { titulo: string;
                    filas: { id: string; titulo: string; descripcion?: string }[] }[];
     })
     Validar los limites de Meta (max 10 filas en total, largos maximos) y
     tirar Error si se pasan, en vez de que lo rechace la API.
   - export async function marcarLeido(wamid: string)
   - Nunca loguear el ACCESS_TOKEN. Al loguear errores, incluir el wamid y el
     codigo de Meta, que es lo unico accionable.

2. lib/whatsapp-plantillas.ts (SIN "server-only": lo lee tambien el panel del
   paso 10):
   Un catalogo tipado que es la UNICA fuente de verdad de las plantillas.
   Comentar arriba POR QUE vive en codigo y no en la base: el texto y el orden
   de los {{1}}, {{2}} estan acoplados al codigo que arma los parametros; si
   viven separados, alguien edita el texto en el panel de Meta y los avisos
   salen con los datos cambiados de lugar sin que falle nada.

   export type PlantillaWhatsapp = {
     nombre: string;            // el name en Meta, snake_case
     categoria: "UTILITY" | "MARKETING" | "AUTHENTICATION";
     idioma: string;
     /** Texto EXACTO que se mando a aprobar, con los {{n}}. Documental. */
     cuerpo: string;
     /** Que es cada {{n}}, en orden. El largo define cuantos parametros van. */
     parametros: string[];
     /** A que NotificationType corresponde, si aplica. */
     tipoNotificacion?: NotificationType;
   }

   Definir el catalogo inicial, uno por cada NotificationType de
   types/notification.ts (son 7: MATCH_REMINDER, MATCH_1H_REMINDER,
   MATCH_CHANGED, TOURNAMENT_START, TOURNAMENT_UPDATE, NEW_TOURNAMENT,
   RESULT_UPDATE) mas:
     - verificacion_codigo (AUTHENTICATION, para el OTP del paso 4)
     - menu_bienvenida (UTILITY, para reabrir la ventana en el paso 8)
   Los textos: cortos, en castellano rioplatense, sin acentos como el resto
   del repo, y sin datos de mas. Mirar como estan escritos los avisos push
   actuales en actions/notificaciones-eventos.ts y mantener ese tono.
   NEW_TOURNAMENT va como MARKETING (es promocional y cuesta mas); el resto
   como UTILITY. Comentar esa distincion, que afecta el costo.

   - export function getPlantilla(nombre): PlantillaWhatsapp | null
   - export function plantillaDeTipo(tipo: NotificationType)
   - export const PLANTILLAS: readonly PlantillaWhatsapp[]

3. scripts/whatsapp-plantillas-sync.ts + script "wa:plantillas":
   - Con --listar: consulta GET /{WABA_ID}/message_templates y muestra el
     estado de cada una en Meta (APPROVED, PENDING, REJECTED) cruzado contra
     el catalogo local. Marca las que estan en el codigo y no en Meta, y al
     reves.
   - Con --crear <nombre>: manda a aprobar una del catalogo local.
   - Comentar que la aprobacion tarda de minutos a dias y que este script no
     espera: se consulta despues con --listar.

4. scripts/whatsapp-prueba.ts + script "wa:prueba":
   Manda una plantilla a un numero pasado por argumento. Es el smoke test de
   todo el paso.

5. Agregar al .env local, vacias: WHATSAPP_API_VERSION, WHATSAPP_PHONE_NUMBER_ID,
   WHATSAPP_WABA_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_APP_SECRET,
   WHATSAPP_VERIFY_TOKEN, TELEFONO_PAIS_DEFAULT.

Antes de escribir el cliente, verifica contra la documentacion VIGENTE de Meta
la forma exacta del body de /messages para type template, text e interactive.
No lo escribas de memoria.

Al terminar: npx tsc --noEmit && npm run lint
````

---

## Paso 3 — Webhook: handshake, firma, entrantes y estados

**Objetivo:** el endpoint que Meta llama. Sirve para tres cosas a la vez:
mensajes que manda el usuario, cambios de estado de los que mandamos nosotros, y
aprobacion de plantillas.

**Archivos:** `app/api/whatsapp/webhook/route.ts` (nuevo),
`prisma/schema.prisma`.

**Terminado cuando:** el panel de Meta valida el endpoint, y mandarle un mensaje
al numero deja una fila en `WhatsappMensaje`.

**Las cuatro reglas, iguales a las del webhook de Mercado Pago:**

1. **Responder 200 siempre y rapido.** Meta reintenta ante cualquier cosa que no
   sea 200, con frecuencia decreciente, **hasta 7 dias**. Un 500 se convierte en
   una semana de reintentos.
2. **Validar `X-Hub-Signature-256`** contra el raw body con el App Secret.
3. **Idempotencia por el `wamid`,** que es un `@unique`. Meta avisa que los
   reintentos pueden duplicar.
4. **Guardar primero, procesar despues.**

````
PROMPT PASO 3

Contexto: repo padelnet. Integrando WhatsApp segun docs/prompts-whatsapp.md.
Pasos 1 y 2 hechos: lib/whatsapp.ts y lib/whatsapp-plantillas.ts existen.

Mira primero app/api/pagos/mercadopago/webhook/route.ts si ya existe (del otro
plan) y seguí la misma estructura: los dos webhooks tienen que leerse igual.
Si no existe, mira app/api/cron/turnos/route.ts para el estilo del repo.

1. prisma/schema.prisma:

   enum WhatsappDireccion { ENTRANTE  SALIENTE }

   enum WhatsappEstado {
     ENCOLADO
     ENVIADO       // sent
     ENTREGADO     // delivered
     LEIDO         // read
     FALLIDO       // failed
     RECIBIDO      // solo para ENTRANTE
   }

   model WhatsappMensaje {
     id          BigInt   @id @default(autoincrement())
     wamid       String   @unique @db.VarChar(128)
       // El id de Meta. Este unique es lo que hace imposible procesar dos
       // veces la misma notificacion: Meta reintenta hasta 7 dias.
     direccion   WhatsappDireccion
     telefonoE164 String  @db.VarChar(20)
     userId      Int?
       // null cuando escribe un numero que no matchea ningun usuario
     tipo        String   @db.VarChar(24)   // "text","template","interactive","button"
     plantilla   String?  @db.VarChar(64)
     cuerpo      String?  @db.Text
     estado      WhatsappEstado @default(ENCOLADO)
     errorCodigo Int?
     errorDetalle String? @db.Text
     entregaId   BigInt?  // se llena en el paso 5
     payload     Json?
     createdAt   DateTime @default(now())
     updatedAt   DateTime @updatedAt

     user User? @relation("WhatsappMensajeUsuario", fields: [userId],
                          references: [id], onDelete: SetNull)

     @@index([telefonoE164, createdAt])
     @@index([userId, createdAt])
     @@index([estado, createdAt])
   }

   model WhatsappPlantillaEstado {
     id        Int      @id @default(autoincrement())
     nombre    String   @unique @db.VarChar(64)
     idioma    String   @db.VarChar(12)
     estado    String   @db.VarChar(24)  // APPROVED, PENDING, REJECTED...
     categoria String?  @db.VarChar(24)
     motivoRechazo String? @db.Text
     actualizadoAt DateTime @updatedAt
     // El texto y los parametros NO estan aca: viven en
     // lib/whatsapp-plantillas.ts (decision D4). Aca va solo el estado de
     // aprobacion, que lo sincroniza el webhook.
   }

   lib/auditoria-config.ts:
   - "WhatsappMensaje" va a MODELOS_EXCLUIDOS, con el comentario del por que
     en el bloque de arriba: lo escribe el webhook y el cron de a cientos,
     igual que Notification y PushToken.
   - "WhatsappPlantillaEstado" va a MODELOS_AUDITADOS.
   Migracion: "whatsapp_mensajes"

2. app/api/whatsapp/webhook/route.ts, runtime nodejs, dynamic force-dynamic.

   GET (el handshake de alta del webhook):
   - Lee hub.mode, hub.verify_token y hub.challenge del query.
   - Si hub.mode === "subscribe" y hub.verify_token === WHATSAPP_VERIFY_TOKEN,
     devolver hub.challenge como TEXTO PLANO (no JSON, es un detalle que
     rompe el alta si se manda mal), status 200.
   - Si no, 403.

   POST:
   a) Leer el body como TEXTO CRUDO (await request.text()) antes de parsear:
      la firma se calcula sobre los bytes exactos, no sobre el JSON
      re-serializado.
   b) Validar X-Hub-Signature-256: HMAC-SHA256 del raw body con
      WHATSAPP_APP_SECRET, comparado contra el header sin el prefijo
      "sha256=". Usar crypto.timingSafeEqual, no ===.
      Si falta WHATSAPP_APP_SECRET, devolver 403 y loguear: fallar cerrado,
      igual que los cron del repo.
      Verifica en la doc vigente de Meta el formato exacto del header.
   c) Parsear y recorrer entry[].changes[].value. Un solo POST puede traer
      varios eventos; procesarlos todos.
   d) Tres tipos de evento a manejar:

      value.messages[] -> mensaje ENTRANTE del usuario.
        * Insertar WhatsappMensaje con wamid, direccion ENTRANTE, estado
          RECIBIDO, telefono de value.contacts[0].wa_id (normalizar con
          normalizarE164 de lib/telefono.ts: Meta lo manda SIN el "+").
        * Si el insert choca con el unique (P2002), es reintento: cortar y
          devolver 200.
        * Resolver userId buscando por telefonoE164.
        * Llamar a manejarMensajeEntrante(mensaje) — que en este paso es una
          funcion que solo loguea. El paso 8 la implementa.

      value.statuses[] -> cambio de estado de uno NUESTRO.
        * Buscar por wamid y actualizar estado (sent/delivered/read/failed).
        * En failed, guardar errors[0].code y errors[0].title.
        * Si el wamid no existe en la base, ignorar sin tirar.
        * OJO: los estados llegan desordenados. NO degradar: si ya esta LEIDO
          no volver a ENTREGADO. Comparar contra un orden definido.

      field === "message_template_status_update" -> upsert en
        WhatsappPlantillaEstado con el estado nuevo.

   e) Devolver SIEMPRE 200, incluso si el procesamiento fallo. Loguear el
      error con console.error. Un 500 hace que Meta reintente durante 7 dias.
      La unica excepcion es el 403 de firma del punto (b).

3. Documentar en el archivo como se da de alta el webhook en el panel de Meta
   y a que campos hay que suscribirse: messages y
   message_template_status_update como minimo.

Al terminar: npx tsc --noEmit && npm run lint && npm run check:auditoria
Y decime como probarlo local (hace falta un tunel tipo ngrok o cloudflared) y
como simular la firma con curl.
````

---

## Paso 4 — Verificacion del telefono por OTP

**Objetivo:** que `whatsappVerificadoAt` signifique algo. Es lo que separa
"tenemos un numero anotado" de "sabemos que este numero es de esta persona".

**Archivos:** `actions/whatsapp-verificacion.ts` (nuevo), `prisma/schema.prisma`,
`app/perfil/`.

**Terminado cuando:** desde el perfil se pide el codigo, llega por WhatsApp, y
al meterlo el usuario queda verificado y con opt-in.

**Por que el OTP va por WhatsApp y no por SMS:** verifica las dos cosas de una.
Que el numero es suyo, y que ese numero **tiene WhatsApp y nos puede recibir**.
Un SMS solo prueba lo primero.

````
PROMPT PASO 4

Contexto: repo padelnet. Integrando WhatsApp segun docs/prompts-whatsapp.md.
Pasos 1-3 hechos: telefonoE164 + opt-in en User, lib/whatsapp.ts, el webhook,
y la plantilla verificacion_codigo (AUTHENTICATION) aprobada en Meta.

Mira primero como esta resuelta la verificacion de mail en el repo
(model EmailVerification, lib/email.ts generarToken/vencimientoToken,
app/confirmar-email/) y segui el mismo patron. No inventes uno nuevo.

1. prisma/schema.prisma:

   model WhatsappVerificacion {
     id           Int      @id @default(autoincrement())
     userId       Int
     telefonoE164 String   @db.VarChar(20)
       // Se guarda el telefono y no solo el userId porque el codigo vale para
       // ESE numero: si el usuario lo cambia mientras espera, el codigo viejo
       // no puede servir para el nuevo.
     codigoHash   String   @db.VarChar(128)
       // Hash, no el codigo. Es un secreto de un solo uso; mismo criterio que
       // EmailVerification.
     intentos     Int      @default(0)
     expiraAt     DateTime
     usadoAt      DateTime?
     createdAt    DateTime @default(now())

     user User @relation(fields: [userId], references: [id], onDelete: Cascade)
     @@index([userId, createdAt])
   }

   lib/auditoria-config.ts: "WhatsappVerificacion" a MODELOS_EXCLUIDOS, con el
   mismo comentario que EmailVerification (guarda secretos de un solo uso, no
   van a un log).
   Migracion: "whatsapp_verificacion"

2. actions/whatsapp-verificacion.ts ("use server"), todo contra el usuario de
   la sesion (mira el patron de requireUserId() en
   actions/notificationPreferences.ts, que existe justamente porque antes el
   userId llegaba por parametro y cualquiera podia operar sobre otro):

   - enviarCodigoWhatsapp(): 
     * usuario de la sesion, telefonoE164 no null (si no, error pidiendo que
       lo cargue primero)
     * codigo de 6 digitos con crypto.randomInt, NUNCA Math.random
     * guardar el hash (bcryptjs ya esta en el proyecto), expiraAt = now + 10 min
     * invalidar los codigos anteriores no usados del mismo usuario
     * enviarPlantilla con verificacion_codigo
     * rate limit: max 3 envios por usuario por hora y max 5 por telefono por
       dia. Contar contra WhatsappVerificacion, no hace falta tabla nueva.
       Comentar que cada envio cuesta plata y que sin tope esto es un grifo
       abierto a la factura de Meta.
     * devolver { success, esperaSegundos } sin filtrar el codigo jamas

   - confirmarCodigoWhatsapp(codigo: string):
     * buscar el ultimo no usado y no vencido de ese usuario
     * max 5 intentos por codigo; al sexto, invalidarlo y obligar a pedir otro
     * al acertar: marcar usadoAt, y en User escribir whatsappVerificadoAt =
       now, whatsappOptIn = true, whatsappOptInOrigen = "perfil",
       whatsappOptInAt = now
     * Comentar que la verificacion y el opt-in se dan juntos aca a proposito:
       el usuario pidio el codigo, es un consentimiento explicito y trazable,
       que es lo que Meta exige.
     * todo dentro de enTransaccion

   - desactivarWhatsapp(): whatsappOptIn false, whatsappOptInAt null. NO borra
     whatsappVerificadoAt: el numero sigue verificado, lo que se retiro es el
     permiso. Comentarlo, son dos cosas distintas.

3. UI en app/perfil/:
   - Bloque "WhatsApp" con: el numero normalizado, el estado (sin verificar /
     verificado / avisos desactivados), y el boton que corresponda.
   - Al pedir el codigo, input de 6 digitos y contador de reenvio.
   - Texto de consentimiento explicito arriba del boton, algo como:
     "Al verificar tu numero vas a recibir por WhatsApp los avisos de tus
     partidos y torneos. Podes darte de baja cuando quieras desde aca o
     respondiendo BAJA."
     Ese texto tiene que existir: es el opt-in.
   - Client component para el input y el contador; server component el resto.
   - Tailwind y tokens del tema, que ande en claro y oscuro. Nada de Bootstrap.

4. En el paso 3 el webhook ya guarda los entrantes. Agregar ahora un caso
   minimo en manejarMensajeEntrante: si el texto normalizado (sin acentos,
   minusculas, trim) es "baja", "stop" o "cancelar", poner whatsappOptIn false
   y whatsappBloqueadoAt = now, y contestar una confirmacion corta.
   Esto va ahora y no en el paso 8: un canal que no puede cortarse a si mismo
   no se puede lanzar. La respuesta esta dentro de la ventana de 24hs (el
   usuario acaba de escribir), asi que enviarTexto es valido.

Al terminar: npx tsc --noEmit && npm run lint && npm run check:auditoria
````

---

## Paso 5 — WhatsApp como canal de la cola

**Objetivo:** el paso estructural. Convertir la cola de push en una cola de
canales, sin romper el push.

**Archivos:** `prisma/schema.prisma`, `lib/notificaciones.ts`,
`lib/canales.ts` (nuevo), `cron/notification-cron.ts`,
`actions/notificaciones-eventos.ts`.

**Terminado cuando:** una notificacion sale por push y por WhatsApp, cada una
con su estado, y el push sigue comportandose exactamente igual que antes.

**El refactor de `filtrarDestinatarios`:** hoy filtra por "tiene push token" y
devuelve `number[]`. Tiene que pasar a devolver, por usuario, **por que canales
se le puede hablar**. Un jugador sin la app pero con WhatsApp verificado hoy no
recibe nada; despues de este paso, recibe.

````
PROMPT PASO 5

Contexto: repo padelnet. Integrando WhatsApp segun docs/prompts-whatsapp.md.
Pasos 1-4 hechos.

Este es el paso estructural. Hoy la cola de notificaciones esta cableada a push
en dos lugares:
  - actions/notificaciones-eventos.ts:85 filtrarDestinatarios() descarta a todo
    el que no tenga PushToken, ANTES de mirar preferencias
  - cron/notification-cron.ts llama derecho a sendPushToUser()
Y model Notification tiene un solo status para la notificacion entera, que con
dos canales no alcanza.

REQUISITO INNEGOCIABLE: el push tiene que seguir funcionando exactamente igual
que hoy. Si algo de este paso cambia el comportamiento del push, esta mal.

1. prisma/schema.prisma:

   enum CanalNotificacion { PUSH  WHATSAPP }

   model NotificationEntrega {
     id             BigInt   @id @default(autoincrement())
     notificationId String
     canal          CanalNotificacion
     estado         NotificationStatus @default(PENDING)
     intentos       Int      @default(0)
     proveedorId    String?  @db.VarChar(128)   // wamid, o el message id de FCM
     error          String?  @db.Text
     enviadoAt      DateTime?
     createdAt      DateTime @default(now())
     updatedAt      DateTime @updatedAt

     notification Notification @relation(fields: [notificationId],
                                references: [id], onDelete: Cascade)

     @@unique([notificationId, canal])
       // Una entrega por notificacion y por canal. Este unique es lo que
       // hace que reencolar sea idempotente.
     @@index([estado, createdAt])
   }

   En Notification agregar `entregas NotificationEntrega[]`.
   Notification.status queda como el estado AGREGADO (SENT si al menos un canal
   salio). Comentarlo: no se borra para no romper lo que ya lo lee.

   lib/auditoria-config.ts: "NotificationEntrega" a MODELOS_EXCLUIDOS, mismo
   motivo que Notification.
   Migracion: "notificacion_entregas"

2. lib/canales.ts (nuevo, "server-only"):
   - export type CanalesDeUsuario = { userId: number; push: boolean; whatsapp: boolean }
   - export async function canalesDisponibles(userIds: number[],
       tipo: NotificationType): Promise<CanalesDeUsuario[]>
     Por cada usuario activo y no borrado:
       push:     tiene al menos un PushToken
       whatsapp: telefonoE164 != null
                 && whatsappVerificadoAt != null
                 && whatsappOptIn === true
                 && whatsappBloqueadoAt == null
     Y despues aplica las preferencias de notificationPreferences igual que
     hoy (default del catalogo si no hay valor guardado). Si el tipo esta
     apagado, los dos canales van en false.
     Reusar la logica de preferencias que ya existe en filtrarDestinatarios,
     no duplicarla: extraerla a una funcion y que la usen los dos.

3. actions/notificaciones-eventos.ts:
   - filtrarDestinatarios() pasa a apoyarse en canalesDisponibles() y a
     devolver los usuarios con AL MENOS UN canal, en vez de exigir push token.
     Este es el cambio de comportamiento buscado: un jugador sin la app pero
     con WhatsApp verificado hoy no recibe nada y pasa a recibir.
   - Los 8 disparadores no se tocan. Siguen llamando igual.

4. lib/notificaciones.ts, en createBulkNotifications:
   - Despues de crear las Notification, crear las NotificationEntrega segun
     los canales de cada usuario, todo en la misma transaccion.
   - createMany de Notification no devuelve ids: revisar si hay que cambiarlo
     por creates individuales o por un createManyAndReturn. Elegi y explica.

5. lib/whatsapp-envio.ts (nuevo, "server-only"):
   - export async function enviarNotificacionPorWhatsapp(entrega, notification,
       usuario): Promise<{ wamid: string }>
     * Resuelve la plantilla con plantillaDeTipo(notification.type). Si no hay
       plantilla para ese tipo, marcar la entrega FAILED con
       error "sin_plantilla" y NO tirar.
     * Verificar contra WhatsappPlantillaEstado que este APPROVED. Si no,
       FAILED con "plantilla_no_aprobada". Mandar una plantilla no aprobada
       falla en Meta y suma errores contra la calidad del numero.
     * Los parametros salen de notification.metadata, que ya lo llenan los
       disparadores. Revisar que mete cada uno hoy y mapearlo. Si falta un
       parametro, FAILED con "parametros_incompletos" y console.error: es un
       bug de codigo, no un problema del usuario.
     * Registrar el WhatsappMensaje SALIENTE con el wamid y entregaId.

6. cron/notification-cron.ts, reescribir processPendingNotifications():
   - Recorre NotificationEntrega en PENDING (join a Notification para el
     scheduledAt <= now), en lotes de 100, ordenadas por createdAt.
   - switch por canal: PUSH -> sendPushToUser() TAL CUAL esta hoy;
     WHATSAPP -> enviarNotificacionPorWhatsapp().
   - Cada entrega en su try/catch: que falle WhatsApp no puede impedir el push
     de la misma notificacion.
   - Reintentos: si el error es reintentable (ver ErrorWhatsapp del paso 2),
     dejar PENDING e incrementar intentos; a los 3 intentos, FAILED.
     Si no es reintentable, FAILED directo.
   - Al final, actualizar Notification.status: SENT si al menos una entrega
     salio, FAILED si todas fallaron.
   - Devolver { procesadas, enviadas, fallidas, porCanal: {...} } para el log.

7. app/api/cron/notifications/route.ts no deberia necesitar cambios. Confirmalo.

Al terminar: npx tsc --noEmit && npm run lint && npm run check:auditoria
Y pegame explicitamente que probaste para confirmar que el push sigue igual.
````

---

## Paso 6 — Los 8 disparadores, por WhatsApp

**Objetivo:** que los avisos que ya existen salgan tambien por WhatsApp.

Despues del paso 5 esto es sobre todo trabajo de contenido: escribir las
plantillas, mandarlas a aprobar, y confirmar que los `metadata` que ya guardan
los disparadores alcanzan para llenar los `{{n}}`.

````
PROMPT PASO 6

Contexto: repo padelnet. Integrando WhatsApp segun docs/prompts-whatsapp.md.
Pasos 1-5 hechos: NotificationEntrega, canalesDisponibles(),
enviarNotificacionPorWhatsapp() y el cron multicanal andando.

1. Leer los 8 disparadores de actions/notificaciones-eventos.ts
   (notifyTorneoPublicado, notifyTorneoIniciado, notifyTorneoActualizado,
   notifyPartidosProgramados, notifyPartidosCambiados, notifyResultadoCargado,
   notifyInscripcionCancelada, y el que falte) y armarme una tabla con:
     disparador | NotificationType | que mete hoy en metadata |
     parametros que necesitaria la plantilla | alcanza si/no
   Pegame esa tabla ANTES de escribir codigo.

2. Donde el metadata no alcance, agregarle los campos que falten al
   disparador. Que sean datos ya cargados en memoria en ese punto, sin
   consultas nuevas.
   Regla de contenido: en el mensaje NO va nada que no haga falta. Nombre del
   torneo, cancha, dia y hora alcanzan. Nada de nombres de terceros ni datos
   de contacto: el mensaje puede terminar en una pantalla que no es la del
   destinatario.

3. Afinar los textos del catalogo de lib/whatsapp-plantillas.ts contra esa
   tabla, y mandarlos a aprobar con npm run wa:plantillas -- --crear <nombre>.
   Restricciones al escribirlos:
   - un {{n}} no puede estar al principio ni al final del cuerpo
   - nada de saltos de linea seguidos ni espacios dobles: Meta rechaza
   - el parametro no puede ser texto largo ni tener saltos
   - los UTILITY tienen que leerse como una notificacion de servicio, no como
     publicidad, o Meta los recategoriza a MARKETING y salen mas caros
   Verifica las reglas vigentes de formato en la doc de Meta antes de
   escribirlos, no de memoria.

4. Agregar un link al final de cada mensaje que lleve a la pantalla que
   corresponde (torneo, partido, perfil), con BASE_URL. Que el jugador pueda
   pasar del aviso al detalle en un toque.

5. Los recordatorios MATCH_REMINDER y MATCH_1H_REMINDER se programan con
   scheduledAt. Confirmar que el cron respeta scheduledAt para las entregas
   de WhatsApp igual que para push. Es el caso mas facil de romper en el
   refactor del paso 5.

6. Revisar el rate limit de Meta: si un torneo grande dispara 200 avisos de
   golpe, el cron los manda en lote de 100 por corrida. Confirmar que el
   default de 80 mensajes por segundo del numero no se pasa, y si hace falta,
   meter un espaciado entre envios dentro del lote.

Al terminar: npx tsc --noEmit && npm run lint
Y pegame el estado de aprobacion de cada plantilla con npm run wa:plantillas.
````

---

## Paso 7 — Notificaciones al admin del club

**Objetivo:** cerrar el agujero 3. Hoy al club no se le avisa nada.

**Lo que cambia respecto de los jugadores:** el destinatario no es un usuario
suelto, es *"los ADMIN activos del complejo X"*. Y el criterio de que avisar es
distinto: al jugador le importa su partido, al club le importa el movimiento.

````
PROMPT PASO 7

Contexto: repo padelnet. Integrando WhatsApp segun docs/prompts-whatsapp.md.
Pasos 1-6 hechos.

Hoy los 8 disparadores de actions/notificaciones-eventos.ts le hablan SOLO a
jugadores. Al club no se le avisa nada por ningun canal.

1. Extender el enum NotificationType (prisma/schema.prisma Y
   types/notification.ts, que estan duplicados y hay que tocar los dos) con
   los tipos de admin:
     ADMIN_INSCRIPCION_NUEVA
     ADMIN_INSCRIPCION_CANCELADA
     ADMIN_TURNO_RESERVADO
     ADMIN_TURNO_CANCELADO
     ADMIN_PAGO_APROBADO        // solo si el plan de Mercado Pago ya esta
     ADMIN_IMAGEN_PENDIENTE     // hay foto de perfil esperando moderacion
   Sumarlos tambien a DEFAULT_NOTIFICATION_PREFERENCES y a
   NOTIFICATION_TYPE_LABELS en types/notificationPreferences.ts.
   Migracion: "notificaciones_admin"

2. actions/notificaciones-admin.ts (nuevo, "use server"), siguiendo el mismo
   patron que notificaciones-eventos.ts (el wrapper safe(), el gate de
   feature, persistir()):
   - async function adminsDelComplejo(complejoId): userIds de
     ComplejoMembership con role ADMIN e isActive true, y el User no borrado.
   - Un disparador por cada tipo nuevo, con el mismo contrato NotifyResult.
   - MISMO criterio que los de jugador: envueltos en safe(), llamados DESPUES
     de commitear la operacion de negocio, nunca adentro de la transaccion.
     Que falle un aviso no puede voltear una inscripcion.

3. Agrupacion, que es lo que diferencia al admin del jugador:
   Un torneo que se llena son 24 inscripciones en una tarde. 24 WhatsApps al
   admin es una razon para que bloquee el numero, y ademas se paga cada uno.
   Implementar un resumen: las notificaciones de tipo ADMIN_* se acumulan y
   salen agrupadas cada 60 minutos ("3 inscripciones nuevas en Torneo X"),
   salvo las que son urgentes de verdad (ADMIN_TURNO_CANCELADO de un turno
   que es hoy o mañana), que salen al toque.
   Proponeme como implementarlo con lo que ya hay: scheduledAt de Notification
   redondeado a la hora + un skipDuplicates, o una tabla de acumulacion.
   Elegi la mas simple que funcione y explica por que.

4. Enganchar los disparadores donde corresponde:
   - registerPublicTorneoPair y registerManagedTorneoPair (actions/torneos-inscripcion.ts)
   - cancelPublicTorneoPair y cancelManagedTorneoPair
   - crearTurno y cancelarTurno (actions/turnos.ts)
   - reservarTurnoPublico y cancelarReservaPropia, SI ya existen (son del paso
     8 del plan de Mercado Pago). Si no existen, saltealos y decimelo.
   - la subida de imagen de perfil (actions/imagenes-perfil.ts)

5. Plantillas nuevas en lib/whatsapp-plantillas.ts para cada tipo de admin,
   todas UTILITY, y mandarlas a aprobar.

6. Que el admin pueda configurar esto: reusar la pantalla de preferencias de
   notificaciones que ya existe, mostrando los tipos ADMIN_* solo a quien sea
   admin de algun complejo. No armar una pantalla nueva.

Al terminar: npx tsc --noEmit && npm run lint && npm run check:auditoria
````

---

## Paso 8 — Router conversacional

**Objetivo:** que escribirle al numero sirva para algo. Menu con botones,
estado de conversacion, y respeto de la ventana de 24 horas.

**Archivos:** `lib/whatsapp-router.ts` (nuevo), `prisma/schema.prisma`,
`app/api/whatsapp/webhook/route.ts`.

**Terminado cuando:** el usuario escribe "hola", recibe un menu con botones, y
al tocar uno pasa algo.

**Nada de interpretar lenguaje natural.** Botones y listas: el usuario toca,
llega un `id` exacto, no hay ambiguedad que resolver. Un LLM interpretando texto
para decidir si alguien quiere reservar una cancha es mas caro, mas lento y
falla de formas raras. Los `id` de los botones son un protocolo.

````
PROMPT PASO 8

Contexto: repo padelnet. Integrando WhatsApp segun docs/prompts-whatsapp.md.
Pasos 1-7 hechos: el webhook guarda entrantes y llama a
manejarMensajeEntrante(), que hoy solo loguea y maneja el caso BAJA.

Objetivo: que escribirle al numero sirva. Menu con botones interactivos y una
maquina de estados chica.

NADA de interpretar lenguaje natural ni de meter un LLM aca. Botones y listas:
el usuario toca y llega un id exacto. Los ids de los botones son un protocolo.
Texto libre solo para el fallback ("no te entendi, mira el menu").

1. prisma/schema.prisma:

   model WhatsappConversacion {
     id           Int      @id @default(autoincrement())
     telefonoE164 String   @unique @db.VarChar(20)
     userId       Int?
     estado       String   @db.VarChar(32) @default("INICIO")
     contexto     Json?
       // Datos parciales de lo que se esta armando (complejoId elegido,
       // fecha elegida). Se limpia al terminar o al vencer.
     ultimoEntranteAt DateTime?
       // Con esto se calcula la ventana de 24hs. Es EL campo que decide si se
       // puede mandar texto libre o hace falta plantilla.
     expiraAt     DateTime?
     createdAt    DateTime @default(now())
     updatedAt    DateTime @updatedAt

     user User? @relation("WhatsappConversacionUsuario", fields: [userId],
                          references: [id], onDelete: SetNull)
     @@index([expiraAt])
   }

   lib/auditoria-config.ts: "WhatsappConversacion" a MODELOS_EXCLUIDOS.
   Migracion: "whatsapp_conversacion"

2. lib/whatsapp-ventana.ts (nuevo):
   - export function ventanaAbierta(ultimoEntranteAt: Date | null): boolean
     true si falta menos de 24hs. Usar un margen de seguridad de 5 minutos
     para no perder por reloj.
   - export async function responder(telefono, contenido): manda texto o
     botones si la ventana esta abierta; si esta cerrada, manda la plantilla
     menu_bienvenida.
     Comentar que esta es la UNICA funcion por la que el router contesta, para
     que la regla de la ventana este en un solo lugar y no en cada rama.

3. lib/whatsapp-router.ts (nuevo, "server-only"):
   - Estados: INICIO, MENU, ELIGIENDO_COMPLEJO, ELIGIENDO_TORNEO, ESPERANDO_ALGO.
     Definirlos como union de strings, no strings sueltos.
   - export async function manejarMensajeEntrante(mensaje): la funcion que el
     webhook del paso 3 ya llama.
     a) upsert de WhatsappConversacion, actualizando ultimoEntranteAt = now.
        ESTO PRIMERO, antes de cualquier rama: es lo que abre la ventana.
     b) marcarLeido(wamid). Los tildes azules son barato y cambian mucho la
        percepcion de que hay alguien del otro lado.
     c) Comandos globales que funcionan en cualquier estado, sobre el texto
        normalizado (minusculas, sin acentos, trim):
          "baja"/"stop"/"cancelar" -> el opt-out del paso 4
          "menu"/"hola"/"ayuda"    -> vuelve a MENU
     d) Si el telefono no matchea ningun User: contestar un mensaje que
        explique que hay que registrarse, con el link a BASE_URL/registrarse,
        y CORTAR. No revelar nada mas: quien escribe podria no ser quien
        pensamos.
     e) Si el User existe pero whatsappVerificadoAt es null: tratar este
        mensaje entrante como verificacion del numero (escribio desde ese
        numero, es prueba suficiente) y marcarlo verificado + opt-in con
        origen "chat". Comentarlo.
     f) switch por estado, y despues switch por el id del boton.

   - El menu principal, con botones (max 3 por mensaje, titulo max 20 chars):
       [Mis turnos] [Mis torneos] [Reservar]
     "Reservar" y la inscripcion a torneo las implementa el paso 9; en este
     paso responden "en un toque te paso el link" y nada mas.
   - "Mis turnos": las reservas futuras del usuario. Si el flujo publico de
     turnos todavia no existe (paso 8 del plan de Mercado Pago), mostrar las
     TurnoReserva donde jugadorId sea el usuario, que ya existen porque las
     carga el admin.
   - "Mis torneos": los torneos donde tiene una Pareja no borrada, con la
     fecha del proximo partido si esta programado.

4. Que el router sea barato de correr: cada mensaje entrante son consultas a
   la base en el path del webhook, que tiene que responder rapido. Nada de
   consultas pesadas ahi; si hace falta algo caro, contestar "ya te paso eso"
   y encolarlo.

5. Limpieza: agregar al cron de notificaciones (o a uno propio) el borrado de
   WhatsappConversacion con expiraAt vencido. Una conversacion abandonada a
   mitad no puede quedar viva para siempre con contexto guardado.

6. Fallback: si llega algo que no matchea nada, contestar el menu con un
   "no te entendi". Nunca dejar un mensaje sin respuesta: el usuario no sabe
   si el sistema esta vivo.

Al terminar: npx tsc --noEmit && npm run lint && npm run check:auditoria
````

---

## Paso 9 — Reservar y anotarse desde el chat

**Objetivo:** el objetivo 3 del documento.

> **Dependencia dura:** la parte de turnos necesita que exista el **paso 8 de
> `docs/prompts-mercadopago.md`** (flujo publico de reserva). Hoy no hay ninguna
> action donde un jugador reserve una cancha, solo el panel del admin. La parte
> de torneos no tiene el problema: `registerPublicTorneoPair` ya existe.
>
> Si el flujo publico de turnos todavia no esta, **hacer solo la mitad de
> torneos** de este paso. Esta separado a proposito.

**La forma:** conversacion en WhatsApp para elegir, deep link firmado para
cerrar. El link abre la pantalla real, con la grilla completa y Mercado Pago si
esta.

````
PROMPT PASO 9

Contexto: repo padelnet. Integrando WhatsApp segun docs/prompts-whatsapp.md.
Pasos 1-8 hechos: el router conversacional anda con botones y estados.

DEPENDENCIA: la parte de turnos necesita el flujo publico de reserva, que es el
paso 8 de docs/prompts-mercadopago.md (actions/turnos-publico.ts +
app/complejos/[slug]/reservar/). Verifica PRIMERO si existe:
  - si existe, hace las dos partes
  - si NO existe, hace SOLO la parte de torneos y decimelo claramente al final
Hoy actions/turnos.ts es todo admin (ensureTurnosHabilitados ->
ensureComplejoManagerAccess), asi que no hay a donde mandar al jugador.

Forma general: se conversa en WhatsApp para elegir, y se cierra con un deep
link firmado que abre la pantalla real del sitio. Ver decision D5 del
documento: WhatsApp Flows quedan afuera porque piden un par de claves RSA-2048
por WABA, registro de la clave publica y un endpoint que descifra
RSA-OAEP-SHA256 + AES-128-GCM en cada request, para dar una UI peor que la que
ya tenemos.

1. lib/deep-links.ts (nuevo):
   - export async function firmarDeepLink(args: {
       userId: number; destino: string; datos?: Record<string, string>;
       minutos?: number }): Promise<string>
     JWT corto con jose y SESSION_SECRET, igual que lib/session.ts. Default 30
     minutos. Devuelve `${BASE_URL}/r/${token}`.
   - export async function verificarDeepLink(token): Promise<payload | null>
   - app/r/[token]/page.tsx: verifica el token, y si el usuario NO tiene sesion
     en ese browser, LO MANDA AL LOGIN con next= al destino final. El deep link
     NO es una sesion: prueba que el link salio de nosotros y para quien, no
     autentica. Comentarlo con esas palabras, es el error facil de cometer aca.
     Si el token vencio, pagina que lo explica y ofrece pedir otro por WhatsApp.

2. Rama TORNEOS del router:
   - Boton "Torneos" -> lista interactiva con los torneos abiertos donde el
     jugador es elegible. Reusar lib/torneo-elegibilidad.ts (cumpleSexo,
     cumpleCategoria), que ya lo usa notifyTorneoPublicado. No duplicar reglas.
   - Max 10 filas en una lista de WhatsApp. Si hay mas, mostrar los 10 mas
     proximos y una fila "Ver todos" con link al sitio.
   - Al elegir uno: mostrar nombre, fecha, categoria, cupo y precio si lo
     tiene, y un boton con el deep link a /torneos/<id>/registrarse.
   - Por que el link y no anotarlo desde el chat: la inscripcion necesita
     elegir compañero, y registerPublicTorneoPair valida sexo, categoria,
     sanciones, duplicados y cupo. Reconstruir eso en botones es duplicar
     reglas de negocio en un segundo lugar, que se van a desincronizar.
     Comentarlo en el codigo.

3. Rama TURNOS del router (SOLO si existe el flujo publico):
   - Boton "Reservar" -> si el jugador tiene un solo complejo (por
     PerfilJugadorComplejo o por historial), saltear la eleccion; si tiene
     varios, lista para elegir.
   - Despues botones de dia: [Hoy] [Mañana] [Otro dia].
   - Con complejo y dia, consultar huecosDisponibles() de
     lib/turnos-disponibilidad.ts y mostrar hasta 10 horarios en una lista.
   - Al elegir un horario: NO reservar desde el chat. Deep link a
     /complejos/<slug>/reservar con la fecha y el horario preseleccionados.
     Mismo motivo que en torneos: reservarTurnoPublico revalida horario,
     solapamiento, limite de reservas y precio, y ademas puede tener que
     cobrar. Ese camino tiene que ser uno solo.
   - Guardar lo elegido en WhatsappConversacion.contexto y limpiarlo al
     mandar el link.

4. Confirmacion de vuelta: cuando la reserva o la inscripcion se concreta en el
   sitio, el disparador del paso 7 ya avisa. Confirmar que si el usuario llego
   por WhatsApp, la confirmacion tambien le llega por WhatsApp (va a estar
   dentro de la ventana de 24hs, asi que es texto libre y no cuesta plantilla).

5. Que el chat NO puede hacer, y hay que dejarlo escrito en el codigo:
   - cancelar una inscripcion o una reserva (que se haga en el sitio, donde se
     ve la politica de cancelacion)
   - pagar (el checkout de Mercado Pago es un redirect del navegador)
   - cambiar datos del perfil
   Si el usuario lo pide, contestar con el link a la pantalla que corresponde.

Al terminar: npx tsc --noEmit && npm run lint
Y decime explicitamente si hiciste la parte de turnos o solo la de torneos.
````

---

## Paso 10 — Panel de admin del canal

**Objetivo:** que se pueda ver que pasa sin entrar al panel de Meta.

````
PROMPT PASO 10

Contexto: repo padelnet. Integrando WhatsApp segun docs/prompts-whatsapp.md.
Pasos 1-7 hechos como minimo.

1. lib/complejo-features.ts y el enum ComplejoFeatureKey: agregar WHATSAPP,
   con defaultEnabled false.
   Por que separado de NOTIFICACIONES: el push es gratis y WhatsApp se paga
   por mensaje. Un club tiene que poder tener avisos push sin tener WhatsApp.
   Comentarlo asi. Migracion correspondiente.
   Y que canalesDisponibles() del paso 5 respete esta feature: si el complejo
   no la tiene, el canal WHATSAPP va en false.

2. app/superadmin/whatsapp/ (es de plataforma, no de club, porque el numero es
   de PadelNet en la fase 1 — ver decision D2):
   - Estado del numero: quality rating y limite de envio, consultados a
     GET /{PHONE_NUMBER_ID}?fields=quality_rating,messaging_limit_tier
   - Tabla de plantillas cruzando el catalogo de codigo contra
     WhatsappPlantillaEstado: nombre, categoria, estado, motivo de rechazo.
     Marcar en rojo las que estan en el codigo y no aprobadas en Meta.
   - Ultimos mensajes de WhatsappMensaje, con filtro por estado y por telefono.
   - Contadores del mes: enviados, entregados, leidos, fallidos, y el desglose
     por categoria de plantilla. La categoria es lo que define el costo, asi
     que esa columna es la que importa.
   - Los codigos de error de Meta mas repetidos, con su descripcion. Es lo
     primero que se mira cuando algo no llega.

3. En el panel del complejo, una vista mas chica: cuantos avisos salieron por
   sus jugadores y cuantos rebotaron. Sin acceso a los mensajes de otros clubes.

4. En el detalle de un jugador (app/admin/... y app/superadmin/...), mostrar
   el estado de su WhatsApp: numero, verificado, opt-in, o bloqueado. Es lo
   que contesta "por que a este no le llega".

Estilar con Tailwind y los tokens del tema. Nada de clases de Bootstrap.
Reusar el patron de tablas y paginacion que ya usa el resto del admin.

Al terminar: npx tsc --noEmit && npm run lint
````

---

## Paso 11 — Limites, calidad y anti-spam

**Objetivo:** que el canal no se queme y que la factura no se dispare.

**Esto no es para el final.** Deberia hacerse apenas termine el paso 6. Va
numerado aca por dependencias, no por prioridad.

Dos riesgos distintos y los dos reales:

- **La factura.** Se paga por mensaje entregado. Un bug en un disparador que
  mande de mas se cobra. Y desde el **1 de octubre de 2026** tambien se cobran
  las `UTILITY` y los mensajes de servicio *dentro* de la ventana de 24 horas,
  que hasta el 30 de septiembre son gratis: el techo de gasto sube justo cuando
  esto entre en produccion.
- **La calidad del numero.** Los bloqueos y reportes bajan el *quality rating*,
  y con calidad baja Meta reduce el limite de envio hasta bloquear el numero.
  A diferencia de la factura, esto **no se arregla con plata**.

````
PROMPT PASO 11

Contexto: repo padelnet. Integrando WhatsApp segun docs/prompts-whatsapp.md.
Pasos 1-6 hechos como minimo.

Dos riesgos: la factura (se paga por mensaje entregado) y el quality rating del
numero (los bloqueos lo bajan, y con calidad baja Meta reduce el limite de
envio hasta bloquear el numero). El segundo no se arregla con plata.

1. lib/whatsapp-limites.ts (nuevo):
   - export async function puedeEnviar(userId, tipo): Promise<{ ok: boolean;
       motivo?: string }>
     Reglas, todas con la constante nombrada y comentada:
     * max 4 mensajes por usuario por dia
     * max 12 por semana
     * los MARKETING (hoy solo NEW_TOURNAMENT): max 2 por semana y nunca dos
       del mismo tipo el mismo dia
     * horario de silencio: nada entre las 22:00 y las 8:00 hora del complejo.
       Si cae en la franja, correr el scheduledAt a las 8:00, no descartar.
       Usar Complejo.timezone, que ya existe. Un WhatsApp a las 3 AM es la
       forma mas rapida de que alguien bloquee el numero.
     * cortar del todo si whatsappBloqueadoAt no es null
   - Llamarla desde el cron ANTES de mandar, no al crear la notificacion: el
     scheduledAt puede ser de hace horas y el contexto cambio.
   - Cuando no se puede enviar, la entrega queda PENDING con el scheduledAt
     corrido, o FAILED con motivo si es un tope duro. Que se distinga.

2. Freno de emergencia:
   - Una variable de entorno WHATSAPP_PAUSADO=1 que corta TODO envio saliente
     dejando las entregas en PENDING. Sin deploy, sin tocar codigo.
   - Y un tope diario global (constante, arrancar en 2000 mensajes por dia):
     si se supera, pausar solo y loguear un error bien visible. Es el freno
     contra el bug que manda en loop.

3. Monitoreo del quality rating:
   - Suscribir el webhook al campo phone_number_quality_update y guardar los
     cambios.
   - Si baja a RED, pausar los MARKETING automaticamente y dejar solo los
     UTILITY. Loguearlo fuerte.

4. Opt-out mas visible:
   - Que las plantillas de MARKETING lleven el pie "Respondé BAJA para no
     recibir mas" (revisar si Meta ya lo agrega solo; si lo hace, no
     duplicarlo).
   - Confirmar que el comando BAJA del paso 4 anda desde cualquier estado del
     router.

5. Costos:
   - Agregar a WhatsappMensaje un campo categoria (la de la plantilla) si no
     esta, para poder estimar el gasto sin cruzar contra el codigo.
   - Un reporte mensual simple: mensajes entregados por categoria, que es la
     unidad en la que Meta factura.
   - NO intentar calcular el precio exacto en pesos: los rate cards cambian
     por trimestre y quedaria mintiendo. Contar mensajes por categoria y que
     el precio se mire en el panel de Meta.

Al terminar: npx tsc --noEmit && npm run lint
````

---

## Paso 12 — Pruebas y salida a produccion

````
PROMPT PASO 12

Contexto: repo padelnet. Integrando WhatsApp segun docs/prompts-whatsapp.md.
Pasos 0-11 hechos. Deploy en VPS Ubuntu propio, no Vercel.

Armar docs/whatsapp-pruebas.md, investigando en la doc VIGENTE de Meta lo que
haga falta y citando los links.

1. Como probar sin gastar: el numero de prueba que da Meta, sus limites (a
   cuantos destinatarios se puede mandar y como se los da de alta), y que se
   puede probar con el y que no.

2. Como exponer el webhook desde local (tunel), como pasar el handshake GET, y
   como simular un POST firmado con curl calculando el X-Hub-Signature-256 con
   el APP_SECRET.

3. Checklist end-to-end, con el resultado esperado de cada una:
   - telefono mal cargado -> normalizarE164 lo rechaza y el form lo dice
   - OTP: pedirlo, que llegue, meterlo mal 5 veces, que se invalide
   - OTP vencido a los 10 minutos
   - cambiar el telefono en el perfil -> se cae la verificacion y el opt-in
   - un aviso que sale por push Y por WhatsApp -> dos entregas, dos estados
   - WhatsApp falla y push sale -> Notification queda SENT, la entrega de
     WhatsApp FAILED
   - plantilla no aprobada -> entrega FAILED con "plantilla_no_aprobada", sin
     llamar a Meta
   - mandar a un numero que no tiene WhatsApp -> el codigo de error de Meta
     queda guardado
   - webhook duplicado (el mismo wamid dos veces) -> se procesa una sola vez
   - webhook con firma invalida -> 403 y nada escrito
   - estados desordenados (llega read antes que delivered) -> no se degrada
   - responder BAJA -> opt-in en false, y el proximo aviso no sale
   - escribir desde un numero que no es de ningun usuario -> respuesta generica
     sin revelar nada
   - horario de silencio: un aviso disparado a las 23:00 sale a las 8:00
   - tope diario global -> se pausa solo

4. Salida a produccion:
   - verificacion de negocio completa y limite de envio vigente
   - token de System User permanente, no el temporal de 24hs (es el error
     clasico: anda una semana y despues deja de andar)
   - webhook apuntando al dominio real, sobre HTTPS
   - campos suscritos: messages, message_template_status_update,
     phone_number_quality_update
   - todas las plantillas del catalogo en APPROVED
   - variables de entorno en el .env del VPS
   - WHATSAPP_PAUSADO sin setear (o en 0)
   - correr el backfill de telefonos y revisar a mano el listado de los que no
     normalizaron

5. Que mirar la primera semana:
   - quality rating del numero, todos los dias
   - tasa de entregados sobre enviados (si baja, hay numeros muertos en la base)
   - cuantos responden BAJA en las primeras 48hs: si son muchos, el problema
     es el contenido o la frecuencia, no la tecnica
   - entregas FAILED agrupadas por codigo de error de Meta
   - el gasto acumulado del mes contra lo estimado en el paso 0
````

---

## Lo que este plan deja afuera

- **Un numero de WhatsApp por club.** Decision D2: fase 2, entrando al programa
  Tech Provider. El schema se diseña para que sea una migracion de datos y no
  una reescritura. Si se hace, va **Embedded Signup v4**: el v2 se discontinua
  el 15 de octubre de 2026.
- **WhatsApp Flows.** Decision D5: la parafernalia de claves RSA y el endpoint
  cifrado no se justifica contra un deep link a una pantalla que ya existe.
- **Interpretar lenguaje natural / un LLM en el chat.** El paso 8 usa botones y
  listas a proposito. Se puede sumar despues como fallback de lo que hoy cae en
  "no te entendi", que ademas es la forma barata de descubrir que pide la gente
  antes de construirlo.
- **Cancelar y pagar desde el chat.** Paso 9, punto 5. Cancelar necesita mostrar
  la politica, y el checkout de Mercado Pago es un redirect del navegador.
- **Chat de soporte con una persona atendiendo.** El router contesta solo. No
  hay bandeja de entrada ni derivacion a un humano; si el club quiere eso, es
  otro producto (y probablemente un BSP con inbox, contra la decision D1).
- **Grupos de WhatsApp.** La Cloud API no manda a grupos. Un torneo con 24
  parejas son 48 mensajes individuales, no un grupo.
