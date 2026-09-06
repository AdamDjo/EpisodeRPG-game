# 10 — Combat

> _Le sang sèche vite dans le désert. Frappe juste, ou parle bien._

---

## 0. Principe

> **⚠️ Statut de ce document (2026-08-06) — spec complète, implémentation nulle.**
>
> Tout ce qui suit est **déjà spécifié et validé**. Rien n'est à réécrire. En revanche, **rien n'en
> est implémenté** : le moteur ne connaît ni initiative, ni tours, ni CA, ni conditions de combat.
> Aujourd'hui un « combat » n'est qu'une scène narrative de plus, avec au mieux un jet de dé.
>
> **C'est la cause n°1 du « le jeu est ennuyeux »** : le document décrit un jeu tactique que le
> joueur n'a jamais pu toucher.
>
> Ce fichier est donc à lire comme un **cahier des charges d'implémentation** pour l'EPIC #215, pas
> comme une description de l'existant.

Le combat dans GRIMOIRE utilise les mêmes attributs et le même dé que le reste du jeu
(`09-ACTION-LOOP`). Pas de grille hexagonale, pas de positionnement précis au pixel : on cherche le
**ressenti tactique de BG3** sans la complexité d'un wargame.

> **🎛️ Correction du 2026-08-06 — le combat est un mode dédié.**
>
> La version précédente affirmait que le combat « n'est pas un mode de jeu » et n'était qu'une
> application de la boucle narrative. **C'est révoqué** (décision 7 de la refonte roguelike).
>
> Le combat est la **seule transformation tactique de l'interface narrative** : liste des ennemis
> avec leur état, ordre des tours, actions catégorisées et journal des jets. Le décor du lieu et la
> dernière scène restent dans la continuité ; à la fin, le joueur revient au storytelling.
>
> _Pourquoi_ : principe 12 (`01-PILLARS §9`) — le storytelling porte tout le run, mais un combat
> rendu comme un paragraphe de plus se **lit** comme un paragraphe de plus. La scène doit donc se
> resserrer et révéler ses règles sans donner l'impression de quitter l'aventure.
>
> La bascule reste **narrative et annoncée** (§1) — ce qui change, c'est ce que le joueur voit à
> l'écran une fois qu'elle a eu lieu.

> _Le but : que chaque combat soit court, lisible, lourd de conséquences. Pas un combat trash à éviter — un combat qui change la suite du run._

### Les 3 promesses du combat

- 🟢 **Court** : 3 à 7 tours max. L'IA force la conclusion si ça traîne
- 🟢 **Lisible** : le joueur sait toujours ce qu'il peut faire et pourquoi
- 🟢 **Triptyque** : SANG ≠ seul attribut utile. SOUFFLE (précision) et **VOLONTÉ (leader)** ont leur rôle

---

## 1. Quand un combat se déclenche

Le combat n'est **jamais activé par le joueur** : c'est une **bascule narrative** annoncée par l'IA,
qui transforme temporairement la scène en combat (§0).

### Déclencheurs

| Type                                | Exemple                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------ |
| ⚔️ **Rencontre hostile non évitée** | Le joueur a tenté de passer en force, ou la persuasion a échoué          |
| 🌑 **Embuscade**                    | Calcinés qui jaillissent du sable, brigands cachés derrière une dune     |
| 🛡️ **Défi**                         | Un duel, un PNJ qui provoque, un Inquisiteur qui exige réparation        |
| 🤝 **Défense d'un PNJ**             | Le joueur choisit de protéger quelqu'un                                  |
| 💀 **Sauvage**                      | Un Calciné, un Ventre-Gris, un Veilleur archontique qui repère le joueur |

### L'annonce IA

L'IA bascule explicitement en mode combat avec un encart :

```
┌────────────────────────────────────────┐
│           ⚔️  LE COMBAT COMMENCE         │
│                                          │
│  Trois Calcinés rampants surgissent.    │
│  Le plus proche est à dix pas.          │
└────────────────────────────────────────┘
```

🟢 _Le joueur sait qu'il entre en combat. Pas de jet d'initiative caché ni de switch d'UI déroutant._

### Éviter le combat

