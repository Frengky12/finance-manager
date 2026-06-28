import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const body = await req.json();

  if (!body.name?.trim()) return NextResponse.json({ error: "Nama goal wajib diisi" }, { status: 400 });
  const target = Number(body.targetAmount);
  if (!target || target <= 0) return NextResponse.json({ error: "Target jumlah harus positif" }, { status: 400 });
  const current = Number(body.currentAmount ?? 0);
  if (current < 0) return NextResponse.json({ error: "Jumlah terkumpul tidak boleh negatif" }, { status: 400 });

  const { data, error } = await supabase
    .from("savings_goals")
    .update({
      name: body.name.trim(),
      target_amount: target,
      current_amount: current,
      target_date: body.targetDate || null,
      notes: body.notes?.trim() || "",
      updated_at: new Date().toISOString(),
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
  const { error } = await supabase.from("savings_goals").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
