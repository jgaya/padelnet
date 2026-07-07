import ComplejoCanchasPageClient from "./components/ComplejoCanchasPageClient";

export default function AdminComplejoCanchasPage() {
  return (
    <ComplejoCanchasPageClient
      basePath="/admin/complejos"
      backURL="/admin/complejos"
    />
  );
}
