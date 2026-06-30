import { notFound, redirect } from "next/navigation";
import { getSessionRole } from "@/lib/authz";

export default async function AdminComplejoPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const complejoId = Number(id);

  if (Number.isNaN(complejoId)) {
    notFound();
  }

  const role = await getSessionRole();

  if (role === "superadmin") {
    redirect(`/superadmin/complejos/${complejoId}`);
  }

  if (role === "admin") {
    redirect(`/admin/complejos/${complejoId}/eventos`);
  }

  notFound();
}
