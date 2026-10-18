import { expect, test } from "@playwright/test";

test("searches, selects, follows, recenters, and resets", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Space map" })).toHaveAttribute(
    "aria-busy",
    "false",
  );

  const search = page.getByRole("searchbox", { name: "Search objects" });
  await search.fill("terra");
  await page.getByRole("button", { name: "Earth, Planet" }).click();
  await expect(page.getByRole("heading", { name: "Earth" })).toBeVisible();
  await expect(page.getByText("Following Earth")).toBeVisible();

  await page.getByRole("button", { name: "Stop following" }).click();
  await expect(page.getByText("Free camera")).toBeVisible();
  await page.getByRole("button", { name: "Recenter Earth" }).click();
  await expect(page.getByText("Following Earth")).toBeVisible();

  await page.getByRole("button", { name: "Reset exploration" }).click();
  await expect(
    page.getByRole("heading", { name: "Nothing selected" }),
  ).toBeVisible();
});
