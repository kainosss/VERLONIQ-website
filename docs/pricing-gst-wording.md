# Starting prices: GST wording (approval gate)

**Status:** GST registration status has **not** been confirmed. The repository's own checklist (`docs/sales-toolkit/README.md`, "Confirm with an accountant whether VERLONIQ is or must be registered for GST") is still open, and the ABN is still "to be confirmed" in the draft legal pages.

Until the founder confirms it, the website uses the **pending** wording below. **Don't merge or publish the pricing PR until the GST status is confirmed and the matching variant is applied.**

> This is general information to help choose wording, not tax or legal advice. Confirm the GST position, and whether prices for consumers must be shown GST-inclusive, with your accountant.

## Where the prices appear (all must match)

| Page | Element | Current text |
| --- | --- | --- |
| Homepage, AI Automation service card | `.start-price` | Projects from **$2,500** |
| Homepage, Business Consulting service card | `.start-price` | Focused assessments from **$795** |
| Homepage, Working with us | Assessment card `.price` | From **$795** focused scope |
| Homepage, Working with us | Automation card `.price` | From **$2,500** per project |
| Homepage, Working with us | Support card `.price` | From **$299** per month |
| `/automation`, Pricing | Implementation card `.price` | From **$2,500** per project |
| `/automation`, Pricing | Support card `.price` | From **$299** per month |
| `/automation`, FAQ "How much does it cost?" | text | from $2,500 … from $299 a month |
| Both pages | `.pricing-note .gst-note` | GST sentence (see below) |

`tests/pricing.test.mjs` checks that all of these agree, and that the GST sentence is one of the approved variants and identical on both pages.

## Variants for `<span class="gst-note" data-gst="…">`

### 1. `pending` (current, interim)
> GST: VERLONIQ's GST registration status is being finalised. Any applicable GST will be shown clearly with these prices and on every written quote.

### 2. `registered-inclusive` (registered for GST; the prices shown **include** GST)
> All prices include GST.

- No other change is needed. The $2,500, $795 and $299 figures are then GST-inclusive amounts.
- If the prices were meant to be **ex-GST** amounts, they would become $2,750, $874.50 and $328.90 inc-GST. Decide which you intend; don't rely on rounding.

### 3. `registered-exclusive` (registered for GST; prices shown **exclude** GST, mainly for business customers)
> Prices exclude GST. GST of 10% is added to the prices shown.

- Also add " + GST" after every price in the table above, e.g. `From $2,500 + GST` and `Projects from $2,500 + GST`.
- Ask your accountant whether ex-GST pricing is appropriate if you also sell to consumers.

### 4. `not-registered` (not registered for GST)
> VERLONIQ is not registered for GST, so no GST is charged.

## How to apply a variant
1. In `public/index.html` and `public/automation.html`, replace the `gst-note` span. Keep the class, set `data-gst` to the variant name and use the exact sentence above.
2. For `registered-exclusive`, add " + GST" to each price listed in the table.
3. Run `node --test tests/*.test.mjs`. The pricing test fails if the pages disagree or the wording isn't an approved variant.
4. Also update the proposal template (`docs/sales-toolkit/04-proposal-template.md`) so quotes use the same treatment.
