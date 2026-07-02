import { createStitches } from '@stitches/react'

const darkGray = {
  gray1: 'hsl(0 0% 8.5%)',
  gray2: 'hsl(0 0% 11.0%)',
  gray3: 'hsl(0 0% 13.6%)',
  gray4: 'hsl(0 0% 15.8%)',
  gray5: 'hsl(0 0% 17.9%)',
  gray6: 'hsl(0 0% 20.5%)',
  gray7: 'hsl(0 0% 24.3%)',
  gray8: 'hsl(0 0% 31.2%)',
  gray9: 'hsl(0 0% 43.9%)',
  gray10: 'hsl(0 0% 49.4%)',
  gray11: 'hsl(0 0% 62.8%)',
  gray12: 'hsl(0 0% 93.0%)',
}

const lightGray = {
  gray1: 'hsl(0 0% 99.0%)',
  gray2: 'hsl(0 0% 97.3%)',
  gray3: 'hsl(0 0% 95.1%)',
  gray4: 'hsl(0 0% 93.0%)',
  gray5: 'hsl(0 0% 90.9%)',
  gray6: 'hsl(0 0% 88.7%)',
  gray7: 'hsl(0 0% 85.8%)',
  gray8: 'hsl(0 0% 78.0%)',
  gray9: 'hsl(0 0% 56.1%)',
  gray10: 'hsl(0 0% 52.3%)',
  gray11: 'hsl(0 0% 43.5%)',
  gray12: 'hsl(0 0% 9.0%)',
}

const darkGrayA = {
  grayA1: 'hsl(0 0% 100% / 0)',
  grayA2: 'hsl(0 0% 100% / 0.026)',
  grayA3: 'hsl(0 0% 100% / 0.056)',
  grayA4: 'hsl(0 0% 100% / 0.077)',
  grayA5: 'hsl(0 0% 100% / 0.103)',
  grayA6: 'hsl(0 0% 100% / 0.129)',
  grayA7: 'hsl(0 0% 100% / 0.172)',
  grayA8: 'hsl(0 0% 100% / 0.249)',
  grayA9: 'hsl(0 0% 100% / 0.386)',
  grayA10: 'hsl(0 0% 100% / 0.446)',
  grayA11: 'hsl(0 0% 100% / 0.592)',
  grayA12: 'hsl(0 0% 100% / 0.923)',
}

const lightGrayA = {
  grayA1: 'hsl(0 0% 0% / 0.012)',
  grayA2: 'hsl(0 0% 0% / 0.027)',
  grayA3: 'hsl(0 0% 0% / 0.047)',
  grayA4: 'hsl(0 0% 0% / 0.071)',
  grayA5: 'hsl(0 0% 0% / 0.090)',
  grayA6: 'hsl(0 0% 0% / 0.114)',
  grayA7: 'hsl(0 0% 0% / 0.141)',
  grayA8: 'hsl(0 0% 0% / 0.220)',
  grayA9: 'hsl(0 0% 0% / 0.439)',
  grayA10: 'hsl(0 0% 0% / 0.478)',
  grayA11: 'hsl(0 0% 0% / 0.565)',
  grayA12: 'hsl(0 0% 0% / 0.910)',
}

export const {
  styled,
  css,
  globalCss,
  keyframes,
  getCssText,
  theme,
  createTheme,
  config,
} = createStitches({
  theme: {
    colors: {
      // Default :root = light — darkTheme class overrides to dark
      ...lightGray,
      ...lightGrayA,
      bg: '#FFF',
      lowContrast: '#FFFFFF',
      highContrast: 'black',
    },
    fonts: {
      body: 'X, -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
      mono: 'Menlo, monospace',
    },
    space: {
      1: '8px',
      2: '16px',
      3: '24px',
      4: '32px',
      5: '40px',
      6: '48px',
      7: '56px',
      8: '64px',
      9: '72px',
      10: '80px',
      11: '88px',
    },
    fontWeights: {
      400: '400',
      500: '500',
      600: '600',
      700: '700',
      800: '800',
    },
    lineHeights: {
      12: '12px',
      16: '16px',
      20: '20px',
      24: '24px',
      32: '32px',
      40: '40px',
      48: '48px',
      56: '56px',
    },
    fontSizes: {
      10: '10px',
      12: '12px',
      14: '14px',
      16: '16px',
      20: '20px',
      24: '24px',
      32: '32px',
      40: '40px',
      48: '48px',
    },
    radii: {
      1: '4px',
      2: '8px',
      3: '16px',
      round: '9999px',
    },
    shadows: {
      small: '0 5px 10px rgba(0, 0, 0, 0.12)',
      medium: '0 8px 30px rgba(0, 0, 0, 0.12)',
      large: '0 30px 60px rgba(0, 0, 0, 0.12)',
    },
    transitions: {
      snappy: 'cubic-bezier(.2, .8, .2, 1)',
    },
  },
  media: {
    mobile: '(max-width: 720px)',
    touch: '(hover: none)',
  },
  utils: {
    m: (v: string | number) => ({ margin: v }),
    mt: (v: string | number) => ({ marginTop: v }),
    mr: (v: string | number) => ({ marginRight: v }),
    mb: (v: string | number) => ({ marginBottom: v }),
    ml: (v: string | number) => ({ marginLeft: v }),
    mx: (v: string | number) => ({ marginLeft: v, marginRight: v }),
    my: (v: string | number) => ({ marginTop: v, marginBottom: v }),
    p: (v: string | number) => ({ padding: v }),
    pt: (v: string | number) => ({ paddingTop: v }),
    pr: (v: string | number) => ({ paddingRight: v }),
    pb: (v: string | number) => ({ paddingBottom: v }),
    pl: (v: string | number) => ({ paddingLeft: v }),
    px: (v: string | number) => ({ paddingLeft: v, paddingRight: v }),
    py: (v: string | number) => ({ paddingTop: v, paddingBottom: v }),
    size: (v: string | number) => ({ width: v, height: v }),
    ta: (v: string) => ({ textAlign: v }),
    fd: (v: string) => ({ flexDirection: v }),
    d: (v: string) => ({ display: v }),
    fw: (v: string) => ({ flexWrap: v }),
    ai: (v: string) => ({ alignItems: v }),
    ac: (v: string) => ({ alignContent: v }),
    jc: (v: string) => ({ justifyContent: v }),
    as: (v: string) => ({ alignSelf: v }),
    fg: (v: string | number) => ({ flexGrow: v }),
    fs: (v: string | number) => ({ flexShrink: v }),
    fb: (v: string) => ({ flexBasis: v }),
    bc: (v: string) => ({ backgroundColor: v }),
    br: (v: string | number) => ({ borderRadius: v }),
    bs: (v: string) => ({ boxShadow: v }),
    lh: (v: string | number) => ({ lineHeight: v }),
    ox: (v: string) => ({ overflowX: v }),
    oy: (v: string) => ({ overflowY: v }),
    truncate: () => ({
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
    }),
    us: (v: string) => ({ WebkitUserSelect: v, userSelect: v }),
    center: () => ({ display: 'flex', alignItems: 'center', justifyContent: 'center' }),
    focus: () => ({
      '$$focusColor': '$colors$gray9',
      '&:focus-visible': {
        outline: 0,
        boxShadow: 'inset 0 0 0 2px $$focusColor',
      },
    }),
  },
})

