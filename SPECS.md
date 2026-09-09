# Especificaciones del Proyecto PadelNet

El documento detallado y completo con las especificaciones técnicas, funcionales, de arquitectura, modelo de datos, reglas de negocio e invariantes del sistema se encuentra disponible en:

👉 **[`docs/ESPECIFICACIONES.md`](./docs/ESPECIFICACIONES.md)**

### Resumen de Secciones Incluidas
1. **Visión General y Propósito del Sistema** (Multi-tenant, torneos, turnos, perfiles).
2. **Arquitectura Tecnológica y Stack** (Next.js 16, React 19, Prisma 7, MariaDB, Tailwind CSS v4, PWA, TensorFlow.js / face-api.js, Firebase Cloud Messaging, Resend, reCAPTCHA Enterprise).
3. **Modelo de Roles, Permisos y Seguridad** (PlatformRole vs ComplejoRole, Feature Flags modulares, guards `requireComplejoRole`).
4. **Especificaciones Funcionales por Módulo**:
   - Complejos, canchas, horarios y excepciones.
   - Eventos y torneos (formatos Zonas y Eliminación directa).
   - Elegibilidad, control de categorías, género y promoción automática de lista de espera.
   - Motor de fixture, scheduling con restricciones horarias y desempates.
   - Avance de llaves, walkovers y reversibilidad controlada.
   - Sistema de ranking por puntos configurables por certamen.
   - Calendario de turnos de cancha y series recurrentes (ventana móvil a 90 días).
   - Recategorización local vs global con historial.
   - Sanciones disciplinarias inmutables con bloqueo en tiempo real.
   - Gamificación: 19 logros, 5 rarezas y disparadores de eventos.
   - Moderación visual de fotos con detección facial e hitos de recorte.
   - Auditoría automática de 22 modelos de Prisma con diff JSON.
   - Notificaciones push transaccionales y preferencias de usuario.
   - Reportes y planillas de control en PDF y CSV.
   - Estadísticas públicas y comparador "Cara a Cara" (Versus).
5. **Modelo de Datos y Entidades** (Detalle de los 31 modelos y 13 enums de Prisma).
6. **Catálogo Completo de Rutas y Vistas** (Rutas públicas, de gestión `/admin/**` y globales `/superadmin/**`).
7. **Procesos en Background y Tareas Programadas** (`/api/cron/*` protegidos por token).
8. **Scripts de Validación e Invariantes del Dominio** (`check-*` ejecutables).
9. **Reglas de Negocio e Invariantes Clave**.

