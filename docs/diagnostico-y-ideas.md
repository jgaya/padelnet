# PadelNet: diagnostico, ideas y posibles integraciones

Documento de producto, no de implementacion. Tres partes:

1. **Donde esta parado el sitio hoy** — fortalezas y debilidades, con evidencia.
2. **Que hacen los demas** — el mapa competitivo y donde queda el hueco.
3. **Que se podria construir** — ideas ordenadas por lo que rinden, e
   integraciones.

Lo que ya tiene plan escrito no se propone de nuevo como idea: **cobros con
Mercado Pago** esta en `docs/prompts-mercadopago.md` y **WhatsApp** en
`docs/prompts-whatsapp.md`. Este documento los da por hechos y mira que viene
despues.

---

# Parte 1 — Donde esta parado el sitio

## Lo que hay construido

Vale enumerarlo porque es bastante mas de lo que parece desde afuera, y porque
varias ideas de la parte 3 son baratas justamente por lo que ya existe.

| Area | Que hay |
|---|---|
| **Multi-tenant** | `Complejo` con slug propio, `ComplejoMembership` con 4 roles, feature flags por club (`ComplejoFeature`), superadmin global |
| **Torneos** | `Evento` → `Torneo`, formatos ZONAS y ELIMINACION_DIRECTA, siembra por ranking o inscripcion, zonas, llave, `PartidoSet`, W.O., resolucion automatica de avance |
| **Ranking** | Puntaje por posicion final configurable por torneo (`Ronda`), ranking de club separado por genero |
| **Categorias** | 1 a 8, con `PerfilJugadorComplejo.categoria` por club y `Recategorizacion` con historial y motivo |
| **Turnos** | `TurnoSerie` con recurrencia diaria/semanal/mensual, `TurnoSlot`, `TurnoReserva`, horario semanal del club y excepciones por fecha |
| **Inscripcion publica** | Flujo completo de anotarse en pareja, con validacion de sexo, categoria, duplicados, cupo y lista de suplentes |
| **Sanciones** | `Sancion` con estados, que bloquea inscripciones |
| **Gamificacion** | 19 logros con rarezas y medallas propias |
| **Moderacion de fotos** | `ImagenPerfil` con cola de aprobacion, recorte de cara con face-api.js, y las imagenes servidas por un route handler que mira el estado antes de entregar bytes |
| **Auditoria** | Extension de Prisma que registra toda escritura de 22 modelos, con actor, origen y diff por campo |
| **Notificaciones** | Push por FCM, cola con `scheduledAt`, preferencias por usuario y 8 disparadores de dominio |
| **Publico** | Pagina por club con calendario, eventos, ranking, jugadores, recategorizaciones, reglamento y sanciones; perfil publico de jugador; sitemap |
| **Admin** | Dashboard con metricas, reportes, export a CSV y PDF, breadcrumbs, tema claro/oscuro con tokens |

## Fortalezas

### 1. El motor de torneos es de verdad profundo

Es lo mas valioso que hay y no es facil de copiar. Zonas mas llave, siembra
configurable, resolucion de avance, desempates, W.O., puntaje por ronda
editable, recategorizacion con historial. `lib/` tiene once modulos solo de
torneo (`torneo-llave.ts`, `torneo-siembra.ts`, `torneo-posiciones.ts`,
`torneo-resolucion.ts`, `llave-tabla.ts`...).

La mayoria de las plataformas de reservas tienen torneos como un anexo. Aca es
al reves: el torneo es el corazon y los turnos vinieron despues.

### 2. La auditoria completa, que casi nadie tiene

`lib/auditoria.ts` intercepta toda escritura de Prisma y deja quien, cuando, con
que valores y desde donde (web, cron o script). Para un club esto contesta
discusiones reales: quien cambio el horario de ese partido, quien dio de baja
esa inscripcion, quien marco ese turno como pagado.

Ningun competidor de los que se miraron lo publicita. Es un argumento de venta
que hoy esta escondido en una tabla.

### 3. La disciplina de codigo esta por encima del promedio

