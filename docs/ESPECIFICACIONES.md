# PadelNet — Especificaciones Técnicas y Funcionales del Sistema

> **Documento de Especificación Oficial**  
> **Versión:** 1.0  
> **Estado:** Deducción exhaustiva del código fuente (`prisma/schema.prisma`, `app/`, `actions/`, `lib/`, `cron/`, `components/`, `scripts/`).

---

## Índice

1. [Visión General y Propósito del Sistema](#1-visión-general-y-propósito-del-sistema)
2. [Arquitectura Tecnológica y Stack](#2-arquitectura-tecnológica-y-stack)
3. [Modelo de Roles, Permisos y Seguridad](#3-modelo-de-roles-permisos-y-seguridad)
4. [Especificaciones Funcionales por Módulo](#4-especificaciones-funcionales-por-módulo)
   - [4.1. Clubes y Complejos Deportivos](#41-clubes-y-complejos-deportivos)
   - [4.2. Canchas y Configuración Operativa](#42-canchas-y-configuración-operativa)
   - [4.3. Eventos y Torneos](#43-eventos-y-torneos)
   - [4.4. Inscripciones, Categorías y Restricciones](#44-inscripciones-categorías-y-restricciones)
   - [4.5. Motor de Fixture, Zonas y Programación de Partidos](#45-motor-de-fixture-zonas-y-programación-de-partidos)
   - [4.6. Avance de Llaves, Resultados y Desempates](#46-avance-de-llaves-resultados-y-desempates)
   - [4.7. Sistema de Ranking por Puntos](#47-sistema-de-ranking-por-puntos)
   - [4.8. Alquiler de Canchas y Turnos Recurrentes](#48-alquiler-de-canchas-y-turnos-recurrentes)
   - [4.9. Recategorización de Jugadores](#49-recategorización-de-jugadores)
   - [4.10. Sanciones Disciplinarias](#410-sanciones-disciplinarias)
   - [4.11. Gamificación y Sistema de Logros](#411-gamificación-y-sistema-de-logros)
   - [4.12. Fotos de Perfil, Detección Facial y Moderación](#412-fotos-de-perfil-detección-facial-y-moderación)
   - [4.13. Auditoría Automática y Trazabilidad](#413-auditoría-automática-y-trazabilidad)
   - [4.14. Notificaciones Push y Comunicaciones](#414-notificaciones-push-y-comunicaciones)
   - [4.15. Reportes, Planillas y Exportaciones (PDF/CSV)](#415-reportes-planillas-y-exportaciones-pdfcsv)
   - [4.16. Estadísticas Públicas y Comparador Cara a Cara](#416-estadísticas-públicas-y-comparador-cara-a-cara)
5. [Modelo de Datos y Entidades (Prisma / Base de Datos)](#5-modelo-de-datos-y-entidades-prisma--base-de-datos)
6. [Catálogo Completo de Rutas y Vistas](#6-catálogo-completo-de-rutas-y-vistas)
7. [Procesos en Background y Tareas Programadas (Crons)](#7-procesos-en-background-y-tareas-programadas-crons)
8. [Scripts de Validación e Invariantes del Dominio](#8-scripts-de-validación-e-invariantes-del-dominio)
9. [Reglas de Negocio e Invariantes Clave](#9-reglas-de-negocio-e-invariantes-clave)

---

## 1. Visión General y Propósito del Sistema

**PadelNet** es una plataforma web y PWA (Progressive Web App) multi-tenant diseñada para digitalizar de forma integral la gestión y la comunidad del pádel. Su arquitectura permite que múltiples complejos o clubes deportivos operen de manera autónoma con su propia identidad, canchas, calendarios, reglamentos y torneos, mientras los jugadores conservan una identidad global compartida a través de toda la red.

### Objetivos Clave
- **Autonomía para Complejos Deportivos:** Cada club administra sus instalaciones, torneos, turnos fijos, horarios de atención y sanciones.
- **Motor Profundo de Torneos:** Generación automática de fixtures con restricciones horarias, gestión de zonas (round robin y especiales de 4 parejas), llaves de eliminación directa, avance automático de clasificados, cómputo de desempates olímpicos/estadísticos y cálculo de ranking.
- **Gestión de Turnos y Canchas:** Calendario interactivo semanal, reservas individuales, reservas fijas con recurrencia (diaria, semanal, mensual) materializadas en ventana móvil, estados de cobro y bloqueos por mantenimiento.
- **Identidad del Jugador y Comunidad:** Perfiles con historial de partidos, estadísticas individuales completas, medallas/logros obtenidos, comparador directo "Cara a Cara" (Versus) y ranking por club.
- **Trazabilidad Absoluta:** Motor de auditoría integrado a nivel base de datos que registra cualquier modificación realizada por usuarios o procesos automáticos.

---

## 2. Arquitectura Tecnológica y Stack

### 2.1. Núcleo de Aplicación
- **Framework:** Next.js 16.1.6 (App Router con Server Components y Server Actions).
- **Librería de Interfaz:** React 19.2.3.
- **Lenguaje:** TypeScript 5.8.3 en modo estricto.
- **Motor de Estilos:** Tailwind CSS 4.2.1 junto con un sistema de tokens de diseño semánticos (`app/globals.css`).
- **Entorno de Ejecución:** Node.js `>= 20.19.0`.

### 2.2. Persistencia y Base de Datos
- **Motor de Base de Datos:** MySQL / MariaDB.
- **ORM:** Prisma 7.9.1.
  - Driver adapter: `@prisma/adapter-mariadb`.
  - Generador: Nuevo `prisma-client` de Prisma 7 que emite TypeScript compilado en `lib/generated/prisma`.
  - Configuración desacoplada en `prisma.config.ts`.
  - Transacciones auditadas obligatorias mediante `enTransaccion()` (`lib/prisma.ts`).

### 2.3. Autenticación, Sesión y Seguridad
- **Mecanismo de Sesión:** Stateless Session mediante JWT (`jose` 6.0.12) firmado con `HS256`, persistido en cookie HTTP-Only con validez de 7 días y `SameSite: Lax`.
- **Autenticación con Credenciales:** Contraseñas hasheadas mediante `bcryptjs` 3.0.2.
- **Federación de Identidad:** Login con Google usando `google-auth-library` 11.0.2 y vinculación con Firebase Auth (`firebaseUid`).
- **Verificación de Seguridad Anti-Bot:** Google reCAPTCHA Enterprise (`lib/recaptcha.ts`) con validación de score mínimo (0.5) y chequeo de acción esperada en login y formularios públicos de solicitud.
- **Validación de Formularios y Payloads:** `zod` 4.0.14 junto con `@hookform/resolvers` y `react-hook-form`.

### 2.4. Inteligencia Artificial y Procesamiento de Multimedia
- **Detección Facial en el Navegador:** `@tensorflow/tfjs` 4.22.0 y `face-api.js` 0.22.2 en `AvatarCropper.tsx`. Permite centrar automáticamente el rostro del usuario, aplicar zoom configurable y recortar el avatar en formato circular y la imagen cuadrada en canvas HTML5.
- **Validación Binaria de Imágenes:** En `lib/imagenes-perfil.ts`, se comprueban los "magic numbers" (firmas de bytes) de archivos PNG (`0x89 0x50 0x4E 0x47`) y JPEG (`0xFF 0xD8 0xFF`), limitando el peso a 1 MB para mitigar ataques de spoofing MIME.
- **Almacenamiento Protegido:** Las fotos de perfil se guardan en el sistema de archivos (`var/uploads/users/<id>/`), estrictamente fuera de la carpeta pública `public/`. Son servidas únicamente mediante un Route Handler autenticado (`app/api/imagenes/perfil/[imagenId]/[variante]/route.ts`) que valida el estado de aprobación.

### 2.5. Notificaciones y PWA
- **PWA (Progressive Web App):** Service Worker nativo (`lib/service-worker.ts`), manifiesto dinámico (`app/manifest.ts`), banner de instalación `InstallPrompt` y soporte de standalone cover en móviles.
- **Notificaciones Push:** Firebase Cloud Messaging (`firebase-admin` 13.6.0 y cliente `firebase` 12.8.0), con soporte Web, Android e iOS. Cola diferida programada en BD con procesamiento por lotes vía cron.
- **Correos Transaccionales:** Wrapper sobre `resend` 6.6.0 con tokens criptográficos opacos de un solo uso para verificación de email y recuperación de contraseñas. Modo fallback transparente a consola en entornos de desarrollo sin API keys.

### 2.6. Exportación de Archivos
- **Reportes PDF:** Carga diferida (`import()`) de `jspdf` 4.2.1 y `jspdf-autotable` 5.0.8 para evitar sobrecargar el bundle inicial. Soporte para impresión directa o invocación de `navigator.share` en dispositivos móviles.
- **Exportación CSV:** Generador universal de texto delimitado con BOM UTF-8 y escape de caracteres para compatibilidad directa con Excel.

---

## 3. Modelo de Roles, Permisos y Seguridad

El sistema implementa un modelo de autorización desacoplado en dos niveles:

```
                  ┌─────────────────────────────────┐
                  │          PlatformRole           │
                  │        (Nivel Global)           │
                  └──────────────┬──────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
             ┌───────┐                   ┌──────────────┐
             │ USER  │                   │  SUPERADMIN  │
             └───┬───┘                   └──────┬───────┘
                 │                              │ (Admin en todos
                 │                              │  los complejos)
                 ▼                              ▼
      ┌──────────────────────────────────────────────────┐
      │               ComplejoMembership                 │
      │              (Nivel por Complejo)                │
      ├──────────────────────────────────────────────────┤
      │ • ADMIN (gestión completa del club)              │
      │ • DATAENTRY / FISCAL / STAFF (roles declarados)  │
      │ • esPropietario: Boolean (titular del complejo)  │
      └──────────────────────────────────────────────────┘
```

### 3.1. Roles Globales (`PlatformRole`)
- **`USER`:** Todo jugador o visitante registrado. No posee facultades administrativas por defecto.
- **`SUPERADMIN`:** Dueño/operador de la plataforma. Posee acceso irrestricto a todos los complejos de la base de datos (se resuelve como `ADMIN` automático en cualquier club), además de las vistas exclusivas de `/superadmin`.

### 3.2. Roles por Complejo (`ComplejoRole`)
- **`ADMIN`:** Administrador del complejo. Gestiona torneos, inscripciones, canchas, turnos, sanciones, recategorizaciones locales y reglamento de su club.
- **`DATAENTRY` / `FISCAL` / `STAFF`:** Roles contemplados en el esquema de base de datos para granularidades futuras de permisos.
- **`esPropietario` (Booleano):** Atributo de la membresía que designa al titular del club (destinado a facturación, titularidad y transferencia del complejo).

### 3.3. Mecanismo de Autorización (`lib/authz.ts`)
- Las decisiones de autorización no preguntan *"¿qué rol global sos?"*, sino *"¿qué rol tenés en ESTE complejo concreto?"*.
- Cada Server Action valida explícitamente el acceso mediante `requireComplejoRole(complejoId, ['ADMIN'])` o `assertSuperadmin()`.
- Un usuario puede ser `ADMIN` en un complejo determinado y simple jugador (`USER`) en todos los demás.

### 3.4. Matriz de Funcionalidades por Club (`ComplejoFeatureKey`)
El Superadministrador habilita o deshabilita funcionalidades de forma modular por complejo:
1. **`TURNOS`:** Habilita el calendario de alquiler de canchas, reservas y cobros.
2. **`NOTIFICACIONES`:** Habilita la emisión de notificaciones push a los socios del club sobre partidos y torneos.
3. **`LOGROS`:** Habilita el otorgamiento de logros y medallas en torneos organizados por el club.

---

## 4. Especificaciones Funcionales por Módulo

### 4.1. Clubes y Complejos Deportivos
- **Datos Principales:** Nombre, slug URL único (autogenerado con `slugify`), email, teléfono, dirección, ciudad, provincia y país (default `"AR"`).
- **Timezone:** Configurable por complejo (default `"America/Argentina/Buenos_Aires"`).
- **Reglamento del Club:** Editor en `/admin/complejos/[id]/reglamento` que almacena texto en Markdown básico (`##` encabezados, `-` viñetas). El renderizado utiliza un parser seguro propio (`lib/markdown-simple.ts`) sin dependencias de `dangerouslySetInnerHTML`.
- **Página Pública del Club (`/complejos/[slug]`):** Ofrece pestañas públicas con datos de contacto, eventos activos, calendario de partidos, ranking de socios, padrón de jugadores, historial de recategorizaciones, sanciones vigentes y reglamento.

### 4.2. Canchas y Configuración Operativa
- **Atributos de Cancha:** Número único dentro del club, nombre descriptivo opcional (ej. *"Cancha Central"*), superficie (ej. césped sintético, cemento), banderas booleanas para `isIndoor` (techada), `dobles` (vs singles) y `isActive`.
- **Desactivación Lógica:** Una cancha desactivada deja de ofrecerse para turnos y programación de torneos, pero preserva el historial íntegro de partidos y reservas previas.
- **Horarios Semanales (`ComplejoHorario`):** Configuración de hora de apertura y cierre en **minutos transcurridos desde la medianoche** (ej. 540 = 09:00, 1380 = 23:00) y marca de `cerrado` por cada día de la semana (0 = Domingo a 6 = Sábado).
- **Excepciones Horarias (`ComplejoHorarioExcepcion`):** Sobrescritura de horarios para fechas específicas (feriados, jornadas especiales o días de mantenimiento) asociadas a un motivo.

### 4.3. Eventos y Torneos
- **Jerarquía Evento → Torneo:** Un `Evento` (paraguas comercial y temporal, ej. *"Torneo Primavera 2026"*) agrupa uno o varios `Torneos` (competencias por categoría y sexo).
  - Tipos de Evento: Fin de semana (`FINDE`) o Semanal (`SEMANAL`).
  - Visibilidad: Un evento en preparación se mantiene oculto hasta que el administrador marca `isVisible = true`.
- **Formatos de Torneo (`TorneoFormato`):**
  1. **`ZONAS` (Zonas y Llave):** Formato tradicional de fase de grupos seguida por cuadro eliminatorio.
  2. **`ELIMINACION_DIRECTA`:** Cuadro directo estilo tenis con siembra sembrada desde primera ronda.
- **Estados del Torneo (`TournamentStatus`):**
  - `DRAFT` (Borrador inicial).
  - `PUBLISHED` (Inscripciones abiertas al público).
  - `CLOSED_REGISTRATION` (Inscripciones cerradas).
  - `IN_PROGRESS` (Zonas cerradas / partidos en disputa).
  - `FINISHED` (Final disputada y ranking liquidado).
  - `ARCHIVED` (Histórico).
- **Criterio de Siembra (`TorneoSiembra`):** `RANKING` (ordenado por puntos en el club) o `INSCRIPCION` (orden cronológico).

### 4.4. Inscripciones, Categorías y Restricciones
- **Modalidad de Inscripción:** Las inscripciones a torneos se realizan estrictamente por parejas (`Pareja`: Jugador 1 y Jugador 2).
- **Reglas de Categoría (`TournamentCategoryRule`):**
  - `LIBRE`: Sin restricción de categoría.
  - `MAYOR_IGUAL`: Jugador debe ser de categoría $\ge N$ (ej. 5 o superior).
  - `MENOR_IGUAL`: Jugador debe ser de categoría $\le N$.
  - `IGUAL`: Categoría exacta $N$.
  - `SUMA`: La suma numérica de las dos categorías de la pareja debe ser igual o superior a la regla del torneo (ej. Suma 7 admite 3+4, 2+5, etc.).
- **Regla de Sexo:** `MASCULINO` (exclusivo varones), `FEMENINO` (exclusivo damas) o `MIXTO` (un varón y una dama obligatoriamente).
- **Control de Elegibilidad:**
  - **Email Verificado:** Un jugador no verificado puede navegar, pero no puede inscribirse en un torneo.
  - **Sin Duplicados:** Ningún jugador puede integrar dos parejas en el mismo torneo.
  - **Sanciones:** Se bloquea la inscripción si alguno de los dos jugadores posee una sanción disciplinaria vigente en el club.
- **Lista de Espera y Promoción Automática:**
  - Las parejas que se inscriben cuando se alcanza el cupo (`capacidad`) se marcan como `suplente = true`.
  - Si una pareja titular es dada de baja, el sistema **promueve automáticamente a la primera pareja suplente** por orden de llegada a titular (`suplente = false`) y emite las notificaciones pertinentes.
- **Restricción Horaria de Pareja:** El administrador puede cargar la indisponibilidad de la pareja (ej. *"Sábado, 09:00 a 14:00"*), considerada luego por el motor de programación.

### 4.5. Motor de Fixture, Zonas y Programación de Partidos
- **Armado de Zonas (`lib/torneo-zonas.ts`):**
  - Soporte de zonas de 3 o 4 parejas.
  - Reparto automático basado en la tabla de siembra o distribución manual drag-and-drop con soporte para intercambiar parejas en zonas completas.
- **Algoritmo de Programación de Canchas y Horarios (`lib/torneo-grilla.ts`):**
  - Asignación basada en prioridades para evitar solapamientos y respetar descansos:
    1. Partidos de zona con restricción horaria.
    2. Partidos de zona generales sin restricción.
    3. Partidos especiales de zonas de 4 (`AG1-AG2` ganadores y `AP1-AP2` perdedores).
    4. Rondas de eliminación directa en orden estricto (32avos $\rightarrow$ 16avos $\rightarrow$ Octavos $\rightarrow$ Cuartos $\rightarrow$ Semifinal $\rightarrow$ Final), asegurando que cada ronda comience una vez concluida la anterior.
  - Generación de identificadores legibles (`idLegible`, ej. `"Verano-C4-Zona_A-1"`) para facilitar la búsqueda en mesas de control.
  - Herramienta para replicar horarios de una cancha a todas las demás seleccionadas.

### 4.6. Avance de Llaves, Resultados y Desempates
- **Carga de Resultados (`actions/torneos-partidos.ts`):**
  - Registro de sets (games y tiebreaks opcionales).
  - Soporte para Walkover (`walkover = true`), otorgando la victoria sin cargar sets jugados.
- **Resolución Automática de Posiciones en Zona (`lib/torneo-posiciones.ts`):**
  - Criterios de desempate en orden:
    1. Partidos ganados.
    2. Enfrentamiento directo (en empates de 2 parejas).
    3. Diferencia de sets ($Sets\ Ganados - Sets\ Perdidos$).
    4. Diferencia de games ($Games\ Ganados - Games\ Perdidos$).
    5. Mayor cantidad de games a favor.
- **Propagación en Llaves (`lib/torneo-avance.ts`):**
  - Al cerrar la fase de zonas, se mapean automáticamente los clasificados (`1A`, `2B`, etc.) a los partidos de la llave eliminatoria.
  - Al completarse cualquier partido de eliminación, la función `propagarResultado` inyecta automáticamente a la pareja ganadora en el partido correspondiente de la siguiente fase del cuadro.
  - **Reversibilidad:** Posibilidad de "Volver a armar la llave" si se detecta un error de carga en zonas antes de que la eliminatoria haya avanzado.

### 4.7. Sistema de Ranking por Puntos
- **Configuración por Torneo (`lib/ranking-puntajes.ts`):**
  - Cada torneo almacena en la tabla `Ronda` el puntaje atribuible a cada fase: Campeón (default 100), Subcampeón (80), Semifinalista (60), Cuartos de final (40), Octavos (30), 16avos (20), 32avos (15), Perdedor Zona (10), Perdedor Zona por W.O. (0).
- **Liquidación de Torneo:**
  - Al cambiar el torneo a estado `FINISHED`, se ejecuta `aplicarRankingTorneo`, asignando puntos de ranking a cada jugador individual según la instancia alcanzada.
  - Existe la acción de "Recalcular ranking" para reprocesar los puntajes ante cualquier rectificación de resultados.
- **Visualización:** El ranking del club se clasifica de forma separada por categoría (1 a 8) y por género (Caballeros y Damas).

### 4.8. Alquiler de Canchas y Turnos Recurrentes
- **Calendario Interactivo:** Vista semanal por cancha o consolidada, con slots de duración variable (default 90 minutos).
- **Modalidades de Reserva:**
  - **Jugador Registrado:** Búsqueda en padrón por nombre, DNI o email, vinculando la reserva a su cuenta.
  - **Contacto Suelto:** Carga rápida de nombre y teléfono para clientes sin cuenta en la plataforma.
  - **Bloqueo Operativo:** Ocupación de horario por mantenimiento, clases particulares o eventos privados sin titular asociado.
- **Series Fijas Recurrentes (`TurnoSerie`):**
  - Frecuencias: `DIARIA`, `SEMANAL`, `MENSUAL`.
  - Ventana móvil: Las ocurrencias se materializan en la base de datos hasta 90 días hacia adelante de forma continua mediante un cron (`cron/turnos-cron.ts`).
  - Validación anti-solapamiento estricta que previene colisiones tanto con otros turnos como con partidos oficiales de torneos.
- **Gestión de Cobros y Cancelaciones:**
  - Marcado manual de estado `pagado` / `impago`.
  - Cancelación granular: Opción de cancelar una ocurrencia puntual de una serie o cortar la serie definitiva a futuro.

### 4.9. Recategorización de Jugadores
- **Alcance Dual:**
  - **Del Club:** Modifica únicamente el nivel del jugador dentro de ese complejo (`PerfilJugadorComplejo.categoria`). Esto permite que un jugador dispute torneos en 4ta en un club y en 5ta en otro.
  - **Global:** Modifica la categoría base del usuario en toda la plataforma (`User.categoria`).
- **Tipología de Movimientos:** `ASCENSO`, `DESCENSO`, `ALTA` (primera asignación) y `OBSERVADO` (jugador bajo evaluación).
- **Trazabilidad:** Cada recategorización registra fecha, autor, nivel previo, nuevo nivel y motivo, exhibiéndose públicamente en la pestaña de recategorizaciones del club.

### 4.10. Sanciones Disciplinarias
- **Características:**
  - Alcance por complejo deportivo.
  - Rango temporal inclusivo (`desde` hasta `hasta` a nivel `@db.Date`).
  - Campo `motivo` con validación estricta de un mínimo de 20 caracteres (pensado para ser publicado).
- **Inmutabilidad:** Las sanciones nunca se borran; si la comisión directiva retira la penalidad, la sanción pasa a estado `ANULADA` con registro del usuario y motivo de anulación.
- **Bloqueo en Tiempo Real:** El middleware de inscripciones (`lib/sanciones.ts`) intercepta cualquier intento de inscripción (online o por mesa de entrada) y rechaza a la pareja si alguno de sus integrantes posee una sanción vigente.
- **Publicación:** Las sanciones vigentes e históricas se exhiben de forma transparente en `/complejos/[slug]/sanciones`.

### 4.11. Gamificación y Sistema de Logros
- **Catálogo Global (`Logro`):** Gestionado por el Superadministrador en `/superadmin/logros`. Consta de 19 logros iniciales categorizados en 5 rarezas (`COMUN`, `POCO_COMUN`, `RARO`, `EPICO`, `LEGENDARIO`).
- **Disparadores de Eventos del Juego (`EventoJuego`):**
  - `PARTIDO_JUGADO` $\rightarrow$ Logros "Primer partido", "Habitué" (10), "Veterano" (50).
  - `PARTIDO_GANADO` $\rightarrow$ "Primera victoria", "Ganador" (10), "Dominante" (50).
  - `SET_GANADO` $\rightarrow$ "Primer set", "Set perfecto" (6-0 / bagel).
  - `RONDA_ALCANZADA` $\rightarrow$ "Dieciseisavos", "Octavos", "Cuartos", "Semifinal", "Finalista".
  - `TORNEO_GANADO` $\rightarrow$ "Campeón", "Campeón invicto" (sin ceder ningún set en el certamen).
  - `RANKING_ACTUALIZADO` $\rightarrow$ "Top 50", "Top 20", "Top 10".
- **Visualización:** Medallas con estilos cromáticos acordes a la rareza en el perfil privado del jugador y en su ficha pública.

### 4.12. Fotos de Perfil, Detección Facial y Moderación
- **Pipeline de Carga Client-Side:**
  - El usuario selecciona una imagen.
  - Los pesos de red neuronal de `face-api.js` detectan los hitos faciales (bounding box).
  - Se genera en canvas un recorte cuadrado optimizado a 800px (calidad 0.85) y un recorte de avatar centrado en la cabeza (con margen superior del 20%).
- **Almacenamiento Seguro:**
  - Se persisten en disco como archivos físicos en `var/uploads/users/<userId>/`.
  - No son accesibles directamente por URL estática.
- **Flujo de Moderación:**
  - Toda nueva foto entra en estado `PENDIENTE` en la tabla `ImagenPerfil`.
  - El Superadministrador revisa la cola en `/superadmin/imagenes` y puede aprobarla o rechazarla con un motivo.
  - Solo al ser aprobada se actualizan los campos `User.avatarUrl` y `User.imageUrl`.
  - Las fotos rechazadas son depuradas del disco y de la base de datos tras 30 días de retención vía cron.

### 4.13. Auditoría Automática y Trazabilidad
- **Extensión Prisma a Nivel Motor (`lib/auditoria.ts`):**
  - Intercepta automáticamente todas las mutaciones (`create`, `update`, `delete`, `updateMany`, `deleteMany`) sobre **22 modelos de datos clave**.
  - Registra: nombre de tabla, acción (`CREAR`, `ACTUALIZAR`, `BORRAR`, `MASIVA`), ID del registro, actor responsable (ID, nombre y email capturados de la sesión), origen (`web`, `cron`, `script`) y timestamp.
  - Almacena un diff JSON estricto `{ campo: { antes, despues } }` registrando únicamente los campos que sufrieron modificaciones.
  - **Seguridad:** Mascara de forma automática credenciales y tokens sensibles (`passwordHash`, `token`, `firebaseUid`, `notificationPreferences`).
  - **Retención:** Política de retención de 12 meses depurada automáticamente por cron diario (`cron/auditoria-cron.ts`).

### 4.14. Notificaciones Push y Comunicaciones
- **Canal de Envío:** Integración con Firebase Cloud Messaging (FCM) para plataformas Web, Android e iOS.
- **Disparadores Automatizados:**
  - Publicación de nuevo torneo (notifica a jugadores de la categoría correspondiente).
  - Inicio de torneo y publicación de zonas.
  - Programación y reprogramación de partidos (cancha y horario).
  - Recordatorio de partido con 1 hora de anticipación.
  - Carga y actualización de resultados.
  - Cancelación de inscripción / promoción de pareja suplente.
- **Gestión de Preferencias:** Cada usuario configura en `/perfil/notificaciones` qué tipos de avisos desea recibir; el motor de notificaciones filtra los destinatarios respetando estas preferencias y las banderas del complejo.

### 4.15. Reportes, Planillas y Exportaciones (PDF/CSV)
- **Horarios y Planillas de Partido (`/admin/reportes/horarios`):** Genera el fixture del día con espacios formateados para **Firma Pareja A** y **Firma Pareja B**, listo para imprimir y colgar en la mesa de control o llevar a la cancha.
- **Listado de Inscriptos (`/admin/reportes/inscriptos`):** Nómina de parejas inscriptas, discriminando titulares y suplentes con detalle de restricciones horarias.
- **Padrón de Sanciones (`/admin/reportes/sanciones`):** Informe de sanciones vigentes e históricas.
- **Formatos:** Descarga en PDF (mediante `jspdf-autotable`) con distribución optimizada de columnas y exportación a planilla CSV.

### 4.16. Estadísticas Públicas y Comparador Cara a Cara
- **Ficha del Jugador (`/jugadores/[id]`):** Historial de certámenes jugados, campeonatos obtenidos, partidos ganados/perdidos, ratio de sets y games, y vitrina de medallas.
- **Comparador Cara a Cara (`/jugadores/versus`):** Herramienta interactiva que permite contrastar a dos jugadores en paralelo: enfrentamientos directos entre sí (Head to Head), comparativa de efectividad y desglose de rendimiento.

---

## 5. Modelo de Datos y Entidades (Prisma / Base de Datos)

El esquema relacional consta de **31 modelos** y **13 enums**:

### 5.1. Enums Principales
- `PlatformRole`: `USER`, `SUPERADMIN`.
- `ComplejoRole`: `ADMIN`, `DATAENTRY`, `FISCAL`, `STAFF`.
- `ComplejoFeatureKey`: `NOTIFICACIONES`, `LOGROS`, `TURNOS`.
- `Genero`: `M`, `F`, `X`.
- `EventType`: `FINDE`, `SEMANAL`.
- `TournamentStatus`: `DRAFT`, `PUBLISHED`, `CLOSED_REGISTRATION`, `IN_PROGRESS`, `FINISHED`, `ARCHIVED`.
- `TournamentSexo`: `MASCULINO`, `FEMENINO`, `MIXTO`.
- `TournamentCategoryRule`: `LIBRE`, `MAYOR_IGUAL`, `MENOR_IGUAL`, `IGUAL`, `SUMA`.
- `TorneoFormato`: `ZONAS`, `ELIMINACION_DIRECTA`.
- `TorneoSiembra`: `RANKING`, `INSCRIPCION`.
- `MatchStatus`: `PENDING`, `SCHEDULED`, `IN_PROGRESS`, `FINISHED`, `WALKOVER`, `CANCELLED`.
- `TurnoSlotStatus`: `LIBRE`, `RESERVADO`, `BLOQUEADO`.
- `TurnoFrecuencia`: `DIARIA`, `SEMANAL`, `MENSUAL`.
- `BookingStatus`: `CONFIRMADA`, `CANCELADA`, `NO_SHOW`.
- `NotificationType`: `MATCH_REMINDER`, `MATCH_1H_REMINDER`, `MATCH_CHANGED`, `TOURNAMENT_START`, `TOURNAMENT_UPDATE`, `NEW_TOURNAMENT`, `RESULT_UPDATE`, `SYSTEM`.
- `NotificationStatus`: `PENDING`, `SENT`, `FAILED`.
- `PushPlatform`: `WEB`, `ANDROID`, `IOS`.
- `ImagenPerfilEstado`: `PENDIENTE`, `APROBADA`, `RECHAZADA`.
- `AuditoriaAccion`: `CREAR`, `ACTUALIZAR`, `BORRAR`, `MASIVA`.
- `SancionEstado`: `VIGENTE`, `ANULADA`.
- `LogroRareza`: `COMUN`, `POCO_COMUN`, `RARO`, `EPICO`, `LEGENDARIO`.
- `TokenEmailPurpose`: `VERIFICACION`, `RESET_PASSWORD`.

### 5.2. Mapa Sintético de Entidades

| Entidad | Propósito | Relaciones Clave |
|---|---|---|
| `User` | Usuario/Jugador global de la plataforma | ComplejoMembership, PerfilJugadorComplejo, Pareja, Ranking, TurnoReserva, Notification, ImagenPerfil, LogroUsuario, Auditoria |
| `Complejo` | Club/Complejo deportivo (tenant) | ComplejoMembership, Cancha, Evento, ComplejoFeature, ComplejoHorario, Recategorizacion, Sancion |
| `ComplejoMembership` | Asignación de rol de un usuario en un club | User, Complejo |
| `ComplejoHorario` | Horario de atención habitual por día | Complejo |
| `ComplejoHorarioExcepcion` | Excepciones puntuales de apertura/cierre | Complejo |
| `ComplejoFeature` | Estado de activación de funcionalidades por club | Complejo, User (editor) |
| `PerfilJugadorComplejo` | Categoría y estado de un jugador en un club | Complejo, User |
| `Cancha` | Cancha física de un club | Complejo, Partido, TurnoSlot, TurnoSerie |
| `Evento` | Agrupador temporal de torneos | Complejo, Torneo, User (creador) |
| `Torneo` | Competencia por categoría y formato | Evento, Pareja, Grupo, Partido, Ronda, Ranking |
| `Pareja` | Dupla inscripta a un torneo | Torneo, User (jugador 1), User (jugador 2), GrupoPareja, Partido |
| `Grupo` | Zona clasificatoria dentro de un torneo | Torneo, GrupoPareja, Partido |
| `GrupoPareja` | Asociación de pareja y seed en una zona | Grupo, Pareja |
| `Partido` | Encuentro deportivo (zona o llave) | Torneo, Grupo, Cancha, Pareja (1 y 2, ganador/perdedor), PartidoSet |
| `PartidoSet` | Resultado numérico por set | Partido |
| `Ronda` | Configuración de puntaje de ranking por fase | Torneo, Ranking |
| `Ranking` | Puntos asignados a un jugador en un torneo | User, Torneo, Ronda |
| `TurnoSerie` | Serie fija de turnos recurrentes | Complejo, Cancha, User, TurnoSlot |
| `TurnoSlot` | Franja horaria individual de una cancha | Cancha, TurnoSerie, TurnoReserva |
| `TurnoReserva` | Datos de reserva y contacto de un turno | TurnoSlot, User (jugador y creador) |
| `Recategorizacion` | Historial de cambio de nivel de un jugador | Complejo, User (jugador y creador) |
| `Sancion` | Suspensión disciplinaria en un complejo | Complejo, User (jugador, creador y anulador) |
| `Logro` | Catálogo de insignias de la plataforma | LogroUsuario |
| `LogroUsuario` | Progreso y obtención de insignias por jugador | User, Logro |
| `ImagenPerfil` | Foto subida con cola de moderación | User (dueño y moderador) |
| `Auditoria` | Registro cronológico inmutable de cambios | User (actor) |
| `Notification` | Cola de notificaciones a enviar | User |
| `PushToken` | Token de dispositivo para push FCM | User |
| `EmailVerification` | Token de un solo uso para mail / password reset | User |
| `Sponsor` / `ComplejoSponsor` | Patrocinadores asociados a complejos | Complejo |

---

## 6. Catálogo Completo de Rutas y Vistas

### 6.1. Portal Público y Jugadores
- `/`: Home con estadísticas globales, torneos abiertos, próximos partidos y accesos rápidos.
- `/login`: Inicio de sesión (Email/Password, Google OAuth, reCAPTCHA Enterprise).
- `/registrarse`: Registro de nuevos usuarios con combo dinámico de 24 provincias argentinas y localidades.
- `/confirmar-email`: Validación del token de confirmación de correo.
- `/recuperar` y `/recuperar/nueva`: Solicitud y restablecimiento de contraseña.
- `/completar-perfil`: Onboarding para usuarios federados que requieren completar DNI, género y fecha de nacimiento.
- `/sumar-complejo`: Formulario institucional para que clubes soliciten unirse a la plataforma.
- `/complejos`: Directorio general de complejos activos con buscador.
- `/complejos/[slug]`: Perfil público del club (datos, eventos, canchas).
- `/complejos/[slug]/calendario`: Fixture consolidado de partidos programados en el club.
- `/complejos/[slug]/eventos`: Listado de eventos abiertos y visibles del club.
- `/complejos/[slug]/jugadores`: Padrón de socios y jugadores del complejo.
- `/complejos/[slug]/ranking`: Tabla de ranking por categoría y género del complejo.
- `/complejos/[slug]/recategorizacion`: Historial público de recategorizaciones del club.
- `/complejos/[slug]/reglamento`: Reglamento oficial del complejo formateado en Markdown.
- `/complejos/[slug]/sanciones`: Listado oficial de sanciones disciplinarias vigentes e históricas.
- `/torneos`: Listado general de torneos en la plataforma con filtros.
- `/torneos/[id]`: Detalle público del torneo (información general, zonas clasificatorias y llave eliminatoria interactiva).
- `/torneos/[id]/inscripciones`: Listado de parejas inscriptas (titulares y suplentes).
- `/torneos/[id]/registrarse`: Flujo de inscripción pública por parejas con selector de compañero.
- `/torneos/[id]/inscripciones/[iid]/editar`: Modificación de compañero de inscripción por parte del jugador.
- `/jugadores/[id]`: Perfil y estadísticas públicas de un jugador, balance de partidos y medallas.
- `/jugadores/versus`: Comparativa cara a cara (Head-to-Head) entre dos jugadores.
- `/perfil`: Vista privada del jugador, edición de datos personales, avatar y visualización de logros.
- `/perfil/estadisticas`: Panel personal de rendimiento y partidos disputados.
- `/perfil/notificaciones`: Matriz de preferencias de notificaciones push.

### 6.2. Panel de Gestión del Club (`/admin/**`)
- `/admin`: Dashboard general del club (KPIs, ocupación, inscriptos, torneos activos).
- `/admin/complejos`: Listado de complejos asignados al usuario administrador.
- `/admin/complejos/[id]`: Detalle y acciones de gestión del complejo.
- `/admin/complejos/[id]/reglamento`: Editor del reglamento en Markdown propio.
- `/admin/complejos/[id]/canchas`: Listado y estado de canchas del club.
- `/admin/complejos/[id]/canchas/new` y `.../[idCancha]`: Alta y edición de canchas.
- `/admin/complejos/[id]/turnos`: Calendario de turnos de cancha, creación, cobros y configuración de horarios y excepciones.
- `/admin/complejos/[id]/eventos`: Listado de eventos del club.
- `/admin/complejos/[id]/eventos/new` y `.../[eventoId]`: Alta y edición de eventos.
- `/admin/complejos/[id]/eventos/[eventoId]/torneos/new`: Creación de torneo (categoría, cupo, formato, siembra y puntajes de ranking).
- `/admin/complejos/[id]/eventos/[eventoId]/torneos/[torneoId]`: Panel de avance del certamen (publicación, cierre de zonas, finalización).
- `/admin/complejos/[id]/eventos/[eventoId]/torneos/[torneoId]/inscripciones`: Mesa de entrada de inscriptos, altas manuales, bajas y restricciones horarias.
- `/admin/complejos/[id]/eventos/[eventoId]/torneos/[torneoId]/zonas`: Armador visual de zonas por siembra o manual drag-and-drop.
- `/admin/complejos/[id]/eventos/[eventoId]/torneos/[torneoId]/partidos`: Generador y programador de grilla horaria de partidos en canchas.
- `/admin/complejos/[id]/eventos/[eventoId]/torneos/[torneoId]/resultados`: Mesa de control para carga de sets, walkovers y desempates.
- `/admin/complejos/[id]/recategorizaciones`: Padrón y carga de nuevas recategorizaciones locales.
- `/admin/complejos/[id]/sanciones`: Administración y anulación de sanciones disciplinarias.
- `/admin/reportes`: Centro de reportes con selector de club y evento.
- `/admin/reportes/inscriptos`: Reporte descargable de inscriptos (PDF/CSV).
- `/admin/reportes/horarios`: Planilla de partidos del día con casillero de firmas (PDF/CSV).
- `/admin/reportes/sanciones`: Reporte disciplinario (PDF/CSV).

### 6.3. Administración Global (`/superadmin/**`)
- `/superadmin`: Dashboard integral de la plataforma (métricas globales, usuarios, distribución geográfica y detección de cuentas duplicadas).
- `/superadmin/complejos`: Padrón global de complejos con alta, edición, baja lógica y asignación de administradores.
- `/superadmin/complejos/[id]/funcionalidades`: Matriz de activación de módulos (`TURNOS`, `NOTIFICACIONES`, `LOGROS`) para un club.
- `/superadmin/funcionalidades`: Matriz global de features por complejo.
- `/superadmin/usuarios`: Gestión global de usuarios, altas, modificaciones, validación manual de perfiles y reseteo de roles.
- `/superadmin/imagenes`: Cola de moderación visual de fotos de perfil (aprobar / rechazar con motivo).
- `/superadmin/logros`: ABM del catálogo global de logros, medallas, rarezas y reglas de asignación.
- `/superadmin/auditoria`: Visor del registro de auditoría del sistema con búsqueda por tabla, actor, acción y diff JSON de cambios.

### 6.4. Endpoints de API y Rutas Especiales
- `/api/cron/turnos`: Endpoint protegido para extender la ventana móvil de turnos fijos.
- `/api/cron/notifications`: Endpoint protegido para procesar y despachar la cola de notificaciones push pendientes.
- `/api/cron/imagenes`: Endpoint protegido para purgar imágenes rechazadas que superaron la retención de 30 días.
- `/api/cron/auditoria`: Endpoint protegido para depurar registros de auditoría mayores a 12 meses.
- `/api/imagenes/perfil/[imagenId]/[variante]`: Servidor seguro de bytes de imagen de perfil con control de moderación y aislamiento de disco.
- `/api/perfil/avatar`: Endpoint para recepción de recortes de avatar codificados en Base64.
- `/manifest.webmanifest`: Endpoint dinámico del Web App Manifest.

---

## 7. Procesos en Background y Tareas Programadas (Crons)

Las tareas en segundo plano se invocan mediante solicitudes HTTP protegidas con el header `Authorization: Bearer <CRON_SECRET>`:

```
                      CRON TRIGGER (Externo / Vercel Cron / Script)
                                           │
                        Authorization: Bearer <CRON_SECRET>
                                           │
         ┌──────────────────┬──────────────┴─────┬──────────────────┐
         ▼                  ▼                    ▼                  ▼
/api/cron/turnos   /api/cron/notifications /api/cron/imagenes  /api/cron/auditoria
         │                  │                    │                  │
         ▼                  ▼                    ▼                  ▼
Materializa series   Despacha push FCM     Borra fotos         Purga logs de
 fijas recurrentes    pendientes por        rechazadas con      auditoría con
 a 90 días vista       lotes de 100          >30 días           >12 meses
```

1. **Extensión de Turnos Recurrentes (`cron/turnos-cron.ts`):**
   - Recorre todas las series activas (`TurnoSerie`) y materializa las ocurrencias de turnos hasta un horizonte móvil de 90 días.
   - Respeta el horario de apertura del club y sus excepciones por fecha.
   - Saltea automáticamente slots que colisionen con otros turnos o partidos programados.
2. **Despacho de Notificaciones Push (`cron/notification-cron.ts`):**
   - Consulta notificaciones en estado `PENDING` cuya fecha `scheduledAt` sea menor o igual a la fecha actual (procesadas en lotes de 100).
   - Realiza la entrega vía `sendPushToUser()` mediante FCM y actualiza el estado a `SENT` o `FAILED`.
3. **Limpieza de Imágenes Rechazadas (`cron/imagenes-cron.ts`):**
   - Elimina filas de `ImagenPerfil` en estado `RECHAZADA` con fecha de moderación superior a 30 días.
   - Remueve físicamente los archivos del sistema de archivos (`var/uploads/users/<id>/`).
4. **Purga de Auditoría (`cron/auditoria-cron.ts`):**
   - Depura registros de la tabla `Auditoria` con antigüedad superior a 12 meses en lotes de 5000 registros para evitar bloqueos en la base de datos.

---

## 8. Scripts de Validación e Invariantes del Dominio

El proyecto cuenta con un conjunto de herramientas ejecutables en TypeScript (`scripts/`) que actúan como tests de invariantes y salvaguardas mecánicas:

- **`check-auditoria.ts`:** Verifica que todos los modelos del esquema de Prisma estén clasificados como auditados o explícitamente excluidos, y detecta usos indebidos de `prisma.$transaction` sin transacciones auditadas.
- **`check-torneo-llave.ts`:** Valida la coherencia de los cruces de LLAVE_TABLA para torneos de 2 a 32 zonas, asegurando que parejas de la misma zona nunca se crucen antes de la final.
- **`check-llave-resolucion.ts`:** Evalúa el algoritmo de avance y propagación de resultados en el cuadro eliminatorio.
- **`check-siembra.ts`:** Comprueba la correcta distribución de cabezas de serie y seeds en cuadros directos.
- **`check-turnos.ts`:** Verifica la detección de solapamientos en turnos, generación de recurrencias y cumplimiento de horarios de complejo.
- **`check-dashboard.ts`:** Valida las funciones matemáticas y agrupamientos estadísticos del dashboard sin requerir conexión a base de datos.
- **`check-breadcrumbs.tsx`:** Garantiza la integridad de la jerarquía de navegación y migas de pan en las pantallas de gestión.
- **`check-css-muerto.ts`:** Audita las clases de Tailwind compiladas contra el código fuente para asegurar que no existan clases muertas o remanentes de Bootstrap.
- **`check-ubicaciones.ts`:** Valida la concordancia entre las 24 provincias canónicas y el dataset de localidades de INDEC.
- **`backfill-*`:** Scripts para migración de datos (retrocompatibilidad de IDs legibles de partidos, slugs de complejos y normalización de imágenes de perfil).

---

## 9. Reglas de Negocio e Invariantes Clave

1. **Email Verificado Obligatorio para Competir:** Un jugador con email no verificado puede iniciar sesión, reservar turnos y navegar por el sitio, pero **tiene terminantemente prohibido inscribirse en torneos**, garantizando que las comunicaciones oficiales de horarios y avisos lleguen a casillas reales.
2. **Parejas Únicas por Torneo:** Ningún usuario puede figurar en más de una pareja dentro de una misma competencia, independientemente de si está en lista titular o de suplentes.
3. **Bloqueo Inflexible por Sanciones:** Las sanciones impuestas por un club impiden la inscripción del jugador sancionado a cualquier torneo de ese mismo club durante todo el período de vigencia (de 00:00 del día inicial a 23:59 del día final). No afecta su participación en otros complejos.
4. **Inmutabilidad de Sanciones:** No existe el borrado físico de una sanción disciplinaria; solo pueden ser levantadas mediante su anulación formal, preservando el registro histórico.
5. **Aislamiento de Recursos Multimedia:** Ningún archivo multimedia subido por usuarios se sirve directamente desde la carpeta estática pública `public/`. Toda imagen se valida binariamente y se entrega a través de endpoints seguros controlados por estado de moderación.
6. **Prioridad de Categorización:** Para validar la elegibilidad en un certamen, el sistema prioriza la categoría asignada al jugador por el club organizador (`PerfilJugadorComplejo.categoria`); en caso de no existir, recurre a la categoría global del usuario (`User.categoria`).
7. **Reversibilidad Segura de Cuadros:** La fase de zonas de un torneo puede reabrirse y la llave eliminatoria puede volver a calcularse libremente **siempre y cuando ningún partido de la fase de llave haya registrado un resultado definitivo**.
8. **Invarianza de la Auditoría:** Ninguna operación destructiva o modificatoria sobre modelos principales se ejecuta fuera del contexto de auditoría; los logs generados son estrictamente de solo lectura y solo el cron de retención puede depurar registros históricos.

