/**
 * 날짜 및 시간 KST (Asia/Seoul) 포맷팅 유틸리티
 */

/**
 * ISO 문자열 또는 Date 객체를 KST 기준 Date 객체로 안전하게 파싱합니다.
 * 타임존 오프셋(Z 또는 +/-)이 없는 ISO 날짜시간 문자열의 경우,
 * 백엔드 서버의 KST(UTC+9) 시각으로 인식하도록 +09:00 오프셋을 보정합니다.
 */
export const parseKstDate = (dateInput: string | Date | null | undefined): Date | null => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;

  let str = dateInput.trim();
  if (!str) return null;

  // 공백 구분자(' ')가 있으면 'T'로 치환 (예: "2026-09-22 07:18:48")
  if (str.includes(' ') && !str.includes('T')) {
    str = str.replace(' ', 'T');
  }

  // 타임존 오프셋(Z 또는 +XX:XX 또는 -XX:XX)이 없는 경우 KST(+09:00)로 보정
  const hasTimezone = str.endsWith('Z') || /[+-]\d{2}(:\d{2})?$/.test(str);
  if (!hasTimezone && str.includes('T')) {
    str = `${str}+09:00`;
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * KST 기준 시각 포맷팅 (예: "오후 2:30", "오전 9:05")
 */
export const formatKstTime = (dateInput: string | Date | null | undefined): string => {
  const d = parseKstDate(dateInput);
  if (!d) return '';

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
};

/**
 * KST 기준 날짜 및 시각 포맷팅 (예: "9월 21일 오후 2:30")
 */
export const formatKstDateTime = (dateInput: string | Date | null | undefined): string => {
  const d = parseKstDate(dateInput);
  if (!d) return '';

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
};

/**
 * KST 기준 날짜 포맷팅 (예: "2026. 09. 21.")
 */
export const formatKstDate = (dateInput: string | Date | null | undefined): string => {
  const d = parseKstDate(dateInput);
  if (!d) return '';

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};

/**
 * KST 기준 오늘 날짜 문자열 반환 (예: "2026-09-22")
 */
export const getTodayKstString = (): string => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
};

/**
 * YYYY-MM-DD 날짜 문자열에 KST 기준으로 N일을 더한 날짜를 반환합니다.
 */
export const addDaysKst = (dateStr: string, days: number): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};
