# Mercado Pago: plan de integracion paso a paso

Cobro en el momento en dos flujos:

1. **Inscripcion a torneo** — una pareja se anota y paga ahi mismo.
2. **Reserva de turno** — un jugador reserva una cancha y paga ahi mismo.

Cada paso de este documento es autocontenido y trae al final un bloque
**PROMPT** para pegar en una sesion nueva. Estan en orden de dependencia: no
saltear, porque el paso N asume los tipos y las tablas que creo el N-1.

---

## 0. Lo que hay hoy, y los tres agujeros

Antes de los pasos, el estado real del repo. Esto es lo que hace que el plan
tenga 14 pasos y no 3.

### Lo que ya existe y sirve

| Pieza | Donde | Para que sirve aca |
|---|---|---|
| Transacciones auditadas | `lib/prisma.ts` (`enTransaccion`) | Toda escritura de pago va adentro de una |
| Auditoria automatica | `lib/auditoria-config.ts` | `Pago` entra al log sin escribir codigo |
| Feature flags por complejo | `lib/complejo-features.ts` | El superadmin prende `PAGOS` club por club |
| Cron con `CRON_SECRET` | `app/api/cron/*/route.ts` + `cron/*.ts` | El molde para el cron de conciliacion |
| Autorizacion por complejo | `lib/authz.ts` | `requireComplejoRole` para el panel de pagos |
| Mails con Resend | `lib/email.ts` | Comprobante de pago |
| `Pareja.pago: Boolean` | `prisma/schema.prisma:466` | Ya existe el booleano; falta el "como" |
| `TurnoReserva.pagado` + `pagadoAt` | `prisma/schema.prisma:716` | Idem |
| `marcarPagoTurno` | `actions/turnos.ts:688` | El cobro manual del admin, que sigue vivo |

### Agujero 1: no hay precio, hay un texto

`Torneo.valorInsc` es `String?`. Hoy guarda cosas como `"$15.000 por pareja"` o
`"15000 (transferencia)"`. **No se puede cobrar contra un campo de texto libre.**

Y los turnos estan peor: `Cancha` no tiene ningun campo de precio. Ni `Cancha`,
ni `TurnoSerie`, ni `TurnoSlot`, ni `Complejo`. El precio de una hora de cancha
hoy no existe en la base.

Esto es el **paso 4** y es condicion para los pasos 7 y 9.

### Agujero 2: los turnos son 100% del admin

`crearTurno`, `cancelarTurno` y `marcarPagoTurno` empiezan todos con
`ensureTurnosHabilitados(complejoId)`, que adentro llama a
`ensureComplejoManagerAccess`. **No existe ninguna pantalla ni action donde un
jugador reserve una cancha.** `app/admin/complejos/[id]/turnos/` es lo unico que
hay.

Asi que "pagar al reservar un turno" no es agregarle un boton a una pantalla:
hay que **construir el flujo publico de reserva entero** primero. Es el
**paso 8**, y es el paso mas grande del documento.

En torneos no pasa: `app/torneos/[id]/registrarse/page.tsx` +
`registerPublicTorneoPair` ya son un flujo publico completo.

### Agujero 3: la plata no es de la plataforma

PadelNet no vende nada. **La inscripcion la cobra el club.** Si se usa una sola
cuenta de Mercado Pago de la plataforma, PadelNet queda como intermediario de
fondos de terceros: hay que emitir factura por el total, retener, y despues
transferirle a cada club. Es un problema fiscal, no tecnico.

La forma correcta es **Marketplace / split de pagos**: cada complejo vincula su
propia cuenta de Mercado Pago por OAuth, la preferencia se crea con el
`access_token` **del club**, y la plata cae directo en la cuenta del club. Si
algun dia PadelNet quiere comision, es `marketplace_fee` en la preferencia.

Esto es el **paso 3** y explica por que hace falta guardar tokens cifrados
(paso 1).

---

## Decisiones de arquitectura

Estas cinco ya estan tomadas en el plan. Si alguna no cierra, hay que cambiarla
**antes** del paso 2, porque despues cuesta una migracion.

### D1. Checkout Pro, no Checkout Bricks

Checkout Pro es un redirect a la pagina de Mercado Pago. Bricks es el formulario
de tarjeta embebido en el sitio propio.

Va **Checkout Pro** porque con Bricks los datos de tarjeta pasan (aunque sea
tokenizados en el browser) por un formulario propio, y eso arrastra PCI-DSS SAQ
A-EP en vez de SAQ A. Para un club de padel no vale la pena. Ademas Checkout Pro
trae solo el pago con dinero en cuenta, transferencia, y todos los medios
locales, sin escribir nada.

Costo: el usuario se va del sitio y vuelve. Se compensa con la pagina de retorno
del paso 10.

### D2. Una tabla `Pago` generica, no una por flujo

En vez de `PagoInscripcion` y `PagoTurno`, una sola `Pago` con un `tipo` y dos FK
nullables (`parejaId`, `turnoReservaId`), con un CHECK logico en la aplicacion de
que va exactamente una.

Por que: el webhook, la conciliacion, el panel de admin, el reporte y la
expiracion son **identicos** para los dos flujos. Duplicar la tabla duplica esas
cinco cosas para siempre. Lo unico que difiere es el efecto al aprobar, y eso
es un `switch` de diez lineas.

### D3. El webhook es la unica fuente de verdad

Las `back_urls` de Mercado Pago (`/exito`, `/pendiente`, `/fallo`) **no confirman
nada**. El usuario puede cerrar el browser antes del redirect, o escribir la url
de exito a mano.

La regla, sin excepcion: **el estado de `Pago` solo lo escribe el webhook (o el
cron de conciliacion), nunca la pagina de retorno.** La pagina de retorno lee y
muestra; si todavia esta `PENDIENTE`, dice "estamos confirmando tu pago" y
refresca.

### D4. Reserva con vencimiento (hold), no reserva optimista

Cuando alguien arranca a pagar, el lugar tiene que quedarle guardado mientras
paga — si no, dos personas pagan la ultima vacante. Pero no puede quedar
guardado para siempre si abandona el checkout.

Entonces: se crea la fila (`Pareja` o `TurnoReserva`) **en estado pendiente de
pago con un `expiraAt` de 15 minutos**, cuenta contra la capacidad y contra el
solapamiento mientras vive, y el cron del paso 11 la libera si vencio sin pagar.

Esto obliga a tocar dos calculos que hoy solo miran filas confirmadas: el
`mainCount` contra `torneo.capacidad` en `registerPublicTorneoPair`, y el
chequeo de solapamiento de turnos.

### D5. Plata en centavos, `Int`, siempre

`precioCentavos: Int`. Nunca `Float`, nunca `Decimal` de Prisma para esto, nunca
el `String` de `valorInsc`.

Mercado Pago recibe `unit_price` en unidades (`15000.5`), asi que se divide por
100 **solo al armar el body de la preferencia y al mostrar en pantalla**. En la
base y en toda la logica interna, centavos enteros.

---

## Variables de entorno nuevas

Van al `.env` y al `.env` del VPS. El `BASE_URL` ya existe y se reusa.

```bash
# App de Mercado Pago (Tus integraciones -> tu app -> Credenciales)
MP_CLIENT_ID=...
MP_CLIENT_SECRET=...

# Firma de webhooks. OJO: es distinta en test y en produccion.
# Tus integraciones -> tu app -> Webhooks -> Clave secreta
MP_WEBHOOK_SECRET=...

# Clave para cifrar los access_token de los clubes en la base.
# Generar con: openssl rand -base64 32
MP_TOKEN_ENC_KEY=...

# Opcional: token de la cuenta de la plataforma. Solo hace falta si
# algun dia se cobra marketplace_fee.
MP_PLATFORM_ACCESS_TOKEN=
```

`MP_TOKEN_ENC_KEY` no es opcional ni cosmetica: sin ella, un dump de la base
entrega los tokens con los que cobrar en nombre de cada club.

---

# Los pasos

| # | Paso | Depende de |
|---|---|---|
| 1 | Cimientos: SDK, cliente, cifrado | — |
| 2 | Schema: `Pago`, `PagoEvento`, cuenta MP, feature flag | 1 |
| 3 | Vinculacion OAuth de la cuenta del club | 2 |
| 4 | Precios reales en torneos y canchas | 2 |
| 5 | Motor de pagos (`lib/pagos.ts`) | 2, 3 |
| 6 | Webhook | 5 |
| 7 | Inscripcion a torneo con pago | 4, 5, 6 |
| 8 | Flujo publico de reserva de turnos (sin pago) | 4 |
| 9 | Turno con pago | 5, 6, 8 |
| 10 | Paginas de retorno | 7, 9 |
| 11 | Cron de expiracion y conciliacion | 7, 9 |
| 12 | Panel de pagos del club | 7, 9 |
| 13 | Mail de comprobante | 7, 9 |
| 14 | Pruebas en sandbox y salida a produccion | todos |

Los pasos 4 y 8 no dependen de nada de Mercado Pago: se pueden hacer en
paralelo con el 3 y el 5 si hay dos sesiones.

---

