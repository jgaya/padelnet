import { porcentaje } from "@/lib/dashboard-calculos";

type KpiCardProps = {
  etiqueta: string;
  valor: number;
  /** Si viene, debajo del numero se muestra que porcentaje del total es. */
  sobreTotal?: number;
};

export default function KpiCard({ etiqueta, valor, sobreTotal }: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-content/10 bg-surface px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-content/60">
        {etiqueta}
      </div>
      <div className="mt-1 text-2xl font-semibold text-content">
        {valor.toLocaleString("es-AR")}
      </div>
      {sobreTotal !== undefined ? (
        <div className="text-xs text-content/60">
          {porcentaje(valor, sobreTotal)}% del total
        </div>
      ) : null}
    </div>
  );
}
