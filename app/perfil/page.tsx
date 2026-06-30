import { redirect } from "next/navigation";
import PerfilForm from "@/app/perfil/components/PerfilForm";
import { getMyProfile } from "@/actions/perfil";

export default async function PerfilPage() {
  const profile = await getMyProfile().catch((error: unknown) => {
    if (error instanceof Error && error.message === "No autenticado") {
      redirect("/login");
    }

    throw error;
  });

  return (
    <div className="container p-4">
      <PerfilForm initialData={profile} />
    </div>
  );
}
