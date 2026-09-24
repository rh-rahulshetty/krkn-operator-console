# krkn-operator-console

![test](https://github.com/krkn-chaos/krkn-operator-console/actions/workflows/test.yml/badge.svg)
![pr-checks](https://github.com/krkn-chaos/krkn-operator-console/actions/workflows/pr-checks.yml/badge.svg)
![coverage](https://krkn-chaos.github.io/krkn-lib-docs/coverage_badge_krkn-operator-console.svg)


**Web console and Chaos Studio for [Krkn Operator](https://github.com/krkn-chaos/krkn-operator).**

Krkn Operator Console is the web interface for the Krkn Operator platform, providing a graphical experience to manage chaos engineering across Kubernetes and OpenShift environments.

It enables users to compose and execute chaos workflows, manage target clusters, and monitor experiment execution from a centralized interface.

📖 **[Official Documentation](https://krkn-chaos.gateway.scarf.sh/krkn-operator/docs?source=github-console)**

## Development

### Prerequisites

* Node.js 18+
* npm
* [krkn-operator](https://github.com/krkn-chaos/krkn-operator) running at `http://localhost:8080`

### Setup

```bash
cd krkn-operator-console

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open `http://localhost:3000`.

Vite proxies `/api` requests to `http://localhost:8080`, allowing the console to communicate directly with the locally running operator.

### Environment Variables

Copy `.env.example` to `.env.local` to override the defaults:

```bash
cp .env.example .env.local
```

| Variable             | Default   | Description               |
| -------------------- | --------- | ------------------------- |
| `VITE_API_URL`       | `/api/v1` | API base path             |
| `VITE_POLL_INTERVAL` | `3000`    | Status poll interval (ms) |
| `VITE_POLL_TIMEOUT`  | `60000`   | Poll timeout (ms)         |
| `VITE_DEBUG_MODE`    | `false`   | Enable debug logging      |

### Krkn AI mock preview

Run the client-only Krkn AI prototype with preview mode enabled:

```bash
VITE_PREVIEW_MODE=true npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:3000/app` and choose **Krkn AI** in the sidebar. Run creation starts with target and local discovery filters, then guides users through scenarios, cluster components, genetic algorithm, fitness functions, health checks, run settings (including baseline and output formats), and a generated YAML review. Each focused section has an icon and guidance tip; section navigation preserves edits. Discovery filters default to `*`; per-resource enable toggles serialize unchecked items with `disabled: true`. Run details provide a sortable, filterable, fixed-height scenario table; selecting a completed row opens styled metadata and health metrics, the complete copyable command persisted in the supplied scenario logs, and the health response plots. One active mock scenario exposes live-style logs without premature fitness details.

Discovery data, seeded runs, and health-check URLs on the reserved `example.com` domain are illustrative. Creating a run updates only browser-session memory; the flow sends no Krkn AI or target API requests, never requests health-check URLs, and never creates Kubernetes resources.

### Temporary GitHub Pages preview

`.github/workflows/deploy-main-preview.yml` builds preview mode from `main` and publishes `dist/` to the `gh-pages` branch. In repository **Settings → Pages**, select **Deploy from a branch**, then choose `gh-pages` and `/ (root)`. The preview is available at `https://<owner>.github.io/<repository>/`; direct SPA routes are handled by the generated `404.html`.

The workflow also supports manual runs from the Actions tab. Remove the workflow when sharing is complete; disable Pages as well if PR previews are no longer needed.

### Other Commands

```bash
npm run test       # Run tests in watch mode
npm run test:run   # Run tests once (CI mode)
npm run lint       # Lint
npm run build      # Production build
```

## License

Licensed under the [Apache License 2.0](LICENSE).

