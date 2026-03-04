// Real BATL league player data for 2026 season
// Source: notes/mix-doubles-data-2026.md
// Email convention: firstname@batl (collisions: first name gets plain, duplicates get last initial suffix)

// ============================================================
// MALE PLAYERS (18)
// ============================================================
// DOBs are approximate, clustered to populate age categories:
//   30+ (ALL_AGES): all players qualify
//   35+: born 1991 or earlier (age >= 35 in 2026)
//   40+: born 1986 or earlier (age >= 40 in 2026)
//   50+: born 1976 or earlier (age >= 50 in 2026)
//
// Distribution goal: ~14 qualify for 35+, ~10 for 40+, ~4-5 for 50+

export const malePlayers = [
  { name: 'Tomas Zaprazny',       email: 'tomas@batl',   gender: 'MEN', birthDate: new Date('1982-04-12') }, // age 43, 40+
  { name: 'Laco Stevko',          email: 'laco@batl',    gender: 'MEN', birthDate: new Date('1978-09-05') }, // age 47, 40+
  { name: 'Erich Siebenstich ml.', email: 'erich@batl',  gender: 'MEN', birthDate: new Date('1985-11-22') }, // age 40, 40+
  { name: 'Juraj Macho',          email: 'juraj@batl',   gender: 'MEN', birthDate: new Date('1987-03-30') }, // age 38, 35+
  { name: 'Patrik Kardos',        email: 'patrik@batl',  gender: 'MEN', birthDate: new Date('1989-06-15') }, // age 36, 35+
  { name: 'Zdeno Forgac',         email: 'zdeno@batl',   gender: 'MEN', birthDate: new Date('1975-08-20') }, // age 50, 50+
  { name: 'Michal Pomsar',        email: 'michal@batl',  gender: 'MEN', birthDate: new Date('1983-01-08') }, // age 43, 40+
  { name: 'Peter Fuchs',          email: 'peter@batl',   gender: 'MEN', birthDate: new Date('1974-12-03') }, // age 51, 50+
  { name: 'Marcel Sramko',        email: 'marcel@batl',  gender: 'MEN', birthDate: new Date('1988-07-19') }, // age 37, 35+
  { name: 'Miro Uhliar',          email: 'miro@batl',    gender: 'MEN', birthDate: new Date('1984-02-14') }, // age 42, 40+
  { name: 'Roman Rummel',         email: 'roman@batl',   gender: 'MEN', birthDate: new Date('1973-05-28') }, // age 52, 50+
  { name: 'Vlado Zvonar',         email: 'vlado@batl',   gender: 'MEN', birthDate: new Date('1980-10-17') }, // age 45, 40+
  { name: 'Roman Smahovsky',      email: 'roman.s@batl', gender: 'MEN', birthDate: new Date('1990-08-04') }, // age 35, 35+
  { name: 'Vlado Fatura',         email: 'vlado.f@batl', gender: 'MEN', birthDate: new Date('1981-03-22') }, // age 44, 40+
  { name: 'Vlado Koco',           email: 'vlado.k@batl', gender: 'MEN', birthDate: new Date('1986-11-09') }, // age 39, 35+
  { name: 'Rene Parak',           email: 'rene@batl',    gender: 'MEN', birthDate: new Date('1979-07-01') }, // age 46, 40+
  { name: 'Marcel Pesko',         email: 'marcel.p@batl',gender: 'MEN', birthDate: new Date('1972-04-16') }, // age 53, 50+
  { name: 'Miro Petrech',         email: 'miro.p@batl',  gender: 'MEN', birthDate: new Date('1991-09-27') }, // age 34, 35+ borderline
];

// ============================================================
// FEMALE PLAYERS (16)
// ============================================================
// DOBs approximate, spread across age groups for category coverage

