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

export const dateOnlyToDbStartOfDay = (value: string) => `${value}T00:00:00.000`;

export const dateOnlyToDbEndOfDay = (value: string) => `${value}T23:59:59.999`;
