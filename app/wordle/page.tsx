"use client";

import { useEffect, useRef, useState } from "react";
import ActivitySetup from "../components/ActivitySetup";
import PhonemeKeyboard from "../components/PhonemeKeyboard";
import { buttonClass } from "../components/Button";
import { MAX_PHONEMES, getFeedback, cellClass, buildStandaloneHtml, visibleWordHint } from "../lib/wordleLogic";
import type { Feedback, WordleOutput } from "../lib/wordleLogic";
import { downloadHtml } from "../lib/standalone";

export default function WordlePage() {
  const [targetId, setTargetId] = useState("");
  const [output, setOutput] = useState<WordleOutput | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [guesses, setGuesses] = useState<string[][]>([]);
  const [current, setCurrent] = useState<string[]>([]);
  const [other, setOther] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState("");
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealedCols, setRevealedCols] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function addPhoneme(symbol: string) {
    if (!output || gameOver || isRevealing || current.length >= output.targetPhonemes.length) return;
    setCurrent(previous => [...previous, symbol]);
  }
  function submitGuess() {
    if (!output || gameOver || isRevealing) return;
    if (current.length !== output.targetPhonemes.length) { setMessage("Not enough phonemes for this guess."); return; }
    const next = [...guesses, current];
    const won = current.every((p, i) => p === output.targetPhonemes[i]);
    setGuesses(next); setCurrent([]); setMessage(""); setRevealedCols(0); setIsRevealing(true);
    timers.current.forEach(clearTimeout);
    timers.current = output.targetPhonemes.map((_, i) => setTimeout(() => setRevealedCols(i + 1), i * 200 + 300));
    timers.current.push(setTimeout(() => {
      setIsRevealing(false);
      if (won) { setGameOver(true); setMessage(`Correct! The word was "${output.englishWord}". Solved in ${next.length} guess(es).`); }
      else if (next.length >= output.maxGuesses) { setGameOver(true); setMessage(`Out of guesses. The word was /${output.targetPhonemes.join(" ")}/ (${output.englishWord}).`); }
    }, (output.targetPhonemes.length - 1) * 200 + 600));
  }
  function keyStatus(symbol: string): Feedback | null {
    if (!output || output.difficulty === "HARD") return null;
    let status: Feedback | null = null;
    const complete = isRevealing ? guesses.slice(0, -1) : guesses;
    complete.forEach(guess => getFeedback(guess, output.targetPhonemes).forEach((feedback, i) => {
      if (guess[i] !== symbol) return;
      if (feedback === "correct" || (feedback === "present" && status !== "correct") || !status) status = feedback;
    }));
    return status;
  }

  return <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
    <h1 className="text-2xl font-bold text-[var(--accent-text)]">Wordle Builder</h1>
    <div hidden={preview}>
      <ActivitySetup type="WORDLE" onReset={() => setTargetId("")} onGenerate={(activity, list) => {
        const word = list.words.find(w => w.id === targetId);
        if (!word) throw new Error("Select a stored target word from this list.");
        const phonemes = [...word.phonemes].sort((a, b) => a.position - b.position).map(p => p.symbol);
        if (!phonemes.length || phonemes.some(p => !p.trim())) throw new Error("This word has no usable phonemes. Correct it in Word Lists.");
        if (phonemes.length > MAX_PHONEMES) throw new Error(`Wordle supports at most ${MAX_PHONEMES} phonemes. Choose a shorter stored word.`);
        if (activity.maxGuesses === null) throw new Error("Save a valid maximum guess count first.");
        timers.current.forEach(clearTimeout);
        setOutput({ title: activity.title, targetPhonemes: phonemes, englishWord: word.text, hint: word.hint,
          maxGuesses: activity.maxGuesses, showHints: activity.showHints, difficulty: activity.difficulty, includeAnswerKey: activity.includeAnswerKey });
        setFilename(activity.outputFilename); setGuesses([]); setCurrent([]); setOther(""); setGameOver(false);
        setIsRevealing(false); setRevealedCols(0); setMessage(""); setPreview(true);
      }}>{list => <>
        <label className="block">Stored target word
          <select className="border rounded-sm p-2 w-full bg-[var(--background)]" value={targetId} onChange={e => setTargetId(e.target.value)}>
            <option value="">Select a word</option>
            {list?.words.map(word => <option key={word.id} value={word.id}>{word.text} ({word.phonemes.length} phonemes)</option>)}
          </select>
        </label>
        <p className="text-sm">Target selection applies only to this generated output. It is not saved in the activity configuration.</p>
        <p className="text-sm">Easy: first-phoneme support when hints are on. Medium: standard feedback. Hard: use board feedback without keyboard colours.</p>
      </>}</ActivitySetup>
    </div>
    {preview && output && <section aria-label="Wordle preview" className="space-y-4" onKeyDown={e => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) return;
      if (e.key === "Enter") { e.preventDefault(); submitGuess(); }
      if (e.key === "Backspace" && !isRevealing && !gameOver) { e.preventDefault(); setCurrent(p => p.slice(0, -1)); }
    }}>
      <h2 className="text-xl font-semibold break-words">{output.title}</h2>
      <p>Difficulty: {output.difficulty}. Guess the phoneme word in {output.maxGuesses} tries.</p>
      {output.showHints && visibleWordHint(output.hint, output.englishWord) && <p>Hint: {visibleWordHint(output.hint, output.englishWord)}</p>}
      {output.showHints && output.difficulty === "EASY" && <p>First phoneme: /{output.targetPhonemes[0]}/</p>}
      <p className="text-sm">Feedback: green = correct position; amber = present elsewhere; grey = absent.</p>
      <div className="flex flex-col md:flex-row gap-6 items-start min-w-0">
        <div tabIndex={0} aria-label="Guess board" className="max-w-full overflow-x-auto">
          {Array.from({ length: output.maxGuesses }, (_, r) => <div key={r} className="grid gap-1 mb-1" style={{ gridTemplateColumns: `repeat(${output.targetPhonemes.length}, 44px)` }}>
            {output.targetPhonemes.map((_, c) => {
              const status = r < guesses.length && (r < guesses.length - 1 || !isRevealing || c < revealedCols)
                ? getFeedback(guesses[r], output.targetPhonemes)[c] : "empty";
              return <div key={c} aria-label={`Guess ${r + 1}, phoneme ${c + 1}: ${status}`}
                className={`h-11 border-2 flex items-center justify-center font-bold ${cellClass(status)} ${r === guesses.length - 1 ? "tile-flip" : ""}`}>
                {guesses[r]?.[c] ?? (r === guesses.length ? current[c] : "")}
              </div>;
            })}
          </div>)}
        </div>
        <fieldset disabled={gameOver || isRevealing} className="min-w-0 w-full md:flex-1 space-y-3">
          <legend className="sr-only">Enter a guess</legend>
          <PhonemeKeyboard onKeyPress={addPhoneme} showHints={output.showHints} getStatus={keyStatus}
            className="!w-full !grid-cols-6 sm:!grid-cols-8 [&>button]:!w-full" />
          <label className="block">Other phoneme<input className="border rounded-sm p-2 w-full bg-[var(--background)]" value={other} onChange={e => setOther(e.target.value)} /></label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonClass()} disabled={!other.trim()} onClick={() => { addPhoneme(other.trim()); setOther(""); }}>Add symbol</button>
            <button type="button" className={buttonClass()} onClick={() => setCurrent(p => p.slice(0, -1))}>Backspace</button>
            <button type="button" className={buttonClass()} onClick={submitGuess}>Enter</button>
          </div>
        </fieldset>
      </div>
      <p role="status" className="font-semibold">{message}</p>
      {output.includeAnswerKey && <details><summary>Teacher answer key — contains the answer</summary><p>{output.englishWord}: /{output.targetPhonemes.join(" ")}/</p></details>}
      <div className="flex flex-wrap gap-3">
        <button type="button" className={buttonClass()} onClick={() => { timers.current.forEach(clearTimeout); setPreview(false); }}>Edit Setup</button>
        <button type="button" className={buttonClass({ variant: "primary" })} onClick={() => downloadHtml(buildStandaloneHtml(output), filename, "phoneme-wordle-activity")}>Download HTML</button>
      </div>
    </section>}
  </div>;
}
