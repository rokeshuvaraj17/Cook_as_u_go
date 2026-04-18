/**
 * Kitchen app palette: warm cream base, vivid terracotta CTAs, jewel sage accents.
 * Higher chroma than the previous beige/sage mix so screens feel lively, not muddy.
 */
export const colors = {
  bg: '#FFF5EC',
  canvas: '#FFFFFF',
  surface: '#FFF9F4',
  surfaceCard: '#FFFFFF',
  surfaceInput: '#FFF1E5',

  /** Auth hero + gradients */
  heroTop: '#6BC4A3',
  heroMid: '#E5D0BE',
  heroBottom: '#FFF5EC',

  /** Soft wash behind home scroll (mint → cream) */
  homeGradientTop: '#A8E0CA',
  homeGradientBottom: '#FFF5EC',

  text: '#1A1714',
  textSecondary: '#4F4842',
  textMuted: '#7D756C',

  /** Main actions — saturated coral-terracotta */
  primary: '#E2562E',
  primaryPressed: '#C24322',
  primaryMuted: 'rgba(226, 86, 46, 0.14)',

  /** Accents, links, pantry/bills chrome */
  sage: '#147A5C',
  sagePressed: '#0F5F47',
  sageMuted: 'rgba(20, 122, 92, 0.14)',

  accent: '#147A5C',
  accentPressed: '#0F5F47',
  accentGlow: 'rgba(20, 122, 92, 0.12)',

  brand: '#E2562E',
  brandSoft: 'rgba(226, 86, 46, 0.14)',

  /** Highlights (tags, chips) — optional */
  honey: '#C9932E',
  honeyMuted: 'rgba(201, 147, 46, 0.18)',

  border: '#EDDCCD',
  borderStrong: '#D8C4B2',
  borderFocus: '#147A5C',
  borderError: '#D64545',

  success: '#147A5C',
  danger: '#C63D3D',

  bannerErrorBg: 'rgba(198, 61, 61, 0.09)',
  bannerErrorBorder: 'rgba(198, 61, 61, 0.28)',
  bannerOkBg: 'rgba(20, 122, 92, 0.1)',
  bannerOkBorder: 'rgba(20, 122, 92, 0.24)',

  decorBlush: 'rgba(226, 86, 46, 0.16)',
  decorSage: 'rgba(20, 122, 92, 0.14)',

  /** Shared shadows & overlays (replace hardcoded browns) */
  ink: '#1A1714',
  onPrimary: '#FFFFFF',
  overlayScrim: 'rgba(26, 23, 20, 0.5)',
  overlayTint: 'rgba(26, 23, 20, 0.36)',
} as const;
