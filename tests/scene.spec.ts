import { expect, test } from "@playwright/test";

test("renders a moving interactive WebGL scene with reset and labels", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      pageErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");

  const scene = page.getByTestId("orbit-scene");
  await expect(scene).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset view" })).toBeEnabled();
  const earthLabel = page.getByRole("button", { name: "Earth", exact: true });
  await expect(earthLabel).toBeVisible();
  await earthLabel.evaluate((button: HTMLButtonElement) => button.click());
  await expect(earthLabel).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("region", { name: "Space map" })).toHaveAttribute(
    "aria-busy",
    "false",
  );

  const canvasBox = await scene.boundingBox();
  expect(canvasBox).not.toBeNull();
  if (canvasBox) {
    await page.mouse.move(
      canvasBox.x + canvasBox.width / 2,
      canvasBox.y + canvasBox.height / 2,
    );
    await page.mouse.wheel(0, -300);
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width * 0.65,
      canvasBox.y + 40,
    );
    await page.mouse.up();
  }
  await page.getByRole("button", { name: "Reset view" }).click();

  await page.setViewportSize({ width: 1024, height: 720 });
  await expect(scene).toBeVisible();
  expect(pageErrors).toEqual([]);
});
