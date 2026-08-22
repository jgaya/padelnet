import { notFound, redirect } from "next/navigation";
import { esSuperadmin } from "@/lib/authz";

export default async function NewComplejoPage() {
  if (!(await esSuperadmin())) {
    notFound();
  }

  redirect("/superadmin/complejos/new");
}
