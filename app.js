import { numberToFrenchWords, checkAnswer, normalize, formatDigits } from './src/french-numbers.js';

const MIN_ABS = 0;
const MAX_ABS = 1_000_000_000;
const DELAI_SUIVANT = 800; // ms avant le nombre suivant quand c'est juste

const PRESETS = [
  { libelle: '1 → 20', min: 1, max: 20 },
  { libelle: '1 → 100', min: 1, max: 100 },
  { libelle: '1 → 1 000', min: 1, max: 1_000 },
  { libelle: '1 → 10 000', min: 1, max: 10_000 },
  { libelle: '1 → 100 000', min: 1, max: 100_000 },
  { libelle: '1 → 1 million', min: 1, max: 1_000_000 },
  { libelle: '1 → 10 millions', min: 1, max: 10_000_000 },
  { libelle: '1 → 1 milliard', min: 1, max: 1_000_000_000 },
];

const $ = (id) => document.getElementById(id);
const el = {
  accueil: $('ecran-accueil'), jeu: $('ecran-jeu'), presets: $('presets'),
  min: $('min'), max: $('max'), demarrer: $('btn-demarrer'),
  nombre: $('nombre'), reponse: $('reponse'), verdict: $('verdict'),
  valider: $('btn-valider'), reveler: $('btn-reveler'), retour: $('btn-retour'),
  carteJeu: $('carte-jeu'), plageActive: $('plage-active'),
  statCorrect: $('stat-correct'), statTotal: $('stat-total'),
  statSerie: $('stat-serie'), statRecord: $('stat-record'),
  jaugeBarre: $('jauge-barre'), jaugeTxt: $('jauge-txt'),
};

const etat = {
  min: 1, max: 100, nombre: null,
  correct: 0, total: 0, serie: 0, record: 0,
  phase: 'saisie', // 'saisie' | 'resolu'
  minuteur: null,
};

/* ---------- Écran d'accueil ---------- */

PRESETS.forEach((p) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'preset';
  b.textContent = p.libelle.replace(/ /g, ' ');
  b.addEventListener('click', () => {
    el.min.value = String(p.min);
    el.max.value = String(p.max);
    marquerPreset();
  });
  el.presets.appendChild(b);
});

function bornes() {
  const lire = (input, defaut) => {
    const v = Math.round(Number(input.value));
    if (!Number.isFinite(v)) return defaut;
    return Math.min(MAX_ABS, Math.max(MIN_ABS, v));
  };
  let min = lire(el.min, 1);
  let max = lire(el.max, 100);
  if (min > max) [min, max] = [max, min]; // on remet dans l'ordre
  return { min, max };
}

function marquerPreset() {
  const { min, max } = bornes();
  [...el.presets.children].forEach((b, i) => {
    b.classList.toggle('actif', PRESETS[i].min === min && PRESETS[i].max === max);
  });
}

el.min.addEventListener('input', marquerPreset);
el.max.addEventListener('input', marquerPreset);
marquerPreset();

el.demarrer.addEventListener('click', demarrer);
[el.min, el.max].forEach((input) => input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') demarrer();
}));

function demarrer() {
  const { min, max } = bornes();
  etat.min = min;
  etat.max = max;
  el.min.value = String(min);
  el.max.value = String(max);
  etat.correct = 0;
  etat.total = 0;
  etat.serie = 0;
  etat.record = Number(localStorage.getItem('chiffrator.record') || 0) || 0;
  el.accueil.hidden = true;
  el.jeu.hidden = false;
  el.plageActive.textContent =
    `Plage : ${formatDigits(min)} → ${formatDigits(max)}`;
  majStats();
  nouveauNombre();
}

el.retour.addEventListener('click', () => {
  clearTimeout(etat.minuteur);
  el.jeu.hidden = true;
  el.accueil.hidden = false;
  marquerPreset();
});

/* ---------- Tirage par tranche de longueur ---------- */

function tirer(min, max) {
  const tranches = [];
  for (let d = 1; d <= 10; d += 1) {
    const bas = d === 1 ? 0 : 10 ** (d - 1);
    const haut = 10 ** d - 1;
    const a = Math.max(min, bas);
    const b = Math.min(max, haut);
    if (a <= b) tranches.push([a, b]);
  }
  // Une tranche de longueur au hasard, puis un nombre au hasard dedans :
  // sinon, sur 1 → 1 milliard, on ne tirerait que des nombres à neuf chiffres.
  const [a, b] = tranches[Math.floor(Math.random() * tranches.length)];
  return a + Math.floor(Math.random() * (b - a + 1));
}

