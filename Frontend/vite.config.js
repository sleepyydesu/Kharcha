import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ── Dev Proxy ────────────────────────────────────────────────
// Without this, /api/* requests from the Vite dev server (port 5173)
// go nowhere. This forwards them to the backend on port 5000.
//
// HOW IT WORKS:
//   Browser → http://localhost:5173/api/auth/signin
//   Vite proxy → http://localhost:5000/api/auth/signin
//
// This also avoids CORS issues because the browser only ever
// talks to localhost:5173 (same origin). The proxy makes the
// backend request server-side.

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000", // ← backend port (default: 5000)
        changeOrigin: true,
        secure: false,
        // Uncomment to see proxy activity in terminal:
        // configure: (proxy) => { proxy.on('error', (err) => console.log('proxy error', err)) }
      },
    },
  },
});
