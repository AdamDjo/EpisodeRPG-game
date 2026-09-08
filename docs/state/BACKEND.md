---
type: backend-domain
visibility: public
rag: true
source_of_truth: true
owner: backend
default_agent: claude
---

# Backend — état et file d'attente

> **Où en est le projet ?** → `gh issue list --milestone "v0.2.1 - Roguelike jouable"`. GitHub porte l'avancement.
> Ce fichier porte les **décisions d'architecture** prises en implémentant, celles qu'un ticket fermé
> ne conserve pas.

Priorité courante : refonte roguelike (décision du 2026-08-06, cf. [[PROJECT_STATUS]]).
Canon de référence : `docs/canon/23-RUN-STRUCTURE.md`, `10-COMBAT.md`, `03-BESTIARY.md`.

Ordre de dépendance produit : quête/run → combat → Auberge → artefacts → compagnons/exploits.
Transverse à la boucle et aux exploits : la méta-progression de connaissance (`PlayerKnowledge`) persiste
bestiaire, routes, contrats et sujets — **jamais de puissance** (`14-META-WORLD.md` §1bis).

## Décisions d'implémentation

Une entrée n'est ajoutée ici que si elle explique un **choix non évident** : pourquoi telle valeur,
pourquoi telle fermeture de type, pourquoi tel garde-fou. Le simple fait qu'un ticket soit livré se
lit sur GitHub.

### Boucle de run — #214

- **`SessionEndReason` scindé en 5 valeurs** — `death | extracted | returned_empty | abandon |
calcined`. L'ancien `inn` confondait « rentré avec l'objectif » (payé) et « rentré les mains
  vides » (non payé) : il est **remplacé, pas renommé**. Comme il n'était produit que par la fin
  volontaire à l'auberge, sans contrat à honorer, les sessions existantes sont migrées en `abandon`
  (migration `split_session_end_reason_run_structure`). #226
- **`GameMode` ≠ fin de session ≠ type de repos** — `inn | exploration | combat | return` est un
  état serveur. Ne pas le confondre avec `rest_requested.type: 'inn'`, que le backend ignore
  volontairement. Depuis le grilling du 2026-08-08, il n'impose plus quatre interfaces : il permet
  surtout au frontend de transformer la scène quand un combat commence.
- **Un contrat est une quête structurée, pas un niveau de donjon.** Un seul contrat principal est
  actif ; le backend possède objectif, destination, commanditaire, danger, durée, récompense,
  conditions d'échec et progression. L'IA habille ces données sans les modifier.
- **Le run commence au départ de l'Auberge.** Le contrat reste modifiable avant le départ, puis se
  verrouille. Les ressources et conséquences s'appliquent dès le voyage, pas seulement au premier
  palier de donjon.
- **L'objectif est injecté à chaque tour.** L'IA respecte les détours mais ne peut pas oublier la
  quête ; réussite et échec sont des verdicts backend.
- **Le plafond de 7 paliers est structurel**, clampé même sur une valeur hors barème : c'est le
  garant du plafond dur de 2h30. Trois garde-fous indépendants — clamp moteur, contrainte `CHECK`,
  et `readContract` qui rend nul plutôt que de fabriquer un run trop long. #227 #228
- **`MINUTES_PER_ROOM = 3.75` reste un calibrage interne.** Il borne la durée des expéditions, mais
  la profondeur, le nombre de salles et les minutes du retour ne sont jamais exposés en v0.2.1.
- **Le retour est un trajet distinct**, jamais la descente à l'envers : identifiants et types tirés
  à neuf, 1 salle par palier contre 3, aucun boss. Le retour tue par épuisement, jamais par
  embuscade. #227
- **La structure du donjon est secrète en v0.2.1.** Le moteur peut conserver salles, connexions,
  paliers et profondeur pour arbitrer ; ni indices de danger, ni types de salles, ni carte, ni
  estimation ne doivent atteindre le joueur.
- **Les estimations et avertissements de retour ne sont plus des sorties produit.** Le moteur peut
  calculer un coût interne pour garder un trajet cohérent, mais il ne l'injecte ni dans la prose ni
  dans la réponse consommée par l'UI.
- **⏱️ La progression est portée par le tour, jamais par le temps réel.** Une session laissée ouverte
  ou reprise le lendemain ne consomme rien : les minutes affichées sont une estimation honnête pour
  décider, pas une horloge que le moteur relit. #228