- Comentarios que explican **por que**, no que. Varios documentan errores
  cometidos y por que la solucion es esa (el `for...of` en `lib/push.ts`, el
  `enTransaccion` en `lib/prisma.ts`, el `@@unique` que a proposito no se puso).
- 13 scripts `check-*` que verifican invariantes de dominio: siembra, llave,
  turnos, auditoria, breadcrumbs, CSS muerto, ubicaciones.
- `scripts/check-auditoria.ts` **falla si alguien usa `prisma.$transaction`
  suelto** o si agrega un modelo sin clasificarlo. Eso es una salvaguarda
  ejecutable, no una convencion escrita en un wiki.
- El catalogo de features obliga a tocar tres lugares y esta documentado en el
  propio archivo.

### 4. El modelo de datos aguanta

Feature flags por club, borrado logico consistente, `PerfilJugadorComplejo` que
separa la identidad global del jugador de su categoria en cada club, timezone
por complejo, horarios en minutos desde medianoche en vez de `DateTime` con
zona. Son decisiones de alguien que ya se golpeo con las alternativas.

### 5. Es dueño de la relacion con el jugador

Esto es estrategico y se ve mejor en la parte 2. Las plataformas grandes se
llevan una comision de cada reserva **y** se quedan con el vinculo con el
jugador. Hay clubes migrando de Playtomic a competidores chicos justamente para
recuperar el acceso a los datos de sus socios. PadelNet, con Mercado Pago
cobrando en la cuenta del club (decision del otro documento), esta del lado
correcto de esa linea.

---

## Debilidades

### Tecnicas

#### 1. Cero tests y cero CI. Es la debilidad numero uno

No hay ni un archivo de test, no hay script `test` en `package.json`, y no hay
`.github/`. Husky esta instalado pero `.husky/` no tiene ni un hook: solo la
carpeta `_`.

Esto seria tolerable en un CRUD. **No lo es en este proyecto**, porque la logica
que mas duele si se rompe es algoritmica y silenciosa:

- armado de zonas y llave (`lib/torneo-llave.ts`, `lib/llave-tabla.ts`)
- siembra (`lib/torneo-siembra.ts`)
- desempates y posiciones (`lib/torneo-posiciones.ts`)
- puntajes de ranking (`lib/ranking-puntajes.ts`)
- solapamiento de turnos y recurrencia (`lib/horarios.ts`, `lib/turnos-recurrencia.ts`)

Un bug ahi no tira una excepcion: arma mal un cuadro, y alguien juega una final
que no le tocaba. Se descubre en la cancha, con la gente adelante.

**Lo bueno:** ya hay 13 scripts `check-*` que verifican exactamente estas
invariantes. **La suite ya esta escrita, le falta el arnes.** Convertirlos a
Vitest y colgarlos de un hook de pre-push es de las cosas mas baratas y de mayor
retorno de todo este documento.

#### 2. No es una PWA, teniendo todo listo para serlo

Hay `public/firebase-messaging-sw.js`, hay FCM, hay `PushNotificationsListener`
en el layout. **No hay `manifest.json`.** Sin manifest no se instala, no hay
icono en la pantalla de inicio, no hay splash, y en iOS las notificaciones web
directamente no funcionan si la app no esta agregada a la pantalla de inicio.

O sea: se esta pagando la complejidad de las push sin cobrar el beneficio. Y el
caso de uso es 100% movil — alguien parado en el club mirando si hay cancha.

Es de las correcciones mas baratas que existen.

#### 3. El README es el default de `create-next-app`

Literalmente sin tocar, incluyendo la seccion "Deploy on Vercel" — cuando el
deploy real es un VPS Ubuntu propio con cron del sistema. Un desarrollador nuevo
(o vos mismo en seis meses) arranca con informacion falsa.

No hay `CLAUDE.md` ni documento de arquitectura. Todo el conocimiento vive en
comentarios adentro de los archivos, que estan muy bien pero no dan el mapa.

#### 4. Sin observabilidad

