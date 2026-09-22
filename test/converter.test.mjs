import { numberToFrenchWords, normalize, acceptedForms, checkAnswer, formatDigits } from '../src/french-numbers.js';

const CASES = [
  [0, 'zéro'],
  [1, 'un'],
  [16, 'seize'],
  [17, 'dix-sept'],
  [19, 'dix-neuf'],
  [20, 'vingt'],
  [21, 'vingt et un'],
  [22, 'vingt-deux'],
  [31, 'trente et un'],
  [41, 'quarante et un'],
  [51, 'cinquante et un'],
  [61, 'soixante et un'],
  [70, 'soixante-dix'],
  [71, 'soixante et onze'],
  [72, 'soixante-douze'],
  [77, 'soixante-dix-sept'],
  [79, 'soixante-dix-neuf'],
  [80, 'quatre-vingts'],
  [81, 'quatre-vingt-un'],
  [90, 'quatre-vingt-dix'],
  [91, 'quatre-vingt-onze'],
  [97, 'quatre-vingt-dix-sept'],
  [99, 'quatre-vingt-dix-neuf'],
  [100, 'cent'],
  [101, 'cent un'],
  [180, 'cent quatre-vingts'],
  [200, 'deux cents'],
  [201, 'deux cent un'],
  [230, 'deux cent trente'],
  [283, 'deux cent quatre-vingt-trois'],
  [999, 'neuf cent quatre-vingt-dix-neuf'],
  [1000, 'mille'],
  [1001, 'mille un'],
  [1100, 'mille cent'],
  [2000, 'deux mille'],
  [21000, 'vingt et un mille'],
  [80000, 'quatre-vingt mille'],
  [80001, 'quatre-vingt mille un'],
  [200000, 'deux cent mille'],
  [280000, 'deux cent quatre-vingt mille'],
  [999999, 'neuf cent quatre-vingt-dix-neuf mille neuf cent quatre-vingt-dix-neuf'],
  [1000000, 'un million'],
  [1234567, 'un million deux cent trente-quatre mille cinq cent soixante-sept'],
  [2000000, 'deux millions'],
  [80000000, 'quatre-vingts millions'],
  [80000001, 'quatre-vingts millions un'],
  [200000000, 'deux cents millions'],
  [200000001, 'deux cents millions un'],
  [1000000000, 'un milliard'],
  [1000000001, 'un milliard un'],
];

let failures = 0;
const check = (label, actual, expected) => {
  if (actual !== expected) {
    failures += 1;
    console.error(`✗ ${label}\n    attendu : ${expected}\n    obtenu  : ${actual}`);
  } else {
    console.log(`✓ ${label} → ${actual}`);
  }
};

for (const [n, expected] of CASES) check(String(n), numberToFrenchWords(n), expected);

// Normalisation
check('normalize tirets/espaces', normalize('  Vingt — Et   UN '), 'vingt - et un');
check('normalize tiret typographique', normalize('Dix–Sept'), 'dix-sept');

// Orthographe rectifiée de 1990
check('rectifiée 21', acceptedForms(21)[1], 'vingt-et-un');
check('rectifiée 1234567', acceptedForms(1234567)[1],
  'un-million-deux-cent-trente-quatre-mille-cinq-cent-soixante-sept');
check('accepte traditionnelle', String(checkAnswer(71, 'Soixante et Onze').correct), 'true');
check('accepte rectifiée', String(checkAnswer(71, 'soixante-et-onze').correct), 'true');
check('refuse mauvaise réponse', String(checkAnswer(80, 'quatre-vingt').correct), 'false');
check('index première faute', String(checkAnswer(80, 'quatre-vingt-s').firstBadIndex), '12');

// Affichage des chiffres
check('séparateur milliers', formatDigits(1234567), '1 234 567');
check('séparateur 4 chiffres', formatDigits(1000), '1 000');

// Cohérence : toute valeur doit se re-vérifier elle-même
for (let i = 0; i <= 2000; i += 1) {
  const w = numberToFrenchWords(i);
  if (!checkAnswer(i, w).correct) { failures += 1; console.error(`✗ aller-retour ${i} (${w})`); }
  if (!checkAnswer(i, w.replace(/ /g, '-')).correct) { failures += 1; console.error(`✗ rectifiée ${i}`); }
}

console.log(failures === 0 ? '\nTous les tests passent.' : `\n${failures} test(s) en échec.`);
process.exit(failures === 0 ? 0 : 1);
