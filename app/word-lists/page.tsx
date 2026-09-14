"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Panel from "../components/Panel";
import { buttonClass } from "../components/Button";
import PhonemeEditor from "./PhonemeEditor";
import { wordListRequest } from "./word-list-api";
import type { WordDto, WordListDto } from "./word-list-api";

type Draft =
  | { kind: "list"; id?: string; name: string; description: string }
  | { kind: "word"; id?: string; listId: string; text: string; hint: string; phonemes: string[]; symbol: string };

const inputClass = "block w-full min-w-0 border rounded-sm p-2 bg-[var(--background)]";

function samePhonemes(draft: string[], original: string[]): boolean {
  return draft.length === original.length && draft.every((symbol, index) => symbol === original[index]);
}

export default function WordListsPage() {
  const [lists, setLists] = useState<WordListDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [baseline, setBaseline] = useState("");
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const mutation = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const selected = lists.find(list => list.id === selectedId);
  const dirty = draft !== null && JSON.stringify(draft) !== baseline;

  useEffect(() => {
    const controller = new AbortController();
    wordListRequest<WordListDto[]>("/word-lists", controller.signal)
      .then(data => {
        if (controller.signal.aborted) return;
        setLists(data);
        setLoaded(true);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Unable to load word lists. Please try again.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); mutation.current?.abort(); };
  }, [reload]);

  function canDiscard() {
    return !busy && (!dirty || window.confirm("Discard the unsaved changes in this form?"));
  }

  function openDraft(next: Draft) {
    if (!canDiscard()) return;
    setDraft(next); setBaseline(JSON.stringify(next)); setError(""); setMessage("");
  }

  async function runMutation(action: (signal: AbortSignal) => Promise<void>) {
    if (mutation.current) return;
    const controller = new AbortController();
    mutation.current = controller;
    setBusy(true); setError(""); setMessage("");
    try { await action(controller.signal); }
    catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Unable to save changes. Please try again.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
      mutation.current = null;
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    if (draft.kind === "word" && draft.symbol.trim()) {
      setError("Choose Add symbol to include your typed phoneme, or clear it before saving."); return;
    }
    void runMutation(async signal => {
      if (draft.kind === "list") {
        const list = await wordListRequest<WordListDto>(draft.id ? `/word-lists/${draft.id}` : "/word-lists",
          signal, draft.id ? "PATCH" : "POST", { name: draft.name, description: draft.description || null });
        if (signal.aborted) return;
        setLists(current => [list, ...current.filter(item => item.id !== list.id)]);
        setSelectedId(list.id);
        setMessage(draft.id ? "List saved." : "List created. You can now add words.");
      } else {
        const original = lists.find(list => list.id === draft.listId)?.words.find(word => word.id === draft.id);
        const includePhonemes = !original || !samePhonemes(draft.phonemes, original.phonemes.map(p => p.symbol));
        const word = await wordListRequest<WordDto>(draft.id ? `/words/${draft.id}` : `/word-lists/${draft.listId}/words`,
          signal, draft.id ? "PATCH" : "POST", {
            text: draft.text, hint: draft.hint || null,
            ...(includePhonemes ? { phonemes: draft.phonemes } : {}),
          });
        if (signal.aborted) return;
        setLists(current => current.map(list => list.id === draft.listId
          ? { ...list, words: draft.id ? list.words.map(item => item.id === word.id ? word : item) : [...list.words, word] } : list));
        setMessage(draft.id ? "Word saved." : "Word added.");
      }
      setDraft(null); heading.current?.focus();
    });
  }

  function deleteItem(list: WordListDto, word?: WordDto) {
    if (!canDiscard()) return;
    const question = word ? `Delete the word “${word.text}” and all its phonemes? This cannot be undone.`
      : `Delete the list “${list.name}”? All its words and related activities will also be removed. This cannot be undone.`;
    if (!window.confirm(question)) return;
    void runMutation(async signal => {
      await wordListRequest<void>(word ? `/words/${word.id}` : `/word-lists/${list.id}`, signal, "DELETE");
      if (signal.aborted) return;
      setLists(current => word ? current.map(item => item.id === list.id
        ? { ...item, words: item.words.filter(w => w.id !== word.id) } : item) : current.filter(item => item.id !== list.id));
      if (!word) setSelectedId(null);
      setDraft(null); setMessage(word ? "Word deleted." : "List deleted."); heading.current?.focus();
    });
  }

  return <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
    <header>
      <h1 className="text-3xl font-bold mb-2">Word Lists</h1>
      <p>Create and organise saved words and their phonemes for your teaching.</p>
    </header>
    <p role="status" aria-live="polite">{loading ? "Loading word lists…" : busy ? "Saving changes…" : message}</p>
    {error && <div role="alert" className="border border-[var(--foreground)] p-3 rounded-sm">
      <p className="font-semibold">Something needs attention</p><p>{error}</p>
      {!loaded && !loading && <button type="button" className={`${buttonClass()} mt-2`} onClick={() => {
        setError(""); setLoading(true); setReload(value => value + 1);
      }}>Retry loading lists</button>}
    </div>}
    <div className="grid md:grid-cols-[minmax(12rem,1fr)_minmax(0,3fr)] gap-5">
      <Panel className="min-w-0 self-start space-y-3">
        <h2 ref={heading} tabIndex={-1} className="text-xl font-semibold">Saved lists</h2>
        <button type="button" className={buttonClass({ variant: "primary" })} disabled={!loaded || busy}
          onClick={() => openDraft({ kind: "list", name: "", description: "" })}>Create list</button>
        {loaded && lists.length === 0 && <p>No saved lists yet. Create your first list to get started.</p>}
        <ul className="space-y-2">
          {lists.map(list => <li key={list.id}>
            <button type="button" disabled={busy} aria-pressed={selectedId === list.id}
              className={`${buttonClass({ active: selectedId === list.id })} w-full text-left break-words`}
              onClick={() => { if (!canDiscard()) return; setSelectedId(list.id); setDraft(null); setError(""); setMessage(""); }}>
              {list.name}<span className="block text-sm">{list.words.length} words{selectedId === list.id ? " · Selected" : ""}</span>
            </button>
          </li>)}
        </ul>
      </Panel>
      <div className="min-w-0 space-y-5">
        {draft && <Panel className="min-w-0">
          <form onSubmit={save}>
            <fieldset disabled={busy} className="space-y-4 min-w-0">
              <legend className="text-xl font-semibold mb-3">{draft.id ? "Edit" : "Create"} {draft.kind === "list" ? "list" : "word"}</legend>
              <p className="text-sm">{dirty ? "Unsaved changes" : "Enter details below. Required fields are marked."}</p>
              {draft.kind === "list" ? <>
                <label className="block" htmlFor="list-name">Name (required)</label>
                <input id="list-name" autoFocus required maxLength={100} className={inputClass} value={draft.name}
                  onChange={e => setDraft({ ...draft, name: e.target.value })} />
                <label className="block" htmlFor="list-description">Description (optional)</label>
                <textarea id="list-description" maxLength={500} rows={3} className={inputClass} value={draft.description}
                  onChange={e => setDraft({ ...draft, description: e.target.value })} />
              </> : <>
                <label className="block" htmlFor="word-text">Written word (required)</label>
                <input id="word-text" autoFocus required maxLength={100} className={inputClass} value={draft.text}
                  onChange={e => setDraft({ ...draft, text: e.target.value })} />
                <label className="block" htmlFor="word-hint">Hint (optional)</label>
                <textarea id="word-hint" maxLength={500} rows={2} className={inputClass} value={draft.hint}
                  onChange={e => setDraft({ ...draft, hint: e.target.value })} />
                <PhonemeEditor phonemes={draft.phonemes} symbol={draft.symbol}
                  onChange={phonemes => setDraft(current => current?.kind === "word" ? { ...current, phonemes } : current)}
                  onSymbolChange={symbol => setDraft(current => current?.kind === "word" ? { ...current, symbol } : current)} />
              </>}
              <div className="flex flex-wrap gap-2">
                <button type="submit" className={buttonClass({ variant: "primary" })}
                  disabled={draft.kind === "word" && draft.phonemes.length === 0}>Save {draft.kind}</button>
                <button type="button" className={buttonClass()} onClick={() => {
                  if (canDiscard()) { setDraft(null); setError(""); heading.current?.focus(); }
                }}>Cancel</button>
              </div>
            </fieldset>
          </form>
        </Panel>}
        {selected ? <Panel className="space-y-4 min-w-0">
          <h2 className="text-2xl font-semibold break-words">{selected.name}</h2>
          <p className="whitespace-pre-wrap break-words">{selected.description || "No description."}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} className={buttonClass()} onClick={() => openDraft({
              kind: "list", id: selected.id, name: selected.name, description: selected.description || "",
            })}>Edit list</button>
            <button type="button" disabled={busy} className={buttonClass()} onClick={() => deleteItem(selected)}>Delete list</button>
          </div>
          <h3 className="text-xl font-semibold">Words ({selected.words.length})</h3>
          <button type="button" disabled={busy} className={buttonClass({ variant: "primary" })} onClick={() => openDraft({
            kind: "word", listId: selected.id, text: "", hint: "", phonemes: [], symbol: "",
          })}>Add word</button>
          {selected.words.length === 0 && <p>This list has no words yet. Add a word and its phonemes.</p>}
          <ul className="space-y-3">
            {selected.words.map(word => <li key={word.id} className="border rounded-sm p-3 space-y-2 min-w-0">
              <h4 className="font-semibold break-words">{word.text}</h4>
              <p className="break-words whitespace-pre-wrap">{word.hint || "No hint."}</p>
              <ol aria-label={`Phonemes for ${word.text}`} className="flex flex-wrap gap-2">
                {word.phonemes.map(p => <li key={p.id} className="border rounded-sm px-2 py-1">/{p.symbol}/</li>)}
              </ol>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} className={buttonClass()} aria-label={`Edit word ${word.text}`}
                  onClick={() => openDraft({ kind: "word", id: word.id, listId: selected.id, text: word.text,
                    hint: word.hint || "", phonemes: word.phonemes.map(p => p.symbol), symbol: "" })}>Edit word</button>
                <button type="button" disabled={busy} className={buttonClass()} aria-label={`Delete word ${word.text}`}
                  onClick={() => deleteItem(selected, word)}>Delete word</button>
              </div>
            </li>)}
          </ul>
        </Panel> : loaded && !draft && <Panel>Select a saved list to view its words, or create a new list.</Panel>}
      </div>
    </div>
  </div>;
}
