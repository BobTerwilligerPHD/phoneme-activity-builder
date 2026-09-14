"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import ActivitySetup from "../components/ActivitySetup";
import { buttonClass } from "../components/Button";
import { PHONEME_INFO } from "../lib/phonemeData";
import { buildPuzzle, getPath, buildStandaloneHtml } from "../lib/wordSearchLogic";
import type { Coordinate, SearchOutput } from "../lib/wordSearchLogic";
import { downloadHtml } from "../lib/standalone";

export default function WordSearchPage() {
  const [output, setOutput] = useState<SearchOutput | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [found, setFound] = useState<string[]>([]);
  const [selection, setSelection] = useState<Coordinate[]>([]);
  const [focus, setFocus] = useState<Coordinate>({ r: 0, c: 0 });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const start = useRef<Coordinate | null>(null);
  const drag = useRef(false);
  const pathRef = useRef<Coordinate[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);

  function mark(path: Coordinate[]) { pathRef.current = path; setSelection(path); }
  function resetPlay() {
    setFound([]); setMessage(""); setError(""); mark([]); start.current = null; drag.current = false; setFocus({ r: 0, c: 0 });
  }
  function finish(path: Coordinate[]) {
    if (!output) return;
    const match = output.solutions.find(s => s.coords.length === path.length && (
      s.coords.every((co, i) => co.r === path[i].r && co.c === path[i].c) ||
      s.coords.every((co, i) => co.r === path[path.length - 1 - i].r && co.c === path[path.length - 1 - i].c)
    ));
    if (match && !found.includes(match.id)) {
      const next = [...found, match.id]; setFound(next);
      setMessage(`Found "${match.word}"!${next.length === output.wordEntries.length ? " You found all the words." : ""}`);
    } else setMessage("No new word found. Try another selection.");
    mark([]); start.current = null; drag.current = false;
  }
  function movePointer(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current || !start.current) return;
    const el = document.elementFromPoint(event.clientX, event.clientY);
    if (!(el instanceof HTMLElement) || !gridRef.current?.contains(el) || el.dataset.r === undefined) return;
    const path = getPath(start.current.r, start.current.c, Number(el.dataset.r), Number(el.dataset.c));
    if (path) mark(path);
  }
  function keyDown(event: KeyboardEvent<HTMLDivElement>, r: number, c: number) {
    if (!output) return;
    const rows = output.grid.length, columns = output.grid[0].length;
    let nr = r, nc = c;
    if (event.key === "ArrowRight") nc = Math.min(columns - 1, c + 1);
    else if (event.key === "ArrowLeft") nc = Math.max(0, c - 1);
    else if (event.key === "ArrowDown") nr = Math.min(rows - 1, r + 1);
    else if (event.key === "ArrowUp") nr = Math.max(0, r - 1);
    else if (event.key === "Home") nc = 0;
    else if (event.key === "End") nc = columns - 1;
    else if (event.key === "Escape") { event.preventDefault(); start.current = null; mark([]); return; }
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (start.current) finish(getPath(start.current.r, start.current.c, r, c) ?? []);
      else { start.current = { r, c }; mark([{ r, c }]); }
      return;
    } else return;
    event.preventDefault(); setFocus({ r: nr, c: nc });
    gridRef.current?.querySelector<HTMLElement>(`[data-r="${nr}"][data-c="${nc}"]`)?.focus();
  }

  return <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
    <h1 className="text-2xl font-bold text-[var(--accent-text)]">Word Search Builder</h1>
    <div hidden={preview}>
      <ActivitySetup type="WORD_SEARCH" onReset={() => {}} onGenerate={(activity, list) => {
        const entries = list.words.map(word => ({ id: word.id, word: word.text, hint: word.hint,
          phonemes: [...word.phonemes].sort((a, b) => a.position - b.position).map(p => p.symbol) }));
        if (activity.gridRows === null || activity.gridColumns === null) throw new Error("Save valid grid dimensions first.");
        const result = buildPuzzle(entries, activity.gridRows, activity.gridColumns, activity.difficulty);
        if (result.ok === false) throw new Error(result.error);
        setOutput({ ...result.puzzle, wordEntries: entries, title: activity.title,
          showHints: activity.showHints, includeAnswerKey: activity.includeAnswerKey, difficulty: activity.difficulty });
        setFilename(activity.outputFilename); resetPlay(); setPreview(true);
      }}>
        {() => <p className="text-sm">Easy: right and down. Medium: adds diagonal down-right. Hard: all eight directions. Every word in the selected list must fit.</p>}
      </ActivitySetup>
    </div>
    {preview && output && <section aria-label="Word Search preview" className="space-y-4 min-w-0">
      <h2 className="text-xl font-semibold break-words">{output.title}</h2>
      <p>Difficulty: {output.difficulty}. {output.grid.length} rows × {output.grid[0].length} columns.</p>
      <p>Drag from the first to the last phoneme, or use arrow keys and press Enter at each end. Escape cancels a selection.</p>
      {output.showHints && <p>Hover a cell for a phoneme hint. The word list includes phoneme sequences and stored hints.</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonClass()} onClick={() => {
          const result = buildPuzzle(output.wordEntries, output.grid.length, output.grid[0].length, output.difficulty);
          if (result.ok === false) { setError(result.error); return; }
          setOutput({ ...output, ...result.puzzle }); resetPlay();
        }}>Generate New Puzzle</button>
        <button type="button" className={buttonClass()} onClick={() => setPreview(false)}>Edit Setup</button>
        <button type="button" className={buttonClass({ variant: "primary" })} onClick={() => downloadHtml(buildStandaloneHtml(output), filename, "phoneme-word-search-activity")}>Download HTML</button>
      </div>
      {error && <p role="alert">{error}</p>}
      <p role="status" className="font-semibold">{message}</p>
      <div className="flex flex-col md:flex-row gap-6 min-w-0">
        <div className="max-w-full overflow-x-auto min-w-0">
          <div ref={gridRef} role="grid" aria-label="Word search puzzle grid" aria-rowcount={output.grid.length} aria-colcount={output.grid[0].length}
            className="w-fit p-0.5 bg-[var(--foreground)] space-y-0.5 select-none touch-none"
            onPointerMove={movePointer} onPointerUp={() => { if (drag.current) finish(pathRef.current); }}
            onPointerCancel={() => { start.current = null; drag.current = false; mark([]); }}>
            {output.grid.map((row, r) => <div key={r} role="row" className="flex gap-0.5">
              {row.map((symbol, c) => {
                const selected = selection.some(co => co.r === r && co.c === c);
                const solved = output.solutions.some(s => found.includes(s.id) && s.coords.some(co => co.r === r && co.c === c));
                const info = PHONEME_INFO[symbol];
                return <div key={c} role="gridcell" data-r={r} data-c={c} tabIndex={focus.r === r && focus.c === c ? 0 : -1}
                  aria-rowindex={r + 1} aria-colindex={c + 1}
                  aria-selected={selected} aria-label={`Row ${r + 1}, column ${c + 1}, phoneme /${symbol}/${solved ? ", found" : ""}`}
                  title={output.showHints && info ? `${info.label}, as in ${info.example}` : undefined}
                  onFocus={() => setFocus({ r, c })} onKeyDown={e => keyDown(e, r, c)}
                  onPointerDown={e => { e.preventDefault(); start.current = { r, c }; drag.current = true; mark([{ r, c }]); gridRef.current?.setPointerCapture(e.pointerId); }}
                  className={`w-9 h-9 flex shrink-0 items-center justify-center font-bold text-sm cursor-pointer ${selected ? "bg-yellow-300 text-black shadow-[inset_0_0_0_2px_black]" : solved ? "bg-gray-300 text-black" : "bg-[var(--background)] text-[var(--foreground)]"}`}>
                  {symbol}
                </div>;
              })}
            </div>)}
          </div>
        </div>
        <div className="min-w-0 md:max-w-xs">
          <h3 className="font-semibold">Word List</h3>
          <ul className="space-y-2">
            {output.wordEntries.map(entry => <li key={entry.id} className="break-words">
              <span className={found.includes(entry.id) ? "line-through" : ""}>{entry.word}</span>{found.includes(entry.id) ? " — Found" : ""}
              {output.showHints && <><p>/{entry.phonemes.join(" ")}/</p>{entry.hint && <p>{entry.hint}</p>}</>}
            </li>)}
          </ul>
        </div>
      </div>
      {output.includeAnswerKey && <details><summary>Teacher answer key — contains solutions</summary>
        <ul>{output.solutions.map(s => <li key={s.id} className="break-words">{s.word}: {s.coords.map(co => `(${co.r + 1}, ${co.c + 1})`).join(" → ")}</li>)}</ul>
      </details>}
    </section>}
  </div>;
}
