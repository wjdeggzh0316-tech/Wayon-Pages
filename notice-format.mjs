// Presentation only: never changes schedule IDs, delivery records or copy state.
export function noticeDisplayFields(content, label, student) {
  let course=String(content||''), name=String(student||'').replace(/[【】「」]/g,'').trim();
  const trial=/(雅思|托福|SAT|GRE|英语)(?:听力|阅读|口语|写作)?(体验课|试听课)$/i;
  const match=String(label||'').replace(/[【】「」]/g,'').trim().match(trial)||name.match(trial);
  if(match){
    const system=/^(SAT|GRE)$/i.test(match[1])?match[1].toUpperCase():match[1], kind=match[2];
    if(!course.toUpperCase().startsWith(system.toUpperCase()))course=system+course;
    if(!/(体验课|试听课)$/.test(course))course+=kind;
    const suffix=name.match(trial);
    if(suffix&&name.slice(0,suffix.index).replace(/[ _-]+$/,''))
      name=name.slice(0,suffix.index).replace(/[ _-]+$/,'');
  }
  return [course,name];
}
export function formatNoticeRows(rows) {
  if(!Array.isArray(rows))return rows;
  return rows.map(row=>{
    if(!Array.isArray(row)||typeof row[2]!=='string')return row;
    const text=row[2], course=text.match(/^课程：[ \t]*(.*)$/m), person=text.match(/^学生：[ \t]*(.*)$/m);
    if(!course||!person)return row;
    const [subject,name]=noticeDisplayFields(course[1],row[0],person[1]);
    if(subject===course[1]&&name===person[1])return row;
    const result=row.slice();result[2]=text.replace(/^课程：[^\n]*$/m,'课程： '+subject).replace(/^学生：[^\n]*$/m,'学生： '+name);return result;
  });
}