Avant l'engagement, l'IA propose **toujours** une option de désamorçage (sauf embuscade pure) :

- Fuir (jet SOUFFLE)
- Parlementer (jet VOLONTÉ)
- Intimider (jet VOLONTÉ)
- Se cacher (jet SOUFFLE + Furtivité)

Le combat **doit être un choix** — pas un funnel forcé.

---

## 2. L'initiative

Un **seul jet d'initiative**, pas un par PNJ.

```
Joueur : d20 + SOUFFLE
Camp ennemi : d20 + SOUFFLE (moyen du groupe)
```

- 🟢 **Plus haut = commence** (joueur ou ennemi)
- 🟢 **Égalité = joueur en premier** (privilège tactique)
- 🟢 Tous les ennemis agissent **en bloc** quand c'est leur tour (l'IA résout le camp adverse en 1 paragraphe)

🟢 _Simplification volontaire : pas de tour individuel par PNJ. Le rythme est tenu._

---

## 3. Un tour de combat

Le tour du joueur = choix d'**une action** parmi 4 catégories. L'IA propose **3-4 options spécifiques** selon le contexte (comme dans la boucle normale, voir `09-ACTION-LOOP §3`).

### Les 4 catégories d'action

#### ⚔️ Attaque

Frapper, tirer, charger. Jet **d20 + attribut + compétence** vs **CA** ennemie.

```
SANG → mêlée (Mêlée), poings, charge
SOUFFLE → tir (Tir), dague de jet, arc
```

