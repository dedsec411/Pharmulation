import { j as jsxRuntimeExports, r as reactExports } from "../_libs/react.mjs";
import { u as useGameExit, a as useDifficultyChoice, b as useCaseLoader, c as useTimer, d as useErrorPanel, F as FeedbackScreen, G as GameHeader } from "./DifficultySelect-BEVgRkEv.mjs";
import { M as ModeTheme } from "./ModeTheme-Dcsp8zjD.mjs";
import { M as MODE_TIMERS, c as computeScore, s as submitScore, t as toastScore, b as bumpCounterBadge, g as awardBadge } from "./shared-Bfopko4w.mjs";
import { u as useAuthStore } from "./router-D8H_Rjl1.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import "../_libs/seroval.mjs";
import { P as Pill, a8 as CupSoda, a9 as PackageCheck, v as Sparkles, N as Thermometer, aa as Droplets, Y as Check, i as FlaskConical, ab as Cog } from "../_libs/lucide-react.mjs";
import { m as motion } from "../_libs/framer-motion.mjs";
import "../_libs/tanstack__react-router.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
import "./client-CGYRwklv.mjs";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
import "./ModeAmbientLayer-B2Acv9Tx.mjs";
import "../_libs/tanstack__query-core.mjs";
import "../_libs/tanstack__react-query.mjs";
import "./vendor-tanstack-Cnrvb9Cp.mjs";
import "node:async_hooks";
import "../_libs/h3-v2.mjs";
import "../_libs/rou3.mjs";
import "../_libs/srvx.mjs";
import "../_libs/radix-ui__react-slot.mjs";
import "../_libs/radix-ui__react-compose-refs.mjs";
import "../_libs/class-variance-authority.mjs";
import "../_libs/clsx.mjs";
import "../_libs/tailwind-merge.mjs";
import "../_libs/zustand.mjs";
import "../_libs/zod.mjs";
import "../_libs/motion-dom.mjs";
import "../_libs/motion-utils.mjs";
const LIMIT = MODE_TIMERS.industry;
const STAGES = ["mixing", "granulation", "drying", "compression", "coating", "packaging"];
const PRODUCT_FORMS = [{
  form: "Tablet",
  icon: Pill,
  desc: "Solid oral dosage manufacturing with compression and coating controls.",
  types: ["Immediate-release tablet", "Film-coated tablet", "Enteric-coated tablet", "Chewable tablet"]
}, {
  form: "Syrup",
  icon: CupSoda,
  desc: "Liquid oral preparation with solution clarity, viscosity, and fill checks.",
  types: ["Simple syrup", "Antitussive syrup", "Pediatric syrup", "Sugar-free syrup"]
}, {
  form: "Capsule",
  icon: PackageCheck,
  desc: "Encapsulated dosage form with blend uniformity and shell filling checks.",
  types: ["Hard gelatin capsule", "Soft gelatin capsule", "Delayed-release capsule", "Powder-filled capsule"]
}, {
  form: "Semi-solid",
  icon: Sparkles,
  desc: "Topical product preparation with base consistency and contamination control.",
  types: ["Cream", "Ointment", "Gel", "Lotion"]
}];
function parseBatchCount(batchSize) {
  if (typeof batchSize === "number" && Number.isFinite(batchSize)) return batchSize;
  if (typeof batchSize !== "string") return 0;
  const match = batchSize.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}
