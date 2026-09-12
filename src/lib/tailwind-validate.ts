// Lightweight Tailwind class validator + suggester for the Inspector.
// We can't reflect the real Tailwind engine (designs render inside an iframe
// with the CDN), so we approximate: a curated list of known static utilities
// and known dynamic prefixes, plus variant stripping and arbitrary-value
// escapes. This catches typos ("flexx", "rouded-lg", "bg-blu-500") without
// false-flagging real classes.

// ---- Variants -------------------------------------------------------------
// Known responsive / state / pseudo variants. Anything else before a ":" is
// treated as unknown.
const VARIANTS = new Set([
  "sm", "md", "lg", "xl", "2xl",
  "hover", "focus", "focus-visible", "focus-within", "active", "visited",
  "disabled", "enabled", "checked", "required", "invalid", "valid",
  "group-hover", "group-focus", "peer-hover", "peer-focus", "peer-checked",
  "first", "last", "odd", "even", "empty", "only",
  "before", "after", "placeholder", "file", "marker", "selection",
  "dark", "light", "print", "motion-safe", "motion-reduce",
  "rtl", "ltr", "portrait", "landscape",
  "aria-selected", "aria-expanded", "aria-checked", "aria-disabled",
  "data-open", "data-closed", "data-active",
]);

// ---- Static utilities (no dynamic suffix) --------------------------------
export const STATIC_UTILITIES = new Set<string>([
  // display
  "block", "inline-block", "inline", "flex", "inline-flex", "grid", "inline-grid",
  "table", "inline-table", "table-row", "table-cell", "contents", "hidden", "flow-root",
  // position
  "static", "fixed", "absolute", "relative", "sticky",
  // flex
  "flex-row", "flex-row-reverse", "flex-col", "flex-col-reverse",
  "flex-wrap", "flex-nowrap", "flex-wrap-reverse",
  "flex-1", "flex-auto", "flex-initial", "flex-none",
  "grow", "grow-0", "shrink", "shrink-0",
  // items / justify / content / self
  "items-start", "items-end", "items-center", "items-baseline", "items-stretch",
  "justify-start", "justify-end", "justify-center", "justify-between", "justify-around", "justify-evenly",
  "justify-items-start", "justify-items-end", "justify-items-center", "justify-items-stretch",
  "content-start", "content-end", "content-center", "content-between", "content-around", "content-evenly",
  "self-auto", "self-start", "self-end", "self-center", "self-stretch", "self-baseline",
  "place-items-start", "place-items-end", "place-items-center", "place-items-stretch",
  "place-content-start", "place-content-end", "place-content-center", "place-content-between",
  // text align / transform / decoration
  "text-left", "text-center", "text-right", "text-justify", "text-start", "text-end",
  "uppercase", "lowercase", "capitalize", "normal-case",
  "underline", "overline", "line-through", "no-underline",
  "italic", "not-italic", "antialiased", "subpixel-antialiased",
  "truncate", "text-ellipsis", "text-clip", "text-wrap", "text-nowrap", "text-balance", "text-pretty",
  "whitespace-normal", "whitespace-nowrap", "whitespace-pre", "whitespace-pre-line", "whitespace-pre-wrap",
  "break-normal", "break-words", "break-all", "break-keep",
  // border
  "border", "border-solid", "border-dashed", "border-dotted", "border-double", "border-none", "border-hidden",
  "border-collapse", "border-separate",
  // rounded
  "rounded", "rounded-none", "rounded-full",
  // shadow / ring
  "shadow", "shadow-none", "shadow-inner",
  "ring", "ring-inset",
  // overflow
  "overflow-auto", "overflow-hidden", "overflow-visible", "overflow-scroll", "overflow-clip",
  "overflow-x-auto", "overflow-y-auto", "overflow-x-hidden", "overflow-y-hidden",
  "overflow-x-visible", "overflow-y-visible", "overflow-x-scroll", "overflow-y-scroll",
  // object
  "object-contain", "object-cover", "object-fill", "object-none", "object-scale-down",
  "object-top", "object-bottom", "object-center", "object-left", "object-right",
  // cursor / pointer / user-select
  "cursor-auto", "cursor-default", "cursor-pointer", "cursor-wait", "cursor-text", "cursor-move",
  "cursor-help", "cursor-not-allowed", "cursor-none", "cursor-grab", "cursor-grabbing",
  "pointer-events-none", "pointer-events-auto",
  "select-none", "select-text", "select-all", "select-auto",
  // resize
  "resize-none", "resize-x", "resize-y", "resize",
  // list
  "list-none", "list-disc", "list-decimal", "list-inside", "list-outside",
  // visibility / opacity
  "visible", "invisible", "collapse",
  // transform / transition
  "transform", "transform-none", "transform-gpu",
  "transition", "transition-none",
  // interactivity
  "outline-none", "outline-hidden", "outline",
  "appearance-none", "appearance-auto",
  "sr-only", "not-sr-only",
  // isolation / mix
  "isolate", "isolation-auto",
  "mix-blend-normal", "mix-blend-multiply", "mix-blend-screen", "mix-blend-overlay",
  // float / clear
  "float-right", "float-left", "float-none", "clear-left", "clear-right", "clear-both", "clear-none",
  // aspect
  "aspect-auto", "aspect-square", "aspect-video",
  // container
  "container", "mx-auto",
  // gradient direction (v4)
  "bg-linear-to-r", "bg-linear-to-l", "bg-linear-to-t", "bg-linear-to-b",
  "bg-linear-to-tr", "bg-linear-to-tl", "bg-linear-to-br", "bg-linear-to-bl",
  // width/height keywords
  "w-auto", "w-full", "w-screen", "w-min", "w-max", "w-fit",
  "h-auto", "h-full", "h-screen", "h-min", "h-max", "h-fit",
]);

