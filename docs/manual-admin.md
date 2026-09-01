# Manual del administrador de club

Que puede hacer un ADMIN de complejo en PadelNet, como se hace, y un guion de
video corto por cada cosa.

Los nombres de botones y pantallas de este documento son los que estan en el
sitio, tal cual. Si algo no coincide, es que la pantalla cambio y hay que
actualizar este archivo.

---

## Como esta organizado

Cada seccion tiene dos partes:

- **Como se hace** — los pasos, para leer.
- **Guion de video** — dos columnas: que se ve en pantalla y que dice la voz en
  off. Pensados para 60 a 90 segundos.

Los videos estan numerados en el orden en que conviene aprender, que **no** es
el orden del menu. Un club que arranca hace del 1 al 5 y ya puede trabajar.

---

## Antes de grabar cualquier video

Cosas que aplican a todos y no se repiten en cada guion.

**Datos.** El sitio muestra DNI, mail y telefono de jugadores reales. **Grabar
siempre contra datos de prueba**, con un club de mentira y jugadores inventados.
Si por algo hay que grabar con datos reales, difuminar en la edicion.

**Pantalla.** 1920x1080, navegador al 100% de zoom, sin barra de marcadores, sin
extensiones que pinten iconos, y en ventana limpia sin otras pestañas abiertas.

**Tema.** El sitio tiene modo claro y oscuro. Elegir uno y usar el mismo en toda
la serie: alternar entre videos se nota y distrae.

**Ritmo.** Grabar primero la pantalla sola, sin hablar, moviendose despacio y
haciendo una pausa de un segundo antes de cada click. La voz se graba despues
sobre eso. Sale mucho mejor que intentar hacer las dos cosas juntas.

**Duracion.** Si un video pasa de 90 segundos, casi siempre es que adentro habia
dos videos.

**El cursor.** Moverlo poco y directo. Nada de circulitos sobre el boton antes
de apretarlo.

---

## Lo primero: que es un ADMIN y que no puede hacer

Conviene decirlo antes de que alguien lo descubra buscando el boton.

Un ADMIN **manda sobre su club**: eventos, torneos, canchas, turnos,
inscripciones, sanciones, recategorizaciones y reglamento.

Un ADMIN **no** puede:

| No puede | Quien puede |
|---|---|
| Crear un complejo nuevo | Superadmin |
| Editar los datos del club (nombre, direccion, telefono, ciudad) | Superadmin |
| Eliminar el complejo | Superadmin |
| Prender o apagar funcionalidades (Turnos, Notificaciones, Logros) | Superadmin |
| Moderar fotos de perfil | Superadmin |
| Ver la auditoria completa de la plataforma | Superadmin |

Por eso en la pantalla **Gestion** el admin no ve el boton "Nuevo Complejo" ni
las acciones "Editar complejo", "Eliminar complejo" y "Funcionalidades": no
estan ocultas por error, no le corresponden.

**Consecuencia practica:** si el club cambia de telefono o de direccion, hay que
pedirselo al superadmin. Y si la seccion **Turnos de cancha** no aparece en el
menu, es porque el superadmin todavia no le prendio esa funcionalidad al club.

---

# Video 1 — Entrar y orientarse (60 s)

## Como se hace

Al iniciar sesion con una cuenta que administra algun club, aparecen en el menu
de arriba estas opciones:

| Opcion | Para que es |
|---|---|
| **Panel** | Numeros del club: torneos, inscriptos, ocupacion |
| **Gestion** | La lista de clubes que administras. **Es la puerta a todo lo demas** |
| **Eventos** | Todos tus eventos juntos, sin entrar por el club |
| **Torneos** | Todos tus torneos juntos |
| **Reportes** | Listados para imprimir o exportar |
| **Turnos** | Solo si el club tiene la funcionalidad prendida |

La ruta que se usa el 90% del tiempo es **Gestion → el club → la seccion**. En
la fila del club, el boton de acciones abre el menu con: **Eventos del
complejo**, **Canchas del complejo**, **Reglamento**, **Recategorizaciones**,
**Sanciones** y, si esta habilitado, **Turnos de cancha**.

## Guion

**Antes de grabar:** sesion iniciada con un usuario ADMIN de un club de prueba
que tenga Turnos habilitado y al menos un evento cargado.

| Pantalla | Voz en off |
|---|---|
| Home del sitio, ya logueado. Cursor quieto. | "Cuando tu usuario administra un club, en el menu de arriba te aparecen opciones que el resto de los jugadores no ve." |
| Pasar el cursor por el menu, despacio, sobre Panel, Gestion, Eventos, Torneos y Reportes. | "Panel, Gestion, Eventos, Torneos y Reportes." |
| Click en **Panel**. Dejar que carguen los numeros. | "El Panel te da los numeros de tu club de un vistazo: cuantos torneos tenes, cuantos inscriptos, como venis de ocupacion." |
| Click en **Gestion**. Se ve la lista con el club. | "Pero el lugar donde vas a estar casi siempre es Gestion. Aca esta tu club." |
| Click en el boton de acciones de la fila del club. Se despliega el menu. Mantenerlo abierto 3 segundos. | "Y desde este boton entras a todo: los eventos, las canchas, el reglamento, las recategorizaciones, las sanciones y los turnos." |
| Cerrar el menu. Cursor quieto. | "Todo lo que vas a ver en estos videos sale de aca." |

