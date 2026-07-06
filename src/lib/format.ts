import i18n from "@/lib/i18n";

// ── Cached user preferences ──────────────────────────────────────────
// Read once from localStorage on module load (browser only); refreshed
// when the user changes settings. Avoids hundreds of localStorage reads
// per render cycle.
let _cachedDateFormat: string | null = null;
let _cachedTimezone: string | null = null;
let _prefsLoaded = false;

function loadPrefs() {
  if (typeof window === "undefined") return;
  _cachedDateFormat = localStorage.getItem("unichem-date-format") || "default";
  _cachedTimezone = localStorage.getItem("unichem-timezone") || "local";
  _prefsLoaded = true;
}

/** Call this after the user saves settings so formatter picks up changes. */
export function refreshFormatPrefs() {
  _prefsLoaded = false;
}

function getDatePref(): string {
  if (!_prefsLoaded) loadPrefs();
  return _cachedDateFormat ?? "default";
}

function getTimezonePref(): string | undefined {
  if (!_prefsLoaded) loadPrefs();
  const tz = _cachedTimezone ?? "local";
  return tz === "local" ? undefined : tz;
}

// ── Locale helpers ───────────────────────────────────────────────────
const getLocale = () => i18n.language === "ar" ? "ar-EG" : "en-EG";
const getDateLocale = () => i18n.language === "ar" ? "ar-EG" : "en-GB";

// ── Number formatters ────────────────────────────────────────────────
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

// ── Date format options ──────────────────────────────────────────────
const getDateFormatOptions = () => {
  const pref = getDatePref();
  if (pref === "numeric") {
    return { year: "numeric", month: "2-digit", day: "2-digit" } as const;
  }
  return { year: "numeric", month: "short", day: "2-digit" } as const;
};

// ── Date formatters ──────────────────────────────────────────────────
export const formatDate = (d: string | Date) => {
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return "—";

  const pref = getDatePref();
  const tz = getTimezonePref();

  if (pref === "iso") {
    const formatterOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };
    if (tz) formatterOptions.timeZone = tz;
    try {
      const formatter = new Intl.DateTimeFormat("en-US", formatterOptions);
      const parts = formatter.formatToParts(dateObj);
      const y = parts.find(p => p.type === "year")?.value;
      const m = parts.find(p => p.type === "month")?.value;
      const day = parts.find(p => p.type === "day")?.value;
      return `${y}-${m}-${day}`;
    } catch {
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  }

  const options: Intl.DateTimeFormatOptions = getDateFormatOptions();
  if (tz) {
    try {
      options.timeZone = tz;
    } catch {
      // Invalid timezone — fall back to browser local
    }
  }

  return dateObj.toLocaleDateString(getDateLocale(), options);
};

export const formatDateTime = (d: string | Date) => {
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return "—";

  const tz = getTimezonePref();
  const dateLocale = getDateLocale();
  const pref = getDatePref();

  if (pref === "iso") {
    const formatterOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };
    if (tz) formatterOptions.timeZone = tz;
    try {
      const formatter = new Intl.DateTimeFormat("en-US", formatterOptions);
      const parts = formatter.formatToParts(dateObj);
      const y = parts.find(p => p.type === "year")?.value;
      const m = parts.find(p => p.type === "month")?.value;
      const day = parts.find(p => p.type === "day")?.value;
      const hr = parts.find(p => p.type === "hour")?.value;
      const min = parts.find(p => p.type === "minute")?.value;
      return `${y}-${m}-${day} ${hr}:${min}`;
    } catch {
      // fall through to default formatting
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
    } catch {
      // Invalid timezone — fall back to browser local
    }
  }

  return dateObj.toLocaleString(dateLocale, options);
};