Todo el manejo de errores es `console.error`. En un VPS eso termina en un log de
systemd que nadie mira. No hay Sentry ni equivalente, no hay logs estructurados,
no hay alerta cuando un cron deja de correr.

Con Mercado Pago y WhatsApp entrando —dos integraciones externas que fallan de
formas raras y que cuestan plata cuando fallan— esto pasa de "estaria bueno" a
"hace falta".

#### 5. Duplicaciones que se van a desincronizar

- `NotificationType` esta declarado **dos veces**: en `prisma/schema.prisma` y
  en `types/notification.ts`. Nada obliga a que coincidan.
- Igual `NotificationStatus`.
- El catalogo de logros, las categorias y las posiciones de ranking estan bien
  centralizados; estos dos quedaron afuera del criterio.

#### 6. Campos de texto libre donde deberia haber estructura

Ya identificados en los otros dos planes, se listan aca para tener el cuadro
completo:

- `Torneo.valorInsc` es `String?` con cosas como `"$15.000 por pareja"`
- `User.telefono` es `z.string().trim().optional()`, sin formato ni verificacion
- `Cancha` no tiene ningun campo de precio

### De producto

#### 7. La mitad del producto no existe todavia de cara al jugador

Y es la mitad que da uso diario. `actions/turnos.ts` arranca todo con
`ensureTurnosHabilitados()` → `ensureComplejoManagerAccess()`. **Un jugador no
puede reservar una cancha.** Los turnos son una agenda interna del club.

Un torneo es un evento de fin de semana. Una cancha se reserva tres veces por
semana. Hoy PadelNet solo esta presente en el evento raro.

(Esto lo resuelve el paso 8 de `docs/prompts-mercadopago.md`, y por eso ese paso
esta marcado ahi como el mas grande.)

#### 8. No hay ninguna razon para abrir el sitio sin un partido agendado

El jugador entra a inscribirse a un torneo, o a mirar el ranking despues de
jugar. Entre medio no hay nada: ni buscar con quien jugar, ni ver quien esta
jugando, ni actividad de otros. Todos los competidores tienen algo ahi.

#### 9. La categoria la declara el jugador

`CATEGORIA_OPTIONS` es 1 a 8 y la elige la persona al registrarse. El club puede
corregirla via `PerfilJugadorComplejo` y `Recategorizacion`, que es un buen
sistema — pero es **administrativo y manual**.

Mientras tanto la base ya tiene todos los resultados cargados: `Partido`,
`PartidoSet`, ganador, perdedor, games. **El dato para calcular un nivel real
esta, y no se usa para eso.**

#### 10. El club no tiene forma de cobrar mas que la inscripcion

Sin abonos, sin membresias, sin clases, sin precios por franja horaria, sin caja.
El plan de Mercado Pago cubre inscripcion y turno suelto, que es el piso.

---

# Parte 2 — El mapa competitivo

## Quien es quien

**Internacionales**

| | Que es | Su fuerte |
|---|---|---|
| **Playtomic** | Lider global, 70+ paises | Nivel 0-7 tipo ELO que se movio a estandar de facto, y **partidos abiertos**: entrar a un partido al que le falta uno |
| **MATCHi** | Origen escandinavo, multideporte | Del lado del club: membresias, actividades, clases, ligas |
| **Padel Mates** | Retador | Gana clubes que quieren **recuperar el acceso a los datos de sus socios** |

**Argentina**

| | Que es | Su fuerte |
|---|---|---|
| **ATC Sports** (Alquila Tu Cancha) | +200.000 usuarios, +350 clubes, 7 paises | Red instalada. Integracion con **luces y control de acceso**, y **tarjeta en garantia** contra los que no avisan |
| **CanchaFija** | Especifica de padel | El competidor mas parecido: turnos + Mercado Pago + ranking + torneos con fixture automatico |
| **CanchaYa** | Reservas 24/7 | Partidos abiertos, precios diferenciados por franja, turnos fijos, buffet |
| **Donde Juego** | Futbol 5 y padel | Caja, productos y stock |
| **Padeltime** | Padel | Reserva + busqueda de compañeros |
| **Turnito** | Gimnasios y profes | Recordatorios por **WhatsApp** |

