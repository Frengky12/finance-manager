import { supabase } from "@/lib/supabase";
import { formatCurrency, CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, AlertTriangle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { DashboardCharts } from "@/components/DashboardCharts";
import { format, subMonths } from "date-fns";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const currentMonth = format(now, "yyyy-MM");
  const prevMonth = format(subMonths(now, 1), "yyyy-MM");

  const [txRes, assetRes, goldRes, goldCacheRes, budgetsRes] = await Promise.all([
    supabase.from("transactions").select("*"),
    supabase.from("assets").select("value"),
    supabase.from("gold_holdings").select("grams"),
    supabase.from("gold_price_cache").select("price_idr_per_gram").eq("id", 1).single(),
    supabase.from("budgets").select("*").eq("month", currentMonth),
  ]);

  const allTransactions = txRes.data ?? [];

  const monthlyTx = allTransactions.filter((t) => t.date?.startsWith(currentMonth));
  const prevMonthTx = allTransactions.filter((t) => t.date?.startsWith(prevMonth));

  const totalIncome = monthlyTx.filter((t) => t.type === "income").reduce((s: number, t: { amount: number }) => s + t.amount, 0);
  const totalExpense = monthlyTx.filter((t) => t.type === "expense").reduce((s: number, t: { amount: number }) => s + t.amount, 0);
  const prevExpense = prevMonthTx.filter((t) => t.type === "expense").reduce((s: number, t: { amount: number }) => s + t.amount, 0);
  const prevIncome = prevMonthTx.filter((t) => t.type === "income").reduce((s: number, t: { amount: number }) => s + t.amount, 0);
  const savings = totalIncome - totalExpense;

  const assetNetWorth = (assetRes.data ?? []).reduce((s: number, a: { value: number }) => s + Number(a.value), 0);
  const priceIdrPerGram = Number(goldCacheRes.data?.price_idr_per_gram ?? 0);
  const goldNetWorth = (goldRes.data ?? []).reduce((s: number, h: { grams: number }) => s + Number(h.grams) * priceIdrPerGram, 0);
  const netWorth = assetNetWorth + goldNetWorth;

  // MoM change helpers
  function momChange(current: number, prev: number) {
    if (prev === 0) return null;
    return ((current - prev) / prev) * 100;
  }
  const incomeChange = momChange(totalIncome, prevIncome);
  const expenseChange = momChange(totalExpense, prevExpense);

  // Spending by category
  const spendingByCategory = monthlyTx
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

  // Top 5 expenses
  const top5 = categoryData.slice(0, 5);

  // Budget alerts (>= 80% used)
  const budgetAlerts = (budgetsRes.data ?? [])
    .map((b) => {
      const spent = spendingByCategory[b.category] ?? 0;
      const pct = (spent / Number(b.monthly_limit)) * 100;
      return { category: b.category, spent, limit: Number(b.monthly_limit), pct };
    })
    .filter((b) => b.pct >= 80)
    .sort((a, b) => b.pct - a.pct);

  // Trend chart
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) months.push(format(subMonths(now, i), "yyyy-MM"));
  const trendData = months.map((m) => {
    const txs = allTransactions.filter((t) => t.date?.startsWith(m));
    return {
      month: format(new Date(m + "-01"), "MMM"),
      income: txs.filter((t) => t.type === "income").reduce((s: number, t: { amount: number }) => s + t.amount, 0),
      expense: txs.filter((t) => t.type === "expense").reduce((s: number, t: { amount: number }) => s + t.amount, 0),
    };
  });

  const recentTransactions = [...allTransactions]
    .sort((a, b) => b.date?.localeCompare(a.date))
    .slice(0, 5);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">{format(now, "MMMM yyyy")}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Net Worth */}
        <Card>
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-3 py-4 sm:py-5">
            <div className="bg-blue-50 p-2.5 rounded-lg shrink-0"><Wallet className="text-blue-600" size={20} /></div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">Net Worth</p>
              <p className="text-base sm:text-lg font-bold text-blue-600 leading-tight">{formatCurrency(netWorth)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Income with MoM */}
        <Card>
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-3 py-4 sm:py-5">
            <div className="bg-green-50 p-2.5 rounded-lg shrink-0"><TrendingUp className="text-green-600" size={20} /></div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 font-medium">Income</p>
              <p className="text-base sm:text-lg font-bold text-green-600 leading-tight">{formatCurrency(totalIncome)}</p>
              {incomeChange !== null && (
                <p className={`text-xs flex items-center gap-0.5 ${incomeChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {incomeChange >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                  {Math.abs(incomeChange).toFixed(1)}% vs bulan lalu
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expense with MoM */}
        <Card>
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-3 py-4 sm:py-5">
            <div className="bg-red-50 p-2.5 rounded-lg shrink-0"><TrendingDown className="text-red-600" size={20} /></div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 font-medium">Expenses</p>
              <p className="text-base sm:text-lg font-bold text-red-600 leading-tight">{formatCurrency(totalExpense)}</p>
              {expenseChange !== null && (
                <p className={`text-xs flex items-center gap-0.5 ${expenseChange <= 0 ? "text-green-500" : "text-red-500"}`}>
                  {expenseChange >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                  {Math.abs(expenseChange).toFixed(1)}% vs bulan lalu
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Savings */}
        <Card>
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-3 py-4 sm:py-5">
            <div className={`${savings >= 0 ? "bg-emerald-50" : "bg-orange-50"} p-2.5 rounded-lg shrink-0`}>
              <PiggyBank className={savings >= 0 ? "text-emerald-600" : "text-orange-600"} size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">Savings</p>
              <p className={`text-base sm:text-lg font-bold leading-tight ${savings >= 0 ? "text-emerald-600" : "text-orange-600"}`}>
                {formatCurrency(savings)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget alerts */}
      {budgetAlerts.length > 0 && (
        <div className="space-y-2">
          {budgetAlerts.map((b) => (
            <div key={b.category} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
              b.pct >= 100 ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-700"
            }`}>
              <AlertTriangle size={16} className="shrink-0" />
              <span className="flex-1">
                <span className="font-semibold">{CATEGORY_LABELS[b.category as keyof typeof CATEGORY_LABELS]}</span>
                {b.pct >= 100 ? " sudah melebihi budget!" : ` sudah ${b.pct.toFixed(0)}% dari budget`}
                {" — "}{formatCurrency(b.spent)} / {formatCurrency(b.limit)}
              </span>
              <Link href="/budgets" className="text-xs underline shrink-0">Lihat</Link>
            </div>
          ))}
        </div>
      )}

      <DashboardCharts trendData={trendData} categoryData={categoryData} />

      {/* Top 5 pengeluaran & recent transactions side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Top 5 expenses */}
        {top5.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Top Pengeluaran Bulan Ini</CardTitle></CardHeader>
            <CardContent className="pb-4 space-y-3">
              {top5.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700 truncate">{item.name}</span>
                      <span className="text-sm font-semibold text-gray-800 ml-2 shrink-0">{formatCurrency(item.value)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(item.value / top5[0].value) * 100}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Recent transactions */}
        <Card>
          <CardHeader><CardTitle>Transaksi Terbaru</CardTitle></CardHeader>
          {recentTransactions.length === 0 ? (
            <CardContent>
              <p className="text-center text-gray-400 py-6 text-sm">Belum ada transaksi.</p>
            </CardContent>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentTransactions.map((t) => (
                <div key={t.id} className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
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
          )}
        </Card>
      </div>
    </div>
  );
}
