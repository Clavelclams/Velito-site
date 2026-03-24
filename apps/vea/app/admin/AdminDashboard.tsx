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

export default function AdminDashboard() {
  const router = useRouter();

  // ====== STATE ======
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("avenir");
  const [showForm, setShowForm] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedMessage, setSeedMessage] = useState("");

  // 👉 State pour le formulaire de création
  const [newEvent, setNewEvent] = useState({
    titre: "",
    description: "",
    date: "",
    lieu: "",
    type: "TOURNOI",
    actif: true,
  });

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

  // 👉 Créer un événement
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/evenements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newEvent),
    });
    if (res.ok) {
      const event = await res.json();
      setEvenements([event, ...evenements]);
      setShowForm(false);
      setNewEvent({
        titre: "",
        description: "",
        date: "",
        lieu: "",
        type: "TOURNOI",
        actif: true,
      });
    }
  };

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

  // 👉 Importer les événements historiques VEA
  const handleSeed = async () => {
    setSeedLoading(true);
    setSeedMessage("");
    try {
      const res = await fetch("/api/admin/evenements/seed", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSeedMessage(data.message);
        // 👉 Recharge tous les événements après le seed
        const evRes = await fetch("/api/evenements?all=true");
        if (evRes.ok) {
          const evData = await evRes.json();
          setEvenements(evData);
        }
      } else {
        setSeedMessage(data.error || "Erreur lors de l'import");
      }
    } catch {
      setSeedMessage("Erreur réseau");
    }
    setSeedLoading(false);
  };

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
  return (
    <div className="min-h-screen bg-[#060d1f] p-4 md:p-6">
      {/* ===== Header ===== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Dashboard VEA</h1>
          <p className="text-[#7a8fa6] text-sm mt-1">
            Administration Velito Esport Amiens
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 👉 Bouton seed — importe les événements historiques */}
          <button
            onClick={handleSeed}
            disabled={seedLoading}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          >
            {seedLoading ? "Import..." : "Importer événements VEA"}
          </button>
          <button
            onClick={handleLogout}
            className="border border-[#1e3a5f] text-[#7a8fa6] hover:border-red-500 hover:text-red-400 px-4 py-2 rounded-xl transition-all text-sm"
          >
            Déconnexion
          </button>
        </div>
      </div>

      {/* ===== Message seed ===== */}
      {seedMessage && (
        <div className="mb-6 p-4 rounded-xl bg-[#0a1628] border border-[#1e3a5f] text-[#7a8fa6] text-sm">
          {seedMessage}
        </div>
      )}

      {/* ===== Stats ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card-glow p-5 rounded-2xl text-center">
          <div className="text-3xl font-black text-[#4d9fff]">
            {participants.length}
          </div>
          <p className="text-[#7a8fa6] text-xs uppercase tracking-widest mt-2">
            Participants
          </p>
        </div>
        <div className="card-glow p-5 rounded-2xl text-center">
          <div className="text-3xl font-black text-[#4d9fff]">
            {aVenir.length}
          </div>
          <p className="text-[#7a8fa6] text-xs uppercase tracking-widest mt-2">
            À venir
          </p>
        </div>
        <div className="card-glow p-5 rounded-2xl text-center">
          <div className="text-3xl font-black text-[#4d9fff]">
            {passes.length}
          </div>
          <p className="text-[#7a8fa6] text-xs uppercase tracking-widest mt-2">
            Passés
          </p>
        </div>
        <div className="card-glow p-5 rounded-2xl text-center">
          <div className="text-3xl font-black text-[#4d9fff]">
            {evenements.length}
          </div>
          <p className="text-[#7a8fa6] text-xs uppercase tracking-widest mt-2">
            Total
          </p>
        </div>
      </div>

      {/* ===== Onglets ===== */}
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
                ? "bg-[#4d9fff] text-white"
                : "border border-[#1e3a5f] text-[#7a8fa6] hover:border-[#4d9fff]"
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
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-[#4d9fff] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#60b4ff] transition-all"
              >
                + Ajouter un événement
              </button>
            )}
          </div>

          {/* Formulaire de création */}
          {showForm && activeTab === "avenir" && (
            <form
              onSubmit={handleAddEvent}
              className="card-glow p-6 rounded-2xl mb-6 grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <input
                placeholder="Titre *"
                value={newEvent.titre}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, titre: e.target.value })
                }
                className="col-span-1 md:col-span-2 bg-[#0a1628] border border-[#1e3a5f] text-white rounded-xl px-4 py-3 outline-none focus:border-[#4d9fff] transition-colors"
                required
              />
              <input
                placeholder="Lieu *"
                value={newEvent.lieu}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, lieu: e.target.value })
                }
                className="bg-[#0a1628] border border-[#1e3a5f] text-white rounded-xl px-4 py-3 outline-none focus:border-[#4d9fff] transition-colors"
                required
              />
              <input
                type="datetime-local"
                value={newEvent.date}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, date: e.target.value })
                }
                className="bg-[#0a1628] border border-[#1e3a5f] text-white rounded-xl px-4 py-3 outline-none focus:border-[#4d9fff] transition-colors"
                required
              />
              <select
                value={newEvent.type}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, type: e.target.value })
                }
                className="bg-[#0a1628] border border-[#1e3a5f] text-white rounded-xl px-4 py-3 outline-none focus:border-[#4d9fff] transition-colors"
              >
                <option value="TOURNOI">Tournoi</option>
                <option value="ATELIER">Atelier</option>
                <option value="ANIMATION">Animation</option>
                <option value="COMPETITION">Compétition</option>
              </select>
              <textarea
                placeholder="Description (optionnel)"
                value={newEvent.description}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, description: e.target.value })
                }
                className="bg-[#0a1628] border border-[#1e3a5f] text-white rounded-xl px-4 py-3 outline-none focus:border-[#4d9fff] transition-colors"
              />
              <div className="col-span-1 md:col-span-2 flex gap-3">
                <button
                  type="submit"
                  className="bg-[#4d9fff] text-white px-6 py-2 rounded-xl font-semibold hover:bg-[#60b4ff] transition-all"
                >
                  Créer l&apos;événement
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="border border-[#1e3a5f] text-[#7a8fa6] px-6 py-2 rounded-xl hover:border-red-500 hover:text-red-400 transition-all"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}

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
                  <p className="text-[#7a8fa6] text-sm">
                    {new Date(ev.date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}{" "}
                    — {ev.lieu}
                  </p>
                  {ev.description && (
                    <p className="text-[#4a5568] text-xs mt-1 line-clamp-1">
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
                    className="text-xs px-3 py-1.5 rounded-lg border border-[#1e3a5f] text-[#7a8fa6] hover:border-[#4d9fff] hover:text-[#4d9fff] transition-all"
                  >
                    Modifier
                  </button>

                  {/* Bouton Archiver / Restaurer */}
                  {ev.actif ? (
                    <button
                      onClick={() => handleToggleActif(ev.id, false)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-[#1e3a5f] text-[#7a8fa6] hover:border-red-500 hover:text-red-400 transition-all"
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
              <p className="text-[#7a8fa6] text-center py-8">
                Aucun événement à venir. Crée-en un ou importe les événements VEA !
              </p>
            )}
            {activeTab === "passes" && passes.length === 0 && (
              <p className="text-[#7a8fa6] text-center py-8">
                Aucun événement passé.
              </p>
            )}
            {activeTab === "archives" && archives.length === 0 && (
              <p className="text-[#7a8fa6] text-center py-8">
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
              className="border border-[#4d9fff] text-[#4d9fff] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#4d9fff] hover:text-white transition-all"
            >
              Exporter CSV
            </button>
          </div>

          <div className="card-glow rounded-2xl overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-[#1e3a5f]">
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
                      className="text-left p-4 text-[#7a8fa6] text-xs uppercase tracking-widest font-semibold"
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
                    className={`border-b border-[#1e3a5f]/50 ${
                      i % 2 === 0 ? "bg-transparent" : "bg-[#4d9fff]/5"
                    }`}
                  >
                    <td className="p-4 text-white">{p.prenom}</td>
                    <td className="p-4 text-white">{p.nom}</td>
                    <td className="p-4 text-[#7a8fa6]">{p.telephone}</td>
                    <td className="p-4 text-[#7a8fa6]">
                      {p.jeuPrefere || "—"}
                    </td>
                    <td className="p-4 text-[#7a8fa6]">
                      {p.quartier || "—"}
                    </td>
                    <td className="p-4 text-[#7a8fa6] text-sm">
                      {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))}
                {participants.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-[#7a8fa6]"
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
            className="relative z-10 w-full max-w-lg bg-[#0d1f3c] border border-[#1e3a5f] rounded-2xl p-6 space-y-4"
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
              className="w-full bg-[#0a1628] border border-[#1e3a5f] text-white rounded-xl px-4 py-3 outline-none focus:border-[#4d9fff] transition-colors"
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <input
                placeholder="Lieu *"
                value={editForm.lieu}
                onChange={(e) =>
                  setEditForm({ ...editForm, lieu: e.target.value })
                }
                className="bg-[#0a1628] border border-[#1e3a5f] text-white rounded-xl px-4 py-3 outline-none focus:border-[#4d9fff] transition-colors"
                required
              />
              <input
                type="datetime-local"
                value={editForm.date}
                onChange={(e) =>
                  setEditForm({ ...editForm, date: e.target.value })
                }
                className="bg-[#0a1628] border border-[#1e3a5f] text-white rounded-xl px-4 py-3 outline-none focus:border-[#4d9fff] transition-colors"
                required
              />
            </div>

            <select
              value={editForm.type}
              onChange={(e) =>
                setEditForm({ ...editForm, type: e.target.value })
              }
              className="w-full bg-[#0a1628] border border-[#1e3a5f] text-white rounded-xl px-4 py-3 outline-none focus:border-[#4d9fff] transition-colors"
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
              className="w-full bg-[#0a1628] border border-[#1e3a5f] text-white rounded-xl px-4 py-3 outline-none focus:border-[#4d9fff] transition-colors"
              rows={3}
            />

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="bg-[#4d9fff] text-white px-6 py-2 rounded-xl font-semibold hover:bg-[#60b4ff] transition-all"
              >
                Enregistrer
              </button>
              <button
                type="button"
                onClick={() => setEditEvent(null)}
                className="border border-[#1e3a5f] text-[#7a8fa6] px-6 py-2 rounded-xl hover:border-red-500 hover:text-red-400 transition-all"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