- **`services/run.service.ts` ne contient aucune règle** — seul pont entre les règles pures et la
  ligne persistée. L'arbitrage reste dans `game-rules/`, qui ignore Prisma. #228

### Combat et bestiaire — #215

- **`CreatureId` (18) et `CreatureVariant` (5) sont des unions fermées**, pas de la documentation :
  une créature inventée par l'IA produit une valeur que le type ne peut pas représenter, donc qui
  n'atteint jamais le moteur. _Pourquoi fermer plutôt que valider_ : une créature improvisée n'a ni
  CA, ni PV, ni comportement, ni butin — le backend ne peut pas l'arbitrer et le joueur ne peut pas
  apprendre à la combattre. La méta-progression n'a de valeur que si la créature du run 8 est **la
  même** qu'au run 3. #233
- **`CombatConditionId` est typé séparément de `ConditionId`** — les conditions de combat vivent et
  meurent dans un seul combat, les conditions de survie persistent sur le run. #233
- **`CreatureHabitat` ≠ `LieuType`** — le second nomme un _lieu_ et sert de clé au cache d'images, le
  premier est une _règle de placement_. D'où `anywhere`, dont les Calcinés ont besoin et qu'aucune
  image ne pourrait représenter. #233
- **Les chiffres du bestiaire sont dérivés, pas inventés.** Le canon donne comportements, habitats et
  tiers de butin mais aucun PV/CA/dégât par créature. Plutôt que reporter le lot ou écrire des
  constantes provisoires, la table dérive des seules ancres existantes : `PV = 10 + SANG`
  (référence ≈ 11 PV), CA 11 en cuir (`10-COMBAT §4`), les deux CA imprimées telles quelles
  (Calciné rampant 12, Veilleur 18) et l'échelle d'armes de `08-DICE-RESOLUTION §7`.
  _Pourquoi celle-ci_ : à 11 PV, les dégâts se lisent en **tours avant de mourir** et les PV en
  **tours pour la tuer** — la seule échelle que le joueur ressent. #234
- **Les tests verrouillent la calibration, pas la présence des entrées** : « je gère » = rien ne tue
  en moins de 4 tours aux paliers 1-2, « ça coûte » = rien ne tue en 2 tours aux paliers 3-4, « je
  devrais remonter » = tout ce qui tue en ≤ 2 tours vit au palier 5+. Ils ont rattrapé deux erreurs
  d'équilibrage à l'écriture. #234
- **`minDepth`/`maxDepth` rendent l'anti-règle « jamais de légendaire aux paliers 1-2 »
  structurelle** plutôt que confiée au tirage de rencontres. `creaturesForReturn` ne puise que dans
  les paliers déjà traversés. #234
- **Deux créatures refusent le statut de sac à PV** via `CreatureEngagement` : le Vent-Gris est un
  `hazard` à 0 PV — le canon dit « on ne le combat pas, on le fuit », donc attaquer un nuage ne doit
  pas être une option que le moteur propose puis punit — et le Mangeur de Souvenir un `drain`, au
  plus faible dégât des rares, parce que son coût est un souvenir et non des PV. #234
- **`applyVariant` n'accepte qu'une variante** : « Calciné ancien affamé en meute » est
  irreprésentable (§6ter, garde-fou d'unicité). #234

### Survie et conditions

- **État « mourant » universel** — sursis d'un tour à 0 PV, mort définitive au second passage à 0.
  Remplace l'ancienne règle « 0 PV → inconscience ». Canon `06-SURVIVAL.md` §7. #201
- **Érosion et Calamine de négligence non cumulatives** — -1 PV/tour tant que Faim _ou_ Soif est à 0
  (jamais les deux additionnés), Calamine backend au-delà de 3 tours de négligence (+3 à +5/tour).
  Désavantage non cumulatif sous 25. #201
- **L'IA propose le repos, le backend fixe les valeurs** — `rest_requested` (`short`/`fire`, `inn`
  ignoré) ; les taux canon (`06-SURVIVAL §3`) sont appliqués côté serveur, jauges clampées 0-100. #184
- **Le crescendo de danger n'a aucun état persisté** — `buildDangerCrescendoSection` s'appuie sur
  l'état mécanique réel transmis (ratio PV, palier de Calamine, conditions, mourant). Aucun état
  d'acte/chapitre serveur, explicitement hors scope. #185
