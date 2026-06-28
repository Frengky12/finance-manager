import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import { validateRecurringTemplate } from "@/lib/validate";

export async function GET() {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const { data, error } = await supabase
    .from("recurring_templates")
    .select("*")
    .order("type", { ascending: false })
    .order("amount", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const body = await req.json();
  const validErr = validateRecurringTemplate(body);
  if (validErr) return validErr;

  const { data, error } = await supabase
    .from("recurring_templates")
    .insert({
      name: body.name,
      type: body.type,
      category: body.category,
      amount: Number(body.amount),
      day_of_month: Number(body.dayOfMonth) || 1,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
