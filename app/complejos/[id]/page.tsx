import { notFound, redirect } from "next/navigation";
import { getSessionRole } from "@/lib/authz";
import { hasRole } from "@/lib/roles";

export default async function EditComplejoPage(props: {
  params: Promise<{ id: string }>;
}) {
  const role = await getSessionRole();
  if (!hasRole(role, ["superadmin"])) notFound();

  const { params } = props;
  const { id } = await params;

  const complejoId = Number(id);
  if (Number.isNaN(complejoId)) notFound();

  redirect(`/admin/complejos/${complejoId}`);
}