export const femalePlayers = [
  { name: 'Dominika Zaprazna',   email: 'dominika@batl', gender: 'WOMEN', birthDate: new Date('1986-05-20') }, // age 39, 35+
  { name: 'Simona Nestarcova',   email: 'simona@batl',   gender: 'WOMEN', birthDate: new Date('1983-11-14') }, // age 42, 40+
  { name: 'Lucia Siebenstichova',email: 'lucia@batl',    gender: 'WOMEN', birthDate: new Date('1987-08-09') }, // age 38, 35+
  { name: 'Bianka Kestlerova',   email: 'bianka@batl',   gender: 'WOMEN', birthDate: new Date('1990-02-28') }, // age 35, 35+
  { name: 'Augusta Tobiasova',   email: 'augusta@batl',  gender: 'WOMEN', birthDate: new Date('1988-06-03') }, // age 37, 35+
  { name: 'Karolina Strakova',   email: 'karolina@batl', gender: 'WOMEN', birthDate: new Date('1985-09-17') }, // age 40, 40+
  { name: 'Danka Kleinova',      email: 'danka@batl',    gender: 'WOMEN', birthDate: new Date('1980-12-22') }, // age 45, 40+
  { name: 'Milka Kraskova',      email: 'milka@batl',    gender: 'WOMEN', birthDate: new Date('1984-04-07') }, // age 41, 40+
  { name: 'Daska Sojkova',       email: 'daska@batl',    gender: 'WOMEN', birthDate: new Date('1989-07-30') }, // age 36, 35+
  { name: 'Henrieta Absolonova', email: 'henrieta@batl', gender: 'WOMEN', birthDate: new Date('1982-01-15') }, // age 44, 40+
  { name: 'Kika Gardonova',      email: 'kika@batl',     gender: 'WOMEN', birthDate: new Date('1991-10-11') }, // age 34, ALL_AGES
  { name: 'Zuzka Oravkinova',    email: 'zuzka@batl',    gender: 'WOMEN', birthDate: new Date('1986-03-25') }, // age 39, 35+
  { name: 'Lenka Cubonova',      email: 'lenka@batl',    gender: 'WOMEN', birthDate: new Date('1978-08-18') }, // age 47, 40+
  { name: 'Denisa Faturova',     email: 'denisa@batl',   gender: 'WOMEN', birthDate: new Date('1983-06-06') }, // age 42, 40+
  { name: 'Hela Motlova',        email: 'hela@batl',     gender: 'WOMEN', birthDate: new Date('1987-11-29') }, // age 38, 35+
  { name: 'Danka Peskova',       email: 'danka.p@batl',  gender: 'WOMEN', birthDate: new Date('1975-02-10') }, // age 51, 50+
];

// ============================================================
// MIXED DOUBLES PAIRS (18)
// ============================================================
// maleKey/femaleKey = email of the player (used to look up created profiles)
// Note: Kleinova (danka@batl) appears in pairs 12 and 16 — this is intentional
// Note: Sojkova (daska@batl) appears in pairs 13 and 18 — this is intentional
// The DoublesPair model has no constraint preventing this

export const mixedPairs = [
  { maleKey: 'tomas@batl',    femaleKey: 'dominika@batl' }, //  1. Zaprazny / Zaprazna
  { maleKey: 'laco@batl',     femaleKey: 'simona@batl'   }, //  2. Stevko / Nestarcova
  { maleKey: 'erich@batl',    femaleKey: 'lucia@batl'    }, //  3. Siebenstich / Siebenstichova
  { maleKey: 'juraj@batl',    femaleKey: 'bianka@batl'   }, //  4. Macho / Kestlerova
  { maleKey: 'patrik@batl',   femaleKey: 'augusta@batl'  }, //  5. Kardos / Tobiasova
  { maleKey: 'zdeno@batl',    femaleKey: 'karolina@batl' }, //  6. Forgac / Strakova
  { maleKey: 'michal@batl',   femaleKey: 'milka@batl'    }, //  7. Pomsar / Kraskova
  { maleKey: 'peter@batl',    femaleKey: 'henrieta@batl' }, //  8. Fuchs / Absolonova
  { maleKey: 'marcel@batl',   femaleKey: 'zuzka@batl'    }, //  9. Sramko / Oravkinova
  { maleKey: 'miro@batl',     femaleKey: 'kika@batl'     }, // 10. Uhliar / Gardonova
  { maleKey: 'roman@batl',    femaleKey: 'lenka@batl'    }, // 11. Rummel / Cubonova
  { maleKey: 'vlado@batl',    femaleKey: 'danka@batl'    }, // 12. Zvonar / Kleinova
  { maleKey: 'roman.s@batl',  femaleKey: 'daska@batl'    }, // 13. Smahovsky / Sojkova
  { maleKey: 'vlado.f@batl',  femaleKey: 'denisa@batl'   }, // 14. Fatura / Faturova
  { maleKey: 'vlado.k@batl',  femaleKey: 'hela@batl'     }, // 15. Koco / Motlova
  { maleKey: 'rene@batl',     femaleKey: 'danka@batl'    }, // 16. Parak / Kleinova (Kleinova in 2 pairs)
  { maleKey: 'marcel.p@batl', femaleKey: 'danka.p@batl'  }, // 17. Pesko / Peskova
  { maleKey: 'miro.p@batl',   femaleKey: 'daska@batl'    }, // 18. Petrech / Sojkova (Sojkova in 2 pairs)
];

// ============================================================
// ACCOUNT USERS (2)
// ============================================================
// Only Erich and Rene have user accounts; all other real players are unlinked profiles

export const accountUsers = [
  { email: 'erich@batl', role: 'ADMIN',     password: 'Erich123!' },
  { email: 'rene@batl',  role: 'ORGANIZER', password: 'Rene123!'  },
];
