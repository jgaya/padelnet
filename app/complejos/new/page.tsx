import { notFound, redirect } from "next/navigation";
import { getSessionRole } from "@/lib/authz";
import { hasRole } from "@/lib/roles";

export default async function NewComplejoPage() {
  const role = await getSessionRole();

  if (!hasRole(role, ["superadmin"])) {
    notFound();
  }

  redirect("/admin/complejos/new");
}