## Paso 1 — Cimientos: SDK, cliente y cifrado

**Objetivo:** que exista un cliente de Mercado Pago tipado y una forma de
guardar secretos en la base sin guardarlos en claro. Sin tocar el schema.

**Archivos:** `package.json`, `lib/mercadopago.ts` (nuevo),
`lib/crypto-secretos.ts` (nuevo), `.env`.

**Terminado cuando:** `npx tsc --noEmit` pasa y un script suelto puede cifrar y
descifrar un string ida y vuelta.

````
PROMPT PASO 1

Contexto: repo padelnet, Next 16 App Router, Prisma 7 con adapter mariadb,
TypeScript estricto. Voy a integrar Mercado Pago (Checkout Pro, modelo
marketplace: cada complejo cobra en su propia cuenta). Ver
docs/prompts-mercadopago.md para el plan completo.

Este paso NO toca prisma/schema.prisma ni ninguna action.

1. Instalar el SDK oficial:
   npm install mercadopago@^3.6.0
   (verificado: la version 3.6.0 exporta MercadoPagoConfig, Preference,
   Payment, OAuth, WebhookSignatureValidator e InvalidWebhookSignatureError
   desde el entry point raiz "mercadopago")

2. Crear lib/crypto-secretos.ts:
   - Modulo con "server-only".
   - AES-256-GCM usando node:crypto. La clave sale de
     process.env.MP_TOKEN_ENC_KEY, que es base64 de 32 bytes; si falta o no
     mide 32 bytes al decodificar, tirar Error con mensaje claro al importar
     la funcion (no al cargar el modulo, para no romper el build).
   - export function cifrarSecreto(texto: string): string
     Devuelve "v1.<iv_base64>.<tag_base64>.<ciphertext_base64>". El prefijo
     de version es para poder rotar el algoritmo sin adivinar despues.
   - export function descifrarSecreto(valor: string): string
     Valida el prefijo "v1." y tira Error si no matchea.
   - Comentario arriba explicando POR QUE esto existe: en la base se guardan
     los access_token de Mercado Pago de cada club, que son credenciales de
     cobro; un dump de la base no puede entregarlos en claro.

3. Crear lib/mercadopago.ts:
   - "server-only".
   - import { MercadoPagoConfig, Preference, Payment, OAuth } from "mercadopago"
   - export function clienteMercadoPago(accessToken: string, opciones?: {
       idempotencyKey?: string }): MercadoPagoConfig
     Con options.timeout = 8000 y el idempotencyKey si vino.
   - export function clientePreferencias(accessToken, idempotencyKey?): Preference
   - export function clientePagos(accessToken: string): Payment
   - export function clienteOAuth(): OAuth
     Usa MP_CLIENT_SECRET como accessToken del config (asi lo espera el SDK
     para el flujo OAuth).
   - export function credencialesApp(): { clientId, clientSecret,
     webhookSecret } leyendo del env y tirando Error si falta alguna.
   - export const MONEDA = "ARS" as const;
   - export function centavosAUnidades(centavos: number): number
     Redondea a 2 decimales: Math.round(centavos) / 100. Comentar que Mercado
     Pago recibe unidades y nosotros guardamos centavos enteros (decision D5
     del documento).

4. Agregar al .env local (con valores vacios, para que se vea que hacen falta):
   MP_CLIENT_ID, MP_CLIENT_SECRET, MP_WEBHOOK_SECRET, MP_TOKEN_ENC_KEY,
   MP_PLATFORM_ACCESS_TOKEN.

Convenciones del repo a respetar: comentarios en castellano sin acentos,
explicando el por que y no el que; nombres de funciones y variables en
castellano cuando son del dominio; nada de `any`.

Al terminar correr: npx tsc --noEmit
````

---

## Paso 2 — Schema: `Pago`, `PagoEvento`, cuenta del club, feature flag

**Objetivo:** todas las tablas de una sola migracion, para no encadenar cinco
migraciones chicas.

**Archivos:** `prisma/schema.prisma`, `lib/auditoria-config.ts`,
`lib/complejo-features.ts`, migracion nueva.

**Terminado cuando:** `npm run prisma:migrate` corre limpio y
`npm run check:auditoria` y `npm run prisma:check` pasan.

**Ojo con la auditoria:** `lib/auditoria-config.ts` tiene dos listas y
`npm run check:auditoria` **falla si un modelo nuevo queda sin clasificar**. Los
tres modelos nuevos hay que ponerlos si o si.

````
PROMPT PASO 2

Contexto: repo padelnet, Prisma 7 + MySQL/MariaDB. Estoy integrando Mercado
Pago segun docs/prompts-mercadopago.md. El paso 1 (SDK + lib/mercadopago.ts +
lib/crypto-secretos.ts) ya esta hecho.

Este paso es SOLO schema + config. Ninguna action, ninguna pagina.

1. En prisma/schema.prisma, agregar al enum ComplejoFeatureKey el valor PAGOS.

2. Enums nuevos:

   enum PagoTipo { INSCRIPCION  TURNO }

   enum PagoEstado {
     PENDIENTE   // preferencia creada, esperando al webhook
     APROBADO
     RECHAZADO
     CANCELADO   // lo cancelo el usuario o el club
     DEVUELTO    // refund total o parcial
     EXPIRADO    // vencio el hold sin pagar; lo escribe el cron
   }

3. Modelo ComplejoMercadoPago (uno por complejo, 1-1):
   - id Int @id @default(autoincrement())
   - complejoId Int @unique
   - mpUserId String @db.VarChar(64)   // el user_id del vendedor en MP
   - accessTokenCifrado  String @db.Text
   - refreshTokenCifrado String @db.Text
   - publicKey String? @db.VarChar(128)  // no es secreto, va en claro
   - expiraAt DateTime                   // vencimiento del access_token
   - liveMode Boolean @default(false)    // false = credenciales de prueba
   - vinculadoPorId Int?
   - desvinculadoAt DateTime?
   - createdAt / updatedAt
   - relaciones: complejo (Cascade), vinculadoPor User? (SetNull, nombre de
     relacion "ComplejoMercadoPagoVinculador")
   - Comentario arriba: por que hay una cuenta por complejo y no una sola de
     la plataforma (agujero 3 del documento: la plata es del club, PadelNet no
     puede ser intermediario de fondos de terceros).

4. Modelo Pago:
   - id Int @id @default(autoincrement())
   - complejoId Int
   - tipo PagoTipo
   - parejaId Int?        @unique
   - turnoReservaId Int?  @unique
     (@unique en las dos: un pago vivo por fila. Comentar que la exclusividad
     "va exactamente una de las dos" se valida en la aplicacion porque MySQL
     no tiene CHECK constraints utiles aca.)
   - usuarioId Int?       // quien paga; null si el admin lo cargo a mano
   - montoCentavos Int
   - moneda String @db.VarChar(3) @default("ARS")
   - estado PagoEstado @default(PENDIENTE)
   - externalReference String @unique @db.VarChar(64)
       // lo que viaja a MP y vuelve en el webhook. Formato "padelnet-<id>-<nonce>"
   - preferenceId String? @db.VarChar(64)
   - initPoint String? @db.Text
   - mpPaymentId BigInt? @unique
   - mpStatus String? @db.VarChar(32)
   - mpStatusDetail String? @db.VarChar(64)
   - montoAcreditadoCentavos Int?
   - expiraAt DateTime?   // el hold de la decision D4
   - pagadoAt DateTime?
   - createdAt / updatedAt
   - relaciones: complejo (Cascade), pareja Pareja? (SetNull),
     turnoReserva TurnoReserva? (SetNull), usuario User? (SetNull, relacion
     "PagoUsuario")
   - eventos PagoEvento[]
   - indices: @@index([complejoId, estado, createdAt]),
     @@index([estado, expiraAt])  // el cron de expiracion pega contra este

5. Modelo PagoEvento (idempotencia + rastro del webhook):
   - id BigInt @id @default(autoincrement())
   - pagoId Int?
   - mpPaymentId BigInt?
   - tipoNotificacion String @db.VarChar(32)   // "payment", "merchant_order"
   - xRequestId String @unique @db.VarChar(128)
       // Mercado Pago reintenta la misma notificacion; este unique es lo que
       // hace que procesarla dos veces sea imposible, no un if.
   - payload Json
   - procesadoOk Boolean @default(false)
   - error String? @db.Text
   - createdAt DateTime @default(now())
   - relacion pago Pago? (SetNull)
   - @@index([mpPaymentId]), @@index([createdAt])

6. Agregar los back-relations que falten en Complejo, User, Pareja y
   TurnoReserva.

7. lib/auditoria-config.ts:
   - Agregar "Pago" y "ComplejoMercadoPago" a MODELOS_AUDITADOS.
   - Agregar "PagoEvento" a MODELOS_EXCLUIDOS, con el comentario del por que
     en el bloque de arriba: es el log crudo del webhook, ya es en si mismo un
     registro, auditarlo seria duplicarlo.
   - Agregar "accessTokenCifrado" y "refreshTokenCifrado" al set
     CAMPOS_OCULTOS, para que el log diga que cambiaron pero no su valor.

