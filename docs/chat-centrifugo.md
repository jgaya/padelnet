# Chat con Centrifugo como sidecar

Plan de implementacion del chat de PadelNet. Centrifugo corre como servicio
aparte en el mismo servidor Ubuntu; Next sigue siendo el unico que escribe en
MySQL y el unico que decide permisos.

---

## 1. Alcance

| Tipo de conversacion | Quien la crea | Participantes |
|---|---|---|
| `DIRECTA` | cualquier jugador | 2 |
| `PARTIDO` | automatica al armarse el partido | los 4 jugadores de las dos parejas |
| `GRUPO` | cualquier jugador, elige a quien suma | N, con rol `ADMIN` / `MIEMBRO` |
| `ANUNCIOS` | superadmin (global) o admin de complejo | todos, membresia implicita |

`ANUNCIOS` es de una sola via: solo escriben admin y superadmin, el resto lee.

### Supuestos que quedaron sin definir

Los tomo asi para poder avanzar. Cambiarlos es barato si se hace antes de la
etapa 4.

1. **Quien puede escribirle a quien**: cualquier usuario registrado y activo
   puede iniciar una `DIRECTA`. Toda la politica vive en una sola funcion
   (`puedeIniciarDirecta` en `lib/chat-acceso.ts`), asi que restringirla a
   "solo con vinculo previo" (compartir torneo, pareja, turno o complejo) es
   cambiar el cuerpo de esa funcion y nada mas.
2. **Activacion**: el chat es global del sitio, no una `ComplejoFeatureKey`.
   Una conversacion directa entre dos personas de clubes distintos no tiene un
   complejo al cual preguntarle si esta habilitado. Los `ANUNCIOS` de club si
   respetan el complejo.
3. **Adjuntos**: v1 es solo texto. El esquema deja lugar para sumarlos despues
   sin migrar lo existente.
4. **Bloqueo y reportes**: fuera de v1, pero el modelo lo contempla (seccion 11).

---

## 2. Arquitectura

```
navegador                    servidor Ubuntu
─────────                    ───────────────────────────────────────────

 centrifuge-js ──── wss ──►  nginx :443
      │                        │  /connection/*  ──►  centrifugo :8000
      │                        │  /*             ──►  next  :3000
      │                                                  │
      │  1. GET /api/centrifugo/token         ───────────┤ firma JWT (jose)
      │  2. GET /api/centrifugo/sub-token     ───────────┤ verifica participacion
      │                                                  │
      └─ 3. enviarMensaje() server action     ───────────┤
                                                         ├─► MySQL (fuente de verdad)
                                                         ├─► POST /api/publish  ─► centrifugo :8001
                                                         └─► sendPushToUser() si no esta presente
                                                                    │
 otros navegadores  ◄──── publicacion por websocket ◄───────────────┘
```

Reglas que no se rompen:

- **El cliente nunca publica mensajes.** Todo mensaje entra por una Server
  Action, se valida, se autoriza y se persiste en MySQL. Recien despues se
  publica a Centrifugo. Lo unico que el cliente publica directo es el "esta
  escribiendo", que va por un namespace aparte y no se guarda.
- **Centrifugo es transporte, no base de datos.** Si se cae o se reinicia, los
  mensajes siguen en MySQL y el cliente los recupera al reconectar. Nunca falla
  una Server Action porque Centrifugo no responda.
- **Los puertos de Centrifugo son de loopback.** nginx expone solo
  `/connection/*`. La API y el admin quedan en un puerto interno que no sale a
  internet.

---

## 3. Servidor: instalacion paso a paso

### 3.1 Binario y usuario del sistema

```bash
# Binario
curl -sSLf https://centrifugal.dev/install.sh | sh
sudo mv centrifugo /usr/local/bin/centrifugo
sudo chown root:root /usr/local/bin/centrifugo
sudo chmod 755 /usr/local/bin/centrifugo
centrifugo version

# Usuario sin login y carpeta de config
sudo useradd -r -s /usr/sbin/nologin centrifugo
sudo mkdir -p /etc/centrifugo
```

Alternativa: los paquetes `.deb` de packagecloud, si preferis que `apt` maneje
las actualizaciones. El binario suelto es un solo archivo estatico y actualizar
es reemplazarlo y reiniciar el servicio.

### 3.2 Generar los secretos

```bash
openssl rand -hex 32   # -> CENTRIFUGO_TOKEN_HMAC_SECRET_KEY
openssl rand -hex 32   # -> CENTRIFUGO_API_KEY
openssl rand -hex 32   # -> admin.secret
```

### 3.3 `/etc/centrifugo/config.json`

