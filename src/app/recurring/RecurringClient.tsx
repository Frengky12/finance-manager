"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, CheckCircle2, Circle, PlayCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, INCOME_CATEGORIES, EXPENSE_CATEGORIES, CATEGORY_LABELS } from "@/lib/utils";
import type { RecurringTemplate, TransactionType, TransactionCategory } from "@/types";
import { format } from "date-fns";

interface Props {
  initialTemplates: RecurringTemplate[];
  appliedThisMonth: Set<string>;
  currentMonth: string;
}

const EMPTY_FORM = {
  name: "",
  type: "expense" as TransactionType,
  category: "housing" as TransactionCategory,
  amount: "",
  dayOfMonth: "1",
};

export function RecurringClient({ initialTemplates, appliedThisMonth, currentMonth }: Props) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [applied, setApplied] = useState<Set<string>>(appliedThisMonth);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RecurringTemplate | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);

  const categories = form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const incomeTemplates = templates.filter((t) => t.type === "income");
  const expenseTemplates = templates.filter((t) => t.type === "expense");

  const totalIncome = incomeTemplates.reduce((s, t) => s + t.amount, 0);
  const totalExpense = expenseTemplates.reduce((s, t) => s + t.amount, 0);

  // Unapplied templates (candidates for applying)
  const unapplied = templates.filter((t) => !applied.has(t.id));

  // Toggle selection (only unapplied can be selected)
  function toggleSelect(id: string) {
    if (applied.has(id)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(unapplied.map((t) => t.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(t: RecurringTemplate) {
    setEditTarget(t);
    setForm({
      name: t.name,
      type: t.type,
      category: t.category,
      amount: String(t.amount),
      dayOfMonth: String(t.dayOfMonth),
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, amount: Number(form.amount), dayOfMonth: Number(form.dayOfMonth) };

    if (editTarget) {
      const res = await fetch(`/api/recurring/${editTarget.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const updated = await res.json();
      setTemplates((prev) => prev.map((t) => t.id === editTarget.id ? {
        id: updated.id, name: updated.name, type: updated.type,
        category: updated.category, amount: Number(updated.amount),
        dayOfMonth: updated.day_of_month, createdAt: updated.created_at,
      } : t));
    } else {
      const res = await fetch("/api/recurring", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const created = await res.json();
      setTemplates((prev) => [...prev, {
        id: created.id, name: created.name, type: created.type,
        category: created.category, amount: Number(created.amount),
        dayOfMonth: created.day_of_month, createdAt: created.created_at,
      }]);
    }
    setModalOpen(false);
    setSaving(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus template ini?")) return;
    await fetch(`/api/recurring/${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
    router.refresh();
  }

  async function handleApply() {
    if (selected.size === 0) return;
    if (!confirm(`Terapkan ${selected.size} item ke bulan ${format(new Date(currentMonth + "-01"), "MMMM yyyy")}?`)) return;
    setApplying(true);
    const res = await fetch("/api/recurring/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateIds: Array.from(selected), month: currentMonth }),
    });
    const result = await res.json();
    // Mark successfully applied
    const newApplied = new Set(applied);
    for (const r of result.applied ?? []) newApplied.add(r.templateId);
    setApplied(newApplied);
    setSelected(new Set());
    setApplying(false);
    router.refresh();
  }

  const monthLabel = format(new Date(currentMonth + "-01"), "MMMM yyyy");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Bulanan</h1>
          <p className="text-sm text-gray-500 mt-0.5">Template transaksi rutin setiap bulan</p>
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus size={15} className="mr-1" /> Tambah
        </Button>
      </div>

      {/* Summary */}
      {templates.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="py-4 px-4">
              <p className="text-xs text-gray-500 font-medium">Pemasukan Rutin</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(totalIncome)}</p>
              <p className="text-xs text-gray-400">{incomeTemplates.length} item</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 px-4">
              <p className="text-xs text-gray-500 font-medium">Pengeluaran Rutin</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(totalExpense)}</p>
              <p className="text-xs text-gray-400">{expenseTemplates.length} item</p>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="py-4 px-4">
              <p className="text-xs text-gray-500 font-medium">Sisa Bersih</p>
              <p className={`text-lg font-bold ${totalIncome - totalExpense >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                {formatCurrency(totalIncome - totalExpense)}
              </p>
              <p className="text-xs text-gray-400">per bulan</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Apply section */}
      {templates.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle>Terapkan ke {monthLabel}</CardTitle>
              <div className="flex items-center gap-2">
                {unapplied.length > 0 && (
                  <>
                    <button onClick={selected.size === unapplied.length ? clearSelection : selectAll}
                      className="text-xs text-blue-600 hover:underline">
                      {selected.size === unapplied.length ? "Batal semua" : "Pilih semua"}
                    </button>
                    <Button
                      size="sm"
                      onClick={handleApply}
                      disabled={selected.size === 0 || applying}
                      className="bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-400"
                    >
                      {applying
                        ? <><RefreshCw size={13} className="mr-1 animate-spin" />Menerapkan…</>
                        : <><PlayCircle size={13} className="mr-1" />Terapkan {selected.size > 0 ? `(${selected.size})` : ""}</>
                      }
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-50">
              {templates.map((t) => {
                const isApplied = applied.has(t.id);
                const isSelected = selected.has(t.id);
                return (
                  <div
                    key={t.id}
                    onClick={() => toggleSelect(t.id)}
                    className={`px-4 sm:px-6 py-3 flex items-center gap-3 transition-colors ${
                      isApplied ? "opacity-60 cursor-default" : "cursor-pointer hover:bg-gray-50"
                    } ${isSelected ? "bg-blue-50 hover:bg-blue-50" : ""}`}
                  >
                    {/* Checkbox */}
                    <div className="shrink-0">
                      {isApplied
                        ? <CheckCircle2 size={18} className="text-emerald-500" />
                        : isSelected
                          ? <CheckCircle2 size={18} className="text-blue-500" />
                          : <Circle size={18} className="text-gray-300" />
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{t.name}</p>
                      <p className="text-xs text-gray-400">
                        {CATEGORY_LABELS[t.category]} · tgl {t.dayOfMonth}
                        {isApplied && <span className="ml-2 text-emerald-600 font-medium">✓ Sudah diterapkan</span>}
                      </p>
                    </div>

                    {/* Amount */}
                    <span className={`text-sm font-semibold shrink-0 ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                      {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                    </span>

                    {/* Actions */}
                    <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEdit(t)} className="text-gray-300 hover:text-blue-500 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {unapplied.length === 0 && templates.length > 0 && (
              <div className="px-6 py-4 text-center text-sm text-emerald-600 font-medium bg-emerald-50">
                ✓ Semua item sudah diterapkan untuk {monthLabel}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {templates.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-gray-400 text-sm">
            Belum ada template. Tambahkan gaji, kos, wifi, dll.
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? "Edit Template" : "Tambah Template Bulanan"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            {(["income", "expense"] as TransactionType[]).map((v) => (
              <button key={v} type="button"
                onClick={() => setForm((f) => ({ ...f, type: v, category: v === "income" ? "salary" : "housing" }))}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  form.type === v
                    ? v === "income" ? "bg-green-600 text-white border-green-600" : "bg-red-600 text-white border-red-600"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {v === "income" ? "Pemasukan" : "Pengeluaran"}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
            <input required value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Gaji, Kos, WiFi, Uang Sampah"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
            <select value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as TransactionCategory }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {categories.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah (IDR)</label>
            <input type="number" required min="1" value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="e.g. 8000000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal setiap bulan</label>
            <input type="number" required min="1" max="28" value={form.dayOfMonth}
              onChange={(e) => setForm((f) => ({ ...f, dayOfMonth: e.target.value }))}
              placeholder="1–28"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <p className="text-xs text-gray-400 mt-1">Maks. 28 agar valid di semua bulan</p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Menyimpan…" : editTarget ? "Update" : "Tambah"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