8. lib/complejo-features.ts:
   - Agregar "PAGOS" al type ComplejoFeatureKey.
   - Agregar la entrada al array COMPLEJO_FEATURES:
     key "PAGOS", label "Pagos online", description "Cobro de inscripciones y
     turnos con Mercado Pago, en la cuenta del club.", defaultEnabled: false.

9. Correr:
   npm run prisma:migrate     (nombre de migracion: pagos_mercadopago)
   npm run check:auditoria
   npm run prisma:check
   npx tsc --noEmit

Comentarios en castellano sin acentos, con el estilo del resto del schema:
explican decisiones, no repiten el nombre del campo.
````

---

## Paso 3 — Vinculacion OAuth de la cuenta del club

**Objetivo:** que un ADMIN de complejo pueda apretar "Conectar Mercado Pago",
autorizar en MP, y volver con la cuenta vinculada.

**Archivos:** `actions/pagos-cuenta.ts` (nuevo),
`app/api/pagos/mercadopago/oauth/route.ts` (nuevo),
`app/admin/complejos/[id]/pagos/` (nuevo), `lib/mercadopago.ts`.

**Terminado cuando:** con credenciales de prueba, vincular deja una fila en
`ComplejoMercadoPago` con los tokens cifrados y `liveMode` correcto.

**El detalle que muerde:** el `state` del OAuth. Si es adivinable, cualquiera
puede hacer que la cuenta de MP de un tercero quede vinculada al complejo de
otro. Va firmado con `SESSION_SECRET`, igual que la sesion.

````
PROMPT PASO 3

Contexto: repo padelnet. Integrando Mercado Pago segun
docs/prompts-mercadopago.md. Pasos 1 y 2 hechos: existen lib/mercadopago.ts,
lib/crypto-secretos.ts, los modelos Pago / PagoEvento / ComplejoMercadoPago y
la feature PAGOS.

Objetivo: que el ADMIN de un complejo vincule la cuenta de Mercado Pago del
club por OAuth. Modelo marketplace: la plata cae en la cuenta del club.

1. lib/mercadopago.ts, agregar:
   - export function urlAutorizacionMP(state: string): string
     Arma https://auth.mercadopago.com.ar/authorization con
     client_id=MP_CLIENT_ID, response_type=code, platform_id=mp,
     state, redirect_uri=`${BASE_URL}/api/pagos/mercadopago/oauth`.
   - export async function firmarState(complejoId: number): Promise<string>
     y export async function verificarState(state: string):
       Promise<{ complejoId: number } | null>
     JWT corto (10 minutos) con jose y SESSION_SECRET, igual que lib/session.ts.
     Comentario: sin state firmado, un tercero puede inducir a que la cuenta de
     MP de otro quede vinculada a un complejo que no le corresponde.

2. actions/pagos-cuenta.ts ("use server"):
   - iniciarVinculacionMP(complejoId): valida con requireComplejoRole(complejoId,
     ["ADMIN"]) de lib/authz.ts, verifica que la feature PAGOS este habilitada
     con isComplejoFeatureEnabled, firma el state y devuelve la url. NO redirige
     desde la action; devuelve { success, url } y redirige la pagina.
   - getEstadoCuentaMP(complejoId): devuelve
     { vinculada: boolean, mpUserId: string | null, liveMode: boolean,
       expiraAt: string | null, vencida: boolean, vinculadoPorNombre: string | null }
     NUNCA devolver tokens, ni cifrados.
   - desvincularCuentaMP(complejoId): marca desvinculadoAt. No borra la fila:
     los pagos historicos apuntan al complejo y hace falta saber con que cuenta
     se cobraron. Si hay Pago en estado PENDIENTE del complejo, rechazar con
     "Hay pagos en curso; espera a que se resuelvan o cancelalos".
   - Todas dentro de enTransaccion cuando escriben.

3. app/api/pagos/mercadopago/oauth/route.ts (GET, runtime nodejs,
   dynamic force-dynamic):
   - Lee code y state del query.
   - verificarState -> si falla, redirect a /admin con ?error=...
   - Vuelve a chequear requireComplejoRole del complejoId del state: el state
     prueba de donde salio el link, no quien lo esta usando ahora.
   - clienteOAuth().create({ body: { client_id, client_secret, code,
     redirect_uri, grant_type: "authorization_code" } })
   - De la respuesta guarda: user_id -> mpUserId, access_token y refresh_token
     cifrados con cifrarSecreto, public_key, live_mode -> liveMode,
     expires_in -> expiraAt = now + expires_in segundos.
   - upsert por complejoId, limpiando desvinculadoAt.
   - Envolver la escritura en conOrigen("web", ...) de lib/auditoria-contexto.
   - redirect a /admin/complejos/<id>/pagos?ok=1
   - Si el intercambio falla, loguear el error del SDK y redirigir con
     ?error=... sin filtrar el detalle del error a la url.

4. lib/mercadopago.ts, agregar el refresh:
   - export async function accessTokenDeComplejo(complejoId: number):
       Promise<string>
     Busca la fila, tira Error("El club no tiene Mercado Pago vinculado") si no
     hay o si esta desvinculada. Si expiraAt esta a menos de 24 horas, llama a
     clienteOAuth().refresh(...) con el refresh_token descifrado, guarda los
     tokens nuevos y devuelve el nuevo access_token. Si no, devuelve el actual
     descifrado.
     Comentario: esta es la UNICA puerta por la que el resto del codigo obtiene
     un token de cobro. Nadie mas lee ComplejoMercadoPago.

5. Pagina app/admin/complejos/[id]/pagos/page.tsx (server component) +
   el client component del boton:
   - Si la feature PAGOS esta apagada, estado vacio explicando que lo habilita
     el superadmin.
   - Si no esta vinculada: boton "Conectar Mercado Pago".
   - Si esta vinculada: mostrar mpUserId, si es cuenta de prueba (liveMode
     false) con un aviso bien visible, y boton "Desvincular" con confirmacion.
   - Estilar con Tailwind y los tokens del tema del sitio. NO usar clases de
     Bootstrap: react-bootstrap esta en package.json pero sus clases no hacen
     nada en este proyecto.
   - Sumar la entrada al menu de administracion del complejo donde estan las
     demas secciones.

Al terminar: npx tsc --noEmit && npm run lint
````

---

## Paso 4 — Precios reales en torneos y canchas

**Objetivo:** cerrar el agujero 1. Que exista un numero cobrable.

**Archivos:** `prisma/schema.prisma`, `actions/torneos.ts`,
`actions/torneos-public.ts`, `TorneoForm.tsx`, `types/forms.ts`,
`scripts/backfill-precios.ts` (nuevo), y la ABM de canchas.

**Terminado cuando:** el form de torneo guarda un precio numerico, la cancha
tiene precio por hora, y el backfill reporta cuantos `valorInsc` no pudo
convertir.

**La decision fea:** `valorInsc` no se borra. Queda como texto libre para las
aclaraciones ("incluye pelotas", "2 pagos"), y el precio cobrable es un campo
nuevo al lado. Migrar 1:1 un texto libre a `Int` sin revisar a mano garantiza
cobrar mal.

````
PROMPT PASO 4

Contexto: repo padelnet. Integrando Mercado Pago segun
docs/prompts-mercadopago.md. Pasos 1-3 hechos.

Problema que resuelve este paso: hoy Torneo.valorInsc es String? con texto
libre tipo "$15.000 por pareja", y las canchas no tienen NINGUN campo de
precio. No se puede cobrar contra eso.

Este paso NO toca Mercado Pago. Es solo modelo de precios.

1. prisma/schema.prisma:
   - Torneo: agregar
       precioInscCentavos Int?
     con comentario: monto cobrable de la inscripcion, por PAREJA, en centavos
     enteros de ARS. valorInsc queda como texto libre para las aclaraciones
     ("incluye pelotas", "2 pagos") y NO se usa para cobrar. null = el torneo
     no cobra online.
   - Cancha: agregar
       precioHoraCentavos Int?
     con comentario: precio de una hora de esta cancha, en centavos. El precio
     de un turno se prorratea por duracionMin. null = la cancha no se cobra
     online.
   - Complejo: agregar
       precioHoraDefaultCentavos Int?
     Fallback cuando la cancha no tiene precio propio, asi el club carga uno
     solo y no N.
   - TurnoSlot: agregar
       precioCentavos Int?
     Se congela al crear el slot. Comentario: si el club sube la tarifa, el
     turno que ya se reservo se sigue cobrando al precio que se mostro.
   - Migracion: npm run prisma:migrate, nombre "precios_cobrables"

