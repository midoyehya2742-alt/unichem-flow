import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function TableSkeleton({ columns = 5, rows = 5 }: { columns?: number; rows?: number }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-card overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
          <TableRow>
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead key={i} className="h-10">
                <Skeleton className="h-4 w-24" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, r) => (
            <TableRow key={r}>
              {Array.from({ length: columns }).map((_, c) => (
                <TableCell key={c} className="py-4">
                  <Skeleton className="h-4 w-full max-w-[200px]" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
