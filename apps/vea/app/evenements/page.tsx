import { redirect } from "next/navigation";

/**
 * Redirection /evenements → /agenda
 * On garde cette route pour pas casser d'éventuels liens existants.
 */
export default function EvenementsRedirect() {
  redirect("/agenda");
}