```json
{
  "http_server": {
    "address": "127.0.0.1",
    "port": 8000,
    "internal_port": 8001
  },
  "log": { "level": "info" },

  "client": {
    "token": {
      "hmac_secret_key": "<HMAC_SECRET>"
    },
    "allowed_origins": ["https://padel.net.ar"]
  },

  "http_api": { "key": "<API_KEY>" },

  "admin": {
    "enabled": true,
    "password": "<PASSWORD_ADMIN>",
    "secret": "<ADMIN_SECRET>"
  },

  "channel": {
    "namespaces": [
      {
        "name": "personal",
        "allow_user_limited_channels": true,
        "history_size": 50,
        "history_ttl": "6h",
        "force_recovery": true
      },
      {
        "name": "chat",
        "presence": true,
        "join_leave": false,
        "history_size": 100,
        "history_ttl": "24h",
        "force_recovery": true
      },
      {
        "name": "typing",
        "allow_publish_for_subscriber": true
      },
      {
        "name": "anuncios",
        "history_size": 50,
        "history_ttl": "72h",
        "force_recovery": true
      }
    ]
  }
}
```

Por que cada cosa:

- **`http_server.address: 127.0.0.1`** — Centrifugo no escucha en la interfaz
  publica. Solo nginx, que esta en la misma maquina, lo alcanza.
- **`internal_port: 8001`** — mueve `/api/*`, el admin, `/health` y las
  metricas a un puerto distinto del de las conexiones. Como nginx solo
  proxea `/connection/*` del 8000, la API queda inalcanzable desde afuera
  aunque alguien se equivoque en la config de nginx.
- **`allowed_origins`** — chequeo del header `Origin` en el handshake. Sin
  esto, cualquier sitio puede abrir un websocket contra tu Centrifugo con la
  cookie del usuario. En desarrollo agregar `"http://localhost:3000"`.
- **`allow_user_limited_channels`** en `personal` — habilita
  `personal:user#42`, que solo puede suscribir el usuario cuyo `sub` del JWT
  de conexion es `42`. No necesita token de suscripcion: es el canal de avisos
  personales (badge de no leidos, conversacion nueva).
- **`chat` sin `allow_subscribe_for_client`** — la unica forma de suscribirse
  es con un token de suscripcion que firma Next despues de verificar en MySQL
  que el usuario es participante. Es el punto clave de seguridad de todo el
  diseño.
- **`presence: true`** en `chat` — permite preguntar quien tiene la
  conversacion abierta, para no mandar push a alguien que ya esta mirando.
- **`history_size` + `history_ttl` + `force_recovery`** — al reconectar,
  Centrifugo reenvia lo que se perdio y el cliente recibe `recovered: true`.
  Si viene `recovered: false` (por ejemplo despues de reiniciar el servicio,
  porque el engine por defecto guarda el historial en memoria), el cliente
  recarga el hilo desde MySQL. Los dos caminos estan cubiertos.
- **`typing` con `allow_publish_for_subscriber: true`** — es el unico
  namespace donde el cliente publica. Centrifugo **no valida el contenido** de
  esas publicaciones, por eso van separadas: lo peor que puede hacer alguien
  ahi es mentir sobre si esta escribiendo. La identidad no se puede falsear,
  porque Centrifugo adjunta el `user` de la conexion a toda publicacion del
  cliente. Nada de `typing` se persiste.

Permisos del archivo (tiene tres secretos en texto plano):

```bash
sudo chown root:centrifugo /etc/centrifugo/config.json
sudo chmod 640 /etc/centrifugo/config.json
sudo centrifugo checkconfig -c /etc/centrifugo/config.json
```

### 3.4 `/etc/systemd/system/centrifugo.service`

```ini
[Unit]
Description=Centrifugo
After=network.target

[Service]
Type=simple
User=centrifugo
Group=centrifugo
ExecStart=/usr/local/bin/centrifugo -c /etc/centrifugo/config.json
Restart=on-failure
RestartSec=3

# Cada conexion persistente consume un descriptor de archivo. El default de
# 1024 se queda corto apenas hay algo de trafico.
LimitNOFILE=65536

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadOnlyPaths=/etc/centrifugo

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now centrifugo
sudo systemctl status centrifugo
sudo journalctl -u centrifugo -f
```

Verificacion:

```bash
curl -s http://127.0.0.1:8001/health           # {}
curl -s -H "X-API-Key: <API_KEY>" -X POST \
     -d '{"channel":"chat:prueba","data":{"hola":1}}' \
     http://127.0.0.1:8001/api/publish          # {"result":{}}
```

Ojo: la API responde HTTP 200 aun cuando falla. Hay que mirar si el cuerpo
trae `error` en vez de `result`.

### 3.5 nginx

Dentro del `server {}` que ya sirve el sitio:

