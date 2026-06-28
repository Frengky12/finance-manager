import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import { validateRecurringTemplate } from "@/lib/validate";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const body = await req.json();
  const validErr = validateRecurringTemplate(body);
  if (validErr) return validErr;

  const { data, error } = await supabase
    .from("recurring_templates")
    .update({
      name: body.name,
      type: body.type,
      category: body.category,
      amount: Number(body.amount),
      day_of_month: Number(body.dayOfMonth) || 1,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const { error } = await supabase.from("recurring_templates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
