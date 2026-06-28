import { supabase } from "@/lib/supabase";
import { formatCurrency, CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react";
import { DashboardCharts } from "@/components/DashboardCharts";
import { format, subMonths } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const currentMonth = format(new Date(), "yyyy-MM");

  const [txRes, assetRes, goldRes, goldCacheRes] = await Promise.all([
    supabase.from("transactions").select("*"),
    supabase.from("assets").select("value"),
    supabase.from("gold_holdings").select("grams"),
    supabase.from("gold_price_cache").select("price_idr_per_gram").eq("id", 1).single(),
  ]);

  const allTransactions = txRes.data ?? [];
  const monthlyTransactions = allTransactions.filter((t) =>
    t.date?.startsWith(currentMonth)
  );

  const totalIncome = monthlyTransactions.filter((t) => t.type === "income").reduce((s: number, t: {amount: number}) => s + t.amount, 0);
  const totalExpense = monthlyTransactions.filter((t) => t.type === "expense").reduce((s: number, t: {amount: number}) => s + t.amount, 0);
  const savings = totalIncome - totalExpense;

  const assetNetWorth = (assetRes.data ?? []).reduce((s: number, a: {value: number}) => s + Number(a.value), 0);
  const priceIdrPerGram = Number(goldCacheRes.data?.price_idr_per_gram ?? 0);
  const goldNetWorth = (goldRes.data ?? []).reduce((s: number, h: {grams: number}) => s + Number(h.grams) * priceIdrPerGram, 0);
  const netWorth = assetNetWorth + goldNetWorth;

  const spendingByCategory = monthlyTransactions
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

  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    months.push(format(subMonths(new Date(), i), "yyyy-MM"));
  }
  const trendData = months.map((m) => {
    const txs = allTransactions.filter((t) => t.date?.startsWith(m));
    return {
      month: format(new Date(m + "-01"), "MMM"),
      income: txs.filter((t) => t.type === "income").reduce((s: number, t: {amount: number}) => s + t.amount, 0),
      expense: txs.filter((t) => t.type === "expense").reduce((s: number, t: {amount: number}) => s + t.amount, 0),
    };
  });

  const recentTransactions = [...allTransactions]
    .sort((a, b) => b.date?.localeCompare(a.date))
    .slice(0, 5);

  const summaryCards = [
    { label: "Net Worth", value: netWorth, icon: Wallet, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Income", value: totalIncome, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { label: "Expenses", value: totalExpense, icon: TrendingDown, color: "text-red-600", bg: "bg-red-50" },
    {
      label: "Savings",
      value: savings,
      icon: PiggyBank,
      color: savings >= 0 ? "text-emerald-600" : "text-orange-600",
      bg: savings >= 0 ? "bg-emerald-50" : "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">{format(new Date(), "MMMM yyyy")}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {summaryCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-3 py-4 sm:py-5">
              <div className={`${bg} p-2.5 rounded-lg shrink-0`}>
                <Icon className={color} size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium truncate">{label}</p>
                <p className={`text-base sm:text-lg font-bold ${color} leading-tight`}>
                  {formatCurrency(value)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <DashboardCharts trendData={trendData} categoryData={categoryData} />

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        {recentTransactions.length === 0 ? (
          <CardContent>
            <p className="text-center text-gray-400 py-6 text-sm">No transactions yet.</p>
          </CardContent>
        ) : (
          <>
            <div className="hidden sm:block">
              <table className="w-full text-sm">
                <tbody>
                  {recentTransactions.map((t, i) => (
                    <tr key={t.id} className={i !== recentTransactions.length - 1 ? "border-b border-gray-50" : ""}>
                      <td className="px-6 py-3 text-gray-500 whitespace-nowrap">{t.date}</td>
                      <td className="px-6 py-3">
                        <span className="font-medium text-gray-800">{t.description || CATEGORY_LABELS[t.category as keyof typeof CATEGORY_LABELS]}</span>
                        <span className="ml-2 text-xs text-gray-400">{CATEGORY_LABELS[t.category as keyof typeof CATEGORY_LABELS]}</span>
                      </td>
                      <td className={`px-6 py-3 text-right font-semibold ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                        {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sm:hidden divide-y divide-gray-50">
              {recentTransactions.map((t) => (
                <div key={t.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {t.description || CATEGORY_LABELS[t.category as keyof typeof CATEGORY_LABELS]}
                    </p>
                    <p className="text-xs text-gray-400">{CATEGORY_LABELS[t.category as keyof typeof CATEGORY_LABELS]} · {t.date}</p>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                    {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
