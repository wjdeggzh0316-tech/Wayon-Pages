// 课堂反馈 + 生词本 + 单词抽背.
// Owner-only cloud tables: wayon_lessons (feedback text), wayon_vocab (words), wayon_vocab_lists (课前/课后/补充 lists),
// wayon_vocab_reviews (every answer). Words are picked out of the pasted feedback with the same rules as Manager/vocab_import.py.
// Nothing here assigns homework, edits schedules or sends messages.
(() => {
  if (globalThis.wayonVocab || typeof document === 'undefined') return;
  const make = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const btn = (cls, text, onclick, label) => { const b = make('button', cls, text); b.type = 'button'; if (onclick) b.onclick = onclick; if (label) b.setAttribute('aria-label', label); return b; };
  const today = () => new Date().toLocaleDateString('en-CA', {timeZone: 'Asia/Shanghai'});
  const addDays = (d, n) => { const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
  const md = d => d ? Number(d.slice(5, 7)) + '/' + Number(d.slice(8, 10)) : '日期未知';
  const uuid = () => globalThis.crypto?.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  const plainName = v => String(v || '').replace(/[【】「」]/g, '').trim();
  const parts = v => plainName(v).split(/[&＆/／、,，\s]+/).map(x => x.trim()).filter(Boolean);
  const keyOf = v => parts(v).join('/');
  const samePerson = (p, q) => p === q || (p.length >= 2 && q.length >= 2 && (p.includes(q) || q.includes(p)));   // 彦如 = 聂彦如, Amy = Amy徐畅
  const sameGroup = (a, b) => {   // every student on one side matches a different student on the other
    const x = parts(a), y = parts(b);
    if (x.length !== y.length) return false;
    const left = [...y];
    return x.every(p => { const i = left.findIndex(q => samePerson(p, q)); if (i < 0) return false; left.splice(i, 1); return true; });
  };
  const SUBJECTS = [['听力', /听力|listening|听说/i], ['阅读', /阅读|reading/i], ['写作', /写作|writing/i], ['口语', /口语|speaking/i], ['读写', /读写/], ['托福', /托福|toefl/i], ['SAT', /sat/i], ['语法', /语法|grammar/i], ['校内', /校内|高考|中考/]];
  const subjectOf = v => { const s = String(v || ''); const hit = SUBJECTS.find(([, re]) => re.test(s)); return hit ? hit[0] : (s.trim() || '其他'); };
  const INTERVALS = [1, 3, 7, 14, 30];
  // Part-of-speech choices for the word editor; teachers' shorthand (j = adj, ad = adv) is shown as the full form.
  const POS_OPTIONS = ['n', 'v', 'vt', 'vi', 'adj', 'adv', 'prep', 'conj', 'pron', 'num', 'art', 'int', 'aux', 'phr', 'abbr', 'n/v', 'adj/adv', 'v/n'];
  const normPos = p => { const x = String(p || '').trim().replace(/\.$/, '').replace(/\s+/g, '').replace(/\./g, ''); return ({j: 'adj', a: 'adj', ad: 'adv', pp: 'phr'})[x] || x; };

  // ---------- Feedback parser (keep in step with Manager/vocab_import.py) ----------
  const POS = '(?:n|v|vt|vi|adj|adv|j|prep|pp|conj|pron|phr|num|int|aux|art|abbr)(?:\\s*/\\s*(?:n|v|vt|vi|adj|adv|j|prep|pp|conj|pron))*\\.?';
  const WORD_LINE = new RegExp("^\\s*(?:[-–•·*]\\s*|\\d{1,3}[.、)）]\\s*|[‘'’]\\s*)?(?<word>[A-Za-z][A-Za-z'‘’\\-/().=,…&?!\\s]{0,60}?)\\s*(?<pos>\\b" + POS +
    "(?=[\\s\\u4e00-\\u9fff,，;；(（]|$))?\\s*[,，:：]?\\s*(?<meaning>[\\u4e00-\\u9fff（(“\"…].*)$");
  const SUB_LINE = /^\s*[-–•·]\s+/, NUMBERED = /^\s*\d{1,3}[.、)）]\s*/;
  const WRONG = /❌\s*(拼写?|意思|发音|音)?/g;
  const SECTION_END = /^\s*(?:📌|📚|🙋|👨|【用法】|【纠错】|【发音】|【句子|课后作业|\d️⃣|作业[:：]|📝课后)/u;
  const TRAILING_POS = /^(.*?[A-Za-z].*?)\s+(n|v|vt|vi|adj|adv|j|prep|pp|conj|pron|phr|ad)\.?(?:\s+(.*))?$/;
  function splitPos(word, pos, meaning) {   // same rule as split_pos in Manager/vocab_import.py
    const m = TRAILING_POS.exec(word); if (!m) return {word, pos, meaning, extra: ''};
    const rest = (m[3] || '').trim(); pos = pos || m[2];
    if ('/=(（'.includes(rest[0] || 'x')) return {word: m[1].trim(), pos, meaning, extra: rest};
    return {word: m[1].trim(), pos, meaning: (rest ? rest + ' ' : '') + meaning, extra: ''};
  }
  function parseFeedback(body) {
    const words = []; let parent = null, numbered = false, inVocab = false;
    for (const raw of String(body || '').split('\n')) {
      const line = raw.replace(/\s+$/, '');
      if (!line.trim()) continue;
      if (SECTION_END.test(line)) { parent = null; inVocab = false; continue; }
      if (line.includes('http') || line.length > 160) { parent = null; continue; }
      if (/词汇|生词|单词/.test(line) && (line.replace(/[^\w\u4e00-\u9fff]/g, '').length <= 12 || /比如|例如|以下|如下|[:：]\s*$/.test(line)) && !WORD_LINE.test(line)) { inVocab = true; continue; }   // a heading, or a sentence that introduces a list — not one that merely mentions 单词
      const loose = inVocab && /^\s*(?:[-–•·*]\s*|\d{1,3}[.、)）]\s*)?([A-Za-z].*)$/.exec(line);
      if (loose && !(WORD_LINE.test(line) && /[\u4e00-\u9fff]/.test(line))) {
        // Inside a vocabulary section every English line is a word (same rule as vocab_import.py).
        const text = loose[1].replace(/❌\s*(?:拼写?|意思|发音|音)?|✅|✔️|✔|⭕️?|◯|○/g, ' ').trim(), cut = text.search(/[\u4e00-\u9fff]/);
        let word = cut >= 0 ? text.slice(0, cut) : text.split('=')[0], meaning = cut >= 0 ? text.slice(cut) : (text.includes('=') ? '= ' + text.split('=').slice(1).join('=').trim() : '');
        word = word.replace(/\s+/g, ' ').replace(/^[\s\-–,.，:：]+|[\s\-–,.，:：]+$/g, '');
        if (word && word.split(' ').length <= 8 && /[A-Za-z]{2}/.test(word) && !/^(?:[A-Z]\d+|C\d+T\d+)/.test(word)) { const sp = splitPos(word, '', meaning.replace(WRONG, '').replace(/✅|✔️|✔|⭕️?|◯|○/g, '').trim()); const item = {word: sp.word, pos: sp.pos || '', meaning: sp.meaning, extra: sp.extra || '', wrong: /❌/.test(line)}; words.push(item); parent = item; }
        continue;
      }
      const m = WORD_LINE.exec(line);
      if (!m) { if (!SUB_LINE.test(line)) parent = null; continue; }
      const word = m.groups.word.replace(/\s+/g, ' ').replace(/^[\s\-–,.，:：'‘’]+|[\s\-–,.，:：'‘’]+$/g, '');
      if (!word || word.split(' ').length > 7 || !/[A-Za-z]{2}/.test(word) || /^(?:[A-Z]\d+|C\d+T\d+)/.test(word)) continue;
      const meaning = m.groups.meaning.replace(WRONG, '').replace(/✅|✔️|✔|⭕️?|◯|○/g, '').replace(/\s+/g, ' ').replace(/^[\s;；,，]+|[\s;；,，]+$/g, '');
      if (!meaning || !/[\u4e00-\u9fff]/.test(meaning)) continue;
      const wrong = [...line.matchAll(WRONG)].length > 0;
      if (NUMBERED.test(line)) numbered = true;
      if (SUB_LINE.test(line) && numbered && parent) { parent.extra = (parent.extra ? parent.extra + '\n' : '') + word + ' ' + meaning; continue; }
      const split = splitPos(word, (m.groups.pos || '').replace(/[\s.]+$/, ''), meaning);
      const item = {...split, wrong};
      words.push(item); parent = item;
    }
    const seen = new Set();
    return words.filter(w => { const k = w.word.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  }
  const LESSON_NO = /(?:L|Lesson|反馈|第)\s*(\d{1,3})(?!\d)|(?:听说|听力|阅读|写作|口语|读写|托福阅读|能力提升)[^\d]{0,6}?(\d{1,3})\s*$/gi;
  // Titles: 学生名_课程_日期 on the feedback page; quiz titles add the teacher's lesson number, e.g. "陈书进_阅读L3_11/7".
  const lessonLabel = (learner, course, no, day) => String(learner || '').replace(/\//g, '、') + '_' + (course || '课程') + (no ? 'L' + no : '') + '_' + md(day);
  const lessonNo = title => { let n = null; for (const m of String(title || '').matchAll(LESSON_NO)) n = Number(m[1] || m[2]); return n && n <= 150 ? n : null; };

  // ---------- Store: owner cloud tables, or local preview data on this computer only ----------
  const client = () => globalThis.wayonSupabaseClient?.client || null;
  const isLocal = /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
  let mode = 'pending', preview = null, index = null;
  const bodies = new Map(), vocabCache = new Map(), listCache = new Map();
  async function ready() {
    if (mode === 'cloud' || mode === 'preview') return mode;
    const c = client();
    if (c) { try { const {data} = await c.auth.getSession(); if (data?.session) return (mode = 'cloud'); } catch {} }
    if (isLocal) {
      try { const r = await fetch('./vocab-preview-local.json', {cache: 'no-store'}); if (r.ok) { preview = await r.json(); preview.lists = {}; preview.reviews = []; return (mode = 'preview'); } } catch {}
    }
    return (mode = c ? 'signedout' : 'none');
  }
  async function pageAll(build) {
    const out = [];
    for (let from = 0; ; from += 1000) {
      const {data, error} = await build().range(from, from + 999);
      if (error) throw error;
      out.push(...data); if (data.length < 1000) return out;
    }
  }
  async function lessonIndex(force) {
    if (index && !force) { await loadIgnored(); return index; }
    await loadIgnored();
    if (mode === 'preview') index = preview.lessons.filter(l => !l.archived_at).map(({body, ...rest}) => rest);
    else index = await pageAll(() => client().from('wayon_lessons').select('id,learner,subject,lesson_date,title,origin,created_at').is('archived_at', null).order('lesson_date', {ascending: false, nullsFirst: false}));
    return index;
  }
  async function lessonBody(id) {
    if (bodies.has(id)) return bodies.get(id);
    let body = '';
    let custom = null;
    if (mode === 'preview') { const l = preview.lessons.find(x => x.id === id); body = l?.body || ''; custom = l?.words || null; }
    else { const {data, error} = await client().from('wayon_lessons').select('body,words').eq('id', id).single(); if (error) throw error; body = data.body; custom = data.words; }
    bodies.set(id, body); customWords.set(id, Array.isArray(custom) ? custom : null); return body;
  }
  // A lesson's words: the list you edited by hand if there is one, otherwise what the parser finds in its text.
  const customWords = new Map();
  async function lessonWords(id) { const body = await lessonBody(id); return customWords.get(id) || parseFeedback(body); }
  const wordKey = word => String(word || '').trim().toLowerCase();
  // Database rows have no word-position field. Recover each lesson's order from
  // its feedback (or edited word list), keeping other lessons and free words in place.
  async function feedbackOrder(items) {
    const groups = new Map();
    for (const item of items) {
      if (!item.lesson_id || !(index || []).some(l => l.id === item.lesson_id)) continue;
      if (!groups.has(item.lesson_id)) groups.set(item.lesson_id, []);
      groups.get(item.lesson_id).push(item);
    }
    const ordered = new Map(await Promise.all([...groups].map(async ([id, rows]) => {
      const ranks = new Map();
      (await lessonWords(id)).forEach((w, i) => { if (!ranks.has(wordKey(w.word))) ranks.set(wordKey(w.word), i); });
      return [id, rows.slice().sort((a, b) => (ranks.get(wordKey(a.word)) ?? Infinity) - (ranks.get(wordKey(b.word)) ?? Infinity))];
    })));
    const offsets = new Map();
    return items.map(item => {
      if (!ordered.has(item.lesson_id)) return item;
      const offset = offsets.get(item.lesson_id) || 0;
      offsets.set(item.lesson_id, offset + 1);
      return ordered.get(item.lesson_id)[offset];
    });
  }
  async function rowsForLesson(lesson, lib) {
    const ownWords = new Map(lib.filter(r => r.learner === lesson.learner).map(r => [wordKey(r.word), r]));
    return (await lessonWords(lesson.id)).map(w => ownWords.get(wordKey(w.word))).filter(Boolean);
  }
  const slimWords = ws => ws.map(w => ({word: w.word, pos: w.pos || '', meaning: w.meaning || ''}));
  async function vocabFor(learners) {
    const key = [...learners].sort().join('|');
    if (vocabCache.has(key)) return vocabCache.get(key);
    let rows;
    if (mode === 'preview') rows = preview.words.filter(w => learners.includes(w.learner));
    else rows = learners.length ? await pageAll(() => client().from('wayon_vocab').select('*').in('learner', learners).eq('archived', false).order('lesson_date', {ascending: false, nullsFirst: false})) : [];
    vocabCache.set(key, rows); return rows;
  }
  const dropVocabCache = learner => { for (const k of [...vocabCache.keys()]) if (k.split('|').includes(learner)) vocabCache.delete(k); };
  async function saveLesson(lesson, words, custom) {
    const body = lesson.body, sha = await sha256(body);
    const row = {id: uuid(), learner: lesson.learner, subject: lesson.subject, lesson_date: lesson.lesson_date, title: lesson.title, body, body_sha256: sha, origin: 'paste', words: custom ? slimWords(words) : null};
    const existing = await vocabFor([lesson.learner]);
    const have = new Set(existing.map(w => w.word.trim().toLowerCase()));
    const fresh = words.filter(w => !have.has(w.word.toLowerCase())).map(w => ({id: uuid(), learner: lesson.learner, word: w.word, pos: w.pos || null, meaning: w.meaning, extra: w.extra || null,
      subject: lesson.subject, lesson_date: lesson.lesson_date, lesson_id: row.id, wrong_count: w.wrong ? 1 : 0, last_result: w.wrong ? 'wrong' : null, box: 0, due_date: null, right_count: 0, archived: false}));
    if (mode === 'preview') {
      if (preview.lessons.some(l => l.learner === row.learner && l.body_sha256 === sha)) return {duplicate: true, added: 0};
      preview.lessons.push(row); preview.words.push(...fresh);
    } else {
      const {error} = await client().from('wayon_lessons').insert(row);
      if (error) { if (/duplicate|unique/i.test(error.message)) return {duplicate: true, added: 0}; throw error; }
      for (let i = 0; i < fresh.length; i += 500) { const {error: e} = await client().from('wayon_vocab').insert(fresh.slice(i, i + 500)); if (e) throw e; }
    }
    index = null; dropVocabCache(lesson.learner);
    return {added: fresh.length, total: words.length};
  }
  // Edit a saved lesson: new text (and date/subject); words new to this student's library are added, nothing is removed.
  // notion_synced_at is cleared so the evening backup replaces the Notion copy.
  async function editLesson(id, patch) {
    const body = patch.body, sha = await sha256(body), words = patch.words || parseFeedback(body);
    const old = index.find(l => l.id === id) || {};
    const learner = old.learner, subject = patch.subject || old.subject, lesson_date = patch.lesson_date === undefined ? old.lesson_date : patch.lesson_date;
    let title = (body.split('\n').find(x => x.trim()) || '').trim().slice(0, 120) || old.title;
    const oldNo = lessonNo(old.title); if (oldNo && !lessonNo(title)) title += ' L' + oldNo;   // the first line may not carry the lesson number; keep it
    const row = {body, body_sha256: sha, title, subject, lesson_date, notion_synced_at: null, words: patch.custom ? slimWords(words) : null};
    const existing = await vocabFor([learner]), have = new Set(existing.map(w => w.word.trim().toLowerCase()));
    const fresh = words.filter(w => !have.has(w.word.toLowerCase())).map(w => ({id: uuid(), learner, word: w.word, pos: w.pos || null, meaning: w.meaning, extra: w.extra || null,
      subject, lesson_date, lesson_id: id, wrong_count: w.wrong ? 1 : 0, last_result: w.wrong ? 'wrong' : null, box: 0, due_date: null, right_count: 0, archived: false}));
    if (mode === 'preview') {
      if (preview.lessons.some(l => l.id !== id && l.learner === learner && l.body_sha256 === sha)) throw new Error('这段内容和另一节完全相同');
      Object.assign(preview.lessons.find(l => l.id === id), row); preview.words.push(...fresh);
    } else {
      const {error} = await client().from('wayon_lessons').update(row).eq('id', id);
      if (error) throw /duplicate|unique/i.test(error.message) ? new Error('这段内容和另一节完全相同') : error;
      for (let i = 0; i < fresh.length; i += 500) { const {error: e} = await client().from('wayon_vocab').insert(fresh.slice(i, i + 500)); if (e) throw e; }
    }
    bodies.set(id, body); customWords.set(id, row.words); Object.assign(old, {title, subject, lesson_date}); dropVocabCache(learner);
    return {total: words.length, added: fresh.length};
  }
  // 「不算缺课」：老师可能本来就跳过了某些课次编号；用户确认后记下，不再显示虚线缺课行。
  let ignored = null;
  const gapKey = (learner, subject, no) => learner + '|' + subject + '|' + no;
  async function loadIgnored() {
    if (ignored) return ignored;
    ignored = new Set();
    if (mode === 'preview') { try { JSON.parse(localStorage.getItem('wayon-feedback-gaps') || '[]').forEach(k => ignored.add(k)); } catch {} }
    else { const {data, error} = await client().from('wayon_feedback_gaps').select('learner,subject,lesson_no'); if (!error) data.forEach(r => ignored.add(gapKey(r.learner, r.subject, r.lesson_no))); }
    return ignored;
  }
  async function setIgnored(learner, subject, nos, on) {
    if (mode === 'preview') {
      nos.forEach(n => on ? ignored.add(gapKey(learner, subject, n)) : ignored.delete(gapKey(learner, subject, n)));
      try { localStorage.setItem('wayon-feedback-gaps', JSON.stringify([...ignored])); } catch {}
      return;
    }
    if (on) { const {error} = await client().from('wayon_feedback_gaps').upsert(nos.map(n => ({learner, subject, lesson_no: n})), {onConflict: 'owner_id,learner,subject,lesson_no', ignoreDuplicates: true}); if (error) throw error; }
    else { const {error} = await client().from('wayon_feedback_gaps').delete().eq('learner', learner).eq('subject', subject).in('lesson_no', nos); if (error) throw error; }
    nos.forEach(n => on ? ignored.add(gapKey(learner, subject, n)) : ignored.delete(gapKey(learner, subject, n)));
  }
  // Every change on the feedback pages asks first (what will happen, to whom), then shows a busy bar while it runs.
  function askConfirm(title, detail, okText, danger) {
    return new Promise(resolve => {
      const ov = make('div', 'vx-overlay fb-confirm'), box = make('div', 'vx-box fb-confirm-box');
      const done = v => { ov.remove(); document.removeEventListener('keydown', key); resolve(v); };
      const key = e => { if (e.key === 'Escape') done(false); if (e.key === 'Enter') done(true); };
      box.append(make('h3', '', title)); if (detail) box.append(make('p', 'fb-meta', detail));
      const row = make('div', 'fb-row'); row.style.justifyContent = 'flex-end';
      const ok = btn('fb-btn ' + (danger ? 'danger' : 'pri'), okText || '确认', () => done(true));
      row.append(btn('fb-btn', '取消', () => done(false)), ok); box.append(row); ov.append(box); document.body.append(ov);
      ov.addEventListener('click', e => { if (e.target === ov) done(false); }); document.addEventListener('keydown', key); ok.focus();
    });
  }
  let busyBar = null;
  async function busy(text, work) {
    busyBar = busyBar || make('div', 'fb-busy'); busyBar.textContent = text; document.body.append(busyBar);
    try { return await work(); } finally { busyBar.remove(); }
  }
  // 左滑删除：只标记 archived_at，页面不再显示；原文、生词和 Notion 备份都保留。
  async function archiveLesson(id) {
    const at = new Date().toISOString();
    if (mode === 'preview') { const l = preview.lessons.find(x => x.id === id); if (l) l.archived_at = at; }
    else { const {error} = await client().from('wayon_lessons').update({archived_at: at}).eq('id', id); if (error) throw error; }
    index = null; bodies.delete(id);
  }
  async function updateVocab(id, patch) {
    if (mode === 'preview') { const w = preview.words.find(x => x.id === id); if (w) Object.assign(w, patch); return; }
    const {error} = await client().from('wayon_vocab').update(patch).eq('id', id); if (error) throw error;
  }
  async function addVocab(learner, items) {
    const rows = items.map(w => ({id: uuid(), learner, word: w.word, pos: w.pos || null, meaning: w.meaning || '', subject: w.subject || null, lesson_date: today(), box: 0, wrong_count: 0, right_count: 0, archived: false}));
    if (!rows.length) return rows;
    if (mode === 'preview') preview.words.push(...rows);
    else { const {error} = await client().from('wayon_vocab').insert(rows); if (error) throw error; }
    dropVocabCache(learner); return rows;
  }
  async function addReview(row) {
    if (mode === 'preview') { preview.reviews.push(row); return; }
    const {error} = await client().from('wayon_vocab_reviews').insert(row); if (error) throw error;
  }
  async function getLists(day, student) {
    const k = day + '|' + student;
    if (listCache.has(k)) return listCache.get(k);
    const lists = {课前: [], 课后: [], 补充: []};
    if (mode === 'preview') Object.assign(lists, JSON.parse(localStorage.getItem('wayon-vocab-lists-' + k) || '{}'));
    else if (mode === 'cloud') {
      const {data, error} = await client().from('wayon_vocab_lists').select('phase,items').eq('day', day).eq('student', student);
      if (error) throw error; for (const r of data) lists[r.phase] = r.items || [];
    }
    listCache.set(k, lists); return lists;
  }
  const saveTimers = new Map();
  function saveList(day, student, phase) {
    const k = day + '|' + student + '|' + phase;
    clearTimeout(saveTimers.get(k));
    saveTimers.set(k, setTimeout(async () => {
      const items = listCache.get(day + '|' + student)[phase];
      try {
        if (mode === 'preview') localStorage.setItem('wayon-vocab-lists-' + day + '|' + student, JSON.stringify(listCache.get(day + '|' + student)));
        else if (mode === 'cloud') { const {error} = await client().from('wayon_vocab_lists').upsert({day, student, phase, items}, {onConflict: 'owner_id,day,student,phase'}); if (error) throw error; }
        flash('已保存');
      } catch (e) { flash('保存失败：' + (e.message || e), true); }
    }, 500));
  }
  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ---------- Learner mapping: a student's words live in their own folder and in their class folders ----------
  function learnersFor(student, all) {
    const name = plainName(student);
    return all.filter(l => parts(l).some(p => samePerson(p, name)));
  }
  const allLearners = () => [...new Set((index || []).map(l => l.learner))].sort((a, b) => a.localeCompare(b, 'zh'));

  // ---------- Styles ----------
  const style = make('style'); style.id = 'wayon-vocab-style'; style.textContent = `
    #nav-feedback:before{display:none!important}#nav-feedback svg{width:19px;height:19px;flex:none}
    body[data-feedback-open] #tabs button:not(#nav-feedback){background:transparent!important;color:var(--fg-secondary)!important}
    body[data-feedback-open] #list,body[data-feedback-open] .workspace-top-bar,body[data-feedback-open] .workspace-sub-bar,body[data-feedback-open] #aircon-panel,body[data-feedback-open] #memo-panel,body[data-feedback-open] .sidebar-footer .bar{display:none!important}
    #feedback-panel{width:100%}#feedback-panel[hidden]{display:none!important}
    .fb-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px}.fb-head h2{font-size:24px;letter-spacing:-.025em;margin:0}
    .fb-tabs{display:inline-flex;gap:2px;padding:3px;border-radius:10px;background:var(--code-bg);border:1px solid var(--line)}
    .fb-tabs button{min-height:34px;padding:0 14px;border:0;border-radius:7px;background:transparent;color:var(--muted);font:inherit;font-size:13px;font-weight:550;cursor:pointer}
    .fb-tabs button.on{background:var(--card);color:var(--fg);box-shadow:0 1px 3px rgba(0,0,0,.12)}
    .fb-note{font-size:12px;color:var(--muted);margin-left:auto}.fb-note.warn{color:var(--warning-fg,#9a6700)}
    .fb-card{border:1px solid var(--line);border-radius:14px;background:var(--card);box-shadow:var(--shadow-card);padding:14px 16px;margin-bottom:12px}
    .fb-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.fb-title{font-weight:600;font-size:15px}.fb-meta{font-size:12px;color:var(--muted)}
    .fb-pill{font-size:12px;font-weight:600;padding:3px 9px;border-radius:999px;background:var(--code-bg);color:var(--muted)}
    .fb-pill.ok{background:var(--done-bg);color:var(--done-dark)}.fb-pill.todo{background:var(--warning-bg,#fff8e8);color:var(--warning-fg,#805300)}.fb-pill.bad{background:var(--bad-bg);color:var(--bad-dark)}
    .fb-card textarea{width:100%;min-height:150px;margin-top:10px;padding:10px 12px;border:1px solid var(--line-strong);border-radius:10px;background:var(--code-bg);color:var(--fg);font:inherit;font-size:14px;line-height:1.6;resize:vertical;box-sizing:border-box}
    .fb-card select,.fb-card input[type=search],.fb-card input[type=text],.fb-search{min-height:38px;padding:6px 10px;border:1px solid var(--line-strong);border-radius:9px;background:var(--card);color:var(--fg);font:inherit;font-size:14px}
    .fb-btn{min-height:38px;padding:0 14px;border:1px solid var(--line);border-radius:9px;background:var(--code-bg);color:var(--fg-secondary);font:inherit;font-size:13px;font-weight:550;cursor:pointer}
    .fb-btn.pri{background:var(--accent);border-color:var(--accent);color:#fff}.fb-btn:disabled{opacity:.5;cursor:default}
    .fb-learners{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px}
    .fb-learner{text-align:left;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--card);color:var(--fg);font:inherit;cursor:pointer;min-height:56px}
    .fb-learner:hover{border-color:var(--accent)}.fb-learner b{display:block;font-size:14px}.fb-learner span{font-size:12px;color:var(--muted)}
    .fb-learner .gap{color:var(--warning-fg,#9a6700)}
    .fb-subject{margin-bottom:14px}.fb-subject>summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;padding:10px 4px;font-weight:650;font-size:16px}
    .fb-subject>summary::-webkit-details-marker{display:none}.fb-subject>summary:before{content:"▸";color:var(--muted);font-size:12px}.fb-subject[open]>summary:before{content:"▾"}
    .fb-gap{font-size:12px;color:var(--warning-fg,#805300);background:var(--warning-bg,#fff8e8);border-radius:8px;padding:6px 10px;margin:0 0 8px}
    .fb-lesson{border:1px solid var(--line);border-radius:12px;background:var(--card);margin-bottom:8px}
    .fb-lesson>summary{cursor:pointer;list-style:none;padding:11px 14px;display:flex;gap:10px;align-items:center;font-size:14px;font-weight:550}
    .fb-lesson>summary::-webkit-details-marker{display:none}.fb-lesson>summary small{color:var(--muted);font-weight:400}
    .fb-body{margin:0;padding:0 16px 14px;white-space:pre-wrap;font:14px/1.75 var(--sans);color:var(--fg-secondary);overflow-wrap:anywhere;max-height:60vh;overflow:auto}
    .fb-folded{padding:10px 16px}.fb-folded>summary{list-style:none;cursor:pointer}.fb-folded>summary::-webkit-details-marker{display:none}
    .fb-folded[open]>summary .fb-open{display:none}.fb-folded .fb-open{margin-left:auto;color:var(--accent)}
    .fb-folded[open]>summary{margin-bottom:8px}
    .vq-ready{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px;padding:8px 10px 8px 12px;border-radius:10px;background:var(--code-bg)}
    .vq-label{font-weight:650;font-size:14px;font-variant-numeric:tabular-nums}.vq-n{font-size:13px;color:var(--muted)}
    .vq-ready .vq-start{margin-left:auto;min-height:34px}
    .fb-back{margin-bottom:12px}
    .fb-orphan{border-style:dashed}
    .fb-learner-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap}.fb-learner-head h3{font-size:26px;letter-spacing:-.02em;margin:4px 0 4px}
    .fb-learner-head .fb-meta{display:flex;gap:8px;align-items:center}
    .fb-link{border:0;background:none;padding:0;font:inherit;font-size:13px;color:var(--accent,#0a63d8);cursor:pointer}
    .fb-subject-tabs{margin:2px 0 12px}
    .fb-wedit .fb-words-head{position:sticky;top:0;background:var(--card);z-index:1;padding-bottom:4px}.fb-wedit .fb-link{font-size:12.5px}
    .fb-wrow{border-top:1px solid var(--line);padding:8px 0 7px}.fb-wtop{display:flex;align-items:center;gap:8px;min-width:0}
    .fb-wrow input{border:0;border-bottom:1px solid transparent;border-radius:0;background:transparent;font:inherit;color:var(--fg);padding:1px 0;min-width:0;transition:border-color .15s}
    .fb-wrow input:focus{outline:none;border-bottom-color:var(--accent,#0a63d8)}.fb-wrow input::placeholder{color:var(--muted);opacity:.6}
    .fb-wrow input.w{flex:none;max-width:calc(100% - 150px);font-size:16px;font-weight:600;letter-spacing:-.01em}
    .fb-wrow input.m{display:block;width:100%;margin-top:2px;font-size:13px;color:var(--fg-secondary,var(--muted))}
    .fb-wrow select.p{flex:none;margin-left:auto;appearance:none;-webkit-appearance:none;border:0;border-radius:999px;background:var(--code-bg) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%238e8e93'/%3E%3C/svg%3E") no-repeat right 7px center;padding:2px 18px 2px 9px;font:inherit;font-size:12px;font-weight:550;color:var(--fg-secondary,var(--muted));cursor:pointer;line-height:18px}
    .fb-wrow select.p.empty{color:var(--muted);font-weight:400;background-color:transparent;box-shadow:inset 0 0 0 1px var(--line)}
    .fb-wrow select.p:focus-visible{outline:2px solid var(--accent,#0a63d8);outline-offset:1px}
    .fb-wdel{flex:none;width:26px;height:26px;border:0;border-radius:6px;background:transparent;color:var(--muted);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;opacity:0;transition:opacity .15s}
    .fb-wdel svg{width:15px;height:15px}.fb-wrow:hover .fb-wdel,.fb-wrow:focus-within .fb-wdel{opacity:1}.fb-wdel:hover{background:#fdecec;color:#d93036}
    @media not ((hover:hover) and (pointer:fine)){.fb-wdel{opacity:1}}
    .fb-wedit{position:relative;user-select:none;-webkit-user-select:none}.fb-wedit:focus{outline:none}.fb-wedit input{user-select:text;-webkit-user-select:text}
    .fb-wrow{transition:background .12s}.fb-wrow.picked{background:color-mix(in srgb,var(--accent,#0a63d8) 12%,transparent);border-radius:8px;box-shadow:0 0 0 4px color-mix(in srgb,var(--accent,#0a63d8) 12%,transparent)}
    .fb-marquee{position:absolute;z-index:3;border:1px solid var(--accent,#0a63d8);background:color-mix(in srgb,var(--accent,#0a63d8) 10%,transparent);border-radius:3px;pointer-events:none}
    .fb-link.danger{color:#d93036}
    .fb-wadd{margin-top:6px}.fb-wedit-batch{width:100%;box-sizing:border-box;font:13px/1.8 var(--mono,ui-monospace,monospace);padding:8px 10px;border:1px solid var(--accent,#0a63d8);border-radius:8px;background:var(--card);color:var(--fg);resize:vertical}
    .fb-collect{border:0.5px solid var(--line);border-radius:14px;background:var(--card);margin-bottom:10px;overflow:hidden;transition:border-color .2s}
    .fb-collect.editing{border-color:var(--accent,#0a63d8)}
    .fb-collect-top,.fb-collect>summary{display:flex;align-items:stretch;list-style:none;cursor:default}.fb-collect>summary{cursor:pointer}.fb-collect>summary::-webkit-details-marker{display:none}
    .fb-time{width:68px;flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px 0;border-right:0.5px solid var(--line)}
    .fb-time b{font-size:15px;font-weight:600;font-variant-numeric:tabular-nums}.fb-time small{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}
    .fb-collect-head{flex:1;min-width:0;display:flex;align-items:center;gap:10px;padding:10px 16px}.fb-collect-head>*{flex:none}.fb-collect-head .fb-who{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fb-collect-head .fb-teacher{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .fb-who{font-size:16px;font-weight:600}.fb-teacher{font-size:13px;color:var(--muted)}
    .fb-wait{margin-left:auto;font-size:12.5px;color:var(--warning-fg,#9a6700)}.fb-done-note{margin-left:auto;font-size:12.5px;color:var(--done-dark,#1f7a3a);font-weight:550}
    .fb-collect-head .fb-btn{min-height:32px;padding:0 12px;font-size:13px}
    .fb-collect.done .fb-who,.fb-collect.done .fb-time b{color:var(--fg-secondary,var(--muted))}
    .fb-chev{width:8px;height:8px;border-right:1.5px solid var(--muted);border-bottom:1.5px solid var(--muted);transform:rotate(45deg);margin:0 2px 3px 4px;transition:transform .2s}.fb-collect[open] .fb-chev{transform:rotate(-135deg);margin-bottom:-3px}
    .fb-collect-body{padding:0 16px 12px 84px}.fb-collect-body:empty{display:none}.fb-collect-body>.fb-lesson{margin-top:4px}.fb-collect-body>.fb-btn{margin-top:8px}
    .fb-paste .fb-entry-body{padding:0}.fb-paste .fb-edit-bar{padding:10px 0 0}.fb-grow{flex:1}
    .fb-collect.manual .fb-time b{font-size:20px;color:var(--muted)}
    @media (max-width:640px){.fb-collect-body{padding-left:16px}.fb-time{width:56px}.fb-collect-head{gap:8px;padding:10px 12px}.fb-collect-head .fb-teacher,.fb-collect.editing .fb-wait:empty,.fb-wait{display:none}.fb-collect-head .fb-btn{margin-left:auto}.fb-collect.editing .fb-wait{display:inline;margin-left:auto}}
    .fb-chip{font-size:12px;font-weight:550;padding:3px 8px;border-radius:6px;line-height:1.3}
    .tone-blue{background:#e6f1fb;color:#0c447c}.tone-green{background:#eaf3de;color:#27500a}.tone-amber{background:#faeeda;color:#633806}.tone-purple{background:#eeedfe;color:#3c3489}
    .tone-teal{background:#e1f5ee;color:#085041}.tone-pink{background:#fbeaf0;color:#72243e}.tone-coral{background:#faece7;color:#712b13}.tone-gray{background:#f1efe8;color:#444441}
    @media (prefers-color-scheme:dark){.tone-blue{background:#0c447c;color:#e6f1fb}.tone-green{background:#27500a;color:#eaf3de}.tone-amber{background:#633806;color:#faeeda}.tone-purple{background:#3c3489;color:#eeedfe}.tone-teal{background:#085041;color:#e1f5ee}.tone-pink{background:#72243e;color:#fbeaf0}.tone-coral{background:#712b13;color:#faece7}.tone-gray{background:#444441;color:#f1efe8}}
    .vx-overlay.fb-confirm{z-index:2147483600;padding:16px!important;align-items:center!important}.vx-box.fb-confirm-box{width:min(420px,100%);height:auto;max-height:none;border-radius:16px!important;padding:20px 22px}
    .fb-btn.danger{background:#e5484d;border-color:#e5484d;color:#fff}.fb-confirm-box h3{margin:0 0 8px;font-size:18px}.fb-confirm-box p{white-space:pre-line;margin:0 0 16px;line-height:1.6}
    .fb-busy{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483601;padding:10px 18px 10px 38px;border-radius:999px;background:#1d1d1f;color:#fff;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,.25)}
    .fb-busy:before{content:'';position:absolute;left:14px;top:50%;width:14px;height:14px;margin-top:-7px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:fbspin .8s linear infinite}
    @keyframes fbspin{to{transform:rotate(360deg)}}
    .fb-swipe{position:relative;border-radius:12px;margin-bottom:8px;--p:0}
    .fb-swipe-inner{position:relative;transition:transform .3s cubic-bezier(.32,.72,0,1)}.fb-swipe.dragging .fb-swipe-inner{transition:none}
    .fb-swipe-inner>.fb-lesson{margin-bottom:0}
    .fb-swipe-act{width:36px;height:36px;border:0;border-radius:10px;color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:filter .15s,transform .15s}
    .fb-swipe-act svg{width:18px;height:18px}.fb-swipe-act:hover{filter:brightness(1.1)}.fb-swipe-act:active{transform:scale(.94)}
    .fb-swipe-act.red{background:#e5484d}.fb-swipe-act.blue{background:#0a84ff}.fb-swipe-act:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
    /* mouse / trackpad: icons fade in at the right of the hovered row (rows without its own right-side tag) */
    @media (hover:hover) and (pointer:fine){
      .fb-swipe-tray{position:absolute;right:12px;top:var(--tray-top,13px);display:flex;gap:2px;opacity:0;transition:opacity .18s ease;pointer-events:none;z-index:2}
      .fb-swipe-tray .fb-swipe-act{background:transparent;color:var(--muted);width:34px;height:34px}.fb-swipe-tray .fb-swipe-act.blue:hover{background:var(--code-bg);color:var(--accent,#0a63d8);filter:none}.fb-swipe-tray .fb-swipe-act.red:hover{background:#fdecec;color:#d93036;filter:none}
      .fb-swipe:hover .fb-swipe-tray,.fb-swipe:focus-within .fb-swipe-tray{opacity:1;pointer-events:auto}
      .fb-swipe:hover .vx-tags{visibility:hidden}
      .fb-swipe.slim .fb-swipe-tray{top:50%;transform:translateY(-50%)}.fb-swipe.slim .fb-swipe-act{width:30px;height:30px}.fb-swipe.slim .fb-swipe-act svg{width:16px;height:16px}
    }
    /* touch: the row slides left over full-height buttons */
    @media not ((hover:hover) and (pointer:fine)){
      .fb-swipe{overflow:hidden}.fb-swipe-inner{z-index:1;background:var(--bg,#f5f5f7)}
      .fb-swipe-tray{position:absolute;right:0;top:0;bottom:0;display:flex;gap:6px;padding-left:6px;opacity:var(--p)}
      .fb-swipe-act{width:58px;height:auto;border-radius:12px}.fb-swipe-act svg{width:20px;height:20px}
    }
    @keyframes fbFade{from{opacity:0}to{opacity:1}}@keyframes fbPop{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}
    @keyframes fbRise{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}
    .vx-overlay.fb-confirm{animation:fbFade .18s ease}.vx-box.fb-confirm-box{animation:fbPop .28s cubic-bezier(.32,.72,0,1)}
    .fb-busy{animation:fbRise .28s cubic-bezier(.32,.72,0,1)}
    @media (prefers-reduced-motion: reduce){.fb-swipe-inner,.fb-swipe-act{transition:none}.vx-overlay.fb-confirm,.vx-box.fb-confirm-box,.fb-busy{animation:none}}
    .fb-no-input{width:72px}.fb-add-bottom{width:100%;margin:6px 0;border-style:dashed}
    .fb-adding:empty{display:none}.fb-adding{padding:12px 0 0;border-style:dashed}
    .fb-edit-text{width:100%;box-sizing:border-box;min-height:220px;font:14px/1.75 var(--sans);padding:12px 14px;border:1px solid var(--accent,#0a63d8);border-radius:10px;background:var(--card);color:var(--fg);resize:vertical}
    .fb-edit-bar{padding:0 14px 14px;gap:8px}.fb-edit-bar:empty{display:none}.fb-missing .fb-btn{margin-left:auto;min-height:30px;padding:0 12px;font-size:12.5px}
    .fb-missing{border-style:dashed;background:transparent;display:flex;gap:10px;align-items:center;padding:6px 14px}.fb-missing .fb-btn{margin-left:auto;min-height:30px;padding:0 12px;font-size:12.5px}.fb-missing .vx-no{flex:none;min-width:52px;height:30px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;border:1px dashed var(--line);color:var(--muted)}
    .fb-entry>summary .vx-sub{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60vw}
    .fb-entry-body{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(220px,1fr);gap:14px;padding:0 14px 14px}
    @media (max-width:760px){.fb-entry-body{grid-template-columns:1fr}}
    .fb-entry-body .fb-body{margin:0;padding:12px 14px;border-radius:10px;background:var(--code-bg);max-height:520px;overflow:auto}
    .fb-words{border:1px solid var(--line);border-radius:10px;padding:10px 12px;max-height:520px;overflow:auto;background:var(--card)}
    .fb-words-head{display:flex;gap:8px;align-items:center;margin-bottom:6px}
    .fb-word{display:flex;flex-direction:column;padding:5px 0;border-top:1px solid var(--line)}.fb-word b{font-size:15px}.fb-word b small{font-weight:400;color:var(--muted)}.fb-word span{font-size:12.5px;color:var(--muted)}
    .fb-bulk-text{width:100%;min-height:180px;margin:10px 0 6px;box-sizing:border-box;font:inherit;font-size:13px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--code-bg);color:var(--fg)}
    .fb-bulk-sum{display:flex;gap:10px;align-items:center;padding:10px 14px}.fb-bulk-sum .fb-pill{white-space:nowrap}.fb-bulk-row{display:block;cursor:pointer}
    .fb-bulk-date{font:inherit;font-size:14px;font-weight:600;border:0;background:transparent;color:var(--fg);padding:0}
    :is(.fb-lesson>summary,.fb-bulk-sum) .vx-no{flex:none;min-width:52px;height:38px;padding:0 8px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;letter-spacing:-.01em;background:var(--code-bg);color:var(--fg)}
    :is(.fb-lesson>summary,.fb-bulk-sum) .vx-no.vx-quiz{font-size:13px;background:var(--warning-bg,#fff8e8);color:var(--warning-fg,#805300)}:is(.fb-lesson>summary,.fb-bulk-sum) .vx-no.none{color:var(--muted)}
    .vx-info{display:flex;flex-direction:column;gap:1px;min-width:0}:is(.fb-lesson>summary,.fb-bulk-sum) .vx-when{font-size:15px;font-weight:600;color:var(--fg)}:is(.fb-lesson>summary,.fb-bulk-sum) .vx-when small{font-weight:400;color:var(--muted);font-size:12px}
    :is(.fb-lesson>summary,.fb-bulk-sum) .vx-sub{font-size:12px}.vx-tags{margin-left:auto;display:flex;gap:6px}
    .vq{margin:6px 0 10px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--code-bg)}
    .vq-tabs{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px}
    .vq-tabs button{min-height:32px;padding:0 12px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--fg-secondary);font:inherit;font-size:13px;cursor:pointer}
    .vq-tabs button.on{border-color:var(--accent);color:var(--accent);background:var(--accent-subtle);font-weight:600}
    .vq-learners{font-size:11px;color:var(--muted);margin-left:auto}
    .vq-items{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
    .vq-item{display:inline-flex;align-items:center;gap:6px;max-width:100%;padding:4px 4px 4px 10px;border-radius:8px;background:var(--card);border:1px solid var(--line);font-size:13px}
    .vq-item b{font-weight:600}.vq-item span{color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:14em}
    .vq-item.wrong{border-color:var(--bad-border)}.vq-item.wrong b{color:var(--bad-dark)}
    .vq-item button{border:0;background:transparent;color:var(--muted);cursor:pointer;font-size:15px;min-width:24px;min-height:24px;border-radius:6px}
    .vq-item button:hover{background:var(--bad-bg);color:var(--bad)}
    .vq-empty{font-size:13px;color:var(--muted);margin-bottom:8px}
    .vq-actions{display:flex;gap:6px;flex-wrap:wrap}
    .vq-actions button{min-height:34px;padding:0 12px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--fg-secondary);font:inherit;font-size:13px;cursor:pointer}
    .vq-actions button.pri{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:600}
    .vq textarea{width:100%;min-height:90px;margin-bottom:8px;padding:8px 10px;border:1px solid var(--line-strong);border-radius:9px;background:var(--card);color:var(--fg);font:inherit;font-size:14px;box-sizing:border-box}
    .vx-overlay{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px}
    .vx-box{width:min(760px,100%);max-height:92dvh;display:flex;flex-direction:column;background:var(--card);color:var(--fg);border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.35);overflow:hidden}
    .vx-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:14px 18px;border-bottom:1px solid var(--line)}.vx-head h3{margin:0;font-size:17px}
    .vx-head .vx-close{margin-left:auto}
    .vx-body{padding:14px 18px;overflow:auto;flex:1}
    .vx-foot{display:flex;gap:8px;flex-wrap:wrap;padding:12px 18px;border-top:1px solid var(--line)}
    .vx-filters{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
    .vx-filters button.on{border-color:var(--accent);color:var(--accent);background:var(--accent-subtle)}
    .vx-row{display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:4px 10px;align-items:center;padding:8px 4px;border-bottom:1px solid var(--line);cursor:pointer}
    .vx-row input{width:18px;height:18px;margin:0}.vx-row b{font-size:14px}.vx-row .m{color:var(--fg-secondary);font-size:13px}
    .vx-row b .pos{font-weight:400;color:var(--muted);font-size:12px}
    .vx-row .x{font-size:11px;color:var(--muted);white-space:nowrap}.vx-row .x.bad{color:var(--bad-dark)}
    .qgroup.vq-card{border:1px solid var(--line);border-radius:14px;padding:12px 14px!important;margin:0 0 10px;background:var(--card)}
    .qgroup.vq-card>.qrow{display:none!important}
    .qgroup.vq-card>.qhead{display:flex;align-items:center;gap:6px 12px;flex-wrap:wrap;margin:0 0 8px;font-size:16px}
    .vq-meta{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13px;font-weight:400;color:var(--muted);margin-left:auto}
    .vq-session{display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap}
    .vq-check{min-height:28px;padding:0 10px;border:1px solid var(--line-strong);border-radius:999px;background:transparent;color:var(--muted);font:inherit;font-size:12px;cursor:pointer}
    .vq-check.on{background:var(--done-bg);border-color:var(--done-border);color:var(--done-dark);font-weight:600}
    .vq{margin:0;padding:0;border:0;background:transparent}
    .vq-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .vq-bar .vq-tabs{margin:0;display:inline-flex;gap:2px;padding:2px;border-radius:9px;background:var(--code-bg);border:1px solid var(--line)}
    .vq-bar .vq-tabs button{min-height:30px;border:0;border-radius:7px;background:transparent;color:var(--muted);padding:0 12px;font-size:13px}
    .vq-bar .vq-tabs button.on{background:var(--card);color:var(--fg);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.12)}
    .vq-bar .vq-actions{margin-left:auto}
    .vq-bar .vq-actions button{min-height:32px}
    .vq-items{margin:10px 0 0}
    .vq-clear{border:0!important;background:transparent!important;color:var(--muted);font:inherit;font-size:12px;cursor:pointer;min-height:28px;padding:0 6px}
    .vq-paste{display:flex;gap:8px;margin-top:8px}.vq-paste textarea{flex:1;min-height:0!important;margin:0!important}
    .vq-paste button{min-height:38px;padding:0 14px;border:1px solid var(--line);border-radius:8px;background:var(--card);font:inherit;font-size:13px;cursor:pointer}
    .vx-list{display:flex;flex-direction:column}
    .vx-q{display:grid;grid-template-columns:28px minmax(0,1fr) 44px 44px;align-items:center;gap:4px 10px;padding:10px 4px;border-bottom:1px solid var(--line);cursor:default}
    .vx-text{min-width:0;cursor:pointer}.vx-text .vx-en{margin-bottom:2px}
    .vx-ok{width:40px;height:40px;border:1px solid var(--line-strong);border-radius:10px;background:transparent;color:var(--muted);font-size:18px;cursor:pointer}
    .vx-q.right .vx-ok{background:var(--done);border-color:var(--done);color:#fff}.vx-q.right{background:var(--done-bg)}
    .vx-allright{margin-left:auto}
    .vx-q.was-wrong .vx-no{color:var(--bad)}
    .vx-no{font-size:12px;color:var(--muted);text-align:right;font-variant-numeric:tabular-nums}
    .vx-zh{font-size:13px;line-height:1.45;color:var(--fg-secondary);overflow-wrap:anywhere}
    .vx-en b{font-size:20px;font-weight:650;letter-spacing:-.01em}.vx-en small{color:var(--muted);font-size:12px}
    .vx-x{width:40px;height:40px;border:1px solid var(--line-strong);border-radius:10px;background:transparent;color:var(--muted);font-size:18px;cursor:pointer}
    .vx-q.wrong{background:var(--bad-bg)}.vx-q.wrong .vx-x{background:var(--bad);border-color:var(--bad);color:#fff}
    .vx-q.wrong .vx-en b{color:var(--bad-dark)}
    .vx-why{grid-column:2/-1;display:flex;gap:6px;flex-wrap:wrap}.vx-why:empty{display:none}
    .vx-why button{min-height:28px;padding:0 10px;border:1px solid var(--bad-border);border-radius:999px;background:var(--card);color:var(--bad-dark);font:inherit;font-size:12px;cursor:pointer}
    .vx-why button.on{background:var(--bad);color:#fff;border-color:var(--bad)}
    .vx-list[data-hide="en"] .vx-q:not(.peek) .vx-en,.vx-list[data-hide="zh"] .vx-q:not(.peek) .vx-zh{filter:blur(7px);user-select:none}
    .vx-score{font-size:40px;font-weight:700;text-align:center;margin:10px 0}
    @media(max-width:599px){.vx-q{grid-template-columns:20px minmax(0,1fr) 44px 44px}.vx-why{grid-column:2/-1}.vq-meta{margin-left:0}.vq-bar .vq-actions{margin-left:0}}
    .vx-card{text-align:center;padding:30px 10px}
    .vx-count{font-size:13px;color:var(--muted);margin-bottom:12px}
    .vx-prompt{font-size:clamp(26px,5vw,40px);font-weight:650;line-height:1.3;overflow-wrap:anywhere}
    .vx-hint{font-size:14px;color:var(--muted);margin-top:8px;white-space:pre-wrap}
    .vx-answer{margin-top:22px;font-size:clamp(22px,4vw,32px);color:var(--accent);font-weight:600;overflow-wrap:anywhere;min-height:1.4em}
    .vx-reasons{display:flex;gap:6px;justify-content:center;margin-top:12px;flex-wrap:wrap}
    .vx-reasons button.on{background:var(--bad-bg);border-color:var(--bad);color:var(--bad-dark)}
    .vx-big{flex:1;min-height:56px;font-size:17px!important;font-weight:650!important}
    .vx-big.right{background:var(--done-bg)!important;border-color:var(--done-border)!important;color:var(--done-dark)!important}
    .vx-big.wrong{background:var(--bad-bg)!important;border-color:var(--bad-border)!important;color:var(--bad-dark)!important}
    .vx-summary pre{white-space:pre-wrap;background:var(--code-bg);padding:12px;border-radius:10px;font:14px/1.7 var(--sans)}
    .vx-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:300;padding:8px 14px;border-radius:999px;background:var(--fg);color:var(--card);font-size:13px;opacity:.92;pointer-events:none}
    .vx-toast.bad{background:var(--bad);color:#fff}
    @media(max-width:599px){.vx-overlay{padding:0;align-items:stretch}.vx-box{max-height:100dvh;border-radius:0}.vq-item span{max-width:8em}}
  `; document.head.append(style);
  let toastTimer = 0;
  function flash(text, bad) {
    let t = document.querySelector('.vx-toast'); if (!t) { t = make('div', 'vx-toast'); document.body.append(t); }
    t.textContent = text; t.classList.toggle('bad', !!bad); t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, bad ? 4000 : 1200);
  }
  function overlay(title) {
    const ov = make('div', 'vx-overlay'), box = make('div', 'vx-box'), head = make('div', 'vx-head'), body = make('div', 'vx-body'), foot = make('div', 'vx-foot');
    head.append(make('h3', '', title)); const close = btn('fb-btn vx-close', '关闭', () => ov.remove()); head.append(close);
    box.append(head, body, foot); ov.append(box); document.body.append(ov);
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    const esc = e => { if (e.key === 'Escape' && document.body.contains(ov)) { ov.remove(); document.removeEventListener('keydown', esc); } };
    document.addEventListener('keydown', esc);
    return {ov, head, body, foot, close: () => ov.remove()};
  }

  // ---------- Splitting a long paste into lessons (same rules as split_lessons / classify in Manager/vocab_import.py) ----------
  const DATE_RULES = [
    [/(20\d{2})\s*[·.\-/年]\s*(\d{1,2})\s*[·.\-/月]\s*(\d{1,2})/, m => [+m[1], +m[2], +m[3]]],
    [/(?<!\d)(2\d)[-.·](\d{1,2})[-.·](\d{1,2})(?!\d)/, m => [2000 + +m[1], +m[2], +m[3]]],
    [/(?<!\d)(2\d)(\d{2})(\d{2})(?!\d)/, m => [2000 + +m[1], +m[2], +m[3]]],
    [/(?<![\d.\-])(\d{1,2})\s*[./月]\s*(\d{1,2})(?![\d.\-倍分])/, (m, y) => [y, +m[1], +m[2]]],
  ];
  function findDate(line, year) {
    for (const [re, build] of DATE_RULES) {
      const m = re.exec(line); if (!m) continue;
      const [y, mo, d] = build(m, year), dt = new Date(Date.UTC(y, mo - 1, d));
      if (mo >= 1 && mo <= 12 && dt.getUTCDate() === d) return dt.toISOString().slice(0, 10);
    }
    return null;
  }
  const HEADER_HINT = /课|反馈|小结|L\s*\d+|Lesson|听说|听力|阅读|写作|口语|读写|托福|雅思|SAT|【|「/;
  const NOT_HEADER = /估分|目标分|分数|倍速|跟读|朗读|段落|Activity|Paragraph|Passage|Section|正确率|第.篇|阶段|👉|\d️⃣/u;
  const isHeader = (line, year) => { const t = line.trim(); return t.length > 0 && t.length <= 48 && !NOT_HEADER.test(t) && !/^\s*[-–•]/.test(t) && !!findDate(t, year) && (HEADER_HINT.test(t) || t.length <= 16) && !WORD_LINE.test(t); };
  function splitLessons(body, year) {
    const blocks = []; let cur = null;
    for (const line of String(body || '').split('\n')) {
      if (isHeader(line, year)) { if (cur && cur.lines.some(l => l.trim())) blocks.push(cur); cur = {title: line.trim(), date: findDate(line, year), lines: [line]}; }
      else if (cur) cur.lines.push(line);
    }
    if (cur && cur.lines.some(l => l.trim())) blocks.push(cur);
    if (!blocks.length) blocks.push({title: '', date: null, lines: String(body || '').split('\n')});
    const now = today();
    blocks.forEach(b => { b.body = b.lines.join('\n').trim(); if (b.date && b.date > now) b.date = (Number(b.date.slice(0, 4)) - 1) + b.date.slice(4); });
    return blocks;
  }
  const FEEDBACK_MARK = /课堂|反馈|作业|入门考|讲解|教学内容|小结|📌|📚|👨|🙋/u;
  const FEEDBACK_TITLE = /反馈|小结|课堂|能力提升|雅思|托福|SAT|「|【|Lesson|class/i;
  const QUIZ_TITLE = /^\s*(?:[\w&‘’'一-鿿]{0,8})?\s*(?:\d{6}|\d{1,4}[./\-·年]\d{1,2}(?:[./\-·]\d{1,2})?)\s*[\w&‘’'一-鿿/👇\s]{0,16}$/u;
  function blockKind(b) {   // your own quiz records ("嘉宝10/24 听说53" with ✅/❌) are not lessons
    if (/抽背|背诵|默写/.test(b.title)) return 'quiz';
    if (!FEEDBACK_TITLE.test(b.title) && b.title.length <= 24 && QUIZ_TITLE.test(b.title)) return 'quiz';
    if (FEEDBACK_TITLE.test(b.title) || FEEDBACK_MARK.test(b.body)) return 'lesson';
    const lines = b.body.split('\n').filter(x => x.trim()).length, words = parseFeedback(b.body).length;
    return words && words >= 0.4 * Math.max(1, lines - 2) ? 'quiz' : 'lesson';
  }

  // ---------- 批量导入：一次粘贴某个学生很多节课的反馈（比如整条备忘录、聊天记录），自动按日期标题拆成一节一节 ----------
  function openBulk(learnerName) {
    const o = overlay('批量导入课堂反馈');
    const row = make('div', 'fb-row');
    const who = make('input'); who.type = 'text'; who.className = 'fb-search'; who.value = learnerName || ''; who.placeholder = '学生/班级（如 聂彦如/陈书进）'; who.setAttribute('list', 'fb-learner-list');
    const subj = make('input'); subj.type = 'text'; subj.className = 'fb-search'; subj.placeholder = '学科（留空按每节标题判断）'; subj.size = 14;
    row.append(who, subj);
    const ta = make('textarea'); ta.className = 'fb-bulk-text'; ta.placeholder = '把这个学生多节课的反馈一次性粘贴进来。每节以带日期的标题开头（如「26-11-01 雅思听力 L3」「【书进】2026·10·31 阅读反馈3」），会自动拆开；你自己的抽背记录会被认出来，不当新课。';
    const hint = make('div', 'fb-meta'), list = make('div');
    o.body.append(row, ta, hint, list);
    if (!document.getElementById('fb-learner-list')) { const dl = make('datalist'); dl.id = 'fb-learner-list'; allLearners().forEach(l => { const op = make('option'); op.value = l; dl.append(op); }); document.body.append(dl); }
    let blocks = [];
    const count = make('span', 'fb-meta');
    const recount = () => { const n = blocks.filter(b => b.pick).length; count.textContent = '将导入 ' + n + ' 节'; go.disabled = !n; };
    const paint = () => {
      list.textContent = '';
      const year = Number(today().slice(0, 4)), learner = keyOf(who.value);
      const have = index.filter(l => l.learner === learner);
      blocks = ta.value.trim() ? splitLessons(ta.value, year) : [];
      const known = v => { const hit = SUBJECTS.find(([, re]) => re.test(String(v || ''))); return hit ? hit[0] : ''; };
      const noteSubject = known(subj.value) || known((ta.value.split('\n').find(x => x.trim()) || '').slice(0, 20));   // 整条备忘录粘贴时第一行就是学科
      hint.textContent = blocks.length ? '识别到 ' + blocks.length + ' 段：' + blocks.filter(b => blockKind(b) === 'lesson').length + ' 节课堂反馈，' + blocks.filter(b => blockKind(b) === 'quiz').length + ' 段抽背记录（不导入）' : '';
      blocks.forEach((b, i) => {
        b.kind = blockKind(b); b.words = parseFeedback(b.body); b.subject = known(subj.value) || known(b.title) || noteSubject || subjectOf(subj.value) || '其他';
        b.same = have.some(l => l.lesson_date === b.date && subjectOf(l.subject) === b.subject && (lessonNo(l.title) || 0) === (lessonNo(b.title) || 0));
        b.twin = b.kind === 'lesson' && blocks.slice(0, i).some(x => x.kind === 'lesson' && x.date === b.date && x.subject === b.subject && (lessonNo(x.title) || 0) === (lessonNo(b.title) || 0));
        b.pick = b.kind === 'lesson' && !b.same && !b.twin;
        const card = make('label', 'fb-lesson fb-bulk-row' + (b.kind === 'quiz' ? ' fb-orphan' : '')), sum = make('span', 'fb-bulk-sum');
        const cb = make('input'); cb.type = 'checkbox'; cb.checked = b.pick; cb.disabled = b.kind === 'quiz'; cb.onchange = () => { b.pick = cb.checked; recount(); };
        const no = lessonNo(b.title), badge = make('span', 'vx-no' + (b.kind === 'quiz' ? ' vx-quiz' : no ? '' : ' none'), b.kind === 'quiz' ? '抽背' : no ? 'L' + no : '—');
        const info = make('span', 'vx-info'), when = make('span', 'vx-when');
        const date = make('input'); date.type = 'date'; date.value = b.date || ''; date.className = 'fb-bulk-date'; date.onclick = e => e.preventDefault(); date.onchange = () => { b.date = date.value || null; };
        date.addEventListener('click', e => { e.stopPropagation(); date.showPicker?.(); });
        when.append(date, make('small', '', ' ' + b.subject));
        info.append(when, make('small', 'vx-sub', (b.title || '（没有标题）').slice(0, 60) + ' · ' + b.words.length + ' 词'));
        const tags = make('span', 'vx-tags');
        if (b.kind === 'quiz') tags.append(make('span', 'fb-pill todo', '抽背记录，不导入'));
        else if (b.same) tags.append(make('span', 'fb-pill', '可能已有'));
        else if (b.twin) tags.append(make('span', 'fb-pill', '和上面重复'));
        if (b.kind === 'lesson' && !b.date) tags.append(make('span', 'fb-pill bad', '缺日期'));
        sum.append(cb, badge, info, tags); card.append(sum); list.append(card);
      });
      recount();
    };
    let timer; const later = () => { clearTimeout(timer); timer = setTimeout(paint, 250); };
    ta.oninput = later; who.oninput = later; subj.oninput = later;
    const go = btn('fb-btn pri', '导入选中的课', async () => {
      const learner = keyOf(who.value), picked = blocks.filter(b => b.pick);
      if (!learner) { flash('请填写学生或班级'); who.focus(); return; }
      if (picked.some(b => !b.date) && !confirm('有 ' + picked.filter(b => !b.date).length + ' 节没识别到日期，仍然导入（日期留空）吗？')) return;
      go.disabled = true; let saved = 0, dup = 0, added = 0;
      try {
        for (const b of picked) {
          count.textContent = '导入中 ' + (saved + dup + 1) + '/' + picked.length + '…';
          const r = await saveLesson({learner, subject: b.subject, lesson_date: b.date, title: (b.title || b.subject).slice(0, 120), body: b.body}, b.words);
          if (r.duplicate) dup++; else { saved++; added += r.added; }
        }
        o.close(); flash('已导入 ' + saved + ' 节，新增 ' + added + ' 个生词' + (dup ? '；' + dup + ' 节之前已存在，跳过' : ''));
        learnerOpen = learner; view = 'all'; renderPanel();
      } catch (e) { count.textContent = '导入失败（已导入 ' + saved + ' 节）：' + (e.message || e); go.disabled = false; }
    });
    o.foot.append(count, go); recount();
  }

  // ---------- 课堂反馈 panel ----------
  let open = false, root = null, view = 'today', learnerOpen = null, collectDay = '', learnerSubject = '';
  const stateText = () => ({cloud: '已连接云端', preview: '本机预览数据（不会上传）', signedout: '请先登录工作台', none: '云端未连接'}[mode] || '正在连接…');
  function sessionsFor(day) {
    let all = {}; try { all = DATA._sess || {}; } catch {}
    return (all[day] || []).map(s => ({who: plainName(s[0]), time: s[1] || '', course: s[2] || '', teacher: s[3] || '', way: s[4] || ''}));
  }
  async function renderPanel() {
    if (!root) return;
    root.textContent = '';
    const head = make('div', 'fb-head'); head.append(make('h2', '', '课堂反馈'));
    const tabs = make('div', 'fb-tabs');
    [['today', '今日收集'], ['all', '全部反馈']].forEach(([k, label]) => { const b = btn(view === k ? 'on' : '', label, () => { view = k; learnerOpen = null; renderPanel(); }); tabs.append(b); });
    head.append(tabs);
    const note = make('span', 'fb-note', stateText()); head.append(note); root.append(head);
    await ready(); note.textContent = stateText(); note.classList.toggle('warn', mode !== 'cloud');
    if (mode !== 'cloud' && mode !== 'preview') { root.append(make('div', 'fb-card', '课堂反馈存在你本人的云端，登录工作台后才能查看和保存。')); return; }
    try { await lessonIndex(); } catch (e) { root.append(make('div', 'fb-card', '读取失败：' + (e.message || e))); return; }
    if (view === 'today') renderToday(); else if (learnerOpen) renderLearner(learnerOpen); else renderLearners();
  }
  function renderToday() {
    collectDay = collectDay || today();
    const bar = make('div', 'fb-card'), row = make('div', 'fb-row');
    const day = make('input'); day.type = 'date'; day.value = collectDay; day.className = 'fb-search'; day.onchange = () => { collectDay = day.value || today(); renderPanel(); };
    row.append(make('span', 'fb-title', '收集日期'), day, make('span', 'fb-meta', '按当天课表逐节粘贴老师在群里发的反馈；保存后自动挑出生词放进这个学生的单词库。'));
    bar.append(row); root.append(bar);
    const sess = sessionsFor(collectDay), learners = allLearners();
    const got = index.filter(l => l.lesson_date === collectDay);
    let missing = 0;
    if (!sess.length) root.append(make('div', 'fb-card fb-meta', '这天的课表没有记录（只能收集已发布课表里的课）。下面仍可手动添加。'));
    sess.forEach(s => {
      const learner = learners.find(l => keyOf(l) === keyOf(s.who)) || learners.find(l => sameGroup(l, s.who)) || keyOf(s.who);   // only a folder with exactly these students; never a look-alike class
      const subject = subjectOf(s.course);
      const done = got.filter(l => l.learner === learner && (String(l.title || '').startsWith(s.time) || l.subject === subject));
      if (!done.length) missing++;
      root.append(collectCard({learner, subject, time: s.time, course: s.course, teacher: s.teacher, done}));
    });
    root.append(manualCard());
    if (sess.length) { const head = root.querySelector('.fb-head'); head.insertBefore(make('span', 'fb-pill ' + (missing ? 'todo' : 'ok'), missing ? '还差 ' + missing + ' 节没收集' : '今天的反馈都收齐了'), head.querySelector('.fb-note')); }
  }
  // Subject colour chips (same hue per subject everywhere on the feedback pages).
  const SUBJECT_TONE = {听力: 'blue', 阅读: 'green', 写作: 'amber', 口语: 'purple', 读写: 'teal', 托福: 'pink', SAT: 'coral', 语法: 'gray', 校内: 'gray'};
  const subjectChip = name => make('span', 'fb-chip tone-' + (SUBJECT_TONE[subjectOf(name)] || 'gray'), subjectOf(name));
  // One card per scheduled lesson: a time column on the left, subject chip · student · teacher, status on the right.
  // Waiting: one line with 「粘贴反馈」. Pasting: text left, live words right, lesson number/date read from the teacher's first line.
  // Collected: one quiet line (✓ L6 · 18 词) that opens to the saved feedback.
  function collectCard(s) {
    const [t1, t2] = String(s.time || '').split('-');
    const timeCol = () => { const c = make('div', 'fb-time'); c.append(make('b', '', t1 || '—'), make('small', '', t2 || '')); return c; };
    const headLine = right => { const h = make('div', 'fb-collect-head'); h.append(subjectChip(s.course || s.subject), make('span', 'fb-who', String(s.learner || '').replace(/\//g, '、')), make('span', 'fb-teacher', s.teacher || ''), ...right); return h; };
    if (s.done.length) {
      const card = make('details', 'fb-collect done'), sum = make('summary');
      const words = make('span', 'fb-done-note');
      const no = s.done.map(l => lessonNo(l.title)).find(Boolean);
      words.append(make('span', '', '✓'), document.createTextNode(' ' + (no ? 'L' + no + ' · ' : '') + '已收集'));
      sum.append(timeCol(), headLine([words, make('span', 'fb-chev', '')])); card.append(sum);
      const body = make('div', 'fb-collect-body');
      s.done.forEach(l => body.append(lessonDetails(l)));
      const more = btn('fb-btn', '再补一段', () => { more.remove(); body.append(pasteForm(s, () => {}, null, true)); }); body.append(more);
      card.append(body);
      // fill in the word count once (cheap: parse the saved text)
      Promise.all(s.done.map(l => lessonWords(l.id))).then(ls => { const n = ls.reduce((k, w) => k + w.length, 0); words.lastChild.textContent = ' ' + (no ? 'L' + no + ' · ' : '') + n + ' 词'; }).catch(() => {});
      return card;
    }
    const card = make('div', 'fb-collect'), top = make('div', 'fb-collect-top');
    const slot = make('div', 'fb-collect-body');
    const status = make('span', 'fb-wait', '待收集');
    const open = btn('fb-btn', '粘贴反馈', () => { open.remove(); card.classList.add('editing'); slot.append(pasteForm(s, info => { status.textContent = info || '待收集'; }, () => { slot.textContent = ''; card.classList.remove('editing'); status.textContent = '待收集'; headRow.append(open); }, true)); });
    const headRow = headLine([status, open]);
    top.append(timeCol(), headRow); card.append(top, slot);
    return card;
  }
  function manualCard() {
    const card = make('details', 'fb-collect manual'), sum = make('summary');
    const t = make('div', 'fb-time'); t.append(make('b', '', '＋'));
    const h = make('div', 'fb-collect-head'); h.append(make('span', 'fb-who', '手动添加一节课的反馈'), make('span', 'fb-teacher', '课表里没有的课'));
    sum.append(t, h); card.append(sum);
    const body = make('div', 'fb-collect-body'); card.append(body);
    card.addEventListener('toggle', () => { if (card.open && !body.childElementCount) body.append(pasteForm({learner: '', subject: '', course: '', manual: true}, () => {})); });
    return card;
  }
  // The paste buttons read the clipboard themselves (one click, no second paste). Browsers may ask once for permission;
  // if reading is refused or unsupported the box opens empty and says ⌘V.
  async function clipText() {
    try { const t = await navigator.clipboard.readText(); return (t || '').trim(); } catch { return null; }
  }
  async function fillFromClipboard(ta, hint) {
    const t = await clipText();
    if (t) { ta.value = t; ta.dispatchEvent(new Event('input')); ta.setSelectionRange(0, 0); ta.scrollTop = 0; return true; }
    if (hint) hint.textContent = t === '' ? '剪贴板是空的，先在微信里复制老师的反馈' : '没能直接读取剪贴板，请在框里按 ⌘V 粘贴';
    ta.focus(); return false;
  }
  // Paste box: text left, live words right. For a scheduled lesson the student and subject come from the timetable;
  // only the manual card asks for them. onInfo(text) shows "L4 · 11/8 周日 · 2 词" in the card header while typing.
  function pasteForm(s, onInfo, onCancel, fromClipboard) {
    const box = make('div', 'fb-paste'), grid = make('div', 'fb-entry-body'), ta = make('textarea', 'fb-edit-text'), words = make('div', 'fb-words');
    ta.placeholder = '把老师在群里发的这节课反馈整段粘贴到这里，右边会自动识别生词';
    grid.append(ta, words); growArea(ta); const ed = wordEditor(words, () => ta.value);
    const bar = make('div', 'fb-row fb-edit-bar');
    const learner = make('input'); learner.type = 'text'; learner.className = 'fb-search'; learner.value = s.learner || ''; learner.placeholder = '学生/班级（如 聂彦如/陈书进）'; learner.setAttribute('list', 'fb-learner-list');
    const subject = make('input'); subject.type = 'text'; subject.className = 'fb-search'; subject.value = s.subject || ''; subject.placeholder = '学科'; subject.size = 8;
    const status = make('span', 'fb-meta');
    const info = () => {
      const first = (ta.value.split('\n').find(x => x.trim()) || ''), no = lessonNo(first), d = collectDay || today();
      return ta.value.trim() ? [no ? 'L' + no : '', md(d) + weekday(d), ed.words().length + ' 词'].filter(Boolean).join(' · ') : '';
    };
    let timer; ta.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { ed.refresh(); onInfo && onInfo(info()); }, 150); });
    words.addEventListener('input', () => onInfo && onInfo(info()));
    const save = btn('fb-btn pri', '保存', async () => {
      const body = ta.value.trim(), who = keyOf(learner.value), subj = subjectOf(subject.value || s.course);
      if (!body) { status.textContent = '先粘贴反馈'; ta.focus(); return; }
      if (!who) { status.textContent = '填写学生或班级'; learner.focus(); return; }
      const ws = ed.words(), firstLine = (body.split('\n').find(x => x.trim()) || '').trim().slice(0, 120), no = lessonNo(firstLine), d = collectDay || today();
      if (!await askConfirm('保存这节反馈？', [who.replace(/\//g, '、'), subj, no ? 'L' + no : '', md(d) + weekday(d)].filter(Boolean).join(' · ') + '\n识别到 ' + ws.length + ' 个生词，会加进这个学生的单词库。', '保存')) return;
      save.disabled = true; status.textContent = '';
      try {
        // The teacher's own first line (e.g. "26-11-01 雅思听力 L3") is the title, so the lesson number is the teacher's.
        const r = await busy('正在保存…', () => saveLesson({learner: who, subject: subj, lesson_date: d, title: firstLine || (s.course || subj), body}, ws, ed.edited));
        flash(r.duplicate ? '这段反馈之前已保存过' : '已保存，新增 ' + r.added + ' 个生词'); renderPanel();
      } catch (e) { status.textContent = '保存失败：' + (e.message || e); save.disabled = false; }
    });
    if (s.manual) bar.append(learner, subject);
    bar.append(make('span', 'fb-grow'), status);
    if (onCancel) bar.append(btn('fb-btn', '取消', onCancel));
    bar.append(save); box.append(grid, bar);
    if (!document.getElementById('fb-learner-list')) { const dl = make('datalist'); dl.id = 'fb-learner-list'; allLearners().forEach(l => { const o = make('option'); o.value = l; dl.append(o); }); document.body.append(dl); }
    if (fromClipboard) fillFromClipboard(ta, status); else setTimeout(() => ta.focus(), 0);
    return box;
  }
  function hiddenGaps(lessons) { if (!lessons.length || !ignored) return []; const who = lessons[0].learner, subject = subjectOf(lessons[0].subject); return [...ignored].filter(k => k.startsWith(who + '|' + subject + '|')).map(k => Number(k.split('|')[2])).sort((a, b) => b - a); }
  function gapsOf(lessons) {
    const nums = [...new Set(lessons.map(l => lessonNo(l.title)).filter(Boolean))].sort((a, b) => a - b);
    if (nums.length < 3) return [];
    const who = lessons[0].learner, subject = subjectOf(lessons[0].subject);
    const missing = []; for (let n = nums[0]; n <= nums[nums.length - 1]; n++) if (!nums.includes(n) && !(ignored && ignored.has(gapKey(who, subject, n)))) missing.push(n);
    return missing;
  }
  const latestOf = ls => ls.map(l => l.lesson_date || '').sort().pop() || '';
  function renderLearners() {
    const top = make('div', 'fb-card'), search = make('input'); search.type = 'search'; search.className = 'fb-search'; search.placeholder = '搜索学生或班级'; search.style.width = '100%';
    const bulk = btn('fb-btn', '批量导入反馈', () => openBulk('')); top.classList.add('fb-row'); search.style.flex = '1'; search.style.width = 'auto';
    top.append(search, bulk); root.append(top);
    const grid = make('div', 'fb-learners'); root.append(grid);
    const groups = new Map(); index.forEach(l => { if (!groups.has(l.learner)) groups.set(l.learner, []); groups.get(l.learner).push(l); });
    const paint = () => {
      grid.textContent = ''; const q = search.value.trim();
      [...groups.entries()].filter(([k]) => !q || k.includes(q)).sort((a, b) => latestOf(b[1]).localeCompare(latestOf(a[1]))).forEach(([k, ls]) => {
        const bySubject = new Map(); ls.forEach(l => { const s = subjectOf(l.subject); if (!bySubject.has(s)) bySubject.set(s, []); bySubject.get(s).push(l); });
        const gaps = [...bySubject.values()].reduce((n, x) => n + gapsOf(x).length, 0);
        const card = btn('fb-learner', '', () => { learnerOpen = k; learnerSubject = ''; renderPanel(); });
        card.append(make('b', '', k.replace(/\//g, '、')), make('span', '', ls.length + ' 节 · 最近 ' + md(latestOf(ls))));
        if (gaps) card.append(make('span', 'gap', ' · 疑似缺 ' + gaps + ' 节'));
        grid.append(card);
      });
    };
    search.oninput = paint; paint();
  }
  const weekday = d => d ? ' 周' + '日一二三四五六'[new Date(d + 'T12:00:00').getDay()] : '';
  // Words panel shared by view, edit and add: recognised live from the text.
  function paintWords(box, ws, note) {
    box.textContent = '';
    const head = make('div', 'fb-words-head'); head.append(make('b', '', note || '本节生词'), make('span', 'fb-pill', ws.length + ' 个'));
    box.append(head);
    if (!ws.length) box.append(make('div', 'fb-meta', '没有识别到生词'));
    ws.forEach(w => { const r = make('div', 'fb-word'), en = make('b', '', w.word); if (w.pos) en.append(make('small', '', ' ' + normPos(w.pos) + '.')); r.append(en, make('span', '', w.meaning || '')); box.append(r); });
  }
  // Editable word list beside a feedback text. It follows the text until you change a word; then your list is kept
  // (「按原文重新识别」 goes back). 「批量编辑」 turns it into one word per line: "word pos. 意思".
  function wordEditor(box, getText, initial) {
    let list = initial ? slimWords(initial) : slimWords(parseFeedback(getText())), edited = !!initial, batch = false;
    let picked = new Set(), undo = null;   // marquee selection (row indices) and the last bulk removal
    const line = w => [w.word, w.pos ? w.pos + '.' : '', w.meaning].filter(Boolean).join(' ');
    const fromLine = t => { const p = parseFeedback(t)[0]; if (p) return {word: p.word, pos: p.pos || '', meaning: p.meaning || ''}; const cut = t.search(/[一-鿿]/); return {word: (cut >= 0 ? t.slice(0, cut) : t).trim(), pos: '', meaning: cut >= 0 ? t.slice(cut).trim() : ''}; };
    const touch = () => { edited = true; };
    const draw = () => {
      box.textContent = ''; box.classList.add('fb-wedit');
      const head = make('div', 'fb-words-head'); head.title = '在空白处按住拖动可框选多个词，按 ⌫ 删除；⌘ 点一行可加选；⌘Z 撤销';
      head.append(make('b', '', edited ? '生词（已手动修改）' : '识别到的生词'), make('span', 'fb-pill', picked.size ? '已选 ' + picked.size : list.length + ' 个'), make('span', 'fb-grow'));
      if (picked.size && !batch) head.append(btn('fb-link danger', '删除所选 ' + picked.size, removePicked));
      else if (undo && !batch) head.append(btn('fb-link', '撤销删除', () => { list = undo; undo = null; draw(); }));
      if (edited) head.append(btn('fb-link', '按原文重新识别', () => { list = slimWords(parseFeedback(getText())); edited = false; batch = false; picked.clear(); draw(); }));
      head.append(btn('fb-link', batch ? '完成' : '批量编辑', () => { if (batch) { list = ta.value.split('\n').map(x => x.trim()).filter(Boolean).map(fromLine).filter(w => w.word); touch(); } batch = !batch; draw(); }));
      box.append(head);
      let ta = null;
      if (batch) {
        ta = make('textarea', 'fb-wedit-batch'); ta.value = list.map(line).join('\n'); ta.spellcheck = false;
        ta.rows = Math.min(Math.max(list.length + 2, 8), 30);
        box.append(ta, make('div', 'fb-meta', '一行一个：英文 词性. 中文，例如 vessel n. 船只。删掉一行就是去掉这个词，点「完成」保存这份清单。'));
        setTimeout(() => ta.focus(), 0); return;
      }
      if (!list.length) box.append(make('div', 'fb-meta', '没有识别到生词，可以在下面加'));
      list.forEach((w, i) => {
        const row = make('div', 'fb-wrow');
        const word = make('input', 'w'); word.value = w.word; word.placeholder = '单词'; word.spellcheck = false;
        const pos = make('select', 'p'); pos.title = '词性'; pos.setAttribute('aria-label', '词性');
        const cur = normPos(w.pos);
        [['', '词性'], ...POS_OPTIONS.map(x => [x, x + '.'])].concat(cur && !POS_OPTIONS.includes(cur) ? [[cur, cur + '.']] : []).forEach(([v, t]) => { const o = make('option', '', t); o.value = v; pos.append(o); });
        pos.value = cur; pos.classList.toggle('empty', !cur);
        const mean = make('input', 'm'); mean.value = w.meaning; mean.placeholder = '中文意思'; mean.spellcheck = false;
        const fitPos = () => { const ctx = (fitCanvas.c ||= document.createElement('canvas').getContext('2d')); ctx.font = getComputedStyle(pos).font; pos.style.width = Math.ceil(ctx.measureText(pos.options[pos.selectedIndex]?.text || '').width + 27) + 'px'; };
        requestAnimationFrame(fitPos);
        const sync = () => { list[i] = {word: word.value.trim(), pos: pos.value, meaning: mean.value.trim()}; pos.classList.toggle('empty', !pos.value); fitPos(); touch(); const h = box.querySelector('.fb-words-head b'); if (h) h.textContent = '生词（已手动修改）'; };
        word.oninput = sync; mean.oninput = sync; pos.onchange = sync;
        const del = make('button', 'fb-wdel'); del.type = 'button'; del.innerHTML = ICON.trash; del.title = '去掉这个词'; del.setAttribute('aria-label', '去掉 ' + (w.word || '这个词'));
        del.onclick = () => { list.splice(i, 1); touch(); draw(); };
        const top = make('div', 'fb-wtop'); top.append(word, pos, del);
        row.append(top, mean); row.dataset.i = i; row.classList.toggle('picked', picked.has(i)); box.append(row);
        row.addEventListener('mousedown', e => { if ((e.metaKey || e.ctrlKey) && !e.target.closest('input,select,button')) { e.preventDefault(); picked.has(i) ? picked.delete(i) : picked.add(i); box.focus({preventScroll: true}); draw(); } });
        const fit = () => { const ctx = (fitCanvas.c ||= document.createElement('canvas').getContext('2d')); ctx.font = getComputedStyle(word).font; word.style.width = Math.ceil(Math.max(ctx.measureText(word.value || word.placeholder).width + 6, 40)) + 'px'; };
        requestAnimationFrame(fit); word.addEventListener('input', fit);
      });
      box.append(btn('fb-link fb-wadd', '＋ 加一个词', () => { list.push({word: '', pos: '', meaning: ''}); touch(); draw(); const ins = box.querySelectorAll('.fb-wrow input.w'); ins[ins.length - 1]?.focus(); }));
    };
    function removePicked() {
      if (!picked.size) return;
      undo = list.slice(); list = list.filter((_, i) => !picked.has(i)); picked.clear(); touch(); draw(); box.focus({preventScroll: true});
    }
    // Drag a box over the list (start on blank space, not in a field) to select words; Delete/⌫ removes them.
    box.tabIndex = -1;
    box.addEventListener('keydown', e => {
      if (e.target !== box) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && picked.size) { e.preventDefault(); removePicked(); }
      if (e.key === 'Escape' && picked.size) { picked.clear(); draw(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && !batch) { e.preventDefault(); list.forEach((_, i) => picked.add(i)); draw(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && undo) { e.preventDefault(); list = undo; undo = null; draw(); }
    });
    box.addEventListener('pointerdown', e => {
      if (batch || e.button !== 0 || e.pointerType === 'touch' || e.metaKey || e.ctrlKey || e.target.closest('input,select,button,textarea,a')) return;
      e.preventDefault(); box.focus({preventScroll: true});
      const r0 = box.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY, s0 = box.scrollTop, base = e.shiftKey ? new Set(picked) : new Set();
      const band = make('div', 'fb-marquee'); let moved = false;
      const move = ev => {
        const dx = ev.clientX - x0, dy = ev.clientY - y0 + (box.scrollTop - s0);
        if (!moved && Math.hypot(dx, dy) < 4) return;
        if (!moved) { moved = true; box.append(band); }
        if (ev.clientY > r0.bottom - 24) box.scrollTop += 12; else if (ev.clientY < r0.top + 24) box.scrollTop -= 12;   // auto-scroll at the edges
        const top0 = y0 - r0.top + s0, top1 = ev.clientY - r0.top + box.scrollTop, left0 = x0 - r0.left, left1 = ev.clientX - r0.left;
        Object.assign(band.style, {left: Math.min(left0, left1) + 'px', top: Math.min(top0, top1) + 'px', width: Math.abs(left1 - left0) + 'px', height: Math.abs(top1 - top0) + 'px'});
        const lo = Math.min(top0, top1), hi = Math.max(top0, top1);
        picked = new Set(base);
        box.querySelectorAll('.fb-wrow').forEach(row => { const t = row.offsetTop, b = t + row.offsetHeight; const i = Number(row.dataset.i); if (b > lo && t < hi) picked.add(i); row.classList.toggle('picked', picked.has(i)); });
        const h = box.querySelector('.fb-words-head'); h.querySelector('.fb-pill').textContent = picked.size ? '已选 ' + picked.size : list.length + ' 个';
      };
      const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); band.remove(); if (!moved) picked.clear(); draw(); box.focus({preventScroll: true}); };
      document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
    });
    draw();
    return {
      refresh() { if (!edited) { list = slimWords(parseFeedback(getText())); picked.clear(); undo = null; draw(); } },   // the text changed
      words: () => list.filter(w => w.word),
      get edited() { return edited; },
    };
  }
  const fitCanvas = {};
  const growArea = ta => { const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.min(Math.max(ta.scrollHeight + 2, 220), 640) + 'px'; }; ta.addEventListener('input', fit); requestAnimationFrame(fit); };
  // Paste box for a lesson that is not saved yet (a missing lesson, or a new one): text left, live words right.
  function addBox({learner, subject, no, onDone, onCancel, fromClipboard = true}) {
    const wrap = make('div', 'fb-edit'), grid = make('div', 'fb-entry-body'), ta = make('textarea', 'fb-edit-text'), words = make('div', 'fb-words');
    ta.placeholder = '把这节课老师的反馈整段粘贴进来' + (no ? '（L' + no + '）' : '') + '，右边会自动识别生词';
    grid.append(ta, words); growArea(ta); const ed = wordEditor(words, () => ta.value);
    const bar = make('div', 'fb-row fb-edit-bar'), date = make('input'); date.type = 'date'; date.className = 'fb-search';
    const num = make('input'); num.type = 'number'; num.min = '1'; num.max = '999'; num.className = 'fb-search fb-no-input'; num.placeholder = '课次'; if (no) { num.value = no; num.disabled = true; }
    const status = make('span', 'fb-meta');
    let timer;
    ta.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => {
      ed.refresh();
      const first = (ta.value.split('\n').find(x => x.trim()) || ''); const d = findDate(first, Number(today().slice(0, 4)));
      if (d && !date.dataset.touched) date.value = d > today() ? (Number(d.slice(0, 4)) - 1) + d.slice(4) : d;
      const n = lessonNo(first); if (n && !no && !num.dataset.touched) num.value = n;
    }, 200); });
    date.onchange = () => { date.dataset.touched = '1'; }; num.oninput = () => { num.dataset.touched = '1'; };
    const save = btn('fb-btn pri', '保存这节', async () => {
      const body = ta.value.trim(); if (!body) { status.textContent = '先粘贴反馈'; ta.focus(); return; }
      const n = Number(num.value) || null, ws = ed.words();
      if (!await askConfirm('保存这节反馈？', [learner.replace(/\//g, '、'), subject, n ? 'L' + n : '没有课次', date.value ? md(date.value) + weekday(date.value) : '没有日期'].join(' · ') + '\n识别到 ' + ws.length + ' 个生词，会按课次排进列表。', '保存')) return;
      save.disabled = true; status.textContent = '保存中…';
      try {
        let title = (body.split('\n').find(x => x.trim()) || '').trim().slice(0, 120);
        if (n && lessonNo(title) !== n) title = (title ? title + ' ' : subject + ' ') + 'L' + n;   // the list sorts by this number
        const r = await busy('正在保存 ' + (n ? 'L' + n : '这节') + '…', () => saveLesson({learner, subject, lesson_date: date.value || null, title, body}, ws, ed.edited));
        flash(r.duplicate ? '这段反馈之前已保存过' : '已保存，新增 ' + r.added + ' 个生词'); await lessonIndex(true); onDone && onDone();
      } catch (e) { status.textContent = '保存失败：' + (e.message || e); save.disabled = false; }
    });
    bar.append(make('span', 'fb-meta', '课次'), num, make('span', 'fb-meta', '日期'), date, save, btn('fb-btn', '取消', () => onCancel && onCancel()), status);
    wrap.append(grid, bar); fillFromClipboard(ta, status);
    return wrap;
  }
  // One lesson = one row: lesson-number badge, date + weekday, the teacher's own title; open → feedback text beside its words, with 编辑.
  function lessonDetails(l, refresh) {
    const d = make('details', 'fb-lesson fb-entry'), s = make('summary');
    const drawHead = () => {
      s.textContent = '';
      const no = lessonNo(l.title);
      const badge = make('span', 'vx-no' + (no ? '' : ' none'), no ? 'L' + no : '—');
      const info = make('span', 'vx-info'), when = make('span', 'vx-when', md(l.lesson_date));
      if (l.lesson_date) when.append(make('small', '', weekday(l.lesson_date)));
      info.append(when, make('small', 'vx-sub', l.title || ''));
      const tags = make('span', 'vx-tags'); if (l.origin && l.origin !== 'notes-import') tags.append(make('span', 'fb-pill ok', '网页收集'));
      s.append(badge, info, tags);
    };
    drawHead();
    const body = make('div', 'fb-entry-body'), text = make('pre', 'fb-body', '读取中…'), words = make('div', 'fb-words');
    const tools = make('div', 'fb-row fb-edit-bar');
    body.append(text, words); d.append(s, body, tools);
    const view = raw => {
      body.textContent = ''; tools.textContent = '';
      text.textContent = raw; body.append(text, words); paintWords(words, customWords.get(l.id) || parseFeedback(raw), customWords.get(l.id) ? '本节生词（手动修改过）' : '本节生词');
      tools.append(btn('fb-btn', '编辑', () => edit(raw)));
    };
    const edit = (raw, fresh) => {
      body.textContent = ''; tools.textContent = '';
      const ta = make('textarea', 'fb-edit-text'); ta.value = fresh ? '' : raw; if (fresh) ta.placeholder = '粘贴这节课新的课堂反馈，保存后替换原来的内容'; growArea(ta);
      body.append(ta, words); const ed = wordEditor(words, () => ta.value, fresh ? null : customWords.get(l.id));
      let timer; ta.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => ed.refresh(), 200); });
      const date = make('input'); date.type = 'date'; date.className = 'fb-search'; date.value = l.lesson_date || '';
      const status = make('span', 'fb-meta');
      const save = btn('fb-btn pri', '保存修改', async () => {
        const next = ta.value.trim(); if (!next) { status.textContent = '内容不能为空'; return; }
        if (next === raw.trim() && (date.value || null) === (l.lesson_date || null) && !ed.edited) { view(raw); return; }
        const ws = ed.words(), no = lessonNo(l.title);
        if (!await askConfirm('保存修改？', [l.learner.replace(/\//g, '、'), subjectOf(l.subject), no ? 'L' + no : '', date.value ? md(date.value) + weekday(date.value) : '没有日期'].filter(Boolean).join(' · ') + '\n改后识别到 ' + ws.length + ' 个生词；新出现的词加进词库，已有的词不删。', '保存修改')) return;
        save.disabled = true; status.textContent = '保存中…';
        try { const r = await busy('正在保存修改…', () => editLesson(l.id, {body: next, lesson_date: date.value || null, words: ws, custom: ed.edited})); flash('已保存，识别到 ' + r.total + ' 个生词' + (r.added ? '，新增 ' + r.added + ' 个进词库' : '')); drawHead(); view(next); refresh && refresh(); }
        catch (e) { status.textContent = '保存失败：' + (e.message || e); save.disabled = false; }
      });
      tools.append(make('span', 'fb-meta', '日期'), date, save, btn('fb-btn', '取消', () => view(raw)), status);
      if (fresh) fillFromClipboard(ta, status); else ta.focus();
    };
    let raw0 = null;
    const load = async () => { if (raw0 === null) { raw0 = await lessonBody(l.id); d.dataset.loaded = '1'; } return raw0; };
    d.addEventListener('toggle', async () => {
      if (!d.open || d.dataset.loaded === '1') return;
      try { view(await load()); } catch (e) { text.textContent = '读取失败：' + (e.message || e); }
    });
    // 左滑「重新导入」：打开编辑，清空正文等你粘贴新的反馈（取消则保持原文）。
    d.addEventListener('fb-reimport', async () => { try { const raw = await load(); edit(raw, true); d.scrollIntoView({block: 'nearest', behavior: 'smooth'}); } catch (e) { flash('读取失败：' + (e.message || e), true); } });
    return d;
  }
  const ICON = {
    trash: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
    paste: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 10v7M9 14l3 3 3-3"/></svg>',
  };
  // Row actions. With a mouse or trackpad (Mac) the icon buttons fade in on the right when the pointer is over the row:
  // a browser cannot tell a finger on the trackpad from momentum, so a two-finger swipe can never feel attached.
  // On touch screens the row follows the finger (touchstart/move/end are exact) and snaps open or closed.
  // canSwipe() lets an opened lesson ignore touch swipes so its text can be read and scrolled.
  function swipeable(el, actions, canSwipe) {
    const wrap = make('div', 'fb-swipe'), inner = make('div', 'fb-swipe-inner'), tray = make('div', 'fb-swipe-tray');
    inner.append(el); wrap.append(inner, tray);
    actions.forEach(a => { const b = make('button', 'fb-swipe-act ' + a.cls); b.type = 'button'; b.innerHTML = ICON[a.icon]; b.title = a.label; b.setAttribute('aria-label', a.label); b.onclick = e => { e.stopPropagation(); settle(0); a.run(wrap); }; tray.append(b); });
    const width = actions.length * 64;
    let x = 0, base = 0, x0 = null, y0 = 0, startX = 0, axis = null, lastT = 0, lastX = 0, v = 0;
    const paint = to => { x = to; inner.style.transform = to ? 'translate3d(' + to + 'px,0,0)' : ''; wrap.style.setProperty('--p', Math.min(1, -to / width).toFixed(3)); };
    const settle = to => { wrap.classList.remove('dragging'); wrap.classList.toggle('open', to !== 0); paint(to); base = to; };
    wrap.addEventListener('touchstart', e => { if (canSwipe && !canSwipe()) { x0 = null; return; } x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; startX = base; axis = null; lastT = 0; v = 0; }, {passive: true});
    wrap.addEventListener('touchmove', e => {
      if (x0 === null) return;
      const dx = e.touches[0].clientX - x0, dy = e.touches[0].clientY - y0;
      if (!axis && Math.hypot(dx, dy) > 6) axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';   // vertical = page scroll, leave it alone
      if (axis !== 'x') return;
      wrap.classList.add('dragging'); paint(Math.max(-width, Math.min(0, startX + dx)));
      const t = performance.now(); if (lastT) v = (x - lastX) / Math.max(1, t - lastT); lastT = t; lastX = x;
    }, {passive: true});
    wrap.addEventListener('touchend', () => { if (x0 === null) return; x0 = null; if (axis !== 'x') return; settle((v < -0.3 && x < -width * 0.2) || (x < -width * 0.5 && v <= 0.3) ? -width : 0); });
    document.addEventListener('click', e => { if (!wrap.contains(e.target) && wrap.classList.contains('open')) settle(0); });
    return wrap;
  }
  // Collapse a row smoothly before the list is redrawn without it.
  const collapse = el => new Promise(res => {
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return res();
    el.style.height = el.offsetHeight + 'px'; el.style.overflow = 'hidden'; el.getBoundingClientRect();
    el.style.transition = 'height .28s cubic-bezier(.4,0,.2,1), opacity .2s ease, margin .28s ease'; el.style.height = '0px'; el.style.opacity = '0'; el.style.marginBottom = '0px';
    setTimeout(res, 290);
  });
  // Course order: numbered lessons by their number, newest first; lessons without a number by date.
  const byCourseOrder = (a, b) => { const na = lessonNo(a.title), nb = lessonNo(b.title); return (na && nb ? nb - na : 0) || String(b.lesson_date || '').localeCompare(String(a.lesson_date || '')) || (nb || 0) - (na || 0); };
  function renderLearner(k) {
    const ls = index.filter(l => l.learner === k);
    const bySubject = new Map(); ls.forEach(l => { const s = subjectOf(l.subject); if (!bySubject.has(s)) bySubject.set(s, []); bySubject.get(s).push(l); });
    const subjects = [...bySubject.entries()].sort((a, b) => latestOf(b[1]).localeCompare(latestOf(a[1])));
    let pick = subjects.some(([n]) => n === learnerSubject) ? learnerSubject : (subjects[0] ? subjects[0][0] : '其他');
    // Header: back link, the student, a one-line summary, and the import action on the right.
    const top = make('div', 'fb-card fb-learner-head');
    const left = make('div');
    left.append(btn('fb-link', '‹ 全部学生', () => { learnerOpen = null; renderPanel(); }));
    left.append(make('h3', '', k.replace(/\//g, '、')));
    const gapsTotal = subjects.reduce((n, [, list]) => n + gapsOf(list).length, 0);
    const stat = make('div', 'fb-meta', ls.length + ' 节反馈 · 最近 ' + md(latestOf(ls)) + weekday(latestOf(ls)));
    if (gapsTotal) stat.append(make('span', 'fb-pill todo', '疑似缺 ' + gapsTotal + ' 节'));
    left.append(stat);
    const addSlot = make('div', 'fb-lesson fb-adding');
    const openAdd = slot => { if (slot.childElementCount) return; slot.append(addBox({learner: k, subject: pick, no: null, onDone: () => renderPanel(), onCancel: () => { slot.textContent = ''; }})); slot.scrollIntoView({block: 'nearest', behavior: 'smooth'}); };
    const acts = make('div', 'fb-row');
    acts.append(btn('fb-btn', '＋ 添加一节', () => openAdd(addSlot)), btn('fb-btn pri', '批量导入反馈', () => openBulk(k)));
    top.append(left, acts);
    root.append(top, addSlot);
    if (!ls.length) { root.append(make('div', 'fb-card fb-meta', '还没有反馈，点右上角「批量导入反馈」或「＋ 添加一节」。')); return; }
    const tabs = make('div', 'fb-tabs fb-subject-tabs'), list = make('div');
    root.append(tabs, list);
    const paint = () => {
      tabs.textContent = ''; list.textContent = '';
      subjects.forEach(([name, items]) => { const b = btn(name === pick ? 'on' : '', name + ' ' + items.length, () => { pick = learnerSubject = name; addSlot.textContent = ''; paint(); }); tabs.append(b); });
      const items = bySubject.get(pick), gaps = gapsOf(items), hidden = hiddenGaps(items);
      if (gaps.length || hidden.length) {
        const note = make('div', 'fb-gap');
        if (gaps.length) note.append('课次跳号，疑似缺 ' + gaps.length + ' 节（虚线行）。点虚线行导入这节反馈；老师本来就跳号的话，把鼠标移到那一行点红色按钮清除（手机上左滑）。');
        if (hidden.length) note.append(' 已标为不算缺课：' + hidden.map(n => 'L' + n).join('、') + ' ', btn('fb-link', '恢复显示', async () => {
          if (!await askConfirm('恢复缺课提示？', k.replace(/\//g, '、') + ' · ' + pick + '：' + hidden.map(n => 'L' + n).join('、') + ' 会重新显示为缺课虚线行。', '恢复')) return;
          try { await busy('正在恢复缺课提示…', () => setIgnored(k, pick, hidden, false)); flash('已恢复'); paint(); } catch (e) { flash('恢复失败：' + (e.message || e), true); }
        }));
        list.append(note);
      }
      let prev = null;   // missing lesson numbers sit where they belong, as dashed rows
      items.slice().sort(byCourseOrder).forEach(l => {
        const n = lessonNo(l.title);
        if (n && prev && prev - n > 1 && prev - n <= 20) for (let m = prev - 1; m > n; m--) if (gaps.includes(m)) list.append(missingRow(m));
        if (n) prev = n;
        const d = lessonDetails(l, () => {}), label = [subjectOf(l.subject), lessonNo(l.title) ? 'L' + lessonNo(l.title) : '', md(l.lesson_date)].filter(Boolean).join(' · ');
        list.append(swipeable(d, [
          {icon: 'paste', cls: 'blue', label: '重新导入这节课的课堂反馈', run: () => { d.open = true; d.dispatchEvent(new CustomEvent('fb-reimport')); }},
          {icon: 'trash', cls: 'red', label: '删除这节课堂反馈', run: async row => {
            if (!await askConfirm('删除这节反馈？', k.replace(/\//g, '、') + ' · ' + label + '\n删除后列表里不再显示；原文、已进词库的生词和 Notion 备份都保留，需要时可从云端恢复。', '删除', true)) return;
            try { await busy('正在删除 ' + label + '…', () => archiveLesson(l.id)); await collapse(row); flash('已删除 ' + label); renderPanel(); } catch (e) { flash('删除失败：' + (e.message || e), true); }
          }},
        ], () => !d.open));
      });
      const bottom = make('div', 'fb-lesson fb-adding');
      list.append(btn('fb-btn fb-add-bottom', '＋ 在「' + pick + '」加一节（按课次自动排进去）', () => openAdd(bottom)), bottom);
    };
    function missingRow(m) {
      const row = make('div', 'fb-lesson fb-missing'), slot = make('div', 'fb-lesson fb-adding');
      const fill = {click: () => {}};   // opened by the blue swipe button or by clicking the row
      row.append(make('span', 'vx-no none', 'L' + m), make('span', 'fb-meta', '这节反馈缺失'));
      row.title = '点一下导入这节课的课堂反馈；双指左滑可清除'; row.style.cursor = 'pointer';
      row.addEventListener('click', () => { if (!row.closest('.fb-swipe.open')) fill.onclick(); });
      const wrap = swipeable(row, [
        {icon: 'paste', cls: 'blue', label: '导入这节课的课堂反馈', run: () => fill.click()},
        {icon: 'trash', cls: 'red', label: '不算缺课（清除这一行）', run: async row => {
          if (!await askConfirm('清除 L' + m + ' 这一行？', k.replace(/\//g, '、') + ' · ' + pick + ' 的 L' + m + ' 将不再显示为缺课（老师本来就跳过了这个编号）。之后可以在上方「恢复显示」。', '清除', true)) return;
          try { await busy('正在清除 L' + m + '…', () => setIgnored(k, pick, [m], true)); await collapse(row); flash('L' + m + ' 已清除'); paint(); } catch (e) { flash('清除失败：' + (e.message || e), true); }
        }},
      ]);
      fill.onclick = fill.click = () => { wrap.replaceWith(slot); slot.append(addBox({learner: k, subject: pick, no: m, onDone: () => renderPanel(), onCancel: () => { slot.textContent = ''; slot.replaceWith(wrap); }})); };
      wrap.classList.add('slim');
      return wrap;
    }
    paint();
  }

  // ---------- 单词抽背: three editable lists per student inside the existing quiz view ----------
  const vqTab = new Map();   // student -> selected phase (presentation only)
  const curDay = () => { try { return cur; } catch { return today(); } };
  // One compact card per student: name · course · time and the existing 课前/课后 checks as text pills,
  // then the three lists as tabs with their actions, then the chosen words.
  function decorateQuiz() {
    const box = document.querySelector('#list .quiz'); if (!box) return;
    box.querySelectorAll('.qgroup').forEach(g => {
      if (g.querySelector(':scope > .vq')) return;
      const head = g.querySelector('.qhead'), rows = [...g.querySelectorAll(':scope > .qrow')];
      if (!head || !rows.length) return;   // a finished, folded student stays folded
      const student = plainName(head.childNodes[0]?.textContent || head.textContent).split(/\s/)[0];
      if (!student) return;
      g.classList.add('vq-card');
      const meta = make('div', 'vq-meta');
      rows.forEach(r => {
        const line = make('span', 'vq-session');
        line.append(make('span', '', [r.querySelector('.qcourse')?.textContent, r.querySelector('.qrange')?.textContent].filter(Boolean).join(' · ')));
        r.querySelectorAll('button.qchk').forEach(b => {
          const done = b.getAttribute('aria-pressed') === 'true', label = /pre/.test(b.id) ? '课前' : '课后';
          line.append(btn('vq-check' + (done ? ' on' : ''), (done ? '✓ ' : '') + label + (done ? '已抽' : '未抽'), () => b.click(), label + (done ? '已抽背，点一下取消' : '未抽背，点一下标记')));
        });
        meta.append(line);
      });
      head.append(meta);
      const vq = make('div', 'vq'); vq.dataset.student = student; head.after(vq);
      void fillLists(vq, student);
    });
  }
  async function fillLists(vq, student) {
    if (!vq.childElementCount) vq.append(make('div', 'vq-empty', '读取单词清单…'));
    await ready();
    if (mode !== 'cloud' && mode !== 'preview') { vq.textContent = ''; vq.append(make('div', 'vq-empty', '登录工作台后可选词和抽背')); return; }
    const day = curDay();
    let lists, learners;
    try { await lessonIndex(); lists = await getLists(day, student); learners = learnersFor(student, allLearners()); }
    catch (e) { vq.textContent = ''; vq.append(make('div', 'vq-empty', '读取失败：' + (e.message || e))); return; }
    const phase = vqTab.get(student) || '课前', items = lists[phase];
    // Repair the display of lists saved by older clients without a cloud write.
    // Supplemental pasted words keep the user's own input order.
    if (phase !== '补充') {
      try { const ordered = await feedbackOrder(items); items.splice(0, items.length, ...ordered); }
      catch (e) { vq.textContent = ''; vq.append(make('div', 'vq-empty', '读取反馈词序失败：' + (e.message || e))); return; }
    }
    const redraw = () => fillLists(vq, student), keep = () => { saveList(day, student, phase); redraw(); };
    vq.textContent = '';
    const bar = make('div', 'vq-bar'), tabs = make('div', 'vq-tabs');
    tabs.title = learners.length ? '单词库：' + learners.map(l => l.replace(/\//g, '、')).join('，') : '还没有单词库（收集反馈后自动生成）';
    ['课前', '课后', '补充'].forEach(p => tabs.append(btn(p === phase ? 'on' : '', p + ' ' + lists[p].length, () => { vqTab.set(student, p); redraw(); })));
    const actions = make('div', 'vq-actions');
    actions.append(btn('', '选词', () => openPicker(student, learners, items, keep)));
    if (phase === '课前') actions.append(btn('', '推荐', async () => { const lib = await vocabFor(learners); (await recommend(lib, learners, day, todaysCourse(student))).forEach(r => { if (!items.some(x => x.word.toLowerCase() === r.word.toLowerCase())) items.push(fromRow(r, r._from)); }); keep(); }, '推荐：今天这门课上一节的全部生词，再补错过的和到期复习的'));
    if (phase === '课后') actions.append(btn('', '本节新词', async () => {
      try {
        const lib = await vocabFor(learners);
        const lessons = (index || []).filter(l => learners.includes(l.learner) && l.lesson_date === day);
        let count = 0;
        for (const lesson of lessons) {
          // A word first learned in an earlier lesson still belongs to today's feedback.
          const rows = await rowsForLesson(lesson, lib); count += rows.length;
          rows.forEach(r => {
            const existing = items.find(x => wordKey(x.word) === wordKey(r.word));
            if (!existing) items.push(fromRow(r, lesson.id));
            else if (existing.vocab_id === r.id) existing.lesson_id = lesson.id;
          });
        }
        if (!count) { flash('今天这节的反馈还没收集，先到「课堂反馈 › 今日收集」粘贴'); return; }
        const ordered = await feedbackOrder(items); items.splice(0, items.length, ...ordered); keep();
      } catch (e) { flash('读取本节生词失败：' + (e.message || e), true); }
    }));
    bar.append(tabs, actions); vq.append(bar);
    if (phase === '补充') {
      const add = make('div', 'vq-paste'), ta = make('textarea'); ta.rows = 2; ta.placeholder = '粘贴单词，一行一个（可带中文），例如：resilient 有韧性的';
      const go = btn('', '加入', async () => {
        const lines = ta.value.split('\n').map(x => x.trim()).filter(Boolean); if (!lines.length) { ta.focus(); return; }
        const lib = await vocabFor(learners), byWord = new Map(lib.map(r => [r.word.trim().toLowerCase(), r])), unknown = [];
        lines.forEach(line => {
          const parsed = parseFeedback(line)[0] || {word: line.replace(/[一-鿿].*$/, '').trim() || line, meaning: (line.match(/[一-鿿].*$/) || [''])[0]};
          if (items.some(x => x.word.toLowerCase() === parsed.word.toLowerCase())) return;
          const hit = byWord.get(parsed.word.toLowerCase());
          if (hit) items.push(fromRow(hit)); else { const it = {word: parsed.word, meaning: parsed.meaning || '', pos: parsed.pos || ''}; items.push(it); unknown.push(it); }
        });
        if (unknown.length && learners.length) {   // new words join the student's own library so their results are kept
          try { const rows = await addVocab(learners.find(l => keyOf(l) === student) || learners[0], unknown); rows.forEach((r, i) => { unknown[i].vocab_id = r.id; unknown[i].learner = r.learner; }); } catch (e) { flash('新词未能加入单词库：' + (e.message || e), true); }
        }
        keep();
      });
      add.append(ta, go); vq.append(add);
    }
    if (items.length) {   // no word chips: one line naming the lesson, and the start button
      const ready = make('div', 'vq-ready');
      ready.append(make('span', 'vq-label', listLabel(items, phase)), make('span', 'vq-n', items.length + ' 词'),
        btn('vq-clear', '清空', () => { if (confirm('清空这个清单？（单词库里的词不受影响）')) { items.splice(0); keep(); } }),
        btn('fb-btn pri vq-start', '▶ 开始抽背', () => startQuiz(student, phase, items, redraw)));
      vq.append(ready);
    }
  }
  // "20261031-阅读L3": the lesson most of the chosen words come from (teacher's lesson number); else the list name.
  function listLabel(items, phase) {
    const counts = new Map(); items.forEach(it => { if (it.lesson_id) counts.set(it.lesson_id, (counts.get(it.lesson_id) || 0) + 1); });
    const main = [...counts.entries()].sort((a, b) => b[1] - a[1])[0], l = main && (index || []).find(x => x.id === main[0]);
    if (!l) return phase === '补充' ? '补充单词' : phase + '单词';
    const no = lessonNo(l.title), many = counts.size > 1;
    return (l.lesson_date || '').replace(/-/g, '') + '-' + subjectOf(l.subject) + (no ? 'L' + no : '') + (many ? ' 等 ' + counts.size + ' 节' : '');
  }
  const fromRow = (r, from) => ({vocab_id: r.id, learner: r.learner, word: r.word, meaning: r.meaning || '', pos: r.pos || '', extra: r.extra || '', wrong: (r.wrong_count || 0) > 0, lesson_id: from || r.lesson_id || null, subject: r.subject || ''});
  // Today's course for this student, from the published schedule (e.g. "阅读").
  const todaysCourse = student => { try { const r = quizRows([]).find(x => plainName(x[0]) === student); return r ? r[2] || '' : ''; } catch { return ''; } };
  // The previous lesson's own word list first, then words answered wrong, then words due for review.
  async function recommend(lib, learners, day, course, limit = 20) {
    const before = (index || []).filter(l => learners.includes(l.learner) && l.lesson_date && l.lesson_date < day).sort((a, b) => b.lesson_date.localeCompare(a.lesson_date));
    const want = course ? subjectOf(course) : '';
    const prev = (want && before.find(l => subjectOf(l.subject) === want)) || before[0];   // the last lesson of today's subject first
    const last = prev ? await rowsForLesson(prev, lib) : [];
    const seen = new Set(last.map(r => r.id));
    const rest = lib.filter(r => !seen.has(r.id) && (r.last_result === 'wrong' || (r.due_date && r.due_date <= day)))
      .sort((a, b) => (a.last_result === 'wrong' ? 0 : 1) - (b.last_result === 'wrong' ? 0 : 1) || (b.wrong_count || 0) - (a.wrong_count || 0));
    return [...last.map(r => ({...r, _from: prev.id})), ...rest].slice(0, Math.max(limit, last.length));
  }
  function editItem(it, done) {
    const o = overlay('修改单词'), word = make('input'), meaning = make('input');
    [word, meaning].forEach(i => { i.type = 'text'; i.className = 'fb-search'; i.style.width = '100%'; i.style.marginBottom = '8px'; });
    word.value = it.word; meaning.value = it.meaning || '';
    o.body.append(make('div', 'fb-meta', '单词'), word, make('div', 'fb-meta', '中文'), meaning,
      make('div', 'fb-meta', it.vocab_id ? '保存后单词库里这个词也会一起改。' : '这个词不在单词库里，只改这份清单。'));
    o.foot.append(btn('fb-btn pri', '保存', async () => {
      const patch = {word: word.value.trim() || it.word, meaning: meaning.value.trim()};
      Object.assign(it, patch);
      if (it.vocab_id) { try { await updateVocab(it.vocab_id, patch); if (it.learner) dropVocabCache(it.learner); } catch (e) { flash('单词库未能更新：' + (e.message || e), true); } }
      o.close(); done();
    }), btn('fb-btn', '取消', () => o.close()));
    word.focus();
  }
  async function openPicker(student, learners, items, done) {
    const o = overlay('选抽背单词 · ' + student);
    o.body.append(make('div', 'vq-empty', '读取单词库…'));
    let lib = [];
    try { await lessonIndex(); lib = await vocabFor(learners); } catch (e) { o.body.textContent = '读取失败：' + (e.message || e); return; }
    o.body.textContent = '';
    if (!lib.length) { o.body.append(make('div', 'vq-empty', '这个学生还没有单词库。到「课堂反馈」收集反馈后会自动生成。')); return; }
    const chosen = new Set(items.filter(x => x.vocab_id).map(x => x.vocab_id)), chosenFrom = new Map();
    const count = make('span', 'fb-meta'), recount = () => { count.textContent = '已选 ' + chosen.size; };
    let mode = 'lesson', filter = 'all', subject = '';
    const modes = make('div', 'fb-tabs'); modes.style.marginBottom = '10px';
    const search = make('input'); search.type = 'search'; search.className = 'fb-search'; search.style.width = '100%'; search.style.marginBottom = '8px';
    const subjects = [...new Set(lib.map(r => subjectOf(r.subject)))];
    const sel = make('select'); sel.className = 'fb-search'; [['', '全部学科'], ...subjects.map(x => [x, x])].forEach(([v, t]) => { const op = make('option', '', t); op.value = v; sel.append(op); }); sel.onchange = () => { subject = sel.value; paint(); };
    const filters = make('div', 'vx-filters'), list = make('div');
    o.body.append(modes, search, filters, list);
    const wordRow = (r, from) => {
      const row = make('label', 'vx-row'), cb = make('input'); cb.type = 'checkbox'; cb.checked = chosen.has(r.id); cb.dataset.id = r.id;
      cb.onchange = () => { if (cb.checked) { chosen.add(r.id); if (from) chosenFrom.set(r.id, from); } else chosen.delete(r.id); recount(); row.dispatchEvent(new Event('wordchange', {bubbles: true})); };
      const mid = make('div'), w = make('b', '', r.word); if (r.pos) w.append(make('small', 'pos', ' ' + r.pos)); mid.append(w, make('div', 'm', r.meaning || ''));
      row.append(cb, mid, make('span', 'x' + ((r.wrong_count || 0) > 0 ? ' bad' : ''), (r.wrong_count || 0) > 0 ? '错过 ' + r.wrong_count + ' 次' : ''));
      return row;
    };
    // One lesson = the words written in that lesson's feedback (parsed from its text), matched to the library.
    const lessonWordCache = new Map();
    async function wordsOf(l) {
      if (l.pseudo) return l.rows;
      if (lessonWordCache.has(l.id)) return lessonWordCache.get(l.id);
      const rows = await rowsForLesson(l, lib);
      const firstSeen = lib.filter(r => r.lesson_id === l.id && !rows.includes(r));
      const all = [...rows, ...firstSeen]; lessonWordCache.set(l.id, all); return all;
    }
    function lessonBlock(l) {
      const d = make('details', 'fb-lesson'), sum = make('summary'), cb = make('input'); cb.type = 'checkbox';
      cb.setAttribute('aria-label', '整节全选');
      // 一眼看出是哪节课：左边课次徽章，右边日期星期 + 词数；学生名不重复写，只有班课文件夹的课才标「班课」。
      const no = lessonNo(l.title);
      const badge = make('span', 'vx-no' + (l.pseudo ? ' vx-quiz' : no ? '' : ' none'), l.pseudo ? '抽背' : no ? 'L' + no : '—');
      const info = make('span', 'vx-info'), when = make('span', 'vx-when', md(l.lesson_date));
      if (l.lesson_date) when.append(make('small', '', ' 周' + '日一二三四五六'[new Date(l.lesson_date + 'T12:00:00').getDay()]));
      const n = make('small', 'vx-sub', '');
      info.append(when, n);
      const tags = make('span', 'vx-tags');
      if (!l.pseudo && parts(l.learner).length > 1) tags.append(make('span', 'fb-pill', '班课'));
      if (l.pseudo) tags.append(make('span', 'fb-pill todo', '反馈缺失'));
      sum.append(cb, badge, info, tags); d.append(sum);
      const body = make('div'); body.style.padding = '0 12px 10px'; d.append(body);
      if (l.pseudo) d.classList.add('fb-orphan');
      const sync = ws => { const k = ws.filter(r => chosen.has(r.id)).length; cb.checked = ws.length > 0 && k === ws.length; cb.indeterminate = k > 0 && k < ws.length; n.textContent = ws.length + ' 词' + (k ? ' · 已选 ' + k : ''); };
      const known = l.pseudo ? l.rows : lessonWordCache.get(l.id); if (known) sync(known); else { const first = lib.filter(r => r.lesson_id === l.id).length; n.textContent = first ? first + ' 个新词' : '展开查看'; }
      cb.addEventListener('click', e => e.stopPropagation());
      cb.onchange = async () => { const ws = await wordsOf(l); ws.forEach(r => { if (cb.checked) { chosen.add(r.id); if (!l.pseudo) chosenFrom.set(r.id, l.id); } else chosen.delete(r.id); }); recount(); sync(ws); body.querySelectorAll('input[data-id]').forEach(i => { i.checked = chosen.has(i.dataset.id); }); };
      d.addEventListener('toggle', async () => {
        if (!d.open || body.dataset.loaded) return;
        body.append(make('div', 'vq-empty', '读取这节课的生词…'));
        try { const ws = await wordsOf(l); body.textContent = ''; body.dataset.loaded = '1'; if (!ws.length) body.append(make('div', 'vq-empty', '这节课的反馈里没有识别到生词')); ws.forEach(r => body.append(wordRow(r, l.pseudo ? null : l.id))); sync(ws); }
        catch (e) { body.textContent = '读取失败：' + (e.message || e); }
      });
      body.addEventListener('wordchange', () => sync(lessonWordCache.get(l.id) || []));
      return d;
    }
    const paint = () => {
      modes.textContent = '';
      [['lesson', '按课选'], ['all', '全部单词']].forEach(([k, t]) => modes.append(btn(mode === k ? 'on' : '', t, () => { mode = k; search.value = ''; paint(); })));
      filters.textContent = ''; list.textContent = '';
      const q = search.value.trim().toLowerCase(), day = curDay();
      if (mode === 'lesson') {
        search.placeholder = '搜索课程标题或日期（如 L53、10/22）';
        // Grouped by subject like the feedback page; the subject of the latest lesson opens first.
        // Words known only from a quiz record (that lesson's feedback is missing) appear as one block per quiz date.
        const orphans = new Map();
        lib.filter(r => !r.lesson_id).forEach(r => { const k = r.learner + '|' + subjectOf(r.subject) + '|' + (r.lesson_date || ''); if (!orphans.has(k)) orphans.set(k, {id: 'quiz:' + k, pseudo: true, learner: r.learner, subject: r.subject, lesson_date: r.lesson_date, title: '', rows: []}); orphans.get(k).rows.push(r); });
        const lessons = [...index.filter(l => learners.includes(l.learner)), ...orphans.values()]
          .filter(l => !q || String(l.title || '').toLowerCase().includes(q) || md(l.lesson_date).includes(q) || String(l.subject || '').includes(q))
          .sort((a, b) => String(b.lesson_date || '').localeCompare(String(a.lesson_date || '')));
        if (!lessons.length) { list.append(make('div', 'vq-empty', '没有符合的课')); return; }
        const groups = new Map(); lessons.forEach(l => { const k = subjectOf(l.subject); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(l); });
        [...groups.entries()].forEach(([name, ls], gi) => {
          const box = make('details', 'fb-subject'); box.open = gi === 0 || !!q;
          const sum = make('summary'); sum.append(document.createTextNode(name), make('span', 'fb-pill', ls.length + ' 节')); box.append(sum);
          const fill = () => { if (box.dataset.filled) return; box.dataset.filled = '1'; ls.slice(0, 80).forEach(l => box.append(lessonBlock(l))); if (ls.length > 80) box.append(make('div', 'vq-empty', '只显示最近 80 节，可以搜索课次或日期')); };
          if (box.open) fill(); box.addEventListener('toggle', () => { if (box.open) fill(); });
          list.append(box);
        });
        return;
      }
      search.placeholder = '搜索单词或中文';
      const fbtn = (k, label) => btn('fb-btn' + (filter === k ? ' on' : ''), label, () => { filter = k; paint(); });
      filters.append(fbtn('all', '全部 ' + lib.length), fbtn('wrong', '错过的'), fbtn('due', '到期复习'), sel);
      const rows = lib.filter(r => (!q || r.word.toLowerCase().includes(q) || String(r.meaning || '').includes(q)) && (!subject || subjectOf(r.subject) === subject)
        && (filter === 'all' || (filter === 'wrong' && (r.wrong_count || 0) > 0) || (filter === 'due' && r.due_date && r.due_date <= day)));
      rows.slice(0, 400).forEach(r => list.append(wordRow(r)));
      if (rows.length > 400) list.append(make('div', 'vq-empty', '只显示前 400 个，搜索可以缩小范围'));
      if (!rows.length) list.append(make('div', 'vq-empty', '没有符合的单词'));
    };
    search.oninput = paint; paint(); recount();
    o.foot.append(count, btn('fb-btn pri', '加入清单', async () => {
      const keep = items.filter(x => !x.vocab_id || chosen.has(x.vocab_id));
      const have = new Set(keep.map(x => x.vocab_id).filter(Boolean));
      const byId = new Map(lib.map(r => [r.id, r]));
      const added = [...chosen].filter(id => !have.has(id) && byId.has(id)).map(id => fromRow(byId.get(id), chosenFrom.get(id)));
      try { keep.push(...await feedbackOrder(added)); }
      catch (e) { flash('读取反馈词序失败：' + (e.message || e), true); return; }
      items.splice(0, items.length, ...keep); o.close(); done();
    }), btn('fb-btn', '取消', () => o.close()));
  }

  // ---------- Quiz ----------
  // A scrolling list: read the Chinese (or English), tap ✗ on the ones the student gets wrong, then 完成.
  // Unmarked rows count as right. Results are saved once, on 完成.
  function startQuiz(student, phase, items, done) {
    const marks = new Map();   // index -> {result: 'right'|'wrong', reason}
    let hide = localStorage.getItem('wayon-vocab-hide') || 'none';
    const o = overlay(student + ' · ' + phase + '抽背 · ' + items.length + ' 词');
    const tools = make('div', 'fb-tabs vx-hide');
    const paintTools = () => { tools.textContent = ''; [['none', '都显示'], ['en', '遮英文'], ['zh', '遮中文']].forEach(([k, t]) => tools.append(btn(hide === k ? 'on' : '', t, () => { hide = k; try { localStorage.setItem('wayon-vocab-hide', k); } catch {} paintTools(); list.dataset.hide = k; }))); };
    o.head.insertBefore(tools, o.head.querySelector('.vx-close'));
    const allRight = btn('fb-btn vx-allright', '✅ 全对', () => { items.forEach((_, i) => { if (!marks.has(i)) marks.set(i, {result: 'right'}); }); painters.forEach(p => p()); recount(); }, '没标的全部标为答对');
    o.head.insertBefore(allRight, tools);
    const list = make('div', 'vx-list'); list.dataset.hide = hide; o.body.append(list);
    const tally = make('span', 'fb-meta'), painters = [];
    const recount = () => {
      const w = [...marks.values()].filter(m => m.result === 'wrong').length, r = [...marks.values()].filter(m => m.result === 'right').length, left = items.length - w - r;
      tally.textContent = '✅ ' + r + ' · ❌ ' + w + (left ? ' · 未标 ' + left + '（算对）' : '');
    };
    items.forEach((it, i) => {
      const row = make('div', 'vx-q' + (it.wrong ? ' was-wrong' : ''));
      const no = make('span', 'vx-no', String(i + 1));
      const text = make('div', 'vx-text');
      const en = make('div', 'vx-en'); en.append(make('b', '', it.word)); if (it.pos) en.append(make('small', '', ' ' + it.pos));
      const zh = make('div', 'vx-zh', it.meaning || '（没有中文）');
      text.append(en, zh);
      const ok = btn('vx-ok', '✓', () => { if (marks.get(i)?.result === 'right') marks.delete(i); else marks.set(i, {result: 'right'}); paintRow(); recount(); }, '答对：' + it.word);
      const x = btn('vx-x', '✗', () => { if (marks.get(i)?.result === 'wrong') marks.delete(i); else marks.set(i, {result: 'wrong', reason: ''}); paintRow(); recount(); }, '答错：' + it.word);
      const reasons = make('div', 'vx-why');
      const paintRow = () => {
        const m = marks.get(i);
        row.classList.toggle('wrong', m?.result === 'wrong'); row.classList.toggle('right', m?.result === 'right');
        ok.setAttribute('aria-pressed', String(m?.result === 'right')); x.setAttribute('aria-pressed', String(m?.result === 'wrong'));
        reasons.textContent = '';
        if (m?.result === 'wrong') ['拼写', '意思', '发音'].forEach(r => reasons.append(btn(m.reason === r ? 'on' : '', r, () => { m.reason = m.reason === r ? '' : r; paintRow(); })));
      };
      painters.push(paintRow);
      text.onclick = () => row.classList.toggle('peek');
      row.append(no, text, ok, x, reasons); list.append(row); paintRow();
    });
    paintTools(); recount();
    o.foot.append(tally, btn('fb-btn pri', '完成并保存', () => finish()), btn('fb-btn', '取消', () => { if (!marks.size || confirm('不保存这次抽背结果？')) o.close(); }));
    async function finish() {
      const session = uuid(), day = today(), now = new Date().toISOString(), failed = [];
      o.foot.querySelectorAll('button').forEach(b => { b.disabled = true; }); tally.textContent = '保存中…';
      for (let i = 0; i < items.length; i++) {
        const it = items[i], result = marks.get(i)?.result === 'wrong' ? 'wrong' : 'right', reason = marks.get(i)?.reason || null;
        it.wrong = result === 'wrong';
        if (!it.vocab_id) continue;
        try {
          const lib = (await vocabFor([it.learner])).find(r => r.id === it.vocab_id) || {};
          const box = result === 'right' ? Math.min((lib.box || 0) + 1, 5) : 1;
          const patch = {box, due_date: addDays(day, result === 'right' ? INTERVALS[box - 1] : 1), last_result: result, last_quizzed_at: now,
            right_count: (lib.right_count || 0) + (result === 'right' ? 1 : 0), wrong_count: (lib.wrong_count || 0) + (result === 'wrong' ? 1 : 0)};
          Object.assign(lib, patch);
          await updateVocab(it.vocab_id, patch);
          await addReview({vocab_id: it.vocab_id, learner: it.learner, student, result, reason, direction: hide === 'zh' ? 'en-zh' : 'zh-en', phase: phase === '补充' ? '其他' : phase, session_id: session});
        } catch (e) { failed.push(it.word); }
      }
      const wrong = items.filter((_, i) => marks.get(i)?.result === 'wrong'), right = items.length - wrong.length;
      // "陈书进_阅读L3_11/7" (student_course+lesson no_quiz date), then every word with ✅ / ❌ (+ reason) as marked.
      const counts = new Map(); items.forEach(it => { if (it.lesson_id) counts.set(it.lesson_id, (counts.get(it.lesson_id) || 0) + 1); });
      const main = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      const lesson = main && (index || []).find(l => l.id === main[0]);
      const course = lesson ? subjectOf(lesson.subject) : (subjectOf(todaysCourse(student)) || phase), courseNo = lesson ? lessonNo(lesson.title) : null;
      const short = {拼写: '拼', 意思: '意', 发音: '音'};
      const text = [lessonLabel(student, course, courseNo, day) + '抽背情况👇', '', ...items.map((it, i) => it.word + (it.pos ? ' ' + it.pos + '.' : '') + (it.meaning ? ' ' + it.meaning : '') + (marks.get(i)?.result === 'wrong' ? '❌' + (short[marks.get(i).reason] || '') : marks.get(i)?.result === 'right' ? '✅' : ''))].join('\n');
      markChecked(student, phase);
      list.textContent = ''; o.foot.textContent = '';
      const sum = make('div', 'vx-summary'); sum.append(make('div', 'vx-score', right + ' / ' + items.length), make('pre', '', text));
      if (failed.length) sum.append(make('div', 'fb-gap', '这些词的结果没存上，请稍后重抽：' + failed.join('、')));
      list.append(sum);
      o.foot.append(btn('fb-btn pri', '复制结果', async () => { try { await navigator.clipboard.writeText(text); flash('已复制'); } catch { flash('复制失败，请手动选中文字复制', true); } }),
        btn('fb-btn', '错的再抽一遍', () => { if (!wrong.length) return; o.close(); startQuiz(student, phase, wrong, done); }),
        btn('fb-btn', '完成', () => { o.close(); done(); }));
    }
  }
  // Tick the existing 课前/课后 check for this student once a quiz is finished.
  function markChecked(student, phase) {
    const k = phase === '课前' ? 'pre' : phase === '课后' ? 'post' : '';
    if (!k || typeof quizRows !== 'function' || typeof qget !== 'function' || typeof qk !== 'function') return;
    try {
      const row = quizRows([]).find(r => plainName(r[0]) === student); if (!row) return;
      const q = qget(qk(row)); if (!q[k]) { q[k] = true; qsave(); render(); }
    } catch {}
  }

  // ---------- Sidebar button and mounting ----------
  function close() { open = false; if (root) root.hidden = true; delete document.body.dataset.feedbackOpen; const b = document.getElementById('nav-feedback'); b?.classList.remove('on'); b?.setAttribute('aria-pressed', 'false'); }
  function mount() {
    const tabs = document.getElementById('tabs'), list = document.getElementById('list');
    if (tabs && list) {
      if (!root) { root = make('section'); root.id = 'feedback-panel'; root.hidden = !open; root.setAttribute('aria-label', '课堂反馈'); list.before(root); }
      const notice = list.parentNode && [...list.parentNode.children].find(e => e.classList.contains('wayon-sync-notice'));
      if (notice && root.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING) notice.after(root);
      if (!document.getElementById('nav-feedback')) {
        const b = make('button', 'wayon-icon-control'); b.id = 'nav-feedback'; b.type = 'button'; b.title = '课堂反馈'; b.setAttribute('aria-label', '课堂反馈'); b.setAttribute('aria-pressed', 'false');
        b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5 M8 8h8 M8 12h5"/></svg>';
        b.onclick = () => { open = true; document.body.dataset.feedbackOpen = 'true'; root.hidden = false; b.classList.add('on'); b.setAttribute('aria-pressed', 'true'); renderPanel(); };
        const memo = document.getElementById('nav-memo'); if (memo) memo.before(b); else tabs.append(b);
      }
    }
    decorateQuiz();
  }
  function start() {
    mount();
    document.addEventListener('click', e => { const nav = e.target.closest?.('#tabs button'); if (open && nav && nav.id !== 'nav-feedback') close(); }, true);
    new MutationObserver(mount).observe(document.body, {childList: true, subtree: true});
    let tries = 0; const wait = setInterval(() => { if (client() || ++tries > 60) { clearInterval(wait); mode = 'pending'; if (open) renderPanel(); document.querySelectorAll('.vq').forEach(v => fillLists(v, v.dataset.student)); } }, 1000);
  }
  globalThis.wayonVocab = {parseFeedback, lessonNo, subjectOf, learnersFor};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true}); else start();
})();
