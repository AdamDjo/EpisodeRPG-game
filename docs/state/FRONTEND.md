---
type: frontend-domain
visibility: public
rag: true
source_of_truth: true
owner: frontend
default_agent: codex
---

# Frontend — état et file d'attente

> **Où en est le projet ?** → `gh issue list --milestone "v0.2.1 - Roguelike jouable"`. GitHub porte l'avancement.
> Ce fichier porte les **décisions d'implémentation** prises en codant, celles qu'un ticket fermé ne
> conserve pas.

Priorité courante : refonte roguelike (décision du 2026-08-06, cf. [[PROJECT_STATUS]]).
Canon de référence : `docs/canon/23-RUN-STRUCTURE.md`, `09-ACTION-LOOP.md` §2bis.

**Décision du grilling du 2026-08-08** : le problème n'est pas l'interface narrative commune, mais
l'absence de règles qui mettent l'histoire sous pression. Auberge, voyage, quête, donjon et retour
gardent donc une seule coque narrative. Le combat est la seule transformation d'interface.

Un composant mécanique dépend toujours du contrat backend correspondant : **ne pas l'implémenter
avant que `packages/shared` porte ses types.**

## Décisions d'implémentation

Une entrée n'est ajoutée ici que si elle explique un **choix non évident**. Le simple fait qu'un
ticket soit livré se lit sur GitHub.

- **Le mode courant vient du serveur, jamais déduit du texte de scène.** Corollaire frontend de la
  souveraineté backend : le client dessine, il n'arbitre pas. En v0.2.1, ce mode déclenche surtout
  la transformation combat ; il ne sélectionne pas quatre applications visuellement séparées.
- **Une seule coque narrative hors combat.** L'Auberge et le run partagent exactement la même
  composition : header persistant, illustration à gauche, narration et choix à droite, HUD en
  footer. L'image, la voix et les composants contextuels changent, mais la continuité Auberge →
  voyage → quête/donjon → retour ne casse jamais.
- **L'Auberge est un hub de scènes, pas un tableau.** Comptoir, L'Aveugle, Contrats et Forge restent
  accessibles comme destinations persistantes dans la fiction et s'affichent dans la coque commune,
  en vue subjective lorsque le joueur parle à un PNJ.
- **Le donjon ne révèle pas son moteur en v0.2.1.** Aucun type de salle, indice, icône, carte,
  palier, profondeur ou estimation de retour n'est rendu. Le HUD conserve uniquement l'objectif
  principal repliable, les jauges et « Faire demi-tour » hors combat.
- **Le combat transforme la scène au lieu d'ouvrir un mini-jeu étranger.** Le décor reste visible,
  la dernière narration consultable et l'action libre disponible ; la fin rend la place au récit.
- **`updatedStats` reste `Record<string, number>`** — `isDying` n'est pas transporté sur le réseau
  dans ce canal ; il est mis à jour côté backend et lu dans l'instantané de survie. #201
- **Le HUD n'affiche que les jauges variables** (PV, Soif, Faim, Fatigue, Calamine) ; le Triptyque
  est rendu en scores fixes. Mélanger les deux brouillait ce que le joueur peut agir. #186
- **Le Désavantage est explicite sur le jet**, avec sa cause — la transparence mécanique est une
  règle produit, pas un détail d'UI. #186
- **Tous les runs commencent à l'Auberge.** La Forge ne lance plus directement le premier run : un
  contrat principal doit être accepté avant le départ. L'Auberge tient en `100dvh` sur desktop,
  tablette et mobile, avec défilement interne du dialogue uniquement.
- **Le brouillon de création est versionné** (`CharacterCreateDraft` v2 : nom personnalisé, trait
  narratif, compétences décalées) — un brouillon d'une version antérieure ne doit pas se déserialiser
  en silence. #152
