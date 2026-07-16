const pad = (value: number, size = 2) => String(value).padStart(size, "0");

export const toDbTimestamp = (value: Date | string | number) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
    ":",
    pad(date.getSeconds()),
    ".",
    pad(date.getMilliseconds(), 3),
  ].join("");
};

/**
 * Lee un timestamp que llega a la API (o que viene de la base) y lo convierte a
 * Date. Devuelve null si no es una fecha usable, para que quien lo llame decida
 * el error en lugar de propagar un "Invalid Date".
 */
export const parseDbTimestamp = (value: unknown): Date | null => {
  if (typeof value !== "string" || !value.trim()) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const dateOnlyToDbStartOfDay = (value: string) => `${value}T00:00:00.000`;

export const dateOnlyToDbEndOfDay = (value: string) => `${value}T23:59:59.999`;
