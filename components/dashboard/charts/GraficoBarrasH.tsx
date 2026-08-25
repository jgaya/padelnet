"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Bucket } from "@/lib/dashboard-calculos";
import { usePaletaGraficos } from "../paleta";

type GraficoBarrasHProps = {
  datos: Bucket[];
  color?: string;
};

/**
 * Barras horizontales, para listas con etiquetas largas: las localidades no
 * entran de costado en el eje X sin quedar ilegibles.
 *
 * El alto se calcula con la cantidad de filas en vez de ser fijo, asi doce
 * localidades no quedan apretadas ni tres sobran de espacio.
 */
export default function GraficoBarrasH({
  datos,
  color,
}: GraficoBarrasHProps) {
  const paleta = usePaletaGraficos();
  const alto = Math.max(160, datos.length * 28 + 40);

  return (
    <ResponsiveContainer width="100%" height={alto}>
      <BarChart
        data={datos}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
      >
        <CartesianGrid horizontal={false} stroke={`${paleta.texto}18`} />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 11, fill: paleta.texto }}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={110}
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
          radius={[0, 6, 6, 0]}
          fill={color ?? paleta.energyOrange}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
