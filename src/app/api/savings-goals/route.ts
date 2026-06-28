import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

export async function GET() {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const { data, error } = await supabase
    .from("savings_goals")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const body = await req.json();

  if (!body.name?.trim()) return NextResponse.json({ error: "Nama goal wajib diisi" }, { status: 400 });
  const target = Number(body.targetAmount);
  if (!target || target <= 0) return NextResponse.json({ error: "Target jumlah harus positif" }, { status: 400 });
  const current = Number(body.currentAmount ?? 0);
  if (current < 0) return NextResponse.json({ error: "Jumlah terkumpul tidak boleh negatif" }, { status: 400 });

  const { data, error } = await supabase
    .from("savings_goals")
    .insert({
      name: body.name.trim(),
      target_amount: target,
      current_amount: current,
      target_date: body.targetDate || null,
      notes: body.notes?.trim() || "",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
