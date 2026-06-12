export interface PaginationParams {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function parsePagination(query: Record<string, any>): PaginationParams {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 10));
  const sortBy = (query.sortBy as string) || "createdAt";
  const sortOrder = (query.sortOrder as string) === "asc" ? "asc" : "desc";
  return { page, limit, sortBy, sortOrder };
}

export function paginateResult<T>(items: T[], total: number, params: PaginationParams): PaginatedResult<T> {
  return {
    data: items,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    },
  };
}

export function applySorting<T>(items: T[], params: PaginationParams): T[] {
  const { sortBy, sortOrder } = params;
  const sorted = [...items].sort((a: any, b: any) => {
    const valA = a[sortBy];
    const valB = b[sortBy];
    if (valA == null) return 1;
    if (valB == null) return -1;
    if (typeof valA === "string") {
      return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortOrder === "asc" ? valA - valB : valB - valA;
  });
  return sorted;
}

export function applyPagination<T>(items: T[], params: PaginationParams): T[] {
  const start = (params.page - 1) * params.limit;
  return items.slice(start, start + params.limit);
}

export function filterBySearch<T>(items: T[], search: string, fields: (keyof T)[]): T[] {
  if (!search.trim()) return items;
  const q = search.toLowerCase();
  return items.filter((item) =>
    fields.some((field) => {
      const val = item[field];
      return val != null && String(val).toLowerCase().includes(q);
    })
  );
}
