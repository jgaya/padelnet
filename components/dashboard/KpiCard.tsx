import { porcentaje } from "@/lib/dashboard-calculos";

type KpiCardProps = {
  etiqueta: string;
  valor: number;
  /** Si viene, debajo del numero se muestra que porcentaje del total es. */
  sobreTotal?: number;
};

export default function KpiCard({ etiqueta, valor, sobreTotal }: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-deep-black/10 bg-white px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-deep-black/60">
        {etiqueta}
      </div>
      <div className="mt-1 text-2xl font-semibold text-deep-black">
        {valor.toLocaleString("es-AR")}
      </div>
      {sobreTotal !== undefined ? (
        <div className="text-xs text-deep-black/60">
          {porcentaje(valor, sobreTotal)}% del total
        </div>
      ) : null}
    </div>
  );
}
