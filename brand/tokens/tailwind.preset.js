/** dayuse Tailwind preset v1.0 (BR-02) — Tailwind CSS v3.
 *  tailwind.config.js:  module.exports = { presets: [require('./tokens/tailwind.preset.js')], content: [...] }
 *  Tailwind v4 users: see theme.css in this folder.
 *  Names map 1:1 to tokens.json. The default palette stays available (blue-600 === primary). */
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2563EB', hover: '#1D4ED8', active: '#1E40AF', subtle: '#EFF6FF', muted: '#DBEAFE' },
        night: '#020617',
        page: '#F8FAFC',
        card: '#FFFFFF',
        sunken: '#F1F5F9',
        line: { DEFAULT: '#E2E8F0', strong: '#CBD5E1' },
        ink: { DEFAULT: '#1E293B', secondary: '#475569', muted: '#64748B', disabled: '#94A3B8' },
        success: { DEFAULT: '#047857', icon: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
        warning: { DEFAULT: '#B45309', icon: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
        danger:  { DEFAULT: '#B91C1C', icon: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
        streak: '#F59E0B',
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'Apple SD Gothic Neo', 'Noto Sans KR', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display:    ['32px', { lineHeight: '40px', letterSpacing: '-0.02em', fontWeight: '800' }],
        'title-lg': ['24px', { lineHeight: '32px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'title-md': ['20px', { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'title-sm': ['17px', { lineHeight: '24px', letterSpacing: '-0.01em', fontWeight: '600' }],
        body:       ['16px', { lineHeight: '24px' }],
        'body-sm':  ['14px', { lineHeight: '20px' }],
        caption:    ['13px', { lineHeight: '18px', fontWeight: '500' }],
        label:      ['12px', { lineHeight: '16px', fontWeight: '600' }],
      },
      borderRadius: { sm: '8px', md: '12px', lg: '16px', xl: '20px', '2xl': '24px' },
      boxShadow: {
        sm: '0 1px 2px rgba(15, 23, 42, 0.06)',
        sheet: '0 -8px 24px rgba(15, 23, 42, 0.08)',
      },
      height: { 'btn-lg': '52px', 'btn-md': '44px', 'btn-sm': '36px', input: '48px', header: '56px' },
      maxWidth: { app: '480px' },
    },
  },
};

/* Component recipes (class strings)
 * Button primary  : h-btn-md px-4 rounded-md bg-primary text-white font-semibold hover:bg-primary-hover active:bg-primary-active disabled:bg-line disabled:text-ink-disabled focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-muted
 * Button secondary: h-btn-md px-4 rounded-md bg-sunken text-ink font-semibold hover:bg-line
 * Button dark     : h-btn-md px-4 rounded-md bg-ink text-white font-semibold
 * Button outline  : h-btn-md px-4 rounded-md bg-card border border-line-strong text-ink font-semibold
 * Button warning  : h-btn-sm px-3 rounded-md bg-warning text-white text-body-sm font-semibold   (was amber-600: 3.19:1 → amber-700: 5.02:1)
 * Input           : h-input px-4 rounded-md bg-card border border-line-strong text-body placeholder:text-ink-muted focus:border-primary focus:ring-4 focus:ring-primary-muted
 * Input error     : border-danger-icon  + <p class="text-body-sm text-danger">…</p>
 * Card            : rounded-lg bg-card border border-line p-5
 * Chip success    : h-[26px] px-2.5 rounded-full bg-success-bg text-success text-label border border-success-border
 * Chip warning    : h-[26px] px-2.5 rounded-full bg-warning-bg text-warning text-label border border-warning-border
 * Chip danger     : h-[26px] px-2.5 rounded-full bg-danger-bg text-danger text-label border border-danger-border
 */
