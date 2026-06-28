import { supabase } from "@/lib/supabase";
import { RecurringClient } from "./RecurringClient";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function RecurringPage() {
  const currentMonth = format(new Date(), "yyyy-MM");

  const [templatesRes, appliedRes] = await Promise.all([
    supabase.from("recurring_templates").select("*").order("type", { ascending: false }).order("amount", { ascending: false }),
    supabase.from("recurring_applied").select("*").eq("month", currentMonth),
  ]);

  const templates = (templatesRes.data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type,
    category: t.category,
    amount: Number(t.amount),
    dayOfMonth: t.day_of_month,
    createdAt: t.created_at,
  }));

  const appliedThisMonth = new Set(
    (appliedRes.data ?? []).map((a) => a.template_id)
  );

  return (
    <RecurringClient
      initialTemplates={templates}
      appliedThisMonth={appliedThisMonth}
      currentMonth={currentMonth}
    />
  );
}
