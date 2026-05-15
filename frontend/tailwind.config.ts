import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      /* ─── ArcoDesign Color Tokens ─── */
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          light: 'var(--color-primary-light)',
          hover: 'var(--color-primary-hover)',
          active: 'var(--color-primary-active)',
        },
        bg: {
          page: 'var(--color-bg-page)',
          card: 'var(--color-bg-card)',
          sidebar: 'var(--color-bg-sidebar)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          disabled: 'var(--color-text-disabled)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          light: 'var(--color-border-light)',
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
        info: 'var(--color-info)',
        overlay: 'var(--color-overlay)',

        /* ─── Shadcn/ui 兼容 ─── */
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        ring: 'var(--ring)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        input: 'var(--input)',
      },

      /* ─── ArcoDesign Radius Tokens ─── */
      borderRadius: {
        sm: 'var(--radius-sm, 2px)',
        md: 'var(--radius-md, 4px)',
        lg: 'var(--radius-lg, 8px)',
        card: 'var(--radius-lg, 8px)',     /* 兼容旧引用 */
        panel: 'var(--radius-lg, 8px)',
        btn: 'var(--radius-md, 4px)',
        input: 'var(--radius-md, 4px)',
        tag: 'var(--radius-tag, 2px)',
      },

      /* ─── ArcoDesign Shadow Tokens ─── */
      boxShadow: {
        '1': 'var(--shadow-1)',
        '2': 'var(--shadow-2)',
        '3': 'var(--shadow-3)',
        '4': 'var(--shadow-4)',
      },

      /* ─── ArcoDesign Font ─── */
      fontFamily: {
        sans: [
          'Nunito',
          'PingFang SC',
          'Microsoft YaHei',
          '微软雅黑',
          'system-ui',
          'sans-serif',
        ],
      },
      fontSize: {
        '2xs': ['10px', '1.4'],
        xs: ['12px', '1.4'],
        sm: ['14px', '1.4'],
        base: ['14px', '1.4'],   /* 主字号 14px */
        lg: ['16px', '1.4'],
        xl: ['18px', '1.4'],
        '2xl': ['20px', '1.4'],
        '3xl': ['24px', '1.3'],
        '4xl': ['28px', '1.3'],
        '5xl': ['36px', '1.2'],
      },
    },
  },
  plugins: [],
};

export default config;
