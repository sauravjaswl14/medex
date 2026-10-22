import { dataset } from "@/lib/data";
import { parseFilters } from "@/lib/model";
import Explorer from "@/components/explorer";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const url = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (typeof value === "string") url.set(key, value);
  return <Explorer initial={parseFilters(url)} initialData={dataset} />;
}
