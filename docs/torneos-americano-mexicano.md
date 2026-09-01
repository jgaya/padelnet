# Torneos Americano y Mexicano

Dos cosas en un documento:

- **Parte 1: el reglamento** de cada formato, escrito para publicar tal cual.
- **Parte 2: el plan paso a paso** para poder ofrecerlos en el sitio, con un
  bloque `PROMPT` por paso para pegar en una sesion nueva.

Si solo te interesa correr un americano el sabado que viene con papel y lapiz,
con la Parte 1 alcanza.

---

# PARTE 1 — Reglamento

## Que son, y la unica diferencia que importa

Los dos son formatos **individuales**: te anotas solo, sin compañero, y el
compañero te lo da el torneo y cambia en cada ronda. Los puntos son tuyos, no de
una pareja. Al final hay una tabla de jugadores, no de parejas.

La diferencia esta en **como se arman las parejas de cada ronda**:

| | Americano | Mexicano |
|---|---|---|
| Inscripcion | Individual | Individual |
| Compañero | Cambia cada ronda | Cambia cada ronda |
| Como se arman las parejas | **Fijo desde el principio**: todos con todos | **Segun la tabla en vivo**: 1+4 vs 2+3 |
| Se puede repetir compañero | No | Si |
| Se conoce el fixture completo antes de empezar | **Si** | **No, se calcula ronda a ronda** |
| Nivel de los partidos | Desparejo al principio y al final | Se empareja solo a partir de la ronda 3 |
| Para que sirve | Que todos jueguen con todos. Social | Que todos jueguen partidos parejos. Competitivo |
| Duracion tipica | Depende de la cantidad de jugadores | ~2 horas, fijo |

Esa fila resaltada —si el fixture se conoce de antemano o no— es la que decide
todo lo tecnico de la Parte 2. El Americano se puede generar entero de una vez,
como cualquier torneo del sitio. **El Mexicano no**: la ronda 4 depende de como
salio la 3.

---

## Reglamento del Americano

Listo para publicar. Los valores entre corchetes son los que el club define en
las bases de cada torneo.

```markdown
## Torneo Americano — Reglamento

### 1. Inscripcion
1.1. La inscripcion es **individual**. No hace falta anotarse con compañero.
1.2. El cupo es de [16] jugadores. Si se llena, quien se anota queda en lista
     de espera y entra ante la primera baja.
1.3. La inscripcion queda confirmada una vez abonada.
1.4. Las bajas se informan con al menos [24] horas de anticipacion. Una baja
     sobre la hora obliga a rehacer el fixture completo del torneo.

### 2. Formacion de las parejas
2.1. Los jugadores **no eligen compañero**. El torneo los asigna.
2.2. Cada jugador juega **una ronda con cada uno de los demas participantes**,
     hasta donde alcance la cantidad de rondas programadas.
2.3. El fixture completo se sortea y se publica **antes de que empiece el
     torneo** y no se modifica, salvo por ausencias.
2.4. En los americanos mixtos, cada pareja se forma con un jugador y una
     jugadora.

### 3. Sistema de juego
3.1. Se juegan [8] rondas. Todas las canchas juegan **en simultaneo**.
3.2. Cada partido se juega a **[24] puntos corridos**. Gana el partido quien
     llega primero a esa cifra; el partido termina ahi aunque falte tiempo.
3.3. Se cuenta punto a punto (1, 2, 3...) y no con el 15/30/40 tradicional.
     Cada pelota ganada es un punto.
3.4. Cada pareja saca **dos veces seguidas** y despues el saque pasa a la
     pareja rival. El orden de saque dentro de la pareja lo eligen los
     jugadores en el primer turno y se mantiene todo el partido.
3.5. **No se cambia de lado** durante el partido.
3.6. Si el partido se juega **por tiempo** en vez de a puntos, la ronda dura
     [15] minutos, arranca y termina con la señal de la organizacion, y vale
     el marcador en el momento de la señal. El punto en juego cuando suena la
     señal **se termina de jugar**.
3.7. Entre ronda y ronda hay [3] minutos para cambiar de cancha. La ronda
     siguiente empieza a horario, con o sin todos en cancha.

### 4. Puntaje
4.1. El puntaje es **individual**. Los dos jugadores de una pareja suman, cada
     uno, todos los puntos que hizo la pareja.
4.2. Ejemplo: si un partido termina 24-16, los dos jugadores de la pareja
     ganadora suman 24 puntos cada uno, y los dos de la perdedora suman 16
     cada uno. **El perdedor tambien suma.**
4.3. Se registran ademas los puntos recibidos, que se usan para desempatar.
4.4. Si la cantidad de jugadores no es multiplo de 4, en cada ronda descansa
     quien corresponda segun el fixture. El jugador que descansa suma **la
     mitad del puntaje maximo del partido, redondeando hacia arriba** ([12] en
     un partido a 24). Ningun jugador descansa dos veces antes de que todos
     hayan descansado una.

### 5. Clasificacion y desempates
5.1. Gana el torneo quien mas puntos acumulo al terminar la ultima ronda.
5.2. Los empates se resuelven en este orden:
     a) mayor diferencia entre puntos a favor y puntos en contra;
     b) menor cantidad de puntos en contra;
     c) resultado del partido en el que se enfrentaron, si se enfrentaron;
     d) sorteo.
5.3. La tabla se publica actualizada al cierre de cada ronda.

### 6. Ausencias, demoras y abandonos
6.1. Hay [5] minutos de tolerancia desde el inicio de la ronda. Pasados,
     el partido se juega igual con los tres presentes hasta que llegue, y los
     puntos jugados valen.
6.2. Si un jugador no se presenta al torneo, la organizacion puede reemplazarlo
     por un suplente antes de la primera ronda. Empezado el torneo, el fixture
     ya no se rehace.
6.3. Si un jugador abandona el torneo empezado, sus compañeros de las rondas
     que faltan reciben el puntaje de un partido ganado sin jugar
     ([24] puntos), y sus rivales el puntaje de descanso ([12] puntos).
     El que abandona conserva lo que sumo hasta ese momento.
6.4. Un jugador que abandona sin causa justificada puede quedar excluido del
     proximo torneo del mismo formato.

### 7. Conducta y arbitraje
7.1. No hay fiscal en cancha. **Cada pareja canta sus propias pelotas** y ante
     la duda, el punto se repite.
7.2. El marcador lo cargan los jugadores al terminar la ronda y lo confirma la
     organizacion. Un marcador cargado mal y confirmado no se corrige despues
     de que empezo la ronda siguiente.
7.3. Se espera respeto hacia rivales, compañeros y personal del club. El
     formato mezcla niveles a proposito: nadie elige con quien le toca.
```

---

## Reglamento del Mexicano

```markdown
## Torneo Mexicano — Reglamento

### 1. Inscripcion
1.1. La inscripcion es **individual**. No hace falta anotarse con compañero.
1.2. El cupo es de [16] jugadores y **tiene que ser multiplo de 4**: el formato
     agrupa a los jugadores de a cuatro por cancha segun la tabla.
1.3. La inscripcion queda confirmada una vez abonada.
1.4. Las bajas se informan con al menos [24] horas de anticipacion.

### 2. Formacion de las parejas
2.1. Los jugadores **no eligen compañero**, y el compañero cambia en cada
     ronda.
2.2. **Primera ronda:** las parejas se sortean al azar. Si el club lo define
     asi en las bases, en lugar del sorteo se usa el ranking del club para
     armar la primera ronda.
2.3. **Rondas siguientes:** al cerrar cada ronda se actualiza la tabla y los
     jugadores se reparten por cancha segun su posicion:
     - puestos 1, 2, 3 y 4 → cancha 1
     - puestos 5, 6, 7 y 8 → cancha 2
     - y asi sucesivamente.
2.4. Dentro de cada cancha, la pareja se arma **el primero con el cuarto contra
     el segundo con el tercero** (1+4 vs 2+3), para que el partido sea lo mas
     parejo posible.
2.5. **Se puede repetir compañero o rival** a lo largo del torneo. Es esperable
     y no es un error del sorteo: es como funciona el formato.
2.6. Por eso **el fixture no se publica de antemano**: cada ronda se conoce
     recien cuando termina la anterior.

### 3. Sistema de juego
3.1. Se juegan [7] rondas. Todas las canchas juegan **en simultaneo**.
3.2. Cada partido se juega a **[24] puntos corridos**, contados punto a punto.
3.3. Cada pareja saca **dos veces seguidas** y despues el saque pasa.
3.4. **No se cambia de lado** durante el partido.
3.5. Si se juega por tiempo, la ronda dura [15] minutos y vale el marcador al
     sonar la señal, terminando el punto en juego.
3.6. Entre ronda y ronda hay [5] minutos: la organizacion necesita ese tiempo
     para cerrar la tabla y publicar los cruces de la ronda siguiente.
3.7. **Ninguna ronda empieza hasta que estan cargados todos los resultados de
     la anterior.** Una cancha que demora, demora a todo el torneo. Es la
     contra de este formato y conviene decirlo antes de empezar.

### 4. Puntaje
4.1. El puntaje es **individual**: cada jugador suma todos los puntos que hizo
     su pareja en el partido.
4.2. El perdedor tambien suma. Un 14 en una derrota 14-24 vale mas que un 12
     en una victoria 24-12 en un partido corto.
4.3. Se registran tambien los puntos recibidos, para desempatar.

### 5. Clasificacion y desempates
5.1. La tabla se actualiza y se publica **al cierre de cada ronda**, porque es
     la que define los cruces de la ronda siguiente.
5.2. Gana el torneo quien mas puntos acumulo al terminar la ultima ronda.
5.3. Los empates se resuelven en este orden:
     a) mayor diferencia entre puntos a favor y en contra;
     b) menor cantidad de puntos en contra;
     c) resultado del partido en el que se enfrentaron, si se enfrentaron;
     d) el que este mejor ubicado por sorteo inicial.
5.4. Para armar las canchas de la ronda siguiente se usa **el mismo orden de
     desempate**. La organizacion no reordena a criterio.

### 6. Ausencias, demoras y abandonos
6.1. Hay [5] minutos de tolerancia desde el inicio de la ronda.
6.2. Si un jugador abandona el torneo empezado, la organizacion puede
     incorporar un suplente en su lugar **con el puntaje que traia el que se
     fue**, para no descuadrar las canchas. Si no hay suplente, el torneo sigue
     con un grupo de cuatro menos y esos tres jugadores descansan por rotacion,
     sumando la mitad del puntaje maximo.
6.3. El jugador que abandona conserva lo que sumo hasta ese momento pero no
     figura en la clasificacion final.

### 7. Conducta y arbitraje
7.1. No hay fiscal en cancha. Cada pareja canta sus propias pelotas y ante la
     duda, el punto se repite.
7.2. El marcador se carga al terminar la ronda. **Un resultado mal cargado no
     solo afecta la tabla: cambia los cruces de la ronda siguiente.** Por eso
     se confirma antes de publicar.
7.3. Se espera respeto hacia rivales y compañeros.
```