**De torneos sociales** — PadelFast, Americano Padel App, Padel Americano
Generator y varias mas. Todas resuelven **Americano y Mexicano**, que son los
formatos con los que se juega socialmente. Varias muestran el marcador en vivo
por link para poner en un TV del club.

## Que se lee de todo esto

**a) Los formatos sociales son un mercado aparte, y PadelNet no esta.**
`TorneoFormato` tiene dos valores: `ZONAS` y `ELIMINACION_DIRECTA`. Los dos son
formatos de **torneo competitivo con parejas fijas**. El Americano (todos con
todos, se rotan los compañeros, gana el que mas puntos suma individualmente) y
el Mexicano (se reempareja segun la tabla en vivo) son los formatos del martes a
la noche. Hoy un club que quiere hacer uno se baja otra app.

**b) El matchmaking es la feature que retiene, y nadie la tiene resuelta local.**
Es lo que hace de Playtomic un habito. En Argentina lo insinuan CanchaYa
("partidos abiertos") y Padeltime ("busqueda de compañeros"), pero ninguno con
la profundidad de un sistema de nivel detras.

**c) El nivel medido es la moneda del deporte.** El 0-7 de Playtomic se volvio
el idioma comun. PadelNet tiene categoria 1-8 declarada, que es el mismo
concepto sin medicion.

**d) Hay una grieta abierta: los clubes quieren sus datos.** Las plataformas
grandes cobran comision por reserva y se quedan con el vinculo. Es el motivo
citado de las migraciones. **PadelNet puede pararse exactamente ahi**: el club
cobra en su propia cuenta de Mercado Pago, tiene su pagina publica con su slug,
su reglamento, sus sponsors y sus socios. Es una diferencia real, no de marketing.

**e) Lo aburrido tambien vende.** Precios por franja, no-show con consecuencia,
caja, control de acceso. Es lo que un club pide en la segunda reunion.

## El hueco

> **Un sistema donde el club es dueño de su relacion con los jugadores, con el
> mejor motor de torneos del mercado local, que ademas resuelve el dia a dia
> (turno, compañero, nivel) sin cobrar comision por reserva.**

Ninguno de los locales tiene la profundidad de torneo. Ninguno de los
internacionales le deja al club la relacion. El motor de torneos es la ventaja
que ya esta construida; lo que falta es lo cotidiano alrededor.

---

# Parte 3 — Ideas

Ordenadas por lo que rinden contra lo que cuestan. El esfuerzo es relativo y
asume el codigo que ya existe.

## Nivel 1 — Alto impacto, apalancan lo que ya hay

### 1.1 Nivel de juego calculado (ELO) junto a la categoria

**Esfuerzo: medio. Impacto: el mas alto del documento.**

La base ya tiene todos los partidos con sets y games. Calcular un nivel por
jugador a partir de resultados reales es sobre todo trabajo de calculo, no de
producto nuevo.

Lo importante es que **no reemplaza la categoria, la acompaña**. La categoria
1-8 es la que usa el club para armar torneos y es un dato administrativo con el
que la gente se identifica. El nivel es medido y con decimales.

Y desbloquea cuatro cosas de una:

- **matchmaking** (idea 1.2): sin nivel, "partidos abiertos" empareja mal
- **siembra automatica**: `TorneoSiembra` ya tiene `RANKING` e `INSCRIPCION`;
  entra `NIVEL` como tercer valor y las zonas quedan mas parejas
- **recategorizacion con evidencia**: hoy el club recategoriza a ojo; el sistema
  podria sugerir "estos 6 jugadores vienen rindiendo por encima de su categoria",
  con los partidos que lo respaldan. La pantalla y el modelo `Recategorizacion`
  ya existen
- **perfil del jugador**: le da algo que mirar y que subir