- **Charges d'Emprise dérivées de VOLONTÉ, jamais stockées comme un max** — `maxEmpriseCharges` et
  `calamineResistance` recalculent depuis le modificateur à chaque usage (`game-rules/emprise.ts`) ;
  seul `empriseCharges` (le compteur courant) est persisté. Le rechargement au feu de camp restaure
  au max sans jamais toucher à la Calamine — coût distinct du -10 Calamine du repos au feu lui-même.
  Canon `04-ATTRIBUTES.md` "Les charges d'Emprise". #267
- **`break_deadlock` revalidé côté serveur indépendamment du prompt** — le system-prompt masque déjà
  l'option sous 1 charge (`buildDeadlockSection`), mais `session.service.ts` rappelle
  `canForceAction` avant d'appliquer quoi que ce soit : un modèle qui halluciderait le champ à 0
  charge se voit silencieusement ignoré (pas de charge dépensée, pas de coût Calamine). Le coût
  passe toujours par `attributeModifier(will)` avant `empriseSpendCost`, jamais l'attribut brut —
  même convention que `combat.service.ts`. #267

### Images de scène — révision v0.2.1

- **Aucune génération runtime.** La génération Pollinations et son cache `SceneImage` deviennent
  une implémentation à retirer ; qualité, coût et disponibilité d'un fournisseur ne doivent pas
  bloquer un tour.
- **Bibliothèque fermée de 45 à 60 assets pré-générés.** Le backend ou le contrat de scène référence
  une famille et une variante connues ; il ne compose jamais une image depuis la prose IA.
- **Fallback obligatoire.** Une clé absente retombe sur le décor de thème sans faire échouer le tour.
- **L'image représente la scène actuelle et ne donne aucun indice sur la prochaine salle.**
- Détail : `docs/tech/SCENE_IMAGES.md`.

### Sécurité et infrastructure — #162

- **Rate limit à deux étages** — `requireAuth` doit précéder le limiteur par utilisateur pour que
  `req.auth.userId` existe, mais cela exposait `requireAuth` (JWT contre JWKS distant + upsert
  Prisma) au flood non authentifié. D'où `preAuthLimiter` par IP (120 req/min) en amont, puis le
  limiteur par utilisateur en aval. Auparavant tous les joueurs derrière un même NAT partageaient un
  seul seau (`src/middleware/rate-limit-key.ts`).
- **Quota anonyme atomique** — `updateMany` avec la garde `lt` dans le `WHERE`, plus de course
  lecture-puis-écriture. JWT épinglé sur `issuer`/`audience`, rejet d'un token sans claim `sub`.
- **RLS activé sur les 9 tables** (policy deny-all `anon`/`authenticated`) ; le backend accède via
  `postgres`/`service_role` qui bypassent RLS.
- **Le cooldown de modèles réordonne sans jamais retirer** (`src/ai/model-cooldown.ts`, 5 min) : un
  cooldown périmé ne doit pas pouvoir provoquer un déni de service. `gemma-4-31b-it:free` rétrogradé
  après mesure (429 permanent) alors qu'il était tête de chaîne **et** repli de compression.
- **⚠️ Dockerfile corrigé mais non construit localement** (daemon indisponible) : `CMD` pointait sur
  `dist/index.js` alors que tsup émet `dist/index.mjs` — le conteneur aurait crashé au démarrage bien
  que l'image se construise. À confirmer au premier build Coolify. Détail
  `docs/tech/SECURITY.md`.

### Comptoir et préparation du départ — #249

- **Prix fixes, contre le canon `11-INVENTORY-ECONOMY.md` §7** (« Pas de prix fixes », négociation
  `d20 + VOLONTÉ + Persuasion`). Le Comptoir vend des consommables de survie : le levier de jeu est
  l'arbitrage or/place, pas le marchandage. Un jet sur le prix de l'eau ajoute de la variance sans
  ajouter une décision, et rend l'instantané de préparation non déterministe donc intestable. La
  négociation §7 vise le **marché** et les marchands de faction, dont les modificateurs de
  réputation n'ont aucun modèle persisté. Négociation et prix par faction restent ouverts pour un
  futur ticket marché.
