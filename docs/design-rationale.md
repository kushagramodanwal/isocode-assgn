# Design rationale

Short version for the TDD. The full tokens are in `web/src/index.css`.

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
4. **Three type sizes** (15 body, 20 titles, 28 totals) plus 13 for captions. Two weights (400, 600).
   Tabular numbers for every price and quantity.
5. **No shadows, no gradients, no emojis.** Hairline borders (`#EDEDED`) where depth is needed.
   Outline icons at 1.5 px, used only in navigation and a few buttons.
6. **Show less, reveal on tap.** Verified review lines fold into one row; the original message is
   two lines until expanded; the photo or voice note opens on request.

## Key screens

- **Home:** a greeting with the credit left, one *Reorder last order* button, search, then one
  product per row: a 56 px pack image, name and pack size, "Case of 96 · ₹777.60 + GST", the scheme
  as a line of green text, and a stepper. The shop's usual products sort to the top instead of
  getting their own section. Out-of-stock rows fade to 40% and offer the in-stock pack size.
- **Cart bar:** appears only when the cart has items: "2 items · ₹18,966 · View cart".
- **Cart:** a plain list, a quiet summary (goods value, discount, GST) and the total at 28 px.
  Scheme hints are one tap: "Add 1 more case, get 1 free · Add 1".
- **Order review (AI capture):** the problems come first. Each line shows the shop's own words in grey,
  then the matched product with the shop's price, stock and match %. There is one quantity box and one
  *Cases | Pieces* switch, with "1 case = 96 pieces" under it. "peti/case" selects Cases and
  "packet/piece" selects Pieces; anything else selects nothing and asks "Cases or pieces?". A missing
  quantity is left empty. Each open line shows one short reason ("Enter the quantity", "Out of
  stock", "Check this"). Verified lines collapse to a single row with a green dot. *Change* opens a
  bottom sheet with suggestions and search-as-you-type, replacing a 43-item dropdown. *Confirm
  order* stays disabled, and says how many items still need checking, until every line is verified.

## Choices that differ from the brief we were given

- **Prices show "+ GST", not "incl. GST".** Dealer invoices are ex-GST and rates differ by product
  (0%, 5%, 18%). The home screen says once that GST is added at checkout, and the cart shows it
  line by line. This meets "show clearly whether GST is included" without inventing tax-inclusive prices.
- **Three tabs, no cart tab.** The cart is reached from the cart bar, so the navigation only holds
  places, not actions.
- **Pack images are inline SVG, not lazy-loaded photos.** They are about 600 bytes each and cost no
  network requests, which beats lazy loading on 3G.

## Performance cost of the look

The fonts are Inter and Noto Sans Devanagari, self-hosted woff2 with `font-display: swap`, weights
400 and 600 only. Latin costs 24 kB per weight. Devanagari costs 50–54 kB per weight and, thanks to
`unicode-range`, is only downloaded when a screen shows Hindi. The icons add about 4 kB of JS.
Motion is limited to 150 ms fades and is turned off for people who ask for reduced motion.