2. lib/precios.ts (nuevo, sin "use server" porque lo importan components client):
   - export function formatearCentavos(centavos: number | null): string
     Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS",
     minimumFractionDigits: 0 }) sobre centavos/100. Revisar primero si ya hay
     un helper de moneda en app/complejos/[slug]/components/format.ts y reusarlo
     en vez de duplicar.
   - export function parsearPrecioArgentino(texto: string): number | null
     Acepta "15000", "15.000", "$15.000", "15.000,50" y devuelve centavos.
     Devuelve null si hay letras que no sean $ ni espacios, o si el resultado
     no es finito. Es deliberadamente estricta: preferimos no convertir a
     convertir mal.
   - export function precioDeTurnoCentavos(args: {
       precioHoraCancha: number | null;
       precioHoraDefault: number | null;
       duracionMin: number }): number | null
     Prorratea: Math.round(precioHora * duracionMin / 60). Cancha primero,
     complejo despues, null si no hay ninguno.

3. types/forms.ts, actions/torneos.ts, actions/torneos-public.ts:
   - Sumar precioInscCentavos al schema zod del torneo (z.number().int()
     .min(0).nullable()), a los select, a los tipos de retorno y a create/update.
   - Mantener valorInsc tal cual esta.

4. TorneoForm.tsx (app/admin/.../torneos/components/TorneoForm.tsx):
   - Campo nuevo "Precio de inscripcion" que se escribe en pesos y se guarda en
     centavos. Al lado, el campo de texto valorInsc renombrado en la UI a
     "Aclaracion sobre el pago (opcional)".
   - Ayuda debajo del precio: "Si lo dejas vacio, el torneo no cobra online."

5. ABM de canchas (buscar donde se editan: probablemente
   app/admin/complejos/[id]/canchas/):
   - Campo "Precio por hora" en la cancha.
   - En la config del complejo, "Precio por hora por defecto".

6. scripts/backfill-precios.ts + entrada "backfill:precios" en package.json:
   - Recorre los torneos con valorInsc != null y precioInscCentavos == null.
   - Usa parsearPrecioArgentino. Si convierte, escribe. Si no, NO escribe.
   - Modo dry-run por defecto; escribe solo con --aplicar.
   - Imprime al final una tabla de los que no pudo convertir, con id, nombre y
     el valorInsc crudo, para revisarlos a mano. Ese listado es el entregable
     real del script.

Al terminar: npm run prisma:check && npx tsc --noEmit && npm run lint
Y correr el backfill en dry-run y pegarme el listado de los no convertidos.
````

---

## Paso 5 — Motor de pagos (`lib/pagos.ts`)

**Objetivo:** el nucleo. Dos funciones que despues usan los dos flujos y el
webhook. Aca esta toda la logica de plata; los pasos 7 y 9 solo la llaman.

**Archivos:** `lib/pagos.ts` (nuevo).

**Terminado cuando:** compila y `crearPreferenciaDePago` devuelve un
`init_point` real contra credenciales de prueba.

````
PROMPT PASO 5

Contexto: repo padelnet. Integrando Mercado Pago segun
docs/prompts-mercadopago.md. Pasos 1-4 hechos: existe lib/mercadopago.ts con
accessTokenDeComplejo(), los modelos Pago / PagoEvento, y precios en centavos.

Este es el nucleo. Todo lo que sabe de plata vive aca; los flujos de
inscripcion y de turno solo llaman a estas funciones.

Crear lib/pagos.ts con "server-only".

1. export type NuevoPago = {
     complejoId: number;
     tipo: "INSCRIPCION" | "TURNO";
     parejaId?: number;
     turnoReservaId?: number;
     usuarioId: number;
     montoCentavos: number;
     titulo: string;          // lo que ve el pagador en el checkout
     descripcion?: string;
     emailPagador: string;
     minutosDeHold?: number;  // default 15
   }

2. export async function crearPreferenciaDePago(datos: NuevoPago, tx?: TxAuditado):
     Promise<{ pagoId: number; initPoint: string; externalReference: string }>

   Orden exacto, y el orden importa:
   a) Validar que venga exactamente uno de parejaId / turnoReservaId. Si vienen
      los dos o ninguno, tirar Error: es un bug de quien llama, no un error de
      usuario.
   b) Validar montoCentavos entero y > 0.
   c) Generar externalReference: `padelnet-${tipo.toLowerCase()}-${crypto
      .randomUUID()}`. Aleatorio y no derivado del id, para que nadie pueda
      adivinar la referencia de otro.
   d) Crear la fila Pago en estado PENDIENTE con expiraAt = now + minutosDeHold,
      usando el tx si vino. La fila se crea ANTES de hablar con Mercado Pago:
      si la llamada externa falla o el proceso se cae, queda el rastro de que
      se intento cobrar.
   e) accessTokenDeComplejo(complejoId).
   f) clientePreferencias(token, externalReference).create({ body }) con:
      - items: [{ id, title: titulo, description, quantity: 1,
                  currency_id: MONEDA,
                  unit_price: centavosAUnidades(montoCentavos) }]
      - payer: { email: emailPagador }
      - external_reference: externalReference
      - notification_url: `${BASE_URL}/api/pagos/mercadopago/webhook`
      - back_urls: { success/pending/failure:
          `${BASE_URL}/pagos/${externalReference}` }   // una sola pagina, ver paso 10
      - auto_return: "approved"
      - binary_mode: true
        // Comentar: sin binary_mode un pago puede quedar "in_process" horas
        // y el lugar reservado queda en el limbo. Aca preferimos aprobado o
        // rechazado y que el jugador reintente.
      - expires: true, expiration_date_to = expiraAt en ISO
        // Que el checkout venza junto con el hold, no despues: si vence
        // despues, alguien paga una vacante que el cron ya libero.
      - statement_descriptor: nombre del complejo recortado a 22 caracteres
      - metadata: { pago_id, tipo, complejo_id }
      El idempotencyKey del request es el externalReference: si el usuario hace
      doble click, no se crean dos preferencias.
   g) Guardar preferenceId e initPoint en el Pago.
   h) Si la llamada a MP tira, marcar el Pago como RECHAZADO con
      mpStatusDetail = "preference_error" y re-tirar. No dejarlo PENDIENTE:
      un PENDIENTE sin preferencia bloquea un lugar que nadie va a pagar.

3. export async function aplicarResultadoDePago(args: {
     externalReference: string;
     mpPaymentId: number;
     status: string;         // el status crudo de MP
     statusDetail?: string;
     montoAprobadoCentavos?: number;
   }): Promise<{ aplicado: boolean; motivo?: string }>

   Esta es la que llaman el webhook Y el cron de conciliacion. Toda la
   escritura adentro de un unico enTransaccion.
   a) Buscar el Pago por externalReference. Si no existe, devolver
      { aplicado: false, motivo: "desconocido" } sin tirar: puede ser una
      notificacion de otro ambiente.
   b) Mapear el status de MP a PagoEstado:
      approved -> APROBADO
      rejected / cancelled -> RECHAZADO
      refunded / charged_back -> DEVUELTO
      pending / in_process / authorized -> PENDIENTE (no hacer nada mas)
   c) Si el Pago ya esta en ese estado, devolver { aplicado: false,
      motivo: "sin_cambio" }. Idempotencia: MP reintenta la misma notificacion.
   d) Si el pago ya estaba APROBADO y ahora llega otro estado que no sea
      DEVUELTO, ignorar y loguear warning. No degradar un pago aprobado.
   e) Escribir estado, mpPaymentId, mpStatus, mpStatusDetail,
      montoAcreditadoCentavos, pagadoAt.
   f) Efecto de dominio, con un switch sobre tipo. Dejar los dos casos
      escritos pero delegando a funciones que por ahora solo hacen
      console.warn("pendiente: paso 7") y console.warn("pendiente: paso 9"):
      los pasos 7 y 9 las implementan. Firmas:
        aplicarPagoDeInscripcion(tx, pago, aprobado: boolean)
        aplicarPagoDeTurno(tx, pago, aprobado: boolean)
   g) Devolver { aplicado: true }.

4. export async function pagoPorReferencia(externalReference: string)
   Para la pagina de retorno del paso 10. Devuelve un DTO seguro:
   { estado, montoCentavos, tipo, creadoAt, pagadoAt, expiraAt,
     torneoNombre?, canchaLabel?, fechaTurno? }.
   Sin mpPaymentId crudo, sin payload, sin nada de la cuenta del club.

Convenciones: comentarios en castellano sin acentos explicando el por que.
Nada de `any`. Usar enTransaccion de lib/prisma.ts, NUNCA prisma.$transaction
suelto (scripts/check-auditoria.ts falla si aparece uno).

Al terminar: npx tsc --noEmit && npm run check:auditoria
````

---

## Paso 6 — Webhook

**Objetivo:** el endpoint que Mercado Pago llama. Es la unica fuente de verdad
(decision D3).

**Archivos:** `app/api/pagos/mercadopago/webhook/route.ts` (nuevo).

**Terminado cuando:** una notificacion simulada desde el panel de MP responde
200 y deja una fila en `PagoEvento`.

**Las cuatro reglas de un webhook que no rompe:**

1. **Responder rapido.** MP considera fallida la notificacion si tarda mas de
   ~22 segundos, y reintenta. Guardar el evento y responder 200; el trabajo
   pesado va despues.
2. **Validar la firma.** El SDK 3.6 ya trae `WebhookSignatureValidator.validate`
   — no escribir el HMAC a mano.