Detalles que importan: arrancar con Glicko-2 en vez de ELO puro (maneja la
incertidumbre de quien jugo poco, que es la mayoria); el padel es por parejas,
asi que hay que decidir como repartir entre los dos —lo habitual es tratar la
pareja como un jugador promedio y ajustar a cada uno; y mostrar el nivel **con
su confianza**, porque un nivel calculado sobre 3 partidos no es un nivel.

### 1.2 Partidos abiertos

**Esfuerzo: medio-alto. Impacto: muy alto.**

Un jugador publica que va a jugar el jueves 20:00 en tal club y le faltan dos.
Otros se suman. Cuando se completa, se confirma el turno.

Es **la** feature que hace que alguien abra la app sin tener nada agendado.
Convierte un sistema de gestion en una red.

Necesita el flujo publico de turnos (paso 8 del plan de Mercado Pago) y se
apoya fuerte en el nivel (1.1) para filtrar por "partidos para tu nivel". Sin
nivel funciona igual, pero peor: se llena de partidos desparejos y la gente deja
de entrar.

Piezas: un modelo de partido abierto, invitaciones, filtro por club y nivel,
aviso por WhatsApp cuando aparece uno que encaja (el plan de WhatsApp ya deja el
canal listo), y una regla de que pasa si no se completa — se cancela solo y se
libera la cancha.

### 1.3 Formato Americano y Mexicano

**Esfuerzo: medio. Impacto: alto.**

`TorneoFormato` ya es un enum y el codigo ya esta partido por formato
(`lib/torneo-llave-directa.ts` maneja uno y las zonas el otro). Sumar
`AMERICANO` y `MEXICANO` es un tercer y cuarto camino, no una refactorizacion.

Lo que cambia y hay que resolver de verdad: la unidad de competencia deja de ser
la pareja fija y pasa a ser **el jugador individual**, con los compañeros
rotando. `Pareja` tiene `player1Id` y `player2Id` fijos, asi que el Americano
necesita su propia estructura de rondas. Y el Mexicano ademas recalcula el
emparejamiento despues de cada ronda segun la tabla en vivo.

Por que vale la pena igual: es el formato con el que los clubes llenan las
canchas entre semana, y hoy lo resuelven con una app de afuera que no sabe nada
de sus socios ni de su ranking. Integrarlo trae ese uso adentro.

### 1.4 Convertir los `check-*` en tests de verdad

**Esfuerzo: bajo. Impacto: alto (en riesgo evitado).**

Los 13 scripts ya verifican las invariantes dificiles. Falta:

1. Vitest y un `npm test`
2. Portar los `check-*` a tests, arrancando por siembra, llave, resolucion y
   turnos, que son los algoritmicos
3. Un hook de pre-push en Husky (que ya esta instalado sin hooks) o un workflow
   de GitHub Actions
4. Fixtures de torneos de casos raros: 3 parejas, numero impar, todos W.O.,
   empate a todo

Esto no se le muestra a ningun cliente. Es lo que evita que un sabado a la
mañana se descubra que el cuadro esta mal armado.

### 1.5 PWA instalable

**Esfuerzo: muy bajo. Impacto: medio-alto.**

`manifest.json`, iconos, `theme-color` sincronizado con el tema claro/oscuro que
ya existe, y un banner discreto de "agregar a la pantalla de inicio". El service
worker ya esta.

Sin esto, las push en iOS no llegan. Con esto, PadelNet queda como un icono al
lado de las otras apps, que es donde compite.

## Nivel 2 — Lo que el club pide en la segunda reunion

### 2.1 Precios por franja horaria y por dia

El plan de Mercado Pago pone un precio por hora por cancha. La realidad de un
club tiene precio de pico (18 a 23), de valle, distinto el fin de semana, y a
veces promociones. `ComplejoHorario` ya modela el horario por dia en minutos
desde medianoche: la estructura para colgar precios por franja ya esta.

### 2.2 Politica de cancelacion y no-show con consecuencia

`BookingStatus` ya tiene `NO_SHOW` y **no hace nada**. `Sancion` ya existe y ya
bloquea inscripciones. Conectarlos:

