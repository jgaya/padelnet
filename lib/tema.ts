/**
 * Estado del tema claro/oscuro.
 *
 * El tema vive en dos atributos del `<html>`:
 *
 *   data-theme="light|dark"             el tema ya resuelto, es lo que pinta el CSS
 *   data-theme-mode="light|dark|system" lo que eligio el usuario, para marcar la
 *                                       opcion activa en el selector
 *
 * Los escribe dos veces: el script inline de `app/layout.tsx` antes del primer
 * paint (para que no haya flash blanco al recargar en oscuro) y despues cada
 * `fijarModo`. `SCRIPT_TEMA` y `aplicarTema` hacen lo mismo y tienen que seguir
 * haciendo lo mismo: el script no puede importar nada porque corre antes de que
 * baje el bundle.
 *
 * La preferencia no es estado de React, es estado del navegador
 * (localStorage + `prefers-color-scheme`), asi que se modela como un store
 * externo y se lee con `useSyncExternalStore` desde `hooks/useTema.ts`. Eso
 * evita el `setState` dentro de un `useEffect` y deja que React maneje solo la
 * diferencia entre el render del servidor y el del cliente.
 */

/** Lo que elige el usuario en el menu del avatar. */
export type ThemeMode = "light" | "dark" | "system";

/** Lo que termina aplicado al DOM: `system` ya resuelto contra el sistema. */
export type ResolvedTheme = "light" | "dark";

export type EstadoTema = {
  mode: ThemeMode;
  resolved: ResolvedTheme;
};

export const TEMA_STORAGE_KEY = "padelnet-theme";

export const MODOS: ThemeMode[] = ["light", "dark", "system"];

export const ETIQUETAS_MODO: Record<ThemeMode, string> = {
  light: "Claro",
  dark: "Oscuro",
  system: "Sistema",
};

const CONSULTA_OSCURO = "(prefers-color-scheme: dark)";

/**
 * Color de la barra del navegador y de la barra de estado cuando la app corre
 * instalada. Es `--surface` de cada tema (app/globals.css), que es el color del
 * header sticky: asi la barra del sistema se lee como continuacion del header.
 *
 * No alcanza con dos `<meta name="theme-color" media="(prefers-color-scheme)">`
 * en el layout: esas siguen al sistema operativo, y aca el tema es una eleccion
 * de tres valores del usuario. Alguien que elige "Claro" con el celular en
 * oscuro tendria la barra oscura y la app clara.
 */
export const COLOR_BARRA: Record<ResolvedTheme, string> = {
  light: "#ffffff",
  dark: "#16201f",
};

/**
 * Lo que ve el servidor. El valor real depende del navegador, asi que en SSR se
 * asume `system`/`light` y React reconcilia despues del primer render. Lo visible
 * no parpadea porque el script inline ya dejo puesto el `data-theme` correcto y
 * la opcion activa del selector se pinta con CSS, no con este estado.
 */
const ESTADO_SERVIDOR: EstadoTema = { mode: "system", resolved: "light" };

export function esModo(valor: unknown): valor is ThemeMode {
  return valor === "light" || valor === "dark" || valor === "system";
}

/** El modo guardado, o `system` si no hay nada o el valor esta corrupto. */
export function leerModo(): ThemeMode {
  try {
    const guardado = window.localStorage.getItem(TEMA_STORAGE_KEY);
    return esModo(guardado) ? guardado : "system";
  } catch {
    // localStorage puede tirar si el usuario bloquea el almacenamiento.
    return "system";
  }
}

export function resolverModo(mode: ThemeMode): ResolvedTheme {
  if (mode === "system") {
    return window.matchMedia(CONSULTA_OSCURO).matches ? "dark" : "light";
  }

  return mode;
}

/** Escribe el tema en el `<html>`. Unico lugar que toca el DOM. */
export function aplicarTema(mode: ThemeMode): ResolvedTheme {
  const resuelto = resolverModo(mode);
  const html = document.documentElement;

  html.dataset.theme = resuelto;
  html.dataset.themeMode = mode;
  // Tambien inline y no solo por CSS: asi los controles nativos y la scrollbar
  // no parpadean en claro mientras baja la hoja de estilos.
  html.style.colorScheme = resuelto;

  // La barra del navegador (y la de estado, con la app instalada) acompaña al
  // tema elegido. Ver COLOR_BARRA.
  //
  // Se crea si no esta: el `<meta>` lo pone SCRIPT_TEMA, no el `metadata` de
  // Next, justamente para que haya uno solo. Si por lo que sea ese script no
  // corrio, esto lo cubre.
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", COLOR_BARRA[resuelto]);

  return resuelto;
}

