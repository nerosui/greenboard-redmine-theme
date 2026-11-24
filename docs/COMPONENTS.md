# Round 3 — component ownership map

One implementation per shared component. This file says, for each component in `ACCEPTANCE.md`:
the ONE canonical CSS file, the ONE canonical JS file, the selectors it owns, and the duplicate / conflicting
rules that exist today in other files and must be **moved into the canonical file or deleted**.
Look and behaviour are fixed by `DESIGN.md §6 Decisions` — read that section before writing a line.

## How to read the inventories

- Line ranges are a snapshot of `src/` taken 2026-11-24 07:02 (before any round-3 edit). Lines shift as
  soon as anyone edits: **the selector is the authority, the line range is only where to start looking.**
  Re-run the component's "done check" grep before and after your pass.
- "Move" = the rule's intent is still wanted → re-express it once in the canonical file (usually simpler and
  unscoped), then delete the original. "Delete" = the rule contradicts §6 or duplicates the canonical rule.
- A range in a page file may also contain layout-only declarations (width, margin, grid placement, order,
  `display: none` of a whole component on one page). Those may stay — see "Page files may only…" per component.
  Everything else in the range goes.

## Rules for everybody

1. Canonical files are `css/15-c-<name>.css` and `js/15-c-<name>.js`. They load after `10-global.css` /
   `00-core.js` and **before** every page file (filename order), so a leftover page rule with higher
   specificity silently wins. A component is therefore only "done" when its done-check grep is clean —
   out-specifying a leftover (`html body …`, `#id#id`, `!important`) is not allowed.
2. Component selectors are unscoped or scoped by the component's own root (`#query_form`, `.jstBlock`,
   `.gb-timeline`, `.gb-comment-cta` …), never by `.controller-*`. If one page truly needs a variant, the
   component exposes a custom property or modifier class (listed below) and the page file sets only that.
3. While a component pass runs, its owner may edit other owners' files **only to delete or move the ranges
   inventoried here** (plus their JS counterparts). Use small exact `Edit` replacements, re-read the file right
   before each edit, never rewrite a whole file — other component owners are trimming the same page files.
   Suggested order if run sequentially: wrap → form → editor → comment → filter → timeline → issue-row.
4. Page owners must not re-add a component selector with visual declarations. Allowed in page files for a
   shared component: `width / max-width / min-width / flex / grid-column / grid-area / order / margin /
   position / top / bottom / z-index`, the component's documented custom properties, and hiding the whole
   component. Not allowed: colours, borders, radius, padding inside the component, font, line-height,
   `text-wrap`, `word-break`, `overflow-wrap`, `line-clamp`, `text-overflow`, `white-space`, its inner layout.
5. JS: one decorator per component, idempotent (`data-gb-*` guard), run on `GB.ready` + `GB.onAjax`.
   `15-c-*.js` loads before `40-issue-list.js`, so call `GB.il.*` only inside ready handlers, or use
   `GB.issueKey` from `00-core.js`.
6. No lint / type suppression comments. After edits: `./src/build.sh`. ERB / Ruby / locale edits need a Redmine restart.

| Component | Canonical CSS | Canonical JS | Plugin files the component owner may edit |
|---|---|---|---|
| C-wrap | `css/15-c-wrap.css` | `js/15-c-wrap.js` (expected to stay tiny or absent — see below) | — |
| C-form | `css/15-c-form.css` | `js/15-c-form.js` | `config/locales_override/ja.yml` (select / bulk-edit strings only) |
| C-filter | `css/15-c-filter.css` | `js/15-c-filter.js` | — |
| C-timeline | `css/15-c-timeline.css` | `js/15-c-timeline.js` | `app/views/greenboard/_timeline.html.erb`, timeline helpers in `lib/redmine_greenboard/view_helper.rb`, `gb_act_*` / `gb_ago` locale keys |
| C-issue-row | `css/15-c-issue-row.css` | `js/15-c-issue-row.js` | new `lib/redmine_greenboard/gantt_patch.rb` (I5 only) |
| C-comment | `css/15-c-comment.css` | `js/15-c-comment.js` | — |
| C-editor | `css/15-c-editor.css` | `js/15-c-editor.js` | — |

---

## C-wrap — text wrapping (W1, W2, P5) · DESIGN §6.1

