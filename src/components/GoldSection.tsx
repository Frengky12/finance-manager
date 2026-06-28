"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { GoldHolding, GoldPriceCache } from "@/types";
import { formatDistanceToNow } from "date-fns";

interface GoldPrice extends GoldPriceCache {
  fromCache?: boolean;
  stale?: boolean;
  error?: string;
}

const EMPTY_FORM = { name: "", grams: "", notes: "" };

export function GoldSection({ initialHoldings }: { initialHoldings: GoldHolding[] }) {
  const router = useRouter();
  const [holdings, setHoldings] = useState(initialHoldings);
  const [price, setPrice] = useState<GoldPrice | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<GoldHolding | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchPrice = useCallback(async (force = false) => {
    setPriceLoading(true);
    setPriceError(null);
    try {
      const res = await fetch(`/api/gold-price${force ? "?refresh=1" : ""}`);
      const data: GoldPrice = await res.json();
      if (data.error) throw new Error(data.error);
      setPrice(data);
    } catch (e) {
      setPriceError(e instanceof Error ? e.message : "Failed to fetch price");
    } finally {
      setPriceLoading(false);
    }
  }, []);

  // Force-refresh by busting cache: temporarily clear cache via a dedicated param
  const handleRefresh = async () => {
    // Delete cache by posting to the endpoint with a special flag
    await fetch("/api/gold-price", { method: "DELETE" }).catch(() => {});
    fetchPrice(true);
  };

  useEffect(() => { fetchPrice(); }, [fetchPrice]);

  const pricePerGram = price?.priceIdrPerGram ?? 0;
  const totalGrams = holdings.reduce((s, h) => s + h.grams, 0);
  const totalValue = totalGrams * pricePerGram;

  function openAdd() { setEditTarget(null); setForm(EMPTY_FORM); setModalOpen(true); }
  function openEdit(h: GoldHolding) {
    setEditTarget(h);
    setForm({ name: h.name, grams: String(h.grams), notes: h.notes });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, grams: Number(form.grams) };
    if (editTarget) {
      const res = await fetch(`/api/gold-holdings/${editTarget.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const updated = await res.json();
      setHoldings((prev) => prev.map((h) => (h.id === editTarget.id ? updated : h)));
    } else {
      const res = await fetch("/api/gold-holdings", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const created = await res.json();
      setHoldings((prev) => [...prev, created]);
    }
    setModalOpen(false);
    setSaving(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this gold holding?")) return;
    await fetch(`/api/gold-holdings/${id}`, { method: "DELETE" });
    setHoldings((prev) => prev.filter((h) => h.id !== id));
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {/* Gold icon */}
            <div className="bg-yellow-50 p-2 rounded-lg">
              <svg className="text-yellow-500 w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
            <CardTitle>Gold</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {totalValue > 0 && (
              <span className="font-semibold text-yellow-600 text-sm sm:text-base">
                {formatCurrency(totalValue)}
              </span>
            )}
            <button
              onClick={() => fetchPrice()}
              disabled={priceLoading}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:animate-spin"
              title="Refresh price"
            >
              <RefreshCw size={14} />
            </button>
            <Button size="sm" onClick={openAdd}>
              <Plus size={14} className="mr-1" /> Add
            </Button>
          </div>
        </div>

        {/* Live price banner */}
        <div className="mt-3">
          {priceLoading && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <RefreshCw size={12} className="animate-spin" />
              Fetching live gold price…
            </div>
          )}
          {priceError && (
            <div className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
              {priceError} — showing last known price.
              <button onClick={() => fetchPrice()} className="ml-2 underline">Retry</button>
            </div>
          )}
          {price && !priceLoading && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
              <span>
                Jual: <span className="font-semibold text-yellow-600">{formatCurrency(price.priceIdrPerGram)}</span>
                {" / gram"}
              </span>
              <span className="text-gray-300">|</span>
              <span>
                Buyback: <span className="font-semibold text-gray-600">{formatCurrency(price.buybackIdrPerGram)}</span>
                {" / gram"}
              </span>
              <span className="text-gray-300">|</span>
              <span>Sumber: {price.source} · {price.recordedDate}</span>
              <span className="text-gray-300">|</span>
              <span className={price.stale ? "text-orange-500" : "text-gray-400"}>
                {price.stale ? "⚠ Stale · " : ""}
                {formatDistanceToNow(new Date(price.updatedAt), { addSuffix: true })}
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {holdings.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">
            No gold holdings yet.
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {holdings.map((h) => {
              const value = h.grams * pricePerGram;
              return (
                <div key={h.id} className="px-4 sm:px-6 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{h.name}</p>
                    <p className="text-xs text-gray-400">
                      {h.grams} g
                      {h.notes ? ` · ${h.notes}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-yellow-600">
                      {pricePerGram > 0 ? formatCurrency(value) : "—"}
                    </p>
                    <p className="text-xs text-gray-400">{h.grams} g</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => openEdit(h)} className="text-gray-300 hover:text-blue-500 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(h.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Total row */}
            {holdings.length > 1 && (
              <div className="px-4 sm:px-6 py-3 bg-yellow-50/50 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Total ({totalGrams} g)</span>
                <span className="text-sm font-bold text-yellow-600">
                  {pricePerGram > 0 ? formatCurrency(totalValue) : "—"}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? "Edit Gold Holding" : "Add Gold Holding"}
      >
        {price && (
          <div className="mb-4 bg-yellow-50 border border-yellow-100 rounded-lg px-4 py-3 text-sm">
            <p className="text-yellow-700 font-medium">
              Harga jual: {formatCurrency(price.priceIdrPerGram)} / gram
            </p>
            <p className="text-yellow-600/70 text-xs mt-0.5">
              Buyback: {formatCurrency(price.buybackIdrPerGram)} / gram · Sumber: {price.source}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name / Label</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Antam 10g bar, LM 5g"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weight (grams)</label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={form.grams}
              onChange={(e) => setForm((f) => ({ ...f, grams: e.target.value }))}
              placeholder="e.g. 10"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            {/* Live preview */}
            {form.grams && price && Number(form.grams) > 0 && (
              <p className="text-xs text-yellow-600 mt-1.5">
                ≈ {formatCurrency(Number(form.grams) * price.priceIdrPerGram)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Stored at home, bank safe"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-400"
              disabled={saving}
            >
              {saving ? "Saving…" : editTarget ? "Update" : "Add Gold"}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
