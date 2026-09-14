"use client";

import PhonemeKeyboard from "../components/PhonemeKeyboard";
import { buttonClass } from "../components/Button";

type Props = {
  phonemes: string[];
  symbol: string;
  onChange: (phonemes: string[]) => void;
  onSymbolChange: (symbol: string) => void;
};

export default function PhonemeEditor({ phonemes, symbol, onChange, onSymbolChange }: Props) {
  function addSymbol(value: string) {
    if (!value.trim() || phonemes.length >= 20) return;
    onChange([...phonemes, value.trim()]);
  }

  return <fieldset className="space-y-3 min-w-0">
    <legend className="font-semibold">Ordered phonemes (required)</legend>
    <p id="phoneme-help" className="text-sm">Add one symbol at a time in spoken order. Each button adds one whole phoneme. Up to 20 phonemes.</p>
    <ol aria-label="Phoneme sequence" className="flex flex-wrap gap-2">
      {phonemes.map((phoneme, index) => <li key={index} className="border rounded-sm p-2 flex items-center gap-2">
        <span>{index + 1}. /{phoneme}/</span>
        <button type="button" aria-label={`Remove phoneme ${index + 1}: ${phoneme}`}
          className="underline p-1" onClick={() => onChange(phonemes.filter((_, i) => i !== index))}>Remove</button>
      </li>)}
    </ol>
    <p role="status" className="text-sm">{phonemes.length ? `${phonemes.length} phonemes selected.` : "No phonemes yet. Use the keyboard below."}</p>
    <fieldset disabled={phonemes.length >= 20} className="min-w-0 space-y-3">
      <legend className="sr-only">Add phonemes</legend>
      <PhonemeKeyboard onKeyPress={addSymbol} showHints={true} getStatus={undefined}
        className="!w-full !grid-cols-6 sm:!grid-cols-8 [&>button]:!w-full disabled:opacity-40" />
      <label htmlFor="custom-phoneme" className="block">Another phoneme symbol (optional)</label>
      <div className="flex flex-wrap gap-2">
        <input id="custom-phoneme" value={symbol} aria-describedby="phoneme-help"
          className="border rounded-sm p-2 bg-[var(--background)] min-w-0 flex-1"
          onChange={e => onSymbolChange(e.target.value)} onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); addSymbol(symbol); onSymbolChange(""); }
          }} />
        <button type="button" className={buttonClass()} disabled={!symbol.trim()}
          onClick={() => { addSymbol(symbol); onSymbolChange(""); }}>Add symbol</button>
      </div>
    </fieldset>
  </fieldset>;
}
