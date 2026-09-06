# 09 — La Boucle d'Action

> _Tu décris. Le monde répond. Tu réponds au monde. Toujours._

---

## 0. Principe

GRIMOIRE n'est pas un jeu à tour de table. C'est une **conversation tendue** entre le joueur et le monde, arbitrée par l'IA, ponctuée par les dés (voir `08-DICE-RESOLUTION.md`).

Un **tour de jeu** = une réponse IA + une action joueur. Le joueur **n'attend jamais** : il y a toujours quelque chose à faire, ou quelqu'un à qui répondre.

> _Le but : que le joueur oublie qu'il joue à un jeu. Qu'il vive une histoire dont il est l'acteur._

### Les 3 promesses de la boucle

- 🟢 **Toujours du choix** : aucune scène sans option (même au repos)
- 🟢 **Toujours du sens** : chaque action a une conséquence narrative, jamais ignorée
- 🟢 **Toujours fluide** : le joueur peut cliquer sans réfléchir OU prendre 5 minutes à écrire, les deux marchent

---

## 1. La boucle de base

```
┌─────────────────────────────────────────────────────┐
│  1. L'IA narre la scène (texte + ambiance)          │
│                                                      │
│  2. L'IA propose 3-4 choix d'action                 │
│     + une icône  ✍️  "Autre action"                  │
│                                                      │
│  3. Le joueur :                                      │
│     ─ clique sur un choix                            │
│       OU                                             │
│     ─ clique sur  ✍️  et tape librement              │
│                                                      │
│  4. L'IA interprète l'intention                      │
│     → identifie attribut + compétence + DC           │
│     → décide si dé ou narration pure                 │
│                                                      │
│  5. Si dé : roulement transparent (voir §4)          │
│                                                      │
│  6. L'IA narre la conséquence                        │
│     → fertile, jamais dead-end (cf. 01-PILLARS)      │
│                                                      │
│  7. Retour à 1.                                      │
└─────────────────────────────────────────────────────┘
```

🟢 _Le rythme est tenu par l'IA. Si le joueur tarde, l'IA peut **relancer** ("Le garde s'impatiente...") mais ne force jamais une action._

---

## 2. Les 3 modes de saisie

> Ici, « mode » décrit uniquement **comment le joueur formule son action**. Auberge, voyage,
> exploration, donjon et retour conservent la même boucle narrative ; le combat transforme
> temporairement cette boucle (cf. §2bis).

Le joueur n'est jamais enfermé dans un seul mode. Il choisit naturellement à chaque tour.

### Mode A — Choix proposés (par défaut)

- Le joueur clique sur un des 3-4 choix proposés
- **Rapide** : 1 clic = 1 tour
- **Onboarding doux** : pas besoin d'imagination ni de connaître les règles
- C'est le mode **privilégié** pour 80% des tours

### Mode B — Saisie libre (icône ✍️)

- Le joueur clique sur ✍️ "Autre action" → champ texte s'ouvre
- Le joueur écrit ce qu'il veut faire (style Discord, 1 phrase à 1 paragraphe)
- L'IA interprète l'intention et résout
- **Sandbox total** : tu peux essayer **n'importe quoi**

### Mode C — Hybride (clic + précision)

- Le joueur clique sur un choix, puis l'IA propose une **icône ✍️ "préciser"**
- Le joueur ajoute du texte ("je tente l'option 2, mais en feignant la fatigue")
- L'IA combine : l'intention de base du choix + la nuance écrite
- Permet de jouer **rapide** sans perdre la liberté

🟢 _Règle : le joueur ne doit jamais avoir l'impression que "écrire" est une fonctionnalité cachée. L'icône ✍️ est toujours visible, toujours à côté des choix._

---

## 2bis. Continuité narrative et combat

> **Révision du 2026-08-08.** La séparation du 2026-08-06 en quatre interfaces est révoquée après
> grilling produit. Elle confondait structure roguelike et changement d'écran, au détriment de
> l'identité storytelling de GRIMOIRE.

La boucle §1 reste le langage commun de l'Auberge, du voyage, de la quête, du donjon et du retour.
L'image, la voix, les destinations persistantes et les composants contextuels évoluent, mais le
joueur ne quitte jamais son histoire pour ouvrir une carte de salles ou un tableau de gestion.