**Owns** every declaration of `text-wrap`, `word-break`, `line-break`, `overflow-wrap`, `hyphens` in the theme,
via four utility groups defined once in `15-c-wrap.css` (selector lists, no new classes needed in markup):
prose, headings, subjects, tokens (code / URLs / file names). It also owns the `-webkit-line-clamp` /
`line-clamp` **values** for subjects (the clamp table in §6.7); other components reference that table and do
not set their own numbers.

**JS**: none wanted. `js/15-c-wrap.js` exists only if the CSS policy cannot produce the §6.1 result; it must
not measure text and re-break lines.

**Duplicates / conflicts to remove** (all `text-wrap`; `balance` on body text is the W1 failure):

| File:lines | Selector (short) | Action |
|---|---|---|
| `95-responsive.css:958-962` | `.wiki :is(p, li, dd, blockquote, td), .news-article p, p.gbd-summary, .gbd-lead, table.boards td…` → `text-wrap: balance` | **Delete** (this is W1 / P5) |
| `95-responsive.css:941-946` | `:is(td.subject, .mypage-box h3), #content > h2` → `pretty` | Delete; headings get the canonical heading rule, `td.subject` the subject rule |
| `95-responsive.css:949-953` | `.gb-timeline__item *, #activity dt/dd *` → `pretty`, `word-break: normal` | Delete |
| `95-responsive.css:878-882`, `50-issue-detail.css:1052-1057`, `50-issue-detail.css:161-169` | issue subject `h3` (`pretty` / `balance` / `break-word`, three variants) | Delete all three; canonical heading rule |
| `95-responsive.css:913-927, 930-937, 1602-1616` | calendar chip subject (clamp 2 → none → none, `pretty`) | Delete; C-issue-row sets the chip clamp once |
| `95-responsive.css:983-989, 787-797` | issue list `td.subject` (`pretty`, `anywhere`) | Delete |
| `95-responsive.css:1515-1534, 1718-1728, 835-848` | time-entry subject, dashboard subject, subtask subject | Delete (C-issue-row re-homes the clamp) |
| `60-board.css:517-526` | card subject `text-wrap: pretty` + `.gb-subj--balance` → `balance` | Delete both |
| `60-board.css:336-348` | `.issue-card { word-break: normal; overflow-wrap: anywhere }` | Delete (inherited from canonical subject rule) |
| `70-dashboard-project-home.css:1176` | `.gb-timeline { word-break: auto-phrase; text-wrap: pretty }` | Delete |
| `70-dashboard-project-home.css:573-580` | `.gb-project-card__title { word-break: keep-all }` | Delete (`keep-all` is banned) |
| `75-project-pages.css:2037-2038` | `#activity, table.related-issues` → `pretty` | Delete |
| `75-project-pages.css:2126-2131` | time-entry subject `text-wrap: wrap; word-break: normal` at ≤599px | Delete |
| `80-account-search-misc.css:1001-1016` | my/account checkbox labels → `pretty` | Delete |
| `80-account-search-misc.css:1058-1069, 1077-1085` | `.gb-act__meta`, activity / search issue titles | Delete (C-timeline) |
| `90-admin-settings.css:1844-1848` | admin `label, legend, .gb-admin-card__desc` → `balance` | Delete (labels are not headings) |
| `90-admin-settings.css:2532` | commit-keywords cells → `balance` | Delete |
| `90-admin-settings.css:2590, 2793-2796, 2985-2995` | plugin description, `em.info`, status warning → `pretty` | Delete |
| `90-admin-settings.css:2099-2102, 2248, 2378-2381, 2409, 2445-2449` | `word-break: auto-phrase` one-offs | Delete (covered by canonical prose / label rule) |
| `90-admin-settings.css:2428-2432` | permissions header `word-break: keep-all` | Replace by `white-space: nowrap` (layout) or delete |
| `40-issue-list.css:401-411`, `50-issue-detail.css:249-265, 458-470` | `word-break: break-word` (deprecated value) | Delete the declaration |
| `50-issue-detail.css:1030-1037` | subtask / relation `.gb-subj` wrap triple | Delete (canonical subject rule) |
| `66-documents-files-news-forums.css:180-183, 822, 938-939` | doc title, forum subject, `.gbd-tl-*` | Delete (heading / subject rule) |
| `65-wiki.css:14-25, 372-384` | `div.wiki { overflow-wrap: break-word }`, `.wiki th/td { word-break: normal }` | Move to the canonical prose rule |
| `65-wiki.css:248-259, 1345-1359`, `66-…css:863, 1011`, `95-responsive.css:1220, 1318-1328`, `80-…css:133, 443, 822` | code, diff, file names, attachments, search links, API key | Move to the canonical token rule |
| `js/60-board.js:866-926` (`subjectLines`, `awkward`, `tuneSubject`, `tuneSubjects`, `queueSubjects`, `watchSubjects`) | measures lines and toggles `.gb-subj--balance` | **Delete** |
| `js/95-responsive.js:322-400` (`unglue`, `charTop`, `glueLastLine`, `glueSubjects`, `scheduleGlue`) | re-breaks the last line of subjects by measuring glyph rects | **Delete** |

