import { useEffect, useId, useState } from "react";
import {
  motion, useMotionValueEvent, useReducedMotion, useSpring, useTransform,
} from "framer-motion";
import {
  Check, Droplets, Flame, Minus, Plus, Snowflake, Sun, Thermometer, type LucideIcon,
} from "lucide-react";
import {
  arcPath, fraction, needleAngle, pointOnArc, severity, ticks, zoneOf,
  type Band, type Scale, type Zone,
} from "@/lib/game/gauge";

/**
 * The instruments on the manufacturing bench: a room thermometer, a hygrometer
 * and a balance.
 *
 * They replace dials that were wrong before they were dull - the needles swept
 * a different angle from the face they sat on, so 0 g did not read 0 - and
 * every position here comes from the one geometry module, where that is tested.
 *
 * What makes them feel live is physics rather than decoration. Needles are
 * springs: they sweep up from the stop when the instrument appears, overshoot
 * and settle when the reading changes, and the balance needle is deliberately
 * the most underdamped, because a mechanical pointer really does wobble before
 * it rests. The room reacts to its reading - frost gathers when it is cold,
 * heat rises when it is hot, the face mists when it is damp - and each effect
 * grows with how far out of range the reading is, not merely whether it is.
 *
 * State is never colour alone. Every reading carries a word and an icon ("Too
 * cold", "In range", "Add more"), and the number itself stays in the ordinary
 * text colour. The three state colours per instrument were checked with the
 * palette validator against both the light and the dark card, adjacent pairs
 * in the order they sit on the dial.
 *
 * With reduced motion requested, needles jump straight to the reading and the
 * particle effects are not drawn; the tints that carry the state still are.
 */

type Kind = "temperature" | "humidity" | "balance";

/** Validated against #FFFFFF and the dark card (#001613), in dial order. */
const TONES: Record<Kind, Record<Zone, string>> = {
  temperature: { below: "#0284c7", within: "#059669", above: "#dc2626" },
  humidity: { below: "#b45309", within: "#059669", above: "#2563eb" },
  balance: { below: "#b45309", within: "#059669", above: "#dc2626" },
};

const STATE: Record<Kind, Record<Zone, { text: string; icon: LucideIcon }>> = {
  temperature: {
    below: { text: "Too cold", icon: Snowflake },
    within: { text: "In range", icon: Check },
    above: { text: "Too hot", icon: Flame },
  },
  humidity: {
    below: { text: "Too dry", icon: Sun },
    within: { text: "In range", icon: Check },
    above: { text: "Too damp", icon: Droplets },
  },
  balance: {
    below: { text: "Add more", icon: Plus },
    within: { text: "In range", icon: Check },
    above: { text: "Too much", icon: Minus },
  },
};

// One face, shared by every instrument: pivot at (CX, CY), band on radius R.
const CX = 100;
const CY = 96;
const R = 80;

const clampAngle = (a: number) => Math.max(-90, Math.min(90, a));

/**
 * A tapered needle with a short counterweight tail, pointing along `angle`.
 *
 * The angle is clamped where it is drawn, so an overshooting spring hits the
 * stop at either end of the scale the way a real pointer does, instead of
 * swinging below the face.
 */
function needlePath(angle: number): string {
  const rad = (clampAngle(angle) * Math.PI) / 180;
  const s = Math.sin(rad);
  const c = Math.cos(rad);
  const length = R - 14;
  const half = 3.4;
  const tail = 12;
  const n = (v: number) => v.toFixed(2);
  return `M ${n(CX + length * s)} ${n(CY - length * c)} `
    + `L ${n(CX + c * half)} ${n(CY + s * half)} `
    + `L ${n(CX - tail * s)} ${n(CY + tail * c)} `
    + `L ${n(CX - c * half)} ${n(CY - s * half)} Z`;
}

/**
 * The needle as a spring.
 *
 * Starts at the left stop, so an instrument that appears sweeps up to its
 * reading rather than simply being there - the first thing that makes it read
 * as a live instrument rather than a picture of one.
 */
function useNeedle(value: number, scale: Scale, spring: { stiffness: number; damping: number; mass?: number }) {
  const reduced = useReducedMotion();
  const target = needleAngle(value, scale);
  const angle = useSpring(-90, spring);
  useEffect(() => {
    if (reduced) angle.jump(target);
    else angle.set(target);
  }, [target, reduced, angle]);
  return { angle, d: useTransform(angle, needlePath), reduced: !!reduced };
}