Si touche → dégâts (dé d'arme + mod attribut, voir `08-DICE §7`).

#### 🛡️ Défense / Esquive

Le joueur sacrifie son action pour :

- **Avantage** sur sa prochaine sauvegarde (un coup arrive ? +d20)
- **Désavantage** sur la prochaine attaque qui le vise
- **Soin léger** s'il s'écarte (1d4 PV si bandage)

🟢 _Action "passe" intelligente : utile quand le joueur attend un meilleur moment, soigne, ou couvre un allié._

#### 🗣️ Commandement (VOLONTÉ — le rôle clé)

Voir §5. Le joueur **utilise sa voix** pour modifier le champ de bataille.

#### 🔮 Artefact

Le joueur active un artefact (toute vocation, 1×/scène, voir `11-INVENTORY-ECONOMY §5`) :

- **Pouvoir de base** : 1d8 dégâts ou effet narratif, coûte 5 Calamine
- **Éveil** (Tisse-Verbe seul) : effet majeur garanti + d20 amplification, coûte 10 Calamine

🟢 _L'artefact en combat = "spell slot" thématique. Précieux, à choisir au bon moment._

### Exemple de tour

> _Trois Calcinés rampants. Le plus proche t'a touché au bras. Tu as 7/11 PV._

**Choix proposés par l'IA** :

1. ⚔️ Frapper le Calciné en face (Mêlée — SANG +1) _[option offensive]_
2. 🗣️ Crier pour faire reculer les autres (Intimidation — VOLONTÉ +2) _[option leader]_
3. 🛡️ Reculer et bander ta blessure (Défense + soin 1d4) _[option défense]_
4. ✍️ _Autre action_

---

## 4. La Classe d'Armure (CA)

**Formule non-linéaire (#265)**, dérivée du mod SOUFFLE — pas un `10 + mod` plat, pour que
chaque palier de SOUFFLE se sente comme un vrai gain défensif :

| mod SOUFFLE | CA de base |
| ----------- | ---------- |
| ≤ −1        | 10         |
| 0           | 11         |
| +1          | 13         |
| +2          | 15         |
| +3          | 16         |
| +4          | 17         |

Le bonus d'armure (équipement, #266) s'ajoute par-dessus cette base :

| Armure                  | Bonus CA | Malus                       |
| ----------------------- | -------- | --------------------------- |
| Aucune                  | 0        | —                           |
| Cuir                    | +1       | —                           |
| Maille                  | +2       | -1 Furtivité                |
| Plate                   | +3       | -1 Furtivité, -1 Athlétisme |
| Soie archontique (rare) | +2       | — (artefact)                |

🟢 _La CA évolue avec l'équipement. Le joueur ressent immédiatement l'effet d'une nouvelle armure._

### L'action supplémentaire de SOUFFLE (#265)

Un SOUFFLE élevé accélère aussi le tempo du combattant, indépendamment de la CA :

| mod SOUFFLE | Action supplémentaire au tour |
| ----------- | ----------------------------- |
| ≤ +1        | Non                           |
| +2          | Probabiliste — 2 tours sur 3  |
| ≥ +3        | Oui, systématiquement         |

🟢 _Le mod +2 est volontairement probabiliste : le palier +1 → +2 ne doit pas se lire comme un
seuil dur qui double le nombre d'actions d'un coup._

### CA des ennemis (référence rapide)

| Type                 | CA  |
| -------------------- | --- |
| Civil, ivrogne       | 8   |
| Brigand léger        | 11  |
| Soldat équipé        | 14  |
| Inquisiteur          | 16  |
| Calciné rampant      | 12  |
| Veilleur archontique | 18  |

---

## 5. Le rôle de VOLONTÉ — "Leader"

C'est **la décision design clé** de GRIMOIRE-combat. VOLONTÉ n'est pas qu'un attribut social — c'est un **rôle de soutien tactique** au combat.

### Les 3 compétences de Leader

#### 🗣️ Intimidation (VOLONTÉ — vs VOLONTÉ ennemi)

```
d20 + VOLONTÉ + Intimidation  vs  d20 + VOLONTÉ adverse
```

→ **Succès** : 1 ennemi recule, hésite, **passe son tour suivant** OU fuit (si CA < 11)
→ **Succès remarquable** : 2 ennemis touchés
→ **Échec critique** : les ennemis sont galvanisés, +1 attaque sur prochain tour

🟢 _Usable sur ennemis humains et Calcinés faibles. Inefficace sur Veilleurs archontiques (sans peur) ou Calcinés à un stade avancé._

#### 🛡️ Commandement (VOLONTÉ — vs DC fixé)

```
d20 + VOLONTÉ + Leadership  vs  DC 12 (allié humain) ou 14 (allié bête / mercenaire)
```

→ **Succès** : 1 allié IA agit **immédiatement** avec **avantage**
→ **Succès remarquable** : 2 alliés
→ **Échec** : pas d'effet (l'allié hésite ou ignore)

🟢 _Le Commandement transforme un combat en groupe. Sans VOLONTÉ, les alliés agissent selon la logique IA. Avec, le joueur dirige._

#### 👁️ Présence (passive)

Si le joueur a **VOLONTÉ ≥ +2** : les ennemis basiques (Calcinés rampants, brigands, animaux) **hésitent** avant le 1ᵉʳ tour — l'IA leur applique **désavantage** sur leur première attaque.

🟢 _Récompense pour les builds VOLONTÉ-pures (Tisse-Verbe, concept "leader", peuple Rivain)._

### Bonus Tisse-Verbe au combat

Le Tisse-Verbe (VOLONTÉ +1, SOUFFLE +2) a une **synergie unique** : son éveil d'artefact est **amplifié par VOLONTÉ**.

```
Éveil normal :     d20 + SOUFFLE + Éveil  vs  DC artefact
Éveil amplifié :   d20 + SOUFFLE + VOLONTÉ + Éveil  vs  DC artefact
```

→ Le Tisse-Verbe **commande l'artefact par la voix**. C'est lui le seul à activer ce bonus.

🟢 _Mécanique = le triptyque a du sens. Pas un attribut "social-only"._

---

## 6. Les conditions de combat

En plus des conditions générales de `06-SURVIVAL §2`, le combat ajoute :

| Condition      | Cause                                     | Effet                                                     | Durée              |
| -------------- | ----------------------------------------- | --------------------------------------------------------- | ------------------ |
| 🔗 **Engagé**  | Au contact d'un ennemi en mêlée           | Fuir coûte un jet SOUFFLE, échec = un coup gratuit ennemi | Tant qu'au contact |
| 🎯 **Flanqué** | Encerclé (2+ ennemis adjacents)           | Les ennemis ont **avantage** sur attaque                  | Tant qu'encerclé   |
| 🔨 **Désarmé** | Nat 1 sur attaque, ou Désarmement adverse | Arme tombée, action = ramasser (perdre 1 tour)            | Jusqu'à ramassage  |
| 😨 **Effrayé** | Intimidation réussie sur soi (rare)       | Désavantage attaques, ne peut s'approcher de la source    | 1-2 tours          |
| 🌀 **Étourdi** | Coup à la tête (Nat 20 ennemi en mêlée)   | Perd 1 tour, désavantage prochaine sauvegarde             | 1 tour             |

🟢 _Les conditions sont des **vecteurs de tactique**. Un joueur malin va exploiter le flanc, désarmer, intimider — pas seulement frapper plus fort._

---

## 7. La fuite

Le joueur peut **toujours fuir** un combat. Mais ce n'est jamais gratuit.

```
Jet : d20 + SOUFFLE  vs  DC 12 (combat normal) ou 15 (encerclé / engagé)
```

→ **Succès** : le joueur s'échappe, le combat se termine, narration de fuite
→ **Succès remarquable** : fuite + emporte un objet, ou perd les ennemis
→ **Échec** : un coup ennemi gratuit (dégâts comme une attaque normale), le combat continue
→ **Échec critique** : tombe en fuyant, prochaine action avec désavantage

🟢 _La fuite est viable, mais coûte. Pas un bouton "skip combat"._

### Fuir a une direction

Dans la structure de run (`23-RUN-STRUCTURE`), fuir n'est pas seulement « sortir du combat » : le
joueur choisit **vers où**.

| Direction         | Effet                                                                   |
| ----------------- | ----------------------------------------------------------------------- |
| ⬇️ **En avant**   | Le combat est évité, mais le joueur poursuit sa quête et ses risques    |
| ⬆️ **En arrière** | Le joueur amorce le demi-tour et commence le trajet de retour (`23 §5`) |

C'est ce qui transforme un combat perdu d'avance en **décision** au lieu d'une punition : le joueur
mal en point garde toujours une porte de sortie, mais elle coûte le butin qu'il espérait plus bas.

---

## 8. Mort en combat

Quand les PV tombent à **0 ou moins** :

### Étape 1 — Inconscience

Le perso **n'est pas mort immédiatement**. Il tombe au sol. Le combat continue autour de lui.

### Étape 2 — La décision IA

L'IA décide du sort selon le contexte :

| Contexte                                       | Sort probable                                                          |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| Allié vivant, ennemis affaiblis                | **Sauvé** (l'allié traîne le perso hors du combat, -3 PV à la reprise) |
| Ennemis humains (brigands, Inquisiteurs)       | **Captivité** (le joueur se réveille enchaîné, nouvelle scène)         |
| Ennemis sauvages (Calcinés, bêtes)             | **Mort** (le perso est achevé)                                         |
| Combat en milieu hostile (Ventre-Gris, marais) | **Mort** (les conditions tuent)                                        |

🟢 _La mort effective n'est jamais automatique à 0 PV. L'IA évalue : la mort doit avoir du sens narratif._

> **⚖️ Correction du 2026-08-06 — le backend arbitre, l'IA habille.**
>
> Tel quel, ce tableau confie à l'IA une décision de vie ou de mort. C'est contraire à
> `docs/tech/RULES.md` (« le backend possède toutes les règles ») **et** au principe 11
> (`01-PILLARS §9`) : une mort décidée par un modèle est par construction une mort que le joueur
> n'a pas pu voir venir.
>
> Contrat cible : **le backend calcule le sort** à partir de l'état de la scène (allié vivant ?
> ennemis humains ? milieu hostile ?) — c'est-à-dire exactement les critères de la colonne de
> gauche, mais évalués comme des règles. L'IA reçoit le verdict `saved | captured | dead` et écrit
> la scène correspondante. Elle n'a **jamais** le choix du verdict.
>
> Le tableau ci-dessus reste la **table de vérité** de ce calcul.

### Étape 3 — Si mort effective

- 🟢 Le run se termine
- 🟢 **Chronique générée** (voir `17-RUN-CHRONICLE`)
- 🟢 **Héritage transmis** : 1 artefact + écho réputation (voir `11-INVENTORY-ECONOMY §5`)
- 🟢 Retour à l'auberge avec le **successeur** (voir `07-CHARACTER-CREATION §7`)

🔴 _Anti-règle : pas de "second souffle", pas de potion de revie. La mort, c'est la mort. C'est ce qui rend le combat **tendu**._

---

## 9. Récompenses du combat

Pas de niveau, pas d'XP cumulatif. Les récompenses sont **immédiates et narratives**.

| Récompense                | Source                                                                        |
| ------------------------- | ----------------------------------------------------------------------------- |
| 🪙 **Or**                 | Pillage des cadavres (montant selon ennemi : 1-10 brigand, 20-50 Inquisiteur) |
| ⚔️ **Équipement**         | Arme/armure d'un ennemi vaincu (qualité = celle de l'ennemi)                  |
| 🔮 **Artefact** (rare)    | Loot de boss ou Veilleur archontique                                          |
| 📖 **Souvenir nommé**     | Si combat marquant (boss vaincu, victoire impossible, choix moral fort)       |
| 💭 **Avancée d'intrigue** | L'ennemi laisse une lettre, un indice, un PNJ libéré                          |

