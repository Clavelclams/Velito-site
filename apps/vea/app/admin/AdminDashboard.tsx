/**
 * AdminDashboard — Composant client du dashboard admin VEA
 *
 * 👉 "use client" parce qu'il utilise useState, useEffect, fetch, et des interactions utilisateur.
 *    La page serveur (admin/page.tsx) vérifie le cookie admin_auth AVANT de rendre ce composant.
 *
 * Fonctionnalités :
 * 1. Stats (participants, événements actifs, total)
 * 2. 4 onglets : À venir | Passés | Archivés | Participants
 * 3. Création d'événement (formulaire)
 * 4. Modification d'événement (modal pré-rempli)
 * 5. Archiver / Restaurer un événement
 * 6. Bouton "Importer les événements VEA" (seed)
 * 7. Export CSV des participants
 * 8. Déconnexion
 */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ====== TYPES ======
// 👉 Ces types correspondent aux models Prisma (schema.prisma)

type Participant = {
  id: string;
  prenom: string;
  nom: string;
  telephone: string;
  jeuPrefere: string | null;
  quartier: string | null;
  createdAt: string;
};

type Evenement = {
  id: string;
  titre: string;
  description: string | null;
  date: string;
  lieu: string;
  type: string;
  actif: boolean;
};

// 👉 Les 4 onglets du dashboard
type TabType = "avenir" | "passes" | "archives" | "participants";

interface AdminDashboardProps {
  /** Email du user Supabase connecte (passe depuis le Server Component parent). */
  userEmail?: string;
  /** Stats reelles depuis Supabase (vea.participants + vea.evenements).
   *  20/05/2026 : decompose en 4 chiffres parlants au lieu d'un total trompeur.
   *  - membresAvecCompte : user_id NOT NULL (actifs sur le site)
   *  - preInscritsGuest : pre_inscrit = TRUE (a fusionner)
   *  - oldVeaEnAttente : ni compte ni pre-inscrit (anciens, a faire migrer)
   *  - eventsAVenir : events futurs non annules
   */
  supabaseStats?: {
    membresAvecCompte: number;
    preInscritsGuest: number;
    oldVeaEnAttente: number;
    eventsAVenir: number;
  };
}