/** The dial face: track, zone arcs, ticks and end labels. The needle is drawn over it. */
function Face({
  scale, band, zone, tones, guided, label, tickCount = 10, formatTick, gradientId, tint,
}: {
  scale: Scale;
  band: Band;
  zone: Zone;
  tones: Record<Zone, string>;
  guided: boolean;
  label: (v: number) => string;
  tickCount?: number;
  formatTick?: (v: number) => string;
  gradientId: string;
  tint: { color: string; opacity: number };
}) {
  const reduced = useReducedMotion();
  const low = fraction(band.low, scale);
  const high = fraction(band.high, scale);
  const values = ticks(scale, tickCount);
  const fmt = formatTick ?? label;

  const segments: Array<{ zone: Zone; from: number; to: number }> = [
    { zone: "below", from: 0, to: low },
    { zone: "within", from: low, to: high },
    { zone: "above", from: high, to: 1 },
  ];

  return (
    <>
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="100%" r="100%">
          <motion.stop
            offset="0%"
            animate={{ stopColor: tint.color, stopOpacity: tint.opacity }}
            transition={{ duration: reduced ? 0 : 0.7 }}
          />
          <stop offset="85%" stopColor={tint.color} stopOpacity={0} />
        </radialGradient>
      </defs>

      <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY} Z`} fill={`url(#${gradientId})`} />
      <path d={arcPath(CX, CY, R, 0, 1)} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={9} strokeLinecap="round" className="text-foreground" />

      {guided && segments.map((seg) => {
        const d = arcPath(CX, CY, R, seg.from, seg.to);
        if (!d) return null;
        const active = seg.zone === zone;
        const inBand = seg.zone === "within";
        // The zone the needle is in lights up; out of range it also breathes,
        // which is what catches the eye before the number does.
        return (
          <motion.path
            key={seg.zone}
            d={d}
            fill="none"
            stroke={tones[seg.zone]}
            strokeWidth={inBand ? 7 : 6}
            strokeLinecap="butt"
            animate={{
              opacity: inBand
                ? (active ? 1 : 0.7)
                : active
                  ? (reduced ? 0.7 : [0.45, 0.9, 0.45])
                  : 0.2,
            }}
            transition={active && !inBand && !reduced
              ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.4 }}
          />
        );
      })}

      {values.map((v, i) => {
        const f = fraction(v, scale);
        const major = i % Math.max(1, Math.round(tickCount / 2)) === 0;
        const outer = pointOnArc(CX, CY, R - 7, f);
        const inner = pointOnArc(CX, CY, major ? R - 16 : R - 12, f);
        return (
          <line
            key={i}
            x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y}
            stroke="currentColor"
            strokeOpacity={major ? 0.55 : 0.3}
            strokeWidth={major ? 1.6 : 1}
            className="text-foreground"
          />
        );
      })}

      <text x={CX - R} y={CY + 14} fontSize={9} fontWeight={600} textAnchor="start" fill="currentColor" className="text-muted-foreground">
        {fmt(scale.min)}
      </text>
      <text x={CX + R} y={CY + 14} fontSize={9} fontWeight={600} textAnchor="end" fill="currentColor" className="text-muted-foreground">
        {fmt(scale.max)}
      </text>
    </>
  );
}

function Pivot({ tone }: { tone: string }) {
  return (
    <>
      <circle cx={CX} cy={CY} r={6.5} fill="currentColor" className="text-foreground" fillOpacity={0.85} />
      <circle cx={CX} cy={CY} r={2.6} style={{ fill: tone, transition: "fill .5s ease" }} />
    </>
  );
}

/**
 * The room reacting to its own reading.
 *
 * Built as three stacked layers whose opacity changes, rather than one layer
 * whose gradient changes, because a gradient cannot be tweened and would snap
 * from cold to hot. Positions come from the index, never from Math.random -
 * a random value in a render body differs between the server pass and the
 * browser and tears the page on hydration.
 */
