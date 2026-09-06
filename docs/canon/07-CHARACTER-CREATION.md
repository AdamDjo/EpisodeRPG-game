# 07 — Création de Personnage

> _Tu pousses une porte. Une lampe brûle. Un homme aveugle te sourit. Le voyage commence._

---

## 0. Principe

La création de personnage **n'est pas un écran de stats**. C'est le **prologue** du jeu. Le joueur ne remplit pas un formulaire — il vit une scène avec **L'Aveugle**, aubergiste-prophète du _Doigt-Cassé_, et la fiche se construit naturellement à partir de la conversation.

> _Aucun joueur ne doit voir un slider de stats. Tout passe par la voix de L'Aveugle, et l'IA traduit en triptyque._

### Les 3 promesses de la création

- 🟢 **Pas de friction d'onboarding** : 4 vocations prêtes, 1 clic, on joue
- 🟢 **Liberté totale pour les RP** : qui veut écrire son propre concept peut, l'IA l'intègre
- 🟢 **C'est déjà du jeu** : la première boucle d'action commence ici, pas après

### Le socle commun à tous les personnages

Le personnage n'arrive pas comme un novice. Survivre jusqu'au _Doigt-Cassé_ signifie qu'il sait
déjà se battre, fuir, camper, reconnaître un danger immédiat et rationner eau et vivres. La vocation
ne décide pas s'il est compétent ; elle décide **comment** cette compétence s'exprime.

Il reste pourtant une personne ordinaire et mortelle : aucun statut d'élu, aucune résurrection et
aucune protection du récit. Il n'est pas obligatoirement chasseur de contrats. Les contrats donnent
un objectif, des ressources et une raison praticable de quitter l'Auberge ; la motivation intime du
personnage vient de sa vocation, de son concept libre et de ses actes.

Lors de son premier passage, le personnage est inconnu. Sa réputation se construit pendant son run
et ne devient jamais automatiquement celle de son successeur.

---

## 1. L'auberge de L'Aveugle

L'auberge — _Le Doigt-Cassé_ — est le **hub unique** de GRIMOIRE. Chaque run commence et finit ici.

### Ambiance (à respecter dans le prompt IA)

```
Sensations :
- Vent du désert qui siffle sous la porte
- Lampe à huile qui éclaire à peine une grande salle
- Odeur de pain trempé dans le thé, de sueur, de sable chaud
- Le silence — peu de clients, juste quelques voyageurs
- Une table en bois sec, balafrée
- L'Aveugle derrière, qui sourit vaguement dans le vide
```

### L'Aveugle (le personnage)

- 🧓 Homme âgé, aveugle de naissance dit-il, mais **on sait que c'est plus que ça**
- 👁️ Voit ce que les autres ne voient pas — origines, futures, artefacts
- 🗣️ Parle peu, lent, lourd. Chaque phrase compte
- 🪙 Gagne sa vie en vendant du **lore** contre des **Souvenirs**
- ⚖️ Neutre absolu — jamais juge, jamais conseil moral

🟢 _L'Aveugle est l'interface humaine du méta-monde. Tout ce qui persiste passe par lui._

---

## 2. Le rituel de bienvenue (5 étapes)

### Étape 1 — La porte, le nom

L'Aveugle parle avant même que le joueur s'assoie :

> _« Repose-toi, voyageur. Le vent t'a guidé. Mais avant que je te serve, dis-moi : sous quel nom les sables te connaissent ? »_

→ **Saisie libre du nom** (1-30 caractères, prénom + nom optionnel)

### Étape 2 — La réaction au nom

L'IA **analyse le nom** et réagit en RP selon l'origine apparente :