---

# Video 2 — Cargar las canchas (60 s)

## Como se hace

**Gestion → acciones del club → Canchas del complejo → Nueva cancha.**

Cada cancha tiene numero, nombre opcional, superficie, y tres marcas: **Indoor**,
**Dobles** y **Activa**.

El **numero** es lo que identifica la cancha en todo el sitio y no se puede
repetir dentro del mismo club. El **nombre** es opcional y sirve para las que
todos llaman de otra forma: "Cancha 3 - La del fondo".

**Activa** es el interruptor que importa: una cancha desactivada deja de
ofrecerse para turnos y para programar partidos, pero **no se borra** y conserva
todo su historial. Para una cancha en refaccion, desactivarla es lo correcto;
eliminarla, no.

## Guion

**Antes de grabar:** club de prueba sin canchas, o con una sola, para que se vea
la lista crecer.

| Pantalla | Voz en off |
|---|---|
| Gestion, menu de acciones del club abierto, cursor sobre "Canchas del complejo". Click. | "Lo primero que carga un club son sus canchas, porque todo lo demas se apoya en esto." |
| Lista de canchas. Click en el boton de nueva cancha. | "Le damos a nueva cancha." |
| Formulario vacio. Escribir el numero: 1. | "El numero es como se identifica la cancha en todo el sitio, y no se puede repetir dentro del mismo club." |
| Escribir el nombre: "La del fondo". | "El nombre es opcional. Sirve para las canchas que en el club todos llaman de otra manera." |
| Elegir superficie. Marcar Indoor y Dobles. | "Superficie, si es techada, si es de dobles." |
| Señalar el check **Activa**, sin desmarcarlo. | "Y este es el que importa: Activa. Si mas adelante tenes una cancha en refaccion, la desmarcas y deja de ofrecerse para turnos y para partidos. Pero no la borres: desactivada conserva todo el historial." |
| Guardar. Volver a la lista, ahora con la cancha nueva. | "Guardamos, y ya la tenemos. Repetis esto por cada cancha del club." |

---

# Video 3 — El horario de atencion del club (75 s)

## Como se hace

**Gestion → acciones del club → Turnos de cancha → panel de horarios.**

Se carga el horario semanal: para cada dia, **Desde**, **Hasta**, o la marca
**Cerrado**.

Aparte estan las **excepciones**: una fecha puntual con su **Motivo** ("Feriado",
"Mantenimiento"). La excepcion pisa al horario semanal solo ese dia.

Esto es la base del calendario: fuera del horario no se pueden crear turnos.
Cargarlo bien al principio evita tener que explicar despues por que no aparece
un horario.

## Guion

**Antes de grabar:** seccion de turnos abierta, horario semanal vacio o con
valores obviamente equivocados para poder corregirlos en camara.

| Pantalla | Voz en off |
|---|---|
| Seccion Turnos de cancha, panel de horarios a la vista. | "Antes de cargar el primer turno hay que decirle al sistema cuando abre el club." |
| Cargar Desde y Hasta del lunes: 9 a 23. | "Para cada dia ponemos desde que hora y hasta que hora se puede reservar." |
| Repetir rapido en martes y miercoles. | "Y asi con cada dia de la semana." |
| Ir al domingo y marcar **Cerrado**. | "Si el club no abre un dia, lo marcas como cerrado y listo." |
| Guardar. Aparece el aviso de guardado. | "Guardamos." |
| Bajar al bloque de excepciones. Elegir una fecha. | "Aparte estan las excepciones, que son para un dia puntual." |
| Escribir en Motivo: "Feriado". Guardar. | "Un feriado, un dia de mantenimiento. Elegis la fecha, ponés el motivo, y ese dia queda fuera sin tocar el horario de todas las semanas." |
| Volver a la vista del calendario. | "Con esto cargado, el calendario ya sabe cuando se puede reservar y cuando no." |

---

# Video 4 — Cargar un turno (90 s)

## Como se hace

**Turnos de cancha** abre el calendario. Se puede ver por **Semana** o filtrar
por **Cancha**, y esta el selector **Todas las canchas**.

Para cargar uno: click en el hueco libre. Se abre el formulario **Crear turno**
con **Cancha**, **Fecha**, **Hora de inicio**, **Duracion**, **Titular**, y
**Notas**.

El **Titular** se resuelve de dos maneras:

- **Jugador registrado:** se busca por nombre, mail o DNI. Es lo preferible: el
  turno le queda asociado a su cuenta.
- **Suelto:** nombre, apellido y telefono a mano, para el que no tiene cuenta.

Tres opciones mas:

- **Ya esta pago** — marca el turno como cobrado desde el momento en que se crea.
- **Turno fijo** — hace que se repita. Al elegirlo se pide la frecuencia; con
  "No se repite" queda suelto.
- **Bloquear la cancha (mantenimiento, sin reserva)** — ocupa el horario sin que
  haya reserva de nadie. Es para mantenimiento, una clase o un evento privado.

## Guion

**Antes de grabar:** calendario con el horario ya cargado y algun turno existente
de fondo, para que no se vea vacio. Tener a mano el nombre de un jugador de
prueba que se pueda buscar.