- ventana de cancelacion configurable por club
- el que no aparece dos veces en un mes queda sin poder reservar online por N dias
- con Mercado Pago: seña, o cobro total con devolucion parcial segun cuando
  cancele

ATC vende esto como "tarjeta en garantia" y es de las cosas que mas le duelen a
un club: la cancha vacia que no se pudo revender.

### 2.3 Lista de espera de turnos

Ya existe el concepto para torneos (`Pareja.suplente`). Falta para canchas: me
anoto en un horario ocupado y si se libera me avisan. Con WhatsApp ya integrado,
el aviso es inmediato y el club revende la cancha que se cayo.

### 2.4 Abonos y turnos fijos con cobro

`TurnoSerie` ya modela la recurrencia completa. Lo que falta es el lado
comercial: un abono mensual que se cobra solo, que suspende la serie si no se
paga. Es ingreso recurrente para el club y lo mas parecido a una membresia que
se puede armar con lo que ya hay.

### 2.5 Clases y profesores

Un tipo de reserva distinto: la da un profe, tiene cupo de varios alumnos, se
repite. `Cancha` y `TurnoSlot` sirven de base; falta el concepto de profesor y
de inscripcion multiple a un mismo slot.

### 2.6 Caja del club

Buffet, alquiler de paletas, venta de pelotas y grips. Es lo que hacen Donde
Juego y CanchaYa. Aleja al proyecto del padel y lo acerca a un ERP chico —
mencionado por completitud, pero es el que menos apalanca lo que ya esta
construido.

## Nivel 3 — Comunidad y producto

### 3.1 Perfil del jugador que valga la pena mirar

`app/jugadores/[id]` y `lib/torneo-estadisticas.ts` ya existen. Sumarle:
evolucion del nivel en el tiempo, historial de torneos, con quien jugo,
head-to-head, racha actual, y las medallas que ya estan.

Es lo que hace que alguien mande el link de su perfil, y cada link compartido es
distribucion gratis.

### 3.2 Marcador en vivo para el TV del club

Varias apps de Americano lo tienen: una URL publica sin login, en pantalla
completa, con la grilla y las posiciones actualizandose solas. Se pone en un
televisor del club durante el torneo.

`lib/torneo-vista-publica.ts` ya calcula casi todo. Es sobre todo una pagina con
otro layout y un refresco.

### 3.3 Imagen para compartir del resultado

Cuando un torneo termina, generar una placa con el podio y el cuadro, lista para
Instagram. Los clubes de padel viven en Instagram y hoy arman esas placas a mano
en Canva. `jspdf` ya esta en el proyecto, aunque para imagen conviene otra cosa.

Cada placa lleva el nombre del club y la marca del sitio. Es marketing que se
paga solo.

### 3.4 Buscar club por cercania

Hoy `lib/ubicaciones.ts` tiene provincia y localidad de INDEC. Con latitud y
longitud por complejo se puede ordenar por distancia y mostrar un mapa. Es la
puerta de entrada del jugador que todavia no es de ningun club.

### 3.5 Multideporte

`Cancha` tiene `superficie`, `isIndoor` y `dobles`: ya es casi generica. En
Argentina el futbol 5 mueve mas volumen que el padel, y los complejos suelen
tener las dos cosas. El motor de torneos no serviria igual, pero el de turnos si.

Es una decision de posicionamiento mas que tecnica: agranda el mercado y diluye
el foco. Vale tenerla anotada, no necesariamente hacerla.

---

# Parte 4 — Integraciones

## Ya planificadas

- **Mercado Pago** — `docs/prompts-mercadopago.md`
- **WhatsApp Cloud API** — `docs/prompts-whatsapp.md`

## Las que mas rinden por lo que cuestan

### Calendario (Google Calendar / iCal)

**Muy barato, muy usado.** Un `.ics` por reserva y por partido de torneo, y una
URL de suscripcion por jugador. El turno le aparece en el celular con
recordatorio, sin que PadelNet tenga que mandar nada.

Es un archivo de texto con un formato viejo y bien documentado. No hace falta
tocar la API de Google.