---

## Anexo A — Cuantos jugadores, cuantas canchas, cuanto dura

### Americano completo (todos con todos)

Un americano donde cada jugador juega **exactamente una vez con cada uno** de
los demas es lo que en matematica se llama un *whist tournament*. Tiene dos
consecuencias practicas que conviene saber antes de anunciar el torneo:

**Con N jugadores hacen falta N−1 rondas.** No es negociable, es aritmetica:
cada ronda te da un compañero nuevo y tenes N−1 compañeros posibles.

| Jugadores | Canchas | Rondas | Duracion a 15 min + 3 de cambio |
|---|---|---|---|
| 4 | 1 | 3 | 55 min |
| 8 | 2 | 7 | 2 h 5 min |
| 12 | 3 | 11 | 3 h 20 min |
| 16 | 4 | 15 | 4 h 30 min |
| 20 | 5 | 19 | 5 h 45 min |

**El americano completo deja de ser razonable arriba de 12 jugadores.** Con 16
son cuatro horas y media. Nadie se queda.

La salida es el **americano corto**: se juega una cantidad fija de rondas
(6 u 8), menor que N−1, eligiendo los emparejamientos de modo que nadie repita
compañero. Sigue siendo un americano: lo que se pierde es la garantia de haber
jugado con absolutamente todos.

**Segundo detalle**: el diseño perfecto solo existe cuando la cantidad de
jugadores da resto 0 o 1 al dividirla por 4 —o sea 4, 5, 8, 9, 12, 13, 16, 17—.
Con 6, 7, 10, 11, 14 o 15 jugadores **no existe** un fixture donde todos jueguen
con todos exactamente una vez, y el mejor fixture posible tiene alguna
repeticion o algun descanso extra. No es un bug del sistema que lo genere: es
una propiedad del numero.

Con cantidad impar, en cada ronda descansa uno.

### Mexicano

Mas simple, porque no hay diseño combinatorio que respetar:

| Jugadores | Canchas | Rondas tipicas | Duracion |
|---|---|---|---|
| 8 | 2 | 6 a 8 | ~2 h |
| 12 | 3 | 6 a 8 | ~2 h |
| 16 | 4 | 6 a 8 | ~2 h |
| 20 | 5 | 6 a 8 | ~2 h |

La cantidad de jugadores **tiene que ser multiplo de 4**, porque el formato
agrupa de a cuatro por posicion en la tabla. Con 14 jugadores no hay forma
limpia de armar la cancha 4.

La duracion no depende de la cantidad de jugadores: depende de cuantas rondas
programes. Por eso el mexicano escala mejor y es el que conviene para un evento
grande con horario de cierre.

### Anexo B — Cual elegir

| Situacion | Formato |
|---|---|
| Grupo chico y parejo, todos se conocen | Americano completo |
| Grupo grande y desparejo | Mexicano |
| Hay que terminar a una hora fija | Mexicano |
| Se quiere que todos jueguen con todos | Americano |
| Primera vez que el club corre uno de estos | **Americano**, que no depende de cargar resultados a tiempo |
| Torneo mixto de integracion | Americano mixto |

---

# PARTE 2 — El plan

## 0. Lo que hay hoy, y los seis agujeros

### El motor que ya existe

El sitio tiene un motor de torneos completo y bastante serio: dos formatos
(`ZONAS` y `ELIMINACION_DIRECTA`), siembra por ranking o inscripcion, generacion
de grilla con canchas, dias y restricciones horarias, avance automatico de la
llave, tabla de posiciones con desempates, ranking del club y logros.

| Pieza | Donde | Se reusa? |
|---|---|---|
| `TorneoFormato` | `prisma/schema.prisma:81` | **Si**, se le suman dos valores |
| Grilla con canchas y dias | `lib/torneo-grilla.ts` (869 lineas) | **No**, ver agujero 3 |
| Cuadro y avance | `lib/torneo-llave*.ts`, `lib/torneo-avance.ts` | No, estos formatos no tienen cuadro |
| Tabla de posiciones | `lib/torneo-posiciones.ts` | **No**, ver agujero 2 |
| Carga de resultados | `actions/torneos-partidos.ts:300` | **Si**, con un modo distinto |
| Ranking del club | `actions/torneos-ranking.ts:145` | Parcialmente, ver agujero 5 |
| Elegibilidad y categorias | `lib/torneo-elegibilidad.ts` | Parcialmente, ver agujero 6 |
| Reglamento por club | `lib/reglamento-sugerido.ts` | **Si**, ver paso 1 |
| Vista publica | `lib/torneo-vista-publica.ts` | Si, con una pestaña mas |
| `Generacion` (auditoria de lo generado) | `prisma/schema.prisma` | **Si**, tal cual |
| Checks sin base ni navegador | `scripts/check-siembra.ts` | **Si**, el molde exacto |

### Agujero 1: todo el motor esta construido sobre la pareja fija

Este es **el** agujero. Todos los demas salen de aca.

`Partido` tiene `pareja1Id` y `pareja2Id`, que apuntan a `Pareja`. Y `Pareja`
tiene:

```prisma
@@unique([torneoId, player1Id, player2Id])
```

O sea: **dos jugadores forman una sola pareja por torneo, y esa pareja es la
unidad de todo** — de la inscripcion, de la zona, del partido, de la tabla, del
ranking, del cuadro.

En americano y mexicano la pareja **dura una ronda**. Los mismos dos jugadores
pueden no volver a jugar juntos nunca, o —en mexicano— volver a jugar juntos en
la ronda 5. Y la unidad que acumula puntos no es la pareja: es **el jugador**.

Hay dos formas de resolverlo y una es una trampa:

- **La trampa:** agregar `rondaNumero Int?` a `Pareja` y poner el unique sobre
  las cuatro columnas. En MariaDB **los NULL no chocan entre si en un indice
  unico**, asi que todos los torneos clasicos —que tendrian `rondaNumero`
  null— perderian en silencio la garantia que hoy los protege de tener dos
  parejas iguales. Un bug que no se nota hasta que se nota.
- **Lo correcto:** `rondaNumero Int @default(0)`, unique sobre las cuatro
  columnas, y backfill que deja en 0 todo lo existente. Con todos los torneos
  clasicos en `rondaNumero = 0`, el unique de cuatro columnas se comporta
  **exactamente** como el de tres que hay hoy. Y los formatos rotativos usan
  1, 2, 3...

### Agujero 2: no existe la nocion de "jugador del torneo"

Hoy un jugador entra al torneo **a traves de una pareja**. `registerPublicTorneoPair`
recibe `{ torneoId, partnerId }`: **no se puede anotar solo**.

Y no hay ningun lugar donde vivan los puntos individuales acumulados. `Pareja`
tiene `puntos`, `partidoGanados`, `setGanados`... todo por pareja.

Hace falta un modelo `TorneoJugador` que haga las dos cosas: **es la
inscripcion individual y es la fila de la tabla de posiciones**. Un solo modelo
para las dos, porque son la misma lista.

### Agujero 3: la grilla asume que todos los partidos se conocen de antemano

`buildGrilla()` recibe las zonas, las canchas con sus ventanas horarias, los
dias y las restricciones de cada pareja, y reparte los partidos evitando
solapamientos. Es un asignador de recursos y esta bueno.

