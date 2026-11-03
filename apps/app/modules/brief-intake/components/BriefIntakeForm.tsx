"use client";

import * as React from "react";
import { AlertCircle, Check, Clapperboard, Code2, Loader2, Paperclip, X } from "lucide-react";
import { cn } from "@nimia/ui";
import { getUploadSignatureAction, uploadFileToCloudinary } from "@/modules/order";
import {
  BUDGET_RANGES,
  MAX_BRIEF_FILES,
  MIN_DESCRIPTION_LENGTH,
  PROJECT_TYPES,
  type BriefInput,
  type ServiceLine,
} from "../schema";
import { submitBriefOrderAction } from "../state/submit-brief-order-action";
import { BriefSubmitted } from "./BriefSubmitted";

const WWW_URL = process.env.NEXT_PUBLIC_WWW_URL ?? "https://nimiagames.com";
const DRAFT_KEY = "nimia.brief-draft.v1";
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

type FormState = Omit<BriefInput, "agreedToTerms" | "serviceLine"> & {
  serviceLine: ServiceLine | "";
  files: { name: string; url: string }[];
};

const EMPTY: FormState = {
  serviceLine: "",
  projectType: "",
  title: "",
  description: "",
  budget: "",
  deadline: "",
  referenceLink: "",
  files: [],
};

const SERVICE_CARDS: { id: ServiceLine; title: string; body: string; icon: typeof Clapperboard }[] = [
  {
    id: "animation",
    title: "Animation",
    body: "Character animation, music videos, trailers, motion graphics.",
    icon: Clapperboard,
  },
  {
    id: "development",
    title: "Development",
    body: "Websites, web apps, and games.",
    icon: Code2,
  },
];

function loadDraft(): FormState {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<FormState>;
    return { ...EMPTY, ...parsed, files: Array.isArray(parsed.files) ? parsed.files : [] };
  } catch {
    return EMPTY;
  }
}

function saveDraft(state: FormState) {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (private mode etc.) — the form still works.
  }
}

