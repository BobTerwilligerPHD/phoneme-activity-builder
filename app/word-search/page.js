"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { WORD_LISTS, PHONEME_INFO } from "../lib/phonemeData";
import { ROWS, COLS, buildPuzzle, getPath, buildStandaloneHtml } from "../lib/wordSearchLogic";
import Button from "../components/Button";
import Panel from "../components/Panel";

const FIXED_WORDS = ["bed", "thin", "ship", "win", "fan"];

export default function WordSearchPage() {
  const [wordEntries] = useState(() =>
    WORD_LISTS[3].filter((w) => FIXED_WORDS.includes(w.word))
  );
  const [puzzle, setPuzzle] = useState(() => buildPuzzle(wordEntries));
  const [foundWords, setFoundWords] = useState([]);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [selection, setSelection] = useState([]);
  const [focusPos, setFocusPos] = useState({ r: 0, c: 0 });
  const [message, setMessage] = useState("");

  const gridRef = useRef(null);
  const isSelecting = useRef(false);
  const startCell = useRef(null);

  const regenerate = useCallback(() => {
    setPuzzle(buildPuzzle(wordEntries));
    setFoundWords([]);
    setShowAnswers(false);
    setSelection([]);
    setMessage("");
  }, [wordEntries]);

  function handleCellDown(e, r, c) {
    e.preventDefault();
    isSelecting.current = true;
    startCell.current = { r, c };
    setSelection([{ r, c }]);
  }

  function handleCellEnter(r, c) {
    if (!isSelecting.current || !startCell.current) return;
    const path = getPath(startCell.current.r, startCell.current.c, r, c);
    if (path) setSelection(path);
  }

  function finalizeSelection(sel) {
    if (sel.length === 0) {
      setSelection([]);
      return;
    }

    const matchesCoords = (coords) =>
      coords.length === sel.length &&
      (coords.every((cell, i) => cell.r === sel[i].r && cell.c === sel[i].c) ||
        coords.every((cell, i) => cell.r === sel[sel.length - 1 - i].r && cell.c === sel[sel.length - 1 - i].c));

    const match = puzzle.solutions.find((s) => matchesCoords(s.coords));

    if (match && !foundWords.includes(match.word)) {
      const newFound = [...foundWords, match.word];
      setFoundWords(newFound);
      setMessage(
        newFound.length === wordEntries.length
          ? `Found "${match.word}"! You found all the words.`
          : `Found "${match.word}"!`
      );
    }
    setSelection([]);
  }

  function handleUp() {
    if (!isSelecting.current) return;
    isSelecting.current = false;
    setSelection((sel) => {
      finalizeSelection(sel);
      return sel;
    });
  }

  function handleCellKey(e, r, c) {
    if (e.key === "Escape" && isSelecting.current) {
      isSelecting.current = false;
      startCell.current = null;
      setSelection([]);
      return;
    }
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();

    if (!isSelecting.current) {
      isSelecting.current = true;
      startCell.current = { r, c };
      setSelection([{ r, c }]);
      return;
    }

    isSelecting.current = false;
    const path = getPath(startCell.current.r, startCell.current.c, r, c) || [];
    finalizeSelection(path);
  }

  function handleGridKeyDown(e, r, c) {
    let nr = r;
    let nc = c;
    if (e.key === "ArrowRight") nc = Math.min(COLS - 1, c + 1);
    else if (e.key === "ArrowLeft") nc = Math.max(0, c - 1);
    else if (e.key === "ArrowDown") nr = Math.min(ROWS - 1, r + 1);
    else if (e.key === "ArrowUp") nr = Math.max(0, r - 1);
    else if (e.key === "Home") nc = 0;
    else if (e.key === "End") nc = COLS - 1;
    else {
      handleCellKey(e, r, c);
      return;
    }
    e.preventDefault();
    setFocusPos({ r: nr, c: nc });
    const el = document.querySelector(`[data-r="${nr}"][data-c="${nc}"]`);
    if (el) el.focus();
  }

  function handleMove(e) {
    if (!isSelecting.current || !startCell.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el.dataset.r === undefined) return;
    const r = Number(el.dataset.r);
    const c = Number(el.dataset.c);
    handleCellEnter(r, c);
    setHoverInfo(PHONEME_INFO[puzzle.grid[r][c]] || null);
  }

  useEffect(() => {
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  });

  function isSelected(r, c) {
    return selection.some((s) => s.r === r && s.c === c);
  }

  function isPartOfFoundWord(r, c) {
    return puzzle.solutions.some(
      (s) => foundWords.includes(s.word) && s.coords.some((co) => co.r === r && co.c === c)
    );
  }

  function isSolutionCell(r, c) {
    return puzzle.solutions.some((s) => s.coords.some((co) => co.r === r && co.c === c));
  }

  function downloadHtml() {
    const html = buildStandaloneHtml({ grid: puzzle.grid, solutions: puzzle.solutions, wordEntries });
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "phoneme-word-search-activity.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!puzzle) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <p>Loading puzzle...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h2 className="text-2xl font-bold mb-2 text-[var(--accent-text)]">Word Search Builder</h2>
      <p className="mb-6 text-sm text-[var(--foreground)] opacity-70">
        Each cell is one phoneme. Hover a cell to see its English letter
        equivalent. Click and drag across the grid to find a word, or tab into
        the grid and use the arrow keys to move, pressing Enter on the first
        letter and again on the last letter of a word (press Escape to
        cancel).
      </p>

      <div className="flex flex-wrap gap-3 mb-2">
        <Button onClick={regenerate}>Generate New Puzzle</Button>
        <Button onClick={() => setShowAnswers((s) => !s)}>
          {showAnswers ? "Hide Answers" : "Show Answers"}
        </Button>
        <Button variant="primary" onClick={downloadHtml}>Download HTML</Button>
      </div>

      <p className="mb-4 min-h-[24px] text-sm font-semibold" role="status">
        {message}
      </p>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="overflow-x-auto">
          <div
            ref={gridRef}
            role="grid"
            aria-label="Word search puzzle grid"
            aria-rowcount={ROWS}
            aria-colcount={COLS}
            className="flex flex-col gap-[2px] bg-[var(--foreground)] p-[2px] w-fit select-none"
            onDragStart={(e) => e.preventDefault()}
          >
            {puzzle.grid.map((row, r) => (
              <div key={r} role="row" className="flex gap-[2px]">
                {row.map((phoneme, c) => {
                  const selected = isSelected(r, c);
                  const found = isPartOfFoundWord(r, c);
                  const revealSolution = showAnswers && isSolutionCell(r, c);
                  const info = PHONEME_INFO[phoneme];
                  return (
                    <div
                      key={`${r}-${c}`}
                      data-r={r}
                      data-c={c}
                      role="gridcell"
                      tabIndex={focusPos.r === r && focusPos.c === c ? 0 : -1}
                      aria-selected={selected}
                      aria-rowindex={r + 1}
                      aria-colindex={c + 1}
                      aria-label={`Row ${r + 1}, column ${c + 1}, phoneme /${phoneme}/${
                        info ? `, ${info.label} as in ${info.example}` : ""
                      }`}
                      onMouseDown={(e) => handleCellDown(e, r, c)}
                      onMouseEnter={() => setHoverInfo(info || null)}
                      onMouseLeave={() => setHoverInfo(null)}
                      onFocus={() => {
                        setHoverInfo(info || null);
                        setFocusPos({ r, c });
                      }}
                      onBlur={() => setHoverInfo(null)}
                      onKeyDown={(e) => handleGridKeyDown(e, r, c)}
                      title={
                        info
                          ? `/${phoneme}/ = ${info.label} (as in "${info.example}")`
                          : phoneme
                      }
                      className={`w-9 h-9 flex items-center justify-center text-sm font-bold cursor-pointer transition-colors duration-150
                        ${
                          selected
                            ? "bg-yellow-300 text-black"
                            : found
                            ? "bg-gray-300 text-black"
                            : revealSolution
                            ? "bg-gray-200 text-black"
                            : "bg-[var(--background)] text-[var(--foreground)]"
                        }`}
                    >
                      {phoneme}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-[220px]">
          <h3 className="font-semibold mb-2">Word List</h3>
          <ul className="space-y-1">
            {wordEntries.map((entry) => (
              <li
                key={entry.word}
                className={foundWords.includes(entry.word) ? "line-through text-[var(--foreground)] opacity-50" : ""}
              >
                /{entry.phonemes.join(" ")}/
              </li>
            ))}
          </ul>

          <Panel padding="p-3" className="mt-6 min-h-[60px] text-sm">
            {hoverInfo ? (
              <>
                <p className="font-semibold">{hoverInfo.label}</p>
                <p>as in &quot;{hoverInfo.example}&quot;</p>
              </>
            ) : (
              <p className="text-[var(--foreground)] opacity-50">Hover a cell for a hint</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
