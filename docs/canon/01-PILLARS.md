# 01 — Pillars & Vision

> Ce que GRIMOIRE doit être. Ce qu'il ne doit jamais devenir.

---

## 1. La promesse unique

**GRIMOIRE ne vend pas une fonctionnalité. Il vend une émotion.**

L'émotion ciblée, unique et obsessionnelle :

> **"Je viens de vivre mon propre roman. Et je peux le recommencer — ce sera différent."**

Tout ce qui s'écarte de cette sensation est du bruit à éliminer.

---

## 2. Les cinq piliers de design

Ces cinq piliers sont **non-négociables**. Toute décision de design doit pouvoir être rattachée à l'un d'eux. Si une mécanique ne sert aucun pilier, elle est supprimée.

### Pilier 1 — 🌊 **Survie**

> _Le monde de Velkhar essaie de te tuer. La soif, le sable, les factions, la Cendre._

Le joueur n'est pas un héros surpuissant. C'est un humain qui doit **survivre** dans un monde hostile. La survie est la pression constante — mais elle ne doit jamais étouffer la narration.

- La faim, la soif et la fatigue sont des **menaces réelles**
- Les créatures du désert, les factions hostiles, les Veilleurs mécaniques sont des **dangers constants**
- La survie crée de la **tension** qui rend les moments de calme précieux
- Mais un run qui ne serait que gestion de ressources = échec de design

**Implication système** : un système de survie complet (PV, faim, soif, fatigue, conditions) — avec un curseur "pas hardcore" pour que l'histoire reste le main focus.

### Pilier 2 — 🎲 **Choix & Dés**

> _Tes décisions comptent. Le destin ne doit rien. Ou si._

À chaque moment pivot, le joueur est confronté à un **choix fertile** — et un **dé** décide du résultat. Pas à chaque action (ça tuerait le rythme), mais aux **tournants** : le combat qui engage la vie, le mensonge que le PNJ pourrait percer, la chute d'une dune, la séduction d'un allié, le sacrifice magique.

- Le joueur voit le dé (transparence façon BG3)
- Succès et échec sont **tous les deux intéressants** — un échec crée du jeu, pas de la frustration
- Nat 20 et nat 1 produisent des **conséquences mémorables**
- La chance ne remplace pas les choix — les mods d'attributs et de compétence comptent

**Implication système** : résolution d20 + modificateur vs DC, moments pivots identifiés par le MJ IA.

### Pilier 3 — 📖 **Lentille Narrative**

> _Chaque vocation voit le monde autrement. Chaque run raconte une histoire différente._

Le joueur ne joue pas un "personnage générique". Il incarne une **vocation** — Marcheur-du-Sel, Lame-Ombre, Veilleur ou Tisse-Verbe — et cette vocation filtre **tout** ce qu'il vit. L'IA propose des scènes, des rencontres et des dilemmes adaptés à sa vocation.

- Même lieu, même PNJ, même événement — **vocation différente = scène différente**
- Le joueur peut aussi **écrire son propre concept** (concept libre), le système dérive ses stats
- La rejouabilité infinie repose sur cette multiplicité de lentilles

**Implication système** : chaque vocation possède une **fiche de contraintes** que le MJ IA consulte.

### Pilier 4 — 🔄 **Rejouabilité**

> _Le même monde. Mille histoires._

GRIMOIRE est un **roguelike narratif**. Chaque run est une aventure complète, avec un début, un milieu et une fin. À la fin, le joueur reçoit sa **Chronique** — le récit de ce qu'il a vécu. Il peut recommencer avec la même vocation ou une autre.

> **⏱️ Durée d'un run : 2h30 maximum** (décision du 2026-08-06). Le joueur choisit son engagement
> en acceptant un **contrat** à l'auberge, présenté comme expédition courte, longue ou majeure. La
> structure mécanique qui garantit cette durée reste cachée en v0.2.1. Voir `23-RUN-STRUCTURE.md`.
>
> _Pourquoi un plafond dur_ : au-delà, le cycle de relance propre au roguelike se casse, la mort
> permanente devient intolérable au lieu d'être tendue, et le coût des appels IA explose. Un run
> qu'on ne peut pas finir en une soirée est un run qu'on abandonne — et le taux de complétion est
> la North Star (§8).

