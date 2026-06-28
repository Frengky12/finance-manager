"use client";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Wallet, PiggyBank, TrendingUp, Home, Car, Bitcoin, Landmark } from "lucide-react";

interface MonthlyPoint { month: string; income: number; expense: number; net: number }
interface CategoryPoint { name: string; value: number; color: string }
interface AssetPoint { name: string; type: string; value: number; isGold: boolean; notes: string }
interface GoldPriceInfo {
  priceIdrPerGram: number;
  buybackIdrPerGram: number;
  source: string;
  recordedDate: string;
}

const ASSET_COLORS: Record<string, string> = {
  cash: "#22c55e",
  savings: "#3b82f6",
  investment: "#a855f7",
  property: "#f97316",
  vehicle: "#eab308",
  crypto: "#06b6d4",
  gold: "#f59e0b",
  other: "#6b7280",
};

const ASSET_ICONS: Record<string, React.ElementType> = {
  cash: Wallet,
  savings: PiggyBank,
  investment: TrendingUp,
  property: Home,
  vehicle: Car,
  crypto: Bitcoin,
  other: Landmark,
};

const SPEND_COLORS = ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ec4899", "#eab308", "#14b8a6", "#ef4444"];

const fmt = (v: number) => formatCurrency(Number(v));

export function ReportsClient({
  monthlyData,
  categoryData,
  assetData,
  totalNetWorth,
  goldPriceInfo,
}: {
  monthlyData: MonthlyPoint[];
  categoryData: CategoryPoint[];
  assetData: AssetPoint[];
  totalNetWorth: number;
  goldPriceInfo: GoldPriceInfo | null;
}) {
  // Group assets by type for the pie chart
  const assetByType = assetData.reduce<Record<string, number>>((acc, a) => {
    acc[a.type] = (acc[a.type] ?? 0) + a.value;
    return acc;
  }, {});

  const assetPieData = Object.entries(assetByType)
    .map(([type, value]) => ({ name: type.charAt(0).toUpperCase() + type.slice(1), type, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-5 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Reports</h1>

      {/* Net Cash Flow */}
      <Card>
        <CardHeader><CardTitle>Net Cash Flow (12 months)</CardTitle></CardHeader>
        <CardContent className="px-2 sm:px-6">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData} margin={{ left: -8, right: 4 }}>
              <defs>
                <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} width={34} />
              <Tooltip formatter={(v) => fmt(Number(v))} />
              <Area type="monotone" dataKey="net" stroke="#3b82f6" fill="url(#netGrad)" name="Net" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Income vs Expense */}
      <Card>
        <CardHeader><CardTitle>Income vs Expenses (12 months)</CardTitle></CardHeader>
        <CardContent className="px-2 sm:px-6">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} barGap={3} margin={{ left: -8, right: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} width={34} />
              <Tooltip formatter={(v) => fmt(Number(v))} />
              <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expense" />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" />Income</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" />Expense</span>
          </div>
        </CardContent>
      </Card>

      {/* Spending by Category pie */}
      {categoryData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Spending by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={36}>
                  {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-2">
              {categoryData.slice(0, 8).map((c, i) => (
                <span key={i} className="flex items-center gap-1 text-xs text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 inline-block" style={{ background: c.color }} />
                  {c.name}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── ASSETS SECTION ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800">Assets</h2>
          <span className="text-sm font-bold text-blue-600">{fmt(totalNetWorth)}</span>
        </div>

        {/* Gold price info banner */}
        {goldPriceInfo && assetData.some((a) => a.isGold) && (
          <div className="mb-3 bg-yellow-50 border border-yellow-100 rounded-lg px-4 py-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-yellow-700">
            <span>Harga emas hari ini: <strong>{fmt(goldPriceInfo.priceIdrPerGram)}/gram</strong></span>
            <span>Buyback: <strong>{fmt(goldPriceInfo.buybackIdrPerGram)}/gram</strong></span>
            <span className="text-yellow-600/70">Sumber: {goldPriceInfo.source} · {goldPriceInfo.recordedDate}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Asset pie by type */}
          <Card>
            <CardHeader><CardTitle>Asset Breakdown by Type</CardTitle></CardHeader>
            <CardContent>
              {assetPieData.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">No assets</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={assetPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={36}>
                        {assetPieData.map((entry, i) => (
                          <Cell key={i} fill={ASSET_COLORS[entry.type] ?? SPEND_COLORS[i % SPEND_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => fmt(Number(v))} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-2">
                    {assetPieData.map((a, i) => (
                      <span key={i} className="flex items-center gap-1 text-xs text-gray-500">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 inline-block"
                          style={{ background: ASSET_COLORS[a.type] ?? SPEND_COLORS[i % SPEND_COLORS.length] }} />
                        {a.name}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Asset bar chart */}
          <Card>
            <CardHeader><CardTitle>Asset Value Comparison</CardTitle></CardHeader>
            <CardContent className="px-2 sm:px-6">
              {assetData.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">No assets</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={assetData.slice(0, 8).map((a) => ({ name: a.name.length > 12 ? a.name.slice(0, 12) + "…" : a.name, value: a.value, type: a.type }))}
                    layout="vertical"
                    margin={{ left: 4, right: 8 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip formatter={(v) => fmt(Number(v))} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Value">
                      {assetData.slice(0, 8).map((a, i) => (
                        <Cell key={i} fill={ASSET_COLORS[a.type] ?? SPEND_COLORS[i % SPEND_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Asset detail table */}
        {assetData.length > 0 && (
          <Card className="mt-4">
            <CardHeader><CardTitle>Asset Details</CardTitle></CardHeader>
            <CardContent className="p-0">
              {/* Desktop table */}
              <div className="hidden sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500 text-left">
                      <th className="px-6 py-3 font-medium">Asset</th>
                      <th className="px-6 py-3 font-medium">Type</th>
                      <th className="px-6 py-3 font-medium">Notes</th>
                      <th className="px-6 py-3 font-medium text-right">Value</th>
                      <th className="px-6 py-3 font-medium text-right">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assetData.map((a, i) => {
                      const Icon = a.isGold
                        ? () => <span>🥇</span>
                        : (ASSET_ICONS[a.type] ?? Landmark);
                      const color = ASSET_COLORS[a.type] ?? "#6b7280";
                      return (
                        <tr key={i} className={i !== assetData.length - 1 ? "border-b border-gray-50" : ""}>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0 inline-block" style={{ background: color }} />
                              <span className="font-medium text-gray-800">{a.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 capitalize">
                              {a.type}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-gray-400 text-xs">{a.notes || "—"}</td>
                          <td className="px-6 py-3 text-right font-semibold text-gray-800">{fmt(a.value)}</td>
                          <td className="px-6 py-3 text-right text-gray-500">
                            {totalNetWorth > 0 ? ((a.value / totalNetWorth) * 100).toFixed(1) : "0"}%
                          </td>
                        </tr>
                      );
                    })}
                    {/* Total row */}
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td className="px-6 py-3 font-bold text-gray-900" colSpan={3}>Total Net Worth</td>
                      <td className="px-6 py-3 text-right font-bold text-blue-600">{fmt(totalNetWorth)}</td>
                      <td className="px-6 py-3 text-right font-bold text-gray-500">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="sm:hidden divide-y divide-gray-50">
                {assetData.map((a, i) => {
                  const color = ASSET_COLORS[a.type] ?? "#6b7280";
                  return (
                    <div key={i} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-3 h-3 rounded-full shrink-0 inline-block" style={{ background: color }} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{a.name}</p>
                          <p className="text-xs text-gray-400 capitalize">{a.type}{a.notes ? ` · ${a.notes}` : ""}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-gray-800">{fmt(a.value)}</p>
                        <p className="text-xs text-gray-400">
                          {totalNetWorth > 0 ? ((a.value / totalNetWorth) * 100).toFixed(1) : "0"}%
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div className="px-4 py-3 flex items-center justify-between bg-gray-50">
                  <span className="text-sm font-bold text-gray-900">Total Net Worth</span>
                  <span className="text-sm font-bold text-blue-600">{fmt(totalNetWorth)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Spending breakdown table */}
      {categoryData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Spending Breakdown</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 text-left">
                    <th className="px-6 py-3 font-medium">Category</th>
                    <th className="px-6 py-3 font-medium text-right">Total Spent</th>
                    <th className="px-6 py-3 font-medium text-right">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryData.map((c, i) => {
                    const total = categoryData.reduce((s, x) => s + x.value, 0);
                    return (
                      <tr key={i} className={i !== categoryData.length - 1 ? "border-b border-gray-50" : ""}>
                        <td className="px-6 py-3 flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full inline-block shrink-0" style={{ background: c.color }} />
                          {c.name}
                        </td>
                        <td className="px-6 py-3 text-right font-semibold text-gray-800">{fmt(c.value)}</td>
                        <td className="px-6 py-3 text-right text-gray-500">{((c.value / total) * 100).toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="sm:hidden divide-y divide-gray-50">
              {categoryData.map((c, i) => {
                const total = categoryData.reduce((s, x) => s + x.value, 0);
                return (
                  <div key={i} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-full shrink-0 inline-block" style={{ background: c.color }} />
                      <span className="text-sm text-gray-700 truncate">{c.name}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-800">{fmt(c.value)}</p>
                      <p className="text-xs text-gray-400">{((c.value / total) * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