export default function AdminDashboard({
  userEmail,
  supabaseStats,
}: AdminDashboardProps = {}) {
  const router = useRouter();

  // ====== STATE ======
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("avenir");
  // 20/05/2026 : seedLoading/seedMessage retires (bouton seed Prisma supprime).

  // 19/05/2026 : creation d'event deplacee vers /admin/evenements
  // (nouveau systeme avec QR + scan + XP). Anciens states supprimes.

  // 👉 State pour le modal de modification
  const [editEvent, setEditEvent] = useState<Evenement | null>(null);
  const [editForm, setEditForm] = useState({
    titre: "",
    description: "",
    date: "",
    lieu: "",
    type: "TOURNOI",
  });

  // ====== CHARGEMENT INITIAL ======
  useEffect(() => {
    // 👉 On fetch les participants et TOUS les événements en parallèle
    fetch("/api/admin/participants")
      .then((r) => {
        if (!r.ok) throw new Error(`Participants API error: ${r.status}`);
        return r.json();
      })
      .then(setParticipants)
      .catch((err) => console.error("[Dashboard]", err));

    // 👉 ?all=true pour avoir passés + futurs + inactifs
    fetch("/api/evenements?all=true")
      .then((r) => {
        if (!r.ok) throw new Error(`Evenements API error: ${r.status}`);
        return r.json();
      })
      .then(setEvenements)
      .catch((err) => console.error("[Dashboard]", err));
  }, []);

  // ====== FILTRAGE DES ÉVÉNEMENTS ======
  const now = new Date();

  // 👉 À venir = date future + actif
  const aVenir = evenements.filter(
    (e) => new Date(e.date) >= now && e.actif
  );
  // 👉 Passés = date passée + actif
  const passes = evenements.filter(
    (e) => new Date(e.date) < now && e.actif
  );
  // 👉 Archivés = actif = false (peu importe la date)
  const archives = evenements.filter((e) => !e.actif);

  // ====== ACTIONS ======

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/login");
  };

  // 19/05/2026 : handleAddEvent supprimee. La creation passe maintenant
  // par /admin/evenements (vea.evenements + QR token automatique).

  // 👉 Archiver ou restaurer un événement (toggle actif)
  const handleToggleActif = async (id: string, actif: boolean) => {
    const res = await fetch(`/api/admin/evenements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif }),
    });
    if (res.ok) {
      const updated = await res.json();
      // 👉 On remplace l'événement modifié dans la liste sans recharger
      setEvenements(evenements.map((e) => (e.id === id ? updated : e)));
    }
  };

  // 👉 Ouvrir le modal de modification avec les données pré-remplies
  const openEditModal = (ev: Evenement) => {
    setEditEvent(ev);
    setEditForm({
      titre: ev.titre,
      description: ev.description || "",
      // 👉 Convertit la date ISO en format datetime-local pour l'input
      date: new Date(ev.date).toISOString().slice(0, 16),
      lieu: ev.lieu,
      type: ev.type,
    });
  };

  // 👉 Sauvegarder les modifications
  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEvent) return;

    const res = await fetch(`/api/admin/evenements/${editEvent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const updated = await res.json();
      setEvenements(evenements.map((ev) => (ev.id === updated.id ? updated : ev)));
      setEditEvent(null);
    }
  };

  // 20/05/2026 : handleSeed retire (events maintenant dans vea.evenements
  // Supabase, gere via /admin/evenements page dediee).

  // 👉 Export CSV des participants
  const exportCSV = () => {
    const headers = [
      "Prénom",
      "Nom",
      "Téléphone",
      "Jeu",
      "Quartier",
      "Date inscription",
    ];
    const rows = participants.map((p) => [
      p.prenom,
      p.nom,
      p.telephone,
      p.jeuPrefere || "",
      p.quartier || "",
      new Date(p.createdAt).toLocaleDateString("fr-FR"),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "participants-vea.csv";
    a.click();
  };

  // ====== RENDU ======
  // 20/05/2026 : fix bug visuel - bg-vea-dark + text-white rendait le titre invisible
  // sur le fond clair reel. Et p-4 sans pt-28 cachait le titre sous la navbar sticky.
  // Aligne avec le style des autres pages admin (/admin/evenements, /admin/heures).
  return (
    <div className="min-h-screen bg-vea-bg pt-28 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
      {/* ===== Header ===== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <span className="badge-red mb-3 inline-block">Admin VEA</span>
          <h1 className="text-3xl sm:text-4xl font-black text-vea-text">Dashboard VEA</h1>
          <p className="text-vea-text-muted text-sm mt-1">
            Administration Velito Esport Amiens
          </p>
        </div>
        {/* 20/05/2026 : bouton seed Prisma + bouton Deconnexion supprimes.
            Le bouton Deconnexion existe deja dans la Navbar globale (en haut a droite),
            inutile de le doubler ici. La fonction handleLogout est conservee pour
            d'eventuels boutons de logout contextuels futurs. */}
      </div>

      {/* 20/05/2026 : message seed retire (variable seedMessage supprimee). */}

      {/* ===== Stats =====
          20/05/2026 : 4 cards decompose pour des chiffres parlants.
          Le total "Participants" precedent etait trompeur (mixait actifs +
          Old VEA seedes + pre-inscrits). */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card-glow p-5 rounded-2xl text-center">
          <div className="text-3xl font-black text-vea-red">
            {supabaseStats?.membresAvecCompte ?? 0}
          </div>
          <p className="text-vea-text-muted text-xs uppercase tracking-widest mt-2">
            Membres actifs
          </p>
          <p className="text-[9px] text-vea-text-dim mt-1 italic">
            Compte VEA cree
          </p>
        </div>
        <div className="card-glow p-5 rounded-2xl text-center">
          <div className="text-3xl font-black text-vea-red">
            {supabaseStats?.oldVeaEnAttente ?? 0}
          </div>
          <p className="text-vea-text-muted text-xs uppercase tracking-widest mt-2">
            Old VEA
          </p>
          <p className="text-[9px] text-vea-text-dim mt-1 italic">
            Anciens, a faire inscrire
          </p>
        </div>
        <div className="card-glow p-5 rounded-2xl text-center">
          <div className="text-3xl font-black text-vea-red">
            {supabaseStats?.preInscritsGuest ?? 0}
          </div>
          <p className="text-vea-text-muted text-xs uppercase tracking-widest mt-2">
            Pre-inscrits
          </p>
          <p className="text-[9px] text-vea-text-dim mt-1 italic">
            Scan guest, a fusionner
          </p>
        </div>
        <div className="card-glow p-5 rounded-2xl text-center">
          <div className="text-3xl font-black text-vea-red">
            {supabaseStats?.eventsAVenir ?? aVenir.length}
          </div>
          <p className="text-vea-text-muted text-xs uppercase tracking-widest mt-2">
            Events à venir
          </p>
          <p className="text-[9px] text-vea-text-dim mt-1 italic">
            Non annules
          </p>
        </div>
      </div>

      {/* ===== Modules administrables (raccourcis vers pages Supabase) =====
          20/05/2026 : nouveau hub admin avec cards cliquables. Remplace les
          onglets Prisma qui affichaient 0 partout (donnees vides). */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Link
          href="/admin/evenements"
          className="card-clean p-5 hover:border-vea-accent transition-all"
        >
          <div className="text-xs uppercase tracking-widest text-vea-accent font-bold mb-1">
            Évènements
          </div>
          <div className="text-lg font-bold text-vea-text mb-2">
            Gérer les events
          </div>
          <p className="text-xs text-vea-text-muted leading-relaxed">
            Créer un event avec QR scan auto. Voir les participants par event,
            cocher / décocher les motifs (jouer / aider / regarder).
          </p>
        </Link>

        <Link
          href="/admin/heures"
          className="card-clean p-5 hover:border-vea-accent transition-all"
        >
          <div className="text-xs uppercase tracking-widest text-vea-accent font-bold mb-1">
            Heures / XP
          </div>
          <div className="text-lg font-bold text-vea-text mb-2">
            Attribuer XP manuel
          </div>
          <p className="text-xs text-vea-text-muted leading-relaxed">
            Ajouter des heures bénévolat ou de l&apos;XP à un participant
            (action urgente, podium, bonus manuel).
          </p>
        </Link>

        <Link
          href="/admin/recompenses"
          className="card-clean p-5 hover:border-vea-accent transition-all"
        >
          <div className="text-xs uppercase tracking-widest text-vea-accent font-bold mb-1">
            Récompenses
          </div>
          <div className="text-lg font-bold text-vea-text mb-2">
            Old VEA à relancer
          </div>
          <p className="text-xs text-vea-text-muted leading-relaxed">
            Liste des anciens qui ont droit à une récompense mais n&apos;ont
            pas (encore) créé leur compte. Relance par email en 1 clic.
          </p>
        </Link>

        {/* 20/05/2026 : nouvelle carte Tournois online. Distinct des events terrain :
            pas d'XP civique, mais palmares visible pour visibilite asso + dossiers de
            subvention (joueur officiel = matiere pour les financeurs esport). */}
        <Link
          href="/admin/tournois"
          className="card-clean p-5 hover:border-vea-accent transition-all"
        >
          <div className="text-xs uppercase tracking-widest text-vea-accent font-bold mb-1">
            Tournois online
          </div>
          <div className="text-lg font-bold text-vea-text mb-2">
            Palmarès compétitif
          </div>
          <p className="text-xs text-vea-text-muted leading-relaxed">
            Ajouter un tournoi (online ou présentiel), lier les joueurs
            représentants VEA. Badge vainqueur attribué automatiquement.
          </p>
        </Link>

        {/* Placeholder section upload documents (Phase 2 — Maya tickets, Alban péages, AG) */}
        <div className="card-clean p-5 border-dashed opacity-70">
          <div className="text-xs uppercase tracking-widest text-vea-text-dim font-bold mb-1">
            Dépôt documents
          </div>
          <div className="text-lg font-bold text-vea-text-muted mb-2">
            À venir
          </div>
          <p className="text-xs text-vea-text-dim leading-relaxed italic">
            Upload de tickets de dépense, justificatifs (péages, transports,
            achats matos), rapports d&apos;AG ciblés. Notification cloche au
            destinataire concerné. Phase 2.
          </p>
        </div>

        {/* Placeholder rapports / réunions */}
        <div className="card-clean p-5 border-dashed opacity-70">
          <div className="text-xs uppercase tracking-widest text-vea-text-dim font-bold mb-1">
            Rapports / Réunions
          </div>
          <div className="text-lg font-bold text-vea-text-muted mb-2">
            À venir
          </div>
          <p className="text-xs text-vea-text-dim leading-relaxed italic">
            Comptes-rendus de réunions, PV d&apos;AG, convocations
            automatiques. Phase 2.
          </p>
        </div>

        {/* Placeholder compta */}
        <div className="card-clean p-5 border-dashed opacity-70">
          <div className="text-xs uppercase tracking-widest text-vea-text-dim font-bold mb-1">
            Compta / Trésorerie
          </div>
          <div className="text-lg font-bold text-vea-text-muted mb-2">
            À venir
          </div>
          <p className="text-xs text-vea-text-dim leading-relaxed italic">
            Vue d&apos;ensemble trésorerie, factures émises / reçues,
            subventions en cours. Phase 3.
          </p>
        </div>
      </div>

      {/* ===== Onglets ===== (20/05/2026 : caches car Prisma vide, redirige vers /admin/evenements) */}
      {false && (
      <>
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: "avenir" as TabType, label: `À venir (${aVenir.length})` },
          { key: "passes" as TabType, label: `Passés (${passes.length})` },
          { key: "archives" as TabType, label: `Archivés (${archives.length})` },
          { key: "participants" as TabType, label: `Participants (${participants.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-xl font-semibold transition-all text-sm ${
              activeTab === tab.key
                ? "bg-vea-red text-white"
                : "border border-vea-border text-vea-text-muted hover:border-vea-purple/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== Contenu : Événements (À venir / Passés / Archivés) ===== */}
      {activeTab !== "participants" && (
        <div>
          {/* Barre d'actions */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-white font-bold">
              {activeTab === "avenir" && "Événements à venir"}
              {activeTab === "passes" && "Événements passés"}
              {activeTab === "archives" && "Événements archivés"}
            </h2>
            {activeTab === "avenir" && (
              // ANCIEN form Prisma supprime le 19/05/2026 : il creait des events
              // SANS QR ni token de scan. Tout passe maintenant par /admin/evenements
              // (vea.evenements Supabase + token UUID + QR auto + scan presence + XP).
              // Ce bouton redirige donc vers le nouveau systeme unifie.
              <Link
                href="/admin/evenements"
                className="bg-vea-red text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-vea-accent-hover transition-all inline-flex items-center gap-2"
              >
                + Ajouter un événement
                <span className="text-[10px] uppercase tracking-widest opacity-80">
                  (avec QR scan)
                </span>
              </Link>
            )}
          </div>

          {/* Liste des événements */}
          <div className="space-y-3">
            {(activeTab === "avenir"
              ? aVenir
              : activeTab === "passes"
                ? passes
                : archives
            ).map((ev) => (
              <div
                key={ev.id}
                className="card-glow p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                {/* Info événement */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">
                    {ev.titre}
                  </p>
                  <p className="text-vea-text-muted text-sm">
                    {new Date(ev.date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}{" "}
                    — {ev.lieu}
                  </p>
                  {ev.description && (
                    <p className="text-vea-text-muted/60 text-xs mt-1 line-clamp-1">
                      {ev.description}
                    </p>
                  )}
                </div>

                {/* Badges + Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="badge-blue text-xs">{ev.type}</span>

                  {/* Bouton Modifier */}
                  <button
                    onClick={() => openEditModal(ev)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-vea-border text-vea-text-muted hover:border-vea-purple/50 hover:text-vea-red transition-all"
                  >
                    Modifier
                  </button>

                  {/* Bouton Archiver / Restaurer */}
                  {ev.actif ? (
                    <button
                      onClick={() => handleToggleActif(ev.id, false)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-vea-border text-vea-text-muted hover:border-red-500 hover:text-red-400 transition-all"
                    >
                      Archiver
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleActif(ev.id, true)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-green-600/50 text-green-400 hover:border-green-500 hover:bg-green-500/10 transition-all"
                    >
                      Restaurer
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* État vide */}
            {activeTab === "avenir" && aVenir.length === 0 && (
              <p className="text-vea-text-muted text-center py-8">
                Aucun événement à venir. Crée-en un ou importe les événements VEA !
              </p>
            )}
            {activeTab === "passes" && passes.length === 0 && (
              <p className="text-vea-text-muted text-center py-8">
                Aucun événement passé.
              </p>
            )}
            {activeTab === "archives" && archives.length === 0 && (
              <p className="text-vea-text-muted text-center py-8">
                Aucun événement archivé.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ===== Contenu : Participants ===== */}
      {activeTab === "participants" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-white font-bold">Participants inscrits</h2>
            <button
              onClick={exportCSV}
              className="border border-vea-red text-vea-red px-4 py-2 rounded-xl text-sm font-semibold hover:bg-vea-red hover:text-white transition-all"
            >
              Exporter CSV
            </button>
          </div>

          <div className="card-glow rounded-2xl overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-vea-border">
                  {[
                    "Prénom",
                    "Nom",
                    "Téléphone",
                    "Jeu",
                    "Quartier",
                    "Inscrit le",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left p-4 text-vea-text-muted text-xs uppercase tracking-widest font-semibold"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {participants.map((p, i) => (
                  <tr
                    key={p.id}
                    className={`border-b border-vea-border/50 ${
                      i % 2 === 0 ? "bg-transparent" : "bg-vea-purple/5"
                    }`}
                  >
                    <td className="p-4 text-white">{p.prenom}</td>
                    <td className="p-4 text-white">{p.nom}</td>
                    <td className="p-4 text-vea-text-muted">{p.telephone}</td>
                    <td className="p-4 text-vea-text-muted">
                      {p.jeuPrefere || "—"}
                    </td>
                    <td className="p-4 text-vea-text-muted">
                      {p.quartier || "—"}
                    </td>
                    <td className="p-4 text-vea-text-muted text-sm">
                      {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))}
                {participants.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-vea-text-muted"
                    >
                      Aucun participant inscrit
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </>
      )}{/* fin {false && (<>...</>)} : section onglets Prisma legacy cachee, remplacee par modules cards plus haut */}

      {/* ===== MODAL DE MODIFICATION ===== */}
      {/* 👉 Ce modal s'affiche par-dessus tout quand editEvent n'est pas null */}
      {editEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay sombre — clic dessus ferme le modal */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setEditEvent(null)}
          />

          {/* Contenu du modal */}
          <form
            onSubmit={handleEditSave}
            className="relative z-10 w-full max-w-lg bg-vea-bg border border-vea-border rounded-2xl p-6 space-y-4"
          >
            <h3 className="text-white font-bold text-lg">
              Modifier l&apos;événement
            </h3>

            <input
              placeholder="Titre *"
              value={editForm.titre}
              onChange={(e) =>
                setEditForm({ ...editForm, titre: e.target.value })
              }
              className="w-full bg-vea-bg border border-vea-border text-white rounded-xl px-4 py-3 outline-none focus:border-vea-purple/50 transition-colors"
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <input
                placeholder="Lieu *"
                value={editForm.lieu}
                onChange={(e) =>
                  setEditForm({ ...editForm, lieu: e.target.value })
                }
                className="bg-vea-bg border border-vea-border text-white rounded-xl px-4 py-3 outline-none focus:border-vea-purple/50 transition-colors"
                required
              />
              <input
                type="datetime-local"
                value={editForm.date}
                onChange={(e) =>
                  setEditForm({ ...editForm, date: e.target.value })
                }
                className="bg-vea-bg border border-vea-border text-white rounded-xl px-4 py-3 outline-none focus:border-vea-purple/50 transition-colors"
                required
              />
            </div>

            <select
              value={editForm.type}
              onChange={(e) =>
                setEditForm({ ...editForm, type: e.target.value })
              }
              className="w-full bg-vea-bg border border-vea-border text-white rounded-xl px-4 py-3 outline-none focus:border-vea-purple/50 transition-colors"
            >
              <option value="TOURNOI">Tournoi</option>
              <option value="ATELIER">Atelier</option>
              <option value="ANIMATION">Animation</option>
              <option value="COMPETITION">Compétition</option>
            </select>

            <textarea
              placeholder="Description"
              value={editForm.description}
              onChange={(e) =>
                setEditForm({ ...editForm, description: e.target.value })
              }
              className="w-full bg-vea-bg border border-vea-border text-white rounded-xl px-4 py-3 outline-none focus:border-vea-purple/50 transition-colors"
              rows={3}
            />

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="bg-vea-red text-white px-6 py-2 rounded-xl font-semibold hover:bg-vea-accent-hover transition-all"
              >
                Enregistrer
              </button>
              <button
                type="button"
                onClick={() => setEditEvent(null)}
                className="border border-vea-border text-vea-text-muted px-6 py-2 rounded-xl hover:border-red-500 hover:text-red-400 transition-all"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}
      </div>{/* fin max-w-6xl mx-auto */}
    </div>
  );
}
