# Design rationale

Short version for the TDD. The full tokens are in `web/src/index.css`.

## TDD paragraph ("UI decisions")

Kirana owners order between customers on low-end phones over slow 3G, so the interface is quiet on
purpose: white space instead of boxes, hierarchy from size and weight rather than colour, and one
primary action per screen (*Reorder last order*, *Place order*, *Confirm order*). One deep-green
accent marks only that action, the active state, the cart bar and scheme text. Status is always a
small dot plus a word, so it never depends on colour. Body text is 16 px in Inter and Noto Sans
Devanagari (98 kB of fonts in total, Hindi only loaded when shown), with a हिं / EN switch always in
the header and layouts that let Hindi run 30% longer without truncating. Detail appears on demand:
verified order lines fold into one row, the original message and photo open on tap, and the product
picker is a searchable bottom sheet. On the order review screen, units are taken only from the
customer's words and otherwise asked, quantities are never assumed, and *Confirm* stays disabled
until every line is settled. The desk gets the same calm language on a desktop, plus an explicit
choice of whether a correction becomes the shop's saved word.

## The idea

Kirana owners order between customers, on low-end Android phones over slow 3G, in Hindi or English.
The screen has to be readable at a glance and hard to tap wrong. So the app is quiet on purpose:
white space instead of boxes, hierarchy from size and weight instead of colour, and one obvious
thing to do on each screen.

## Rules we hold to

1. **One primary action per screen**: *Reorder last order* on home, *Place order* in the cart,
   *Confirm order* on review. Everything else is plain text.
2. **One accent colour** (deep green `#0F6B4F`), used only for the primary button, the active
   tab and the cart bar. Scheme lines use it as plain text, because a scheme is money for the shop.
3. **Status is a 6 px dot plus words** (green verified, amber check, red blocked). Never a filled
   badge, never colour alone, so it also works for colour-blind users.
4. **Three type sizes** (16 body, the minimum for anything important; 20 titles; 28 totals) plus 13
   for captions. Two weights (400, 600). Tabular numbers for every price and quantity. Secondary text
   is #6B6B6B (5.3:1 on white, above WCAG AA).
5. **No shadows, no gradients, no emojis.** Hairline borders (`#EDEDED`) where depth is needed.
   Outline icons at 1.5 px, used only in navigation and a few buttons. Spacing on a 4 px scale,
   20 px screen padding, 48 px tap targets.
7. **Hindi is a first-class language.** A हिं / EN switch is always in the header. Hindi runs at
   line-height 1.7 and about 30% longer, so nothing has a fixed width and nothing is truncated:
   long names wrap.
6. **Show less, reveal on tap.** Verified review lines fold into one row; the original message is
   two lines until expanded; the photo or voice note opens on request.

## Key screens

- **Login:** logo, one greeting, phone number, *Send OTP*; then the 6-digit OTP with a resend
  countdown that matches the server's 30-second limit. No password.
- **Home:** a greeting with the credit left, one *Reorder last order* button with a preview ("6 items
  · about ₹30,495", priced at today's prices), search, then one product per row: a 56 px pack image,
  name and pack size, "Case of 96 · ₹8.10/pc excl. GST", the scheme as a line of green text, stock as
  a dot and a word, and a stepper (a "+" that becomes "− 3 +"). The shop's usual products sort to the top instead of
  getting their own section. Out-of-stock rows fade to 40% and offer the in-stock pack size.
- **Cart bar:** a slim pill that appears only when the cart has items: "2 items · ₹18,966 · View cart".
- **Cart:** a plain list; each line says "9 cases · ₹7,348.32" and the scheme result ("+1 free added",
  "3% off applied"). A quiet summary (goods value, discount, GST), the total at 28 px, one calm
  credit note if the order goes over, and one *Place order* button. Scheme hints are one tap.
- **Order desk:** a calm table with generous rows and status tabs; credit holds as dot and text;
  the review screen edits lines in place; a corrected line offers *Save "kala" as this shop's word*
  (ticked by default) so the desk decides what the system learns; one *Export to Tally* button.
- **States:** a plain grey skeleton while loading; an empty state is one sentence and one action;
  an error is one friendly line and *Try again*.
- **Order review (AI capture):** the problems come first. Each line shows the shop's own words in grey,
  then the matched product with the shop's price, stock and match %. There is one quantity box and one
  *Cases | Pieces* switch, with "1 case = 96 pieces" under it. "peti/case" selects Cases and
  "packet/piece" selects Pieces; anything else selects nothing and asks "Cases or pieces?". A missing
  quantity is left empty. Each open line shows one short reason ("Enter the quantity", "Out of
  stock", "Check this"). Verified lines collapse to a single row with a green dot. *Change* opens a
  bottom sheet with suggestions and search-as-you-type, replacing a 43-item dropdown. *Confirm
  order* stays disabled, and says how many items still need checking, until every line is verified.

## Dark mode

Follows the phone's own setting by default; a moon/sun button in the header lets a person pick
light or dark, and that choice is remembered. A tiny script in `<head>` applies it before the
first paint, so a dark-mode user never sees a white flash. The same calm rules apply: near-black
(#111213), not pure black; one accent; status as a dot and a word. Every colour is a token with a
dark value, and each text colour still meets WCAG AA on the dark background (body 15.9:1,
secondary 7.9:1, accent text 8.8:1, amber 8.2:1, red 6.4:1). The deep green is too dark to read
as text on black, so the accent is split into a fill token (buttons, cart bar: white text on it at
5.4:1) and a text token (scheme lines, active tab: a lighter green). Pack shots are dimmed slightly
in dark mode so they don't glare. The browser's status bar colour follows the chosen theme.

## Choices that differ from the brief we were given

- **Prices say "excl. GST" on every row**, never "incl. GST": dealer invoices are ex-GST and rates
  differ by product (0%, 5%, 18%); the cart itemises GST. The per-piece price is shown because that is
  how the sample data and shops quote it; the case price appears in the cart.
- **Unit questions keep a specific reason** ("Cases or pieces?", "Enter the quantity") instead of a
  generic "Check this": it tells the shop what to do. "Check this" is used when the only doubt is the match.
- **"Change" offers the two alternatives plus a search box**, because the right product is sometimes
  neither alternative.
- **Order lines are not edited after an order is placed**; corrections happen on the review screen
  before confirming, and exported orders are corrected in Tally.
- **Three tabs, no cart tab.** The cart is reached from the cart bar, so the navigation only holds
  places, not actions.
- **Product images are rendered pack shots, not photos.** The brands are fictional, so there are no
  real photos, and copying real pack photos would be someone else's copyright.
  `scripts/render-pack-images.ts` draws one per SKU from the catalogue: packaging shape by product type
  (flow-wrap, carton, pouch, bottle, bar), colour by product, brand, English and Hindi name, and pack
  size. Each is a 192 px WebP of about 2.4 kB (103 kB for all 43), lazy-loaded so only rows on screen
  download (about 16 at first, about 38 kB), cached for a year and kept offline by the service worker.
  If an image fails, the row falls back to a small inline drawing, so it is never broken. When the
  client has real pack photos, they drop into `web/public/products/` with the same names.

## Performance cost of the look

Fonts total 98 kB, inside the ~100 kB budget: Inter 400 and 600 (24 kB each; 400 is preloaded) and
Noto Sans Devanagari 400 only (50 kB, semibold drawn from it), self-hosted woff2 with
`font-display: swap`. Thanks to `unicode-range`, the Devanagari file downloads only when a screen
shows Hindi. The icons add about 4 kB of JS.
Motion is limited to 150 ms fades and is turned off for people who ask for reduced motion.
