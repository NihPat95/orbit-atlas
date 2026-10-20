# Orbit Atlas security boundary

Orbit Atlas is a static, same-origin application. Runtime assets are schema-validated and SHA-256 checked before use. The application renders provider text through React's escaped text nodes and never renders catalog HTML.

The production document uses a GitHub Pages-compatible Content Security Policy: scripts, data, workers, and styles are same-origin; inline styles are permitted for the procedural UI; objects and framing are disabled. Dataset paths are allowlisted relative paths and are resolved against the configured same-origin base URL.

The worker and schemas bound object counts, array sizes, finite numeric values, validity ranges, and request generations. Requests are cancellable, stale worker responses are discarded, and malformed or corrupt assets fail closed without inventing positions.

Before release, run `npm audit --omit=dev` against the committed lockfile and `npm run test:security`. Review any reachable high or critical advisory before deployment.
