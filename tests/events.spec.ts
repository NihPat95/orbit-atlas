import { expect, test } from "@playwright/test";

test("shows trajectories and moves only to supported events", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Pause" }).click();

  const search = page.getByRole("searchbox", { name: "Search objects" });
  await search.fill("terra");
  await page.getByRole("button", { name: "Earth, Planet" }).click();
  await expect(page.getByText("Approximate preview path")).toBeVisible();
  await page.getByRole("button", { name: /march equinox/i }).click();
  await expect(page.getByTestId("timeline-date")).toHaveText("20 Mar 2026 UTC");

  await search.fill("ISS");
  await page
    .getByRole("button", { name: "International Space Station, Spacecraft" })
    .click();
  await expect(
    page.getByRole("button", { name: /first module launch/i }),
  ).toBeDisabled();
  await expect(page.getByTestId("timeline-date")).toHaveText("20 Mar 2026 UTC");
});
