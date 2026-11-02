# Starting prices: GST treatment

**Status: VERLONIQ is not registered for GST.** The founder confirmed this in November 2026. Prices are shown with **no GST added**. Don't label them "+ GST" or "GST-inclusive".

The approved statement, shown beneath the pricing on both the homepage and `/automation`:

> All prices are in AUD. GST is not charged. Final project pricing is confirmed following scoping. Third-party software and AI usage costs may apply.

In the HTML, "GST is not charged." sits in `<span class="gst-note" data-gst="not-registered">`. `tests/pricing.test.mjs` checks that:
- the statement is identical on both pages
- no "+ GST", "inc GST", "GST-inclusive" or "10%" wording appears anywhere on the public pages

## Where the prices appear (all must match)

| Page | Element | Text |
| --- | --- | --- |
| Homepage, AI Automation service card | `.start-price` | Projects from **$2,500** |
| Homepage, Business Consulting service card | `.start-price` | Focused assessments from **$795** |
| Homepage, Working with us | Assessment card `.price` | From **$795** focused scope |
| Homepage, Working with us | Automation card `.price` | From **$2,500** per project |
| Homepage, Working with us | Support card `.price` | From **$299** per month |
| `/automation`, Pricing | Implementation card `.price` | From **$2,500** per project |
| `/automation`, Pricing | Support card `.price` | From **$299** per month |
| `/automation`, FAQ "How much does it cost?" | text | from $2,500 … from $299 a month; "Prices are in AUD and GST is not charged." |

## If VERLONIQ registers for GST later
This needs the founder's approval and a check with the accountant first. Then:
- Decide whether the advertised prices will include GST (consumer-friendly) or exclude it (state "+ GST" next to every price above).
- Update the statement on both pages, `data-gst`, the GST check in `tests/pricing.test.mjs`, `CLAUDE.md` and `docs/sales-toolkit/04-proposal-template.md` together.
