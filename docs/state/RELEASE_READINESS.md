---
type: release-status
visibility: public
rag: true
source_of_truth: true
owner: release-coordination
---

# Release Readiness — v0.1.0 (décalée) → v0.2.1

Toute PR qui change un bloqueur `phase: predeploy` met à jour ce fichier selon l'état attendu après
merge. La checklist opérationnelle détaillée vit dans l'issue #163.

> **⏸️ Déploiement décalé — décision du 2026-08-06.**
>
> La v0.1.0 n'est **pas** bloquée par un problème technique : les bloqueurs restants sont
> circonscrits et connus. Elle est décalée parce que **le jeu n'est pas satisfaisant** — verdict de
> playtest : _« après une partie je m'ennuie, il n'y a aucune raison de recommencer »_ (décision 19).
>
> Le travail bascule sur la **refonte roguelike narrative v0.2.1**. Ce fichier reste la
> source de vérité du déploiement et sera réactivé une fois la boucle de jeu satisfaisante ; sa
> checklist reste valable.

> **Révision du 2026-08-08.** La release ne cherche plus à remplacer le storytelling par quatre
> interfaces de modes. Elle conserve une interface narrative continue, ajoute le combat tactique et
> garde la structure du donjon cachée. Le backlog correspondant vit dans le milestone GitHub
> `v0.2.1 - Roguelike jouable`.

## Fondations livrées

| Bloc                           | État  | Référence      |
| ------------------------------ | ----- | -------------- |
| UI Kit                         | Livré | #93 / PR #121  |
| Auth/conversion anonyme        | Livré | #135 / PR #160 |
| Interface EN/FR                | Livré | #167 / PR #177 |
| Langue IA navigateur           | Livré | #168 / PR #178 |
| Auberge backend réelle         | Livré | #147 / PR #174 |
| Auberge frontend réelle        | Livré | #188           |
| Canon et plan Survie v2        | Livré | #179 / PR #187 |
| Mémoire et état du projet      | Livré | #189           |
| Disponibilité IA (fallback GM) | Livré | #101 / PR #191 |
| Contrats shared Survie v2      | Livré | #180 / PR #196 |
| Conditions et Désavantage      | Livré | #181 / PR #198 |
| Calamine et fin Calciné        | Livré | #182 / PR #199 |
| Inventaire réel                | Livré | #183           |
| Action de repos                | Livré | #184           |
| Game Session universelle       | Prête | #272 / PR #277 |

## Phase 1 — pré-déploiement

| Bloc                   | État                  | Référence      |
| ---------------------- | --------------------- | -------------- |
| Danger IA              | Livré                 | #185           |
| UI Survie v2           | Livré                 | #186           |
| Concept libre          | Livré                 | #152           |
| Sécurité dépendances   | Livré                 | #162 / PR #209 |
| Déploiement API        | ⏸️ Gelé               | #161           |
| Golden path réel       | ⏸️ Gelé — à re-scoper | #129           |
| Checklist de livraison | ⏸️ Gelée              | #163           |

Les trois blocs gelés ne sont pas annulés. #129 devra être **re-scopé** : son golden path valide un
parcours (landing → auberge → session) qui ne décrira plus le jeu après la refonte.

## Phase 0 — refonte roguelike (en cours)

Prérequis de fait au déploiement : le jeu doit être satisfaisant avant d'être publié.

L'avancement des EPICs et de leurs issues livrables se lit sur GitHub, jamais ici — un tableau recopié à la main
devient faux au premier merge :

```bash
gh issue list --milestone "v0.2.1 - Roguelike jouable" --state all
```

Ordre de dépendance et rationale : [[PROJECT_STATUS]].

État attendu après merge de la PR #299 : la bibliothèque visuelle v0.2.1 est prête avec 36 assets
runtime validés, répartis entre Auberge, Voyages et Donjons. Les variantes d'action sont séparées
des décors neutres et exigent une correspondance événementielle explicite. Ce jalon ne change pas
le `NO-GO` : le résolveur déterministe #248 et les autres chantiers de la boucle roguelike restent à
livrer avant le playtest de validation.

## Post-déploiement

Profil complet (#136), Chronologie (#130), Galerie (#131), World Map (#127), linking
multi-provider (#159), pgvector (#114), World events (#117) et échange Souvenir/lore (#133).

## Go / No-Go

`NO-GO`, pour deux raisons distinctes qu'il ne faut pas confondre :

1. **Raison produit (bloquante, prioritaire)** — la boucle de jeu n'est pas satisfaisante. Les
   chantiers pré-déploiement du milestone v0.2.1 doivent être livrés et le jeu jugé amusant par
   l'auteur avant de rouvrir la question du déploiement.
2. **Raison technique (circonscrite)** — l'API n'est pas déployée (#161) et le golden path n'est pas
   vert sur un environnement de release (#129, à re-scoper). La sécurité, elle, est qualifiée
   depuis #162.

Le passage en `GO` suppose que **les deux** soient levées, dans cet ordre.
