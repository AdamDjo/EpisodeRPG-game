# 06 — Survie

> Le monde de Velkhar essaie de te tuer. Pas toujours violemment.

---

## 0. Principe

La survie est la **pression constante** du jeu (Pilier 1). Mais elle ne doit **jamais** étouffer la narration ni devenir de la micro-gestion. Le joueur souffre, mais ce n'est pas un simulateur de famine.

> _L'objectif n'est pas que le joueur gère une jauge de soif. C'est que la soif pèse sur ses choix. Accepter un contrat dangereux juste pour accéder à un puits — voilà l'émotion visée._

### Le curseur "pas hardcore"

- 🟢 Les jauges se dégradent **lentement** (pas une crise par scène)
- 🟢 Le danger vient de la **narration** (l'IA décrit la fatigue, la fièvre) autant que des chiffres
- 🟢 La mort par survie est possible mais **rare** — elle survient par négligence prolongée, pas par RNG
- 🟢 Le joueur peut toujours **se retourner** (trouver eau, chasser, se reposer) si il réagit

---

## 1. Les quatre jauges

| Jauge                     | Dégradée par                             | Restaurée par                              | Attribut lié |
| ------------------------- | ---------------------------------------- | ------------------------------------------ | ------------ |
| 🩸 **PV** (Points de Vie) | Blessures, poison, maladie, faim extrême | Repos, soin, nourriture                    | SANG         |
| 💧 **Soif**               | Temps, chaleur, effort                   | Boire (eau, tisane, alcool)                | SANG         |
| 🍖 **Faim**               | Temps, effort                            | Manger (viande séchée, dattes, racines)    | SANG         |
| 😴 **Fatigue**            | Marche, combat, manque de sommeil        | Dormir (auberge, feu de camp, repos court) | SANG         |

🟢 _Toutes liées à SANG — le survivant endurci résiste mieux._

### Échelle de chaque jauge (0–100)

```
100  ─── pleine forme
 75  ─── légère gêne (l'IA commence à la mentionner)
 50  ─── souffrance perceptible, l'IA la décrit franchement
 25  ─── souffrance aiguë + Désavantage aux jets (voir « Traduction mécanique » ci-dessous)
  0  ─── la jauge touche zéro → fièvre (`fever`) + érosion des PV (voir « Effritement des PV » ci-dessous)
```

🟢 _Paliers narratifs exacts (contrat moteur `game-rules/survival.ts`, `gaugeTier()`, #201) : `ok` >75,
`strained` 51-75 (mention légère), `severe` 26-50 (souffrance décrite), `critical` ≤25 (souffrance
aiguë + Désavantage, non cumulatif même si plusieurs jauges sont critiques en même temps). Ces
paliers sont injectés dans le prompt du MJ IA pour guider la narration ; l'IA ne décide jamais du
Désavantage lui-même, il est appliqué côté backend._

### Base PV

```
PV_max = 10 + modificateur SANG
```

🟢 _Un Marcheur-du-Sel (SANG +2) démarre à 12 PV. Un Tisse-Verbe (SANG -1) à 9 PV._

### Effritement des PV par négligence (contrat moteur, #201)

Tant que Faim **ou** Soif est à 0, le perso perd **-1 PV par tour** (usure, épuisement). L'effet
n'est **pas cumulatif** : si Faim et Soif sont à 0 en même temps, la perte reste -1 PV/tour, pas -2.
C'est distinct de la fièvre (`fever`, §2) qui reste déclenchée dans les mêmes conditions — les deux
effets coexistent (fièvre = Désavantage aux jets, érosion = perte de PV).

---

## 2. Les conditions

Au-delà des jauges, le perso peut subir des **conditions** — altérations temporaires ou persistantes.

### Types de conditions

| id (moteur)      | Condition                  | Cause                                | Effet                                     | Durée                     | Source      |
| ---------------- | -------------------------- | ------------------------------------ | ----------------------------------------- | ------------------------- | ----------- |
| `fever`          | 🔥 **Fièvre**              | Faim/soif à 0, maladie, marais       | Désavantage à tous les jets               | Jusqu'au soin             | **BACKEND** |
| `poison`         | 💀 **Empoisonnement**      | Créature, poison, eau corrompue      | -1d4 PV/tour (combat), -1 hors combat     | Jusqu'au soin             | IA-PROPOSÉE |
| `wound`          | 🩸 **Blessure**            | Combat (réduit à 0 PV ou proche)     | Désavantage aux jets SANG, limite portage | Jusqu'au repos long       | **BACKEND** |
| `freeze`         | 🧊 **Gel**                 | Nuit dans le désert, haute montagne  | -1 SOUFFLE, malus mouvement               | Jusqu'à source de chaleur | IA-PROPOSÉE |
| `stun`           | 🌀 **Étourdissement**      | Coup à la tête, explosion            | Perte d'un tour (combat)                  | Court                     | IA-PROPOSÉE |
| `blindness`      | 😵 **Cécité temporaire**   | Ventre-Gris, lumière archontique     | Désavantage SOUFFLE (perception)          | Court                     | IA-PROPOSÉE |
| `marsh_disease`  | 🤢 **Maladie des marais**  | Marais de Lekh                       | Désavantage à tous, fatigue double        | Long, soin spécifique     | IA-PROPOSÉE |
| `cendre_corrupt` | 🔮 **Cendre-corrompu**     | Magie excessive (Tisse-Verbe)        | Progresse vers Calamine                   | Voir §4                   | IA-PROPOSÉE |
| `shaken_reason`  | 🧠 **Raison ébranlée**     | Trauma, mort d'un proche, révélation | -1 VOLONTÉ, hallucinations                | Variable                  | IA-PROPOSÉE |
| `petrification`  | 🪨 **Pétrification lente** | Veilleur archontique                 | Malus progressifs → mort si non soigné    | Mortel                    | IA-PROPOSÉE |

🟢 _Le joueur peut subir plusieurs conditions simultanément — mais le MJ IA évite l'empilement punitif._

### Les deux familles de conditions (contrat moteur)

Le backend possède toutes les règles (cf. `15-GAME-MASTER §0`). Les conditions se répartissent en deux familles selon **qui décide de leur application** :

- **[BACKEND]** — appliquée **automatiquement par le moteur** sur franchissement d'un seuil mesurable. L'IA ne les propose jamais ; elle les **narre** seulement une fois appliquées.
  - `fever` : déclenchée quand `faim ≤ 0` **ou** `soif ≤ 0`.
  - `wound` : déclenchée quand le perso tombe à `PV ≤ 0` puis est ramené (inconscience survécue), ou sur un coup critique en combat.
- **[IA-PROPOSÉE]** — l'IA **propose** l'application via le champ `applyCondition` (cf. `15-GAME-MASTER §4.5`), le backend la **valide** (whitelist d'ids ci-dessus + plausibilité biome/contexte) avant de l'appliquer. Exemple : `poison` n'est acceptée que si le contexte narratif la justifie (créature venimeuse, eau corrompue, piège).

🟢 _Règle : une condition non présente dans la table ci-dessus (id inconnu) est **rejetée** par le backend. L'IA ne peut pas inventer de condition._

### La localisation des blessures _(ajout 2026-08-15, #281)_

La condition `wound` porte désormais une **localisation persistée**. Objectif : le corps du
personnage devient une **information lisible**, pas un compteur abstrait — le joueur se souvient de
_ce qui lui est arrivé_, et l'IA a de quoi le lui rappeler à chaque scène.

```ts
wound: {
  id: "wound",
  location: "head" | "torso" | "left_arm" | "right_arm" | "left_leg" | "right_leg" | "hand" | "eye",
  cause: string        // court, narratif : "morsure", "brûlure d'archonte", "lame ébréchée"
}
```

- La **localisation est décidée par le backend** au moment où la condition est appliquée
  (`wound` est une condition [BACKEND], cf. ci-dessus). L'IA ne la choisit pas — elle la **narre**.
- Elle est **persistée sur le personnage** et réinjectée en contexte à chaque tour
  (`{blessures_localisées_actives}`, cf. `15-GAME-MASTER §6`) : une jambe blessée reste une jambe
  blessée trois scènes plus tard, dans la prose comme dans la mémoire du joueur.
- **Aucun effet mécanique différencié en V1** : toutes les localisations produisent le même
  Désavantage. La localisation est **narrative et mnémonique** — pas un système de dégâts
  localisés. (Un malus par membre est explicitement **hors périmètre V1** : coût d'équilibrage
  disproportionné pour un roguelike de 2h.)
- Plusieurs `wound` de localisations différentes peuvent coexister ; le Désavantage, lui, **ne
  s'empile pas** (cf. `08-DICE-RESOLUTION §5`).

🟢 _Règle d'écriture : la blessure doit apparaître dans la narration quand elle gêne l'action tentée
— jamais comme un rappel systématique en début de chaque scène._

### Traduction mécanique de l'effet « désavantage »

Les conditions sévères n'appliquent **pas** de malus plat au d20. Elles imposent le **Désavantage** (2d20, garder le pire) — le mécanisme canon décrit dans `08-DICE-RESOLUTION §5`. Cela remplace toute lecture « -1 / -2 au jet » de la table pour l'implémentation moteur : le moteur applique le désavantage, l'affichage indique au joueur pourquoi.

---

## 3. Le repos

Le joueur peut **se reposer** pour restaurer les jauges. Trois types de repos :

### 🛌 Repos court (1-2h, dans le monde)

- Récupère ~20% fatigue
- Soin léger (1d4 PV si bandages)
- Permet de manger / boire sur le pouce
- Risque : aléatoire (rencontre, embuscade)

### 🔥 Repos long / feu de camp (une nuit)

- Récupère ~60% fatigue, faim, soif (si provision)
- Soin modéré (1d4+mod SANG PV si bandages)
- Permet l'artisanat, la veille, les conversations
- Risque : aléatoire (rencontre nocturne)

### 🏠 Repos en auberge (une nuit, payant)

- Récupère 100% de tout
- Soin complet + retrait d'une condition bénigne
- Accès à rumeurs, PNJ, marché
- Risque : nul, mais coûte du _fer_

🟢 _Le repos est l'occasion de scènes calmes — dialogue PNJ, contemplation, choix réfléchi._

### Taux de repos (contrat moteur)

Valeurs normatives appliquées par le backend (`game-rules/rest.ts`). Toutes les jauges sont clampées à `[0, 100]`.

| Type de repos    | id moteur | Fatigue | Faim | Soif | PV                         | Calamine | Risque       |
| ---------------- | --------- | ------- | ---- | ---- | -------------------------- | -------- | ------------ |
| 🛌 Repos court   | `short`   | +20     | —    | —    | +1d4 (si bandages)         | —        | différé (V2) |
| 🔥 Repos au feu  | `fire`    | +60     | +60  | +60  | +1d4 + mod SANG (bandages) | −10      | différé (V2) |
| 🏠 Repos auberge | `inn`     | +100    | +100 | +100 | 100 % (complet)            | −10      | nul (payant) |

- « +60 faim/soif » ne s'applique **que si le perso a des provisions** (nourriture/eau en inventaire) — sinon la récupération faim/soif est nulle.
- Le **risque de repos** (embuscade, rencontre nocturne) est **différé à un ticket V2** : en V1 le repos est sûr.
- L'IA **propose** le repos via `restRequested` (cf. `15-GAME-MASTER §4.5`) ; le backend applique les taux ci-dessus et fait narrer une scène calme.

---

## 4. La Calamine

La magie n'est jamais gratuite (voir `02-WORLD-BIBLE.md`). **Tout usage d'artefact** accumule de la **Calamine** dans le corps de l'aventurier. Aucun n'y échappe — mais tous ne payent pas au même rythme.

> **Une seule jauge.** La Calamine est le coût magique unique de Velkhar : il n'existe pas de
> seconde jauge de « Cendre ». La **Cendre** désigne la matière du monde (le fléau, les Cendreurs,
> _Of Ash and Salt_) — jamais une ressource de personnage. Le moteur ne connaît qu'un champ,
> `calamine` (0–100). Ne jamais réintroduire une jauge de Cendre.

- 🩸 **Aventuriers ordinaires** (Marcheur-du-Sel, Lame-Ombre, Veilleur) — accumulent de la Calamine uniquement quand ils déclenchent un artefact (pouvoir de base). Lent.
- 🔥 **Tisse-Verbe** — accumule à chaque **éveil**, beaucoup plus vite que les autres. C'est le prix de son don : il tire le pouvoir total des artefacts, mais sa Calamine progresse en compte à rebours accéléré.

### La jauge de Calamine (0–100)

| Seuil | Effet            | Narration                                       |
| ----- | ---------------- | ----------------------------------------------- |
| 0–24  | Rien             | mains propres                                   |
| 25–49 | Stade 1 Calamine | mains grisâtres, insomnie, rêves archontiques   |
| 50–74 | Stade 2          | saignements, perte de mémoire courte, stérilité |
| 75–99 | Stade 3          | transformation en _Calciné_ imminente           |
| 100   | Transformation   | Le perso devient un Calciné → **mort du perso** |

Implémentée par `calamineTier()` (`apps/backend/src/game-rules/conditions.ts`) : mêmes seuils.

### Les hallucinations de Calamine _(ajout 2026-08-15, #281)_

À partir du **stade 2 (Calamine ≥ 50)**, la corruption ne se contente plus de saigner le corps :
elle **abîme ce que le personnage perçoit**. Le backend expose alors un drapeau de contexte à l'IA :

```ts
hallucinationAllowed: boolean; // true dès calamine >= 50
```

Ce que le drapeau autorise, et rien de plus :

| ✅ Autorisé quand le drapeau est vrai                        | ❌ Interdit en toutes circonstances                |
| ------------------------------------------------------------ | -------------------------------------------------- |
| Une silhouette au bord du champ de vision, qui n'est plus là | Un PNJ halluciné listé dans `npcs_present`         |
| Une voix connue qui appelle depuis un lieu vide              | Un objet halluciné proposé via `itemGained`        |
| Une odeur, un bruit, une texture qui n'existent pas          | Un chiffre, une jauge, un résultat de dé faussé    |
| Un détail du décor qui change entre deux phrases             | Une sortie, un chemin ou un choix qui n'existe pas |

> **Règle absolue : l'hallucination est une ambiance, jamais une décision de jeu.**
>
> Le contrat `15-GAME-MASTER §0` reste entier — l'IA ne décide rien. Les validations de
> `15-GAME-MASTER §4.2` (PNJ ∈ catalogue, item ∈ catégories connues) s'appliquent **inchangées**
> même quand `hallucinationAllowed` est vrai. Un joueur peut douter de ce qu'il voit ; il ne doit
> **jamais** douter de ce que l'UI lui affiche.

- **Une hallucination maximum par scène**, et seulement si elle sert la tension.
- L'IA ne **signale jamais** qu'il s'agit d'une hallucination : pas de _« peut-être une illusion »_.
  Le doute appartient au joueur.
- Au **stade 3 (≥ 75)**, la fréquence augmente mais les interdits ci-dessus ne bougent pas.
- 🟢 _Lecture design : c'est la contrepartie perceptive du pacte magique. Plus le personnage tire
  sur les artefacts, moins sa lecture du monde est fiable — mais le jeu, lui, reste honnête._

### Comment réduire la Calamine

La Calamine ne régénère pas et ne redescend jamais seule : elle ne baisse que sur une action explicite.

- 🟢 **Repos long** : -10 Calamine
- 🟢 **Sœurs du Silence** (rituel au Culte) : -30 Calamine, mais coût (or, quête, secret)
- 🟢 **Artefact purificateur** (rare) : -50 Calamine une fois

🟢 _Tout aventurier qui touche aux artefacts gère un compte à rebours. Le Tisse-Verbe vit ce dilemme à chaque scène (éveiller = puissance immédiate, Calamine plus proche), les autres vocations ne le rencontrent qu'aux moments où elles décident d'activer un artefact trouvé._

### Sources d'accumulation de Calamine (contrat moteur)

La Calamine **ne monte jamais toute seule** : pas de drain passif par tour. Elle augmente uniquement sur un **événement source** identifié. Le backend applique le delta ; l'IA ne peut le **proposer** (via `applyCondition` avec `id: "cendre_corrupt"` — identifiant historique de la condition, conservé tel quel côté code) que si le contexte correspond à l'une des sources canon ci-dessous — sinon le delta est **rejeté**.

| Source                                           | Delta indicatif | Qui déclenche         |
| ------------------------------------------------ | --------------- | --------------------- |
| 🔮 Usage d'artefact — pouvoir de base            | +5              | BACKEND (résolution)  |
| 🔮 Éveil d'artefact (Tisse-Verbe)                | +10             | BACKEND (résolution)  |
| ☀️ Exposition à la **lumière archontique**       | +5 à +15        | IA-PROPOSÉE (validée) |
| 🌫️ Contact avec une créature/lieu **corrompu**   | +5 à +10        | IA-PROPOSÉE (validée) |
| 👁️ Regard/présence d'un **Veilleur archontique** | +10 à +20       | IA-PROPOSÉE (validée) |
| 🩸 Rituel/magie **excessive** hors artefact      | +5 à +15        | IA-PROPOSÉE (validée) |

- Le backend **plafonne** un delta IA-proposé à +20 par tour (garde-fou anti-abus).
- Toute source hors de cette liste → delta **ignoré** (l'IA reste libre de narrer, mais la jauge ne bouge pas).

### Négligence prolongée → Calamine (contrat moteur, #201)

Une **nouvelle source, purement BACKEND**, s'ajoute à la table ci-dessus : la négligence prolongée
des jauges vitales. L'IA ne la propose jamais — elle ne fait que narrer les conséquences une fois
appliquées.

- Chaque tour où Faim **ou** Soif est à 0, un compteur `neglectStreak` s'incrémente. Il retombe à 0
  dès que les deux jauges repassent au-dessus de 0.
- Une fois `neglectStreak ≥ 3` (négligence sur 3 tours consécutifs ou plus), le backend applique
  **+3 à +5 Calamine par tour**, tant que la négligence continue.
- Ce delta suit le même plafond anti-abus que les sources IA-proposées et s'additionne normalement
  aux autres sources du tour.
- 🟢 _Logique : ignorer les avertissements de faim/soif pendant plusieurs tours de suite a un coût
  cumulatif, cohérent avec le principe §0 « la mort par survie n'est jamais du RNG, elle vient de la
  négligence prolongée »._

### Paliers de Calamine (contrat moteur)

Le backend applique les effets de palier automatiquement dès franchissement du seuil (cf. table §4 « jauge de Calamine »). À **100**, la transformation en Calciné est **immédiate et non réversible** → fin de run avec `endReason: "calcined"` (cf. `09-ACTION-LOOP §7`). Pas d'héritage transmis (artefact corrompu).

---

## 5. Le climat et les biomes

La survie dépend du **lieu**. Chaque biome de Velkhar a son profil de danger.

| Biome                     | Chaleur                      | Eau        | Nourriture      | Danger spécifique                       |
| ------------------------- | ---------------------------- | ---------- | --------------- | --------------------------------------- |
| 🏜️ **Tissan** (désert)    | Extrême le jour, gel la nuit | Rare       | Faible          | Ventre-Gris, Tisseurs de Sable, mirages |
| 🪨 **Doigts** (montagnes) | Froid                        | Moyenne    | Chasse possible | Veilleurs archontiques, éboulements     |
| 🌊 **Rivage** (côte)      | Tempéré                      | Abondante  | Abondante       | Pirates, maladie, inondations           |
| 🌫️ **Marais de Lekh**     | Moite                        | Contaminée | Plantes         | Fièvres, Mangeurs de Souvenir, poison   |
| 🏛️ **Cœur** (Velkhar)     | Tempéré                      | Marché     | Marché          | Crime, dette, Inquisition               |

🟢 _L'IA reçoit le biome courant dans son prompt et adapte la narration de survie._

---

## 6. Survie et dés

Les actions de survie **peuvent** déclencher un dé (voir `08-DICE-RESOLUTION.md`), mais pas toujours :

| Action                           | Dé ?            | Attribut                   |
| -------------------------------- | --------------- | -------------------------- |
| Trouver de l'eau dans le désert  | ✅ (pivot)      | SANG + Survie              |
| Allumer un feu par temps venteux | ✅ (pivot)      | SOUFFLE + Survie           |
| Résister au poison               | ✅ (sauvegarde) | SANG                       |
| Marcher une journée de plus      | Non — narratif  | (la fatigue s'accumule)    |
| Chasser un animal                | ✅ (pivot)      | SOUFFLE + Survie           |
| Naviguer en tempête              | ✅ (pivot)      | SANG + Navigation          |
| Éviter le Ventre-Gris            | ✅ (sauvegarde) | SOUFFLE (perception)       |
| Dormir en sécurité               | Non — narratif  | (restauration automatique) |

🟢 _Les dés apparaissent quand l'issue est **incertaine et importante**. Le reste est narratif._

---

## 7. La mort par survie

Possible, mais **rare et télégraphiée**.

### Règle

- 🟢 Le perso ne meurt pas d'un seul coup de faim
- 🟢 Les jauges doivent s'effondrer **progressivement** et le joueur doit avoir **ignoré les avertissements**
- 🟢 La mort par survie génère une **Chronique** comme toute mort

🟢 _Règle absolue : la mort par survie ne doit jamais être perçue comme injuste ou RNG._

### État « mourant » — sursis universel (contrat moteur, #201)

Cette section **remplace** l'ancienne règle « à 0 PV → inconscience, l'IA décide du sort ». La
mécanique est désormais **entièrement backend**, quelle que soit la cause (combat, poison, érosion
de négligence) — l'IA ne décide jamais du sort du perso, elle ne fait que narrer l'état une fois
appliqué.

- **Premier passage à 0 PV** : le perso devient **mourant** (`isDying: true`). Les PV restent
  clampés à 0 (jamais négatifs). C'est un **sursis d'un tour** — pas de fin de run immédiate.
  L'IA doit **télégraphier clairement** cet état dans la narration (le perso titube, la vue se
  trouble, un allié crie son nom) pour que le joueur comprenne le danger sans ambiguïté.
- **Soin pendant l'état mourant** : si les PV remontent au-dessus de 0 (item, repos, allié), l'état
  mourant est levé (`isDying: false`) — le perso survit.
- **Second passage à 0 PV alors que `isDying` est déjà vrai** : **mort définitive**
  (`definitiveDeath: true`, `gameOver: true`). Génère la Chronique comme toute mort (cf. règle
  ci-dessus).
- 🟢 _Ce mécanisme est universel : il s'applique identiquement à une mort par combat, par poison, ou
  par négligence prolongée (érosion des PV, §1 « Effritement des PV ») — un seul système, pas de cas particulier par
  cause de dégât._

---

## 8. Survie et équipement

L'équipement de survie est **stocké en base** et injecté dans le prompt du MJ IA (voir `11-INVENTORY-ECONOMY.md`).

| Équipement           | Effet sur la survie                                                        |
| -------------------- | -------------------------------------------------------------------------- |
| Gourde               | + capacité d'eau, ralentit la soif                                         |
| Vêtements du désert  | Résistent à la chaleur diurne et au gel nocturne                           |
| Tente / toile        | Repos plus sûr, protège du Ventre-Gris                                     |
| Bandages             | Soin lors du repos                                                         |
| Antidote             | Retire l'empoisonnement                                                    |
| Nourriture séchée    | Restaure la faim sans chasse                                               |
| Boussole archontique | + navigation                                                               |
| Outre de Cendre      | Absorbe une part de la Calamine du Tisse-Verbe (retarde le palier suivant) |
| Masque filtrant      | Protège du Ventre-Gris et des marais                                       |

🟢 _Le MJ IA prend en compte l'équipement du joueur : "Ta gourde est vide depuis deux jours" ou "Ton masque filtrant grésille, le Ventre-Gris approche."_

---

## 9. Synthèse

```
SURVIE = 4 JAUGES (PV, Soif, Faim, Fatigue)
   ↓ dégradation lente, pression narrative
   ↓
CONDITIONS (fièvre, poison, blessure, Calamine…)
   ↓ se soignent par repos / soin / artefact
   ↓
REPOS (court / feu / auberge)
   ↓ occasion de scènes calmes
   ↓
BIOMES (désert, montagne, côte, marais, ville)
   ↓ adaptent les dangers
   ↓
ÉQUIPEMENT (gourde, tente, masque…)
   ↓ stocké en base, injecté dans le prompt
   ↓
LA MORT POSSIBLE — mais rare, télégraphiée, jamais injuste
```

---

_Le système de **dés** qui arbitre les actions de survie est détaillé dans `08-DICE-RESOLUTION.md`._
