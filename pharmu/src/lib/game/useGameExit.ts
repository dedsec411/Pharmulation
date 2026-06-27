import { useNavigate } from "@tanstack/react-router";

/**
 * Returns an onExit handler for game routes.
 * Shows a browser confirm dialog before navigating away mid-game.
 */
export function useGameExit(to = "/modes") {
  const navigate = useNavigate();
  return function onExit() {
    const confirmed = window.confirm("Exit this case? Your progress will be lost.");
    if (confirmed) navigate({ to: to as any });
  };
}
