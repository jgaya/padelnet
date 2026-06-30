import { notFound, redirect } from "next/navigation";
import { getSessionRole } from "@/lib/authz";

export default async function AdminNewComplejoPage() {
  const role = await getSessionRole();

  if (role === "superadmin") {
    redirect("/superadmin/complejos/new");
  }

  notFound();
}
