export const isIntegerString = (v: unknown) =>
  typeof v === "string" && /^-?\d+$/.test(v) && Number.isSafeInteger(Number(v));

export const isPositiveIntegerString = (v: unknown): v is string =>
  typeof v === "string" && /^[1-9]\d*$/.test(v) && Number.isSafeInteger(Number(v));
