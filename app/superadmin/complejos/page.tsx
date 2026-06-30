import ComplejosPageClient from "@/app/admin/complejos/components/ComplejosPageClient";

export default function SuperadminComplejosPage() {
  return (
    <ComplejosPageClient
      basePath="/superadmin/complejos"
      backURL="/superadmin"
      canCreate
      canEdit
      canDelete
      showEventActions
    />
  );
}
