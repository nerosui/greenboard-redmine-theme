# Greenboard DESIGN.md — design spec (v1)

Audience: anyone changing or reviewing the theme. Ownership of shared components is in `COMPONENTS.md`.
This file says **what the result must look like**; how you reach it (CSS vs. small idempotent JS) is up to the owner,
within the rules in `COMPONENTS.md`. Where this spec and the current CSS disagree, this spec wins.

Reference feel: Backlog (Nulab) — light, friendly, roomy, green accent, white cards on a pale grey canvas,
big readable Japanese text, forms with labels above fields. We imitate the *patterns*, never the brand assets
(no Backlog logo, icons, mascots, illustrations, or copied copy). Icons = Redmine's SVG sprite or pure CSS only.

---

## 0. Audit of the current state (2026-11-22, viewport 1273px) — why it looks unfinished

These are the root causes. Fixing them is more important than any decoration.

| # | Problem (seen on) | Fix (section) |
|---|---|---|
| A1 | Body text is 13px, inputs are 24px tall with 13.3px text, buttons 28px. Everything feels tiny and cramped (all pages). | Type scale 14px base, 36px controls (§1.2, §2) |
| A2 | Forms use Redmine's `.tabular` label-left layout inside a grey box; labels right-aligned bold, far from narrow fields; fieldset legends are raw (new issue, edit, wiki edit, documents new, settings). | Label-above "stacked" form pattern (§2.4) |
| A3 | Content pages (文書 list, 文書 detail, ニュース, フォーラム, ロードマップ, Wiki) are unstyled core markup on a single huge white card: no item separation, italic dates, no meta row, no empty states. | Per-feature layouts (§3) |
| A4 | Rendered `.wiki` content: 13px, headings barely differ from body, tight line-height, weak table/code/quote styling. | Wiki typography (§3.5) |
| A5 | The main white card always stretches to the full viewport height with content in the top fifth → giant blank slab. | `#content` cards hug their content (§3.1) |
| A6 | Right `#sidebar` is an unstyled grey column of tiny links; it steals width from the issue table (題名 wraps into 3 lines). | Sidebar card spec + list width rules (§3.1, §3.3) |
| A7 | Avatars are square two-letter blocks ("プ確") that collide with the tracker badge on the issue header; inconsistent with the round initial avatars on the dashboard. | One avatar component (§2.9) |
| A8 | `.contextual` action links (編集 / 時間を記録 / ウォッチ…) are 11–12px icon links, duplicated at the bottom, visually weaker than body text. | Action-bar spec (§2.1, §3.3) |
| A9 | Query filters/options (`#query_form`) are raw fieldsets with legend lines on issues, board, gantt, calendar. | Filter bar spec (§3.3) |
| A10 | Tabs (`.tabs`) are tiny boxed browser-style tabs. | Underline tabs (§2.10) |
| A11 | Admin pages lose the shell (no left nav; plain icon list); settings forms have the A2 problem. | Admin layout (§3.8) |
| A12 | Native file input (`ファイル選択 選択されていません`) shown raw everywhere. | Dropzone (§2.12) |
| A13 | Filled primary buttons are white text on `#3fae8a` (contrast 2.8:1). | Stronger button green (§1.1) |

---

## 1. Design tokens

All tokens live in `00-tokens.css` (owner: global-shell). Existing names keep working (never rename/remove);
global-shell **adds** the tokens below and sets the existing ones to the listed values. Other owners use tokens only —
no raw hex in feature CSS except the tracker/priority colours listed here.

### 1.1 Colour

```css
:root {
  /* brand green */
  --gb-primary:        #3fae8a;  /* brand, accents, active indicators, progress fill, focus ring base (existing) */
  --gb-primary-strong: #1a7f5e;  /* NEW filled-button bg, link text. 4.9:1 on white */
  --gb-primary-hover:  #146b4f;  /* NEW hover of filled buttons / links */
  --gb-primary-dark:   #2c8f70;  /* existing; use only for borders/icons, not text-on-fill */
  --gb-primary-soft:   #e8f6f1;  /* existing; selected rows, hover tint, soft buttons */
  --gb-primary-softer: #f3faf7;  /* NEW table row hover, subtle panels */
  --gb-primary-border: #b9e0d2;  /* NEW border of soft/outlined green things */

  /* neutrals */
  --gb-bg:        #f2f4f3;  /* page canvas (existing) */
  --gb-surface:   #ffffff;  /* cards (existing) */
  --gb-surface-2: #f7f9f8;  /* NEW table header, meta strips, code bg, read-only fields */
  --gb-surface-3: #eef1f0;  /* NEW chips, pressed, progress track */
  --gb-border:        #e0e5e3;  /* card + divider (existing) */
  --gb-border-strong: #c9d1ce;  /* NEW input borders */
  --gb-text:   #2f3a37;  /* body (existing) */
  --gb-text-2: #55625e;  /* NEW secondary text, labels of meta. 6:1 */
  --gb-muted:  #74807c;  /* existing; placeholder, timestamps ≥12px only */
  --gb-disabled: #a9b3b0; /* NEW */

  /* left nav (existing) */
  --gb-nav-bg: #2f3e3b; --gb-nav-text: #cfe0da; --gb-nav-active: #3f524e;

  /* status (existing ids; do not change values) */
  --gb-st-1: #ed8077; /* 未対応 */  --gb-st-2: #4488c5; /* 処理中 */
  --gb-st-3: #5eb5a6; /* 処理済み */ --gb-st-4: #f0a24a; /* フィードバック */
  --gb-st-5: #a1af2f; /* 完了 */    --gb-st-6: #a5a5a5; /* 却下 */

  /* semantic NEW */
  --gb-danger: #d64545;  --gb-danger-hover: #b93636; --gb-danger-soft: #fdeceb; --gb-danger-border: #f3bcb8;
  --gb-warning: #b7791f; --gb-warning-soft: #fff6e0; --gb-warning-border: #f1d99a;
  --gb-info: #2f6fb0;    --gb-info-soft: #eaf3fb;    --gb-info-border: #bcd6ee;
  --gb-success: #1a7f5e; --gb-success-soft: #e8f6f1; --gb-success-border: #b9e0d2;

  /* tracker badge colours NEW (by tracker id of the Japanese default data) */
  --gb-tr-1: #e0625b; /* バグ */  --gb-tr-2: #7fa32b; /* 機能 */  --gb-tr-3: #e09a2f; /* サポート */
  --gb-tr-default: #6b8fb5;

  /* priority NEW (text/arrow colour only, never row backgrounds) */
  --gb-prio-low: #4488c5; --gb-prio-normal: #74807c; --gb-prio-high: #e0625b; /* 高め/急いで/今すぐ all use high */

  /* avatar palette NEW (8 colours, white text) */
  --gb-av-0:#4a9d7c; --gb-av-1:#4488c5; --gb-av-2:#c9772e; --gb-av-3:#8a6bb8;
  --gb-av-4:#c85a7c; --gb-av-5:#3d93a8; --gb-av-6:#8a9a2e; --gb-av-7:#b06045;
}
```

Rules: links are `--gb-primary-strong`, hover `--gb-primary-hover` + underline. No blue links anywhere (except diff
viewer/syntax highlighting). Core Redmine blues/yellows (`#ffffdd` highlights, `#628DB6`, etc.) must not survive on any page.
Overdue dates: `--gb-danger` + bold. Never use background colour on whole issue rows for priority.

### 1.2 Typography

```css
--gb-font: "Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic UI",Meiryo,system-ui,sans-serif;
--gb-font-mono: "SFMono-Regular",Menlo,Consolas,"Noto Sans Mono CJK JP",monospace;
--gb-fs-xs: 11px;   /* counters in badges only */
--gb-fs-sm: 12px;   /* meta, timestamps, table headers, pills */
--gb-fs-md: 14px;   /* BODY, inputs, buttons, table cells, nav */
--gb-fs-lg: 16px;   /* card titles (h3), subject input on issue form */
--gb-fs-xl: 20px;   /* page title (#content > h2) */
--gb-fs-2xl: 24px;  /* issue subject on detail page, wiki h1 */
--gb-lh-tight: 1.35; --gb-lh: 1.6; --gb-lh-prose: 1.8;
--gb-fw-normal: 400; --gb-fw-medium: 500; --gb-fw-bold: 600;   /* Hiragino W6 */
```

- `body` = 14px / 1.6 / `--gb-text`. **Nothing readable is below 12px.** 11px only inside count badges.
- No italics for Japanese text anywhere (`em`, dates, "author" lines → normal style, `--gb-text-2`).
- Numbers that line up (IDs, dates, hours, counts): `font-variant-numeric: tabular-nums`.
- Headings: `#content > h2` 20/600, margin `0 0 16px`; `h3` 16/600; `h4` 14/600. No borders under h2/h3 outside `.wiki`.

### 1.3 Spacing, radii, shadows, z-index, motion

```css
--gb-sp-1:4px; --gb-sp-2:8px; --gb-sp-3:12px; --gb-sp-4:16px; --gb-sp-5:20px; --gb-sp-6:24px; --gb-sp-8:32px; --gb-sp-10:40px;
--gb-radius-sm:4px;  /* inputs, buttons, small chips, code */
--gb-radius:8px;     /* cards, modals, dropzones (existing) */
--gb-radius-lg:12px; /* large panels: compact comment panel, dashboard project cards */
--gb-radius-pill:999px;
--gb-shadow:    0 1px 2px rgba(20,40,34,.06), 0 2px 8px rgba(20,40,34,.05);   /* cards (existing) */
--gb-shadow-md: 0 4px 16px rgba(20,40,34,.12);                                 /* dropdowns, menus, sticky bars */
--gb-shadow-lg: 0 12px 40px rgba(20,40,34,.22);                                /* modals */
--gb-focus: 0 0 0 3px rgba(63,174,138,.30);                                    /* focus ring (with border --gb-primary) */
--gb-control-h: 36px; --gb-control-h-sm: 28px; --gb-control-h-lg: 44px;
--gb-content-max: 1280px;  /* max width of #content inner area on wide screens */
--gb-form-max: 960px;      /* max width of stacked forms */
--gb-prose-max: 860px;     /* max line length of rendered .wiki prose */
--gb-z-sticky:20; --gb-z-nav:100; --gb-z-topbar:110; --gb-z-dropdown:200; --gb-z-modal:1000; --gb-z-toast:1100;
--gb-ease: cubic-bezier(.2,.7,.3,1); --gb-dur-1:120ms; --gb-dur-2:200ms;
```

- Page gutter: `#content` padding 24px (16px ≤ 900px). Card padding 20px 24px. Gap between cards 16px.
- Vertical rhythm inside a card: 16px between blocks, 8px between a label and its field, 20px between form rows.
- Motion: colour/border/shadow transitions `--gb-dur-1`; panel open/close `--gb-dur-2`. Respect `prefers-reduced-motion`
  (no transitions). No bouncing, no parallax.
- Focus: every interactive element shows `outline: none; border-color: var(--gb-primary); box-shadow: var(--gb-focus)`
  on `:focus-visible`. Never remove focus without replacing it.

---

## 2. Components (mapped to Redmine markup)

global-shell implements these generically in `10-global.css` so every page gets them for free. Feature owners only
add page-specific layout. If a generic component is wrong on your page, request a fix instead of forking it.

### 2.1 Buttons

Heights: md 36px (default), sm 28px (inside tables, card headers, toolbars), lg 44px (never needed except mobile submit).
Padding md `0 16px`, sm `0 10px`. Font 14px/600 (sm: 12px/600). Radius 4px. Min-width 80px for form submits.
Icon inside button: 16px, gap 6px. One primary button per view region.

