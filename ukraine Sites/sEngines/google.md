Here's the full breakdown of how **Google Search** (the SPA) loads its listings and handles pagination for "apple ipad":

---

## How Google Search Loads Listings

### 1. It's NOT a True SPA for Pagination

Despite Google Search looking like a SPA, **pagination uses full page reloads (MPA-style navigation)**, not client-side pushState routing. This was confirmed by:

```
performance.navigation.type = "navigate"   ← full browser navigation
transferSize = ~152 KB compressed HTML
encodedBodySize = 151,896 bytes
```

Every time you click a page number, the browser makes a **full HTTP GET** request for a new server-rendered HTML document.

---

### 2. Listings Are Server-Side Rendered (SSR)

All search results — organic listings, sponsored products, shopping cards — arrive **pre-rendered in the initial HTML response** (~739 KB uncompressed). The page contains 100 `[data-hveid]` result elements already in the DOM when it loads, with no client-side fetch needed to populate them.

---

### 3. Pagination URL Scheme

Pagination is controlled by two key query parameters:

| Parameter | Meaning | Example |
|---|---|---|
| `q` | Search query | `apple+ipad` |
| `start` | Result offset (0-indexed) | `0`, `10`, `20`… |
| `num` | Results per page | `10` |

So the pages map like this:
- **Page 1:** `?q=apple+ipad&start=0&num=10`
- **Page 2:** `?q=apple+ipad&start=10&num=10`
- **Page 3:** `?q=apple+ipad&start=20&num=10`

The "Goooooooogle" pagination bar simply renders anchor `<a>` tags with pre-calculated `start=` values. No JavaScript routing is involved.

---

### 4. Async / Lazy-Loaded Widgets (The SPA Part)

While the main results are SSR, **some secondary widgets** are loaded asynchronously after page load via XHR, using Google's internal `data-async-type` attribute system:

```
XHR  www.google.com/async/bgasy          ← background async widget updater
XHR  ogads-pa.clients6.google.com/$rpc/  ← async ad data (GetAsyncData)
XHR  www.google.com/complete/search      ← autocomplete suggestions
```

Widgets with these types are lazy-filled post-load: `duffy3`, `kp_feedback`, `ctxm`, `arc`, `lbsc`, `vpkg`, etc. These are sidebars, feedback panels, and knowledge cards — **not** the main search result listings.

---

### 5. JavaScript Framework

Google uses its own custom framework called **Closure + JSAction** (not React/Vue/Angular):
- `jscontroller="Eox39d"` on `<body>` — main search page controller
- `jsaction` attributes on interactive elements — event delegation system
- `window.google`, `window.gbar`, `window.xjs` — Google's proprietary globals
- JS bundles loaded via `fetch` from `/xjs/_/js/...` (module system)

---

### Summary Diagram

```
User clicks "Page 3"
       ↓
Browser does full GET /search?q=apple+ipad&start=20&num=10
       ↓
Google server returns complete SSR HTML (~150KB gzipped)
  ├─ Sponsored product carousel  ← in HTML
  ├─ Organic result listings      ← in HTML (data-hveid="...")
  └─ Pagination bar (start=0..90) ← in HTML (<a href="?start=N">)
       ↓
After load: XHR calls fire asynchronously
  ├─ /async/bgasy  → fills sidebar widgets
  └─ /complete/search → warms autocomplete cache
```

The bottom line: Google Search is **server-rendered with async widget hydration** — not a classic SPA. The listings and pagination are entirely traditional SSR; the "SPA feel" comes from the fast server responses and minimal page chrome reloading, not client-side routing.
