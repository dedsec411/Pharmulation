import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: {
    preset: "netlify",
  },
  tanstackStart: {
    server: { entry: "server" },
    router: {
      autoCodeSplitting: true,
    },
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (id.includes("@tanstack/")) return "vendor-tanstack";
            if (id.includes("@supabase/")) return "vendor-supabase";
            if (id.includes("framer-motion")) return "vendor-motion";
            if (id.includes("@radix-ui/") || id.includes("lucide-react") || id.includes("sonner")) return "vendor-ui";
            if (id.includes("react") || id.includes("scheduler")) return "vendor-react";
          },
        },
      },
    },
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