| Pantalla | Voz en off |
|---|---|
| Calendario de turnos, vista Semana. | "Este es el calendario del club. Lo podes ver por semana, y filtrar por cancha o ver todas juntas." |
| Click en un hueco libre. Se abre el formulario. | "Para cargar un turno, hacés click en el hueco libre." |
| Se ven Cancha, Fecha y Hora ya completas. | "La cancha, la fecha y la hora ya vienen puestas por donde hiciste click." |
| Elegir Duracion: 90 minutos. | "Elegis la duracion." |
| En Titular, escribir tres letras y elegir un jugador de la lista. | "Y el titular. Si es un jugador registrado, lo buscas por nombre, mail o DNI, y el turno le queda asociado a su cuenta." |
| Borrar y mostrar los campos de nombre y telefono sueltos. | "Y si es alguien que no tiene cuenta, ponés el nombre y el telefono a mano." |
| Señalar **Ya esta pago** sin marcarlo. | "Si te lo pagan en el momento, lo marcas aca y queda cobrado desde el arranque." |
| Señalar **Turno fijo**, desplegar la frecuencia, volver a "No se repite". | "Y si es un turno fijo, elegis cada cuanto se repite y el sistema lo va creando solo, semana a semana." |
| Crear turno. Aparece en el calendario. | "Creamos, y ahi lo tenemos." |
| Volver a abrir el formulario y marcar **Bloquear la cancha**. | "Un caso aparte: si necesitas la cancha para mantenimiento o para una clase, en vez de cargar un titular la bloqueas. Ocupa el horario, pero no es la reserva de nadie." |

---

# Video 5 — Cobrar y cancelar un turno (60 s)

## Como se hace

Click sobre un turno del calendario y se abre el detalle: **Cancha**,
**Fecha**, **Horario**, **Telefono**, **Pago**, **Notas** y, si corresponde,
**Turno fijo**.

- **Marcar pagado / Marcar impago** — el estado va y viene, no es definitivo.
- **Cancelar el turno** — pide confirmacion. Si el turno **es parte de una
  serie**, pregunta ademas que se quiere cancelar: **Solo este turno** o los
  siguientes. Cortar la serie afecta a todas las ocurrencias que faltan.

## Guion

**Antes de grabar:** un turno normal sin pagar y un turno de una serie fija, los
dos visibles en la misma semana.

| Pantalla | Voz en off |
|---|---|
| Calendario. Click sobre un turno cargado. | "Si hacés click en un turno que ya existe, se abre el detalle." |
| Detalle abierto. Señalar el estado **Impago**. | "Aca ves quien es, el telefono, y si esta pago o impago." |
| Click en **Marcar pagado**. Cambia a Pagado. | "Cuando te lo pagan, marcas pagado. Y si te equivocaste, lo volves atras: no es definitivo." |
| Click en **Cancelar el turno**. Aparece la confirmacion. | "Para cancelar, cancelas el turno y te pide confirmacion." |
| Cerrar sin confirmar. Click en un turno que es parte de una serie. Click en cancelar. | "Ojo con este caso: si el turno es parte de una serie, o sea un turno fijo, te pregunta algo mas." |
| Se ven las opciones **Solo este turno** y la de siguientes. Zoom. | "Podes cancelar solo este, por ejemplo porque esta semana no vienen. O cortar la serie, y ahi se dan de baja todos los que faltan de acá en adelante." |
| Elegir **Solo este turno** y confirmar. | "Elegis lo que corresponde y confirmas." |

---

# Video 6 — Crear un evento (60 s)

## Como se hace

Un **evento** es el paraguas que agrupa torneos: "Torneo de Verano 2026",
"Interclubes Marzo". Los torneos siempre cuelgan de un evento.

**Gestion → acciones del club → Eventos del complejo → nuevo evento.**

Campos: **Nombre**, **Tipo de evento** (**Fin de semana** o **Semanal**),
**Inicio**, **Fin**, **Descripcion**, **Poster URL**, y tres marcas: **Evento
abierto**, **Visible** y **Finalizado**.

**Visible** es lo que decide si el evento se ve en la pagina publica del club.
Mientras se prepara, conviene dejarlo sin marcar.

## Guion

**Antes de grabar:** lista de eventos con uno o dos ya cargados.

| Pantalla | Voz en off |
|---|---|
| Lista de eventos del club. | "En PadelNet los torneos no van sueltos: cuelgan de un evento." |
| Cursor sobre un evento existente. | "Un evento es el paraguas. Por ejemplo, Torneo de Verano, y adentro los torneos de cada categoria." |
| Click en nuevo evento. Formulario vacio. | "Creamos uno." |
| Escribir el nombre: "Torneo de Verano 2026". | "Le ponemos nombre." |
| Desplegar **Tipo de evento**, mostrar Fin de semana y Semanal. Elegir uno. | "Elegis si es de fin de semana o semanal." |
| Cargar **Inicio** y **Fin**. | "Las fechas de inicio y fin." |
| Escribir algo en Descripcion. | "Una descripcion, que es opcional." |
| Señalar el check **Visible**, dejarlo sin marcar. | "Y prestá atencion a este: Visible. Es lo que hace que el evento aparezca en la pagina publica del club. Mientras lo estas armando, dejalo sin marcar. Lo prendés cuando este listo." |
| Guardar evento. Vuelve a la lista con el evento nuevo. | "Guardamos, y ya tenemos donde meter los torneos." |

