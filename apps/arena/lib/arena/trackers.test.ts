/**
 * Tests des liens trackers. Une URL fausse envoie le joueur sur une 404 chez
 * un site TIERS : c'est invisible dans nos logs, donc verrouillé par des tests.
 */
import { describe, expect, it } from "vitest";
import { lienProfilTracker } from "./trackers";

describe("lienProfilTracker", () => {
  it("construit un profil Rocket League avec la plateforme choisie", () => {
    expect(lienProfilTracker("rocket-league", "Otiil3v4lc", "psn")).toBe(
      "https://rocketleague.tracker.network/rocket-league/profile/psn/Otiil3v4lc/overview"
    );
  });

  it("refuse une plateforme inconnue plutôt que de deviner", () => {
    expect(lienProfilTracker("rocket-league", "Otiil3v4lc", "gameboy")).toBeNull();
    expect(lienProfilTracker("rocket-league", "Otiil3v4lc")).toBeNull();
  });

  it("encode le # du Riot ID pour Valorant", () => {
    expect(lienProfilTracker("valorant", "Léa#EUW")).toBe(
      "https://tracker.gg/valorant/profile/riot/L%C3%A9a%23EUW/overview"
    );
  });

  it("convertit Pseudo#TAG en Pseudo-TAG pour OP.GG", () => {
    expect(lienProfilTracker("league-of-legends", "Aya#123")).toBe(
      "https://www.op.gg/summoners/euw/Aya-123"
    );
  });

  it("encode le pseudo Fortnite", () => {
    expect(lienProfilTracker("fortnite", "le smasheur")).toBe(
      "https://fortnitetracker.com/profile/all/le%20smasheur"
    );
  });

  it("renvoie null pour un jeu sans tracker ou un pseudo vide", () => {
    expect(lienProfilTracker("super-smash-bros-ultimate", "Aya")).toBeNull();
    expect(lienProfilTracker("valorant", "   ")).toBeNull();
  });
});