// ---- Dynamic prefixes ----------------------------------------------------
// Any token that starts with one of these (and has *something* after) is
// considered valid. The suffix isn't further validated — the AI generates
// arbitrary color/size scales and we don't want to fight the CDN.
export const PREFIXES: readonly string[] = [
  // spacing
  "p-", "px-", "py-", "pt-", "pb-", "pl-", "pr-", "ps-", "pe-",
  "m-", "mx-", "my-", "mt-", "mb-", "ml-", "mr-", "ms-", "me-",
  "gap-", "gap-x-", "gap-y-",
  "space-x-", "space-y-",
  // sizing
  "w-", "h-", "min-w-", "min-h-", "max-w-", "max-h-", "size-",
  // colors / backgrounds
  "bg-", "from-", "via-", "to-", "text-", "placeholder-", "caret-", "accent-",
  "fill-", "stroke-",
  // border
  "border-", "border-x-", "border-y-", "border-t-", "border-b-", "border-l-", "border-r-",
  "border-s-", "border-e-",
  "divide-", "divide-x-", "divide-y-",
  "outline-", "outline-offset-",
  // radius
  "rounded-", "rounded-t-", "rounded-b-", "rounded-l-", "rounded-r-",
  "rounded-tl-", "rounded-tr-", "rounded-bl-", "rounded-br-",
  "rounded-s-", "rounded-e-",
  // effects
  "shadow-", "ring-", "ring-offset-", "opacity-",
  "blur-", "brightness-", "contrast-", "saturate-", "hue-rotate-",
  "invert-", "grayscale-", "sepia-", "drop-shadow-",
  "backdrop-blur-", "backdrop-brightness-", "backdrop-contrast-",
  "backdrop-saturate-", "backdrop-opacity-", "backdrop-hue-rotate-",
  // typography
  "font-", "leading-", "tracking-", "decoration-", "underline-offset-",
  "indent-", "align-",
  // layout / position
  "z-", "top-", "right-", "bottom-", "left-", "inset-", "inset-x-", "inset-y-",
  "order-", "basis-",
  "grid-cols-", "grid-rows-", "col-span-", "row-span-",
  "col-start-", "col-end-", "row-start-", "row-end-",
  "grid-flow-", "auto-cols-", "auto-rows-",
  // transforms
  "translate-x-", "translate-y-", "scale-", "scale-x-", "scale-y-",
  "rotate-", "skew-x-", "skew-y-", "origin-",
  // transitions
  "duration-", "delay-", "ease-", "transition-", "animate-",
  // misc
  "aspect-", "columns-", "content-", "will-change-", "scroll-m-", "scroll-p-",
  "list-image-", "list-",
  "flex-", "items-", "justify-", "self-", "place-",
  "object-", "overflow-", "whitespace-", "break-",
];