3. **Idempotencia por `x-request-id`,** que es el `@unique` de `PagoEvento`.
4. **No confiar en el body.** El body dice "el pago 123 cambio"; el monto y el
   estado se consultan a `Payment.get`, no se leen del body.

````
PROMPT PASO 6

Contexto: repo padelnet. Integrando Mercado Pago segun
docs/prompts-mercadopago.md. Pasos 1-5 hechos: existe lib/pagos.ts con
aplicarResultadoDePago(), y el modelo PagoEvento con xRequestId @unique.

Crear app/api/pagos/mercadopago/webhook/route.ts.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

POST(request: Request):

1. Leer el body como texto crudo primero y despues JSON.parse, porque si el
   parseo falla igual queremos guardar lo que llego.

2. Validar la firma con el validador del SDK (verificado en mercadopago@3.6.0):

   import { WebhookSignatureValidator, InvalidWebhookSignatureError }
     from "mercadopago";

   WebhookSignatureValidator.validate({
     xSignature: request.headers.get("x-signature"),
     xRequestId: request.headers.get("x-request-id"),
     dataId: new URL(request.url).searchParams.get("data.id"),
     secret: process.env.MP_WEBHOOK_SECRET,
     toleranceSeconds: 300,
   });

   Es estatico y sincronico, tira InvalidWebhookSignatureError con un campo
   .reason del enum SignatureFailureReason. Capturarlo, loguear reason +
   x-request-id (que es con lo que se busca la notificacion en el panel de MP)
   y devolver 401. NO implementar el HMAC a mano.
   Si falta MP_WEBHOOK_SECRET, devolver 401 y loguear: fallar cerrado, igual
   que hacen los cron de app/api/cron/*/route.ts.

3. Idempotencia. Insertar PagoEvento con xRequestId, tipoNotificacion
   (body.type ?? body.topic), payload = el body parseado, procesadoOk false.
   Si el insert choca con el unique (P2002), es un reintento de MP:
   devolver 200 con { duplicado: true } y cortar. Sin ifs previos ni
   findFirst: la carrera la resuelve el indice, no el codigo.

4. Si el tipo no es "payment", devolver 200 y no hacer nada mas. MP manda
   merchant_order y otros topicos; ignorarlos explicitamente y dejar el
   PagoEvento como rastro.

5. Resolver de que club es el pago. Este es el punto dificil del webhook y hay
   que resolverlo con cuidado.

   El problema: para consultar el pago hace falta el access_token DEL CLUB
   (modelo marketplace, no hay un token global que sirva para cualquier pago).
   Pero el body de la notificacion solo trae `data.id`, el id del pago en MP.
   Es un huevo y gallina: para saber de que club es hay que consultarlo, y
   para consultarlo hay que saber de que club es.

   Resolver en este orden, sin llamadas a MP hasta tener el complejo:
     a) buscar Pago donde mpPaymentId = data.id. Si esta, ya tenemos
        complejoId. Es el caso de las notificaciones repetidas.
     b) si no esta, y el body trae external_reference, buscar el Pago por ahi.
        Es el caso normal de la primera notificacion.
     c) si ninguno de los dos da, NO adivinar probando token por token.
        Devolver 200 dejando el PagoEvento con procesadoOk false y
        error = "complejo_no_resuelto".

   El caso (c) no se pierde: el cron del paso 11 lo levanta, y ahi si se puede
   resolver, porque recorre los Pago PENDIENTE (que ya saben su complejoId) y
   pregunta por external_reference. El webhook no tiene ese camino disponible.

   Comentar todo esto en el archivo: quien lo lea dentro de un año necesita
   saber por que hay un caso que se devuelve sin procesar.

6. Con el token del club: clientePagos(token).get({ id: mpPaymentId }).
   Del resultado tomar status, status_detail, external_reference y
   transaction_amount. Convertir el monto a centavos con Math.round(x * 100).

7. Llamar a aplicarResultadoDePago(...) envuelto en conOrigen("cron", ...) de
   lib/auditoria-contexto: quien escribe es una notificacion externa, no una
   persona, y el log de auditoria tiene que decir eso.

8. Marcar el PagoEvento con procesadoOk true, o con el mensaje de error si
   fallo. En los DOS casos devolver 200: si devolvemos 500, MP reintenta la
   misma notificacion durante horas y el evento ya quedo guardado para que lo
   levante el cron.
   La unica excepcion son los 401 de firma del punto 2.

9. Loguear con console.error solo lo accionable: reason de firma, x-request-id,
   mpPaymentId. Nunca el access_token ni el payload entero.

Al terminar: npx tsc --noEmit && npm run lint
Y decime como probarlo local: si hace falta un tunel (ngrok/cloudflared) o si
conviene simular con curl armando la firma con MP_WEBHOOK_SECRET.
````

---

## Paso 7 — Inscripcion a torneo con pago

**Objetivo:** enganchar el motor al flujo que ya existe.

**Archivos:** `actions/torneos-inscripcion.ts`, `lib/pagos.ts`,
`app/torneos/[id]/registrarse/page.tsx`, `prisma/schema.prisma`.

**Terminado cuando:** anotarse en un torneo con precio redirige al checkout, y
el pago aprobado deja `Pareja.pago = true` y la pareja fuera del hold.

**Lo que hay que tocar con cuidado:** `registerPublicTorneoPair`
(`actions/torneos-inscripcion.ts:826`) hoy corre todas las validaciones —
sancion, sexo, categoria, duplicados, capacidad — y crea la `Pareja` dentro de
un `enTransaccion`. Ese orden se conserva entero; lo unico que cambia es el
final.

**El conteo de capacidad:** hoy
`mainCount = count({ torneoId, deletedAt: null, suplente: false })`. Con holds,
una `Pareja` pendiente de pago **tiene que contar**, o se venden dos veces la
ultima vacante. Y cuando el hold vence, tiene que dejar de contar.

````
PROMPT PASO 7

Contexto: repo padelnet. Integrando Mercado Pago segun
docs/prompts-mercadopago.md. Pasos 1-6 hechos: lib/pagos.ts con
crearPreferenciaDePago() y aplicarResultadoDePago(), el webhook andando, y
Torneo.precioInscCentavos.

Objetivo: que registerPublicTorneoPair (actions/torneos-inscripcion.ts:826)
cobre cuando el torneo tiene precio.

1. prisma/schema.prisma, en Pareja agregar:
     pagoExpiraAt DateTime?
   Comentario: mientras esta seteada y en el futuro, la inscripcion es un
   "hold": ocupa lugar contra la capacidad pero no esta confirmada. La libera
   el cron del paso 11. null = inscripcion normal, sin pago pendiente.
   Indice: @@index([torneoId, pagoExpiraAt])
   Migracion: "pareja_hold_pago"

2. lib/torneo-inscripcion-cupo.ts (nuevo) o, si ya existe un helper de cupo,
   ahi mismo:
   - export function whereParejaOcupaLugar(torneoId: number) que devuelva el
     where de Prisma para "parejas que ocupan un lugar del cuadro principal":
       torneoId, deletedAt: null, suplente: false,
       OR: [ { pagoExpiraAt: null }, { pagoExpiraAt: { gt: new Date() } } ]
     Comentario explicando que un hold vencido NO ocupa lugar aunque la fila
     siga existiendo, asi el cupo se libera solo aunque el cron se atrase.
   - Usarlo en registerPublicTorneoPair para el mainCount, y buscar con grep
     los otros lugares que cuentan inscriptos (lib/torneo-vista-publica.ts,
     actions/torneos-public.ts, listManagedTorneoInscripciones) y decidir en
     cada uno si el hold cuenta o no. Pegarme la lista de lugares encontrados y
     que decidiste en cada uno.

3. actions/torneos-inscripcion.ts, en registerPublicTorneoPair:
   - Sumar precioInscCentavos y evento.complejo.{id,name} al select del torneo.
   - Dejar TODAS las validaciones actuales exactamente como estan (sancion,
     sexo, categoria, duplicado, capacidad). No reordenar nada.
   - Al final, donde hoy crea o revive la Pareja:
     * Si precioInscCentavos es null o 0, o la feature PAGOS del complejo esta
       apagada, o el club no tiene cuenta MP vinculada: comportamiento actual,
       sin cambios, pagoExpiraAt null. Que un club sin Mercado Pago siga
       funcionando igual que hoy es requisito, no un extra.
     * Si hay precio: crear la Pareja con pagoExpiraAt = now + 15 min, y
       llamar a crearPreferenciaDePago dentro de la MISMA transaccion, con
       parejaId, tipo "INSCRIPCION", titulo `Inscripcion ${torneo.nombre}`,
       emailPagador = el mail de la sesion.
   - Cambiar RegisterTorneoPairResult para que pueda devolver
       { success: true, requierePago: true, initPoint: string }
     ademas de lo que devuelve hoy. Que sea aditivo: los llamadores que no
     saben de pagos tienen que seguir compilando.
   - Si la pareja va a lista de suplentes (shouldGoToWaitlist), NO cobrar.
     Un suplente paga si entra, no antes. pagoExpiraAt null.

4. lib/pagos.ts: implementar de verdad aplicarPagoDeInscripcion(tx, pago,
   aprobado), que en el paso 5 era un console.warn:
   - aprobado true: pareja.update -> pago: true, pagoExpiraAt: null,
     asignado: true.
   - aprobado false (rechazado/cancelado/expirado): pareja.update ->
     deletedAt: new Date(), pagoExpiraAt: null. Borrado logico, que es lo que
     usa el resto del modulo; no delete fisico.
   - devuelto: pago: false y deletedAt seteado, mas un console.warn con el
     torneoId, porque una devolucion despues de que arrancó el torneo es algo
     que alguien tiene que mirar a mano.

5. app/torneos/[id]/registrarse/page.tsx:
   - Mostrar el precio con formatearCentavos cuando el torneo lo tenga, y el
     texto de valorInsc como aclaracion debajo.
   - El boton pasa a decir "Inscribirse y pagar" cuando hay precio.
   - Cuando la action devuelve requierePago, redirect(initPoint).
   - Aviso: "Tenes 15 minutos para completar el pago. Pasado ese tiempo el
     lugar se libera."
   - Tailwind y tokens del tema; nada de clases de Bootstrap.

6. cancelPublicTorneoPair y cancelManagedTorneoPair: si la pareja tiene un
   Pago APROBADO, no dejar cancelar en silencio. Devolver un error que diga que
   hay un pago aprobado y que la devolucion la tiene que hacer el club desde
   Mercado Pago. La devolucion automatica NO entra en este paso.

Al terminar: npx tsc --noEmit && npm run lint && npm run check:auditoria
````

---

## Paso 8 — Flujo publico de reserva de turnos (todavia sin pago)

**Objetivo:** cerrar el agujero 2. Que un jugador pueda reservar una cancha.
Este paso **no toca Mercado Pago**.

**Archivos:** `actions/turnos-publico.ts` (nuevo),
`app/complejos/[slug]/reservar/` (nuevo), `prisma/schema.prisma`,
`lib/turnos-disponibilidad.ts` (nuevo).

**Terminado cuando:** un jugador logueado ve la grilla de horarios libres de un
club y reserva uno, y el turno aparece en el panel del admin.

Es el paso mas grande. Es un paso aparte a proposito: se puede mergear y usar
sin pagos, y si el paso 9 se demora, el club igual gana la reserva online.

**Lo que no se puede copiar del admin:** `actions/turnos.ts` empieza todo con
`ensureTurnosHabilitados`, que exige `ensureComplejoManagerAccess`. El flujo
publico necesita su propia autorizacion: sesion valida + mail verificado + sin
sancion vigente + feature `TURNOS` prendida. La logica de horarios
(`lib/turnos-horario.ts`) y de solapamiento (`lib/horarios.ts`) **si** se reusa.

````
PROMPT PASO 8

Contexto: repo padelnet, Next 16 App Router. Ver docs/prompts-mercadopago.md.
Pasos 1-7 hechos.

Hoy los turnos son 100% del admin: actions/turnos.ts arranca todo con
ensureTurnosHabilitados() -> ensureComplejoManagerAccess(). No existe ninguna
pantalla donde un JUGADOR reserve una cancha. Este paso la construye.

Este paso NO toca Mercado Pago. Sale a produccion solo si hace falta.

1. Leer primero, para reusar y no duplicar:
   - actions/turnos.ts (crearTurno:424, getTurnosCalendario:146, y el
     chequeo de solapamiento)
   - lib/turnos-horario.ts (resolverHorario, entraEnHorario, fechaKey,
     fechaConMinutos, fechaParaDB)
   - lib/horarios.ts (haySolapamiento)
   - cron/turnos-cron.ts (como materializa ocurrencias contra el horario)
   - app/admin/complejos/[id]/turnos/ (la UI de referencia)
   Pegame un resumen de que vas a reusar tal cual y que vas a tener que
   escribir nuevo, ANTES de escribir codigo.

2. prisma/schema.prisma:
   - enum BookingStatus: agregar PENDIENTE_PAGO
     Comentario: reserva creada pero no confirmada; ocupa la cancha mientras
     el hold vive y la libera el cron. El paso 9 la usa; el 8 la deja
     declarada sin usarla.
   - TurnoReserva: agregar
       expiraAt DateTime?
       origen String @db.VarChar(16) @default("ADMIN")   // "ADMIN" | "PUBLICO"
     Comentario en origen: separa lo que cargo el club de lo que reservo un
     jugador desde el sitio, que es lo que el club va a querer filtrar.
   - @@index([status, expiraAt]) en TurnoReserva
   - Migracion: "turnos_reserva_publica"

3. lib/turnos-disponibilidad.ts (nuevo, "server-only"):
   - export async function huecosDisponibles(args: {
       complejoId: number; fecha: string; duracionMin: number })
     Devuelve, por cancha activa del complejo, los huecos libres del dia:
       { canchaId, canchaLabel, precioCentavos, huecos: [{ inicioMin, endMin }] }
     Tiene que descontar, todo junto:
       a) el horario del complejo para ese dia (ComplejoHorario +
          ComplejoHorarioExcepcion, via resolverHorario)
       b) los TurnoSlot existentes no borrados con status RESERVADO o BLOQUEADO
       c) los TurnoSlot de series (ya materializados por el cron)
       d) los Partido de torneo agendados en esa cancha ese dia — crearTurno
          ya hace este chequeo, mirar como y reusar la misma consulta
       e) las reservas PENDIENTE_PAGO cuyo expiraAt todavia no vencio
     El precio sale de precioDeTurnoCentavos() del paso 4.
   - Granularidad de la grilla: 30 minutos. Constante nombrada, no un 30
     suelto.
   - No inventes zona horaria: usar exactamente el mismo manejo de fechas que
     lib/turnos-horario.ts, que ya resuelve el tema del @db.Date y el timezone
     del complejo.

4. actions/turnos-publico.ts (nuevo, "use server"):
   - async function ensurePuedeReservar(complejoId): sesion valida,
     session.emailVerified true (si no esta en la sesion, leerlo de la base),
     feature TURNOS habilitada, y sin Sancion vigente en ese complejo — mirar
     como lo resuelve registerPublicTorneoPair, que ya chequea sanciones, y
     reusar ese helper.
   - getDisponibilidadPublica(slug, fecha, duracionMin): resuelve el complejo
     por slug y devuelve huecosDisponibles + el horario del dia para dibujar
     la grilla.
   - reservarTurnoPublico({ slug, canchaId, fecha, inicioMin, duracionMin }):
     * Todo adentro de un enTransaccion.
     * Revalidar TODO del lado del servidor: horario, solapamiento contra
       slots y partidos, duracion permitida, que la fecha no sea pasada, y un
       limite de cuanto para adelante se puede reservar (constante,
       arrancar en 14 dias).
     * Crear TurnoSlot (status RESERVADO) + TurnoReserva (status CONFIRMADA,
       origen "PUBLICO", jugadorId = session.userId, precioCentavos congelado
       en el slot).
     * Limite anti-abuso: max 2 reservas futuras CONFIRMADA por jugador por
       complejo. Constante nombrada con comentario.
     * Devolver { success, reservaId } o { success: false, error }.
   - cancelarReservaPropia(reservaId): solo el dueño, solo si falta mas de
     una ventana minima (constante, arrancar en 12 horas). Marca CANCELADA,
     cancelledAt, y borra logicamente el slot si no es de una serie.
   - misReservas(): las reservas futuras del usuario logueado, para el perfil.

5. UI, app/complejos/[slug]/reservar/page.tsx:
   - Server component que lee la disponibilidad; client component para el
     selector de fecha y la grilla.
   - Selector de dia (react-day-picker ya esta en el proyecto), selector de
     duracion (60 / 90 / 120), y la grilla de horarios por cancha.
   - Cada hueco muestra la hora y el precio si lo hay.
   - Estados vacios de verdad: club cerrado ese dia, sin canchas libres, o
     feature apagada.
   - Sumar "Reservar" a la navegacion de app/complejos/[slug]/components/
     ComplejoTabs.tsx, visible solo si la feature TURNOS esta prendida.
   - Sumar "Mis reservas" al perfil, con el boton de cancelar.
   - Tailwind y los tokens del tema. Nada de clases de Bootstrap.

6. Que el panel del admin siga andando igual: las reservas con origen
   "PUBLICO" tienen que aparecer en app/admin/complejos/[id]/turnos/ con el
   nombre del jugador, y marcadas de alguna forma como reserva online.

Al terminar: npx tsc --noEmit && npm run lint && npm run check:turnos
````

---

## Paso 9 — Turno con pago

**Objetivo:** el mismo enganche del paso 7, pero sobre el flujo del paso 8.

**Archivos:** `actions/turnos-publico.ts`, `lib/pagos.ts`,
`lib/turnos-disponibilidad.ts`, `app/complejos/[slug]/reservar/`.

**Terminado cuando:** reservar una cancha con precio redirige al checkout, y el
hueco queda bloqueado durante el hold y se libera si no se paga.

**La diferencia con el paso 7:** aca el hold no es un contador de capacidad, es
un **solapamiento**. Una reserva `PENDIENTE_PAGO` viva tiene que hacer que ese
hueco desaparezca de la grilla de todos los demas. Ese chequeo ya lo dejo
listo el punto 3.e del paso 8.

````
PROMPT PASO 9

Contexto: repo padelnet. Ver docs/prompts-mercadopago.md. Pasos 1-8 hechos:
existe el flujo publico de reserva (actions/turnos-publico.ts +
app/complejos/[slug]/reservar/), lib/pagos.ts, el webhook, y precios de cancha.

Objetivo: cobrar al reservar, igual que el paso 7 hizo con las inscripciones.

1. actions/turnos-publico.ts, en reservarTurnoPublico:
   - Calcular precioCentavos con precioDeTurnoCentavos().
   - Si es null o 0, o la feature PAGOS esta apagada, o el club no tiene
     cuenta MP vinculada: igual que hoy, TurnoReserva CONFIRMADA. Un club sin
     Mercado Pago tiene que seguir funcionando.
   - Si hay precio: dentro de la MISMA transaccion,
     * TurnoSlot con status RESERVADO (ocupa desde ya, si no se lo lleva otro)
     * TurnoReserva con status PENDIENTE_PAGO y expiraAt = now + 15 min
     * crearPreferenciaDePago({ tipo: "TURNO", turnoReservaId, complejoId,
       montoCentavos: precioCentavos, titulo: `Turno ${canchaLabel} ${fecha}
       ${hora}`, emailPagador })
   - Devolver { success: true, requierePago: true, initPoint }.
   - Antes de crear nada, verificar que el jugador no tenga ya una reserva
     PENDIENTE_PAGO viva en ese complejo. Si la tiene, devolver el initPoint
     de ESA en vez de crear otra, con un mensaje tipo "Ya tenes una reserva
     esperando el pago". Sin esto, alguien abre diez pestañas y bloquea la
     grilla entera gratis.

2. lib/pagos.ts: implementar aplicarPagoDeTurno(tx, pago, aprobado), que en el
   paso 5 era un console.warn:
   - aprobado true: TurnoReserva -> status CONFIRMADA, pagado: true,
     pagadoAt: now, expiraAt: null. El slot ya estaba RESERVADO.
   - aprobado false: TurnoReserva -> status CANCELADA, cancelledAt: now,
     expiraAt: null; y el TurnoSlot -> deletedAt: now, para que el hueco
     vuelva a la grilla. Comentar que se borra el slot y no se lo pasa a LIBRE
     porque el resto del modulo trata el borrado logico como "este turno no
     existio".
   - devuelto: status CANCELADA + pagado false + console.warn con el
     turnoSlotId. Una devolucion de un turno ya jugado la mira una persona.

3. lib/turnos-disponibilidad.ts: confirmar que el punto (e) del paso 8
   —descontar las reservas PENDIENTE_PAGO no vencidas— esta implementado y
   andando. Si quedo como TODO, hacerlo ahora: es lo que evita vender el mismo
   hueco dos veces.

4. UI app/complejos/[slug]/reservar/:
   - Precio visible en cada hueco.
   - Boton "Reservar y pagar" cuando hay precio.
   - redirect(initPoint) cuando la action devuelve requierePago.
   - El mismo aviso de los 15 minutos que en el paso 7.

5. cancelarReservaPropia: si la reserva tiene un Pago APROBADO, no cancelar en
   silencio. Mismo criterio que en el paso 7: avisar que la devolucion la hace
   el club desde Mercado Pago.

6. En el panel del admin (app/admin/complejos/[id]/turnos/), mostrar el estado
   de pago de cada turno: pagado online, pagado a mano (el marcarPagoTurno que
   ya existe), o pendiente. marcarPagoTurno tiene que seguir funcionando para
   los turnos que se cobran en el mostrador — no romperlo ni esconderlo.

Al terminar: npx tsc --noEmit && npm run lint && npm run check:turnos
````

---

## Paso 10 — Pagina de retorno

**Objetivo:** que el usuario que vuelve del checkout entienda que paso, sin que
esa pagina decida nada.

**Archivos:** `app/pagos/[referencia]/page.tsx` (nuevo).

Una sola pagina para `success`, `pending` y `failure`. El estado sale de la
base (que lo escribio el webhook), no del query param que trae el redirect: ese
query param lo controla el usuario.

````
PROMPT PASO 10

Contexto: repo padelnet. Ver docs/prompts-mercadopago.md. Pasos 1-9 hechos.
lib/pagos.ts expone pagoPorReferencia(externalReference).

Crear app/pagos/[referencia]/page.tsx.

Regla que no se negocia (decision D3 del documento): esta pagina LEE. El
estado del pago lo escribe el webhook y nadie mas. Los query params que trae
el redirect de Mercado Pago (collection_status, payment_id, etc.) se IGNORAN
por completo: los controla el usuario, que puede escribir la url a mano.

1. Server component. Resuelve el pago con pagoPorReferencia(params.referencia).
   - Si no existe: notFound().
   - Verificar que el pago sea del usuario logueado (o que sea admin del
     complejo). Si no, notFound(): la referencia es aleatoria pero igual no
     queremos que sea un lookup publico.

2. Render segun el estado:
   - APROBADO: tilde verde, "Pago confirmado", monto, que se pago
     (torneo o turno con cancha/fecha/hora), y un link al detalle
     (/torneos/<id> o /perfil/reservas).
   - PENDIENTE: "Estamos confirmando tu pago". Explicar que Mercado Pago puede
     tardar un momento y que no hace falta pagar de nuevo. Poner un refresh
     automatico: client component chico que hace router.refresh() cada 5
     segundos, hasta 12 veces, y despues muestra "Si en unos minutos no se
     confirma, escribinos". Nada de polling infinito.
   - RECHAZADO / CANCELADO: explicar que no se cobro, y un boton para
     reintentar que vuelve a la pantalla de inscripcion o de reserva.
   - EXPIRADO: "El tiempo para pagar vencio y se libero el lugar", con el link
     para volver a intentar.
   - DEVUELTO: "Se devolvio el pago", con el monto.

3. Estilar con Tailwind y los tokens del tema, que funcione en claro y oscuro.
   Nada de clases de Bootstrap. Mirar como resuelven los estados otras
   pantallas del sitio y seguir ese lenguaje visual.

4. En el layout o en un componente compartido, un helper para el badge de
   estado del pago (color + label por PagoEstado), porque lo vuelve a usar el
   panel del paso 12. Ponerlo donde lo puedan importar los dos.

Al terminar: npx tsc --noEmit && npm run lint
````

---

## Paso 11 — Cron de expiracion y conciliacion

**Objetivo:** que el sistema se arregle solo cuando el webhook no llega.

**Archivos:** `cron/pagos-cron.ts` (nuevo),
`app/api/cron/pagos/route.ts` (nuevo), crontab del VPS.

**Terminado cuando:** un `Pago` `PENDIENTE` vencido queda `EXPIRADO` y su lugar
liberado, y un pago aprobado en MP cuyo webhook se perdio termina aplicandose.

Esto no es opcional. Un webhook perdido con holds significa un lugar bloqueado
para siempre. Van tres trabajos en la misma corrida:

1. **Expirar holds** vencidos.
2. **Reconciliar** los `PENDIENTE` con mas de 10 minutos, preguntandole a MP.
3. **Reprocesar** los `PagoEvento` que quedaron con `procesadoOk = false`
   (incluido el caso `complejo_no_resuelto` del paso 6).

````
PROMPT PASO 11

Contexto: repo padelnet. Ver docs/prompts-mercadopago.md. Pasos 1-10 hechos.
Deploy en VPS Ubuntu propio (no Vercel): hay crontab del sistema disponible.

Seguir el molde EXACTO que ya usan los otros cron del repo: mirar
app/api/cron/turnos/route.ts y cron/turnos-cron.ts antes de escribir.

1. cron/pagos-cron.ts ("server-only"), con tres funciones y una que las corre
   a las tres:

   a) expirarHoldsVencidos(): Pago en estado PENDIENTE con expiraAt < now.
      Por cada uno, dentro de enTransaccion: estado -> EXPIRADO, y liberar la
      fila de dominio reusando aplicarPagoDeInscripcion / aplicarPagoDeTurno
      de lib/pagos.ts con aprobado = false. No duplicar esa logica aca.
      Procesar de a 100 y en lote, no todo de una.

   b) reconciliarPendientes(): Pago PENDIENTE creados hace mas de 10 minutos
      y menos de 7 dias. Por cada uno: accessTokenDeComplejo(complejoId) y
      clientePagos(token).search({ options: { external_reference: pago
      .externalReference } }). Si aparece un pago, llamar a
      aplicarResultadoDePago() con lo que devolvio.
      Comentario del por que: un webhook se puede perder (deploy, caida, red).
      Sin esto, un jugador que pago se queda sin lugar y el club sin saberlo.
      Nota: aca SI se puede resolver el token, porque el Pago ya sabe de que
      complejo es. Es el camino que el webhook no tiene cuando le llega un
      payment id que nunca vio.

   c) reprocesarEventosFallidos(): PagoEvento con procesadoOk false de las
      ultimas 48hs. Reintenta el mismo camino que el webhook. Marca procesadoOk
      o actualiza el error. Maximo 3 intentos por evento: agregar un campo
      intentos Int @default(0) a PagoEvento con su migracion.

   d) procesarPagos(): corre las tres y devuelve
      { expirados, reconciliados, reprocesados, errores } para el log.

2. app/api/cron/pagos/route.ts: copiar la estructura de
   app/api/cron/turnos/route.ts tal cual — mismo chequeo de
   Bearer ${CRON_SECRET}, mismo fallar cerrado si no hay secret, mismo
   conOrigen("cron", ...), mismo formato de respuesta.

3. Documentar en el propio archivo la linea de crontab. Cada 5 minutos:
   */5 * * * * curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" \
     https://<dominio>/api/cron/pagos >> /var/log/padelnet-pagos.log 2>&1
   Cinco minutos porque el hold es de 15: da tres corridas antes de que el
   lugar quede trabado.

