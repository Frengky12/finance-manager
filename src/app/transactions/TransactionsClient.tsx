"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate, INCOME_CATEGORIES, EXPENSE_CATEGORIES, CATEGORY_LABELS } from "@/lib/utils";
import type { Transaction, TransactionType, TransactionCategory } from "@/types";
import { format } from "date-fns";

interface Props { initialTransactions: Transaction[] }

const EMPTY_FORM = {
  type: "expense" as TransactionType,
  category: "food" as TransactionCategory,
  amount: "",
  description: "",
  date: format(new Date(), "yyyy-MM-dd"),
};

export function TransactionsClient({ initialTransactions }: Props) {
  const router = useRouter();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterType, setFilterType] = useState<"all" | TransactionType>("all");
  const [filterMonth, setFilterMonth] = useState(format(new Date(), "yyyy-MM"));
  const [loading, setLoading] = useState(false);

  const categories = form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const filtered = useMemo(
    () =>
      [...transactions]
        .filter((t) => filterType === "all" || t.type === filterType)
        .filter((t) => !filterMonth || t.date.startsWith(filterMonth))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, filterType, filterMonth]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    const created = await res.json();
    setTransactions((prev) => [...prev, created]);
    setModalOpen(false);
    setForm(EMPTY_FORM);
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this transaction?")) return;
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    router.refresh();
  }

  const totalIncome = filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Transactions</h1>
        <Button onClick={() => setModalOpen(true)} size="sm">
          <Plus size={15} className="mr-1" /> Add
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter size={15} className="text-gray-400 shrink-0" />
        <input
          type="month"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <div className="flex gap-1">
          {(["all", "income", "expense"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setFilterType(v)}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                filterType === v ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="text-green-600 font-semibold">In: {formatCurrency(totalIncome)}</span>
        <span className="text-red-600 font-semibold">Out: {formatCurrency(totalExpense)}</span>
        <span className={`font-semibold ${totalIncome - totalExpense >= 0 ? "text-blue-600" : "text-orange-600"}`}>
          Net: {formatCurrency(totalIncome - totalExpense)}
        </span>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-gray-400 text-sm">
            No transactions found.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block">
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500 text-left">
                      <th className="px-6 py-3 font-medium">Date</th>
                      <th className="px-6 py-3 font-medium">Description</th>
                      <th className="px-6 py-3 font-medium">Category</th>
                      <th className="px-6 py-3 font-medium text-right">Amount</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t, i) => (
                      <tr key={t.id} className={i !== filtered.length - 1 ? "border-b border-gray-50" : ""}>
                        <td className="px-6 py-3 text-gray-500 whitespace-nowrap">{formatDate(t.date)}</td>
                        <td className="px-6 py-3 text-gray-800">{t.description || "—"}</td>
                        <td className="px-6 py-3">
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                            {CATEGORY_LABELS[t.category]}
                          </span>
                        </td>
                        <td className={`px-6 py-3 text-right font-semibold whitespace-nowrap ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                          {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button onClick={() => handleDelete(t.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Mobile card list */}
          <div className="sm:hidden space-y-2">
            {filtered.map((t) => (
              <Card key={t.id}>
                <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {t.description || CATEGORY_LABELS[t.category]}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {CATEGORY_LABELS[t.category]} · {formatDate(t.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-bold ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                      {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                    </span>
                    <button onClick={() => handleDelete(t.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Transaction">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            {(["income", "expense"] as TransactionType[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setForm((f) => ({ ...f, type: v, category: v === "income" ? "salary" : "food" }))}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  form.type === v
                    ? v === "income" ? "bg-green-600 text-white border-green-600" : "bg-red-600 text-white border-red-600"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as TransactionCategory }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {categories.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (IDR)</label>
            <input
              type="number" required min="1"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="e.g. 500000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional note"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date" required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={loading}>{loading ? "Saving..." : "Add"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
