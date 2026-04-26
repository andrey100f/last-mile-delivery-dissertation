import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

// PrimeNG preset mapped to CSS variables declared in src/styles/theme.css.
// Semantic extensions map Aura tokens to app CSS variables in src/styles/theme.css.
// Cast preserves compatibility when Aura typing is stricter than our overrides.
const DeliveryPreset = definePreset(Aura, {
  semantic: {
    borderRadius: {
      none: '0',
      xs: 'var(--p-radius-sm)',
      sm: 'var(--p-radius-sm)',
      md: 'var(--p-radius-md)',
      lg: 'var(--p-radius-lg)',
      xl: 'var(--p-radius-xl)',
    },
    focusRing: {
      width: '4px',
      style: 'solid',
      color: 'var(--p-primary)',
      offset: '2px',
      shadow: 'none',
    },
    colorScheme: {
      light: {
        primary: {
          color: 'var(--p-primary)',
          contrastColor: 'var(--p-primary-text)',
          hoverColor: 'var(--p-primary-hover)',
          activeColor: 'var(--p-primary-active)',
        },
        highlight: {
          background: 'var(--p-primary-light)',
          color: 'var(--p-primary)',
        },
        surface: {
          0: 'var(--p-surface-section)',
          50: 'var(--p-surface-ground)',
          100: 'var(--p-surface-hover)',
          200: 'var(--p-surface-border)',
          300: 'var(--p-text-disabled)',
          400: 'var(--p-text-muted)',
          500: 'var(--p-secondary)',
          600: 'var(--p-secondary-hover)',
          700: 'var(--p-text-secondary)',
          800: 'var(--p-text-primary)',
          900: 'var(--p-text-primary)',
          950: 'var(--p-text-primary)',
        },
        text: {
          color: 'var(--p-text-primary)',
          hoverColor: 'var(--p-text-secondary)',
          mutedColor: 'var(--p-text-muted)',
        },
        formField: {
          background: 'var(--p-surface-card)',
          disabledBackground: 'var(--p-surface-hover)',
          filledBackground: 'var(--p-surface-card)',
          filledHoverBackground: 'var(--p-surface-hover)',
          filledFocusBackground: 'var(--p-surface-card)',
          borderColor: 'var(--p-surface-border)',
          hoverBorderColor: 'var(--p-text-secondary)',
          focusBorderColor: 'var(--p-primary)',
          invalidBorderColor: 'var(--p-danger)',
          color: 'var(--p-text-primary)',
          disabledColor: 'var(--p-text-disabled)',
          placeholderColor: 'var(--p-text-muted)',
          floatLabelColor: 'var(--p-text-secondary)',
          floatLabelFocusColor: 'var(--p-primary)',
          floatLabelActiveColor: 'var(--p-text-secondary)',
          floatLabelInvalidColor: 'var(--p-danger)',
        },
      },
      dark: {
        primary: {
          color: 'var(--p-primary)',
          contrastColor: 'var(--p-primary-text)',
          hoverColor: 'var(--p-primary-hover)',
          activeColor: 'var(--p-primary-active)',
        },
        highlight: {
          background: 'var(--p-primary-light)',
          color: 'var(--p-primary)',
        },
        surface: {
          0: 'var(--p-surface-ground)',
          50: 'var(--p-surface-section)',
          100: 'var(--p-surface-hover)',
          200: 'var(--p-surface-border)',
          300: 'var(--p-text-disabled)',
          400: 'var(--p-text-muted)',
          500: 'var(--p-secondary)',
          600: 'var(--p-secondary-hover)',
          700: 'var(--p-text-secondary)',
          800: 'var(--p-text-primary)',
          900: 'var(--p-text-primary)',
          950: 'var(--p-text-primary)',
        },
        text: {
          color: 'var(--p-text-primary)',
          hoverColor: 'var(--p-text-secondary)',
          mutedColor: 'var(--p-text-muted)',
        },
        formField: {
          background: 'var(--p-surface-card)',
          disabledBackground: 'var(--p-surface-hover)',
          filledBackground: 'var(--p-surface-card)',
          filledHoverBackground: 'var(--p-surface-hover)',
          filledFocusBackground: 'var(--p-surface-card)',
          borderColor: 'var(--p-surface-border)',
          hoverBorderColor: 'var(--p-text-secondary)',
          focusBorderColor: 'var(--p-primary)',
          invalidBorderColor: 'var(--p-danger)',
          color: 'var(--p-text-primary)',
          disabledColor: 'var(--p-text-disabled)',
          placeholderColor: 'var(--p-text-muted)',
          floatLabelColor: 'var(--p-text-secondary)',
          floatLabelFocusColor: 'var(--p-primary)',
          floatLabelActiveColor: 'var(--p-text-secondary)',
          floatLabelInvalidColor: 'var(--p-danger)',
        },
      },
    },
  },
} as never);

export default DeliveryPreset;

