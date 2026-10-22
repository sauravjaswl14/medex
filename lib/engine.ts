import {
    Category,
    Dataset,
    Filters,
    Provider,
    Service,
    Currency,
    Pricing,
} from "./model";
export type Item = {
    service: Service;
    provider: Provider;
    category: Category | null;
    subcategory: Category | null;
    currency: Currency;
    price: number | null;
    original: number | null;
    duration: number | null;
    search: string;
};
// Integer micro-units preserve fractional percentage calculations without rounding intermediate steps.
const SCALE = 1000000n;
function decimal(value: string | null | undefined): bigint | null {
    if (value === null || value === undefined || !/^\d+(?:\.\d+)?$/.test(value))
        return null;
    const [whole, fraction = ""] = value.split(".");
    if (fraction.length > 6) return null;
    return BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, "0"));
}
export function finalPrice(p: Pricing): number | null {
    const base = decimal(p.price);
    if (base === null) return null;
    const discount = decimal(p.discount ?? "0");
    const charge = decimal(p.serviceCharge ?? "0");
    if (discount === null || charge === null) return null;
    if (p.discountType === "percent" && discount > 100n * SCALE) return null;
    const deduction =
        p.discountType === "percent" ?
            (base * discount) / (100n * SCALE)
            : discount;
    if (deduction > base) return null;
    const after = base - deduction;
    const extra =
        p.serviceChargeType === "percent" ?
            (after * charge) / (100n * SCALE)
            : charge;
    const final = after + extra;
    return Number(final) / Number(SCALE);
}
export function prepare(data: Dataset): Item[] {
    const providers = new Map(data.providers.map((p) => [p.id, p]));
    const cats = new Map<string, Category>();
    for (const c of data.categories) {
        cats.set(c.id, c);
        for (const child of c.children) cats.set(child.id, child);
    }
    return data.services.flatMap((service) => {
        const provider = providers.get(service.userId);
        const category =
            service.categoryId ? (cats.get(service.categoryId) ?? null) : null;
        const subcategory =
            service.subCategoryId ? (cats.get(service.subCategoryId) ?? null) : null;
        if (
            !service.status ||
            !provider ||
            provider.status !== "active" ||
            (service.categoryId && (!category || !category.status)) ||
            (service.subCategoryId && (!subcategory || !subcategory.status)) ||
            (category && category.parentId !== null) ||
            (subcategory && subcategory.parentId !== category?.id)
        )
            return [];
        const prices =
            service.type === "wellness" ?
                service.wellnessPricing
                    .map((w) => ({
                        value: finalPrice(w),
                        original: Number(w.price),
                        duration: w.durationInMinutes,
                    }))
                    .filter((x) => x.value !== null)
                    .sort((a, b) => a.value! - b.value!)
                : [
                    {
                        value: finalPrice(service),
                        original: Number(service.price),
                        duration: null,
                    },
                ];
        const best = prices[0];
        const price = best?.value ?? null;
        return [
            {
                service,
                provider,
                category,
                subcategory,
                currency: provider.providerInformation.currency,
                price,
                original: best && Number.isFinite(best.original) ? best.original : null,
                duration: best?.duration ?? null,
                search: [
                    service.title,
                    provider.name,
                    category?.title,
                    subcategory?.title,
                ]
                    .join(" ")
                    .toLowerCase(),
            },
        ];
    });
}
export type Dimension =
    | "types"
    | "category"
    | "subcategory"
    | "providers"
    | "location"
    | "currency"
    | "price"
    | "home"
    | "q";
export function matches(item: Item, f: Filters, omit?: Dimension) {
    if (
        omit !== "q" &&
        f.q &&
        !f.q
            .toLowerCase()
            .trim()
            .split(/\s+/)
            .every((word) => item.search.includes(word))
    )
        return false;
    if (
        omit !== "types" &&
        f.types.length &&
        !f.types.includes(item.service.type)
    )
        return false;
    if (omit !== "category" && f.category && item.category?.id !== f.category)
        return false;
    if (
        omit !== "subcategory" &&
        f.subcategory &&
        item.subcategory?.id !== f.subcategory
    )
        return false;
    if (
        omit !== "providers" &&
        f.providers.length &&
        !f.providers.includes(String(item.provider.id))
    )
        return false;
    if (
        omit !== "location" &&
        f.location &&
        item.provider.providerInformation.city?.slug !== f.location &&
        item.provider.providerInformation.country?.alphaCode !== f.location
    )
        return false;
    if (omit !== "currency" && f.currency && item.currency !== f.currency)
        return false;
    if (omit !== "home" && f.home && !item.service.testAtHome) return false;
    if (omit !== "price" && (f.min || f.max)) {
        if (!f.currency || item.currency !== f.currency || item.price === null)
            return false;
        const min = f.min ? Number(f.min) : 0,
            max = f.max ? Number(f.max) : Infinity;
        if (!Number.isFinite(min) || Number.isNaN(max) || min < 0 || max < min)
            return false;
        if (item.price < min || item.price > max) return false;
    }
    return true;
}
export function facet(
    items: Item[],
    f: Filters,
    dimension: Dimension,
    key: (i: Item) => string,
) {
    const counts = new Map<string, number>();
    for (const i of items)
        if (matches(i, f, dimension)) {
            const k = key(i);
            counts.set(k, (counts.get(k) ?? 0) + 1);
        }
    return counts;
}
export function results(items: Item[], f: Filters) {
    const found = items.filter((i) => matches(i, f));
    const q = f.q.toLowerCase().trim();
    const score = (i: Item) =>
        q ?
            (i.service.title.toLowerCase().includes(q) ? 3 : 0) +
            (i.category?.title.toLowerCase().includes(q) ? 2 : 0) +
            (i.provider.name.toLowerCase().includes(q) ? 1 : 0)
            : 0;
    found.sort((a, b) =>
        f.sort === "rating" ?
            (b.provider.providerInformation.rating ?? -1) -
            (a.provider.providerInformation.rating ?? -1)
            : f.sort === "asc" ? (a.price ?? Infinity) - (b.price ?? Infinity)
                : f.sort === "desc" ? (b.price ?? -Infinity) - (a.price ?? -Infinity)
                    : score(b) - score(a) ||
                    (b.provider.providerInformation.rating ?? 0) -
                    (a.provider.providerInformation.rating ?? 0) ||
                    a.service.title.localeCompare(b.service.title),
    );
    const groups = new Map<number, { provider: Provider; items: Item[]; }>();
    for (const i of found) {
        if (!groups.has(i.provider.id))
            groups.set(i.provider.id, { provider: i.provider, items: [] });
        groups.get(i.provider.id)!.items.push(i);
    }
    return { count: found.length, groups: [...groups.values()] };
}
