# Wiki Log — Journal chronologique (append-only)

> Chaque entrée = une décision ou un pivot passé. Ne jamais modifier les entrées existantes. Ajouter en bas.

---

## early-2026 — Pivot produit : abandon vision RP générique → GRIMOIRE / Velkhar

Abandon complet de la vision "RP générique" (`docs/private/archive/Roleplay_IA_Masterplan.md`) au profit de **GRIMOIRE — Of Ash and Salt**, monde de **Velkhar** (roguelike narratif désertique, run 3-15h). Univers, stack, archi = refondus. L'ancien masterplan est conservé en archive pour référence historique uniquement.

---

## 2026-06-28 — Sync GDD : alignement docs sur Velkhar canon (terminée)

Passe de synchronisation documentaire pour aligner tout le repo sur le GDD Velkhar (le code avait été initialisé sur une vision "Valorain"). Fichiers mis à jour : `CLAUDE.md` racine, `docs/public/current-state/MEMORY.md`, `docs/public/tech/TECH_STACK.md`, `apps/frontend/CLAUDE.md`, `apps/backend/CLAUDE.md`, `docs/public/design/GAME_DESIGN.md`. Aucun code TypeScript modifié (reporté). Plan de traçabilité archivé côté privé.

---

## 2026-06-30 — Décisions DA mockups Hub + Session (contraignantes Phase 1B)

Suite à la revue DA des mockups Hub L'Aveugle et Session (`docs/private/archive/legacy/teck_docs/DA-REVIEW-MOCKUPS-2026-06-30.md`) :

1. **"Classe" → "Vocation"** dans tous les labels UI — non négociable, blocant pour Character Create
2. **L'Aveugle** = choix dynamiques générés par l'IA à chaque tour (pas 4 boutons fixes prédéfinis)
3. **Dé d20** affiché uniquement en modal overlay aux pivots narratifs — jamais visible par défaut dans l'interface
4. **Images de biome** = statiques pré-générées (pas de génération runtime par scène, coût/latence trop élevés)

---

## 2026-07-02 — Migration docs/ : GDD rapatrié dans le repo, structure LLM Wiki

- `docs/public/raw/` créé : contient les 25 fichiers GDD Velkhar actifs (gitignoré — physiquement présent, non commité)
- `docs/public/wiki/` créé : `index.md` (routeur GDD + doc) + ce `log.md`
- `ZCodeProject/GDD/_archive-v1/` supprimé (zip backup : `~/Desktop/gdd-archive-v1-backup-2026-07-02.zip`)
- `AGENTS.md` créé à la racine (standard multi-IA : Cursor, Windsurf, Copilot, etc.)
- `docs/04-references/GDD-MAP.md` fusionné dans `docs/public/wiki/index.md` puis supprimé
- `docs/public/current-state/plan-sync-gdd.md` supprimé (sync terminée, contenu repris)
- `docs/public/design/animation.md` archivé dans `docs/private/archive/legacy/` (items restants → issues GitHub)
- `docs/public/design/GAME_DESIGN.md` : chirurgie (§3 + §11 supprimés, §4 compressé, §7.1/§7.6 → pointeur DESIGN_TOKENS.md, §8.4 corrigé)

---

## 2026-07-03 — Sync canon : GDD copié dans docs/public/raw

Le canon GDD Velkhar a été copié depuis `/Users/adembenmessaoud/ZCodeProject/GDD/` vers `docs/public/raw/` pour que le projet, les agents IA et la documentation partagent le même répertoire de vérité locale.

- `docs/public/raw/` contient désormais les 25 fichiers Markdown canon en local.
- `docs/public/raw/` est privé et gitignored : il reste lisible par les IA locales, mais ne doit pas être publié.
- Les anciens chemins frontend `valorain/` ont été renommés en `velkhar/`.

---

## 2026-07-03 — Décision stratégie produit : garder Velkhar, réduire le MVP

