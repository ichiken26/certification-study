import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile,readdir } from 'node:fs/promises'
import { parseBank,makeOptions,selectSession,recordAnswer,createTimedSession,timedItemCorrect,scoreTimedSession } from '../app/utils/bank.mjs'
const names=(await readdir(new URL('../app/data/',import.meta.url))).filter(n=>n.endsWith('.txt'))
const banks=new Map()
for(const name of names){
  const exam=name.replace(/--.*\.txt$|\.txt$/,'')
  const bank=parseBank(await readFile(new URL('../app/data/'+name,import.meta.url),'utf8'),exam)
  banks.set(exam,[...(banks.get(exam)||[]),...bank])
}
for(const [exam,bank] of banks) test(exam+' bank validation',()=>{
  assert.equal(new Set(bank.map(q=>q.id)).size,bank.length)
  for(const q of bank){
    const opts=makeOptions(q,bank)
    if(q.kind==='written'){assert.equal(opts.length,0);assert.ok(q.answer&&q.explanation);continue}
    assert.equal(opts.length,q.explicit?.length||4)
    assert.equal(new Set(opts.map(o=>o.label)).size,opts.length)
    assert.equal(opts.filter(o=>o.correct).length,q.explicit?q.explicit.filter(o=>o.correct).length:1)
    assert.ok(opts.filter(o=>o.correct).length>=1 && opts.filter(o=>o.correct).length<opts.length)
    assert.ok(opts.every(o=>o.explanation))
  }
  const first=bank[0]
  const history=recordAnswer({},first.id,false)
  assert.equal(selectSession(bank,history,'wrong',10)[0].id,first.id)
  assert.ok(!selectSession(bank,history,'new',10).some(q=>q.id===first.id))
  assert.equal(recordAnswer(history,first.id,true)[first.id].streak,1)
})

test('written and multiline cases',()=>{
  const q=parseBank('# Written / case\n@written|状況\\n問い|基準\\n詳細|模範解答','test')[0]
  assert.equal(q.kind,'written');assert.equal(q.stem,'状況\n問い');assert.equal(q.explanation,'基準\n詳細');assert.equal(q.answer,'模範解答');assert.deepEqual(makeOptions(q,[q]),[])
  assert.throws(()=>parseBank('# Written\n@written|問い|基準','test'))
})

test('five and six option multi-select',()=>{
  for(const n of [5,6]){
    const options=Array.from({length:n},(_,i)=>['Option '+(i+1),'Reason '+(i+1)]).flat()
    const q=parseBank('# Domain\n'+['@multi','Question','Summary','1,5',...options].join('|'),'test')[0]
    const choices=makeOptions(q,[q]);assert.equal(choices.length,n);assert.deepEqual(choices.filter(o=>o.correct).map(o=>o.label).sort(),['Option 1','Option 5'])
  }
})

test('timed practice preserves choices, scores once, treats skipped as wrong',()=>{
  const bank=banks.get('aws-saa')
  const session=createTimedSession(bank,'aws-saa',5,15,1000,()=>0.42)
  assert.equal(session.items.length,5)
  assert.equal(session.deadline,901000)
  assert.equal(new Set(session.items.map(i=>i.id)).size,5)
  session.items[0].selected=session.items[0].choices.flatMap((o,i)=>o.correct?[i]:[])
  assert.equal(timedItemCorrect(session.items[0]),true)
  const result=scoreTimedSession(session,{})
  assert.equal(result.session.correct,1)
  assert.equal(result.session.completed,true)
  assert.equal(Object.keys(result.history).length,5)
  assert.equal(result.history[session.items[1].id].lastCorrect,false)
  assert.deepEqual(scoreTimedSession(result.session,result.history),result)
})


test('independent SAA mock set is separate and has the intended domain distribution',async()=>{
  const raw=await readFile(new URL('../app/mock-data/aws-saa--01.txt',import.meta.url),'utf8')
  const mock=parseBank(raw,'aws-saa--01-mock')
  assert.equal(mock.length,65)
  const normal=banks.get('aws-saa')
  const normalIds=new Set(normal.map(q=>q.id)),normalStems=new Set(normal.map(q=>q.stem.normalize('NFKC').replace(/\s+/g,'')))
  assert.equal(new Set(mock.map(q=>q.id)).size,65)
  const counts={}
  for(const q of mock){
    assert.equal(q.kind,'choice');assert.ok(q.explicit);assert.ok(!normalIds.has(q.id));assert.ok(!normalStems.has(q.stem.normalize('NFKC').replace(/\s+/g,'')))
    const domain=q.chapter.slice(0,2);counts[domain]=(counts[domain]||0)+1
    const opts=makeOptions(q,mock);assert.ok(opts.length>=4);assert.equal(new Set(opts.map(o=>o.label)).size,opts.length);assert.ok(opts.every(o=>o.explanation));assert.ok(opts.some(o=>o.correct)&&opts.some(o=>!o.correct))
  }
  assert.deepEqual(counts,{'01':20,'02':17,'03':15,'04':13})
  assert.equal(createTimedSession(mock,'aws-saa',65,130,1000).items.length,65)
})
