# Frontend responsive audit and changes

Existing working-tree edits were preserved. No backend, API, authentication, or store logic was changed. Breakpoints: sm 640px, md 768px, lg 1024px, xl 1280px.

## Audit findings before editing

- Global/layout: large mobile gutters/panel padding and intrinsic flex/grid minimum sizes reduce usable width; long identifiers need wrapping.
- Navigation: shared header has one fixed-height row; landing navigation disappears below lg without a mobile replacement.
- Forms: submit/cancel rows do not wrap; nested POS filters use a fixed 14rem category column plus search/actions.
- Tables: user/category tables clip overflow; other tables already scroll but lack focusable named scroll regions. Report/category grid children can expand with their tables.
- Cards/grids: cart quantity/total/remove controls exceed narrow content widths; product name/price rows cannot wrap.
- Dialogs: quick view combines 90vh with 64px outer vertical padding; account leave confirmation has no maximum height.
- Individual pages: login has excessive phone padding; landing hero has a 3.8rem minimum font; POS has an ineffective sticky offset; dashboard and management headings/panels crowd phones.

## Verification and remaining risks

- `npm.cmd run lint`: passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run build`: passed. Non-fatal warnings concern esbuild/oxc configuration, plugin timings, and dependency export deprecation. Windows PowerShell blocks `npm.ps1`, so commands use the equivalent `npm.cmd` entry point.
- Browser runtime reported no available browser; browser discovery returned an empty list. No rendered viewport, screenshot, touch, or authenticated workflow checks could be performed.
- At 320, 375, 640, 768, 1024, and 1440px, verify guest/customer/staff navigation, populated cart/POS, long names/SKUs/emails/order IDs, payment/refund states, inventory/report/user tables, and quick view/account confirmation. Check short landscape viewports and mobile keyboard behavior as well.
- The absence of page-level horizontal scrolling and unchanged desktop appearance remain unverified visually. Table horizontal scrolling is intentional. Quick-view focus behavior passed DOM checks; account confirmation and real-browser keyboard behavior still need review.

## Follow-up review — 2026-09-07

- Browser connection retried; the runtime still reports no available browser. Visual acceptance remains pending.
- `web/app/layouts/default.vue`: Escape previously hid the focused menu link. It now returns focus to the menu button below lg (1024px); desktop navigation layout is unchanged.
- `web/app/components/catalog/ProductQuickViewModal.vue`: focus previously remained behind the dialog and could tab out. Opening focuses Close, Tab/Shift+Tab cycle between the dialog buttons, and closing restores the opener when still mounted. Applies at every breakpoint.
- `web/app/pages/cart.vue`: quantity buttons were only 36px wide; they are now 44px square. Total/control rows wrap with explicit gaps at all widths.
- `web/app/pages/staff/pos/index.vue`: quantity buttons now have a 44px minimum width and product-specific accessible labels at every width.
- `web/app/pages/account/orders/[id].vue` and `web/app/pages/staff/orders/[id].vue`: summary/status rows now wrap with spacing where needed, preventing adjacent labels and long totals from colliding at narrow widths. Existing column breakpoints remain intact.
- Scroll regions now identify their table content instead of saying only “data table”: `web/app/pages/admin/users/index.vue`, `web/app/pages/admin/observability/index.vue`, `web/app/pages/staff/inventory.vue`, `web/app/pages/staff/catalog/index.vue`, `web/app/pages/staff/catalog/categories/index.vue`, `web/app/pages/staff/manager/reports.vue`, `web/app/pages/staff/orders/index.vue`, and `web/app/pages/staff/orders/[id].vue`. This is an accessibility improvement at all widths; table geometry is unchanged.
- Follow-up lint, typecheck, and production build passed (exit code 0). The first build reported success but PowerShell treated redirected warnings as an error; rerunning with the native process exit code preserved confirmed success.
- A temporary Happy DOM check mounted the actual compiled quick-view component and passed initial focus, forward/reverse Tab wrap, Escape close emission, opener focus restoration, and body-scroll restoration. The temporary module was removed afterward. This does not verify CSS layout or native browser tab traversal.

## File changes

### `web/app/assets/css/main.css`

- Intrinsic form/flex/grid sizes and long identifiers could force overflow. Added zero minimum widths, bounded form controls, and wrapping for textual elements at all widths. No page overflow is hidden to mask layout defects.
- Buttons and non-checkbox/radio inputs/selects have a 44px minimum height, and interactive elements have visible keyboard focus at all widths.

### `web/app/layouts/default.vue`

- The single fixed-height navigation row overflowed on phones. Below lg (1024px), an expanded-state menu button reveals all existing role-dependent links in a vertical, viewport-bounded scrolling region. Navigation closes on route changes or Escape. At lg, links remain horizontal.
- The header now uses a minimum height and wrapping container, 16px mobile gutters, original 24px gutters at sm and 32px at lg. Navigation links have 44px minimum height.

### Additional landing-page changes: `web/app/pages/index.vue`

- Hidden mobile navigation had no replacement. Added a native keyboard-accessible disclosure below lg with Home, Menu, Story, Visit, and the existing account destinations; guest/account actions remain in the header at sm and above.
- Header can wrap. Hero heading minimum reduced from 3.8rem to 2.5rem, retaining the existing 7vw fluid size and 6.6rem maximum (desktop size is unchanged).

### `web/app/pages/account/index.vue`

- Container gutters: 16px below sm; 24px at sm and existing lg gutters retained.
- Panels: reduce padding to 16px below sm; restore 32px at sm (640px).
- Large headings: 30px below sm; original larger type at sm (640px).
- Action rows wrap when their contents exceed available width; no fixed breakpoint.
- Account confirmation: internal scrolling limited to dynamic viewport minus its top offset and bottom margin, at every width.

### `web/app/pages/account/orders/[id].vue`

- Container gutters: 16px below sm; 24px at sm and existing lg gutters retained.
- Panels: reduce padding to 16px below sm; restore 24/32px at sm (640px).

### `web/app/pages/account/orders/index.vue`

- Container gutters: 16px below sm; 24px at sm and existing lg gutters retained.
- Panels: reduce padding to 16px below sm; restore 24/32px at sm (640px).

### `web/app/pages/admin/index.vue`

- Container gutters: 16px below sm; 24px at sm and existing lg gutters retained.
- Panels: reduce padding to 16px below sm; restore 24px at sm (640px).
- Large headings: 30px below sm; original larger type at sm (640px).

### `web/app/pages/admin/observability/index.vue`

- Panels: reduce padding to 16px below sm; restore 24/32px at sm (640px).
- Large headings: 30px below sm; original larger type at sm (640px).
- Observability: use a zero-minimum flexible filter track at md (768px).
- Tables: existing/new horizontal scroll wrappers are keyboard focusable and named regions; all columns stay accessible without page-level scrolling.

### `web/app/pages/admin/users/index.vue`

- Container gutters: 16px below sm; 24px at sm and existing lg gutters retained.
- Panels: reduce padding to 16px below sm; restore 24px at sm (640px).
- Large headings: 30px below sm; original larger type at sm (640px).
- Users: replace clipped overflow with local scrolling and preserve a readable 700px table at every viewport.
- Tables: existing/new horizontal scroll wrappers are keyboard focusable and named regions; all columns stay accessible without page-level scrolling.

### `web/app/pages/admin/users/new.vue`

- Container gutters: 16px below sm; 24px at sm and existing lg gutters retained.
- Panels: reduce padding to 16px below sm; restore 32px at sm (640px).
- Large headings: 30px below sm; original larger type at sm (640px).
- Action rows wrap when their contents exceed available width; no fixed breakpoint.

### `web/app/pages/cart.vue`

- Panels: reduce padding to 16px below sm; restore 24px at sm (640px).
- Cart: zero-minimum desktop track; quantity/total/remove row wraps at every width; item rows remain stacked until xl (1280px) to fit the desktop summary column.

### `web/app/pages/catalog.vue`

- Container gutters: 16px below sm; 24px at sm and existing lg gutters retained.
- Panels: reduce padding to 16px below sm; restore 40px at sm (640px).

### `web/app/pages/index.vue`

- Container gutters: 16px below sm; 24px at sm and existing lg gutters retained.
- Panels: reduce padding to 16px below sm; restore 28px at sm (640px).
- Large headings: 30px below sm; original larger type at sm (640px).
- Action rows wrap when their contents exceed available width; no fixed breakpoint.

### `web/app/pages/login.vue`


- Login: dynamic viewport height, 16px horizontal padding and 32px vertical padding on phones; previous spacing at sm (640px).

### `web/app/pages/register.vue`

- Large headings: 30px below sm; original larger type at sm (640px).

### `web/app/pages/staff/cashier/index.vue`

- Container gutters: 16px below sm; 24px at sm and existing lg gutters retained.
- Panels: reduce padding to 16px below sm; restore 24px at sm (640px).
- Large headings: 30px below sm; original larger type at sm (640px).

### `web/app/pages/staff/catalog/[id].vue`

- Container gutters: 16px below sm; 24px at sm and existing lg gutters retained.
- Panels: reduce padding to 16px below sm; restore 32px at sm (640px).
- Large headings: 30px below sm; original larger type at sm (640px).
- Action rows wrap when their contents exceed available width; no fixed breakpoint.

### `web/app/pages/staff/catalog/categories/index.vue`

- Container gutters: 16px below sm; 24px at sm and existing lg gutters retained.
- Panels: reduce padding to 16px below sm; restore 24px at sm (640px).
- Large headings: 30px below sm; original larger type at sm (640px).
- Categories: constrain the flexible lg (1024px) track; retain a readable 600px table inside local horizontal scrolling at smaller widths.
- Tables: existing/new horizontal scroll wrappers are keyboard focusable and named regions; all columns stay accessible without page-level scrolling.

### `web/app/pages/staff/catalog/index.vue`

- Container gutters: 16px below sm; 24px at sm and existing lg gutters retained.
- Large headings: 30px below sm; original larger type at sm (640px).
- Tables: existing/new horizontal scroll wrappers are keyboard focusable and named regions; all columns stay accessible without page-level scrolling.

### `web/app/pages/staff/catalog/new.vue`

- Container gutters: 16px below sm; 24px at sm and existing lg gutters retained.
- Panels: reduce padding to 16px below sm; restore 32px at sm (640px).
- Large headings: 30px below sm; original larger type at sm (640px).
- Action rows wrap when their contents exceed available width; no fixed breakpoint.

### `web/app/pages/staff/index.vue`

- Container gutters: 16px below sm; 24px at sm and existing lg gutters retained.
- Panels: reduce padding to 16px below sm; restore 24px at sm (640px).
- Large headings: 30px below sm; original larger type at sm (640px).

### `web/app/pages/staff/inventory.vue`

- Panels: reduce padding to 16px below sm; restore 24/32/40px at sm (640px).
- Tables: existing/new horizontal scroll wrappers are keyboard focusable and named regions; all columns stay accessible without page-level scrolling.

### `web/app/pages/staff/manager/index.vue`

- Panels: reduce padding to 16px below sm; restore 24px at sm (640px).

### `web/app/pages/staff/manager/reports.vue`

- Container gutters: 16px below sm; 24px at sm and existing lg gutters retained.
- Panels: reduce padding to 16px below sm; restore 24/40px at sm (640px).
- Large headings: 30px below sm; original larger type at sm (640px).
- Tables: existing/new horizontal scroll wrappers are keyboard focusable and named regions; all columns stay accessible without page-level scrolling.

### `web/app/pages/staff/orders/[id].vue`

- Container gutters: 16px below sm; 24px at sm and existing lg gutters retained.
- Panels: reduce padding to 16px below sm; restore 24/40px at sm (640px).
- Large headings: 30px below sm; original larger type at sm (640px).
- Staff order: cancellation action/help row wraps when space runs out, at every width.
- Tables: existing/new horizontal scroll wrappers are keyboard focusable and named regions; all columns stay accessible without page-level scrolling.

### `web/app/pages/staff/orders/index.vue`

- Container gutters: 16px below sm; 24px at sm and existing lg gutters retained.
- Panels: reduce padding to 16px below sm; restore 24/32/40px at sm (640px).
- Large headings: 30px below sm; original larger type at sm (640px).
- Tables: existing/new horizontal scroll wrappers are keyboard focusable and named regions; all columns stay accessible without page-level scrolling.

### `web/app/pages/staff/pos/index.vue`

- Container gutters: 16px below sm; 24px at sm and existing lg gutters retained.
- Panels: reduce padding to 16px below sm; restore 24/32px at sm (640px).
- Large headings: 30px below sm; original larger type at sm (640px).
- POS: search/category use two fluid columns at md (768px) with actions on their own row; order controls wrap; remove ineffective sticky panel offset that could conflict with the header.

### `web/app/components/catalog/ProductCard.vue`

- Product cards: name and price can wrap onto separate rows when content exceeds available width.

### `web/app/components/catalog/ProductQuickViewModal.vue`

- Quick view: dynamic viewport height minus 32px outer padding, above sticky header; 16px mobile details padding, 28px at sm and existing 40px at md; larger close target and smaller mobile placeholder.
