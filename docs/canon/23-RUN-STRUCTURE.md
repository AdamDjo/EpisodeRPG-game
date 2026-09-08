# 23 — Structure du Run

> _Le monde ne te montre pas sa carte. Il te laisse seulement choisir si tu continues._

---

## 0. Principe

Ce fichier définit la forme d'un run : pourquoi le joueur part, comment la quête reste cohérente,
où vit la structure roguelike et comment il rentre. La révision du **2026-08-08** remplace la
séparation en quatre interfaces décidée le 2026-08-06.

> **GRIMOIRE reste un storytelling continu.** Le roguelike vient des règles, des ressources, du
> risque, de la mort et des conséquences — pas d'une carte de salles ni d'un changement d'écran.

Le run complet suit cette continuité :

```text
AUBERGE → CONTRAT → VOYAGE → QUÊTE / DONJON → DEMI-TOUR → RETOUR → AUBERGE
                               ↕
                         COMBAT TACTIQUE
```

L'Auberge, le voyage, le donjon et le retour utilisent la **même interface narrative**. Seul le
combat transforme temporairement la scène en interface tactique dédiée.

---

## 1. L'Auberge — point d'entrée unique

Chaque partie commence à l'Auberge de L'Aveugle. Ce n'est ni un menu ni un tableau de gestion :
c'est un lieu vivant composé de scènes illustrées et de dialogues.

Quatre destinations restent accessibles sans coût depuis l'interface narrative :

| Destination   | Fonction                                                       |
| ------------- | -------------------------------------------------------------- |
| **Comptoir**  | Acheter eau, vivres, soins et ressources                       |
| **L'Aveugle** | Lore, Souvenirs, commentaire des contrats et contrats spéciaux |
| **Contrats**  | Consulter les trois quêtes ordinaires disponibles              |
| **Forge**     | Réparer et préparer l'équipement                               |

Ces destinations sont des raccourcis de navigation, pas des écrans étrangers à la fiction. Chacune
ouvre une scène avec son propre décor, son interlocuteur et ses choix narratifs.

---

## 2. Le contrat est une quête

Le joueur ne choisit pas un « niveau ». Il accepte une **quête principale** qui donne une direction
à son histoire.

Un contrat peut être une exploration de donjon, une escorte, une enquête, une chasse, une
récupération, une négociation ou un dilemme. La majorité des contrats majeurs mène vers un lieu
très dangereux, mais le système ne suppose jamais que toute quête est un donjon.

### Ce que le backend possède

| Champ               | Rôle                                                               |
| ------------------- | ------------------------------------------------------------------ |
| Objectif            | Condition mécanique de réussite                                    |
| Destination         | Lieu ou personne vers laquelle la narration doit converger         |
| Commanditaire       | Source et voix de la quête                                         |
| Danger              | Niveau qualitatif utilisé pour la génération et l'équilibrage      |
| Intensité           | Longueur du contrat sur l'échelle 3 / 5 / 7, toutes familles       |
| Durée cible         | Engagement court, long ou majeur, lu depuis l'intensité            |
| Récompense          | Paiement et conséquences en cas de réussite                        |
| Conditions d'échec  | États qui rendent la quête impossible ou marquent le retour à vide |
| État de progression | Étapes accomplies, objectif sécurisé, réussite ou échec            |

Le backend choisit et valide cette structure. L'IA lui donne sa prose, ses personnages et ses
scènes ; elle ne peut ni inventer la condition de victoire ni déclarer seule la quête terminée.

