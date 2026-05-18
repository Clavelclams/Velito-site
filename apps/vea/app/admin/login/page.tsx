/**
 * /admin/login — Redirige vers /login (page unifiee depuis le 18/05/2026).
 *
 * On garde la route pour eviter de casser les liens existants (mails envoyes,
 * docs, bookmarks). Tout pointe vers la nouvelle page neutre /login qui
 * route ensuite vers /admin ou /profil selon les permissions.
 */
import { redirect } from "next/navigation";

export default function AdminLoginRedirect() {
  redirect("/login");
}