| Registre           | Présentation                                                          |
| ------------------ | --------------------------------------------------------------------- |
| **Auberge**        | Scènes narratives + destinations Comptoir, L'Aveugle, Contrats, Forge |
| **Voyage / quête** | Boucle §1, objectif repliable, survie et inventaire                   |
| **Donjon**         | Boucle §1, structure moteur cachée, aucun type de salle ou profondeur |
| **Retour**         | Boucle §1, trajet plus court et plus facile, sans estimation affichée |
| **Combat**         | Transformation tactique temporaire, puis retour à la boucle §1        |

### Règles de continuité

1. **Une seule coque narrative** porte tout le run hors combat.
2. **Le combat est la seule transformation franche** : il conserve le décor et la dernière scène
   consultable, mais rend ennemis, initiative, actions et jets tactiques.
3. **L'état serveur reste autoritaire.** Le frontend peut lire `GameMode` pour savoir quand rendre
   le combat ; il ne l'infère jamais depuis la prose.
4. **Le demi-tour est toujours accessible hors combat.** Il ne dépend pas d'un choix proposé par
   l'IA.
5. **L'action libre survit au combat.** Le backend la traduit vers une action tactique autorisée.

---

## 3. Comment l'IA propose les choix

Les choix proposés sont **générés à chaque tour** par l'IA selon la scène. Pas de menu fixe.

### Règles de génération

| Règle                                                | Pourquoi                                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **3-4 choix max**                                    | Plus = analysis paralysis, le joueur scrolle au lieu de jouer                         |
| **Toujours 1 option RP / 1 pragmatique / 1 risquée** | Diversité, profils de joueurs différents                                              |
| **Jamais "Fuir" sauf danger réel**                   | Sinon devient un bouton "skip scène"                                                  |
| **Jamais d'option méta**                             | Pas de "Quitter le jeu" ou "Ouvrir inventaire" dans les choix narratifs               |
| **Adaptés à la vocation**                            | Un Tisse-Verbe voit "Tu sens un artefact dans cette ruine" qu'un Marcheur ne voit pas |
| **Adaptés aux conditions**                           | Si le perso a la fièvre, "Se reposer ici" peut apparaître en priorité                 |
| **Adaptés à la phase narrative**                     | En climax (acte 3 invisible, cf. §6), pas de choix "explorer un bâtiment au hasard"   |
| **L'option vorace** _(#281)_                         | Une option qui offre un gain clair **et** annonce son prix — voir ci-dessous          |

### L'option vorace _(ajout 2026-08-15, #281)_

Parmi les 3-4 choix, **au moins un tour sur trois** propose une **option vorace** : un choix dont le
bénéfice est explicite et immédiat, et dont le coût est **annoncé sans être chiffré**.

- Le gain est **lisible** : de l'eau, un raccourci, une information, un artefact.
- Le prix est **signalé mais flou** : un détail de la narration dit ce qu'on risque, jamais combien.
- Le joueur doit pouvoir se dire _« j'y vais quand même »_ — et se souvenir qu'il l'a choisi.

**Ce que ce n'est pas** :

- ❌ Un piège aveugle. Un coût jamais annoncé est du RNG punitif, pas un dilemme (`01-PILLARS §9` :
  la mort doit rester imputable au joueur).
- ❌ Un choix optimal déguisé. Si le bon calcul est toujours « ne pas y aller », l'option est morte.
- ❌ Un label qui chiffre le coût (_« -15 PV »_) — le label reste narratif, le moteur calcule.

**Exemple** :

> _Le puits est plein. L'eau est claire. Deux corps flottent au fond, gonflés, les mains encore
> attachées au seau._

