/**
 * Chequeo de invariantes de la logica de turnos.
 *
 * Ejecutar con: npm run check:turnos
 *
 * No hay framework de tests en el repo. Se cubre la parte pura, que es donde
 * estan los casos molestos: precedencia de horarios, franjas que no dividen la
 * jornada, y la recurrencia mensual en meses cortos.
 */

import { haySolapamiento, minutesToTime } from "../lib/horarios";
import {
  DURACION_TURNO_DEFAULT,
  entraEnHorario,
  fechaDesdeKey,
  fechaKey,
  fechaKeyDB,
  fechaLocalDesdeDB,
  fechaParaDB,
  generarFranjas,
  resolverHorario,
  sumarDias,
  type HorarioExcepcion,
  type HorarioSemanal,
} from "../lib/turnos-horario";
import { ocurrenciasEnVentana } from "../lib/turnos-recurrencia";

let fallos = 0;
const fallar = (...args: unknown[]) => {
  fallos += 1;
  console.error("  FALLO:", ...args);
};
const igual = (actual: unknown, esperado: unknown, mensaje: string) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(esperado);
  if (a !== e) fallar(`${mensaje}: fue ${a}, esperaba ${e}`);
};

// ---------------------------------------------------------------------------
// Horario de atencion
// ---------------------------------------------------------------------------
console.log("Horario de atencion");

const semanal: HorarioSemanal[] = [
  // sabado 8:00 a 24:00
  { diaSemana: 6, aperturaMin: 480, cierreMin: 1440, cerrado: false },
  // lunes cerrado
  { diaSemana: 1, aperturaMin: 540, cierreMin: 1380, cerrado: true },
];
const excepciones: HorarioExcepcion[] = [
  {
    fecha: "2026-12-25",
    aperturaMin: 0,
    cierreMin: 0,
    cerrado: true,
    motivo: "Navidad",
  },
  // un sabado puntual con horario recortado: la excepcion tiene que ganarle al semanal
  {
    fecha: "2026-08-22",
    aperturaMin: 600,
    cierreMin: 900,
    cerrado: false,
    motivo: "Torneo privado",
  },
];

{
  // Miercoles sin fila: default 9-23.
  const miercoles = resolverHorario(
    fechaDesdeKey("2026-08-19"),
    semanal,
    excepciones,
  );
  igual(
    [miercoles.origen, miercoles.aperturaMin, miercoles.cierreMin, miercoles.cerrado],
    ["DEFAULT", 540, 1380, false],
    "miercoles cae al default",
  );

  // Sabado normal: manda el semanal.
  const sabado = resolverHorario(
    fechaDesdeKey("2026-08-29"),
    semanal,
    excepciones,
  );
  igual(
    [sabado.origen, sabado.aperturaMin, sabado.cierreMin],
    ["SEMANAL", 480, 1440],
    "sabado usa el horario semanal",
  );

  // Sabado con excepcion: la excepcion le gana al semanal.
  const sabadoExcepcion = resolverHorario(
    fechaDesdeKey("2026-08-22"),
    semanal,
    excepciones,
  );
  igual(
    [sabadoExcepcion.origen, sabadoExcepcion.aperturaMin, sabadoExcepcion.cierreMin],
    ["EXCEPCION", 600, 900],
    "la excepcion le gana al dia de semana",
  );
  if (fechaDesdeKey("2026-08-22").getDay() !== 6) {
    fallar("2026-08-22 deberia ser sabado; se eligio mal la fecha del caso");
  }

  // Lunes marcado cerrado.
  const lunes = resolverHorario(fechaDesdeKey("2026-08-24"), semanal, excepciones);
  if (!lunes.cerrado) fallar("el lunes deberia venir cerrado");
  igual(generarFranjas(lunes, 90), [], "un dia cerrado no genera franjas");

  // Excepcion de cierre.
  const navidad = resolverHorario(
    fechaDesdeKey("2026-12-25"),
    semanal,
    excepciones,
  );
  if (!navidad.cerrado || navidad.motivo !== "Navidad") {
    fallar("la excepcion de cierre no se resolvio bien");
  }
}

