import { useId, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { VoiceId } from "@roleplay/core";

/*
  Drawn character art. Browse pages can't use the generated portraits, because each one is a paid model call,
  so every character gets a two-tone poster made from their name and voice. It is decoration, not data.
*/

const HUES = ["blue", "purple", "teal", "orange", "pink", "cyan"];

const hash = (name: string) => [...name].reduce((sum, c, i) => (sum * 31 + c.charCodeAt(0) + i) >>> 0, 7);

export function hueStyle(name: string): CSSProperties {
  const hue = HUES[hash(name) % HUES.length];
  return Object.fromEntries([100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((step) => [`--hue-${step}`, `var(--color-${hue}-${step})`])) as CSSProperties;
}

const WOMEN = [
  { back: "M35 54C34 28 47 19 60 19s26 9 25 35c0 13 3 25-3 33H38c-6-8-3-20-3-33Z", front: "M41 47c2-12 12-18 21-18 9 0 16 7 17 18-6-6-15-10-24-9-6 1-11 4-14 9Z" },
  { back: "M60 8a10 10 0 1 1 0 20 10 10 0 0 1 0-20Z", front: "M41 49c-2-16 8-25 19-25s21 9 19 25c-4-10-12-15-19-15s-15 5-19 15Z" },
  { back: "M36 50c0-22 12-31 25-31 12 0 23 8 23 30 0 18 4 34 6 44H62l-2-22-4 22H30c3-12 6-27 6-43Z", front: "M41 48c3-11 9-17 19-19 10 0 18 8 19 19-9-3-19-7-24-13-3 5-8 10-14 13Z" },
];
const MEN = [
  { back: "", front: "M41 47c-2-15 8-23 20-23 11 0 20 7 18 23-2-8-6-12-12-12-8 2-17 1-22 4-2 2-3 5-4 8Z" },
  { back: "", front: "M40 45c-3-14 8-25 22-25 13 0 21 11 18 25-2-6-6-10-10-12-9 6-23 3-30 12Z" },
];

export function PersonaArt({ name, voice, className = "" }: { name: string; voice?: VoiceId; className?: string }) {
  const id = useId();
  const seed = hash(name);
  const older = voice === "older_man";
  const hair = voice === "man" || older ? MEN[seed % MEN.length] : voice === "woman" ? WOMEN[seed % WOMEN.length] : [...WOMEN, ...MEN][seed % 5];
  return (
    <svg className={`persona-art ${className}`} viewBox="0 0 120 120" style={hueStyle(name)} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "var(--hue-500)" }} />
          <stop offset="1" style={{ stopColor: "var(--hue-900)" }} />
        </linearGradient>
        <linearGradient id={`${id}cloth`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--hue-300)" }} />
          <stop offset="1" style={{ stopColor: "var(--hue-500)" }} />
        </linearGradient>
      </defs>
      <rect width="120" height="120" fill={`url(#${id}bg)`} />
      <g fill="none" stroke="#fff" opacity=".14">
        <circle cx="60" cy="50" r="33" />
        <circle cx="60" cy="50" r="45" />
        <circle cx="60" cy="50" r="58" />
      </g>
      {!older && <path d={hair.back} style={{ fill: "var(--hue-950)" }} />}
      <path d="M12 120c0-25 20-37 48-37s48 12 48 37Z" fill={`url(#${id}cloth)`} />
      <path d="M50 66h20v17c0 5-5 9-10 9s-10-4-10-9Z" style={{ fill: "var(--hue-200)" }} />
      <path d="M50 71c5 5 15 5 20 0v5c-5 6-15 6-20 0Z" style={{ fill: "var(--hue-400)" }} opacity=".55" />
      <ellipse cx="60" cy="50" rx="19" ry="23" style={{ fill: "var(--hue-100)" }} />
      <path d="M60 27a19 23 0 0 1 0 46Z" style={{ fill: "var(--hue-300)" }} opacity=".22" />
      {older ? (
        <>
          <path d="M41 50c-1-9 1-15 6-18-2 6-2 12-3 19ZM79 50c1-9-1-15-6-18 2 6 2 12 3 19Z" style={{ fill: "var(--hue-950)" }} opacity=".75" />
          <g fill="none" style={{ stroke: "var(--hue-950)" }} strokeWidth="1.6">
            <circle cx="52" cy="50" r="5.5" />
            <circle cx="68" cy="50" r="5.5" />
            <path d="M57.5 50h5" />
          </g>
        </>
      ) : (
        <path d={hair.front} style={{ fill: "var(--hue-950)" }} />
      )}
    </svg>
  );
}

