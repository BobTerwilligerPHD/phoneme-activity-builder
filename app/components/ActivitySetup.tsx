"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import Panel from "./Panel";
import { buttonClass } from "./Button";
import { wordListRequest as request } from "../lib/client-api";
import type { ActivityDto, ActivityType, Difficulty, WordListDto } from "../lib/client-api";

type ConfigurationDraft = {
  title: string; wordListId: string; difficulty: Difficulty;
  showHints: boolean; includeAnswerKey: boolean; outputFilename: string;
  maxGuesses: string; gridRows: string; gridColumns: string;
};
const defaults = (): ConfigurationDraft => ({ title: "", wordListId: "", difficulty: "EASY",
  showHints: true, includeAnswerKey: false, outputFilename: "", maxGuesses: "6", gridRows: "10", gridColumns: "10" });
function fromActivity(a: ActivityDto): ConfigurationDraft {
  return { title: a.title, wordListId: a.wordListId, difficulty: a.difficulty, showHints: a.showHints,
    includeAnswerKey: a.includeAnswerKey, outputFilename: a.outputFilename ?? "",
    maxGuesses: String(a.maxGuesses ?? 6), gridRows: String(a.gridRows ?? 10), gridColumns: String(a.gridColumns ?? 10) };
}
const inputClass = "border rounded-sm p-2 w-full min-w-0 bg-[var(--background)]";