// ---------------------------------------------------------------------------
// Franjas
// ---------------------------------------------------------------------------
console.log("Franjas");

{
  const dia = resolverHorario(fechaDesdeKey("2026-08-19"), [], []);

  // 9:00-23:00 son 840 min: 9 turnos de 90 y sobran 30 que no se ofrecen.
  const de90 = generarFranjas(dia, DURACION_TURNO_DEFAULT);
  igual(de90.length, 9, "cantidad de franjas de 90 min entre 9 y 23");
  igual(de90[0].inicio, "09:00", "primera franja");
  igual(de90[de90.length - 1].fin, "22:30", "ultima franja de 90 min");
  for (const franja of de90) {
    if (franja.finMin > dia.cierreMin) {
      fallar("hay una franja que termina despues del cierre", franja.fin);
    }
  }

  // Una duracion que no divide la ventana no puede desbordar el cierre.
  for (const duracion of [45, 50, 60, 75, 100, 120, 130]) {
    const franjas = generarFranjas(dia, duracion);
    const ultima = franjas[franjas.length - 1];
    if (ultima && ultima.finMin > dia.cierreMin) {
      fallar(`duracion ${duracion} desborda el cierre`, ultima.fin);
    }
    if (franjas.some((f) => f.inicioMin < dia.aperturaMin)) {
      fallar(`duracion ${duracion} genera una franja antes de la apertura`);
    }
    // Sin huecos ni superposiciones entre franjas consecutivas.
    for (let i = 1; i < franjas.length; i += 1) {
      if (franjas[i].inicioMin !== franjas[i - 1].finMin) {
        fallar(`duracion ${duracion}: franjas no contiguas en ${franjas[i].inicio}`);
      }
    }
  }

  // Duraciones invalidas no explotan.
  igual(generarFranjas(dia, 0), [], "duracion 0 no genera franjas");
  igual(generarFranjas(dia, -30), [], "duracion negativa no genera franjas");
  igual(
    generarFranjas(dia, 2000),
    [],
    "una duracion mayor que la jornada no genera franjas",
  );

  // entraEnHorario respeta los dos bordes.
  if (!entraEnHorario(dia, 540, 90)) fallar("9:00 + 90 deberia entrar");
  if (!entraEnHorario(dia, 1290, 90)) fallar("21:30 + 90 = 23:00 deberia entrar");
  if (entraEnHorario(dia, 1291, 90)) fallar("21:31 + 90 pasa el cierre");
  if (entraEnHorario(dia, 480, 90)) fallar("8:00 es antes de la apertura");
}

// ---------------------------------------------------------------------------
// Solapamiento
// ---------------------------------------------------------------------------
console.log("Solapamiento");

{
  // Tocarse en el borde no es solapar.
  if (haySolapamiento(540, 630, 630, 720)) {
    fallar("fin == inicio no deberia contar como solape");
  }
  if (haySolapamiento(630, 720, 540, 630)) {
    fallar("fin == inicio no deberia contar como solape (al reves)");
  }
  if (!haySolapamiento(540, 630, 600, 690)) fallar("solape parcial no detectado");
  if (!haySolapamiento(540, 720, 600, 630)) fallar("contenido no detectado");
  if (!haySolapamiento(600, 630, 540, 720)) fallar("contenedor no detectado");
  if (!haySolapamiento(540, 630, 540, 630)) fallar("identicos no detectados");
  if (haySolapamiento(540, 630, 700, 800)) fallar("disjuntos marcados como solape");
}

// ---------------------------------------------------------------------------
// Recurrencia
// ---------------------------------------------------------------------------
console.log("Recurrencia");

const claves = (fechas: Date[]) => fechas.map(fechaKey);