Revue PM du lore et du positionnement. Décision : **garder Velkhar comme IP principale** et ne pas pivoter vers Dungeons & Dragons comme univers. D&D reste seulement une référence de lisibilité JdR (d20, archétypes, enjeux visibles), pas une direction de contenu.

Changements de plan :

- MVP Phase 2 = vertical slice 45-70 min qui prouve mémoire, conséquences, L'Aveugle et Chronique texte.
- Runs complets 3-15h = objectif post-MVP / Phase 3+.

---

## 2026-07-03 — Réorganisation du vault docs en public/private

Le vault docs est passé à une structure simple :

- `docs/00-START-HERE.md` reste le point d'entrée unique.
- `docs/public/` contient les documents trackés et publiables : current-state, design, project, tech, wiki.
- `docs/private/` contient tout ce qui ne doit pas être publié : canon complet, plans, prompts, assets lourds, archives.
- Le canon GDD actif vit désormais dans `docs/public/raw/`.
- `pnpm check:canon` vérifie désormais `docs/public/raw/`.
- Lore exposé par paliers : L'Aveugle, Cendre, Calamine, Souvenirs d'abord ; Archontes, factions, régions et secrets par découverte.
- Priorité produit confirmée : memory/world-state/validation backend avant extension de régions, vocations, bestiaire, 3D dice ou leaderboard.

---

## 2026-07-04 — Architecture vault Obsidian + IA + RAG

Réduction des répétitions et séparation des sources de vérité :

- `docs/00-HOME.md` ajouté comme dashboard Obsidian humain.
- `docs/00-START-HERE.md` réduit en point d'entrée IA stable.
- `PROJECT_STATUS.md` devient la seule source pour phase, priorité et branche.
- `NEXT_ACTIONS.md` devient la seule source pour les actions immédiates.
- `ARCHITECTURE_RULES.md` devient la source des invariants backend/AI/frontend.
- `wiki/index.md` devient un index court vers `task-router.md` et `canon-index.md`.
- `PRIVATE_CANON_POLICY.md`, `DOCS_MAP.md` et `RAG_RULES.md` ajoutés dans `docs/public/reference/`.
- `PROJECT_OVERVIEW.md` + `LORE_PRIMER.md` fusionnés dans `PUBLIC_BRIEF.md`.
- Les `CLAUDE.md` et agents pointent vers les sources au lieu de recopier les règles.

---

## 2026-07-04 — Statut landing : préparation des frames T1 Cendres

La Phase 1A landing reste active. Le plan principal est `docs/private/plans/landing/PLAN-LANDING-CUBERTO-LEVEL.md`, et l'étape opérationnelle actuelle est la préparation/génération des frames **T1 Cendres** via `docs/private/plans/landing/LANDING_ASSET_PROMPTS.md`.

Phase 1B reste en backlog uniquement jusqu'à validation et merge de la landing.

---

## 2026-07-12 — Fix : trou de canon entre branches/worktrees

`docs/public/raw/` contenait déjà une copie complète et à jour du canon (25 fichiers), mais tous les docs de routage (`00-START-HERE.md`, `task-router.md`, `canon-index.md`, `RAG_RULES.md`, `PRIVATE_CANON_POLICY.md`) pointaient encore vers `docs/private/raw/` (gitignored). Résultat : sur une branche/worktree où `docs/private/` n'était pas recréé localement, une IA suivant ces liens croyait le canon manquant.

- Tous les liens de routage public pointent désormais vers `docs/public/raw/`.
- `PRIVATE_CANON_POLICY.md` réécrite : le canon est officiellement public et versionné, `docs/private/` ne sert plus qu'aux plans en cours / assets lourds / archives.
- `scripts/check-canon.sh` et `pnpm check:canon` supprimés (obsolètes : un dossier versionné ne peut pas "manquer" silencieusement, `git status` suffit).
- L'ancien doublon `docs/private/raw/` (gitignored) a été supprimé — `docs/public/raw/` est l'unique source de vérité.

---

## 2026-07-12 — Réorganisation : `current-state/` allégé, `plans-actifs/` créé

