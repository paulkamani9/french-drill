import { numberToFrenchWords, checkAnswer, normalize, formatDigits } from './src/french-numbers.js';
import { PALIERS } from './src/parcours.js';

const MIN_ABS = 0;
const MAX_ABS = 1_000_000_000;
const DELAI_SUIVANT = 800; // ms avant le nombre suivant quand c'est juste
const RETOUR_FILE = 3;     // un nombre raté revient N places plus loin

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
  modeLibre: $('mode-libre'), modeParcours: $('mode-parcours'),
  blocLibre: $('bloc-libre'), blocParcours: $('bloc-parcours'),
  paliers: $('paliers'), oublier: $('btn-oublier'),
  nombre: $('nombre'), reponse: $('reponse'), verdict: $('verdict'),
  valider: $('btn-valider'), reveler: $('btn-reveler'), retour: $('btn-retour'),
  tiret: $('btn-tiret'), consigne: $('consigne'),
  carteJeu: $('carte-jeu'), plageActive: $('plage-active'),
  bandeau: $('bandeau-palier'), palierTitre: $('palier-titre'),
  palierCompte: $('palier-compte'), palierBarre: $('palier-barre'),
  palierResume: $('palier-resume'),
  carteFin: $('carte-fin'), finEmoji: $('fin-emoji'), finTitre: $('fin-titre'),
  finDetail: $('fin-detail'), palierSuivant: $('btn-palier-suivant'), rejouer: $('btn-rejouer'),
  statCorrect: $('stat-correct'), statTotal: $('stat-total'),
  statSerie: $('stat-serie'), statRecord: $('stat-record'),
  jaugeBarre: $('jauge-barre'), jaugeTxt: $('jauge-txt'),
};

const etat = {
  mode: 'libre', // 'libre' | 'parcours'
  min: 1, max: 100, nombre: null,
  correct: 0, total: 0, serie: 0, record: 0,
  phase: 'saisie', // 'saisie' | 'resolu'
  minuteur: null,
  palier: 0,       // index du palier en cours
  file: [],        // nombres restants du palier, dans l'ordre
  faits: 0,        // nombres du palier déjà écrits juste
  fautes: 0,       // fautes commises dans ce palier
  aRevoir: new Set(),
};

// localStorage peut lever (navigation privée, cookies bloqués) : on encaisse.
const memoire = {
  lire(cle, defaut = 0) {
    try { return Number(localStorage.getItem(cle)) || defaut; } catch { return defaut; }
  },
  ecrire(cle, valeur) {
    try { localStorage.setItem(cle, String(valeur)); } catch { /* tant pis */ }
  },
  effacer(cle) {
    try { localStorage.removeItem(cle); } catch { /* tant pis */ }
  },
};

const CLE_RECORD = 'chiffrator.record';
const CLE_PARCOURS = 'chiffrator.parcours'; // nombre de paliers bouclés

/* ---------- Choix du mode ---------- */

function choisirMode(mode) {
  etat.mode = mode;
  el.modeLibre.classList.toggle('actif', mode === 'libre');
  el.modeParcours.classList.toggle('actif', mode === 'parcours');
  el.blocLibre.hidden = mode !== 'libre';
  el.blocParcours.hidden = mode !== 'parcours';
  if (mode === 'parcours') dessinerPaliers();
}

el.modeLibre.addEventListener('click', () => choisirMode('libre'));
el.modeParcours.addEventListener('click', () => choisirMode('parcours'));

/* ---------- Écran d'accueil : mode aléatoire ---------- */

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

function remiseAZeroStats() {
  etat.correct = 0;
  etat.total = 0;
  etat.serie = 0;
  etat.record = memoire.lire(CLE_RECORD);
}

function ouvrirJeu() {
  el.accueil.hidden = true;
  el.jeu.hidden = false;
  el.carteJeu.hidden = false;
  el.carteFin.hidden = true;
  majStats();
}

function demarrer() {
  const { min, max } = bornes();
  etat.mode = 'libre';
  etat.min = min;
  etat.max = max;
  el.min.value = String(min);
  el.max.value = String(max);
  remiseAZeroStats();
  el.bandeau.hidden = true;
  el.retour.textContent = '← Changer la plage';
  el.plageActive.textContent = `Plage : ${formatDigits(min)} → ${formatDigits(max)}`;
  ouvrirJeu();
  nouveauNombre();
}

