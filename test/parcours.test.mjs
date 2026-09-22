import { PALIERS, TOTAL_NOMBRES } from '../src/parcours.js';
import { numberToFrenchWords, checkAnswer } from '../src/french-numbers.js';

let failures = 0;
const check = (label, ok, detail = '') => {
  if (ok) { console.log(`✓ ${label}`); return; }
  failures += 1;
  console.error(`✗ ${label}${detail ? `\n    ${detail}` : ''}`);
};

check('au moins 4 paliers', PALIERS.length >= 4);

const tous = [];
for (const [i, palier] of PALIERS.entries()) {
  const nom = `palier ${i + 1} (${palier.titre})`;
  check(`${nom} : titre et résumé`, Boolean(palier.titre && palier.resume));
  check(`${nom} : au moins 10 nombres`, palier.nombres.length >= 10, `${palier.nombres.length} nombres`);

  const entiers = palier.nombres.every((n) => Number.isInteger(n) && n >= 0 && n <= 1_000_000_000);
  check(`${nom} : entiers dans 0 → 1 milliard`, entiers);

  // Dans un palier, l'ordre va du plus petit au plus grand : c'est la progression.
  const croissant = palier.nombres.every((n, k) => k === 0 || n > palier.nombres[k - 1]);
  check(`${nom} : ordre croissant`, croissant);

  tous.push(...palier.nombres);
}

// Les paliers eux-mêmes vont du plus simple au plus complexe : le plus grand
// nombre d'un palier reste sous le plus grand du suivant (hors grand final,
// qui rebrasse tout).
for (let i = 1; i < PALIERS.length - 1; i += 1) {
  const avant = Math.max(...PALIERS[i - 1].nombres);
  const apres = Math.max(...PALIERS[i].nombres);
  check(`palier ${i + 1} plus corsé que le ${i}`, apres > avant, `${avant} vs ${apres}`);
}

check('aucun doublon dans le parcours', new Set(tous).size === tous.length,
  `${tous.length} nombres, ${new Set(tous).size} distincts`);
check(`total cohérent (${TOTAL_NOMBRES})`, TOTAL_NOMBRES === tous.length);

// Chaque nombre du parcours doit passer la correction avec sa propre orthographe.
for (const n of tous) {
  const mots = numberToFrenchWords(n);
  if (!checkAnswer(n, mots).correct || !checkAnswer(n, mots.replace(/ /g, '-')).correct) {
    failures += 1;
    console.error(`✗ ${n} ne se vérifie pas lui-même (${mots})`);
  }
}
check('tous les nombres se vérifient eux-mêmes', true);

// Le parcours doit bien couvrir les pièges annoncés.
const mots = tous.map(numberToFrenchWords);
const couvre = (motif, quoi) =>
  check(`le parcours couvre ${quoi}`, mots.some((m) => motif.test(m)));
couvre(/\bet un\b/, '« et un »');
couvre(/\bet onze\b/, '« et onze »');
couvre(/quatre-vingts$/, '« quatre-vingts » final');
couvre(/quatre-vingt mille/, '« quatre-vingt mille » (-s qui tombe)');
couvre(/quatre-vingts millions/, '« quatre-vingts millions » (-s qui reste)');
couvre(/^cents? /, '« cent » suivi d\'autre chose');
couvre(/cents millions/, '« cents millions »');
couvre(/^mille\b/, '« mille » seul, sans « un »');
couvre(/milliard/, '« milliard »');

console.log(failures === 0 ? '\nTous les tests passent.' : `\n${failures} test(s) en échec.`);
process.exit(failures === 0 ? 0 : 1);
