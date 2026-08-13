// Pill quick replies (brief §10) — offered for ambiguous/subjective
// answers, but never the only way to respond: clicking one just sends its
// label as the next message, the exact same path as typing it, so free
// text always still works alongside these.
export interface QuickRepliesProps {
  options: string[];
  onSelect: (option: string) => void;
  disabled?: boolean;
}

export function QuickReplies({ options, onSelect, disabled }: QuickRepliesProps) {
  if (options.length === 0) return null;

  return (
    <div className="nimia-message-in flex flex-wrap gap-2 pl-10">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(option)}
          className="rounded-full border border-[var(--nimia-gold-soft)] bg-transparent px-4 py-1.5 text-sm text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--nimia-gold)] hover:bg-[var(--nimia-gold-soft)] disabled:pointer-events-none disabled:opacity-50"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