La **famille** de quête est fermée : `dungeon`, `escort`, `investigation`, `hunt`, `recovery`,
`negotiation`, `dilemma`. Seule `dungeon` descend, et elle seule porte une profondeur visée — les
autres n'en ont aucune, et aucune règle du moteur n'a le droit de leur en inventer une pour combler
un champ manquant (#260).

### Deux axes, jamais confondus

Un contrat est décrit par deux chiffres orthogonaux, et le mot « palier » ne désigne que le premier :

| Axe                         | Question posée           | Échelle   | Où il vit                |
| --------------------------- | ------------------------ | --------- | ------------------------ |
| **Palier** (`danger`)       | À quel point c'est dur   | 0 – 9     | `CONTRACT_WEIGHT`, §2bis |
| **Intensité** (`intensity`) | Combien de temps ça dure | 3 / 5 / 7 | `QuestIntensity`, ce §   |

L'**intensité est universelle** : elle est portée par toutes les familles, pas seulement par les
donjons (#269). Une chasse d'intensité 7 est un engagement aussi long qu'une descente d'intensité 7 ;
elle n'a simplement pas d'étages. La **profondeur visée d'un donjon est une lecture de son
intensité**, sur la même échelle et jamais une seconde valeur : les deux ne peuvent pas diverger
puisqu'une seule est jamais fournie. Un contrat sans donjon ne porte donc aucune profondeur, mais il
porte bien une longueur.

Les deux tags sont **qualitatifs côté joueur, chiffrés côté moteur** :

| Tag    | Valeurs affichées          | Ce qui reste interne                                      |
| ------ | -------------------------- | --------------------------------------------------------- |
| Danger | Facile / Moyen / Difficile | Le palier qui pilote génération et équilibrage (§2bis)    |
| Durée  | Court / Long / Majeur      | L'intensité (3 / 5 / 7) et ses minutes cibles (45/90/150) |

L'intensité brute n'est **jamais projetée au client** : la couche de projection la retire du contrat
et ne laisse passer que son tag qualitatif. Un chiffre envoyé à l'interface deviendrait le compte à
rebours que §4 interdit.

Le vocabulaire de danger est volontairement **neutre et ludique**, pas fictionnel : le joueur doit
lire l'arbitrage d'un coup d'œil, et un label in-world (« routine », « funeste ») se lit comme de la
saveur, pas comme un avertissement.

### Le panneau

- présente **trois contrats ordinaires** simultanément ;
- conserve la sélection jusqu'à la fin d'un run ou un événement du monde ;
- affiche un **tag textuel de danger** et un **tag de durée**, sans score ni icône ;
- ne révèle jamais les rencontres, la structure du lieu ni les récompenses cachées.

L'Aveugle peut commenter ces contrats, en recommander un selon l'histoire du joueur et révéler des
contrats spéciaux débloqués par le lore ou les Souvenirs. Les contrats ordinaires restent cependant
disponibles sans dépendre d'une décision du modèle IA.

### Liberté et verrouillage

- Un seul contrat principal peut être actif.
- Un contrat est obligatoire pour quitter l'Auberge en v0.2.1.
- Le joueur peut en changer sans pénalité tant qu'il n'est pas parti.
- Le contrat se verrouille au franchissement de la porte de l'Auberge.
- Aucun contrat n'est bloqué selon l'équipement : le jeu avertit, le joueur décide.
- Des objectifs secondaires peuvent émerger, sans devenir des contrats supplémentaires.

---

## 2bis. Équipement contre palier — l'écart de puissance

Le jeu n'interdit jamais un contrat selon l'équipement (§2 « Liberté et verrouillage »), mais il ne
le rend jamais facile non plus. Chaque contrat porte un **palier** (`CONTRACT_WEIGHT`) chiffré à
partir de son tag de danger : Facile = 3, Moyen = 6, Difficile = 9. Ce palier mesure la **difficulté**,
jamais la longueur — celle-ci est l'intensité, sur son propre axe (§2 « Deux axes »). Le personnage porte un **score de
puissance**, calculé à partir de son équipement effectivement porté :

- l'arme en main principale (tier 0 à 3, catalogue fermé — `11-INVENTORY-ECONOMY.md` §4) ;
- l'armure portée (tier 0 à 3, même catalogue) ;
- les reliques détenues (1 point par artefact, plafonné à 3).

Score de puissance = arme + armure + reliques, sur une échelle de 0 à 9.

L'**écart** est `score − palier`. Il pilote quatre curseurs à la fois — le rythme du combat, le
registre de mort, et la récompense — jamais un seul en isolation :

| Écart | Registre       | Tuer en (tours) | Mourir en (tours) | Mort       | Récompense |
| ----- | -------------- | --------------- | ----------------- | ---------- | ---------- |
| ≥ +1  | Tendu          | 3               | 6                 | Sobre      | ×0,6       |
| 0     | Difficile      | 4               | 4                 | Sobre      | ×1         |
| −1    | Très difficile | 6               | 3                 | Brutale    | ×1,3       |
| ≤ −2  | Impossible     | 9               | 2                 | Gore total | ×1,6       |

Deux principes gouvernent ce tableau :

- **Aucun run n'est facile.** Un équipement parfaitement calibré au palier (écart 0) reste étiqueté
  « Difficile », jamais « Facile » — le palier Facile lui-même pèse 3, jamais 0, précisément pour
  qu'aucun contrat n'offre un écart toujours positif par construction.
- **Farmer le bas ne mène nulle part.** Un personnage largement surqualifié (écart ≥ +1) tue et meurt
  plus vite, mais est payé 40 % de moins — revenir sur des contrats faciles avec un équipement
  avancé n'est jamais la stratégie optimale.

Le registre de mort ne concerne que la narration d'un verdict `dead` (`08-DEATH-MORTALITY.md`) — il
ne modifie ni le verdict de KO (`saved` / `captured` / `dead`, résolu indépendamment) ni les règles
de survie. Le score de puissance et l'écart ne sont jamais persistés : ils sont recalculés à chaque
tour de combat et à l'extraction, à partir de l'inventaire courant et du palier du contrat actif.

---

## 3. Le run commence au départ

Le run ne commence pas à l'entrée d'un donjon. Il commence lorsque le joueur quitte l'Auberge :
les ressources sont engagées, les conséquences persistent et la quête devient active.

Le voyage est déjà du roguelike narratif : il peut consommer de l'eau ou des vivres, produire une
rencontre, offrir un objet, infliger une condition ou déclencher un combat. Le joueur continue
d'utiliser la boucle normale : narration, image, choix proposés et action libre.

### Cohérence de la quête

Le backend réinjecte l'objectif et son état au narrateur à chaque tour. L'IA doit :

1. respecter toute action libre du joueur ;
2. adapter la scène aux détours réellement choisis ;
3. ne jamais oublier le contrat actif ;
4. proposer régulièrement au moins une voie naturelle vers l'objectif ;
5. rappeler la quête dans la prose lorsqu'elle devient pertinente, sans répéter la même phrase.

Le HUD porte un rappel repliable de l'objectif principal. Il n'affiche ni checklist ni flèche de
direction. Un détour n'échoue pas automatiquement : la quête échoue seulement si le joueur revient
sans l'objectif, l'abandonne explicitement ou accomplit une action qui la rend impossible.

---

## 4. Donjons — structure cachée, expérience narrative

Le moteur peut continuer à générer des paliers, des salles, des connexions, des rencontres et une
profondeur. Ces données servent les règles, la persistance, le bestiaire et la durée du run. Elles
ne deviennent pas une carte affichée au joueur.

Pour la v0.2.1, l'interface ne révèle jamais :

- le type mécanique d'une salle ;
- une icône combat, trésor, repos ou rencontre ;
- un indice annonçant ce qui attend derrière un passage ;
- le numéro du palier ou la profondeur maximale ;
- la carte ou les connexions du donjon ;
- une estimation chiffrée ou qualitative du retour.

**Le narrateur, lui, connaît la longueur visée** (#260, généralisé en #269). Elle lui est transmise
dans son contexte pour qu'il sache écrire un run qui va quelque part — le ton d'un troisième temps
sur sept n'est pas celui d'un dernier. Cette interdiction porte donc sur l'**interface**, pas sur le
prompt : l'IA reçoit le chiffre, et la règle qui lui reste opposable est de ne jamais l'**écrire**
dans sa prose, ni de le transformer en compte à rebours.

Ce que reçoit le narrateur dépend de la famille, mais **il reçoit toujours une longueur** :

- un **donjon** reçoit sa profondeur visée, en étages, parce que sa longueur _est_ une descente ;
- une famille **sans étages** reçoit son intensité en temps narratifs, avec l'interdiction
  explicite de parler de descente, de paliers ou d'un fond à atteindre. Elle n'est plus laissée
  sans repère de longueur, comme c'était le cas avant #269 : un contrat dont le narrateur ignore
  la durée se termine quand le modèle s'en lasse.

Le risque assumé est connu : un modèle à qui l'on donne un nombre a tendance à l'imprimer. Si la
prose se met à annoncer « il reste quatre paliers », c'est cette transmission qu'il faudra retirer,
pas la consigne qu'il faudra durcir.

L'image montre le **lieu présent**, jamais la prochaine conséquence. La narration décrit ce que le
personnage voit maintenant ; les choix restent des actions fictionnelles, pas des cartes de salles.

Exemple :

> _Le corridor se divise autour d'un pilier fendu. Une galerie descend sous les racines de pierre ;
> l'autre disparaît derrière une porte sans poignée._

Le backend sait où mènent ces choix. Le joueur, lui, avance dans l'inconnu.

> **Compromis assumé v0.2.1 :** le mystère prime sur la prévisibilité du trajet. Les jauges et
> l'état du personnage restent lisibles, et le demi-tour reste toujours disponible, mais le jeu ne
> prédit pas les dangers futurs. Ce choix doit être réévalué après playtest si les morts paraissent
> arbitraires.

---

## 5. Le demi-tour

« Faire demi-tour » est une action permanente hors combat. Elle ne dépend pas d'une proposition de
l'IA et n'attend pas la fin d'un palier. Le joueur reste libre de renoncer dès qu'il estime son état
trop fragile.

En combat, le demi-tour passe par l'action de fuite et ses règles propres (`10-COMBAT.md §7`). Une
fuite vers l'arrière engage le retour ; une fuite vers l'avant poursuit la quête.

---

## 6. Le retour

> **Le retour n'est pas une téléportation.**

Il se joue dans la même interface narrative que l'aller. Il reste :

| Propriété         | Décision                                                               |
| ----------------- | ---------------------------------------------------------------------- |
| **Distinct**      | Le moteur génère un trajet différent, jamais l'aller rejoué à l'envers |
| **Plus court**    | Quelques scènes seulement pour éviter le remplissage                   |
| **Plus facile**   | Moins de rencontres dures que pendant la progression                   |
| **Encore risqué** | Les ressources et blessures accumulées continuent de peser             |

Le jeu ne montre aucune estimation avant ou pendant ce trajet en v0.2.1. Les règles internes
peuvent calculer sa longueur et son coût pour garantir la cohérence, sans exposer ces valeurs au
frontend ni les transformer en avertissement narratif.

---

## 7. Le combat — seule transformation d'interface

Quand un combat commence, la scène narrative se transforme de façon cinématographique : le décor
reste reconnaissable, mais l'espace central révèle ennemis, initiative, actions, états et jets.

Le joueur conserve l'action libre. Le backend rattache l'intention à une action tactique autorisée
— attaque, défense, commandement, artefact ou fuite — puis arbitre. L'IA raconte le verdict sans
inventer de règle. À la fin du combat, l'interface revient naturellement au storytelling.

---

## 8. Les images de scène

La v0.2.1 utilise une bibliothèque pré-générée et contrôlée, sans génération au runtime :

| Famille   | Cible initiale |
| --------- | -------------- |
| Auberge   | 6 à 8 images   |
| Voyages   | 12 à 15 images |
| Donjons   | 25 à 35 images |
| **Total** | **45 à 60**    |

Une même image peut servir à plusieurs scènes de la même famille, avec deux ou trois variantes pour
limiter la répétition. La narration rend la scène unique. Une image manquante ou impossible à
charger retombe sur un décor de thème ; aucune information nécessaire pour jouer ne dépend de
l'image seule.

---

## 9. Les fins de run

| Fin               | Déclencheur                                     | Récompense                                  |
| ----------------- | ----------------------------------------------- | ------------------------------------------- |
| **Retour réussi** | Le joueur rentre avec l'objectif du contrat     | Butin + paiement + connaissance + Chronique |
| **Retour à vide** | Le joueur rentre vivant sans remplir le contrat | Connaissance + Chronique, pas de paiement   |
| **Mort**          | Mort effective arbitrée par le moteur           | Chronique + héritage transmis               |
| **Calciné**       | Calamine à 100                                  | Chronique spéciale, pas d'héritage          |
| **Abandon**       | Le joueur quitte volontairement                 | Chronique minimale                          |

`SessionEndReason` reste fermé sur `death | extracted | returned_empty | abandon | calcined`.
L'IA reçoit la fin autoritaire et écrit la Chronique correspondante.

---

## 10. Ce que rapporte un run

1. **Butin** — finance la préparation suivante.
2. **Connaissance** — bestiaire, routes, sujets et contrats débloqués.
3. **Chronique** — histoire exacte des décisions et conséquences du joueur.
4. **Exploits** — accès ou connaissance, jamais puissance permanente.

La méta-progression reste de la connaissance et de l'accès uniquement (`01-PILLARS.md §2`).

---

## 11. Risques et garde-fous

| Risque                                 | Garde-fou                                                           |
| -------------------------------------- | ------------------------------------------------------------------- |
| L'IA oublie la quête                   | État objectif backend injecté à chaque tour                         |
| Le joueur tourne en rond               | Rappels naturels + voie vers l'objectif dans les choix proposés     |
| Le contrat devient un menu de niveau   | Quête fictionnelle, commanditaire, destination et conséquences      |
| Le joueur part sans direction          | Un contrat principal obligatoire en v0.2.1                          |
| Le donjon ressemble à un jeu de cartes | Aucun type, icône, carte ou palier visible                          |
| Le mystère paraît injuste              | Jauges lisibles + demi-tour permanent + audit playtest après v0.2.1 |
| Le retour devient du remplissage       | Trajet distinct, plus court et plus facile                          |
| Les images coûtent ou ralentissent     | Bibliothèque pré-générée, réutilisée et servie statiquement         |
| L'image contredit le texte             | Familles de scènes bornées + narration contrainte au décor courant  |
| L'action libre casse les règles        | Backend souverain ; l'IA n'arbitre jamais                           |

---

## 12. Synthèse

```text
🏠 AUBERGE NARRATIVE
   Comptoir · L'Aveugle · Contrats · Forge
        ↓
📜 UN CONTRAT PRINCIPAL
   danger + durée visibles, contenu inconnu
        ↓
🏜️ VOYAGE NARRATIF
   ressources · rencontres · détours · objectif persistant
        ↓
🕯️ QUÊTE / DONJON
   même interface · structure mécanique entièrement cachée
        ↕
⚔️ COMBAT
   transformation tactique temporaire
        ↓
↩️ DEMI-TOUR TOUJOURS POSSIBLE
        ↓
🌒 RETOUR NARRATIF
   distinct · court · plus facile · non instantané
        ↓
📖 CHRONIQUE → 🏠 AUBERGE
```

---

_Le combat est détaillé dans `10-COMBAT.md`._
_La boucle narrative est détaillée dans `09-ACTION-LOOP.md`._
_Le sac, l'usure et les artefacts sont détaillés dans `11-INVENTORY-ECONOMY.md`._
_La méta-progression est détaillée dans `14-META-WORLD.md`._
_La Chronique est détaillée dans `17-RUN-CHRONICLE.md`._
