> **Épic #<!-- n° épic — le marqueur « Épic : #N » en tête du ticket ; supprimer cette ligne d'épic s'il n'y en a pas --> — <!-- nom du chantier -->** › **Ticket #<!-- n° issue -->** — <!-- titre du ticket -->

<!-- Le titre de cette PR doit être : `#<épic> › #<ticket> · <Résumé>` -->

## Avant

<!-- Ce qui était cassé ou absent, DU POINT DE VUE JOUEUR/UTILISATEUR, en une phrase.
     ✅ « Un joueur en haillons frappait comme un joueur couvert d'artefacts. »
     ❌ « combat.ts utilisait DEFAULT_WEAPON. » -->

## Après

<!-- Ce qui marche maintenant, même point de vue, en une phrase. -->

## Reste à faire

<!-- Cocher ce qui n'est volontairement PAS dans cette PR, avec le ticket de suite.
     Si le ticket est intégralement couvert, écrire : « Rien — ticket entièrement couvert. » -->

- [ ] <!-- ce qui reste --> → ticket #<!-- n° -->

---

Closes #<!-- numéro d'issue -->

## Ce qui a changé techniquement

<!-- 3 à 6 puces. Le détail d'implémentation, les garde-fous, les valeurs choisies. -->

-

## Décisions à consigner

**Par défaut, une PR ne modifie aucun document.** On ne documente que les **choix non évidents** —
pourquoi telle valeur, telle fermeture de type, tel garde-fou.

- [ ] Aucune décision non évidente — aucun document modifié
- [ ] `BACKEND.md` mis à jour (décision backend/shared/AI)
- [ ] `FRONTEND.md` mis à jour (décision frontend)
- [ ] `RELEASE_READINESS.md` mis à jour (un bloqueur `phase: predeploy` change)
- [ ] `nav/log.md` complété (pivot ou décision structurante)

Décision consignée : <!-- une ligne, si un document est coché -->

`BACKEND.md` et `FRONTEND.md` ne se modifient **pas** dans la même PR. Une refonte transverse
assumée est la seule exception, et doit se déclarer :

- [ ] Refonte transverse des docs — justification : <!-- obligatoire si coché -->

<details>
<summary>Type, phase, domaine et checklist technique</summary>

### Type de changement

- [ ] Nouvelle fonctionnalité
- [ ] Bug fix
- [ ] Refactoring sans changement de comportement
- [ ] Chore / Tooling / Config
- [ ] Documentation uniquement

### Phase et domaine

- **Phase** : <!-- `phase: predeploy` ou `phase: postdeploy` — une seule valeur -->
- **Domaine** : <!-- domain: frontend / domain: backend / domain: ai -->
- **Propriétaire** : <!-- agent réellement assigné + domaine -->

### Checklist technique

- [ ] Conventions du domaine respectées
- [ ] Types partagés dans `packages/shared`, jamais dupliqués
- [ ] Type-check et lint passent
- [ ] Tests pertinents passent
- [ ] Aucun `console.log` oublié

### Test manuel effectué

<!-- Commandes et parcours vérifiés. -->

</details>