```nginx
location /connection/ {
    proxy_pass http://127.0.0.1:8000;

    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Sin esto nginx corta la conexion al minuto de silencio y el cliente
    # reconecta todo el tiempo.
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;

    # Websocket no lo necesita, pero si algun dia se usa el transporte SSE de
    # Centrifugo, el buffering de nginx retiene los eventos.
    proxy_buffering off;
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

El admin (`http://127.0.0.1:8001/`) queda solo accesible por tunel SSH:
`ssh -L 8001:127.0.0.1:8001 usuario@servidor` y despues `localhost:8001` en el
navegador. No hace falta abrir ningun puerto nuevo en el firewall.

### 3.6 Variables en el `.env` de Next

```
CENTRIFUGO_API_URL=http://127.0.0.1:8001
CENTRIFUGO_API_KEY=<API_KEY>
CENTRIFUGO_TOKEN_HMAC_SECRET_KEY=<HMAC_SECRET>
NEXT_PUBLIC_CENTRIFUGO_WS_URL=wss://padel.net.ar/connection/websocket
```

La unica que llega al navegador es la URL del websocket. Los dos secretos se
quedan del lado del servidor.

---

## 4. Modelo de datos

Se agrega a `prisma/schema.prisma`.

```prisma
enum ConversacionTipo {
  DIRECTA
  PARTIDO
  GRUPO
  /// De una sola via: escriben admin y superadmin, el resto solo lee.
  ANUNCIOS
}

enum ConversacionRol {
  MIEMBRO
  ADMIN
}

model Conversacion {
  id   Int              @id @default(autoincrement())
  tipo ConversacionTipo

  /// Solo DIRECTA: "d:<idMenor>:<idMayor>". El unique es lo que evita que dos
  /// clicks simultaneos en "Enviar mensaje" creen dos conversaciones para el
  /// mismo par. En GRUPO es null a proposito: dos grupos con la misma gente
  /// son grupos distintos.
  claveUnica String? @unique @db.VarChar(64)

  /// Solo GRUPO y ANUNCIOS. En DIRECTA el titulo es el otro participante y en
  /// PARTIDO sale del partido, asi que se arma al leer.
  titulo String?

  /// Una conversacion por partido. El unique hace de deduplicacion, igual que
  /// claveUnica en las directas.
  partidoId Int? @unique

  /// ANUNCIOS de un club. Null en el canal global del sitio.
  complejoId Int?

  creadoPorId Int?

  /// Denormalizado a proposito: la lista de conversaciones ordena por esto y
  /// sin la columna hay que hacer un MAX() por conversacion en cada carga.
  ultimoMensajeAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  partido   Partido?  @relation(fields: [partidoId], references: [id], onDelete: Cascade)
  complejo  Complejo? @relation(fields: [complejoId], references: [id], onDelete: Cascade)
  creadoPor User?     @relation("ConversacionCreador", fields: [creadoPorId], references: [id], onDelete: SetNull)

  participantes ConversacionParticipante[]
  mensajes      Mensaje[]

  @@index([tipo, complejoId])
}

model ConversacionParticipante {
  conversacionId Int
  userId         Int
  rol            ConversacionRol @default(MIEMBRO)

  /// Id del ultimo mensaje leido. Como Mensaje.id es autoincremental, el
  /// contador de no leidos es un COUNT con id > este valor: no hace falta una
  /// fila por mensaje ni un flag por destinatario.
  ultimoLeidoId Int?

  silenciada Boolean @default(false)

  /// Se conserva la fila al salir de un grupo, para no perder quien estuvo.
  salioAt DateTime?

  createdAt DateTime @default(now())

  conversacion Conversacion @relation(fields: [conversacionId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([conversacionId, userId])
  @@index([userId, salioAt])
}

model Mensaje {
  id             Int @id @default(autoincrement())
  conversacionId Int

  /// Null si el autor borro la cuenta: el mensaje queda como "usuario
  /// eliminado" en vez de desaparecer y dejar la conversacion sin sentido.
  autorId Int?

  cuerpo String @db.Text

  /// Uuid que genera el cliente antes de mandar. Sirve para dos cosas:
  /// reemplazar el mensaje optimista por el real cuando vuelve por el
  /// websocket, y cortar duplicados si el usuario reintenta.
  clienteId String? @db.VarChar(36)

  editadoAt   DateTime?
  eliminadoAt DateTime?
  createdAt   DateTime  @default(now())

  conversacion Conversacion @relation(fields: [conversacionId], references: [id], onDelete: Cascade)
  autor        User?        @relation("MensajeAutor", fields: [autorId], references: [id], onDelete: SetNull)

  /// El hilo pagina hacia atras con
  /// `where conversacionId = ? and id < cursor order by id desc limit 40`.
  @@index([conversacionId, id])
  @@unique([conversacionId, clienteId])
}
```

Relaciones inversas a agregar:

```prisma
// model User
conversaciones        ConversacionParticipante[]
conversacionesCreadas Conversacion[]             @relation("ConversacionCreador")
mensajes              Mensaje[]                  @relation("MensajeAutor")

// model Partido
conversacion Conversacion?

// model Complejo
conversaciones Conversacion[]
```

