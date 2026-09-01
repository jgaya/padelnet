# Prompts de Nano Banana para las medallas

Para generar los 18 SVG/PNG de `public/badges/`, que consume
`components/logros/MedallaLogro.tsx`.

---

## 1. La restriccion que define todo

**Nano Banana no genera fondo transparente.** Los modelos de imagen de Gemini
(2.5 Flash Image, Nano Banana Pro, Nano Banana 2) escriben pixeles RGB planos,
sin canal alfa. Pedirle "transparent background" es contraproducente: devuelve
un **damero pintado**, que son pixeles opacos con dibujo de cuadraditos.

Asi que el badge no puede ser una figura recortada flotando. La salida
recomendada es otra:

> **Un disco circular lleno que ocupa todo el cuadro, de borde a borde.**

Con eso el fondo deja de existir como problema: el badge trae su propio fondo,
y las cuatro esquinas sobrantes las recorta el CSS con `rounded-full`. Sin
matting, sin quitar fondos, sin canal alfa.

Y ademas resuelve el modo claro/oscuro de raiz: **la medalla nunca depende del
fondo de la pagina** porque tiene el suyo. Un icono de linea fina se perderia
sobre `#ffffff` o sobre `#16201f` segun como este dibujado; un disco solido se
ve igual en los dos.

### Cambio de una linea en el componente

Hoy la imagen se pinta a 40px dentro de un circulo de 64px. Para el disco a
sangre, en `components/logros/MedallaLogro.tsx`:

```diff
-  className={`h-10 w-10 ${obtenido ? "" : "opacity-40"}`}
+  className={`h-full w-full rounded-full object-cover ${obtenido ? "" : "opacity-40"}`}
```

El `ring-2` con el color de la rareza que ya dibuja el componente queda como
aro exterior de la medalla. Se complementan.

---

## 2. Paleta por rareza

Los colores salen de los tokens de `app/globals.css`, con una condicion extra:
**cada relleno tiene que contrastar contra los dos fondos del sitio**,
`#ffffff` (claro) y `#16201f` (oscuro). Por eso el comun no usa `--content`
(`#1c2526`), que en modo oscuro casi desaparece: va un gris medio.

| Rareza | Relleno del disco | Aro exterior | Simbolo | De donde sale |
|---|---|---|---|---|
| COMUN | `#8B9698` | `#5F6B6D` | `#F5F7F7` | gris medio, neutral en ambos temas |
| POCO_COMUN | `#00C853` | `#00963E` | `#F5F7F7` | `--padel-green` |
| RARO | `#3B82F6` | `#1D4ED8` | `#F5F7F7` | medio entre el `--info` claro y el oscuro |
| EPICO | `#7C4DFF` | `#5B2EDB` | `#F5F7F7` | violeta |
| LEGENDARIO | `#FF4F00` | `#C43C00` | `#1C2526` | `--energy-orange` |

**El simbolo siempre en el mismo tono** (`#F5F7F7`, salvo el legendario que
lleva tinta oscura porque el naranja es muy claro): es lo que hace que los 18
se lean como una familia y no como 18 dibujos sueltos.

> Nota: en el codigo el epico hoy comparte el aro azul del raro
> (`ring-info/70`), porque no hay violeta en la paleta. Si adoptas el violeta
> de esta tabla, conviene sumar el token para que el aro acompañe. Es un
> cambio aparte, avisame.

---

## 3. Sin numeros

Varios logros son numericos (10 partidos, 50 victorias, Top 10, set 6-0). **No
los pidas como digitos.** Dos razones:

1. Los modelos de imagen deforman texto y numeros, y a 64px un "50" mal
   dibujado es una mancha.
2. No hacen falta: debajo de cada medalla ya va el titulo, y el `title` del
   componente muestra la descripcion completa.

Los pares se distinguen por **cantidad de elementos y color de rareza**, que es
algo que el modelo si maneja: una raqueta / tres raquetas, un galon / tres
galones, un chevron / dos / tres.

---

## 4. Bloque base

Va al principio de cada prompt. Es lo que mantiene los 18 consistentes.

```
Flat vector badge icon for a padel sports app.
A circular medal that FILLS THE ENTIRE SQUARE FRAME, edge to edge,
with no margin and no background around it.
Solid fill color {RELLENO}, with a thick concentric outer rim in {ARO}.
Centered symbol drawn in flat solid {SIMBOLO}, bold geometric shapes,
thick strokes, high contrast, no gradients, no shadows, no 3D, no bevel.
Minimal and legible when scaled down to 64 pixels.
No text, no letters, no numbers, no watermark, no signature.
Square 1:1 composition, 1024x1024.
Symbol: {SIMBOLO_CONCRETO}
```

Reemplazas `{RELLENO}`, `{ARO}` y `{SIMBOLO}` con la fila de la tabla de la
rareza, y `{SIMBOLO_CONCRETO}` con el de cada logro.

**No escribas "transparent background"** en ningun lado: es lo que dispara el
damero.

---

## 5. Los 18 logros

### Iniciacion — COMUN
Relleno `#8B9698`, aro `#5F6B6D`, simbolo `#F5F7F7`.

| Codigo | `{SIMBOLO_CONCRETO}` |
|---|---|
| `PRIMER_PARTIDO` | a single padel racket seen from the front, centered vertically |
| `PRIMERA_VICTORIA` | a padel ball with two small wings on its sides |
| `PRIMER_SET` | a padel ball crossing over a low net line |

### Acumulativos de partidos

