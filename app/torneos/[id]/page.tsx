import { notFound } from "next/navigation";
import { getPublicTorneoDetail } from "@/actions/torneos-public";
import TorneoDetailTabs from "@/app/torneos/[id]/components/TorneoDetailTabs";

export default async function TorneoPublicDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { params } = props;
  const { id } = await params;

  const torneoId = Number(id);
  if (!Number.isInteger(torneoId) || torneoId <= 0) {
    notFound();
  }

  const detail = await getPublicTorneoDetail(torneoId);
  if (!detail) {
    notFound();
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <TorneoDetailTabs detail={detail} />
    </section>
  );
}
