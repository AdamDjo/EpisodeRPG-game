---
type: tech-plan
visibility: public
rag: true
source_of_truth: true
---

# Bibliothèque d'images de scène

> **Révision du 2026-08-08.** La génération dynamique livrée par #207 est remplacée pour v0.2.1
> par une bibliothèque pré-générée, contrôlée et sans appel image au runtime.

## Décision

GRIMOIRE utilise les images comme décors de la narration, pas comme sortie improvisée d'un modèle à
chaque partie. La v0.2.1 ne génère aucune image pendant un tour, un run ou la découverte d'un lieu.

La direction visuelle de production est définie dans [[ART_DIRECTION]]. Cette décision privilégie :

- une direction artistique cohérente entre L'Aveugle, le comptoir, les voyages et les donjons ;
- aucun temps d'attente lié à une génération ;
- aucun coût proportionnel au nombre de joueurs ;
- aucun échec de partie causé par un fournisseur d'images ;
- un contrôle humain sur les images réellement montrées.

## Volume initial

| Famille          | Cible       | Exemples                                                    |
| ---------------- | ----------- | ----------------------------------------------------------- |
| Auberge          | 6 à 8       | entrée, comptoir, L'Aveugle, contrats, forge, sac           |
| Voyages          | 8 à 10      | routes, désert, rivage, marais, variations de lumière       |
| Donjons          | 16 à 20     | ruines, cryptes, cavernes, profondeurs, salles remarquables |
| **Total v0.2.1** | **30 à 38** | plateaux de lieux réutilisables et quelques scènes fixes    |

Une image peut servir à plusieurs scènes proches. La narration et l'état du monde rendent chaque
scène unique ; l'image fournit le lieu, la lumière et la matière.

Deux usages sont distingués :

- **Auberge et événements fixes** : l'image peut montrer une interaction stable et connue, comme
  le comptoir, la forge ou la remise d'un contrat, en vue subjective lorsqu'un PNJ s'adresse au
  joueur ;
- **voyages et donjons pendant un run** : l'image est par défaut un plateau environnemental sans
  joueur, monstre actif ni action imposée, afin de rester compatible avec plusieurs narrations IA.
  Elle peut montrer une population ambiante, un travail ordinaire, des traces anciennes de violence
  et des objets mystiques dont la présence possède une fonction claire.

Le personnage joueur n'est jamais visible, y compris sous forme de main, ombre ou reflet. Les PNJ
peuvent habiter un plateau de run tant qu'ils décrivent le lieu plutôt qu'une action actuelle que la
narration devrait obligatoirement reprendre. Les variantes plus narratives restent des assets
événementiels et ne remplacent pas le décor générique de leur famille.

## Sélection

La sélection repose sur des identifiants fermés et versionnés, jamais sur le texte libre de l'IA.

```ts
type SceneImageFamily = "inn" | "travel" | "dungeon";

interface SceneImageDefinition {
  id: string;
  family: SceneImageFamily;
  locationType: string;
  variant: string;
  url: string;
  fallbackId: string;
  usage: "run-neutral" | "run-location" | "run-event";
  requiredSceneTags?: string[];
  visibleFacts: string[];
  eventType?: string;
  requiresEventMatch?: boolean;
}
```

Le backend choisit une image compatible avec la scène structurée actuelle. Une image n'est éligible
que si son `locationType` correspond et si tous ses `requiredSceneTags` existent dans les données de
scène autoritaires. Un asset `run-event` marqué `requiresEventMatch` exige en plus une correspondance
exacte de son `eventType`.

Après la sélection, le narrateur reçoit les `visibleFacts` de l'image : uniquement des faits simples
et incontestables déjà visibles, qu'il doit conserver dans sa prose sans leur inventer une fonction.
L'IA ne demande pas une image, ne construit pas sa clé et ne peut pas rendre un asset plus spécifique
que la scène structurée. En cas de doute ou de tag manquant, le résolveur choisit le fallback neutre
de la famille.

Exemple : une salle montrant un cadavre ancien ouvert sur une table exige le tag `mortuary`. Elle ne
peut jamais illustrer une crypte générique, même si les deux partagent la même famille visuelle.

### Règle anti-spoiler

L'image représente uniquement **le lieu où se trouve déjà le personnage**. Elle ne doit jamais :

- révéler le type de la prochaine salle ;
- montrer un ennemi avant son apparition narrative ;
- annoncer un trésor, un repos ou un piège à venir ;
- encoder visuellement la profondeur ou la difficulté cachée.

Elle ne doit pas non plus imposer une action actuelle que la prose IA pourrait contredire : traverser
un pont, établir un camp, débarquer ou combattre exigent un identifiant événementiel explicite. Le
plateau générique du lieu demeure neutre.

## Production et stockage

1. Les masters sont générés et sélectionnés pendant le développement.
2. Chaque asset est recadré au ratio réel de l'interface et compressé en WebP/AVIF.
3. Les fichiers optimisés sont téléversés une seule fois dans le bucket Supabase `scene-images`.
4. Un manifeste versionné dans le dépôt lie les identifiants stables aux URLs.
5. Le frontend précharge seulement l'image courante et, si connue sans spoiler, la transition
   immédiate suivante.

Le stockage distant évite d'alourdir le bundle et le dépôt. Le manifeste garde le contrat
reproductible ; un changement d'URL passe par une PR.

## Fallback et accessibilité

- Une image absente, lente ou invalide retombe sur le décor de thème de sa famille.
- Le tour et la navigation ne dépendent jamais du chargement de l'image.
- La narration doit rester suffisante pour comprendre et jouer sans visuel.
- Les informations mécaniques essentielles vivent dans le texte ou le HUD, jamais dans l'image
  seule.
- Le combat conserve le décor courant quand il transforme l'interface.

## Migration depuis #207

L'implémentation actuelle génère via Pollinations, persiste `SceneImage` et choisit une clé
`sceneType_depthBand_lieuType`. Elle devient une dette de migration, pas la cible produit.

La migration doit :

1. introduire le manifeste et les identifiants fermés ;
2. remplacer `resolveSceneImage()` par une résolution locale déterministe ;
3. supprimer l'appel Pollinations et son timeout ;
4. décider si la table `SceneImage` peut être retirée après migration ;
5. conserver `GameSession.currentImageUrl` ou le remplacer par `currentImageId` selon le contrat
   shared retenu ;
6. garder le fallback défensif de bout en bout.

## Hors périmètre v0.2.1

- génération par tour, joueur, run ou nouvelle combinaison ;
- personnalisation d'image selon le texte libre ;
- image unique pour chaque salle procédurale ;
- galerie d'administration des assets ;
- retour automatique à un fournisseur payant ou gratuit.

Une génération dynamique avec cache pourra être réévaluée après playtest si la répétition visuelle
est réellement mesurée. Elle ne doit pas être anticipée avant ce signal.
