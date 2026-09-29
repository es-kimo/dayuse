/** 프로필 데이유 색 10가지. 서버에는 id(문자열)만 저장한다. 가입 시 randomDayuColor()로 하나 배정. */
export const DAYU_COLORS = {
  blue:   { name: "파랑", fg: "#2563EB", bg: "#DBEAFE" },
  sky:    { name: "하늘", fg: "#0284C7", bg: "#E0F2FE" },
  mint:   { name: "민트", fg: "#0D9488", bg: "#CCFBF1" },
  green:  { name: "초록", fg: "#16A34A", bg: "#DCFCE7" },
  yellow: { name: "노랑", fg: "#CA8A04", bg: "#FEF3C7" },
  orange: { name: "주황", fg: "#EA580C", bg: "#FFEDD5" },
  coral:  { name: "코랄", fg: "#E11D48", bg: "#FFE4E6" },
  pink:   { name: "분홍", fg: "#DB2777", bg: "#FCE7F3" },
  purple: { name: "보라", fg: "#7C3AED", bg: "#EDE9FE" },
  slate:  { name: "먹색", fg: "#475569", bg: "#E2E8F0" },
} as const;

export type DayuColor = keyof typeof DAYU_COLORS;
export const DAYU_COLOR_IDS = Object.keys(DAYU_COLORS) as DayuColor[];

export function randomDayuColor(except?: DayuColor): DayuColor {
  const pool = DAYU_COLOR_IDS.filter((c) => c !== except);
  return pool[Math.floor(Math.random() * pool.length)];
}