`current-state/` mélangeait statut vivant (`PROJECT_STATUS.md`, `NEXT_ACTIONS.md`), un routeur de compatibilité (`MEMORY.md`) et deux plans de travail actifs — trop chargé, confus à parcourir.

- `docs/public/current-state/MEMORY.md` supprimé après vérification complète : `AGENTS.md` (Codex) ne le référençait pas ; seuls 2 skills Claude Code (`status`, `implement`) pointaient vers un chemin fantôme `docs/MEMORY.md` jamais existant post-reorg — corrigés pour lire directement `PROJECT_STATUS.md`/`NEXT_ACTIONS.md`.
- `PLAN-GAMESESSION-1B.md` et `PHASE-1B-BACKLOG.md` déplacés dans le nouveau dossier `docs/public/plans-actifs/` (plans de travail en cours, séparés du statut vivant).
- `current-state/` ne contient plus que `PROJECT_STATUS.md` + `NEXT_ACTIONS.md`.
- Références croisées corrigées : `DOCS_MAP.md`, `TECH_STACK.md`, `PLAN-GAMESESSION-1B.md`, `AGENTS.md`, `apps/backend/CLAUDE.md`, `README.md`.

---

## 2026-07-12 — Fusion `wiki/` + `reference/` → `nav/`

`wiki/` et `reference/` avaient la même fonction (aider à naviguer le vault) sans frontière claire, et 4 fichiers différents (`00-START-HERE.md`, `docs/public/README.md`, `wiki/index.md`, `reference/DOCS_MAP.md`) redirigeaient tous vers les mêmes cibles — confusion et trou d'hallucination potentiel.

- `wiki/` et `reference/` fusionnés en `docs/public/nav/` (contient `DOCS_MAP.md`, `task-router.md`, `canon-index.md`, `PRIVATE_CANON_POLICY.md`, `RAG_RULES.md`, `log.md`).
- `docs/public/README.md` et `wiki/index.md` supprimés (pure redite de `00-START-HERE.md` / `DOCS_MAP.md`, aucune info unique).
- `00-START-HERE.md` reste l'unique point d'entrée IA ; `DOCS_MAP.md` reste la carte exhaustive.
- Tous les liens (`AGENTS.md`, `CLAUDE.md`, agents Claude Code, docs publiques, `apps/backend/CLAUDE.md`, `packages/shared/CLAUDE.md`) repointés vers `docs/public/nav/`.

---

## 2026-07-12 — Audit complet des liens : 2 chemins fantômes corrigés

Balayage de tous les fichiers contenant des liens markdown/wiki-links (`00-START-HERE.md`, `PROJECT_STATUS.md`, `NEXT_ACTIONS.md`, `DESIGN_TOKENS.md`, `GAME_DESIGN.md`, `PRIVATE_CANON_POLICY.md`, `canon-index.md`, `PHASE-1B-BACKLOG.md`, `TECH_STACK.md`, `ARCHITECTURE_RULES.md`, `DOCS_MAP.md`, `RAG_RULES.md`, `task-router.md`, `AGENTS.md`, `CLAUDE.md` (racine + apps + packages), agents Claude Code).

- `task-router.md` et `apps/frontend/CLAUDE.md` référençaient encore `docs/private/plans/landing/PLAN-LANDING-CUBERTO-LEVEL.md` et `LANDING_SEO_BILINGUAL_PLAN.md` — ces fichiers n'existent plus (Phase 1A livrée, plans landing archivés). Remplacés par les entrées vers les plans actifs réels : `docs/private/plans/gamesession-1b/NOTES-IMPLEMENTATION.md` et `docs/private/plans/ui-kit/PLAN-UI-KIT-PRODUCTION.md`.
- `TECH_STACK.md` : mention résiduelle "canon privé" corrigée en "canon (`docs/public/raw/`)" — terminologie obsolète depuis que le canon est public.
- Tous les autres liens vérifiés (contenu lu intégralement, pas juste grep) : corrects.