// ---- Validation ----------------------------------------------------------
const TOKEN_RE = /^-?[a-zA-Z][\w-]*(?:\/\d+)?$/;
const ARBITRARY_RE = /^-?[a-zA-Z][\w-]*-\[[^\]]+\](?:\/\d+)?$/;

function stripVariants(token: string): { base: string; ok: boolean } {
  let rest = token;
  while (rest.includes(":")) {
    const idx = rest.indexOf(":");
    const variant = rest.slice(0, idx);
    // arbitrary variant e.g. [&:hover]
    const isArbitrary = variant.startsWith("[") && variant.endsWith("]");
    if (!isArbitrary && !VARIANTS.has(variant)) return { base: rest, ok: false };
    rest = rest.slice(idx + 1);
  }
  return { base: rest, ok: true };
}

export function isValidClass(raw: string): boolean {
  const token = raw.trim();
  if (!token) return false;
  const { base, ok } = stripVariants(token);
  if (!ok) return false;
  const bareBase = base.startsWith("!") ? base.slice(1) : base;
  if (!bareBase) return false;
  if (ARBITRARY_RE.test(bareBase)) {
    // check prefix (part before "-[") is known static or dynamic prefix root
    const cut = bareBase.indexOf("-[");
    const prefixRoot = bareBase.slice(0, cut + 1); // includes trailing "-"
    if (PREFIXES.some((p) => p === prefixRoot || prefixRoot.startsWith(p))) return true;
    // also allow full-token arbitrary like "[mask:linear-gradient(...)]" -> reject unknown
    return STATIC_UTILITIES.has(bareBase.slice(0, cut));
  }
  if (!TOKEN_RE.test(bareBase)) return false;
  const negBase = bareBase.startsWith("-") ? bareBase.slice(1) : bareBase;
  const withoutOpacity = negBase.split("/")[0];
  if (STATIC_UTILITIES.has(withoutOpacity)) return true;
  if (PREFIXES.some((p) => withoutOpacity.startsWith(p) && withoutOpacity.length > p.length)) return true;
  return false;
}

export function tokenize(value: string): string[] {
  return value.split(/\s+/).filter(Boolean);
}

export function findInvalid(value: string): string[] {
  return tokenize(value).filter((t) => !isValidClass(t));
}

export function suggest(query: string, limit = 8): string[] {
  const q = query.trim();
  if (!q) return [];
  // Strip variants so we suggest based on the base token
  const lastColon = q.lastIndexOf(":");
  const variantPrefix = lastColon >= 0 ? q.slice(0, lastColon + 1) : "";
  const base = lastColon >= 0 ? q.slice(lastColon + 1) : q;
  if (!base) return [];
  const bare = base.startsWith("!") ? base.slice(1) : base;
  const bang = base.startsWith("!") ? "!" : "";
  const out: string[] = [];
  for (const u of STATIC_UTILITIES) {
    if (u.startsWith(bare)) out.push(variantPrefix + bang + u);
    if (out.length >= limit * 2) break;
  }
  for (const p of PREFIXES) {
    if (p.startsWith(bare) || bare.startsWith(p)) {
      out.push(variantPrefix + bang + p);
    }
    if (out.length >= limit * 2) break;
  }
  // dedupe + limit
  return Array.from(new Set(out)).slice(0, limit);
}
