# Cloud First Consulting

A customer-facing website for the fictional Cloud First Consulting brand, focused on Microsoft services and engagement planning. The static pages remain compatible with GitHub Pages; interactive controls use React and Microsoft's Fluent UI React components. A separate, local-only Node.js service provides working contact intake. The fictitious company and demo-tenant context are maintained in project documentation, not in customer-facing copy.

## Included

- A concise homepage linking to a service directory and dedicated customer pages.
- Dedicated Security, AI Business Solutions, and Cloud and AI Platforms pages covering sixteen service capabilities, with separate AI Security and AI Governance sections.
- Customer value proposition, differentiators, and an assess-to-optimize delivery approach.
- Four engagement-planning outlines: security posture, data and Copilot readiness, AI strategy, and cloud modernization.
- Nineteen dedicated industry portfolios with 152 defined use cases, plus concrete handover expectations and ten customer FAQs.
- Plug-and-play Microsoft Forms and Bookings links, displayed only when approved destinations are configured.
- A responsive Microsoft Forms contact embed, with the React/Node inquiry form retained as an optional fallback.
- Three original insight articles, three solution examples, and twelve one-page PDF briefs with accessible HTML versions.
- Microsoft technical resources, privacy information, accessible reference diagrams, and a branded 404 page.
- React/Fluent UI catalog filters, service tabs, and engagement controls; Azure-blue branding and the "Intelligence, with trust built in." slogan.
- Business-focused homepage content, an interactive AI-priority guide, Fluent icons, one restrained planning photograph, and direct global navigation. No sample-deliverable pages are served.

The homepage introduces the business rather than holding the entire site. The persistent header has **Services**, **Industries**, and **Resources** panels with direct links, plus **About us** and **Contact us**. Service capabilities and industry pages can be opened without going through an overview first. The Resources hub and its menu share the **Plan your project**, **Insights**, and **Guidance** categories. Resource breadcrumbs are generated from the same hierarchy: service briefs live under Resources / Plan your project, not under Insights. Individual briefs and solution examples retain their respective library as an additional parent. FAQs use native HTML disclosure controls. The sitemap automatically includes public HTML pages except the 404.

| Public route | Purpose |
| --- | --- |
| `/` | Short brand and service introduction |
| `/services/` | Interactive service-area selector and capability directory |
| `/security/`, `/ai-business/`, `/cloud-platforms/` | Detailed service capabilities |
| `/industries/`, `/industry-*/` | Searchable industry directory and 19 portfolios with eight use cases each |
| `/industry-professional-services/` | Compatibility directory linking to Legal and the three specific professional-services sectors |
| `/technology-explained/` | Plain-language guidance on AI Security, AI Governance, MCP servers, and orchestration |
| `/about/` | Company proposition, principles, and delivery approach |
| `/engagements/` | Interactive engagement finder and four planning outlines |
| `/faq/` | Buying and delivery questions |
| `/resources/` | Resources hub matching the navigation categories |
| `/insights/`, `/insight-*/` | Original perspectives and articles |
| `/stories/`, `/scenario-*/` | Solution examples, not invented client results |
| `/briefs/`, `/brief-*/`, `/downloads/*.pdf` | Searchable library of 12 one-page briefs in HTML and PDF |
| `/contact/`, `/booking/` | Working React inquiry form and configured Forms/Bookings actions |
| `/trust-center/` | Privacy, security, responsible-AI principles, and assurance boundaries |
| `/sources/` | Microsoft technical guidance |
| `/trust/` | Website privacy information |

The internal agent-operated company concept is background context, not public website content. No agent directory, workforce profiles, or synthetic workflow console is shipped. The website does not scan anything or connect to a tenant. No real partner status or completed customer-project claims are made.

## Fluent-inspired design and portfolio coverage