**Page files may only**: nothing. No page or component file may contain the five wrap properties after this
pass (`white-space: nowrap` on single tokens — dates, keys, pills, buttons, table headers — stays where it is).

**Done check** (must print nothing):
`grep -nE 'text-wrap|word-break|line-break|overflow-wrap' src/css/*.css | grep -v '15-c-wrap.css'`

---

## C-form — form primitives (F1–F4) · DESIGN §6.2, §6.3, §6.4

**Owns**: `label .required`, `span.required`, `legend .required`; `input[type=checkbox]`, `input[type=radio]`
box size; the blank-option decorator for every `select` (class `gb-unset` on the select, `data-gb-unset` on the
option) and the muted colour of an unset select; bulk-edit 「(変更なし)」.

**Duplicates / conflicts to remove**

| File:lines | What | Action |
|---|---|---|
| `10-global.css:514` | `span.required, label .required` (2px) | Move → canonical (4px, §6.3) |
| `55-issue-form.css:256-257, 1882-1884` | issue / bulk / modal `.required` (uses `--f-danger`, inline-block) | Delete |
| `60-board.css:835` | new-card modal `.required` | Delete |
| `66-documents-files-news-forums.css:258-260, 315` | docs / news / files / message `.required` | Delete |
| `90-admin-settings.css:365, 567` | admin / project settings `.required` | Delete |
| `10-global.css:423-432` | base checkbox / radio 16×16 | Move → canonical |
| `40-issue-list.css:152, 343`; `55-issue-form.css:313-322, 1824, 1827-1834`; `65-wiki.css:1201, 1269`; `80-account-search-misc.css:992-1000`; `90-admin-settings.css:298-306, 320-327`; `30-sidebar-nav.css:434` | nine more places that restate 16×16 (some only `height`) | Delete the size declarations |
| `95-responsive.css:392` | drawer checkboxes 18×18 | Delete (16×16 everywhere; the 40px row is the hit target) |
| `75-project-pages.css:1104-1105` | time-entries `th/td.checkbox` at ≤560px (source of the 16×13 box) | Keep cell width only; the input must not shrink (`flex: none; min-height: 16px` comes from canonical) |
| `55-issue-form.css:1700-1702, 1835-1837`, `60-board.css:851-876` | `select.gb-unset` muted colour (3 copies) | Move → canonical, unscoped |
| `js/55-issue-form.js:12, 353-377` (`decorateUnset`, `syncUnset`; also writes 「未選択」) | blank option, issue form + modals only | Move → `15-c-form.js`, all forms |
| `js/60-board.js:383-417` (`UNSET_LABEL`, `UNSET_FIELDS`, `syncUnset`, blank part of `decorateModalFields`) | copy for 3 fields of the new-card modal | Delete (keep `markSelectRow`, it is C-issue-row I2) |
| `js/66-docs-files-news-forums.js:15, 1083-1093` (`filesVersionNone`, 「指定なし」) | files version select | Delete; keep only the `value=""` pinning inside `15-c-form.js` |
| `js/75-project-pages.js:876-888` (`decorateActivityUserSelect`, 「すべてのユーザー」) | activity sidebar | Keep the wording (listed exception in §6.2) but call the C-form helper |
| `js/40-issue-list.js:288-293` | 「＋ フィルタを追加」 prompt | Moves with C-filter (listed exception in §6.2) |

**Page files may only**: place a checkbox / label inside their grid; set the width of a select.

**Done check**: `grep -nE '\.required|未選択|指定なし|選んでください' src/css/*.css src/js/*.js | grep -v '15-c-form'`
prints only `table.fields_permissions td.required` (`90-admin-settings.css`, a different thing).

---

## C-filter — filter bar `#query_form` (Q1) · DESIGN §6.9

