"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Landmark, PiggyBank, TrendingUp, Home, Car, Bitcoin, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { Asset, AssetType } from "@/types";

const ASSET_TYPE_CONFIG: Record<AssetType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  cash: { label: "Cash", icon: Wallet, color: "text-green-600", bg: "bg-green-50" },
  savings: { label: "Savings", icon: PiggyBank, color: "text-blue-600", bg: "bg-blue-50" },
  investment: { label: "Investment", icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
  property: { label: "Property", icon: Home, color: "text-orange-600", bg: "bg-orange-50" },
  vehicle: { label: "Vehicle", icon: Car, color: "text-yellow-600", bg: "bg-yellow-50" },
  crypto: { label: "Crypto", icon: Bitcoin, color: "text-cyan-600", bg: "bg-cyan-50" },
  other: { label: "Other", icon: Landmark, color: "text-gray-600", bg: "bg-gray-100" },
};

const EMPTY_FORM = { name: "", type: "savings" as AssetType, value: "", notes: "" };

interface Props { initialAssets: Asset[]; goldNetWorth?: number }

export function AssetsClient({ initialAssets, goldNetWorth = 0 }: Props) {
  const router = useRouter();
  const [assets, setAssets] = useState(initialAssets);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Asset | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const regularNetWorth = assets.reduce((s, a) => s + a.value, 0);
  const totalNetWorth = regularNetWorth + goldNetWorth;

  function openAdd() { setEditTarget(null); setForm(EMPTY_FORM); setModalOpen(true); }
  function openEdit(a: Asset) {
    setEditTarget(a);
    setForm({ name: a.name, type: a.type, value: String(a.value), notes: a.notes });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const payload = { ...form, value: Number(form.value) };
    if (editTarget) {
      const res = await fetch(`/api/assets/${editTarget.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const updated = await res.json();
      setAssets((prev) => prev.map((a) => (a.id === editTarget.id ? updated : a)));
    } else {
      const res = await fetch("/api/assets", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const created = await res.json();
      setAssets((prev) => [...prev, created]);
    }
    setModalOpen(false);
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this asset?")) return;
    await fetch(`/api/assets/${id}`, { method: "DELETE" });
    setAssets((prev) => prev.filter((a) => a.id !== id));
    router.refresh();
  }

  const groupedByType = (Object.keys(ASSET_TYPE_CONFIG) as AssetType[])
    .map((type) => ({
      type,
      assets: assets.filter((a) => a.type === type),
      total: assets.filter((a) => a.type === type).reduce((s, a) => s + a.value, 0),
    }))
    .filter((g) => g.assets.length > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Assets</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Total Net Worth: <span className="font-semibold text-blue-600">{formatCurrency(totalNetWorth)}</span>
            {goldNetWorth > 0 && (
              <span className="ml-2 text-xs text-yellow-600">(termasuk emas {formatCurrency(goldNetWorth)})</span>
            )}
          </p>
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus size={15} className="mr-1" /> Add
        </Button>
      </div>

      {assets.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-gray-400 text-sm">
            No assets tracked yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedByType.map(({ type, assets: group, total }) => {
            const cfg = ASSET_TYPE_CONFIG[type];
            const Icon = cfg.icon;
            return (
              <Card key={type}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`${cfg.bg} p-2 rounded-lg`}>
                        <Icon className={cfg.color} size={16} />
                      </div>
                      <CardTitle>{cfg.label}</CardTitle>
                    </div>
                    <span className={`font-semibold text-sm sm:text-base ${cfg.color}`}>{formatCurrency(total)}</span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-50">
                    {group.map((a) => (
                      <div key={a.id} className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{a.name}</p>
                          {a.notes && <p className="text-xs text-gray-400 truncate">{a.notes}</p>}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-semibold text-gray-800">{formatCurrency(a.value)}</span>
                          <button onClick={() => openEdit(a)} className="text-gray-300 hover:text-blue-500 transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(a.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? "Edit Asset" : "Add Asset"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              required value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. BCA Savings Account"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AssetType }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {(Object.keys(ASSET_TYPE_CONFIG) as AssetType[]).map((t) => (
                <option key={t} value={t}>{ASSET_TYPE_CONFIG[t].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Value (IDR)</label>
            <input
              type="number" required min="0"
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              placeholder="e.g. 50000000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={loading}>{loading ? "Saving..." : editTarget ? "Update" : "Add"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
