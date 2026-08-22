# PadelNet — Revisión funcional por rol, huecos y errores

Relevamiento del estado de la app al 2026-08-20. Cubre las 62 rutas de `app/`,
las 20 server actions de `actions/` y el modelo de datos de `prisma/schema.prisma`.

Cada afirmación de este documento sale de leer el código, no de suponer. Donde
digo "no existe" quiere decir que busqué y no hay implementación.

---

## 1. Cómo se resuelve el rol (y por qué importa)

Hay **tres** sistemas de roles conviviendo, y no están conectados entre sí:

| Dónde vive | Valores | Quién lo usa |
|---|---|---|
| `User.platformRole` (DB) | `USER`, `SUPERADMIN`, `SUPPORT` | Solo el login, para derivar el rol de sesión |
| Sesión JWT `type` (`lib/session.ts`) | `jugador`, `admin`, `superadmin`, `dataentry`, `fiscal` | Los guards de página (`getSessionRole`) |
| `ComplejoMembership.role` (DB) | `OWNER`, `ADMIN`, `DATAENTRY`, `FISCAL`, `STAFF` | `ensureComplejoManagerAccess`, que solo acepta `OWNER`/`ADMIN` |

El login (`actions/auth.ts:38-163`) resuelve así:

```
SUPERADMIN            -> superadmin
SUPPORT               -> admin
USER + membership OWNER/ADMIN activa -> admin
USER                  -> jugador
```

### Consecuencias

- **`dataentry` y `fiscal` son inalcanzables.** Ningún camino del login los
  produce. Un usuario con membership `DATAENTRY`, `FISCAL` o `STAFF` entra como
  `jugador` y no ve nada de gestión.
- **`STAFF` no hace absolutamente nada**, ni siquiera existe en `UserRole`.
- **`lib/roles.ts` está muerto casi entero.** De sus 8 helpers
  (`canManageEventos`, `canManageTorneos`, `canSetResultados`,
  `canManagePartidos`, `canReadRecategorizacion`, `canWriteRecategorizacion`,
  `canManageUsers`, `canManageAdminResources`) **ninguno se usa en ningún
  archivo**. Solo `hasRole` está vivo, en 3 lugares. `isUserRole`, `USER_ROLES`
  y `ROLE_LABELS` tampoco se usan.
- `canWriteRecategorizacion` devuelve true solo para `fiscal`, un rol que no
  existe: aunque se usara, **nadie podría escribir una recategorización jamás**.
- El rol queda **congelado 7 días** dentro del JWT. Si a un admin le sacan la
  membership, sigue siendo `admin` para los guards de página hasta que expire el
  token. Lo salva a medias que `ensureComplejoManagerAccess` revalida contra la
  DB en cada action de complejo — pero los guards de *página* no.

---

## 2. Qué ofrece hoy cada rol

### Visitante (sin sesión)

| Puede | Ruta |
|---|---|
| Home | `/` |
| Listado y detalle de complejos | `/complejos`, `/complejos/[id]` |
| Del complejo: eventos, calendario, jugadores, ranking, recategorización, reglamento | `/complejos/[id]/*` |
| Listado y detalle de torneos, con zonas y llave | `/torneos`, `/torneos/[id]` |
| Registrarse / iniciar sesión | `/registrarse`, `/login` |

### Jugador

Todo lo del visitante, más:

| Puede | Ruta |
|---|---|
| Ver y editar su perfil, subir avatar | `/perfil`, `/api/perfil/avatar` |
| Preferencias de notificaciones push | `/perfil/notificaciones` |
| Inscribirse a un torneo con un compañero | `/torneos/[id]/registrarse` |
| Ver inscriptos de un torneo | `/torneos/[id]/inscripciones` |
| Editar su inscripción (cambiar compañero) | `/torneos/[id]/inscripciones/[iid]/editar` |

**No puede:** darse de baja de un torneo (§4.2).

### Admin de complejo (`OWNER` / `ADMIN`, o `platformRole = SUPPORT`)

Todo lo del jugador, más — acotado a los complejos donde tiene membership:

| Área | Qué puede | Ruta |
|---|---|---|
| Complejos | Ver los suyos, editar | `/admin/complejos`, `/admin/complejos/[id]` |
| Canchas | Alta, edición, baja | `/admin/complejos/[id]/canchas/**`, `/canchas` |
| Eventos | Listar, crear, editar, borrar | `/admin/complejos/[id]/eventos/**` |
| Eventos (global) | Listar y borrar los de todos sus complejos | `/admin/eventos` |
| Torneos | Listar, crear, editar, borrar | `.../eventos/[eventoId]/torneos/**` |
| Torneos (global) | Listar | `/admin/torneos` |
| Inscripciones | Ver, inscribir parejas a mano, editar | `.../torneos/[torneoId]/inscripciones` |
| Zonas | Armar zonas (manual, o por tabla de siembra) | `.../torneos/[torneoId]/zonas` |
| Partidos | Generar la grilla completa y guardarla | `.../torneos/[torneoId]/partidos` |
| Resultados | Cargar sets y ganador | `.../torneos/[torneoId]/resultados` |
| Turnos de cancha | Calendario, reservas, cobros, turnos fijos, horarios | `/admin/complejos/[id]/turnos` (si la feature está prendida) |

### Superadmin

Todo lo del admin **sobre cualquier complejo**, más:

| Área | Qué puede | Ruta |
|---|---|---|
| Complejos | Crear, editar, borrar cualquiera | `/superadmin/complejos/**`, `/complejos/new` |
| Usuarios | Alta, edición, baja, asignar admin a un complejo | `/superadmin/usuarios/**` |
| Funcionalidades | Prender/apagar features por complejo | `/superadmin/funcionalidades`, `/superadmin/complejos/[id]/funcionalidades` |

### Roles fantasma

`dataentry` y `fiscal` tienen entradas de menú en `site-header.tsx:37-41` que
**nadie puede ver nunca**, porque el login no asigna esos roles.

---

## 3. Hallazgos críticos de seguridad

> Son lo más urgente del documento. Las server actions de Next son endpoints
> POST públicos: que la UI esté detrás de un layout con guard **no** protege la
> action. Sin `middleware.ts` (no existe), el único control es el que cada
> action haga por su cuenta.

### 3.1 `actions/usuarios.ts` no tiene ninguna verificación — escalada de privilegios

Las 7 server actions del archivo no llaman a `getSession()`, `assertSuperadmin()`
ni a nada equivalente. Verificado: cero coincidencias de sesión o rol en todo el
archivo. Lo único que las "protege" es que la UI vive bajo `/superadmin`.

Cualquiera que pueda invocar la action puede:

- `createUsuario({ platformRole: "SUPERADMIN", ... })` → **crearse un superadmin**;
- `updateUsuario(id, ...)` → cambiarle rol, email o contraseña a cualquiera,
  incluido un superadmin existente;
- `assignUsuarioAdminToComplejo(userId, complejoId)` → **darse admin de cualquier complejo**;
- `deleteUsuario(id)` → dar de baja a cualquier usuario;
- `listUsuarios()` → volcar el padrón completo con email, teléfono y DNI.

**Arreglo:** `await assertSuperadmin()` como primera línea de las 7. Es el mismo
patrón que ya usa `actions/complejo-features.ts`.

### 3.2 IDOR en notificaciones — RESUELTO

- `actions/notificationPreferences.ts` (4 actions) recibe `userId` por parámetro
  y no valida sesión: se pueden **leer y modificar las preferencias de cualquier
  usuario**.
- `actions/notificaciones.ts` (13 actions, sin guards): `getUserNotifications(userId)`
  lee las notificaciones de cualquiera; `createNotification` / `deleteNotification`
  permiten inyectar o borrar avisos.

> **Resuelto.** El `userId` sale de la sesión y se saco de las firmas, para que
> no haya forma de volver a pasarlo desde el cliente. La administración de la
> cola quedó con `assertSuperadmin()`, y `createBulkNotifications` —el único
> helper que se usaba de verdad— se movió a `lib/notificaciones.ts`: al no ser
> una server action deja de ser un endpoint invocable.
>
> Revisando aparecieron dos agujeros mas de la misma clase en `actions/firebase.ts`:
> `saveToken(token, userId)` permitía **registrar el propio dispositivo contra la
> cuenta de otro y quedarse recibiendo sus push**, y `sendPush` —código muerto,
> el envío real va por `lib/push.ts`— permitía mandarle cualquier mensaje a
> cualquiera. Los dos cerrados.

### 3.3 `SESSION_SECRET` con default inseguro

`lib/session.ts:6` cae a `"your-secret-key-change-this-in-production"` si la
variable no está. Si se despliega sin setearla, cualquiera puede firmar un JWT
de superadmin. Debería tirar error en el arranque en vez de tener fallback.

