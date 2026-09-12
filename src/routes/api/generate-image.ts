import { createParser } from "eventsource-parser";
import { createFileRoute } from "@tanstack/react-router";
import { planProductScreens, type PlannedScreen } from "@/lib/productScreens.server";

type StreamEvent =
  | { type: "manifest"; screens: PlannedScreen[] }
  | { type: "screen-start"; screenId: string }
  | { type: "screen-delta"; screenId: string; delta: string }
  | { type: "screen-complete"; screenId: string }
  | { type: "screen-error"; screenId: string; message: string }
  | { type: "complete"; completed: number; failed: number }
  | { type: "error"; message: string };

const encoder = new TextEncoder();

function eventChunk(event: StreamEvent) {
  return encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
}

const outputContract = `OUTPUT CONTRACT
- Return raw HTML only. Start with <!doctype html>. No markdown or commentary.
- Include meta charset, viewport, Tailwind CDN, and Google Fonts links for the typefaces named below.
- Use HTML and Tailwind only. The only script permitted is the Tailwind CDN.
- Finish the entire document, including closing body and html tags.`;

const appDesignSystem = `You are a principal product designer and senior frontend engineer. Create ONE complete 1440x960 application screen as a self-contained HTML document.

${outputContract}
- Fonts: Instrument Sans (400,500,600,700) and Geist Mono (400,500).

SHARED PRODUCT-SYSTEM STANDARD
- The screen belongs to a coordinated multi-page SaaS product. Preserve the supplied product name, navigation order, user identity, data vocabulary, colour tokens, radii, and typography exactly.
- Desktop shell: 236px sidebar plus fluid content. Sidebar contains product mark, grouped navigation, command/search trigger, and a genuinely useful signed-in profile block pinned low. Do not make every page a dashboard.
- Responsive behavior must be encoded with Tailwind: desktop sidebar becomes a compact mobile header; grids collapse; tables become readable card rows; no horizontal overflow.
- Use a precise 4px spacing scale. Cards use 8px radius or less. Buttons are 36-40px high. Borders are hairline. Shadows are restrained.
- One primary action per screen. Avoid glassmorphism, oversized radii, decorative blobs, emoji, and template-like empty whitespace.
- Typography: Instrument Sans, 12px metadata, 14px body, 16px card titles, 28-32px page title. Letter spacing is 0. Use Geist Mono for dates, times, counts, and keyboard hints.

PAGE COMPOSITION RULES
- List pages: prioritize search, filters, sorting, bulk state, dense rows, and pagination. Metrics are secondary or absent.
- Today: prioritize timeline and completion flow. Upcoming: prioritize date groups and deadline rhythm.
- Completed: history and restore. Projects: portfolio of projects and progress. Task details: focused two-column workspace with activity rail.
- Calendar: genuine month/week/day structure. Analytics: chart-led analysis. Settings: section navigation and forms. Add Task: production-grade form/dialog with validation-ready controls.
- Dashboard alone may use KPI cards. Never copy its KPI composition into other pages.`;

