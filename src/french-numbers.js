// Conversion d'un entier en toutes lettres (français métropolitain).
// Règles : « et » seulement pour 21/31/41/51/61/71 ; 70-79 = soixante + 10-19 ;
// 80-99 = quatre-vingt + 0-19 ; « vingt » et « cent » prennent un -s seulement
// s'ils sont multipliés et non suivis d'un autre numéral (mille en est un,
// million/milliard sont des noms et n'effacent donc pas le -s).

const UNITS = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit',
  'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
  'dix-sept', 'dix-huit', 'dix-neuf',
];

const TENS = { 20: 'vingt', 30: 'trente', 40: 'quarante', 50: 'cinquante', 60: 'soixante' };

// keepS : le groupe peut-il garder le -s final de « vingts » / « cents » ?
function belowHundred(n, keepS) {
  if (n < 20) return UNITS[n];
  if (n < 70) {
    const tens = Math.floor(n / 10) * 10;
    const unit = n % 10;
    const word = TENS[tens];
    if (unit === 0) return word;
    if (unit === 1) return `${word} et un`;
    return `${word}-${UNITS[unit]}`;
  }
  if (n < 80) {
    const rest = n - 60; // 10..19
    if (rest === 11) return 'soixante et onze';
    return `soixante-${UNITS[rest]}`;
  }
  const rest = n - 80; // 0..19
  if (rest === 0) return keepS ? 'quatre-vingts' : 'quatre-vingt';
  return `quatre-vingt-${UNITS[rest]}`;
}

function threeDigits(n, keepS) {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds === 0) return belowHundred(rest, keepS);
  let head = hundreds === 1 ? 'cent' : `${UNITS[hundreds]} cent`;
  if (rest === 0) {
    if (hundreds > 1 && keepS) head += 's';
    return head;
  }
  return `${head} ${belowHundred(rest, keepS)}`;
}

export function numberToFrenchWords(value) {
  const n = Math.trunc(value);
  if (!Number.isFinite(n) || n < 0) throw new RangeError('Nombre invalide');
  if (n === 0) return 'zéro';

  const milliards = Math.floor(n / 1e9) % 1000;
  const millions = Math.floor(n / 1e6) % 1000;
  const milliers = Math.floor(n / 1e3) % 1000;
  const units = n % 1000;

  const parts = [];
  if (milliards) parts.push(`${threeDigits(milliards, true)} milliard${milliards > 1 ? 's' : ''}`);
  if (millions) parts.push(`${threeDigits(millions, true)} million${millions > 1 ? 's' : ''}`);
  // « mille » est un numéral : il fait tomber le -s du groupe qui le précède.
  if (milliers) parts.push(milliers === 1 ? 'mille' : `${threeDigits(milliers, false)} mille`);
  if (units) parts.push(threeDigits(units, true));
  return parts.join(' ');
}

// Minuscules, espaces normalisés, tirets typographiques ramenés au trait d'union.
export function normalize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[‐‑‒–—―−]/g, '-')
    .replace(/[     ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Orthographe traditionnelle + orthographe rectifiée de 1990 (tout en traits d'union).
export function acceptedForms(value) {
  const traditional = numberToFrenchWords(value);
  const rectified = traditional.replace(/ /g, '-');
  return traditional === rectified ? [traditional] : [traditional, rectified];
}

// Renvoie { correct, expected, firstBadIndex } — index du premier caractère faux.
export function checkAnswer(value, answer) {
  const typed = normalize(answer);
  const forms = acceptedForms(value);
  let best = { correct: false, expected: forms[0], firstBadIndex: 0 };
  for (const form of forms) {
    if (typed === form) return { correct: true, expected: form, firstBadIndex: -1 };
    let i = 0;
    while (i < typed.length && i < form.length && typed[i] === form[i]) i += 1;
    if (i >= best.firstBadIndex) best = { correct: false, expected: form, firstBadIndex: i };
  }
  // On affiche toujours l'orthographe traditionnelle comme correction.
  return { correct: false, expected: forms[0], firstBadIndex: best.firstBadIndex, typed };
}

// Séparateur de milliers français : espace fine insécable (U+202F).
export function formatDigits(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
