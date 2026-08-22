import { redirect } from "next/navigation";

import { getMyProfile } from "@/actions/perfil";
import NotificationPreferences from "@/app/perfil/components/NotificationPreferences";

export const dynamic = "force-dynamic";

export default async function PerfilNotificacionesPage() {
  const initialData = await getMyProfile().catch((error: unknown) => {
    if (error instanceof Error && error.message === "No autenticado") {
      redirect("/login");
    }

    throw error;
  });

  return <NotificationPreferences user={initialData} />;
}
