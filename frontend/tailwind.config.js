/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── PRGI Brand ────────────────────────────────────────────────────
        navy: {
          DEFAULT: '#12304A',   // primary — buttons, headings, active nav
          hover:   '#1F5A8A',   // hover state
          light:   '#E8EEF4',   // very light tint for subtle backgrounds
          muted:   '#4A6A84',   // muted navy for secondary elements
        },
        govblue: {
          DEFAULT: '#1F5A8A',   // links, secondary actions, selected states
          light:   '#EAF1F8',   // light tint
        },
        // ── Backgrounds ───────────────────────────────────────────────────
        surface: '#FFFFFF',
        app:     '#F7F8F6',     // main application background
        // ── Text ─────────────────────────────────────────────────────────
        ink: {
          DEFAULT: '#1F2933',   // primary text
          secondary: '#667085', // secondary text
          muted:     '#9AA3AE', // placeholder / disabled
        },
        // ── Borders ──────────────────────────────────────────────────────
        border: {
          DEFAULT: '#D9DEE3',
          strong:  '#B0BAC4',
        },
        // ── Semantic Status (muted, professional) ─────────────────────────
        approved: {
          bg:   '#EAF5EE',
          text: '#237A4B',
          border: '#B7DECA',
        },
        rejected: {
          bg:   '#FCEEEE',
          text: '#B42318',
          border: '#F5C2BE',
        },
        review: {
          bg:   '#FFF5E5',
          text: '#9A6700',
          border: '#F5D99A',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card:       '0 1px 3px 0 rgba(18,48,74,0.07), 0 1px 2px -1px rgba(18,48,74,0.05)',
        'card-hover':'0 3px 10px 0 rgba(18,48,74,0.10), 0 1px 4px -1px rgba(18,48,74,0.06)',
      },
    },
  },
  plugins: [],
}
