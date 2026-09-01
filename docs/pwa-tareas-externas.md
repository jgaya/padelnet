# PWA: lo que hay que hacer fuera del repo

El codigo ya esta. Esto es lo que no se puede resolver desde el repositorio y te
toca a vos.

Esta ordenado por bloqueo: los de la seccion 1 son condicion para que la PWA
funcione, los de la 2 son verificacion en dispositivos reales, y los de la 3 son
mejoras opcionales.

---

## 1. Condiciones para que funcione

### 1.1 HTTPS en el dominio (bloqueante)

**Los service workers solo corren sobre HTTPS.** La unica excepcion es
`localhost`, que el navegador considera seguro para desarrollo.

Si el sitio se sirve por HTTP, no hay PWA: no se instala, no hay pantalla
offline, y las push tampoco.

Que verificar en el VPS:

- El certificado es valido y no vencido (con Let's Encrypt, que la renovacion
  automatica este corriendo: `systemctl list-timers | grep certbot`).
- `http://` redirige a `https://` con un 301.
- No hay contenido mixto: si el HTML sale por HTTPS pero algun recurso se pide
  por HTTP, el navegador lo bloquea.

Comprobacion rapida:

```bash
curl -I https://TU-DOMINIO/sw.js
```

Tiene que devolver `200`, `Content-Type: application/javascript` y el
`Cache-Control: no-cache, no-store, must-revalidate` que puso `next.config.ts`.

### 1.2 Que el proxy no se coma los headers del service worker

`next.config.ts` manda `Cache-Control: no-cache` y `Service-Worker-Allowed: /`
para `/sw.js`. Si adelante hay Nginx, Caddy o Cloudflare, puede estar pisandolos.

**Si el proxy cachea `/sw.js`, el worker viejo queda vivo indefinidamente** y con
el service worker eso no es una pagina desactualizada: es codigo desactualizado
controlando todas las respuestas de la app.

En Nginx, para que pase de largo:

```nginx
location = /sw.js {
    proxy_pass http://localhost:3000;
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;
    expires off;
}
```

Con Cloudflare: revisar que no haya una Page Rule ni "Cache Everything" tocando
`/sw.js` ni `/manifest.webmanifest`.

Verificar con el `curl -I` de arriba, **contra el dominio publico**, no contra
`localhost:3000`.

### 1.3 Deploy

```bash
npm ci
npm run build
# reiniciar el servicio
```

Los PNG de `public/icons/` estan commiteados, asi que **no hace falta correr
`npm run icons` en el deploy**. Solo si algun dia se cambia el diseño del icono:
se corre en tu maquina, se commitean los PNG nuevos, y se deploya.

`@resvg/resvg-js` es `devDependency`: no se instala en produccion con
`npm ci --omit=dev` y no hace falta que lo haga.

---

## 2. Verificacion en dispositivos reales

Esto no se puede hacer desde la maquina de desarrollo.

### 2.1 Android (Chrome)

1. Entrar al sitio.
2. Deberia aparecer el banner "Instala PadelNet" al rato. Tocar **Instalar**.
3. Confirmar que el icono en el cajon de apps **no tiene el texto recortado** —
   es lo que valida la variante maskable.
4. Abrir la app instalada: sin barra de direcciones, y la barra de estado del
   color del header.
5. Cambiar el tema desde el menu del avatar → la barra de estado tiene que
   cambiar con el.
6. Modo avion → navegar → tiene que aparecer la pantalla "Te quedaste sin
   conexion", no el dinosaurio.
7. Aceptar notificaciones y mandarte una push de prueba: **tiene que llegar con
   el icono verde de PadelNet**, no con el generico del navegador.

### 2.2 iPhone (Safari) — el que mas importa

Es el caso que hoy esta roto y el motivo principal de todo esto: **Safari solo
entrega notificaciones web a apps agregadas a la pantalla de inicio.** Sin
instalar, no hay push en iPhone.

1. Abrir el sitio **en Safari** (en Chrome de iOS no se puede instalar).
2. Deberia aparecer el banner con las instrucciones.
3. Compartir → **Agregar a inicio**. Confirmar que el icono se ve bien.
4. Abrir desde la pantalla de inicio: sin barra de Safari.
5. **Recien ahi** aceptar las notificaciones, desde la app instalada. Si se
   aceptan antes, desde Safari, iOS no las entrega.
6. Mandarte una push de prueba y confirmar que llega.
7. Cerrar la app del todo y repetir: las de segundo plano son las que valen.

> Requiere iOS 16.4 o superior. En versiones anteriores no hay push web y no hay
> nada que se pueda hacer del lado del codigo.

### 2.3 Auditoria con Lighthouse

En Chrome de escritorio, contra el dominio publico (no `localhost`):

DevTools → Lighthouse → marcar **Progressive Web App** → analizar.

Que mirar:
- "Web app manifest meets the installability requirements"
- "Registers a service worker that controls page and start_url"
- "Sets a theme color for the address bar"

En DevTools → Application:
- **Manifest**: sin errores, los 4 iconos listados, el maskable reconocido.
- **Service Workers**: **uno solo**, `/sw.js`, activado. Si aparece
  `firebase-messaging-sw.js`, el limpiador de `lib/service-worker.ts` no corrio:
  recargar una vez mas.

### 2.4 El caso de los que ya la tenian instalada

Si alguien acepto notificaciones antes de este cambio, tiene registrado el
`firebase-messaging-sw.js` viejo. `lib/service-worker.ts` lo desregistra solo al
entrar, pero conviene probarlo con una cuenta real:

1. Entrar al sitio con ese dispositivo.
2. DevTools → Application → Service Workers: solo tiene que quedar `/sw.js`.
3. Mandarse una push y confirmar que sigue llegando.

---

## 3. Opcionales

### 3.1 Screenshots del manifest

Chrome en Android muestra un dialogo de instalacion **mas rico** (con capturas y
descripcion, tipo tienda de apps) si el manifest declara `screenshots`. Sin
ellas usa el dialogo minimo.

Si te interesa: dos o tres capturas de 1080x1920 en `public/icons/`, y avisame
para agregarlas a `app/manifest.ts` con sus `sizes` y `form_factor`.

### 3.2 Un icono mejor a tamaño chico

El icono actual es el wordmark completo (`PADEL` + `.NET.AR`). A 192px y 512px se
lee perfecto, pero **a 32px es una mancha verde** — por eso no se genero un
favicon nuevo y la pestaña sigue usando `app/favicon.ico`.

Si mas adelante hay un logo o un monograma de verdad, el pipeline ya esta:
reemplazar `public/icons/icono.svg` y `icono-maskable.svg`, correr
`npm run icons`, y salen todos los tamaños.

### 3.3 Splash screens de iOS

Android arma la pantalla de carga sola con el `background_color` y el icono del
manifest. **iOS no**: hay que declarar una imagen por cada tamaño de pantalla con
`<link rel="apple-touch-startup-image" media="...">`, y son del orden de 15
combinaciones entre modelos y orientaciones.

Sin eso, iOS muestra una pantalla blanca breve al abrir. Es cosmetico. Si te
molesta, avisame y lo agrego.

---

## Resumen de lo bloqueante

Si solo vas a hacer tres cosas:

1. **HTTPS valido** en el dominio.
2. **Que el proxy no cachee `/sw.js`** — verificalo con `curl -I`.
3. **Probar en un iPhone real**: instalar desde Safari, y aceptar las
   notificaciones *despues* de instalar.
