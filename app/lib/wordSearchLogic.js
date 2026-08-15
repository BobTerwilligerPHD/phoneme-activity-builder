import { PHONEME_INFO } from "./phonemeData";

export const ROWS = 10;
export const COLS = 10;

const DIRECTIONS = [
  { dr: 0, dc: 1 },
  { dr: 0, dc: -1 },
  { dr: 1, dc: 0 },
  { dr: -1, dc: 0 },
  { dr: 1, dc: 1 },
  { dr: 1, dc: -1 },
  { dr: -1, dc: 1 },
  { dr: -1, dc: -1 },
];

export function buildPuzzle(wordEntries) {
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const solutions = [];
  const pool = [];

  wordEntries.forEach((entry) => {
    entry.phonemes.forEach((p) => {
      if (!pool.includes(p)) pool.push(p);
    });
  });

  wordEntries.forEach((entry) => {
    const units = entry.phonemes;
    let placed = false;
    let attempts = 0;

    while (!placed && attempts < 200) {
      attempts++;
      const d = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);

      const endR = r + d.dr * (units.length - 1);
      const endC = c + d.dc * (units.length - 1);
      if (endR < 0 || endR >= ROWS || endC < 0 || endC >= COLS) continue;

      let fits = true;
      for (let i = 0; i < units.length; i++) {
        const cr = r + d.dr * i;
        const cc = c + d.dc * i;
        if (grid[cr][cc] && grid[cr][cc] !== units[i]) {
          fits = false;
          break;
        }
      }
      if (!fits) continue;

      const coords = [];
      for (let i = 0; i < units.length; i++) {
        const cr = r + d.dr * i;
        const cc = c + d.dc * i;
        grid[cr][cc] = units[i];
        coords.push({ r: cr, c: cc });
      }
      solutions.push({ word: entry.word, phonemes: units, coords });
      placed = true;
    }
  });

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!grid[r][c]) {
        grid[r][c] = pool[Math.floor(Math.random() * pool.length)];
      }
    }
  }

  return { grid, solutions };
}

export function getPath(r1, c1, r2, c2) {
  const dr = r2 - r1;
  const dc = c2 - c1;
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  const stepR = dr === 0 ? 0 : dr / steps;
  const stepC = dc === 0 ? 0 : dc / steps;
  const path = [];
  for (let i = 0; i <= steps; i++) {
    path.push({ r: r1 + stepR * i, c: c1 + stepC * i });
  }
  return path;
}

export function buildStandaloneHtml({ grid, solutions, wordEntries }) {
  const config = { grid, solutions, wordEntries };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Phoneme Word Search</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; max-width: 700px; margin: 40px auto; padding: 0 16px; }
  h1 { font-size: 1.4rem; }
  #layout { display: flex; gap: 32px; align-items: flex-start; flex-wrap: wrap; margin: 20px 0; }
  #grid { display: flex; flex-direction: column; gap: 2px; background: #171717; padding: 2px; width: fit-content; user-select: none; }
  .row { display: flex; gap: 2px; }
  .cell { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: bold; background: white; cursor: pointer; }
  .cell.selected { background: #fde047; }
  .cell.found { background: #d1d5db; }
  #wordlist { list-style: none; padding: 0; margin: 0 0 16px 0; }
  #wordlist li.found { text-decoration: line-through; color: #999; }
  #message { min-height: 24px; font-weight: bold; margin-bottom: 10px; }
  button { border: 1px solid black; background: white; padding: 8px 14px; cursor: pointer; }
  .cell:focus-visible { outline: 3px solid #2563eb; outline-offset: -2px; }
</style>
</head>
<body>
<h1>Phoneme Word Search</h1>
<p>Click and drag across the grid to find each word, or tab into the grid and use the arrow keys to move, pressing Enter on the first letter and again on the last letter of a word (press Escape to cancel). Hover a cell to see its English letter equivalent.</p>
<button id="regenerate">Regenerate Layout</button>
<p id="message" role="status" aria-live="polite"></p>
<div id="layout">
  <div id="grid"></div>
  <div>
    <h3>Word List</h3>
    <ul id="wordlist"></ul>
  </div>
</div>
<script>
  var ORIGINAL = ${JSON.stringify(config)};
  var PHONEME_INFO = ${JSON.stringify(PHONEME_INFO)};
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
      return found.indexOf(s.word) !== -1 && s.coords.some(function (co) { return co.r === r && co.c === c; });
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
          cell.title = info ? "/" + phoneme + "/ = " + info.label + ' (as in "' + info.example + '")' : phoneme;
          cell.setAttribute(
            "aria-label",
            "Row " + (r + 1) + ", column " + (c + 1) + ", phoneme /" + phoneme + "/" + (info ? ", " + info.label + " as in " + info.example : "")
          );
          cell.onmousedown = function (e) {
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
      li.textContent = "/" + entry.phonemes.join(" ") + "/";
      if (found.indexOf(entry.word) !== -1) li.className = "found";
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
    if (match && found.indexOf(match.word) === -1) {
      found.push(match.word);
      setMessage(found.length === wordEntries.length ? 'Found "' + match.word + '"! You found all the words.' : 'Found "' + match.word + '"!');
    }
    selection = [];
    renderGrid();
    renderWordList();
  }

  window.addEventListener("mousemove", function (e) {
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

  window.addEventListener("mouseup", function () {
    if (!selecting) return;
    selecting = false;
    finalizeSelection();
  });

  document.getElementById("regenerate").onclick = function () {
    found = [];
    selection = [];
    setMessage("");
    renderGrid();
    renderWordList();
  };

  renderGrid();
  renderWordList();
</script>
</body>
</html>`;
}
