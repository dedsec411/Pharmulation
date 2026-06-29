import { j as jsxRuntimeExports } from "../_libs/react.mjs";
import { u as useRouter, e as useNavigate } from "../_libs/tanstack__react-router.mjs";
import { m as motion } from "../_libs/framer-motion.mjs";
import { Q as ArrowLeft } from "../_libs/lucide-react.mjs";
function BackButton({ to, label = "Back", className = "" }) {
  const router = useRouter();
  const navigate = useNavigate();
  function handleBack() {
    if (to) navigate({ to });
    else router.history.back();
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    motion.button,
    {
      onClick: handleBack,
      initial: { opacity: 0, x: -8 },
      animate: { opacity: 1, x: 0 },
      transition: { duration: 0.25 },
      whileHover: { scale: 1.04, x: -2 },
      whileTap: { scale: 0.97 },
      className: `
        group inline-flex items-center gap-2
        rounded-xl
        px-4 py-2
        text-sm font-semibold
        text-foreground/90
        border border-white/15
        bg-white/[0.07]
        backdrop-blur-2xl
        shadow-[0_8px_30px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.16)]
        hover:bg-white/[0.12] hover:border-white/25 hover:text-foreground
        transition-all duration-150
        ${className}
      `,
      "aria-label": label,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: label })
      ]
    }
  );
}
export {
  BackButton as B
};
