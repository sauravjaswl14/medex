"use client";

import Link from "next/link";
import {
  HeartPulse,
  ShoppingCart,
  ClipboardCheck,
  Monitor,
  Moon,
  Sun,
} from "lucide-react";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type ThemeOption = "light" | "dark" | "system";

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  /* ${
          theme === value ?
            "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white"
          : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        } */
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-slate-200 dark:bg-gray-700 dark:text-white">
      <div className="max-w-7xl mx-auto px-5 h-18 flex items-center justify-between">
        <div className="flex items-center gap-2 text-teal-800 font-black text-2xl dark:text-white">
          <HeartPulse size={28} /> <span>medex</span>
          <span className="text-xs font-medium bg-teal-50 px-2 py-1 rounded-full dark:bg-teal-800 dark:text-white">
            Explore
          </span>
        </div>
        <div className="flex gap-10 items-center">
          <Link
            href="/booking"
            className="flex gap-2 items-center text-sm font-semibold text-teal-800 dark:text-white"
          >
            <ClipboardCheck size={18} /> Booking
          </Link>
          <Link
            href="/cart"
            className="flex gap-2 items-center text-sm font-semibold text-teal-800 dark:text-white"
          >
            <ShoppingCart size={18} /> Cart & checkout
          </Link>
          <div
            role="group"
            aria-label="Theme preference"
            className="inline-flex items-center gap-1 rounded-lg border p-1"
          >
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                aria-pressed={theme === value}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  theme === value ?
                    "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
