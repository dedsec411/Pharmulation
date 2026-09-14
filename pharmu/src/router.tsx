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
    defaultOptions: {
      queries: {
        // Every page was loading its data twice.
        //
        // The default staleTime is 0, which marks a result stale the instant
        // it lands, and the default refetchOnWindowFocus then refetches
        // everything the moment the window takes focus - which is exactly
        // what happens a beat after any navigation or page load. So the page
        // painted with data, then immediately went back to loading and
        // painted again.
        //
        // Thirty seconds is long enough to cover that second-load window and
        // short enough that anything a learner comes back to is still fresh.
        staleTime: 30_000,
        // A tab regaining focus is not a reason to re-read the whole screen.
        // The leaderboard subscribes to postgres changes for the one case
        // where live data genuinely matters.
        refetchOnWindowFocus: false,
        // Reconnecting after a dropped network is worth a refetch; a mount of
        // data fetched seconds ago is not.
        refetchOnMount: true,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // The reset to the top on a page change inherited the stylesheet's
    // scroll-behavior: smooth, so every new page arrived scrolled to wherever
    // the last one was left and then visibly slid up to the top over half a
    // second. Instant for navigation; in-page scrolling keeps the smooth rule.
    scrollRestorationBehavior: "instant",
    defaultPreloadStaleTime: 0,
  });

  return router;
};