/* ---------- Écran d'accueil : mode parcours ---------- */

const paliersBoucles = () => Math.min(memoire.lire(CLE_PARCOURS), PALIERS.length);

function dessinerPaliers() {
  const boucles = paliersBoucles();
  el.paliers.innerHTML = '';
  PALIERS.forEach((palier, i) => {
    const fini = i < boucles;
    const verrouille = i > boucles; // on n'ouvre que le palier suivant
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `palier${fini ? ' fini' : ''}${verrouille ? ' verrouille' : ''}`;
    b.disabled = verrouille;
    b.innerHTML = `
      <span class="palier-num">${i + 1}</span>
      <span class="palier-corps">
        <span class="palier-nom"></span>
        <span class="palier-info"></span>
      </span>
      <span class="palier-etat">${fini ? '✓' : verrouille ? '🔒' : '▶'}</span>`;
    b.querySelector('.palier-nom').textContent = palier.titre;
    b.querySelector('.palier-info').textContent =
      `${palier.nombres.length} nombres · ${palier.resume}`;
    if (verrouille) b.title = 'Boucle le palier précédent pour l\'ouvrir';
    if (!verrouille) b.addEventListener('click', () => demarrerPalier(i));
    el.paliers.appendChild(b);
  });
}

el.oublier.addEventListener('click', () => {
  if (!window.confirm('Effacer la progression du parcours ?')) return;
  memoire.effacer(CLE_PARCOURS);
  dessinerPaliers();
});

function demarrerPalier(index) {
  const palier = PALIERS[index];
  etat.mode = 'parcours';
  etat.palier = index;
  etat.file = [...palier.nombres]; // l'ordre de la liste EST la difficulté
  etat.faits = 0;
  etat.fautes = 0;
  etat.aRevoir = new Set();
  etat.nombre = null;
  remiseAZeroStats();
  el.bandeau.hidden = false;
  el.palierTitre.textContent = `Palier ${index + 1} · ${palier.titre}`;
  el.palierResume.textContent = palier.resume;
  el.retour.textContent = '← Choisir un palier';
  el.plageActive.textContent = `Parcours — palier ${index + 1} sur ${PALIERS.length}`;
  majPalier();
  ouvrirJeu();
  nouveauNombre();
}

function majPalier() {
  const total = PALIERS[etat.palier].nombres.length;
  el.palierCompte.textContent = `${etat.faits}/${total}`;
  el.palierBarre.style.width = `${Math.round((etat.faits / total) * 100)}%`;
}

el.retour.addEventListener('click', () => {
  clearTimeout(etat.minuteur);
  el.jeu.hidden = true;
  el.accueil.hidden = false;
  choisirMode(etat.mode);
  marquerPreset();
});

/* ---------- Tirage par tranche de longueur (mode aléatoire) ---------- */

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
  let n;
  if (etat.mode === 'parcours') {
    if (etat.file.length === 0) { finirPalier(); return; }
    n = etat.file.shift();
  } else {
    n = tirer(etat.min, etat.max);
    if (n === etat.nombre && etat.max - etat.min > 0) n = tirer(etat.min, etat.max);
  }
  etat.nombre = n;
  etat.phase = 'saisie';
  el.consigne.textContent = etat.aRevoir.has(n)
    ? 'Celui-là t\'a eu — on le refait'
    : 'Écris ce nombre en toutes lettres';
  el.nombre.textContent = formatDigits(n);
  el.verdict.innerHTML = '';
  el.carteJeu.classList.remove('faux', 'juste');
  el.reponse.value = '';
  el.reponse.disabled = false;
  el.tiret.disabled = false;
  el.reveler.disabled = false;
  el.valider.textContent = 'Vérifier';
  el.valider.classList.remove('suivant');
  el.reponse.focus();
}

// En parcours, un nombre raté repasse dans la file : il faut l'écrire juste pour finir.
function remettreDansLaFile(n) {
  if (etat.mode !== 'parcours') return;
  etat.aRevoir.add(n);
  etat.file.splice(Math.min(RETOUR_FILE, etat.file.length), 0, n);
}

/* ---------- Correction ---------- */

