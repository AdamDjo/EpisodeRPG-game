# 14 — Le Méta-Monde (entre les runs)

> **Fichier 14 / Phase C / Pilier #7 (3 crochets de rétention hiérarchisés)**
>
> Liens : [07-CHARACTER-CREATION](07-CHARACTER-CREATION.md) · [11-INVENTORY-ECONOMY](11-INVENTORY-ECONOMY.md) · [15-GAME-MASTER](15-GAME-MASTER.md) · [16-MEMORY](16-MEMORY.md) · [17-RUN-CHRONICLE](17-RUN-CHRONICLE.md) · [20-ARCHITECTURE](20-ARCHITECTURE.md)

---

## §0 — Principe

**Entre les runs, Velkhar évolue subtilement.**

GRIMOIRE n'est pas un MMO. Pas de saisons, pas de raids, pas de classement public. Mais le monde n'est **pas une coquille vide** entre deux runs — c'est un continent vivant dont on hérite à chaque retour. Cette illusion de persistance est ce qui pousse le joueur à dire _« Je dois revenir voir »_.

**3 niveaux d'évolution méta**, hiérarchisés par priorité d'implémentation V1 :

| Priorité       | Niveau                                                | Coût impl.                                      | Effet ressenti                                   |
| -------------- | ----------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------ |
| **#1 HAUTE**   | Souvenirs nommés du joueur                            | Faible (juste persistance + injection contexte) | "Mon perso a une histoire qui transcende le run" |
| **#2 MOYENNE** | Évolution locale (PNJ/lieux marqués par actes passés) | Moyen (état persistant par joueur)              | "Mes actes ont eu des conséquences"              |
| **#3 BASSE**   | Événements mondiaux scriptés                          | Très faible (5 events Adem-curated max)         | "Le monde change, même sans moi"                 |

**Règle absolue** : aucune persistance partagée entre joueurs en V1 (pas de "tu vois ce que les autres ont fait"). Trop complexe, risque cohérence, économie incertaine. **Reporté V2+** comme option premium.

---

## §1 — Les 3 niveaux d'évolution méta (vue d'ensemble)

### Niveau A — Perso (les Souvenirs nommés)

- Lié au **joueur** (cookie ou compte)
- Survit à la mort du perso
- Injecté en contexte au run N+1 (cf. [16-MEMORY §3](16-MEMORY.md))
- L'Aveugle peut **vendre** du lore basé dessus contre des Souvenirs (économie cf. [11-INVENTORY-ECONOMY §3](11-INVENTORY-ECONOMY.md))

### Niveau B — Local (les traces personnelles dans Velkhar)

- Lié au **joueur**, pas au monde global
- Un PNJ mort par les actes du joueur reste mort **pour ce joueur**
- Une guilde rejetée reste hostile **pour ce joueur**
- **Pas de partage entre joueurs** en V1

### Niveau C — Global (les événements mondiaux scriptés)

- Partagé entre **tous les joueurs**
- Curaté manuellement par Adem
- 3-5 événements actifs en parallèle, durée 1-3 mois IRL
- Injecté en contexte de TOUS les runs actifs pendant sa durée

### Niveau D — Progression (connaissance et accès) _(ajout 2026-08-06)_

- Lié au **joueur**, survit à la mort du perso
- **Ce n'est pas de la narration : c'est de la progression de jeu**
- Débloque de la **connaissance** (bestiaire, destinations, faiblesses) et de l'**accès** (contrats
  plus dangereux, sujets chez L'Aveugle, compagnons, exploits)
- **Jamais de puissance** — voir la règle absolue en §1bis

---

## §1bis — Niveau D : la méta-progression de jeu