function nouveauNombre() {
  let n = tirer(etat.min, etat.max);
  if (n === etat.nombre && etat.max - etat.min > 0) n = tirer(etat.min, etat.max);
  etat.nombre = n;
  etat.phase = 'saisie';
  el.nombre.textContent = formatDigits(n);
  el.verdict.innerHTML = '';
  el.carteJeu.classList.remove('faux', 'juste');
  el.reponse.value = '';
  el.reponse.disabled = false;
  el.reveler.disabled = false;
  el.valider.textContent = 'Vérifier';
  el.valider.classList.remove('suivant');
  el.reponse.focus();
}

/* ---------- Correction ---------- */

function valider() {
  if (etat.phase === 'resolu') { clearTimeout(etat.minuteur); nouveauNombre(); return; }
  const saisie = el.reponse.value;
  if (!normalize(saisie)) { el.reponse.focus(); return; }

  const res = checkAnswer(etat.nombre, saisie);
  etat.total += 1;

  if (res.correct) {
    etat.correct += 1;
    etat.serie += 1;
    if (etat.serie > etat.record) {
      etat.record = etat.serie;
      localStorage.setItem('chiffrator.record', String(etat.record));
    }
    etat.phase = 'resolu';
    el.reponse.disabled = true;
    el.reveler.disabled = true;
    el.carteJeu.classList.add('juste');
    el.verdict.innerHTML = `<p class="bandeau ok">${bravo()}</p>`;
    majStats(true);
    etat.minuteur = setTimeout(nouveauNombre, DELAI_SUIVANT);
    return;
  }

  etat.serie = 0;
  afficherErreur(normalize(saisie), res.expected, res.firstBadIndex);
  majStats();
}

const BRAVOS = ['Bravo ! 🎉', 'Parfait ! ✨', 'Sans faute ! 💯', 'Excellent ! 🚀', 'Nickel ! 🌟'];
const bravo = () => BRAVOS[Math.floor(Math.random() * BRAVOS.length)];

function afficherErreur(saisie, attendu, indexFaute) {
  etat.phase = 'resolu';
  el.reponse.disabled = true;
  el.reveler.disabled = true;
  el.carteJeu.classList.remove('juste');
  el.carteJeu.classList.add('faux');

  const bon = saisie.slice(0, indexFaute);
  const mauvais = saisie.slice(indexFaute);
  const marque = mauvais
    ? `<span class="faute">${echapper(mauvais)}</span>`
    : '<span class="manque">réponse incomplète</span>';

  el.verdict.innerHTML = `
    <p class="bandeau ko">Raté ! ✗</p>
    <p class="ligne"><span class="ligne-lib">Ta réponse</span>${echapper(bon)}${marque}</p>
    <p class="ligne"><span class="ligne-lib">La bonne orthographe</span><span class="bonne">${echapper(attendu)}</span></p>`;

  el.valider.textContent = 'Nombre suivant →';
  el.valider.classList.add('suivant');
  el.valider.focus();
}

function echapper(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function reveler() {
  if (etat.phase === 'resolu') return;
  etat.total += 1;        // une révélation compte comme une erreur
  etat.serie = 0;
  etat.phase = 'resolu';
  el.reponse.disabled = true;
  el.reveler.disabled = true;
  el.carteJeu.classList.add('faux');
  el.verdict.innerHTML = `
    <p class="bandeau ko">Réponse révélée 👀</p>
    <p class="ligne"><span class="ligne-lib">La bonne orthographe</span><span class="bonne">${echapper(numberToFrenchWords(etat.nombre))}</span></p>`;
  el.valider.textContent = 'Nombre suivant →';
  el.valider.classList.add('suivant');
  majStats();
}

/* ---------- Statistiques ---------- */

function majStats(animer = false) {
  el.statCorrect.textContent = String(etat.correct);
  el.statTotal.textContent = String(etat.total);
  el.statSerie.textContent = String(etat.serie);
  el.statRecord.textContent = String(etat.record);
  el.statSerie.parentElement.classList.toggle('chaud', etat.serie >= 3);

  const pct = etat.total ? Math.round((etat.correct / etat.total) * 100) : 0;
  el.jaugeBarre.style.width = `${pct}%`;
  el.jaugeTxt.textContent = etat.total
    ? `Précision : ${pct}% (${etat.correct}/${etat.total})`
    : 'Précision : —';

  if (animer) {
    el.statCorrect.classList.remove('pop');
    void el.statCorrect.offsetWidth; // relance l'animation
    el.statCorrect.classList.add('pop');
  }
}

/* ---------- Entrées ---------- */

el.valider.addEventListener('click', valider);
el.reveler.addEventListener('click', reveler);
el.reponse.addEventListener('keydown', (e) => { if (e.key === 'Enter') valider(); });
// Entrée passe au nombre suivant même si le champ n'a plus le focus.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || el.jeu.hidden || etat.phase !== 'resolu') return;
  if (e.target === el.valider || e.target === el.reponse) return; // déjà géré
  clearTimeout(etat.minuteur);
  nouveauNombre();
});
