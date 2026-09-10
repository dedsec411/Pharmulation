import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Vercel defaults a function to 10 seconds. Reading a photographed
  // prescription is the one request here that can legitimately take longer,
  // and at the default it was being killed mid-read - which surfaced as
  // "could not read that image" however good the photo was. The server keeps
  // its own budget (LENS_BUDGET_MS) well short of this, so this is headroom
  // rather than a licence to hang.
  //
  // Nitro passes `vercel` straight through to its Vercel preset and it lands
  // in .vercel/output/functions/__server.func/.vc-config.json, verified after
  // build. The wrapper's published types only describe preset/output/
  // cloudflare, so the shape is asserted down to the part they do describe.
  nitro: {
    preset: "vercel",
    vercel: { functions: { maxDuration: 60 } },
  } as { preset: string },
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