---

# Video 7 — Crear un torneo (90 s)

## Como se hace

Desde el evento: **Torneos del evento → nuevo torneo**.

| Campo | Que hace |
|---|---|
| **Nombre** | Como se llama. No se repite dentro del mismo evento |
| **Categoria** | La categoria del torneo |
| Sexo | **Masculino**, **Femenino** o **Mixto** |
| Regla de categoria | **Libre**, **Mayor o igual a N**, **Menor o igual a N**, **Igual a N**, **Suma N (pareja)** |
| **Capacidad** | Cuantas parejas entran al cuadro principal. Pasado ese numero, las que se anotan van a suplentes |
| **Jugadores por zona** | Cuantas parejas por zona |
| **Formato** | **Zonas y despues llave** o **Eliminacion directa** |
| Siembra | **Ranking del club** u **Orden de inscripcion** |
| **Estado** | Arranca en **Draft** |
| **Inicio** / **Fin** | Fechas |
| **Imagen (URL)** y **Comentario** | Opcionales |

La **regla de categoria** es la que filtra quien se puede anotar, y se aplica
sola cuando el jugador intenta inscribirse. "Suma N (pareja)" mira la suma de
las dos categorias, que es como se arman los torneos donde puede jugar un
quinta con un tercera.

La **siembra** solo se usa en eliminacion directa. En zonas, el orden lo define
la tabla.

## Guion

**Antes de grabar:** un evento creado y vacio, sin torneos.

| Pantalla | Voz en off |
|---|---|
| Evento abierto, lista de torneos vacia. Click en nuevo torneo. | "Dentro del evento creamos el torneo." |
| Escribir nombre: "Cuarta Caballeros". | "Nombre." |
| Elegir categoria y **Masculino**. | "La categoria y si es masculino, femenino o mixto." |
| Desplegar la regla de categoria. Mantener abierto mostrando las cinco opciones. | "Esta es la regla que decide quien se puede anotar. Podes dejarla libre, o pedir que sean de una categoria exacta, o de esa para arriba, o para abajo." |
| Elegir **Suma N (pareja)** y poner un valor. | "Y esta ultima es la que mas se usa en los sociales: suma de la pareja. Ponés siete, y se puede anotar un cuarta con un tercera, o un quinta con un segunda. El sistema lo controla solo cuando el jugador se quiere inscribir." |
| Cargar **Capacidad**: 24. | "La capacidad es cuantas parejas entran al cuadro. Cuando se llena, las que siguen anotandose van automaticamente a la lista de suplentes." |
| Cargar **Jugadores por zona**: 3. | "Cuantas parejas por zona." |
| Desplegar **Formato**, mostrar las dos opciones, elegir **Zonas y despues llave**. | "Y el formato: zonas y despues llave, que es lo clasico, o eliminacion directa." |
| Señalar **Estado** en **Draft**. | "Lo dejamos en borrador. Todavia no lo estamos abriendo." |
| Guardar torneo. | "Guardamos." |

---

# Video 8 — Publicar el torneo y abrir las inscripciones (60 s)

## Como se hace

Entrar al torneo. En el panel de avance esta **Publicar torneo**, con esta
aclaracion debajo:

> *Lo hace visible y abre las inscripciones. Avisa a los jugadores de la
> categoria.*

Las tres cosas pasan de una:

1. El torneo aparece en la pagina publica del club.
2. Los jugadores pueden anotarse solos.
3. **Sale un aviso a los jugadores de esa categoria.** Este es el que conviene
   pensar dos veces: el aviso sale una vez. Publicar con la fecha mal cargada y
   corregirla despues significa que el aviso ya salio con el dato viejo.

El estado pasa de **Borrador** a **Publicado**.

## Guion

**Antes de grabar:** torneo creado en Borrador, con todos los datos correctos.

| Pantalla | Voz en off |
|---|---|
| Torneo abierto. Señalar el estado **Borrador**. | "El torneo esta en borrador. Existe, pero no lo ve nadie." |
| Cursor sobre el boton **Publicar torneo**, sin apretarlo. Zoom al texto de ayuda. | "Este boton hace tres cosas de una: lo muestra en la pagina del club, abre las inscripciones, y le avisa a los jugadores de la categoria." |
| Mantener el cursor ahi un segundo. | "Y por esa tercera es que conviene revisar todo antes. El aviso sale una sola vez. Si publicas con la fecha mal y despues la corregis, el aviso ya salio con el dato viejo." |
| Click en **Publicar torneo**. El estado pasa a **Publicado**. | "Cuando esta todo bien, publicamos." |
| Abrir en otra pestaña la pagina publica del club y mostrar el torneo listado. | "Y desde ese momento el torneo esta visible y los jugadores se pueden anotar solos, en pareja, desde la pagina." |

---

# Video 9 — Manejar las inscripciones (90 s)

## Como se hace

Desde el torneo: **Inscripciones**.

Los jugadores se anotan solos, pero el admin tambien puede:

- **Inscribir a mano.** Buscar por nombre, apellido o mail, elegir **jugador 1**
  y **jugador 2**. El sistema valida solo: sexo, regla de categoria, que ninguno
  este ya anotado, y que no tengan una sancion vigente. Si algo no da, avisa y no
  deja.
