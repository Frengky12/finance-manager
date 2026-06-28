import { supabase } from "@/lib/supabase";
import { BudgetsClient } from "./BudgetsClient";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = monthParam || format(new Date(), "yyyy-MM");

  // Compute actual last day of the month to avoid invalid dates (e.g. June-31)
  const [y, m] = month.split("-").map(Number);
  const nextMonthStart = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`;

  const [budgetsRes, txRes] = await Promise.all([
    supabase.from("budgets").select("*").eq("month", month),
    supabase
      .from("transactions")
      .select("*")
      .eq("type", "expense")
      .gte("date", `${month}-01`)
      .lt("date", nextMonthStart),
  ]);

  // Normalize snake_case → camelCase to match our TypeScript types
  const budgets = (budgetsRes.data ?? []).map((b) => ({
    id: b.id,
    category: b.category,
    monthlyLimit: Number(b.monthly_limit),
    month: b.month,
    createdAt: b.created_at,
  }));

  const transactions = (txRes.data ?? []).map((t) => ({
    id: t.id,
    type: t.type,
    category: t.category,
    amount: Number(t.amount),
    description: t.description,
    date: t.date,
    createdAt: t.created_at,
  }));

  return (
    <BudgetsClient
      initialBudgets={budgets}
      transactions={transactions}
      currentMonth={month}
    />
  );
}