### 3.4 El rol vive 7 días en el JWT

Ver §1. Revocar una membership no cierra la sesión. Conviene revalidar el rol
contra la DB en los guards de página, o acortar la vida del token.

---

## 4. Huecos funcionales

### 4.1 La llave nunca avanza — el torneo no puede pasar de la fase de zonas

Es el agujero funcional más grande. `saveTorneoPartidoResultado`
(`actions/torneos-partidos.ts:249`) escribe ganador, perdedor y sets, y **nada
más**: no toca `llave`, ni `pareja1Letra`, ni los `parejaId` de los partidos de
eliminatoria. La única mención a `pareja1Id` dentro de la función es el `select`
que valida que el ganador pertenezca al partido.

Los partidos de llave se guardan con `pareja1Id`/`pareja2Id` en `null` y letras
como `"1A"` / `"2B"`. **No existe el proceso que, cargados los resultados de
zona, resuelva "1A" a una pareja concreta.** Tampoco el que propague el ganador
de octavos a cuartos.

Resultado práctico: se pueden generar y cargar los partidos de zona, y el cuadro
queda dibujado con placeholders que nunca se llenan.

**Falta:** una action `resolverLlave(torneoId)` que (a) calcule las posiciones de
cada zona, (b) mapee `1A`/`2B`/`3A` a `parejaId`, (c) al cerrarse un partido de
llave, escriba el ganador en el partido siguiente. Las posiciones ya se calculan
—con desempate por puntos, sets y games— en `actions/torneos-public.ts:770-830`;
esa lógica se puede extraer a `lib/` y reusar.

### 4.2 No se puede dar de baja una inscripción

`actions/torneos-inscripcion.ts` expone 5 actions: leer datos, inscribir
(pública y por admin), leer para editar, y editar. **No hay ninguna baja**:
verificado, cero `delete`, `deleteMany` o marcado de `deletedAt` en el archivo.
La UI de inscripciones del admin tampoco tiene botón de eliminar.

Consecuencias:
- Si una pareja no puede jugar, la única salida es borrar filas a mano en la DB.
- **La lista de suplentes no sirve para nada**: el campo `suplente` se setea al
  inscribir según la capacidad, pero como nadie se baja nunca, no hay promoción
  de suplente a titular. No existe código que pase `suplente: true` a `false`.

### 4.3 Recategorización: solo lectura

El modelo `Recategorizacion` y la página `/complejos/[id]/recategorizacion`
existen, pero la única query en todo el código es un `findMany`
(`actions/complejos-public.ts:454`). **No hay forma de cargar una
recategorización desde la app.** Sumado a que `canWriteRecategorizacion` exige el
rol `fiscal`, que no existe (§1), la feature está a medio hacer.

### 4.4 Sin verificación de email — RESUELTO

> **Resuelto.** El registro emite un token y manda el mail; `/confirmar-email`
> lo valida. Se sumó `User.emailVerified`, que faltaba, y los 68 usuarios que ya
> existían quedaron marcados como verificados: la verificación aplica de ahí en
> adelante.
>
> Un usuario sin confirmar entra y navega, pero **no puede inscribirse a un
> torneo**: por ahí salen los avisos de partidos y cambios de horario, así que
> la dirección tiene que ser real. El alta que hace el admin no está sujeta a eso.
>
> `resend` ya estaba en package.json sin usarse; ahora lo envuelve
> `lib/email.ts`. Si faltan `RESEND_API_KEY` / `EMAIL_FROM` no se rompe nada: se
> loguea el link y se sigue, para poder probar el circuito en dev.
>
> Sobre la misma infraestructura se sumo la **recuperacion de contrasena**:
> `/recuperar` pide el link y `/recuperar/nueva` lo usa, con el acceso desde el
> login. `EmailVerification.purpose` separa los dos tipos de token, para que un
> link de verificacion no sirva para cambiar la contrasena ni al reves.

### 4.5 Columnas denormalizadas que nadie escribe

En `Pareja`: `puntos`, `partidoGanados`, `partidoPerdidos`, `setGanados`,
`setPerdidos`, `gameGanados`, `gamePerdidos`, `posicionActual`, `posicionFinal`.
**Ninguna se escribe nunca.** Las posiciones se recalculan al vuelo en la vista
pública, así que las columnas son ruido que invita a leer datos que siempre
valen 0.