function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 flex items-start gap-1.5 text-sm text-[#ff9a7a]">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-base text-white placeholder:text-white/35 outline-none transition-colors focus:border-[var(--nimia-pink)] focus-visible:ring-2 focus-visible:ring-[var(--nimia-pink)]/40 aria-[invalid=true]:border-[#ff9a7a]";

export function BriefIntakeForm() {
  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [hydrated, setHydrated] = React.useState(false);
  const [agreed, setAgreed] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState<{ orderCode: string; serviceLine: ServiceLine; title: string } | null>(
    null,
  );
  const errorSummaryRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setForm(loadDraft());
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (hydrated && !submitted) saveDraft(form);
  }, [form, hydrated, submitted]);

  function clearError(key: string) {
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearError(key as string);
  }

  function chooseServiceLine(line: ServiceLine) {
    setForm((prev) => ({
      ...prev,
      serviceLine: line,
      projectType: prev.serviceLine === line ? prev.projectType : "",
    }));
    clearError("serviceLine");
  }

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setUploadError(null);
    const incoming = Array.from(list);
    const room = MAX_BRIEF_FILES - form.files.length;
    if (room <= 0) {
      setUploadError(`You can attach up to ${MAX_BRIEF_FILES} files.`);
      return;
    }
    const tooLarge = incoming.filter((file) => file.size > MAX_FILE_SIZE_BYTES);
    const accepted = incoming.filter((file) => file.size <= MAX_FILE_SIZE_BYTES).slice(0, room);
    if (tooLarge.length > 0) {
      setUploadError(`${tooLarge.map((f) => f.name).join(", ")} is over 20 MB and wasn't added.`);
    }
    if (accepted.length === 0) return;

    setUploading(true);
    try {
      const signature = await getUploadSignatureAction();
      if (!signature.success) {
        setUploadError(signature.error);
        return;
      }
      const uploaded: { name: string; url: string }[] = [];
      for (const file of accepted) {
        uploaded.push(await uploadFileToCloudinary(file, signature));
      }
      setForm((prev) => ({ ...prev, files: [...prev.files, ...uploaded] }));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed. Try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || uploading) return;
    setSubmitting(true);
    setFormError(null);

    const result = await submitBriefOrderAction({
      ...form,
      serviceLine: form.serviceLine as ServiceLine,
      agreedToTerms: agreed as true,
    });

    setSubmitting(false);
    if (result.ok) {
      clearDraft();
      setSubmitted({ orderCode: result.orderCode, serviceLine: form.serviceLine as ServiceLine, title: form.title });
      window.scrollTo({ top: 0 });
      return;
    }
    setErrors(result.fieldErrors ?? {});
    setFormError(result.error);
    requestAnimationFrame(() => errorSummaryRef.current?.focus());
  }

  if (submitted) {
    return <BriefSubmitted {...submitted} />;
  }

  const projectTypes = form.serviceLine ? PROJECT_TYPES[form.serviceLine] : [];
  const errorEntries = Object.entries(errors);

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-10" aria-labelledby="brief-heading">
      <div>
        <h1 id="brief-heading" className="nimia-font-display text-3xl font-bold text-white sm:text-4xl">
          Start a project
        </h1>
        <p className="mt-3 max-w-prose text-white/70">
          Tell us what you&apos;re making and roughly what you want to spend. We&apos;ll review it, then agree on
          scope and price with you before anything is billed.
        </p>
      </div>
      {formError ? (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-2xl border border-[#ff9a7a]/50 bg-[#ff9a7a]/10 p-4 outline-none"
        >
          <p className="flex items-center gap-2 font-semibold text-white">
            <AlertCircle className="h-5 w-5 text-[#ff9a7a]" aria-hidden="true" />
            {formError}
          </p>
          {errorEntries.length > 0 ? (
            <ul className="mt-2 list-disc pl-9 text-sm text-white/80">
              {errorEntries.map(([key, message]) => (
                <li key={key}>
                  <a href={`#brief-${key}`} className="text-white underline underline-offset-2 hover:text-[var(--nimia-pink)]">
                    {message}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <fieldset id="brief-serviceLine" tabIndex={-1}>
        <legend className="text-lg font-bold text-white">What do you need?</legend>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {SERVICE_CARDS.map((card) => {
            const selected = form.serviceLine === card.id;
            const Icon = card.icon;
            return (
              <label
                key={card.id}
                className={cn(
                  "flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--nimia-pink)]",
                  selected ? "border-[var(--nimia-pink)] bg-[var(--nimia-pink)]/10" : "border-white/12 bg-white/[0.03] hover:border-white/30",
                )}
              >
                <input
                  type="radio"
                  name="serviceLine"
                  value={card.id}
                  checked={selected}
                  onChange={() => chooseServiceLine(card.id)}
                  className="sr-only"
                />
                <Icon className={cn("mt-0.5 h-6 w-6 shrink-0", selected ? "text-[var(--nimia-pink)]" : "text-white/60")} aria-hidden="true" />
                <span>
                  <span className="block text-lg font-bold text-white">{card.title}</span>
                  <span className="mt-1 block text-sm text-white/65">{card.body}</span>
                </span>
              </label>
            );
          })}
        </div>
        <FieldError id="brief-serviceLine-error" message={errors.serviceLine} />
      </fieldset>

      {form.serviceLine ? (
        <fieldset id="brief-projectType" tabIndex={-1}>
          <legend className="text-lg font-bold text-white">What kind of project?</legend>
          <div className="mt-4 flex flex-wrap gap-2">
            {projectTypes.map((type) => {
              const selected = form.projectType === type.id;
              return (
                <label
                  key={type.id}
                  className={cn(
                    "inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--nimia-pink)]",
                    selected ? "border-[var(--nimia-pink)] bg-[var(--nimia-pink)]/15 text-white" : "border-white/15 text-white/80 hover:border-white/35",
                  )}
                >
                  <input
                    type="radio"
                    name="projectType"
                    value={type.id}
                    checked={selected}
                    onChange={() => update("projectType", type.id)}
                    className="sr-only"
                  />
                  {selected ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                  {type.label}
                </label>
              );
            })}
          </div>
          <FieldError id="brief-projectType-error" message={errors.projectType} />
        </fieldset>
      ) : null}

      <div className="flex flex-col gap-6">
        <div>
          <label htmlFor="brief-title" className="text-lg font-bold text-white">
            Project name
          </label>
          <input
            id="brief-title"
            type="text"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            maxLength={120}
            placeholder="e.g. Launch trailer for our token"
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? "brief-title-error" : undefined}
            className={cn(inputClass, "mt-3")}
          />
          <FieldError id="brief-title-error" message={errors.title} />
        </div>

        <div>
          <label htmlFor="brief-description" className="text-lg font-bold text-white">
            Tell us about it
          </label>
          <p id="brief-description-help" className="mt-1 text-sm text-white/60">
            Goals, audience, style, length or features. Rough notes are fine; we&apos;ll ask follow-up questions.
          </p>
          <textarea
            id="brief-description"
            rows={7}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            maxLength={4000}
            aria-invalid={!!errors.description}
            aria-describedby={cn("brief-description-help", errors.description && "brief-description-error")}
            className={cn(inputClass, "mt-3 resize-y")}
          />
          <p className="mt-1 text-right text-xs text-white/45">
            {form.description.trim().length < MIN_DESCRIPTION_LENGTH
              ? `${MIN_DESCRIPTION_LENGTH - form.description.trim().length} more characters needed`
              : `${form.description.length}/4000`}
          </p>
          <FieldError id="brief-description-error" message={errors.description} />
        </div>
      </div>

      <fieldset id="brief-budget" tabIndex={-1}>
        <legend className="text-lg font-bold text-white">Your budget</legend>
        <p className="mt-1 text-sm text-white/60">
          A starting point for the conversation, not the final price. We agree on scope and price together before
          anything is billed.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-3">
          {BUDGET_RANGES.map((range) => {
            const selected = form.budget === range.id;
            return (
              <label
                key={range.id}
                className={cn(
                  "flex min-h-[48px] cursor-pointer items-center justify-center rounded-xl border px-3 text-center text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--nimia-pink)]",
                  selected ? "border-[var(--nimia-pink)] bg-[var(--nimia-pink)]/15 text-white" : "border-white/15 text-white/80 hover:border-white/35",
                )}
              >
                <input
                  type="radio"
                  name="budget"
                  value={range.id}
                  checked={selected}
                  onChange={() => update("budget", range.id)}
                  className="sr-only"
                />
                {range.label}
              </label>
            );
          })}
        </div>
        <FieldError id="brief-budget-error" message={errors.budget} />
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="brief-deadline" className="font-bold text-white">
            Ideal delivery date <span className="font-normal text-white/50">(optional)</span>
          </label>
          <input
            id="brief-deadline"
            type="date"
            value={form.deadline}
            onChange={(e) => update("deadline", e.target.value)}
            aria-invalid={!!errors.deadline}
            aria-describedby={errors.deadline ? "brief-deadline-error" : undefined}
            className={cn(inputClass, "mt-3")}
          />
          <FieldError id="brief-deadline-error" message={errors.deadline} />
        </div>
        <div>
          <label htmlFor="brief-referenceLink" className="font-bold text-white">
            Reference link <span className="font-normal text-white/50">(optional)</span>
          </label>
          <input
            id="brief-referenceLink"
            type="url"
            inputMode="url"
            value={form.referenceLink}
            onChange={(e) => update("referenceLink", e.target.value)}
            placeholder="https://"
            aria-invalid={!!errors.referenceLink}
            aria-describedby={errors.referenceLink ? "brief-referenceLink-error" : undefined}
            className={cn(inputClass, "mt-3")}
          />
          <FieldError id="brief-referenceLink-error" message={errors.referenceLink} />
        </div>
      </div>

      <div id="brief-files" tabIndex={-1}>
        <p className="font-bold text-white">
          Files <span className="font-normal text-white/50">(optional)</span>
        </p>
        <p className="mt-1 text-sm text-white/60">
          Scripts, sketches, character art, mood boards. Up to {MAX_BRIEF_FILES} files, 20 MB each.
        </p>
        {form.files.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2">
            {form.files.map((file, index) => (
              <li
                key={`${file.url}-${index}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2"
              >
                <span className="flex min-w-0 items-center gap-2 text-sm text-white/85">
                  <Paperclip className="h-4 w-4 shrink-0 text-white/45" aria-hidden="true" />
                  <span className="truncate">{file.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => update("files", form.files.filter((_, i) => i !== index))}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <label
          className={cn(
            "mt-3 inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-white/20 px-5 text-sm font-semibold text-white hover:border-white/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--nimia-pink)]",
            (uploading || form.files.length >= MAX_BRIEF_FILES) && "pointer-events-none opacity-50",
          )}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Paperclip className="h-4 w-4" aria-hidden="true" />}
          {uploading ? "Uploading…" : "Attach files"}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="sr-only"
            disabled={uploading || form.files.length >= MAX_BRIEF_FILES}
            onChange={(e) => void handleFiles(e.target.files)}
          />
        </label>
        <FieldError id="brief-files-error" message={uploadError ?? errors.files} />
      </div>

      <div id="brief-agreedToTerms" tabIndex={-1}>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--nimia-pink)]">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => {
              setAgreed(e.target.checked);
              clearError("agreedToTerms");
            }}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
              agreed ? "border-[var(--nimia-pink)] bg-[var(--nimia-pink)]" : "border-white/30",
            )}
          >
            {agreed ? <Check className="h-3.5 w-3.5 text-black" strokeWidth={3} /> : null}
          </span>
          <span className="text-sm text-white/75">
            I agree to Nimia Studio&apos;s{" "}
            <a
              href={`${WWW_URL}/terms`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-white underline decoration-white/40 underline-offset-2"
            >
              project terms
            </a>
            . Sending this brief doesn&apos;t commit me to a price; the final quote is agreed with the team first.
          </span>
        </label>
        <FieldError id="brief-agreedToTerms-error" message={errors.agreedToTerms} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={submitting || uploading}
          className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[var(--nimia-pink)] px-8 text-base font-bold text-black transition-shadow hover:shadow-[0_0_28px_rgba(255,77,141,0.45)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
          {submitting ? "Sending brief…" : "Send brief"}
        </button>
        <p className="text-sm text-white/55">You&apos;ll get an order number as soon as it&apos;s sent.</p>
      </div>
    </form>
  );
}