const marketingDesignSystem = `You are an award-winning art director and senior frontend engineer. Create ONE complete 1440px-wide marketing/portfolio WEB PAGE as a self-contained HTML document. Height grows with the content (do not force 960px).

${outputContract}
- Fonts: a confident editorial display face paired with a clean grotesque, e.g. Instrument Serif (400) + Instrument Sans (400,500,600,700), plus Geist Mono (400,500) for years, indexes, and metadata.

WEBSITE STANDARD (this is a public website, NOT an app dashboard)
- Absolutely no app chrome: no sidebar, no KPI cards, no data tables, no signed-in profile block, no notification bell, no workspace switcher.
- Structure: slim sticky top nav (word mark + 4-6 links + one call-to-action), then full-width stacked sections, then a real footer with navigation columns, contact, social text links, and a copyright line.
- Sections must be generous: 96-140px vertical padding, a max-width content column around 1120px, and clear section labels or numbered eyebrows.
- Editorial typography is the hero: 56-88px display headlines with tight leading, 18-20px body copy at comfortable measure, and Geist Mono for years, project indexes, and captions.
- Use large asymmetric layouts, offset grids, generous negative space, and thin rules to separate ideas. Avoid centre-everything template symmetry on every section.
- Image placeholders are inline SVG/CSS compositions or tonal blocks with a subtle grain/gradient wash and a descriptive caption — never external images, never emoji.
- Include real-sounding named content: project titles, client names, roles, years, disciplines, outcomes with credible numbers, and testimonial quotes with attribution.
- Add hover, focus-visible, and active treatments to every link, card, and button. Underline animations and subtle translate/scale on cards are welcome.
- Responsive via Tailwind: nav collapses, multi-column grids stack, display sizes step down, no horizontal overflow.

PAGE COMPOSITION RULES
- Home: hero statement, selected work (3-6 pieces with year/role), services or capability summary, proof (clients/testimonials/awards), and a closing call-to-action band.
- Work: filter/index row plus a rich project grid or editorial list with hover detail.
- Case Study: hero with project meta bar (client, year, role, stack), context, process, large layout blocks, results with metrics, next-project link.
- About: identity block, narrative, experience timeline with years, skills/tools, recognition.
- Services: scoped offerings, deliverables, process steps, engagement models.
- Blog: featured post plus index with dates, reading time, and tags.
- Contact: short qualifying form, availability, response time, and direct channels.`;

const sharedColourSystem = `PREMIUM COLOUR SYSTEM (mandatory)
- Use the supplied palette tokens verbatim: page background, elevated surface, sunken surface, hairline border, primary ink, muted ink, accent, accent-tint, and the three supporting status hues.
- Layer at least three neutral tones so the page reads as depth rather than flat white.
- The accent carries the primary button, active nav item, focus ring, key data point, and selection state only. Never fill large areas with the accent.
- Use accent-tint (roughly 8-12% accent) for quiet emphasis, tinted chips, and chart fills.
- Chips and tags use tinted backgrounds with a darker text of the same hue — never saturated solid fills.
- One subtle low-contrast tonal wash is allowed on a hero band. No rainbow gradients, no purple-on-white default AI look, no pure #000 or pure #fff for text.
- Inline lucide-style SVG icons only. No external images.
- Before ending, inspect mentally for overlap, clipping, inconsistent edges, missing content, repeated blocks, and text overflow. Fix every issue.`;

function systemPrompt(kind: PlannedScreen["kind"]) {
  return `${kind === "marketing" ? marketingDesignSystem : appDesignSystem}\n\n${sharedColourSystem}`;
}

function buildScreenPrompt(prompt: string, screens: PlannedScreen[], screen: PlannedScreen) {
  const names = screens.map((item) => item.name).join(", ");
  const identity = inferProductIdentity(prompt);

  if (screen.kind === "marketing") {
    return `ORIGINAL BRIEF:\n${prompt}\n\nSITE SYSTEM:\nBrand/person name: ${identity.name}. Accent: ${identity.accent}.\nPALETTE (use these exact hex values, identically on every sibling page): ${identity.palette}.\nThe complete page family is: ${names}. This render is specifically the “${screen.name}” page.\n\nPAGE PURPOSE:\n${screen.focus}\n\nREQUIREMENTS:\n- Render only the ${screen.name} page; do not stack other pages below it.\n- Show the shared top navigation with ${screen.name} active, and the shared footer, so this page visibly belongs to one website.\n- This is a marketing/portfolio website: no dashboard shell, no sidebar, no KPI cards, no data tables.\n- Use realistic, specific content consistent across sibling pages, and honour the exact domain, tone, and sections named in the brief.\n- Make it editorial, confident, and shippable rather than a template.\n\nGenerate the complete HTML now.`;
  }

  return `ORIGINAL PRODUCT BRIEF:\n${prompt}\n\nPRODUCT SYSTEM:\nProduct name: ${identity.name}. Accent: ${identity.accent}.\nPALETTE (use these exact hex values, identically on every sibling screen): ${identity.palette}.\nSigned-in user: Maya Chen, Product Designer. Workspace: Northstar. Use these values exactly. The complete screen family is: ${names}. This render is specifically the “${screen.name}” screen.\n\nSCREEN PURPOSE:\n${screen.focus}\n\nREQUIREMENTS:\n- Render only ${screen.name}; do not stack other screens below it.\n- Show the full shared navigation with ${screen.name} active so this screen visibly belongs to the complete product.\n- Use realistic content that remains consistent across sibling screens, and honour the exact domain named in the brief.\n- Include every field, control, state, and action from the original brief that belongs on this screen.\n- Make it dense, calm, premium, and shippable rather than a concept mockup.\n- Keep all essential content inside the 1440x960 viewport.\n\nGenerate the complete HTML now.`;
}


