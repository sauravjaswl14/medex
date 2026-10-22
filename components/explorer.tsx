"use client";
import Link from "next/link";
import {
  useState,
  useMemo,
  useEffect,
  useDeferredValue,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Star,
  X,
  ChevronDown,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import {
  Dataset,
  Filters,
  defaults,
  labels,
  parseFilters,
  serialize,
} from "@/lib/model";
import Controls from "@/components/controls";
import { prepare, facet, results, Item } from "@/lib/engine";
import { Button } from "@/components/ui/button";
import * as Dialog from "@radix-ui/react-dialog";
import Navbar from "./nav-bar";

const client = new QueryClient({
  defaultOptions: { queries: { staleTime: 300000, retry: 1 } },
});

const size = 8;
const fetchPart = async (key: keyof Dataset) => {
  const res = await fetch(
    `/api/${key}${new URLSearchParams(window.location.search).get("fail") === "1" ? "?fail=1" : ""}`,
  );
  if (!res.ok) throw Error("Unable to load " + key);
  return res.json();
};

const money = (value: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

function Content({
  initial,
  initialData,
}: {
  initial: Filters;
  initialData: Dataset;
}) {
  const router = useRouter();
  const [filters, setFilters] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [drawer, setDrawer] = useState(false);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [pending, startTransition] = useTransition();
  const [isOffline, setOffline] = useState(false);

  const [localSearch, setLocalSearch] = useState(initial.q);
  const deferredSearch = useDeferredValue(localSearch);
  useEffect(() => {
    const sync = () => {
      const f = parseFilters(new URLSearchParams(location.search));
      setFilters(f);
      setDraft(f);
      setLocalSearch(f.q);
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  useEffect(() => {
    setOffline(!navigator.onLine);
    const online = () => setOffline(false),
      offline = () => setOffline(true);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchPart("categories"),
    initialData: initialData.categories,
  });
  const providers = useQuery({
    queryKey: ["providers"],
    queryFn: () => fetchPart("providers"),
    initialData: initialData.providers,
  });
  const services = useQuery({
    queryKey: ["services"],
    queryFn: () => fetchPart("services"),
    initialData: initialData.services,
  });
  const error = categories.isError || providers.isError || services.isError;
  const loading =
    categories.isPending || providers.isPending || services.isPending;
  const data = useMemo<Dataset>(
    () => ({
      categories: categories.data ?? [],
      providers: providers.data ?? [],
      services: services.data ?? [],
    }),
    [categories.data, providers.data, services.data],
  );
  const items = useMemo(() => prepare(data), [data]);
  const effective = useMemo(
    () => ({ ...filters, q: deferredSearch }),
    [filters, deferredSearch],
  );
  const computed = useMemo(() => results(items, effective), [items, effective]);
  const pendingComputed = useMemo(() => results(items, draft), [items, draft]);
  const groups = computed.groups.slice(
    (filters.page - 1) * size,
    filters.page * size,
  );
  const pages = Math.max(1, Math.ceil(computed.groups.length / size));
  function apply(next: Filters) {
    const f = { ...next, page: 1 };
    setFilters(f);
    setDraft(f);
    setLocalSearch(f.q);
    startTransition(() =>
      router.push("/" + (serialize(f) ? "?" + serialize(f) : ""), {
        scroll: false,
      }),
    );
  }
  function pageTo(n: number) {
    const f = { ...filters, page: n };
    setFilters(f);
    startTransition(() =>
      router.push("/" + (serialize(f) ? "?" + serialize(f) : ""), {
        scroll: false,
      }),
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  useEffect(() => {
    if (localSearch === filters.q) return;
    const timer = setTimeout(() => {
      const f = { ...filters, q: localSearch, page: 1 };
      setFilters(f);
      startTransition(() =>
        router.replace("/" + (serialize(f) ? "?" + serialize(f) : ""), {
          scroll: false,
        }),
      );
    }, 250);
    return () => clearTimeout(timer);
  }, [localSearch]);
  const categoriesList = data.categories
    .filter((c) => c.status)
    .sort((a, b) => a.position - b.position);
  const locations = [
    ...new Map(
      data.providers
        .filter((p) => p.status === "active")
        .flatMap((p) =>
          [
            p.providerInformation.city ?
              {
                key: p.providerInformation.city.slug,
                label: p.providerInformation.city.name,
              }
            : null,
            p.providerInformation.country ?
              {
                key: p.providerInformation.country.alphaCode,
                label: p.providerInformation.country.name,
              }
            : null,
          ].filter((x): x is { key: string; label: string } => x !== null),
        )
        .map((x) => [x.key, x]),
    ).values(),
  ].sort((a, b) => a.label.localeCompare(b.label));

  return (
    <>
      <Navbar />
      <main className={`mx-auto px-32 py-8 dark:bg-gray-800 dark:text-white`}>
        <div className="mb-8">
          <p className="text-teal-700 text-sm font-semibold mb-2">
            DISCOVER YOUR CARE
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Find the right care for you.
          </h1>
          <p className="muted mt-2">
            Explore healthcare services across Thailand, Nepal and India.
          </p>
        </div>
        <div className="grid lg:grid-cols-[280px_minmax(0,1fr)] gap-6">
          <aside className="p-5 bg-white dark:border-2 dark:border-teal-800 dark:bg-gray-700 rounded-2xl hidden lg:block self-start sticky top-20">
            <Controls
              value={filters}
              change={apply}
              data={data}
              categories={categoriesList}
              locations={locations}
              items={items}
            />
          </aside>
          <div className="min-w-0 dark:text-gray-800">
            <div className="bg-white dark:bg-gray-700 dark:border-2 dark:border-teal-800 rounded-2xl dark:text-white p-4 mb-5 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  className="field pl-10 dark:dark:bg-gray-700 dark:border-teal-800 dark:text-gray-700 w-full"
                  aria-label="Search services, providers and categories"
                  placeholder="Search check-ups, hospitals, lab tests..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                />
                <Search
                  className="absolute right-3 top-3 text-slate-400"
                  size={20}
                />
              </div>
              <button
                className="lg:hidden field flex items-center justify-center gap-2"
                onClick={() => {
                  setDraft({ ...filters, q: localSearch });
                  setDrawer(true);
                }}
              >
                <SlidersHorizontal size={17} /> Filters
              </button>
              <select
                className=" sm:w-48  rounded-md hover:cursor-pointer dark:bg-gray-700 dark:border-teal-800 dark:text-white"
                aria-label="Sort results"
                value={filters.sort}
                onChange={(e) => apply({ ...filters, sort: e.target.value })}
              >
                <option value="relevance">Most relevant</option>
                <option value="asc">Price: low to high</option>
                <option value="desc">Price: high to low</option>
                <option value="rating">Highest rated</option>
              </select>
            </div>
            {isOffline && (
              <div
                role="status"
                className="p-3 mb-4 bg-amber-50 text-amber-900 rounded-lg"
              >
                You're offline. Showing the data already available on this page.
              </div>
            )}
            {error && (
              <div role="alert" className="panel p-6 mb-5">
                <h2 className="font-semibold">
                  We couldn't refresh the services
                </h2>
                <p className="muted my-2">
                  You can keep browsing saved results, or try again.
                </p>
                <button
                  className="btn flex items-center gap-2"
                  onClick={() => {
                    categories.refetch();
                    providers.refetch();
                    services.refetch();
                  }}
                >
                  <RefreshCw size={16} /> Retry
                </button>
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <p
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="font-semibold dark:text-teal-400 "
              >
                {computed.count.toLocaleString()} services ·{" "}
                {computed.groups.length} providers{" "}
                {pending ? "· Updating…" : ""}
              </p>
              <span className="text-gray-700  dark:text-teal-400 text-xs">
                Prices shown in provider currency
              </span>
            </div>
            {loading ?
              <div className="space-y-4">
                {[1, 2, 3].map((x) => (
                  <div key={x} className="panel h-56 skeleton" />
                ))}
              </div>
            : groups.length === 0 ?
              <div className="panel text-center p-12">
                <h2 className="text-xl font-bold">No matching services</h2>
                <p className="muted mt-2 mb-5">
                  Try a broader search or remove a filter.
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    className="btn"
                    onClick={() => apply({ ...filters, min: "", max: "" })}
                  >
                    Remove price filter
                  </button>
                  <button className="chip" onClick={() => apply(defaults)}>
                    Clear all
                  </button>
                </div>
              </div>
            : <div className="space-y-4">
                {groups.map((g) => {
                  const p = g.provider;
                  const show =
                    expanded.includes(p.id) ? g.items : g.items.slice(0, 3);
                  return (
                    <article
                      key={p.id}
                      className="bg-white rounded-3xl text-gray-700 dark:text-white dark:bg-gray-700 border-2 border-gray-200 dark:border-teal-800 overflow-hidden "
                    >
                      <div className="p-5 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-bold">{p.name}</h2>
                          <div className="muted text-sm flex items-center gap-2 mt-1">
                            <MapPin size={14} />
                            {p.providerInformation.city?.name ??
                              "Location unavailable"}
                            ,{" "}
                            {p.providerInformation.country?.name ??
                              "Unknown country"}{" "}
                            · {p.providerInformation.currency}
                          </div>
                        </div>
                        <div className="text-sm ">
                          {p.providerInformation.rating === null ?
                            <span className="muted dark:text-white">
                              Not rated yet
                            </span>
                          : <span className="flex items-center gap-1 font-semibold ">
                              <Star
                                size={16}
                                className="fill-amber-400 text-amber-400"
                              />
                              <span className="dark:text-white">
                                {p.providerInformation.rating.toFixed(1)}
                              </span>{" "}
                              <span className="text-gray-600 font-normal dark:text-white">
                                ({p.providerInformation.reviewCount ?? 0})
                              </span>
                            </span>
                          }
                        </div>
                      </div>
                      <div className="">
                        {show.map((i) => (
                          <div
                            key={i.service.id}
                            className="p-4 sm:p-5 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-teal-700 dark:text-teal-400 mb-1">
                                {labels[i.service.type]}{" "}
                                {i.service.testAtHome ?
                                  "· Home test available"
                                : ""}
                              </div>
                              <h3 className="font-semibold">
                                {i.service.title}
                              </h3>
                              <p className="text-gray-600 text-xs mt-1 dark:text-white">
                                {i.category?.title ?? "Uncategorised"}
                                {i.subcategory ?
                                  " / " + i.subcategory.title
                                : ""}
                                {i.duration !== null ?
                                  ` · From ${i.duration} min`
                                : ""}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              {i.price === null ?
                                <span className="muted text-sm">
                                  Ask for price
                                </span>
                              : <>
                                  <div className="font-bold text-teal-800 dark:text-teal-400">
                                    {money(i.price, i.currency)}
                                  </div>
                                  {i.original !== null &&
                                    i.original > i.price && (
                                      <del className="text-gray-700 dark:text-teal-400 text-xs">
                                        {money(i.original, i.currency)}
                                      </del>
                                    )}
                                  {i.service.type === "wellness" && (
                                    <p className="text-gray-700 dark:text-teal-400 text-xs">
                                      Lowest duration price
                                    </p>
                                  )}
                                </>
                              }
                            </div>
                          </div>
                        ))}
                      </div>
                      {g.items.length > 3 && (
                        <button
                          className="w-full border-t border-slate-100 dark:border-slate-50 p-3 text-teal-400 font-semibold text-sm hover:bg-teal-50 flex items-center justify-center gap-2"
                          aria-expanded={expanded.includes(p.id)}
                          onClick={() =>
                            setExpanded((v) =>
                              v.includes(p.id) ?
                                v.filter((x) => x !== p.id)
                              : [...v, p.id],
                            )
                          }
                        >
                          {expanded.includes(p.id) ?
                            "Show fewer"
                          : `View all ${g.items.length} matching services`}{" "}
                          <ChevronDown size={16} />
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            }
            {pages > 1 && (
              <nav
                aria-label="Results pagination"
                className="flex items-center justify-center gap-3 mt-8"
              >
                <button
                  className="chip"
                  disabled={filters.page <= 1}
                  onClick={() => pageTo(filters.page - 1)}
                >
                  Previous
                </button>
                <span className="text-sm muted">
                  Page {filters.page} of {pages}
                </span>
                <button
                  className="chip"
                  disabled={filters.page >= pages}
                  onClick={() => pageTo(filters.page + 1)}
                >
                  Next
                </button>
              </nav>
            )}
          </div>
        </div>
      </main>
      <Dialog.Root open={drawer} onOpenChange={setDrawer}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/50 data-[state=open]:animate-in" />
          <Dialog.Content
            aria-describedby="filter-drawer-description"
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-white flex flex-col shadow-xl"
          >
            <div className="p-4 border-b flex justify-between items-center">
              <Dialog.Title className="font-bold">Refine results</Dialog.Title>
              <Dialog.Close
                aria-label="Close filters"
                className="rounded-md p-2 hover:bg-slate-100"
              >
                <X />
              </Dialog.Close>
            </div>
            <p id="filter-drawer-description" className="sr-only">
              Choose filters, then apply to update results.
            </p>
            <div className="p-5 overflow-auto flex-1">
              <Controls
                value={draft}
                change={setDraft}
                data={{
                  categories: [],
                  providers: [],
                  services: [],
                }}
                categories={[]}
                locations={[]}
                items={[]}
              />
            </div>
            <div className="p-4 border-t">
              <Button
                className="w-full"
                onClick={() => {
                  apply(draft);
                  setDrawer(false);
                }}
              >
                Show {pendingComputed.count.toLocaleString()} results{" "}
                <ArrowRight className="inline ml-1" size={16} />
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

export default function Explorer(props: {
  initial: Filters;
  initialData: Dataset;
}) {
  return (
    <QueryClientProvider client={client}>
      <Content {...props} />
    </QueryClientProvider>
  );
}
