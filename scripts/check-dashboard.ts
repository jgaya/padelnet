/**
 * Verifica las cuentas del dashboard.
 *
 * Los casos que se prueban son los que no se ven leyendo el codigo y sin
 * embargo llegan a la pantalla: dividir por cero cuando un torneo no tiene
 * capacidad cargada, contar como distintas dos personas que son la misma
 * escrita con mayusculas diferentes, y los empates en el top N, que sin un
 * desempate estable hacen que el grafico cambie de orden entre recargas.
 *
 *   npm run check:dashboard
 */

import {
  agruparDuplicados,
  contarEventosPorEstado,
  contarPor,
  estadoEvento,
  ocupacion,
  porcentaje,
  topN,
  SIN_DATO,
  tieneDatoReal,
  type UsuarioParaDuplicados,
} from "@/lib/dashboard-calculos";

let fallas = 0;

function comprobar(nombre: string, condicion: boolean, detalle?: unknown) {
  if (condicion) {
    console.log(`  ok  ${nombre}`);
    return;
  }
  console.error(`  FALLA  ${nombre}`);
  if (detalle !== undefined) console.error("        ", JSON.stringify(detalle));
  fallas += 1;
}

console.log("porcentaje");
comprobar("mitad", porcentaje(5, 10) === 50);
comprobar("total 0 no da NaN", porcentaje(3, 0) === 0);
comprobar("total negativo no rompe", porcentaje(3, -1) === 0);
comprobar("redondea", porcentaje(1, 3) === 33);

console.log("\nocupacion");
comprobar("media", ocupacion(12, 24) === 0.5);
comprobar("capacidad 0 no divide por cero", ocupacion(5, 0) === 0);
comprobar("sobrecupo pasa de 1", ocupacion(30, 24) > 1);
comprobar("sin inscriptos", ocupacion(0, 24) === 0);

console.log("\ntopN");
{
  const empatados = [
    { label: "Zarate", value: 5 },
    { label: "Avellaneda", value: 5 },
    { label: "Lanus", value: 9 },
  ];
  const r = topN(empatados, 2);
  comprobar("el mayor primero", r[0].label === "Lanus", r);
  // Con el mismo valor el orden lo define el nombre, si no cambia entre
  // recargas y el grafico "salta" sin que haya cambiado ningun dato.
  comprobar("empate se desempata alfabetico", r[1].label === "Avellaneda", r);
  comprobar("corta en n", r.length === 2);
  comprobar("n mayor que el largo no rompe", topN(empatados, 99).length === 3);
  comprobar("lista vacia", topN([], 5).length === 0);
  const original = [...empatados];
  topN(empatados, 1);
  comprobar(
    "no muta la entrada",
    JSON.stringify(empatados) === JSON.stringify(original),
  );
}

console.log("\ncontarPor");
{
  const r = contarPor(
    [{ c: "6ta" }, { c: "6ta" }, { c: null }, { c: "  " }, { c: " 7ma " }],
    (x) => x.c,
  );
  const mapa = Object.fromEntries(r.map((b) => [b.label, b.value]));
  comprobar("agrupa iguales", mapa["6ta"] === 2, mapa);
  comprobar("recorta espacios", mapa["7ma"] === 1, mapa);
  // null y "   " son lo mismo: dato sin cargar.
  comprobar("null y vacio caen en la misma bolsa", mapa[SIN_DATO] === 2, mapa);
}

console.log("\ntieneDatoReal");
// El caso que motiva la funcion: nadie cargo el campo todavia, asi que el
// unico bucket es "Sin especificar" y hay que mostrar el vacio, no una barra.
comprobar(
  "solo Sin especificar cuenta como vacio",
  !tieneDatoReal([{ label: SIN_DATO, value: 68 }]),
);
comprobar(
  "con una localidad real ya no esta vacio",
  tieneDatoReal([
    { label: SIN_DATO, value: 60 },
    { label: "Zarate", value: 1 },
  ]),
);
comprobar("lista vacia esta vacia", !tieneDatoReal([]));
comprobar(
  "un bucket real en cero no alcanza",
  !tieneDatoReal([{ label: "Zarate", value: 0 }]),
);

console.log("\nagruparDuplicados");
{
  const usuario = (
    id: number,
    name: string,
    lastname: string,
  ): UsuarioParaDuplicados => ({
    id,
    name,
    lastname,
    email: `u${id}@x.com`,
    emailVerified: false,
  });

  const grupos = agruparDuplicados([
    usuario(1, "Juan", "Perez"),
    usuario(2, "  juan  ", "PEREZ"),
    usuario(3, "Juan", "Gomez"),
    usuario(4, "Ana", "Lopez"),
    usuario(5, "Ana", "Lopez"),
    usuario(6, "Ana", "Lopez"),
  ]);

  comprobar("solo devuelve los repetidos", grupos.length === 2, grupos);
  comprobar("el grupo mas grande primero", grupos[0].usuarios.length === 3);
  comprobar(
    "junta pese a mayusculas y espacios",
    grupos[1].usuarios.map((u) => u.id).join(",") === "1,2",
    grupos[1],
  );
  comprobar(
    "no agrupa apellidos distintos",
    !grupos.some((g) => g.usuarios.some((u) => u.id === 3)),
  );

  // Espacio interno doble: "Juan  Carlos" y "Juan Carlos" son la misma persona.
  const internos = agruparDuplicados([
    usuario(7, "Juan  Carlos", "Diaz"),
    usuario(8, "Juan Carlos", "Diaz"),
  ]);
  comprobar("colapsa espacios internos", internos.length === 1, internos);

  comprobar(
    "sin duplicados devuelve vacio",
    agruparDuplicados([usuario(9, "Sol", "Ruiz")]).length === 0,
  );
}

console.log("\nestado de eventos");
comprobar(
  "finalizado gana sobre abierto",
  estadoEvento({ isOpen: true, isFinished: true }) === "finalizados",
);
comprobar(
  "abierto",
  estadoEvento({ isOpen: true, isFinished: false }) === "abiertos",
);
comprobar(
  "cerrado",
  estadoEvento({ isOpen: false, isFinished: false }) === "cerrados",
);
{
  const r = contarEventosPorEstado([
    { isOpen: true, isFinished: false },
    { isOpen: false, isFinished: false },
    { isOpen: true, isFinished: true },
  ]);
  comprobar("cuenta las tres categorias", r.length === 3, r);
  comprobar(
    "una de cada una",
    r.every((b) => b.value === 1),
    r,
  );
  // Sin eventos igual devuelve las tres barras en cero, para que el grafico no
  // cambie de forma segun el dia.
  comprobar(
    "sin eventos devuelve las tres en cero",
    contarEventosPorEstado([]).every((b) => b.value === 0),
  );
}

console.log(
  fallas === 0 ? "\ncheck:dashboard OK" : `\ncheck:dashboard FALLO - ${fallas}`,
);
process.exitCode = fallas === 0 ? 0 : 1;