Para estos formatos **no sirve, y no porque le falte algo: porque sobra**. Aca
la asignacion es trivial:

> Ronda 1: partido 1 en cancha 1, partido 2 en cancha 2, ... todos a la misma
> hora. Ronda 2: lo mismo, 18 minutos despues.

No hay restricciones horarias por jugador (todos juegan todas las rondas), no
hay varios dias, no hay huecos que optimizar. Meter esto adentro de
`buildGrilla` seria agregarle un modo que no comparte nada con lo que hace hoy.
Va un planificador propio de 60 lineas.

Y para el Mexicano hay un problema mas de fondo: **la ronda N+1 no se puede
planificar hasta que termino la ronda N.** El flujo de "generar la grilla
entera y guardarla" no aplica. El molde a copiar es
`cerrarZonasYArmarLlave()` (`actions/torneos-partidos.ts:1129`): cerrar lo que
termino, calcular lo que sigue, guardarlo.

### Agujero 4: el resultado no son sets, es un numero

`PartidoSet` guarda `gamesPareja1` / `gamesPareja2` por numero de set. Un
partido de americano es un solo marcador: 24-16.

Esto **entra tal cual**: un unico `PartidoSet` con `numero = 1` y los puntos en
los campos de games. No hace falta un modelo nuevo. Lo que si hace falta es que
la pantalla de carga sepa que en este formato se carga un solo par de numeros y
no hasta tres sets, y que valide contra el puntaje configurado del torneo.

`lib/torneo-posiciones.ts` en cambio **no se reusa**: calcula 2 puntos por
partido ganado y 1 por perdido, y desempata por sets y games entre parejas de
una zona. Aca el puntaje es la suma de puntos por jugador. Es otra tabla.

### Agujero 5: el ranking del club esta cableado a la llave

`RANKING_POSICIONES` (`lib/ranking-puntajes.ts:18`) son "Campeon",
"Sub Campeon", "Semifinalista", "Cuartos de final"... y `aplicarRankingTorneo()`
las deduce leyendo `Partido.llave`.

Un americano no tiene llave ni semifinal. Termina en una tabla de 16 jugadores
ordenada. Hacen falta posiciones nuevas —"1er puesto", "2do puesto",
"3er puesto", "Participante"— y una rama en `aplicarRankingTorneo` que, cuando
el formato es rotativo, las saque de la tabla final en vez de la llave.

Ademas: hoy el ranking se asigna **por pareja** y despues se reparte a los dos
jugadores. Aca ya es por jugador de entrada, que es mas simple.

### Agujero 6: dos reglas de categoria pierden sentido

`TournamentCategoryRule` tiene `SUMA`, que valida que **la suma de las
categorias de la pareja** no pase de N. Con compañero sorteado, eso no se puede
garantizar ni tiene sentido pedirlo: el jugador no elige con quien juega.

En los formatos rotativos valen `LIBRE`, `IGUAL`, `MAYOR_IGUAL` y
`MENOR_IGUAL`, que se evaluan **sobre el jugador individual**. `SUMA` se
deshabilita en el formulario.

Y `TournamentSexo.MIXTO` cambia de significado: hoy quiere decir "la pareja
puede ser de cualquier composicion". En un americano mixto quiere decir **"cada
pareja se forma con un varon y una mujer"**, que es una restriccion sobre el
algoritmo de emparejamiento, no sobre la inscripcion. Son dos cosas distintas y
hay que separarlas.

---

## Decisiones de arquitectura

**1. Dos valores nuevos en `TorneoFormato`, no un modelo de torneo aparte.**
`AMERICANO` y `MEXICANO` conviven con `ZONAS` y `ELIMINACION_DIRECTA`. Todo lo
transversal —evento, publicacion, inscripcion, notificaciones, vista publica,
auditoria— sigue funcionando sin tocarse.

**2. `TorneoJugador` es la inscripcion y la tabla al mismo tiempo.** Un modelo,
no dos. La lista de anotados **es** la tabla de posiciones antes de la primera
ronda, con todos en cero.

**3. `Pareja` se reusa como pareja de una ronda**, con `rondaNumero Int
@default(0)` y el unique de cuatro columnas. Cero cambios para los torneos
clasicos, cero modelos nuevos para los partidos.

**4. El algoritmo de emparejamiento es un modulo puro, sin prisma.** Igual que
`lib/torneo-llave-directa.ts`, que es puro y por eso tiene
`scripts/check-siembra.ts` corriendo sin base ni navegador. Un fixture mal
armado no se ve mirandolo: se ve en la ronda 6, cuando dos se dan cuenta de que
ya jugaron juntos. Esto **se verifica con un script, no con la vista.**

**5. El Americano se genera entero; el Mexicano ronda a ronda.** Misma pantalla
de admin, dos comportamientos. En Americano el boton dice "Generar torneo" y
sale todo. En Mexicano dice "Cerrar ronda y generar la siguiente" y hay que
apretarlo N veces.

**6. Resultado = un solo `PartidoSet`.** Sin modelos nuevos, sin campos nuevos
en `Partido`. La pantalla de carga cambia de modo segun el formato.

**7. Los descansos son partidos que no existen.** Un jugador que descansa no
tiene `Partido`: tiene una fila en `TorneoJugador` con puntos sumados y un
contador de descansos. Inventar un `Partido` fantasma con una sola pareja
ensuciaria todas las consultas que cuentan partidos.

**8. Nada de esto entra en la llave, el avance ni la resolucion.**
`lib/torneo-avance.ts`, `lib/torneo-llave.ts`, `lib/torneo-resolucion.ts` y
`lib/llave-tabla.ts` (3006 lineas) **no se tocan**. Si el formato es rotativo,
esos caminos ni se llaman.

**9. El reglamento va primero.** El paso 1 no toca el schema y ya deja algo
usable: un club puede correr el torneo a mano el fin de semana que viene con el
reglamento publicado en su pagina, mientras el resto se construye.

---

## Paso 1 — Los reglamentos publicables

**Objetivo:** que un admin pueda publicar el reglamento de cualquiera de los
dos formatos con un click. **No toca el schema y no depende de nada.**

**Archivos:** `lib/reglamento-sugerido.ts`,
`app/admin/complejos/[id]/reglamento/components/ReglamentoEditor.tsx`.

**Terminado cuando:** el editor de reglamento ofrece tres plantillas y al elegir
una se carga en el textarea.

````
PROMPT PASO 1

Contexto: repo padelnet, Next 16 App Router, Prisma 7 con adapter mariadb,
TypeScript estricto, Tailwind 4 con tokens de tema. Estoy siguiendo
docs/torneos-americano-mexicano.md.

Este paso NO toca el schema ni la logica de torneos. Es solo texto y un
selector.

1. lib/reglamento-sugerido.ts:
   - Hoy exporta una sola constante REGLAMENTO_SUGERIDO, que es un reglamento
     de torneo por parejas ("La inscripcion se realiza por pareja").
   - Renombrar el concepto a un catalogo, SIN romper el import que existe:

     export type PlantillaReglamento = {
       clave: string;
       label: string;
       descripcion: string;
       texto: string;
     };
     export const PLANTILLAS_REGLAMENTO: readonly PlantillaReglamento[]

   - Tres entradas: "clasico" (el texto actual, tal cual, sin tocarle una
     coma), "americano" y "mexicano".
   - Mantener `export const REGLAMENTO_SUGERIDO` apuntando al texto clasico
     para no romper ReglamentoEditor.tsx mientras lo actualizas.
   - Los textos de americano y mexicano estan en docs/torneos-americano-
     mexicano.md, en la Parte 1, dentro de los bloques de codigo markdown.
     Copialos TAL CUAL, incluidos los valores entre corchetes: son los que el
     club reemplaza por los suyos. Verifica que el markdown que resulta lo
     renderice bien lib/markdown-simple.ts, que es el que dibuja la pagina
     publica; si markdown-simple no soporta algo que use el texto (por ejemplo
     listas anidadas), decime QUE no soporta antes de cambiar el texto.

2. ReglamentoEditor.tsx:
   - Hoy hay un boton que carga REGLAMENTO_SUGERIDO. Reemplazarlo por un
     selector de las tres plantillas mas el boton.
   - Confirmacion antes de pisar: si el textarea tiene contenido, preguntar.
     Perder un reglamento escrito a mano por apretar un boton de plantilla es
     el tipo de cosa que pasa una vez y no se perdona.
   - Tailwind y tokens del tema. Nada de clases de Bootstrap: estan en
     package.json pero sus clases no hacen nada.

Convenciones del repo: comentarios en castellano sin acentos que expliquen el
por que y no el que. Nada de any.

Al terminar: npx tsc --noEmit && npm run lint
Y pegame como se ve el reglamento del americano renderizado en
/complejos/<slug>/reglamento.
````

---

## Paso 2 — El algoritmo de emparejamiento

**Objetivo:** el nucleo. Un modulo **puro**, sin prisma, con su script de
verificacion. Cierra el agujero mas riesgoso antes de tocar la base.

