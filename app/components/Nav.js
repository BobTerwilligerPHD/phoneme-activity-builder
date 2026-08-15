"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const LINKS = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About"},
    { href: "/wordle", label: "Wordle" },
    { href: "/word-search", label: "Word Search" },
    { href: "/settings", label: "Settings" },
];

export default function Nav() {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();
    const toggleRef = useRef(null);
    const linkRefs = useRef([]);

    function closeAndReturnFocus() {
        setOpen(false);
        toggleRef.current?.focus();
    }

    useEffect(() => {
        if (!open) return;
        function handleKeyDown(e) {
            if (e.key === "Escape") closeAndReturnFocus();
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open]);

    function handleLastLinkKeyDown(e) {
        if (e.key === "Tab" && !e.shiftKey) {
            e.preventDefault();
            linkRefs.current[0]?.focus();
        }
    }

    return (
        <nav className="bg-[var(--background)] text-[var(--foreground)] border-b border-[var(--foreground)] px-6 py-3 flex items-center justify-between relative">
            <div className="hidden md:flex gap-6">
                {LINKS.map((link) => {
                    const active = pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            aria-current={active ? "page" : undefined}
                            className={active ? "underline font-semibold text-[var(--accent-text)]" : "hover:underline"}
                        >
                            {link.label}
                        </Link>
                    );
                })}
            </div>

            <button
                ref={toggleRef}
                className="md:hidden text-2xl leading-none"
                aria-label="Toggle navigation menu"
                aria-expanded={open}
                onClick={() => setOpen(!open)}
                >
                    &#9776;
                </button>

                {open && (
                    <>
                        <div
                            aria-hidden="true"
                            className="absolute top-full left-0 w-full h-screen bg-black/40 z-40 md:hidden"
                            onClick={closeAndReturnFocus}
                        />
                        <div className="absolute top-full left-0 w-full bg-[var(--background)] text-[var(--foreground)] border border-[var(--foreground)] shadow-lg z-50 flex flex-col md:hidden">
                            {LINKS.map((link, i) => {
                                const active = pathname === link.href;
                                const isLast = i === LINKS.length - 1;
                                return (
                                    <Link
                                        key={link.href}
                                        ref={(el) => (linkRefs.current[i] = el)}
                                        href={link.href}
                                        aria-current={active ? "page" : undefined}
                                        className={`px-6 py-3 border-[var(--foreground)] hover:bg-[var(--accent-fill)] hover:text-[var(--accent-on-fill)] active:bg-[var(--accent-fill)] active:text-[var(--accent-on-fill)] ${
                                            active ? "bg-[var(--accent-fill)] text-[var(--accent-on-fill)]" : ""
                                        }`}
                                        onClick={() => setOpen(false)}
                                        onKeyDown={isLast ? handleLastLinkKeyDown : undefined}
                                    >
                                        {link.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </>
                )}
            </nav>
        );
    }