🟢 _Pas de barre d'XP. La progression vient de l'équipement, des Souvenirs et de la Chronique — pas d'un score._

---

## 10. Risques & garde-fous

| Risque                                         | Mitigation                                                                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Combat qui traîne**                          | Max 5-7 tours. L'IA accélère le climax (les ennemis se replient, un événement extérieur intervient) si ça dépasse |
| **TPK frustrant**                              | À 0 PV → inconscience d'abord, l'IA décide. Captivité = nouvelle scène, pas game over                             |
| **Combat trash systématique**                  | Les ennemis ne sont jamais "pour XP". Chaque combat = enjeu narratif (lettre, contrat, témoin)                    |
| **VOLONTÉ inutile**                            | Le rôle Leader est core, pas optionnel. Les builds VOLONTÉ doivent briller en combat                              |
| **Tisse-Verbe OP**                             | Coût élevé (10 Calamine/éveil), risque de palier (cf. `06-SURVIVAL §4`), max 1-2 éveils par combat avant danger   |
| **Fuite abusée**                               | Coût en dégâts + perte d'or potentielle + désavantage si échec                                                    |
| **Joueur ne comprend pas pourquoi il a perdu** | Transparence dés (cf. `08-DICE §4`) + narration IA des dégâts (_"Le sabre traverse ton cuir, tu chancelles"_)     |

