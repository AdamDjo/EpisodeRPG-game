# 11 — Inventaire & Économie

> _L'or se perd. La mémoire reste._

---

> **⚙️ Périmètre d'implémentation — Survie v2 (2026-07)**
> Ce fichier décrit l'économie **cible complète**. Le chantier Survie v2 n'en implémente qu'un **sous-ensemble** :
>
> - ✅ **Acquisition** d'objets (l'IA signale un objet trouvé via `itemGained`, cf. `15-GAME-MASTER §4.5` → le backend le persiste dans les 4 catégories §1).
> - ✅ **Usage / consommation** (appliquer un `ItemEffect` : soin, réduction de Calamine, retrait de condition).
> - ✅ **Équipement** dans les 8 slots §1.
> - ⏳ **Différé** (hors périmètre v2) : or in-game (§2), marché/négociation (§7), banque de L'Aveugle (§6), artisanat (§8), tiers de rareté économiques (§4), dégradation d'héritage (§5).
>
> Autrement dit : v2 branche la **possession et l'usage** des objets, **pas** l'économie monétaire.

> **🎲 Refonte roguelike (2026-08-06)**
> Trois évolutions décidées lors du grilling, à lire avec `23-RUN-STRUCTURE.md` :
>
> - **§1 — le sac est délibérément trop petit** : la place gardée libre pour le butin est le nerf de la préparation
> - **§4bis — usure en 3 paliers** (intact / usé / brisé), réparable à la forge de l'auberge
> - **§5 — les artefacts deviennent des pouvoirs activables** payés en Calamine, et non des objets à effet passif
>
> ⚠️ **Nom de la monnaie (décision du 2026-08-09)** : la monnaie de Velkhar est l'**or**. Le moteur
> la persiste sous `Character.gold` (#249). Le pictogramme 🪙 est conservé pour la lisibilité des
> tableaux.
>
> _Historique_ : la monnaie s'est appelée « fer » entre Survie v2 et le 2026-08-09, et ce fichier
> a un temps interdit explicitement le mot « or ». Cette interdiction est **levée** : ne pas la
> rétablir. Le fer reste un **matériau** du monde (armes, armures, « odeur de fer chaud ») — seule
> la monnaie change de nom.

---

## 0. Principe

GRIMOIRE a une économie à **deux niveaux** — l'un meurt avec le perso, l'autre persiste à travers les runs. C'est ce qui rend le roguelike "strict" (tu peux tout perdre) **supportable** : le joueur sait qu'il rebâtira, et ce qui compte vraiment (Souvenirs, artefact, écho) traverse la mort.

| Niveau      | Monnaie      | Persistance         | Usage                                              |
| ----------- | ------------ | ------------------- | -------------------------------------------------- |
| **In-game** | 🪙 Or        | Perdu à la mort     | Achat équipement, repos, services                  |
| **Méta**    | 📖 Souvenirs | Persistent à jamais | Lore + identification d'artefacts (chez L'Aveugle) |

> _La mort fait mal — mais elle ne ramène jamais à zéro. C'est ce qui te fait revenir._

---

## 1. L'inventaire du joueur

Limité par **encombrement** (slots), pas par poids en kg. Lisible, simple.

### Les 4 catégories

```
┌─────────────────────────────────────────────────┐
│  ⚔️  ÉQUIPEMENT PORTÉ      (8 slots fixes)       │
│  ────────────────────────────────────────────    │
│  [main]      [secondaire]     [armure]    [cape] │
│  [tête]      [accessoire]     [ceinture]  [pied] │
│                                                  │
│  🎒  SAC                    (12-15 slots libres) │
│  ────────────────────────────────────────────    │
│  consommables · matériaux · objets d'aventure    │
│                                                  │
│  🔮  ARTEFACT               (1 slot dédié)       │
│  ────────────────────────────────────────────    │
│  ne compte pas dans l'encombrement               │
│  ne se vend pas, ne se jette pas                 │
│                                                  │
│  📜  TROUSSEAU              (illimité)           │
│  ────────────────────────────────────────────    │
│  clés, lettres, papiers — narratif seulement     │
└─────────────────────────────────────────────────┘
```

