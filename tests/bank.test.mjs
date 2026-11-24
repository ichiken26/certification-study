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
    assert.equal(opts.length,4)
    assert.equal(new Set(opts.map(o=>o.label)).size,4)
    assert.equal(opts.filter(o=>o.correct).length,q.explicit?q.explicit.filter(o=>o.correct).length:1)
    assert.ok(opts.filter(o=>o.correct).length>=1 && opts.filter(o=>o.correct).length<=3)
    assert.ok(opts.every(o=>o.explanation))
  }
  const first=bank[0]
  const history=recordAnswer({},first.id,false)
  assert.equal(selectSession(bank,history,'wrong',10)[0].id,first.id)
  assert.ok(!selectSession(bank,history,'new',10).some(q=>q.id===first.id))
  assert.equal(recordAnswer(history,first.id,true)[first.id].streak,1)
})
