// 明朝体で表示される文字を集める。class に下の名前を持つ要素の中身と、時計・手順番号の数字。
const NAMES = ['mincho', 'keep__f', 'desk__s', 'desk__s2', 'kit__h', 'clock'];
exports.minchoChars = pages => {
  const set = new Set('0123456789:');
  for (const html of pages) {
    const body = html.slice(html.indexOf('<body'));
    for (const m of body.matchAll(/<(\w+)[^>]*class="([^"]*)"[^>]*>/g)) {
      if (!m[2].split(/\s+/).some(c => NAMES.includes(c))) continue;
      const tag = new RegExp(`<(/?)${m[1]}\\b[^>]*>`, 'g');
      tag.lastIndex = m.index + m[0].length;
      let depth = 1,
        t;
      while (depth && (t = tag.exec(body))) depth += t[1] ? -1 : 1;
      for (const c of body.slice(m.index + m[0].length, t.index).replace(/<[^>]+>/g, '')) if (c.trim()) set.add(c);
    }
  }
  return set;
};
