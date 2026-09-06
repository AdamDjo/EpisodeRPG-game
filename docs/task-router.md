---
type: task-router
visibility: public
rag: true
source_of_truth: true
---

# Task Router

Point d'entrée unique pour charger le contexte d'une tâche. **Lire uniquement les fichiers de sa
ligne** — charger tout le vault n'apporte rien et noie la tâche.

`docs/canon/` est la source de vérité gameplay : aucun résumé ne fait autorité contre lui.

## Orientation

| Tâche                        | Lire                                                                                                      |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| Comprendre le projet         | `docs/00-START-HERE.md` + `docs/state/PROJECT_STATUS.md`                                                  |
| Savoir quoi faire maintenant | `gh issue list --milestone "v0.2.1 - Roguelike jouable"` — l'avancement vit sur GitHub, pas dans les docs |
| Préparer une release         | `docs/state/RELEASE_READINESS.md`                                                                         |
| Décisions frontend           | `docs/state/FRONTEND.md`                                                                                  |
| Décisions backend/shared     | `docs/state/BACKEND.md`                                                                                   |
| Historique des pivots        | `docs/log.md` (append-only)                                                                               |

## Technique

| Tâche                      | Lire                                               |
| -------------------------- | -------------------------------------------------- |
| Backend / service / API    | `docs/tech/RULES.md`                               |
| Shared contracts           | `packages/shared/CLAUDE.md` + `docs/tech/RULES.md` |
| UI, tokens, UI Kit         | `docs/tech/FRONTEND.md`                            |
| Direction artistique       | `docs/tech/ART_DIRECTION.md`                       |
| Authentification           | `docs/tech/AUTH.md`                                |
| Images de scène dynamiques | `docs/tech/SCENE_IMAGES.md`                        |
| Sécurité                   | `docs/tech/SECURITY.md`                            |
| Outillage IA / skills      | `docs/tech/AI_SETUP.md`                            |

## Canon de gameplay

| Tâche                        | Lire                                                                 |
| ---------------------------- | -------------------------------------------------------------------- |
| Boucle de run / donjon       | `docs/canon/23-RUN-STRUCTURE.md`                                     |
| Session gameplay             | `docs/canon/09-ACTION-LOOP.md` + `docs/canon/15-GAME-MASTER.md`      |
| Combat / bestiaire           | `docs/canon/10-COMBAT.md` + `docs/canon/03-BESTIARY.md`              |
| Survie, conditions, Calamine | `docs/canon/06-SURVIVAL.md`                                          |
| Dice / stats                 | `docs/canon/04-ATTRIBUTES.md` + `docs/canon/08-DICE-RESOLUTION.md`   |
| Character Create             | `docs/canon/07-CHARACTER-CREATION.md` + `docs/canon/05-VOCATIONS.md` |
| Inventaire / économie        | `docs/canon/11-INVENTORY-ECONOMY.md`                                 |
| PNJ et relations             | `docs/canon/12-NPCS-RELATIONS.md`                                    |
| Réputation / factions        | `docs/canon/13-REPUTATION.md` + `docs/canon/03-FACTIONS.md`          |
| Auberge de L'Aveugle         | `docs/canon/15-GAME-MASTER.md` + `docs/canon/14-META-WORLD.md`       |
| Mémoire narrative            | `docs/canon/16-MEMORY.md`                                            |
| Chronique de run             | `docs/canon/17-RUN-CHRONICLE.md`                                     |
| World Map                    | `docs/canon/02-WORLD-BIBLE.md` + `docs/canon/03-FACTIONS.md`         |
| Vocabulaire / termes du lore | `docs/canon/22-GLOSSARY.md`                                          |

Sommaire complet du canon : `docs/canon/00-SOMMAIRE.md`.
