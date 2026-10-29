# Deploying VERLONIQ to Cloudflare Pages

The website is plain static HTML in the `public/` directory. It needs no framework, build step or dependencies. These steps create a **temporary preview** on a `*.pages.dev` address. Do not attach `verloniq.com` until the launch checklist below is complete and the founder has approved it.

## Repository layout

```
public/              ← the only directory Cloudflare publishes
  index.html         website (inline CSS + JavaScript)
  config.js          Formspree endpoint + Cal.com link (empty = demo mode)
  privacy.html       privacy policy (draft, noindex)
  404.html           branded "page not found" page (served automatically)
  _headers           security headers + noindex on *.pages.dev
  robots.txt         search-engine rules → points at verloniq.com sitemap
  sitemap.xml        single-page sitemap for https://verloniq.com/
  favicon.svg        browser tab icon
  og-image.png       1200×630 social-share preview
CLAUDE.md, README.md, DEPLOYMENT.md, INTEGRATIONS.md, UPLOAD_TO_GITHUB.txt, .gitignore
                     ← internal docs, not published
```

## 1. Create the preview deployment (Git integration)

Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** tab → **Connect to Git** → choose `kainosss/VERLONIQ-website`.

Use exactly these settings:

| Setting | Value |
| --- | --- |
| Project name | `verloniq-website` (this becomes `verloniq-website.pages.dev`) |
| Production branch | `main` |
| Framework preset | `None` |
| Build command | *(leave empty)* |
| Build output directory | `public` |
| Root directory (advanced) | *(leave empty — repository root)* |
| Environment variables | *(none)* |

Click **Save and Deploy**. Notes:

- Until this pull request is merged, `main` has no `public/` directory, so the first production build will fail or be empty. Either merge first, or open the project's **Deployments** tab and use the preview URL Cloudflare builds for the `claude/vigilant-wright-uq8un8` branch (a `<branch-alias>.verloniq-website.pages.dev` address shown next to that deployment).
- Every push to any branch gets its own preview URL automatically. Cloudflare marks preview URLs `noindex`, and `_headers` does the same for the main `*.pages.dev` address, so nothing appears in search results before launch.
- Do **not** add a custom domain at this stage.

### Alternative: one-off direct upload (no Git connection)

```bash
npx wrangler pages deploy public --project-name verloniq-website --branch preview
```

Requires a Cloudflare login (`npx wrangler login`). The project's default branch is `main`, so `--branch preview` publishes to a preview URL only.

### Test locally the way Cloudflare serves it

```bash
npx wrangler pages dev public
```

This applies `_headers` and the 404 page exactly as Pages does. For a quick look without Node, `python3 -m http.server 8000 -d public` also works, but it ignores `_headers`.

## 2. Check the preview

- [ ] Home page loads over HTTPS with fonts, favicon and no console errors.
- [ ] Response headers include `Content-Security-Policy`, `X-Frame-Options: DENY` and (on `*.pages.dev`) `X-Robots-Tag: noindex`.
- [ ] `/some-missing-page` shows the branded 404 page with status 404.
- [ ] `/CLAUDE.md` and `/README.md` return 404 (internal docs aren't published).
- [ ] Interactive demo, mobile menu, FAQ, the enquiry form (demo mode until configured) and the booking panel behave as expected on a phone.
- [ ] `/privacy` shows the draft privacy policy.

## 3. Launch checklist (before attaching verloniq.com)

- [ ] Business registration (ABN) and trade-mark checks completed.
- [ ] Formspree endpoint and Cal.com link set in `public/config.js` (see [`INTEGRATIONS.md`](INTEGRATIONS.md)), and a real test enquiry and booking checked end-to-end. `_headers` already allows `formspree.io`.
- [ ] Privacy policy (`public/privacy.html`) finalised: placeholders filled, draft notice and `noindex` removed, and `/privacy` added to `sitemap.xml`. Terms page added if needed.
- [ ] Pricing and service descriptions confirmed by the founder.
- [ ] Pre-launch banner, "demo mode" labels and footer notice revised **only** once the above are true.

## 4. Attaching the domain (only after founder approval)

1. Pages project → **Custom domains** → **Set up a custom domain** → `verloniq.com`; optionally add `www.verloniq.com` and redirect it to the apex.
2. If the domain's DNS is on Cloudflare, records are created automatically. Otherwise, follow the CNAME instructions shown.
3. Confirm HTTPS works, then re-run the preview checks above on `https://verloniq.com`.
