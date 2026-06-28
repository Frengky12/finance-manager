import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const body = await req.json();
  const { templateIds, month } = body as { templateIds: string[]; month: string };

  if (!templateIds?.length || !month) {
    return NextResponse.json({ error: "templateIds and month required" }, { status: 400 });
  }

  const { data: templates, error: tplErr } = await supabase
    .from("recurring_templates")
    .select("*")
    .in("id", templateIds);

  if (tplErr) return NextResponse.json({ error: tplErr.message }, { status: 500 });
  if (!templates?.length) return NextResponse.json({ error: "No templates found" }, { status: 404 });

  const results: { templateId: string; transactionId: string }[] = [];
  const errors: { templateId: string; error: string }[] = [];

  for (const tpl of templates) {
    const [year, mon] = month.split("-").map(Number);
    const lastDay = new Date(year, mon, 0).getDate();
    const day = Math.min(tpl.day_of_month, lastDay);
    const date = `${month}-${String(day).padStart(2, "0")}`;

    const { data: tx, error: txErr } = await supabase
      .from("transactions")
      .insert({
        type: tpl.type,
        category: tpl.category,
        amount: Number(tpl.amount),
        description: tpl.name,
        date,
      })
      .select()
      .single();

    if (txErr) {
      errors.push({ templateId: tpl.id, error: txErr.message });
      continue;
    }

    await supabase.from("recurring_applied").upsert(
      { template_id: tpl.id, month, transaction_id: tx.id, applied_at: new Date().toISOString() },
      { onConflict: "template_id,month" }
    );

    results.push({ templateId: tpl.id, transactionId: tx.id });
  }

  return NextResponse.json({ applied: results, errors });
}
