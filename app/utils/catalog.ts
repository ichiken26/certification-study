import { parseBank } from './bank.mjs'
const files=import.meta.glob('../data/*.txt',{eager:true,query:'?raw',import:'default'}) as Record<string,string>
const mockFiles=import.meta.glob('../mock-data/*.txt',{eager:true,query:'?raw',import:'default'}) as Record<string,string>
const mockSpecs:Record<string,{minutes:number;count:number}>={'aws-saa--01':{minutes:130,count:65}}
function mockSets(examId:string){
  return Object.entries(mockFiles).flatMap(([path,raw])=>{
    const id=path.split('/').pop()!.replace(/\.txt$/,'')
    const spec=mockSpecs[id]
    if(!id.startsWith(examId+'--')||!spec)return []
    const questions=parseBank(raw,id+'-mock')
    if(questions.length!==spec.count||questions.some(q=>q.kind!=='choice'||!q.explicit))throw new Error('Invalid mock set '+id)
    return [{id,name:'独立模擬試験 '+id.split('--')[1],minutes:spec.minutes,questions}]
  }).sort((a,b)=>a.id.localeCompare(b.id))
}
export const catalog=[
  {id:'aws-saa',family:'AWS',name:'Solutions Architect – Associate',version:'SAA-C03',source:'https://docs.aws.amazon.com/ja_jp/aws-certification/latest/solutions-architect-associate-03/solutions-architect-associate-03.html'},
  {id:'aws-dva',family:'AWS',name:'Developer – Associate',version:'DVA-C03 移行準備',source:'https://docs.aws.amazon.com/ja_jp/aws-certification/latest/developer-associate-03.html'},
  {id:'aws-soa',family:'AWS',name:'CloudOps Engineer – Associate',version:'SOA-C03',source:'https://docs.aws.amazon.com/aws-certification/latest/sysops-administrator-associate-03/sysops-administrator-associate-03.html'},
  {id:'aws-dea',family:'AWS',name:'Data Engineer – Associate',version:'DEA-C01',source:'https://aws.amazon.com/certification/'},
  {id:'aws-mla',family:'AWS',name:'Machine Learning Engineer – Associate',version:'MLA-C02 移行準備',source:'https://aws.amazon.com/certification/'},
  {id:'aws-sap',family:'AWS',name:'Solutions Architect – Professional',version:'SAP-C03',source:'https://docs.aws.amazon.com/ja_jp/aws-certification/latest/solutions-architect-professional-03.html'},
  {id:'aws-dop',family:'AWS',name:'DevOps Engineer – Professional',version:'DOP-C02',source:'https://aws.amazon.com/certification/'},
  {id:'linuc-101',family:'LinuC',name:'101試験',version:'Version 10.0',source:'https://linuc.org/linuc1/range/101.html'},
  {id:'linuc-102',family:'LinuC',name:'102試験',version:'Version 10.0',source:'https://linuc.org/linuc1/range/102.html'},
  {id:'linuc-201',family:'LinuC',name:'201試験',version:'Version 10.0',source:'https://linuc.org/linuc2/'},
  {id:'linuc-202',family:'LinuC',name:'202試験',version:'Version 10.0',source:'https://linuc.org/linuc2/'},
  {id:'gcp-ace',family:'Google Cloud',name:'Associate Cloud Engineer',version:'ACE',source:'https://cloud.google.com/learn/certification/cloud-engineer'},
  {id:'gcp-pca',family:'Google Cloud',name:'Professional Cloud Architect',version:'PCA',source:'https://cloud.google.com/learn/certification/cloud-architect'},
  {id:'gcp-pcd',family:'Google Cloud',name:'Professional Cloud Developer',version:'PCD',source:'https://cloud.google.com/learn/certification/cloud-developer'},
  {id:'gcp-pde',family:'Google Cloud',name:'Professional Data Engineer',version:'PDE',source:'https://cloud.google.com/learn/certification/data-engineer'},
  {id:'ipa-fe',family:'情報処理技術者',name:'基本情報技術者',version:'FE・現行制度',source:'https://www.ipa.go.jp/shiken/kubun/fe.html'},
  {id:'ipa-ap',family:'情報処理技術者',name:'応用情報技術者',version:'AP・現行制度',source:'https://www.ipa.go.jp/shiken/kubun/ap.html'}
].map(exam=>({...exam,mocks:mockSets(exam.id),targetQuestions:({"aws-saa":450,"aws-dva":400,"aws-soa":400,"aws-dea":400,"aws-mla":400,"aws-sap":600,"aws-dop":600,"linuc-101":350,"linuc-102":350,"linuc-201":450,"linuc-202":450,"gcp-ace":400,"gcp-pca":550,"gcp-pcd":450,"gcp-pde":450,"ipa-fe":450,"ipa-ap":600} as Record<string,number>)[exam.id]!,questions:Object.entries(files).filter(([path])=>path.endsWith('/'+exam.id+'.txt')||path.includes('/'+exam.id+'--')).sort(([a],[b])=>Number(a.includes('--'))-Number(b.includes('--')) || a.localeCompare(b)).flatMap(([,raw])=>parseBank(raw,exam.id)).sort((a,b)=>a.chapter.localeCompare(b.chapter,'ja'))}))