function Atmosphere({ kind, zone, sev }: { kind: "temperature" | "humidity"; zone: Zone; sev: number }) {
  const out = 0.35 + 0.65 * sev;
  const layers: Record<Zone, { background: string; shadow: string }> = kind === "temperature"
    ? {
        below: {
          background: "radial-gradient(130% 100% at 50% 0%, rgba(125,211,252,.42) 0%, transparent 62%)",
          shadow: "inset 0 0 26px rgba(186,230,253,.55)",
        },
        within: {
          background: "radial-gradient(120% 90% at 50% 100%, rgba(16,185,129,.10) 0%, transparent 60%)",
          shadow: "none",
        },
        above: {
          background: "radial-gradient(130% 100% at 50% 100%, rgba(251,146,60,.40) 0%, transparent 62%)",
          shadow: "inset 0 0 26px rgba(248,113,113,.45)",
        },
      }
    : {
        below: {
          background: "radial-gradient(130% 100% at 50% 100%, rgba(245,158,11,.30) 0%, transparent 62%)",
          shadow: "inset 0 0 22px rgba(217,119,6,.30)",
        },
        within: {
          background: "radial-gradient(120% 90% at 50% 100%, rgba(16,185,129,.10) 0%, transparent 60%)",
          shadow: "none",
        },
        above: {
          background: "radial-gradient(130% 100% at 50% 0%, rgba(96,165,250,.38) 0%, transparent 62%)",
          shadow: "inset 0 0 24px rgba(147,197,253,.45)",
        },
      };

  return (
    <>
      {(Object.keys(layers) as Zone[]).map((z) => (
        <div
          key={z}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-700"
          style={{
            background: layers[z].background,
            boxShadow: layers[z].shadow,
            opacity: z === zone ? (z === "within" ? 1 : out) : 0,
          }}
        />
      ))}
      <Particles kind={kind} zone={zone} sev={sev} />
    </>
  );
}

function Particles({ kind, zone, sev }: { kind: "temperature" | "humidity"; zone: Zone; sev: number }) {
  const reduced = useReducedMotion();
  if (reduced || zone === "within") return null;
  const count = Math.round(3 + sev * 7);
  const spots = Array.from({ length: count }, (_, i) => i);
  const left = (i: number) => `${(i * 37 + 11) % 94 + 3}%`;

  if (kind === "temperature" && zone === "below") {
    return (
      <>
        {spots.map((i) => (
          <motion.span
            key={`snow-${i}`}
            aria-hidden="true"
            className="pointer-events-none absolute -top-2 rounded-full bg-sky-300 dark:bg-sky-100"
            style={{ left: left(i), width: 2 + (i % 3), height: 2 + (i % 3), boxShadow: "0 0 6px rgba(56,189,248,.8)" }}
            animate={{ y: [-6, 230], x: [0, i % 2 ? 7 : -7, 0], opacity: [0, 0.95, 0.95, 0] }}
            transition={{ duration: 3.4 + (i % 4) * 0.7, repeat: Infinity, delay: i * 0.45, ease: "linear" }}
          />
        ))}
      </>
    );
  }

  if (kind === "temperature" && zone === "above") {
    return (
      <>
        {spots.map((i) => (
          <motion.span
            key={`heat-${i}`}
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-3 w-[3px] rounded-full blur-[1.5px]"
            style={{
              left: left(i),
              height: 16 + (i % 3) * 7,
              background: "linear-gradient(to top, rgba(249,115,22,0), rgba(249,115,22,.8), rgba(239,68,68,0))",
            }}
            animate={{ y: [8, -200], x: [0, i % 2 ? 5 : -5, 0], scaleX: [1, 1.9, 1], opacity: [0, 0.85, 0] }}
            transition={{ duration: 2.3 + (i % 3) * 0.6, repeat: Infinity, delay: i * 0.33, ease: "easeOut" }}
          />
        ))}
      </>
    );
  }

  if (kind === "humidity" && zone === "above") {
    return (
      <>
        {spots.map((i) => (
          <motion.span
            key={`drop-${i}`}
            aria-hidden="true"
            className="pointer-events-none absolute -top-2 bg-blue-400/80"
            style={{
              left: left(i),
              width: 4,
              height: 6 + (i % 3) * 2,
              borderRadius: "50% 50% 50% 50% / 62% 62% 38% 38%",
            }}
            animate={{ y: [-4, 70 + (i % 4) * 45], opacity: [0, 0.9, 0.9, 0] }}
            transition={{ duration: 2.6 + (i % 3) * 0.8, repeat: Infinity, delay: i * 0.55, ease: "easeIn" }}
          />
        ))}
      </>
    );
  }

  // Dry air: dust drifting across rather than anything falling.
  return (
    <>
      {spots.map((i) => (
        <motion.span
          key={`dust-${i}`}
          aria-hidden="true"
          className="pointer-events-none absolute -left-2 size-[3px] rounded-full bg-amber-500/70"
          style={{ top: `${(i * 29 + 15) % 80 + 5}%` }}
          animate={{ x: [0, 340], y: [0, i % 2 ? -10 : 10, 0], opacity: [0, 0.85, 0] }}
          transition={{ duration: 5 + (i % 4), repeat: Infinity, delay: i * 0.7, ease: "linear" }}
        />
      ))}
    </>
  );
}