| Patron                           | Origine présumée | Exemple de réaction IA                                         |
| -------------------------------- | ---------------- | -------------------------------------------------------------- |
| Voyelle longue, "-an", "-in"     | Sahélin          | _"Un nom du Sud. Tes ancêtres ont vu le sel avant moi."_       |
| Consonnes dures, "-vald", "-ric" | Rivain           | _"Tu viens des Côtes. Loin de chez toi, voyageur."_            |
| Doux, soufflé, "-él", "-ya"      | Thérien          | _"Un nom des Doigts. On t'a appris à compter les pierres."_    |
| Court, sec                       | Cendreur         | _"Un nom de cendre. Tu es né dans la tempête."_                |
| Inhabituel / inconnu             | Étranger         | _"Un nom que mes oreilles n'ont jamais bu. Tu viens de loin."_ |

🟢 _L'IA ne demande pas l'origine — elle la **devine** et la propose. Si elle se trompe, le joueur corrige naturellement par la suite._

### Étape 3 — Le modal de création

Après la réaction, **un modal apparaît** :

```
┌──────────────────────────────────────────────────┐
│           Qui es-tu, voyageur ?                  │
│                                                  │
│  ┌────────────────────────────────────────┐     │
│  │ 🐫 Marcheur-du-Sel                     │     │
│  │ Commerce, survie, le désert te connaît │     │
│  └────────────────────────────────────────┘     │
│                                                  │
│  ┌────────────────────────────────────────┐     │
│  │ 🗡️ Lame-Ombre                          │     │
│  │ Contrats, secrets, tu marches en silence│    │
│  └────────────────────────────────────────┘     │
│                                                  │
│  ┌────────────────────────────────────────┐     │
│  │ 🏛️ Veilleur                            │     │
│  │ Ruines, savoir, les artefacts t'appellent│   │
│  └────────────────────────────────────────┘     │
│                                                  │
│  ┌────────────────────────────────────────┐     │
│  │ 🔥 Tisse-Verbe                          │     │
│  │ Tu éveilles ce que d'autres craignent   │     │
│  └────────────────────────────────────────┘     │
│                                                  │
│  ─────────  ou  ─────────                       │
│                                                  │
│  ┌────────────────────────────────────────┐     │
│  │ ✍️  Écrire mon propre concept           │     │
│  └────────────────────────────────────────┘     │
└──────────────────────────────────────────────────┘
```

### Étape 4 — Concept libre (le chemin RP)

Si le joueur clique sur **✍️ Écrire mon propre concept**, un champ texte s'ouvre :

> _Décris qui tu es. Quelques phrases suffisent._

Le joueur écrit (exemples) :

- _"Je suis Kael, ex-Inquisiteur en cavale. J'ai brûlé un village et je m'en veux."_
- _"Une vieille chasseuse de Calcinés, lasse, qui cherche un dernier monstre."_
- _"Un orphelin qui a grandi dans les marais et parle aux Mangeurs de Souvenir."_

L'IA **analyse le concept** et :

1. **Identifie la vocation hôte** (celle dont la fiche se rapproche le plus)
2. **Annonce l'hôte au joueur en RP** — pas en méta :

> _« Je vois en toi un Lame-Ombre qui a déserté la Main. Le contrat se brise rarement sans retour, mais tes mains savent encore tuer. »_

3. **Adapte la fiche** :
   - **Nom de vocation personnalisé** : _"Inquisiteur déchu"_, _"Vieille chasseuse"_, _"Enfant des marais"_
   - **Compétences shiftées** : remplace 1-2 compétences de base par d'autres pertinentes au concept
   - **Trait narratif** : 1 trait court qui résume le concept (_"Hanté par un village brûlé"_) — l'IA s'en sert pendant tout le run

🟢 _Règle absolue : le concept libre **ne crée jamais** une 5ᵉ vocation cachée. Il **personnalise** une des 4. Sinon la difficulté d'équilibrage devient incontrôlable._

🟢 _Le joueur peut refuser l'hôte proposé ("non, je veux jouer ça en Tisse-Verbe"). L'IA accepte et réajuste._

### Étape 5 — Le peuple

L'Aveugle pose une dernière question :

> _« Et le sang dans tes veines — d'où vient-il ? »_

→ **Choix entre 5 peuples** (boutons rapides) :

