import { expect, test } from "@playwright/test";

test("discloses provenance while preserving exploration across display changes", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Pause" }).click();
  await page.getByRole("searchbox", { name: "Search objects" }).fill("terra");
  await page.getByRole("button", { name: "Earth, Planet" }).click();
  const dateBefore = await page.getByTestId("timeline-date").textContent();

  await expect(page.getByTestId("plain-summary")).toBeVisible();
  await page.getByText("Technical and orbital details").click();
  await expect(page.getByText("Limitations")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Reference frame" })
    .selectOption("EARTH_CENTERED");
  await page
    .getByRole("combobox", { name: "Displayed scale" })
    .selectOption("RELATIVE");

  await expect(page.getByRole("heading", { name: "Earth" })).toBeVisible();
  await expect(page.getByText("Following Earth")).toBeVisible();
  await expect(page.getByTestId("timeline-date")).toHaveText(dateBefore ?? "");
  const details = page.getByRole("complementary", { name: "Object details" });
  await expect(
    details.getByText("Earth-centered", { exact: true }),
  ).toBeVisible();
  await expect(details.getByText("Relative", { exact: true })).toBeVisible();
});