function formatAmount(value) {
  return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(void 0, {
    maximumFractionDigits: 2
  });
}
function scaleAmount(value, scale) {
  if (typeof value !== "number" || !Number.isFinite(value)) return value;
  return Math.round(value * scale * 100) / 100;
}
function formatBatchSize(template, count) {
  const formatted = formatAmount(count);
  if (typeof template !== "string") return `${formatted} units`;
  if (/\d/.test(template)) {
    return template.replace(/[\d,]+(\.\d+)?/, formatted);
  }
  return `${formatted} ${template}`.trim();
}
function seededHash(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function stableShuffle(items, seed) {
  return items.map((item, index) => ({
    item,
    key: seededHash(`${seed}:${index}:${JSON.stringify(item)}`)
  })).sort((a, b) => a.key - b.key).map(({
    item
  }) => item);
}
function displayWeight(value, unit = "g") {
  const decimals = Math.abs(value) < 10 && !Number.isInteger(value) ? 2 : 1;
  return `${value.toFixed(decimals)} ${unit}`;
}
function ingredient(name, role, target, unit = "g", tolerance = 0.03) {
  return {
    name,
    role,
    target,
    min: Math.round(target * (1 - tolerance) * 100) / 100,
    max: Math.round(target * (1 + tolerance) * 100) / 100,
    unit
  };
}
function option(prompt, options, correct) {
  return {
    prompt,
    options,
    correct
  };
}
function drying(target, min, max, unit = "C") {
  return {
    target,
    min,
    max,
    unit
  };
}
function tabletFormula(type) {
  const coated = /film|enteric/i.test(type);
  const enteric = /enteric/i.test(type);
  const chewable = /chewable/i.test(type);
  const api = chewable ? "Paracetamol DC granules" : enteric ? "Diclofenac sodium" : "Ibuprofen";
  const coatRole = enteric ? "Enteric polymer coat" : "Film coat";
  const coat = enteric ? "Methacrylic acid copolymer" : "HPMC coating premix";
  return {
    batchSize: "20,000 tablets",
    ingredients: [ingredient(api, "Active", chewable ? 1e4 : enteric ? 1500 : 4e3, "g", 0.02), ingredient(chewable ? "Mannitol" : "Microcrystalline cellulose", chewable ? "Chewable filler" : "Filler", chewable ? 18e3 : 12e3), ingredient(chewable ? "Aspartame" : "Croscarmellose sodium", chewable ? "Sweetener" : "Disintegrant", chewable ? 300 : 1500, "g", 0.04), ingredient("Magnesium stearate", "Lubricant", 400, "g", 0.05), ...coated ? [ingredient(coat, coatRole, enteric ? 900 : 650, "g", 0.04)] : []],
    distractors: ["Sodium benzoate", "Carbomer 940", "Gelatin shells", "Sorbitol solution"],
    env: {
      tempRange: [20, 25],
      humidityRange: enteric ? [30, 45] : [35, 55]
    },
    stageLabels: {
      mixing: "blend",
      granulation: chewable ? "dry granulation" : "granulation",
      drying: "drying",
      compression: "compression",
      coating: coated ? "coating" : "dedusting",
      packaging: "blister packing"
    },
    process: {
      mixing: option("Choose the correct blend time.", ["5 min tumble", "20 min bin blend", "90 min high shear", "No blending required"], 1),
      granulation: option("Choose the right granulation method.", chewable ? ["Wet granulation", "Dry compaction", "Aqueous coating", "Direct filling"] : ["Dry compaction only", "Wet granulation with binder endpoint", "Shell filling", "Emulsification"], chewable ? 1 : 1),
      drying: drying(enteric ? 42 : 50, enteric ? 38 : 45, enteric ? 46 : 55),
      compression: option("Set the compression target.", ["Soft tablets, no hardness check", "Hardness and weight variation in range", "Fill into bottles without compression", "Heat until clear"], 1),
      coating: option("Pick the final surface process.", coated ? [enteric ? "Sugar coat" : "Enteric coat", enteric ? "Enteric polymer coat to target weight gain" : "HPMC film coat to uniform coverage", "Nozzle off, tumble only", "Sterile filtration"] : ["Apply enteric coat", "Dedust and metal-detect cores", "Add syrup flavor", "Fill into capsules"], 1),
      packaging: option("Select packaging control.", ["Unsealed bulk tray", "Blister with leak test and line clearance", "Amber syrup bottle", "Aluminum tube crimp"], 1)
    },
    qc: [{
      test: "Average weight",
      result: "Within +/- 3.2%",
      shouldPass: true
    }, {
      test: "Content uniformity",
      result: "AV 9.4",
      shouldPass: true
    }, {
      test: coated ? "Coating integrity" : "Disintegration",
      result: enteric ? "No rupture in acid stage" : coated ? "Uniform, no picking" : "9 minutes",
      shouldPass: true
    }, {
      test: "Friability",
      result: chewable ? "1.3%" : "0.42%",
      shouldPass: !chewable
    }],
    release: !chewable
  };
}
function syrupFormula(type) {
  const sugarFree = /sugar-free/i.test(type);
  const pediatric = /pediatric/i.test(type);
  const antitussive = /antitussive/i.test(type);
  return {
    batchSize: "1,000 L",
    ingredients: [ingredient(antitussive ? "Dextromethorphan HBr" : pediatric ? "Paracetamol" : "Chlorpheniramine maleate", "Active", antitussive ? 1.5 : pediatric ? 24 : 0.4, "kg", 0.025), ingredient(sugarFree ? "Sorbitol 70%" : "Sucrose", sugarFree ? "Sugar-free vehicle" : "Syrup base", sugarFree ? 420 : 650, "kg", 0.03), ingredient("Purified water", "Vehicle", sugarFree ? 560 : 320, "L", 0.02), ingredient("Sodium benzoate", "Preservative", 1, "kg", 0.05), ingredient(pediatric ? "Orange flavor" : "Raspberry flavor", "Flavor", 2.5, "kg", 0.08)],
    distractors: ["Magnesium stearate", "Croscarmellose sodium", "Gelatin shell", "White soft paraffin"],
    env: {
      tempRange: [18, 25],
      humidityRange: [35, 65]
    },
    stageLabels: {
      mixing: "solution mixing",
      granulation: "dissolution",
      drying: "heat hold",
      compression: "filtration",
      coating: "flavoring",
      packaging: "bottle filling"
    },
    process: {
      mixing: option("Choose the correct mixing sequence.", ["Add flavor first, no water", "Dissolve preservative/API before final volume", "Compress the blend", "Dry granulate vehicle"], 1),
      granulation: option("How should the syrup base be prepared?", ["Dissolve sweetener under controlled agitation", "Fill powder into shells", "Apply enteric polymer", "Mill dry API only"], 0),
      drying: drying(sugarFree ? 35 : 65, sugarFree ? 30 : 60, sugarFree ? 40 : 70),
      compression: option("Choose the clarification step.", ["No filtration", "Filter through approved polishing filter", "Tablet compression", "Hot crimp sealing"], 1),
      coating: option("When should flavor/color be added?", ["Before API assay", "After cooling and before final volume check", "During tablet compression", "After bottle capping"], 1),
      packaging: option("Select fill control.", ["Random fill without volume check", "Calibrated bottle fill with torque check", "Blister leak test", "Tube crimp only"], 1)
    },
    qc: [{
      test: "Assay",
      result: antitussive ? "98.8%" : "101.2%",
      shouldPass: true
    }, {
      test: "pH",
      result: sugarFree ? "6.2" : "4.8",
      shouldPass: true
    }, {
      test: "Viscosity",
      result: sugarFree ? "Below target by 18%" : "Within range",
      shouldPass: !sugarFree
    }, {
      test: "Fill volume",
      result: "100.4 mL average",
      shouldPass: true
    }],
    release: !sugarFree
  };
}
function capsuleFormula(type) {
  const soft = /soft/i.test(type);
  const delayed = /delayed/i.test(type);
  return {
    batchSize: "30,000 capsules",
    ingredients: soft ? [ingredient("Vitamin D3 oil concentrate", "Active fill", 3.2, "kg", 0.025), ingredient("Medium-chain triglycerides", "Oil vehicle", 42, "kg", 0.03), ingredient("Gelatin mass", "Soft shell", 24, "kg", 0.04), ingredient("Glycerin", "Plasticizer", 8, "kg", 0.04)] : [ingredient(delayed ? "Omeprazole pellets" : "Amoxicillin trihydrate", "Active", delayed ? 6 : 15e3, delayed ? "kg" : "g", 0.02), ingredient("Lactose monohydrate", "Diluent", delayed ? 9 : 9e3, delayed ? "kg" : "g", 0.03), ingredient("Colloidal silicon dioxide", "Glidant", delayed ? 0.45 : 450, delayed ? "kg" : "g", 0.05), ingredient("Empty hard gelatin capsules", "Capsule shell", 3e4, "caps", 0.01)],
    distractors: ["Sucrose syrup", "HPMC film coat", "Carbomer gel base", "Sodium benzoate"],
    env: {
      tempRange: soft ? [20, 24] : [18, 25],
      humidityRange: delayed ? [25, 40] : [30, 50]
    },
    stageLabels: {
      mixing: soft ? "fill mixing" : "powder blending",
      granulation: delayed ? "pellet handling" : "sieving",
      drying: soft ? "shell drying" : "moisture check",
      compression: "capsule filling",
      coating: delayed ? "seal coating" : "polishing",
      packaging: "bottle packing"
    },
    process: {
      mixing: option("Choose blend/fill preparation.", soft ? ["Heat oil to smoke point", "Mix fill under gentle controlled heat", "Compress into tablets", "Add aqueous syrup"] : ["Blend until uniform with glidant", "Skip blending", "Wet granulate gelatin shells", "Boil to syrup"], 0),
      granulation: option("Choose the pre-fill handling.", delayed ? ["Crush enteric pellets", "Handle pellets gently without damaging coat", "Dissolve pellets in water", "Sugar coat shells"] : ["Sieve powder blend", "Apply topical base", "Bottle liquid", "Ignore flow"], delayed ? 1 : 0),
      drying: drying(soft ? 22 : 35, soft ? 20 : 30, soft ? 25 : 40),
      compression: option("Choose filling control.", ["Volumetric capsule filling with weight checks", "Tablet compression", "No fill-weight checks", "Tube crimp"], 0),
      coating: option("Choose post-fill finish.", delayed ? ["Aggressive polishing that abrades coat", "Seal coat integrity preserved", "Sugar syrup coating", "No shell check"] : ["Capsule polishing and metal detection", "Enteric tablet coating", "Syrup filtration", "Cream homogenization"], 0),
      packaging: option("Select package.", ["Moisture-protective bottle with desiccant", "Open tray", "Clear beaker", "Loose paper wrap"], 0)
    },
    qc: [{
      test: "Fill weight variation",
      result: "Within +/- 4%",
      shouldPass: true
    }, {
      test: "Blend uniformity",
      result: "RSD 3.1%",
      shouldPass: true
    }, {
      test: delayed ? "Acid resistance" : "Disintegration",
      result: delayed ? "Fails at 90 min acid stage" : "14 minutes",
      shouldPass: !delayed
    }, {
      test: "Appearance",
      result: soft ? "No leaks" : "Clean locked shells",
      shouldPass: true
    }],
    release: !delayed
  };
}
function semiSolidFormula(type) {
  const gel = /gel/i.test(type);
  const ointment = /ointment/i.test(type);
  const lotion = /lotion/i.test(type);
  return {
    batchSize: lotion ? "800 L" : "500 kg",
    ingredients: [ingredient(gel ? "Diclofenac diethylamine" : ointment ? "Mupirocin" : lotion ? "Calamine" : "Clotrimazole", "Active", gel ? 5.8 : ointment ? 10 : lotion ? 80 : 5, gel || ointment ? "kg" : "kg", 0.025), ingredient(gel ? "Carbomer 940" : ointment ? "White soft paraffin" : lotion ? "Zinc oxide dispersion" : "Emulsifying wax", gel ? "Gelling agent" : ointment ? "Oleaginous base" : lotion ? "Suspending phase" : "Emulsifier", gel ? 4 : ointment ? 360 : lotion ? 65 : 45, gel ? "kg" : "kg", 0.04), ingredient(gel ? "Triethanolamine" : ointment ? "Liquid paraffin" : lotion ? "Purified water" : "Purified water", gel ? "Neutralizer" : ointment ? "Levigation agent" : "Aqueous phase", gel ? 3 : ointment ? 120 : lotion ? 620 : 390, gel ? "kg" : lotion ? "L" : "kg", 0.04), ingredient("Phenoxyethanol", "Preservative", lotion ? 4 : 2.5, "kg", 0.06)],
    distractors: ["Empty gelatin capsules", "Magnesium stearate", "Croscarmellose sodium", "Enteric polymer"],
    env: {
      tempRange: [18, 24],
      humidityRange: [35, 60]
    },
    stageLabels: {
      mixing: gel ? "hydration" : ointment ? "levigation" : "emulsification",
      granulation: "homogenization",
      drying: lotion ? "cooling" : "deaeration",
      compression: "viscosity set",
      coating: "microbial hold",
      packaging: ointment ? "tube filling" : "container filling"
    },
    process: {
      mixing: option("Choose base preparation.", gel ? ["Disperse carbomer and allow hydration", "Compress dry powder", "Fill capsules", "Boil to syrup"] : ointment ? ["Levigation into ointment base", "Wet granulation", "Enteric coating", "Bottle as syrup"] : ["Prepare oil/water phases and emulsify", "Skip emulsifier", "Compress tablets", "Dry fill shells"], 0),
      granulation: option("Choose homogenization control.", ["High-shear homogenize to smooth texture", "No mixing after API addition", "Blister pack immediately", "Add tablet lubricant"], 0),
      drying: drying(lotion ? 28 : 25, lotion ? 24 : 22, lotion ? 32 : 28),
      compression: option("Choose in-process control.", ["Check viscosity/pH before fill", "Check tablet hardness", "Check capsule lock only", "Ignore air pockets"], 0),
      coating: option("Choose contamination control.", ["Open hold for 24 hours", "Closed vessel microbial hold with bioburden control", "Sugar coat", "Add desiccant only"], 1),
      packaging: option("Select filling control.", [ointment ? "Aluminum tube fill and crimp check" : "Jar/bottle fill with net content check", "Open beaker storage", "Blister leak test", "Loose capsule count"], 0)
    },
    qc: [{
      test: "Assay",
      result: "99.1%",
      shouldPass: true
    }, {
      test: gel ? "Viscosity" : "Consistency",
      result: gel ? "Within target" : ointment ? "Uniform spread" : "Phase separation seen",
      shouldPass: !lotion
    }, {
      test: "Microbial limit",
      result: "Within limit",
      shouldPass: true
    }, {
      test: "Net content",
      result: "Within +/- 2%",
      shouldPass: true
    }],
    release: !lotion
  };
}
function buildIndustryFormula(choice) {
  if (choice.form === "Syrup") return syrupFormula(choice.type);
  if (choice.form === "Capsule") return capsuleFormula(choice.type);
  if (choice.form === "Semi-solid") return semiSolidFormula(choice.type);
  return tabletFormula(choice.type);
}
function IndustryAmbient() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pointer-events-none fixed inset-0 z-0 overflow-hidden", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Cog, { className: "gear-spin absolute -right-16 top-24 h-44 w-44 text-amber-300/10", strokeWidth: 1.2 }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Cog, { className: "gear-spin absolute right-20 top-44 h-24 w-24 text-amber-200/10", strokeWidth: 1.3, style: {
      animationDirection: "reverse",
      animationDuration: "16s"
    } }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-x-0 bottom-0 h-20 border-t border-amber-300/10 bg-black/20", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conveyor-scroll h-full opacity-35", style: {
      backgroundImage: "repeating-linear-gradient(90deg, transparent 0 28px, rgba(251,191,36,0.22) 28px 32px), linear-gradient(180deg, transparent, rgba(251,191,36,0.08))"
    } }) })
  ] });
}
function BatchFlash({
  decision
}) {
  if (!decision) return null;
  const isRelease = decision === "release";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(motion.div, { initial: {
    opacity: 0.85
  }, animate: {
    opacity: 0
  }, transition: {
    duration: 0.9,
    ease: "easeOut"
  }, className: `pointer-events-none fixed inset-0 z-[80] ${isRelease ? "bg-emerald-400" : "bg-red-500"}` }, decision);
}
function OfficialStamp({
  label = "GMP CONTROLLED"
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute right-6 top-24 rotate-[-12deg] rounded-md border-4 border-amber-500/20 px-5 py-2 text-center font-mono text-xl font-black uppercase tracking-[0.26em] text-amber-600/20", children: label });
}
function BalanceScale({
  value,
  max,
  min,
  target,
  unit,
  ok
}) {
  const pct = Math.max(0, Math.min(100, max > 0 ? value / max * 100 : 0));
  const angle = -54 + pct * 1.08;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `rounded-2xl border p-4 ${ok ? "border-emerald-300/40 bg-emerald-950/20" : "border-red-400/45 bg-red-950/20"}`, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative mx-auto h-36 max-w-xs rounded-t-full border border-white/10 bg-black/45 shadow-inner", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-4 rounded-t-full border-t border-x border-white/10" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-4 left-1/2 h-24 w-1 origin-bottom rounded-full bg-current transition-transform duration-150", style: {
      transform: `translateX(-50%) rotate(${angle}deg)`,
      color: ok ? "rgb(16 185 129)" : "rgb(239 68 68)",
      boxShadow: `0 0 18px ${ok ? "rgba(16,185,129,.65)" : "rgba(239,68,68,.65)"}`
    } }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-3 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full border border-white/20 bg-slate-900" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-3 left-5 text-[10px] font-bold text-muted-foreground", children: "0" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-3 right-5 text-[10px] font-bold text-muted-foreground", children: displayWeight(max, unit) }),
    min !== void 0 && target !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-x-8 bottom-9 h-1 rounded-full bg-white/10", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-emerald-400/80", style: {
      left: `${Math.max(0, min / max * 100)}%`,
      width: `${Math.max(4, (target - min) / max * 200)}%`
    } }) })
  ] }) });
}
function IndustrialGauge({
  icon: Icon,
  label,
  value,
  unit,
  range
}) {
  const min = Number(range?.[0] ?? 0);
  const max = Number(range?.[1] ?? 100);
  const gaugeMin = Math.min(0, min - (max - min));
  const gaugeMax = max + (max - min);
  const pct = Math.max(0, Math.min(1, (value - gaugeMin) / (gaugeMax - gaugeMin || 1)));
  const angle = -130 + pct * 260;
  const ok = value >= min && value <= max;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `relative overflow-hidden rounded-2xl border p-3 text-xs ${ok ? "border-emerald-400/35 bg-emerald-500/5" : "border-red-400/45 bg-red-500/10"}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-3.5" }),
      " ",
      label
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative mx-auto mt-2 h-24 w-28", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-x-0 top-0 h-24 rounded-t-full border border-white/15 bg-black/35 shadow-inner" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute right-2 top-8 h-8 w-8 rounded-full border border-red-400/30 bg-red-500/10" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-2 left-1/2 h-16 w-1 origin-bottom rounded-full bg-amber-300 transition-transform", style: {
        transform: `translateX(-50%) rotate(${angle}deg)`,
        boxShadow: "0 0 12px rgba(251,191,36,0.65)"
      } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-slate-200" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `mt-1 text-center font-mono text-lg font-black tabular-nums ${ok ? "text-emerald-300" : "text-red-300"}`, children: [
      value,
      unit
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center text-[10px] text-muted-foreground", children: [
      "Safe ",
      min,
      "-",
      max,
      unit
    ] })
  ] });
}
function IndustryGame() {
  const [productChoice, setProductChoice] = reactExports.useState(null);
  if (!productChoice) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(ProductChoiceScreen, { onPick: setProductChoice });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(IndustryRun, { productChoice });
}
function ProductChoiceScreen({
  onPick
}) {
  const [selectedForm, setSelectedForm] = reactExports.useState(PRODUCT_FORMS[0].form);
  const active = PRODUCT_FORMS.find((item) => item.form === selectedForm) ?? PRODUCT_FORMS[0];
  return /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "mx-auto grid min-h-[70vh] max-w-6xl place-items-center px-4 py-10", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, { initial: {
    opacity: 0,
    y: 10
  }, animate: {
    opacity: 1,
    y: 0
  }, className: "w-full rounded-3xl border border-border/40 bg-card/60 p-6 shadow-2xl shadow-primary/5 backdrop-blur md:p-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-2xl text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-bold uppercase tracking-[0.24em] text-primary", children: "Industry" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "mt-3 text-3xl font-black tracking-tight md:text-4xl", children: "What do you want to manufacture?" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-sm text-muted-foreground", children: "Choose the dosage form first, then select the specific product type for this batch." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-8 grid gap-3 md:grid-cols-4", children: PRODUCT_FORMS.map((item) => {
      const Icon = item.icon;
      const selected = item.form === selectedForm;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setSelectedForm(item.form), className: `rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${selected ? "border-primary/60 bg-primary/15 text-foreground" : "border-border/40 bg-muted/20 text-muted-foreground hover:border-primary/35"}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: `size-6 ${selected ? "text-primary" : "text-muted-foreground"}` }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-3 text-base font-bold", children: item.form }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs leading-relaxed", children: item.desc })
      ] }, item.form);
    }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-8 rounded-2xl border border-border/40 bg-background/35 p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap items-center justify-between gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs font-bold uppercase tracking-wider text-primary", children: [
          active.form,
          " types"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Pick one to start the batch record." })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4", children: active.types.map((type) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => onPick({
        form: active.form,
        type
      }), className: "rounded-xl border border-border/40 bg-card/60 p-3 text-left text-sm font-semibold transition hover:border-primary/50 hover:bg-primary/10", children: [
        type,
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-1 block text-[10px] font-normal uppercase tracking-wider text-muted-foreground", children: "Start batch" })
      ] }, type)) })
    ] })
  ] }) });
}
function IndustryRun({
  productChoice
}) {
  const onExit = useGameExit("/modes");
  const {
    difficulty,
    difficultyModal
  } = useDifficultyChoice("industry");
  const {
    profile
  } = useAuthStore();
  const {
    caseData,
    loading,
    next
  } = useCaseLoader("industry", difficulty);
  const f = reactExports.useMemo(() => buildIndustryFormula(productChoice), [productChoice.form, productChoice.type]);
  const batchProduct = productChoice.type;
  const [phase, setPhase] = reactExports.useState("formula");
  const baseBatchCount = reactExports.useMemo(() => parseBatchCount(f?.batchSize), [f?.batchSize]);
  const [batchCount, setBatchCount] = reactExports.useState(0);
  const [points, setPoints] = reactExports.useState(0);
  const [errors, setErrors] = reactExports.useState(0);
  const [qcErrors, setQcErrors] = reactExports.useState(0);
  const [contaminated, setContaminated] = reactExports.useState(false);
  const [hints, setHints] = reactExports.useState(0);
  const [result, setResult] = reactExports.useState(null);
  const [weighed, setWeighed] = reactExports.useState({});
  const [active, setActive] = reactExports.useState(null);
  const [slider, setSlider] = reactExports.useState(0);
  const [temp, setTemp] = reactExports.useState(0);
  const [humidity, setHumidity] = reactExports.useState(0);
  const [envFixed, setEnvFixed] = reactExports.useState(false);
  const [stageIdx, setStageIdx] = reactExports.useState(0);
  const [stageResults, setStageResults] = reactExports.useState({});
  const [dryTemp, setDryTemp] = reactExports.useState(50);
  const [qcAnswers, setQcAnswers] = reactExports.useState({});
  const [releaseFlash, setReleaseFlash] = reactExports.useState(null);
  const timer = useTimer(LIMIT, () => phase !== "done" && finish(true));
  const errPanel = useErrorPanel({
    mode: "industry",
    difficulty: caseData?.difficulty,
    mentorTip: caseData?.mentor_tip,
    setExternalPaused: timer.setExternalPaused
  });
  reactExports.useEffect(() => {
    setPhase("formula");
    setPoints(0);
    setErrors(0);
    setQcErrors(0);
    setContaminated(false);
    setHints(0);
    setWeighed({});
    setActive(null);
    setSlider(0);
    setEnvFixed(false);
    setStageIdx(0);
    setStageResults({});
    setQcAnswers({});
    setResult(null);
    setReleaseFlash(null);
    setBatchCount(parseBatchCount(f?.batchSize));
    if (f?.env) {
      const okRun = Math.random() < 0.6;
      if (okRun) {
        setTemp(Math.round((f.env.tempRange[0] + f.env.tempRange[1]) / 2));
        setHumidity(Math.round((f.env.humidityRange[0] + f.env.humidityRange[1]) / 2));
      } else {
        setTemp(f.env.tempRange[1] + 4);
        setHumidity(f.env.humidityRange[1] + 15);
      }
    }
    setDryTemp(f?.process?.drying?.min ?? 50);
  }, [caseData?.id, f]);
  const rawIngredients = f?.ingredients ?? [];
  const batchScale = baseBatchCount > 0 && batchCount > 0 ? batchCount / baseBatchCount : 1;
  const batchSizeLabel = formatBatchSize(f?.batchSize, batchCount || baseBatchCount || 1);
  const minBatchCount = Math.max(1, Math.round((baseBatchCount || 1e3) * 0.25));
  const maxBatchCount = Math.max(minBatchCount + 1, Math.round((baseBatchCount || 1e3) * 3));
  const batchStep = Math.max(1, Math.round((baseBatchCount || 1e3) / 20));
  const ingredients = reactExports.useMemo(() => rawIngredients.map((i) => ({
    ...i,
    target: scaleAmount(i.target, batchScale),
    min: scaleAmount(i.min, batchScale),
    max: scaleAmount(i.max, batchScale)
  })), [rawIngredients, batchScale]);
  const distractors = f?.distractors ?? [];
  const allWeighingItems = reactExports.useMemo(() => {
    const items = [...rawIngredients.map((i) => ({
      name: i.name,
      role: i.role,
      isReal: true
    })), ...distractors.map((n) => ({
      name: n,
      role: "Distractor",
      isReal: false
    }))];
    return stableShuffle(items, `${caseData?.id ?? "industry"}:${productChoice.form}:${productChoice.type}`);
  }, [caseData?.id, productChoice.form, productChoice.type, rawIngredients, distractors]);
  const activeIngredient = active ? ingredients.find((i) => i.name === active) : null;
  const weighingMax = activeIngredient ? Math.max(Number(activeIngredient.max) * 1.6, Number(activeIngredient.target) * 2, 10) : 500;
  const weighingStep = activeIngredient?.unit?.toLowerCase?.().includes("kg") ? 0.01 : 0.5;
  const activeWeightOk = activeIngredient ? slider >= activeIngredient.min && slider <= activeIngredient.max : false;
  if (loading || !caseData || !f) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      difficultyModal,
      /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "grid min-h-[60vh] place-items-center text-muted-foreground", children: "Loading batch..." })
    ] });
  }
  function acknowledgeFormula() {
    setPoints((p) => p + 10);
    toastScore(10, "Formula acknowledged");
    setPhase("weighing");
  }
  function updateBatchCount(nextCount) {
    const clamped = Math.min(maxBatchCount, Math.max(minBatchCount, nextCount || minBatchCount));
    setBatchCount(clamped);
    setWeighed({});
    setActive(null);
    setSlider(0);
  }
  function startWeigh(name) {
    setActive(name);
    const ing = ingredients.find((i) => i.name === name);
    setSlider(ing ? ing.target : 100);
  }
  function confirmWeigh() {
    if (!active) return;
    const ing = ingredients.find((i) => i.name === active);
    const isDistractor = !ing;
    if (isDistractor) {
      setErrors((e) => e + 1);
      setPoints((p) => p - 15);
      toastScore(-15, `${active} is not in this formula`);
      toast.error("Wrong ingredient - check the master formula.");
      errPanel.logError({
        errorType: "Wrong ingredient picked",
        wrongChoice: active,
        correctChoice: ingredients.map((i) => i.name).join(", "),
        whyWrong: `${active} is not in the master formula for ${batchProduct}. Using it would change the dosage form's properties or contaminate the batch.`,
        whatToKnow: "Every dosage form has its own excipient logic. Tablets need compression aids, syrups need vehicles and preservatives, capsules need fill/shell controls, and semi-solids need bases and microbial controls.",
        hint: "Re-open the master formula and verify each ingredient against the list."
      });
    } else {
      const ok = slider >= ing.min && slider <= ing.max;
      setWeighed((w) => ({
        ...w,
        [active]: {
          name: active,
          weight: slider,
          ok
        }
      }));
      if (ok) {
        setPoints((p) => p + 15);
        toastScore(15, `${active} OK`);
      } else {
        setErrors((e) => e + 1);
        setPoints((p) => p - 10);
        toastScore(-10, `${active} out of range`);
        errPanel.logError({
          errorType: "Weight out of range",
          wrongChoice: `${displayWeight(slider, ing.unit)} of ${active}`,
          correctChoice: `${displayWeight(ing.target, ing.unit)} (range ${displayWeight(ing.min, ing.unit)}-${displayWeight(ing.max, ing.unit)})`,
          whyWrong: `You weighed ${displayWeight(slider, ing.unit)} but the acceptable range is ${displayWeight(ing.min, ing.unit)}-${displayWeight(ing.max, ing.unit)}. Out-of-spec weights cause dose non-uniformity, failed compression, or batch rejection.`,
          whatToKnow: "Pharmaceutical manufacturing requires strict weight tolerances (+/-2-5%) to ensure dose uniformity across the batch."
        });
      }
    }
    setActive(null);
  }
  const allWeighed = ingredients.every((i) => weighed[i.name]?.ok);
  function fixEnvironment(action) {
    const okNeeded = temp > f.env.tempRange[1] || temp < f.env.tempRange[0] || humidity > f.env.humidityRange[1] || humidity < f.env.humidityRange[0];
    const correct = action === "dehumidifier" && humidity > f.env.humidityRange[1] || action === "hvac" && (temp > f.env.tempRange[1] || temp < f.env.tempRange[0]) || action === "delay" && okNeeded;
    if (!okNeeded) {
      toast("Conditions already within range.");
      setEnvFixed(true);
      setPoints((p) => p + 20);
      toastScore(20, "Env check OK");
      setPhase("process");
      return;
    }
    if (correct) {
      setTemp(Math.round((f.env.tempRange[0] + f.env.tempRange[1]) / 2));
      setHumidity(Math.round((f.env.humidityRange[0] + f.env.humidityRange[1]) / 2));
      setEnvFixed(true);
      setPoints((p) => p + 20);
      toastScore(20, "Conditions normalized");
      setPhase("process");
    } else {
      setErrors((e) => e + 1);
      setPoints((p) => p - 10);
      toastScore(-10, "Wrong corrective action");
      errPanel.logError({
        errorType: "Wrong environmental corrective action",
        wrongChoice: action,
        correctChoice: humidity > f.env.humidityRange[1] ? "Activate dehumidifier" : "Adjust HVAC temperature",
        whyWrong: `${action} doesn't address the actual deviation (temp ${temp} deg C, humidity ${humidity}%). Wrong correction wastes time and risks the batch.`,
        whatToKnow: "Match the corrective action to the deviation: dehumidifier for high humidity, HVAC for temperature, delay if both are unstable."
      });
    }
  }
  function ignoreEnv() {
    setContaminated(true);
    setEnvFixed(true);
    toast.error("Batch contamination risk - proceeding anyway.");
    errPanel.logError({
      errorType: "Environmental check ignored",
      wrongChoice: `Proceeded at temp ${temp} deg C / humidity ${humidity}%`,
      correctChoice: `Hold batch until temp ${f.env.tempRange[0]}-${f.env.tempRange[1]} deg C, humidity ${f.env.humidityRange[0]}-${f.env.humidityRange[1]}%`,
      whyWrong: "Proceeding outside the safe range will degrade moisture-sensitive APIs and fail GMP requirements. The batch is now at risk.",
      whatToKnow: "GMP requires strict environmental controls during manufacture. Out-of-spec conditions mandate hold + investigation, not 'continue anyway'."
    });
    setPhase("process");
  }
  function chooseStage(stage, ok) {
    setStageResults((s) => ({
      ...s,
      [stage]: ok
    }));
    if (ok) {
      setPoints((p) => p + 15);
      toastScore(15, `${stage} OK`);
      advanceStage();
    } else {
      setErrors((e) => e + 1);
      setPoints((p) => p - 5);
      toastScore(-5, `${stage} - retry`);
      errPanel.logError({
        errorType: `Wrong ${stage} process choice`,
        wrongChoice: `Incorrect option for ${stage}`,
        correctChoice: `See master formula for ${stage} spec`,
        whyWrong: `That ${f.stageLabels?.[stage] ?? stage} choice is wrong for this ${productChoice.form.toLowerCase()} product. The selected dosage form needs its own process controls.`,
        whatToKnow: `Each manufacturing stage has product-specific constraints. ${f.stageLabels?.[stage] ?? stage} parameters are in the master formula - re-check before answering.`,
        hint: "Cross-reference the product's properties with the stage requirements."
      });
    }
  }
  function advanceStage() {
    if (stageIdx + 1 < STAGES.length) setStageIdx((i) => i + 1);
    else setPhase("qc");
  }
  function answerQc(i, judged) {
    const t = f.qc[i];
    const correct = judged === t.shouldPass;
    setQcAnswers((m) => ({
      ...m,
      [i]: judged
    }));
    if (correct) {
      setPoints((p) => p + 20);
      toastScore(20, `${t.test}`);
    } else {
      setQcErrors((e) => e + 1);
      setErrors((e) => e + 1);
      setPoints((p) => p - 10);
      toastScore(-10, `${t.test}`);
      errPanel.logError({
        errorType: "QC judgement error",
        wrongChoice: `${t.test}: marked ${judged ? "Pass" : "Fail"}`,
        correctChoice: `${t.test}: should be ${t.shouldPass ? "Pass" : "Fail"} (${t.result})`,
        whyWrong: `The QC result "${t.result}" should have been judged ${t.shouldPass ? "PASS" : "FAIL"}. Misjudging QC releases unsafe batches or wastes good stock.`,
        whatToKnow: "Compare each QC reading against the spec limits. If any parameter is out of spec, the batch fails QC."
      });
    }
  }
  const allQcAnswered = f.qc.every((_, i) => qcAnswers[i] !== void 0);
  async function releaseDecision(release) {
    setReleaseFlash(release ? "release" : "reject");
    const correct = release === f.release;
    let delta = correct ? 30 : -50;
    if (contaminated) delta -= 30;
    setPoints((p) => p + delta);
    if (correct) toastScore(delta, "Batch decision");
    else {
      toast.error(`Wrong decision - batch ${f.release ? "should have been released" : "should have been rejected"}.`);
      errPanel.logError({
        errorType: "Wrong batch release decision",
        wrongChoice: release ? "Release" : "Reject",
        correctChoice: f.release ? "Release" : "Reject",
        whyWrong: `Based on QC results and environmental controls, this batch ${f.release ? "met all release criteria" : "failed one or more criteria and must be rejected"}.`,
        whatToKnow: "A QP releases only when every QC test passes and environmental records are within spec. Any deviation is grounds for rejection."
      });
    }
    await finish(false, delta);
  }
  async function finish(timedOut, releaseDelta = 0) {
    const totalPoints = points + releaseDelta;
    const score = computeScore({
      difficulty: caseData?.difficulty,
      correctDrugs: 0,
      wrongDrugs: 0,
      hintsUsed: hints,
      pauseUsed: timer.pauseUsed,
      timeTakenSec: timer.taken,
      timeLimitSec: LIMIT,
      timedOut
    }) - 100 + Math.max(0, totalPoints);
    const finalScore = Math.max(0, Math.round(score));
    const {
      xpGain
    } = await submitScore({
      userId: profile.user_id,
      caseId: caseData.id,
      mode: "industry",
      score: finalScore,
      timeTaken: timer.taken,
      errors,
      correctDrugs: ingredients.filter((i) => weighed[i.name]?.ok).length,
      totalDrugs: ingredients.length,
      errorsDetail: errPanel.errors
    });
    if (qcErrors === 0 && !timedOut) {
      await bumpCounterBadge(profile.user_id, "industry_zero_qc", 5, {
        name: "Master Manufacturer",
        description: "Complete 5 Industry cases with 0 QC errors",
        icon: "Industry"
      });
    }
    if (!timedOut && errors === 0 && qcErrors === 0 && finalScore >= 180) {
      await awardBadge(profile.user_id, "Batch Perfectionist");
    }
    setResult({
      score: finalScore,
      xpGain
    });
    setPhase("done");
  }
  if (phase === "done" && result) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(FeedbackScreen, { score: result.score, xpGain: result.xpGain, timeTaken: timer.taken, mentorTip: caseData.mentor_tip, explanation: caseData.explanation, drugs: ingredients.map((i) => ({
      name: `${i.name} (${i.role})`,
      correct: !!weighed[i.name]?.ok,
      info: weighed[i.name] ? `Weighed ${displayWeight(weighed[i.name].weight, i.unit)} (target ${displayWeight(i.target, i.unit)})` : "Not weighed"
    })), breakdown: [{
      label: "Points earned",
      delta: Math.max(0, points)
    }, {
      label: "Errors",
      delta: -errors * 5
    }, {
      label: "QC errors",
      delta: -qcErrors * 10
    }, {
      label: "Contaminated batch",
      delta: contaminated ? -30 : 0
    }], errors: errPanel.errors, onNext: next });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    difficultyModal,
    /* @__PURE__ */ jsxRuntimeExports.jsx(IndustryAmbient, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(BatchFlash, { decision: releaseFlash }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(GameHeader, { title: `Batch - ${batchProduct}`, remaining: timer.remaining, pct: timer.pct, paused: timer.paused, togglePause: timer.togglePause, score: points, onExit, onHint: () => {
      setHints((n) => n + 1);
      toast(`Stage ${stageIdx + 1}: ${STAGES[stageIdx]} - read the formula carefully.`);
    } }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "relative z-10 mx-auto max-w-7xl px-4 py-4", children: [
      phase !== "formula" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(IndustrialGauge, { icon: Thermometer, label: "Temp", value: temp, unit: " deg C", range: f.env.tempRange }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(IndustrialGauge, { icon: Droplets, label: "Humidity", value: humidity, unit: "%", range: f.env.humidityRange }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(InfoChip, { label: "Batch", value: batchSizeLabel }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(InfoChip, { label: "Errors", value: String(errors) })
      ] }),
      phase === "formula" && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "relative overflow-hidden rounded-2xl border border-amber-300/20 bg-slate-950/55 p-6 text-slate-100 shadow-[0_24px_70px_-42px_rgba(245,158,11,0.65)] backdrop-blur-xl", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(OfficialStamp, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative border-b border-amber-200/25 pb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[10px] font-black uppercase tracking-[0.24em] text-amber-300", children: "Batch Manufacturing Record" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 grid gap-2 sm:grid-cols-[1fr_auto]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-black uppercase tracking-tight", children: batchProduct }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm font-semibold text-slate-300", children: [
                productChoice.form,
                " dosage form - Batch size: ",
                batchSizeLabel
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded border border-amber-200/25 bg-white/5 px-3 py-2 font-mono text-xs text-slate-200 backdrop-blur", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
                "BMR No. PHM-",
                caseData.id?.slice?.(0, 5) ?? "00001"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Revision 01" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative mt-4 rounded-xl border border-amber-200/20 bg-amber-400/5 p-4 backdrop-blur", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-end justify-between gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "industry-batch-size", className: "text-xs font-black uppercase tracking-wider text-amber-300", children: "Batch size" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-slate-400", children: "Adjust the batch and the master formula recalculates all ingredient targets." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { id: "industry-batch-size", type: "number", min: minBatchCount, max: maxBatchCount, step: batchStep, value: batchCount || "", onChange: (e) => updateBatchCount(Number(e.target.value)), className: "h-10 w-36 rounded border border-amber-200/25 bg-slate-950/60 px-3 text-right font-mono text-sm tabular-nums text-slate-100 outline-none focus:border-amber-400" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded border border-amber-200/20 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300", children: [
                batchScale.toFixed(2),
                "x"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "range", min: minBatchCount, max: maxBatchCount, step: batchStep, value: batchCount || baseBatchCount || minBatchCount, onChange: (e) => updateBatchCount(Number(e.target.value)), className: "mt-4 w-full accent-amber-600" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: formatBatchSize(f.batchSize, minBatchCount) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: formatBatchSize(f.batchSize, maxBatchCount) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "relative mt-4 divide-y divide-amber-200/15 rounded-xl border border-amber-200/20 bg-slate-950/35 backdrop-blur", children: ingredients.map((i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "grid grid-cols-[26px_1fr_auto] items-center gap-3 p-3 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "grid h-4 w-4 place-items-center border border-amber-200/40 bg-amber-400/10 text-[10px]", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3 text-amber-300" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold", children: i.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400", children: i.role })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-right font-mono tabular-nums", children: [
            formatAmount(i.target),
            " ",
            i.unit,
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-slate-400", children: [
              "(",
              formatAmount(i.min),
              "-",
              formatAmount(i.max),
              ")"
            ] })
          ] })
        ] }, i.name)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: acknowledgeFormula, className: "relative mt-5 rounded-full bg-amber-500 px-6 py-2 text-sm font-black text-slate-950 shadow-[0_0_28px_-12px_rgba(245,158,11,0.9)] hover:bg-amber-400", children: "Acknowledge BMR" })
      ] }),
      phase !== "formula" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 xl:grid-cols-[360px_1fr]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(MasterFormulaReference, { f, batchProduct, productChoice, ingredients, batchSizeLabel, phase, stageIdx }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 space-y-4", children: [
          phase === "weighing" && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "grid gap-4 lg:grid-cols-[1.2fr_1fr]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/40 bg-card/60 p-5 backdrop-blur", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Step 2 - Weighing" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-1 text-lg font-bold", children: "Ingredient inventory" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3", children: allWeighingItems.map((it) => {
                const done = weighed[it.name]?.ok;
                return /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { disabled: done, onClick: () => startWeigh(it.name), className: `rounded-xl border p-3 text-left text-sm transition ${done ? "border-primary/40 bg-primary/10 opacity-60" : "border-border/40 bg-card/60 hover:border-primary/40"}`, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold", children: it.name }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground", children: it.role })
                ] }, it.name);
              }) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-amber-300/25 bg-card/60 p-5 shadow-[0_18px_55px_-38px_rgba(245,158,11,0.8)] backdrop-blur", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Weighing station" }),
              !active ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 text-sm text-muted-foreground", children: "Select an ingredient from the inventory." }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 space-y-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-lg font-bold", children: active }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-2xl font-mono tabular-nums", children: displayWeight(slider, activeIngredient?.unit) }),
                activeIngredient && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
                  "Target ",
                  displayWeight(activeIngredient.target, activeIngredient.unit),
                  " - Range ",
                  displayWeight(activeIngredient.min, activeIngredient.unit),
                  "-",
                  displayWeight(activeIngredient.max, activeIngredient.unit)
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(BalanceScale, { value: slider, max: weighingMax, min: activeIngredient?.min, target: activeIngredient?.target, unit: activeIngredient?.unit, ok: activeWeightOk }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "range", min: 0, max: weighingMax, step: weighingStep, value: slider, onChange: (e) => setSlider(Number(e.target.value)), className: `w-full ${activeWeightOk ? "accent-emerald-500" : "accent-red-500"}` }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: confirmWeigh, className: `w-full rounded-full py-2 text-sm font-semibold text-white ${activeWeightOk ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"}`, children: "Confirm weight" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 rounded-lg bg-muted/30 p-3 text-xs", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-1 font-semibold", children: "Weighed" }),
                Object.values(weighed).length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground", children: "Nothing weighed yet." }),
                Object.values(weighed).map((w) => /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: w.ok ? "text-primary" : "text-destructive", children: [
                  w.ok ? "OK" : "X",
                  " ",
                  w.name,
                  " - ",
                  displayWeight(w.weight, ingredients.find((i) => i.name === w.name)?.unit)
                ] }, w.name))
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { disabled: !allWeighed, onClick: () => setPhase("env"), className: `mt-3 w-full rounded-full border px-5 py-3 text-sm font-black uppercase tracking-[0.12em] transition ${allWeighed ? "border-amber-200/60 bg-amber-400 text-slate-950 shadow-[0_0_34px_-10px_rgba(251,191,36,0.95)] hover:-translate-y-0.5 hover:bg-amber-300 hover:shadow-[0_0_44px_-8px_rgba(251,191,36,1)]" : "border-border/40 bg-muted/20 text-muted-foreground opacity-45"}`, children: "Proceed to environmental check >" })
            ] })
          ] }),
          phase === "env" && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-2xl border border-border/40 bg-card/60 p-6 backdrop-blur", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Step 3 - Environmental check" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-1 text-lg font-bold", children: "Verify mixing room conditions" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-sm text-muted-foreground", children: [
              "Safe range: ",
              f.env.tempRange[0],
              "-",
              f.env.tempRange[1],
              " deg C, ",
              f.env.humidityRange[0],
              "-",
              f.env.humidityRange[1],
              "% RH"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 grid gap-2 sm:grid-cols-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => fixEnvironment("dehumidifier"), className: "rounded-xl border border-border/40 p-3 text-left text-sm hover:border-primary/40", children: "Activate dehumidifier" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => fixEnvironment("hvac"), className: "rounded-xl border border-border/40 p-3 text-left text-sm hover:border-primary/40", children: "Adjust HVAC temperature" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => fixEnvironment("delay"), className: "rounded-xl border border-border/40 p-3 text-left text-sm hover:border-primary/40", children: "Delay batch until conditions stabilize" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: ignoreEnv, className: "rounded-xl border border-destructive/40 p-3 text-left text-sm text-destructive hover:bg-destructive/10", children: "Ignore and proceed (risky)" })
            ] })
          ] }),
          phase === "process" && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "space-y-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap items-center gap-1 rounded-2xl border border-border/40 bg-card/60 p-3 backdrop-blur", children: STAGES.map((s, i) => {
              const done = stageResults[s] !== void 0;
              const active2 = i === stageIdx;
              return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `rounded-full px-3 py-1 text-xs capitalize ${active2 ? "bg-primary text-primary-foreground" : done ? stageResults[s] ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`, children: f.stageLabels?.[s] ?? s }),
                i < STAGES.length - 1 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: ">" })
              ] }, s);
            }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-2xl border border-border/40 bg-card/60 p-5 backdrop-blur", children: /* @__PURE__ */ jsxRuntimeExports.jsx(StagePicker, { stage: STAGES[stageIdx], label: f.stageLabels?.[STAGES[stageIdx]] ?? STAGES[stageIdx], spec: f.process[STAGES[stageIdx]], dryTemp, setDryTemp, onAnswer: (ok) => chooseStage(STAGES[stageIdx], ok) }) })
          ] }),
          phase === "qc" && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "overflow-hidden rounded-2xl border border-amber-300/20 bg-slate-950/55 p-6 text-slate-100 shadow-[0_20px_60px_-38px_rgba(245,158,11,0.65)] backdrop-blur-xl", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-black uppercase tracking-wider text-amber-300", children: "Step 5 - Quality Control" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-1 text-lg font-bold", children: "Judge each test" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-3 space-y-3", children: f.qc.map((t, i) => {
              const ans = qcAnswers[i];
              const stamped = ans !== void 0;
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.li, { initial: {
                opacity: 0,
                y: 42
              }, animate: {
                opacity: 1,
                y: 0
              }, transition: {
                delay: i * 0.08,
                type: "spring",
                stiffness: 220,
                damping: 24
              }, className: "relative overflow-hidden rounded-xl border border-amber-200/20 bg-slate-900/70 p-3 font-mono text-sm shadow-[0_14px_30px_-24px_rgba(245,158,11,0.8)] backdrop-blur before:absolute before:inset-x-0 before:top-0 before:h-2 before:bg-[repeating-linear-gradient(90deg,rgba(251,191,36,.26)_0_8px,transparent_8px_16px)]", children: [
                stamped && /* @__PURE__ */ jsxRuntimeExports.jsx(motion.div, { initial: {
                  opacity: 0,
                  scale: 1.8,
                  rotate: ans ? -8 : 8
                }, animate: {
                  opacity: 1,
                  scale: 1,
                  rotate: ans ? -8 : 8
                }, transition: {
                  type: "spring",
                  stiffness: 420,
                  damping: 18
                }, className: `absolute right-4 top-5 rounded border-4 px-3 py-1 text-lg font-black uppercase tracking-widest ${ans ? "border-emerald-600/70 text-emerald-700/80" : "border-red-600/70 text-red-700/80"}`, children: ans ? "PASS" : "FAIL" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold", children: t.test }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400", children: t.result })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { disabled: ans !== void 0, onClick: () => answerQc(i, true), className: `rounded-full px-3 py-1 text-xs ${ans === true ? "bg-emerald-600 text-white" : "border border-emerald-300/25 bg-emerald-400/10 text-emerald-100"}`, children: "Pass" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { disabled: ans !== void 0, onClick: () => answerQc(i, false), className: `rounded-full px-3 py-1 text-xs ${ans === false ? "bg-red-600 text-white" : "border border-red-300/25 bg-red-400/10 text-red-100"}`, children: "Fail" })
                  ] })
                ] })
              ] }, i);
            }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { disabled: !allQcAnswered, onClick: () => setPhase("release"), className: "mt-4 rounded-full bg-amber-500 px-6 py-2 text-sm font-black text-slate-950 disabled:opacity-40", children: "Continue to batch decision >" })
          ] }),
          phase === "release" && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "relative overflow-hidden rounded-3xl border border-amber-300/30 bg-black/55 p-8 text-center shadow-[0_24px_80px_-42px_rgba(245,158,11,0.9)] backdrop-blur", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute inset-0 opacity-30", style: {
              backgroundImage: "linear-gradient(rgba(251,191,36,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.08) 1px, transparent 1px)",
              backgroundSize: "22px 22px"
            } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(FlaskConical, { className: "relative mx-auto size-12 text-amber-300" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "relative mt-3 text-2xl font-black uppercase tracking-wide", children: "Final batch decision" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "relative mt-1 text-sm text-muted-foreground", children: "Based on QC results and production records, authorize the batch." }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative mt-6 grid gap-4 sm:grid-cols-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => releaseDecision(true), className: "rounded-2xl border border-emerald-300/50 bg-emerald-500 px-8 py-6 font-mono text-3xl font-black uppercase tracking-[0.18em] text-emerald-950 shadow-[0_0_44px_-12px_rgba(16,185,129,0.95)] transition hover:scale-[1.02] hover:bg-emerald-400", children: "Release" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => releaseDecision(false), className: "rounded-2xl border border-red-300/50 bg-red-600 px-8 py-6 font-mono text-3xl font-black uppercase tracking-[0.18em] text-red-50 shadow-[0_0_44px_-12px_rgba(239,68,68,0.95)] transition hover:scale-[1.02] hover:bg-red-500", children: "Reject" })
            ] })
          ] })
        ] })
      ] })
    ] }),
    errPanel.panel
  ] });
}
function InfoChip({
  label,
  value
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/40 bg-muted/30 p-2 text-xs", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-muted-foreground", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-sm font-semibold", children: value })
  ] });
}
function getMixingProfile(productChoice) {
  const type = productChoice.type.toLowerCase();
  if (productChoice.form === "Tablet") {
    if (type.includes("chewable")) return {
      speed: "14 rpm",
      time: "18 min",
      grade: "Low shear",
      note: "Protect chewable granule texture"
    };
    if (type.includes("enteric")) return {
      speed: "16 rpm",
      time: "22 min",
      grade: "Medium shear",
      note: "Keep enteric API blend uniform"
    };
    return {
      speed: "20 rpm",
      time: "20 min",
      grade: "Medium shear",
      note: "Uniform powder blend before compression"
    };
  }
  if (productChoice.form === "Syrup") {
    if (type.includes("sugar-free")) return {
      speed: "180 rpm",
      time: "30 min",
      grade: "Controlled vortex",
      note: "Avoid foam while dissolving vehicle"
    };
    return {
      speed: "220 rpm",
      time: "25 min",
      grade: "Solution mix",
      note: "Dissolve API before final volume"
    };
  }
  if (productChoice.form === "Capsule") {
    if (type.includes("soft")) return {
      speed: "90 rpm",
      time: "15 min",
      grade: "Gentle heat mix",
      note: "Keep oil fill clear and bubble-free"
    };
    return {
      speed: "18 rpm",
      time: "25 min",
      grade: "Low shear",
      note: "Protect flow and fill-weight uniformity"
    };
  }
  if (type.includes("gel")) return {
    speed: "320 rpm",
    time: "35 min",
    grade: "Hydration mix",
    note: "Fully hydrate polymer before neutralizing"
  };
  if (type.includes("ointment")) return {
    speed: "70 rpm",
    time: "28 min",
    grade: "Levigation",
    note: "Smooth base without trapped air"
  };
  return {
    speed: "260 rpm",
    time: "30 min",
    grade: "Homogenization",
    note: "Stable emulsion before filling"
  };
}
function MasterFormulaReference({
  f,
  batchProduct,
  productChoice,
  ingredients,
  batchSizeLabel,
  phase,
  stageIdx
}) {
  const mixingProfile = getMixingProfile(productChoice);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("aside", { className: "xl:sticky xl:top-24 xl:self-start", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative overflow-hidden rounded-xl border border-amber-300/20 bg-slate-950/55 p-4 text-slate-100 shadow-[0_16px_40px_-24px_rgba(245,158,11,0.65)] backdrop-blur-xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(OfficialStamp, { label: "REFERENCE" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] font-black uppercase tracking-[0.2em] text-amber-300", children: "Master formula" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-1 text-lg font-black leading-tight", children: batchProduct }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-0.5 text-xs text-slate-400", children: [
          productChoice.form,
          " dosage form"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded border border-amber-200/20 bg-white/5 px-2.5 py-1 font-mono text-[10px] font-bold text-slate-300", children: batchSizeLabel })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 rounded-xl border border-amber-200/20 bg-slate-900/55 p-3 backdrop-blur", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-2 text-[10px] font-black uppercase tracking-wider text-slate-300", children: "Ingredients" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "max-h-52 space-y-2 overflow-y-auto pr-1", children: ingredients.map((i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "grid grid-cols-[18px_1fr] gap-2 border-b border-amber-200/10 pb-1.5 text-xs last:border-b-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-0.5 grid h-3.5 w-3.5 place-items-center border border-amber-200/35 bg-amber-400/10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-2.5 text-amber-300" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate font-semibold", children: i.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-slate-400", children: i.role })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "shrink-0 text-right font-mono text-[11px] tabular-nums", children: [
            formatAmount(i.target),
            i.unit
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "col-start-2 mt-0.5 text-[10px] text-slate-400", children: [
          "Range ",
          formatAmount(i.min),
          "-",
          formatAmount(i.max),
          i.unit
        ] })
      ] }, i.name)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 grid grid-cols-2 gap-2 text-xs", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-amber-200/20 bg-white/5 p-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] uppercase tracking-wider text-slate-400", children: "Temp" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 font-bold", children: [
          f.env.tempRange[0],
          "-",
          f.env.tempRange[1],
          "C"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-amber-200/20 bg-white/5 p-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] uppercase tracking-wider text-slate-400", children: "Humidity" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 font-bold", children: [
          f.env.humidityRange[0],
          "-",
          f.env.humidityRange[1],
          "%"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 rounded-lg border border-amber-200/20 bg-white/5 p-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400", children: "Process map" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1", children: STAGES.map((stage, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `rounded px-2 py-1 text-[10px] capitalize ${phase === "process" && i === stageIdx ? "bg-amber-500 text-slate-950" : "bg-white/5 text-slate-400"}`, children: f.stageLabels?.[stage] ?? stage }, stage)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 rounded-lg border border-amber-200/15 bg-slate-950/35 p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] font-black uppercase tracking-wider text-amber-300", children: "Mixing rate" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-amber-300/25 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-200", children: mixingProfile.grade })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 grid grid-cols-2 gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-white/5 p-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[9px] uppercase tracking-wider text-slate-500", children: "Speed" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 font-mono text-sm font-bold text-slate-100", children: mixingProfile.speed })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-white/5 p-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[9px] uppercase tracking-wider text-slate-500", children: "Time" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 font-mono text-sm font-bold text-slate-100", children: mixingProfile.time })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-[10px] leading-relaxed text-slate-400", children: mixingProfile.note })
      ] })
    ] })
  ] }) });
}
function StagePicker({
  stage,
  label,
  spec,
  dryTemp,
  setDryTemp,
  onAnswer
}) {
  const stageLabel = label ?? stage;
  if (stage === "drying") {
    const ok = dryTemp >= spec.min && dryTemp <= spec.max;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: [
        "Step 4 - ",
        stageLabel
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h4", { className: "mt-1 text-lg font-bold", children: [
        "Set ",
        String(stageLabel).toLowerCase(),
        " parameter"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground", children: [
        "Target: ",
        spec.target,
        spec.unit,
        " (",
        spec.min,
        "-",
        spec.max,
        spec.unit,
        ")"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-3 text-3xl font-mono tabular-nums", children: [
        dryTemp,
        spec.unit
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "range", min: 20, max: 120, value: dryTemp, onChange: (e) => setDryTemp(Number(e.target.value)), className: "mt-2 w-full" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onAnswer(ok), className: "mt-3 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground", children: "Run drying" })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs uppercase tracking-wider text-muted-foreground capitalize", children: [
      "Step - ",
      stageLabel
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "mt-1 text-lg font-bold", children: spec.prompt }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 grid gap-2 sm:grid-cols-2", children: spec.options.map((o, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onAnswer(i === spec.correct), className: "rounded-xl border border-border/40 p-3 text-left text-sm hover:border-primary/40", children: o }, i)) })
  ] });
}
const SplitComponent = () => /* @__PURE__ */ jsxRuntimeExports.jsx(ModeTheme, { mode: "industry", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IndustryGame, {}) });
export {
  SplitComponent as component
};
