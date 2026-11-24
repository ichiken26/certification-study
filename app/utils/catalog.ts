import { parseBank } from './bank.mjs'
const files=import.meta.glob('../data/*.txt',{eager:true,query:'?raw',import:'default'}) as Record<string,string>
export const catalog=[
  {id:'aws-saa',family:'AWS',name:'Solutions Architect – Associate',version:'SAA-C03',source:'https://docs.aws.amazon.com/ja_jp/aws-certification/latest/solutions-architect-associate-03/solutions-architect-associate-03.html'},
  {id:'aws-dva',family:'AWS',name:'Developer – Associate',version:'DVA',source:'https://aws.amazon.com/certification/certified-developer-associate/'},
  {id:'aws-soa',family:'AWS',name:'CloudOps Engineer – Associate',version:'Associate',source:'https://aws.amazon.com/certification/'},
  {id:'aws-dea',family:'AWS',name:'Data Engineer – Associate',version:'Associate',source:'https://aws.amazon.com/certification/'},
  {id:'aws-mla',family:'AWS',name:'Machine Learning Engineer – Associate',version:'Associate',source:'https://aws.amazon.com/certification/'},
  {id:'aws-sap',family:'AWS',name:'Solutions Architect – Professional',version:'Professional',source:'https://aws.amazon.com/certification/'},
  {id:'aws-dop',family:'AWS',name:'DevOps Engineer – Professional',version:'Professional',source:'https://aws.amazon.com/certification/'},
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
].map(exam=>({...exam,questions:Object.entries(files).filter(([path])=>path.endsWith('/'+exam.id+'.txt')||path.includes('/'+exam.id+'--')).flatMap(([,raw])=>parseBank(raw,exam.id))}))
