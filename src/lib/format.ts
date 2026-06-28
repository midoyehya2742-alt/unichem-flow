export const formatEGP = (n: number) =>
  new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 2,
  }).format(n || 0);

export const formatNumber = (n: number) =>
  new Intl.NumberFormat("en-EG").format(n || 0);

export const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

export const formatDateTime = (d: string | Date) =>
  new Date(d).toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
