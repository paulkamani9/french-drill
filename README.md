# Chiffrator — dictée de nombres en français

Jeu d'entraînement en une page : un nombre s'affiche en chiffres, on l'écrit
en toutes lettres. Toute l'interface est en français.

## Lancer

Un simple site statique, sans build :

```bash
npm run dev   # http://127.0.0.1:8123
```

## Tester le convertisseur

```bash
npm test
```

## Deux modes

**Aléatoire** — on choisit une plage (présélections ou bornes libres) et les
nombres tombent au hasard dedans.

**Parcours** — une liste fixe de 77 nombres pièges, répartis en cinq paliers
qui vont du plus simple au plus retors : les dizaines pièges, les centaines,
les milliers, les millions, puis un grand final qui mélange tout. Rien n'est
tiré au hasard : l'ordre de la liste *est* la difficulté. Un nombre raté
repasse dans la file quelques places plus loin, donc il faut l'écrire juste
pour boucler le palier. Le palier suivant s'ouvre quand le précédent est fini,
et la progression est gardée d'une session à l'autre.

La liste vit dans `src/parcours.js`.

## Règles d'orthographe appliquées

- 0–16 en un mot, puis `dix-sept`, `dix-huit`, `dix-neuf`.
- « et » uniquement dans `vingt et un`, `trente et un`, `quarante et un`,
  `cinquante et un`, `soixante et un`, `soixante et onze` — jamais dans
  `quatre-vingt-un` ni `quatre-vingt-onze`.
- 70–79 = `soixante` + 10–19 ; 80–99 = `quatre-vingt` + 0–19.
- `vingt` et `cent` prennent un -s seulement s'ils sont multipliés **et** non
  suivis d'un autre numéral : `deux cents`, mais `deux cent un`.
- `mille` est un numéral : il fait tomber le -s (`quatre-vingt mille`,
  `deux cent mille`). Il est invariable et ne prend jamais de -s.
- `million` et `milliard` sont des noms : le -s reste devant eux
  (`quatre-vingts millions`, `deux cents millions`) et ils s'accordent
  (`deux millions`, `deux milliards`).

## Correction

Insensible à la casse, strict sur les traits d'union et les espaces.
L'orthographe traditionnelle (`vingt et un`) et l'orthographe rectifiée de
1990 (`vingt-et-un`, tout en traits d'union) sont toutes deux acceptées.
Avant comparaison, la saisie est normalisée : minuscules, espaces multiples
réduits, tirets typographiques (– — −) ramenés au trait d'union, espaces
insécables ramenées à l'espace simple.

## Tirage

Le tirage n'est pas uniforme sur toute la plage : on choisit d'abord une
tranche de longueur (nombre de chiffres) au hasard parmi celles que couvre la
plage, puis un nombre au hasard dans cette tranche. Sinon, sur 1 → 1 milliard,
on ne verrait quasiment que des nombres à neuf chiffres.
