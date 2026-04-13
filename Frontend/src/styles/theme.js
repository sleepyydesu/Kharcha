/**
 * theme.js — Single source of truth for all Kharcha colors.
 *
 * To change any color in the app, edit it here.
 * Run `node src/styles/theme.js` to regenerate variables.css,
 * or just update variables.css manually using the values below as reference.
 *
 * Every CSS variable used anywhere in the app is defined here.
 */

export const theme = {
  light: {
    // ── Brand ────────────────────────────────────────────────
    /** Primary green — sidebar, buttons, accents */
    primary:           "#1a5c39",
    /** Hover/darker shade of primary */
    primaryDark:       "#154d30",
    /** Yellow accent — balance amount, active nav item */
    accent:            "#f5c800",
    /** Light tint of accent for selected states */
    accentSelected:    "#f0d973",
    /** Text on primary-colored backgrounds */
    primaryText:       "#133f28",

    // ── Page backgrounds ────────────────────────────────────
    /** Main page background */
    background:        "#faf9f6",
    /** Slightly darker surface (cards, hover rows) */
    shadedBackground:  "#f4f4f0",
    /** Card / panel background */
    card:              "#ffffff",

    // ── Borders ─────────────────────────────────────────────
    /** Default border */
    border:            "#e2e1da",
    /** Subtle border (panels, separators) */
    borderSubtle:      "#eeede6",
    /** Sidebar panel border */
    borderPanel:       "#e8ece5",

    // ── Text ────────────────────────────────────────────────
    /** Primary text */
    text:              "#111111",
    /** Secondary / subdued text */
    textSub:           "#666666",
    /** Muted text (timestamps, placeholders) */
    textMuted:         "#999999",
    /** Sidebar inactive item text */
    textSidebarItem:   "rgba(255,255,255,0.75)",
    /** Balance panel hello label */
    textHello:         "#8a9e90",

    // ── Inputs ──────────────────────────────────────────────
    /** Input background */
    inputBg:           "#faf9f6",

    // ── Status colors ────────────────────────────────────────
    /** Success green text */
    successText:       "#1a5c39",
    /** Success green bg */
    successBg:         "#e6f4ed",
    /** Success green border */
    successBorder:     "#c6e8d4",
    /** Error red text */
    errorText:         "#c0392b",
    /** Error red bg */
    errorBg:           "#fff5f5",
    /** Error red border */
    errorBorder:       "#fecaca",
    /** Warning amber text */
    warningText:       "#8a6b00",
    /** Warning amber bg */
    warningBg:         "#fffbe6",
    /** Warning amber border */
    warningBorder:     "#f5e090",

    // ── Action icon tints ────────────────────────────────────
    /** Blue icon chip */
    iconBleBg:         "#e8f0fe",
    iconBleText:       "#1a56db",
    /** Amber icon chip */
    iconAmberBg:       "#fff7e0",
    iconAmberText:     "#b45309",
    /** Purple icon chip */
    iconPurpleBg:      "#f3e8ff",
    iconPurpleText:    "#7c3aed",

    // ── KYC card ─────────────────────────────────────────────
    kycBg:             "#f0faf4",
    kycBorder:         "#c6e8d4",
    kycIcon:           "#1a5c39",

    // ── Category icon SVG color ──────────────────────────────
    /** Color used for all SVG category icons via CSS mask.
     *  Change this one value to recolor every default icon at once.
     *  Per-category color from the DB overrides this per-icon. */
    categoryIconColor:   "#1a5c39",

    // ── Skeleton shimmer ─────────────────────────────────────
    skelFrom:          "#f0eeea",
    skelTo:            "#e8e6e1",

    // ── Shadows / radius ─────────────────────────────────────
    shadow:            "0 2px 8px rgba(0,0,0,0.1)",
    shadowCard:        "0 2px 12px rgba(0,0,0,0.07)",
    radius:            "15px",

    // ── Layout ───────────────────────────────────────────────
    sidebarWidth:      "18rem",
  },

  dark: {
    // ── Brand ────────────────────────────────────────────────
    primary:           "#212328",
    primaryDark:       "#154d30",
    accent:            "#f5c800",
    accentSelected:    "#d4b800",
    primaryText:       "#133f28",

    // ── Page backgrounds ────────────────────────────────────
    background:        "#0c1014",
    shadedBackground:  "#0c1014",
    card:              "#212328",

    // ── Borders ─────────────────────────────────────────────
    border:            "#4b4b4b",
    borderSubtle:      "#4b4b4b",
    borderPanel:       "#4b4b4b",

    // ── Text ────────────────────────────────────────────────
    text:              "#ffffff",
    textSub:           "#bebebe",
    textMuted:         "#a8a8a8",
    textSidebarItem:   "rgba(255,255,255,0.75)",
    textHello:         "#adadad",

    // ── Inputs ──────────────────────────────────────────────
    inputBg:           "#292929",

    // ── Status colors ────────────────────────────────────────
    successText:       "#4ade80",
    successBg:         "#1a3325",
    successBorder:     "#2e5040",
    errorText:         "#f87171",
    errorBg:           "#2a1010",
    errorBorder:       "#5a2020",
    warningText:       "#fbbf24",
    warningBg:         "#2a2200",
    warningBorder:     "#4a3a00",

    // ── Action icon tints ────────────────────────────────────
    iconBleBg:         "#1e2f4d",
    iconBleText:       "#60a5fa",
    iconAmberBg:       "#2a1f00",
    iconAmberText:     "#fbbf24",
    iconPurpleBg:      "#2d1f4a",
    iconPurpleText:    "#c084fc",

    // ── KYC card ─────────────────────────────────────────────
    kycBg:             "#152014",
    kycBorder:         "#2e4f35",
    kycIcon:           "#4ade80",

    // ── Category icon SVG color ──────────────────────────────
    categoryIconColor:   "#e5e7eb",

    // ── Skeleton shimmer ─────────────────────────────────────
    skelFrom:          "#1a2e20",
    skelTo:            "#223528",

    // ── Shadows / radius ─────────────────────────────────────
    shadow:            "0 2px 8px rgba(0,0,0,0.35)",
    shadowCard:        "0 2px 16px rgba(0,0,0,0.3)",
    radius:            "15px",

    // ── Layout ───────────────────────────────────────────────
    sidebarWidth:      "18rem",
  },
};

