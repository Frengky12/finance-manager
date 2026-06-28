import { NextResponse } from "next/server";

const INCOME_CATEGORIES = ["salary", "freelance", "investment", "other_income"];
const EXPENSE_CATEGORIES = ["food", "transport", "housing", "utilities", "health", "entertainment", "education", "shopping", "other_expense"];
const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
const ASSET_TYPES = ["cash", "savings", "investment", "property", "vehicle", "crypto", "other"];

export function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function validateTransaction(body: Record<string, unknown>) {
  if (!body.type || !["income", "expense"].includes(body.type as string))
    return err("type harus 'income' atau 'expense'");
  if (!body.category || !ALL_CATEGORIES.includes(body.category as string))
    return err("category tidak valid");
  const amount = Number(body.amount);
  if (!amount || amount <= 0 || !Number.isFinite(amount))
    return err("amount harus angka positif");
  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date as string))
    return err("date harus format YYYY-MM-DD");
  return null;
}

export function validateAsset(body: Record<string, unknown>) {
  if (!body.name || String(body.name).trim().length === 0)
    return err("name wajib diisi");
  if (String(body.name).length > 100)
    return err("name maksimal 100 karakter");
  if (!body.type || !ASSET_TYPES.includes(body.type as string))
    return err("type aset tidak valid");
  const value = Number(body.value);
  if (value < 0 || !Number.isFinite(value))
    return err("value harus angka non-negatif");
  return null;
}

export function validateBudget(body: Record<string, unknown>) {
  if (!body.category || !EXPENSE_CATEGORIES.includes(body.category as string))
    return err("category harus kategori pengeluaran yang valid");
  const limit = Number(body.monthlyLimit);
  if (!limit || limit <= 0 || !Number.isFinite(limit))
    return err("monthlyLimit harus angka positif");
  if (!body.month || !/^\d{4}-\d{2}$/.test(body.month as string))
    return err("month harus format YYYY-MM");
  return null;
}

export function validateGoldHolding(body: Record<string, unknown>) {
  if (!body.name || String(body.name).trim().length === 0)
    return err("name wajib diisi");
  const grams = Number(body.grams);
  if (!grams || grams <= 0 || !Number.isFinite(grams))
    return err("grams harus angka positif");
  return null;
}

export function validateRecurringTemplate(body: Record<string, unknown>) {
  if (!body.name || String(body.name).trim().length === 0)
    return err("name wajib diisi");
  if (!body.type || !["income", "expense"].includes(body.type as string))
    return err("type harus 'income' atau 'expense'");
  if (!body.category || !ALL_CATEGORIES.includes(body.category as string))
    return err("category tidak valid");
  const amount = Number(body.amount);
  if (!amount || amount <= 0 || !Number.isFinite(amount))
    return err("amount harus angka positif");
  const day = Number(body.dayOfMonth);
  if (!Number.isInteger(day) || day < 1 || day > 28)
    return err("dayOfMonth harus angka 1–28");
  return null;
}
