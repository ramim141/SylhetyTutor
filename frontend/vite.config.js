import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Inside Docker, file events from the Windows host don't arrive, so poll (set in docker-compose.yml)
    watch: { usePolling: process.env.CHOKIDAR_USEPOLLING === "true" },
  },
});