{
  // Diaria.
  const diaria = ocurrenciasEnVentana(
    { frecuencia: "DIARIA", desde: fechaDesdeKey("2026-08-20"), hasta: null },
    fechaDesdeKey("2026-08-20"),
    fechaDesdeKey("2026-08-24"),
  );
  igual(
    claves(diaria),
    ["2026-08-20", "2026-08-21", "2026-08-22", "2026-08-23", "2026-08-24"],
    "diaria",
  );

  // Semanal cruzando fin de mes.
  const semanalOcc = ocurrenciasEnVentana(
    { frecuencia: "SEMANAL", desde: fechaDesdeKey("2026-08-27"), hasta: null },
    fechaDesdeKey("2026-08-27"),
    fechaDesdeKey("2026-09-25"),
  );
  igual(
    claves(semanalOcc),
    ["2026-08-27", "2026-09-03", "2026-09-10", "2026-09-17", "2026-09-24"],
    "semanal cruzando el cambio de mes",
  );
  // Siempre el mismo dia de la semana.
  const dias = new Set(semanalOcc.map((f) => f.getDay()));
  igual([...dias], [fechaDesdeKey("2026-08-27").getDay()], "semanal mantiene el dia");

  // Semanal cruzando fin de anio.
  const finDeAnio = ocurrenciasEnVentana(
    { frecuencia: "SEMANAL", desde: fechaDesdeKey("2026-12-24"), hasta: null },
    fechaDesdeKey("2026-12-24"),
    fechaDesdeKey("2027-01-15"),
  );
  igual(
    claves(finDeAnio),
    ["2026-12-24", "2026-12-31", "2027-01-07", "2027-01-14"],
    "semanal cruzando el cambio de anio",
  );

  // Mensual el 31: saltea los meses que no lo tienen, no se corre al 1.
  const mensual31 = ocurrenciasEnVentana(
    { frecuencia: "MENSUAL", desde: fechaDesdeKey("2026-01-31"), hasta: null },
    fechaDesdeKey("2026-01-01"),
    fechaDesdeKey("2026-12-31"),
  );
  igual(
    claves(mensual31),
    [
      "2026-01-31",
      "2026-03-31",
      "2026-05-31",
      "2026-07-31",
      "2026-08-31",
      "2026-10-31",
      "2026-12-31",
    ],
    "mensual el 31 saltea los meses cortos",
  );
  for (const fecha of mensual31) {
    if (fecha.getDate() !== 31) fallar("una ocurrencia mensual se corrio de dia");
  }

  // Mensual el 29: existe en febrero solo en anio bisiesto. 2028 lo es.
  const mensual29 = ocurrenciasEnVentana(
    { frecuencia: "MENSUAL", desde: fechaDesdeKey("2027-01-29"), hasta: null },
    fechaDesdeKey("2027-01-01"),
    fechaDesdeKey("2028-03-31"),
  );
  const keys29 = claves(mensual29);
  if (keys29.includes("2027-02-29")) fallar("2027 no es bisiesto");
  if (!keys29.includes("2028-02-29")) fallar("2028 es bisiesto y falta el 29/2");

  // Mensual normal.
  const mensual15 = ocurrenciasEnVentana(
    { frecuencia: "MENSUAL", desde: fechaDesdeKey("2026-08-15"), hasta: null },
    fechaDesdeKey("2026-08-01"),
    fechaDesdeKey("2026-11-30"),
  );
  igual(
    claves(mensual15),
    ["2026-08-15", "2026-09-15", "2026-10-15", "2026-11-15"],
    "mensual el 15",
  );

  // La ventana recorta por los dos lados y no devuelve nada antes del inicio.
  const recortada = ocurrenciasEnVentana(
    { frecuencia: "SEMANAL", desde: fechaDesdeKey("2026-08-20"), hasta: null },
    fechaDesdeKey("2026-09-01"),
    fechaDesdeKey("2026-09-30"),
  );
  igual(
    claves(recortada),
    ["2026-09-03", "2026-09-10", "2026-09-17", "2026-09-24"],
    "la ventana recorta las ocurrencias previas",
  );
  if (recortada.some((f) => f < fechaDesdeKey("2026-08-20"))) {
    fallar("hay ocurrencias antes del inicio de la serie");
  }

  // Serie cortada: `hasta` manda aunque la ventana siga.
  const cortada = ocurrenciasEnVentana(
    {
      frecuencia: "SEMANAL",
      desde: fechaDesdeKey("2026-08-20"),
      hasta: fechaDesdeKey("2026-09-03"),
    },
    fechaDesdeKey("2026-08-01"),
    fechaDesdeKey("2026-12-31"),
  );
  igual(
    claves(cortada),
    ["2026-08-20", "2026-08-27", "2026-09-03"],
    "una serie cortada no pasa de su fecha de corte",
  );

  // Ventana invertida o anterior a la serie: vacio, sin colgarse.
  igual(
    claves(
      ocurrenciasEnVentana(
        { frecuencia: "DIARIA", desde: fechaDesdeKey("2026-08-20"), hasta: null },
        fechaDesdeKey("2026-09-10"),
        fechaDesdeKey("2026-09-01"),
      ),
    ),
    [],
    "ventana invertida",
  );
  igual(
    claves(
      ocurrenciasEnVentana(
        { frecuencia: "DIARIA", desde: fechaDesdeKey("2026-08-20"), hasta: null },
        fechaDesdeKey("2026-01-01"),
        fechaDesdeKey("2026-01-31"),
      ),
    ),
    [],
    "ventana previa al inicio de la serie",
  );

  // Ventana de 90 dias, la que usa el cron: cantidad razonable y sin duplicados.
  const hoy = fechaDesdeKey("2026-08-20");
  for (const frecuencia of ["DIARIA", "SEMANAL", "MENSUAL"] as const) {
    const occ = ocurrenciasEnVentana(
      { frecuencia, desde: hoy, hasta: null },
      hoy,
      sumarDias(hoy, 90),
    );
    if (new Set(claves(occ)).size !== occ.length) {
      fallar(`${frecuencia}: ocurrencias duplicadas en la ventana del cron`);
    }
    const esperado = frecuencia === "DIARIA" ? 91 : frecuencia === "SEMANAL" ? 13 : 3;
    igual(occ.length, esperado, `${frecuencia} en 90 dias`);
  }
}

