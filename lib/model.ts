export type Kind =
    | "package"
    | "lab_test"
    | "wellness"
    | "service"
    | "insurance";
export type Currency = "THB" | "NPR" | "INR";
export type Category = {
    id: string;
    title: string;
    slug: string;
    type: Kind;
    position: number;
    status: boolean;
    parentId: string | null;
    children: Category[];
};
export type Provider = {
    id: number;
    name: string;
    status: string;
    providerInformation: {
        currency: Currency;
        city: { name: string; slug: string; } | null;
        country: { name: string; alphaCode: string; } | null;
        rating: number | null;
        reviewCount: number | null;
        types: Kind[];
    };
};
export type Pricing = {
    price: string | null;
    discount: string | null;
    discountType: "percent" | "amount" | null;
    serviceCharge: string | null;
    serviceChargeType: "percent" | "amount" | null;
};
export type Service = Pricing & {
    id: string;
    title: string;
    type: Kind;
    userId: number;
    categoryId: string | null;
    subCategoryId: string | null;
    status: boolean;
    testAtHome: boolean;
    wellnessPricing: (Pricing & { id: string; durationInMinutes: number; })[];
    createdAt: string;
};
export type Dataset = {
    categories: Category[];
    providers: Provider[];
    services: Service[];
};
export type Filters = {
    q: string;
    types: string[];
    category: string;
    subcategory: string;
    providers: string[];
    location: string;
    currency: string;
    min: string;
    max: string;
    home: boolean;
    sort: string;
    page: number;
};
export const defaults: Filters = {
    q: "",
    types: [],
    category: "",
    subcategory: "",
    providers: [],
    location: "",
    currency: "",
    min: "",
    max: "",
    home: false,
    sort: "relevance",
    page: 1,
};
export const kinds: Kind[] = [
    "package",
    "lab_test",
    "wellness",
    "service",
    "insurance",
];
export const labels: Record<Kind, string> = {
    package: "Health packages",
    lab_test: "Lab tests",
    wellness: "Wellness",
    service: "Services",
    insurance: "Insurance",
};
export function parseFilters(p: URLSearchParams): Filters {
    const types =
        p
            .get("types")
            ?.split(",")
            .filter((x) => kinds.includes(x as Kind)) ?? [];
    const page = Number(p.get("page"));
    return {
        q: p.get("q") ?? "",
        types,
        category: p.get("category") ?? "",
        subcategory: p.get("subcategory") ?? "",
        providers: p.get("providers")?.split(",").filter(Boolean) ?? [],
        location: p.get("location") ?? "",
        currency: p.get("currency") ?? "",
        min: p.get("min") ?? "",
        max: p.get("max") ?? "",
        home: p.get("home") === "1",
        sort:
            ["relevance", "asc", "desc", "rating"].includes(p.get("sort") ?? "") ?
                p.get("sort")!
                : "relevance",
        page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    };
}
export function serialize(f: Filters) {
    const p = new URLSearchParams();
    for (const [key, val] of Object.entries(f)) {
        if (key === "page" && val === 1) continue;
        if (typeof val === "boolean") {
            if (val) p.set(key, "1");
        } else if (Array.isArray(val)) {
            if (val.length) p.set(key, val.join(","));
        } else if (val !== "" && val !== undefined && val !== "relevance")
            p.set(key, String(val));
    }
    return p.toString();
}
