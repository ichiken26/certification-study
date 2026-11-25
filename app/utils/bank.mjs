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
    const [rawAnswer,stem,explanation,...extra]=line.split('|').map(s=>s.trim())
    const multi=rawAnswer==='@multi'
    const written=rawAnswer==='@written'
    const decode=s=>s.replace(/\\n/g,'\n')
    if(!chapter || !rawAnswer || !stem || !explanation || (written ? extra.length!==1 || !extra[0] : multi ? extra.length<9 || extra.length>13 || extra.length%2!==1 : extra.length!==0 && extra.length!==6)) throw new Error('Invalid bank row: '+exam+' '+line)
    let answer=rawAnswer
    let explicit=null
    if(written){
      answer=decode(extra[0])
    }else if(multi){
      const keys=extra[0].split(',').map(Number)
      const optionCount=(extra.length-1)/2
      if(new Set(keys).size!==keys.length || keys.length<2 || keys.length>=optionCount || keys.some(n=>!Number.isInteger(n)||n<1||n>optionCount)) throw new Error('Invalid multiple answers: '+stem)
      explicit=Array.from({length:optionCount},(_,i)=>({label:extra[i*2+1],explanation:extra[i*2+2],correct:keys.includes(i+1)}))
      answer=explicit.filter(o=>o.correct).map(o=>o.label).join(' / ')
    }else if(extra.length){
      explicit=[{label:answer,explanation,correct:true},...Array.from({length:3},(_,i)=>({label:extra[i*2],explanation:extra[i*2+1],correct:false}))]
    }
    if(explicit && (new Set(explicit.map(o=>o.label)).size!==explicit.length || explicit.some(o=>!o.label||!o.explanation))) throw new Error('Invalid explicit options: '+stem)
    let h=2166136261
    for(const c of chapter+'\n'+stem) h=Math.imul(h^c.charCodeAt(0),16777619)
    questions.push({id:exam+'-'+(h>>>0).toString(16),exam,chapter,topic,stem:decode(stem),answer,explanation:decode(explanation),explicit,kind:written?'written':'choice'})
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
  if(q.kind==='written') return []
  const correct={label:q.answer,explanation:q.explanation,correct:true}
  if(q.explicit) return shuffle(q.explicit,random)
  const candidates=[...shuffle(bank.filter(x=>x.kind!=='written' && !x.explicit && x.chapter===q.chapter && x.topic===q.topic),random),...shuffle(bank.filter(x=>x.kind!=='written' && !x.explicit && x.chapter===q.chapter),random),...shuffle(bank.filter(x=>x.kind!=='written' && !x.explicit),random)]
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
