"use client";

import { useState, useRef } from "react";
import Button from "../components/Button";
import PhonemeKeyboard from "../components/PhonemeKeyboard";
import Panel from "../components/Panel";
import { MAX_PHONEMES, getFeedback, cellClass, buildStandaloneHtml } from "../lib/wordleLogic";

export default function WordlePage() {
  const [targetPhonemes, setTargetPhonemes] = useState([]);
  const [englishWord, setEnglishWord] = useState("");
  const [showHints, setShowHints] = useState(true);
  const [maxGuesses, setMaxGuesses] = useState(6);
  const [stage, setStage] = useState("config");

  const [guesses, setGuesses] = useState([]);
  const [current, setCurrent] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [message, setMessage] = useState("");
  const [shake, setShake] = useState(false);
  const [revealedCols, setRevealedCols] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);
  const revealTimers = useRef([]);

  function addPhoneme(p) {
    if (stage === "config") {
      if (targetPhonemes.length >= MAX_PHONEMES) return;
      setTargetPhonemes((prev) => [...prev, p]);
    } else {
      if (gameOver || isRevealing || current.length >= targetPhonemes.length) return;
      setCurrent((prev) => [...prev, p]);
    }
  }

  function removeLast() {
    if (stage === "config") {
      setTargetPhonemes((prev) => prev.slice(0, -1));
    } else {
      setCurrent((prev) => prev.slice(0, -1));
    }
  }

  function clearWord() {
    setTargetPhonemes([]);
  }

  function generate() {
    if (targetPhonemes.length === 0 || englishWord.trim() === "") return;
    revealTimers.current.forEach(clearTimeout);
    revealTimers.current = [];
    setGuesses([]);
    setCurrent([]);
    setGameOver(false);
    setWon(false);
    setIsRevealing(false);
    setRevealedCols(0);
    setMessage("");
    setStage("preview");
  }

  function backToConfig() {
    setStage("config");
  }

  function submitGuess() {
    if (gameOver || isRevealing) return;
    if (current.length !== targetPhonemes.length) {
      setMessage("Not enough phonemes for this guess.");
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    const newGuesses = [...guesses, current];
    const didWin = current.every((p, i) => p === targetPhonemes[i]);
    setGuesses(newGuesses);
    setCurrent([]);
    setMessage("");

    revealTimers.current.forEach(clearTimeout);
    revealTimers.current = [];
    setRevealedCols(0);
    setIsRevealing(true);

    targetPhonemes.forEach((_, c) => {
      const id = setTimeout(() => setRevealedCols((n) => Math.max(n, c + 1)), c * 200 + 300);
      revealTimers.current.push(id);
    });

    const revealDuration = (targetPhonemes.length - 1) * 200 + 600;
    const finishId = setTimeout(() => {
      setIsRevealing(false);
      if (didWin) {
        setGameOver(true);
        setWon(true);
        setMessage(`Correct! The word was "${englishWord}". Solved in ${newGuesses.length} guess(es).`);
      } else if (newGuesses.length >= maxGuesses) {
        setGameOver(true);
        setMessage(`Out of guesses. The word was /${targetPhonemes.join(" ")}/ (${englishWord}).`);
      }
    }, revealDuration);
    revealTimers.current.push(finishId);
  }

  function keyStatusFor(p) {
    let status = null;
    const relevantGuesses = isRevealing ? guesses.slice(0, -1) : guesses;
    relevantGuesses.forEach((g) => {
      const fb = getFeedback(g, targetPhonemes);
      g.forEach((gp, i) => {
        if (gp !== p) return;
        if (fb[i] === "correct") status = "correct";
        else if (fb[i] === "present" && status !== "correct") status = "present";
        else if (!status) status = "absent";
      });
    });
    return status;
  }

  function downloadHtml() {
    const html = buildStandaloneHtml({ targetPhonemes, englishWord, showHints, maxGuesses });
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "phoneme-wordle-activity.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={`mx-auto px-6 ${stage === "preview" ? "max-w-4xl py-6" : "max-w-3xl py-12"}`}>
      <h2 className="text-2xl font-bold mb-4 text-[var(--accent-text)]">Wordle Builder</h2>

      {stage === "config" && (
        <>
          <p className="mb-6 text-sm text-[var(--foreground)] opacity-70">
            Click the phoneme keys to build the target word, then type the matching
            English word and set the number of guesses students get.
          </p>

          <Panel className="mb-4 min-h-[48px] flex items-center">
            {targetPhonemes.length > 0 ? (
              <span className="font-semibold">/{targetPhonemes.join(" ")}/</span>
            ) : (
              <span className="text-[var(--foreground)] opacity-50">Click phonemes below to build the word</span>
            )}
          </Panel>

          <div className="flex flex-wrap gap-3 mb-6">
            <Button onClick={removeLast}>Remove Last</Button>
            <Button onClick={clearWord}>Clear</Button>
          </div>

          <PhonemeKeyboard onKeyPress={addPhoneme} showHints={showHints} className="mt-4" />

          <div className="mt-8 flex flex-col gap-4 max-w-sm">
            <label className="flex flex-col gap-1">
              <span className="font-semibold text-sm">English word</span>
              <input
                type="text"
                value={englishWord}
                onChange={(e) => setEnglishWord(e.target.value)}
                className="border border-[var(--foreground)] rounded-sm px-3 py-2 bg-[var(--background)] text-[var(--foreground)]"
                placeholder="e.g. bed"
              />
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showHints}
                onChange={(e) => setShowHints(e.target.checked)}
              />
              <span className="text-sm">Show phoneme hints during play</span>
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-semibold text-sm">Number of guesses</span>
              <input
                type="number"
                min={1}
                max={10}
                value={maxGuesses}
                onChange={(e) => {
                  const n = Number(e.target.value) || 1;
                  setMaxGuesses(Math.min(10, Math.max(1, n)));
                }}
                className="border border-[var(--foreground)] rounded-sm px-3 py-2 w-24 bg-[var(--background)] text-[var(--foreground)]"
              />
            </label>
          </div>

          <Button
            size="lg"
            variant="primary"
            onClick={generate}
            disabled={targetPhonemes.length === 0 || englishWord.trim() === ""}
            className="mt-6"
          >
            Generate Preview
          </Button>
          {(targetPhonemes.length === 0 || englishWord.trim() === "") && (
            <p className="mt-2 text-sm text-[var(--foreground)] opacity-70">
              {targetPhonemes.length === 0
                ? "Build a phoneme word first."
                : "Type the matching English word first."}
            </p>
          )}
        </>
      )}

      {stage === "preview" && (
        <>
          <p className="mb-2 text-sm text-[var(--foreground)] opacity-70">
            This is what a student would see. Try it, then download the standalone HTML file.
          </p>

          <div className="flex flex-col md:flex-row gap-6 items-start justify-center">
            <div className="max-w-full overflow-x-auto">
              <div
                className="grid gap-1 w-fit mx-auto"
                style={{ gridTemplateRows: `repeat(${maxGuesses}, 48px)` }}
              >
                {Array.from({ length: maxGuesses }).map((_, r) => {
                  const isLatestGuess = r === guesses.length - 1;
                  const isCurrentRow = r === guesses.length;
                  return (
                    <div
                      key={r}
                      className={`grid gap-1 ${isCurrentRow && shake ? "row-shake" : ""}`}
                      style={{ gridTemplateColumns: `repeat(${targetPhonemes.length}, 48px)` }}
                    >
                      {Array.from({ length: targetPhonemes.length }).map((_, c) => {
                        let status = "empty";
                        let letter = "";
                        if (r < guesses.length) {
                          const revealed = !isLatestGuess || c < revealedCols;
                          status = revealed ? getFeedback(guesses[r], targetPhonemes)[c] : "empty";
                          letter = guesses[r][c];
                        } else if (r === guesses.length) {
                          letter = current[c] || "";
                        }
                        return (
                          <div
                            key={c}
                            className={`border-2 flex items-center justify-center font-bold text-sm ${cellClass(status)} ${
                              isLatestGuess ? "tile-flip" : ""
                            }`}
                            style={isLatestGuess ? { animationDelay: `${c * 200}ms` } : undefined}
                          >
                            {letter}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <PhonemeKeyboard onKeyPress={addPhoneme} showHints={showHints} getStatus={keyStatusFor} />

              <div className="flex flex-wrap gap-3 justify-center">
                <Button disabled={isRevealing} onClick={() => setCurrent((prev) => prev.slice(0, -1))}>Backspace</Button>
                <Button disabled={isRevealing} onClick={submitGuess}>Enter</Button>
              </div>
            </div>
          </div>

          <p
            className={`text-center min-h-[24px] font-semibold mt-2 ${won ? "text-[var(--accent-text)] text-lg" : ""}`}
            role="status"
          >
            {message}
          </p>

          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            <Button onClick={backToConfig}>Edit Setup</Button>
            <Button variant="primary" onClick={downloadHtml}>Download HTML</Button>
          </div>
        </>
      )}
    </div>
  );
}
