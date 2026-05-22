/**
 * SexeSelect — dropdown client pour definir le sexe d'un membre (admin Bilan).
 * Sauvegarde immediate au changement via setParticipantSexeAction.
 */
"use client";

import { useState, useTransition } from "react";
import { setParticipantSexeAction } from "./actions";

type Sexe = "F" | "M" | "X";

export default function SexeSelect({
  participantId,
  current,
}: {
  participantId: string;
  current: Sexe | null;
}) {
  const [value, setValue] = useState<Sexe | "">(current ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value as Sexe | "";
    setValue(v);
    setSaved(false);
    if (v === "") return; // on ne remet pas a NULL via l'UI
    startTransition(async () => {
      const res = await setParticipantSexeAction(participantId, v);
      if (res.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }
    });
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <select
        value={value}
        onChange={onChange}
        disabled={pending}
        aria-label="Sexe du membre"
        className="text-xs border border-vea-border rounded-md px-1.5 py-1 bg-white text-vea-text disabled:opacity-50 focus:outline-none focus:border-vea-accent"
      >
        <option value="">— Non renseigne</option>
        <option value="F">Fille</option>
        <option value="M">Garcon</option>
        <option value="X">Autre</option>
      </select>
      {pending && <span className="text-[10px] text-vea-text-dim">…</span>}
      {saved && (
        <span className="text-[10px] text-vea-accent font-bold">OK</span>
      )}
    </span>
  );
}
