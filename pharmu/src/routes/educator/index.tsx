import { createFileRoute, redirect } from "@tanstack/react-router";

/** /educator on its own is not a page; the overview is. */
export const Route = createFileRoute("/educator/")({
  beforeLoad: () => {
    throw redirect({ to: "/educator/dashboard" });
  },
});