Igual `Partido.fiscalizadoBy`: solo aparece en el schema zod, nunca se escribe ni
se lee.

### 4.6 Modelos del schema sin ninguna implementación

`Generacion`, `Sponsor`, `ComplejoSponsor`, `EmailVerification`. Cero queries.
Los sponsors tienen tablas, relación con complejo y campo de orden, pero no hay
ni ABM ni renderizado.

### 4.7 El superadmin no tiene turnos — RESUELTO

> Resuelto en dos pasos. La unificación de roles hizo que un superadmin resuelva
> como `ADMIN` en cualquier complejo, así que `/admin/complejos/[id]/turnos` ya
> le abría; lo que quedaba roto era el link, que lo mandaba a
> `/superadmin/complejos/[id]/turnos`. Se resolvió unificando el árbol (§5).

---

## 5. Rutas: asimetrías y links rotos — RESUELTO

> El árbol de superadmin duplicaba la gestión de complejo/evento/torneo: 1082
> líneas casi idénticas en dos archivos, más una decena de wrappers, con links
> cruzados inconsistentes, dos rutas huérfanas y un link roto a
> `/superadmin/.../zonas`.
>
> **Ahora hay un solo árbol.** La gestión vive en `/admin/**`, cuyo layout acepta
> al superadmin (`administraAlgunComplejo()` devuelve true para `SUPERADMIN`).
> Se borraron los duplicados y las pantallas de superadmin linkean ahí.
>
> `/superadmin` conserva solo lo que le es propio:
>
> ```
> /superadmin/usuarios/**              alta y edicion de usuarios
> /superadmin/funcionalidades          matriz de features
> /superadmin/complejos                listado, con alta y baja
> /superadmin/complejos/new
> /superadmin/complejos/[id]           editar el complejo
> /superadmin/complejos/[id]/funcionalidades
> /superadmin/eventos, /superadmin/torneos   listados cross-complejo
> ```
>
> En `ComplejosPageClient` la constante `GESTION_BASE` marca la frontera: los
> accesos compartidos (eventos, canchas, turnos) van siempre a `/admin`, y
> `basePath` queda para lo propio de cada sección.

## 6. Errores y omisiones de UI — RESUELTO

Los seis puntos están corregidos. Lo que se hizo, en orden:

- **6.1** — `app/admin/components/NuevoEnComplejoModal.tsx`, montado en los
  cuatro listados globales (`/admin/eventos`, `/admin/torneos`,
  `/superadmin/eventos`, `/superadmin/torneos`). Pide complejo (y evento, para
  torneos) y recién ahí navega al formulario de alta, que ya existía.
- **6.2** — se borraron `MOCK_GRUPOS` y `MOCK_LLAVE` de `TorneoDetailTabs.tsx`;
  en su lugar hay un estado vacío por pestaña.
- **6.3** — fuera `/#ajustes` y `/#suscripcion` de `site-header.tsx`.
- **6.4** — `components/Breadcrumbs.tsx` + `lib/breadcrumbs-gestion.ts`, en las
  10 páginas del árbol de gestión. En mobile colapsa los tramos del medio con
  CSS puro (`hidden sm:flex`), sin medir anchos. Cubierto por
  `npm run check:breadcrumbs`.
- **6.5** — `Complejo.reglamento` (`@db.Text`) + editor en
  `/admin/complejos/[id]/reglamento` con Markdown mínimo propio
  (`lib/markdown-simple.ts`, sin `dangerouslySetInnerHTML`).
- **6.6** — ver abajo: de 42 clases muertas a 0, verificado por
  `npm run check:css`.

**Corrección al informe original**, medida sobre el CSS generado: 6.6 decía que
las clases de Bootstrap "no hacen nada". Es cierto solo en parte. `globals.css`
**sí define** `.btn`, `.btn-sm`, `.btn-secondary`, `.btn-outline*`, `.btn-lg`,
`.container` y varias más: el proyecto reimplementó ese pedazo de la API de
Bootstrap con estilos propios y esas clases están vivas. Se conservaron.

**Lo que quedó fuera a propósito**, con su motivo:

- `Tooltip` y `OverlayTrigger` de react-bootstrap siguen en
  `app/components/FormBase.tsx`. Son componentes JS, no clases, pero **renderizan
  con clases `.tooltip`/`.tooltip-inner` que tampoco están cargadas**: los
  tooltips hoy salen sin estilo. Reemplazarlos es trabajo de diseño, no de
  limpieza mecánica.
