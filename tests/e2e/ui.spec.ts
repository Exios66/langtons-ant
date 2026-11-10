import { expect, test, type Page } from "@playwright/test";

/**
 * End-to-end checks of the interface in a real browser, against the
 * production build (`npm run test:e2e` builds first).
 */

const APP = "/langtons-ant/";

/** Fail the test on any uncaught page error or console error. */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  return errors;
}

async function counter(page: Page, id: string): Promise<number> {
  const text = (await page.locator(`#${id}`).textContent()) ?? "";
  return Number(text.replace(/[^\d]/g, ""));
}

async function pause(page: Page): Promise<void> {
  if ((await page.locator("#btnPlay").getAttribute("aria-label")) === "Pause") {
    await page.keyboard.press("Space");
  }
  await expect(page.locator("#btnPlay")).toHaveAttribute("aria-label", "Play");
}

async function toColony(page: Page): Promise<void> {
  await page.keyboard.press("2");
  await expect(page.locator("body")).toHaveAttribute("data-mode", "colony");
}

let errors: string[] = [];

test.beforeEach(async ({ page }) => {
  errors = watchErrors(page);
  await page.goto(APP);
  await expect(page.locator("#btnPlay")).toBeVisible();
});

test.afterEach(() => {
  expect(errors).toEqual([]);
});

test.describe("turmite mode", () => {
  test("runs on first load with the ant in the middle of the view", async ({ page }) => {
    await expect.poll(() => counter(page, "st-steps")).toBeGreaterThan(200);
    // The painted cells sit around the canvas center, not in a corner.
    const lit = await page.evaluate(() => {
      const c = document.getElementById("board") as HTMLCanvasElement;
      const ctx = c.getContext("2d") as CanvasRenderingContext2D;
      const box = (x: number, y: number): number => {
        const d = ctx.getImageData(x, y, 120, 120).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 60) n++;
        return n;
      };
      return { center: box(c.width / 2 - 60, c.height / 2 - 60), corner: box(0, 60) };
    });
    expect(lit.center).toBeGreaterThan(50);
    expect(lit.corner).toBe(0);
  });

  test("an ant added while paused is drawn", async ({ page }) => {
    await pause(page);
    await page.mouse.move(5, 5);
    await page.waitForTimeout(1000); // let the afterglow fade so the frame is still
    const clip = await page.locator("#board").boundingBox();
    if (clip === null) throw new Error("no canvas");
    const region = { x: clip.width / 2 - 80, y: clip.height / 2 - 80, width: 160, height: 160 };
    const before = await page.screenshot({ clip: region });
    const ants = await counter(page, "st-ants");
    await page.locator("#btnAddAnt").click();
    await expect.poll(() => counter(page, "st-ants")).toBe(ants + 1);
    await expect.poll(async () => (await page.screenshot({ clip: region })).equals(before)).toBe(false);
  });

  test("the highway chip shows on a highway and belongs to turmite mode only", async ({ page }) => {
    // The classic ant builds its highway after ~10k steps: fast-forward past it.
    await page.locator("#btnJump").click();
    await page.locator("#btnJump").click();
    await expect(page.locator("#st-highway")).toBeVisible({ timeout: 15_000 });
    await toColony(page);
    await expect(page.locator("#st-highway")).toBeHidden();
    await page.keyboard.press("1");
    await expect(page.locator("#st-highway")).toBeVisible();
  });
});

