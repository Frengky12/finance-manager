import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");

  let query = supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false });

  if (month) {
    const [y, mo] = month.split("-").map(Number);
    const nextMonthStart = `${mo === 12 ? y + 1 : y}-${String(mo === 12 ? 1 : mo + 1).padStart(2, "0")}-01`;
    query = query.gte("date", `${month}-01`).lt("date", nextMonthStart);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const body = await req.json();
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      type: body.type,
      category: body.category,
      amount: Number(body.amount),
      description: body.description || "",
      date: body.date,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
