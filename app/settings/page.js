"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "../components/Button";

function readThemeCookie() {
  const match = document.cookie.match(/(?:^|; )theme=([^;]*)/);
  return match ? match[1] : null;
}

export default function SettingsPage() {
  const router = useRouter();
  const [theme, setTheme] = useState(null);

useEffect(() => {
  const frameId = requestAnimationFrame(() => {
    setTheme(readThemeCookie() || "light");
  });

  return () => cancelAnimationFrame(frameId);
}, []);

  function applyTheme(next) {
    document.cookie = `theme=${next}; path=/; max-age=31536000`;
    setTheme(next);
    router.refresh();
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <h2 className="text-2xl font-bold mb-4 text-[var(--accent-text)]">Settings</h2>
      <p className="mb-6 text-sm text-[var(--foreground)] opacity-70">
        Choose a light or dark theme. Your choice is saved in a cookie and
        remembered next time you visit.
      </p>

      <div className="flex gap-3" role="group" aria-label="Theme">
        <Button onClick={() => applyTheme("light")} aria-pressed={theme === "light"} active={theme === "light"}>
          Light
        </Button>
        <Button onClick={() => applyTheme("dark")} aria-pressed={theme === "dark"} active={theme === "dark"}>
          Dark
        </Button>
      </div>
    </div>
  );
}
