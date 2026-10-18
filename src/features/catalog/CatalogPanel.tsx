import { useMemo, useState } from "react";

import type { PreviewObject } from "../../data/previewCatalog";
import { searchCatalog, type CatalogCategory } from "./search";
import { DataStatusView } from "../status/DataStatusView";

interface CatalogPanelProps {
  objects: readonly PreviewObject[];
  selectedId: string | null;
  onSelect: (objectId: string) => void;
  objectErrors?: Readonly<Record<string, string>>;
}

const categories: readonly { id: CatalogCategory; label: string }[] = [
  { id: "ALL", label: "All objects" },
  { id: "STAR", label: "Stars" },
  { id: "PLANET", label: "Planets" },
  { id: "MOON", label: "Moons" },
  { id: "SPACECRAFT", label: "Spacecraft" },
];

export function CatalogPanel({
  objects,
  selectedId,
  onSelect,
  objectErrors = {},
}: CatalogPanelProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CatalogCategory>("ALL");
  const results = useMemo(
    () => searchCatalog(objects, query, category),
    [category, objects, query],
  );

  return (
    <aside aria-label="Object catalog" className="panel catalog-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Explore</p>
          <h2>Object catalog</h2>
        </div>
        <span className="panel-count">{objects.length}</span>
      </div>

      <label className="search-shell" htmlFor="catalog-search">
        <span aria-hidden="true">⌕</span>
        <span className="sr-only">Search objects</span>
        <input
          id="catalog-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search objects"
          type="search"
          value={query}
        />
      </label>

      <div
        aria-label="Catalog categories"
        className="category-tabs"
        role="group"
      >
        {categories
          .filter(
            ({ id }) =>
              id === "ALL" || objects.some((object) => object.category === id),
          )
          .map(({ id, label }) => (
            <button
              aria-pressed={category === id}
              key={id}
              onClick={() => setCategory(id)}
              type="button"
            >
              {label}
            </button>
          ))}
      </div>

      <div aria-live="polite" className="catalog-results">
        {results.length ? (
          results.map((object) => (
            <button
              aria-label={`${object.canonicalName}, ${categoryName(object.category)}`}
              aria-pressed={selectedId === object.id}
              aria-describedby={
                objectErrors[object.id] ? `${object.id}-error` : undefined
              }
              className="catalog-result"
              disabled={Boolean(objectErrors[object.id])}
              key={object.id}
              onClick={() => onSelect(object.id)}
              type="button"
            >
              <span
                aria-hidden="true"
                className="catalog-result__marker"
                style={{ backgroundColor: object.color }}
              />
              <span>
                <strong>{object.canonicalName}</strong>
                <small>{categoryName(object.category)}</small>
                {objectErrors[object.id] ? (
                  <small
                    className="catalog-result__error"
                    id={`${object.id}-error`}
                  >
                    {objectErrors[object.id]}
                  </small>
                ) : null}
              </span>
            </button>
          ))
        ) : (
          <DataStatusView kind="empty" />
        )}
      </div>

      <p className="panel-note">
        Preview motion is deterministic and illustrative. Validated source data
        replaces it during dataset integration.
      </p>
    </aside>
  );
}

function categoryName(category: PreviewObject["category"]): string {
  return category.charAt(0) + category.slice(1).toLocaleLowerCase();
}
