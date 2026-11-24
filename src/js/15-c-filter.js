// 15-c-filter — filter bar `#query_form` (DESIGN §6.9, ACCEPTANCE Q1). The ONE decorator for the query
// filter panel on issues, board, time entries, calendar, gantt, /projects, /users and /admin/projects:
//   - 「＋ フィルタを追加」 as the blank option of #add_filter_select (the label stays for screen readers)
//   - the save-query link is an icon button: title + aria-label 「カスタムクエリを保存」 (css/15-c-filter.css)
//   - folded legends say what is active: フィルタ 「N件の条件」, オプション 「グループ: 〈name〉」 (.gb-opt-summary)
//   - phones (< 768px): both fieldsets start folded on every load (not persisted); a validation error or a
//     checked filter without a value keeps フィルタ open
(function () {
  var GB = window.GB;
  if (!GB) return;
  var SAVE_LABEL = 'カスタムクエリを保存';
  var ADD_PROMPT = '＋ フィルタを追加';
  var PHONE = '(max-width: 767px)';

  function isPhone() { return !!(window.matchMedia && window.matchMedia(PHONE).matches); }

  function legendOf(form, id) { return form.querySelector('fieldset#' + id + ' > legend'); }

  function legendSummary(legend, text) {
    if (!legend) return;
    var span = legend.querySelector(':scope > .gb-opt-summary');
    if (!text) { if (span) span.remove(); return; }
    if (!span) {
      span = document.createElement('span');
      span.className = 'gb-opt-summary';
      legend.appendChild(span);
    }
    if (span.textContent !== text) span.textContent = text;
  }

  function checkedFilters(form) {
    return form.querySelectorAll('#filters-table input[type=checkbox][name="f[]"]:checked');
  }

  function summarize(form) {
    var n = checkedFilters(form).length;
    legendSummary(legendOf(form, 'filters'), n ? n + '件の条件' : '');
    var group = form.querySelector('select#group_by');
    var opt = group && group.value ? group.options[group.selectedIndex] : null;
    legendSummary(legendOf(form, 'options'), opt ? 'グループ: ' + opt.textContent.trim() : '');
  }

  function decoratePrompt(form) {
    var sel = form.querySelector('#add_filter_select');
    if (!sel || sel.dataset.gbPrompt) return;
    sel.dataset.gbPrompt = '1';
    var blank = sel.querySelector('option[value=""]');
    if (blank && !blank.textContent.trim()) blank.textContent = ADD_PROMPT;
  }

  function decorateSave(form) {
    var save = form.querySelector('#query_form_with_buttons > p.buttons > a.icon-save');
    if (!save || save.dataset.gbSave) return;
    save.dataset.gbSave = '1';
    var label = save.querySelector('.icon-label');
    var text = (label && label.textContent.trim()) || save.textContent.trim() || SAVE_LABEL;
    save.title = text;
    save.setAttribute('aria-label', text);
  }

  function fold(fieldset) {
    var legend = fieldset && fieldset.querySelector(':scope > legend');
    if (!legend || fieldset.classList.contains('collapsed') || typeof window.toggleFieldset !== 'function') return;
    window.toggleFieldset(legend);
  }

  function unfold(fieldset) {
    var legend = fieldset && fieldset.querySelector(':scope > legend');
    if (!legend || !fieldset.classList.contains('collapsed') || typeof window.toggleFieldset !== 'function') return;
    window.toggleFieldset(legend);
  }

  // a checked filter whose value inputs are all empty (operators without a value — 「すべて」「なし」 … —
  // have their value span hidden, so only visible inputs count)
  function hasEmptyFilter(form) {
    return Array.prototype.some.call(checkedFilters(form), function (cb) {
      var row = cb.closest('tr, .filter');
      if (!row) return false;
      // core hides the value span with an inline display:none (the fieldset itself may be folded already)
      var inputs = row.querySelectorAll('.values > span:not([style*="none"]) :is(input:not([type=hidden]), select)');
      if (!inputs.length) return false;
      return Array.prototype.every.call(inputs, function (el) {
        if (el.tagName === 'SELECT') return !Array.prototype.some.call(el.selectedOptions, function (o) { return o.value !== ''; });
        return !String(el.value || '').trim();
      });
    });
  }

  function foldOnPhone(form) {
    if (form.dataset.gbFold || !isPhone()) return;
    form.dataset.gbFold = '1';
    var filters = form.querySelector('fieldset#filters');
    var options = form.querySelector('fieldset#options');
    var error = document.getElementById('errorExplanation');
    if (!error) fold(filters);
    fold(options);
    // core builds the filter rows in its own ready handler, after this first pass: re-open フィルタ when a
    // checked filter turned out to have no value (the user has to see what is missing)
    window.setTimeout(function () {
      if (filters && hasEmptyFilter(form)) unfold(filters);
      summarize(form);
    }, 0);
  }

  function run() {
    var form = document.getElementById('query_form');
    if (!form || !form.querySelector('#query_form_with_buttons')) return;
    decoratePrompt(form);
    decorateSave(form);
    foldOnPhone(form);
    summarize(form);
    if (form.dataset.gbSummary) return;
    form.dataset.gbSummary = '1';
    form.addEventListener('change', function () { summarize(form); });
    form.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('legend')) window.setTimeout(function () { summarize(form); }, 0);
    });
    // core adds the filter rows from JSON in its own ready handler, after this first pass
    window.setTimeout(function () { summarize(form); }, 0);
    window.addEventListener('load', function () { summarize(form); });
  }

  GB.ready(run);
  GB.onAjax(run);
})();
