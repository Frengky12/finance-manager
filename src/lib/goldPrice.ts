import type { GoldPriceCache } from "@/types";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const API_BASE = "https://logam-mulia-api.iamutaki.workers.dev";

export function isCacheValid(cache: GoldPriceCache | null): boolean {
  if (!cache) return false;
  return Date.now() - new Date(cache.updatedAt).getTime() < CACHE_TTL_MS;
}

export async function fetchLiveGoldPrice(): Promise<GoldPriceCache> {
  const res = await fetch(`${API_BASE}/api/prices/anekalogam`, {
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Logam Mulia API error: ${res.status}`);

  const json = await res.json();

  if (!json.success || !Array.isArray(json.data)) {
    throw new Error("Unexpected API response shape");
  }

  // Find the 1-gram gold entry
  const entry = json.data.find(
    (d: { material: string; weight: number; weightUnit: string }) =>
      d.material === "gold" && d.weight === 1 && d.weightUnit === "gr"
  );

  if (!entry) throw new Error("1-gram gold entry not found in API response");

  return {
    priceIdrPerGram: Number(entry.sellPrice),
    buybackIdrPerGram: Number(entry.buybackPrice),
    source: entry.source ?? "anekalogam",
    recordedDate: entry.recordedDate ?? new Date().toISOString().split("T")[0],
    updatedAt: new Date().toISOString(),
  };
}