/** Word, icon and colour together - never the colour alone. */
function StatePill({ tone, text, icon: Icon }: { tone: string; text: string; icon: LucideIcon }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold text-foreground transition-colors duration-500"
      style={{ borderColor: `${tone}66`, backgroundColor: `${tone}1a` }}
    >
      <Icon className="size-3.5" style={{ color: tone }} aria-hidden="true" />
      {text}
    </span>
  );
}

/** A room thermometer or hygrometer. */
export function EnvironmentGauge({
  kind, label, value, unit, band, scale,
}: {
  kind: "temperature" | "humidity";
  label: string;
  value: number;
  unit: string;
  band: Band;
  scale: Scale;
}) {
  const gradientId = `face-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const zone = zoneOf(value, band);
  const sev = severity(value, band, scale);
  const tones = TONES[kind];
  const tone = tones[zone];
  const state = STATE[kind][zone];
  const { d } = useNeedle(value, scale, { stiffness: 150, damping: 15 });
  const Icon = kind === "temperature" ? Thermometer : Droplets;

  const tint = zone === "within"
    ? { color: tone, opacity: 0.1 }
    : { color: kind === "temperature" ? (zone === "below" ? "#7dd3fc" : "#fb923c") : tone, opacity: 0.12 + 0.3 * sev };

  const glow = zone === "within"
    ? `drop-shadow(0 0 3px ${tone}88)`
    : `drop-shadow(0 0 ${3 + 7 * sev}px ${tone}cc)`;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border bg-card/60 p-3 transition-colors duration-700"
      style={{ borderColor: `${tone}${zone === "within" ? "55" : "88"}` }}
    >
      <Atmosphere kind={kind} zone={zone} sev={sev} />

      <div className="relative flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" aria-hidden="true" /> {label}
      </div>

      <svg
        viewBox="0 0 200 116"
        className="relative mx-auto mt-1 block w-full max-w-[220px]"
        role="img"
        aria-label={`${label}: ${value}${unit}, ${state.text.toLowerCase()}. Acceptable ${band.low} to ${band.high}${unit}.`}
      >
        <Face
          scale={scale} band={band} zone={zone} tones={tones} guided
          label={(v) => `${Math.round(v)}${unit}`}
          gradientId={gradientId} tint={tint}
        />
        {/* Colour goes on as an attribute, not through style. Passed through a
            motion element's style, the fill was applied once when the gauge
            mounted and never again - the needle stayed blue from a cold start
            while the card around it said "Too hot". The glow sits on a plain
            group for the same reason. */}
        <g style={{ filter: glow, transition: "filter .5s ease" }}>
          <motion.path d={d} fill={tone} className="transition-[fill] duration-500" />
        </g>
        <Pivot tone={tone} />
      </svg>

      <div className="relative mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <p className="font-mono text-xl font-black tabular-nums text-foreground sm:text-2xl">
          {value}
          <span className="ml-0.5 text-sm font-bold text-muted-foreground">{unit}</span>
        </p>
        <StatePill tone={tone} text={state.text} icon={state.icon} />
      </div>
      <p className="relative mt-0.5 text-[10px] text-muted-foreground">
        Acceptable {band.low}&ndash;{band.high}{unit}
      </p>
    </div>
  );
}

/** A small mound of powder whose size follows the reading, sitting on the pan. */
function moundPath(ratio: number): string {
  const r = Math.max(0, Math.min(1.35, ratio));
  if (r < 0.01) return "";
  const height = 17 * r;
  const halfBase = 10 + 32 * Math.min(1, r);
  const base = 133;
  return `M ${CX - halfBase} ${base} Q ${CX} ${base - height * 2} ${CX + halfBase} ${base} Z`;
}

/**
 * The balance.
 *
 * Two things a real balance does that the old one did not. Its pointer is
 * underdamped, so it swings past a new reading and comes back. And it tells
 * you when the reading can be trusted: "Settling" while the pointer is moving,
 * "Stable" once it has come to rest, which is the indicator every analytical
 * balance shows and the moment a weight should actually be recorded.
 *
 * `guided` is the difficulty rule. A balance does not know a formula's
 * tolerance - the batch record does. At Expert the old scale still drew the
 * acceptable band and turned green inside it, which answered the very question
 * the hidden tolerance was supposed to leave to the record. Unguided, this is
 * just a balance: a weight, a pointer, and whether it has settled.
 */
export function BalanceDial({
  value, scale, band, target, guided, format, tickFormat,
}: {
  value: number;
  scale: Scale;
  band: Band;
  target: number;
  guided: boolean;
  format: (v: number) => string;
  tickFormat?: (v: number) => string;
}) {
  const gradientId = `pan-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const zone = zoneOf(value, band);
  const tones = TONES.balance;
  const tone = guided ? tones[zone] : "currentColor";
  const state = STATE.balance[zone];

  const { angle, d, reduced } = useNeedle(value, scale, { stiffness: 105, damping: 10, mass: 1.2 });
  const reading = useSpring(scale.min, { stiffness: 120, damping: 18 });
  const [stable, setStable] = useState(true);

  useEffect(() => {
    if (reduced) reading.jump(value);
    else reading.set(value);
  }, [value, reduced, reading]);

  useMotionValueEvent(angle, "animationStart", () => setStable(false));
  useMotionValueEvent(angle, "animationComplete", () => setStable(true));

  const readingText = useTransform(reading, (v) => format(Math.min(scale.max, Math.max(scale.min, v))));
  const mound = useTransform(reading, (v) => moundPath(target > 0 ? Math.max(0, v) / target : 0));
  // The pan sits a touch lower the more it carries.
  const panY = useTransform(reading, (v) => fraction(v, scale) * 3);

  const targetMark = {
    outer: pointOnArc(CX, CY, R + 6, fraction(target, scale)),
    inner: pointOnArc(CX, CY, R - 9, fraction(target, scale)),
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl border bg-card/60 p-4 transition-colors duration-500"
      style={{ borderColor: guided ? `${tones[zone]}66` : undefined }}
    >
      {guided && zone === "within" && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(120% 80% at 50% 100%, rgba(16,185,129,.12) 0%, transparent 60%)" }}
        />
      )}

      <svg
        viewBox="0 0 200 146"
        className="relative mx-auto block w-full max-w-xs text-foreground"
        role="img"
        aria-label={`Balance reading ${format(value)}${stable ? "" : ", settling"}${guided ? `, ${state.text.toLowerCase()}` : ""}.`}
      >
        <Face
          scale={scale} band={band} zone={zone} tones={tones} guided={guided}
          label={format} formatTick={tickFormat}
          gradientId={gradientId}
          tint={{ color: guided ? tones[zone] : "#94a3b8", opacity: guided ? 0.1 : 0.06 }}
        />

        {guided && (
          <line
            x1={targetMark.outer.x} y1={targetMark.outer.y}
            x2={targetMark.inner.x} y2={targetMark.inner.y}
            stroke="currentColor" strokeWidth={2} strokeLinecap="round"
          />
        )}

        {/* Column and pan under the pointer. */}
        <rect x={CX - 3} y={CY + 6} width={6} height={24} rx={3} fill="currentColor" fillOpacity={0.14} />
        <motion.g style={{ y: panY }}>
          <motion.path d={mound} fill="#d6d3d1" stroke="currentColor" strokeOpacity={0.25} strokeWidth={0.8} />
          <ellipse cx={CX} cy={135} rx={58} ry={6} fill="currentColor" fillOpacity={0.18} />
          <ellipse cx={CX} cy={134} rx={58} ry={5} fill="none" stroke="currentColor" strokeOpacity={0.35} strokeWidth={1} />
        </motion.g>

        {/* Attribute, not style - see the note on the room gauge's needle. */}
        <g style={{ filter: guided ? `drop-shadow(0 0 5px ${tones[zone]}aa)` : "none" }}>
          <motion.path d={d} fill={tone} className="transition-[fill] duration-500" />
        </g>
        <Pivot tone={guided ? tones[zone] : "#94a3b8"} />
      </svg>

      <div className="relative mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-3xl font-black tabular-nums text-foreground">
          {/* Exact once the pointer rests; while it moves, the reading settles with it. */}
          {stable ? format(value) : <motion.span>{readingText}</motion.span>}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2 py-0.5 text-[11px] font-bold text-foreground"
            aria-live="off"
          >
            <motion.span
              aria-hidden="true"
              className={`size-2 rounded-full ${stable ? "bg-emerald-600" : "bg-amber-700"}`}
              animate={stable || reduced ? { opacity: 1 } : { opacity: [1, 0.25, 1] }}
              transition={stable || reduced ? { duration: 0.2 } : { duration: 0.8, repeat: Infinity }}
            />
            {stable ? "Stable" : "Settling"}
          </span>
          {guided && <StatePill tone={tones[zone]} text={state.text} icon={state.icon} />}
        </div>
      </div>
    </div>
  );
}
