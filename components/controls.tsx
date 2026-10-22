import {
  Category,
  Dataset,
  Filters,
  defaults,
  kinds,
  labels,
} from "@/lib/model";
import { prepare, facet, results, Item } from "@/lib/engine";
import { ProviderFilter } from "./provider-filter";
import { PriceRangeForm } from "./price-range-form";

export default function Controls({
  value,
  change,
  data,
  categories,
  locations,
  items,
}: {
  value: Filters;
  change: (f: Filters) => void;
  data: Dataset;
  categories: Category[];
  locations: { key: string; label: string }[];
  items: Item[];
}) {
  const update = (patch: Partial<Filters>) =>
    change({ ...value, ...patch, page: 1 });
  const count = (
    dimension: Parameters<typeof facet>[2],
    key: (i: Item) => string,
    k: string,
  ) => facet(items, value, dimension, key).get(k) ?? 0;
  const option = (
    title: string,
    selected: boolean,
    n: number,
    click: () => void,
  ) => (
    <button
      key={title}
      type="button"
      onClick={click}
      disabled={!selected && n === 0}
      aria-pressed={selected}
      className=" flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm dark:text-white hover:bg-slate-50 dark:hover:text-gray-500 disabled:opacity-35"
    >
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className={
            "flex h-4 w-4 items-center justify-center rounded border " +
            (selected ?
              "border-teal-700 bg-teal-700 text-white"
            : "border-slate-300 hover:border-slate-500")
          }
        >
          {selected ? "✓" : ""}
        </span>
        {title}
      </span>
      <span className="text-gray-400 dark:text-gray-100 text-xs">{n}</span>
    </button>
  );
  return (
    <div className="space-y-6 dark:text-gray-800">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg dark:text-white">Filters</h2>
        <button
          className="text-sm text-teal-400 font-semibold"
          onClick={() => change(defaults)}
        >
          Clear all
        </button>
      </div>
      <section>
        <h3 className="font-semibold mb-2 dark:text-white">Service type</h3>
        {kinds.map((k) =>
          option(
            labels[k],
            value.types.includes(k),
            count("types", (i) => i.service.type, k),
            () =>
              update({
                types:
                  value.types.includes(k) ?
                    value.types.filter((t) => t !== k)
                  : [...value.types, k],
                category: "",
                subcategory: "",
              }),
          ),
        )}
      </section>
      <section>
        <h3 className="font-semibold mb-2 dark:text-white">Category</h3>
        <select
          aria-label="Category"
          className="field"
          value={value.category}
          onChange={(e) =>
            update({ category: e.target.value, subcategory: "" })
          }
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option
              key={c.id}
              value={c.id}
              disabled={
                !count("category", (i) => i.category?.id ?? "", c.id) &&
                value.category !== c.id
              }
            >
              {c.title} · {labels[c.type]} (
              {count("category", (i) => i.category?.id ?? "", c.id)})
            </option>
          ))}
        </select>
        {value.category && (
          <select
            aria-label="Subcategory"
            className="field mt-2"
            value={value.subcategory}
            onChange={(e) => update({ subcategory: e.target.value })}
          >
            <option value="">All subcategories</option>
            {categories
              .find((c) => c.id === value.category)
              ?.children.filter((c) => c.status)
              .map((c) => (
                <option
                  key={c.id}
                  value={c.id}
                  disabled={
                    !count(
                      "subcategory",
                      (i) => i.subcategory?.id ?? "",
                      c.id,
                    ) && value.subcategory !== c.id
                  }
                >
                  {c.title} (
                  {count("subcategory", (i) => i.subcategory?.id ?? "", c.id)})
                </option>
              ))}
          </select>
        )}
      </section>
      <section>
        <h3 className="font-semibold mb-2 dark:text-white">Location</h3>
        <select
          aria-label="City or country"
          className="field"
          value={value.location}
          onChange={(e) => update({ location: e.target.value })}
        >
          <option value="">All locations</option>
          {locations.map((l) => (
            <option
              key={l.key}
              value={l.key}
              disabled={
                !count(
                  "location",
                  (i) =>
                    (
                      [
                        i.provider.providerInformation.city?.slug,
                        i.provider.providerInformation.country?.alphaCode,
                      ].includes(l.key)
                    ) ?
                      l.key
                    : "",
                  l.key,
                ) && value.location !== l.key
              }
            >
              {l.label}
            </option>
          ))}
        </select>
      </section>
      {/* provider filter */}
      <ProviderFilter
        data={data}
        value={value}
        count={count}
        option={option}
        update={update}
      />
      <section>
        <h3 className="font-semibold mb-2 dark:text-white">Price range</h3>
        <p className="text-xs text-gray-400 dark:text-gray-200 mb-2">
          Choose one currency. No exchange-rate conversions.
        </p>
        <select
          aria-label="Price currency"
          className="field"
          value={value.currency}
          onChange={(e) =>
            update({ currency: e.target.value, min: "", max: "" })
          }
        >
          <option value="">Choose currency</option>
          {(["THB", "NPR", "INR"] as const).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <PriceRangeForm
          min={value.min}
          max={value.max}
          currency={value.currency}
          onApply={(values) => update(values)}
        />
      </section>
      <section>
        {option(
          "Home test available",
          value.home,
          facet(items, value, "home", (i) =>
            i.service.testAtHome ? "yes" : "no",
          ).get("yes") ?? 0,
          () => update({ home: !value.home }),
        )}
      </section>
    </div>
  );
}