Decisiones que conviene entender antes de tocar esto:

- **`Mensaje.id` es `Int` autoincremental y no `cuid` como `Notification`.**
  Un stream de mensajes necesita orden total y cursores baratos. Con un entero
  monotono, "no leidos" es `COUNT(*) WHERE id > ultimoLeidoId` y paginar hacia
  atras es `WHERE id < cursor`. Con cuid habria que ordenar por `createdAt` y
  desempatar, y el indice pesa el triple.
- **`ANUNCIOS` no materializa participantes.** No se crean 10.000 filas de
  `ConversacionParticipante`. La membresia es implicita (todos, o todos los del
  complejo) y la fila se crea recien cuando el usuario abre el canal, para
  guardar su `ultimoLeidoId`. Mientras no exista la fila, los no leidos son
  todos los mensajes posteriores a la fecha de alta del usuario.
- **`@@unique([conversacionId, clienteId])`** con `clienteId` nullable: MySQL
  permite varios NULL en un indice unico, asi que los mensajes sin `clienteId`
  (los que genera el sistema) no chocan entre si.

```bash
npm run prisma:migrate
```

---

## 5. Canales

| Canal | Quien se suscribe | Como autoriza | Que lleva |
|---|---|---|---|
| `personal:user#<userId>` | cada usuario, siempre | canal user-limited, sin token | avisos: mensaje nuevo, conversacion nueva, contador |
| `chat:conv_<id>` | participantes | token de suscripcion | mensajes, ediciones, borrados |
| `typing:conv_<id>` | participantes | token de suscripcion | "esta escribiendo", efimero |
| `anuncios:conv_<id>` | todos / los del complejo | token de suscripcion | anuncios |

`anuncios` esta separado de `chat` por una razon concreta: con miles de
suscriptores, tener `presence: true` cuesta memoria y no aporta nada. Un canal
de anuncios no necesita saber quien esta mirando.

---

## 6. Codigo nuevo en la app

### 6.1 `lib/centrifugo.ts` — cliente del servidor

```ts
import "server-only";
import { SignJWT } from "jose";

const API_URL = process.env.CENTRIFUGO_API_URL ?? "http://127.0.0.1:8001";
const API_KEY = process.env.CENTRIFUGO_API_KEY;
const HMAC = process.env.CENTRIFUGO_TOKEN_HMAC_SECRET_KEY;
```

Exporta:

- `firmarTokenConexion(userId, info)` — JWT HS256 con `sub` (el id **como
  string**, Centrifugo lo exige asi), `exp` a 1 hora e `info` con nombre y
  avatar para que aparezcan en presencia.
- `firmarTokenSuscripcion(userId, canal)` — JWT con `sub`, `channel` y `exp`.
- `publicar(canal, data)` — POST a `/api/publish`.
- `publicarEnVarios(canales, data)` — POST a `/api/broadcast`, una sola llamada
  para avisarle a los N participantes en su canal personal.
- `presenciaDeCanal(canal)` — POST a `/api/presence`, devuelve los userId
  presentes.

Detalle importante en `publicar`: envolver todo en try/catch, loguear y seguir.
**Que Centrifugo este caido no puede hacer fallar el envio de un mensaje**, que
ya esta guardado en MySQL. Ademas conviene un `AbortSignal.timeout(2000)`: sin
timeout, un Centrifugo colgado deja la Server Action esperando.

Recordar que la API devuelve 200 con `{"error": {...}}` cuando falla, asi que
chequear `res.ok` no alcanza.

### 6.2 `lib/chat-acceso.ts` — autorizacion

Sigue el patron de `lib/authz.ts`: es el unico lugar donde se decide quien
puede que.

```ts
esParticipante(conversacionId, userId): Promise<boolean>
puedeEscribir(conversacionId, userId): Promise<boolean>   // ANUNCIOS: solo admin
puedeIniciarDirecta(userId, otroUserId): Promise<boolean>
puedeCrearGrupo(userId, participantesIds): Promise<boolean>
participantesDePartido(partidoId): Promise<number[]>       // los 4 jugadores
assertParticipante(conversacionId): Promise<SessionPayload>
canalDeConversacion(conv): string                          // chat: o anuncios:
```

`participantesDePartido` sale de `partido.pareja1.{player1Id,player2Id}` y
`partido.pareja2.{...}`, filtrando nulls (un partido puede tener parejas sin
asignar todavia).

`puedeEscribir` en `ANUNCIOS`: superadmin en el canal global, y `ComplejoRole`
`ADMIN` via `getComplejoAccess(complejoId)` en el canal de un club.

### 6.3 `app/api/centrifugo/token/route.ts` — token de conexion

```ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { firmarTokenConexion } from "@/lib/centrifugo";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const token = await firmarTokenConexion(session.userId, {
    name: `${session.name} ${session.lastname}`.trim(),
    avatar: session.image,
  });

  return NextResponse.json({ token });
}
```