- **Cargar una restriccion horaria.** Es lo que el jugador no puede cargar solo:
  "no puedo jugar antes de las 20". Se elige **dia**, **hora inicio** y **hora
  fin**, y despues se tiene en cuenta al programar los partidos.
- **Dar de baja** y **reactivar** una inscripcion.

En el listado, cada pareja figura como **Titular** o **Suplente** segun la
capacidad del torneo.

## Guion

**Antes de grabar:** torneo publicado con 3 o 4 parejas ya inscriptas, para que
la lista no este vacia. Tener a mano dos jugadores de prueba que cumplan la
regla de categoria.

| Pantalla | Voz en off |
|---|---|
| Pantalla de inscripciones con parejas cargadas. | "Aca ves quien se anoto. Los jugadores se inscriben solos desde la pagina, pero vos tambien podes hacerlo." |
| Señalar las etiquetas **Titular** y **Suplente**. | "Cada pareja figura como titular o suplente, segun la capacidad que le pusiste al torneo." |
| Ir al buscador. Escribir un apellido. Elegir **jugador 1**. | "Para anotar a mano, buscas por nombre, apellido o mail." |
| Elegir **jugador 2**. Inscribir. | "Elegis los dos y los inscribis." |
| Provocar un rechazo: elegir una pareja que no cumpla la regla. Mostrar el mensaje. | "Y si la pareja no cumple la regla del torneo, o alguno ya esta anotado, o tiene una sancion vigente, el sistema no te deja y te dice por que." |
| Volver al listado. Abrir la restriccion horaria de una pareja. | "Hay una cosa que solo podes cargar vos: la restriccion horaria." |
| Elegir **Seleccionar dia**, cargar **Hora inicio** y **Hora fin**. Guardar. | "Si una pareja te avisa que el sabado no puede antes de las ocho, lo cargas aca. Despues, cuando armes los horarios de los partidos, lo vas a tener a mano." |
| Cursor sobre la accion de dar de baja una inscripcion. | "Y desde aca das de baja una inscripcion, o la reactivas si se arrepintieron." |

---

# Video 10 — Armar las zonas (90 s)

## Como se hace

Desde el torneo: **Armar zonas**.

Dos caminos:

**Automatico.** Se define **Cantidad de zonas** o **Parejas por zona**, y se
aprieta:

- *Crea las zonas vacias con la cantidad elegida arriba.*
- **Armar zonas por tabla** — *Reparte las parejas por orden de siembra y
  reemplaza las zonas actuales.*

**A mano.** Se arrastran las parejas desde el pool a cada zona. Si una zona esta
llena, al soltar una pareja sobre otra **las intercambia** — el sistema lo avisa:
*"La zona esta completa. Solta sobre una pareja para intercambiar."*

Nada queda firme hasta apretar **Guardar zonas** (*Persiste el reparto actual de
parejas por zona*).

## Guion

**Antes de grabar:** torneo con al menos 9 parejas inscriptas, zonas sin armar.

| Pantalla | Voz en off |
|---|---|
| Pantalla de zonas, todas las parejas en el pool. | "Con las parejas anotadas, armamos las zonas." |
| Cargar **Cantidad de zonas**: 3. | "Le decis cuantas zonas queres, o cuantas parejas por zona." |
| Click en **Armar zonas por tabla**. Las parejas se reparten. | "Y con armar zonas por tabla las reparte solo, siguiendo el orden de siembra." |
| Zoom a las zonas armadas. | "Esto te resuelve el noventa por ciento de los casos." |
| Arrastrar una pareja de la Zona A a la Zona B. | "Pero siempre hay algo para ajustar a mano: que dos del mismo club no se crucen en primera ronda, que tal pareja quede en tal zona. Arrastras y listo." |
| Soltar una pareja sobre otra en una zona llena. Se intercambian. Mostrar el aviso. | "Si la zona ya esta completa, la soltas encima de otra pareja y se intercambian." |
| Cursor sobre **Guardar zonas**. Pausa. | "Y esto es importante: hasta que no le des a guardar zonas, nada de esto quedo grabado." |
| Click en **Guardar zonas**. Aparece la confirmacion. | "Guardamos, y ahora si." |

---

# Video 11 — Programar los partidos (90 s)

## Como se hace

Desde el torneo: **Programar partidos**.

Es un proceso de dos tiempos, a proposito:

1. **Generar vista previa** — *Arma una grilla tentativa con las canchas
   elegidas. No guarda nada todavia.*
2. **Guardar en DB** — *Confirma esta grilla y crea los partidos. Reemplaza los
   que ya existan.*

Antes de generar se eligen las canchas y, por cada **Dia**, la hora de **Inicio**
y de **Fin**. Hay un boton que copia esos horarios a las demas canchas
seleccionadas (*Aplica estos horarios, dia por dia, a todas las demas canchas
seleccionadas*), que ahorra cargar lo mismo tres veces.

La pantalla avisa cuantos **Partidos existentes** hay y cuantos **Partidos de
llave sin horario** quedan.

**Ojo con "Reemplaza los que ya existan".** Si ya se programaron partidos y se
vuelve a guardar, se pisan. Se pueden reprogramar sin problema, pero no es un
"agregar".

