import "./CategoryIcon.css";

/**
 * CategoryIcon
 *
 * Renders a category icon in one of three modes:
 *
 *   1. SVG  (icon_type === "svg")
 *      The SVG is loaded as a CSS mask so its colour comes from
 *      the --category-icon-color CSS variable (or the `color` prop).
 *      Change the variable once in :root → all default icons update.
 *
 *   2. PNG  (icon_type === "png")
 *      Rendered as a plain <img>. Colour is baked into the image.
 *
 *   3. Placeholder
 *      When icon_url is null/empty — shows the first letter of name.
 *
 * Props
 * ─────
 *  iconUrl   string | null   Full Supabase Storage public URL
 *  iconType  "svg" | "png"   Column value from categories table
 *  name      string          Category name (used for placeholder + alt text)
 *  color     string          Hex colour — overrides CSS variable for SVGs,
 *                            used as background tint for the icon container
 *  size      number          Icon size in px (default 28)
 *  className string          Extra class on the outer wrapper
 *
 * Usage
 * ─────
 *  <CategoryIcon
 *    iconUrl={cat.icon_url}
 *    iconType={cat.icon_type}
 *    name={cat.name}
 *    color={cat.color}
 *    size={32}
 *  />
 */
export default function CategoryIcon({
  iconUrl,
  iconType = "svg",
  name = "",
  color,
  size = 28,
  className = "",
}) {
  // ── Derive size class ────────────────────────────────────────
  const sizeClass =
    size <= 20 ? "cat-icon--sm"
    : size <= 32 ? "cat-icon--md"
    : size <= 48 ? "cat-icon--lg"
    : "cat-icon--xl";

  const wrapStyle = {
    width:  size,
    height: size,
    // Subtle tinted background behind the icon using the category's color
    // at low opacity so it works for both SVG and PNG modes
    backgroundColor: color ? `${color}18` : undefined,
  };

  // ── No URL: show letter placeholder ─────────────────────────
  if (!iconUrl) {
    return (
      <span
        className={`cat-icon cat-icon__placeholder ${sizeClass} ${className}`}
        style={{ ...wrapStyle, fontSize: size * 0.4 }}
        aria-label={name}
        title={name}
      >
        {name.charAt(0).toUpperCase()}
      </span>
    );
  }

  // ── PNG: user-uploaded static image ─────────────────────────
  if (iconType === "png") {
    return (
      <span
        className={`cat-icon ${sizeClass} ${className}`}
        style={wrapStyle}
      >
        <img
          src={iconUrl}
          alt={name}
          title={name}
          width={size}
          height={size}
          className="cat-icon__png"
          style={{ width: size, height: size }}
        />
      </span>
    );
  }

  // ── SVG: theme-aware via CSS mask ────────────────────────────
  // The SVG acts as a clipping mask; background-color is the visible colour.
  // `color` prop overrides the global --category-icon-color variable inline.
  const maskStyle = {
    "--_icon-url": `url(${iconUrl})`,
    // Per-icon colour override (falls back to CSS variable when not set)
    // Set the CSS variable, NOT backgroundColor directly.
    // This keeps the CSS cascade intact — any stylesheet rule or parent
    // that sets --category-icon-color will now actually take effect.
    ...(color ? { "--category-icon-color": color } : {}),
    width:  size,
    height: size,
  };

  return (
    <span
      className={`cat-icon ${sizeClass} ${className}`}
      style={wrapStyle}
      title={name}
      aria-label={name}
    >
      <span
        className="cat-icon__svg-mask"
        style={maskStyle}
        role="img"
        aria-hidden="true"
      />
    </span>
  );
}