4. Que sea idempotente y seguro de correr dos veces en paralelo: los updates
   de estado tienen que ir condicionados al estado anterior (updateMany con
   where que incluya estado PENDIENTE), no un read-then-write.

Al terminar: npx tsc --noEmit && npm run lint && npm run check:auditoria
Y decime como probarlo a mano con curl.
````

---

## Paso 12 — Panel de pagos del club

**Objetivo:** que el club vea la plata sin entrar a Mercado Pago.

**Archivos:** `actions/pagos-reportes.ts` (nuevo),
`app/admin/complejos/[id]/pagos/` (extender lo del paso 3).

````
PROMPT PASO 12

Contexto: repo padelnet. Ver docs/prompts-mercadopago.md. Pasos 1-11 hechos.
Ya existe app/admin/complejos/[id]/pagos/ con la vinculacion de la cuenta.

Objetivo: la pestaña de pagos del club.

1. actions/pagos-reportes.ts ("use server"), todo detras de
   requireComplejoRole(complejoId, ["ADMIN"]):
   - listarPagos({ complejoId, desde, hasta, estado?, tipo?, pagina }):
     paginado, ordenado por createdAt desc. Cada fila:
     fecha, tipo, quien pago (nombre + mail), que pago (torneo o
     cancha/fecha/hora), monto, estado, mpPaymentId.
     Reusar el patron de paginacion que ya usan las otras listas del admin
     (mirar listManagedTorneoInscripciones y las tablas de
     app/complejos/[slug]/components/usePagedItems.ts).
   - resumenPagos({ complejoId, desde, hasta }): totales por estado y por
     tipo, en centavos, y el neto aprobado.
   - Nunca devolver tokens ni el payload crudo del webhook.