La autenticacion es la cookie de sesion que ya existe. No hay nada nuevo que
inventar: si `getSession()` devuelve algo, la persona es quien dice ser.

### 6.4 `app/api/centrifugo/sub-token/route.ts` — token de suscripcion

Recibe `?channel=chat:conv_12`, parsea el id, verifica participacion contra
MySQL con `esParticipante`, y recien ahi firma. **Este endpoint es el control
de acceso de todo el chat**: si esta bien, nadie puede leer una conversacion
ajena por mas que adivine el numero.

Validar que el canal tenga la forma esperada (`^(chat|typing|anuncios):conv_\d+$`)
antes de hacer nada con el, para no firmar tokens de canales arbitrarios.

### 6.5 `actions/chat.ts` — Server Actions

```ts
"use server";

enviarMensaje({ conversacionId, cuerpo, clienteId })
abrirDirecta(otroUserId)              // crea o devuelve la existente
crearGrupo({ titulo, participantesIds })
agregarAGrupo(conversacionId, userIds)
salirDeGrupo(conversacionId)
marcarLeido(conversacionId, hastaMensajeId)
silenciar(conversacionId, valor)
editarMensaje(mensajeId, cuerpo)
eliminarMensaje(mensajeId)
publicarAnuncio({ conversacionId, cuerpo })
```

`enviarMensaje` en orden:

1. `assertParticipante` + `puedeEscribir`.
2. Validar con zod: cuerpo no vacio, maximo 4000 caracteres, trim.
3. Rate limit por usuario (ver seccion 11).
4. Transaccion: `mensaje.create` + `conversacion.update({ ultimoMensajeAt })`.
   Si choca el unique de `clienteId`, devolver el mensaje existente en vez de
   error: es un reintento.
5. `publicar("chat:conv_<id>", { tipo: "mensaje", mensaje })`.
6. `publicarEnVarios` a los canales personales de los otros participantes con
   `{ tipo: "conversacion_actualizada", conversacionId, preview }`.
7. Push a los que no esten presentes ni silenciados (seccion 8).

Los pasos 5 a 7 nunca deben tirar. Van despues de que la transaccion cerro.

`abrirDirecta` arma `claveUnica = "d:" + Math.min(a,b) + ":" + Math.max(a,b)` y
usa `upsert` sobre ese unique. Es lo que hace que dos clicks rapidos no creen
dos conversaciones.

### 6.6 `lib/chat-consultas.ts` — lecturas

```ts
listarConversaciones(userId)   // + no leidos + preview del ultimo mensaje
obtenerConversacion(id, userId)
listarMensajes(conversacionId, { cursor, limite })
contarNoLeidosTotal(userId)    // el numero del badge del header
```

`listarConversaciones` con `ultimoMensajeAt` denormalizado es un solo query con
join a participantes; sin esa columna serian N+1. Los no leidos salen de un
`groupBy` sobre `Mensaje` con `id > ultimoLeidoId` por conversacion.

### 6.7 `context/CentrifugoContext.tsx` — una conexion para toda la app

```bash
npm install centrifuge
```

Un solo `Centrifuge` para toda la aplicacion, montado en el layout raiz cuando
hay sesion. Abrir una conexion por pantalla desperdicia el limite de sockets
del navegador y rompe la presencia.

```tsx
const centrifuge = new Centrifuge(process.env.NEXT_PUBLIC_CENTRIFUGO_WS_URL!, {
  getToken: async () => {
    const res = await fetch("/api/centrifugo/token");
    if (!res.ok) throw new Error("sin sesion");
    const { token } = await res.json();
    return token;
  },
});
```

Con `getToken`, el SDK renueva el token solo antes de que expire: no hay que
manejar reconexiones a mano. Expone por contexto:

- `suscribir(canal, onPublicacion)` con dedupe de suscripciones,
- `estado` (`conectando` / `conectado` / `desconectado`) para el cartel de la UI,
- `presencia(canal)`.

Las suscripciones a canales `chat:` y `typing:` usan el `getToken` por
suscripcion apuntando a `/api/centrifugo/sub-token?channel=...`.

### 6.8 Archivos que se modifican

| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` | modelos y enums de la seccion 4; `CHAT_MESSAGE` en `NotificationType` |
| `app/layout.tsx` | `<CentrifugoProvider>` adentro de `SnackbarProvider` |
| `app/components/site-header.tsx` | link a `/mensajes` con badge |
| `types/notification.ts` | `CHAT_MESSAGE` (y de paso `SYSTEM`, ver abajo) |
| `types/notificationPreferences.ts` | `CHAT_MESSAGE` en schema, defaults, labels y descripciones |
| `actions/torneos-partidos.ts` | crear la conversacion del partido al asignar parejas |
| `.env` | las cuatro variables de 3.6 |

**Desincronizacion existente**: el enum `NotificationType` de
`prisma/schema.prisma` tiene `SYSTEM`, pero el de `types/notification.ts` no.
Hoy cualquier notificacion `SYSTEM` que salga de la base rompe el parseo de
zod. Conviene arreglarlo en el mismo commit que agrega `CHAT_MESSAGE`, porque
son los dos mismos archivos.

---

## 7. UI

### 7.1 Rutas

```
app/mensajes/layout.tsx          panel doble en lg+, una sola columna abajo
app/mensajes/page.tsx            lista (mobile) / estado vacio (desktop)
app/mensajes/[id]/page.tsx       conversacion
app/mensajes/nueva/page.tsx      elegir destinatario o armar grupo
app/admin/anuncios/page.tsx      redactar anuncio (admin de complejo)
app/superadmin/anuncios/page.tsx anuncio global
```

Pagina dedicada y no widget flotante: en mobile un widget flotante pelea con el
teclado virtual y con el header sticky, y en desktop no gana nada frente al
panel doble.

### 7.2 Desktop (lg y arriba)

```
┌──────────────────────────────────────────────────────────────────────┐
│  PADEL.NET.AR    Inicio  Complejos  Torneos      ✉ ③   ☾   (avatar)  │
├────────────────────────┬─────────────────────────────────────────────┤
│  Mensajes      [+]     │  ← Martin Sosa                      ● ahora │
│  ┌──────────────────┐  ├─────────────────────────────────────────────┤
│  │ 🔍 Buscar        │  │                                             │
│  └──────────────────┘  │              ─── martes 12 ───              │
│                        │                                             │
│ ┌────────────────────┐ │   ┌───────────────────────────┐             │
│ │(MS) Martin Sosa  ③ │ │   │ Confirmas para el sabado? │             │
│ │     Confirmas...   │ │   └───────────────────────────┘ 14:02       │
│ │              14:02 │ │                                             │
│ └────────────────────┘ │             ┌─────────────────────────────┐ │
│  (VG) Verano C4 - Z.A  │             │ Si, a las 19 en la cancha 3 │ │
│       Lucia: dale      │             └─────────────────────────────┘ │
│                 ayer   │                                14:05  ✓✓    │
│                        │                                             │
│  (📣) Anuncios         │   Martin esta escribiendo...                │
│       Cierre de ins... ├─────────────────────────────────────────────┤
│                 lun    │  ┌───────────────────────────────┐  ┌─────┐ │
│                        │  │ Escribi un mensaje...         │  │  ➤  │ │
│                        │  └───────────────────────────────┘  └─────┘ │
└────────────────────────┴─────────────────────────────────────────────┘
   320px, sticky              flex-1, scroll invertido
```

### 7.3 Mobile

Dos rutas separadas, no dos paneles. `/mensajes` es la lista a pantalla
completa; tocar una conversacion navega a `/mensajes/[id]`, donde el header de
la conversacion reemplaza la navegacion y tiene un `←` que vuelve.

```
┌─────────────────────┐   ┌─────────────────────┐
│ ✉ Mensajes      [+] │   │ ← (MS) Martin Sosa  │
├─────────────────────┤   ├─────────────────────┤
│ 🔍 Buscar           │   │  ┌────────────────┐ │
├─────────────────────┤   │  │ Confirmas para │ │
│ (MS) Martin Sosa  ③ │   │  │ el sabado?     │ │
│      Confirmas...   │   │  └────────────────┘ │
│               14:02 │   │            14:02    │
├─────────────────────┤   │                     │
│ (VG) Verano C4      │   │    ┌──────────────┐ │
│      Lucia: dale    │   │    │ Si, a las 19 │ │
│               ayer  │   │    └──────────────┘ │
├─────────────────────┤   │           14:05 ✓✓  │
│ (📣) Anuncios       │   ├─────────────────────┤
│      Cierre de i... │   │ [ Mensaje...    ][➤]│
└─────────────────────┘   └─────────────────────┘
```

El composer va con `position: sticky; bottom: 0` y padding con
`env(safe-area-inset-bottom)`, si no en iOS queda tapado por la barra del
navegador.

### 7.4 Componentes

```
app/mensajes/components/
  ListaConversaciones.tsx   client, recibe la lista inicial del server
  ItemConversacion.tsx      avatar, titulo, preview, hora, badge
  HiloMensajes.tsx          client, scroll invertido y paginacion hacia arriba
  Burbuja.tsx               server component puro
  SeparadorFecha.tsx        "hoy" / "ayer" / "12 de agosto"
  Redactor.tsx              textarea autoexpandible + envio
  IndicadorEscribiendo.tsx
  EstadoConexion.tsx        cartel de "reconectando"
app/components/
  ChatBadge.tsx             el sobre del header con el contador
