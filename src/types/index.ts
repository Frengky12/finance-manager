export type TransactionType = "income" | "expense";

export type TransactionCategory =
  | "salary" | "freelance" | "investment" | "other_income"
  | "food" | "transport" | "housing" | "utilities" | "health"
  | "entertainment" | "education" | "shopping" | "other_expense";

export interface Transaction {
  id: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  description: string;
  date: string;
  createdAt: string;
}

export type AssetType = "cash" | "savings" | "investment" | "property" | "vehicle" | "crypto" | "other";

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  value: number;
  notes: string;
  updatedAt: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  category: TransactionCategory;
  monthlyLimit: number;
  month: string; // "YYYY-MM"
  createdAt: string;
}

export interface RecurringTemplate {
  id: string;
  name: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  dayOfMonth: number;
  createdAt: string;
}

export interface RecurringApplied {
  id: string;
  templateId: string;
  month: string;
  transactionId: string | null;
  appliedAt: string;
}

export interface GoldHolding {
  id: string;
  name: string;
  grams: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoldPriceCache {
  priceIdrPerGram: number;  // sell price in IDR per gram (from Antam/anekalogam)
  buybackIdrPerGram: number; // buyback price in IDR per gram
  source: string;            // e.g. "anekalogam"
  recordedDate: string;      // date from the source e.g. "2026-06-28"
  updatedAt: string;
}

export interface DbSchema {
  transactions: Transaction[];
  assets: Asset[];
  budgets: Budget[];
  goldHoldings: GoldHolding[];
  goldPriceCache: GoldPriceCache | null;
}
