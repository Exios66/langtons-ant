import { test } from "@playwright/test";

/**
 * Regenerates public/social-card.png and public/demo.gif.
 *
 * Run:  npx playwright test tests/capture-demo.spec.ts
 * Then: ffmpeg -i test-results/capture-demo-capture-demo/video.webm \
 *         -vf "fps=15,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" \
 *         -loop 0 public/demo.gif
 *
 * Captures the classic ant on the "Starry Night" palette (deep midnight blue
 * background, golden trail) so the chaos cloud reads like a swirling sky.
 */
test("capture demo", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("http://localhost:4174/langtons-ant/#r=RL&a=AAAAAAEA&s=bko&p=starry");
  // let the ant build the chaos cloud + highway stub
  await page.waitForTimeout(13000);
  await page.keyboard.press("f");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "public/social-card.png", type: "png" });
});