> **Ajout du 2026-08-06** (décisions 4 et 15 de la refonte roguelike, EPIC #214/#221).

Les niveaux A, B et C sont tous **narratifs** : ils font que le monde se souvient. Aucun ne donne au
joueur une raison **mécanique** de relancer un run. C'est le trou identifié dans le diagnostic
« aucune raison de rejouer ».

### La règle absolue

> **La méta-progression débloque de la connaissance et de l'accès. Jamais de la puissance.**
>
> — `01-PILLARS §5`

| ✅ Persiste entre les runs                         | ❌ Ne persiste jamais                         |
| -------------------------------------------------- | --------------------------------------------- |
| Pages de bestiaire (CA, faiblesses, comportements) | Bonus permanents de PV, dégâts ou attribut    |
| Destinations et dangers déjà rencontrés            | Équipement cumulé d'un run à l'autre          |
| Contrats plus dangereux débloqués                  | Réduction de difficulté                       |
| Sujets de conversation chez L'Aveugle              | Tout « build » qui monte run après run        |
| Compagnons rencontrés (rappelables plus tard)      | Monnaie accumulée sans plafond                |
| Exploits/badges → déblocages d'accès               | Toute récompense d'exploit qui rend plus fort |
| Écho de réputation, lignée                         |                                               |

### Pourquoi cette frontière

Trois raisons, dans l'ordre d'importance :

1. **La difficulté reste honnête.** Si le run 10 est mécaniquement plus facile que le run 1, la mort
   au run 3 n'était qu'une taxe de temps. Avec du savoir seul, une mort reste **imputable au joueur**
   — l'état du personnage reste lisible, même si le monde conserve ses secrets (`01-PILLARS §9`).
2. **Le joueur progresse vraiment.** Ce qui s'améliore, c'est sa lecture du jeu : il sait quoi
   emporter, quelle créature fuir et quel avertissement narratif reconnaître. C'est la progression la plus durable — et la
   seule qui ne se dévalue jamais.
3. **Ça reste finançable.** Une progression de puissance oblige à rééquilibrer tout le bestiaire à
   chaque palier de build. Une progression de connaissance ne coûte que du contenu.

### Le stockage

La connaissance est un **état joueur**, au même titre que les Souvenirs : elle survit à la mort du
perso et n'est jamais rattachée à un `Character`.

```
PlayerKnowledge
  ├── bestiary        : créatures rencontrées → ce qu'on en sait
  ├── destinations    : lieux et risques déjà rencontrés
  ├── contracts       : familles de quêtes et dangers débloqués
  ├── topics          : sujets ouverts chez L'Aveugle
  └── feats           : exploits accomplis → accès débloqués
```

🔴 **Anti-pattern** : ne jamais dériver la connaissance à la volée depuis l'historique des
`SceneLog`. Ce qui est su doit être **explicitement écrit** au moment où c'est appris, sinon ni le
backend ni l'UI ne peuvent l'afficher de façon fiable.

### Ce que le joueur en voit

La connaissance doit être **consultable**, sinon elle n'existe pas pour lui : une page bestiaire qui
se remplit, des destinations connues et une liste de contrats dont certains sont encore grisés.
La v0.2.1 n'affiche pas de carte de donjon, profondeur ou route de retour : le progrès devient
visible entre les runs sans révéler la structure d'un run futur.

---

## §2 — Niveau A : Souvenirs nommés (Pilier #7 — crochet #1)

### Pourquoi prioritaire

- **Coût d'implémentation très faible** : juste une table Postgres + injection contexte (cf. [16-MEMORY §3](16-MEMORY.md))
- **Effet ressenti maximum** : chaque joueur voit sa galerie grandir, voit son perso évoluer entre runs
- **Différenciant Premium** : "Premium = Souvenirs jamais purgés" (cf. §8)

### Définition

Un **Souvenir nommé** est un fragment textuel court (~50 tokens) avec un titre évocateur, généré pendant un run, qui **survit** à la mort du perso et **transcende** les runs futurs du même joueur.

### Format

```json
{
  "id": "uuid",
  "player_id": "uuid", // propriétaire (joueur)
  "character_id": "uuid", // perso d'origine (mort ou vivant)
  "run_id": "uuid", // run de création
  "scene_id": "uuid", // scène déclenchante
  "title": "La nuit où tu as épargné Vane",
  "body": "Au seuil de la lame, ta main s'est arrêtée. Vane respire encore.",
  "named": true, // vs candidat non-promu
  "created_at": "timestamp"
}
```

### Déclenchement (qui décide qu'un moment devient Souvenir ?)

**Étape 1 — Candidat (côté IA)** :
Pendant un tour, l'IA peut suggérer un Souvenir via son output JSON :

```json
{
  "narration": "...",
  "choices": [...],
  "souvenir_candidate": {
    "title_suggestion": "La nuit où tu as épargné Vane",
    "body_50_tokens": "Au seuil de la lame, ta main s'est arrêtée."
  }
}
```

**Étape 2 — Validation (côté backend)** :
Le backend décide selon **règles strictes** :

| Critère            | Règle                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------- |
| Quota par run      | **3 max** Souvenirs nommés par run                                                       |
| Déclencheur valide | Doit correspondre à un `key_facts_pinned` (cf. [16-MEMORY §2](16-MEMORY.md))             |
| Types autorisés    | Mort PNJ majeur · Choix moral fort · Découverte secrète · Victoire boss · Promesse forte |
| Doublon            | Si déjà 1 Souvenir avec titre similaire (Levenshtein < 5) → rejet                        |
| Longueur titre     | 4-15 mots, sinon rejet + reprompt                                                        |
| Longueur body      | 30-70 tokens, sinon retry                                                                |

Si validation OK → insertion en DB, `named: true`.
Si rejet → candidate ignoré silencieusement (le joueur ne sait pas qu'il y avait candidat).

### Affichage joueur

- **Galerie** dans le profil compte (`/profil/souvenirs`) — liste chronologique
- **Mention narrative** par L'Aveugle au début du run N+1 (1-2 Souvenirs cités max)
- **Injection contexte** silencieuse à chaque appel IA du run N+1 (jusqu'à 5 plus pertinents)

### Caps par tier (lien Phase D)

| Tier           | Souvenirs max                                            | Purge                   |
| -------------- | -------------------------------------------------------- | ----------------------- |
| Anonyme        | Stockés en cookie chiffré, perdus si cookie expire (90j) | —                       |
| Compte gratuit | Illimité création, **purge auto > 6 mois inactivité**    | Garde 20 max post-purge |
| Premium        | Illimité création, **jamais de purge**                   | Aucune                  |

### Économie L'Aveugle (lien [11-INVENTORY-ECONOMY §3](11-INVENTORY-ECONOMY.md))

L'Aveugle peut **vendre du lore généré** contre un Souvenir donné en paiement. Le Souvenir donné n'est **pas perdu** — il est _partagé_ avec L'Aveugle, qui pourra y faire référence plus tard. C'est un don symbolique, pas une dépense réelle. Plafond : 1 don/run à L'Aveugle.

---

## §3 — Niveau B : Évolution locale (traces personnelles)

### Pourquoi en 2ᵉ priorité

- Coût impl. moyen : nécessite tracking par joueur, mais sur peu d'entités
- Effet ressenti fort sur les joueurs qui rejouent : _"Le marchand que j'ai trahi me reconnaît"_
- Différenciant : monde qui réagit aux choix, pas juste qui les célèbre

### Définition

Des **traces persistantes par joueur** sur certains PNJ, lieux et factions. Si le perso précédent a marqué un endroit, le perso N+1 héritera de cette réaction locale.

### Périmètre V1 (volontairement réduit)

Seulement **3 catégories** de traces persistent :

| Catégorie             | Exemple                                                                                                    | Persistance                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **PNJ marquant mort** | _"Le marchand Soren a été tué par le voyageur précédent. Sa boutique est fermée, son fils tient rancune."_ | Permanente                                  |
| **Faction marquée**   | _"Les Rouilleurs se méfient depuis qu'un Lame-Ombre a trahi la guilde."_                                   | Décroît en 5 runs                           |
| **Lieu modifié**      | _"L'oasis de Tissan a été asséchée par un rituel raté."_                                                   | Permanente (sauf événement mondial inverse) |

Pas de tracking de chaque PNJ secondaire, pas de "tous les marchands se souviennent de toi" — économie de DB + cohérence narrative.

### La dépouille du perso précédent _(ajout 2026-08-15, #281)_

Une **quatrième catégorie de trace**, la seule qui soit à la fois narrative et **utile** au joueur :
là où le personnage précédent est mort, il **reste**.

| Catégorie         | Contenu                                                          | Persistance                       |
| ----------------- | ---------------------------------------------------------------- | --------------------------------- |
| **`corpse_left`** | Lieu de mort + cause + une image du corps + son équipement porté | 1 run (consommée à la découverte) |

- Le backend écrit la trace **à la fin du run** depuis le `endReason` (cf. `09-ACTION-LOOP §7`) et
  le dernier lieu connu. Aucune décision IA : c'est un enregistrement mécanique.
- Au run suivant, si le nouveau personnage **passe au même endroit**, le corps est injecté en
  contexte comme un **cadavre-présage** (cf. `09-ACTION-LOOP §3bis`) : il annonce ce qui a tué le
  précédent, exactement comme n'importe quel présage du monde.
- La cause de mort est **montrée, jamais nommée** : le run N+1 voit une gorge ouverte, une peau
  grise de Calamine, une gourde vide — pas l'étiquette `endReason`.
- **L'équipement porté est récupérable**, dans la limite fixée par `11-INVENTORY-ECONOMY` (sac plein,
  objets liés). C'est la seule exception apparente à la règle « pas d'équipement cumulé d'un run à
  l'autre » (§1bis) — et elle n'en est pas une : le joueur ne récupère **rien** s'il ne retourne pas
  sur les lieux, ce qui coûte du temps, de la soif et du risque. Le gain est **payé dans le run**,
  pas offert entre les runs.
- **Une seule dépouille active** : la mort du run N remplace celle du run N-1. Pas de cimetière
  cumulatif (saturation DB, et l'effet s'émousse).
- Si le run précédent s'est terminé par `calcined`, il n'y a **pas de dépouille** — il y a un
  **Calciné qui marche encore** dans le secteur. Il porte l'équipement, il ne le rend pas.

🟢 _Pourquoi ça marche : c'est le crochet de rétention le plus court du jeu. « Mon dernier perso est
mort là-bas, avec ma bonne lame » est une raison de relancer un run qui ne coûte ni contenu ni
équilibrage — et qui fabrique une histoire personnelle au passage._

### Format DB

```json
{
  "id": "uuid",
  "player_id": "uuid",
  "category": "npc_killed | faction_marked | location_modified",
  "entity_id": "soren", // référence catalogue lore Velkhar
  "trace_type": "npc_killed",
  "context_text": "Tué par Kael, Marcheur-du-Sel, le {date}.",
  "decay_runs": null, // null = permanent, ou int = N runs restants
  "created_at": "timestamp"
}
```

### Injection contexte

Quand le joueur entre dans un lieu/rencontre un PNJ qui a une trace, le backend injecte :

```
[TRACE LOCALE PERSONNELLE]
Tu as déjà laissé une marque ici : {context_text}
```

Max **200 tokens** de traces par tour, triées par pertinence (lieu actuel > lieu adjacent > rien).

### Anti-pattern interdit

- ❌ Tracking de tous les PNJ secondaires (saturation DB, contexte IA dilué)
- ❌ Traces qui contredisent un événement mondial actif (ex : trace dit "oasis vide", événement dit "oasis luxuriante" → conflit narratif → règle : l'événement mondial gagne, la trace est ignorée temporairement)

### Pas de partage entre joueurs V1

**Aucune trace n'est globale.** Si le joueur A tue Soren, le joueur B verra Soren vivant dans son propre run. C'est une **décision produit assumée** :

- Coût impl. partage = très élevé (synchronisation, conflits, modération)
- Risque cohérence narrative = trop fort sans modération
- Valeur ajoutée incertaine en V1 (combien de joueurs ?)
- → **Reporté V2+** comme option _"Monde Partagé"_ expérimental

---

## §4 — Niveau C : Événements mondiaux scriptés (Pilier #7 — crochet #3)

### Pourquoi en 3ᵉ priorité

- Coût impl. **très faible** : juste 1 table + 1 input dans le contexte IA
- Coût éditorial **modéré** : Adem rédige les events à la main
- Effet ressenti **subtil mais cumulatif** : la sensation que "le monde continue"
- Risque : si Adem oublie de mettre à jour, le jeu sent l'abandon → discipline éditoriale requise

### Définition

**3 à 5 événements mondiaux** actifs en permanence, **partagés entre tous les joueurs**, scriptés à la main par Adem, injectés dans le contexte IA de tous les runs actifs.

### Périmètre & cadence

- **3-5 events actifs en parallèle** (jamais 0, jamais > 5)
- Durée **1-3 mois IRL** chacun (parfois renouvelés, parfois remplacés)
- **1 nouvel event lancé par mois** minimum (rythme éditorial)
- Tous **manuels** — pas générés par IA (risque incohérence avec lore canon Velkhar)

### Format DB

```json
{
  "id": "uuid",
  "title": "La Grande Sécheresse",
  "description_player": "Les caravanes du sud n'arrivent plus. Les marchés du nord s'épuisent.",
  "lore_context_for_ai": "Depuis 2 mois, une sécheresse exceptionnelle frappe le sud de Velkhar. Les caravanes sont réduites de moitié. Les Sahélin migrent vers le nord. Prix du sel +30%. Cendreurs y voient un signe.",
  "active_from": "2026-06-01",
  "active_until": "2026-08-31",
  "tags": ["weather", "economy", "south"],
  "created_by": "adem",
  "created_at": "timestamp"
}
```

### Injection contexte

Au début de chaque run, **tous les events actifs** sont injectés dans le contexte initial :

```
[ÉTAT DU MONDE — VELKHAR ACTUELLEMENT]
- La Grande Sécheresse : Depuis 2 mois, une sécheresse...
- La Comète de Calamine : Visible chaque nuit dans le ciel sud...
- Le Concile de Tissan a fermé ses portes...
```

Budget : **~400 tokens** total pour les events (sur les 800 tokens N3 cf. [16-MEMORY §3](16-MEMORY.md)).

### Affichage joueur

- **Page d'accueil de l'auberge** : éléments visuels subtils selon events actifs
  - Comète de Calamine active → ciel rouge en arrière-plan animé
  - Grande Sécheresse → poussière supplémentaire sur la table de L'Aveugle
- **L'Aveugle mentionne** 1 event au début du run N+1 (_"Le sud meurt de soif, étranger. Tu y vas quand même ?"_)
- **Page publique** `/monde` (V2+) qui liste les events actifs avec descriptions player-facing

### Exemples canoniques (à pré-rédiger par Adem)

1. **La Grande Sécheresse** (weather/economy) — Sud aride, prix sel +30%, Sahélin migrent
2. **La Comète de Calamine** (mystical/cosmic) — Visible 3 mois, artefacts plus sensibles, Cendreurs euphoriques
3. **Le Concile Fermé de Tissan** (political) — Capitale isolée, accès restreint, rumeurs de schisme
4. **L'Éveil des Vieilles Lames** (myth/combat) — Anciens artefacts réveillés, combats plus dangereux mais récompenses meilleures
5. **Le Pacte des Changepeaux** (faction) — Nouvelle alliance, route nord plus sûre, accès narratif

### Discipline éditoriale (anti-abandon)

- **Calendrier éditorial mensuel** (1 nouvel event/mois minimum)
- **Outil interne minimal** : édition directe table Supabase via dashboard SQL (pas d'UI dédiée V1)
- **Backup automatique** : tous les events archivés indéfiniment (peut alimenter lore futur)
- **Lien public optionnel** `grimoire.game/monde/historique` (V2+) — montre que le monde a une histoire évolutive

### Anti-patterns interdits

- ❌ Events générés par IA (risque hallucinations lore)
- ❌ Events qui contredisent le canon Velkhar ([02-WORLD-BIBLE](02-WORLD-BIBLE.md))
- ❌ Events qui modifient les mécaniques de jeu (stats, dés) — événements **narratifs uniquement**
- ❌ Events liés à un joueur précis ("toi seul as fait tomber X") — c'est niveau B
- ❌ Events permanents > 6 mois (saturation, perte d'intérêt)

---

## §5 — L'Aveugle : mémoire vivante du joueur

L'Aveugle est le **point de contact unique** entre tous les niveaux méta. Cf. [07-CHARACTER-CREATION §5](07-CHARACTER-CREATION.md).

### Ce qu'il sait à chaque run N+1

1. **Identité ancien perso** (nom, vocation, peuple, cause de fin)
2. **5 Souvenirs nommés** les plus pertinents du joueur (triés pgvector)
3. **Traces locales actives** liées au lieu actuel (l'auberge n'a pas de trace, mais L'Aveugle connaît les traces ailleurs)
4. **3-5 événements mondiaux actifs**

### Ce qu'il peut faire

- **Reconnaître le joueur** (_"Tu reviens. Le sable t'a recraché à ce que je vois."_)
- **Mentionner un ancien perso** (_"Kael portait la même lampe que toi. Curieux."_)
- **Référencer un Souvenir** (_"On dit qu'un voyageur a épargné Vane une nuit. C'était toi, peut-être."_)
- **Avertir d'un event mondial** (_"Tu pars au sud ? La sécheresse a tué trois caravanes ce mois."_)
- **Vendre du lore** contre Souvenir donné (cf. [11-INVENTORY-ECONOMY §3](11-INVENTORY-ECONOMY.md))

### Ce qu'il ne fait pas

- ❌ Lister mécaniquement les Souvenirs (_"Tu as 7 Souvenirs : 1, 2, 3..."_)
- ❌ Spoiler les events futurs (il ne sait que les actifs)
- ❌ Mentionner d'autres joueurs (V1 — pas de partage)

---

## §6 — Le pacte avec le joueur

### Promesse explicite (UI / onboarding)

Dans la création de compte (Phase D) ou page d'accueil (V1) :

> _"Velkhar change, même quand tu n'es pas là. Tes Souvenirs t'attendent."_

### Manifestations concrètes

1. **À chaque retour** : L'Aveugle te reconnaît + mentionne 1 event mondial
2. **À chaque run** : tes Souvenirs récents sont injectés en contexte
3. **À chaque mois** : nouveau event lancé (visible si tu reviens)
4. **À chaque visite** : visuels d'auberge légèrement modulés selon events
5. **À chaque fin de run** : ce que tu as appris s'inscrit — bestiaire, routes, contrats (§1bis)

### Ce qu'on NE promet PAS

- ❌ **Un perso qui devient plus fort run après run** (méta-progression = savoir et accès, jamais puissance — §1bis)
- ❌ Quêtes longues multi-runs (trop complexe à orchestrer V1)
- ❌ Saisons rythmées type live-service (pression éditoriale insoutenable solo dev)
- ❌ PNJ qui vieillissent / meurent de vieillesse (mécanique complexe sans payoff évident)
- ❌ "Monde partagé" entre joueurs (V2+)

---

## §7 — Gestion solo dev (réalisme éditorial)

Adem est **seul** à curater les événements mondiaux. C'est une **charge éditoriale récurrente** qu'il faut dimensionner réaliste.

### Rythme

- **1 nouvel event/mois** = 12 events/an = ~30 minutes d'écriture par event (avec template)
- Total : **6 heures de curation/an** — soutenable

### Template d'écriture (à pré-définir)

```markdown
## {Titre dramatique}

**Type** : {weather | economy | political | mystical | faction}
**Durée** : {N mois}
**Tags** : {sud, nord, économie, etc.}

### Description joueur (UI publique)

{1-2 phrases simples, ton observateur}

### Contexte IA (injecté dans prompts)

{3-5 phrases riches : qui, quoi, où, depuis quand, conséquences observables, qui en parle}

### Effets narratifs possibles

- {hook narratif 1}
- {hook narratif 2}
- {hook narratif 3}
```

### Outil V1 (zéro UI)

- Édition directe table Supabase via **Supabase Studio** (dashboard cloud inclus)
- Pas de CMS dédié, pas d'admin UI custom — overkill pour 1 personne
- V2+ : si Adem délègue à un narrative designer → UI minimaliste à dev

### Alerte anti-abandon

- Si dernière création event > 45 jours → email Adem auto _"Velkhar attend son prochain souffle"_
- Affiché aussi sur dashboard interne (table SQL : `SELECT created_at FROM world_events ORDER BY created_at DESC LIMIT 1`)

---

## §8 — Caps & monétisation (lien Phase D)

| Tier           | Souvenirs créés                  | Souvenirs conservés                     | Galerie accessible     |
| -------------- | -------------------------------- | --------------------------------------- | ---------------------- |
| Anonyme        | 3 par run (jusqu'au mur 30 reqs) | Cookie chiffré, perdu après 90j         | Non (pas de compte)    |
| Compte gratuit | Illimité                         | Purge > 6 mois inactivité, garde 20 max | Oui                    |
| Premium        | Illimité                         | Jamais de purge                         | Oui + export PDF (V2+) |

### Pourquoi pas de cap "création" Souvenirs en gratuit

- Cap _création_ = frustrant et arbitraire ("Pourquoi mon Souvenir n'a pas compté ?")
- Cap _conservation post-purge_ = transparent et compensé par cap général 150 reqs/sem
- Premium achète **pérennité**, pas quantité — cohérent avec philosophie "Premium = pas un meilleur jeu, c'est plus de jeu"

### Détaillé dans Phase D

- Politique de purge complète → `19-MONETIZATION.md`
- Bouton "Exporter mes Souvenirs PDF" → `19-MONETIZATION.md` (Premium V2+)
- Avertissement mail 30 jours avant purge → `20-ARCHITECTURE.md` Phase D

---

## §9 — Cohérence inter-runs (règles d'or)

### Le canon Velkhar ne change JAMAIS

- 8 régions, 6 peuples, 4 vocations, 10 classes futures → **immuables** ([02-WORLD-BIBLE](02-WORLD-BIBLE.md))
- Géographie fixe
- Histoire ancienne fixe
- Cosmologie fixe (la Calamine, les artefacts, les Cendreurs)

### Ce qui change

- **Événements mondiaux** (état actuel du monde, pas son essence)
- **Traces personnelles** (par joueur seulement)
- **Souvenirs nommés** (objets narratifs personnels)

### Conflits possibles & résolution

| Conflit                                                | Résolution                                                      |
| ------------------------------------------------------ | --------------------------------------------------------------- |
| Trace locale dit X, event mondial dit Y contradictoire | Event mondial **gagne** (plus récent, source autorité)          |
| Souvenir nommé contredit le perso actuel               | Souvenir **persiste** mais n'est pas injecté en contexte ce run |
| 2 events mondiaux se contredisent                      | Adem ne les active jamais en même temps (curation responsable)  |
| Joueur prétend avoir vu X (mémoire fausse)             | L'IA n'a pas à corriger — laisser l'ambiguïté narrative         |

### Immuabilité des Souvenirs

Une fois créé, un Souvenir nommé **ne peut plus être édité ni rétroactivement modifié** par l'IA. Il peut être :

- **Mentionné** par L'Aveugle ou un PNJ
- **Ignoré** si non pertinent au contexte
- **Supprimé** par le joueur (bouton "Oublier ce Souvenir" — RGPD)

Mais **jamais réécrit**. C'est la garantie de cohérence ressentie.

---

## §10 — Risques & garde-fous

| Risque                                                                                            | Mitigation                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **L'IA invente un event mondial inexistant** (hallucination)                                      | Events injectés en contexte explicitement. Prompt système : _"Tu ne peux mentionner que les events présents dans le contexte fourni."_ Validation backend post-output. |
| **Inflation des Souvenirs** (joueur avec 500 Souvenirs accumulés)                                 | Cap pgvector : 5 Souvenirs injectés max par tour. Galerie complète accessible, mais contexte IA limité.                                                                |
| **Purge gratuit mal vécue** ("J'ai perdu tous mes Souvenirs !")                                   | Email d'avertissement 30j avant purge. Bouton "Exporter mes Souvenirs JSON" gratuit. Conservation 20 max post-purge. Premium = jamais.                                 |
| **Joueur perd progression méta après pause longue**                                               | Conservation 20 Souvenirs même après purge. Premium = jamais de purge. Trade-off transparent.                                                                          |
| **Trace locale qui n'a plus de sens** (ex : "Soren mort" mais Soren réapparait via event mondial) | Logique de résolution : event mondial > trace locale. Trace temporairement ignorée.                                                                                    |
| **Saturation contexte par méta** (800 tokens N3 trop justes)                                      | Tri pertinence pgvector sur Souvenirs. Events mondiaux compressés (titre + 1 phrase max).                                                                              |
| **Adem oublie de créer events** (jeu sent l'abandon)                                              | Email auto si dernier event > 45j. Visible sur dashboard Adem.                                                                                                         |
| **Joueur veut tout supprimer (RGPD)**                                                             | Bouton "Effacer toutes mes données" dans profil. Process documenté Phase D.                                                                                            |
| **Event mondial offensant**                                                                       | Adem est seul curateur → contrôle direct, pas de modération externe nécessaire V1.                                                                                     |
| **Partage entre joueurs demandé (V2+)**                                                           | Reporté explicitement → V2+ avec modération dédiée. Décision data-driven sur traction.                                                                                 |

---

## §11 — Synthèse

```
                ┌──────────────────────────────────────────┐
                │  ENTRE LES RUNS : VELKHAR PERSISTE       │
                └────────────────────┬─────────────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
        ▼                            ▼                            ▼
┌───────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│ NIVEAU A          │    │ NIVEAU B             │    │ NIVEAU C             │
│ Souvenirs nommés  │    │ Traces locales       │    │ Events mondiaux      │
│                   │    │                      │    │                      │
│ Par joueur        │    │ Par joueur           │    │ Partagés tous joueurs│
│ Survit aux runs   │    │ PNJ morts, factions, │    │ 3-5 actifs max       │
│ 3/run max         │    │ lieux modifiés       │    │ 1-3 mois durée       │
│ Galerie compte    │    │ V1 : pas partagé     │    │ Curé par Adem        │
│                   │    │                      │    │ 1 nouveau/mois min   │
│ Postgres          │    │ Postgres             │    │ Postgres             │
│ souvenirs table   │    │ traces table         │    │ world_events table   │
└─────────┬─────────┘    └──────────┬───────────┘    └──────────┬───────────┘
          │                         │                            │
          └─────────────────────────┼────────────────────────────┘
                                    │
                                    ▼
                ┌──────────────────────────────────────────┐
                │  L'AVEUGLE (point de contact unique)     │
                │  Reçoit en contexte au début du run N+1: │
                │  - Identité ancien perso                 │
                │  - 5 Souvenirs nommés pertinents         │
                │  - Traces locales du lieu courant        │
                │  - 3-5 events mondiaux actifs            │
                │  → Reconnaît, mentionne, vend du lore    │
                └──────────────────────────────────────────┘
                                    │
                                    ▼
                ┌──────────────────────────────────────────┐
                │  JOUEUR ressent :                        │
                │  - "Mon perso a une histoire"            │
                │  - "Mes actes ont eu des conséquences"   │
                │  - "Le monde change, même sans moi"      │
                │  = 3 crochets de rétention superposés    │
                └──────────────────────────────────────────┘

    Coût d'implémentation V1 : faible (3 tables + injection contexte)
    Coût éditorial V1 : ~6h/an (12 events × 30 min)
    Effet ressenti : maximal vs effort
```

---

## Références croisées Phase D

- **Cap conservation Souvenirs (purge 6 mois gratuit)** → `19-MONETIZATION.md`
- **Bouton "Effacer mes données" RGPD** → `20-ARCHITECTURE.md` Phase D
- **Export PDF Souvenirs Premium** → `19-MONETIZATION.md` (V2+ possible)
- **"Monde Partagé" V2+** → `21-ROADMAP.md`

---

_Fichier 14 — Phase C — `Méta-monde` posé. Suite : [20-ARCHITECTURE](20-ARCHITECTURE.md)._
