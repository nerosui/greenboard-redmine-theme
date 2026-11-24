# Round 3 — fixed acceptance list (the ONLY things reviewers judge this round)

Why this file exists: in rounds 1–2, every review was open-ended, so 78% of later-round issues were brand-new
discoveries, reviewers contradicted each other (text-wrap: add → remove → add), cross-owner requests were never
delivered, and shared components were re-implemented per page (e.g. `.wiki` styled in 13 files, the filter bar in 5).
This round is organised by COMPONENT, judged against this fixed list, and checked for regressions against
baseline screenshots.

Baseline screenshots: production screenshots taken before the round (not included in this repository).
A change is a REGRESSION if a page looks worse than its baseline in any way not required by an item below.

## Rules for this round
- Reviewers judge only: (a) each item below = PASS/FAIL with evidence, (b) regressions vs baseline on the pages the
  component touches. New ideas go to a "later" list and do NOT fail the round.
- Decisions recorded in `DESIGN.md §6 Decisions` are final; reviewers must not ask for the opposite.
- One implementation per shared component (see `COMPONENTS.md`). Page files must not restyle a shared component;
  they may only set layout around it (width, margin, placement).
- Every agent returns cross-component requests in its structured output; the orchestrator delivers them.

## Items

### C-wrap — text wrapping (one global policy)
- W1 Body text (`.wiki p/li/blockquote`, news summaries, issue description, comments) does not use `text-wrap: balance`;
  2-line paragraphs fill line 1 (e.g. /issues/3 description at 375px: 「トップページの初回表示に 4 秒ほどかかって／いる。」 style, not split in half).
- W2 Headings and titles may use balance; subjects in lists/cards/timelines use one shared rule (no per-page variants).

### C-form — form primitives
- F1 Required marker 「*」 has the same spacing on every form (issue new/edit, wiki new, time entry new, project settings, my/account).
- F2 Empty select options use one wording 「未設定」 (or a deliberate locale string) everywhere: no fully blank selects
  (タイムゾーン on /my/account, 親プロジェクト名 on /projects/demo/settings), no 「--- 選んでください ---」, 「指定なし」 mix.
- F3 Checkboxes are 16×16 everywhere (time entries table rows were 16×13).
- F4 Bulk edit default option reads 「(変更なし)」 (locale already added; verify).

### C-filter — filter bar (`#query_form`)
- Q1 Identical on issues, board, time entries, calendar, gantt, /projects, /users, admin projects: collapsed by default on
  phones with 「N件の条件」 summary; save-query button is the same outlined icon button right after 「クリア」 at every width.

### C-timeline — activity/timeline item
- T1 Dashboard 最近の更新, project home 最近の更新 and /projects/demo/activity render the same event the same way
  (time position, status change 「A → B」 line, relative vs absolute time chosen once).
- T2 Dashboard timeline subjects are not ellipsised when the project home shows them in full.

### C-issue-row — issue lists, cards, dashboard tables
- I1 Board cards: no empty dashed avatar placeholder (desktop and phone, grouped and ungrouped).
- I2 Board new-card modal: status colour dot sits inside the select like on /projects/demo/issues/new; all labels share one left edge.
- I3 Issue list header for the key column reads 「キー」 (not 「#」) wherever keys like DEMO-23 are shown.
- I4 Dashboard 担当/ウォッチ tables: subjects readable (2-line clamp or full width), not cut at ~8 characters.
- I5 Gantt percentage for v1.0 matches roadmap/home (28%).
- I6 Gantt subject column: subjects readable at 1273px (not mostly 「DEMO-14: [UIテスト] 履歴表…」).

### C-comment — comment entry row
- K1 The collapsed 「コメントを追加…」/「返答を書く…」 row looks identical on /issues/3, /news/1, /boards/1/topics/1.

### C-editor — editor unit (jsToolbar + textarea)
- E1 Phone toolbar overflow: no half-clipped icon/separator after the 「›」 indicator (issue new, wiki edit, project settings).
- E2 Wiki edit: editor height fits content with a sensible min/max (no full-viewport empty textarea for a short page).

### Page items
- P1 /projects/demo/files: checksum column hidden by default (DESIGN §3.6); sizes in Japanese units (「18 バイト」).
- P2 /admin, /settings and other admin pages keep the same left navigation frame as the rest of the site (no frame jump).
- P3 /projects/demo/wiki/リリース手順/history: comparison radio buttons aligned in fixed columns.
- P4 Admin regressions from round 2: /settings?tab=issues and ?tab=authentication checkbox grids must not overflow at 375px;
  /settings general: editor right edge aligned with other inputs.
- P5 /issues/3 at 375px: description wraps naturally (covered by W1).

### Owner decisions already applied (not regressions)
- Name order is now 「田中 太郎」 (admin setting changed by the orchestrator at the owner's request). Baseline screenshots
  still show 「太郎 田中」 / 「プレビュー 確認用」 order — that difference is expected, not a regression.
- Documents 「てs」「１２」 were deleted at the owner's request; the documents list now has 3 items.

---

# Round 4 — the 7 "later" items (the ONLY things judged this round)

Baseline for round 4 = the round-3 production screenshots (not included). Round-3 items W1..P5 must stay PASS (no regressions). Same rules as round 3.

- L1 [C-editor] Wiki edit side-by-side (「並べて表示」, e.g. /projects/demo/wiki/Wiki/edit and 開発ルール/edit at 1273px):
  editor and preview columns have the same height = max(textarea content, preview content) up to the editor max height;
  the preview does not get its own inner scrollbar unless that max is exceeded.
- L2 [C-editor] Phone toolbar (375px; issues/new, wiki edit, project settings): after scrolling the toolbar to either end,
  no button is clipped at either edge (scroll-snap to whole buttons, fade/indicator on the side that has more).
- L3 [C-timeline] /projects/demo/activity (and /activity): within each day heading, items are in descending time order,
  same as dashboard / project home.
- L4 [Pages] /users at 1273px with both navs open: 作成日 and 最終ログイン fit on one line; e-mail not cut when space allows
  (drop or compact lower-priority columns at this width instead of wrapping).
- L5 [C-form] Empty-value select options read 「未設定」 everywhere (including core 「なし」 used for "no value", e.g. デフォルトのクエリ,
  デフォルトのプロジェクトクエリ, デフォルトのマイルストーン). Options that mean something else (e.g. 「(自動設定)」 = automatic) keep their
  wording but use the same muted style as 「未設定」. Record the rule in DESIGN.md §6.2.
- L6 [C-issue-row] Dashboard 担当/ウォッチ tables at 1273px: a subject never breaks right after 「[UIテスト]」 while line 1 still has room;
  short subjects stay on one line (e.g. move the tracker pill so the subject gets the full cell width).
- L7 [Pages] /settings at 1273px: the tab bar is one row (compact spacing or horizontal scroll with fade), consistent with
  other tab bars; no second row.
