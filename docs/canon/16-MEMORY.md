# 16 — La Mémoire

> **Fichier 16 / Phase C / Suite directe de [15-GAME-MASTER](15-GAME-MASTER.md)**
>
> Liens : [14-META-WORLD](14-META-WORLD.md) · [17-RUN-CHRONICLE](17-RUN-CHRONICLE.md) · [20-ARCHITECTURE](20-ARCHITECTURE.md) · [09-ACTION-LOOP](09-ACTION-LOOP.md)

---

## §0 — Principe

**3 niveaux de mémoire, chacun avec un budget tokens fixe. Au-delà → compression. Jamais de "dump tout".**

L'IA ne peut pas tout retenir — financièrement (coût par token) ni qualitativement (un contexte saturé dégrade la cohérence narrative). GRIMOIRE organise la mémoire en **3 couches** distinctes, chacune servant un horizon temporel précis :

| Niveau              | Horizon                         | Stockage            | Budget contexte |
| ------------------- | ------------------------------- | ------------------- | --------------- |
| **N1 — Intra-tour** | 3-5 derniers tours              | Redis / cache       | 1 500 tokens    |
| **N2 — Intra-run**  | Résumés compressés de scènes    | Postgres + pgvector | 4 000 tokens    |
| **N3 — Inter-runs** | Souvenirs nommés + état mondial | Postgres            | 800 tokens      |

**Total contexte mémoire par appel** : **6 300 tokens**, qui s'ajoute aux 1 700 tokens de prompt système + lore = **8 000 tokens hard cap** (cf. [15-GAME-MASTER §5](15-GAME-MASTER.md)).

---

## §1 — Niveau 1 : Mémoire intra-tour (gratuite)

### Principe

Les **3 à 5 derniers tours** du run actuel, **en clair** dans le prompt. C'est la mémoire "court terme" — celle qui permet à l'IA de rester cohérente sur la scène en cours (continuité PNJ, action en suspens, dialogue à enchaîner).

### Format

Chaque tour est injecté ainsi :

```
[Tour N-2] Joueur : "J'examine la table."
            MJ : "Une carte tachée d'huile. Trois croix au nord."
[Tour N-1] Joueur : "Je prends la carte."
            MJ : "Tu la glisses dans ta sacoche. La main du marchand frémit."
[Tour N]   Joueur : "Je sors sans payer."
            ⇒ Action en cours, à traiter
```

### Budget

- **1 500 tokens max**
- Si dépassé (rare — les tours font 250 tokens narration + 80 choix) → on garde les 3 plus récents seulement
- **Pas de compression intra-tour** : ce niveau est _toujours en clair_. La compression commence au niveau 2.

### Stockage

- **Redis** (production) — clé `run:{run_id}:recent_turns`, TTL 24h
- **Cache Express en mémoire** (V1 ultra-minimal si Redis pas encore déployé)
- **Pas de Postgres** pour ce niveau : trop de latence pour quelque chose qu'on lit à chaque tour

### Quand purger ?

- À la fin du run (succès, mort, abandon)
- À l'inactivité > 24h (le run est considéré comme abandonné, cleanup auto)

---

## §2 — Niveau 2 : Mémoire intra-run (compression progressive)

### Principe

Au-delà des 5 derniers tours, le run garde sa cohérence narrative via des **résumés compressés** générés automatiquement toutes les 8-10 tours. Chaque résumé remplace les tours en clair dans le contexte futur.

### Le déclenchement

Une **scène** = ~8-10 tours du joueur (configurable). Quand le 9ᵉ tour est joué :

1. Backend prend les tours 1-8 en clair
2. Backend appelle un modèle léger (Mistral Small free) avec un prompt de compression dédié
3. Backend reçoit un objet `scene_summary` (~150 tokens)
4. Backend stocke le résumé en DB, lié au `run_id`
5. Les tours 1-8 sont **archivés** mais plus injectés en contexte (sauf rappel pgvector — cf. §7)

### Format du résumé

