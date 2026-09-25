"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import ThemeToggle from "./ThemeToggle";
import {
  IconPin,
  IconLogOut,
  IconSearch,
  IconShare,
  IconPlus,
} from "./Icons";

interface NavbarProps {
  boardTitle?: string;
  boardRole?: string;
  onShareClick?: () => void;
  onSearchChange?: (val: string) => void;
  searchValue?: string;
}

export default function Navbar({
  boardTitle,
  boardRole,
  onShareClick,
  onSearchChange,
  searchValue = "",
}: NavbarProps) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.role === "ADMIN";

  const [boards, setBoards] = useState<{ id: string; title: string }[]>([]);
  const [boardDropdownOpen, setBoardDropdownOpen] = useState(false);

  useEffect(() => {
    fetch("/api/boards")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setBoards(data))
      .catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 py-2.5 w-full backdrop-blur-xl bg-[#100b1c]/85 border-b border-[#4a4455]/30 shadow-2xl shadow-[#100b1c]/60">
      {/* Brand & Board Selector */}
      <div className="flex items-center gap-4 lg:gap-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-tr from-[#7c3aed] to-[#cebdff] p-0.5 shadow-lg shadow-[#7c3aed]/30 border border-white/20 group-hover:scale-105 transition-transform">
            <Image
              src="/logo.png"
              alt="My Trello Logo"
              width={40}
              height={40}
              className="w-full h-full object-cover rounded-[10px]"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-white tracking-tight leading-none">
              My Trello
            </span>
          </div>
        </Link>

        {/* Board Selector Dropdown (from Stitch Design) */}
        {boards.length > 0 && (
          <div className="relative hidden md:block">
            <button
              onClick={() => setBoardDropdownOpen(!boardDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#221d2e]/80 border border-[#4a4455]/40 hover:border-[#7c3aed]/50 text-xs font-semibold text-white transition-all cursor-pointer"
            >
              <span className="truncate max-w-[160px]">
                {boardTitle ? `🚀 ${boardTitle}` : "Seleccionar Tablero"}
              </span>
              <span className="material-symbols-outlined text-sm text-[#ccc3d8]">expand_more</span>
            </button>

            {boardDropdownOpen && (
              <div className="absolute left-0 mt-2 w-64 glass-modal rounded-xl p-2 z-50 space-y-1 shadow-2xl">
                <div className="text-[10px] uppercase font-bold text-[#958da1] px-2 py-1">
                  Tus Tableros
                </div>
                {boards.map((b) => (
                  <Link
                    key={b.id}
                    href={`/board/${b.id}`}
                    onClick={() => setBoardDropdownOpen(false)}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-white hover:bg-[#7c3aed]/25 transition-colors"
                  >
                    <span className="truncate font-medium">{b.title}</span>
                  </Link>
                ))}
                <div className="pt-1 border-t border-white/10">
                  <Link
                    href="/"
                    onClick={() => setBoardDropdownOpen(false)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-[#d2bbff] hover:bg-white/5 font-semibold"
                  >
                    <IconPlus className="w-3.5 h-3.5" />
                    <span>Ver todos los tableros</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Center Search Bar with Hashtag Support (from Stitch Design) */}
      <div className="hidden lg:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#958da1] text-lg pointer-events-none">
            search
          </span>
          <input
            type="text"
            placeholder="Buscar tarjetas o tags (ej. #frontend #bug)..."
            value={searchValue}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            className="w-full bg-[#1e192a]/80 border border-[#4a4455]/30 rounded-xl pl-10 pr-12 py-1.5 text-xs text-white placeholder-[#958da1] focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#958da1] bg-[#2d2739] px-1.5 py-0.5 rounded border border-[#4a4455]/40">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Controls & Status Badges */}
      <div className="flex items-center gap-3">
        {/* Docker & SQLite Engine Status Badge (Admin Only) */}
        {isAdmin && (
          <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#100b1c] border border-[#4a4455]/30 shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-mono flex items-center gap-1.5">
              <span className="text-emerald-400 font-semibold">Docker: Running</span>
              <span className="text-[#958da1]">(:3004 SQLite)</span>
            </span>
          </div>
        )}

        {/* Role Badge Indicator */}
        {boardRole && (
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#7c3aed]/15 border border-[#7c3aed]/30 text-xs font-bold text-[#d2bbff]">
            <span>{boardRole === "OWNER" || isAdmin ? "📌" : boardRole === "EDITOR" ? "✏️" : "👁️"}</span>
            <span>{boardRole}</span>
          </div>
        )}

        {/* Admin Link */}
        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#7c3aed]/20 border border-[#7c3aed]/40 text-[#d2bbff] hover:bg-[#7c3aed]/30 text-xs font-bold transition-all shadow-sm"
          >
            <IconPin className="w-3.5 h-3.5 text-[#d2bbff]" />
            <span>Panel Admin</span>
          </Link>
        )}

        {/* Share Board Action (if in board) */}
        {onShareClick && boardRole !== "VIEWER" && (
          <button
            onClick={onShareClick}
            className="secondary-glass-btn hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white cursor-pointer"
          >
            <IconShare className="w-3.5 h-3.5 text-[#d2bbff]" />
            <span>Compartir</span>
          </button>
        )}

        <ThemeToggle />

        {/* User Profile Avatar with violet glowing indicator */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-[#4a4455]/30">
            <Link
              href="/profile"
              className="relative group cursor-pointer flex items-center gap-2 hover:opacity-90 transition-opacity"
              title={`Ver perfil: ${user.name || user.email}`}
            >
              <div className="w-9 h-9 rounded-full ring-2 ring-[#7c3aed] ring-offset-2 ring-offset-[#161121] overflow-hidden bg-[#2d2739] flex items-center justify-center text-white text-xs font-bold shadow-lg">
                {user.image ? (
                  <img src={user.image} alt={user.name || "User"} className="w-full h-full object-cover" />
                ) : user.name ? (
                  user.name[0].toUpperCase()
                ) : user.email ? (
                  user.email[0].toUpperCase()
                ) : (
                  "U"
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 px-1 py-0.2 text-[8px] font-mono uppercase font-black bg-[#383244] text-[#cebdff] border border-[#4a4455] rounded shadow-sm">
                {user.role === "ADMIN" ? "Adm" : "Usr"}
              </span>
            </Link>

            <button
              onClick={async () => {
                await signOut({ redirect: false });
                window.location.href = "/login";
              }}
              title="Cerrar sesión"
              className="p-2 rounded-xl text-[#958da1] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <IconLogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