**Archivos:** `lib/torneo-rotacion.ts` (nuevo), `scripts/check-rotacion.ts`
(nuevo), `package.json`.

**Terminado cuando:** `npm run check:rotacion` pasa para todos los tamaños de
4 a 24 jugadores.

**Este paso se puede hacer y verificar entero sin base de datos, sin navegador
y sin haber tocado el schema.** Hacelo asi.

````
PROMPT PASO 2

Contexto: repo padelnet, TypeScript estricto. Estoy siguiendo
docs/torneos-americano-mexicano.md.

Este paso es el corazon del asunto y va SOLO: un modulo puro, sin prisma, sin
"server-only", sin Next. El molde exacto que quiero imitar es
lib/torneo-llave-directa.ts (puro) con scripts/check-siembra.ts (lo verifica sin
base ni navegador). Leelos los dos antes de escribir nada.

Por que asi: un fixture mal armado no se ve mirandolo. Se ve en la ronda 6,
cuando dos jugadores se dan cuenta de que ya habian jugado juntos. Se verifica
con propiedades, no con la vista.

1. lib/torneo-rotacion.ts:

   export type Emparejamiento = {
     cancha: number;        // 1..C
     jugadoresA: [number, number];   // indices de jugador, no ids de base
     jugadoresB: [number, number];
   };
   export type RondaRotacion = {
     numero: number;
     partidos: Emparejamiento[];
     descansan: number[];
   };

   Trabajar con INDICES 0..N-1, no con ids de usuario. El modulo no sabe que
   existe una base de datos. Eso es lo que lo hace verificable.

2. AMERICANO:
   export function fixtureAmericano(opts: {
     jugadores: number;
     rondas: number;      // <= jugadores-1
     canchas: number;
     semilla: number;     // para que el sorteo sea reproducible
     mixto?: boolean;     // si true, cada pareja debe ser 1 de cada grupo
     generos?: ("M"|"F")[];  // requerido si mixto
   }): RondaRotacion[]

   Lo que tiene que cumplir:
   - Ningun jugador repite companero mientras la cantidad de rondas lo permita.
   - Cada jugador juega todas las rondas, salvo cuando le toca descansar.
   - Los descansos se reparten parejo: nadie descansa dos veces antes de que
     todos hayan descansado una.
   - Si mixto: cada pareja es un M y una F.
   - Reproducible: misma semilla, mismo fixture. Usar el patron de
     seededRandom que ya esta en lib/torneo-grilla.ts, no Math.random.

   LO QUE TENES QUE SABER ANTES DE ELEGIR EL ALGORITMO, y quiero que lo
   documentes en el encabezado del archivo:
   - Un americano donde todos juegan con todos exactamente una vez es lo que se
     llama un whist tournament, y el diseno perfecto SOLO existe cuando la
     cantidad de jugadores da resto 0 o 1 al dividirla por 4 (4,5,8,9,12,13,
     16,17,20,21...).
   - Con 6, 7, 10, 11, 14, 15 jugadores NO EXISTE un fixture sin repeticiones.
     No es una limitacion de la implementacion: es una propiedad del numero.
   - Por eso la funcion NO puede prometer cero repeticiones siempre. Tiene que
     devolver el mejor fixture posible y que se pueda saber cuantas
     repeticiones tiene.

   Estrategia sugerida, decidila vos pero justificala:
   a) Para N par, la rotacion clasica de round robin (uno fijo y los demas
      girando) da los enfrentamientos; sobre eso se arman las parejas.
   b) Encima, una pasada voraz que minimiza repeticiones de companero, con
      la semilla para desempatar.
   c) Exportar tambien:
      export function calidadFixture(rondas: RondaRotacion[], jugadores: number):
        { repeticionesCompanero: number; maxDescansos: number;
          minPartidos: number; maxPartidos: number }
      Esto es lo que el admin va a ver como advertencia antes de confirmar.

3. MEXICANO:
   export function rondaMexicano(opts: {
     ordenTabla: number[];   // indices ordenados por posicion, 0 = puntero
     canchas: number;
   }): RondaRotacion

   - Agrupa de a 4 en orden de tabla: posiciones 0,1,2,3 -> cancha 1;
     4,5,6,7 -> cancha 2; etc.
   - Dentro de cada cancha: (0 y 3) contra (1 y 2).
   - Si la cantidad de jugadores no es multiplo de 4, los ultimos que sobran
     descansan. Devolvelos en `descansan`.
   - Funcion PURA y sincrona: recibe el orden ya calculado, no lo calcula.
     Quien ordena la tabla es otro modulo, en el paso 6.

   export function primeraRondaMexicano(opts: {
     jugadores: number; canchas: number; semilla: number;
     porRanking?: number[];  // orden por ranking del club, si el club lo eligio
   }): RondaRotacion
   Sorteo reproducible, o el orden de ranking si viene.

4. scripts/check-rotacion.ts + script "check:rotacion" en package.json.
   Copiar la forma de scripts/check-siembra.ts (funcion check(), contador de
   pasadas, process.exit(1) si hay problemas).
   Verificar, para jugadores de 4 a 24 y varias semillas:
   - Nadie juega dos partidos en la misma ronda.
   - Nadie esta en dos canchas a la vez.
   - La cantidad de partidos por ronda es floor(jugadores/4) acotada por
     canchas.
   - Todo jugador que no descansa esta en exactamente un partido.
   - Americano con N multiplo de 4 y rondas = N-1: CERO repeticiones de
     companero. Este es el check que importa.
   - Americano con N = 6,7,10,11,14,15: que la cantidad de repeticiones sea
     la minima conocida, o al menos que no crezca al cambiar la semilla.
   - Americano mixto: todas las parejas son M+F.
   - Descansos repartidos: max - min <= 1.
   - Mexicano: los 4 de la cancha k son exactamente las posiciones
     4k..4k+3 de la tabla, y el cruce es 1+4 vs 2+3.
   - Reproducibilidad: misma semilla dos veces, fixture identico.

Convenciones del repo: comentarios en castellano sin acentos que expliquen el
por que y no el que. Nada de any. Este modulo NO importa prisma, NO importa
nada de @/lib que toque la base, y NO lleva "server-only".

Al terminar: npx tsc --noEmit && npm run lint && npm run check:rotacion
Y pegame la salida completa de check:rotacion, mas la tabla de
repeticionesCompanero para N de 4 a 20 con rondas = N-1.
````

---

## Paso 3 — Schema

**Objetivo:** `TorneoJugador`, `Pareja.rondaNumero`, los dos formatos nuevos y
la configuracion del torneo.

**Archivos:** `prisma/schema.prisma`, `lib/auditoria-config.ts`,
`scripts/backfill-ronda-pareja.ts` (nuevo).

**Terminado cuando:** la migracion corre, el backfill deja todo en 0 y
`npm run check:auditoria` pasa.

````
PROMPT PASO 3

Contexto: repo padelnet, Next 16 App Router, Prisma 7 con adapter mariadb,
TypeScript estricto. Estoy siguiendo docs/torneos-americano-mexicano.md.
El paso 2 dejo lib/torneo-rotacion.ts andando y verificado.

Este paso es solo schema. Sin logica.

1. prisma/schema.prisma, enum TorneoFormato: agregar dos valores con su doc
   comment, al estilo de los que ya estan:

     /// Individual con companero rotativo, fixture completo desde el arranque:
     /// cada jugador juega una vez con cada uno. Ver lib/torneo-rotacion.ts.
     AMERICANO
     /// Individual con companero rotativo por tabla en vivo: cada ronda se
     /// calcula al cerrar la anterior. Ver lib/torneo-rotacion.ts.
     MEXICANO

2. model TorneoJugador (NUEVO). Es la inscripcion individual Y la fila de la
   tabla de posiciones. Un solo modelo para las dos cosas porque son la misma
   lista: antes de la primera ronda, la tabla es la lista de anotados en cero.

     id, torneoId, userId
     suplente        Boolean @default(false)
     pago            Boolean @default(false)
     puntosAFavor    Int @default(0)
     puntosEnContra  Int @default(0)
     partidosJugados Int @default(0)
     partidosGanados Int @default(0)
     descansos       Int @default(0)
     /// Indice 0..N-1 con el que lo conoce lib/torneo-rotacion.ts. Se fija al
     /// generar el torneo y no cambia mas: es lo que ata el fixture calculado
     /// con las filas de la base.
     indiceFixture   Int?
     posicionFinal   Int?
     abandonoEnRonda Int?
     deletedAt, createdAt, updatedAt
     relaciones a Torneo (Cascade) y User (Restrict, igual que Pareja)
     @@unique([torneoId, userId])
     @@unique([torneoId, indiceFixture])
     @@index([torneoId, suplente])

   Comentar por que puntosEnContra existe: es el primer desempate del
   reglamento y calcularlo al vuelo obligaria a recorrer todos los partidos
   cada vez que se dibuja la tabla, que en mexicano se dibuja al cierre de
   CADA ronda.

