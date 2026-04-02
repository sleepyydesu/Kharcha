// KharchaLogo.jsx
// The "K" SVG logo for Kharcha – green + yellow theme.
// Props:
//   size  – pixel size of the logo (default 40)

function KharchaLogo({ size = 40 }) {
  return (
    <svg
      className="logo-icon"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Kharcha logo"
    >
      {/* White rounded square background */}
      <rect width="100" height="100" rx="22" fill="#ffffff" />

      {/*
        The K shape is drawn in a 823×841 coordinate space.
        We scale it down with scale(0.075) and translate to center it
        inside the 100×100 viewBox.
      */}
      <g transform="translate(22, 18) scale(0.075)">
        {/* Bottom-right arm — dark green */}
        <path d="M546.5 840L301.5 580.5L449.5 442L821.5 840H546.5Z" fill="#2B724F" />
        {/* Left vertical bar — medium green */}
        <path d="M0.5 840V1H224.5V840H0.5Z" fill="#4B9C6E" />
        {/* Top-right arm — golden yellow */}
        <path d="M284.5 499V242.5L544.5 0.5H818L284.5 499Z" fill="#FBA711" />
      </g>
    </svg>
  );
}

export default KharchaLogo;
