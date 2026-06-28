import { supabase } from "@/lib/supabase";
import { AssetsClient } from "./AssetsClient";
import { GoldSection } from "@/components/GoldSection";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const [assetsRes, goldRes, goldCacheRes] = await Promise.all([
    supabase.from("assets").select("*").order("value", { ascending: false }),
    supabase.from("gold_holdings").select("*").order("created_at", { ascending: true }),
    supabase.from("gold_price_cache").select("price_idr_per_gram").eq("id", 1).single(),
  ]);

  const assets = (assetsRes.data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    value: Number(a.value),
    notes: a.notes,
    updatedAt: a.updated_at,
    createdAt: a.created_at,
  }));

  const goldHoldings = (goldRes.data ?? []).map((h) => ({
    id: h.id,
    name: h.name,
    grams: Number(h.grams),
    notes: h.notes,
    createdAt: h.created_at,
    updatedAt: h.updated_at,
  }));

  const priceIdrPerGram = Number(goldCacheRes.data?.price_idr_per_gram ?? 0);
  const goldNetWorth = goldHoldings.reduce((s, h) => s + h.grams * priceIdrPerGram, 0);

  return (
    <div className="space-y-5">
      <AssetsClient initialAssets={assets} goldNetWorth={goldNetWorth} />
      <GoldSection initialHoldings={goldHoldings} />
    </div>
  );
}
