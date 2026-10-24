import type { Page } from "@playwright/test";
import { test } from "@playwright/test";

/**
 * Regenerates public/social-card.png and the raw capture converted to
 * public/demo.gif (the README's top artwork).
 *
 * Run (from the repository root, after `npm run build`):
 *   npx playwright test --config playwright.config.ts tests/capture-demo.spec.ts
 * Then:
 *   ffmpeg -i test-results/capture-demo-capture-demo/video.webm \
 *     -vf "fps=12,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=192:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle" \
 *     -loop 0 public/demo.gif
 *
 * Selection (curated, do not tune blind):
 *   - exact replay permalink (`i` + `s=4mp` = base-36 6,000): the run opens as
 *     a 6k-step seeded chaos cloud, grows for a beat, the classic ant's
 *     highway onset (≈ step 9,977) happens on camera, the live detector badge
 *     turns on, auto-pause freezes the reveal, and a final fit-frame holds the
 *     settled frame for the card.
 *   - "Starry Night" palette (deep midnight background, golden trail) so the
 *     chaos reads like a swirling sky — matching the project's dark art.
 *   - in-app speed bumped with `+` twice to bridge the recorder's paint-clock
 *     scaling (the captured clip then carries ~800-1,000 steps/s, and the
 *     6k -> 15k watched run lands around 14 s of footage).
 *   - the top HUD stays; the bottom transport and the side panel are hidden
 *     at capture time so the canvas frames edge to edge.
 */

const origin = "http://localhost:4174/langtons-ant/";

async function stepsAtLeastOrPaused(page: Page, want: number, timeoutMs: number): Promise<void> {
  await page.waitForFunction(
    (want) => {
      const m = document.querySelector("#status")?.textContent?.match(/steps([\d,]+)/);
      const stepped = m !== undefined && m !== null && Number(m[1].replace(/,/g, "")) >= want;
      const paused = document.querySelector("button[aria-label='Play']") !== null;
      return stepped || paused;
    },
    want,
    { timeout: timeoutMs, polling: 250 },
  );
}

test("capture demo", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${origin}#r=RL&i=AAAAAAE=&s=4mp&p=starry`);
  await stepsAtLeastOrPaused(page, 6_000, 40_000);
  await page.locator("#paletteSelect").selectOption("starry");
  await page.locator("#chkAutoPause").check();
  await page.addStyleTag({ content: "#transport,#panel,#toasts{display:none!important}" });
  for (let i = 0; i < 2; i++) await page.keyboard.press("+"); // recorder-aware speed
  await page.keyboard.press("f"); // fit the chaos cloud with margins
  await page.waitForTimeout(600);
  // Onset ≈ 9,977 happens in here; wait for the detector badge + auto-pause
  // (or a 16k-step ceiling), then hold the reveal.
  await stepsAtLeastOrPaused(page, 16_000, 120_000);
  await page.waitForTimeout(2_500);
  await page.keyboard.press("f"); // reframe: cloud + brand-new highway
  await page.waitForTimeout(2_500);
  await page.screenshot({ path: "public/social-card.png", type: "png" });
});