3. model Pareja: agregar

     /// Numero de ronda en la que existe esta pareja, en los formatos
     /// rotativos. 0 = pareja fija de todo el torneo (ZONAS y
     /// ELIMINACION_DIRECTA).
     rondaNumero Int @default(0)

   Y CAMBIAR el unique de:
     @@unique([torneoId, player1Id, player2Id])
   a:
     @@unique([torneoId, player1Id, player2Id, rondaNumero])

   ESTO ES DELICADO Y QUIERO QUE LO COMENTES EN EL SCHEMA:
   El campo es Int con default 0, NO Int?. Con nullable, MariaDB no considera
   iguales dos NULL en un indice unico, asi que TODOS los torneos clasicos
   perderian en silencio la garantia de que no puede haber dos parejas con los
   mismos dos jugadores. Con default 0, el unique de cuatro columnas se
   comporta exactamente igual que el de tres para todo lo que existe hoy.

4. model Torneo: campos de configuracion de los formatos rotativos. Todos
   nullable o con default, para no tocar los torneos existentes:

     /// Solo AMERICANO/MEXICANO: rondas programadas.
     rondasProgramadas Int?
     /// Solo AMERICANO/MEXICANO: puntos que dura cada partido (16/24/32).
     /// Null = se juega por tiempo.
     puntosPorPartido  Int?
     /// Solo AMERICANO/MEXICANO: minutos de cada ronda.
     minutosPorRonda   Int?
     /// Ronda que se esta jugando. En MEXICANO manda: no se genera la
     /// siguiente hasta que esta cerrada.
     rondaActual       Int @default(0)
     /// Semilla del sorteo. Se guarda para poder rehacer el mismo fixture.
     semillaFixture    Int?

5. scripts/backfill-ronda-pareja.ts + script "backfill:ronda" en package.json:
   - Pone rondaNumero = 0 en todas las Pareja existentes.
   - Dry-run por defecto, escribe con --aplicar.
   - Imprime cuantas filas toco.
   NOTA: con el default 0 en la migracion las filas viejas ya quedan en 0. El
   script es la verificacion de que asi fue: que corra, cuente, y si encuentra
   alguna distinta de 0 que avise. Deja eso claro en el encabezado.

6. lib/auditoria-config.ts: clasificar TorneoJugador.
   Va a MODELOS_AUDITADOS: es una inscripcion, la carga y la da de baja una
   persona, y quien esta anotado a un torneo es exactamente el tipo de dato
   que hay que poder reconstruir. Los contadores de puntos los escribe el
   sistema, asi que evalua si conviene agregarlos a CAMPOS_IGNORADOS para que
   cada resultado cargado no genere una fila de auditoria por jugador. Decime
   que decidiste.

7. Migracion: "torneos_rotativos"

Convenciones del repo: comentarios en castellano sin acentos que expliquen el
por que y no el que.

Al terminar: npx tsc --noEmit && npm run lint && npm run prisma:check &&
npm run check:auditoria
Y corre el backfill en dry-run y pegame el conteo.
````

---

## Paso 4 — Crear el torneo e inscripcion individual

**Objetivo:** que se pueda crear un torneo americano o mexicano y que un
jugador se anote **solo**.

**Archivos:** `types/forms.ts`, `actions/torneos.ts`,
`actions/torneos-inscripcion.ts`, `TorneoForm.tsx`,
`app/torneos/[id]/registrarse/page.tsx`, `lib/torneo-elegibilidad.ts`.

**Terminado cuando:** creas un americano de 16 lugares, te anotas solo desde la
web, y aparecen 16 jugadores en la lista del admin.

````
PROMPT PASO 4

Contexto: repo padelnet, Next 16 App Router, Prisma 7, TypeScript estricto,
Tailwind 4 con tokens de tema, react-hook-form + zod.
Estoy siguiendo docs/torneos-americano-mexicano.md. Pasos 1 a 3 hechos: existe
lib/torneo-rotacion.ts verificado, el modelo TorneoJugador, Pareja.rondaNumero
y los formatos AMERICANO y MEXICANO en el enum.

Este paso es crear el torneo y anotarse SOLO. Todavia no se juega nada.

1. TorneoForm.tsx (app/admin/complejos/[id]/eventos/[eventoId]/torneos/
   components/):
   - Agregar a formatoOptions: "Americano (individual, todos con todos)" y
     "Mexicano (individual, por tabla en vivo)".
   - Cuando el formato es rotativo, mostrar los campos nuevos: rondas
     programadas, puntos por partido (16/24/32/por tiempo), minutos por ronda,
     y para mexicano si la primera ronda es por sorteo o por ranking.
   - Cuando el formato es rotativo, OCULTAR jugxZona y siembra, que no
     aplican, igual que hoy se oculta siembra cuando no es eliminacion
     directa (mira el patron de esEliminacionDirecta en la linea 111).
   - capacidad pasa a leerse como JUGADORES y no como parejas. Cambiar el
     label segun el formato. Para MEXICANO validar que sea multiplo de 4 y
     explicar por que en el mensaje de error: el formato agrupa de a cuatro
     por posicion en la tabla.
   - categoriaRegla: deshabilitar la opcion SUMA cuando el formato es
     rotativo, con un texto que diga por que (el jugador no elige companero,
     asi que no se puede garantizar la suma de la pareja).
   - Para AMERICANO, mostrar una advertencia calculada en vivo con
     calidadFixture() de lib/torneo-rotacion.ts: cuantas rondas hacen falta
     para que jueguen todos con todos (jugadores - 1), cuanto va a durar eso
     con los minutos configurados, y si el numero de jugadores elegido admite
     un fixture sin repeticiones. Es la informacion que evita que alguien
     anuncie un torneo de 4 horas y media sin darse cuenta.

2. types/forms.ts: extender el schema del torneo con los campos nuevos y las
   validaciones condicionales por formato (superRefine).

3. actions/torneos.ts: guardar los campos nuevos. Al crear un torneo rotativo,
   generar y guardar semillaFixture.

4. lib/torneo-elegibilidad.ts: agregar
     export function reglasAplicables(formato): TorneoCategoriaRegla[]
   y usarla donde hoy se valida. En rotativos, SUMA no aplica y el resto se
   evalua sobre el jugador individual, no sobre la pareja.
   OJO: cumpleSexo hoy valida la composicion de la pareja. En un torneo
   rotativo MIXTO, la restriccion "un varon y una mujer" NO es de inscripcion
   (se anota cualquiera) sino del ALGORITMO de emparejamiento. Son dos cosas
   distintas y hoy estan mezcladas en un solo concepto. Separalas y decime
   como lo resolviste.

5. actions/torneos-inscripcion.ts, funciones NUEVAS al lado de las que hay
   (no modifiques registerPublicTorneoPair, que es de los formatos clasicos):
   - registerPublicTorneoJugador(torneoId): se anota el de la sesion, solo.
   - cancelPublicTorneoJugador(torneoId)
   - registerManagedTorneoJugador(torneoId, userId): el admin anota a alguien.
   - listManagedTorneoJugadores(torneoId)
   Tienen que reusar TODO lo que ya resuelven las de pareja: ventana de
   inscripcion (inscripcionesAbiertas), cupo y lista de espera (suplente),
   elegibilidad por sexo y categoria, revivir una inscripcion cancelada.
   Leelas primero y segui el mismo criterio; si algo se puede extraer a una
   funcion compartida sin forzar, extraelo.

6. app/torneos/[id]/registrarse/page.tsx y la vista publica del torneo:
   si el formato es rotativo, mostrar el flujo individual (un boton "Anotarme")
   en vez del buscador de companero.

7. La pantalla de inscripciones del admin: una tabla de jugadores cuando el
   formato es rotativo, con su categoria y si pago.

Convenciones del repo: comentarios en castellano sin acentos que expliquen el
por que y no el que. Nada de any. enTransaccion de lib/prisma.ts para las
escrituras, nunca prisma.$transaction suelto (scripts/check-auditoria.ts falla
si aparece). Tailwind y tokens del tema, nada de Bootstrap.

Al terminar: npx tsc --noEmit && npm run lint && npm run check:auditoria
````

---

## Paso 5 — Generar el torneo

**Objetivo:** convertir el fixture calculado en `Pareja` y `Partido` reales, con
cancha y horario.

**Archivos:** `lib/torneo-rotativo.ts` (nuevo),
`actions/torneos-rotativos.ts` (nuevo), pantalla de partidos del admin.

**Terminado cuando:** apretas "Generar" en un americano de 16 y aparecen las 15
rondas con sus 60 partidos, cada uno con cancha y hora.

````
PROMPT PASO 5

Contexto: repo padelnet, Next 16 App Router, Prisma 7 con adapter mariadb,
TypeScript estricto. Estoy siguiendo docs/torneos-americano-mexicano.md.
Pasos 1 a 4 hechos: se puede crear el torneo y anotarse solo.

Este paso baja el fixture puro del paso 2 a filas de la base.

IMPORTANTE, leelo antes de empezar: NO uses lib/torneo-grilla.ts (buildGrilla).
Es un asignador de recursos que reparte partidos entre canchas, dias y ventanas
horarias esquivando restricciones por pareja. Para estos formatos no le falta
nada: le SOBRA todo. Aca la asignacion es "ronda 1 en todas las canchas a la
misma hora, ronda 2 dieciocho minutos despues". Meterle un modo a buildGrilla
seria agregarle un camino que no comparte nada con lo que hace. Va un
planificador propio y chico.