2. UI:
   - Tabla con filtros de rango de fechas, estado y tipo.
   - Tarjetas arriba con el resumen: cobrado, pendiente, devuelto.
   - Reusar el badge de estado del paso 10.
   - Export a CSV. jspdf ya esta en el proyecto si ademas se quiere PDF, pero
     el CSV es lo que sirve para el contador.
   - Mirar si app/admin/reportes/ (que ya existe sin commitear) tiene un patron
     de reporte establecido y seguirlo en vez de inventar otro.
   - Tailwind y tokens del tema. Nada de Bootstrap.

3. Al detalle de una inscripcion y de un turno, sumarle el estado del pago con
   link a esta pantalla.

Al terminar: npx tsc --noEmit && npm run lint
````

---

## Paso 13 — Mail de comprobante

**Objetivo:** que el pagador tenga un comprobante propio, sin depender del mail
de Mercado Pago.

````
PROMPT PASO 13

Contexto: repo padelnet. Ver docs/prompts-mercadopago.md. Pasos 1-12 hechos.
lib/email.ts ya manda mails con Resend (enviarMailConfirmacion,
enviarMailRecuperacion, enviarMailSolicitudComplejo): copiar ese estilo de
plantilla y de manejo de errores.

1. lib/email.ts: enviarMailComprobantePago(params: {
     email, nombre, complejoNombre, tipo, detalle, montoCentavos,
     mpPaymentId, fecha })
   - Asunto: `Pago confirmado - ${complejoNombre}`
   - Cuerpo con el mismo layout que los mails que ya existen: monto, que se
     pago, cuando, el numero de operacion de Mercado Pago, y el nombre del club
     como cobrador (que quede claro que cobra el club, no PadelNet).
   - Para un turno: cancha, fecha y hora. Para una inscripcion: torneo y con
     quien se anoto.

