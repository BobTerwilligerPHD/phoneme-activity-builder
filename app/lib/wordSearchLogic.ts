import { PHONEME_INFO } from "./phonemeData";
import type { Difficulty } from "./client-api";
import { escapeHtml, scriptJson } from "./standalone";

export type Coordinate = { r: number; c: number };
export type WordEntry = { id: string; word: string; hint: string | null; phonemes: string[] };
export type Solution = WordEntry & { coords: Coordinate[] };
export type Puzzle = { grid: string[][]; solutions: Solution[] };
export type PuzzleResult = { ok: true; puzzle: Puzzle } | { ok: false; error: string };
export type SearchOutput = Puzzle & { wordEntries: WordEntry[]; title: string; showHints: boolean; includeAnswerKey: boolean; difficulty: Difficulty };

// Self-contained so the same generator can run in the standalone download.
export function buildPuzzle(wordEntries: WordEntry[], rows: number, columns: number, difficulty: Difficulty = "EASY"): PuzzleResult {
  if (!Number.isInteger(rows) || !Number.isInteger(columns) || rows < 5 || rows > 20 || columns < 5 || columns > 20) {
    return { ok: false, error: "Choose grid dimensions between 5 and 20." };
  }
  if (!wordEntries.length) return { ok: false, error: "This saved list has no words. Add words in Word Lists." };
  if (wordEntries.some(entry => !entry.phonemes.length || entry.phonemes.some(p => typeof p !== "string" || !p.trim()))) {
    return { ok: false, error: "Every stored word must have a usable phoneme sequence. Correct this list in Word Lists." };
  }
  if (wordEntries.some(entry => entry.phonemes.length > Math.max(rows, columns))) {
    return { ok: false, error: "A word cannot fit these grid dimensions. Choose a larger grid or a different list." };
  }
  const directions = [{ dr: 0, dc: 1 }, { dr: 1, dc: 0 }];
  if (difficulty !== "EASY") directions.push({ dr: 1, dc: 1 });
  if (difficulty === "HARD") directions.push({ dr: 0, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: -1 }, { dr: 1, dc: -1 }, { dr: -1, dc: 1 });
  const pool = [...new Set(wordEntries.flatMap(entry => entry.phonemes))];
  // Retry the whole layout. Never return a grid with omitted words.
  for (let layout = 0; layout < 30; layout++) {
    const grid: (string | null)[][] = Array.from({ length: rows }, () => Array(columns).fill(null));
    const solutions: Solution[] = [];
    for (const entry of [...wordEntries].sort((a, b) => b.phonemes.length - a.phonemes.length)) {
      for (let attempt = 0; attempt < 300; attempt++) {
        const d = directions[Math.floor(Math.random() * directions.length)];
        const r = Math.floor(Math.random() * rows), c = Math.floor(Math.random() * columns);
        const coords = entry.phonemes.map((_, i) => ({ r: r + d.dr * i, c: c + d.dc * i }));
        if (coords.some((co, i) => co.r < 0 || co.r >= rows || co.c < 0 || co.c >= columns ||
          (grid[co.r][co.c] !== null && grid[co.r][co.c] !== entry.phonemes[i]))) continue;
        if (solutions.some(s => s.coords.length === coords.length && (
          s.coords.every((co, i) => co.r === coords[i].r && co.c === coords[i].c) ||
          s.coords.every((co, i) => co.r === coords[coords.length - 1 - i].r && co.c === coords[coords.length - 1 - i].c)
        ))) continue;
        coords.forEach((co, i) => { grid[co.r][co.c] = entry.phonemes[i]; });
        solutions.push({ ...entry, coords });
        break;
      }
      if (solutions.length === 0 || solutions[solutions.length - 1].id !== entry.id) break;
    }
    if (solutions.length === wordEntries.length) {
      return { ok: true, puzzle: {
        grid: grid.map(row => row.map(p => p ?? pool[Math.floor(Math.random() * pool.length)])),
        solutions,
      } };
    }
  }
  return { ok: false, error: "Could not place every word after 30 layout attempts. Try again, increase the grid size or choose a smaller list." };
}

export function getPath(r1: number, c1: number, r2: number, c2: number): Coordinate[] | null {
  const dr = r2 - r1;
  const dc = c2 - c1;
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  const stepR = dr === 0 ? 0 : dr / steps;
  const stepC = dc === 0 ? 0 : dc / steps;
  const path: Coordinate[] = [];
  for (let i = 0; i <= steps; i++) {
    path.push({ r: r1 + stepR * i, c: c1 + stepC * i });
  }
  return path;
}

