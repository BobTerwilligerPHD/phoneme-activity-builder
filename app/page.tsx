import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h2 className="text-2xl font-bold mb-6 text-[var(--accent-text)]">
        Phoneme Activity Builder
      </h2>

      <p className="text-lg sm:text-xl leading-relaxed mb-10 max-w-2xl">
        This app lets teachers build phoneme-based classroom games for Speech
        Pathology students, either a Wordle-style word guesser or a Word
        Search, both using phoneme symbols instead of normal spelling. You
        build a phoneme word, preview the activity, then download it as a
        single HTML file that runs in any browser.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto">
        <Link
          href="/wordle"
          className="rounded-sm border border-[var(--accent-text)] bg-[var(--accent-fill)] text-[var(--accent-on-fill)] hover:bg-[var(--accent-fill-hover)] transition-colors py-6 px-4 flex flex-col items-center justify-center gap-2 text-center"
        >
          <div className="flex gap-1">
            <span className="w-4 h-4 bg-green-700 border border-[var(--accent-on-fill)]" />
            <span className="w-4 h-4 bg-amber-700 border border-[var(--accent-on-fill)]" />
            <span className="w-4 h-4 bg-gray-600 border border-[var(--accent-on-fill)]" />
            <span className="w-4 h-4 border border-[var(--accent-on-fill)]" />
          </div>
          <span className="text-lg font-bold">Wordle</span>
          <span className="text-xs">Build a phoneme guessing game</span>
        </Link>
        <Link
          href="/word-search"
          className="rounded-sm border border-[var(--accent-text)] bg-[var(--accent-fill)] text-[var(--accent-on-fill)] hover:bg-[var(--accent-fill-hover)] transition-colors py-6 px-4 flex flex-col items-center justify-center gap-2 text-center"
        >
          <div className="grid grid-cols-3 gap-1">
            {["s", "n", "b"].map((p, i) => (
              <span
                key={i}
                className={`w-4 h-4 border border-[var(--accent-on-fill)] flex items-center justify-center text-[8px] font-bold ${
                  i === 1 ? "bg-yellow-300 text-black" : ""
                }`}
              >
                {p}
              </span>
            ))}
          </div>
          <span className="text-lg font-bold">Word Search</span>
          <span className="text-xs">Build a phoneme grid puzzle</span>
        </Link>
      </div>
    </div>
  );
}
