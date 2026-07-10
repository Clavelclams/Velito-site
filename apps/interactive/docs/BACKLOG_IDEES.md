# Backlog d'idées — Velito Interactive

> Idées de jeux / features **pas encore lancées**. On note pour ne pas perdre,
> avec les notes de faisabilité. Rien ici n'est engagé : on priorise à froid.
> Règle : on ne démarre une idée qu'après avoir **stabilisé ce qui est déjà en
> ligne** (Laser, les 8 jeux existants).

---

## 💡 Jeu « manette-mouvement » (façon Wii Sports / Just Dance)

**Ajouté le 2026-07-09.** Idée de Clavel. Inspiration : « UnShoot » d'Unboared
(concurrent) — viser en bougeant le téléphone, recharger en le secouant.

**Le concept :** le téléphone devient une **manette de mouvement**. On bouge /
incline / secoue le tel pour jouer (tennis, boxe, bowling façon Wii Sports ; ou
suivre une choré façon Just Dance).

**Faisabilité : OUI, en web.** Même techno que UnShoot — les API navigateur
**DeviceMotion / DeviceOrientation** donnent accès à l'accéléromètre + gyroscope
du téléphone.

**Les pièges (à ne pas sous-estimer) :**
- **Mur iOS** : sur iPhone/Safari, l'accès au mouvement exige une **permission
  explicite** déclenchée par un clic, en HTTPS, et beaucoup l'ont désactivée.
  Android plus souple. Fiabilité cross-téléphone = vrai casse-tête en soirée.
- **Signal bruité** : détecter un « swing » / « coup » de façon fiable depuis les
  capteurs bruts = galère de traitement du signal. Gestes **grossiers** (secouer,
  incliner, grand geste) = OK. Gestes **précis** = très dur.
- **Just Dance = niveau AAA.** Scorer une choré = caméra + pose estimation
  (lourd, lumière, vie privée) ou capteurs imprécis. Un clone web à moitié fait
  sera **frustrant**. → à NE PAS viser.

**Portée recommandée (si un jour on le fait) :** viser le **Wii-Sports-light**
avec gestes grossiers fiables — « qui secoue le plus vite », « incline pour
diriger », « grand geste pour frapper » (tennis / boxe / bowling en un coup).
Oublier le geste précis et la choré notée.

**De-risque AVANT de coder un jeu :** passer **un après-midi** sur une simple
page test qui lit `DeviceMotion` sur *ton tel + un iPhone d'un pote*. Confirmer
que (1) la permission iOS passe, (2) les données sont exploitables. Si la
plomberie tient → concevoir le jeu. Sinon → repenser.

**Statut :** 🅿️ Parké. Ne pas démarrer tant que Laser + compta ne sont pas
stabilisés. Priorité basse (risque technique élevé pour un dev solo).

---

## Notes stratégiques transverses (juin 2026)

Contexte : le concurrent **Unboared** shippe vite (Estim', Draw Guessr, UnShoot)
et met l'accent sur la **stabilité des connexions**, le **design de la console**,
la **facturation self-service** et le **thématique événementiel** (Coupe du
Monde 2026). Enseignements pour Velito Interactive :

- **Stabilité > nouveaux jeux.** Une soirée qui déconnecte = un bar perdu.
- **Contenu thématique + « annoncez votre soirée sur les réseaux »** = croissance
  quasi gratuite. À copier (thème local Amiens ? foot ?).
- **Facturation / dashboard self-service** = le boring qui fait un vrai produit.
- **Positionnement :** en dev solo avec 6 chantiers, ne pas courir Unboared jeu
  pour jeu. Gagner ailleurs — **ancrage local Amiens**, **bundling VENA**
  (presta + jeu), **mission VEA/inclusion**. Un edge qu'un générique ne copie pas.
