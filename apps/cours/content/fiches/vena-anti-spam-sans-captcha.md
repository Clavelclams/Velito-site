---
titre: "Arrêter les robots sans CAPTCHA, et sans leur dire qu'on les a vus"
projet: "vena"
bloc: 1
themes: ["securite-applicative", "tests", "metier"]
source: "apps/vena/lib/anti-spam.ts, apps/vena/app/contact/actions.ts"
date: 2026-11-18
---

## Le concept

Le formulaire de devis de velito.fr recevait de faux « prospects » : textes sans sens, et surtout des messages d'hameçonnage qui récitaient l'offre de VENA puis renvoyaient vers un lien fabriqué pour nous. Un CAPTCHA aurait gêné les vrais clients et le formulaire doit rester simple. J'ai empilé des signaux, chacun bon marché, dans un module pur testé (`lib/anti-spam.ts`, 22 tests).

**1. Le pot de miel.** Un champ `site_web` invisible pour un humain (placé hors de l’écran en CSS, `aria-hidden` pour les lecteurs d’écran, `tabIndex={-1}` pour la touche Tab). Un robot remplit tous les champs qu'il trouve : s'il est rempli, c'est un robot.

**2. Le délai minimum.** La page note l'heure d'affichage du formulaire dans un champ caché. Si l'envoi arrive moins de 3 secondes après (`DELAI_MINIMUM_MS = 3000`), personne n'a eu le temps de lire et d'écrire.

**3. Le charabia.** Des mots de 12 lettres ou plus qui mélangent majuscules et minuscules au hasard (« xKqLmPzRtW… ») : signature des robots qui remplissent avec des chaînes aléatoires.

**4. L'hameçonnage, par addition d'indices.** Le domaine du lien change à chaque fois, donc impossible de le bloquer par nom. J'additionne des indices :
- adresse jetable (`probox.my.id`, `prodmail.online`, domaine en `.my.id`) ;
- budget en dollars sur un site français ;
- un lien vers un autre site que velito.fr ;
- un site tiers qui met « velito » dans son adresse : page fabriquée pour nous.

À partir de **2 indices** (`SEUIL_HAMECONNAGE = 2`), c'est un robot. Un seul indice ne suffit pas : un vrai client peut coller le lien de son site actuel.

**La réponse silencieuse.** Quand un robot est détecté, le serveur répond **« merci, c'est envoyé »**, sans rien enregistrer. Si je répondais « refusé », le robot (ou la personne derrière) saurait quelle règle l'a bloqué et ajusterait. Là, il croit avoir réussi et ne cherche pas à contourner.

Tout est vérifié **côté serveur** dans la Server Action : le champ caché et l'heure d'affichage viennent du navigateur, donc un robot peut les falsifier, mais il faudrait qu'il sache qu'ils existent et ce qu'on en attend.

## Comment je l'explique au jury

« Plutôt qu'un CAPTCHA qui gêne les vrais clients, j'empile quatre signaux bon marché : un champ piège invisible, un délai minimum de 3 secondes, la détection de texte aléatoire, et un score d'hameçonnage qui additionne des indices, avec un seuil à 2 pour ne pas bloquer un vrai client. Tout est dans un module pur, testé par 22 tests. Quand c'est un robot, je réponds comme si tout allait bien, pour ne pas lui apprendre quelle règle l'a arrêté. »

## La question vicieuse du jury

**« Un vrai client qui se trompe est bloqué sans le savoir. C'est grave pour une entreprise. »**

C'est le vrai coût de la réponse silencieuse, et je l'ai pesé. D'abord, les règles sont réglées pour qu'un humain normal ne les déclenche pas : il ne voit pas le champ piège, il met plus de 3 secondes, il n'écrit pas de charabia, et un seul indice d'hameçonnage ne suffit pas. Ensuite, le risque restant est un faux positif rare, alors que l'autre option, dire « refusé », aide tous les robots à s'adapter. Ce qui manque : je ne garde aucune trace des envois bloqués. Un journal des refus (raison, date, sans le contenu) permettrait de vérifier qu'aucun vrai client n'a été arrêté.
