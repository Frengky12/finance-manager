import { supabase } from "@/lib/supabase";
import { TransactionsClient } from "./TransactionsClient";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const { data } = await supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false });

  return <TransactionsClient initialTransactions={data ?? []} />;
}