**Owns**: `#query_form_with_buttons`, `#query_form_content`, `fieldset#filters`, `fieldset#options` and their
legends, `#filters-table` rows, `#add_filter_select`, `.gb-opt-summary`, `.gb-filter-count`,
`#query_form_with_buttons > p.buttons` (適用 / クリア / save-query), the folded-by-default behaviour and the
legend summaries. One look on issues, board, time entries, calendar, gantt, `/projects`, `/users`,
`/admin/projects`.

**Duplicates / conflicts to remove**

| File:lines | What | Action |
|---|---|---|
| `40-issue-list.css:52-296, 795-845` | the current implementation (112 rules, unscoped) | **Move** → `15-c-filter.css` (this is the base) |
| `60-board.css:1033-1075, 1296-1311` | board copy incl. `.gb-opt-summary` (1044-1052) and save button | Delete |
| `75-project-pages.css:1205-1220, 1291-1296, 1399-1438, 1469-1471, 1489-1491, 1653-1659, 1863-1872, 1953-1961, 1986-2021, 2091-2093, 2141-2153, 2249-2254` | calendar / gantt / time-entry variants (43 rules) | Delete everything that styles the panel, legends, rows, buttons. Keep only the page toolbar row (month nav, zoom, report selects) |
| `80-account-search-misc.css:331, 611-619, 804-808, 913, 934` | `/projects` and `/search` copies | Delete panel styling; `/search` form may reuse the panel look by adding class `gb-filter-panel` (exposed by canonical) |
| `90-admin-settings.css:428-430, 971-982, 1388-1440, 2319-2322, 2596-2615, 2630-2633, 2706-2709, 2852-2856, 2920-2935` | `/users`, `/admin/projects`, other admin filter rows | Delete panel / button styling; keep table layout |
| `95-responsive.css:549-571, 607, 707, 1100, 1207-1208, 1334-1350, 1752-1838, 1967-1989` | phone variants incl. `.gb-opt-summary` (1804-1813) and the icon-only save button | **Move** → the `@media` / `@container` blocks of `15-c-filter.css` |
| `10-global.css:575-578, 1420, 1496-1512`; `65-wiki.css:621-644`; `70-…css:430-441` | generic `fieldset.collapsible` legends | Stay (not the filter bar) — but must not match inside `#query_form` |
| `js/40-issue-list.js:287-320` (`decorateFilterBar`: prompt, save title, phone fold, `.gb-filter-count` badge) | issues only | Move → `15-c-filter.js`; drop the count badge (summary text replaces it, §6.9) |
| `js/60-board.js:712-791` (`filterFields`, `foldFilters`, `legendSummary`, `summarizeFilters`, `summarizeOptions`), `:928-934` (`labelSave`) | board only | Move the best version → `15-c-filter.js`, delete here |
| `js/95-query-summary.js:1-46` (whole file) | third copy, issues only | **Delete the file** |

**Page files may only**: add their own toolbar row *after* `p.buttons` (gantt zoom / month, calendar month nav,
time-report 詳細 / 追加 selects — `75-project-pages.js:591, 692, 848, 892, 964, 1014` stay) and set the panel's
outer margin. `js/60-board.js:530-542` (re-measure the board after the panel changes height) stays.

**Done check**: `grep -nE '#query_form|#filters|#options\b|filters-table|add_filter|gb-opt-summary|icon-save' src/css/[2-9]*.css`
shows only page toolbar rows; `grep -n '件の条件' src/js/*.js` hits `15-c-filter.js` only.

---

## C-timeline — activity / timeline item (T1, T2) · DESIGN §6.5

**Owns**: `.gb-timeline`, `.gb-timeline__day / __list / __item / __body / __meta / __who / __action /
__project / __title / __text / __link / __key / __subject / __hours / __change / __arrow / __desc / __time`.
One DOM for all three pages: the plugin partial prints it for the dashboard and the project home; on
`/activity` (and `/projects/:id/activity`, `/users/:id`) `15-c-timeline.js` rewrites core's `dl#activity`
into the **same class names**, so one stylesheet serves all. `.gb-act*` disappears.

**Duplicates / conflicts to remove**