// ---------------------------------------------------------------------------
// Ida y vuelta de fechas y horas
// ---------------------------------------------------------------------------
console.log("Fechas y horas");

{
  for (const key of ["2026-01-01", "2026-08-20", "2026-12-31", "2028-02-29"]) {
    if (fechaKey(fechaDesdeKey(key)) !== key) {
      fallar("fechaKey/fechaDesdeKey no dan la vuelta", key);
    }
  }
  // El caso que rompe con toISOString(): medianoche local en UTC-3 es el dia
  // anterior en UTC.
  const medianoche = new Date(2026, 7, 20, 0, 0, 0, 0);
  igual(fechaKey(medianoche), "2026-08-20", "fechaKey a medianoche local");

  // Ida y vuelta por una columna @db.Date. Es el bug que se comio un dia: una
  // fecha guardada a medianoche local vuelve como medianoche UTC, y leerla como
  // fecha local la corre al dia anterior en cualquier offset negativo.
  for (const key of ["2026-01-01", "2026-09-19", "2026-12-31", "2028-02-29"]) {
    const enDB = fechaParaDB(key);
    if (fechaKeyDB(enDB) !== key) {
      fallar("fechaParaDB/fechaKeyDB no dan la vuelta", key);
    }
    if (fechaKey(fechaLocalDesdeDB(enDB)) !== key) {
      fallar("fechaLocalDesdeDB corre el dia", key, fechaKey(fechaLocalDesdeDB(enDB)));
    }
  }

  for (const min of [0, 540, 630, 1380, 1439]) {
    const texto = minutesToTime(min);
    if (!/^\d{2}:\d{2}$/.test(texto)) fallar("minutesToTime mal formateado", texto);
  }
  igual(minutesToTime(540), "09:00", "540 -> 09:00");
  igual(minutesToTime(1380), "23:00", "1380 -> 23:00");
}

if (fallos > 0) {
  console.error(`\n${fallos} fallo(s)`);
  process.exit(1);
}
console.log("\nOK: todas las invariantes de turnos pasan");
