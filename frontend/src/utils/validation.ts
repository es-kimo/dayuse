export const isIntegerString = (v: unknown) =>
  typeof v === "string" && /^-?\d+$/.test(v) && Number.isSafeInteger(Number(v));