/* ------------------------------------------------------------------ store --- */

const oyentes = new Set<() => void>();

/**
 * `useSyncExternalStore` compara los snapshots por identidad, asi que hay que
 * cachear el objeto y devolver el mismo mientras nada cambie.
 */
let cache: EstadoTema | null = null;

let desconectar: (() => void) | null = null;

function calcular(): EstadoTema {
  const mode = leerModo();
  return { mode, resolved: resolverModo(mode) };
}

function invalidar() {
  const siguiente = calcular();

  if (
    cache &&
    cache.mode === siguiente.mode &&
    cache.resolved === siguiente.resolved
  ) {
    return;
  }

  cache = siguiente;
  for (const oyente of oyentes) {
    oyente();
  }
}

export function snapshotTema(): EstadoTema {
  if (!cache) {
    cache = calcular();
  }

  return cache;
}

export function snapshotTemaServidor(): EstadoTema {
  return ESTADO_SERVIDOR;
}

export function suscribirTema(oyente: () => void) {
  oyentes.add(oyente);

  if (!desconectar) {
    const consulta = window.matchMedia(CONSULTA_OSCURO);

    // El sistema cambio de tema: solo importa si el modo es `system`, pero
    // recalcular igual es barato y `invalidar` no avisa si no cambio nada.
    const alCambiarSistema = () => {
      aplicarTema(leerModo());
      invalidar();
    };

    // Otra pestania cambio el tema.
    const alCambiarStorage = (evento: StorageEvent) => {
      if (evento.key !== TEMA_STORAGE_KEY) return;
      aplicarTema(leerModo());
      invalidar();
    };

    consulta.addEventListener("change", alCambiarSistema);
    window.addEventListener("storage", alCambiarStorage);

    desconectar = () => {
      consulta.removeEventListener("change", alCambiarSistema);
      window.removeEventListener("storage", alCambiarStorage);
    };
  }

  return () => {
    oyentes.delete(oyente);

    if (oyentes.size === 0 && desconectar) {
      desconectar();
      desconectar = null;
      // Sin oyentes no hay quien detecte los cambios, asi que el cache queda
      // viejo. Se descarta para que el proximo suscriptor vuelva a leer el
      // estado real en vez de un snapshot de hace rato.
      cache = null;
    }
  };
}

/** Cambia el tema: persiste, lo aplica al DOM y avisa a los suscriptores. */
export function fijarModo(mode: ThemeMode) {
  try {
    window.localStorage.setItem(TEMA_STORAGE_KEY, mode);
  } catch {
    // Sin persistencia, pero el tema igual vale para esta sesion.
  }

  aplicarTema(mode);
  invalidar();
}

/**
 * El mismo `aplicarTema`, pero como string para inyectar en el `<head>`.
 *
 * Corre sincronico antes de que se pinte el body, asi que no puede fallar: todo
 * va dentro de un try/catch y si algo se rompe el sitio se queda en claro.
 */
export const SCRIPT_TEMA = `(function(){try{
var k="${TEMA_STORAGE_KEY}";
var m=localStorage.getItem(k);
if(m!=="light"&&m!=="dark"&&m!=="system"){m="system"}
var d=m==="dark"||(m==="system"&&matchMedia("${CONSULTA_OSCURO}").matches);
var t=d?"dark":"light";
var e=document.documentElement;
e.setAttribute("data-theme",t);
e.setAttribute("data-theme-mode",m);
e.style.colorScheme=t;
var c=document.querySelector('meta[name="theme-color"]');
if(!c){c=document.createElement("meta");c.setAttribute("name","theme-color");document.head.appendChild(c)}
c.setAttribute("content",d?"${COLOR_BARRA.dark}":"${COLOR_BARRA.light}");
}catch(_){}})();`;
