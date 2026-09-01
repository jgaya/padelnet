Tooltip para todos los botones. -> Done
boton de volver / breedcrums todas las superadmin y admin -> Done
agregar menu hamburguesa -> Done
Hacer dni y DOB obligatorios. ->Done
Agregar integracion para usuarios de Google / apple(hay que garpar 100 dolares) -> Done
Cargar resultado cambiar a combos con los resultados precargados, desde 6-0 a 6-7. -> Done
pedir listado dinamico de localidades por provincia para incripcion de nuevo usuario -> Done
Creacion de Torneo copiar fecha y hora de inicio fin de Evento Padre -> Done 
En lista de torneos agregar boton Publicar en las acciones (y demas acciones posibles) -> Done
en crear partidos, agregar boton de copiar horarios para todas las canchas -> Done

Recategorizaion hay que hacerlo funcionar -> Done 
ID de partido para cargar resultados -> Done
cargar partidos ganados/perdidos /jugados cuando cierra el torneo -> Done
estadisticas del jugador en su perfil -> Done
estadisticas publicas del jugador. -> Done
Agregar posibilidad de WO en Cargar resultado -> Done
sitios publicos poner nombre de complejo en vez de id en url en vez de
 http://localhost:3001/complejos/2 http://localhost:3001/complejos/Club-Prueba-Roles -> Done

cerrar zonas de a una -> Done
mostrar las zonas con el resultado en el admin, lo mismo la llave -> Done
cara a cara (pagina versus) -> Done
Crear theme, dark mode. -> Done
Moderacion de Imagenes superadmin -> Done
zoom a la imagen cuando se carga, ver lo que paso gaby -> Done


Exportar PDF Turnos, Partidos del torneo x  del dia -> Done
Fix descargar pdf iphone -> Talvez


Sanciones inicio fin , no te deja inscribir, publico y privado -> Done
comprimir imagnes subidas sin perder mucha calidad -> Done 
logger de eventos, modificaciones a la DB quien y cuando -> Done
torneo llave directa onda tennis sin zonas -> Done

tiro al backtracking, 
logros -> Done




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

const firebaseConfig = {
  apiKey: "AIzaSyDaJ-SC1rw0ogZq1T0GmX7I7fSzm_KH54U",
  authDomain: "padelnet-f2b1f.firebaseapp.com",
  projectId: "padelnet-f2b1f",
  storageBucket: "padelnet-f2b1f.firebasestorage.app",
  messagingSenderId: "705903188285",
  appId: "1:705903188285:web:ef1c1fa1a42ad8d3360d54",
  measurementId: "G-R5H97X4FF9"
};

certificado push web BKPLYEPE-7Kjaig88ZTbPOcVQzd1labiPnVgfGqeUSrOW7RwobPh50qK5BcKh8fKzqbZv8PwgZWHgXGXbLRijC4


clave privada xmh1wFt0ns8PdPtnnR4rVrRsANnyuzkKdONBwsmSOwU