- Le **méta-monde** évolue entre les runs (le roi meurt, une Conjonction a eu lieu, une faction a chuté)
- Les **choix divergents** créent des histoires fondamentalement différentes
- L'IA **génère de l'imprévu** (rencontres, rumeurs, événements) dans les limites du Canon
- Même classe, même lieu = **histoire différente**

**Implication système** : méta-monde vivant + génération procédurale dirigée par l'IA + Canon fixe.

### Pilier 5 — 🏺 **Héritage**

> _Ta mort n'est pas stérile. Quelque chose survit._

GRIMOIRE est un **roguelike** — ce qui signifie que la mort est définitive, mais qu'elle **n'est pas vide**. Ce qui survit n'est pas de la puissance : c'est de la **connaissance** et de l'**accès**.

> **⚖️ La règle non négociable** (décision du 2026-08-06) :
> **la méta-progression débloque de la connaissance et de l'accès, jamais de la puissance.**

| ✅ Ce qui persiste                                                     | ❌ Ce qui ne persiste jamais            |
| ---------------------------------------------------------------------- | --------------------------------------- |
| **Connaissance du bestiaire** : ce qu'on a affronté, ses faiblesses    | Bonus permanent de PV ou de dégâts      |
| **Accès** : contrats et destinations plus dangereuses débloqués        | Bonus permanent d'attribut              |
| **Sujets chez L'Aveugle** : le lore s'ouvre selon ce qu'on a vu        | Équipement cumulatif d'un run à l'autre |
| **Compagnons recrutables** débloqués (`23-RUN-STRUCTURE`)              | Réduction permanente de la difficulté   |
| **Exploits** (badges) et les accès qu'ils ouvrent                      | Toute forme de « build » qui monte      |
| **Écho de réputation** : les PNJ reconnaissent vaguement l'ancêtre     |                                         |
| **Lignée** : les noms des morts sont conservés, cités, parfois honorés |                                         |

**Héritage d'artéfact** : l'artéfact équipé est transmis au successeur, mais il se **dégrade** à
chaque transmission (`11-INVENTORY-ECONOMY §5`) — c'est précisément ce qui l'empêche de devenir une
progression de puissance.

La difficulté du jeu **ne baisse jamais** avec la méta-progression. Le joueur devient plus
compétent, pas plus fort. Façon Hades — sauf que chez nous, même le contenu débloqué ne rend pas
le joueur invincible : il lui ouvre des endroits plus dangereux.

_Pourquoi cette règle est absolue_ : si les runs successifs rendent le personnage plus puissant, la
survie meurt. Le joueur finit par traverser sans risque un monde censé le tuer — et le pilier 1
s'effondre avec.

**Implication système** : table `player_meta` en BDD, injectée dans le prompt du MJ IA au démarrage de chaque run.

---

## 3. L'anti-vision (ce que GRIMOIRE n'est PAS)

| GRIMOIRE n'est PAS…                  | …parce que                                                               |
| ------------------------------------ | ------------------------------------------------------------------------ |
| ❌ Un chatbot fantasy                | Les réponses s'appuient sur un monde mémorisé + des mécaniques de jeu    |
| ❌ Un Visual Novel à embranchements  | Les conséquences émergent, l'IA improvise                                |
| ❌ Un RPG CRUD avec stats            | Les stats servent la narration, pas l'inverse                            |
| ❌ Un outil d'écriture collaborative | Le joueur joue, il ne rédige pas la prose — le MJ IA est l'auteur        |
| ❌ Un sandbox sans direction         | Il y a une structure de run, un ton, des enjeux — pas du freeform absolu |
| ❌ Un jeu de survie hardcore         | La survie est la pression, pas le produit fini                           |
| ❌ Un MMORPG                         | Solo en V1, le monde n'est pas partagé entre joueurs                     |
| ❌ Un clone de D&D                   | Les attributs, les vocations et le lore sont uniques à Velkhar           |

