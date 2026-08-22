import { notFound } from "next/navigation";

import { getPublicComplejo } from "@/actions/complejos-public";
import { SectionCard } from "@/app/complejos/[id]/components/Section";
import {
  buildMapsQuery,
  mapUrls,
  phoneHref,
} from "@/app/complejos/components/mapUtils";

export const dynamic = "force-dynamic";

export default async function ComplejoPublicInfoPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const complejo = await getPublicComplejo(Number(id));

  if (!complejo) {
    notFound();
  }

  const urls = mapUrls(buildMapsQuery(complejo));
  const telHref = phoneHref(complejo.telefono);

  return (
    <SectionCard
      title="Datos del complejo"
      description="Contacto y ubicacion del club."
    >
      <div className="space-y-4">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-2xl border border-deep-black/10 bg-white px-4 py-3">
            <p className="font-semibold text-deep-black">Direccion</p>
            <p className="mt-1 text-deep-black/75">
              {complejo.direccion
                ? `${complejo.direccion}, ${complejo.ciudad}, ${complejo.provincia}`
                : `${complejo.ciudad}, ${complejo.provincia}`}
            </p>
          </div>

          <div className="rounded-2xl border border-deep-black/10 bg-white px-4 py-3">
            <p className="font-semibold text-deep-black">Telefono</p>
            {complejo.telefono ? (
              telHref ? (
                <a
                  href={telHref}
                  className="mt-1 block text-deep-black/75 transition hover:text-padel-green"
                >
                  {complejo.telefono}
                </a>
              ) : (
                <p className="mt-1 text-deep-black/75">{complejo.telefono}</p>
              )
            ) : (
              <p className="mt-1 text-deep-black/45">No disponible</p>
            )}
          </div>

          <div className="rounded-2xl border border-deep-black/10 bg-white px-4 py-3">
            <p className="font-semibold text-deep-black">Email</p>
            {complejo.email ? (
              <a
                href={`mailto:${complejo.email}`}
                className="mt-1 block break-all text-deep-black/75 transition hover:text-padel-green"
              >
                {complejo.email}
              </a>
            ) : (
              <p className="mt-1 text-deep-black/45">No disponible</p>
            )}
          </div>

          <div className="rounded-2xl border border-deep-black/10 bg-white px-4 py-3">
            <p className="font-semibold text-deep-black">Pais</p>
            <p className="mt-1 text-deep-black/75">{complejo.pais}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-deep-black/10">
          <iframe
            title={`Mapa de ${complejo.name}`}
            src={urls.embed}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-72 w-full border-0"
          />
        </div>

        <a
          href={urls.external}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-full border border-deep-black/20 bg-white px-4 py-2 text-sm font-semibold text-deep-black transition hover:bg-surface-soft"
        >
          Abrir en Google Maps
        </a>
      </div>
    </SectionCard>
  );
}
