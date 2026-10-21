# MedEx Service Explorer

Next.js App Router / TypeScript / Tailwind CSS v4 / TanStack Query. No RHF: filters are not a submission form. Zod is intentionally omitted from the hot path; an API boundary schema is a sensible production extension. Controls use accessible native inputs and selects with shadcn-inspired styling rather than installing the full shadcn registry.

## Run

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

Open http://localhost:3000. Mock endpoints: `/api/categories`, `/api/providers`, `/api/services` (independent). Each supports `?fail=1` and `?delay=1500`. Open `/?fail=1` to demonstrate error and retry; query initial data is still available as fallback. `?fail=1` is a demo switch and retry will continue failing until it is removed. Use browser devtools offline mode for the offline banner.

## Decisions

- **Visibility:** exclude inactive services, inactive providers, inactive parent categories, inactive subcategories, broken category references and mismatched parent/child relationships. Missing category IDs are allowed only when the service explicitly has no category. Unknown providers are excluded.
- **Category identity:** IDs are canonical; never use slug as the category key. `ultrasound` is shared across `package` and `lab_test`.
- **Money:** fixed-point micro-units with BigInt for intermediate operations. This prevents binary floating-point drift for ordinary API decimals; percent division truncates beyond six decimal places, a documented precision limitation. Invalid prices show “Ask for price” rather than invented amounts. Price sorting puts unpriced services last. Wellness uses the lowest valid duration option as a labelled indicative price; actual booking requires choosing an option.
- **Currencies:** no conversion or addition. Price filtering requires explicit THB/NPR/INR selection; prices in other currencies are excluded when a range is set. Without a range, all currencies remain visible. Global price sort compares nominal amounts across currencies, **not economic value**; production should require currency selection before enabling price sort.
- **Facets:** disjunctive counts: exclude the facet's own filter and retain every other active filter. Multi-select ORs within type/provider; AND across dimensions. Counts refer to services, not providers. Zero-count options are disabled but visible so customers understand unavailable combinations.
- **Relevance:** matching service title ranks above category title, then provider name; ties prefer rated providers then service title. With no search, rating and title determine order.
- **URL:** filters, sort and provider-group page are encoded in search parameters. The server reads them for the initial render, avoiding an initial unfiltered flash. Browser back/forward updates local state. Pagination is by provider group, eight groups per page; each card shows three services until expanded.
- **Search:** deferred search computation and debounced URL writes. Local keystrokes are not blocked by router navigation.
- **Layout:** result cards have predictable structure, but expanding services increases card height intentionally. A fully fixed-height results region would require virtualization and careful focus handling.

## Known limitations and follow-up work

- Mobile dialog has Escape handling and semantic dialog attributes, but **does not yet implement focus trapping, initial focus or focus restoration**. Add Radix Dialog for production-grade keyboard behavior.
- The initial dataset is server-injected into TanStack Query, so skeletons are primarily visible during client-only data loading; a dedicated loading route and a delayed server loader would make the skeleton state easier to demonstrate.
- Facet computation scans 3,200 items for each option. For much larger data, build inverted indices/bitsets and benchmark worker offloading.
- Category/provider facet counts for multi-select are self-excluding; some native select options cannot be chosen when zero, as intended.
- Current price calculations exclude optional home-test charges, since they are not part of the supplied final-price formula.
- No booking workflow, real exchange rates, or service-detail API is included in this task.

## Performance measurement (run locally)

Open Chrome Performance panel, use CPU 4x slowdown, record changing type/location/price filters with all 3,200 services loaded, and inspect scripting time and long tasks. Measure input latency with the Performance panel while typing one character at a time. The target is under ~100 ms per filter operation on a midrange laptop. **No measured timings are claimed here:** this repository was generated without a browser benchmark. Also inspect Layout Shift in Chrome Performance while filters update; skeletons and stable card wrappers reduce movement, but dynamic group counts can still shift the page. Record actual device/browser/results in your submission.
