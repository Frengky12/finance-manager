"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, EXPENSE_CATEGORIES, CATEGORY_LABELS } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import type { Budget, Transaction, TransactionCategory } from "@/types";
import { format } from "date-fns";

interface Props {
  initialBudgets: Budget[];
  transactions: Transaction[];
  currentMonth: string;
}

export function BudgetsClient({ initialBudgets, transactions, currentMonth }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [budgets, setBudgets] = useState(initialBudgets);
  const [month, setMonth] = useState(currentMonth);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ category: "food" as TransactionCategory, monthlyLimit: "" });
  const [loading, setLoading] = useState(false);

  const spentByCategory = transactions.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + t.amount;
    return acc;
  }, {});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, monthlyLimit: Number(form.monthlyLimit), month }),
      });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.error ?? "Gagal menyimpan");
      setBudgets((prev) => {
        const idx = prev.findIndex((b) => b.id === saved.id);
        if (idx !== -1) { const next = [...prev]; next[idx] = saved; return next; }
        return [...prev, saved];
      });
      setModalOpen(false);
      setForm({ category: "food", monthlyLimit: "" });
      toast("Budget berhasil disimpan");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Terjadi kesalahan", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus budget ini?")) return;
    try {
      const res = await fetch(`/api/budgets/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      setBudgets((prev) => prev.filter((b) => b.id !== id));
      toast("Budget dihapus");
      router.refresh();
    } catch {
      toast("Gagal menghapus budget", "error");
    }
  }

  function handleMonthChange(m: string) {
    setMonth(m);
    router.push(`/budgets?month=${m}`);
  }

  const totalBudget = budgets.reduce((s, b) => s + b.monthlyLimit, 0);
  const totalSpent = budgets.reduce((s, b) => s + (spentByCategory[b.category] ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Budgets</h1>
        <Button onClick={() => setModalOpen(true)} size="sm">
          <Plus size={15} className="mr-1" /> Add
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="month"
          value={month}
          onChange={(e) => handleMonthChange(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <span className="text-sm text-gray-500">{format(new Date(month + "-01"), "MMMM yyyy")}</span>
      </div>

      {budgets.length > 0 && (
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-gray-600">Budget: <span className="font-semibold text-gray-800">{formatCurrency(totalBudget)}</span></span>
          <span className="text-gray-600">Spent: <span className={`font-semibold ${totalSpent > totalBudget ? "text-red-600" : "text-green-600"}`}>{formatCurrency(totalSpent)}</span></span>
        </div>
      )}

      {budgets.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-gray-400 text-sm">
            No budgets set for this month.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {budgets.map((b) => {
            const spent = spentByCategory[b.category] ?? 0;
            const pct = Math.min(100, (spent / b.monthlyLimit) * 100);
            const over = spent > b.monthlyLimit;
            return (
              <Card key={b.id}>
                <CardContent className="py-4 px-4 sm:px-6">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="font-medium text-gray-800 text-sm sm:text-base">{CATEGORY_LABELS[b.category]}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs sm:text-sm font-semibold ${over ? "text-red-600" : "text-gray-600"}`}>
                        {formatCurrency(spent)} / {formatCurrency(b.monthlyLimit)}
                      </span>
                      <button onClick={() => handleDelete(b.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${over ? "bg-red-500" : pct > 80 ? "bg-yellow-500" : "bg-green-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {over
                      ? `${formatCurrency(spent - b.monthlyLimit)} over budget`
                      : `${formatCurrency(b.monthlyLimit - spent)} remaining`}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Set Budget">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as TransactionCategory }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Limit (IDR)</label>
            <input
              type="number" required min="1"
              value={form.monthlyLimit}
              onChange={(e) => setForm((f) => ({ ...f, monthlyLimit: e.target.value }))}
              placeholder="e.g. 1500000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <p className="text-xs text-gray-400">Setting a budget that already exists will update it.</p>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
