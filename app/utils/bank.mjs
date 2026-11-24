// Bank format: heading, then answer|scenario|explanation. Explicit choices use five extra fields.
export function parseBank(raw, exam) {
  let chapter='', topic=''
  const questions=[]
  for(const input of raw.split(/\r?\n/)) {
    const line=input.trim()
    if(!line) continue
    if(line.startsWith('# ')) {
      const parts=line.slice(2).split(' / ')
      chapter=parts[0]; topic=parts[1] || chapter
      continue
    }
    const [answer,stem,explanation,...extra]=line.split('|').map(s=>s.trim())
    if(!chapter || !answer || !stem || !explanation || (extra.length && extra.length!==6)) throw new Error('Invalid bank row: '+exam+' '+line)
    let h=2166136261
    for(const c of chapter+'\n'+stem) h=Math.imul(h^c.charCodeAt(0),16777619)
    const explicit=extra.length ? [{label:extra[0],explanation:extra[1]},{label:extra[2],explanation:extra[3]},{label:extra[4],explanation:extra[5]}] : null
    questions.push({id:exam+'-'+(h>>>0).toString(16),exam,chapter,topic,stem,answer,explanation,explicit})
  }
  const ids=new Set(questions.map(q=>q.id))
  if(ids.size!==questions.length) throw new Error('Duplicate question ID in '+exam)
  return questions
}
export function shuffle(items,random=Math.random) {
  const result=[...items]
  for(let i=result.length-1;i>0;i--) {
    const j=Math.floor(random()*(i+1)); [result[i],result[j]]=[result[j],result[i]]
  }
  return result
}
export function makeOptions(q,bank,random=Math.random) {
  const correct={label:q.answer,explanation:q.explanation,correct:true}
  if(q.explicit) return shuffle([correct,...q.explicit.map(x=>({...x,correct:false}))],random)
  const candidates=[...shuffle(bank.filter(x=>x.chapter===q.chapter && x.topic===q.topic),random),...shuffle(bank.filter(x=>x.chapter===q.chapter),random),...shuffle(bank,random)]
  const options=[correct]
  for(const other of candidates) {
    if(options.some(x=>x.label===other.answer)) continue
    options.push({label:other.answer,explanation:other.explanation,correct:false})
    if(options.length===4) break
  }
  if(options.length!==4) throw new Error('Insufficient choices: '+q.id)
  return shuffle(options,random)
}
export function selectSession(bank,history,mode,count,chapter,random=Math.random) {
  const pool=bank.filter(q=>(!chapter||q.chapter===chapter) && (mode!=='wrong'||history[q.id]?.lastCorrect===false))
  if(mode==='new') {
    const untouched=pool.filter(q=>!history[q.id])
    return untouched.slice(0,count)
  }
  return shuffle(pool,random).slice(0,count)
}
export function recordAnswer(history,id,correct) {
  const old=history[id]||{attempts:0,correct:0,streak:0}
  return {...history,[id]:{attempts:old.attempts+1,correct:old.correct+Number(correct),streak:correct?old.streak+1:0,lastCorrect:correct,updatedAt:new Date().toISOString()}}
}
