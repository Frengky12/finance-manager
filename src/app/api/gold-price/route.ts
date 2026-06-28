import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import { fetchLiveGoldPrice, isCacheValid } from "@/lib/goldPrice";
import type { GoldPriceCache } from "@/types";

async function getCachedPrice(): Promise<GoldPriceCache | null> {
  const { data } = await supabase
    .from("gold_price_cache")
    .select("*")
    .eq("id", 1)
    .single();

  if (!data) return null;
  return {
    priceIdrPerGram: Number(data.price_idr_per_gram),
    buybackIdrPerGram: Number(data.buyback_idr_per_gram),
    source: data.source,
    recordedDate: data.recorded_date,
    updatedAt: data.updated_at,
  };
}

async function saveCache(price: GoldPriceCache) {
  await supabase.from("gold_price_cache").upsert({
    id: 1,
    price_idr_per_gram: price.priceIdrPerGram,
    buyback_idr_per_gram: price.buybackIdrPerGram,
    source: price.source,
    recorded_date: price.recordedDate,
    updated_at: price.updatedAt,
  });
}

export async function GET() {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const cached = await getCachedPrice();

  if (isCacheValid(cached)) {
    return NextResponse.json({ ...cached, fromCache: true });
  }

  try {
    const fresh = await fetchLiveGoldPrice();
    await saveCache(fresh);
    return NextResponse.json({ ...fresh, fromCache: false });
  } catch {
    if (cached) {
      return NextResponse.json({ ...cached, fromCache: true, stale: true });
    }
    return NextResponse.json(
      { error: "Tidak dapat mengambil harga emas. Coba lagi nanti." },
      { status: 503 }
    );
  }
}

export async function DELETE() {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  await supabase.from("gold_price_cache").delete().eq("id", 1);
  return NextResponse.json({ ok: true });
}