2. Llamarlo desde aplicarPagoDeInscripcion y aplicarPagoDeTurno, SOLO cuando
   aprobado es true, y DESPUES de que la transaccion commitee — no adentro.
   Un fallo de Resend no puede hacer rollback de un pago que Mercado Pago ya
   cobro. Envolver en try/catch con console.error y seguir.

3. En el mail de inscripcion, avisarle tambien a la pareja (player2), que no
   pago pero quedo anotada.

Al terminar: npx tsc --noEmit && npm run lint
````

---

## Paso 14 — Sandbox y salida a produccion

**Objetivo:** probar de punta a punta antes de tocar plata real.

````
PROMPT PASO 14

Contexto: repo padelnet. Ver docs/prompts-mercadopago.md. Pasos 1-13 hechos.
Deploy en VPS Ubuntu propio, no Vercel.

Armar docs/pagos-pruebas.md con el procedimiento de prueba y la salida a
produccion. Investigar en la documentacion vigente de Mercado Pago los datos
concretos (usuarios de prueba, tarjetas, codigos de estado forzado) en vez de
darlos de memoria, y citar el link de cada cosa.

El documento tiene que cubrir:

1. Como crear los usuarios de prueba (vendedor y comprador) y con cual se
   vincula el club durante las pruebas.

2. Las tarjetas de prueba y como forzar cada resultado: aprobado, rechazado
   por fondos, rechazado por codigo de seguridad, pendiente.

3. Como exponer el webhook desde local para probarlo de verdad (tunel) y como
   dispararlo a mano desde el panel de Mercado Pago.

4. Checklist de pruebas end-to-end, marcando el resultado esperado de cada una:
   - inscripcion pagada -> Pareja.pago true, asignado true, mail enviado
   - inscripcion rechazada -> Pareja borrada logicamente, lugar liberado
   - inscripcion abandonada (cerrar el checkout) -> a los 15 min el cron la
     expira y el lugar vuelve
   - turno pagado -> reserva CONFIRMADA y el hueco fuera de la grilla
   - turno abandonado -> el hueco vuelve a la grilla
   - webhook duplicado (dispararlo dos veces) -> se procesa una sola vez
   - webhook con firma invalida -> 401 y nada escrito
   - webhook perdido (apagar la app, pagar, prenderla) -> el cron de
     conciliacion lo levanta
   - dos usuarios peleando la ultima vacante -> uno solo la consigue
   - club SIN Mercado Pago vinculado -> todo sigue funcionando como antes,
     sin cobro

5. Pasaje a produccion:
   - cambiar las credenciales de la app de test a produccion
   - OJO: MP_WEBHOOK_SECRET es DISTINTA en test y en produccion. Es la causa
     numero uno de webhooks que validan en test y fallan en prod.
   - configurar la url del webhook en el panel de MP
   - re-vincular cada club con su cuenta real (las vinculaciones de prueba
     tienen liveMode false y hay que rehacerlas)
   - la linea de crontab del paso 11
   - las variables de entorno en el .env del VPS
   - verificar que la app corra sobre HTTPS: Mercado Pago no manda
     notificaciones a HTTP

6. Que mirar despues de la primera semana: pagos que quedaron PENDIENTE mas de
   una hora, PagoEvento con procesadoOk false, y la relacion entre pagos
   iniciados y aprobados (si mucha gente arranca y no termina, algo de la UI
   esta mal).
````

---

## Lo que este plan deliberadamente deja afuera

Vale tenerlo escrito para que no aparezca como sorpresa a mitad de camino:

- **Devoluciones automaticas.** Los pasos 7 y 9 bloquean la cancelacion de algo
  ya pagado y mandan al club a hacerla desde Mercado Pago. Automatizar el
  refund es un paso 15 posible, pero mezcla plata con reglas de negocio (¿se
  devuelve todo si cancela el dia antes?) que hoy no estan definidas.
- **Pago dividido entre los dos jugadores de la pareja.** Cobra uno solo, el
  que se anota. Partirlo en dos preferencias con dos holds cruzados es un
  problema bastante mas grande.
- **Suscripciones / abonos mensuales de turno fijo.** `TurnoSerie` existe y
  seria el lugar natural, pero pide `PreApproval` de Mercado Pago, que es otro
  producto con su propio ciclo de vida.
- **Comision de la plataforma.** El campo `marketplace_fee` esta disponible en
  la preferencia y el paso 5 lo deja a mano, pero va en cero.
- **Otros medios de pago** (transferencia manual con comprobante, efectivo en
  el mostrador). El `marcarPagoTurno` que ya existe cubre el efectivo y se
  mantiene funcionando.