export const darkTheme = createTheme('dark', {
  colors: {
    ...darkGray,
    ...darkGrayA,
  },
})

export const globalStyles = globalCss({
  'html': {
    // Reserve the vertical scrollbar's space at all times so the centered
    // layout doesn't shift horizontally when the scrollbar appears/disappears
    // as async content and staggered entrance animations change page height.
    // No-op with macOS overlay scrollbars; fixes the left/right "shake" on
    // classic scrollbars (Windows, some Linux/Firefox setups).
    scrollbarGutter: 'stable',
    // Slow ease when the ink tokens swap to hues for "add some color". These
    // tokens are registered as typed <color> props (see components/ColorWash),
    // so the value itself interpolates and every text/icon consumer eases along.
    transition:
      '--colors-gray8 1.7s ease, --colors-gray9 1.7s ease, --colors-gray10 1.7s ease, --colors-gray11 1.7s ease, --colors-gray12 1.7s ease',
  },
  'body': {
    margin: 0,
    background: 'var(--colors-gray1)',
  },
  // "Add some color" — recolor only the foreground ink tokens (text + icons via
  // currentColor). Background tokens (gray1–7) are untouched, so the page stays
  // true white/black; hues are tuned to keep each token's rough lightness so
  // everything stays readable in both themes.
  '.colorized:not(.dark)': {
    '--colors-gray12': 'hsl(255 55% 33%)',
    '--colors-gray11': 'hsl(330 62% 44%)',
    '--colors-gray10': 'hsl(14 78% 46%)',
    '--colors-gray9':  'hsl(190 68% 36%)',
    '--colors-gray8':  'hsl(190 42% 56%)',
  },
  '.dark.colorized': {
    '--colors-gray12': 'hsl(255 90% 84%)',
    '--colors-gray11': 'hsl(330 85% 75%)',
    '--colors-gray10': 'hsl(14 90% 68%)',
    '--colors-gray9':  'hsl(190 80% 60%)',
    '--colors-gray8':  'hsl(190 48% 46%)',
  },
  '.hidden': { display: 'none' },
  '@font-face': [
    {
      fontFamily: 'X',
      fontWeight: 400,
      fontDisplay: 'optional',
      src: 'url(/X-Regular.woff2) format("woff2")',
    } as never,
    {
      fontFamily: 'X',
      fontWeight: 500,
      fontDisplay: 'optional',
      src: 'url(/X-Medium.woff2) format("woff2")',
    } as never,
  ],
  'h1, h2, h3, h4, h5, h6, p': { margin: 0 },
  'em': { fontFamily: 'Georgia, serif', fontSize: '17px' },
  'a': { color: 'inherit', textDecoration: 'none', cursor: 'pointer' },
  'ul': { padding: 0, listStyle: 'none' },
  'button, ul, ul li': { margin: 0 },
  'button': {
    padding: 0,
    background: 'transparent',
    fontFamily: 'var(--fonts-body)',
    border: 0,
  },
  '.grid': {
    '--gap': '8px',
    display: 'flex',
    marginLeft: 'calc(var(--gap) * -1)',
    width: 'auto',
    paddingRight: '8px',
    paddingLeft: '4px',
  },
  '.column': {
    paddingLeft: 'var(--gap)',
    backgroundClip: 'padding-box',
  },
  '.cursor-resizing-ew *': { cursor: 'ew-resize' },
  '.cursor-resizing-ew * *': { userSelect: 'none' },
  '.cursor-none *': { cursor: 'none' },
  '.cursor-none * *': { userSelect: 'none' },
  '.cursor-moving *': { cursor: 'move' },
  '.cursor-moving * *': { userSelect: 'none' },
  '.vh': {
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: '1px',
    overflow: 'hidden',
    position: 'absolute',
    whiteSpace: 'nowrap',
    width: '1px',
  },
})