/**
 * CSS variable names mapping.
 * These are the var(--name) tokens used throughout all CSS files.
 */
export const cssVarMap = {
  primary:           "--primary",
  primaryDark:       "--primary-dark",
  accent:            "--accent",
  accentSelected:    "--selected",
  primaryText:       "--primary-text",

  background:        "--background",
  shadedBackground:  "--shaded-background",
  card:              "--card",

  border:            "--border",
  borderSubtle:      "--border-subtle",
  borderPanel:       "--border-panel",

  text:              "--text-color",
  textSub:           "--text-sub",
  textMuted:         "--text-muted",
  textSidebarItem:   "--text-sidebar-item",
  textHello:         "--text-hello",

  inputBg:           "--input-bg",

  successText:       "--success-text",
  successBg:         "--success-bg",
  successBorder:     "--success-border",
  errorText:         "--error-text",
  errorBg:           "--error-bg",
  errorBorder:       "--error-border",
  warningText:       "--warning-text",
  warningBg:         "--warning-bg",
  warningBorder:     "--warning-border",

  iconBleBg:         "--icon-blue-bg",
  iconBleText:       "--icon-blue-text",
  iconAmberBg:       "--icon-amber-bg",
  iconAmberText:     "--icon-amber-text",
  iconPurpleBg:      "--icon-purple-bg",
  iconPurpleText:    "--icon-purple-text",

  kycBg:             "--kyc-bg",
  kycBorder:         "--kyc-border",
  kycIcon:           "--kyc-icon",

  categoryIconColor:   "--category-icon-color",

  skelFrom:          "--skel-from",
  skelTo:            "--skel-to",

  shadow:            "--shadow",
  shadowCard:        "--shadow-card",
  radius:            "--radius",
  sidebarWidth:      "--sidebar-width",
};

export default theme;