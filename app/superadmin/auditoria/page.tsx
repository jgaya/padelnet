import { MODELOS_AUDITADOS } from "@/lib/auditoria-config";

import TablaAuditoria from "./components/TablaAuditoria";

/**
 * El guard lo pone app/superadmin/layout.tsx. La lista de tablas sale de la
 * constante y no de una action: es estatica, y llamar una action que hace
 * assertSuperadmin desde el server component tiraba en paralelo al notFound()
 * del layout, ensuciando el log con un "No autorizado" que no era un error.
 */
export default function AuditoriaPage() {
  return <TablaAuditoria tablas={[...MODELOS_AUDITADOS].sort()} />;
}
