// Shared ASCII buddy art — extracted from the Claude Code /buddy command and used
// across the site (SignalField backdrop, /work line buddies, and the /play arcade).
// Each species has 3 animation frames × 5 lines of 12 chars.
// '·' is the eye placeholder — swap it at render time with a value from BUDDY_EYES.

export const BUDDY_EYES = ['·', '◉', '×', '°', '@', '✦'] as const

// prettier-ignore
export const BUDDY_BODIES: Record<string, string[][]> = {
  duck: [
    ['            ','    __      ','  <(·)___   ','   (  ._>   ','    `--\u00b4    '],
    ['            ','    __      ','  <(·)___   ','   (  ._>   ','    `--\u00b4~   '],
    ['            ','    __      ','  <(·)___   ','   (  .__>  ','    `--\u00b4    '],
  ],
  goose: [
    ['            ','     (·>    ','     ||     ','   _(__)_   ','    ^^^^    '],
    ['            ','    (·>     ','     ||     ','   _(__)_   ','    ^^^^    '],
    ['            ','     (·>>   ','     ||     ','   _(__)_   ','    ^^^^    '],
  ],
  cat: [
    ['            ','   /\\_/\\    ','  ( ·   ·)  ','  (  \u03c9  )   ','  (")_(")   '],
    ['            ','   /\\_/\\    ','  ( ·   ·)  ','  (  \u03c9  )   ','  (")_(")~  '],
    ['            ','   /\\-/\\    ','  ( ·   ·)  ','  (  \u03c9  )   ','  (")_(")   '],
  ],
  octopus: [
    ['            ','   .----.   ','  ( ·  · )  ','  (______)  ','  /\\/\\/\\/\\  '],
    ['            ','   .----.   ','  ( ·  · )  ','  (______)  ','  \\/\\/\\/\\/  '],
    ['     o      ','   .----.   ','  ( ·  · )  ','  (______)  ','  /\\/\\/\\/\\  '],
  ],
  owl: [
    ['            ','   /\\  /\\   ','  ((·)(·))  ','  (  ><  )  ','   `----\u00b4   '],
    ['            ','   /\\  /\\   ','  ((·)(·))  ','  (  ><  )  ','   .----.   '],
    ['            ','   /\\  /\\   ','  ((·)(-))  ','  (  ><  )  ','   `----\u00b4   '],
  ],
  penguin: [
    ['            ','  .---.     ','  (·>·)     ',' /(   )\\    ','  `---\u00b4     '],
    ['            ','  .---.     ','  (·>·)     ',' |(   )|    ','  `---\u00b4     '],
    ['  .---.     ','  (·>·)     ',' /(   )\\    ','  `---\u00b4     ','   ~ ~      '],
  ],
  turtle: [
    ['            ','   _,--._   ','  ( ·  · )  ',' /[______]\\ ','  ``    ``  '],
    ['            ','   _,--._   ','  ( ·  · )  ',' /[______]\\ ','   ``  ``   '],
    ['            ','   _,--._   ','  ( ·  · )  ',' /[======]\\ ','  ``    ``  '],
  ],
  snail: [
    ['            ',' ·    .--.  ','  \\  ( @ )  ','   \\_`--\u00b4   ','  ~~~~~~~   '],
    ['            ','  ·   .--.  ','  |  ( @ )  ','   \\_`--\u00b4   ','  ~~~~~~~   '],
    ['            ',' ·    .--.  ','  \\  ( @  ) ','   \\_`--\u00b4   ','   ~~~~~~   '],
  ],
  ghost: [
    ['            ','   .----.   ','  / ·  · \\  ','  |      |  ','  ~`~``~`~  '],
    ['            ','   .----.   ','  / ·  · \\  ','  |      |  ','  `~`~~`~`  '],
    ['    ~  ~    ','   .----.   ','  / ·  · \\  ','  |      |  ','  ~~`~~`~~  '],
  ],
  axolotl: [
    ['            ','}~(______)~{','}~(· .. ·)~{','  ( .--. )  ','  (_/  \\_)  '],
    ['            ','~}(______){~','~}(· .. ·){~','  ( .--. )  ','  (_/  \\_)  '],
    ['            ','}~(______)~{','}~(· .. ·)~{','  (  --  )  ','  ~_/  \\_~  '],
  ],
  capybara: [
    ['            ','  n______n  ',' ( ·    · ) ',' (   oo   ) ','  `------\u00b4  '],
    ['            ','  n______n  ',' ( ·    · ) ',' (   Oo   ) ','  `------\u00b4  '],
    ['    ~  ~    ','  u______n  ',' ( ·    · ) ',' (   oo   ) ','  `------\u00b4  '],
  ],
  cactus: [
    ['            ',' n  ____  n ',' | |·  ·| | ',' |_|    |_| ','   |    |   '],
    ['            ','    ____    ',' n |·  ·| n ',' |_|    |_| ','   |    |   '],
    [' n        n ',' |  ____  | ',' | |·  ·| | ',' |_|    |_| ','   |    |   '],
  ],
  robot: [
    ['            ','   .[||].   ','  [ ·  · ]  ','  [ ==== ]  ','  `------\u00b4  '],
    ['            ','   .[||].   ','  [ ·  · ]  ','  [ -==- ]  ','  `------\u00b4  '],
    ['     *      ','   .[||].   ','  [ ·  · ]  ','  [ ==== ]  ','  `------\u00b4  '],
  ],
  rabbit: [
    ['            ','   (\\__/)   ','  ( ·  · )  ',' =(  ..  )= ','  (")__(")  '],
    ['            ','   (|__/)   ','  ( ·  · )  ',' =(  ..  )= ','  (")__(")  '],
    ['            ','   (\\__/)   ','  ( ·  · )  ',' =( .  . )= ','  (")__(")  '],
  ],
  mushroom: [
    ['            ',' .-o-OO-o-. ','(__________)','   |·  ·|   ','   |____|   '],
    ['            ',' .-O-oo-O-. ','(__________)','   |·  ·|   ','   |____|   '],
    ['   . o  .   ',' .-o-OO-o-. ','(__________)','   |·  ·|   ','   |____|   '],
  ],
}

export const BUDDY_NAMES = Object.keys(BUDDY_BODIES)

// Mirror a single ASCII line so a buddy can face the other way.
export function mirrorLine(line: string): string {
  return line.split('').reverse().map(c => {
    switch (c) {
      case '(': return ')'
      case ')': return '('
      case '[': return ']'
      case ']': return '['
      case '{': return '}'
      case '}': return '{'
      case '<': return '>'
      case '>': return '<'
      case '/': return '\\'
      case '\\': return '/'
      default:  return c
    }
  }).join('')
}

// Bounding box (in character cells) of the non-space glyphs in a frame.
export function buddyBounds(frame: string[]): { minCol: number; maxCol: number; minRow: number; maxRow: number } {
  let minCol = Infinity, maxCol = -Infinity, minRow = Infinity, maxRow = -Infinity
  for (let r = 0; r < frame.length; r++) {
    for (let c = 0; c < frame[r].length; c++) {
      if (frame[r][c] !== ' ') {
        if (c < minCol) minCol = c
        if (c > maxCol) maxCol = c
        if (r < minRow) minRow = r
        if (r > maxRow) maxRow = r
      }
    }
  }
  if (minCol === Infinity) { minCol = 0; maxCol = 0; minRow = 0; maxRow = 0 }
  return { minCol, maxCol, minRow, maxRow }
}