---

## 2026-07-17 — Séparation des états frontend, backend et release

Le travail parallèle frontend/backend provoquait des conflits récurrents dans `PROJECT_STATUS.md`
et `NEXT_ACTIONS.md`. Les responsabilités documentaires sont désormais séparées :

- `PROJECT_STATUS.md` devient un index stable sans branche active ;
- `NEXT_ACTIONS.md` devient un routeur de compatibilité sans backlog dupliqué ;
- `FRONTEND_STATUS.md` + `FRONTEND_NEXT.md` appartiennent au chantier frontend ;
- `BACKEND_STATUS.md` + `BACKEND_NEXT.md` appartiennent au chantier backend ;
- `RELEASE_READINESS.md` est synchronisé après merge sur `develop`, jamais depuis deux branches concurrentes ;
- les skills et agents Codex/Claude ont été alignés sur ces frontières.

---

## 2026-07-17 — Clôture documentaire des chantiers UI Kit et Phase 1B

L'issue UI Kit #93 est fermée et sa PR #121 est mergée. Les anciens plans UI Kit, vertical slice
Game Session, durcissement moteur et backlog Phase 1B ont été déplacés de `plans-actifs/` vers
`public/archive/plans/`. Le frontend v0.1 reste ouvert uniquement pour l'auth, les intégrations
réelles, la configuration de production et le golden path ; les écrans secondaires sont post-v0.1.

---

## 2026-07-22 — Mémoire projet et état post-merge par PR

La mémoire opérationnelle est désormais routée par un `MEMORY.md` racine sans état dupliqué, puis
par `00-START-HERE.md` et les sources `current-state`. Claude prend backend/shared/IA par défaut et
Codex prend frontend par défaut, mais l'utilisateur peut assigner chaque agent à n'importe quel
domaine. L'agent frontend Claude est conservé et protégé contre une suppression accidentelle.

- chaque PR fonctionnelle met à jour la paire `STATUS/NEXT` de son domaine selon l'état attendu
  après merge ;
- une PR qui change un bloqueur `phase: predeploy` met aussi à jour `RELEASE_READINESS.md` ;
- un contrôle CI vérifie cette présence, avec exception explicite et justifiée ;
- le template PR, le labeler et les skills projet utilisent uniquement `predeploy`/`postdeploy` et
  les domaines frontend/backend/AI ;
- les wikilinks publics sont contrôlés automatiquement ;
- le dashboard Obsidian et les instructions d'agents legacy ont été réparés.
- `.agents/skills/` est la source canonique unique des skills projet ; `.claude/skills/` utilise des
  liens relatifs contrôlés en CI, et les 10 skills passent le validateur officiel.

---

## 2026-08-08 — Grilling : le roguelike reste un storytelling continu

Le grilling produit mené avec Adem révoque la séparation décidée le 2026-08-06 entre quatre
interfaces Auberge / exploration / combat / retour. Cette séparation répondait au bon diagnostic —
le jeu manquait de moteur — mais à la mauvaise cause : l'interface narrative n'est pas le problème.
Ce sont les règles, le risque, les objectifs et les conséquences qui doivent créer le jeu.

Décisions validées :

- l'Auberge, le voyage, la quête, le donjon et le retour utilisent une seule coque storytelling ;
- seul le combat transforme temporairement la scène en interface tactique ;
- l'Auberge devient un hub de scènes avec Comptoir, L'Aveugle, Contrats et Forge ;
- un contrat principal est obligatoire et devient une quête générique structurée par le backend ;
- trois contrats ordinaires affichent seulement un tag textuel de danger et de durée ;
- le run commence au départ de l'Auberge et l'IA reçoit l'objectif à chaque tour ;
- pour v0.2.1, salles, indices, carte, paliers, profondeur et estimation de retour sont cachés ;
- « Faire demi-tour » reste toujours disponible hors combat ; le retour est joué, distinct, plus
  court et plus facile ;
