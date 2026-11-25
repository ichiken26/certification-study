import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile,readdir } from 'node:fs/promises'
import { parseBank,makeOptions,selectSession,recordAnswer } from '../app/utils/bank.mjs'
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