- `app/components/Route.tsx` solo se usa dentro de código comentado, y sus iconos
  `bi bi-*` dependen de `bootstrap-icons`, que **no está instalado**. Es un
  componente muerto; borrarlo excede este punto.
- `app/components/DatePicker.tsx:47` tiene un `react-hooks/set-state-in-effect`
  que ya existía y no se tocó: arreglarlo bien implica cambiar cómo se inicializa
  el estado desde `initialValue`, y eso puede regresionar el componente.

### 6.1 Faltan botones de creación en los listados globales

El caso que marcaste. En `/admin/eventos` cada fila tiene editar, ver torneos y
borrar, pero **no hay "Nuevo evento"**. Lo mismo en `/admin/torneos` y
`/superadmin/eventos`.

Detalle revelador: `app/admin/eventos/page.tsx` **importa `Button` de
react-bootstrap y nunca lo usa** — el botón estaba planeado y quedó sin cablear.
Es el warning de lint que sigue vivo en ese archivo.

Ojo con un matiz: crear un evento necesita un complejo, y estos listados son
multi-complejo. El botón tiene que abrir un selector de complejo antes de ir a
`/admin/complejos/[id]/eventos/new`. Lo mismo para torneos, que además necesitan
evento.

### 6.2 La vista pública de un torneo muestra datos inventados

`app/torneos/[id]/components/TorneoDetailTabs.tsx` define `MOCK_GRUPOS` y
`MOCK_LLAVE` y los renderiza cuando el torneo todavía no tiene zonas ni llave
(líneas 238-239). Está rotulado como "datos de ejemplo", pero un torneo real sin
cuadro le muestra al público parejas y resultados que no existen. Debería ser un
estado vacío ("El cuadro se publica cuando terminen las zonas").

### 6.3 Links muertos en el menú de usuario

`site-header.tsx:46-47`: `/#ajustes` y `/#suscripcion` son anclas a secciones que
no existen. Se llega a ellas desde el menú de la cuenta y no llevan a ningún
lado.

### 6.4 Navegación de gestión pobre

No hay breadcrumbs ni menú lateral. Para ir de las zonas de un torneo a sus
partidos hay que volver atrás con el botón del navegador o pasar por el listado.
La jerarquía es de 5 niveles (complejo → evento → torneo → sección) y se navega
solo con `BackButton`.

### 6.5 El reglamento está hardcodeado

`/complejos/[id]/reglamento` son 89 líneas de texto fijo en el componente, igual
para todos los complejos. O se vuelve editable por complejo, o debería ser una
página global y no colgar de `[id]`.

### 6.6 Estilos: Bootstrap sin CSS de Bootstrap

Hay clases `btn`, `card`, `row`, `col-md-*` por todo el código, pero el CSS de
Bootstrap **no está cargado** — solo se usan los componentes JS de
`react-bootstrap`. Esas clases no hacen nada: lo que estila es Tailwind más las
clases `padel-*` de `globals.css`. Conviene sacarlas para que no engañen al
próximo que lea el código.

**Medición y resultado.** `npm run check:css` compila `app/globals.css` con el
CLI de Tailwind y compara los selectores que salen contra las clases del JSX.
Arrancó en **42 clases muertas** y terminó en **0**:

| Muerta | Reemplazo |
|---|---|
| `card` / `card-body` / `card-header` | `rounded-2xl border border-deep-black/10 bg-white` / `p-4` / `border-b … px-4 py-3` |
| `d-flex` / `d-block` / `flex-column` / `flex-md-row` | `flex` / `block` / `flex-col` / `md:flex-row` |
| `justify-content-between`, `align-items-*` | `justify-between`, `items-*` |
| `row` + `col-md-N` | `grid gap-4 md:grid-cols-12` + `md:col-span-N` |
| `alert alert-danger` / `alert-warning` | el patrón de aviso que ya usaban las pantallas nuevas |
| `text-muted` / `text-danger` | `text-deep-black/60` / `text-energy-orange` |
| `form-label` / `form-control` / `form-select` / `form-check*` / `invalid-feedback` | sus gemelas `padel-*`, que ya existían |
| `btn-primario` (15 archivos, **nunca definida**) | `btn btn-primary` |
| `btn-success`, `badge`, `h5`, `bg-light`, `bg-secondary`, `input-group`, `g-3` | equivalente Tailwind o se borran |
| `search-box`, `table-responsive`, `pagination-cnt` | duplicados del nombre viejo al lado de su `padel-*`: se borran |
| `mobileTotal`, `totalPaginas`, `pageInterior`, `ellipsis`, `center`, `text` | restos sin definición en ningún lado: se borran |