Tampoco toques lib/torneo-avance.ts, lib/torneo-llave.ts,
lib/torneo-resolucion.ts ni lib/llave-tabla.ts. Estos formatos no tienen cuadro
y esos caminos no se llaman.

1. lib/torneo-rotativo.ts (con "server-only"):

   export async function generarTorneoRotativo(torneoId: number)
   - Valida: formato rotativo, estado correcto, jugadores suficientes,
     canchas activas del complejo suficientes.
   - Asigna indiceFixture 0..N-1 a los TorneoJugador titulares. Orden:
     sorteo con semillaFixture del torneo. Se escribe UNA vez y no cambia mas.
   - AMERICANO: llama fixtureAmericano() con la semilla del torneo y genera
     TODAS las rondas de una.
   - MEXICANO: llama primeraRondaMexicano() y genera SOLO la ronda 1.
   - Por cada partido del fixture crea:
     * dos Pareja con rondaNumero = numero de ronda. Normaliza el orden de
       los jugadores (player1Id < player2Id) ANTES de crear, o el unique de
       cuatro columnas no protege nada.
     * un Partido con esas dos parejas, canchaId, scheduledAt y duracionMin.
     * idLegible con lib/partido-id-legible.ts. Mira que formato usa hoy y
       segui el mismo criterio; para estos torneos deberia poder decir la
       ronda y la cancha ("Verano-AM-R3-C2").
   - Los descansos NO generan Partido. Suman puntos directo en TorneoJugador
     (mitad del maximo, redondeando hacia arriba) e incrementan `descansos`.
     Comentar por que no hay partido fantasma: cualquier consulta que cuente
     partidos tendria que aprender a ignorarlo, y son muchas.
   - Horarios: ronda 1 en Torneo.inicio; cada ronda siguiente arranca
     minutosPorRonda + los minutos de cambio despues. Si no hay canchas
     suficientes para todos los partidos de una ronda, la ronda se parte en
     dos tandas y hay que avisarlo en el resultado, no fallar en silencio.
   - Todo dentro de enTransaccion de lib/prisma.ts.
   - Guardar el fixture calculado en el modelo Generacion (tipo
     "fixture_rotativo"), igual que hace hoy la generacion de grilla. Es lo que
     permite reconstruir que se genero si alguien discute.

   export async function regenerarTorneoRotativo(torneoId, nuevaSemilla)
   - Solo si NINGUN partido tiene resultado cargado. Si hay uno, error
     explicito. Regenerar un torneo empezado borra resultados de gente que ya
     jugo.

2. actions/torneos-rotativos.ts ("use server"): los guards de permiso con
   ensureComplejoManagerAccess y la delegacion al modulo. El modulo asume que
   el permiso ya se verifico, igual que documenta lib/torneo-avance.ts.

3. Pantalla: en la de partidos del admin
   (app/admin/.../torneos/[torneoId]/partidos/), si el formato es rotativo
   mostrar un panel propio en vez del generador de grilla: los parametros, un
   preview del fixture (rondas con sus cruces) y el boton de generar.
   El preview se calcula con el modulo puro del paso 2 SIN escribir nada.
   Mostrar tambien calidadFixture(): cuantas repeticiones de companero tiene el
   fixture que esta por generar. Si es mayor que cero, decir en una linea por
   que (la cantidad de jugadores no admite un fixture perfecto) y pedir
   confirmacion.

Convenciones del repo: comentarios en castellano sin acentos que expliquen el
por que y no el que. Nada de any. enTransaccion, nunca prisma.$transaction.
Tailwind y tokens del tema.

Al terminar: npx tsc --noEmit && npm run lint && npm run check:auditoria
Y genera un americano de 16 jugadores; pegame la primera y la ultima ronda con
sus cruces, y confirmame que ningun jugador repite companero.
````

---

## Paso 6 — Resultados y tabla de posiciones

**Objetivo:** cargar el marcador de cada partido y que la tabla individual se
arme sola.

**Archivos:** `lib/torneo-tabla-individual.ts` (nuevo),
`actions/torneos-partidos.ts`, `scripts/check-tabla-individual.ts` (nuevo),
`ResultadosPageClient.tsx`.

**Terminado cuando:** cargas los resultados de una ronda y la tabla se ordena
con los desempates del reglamento.

````
PROMPT PASO 6

Contexto: repo padelnet, Next 16 App Router, Prisma 7, TypeScript estricto,
Tailwind 4. Estoy siguiendo docs/torneos-americano-mexicano.md.
Pasos 1 a 5 hechos: el torneo se genera con sus rondas, parejas y partidos.

Este paso es cargar el marcador y armar la tabla individual.

1. lib/torneo-tabla-individual.ts: modulo PURO, sin prisma, igual que
   lib/torneo-posiciones.ts (que es el equivalente para las zonas y conviene
   leer primero, aunque NO se reusa: ese calcula 2 puntos por partido ganado y
   1 por perdido entre parejas de una zona, y aca el puntaje es la suma de
   puntos por jugador).

   export type FilaTablaIndividual = {
     jugadorId: number;
     pf: number;   // puntos a favor
     pc: number;   // puntos en contra
     dif: number;
     pj: number; pg: number;
     descansos: number;
   };

   export function calcularTablaIndividual(
     jugadores: Array<{ jugadorId: number; puntosBonus: number;
                        descansos: number }>,
     partidos: Array<{ jugadoresA: number[]; jugadoresB: number[];
                       puntosA: number; puntosB: number }>,
   ): FilaTablaIndividual[]

   Reglas, que son las del reglamento de docs/torneos-americano-mexicano.md:
   - Los DOS jugadores de una pareja suman los puntos que hizo la pareja. El
     perdedor tambien suma.
   - Orden: 1) mas puntos a favor; 2) mayor diferencia; 3) menos puntos en
     contra; 4) el enfrentamiento directo si existe; 5) estable por jugadorId
     para que el orden no baile entre renders.
   - puntosBonus son los de los descansos, ya calculados por quien llama.
   - Funcion pura, determinista, sin fecha ni random.

2. scripts/check-tabla-individual.ts + script "check:tabla" en package.json.
   Molde: scripts/check-siembra.ts.
   Verificar:
   - La suma de todos los puntos a favor es igual a la suma de todos los
     puntos en contra mas los bonus de descanso. Si no cierra, hay puntos que
     se inventaron o se perdieron.
   - Cada desempate se aplica en el orden correcto: armar casos chicos donde
     empatan en pf y difieren en dif, despues en pc, despues en directo.
   - El orden es estable: correr dos veces con los partidos barajados da la
     misma tabla.

3. actions/torneos-partidos.ts, saveTorneoPartidoResultado (linea 300):
   - Cuando el torneo es rotativo, el resultado es UN SOLO PartidoSet con
     numero 1 y los puntos en gamesPareja1/gamesPareja2. No hay sets 2 y 3.
     Comentar que se reusa PartidoSet a proposito para no agregar un modelo
     que guardaria dos numeros.
   - Validar contra Torneo.puntosPorPartido: si el torneo es a 24, el ganador
     tiene que tener exactamente 24 (salvo que el torneo sea por tiempo, donde
     vale cualquier marcador). Rechazar con mensaje claro.
   - Al guardar, actualizar los contadores de los CUATRO TorneoJugador
     involucrados (puntosAFavor, puntosEnContra, partidosJugados,
     partidosGanados) dentro de la misma transaccion que el resultado.
     Si el partido YA tenia resultado, restar el anterior antes de sumar el
     nuevo. Corregir un marcador cargado mal tiene que dejar la tabla exacta,
     no sumada dos veces.

4. Una funcion que recalcule la tabla entera desde los partidos y pise los
   contadores. Es la red de seguridad: ante cualquier duda, se recalcula desde
   la fuente. Exponela como un boton en el admin.

5. ResultadosPageClient.tsx: modo rotativo. Agrupar por ronda, un solo par de
   inputs por partido, y la tabla de posiciones al costado actualizandose.
   Marcar visualmente que rondas estan completas: en mexicano eso es lo que
   habilita generar la siguiente.

Convenciones del repo: comentarios en castellano sin acentos que expliquen el
por que y no el que. Nada de any. enTransaccion, nunca prisma.$transaction.
Tailwind y tokens del tema.

Al terminar: npx tsc --noEmit && npm run lint && npm run check:tabla
````

---

## Paso 7 — El avance del Mexicano

**Objetivo:** cerrar una ronda y generar la siguiente segun la tabla. **Es lo
unico que el Mexicano tiene y el Americano no.**

**Archivos:** `lib/torneo-rotativo.ts`, `actions/torneos-rotativos.ts`,
panel de avance.

**Terminado cuando:** corres un mexicano de 12 jugadores de punta a punta,
cerrando ronda por ronda, y los cruces salen 1+4 vs 2+3 por cancha.

````
PROMPT PASO 7

