import { notFound, redirect } from "next/navigation";
import { esSuperadmin } from "@/lib/authz";

export default async function AdminNewComplejoPage() {
  if (await esSuperadmin()) {
    redirect("/superadmin/complejos/new");
  }

  notFound();
}
