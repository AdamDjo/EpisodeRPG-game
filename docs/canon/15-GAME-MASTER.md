# 15 — Le Game Master (IA)

> **Fichier 15 / Phase C / Pilier #1 (LLM cascade), Pilier #6 (3 voix d'écriture)**
>
> Liens : [09-ACTION-LOOP](09-ACTION-LOOP.md) · [16-MEMORY](16-MEMORY.md) · [17-RUN-CHRONICLE](17-RUN-CHRONICLE.md) · [20-ARCHITECTURE](20-ARCHITECTURE.md) · [19-MONETIZATION](#-références-phase-d) _(Phase D)_

---

## §0 — Principe

**L'IA est une voix, pas un cerveau.**

Le **backend** est Game Master au sens strict : il connaît l'état du monde (stats SANG/SOUFFLE/VOLONTÉ, PV, inventaire, faction, lore Velkhar canon, dés roulés, conséquences). L'IA reçoit cet état et l'**habille en prose**. Elle ne décide jamais.

Si l'IA tente de décider (« le marchand baisse son prix de 30% », « tu trouves un artefact dans le coffre », « le coup porte 8 dégâts »), le backend **rejette son output** et la reprompte avec un rappel explicite : _« Tu narres ce que le moteur t'indique. Tu n'inventes ni stat ni conséquence. »_

C'est la règle qui protège le jeu de l'effondrement : sans elle, l'IA dérive en quelques tours vers une fanfiction incohérente, et le joueur perd confiance.

### §0bis — Contrat actif et continuité de quête

Un contrat est une quête structurée par le backend. À chaque tour hors Auberge, le prompt reçoit :

- l'objectif principal et la destination ;
- les étapes accomplies et les faits qui conditionnent la suite ;
- les conditions de réussite ou d'échec déjà déclenchées ;
- le décor courant sélectionné par le jeu ;
- les derniers détours réellement choisis par le joueur.

L'IA doit respecter l'action libre, même si elle éloigne temporairement de l'objectif. Elle adapte
la scène, rappelle la quête quand le contexte le justifie et propose régulièrement au moins une voie
naturelle pour reprendre sa progression. Elle ne téléporte pas le joueur, ne refuse pas un détour et
ne déclare jamais seule un contrat réussi ou échoué.

La structure cachée du run n'entre pas dans la prose joueur : aucun type de prochaine salle, indice,
palier, profondeur ou estimation de retour. Les calculs internes éventuellement fournis au moteur ne
doivent pas apparaître dans le contexte narratif du modèle.

---

## §1 — Les 3 voix d'écriture (Pilier #6)

GRIMOIRE n'a **aucun audio en V1**. Tout passe par le **texte**. Mais le texte a une voix — un style, un rythme, un vocabulaire. Pour que Velkhar soit vivant, l'IA doit savoir parler en **3 voix distinctes**, jamais mélangées.

### 1.1 — L'Aveugle (PNJ pilier unique)

**Ton** : chaud, ironique, sage paysan. Tutoie toujours. Parle en proverbes désertiques courts.

**Vocabulaire récurrent** : _le sable, le vent, le sel, la cendre, le thé tiède, les os blanchis, la lampe à huile, la porte._

**Anti-pattern interdit** : jamais lyrique, jamais "vieux sage mystérieux". Il est **paysan-prophète**, pas magicien.

**Phrases canoniques** (à injecter dans le prompt comme exemples) :

> « Ah, tu reviens. Le sable t'a recraché, à ce que je vois. Assieds-toi, étranger. Le thé est tiède mais l'histoire sera chaude. »
>
> « Le vent a parlé de toi cette nuit. Pas en bien. Pas en mal. Juste en long. »
>
> « Trois pièces pour le lit. Une pour le thé. Et ton nom, gratuit — je le garderai. »
>
> « Tu portes l'artefact d'un mort. Il pèse plus lourd que tu crois. »
>
> « Un autre a tenté avant toi. Il n'est pas revenu. Toi non plus, peut-être. »

### 1.2 — Narrateur (voix off, descriptions, action)

**Ton** : sec, sensoriel, présent. Phrases courtes. Aucune émotion explicite — il décrit, il ne juge pas. Jamais d'adverbes émotionnels (_tristement, doucement, mystérieusement_ → interdits).

**Règle d'or** : montrer, pas dire. _« Tu as peur »_ est interdit. _« Tes mains tremblent. Le souffle se bloque. »_ est obligatoire.

**Phrases canoniques** :

> « Le vent porte une odeur de fer chaud. Trois silhouettes se découpent contre la dune. Aucune ne bouge. »
>
> « La porte cède sous l'épaule. À l'intérieur, le silence. Et l'odeur — vieille viande, vieille peur. »
>
> « La lame entre. Sort. Le sang noircit le sable en quelques secondes. »
>
> « Tu marches depuis trois heures. La soif est devenue une pensée fixe. »

#### Le registre de potence _(ajout 2026-08-15, #281)_

Le Narrateur applique le positionnement de `01-PILLARS §4` : **le monde est baroque, sa voix reste
sèche**. Il ne commente pas l'horreur, il la **constate** — et c'est le décalage entre l'atrocité de
l'image et la platitude du ton qui produit le rire noir.

**Trois outils, dans cet ordre de préférence** :

1. **La litote** — dire moins que ce qu'on montre. _« Le péagier tient encore la main tendue. La
   moitié basse manque. Le péage reste ouvert. »_
2. **La routine administrative appliquée à l'horreur** — un PNJ qui trie, étiquette, compte ou taxe
   des morts comme on ferait un inventaire. _« Il range les bottes par pointure. Les grandes se
   vendent mieux. »_
3. **La chute sèche** — une phrase courte, détachée, en fin de narration. _« Évidemment. »_

**Règles de dosage (dures)** :

- **Une chute maximum par scène.** Deux = sketch. Le backend surveille l'empilement en QA de voix
  (cf. §8).
- **Jamais de chute sur la mort du personnage joueur**, ni sur la blessure grave d'un PNJ auquel le
  joueur s'est attaché. Le sarcasme s'applique au **monde**, jamais à la perte du joueur.
- **Jamais d'adresse au joueur** : la potence est dans le monde, pas dans un clin d'œil.
- Si le tour est un pivot tendu (combat décisif, agonie, révélation), la chute est **supprimée** —
  le silence fait plus de travail.

**Phrases canoniques du registre** :

> « Le péagier tient encore la main tendue. La moitié basse manque. Le péage reste ouvert. »
>
> « Une étiquette pend à sa cheville. Un numéro, une date. Quelqu'un fait des comptes ici. »
>
> « Le Calciné trie les bottes par pointure. Il n'a pas levé la tête quand tu es entré. »
>
> « La cloche sonne trois fois. Personne ne vient. Elle sonne quand même. »

### 1.3 — PNJ génériques (tous les autres)

**Ton** : neutre par défaut, avec **5 variantes culturelles légères** selon le peuple du PNJ. Une variante = 2-3 tics de langage, pas une voix complète.

| Peuple         | Tic 1                      | Tic 2                                    | Exemple                                                                                                         |
| -------------- | -------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Sahélin**    | Laconique, phrases courtes | Métaphores du sel et du désert           | _« Cinq pièces. Pas une de moins. Le sel ne pousse pas sur les rochers, voyageur. »_                            |
| **Rivain**     | Lyrique, phrases longues   | Mention du fleuve, de l'eau, des oiseaux | _« Ah, ami, le fleuve m'a porté bien des nouvelles ces derniers jours — dont la tienne, peut-être, qui sait. »_ |
| **Thérien**    | Militaire, direct          | Titres et rangs même informels           | _« Rapport, étranger. Que cherches-tu dans le Quartier des Lames ? Sois bref. »_                                |
| **Cendreur**   | Mystique, ellipses         | Allusions aux artefacts, à la Calamine   | _« Tu portes une chose qui dort. Elle se réveillera. Bientôt, ou jamais. »_                                     |
| **Changepeau** | Elliptique, énigmatique    | Phrases inachevées, pronoms flous        | _« On t'attendait. Enfin — on disait. Tu décideras toi-même. »_                                                 |

**Tous les PNJ génériques** (marchands, gardes, ivrognes, pèlerins) tombent dans une de ces 5 voix selon leur origine. **Pas de voix unique par PNJ secondaire** — économie de prompt.

Le tenancier du Comptoir de l'Auberge appartient à cette catégorie tant qu'une identité canonique
distincte n'est pas écrite. Il vend eau, vivres, soins et ressources. L'Aveugle reste la voix du
lore, des Souvenirs, des recommandations et des contrats spéciaux ; il n'absorbe pas toutes les
fonctions commerciales de l'Auberge.

---

## §2 — Stratégie LLM en cascade (Pilier #1)

GRIMOIRE V1 vise **0€ de coût IA par tour**. C'est non-négociable — le projet doit être autonome et profitable dès M3-M6 (cf. décision produit Adem).

### 2.1 — Les 3 contextes d'exécution

| Contexte                                | Modèle                                                      | Coût               | Quand                         |
| --------------------------------------- | ----------------------------------------------------------- | ------------------ | ----------------------------- |
| **Dev local** (Adem qui code)           | Ollama — Qwen 2.5 32B                                       | 0€                 | Tests, prototypage            |
| **Prod — Micro-tours** (90% des appels) | Cascade OpenRouter free tier                                | 0€                 | Tous les tours de jeu normaux |
| **Prod — Chronique fin de run**         | Meilleur modèle free disponible V1 / Sonnet 4.6 V2+ Premium | 0€ V1 / ~$0.03 V2+ | 1 fois par fin de run         |

### 2.2 — La cascade OpenRouter (cœur de la prod V1)

L'ordre exact, défini dans `OPENROUTER_MODELS_CASCADE` (env var, modifiable sans redéploiement) :

```
1. deepseek/deepseek-chat-v3.1:free
2. meta-llama/llama-3.3-70b-instruct:free
3. qwen/qwen-2.5-72b-instruct:free
4. mistralai/mistral-small-24b-instruct:free
```

**Règles de bascule** :

- Si modèle 1 renvoie erreur, timeout > 12 sec, ou rate-limit → bascule modèle 2
- Si modèle 4 échoue aussi → renvoyer au frontend `{ error: "ai_saturated", message: "GRIMOIRE est très populaire ce soir, réessaye dans 10 min" }`
- Bascule loggée dans `request_logs.model_used` pour monitoring
- Si un modèle échoue 3 fois en 5 min → blacklisté 30 min auto (évite le ping-pong)

### 2.3 — Pivots narratifs (V2+, après traction)

10% des appels sont des **pivots** (combat décisif, fin d'acte, dialogue critique avec L'Aveugle). En V1, ils utilisent la même cascade. En V2+, si Premium ≥ 50 utilisateurs, on bascule sur **Claude Haiku 4.5** (~$0.0008/appel) pour ces tours.

→ Doit rester **invisible côté joueur** : pas de "modèle premium activé", juste meilleure narration ressentie.

### 2.4 — Chronique fin de run

Détaillé dans [17-RUN-CHRONICLE](17-RUN-CHRONICLE.md). Résumé :

- **V1** : meilleur modèle free dispo (essai cascade dans l'ordre 1→4)
- **V2+ Premium** : Claude Sonnet 4.6
- **V2+ Free tier** : reste sur free cascade

---

## §3 — Anti-patterns d'écriture interdits

Liste dure dans le prompt système. L'IA reçoit ces interdits explicitement. Le backend **detecte** les violations par regex et reprompte si besoin.

### Interdits absolus

| Catégorie                           | Exemple interdit                                        | Pourquoi                                                                                         |
| ----------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Adverbes émotionnels**            | _« Tu te sens étrangement attiré... »_                  | Casse le show-don't-tell. Le joueur ressent par lui-même.                                        |
| **"Soudain !"**                     | _« Soudain, un cri ! »_                                 | Tic narratif paresseux. Préférer : _« Un cri. Court. Suivi d'un silence pire. »_                 |
| **Questions rhétoriques au joueur** | _« Que vas-tu faire ? »_                                | Le rôle des **choix** UI, pas de la prose.                                                       |
| **Emojis dans la prose**            | _« Le marchand sourit 😏. »_                            | Réservés à l'UI (🩸 PV, 💨 SOUFFLE, 🔥 VOLONTÉ, 🪙 or, 📖 souvenir).                             |
| **Méta-commentaire**                | _« En tant que MJ, je dirais que... »_                  | Brise l'immersion. L'IA est invisible.                                                           |
| **Happy ending forcé**              | _« Heureusement, tu trouves de l'eau juste à temps ! »_ | Velkhar est rude. La mort, la défaite, la trahison sont **autorisées et nécessaires**.           |
| **Lore inventé hors canon**         | _« Le grand Empire de Velkhar fondé en l'an 200... »_   | Le lore est dans [02-WORLD-BIBLE](02-WORLD-BIBLE.md). L'IA n'invente jamais d'histoire mondiale. |
| **Décision mécanique**              | _« Tu perds 5 PV. »_                                    | Le backend annonce les dégâts via l'UI. La prose **décrit**, ne **calcule** pas.                 |
| **Roulage de dé en prose**          | _« Tu lances un d20... 14 ! Réussite. »_                | Le backend roule, l'IA narre le résultat. Cf. [08-DICE-RESOLUTION](08-DICE-RESOLUTION.md).       |
| **Gore décoratif**                  | _« Des viscères partout, du sang partout, l'horreur. »_ | L'horreur doit **renseigner** (menace, cause de mort, règle du monde). Cf. `01-PILLARS §4`.      |
| **Humour adressé au joueur**        | _« Bon courage avec ça ! »_                             | L'humour de potence est **dans le monde**, jamais un clin d'œil au lecteur.                      |

### Tolérés mais à doser

- Métaphores poétiques (1 par scène max — on évite la prose surchargée)
- Dialogues internes du perso (interdits si Narrateur, autorisés si L'Aveugle commente)
- Cliffhangers (autorisés si naturels, pas forcés)
- **Humour de potence** (1 chute sèche par scène max, jamais sur la mort du joueur — cf. §1.2)
- **Image gore forte** (1 par scène max, et seulement si elle informe — cf. `01-PILLARS §4`)

---

## §4 — Garde-fous mécaniques (backend)

L'IA peut dériver. Le backend la rattrape **systématiquement**.

### 4.1 — Validation Zod sur tout output IA

Chaque réponse IA doit matcher ce schéma :

```ts
{
  narration: string (max 250 tokens),
  choices: Array<{ id: string, label: string }> (3-4 max, label max 20 tokens),
  mood: "calm" | "tense" | "festive" | "sacred" | "dangerous" | "dread",
  npcs_present: string[] (noms des PNJ en scène)
}
```

Si parse Zod échoue → **retry avec prompt enrichi** _« Ton dernier output ne respectait pas le format JSON imposé. Renvoie strictement : ... »_.

#### Le mood `dread` _(ajout 2026-08-15, #281)_

`dread` est le **sixième mood**, distinct de `tense` et `dangerous` :

| Mood        | Ce qu'il signifie                                                  | Exemple                                                |
| ----------- | ------------------------------------------------------------------ | ------------------------------------------------------ |
| `tense`     | Quelque chose **peut** mal tourner, maintenant                     | Un garde pose la main sur son arme                     |
| `dangerous` | La menace est **présente et identifiée**                           | Trois silhouettes armées barrent le passage            |
| `dread`     | La menace n'est pas encore là — le monde **annonce** qu'elle vient | Un cadavre frais, encore chaud, sans agresseur visible |

`dread` est le mood du **présage** (`09-ACTION-LOOP §3bis`) : le joueur voit la conséquence avant la
cause. C'est la couleur émotionnelle qui porte l'effet de surprise recherché — il doit pouvoir
anticiper s'il lit bien.

Côté frontend, `dread` reçoit un traitement visuel propre (ambiance sourde, pas d'alerte rouge :
c'est de l'appréhension, pas du combat). Implémentation : ticket moteur séparé.

#### Le champ `foreshadow` _(ajout 2026-08-15, #281)_

Un champ **optionnel** en sortie, qui laisse l'IA signaler qu'elle a semé un présage exploitable :

```ts
foreshadow?: {
  hint: string,        // le détail semé, max 15 tokens — ex : "traces de dents sur l'os"
  threat: string       // ce qu'il annonce, jamais montré au joueur — ex : "meute de Ventre-Gris"
}
```

`hint` est **déjà dans la narration** ; le champ ne fait que le rendre lisible par le moteur. Le
backend le persiste dans le `SceneLog` et le réinjecte en contexte au tour suivant, pour que la
menace annoncée **arrive vraiment** (ou soit démentie de façon signifiante). `threat` n'est **jamais
affiché** au joueur — c'est de la mémoire moteur, pas de la prose.

🔴 **Interdit** : un `foreshadow` sans conséquence dans les 3 tours suivants. Un présage qui ne se
réalise jamais entraîne le joueur à ne plus lire les détails — c'est l'inverse de l'effet voulu.

### 4.2 — Vérification contextuelle

Après parse, le backend vérifie :

| Check                                                        | Action si fail                                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------------ |
| Un `choice` propose une action sur un PNJ absent du contexte | Rejet + retry                                                      |
| Un `choice` mentionne un item non possédé                    | Rejet + retry                                                      |
| `mood: "festive"` alors que le perso est à 1 PV              | Rejet + retry                                                      |
| `npcs_present` contient un PNJ mort dans un run précédent    | Rejet + retry                                                      |
| Narration mentionne un lieu inexistant dans Velkhar canon    | Rejet + retry **après 2 tentatives → renvoyer fallback générique** |
| `foreshadow.hint` absent du texte de `narration`             | Champ ignoré (la narration reste)                                  |
| `mood: "dread"` alors qu'aucune menace n'existe au contexte  | Ramené à `calm` (pas de retry — coût inutile)                      |

### 4.3 — Hard timeout 12 sec

Si l'IA ne répond pas en 12 sec → annulation + bascule modèle suivant dans la cascade. L'utilisateur ne sait jamais qu'il y a eu fallback.

### 4.4 — Limite de retries

Maximum **2 retries** par tour. Au-delà → fallback à un texte générique pré-écrit (banque de 20 transitions neutres par mood, ex : _« Le silence retombe. L'instant attend ta décision. »_). Préférable à un crash visible.

### 4.5 — Champs mécaniques proposés par l'IA (contrat Survie v2)

L'IA **narre**, mais elle peut **signaler** au moteur qu'un événement mécanique devrait se produire. Elle ne l'applique jamais elle-même : elle remplit un champ optionnel, le **backend décide** (validation + application). Trois champs optionnels s'ajoutent au schéma de sortie (§4.1) :

```ts
{
  // ... narration, choices, mood, npcs_present ...

  // L'IA propose une condition narrative (poison, gel, cécité...).
  // Backend valide : id ∈ whitelist (06-SURVIVAL §2) ET plausibilité biome/contexte.
  applyCondition?: {
    id: string,            // ex: "poison" — DOIT être un id canon (06-SURVIVAL §2)
    reason: string,        // justification narrative courte (piste de plausibilité)
    calamineDelta?: number // uniquement si id="cendre_corrupt" ; plafonné à +20 (06-SURVIVAL §4)
  },

  // L'IA signale un objet trouvé par le joueur.
  // Backend valide : catégorie connue, sac non plein, cohérence tier/contexte, puis persiste.
  itemGained?: {
    name: string,
    category: "equipment" | "bag" | "artifact" | "key",  // 4 catégories (11-INVENTORY §1)
    slot?: string,         // si category="equipment" : un des 8 slots canon
    effect?: {             // si consommable / utilitaire (ItemEffect)
      healAmount?: number,
      calamineReduction?: number,
      removesCondition?: string,  // id canon d'une condition à retirer
      damage?: string,            // dé de dégâts, ex "1d8"
      attributeModifiers?: Record<string, number>
    },
    description?: string
  },

  // L'IA signale que le joueur demande à se reposer.
  // Backend applique les taux canon (06-SURVIVAL §3) — l'IA ne calcule pas la récup.
  restRequested?: {
    type: "short" | "fire" | "inn"
  }
}
```

**Règles de validation backend (rejet silencieux si non conforme — la narration reste, l'effet est ignoré)** :

| Champ            | Check                                                                  | Si fail                 |
| ---------------- | ---------------------------------------------------------------------- | ----------------------- |
| `applyCondition` | `id` ∈ whitelist canon (06-SURVIVAL §2) **et** famille = IA-PROPOSÉE   | Condition non appliquée |
| `applyCondition` | plausibilité contexte/biome (poison ⇒ créature/eau corrompue, etc.)    | Condition non appliquée |
| `applyCondition` | `calamineDelta` : source ∈ liste canon (06-SURVIVAL §4), `≤ +20`       | Delta borné ou ignoré   |
| `itemGained`     | `category` connue, sac non plein (cap 12), `slot` valide si équipement | Objet non ajouté        |
| `itemGained`     | `effect.removesCondition` / `id` référencé ∈ whitelist canon           | Effet réduit / ignoré   |
| `restRequested`  | `type` ∈ {short, fire, inn}                                            | Repos ignoré            |

🟢 _Principe inchangé (§0) : l'IA **propose**, le backend **dispose**. Ces champs ne cassent pas la règle d'or — ils la formalisent. Le moteur reste la seule autorité sur les stats, l'inventaire et les conséquences._

---

## §5 — Budget de tokens par tour

Discipline financière + perceptuelle (réponses courtes = jeu nerveux).

| Élément                                                  | Tokens max |
| -------------------------------------------------------- | ---------- |
| Prompt système (instructions, voix, anti-patterns)       | 1 200      |
| Contexte lore Velkhar injecté                            | 500        |
| Mémoire intra-tour (3-5 derniers tours)                  | 1 500      |
| Mémoire intra-run (résumés compressés)                   | 4 000      |
| Mémoire inter-runs (Souvenirs nommés, événement mondial) | 800        |
| **Total entrée par appel**                               | **~8 000** |
| Narration sortie                                         | 250        |
| Choix sortie                                             | 80         |
| **Total sortie**                                         | **~330**   |

**Si l'entrée dépasse 8 000** → compression forcée du plus ancien (cf. [16-MEMORY §4](16-MEMORY.md)). **Si la sortie dépasse 330** → tronquée propre + retry avec rappel _« Sois plus concis. »_.

---

## §6 — Prompt système (squelette V1)

Voici la **structure** du prompt système envoyé à chaque tour. Le contenu exact évoluera (versionné via fichier `prompts/system-v{n}.txt` dans le backend), mais la structure reste stable.

```
[RÔLE]
Tu es le Maître du Jeu de GRIMOIRE — Of Ash and Salt, un roguelike narratif
se déroulant à Velkhar, continent désertique. Tu n'es jamais le joueur.
Tu décris le monde tel que le moteur te l'indique.

[RÈGLE ABSOLUE]
Tu n'inventes RIEN qui n'est pas dans le contexte fourni :
- Pas de stat (les chiffres viennent du moteur)
- Pas de conséquence (le moteur les calcule)
- Pas de PNJ inconnu (catalogue fourni)
- Pas de lieu hors Velkhar canon (cf. WORLD-BIBLE)

[3 VOIX]
Tu écris en 3 voix selon le contexte :
1. L'AVEUGLE — chaud, ironique, tutoie, proverbes désertiques courts
   [3 phrases canoniques en exemple]
2. NARRATEUR — sec, sensoriel, présent, jamais d'émotion explicite
   [3 phrases canoniques en exemple]
3. PNJ GÉNÉRIQUES — neutre + variante culturelle selon peuple
   [5 variantes × 1 exemple chacune]

[TON — LE MONDE EST BAROQUE, TA VOIX EST SÈCHE]
Velkhar est une horreur sacrée : masques votifs, cloches, morts étiquetés,
Calcinés. Tu montres cela sans jamais le commenter. Tu constates.
- Une image forte maximum par scène, et elle doit RENSEIGNER le joueur
  (une menace, une cause de mort, une règle du monde). Jamais de gore décoratif.
- Une chute sèche maximum par scène (litote, constat pince-sans-rire).
  Jamais sur la mort du joueur. Jamais adressée au joueur.
- Le corps est une information : blessure localisée, marques, brûlure.

[PRÉSAGE]
Si la scène contient un indice de ce qui attend le joueur, sème-le dans la
narration ET déclare-le dans "foreshadow". L'indice est visible, la menace
qu'il annonce ne l'est pas. Ne sème jamais un présage sans intention.

[INTERDITS]
- Adverbes émotionnels (tristement, mystérieusement...)
- "Soudain !", questions rhétoriques au joueur
- Emojis dans la prose
- Lore inventé hors WORLD-BIBLE
- Happy ending forcé (Velkhar est rude)
- Gore décoratif qui n'apprend rien
- Humour adressé au joueur (clin d'œil, référence moderne)

[FORMAT DE SORTIE — STRICTEMENT JSON]
{
  "narration": "...max 250 tokens...",
  "choices": [
    { "id": "a", "label": "..." },
    { "id": "b", "label": "..." },
    { "id": "c", "label": "..." }
  ],
  "mood": "calm | tense | festive | sacred | dangerous | dread",
  "npcs_present": ["..."],
  "foreshadow": { "hint": "...", "threat": "..." }   // optionnel
}

[CONTEXTE DE LA SCÈNE]
{lore_velkhar_extrait}
{état_perso : nom, vocation, peuple, PV, stats, inventaire bref}
{blessures_localisées_actives}
{souvenirs_nommés_pertinents}
{mémoire_intra_run_compressée}
{3-5_derniers_tours_en_clair}
{présages_actifs_non_résolus}     // hint + threat des tours précédents
{hallucinationAllowed}            // true si Calamine ≥ 50 (06-SURVIVAL §4)
{action_du_joueur_au_tour_n}
{résultat_dé_si_applicable}

[HALLUCINATIONS]
Si {hallucinationAllowed} est vrai, tu peux décrire UN élément sensoriel qui
n'existe pas (une silhouette, une voix, une odeur). Jamais plus d'un par scène.
Tu ne signales JAMAIS que c'est une hallucination.
INTERDIT ABSOLU : halluciner une information mécanique — un PNJ dans
"npcs_present", un objet ramassable, un chiffre, une sortie, un choix.
L'hallucination est une ambiance, jamais une décision de jeu.

[INSTRUCTION FINALE]
Génère le tour N+1. Réponds STRICTEMENT en JSON. Une seule voix par
narration (Narrateur par défaut, L'Aveugle si on est à l'auberge,
PNJ si dialogue direct).
```

**Taille cible** : 1 200 tokens fixes (instructions) + variable selon contexte. Versionné `system-v1.txt`, `system-v2.txt`...

---

## §7 — Cas spécial : la Chronique de fin de run

Détaillé dans [17-RUN-CHRONICLE](17-RUN-CHRONICLE.md). Vue côté GM :

- **Trigger** : `runs.status` passe à `ended` ou `dead`
- **Modèle** : meilleur dispo selon tier joueur (V1 = même cascade free, V2+ Premium = Sonnet 4.6)
- **Prompt** : ~2 000 tokens, demande un récit littéraire 800-1200 mots à la 3ᵉ personne
- **Input** : tous les résumés intra-run + Souvenirs nommés du run + faits `pinned`
- **Output** : `{ title, body_markdown, mood, key_moments[], illustration_prompt }`
- **Style imposé** : "écris comme un romancier qui raconterait cette aventure à un ami au coin du feu — pas un rapport de partie"
- **Voix** : **Narrateur uniquement** (jamais L'Aveugle, jamais en JE)

---

## §8 — Risques & garde-fous

| Risque                                                                        | Mitigation                                                                                                                                                                                 |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Dérive de voix entre modèles** (DeepSeek vs Llama narrent différemment)     | Tests A/B systématiques sur 20 prompts canoniques par modèle. Si écart de style > seuil → exclure le modèle. Banque de phrases canoniques injectée à chaque prompt.                        |
| **Hallucinations lore** (l'IA invente un peuple, un dieu, une région)         | Lore Velkhar injecté à chaque appel (max 500 tokens, extraits pertinents). Validation `lieu mentionné ∈ catalogue` côté backend.                                                           |
| **Latence variable free tier** (3-15 sec selon modèle/heure)                  | UI affiche _« Le MJ réfléchit... »_ avec animation discrète. Pas de timer visible.                                                                                                         |
| **Quotas free tier explosés**                                                 | Monitoring quotas en temps réel via `request_logs`. Alerte mail Adem à 80% quota. Cascade auto vers modèle suivant.                                                                        |
| **Style trop verbose** (modèles open source ont tendance à overdoser)         | Hard cap 250 tokens narration. Tronqué propre + retry si dépassement.                                                                                                                      |
| **JSON cassé** (modèles open source moins fiables que Claude)                 | Parse Zod systématique. Retry avec exemple JSON valide en prompt. Au pire : fallback générique.                                                                                            |
| **Quotas free tier disparaissent** (OpenRouter retire un modèle sans préavis) | Liste cascade en env var modifiable sans redéploiement. Veille mensuelle Adem sur les modèles dispo.                                                                                       |
| **Erreur fournisseur silencieuse** (modèle renvoie 200 mais contenu vide)     | Validation longueur min narration (10 tokens). Sinon retry.                                                                                                                                |
| **Refus ou édulcoration du gore par un modèle free** (safety filters)         | Même protocole A/B que la dérive de voix : 20 prompts gore canoniques par modèle. Un modèle qui refuse ou lisse systématiquement descend dans la cascade. Test **avant** de figer l'ordre. |
| **Dérive de l'humour vers le sketch** (2+ chutes par scène, ton parodique)    | Cap dur « 1 chute/scène » dans le prompt. QA de voix manuelle sur échantillon. Si un modèle empile, retirer les exemples de potence de **son** prompt (variante par modèle).               |
| **Hallucination qui contamine la mécanique** (PNJ inventé en `npcs_present`)  | La règle `§4.2` existante s'applique inchangée : `npcs_present` et `itemGained` sont validés contre le catalogue. `hallucinationAllowed` n'assouplit **aucune** validation.                |
| **Présage jamais résolu** (le joueur cesse de lire les détails)               | Les `foreshadow` non résolus sont réinjectés en contexte 3 tours ; au-delà, le backend les marque résolus-par-défaut et cesse de les injecter. Suivi en QA narrative.                      |

---

## §9 — Synthèse

```
                  ┌─────────────────────────────────────┐
                  │   JOUEUR clique un choix ou écrit   │
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │   BACKEND (Game Master véritable)   │
                  │   1. Valide l'action                │
                  │   2. Roule le dé si pivot           │
                  │   3. Calcule conséquences           │
                  │   4. Construit le contexte IA       │
                  │      (8000 tokens max, cf. §5)      │
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │   CASCADE OPENROUTER (§2)           │
                  │   DeepSeek → Llama → Qwen → Mistral │
                  │   (12 sec timeout par modèle)       │
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │   VALIDATION ZOD + CONTEXTE (§4)    │
                  │   Anti-patterns, items, PNJ, mood   │
                  │   Si fail → retry (max 2)           │
                  │   Si fail² → fallback générique     │
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────┐
                  │   FRONTEND affiche                  │
                  │   narration + 3-4 choix + mood UI   │
                  └─────────────────────────────────────┘

    L'IA n'a JAMAIS touché aux stats, inventaire, dés.
    Le backend décide TOUT. L'IA est une voix.
```

---

## Références Phase D

- **Tier Premium** (bascule modèles meilleurs) → cf. `19-MONETIZATION.md` à venir
- **Auth & billing** (lien tier ↔ choix modèle) → cf. `20-ARCHITECTURE.md` Phase D
- **Règle d'or coût IA** → cf. `19-MONETIZATION.md` à venir

---

_Fichier 15 — Phase C — `Game Master` posé. Suite : [16-MEMORY](16-MEMORY.md)._
