---
name: pr
description: "Pousse la branche courante et ouvre une PR vers la bonne cible. Extrait le numéro d'issue du nom de branche automatiquement."
allowed-tools: Bash
---

L'utilisateur veut pousser sa branche courante et ouvrir une PR.

Exécuter dans l'ordre :

1. **Récupérer le contexte**

   ```bash
   git rev-parse --abbrev-ref HEAD
   git log origin/develop..HEAD --oneline 2>/dev/null || git log origin/main..HEAD --oneline
   git status --short
   ```

2. **Vérifier qu'il n'y a pas de fichiers non commités**
   - Si oui, alerter et demander si l'utilisateur veut continuer quand même

3. **Déterminer la branche cible selon le préfixe :**
   - `feature/*` → cible : `develop`
   - `fix/*` → cible : `develop`
   - `chore/*` → cible : `develop`
   - `hotfix/*` → cible : `main`
   - `release/*` → cible : `main`

4. **Extraire le numéro d'issue du nom de branche**
   - Le nom de branche suit le pattern : `<préfixe>/<numéro>-<description>`
   - Exemple : `feature/29-inventory-consumption` → issue #29
   - Exemple : `fix/30-login-crash` → issue #30
   - Si pas de numéro détecté, demander : "Il y a un numéro d'issue à fermer ? (ou entrée pour passer)"

5. **Pousser la branche**

   ```bash
   git push origin <branche-courante>
   ```

6. **Préparer le titre et le body de la PR**

   **Titre — le ticket passe en premier, toujours :**

   ```
   #<épic> › #<ticket> · <Résumé lisible du changement>
   ```

   Exemples : `#263 › #267 · Charges d'Emprise et coût Calamine résisté`
   `#289 · Mood dread propagé au prompt de compression` (ticket sans épic)

   Résoudre l'épic avec `~/.claude/bin/ticket-context.sh --short`, ou en lisant le
   marqueur `Épic : #N` en tête du body du ticket. **Ne jamais déduire l'épic du premier
   `#N` du body** — ce serait un ticket frère. Sans marqueur : pas d'épic dans le titre.

   Règle : le numéro de ticket ouvre le titre pour qu'il soit **cliquable et lu avant**
   le numéro de PR affiché par GitHub. Ne jamais écrire le numéro de PR dans un titre,
   un commit, une description ou un message. Le préfixe conventionnel (`feat:`, `fix:`)
   reste dans les **commits**, pas dans le titre de PR — c'est le ticket qui porte le sujet.
   - Body :

     ```
     > **Épic #<n° épic, ou —>** › **Ticket #<n° issue>** — <titre du ticket>

     ## Avant
     <ce qui était cassé/absent, point de vue joueur, 1 phrase>

     ## Après
     <ce qui marche maintenant, même point de vue, 1 phrase>

     ## Reste à faire
     <cases non couvertes + ticket de suite, ou « Rien — ticket entièrement couvert. »>

     ## Ce qui a changé techniquement
     <liste des changements principaux>

     ## Phase et domaine
     - **Phase** : <phase exacte reprise depuis l'issue>
     - **Domaine** : <domaines exacts repris depuis l'issue et le diff>
     - **Propriétaire** : <agent réellement assigné + domaine>

     ## Current-state
     <paires STATUS/NEXT mises à jour, ou exception cochée et justifiée>

     ## Tests
     <commandes exécutées>

     Closes #<numéro issue>
     ```

7. **Déterminer les labels depuis l'issue et le diff :**
   - Reprendre depuis l'issue liée exactement une phase : `phase: predeploy` ou `phase: postdeploy`.
   - Fichiers dans `apps/frontend/` → `domain: frontend`.
   - Fichiers dans `apps/backend/` ou `packages/shared/` → `domain: backend`.
   - Fichiers d'orchestration/prompt/provider IA → ajouter `domain: ai`.
   - Reprendre depuis l'issue liée la version de release : `release: v0.2`.
   - Reprendre depuis l'issue liée son label d'épic : `epic: #<n> <mot-clé>`.
   - Ces quatre axes — `epic: *`, `domain: *`, `phase: *`, `release: *` — sont les **seuls** labels du
     repo, avec `status: blocked`. Ne jamais créer un label absent de `gh label list` : les familles
     `type:`, `priority:`, `size:` et les domaines `shared`/`database`/`devops` ont été supprimés le
     2026-08-08 et ne doivent pas ressusciter.
   - Le label `epic: *` est un **reflet** du marqueur `Épic : #N` en tête du body du ticket, qui reste
     la source unique. En cas de divergence, ne pas arbitrer : relancer
     `~/.claude/bin/sync-epic-labels.sh`, qui réaligne les labels sur les marqueurs.

8. **Créer la PR via `gh pr create`**
   - owner: `AdamDjo`
   - repo: `Grimoire-game`
   - head: branche courante
   - base: cible déterminée à l'étape 3
   - assignees: `["AdamDjo"]`
   - reviewers: `["AdamDjo"]` — TOUJOURS assigner AdamDjo comme reviewer
   - passer tous les labels calculés avec `--label` ; la ligne `Phase` du body doit contenir
     exactement la même phase pour la CI et le milestone

9. **Assigner la PR au projet Scrum Board et au milestone via CLI**

   ```bash
   # Récupérer le node_id de la PR
   PR_NODE_ID=$(gh api repos/AdamDjo/Grimoire-game/pulls/<PR_NUMBER> --jq '.node_id')

   # Ajouter au projet Scrum Board (Projects V2)
   gh api graphql -f query='
   mutation {
     addProjectV2ItemById(input: {
       projectId: "PVT_kwHOAacnj84BU6rS"
       contentId: "'$PR_NODE_ID'"
     }) {
       item { id }
     }
   }'

   # Une issue `phase: predeploy` utilise le milestone "v0.1.0 - Première version jouable".
   # Une issue `phase: postdeploy` n'a pas de milestone V1.
   ```

10. **Confirmer à l'utilisateur avec l'URL de la PR**
    - Indiquer : assignee ✅, reviewer ✅, project ✅, milestone ✅ (ou "pas de milestone pour cette branche")