```json
{
  "scene_id": "uuid",
  "summary": "Texte de ~150 tokens, narratif à la 3ᵉ personne",
  "key_facts": ["fait 1", "fait 2", "fait 3"],
  "key_facts_pinned": ["fait critique 1"],
  "mood": "tense",
  "npcs_evolution": [
    { "name": "Vane", "status": "alliée", "last_seen": "auberge" }
  ],
  "embedding": [
    /* vector pgvector, 1536 dims */
  ]
}
```

### Les `key_facts_pinned`

Catégorie spéciale **immuable** : faits qui ne doivent **jamais** être perdus par compression future. Détectés automatiquement par règles :

| Type de fait                     | Pinned ? | Pourquoi                                             |
| -------------------------------- | -------- | ---------------------------------------------------- |
| Mort d'un PNJ majeur             | ✅       | Cohérence — un PNJ mort doit rester mort             |
| Artefact obtenu/perdu            | ✅       | Inventaire = source de vérité, mais le moment compte |
| Quête activée                    | ✅       | Doit être traçable jusqu'à résolution                |
| Choix moral majeur               | ✅       | Identité du perso (cf. Souvenirs nommés §6)          |
| Promesse faite                   | ✅       | Engagement narratif                                  |
| Conversation banale              | ❌       | Peut disparaître sans dommage                        |
| Description d'un lieu de passage | ❌       | Re-générable                                         |

Les `pinned` sont **toujours** injectés dans le contexte tant que le run vit, en plus du résumé compressé.

### Budget

- **4 000 tokens max** total niveau 2 par appel
- Composition : `résumés de scènes (compressés)` + `key_facts_pinned cumulés`
- Si dépassé → compression de second ordre (résumé des résumés les plus anciens), `pinned` toujours préservés

### Stockage

- **Postgres** table `scenes` : `id, run_id, summary, key_facts, key_facts_pinned, embedding, turn_count, created_at`
- L'embedding `vector(1536)` permet la recherche pgvector (cf. §7)

---

## §3 — Niveau 3 : Mémoire inter-runs (méta, minimaliste)

### Principe

Entre deux runs, **on ne garde presque rien**. Le run précédent est mort avec son perso. Ce qui transcende les runs :

- Les **Souvenirs nommés** du joueur (cf. [14-META-WORLD §2](14-META-WORLD.md))
- L'**état mondial** global (3-5 événements actifs — cf. [14-META-WORLD §4](14-META-WORLD.md))
- L'**identité du perso précédent** (nom, vocation, peuple, cause de mort)

Pas plus. Pas de "tu as joué 47 runs", pas de stats compulsives, pas d'arbre de talents persistant. **Velkhar oublie volontairement** — c'est l'essence roguelike narratif.

### Format injecté dans un nouveau run

```
[MÉMOIRE INTER-RUNS]
Le joueur a vécu {N} aventures précédentes à Velkhar.
Souvenirs nommés actifs (max 5 injectés selon pertinence) :
  - "La nuit où Vane t'a trahi" (run précédent, perso Kael)
  - "Le sel que tu as recraché sur le seuil de Tissan" (3 runs avant)

Événement mondial actif :
  - "La grande sécheresse" : caravanes réduites de moitié depuis 2 mois.

Dernier perso : Kael, Marcheur-du-Sel, Sahélin, mort dans le Désert d'Os.
```

### Budget

- **800 tokens max** total niveau 3
- Composition : 5 Souvenirs nommés (50 tokens chacun = 250) + 1-2 événements mondiaux (200) + identité ancien perso (100) + marge (250)
- Si plus de 5 Souvenirs pertinents → tri par pertinence (cf. §7 pgvector sur les Souvenirs aussi)

### Stockage

- **Postgres** tables `souvenirs` et `world_events` (cf. [20-ARCHITECTURE §2](20-ARCHITECTURE.md))
- Lié à `player_id` (compte ou cookie anonyme)

### Comment c'est injecté

- Au **début du run** : L'Aveugle (lors de la création de perso) reçoit ces données en contexte → peut commenter (_"Tu portes encore l'ombre de Kael, je le vois."_)
- À chaque tour suivant : injecté en silence dans le contexte IA, max 800 tokens

---

## §4 — Le budget contextuel total par appel IA

Rappel du cap absolu défini en [15-GAME-MASTER §5](15-GAME-MASTER.md) :

