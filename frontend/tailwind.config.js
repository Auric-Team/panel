/** @type {import('tailwindcss').Config} */
function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `color-mix(in srgb, var(${variableName}) calc(${opacityValue} * 100%), transparent)`;
    }
    return `var(${variableName})`;
  };
}

module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Times New Roman"', 'Georgia', '"Liberation Serif"', 'serif'],
        serif: ['"Times New Roman"', 'Georgia', '"Liberation Serif"', 'serif'],
        sans: ['Inter', 'Arial', 'Helvetica', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Cascadia Code"', 'Consolas', 'monospace'],
      },
      colors: {
        canvas: withOpacity('--canvas'),
        ink: withOpacity('--ink'),
        muted: withOpacity('--muted'),
        faint: withOpacity('--faint'),
        line: withOpacity('--line'),
        border: withOpacity('--border'),
        'border-soft': withOpacity('--border-soft'),
        surface: withOpacity('--surface'),
        'surface-hover': withOpacity('--surface-hover'),
        'surface-solid': withOpacity('--surface-solid'),
        'surface-subtle': withOpacity('--surface'),
        accent: withOpacity('--accent'),
        'accent-bright': withOpacity('--accent-bright'),
        'accent-ink': withOpacity('--accent-ink'),
        'accent-soft': withOpacity('--selection'),
        focus: withOpacity('--focus'),
        success: withOpacity('--success'),
        'success-soft': 'var(--success-fill)',
        'success-border': 'var(--success-border)',
        warning: withOpacity('--warning'),
        'warning-soft': 'var(--warning-fill)',
        'warning-border': 'var(--warning-border)',
        danger: withOpacity('--danger'),
        'danger-soft': 'var(--danger-fill)',
        'danger-border': 'var(--danger-border)',
        info: withOpacity('--info'),
        'info-soft': 'var(--info-fill)',
        'info-border': 'var(--info-border)',
        tooltip: withOpacity('--tooltip'),
        'tooltip-ink': withOpacity('--tooltip-ink'),
      },
      borderRadius: {
        xs: '4px',
        sm: '7px',
        md: '9px',
        lg: '11px',
        pill: '999px',
      },
      boxShadow: {
        ref: 'var(--shadow)',
        primary: 'var(--primary-shadow)',
      },
      backgroundImage: {
        'surface-gradient': 'var(--surface-gradient)',
        'panel-gradient': 'var(--panel-gradient)',
        'primary-gradient': 'var(--primary-gradient)',
      },
    },
  },
  plugins: [],
};

