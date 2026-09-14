import { PHONEME_KEYBOARD, PHONEME_INFO } from "../lib/phonemeData";

type KeyboardStatus = "correct" | "present" | "absent";

type PhonemeKeyboardProps = {
  onKeyPress: (phoneme: string) => void;
  showHints: boolean;
  getStatus?: (phoneme: string) => KeyboardStatus | null;
  className?: string;
};

export default function PhonemeKeyboard({ onKeyPress, showHints, getStatus, className = "" }: PhonemeKeyboardProps) {
  return (
    <div className={`grid grid-cols-8 gap-1 w-fit mx-auto ${className}`}>
      {PHONEME_KEYBOARD.flat().filter(Boolean).map((p) => {
        const status = getStatus ? getStatus(p) : null;
        const info = PHONEME_INFO[p];
        return (
          <button
            key={p}
            type="button"
            onClick={() => onKeyPress(p)}
            title={showHints && info ? `/${p}/ = ${info.label} (as in "${info.example}")` : p}
            aria-label={`Add phoneme ${p}${showHints && info ? `, ${info.label} as in ${info.example}` : ""}${status ? `, ${status}` : ""}`}
            className={`border border-[var(--foreground)] rounded-sm transition-colors duration-150 w-11 h-9 flex flex-col items-center justify-center text-xs leading-none
              ${status === "correct" ? "bg-green-700 text-white" : ""}
              ${status === "present" ? "bg-amber-700 text-white" : ""}
              ${status === "absent" ? "bg-gray-600 text-white" : ""}
              ${!status ? "bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)]" : ""}`}
          >
            {p}
            {showHints && info && (
              <span className="text-[9px] leading-none">{info.label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
