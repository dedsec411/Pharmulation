import { QueryClient, QueryCache } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    // Surface failed queries instead of letting them render as empty state.
    // Errors are keyed by message so a burst of failures (e.g. the network
    // dropping) collapses into one toast rather than stacking.
    queryCache: new QueryCache({
      onError: (error) => {
        if (typeof window === "undefined") return;
        const message = error instanceof Error && error.message
          ? error.message
          : "Something went wrong. Please try again.";
        toast.error(message, { id: message });
      },
    }),
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
