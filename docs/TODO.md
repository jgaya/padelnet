# TODOs

## A Arreglar BUGS - CAMBIOS PROD

*  ~~Confirma tu email antes de inscribirte. Revisa tu correo o pedi un link nuevo en /confirmar-email. No llego un email ni a spam~~

* Mejorar templates de los mails
* spinner para el sitio

* cuando cargamos la foto y la procesamos, tenemos que poner un loading, porque sino pasa un tiempo y la gente no se da cuenta si se esta haciendo algo

* como superadmin, poder validar un jugador con un boton en el listado de usuarios

* cargue una imagen de perfil de un jugador no validado, me dijo ok. Pero cuando entro como superadmin no me aparece para moderar en el listado de imagenes de perfil

#### Ingrese como admin de padel norte (admin@padel-norte.local)
- Estaria bueno que ya tenga un crear Evento en la home
- cuando voy a torneo/nuevo Evento me pide elegir complejo, estaria bueno que como esto
logueado como admin de padel norte ya tome "padel norte" como complejo y evitar ese paso.
- una vez que presionamos "Guardar evento", se queda ahi , deberiamos redirigirlo al evento u home.
- mejorar botones en el listado de eventos
- 'torneos/[id]' muestra grupos, llave, pero falta mostrar los inscriptos hasta el momento

##### Nuevo torneo:
* sacar regla de categoria y N, unificar en vez de poner "igual a N" y N = "6" cambiar por Categoria 6 pura
* sacar jugadores por zona
* cuando se guarda, tendria que redirigirlo al listado de torneos del evento



##### Inscripciones a torneo:
* Jugador1 y Jugador2 modificar para que abra un modal y ahi tener un filtro de jugadores, porque el select con mas de 30 jugadores se va complicar la usabilidad



#### Ingreso como jugador (esta inscripto a un torneo)
* tendriamos que poner un boton y un texto para que sepa que esta inscripto  y un link directo al torneo.
* sacar el card "Para jugadores Queres empezar a jugar?" del home, porque estamos logueados como jugador, tal vez ahi poner los torneos en los que esto inscripto

### En General

- faltan imagenes en los logros, acomodar seed y subir imagenes
- acomodar footer
- complejos zona horaria y pais acomodar como se ven


##  A investigar
torneo llave directa onda tennis sin zonas falta:
    - Cuadro de perdedores (doble eliminacion).
    - Sembrar a mano, arrastrando parejas en el cuadro.


buscar en internet como funcionan torneo de paddle por equipos

ligas de amigos

me falta uno /busco pareja agregar posicion en DB

desempate de zona de 4 mirar reglamento de copa regla 15, 



por sancion doble exlcusion en zona y pasa solo 1 y un BYE, haciendo que esa llave tenga ganador o triple exclusiopn son todos tontos, y no pasa nadie




Revisar estilo mobile para todo el sitio


Arreglar la llave visulmente, porque siempre empieza desde 16avos aunque no los haya, ejemplo torneo prueba 


restriccion de jugador multiples dias

torneos pagos para super de los complejos , admin ve lo que le falta pagar

agarar excel y generar inserts para encuentro

 Tres cosas para vos

  1. SESSION_SECRET no está en tu .env. lib/session.ts:6 cae al default "your-secret-key-change-this-in-production", así que cualquiera que conozca ese string —está
  en el repo— puede firmarse una sesión de superadmin. Es más grave que lo que acabamos de arreglar y no depende de este cambio. Poné un openssl rand -hex 32 ahí,
  con la salvedad de que invalida todas las sesiones activas.
  2. Archivos huérfanos todavía trackeados: public/uploads/users/1/ tiene dos imágenes que no referencia nadie (el avatarUrl de ese usuario es "" — son restos del
  bug de huérfanos). El .gitignore nuevo no destrackea lo ya commiteado; hace falta git rm --cached public/uploads/users/1/*. No las borré yo.
  3. Al deployar: correr npm run backfill:imagenes después del deploy, y definir UPLOADS_DIR apuntando fuera del directorio del deploy para que las fotos sobrevivan
  a un build limpio.



## Terminados 
- Tooltip para todos los botones. -> Done
- boton de volver / breedcrums todas las superadmin y admin -> Done
- agregar menu hamburguesa -> Done
- Hacer dni y DOB obligatorios. ->Done
- Agregar integracion para usuarios de Google / apple(hay que garpar 100 dolares) -> Done
- Cargar resultado cambiar a combos con los resultados precargados, desde 6-0 a 6-7. -> Done
- pedir listado dinamico de localidades por provincia para incripcion de nuevo usuario -> Done
- Creacion de Torneo copiar fecha y hora de inicio fin de Evento Padre -> Done 
- En lista de torneos agregar boton Publicar en las acciones (y demas acciones posibles) -> Done
- en crear partidos, agregar boton de copiar horarios para todas las canchas -> Done

- Recategorizaion hay que hacerlo funcionar -> Done 
- ID de partido para cargar resultados -> Done
- cargar partidos ganados/perdidos /jugados cuando cierra el torneo -> Done
- estadisticas del jugador en su perfil -> Done
- estadisticas publicas del jugador. -> Done
- Agregar posibilidad de WO en Cargar resultado -> Done
- sitios publicos poner nombre de complejo en vez de id en url en vez de
 http://localhost:3001/complejos/2 http://localhost:3001/complejos/Club-Prueba-Roles -> Done

- cerrar zonas de a una -> Done
mostrar las zonas con el resultado en el admin, lo mismo la llave -> Done
- cara a cara (pagina versus) -> Done
- Crear theme, dark mode. -> Done
- Moderacion de Imagenes superadmin -> Done
- zoom a la imagen cuando se carga, ver lo que paso gaby -> Done


- Exportar PDF Turnos, Partidos del torneo x  del dia -> Done
- Fix descargar pdf iphone -> Done


- Sanciones inicio fin , no te deja inscribir, publico y privado -> Done
- comprimir imagnes subidas sin perder mucha calidad -> Done 
- logger de eventos, modificaciones a la DB quien y cuando -> Done
- torneo llave directa onda tennis sin zonas -> Done 
- logros -> Done

