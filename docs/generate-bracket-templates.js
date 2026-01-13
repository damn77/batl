// Script to generate bracket-templates-all.json from the PDF definitions
import fs from 'fs';

// Load the encoding map
const templateMap = JSON.parse(fs.readFileSync('./bracket-templates.json', 'utf8'));
const encodingMap = {};
templateMap.forEach(item => {
  encodingMap[item.key] = item.value;
});

// Player count definitions from PDF (Príloha č. 1b - pages 47-49)
const definitions = {
  17: '9a-8',
  18: '9a-9b',
  19: '9a-10b',
  20: '10c-10b',
  21: '11a-10b',
  22: '11a-11b',
  23: '11a-12a',
  24: '12a-12a',
  25: '13a-12a',
  26: '13a-13b',
  27: '13a-14a',
  28: '14b-14a',
  29: '15-14a',
  30: '15-15a',
  31: '15-16',
  32: '16-16',
  33: '9a-8-8-8',
  34: '9a-8-8-9b',
  35: '9a-8-9b-9b',
  36: '9a-9a-9b-9b',
  37: '9a-10a-9b-9b',
  38: '9a-10a-10a-9b',
  39: '9a-10a-10a-10a',
  40: '10a-10a-10a-10a',
  41: '11a-10a-10a-10a',
  42: '11a-10a-10a-11b',
  43: '11a-10a-11b-11b',
  44: '11a-11a-11b-11b',
  45: '11a-12a-11b-11b',
  46: '11a-12a-12a-11b',
  47: '11a-12a-12a-12a',
  48: '12a-12a-12a-12a',
  49: '13a-12a-12a-12a',
  50: '13a-12a-12a-13b',
  51: '13a-12a-13b-13b',
  52: '13a-13a-13b-13b',
  53: '13a-14-13b-13b',
  54: '13a-14-14-13b',
  55: '13a-14-14-14',
  56: '14-14-14-14',
  57: '15-14-14-14',
  58: '15-14-14-15a',
  59: '15-14-15a-15a',
  60: '15-15-15a-15a',
  61: '15-16-15a-15a',
  62: '15-16-16-15a',
  63: '15-16-16-16',
  64: '16-16-16-16',
  65: '9a-8-8-8-8-8-8-8',
  66: '9a-8-8-8-8-8-8-9b',
  67: '9a-8-8-8-8-9b-8-9b',
  68: '9a-8-9a-8-8-9b-8-9b',
  69: '9a-8-9a-9b-8-9b-8-9b',
  70: '9a-8-9a-9b-9a-9b-8-9b',
  71: '9a-8-9a-9b-9a-9b-9a-9b',
  72: '9a-9b-9a-9b-9a-9b-9a-9b',
  73: '9a-10a-9a-9b-9a-9b-9a-9b',
  74: '9a-10a-9a-9b-9a-9b-10a-9b',
  75: '9a-10a-9a-9b-10a-9b-10a-9b',
  76: '9a-10a-9a-10a-10a-9b-10a-9b',
  77: '9a-10a-10a-10a-10a-9b-10a-9b',
  78: '9a-10a-10a-10a-10a-10a-10a-9b',
  79: '9a-10a-10a-10a-10a-10a-10a-10a',
  80: '10a-10a-10a-10a-10a-10a-10a-10a',
  81: '11a-10a-10a-10a-10a-10a-10a-10a',
  82: '11a-10a-10a-10a-10a-10a-10a-11b',
  83: '11a-10a-10a-10a-10a-11b-10a-11b',
  84: '11a-10a-11a-10a-10a-11b-10a-11b',
  85: '11a-10a-11a-11b-10a-11b-10a-11b',
  86: '11a-10a-11a-11b-11a-11b-10a-11b',
  87: '11a-10a-11a-11b-11a-11b-11a-11b',
  88: '11a-11b-11a-11b-11a-11b-11a-11b',
  89: '11a-12a-11a-11b-11a-11b-11a-11b',
  90: '11a-12a-11a-11b-11a-11b-12a-11b',
  91: '11a-12a-11a-11b-12a-11b-12a-11b',
  92: '11a-12a-11a-12a-12a-11b-12a-11b',
  93: '11a-12a-12a-12a-12a-11b-12a-11b',
  94: '11a-12a-12a-12a-12a-12a-12a-11b',
  95: '11a-12a-12a-12a-12a-12a-12a-12a',
  96: '12a-12a-12a-12a-12a-12a-12a-12a',
  97: '13a-12a-12a-12a-12a-12a-12a-12a',
  98: '13a-12a-12a-12a-12a-12a-12a-13b',
  99: '13a-12a-12a-12a-12a-13b-12a-13b',
  100: '13a-12a-13a-12a-12a-13b-12a-13b',
  101: '13a-12a-13a-13b-12a-13b-12a-13b',
  102: '13a-12a-13a-13b-13a-13b-12a-13b',
  103: '13a-12a-13a-13b-13a-13b-13a-13b',
  104: '13a-13b-13a-13b-13a-13b-13a-13b',
  105: '13a-14-13a-13b-13a-13b-13a-13b',
  106: '13a-14-13a-13b-13a-13b-14-13b',
  107: '13a-14-13a-13b-14-13b-14-13b',
  108: '13a-14-13a-14-14-13b-14-13b',
  109: '13a-14-14-14-14-13b-14-13b',
  110: '13a-14-14-14-14-14-14-13b',
  111: '13a-14-14-14-14-14-14-14',
  112: '14-14-14-14-14-14-14-14',
  113: '15-14-14-14-14-14-14-14',
  114: '15-14-14-14-14-14-14-15a',
  115: '15-14-14-14-14-15a-14-15a',
  116: '15-14-15-14-14-15a-14-15a',
  117: '15-14-15-15a-14-15a-14-15a',
  118: '15-14-15-15a-15-15a-14-15a',
  119: '15-14-15-15a-15-15a-15-15a',
  120: '15-15a-15-15a-15a-15a-15-15a',
  121: '15-16-15-15a-15-15a-15-15a',
  122: '15-16-15-15a-15-15a-16-15a',
  123: '15-16-15-15a-16-15a-16-15a',
  124: '15-16-15-16-16-15a-16-15a',
  125: '15a-16-16-16-16-15a-16-15a',
  126: '15-16-16-16-16-16-16-15a',
  127: '15-16-16-16-16-16-16-16',
  128: '16-16-16-16-16-16-16-16',
};