The UI applies public [Fluent 2 color guidance](https://fluent2.microsoft.design/color) and [typography guidance](https://fluent2.microsoft.design/typography), with official `@fluentui/react-components` controls on interactive pages. React islands preserve static content, links, and SEO rather than converting the whole site into a client-only SPA. Azure blue (`#0078d4`) remains the action color. Decorative blue left-edge bars and photo-caption overlays have been removed.

The header's moon/sun button toggles dark mode on every page, including the 404 page. `docs\assets\theme.js` runs before styles load, follows the device preference until a manual choice is made, and saves only that choice under `cloud-first-color-theme` in local storage. It synchronizes changes across tabs and updates Fluent UI providers without resetting forms or filters. `docs\assets\theme.css` supplies the shared dark palette and header-control layout. Print styles and downloadable briefs remain light; the externally hosted Forms document controls its own appearance.

React and Fluent UI are bundled locally by esbuild. `package-lock.json` pins a compatible published dependency tree; use `npm ci` rather than discarding the lockfile. Runtime license texts are included in `docs\assets\THIRD_PARTY_NOTICES.txt`. Fluent System Icons' missing package license is supplied from its official source in `licenses\fluentui-system-icons.txt`.

The nineteen portfolios cover financial services; healthcare and life sciences; manufacturing; retail and consumer goods; government; education; energy and resources; telecommunications; media and entertainment; automotive and mobility; Accounting and Advisory; Architecture and Engineering; Staffing and Recruitment; travel and hospitality; construction and real estate; nonprofits; transportation and logistics; Legal; and Startups. The previous generic Professional Services entry is replaced by these specific practices; its URL remains a directory rather than duplicating Legal. Startups are a cross-industry business-stage portfolio. Use cases describe challenges, approaches, deliverables, measures, safeguards, technologies, and related briefs, not achieved customer results.

| Domain | Overview plus dedicated capability briefs |
| --- | --- |
| Security | Security overview; threat protection; data security; modern security operations |
| AI Business Solutions | Category overview; Copilot readiness and adoption; business process transformation; custom AI solutions and governance |
| Cloud and AI Platforms | Category overview; cloud modernization; governed data and analytics; AI application platforms |

Industry and brief catalogs support local text search, category filters, result counts, empty states, and reset controls. Each industry detail page also supports use-case search by topic or Microsoft technology and filters for Security, AI Business Solutions, and Cloud and AI Platforms. Every industry has coverage across all three domains. Queries stay in page memory. Without JavaScript, all catalog content remains visible.

The phrase `agentic AI` is explicitly exempt from acronym expansion only inside the homepage hero description. Other narrative occurrences continue to use the first-use explanation rule.

## Contact and booking configuration

The Contact Us page now embeds the user-provided Microsoft Form. Its response URL is saved in `config\site.json`. The embed replaces the native React inquiry fields, fills the available width, uses a taller mobile layout, and includes a standalone-form link for browsers that cannot load the embedded experience.

The current form is `https://forms.cloud.microsoft/r/LArHCapTwV?embed=true`. The frame retains the responsive layout, reserving 1,650px on desktop and 1,850px on phones rather than adopting the embed snippet's fixed 640px width and 480px height. On phones it uses the full viewport width so the surrounding page margin does not squeeze Microsoft's layout. Ordinary page scrolling remains available. Because the form is cross-origin, the site cannot automatically read its content height; revisit these sizes if questions or the Microsoft Forms theme change. Scrollbars are not forcibly disabled, so additional content can never become inaccessible.

Microsoft Forms handles validation, submission, confirmation, and storage. The website does not intercept or submit test responses, and the Node API does not receive a copy. Ensure **Accept responses** is enabled and **Anyone can respond** is selected when external access is intended and tenant policy permits it.

Edit `config\site.json`; the build generates `docs\assets\integrations.js` from it:

- `contactFormUrl`: the Microsoft Forms response-page or embed URL. Supported `forms.cloud.microsoft` and `forms.office.com` response pages with a form ID and `/r/<id>` short links are embedded automatically. Other approved hosted-form URLs are shown as links. When empty, the native React/Node form remains available.
- `bookingUrl`: an HTTPS link to an approved Microsoft Bookings calendar. Enables **Book time with me** on Contact Us, the consultation page, and the footer.
- `contactEndpoint`: an approved HTTPS API implementing the contact contract. Required for native form submission from a public GitHub Pages site. An empty value uses the same-origin Node endpoint only on localhost; on other hosts, submission reports unavailability without sending data to GitHub Pages.

Values default to empty strings. Invalid URLs, non-HTTPS URLs, and embedded credentials fail configuration validation. Never put secrets, API access keys, tenant administration URLs, or private sharing links in public settings. Microsoft Forms and Bookings are optional links; they do not receive native React form fields automatically.

Manage the new form's questions, consent wording, and response permissions in Microsoft Forms. The website does not configure its fields or automatically map them to the native React form.

### Working local contact intake

`server\contact.mjs` validates input, consent, content type, body size, request origin, and submission rate. It saves only allowed fields with a UUID and timestamp to `.cloud-first-data\inquiries` outside the public site. The directory is ignored by Git and never copied into Pages artifacts. Anonymous callers cannot list or retrieve records through the API.

Success contract: `POST /api/contact` with JSON `{ name, email, company, service, message, consent: true }` returns HTTP 201 and `{ ok: true, reference }` only after persistence. Invalid requests fail without writing records. The default rate is five attempts per IP per minute; request bodies are capped at 16 KB.

The local server binds only to `127.0.0.1`, choosing a free port by default. `PORT` selects a port; `CONTACT_DATA_DIR` changes private storage; `CONTACT_ALLOWED_ORIGINS` lists additional exact HTTPS origins. No personal inquiry content is written to console logs. Operators are responsible for handling and deleting retained inquiries.

**For public deployment with the configured Microsoft Form**, GitHub Pages needs no separate submission API: the embedded form sends directly to Microsoft. If switching back to the native React form, host a separate production receiver with durable storage, appropriate privacy/retention controls, spam protection, and monitoring, then configure `contactEndpoint`. The local file-backed receiver is not a complete hosted production service.

## Preview and build

Use Node.js 22+ and the locked dependency set:

```powershell
npm ci
npm test
npm run build
npm start
```

`npm start` prints the local URL and serves the built clean routes, including redirects from `/security` to `/security/`. `npm run dev` builds first and then starts the same server. Use this HTTP preview rather than opening `dist` through `file://`, which does not provide directory-index routing. The configured Microsoft Form works on static hosting, including GitHub Pages.

The shared navigation and footer live in `scripts\navigation.mjs`. Industry and brief content live in `content\industries.json` and `content\briefs.json`; `scripts\catalogs.mjs` generates their HTML, library pages, and related-brief links on the three service pages. `npm test`, `npm run build`, and PDF generation refresh these pages and their shared shell so direct previews and published files stay consistent.

Interactive components live in `ui\index.jsx`; `scripts\build-ui.mjs` generates the local React bundle and stylesheet. The Node receiver and React form share the validation rules in `shared\inquiry.mjs`. Without JavaScript, article and service content remain readable; submitting the React contact form requires JavaScript.

`scripts\public-copy.mjs` maintains the customer-facing publication rules: straightforward main headings, no demo boilerplate or named security-partner references, and no em dashes or middle-dot separators. It does not add fabricated testimonials, certifications, or achieved results. Maintain meaningful technical requirements and safeguards when editing use cases.

The homepage leads with AI Security and AI Governance consulting and three service paths before introducing the product ecosystem. The two-column product grid reads: modern workplace; threat protection and data security; Copilot and agents; cloud, data, and AI. Its Entra family uses a single product link, and the standalone Copilot callout has been removed. `content\products.json` defines product problems, explanations, aliases, official references, and related services. `scripts\products.mjs` generates the Technical resources product guide and links product chips and online-brief product names to stable explanation anchors. Product names retain Microsoft 365 and Microsoft 365 Copilot in full; `normalizeProductNames` removes other product prefixes without changing URLs or legal attributions. `scripts\acronyms.mjs` expands technical abbreviations on first use in prose, retains shorthand only when reused, and treats cards, FAQs, and briefs independently. Generated spans make this repeatable without changing product names or links. Downloadable briefs use the same expanded HTML. The ordered `serviceMenuGroups` catalog drives global menus, the directory, in-page navigation, and capability labels. Consulting page headings and browser titles consistently use the category name followed by "Consulting". Modern workplace belongs to AI Business Solutions; security includes identity, data protection, and secure-access modernization. Service workflows remain in `shared\blueprints.mjs`, and licensed Fluent icons are rendered by `scripts\icons.mjs`. The locally served hero photograph is documented in `IMAGE_CREDITS.md`.

The logo links to the homepage at the deployment root, including under GitHub project subpaths. The homepage browser-tab title is **Cloud First Consulting**; its visible hero headline is unchanged. All pages use `docs\assets\favicon.png`, a 64-by-64 PNG resized from `docs\assets\images\Logo.png`; regenerate that asset when replacing the logo. Shared appearance synchronization keeps the favicon declaration consistent, including on the 404 page. `scripts\public-copy.mjs` standardizes **Cloud and AI**, **AI Security**, and **AI Governance**, and fixes inappropriate article capitalization without changing legitimate sentence starts or labels such as Plan A.

Edit the JSON catalogs rather than generated `industry-*.html`, `brief-*.html`, `industries.html`, or `briefs.html`. Other page bodies remain editable in `docs`; change global navigation in its shared script. Generated capability-link sections on service pages are marked with comments. Directory totals are derived from the catalog. Coverage tests enforce eight use cases per portfolio, representation of all three domains, and one overview plus three capability briefs per domain.

### Regenerate the downloadable briefs

```powershell
npm run briefs
```

This uses Node.js and installed Microsoft Edge through its local debugging protocol. It generates all twelve tagged, single-page A4 PDFs under `docs\downloads` from the corresponding Azure-blue HTML briefs. A temporary browser profile and loopback server are removed afterward. On another machine, set `CLOUD_FIRST_BROWSER` to an installed Chromium-compatible executable. No third-party conversion service is used.

Generated PDFs are included as public assets and should be committed alongside the catalogs and HTML. GitHub Pages CI publishes them without requiring Edge. Regenerate after editing brief content or print styling. The generator rejects multi-page output, and validation checks that every catalog brief has a one-page PDF and an HTML version.

`docs` replaces the former website source folder. Authoring files remain flat HTML (for example, `docs\security.html`); `scripts\routes.mjs` publishes each one as a directory index (for example, `dist\security\index.html`). The homepage stays at `dist\index.html`, and GitHub Pages' required error document stays at `dist\404.html`. All published page links, anchors, image paths, scripts, styles, downloads, React links, and sitemap entries follow the new routes. PDF files are copied unchanged.

The repository root and project documentation are never uploaded by the Pages workflow. Continue publishing the built `dist` artifact through **GitHub Actions**, not the unbuilt `/docs` branch folder. To generate a sitemap and a deployment-aware 404 home link locally:

```powershell
$env:SITE_URL = 'https://YOUR-ACCOUNT.github.io/YOUR-REPOSITORY/'
npm run build
npm run validate:pages
```

Without `SITE_URL`, the build omits the sitemap rather than inventing a public address. All normal navigation and asset paths work under a GitHub project subpath or a custom domain. The branded 404 page requires the real site URL at build time so its navigation, stylesheet, and icon resolve even from arbitrarily deep invalid URLs.

Services, Industries, and Resources are text-only navigation disclosures, with no adjacent arrow icons. Their panels expose service capabilities, all 19 industry pages, engagement options, briefs, FAQs, and plain-language guidance directly. AI Security and AI Governance lead the security menu. Industry names are alphabetized and filterable. Arrow Down opens a panel and focuses its first control; Escape, outside interaction, and leaving a panel close it.

On screens up to 900px, the navigation opens as a bounded, scrollable menu with inline panels. No-JavaScript fallback links still open the main directories. The Services page also has category controls, and the engagement finder combines a priority and project stage into an outline. No navigation or finder choices are transmitted.

Website-owned menu links, primary controls, and reading text use at least 16px type; supporting labels use 14px. Main menu and control targets are at least 44px tall. Print styling remains separate. The embedded Microsoft Form supplies its own typography and controls inside the responsive frame.

## Publish on GitHub Pages

1. Create an appropriate GitHub repository and upload this project, excluding `dist` and any private notes or secrets. This folder has not been initialized as a Git repository or published automatically.
2. Use `main` as the default branch, or adjust the branch filter in `.github\workflows\pages.yml`.
3. In **Settings > Pages > Build and deployment**, choose **GitHub Actions**. Check plan eligibility and repository visibility: a private repository does not automatically make its Pages site private.
4. Push to `main` or manually run **Deploy public site to GitHub Pages** in Actions. The workflow validates, builds, uploads only `dist`, and deploys with the Pages environment.
5. Use the deployment URL displayed by GitHub. Enable **Enforce HTTPS** when available.

The workflow obtains `SITE_URL` from `actions/configure-pages`, so project paths and configured custom domains are reflected in the sitemap and 404 recovery links. Before uploading, `npm run validate:pages` checks the actual `dist` output against that deployment URL: clean page routes, local navigation, anchors, downloads, scripts, stylesheets, responsive images, stylesheet images, and recovery from nested missing URLs. Filename comparisons are case-sensitive, matching GitHub Pages even when developing on Windows. Keep authoring links relative (for example, `security.html#identity`); the publisher converts them to `security/#identity` or `../security/#identity` as appropriate. Do not hard-code a repository name or domain-root path into page content. React uses the same route mapping through `shared\urls.mjs`. The `.nojekyll` marker is included in the published files.

This is a multi-page static site: clean directory routes work directly and on refresh without server rewrites or a client-side routing fallback. On GitHub Pages, `/security` redirects to `/security/`; both omit `.html`. The routes in the table are relative to the deployment root, so project hosting adds the repository prefix. The configured hosted Form works independently of Pages; the local Node contact receiver is not deployed. No GitHub account or repository name needs to be set in the navigation.

Official actions use major-version tags; production policies may require reviewed full-commit pins and automated updates. The deployment job alone receives Pages write and OIDC permissions.

For a custom hostname, configure an **owned** domain in Pages settings and the required DNS records with your DNS provider. Verify domain ownership, wait for TLS provisioning, and enforce HTTPS. If your deployment setup uses a `CNAME` file, add only the verified hostname in `docs\CNAME`; the build preserves it. No domain or DNS records have been created by this project.

`robots.txt` and `sitemap.xml` are generated in `dist`. Crawlers look for robots.txt at the origin root: on project-path hosting, a repository's robots.txt does not control the parent github.io origin. A custom hostname gives cleaner discovery and crawler boundaries.

The site restricts scripts to self-hosted assets. Fluent UI's runtime style injection requires `style-src 'unsafe-inline'`; this does not permit inline scripts or `eval`. `connect-src` permits the same origin and, if configured, the explicit contact API origin. A supported Microsoft Form enables only `forms.cloud.microsoft` and `forms.office.com` in `frame-src`; without it, frames stay blocked. Microsoft's embedded document governs its own resources. Restart the local Node server after changing integration settings because it captures response-header policy at startup.

## Content and future integration boundaries

Public references and review date are in `docs\sources.html`. The service copy is original and qualitative, not an official Microsoft strategy announcement or a ranked survey of customer asks. Internal research, presentations, customer records, and private tenant details must remain outside both the public site **and any public repository**.

For future tenant automation, build a separate private control plane with workload identity, least-privilege permissions, authenticated MCP gateways, explicit tenant and tool allowlists, dry-run plans, CEO approval, audit evidence, and rollback. Never place client secrets, access tokens, tenant datasets, or administrative endpoints in this static client. Review product licensing, availability, supported APIs, and tenant prerequisites before implementing any role blueprint.

The embedded Microsoft Form loads content from Microsoft and submits responses through Microsoft's service. The optional native React form instead uses the configured contact API. Service-finder and catalog selections remain in page memory. Browser, hosting, and form providers may retain metadata under their own policies. Changes to collection, authentication, retention, or external embeds require a corresponding privacy and architecture review.

## Files

| Path | Purpose |
| --- | --- |
| `docs\` | Only public content and browser assets |
| `ui\` | React and Fluent UI components |
| `shared\` | Shared inquiry validation |
| `server\` | Local Node website host and private contact intake |
| `config\site.json` | Public integration destinations |
| `scripts\` | Site generation, React bundling, and checks |
| `.github\workflows\pages.yml` | GitHub Pages deployment |
| `dist\` | Generated output, ignored by Git |
