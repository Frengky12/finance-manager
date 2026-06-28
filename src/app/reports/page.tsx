import { supabase } from "@/lib/supabase";
import { ReportsClient } from "./ReportsClient";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/utils";
import { format, subMonths } from "date-fns";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [txRes, assetRes, goldRes, goldCacheRes] = await Promise.all([
    supabase.from("transactions").select("*"),
    supabase.from("assets").select("*"),
    supabase.from("gold_holdings").select("*"),
    supabase.from("gold_price_cache").select("price_idr_per_gram, buyback_idr_per_gram, source, recorded_date").eq("id", 1).single(),
  ]);

  const transactions = txRes.data ?? [];
  const assets = assetRes.data ?? [];
  const goldHoldings = goldRes.data ?? [];
  const priceIdrPerGram = Number(goldCacheRes.data?.price_idr_per_gram ?? 0);

  // 12-month trend
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    months.push(format(subMonths(new Date(), i), "yyyy-MM"));
  }

  const monthlyData = months.map((m) => {
    const txs = transactions.filter((t) => t.date?.startsWith(m));
    const income = txs.filter((t) => t.type === "income").reduce((s: number, t: { amount: number }) => s + t.amount, 0);
    const expense = txs.filter((t) => t.type === "expense").reduce((s: number, t: { amount: number }) => s + t.amount, 0);
    return { month: format(new Date(m + "-01"), "MMM yy"), income, expense, net: income - expense };
  });

  // Spending by category
  const spendingByCategory = transactions
    .filter((t) => t.type === "expense")
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + t.amount;
      return acc;
    }, {});

  const categoryData = Object.entries(spendingByCategory)
    .map(([cat, amount]) => ({
      name: CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] ?? cat,
      value: amount,
      color: CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] ?? "#6b7280",
    }))
    .sort((a, b) => b.value - a.value);

  // Asset data: regular assets + each gold holding as its own entry
  const regularAssets = assets.map((a) => ({
    name: a.name,
    type: a.type as string,
    value: Number(a.value),
    isGold: false,
    notes: a.notes ?? "",
  }));

  const goldAssets = goldHoldings.map((h) => ({
    name: h.name,
    type: "gold",
    value: Number(h.grams) * priceIdrPerGram,
    isGold: true,
    notes: `${h.grams} g`,
  }));

  const assetData = [...regularAssets, ...goldAssets].sort((a, b) => b.value - a.value);

  const totalNetWorth = assetData.reduce((s, a) => s + a.value, 0);

  // Gold price info for display
  const goldPriceInfo = goldCacheRes.data
    ? {
        priceIdrPerGram,
        buybackIdrPerGram: Number(goldCacheRes.data.buyback_idr_per_gram),
        source: goldCacheRes.data.source,
        recordedDate: goldCacheRes.data.recorded_date,
      }
    : null;

  return (
    <ReportsClient
      monthlyData={monthlyData}
      categoryData={categoryData}
      assetData={assetData}
      totalNetWorth={totalNetWorth}
      goldPriceInfo={goldPriceInfo}
    />
  );
}