- **Stock illimité sur le catalogue fermé.** Les contraintes réelles sont l'or et les 12 slots du
  sac (§1) ; un compteur de stock ajouterait de la comptabilité sans arbitrage.
- **Un slot de sac par unité, pas par pile** — `bagSlotsUsed` compte les quantités. C'est la
  **définition unique** du sac plein : `game-rules/inventory.ts#acquireItem` (butin IA, #183)
  l'appelle aussi. Avant le Comptoir chaque entrée valait 1, donc compter les entrées ou les unités
  revenait au même ; acheter une pile de 12 rations a rompu cette égalité, et un comptage par
  entrées aurait laissé le joueur continuer à ramasser du butin sur un sac que le Comptoir refuse
  déjà de remplir — le « sac délibérément trop petit » du canon §1 aurait été vidé de sa substance.
- **Une catégorie de ravitaillement structurelle** — `PersistedInventoryItem.supply` est posée par
  le Comptoir ; `countCarriedSupplies` la lit **avant** de retomber sur ses regex de noms, qui ne
  servent plus que pour le butin nommé par l'IA (#183). Renommer un libellé d'affichage ne peut
  donc plus changer l'estimation du retour.
- **Le repos au feu lit le sac, il ne suppose plus.** `applyRest(..., { hasProvisions })` recevait
  `true` en dur depuis #183, faute de moyen de reconnaître une provision ; le marqueur `supply` du
  Comptoir le rend enfin possible, donc le site d'appel passe `hasProvisionsInBag(inventory)`. Sans
  ce branchement un joueur n'achetant rien récupérait quand même +60 faim/soif à chaque feu — le
  seul chemin qui restaure ces jauges, `ItemGainedEffect` n'ayant aucun champ faim/soif — ce qui
  annulait l'arbitrage que #249 existe pour créer. **Eau _ou_ nourriture suffit** : le canon §3 dit
  « des provisions » sans distinguer, et le feu restaure les deux jauges d'un même geste ; exiger
  les deux inventerait une règle plus dure que le canon.
- **Idempotence par `(characterId, purchaseId)` unique**, et non par verrou applicatif : deux
  requêtes concurrentes se disputent l'index, la perdante reçoit P2002 et **rejoue** le résultat de
  la gagnante. Un **refus n'écrit rien**, donc ne consomme pas le `purchaseId` — le joueur corrige
  son panier et réessaie avec le même identifiant.
- **Un refus est un HTTP 200**, pas un 4xx : « or insuffisant » ou « sac plein » est une réponse de
  jeu légitime que le client affiche, pas une requête malformée.
- **La monnaie s'appelle l'or, plus le fer** (décision produit du 2026-08-09, prise pendant #249).
  Le canon `11-INVENTORY-ECONOMY.md` §2 interdisait explicitement le mot « or » ; cette interdiction
  a été **levée** et le canon réécrit — ne pas la rétablir. Persistée sous `Character.gold`,
  `CounterPurchase.totalGold` / `goldAfter`, `GameSession.contractRewardGold`. La migration
  `20260809140000_rename_iron_to_gold` utilise `ALTER TABLE … RENAME COLUMN` et non un drop/create :
  les colonnes portent de l'or gagné en combat. Le fer reste un **matériau** du monde (armes,
  armures, « odeur de fer chaud ») — seule la monnaie change de nom.
- **Le tenancier du Comptoir n'est pas L'Aveugle.** Le Comptoir est purement transactionnel en
  v0.2.1 (aucun appel IA) ; si un dialogue lui est ajouté, il devra recevoir son propre constructeur
  de prompt — `buildAveugleTalkPrompt` est réservé à la voix de L'Aveugle.
- **`RunContract.targetDepth` est optionnel, pas défaillant** (#260). Le canon §2 dit que « le
  système ne suppose jamais que toute quête est un donjon », mais le type imposait `3 | 5 | 7` à
  tous : une escorte devait mentir en se déclarant profonde de 3 paliers. La profondeur n'existe
  désormais que pour `family: 'dungeon'`, et **aucune règle n'invente de valeur par défaut** —
  `canDescend` répond `false` sur un contrat sans paliers, `estimateRemainingMinutes` renvoie la
  durée cible du contrat. Un défaut aurait été pire que l'absence : il aurait fait pousser un donjon
  sous une quête qui n'en a pas, silencieusement.
- **Les tags sont qualitatifs côté client, chiffrés côté serveur.** `danger` (`easy | medium | hard`)
  et `duration` (`short | long | major`) sont ce que le joueur lit ; `targetDurationMinutes` reste
  interne. Publier les minutes transformerait une estimation qui dérive avec la façon de jouer en
  une promesse que le moteur ne peut pas tenir. Le vocabulaire de danger est **neutre** (Facile /
  Moyen / Difficile) et non fictionnel : un label in-world se lit comme de la saveur, pas comme un
  avertissement — décision produit du 2026-08-09.
- **Le narrateur garde la profondeur visée** (décision produit du 2026-08-09, prise contre ma
  recommandation et assumée comme telle). Le prompt continue d'émettre `Target depth: N floors` pour
  un donjon, afin que la descente s'écrive avec un sens de la distance. Le canon §4 a été **adapté**
  plutôt que contredit : son interdiction porte sur l'**interface**, et la règle opposable à l'IA
  devient « ne jamais l'écrire dans la prose ». Risque connu et inscrit au canon : un modèle à qui
  l'on donne un nombre tend à l'imprimer ; si la prose annonce « il reste quatre paliers », c'est la
  transmission qu'il faudra retirer, pas la consigne qu'il faudra durcir. Un contrat sans paliers ne
  reçoit aucun chiffre et se voit interdire explicitement le vocabulaire de descente.
- **Les colonnes #260 sont toutes nullables, et une famille absente se lit `dungeon`.** Les sessions
  écrites avant la migration portent un contrat accepté qui doit rester jouable ; `readContract`
  comble commanditaire et tags par des valeurs **milieu d'échelle** (`medium` / `long`), jamais
  `easy`, pour ne pas sous-vendre un run que le joueur s'apprête à accepter. En revanche un donjon
  dont la profondeur a disparu renvoie `null` : mieux vaut pas de contrat qu'un donjon que le joueur
  ne pourra jamais descendre.

### Contrats et mémoire

- **La mémoire interne est en pivot anglais fixe**, indépendante de la locale de narration : un
  changement de langue en cours de run ne doit jamais traduire ni corrompre le canon. #168
- **Le client n'infère aucune règle** — `SceneResponse` et `InventoryActionResponse` portent
  l'instantané de survie, les conditions actives, l'or persistant, l'objectif joueur, le
  `CombatSnapshot` et le `endReason` autoritaire. La structure cachée du run (`canDescend`, paliers,
  estimation) ne doit pas devenir une information affichable par accident.
- **`POST /api/character/resolve-vocation` est stateless** (aucune écriture Prisma, toujours HTTP 200) : l'IA propose une des 4 vocations canon, le serveur reste souverain sur l'identifiant retenu
  via `z.enum`. Réponse en union discriminée `resolved` | `fallback`. #152

## Dette et suivis connus

- Montée `express-rate-limit` v7 → v8 pour envelopper le repli IP de `userOrIpKey` dans
  `ipKeyGenerator` (/64 IPv6).
- Re-mesure périodique de la disponibilité des modèles `:free` — le catalogue OpenRouter tourne.
- #129 est **à re-scoper** : son golden path valide un parcours (landing → auberge → session) qui ne
  décrit plus le jeu après la refonte.
- Premier build Coolify à vérifier (cf. Dockerfile ci-dessus).

- **Une mécanique livrée sans écran n'est pas jouable.** Audit du 2026-09-08 : le palier, l'effet de
  l'équipement porté et la succession étaient entièrement livrés côté serveur et invisibles côté
  joueur. Le backend avance plus vite que le frontend n'expose, et l'écart ne se voit dans aucun
  test. En livrant une mécanique visible par le joueur, ouvrir le ticket frontend dans la foulée
  (#302, #303, #304 comblent le retard constaté) — le décalage se rattrape mal une fois installé.

## Règles de tenue de ce fichier

- On y écrit **pourquoi**, pas **quoi** ni **quand**. L'avancement vit sur GitHub, la chronologie
  dans [[log]].
- Pas de champ `updated:` — il mentait ; `git log -1 --format=%cs -- <fichier>` est la seule date fiable.
- Une PR ne touche ce fichier **que** si elle a pris une décision non évidente. Une PR de routine ne
  touche aucun document.
