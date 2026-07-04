import i18n from "@/lib/i18n";

const getLocale = () => i18n.language === "ar" ? "ar-EG" : "en-EG";
const getDateLocale = () => i18n.language === "ar" ? "ar-EG" : "en-GB";

export const formatEGP = (n: number) =>
  new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 2,
  }).format(n || 0);

export const formatCompactEGP = (n: number) =>
  new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 1,
    notation: "compact",
    compactDisplay: "short",
  }).format(n || 0);

export const formatNumber = (n: number) =>
  new Intl.NumberFormat(getLocale()).format(n || 0);

const getDateFormatOptions = () => {
  if (typeof window === "undefined") {
    return { year: "numeric", month: "short", day: "2-digit" } as const;
  }
  const pref = localStorage.getItem("unichem-date-format") || "default";
  if (pref === "numeric") {
    return { year: "numeric", month: "2-digit", day: "2-digit" } as const;
  }
  return { year: "numeric", month: "short", day: "2-digit" } as const;
};

const getTimezone = () => {
  if (typeof window === "undefined") return undefined;
  const tz = localStorage.getItem("unichem-timezone") || "local";
  if (tz === "local") return undefined;
  return tz;
};

export const formatDate = (d: string | Date) => {
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return "—";

  if (typeof window !== "undefined") {
    const pref = localStorage.getItem("unichem-date-format") || "default";
    if (pref === "iso") {
      const tz = getTimezone();
      if (tz) {
        try {
          const formatter = new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            timeZone: tz,
          });
          const parts = formatter.formatToParts(dateObj);
          const y = parts.find(p => p.type === "year")?.value;
          const m = parts.find(p => p.type === "month")?.value;
          const day = parts.find(p => p.type === "day")?.value;
          return `${y}-${m}-${day}`;
        } catch (e) {
          console.error("Format error", e);
        }
      }
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  }

  const options: Intl.DateTimeFormatOptions = getDateFormatOptions();
  const tz = getTimezone();
  if (tz) {
    try {
      options.timeZone = tz;
    } catch (e) {
      console.error("Invalid timezone", e);
    }
  }

  return dateObj.toLocaleDateString(getDateLocale(), options);
};

export const formatDateTime = (d: string | Date) => {
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return "—";

  const tz = getTimezone();
  const dateLocale = getDateLocale();

  if (typeof window !== "undefined") {
    const pref = localStorage.getItem("unichem-date-format") || "default";
    if (pref === "iso") {
      const formatterOptions: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      };
      if (tz) {
        try {
          formatterOptions.timeZone = tz;
        } catch (e) {
          console.error("Invalid timezone", e);
        }
      }
      try {
        const formatter = new Intl.DateTimeFormat("en-US", formatterOptions);
        const parts = formatter.formatToParts(dateObj);
        const y = parts.find(p => p.type === "year")?.value;
        const m = parts.find(p => p.type === "month")?.value;
        const day = parts.find(p => p.type === "day")?.value;
        const hr = parts.find(p => p.type === "hour")?.value;
        const min = parts.find(p => p.type === "minute")?.value;
        return `${y}-${m}-${day} ${hr}:${min}`;
      } catch (e) {
        console.error("Format error", e);
      }
    }
  }

  const baseOptions = getDateFormatOptions();
  const options: Intl.DateTimeFormatOptions = {
    ...baseOptions,
    hour: "2-digit",
    minute: "2-digit",
  };
  if (tz) {
    try {
      options.timeZone = tz;
    } catch (e) {
      console.error("Invalid timezone", e);
    }
  }

  return dateObj.toLocaleString(dateLocale, options);
};