/** A ring of bars that reads as a voice. Used around the character on the call; the bars don't measure anything. */
export function Voiceprint({ name, className = "" }: { name: string; className?: string }) {
  const seed = hash(name);
  const bars = Array.from({ length: 84 }, (_, i) => {
    const a = (i / 84) * Math.PI * 2;
    const wave = Math.abs(Math.sin(a * 3 + seed)) * 0.5 + Math.abs(Math.sin(a * 7 + seed / 3)) * 0.3 + Math.abs(Math.sin(a * 17 + seed / 7)) * 0.2;
    const r = 84;
    const len = 3 + wave * 13;
    const f = (n: number) => n.toFixed(2);
    return { x1: f(Math.cos(a) * r), y1: f(Math.sin(a) * r), x2: f(Math.cos(a) * (r + len)), y2: f(Math.sin(a) * (r + len)) };
  });
  return (
    <svg className={`voiceprint ${className}`} viewBox="-102 -102 204 204" aria-hidden="true" focusable="false">
      {bars.map((b, i) => <line key={i} {...b} />)}
    </svg>
  );
}

/** The brand's short blue rule from the marketing section headings. */
export const BrandRule = ({ className = "" }: { className?: string }) => <span className={`brand-rule ${className}`} aria-hidden="true" />;

/*
  Static art in public/art, generated once ahead of time and shipped as plain files. See the README.
  Nothing here calls a model at runtime. Every ready-built character has a portrait; anything else gets the drawn poster above.
*/
const READY_PORTRAITS = new Set(["lib-sales_onboarding", "lib-regulated_messaging", "lib-partner_certification", "lib-outage_call", "lib-manager_conversations", "lib-customer_service", "lib-sales_onboarding-vi", "lib-regulated_messaging-vi", "lib-partner_certification-vi", "lib-outage_call-vi", "lib-manager_conversations-vi", "lib-bank_insurance_sale", "lib-bank_insurance_sale-vi", "lib-bank_scam_stop", "lib-bank_scam_stop-vi", "lib-site_safety_stop", "lib-site_safety_stop-vi", "lib-er_wait_relative", "lib-er_wait_relative-vi"]);

/** Decorative beside a visible name, so `described` is only for places where the portrait stands alone. */
export function Portrait({ programmeId, name, voice, className = "", described, eager }: { programmeId: string; name: string; voice?: VoiceId; className?: string; described?: boolean; eager?: boolean }) {
  const { t } = useTranslation();
  if (!READY_PORTRAITS.has(programmeId)) return <PersonaArt name={name} voice={voice} className={className} />;
  return <img className={`persona-art ${className}`} src={`/art/people/${programmeId}.webp`} width={520} height={520} alt={described ? t("common.portraitAlt", { name }) : ""} loading={eager ? "eager" : "lazy"} decoding="async" />;
}

const SCENES = {
  "home-hero": [1200, 800],
  "roleplays-hero": [760, 760],
  "builder-hero": [960, 640],
  "research-board": [720, 480],
  "empty-calls": [620, 413],
  "empty-search": [620, 413],
  "error-state": [620, 413],
  workspace: [620, 413],
} as const;
export type SceneName = keyof typeof SCENES;

/** A playful paper scene. Always decorative: the words around it carry the meaning. */
export function Scene({ name, className = "", eager }: { name: SceneName; className?: string; eager?: boolean }) {
  const [width, height] = SCENES[name];
  return <img className={`scene ${className}`} src={`/art/${name}.webp`} width={width} height={height} alt="" loading={eager ? "eager" : "lazy"} decoding="async" />;
}
