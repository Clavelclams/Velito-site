/**
 * CandidatureForm — formulaire de candidature de stage (Client Component).
 *
 * - Avertissement immédiat si les dates touchent une période déjà prise
 *   (calcul dans le navigateur avec periodesEnConflit). L'envoi reste possible.
 * - Case "J'ai moins de 18 ans" : fait apparaître l'email du parent.
 * - Champ piège invisible (site_web) contre les robots, le site n'ayant pas
 *   de captcha sur ses formulaires publics.
 * - Pas de dépôt de CV : demandé par mail après un premier tri (RGPD).
 *
 * Le serveur (actions.ts) revérifie tout : ce composant n'est qu'un confort.
 * [16/10/2026] Créé, sur le modèle de app/prestations/DevisForm.tsx.
 */
"use client";

import { useState, useTransition } from "react";
import { submitCandidatureStageAction } from "./actions";
import { periodesEnConflit, estDateValide, dateEnFrancais } from "@/lib/stages.config";

export default function CandidatureForm({ aujourdhui }: { aujourdhui: string }) {
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [etablissement, setEtablissement] = useState("");
  const [formation, setFormation] = useState("");
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [motivation, setMotivation] = useState("");
  const [mineur, setMineur] = useState(false);
  const [emailParent, setEmailParent] = useState("");
  const [rgpd, setRgpd] = useState(false);
  const [siteWeb, setSiteWeb] = useState(""); // champ piège

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  // [16/10/2026] Le contrôle ne se lance que quand les deux dates sont
  // complètes et dans le bon ordre, sinon il afficherait des faux messages.
  const datesCompletes = estDateValide(debut) && estDateValide(fin);
  const finAvantDebut = datesCompletes && fin < debut;
  const conflits = datesCompletes && !finAvantDebut ? periodesEnConflit({ debut, fin }) : [];

  const isValid =
    prenom.trim() !== "" &&
    nom.trim() !== "" &&
    email.includes("@") &&
    telephone.trim() !== "" &&
    etablissement.trim() !== "" &&
    formation.trim() !== "" &&
    datesCompletes &&
    !finAvantDebut &&
    motivation.trim() !== "" &&
    (!mineur || emailParent.includes("@")) &&
    rgpd;

  function resetForm() {
    setPrenom(""); setNom(""); setEmail(""); setTelephone("");
    setEtablissement(""); setFormation(""); setDebut(""); setFin("");
    setMotivation(""); setMineur(false); setEmailParent(""); setRgpd(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await submitCandidatureStageAction({
        prenom, nom, email, telephone, etablissement, formation,
        stage_debut: debut, stage_fin: fin, motivation,
        mineur, email_parent: mineur ? emailParent : "",
        rgpd_consent: rgpd, site_web: siteWeb,
      });
      if (!r.success) {
        setError(r.error ?? "Erreur d'envoi.");
        return;
      }
      setSuccess(true);
      resetForm();
    });
  }

  const inputClass =
    "w-full bg-white border border-vea-border rounded-lg px-4 py-3 text-vea-text text-base sm:text-sm placeholder-vea-text-dim focus:outline-none focus:border-vea-accent focus:ring-2 focus:ring-vea-accent/15 transition-all";
  const labelClass = "block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5";
  const requis = <span className="text-vea-accent" aria-hidden="true"> *</span>;

  if (success) {
    return (
      <div role="status" className="card-clean p-6 border-emerald-300 bg-emerald-50 text-emerald-800">
        <p className="font-bold mb-1">Candidature envoyée</p>
        <p className="text-sm">
          Merci ! On lit chaque candidature et on te répond par mail. Si ton profil correspond,
          on te demandera ton CV à ce moment-là.
        </p>
        <button type="button" onClick={() => setSuccess(false)} className="mt-4 text-sm font-semibold text-vea-accent hover:underline">
          Envoyer une autre candidature
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-clean p-5 sm:p-6 space-y-5" noValidate>
      {/* Champ piège : caché aux humains (et aux lecteurs d'écran), visible pour un robot */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="site_web">Site web</label>
        <input id="site_web" type="text" tabIndex={-1} autoComplete="off" value={siteWeb} onChange={(e) => setSiteWeb(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="prenom" className={labelClass}>Prénom{requis}</label>
          <input id="prenom" type="text" value={prenom} onChange={(e) => setPrenom(e.target.value.slice(0, 100))} required aria-required="true" maxLength={100} autoComplete="given-name" className={inputClass} />
        </div>
        <div>
          <label htmlFor="nom" className={labelClass}>Nom{requis}</label>
          <input id="nom" type="text" value={nom} onChange={(e) => setNom(e.target.value.slice(0, 100))} required aria-required="true" maxLength={100} autoComplete="family-name" className={inputClass} />
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>Email{requis}</label>
          <input id="email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value.slice(0, 200))} required aria-required="true" maxLength={200} autoComplete="email" className={inputClass} />
        </div>
        <div>
          <label htmlFor="telephone" className={labelClass}>Téléphone{requis}</label>
          <input id="telephone" type="tel" inputMode="tel" value={telephone} onChange={(e) => setTelephone(e.target.value.slice(0, 30))} required aria-required="true" maxLength={30} autoComplete="tel" className={inputClass} placeholder="06 12 34 56 78" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="etablissement" className={labelClass}>Établissement{requis}</label>
          <input id="etablissement" type="text" value={etablissement} onChange={(e) => setEtablissement(e.target.value.slice(0, 200))} required aria-required="true" maxLength={200} className={inputClass} placeholder="Ex : Lycée Édouard Branly" />
        </div>
        <div>
          <label htmlFor="formation" className={labelClass}>Formation et niveau{requis}</label>
          <input id="formation" type="text" value={formation} onChange={(e) => setFormation(e.target.value.slice(0, 200))} required aria-required="true" maxLength={200} className={inputClass} placeholder="Ex : Bac Pro CIEL, 1re ou 3e" />
        </div>
      </div>

      <fieldset>
        <legend className={labelClass}>Dates de stage souhaitées{requis}</legend>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="debut" className="block text-xs text-vea-text-muted mb-1">Du</label>
            <input id="debut" type="date" min={aujourdhui} value={debut} onChange={(e) => setDebut(e.target.value)} required aria-required="true" className={inputClass} />
          </div>
          <div>
            <label htmlFor="fin" className="block text-xs text-vea-text-muted mb-1">Au</label>
            <input id="fin" type="date" min={debut || aujourdhui} value={fin} onChange={(e) => setFin(e.target.value)} required aria-required="true" className={inputClass} />
          </div>
        </div>

        {/* aria-live : un lecteur d'écran annonce le message dès qu'il apparaît */}
        <div aria-live="polite">
          {finAvantDebut && (
            <p className="mt-3 text-sm text-vea-accent">La date de fin est avant la date de début.</p>
          )}
          {conflits.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-bold">Cette période est déjà prise, tu peux quand même proposer d&apos;autres dates.</p>
              <p className="mt-1">
                Déjà pris :{" "}
                {conflits.map((p) => `du ${dateEnFrancais(p.debut)} au ${dateEnFrancais(p.fin)}`).join(", ")}.
                Indique d&apos;autres dates possibles dans ton message.
              </p>
            </div>
          )}
        </div>
      </fieldset>

      <div>
        <label htmlFor="motivation" className={labelClass}>Pourquoi VEA ? (quelques lignes){requis}</label>
        <textarea id="motivation" value={motivation} onChange={(e) => setMotivation(e.target.value.slice(0, 1000))} required aria-required="true" maxLength={1000} rows={4} className={inputClass} placeholder="Ce qui t'intéresse chez nous, ce que tu aimerais apprendre." />
        <p className="mt-1 text-[11px] text-vea-text-dim text-right">{motivation.length} / 1000</p>
      </div>

      <div className="space-y-3">
        <label className="flex items-start gap-3 text-sm text-vea-text cursor-pointer">
          <input type="checkbox" checked={mineur} onChange={(e) => setMineur(e.target.checked)} className="mt-1 w-4 h-4 accent-vea-accent shrink-0" />
          <span>J&apos;ai moins de 18 ans</span>
        </label>
        {mineur && (
          <div>
            <label htmlFor="email_parent" className={labelClass}>Email d&apos;un parent ou du responsable légal{requis}</label>
            <input id="email_parent" type="email" inputMode="email" value={emailParent} onChange={(e) => setEmailParent(e.target.value.slice(0, 200))} required aria-required="true" maxLength={200} className={inputClass} />
            <p className="mt-1 text-xs text-vea-text-dim">On le contacte avant toute convention de stage.</p>
          </div>
        )}
      </div>

      <label className="flex items-start gap-3 text-sm text-vea-text cursor-pointer">
        <input type="checkbox" checked={rgpd} onChange={(e) => setRgpd(e.target.checked)} required aria-required="true" className="mt-1 w-4 h-4 accent-vea-accent shrink-0" />
        <span>J&apos;accepte que VEA utilise ces informations pour étudier ma candidature.{requis}</span>
      </label>

      {error && (
        <div role="alert" className="border border-vea-accent/40 bg-vea-accent-soft rounded-lg px-4 py-3 text-sm text-vea-accent">{error}</div>
      )}

      <button type="submit" disabled={!isValid || isPending} className="btn-primary w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed">
        {isPending ? "Envoi en cours…" : "Envoyer ma candidature"}
      </button>
      {!isValid && (
        <p className="text-[11px] text-vea-text-dim text-center">Remplis tous les champs marqués d&apos;une étoile pour activer l&apos;envoi.</p>
      )}

      {/* Mention RGPD demandée : finalité + durée de conservation */}
      <p className="text-xs text-vea-text-dim leading-relaxed border-t border-vea-border pt-4">
        Tes informations servent uniquement à étudier ta candidature et à te recontacter. Seuls les
        membres du bureau de VEA y ont accès. Elles sont supprimées au plus tard 12 mois après
        l&apos;envoi. On ne te demande pas de CV ici : on te le demandera par mail si ta candidature
        est retenue pour un échange. Pour consulter ou supprimer tes données, écris à{" "}
        <a href="mailto:contact@velito.fr" className="text-vea-accent hover:underline">contact@velito.fr</a>.
      </p>
    </form>
  );
}
