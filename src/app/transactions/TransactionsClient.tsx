"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Filter, Search, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate, INCOME_CATEGORIES, EXPENSE_CATEGORIES, CATEGORY_LABELS } from "@/lib/utils";
import type { Transaction, TransactionType, TransactionCategory } from "@/types";
import { format } from "date-fns";

interface Props { initialTransactions: Transaction[] }

const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
const PAGE_SIZE = 20;

const EMPTY_FORM = {
  type: "expense" as TransactionType,
  category: "food" as TransactionCategory,
  amount: "",
  description: "",
  date: format(new Date(), "yyyy-MM-dd"),
};

function exportCSV(transactions: Transaction[]) {
  const header = "Tanggal,Tipe,Kategori,Deskripsi,Jumlah";
  const rows = transactions.map((t) =>
    [t.date, t.type, CATEGORY_LABELS[t.category], `"${t.description || ""}"`, t.amount].join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transaksi-${format(new Date(), "yyyy-MM")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function TransactionsClient({ initialTransactions }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterType, setFilterType] = useState<"all" | TransactionType>("all");
  const [filterMonth, setFilterMonth] = useState(format(new Date(), "yyyy-MM"));
  const [filterCategory, setFilterCategory] = useState<"all" | TransactionCategory>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const categories = form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    setPage(1);
    return [...transactions]
      .filter((t) => filterType === "all" || t.type === filterType)
      .filter((t) => !filterMonth || t.date.startsWith(filterMonth))
      .filter((t) => filterCategory === "all" || t.category === filterCategory)
      .filter((t) =>
        !q ||
        t.description?.toLowerCase().includes(q) ||
        CATEGORY_LABELS[t.category]?.toLowerCase().includes(q)
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, filterType, filterMonth, filterCategory, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menyimpan");
      setTransactions((prev) => [...prev, data]);
      setModalOpen(false);
      setForm(EMPTY_FORM);
      toast("Transaksi berhasil ditambahkan");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Terjadi kesalahan", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus transaksi ini?")) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      toast("Transaksi dihapus");
      router.refresh();
    } catch {
      toast("Gagal menghapus transaksi", "error");
    }
  }

  const totalIncome = filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Transactions</h1>
        <div className="flex gap-2">
          {filtered.length > 0 && (
            <Button variant="secondary" size="sm" onClick={() => exportCSV(filtered)}>
              <Download size={14} className="mr-1" /> CSV
            </Button>
          )}
          <Button onClick={() => setModalOpen(true)} size="sm">
            <Plus size={15} className="mr-1" /> Add
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari deskripsi atau kategori…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
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
                {v === "all" ? "Semua" : v === "income" ? "Pemasukan" : "Pengeluaran"}
              </button>
            ))}
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as "all" | TransactionCategory)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="all">Semua Kategori</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Totals */}
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="text-green-600 font-semibold">Masuk: {formatCurrency(totalIncome)}</span>
        <span className="text-red-600 font-semibold">Keluar: {formatCurrency(totalExpense)}</span>
        <span className={`font-semibold ${totalIncome - totalExpense >= 0 ? "text-blue-600" : "text-orange-600"}`}>
          Net: {formatCurrency(totalIncome - totalExpense)}
        </span>
        <span className="text-gray-400">{filtered.length} transaksi</span>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-gray-400 text-sm">
            {search || filterCategory !== "all" ? "Tidak ada transaksi yang cocok." : "Belum ada transaksi."}
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
                      <th className="px-6 py-3 font-medium">Tanggal</th>
                      <th className="px-6 py-3 font-medium">Deskripsi</th>
                      <th className="px-6 py-3 font-medium">Kategori</th>
                      <th className="px-6 py-3 font-medium text-right">Jumlah</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((t, i) => (
                      <tr key={t.id} className={i !== paginated.length - 1 ? "border-b border-gray-50" : ""}>
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

          {/* Mobile list */}
          <div className="sm:hidden space-y-2">
            {paginated.map((t) => (
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                Halaman {page} dari {totalPages} · {filtered.length} transaksi
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium ${p === page ? "bg-blue-600 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Transaksi">
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
                {v === "income" ? "Pemasukan" : "Pengeluaran"}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as TransactionCategory }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {categories.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah (IDR)</label>
            <input
              type="number" required min="1"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="e.g. 500000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Catatan opsional"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
            <input
              type="date" required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button type="submit" className="flex-1" disabled={loading}>{loading ? "Menyimpan…" : "Tambah"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
