"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Bucket } from "@/lib/dashboard-calculos";
import { colorDeSerie, usePaletaGraficos } from "../paleta";

type GraficoBarrasProps = {
  datos: Bucket[];
  /**
   * Un color para todas. Por defecto el verde de la paleta; se pasa explicito
   * solo para salirse de ella.
   */
  color?: string;
  /** Uno distinto por barra, tomado de la serie. */
  multicolor?: boolean;
  alto?: number;
};

/**
 * Barras verticales. Se usa para genero, categoria y estado de los eventos.
 *
 * Recharts corre en el cliente, asi que este componente es la frontera: las
 * paginas son server components y solo bajan el array ya calculado.
 */
export default function GraficoBarras({
  datos,
  color,
  multicolor = false,
  alto = 240,
}: GraficoBarrasProps) {
  const paleta = usePaletaGraficos();

  return (
    <ResponsiveContainer width="100%" height={alto}>
      <BarChart
        data={datos}
        margin={{ top: 8, right: 8, bottom: 4, left: -20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={`${paleta.texto}18`} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: paleta.texto }}
          interval={0}
          angle={datos.length > 5 ? -30 : 0}
          textAnchor={datos.length > 5 ? "end" : "middle"}
          height={datos.length > 5 ? 60 : 30}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: paleta.texto }}
        />
        <Tooltip
          cursor={{ fill: `${paleta.texto}0d` }}
          contentStyle={{
            borderRadius: 12,
            border: `1px solid ${paleta.texto}22`,
            background: paleta.superficie,
            color: paleta.texto,
            fontSize: 12,
          }}
        />
        <Bar
          dataKey="value"
          name="Cantidad"
          radius={[6, 6, 0, 0]}
          fill={color ?? paleta.padelGreen}
        >
          {multicolor
            ? datos.map((dato, indice) => (
                <Cell key={dato.label} fill={colorDeSerie(paleta, indice)} />
              ))
            : null}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