### Règles

- 🟢 **Sac plein** → l'IA propose : laisser un objet, ou refuser le loot
- 🟢 **Pas d'extension de sac** (pas de "sac de Holding") — garde la friction
- 🟢 **L'artefact** a son propre slot pour ne jamais être en compétition avec un objet trivial
- 🟢 **Le trousseau** existe pour stocker des choses qui n'ont qu'une valeur narrative (lettres, clés, médaillon souvenir d'un PNJ)

🟢 _Limitation intentionnelle : un perso n'est pas un coffre. Choisir ce qu'on prend = choix tactique._

### 🎒 Le sac est délibérément trop petit

> **C'est le nerf de la préparation** (décision du 2026-08-06, voir `23-RUN-STRUCTURE §1`).

La capacité du sac n'est pas une limite technique : c'est **la contrainte qui rend l'auberge
intéressante**. Elle crée un arbitrage impossible à esquiver :

```
   Emporter plus de vivres et d'eau
         ↓
   moins de place pour le butin
         ↓
   devoir rentrer plus tôt

   Emporter moins
         ↓
   plus de place pour le butin
         ↓
   avancer plus longtemps… mais le retour devient mortel
```

Le joueur doit **garder des slots libres à l'aller** pour ce qu'il compte ramener. Un sac plein au
milieu d'une quête signifie qu'on ne peut plus rien prendre — ou qu'il faut jeter quelque chose de vital.

🔴 _Anti-règle : ne jamais assouplir la capacité pour « confort ». Sans cette contrainte, la
préparation à l'auberge n'est qu'un clic, et la décision de continuer perd son poids._

---

## 2. L'or in-game (🪙)

La monnaie courante de Velkhar. Simple, sale, **mortelle**.

> **Nom canon : l'or.** Persisté par le moteur sous `Character.gold`. Ne jamais l'appeler « fer »
> dans l'UI ni dans les prompts IA.

### Sources

| Source                         | Gain typique                            |
| ------------------------------ | --------------------------------------- |
| Pillage d'ennemi humain        | 1-10 🪙 (brigand) à 50 🪙 (Inquisiteur) |
| Vente d'équipement             | ~30% du prix d'achat                    |
| Vente de matériaux             | 1-20 🪙 selon rareté                    |
| Contrat (Lame-Ombre, Marcheur) | 30-150 🪙                               |
| Quête principale               | 50-300 🪙                               |
| Loot de coffre                 | 10-100 🪙                               |

### Dépenses

| Service                                         | Coût      |
| ----------------------------------------------- | --------- |
| 🏠 Repos en auberge (1 nuit)                    | 5 🪙      |
| 🍖 Repas chaud                                  | 1 🪙      |
| 💧 Outre d'eau pleine                           | 2 🪙      |
| 🩹 Soins (1d6+2 PV, retire 1 condition mineure) | 10 🪙     |
| 🗡️ Arme commune                                 | 15-40 🪙  |
| 🛡️ Armure commune                               | 25-80 🪙  |
| 🤐 Soudoyer un garde                            | 20-100 🪙 |
| 🐎 Voyage caravane (entre régions)              | 30-50 🪙  |
| 📜 Information de bas étage (rumeur)            | 5-15 🪙   |

### Règle de la mort

```
🩸 MORT DU PERSONNAGE
   ↓
🪙 Or porté = PERDU À 100%
   ↓
Sauf si déposé chez L'Aveugle (voir §6)
```

🟢 _L'or est **précaire**. Le joueur doit décider : tout dépenser maintenant ? mettre en banque ? prendre le risque ?_

> **Fonction dans la boucle roguelike** : l'or ramené d'un run **finance le suivant** — équipement,
> réparations à la forge, contrats plus ambitieux. C'est ce qui relie deux runs sans donner de
> puissance permanente (`01-PILLARS §2`, pilier 5). Rentrer bredouille n'est pas neutre : c'est un
> run suivant plus pauvre, donc plus court.

---

## 3. Les Souvenirs (📖 monnaie méta)

C'est la **monnaie de l'âme**. Persistent à jamais.

### Sources

| Source                                     | Gain                                  |
| ------------------------------------------ | ------------------------------------- |
| 🎁 Prologue (L'Aveugle)                    | 1 Souvenir gratuit                    |
| 🏆 Acte mémorable en run                   | 1-3 Souvenirs nommés (cf. crochet #2) |
| 📖 Fin de run (Chronique)                  | 1 Souvenir bonus selon performance    |
| 💀 Mort héroïque (boss vaincu juste avant) | 1 Souvenir nommé                      |

### Souvenirs anonymes vs nommés

| Type        | Description                                                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Anonyme** | Fragment de lore générique (_"La brume dorée tue"_) — utilisable comme monnaie                                               |
| **Nommé**   | Acte spécifique du joueur (_"La nuit où tu as épargné l'Inquisiteur Vane"_) — narratif, non dépensable, évoqué par L'Aveugle |

🟢 _Distinction clé : les nommés **ne se dépensent pas** — ce sont des médailles d'histoire. Les anonymes oui._

### Comment obtenir un Souvenir nommé

L'IA marque un acte comme "nommé" si **au moins 2 critères** sont remplis :

- Décision morale dure (épargner, trahir, sacrifier)
- Nat 20 dans un contexte épique
- Boss vaincu / défi extraordinaire
- PNJ marquant ayant impacté le run
- Premier acte d'un type (premier Calciné tué, première trahison)

### Dépense des Souvenirs

Uniquement chez L'Aveugle (voir `07-CHARACTER-CREATION §5`) :

| Achat                            | Coût        | Effet                                                        |
| -------------------------------- | ----------- | ------------------------------------------------------------ |
| 📖 Fragment de lore              | 1 Souvenir  | L'IA génère un fragment cohérent avec l'historique du joueur |
| 🔮 Identification d'artefact     | 1 Souvenir  | L'IA génère nom, histoire, faiblesse, effet d'éveil          |
| 🎯 Indice sur une quête en cours | 2 Souvenirs | L'Aveugle donne une piste concrète                           |
| 🌍 Carte d'une région            | 3 Souvenirs | Débloque une mini-carte mentale + lieux d'intérêt            |
| ⚖️ Conseil moral                 | 1 Souvenir  | L'Aveugle juge un dilemme (rare, casse sa neutralité)        |

🟢 _Les Souvenirs sont **le moteur méta** : ils donnent envie de jouer pour comprendre le monde, identifier les artefacts trouvés, et débloquer le lore._

---

## 4. L'équipement (3 tiers simples)

Pas de système de rareté à 7 niveaux. **Trois tiers, c'est tout.**

### Tier 1 — Commun

- **Source** : marché, forgeron, pillage de brigands
- **Style** : cuir, bronze, fer
- **Dégâts** : 1d4-1d6 (armes), CA +1 (armures)
- **Prix** : 15-40 🪙

### Tier 2 — Rare

- **Source** : atelier maître, marché noir, quêtes
- **Style** : acier ouvragé, équipement de guilde, sabre forgé
- **Dégâts** : 1d8-1d10 (armes), CA +2 (armures)
- **Prix** : 80-250 🪙

### Tier 3 — Archontique / Légendaire (artefacts)

- **Source** : loot de donjon, Veilleur archontique vaincu, héritage
- **Style** : matériaux étranges (sable doré figé, métal sans rouille, soie qui bouge)
- **Dégâts** : 1d12 ou 2d6 + effet, CA +2-3 (sans malus)
- **Prix** : **invendable** (les marchands refusent par peur ou par lois)

### Tableau d'armes (référence rapide)

| Arme             | Tier | Dé          | Style                        |
| ---------------- | ---- | ----------- | ---------------------------- |
| Poing            | —    | 1d4         | Par défaut                   |
| Dague            | 1    | 1d4         | Discret, +avantage furtivité |
| Épée courte      | 1    | 1d6         | Polyvalente                  |
| Sabre            | 2    | 1d8         | Tranchant, élégant           |
| Hache de guerre  | 2    | 1d10        | Lourd, à 2 mains             |
| Arc court        | 1    | 1d6         | Ranged, SOUFFLE              |
| Arc long         | 2    | 1d8         | Ranged longue portée         |
| Arbalète lourde  | 2    | 1d10        | 1 tour de recharge           |
| Arme archontique | 3    | 1d12 ou 2d6 | Effet spécial unique         |

### Tableau d'armures

| Armure           | Tier | CA  | Malus                       |
| ---------------- | ---- | --- | --------------------------- |
| Aucune           | —    | +0  | —                           |
| Cuir             | 1    | +1  | —                           |
| Cuir bouilli     | 1    | +1  | + résist. dégâts mineurs    |
| Maille           | 2    | +2  | -1 Furtivité                |
| Plate            | 2    | +3  | -1 Furtivité, -1 Athlétisme |
| Soie archontique | 3    | +2  | — (rare, légère)            |

---

## 4bis. L'usure de l'équipement (3 paliers)

> Décision du 2026-08-06. L'équipement se dégrade en run et se répare à la forge de l'auberge.

### Trois états, jamais une jauge

| État          | Effet                                                              | Réparation                 |
| ------------- | ------------------------------------------------------------------ | -------------------------- |
| ✅ **Intact** | Effet nominal                                                      | —                          |
| ⚠️ **Usé**    | Efficacité réduite, **sensible en jeu**                            | Peu coûteuse               |
| ❌ **Brisé**  | **Inutilisable** — l'arme ne frappe plus, l'armure ne protège plus | **Beaucoup** plus coûteuse |

🔴 _Anti-règle : **jamais de jauge de durabilité chiffrée** (« 47/100 »). Un pourcentage pousse le
joueur à optimiser et transforme l'usure en bruit mental. Trois états se lisent d'un coup d'œil et
se décident sans calcul._

### L'usure est toujours annoncée

> **L'usure ne doit jamais être une taxe silencieuse.**

Chaque changement d'état de l'objet est annoncé au joueur, en langage de personnage :

> _« Ta lame a mordu quelque chose de plus dur qu'elle. Elle ne coupe plus comme avant. »_

C'est une application directe du principe 11 (`01-PILLARS §9`) : le monde futur reste mystérieux,
mais la dégradation déjà subie n'est jamais cachée. Une arme **usée** est une information réelle sur
laquelle le joueur peut décider de faire demi-tour.

### L'arbitrage de la forge

À l'auberge, avant de repartir :

> _« Je répare maintenant, ou je pars comme ça et je risque la casse en profondeur ? »_

Le coût croissant entre **usé** et **brisé** rend l'attentisme punitif sans le rendre fatal. Repartir
avec une arme usée est un choix légitime quand l'or manque — c'est exactement le genre de pari
que le jeu doit permettre.

Voir `23-RUN-STRUCTURE §1` (préparation) et §8 ci-dessous (stations d'artisanat).

---

## 5. Les artefacts (🔮 le cœur de la magie)

Les artefacts sont **la seule source de pouvoir magique** dans Velkhar (cf. décision L3 de `00-SOMMAIRE`). Chaque artefact est **unique** : nom propre, histoire, faiblesse, effet d'éveil.

> **🔮 Décision du 2026-08-06 — l'artefact est un pouvoir activable, pas un objet à effet passif.**
>
> Constat : dans le moteur, un artefact n'était qu'une **potion renommée** (`healAmount` /
> `calamineReduction`). Le joueur ne pouvait rien _faire_ avec.
>
> Le joueur voulait « des sorts ». La réponse retenue n'est **pas** d'ajouter un système de sorts à
> côté du lore, mais de rendre les artefacts réellement activables :
>
> > _C'est exactement le système de sorts demandé, mais diégétique._
>
> _Pourquoi pas des sorts génériques_ : les artefacts portent l'origine du cataclysme (les
> Archontes), le prix payé en Calamine, et la vocation Tisse-Verbe. Les remplacer par des « sorts »
> viderait trois piliers du canon d'un coup.

### Le prix est toujours de la Calamine

Chaque activation **coûte de la Calamine** — la Cendre du monde qui s'accumule dans le corps du porteur
(`06-SURVIVAL §4`, `02-WORLD-BIBLE`). C'est la boucle centrale de la magie de Velkhar :

```
   utiliser un artefact  →  gagner de la Calamine  →  se rapprocher de la fin « Calciné »
```

L'arbitrage est permanent, et il se joue surtout au **retour** :

> _« J'utilise ce pouvoir pour survivre maintenant, ou je garde ma marge de Calamine pour remonter ? »_

> **⚖️ Garde-fou de calibrage** : un pouvoir d'artefact ne doit **jamais** être la solution optimale
> par défaut. Si le meilleur jeu consiste à l'activer à chaque combat, le coût en Calamine est mal
> réglé. Le pouvoir est un **recours**, pas une rotation.

### Deux modes d'usage

#### 🔥 Pouvoir de base (toute vocation)

```
- Usable 1× par scène
- Coûte 5 Calamine (cf. 06-SURVIVAL §4)
- 1d8 dégâts OU effet narratif mineur défini par l'artefact
- Le joueur ne connaît que l'effet de base (sauf si identifié)
```

🟢 _Tout aventurier peut **déclencher** un artefact. Pas que les Tisse-Verbe._

#### 🔮 Éveil (Tisse-Verbe seul)

```
- Usable 1× par scène
- Coûte 10 Calamine
- Effet majeur garanti (effet d'éveil défini par l'artefact)
- Option d'amplification : d20 + SOUFFLE + VOLONTÉ + Éveil  vs  DC artefact
  → Succès : effet amplifié (dégâts doublés, zone élargie, condition spéciale)
  → Échec : juste effet de base (Calamine payée UNE SEULE FOIS)
```

🟢 _L'éveil ne rate **jamais** totalement. Le Tisse-Verbe paye et reçoit toujours au minimum l'effet de base._

### Le pouvoir est un objet de données, pas une phrase de prompt

C'est le point où le moteur diverge du canon aujourd'hui : un artefact est stocké comme un objet à
effet passif (`healAmount`, `calamineReduction`), donc **rien n'est activable**. Le contrat cible :

```ts
type ArtifactPower = {
  readonly id: string;
  readonly label: string; // « Appeler la tempête »
  readonly tier: "base" | "awakening"; // base = toute vocation, awakening = Tisse-Verbe
  readonly calamineCost: number; // 5 pour la base, 10 pour l'éveil
  readonly usesPerScene: number; // 1 en V1
  readonly effect: ArtifactEffect; // résolu par le backend, jamais par l'IA
};
```

Trois règles d'implémentation, toutes déjà impliquées par `docs/tech/RULES.md` :

1. **Le backend résout, l'IA narre.** Le coût en Calamine, le jet, les dégâts et les conditions sont
   calculés côté moteur ; l'IA reçoit le **résultat** et l'habille.
2. **Le pouvoir est visible avant d'être payé.** Le joueur voit le label, le coût en Calamine et le
   compteur d'usage restant **avant** de cliquer. Un pouvoir dont on découvre le prix après coup
   viole le principe 11 (`01-PILLARS §9`).
3. **Un artefact non identifié montre son coût, pas son effet.** L'inconnu porte sur ce qui va se
   passer, jamais sur ce que ça va coûter.

> L'action `awaken_artefact` est **déjà typée** dans les contrats shared mais n'a aucune
> implémentation. Elle est le point d'entrée naturel de cette section. Voir l'EPIC #217.

### Où le pouvoir s'active

| Mode        | Activation                                                                |
| ----------- | ------------------------------------------------------------------------- |
| Combat      | Catégorie d'action **Artefact** (`10-COMBAT §4`) — consomme le tour       |
| Exploration | Action libre dans la scène — résout un obstacle, révèle, force un passage |
| Retour      | Autorisé, et c'est là que l'arbitrage Calamine fait le plus mal           |
| Auberge     | Interdit — l'auberge est un lieu de préparation, pas d'usage              |

### Identification d'artefact

Un artefact trouvé est **non identifié** : le joueur ne connaît que le pouvoir de base (1d8 + brève description IA).

Pour débloquer l'effet d'éveil + nom + histoire + faiblesse → **identification chez L'Aveugle (1 Souvenir)**.

🟢 _Tension : ramener un artefact non identifié, l'utiliser au pouvoir de base, et décider de l'identifier ou pas._

### Catalogue d'artefacts

L'IA **génère les artefacts dynamiquement** à partir d'un catalogue de base (5-10 artefacts canon dans `02-WORLD-BIBLE`) + invention contextuelle. Chaque artefact contient :

```yaml
nom: "La Voix des Sables"
type: "lame courte"
pouvoir_de_base: "1d8 + l'arme chuchote des avertissements au porteur"
effet_eveil: "L'arme appelle une tempête de sable qui aveugle tous les ennemis 2 tours"
amplification: "Aveugle + 1d6 dégâts à tous"
faiblesse: "Refuse de blesser un Sahélin"
histoire: "Forgée par un Archonte pour protéger sa fille du désert"
degradation_a_l_heritage: 3
```

### L'artefact d'héritage

À la mort du perso, l'artefact équipé est **transmis** au successeur.

| Transmission | Effet                                                    |
| ------------ | -------------------------------------------------------- |
| 1ʳᵉ          | Effet d'éveil intact                                     |
| 2ᵉ           | Effet d'éveil intact, faiblesse révélée                  |
| 3ᵉ           | Effet d'éveil **perdu**, garde le pouvoir de base 1d8    |
| 4ᵉ et +      | Devient un simple objet narratif (perte du dé de dégâts) |

🟢 _La dégradation rend l'héritage **réel** : on ne traîne pas un artefact OP éternellement. À chaque mort, le joueur doit en trouver un nouveau pour rester puissant._

---

## 5bis. Les charges d'Emprise et la résistance Calamine (#267)

VOLONTÉ n'est pas qu'un attribut de dialogue : sa réserve mécanique, l'**Emprise**, permet de
**forcer le monde** au lieu de le négocier. Table complète, dérivation du modificateur et les 4
actions couvertes : `04-ATTRIBUTES.md` § « Les charges d'Emprise ».

### La résistance Calamine réduit le prix, jamais le principe

Dépenser une charge d'Emprise coûte de la Calamine, exactement comme activer un artefact (§5). La
**résistance Calamine** (dérivée du modificateur de VOLONTÉ, même table que les charges) réduit ce
coût sans jamais l'annuler : une VOLONTÉ élevée rend l'Emprise moins cher à exercer, elle ne la
rend jamais gratuite. Le garde-fou de calibrage du §5 s'applique à l'identique : forcer le monde
doit rester un recours, pas la solution par défaut.

### Le principe 11 s'applique aussi à l'Emprise

Comme pour un artefact, le coût en Calamine d'une dépense de charge (après résistance) est
**toujours visible avant validation** — jamais découvert après coup. Une charge à 0 rend l'action
correspondante indisponible ; elle ne doit jamais être proposée par l'IA.

### Rechargement au feu de camp

Un repos au feu (`06-SURVIVAL.md` §4) recharge les charges d'Emprise au maximum du personnage.
Cela n'a aucun effet sur le coût Calamine du repos lui-même, déjà fixé à −10 et indépendant de
cette mécanique : recharger l'Emprise est additif, pas un second prix ou un second gain de
Calamine.

---

## 6. La banque de L'Aveugle (optionnel)

Le joueur peut **déposer** de l'or à l'auberge **avant** de partir en run.

```
🏠 L'Aveugle accepte des dépôts.
   - Frais : 5% du montant (ou 1 Souvenir si dépôt > 100 🪙)
   - Récupérable au retour vivant
   - PERDU si mort (L'Aveugle "oublie" qui était le porteur)
```

🟢 _Mécanique optionnelle qui adoucit le roguelike strict. Le joueur peut protéger une partie de sa mise au coût d'un risque (la banque ne survit pas à la mort) + petits frais._

### Pourquoi pas garantir 100% à la mort ?

Parce que le pilier #3 (mort = tout perdu sauf héritage) est intouchable. La banque permet juste de ne pas **gaspiller** l'or au lieu de l'emmener, sans casser la tension.

---

## 7. Le marché in-game

Pas de prix fixes. La **négociation** est mécanique :

```
Jet : d20 + VOLONTÉ + Persuasion  vs  DC 12 (marchand normal) à 18 (Guilde stricte)
```

→ **Échec** : prix de base (référence des tableaux §4)
→ **Succès** : -10% (acheter) ou +10% (vendre)
→ **Succès remarquable** : -20% ou +20%
→ **Nat 20** : -50% OU objet bonus (le marchand "oublie" un détail)
→ **Échec critique** : prix +10% (le marchand se sent insulté)

🟢 _Le triptyque a un impact économique : un VOLONTÉ +3 paye moins cher, gagne plus à la vente._

### Variations selon réputation

- 🟢 **Allié d'une faction** → -10% chez ses marchands
- 🔴 **Ennemi d'une faction** → +20% chez ses marchands, ou refus de vente
- 🟡 **Inconnu** → prix normal

---

## 8. L'artisanat (V1 minimal)

Pas de système complexe de recettes. **3 stations dans le monde** :

| Station           | Service                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| 🔨 **Forgeron**   | Réparer arme/armure (5-30 🪙) · forger amélioration (matériau + 50 🪙 → +1 dé) · personnaliser (cosmétique gratuit) |
| 🌿 **Herboriste** | Distiller potion (matériau + 10 🪙 → soin / antidote / boost)                                                       |
| 📜 **Scribe**     | Recopier une lettre · falsifier un document (VOLONTÉ + 30 🪙) · acheter une carte régionale (50 🪙)                 |

🟢 _L'IA narre l'artisanat. Pas de mini-jeu, pas d'attente. Le joueur dépose matériau + or, reçoit objet._

---

## 9. Les donjons & le loot

Les **donjons** sont là où dorment les artefacts (cf. décision L5).

### Structure d'un donjon

```
1. ENTRÉE (un seuil — porte scellée, fissure dans une falaise, descente sous un temple)
   ↓
2. SALLE 1 — Exploration / énigme narrative (DC SOUFFLE Investigation)
   ↓
3. SALLE 2 — Combat (Calcinés, brigands, créature sauvage)
   ↓
4. SALLE 3 — Pivot moral OU énigme + récompense mineure (loot Tier 1-2)
   ↓
5. SALLE BOSS (optionnelle) — combat ou défi narratif épique
   ↓
6. CHAMBRE FINALE — coffre / artefact / révélation lore
```

🟢 _Court (3-5 salles), dense (chaque salle compte), récompense garantie._

### Loot garanti par donjon

- 🔮 **1 artefact** OU 50-200 🪙 + matériaux
- 📖 **1 Souvenir potentiel** (si comportement marquant)
- ⚔️ **1 équipement Tier 2** (parfois Tier 3 si boss vaincu)

🟢 _Le joueur ne sort jamais d'un donjon les mains vides. C'est le **moteur de loot** du jeu._

### Variantes

- **Donjon mineur** (3 salles, 1 récompense)
- **Donjon majeur** (5-7 salles, boss, artefact garanti)
- **Donjon archontique** (rare, 7-10 salles, plusieurs artefacts, boss épique)

### ⛏️ Le donjon est un lieu de quête, pas nécessairement le run entier

> **Révision du 2026-08-08.** Un contrat peut conduire à un donjon, mais aussi à une escorte, une
> enquête, une chasse ou un dilemme. Le moteur peut segmenter un donjon en salles et paliers
> internes ; cette structure reste cachée au joueur en v0.2.1 (`23-RUN-STRUCTURE §4`).

Deux conséquences directes sur les règles ci-dessus :

| Règle §9                                     | Lecture dans la boucle de run                                                                       |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| « Le joueur ne sort jamais les mains vides » | Vrai pour un donjon complété. Un run interrompu peut finir à vide si le joueur rentre sans objectif |
| Loot garanti (artefact / or / Tier 2)        | Garanti à la résolution du lieu, mais acquis seulement si le joueur rentre vivant à l'Auberge       |
| Salle boss « optionnelle »                   | Peut porter l'objectif d'un contrat de donjon sans que sa présence soit annoncée à l'avance         |

C'est la nuance qui rend la boucle tendue : **continuer est récompensé, rentrer est ce qui compte.**
Le butin n'est jamais compté au moment où on le ramasse, seulement au moment où on ressort vivant.

---

## 10. Risques & garde-fous

| Risque                                            | Mitigation                                                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Inflation économique**                          | Prix dynamiques selon faction/réputation. Pas de gold-sink illimité (pas de "gemme à 10k 🪙")                            |
| **Inventaire chaotique**                          | 8+12 slots fixes, pas d'extension. Le joueur doit choisir                                                                |
| **Artefact d'héritage abusé**                     | Dégradation après 3-4 transmissions. Garantit le besoin de trouver de nouveaux artefacts                                 |
| **Souvenirs accumulés sans usage**                | L'Aveugle propose **toujours** des achats au retour. Le joueur ne doit jamais se demander "que faire de mes Souvenirs ?" |
| **Mort frustrante (perte de 200 🪙)**             | Banque de L'Aveugle. Et l'héritage minimise la perte ressentie                                                           |
| **Joueur qui spam les artefacts non-Tisse-Verbe** | Coût de 5 Calamine par usage, cumulatif. Risque réel à long terme                                                        |
| **Donjon vide / sans loot**                       | Règle absolue : tout donjon termine sur **au moins** 1 récompense substantielle                                          |

---

## 11. Synthèse — Tableau économie

```
╔════════════════════════════════════════════════════════════════════╗
║                    ÉCONOMIE DE GRIMOIRE                            ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  IN-GAME  🪙 OR                         MÉTA   📖 SOUVENIRS       ║
║  ─────────────────────────              ──────────────────────     ║
║  Source : pillage, contrats,            Source : prologue (1)      ║
║   vente, quêtes                          + actes mémorables        ║
║                                          + bonus fin de run        ║
║                                                                    ║
║  Usage  : équipement, repos,            Usage  : lore,             ║
║           soins, services,                       identification    ║
║           pots-de-vin                            d'artefact,       ║
║                                                  indices de quête  ║
║                                                                    ║
║  Mort   : PERDU 100%                    Mort   : PERSISTENT        ║
║   (sauf dépôt L'Aveugle, 5% frais)              (jamais perdus)    ║
║                                                                    ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  INVENTAIRE                              ÉQUIPEMENT 3 TIERS        ║
║  ─────────────────────────              ──────────────────────     ║
║  ⚔️  8 slots équipement                 1 - Commun (cuir, fer)    ║
║  🎒 12 slots sac (délibérément          2 - Rare (acier, soie)    ║
║      trop petit — §1)                                             ║
║  🔮 1 slot artefact (dédié)             3 - Archontique           ║
║  📜 trousseau illimité (narratif)            (artefacts)          ║
║                                                                    ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  ARTEFACTS                               HÉRITAGE                  ║
║  ─────────────────────────              ──────────────────────     ║
║  Pouvoir de base : 1d8, 5 Calamine      1 artefact transmis        ║
║   (toute vocation, 1×/scène)            Dégrade 3-4 runs           ║
║                                                                    ║
║  Éveil (Tisse-Verbe) : 10 Calamine      + écho réputation/         ║
║   effet majeur garanti                    savoir mineur            ║
║   + amplif optionnelle (d20)                                       ║
║                                                                    ║
║  Identification : 1 Souvenir                                       ║
║   (chez L'Aveugle)                                                 ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

🟢 _Économie à 2 niveaux. Roguelike strict adouci par la persistance des Souvenirs et de l'héritage. Tout achat = un choix, jamais un grind._

---

_Les **vocations** (équipement de départ) sont détaillées dans `05-VOCATIONS.md`._
_L'**équipement de survie** (gourde, masque filtrant, etc.) est détaillé dans `06-SURVIVAL.md` §8._
_Le **combat** (armes, CA, dégâts) est détaillé dans `10-COMBAT.md`._
_Les **Souvenirs** persistent dans le **méta-monde** détaillé dans `14-META-WORLD.md`._
_L'**héritage à la mort** est lié à la **Chronique** détaillée dans `17-RUN-CHRONICLE.md`._
_La **création de perso** qui inclut le 1ᵉʳ Souvenir gratuit est détaillée dans `07-CHARACTER-CREATION.md`._
