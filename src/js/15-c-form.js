// 15-c-form — form primitives (DESIGN §6.2, ACCEPTANCE F2). The ONE blank-option decorator.
// Every single select whose first option is empty (value "", no visible text) or core's
// 「--- 選んでください ---」 prompt or core's 「なし」 (label_none, "no value": デフォルトのクエリ,
// デフォルトのマイルストーン …) reads 「未設定」 (textContent and label; value stays "") and gets
// class `gb-unset` (muted, css/15-c-form.css) while that option is selected.
// An empty-value first option that means something else (「(自動設定)」, 「デフォルト」,
// 「ユーザーの言語の設定に従う」, text formatting 「なし」 = plain text …) keeps its wording but gets the
// same muted style (ACCEPTANCE L5, DESIGN §6.2). GET (filter) forms are left alone.
// Public helpers:
//   GB.form.labelBlank(select, text, muted) -> true when the blank option was (re)labelled
//     (for the listed exceptions that keep their own wording, e.g. 「すべてのユーザー」, muted === false)
//   GB.form.syncUnset(select)
//   GB.form.markRequired(label)  -> appends core's required marker once
//   GB.form.labelText(label)     -> the label's text without the marker
(function () {
  var GB = window.GB;
  var UNSET_LABEL = '未設定';
  var PROMPT = /^-+\s.*\s-+$/;
  var NONE = 'なし';
  // 「なし」 here is a real choice (no formatting / no compression), not "no value": keep the wording
  var NONE_KEEP = '#settings_text_formatting, #settings_wiki_compression';
  // an empty-value first option that is a concrete choice shown in normal colour (§6.2):
  // custom field 表示 「ドロップダウンリスト」 (drop-down vs checkboxes)
  var OWN_KEEP = '#custom_field_edit_tag_style';
  // deliberate exceptions (§6.2): their blank option means "choose an action" / "all"; filter-row value
  // selects are untouched; bulk edit reads 「(変更なし)」 (§6.4)
  var SKIP = '#add_filter_select, #block-select, #criterias, #filters-table select, ' +
    '#activity_scope_form select, #bulk_edit_form select';

  function blankOption(select) {
    var o = select.options[0];
    if (!o || o.value !== '') return null;
    var text = (o.label || '').trim();
    var mode = o.dataset.gbUnset;
    return (!text || PROMPT.test(text) || mode === '1' || mode === 'keep') ? o : null;
  }

  // core's 「なし」 for "no value" (label_none) on a non-filter form
  function noneOption(select) {
    var o = select.options[0];
    if (!o || o.value !== '' || o.dataset.gbUnset || isFilterForm(select) || select.matches(NONE_KEEP)) return null;
    return (o.label || '').trim() === NONE ? o : null;
  }

  function isFilterForm(select) {
    var f = select.form;
    return !!(f && (f.getAttribute('method') || 'get').toLowerCase() === 'get');
  }

  // '1' = 「未設定」, 'auto' = own wording, muted; 'keep' = own wording, not muted (listed exceptions)
  function syncUnset(select) {
    var o = select.options[0];
    var mode = o && o.dataset.gbUnset;
    select.classList.toggle('gb-unset', !!((mode === '1' || mode === 'auto') && select.value === ''));
  }

  // an empty-value option with its own wording (「(自動設定)」 …): same muted style, wording kept
  function muteOwnWording(select) {
    if (select.matches(OWN_KEEP)) return;
    var o = select.options[0];
    if (!o || o.value !== '' || o.dataset.gbUnset || isFilterForm(select) || !(o.label || '').trim()) return;
    if (!o.hasAttribute('value')) o.setAttribute('value', '');
    o.dataset.gbUnset = 'auto';
    syncUnset(select);
  }

  function labelBlank(select, text, muted) {
    var o = blankOption(select) || noneOption(select);
    if (!o) return false;
    // core sometimes renders <option></option> without a value attribute: pin value="" first,
    // otherwise the new label text would be submitted as the value
    if (!o.hasAttribute('value')) o.setAttribute('value', '');
    if (o.textContent !== text) o.textContent = text;
    // core renders <option value="" label=" ">: the label attribute wins over the text
    if (o.hasAttribute('label')) o.label = text;
    o.dataset.gbUnset = muted === false ? 'keep' : '1';
    syncUnset(select);
    return true;
  }

  function decorate(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('select:not([multiple])'), function (select) {
      if (select.matches(SKIP) || (select.size && select.size > 1)) return;
      if (!labelBlank(select, UNSET_LABEL)) muteOwnWording(select);
    });
  }

  // required marker 「*」 (§6.3): the same markup core renders, for labels core leaves unmarked
  var MARKER = 'span.required';
  function markRequired(label) {
    if (!label || label.querySelector(MARKER)) return;
    var mark = document.createElement('span');
    mark.className = 'required';
    mark.textContent = ' *';
    label.appendChild(mark);
  }
  // a label's text without its required marker (e.g. to match it against an error message)
  function labelText(label) {
    var copy = label.cloneNode(true);
    Array.prototype.forEach.call(copy.querySelectorAll(MARKER), function (m) { m.parentNode.removeChild(m); });
    return copy.textContent;
  }

  GB.form = {
    labelBlank: labelBlank, syncUnset: syncUnset, markRequired: markRequired, labelText: labelText,
    UNSET_LABEL: UNSET_LABEL
  };

  GB.ready(function () {
    document.addEventListener('change', function (e) {
      var t = e.target;
      if (t && t.tagName === 'SELECT' && !t.multiple) syncUnset(t);
    });
  });
  GB.onAjax(decorate);
})();