// Convert definitions to bracket patterns
const result = [];
for (const [playerCount, code] of Object.entries(definitions)) {
  const parts = code.split('-');
  const numPlayers = parseInt(playerCount);

  // Determine how many bits each section should be
  // 17-32: 2 sections of 8 bits = 16 bits total
  // 33-64: 4 sections of 16 bits = 64 bits total (but use 8-bit patterns)
  // 65-128: 8 sections of 16 bits = 128 bits total (but use 8-bit patterns)
  let sectionBits;
  if (numPlayers <= 32) {
    sectionBits = 8; // Each section is 8 bits
  } else if (numPlayers <= 64) {
    sectionBits = 16; // Each section is 16 bits
  } else {
    sectionBits = 16; // Each section is 16 bits
  }

  const binaryParts = parts.map(key => {
    if (!encodingMap[key]) {
      console.error(`Missing encoding for key: ${key}`);
      return null;
    }

    let pattern = encodingMap[key];

    // For player counts 17-32, if key is "16", use 8 bits of all zeros (no byes, full section)
    if (numPlayers <= 32 && key === '16') {
      pattern = '0000 0000'; // 8-bit full section (no byes)
    }

    return pattern;
  });

  if (binaryParts.includes(null)) {
    console.error(`Skipping player count ${playerCount} due to missing encoding`);
    continue;
  }

  const value = binaryParts.join(' ');
  result.push({
    key: playerCount,
    value: value
  });
}

// Write to file
fs.writeFileSync(
  './bracket-templates-all.json',
  JSON.stringify(result, null, 4) + '\n',
  'utf8'
);

console.log(`✅ Generated ${result.length} bracket templates (17-128 players)`);
console.log(`Written to: bracket-templates-all.json`);
