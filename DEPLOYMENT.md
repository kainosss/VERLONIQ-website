# Deploying VERLONIQ to Cloudflare

The website is plain static HTML in the `public/` directory. It needs no framework, build step or dependencies.

The live project is a **Cloudflare Workers** project (static assets) connected to this GitHub repository through **Workers Builds**. It is *not* a Pages project. Deployment is configured by [`wrangler.jsonc`](wrangler.jsonc) at the repository root.

## Repository layout

```
wrangler.jsonc       ← Cloudflare config: Worker name + "serve ./public as static assets"
public/              ← the only directory Cloudflare publishes
  index.html         website (inline CSS + JavaScript)
  config.js          Formspree endpoint + Cal.com link (empty = demo mode)
  privacy.html       privacy policy (draft, noindex)
  terms.html         terms of use (draft, noindex)
  404.html           branded "page not found" page (served for unknown URLs)
  _headers           security headers + noindex on *.workers.dev / *.pages.dev
  robots.txt         search-engine rules → points at verloniq.com sitemap
  sitemap.xml        single-page sitemap for https://verloniq.com/
  favicon.svg        browser tab icon
  og-image.png       1200×630 social-share preview
CLAUDE.md, README.md, DEPLOYMENT.md, INTEGRATIONS.md, UPLOAD_TO_GITHUB.txt, .gitignore
                     ← internal docs, not published
```

## 1. How builds work (Workers Builds)

In the Cloudflare dashboard, go to **Workers & Pages → verloniq-website → Settings → Build**. The expected settings are:

| Setting | Value |
| --- | --- |
| Git repository | `kainosss/VERLONIQ-website` |
| Production branch | `main` |
| Build command | *(empty — there is no build step)* |
| Deploy command | `npx wrangler deploy` (the default) |
| Non-production branch deploy command | `npx wrangler versions upload` (the default) |
| Root directory | *(empty — repository root, where `wrangler.jsonc` lives)* |
| Environment variables | *(none)* |

- **`main`** builds run `wrangler deploy`, which publishes to production.
- **Every other branch** (pull requests) runs `wrangler versions upload`. This creates a preview version without touching production, and Cloudflare comments on the pull request with the result.
- **`wrangler.jsonc` is required for preview builds.** Without it, `wrangler versions upload` fails with `Missing entry-point to Worker script or to assets directory`. Only `wrangler deploy` can detect a static site automatically. This was the cause of the failed preview builds on PR #2.
- `"name"` in `wrangler.jsonc` must match the Worker's name in the dashboard (`verloniq-website`).
- Do **not** add a custom domain until the launch checklist below is complete.

### Test locally the way Cloudflare serves it

```bash
npx wrangler dev
```

Run this from the repository root. It serves `public/` with the same static-assets runtime as production, including `_headers`, the 404 page and `/privacy`-style URLs. For a quick look without Node, `python3 -m http.server 8000 -d public` also works, but it ignores `_headers`.

### Check that a deploy would succeed (no upload)

```bash
npx wrangler versions upload --dry-run
```

```bash
npx wrangler deploy --dry-run
```

## 2. Check the preview

- [ ] Home page loads over HTTPS with fonts, favicon and no console errors.
- [ ] Response headers include `Content-Security-Policy`, `X-Frame-Options: DENY` and (on `*.workers.dev` addresses) `X-Robots-Tag: noindex`.
- [ ] `/some-missing-page` shows the branded 404 page with status 404.
- [ ] `/CLAUDE.md` and `/README.md` return 404 (internal docs aren't published).
- [ ] Interactive demo, mobile menu, FAQ, the enquiry form (demo mode until configured) and the "Book a Free Discovery Call" panel behave as expected on a phone.
- [ ] `/privacy` and `/terms` show the draft policies.

## 3. Launch checklist (before attaching verloniq.com)

- [ ] Business registration (ABN) and trade-mark checks completed.
- [ ] Formspree endpoint and Cal.com link set in `public/config.js` (see [`INTEGRATIONS.md`](INTEGRATIONS.md)), and a real test enquiry and booking checked end-to-end. `_headers` already allows `formspree.io`.
- [ ] Privacy Policy (`public/privacy.html`) and Terms of Use (`public/terms.html`) reviewed and finalised: placeholders filled, draft notices and `noindex` removed, and `/privacy` and `/terms` added to `sitemap.xml`.
- [ ] Pricing and service descriptions confirmed by the founder.
- [ ] Pre-launch banner, "demo mode" labels and footer notice revised **only** once the above are true.

## 4. Attaching the domain (only after founder approval)

1. Pages project → **Custom domains** → **Set up a custom domain** → `verloniq.com`; optionally add `www.verloniq.com` and redirect it to the apex.
2. If the domain's DNS is on Cloudflare, records are created automatically. Otherwise, follow the CNAME instructions shown.
3. Confirm HTTPS works, then re-run the preview checks above on `https://verloniq.com`.