- les scènes utilisent 45 à 60 images pré-générées et réutilisables, sans génération runtime.

Le compromis de mystère total est volontaire : l'état actuel du personnage reste lisible, mais le
jeu ne prédit pas les dangers futurs. Les playtests v0.2.1 décideront si des avertissements doivent
revenir. Coordination documentaire et backlog : #244 ; EPICs #250, #251, #252 et #253.

---

## 2026-08-09 — Direction artistique des scènes : continuité « Cendre et Sel »

La bibliothèque de scènes conserve la direction artistique déjà portée par L'Aveugle, les
vocations et l'UI : réalisme illustré cinématique, matières usées, humanité désertique, ombres
chaudes et lumière ambrée. La génération d'un extérieur témoin de Velkhar a validé l'extension de
cette identité au monde ouvert.

Décisions validées :

- ne pas remplacer les assets existants par une nouvelle famille graphique ;
- utiliser la Cendre dorée comme lumière surnaturelle et élément narratif immédiatement visible ;
- représenter Velkhar comme une mégapole de pierre pâle bâtie sur des ruines archontiques, jamais
  comme un château gothique européen isolé ;
- conserver des personnages humains, équipés pour le désert, et des environnements habités ;
- lorsqu'un personnage principal apparaît, il représente le joueur : visage caché ou peu défini,
  équipement d'aventurier fonctionnel et usé (capuche, cuir, arme, sacoche, ceinture et
  provisions), sans lui imposer une identité ou une classe visuelle fixe ;
- traiter par défaut chaque image comme un plateau de lieu réutilisable par la narration IA :
  décrire l'architecture, les matières, la lumière et l'ambiance sans imposer la présence du joueur
  ni une action précise qui pourrait contredire la scène générée ; le joueur n'apparaît que lorsque
  sa présence est indispensable à la compréhension du lieu ou de l'échelle ;
- augmenter le mystère, la monumentalité et l'émotion sans sacrifier la simplicité de lecture sur
  mobile ;
- varier systématiquement entre les scènes la caméra, la densité spatiale, la météo ou l'heure,
  l'action focale et la balance colorée ; éviter notamment la répétition « joueur à gauche +
  panorama monumental à droite » ;
- réserver les zones les plus sombres aux cadres et aux emplacements d'interface, sans écraser les
  sujets ni la Cendre.

---

## 2026-08-09 — Bibliothèque visuelle : plateaux de run neutres

La cible initiale de 45 à 60 images supposait davantage de variantes narratives. Elle est ramenée à
30 à 38 assets : 6 à 8 pour l'Auberge, 8 à 10 pour les voyages et 16 à 20 pour les donjons.

L'Auberge conserve ses scènes fixes et incarnées. Hors du hub, le décor générique montre d'abord le
lieu, sa lumière et ses matières ; joueur, monstre et action sont absents par défaut pour ne pas
contredire la narration IA. Une image de traversée, de camp, d'arrivée ou de combat reste possible,
mais uniquement comme variante événementielle sélectionnée par un identifiant structuré.

Les vues élevées, obliques ou verticales deviennent un motif récurrent — sans être exclusif — pour
mettre en valeur la géométrie des lieux et leur lecture immédiate sur mobile. Chaque famille conserve
une manifestation visible de la Cendre dorée, utilisée comme force surnaturelle structurante plutôt
que comme simple éclairage décoratif.

---

## 2026-08-09 — Facture visuelle : animation adulte et bande dessinée peinte

Une comparaison contrôlée sur le même reliquaire a opposé réalisme cinématique, animation adulte et
gravure de conte sombre. La facture principale retenue est l'animation adulte et bande dessinée
peinte : aplats d'ombre dessinés, volumes anguleux, contours expressifs sélectifs, texture sèche et
composition lisible sur mobile.

La gravure dense ne devient pas le rendu général du monde. Elle peut subsister comme registre
secondaire des Souvenirs, archives ou visions. Un second prototype sur L'Aveugle a confirmé que les
visages, les mains, l'or matériel et les petites couleurs humaines restent lisibles sans perdre la
dominante Noir, Sel et Cendre dorée.

