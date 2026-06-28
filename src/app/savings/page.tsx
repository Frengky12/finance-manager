import { supabase } from "@/lib/supabase";
import { SavingsClient } from "./SavingsClient";
import type { SavingsGoal } from "@/types";

export const dynamic = "force-dynamic";

export default async function SavingsPage() {
  const { data } = await supabase
    .from("savings_goals")
    .select("*")
    .order("created_at", { ascending: true });

  const goals: SavingsGoal[] = (data ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    targetAmount: Number(g.target_amount),
    currentAmount: Number(g.current_amount),
    targetDate: g.target_date,
    notes: g.notes,
    createdAt: g.created_at,
    updatedAt: g.updated_at,
  }));

  return <SavingsClient initialGoals={goals} />;
}