| Peuple        | Bonus stat             | Saveur                                      |
| ------------- | ---------------------- | ------------------------------------------- |
| 🌅 Sahélin    | +1 SANG                | Peuple du Sud, des oasis et caravanes       |
| 🌊 Rivain     | +1 VOLONTÉ             | Peuple des Côtes, marchands et négociateurs |
| 🪨 Thérien    | +1 SANG                | Peuple des Doigts, durs comme la pierre     |
| 🔥 Cendreur   | +1 SOUFFLE             | Né dans le désert, oreille fine, œil exercé |
| 🌀 Changepeau | +1 SOUFFLE, −1 VOLONTÉ | Marqué par la Cendre dès l'enfance          |

🟢 _L'IA peut **suggérer** un peuple cohérent avec le nom donné, mais le joueur a le dernier mot._

---

## 3. La fiche du joueur (générée auto)

Après les 5 étapes, l'IA **compile la fiche** et l'affiche brièvement (le temps d'un fade-in narratif), puis on entre dans le run.

```
┌─────────────────────────────────────────────┐
│  KAEL VANE                                  │
│  Inquisiteur déchu — Rivain                 │
│                                              │
│  🩸 SANG     +1                             │
│  💨 SOUFFLE  +2                             │
│  🔥 VOLONTÉ   +1   (bonus peuple Rivain)     │
│                                              │
│  PV : 11 / 11                               │
│                                              │
│  Compétences :                              │
│  ⚔️ Mêlée (+2)                              │
│  👁️ Investigation (+2)                      │
│  💬 Intimidation (+2)                       │
│  🕊️ Foi (+2) [shifté du concept]            │
│                                              │
│  Équipement de départ :                     │
│  • Épée courte                              │
│  • Manteau de cuir bouilli                  │
│  • Gourde (pleine)                          │
│  • 25 🪙                                    │
│                                              │
│  Trait narratif :                           │
│  "Hanté par un village brûlé"               │
└─────────────────────────────────────────────┘
```

🟢 _La fiche est **récapitulative**, pas modifiable. Si le joueur n'aime pas, il peut "Rejouer la création" (retour au modal)._

---

## 4. Le 1ᵉʳ Souvenir gratuit

Avant que le joueur quitte l'auberge, **L'Aveugle offre 1 Souvenir gratuit** :

> _« Avant que tu partes, voyageur. Une chose. Le savoir est mon métier — et ce premier, je te le donne. »_

→ **3 fragments de lore proposés** (niveau "5 mots" L11, voir `02-WORLD-BIBLE`) :

| Choix            | Exemple de Souvenir                                            |
| ---------------- | -------------------------------------------------------------- |
| 🌅 Le désert     | _"La brume dorée tue. Ne respire jamais."_                     |
| ⚔️ Les Calcinés  | _"Un Calciné, c'était un homme. Ne l'oublie pas."_             |
| 🏛️ Les artefacts | _"Les Archontes dorment dans les ruines. Ils rêvent de nous."_ |

→ Le joueur choisit. Le Souvenir est **enregistré** dans son inventaire (voir `11-INVENTORY-ECONOMY` §3).

🟢 _Onboarding du vocabulaire : à la fin du prologue, le joueur connaît déjà 5 mots clés du monde. Pas besoin de page glossaire._

---

## 5. Run ≥ 2 — La mémoire de L'Aveugle

À partir du 2ᵉ run, **L'Aveugle se souvient**. C'est ici que la rétention se construit.

### Au retour du joueur

Si le personnage revient vivant, L'Aveugle peut le reconnaître directement et **évoquer les
Souvenirs nommés** de ses passages précédents :

> _« Ah. Toi. Celui qui a épargné l'Inquisiteur Vane. J'ai entendu les rumeurs. Tu as bien fait, ou pas — le temps le dira. »_

Face à un successeur, L'Aveugle ne prétend jamais reconnaître la même personne. Il reconnaît
l'artefact transmis, puis rattache un ou deux Souvenirs au voyageur mort :

> _« Je ne connais pas ton visage. Mais cet objet, lui, est déjà mort une fois. »_

🟢 _L'IA pioche dans la table des Souvenirs nommés du joueur (voir `14-META-WORLD`) et en cite 1-2 en intro, en attribuant clairement les actes au bon personnage._

### La création raccourcie

Si le joueur **rejoue avec un nouveau perso** (mort ou choix), L'Aveugle accueille **le successeur** :

> _« Un autre est venu. Avant toi. Il portait ceci. »_ — _L'Aveugle pose un artefact sur la table._

→ **Modal de création raccourcie** :

1. Nom (saisie)
2. Vocation OU concept libre
3. Peuple

- **Pas de Souvenir gratuit** (le joueur en a déjà accumulé)
- **L'artefact d'héritage** est déjà dans l'inventaire

🟢 _La mort fait mal mais ne réinitialise pas tout. L'héritage rend la transition narrative riche._

### L'identification d'artefacts

Si le joueur ramène un artefact non identifié d'un run (cf. `11-INVENTORY-ECONOMY` §5), L'Aveugle peut l'**identifier** contre un Souvenir :

> _« Pose-le. Laisse-moi sentir. »_ — _Il passe la main au-dessus._ — _« C'est un fragment de la Voix des Sables. Tisse-Verbe pourrait le réveiller. Coût : un Souvenir. »_

→ Le joueur paye 1 Souvenir, l'IA **génère le lore complet** de l'artefact (nom, histoire, faiblesse, effet d'éveil).

🟢 _Mécanique permanente : L'Aveugle est utile à **chaque** run, pas juste au premier._

---

## 6. Après la création — préparer le premier contrat

Une fois la fiche compilée, L'Aveugle recommande une **première quête** selon la vocation :

| Vocation / Concept | Destination suggérée                                                     |
| ------------------ | ------------------------------------------------------------------------ |
| Marcheur-du-Sel    | _"La caravane de Khessir part à l'aube. Ils cherchent un guide."_        |
| Lame-Ombre         | _"Un contrat t'attend au Trou-du-Rat. Discrétion requise."_              |
| Veilleur           | _"Une ruine s'est ouverte près des Doigts. Personne n'y est entré."_     |
| Tisse-Verbe        | _"Une femme à Tissan cherche quelqu'un comme toi. Elle paye en savoir."_ |
| Concept libre      | _L'IA invente une accroche basée sur le trait narratif_                  |

Cette recommandation ne lance pas directement le run. Le joueur rejoint l'Auberge complète :
Comptoir, L'Aveugle, Contrats et Forge. Il peut préparer son sac et choisir un autre contrat parmi
les trois offres ordinaires.

→ Un contrat principal doit être accepté avant le départ.

→ Le run et la consommation de ressources commencent au franchissement de la porte. La **boucle
d'action** (voir `09-ACTION-LOOP`) reste la même pendant le voyage, la quête et le retour.

---

## 7. Mort et succession

Quand le personnage meurt, une **transition narrative** se joue avant le retour à l'Auberge. Une
mort ordinaire peut transmettre l'artefact ; la transformation en Calciné reste l'exception sans
artefact, car elle le corrompt avec le corps.

### Le récit de la mort

L'IA génère un **épilogue court** (la fin de la Chronique, voir `17-RUN-CHRONICLE`) :

> _« Kael Vane est tombé sous le sabre du Veilleur archontique. Son sang a séché sur les pierres de la ruine. La Voix des Sables, son artefact, est tombée à ses côtés — et un autre voyageur l'a trouvée. »_

### Le retour à l'auberge

L'Aveugle accueille **le successeur** comme à l'Étape 1, mais avec **une variation** :

> _« Le vent porte un nouveau pas. Un autre est venu. Avant toi. Tu portes son artefact, voyageur. »_

→ La **création raccourcie** s'enchaîne (§5).

Le successeur est une nouvelle personne. Il n'hérite ni du corps, ni du nom, ni de la réputation
complète, ni des relations du mort. Après une mort ordinaire, il a trouvé, reçu ou arraché l'artefact
d'héritage, puis choisi de le porter jusqu'au _Doigt-Cassé_. Ce chemin précis peut rester
fragmentaire afin que le concept libre du nouveau personnage conserve sa place.

Après une transformation en Calciné, aucun artefact n'arrive à l'Auberge. Le successeur y vient pour
sa propre raison ; L'Aveugle relie son arrivée aux Souvenirs, à la connaissance et aux traces du
joueur, sans inventer une transmission d'objet.

🟢 _La mort n'est pas une résurrection. Le personnage disparaît ; le joueur continue par son
Héritage : l'artefact lorsqu'il est récupérable, les Souvenirs, la connaissance et les traces
laissées dans le monde._

---

## 8. Risques & garde-fous

| Risque                                             | Mitigation                                                                                                             |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Concept libre incompréhensible**                 | L'IA propose alors les 4 vocations en disant _"Je ne te comprends pas tout à fait. Veux-tu choisir parmi celles-ci ?"_ |
| **Concept libre qui crée une 5ᵉ vocation cachée**  | Règle stricte : toujours 1 hôte parmi les 4. L'IA annonce explicitement l'hôte                                         |
| **Joueur frustré par un nom mal interprété**       | La réaction de L'Aveugle est vague et non bloquante. Le joueur peut corriger ensuite via dialogue                      |
| **Trop d'écrans avant de jouer**                   | Max 5 étapes, 4 clics pour vocation préfaite + peuple. Concept libre = +1 étape de saisie                              |
| **L'Aveugle qui devient envahissant aux runs ≥ 2** | Limiter à 1-2 Souvenirs évoqués par retour. Ne pas saturer                                                             |
| **Identification d'artefact qui coûte trop cher**  | 1 Souvenir = 1 artefact identifié. Toujours rentable face au pouvoir débloqué                                          |

---

## 9. Synthèse — Diagramme du flux

```
LANCEMENT DU JEU
   ↓
🏠 Auberge de L'Aveugle (visuelle, ambiance)
   ↓
L'Aveugle demande le NOM (saisie libre)
   ↓
L'Aveugle réagit selon le nom (RP IA)
   ↓
MODAL :  ┌──── 4 vocations préfaites ────┐
         │ Marcheur-du-Sel               │
         │ Lame-Ombre                    │  ─→ choix
         │ Veilleur                      │
         │ Tisse-Verbe                   │
         └───────────────────────────────┘
              OU
         ┌──── ✍️ Écrire mon concept ────┐
         │ (saisie libre)                │  ─→ IA force hôte
         └───────────────────────────────┘
   ↓
Choix du PEUPLE (5 options, +1 stat)
   ↓
Fiche compilée (récap)
   ↓
1ᵉʳ Souvenir gratuit (3 choix lore)
   ↓
L'Aveugle recommande une première quête
   ↓
Hub : Comptoir · L'Aveugle · Contrats · Forge
   ↓
Contrat accepté + préparation terminée
   ↓
Sortie de l'auberge — LE RUN COMMENCE (09, 23)


RUN ≥ 2
   ↓
🏠 Retour à l'auberge
   ↓
L'Aveugle évoque les Souvenirs précédents
   ↓
Option : identifier un artefact (1 Souvenir)
   ↓
Si nouveau perso : création raccourcie (3 étapes)
   ↓
Sortie — nouveau run
```

🟢 _L'auberge est le **seul** écran statique du jeu. Tout le reste, c'est la boucle._

---

_La **boucle d'action** qui prend le relais dès la sortie est détaillée dans `09-ACTION-LOOP.md`._
_Les **vocations** préfaites (stats, compétences de départ, équipement) sont détaillées dans `05-VOCATIONS.md`._
_Les **peuples** (lore, traits culturels) sont détaillés dans `02-WORLD-BIBLE.md`._
_Les **Souvenirs** (économie méta) sont détaillés dans `11-INVENTORY-ECONOMY.md` §3._
_La **mémoire** de L'Aveugle entre les runs est détaillée dans `14-META-WORLD.md`._
