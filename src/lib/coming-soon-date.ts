// Costa Rica does not observe daylight saving time, so it stays UTC-6 year-round.
const COSTA_RICA_UTC_OFFSET_HOURS = 6;

// Parses a timezone-less "YYYY-MM-DDTHH:mm" value (as produced by an
// <input type="datetime-local">) as Costa Rica wall-clock time.
export function parseCostaRicaLocalDateTime(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour) + COSTA_RICA_UTC_OFFSET_HOURS,
      Number(minute)
    )
  );
}

// Formats a Date as Costa Rica wall-clock time for the <input type="datetime-local"> value.
export function toCostaRicaDateTimeLocalValue(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Costa_Rica",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

// Formats a Date as a friendly Costa Rica wall-clock string for display.
export function formatCostaRicaDateTime(date: Date, locale: "en" | "es"): string {
  return new Intl.DateTimeFormat(locale === "es" ? "es-CR" : "en-US", {
    timeZone: "America/Costa_Rica",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