## Guion

**Antes de grabar:** torneo con zonas ya guardadas y sin partidos programados.
Tener al menos dos canchas activas.

| Pantalla | Voz en off |
|---|---|
| Pantalla de crear partidos. | "Con las zonas armadas, ya podemos poner dia, hora y cancha." |
| Marcar dos canchas. | "Elegis con que canchas contas." |
| En el primer dia, cargar **Inicio** 09:00 y **Fin** 13:00. | "Y por cada dia, de que hora a que hora se juega." |
| Click en el boton de copiar horarios. Se replican en la otra cancha. | "Si todas las canchas tienen el mismo horario, lo cargas una vez y lo copias al resto." |
| Click en **Generar vista previa**. Aparece la grilla. | "Ahora generamos la vista previa." |
| Recorrer la grilla despacio: partido, zona, dia, hora, cancha. | "Y esto es una propuesta. Todavia no se guardo nada. Lo mirás con calma: los cruces, los horarios, que no haya quedado nadie jugando dos veces seguidas." |
| Cursor sobre **Guardar en DB**. Pausa. | "Cuando estas conforme, guardas. Y aca prestá atencion: guardar reemplaza los partidos que ya existieran de este torneo." |
| Click en **Guardar en DB**. Confirmacion. | "O sea que reprogramar se puede, pero no es agregar: es rehacer. Guardamos, y los partidos quedan publicados." |

---

# Video 12 — Cargar resultados (90 s)

## Como se hace

Desde el torneo: **Cargar resultados**. La pantalla tiene dos solapas, **Zonas**
y **Llave**, y un buscador (*Ej: Zona A 3 u Octavos 2*).

Cada partido muestra **Fecha**, **Hora**, **Cancha** y **Estado**: **Pendiente**,
**Programado**, **En juego**, **Finalizado** o **Cancelado**.

Para cargar: elegir el partido, cargar los sets, elegir el **Ganador** y
**Guardar resultado**. Se necesita al menos un set cargado y un ganador valido.

Para un partido que no se jugo: **Guardar walkover**, eligiendo quien pasa.

Cada resultado guardado recalcula solo la tabla de la zona.

## Guion

**Antes de grabar:** torneo con partidos programados; algunos ya con resultado y
al menos dos sin cargar.

| Pantalla | Voz en off |
|---|---|
| Pantalla de resultados, solapa **Zonas**. | "Durante el torneo, esta es la pantalla en la que vas a vivir." |
| Señalar las solapas **Zonas** y **Llave**. | "De un lado los partidos de zona, del otro los de la llave." |
| Escribir en el buscador "Zona A 3". Aparece el partido. | "Podes buscar el partido directo, si sabes cual es." |
| Abrir el partido. Cargar 6 y 3 en el primer set. | "Cargas los sets." |
| Cargar el segundo set: 6 y 4. | "Los que se hayan jugado." |
| Elegir el **Ganador** en el desplegable. | "Elegis el ganador." |
| Click en **Guardar resultado**. Aparece la confirmacion. | "Y guardas." |
| Mostrar la tabla de la zona actualizada. | "La tabla de la zona se recalcula sola: puntos, sets, games, todo." |
| Volver a la lista, abrir otro partido y usar **Guardar walkover**. | "Y para el partido que no se jugo porque una pareja no vino, en vez de inventar un resultado cargas un walkover y elegis quien pasa." |

---

# Video 13 — Cerrar la zona y armar la llave (75 s)

## Como se hace

Con los partidos de zona cargados, en el panel de avance aparece:

- **Cerrar zona** — *Define los cruces de la llave que salen de esta zona.*
- **Cerrar zonas y armar la llave** — *Define los cruces con los clasificados y
  pone el torneo en juego.*

Al cerrar, el torneo pasa a **Jugandose**.

Si despues hay que corregir un resultado de zona, hay dos botones de vuelta
atras:

- **Volver a cerrar** — *Rehace los cruces de esta zona con las posiciones de
  ahora.*
- **Volver a armar la llave** — *Descarta la llave actual y la rearma desde las
  posiciones de zona.*

O sea que equivocarse tiene arreglo, siempre que la llave no haya avanzado.

## Guion

**Antes de grabar:** torneo con todos los partidos de zona cargados y la llave
sin armar.

| Pantalla | Voz en off |
|---|---|
| Panel del torneo con las zonas completas. | "Terminada la fase de zonas, hay que definir quien cruza con quien." |
| Mostrar las tablas de zona con las posiciones finales. | "Las tablas ya estan cerradas: sabemos quien salio primero y quien segundo en cada zona." |
| Cursor sobre **Cerrar zonas y armar la llave**. Zoom al texto de ayuda. | "Con este boton el sistema toma los clasificados, arma los cruces y pone el torneo en juego." |
| Click. El estado pasa a **Jugandose**. Aparece la llave. | "Y ahi tenemos la llave." |
| Mostrar el cuadro. | "De aca en adelante cargas los resultados igual que antes, pero en la solapa de llave." |
| Volver al panel, cursor sobre **Volver a armar la llave**. | "Y si te diste cuenta de que un resultado de zona estaba mal cargado, lo corregis y usas este: descarta la llave y la rearma con las posiciones nuevas." |
| Pausa. | "Asi que equivocarse tiene arreglo, mientras la llave no haya avanzado." |

