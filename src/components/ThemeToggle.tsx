"use client";

import { useEffect, useState } from "react";
import { IconSun, IconMoon } from "./Icons";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    // Default to dark mode unless user explicitly selected light
    const shouldBeDark = savedTheme ? savedTheme === "dark" : true;

    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="p-2 rounded-xl bg-white/10 dark:bg-[#2d2739]/60 hover:bg-[#7c3aed]/20 border border-[#7c3aed]/30 text-[#cebdff] transition-all flex items-center justify-center cursor-pointer shadow-sm hover:scale-105"
    >
      {isDark ? (
        <span className="material-symbols-outlined text-lg text-amber-300">light_mode</span>
      ) : (
        <span className="material-symbols-outlined text-lg text-[#7c3aed]">dark_mode</span>
      )}
    </button>
  );
}
