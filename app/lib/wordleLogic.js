import { PHONEME_KEYBOARD, PHONEME_INFO } from "./phonemeData";

export const MAX_PHONEMES = 8;

export function getFeedback(guess, target) {
  const result = Array(guess.length).fill("absent");
  const remaining = {};

  target.forEach((p, i) => {
    if (guess[i] === p) {
      result[i] = "correct";
    } else {
      remaining[p] = (remaining[p] || 0) + 1;
    }
  });

  guess.forEach((p, i) => {
    if (result[i] === "correct") return;
    if (remaining[p] > 0) {
      result[i] = "present";
      remaining[p]--;
    }
  });

  return result;
}

export function cellClass(status) {
  if (status === "correct") return "bg-green-700 text-white border-green-700";
  if (status === "present") return "bg-amber-700 text-white border-amber-700";
  if (status === "absent") return "bg-gray-600 text-white border-gray-600";
  return "bg-[var(--background)] text-[var(--foreground)] border-[var(--foreground)]";
}

export function buildStandaloneHtml({ targetPhonemes, englishWord, showHints, maxGuesses }) {
  const config = { targetPhonemes, englishWord, showHints, maxGuesses };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Phoneme Wordle</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 16px; }
  h1 { font-size: 1.4rem; }
  #layout { display: flex; gap: 32px; align-items: flex-start; justify-content: center; flex-wrap: wrap; margin: 20px 0; }
  #board { display: grid; gap: 4px; }
  .row { display: grid; gap: 4px; grid-auto-flow: column; }
  .cell { width: 48px; height: 48px; border: 2px solid black; display: flex; align-items: center; justify-content: center; font-weight: bold; }
  .correct { background: #15803d; color: white; border-color: #15803d; }
  .present { background: #b45309; color: white; border-color: #b45309; }
  .absent { background: #4b5563; color: white; border-color: #4b5563; }
  #keyboard { display: grid; grid-template-columns: repeat(8, 44px); grid-auto-rows: 36px; gap: 4px; }
  .key { border: 1px solid black; background: white; cursor: pointer; font-size: 0.75rem; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .key.correct { background: #15803d; color: white; }
  .key.present { background: #b45309; color: white; }
  .key.absent { background: #4b5563; color: white; }
  .controls { display: flex; gap: 8px; justify-content: center; margin-top: 10px; }
  .controls button { border: 1px solid black; background: white; padding: 8px 14px; cursor: pointer; }
  #message { text-align: center; min-height: 24px; margin-top: 10px; font-weight: bold; }
  #message.won { color: #4b7a5e; font-size: 1.1rem; }
  .hint { font-size: 0.6rem; display: block; }
  @keyframes tile-flip {
    0% { transform: rotateX(0deg); }
    50% { transform: rotateX(90deg); }
    100% { transform: rotateX(0deg); }
  }
  @keyframes row-shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
  @media (prefers-reduced-motion: no-preference) {
    .cell.flip { animation: tile-flip 0.6s ease-in-out both; }
    .row.shake { animation: row-shake 0.4s; }
  }
</style>
</head>
<body>
<h1>Phoneme Wordle</h1>
<p>Guess the phoneme word in ${maxGuesses} tries. Click the phoneme keys below to build each guess.</p>
<div id="layout">
  <div id="board"></div>
  <div>
    <div id="keyboard"></div>
    <div class="controls">
      <button id="backspace">Backspace</button>
      <button id="enter">Enter</button>
    </div>
  </div>
</div>
<div id="message" role="status" aria-live="polite"></div>
<script>
  var CONFIG = ${JSON.stringify(config)};
  var PHONEME_KEYBOARD = ${JSON.stringify(PHONEME_KEYBOARD)};
  var PHONEME_INFO = ${JSON.stringify(PHONEME_INFO)};

  var target = CONFIG.targetPhonemes;
  var maxGuesses = CONFIG.maxGuesses;
  var guesses = [];
  var current = [];
  var gameOver = false;
  var keyStatus = {};
  var shakeRow = false;
  var animatedRow = -1;
  var isRevealing = false;
  var revealedCols = 0;
  var revealTimers = [];

  function getFeedback(guess, target) {
    var result = target.map(function () { return "absent"; });
    var remaining = {};
    target.forEach(function (p, i) {
      if (guess[i] === p) {
        result[i] = "correct";
      } else {
        remaining[p] = (remaining[p] || 0) + 1;
      }
    });
    guess.forEach(function (p, i) {
      if (result[i] === "correct") return;
      if (remaining[p] > 0) {
        result[i] = "present";
        remaining[p]--;
      }
    });
    return result;
  }

  function renderBoard() {
    var board = document.getElementById("board");
    board.innerHTML = "";
    board.style.gridTemplateRows = "repeat(" + maxGuesses + ", 48px)";
    var latestRow = guesses.length - 1;
    var isNewReveal = latestRow > animatedRow;
    for (var r = 0; r < maxGuesses; r++) {
      var row = document.createElement("div");
      row.className = "row" + (r === guesses.length && shakeRow ? " shake" : "");
      row.style.gridTemplateColumns = "repeat(" + target.length + ", 48px)";
      for (var c = 0; c < target.length; c++) {
        var cell = document.createElement("div");
        cell.className = "cell";
        if (r < guesses.length) {
          cell.textContent = guesses[r][c];
          var colorReady = r !== latestRow || !isRevealing || c < revealedCols;
          if (colorReady) {
            var fb = getFeedback(guesses[r], target);
            cell.classList.add(fb[c]);
          }
          if (r === latestRow && isNewReveal) {
            cell.classList.add("flip");
            cell.style.animationDelay = c * 200 + "ms";
          }
        } else if (r === guesses.length) {
          cell.textContent = current[c] || "";
        }
        row.appendChild(cell);
      }
      board.appendChild(row);
    }
    if (isNewReveal) animatedRow = latestRow;
  }

  function renderKeyboard() {
    var kb = document.getElementById("keyboard");
    kb.innerHTML = "";
    PHONEME_KEYBOARD.flat().forEach(function (p) {
      if (!p) return;
      var key = document.createElement("button");
      key.className = "key " + (keyStatus[p] || "");
      key.title = PHONEME_INFO[p] ? "/" + p + "/ = " + PHONEME_INFO[p].label + ' (as in "' + PHONEME_INFO[p].example + '")' : p;
      key.innerHTML = p + (CONFIG.showHints && PHONEME_INFO[p] ? '<span class="hint">' + PHONEME_INFO[p].label + "</span>" : "");
      key.onclick = function () { addPhoneme(p); };
      kb.appendChild(key);
    });
  }

  function addPhoneme(p) {
    if (gameOver || isRevealing) return;
    if (current.length >= target.length) return;
    current.push(p);
    renderBoard();
  }

  function setMessage(text, won) {
    var el = document.getElementById("message");
    el.textContent = text;
    el.classList.toggle("won", !!won);
  }

  function submitGuess() {
    if (gameOver || isRevealing) return;
    if (current.length !== target.length) {
      setMessage("Not enough phonemes for this guess.");
      shakeRow = true;
      renderBoard();
      setTimeout(function () {
        shakeRow = false;
        renderBoard();
      }, 400);
      return;
    }
    var thisGuess = current;
    guesses.push(thisGuess);
    current = [];
    setMessage("");

    revealTimers.forEach(clearTimeout);
    revealTimers = [];
    revealedCols = 0;
    isRevealing = true;
    renderBoard();

    target.forEach(function (_, c) {
      var id = setTimeout(function () {
        revealedCols = Math.max(revealedCols, c + 1);
        renderBoard();
      }, c * 200 + 300);
      revealTimers.push(id);
    });

    var revealDuration = (target.length - 1) * 200 + 600;
    var finishId = setTimeout(function () {
      isRevealing = false;
      var fb = getFeedback(thisGuess, target);
      fb.forEach(function (status, i) {
        var p = thisGuess[i];
        if (status === "correct") keyStatus[p] = "correct";
        else if (status === "present" && keyStatus[p] !== "correct") keyStatus[p] = "present";
        else if (!keyStatus[p]) keyStatus[p] = "absent";
      });
      var won = thisGuess.every(function (p, i) { return p === target[i]; });
      if (won) {
        gameOver = true;
        setMessage('Correct! The word was "' + CONFIG.englishWord + '". Solved in ' + guesses.length + " guess(es).", true);
      } else if (guesses.length >= maxGuesses) {
        gameOver = true;
        setMessage("Out of guesses. The word was /" + target.join(" ") + "/ (" + CONFIG.englishWord + ").");
      }
      renderBoard();
      renderKeyboard();
    }, revealDuration);
    revealTimers.push(finishId);
  }

  document.getElementById("backspace").onclick = function () {
    if (gameOver || isRevealing) return;
    current.pop();
    renderBoard();
  };
  document.getElementById("enter").onclick = submitGuess;

  renderBoard();
  renderKeyboard();
</script>
</body>
</html>`;
}