Contexto: repo padelnet, Next 16 App Router, Prisma 7, TypeScript estricto.
Estoy siguiendo docs/torneos-americano-mexicano.md. Pasos 1 a 6 hechos: se
cargan resultados y la tabla individual se calcula sola.

Este paso es el avance del MEXICANO. El americano no lo necesita: ya tiene
todas las rondas generadas desde el arranque.

El molde a copiar es cerrarZonasYArmarLlave() en actions/torneos-partidos.ts
(linea 1129) y lo que hay detras en lib/torneo-avance.ts: cerrar lo que
termino, calcular lo que sigue, escribirlo. Leelo antes.

1. lib/torneo-rotativo.ts, agregar:

   export async function cerrarRondaYGenerarSiguiente(torneoId: number)

   - Verifica que TODOS los partidos de Torneo.rondaActual tengan resultado.
     Si falta uno, error que diga CUAL falta (con su idLegible). El admin va a
     estar parado en el club con gente esperando: el mensaje tiene que decirle
     a que cancha ir, no "faltan resultados".
   - Si rondaActual == rondasProgramadas: cerrar el torneo (status FINISHED),
     escribir posicionFinal en cada TorneoJugador segun la tabla, y NO generar
     otra ronda.
   - Si no: calcular la tabla con calcularTablaIndividual(), sacar el orden de
     indiceFixture, llamar a rondaMexicano() de lib/torneo-rotacion.ts, y
     crear las Pareja (rondaNumero = ronda nueva) y los Partido igual que en
     el paso 5.
   - Incrementar Torneo.rondaActual.
   - Todo dentro de enTransaccion.
   - IDEMPOTENCIA: si dos personas aprietan el boton a la vez, tiene que
     generarse UNA ronda y no dos. La proteccion no es un if: es un update
     condicionado por rondaActual (updateMany where rondaActual: N -> N+1, y
     seguir SOLO si count === 1). El que pierde la carrera ve count 0 y se va.
     Comentalo, porque es el punto donde esto se puede romper feo: dos rondas
     generadas es un torneo arruinado a mitad de camino.
   - Guardar cada ronda generada en Generacion (tipo "ronda_mexicano") con la
     tabla que la origino. Si alguien discute un cruce, ahi esta la tabla
     exacta que se uso.

   export async function reabrirUltimaRonda(torneoId: number)
   - Deshace la ultima ronda generada: borra sus Partido y Pareja y vuelve
     rondaActual atras.
   - SOLO si ningun partido de esa ronda tiene resultado cargado.
   - Es para el caso real: se cargo mal un resultado de la ronda anterior, se
     genero la siguiente con la tabla equivocada y hay que rehacerla. Sin
     esto, la unica salida es rehacer el torneo entero.

2. actions/torneos-rotativos.ts: los guards y la delegacion.

3. Panel de avance en el admin, al estilo de AvanceTorneoPanel.tsx que ya
   existe:
   - Ronda actual, cuantos resultados faltan y de que canchas.
   - Boton "Cerrar ronda y generar la siguiente", deshabilitado mientras falte
     un resultado, con el motivo visible al lado.
   - Preview de los cruces que van a salir, calculado con el modulo puro ANTES
     de escribir nada. El admin tiene que poder ver los cruces y recien
     entonces confirmar.
   - Boton "Reabrir ultima ronda", secundario y con confirmacion.
   - Tailwind y tokens del tema.

4. En AMERICANO este panel no aparece: en su lugar, el avance de ronda es
   solo informativo (cuantas rondas quedan). Que quede claro en el codigo por
   que son dos comportamientos y no uno con un if adentro.

Convenciones del repo: comentarios en castellano sin acentos que expliquen el
por que y no el que. Nada de any. enTransaccion, nunca prisma.$transaction.

Al terminar: npx tsc --noEmit && npm run lint
Y corre un mexicano de 12 jugadores completo, ronda por ronda, cargando
resultados inventados. Pegame la tabla al cierre de cada ronda y los cruces de
la siguiente, para que pueda verificar a mano que salen 1+4 vs 2+3.
````

---

## Paso 8 — Vista publica

**Objetivo:** que el jugador vea la tabla, su proxima ronda y con quien le toca.

**Archivos:** `lib/torneo-vista-publica.ts`, `TorneoDetailTabs.tsx`,
`app/torneos/[id]/page.tsx`, `TorneoCard.tsx`.

**Terminado cuando:** entras al torneo desde el celular y ves en que cancha
jugas la ronda que viene y con quien.

````
PROMPT PASO 8

Contexto: repo padelnet, Next 16 App Router, Prisma 7, TypeScript estricto,
Tailwind 4 con tokens de tema. Estoy siguiendo
docs/torneos-americano-mexicano.md. Pasos 1 a 7 hechos: el torneo se juega
entero desde el admin.

Este paso es lo que ve el jugador. Pensalo para un celular en la mano de
alguien parado en el club entre ronda y ronda: esa es la unica situacion en la
que se usa.

1. lib/torneo-vista-publica.ts, en buildVistaPublicaTorneo (linea 223):
   rama para formatos rotativos que devuelva:
   - la tabla de posiciones individual;
   - las rondas con sus partidos, cancha, horario y resultado;
   - que ronda se esta jugando.
   No devolver grupos ni llave: en estos formatos no existen, y devolver
   estructuras vacias hace que la UI tenga que adivinar.

2. TorneoDetailTabs.tsx: hoy tiene dos pestañas fijas ("grupos" | "llave").
   Cuando el formato es rotativo, las pestañas son otras: "Posiciones" y
   "Rondas". Que el tipo ActiveTab dependa del formato y no sea una union
   fija de cuatro valores donde dos nunca aplican.

3. Pestaña Posiciones:
   - Puesto, jugador, puntos a favor, en contra, diferencia, partidos.
   - Destacar la fila del jugador logueado. Es lo primero que busca.
   - En MEXICANO, un aviso de que esta tabla es la que define los cruces de la
     ronda siguiente.

4. Pestaña Rondas:
   - Una seccion por ronda, la actual arriba y abierta.
   - Cada partido: los cuatro jugadores agrupados de a dos, cancha, hora y
     resultado si ya se cargo.
   - Para el jugador logueado, arriba de todo y bien visible: "Ronda 4 —
     cancha 2 — 19:45 — jugas con Martin contra Ana y Pablo". Eso es lo que
     viene a buscar; no lo hagas scrollear una tabla.
   - En MEXICANO, para las rondas que todavia no existen, decir que se conocen
     al cerrar la anterior. Que no parezca que falta informacion.
   - Marcar los descansos: "Ronda 5 — descansas (sumas 12 puntos)".

5. TorneoCard.tsx y app/torneos/page.tsx: badge del formato, para que en el
   listado se distinga un americano de un torneo por parejas antes de entrar.
   Y que la tarjeta diga "inscripcion individual".

6. Revisar los textos de inscripcion de la vista publica: los que hoy dicen
   "pareja" tienen que decir otra cosa cuando el formato es rotativo.

Convenciones del repo: comentarios en castellano sin acentos que expliquen el
por que y no el que. Nada de any. Tailwind y tokens del tema, nada de
Bootstrap. Mobile primero.

Al terminar: npx tsc --noEmit && npm run lint && npm run check:breadcrumbs
````

---

## Paso 9 — Ranking del club, logros y notificaciones

**Objetivo:** que estos torneos sumen al ranking y disparen los avisos que ya
existen.

**Archivos:** `lib/ranking-puntajes.ts`, `actions/torneos-ranking.ts`,
`lib/logros-catalogo.ts`, `actions/notificaciones-eventos.ts`.

**Terminado cuando:** cerras un americano y los 16 jugadores suman puntos de
ranking segun su puesto.

````
PROMPT PASO 9

Contexto: repo padelnet, Next 16 App Router, Prisma 7, TypeScript estricto.
Estoy siguiendo docs/torneos-americano-mexicano.md. Pasos 1 a 8 hechos: el
torneo se juega y se ve, de punta a punta.

Este paso lo conecta con el resto del sitio.

1. lib/ranking-puntajes.ts:
   Hoy RANKING_POSICIONES son posiciones de llave ("Campeon", "Semifinalista",
   "Perdedor Zona") y aplicarRankingTorneo() las deduce leyendo Partido.llave.
   Un americano no tiene llave: termina en una tabla ordenada de N jugadores.

   - Agregar un catalogo aparte, POSICIONES_ROTATIVO:
     "1er puesto" 100, "2do puesto" 80, "3er puesto" 60, "4to puesto" 40,
     "Top 8" 25, "Participante" 10.
     Un catalogo aparte y no valores nuevos en el de siempre: el form de
     puntajes del torneo tiene que mostrar UNO de los dos segun el formato, y
     mezclarlos daria una pantalla con nueve posiciones de las cuales cinco no
     aplican.
   - Exportar posicionesDelFormato(formato) para que el form y la aplicacion
     del ranking pidan siempre lo mismo y no puedan divergir.

