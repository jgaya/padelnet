import ComplejoCanchasPageClient from "@/app/admin/complejos/[id]/canchas/components/ComplejoCanchasPageClient";

export default async function SuperadminComplejoCanchasPage() {
  return (
    <ComplejoCanchasPageClient
      basePath="/superadmin/complejos"
      backURL="/superadmin/complejos"
    />
  );
}
