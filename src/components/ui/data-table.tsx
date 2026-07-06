import * as React from "react"
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnFiltersState,
  VisibilityState,
  useReactTable,
} from "@tanstack/react-table"
import { useTranslation } from "react-i18next"
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search, SlidersHorizontal, Inbox } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  showSearch?: boolean
  showColumnVisibility?: boolean
  serverSidePagination?: {
    pageIndex: number
    pageSize: number
    pageCount: number
    onPageChange: (page: number) => void
  }
}

export function DataTable<TData, TValue>({
  columns,
  data,
  showSearch = true,
  showColumnVisibility = true,
  serverSidePagination,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const { t } = useTranslation("common")

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: serverSidePagination ? undefined : getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    manualPagination: !!serverSidePagination,
    pageCount: serverSidePagination?.pageCount ?? -1,
    state: {
      sorting,
      globalFilter,
      columnVisibility,
      ...(serverSidePagination && { pagination: { pageIndex: serverSidePagination.pageIndex, pageSize: serverSidePagination.pageSize } })
    },
  })

  const getMobileHeaderLabel = (id: string) => {
    const mapping: Record<string, string> = {
      reference: t("deals.reference", "Reference"),
      dealDate: t("deals.date", "Date"),
      customerName: t("deals.customer", "Customer"),
      salesmanName: t("deals.salesman", "Salesman"),
      total: t("deals.total_value", "Total Value"),
      paymentStatus: t("deals.status", "Status"),
      sku: t("inventory.sku", "SKU"),
      name: t("inventory.product", "Product Name"),
      category: t("inventory.category", "Category"),
      stockQuantity: t("inventory.stock", "Stock"),
      minimumStockLevel: t("inventory.min_level", "Min Level"),
      defaultPrice: t("inventory.price", "Price"),
      email: t("customers.email", "Email"),
      phone: t("customers.phone", "Phone"),
      company: t("customers.company", "Company"),
      taxId: t("customers.tax_id", "Tax ID"),
    }
    return mapping[id] || id.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()
  }

  return (
    <div className="space-y-4">
      {(showSearch || showColumnVisibility) && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {showSearch && (
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={t("common.search", "Search all columns...")}
                value={globalFilter ?? ""}
                onChange={(event) => setGlobalFilter(String(event.target.value))}
                className="pl-9 h-9 border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus-visible:ring-indigo-500"
              />
            </div>
          )}
          {showColumnVisibility && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  {t("common.columns", "Columns")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[150px]">
                {table
                  .getAllColumns()
                  .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-md">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="h-10 text-xs uppercase tracking-wider font-semibold text-slate-500">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="p-3 text-xs md:text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-500 py-6">
                    <Inbox className="h-8 w-8 text-slate-300 mb-2" />
                    <p>{t("common.no_results", "No results found.")}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Stacked Card View */}
      <div className="md:hidden space-y-4">
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <Card key={row.id} className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardContent className="p-4 space-y-3">
                {row.getVisibleCells().map((cell) => {
                  const isAction = cell.column.id === "actions"
                  if (isAction) return null

                  const cleanHeader = getMobileHeaderLabel(cell.column.id)

                  return (
                    <div key={cell.id} className="flex justify-between items-start gap-4 text-xs">
                      <span className="font-semibold text-slate-500 capitalize shrink-0">{cleanHeader}</span>
                      <span className="text-slate-800 dark:text-slate-200 text-right font-medium break-all">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </span>
                    </div>
                  )
                })}

                {/* Render Actions at the bottom of the card */}
                {row.getVisibleCells().some(c => c.column.id === "actions") && (
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex justify-end gap-2">
                    {flexRender(
                      row.getVisibleCells().find(c => c.column.id === "actions")!.column.columnDef.cell,
                      row.getVisibleCells().find(c => c.column.id === "actions")!.getContext()
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm p-8 text-center text-slate-500">
            <div className="flex flex-col items-center justify-center gap-2">
              <Inbox className="h-6 w-6 text-slate-400" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">{t("no_results", "No data to display")}</p>
            </div>
          </Card>
        )}
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="text-xs text-slate-500">
          {serverSidePagination ? (
             t("common.page_info", { current: serverSidePagination.pageIndex + 1, total: serverSidePagination.pageCount, defaultValue: `Page ${serverSidePagination.pageIndex + 1} of ${serverSidePagination.pageCount}` })
          ) : (
            t("showing_rows", "Showing {{count}} rows", { count: table.getRowModel().rows.length })
          )}
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="outline"
            className="h-8 w-8 p-0 border-slate-200 dark:border-slate-800"
            onClick={() => serverSidePagination ? serverSidePagination.onPageChange(serverSidePagination.pageIndex - 1) : table.previousPage()}
            disabled={serverSidePagination ? serverSidePagination.pageIndex === 0 : !table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0 border-slate-200 dark:border-slate-800"
            onClick={() => serverSidePagination ? serverSidePagination.onPageChange(serverSidePagination.pageIndex + 1) : table.nextPage()}
            disabled={serverSidePagination ? serverSidePagination.pageIndex >= serverSidePagination.pageCount - 1 : !table.getCanNextPage()}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: React.HTMLAttributes<HTMLDivElement> & {
  column: any
  title: string
}) {
  if (!column.getCanSort()) {
    return <div className={cn("text-xs font-semibold", className)}>{title}</div>
  }

  return (
    <div className={cn("flex items-center space-x-2 space-x-reverse", className)}>
      <Button
        variant="ghost"
        size="sm"
        className="-ms-3 h-8 data-[state=open]:bg-accent text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        <span>{title}</span>
        {column.getIsSorted() === "desc" ? (
          <ArrowDown className="ms-1 h-3 w-3" />
        ) : column.getIsSorted() === "asc" ? (
          <ArrowUp className="ms-1 h-3 w-3" />
        ) : (
          <ArrowUp className="ms-1 h-3 w-3 opacity-0 group-hover:opacity-100" />
        )}
      </Button>
    </div>
  )
}