export function buildStandaloneHtml(config: SearchOutput): string {
  const { title, difficulty, includeAnswerKey } = config;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; max-width: 700px; margin: 40px auto; padding: 0 16px; overflow-wrap: anywhere; }
  h1 { font-size: 1.4rem; }
  #layout { display: flex; gap: 32px; align-items: flex-start; flex-wrap: wrap; margin: 20px 0; }
  #grid { display: flex; flex-direction: column; gap: 2px; background: #171717; padding: 2px; width: fit-content; user-select: none; touch-action: none; }
  .row { display: flex; gap: 2px; }
  .cell { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: bold; background: white; cursor: pointer; }
  .cell.selected { background: #fde047; box-shadow: inset 0 0 0 3px #111827; }
  .cell.found { background: #d1d5db; }
  #wordlist { list-style: none; padding: 0; margin: 0 0 16px 0; }
  #wordlist li.found { text-decoration: line-through; color: #999; }
  #message { min-height: 24px; font-weight: bold; margin-bottom: 10px; }
  button { border: 1px solid black; background: white; padding: 8px 14px; cursor: pointer; }
  .cell:focus-visible { outline: 3px solid #2563eb; outline-offset: -2px; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p>Difficulty: ${escapeHtml(difficulty)}. ${difficulty === "EASY" ? "Words go right or down." : difficulty === "MEDIUM" ? "Words also go diagonally down-right." : "Words may go in any of eight directions."}</p>
<p>Click and drag across the grid to find each word, or tab into the grid and use the arrow keys to move, pressing Enter on the first letter and again on the last letter of a word (press Escape to cancel). ${config.showHints ? "Hover a cell for a phoneme hint." : ""}</p>
<button type="button" id="regenerate">Regenerate Layout</button>
<p id="message" role="status" aria-live="polite"></p>
<div id="layout">
  <div style="max-width:100%;overflow-x:auto"><div id="grid"></div></div>
  <div>
    <h3>Word List</h3>
    <ul id="wordlist"></ul>
  </div>
</div>
${includeAnswerKey ? '<details><summary>Teacher answer key: contains solutions</summary><ul id="answers"></ul></details>' : ""}
<script>
  var generatePuzzle = ${buildPuzzle.toString()};
  var ORIGINAL = ${scriptJson(config)};
  var PHONEME_INFO = ${scriptJson(PHONEME_INFO)};
  var grid = ORIGINAL.grid;
  var solutions = ORIGINAL.solutions;
  var wordEntries = ORIGINAL.wordEntries;
  var found = [];
  var selecting = false;
  var start = null;
  var selection = [];
  var focusPos = { r: 0, c: 0 };

  function getPath(r1, c1, r2, c2) {
    var dr = r2 - r1, dc = c2 - c1;
    if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
    var steps = Math.max(Math.abs(dr), Math.abs(dc));
    var stepR = dr === 0 ? 0 : dr / steps;
    var stepC = dc === 0 ? 0 : dc / steps;
    var path = [];
    for (var i = 0; i <= steps; i++) path.push({ r: r1 + stepR * i, c: c1 + stepC * i });
    return path;
  }

  function cellEl(r, c) {
    return document.querySelector('[data-r="' + r + '"][data-c="' + c + '"]');
  }

  function isSelected(r, c) {
    return selection.some(function (s) { return s.r === r && s.c === c; });
  }

  function isFoundCell(r, c) {
    return solutions.some(function (s) {
      return found.indexOf(s.id) !== -1 && s.coords.some(function (co) { return co.r === r && co.c === c; });
    });
  }

  function renderGrid() {
    var hadFocus = document.activeElement && document.activeElement.classList && document.activeElement.classList.contains("cell");
    var gridEl = document.getElementById("grid");
    gridEl.setAttribute("role", "grid");
    gridEl.setAttribute("aria-label", "Word search puzzle grid");
    gridEl.setAttribute("aria-rowcount", grid.length);
    gridEl.setAttribute("aria-colcount", grid[0].length);
    gridEl.innerHTML = "";
    for (var r = 0; r < grid.length; r++) {
      var row = document.createElement("div");
      row.className = "row";
      row.setAttribute("role", "row");
      for (var c = 0; c < grid[r].length; c++) {
        (function (r, c) {
          var phoneme = grid[r][c];
          var info = PHONEME_INFO[phoneme];
          var cell = document.createElement("div");
          cell.className = "cell" + (isSelected(r, c) ? " selected" : "") + (isFoundCell(r, c) ? " found" : "");
          cell.textContent = phoneme;
          cell.dataset.r = r;
          cell.dataset.c = c;
          cell.setAttribute("role", "gridcell");
          cell.setAttribute("tabindex", focusPos.r === r && focusPos.c === c ? "0" : "-1");
          cell.setAttribute("aria-selected", isSelected(r, c) ? "true" : "false");
          cell.setAttribute("aria-rowindex", r + 1);
          cell.setAttribute("aria-colindex", c + 1);
          cell.title = ORIGINAL.showHints && info ? "/" + phoneme + "/ = " + info.label + ' (as in "' + info.example + '")' : phoneme;
          cell.setAttribute(
            "aria-label",
            "Row " + (r + 1) + ", column " + (c + 1) + ", phoneme /" + phoneme + "/" + (ORIGINAL.showHints && info ? ", " + info.label + " as in " + info.example : "")
          );
          cell.onpointerdown = function (e) {
            e.preventDefault();
            selecting = true;
            start = { r: r, c: c };
            selection = [{ r: r, c: c }];
            renderGrid();
          };
          cell.onfocus = function () {
            focusPos = { r: r, c: c };
          };
          cell.onkeydown = function (e) {
            handleCellKeyDown(e, r, c);
          };
          row.appendChild(cell);
        })(r, c);
      }
      gridEl.appendChild(row);
    }
    if (hadFocus) {
      var focused = cellEl(focusPos.r, focusPos.c);
      if (focused) focused.focus();
    }
  }

  function moveFocus(nr, nc) {
    var old = cellEl(focusPos.r, focusPos.c);
    if (old) old.setAttribute("tabindex", "-1");
    focusPos = { r: nr, c: nc };
    var next = cellEl(nr, nc);
    if (next) {
      next.setAttribute("tabindex", "0");
      next.focus();
    }
  }

  function handleCellKeyDown(e, r, c) {
    var maxR = grid.length - 1;
    var maxC = grid[0].length - 1;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Home" || e.key === "End") {
      e.preventDefault();
      var nr = r, nc = c;
      if (e.key === "ArrowRight") nc = Math.min(maxC, c + 1);
      else if (e.key === "ArrowLeft") nc = Math.max(0, c - 1);
      else if (e.key === "ArrowDown") nr = Math.min(maxR, r + 1);
      else if (e.key === "ArrowUp") nr = Math.max(0, r - 1);
      else if (e.key === "Home") nc = 0;
      else if (e.key === "End") nc = maxC;
      moveFocus(nr, nc);
      return;
    }
    if (e.key === "Escape" && selecting) {
      selecting = false;
      start = null;
      selection = [];
      renderGrid();
      return;
    }
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    if (!selecting) {
      selecting = true;
      start = { r: r, c: c };
      selection = [{ r: r, c: c }];
      renderGrid();
      return;
    }
    selecting = false;
    selection = getPath(start.r, start.c, r, c) || [];
    finalizeSelection();
  }

  function renderWordList() {
    var list = document.getElementById("wordlist");
    list.innerHTML = "";
    wordEntries.forEach(function (entry) {
      var li = document.createElement("li");
      li.textContent = entry.word + (ORIGINAL.showHints ? " /" + entry.phonemes.join(" ") + "/" + (entry.hint ? " - " + entry.hint : "") : "");
      if (found.indexOf(entry.id) !== -1) li.className = "found";
      list.appendChild(li);
    });
  }

  function setMessage(text) {
    document.getElementById("message").textContent = text;
  }

  function finalizeSelection() {
    if (selection.length === 0) return;
    var match = solutions.filter(function (s) { return s.coords.length === selection.length; }).find(function (s) {
      var forward = s.coords.every(function (cell, i) { return cell.r === selection[i].r && cell.c === selection[i].c; });
      var backward = s.coords.every(function (cell, i) { return cell.r === selection[selection.length - 1 - i].r && cell.c === selection[selection.length - 1 - i].c; });
      return forward || backward;
    });
    if (match && found.indexOf(match.id) === -1) {
      found.push(match.id);
      setMessage(found.length === wordEntries.length ? 'Found "' + match.word + '"! You found all the words.' : 'Found "' + match.word + '"!');
    }
    selection = [];
    renderGrid();
    renderWordList();
  }

  window.addEventListener("pointermove", function (e) {
    if (!selecting || !start) return;
    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el.dataset.r === undefined) return;
    var r = Number(el.dataset.r), c = Number(el.dataset.c);
    var path = getPath(start.r, start.c, r, c);
    if (path) {
      selection = path;
      renderGrid();
    }
  });

  window.addEventListener("pointerup", function () {
    if (!selecting) return;
    selecting = false;
    finalizeSelection();
  });

  document.getElementById("regenerate").onclick = function () {
    var result = generatePuzzle(wordEntries, grid.length, grid[0].length, ORIGINAL.difficulty);
    if (!result.ok) { setMessage(result.error); return; }
    grid = result.puzzle.grid; solutions = result.puzzle.solutions;
    found = [];
    selection = [];
    selecting = false;
    start = null;
    focusPos = { r: 0, c: 0 };
    setMessage("");
    renderGrid();
    renderWordList(); renderAnswers();
  };

  function renderAnswers() {
    var answers = document.getElementById("answers"); if (!answers) return;
    answers.textContent = ""; solutions.forEach(function(s) { var li = document.createElement("li"); li.textContent = s.word + ": " + s.coords.map(function(co) { return "(" + (co.r + 1) + ", " + (co.c + 1) + ")"; }).join(" → "); answers.appendChild(li); });
  }
  renderAnswers();
  renderGrid();
  renderWordList();
</script>
</body>
</html>`;
}
