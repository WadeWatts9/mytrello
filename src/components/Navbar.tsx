"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import ThemeToggle from "./ThemeToggle";
import { IconKanban, IconCrown, IconLogOut } from "./Icons";

interface NavbarProps {
  boardTitle?: string;
  boardRole?: string;
}

export default function Navbar({ boardTitle, boardRole }: NavbarProps) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.role === "ADMIN";

  return (
    <header className="glass-header sticky top-0 z-40 px-4 md:px-8 py-3.5 flex items-center justify-between">
      {/* Brand & Breadcrumbs */}
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-extrabold text-xl tracking-tight text-indigo-600 dark:text-indigo-400 hover:opacity-90 transition-opacity"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
            <IconKanban className="w-5 h-5" />
          </div>
          <span>MyTrello</span>
        </Link>

        {boardTitle && (
          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-400">
            <span>/</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100 truncate max-w-xs">
              {boardTitle}
            </span>
            {boardRole && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                {boardRole}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs md:text-sm font-semibold rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:from-amber-500/20 hover:to-orange-500/20 transition-all shadow-sm"
          >
            <IconCrown className="w-4 h-4 text-amber-500" />
            <span>Admin</span>
          </Link>
        )}

        <ThemeToggle />

        {user && (
          <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                {user.name || user.email?.split("@")[0]}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                {user.role}
              </span>
            </div>

            <div
              className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold uppercase shadow-sm"
              title={`${user.name} (${user.email})`}
            >
              {user.name ? user.name[0] : user.email ? user.email[0] : "U"}
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Cerrar sesión"
              className="p-2 rounded-xl text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <IconLogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