1. 💧 Boire quand même, longuement _(option vorace : soif comblée, et l'eau a servi à autre chose)_
2. 🪣 Remplir une gourde, ne pas boire ici _(pragmatique)_
3. 🚶 Repartir, la gorge sèche _(prudente)_

### Exemple

> _Tu entres dans la taverne du Doigt-Cassé. L'air pue la sueur et le sel. Au fond, un Inquisiteur t'observe en silence._

**Choix proposés** :

1. 🗡️ Approcher l'Inquisiteur, sans baisser les yeux _(option risquée)_
2. 🪙 Aller au bar, commander un verre, attendre _(option pragmatique)_
3. 👁️ Observer la salle, chercher une sortie discrète _(option RP/SOUFFLE)_
4. ✍️ _Autre action_

---

## 3bis. Le cadavre-présage _(ajout 2026-08-15, #281)_

> **Le joueur doit voir la conséquence avant la cause.**

C'est le mécanisme qui transforme la lecture en anticipation : avant qu'une menace n'arrive, Velkhar
en montre le **résultat sur quelqu'un d'autre**. Le joueur qui lit bien devine ; celui qui scanne
subit. Dans les deux cas, la surprise est **méritée** — jamais gratuite.

### Le principe

Un lieu dangereux ne s'annonce pas par une phrase d'avertissement, mais par un **corps, un objet ou
une trace** qui raconte ce qui est arrivé au précédent :

| Le présage montre…                                | Le joueur peut en déduire…              |
| ------------------------------------------------- | --------------------------------------- |
| Des marques de dents sur un os propre             | Ce qui vit ici mange, et mange souvent  |
| Une gourde pleine à côté d'un mort desséché       | Ce n'est pas la soif qui l'a tué        |
| Des bottes triées par pointure devant un Calciné  | Il y a eu beaucoup de passants ici      |
| Une cloche votive décrochée, cordon coupé         | Quelqu'un a voulu empêcher l'alerte     |
| Un masque votif encore chaud, sans visage dessous | Ce qui portait ce masque est parti seul |

### Les règles

- **Un présage par lieu dangereux, pas par tour.** L'accumulation banalise le signal.
- **Le présage précède toujours la menace** — jamais dans le même tour que sa réalisation.
- **Il tient la promesse** : ce qui est annoncé arrive dans les **3 tours**, ou est **démenti de
  façon signifiante** (le monstre était déjà mort, quelqu'un l'a tué avant toi). Un présage sans
  suite entraîne le joueur à ne plus lire — c'est l'anti-objectif.
- **Il ne dit jamais la règle**, il montre son effet. Pas de _« attention, cette eau est
  empoisonnée »_ : un mort à côté du puits, gourde pleine.
- Le tour qui porte un présage prend le **mood `dread`** (cf. `15-GAME-MASTER §4.1`), pas
  `dangerous` : la menace n'est pas encore là.

### Le contrat moteur

L'IA déclare son présage via le champ optionnel `foreshadow` (cf. `15-GAME-MASTER §4.1`) :
l'indice est **déjà dans la narration**, le champ le rend seulement lisible par le backend, qui le
persiste et le réinjecte en contexte tant qu'il n'est pas résolu (3 tours max). Le joueur ne voit
jamais le champ `threat` — seulement l'indice, dans la prose.

🟢 _Lien pilier : c'est la traduction mécanique de « le joueur doit chercher à savoir ce qui va lui
arriver » (`01-PILLARS §4`, Trucs à viser)._

---

## 4. Le déclenchement des dés

Le dé n'est pas roulé pour chaque action. Voir `08-DICE-RESOLUTION.md` pour le système complet.

### Qui décide ?

**L'IA décide** si l'action est un **pivot** (issue incertaine ET importante). Si oui, dé. Sinon, narration pure.

### Comment c'est annoncé au joueur

Avant le dé, l'IA affiche un **encart transparent** (style BG3) :

```
┌────────────────────────────────────────┐
│  Tu tentes de persuader l'Inquisiteur. │
│                                         │
│  [ Persuasion ]  VOLONTÉ +2  vs  DC 16  │
│                                         │
│         🎲 d20 = ?                      │
│                                         │
│  [ ROULER LE DÉ ]                       │
└────────────────────────────────────────┘
```

Le joueur **clique pour rouler** (suspense + ressenti BG3). Le résultat s'affiche, puis l'IA narre la conséquence.

🟢 _Transparence totale. Le joueur comprend pourquoi il réussit ou échoue. C'est ce qui crée l'engagement._

---

## 5. Cas spécifique — Éveil d'artefact (Tisse-Verbe)

L'éveil suit un flux **particulier** parce que c'est le geste central du Tisse-Verbe (et qu'on veut éviter la frustration "j'ai payé la Cendre et il s'est rien passé").

### Le flux

```
1. Le joueur (Tisse-Verbe) déclare "Je tente d'éveiller l'artefact"
   ↓
2. L'IA confirme :
   ┌──────────────────────────────────────────┐
   │  Tu poses la main sur la Clé d'Ombre.    │
   │  Effet de base : tu désactives un piège. │
   │  Coût : 10 Calamine.                     │
   │                                           │
   │  Veux-tu tenter une AMPLIFICATION ?       │
   │  → d20 + SOUFFLE vs DC 14                 │
   │  → Réussite : tu désactives + tu           │
   │    apprends une faiblesse de l'artefact.  │
   │  → Échec : juste l'effet de base.         │
   │                                           │
   │  [ EFFET DE BASE ]  [ TENTER AMPLI ]      │
   └──────────────────────────────────────────┘
   ↓
3a. Si EFFET DE BASE → l'effet a lieu, Calamine payée, on continue
3b. Si AMPLIFICATION → roule d20
    ├── Réussite : effet majeur + bonus
    └── Échec    : juste effet de base
    (Calamine payée UNE SEULE FOIS)
```

🟢 _Règle d'or : l'éveil ne rate **jamais** totalement. Le joueur paye, le joueur reçoit au minimum l'effet de base._

🟢 _Le risque (et la récompense) est dans l'amplification — pas dans le déclenchement._

---

## 6. La bascule narrative invisible (les 3 actes)

L'IA structure chaque run en **3 actes** — mais le joueur ne les voit **jamais**. Pas de "Chapitre 1/3", pas de barre de progression.

| Acte (interne)       | Ressenti joueur                         | Tempo IA                              |
| -------------------- | --------------------------------------- | ------------------------------------- |
| **🌅 Installation**  | Tu découvres, tu rencontres, tu choisis | Calme, descriptif, options multiples  |
| **⚔️ Complications** | Le monde te résiste, les enjeux montent | Tendu, pivots fréquents, choix lourds |
| **🌙 Climax**        | Tout converge, il faut décider          | Urgence, peu de choix mais énormes    |

### Comment l'IA bascule

L'IA bascule d'acte selon :

- **Le rythme** (~30% du run en Installation, ~50% en Complications, ~20% en Climax)
- **Les actions du joueur** (s'il fonce vers un boss, le climax arrive plus tôt)
- **Les conditions de survie** (si la Calamine monte vers 80, l'IA pousse vers le climax)
- **Les quêtes en cours** (une quête majeure résolue peut déclencher le climax)

🟢 _Le joueur ressent le crescendo sans le voir. C'est exactement le but d'un bon récit : tu sais qu'il se passe quelque chose, pas comment ça marche._

🔴 _Anti-règle absolue : ne JAMAIS afficher "Acte 2" ou "Chapitre 3" dans l'UI. Casse l'immersion RP._

---

## 7. La fin du run

> **🔄 Révision du 2026-08-06.** Cette section décrivait un run **sans destination** : le joueur
> errait puis décidait d'arrêter. C'est précisément ce qui rendait la boucle molle — rentrer n'était
> pas une victoire, juste un arrêt.
>
> Désormais le run est borné par le **contrat** accepté à l'auberge (`23-RUN-STRUCTURE §1`), et
> rentrer est un **acte de jeu** avec son propre trajet (`23 §4`).

### 🏆 Fin réussie — Retour avec le contrat rempli

Le joueur remonte vivant **et** rapporte ce que le contrat demandait. C'est la fin canonique du run :
butin conservé, contrat payé, connaissance acquise, Chronique générée.

### 🥀 Fin amère — Retour les mains vides

Le joueur remonte vivant, mais sans l'objectif : demi-tour trop tôt, sac perdu, contrat échoué. Il
**survit** — donc il garde sa connaissance et sa progression d'accès — mais ne touche rien.

🟢 _Distinguer ces deux fins est essentiel : elles sont vécues de façon opposée, et la Chronique ne
doit pas les raconter de la même manière._

### 💀 Fin par la mort

À 0 PV → inconscience → le moteur tranche selon la table de vérité de `10-COMBAT §8` (captivité,
secours, mort). Si mort effective → run terminé, Chronique générée, héritage transmis (voir
`11-INVENTORY-ECONOMY.md` §5).

### 🌀 Fin par la Calamine

Si la Calamine atteint 100 → transformation en Calciné → le perso devient un monstre du bestiaire. Run terminé, Chronique générée avec **fin spéciale** ("Tu es devenu ce que tu chassais"). Pas d'héritage transmis (l'artefact est corrompu).

### Contrat moteur — `endReason`

Chaque fin de run porte un `endReason` distinct, transmis à la Chronique (`17-RUN-CHRONICLE`, `chronicle.service.ts`) pour adapter le récit :

| `endReason`      | Déclencheur                                      | Butin    | Héritage                             |
| ---------------- | ------------------------------------------------ | -------- | ------------------------------------ |
| `extracted`      | Retour vivant, contrat rempli                    | conservé | transmis                             |
| `returned_empty` | Retour vivant, contrat échoué ou abandonné       | perdu    | transmis                             |
| `death`          | Mort effective à 0 PV (arbitrée par le moteur)   | perdu    | transmis                             |
| `abandon`        | Abandon du perso (inactivité ou clic explicite)  | perdu    | transmis                             |
| `calcined`       | Calamine atteint 100 → transformation en Calciné | perdu    | **non transmis** (artefact corrompu) |

> **⚠️ Changement de contrat (2026-08-06).** L'ancienne valeur `inn` confondait les deux retours
> vivants — victorieux et bredouille — sous un seul code. Elle est **remplacée** par `extracted` et
> `returned_empty` dans `packages/shared/src/types/session.types.ts`.
>
> C'est un **breaking change** du type `SessionEndReason` : migration des sessions existantes
> (`inn` → `extracted`) et mise à jour de `chronicle.service.ts`, qui doit produire deux récits
> distincts. Implémentation portée par l'EPIC #214.

🟢 _`calcined` est la seule fin sans héritage. La Chronique reçoit ce `endReason` et bascule sur la fin spéciale « Tu es devenu ce que tu chassais »._

---

## 8. Risques & garde-fous

| Risque                                      | Mitigation                                                                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Analysis paralysis** (trop de choix)      | 3-4 choix max, mode A par défaut, ✍️ optionnel                                                                           |
| **Saisie libre incomprise par l'IA**        | Si confusion, l'IA répond _"Tu peux préciser ?"_ avec 2-3 reformulations proposées                                       |
| **Boucle infinie** (joueur tourne en rond)  | Si 10+ tours sans tension, l'IA **force un pivot** (un PNJ intervient, une menace arrive, une rumeur change le contexte) |
| **Joueur frustré par un échec critique**    | Échec = complication fertile, jamais dead-end (cf. 08-DICE §2)                                                           |
| **Le joueur ne sait pas qu'il peut écrire** | L'icône ✍️ est toujours visible. Un tooltip s'affiche au 1ᵉʳ tour ("Tu peux aussi écrire ton action")                    |
| **Choix générés génériques**                | Prompt IA : "Toujours 1 option propre à la vocation du joueur"                                                           |
| **Rythme de run incohérent**                | L'IA suit le minutage interne des 3 actes (§6)                                                                           |

---

## 9. Synthèse

```
TOUR DE JEU
───────────────────────────────────────
  IA narre la scène
       ↓
  IA propose 3-4 choix + ✍️ "Autre action"
       ↓
  Joueur : clic ou saisie libre
       ↓
  IA interprète intention
       ↓
  Pivot ?  ─── oui ──→  DÉ transparent (BG3)
       │                     ↓
       └──── non ──→ narration pure
                            ↓
              IA narre la conséquence (fertile)
                            ↓
                       (loop ↑)


STRUCTURE DU RUN (mécanique cachée — cf. 23-RUN-STRUCTURE)
───────────────────────────────────────
  🏚️ AUBERGE NARRATIVE — comptoir, L'Aveugle, contrats, forge
       ↓
  📜 UN CONTRAT PRINCIPAL — danger et durée seulement
       ↓
  🏜️ VOYAGE → QUÊTE / DONJON — même interface narrative
       ↕
  ⚔️ COMBAT — transformation tactique temporaire
       ↓
  🔀 DEMI-TOUR — toujours disponible hors combat
       ↓
  ⬆️ RETOUR — distinct, plus court, plus facile, sans estimation
       ↓
  FIN
  ├── 🏆 extracted        — vivant, contrat rempli
  ├── 🥀 returned_empty   — vivant, mains vides
  ├── 💀 death
  ├── 🚪 abandon
  └── 🌀 calcined         — Calamine = 100
       ↓
  📖 CHRONIQUE générée (17-RUN-CHRONICLE)
       ↓
  Héritage transmis (artefact + écho)   [sauf calcined]
       ↓
  🏚️ Retour à l'auberge — connaissance et accès acquis
```

🟢 _Une boucle avec une destination. Le joueur sait pourquoi il part, mais jamais exactement ce que
le monde lui réserve. Acteur, jamais spectateur._

> **Note sur les 3 actes (§6).** La structure dramatique invisible n'est pas supprimée : elle
> continue de rythmer la narration **à l'intérieur** d'un run. La structure mécanique existe en
> parallèle côté backend, mais reste invisible pour préserver le mystère.

---

## 10. Ce qui fait revenir le joueur (les 3 crochets de rétention)

La structure du run est invisible — la **rétention** se joue ailleurs. Trois crochets, à muscler en priorité :

### 🪝 Crochet 1 — La Chronique

À la fin du run, l'IA génère un **récit illustré** (3-5 paragraphes, style livre) de ce qu'a vécu le joueur. Personne d'autre n'aura la même. Le joueur peut la **partager**. Voir `17-RUN-CHRONICLE.md`.

### 🪝 Crochet 2 — Les Souvenirs nommés

Quand le joueur fait un acte mémorable (Nat 20 légendaire, décision morale dure, PNJ marquant), il gagne un **Souvenir nommé** : _"La nuit où tu as épargné l'Inquisiteur Vane"_. Ces Souvenirs s'affichent dans son hub permanent (chez L'Aveugle), et **L'Aveugle les évoque** au run suivant. Voir `11-INVENTORY-ECONOMY.md` §3 et `14-META-WORLD.md`.

### 🪝 Crochet 3 — Le monde change

Entre les runs, le **méta-monde** évolue selon les actions du joueur. Tué l'Inquisiteur Vane ? Au run 2, le Culte des Cendres est affaibli dans les villes que tu visites. Sauvé un PNJ ? Il réapparaît. Voir `14-META-WORLD.md`.

### 🪝 Crochet 4 — Je sais des choses que je ne savais pas _(ajout 2026-08-06)_

Les trois crochets ci-dessus sont tous **narratifs**. Ils font revenir un joueur qui aime l'histoire,
pas un joueur qui veut jouer. C'est ce qui manquait au diagnostic « aucune raison de rejouer ».

Le quatrième crochet est **mécanique** : entre deux runs, le joueur gagne de la **connaissance** et
de l'**accès** — pages de bestiaire, sujets débloqués chez L'Aveugle, contrats plus dangereux,
destinations et compagnons rencontrés. Jamais de la puissance (`01-PILLARS §5`).

> Le run 6 n'est pas plus facile que le run 1. C'est **le joueur** qui est meilleur — parce qu'il
> reconnaît une créature, comprend un avertissement et sait quelles provisions emporter.

Voir `14-META-WORLD.md` et `23-RUN-STRUCTURE §7`.

🟢 _La structure du run est libre, mais la **mémoire** qu'il laisse est forte. C'est pour ça qu'on revient._

---

_Le **prologue** (la première application de cette boucle) est détaillé dans `07-CHARACTER-CREATION.md`._
_Les **dés** qui arbitrent les pivots sont détaillés dans `08-DICE-RESOLUTION.md`._
_La **Chronique** générée en fin de run est détaillée dans `17-RUN-CHRONICLE.md`._
_Les **prompts IA** qui pilotent la boucle sont détaillés dans `15-GAME-MASTER.md`._
