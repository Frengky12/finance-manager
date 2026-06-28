import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { TransactionCategory } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const INCOME_CATEGORIES: TransactionCategory[] = [
  "salary", "freelance", "investment", "other_income",
];

export const EXPENSE_CATEGORIES: TransactionCategory[] = [
  "food", "transport", "housing", "utilities", "health",
  "entertainment", "education", "shopping", "other_expense",
];

export const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  salary: "Salary",
  freelance: "Freelance",
  investment: "Investment",
  other_income: "Other Income",
  food: "Food & Dining",
  transport: "Transport",
  housing: "Housing & Rent",
  utilities: "Utilities",
  health: "Health",
  entertainment: "Entertainment",
  education: "Education",
  shopping: "Shopping",
  other_expense: "Other Expense",
};

export const CATEGORY_COLORS: Record<TransactionCategory, string> = {
  salary: "#22c55e",
  freelance: "#4ade80",
  investment: "#86efac",
  other_income: "#bbf7d0",
  food: "#f97316",
  transport: "#fb923c",
  housing: "#ef4444",
  utilities: "#3b82f6",
  health: "#a855f7",
  entertainment: "#ec4899",
  education: "#eab308",
  shopping: "#14b8a6",
  other_expense: "#6b7280",
};