- **Le concept libre a un repli explicite** vers les 4 voies preset avec message dédié : un échec de
  résolution IA ne doit jamais bloquer la création. États `idle`/`pending`/`resolved`/`fallback`/
  `error`. #152
- **La priorité de langue est explicite** : le switcher en jeu gagne sur la détection navigateur pour
  la narration IA. La préférence de narration est distincte de la langue d'interface. #167 #168 #181
- **CSP : `'unsafe-inline'` sur `style-src` est imposé par Next.js** — aucune échappatoire par nonce
  dans l'App Router aujourd'hui. La CSP autorise l'origine Supabase Storage en `img-src` (images de
  scène #207) et `connect-src` (auth/REST navigateur). Elle **dérive de
  `NEXT_PUBLIC_SUPABASE_URL`** et doit être revérifiée à #161 pour couvrir le domaine de production
  final. Détail `docs/tech/SECURITY.md`. #162
- **L'inventaire est structuré selon les quatre catégories canon**, pas selon une commodité
  d'affichage. #183 #186
- **Les scènes utilisent une bibliothèque pré-générée de 30 à 38 images.** Les scènes fixes de
  l'Auberge peuvent montrer leurs interactions récurrentes ; pendant un run, les images décrivent
  d'abord un lieu réutilisable. Le personnage joueur n'est jamais représenté ; monstres et actions
  imposées sont absents des plateaux génériques. Aucune génération
  runtime en v0.2.1 et aucun sens mécanique ne dépend de l'image seule.
- **La direction artistique frontend est Encre de Sel.** Contours d'encre visibles, grandes masses,
  trois à quatre valeurs franches et palette stricte Noir / Sel / Or pour les illustrations. Le HUD
  conserve les couleurs sémantiques de Sang, Souffle, Faim, Soif et Calamine. Sur desktop,
  l'illustration reste à gauche et le lecteur narratif défile à droite ; les choix empilés grandissent
  avec leur texte sans devenir des panneaux surdimensionnés : 64 à 72 px pour un choix court, puis
  hauteur automatique. La narration garde une taille de lecture prioritaire de 24 à 26 px sur
  desktop. Sur mobile, image, narration et choix suivent le flux naturel de la page. Sac, Chronique
  et Personnage sont des boutons icônes de 44 px minimum. Aucun comportement essentiel ne dépend du
  hover. Le footer desktop reste un bandeau noir continu et lisible avec petites icônes, valeurs,
  jauges fines et séparateurs ; il n'adopte pas la surcharge gore de l'illustration et des choix.
- **Tailwind pour le responsive, jamais un hook JS.**

## Dette et suivis connus

- **#218 — les textes de lisibilité existent déjà** dans `docs/canon/04-ATTRIBUTES.md` et n'ont
  **jamais** été câblés à l'UI (tooltips SANG/SOUFFLE/VOLONTÉ, Calamine, jauges, conditions). C'est de
  la valeur joueur déjà écrite et non livrée.
- **#217 — coût en Calamine et usages restants doivent être visibles _avant_ activation**, pas après.
- L'arbitrage vivres/butin doit rester lisible dans l'inventaire sans transformer l'Auberge en
  tableau de gestion.
- L'ancien encart de demi-tour avec estimation et paliers est révoqué pour v0.2.1. « Faire
  demi-tour » reste disponible en permanence hors combat, sans prédiction du trajet.
- CSP de production à revérifier à #161.
- #129 est **à re-scoper** : les golden paths testés ne décrivent plus le jeu après la refonte.

## Règles de tenue de ce fichier

- On y écrit **pourquoi**, pas **quoi** ni **quand**. L'avancement vit sur GitHub, la chronologie
  dans [[log]].
- Pas de champ `updated:` — il mentait ; `git log -1 --format=%cs -- <fichier>` est la seule date fiable.
- Une PR ne touche ce fichier **que** si elle a pris une décision non évidente. Une PR de routine ne
  touche aucun document.
