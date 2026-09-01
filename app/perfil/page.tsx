import { redirect } from "next/navigation";
import PerfilForm from "@/app/perfil/components/PerfilForm";
import PanelLogros from "@/components/logros/PanelLogros";
import { getMyProfile } from "@/actions/perfil";
import { misLogros } from "@/actions/logros";

export default async function PerfilPage() {
  const profile = await getMyProfile().catch((error: unknown) => {
    if (error instanceof Error && error.message === "No autenticado") {
      redirect("/login");
    }

    throw error;
  });

  const logros = await misLogros();

  return (
    <>
      <PerfilForm initialData={profile} />

      <div className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
        <PanelLogros logros={logros} />
      </div>
    </>
  );
}