| Élément                                        | Tokens max | Niveau   |
| ---------------------------------------------- | ---------- | -------- |
| Prompt système (3 voix, anti-patterns, format) | 1 200      | —        |
| Lore Velkhar extraits pertinents               | 500        | —        |
| Mémoire intra-tour                             | 1 500      | N1       |
| Mémoire intra-run (résumés + pinned)           | 4 000      | N2       |
| Mémoire inter-runs (Souvenirs + monde)         | 800        | N3       |
| **TOTAL ENTRÉE**                               | **8 000**  | hard cap |
| Sortie narration                               | 250        | —        |
| Sortie choix                                   | 80         | —        |
| **TOTAL SORTIE**                               | **330**    | —        |

### Algorithme de gestion du dépassement

```
1. Calculer la taille totale d'entrée
2. Si > 8000 tokens :
   a. Compresser le plus ancien résumé N2 (résumé de résumés)
   b. Si encore > 8000 → retirer le Souvenir nommé le moins pertinent N3
   c. Si encore > 8000 → tronquer le lore Velkhar (garder uniquement extraits critiques)
   d. Si encore > 8000 → erreur, fallback générique (cas extrême, ne devrait jamais arriver)
3. Les key_facts_pinned ne sont JAMAIS retirés
```

---

## §5 — La compression (mécanique détaillée)

### Quand compresser ?

- À la fin de chaque scène (8-10 tours)
- Avant chaque appel si on dépasse 8 000 tokens

### Qui appelle ?

Un **service backend dédié** : `memoryService.compressScene(run_id, turns[])`. Pas le même flux que le tour de jeu — c'est asynchrone, déclenché en background.

### Quel modèle ?

**Mistral Small free** (rapide, gratuit, suffisant pour un résumé). Si fail → Llama 3.3 70B free.

### Le prompt de compression

> **Langue pivot anglaise (#168).** La mémoire interne (résumés N2, `key_facts`,
> `npcs_evolution`) est **toujours** générée et stockée en anglais, quelle que soit
> la langue de narration du joueur. Ce niveau n'est jamais affiché tel quel : seule
> la narration présentée au joueur est localisée. Ce pivot fixe garantit qu'un
> changement de langue en cours de run ne traduit ni ne corrompt jamais le canon
> accumulé.

```
You compress 8 game turns into a structured summary.
Always write the summary and facts in English — this is an internal memory
record, never shown to the player, and must stay language-independent.

[CONTEXT]
{character_name}, {vocation}, {people}, in Velkhar.
Current location: {location}.

[RAW TURNS]
{turn_1}
{turn_2}
...
{turn_8}

[INSTRUCTION]
Output STRICTLY as JSON:
{
  "summary": "150 tokens max, third-person narrative",
  "key_facts": ["fact 1", "fact 2", "fact 3"],  // 3-5 max
  "key_facts_pinned": [/* critical facts per rules */],
  "mood": "calm | tense | festive | sacred | dangerous | dread",
  "npcs_evolution": [{"name": "...", "status": "...", "last_seen": "..."}]
}

Automatic pinning rules:
- NPC death → key_facts_pinned
- Artifact gained/lost → key_facts_pinned
- Quest activated → key_facts_pinned
- Major moral choice → key_facts_pinned
```

