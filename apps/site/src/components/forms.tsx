"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui";
import { PLAYLISTS } from "@/lib/content";
import { cn } from "@/lib/cn";

// ─── Field primitives ────────────────────────────────────────────────────

const labelCls = "mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.13em] text-zinc-500";
const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-brand-500/60";

export function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  optional,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <span className={labelCls}>
        {label} {optional && <span className="text-zinc-600">(optional)</span>}
      </span>
      <input type={type} name={name} required={required} placeholder={placeholder} className={inputCls} />
    </label>
  );
}

export function TextArea({ label, name, required, placeholder, rows = 4 }: { label: string; name: string; required?: boolean; placeholder?: string; rows?: number }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <textarea name={name} required={required} placeholder={placeholder} rows={rows} className={inputCls} />
    </label>
  );
}

export function Select({ label, name, options, required }: { label: string; name: string; options: { value: string; label: string }[]; required?: boolean }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <select name={name} required={required} defaultValue="" className={cn(inputCls, "appearance-none")}>
        <option value="" disabled>
          Select…
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-ink-surface">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Checkbox({ label, name, required }: { label: ReactNode; name: string; required?: boolean }) {
  return (
    <label className="flex items-start gap-3">
      <input type="checkbox" name={name} required={required} className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-white/5 text-brand-500 focus:ring-brand-500/40" />
      <span className="text-[13px] leading-relaxed text-zinc-400">{label}</span>
    </label>
  );
}

// ─── Submit wrapper ──────────────────────────────────────────────────────

type Status = "idle" | "sending" | "ok" | "error";

function useSubmit(endpoint: string) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Something went wrong.");
      setStatus("ok");
      setMessage("Thanks — we've got your submission and will be in touch.");
      form.reset();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return { status, message, onSubmit };
}

function Feedback({ status, message }: { status: Status; message: string }) {
  if (status === "ok") return <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-400">{message}</p>;
  if (status === "error") return <p className="rounded-xl border border-down/20 bg-down/10 px-4 py-3 text-sm text-down">{message}</p>;
  return null;
}

// Honeypot — bots fill it, humans never see it.
function Honeypot() {
  return (
    <input type="text" name="company_website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
  );
}

// ─── Submit Music form ───────────────────────────────────────────────────

export function SubmitMusicForm({ defaultPlaylist }: { defaultPlaylist?: string }) {
  const { status, message, onSubmit } = useSubmit("/api/submit");
  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <Honeypot />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Artist name" name="artistName" required />
        <Field label="Song title" name="songTitle" required />
        <Field label="Release date" name="releaseDate" type="date" />
        <Select label="Release status" name="releaseStatus" options={[{ value: "released", label: "Released" }, { value: "unreleased", label: "Unreleased" }]} />
        <Field label="Song link" name="songLink" type="url" placeholder="https://" />
        <Field label="Private listening link" name="privateLink" type="url" placeholder="https://" optional />
        <Field label="Distributor" name="distributor" optional />
        <Field label="Label" name="label" optional />
        <Field label="Management contact" name="management" optional />
        <Field label="Genre" name="genre" />
        <Field label="Territory focus" name="territory" placeholder="e.g. Romania, Balkans" />
        <Field label="Social links" name="socials" placeholder="Instagram / TikTok / etc." />
        <Select
          label="Playlist target"
          name="playlistTarget"
          options={PLAYLISTS.map((p) => ({ value: p.slug, label: p.name }))}
        />
        <Field label="Contact name" name="contactName" required />
        <Field label="Contact email" name="contactEmail" type="email" required />
        <Field label="Phone number" name="phone" optional />
        <Field label="Rights holder name" name="rightsHolder" required />
      </div>

      <input type="hidden" name="defaultPlaylist" defaultValue={defaultPlaylist ?? ""} />

      <div className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
        <Checkbox name="ownRights" required label="I confirm that I own or control the necessary rights to submit this song." />
        <Checkbox name="allowReview" required label="I allow Hitlist to review this song for playlist consideration." />
        <Checkbox name="allowSocial" label="I allow Hitlist to use parts of this song in Playlist Battle and related social media content, if selected." />
        <Checkbox name="understandNoGuarantee" required label="I understand that submission does not guarantee playlist placement." />
        <Checkbox name="allowContact" required label="I understand that Hitlist may contact me regarding this submission." />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg">
          {status === "sending" ? "Submitting…" : "Submit Your Song"}
        </Button>
        <Feedback status={status} message={message} />
      </div>
    </form>
  );
}

// ─── Contact form ────────────────────────────────────────────────────────

export function ContactForm() {
  const { status, message, onSubmit } = useSubmit("/api/contact");
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Honeypot />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" name="name" required />
        <Field label="Email" name="email" type="email" required />
      </div>
      <Field label="Subject" name="subject" />
      <TextArea label="Message" name="message" required rows={5} />
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg">
          {status === "sending" ? "Sending…" : "Send message"}
        </Button>
        <Feedback status={status} message={message} />
      </div>
    </form>
  );
}

// ─── Demo request form ───────────────────────────────────────────────────

export function DemoForm() {
  const { status, message, onSubmit } = useSubmit("/api/demo");
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Honeypot />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" name="name" required />
        <Field label="Work email" name="email" type="email" required />
        <Field label="Company / label" name="company" />
        <Select
          label="You are a"
          name="role"
          options={[
            { value: "artist", label: "Artist" },
            { value: "label", label: "Label" },
            { value: "manager", label: "Manager" },
            { value: "distributor", label: "Distributor" },
            { value: "radio", label: "Radio / TV" },
            { value: "other", label: "Other" },
          ]}
        />
      </div>
      <TextArea label="What do you want to track?" name="message" rows={4} placeholder="Artists, catalogue size, goals…" />
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg">
          {status === "sending" ? "Sending…" : "Request a demo"}
        </Button>
        <Feedback status={status} message={message} />
      </div>
    </form>
  );
}