```

### 7.5 Estilos: solo tokens existentes

Todo sale de `app/globals.css`. Nada de color literal, para que el chat siga al
tema claro/oscuro como el resto del sitio.

| Elemento | Clases |
|---|---|
| Burbuja propia | `bg-padel-green text-on-brand rounded-2xl rounded-br-sm` |
| Burbuja ajena | `bg-surface-soft text-content rounded-2xl rounded-bl-sm` |
| Hora dentro de la burbuja | `text-[11px] text-content/60` (propia: `text-on-brand/70`) |
| Panel de la lista | `bg-surface border-r border-content/10` |
| Item seleccionado | `bg-surface-soft` |
| Badge de no leidos | `bg-energy-orange text-on-brand rounded-full text-[11px]` |
| Punto de en linea | `bg-padel-green` |
| Separador de fecha | `text-xs text-content/50` con lineas `border-content/10` |
| Composer | la clase `.padel-form-input` que ya existe |
| Boton enviar | `bg-energy-orange text-on-brand rounded-full shadow-[var(--shadow-sm)]` |
| Cartel de reconexion | `bg-warning/10 text-warning border border-warning/30` |
| Anuncio | franja `bg-info/10 border-l-4 border-info` |

La burbuja propia en verde marca sobre `--on-brand`, que es el token pensado
justo para texto encima de relleno de marca y no se da vuelta con el tema.

Nota: `react-bootstrap` esta en el `package.json` pero su CSS no esta cargado,
asi que sus clases no hacen nada. Todo el chat es Tailwind y tokens.

### 7.6 Comportamiento

- **Optimista con `useOptimistic`** (React 19, ya esta en el proyecto): al
  enviar, la burbuja aparece al instante en gris con un reloj. Cuando el mismo
  mensaje vuelve por el websocket, se reemplaza haciendo match por `clienteId`.
  Si la action falla, la burbuja queda en rojo con un boton de reintentar.
- **Dedupe obligatorio**: el que envia recibe su propio mensaje por el
  websocket. Sin descartar por `clienteId` se ve duplicado.
- **Scroll**: contenedor con `flex-col-reverse` para que quede anclado abajo
  solo. Al llegar arriba, se paginan 40 mensajes mas con el cursor por `id`.
  Si el usuario esta leyendo mas arriba y llega un mensaje, no saltar: mostrar
  un boton flotante "nuevos mensajes ↓".
- **Marcar leido**: cuando el hilo esta visible y con foco (`IntersectionObserver`
  + `document.visibilityState`), llamar a `marcarLeido` con debounce de 1s.
- **Escribiendo**: publicar a `typing:conv_<id>` como maximo una vez cada 3
  segundos mientras se tipea; el receptor lo borra a los 5 segundos sin recibir
  nada. Sin throttle es un evento por tecla.
- **Enter envia, Shift+Enter salto de linea.** En pantallas tactiles, Enter
  siempre hace salto de linea y se envia con el boton.
- **Accesibilidad**: el hilo con `role="log"` y `aria-live="polite"`, el badge
  con `aria-label="3 mensajes sin leer"`, y foco visible en la lista para poder
  navegar con teclado.

---

## 8. Push y notificaciones

El chat se apoya en lo que ya funciona (`lib/push.ts`, `PushToken`,
`Notification`), no arma un canal paralelo.

Cuando se envia un mensaje, para cada participante que no sea el autor:

1. Si esta en la presencia de `chat:conv_<id>` → **no mandar push**, ya lo esta
   viendo. Esta es la razon principal de tener `presence: true`.
2. Si tiene la conversacion `silenciada` → no mandar.
3. Si tiene `CHAT_MESSAGE` en `false` en `notificationPreferences` → no mandar.
4. Si no, `sendPushToUser({ title: nombreDelAutor, body: preview, type: "CHAT_MESSAGE", ... })`.

Va directo y no por la cola de `Notification` + cron: un mensaje de chat que
llega 5 minutos tarde no sirve. Los `ANUNCIOS` son al reves (seccion 9).

Agregar antirrebote: si al mismo usuario ya se le mando un push de la misma
conversacion en los ultimos 2 minutos y no la abrio, no mandar otro. Sin esto,
una conversacion activa dispara veinte notificaciones seguidas.

---

## 9. Anuncios masivos

Diferencias con una conversacion normal:

- **Suscripcion**: `anuncios:conv_<id>`. El token lo da `/api/centrifugo/sub-token`
  si el canal es el global, o si el usuario tiene relacion con el complejo
  (`ComplejoMembership` o `PerfilJugadorComplejo`).
- **Publicacion realtime**: una sola llamada a `/api/publish`. Un canal
  compartido llega a todos los conectados con un solo mensaje; hacer fan-out a
  10.000 canales personales seria absurdo.
- **Push**: aca si va por `createBulkNotifications` y el cron que ya existe en
  `/api/cron/notifications`. Mandar 10.000 push dentro de una Server Action la
  hace tardar minutos y el usuario ve la pantalla colgada.
- **Escritura**: `puedeEscribir` devuelve true solo para superadmin (global) o
  `ComplejoRole.ADMIN` del complejo. El `Redactor` ni se renderiza para el
  resto.
- **No leidos**: la fila de `ConversacionParticipante` se crea al abrir el
  canal por primera vez. Antes de eso, los no leidos son los mensajes
  posteriores al alta del usuario.

Las conversaciones de `ANUNCIOS` se crean una sola vez, en el seed: la global
(`complejoId: null`) y una por complejo cuando se crea el complejo.

---

## 10. Orden de implementacion

Cada etapa deja algo verificable. No pasar a la siguiente sin cerrar la
anterior.

| # | Etapa | Como se verifica |
|---|---|---|
| 0 | Centrifugo instalado, systemd, nginx, admin por tunel | `curl /health` y publicar a mano con `curl` |
| 1 | Migracion de Prisma | `npm run prisma:migrate` y `npm run prisma:check` |
| 2 | `lib/centrifugo.ts` + los dos endpoints de token + provider | una pagina de prueba que se conecta y muestra "conectado" |
| 3 | Eco por `personal:user#<id>` | publicar con `curl` al canal propio y verlo llegar al navegador |
| 4 | `lib/chat-acceso.ts` + `actions/chat.ts` + `lib/chat-consultas.ts` | tests manuales: intentar entrar a una conversacion ajena da 403 |
| 5 | UI: lista + hilo + composer, sin realtime (recarga a mano) | se puede conversar recargando |
| 6 | Realtime en el hilo, optimista y dedupe | dos navegadores, mensajes al instante |
| 7 | No leidos, badge del header, marcar leido | el contador baja al abrir |
| 8 | Presencia + escribiendo | punto verde y "esta escribiendo" |
| 9 | Push con supresion por presencia | con la pestaña cerrada llega, con el chat abierto no |
| 10 | Grupos: crear, sumar, salir | tres cuentas en un grupo |
| 11 | Conversacion automatica de partido | armar un partido y ver que aparece |
| 12 | Anuncios (admin y superadmin) | anuncio global llega a todos |