2. actions/torneos-ranking.ts, aplicarRankingTorneo (linea 145):
   - Rama para formatos rotativos: en vez de recorrer Partido.llave, leer
     TorneoJugador ordenado por posicionFinal y mapear puesto -> posicion del
     catalogo nuevo.
   - Diferencia que simplifica: hoy la posicion se calcula por PAREJA y
     despues se reparte a los dos jugadores. Aca ya es por jugador.
   - Respetar lo que ya hace la funcion: crear las rondas con valores por
     defecto si el torneo no las tiene, y no pisar puntajes editados por el
     admin.
   - Los suplentes que nunca jugaron no suman. Los que abandonaron
     (abandonoEnRonda no null): decidilo y comentalo. Mi sugerencia es que
     sumen "Participante" y nada mas, porque jugaron.

3. El form de puntajes del torneo: mostrar el catalogo que corresponde al
   formato.

4. lib/logros-catalogo.ts: EventoJuego tiene RONDA_ALCANZADA con una FaseLlave
   y TORNEO_GANADO con `invicto`. En estos formatos:
   - PARTIDO_JUGADO, PARTIDO_GANADO y RANKING_ACTUALIZADO aplican igual.
   - RONDA_ALCANZADA no aplica: no hay fases.
   - TORNEO_GANADO aplica, pero `invicto` significa otra cosa. Decidi si
     "invicto" es ganar todos los partidos del torneo (que en un americano es
     dificilisimo y por eso vale) o si no corresponde. Justificalo.
   - SET_GANADO con bagel: no aplica, no hay sets. Que no se dispare.
   Contame que decidiste antes de escribir el codigo.

5. actions/notificaciones-eventos.ts: revisar los 8 disparadores. Los textos
   que dicen "tu pareja" o "el partido de tu pareja" tienen que decir otra cosa
   en estos formatos. En particular MATCH_1H_REMINDER y MATCH_CHANGED, que son
   los que el jugador recibe con el torneo en curso.
   OJO con MEXICANO: la ronda siguiente se genera al cerrar la anterior, o sea
   minutos antes de jugarse. Un recordatorio de 1 hora antes no tiene sentido
   ahi. Decidi si en mexicano se manda un aviso al generarse la ronda
   ("jugas ahora en la cancha 2") en vez del recordatorio programado.

Convenciones del repo: comentarios en castellano sin acentos que expliquen el
por que y no el que. Nada de any. enTransaccion, nunca prisma.$transaction.

Al terminar: npx tsc --noEmit && npm run lint && npm run check:auditoria
````

---

## Paso 10 — Pruebas y salida

````
PROMPT PASO 10

Contexto: repo padelnet. Estoy siguiendo docs/torneos-americano-mexicano.md,
pasos 1 a 9 hechos. Quiero sacarlo a produccion.

1. Correr todos los checks del repo y pegarme la salida:
   npm run check:rotacion && npm run check:tabla && npm run check:auditoria &&
   npm run check:siembra && npm run check:llave && npm run check:resolucion &&
   npm run check:breadcrumbs && npm run prisma:check
   Los cuatro del medio son de los formatos viejos: si alguno se rompio, algo
   de este trabajo toco lo que no debia.

2. Prueba de no regresion, que es la que mas me importa:
   - Crear un torneo ZONAS y uno ELIMINACION_DIRECTA como siempre, jugarlos
     enteros, aplicar ranking.
   - Confirmar que el unique de Pareja sigue impidiendo dos parejas con los
     mismos dos jugadores. Intentalo a proposito y decime que error da.
     Ese es el que se pudo haber roto en el paso 3.

3. Americano completo, de punta a punta:
   - 16 jugadores, 15 rondas, 4 canchas.
   - Confirmar en la base: ningun jugador repite companero en las 15 rondas.
     Una consulta que lo pruebe, no una mirada a la pantalla.
   - Cargar todos los resultados, cerrar, aplicar ranking.
   - Verificar que la suma de puntos a favor de todos = suma de puntos en
     contra + bonus de descansos.

4. Americano con numero incomodo:
   - 14 jugadores (que no admite fixture perfecto) y 7 jugadores (impar).
   - Que el sistema avise la cantidad de repeticiones ANTES de generar.
   - Que los descansos esten repartidos: max - min <= 1.

5. Mexicano de punta a punta:
   - 12 jugadores, 7 rondas, 3 canchas.
   - Ronda por ronda, verificando a mano que los cruces son 1+4 vs 2+3 por
     cancha segun la tabla del momento.
   - Probar reabrirUltimaRonda despues de generar una ronda con la tabla
     equivocada.
   - Probar apretar "cerrar ronda" dos veces rapido: tiene que generarse UNA
     sola ronda.

6. Casos feos:
   - Cargar un resultado, corregirlo, y confirmar que la tabla queda exacta y
     no sumada dos veces.
   - Un jugador que abandona en la ronda 3.
   - Intentar generar un mexicano con 14 jugadores: tiene que rechazarlo con
     un mensaje que explique por que.
   - Intentar regenerar un torneo con resultados cargados: tiene que negarse.

7. Checklist de produccion:
   - Migracion aplicada y backfill:ronda corrido, con todas las Pareja
     existentes en rondaNumero 0.
   - Un club de prueba con un americano de 8 jugadores real, jugado por gente
     de verdad, antes de ofrecerlo a los demas.

Pegame el resultado de cada prueba, no un resumen de que "todo anda".
````

---

## Cronograma

| Paso | Que entrega | Se puede usar solo? |
|---|---|---|
| 1 | Los dos reglamentos publicables | **Si** — el club corre el torneo a mano |
| 2 | El algoritmo, verificado sin base | No, pero es lo mas riesgoso y va primero |
| 3-4 | Crear torneo, anotarse solo | No |
| 5-6 | Americano jugable de punta a punta | **Si — el americano ya funciona** |
| 7 | Mexicano jugable | **Si** |
| 8 | Lo que ve el jugador | Mejora grande |
| 9 | Ranking, logros, avisos | Cierre |

Dos cortes donde se puede parar y ya tener algo: despues del **paso 1** (el
reglamento publicado, torneo a mano) y despues del **paso 6** (el americano
completo andando, sin mexicano).

---

## Lo que este plan deja afuera

**Team Americano y Mexicano por equipos.** Variantes donde la pareja es fija
todo el torneo y lo que rota son los rivales. Son mas faciles que lo de aca
—la pareja fija ya existe en el modelo— y se pueden sumar despues como un
tercer valor del enum.

**Mixicano.** La variante mixta del mexicano, donde ademas del emparejamiento
por tabla hay que respetar un varon y una mujer por pareja. El algoritmo del
paso 2 ya soporta la restriccion mixta para el americano; extenderla al
mexicano es acotar `rondaMexicano` y no es trivial: las dos restricciones
—posicion en la tabla y genero— pueden pelearse.

**Fase final despues del americano.** Algunos clubes corren un americano de
clasificacion y despues cruzan a los 4 primeros en semifinales. Es combinar
este formato con la llave que ya existe, y merece su propio diseño.

**Puntaje por games ganados en vez de puntos.** Otra variante de scoring que
existe. El modelo la soporta (es el mismo par de numeros), pero la validacion
contra `puntosPorPartido` habria que hacerla opcional.

**Cronometro en pantalla.** Para los torneos por tiempo, una pantalla con el
reloj de la ronda proyectada en el club. Es una linda funcionalidad y no tiene
nada que ver con el modelo de datos.

**Inscripcion desde el celular con QR en el club.** El americano es un formato
que se arma sobre la marcha con quien aparecio; anotar gente rapido importa mas
que en un torneo por parejas.

**Cobro de la inscripcion.** Va por el camino de `docs/prompts-mercadopago.md`,
que ya contempla la inscripcion a torneos. Lo unico que cambia es que aca se
cobra por jugador y no por pareja.

---

## Fuentes de las reglas

Los reglamentos de la Parte 1 se escribieron a partir de la practica corriente
del formato, contrastada con:

- [Americano Padel — reglas y guia completa](https://americano-padel.app/en/blog/americano-padel-rules-complete-guide/)
- [PadelMix — Americano Padel: Rules, Formats and Tips](https://padelmix.app/americano-padel)
- [PadelMix — Mexicano Padel: Rules, Formats and Tips](https://padelmix.app/mexicano-padel)
- [PadelFast — Padel mexicano](https://www.padelfast.com/es/formats/mexicano)
- [LigaPadla — Padel Mexicano: rules and advantages](https://ligapadla.pl/en/padel-mexicano-rules-and-advantages/)
- [Host A Tourney — Mexicano Padel: Rules, Scoring and How to Organize](https://hostatourney.com/en/blog/mexicano-padel-rules-scoring-guide)
- [Viborace — The Americano in Padel](https://viborace.com/blogs/padel-rules/padel-americano)
- [padelen.com — Tipos de torneos de padel](https://www.padelen.com/blog/torneos-de-padel/tipos-torneos-modalidades-de-competicion/)

**No hay un reglamento oficial de federacion para estos formatos**: son formatos
sociales y cada organizador fija sus bases. Los valores entre corchetes estan
justamente para eso. Lo que si conviene respetar, porque es lo que la gente
espera, es el puntaje individual, la rotacion de compañero y el criterio de
emparejamiento del mexicano.
