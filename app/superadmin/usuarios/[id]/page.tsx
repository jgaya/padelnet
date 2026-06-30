import { notFound } from "next/navigation";
import { getUsuarioById } from "@/actions/usuarios";
import UsuarioForm from "@/app/superadmin/usuarios/components/UsuarioForm";

export default async function EditUsuarioPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { params } = props;
  const { id } = await params;

  const userId = Number(id);
  if (Number.isNaN(userId)) notFound();

  const user = await getUsuarioById(userId).catch(() => null);
  if (!user) notFound();

  return (
    <UsuarioForm
      initialData={{
        name: user.name,
        lastname: user.lastname,
        email: user.email,
        telefono: user.telefono || "",
        dni: user.dni || "",
        genero: user.genero,
        categoria: user.categoria || "",
        platformRole: user.platformRole,
        complejoId: user.complejoId ? String(user.complejoId) : "",
        complejoRole: user.complejoRole ?? undefined,
        isActive: user.isActive,
        birthDate: "",
      }}
      isEdit={userId}
    />
  );
}