| File:lines | What | Action |
|---|---|---|
| `70-dashboard-project-home.css:114-304` | `.gb-timeline` base (88 rules total in this file) | **Move** → `15-c-timeline.css` |
| `70-dashboard-project-home.css:1061-1080, 1138-1190, 1229-1242, 1258-1289` | later rounds: container clamp 2 → `none`, dashboard-only `#my-page .gb-timeline …` overrides (the T2 ellipsis) | Delete; one clamp from §6.7 |
| `70-dashboard-project-home.css:645-646, 680-693, 1200-1201` | block / home card padding around the list | Stay (layout) |
| `75-project-pages.css:103-279` | `.gb-act` implementation for `/activity` (58 rules) | Delete (JS now emits `.gb-timeline__*`); keep `.gb-act-filter*` sidebar form rules |
| `75-project-pages.css:1610-1633, 1967-1980, 2037-2044` | `.gb-act` narrow / wrap variants | Delete |
| `80-account-search-misc.css:1041-1115` | third layer on `.gb-act` (`html body.controller-activities …`, grid override, title clamp `none`) | Delete |
| `80-account-search-misc.css:463-493, 763-766, 818, 868, 957-959` | `/users/:id` `#activity dt/dd` own look | Delete once the JS decorates it; keep the profile card layout |
| `95-responsive.css:301-315, 949-953, 967, 1855-1869` | phone overrides for both DOMs | Move the needed ones into `15-c-timeline.css` |
| `66-documents-files-news-forums.css:695-728, 910, 922-942` | `.gbd-tl-*` = forum / document **message thread** items | Not a timeline: stays with docs-files-news-forums, but must take wrap from C-wrap and may not be reused for activity |
| `js/75-project-pages.js:100-193` (`decorateActivity`), helpers `:42-80` (`statusPill`, `classNum`, `issueKey`, `stripMarkup`, `dayLabel`) | builds `.gb-act` rows, single trailing status pill, indents grouped rows | Move → `15-c-timeline.js`, emit `.gb-timeline__*`, no indent, 「A → B」 line (§6.5) |
| `js/70-dashboard-project-home.js:427-480` (`markTimelineDays`, `markTimelineExtras`, `fitHomeTimeline`) | how many rows the home card shows | Stays (layout: row count only; must not touch row internals) |
| `js/80-pages.js:138-200` (`keyifyLink`, `badgeIssueLink`) for `/users/:id` activity | another title builder | Replace by a call into `15-c-timeline.js` |
| `plugins/…/_timeline.html.erb:40` | relative time `gb_ago` | Change to §6.5 (clock time) |

**Page files may only**: card padding around `.gb-timeline`, max rows / 「すべて見る」, whether the project chip is
requested (`show_project`).

**Done check**: `grep -nE 'gb-act(__|\b)[^-]|gb-timeline' src/css/[2-9]*.css` shows no rule that sets
anything inside an item; `grep -c 'gb-act__' src/js/*.js` is 0.

---

## C-issue-row — issue lists, cards, dashboard tables, gantt rows (I1–I6) · DESIGN §6.6, §6.7, §6.8

**Owns**: the subject cell / subject text wherever an issue is listed — `table.list.issues td.subject`,
`#my-page .mypage-box table.list td.subject > .gb-subj`, `:is(#issue_tree, #relations) td.subject .gb-subj`,
`table.related-issues td.subject`, `.gb-te-issue / .gb-te-subj`, `.gb-cal-chip__subject`, board
`.issue-card .card-content > .subject`, `.gantt_subjects_column .issue-subject`; the key column
(`th.id`, `td.id`, `.gb-key`, header text 「キー」); the assignee slot of a row / card (`.gb-avatar--empty`
usage); the status-dot select row `p[data-status]` used by the board modal and the issue form (I2).
It does **not** own the table chrome (`table.list` stays global) nor the board column layout.

**Duplicates / conflicts to remove**