### Google Maps

Ubicacion del club en su pagina publica, "como llegar", y la busqueda por
cercania de la idea 3.4. Un embed y dos columnas nuevas.

### Sentry (u otro APM)

No es una integracion de producto, es dejar de estar a ciegas. Con dos
integraciones externas entrando, un webhook que falla en silencio es plata.
Alerta cuando un cron deja de correr, cuando sube la tasa de error, cuando una
transaccion se cuelga.

### Google Business Profile

Que las reservas del club aparezcan en su ficha de Google cuando alguien lo
busca. Es distribucion en el lugar exacto donde el jugador ya esta buscando.
Vale investigar los requisitos, que no son triviales.

## De operacion del club

### Luces y control de acceso

Lo tiene ATC y es un diferencial concreto: la reserva enciende las luces de esa
cancha y abre el molinete. Es un rele o una controladora con API en el club.

**Aca el VPS propio juega a favor**, no en contra: hay procesos long-running,
se puede hablar MQTT, y no hay limite de tiempo de ejecucion como en serverless.
Es de las pocas cosas que un competidor sobre Vercel tiene mas dificil.

### Facturacion electronica (ARCA, ex AFIP)

Emitir el comprobante de la inscripcion o del turno. Es el paso siguiente
natural despues de cobrar, y es lo que convierte a PadelNet en el sistema de
gestion del club y no en un accesorio.

Trae complejidad real: certificados, homologacion, puntos de venta, y cada club
con su condicion frente al IVA. No es un fin de semana.

### Instagram

Los clubes de padel viven ahi. Dos direcciones posibles: publicar
automaticamente el resultado del torneo (idea 3.3), y mostrar el feed del club
en su pagina publica. La primera pide App Review de Meta —la misma cuenta que ya
se va a crear para WhatsApp, asi que parte del camino queda hecho.

## Identidad y datos

### Login con Apple

Ya hay Google (`actions/auth-google.ts`, `lib/google-cuenta.ts`). Apple importa
si se va al camino de la app nativa, y en el publico de padel el iPhone pesa.

### Export de datos del club

Que el club pueda bajarse todo lo suyo. Suena raro como feature, pero es
exactamente el argumento de venta contra las plataformas que se quedan con el
vinculo: *"tus datos son tuyos y te los llevas cuando quieras"*. Ya existen
`lib/exportar-csv.ts` y `lib/exportar-pdf.ts`.

---

# Parte 5 — Si hubiera que elegir

Un orden defendible, no una lista de deseos.

**Primero, lo que ya esta escrito.** El paso 8 del plan de Mercado Pago —el
flujo publico de reserva— es el que mas cambia el producto, porque hace que el
jugador tenga una razon para entrar todas las semanas. Sin eso, el resto de este
documento se apoya en el aire.

**En paralelo, dos cosas baratas.** El `manifest.json` de la PWA (idea 1.5) y
los tests (idea 1.4). Ninguna se le muestra a un cliente y las dos se pagan
solas: una destraba las push en iOS, la otra evita el sabado a la mañana con el
cuadro mal armado.

**Despues, el nivel calculado (1.1).** Es el que mas apalanca lo construido: usa
partidos que ya estan cargados, mejora la siembra que ya existe, le da sentido a
la recategorizacion que ya tiene pantalla, y es requisito para que el
matchmaking no sea un desastre.

**Y con eso puesto, partidos abiertos (1.2).** Es la feature que convierte el
sitio en un habito, pero llega bien recien cuando existen turnos publicos y
nivel. Hacerla antes es hacerla mal.

**El Americano (1.3) es la carta aparte.** No depende de nada de lo anterior y
es lo unico de este documento que se puede vender solo: hoy los clubes usan una
app externa para eso. Se puede adelantar si aparece un club que lo pida.

Lo que **no** haria pronto: la caja del club (2.6) y el multideporte (3.5).
Agrandan el alcance sin apalancar el motor de torneos, que es la ventaja que ya
esta construida y que ningun competidor local tiene.
