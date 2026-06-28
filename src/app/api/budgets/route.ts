import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import { validateBudget } from "@/lib/validate";

export async function GET(req: NextRequest) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");

  let query = supabase.from("budgets").select("*");
  if (month) query = query.eq("month", month);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const body = await req.json();
  const validErr = validateBudget(body);
  if (validErr) return validErr;

  const { data, error } = await supabase
    .from("budgets")
    .upsert(
      {
        category: body.category,
        monthly_limit: Number(body.monthlyLimit),
        month: body.month,
      },
      { onConflict: "category,month" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
