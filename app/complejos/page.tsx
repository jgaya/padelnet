import ComplejosPublicPage from "@/app/complejos/components/ComplejosPublicPage";
import { listPublicComplejos } from "@/actions/complejos";

export default async function ComplejosPage() {
  const complejos = await listPublicComplejos();
  return <ComplejosPublicPage complejos={complejos} />;
}