---

## 2026-08-09 — Présence du joueur : caméra subjective, jamais d'avatar imposé

Le personnage joueur n'est jamais représenté dans les illustrations : ni corps, ni silhouette, ni
main, ni ombre, ni reflet. Cette règle protège la projection dans un protagoniste créé librement et
évite qu'une image pré-générée contredise la narration IA.

Lorsqu'un PNJ s'adresse au joueur, la caméra adopte son point de vue. Le prototype de L'Aveugle le
cadre seul, face à l'écran, les yeux aveugles maintenus dans l'ombre et les mains proches du bord de
table. Les silhouettes humaines non-joueur restent possibles pour donner l'échelle d'un lieu, sans
jamais être interprétables comme le protagoniste.

---

## 2026-08-09 — Direction artistique validée : Sel Taillé

Après comparaison de quatre factures sur la même scène et sur une même Game Session, la direction
retenue est **Sel Taillé** : animation adulte peinte pour l'émotion et les matières, structurée par
des masses noires découpées pour les ombres, l'architecture et l'interface. L'identité demeure
Light / Dark / Gold : lumière blanche de Sel, masse noire taillée, or matériel et Cendre dorée qui
remonte contre la gravité.

La version purement peinte manquait de signature propriétaire ; la découpe graphique pure était trop
agressive. Sel Taillé conserve environ 70 % de peinture et 30 % de découpe, avec trames fortement
réduites. Le pixel art et la gravure narrative restent des comparaisons archivées, pas la DA du jeu.

La même grammaire est validée sur desktop et mobile. Desktop conserve les choix en ligne et le HUD
complet ; mobile recadre l'illustration, empile les choix, garantit des cibles tactiles de 44 px et ne
dépend jamais d'un hover. L'effet de fissure dorée est un SVG prédessiné animé par transition, pas
un effet procédural généré à chaque interaction.

---

## 2026-08-09 — Révision DA : animation adulte peinte retenue

Après une dernière comparaison en contexte de jeu, la piste **animation adulte peinte** est retenue
à la place de Sel Taillé pour sa force émotionnelle, sa lisibilité et la qualité de ses matières.
« Arcane » demeure uniquement le nom informel du repère comparatif : la production ne doit imiter
aucune licence existante. L'identité propre reste fondée sur Light / Dark / Gold, la distinction
entre or matériel et Cendre lumineuse, les masses archontiques, le héros toujours hors champ et la
vue subjective face aux PNJ. Sel Taillé est archivé sans être supprimé. La déclinaison mobile de la
facture finale reste à valider.

---

## 2026-08-09 — Direction finale : Encre de Sel

La direction officielle devient **Encre de Sel**, une bande dessinée adulte dessinée et non réaliste.
La palette est désormais strictement limitée au Noir, au Sel blanc et à l'Or, HUD compris. La
référence maîtresse de L'Aveugle fixe les contours, les aplats anguleux, le nombre réduit de valeurs
et la texture posée à la main. Les pistes Sel Taillé et animation adulte peinte restent archivées.

La Game Session réserve une hauteur naturelle à deux à cinq lignes de narration, emploie des choix
de 72 px minimum avec un texte de 20 à 24 px et préfère le défilement à toute réduction forcée. Sac,
Chronique et Personnage deviennent trois boutons icônes. Les images de run conservent le protagoniste
hors champ et privilégient quelques masses graphiques lisibles plutôt que le détail architectural.

---

## 2026-08-09 — Game Session : lecteur narratif extensible

La Game Session abandonne les zones de texte à hauteur fixe. Sur desktop, l'illustration reste dans
une colonne d'environ 58 % et le lecteur narratif occupe les 42 % restants avec son propre
défilement. Il accepte neuf lignes ou davantage sans réduire la police. Les choix sont empilés,
mesurent au moins 88 px et grandissent naturellement jusqu'à trois lignes ou davantage. Sur mobile,
image, narration, choix et action libre suivent le flux vertical de la page.

