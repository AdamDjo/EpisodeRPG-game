# 22 — Glossaire canon Velkhar

> **Fichier 22 / Phase D (dernier fichier de la phase, hors compléments architecture)**
> Index alphabétique des **termes canon Velkhar** + **termes mécaniques** + **termes produit/IA**. Source de vérité unique en cas d'ambiguïté entre fichiers du GDD.
>
> ⚠️ **Règle d'or** : si un terme est dans ce glossaire ET utilisé ailleurs dans le GDD, la définition ici fait foi. Tout autre fichier qui le contredit doit être corrigé pour s'aligner.

---

## §0 — Comment lire ce glossaire

Chaque entrée suit le format :

```
**Terme** *(catégorie)*
Définition courte (1-2 phrases).
→ Référence(s) au(x) fichier(s) où le terme est développé en profondeur.
⚠️ Notes / pièges éventuels (ne pas confondre avec X).
```

**Catégories** :

- 🌍 **Lore** : élément du canon narratif Velkhar
- ⚙️ **Mécanique** : règle de jeu
- 💼 **Produit** : concept business / éthique / monétisation
- 🤖 **IA / Tech** : concept technique du moteur

---

## A

**Aveugle (L')** _🌍 Lore_
Aubergiste mystérieux du hub permanent — **pilier unique** d'entrée dans chaque run. Voix chaude,
ironique, tutoie le joueur, parle en proverbes désertiques. Mémoire vivante : distingue le retour
d'un personnage de l'arrivée d'un successeur et connaît l'événement mondial actif. Échange des
Souvenirs (monnaie) contre du lore.
→ [01-PILLARS §5](01-PILLARS.md), [07-CHARACTER-CREATION §5-§7](07-CHARACTER-CREATION.md), [14-META-WORLD §5](14-META-WORLD.md), [15-GAME-MASTER §1](15-GAME-MASTER.md)
⚠️ Il reconnaît un personnage revenu vivant. Face à un successeur, il reconnaît l'artefact et les
Souvenirs du défunt, jamais la même âme ou le même visage. Ce n'est ni un PNJ "ennemi" ni un
"allié" : c'est l'**interface du monde** entre les runs.

**Anonyme** _💼 Produit_
Tier d'utilisateur sans compte créé. Identifié par cookie HTTPOnly `grimoire_session` (90j). Cap = **30 requêtes IA total** sur le cycle de vie du cookie. Données stockées client-side (cookie chiffré ~4KB) + Chronique upload serveur permanent.
→ [19-MONETIZATION §1](19-MONETIZATION.md), [20-ARCHITECTURE §5](20-ARCHITECTURE.md)

**Artefact** _⚙️ Mécanique + 🌍 Lore_
Objet narratif unique transmis du perso mort au prochain perso (héritage). Seul le **Tisse-Verbe** peut éveiller les artefacts (révéler leur pouvoir caché).
→ [11-INVENTORY-ECONOMY](11-INVENTORY-ECONOMY.md), [17-RUN-CHRONICLE §8](17-RUN-CHRONICLE.md)

## B

**Brume dorée** _🌍 Lore_
Phénomène mystique du Makhzen : brume scintillante qui apparaît au crépuscule et porte les Souvenirs des morts. Associée au passage vers l'au-delà et à la magie de mémoire.
→ `docs/canon/`, [14-META-WORLD](14-META-WORLD.md)
⚠️ Pas une mécanique de jeu directe — c'est un élément d'ambiance + de lore.

## C

**Calamine** _⚙️ Mécanique + 🌍 Lore_
Coût magique unifié de Velkhar, et **seule jauge magique du jeu** : une valeur `calamine` de 0 à 100 par personnage. Chaque action magique en **accumule** (5 par usage d'artefact, 10 par éveil). Elle ne redescend jamais seule — seuls un repos long (−10), un rituel des Sœurs du Silence (−30) ou un artefact purificateur (−50) la réduisent. À 100, le personnage devient un Calciné : fin de run. Représente le **prix charnel** de la magie — le corps brûle, littéralement.
→ [06-SURVIVAL §4](06-SURVIVAL.md), [10-COMBAT](10-COMBAT.md), [11-INVENTORY-ECONOMY](11-INVENTORY-ECONOMY.md)
⚠️ Ne pas confondre avec **VOLONTÉ** (stat), **Calcinés** (lore) ni **Cendre** (la matière du monde). Il n'existe **pas** de jauge de « Cendre » : c'est la Calamine.

**Calcinés (Les)** _🌍 Lore_
Êtres tordus par un excès de Calamine — anciens mages, fanatiques, victimes de rituels ratés. Forme ennemie récurrente. Hybrides humain / cendre / pierre. Souvent muets, parfois prophétiques.
→ `docs/canon/`, [10-COMBAT](10-COMBAT.md)
⚠️ Lore distinct des Calmes (peuple Cendreur) — phonétique proche, sens opposés.

**Cendre (La)** _🌍 Lore_
La poussière dorée qui recouvre Velkhar : la magie des Archontes dispersée après le cataclysme. Trois formes — sable doré (partout, toléré), brume dorée (concentrée, mortelle), et **Calamine** lorsqu'elle s'accumule dans un corps humain. Matière du monde, jamais une ressource de personnage.
→ [02-WORLD-BIBLE §3](02-WORLD-BIBLE.md), [06-SURVIVAL §4](06-SURVIVAL.md)
⚠️ **Pas une jauge.** Ce qu'un personnage accumule s'appelle **Calamine**. L'attribut autrefois nommé CENDRE est devenu **VOLONTÉ** (#264).

**Cendreurs** _🌍 Lore_
Peuple mystique des hauts plateaux volcaniques. Voix elliptique, foi profonde dans la combustion sacrée, gardiens de rituels Calamine. Variante PNJ : voix mystique, métaphores.
→ `docs/canon/`, [15-GAME-MASTER §1](15-GAME-MASTER.md)

**Changepeau** _🌍 Lore_
Peuple nomade aux racines animales (mythologie de la métamorphose). Voix elliptique, phrases courtes, métaphores du vivant.
→ `docs/canon/`, [15-GAME-MASTER §1](15-GAME-MASTER.md)

**Chronique (la Chronique)** _⚙️ Mécanique + 💼 Produit_
Récit littéraire de 800-1200 mots généré par l'IA à la fin de chaque run (mort ou choix de fin). Inclut titre, corps en prose, illustration générée (FLUX schnell gratuit / FLUX dev Premium). **Asset d'acquisition viral** : URL publique partageable. Gratuite pour tous les tiers (le texte est identique).
→ [17-RUN-CHRONICLE](17-RUN-CHRONICLE.md)
⚠️ Gratuite POUR TOUS — pas un produit Premium. Seul l'illustration diffère entre tiers.

**Cookie `grimoire_session`** _🤖 IA / Tech_
Cookie HTTPOnly de 90 jours qui identifie un joueur anonyme. Rattaché à `account_id` lors de la création de compte (les datas anonymes deviennent celles du compte).
→ [20-ARCHITECTURE §5](20-ARCHITECTURE.md)

**Contrat** _⚙️ Mécanique + 🌍 Lore_
Quête principale qui donne au run un objectif, une destination et des conditions de réussite. C'est
un moyen de financer ou servir le projet du personnage, jamais un métier imposé : tous les
personnages ne sont pas des chasseurs de primes.
→ [23-RUN-STRUCTURE §2](23-RUN-STRUCTURE.md)

## D

**D20** _⚙️ Mécanique_
Dé à 20 faces utilisé aux **pivots narratifs** (moments décisifs). Le backend roule, jamais l'IA. Modificateur = stat du triptyque pertinente. Réussite/échec changent la suite narrative, pas une "math soup".
→ [08-DICE-RESOLUTION](08-DICE-RESOLUTION.md)

**DeepSeek-V3.1** _🤖 IA / Tech_
Modèle IA gratuit V1 (free tier OpenRouter), premier modèle de la cascade pour les scènes. Bascule auto vers Llama 3.3 70B si saturé.
→ [15-GAME-MASTER §2](15-GAME-MASTER.md)

## E

**Égalité narrative** _💼 Produit_
Principe fondateur : tous les tiers (anonyme/gratuit/Premium) reçoivent la **même qualité d'écriture IA** sur les scènes et le **même texte de Chronique**. Le Premium achète du quota + confort, jamais "un meilleur jeu".
→ [19-MONETIZATION §0+§1.2](19-MONETIZATION.md)

**Événement mondial** _🌍 Lore + ⚙️ Mécanique_
Changement scripté de l'univers Velkhar, écrit à la main par Adem, actif 1-3 mois IRL. Max 3-5 en parallèle. Injecté en contexte IA à chaque début de run. Exemple : _"Le Concile de Tissan a fermé ses portes."_
→ [14-META-WORLD §4](14-META-WORLD.md), [20-ARCHITECTURE §2 (table `world_events`)](20-ARCHITECTURE.md)

## F

**File prioritaire** _💼 Produit + 🤖 IA / Tech_
Avantage Premium : queue Redis 2 niveaux (`priority:high` Premium / `priority:normal` gratuit+anonyme). Si saturation OpenRouter free tier, Premium reste servi tant qu'au moins 1 modèle répond ; gratuit voit message d'attente.
→ [19-MONETIZATION §2](19-MONETIZATION.md), [20-ARCHITECTURE §6](20-ARCHITECTURE.md)

**FLUX schnell / FLUX dev** _🤖 IA / Tech_
Modèles de génération d'images historiquement envisagés pour la Chronique. Les **images de scène
v0.2.1 sont pré-générées pendant le développement** et ne déclenchent aucun modèle au runtime.
→ [17-RUN-CHRONICLE §4](17-RUN-CHRONICLE.md), [19-MONETIZATION §1.3](19-MONETIZATION.md)

## G

**Game Master (GM)** _🤖 IA / Tech_
Le **backend Express**, jamais l'IA. C'est lui qui décide tout : stats, dés, inventaire, conséquences, NPCs, lore, validation. L'IA est **voix uniquement**.
→ [15-GAME-MASTER §0](15-GAME-MASTER.md)
⚠️ Principe architectural absolu. Toute tentative IA de "décider" = rejet backend + reprompt.

**Gratuit** _💼 Produit_
Tier d'utilisateur avec compte créé (email + magic link). Cap = **150 requêtes IA / semaine glissante** (reset roulant). Données stockées DB Supabase, purge ferme 6 mois inactivité (mail à M+5).
→ [19-MONETIZATION §1](19-MONETIZATION.md)

## H

**Hub permanent** _⚙️ Mécanique_
L'Auberge de L'Aveugle — point d'entrée unique de chaque run. Pas de menu, pas de lobby : quatre
destinations fictionnelles restent accessibles, Comptoir, L'Aveugle, Contrats et Forge.
→ [07-CHARACTER-CREATION](07-CHARACTER-CREATION.md), [23-RUN-STRUCTURE §1](23-RUN-STRUCTURE.md)

**Héritage** _⚙️ Mécanique + 🌍 Lore_
Continuité appartenant au joueur à travers plusieurs personnages mortels : artefact transmis,
Souvenirs nommés, connaissance, accès débloqués et traces locales. Ce n'est ni une résurrection, ni
une âme réincarnée, ni une réputation intégralement transférée.
→ [07-CHARACTER-CREATION §7](07-CHARACTER-CREATION.md), [14-META-WORLD §0](14-META-WORLD.md)
⚠️ L'artefact n'est transmis que s'il reste récupérable. La fin `calcined` le corrompt, mais les
autres composantes de l'Héritage persistent.

## L

**Lame-Ombre** _🌍 Lore + ⚙️ Mécanique_
Une des 4 vocations V1. Assassin furtif, lié aux Ombres. Stat pilote dominant : SOUFFLE.
→ [05-VOCATIONS](05-VOCATIONS.md)

**Llama 3.3 70B** _🤖 IA / Tech_
Modèle IA gratuit V1 (free tier OpenRouter), 2ᵉ de la cascade scènes.
→ [15-GAME-MASTER §2](15-GAME-MASTER.md)

## M

**Magic link** _🤖 IA / Tech_
Méthode d'authentification : email envoyé avec lien unique (pas de mot de passe). Via NextAuth.js V1.
→ [20-ARCHITECTURE](20-ARCHITECTURE.md)

**Makhzen** _🌍 Lore_
Le continent désertique unique de Velkhar. Mot d'origine arabe = _"l'entrepôt"_, _"le réservoir caché"_. Désigne le territoire ET son rapport au secret enfoui.
→ `docs/canon/`
⚠️ "Velkhar" = nom du monde / "Makhzen" = nom du continent.

**Marcheur-du-Sel** _🌍 Lore + ⚙️ Mécanique_
Une des 4 vocations V1. Nomade endurci des dunes salées, survivaliste. Stat pilote dominant : SANG.
→ [05-VOCATIONS](05-VOCATIONS.md)

**Mémoire 3 niveaux** _🤖 IA / Tech_

- **N1 intra-tour** : 3-5 derniers tours en clair (~1500 tokens, cache Redis)
- **N2 intra-run** : résumés compressés (~150 tokens chacun) + pgvector pour rappel similarité (~4000 tokens budget total)
- **N3 inter-runs** : Souvenirs nommés + événement mondial actif (~800 tokens, persistant DB)
  Budget contexte total / appel IA : **8000 tokens hard cap**.
  → [16-MEMORY](16-MEMORY.md)

**Mistral Small** _🤖 IA / Tech_
Modèle IA gratuit V1 (free tier OpenRouter), 4ᵉ et dernier de la cascade scènes. Aussi utilisé pour compression mémoire (modèle léger).
→ [15-GAME-MASTER §2](15-GAME-MASTER.md), [16-MEMORY §5](16-MEMORY.md)

## N

**Narrateur** _🤖 IA / Tech_
Une des 3 voix d'écriture IA. Sec, sensoriel, présent, jamais d'émotion explicite. Ex : _"Le vent porte une odeur de fer chaud."_
→ [15-GAME-MASTER §1](15-GAME-MASTER.md)
⚠️ Ne pas confondre avec l'**Aveugle** (voix chaude ironique) ni avec les **PNJ** (voix variées par culture).

**NextAuth** _🤖 IA / Tech_
Bibliothèque d'authentification Next.js utilisée V1 pour les magic links.
→ [20-ARCHITECTURE](20-ARCHITECTURE.md)

**North Star Metric (NSM)** _💼 Produit_
Métrique unique de pilotage produit. Pour GRIMOIRE : **completion rate × 2ᵉ run J+7**. Cible launch ≥ 0.10 (40% × 25%), cible mature ≥ 0.27 (60% × 45%).
→ [01-PILLARS §8](01-PILLARS.md), [18-RETENTION §5](18-RETENTION.md), [21-ROADMAP §5.2](21-ROADMAP.md)

## O

**Ollama** _🤖 IA / Tech_
Runtime LLM local pour dev. V1 : Qwen 2.5 32B sur la machine d'Adem pour tests sans coût.
→ [15-GAME-MASTER §2](15-GAME-MASTER.md), [20-ARCHITECTURE §8](20-ARCHITECTURE.md)

**OpenRouter** _🤖 IA / Tech_
Routeur multi-modèles IA. V1 utilise uniquement le **free tier** en cascade (DeepSeek → Llama → Qwen → Mistral).
→ [15-GAME-MASTER §2](15-GAME-MASTER.md)

**Or** _⚙️ Mécanique + 🌍 Lore_
🪙 Monnaie classique in-run (achat/revente équipement). **Perdue à la mort.** Pas de transmission héritage.
→ [11-INVENTORY-ECONOMY §2](11-INVENTORY-ECONOMY.md)
⚠️ Ne pas confondre avec les **Souvenirs** (monnaie méta inter-runs).

## P

**pgvector** _🤖 IA / Tech_
Extension PostgreSQL pour la recherche de similarité par embeddings. Utilisé pour le rappel mémoire intra-run (seuil 0.85).
→ [16-MEMORY §7](16-MEMORY.md), [20-ARCHITECTURE §1+§2](20-ARCHITECTURE.md)

**Pivot narratif** _⚙️ Mécanique_
Moment décisif où le backend roule un d20. Réussite/échec change la trajectoire de la scène. ~10% des tours typiques.
→ [08-DICE-RESOLUTION](08-DICE-RESOLUTION.md), [15-GAME-MASTER §2](15-GAME-MASTER.md)

**PNJ génériques** _🤖 IA / Tech + 🌍 Lore_
Une des 3 voix d'écriture IA. Voix neutre par défaut + 5 variantes culturelles légères (Sahélin laconique, Rivain lyrique, Thérien militaire, Cendreur mystique, Changepeau elliptique).
→ [15-GAME-MASTER §1](15-GAME-MASTER.md)

**Premium** _💼 Produit_
Tier d'utilisateur payant. **7,99€/mois OU 69€/an (-28%)**. Avantages : cap requêtes illimité (hard cap silencieux 5000/sem anti-bot), file prioritaire, Souvenirs nommés illimités, illustration Chronique premium (FLUX dev), 12 mois de grâce post-désabonnement.
→ [19-MONETIZATION §1+§2](19-MONETIZATION.md)

## Q

**Queue jump** _💼 Produit_
Synonyme de **file prioritaire**. Voir cette entrée.

**Qwen 2.5 72B** _🤖 IA / Tech_
Modèle IA gratuit V1 (free tier OpenRouter), 3ᵉ de la cascade scènes.
→ [15-GAME-MASTER §2](15-GAME-MASTER.md)

**Qwen 2.5 32B** _🤖 IA / Tech_
Modèle Ollama utilisé en dev local par Adem.
→ [15-GAME-MASTER §2](15-GAME-MASTER.md)

## R

**Règle d'or coût IA** _💼 Produit + 🤖 IA / Tech_
_"Aucune décision design ne peut augmenter le coût IA moyen par run de plus de +10% sans hausse de prix compensatoire OU cap utilisateur compensatoire."_
→ [19-MONETIZATION §3](19-MONETIZATION.md), pilier #8 du produit.

**Rivain** _🌍 Lore_
Peuple des oasis fertiles, érudits et marchands. Voix PNJ lyrique, métaphores fleuves.
→ `docs/canon/`, [15-GAME-MASTER §1](15-GAME-MASTER.md)

**Run** _⚙️ Mécanique_
Une session de jeu complète de 2h30 maximum. Elle commence à l'Auberge, devient mécaniquement active
au départ avec un contrat principal, puis finit par retour, mort, Calamine ou abandon. Auberge,
voyage, quête, donjon et retour partagent la même interface narrative ; chaque fin génère une
Chronique.
→ [09-ACTION-LOOP](09-ACTION-LOOP.md), [23-RUN-STRUCTURE](23-RUN-STRUCTURE.md), [17-RUN-CHRONICLE](17-RUN-CHRONICLE.md)

## S

**Sahélin** _🌍 Lore_
Peuple guerrier des bordures arides du Makhzen. Voix PNJ laconique, phrases courtes.
→ `docs/canon/`, [15-GAME-MASTER §1](15-GAME-MASTER.md)

**SANG** _⚙️ Mécanique_
Une des 3 stats du triptyque (🩸 SANG). Pilote : combat, survie, force, intimidation. Mod −3 à +4. **PV = 10 + SANG.**
→ [04-ATTRIBUTES](04-ATTRIBUTES.md), [10-COMBAT](10-COMBAT.md)

**Sonnet 4.6 (Claude)** _🤖 IA / Tech_
Modèle Anthropic Premium envisagé **V2+** pour la Chronique (pas Premium-only — pour tous). Aussi envisagé pour Premium+ tier supérieur V2+.
→ [15-GAME-MASTER §2+§7](15-GAME-MASTER.md), [21-ROADMAP §3.2](21-ROADMAP.md)

**Soft launch** _💼 Produit_
Lancement fermé / restreint (cercle proche + early access) avant le lancement public. Permet d'identifier bugs critiques et hooks qui ne mordent pas avant la traction publique.
→ [21-ROADMAP §1.3](21-ROADMAP.md)

**SOUFFLE** _⚙️ Mécanique_
Une des 3 stats du triptyque (💨 SOUFFLE). Pilote : précision, furtivité, artisanat, éveil des artefacts. Mod −3 à +4.
→ [04-ATTRIBUTES](04-ATTRIBUTES.md)

**Souvenirs (monnaie)** _⚙️ Mécanique_
Monnaie méta utilisée chez L'Aveugle pour acheter du lore généré. Gagnés à raison de ~1-4 par run selon performance. Pas de cap de stockage (s'épuisent par usage).
→ [11-INVENTORY-ECONOMY §3](11-INVENTORY-ECONOMY.md), [19-MONETIZATION §5](19-MONETIZATION.md)
⚠️ **À ne pas confondre avec Souvenirs nommés** (voir entrée suivante).

**Souvenirs nommés** _⚙️ Mécanique + 🌍 Lore_
Objets narratifs permanents (≠ monnaie). Max 3/run, déclenchés par moments forts (acte héroïque, trahison, perte, choix moral). Titre + corps 50 tokens. Persistent inter-runs et rappelés par L'Aveugle. Cap : **20 max gratuit / illimité Premium**.
→ [14-META-WORLD §2](14-META-WORLD.md), [16-MEMORY §6](16-MEMORY.md), [19-MONETIZATION §5.2](19-MONETIZATION.md)
⚠️ Table de désambiguïsation Souvenirs vs Souvenirs nommés dans [19-MONETIZATION §5.2](19-MONETIZATION.md).

**Successeur** _🌍 Lore + ⚙️ Mécanique_
Nouveau personnage distinct qui, après la mort du précédent, trouve ou reçoit son artefact
d'héritage et le porte jusqu'à l'Auberge. Il conserve sa propre identité et commence sans la
réputation complète, les relations ou le corps du défunt.
→ [07-CHARACTER-CREATION §5-§7](07-CHARACTER-CREATION.md), [14-META-WORLD §0](14-META-WORLD.md)
⚠️ Après une fin `calcined`, il arrive sans artefact transmis et pour une motivation qui lui est
propre.

**Stripe Checkout / Customer Portal** _🤖 IA / Tech + 💼 Produit_
Pages hostées Stripe pour le paiement et la gestion d'abonnement. Aucune carte ne touche le backend de GRIMOIRE (sécurité PCI déléguée).
→ [19-MONETIZATION §7](19-MONETIZATION.md), [20-ARCHITECTURE](20-ARCHITECTURE.md)

## T

**Thérien** _🌍 Lore_
Peuple militariste des cités fortifiées. Voix PNJ militaire, ordres concis, métaphores du fer.
→ `docs/canon/`, [15-GAME-MASTER §1](15-GAME-MASTER.md)

**Tisse-Verbe** _🌍 Lore + ⚙️ Mécanique_
Une des 4 vocations V1. **Seul à pouvoir éveiller les artefacts** (révéler leur pouvoir). Tisseur de parole et de sens caché. Stat pilote dominant : VOLONTÉ.
→ [05-VOCATIONS](05-VOCATIONS.md), [11-INVENTORY-ECONOMY](11-INVENTORY-ECONOMY.md)

**Triptyque** _⚙️ Mécanique_
Le système de 3 stats : **🩸 SANG / 💨 SOUFFLE / 🔥 VOLONTÉ**. Modificateurs −3 à +4. Pilote tous les jets de dés.
→ [04-ATTRIBUTES](04-ATTRIBUTES.md)

## V

**Second univers** _🌍 Produit (hypothèse V2+)_
Option future uniquement si Velkhar est saturé et si les métriques Premium le justifient. Aucun deuxième univers n'est routé ou prévu en V1.
→ [21-ROADMAP §3.2](21-ROADMAP.md)
⚠️ Pas un lieu de Velkhar. Toute ouverture multi-univers exige un nouveau GDD.

**Veilleur** _🌍 Lore + ⚙️ Mécanique_
Une des 4 vocations V1. Sentinelle mystique, lecteur de signes, gardien des seuils. Stat pilote dominant : SOUFFLE/VOLONTÉ.
→ [05-VOCATIONS](05-VOCATIONS.md)

**Velkhar** _🌍 Lore_
Nom du **monde** unique de GRIMOIRE V1. Continent désertique = le **Makhzen**. Source de vérité produit canonique dans `docs/canon/`.
→ `docs/canon/`, [AGENTS.md projet](../../AGENTS.md)
⚠️ "Velkhar" = monde / "Makhzen" = continent. Strict.

**Voix (3 voix)** _🤖 IA / Tech_
Les 3 styles d'écriture IA distincts : **Aveugle** (chaud ironique), **Narrateur** (sec sensoriel), **PNJ génériques** (neutre + 5 variantes culturelles). Imposés par prompt système. Anti-pattern : mélanger les voix dans une même scène.
→ [15-GAME-MASTER §1+§3](15-GAME-MASTER.md)

**Vocation** _⚙️ Mécanique + 🌍 Lore_
Le "rôle" du personnage. **4 vocations V1** : Marcheur-du-Sel, Lame-Ombre, Veilleur, Tisse-Verbe. Influence stats de départ, abilities, et perception PNJ.
→ [05-VOCATIONS](05-VOCATIONS.md)

**VOLONTÉ** _⚙️ Mécanique_
Une des 3 stats du triptyque (🔥). Pilote : charisme, foi, commandement, résistance magique. Modificateur −3 à +4. Influence interactions sociales et résistance aux effets magiques.
→ [04-ATTRIBUTES](04-ATTRIBUTES.md), [10-COMBAT](10-COMBAT.md)
⚠️ Renommée depuis **CENDRE** le 2026-08-10 (#264) : le mot désignait à la fois cet attribut et la Cendre du monde, et faisait doublon avec la **Calamine**. VOLONTÉ = la réserve, Calamine = le prix. Ne pas confondre avec la **Cendre** (matière du lore) ni avec les **Cendreurs** (peuple).

## Z

**Zod** _🤖 IA / Tech_
Bibliothèque TypeScript de validation de schémas. Utilisée sur toutes les routes API + validation des outputs IA (structure JSON narration/choix/mood/npcs_present).
→ [15-GAME-MASTER §4](15-GAME-MASTER.md), [20-ARCHITECTURE](20-ARCHITECTURE.md)

---

## Annexe — Termes explicitement REJETÉS / À NE PAS UTILISER

Pour éviter la dérive sémantique avec les premières versions du GDD ou des inspirations externes :

| Terme rejeté                    | Pourquoi                                               | À utiliser à la place                            |
| ------------------------------- | ------------------------------------------------------ | ------------------------------------------------ |
| "Mana"                          | Trop générique fantasy                                 | **Calamine** (lore Velkhar)                      |
| "XP / niveau"                   | GRIMOIRE n'a pas de niveaux RPG classiques             | Triptyque (stats) + Souvenirs (progression méta) |
| "Quête principale"              | Pas de quête centrale imposée — narration émergente    | "Trame", "fil narratif", "axe de run"            |
| "Player Character" / "PC"       | Anglicisme inutile                                     | "Personnage", "perso"                            |
| "MJ humain"                     | L'IA est la voix, pas le MJ ; le **backend** est le MJ | "Game Master" = backend toujours                 |
| "Tokens" (in-game currency)     | Confusion avec tokens IA                               | **Or** ou **Souvenirs** selon contexte           |
| "Battle pass" / "Season"        | Anti-rétention par FOMO, rejeté V1                     | Aucun équivalent — c'est intentionnel            |
| "Énergie" / "Stamina régen IRL" | Anti-pattern free-to-play, rejeté                      | Caps requêtes IA (transparent et honnête)        |
| "Premium-only" (lore/contenu)   | Casse l'égalité narrative                              | Tout contenu narratif accessible à tous          |
| "Mode hardcore" / "iron-mode"   | Hors scope V1                                          | (V2+ envisageable)                               |
| "CENDRE" (l'attribut)           | Collision avec la Cendre du lore + doublon Calamine    | **VOLONTÉ** (#264)                               |

---

## Références croisées globales

- → [01-PILLARS](01-PILLARS.md) — vision produit
- → `docs/canon/` — design global Velkhar (régions, peuples, lore détaillé)
- → [CLAUDE.md](../../CLAUDE.md) — règles projet + sources de vérité
- → [\_STATUS.md](_STATUS.md) — état Phase actuelle
- → Tous les fichiers GDD numérotés (05 à 22)

---

## Note d'entretien

Ce glossaire **doit être mis à jour** :

- À chaque ajout d'un nouveau terme canon dans un fichier GDD
- À chaque renommage ou évolution sémantique
- À chaque rejet explicite d'un terme par Adem

**Process** : ajouter l'entrée + référence au fichier de définition + mise à jour de l'annexe "termes rejetés" si pertinent.
