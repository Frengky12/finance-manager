"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ArrowRightLeft, Landmark, Target,
  BarChart2, Wallet, Menu, X, RefreshCw, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase-browser";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowRightLeft },
  { href: "/recurring", label: "Bulanan", icon: RefreshCw },
  { href: "/assets", label: "Assets", icon: Landmark },
  { href: "/budgets", label: "Budgets", icon: Target },
  { href: "/reports", label: "Reports", icon: BarChart2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const NavLinks = () => (
    <>
      {navItems.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            pathname === href
              ? "bg-blue-600 text-white"
              : "text-gray-300 hover:bg-gray-800 hover:text-white"
          )}
        >
          <Icon size={18} />
          {label}
        </Link>
      ))}
    </>
  );

  const LogoutButton = () => (
    <button
      onClick={handleLogout}
      disabled={loggingOut}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors w-full"
    >
      <LogOut size={18} />
      {loggingOut ? "Keluar…" : "Keluar"}
    </button>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900 flex items-center justify-between px-4 py-3 shadow-md">
        <div className="flex items-center gap-2">
          <Wallet className="text-blue-400" size={22} />
          <span className="text-white font-bold text-base">FinanceManager</span>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-gray-300 hover:text-white p-1"
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "lg:hidden fixed top-0 left-0 z-40 h-full w-64 bg-gray-900 text-white flex flex-col transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="px-6 py-5 flex items-center gap-3 border-b border-gray-700">
          <Wallet className="text-blue-400" size={22} />
          <span className="font-bold text-base">FinanceManager</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLinks />
        </nav>
        <div className="px-3 pb-4">
          <LogoutButton />
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-gray-900 text-white flex-col min-h-screen shrink-0">
        <div className="px-6 py-5 flex items-center gap-3 border-b border-gray-700">
          <Wallet className="text-blue-400" size={24} />
          <span className="text-lg font-bold">FinanceManager</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLinks />
        </nav>
        <div className="px-3 pb-6 border-t border-gray-700 pt-3">
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}