---

# Video 14 — Terminar el torneo y cargar el ranking (60 s)

## Como se hace

Jugada la final, en el panel de avance:

- **Terminar torneo y cargar ranking** — *Cierra el torneo y reparte los puntos
  de ranking entre los jugadores.*

El torneo pasa a **Terminado** y los puntos se suman al ranking del club, segun
la posicion final de cada pareja. Los valores por posicion (Campeon,
Sub Campeon, Semifinalista, y asi) se configuran por torneo.

Si despues se corrige un resultado:

- **Recalcular ranking** — *Borra y vuelve a calcular los puntos con los
  resultados actuales.*

## Guion

**Antes de grabar:** torneo con la final ya cargada, listo para cerrar. Tener
abierta en otra pestaña la pagina de ranking del club.

| Pantalla | Voz en off |
|---|---|
| Panel del torneo, llave completa, campeon definido. | "Jugada la final, queda el ultimo paso." |
| Cursor sobre **Terminar torneo y cargar ranking**. Zoom al texto de ayuda. | "Terminar torneo y cargar ranking hace dos cosas: cierra el torneo y reparte los puntos entre los jugadores, segun donde termino cada pareja." |
| Click. El estado pasa a **Terminado**. | "Le damos." |
| Cambiar a la pestaña del ranking del club. Refrescar. Mostrar los puntos nuevos. | "Y los puntos ya estan en el ranking del club." |
| Volver al panel, cursor sobre **Recalcular ranking**. | "Si mas adelante corregis un resultado, no hace falta rehacer nada a mano: recalcular ranking borra los puntos de este torneo y los vuelve a calcular con los resultados de ahora." |

---

# Video 15 — Recategorizar un jugador (75 s)

## Como se hace

**Gestion → acciones del club → Recategorizaciones → nueva recategorizacion.**

Se busca al jugador (nombre, apellido, DNI o mail), se ve su **Categoria
actual**, y se carga la **Categoria nueva** y la **Fecha**.

Hay dos alcances:

- **Del club** — vale solo dentro de este club.
- **Global** — cambia la categoria del jugador en toda la plataforma.

El movimiento queda tipificado como **Ascenso**, **Descenso**, **Alta de
categoria** u **Observado**, y el historial queda guardado y visible en la
pagina publica del club.

## Guion

**Antes de grabar:** un jugador de prueba con categoria cargada, y algunas
recategorizaciones previas en la lista para que se vea el historial.

| Pantalla | Voz en off |
|---|---|
| Lista de recategorizaciones con movimientos previos. | "Cuando un jugador rinde por encima o por debajo de su categoria, el club lo recategoriza. Y queda registrado." |
| Click en nueva recategorizacion. | "Cargamos una." |
| Buscar por apellido. Elegir el jugador. | "Buscas al jugador por nombre, DNI o mail." |
| Se muestra **Categoria actual**. | "Te muestra en que categoria esta hoy." |
| Elegir **Categoria nueva**. | "Elegis la nueva." |
| Mostrar las opciones **Del club** y **Global**. Zoom. | "Y aca decidis el alcance. Del club, vale solo para tus torneos. Global, le cambia la categoria en toda la plataforma." |
| Elegir **Del club**. | "Si es una decision de tu comision, va del club." |
| Cargar la **Fecha** y guardar. | "Fecha, y guardamos." |
| Volver a la lista, que ahora incluye el movimiento nuevo. | "Queda en el historial, con la categoria anterior y la nueva. Y esto se publica en la pagina del club, asi que los jugadores lo pueden ver." |

---

# Video 16 — Cargar una sancion (75 s)

## Como se hace

**Gestion → acciones del club → Sanciones → nueva sancion.**

Campos: **Jugador** (buscar por nombre, DNI o mail), **Desde**, **Hasta**, y
**Motivo y considerandos**.

Debajo del motivo la pantalla avisa:

> *Este texto se publica en la pagina del club junto al nombre del jugador.
> Escribilo pensando en que lo va a leer cualquiera.*

Mientras la sancion esta vigente, **el jugador no se puede inscribir a ningun
torneo del club**, ni solo ni como pareja de otro. La validacion corre sola.

Si el jugador ya tiene otra sancion que se superpone, avisa: *"Ojo: este jugador
ya tenia otra sancion que se superpone"*.

Una sancion no se borra: se **anula**, dejando la constancia.

## Guion

**Antes de grabar:** jugador de prueba sin sanciones. Tener un torneo publicado
para mostrar el bloqueo al final.

| Pantalla | Voz en off |
|---|---|
| Lista de sanciones del club. | "Las sanciones disciplinarias tambien se cargan en el sitio, y no son decorativas." |
| Click en nueva sancion. Buscar y elegir el jugador. | "Buscas al jugador." |
| Cargar **Desde** y **Hasta**. | "Desde cuando y hasta cuando." |
| Zoom al aviso arriba del campo Motivo. Pausa. | "Y antes de escribir el motivo, leé esto: el texto se publica en la pagina del club, junto al nombre del jugador. Escribilo como si lo fuera a leer cualquiera, porque lo va a leer cualquiera." |
| Escribir un motivo sobrio y factual. | "Que sea concreto: que paso, cuando, y que resolvio la comision." |
| Guardar. | "Guardamos." |
| Ir al torneo e intentar inscribir a ese jugador. Aparece el rechazo. | "Y a partir de ahora, mientras la sancion este vigente, ese jugador no se puede anotar a ningun torneo del club. Ni solo, ni como pareja de otro. Lo controla el sistema." |
| Volver a la lista, cursor sobre **Anular sancion**. | "Si la comision da marcha atras, la sancion no se borra: se anula. Queda la constancia de que existio y de que se levanto." |

