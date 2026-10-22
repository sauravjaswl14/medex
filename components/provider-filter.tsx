"use client";

import { Dataset, Filters } from "@/lib/model";
import { facet, Item } from "@/lib/engine";
import { useState } from "react";

interface ProviderFilterProps {
  data: Dataset;
  value: Filters;
  count: (
    dimension: Parameters<typeof facet>[2],
    key: (i: Item) => string,
    k: string,
  ) => number;
  option: (
    title: string,
    selected: boolean,
    n: number,
    click: () => void,
  ) => React.ReactNode;
  update: (patch: Partial<Filters>) => void;
}

export const ProviderFilter = ({
  data,
  value,
  count,
  option,
  update,
}: ProviderFilterProps) => {
  const [providerSearch, setProviderSearch] = useState("");

  return (
    <section>
      <h3 className="font-semibold mb-2 dark:text-white">Providers</h3>
      <input
        className="field mb-2"
        placeholder="Find a provider"
        aria-label="Find provider filter"
        value={providerSearch}
        onChange={(e) => setProviderSearch(e.target.value)}
      />
      <div className="max-h-44 overflow-auto ">
        {data.providers
          .filter(
            (p) =>
              p.status === "active" &&
              p.name.toLowerCase().includes(providerSearch.toLowerCase()),
          )
          .map((p) =>
            option(
              p.name,
              value.providers.includes(String(p.id)),
              count("providers", (i) => String(i.provider.id), String(p.id)),
              () =>
                update({
                  providers:
                    value.providers.includes(String(p.id)) ?
                      value.providers.filter((x) => x !== String(p.id))
                    : [...value.providers, String(p.id)],
                }),
            ),
          )}
      </div>
    </section>
  );
};
