import { describe, it, expect } from 'vitest';
import { parseDayuColor, DAYU_COLORS, DEFAULT_DAYU_COLOR, isHttpProfileImage } from './dayuColors';

describe('dayuColors token utilities', () => {
  it('기본값은 blue(파랑)을 반환한다', () => {
    expect(parseDayuColor(null)).toEqual(DEFAULT_DAYU_COLOR);
    expect(parseDayuColor(undefined)).toEqual(DEFAULT_DAYU_COLOR);
    expect(parseDayuColor('')).toEqual(DEFAULT_DAYU_COLOR);
  });

  it('dayu:<color> 형식을 올바르게 파싱한다', () => {
    expect(parseDayuColor('dayu:mint')).toEqual(DAYU_COLORS.mint);
    expect(parseDayuColor('dayu:SKY')).toEqual(DAYU_COLORS.sky);
    expect(parseDayuColor('dayu:purple')).toEqual(DAYU_COLORS.purple);
  });

  it('알 수 없는 색상이거나 오타인 경우 기본값 blue를 반환한다', () => {
    expect(parseDayuColor('dayu:unknown_color')).toEqual(DEFAULT_DAYU_COLOR);
  });

  it('HTTP 이미지 URL 여부를 올바르게 판별한다', () => {
    expect(isHttpProfileImage('https://k.kakaocdn.net/profile.jpg')).toBe(true);
    expect(isHttpProfileImage('http://example.com/pic.png')).toBe(true);
    expect(isHttpProfileImage('data:image/png;base64,...')).toBe(true);
    expect(isHttpProfileImage('dayu:mint')).toBe(false);
    expect(isHttpProfileImage(null)).toBe(false);
  });
});
