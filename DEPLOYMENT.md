# Deploying VERLONIQ to Cloudflare Pages

The site is plain static HTML — no build step, no dependencies. These steps prepare a **preview** deployment. Do not attach `verloniq.com` until the launch checklist below is complete and the founder has approved it.

## 1. Create the Pages project (preview only)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select `kainosss/VERLONIQ-website`.
3. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Build output directory:** `/`
   - **Production branch:** `main`
4. Deploy. The site will be available at `https://<project>.pages.dev`. Every other branch (for example `claude/...`) gets its own preview URL automatically.

## 2. Files Cloudflare Pages uses

| File | Purpose |
| --- | --- |
| `index.html` | The website (inline CSS and JavaScript). |
| `404.html` | Branded "page not found" page, which Pages serves automatically for unknown URLs. |
| `_headers` | Security headers (CSP, frame and referrer policy) and `noindex` on the `*.pages.dev` address so only `verloniq.com` gets indexed. |
| `robots.txt`, `sitemap.xml` | Search engine hints that point at `https://verloniq.com/`. |
| `favicon.svg`, `og-image.png` | Browser tab icon and social-share preview image. |

Repository notes (`README.md`, `CLAUDE.md`, `DEPLOYMENT.md`, `UPLOAD_TO_GITHUB.txt`) are also published because the output directory is the repo root. They contain nothing sensitive, since the repository is public and `_headers` marks `.md` files `noindex`. If you'd rather not publish them, move the website files into a `public/` folder and set it as the build output directory.

## 3. Launch checklist (before attaching verloniq.com)

- [ ] Business registration (ABN) and trade-mark checks completed.
- [ ] Real enquiry form/booking workflow connected, tested end-to-end, with spam protection and consent wording. If the form posts to an external service, add that origin to `form-action` / `connect-src` in `_headers`.
- [ ] Privacy policy and terms pages added and linked from the footer.
- [ ] Pricing and service descriptions confirmed by the founder.
- [ ] Pre-launch banner, "demo mode" labels and footer notice revised **only** once the above are true.
- [ ] Content-Security-Policy checked in the browser console (no blocked resources).

## 4. Attaching the domain (only after approval)

1. Pages project → **Custom domains** → **Set up a custom domain** → `verloniq.com` (and optionally `www.verloniq.com`, redirecting to the apex).
2. If the domain's DNS is on Cloudflare, records are created automatically. Otherwise, follow the CNAME instructions shown.
3. Confirm HTTPS works, then test the form, the 404 page and the social preview (e.g. by pasting the URL into a messaging app).