test.describe("colony mode", () => {
  test("switches modes and runs", async ({ page }) => {
    await toColony(page);
    await expect(page.locator("#st-food")).toBeVisible();
    await expect(page.locator("#st-bbox")).toBeHidden();
    await expect.poll(() => counter(page, "st-steps")).toBeGreaterThan(50);
    expect(await counter(page, "st-ants")).toBeGreaterThan(0);
    await page.keyboard.press("1");
    await expect(page.locator("body")).toHaveAttribute("data-mode", "turmite");
    await expect(page.locator("#minimap")).toBeVisible();
  });

  test("every scenario loads and runs", async ({ page }) => {
    await toColony(page);
    const ids = await page.locator("#scenarioSelect option").evaluateAll((opts) =>
      opts.map((o) => (o as HTMLOptionElement).value),
    );
    expect(ids.length).toBe(5);
    for (const id of ids) {
      await page.selectOption("#scenarioSelect", id);
      await expect(page).toHaveURL(new RegExp(`sc=${id}`));
      await expect.poll(() => counter(page, "st-ants")).toBeGreaterThan(0);
      // The tick counter of this scenario's run keeps advancing.
      await expect
        .poll(async () => {
          const a = await counter(page, "st-steps");
          await page.waitForTimeout(400);
          return (await counter(page, "st-steps")) > a;
        })
        .toBe(true);
    }
  });

  test("a colony link restores scenario and seed", async ({ page }) => {
    // A fresh load: the app reads the link at startup (it has no hashchange handler).
    await page.goto("about:blank");
    await page.goto(`${APP}#m=colony&sc=maze&x=0000002a`);
    await expect(page.locator("body")).toHaveAttribute("data-mode", "colony");
    await expect(page.locator("#scenarioSelect")).toHaveValue("maze");
    await expect(page.locator("#colonySeed")).toContainText("0x0000002a");
  });

  test("the paint cursor follows the active tool", async ({ page }) => {
    await toColony(page);
    const board = page.locator("#board");
    await page.locator('[data-tool="wall"]').click();
    await expect(board).toHaveClass(/tooling/);
    await page.locator('[data-tool="pan"]').click();
    await expect(board).not.toHaveClass(/tooling/);
    await page.locator('[data-tool="food"]').click();
    await expect(board).toHaveClass(/tooling/);
    await page.keyboard.press("Escape");
    await expect(board).not.toHaveClass(/tooling/);
    await page.locator('[data-tool="erase"]').click();
    await page.locator("#btnColonyRestart").click();
    await expect(board).not.toHaveClass(/tooling/);
    await expect(page.locator('[data-tool="pan"]')).toHaveAttribute("aria-pressed", "true");
  });

  test("a fast drag paints an unbroken wall", async ({ page }) => {
    await toColony(page);
    await pause(page);
    await page.locator('[data-tool="wall"]').click();
    const box = await page.locator("#board").boundingBox();
    if (box === null) throw new Error("no canvas");
    // Stay well inside the map, which is fitted to the left part of the view.
    const y = box.height * 0.3;
    const x0 = box.width * 0.12;
    const x1 = box.width * 0.5;
    await page.mouse.move(x0, y);
    await page.mouse.down();
    await page.mouse.move(x1, y, { steps: 2 }); // two big jumps
    await page.mouse.up();
    await page.locator('[data-tool="pan"]').click();
    // Probe every pixel along the stroke through the hover read-out, and
    // check that the cells it crosses are all wall and form an unbroken run.
    const probe = await page.evaluate(
      ({ x0, x1, y, left, top }) => {
        const board = document.getElementById("board") as HTMLCanvasElement;
        const out = document.getElementById("st-cell") as HTMLElement;
        const cells = new Map<number, string>();
        for (let x = Math.ceil(x0); x <= Math.floor(x1); x++) {
          board.dispatchEvent(new PointerEvent("pointermove", { clientX: left + x, clientY: top + y, bubbles: true }));
          const text = out.textContent ?? "";
          const cx = Number(text.split(",")[0]);
          if (!cells.has(cx) || !text.includes("wall")) cells.set(cx, text);
        }
        return [...cells.entries()];
      },
      { x0, x1, y, left: box.x, top: box.y },
    );
    const xs = probe.map(([cx]) => cx).sort((a, b) => a - b);
    expect(xs.length).toBeGreaterThan(20);
    expect(xs[xs.length - 1] - xs[0] + 1).toBe(xs.length); // no skipped cell
    const gaps = probe.filter(([, text]) => !text.includes("wall")).map(([, text]) => text);
    expect(gaps).toEqual([]);
  });
});
