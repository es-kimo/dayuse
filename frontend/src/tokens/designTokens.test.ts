import { describe, it, expect } from 'vitest';
// @ts-expect-error untyped CommonJS preset
import brandPreset from '../../../brand/tokens/tailwind.preset.js';

describe('Design Tokens & Accessibility (DS-01, DS-02)', () => {
  it('should define required surface and background colors', () => {
    const colors = brandPreset.theme.extend.colors;
    expect(colors.page).toBe('#F8FAFC');
    expect(colors.card).toBe('#FFFFFF');
    expect(colors.sunken).toBe('#F1F5F9');
  });

  it('should define required text and line tokens with high contrast', () => {
    const colors = brandPreset.theme.extend.colors;
    expect(colors.ink.DEFAULT).toBe('#1E293B');
    expect(colors.ink.secondary).toBe('#475569');
    expect(colors.ink.muted).toBe('#64748B');
    expect(colors.line.DEFAULT).toBe('#E2E8F0');
  });

  it('should define semantic state tokens for feedback', () => {
    const colors = brandPreset.theme.extend.colors;
    expect(colors.primary.DEFAULT).toBe('#2563EB');
    expect(colors.danger.DEFAULT).toBe('#B91C1C');
    expect(colors.success.DEFAULT).toBe('#047857');
    expect(colors.warning.DEFAULT).toBe('#B45309');
  });

  it('should have standard button and input heights adhering to touch targets', () => {
    const heights = brandPreset.theme.extend.height;
    expect(heights['btn-lg']).toBe('52px');
    expect(heights['btn-md']).toBe('44px');
    expect(heights['btn-sm']).toBe('36px');
    expect(heights['input']).toBe('48px');
  });
});
