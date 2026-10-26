// Optimistic catalog writes and verified readback; no business execution here.
export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}

export async function saveCatalog(client, owner, base, payload) {
  const { data, error } = await client.from('wayon_rule_catalog')
    .update({ payload, revision: base.revision + 1 })
    .eq('owner_id', owner).eq('revision', base.revision)
    .select('revision').maybeSingle();
  if (error) throw Error('SAVE_FAILED');
  if (!data) throw Error('CONFLICT');
  const read = await client.from('wayon_rule_catalog').select('revision,payload').eq('owner_id', owner).single();
  if (read.error || !read.data || read.data.revision !== base.revision + 1 || canonical(read.data.payload) !== canonical(payload)) throw Error('READBACK_FAILED');
  return read.data;
}

export function inferStudentSystem(name, rule, text) {
  if (rule?.system) return rule.system;
  const value = String(text || '') + ' ' + String(rule?.['课程'] || '');
  if (/SAT/i.test(value)) return 'sat';
  if (/托福|TOEFL/i.test(value)) return 'toefl';
  if (/雅思|IELTS|王陆|真经/.test(value)) return 'ielts';
  return 'other';
}

export const MULTI_CLASS_SPECS = [];