Les choix adoptent des cartouches de bande dessinée à contour d'encre épais, angle coupé et ombre
dure, plutôt que des cadres fantasy fins. Le HUD conserve ses couleurs sémantiques historiques ; la
trichromie Noir / Sel / Or reste stricte pour les illustrations. Sac, Chronique et Personnage restent
des boutons icônes.

---

## 2026-08-09 — Game Session : hiérarchie de lecture recalibrée

La composition desktop en deux colonnes est conservée, mais sa hiérarchie interne est resserrée.
Le corps narratif devient prioritaire en 24 à 26 px avec un interlignage confortable. Les choix
courts occupent 64 à 72 px et passent en hauteur automatique lorsque leur texte demande davantage
de lignes. Leur libellé reste à 19 ou 20 px : aucune réduction de police ne compense un contenu long.

Les numéros ne sont plus des éléments décoratifs géants. Ils mesurent 32 à 36 px et sont contenus
dans un onglet doré de 44 à 48 px, séparé du texte. Les cartouches conservent l'angle coupé et la
grammaire dessinée d'Encre de Sel, mais emploient un contour de 2 à 3 px et une ombre dure de 3 px
pour éviter l'effet de grande plaque. Le défilement du lecteur sur desktop et le flux vertical de la
page sur mobile restent inchangés.

---

## 2026-08-09 — Identité du joueur : survivants mortels et Héritage

Chaque personnage est désormais défini comme un survivant déjà compétent, mais ordinaire et
mortel. Atteindre l'Auberge prouve qu'il sait combattre, fuir, camper et rationner ses ressources ;
la vocation détermine sa manière d'agir. Il n'est ni un élu ni obligatoirement un chasseur de
contrats. Le contrat structure et finance son expédition sans remplacer sa motivation personnelle.

Le joueur incarne l'**Héritage**, c'est-à-dire la continuité entre plusieurs personnages distincts.
Après une mort, un successeur trouve ou reçoit l'artefact transmis et le rapporte au _Doigt-Cassé_.
L'Aveugle reconnaît cet objet, les Souvenirs et les traces antérieures, jamais une âme réincarnée ni
le même visage. Le successeur n'hérite pas automatiquement de la réputation, des relations ou du
corps du défunt.

La symbolique temporelle est canonisée : le Sel blanc conserve le Passé, la Cendre dorée manifeste
le Présent encore modifiable, et le Noir figure le Futur inconnu ainsi que la Mort qui ferme les
possibilités. Formule de référence : **« Le Sel se souvient. La Cendre choisit. Le Noir attend. »**

Exception conservée : une transformation en Calciné corrompt l'artefact et empêche sa transmission.
Le successeur arrive alors pour sa propre raison ; l'Héritage continue par les Souvenirs, la
connaissance et les traces déjà laissées dans le monde.

---

## 2026-08-09 — Game Session finale et coque universelle

Le master de la Game Session **Encre de Sel** est validé. Il conserve l'illustration dessinée,
brutale et lisible, le lecteur narratif extensible à droite et les choix sous forme d'étiquettes
physiques, mais reprend le footer antérieur plus calme : bandeau noir continu, petites icônes,
couleurs sémantiques, valeurs, jauges fines et séparateurs. Le gore raconte désormais la scène et
ses conséquences sans rendre le HUD structurel inutilement macabre.

Cette composition devient la coque unique du gameplay. L'Auberge — L'Aveugle, Comptoir, Contrats
et Forge — utilise le même header, la même image à gauche, le même lecteur et les mêmes choix à
droite, ainsi que le même footer que le voyage, la quête, le donjon et le retour. Le contenu et le
degré de violence changent avec la situation, pas la structure de navigation. Le combat demeure la
seule transformation majeure.

Les anciennes explorations de direction artistique et l'ancienne bibliothèque de scènes sont
archivées de manière récupérable avant la reprise des lots dans cette direction finale.
