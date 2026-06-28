import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { PageHeader } from "@/components/app-shell";
import { useDb } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/audit")({
  head: () => ({ meta: [{ title: "Audit log — UniChem ERP" }] }),
  component: () => <RequireAuth roles={["admin"]}><AuditPage /></RequireAuth>,
});

function AuditPage() {
  const db = useDb();
  const log = db.listAudit();
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <PageHeader title="Audit log" description="Every change is recorded." />
      <Card>
        <CardContent className="p-0">
          {log.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No activity yet.</div>
          ) : (
            <ul className="divide-y">
              {log.map((e) => (
                <li key={e.id} className="px-4 py-3 text-sm flex justify-between gap-4">
                  <div>
                    <div><span className="font-medium">{e.actorName}</span> {e.action} {e.entity}</div>
                    {e.details && <div className="text-muted-foreground text-xs mt-0.5">{e.details}</div>}
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">{formatDateTime(e.createdAt)}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
