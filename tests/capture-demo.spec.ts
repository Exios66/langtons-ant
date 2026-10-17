import { test } from "@playwright/test";

/**
 * Regenerates public/social-card.png (and, with ffmpeg, a demo GIF).
 *
 * Run:  npx playwright test tests/capture-demo.spec.ts
 * Then: ffmpeg -i test-results/.../video.webm -vf "fps=12,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" -loop 0 public/demo.gif
 *
 * The spec records a 14-second clip of the classic ant's chaos->highway
 * transition at 1000 steps/s, then fits the view.
 */
test("capture demo", async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("http://localhost:4174/langtons-ant/");
  await page.waitForTimeout(1000);
  // reset to a clean run and let the chaos blob + highway stub form
  await page.keyboard.press("r");
  await page.waitForTimeout(11000);
  await page.keyboard.press("f");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "public/social-card.png", type: "png" });
});