---

## 4. Le ton

GRIMOIRE navigue entre trois influences :

- **Dark fantasy désertique** (Dune, Glen Cook, Le Premier Magicien) — survie, perte, beauté morose, sable
- **RPG narratif** (Baldur's Gate 3, Disco Elysium) — choix moraux complexes, personnages qui comptent
- **Roguelike** (Hades, Slay the Spire) — mort qui avance le méta, rejouabilité, progression entre les runs

### Le positionnement de ton _(ajout 2026-08-15, #281)_

> **Le monde est _Blasphemous_. La voix est _Darkest Dungeon_.**

C'est la formule qui tranche toutes les hésitations de registre. Elle sépare **ce qu'on montre** de
**comment on le raconte** :

| Couche                                       | Registre                | Ce que ça donne concrètement                                                                               |
| -------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Le monde** (lieux, factions, iconographie) | Horreur sacrée baroque  | Masques votifs, cloches, étiquettes accrochées aux morts, Calcinés, reliquaires, rituels sans pitié        |
| **La voix** (narration, PNJ, descriptions)   | Sec, ironique, constaté | Litote, phrase courte, chute pince-sans-rire — jamais de lyrisme liturgique qui commente sa propre gravité |

Sans cette séparation, les deux registres s'annulent : un monde baroque **raconté** en liturgie
devient pompeux, et une voix sèche appliquée à un monde neutre devient plate. Le contraste — image
atroce, ton posé — est **la** signature de GRIMOIRE.

Détail d'application de la voix : `15-GAME-MASTER §1.2`.

### L'humour de potence _(ajout 2026-08-15, #281)_

L'interdit « humour briseur de ton » ci-dessous **ne bannit pas le rire** : il bannit le rire qui
sort le joueur du monde. L'humour autorisé est **l'humour de potence** — celui de gens qui vivent
au milieu de l'horreur et l'ont banalisée.

| ✅ Humour de potence (autorisé)                                       | ❌ Humour briseur (interdit)                   |
| --------------------------------------------------------------------- | ---------------------------------------------- |
| La litote sur l'atroce (_« Le péage reste ouvert. »_)                 | La vanne qui s'adresse au joueur               |
| Un PNJ qui traite l'horreur comme de la routine administrative        | Le clin d'œil méta / la référence moderne      |
| Le constat sec en fin de scène (_« Évidemment. »_)                    | Le personnage qui se moque de son propre monde |
| L'absurde bureaucratique appliqué à la mort (trier, étiqueter, taxer) | Le running gag, la parodie                     |

**Règle de dosage : une chute sèche maximum par scène.** Deux chutes dans la même narration = la
scène devient un sketch, la tension meurt. Si le tour est déjà court ou tendu, aucune chute.

### Le budget gore _(ajout 2026-08-15, #281)_

Le gore n'est pas une intensité, c'est un **signal**. Un corps mutilé dans GRIMOIRE dit toujours
quelque chose de mécanique : ce qui vit ici, ce qui est arrivé au dernier passant, ce qui attend le
joueur au prochain tour.

- **Une image forte maximum par scène.** Au-delà, l'horreur devient un bruit de fond que le joueur
  scanne au lieu de lire.
- **Gore signifiant uniquement.** Si l'image ne renseigne pas le joueur sur une menace, un lieu ou
  une règle du monde, elle ne mérite pas ses tokens.
- **Le corps est une information, pas une décoration.** Blessure localisée, marques de dents,
  brûlure d'archonte : chaque détail doit être lisible comme un indice (cf. `09-ACTION-LOOP §3bis`).
- **Jamais de complaisance** : la torture longue, le détail anatomique gratuit et la souffrance
  d'enfant restent hors périmètre — public 18+ ne veut pas dire absence de goût.

### Trucs à éviter absolument

- Humour briseur de ton (style Marvel) — **mais l'humour de potence est autorisé, voir ci-dessus**
- Power fantasy de surpuissance
- Poncifs D&D (elfes/nains/orcs génériques)
- Moralité binaire Bien/Mal
- Exposition pavée
- Gameplay qui étouffe la narration
- Gore décoratif : une horreur qui n'apprend rien au joueur

### Trucs à viser

- Ambiguïté morale constante
- Pertes irréversibles (un PNJ peut mourir pour de bon)
- Mystère non résolu (tout n'est pas expliqué)
- Langage sensoriel : le sable, la soif, la lumière rasante, le silence
- Lenteur comme outil narratif
- La mort comme moment de récit, pas de frustration
- **Humour de potence** : le constat sec sur l'atroce, une chute par scène maximum
- **Gore signifiant** : une image forte par scène, qui renseigne toujours sur une menace
- **Le présage** : le joueur doit pouvoir deviner ce qui l'attend s'il lit bien (cf. `09-ACTION-LOOP §3bis`)

---

## 5. Le public cible

### Public primaire 🎯

**Joueurs de 18-35 ans, anglophones, familiers du RP IA et des RPG narratifs.**

- Ont essayé ChatGPT/Character.AI pour le RP et ont été déçus par l'amnésie
- Connaissent Baldur's Gate 3, Disco Elysium, ou Hades
- Acceptent une session dense et réfléchie (jusqu'à 2h30 par run)
- Veulent une histoire _qui leur appartient_ et qu'ils peuvent _recommencer_

### Public secondaire

- Joueurs de CRPG classiques cherchant un récit plus personnel
- Rôlistes sur table curieux du support numérique
- Fans de dark fantasy littéraire

### Public à ne PAS courir après

- Le grand public casual mobile
- Les enfants (< 18 ans, le ton est mature)
- Les power-gamers qui veulent "maxer" un build et "gagner"
- Les joueurs exclusivement multijoueur

---

## 6. La règle d'or de chaque session

> **Toute session réussie est une session dont le joueur se souvient d'un détail précis le lendemain.**

Pas un combat. Pas un loot. Un **détail** : la façon dont un PNJ a détourné le regard, une phrase ambiguë, le silence avant un jet de dé critique. C'est ce qui crée l'attachement et la rejouabilité.

---

## 7. Différenciateurs concurrentiels

| Dimension                   | ChatGPT RP | AI Dungeon | Character.AI | D&D Beyond   | BG3        | **GRIMOIRE**          |
| --------------------------- | ---------- | ---------- | ------------ | ------------ | ---------- | --------------------- |
| Mémoire long-terme          | ❌         | ❌         | ❌           | N/A          | ✅ (fixe)  | ✅ (scope run + méta) |
| Dés / résolution            | ❌         | 🟡         | ❌           | ✅ (DM gère) | ✅✅       | ✅✅ (pivots)         |
| Vocations distinctes        | ❌         | ❌         | ❌           | ✅           | ✅✅       | ✅✅ (lentilles IA)   |
| Système de survie           | ❌         | ❌         | ❌           | ✅           | 🟡         | ✅✅                  |
| Monde qui change entre runs | ❌         | ❌         | ❌           | N/A          | 🟡 (fixed) | ✅ (méta-monde)       |
| Chronique générée           | ❌         | ❌         | ❌           | N/A          | ❌         | ✅                    |
| Cohérence artistique        | ❌         | ❌         | ❌           | N/A          | ✅✅       | ✅                    |
| Pas besoin d'autres humains | ✅         | ✅         | ✅           | ❌           | ❌         | ✅                    |
| Rejouabilité infinie        | ❌         | 🟡         | ❌           | ❌           | ❌         | ✅✅                  |

**Le combo unique : Vocations + Dés + Survie + Méta-monde + Chronique.** Aucun concurrent ne fait les cinq.

---

## 8. North Star Metric

> **Taux de runs terminés (completion) + Taux de 2ᵉ run dans les 7 jours.**

Pas le DAU. Pas le temps de session.

- **Completion rate** : le joueur a-t-il mené son run jusqu'à la fin (mort, victoire, ou conclusion) ? Un run abandonné = le game design a échoué à captiver.
- **2ᵉ run à J+7** : le joueur a-t-il recommencé une nouvelle aventure après sa première ? C'est la preuve que la rejouabilité fonctionne.

Objectif lancement : **≥ 40% completion + ≥ 25% 2ᵉ run à J+7.**
Objectif mature : **≥ 60% completion + ≥ 45% 2ᵉ run à J+7.**

---

## 9. Principes de design dérivés

1. 🟢 **Jamais de formulaire nu.** Toute collecte d'info passe par la fiction.
2. 🟢 **L'émotion avant la mécanique.** En cas de conflit, l'émotion gagne.
3. 🟢 **Le joueur n'est jamais tutoyé par "le système".** C'est toujours un personnage qui parle.
4. 🟢 **La mort est réelle, mais pas punitive gratuitement.** Elle génère une Chronique et nourrit le méta.
5. 🟢 **La lenteur est une feature.** Hésitation, silence, attente = intentionnel.
6. 🟢 **L'IA ne brise jamais le quatrième mur.** Pas de "En tant qu'IA…"
7. 🟢 **Les dés ne sont tirés qu'aux moments pivots.** Pas de micro-gestion aléatoire.
8. 🟢 **La survie est une pression, pas une punition.** Le joueur souffre, mais pas de façon qui le fait quitter.
9. 🟢 **La magie est une tentation, pas un outil.** Toujours un prix, toujours un risque.
10. 🟢 **Chaque vocation = une expérience fondamentalement différente.** Pas des skins sur le même jeu.
11. 🟢 **L'état du joueur est lisible, le monde reste mystérieux.** PV, jauges, conditions et choix
    de demi-tour ne sont jamais cachés ; les dangers futurs, la profondeur et la route de retour le
    sont en v0.2.1. Le joueur décide avec ce que son personnage sait, pas avec une carte système.
12. 🟢 **Le storytelling est la continuité du jeu.** Auberge, voyage, donjon et retour partagent la
    même interface narrative. Seul le combat transforme temporairement la scène en espace tactique.
13. 🟢 **Un mot inventé est toujours accompagné de sa fonction au premier affichage.** Ce qui est
    nécessaire pour jouer s'explique par un tooltip ; le lore se découvre auprès de L'Aveugle.

> Les principes 11 à 13 sont issus du grilling de conception du **2026-08-06**. Ils sont au même
> rang que les dix premiers : une mécanique qui les viole est refusée.

---

## 10. Risques produit majeurs

| Risque                                 | Impact | Mitigation                                                                          |
| -------------------------------------- | ------ | ----------------------------------------------------------------------------------- |
| Coût LLM (même gratuit, rate limits)   | 🔴     | OpenRouter + 1-2 appels/tour + caching                                              |
| Incohérences narr. sur un run long     | 🔴     | Canon fixe en RAG + Validateur + prompt strict                                      |
| Run abandonné (trop long / trop plat)  | 🔴     | Plafond dur 2h30 + contrat à objectif clair + structure cachée (`23-RUN-STRUCTURE`) |
| Boucle sans destination (« ennuyeux ») | 🔴     | Le contrat donne une quête ; l'IA conserve cet objectif à chaque tour               |
| "Survie" étouffe la narration          | 🟡     | Curseur "pas hardcore", events narratifs > micro-gestion                            |
| Dés frustrants (échecs à répétition)   | 🟡     | Mods d'attributs compensent, échec = jeu pas punition                               |
| Vocations trop similaires en pratique  | 🟡     | Fiches de contraintes strictes, lentilles testées séparément                        |
| Free tiers insuffisants (rate limits)  | 🔴     | Quota de runs/jour, fallback providers                                              |

---

## 11. Pitch en une phrase pour l'équipe

> _GRIMOIRE n'est pas un chatbot. C'est un roguelike narratif où chaque run est un roman de survie, de dés et de magie interdite — et où le monde change entre tes aventures._

---

_Le lore de Velkhar (cosmologie, peuples, magie, factions) est détaillé dans `02-WORLD-BIBLE.md` et `03-FACTIONS.md`._
