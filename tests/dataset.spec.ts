import { expect, test } from "@playwright/test";

test("serves the validated 25-object dataset and its motion assets", async ({
  request,
}) => {
  const manifestResponse = await request.get("data/manifest.json");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  const catalogResponse = await request.get(manifest.assets.catalog.path);
  expect(catalogResponse.ok()).toBe(true);
  const catalog = await catalogResponse.json();

  expect(catalog.objects).toHaveLength(25);
  expect(manifest.assets.motion).toHaveLength(25);
  const firstMotion = await request.get(manifest.assets.motion[0].path);
  expect(firstMotion.ok()).toBe(true);
});