| Codigo | Rareza | `{SIMBOLO_CONCRETO}` |
|---|---|---|
| `PARTIDOS_10` | POCO_COMUN | three padel rackets arranged in a fan, overlapping |
| `PARTIDOS_50` | RARO | five padel rackets arranged in a radial fan, like a crown |

### Acumulativos de victorias

| Codigo | Rareza | `{SIMBOLO_CONCRETO}` |
|---|---|---|
| `VICTORIAS_10` | POCO_COMUN | a single chevron stripe above a padel ball |
| `VICTORIAS_50` | EPICO | three stacked chevron stripes above a padel ball |

### Sets

| Codigo | Rareza | `{SIMBOLO_CONCRETO}` |
|---|---|---|
| `SET_PERFECTO` | POCO_COMUN | a padel ball centered inside a thick empty ring, like a zero |

### Progreso en el torneo

Todos con el mismo lenguaje visual: **un cuadro de eliminacion que se va
achicando**. Asi se leen como una serie.

| Codigo | Rareza | `{SIMBOLO_CONCRETO}` |
|---|---|---|
| `DIECISEISAVOS` | COMUN | a tournament bracket diagram with four small branches merging |
| `OCTAVOS` | COMUN | a tournament bracket diagram with three branches merging |
| `CUARTOS` | POCO_COMUN | a tournament bracket diagram with two branches merging into one |
| `SEMIFINAL` | RARO | two tournament bracket branches merging into a single line, with a star at the tip |
| `FINALISTA` | EPICO | a laurel wreath open at the top, framing a padel ball |
| `CAMPEON` | LEGENDARIO | a trophy cup with two crossed padel rackets behind it |

### Ranking

Serie por cantidad de chevrones ascendentes.

| Codigo | Rareza | `{SIMBOLO_CONCRETO}` |
|---|---|---|
| `TOP_50` | POCO_COMUN | one upward chevron arrow above a horizontal baseline |
| `TOP_20` | RARO | two stacked upward chevron arrows above a horizontal baseline |
| `TOP_10` | EPICO | three stacked upward chevron arrows above a horizontal baseline, with a small star on top |

### Especiales

| Codigo | Rareza | `{SIMBOLO_CONCRETO}` |
|---|---|---|
| `CAMPEON_INVICTO` | LEGENDARIO | a heraldic shield with a crown above it and a padel racket inside |

---

## 6. Ejemplo armado

`CAMPEON`, legendario, listo para pegar:

```
Flat vector badge icon for a padel sports app.
A circular medal that FILLS THE ENTIRE SQUARE FRAME, edge to edge,
with no margin and no background around it.
Solid fill color #FF4F00, with a thick concentric outer rim in #C43C00.
Centered symbol drawn in flat solid #1C2526, bold geometric shapes,
thick strokes, high contrast, no gradients, no shadows, no 3D, no bevel.
Minimal and legible when scaled down to 64 pixels.
No text, no letters, no numbers, no watermark, no signature.
Square 1:1 composition, 1024x1024.
Symbol: a trophy cup with two crossed padel rackets behind it
```

`PRIMER_PARTIDO`, comun, listo para pegar:

COMUN
Relleno #8B9698, aro #5F6B6D, simbolo #F5F7F7.

```
Flat vector badge icon for a padel sports app.
A circular medal that FILLS THE ENTIRE SQUARE FRAME, edge to edge,
with no margin and no background around it.
Solid fill color #8B9698, with a thick concentric outer rim in #5F6B6D.
Centered symbol drawn in flat solid #F5F7F7, bold geometric shapes,
thick strokes, high contrast, no gradients, no shadows, no 3D, no bevel.
Minimal and legible when scaled down to 64 pixels.
No text, no letters, no numbers, no watermark, no signature.
Square 1:1 composition, 1024x1024.
Symbol: a single padel racket seen from the front, centered vertically
```

---

## 7. Despues de generar

1. **Salen a 1024px PNG** (es el tope del modelo). Bajalos a **256×256**: se
   muestran a 64px, y 256 cubre pantallas al cuadruple de densidad. Con el
   pipeline que ya usa el proyecto para las fotos de perfil, JPEG no sirve acá
   —conviene PNG por los bordes duros del vector— pero a 256px pesa poco.
2. **Nombralos por codigo en minuscula**: `public/badges/campeon.svg` →
   `campeon.png`, y cargalos en el campo *Icono* del CRUD como
   `/badges/campeon.png`.
3. **Verificalos en los dos temas.** Abri `/perfil` y toca el selector de tema.
   Si alguno se pierde, casi siempre es que el relleno del disco quedo muy
   cerca de `#ffffff` o de `#16201f`: subile el contraste al relleno, no al
   simbolo.
4. **Todas llevan marca de agua SynthID** invisible que las identifica como
   generadas por IA. No afecta como se ven, pero conviene saberlo.

### Si igual queres alfa de verdad

Si en algun momento preferis medallas recortadas en vez de discos, el camino es
**matting por diferencia**: generar la misma imagen dos veces, una sobre
`pure white background` y otra sobre `pure solid black background`, y derivar el
alfa comparando las dos. Funciona porque el modelo reproduce el sujeto igual
entre corridas. Es bastante mas trabajo por badge y no hace falta para lo que
necesitamos.

---

## 8. Referencias

- [Nano Banana y el fondo transparente](https://transparify.app/blog/gemini-transparent-background)
- [Gemini 2.5 Flash Image — docs](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-image)
- Los prompts originales del organizador, en el comentario del final de
  `~/organizador/src/app/actions/logros.ts`. Los de aca cambian el enfoque
  (disco a sangre en vez de icono transparente) justamente por la limitacion
  del punto 1.