type Identity = { name: string; accent: string; palette: string };

function palette(parts: {
  bg: string;
  surface: string;
  sunken: string;
  border: string;
  ink: string;
  muted: string;
  accent: string;
  tint: string;
  support: string;
}) {
  return `page background ${parts.bg}, elevated surface ${parts.surface}, sunken surface ${parts.sunken}, hairline border ${parts.border}, primary ink ${parts.ink}, muted ink ${parts.muted}, accent ${parts.accent}, accent-tint ${parts.tint}, supporting hue ${parts.support}, success #14804A, warning #B45309, danger #B42318`;
}

function inferProductIdentity(prompt: string): Identity {
  // Portfolio / creative briefs are checked first: they often mention "projects",
  // which must not be read as a task-management product.
  if (/portfolio|creative|studio|photograph|freelance|personal (?:site|website)/i.test(prompt))
    return { name: "Aperture", accent: "#B5472F", palette: palette({ bg: "#F8F6F3", surface: "#FFFFFF", sunken: "#F0ECE6", border: "#E4DED6", ink: "#1A1512", muted: "#6B615A", accent: "#B5472F", tint: "#F6E7E1", support: "#2F5C55" }) };
  if (/todo|task|productivity|project management/i.test(prompt))
    return { name: "Relay", accent: "#17795C", palette: palette({ bg: "#F6F7F5", surface: "#FFFFFF", sunken: "#EEF1EE", border: "#E1E5E1", ink: "#131A17", muted: "#5F6B65", accent: "#17795C", tint: "#E4F0EB", support: "#1E4F6B" }) };
  if (/finance|invoice|bank|accounting/i.test(prompt))
    return { name: "Ledger", accent: "#176B87", palette: palette({ bg: "#F5F7F9", surface: "#FFFFFF", sunken: "#EDF1F5", border: "#DFE5EB", ink: "#101820", muted: "#5A6672", accent: "#176B87", tint: "#E2EDF2", support: "#8A5A12" }) };
  if (/health|medical|clinic|wellness/i.test(prompt))
    return { name: "Aster", accent: "#13756A", palette: palette({ bg: "#F5F8F7", surface: "#FFFFFF", sunken: "#EBF1F0", border: "#DCE5E3", ink: "#12211F", muted: "#5B6B68", accent: "#13756A", tint: "#E1EFEC", support: "#7A4A78" }) };
  if (/portfolio|creative|design|studio/i.test(prompt))
    return { name: "Aperture", accent: "#B5472F", palette: palette({ bg: "#F8F6F3", surface: "#FFFFFF", sunken: "#F0ECE6", border: "#E4DED6", ink: "#1A1512", muted: "#6B615A", accent: "#B5472F", tint: "#F6E7E1", support: "#2F5C55" }) };
  if (/commerce|shop|store|retail/i.test(prompt))
    return { name: "Foundry", accent: "#9A5B13", palette: palette({ bg: "#F8F6F2", surface: "#FFFFFF", sunken: "#F1EDE5", border: "#E5DFD4", ink: "#1B1710", muted: "#6A6156", accent: "#9A5B13", tint: "#F5E9D8", support: "#1F5B4E" }) };
  return { name: "Morrow", accent: "#176B87", palette: palette({ bg: "#F6F7F8", surface: "#FFFFFF", sunken: "#EEF1F4", border: "#E1E5E9", ink: "#111619", muted: "#5C666D", accent: "#176B87", tint: "#E3EDF1", support: "#8A4B2A" }) };
}

function gatewayMessage(status: number, body: string) {
  try {
    const json = JSON.parse(body) as { message?: string; error?: { message?: string } };
    return json.message ?? json.error?.message ?? body;
  } catch {
    return body || `Design generation failed (${status})`;
  }
}

