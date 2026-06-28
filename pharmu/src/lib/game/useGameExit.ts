import { useNavigate } from "@tanstack/react-router";

/**
 * Returns an onExit handler for game routes.
 */
export function useGameExit(to = "/modes") {
  const navigate = useNavigate();
  return function onExit() {
    navigate({ to: to as any });
  };
}
