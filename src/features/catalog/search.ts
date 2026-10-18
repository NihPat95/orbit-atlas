import type { PreviewObject } from "../../data/previewCatalog";

export type CatalogCategory = PreviewObject["category"] | "ALL";

export function searchCatalog(
  objects: readonly PreviewObject[],
  query: string,
  category: CatalogCategory = "ALL",
): PreviewObject[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return objects.filter((object) => {
    if (category !== "ALL" && object.category !== category) return false;
    if (!normalizedQuery) return true;
    return [object.canonicalName, ...object.alternateNames].some((name) =>
      name.toLocaleLowerCase().includes(normalizedQuery),
    );
  });
}
