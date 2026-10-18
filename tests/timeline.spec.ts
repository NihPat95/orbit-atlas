import { expect, test } from "@playwright/test";

test("controls playback and keeps the latest rapid UTC change", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Space map" })).toHaveAttribute(
    "aria-busy",
    "false",
  );

  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  await page
    .getByRole("combobox", { name: "Playback speed" })
    .selectOption("10");

  const slider = page.getByRole("slider", { name: "Simulation date" });
  await slider.fill("1768003200000");
  await slider.fill("1770681600000");
  await slider.fill("1773360000000");
  await expect(page.getByTestId("timeline-date")).toHaveText("13 Mar 2026 UTC");

  await page.getByRole("searchbox", { name: "Search objects" }).fill("ISS");
  await page
    .getByRole("button", { name: "International Space Station, Spacecraft" })
    .click();
  await slider.evaluate((input: HTMLInputElement) => {
    input.max = "1893456000000";
  });
  await slider.fill("1893456000000");
  await expect(
    page.getByRole("status", { name: "Date support" }),
  ).toContainText("unsupported");
});
