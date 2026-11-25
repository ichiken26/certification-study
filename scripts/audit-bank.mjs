import {readFile,readdir} from 'node:fs/promises'
import {parseBank} from '../app/utils/bank.mjs'
const catalog=await readFile(new URL('../app/utils/catalog.ts',import.meta.url),'utf8')
const targets=JSON.parse(catalog.match(/targetQuestions:\(\s*(\{[^}]+\})\s+as Record/)[1])
const files=await readdir(new URL('../app/data/',import.meta.url))
const rows=[]
for(const [exam,target] of Object.entries(targets)){
  const bank=[]
  for(const name of files.filter(n=>n===exam+'.txt'||n.startsWith(exam+'--')&&n.endsWith('.txt'))){
    bank.push(...parseBank(await readFile(new URL('../app/data/'+name,import.meta.url),'utf8'),exam))
  }
  const stems=bank.map(q=>q.stem.normalize('NFKC').replace(/\s+/g,''))
  const duplicateExact=stems.length-new Set(stems).size
  const explicit=bank.filter(q=>q.explicit).length
  const written=bank.filter(q=>q.kind==='written').length
  const multi=bank.filter(q=>q.explicit?.filter(o=>o.correct).length>1).length
  rows.push({exam,total:bank.length,target,remaining:Math.max(0,target-bank.length),explicit,written,multi,duplicateExact,review:'未検証'})
}
console.table(rows)
const totals=rows.reduce((a,r)=>({total:a.total+r.total,target:a.target+r.target,remaining:a.remaining+r.remaining,duplicateExact:a.duplicateExact+r.duplicateExact}),{total:0,target:0,remaining:0,duplicateExact:0})
console.log(JSON.stringify(totals))
console.log('構造・件数の監査のみ。技能網羅、意味重複、選択肢妥当性、一次資料との一致は別途確認が必要。')
if(process.argv.includes('--require-targets')&&(totals.remaining||totals.duplicateExact))process.exitCode=1
