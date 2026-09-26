import brandPreset from '../brand/tokens/tailwind.preset.js';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [brandPreset],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          400: '#64748B', // WCAG AA 대비율(4.76:1 이상) 보장을 위한 안전 명도 상향
        },
        background: '#F8FAFC',
        surface: {
          DEFAULT: '#FFFFFF',
          elevated: '#FFFFFF',
          sunken: '#F1F5F9',
        },
        secondary: '#475569',
        muted: '#64748B',
      },
      borderColor: {
        default: '#E2E8F0',
        focus: '#2563EB',
      },
    },
  },
  plugins: [],
};
