# Distinct Premium Generations

## Goal
Make every new generation visually distinct, even when the prompt is repeated, while keeping all screens created in one run cohesive and premium.

## Changes
- Create a fresh variation identity for every generation request.
- Choose one coordinated art direction per run from a curated set of premium visual systems, with distinct layout rhythm, typography, density, navigation treatment, palette, and surface style.
- Pass that same variation through every screen in the generated family so sibling pages still look like one product.
- Strengthen the generation instructions to reject repetitive template patterns and require meaningful structural variation, not just color changes.
- Preserve uploaded references as the strongest visual instruction; variation will complement rather than override them.
- Keep the current canvas, streaming behavior, and screen planning unchanged.

## Technical details
- Add a client-generated run identifier to each `/api/generate-image` request.
- Resolve that identifier server-side into a deterministic premium design direction for the duration of that request.
- Include the selected direction and run identifier in every screen prompt to encourage non-identical model output on repeated briefs.
- Add focused tests for deterministic-within-run and varied-across-run behavior, then verify one real streamed generation request and the current build state.
