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
import { colorDeSerie, DEEP_BLACK, PADEL_GREEN } from "../paleta";

type GraficoBarrasProps = {
  datos: Bucket[];
  /** Un color para todas, o uno distinto por barra tomado de la serie. */
  color?: string;
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
  color = PADEL_GREEN,
  multicolor = false,
  alto = 240,
}: GraficoBarrasProps) {
  return (
    <ResponsiveContainer width="100%" height={alto}>
      <BarChart
        data={datos}
        margin={{ top: 8, right: 8, bottom: 4, left: -20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={`${DEEP_BLACK}18`} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: DEEP_BLACK }}
          interval={0}
          angle={datos.length > 5 ? -30 : 0}
          textAnchor={datos.length > 5 ? "end" : "middle"}
          height={datos.length > 5 ? 60 : 30}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: DEEP_BLACK }}
        />
        <Tooltip
          cursor={{ fill: `${DEEP_BLACK}0d` }}
          contentStyle={{
            borderRadius: 12,
            border: `1px solid ${DEEP_BLACK}22`,
            fontSize: 12,
          }}
        />
        <Bar dataKey="value" name="Cantidad" radius={[6, 6, 0, 0]} fill={color}>
          {multicolor
            ? datos.map((dato, indice) => (
                <Cell key={dato.label} fill={colorDeSerie(indice)} />
              ))
            : null}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
