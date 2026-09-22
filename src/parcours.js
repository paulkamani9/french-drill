// Parcours : une liste fixe de nombres pièges, du plus simple au plus retors.
// Rien n'est tiré au hasard ici — l'ordre est la difficulté.

export const PALIERS = [
  {
    titre: 'Les dizaines pièges',
    resume: '« et » ou trait d\'union ? Et le -s de quatre-vingts.',
    nombres: [21, 22, 31, 41, 51, 61, 70, 71, 72, 76, 77, 79, 80, 81, 90, 91, 95, 99],
  },
  {
    titre: 'Les centaines',
    resume: 'Le -s de « cent » ne survit qu\'en fin de nombre.',
    nombres: [100, 101, 171, 180, 181, 200, 201, 230, 280, 300, 380, 500, 571, 700, 780, 971, 999],
  },
  {
    titre: 'Les milliers',
    resume: '« mille » est invariable, et fait tomber le -s de ce qui le précède.',
    nombres: [1000, 1001, 1021, 1080, 1100, 1200, 2000, 2080, 21000, 71000, 80000,
      80080, 100000, 200000, 280000, 300000, 999999],
  },
  {
    titre: 'Les millions',
    resume: '« million » est un nom : le -s reste devant lui, et il s\'accorde.',
    nombres: [1000000, 1000001, 1000080, 1001000, 2000000, 2080000, 21000000, 71000000,
      80000000, 80000080, 100000000, 200000000, 280000000, 999000000],
  },
  {
    titre: 'Le grand final',
    resume: 'Tous les pièges dans le même nombre.',
    nombres: [71071, 91091, 180081, 280280, 1234567, 71000071, 80080080, 91000091,
      200080200, 999999999, 1000000000],
  },
];

export const TOTAL_NOMBRES = PALIERS.reduce((n, p) => n + p.nombres.length, 0);
