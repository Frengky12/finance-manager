"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Target, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";
import type { SavingsGoal } from "@/types";
import { format, differenceInDays, isPast } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface Props { initialGoals: SavingsGoal[] }

const EMPTY_FORM = {
  name: "",
  targetAmount: "",
  currentAmount: "",
  targetDate: "",
  notes: "",
};

function GoalCard({
  goal,
  onEdit,
  onDelete,
  onTopUp,
}: {
  goal: SavingsGoal;
  onEdit: () => void;
  onDelete: () => void;
  onTopUp: (amount: number) => void;
}) {
  const pct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
  const done = goal.currentAmount >= goal.targetAmount;
  const remaining = goal.targetAmount - goal.currentAmount;
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpVal, setTopUpVal] = useState("");

  const daysLeft = goal.targetDate
    ? differenceInDays(new Date(goal.targetDate), new Date())
    : null;
  const overdue = goal.targetDate && isPast(new Date(goal.targetDate)) && !done;

  return (
    <Card>
      <CardContent className="py-5 px-4 sm:px-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-2 rounded-lg shrink-0 ${done ? "bg-emerald-50" : "bg-blue-50"}`}>
              {done
                ? <CheckCircle2 size={18} className="text-emerald-500" />
                : <Target size={18} className="text-blue-500" />
              }
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 truncate">{goal.name}</p>
              {goal.notes && <p className="text-xs text-gray-400 truncate">{goal.notes}</p>}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={onEdit} className="text-gray-300 hover:text-blue-500 transition-colors"><Pencil size={14} /></button>
            <button onClick={onDelete} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className={`font-bold ${done ? "text-emerald-600" : "text-blue-600"}`}>
              {formatCurrency(goal.currentAmount)}
            </span>
            <span className="text-gray-400">{formatCurrency(goal.targetAmount)}</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${done ? "bg-emerald-500" : pct > 66 ? "bg-blue-500" : pct > 33 ? "bg-yellow-500" : "bg-red-400"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-1.5">
            <span className={`text-xs font-medium ${done ? "text-emerald-600" : "text-gray-500"}`}>
              {done ? "🎉 Target tercapai!" : `${pct.toFixed(1)}% — kurang ${formatCurrency(remaining)}`}
            </span>
            {goal.targetDate && (
              <span className={`text-xs flex items-center gap-1 ${overdue ? "text-red-500" : "text-gray-400"}`}>
                <Clock size={11} />
                {overdue
                  ? "Tenggat terlewat"
                  : done
                    ? format(new Date(goal.targetDate), "d MMM yyyy", { locale: localeId })
                    : daysLeft === 0
                      ? "Hari ini!"
                      : `${daysLeft} hari lagi`}
              </span>
            )}
          </div>
        </div>

        {/* Top up button */}
        {!done && (
          <>
            {topUpOpen ? (
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={topUpVal}
                  onChange={(e) => setTopUpVal(e.target.value)}
                  placeholder="Tambah jumlah (IDR)"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const n = Number(topUpVal);
                    if (n > 0) { onTopUp(n); setTopUpOpen(false); setTopUpVal(""); }
                  }}
                  disabled={!topUpVal || Number(topUpVal) <= 0}
                >
                  Simpan
                </Button>
                <Button size="sm" variant="secondary" onClick={() => { setTopUpOpen(false); setTopUpVal(""); }}>
                  Batal
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="secondary" className="w-full" onClick={() => setTopUpOpen(true)}>
                + Tambah Tabungan
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function SavingsClient({ initialGoals }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [goals, setGoals] = useState(initialGoals);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SavingsGoal | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
  const doneCount = goals.filter((g) => g.currentAmount >= g.targetAmount).length;

  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(g: SavingsGoal) {
    setEditTarget(g);
    setForm({
      name: g.name,
      targetAmount: String(g.targetAmount),
      currentAmount: String(g.currentAmount),
      targetDate: g.targetDate ?? "",
      notes: g.notes,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const payload = {
      name: form.name,
      targetAmount: Number(form.targetAmount),
      currentAmount: Number(form.currentAmount || 0),
      targetDate: form.targetDate || null,
      notes: form.notes,
    };

    try {
      if (editTarget) {
        const res = await fetch(`/api/savings-goals/${editTarget.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Gagal menyimpan");
        setGoals((prev) => prev.map((g) => g.id === editTarget.id ? toGoal(data) : g));
        toast("Goal berhasil diperbarui");
      } else {
        const res = await fetch("/api/savings-goals", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Gagal menyimpan");
        setGoals((prev) => [...prev, toGoal(data)]);
        toast("Goal berhasil ditambahkan");
      }
      setModalOpen(false);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Terjadi kesalahan", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus goal ini?")) return;
    try {
      const res = await fetch(`/api/savings-goals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      setGoals((prev) => prev.filter((g) => g.id !== id));
      toast("Goal dihapus");
      router.refresh();
    } catch {
      toast("Gagal menghapus goal", "error");
    }
  }

  async function handleTopUp(goal: SavingsGoal, amount: number) {
    const newAmount = goal.currentAmount + amount;
    try {
      const res = await fetch(`/api/savings-goals/${goal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: goal.name,
          targetAmount: goal.targetAmount,
          currentAmount: newAmount,
          targetDate: goal.targetDate,
          notes: goal.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGoals((prev) => prev.map((g) => g.id === goal.id ? toGoal(data) : g));
      const done = newAmount >= goal.targetAmount;
      toast(done ? `🎉 Target "${goal.name}" tercapai!` : `+${formatCurrency(amount)} berhasil ditambahkan`);
      router.refresh();
    } catch {
      toast("Gagal menambah tabungan", "error");
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Target Tabungan</h1>
          <p className="text-sm text-gray-500 mt-0.5">Lacak progress menuju tujuan finansialmu</p>
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus size={15} className="mr-1" /> Tambah Goal
        </Button>
      </div>

      {/* Summary */}
      {goals.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="py-4 px-4">
              <p className="text-xs text-gray-500 font-medium">Total Target</p>
              <p className="text-base font-bold text-gray-800">{formatCurrency(totalTarget)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 px-4">
              <p className="text-xs text-gray-500 font-medium">Total Terkumpul</p>
              <p className="text-base font-bold text-blue-600">{formatCurrency(totalSaved)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 px-4">
              <p className="text-xs text-gray-500 font-medium">Tercapai</p>
              <p className="text-base font-bold text-emerald-600">{doneCount} / {goals.length}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Goals list */}
      {goals.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-2">
            <Target size={32} className="mx-auto text-gray-300" />
            <p className="text-gray-400 text-sm">Belum ada goal. Tambahkan target tabunganmu!</p>
            <p className="text-xs text-gray-300">Contoh: Laptop baru, Dana darurat, Liburan</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onEdit={() => openEdit(g)}
              onDelete={() => handleDelete(g.id)}
              onTopUp={(amount) => handleTopUp(g, amount)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? "Edit Goal" : "Tambah Target Tabungan"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Goal</label>
            <input
              required value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Laptop baru, Dana darurat, Liburan Bali"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Jumlah (IDR)</label>
            <input
              type="number" required min="1"
              value={form.targetAmount}
              onChange={(e) => setForm((f) => ({ ...f, targetAmount: e.target.value }))}
              placeholder="e.g. 10000000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sudah Terkumpul (IDR)</label>
            <input
              type="number" min="0"
              value={form.currentAmount}
              onChange={(e) => setForm((f) => ({ ...f, currentAmount: e.target.value }))}
              placeholder="0"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Tanggal <span className="text-gray-400 font-normal">(opsional)</span></label>
            <input
              type="date"
              value={form.targetDate}
              onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan <span className="text-gray-400 font-normal">(opsional)</span></label>
            <input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. untuk keperluan kerja"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button type="submit" className="flex-1" disabled={loading}>{loading ? "Menyimpan…" : editTarget ? "Update" : "Tambah"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function toGoal(d: Record<string, unknown>): SavingsGoal {
  return {
    id: d.id as string,
    name: d.name as string,
    targetAmount: Number(d.target_amount),
    currentAmount: Number(d.current_amount),
    targetDate: (d.target_date as string) ?? null,
    notes: (d.notes as string) ?? "",
    createdAt: d.created_at as string,
    updatedAt: d.updated_at as string,
  };
}
