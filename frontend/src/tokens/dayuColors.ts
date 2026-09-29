export interface DayuColorOption {
  id: string;
  label: string;
  color: string; // text / icon fill hex
  bg: string;    // avatar background hex
}

export const DAYU_COLOR_LIST: DayuColorOption[] = [
  { id: 'blue', label: '파랑', color: '#2563EB', bg: '#DBEAFE' },
  { id: 'sky', label: '하늘', color: '#0284C7', bg: '#E0F2FE' },
  { id: 'mint', label: '민트', color: '#0D9488', bg: '#CCFBF1' },
  { id: 'green', label: '초록', color: '#16A34A', bg: '#DCFCE7' },
  { id: 'yellow', label: '노랑', color: '#CA8A04', bg: '#FEF3C7' },
  { id: 'orange', label: '주황', color: '#EA580C', bg: '#FFEDD5' },
  { id: 'coral', label: '코랄', color: '#E11D48', bg: '#FFE4E6' },
  { id: 'pink', label: '분홍', color: '#DB2777', bg: '#FCE7F3' },
  { id: 'purple', label: '보라', color: '#7C3AED', bg: '#EDE9FE' },
  { id: 'slate', label: '먹색', color: '#475569', bg: '#E2E8F0' },
];

export const DAYU_COLORS: Record<string, DayuColorOption> = Object.fromEntries(
  DAYU_COLOR_LIST.map((item) => [item.id, item])
);

export const DEFAULT_DAYU_COLOR = DAYU_COLORS.blue;

export function parseDayuColor(profileImageUrl?: string | null): DayuColorOption {
  if (!profileImageUrl) return DEFAULT_DAYU_COLOR;
  if (profileImageUrl.startsWith('dayu:')) {
    const key = profileImageUrl.slice(5).toLowerCase();
    return DAYU_COLORS[key] || DEFAULT_DAYU_COLOR;
  }
  return DEFAULT_DAYU_COLOR;
}

export function isHttpProfileImage(profileImageUrl?: string | null): boolean {
  if (!profileImageUrl) return false;
  return profileImageUrl.startsWith('http://') || profileImageUrl.startsWith('https://') || profileImageUrl.startsWith('data:');
}