Además se cambiaron los 23 `<Button>` de react-bootstrap por `<button>`/`<Link>`
con las mismas clases (`btn btn-*`, que sí existen), lo que sacó el import de
`react-bootstrap` de 14 archivos. **El paquete no se desinstaló**: `FormBase`
sigue usando `Tooltip` y `OverlayTrigger`.

---

## 7. Observaciones de código

- **`PartidosPageClient.tsx` está duplicado** entre admin y superadmin: 700+
  líneas que difieren en **2** (una URL). Cualquier arreglo hay que hacerlo dos
  veces. Se resuelve con un componente compartido que reciba `basePath`, que es
  el patrón que ya usan `ComplejosPageClient` y `ComplejoCanchasPageClient`.
- **El script `lint` está roto**: `eslint ./**/*` entra en `node_modules` y
  aborta. Hay que acotarlo (`eslint .` con el ignore del flat config).
- **`prisma migrate dev` no funciona**: la migración `20260310235620_torneo_update`
  escribe `torneo` en minúscula y falla en la shadow DB, que es case-sensitive.
  Hay que corregir esa migración a `Torneo` para poder volver a generar
  migraciones con el flujo normal.
- **`prisma:check` apunta a un archivo que no existe** (`scripts/check-prisma-maps.js`).
- **Sin tests.** No hay framework. Lo único que hay son los dos chequeos de
  invariantes que agregamos (`npm run check:llave`, `npm run check:turnos`), y
  cubren solo la lógica pura de llave y turnos.
- **`Partido` no tiene índice por `torneoId + llave`**, que es como lo consultan
  el ranking y la vista pública del cuadro.

---

## 8. Qué haría, por orden

### Ahora (seguridad y datos)

1. `assertSuperadmin()` en las 7 actions de `actions/usuarios.ts` (§3.1).
2. Sacar `userId` de la sesión en notificaciones y preferencias (§3.2).
3. Que falte `SESSION_SECRET` sea un error de arranque (§3.3).

### Después (que el producto cierre el ciclo)

4. **Resolver la llave** (§4.1). Sin esto el torneo no termina, y es lo que le da
   sentido a todo lo que ya está construido.
5. **Baja de inscripción + promoción de suplentes** (§4.2).
6. Botones de creación en los listados globales (§6.1).

### Luego (consistencia)

7. Unificar el árbol admin/superadmin y matar el duplicado (§5).
8. Arreglar el link roto a zonas y las rutas huérfanas (§5).
9. Deduplicar `PartidosPageClient` (§7).
10. Reemplazar los mocks de la vista pública por estados vacíos (§6.2).

### Decidir qué pasa con lo que está a medias

11. **Roles:** o se implementan `dataentry` y `fiscal` de verdad (que el login
    los derive de la membership), o se sacan de `UserRole`, del menú y de
    `lib/roles.ts`. Hoy son deuda que confunde.
12. **Recategorización** (§4.3), **sponsors** y **verificación de email** (§4.4,
    §4.6): implementarlas o borrar los modelos.
13. Limpiar las columnas denormalizadas de `Pareja` y `fiscalizadoBy` (§4.5), o
    empezar a escribirlas.

### Ideas de producto

- **Turnos**: cobro parcial/seña, precio por franja horaria, aviso al jugador de
  su reserva, y vista pública de disponibilidad para que el jugador reserve solo.
  Hoy es solo mostrador.
- **Dashboard del admin**: hoy `/admin/complejos` es una tabla. Serviría más ver
  los partidos de hoy, los turnos impagos y los torneos que necesitan atención.
- **Dashboard del superadmin**: hoy es un redirect (§5).
- **Notificaciones**: la infraestructura está y solo la usan los partidos.
  Recordatorio de turno, aviso de suplente que entra, resultado cargado.
- **Ranking**: ya funciona de punta a punta — al pasar un torneo a `FINISHED`,
  `actions/torneos.ts:864` dispara `aplicarRankingTorneo` y se escriben `Ronda` y
  `Ranking`. Lo que falta es un **ranking global de jugador**: hoy solo se ve por
  complejo en `/complejos/[id]/ranking`, y el ranking depende de la llave, que
  hoy no avanza (§4.1).