async function streamOneScreen(params: {
  key: string;
  prompt: string;
  screens: PlannedScreen[];
  screen: PlannedScreen;
  images: string[];
  signal: AbortSignal;
  emit: (event: StreamEvent) => void;
}) {
  const { key, prompt, screens, screen, images, signal, emit } = params;
  emit({ type: "screen-start", screenId: screen.id });

  const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    signal,
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      reasoning: { effort: "low", summary: "concise" },
      input: [
        { role: "developer", content: [{ type: "input_text", text: systemPrompt(screen.kind) }] },
        {
          role: "user",
          content: [
            { type: "input_text", text: buildScreenPrompt(prompt, screens, screen) },
            ...(images.length > 0
              ? [
                  {
                    type: "input_text" as const,
                    text:
                      "REFERENCE IMAGES (attached below): treat these as the visual brief. Match their layout structure, colour palette, typography weight/scale, spacing rhythm, component shapes and overall mood as closely as the screen brief allows. If a reference shows a specific screen, reproduce its composition faithfully rather than inventing a new one. Never describe the reference in the output; only build it.",
                  },
                  ...images.map((image) => ({ type: "input_image" as const, image_url: image, detail: "high" as const })),
                ]
              : []),
          ],
        },
      ],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const body = await upstream.text().catch(() => "");
    throw new Error(gatewayMessage(upstream.status, body));
  }

  let completed = false;
  let streamError = "";
  const parser = createParser({
    onEvent(event) {
      if (!event.data || event.data === "[DONE]") return;
      let payload: {
        type?: string;
        delta?: string;
        error?: { message?: string };
        response?: { error?: { message?: string } };
      };
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }
      if (payload.type === "response.output_text.delta" && typeof payload.delta === "string") {
        emit({ type: "screen-delta", screenId: screen.id, delta: payload.delta });
      } else if (payload.type === "response.completed") {
        completed = true;
      } else if (payload.type === "error" || payload.type === "response.failed") {
        streamError = payload.error?.message ?? payload.response?.error?.message ?? "Design generation failed";
      }
    },
  });

  const reader = upstream.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.feed(value);
    }
  } finally {
    reader.cancel().catch(() => {});
  }

  if (streamError) throw new Error(streamError);
  if (!completed) throw new Error("The design stream ended before this screen was complete.");
  emit({ type: "screen-complete", screenId: screen.id });
}

export const Route = createFileRoute("/api/generate-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { prompt?: string; images?: unknown };
        const prompt = (body.prompt ?? "").trim();
        const images = (Array.isArray(body.images) ? body.images : [])
          .filter((value): value is string => typeof value === "string" && value.startsWith("data:image/"))
          .slice(0, 4);
        if (!prompt) return new Response("Missing prompt", { status: 400 });

        const key = process.env['LOVABLE_API_KEY'];
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const screens = planProductScreens(prompt);
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            let closed = false;
            const emit = (event: StreamEvent) => {
              if (!closed) controller.enqueue(eventChunk(event));
            };
            emit({ type: "manifest", screens });

            let completed = 0;
            let failed = 0;
            const queue = [...screens];
            const worker = async () => {
              while (queue.length > 0 && !request.signal.aborted) {
                const screen = queue.shift();
                if (!screen) return;
                try {
                  await streamOneScreen({ key, prompt, screens, screen, images, signal: request.signal, emit });
                  completed += 1;
                } catch (error) {
                  if (request.signal.aborted) return;
                  failed += 1;
                  emit({
                    type: "screen-error",
                    screenId: screen.id,
                    message: error instanceof Error ? error.message : "Screen generation failed",
                  });
                }
              }
            };

            try {
              const concurrency = screens.length > 3 ? 3 : screens.length;
              await Promise.all(Array.from({ length: concurrency }, () => worker()));
              if (!request.signal.aborted) emit({ type: "complete", completed, failed });
            } catch (error) {
              if (!request.signal.aborted) {
                emit({ type: "error", message: error instanceof Error ? error.message : "Generation failed" });
              }
            } finally {
              closed = true;
              controller.close();
            }
          },
          cancel() {
            // The request signal owns cancellation and is forwarded to every active upstream call.
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});