> **Le mood `dread` _(ajout 2026-08-15, #281)_.** L'enum de compression suit strictement celui de
> `15-GAME-MASTER §4.1` — six valeurs, pas cinq. Une scène de présage compressée en `tense` ou
> `dangerous` perdrait l'information qui la distingue : la menace n'était pas encore là. Toute
> évolution de l'enum doit être répercutée **ici et dans `15-GAME-MASTER §4.1` en même temps**.

### Coût

- ~3 compressions par run (run moyen ~25 tours = 3 scènes)
- ~1 200 tokens entrée + 300 tokens sortie par compression = 1 500 tokens
- × 3 = 4 500 tokens supplémentaires par run en background
- Négligeable face aux ~25 × 8 330 = 208 250 tokens du run lui-même

### Latence

- Compression asynchrone : le joueur n'attend jamais
- Si compression échoue : retry × 2, sinon on garde les tours en clair (avec warning log)

---

## §6 — Les Souvenirs nommés (lien avec [14-META-WORLD §2](14-META-WORLD.md))

### Détection candidate (côté IA)

Pendant un tour, l'IA peut **tagger** un moment :

```json
{
  "narration": "...",
  "choices": [...],
  "souvenir_candidate": {
    "title_suggestion": "La nuit où tu as épargné Vane",
    "body_50_tokens": "Au seuil de la lame, ta main s'est arrêtée. Vane respire encore."
  }
}
```

### Validation (côté backend)

Le backend décide si le candidat devient un Souvenir nommé selon règles :

- **Max 3 Souvenirs nommés par run**
- Le moment doit correspondre à un **déclencheur précis** :
  - Mort d'un PNJ avec nom dans `key_facts_pinned`
  - Choix moral majeur tracé
  - Découverte secrète marquée
  - Victoire de combat épique (boss vaincu)
- Sinon → candidat ignoré

### Stockage

- Table `souvenirs` avec `named: true`
- Lié à `character_id` (origine) + `player_id` (propriétaire)
- Persiste même si le perso meurt

---

## §7 — Le rappel via pgvector

### Pourquoi

L'IA reçoit ~4 000 tokens de résumés N2 — mais un run de 50 tours a peut-être 5-6 scènes archivées (= 5-6 × 150 tokens). Et quand le joueur dit _"je retourne voir Vane"_ 30 tours après l'avoir rencontrée, on veut que l'IA s'en souvienne avec **précision**, pas juste via un résumé compressé.

### Comment ça marche

1. À chaque scène compressée, on génère un **embedding** du résumé via OpenRouter (modèle d'embedding gratuit) ou `pgvector` natif si on a un modèle local
2. À chaque nouveau tour, on extrait les **entités** (PNJ, lieux, items) de l'action du joueur via regex/NLP simple
3. On fait une recherche pgvector : _"top-3 résumés les plus similaires aux entités mentionnées"_
4. Si score similarité ≥ **0.85** → on injecte le résumé en _"Tu te souviens vaguement de..."_ (max 200 tokens)
5. Sinon → on n'injecte rien (évite le bruit hors-contexte)

### Format injecté

```
[RAPPEL — pertinent au tour actuel]
Tu te souviens : il y a quelques heures, Vane t'a aidé à fuir
les Rouilleurs. Elle disait avoir une dette envers ton peuple.
(Score similarité : 0.91)
```

### Le seuil 0.85

- Choisi prudemment pour éviter les faux positifs
- Mesuré sur dataset de tests internes (Adem joue 10 runs et valide la pertinence des rappels)
- Ajustable via env var `MEMORY_SIMILARITY_THRESHOLD`

### Budget rappel

- **200 tokens max** par tour (1 rappel principal)
- Compté **dans** les 4 000 tokens N2 (pas en plus)

---

## §8 — Mémoire anonyme vs compte

### Anonyme

- **Toute la mémoire en cookie/localStorage chiffré** côté client (chiffrement AES via clé serveur)
- Volume mini : 30 requêtes max anonyme = 30 tours max = 1-2 scènes max = ~500 tokens stockés
- **Aucune persistance serveur** des données narratives anonymes (RGPD-friendly)
- Si le joueur ferme le navigateur → tout est perdu (sauf cookie)
- **Exception** : `request_logs` persiste côté serveur pour anti-abus (compteur de reqs par cookie/IP)

### Compte gratuit

- **Tout en DB Supabase**, persistent
- Purge auto après **6 mois d'inactivité** :
  - `scenes` : supprimées (le run est mort de toute façon)
  - `souvenirs` : conservés 6 mois post-inactivité, puis supprimés
  - `chronicles` : conservées **2 ans** (asset viral, URL publique)
  - `world_events` : non liés à un joueur, jamais purgés
- Mail d'avertissement 30 jours avant purge

### Premium

- **Illimité**, **jamais de purge** automatique
- Souvenirs, scènes, chroniques conservés indéfiniment
- Export complet des données disponible (RGPD + valeur premium)

---

## §9 — Risques & garde-fous

| Risque                                                                                           | Mitigation                                                                                                                               |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Compression qui perd l'essentiel** (l'IA résume mal une scène cruciale)                        | Règles de `key_facts_pinned` automatiques. Les pinned ne sont jamais perdus. Si test A/B montre récurrence → enrichir règles de pinning. |
| **pgvector rappelle hors-contexte** (le joueur dit "marchand" → 5 marchands différents remontés) | Seuil similarité ≥ 0.85. Top-1 seulement (pas top-3 pour V1). Logs des rappels pour audit.                                               |
| **Coût compression** (3 appels supplémentaires par run)                                          | Mistral Small free → 0€. Si free tier sature → batché 2 compressions / appel.                                                            |
| **Latence compression** (asynchrone mais peut traîner)                                           | Hard timeout 8 sec. Si fail → tours restent en clair (graceful degradation).                                                             |
| **Embedding échoue** (modèle gratuit indispo)                                                    | Fallback : pas de pgvector cette scène, résumé seul. pgvector est un _bonus_, pas une dépendance dure.                                   |
| **Pinning trop agressif** (40 faits pinned saturent les 4000 tokens)                             | Hard cap 20 pinned simultanés par run. Au-delà → on dépinne les plus anciens non-critiques.                                              |
| **Mémoire inter-runs trop lourde** (joueur avec 50 Souvenirs)                                    | Tri pgvector pour ne garder que les 5 plus pertinents par contexte. Galerie complète accessible dans le profil mais pas injectée.        |
| **Anonyme dépasse cookie max (4KB)**                                                             | Cap 30 reqs = sécurise structurellement. Compression LZ-string si proche limite.                                                         |
| **Cohérence entre N2 et N3** (un Souvenir nommé d'un ancien run contredit la scène actuelle)     | Les Souvenirs sont **immuables** une fois créés. Le nouveau run doit composer avec, pas les contredire. Prompt système le rappelle.      |

---

## §10 — Synthèse (diagramme 3 niveaux)

```
                  ┌──────────────────────────────────────┐
                  │ APPEL IA pour le tour N              │
                  │ Budget total entrée : 8 000 tokens   │
                  └─────────────────┬────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌──────────────┐         ┌──────────────────┐         ┌─────────────────┐
│ N1 Intra-tour│         │ N2 Intra-run     │         │ N3 Inter-runs   │
│ 1500 tokens  │         │ 4000 tokens      │         │ 800 tokens      │
│              │         │                  │         │                 │
│ 3-5 derniers │         │ Résumés compressés         │ Souvenirs nommés│
│ tours en     │         │ (~150 tokens/scène)        │ (5 max injectés)│
│ clair        │         │ + key_facts_pinned         │ + état mondial  │
│              │         │ + rappels pgvector         │ + ancien perso  │
│ Redis        │         │ Postgres + pgvector        │ Postgres        │
│ TTL 24h      │         │ Lié à run_id               │ Lié à player_id │
└──────────────┘         └──────────────────┘         └─────────────────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    │
                                    ▼
                  ┌──────────────────────────────────────┐
                  │ + Prompt système (1 200) + Lore (500)│
                  │ = ~8 000 tokens entrée IA            │
                  └─────────────────┬────────────────────┘
                                    │
                                    ▼
                  ┌──────────────────────────────────────┐
                  │ Cascade OpenRouter (cf. 15)          │
                  │ → narration 250 + choix 80 tokens    │
                  └──────────────────────────────────────┘

  COMPRESSION (toutes les 8-10 tours, asynchrone) :
  ─────────────────────────────────────────────────
  Tours 1-8 en clair  ──→  Mistral Small free  ──→  scene_summary (150 tokens)
                                                     + key_facts_pinned
                                                     + embedding pgvector
                                                     stocké en Postgres
```

---

## Références croisées Phase D

- **Purge données compte gratuit** (6 mois) → règle compensatoire pour cap 150 reqs/sem, détaillée dans `19-MONETIZATION.md`
- **Export RGPD complet** → process documenté dans `20-ARCHITECTURE.md` Phase D
- **Stockage Premium illimité** → bénéfice Premium documenté dans `19-MONETIZATION.md`

---

_Fichier 16 — Phase C — `Mémoire` posée. Suite : [17-RUN-CHRONICLE](17-RUN-CHRONICLE.md)._