---

## 11. Synthèse

```
DÉCLENCHEMENT (IA annonce)
   ↓
INITIATIVE (1 jet par camp)
   ↓
TOUR DU JOUEUR
   ↓
Choix : ⚔️ Attaque  ·  🛡️ Défense  ·  🗣️ Commandement  ·  🔮 Artefact
   ↓
DÉ (d20 + attribut + compétence vs CA ou DC)
   ↓
Résolution narrative + dégâts/effet
   ↓
TOUR ENNEMI (IA résout en bloc)
   ↓
   ╴ ╴ ╴ loop (max 5-7 tours) ╴ ╴ ╴
   ↓
FIN
├── 🏆 Victoire → récompenses (or, équip., Souvenir, intrigue)
├── 🏃 Fuite → DC SOUFFLE, coût
└── 💀 0 PV → inconscience → IA décide
        ├── Sauvé (allié)
        ├── Captif (ennemis humains)
        └── Mort → Chronique → Héritage → Successeur
```

🟢 _Combat = boucle d'action tendue. Choix lourds. Conséquences narratives. Triptyque qui compte._

---

_La **résolution des dés** (jets, DC, critiques) est détaillée dans `08-DICE-RESOLUTION.md`._
_Le **triptyque** SANG/SOUFFLE/VOLONTÉ est détaillé dans `04-ATTRIBUTES.md`._
_Les **conditions** (fièvre, poison, blessure, Calamine) sont détaillées dans `06-SURVIVAL.md` §2._
_L'**équipement** (armes, armures, artefacts) est détaillé dans `11-INVENTORY-ECONOMY.md`._
_La **boucle d'action** générale qui englobe le combat est détaillée dans `09-ACTION-LOOP.md`._