Etapas 0 a 3 son un dia de trabajo. El grueso esta en 4 a 8.

---

## 11. Riesgos y cosas para decidir

**Rate limiting.** Sin limite, una cuenta puede inundar una conversacion y
disparar push a todos. Es lo primero que se prueba cuando el chat es publico.
Propuesta: contador en memoria por `userId` (un solo proceso, alcanza), 20
mensajes por minuto, y devolver un error de la action que la UI muestra en el
snackbar. Si se pasa a varias instancias, mover el contador a Redis.

**Moderacion.** V1 no tiene bloqueo ni reportes. Si `puedeIniciarDirecta` queda
abierto a cualquier usuario registrado, hay que sumarlos pronto: un modelo
`BloqueoUsuario(bloqueadorId, bloqueadoId)` consultado dentro de
`puedeIniciarDirecta` y `puedeEscribir`, mas un boton de reporte que cree una
`Notification` para el superadmin. Es media jornada y evita el problema antes
de tenerlo.

**Historial en memoria.** El engine por defecto guarda el historial de canal en
la memoria del proceso: reiniciar Centrifugo lo pierde y los clientes reciben
`recovered: false`. Esta contemplado (recargan desde MySQL), pero hay que
implementar ese camino de verdad y no asumir que la recuperacion siempre
funciona. Es el bug que aparece recien en produccion despues de un deploy.

**Actualizaciones de Centrifugo.** La v6.9.0 trajo cambios incompatibles en la
configuracion, asi que `centrifugo checkconfig` despues de cada actualizacion,
y fijar la version en vez de tomar siempre la ultima. Hubo ademas un CVE de
SSRF (CVE-2026-32301) en el endpoint de JWKS dinamico: no lo usamos (la firma
es HMAC), pero conviene seguir las releases de seguridad.

**Borrado de usuarios.** `Mensaje.autorId` es `onDelete: SetNull`, asi que los
mensajes sobreviven al borrado de la cuenta como "usuario eliminado". Si hace
falta borrado real por pedido de la persona, hay que agregar una tarea que
anonimice o vacie el cuerpo.

**`log: ["query"]` en `lib/prisma.ts`.** Hoy loguea cada consulta tambien en
produccion. El chat multiplica la cantidad de queries; conviene dejarlo solo en
desarrollo antes de sumar carga.

**Escalar a varias instancias.** Si algun dia Next corre en modo cluster, el
chat sigue funcionando sin cambios (Centrifugo ya es un proceso aparte). Lo
unico a mover es el rate limit en memoria. Si el que se replica es Centrifugo,
ahi si hace falta Redis como engine.
