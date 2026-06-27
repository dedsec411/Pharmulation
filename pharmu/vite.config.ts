import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    server: {
      allowedHosts: [
        "all",
        ".ngrok-free.dev",
        ".ngrok-free.app",
        ".ngrok.io",
        "headpiece-trembling-uncross.ngrok-free.dev",
      ],
      host: "0.0.0.0",
    },
  },
});