export default function ActivitySetup({ type, onGenerate, onReset, children }: {
  type: ActivityType;
  onGenerate: (activity: ActivityDto, list: WordListDto) => void;
  onReset: () => void;
  children?: (list: WordListDto | undefined) => ReactNode;
}) {
  const [lists, setLists] = useState<WordListDto[]>([]);
  const [activities, setActivities] = useState<ActivityDto[]>([]);
  const [saved, setSaved] = useState<ActivityDto | null>(null);
  const [draft, setDraft] = useState(defaults);
  const [baseline, setBaseline] = useState(() => JSON.stringify(defaults()));
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const pending = useRef<AbortController | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(draft) !== baseline;
  const list = lists.find(l => l.id === draft.wordListId);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([request<WordListDto[]>("/word-lists", controller.signal), request<ActivityDto[]>("/activities", controller.signal)])
      .then(([wordLists, configs]) => {
        if (controller.signal.aborted) return;
        setLists(wordLists); setActivities(configs.filter(a => a.activityType === type)); setReady(true);
      }).catch(() => { if (!controller.signal.aborted) setError("Unable to load saved content. Please try again."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); pending.current?.abort(); };
  }, [type, retry]);

  function canDiscard() { return !busy && (!dirty || window.confirm("Discard unsaved configuration changes?")); }
  function select(a: ActivityDto | null) {
    if (!canDiscard()) return;
    const next = a ? fromActivity(a) : defaults();
    setSaved(a); setDraft(next); setBaseline(JSON.stringify(next)); setError(""); setMessage(""); onReset(); titleRef.current?.focus();
  }
  async function mutate(remove = false) {
    if (pending.current) return;
    const controller = new AbortController(); pending.current = controller;
    setBusy(true); setError(""); setMessage("");
    try {
      if (remove && saved) {
        await request<void>(`/activities/${saved.id}`, controller.signal, "DELETE");
        if (controller.signal.aborted) return;
        setActivities(current => current.filter(a => a.id !== saved.id));
        setSaved(null); setDraft(defaults()); setBaseline(JSON.stringify(defaults())); onReset();
        setMessage("Configuration deleted.");
      } else {
        const number = (value: string) => value === "" ? null : Number(value);
        const payload = { title: draft.title, wordListId: draft.wordListId, activityType: type,
          difficulty: draft.difficulty, showHints: draft.showHints, includeAnswerKey: draft.includeAnswerKey,
          outputFilename: draft.outputFilename === "" ? null : draft.outputFilename,
          ...(type === "WORDLE" ? { maxGuesses: number(draft.maxGuesses) } : { gridRows: number(draft.gridRows), gridColumns: number(draft.gridColumns) }) };
        const result = await request<ActivityDto>(saved ? `/activities/${saved.id}` : "/activities", controller.signal, saved ? "PATCH" : "POST", payload);
        if (controller.signal.aborted) return;
        setSaved(result); const next = fromActivity(result); setDraft(next); setBaseline(JSON.stringify(next));
        setActivities(current => [result, ...current.filter(a => a.id !== result.id)]);
        setLists(current => current.map(l => l.id === result.wordList.id ? result.wordList : l));
        setMessage("Configuration saved.");
      }
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Unable to save configuration.");
    } finally { if (!controller.signal.aborted) setBusy(false); pending.current = null; }
  }

  return <Panel className="space-y-4 min-w-0">
    <h2 className="text-xl font-semibold">Activity setup</h2>
    <p role="status">{loading ? "Loading saved lists and configurations…" : busy ? "Saving changes…" : message}</p>
    {error && <p role="alert" className="border p-3">{error}</p>}
    {!ready && !loading && <button type="button" className={buttonClass()} onClick={() => { setLoading(true); setError(""); setRetry(n => n + 1); }}>Retry loading</button>}
    <fieldset disabled={busy || !ready} className="space-y-3 min-w-0">
      <legend className="sr-only">Saved configuration</legend>
      <label className="block">Load configuration
        <select className={inputClass} value={saved?.id ?? ""} onChange={e => select(activities.find(a => a.id === e.target.value) ?? null)}>
          <option value="">New configuration</option>
          {activities.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>
      </label>
      {!loading && activities.length === 0 && <p>No saved configurations for this builder yet.</p>}
      <div className="flex gap-2 flex-wrap">
        <button type="button" className={buttonClass()} onClick={() => select(null)}>New configuration</button>
        <button type="button" disabled={!saved} className={buttonClass()} onClick={() => {
          if (canDiscard() && window.confirm(`Delete configuration “${saved?.title}”? Your saved words will remain.`)) void mutate(true);
        }}>Delete configuration</button>
      </div>
    </fieldset>
    <form onSubmit={e => { e.preventDefault(); void mutate(); }}>
      <fieldset disabled={busy || !ready} className="space-y-4 min-w-0">
        <legend className="sr-only">Configuration settings</legend>
        <label className="block">Title (required)<input ref={titleRef} required maxLength={100} className={inputClass} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
        <label className="block">Saved word list
          <select required className={inputClass} value={draft.wordListId} onChange={e => { setDraft({ ...draft, wordListId: e.target.value }); onReset(); }}>
            <option value="">Select a word list</option>
            {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({l.words.length} words)</option>)}
          </select>
        </label>
        {(!list || !list.words.length) && <p>{list ? "This list has no words." : "Choose a saved list to begin."} <Link className="underline" href="/word-lists">Manage word lists</Link></p>}
        <div className="grid sm:grid-cols-2 gap-4">
          <label>Difficulty<select className={inputClass} value={draft.difficulty} onChange={e => {
            const value = e.target.value; if (value === "EASY" || value === "MEDIUM" || value === "HARD") setDraft({ ...draft, difficulty: value });
          }}><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option></select></label>
          {type === "WORDLE" ? <label>Maximum guesses<input required type="number" min={1} max={10} step={1} className={inputClass} value={draft.maxGuesses} onChange={e => setDraft({ ...draft, maxGuesses: e.target.value })} /></label> : <>
            <label>Grid rows<input required type="number" min={5} max={20} step={1} className={inputClass} value={draft.gridRows} onChange={e => setDraft({ ...draft, gridRows: e.target.value })} /></label>
            <label>Grid columns<input required type="number" min={5} max={20} step={1} className={inputClass} value={draft.gridColumns} onChange={e => setDraft({ ...draft, gridColumns: e.target.value })} /></label>
          </>}
        </div>
        <label className="block"><input type="checkbox" checked={draft.showHints} onChange={e => setDraft({ ...draft, showHints: e.target.checked })} /> Show hints during play</label>
        <label className="block"><input type="checkbox" checked={draft.includeAnswerKey} onChange={e => setDraft({ ...draft, includeAnswerKey: e.target.checked })} /> Include a labelled teacher answer key in the HTML</label>
        <label className="block">Output filename (optional)<input maxLength={100} className={inputClass} value={draft.outputFilename} onChange={e => setDraft({ ...draft, outputFilename: e.target.value })} /></label>
        <p className="text-sm">{dirty ? "Unsaved configuration changes. " : ""}Save the configuration before generating. The download uses those validated settings.</p>
        <button type="submit" className={buttonClass({ variant: "primary" })}>Save configuration</button>
      </fieldset>
    </form>
    <fieldset disabled={busy || !ready} className="space-y-3 min-w-0">
      <legend className="sr-only">Generate activity</legend>
      {children?.(list)}
      <button type="button" disabled={!saved || dirty} className={buttonClass({ variant: "primary" })} onClick={() => {
        setError(""); if (!saved || !list) { setError("Select an existing saved word list."); return; }
        try { onGenerate(saved, list); } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to generate activity."); }
      }}>Generate Preview</button>
    </fieldset>
  </Panel>;
}
