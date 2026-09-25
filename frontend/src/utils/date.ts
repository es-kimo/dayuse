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

/**
 * KST 기준 현재 시간(0~23)을 반환합니다.
 */
export const getKstHour = (date: Date = new Date()): number => {
  const str = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    hour: 'numeric',
    hour12: false,
  }).format(date);
  return parseInt(str, 10);
};

/**
 * 현재 시각이 심야/새벽 유예 기간(00:00 ~ 09:00 KST)에 해당하는지 여부를 반환합니다.
 */
export const isNightGraceWindow = (date: Date = new Date()): boolean => {
  const hour = getKstHour(date);
  return hour >= 0 && hour < 9;
};

/**
 * YYYY-MM-DD 날짜를 "M월 D일" 형식으로 포맷팅합니다. (예: "9월 23일")
 */
export const formatMonthDay = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  return `${month}월 ${day}일`;
};

/**
 * YYYY-MM-DD 형식의 두 날짜 사이의 총 일수(포함)를 계산합니다. (시작일~종료일, 1일 이상)
 */
export const getDurationDaysKst = (startDate: string, endDate: string): number => {
  if (!startDate || !endDate) return 1;
  const s = new Date(startDate).getTime();
  const e = new Date(endDate).getTime();
  if (isNaN(s) || isNaN(e) || e < s) return 1;
  return Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
};