function bloquerSaisie() {
  etat.phase = 'resolu';
  el.reponse.disabled = true;
  el.tiret.disabled = true;
  el.reveler.disabled = true;
}

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
      memoire.ecrire(CLE_RECORD, etat.record);
    }
    if (etat.mode === 'parcours') { etat.faits += 1; majPalier(); }
    bloquerSaisie();
    el.carteJeu.classList.add('juste');
    el.verdict.innerHTML = `<p class="bandeau ok">${bravo()}</p>`;
    majStats(true);
    etat.minuteur = setTimeout(nouveauNombre, DELAI_SUIVANT);
    return;
  }

  etat.serie = 0;
  etat.fautes += 1;
  remettreDansLaFile(etat.nombre);
  afficherErreur(normalize(saisie), res.expected, res.firstBadIndex);
  majStats();
}

const BRAVOS = ['Bravo ! 🎉', 'Parfait ! ✨', 'Sans faute ! 💯', 'Excellent ! 🚀', 'Nickel ! 🌟'];
const bravo = () => BRAVOS[Math.floor(Math.random() * BRAVOS.length)];

function afficherErreur(saisie, attendu, indexFaute) {
  bloquerSaisie();
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
  etat.fautes += 1;
  remettreDansLaFile(etat.nombre);
  bloquerSaisie();
  el.carteJeu.classList.add('faux');
  el.verdict.innerHTML = `
    <p class="bandeau ko">Réponse révélée 👀</p>
    <p class="ligne"><span class="ligne-lib">La bonne orthographe</span><span class="bonne">${echapper(numberToFrenchWords(etat.nombre))}</span></p>`;
  el.valider.textContent = 'Nombre suivant →';
  el.valider.classList.add('suivant');
  majStats();
}

/* ---------- Fin de palier ---------- */

function finirPalier() {
  const dernier = etat.palier === PALIERS.length - 1;
  const total = PALIERS[etat.palier].nombres.length;
  etat.phase = 'resolu';
  clearTimeout(etat.minuteur);
  if (etat.palier + 1 > paliersBoucles()) memoire.ecrire(CLE_PARCOURS, etat.palier + 1);

  el.carteJeu.hidden = true;
  el.carteFin.hidden = false;
  el.finEmoji.textContent = dernier ? '🏆' : '🏅';
  el.finTitre.textContent = dernier ? 'Parcours terminé !' : 'Palier bouclé !';
  el.finDetail.textContent = etat.fautes === 0
    ? `${total} nombres, aucune faute. Impressionnant.`
    : `${total} nombres écrits juste, en ${etat.total} réponses (${etat.fautes} ${etat.fautes > 1 ? 'fautes' : 'faute'}).`;
  el.palierSuivant.hidden = dernier;
  el.palierSuivant.focus();
}

el.palierSuivant.addEventListener('click', () => {
  if (etat.palier + 1 < PALIERS.length) demarrerPalier(etat.palier + 1);
});
el.rejouer.addEventListener('click', () => demarrerPalier(etat.palier));

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

/* ---------- Touche « - » ---------- */

// Insère un trait d'union à l'endroit du curseur, sans changer de clavier.
function insererTiret() {
  if (el.reponse.disabled) return;
  const valeur = el.reponse.value;
  const debut = el.reponse.selectionStart ?? valeur.length;
  const fin = el.reponse.selectionEnd ?? debut;
  el.reponse.value = `${valeur.slice(0, debut)}-${valeur.slice(fin)}`;
  el.reponse.focus();
  el.reponse.setSelectionRange(debut + 1, debut + 1);
}

// mousedown : on garde le focus (et donc le curseur) dans le champ.
el.tiret.addEventListener('mousedown', (e) => e.preventDefault());
el.tiret.addEventListener('click', insererTiret);

/* ---------- Entrées ---------- */

el.valider.addEventListener('click', valider);
el.reveler.addEventListener('click', reveler);
el.reponse.addEventListener('keydown', (e) => { if (e.key === 'Enter') valider(); });
// Entrée passe au nombre suivant même si le champ n'a plus le focus.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || el.jeu.hidden || etat.phase !== 'resolu') return;
  if (e.target === el.valider || e.target === el.reponse) return; // déjà géré
  if (!el.carteFin.hidden) return;                                // fin de palier
  clearTimeout(etat.minuteur);
  nouveauNombre();
});