| File:lines | What | Action |
|---|---|---|
| `40-issue-list.css:383-412` | issue list `td.subject a` clamp 2 + `th.id / td.id` | Move → canonical |
| `50-issue-detail.css:458-470, 484-504, 1014-1047` | subtasks / relations subject | Move the clamp, delete the rest |
| `60-board.css:445-457, 528-534` | card subject, clamp 3 | Move → canonical |
| `60-board.css:580-590, 615`, `10-global.css:1221`, `js/60-board.js:69-78` (`emptyAvatar`), `:126-240` (footer build) | dashed empty avatar + footer row (I1) | Delete `emptyAvatar` and its CSS: unassigned = no avatar, no placeholder (§6.8). `.gb-card-foot:empty` stays hidden |
| `60-board.css:851-880` (`#new-issue-card-modal p[data-status="n"]`, `--gb-card-st`), `55-issue-form.css:566-571` + the dot rules next to them (`#issue-form #attributes p[data-status="n"]`, `--gbf-st`), `js/60-board.js:393-417` (`markSelectRow`) | status dot of the status select — two implementations that look different (I2) | One unscoped rule in canonical for `p[data-status] > select` (dot inside the select, §6.8); both JS decorators only set `data-status` |
| `70-dashboard-project-home.css:475-477, 492-535, 992-1015, 1093-1105, 1117-1134` | dashboard table subject: clamp 2 (500-507) then `none` (1118-1125), id column 1% | Delete; canonical clamp + column widths (I4) |
| `95-responsive.css:1715-1729` | dashboard subject clamp at ≤419px container | Delete |
| `75-project-pages.css:461-479, 1633-1651, 1907-1936` | roadmap / version related issues subject (clamp, wrap) | Delete |
| `75-project-pages.css:1015-1024, 1738-1745, 1809-1839, 2101-2131` | time-entry issue cell: clamp 2 → none → 2 → none | Delete; one clamp |
| `75-project-pages.css:2270-2279`, `95-responsive.css:913-937, 1602-1616` | calendar chip subject: three contradicting clamps | Delete; one clamp |
| `75-project-pages.css:829-972, 1718-1728, 1985-2021, 2243-2261`, `95-responsive.css:1735-1774` | gantt subject column (89 rules for gantt in total) | Only the subject-cell text rules move; chart chrome stays with project-pages |
| `js/75-project-pages.js:710-772` (`ganttSubjectsTarget`, `sizeGanttSubjects`, `widenGanttSubjects`), `:908-921` (`splitGanttTracker`) | gantt subject width — currently yields ~200px at 1273px (I6) | Move → `15-c-issue-row.js`, width per §6.7 |
| `js/40-issue-list.js:113-181` (`keyOf`, `issueKey`), `js/60-board.js:114-119`, `js/55-issue-form.js:592-594`, `js/70-dashboard-project-home.js:~28`, `js/75-project-pages.js:51-54`, `js/80-pages.js:138-165` | six `issueKey` wrappers around `GB.issueKey` | Call `GB.issueKey` (00-core.js) directly; delete local copies that only re-implement the format |
| (no rule yet) `th.id` header text | core prints 「#」 (I3) | `15-c-issue-row.js` sets 「キー」 on `th.id` (keeps the sort link) and on the 「#」 option of the columns pickers |
| core `Redmine::Helpers::Gantt#line_for_version` | rounds 28.5 → 29% (I5) | `lib/redmine_greenboard/gantt_patch.rb`: floor, like `_project_summary.html.erb:48` |

**Page files may only**: column widths of *other* columns, which columns are hidden at which width, table
scroll wrappers, board column / swimlane layout, gantt chart area.

**Done check**: `grep -nE 'line-clamp' src/css/*.css | grep -vE '15-c-(issue-row|timeline|wrap)\.css'`
lists only non-subject excerpts (descriptions, news summaries, search results);
`grep -n 'gb-avatar--empty' src/css/*.css src/js/*.js` prints nothing.

---

## C-comment — comment entry row (K1) · DESIGN §6.10

**Owns**: `.gb-comment-cta`, `.gb-comment-cta__btn` — the collapsed 「コメントを追加…」 / 「返答を書く…」 row.
The expanded state stays with the page (issue compact panel = issue-form; news / forum reply form =
docs-files-news-forums) and must use the C-editor unit.

**Duplicates / conflicts to remove**

| File:lines | What | Action |
|---|---|---|
| `55-issue-form.css:1247-1254, 1278-1300, 1582` | `.gb-comment-cta` (issue detail) | **Move** → `15-c-comment.css` (this is the reference look) |
| `55-issue-form.css:9-30` | private `--f-*` aliases declared on `.gb-comment-cta, .jstBlock` | Remove both selectors from the alias list; component files use the `--gb-*` tokens directly, never `--f-*` |
| `66-documents-files-news-forums.css:441-455` | `.gbd-pseudo-wrap`, `.gbd-pseudo`, `.gbd-pseudo-icon`, `.gbd-pseudo-text` (icon inside the box, different height / border) | Delete |
| `js/55-issue-form.js:767-786` (`buildCommentCta`: avatar + button) | issue | Move the row builder → `15-c-comment.js` as `GB.commentCta(label, onOpen)`; the panel logic stays |
| `js/66-docs-files-news-forums.js:387-447` (`pseudoTrigger`), callers `:482-484` and the forum reply caller | news + forum: restyles core's `<a>` | Replace the trigger by `GB.commentCta(T.writeComment / T.writeReply, …)`; delete `.gbd-pseudo*` |

