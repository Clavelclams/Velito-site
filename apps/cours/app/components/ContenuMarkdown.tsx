/**
 * CONTENU MARKDOWN — Server Component. [2026-11-13]
 *
 * Un seul endroit pour afficher le Markdown des leçons et des fiches, avec
 * une règle en plus : un bloc de code de langage `jeu` n'est pas affiché
 * comme du code, il devient un mini-jeu (JeuLecon, composant client).
 *
 * react-markdown rend un bloc de code comme <pre><code class="language-xxx">.
 * On remplace donc `pre` : si son enfant est un `code` de langage `jeu`, on
 * lit le JSON et on affiche le jeu ; sinon on laisse le <pre> normal.
 * Un JSON mal écrit n'est jamais caché : il reste affiché tel quel avec un
 * avertissement, pour que l'erreur se voie à la relecture.
 */
import { isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import JeuLecon, { lireJeu } from "./JeuLecon";

function texteDe(noeud: ReactNode): string {
  if (typeof noeud === "string") return noeud;
  if (Array.isArray(noeud)) return noeud.map(texteDe).join("");
  return "";
}

export default function ContenuMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        pre({ children: enfants, ...reste }) {
          const code = Array.isArray(enfants) ? enfants[0] : enfants;
          if (isValidElement<{ className?: string; children?: ReactNode }>(code)
            && (code.props.className ?? "").split(" ").includes("language-jeu")) {
            const brut = texteDe(code.props.children);
            const jeu = lireJeu(brut);
            if (jeu) return <JeuLecon jeu={jeu} />;
            return (
              <div className="my-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
                <p className="mb-2 font-bold">Mini-jeu illisible : le JSON de ce bloc est à corriger.</p>
                <pre className="overflow-x-auto whitespace-pre-wrap">{brut}</pre>
              </div>
            );
          }
          return <pre {...reste}>{enfants}</pre>;
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
