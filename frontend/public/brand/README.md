# Bryant University brand assets

Replace each placeholder SVG in this folder with the official Bryant asset
provided by Bryant's Marketing & Communications team. Filenames are
load-bearing — don't rename them, or update the `<BryantLogo />` component to
match.

The placeholders intentionally look like "PLACEHOLDER" boxes so you can see
at a glance when a real asset is missing.

## Slots

| File                                     | Usage                                       | Format | Notes                                         |
| ---------------------------------------- | ------------------------------------------- | ------ | --------------------------------------------- |
| `bryant-primary-horizontal.svg`          | Default header lockup on light backgrounds  | SVG    | Seal + wordmark horizontal, Bryant Gold/Black |
| `bryant-primary-horizontal-reverse.svg`  | Headers / sections on dark backgrounds      | SVG    | White/gold version                            |
| `bryant-wordmark.svg`                    | Wordmark-only (tight spaces, footers)       | SVG    | Lowercase wordmark                            |
| `bryant-seal.svg`                        | Seal/shield alone (favicon-adjacent size)   | SVG    | Square aspect                                 |
| `bryant-favicon.svg`                     | Browser tab — modern (vector)               | SVG    | 32×32 viewBox ideal                           |
| `bryant-favicon.png`                     | Browser tab — fallback                      | PNG    | 32×32 recommended                             |
| `bryant-apple-touch-icon.png`            | iOS home-screen icon                        | PNG    | 180×180                                       |

## Guidelines

- **Clear space**: keep a margin equal to half the seal height around each
  logo. The `<BryantLogo />` component does not add extra padding — that's on
  the SVG asset.
- **Color treatments**: primary Gold `#B4975B`, Print Black `#222020`, White.
  Do not apply color filters or shadows in CSS.
- **Minimum size**: primary lockup never below 120px wide; seal never below
  24px wide.
- **Cobranding**: when the lockup appears next to the InternshipMatch
  wordmark (header), keep a 1px `--surface-border` divider between them.

If the real assets differ in aspect ratio from the placeholders, adjust the
width/height props passed into `<BryantLogo />` at each callsite.

## Source of truth

Bryant Creative Brand Guidelines (July 2024):
https://info.bryant.edu/sites/info/files/docs/Bryant_Brand_Guide_7_29.pdf