**Page files may only**: the margin above the row and where it is inserted.

**Done check**: `grep -n 'gbd-pseudo' src/css/*.css src/js/*.js` prints nothing;
`grep -n 'gb-comment-cta' src/css/*.css` hits `15-c-comment.css` only.

---

## C-editor — editor unit: jsToolbar + textarea (E1, E2) · DESIGN §6.11

**Owns**: `.jstBlock`, `.jstTabs`, `.jstElements` and its buttons / spacers, `.jstEditor`, `.jstHandle`,
`textarea.wiki-edit`, `.wiki-preview` (frame only — the rendered `.wiki` typography stays with wiki),
`.gb-jst-narrow`, the overflow indicator, editor auto-height.
Exposes `--gb-editor-min` and `--gb-editor-max` (height of the textarea / preview) for pages.

**Duplicates / conflicts to remove**

| File:lines | What | Action |
|---|---|---|
| `55-issue-form.css:32-217, 951, 1081, 1352-1359, 1596-1639, 1770-1792, 1900, 1929` | current shared implementation + later patches (50 rules; they read the private `--f-*` aliases of `:9-30`) | **Move** → `15-c-editor.css`, folded into one rule set, rewritten on `--gb-*` tokens |
| `65-wiki.css:28-39, 901-909, 944-1007, 1568-1571, 1760` | wiki edit: own toolbar / textarea rules; `:1754` `.gb-wiki-autogrow { field-sizing }` | Delete; wiki sets `--gb-editor-min/max` only (split-preview layout 944-1007 may keep grid placement) |
| `66-documents-files-news-forums.css:146-167, 261, 317-323, 579-581` | docs / news / forum editor variants | Delete; set `--gb-editor-min` |
| `90-admin-settings.css:432-435, 588-590, 2663-2670` | settings editors (P4: right edge) | Delete; width comes from the form grid |
| `95-responsive.css:619-632, 1106-1113` | phone: `max-height: 60vh; field-sizing: content` on all `textarea.wiki-edit` + project-settings | Move → canonical |
| `10-global.css:502, 1418-1419`; `50-issue-detail.css:1008-1009` | stray `.jstBlock` / `.wiki-edit` rules | Move / delete |
| `js/55-issue-form.js:260-312` (`untabToolbars`, `syncNarrow`, `syncToolbarMore`, `watchToolbars`), `:379-388` (`fixEmptyPreview`) | toolbar overflow (`--gb-jst-cover`) — only runs inside the issue form, hence E1 on wiki / settings | Move → `15-c-editor.js`, run for every `.jstBlock` |
| `js/65-wiki.js:974-988` (`autogrow`, phones only) | E2 | Move → `15-c-editor.js`, all widths, min / max from the custom properties |
| `js/65-wiki.js:608-720` (`splitPreview`) | wiki-only feature | Stays; must not set heights that fight auto-height |
| `js/66-docs-files-news-forums.js:932-938` | focuses the edit tab | Stays |

**Page files may only**: `--gb-editor-min`, `--gb-editor-max`, the unit's width / margin, placement of the
split preview.

**Done check**: `grep -nE 'jstBlock|jstElements|jstEditor|jstTabs|wiki-edit' src/css/[2-9]*.css`
shows only lines that set `--gb-editor-*`, width, margin or grid placement.

---

## Page items (P1–P4) — not components, stay with page owners

| Item | Owner | File |
|---|---|---|
| P1 files: checksum hidden, Japanese units | docs-files-news-forums | `66-*.css`, `66-*.js` |
| P2 admin keeps the site's left navigation frame | global-shell (frame) + admin-settings | `30-sidebar-nav.*`, `90-admin-settings.*` |
| P3 wiki history radio columns | wiki | `65-wiki.css` |
| P4 settings checkbox grids at 375px, editor right edge | admin-settings (after C-form / C-editor land) | `90-admin-settings.css` |
| P5 | covered by C-wrap W1 | — |