---

# Video 17 — El reglamento del club (45 s)

## Como se hace

**Gestion → acciones del club → Reglamento.**

Un editor de texto con formato simple: `##` para titulos, `-` para vinetas, y
parrafos sueltos. Se guarda con **Guardar reglamento** y se publica en la pagina
del club.

Si esta vacio, la pagina publica muestra un estado vacio en vez del texto de
otro club.

## Guion

**Antes de grabar:** reglamento vacio. Tener a mano un texto para pegar.

| Pantalla | Voz en off |
|---|---|
| Editor de reglamento vacio. | "Cada club publica su reglamento en su propia pagina." |
| Escribir `## Inscripciones` y enter. | "El formato es simple: dos numerales para un titulo." |
| Escribir `- La inscripcion se realiza por pareja.` | "Un guion para cada punto de una lista." |
| Escribir un parrafo suelto. | "Y texto normal para los parrafos." |
| Click en **Guardar reglamento**. | "Guardas." |
| Abrir la pagina publica del club, solapa de reglamento. | "Y queda publicado en la pagina del club, para que cualquier jugador lo pueda consultar antes de anotarse." |

---

# Video 18 — Los reportes (75 s)

## Como se hace

**Reportes**, en el menu de arriba. Hay tres:

| Reporte | Que trae |
|---|---|
| **Inscriptos de un torneo** | Jugador 1, Jugador 2, categoria, restriccion, fecha de inscripcion. Separa **Titulares** de **Suplentes** |
| **Horarios de partidos** | Torneo, cancha, dia, hora, pareja 1, pareja 2 y resultado. Trae **Firma A** y **Firma B** para la planilla de cancha |
| **Sanciones disciplinarias** | Jugador, desde, hasta, motivo y estado. **Vigentes** o **Historicas** |

Se elige el complejo, el evento y el torneo con los selectores de arriba, y cada
uno se baja con los botones **PDF** y **CSV**.

**PDF** es para imprimir y colgar. **CSV** es para abrir en Excel.

## Guion

**Antes de grabar:** un torneo con inscriptos y partidos programados. Tener
Excel o similar disponible para abrir el CSV al final.

| Pantalla | Voz en off |
|---|---|
| Menu de arriba, click en **Reportes**. Se ven los tres. | "Los reportes son para lo que pasa fuera de la pantalla: imprimir, colgar en la cartelera, pasarle algo al contador." |
| Click en **Inscriptos de un torneo**. | "Empecemos por inscriptos." |
| Elegir complejo, evento y torneo en los selectores. | "Elegis el club, el evento y el torneo." |
| Se ve el listado con Titulares y Suplentes. | "Y te arma el listado, con los titulares y los suplentes separados." |
| Click en **PDF**. Mostrar el archivo abierto. | "Con PDF lo bajas listo para imprimir." |
| Volver. Click en **CSV**. Abrirlo en la planilla. | "Y con CSV lo abris en Excel, si necesitas trabajarlo." |
| Volver a Reportes. Entrar a **Horarios de partidos**. Señalar las columnas de firma. | "El de horarios de partidos es el que se usa mas: te trae el fixture con cancha y horario, y ademas dos columnas de firma, para la planilla que se lleva a la cancha." |
| Entrar a **Sanciones disciplinarias**. Alternar entre **Vigentes** e **Historicas**. | "Y el de sanciones, que podes pedir solo las vigentes o el historico completo." |

---

# Apendice — La pagina publica del club

No se administra, pero conviene que el admin sepa que se ve, porque **todo lo
que carga termina ahi**:

| Solapa | De donde sale |
|---|---|
| Eventos | Los eventos marcados como **Visible** |
| Calendario | Los partidos programados |
| Ranking | Los puntos que reparten los torneos **Terminados** |
| Jugadores | Los jugadores del club |
| Recategorizaciones | El historial de movimientos |
| Sanciones | Las sanciones, **con el motivo tal cual se escribio** |
| Reglamento | El editor del video 17 |

Vale un video corto de cierre recorriendo esa pagina, con una sola idea de voz
en off: *"Todo lo que cargaste del otro lado, aparece aca. Por eso conviene
cargarlo bien."*

---

# Orden sugerido para armar la serie

Si hay que grabar de a poco, este es el orden por utilidad:

**Primera tanda — un club puede empezar a trabajar**
1, 2, 6, 7, 8

**Segunda tanda — el torneo completo de punta a punta**
9, 10, 11, 12, 13, 14

**Tercera tanda — turnos de cancha**
3, 4, 5

**Cuarta tanda — el resto**
15, 16, 17, 18

Los videos 10, 11 y 12 son los que mas consultas evitan: zonas, horarios y
resultados es donde se traba todo el mundo la primera vez.
