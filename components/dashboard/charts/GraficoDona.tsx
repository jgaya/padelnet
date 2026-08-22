"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { Bucket } from "@/lib/dashboard-calculos";
import { colorDeSerie, DEEP_BLACK } from "../paleta";

type GraficoDonaProps = {
  datos: Bucket[];
  alto?: number;
};

/**
 * Dona con leyenda propia al costado.
 *
 * La leyenda va aparte y no con `<Legend />` de Recharts porque asi se puede
 * mostrar el numero y el porcentaje de cada porcion, que es lo que se mira, y
 * porque en pantallas chicas se apila debajo en vez de comerse el grafico.
 */
export default function GraficoDona({ datos, alto = 220 }: GraficoDonaProps) {
  const total = datos.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="w-full sm:w-1/2">
        <ResponsiveContainer width="100%" height={alto}>
          <PieChart>
            <Pie
              data={datos}
              dataKey="value"
              nameKey="label"
              innerRadius="55%"
              outerRadius="85%"
              paddingAngle={2}
              stroke="none"
            >
              {datos.map((dato, indice) => (
                <Cell key={dato.label} fill={colorDeSerie(indice)} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: `1px solid ${DEEP_BLACK}22`,
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="w-full space-y-1.5 sm:w-1/2">
        {datos.map((dato, indice) => (
          <li key={dato.label} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: colorDeSerie(indice) }}
            />
            <span className="truncate text-deep-black/80">{dato.label}</span>
            <span className="ml-auto shrink-0 font-semibold text-deep-black">
              {dato.value}
            </span>
            <span className="w-10 shrink-0 text-right text-xs text-deep-black/60">
              {total > 0 ? Math.round((dato.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