| Variant | Applies to | Rest | Hover | Disabled |
|---|---|---|---|---|
| **Primary** | `input[type=submit]`, `button[type=submit]`, `.gb-btn--primary`, the page-level "新しい…" action (`.contextual a.icon-add` when it is the page's main create action) | bg `--gb-primary-strong`, text #fff, no border | bg `--gb-primary-hover` | bg `--gb-surface-3`, text `--gb-disabled` |
| **Secondary** | `input[type=button]`, `button` (non-submit), `a.button`, `.gb-btn`, the second submit ("連続作成", "プレビュー") | bg #fff, border 1px `--gb-border-strong`, text `--gb-text` | bg `--gb-surface-2`, border `--gb-primary`, text `--gb-primary-strong` | as above |
| **Text** | "キャンセル" links next to submits, `.contextual` secondary actions, "すべて見る" | no bg/border, text `--gb-primary-strong`, padding `0 8px`, height like md | bg `--gb-primary-soft` | — |
| **Danger** | delete confirmations (`.icon-del` when it is a button), `input[type=submit]` inside delete-confirm pages | bg #fff, border `--gb-danger-border`, text `--gb-danger` (filled `--gb-danger` + white only on the confirm page) | bg `--gb-danger-soft` | — |
| **Icon button** | `…` menus, edit pencils, collapse arrows | 28×28, radius 4px, icon 16px `--gb-text-2` | bg `--gb-surface-3`, icon `--gb-text` | — |

Rules
- When several submits sit together, only the first is primary; the others ("連続作成", "保存して続ける") are secondary.
- Button row order (left-aligned forms): `[Primary] [Secondary…] [Text: キャンセル]`, gap 8px. In modals and the sticky
  form footer the row is right-aligned in the order `[キャンセル] [Secondary] [Primary]`.
- **Page action bar** (`#content > .contextual`): floats right on the same line as `h2`. Links become 28px text
  buttons with 16px icon + 13px/500 label, gap 4px; the main create action is a 32px primary button. The duplicate
  bottom `.contextual` on issue pages is hidden on desktop. Overflow `…` (`.drdn`) is an icon button; its menu is a
  dropdown card (§2.11).

### 2.2 Text inputs, selects, textarea

- `input[type=text|email|password|number|date|search|url|tel]`, `select`, `textarea`:
  height 36px (textarea auto), padding `0 10px` (textarea `8px 10px`), font 14px `--gb-font`, colour `--gb-text`,
  bg #fff, border 1px `--gb-border-strong`, radius 4px, `box-sizing: border-box`.
- Hover: border `#aab5b1`. Focus: §1.3 focus. Placeholder: `--gb-muted`.
- Disabled/readonly: bg `--gb-surface-2`, text `--gb-text-2`, no hover.
- `select`: `appearance: none`, custom chevron (CSS background SVG data-URI, 16px, right 10px), padding-right 32px.
  `select[multiple]`: height auto, min 96px, options padding 4px 8px.
- `textarea`: min-height 120px, `resize: vertical`, line-height 1.6. Editor textareas (`.wiki-edit`): font 14px
  `--gb-font` (NOT monospace 12px), min-height 200px.
- Date inputs: width 160px. Number/hours inputs: width 96px. Short selects (進捗率): width 120px.
  Everything else: `width: 100%` of its grid cell, with `max-width` set by the form layout.
- Small variant (28px, 13px text) only inside filter bars, table cells, pagination ("per page").
- Error state: fields inside `.field_with_errors` or with `aria-invalid` → border `--gb-danger`, focus ring red
  `0 0 0 3px rgba(214,69,69,.2)`; label turns `--gb-danger`.

### 2.3 Checkbox, radio, toggle

- Native controls with `accent-color: var(--gb-primary-strong)`; size 16×16; `vertical-align: -3px`; gap 8px to label.
- Clickable label: `cursor: pointer`; whole row min-height 28px.
- Checkbox groups (watchers, modules, trackers, roles): CSS grid `repeat(auto-fill, minmax(180px, 1fr))`, gap `4px 16px`;
  each `label.floating`/`label.block` is `display:flex; align-items:center`; no float layout.
- A single boolean setting (`公開`, `プライベート`) shows as checkbox + label on one line, help text below in 12px `--gb-text-2`.

### 2.4 Form layout patterns — which to use when

**Pattern S — Stacked (label above field). DEFAULT for every create/edit form users see daily**:
issue new/edit/copy, wiki edit/rename, document, news, forum message, file upload, version, category, time entry,
project new/info, my account. Implementation on Redmine's `.tabular`:

```css
/* stacked: cancel core's 180px gutter */
.tabular p { padding-left: 0; margin: 0 0 20px; }
.tabular p > label:first-child { float: none; display: block; width: auto; margin: 0 0 6px; text-align: left;
  font-size: 13px; font-weight: 600; color: var(--gb-text); }
```
- Required mark: `label .required` → red `--gb-danger` `*` with 2px left gap (keep the asterisk; no "必須" chip needed).
- Help text (`em.info`): block, 12px, `--gb-text-2`, normal style, margin-top 4px.
- The outer `.box.tabular` of a stacked form has **no grey background and no border**: the form sits directly on the
  white `#content` card, max-width `--gb-form-max`. (Kills the "box in a box" look.)
- `fieldset` inside forms: no border; `legend` becomes a section title 14px/600 with a 1px `--gb-border` top divider and
  24px top padding (first one has none). Collapsible fieldsets keep their chevron, left of the legend.
- Multi-column: CSS grid, `grid-template-columns: repeat(2, minmax(0, 1fr))`, gap `0 24px`; short fields
  (dates, hours, %) may sit in a 4-column sub-grid. Collapse to 1 column ≤ 900px.

**Pattern T — Tabular (label left, 200px column). Only for dense settings screens**: Administration → Settings tabs,
custom field / role / tracker / workflow / auth-source / enumeration forms, project settings sub-forms with many
boolean rows. Spec: label column 200px, left-aligned, 13px/600, vertically centred to the 36px control; row gap 12px;
field max-width 480px; the form sits in a white card with 20px 24px padding (no grey box). ≤ 900px falls back to Pattern S.

**Pattern I — Inline filter row**: query filters and list toolbars (§3.3).

Never mix S and T inside one form.

### 2.5 Tables (`table.list`)

- Wrapper: full-width, `border-collapse: separate; border-spacing: 0`, inside the card, with horizontal scroll container
  (`.autoscroll`) when needed — the page itself must never scroll horizontally.
- Header: bg `--gb-surface-2`, 12px/600 `--gb-text-2`, height 36px, padding `0 12px`, bottom border 1px `--gb-border`,
  `white-space: nowrap`, left-aligned (numbers right-aligned). Sort links inherit colour; active sort column
  `--gb-text` with a 12px arrow.
- Rows: min-height 44px, cell padding `10px 12px`, 14px, bottom border 1px `--gb-border`, no zebra, no vertical lines.
  Hover: bg `--gb-primary-softer`. Selected (`.context-menu-selection`): bg `--gb-primary-soft`, text stays `--gb-text`
  (core turns it white-on-blue: override, including links).
- Cell alignment: left by default (core centres everything — override); id/date/hours/% `nowrap` + tabular-nums;
  checkbox column 36px; `…` action column 40px right-aligned.
- Primary text column (subject/title/name) takes the remaining width, `min-width: 240px`, link colour `--gb-text` with
  `--gb-primary-strong` on hover, weight 500. Wraps to max 2 lines.
- Group rows (`tr.group`): bg `--gb-surface-2`, 13px/600, count as a grey pill.
- Totals/pagination below: §2.14.

### 2.6 Cards / boxes

- Card: bg `--gb-surface`, border 1px `--gb-border`, radius 8px, shadow `--gb-shadow`, padding `20px 24px`.
- Card header: title 16px/600 left; optional right slot with a text button ("すべて見る") or sm buttons; 16px gap below.
  No header background, no underline.
- `#content` itself is the main card (see §3.1). Cards nested inside `#content` (`.box`, dashboard blocks inside it)
  drop the shadow and use `--gb-surface-2` bg OR a plain 1px border — never shadow-on-shadow.
- `.box` in read views (issue attributes, version overview): bg `--gb-surface-2`, no border, radius 8px, padding 16px 20px.
- `div.nodata` / empty states: §2.13.

### 2.7 Badges / pills

| Thing | Spec |
|---|---|
| **Status pill** (`.gb-status`, issue status everywhere) | height 22px, padding `0 10px`, radius pill, 12px/600 #fff on `--gb-st-N`, `min-width: 64px`, centred, `nowrap`. Unknown status id → `--gb-st-6`. |
| **Tracker badge** | height 20px, padding `0 8px`, radius pill, 11px/600 #fff on `--gb-tr-N`. On the board and lists. |
| **Count badge** | height 18px, min-width 18px, padding `0 6px`, radius pill, 11px/600, bg `--gb-surface-3`, text `--gb-text-2`. |
| **State tag** (open/closed, 進行中, 未完了, private, locked) | height 20px, padding `0 8px`, radius 4px, 11px/600; neutral: bg `--gb-surface-3` text `--gb-text-2`; open/進行中: `--gb-info-soft`/`--gb-info`; closed/完了: `--gb-success-soft`/`--gb-success`; private: `--gb-danger-soft`/`--gb-danger`. |
| **Priority** | text + arrow icon: ↑ `--gb-prio-high` for 高め以上, → `--gb-prio-normal` 通常, ↓ `--gb-prio-low` 低め. No pill. |
| **Issue key** (`#123`) | 13px/500 `--gb-primary-strong`, tabular-nums, `nowrap`. Closed issues: line-through + `--gb-muted`. |

### 2.8 Progress bars (`table.progress`, `.progress`)

Height 8px, radius pill, track `--gb-surface-3`, fill `--gb-primary`; "done" segment `--gb-primary`, "closed" segment
`--gb-primary-strong`. Percent label 12px/600 `--gb-text-2` to the right, tabular-nums. Width 100% of its container
(max 320px in tables, 120px in issue attributes).

### 2.9 Avatars

One component everywhere: **circle with a single initial** (first grapheme of the user's display name, upper-cased;
`GB.initial(name)`). White 600 text on a deterministic colour.

- Sizes: 20px (inline in tables/board cards; font 11px), 28px (timeline, journal, comments; font 13px),
  36px (issue header author, forum topic; font 15px), 64px (user profile; font 26px).
- Colour: `index = (sum of UTF-16 code units of the full display name) % 8` → `--gb-av-{index}`.
  Same user = same colour on every page. Anonymous/system → `--gb-surface-3` bg, `--gb-text-2` text, initial `?`.
- Request to global-shell: add `GB.avatarIndex(name)` and `GB.avatar(name, size)` (returns
  `<span class="gb-avatar gb-avatar--{size}" data-av="{index}" aria-hidden="true">X</span>`) to `00-core.js`, and
  `.gb-avatar` CSS to `10-global.css`. All features use this helper; nobody draws their own avatar.
- Never two letters, never square, never overlapping another element. Where Redmine prints the name next to it,
  the avatar is `aria-hidden` (name is the accessible label).

### 2.10 Tabs (`.tabs` — settings, issue history, wiki-edit 編集/プレビュー)

Underline style. Container: bottom border 1px `--gb-border`, margin-bottom 20px, no background, horizontal scroll with
hidden scrollbar when overflowing (core's scroll buttons `.tabs-buttons` hidden).
Tab: height 40px, padding `0 14px`, 14px/500 `--gb-text-2`, no border/box/radius. Hover: text `--gb-text`,
2px bottom border `--gb-border-strong`. Selected: text `--gb-primary-strong`, 600, 2px bottom border `--gb-primary`.
Editor tabs (`.jstTabs`) are the sm variant: height 32px, 13px.

### 2.11 Dropdowns, context menu, tooltips

Menu card (`.drdn-content`, `#context-menu ul`, `.gb-user__menu`, jQuery UI autocomplete, datepicker): bg #fff,
border 1px `--gb-border`, radius 8px, shadow `--gb-shadow-md`, padding 6px, min-width 180px, z `--gb-z-dropdown`.
Item: height 32px, padding `0 10px`, radius 4px, 14px, icon 16px `--gb-text-2`, gap 8px. Hover/focus: bg
`--gb-primary-soft`. Checked item: ✓ in `--gb-primary-strong`. Destructive item: text `--gb-danger`. Divider 1px `--gb-border`, margin 4px 0.
Datepicker: selected day = filled `--gb-primary-strong` circle; today = 1px `--gb-primary` ring; weekend header red/blue not needed.
Tooltips (`.ui-tooltip`): bg `#2f3a37`, text #fff 12px, radius 4px, padding `4px 8px`, no border.

### 2.12 Attachments / dropzone (`.attachments_form`, `.filedroplistner`)

- Dropzone: full width of the form, min-height 72px, border 1.5px dashed `--gb-border-strong`, radius 8px,
  bg `--gb-surface-2`, centred row: upload icon 20px + text 「ファイルをドラッグ＆ドロップ、または」 + a secondary sm button
  「ファイルを選択」 (this is the styled native `input.file_selector` — keep the real input focusable/clickable; hide only its
  default chrome via `::file-selector-button` styling or an overlaying label, never `display:none`).
  Size limit text (`(サイズの上限: 5 MB)`) below-right in 12px `--gb-text-2`.
- Drag-over (`.fileover`): border `--gb-primary` solid, bg `--gb-primary-soft`.
- Uploaded list (`.attachments_fields > span`): one row per file, 36px high, bottom divider; file icon, filename input
  (borderless until focus), optional description input (placeholder 説明), size, progress bar 4px while uploading,
  remove icon button at the far right.
- Existing attachments (read views, `.attachments`): rows 36px with file-type icon, name link, size in `--gb-text-2`,
  author + date 12px, download/delete icon buttons on the right; image thumbnails 120px wide, radius 4px, 1px border.

### 2.13 Empty states (`p.nodata`)

Centred block inside the card: 40px grey sprite icon (matching the module) at 40% opacity, 14px/600 `--gb-text-2`
message, optional 13px hint, optional primary sm button (the page's create action). Padding 40px 16px. No yellow box,
no border. Copy tone: 「表示するデータがありません。」 (core) is fine; where a create action exists add e.g.
「最初の文書を追加しましょう。」 via locale request.

### 2.14 Pagination, counts, export links

`.pagination`: left = page buttons (28×28 icon-button style, current = `--gb-primary-soft` bg + `--gb-primary-strong`
600), right = "(1-25/120)" + per-page links in 12px `--gb-text-2`. Top margin 16px.
`p.other-formats`: right-aligned 12px `--gb-text-2`, links as text buttons sm (CSV / PDF / Atom), top margin 12px,
no "|" clutter if avoidable.

### 2.15 Flash / toasts / inline alerts

- `#flash_notice`, `#flash_error`, `#flash_warning`, `#errorExplanation`, `.warning`, `.conflict`, `.nodata` (not empty state):
  in-flow alert at the top of `#content`: radius 8px, padding `12px 16px 12px 44px`, 14px, 1px border, 20px icon at left 14px.
  notice → `--gb-success-soft` / border `--gb-success-border` / text `#14553f`; error → danger set, text `#8f2a2a`;
  warning → warning set, text `#7a5211`.
- `#flash_notice` additionally behaves as a toast when it is the result of a save: fixed top-centre under the top bar
  (top 64px), max-width 560px, shadow `--gb-shadow-md`, slides in 200ms, auto-dismiss after 5s, pause on hover, has a
  close icon button, `role="status"`. Errors never auto-dismiss and never float.
- `#errorExplanation` lists errors as a `<ul>` with 4px gaps; heading text 14px/600; see §3.2 for field-level errors.

### 2.16 Modals (`#ajax-modal`, jQuery UI dialog)

Overlay `rgba(20,30,27,.45)`. Dialog: radius 12px, shadow `--gb-shadow-lg`, bg #fff, no jQuery-UI chrome borders,
width `min(560px, calc(100vw - 32px))` (issue quick-create on the board: 720px). Title bar: padding `16px 20px`,
16px/600, no background, bottom border 1px `--gb-border`, close = icon button top-right. Body padding 20px, uses
Pattern S. Footer (`p.buttons`): padding `12px 20px`, top border, right-aligned `[キャンセル] [Primary]`.
Focus goes to the first field on open; Esc closes; focus returns to the trigger.

### 2.17 Timeline / activity items (dashboard 最近の更新, project home, `/activity`, issue journals)

Row: `grid-template-columns: 28px 1fr auto`, gap 12px, padding `12px 0`, bottom divider 1px `--gb-border` (none on last).
- Col 1: 28px avatar.
- Col 2 line 1 (13px `--gb-text-2`): **Name** (600, `--gb-text`) + 「さんが課題を追加しました」.
  Line 2 (14px/500 `--gb-text`): linked title, single line with ellipsis; issue titles are prefixed by tracker badge + key.
  Line 3 optional (13px `--gb-text-2`, max 2 lines, clamp): excerpt — plain text, **no grey box** around it
  (the current grey "作業" boxes go away).
- Col 3: relative time 12px `--gb-muted`, `nowrap`, with absolute time in `title`.
- Day separators (`/activity` `h3`): sticky-less 13px/600 `--gb-text-2`, margin `20px 0 4px`.

---

## 3. Per-feature guidance

Priority tags: **P0** = must fix (broken/unfinished look), **P1** = needed for "complete", **P2** = polish.

### 3.1 global-shell

Layout
- Top bar: 52px, white, 1px bottom border, fixed. Left brand block (existing green block with white mark + site name —
  our own mark, not Backlog's). Then global links (ホーム / ダッシュボード / プロジェクト / 管理) 14px/500, 52px tall hit area,
  active = `--gb-primary-strong` text + 2px bottom bar. Right side, in order: search, project jump, 「課題の追加」
  primary button (32px), user menu (28px avatar + name + chevron).
- **P0 Search**: remove the visible "検索:" label (keep it for screen readers); one 32px input, width 220px
  (grows to 300px on focus), radius pill, bg `--gb-surface-2`, search icon inside left, placeholder 「検索」.
- **P0 Project jump** (`#project-jump`): 32px secondary-button look with chevron, max-width 200px, ellipsis;
  its dropdown uses the §2.11 menu card with a search field on top.
- Left project nav (208px, dark): keep. Items 36px high, 14px, icon 18px, radius 6px, active = `--gb-nav-active` bg +
  3px `--gb-primary` left bar + white text. The 「追加」 item at the top looks like a green button (32px, radius 6px)
  and opens the new-issue page. Collapsed state: 56px rail, icons only, tooltips with labels.
- **P0 `#main` / `#content`**: `#content` is a white card (radius 8px, shadow, padding 24px) that **hugs its content**
  (`min-height: 0`; remove any full-height stretch). The canvas shows below it. Max inner width `--gb-content-max`;
  on wider screens the card stays left-aligned next to the nav (not centred).
- **P0 Right `#sidebar`**: 240px card (same card style, padding 16px), `position: sticky; top: 68px`,
  `align-self: start`. Headings (`h3`) 12px/600 `--gb-text-2`, margin `16px 0 6px` (first: 0). Links 13px, 28px rows,
  hover bg `--gb-primary-soft`, radius 4px, padding `0 8px`; current/selected link 600 + soft bg (no solid blue block).
  Collapse toggle = icon button at the card's top-right; collapsed state hides the card completely and the content takes
  full width. When `#sidebar` is empty it takes no space at all.
- Project title bar (`#header h1` area showing the project name): 16px/600 with the 28px rounded-square project
  avatar; breadcrumb for subprojects 12px.
- Footer: 12px `--gb-muted`, centred, 16px padding. Fine as is.
- Generic components from §2 all live here: buttons, inputs, tables, tabs, flash, modal, pagination, menus, datepicker,
  tooltips, avatars, empty state, attachments read view, `.tabular` Pattern S default + Pattern T opt-in class list.

Pages
- `/` home: welcome text card + (if any) latest news card; same card system. `/projects`: project cards grid
  (`minmax(280px,1fr)`, gap 16px): 36px rounded-square initial avatar (deterministic colour), name 15px/600,
  identifier 12px `--gb-muted`, description 13px 2-line clamp, footer links 課題 / ボード / Wiki as text buttons.
  List view = standard table.
- `/search`: search form as a filter bar (§3.3 style); results as timeline-like rows (type icon, title 14px/500,
  excerpt 13px with `<span class="highlight">` in `--gb-warning-soft`, date right).
- `/users/:id`: header with 64px avatar, name 20px/600, meta list; two cards: 担当している課題 / 活動 (timeline).
- `/my/account`, `/my/password`: Pattern S, max 640px, sections 情報 / メール通知 / 設定 as fieldset titles.
- `/login` (inspect via curl only): centred 380px card on the canvas, brand mark on top, Pattern S, full-width
  primary lg button, links below in 13px.
- 404/403 (`#errorExplanation` standalone, `p#errorExplanation`): centred empty-state style with 「前のページに戻る」 text button.

Acceptance — global-shell
- [ ] Body text computes to 14px; no visible text < 12px on any audited page (check with `getComputedStyle`).
- [ ] All text inputs/selects are 36px high, buttons 36px (sm 28px); primary button bg is `#1a7f5e`.
- [ ] `#content` card height hugs content on `/documents/3` (no blank white slab to the viewport bottom).
- [ ] Right sidebar is a white sticky card with 13px links; no solid-colour "selected" block; collapses to zero width.
- [ ] Header search has no visible "検索:" label; search and project jump are 32px, aligned on one baseline with the green button.
- [ ] Tabs are underline style on `/projects/demo/settings`; selected tab green.
- [ ] Flash notice after saving appears as a green toast and disappears; flash error stays in flow in red.
- [ ] `#ajax-modal` (e.g. new category) has radius 12px, title bar without jQuery-UI gradient, right-aligned footer buttons.
- [ ] Context menu, user menu, datepicker, autocomplete all share the menu-card look.
- [ ] Keyboard: Tab shows a visible green focus ring on links, buttons, inputs, nav items.
- [ ] No horizontal page scrollbar at 1273px and 1024px on any audited page.

### 3.2 issue-form — TOP PRIORITY

Applies to: new (`/projects/demo/issues/new`, `/issues/new`), copy, full edit (`/issues/3/edit` and inline edit on show),
compact comment panel, bulk edit. Goal: Backlog's "課題の追加" feel — a calm single column you fill top-to-bottom,
big subject, roomy editor, attributes in a tidy 2-column grid, a clear sticky action bar. Do not override ERB;
restyle Redmine's DOM (`form#issue-form > .box.tabular > #all_attributes …`) and enhance with idempotent JS.
`#all_attributes` is re-rendered by AJAX on tracker/status/project change → every decoration must be CSS-driven or
re-applied through `GB.onAjax`.

#### 3.2.1 Page frame (new / copy / edit)

- Page title `h2` 「新しい課題」 / 「課題の編集」 20px/600. On edit, show `トラッカー #3` as tracker badge + key next to it.
- Form column: `max-width: 960px`, left-aligned inside the `#content` card. The `.box.tabular` wrapper has no
  background/border/padding (Pattern S). No right sidebar on these pages (content takes the full width).
- Vertical order of sections, with 24px between sections:
  1. Header row: トラッカー (＋ プロジェクト on edit/`/issues/new`) and プライベート
  2. 題名
  3. 説明
  4. Attribute grid card
  5. ファイル (dropzone)
  6. ウォッチャー (new only) / 時間を記録 + コメント (edit only)
  7. Sticky action bar

#### 3.2.2 Field order, grid and widths

Tab order = DOM order = visual order (top→bottom, left column then right column). Do not use CSS `order` to move
fields across that sequence.

| Row | Field (Redmine id) | Layout |
|---|---|---|
| 1 | プロジェクト (`#issue_project_id`, when present), トラッカー (`#issue_tracker_id`) | inline row; each `label` above, select width 220px; gap 16px |
| 1 → right | プライベート (`#issue_is_private_wrap`) | same row, pushed right (`margin-left:auto`), checkbox + label, 13px, vertically aligned with the selects' centre line. Not floating over other fields. |
| 2 | 題名 (`#issue_subject`) | full width; **height 44px, 16px/500**; placeholder 「題名を入力」 (JS sets `placeholder` if empty attr; request locale key); autofocus on new |
| 3 | 説明 (`#issue_description_and_toolbar`) | full width editor (§3.2.3). On edit Redmine hides it behind 「編集」 pencil link → style that link as a secondary sm button 「説明を編集」 and show the current description as a collapsed 3-line preview above it if feasible (P2); otherwise just the button. |
| 4 | Attribute grid (`#attributes .splitcontent`) | a **card**: bg `--gb-surface-2`, radius 8px, padding `20px 24px 4px`. Two columns `repeat(2, minmax(0,1fr))`, column gap 32px. Inside each column every `p` is Pattern S (label above), margin-bottom 16px. |
| 4L | ステータス, 優先度, 担当者, カテゴリ, マイルストーン (対象バージョン) | selects `width:100%` (max 360px). The helper links/icons after a select (「自分に割り当て」, 「処理済みに設定」, ＋ new category/version) sit **on the label line, right-aligned** as 12px text buttons / 24px icon buttons — not after the select where they break widths. (CSS: `p{display:grid; grid-template-columns:1fr auto;}` label = col 1 row 1, helper = col 2 row 1, control = row 2 spanning both.) |
| 4R | 親課題 (`#issue_parent_issue_id`) | width 100% (max 360px), search icon inside left, placeholder 「課題番号または題名で検索」 |
| 4R | 開始日, 期限日 | **side by side** in one row (2 × 160px, gap 16px) with a "〜" not required; native date input 36px with our border; calendar icon inside right |
| 4R | 予定工数, 進捗率 | side by side: hours input 96px + suffix 「時間」 13px `--gb-text-2`; % select 120px |
| 4 | custom fields | continue the same grid; long-text custom fields span both columns |
| 5 | ファイル (`#attachments_form`) | label 「ファイル」 above; dropzone §2.12 full width |
| 6 | ウォッチャー (`#watchers_form`) | label above; checkbox grid §2.3 (min 180px columns); 「ウォッチャーを検索して追加」 as text button sm under the grid. Collapsed by default behind a disclosure 「ウォッチャーを追加 (4)」 if there are > 8 users (P2). |

Disabled/read-only attributes (workflow) show as §2.2 disabled style, not as bare text.
Required attributes keep the red `*`. Labels are 13px/600; do not right-align.

#### 3.2.3 Editor (jsToolbar — shared with wiki/doc/news/forum; issue-form owns the look, global-shell hosts shared rules if needed)

One bordered unit: border 1px `--gb-border-strong`, radius 8px, overflow hidden; focus-within → §1.3 focus ring on the whole unit.
- Top strip (40px, bg `--gb-surface-2`, bottom border 1px `--gb-border`, padding `0 8px`):
  left = tabs 編集 / プレビュー (sm underline tabs, §2.10); then a 1px separator; then toolbar buttons.
- Toolbar buttons (`.jstElements button`): 28×28 icon buttons, 16px icons `--gb-text-2`, 2px gap, groups separated by
  8px + 1px divider; hover bg `--gb-surface-3`. The toolbar wraps onto a second line when narrow (strip grows) — never clips.
- Textarea: borderless inside the unit, padding `12px 14px`, 14px/1.7 `--gb-font`, min-height **240px on new**
  (説明), 160px for コメント on edit, 120px in the compact panel; `resize: vertical`.
- Preview pane (`.wiki-preview`): same padding, min-height same as the textarea, bg #fff, uses `.wiki` typography (§3.5).
  Empty preview shows 「プレビューする内容がありません。」 in `--gb-muted` (P2).
- Inline-autocomplete popups (`#`, `@`) use the menu card.

#### 3.2.4 Action bar

- **Sticky footer bar** for new/copy/edit: `position: sticky; bottom: 0`, bg `rgba(255,255,255,.96)` + backdrop blur 6px,
  top border 1px `--gb-border`, padding `12px 0`, z `--gb-z-sticky`, extends to the card's inner edges
  (negative side margins equal to card padding). It contains Redmine's own submit inputs (moved by CSS/wrapped by JS
  without re-creating them, so names/values still submit):
  - New: `[作成]` primary, `[連続作成]` secondary, `キャンセル` text link (JS adds a link back to the issue list if
    core has none; uses `history.back()` fallback). Left-aligned in that order.
  - Edit: `[送信]` primary — visible label should read 「保存」 (request locale override for `button_submit` in the issue
    edit context if possible; otherwise leave core text), `キャンセル` text.
  - Right end of the bar (P2): hint 「⌘/Ctrl + Enter で送信」 12px `--gb-muted`.
- Submit is disabled + shows a 14px spinner inside the button while the request is in flight (core adds
  `data-disable-with`; style `input[type=submit]:disabled`). No double submit.
- Leaving with unsaved changes keeps core's `warnLeavingUnsaved` behaviour — do not break it.

#### 3.2.5 Edit form specifics (`/issues/3/edit`, inline edit)

Redmine renders fieldsets: プロパティの変更 / 時間を記録 / コメント / ファイル. Present them as stacked sections with
section titles (§2.4 legend style), no nested grey boxes, no fieldset borders:
1. **プロパティの変更** — same header row + 題名 + 説明 + attribute grid card as new.
2. **コメント** — visually moved up to directly follow the properties is NOT allowed via DOM re-order; keep DOM order
   but give コメント the full-width editor (min-height 160px) and placeholder 「コメントを入力（@ でメンバーに通知）」.
   「プライベートコメント」 checkbox sits under the editor, left.
3. **時間を記録** — one compact row (Pattern S, 3 columns): 作業時間 (96px + 「時間」) / 作業分類 (220px select) /
   コメント (flex 1). Collapsed by default behind its legend chevron (P1) since most edits don't log time; expanded if any value is present.
4. **ファイル** — dropzone; 「添付ファイルの編集」 link as text button sm on the section title line, right.
- Inline edit on the show page (`#update` revealed by 「編集」): the form appears as a card directly under the issue
  body, scrolled into view with focus on コメント (core focuses notes); the sticky action bar applies; `キャンセル`
  hides the form again.
- Conflict warning (`.conflict`) = warning alert with its radio options as a normal list.

#### 3.2.6 Compact comment panel (`/issues/3` → 「コメントを追加…」)

Collapsed: a full-width 44px pseudo-input at the bottom of the journals: 28px avatar of the current user at left,
bordered field (radius 8px, `--gb-border-strong`, bg #fff, hover border `--gb-primary`) with placeholder
「コメントを追加…」 14px `--gb-muted`. It is a `<button>` (already), activates on click/Enter/Space.

Expanded: a card with radius 12px, 1px border `--gb-primary-border`, shadow `--gb-shadow-md`, padding 20px,
`position: sticky; bottom: 16px` so it stays reachable while reading history (max-height `min(70vh, 560px)`, body scrolls).
- Grid: `minmax(0, 1fr) 280px`, gap 24px (≤ 1000px → single column, quick fields become a 2-column grid under the editor).
- Left: editor unit (§3.2.3) with textarea min-height 120px, autofocus, placeholder
  「コメント（@ を入力してメンバーに通知）」; under it one row: 「プライベートコメント」 checkbox (left) and a compact
  attachment control (sm secondary button 「ファイルを添付」 + drop support on the whole panel; chosen files listed as chips with ×). The raw native file input must not be visible as `ファイル選択 選択されていません`.
- Right: quick fields, Pattern S, 12px gap: ステータス (with 「処理済みに設定」 as a 12px text button on the label line),
  担当者 (with 「私が担当」), マイルストーン, 期限日. Selects 100% width, 36px. The status select shows a 8px colour dot
  of the current status at the left of the label (P2).
- Footer (top border 1px `--gb-border`, padding-top 12px, margin-top 16px): left = 「すべての項目を編集」 text button
  (opens full edit); right = `[閉じる]` secondary, `[登録]` primary (min-width 96px). Not centred.
- Behaviour: `Esc` closes the panel when the textarea is empty (otherwise first Esc blurs, no data loss);
  `⌘/Ctrl+Enter` submits; closing keeps typed text until page unload; after submit the page reloads to the new journal
  (core behaviour) and the flash toast shows. Focus returns to the 「コメントを追加…」 button on close.
  The panel must submit the same `form#issue-form` fields as the full edit (no duplicated `name`s).

#### 3.2.7 Validation and error states

- Server errors (`#errorExplanation`) render as the red in-flow alert at the top of the form; the page scrolls to it and
  it receives focus (`tabindex="-1"`). Heading: core text; list items 14px.
- JS maps each message to its field when possible (match by label text, e.g. 「題名を入力してください」 → `#issue_subject`):
  the field gets `aria-invalid="true"` + red border, its label turns red, and the message is repeated under the field
  in 12px `--gb-danger`. If mapping fails, the top alert alone is acceptable. `.field_with_errors` wrappers must not
  break the grid (`display: contents`).
- Client-side: do NOT block submission with custom validation; only add `required` semantics already present. Typing in
  an invalid field clears its red state.
- The submit button re-enables after a failed AJAX/validation round trip.

#### 3.2.8 Sub-dialogs and pickers

- New category / new version (`＋` → `#ajax-modal`): modal §2.16, Pattern S, 560px. The `＋` triggers are 24px icon
  buttons with `title`/`aria-label` 「カテゴリを追加」/「マイルストーンを追加」.
- Parent issue autocomplete, watcher search modal: menu card / modal spec; watcher results as checkbox grid with avatars 20px.
- Date fields: keep native `type=date` (works with keyboard); if Redmine falls back to jQuery UI datepicker it uses the menu card look.
- `/issues/new` without project: プロジェクト select is the first field in row 1.

#### 3.2.9 Bulk edit (`/issues/bulk_edit?ids[]=1&ids[]=2`)

Top: list of selected issues as a compact card (tracker badge + key + subject, max 5 then 「ほか n 件」). Form: Pattern S,
same 2-column attribute grid card; every select's first option 「変更なし」 stays default and is styled `--gb-muted`
until changed. コメント editor below (160px). Sticky action bar: `[送信]` primary, `キャンセル`.

#### 3.2.10 Keyboard and accessibility

- Tab order: (project) → tracker → private → subject → editor tabs → toolbar → textarea → status → priority → assignee →
  category → version → parent → start → due → estimate → % → file → watchers → 作成 → 連続作成 → キャンセル.
  (Toolbar buttons may be `tabindex=-1` as in core; do not add extra stops.)
- Every control keeps its `<label for>`; helper icon buttons have `aria-label`; the sticky bar does not cover the focused
  field (add `scroll-padding-bottom: 80px` on the scroll container).
- Enter in 題名 must not submit accidentally on new (P2: JS prevents implicit submit from the subject field only).
- Hit targets ≥ 28px; text contrast ≥ 4.5:1 for all labels and field text.

Acceptance — issue-form
- [ ] New issue at 1273px: labels are **above** fields everywhere; no right-aligned labels; no grey outer box around the whole form.
- [ ] 題名 input is 44px high, 16px text, full form width; トラッカー sits above it; プライベート is on the same row, right, not overlapping.
- [ ] Description editor is one bordered unit with tab + toolbar strip; textarea ≥ 240px high, 14px proportional font.
- [ ] Attribute grid is a 2-column card; left column ステータス→マイルストーン, right column 親課題→進捗率; 開始日 and 期限日 side by side; all selects equal width within a column; helper links on the label line.
- [ ] No native "ファイル選択 選択されていません" chrome visible; a dashed dropzone is shown; dragging a file highlights it; uploading still works and lists the file.
- [ ] Watchers render as an aligned checkbox grid.
- [ ] Action bar is sticky at the bottom of the viewport on a tall form; 作成 is green primary 36px, 連続作成 is outlined secondary, キャンセル is a text link.
- [ ] Submitting an empty subject shows a red alert at top AND the 題名 field with red border + message; other entered values are preserved; layout is not broken by `.field_with_errors`.
- [ ] Changing トラッカー or ステータス (AJAX re-render) keeps every decoration (grid, dropzone, helper positions, placeholders).
- [ ] Edit page: four sections with titles, no fieldset borders; 時間を記録 is a single row; コメント editor full width.
- [ ] Compact comment panel: collapsed = single 44px pseudo-input with avatar; expanded = editor left / 4 quick fields right; footer buttons right-aligned (閉じる secondary, 登録 primary); Esc closes when empty; ⌘/Ctrl+Enter submits; a posted comment appears in 履歴.
- [ ] New category/version modal matches §2.16 and creating one updates the select.
- [ ] Bulk edit uses the same grid and sticky bar.
- [ ] Full keyboard pass: every field reachable in the order above with visible focus; the sticky bar never hides the focused field.
- [ ] At 1024px and 768px the grid collapses to one column without horizontal scroll.

### 3.3 issue-list-detail

Issue list (`/projects/demo/issues`, `/issues`)
- **P0 width**: the list card takes the full content width; the right sidebar (カスタムクエリ) is the sticky card from
  §3.1 and is **collapsed by default on list pages narrower than 1440px** (state remembered by core's cookie —
  if that is not possible without a core change, keep it open but ensure 題名 ≥ 320px wide by letting the table scroll horizontally).
- Header row: `h2` 「課題」 left; right = primary 「新しい課題」 32px + `…` menu.
- **P0 Filter bar** (`#query_form_with_buttons`): a `--gb-surface-2` panel, radius 8px, padding `12px 16px`,
  margin-bottom 16px. `fieldset#filters` / `#options`: no borders; legends 「フィルタ」「オプション」 become 13px/600
  disclosure buttons with chevron on one line. Filter rows: Pattern I — grid `180px 140px minmax(0,1fr)`
  (checkbox+field name / operator select / value), 28px sm controls, 6px row gap. 「フィルタ追加」 select sits at the
  right of the legend line (220px, sm). Buttons row (`p.buttons`): 「適用」 = primary sm, 「クリア」 = secondary sm,
  「カスタムクエリを保存」 = text sm; left-aligned, 12px top margin.
- Table = §2.5. Column specifics: `#` key style; トラッカー as tracker badge; ステータス as status pill;
  優先度 with arrow; 題名 flexible ≥ 320px, 14px/500, 2-line clamp; 担当者 = 20px avatar + name, `nowrap`;
  更新日 `nowrap` tabular-nums `--gb-text-2`; 期限日 overdue red. **Remove the red/coloured left stripes on
  `tr.priority-*` / overdue rows** (currently a stray red bar at the row start) — priority is shown by the arrow only.
  Closed issues: subject `--gb-text-2`, key line-through.
- Row `…` and right-click context menu = menu card. Bulk selection toolbar is core's context menu — fine.
- Group headers, totals (`p.query-totals` → right-aligned chips), pagination, export links per §2.
- `/projects/demo/issues/report`: each report (トラッカー別 …) in its own card with standard table; numbers right-aligned; zero = `--gb-muted` "–".

Issue detail (`/issues/3`)
- **P0 header**: line 1: tracker badge + `#3` key (13px `--gb-text-2`) + state tag(s); right: prev/next (`« 前 | 6/8 | 次 »`)
  as icon buttons + position 12px. Line 2: **subject 24px/600** `--gb-text`, wraps. Line 3: 28px author avatar +
  「プレビュー 確認用 さんが31分前に追加・3分前に更新」 13px `--gb-text-2`. No square two-letter avatar, nothing overlapping.
  Core's `div.issue` yellow-ish box → plain white, no inner border; the whole issue is the `#content` card.
- Action bar (top `.contextual`): 「編集」 = primary sm 32px; 時間を記録 / ウォッチ / コピー = text buttons; `…` menu. Bottom duplicate hidden.
- **P0 attributes** (`.attributes`): a `--gb-surface-2` panel (radius 8px, padding 16px 20px) placed **above** the
  description; 2-column grid of rows `120px 1fr` (label 13px `--gb-text-2`, value 14px `--gb-text`), row height 32px,
  no dividers. ステータス = pill; 担当者 = 20px avatar + name; 期限日 with 「(期日まで 2日)」 in 12px (red when overdue);
  進捗率 = 120px progress bar + %; empty values show 「–」 in `--gb-muted` (not blank).
- 説明: section label 「説明」 13px/600 `--gb-text-2` + 「引用」 as text button sm right; body = `.wiki` prose (§3.5), 15px.
- ファイル / 子課題 / 関連する課題: each a section with 14px/600 title, count badge, 「追加」 text button right, 1px top
  divider, 16px padding. Child/related issues as compact rows (tracker badge, key, subject, status pill, assignee
  avatar, due). Empty → nothing but the title + 追加.
- **History**: tabs (履歴 / コメント / プロパティ更新履歴 / 作業時間) = underline tabs §2.10.
  Journal item = timeline row §2.17 adapted: 28px avatar; header line: **name** + 「さんが23分前に更新」 13px, right:
  reaction/quote/edit/`…` icon buttons + `#1` anchor 12px `--gb-muted`. No grey header bar. Property changes
  (`ul.details`): 13px `--gb-text-2`, no bullets, each as 「**カテゴリ**: フロントエンド にセット」 with old → new using
  an arrow; status values as mini pills (P2). Comment body: `.wiki` prose 14px, margin-top 8px. Private notes: left
  3px `--gb-danger` bar + private tag. 16px between items with 1px dividers.
- Watchers in the right sidebar: 20px avatars + names, 「追加」 text button.

Acceptance — issue-list-detail
- [ ] List: 題名 column ≥ 320px at 1273px and subjects fit on ≤ 2 lines; header row grey 12px; cells left-aligned; rows ≥ 44px.
- [ ] No coloured stripes/backgrounds on rows; selected row is soft green with dark text.
- [ ] Filter area is one soft panel; no fieldset legend lines; 適用 is a small green button.
- [ ] Status pills identical (size/colour) on list, detail, board, dashboard, roadmap.
- [ ] Detail header: subject is the largest text (24px); round avatar; tracker badge and key do not overlap anything.
- [ ] Attributes panel: 2 columns, labels grey/values dark, empty values shown as "–".
- [ ] Journals: avatar + name header without grey bars; tabs underline; action icons are 28px icon buttons.
- [ ] Only one action bar visible on desktop; 編集 is the visually dominant action.
- [ ] Context menu (right-click a row) uses the menu card and still works.

### 3.4 board (`/projects/demo/issues_panel`)

Already the closest to target; align with tokens.
- Filter bar identical to §3.3 (shared look; board owner scopes its own selectors).
- Columns: equal width `minmax(260px, 1fr)`, gap 12px, horizontal scroll inside the board area if needed; column bg
  `--gb-surface-2`, radius 8px, padding 8px; column header sticky at top: 8px status dot + name 13px/600 + count badge +
  `＋` icon button right (every column, not only the first, if the plugin allows). Column min-height 160px;
  **columns stretch to equal height** (no ragged bottoms).
- Card: white, 1px `--gb-border`, radius 8px, padding `10px 12px`, shadow none (hover `--gb-shadow` + border
  `--gb-primary-border`), gap 8px. Line 1: tracker badge + key (12px) + `…` icon button right. Line 2: subject 14px/500,
  max 3 lines. Line 3: 20px assignee avatar (round, §2.9; unassigned = dashed empty circle) + due date 12px
  (red when overdue, with calendar icon) right-aligned + priority arrow when not 通常. Closed cards: 70% opacity, key line-through.
- Drag: dragged card `--gb-shadow-md` + 2° rotation max; drop placeholder = dashed `--gb-primary-border` box with
  `--gb-primary-softer` bg; target column outline 2px `--gb-primary`. Dropping keeps core/plugin AJAX intact.
- 「新しい課題」 in-column button: full-width dashed secondary sm. New-card modal: §2.16 at 720px with the issue-form
  Pattern S (subject, description, grid) — coordinate with issue-form; do not restyle form internals in `60-board.css`.
- Grouping (`?group_by=assigned_to`): swimlane header = full-width row, 13px/600 with avatar, collapsible, count badge.

Acceptance — board
- [ ] Four columns equal width and equal height; headers show dot + name + count.
- [ ] Cards: badge/key/menu on line 1, subject 14px, round avatar + due date on line 3; no square avatars.
- [ ] Drag & drop to another column changes status and shows the placeholder; card menu and ＋ modal work.
- [ ] Filter bar matches the issue list's.
- [ ] Swimlanes are readable when grouped by 担当者.

### 3.5 wiki (owner of `.wiki` typography site-wide) — user called this out as hard to read

`.wiki` prose (wiki pages, issue descriptions, comments, news, documents, forum posts, previews):
- Base 15px / 1.8 / `--gb-text`; `max-width: var(--gb-prose-max)` on wiki/document/news pages (issue descriptions and
  comments use 14px/1.7 and their container width). Paragraph margin `0 0 1em`.
- Headings: `h1` 24px/600, margin `0 0 16px`, padding-bottom 10px, bottom border 1px `--gb-border`;
  `h2` 20px/600, margin `32px 0 12px`, padding-bottom 6px, bottom border 1px `--gb-border`;
  `h3` 16px/600, margin `24px 0 8px`, with a 3px × 1em `--gb-primary` left bar (padding-left 10px);
  `h4` 15px/600 `--gb-text`, margin `20px 0 6px`. Anchor/edit pencils (`a.wiki-anchor`, section edit links) appear on
  hover only, as 24px icon buttons at the heading's right; they must not shift layout.
- Lists: padding-left 1.6em; `li` margin 4px 0; nested lists 2px; `ul` disc `--gb-text-2`; task lists
  (`li.task-list-item`): no bullet, checkbox 16px with green accent, checked text stays readable (no strike).
- Links: `--gb-primary-strong`, underline on hover; external-link icon 12px after `a.external`; missing wiki pages
  (`a.new`) `--gb-danger` with dashed underline.
- Inline `code`: `--gb-font-mono` 13px, bg `--gb-surface-3`, radius 4px, padding `1px 5px`, colour `#b3404a`.
  `pre`: bg `--gb-surface-2`, border 1px `--gb-border`, radius 8px, padding `14px 16px`, 13px/1.6 mono, overflow-x auto,
  margin `16px 0`. Syntax colours (Rouge classes): keyword `#8250df`, string `#0a6e4f`, comment `--gb-muted` normal style,
  number `#b35900`, name/function `#2f6fb0`. `del` (strike): `--gb-muted`.
- `blockquote`: 3px left border `--gb-border-strong`, padding `4px 0 4px 16px`, colour `--gb-text-2`, no italic.
- Tables: `border-collapse: collapse`, border 1px `--gb-border`, `th` bg `--gb-surface-2` 13px/600, `td`/`th` padding
  `8px 12px`, 14px; wide tables scroll in their own container.
- `hr`: 1px `--gb-border`, margin 24px 0. Images: `max-width: 100%`, radius 4px. `.toc`: card (bg `--gb-surface-2`,
  radius 8px, padding 12px 16px, 13px), right-floated variant max-width 260px.

Wiki pages
- **P0 Page layout** (`/projects/demo/wiki/開発ルール`): breadcrumb (`p.breadcrumb`) 12px `--gb-text-2` with `›`
  separators above the content; action bar right: 「編集」 primary sm, ウォッチ / `…` (履歴, 名称変更, 削除, 新しいWikiページ)
  as text/menu. The page's own `h1` is the title — do not print a second title.
- Footer of the page: one meta row with top divider: 20px avatar + 「プレビュー 確認用 さんが3分前に更新」 + 「2件の履歴」 link,
  12px `--gb-text-2`, left-aligned (currently right-aligned loose text). Attachments (`ファイル (0)`) as a collapsible
  section with the standard attachment list. Export links per §2.14.
- Right sidebar: the sticky card; sections 「Wiki」 (メインページ / 索引(名前順) / 索引(日付順)) as nav rows,
  page tree (if present) with 16px indent and chevrons; ウォッチャー list with avatars.
- **P0 Edit** (`…/edit`, `/wiki/new`): Pattern S, max 960px. Title = page name (20px). Editor unit §3.2.3 with
  textarea **min-height 480px, 14px/1.7 proportional font** (currently 12px monospace), then a 2-column row:
  親ページ select (320px) / コメント (flex, placeholder 「変更内容のメモ（任意）」), then ファイル dropzone, then sticky action bar
  `[保存]` primary, `キャンセル` text. No grey box around the form. New page: タイトル field 44px like the issue subject.
- History (`…/history`): standard table; version number as key style; radio columns 36px; 「差分を表示」 primary sm above
  and below; author with 20px avatar. Diff (`…/diff`): header card with from/to meta; diff body 14px/1.8;
  `ins.diffmod`/`.diff_in` bg `#dff5ea` text `#14553f` no underline; `del.diffmod`/`.diff_out` bg `#fde4e1` text `#8f2a2a` line-through.
  Annotate: mono 13px table, zebra off, line numbers `--gb-muted`.
- Index pages (`/wiki/index`, `/date_index`): tree/list rows 32px with page icon, 14px links; date index groups with
  13px/600 date headings; no bullets.
- Rename/delete confirm: Pattern S / danger confirm.

Acceptance — wiki
- [ ] `.wiki` body computes to 15px / 1.8 on wiki pages; h1/h2 have bottom borders, h3 has a green left bar; clear size steps 24/20/16.
- [ ] Code block: soft grey bg, 8px radius, 13px mono, scrolls horizontally; inline code has chip background.
- [ ] Task list (`/wiki/2026-11-20_定例`) shows checkboxes without bullets.
- [ ] Wiki page shows breadcrumb, single title, 編集 button, and a left-aligned meta footer with avatar.
- [ ] Edit page: no grey outer box; editor ≥ 480px tall with proportional 14px font; 親ページ/コメント labels above; sticky 保存 bar.
- [ ] Diff colours green/red per spec; history table standard.
- [ ] Issue description and comments on `/issues/3` use the same heading/list/code styling at 14px.
- [ ] Prose line length ≤ 860px on a 1440px-wide window.

### 3.6 docs-files-news-forums — user called 文書 out as hard to read

Shared: each list page = `h2` + primary create button (32px) in the action bar; items separated clearly; meta rows
13px `--gb-text-2` with avatar; no italics; empty states §2.13; detail pages use `.wiki` prose with `--gb-prose-max`.

文書 (Documents)
- **P0 List** (`/projects/demo/documents`): group heading (ユーザー文書 / 技術文書) = 13px/600 `--gb-text-2` with count
  badge, margin `24px 0 8px` (first 0). Each document = a row card: grid `32px minmax(0,1fr) auto`, padding `14px 16px`,
  1px `--gb-border`, radius 8px, 8px gap between rows, hover border `--gb-primary-border` + `--gb-primary-softer` bg;
  whole row clickable via the title link (stretched `::after`). Col 1: document sprite icon 20px in a 32px
  `--gb-primary-soft` rounded square. Col 2: title 15px/600 `--gb-text` (hover green); description excerpt 13px
  `--gb-text-2`, 2-line clamp. Col 3: date 12px `--gb-muted` `nowrap` (2026/11/22 01:04, tabular-nums).
  Sort options (並べ替え: カテゴリ / 日付 / タイトル / 作成者) move from the sidebar look to a segmented control
  (pill group, 28px) — they stay in `#sidebar` DOM; style them as a compact segmented list inside the sidebar card
  with the selected one `--gb-primary-soft` + 600 (no solid blue block).
- **P0 Detail** (`/documents/3`): breadcrumb 「文書 › ユーザー文書」 12px; title 24px/600; meta row: category as neutral
  tag + date 13px `--gb-text-2`; action bar: 「編集」 secondary sm, 「削除」 danger text. Body `.wiki` prose.
  「ファイル」 section: 16px/600 title with count badge, standard attachment list, then the upload form as a dropzone
  with `[追加]` primary sm (the bare 「新しいファイル」 link becomes a secondary sm button that reveals it).
- New/edit: Pattern S, max 960px: カテゴリ (select 240px) → タイトル (44px, 16px) → 説明 (editor 320px) → ファイル dropzone → `[作成]` + キャンセル.

ファイル (Files)
- Table §2.5 with columns: ファイル (file-type icon + name link 14px/500; description below 12px), 日付, サイズ (right),
  DL (right, count), actions (download / delete icon buttons). **チェックサム column: hide by default** (show the
  SHA256 as a `title` tooltip on a small "#" icon button, or truncate to 12 chars mono 12px `--gb-muted`) — it currently
  dominates the table. Version group rows (`v1.0 リリース`) as §2.5 group rows with the package icon.
- New: Pattern S: マイルストーン select (240px) → dropzone → `[追加]`.

ニュース (News)
- **P0 List**: each item = article card (padding 20px 24px, 1px border, radius 8px, 12px gap): title 16px/600 link;
  meta row: 20px avatar + author + relative date + 「コメント 1」 count with comment icon, 12px `--gb-text-2`;
  summary (if any) 14px/500; body excerpt `.wiki` 14px, clamp 4 lines, 「続きを読む」 text button. No square
  two-letter avatars before titles.
- Detail (`/news/1`): title 24px/600, meta row, summary as lead paragraph 16px `--gb-text-2`, body prose;
  コメント section: timeline items (§2.17) + comment form (editor 120px, `[コメントの追加]` primary) collapsed behind
  a pseudo-input like the issue comment panel. `/news` (all projects): project name tag before the title.
- New/edit: Pattern S: タイトル (44px) → サマリー (textarea 2 rows) → 説明 (editor 320px) → ファイル → actions.

フォーラム (Forums)
- Forum list (`/projects/demo/boards`): each forum a row card: forum icon, name 15px/600, description 13px, right
  stats (トピック n / メッセージ n as two small stat blocks 12px label + 14px/600 number), last message (avatar + title + time, 12px).
- Topic list (`/boards/1`): breadcrumb; `h2` + description 13px `--gb-text-2`; action bar 「新しいメッセージ」 primary,
  ウォッチ / 設定 text. Table §2.5: 題名 (flex, 14px/500; sticky/locked as state tags before it), 作成者 (avatar + name),
  作成日, 返答 (right, count badge), 最新のメッセージ (two-line cell: author + time 12px, title link 13px).
- Topic (`/boards/1/topics/1`): title 24px/600; first post = card with header (36px avatar, name 14px/600, time 12px,
  actions as icon buttons right) + prose body; replies heading 「返答 (1)」 16px/600 with count badge; each reply =
  same card style at 28px avatar, 12px gap, reply subject line (`RE: …`) de-emphasised 12px `--gb-muted`.
  Reply form: collapsed pseudo-input 「返答を書く…」 → editor 160px + ファイル + `[送信]`; the bare 「返答」 link
  becomes that trigger.
- New topic: Pattern S: 題名 (44px) → スティッキー / ロック checkboxes inline → 内容 (editor 320px) → ファイル → actions.

Acceptance — docs-files-news-forums
- [ ] 文書 list: every document is a bordered row card with icon, 15px bold title, grey 2-line excerpt, right-aligned non-italic date; category headings with counts.
- [ ] 文書 detail: 24px title, tag + date meta row, prose body ≥ 15px, files section with dropzone; card hugs content.
- [ ] No italic text and no text < 12px on any of these pages.
- [ ] Files table: checksum no longer a full-width column; names left-aligned with icon; sizes right-aligned.
- [ ] News list items are separate cards with round avatar meta rows; detail has lead + prose + comment timeline.
- [ ] Forum topic: first post and replies are cards with round avatars; reply trigger is a pseudo-input; topic table standard.
- [ ] All four "new" forms are Pattern S with 44px title field, bordered editor unit, dropzone, primary + cancel.
- [ ] Sidebar sort links have no solid highlighted block.

### 3.7 project-pages

Dashboard (`/my/page`)
- Header: `h2` 「ダッシュボード」; the add-block select + its label become a right-aligned secondary sm control
  「ブロックを追加」. 2-column block grid (`minmax(0,1fr) minmax(0,1fr)`, gap 16px; top block full width).
- Each block (`.mypage-box`) = card §2.6 with title 16px/600, count badge after the title, drag handle + close as
  icon buttons that appear on hover (always visible on touch). No nested shadows.
- プロジェクト block: cards grid `minmax(240px, 1fr)`; each: 36px rounded-square project avatar (deterministic colour),
  name 15px/600 (ellipsis, 1 line — currently wraps mid-word), identifier 12px `--gb-muted`, two stats
  (未完了 n / 完了 n) with a 6px progress bar, footer text buttons 課題 / ボード / Wiki.
- Issue blocks (担当している課題 / ウォッチしている課題): table §2.5 compact (row 40px), columns `#`, プロジェクト, トラッカー (badge),
  ステータス (pill), 題名 (flex, 1-line ellipsis), `…`. **Remove the red left stripes.** Footer link 「すべて見る」.
- 最近の更新: timeline §2.17 (no grey excerpt boxes), max-height none, 「すべて見る」 in the header.

Project home (`/projects/demo`)
- 2-column: main `minmax(0,1fr)` + side 340px, gap 16px; each section a separate card (currently fine structurally).
  Page `h2` 「概要」 may be dropped in favour of a project header card: 48px project avatar, name 20px/600,
  description `.wiki` 14px (clamp 3 lines + 「もっと見る」), right: ブックマーク / `…`.
- 状態 card: stacked status bar 12px high radius pill using `--gb-st-N`, legend rows (dot, name, count 14px/600
  right, % 12px `--gb-muted`); each row links to the filtered issue list.
- マイルストーン card: per version: name link 14px/600 + due date right (12px; red if past), 8px progress bar,
  「30% ・ 未完了 4 / 完了 1」 12px. カテゴリ card: name, 6px bar, `done/total` right. 最新ニュース: title link 14px/500 +
  1-line excerpt + meta 12px. メンバー: grouped by role, 20px avatars + names as chips.
- 最近の更新 = timeline §2.17.

Activity (`/projects/demo/activity`): timeline grouped by day; sidebar filter checkboxes in the sticky card with
`[適用]` primary sm; prev/next as secondary sm buttons.

Roadmap (`/projects/demo/roadmap`)
- Each version = card (20px 24px, 16px gap): header: flag icon + name 18px/600 link + state tag (進行中/終了) + edit icon
  button right; meta: 「期日まで 10日 (2026/12/02)」 13px (red if late); progress bar 10px full width max 560px + %;
  counts line 「5 課題（1 完了 — 4 未完了）」 13px with links; description `.wiki`. 関連する課題 = compact rows
  (tracker badge, key, subject, status pill right), 36px, dividers, collapsed after 10 with 「すべて表示」.
- Sidebar: tracker checkboxes + 完了したバージョンを表示 + `[適用]`, version quick links.
- Version page (`/versions/1`): same header + two cards: 進捗 (bars by トラッカー/ステータス/… with the select as sm), 時間管理 stats table; issues list as above.

Calendar (`/projects/demo/issues/calendar`)
- Filter bar as §3.3; month nav row: prev/next secondary sm buttons, month title 16px/600 centred between them.
- Grid: `table.cal` fixed layout, 7 equal columns, header 12px/600 `--gb-text-2` (土 `--gb-info`, 日 `--gb-danger`),
  week-number column 32px `--gb-muted`; cells min-height 112px, padding 6px, 1px `--gb-border`; day number 12px
  top-left (today = filled green circle 22px white text); other-month days bg `--gb-surface-2`, number `--gb-disabled`.
  Issue chips: full cell width, radius 4px, padding `3px 6px`, 12px, 1-line ellipsis, left 3px bar in the status
  colour, bg `--gb-surface-2`, start/end/both icons 12px; hover shows core tooltip in tooltip style. Versions as green outline chips.
  Legend 12px `--gb-text-2` in one row.

Gantt (`/projects/demo/issues/gantt`)
- Filter bar as §3.3; zoom/month controls as sm controls in one toolbar row. Chart container: 1px border, radius 8px,
  overflow hidden, full card width. Subject column ≥ 320px, rows 28px, 13px; headers `--gb-surface-2` 12px/600;
  grid lines `--gb-border`; weekends `--gb-surface-2`; today line 2px `--gb-danger` dashed.
  Bars 14px high radius 3px: todo `--gb-st-2` at 35% opacity track, done portion `--gb-primary`, late `--gb-danger`;
  version/project bars `--gb-text-2` with diamond ends. Labels right of bars 12px `--gb-text-2`. Do not change geometry
  computed by core JS (only colours, fonts, borders).

Time entries (`/projects/demo/time_entries`, `/new`, `/report`)
- Tabs 詳細 / レポート underline; filter bar §3.3; table §2.5 with hours right-aligned 600; total as a stat chip above
  the table (「合計 9:30 時間」 16px/600). New: Pattern S, max 640px: 課題 (search input) → 日付 (160px) / 時間 (96px) in
  one row → 作業分類 (240px) → コメント (full) → `[作成]` `[連続作成]` キャンセル. Report: criteria selects as sm toolbar; matrix table with sticky first column, totals row 600.

Acceptance — project-pages
- [ ] Dashboard: every block is a card with a 16px title; project names never wrap mid-word; issue tables have pills/badges and no red stripes; timeline has round avatars and no grey excerpt boxes.
- [ ] Project home: 2-column cards; status bar + legend clickable; milestones show bar + counts + due date.
- [ ] Roadmap: each version is a separate card with name 18px, state tag, bar, counts, issue rows with status pills.
- [ ] Calendar: equal columns, today highlighted with green circle, issue chips single-line with status colour bar, Sat/Sun header colours.
- [ ] Gantt: bordered rounded container, readable 13px subject column ≥ 320px, green/blue bars, red today line; zoom controls styled.
- [ ] Time entry form is Pattern S; list total is visible; report table readable.
- [ ] Activity page groups by day with timeline rows.

### 3.8 admin-settings (view only — never submit)

- **P0 Admin shell**: `/admin` and all admin pages get a two-pane layout: the admin menu (currently in `#sidebar` on
  sub-pages, and as a bare icon list on `/admin`) is presented as a **left settings nav card** 240px (use `#sidebar`
  moved to the left with CSS `order`/grid on `body.controller-admin, .controller-settings, .controller-users, …` — or keep it right but
  styled as the sticky card; left is preferred for parity with the project nav). Rows 36px, icon 18px, 14px, active =
  `--gb-primary-soft` bg + `--gb-primary-strong` 600 + 3px left bar. `/admin` index: grid of link cards
  (`minmax(220px,1fr)`, 72px high: 24px icon in a soft green rounded square + label 14px/600) instead of the bare list.
- Project settings (`/projects/demo/settings`): underline tabs (scrollable). プロジェクト tab = Pattern S (max 720px):
  名称 (44px) → 説明 (editor 200px) → 識別子 (disabled style, mono 13px) → ホームページ → 公開 (checkbox + help) →
  親プロジェクト名 (select 320px) → メンバーを継承; then 「モジュール」 section title + checkbox grid (§2.3, 3 columns) with
  each module as a 36px row; `[保存]` primary. Members / versions / categories / forums / activities tabs: standard
  tables with a primary sm create button at the top-right of the tab; role chips as neutral tags; inline edit forms
  in rows use sm controls. Issue-tracking tab: checkbox grids + Pattern S selects.
- Administration → Settings (`/settings`, all tabs): **Pattern T** in a white card: 200px label column left-aligned,
  controls 36px (short numeric 96px, text 320–480px), help text under the control 12px, row gap 12px, sections with
  legend titles; checkbox rows aligned to the control column. The welcome-message editor is the bordered editor unit.
- Lists (`/users`, `/groups`, `/roles`, `/trackers`, `/issue_statuses`, `/custom_fields`, `/enumerations`,
  `/admin/projects`, `/admin/plugins`): filter row as §3.3 filter bar (sm); table §2.5; reorder handles as icon
  buttons; boolean cells as ✓ icon `--gb-primary-strong` / "–"; row actions (lock, delete) icon buttons, delete in danger colour;
  create action = primary 32px in the action bar. Users: 20px avatar before login; status as state tag.
- Edit forms (`/users/6/edit`, roles, trackers, custom fields): Pattern T; permission matrices (`/roles`,
  `/workflows/edit`) = tables with sticky header + sticky first column, cell 32px, checkbox centred, hover row/col
  highlight `--gb-primary-softer`, section headers `--gb-surface-2` 13px/600; wide matrices scroll inside their container.
- `/admin/info`: definition list card: label 13px `--gb-text-2`, value mono 13px; check items with ✓/! icons.
  `/admin/plugins`: table with name 14px/600 + description 13px, version right.

Acceptance — admin-settings
- [ ] `/admin` shows a card grid (or styled nav list) with icons, not a bare 12px link list; sub-pages show the admin nav as a styled card with a clear active item (no solid blue block).
- [ ] Project settings: underline tabs; info form labels above fields; module checkboxes in an aligned grid; 36px controls.
- [ ] `/settings`: Pattern T with aligned 200px labels, 36px controls, help text under fields; tabs underline and scrollable.
- [ ] Admin tables follow §2.5 (left-aligned, grey header, 44px rows); create button is primary.
- [ ] Workflow/permission matrices scroll within the card and keep headers visible.
- [ ] Nothing was saved (reviewer checks no flash "更新しました").

### 3.9 responsive (`95-responsive.css`) — loaded last; only layout overrides, no new visual language

Breakpoints: **≥ 1280** full layout; **1024–1279** right `#sidebar` drops below content as a full-width card
(or stays collapsed), dashboard stays 2 columns; **768–1023** left nav becomes the 56px icon rail, all 2-column form
grids → 1 column, dashboard/project home → 1 column, compact comment panel → single column; **< 768** left nav becomes
an off-canvas drawer opened by a hamburger icon button at the left of the top bar (overlay `rgba(20,30,27,.45)`,
280px, focus-trapped, Esc closes); top bar shows brand mark, hamburger, search icon (expands to full-width field),
`＋` icon button (課題の追加), avatar; global links move into the drawer.

Rules
- No horizontal page scroll at 1280 / 1024 / 768 / 375. Wide tables scroll inside `.autoscroll` with a right-edge fade.
- `#content` padding 16px < 900px, 12px < 480px; cards radius 8px kept; page gutter 12px.
- Touch (`pointer: coarse` or < 768): controls 44px high, table rows ≥ 48px, icon buttons 40px, 16px input font
  (prevents iOS zoom).
- Issue list < 768: table → stacked cards via CSS (each `tr` a card: line 1 tracker badge + key + status pill right,
  line 2 subject 15px/500, line 3 assignee avatar + due date + priority; other columns hidden). Checkbox column hidden;
  context menu via the `…` button.
- Issue detail < 768: attributes grid 1 column (`96px 1fr` rows); action bar → primary 「編集」 + `…` menu; journals full width.
- Issue form < 768: single column; date pair stays side by side (2 × 1fr); sticky action bar full-width with primary
  button `flex: 1`; compact comment panel becomes a bottom sheet (fixed, radius `12px 12px 0 0`, max-height 85vh).
- Board < 768: columns 84vw wide with horizontal scroll-snap (`x mandatory`), column headers sticky.
- Wiki/document prose: 15px kept; `pre` and tables scroll; TOC not floated.
- Calendar < 768: switch to list of days with issues (CSS: rows as blocks, empty days hidden) — P2; minimum is horizontal scroll with 96px columns.
- Gantt: horizontal scroll inside its container; subject column 200px.
- Modals < 600: full-screen sheet (radius 0, footer sticky). Menus: full-width bottom sheets are optional (P2).
- Print (`@media print`): hide nav, top bar, sidebars, action bars, sticky bars; content full width; prose 11pt black.

Acceptance — responsive
- [ ] At 1024, 768 and 375 wide: no horizontal page scrollbar on dashboard, issue list, issue detail, new issue, board, wiki page, document list, settings.
- [ ] 768: nav is an icon rail; forms are single column; sidebar is below/hidden.
- [ ] 375: hamburger opens a drawer with all project menu items; top bar fits on one row; primary actions reachable.
- [ ] 375 issue list renders as cards with pill + subject; issue form fields are 44px tall with sticky full-width submit.
- [ ] 375 board scrolls column-by-column with snap.
- [ ] Desktop (1273) rendering is unchanged by the responsive file.

---

## 4. Cross-cutting rules for all owners

1. **Consistency beats local cleverness.** Status pill, tracker badge, avatar, button, input, table, card, tab, menu,
   dropzone and editor look identical on every page. If you need a variant, request it from global-shell.
2. **Shared editor unit**: the bordered jsToolbar unit (§3.2.3) is implemented once (issue-form owner writes it with
   unscoped `.jstBlock` selectors — the only allowed unscoped rules in `55-issue-form.css`; other owners set only `min-height` per page).
   **Shared dropzone** (§2.12), **Pattern S/T** (§2.4) and **filter bar** (§3.3, selectors `#query_form …` unscoped, owned by
   issue-list-detail in `40-issue-list.css`) likewise have one implementation each.
3. Scope everything else to your controllers/actions. Never use `!important` except to beat inline styles Redmine/jQuery UI writes.
4. Japanese copy: short, です/ます, no exclamation marks. Buttons are nouns/verbs without 「する」 where core does so
   (作成 / 保存 / キャンセル / 閉じる / 登録). New strings go through locale requests to project-pages
   (`config/locales_override/ja.yml`); JS-inserted text only as a fallback and listed in your report.
5. Accessibility: contrast ≥ 4.5:1 for text (status pills exempt as branded colours, but keep 12px/600 white);
   focus visible; hit targets ≥ 28px desktop; `aria-label` on icon-only buttons; no information by colour alone
   (pills carry text, overdue has red + bold).
6. Performance: no web fonts, no images except inline SVG data-URIs for chevrons/icons; JS decorations are idempotent,
   run on `GB.ready` and `GB.onAjax`, and never re-create form controls.
7. Never break: form submission, CSRF tokens, `data-remote` links, drag & drop (board, dashboard blocks, attachments),
   context menu, autocomplete, preview tabs, `warnLeavingUnsaved`, keyboard navigation.

## 5. Reviewer protocol

For each feature take screenshots at 1273px (and 1024 / 768 / 375 for responsive) of every page of the feature, then:
1. Run the feature's acceptance checklist above (all boxes must pass; P2 items may be deferred with a note).
2. Global sanity on every screenshot: 14px body, 36px controls, no italics, no text < 12px, no blue links, no raw
   fieldset borders, no native file-input chrome, no square/two-letter avatars, no nested shadows, card hugs content,
   no horizontal page scroll, console free of `[greenboard]` errors.
3. Interaction smoke test for the feature (submit a `[UIテスト]` record in project `demo` where relevant; never in admin).

---

## 6. Decisions (final for round 3)

These settle every point on which earlier rounds or reviewers contradicted each other. They are **final for
round 3**: implementers follow them, reviewers judge against them and must not ask for the opposite. Where a
decision differs from §2–§4 above, **§6 wins** (the superseded sentences are listed in §6.13).
Each decision ends with a **Test** a reviewer can run in the browser.

### 6.1 Text wrapping — one policy per element type (C-wrap, W1 / W2 / P5)

Only `css/15-c-wrap.css` declares `text-wrap`, `word-break`, `line-break`, `overflow-wrap`. No JS measures text
to re-break lines.

| Element type | Examples | `text-wrap` | `word-break` | `overflow-wrap` | other |
|---|---|---|---|---|---|
| **Prose** | `.wiki p / li / dd / blockquote / td`, issue description, journal notes, comments, news summary and body, document description, excerpts (`.gb-timeline__desc`, search results), help text (`em.info`), flash messages | `wrap` | `normal` (round 3: `auto-phrase` moved 「かかっている。」 to line 2 and left line 1 short, see W1) | `anywhere` | `line-break: strict` |
| **Headings / titles** | `#content > h2`, `.wiki h1–h4`, issue subject `h3` on the detail page, card and block titles (`h3`), dialog titles, document / news / topic title | `balance` | `auto-phrase` | `anywhere` | `line-break: strict` |
| **Subjects in collections** | issue subject in tables, cards, timelines, calendar chips, gantt rows; forum topic and document names in lists | `wrap` | `auto-phrase`; **exception: calendar chips (`.gb-cal-chip__subject`) use `normal`** (a phrase longer than the ~6-character chip breaks mid-phrase and line 2 ends as one character + 「…」) | `anywhere` | `line-break: strict`; clamp per §6.7 |
| **Labels** | form labels, legends, checkbox / radio labels, definition terms | `wrap` | `auto-phrase` | `normal` | never `balance` |
| **Single tokens** | table headers, buttons, tabs, pills / badges, issue keys, dates, times, numbers, user names in tables, nav items | — | — | — | `white-space: nowrap` (ellipsis only where §6.7 says) |
| **Machine strings** | inline `code`, URLs, file names, e-mail addresses | `wrap` | `normal` | `anywhere` | |
| **Hashes** | checksums, API keys | `wrap` | `break-all` | — | monospace |
| **Preformatted** | `pre`, diffs | — | `normal` | `normal` | `white-space: pre; overflow-x: auto` (diff lines: `pre-wrap` + `anywhere`) |

- `text-wrap: pretty` is not used anywhere. `text-wrap: balance` is used for headings / titles only.
- `word-break: break-word` (deprecated) and `word-break: keep-all` are not used anywhere.
- **Test W1**: `/issues/3` at 375px — `getComputedStyle(document.querySelector('div.issue .wiki p')).textWrap` is
  `wrap` (not `balance` / `pretty`); the first description paragraph renders as
  「トップページの初回表示に 4 秒ほどかかってい／る。」 (line 1 filled; the exact break 「かかって／いる。」 needs
  `text-wrap: pretty`, which is banned). Same computed value for
  `.wiki li`, a journal note, a news summary on `/projects/demo/news`.
- **Test W2**: the subject element on `/projects/demo/issues`, `/projects/demo/issues_panel`, `/my/page`
  (table and timeline), `/projects/demo/activity` has identical computed `text-wrap` / `word-break` /
  `line-break` / `overflow-wrap`; `grep` done-check of COMPONENTS.md C-wrap prints nothing.

### 6.2 Empty select option — 「未設定」 (C-form, F2)

- Every single `select` whose first option has an empty value and no visible text shows **「未設定」**
  (both `textContent` and the `label` attribute; value stays `""`). While it is the selected option the select
  text is `--gb-muted` (class `gb-unset`); the open list is `--gb-text`.
- Core's 「--- 選んでください ---」 prompt also reads **「未設定」** (same muted style). 「未選択」 and 「指定なし」
  are not used.
- **Round 4 (L5)**: core's 「なし」 (`label_none`) used as the empty-value first option for "no value"
  (デフォルトのクエリ, デフォルトのプロジェクトクエリ, デフォルトのマイルストーン, デフォルトの担当者,
  デフォルトのタイムゾーン, ロールのデフォルト作業分類 …) also reads **「未設定」**, muted. An empty-value
  first option that **means something else** keeps its wording but gets the **same muted style** (`gb-unset`)
  while selected: 「(自動設定)」, 「デフォルト」, 「ユーザーの言語の設定に従う」, 「無効」, 「すべて」 on a
  settings form, and admin テキスト書式 / 履歴の圧縮 「なし」 (= plain text / no compression, a real choice).
  Selects in GET (filter) forms are not touched by this rule. Implemented only in `js/15-c-form.js`
  (`data-gb-unset`: `1` = 「未設定」, `auto` = own wording muted, `keep` = own wording not muted — the
  exceptions below).
- Deliberate exceptions (a blank option that means "choose an action" or "all", not "no value") — these exact
  strings and nothing else: `#add_filter_select` 「＋ フィルタを追加」; dashboard add-block select
  「ブロックを追加」; activity sidebar user select 「すべてのユーザー」; time-report 「追加」 criteria select keeps its
  locale prompt; bulk edit (§6.4); custom field 表示 `#custom_field_edit_tag_style` 「ドロップダウンリスト」 (a
  concrete choice, drop-down vs checkboxes) keeps its wording **and** normal text colour (not `gb-unset`). Filter-row value selects, `per_page` and multi-selects are untouched.
- **Test**: on `/my/account` (タイムゾーン), `/projects/demo/settings` (親プロジェクト名),
  `/projects/demo/issues/new` (担当者, カテゴリ, マイルストーン), `/projects/demo/time_entries/new` (作業分類),
  `/projects/demo/files/new` (バージョン), the board new-card modal:
  `[...document.querySelectorAll('select:not([multiple]) > option:first-child')].filter(o => o.value === '' && !o.label.trim())` is empty,
  and no option text matches `/選んでください|指定なし|未選択/`.
  **Test L5**: on `/my/account`, `/projects/demo/settings/issues`, `/settings?tab=display` (view only),
  `/roles/new`: no `select:not([multiple])` has a first option with `value === ''` and label 「なし」 except
  `#settings_text_formatting` / `#settings_wiki_compression`; every empty-value first option with its own
  wording has `data-gb-unset="auto"`, and its select has class `gb-unset` while that option is selected.

### 6.3 Required marker (C-form, F1)

- `label .required`, `legend .required`, `span.required`: `display: inline-block; margin-left: 4px;`
  colour `--gb-danger`, weight 600, same font-size as the label, no extra space character rendered
  (core's leading space inside the span collapses because of `inline-block`).
- The marker never wraps onto its own line (`white-space: nowrap` on the last word + marker is not needed:
  the label is `auto-phrase`, the marker is glued by `margin-left`, not by a space).
- **Test**: on `/projects/demo/issues/new`, `/issues/3/edit`, `/projects/demo/wiki/new`,
  `/projects/demo/time_entries/new`, `/projects/demo/settings`, `/my/account`, the board new-card modal —
  horizontal gap between the right edge of the label text (Range rect of the text node) and the left edge of
  the `.required` box is 4px (±0.5); `getComputedStyle(marker)` colour and weight are identical on all pages.

### 6.4 Checkboxes, radios and the bulk-edit default option (C-form, F3 / F4)

- `input[type=checkbox]`, `input[type=radio]`: 16×16px rendered box on every page and width, `flex: none`,
  `margin: 0`; alignment comes from the row (flex centre) — no per-page size, including the phone drawer and
  table cells. The hit target is the row or cell (≥ 28px desktop, ≥ 40px phone), not a bigger box.
- Bulk edit: the first option of every select reads **「(変更なし)」** (half-width parentheses, locale
  `label_no_change_option`), muted while selected.
- **Test**: `[...document.querySelectorAll('input[type=checkbox],input[type=radio]')].filter(i => i.offsetParent).every(i => { const r = i.getBoundingClientRect(); return Math.round(r.width) === 16 && Math.round(r.height) === 16; })`
  is `true` on `/projects/demo/time_entries`, `/projects/demo/issues`, `/settings?tab=issues`, `/my/account`
  at 1273px and 375px. `/issues/bulk_edit?ids[]=1&ids[]=2`: every attribute select's first option text is `(変更なし)`.

### 6.5 Timeline item (C-timeline, T1 / T2)

One DOM (`.gb-timeline__item`) and one stylesheet for dashboard 最近の更新, project home 最近の更新,
`/activity`, `/projects/:id/activity` and the activity list on `/users/:id`.

- **Row**: grid `28px minmax(0, 1fr) auto`, gap 12px, padding `12px 0`, 1px `--gb-border` divider (none on the
  last row of a day). Rows are **never indented** (core's "grouped" events sit flush with the others).
- **Line 1 — meta** (13px `--gb-text-2`): **Name** (600, `--gb-text`) + action phrase
  (「さんがコメントしました」). When the list spans several projects (dashboard, global `/activity`) the project
  chip follows on the same line and wraps to the next line as a whole when it does not fit; the action phrase
  is never ellipsised.
- **Line 2 — title** (14px / 500): tracker badge + key + subject for issues; plain linked title otherwise.
  Subject wraps, **2-line clamp**, no single-line ellipsis (§6.7). No status pill at the end of the title.
- **Line 3 — status change**, only for a journal that changed the status: `[pill A] → [pill B]`
  (status pills §2.7, arrow `→` in `--gb-muted`, 6px gaps). A newly created issue has no line 3.
  On `/activity` core's markup only knows the new status, so the old one comes from the server
  (plugin data for the listed journals), not from guessing.
- **Line 4 — excerpt**, optional: 13px `--gb-text-2`, 2-line clamp, plain text, no box.
- **Time (column 3)**: **absolute clock time 「HH:MM」 (24h, zero-padded, tabular-nums), 12px `--gb-muted`,
  `nowrap`**, top-aligned with line 1; `<time datetime="ISO">` with the full date-time in `title`.
  Relative times (「約5時間前」) are not used in timelines. The date comes from the day heading:
  **「今日」 / 「昨日」 / `YYYY/MM/DD`** (13px / 600 `--gb-text-2`, margin `20px 0 4px`, first one `0 0 4px`).
- **Test T1**: the newest status-change journal (e.g. DEMO-6 処理中 → 処理済み) on `/my/page`,
  `/projects/demo` and `/projects/demo/activity` — same four lines, same order, same pills, time `HH:MM`
  in the right column at the same vertical position; `document.querySelectorAll('.gb-act, .gb-act__meta').length === 0`;
  no row has a left offset different from its siblings.
- **Test T2**: at 1273px no `.gb-timeline__subject` on `/my/page` ends in 「…」 while the same event on
  `/projects/demo` shows in full (`scrollWidth <= clientWidth` and not more than 2 lines).

### 6.6 Issue key column (C-issue-row, I3)

- Wherever a table column shows issue keys (`DEMO-23`), its header reads **「キー」** — issue list, cross-project
  `/issues`, dashboard 担当 / ウォッチ tables, subtask / relation tables with a header, version related issues,
  and the 「#」 entry of the column pickers (オプション → 項目) reads 「キー」 too. The sort link and arrow are kept.
- Key format everywhere: `GB.issueKey(identifier, id)` → `DEMO-23`; `#23` only when the project is unknown.
  Keys are `nowrap`, tabular-nums, link colour; the cell is as wide as the longest key (no fixed 1%).
- **Test**: `[...document.querySelectorAll('table.list th.id')].every(th => th.textContent.trim() === 'キー')`
  on `/projects/demo/issues`, `/issues`, `/my/page`; no visible `th` text equals `#`.

### 6.7 Subject truncation (C-issue-row / C-timeline / C-wrap, I4 / I6 / T2)

Subjects wrap by §6.1 and are cut only by a line clamp; the full subject is always in the link's `title`.

| Context | Rule |
|---|---|
| Tables (issue list, dashboard 担当 / ウォッチ, subtasks / relations, version related issues, time-entry issue cell, time report) | **2-line clamp**. The subject column is the flexible one and is never narrower than **240px** at ≥ 900px content width (other columns give way or hide first); below that the row becomes a card |
| Cards (board card, phone issue-list card, bulk-edit selection list) | **3-line clamp** |
| Timelines (§6.5) | **2-line clamp** |
| Calendar chips | **2-line clamp** at every width |
| Gantt subject column | **single line with ellipsis** (the chart rows are fixed-height). Column width `clamp(280px, 34%, 420px)` of the gantt table: at 1273px with the sidebar open it shows key + at least 12 full-width characters of every subject |
| Page / detail titles (issue subject `h3`, wiki / news / document title) | never clamped |
| Project name in cards / jump menu, user names in table cells, sidebar links | single line with ellipsis |

- Single-line ellipsis on an issue subject exists only in the gantt column. No container query or media query
  changes a clamp number (the clamp is the same at every width for a given context).
- Dashboard tables: the project name line under the subject is 12px `--gb-muted`, single line, and is hidden
  when the block lists one project only — it must not take width from the subject.
- **Test I4**: `/my/page` at 1273px — every `.mypage-box table.list td.subject` shows the whole subject or two
  full lines; the subject cell is ≥ 240px wide. **Test I6**: `/projects/demo/issues/gantt` at 1273px — the
  subject column is ≥ 280px and 「DEMO-14: [UIテスト] 履歴表示確認…」 shows at least 12 subject characters.

### 6.8 Issue rows and cards — assignee slot, status select, percentages (C-issue-row, I1 / I2 / I5)

- **Unassigned = nothing.** No dashed / empty avatar placeholder anywhere (cards, rows, swimlane headers,
  desktop and phone, grouped and ungrouped). A card footer row exists only if it has an assignee, a priority
  other than 通常, or a due date; otherwise the card ends after the subject with its normal bottom padding.
- **Status select with colour dot**: the 8px dot sits **inside the select**, 10px from its left edge, vertically
  centred, with the option text starting 26px from the edge — one rule for `/projects/demo/issues/new`,
  `/issues/3/edit`, the compact panel and the board new-card modal. In the modal every label starts on the same
  left edge as on the full form (Pattern S: label above control, no dot or icon in front of a label).
- **Percentages are floored** (`28.5 → 28%`) everywhere a version / milestone progress is printed: project home,
  roadmap, version page, gantt. The gantt label is fixed on the server (plugin patch), not by rewriting text in JS.
- **Test I1**: `document.querySelectorAll('.gb-avatar--empty').length === 0` on `/projects/demo/issues_panel`
  (with and without `?group_by=assigned_to`, 1273px and 375px). **Test I2**: the modal keeps the full form's
  2-column field grid (round 3 decision), so the check is per column and skips checkbox labels: in the modal,
  `new Set([...modal.querySelectorAll('p > label')].filter(l => !l.querySelector('input') && !(l.previousElementSibling && l.previousElementSibling.matches('input'))).map(l => Math.round(l.getBoundingClientRect().left))).size`
  equals the number of columns (2 at 1273px, 1 at 375px).
  **Test I5**: gantt shows 「v1.0 リリース 28%」.

### 6.9 Filter bar behaviour per width (C-filter, Q1)

Same markup contract on issues, board, time entries, calendar, gantt, `/projects`, `/users`, `/admin/projects`.

- **Panel**: `--gb-surface-2`, radius 8px, padding `12px 16px`, margin-bottom 16px. Two disclosure legends
  「フィルタ」 and 「オプション」 (13px / 600, chevron left). A legend shows a summary in 12px `--gb-text-2`
  **whenever its fieldset is folded** (any width): filters → 「N件の条件」 (N = checked filter rows; nothing when
  N = 0); options → 「グループ: 〈name〉」 when grouping is set, else nothing. No count badge.
- **Buttons row** (always visible, also when both fieldsets are folded), left-aligned, 8px gaps, one line:
  `[適用]` primary · `[クリア]` secondary · **save-query = square outlined icon button, as high as the two
  buttons beside it** (controls in this row are 28px high at ≥ 768px and 36px on phones; sprite `save`,
  `title` and `aria-label` 「カスタムクエリを保存」, no visible text) **immediately after 「クリア」 at every width**.
  Pages without a save link simply have two buttons (no gap, no placeholder).
- **Page toolbars** (gantt months / zoom, calendar month nav, time-report selects) are a separate row *below*
  the buttons row and belong to the page.

| Content width | Default state on load | Filter rows |
|---|---|---|
| ≥ 768px | フィルタ open, オプション folded (core default; a saved query / user toggle is respected) | grid `180px 140px minmax(0, 1fr)`; 「＋ フィルタを追加」 select top-right of the fieldset, 220px |
| < 768px (phones) | **both folded** on every load, with the summaries; opening is one tap; state is not persisted | each filter = two lines: checkbox + label, then operator + value full width; 「＋ フィルタを追加」 full width under the rows |

- Folding never drops or changes a filter; a validation error or an `f[]` row without value opens フィルタ.
- **Test Q1**: at 375px, on each of the eight pages: both fieldsets have class `collapsed` after load, the
  filters legend contains 「N件の条件」 when N > 0, and the element after 「クリア」 in `p.buttons` is the
  icon button (square, 36×36, 1px border, no text). At 1273px the same button at 28×28 in the same position;
  `getComputedStyle` of the panel, legends and buttons is identical between `/projects/demo/issues`,
  `/projects/demo/issues_panel` and `/projects/demo/time_entries`.

### 6.10 Comment entry row (C-comment, K1)

- Collapsed row = `.gb-comment-cta`: flex, gap 12px, `margin-top: 16px`, full width of the content column.
  Left: the **current user's 28px avatar**. Right: a `<button type="button">` 44px high, radius 8px,
  1px `--gb-border-strong`, bg #fff, padding `0 14px`, text left-aligned 14px `--gb-muted`; hover border
  `--gb-primary`; focus ring §1.3. **No icon inside the field.**
- Text: 「コメントを追加…」 on issues and news, 「返答を書く…」 on forum topics (the only allowed difference).
- Activation by click / Enter / Space opens the page's own panel; focus returns to the button on close.
- **Test K1**: on `/issues/3`, `/news/1`, `/boards/1/topics/1` — `.gb-comment-cta` exists, its children are
  one `.gb-avatar` (28×28) and one button; button height 44px, same computed border, radius, padding, colour
  and font on all three; `document.querySelector('.gbd-pseudo')` is `null`.

### 6.11 Editor unit (C-editor, E1 / E2)

- **Toolbar overflow** depends on the width of the editor unit, not the viewport:
  - unit ≥ 600px: the toolbar **wraps**, rows left-aligned, 2px row gap; the help icon stays at the right end
    of the first row.
  - unit < 600px (`.gb-jst-narrow`): **one row, scrolls sideways** (no scrollbar, scroll-snap on buttons).
    A 「›」 indicator (28px, `--gb-surface-2` background, left fade) is pinned to the right edge while more
    buttons remain; the row is clipped so that **the last thing left of the indicator is a whole button**
    (never a half icon or a lone separator). The indicator disappears at the scroll end; a mirrored 「‹」
    is not shown.
  - This runs for every `.jstBlock` (issue, wiki, documents, news, forums, project settings), not only
    inside `#issue-form`.
- **Height**: the textarea grows with its content between `--gb-editor-min` and `--gb-editor-max`, then scrolls
  inside; the preview pane uses the same min. Defaults: min 240px, max `min(70vh, 720px)`; phones (< 768px)
  max `60vh`. Page values (the only thing a page may set): issue description new 240 / edit 200; comment on
  full edit 160; compact panel 120; wiki edit 320; documents / news / forum 200; project settings 160.
  `resize: vertical` stays; a manual resize wins until reload.
- **Test E1**: at 375px on `/projects/demo/issues/new`, `/projects/demo/wiki/開発ルール/edit`,
  `/projects/demo/settings` — for every toolbar button `b` whose rect intersects the visible row left of the
  indicator, `b` is fully inside it (no partial intersection); no `.jstSpacer` is the last visible element.
- **Test E2**: `/projects/demo/wiki/リリース手順/edit` at 1273px — textarea height equals its content height
  (`scrollHeight`) when that lies between min and max, and is never taller than `min(70vh, 720px)`.

### 6.12 Ownership of these decisions

`COMPONENTS.md` names the single CSS / JS file per component and lists the old rules to remove. Page files set
layout around a component only. Reviewers fail a component if its "done check" grep is not clean, even when
the screenshots look right — leftover duplicates are what made rounds 1–2 regress.

### 6.13 What §6 supersedes above

- §2.17 col 3 「relative time」 and 「single line with ellipsis」 for timeline titles → §6.5 (clock time, 2-line clamp).
- §3.2.3 「The toolbar wraps onto a second line when narrow — never clips」 → §6.11 (wrap ≥ 600px, scroll row below).
- §3.2.6 colour dot 「at the left of the label」 → §6.8 (inside the select); collapsed row → §6.10.
- §3.2.9 「変更なし」 → 「(変更なし)」 (§6.4).
- §3.3 filter bar details and §3.4 「board owner scopes its own selectors」, §4.2 file locations
  (`55-issue-form.css` for `.jstBlock`, `40-issue-list.css` for `#query_form`) → §6.9, §6.11 and `COMPONENTS.md`
  (`15-c-*.css`).
- §3.7 dashboard tables 「題名 (flex, 1-line ellipsis)」 → §6.7 (2-line clamp).
- §3.9 「responsive: only layout overrides」 is now enforced: `95-responsive.css` may not restyle a component.
