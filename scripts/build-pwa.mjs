import { readdir, readFile, writeFile, cp, lstat } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { deflateSync } from 'node:zlib'
const dir = '.output/public'
const crc32 = data => {
  let c = -1
  for (const n of data) {
    c ^= n
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0)
  }
  return (c ^ -1) >>> 0
}
function chunk(type, data) {
  const name = Buffer.from(type)
  const header = Buffer.alloc(4), footer = Buffer.alloc(4)
  header.writeUInt32BE(data.length)
  footer.writeUInt32BE(crc32(Buffer.concat([name, data])))
  return Buffer.concat([header, name, data, footer])
}
for (const size of [192,512]) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2
  const raw = Buffer.alloc(size * (size * 3 + 1))
  for (let y=0;y<size;y++) for (let x=0;x<size;x++) {
    const u=x/size,v=y/size
    let color=[15,23,42]
    if (u>.25 && u<.75 && v>.20 && v<.80) color=[248,250,252]
    for (const off of [0,.21]) {
      const t=v-.35-off
      if (u>.32 && u<.47 && Math.min(Math.abs(t-(u-.32)),Math.abs(t+u-.44))<.018 && Math.abs(t)<.08) color=[5,150,105]
      if (u>.53 && u<.68 && Math.abs(v-.39-off)<.015) color=[100,116,139]
    }
    const i=y*(size*3+1)+1+x*3
    raw.set(color,i)
  }
  await writeFile(join(dir,'icon-'+size+'.png'),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]))
}
async function walk(base, prefix='') {
  const list=[]
  for(const item of await readdir(base,{withFileTypes:true})) {
    const name=prefix+item.name
    if(item.isDirectory()) list.push(...await walk(join(base,item.name),name+'/'))
    else if(item.isFile() && !/^(sw\.js|_headers|_redirects)$/.test(name) && !name.endsWith('.map')) list.push(name)
  }
  return list
}
const files=(await walk(dir)).sort()
const hash=createHash('sha256')
for(const file of files) { hash.update(file); hash.update(await readFile(join(dir,file))) }
const version='cert-study-'+hash.digest('hex').slice(0,16)
const urls=['/',...files.map(f=>'/'+f)]
const sw=`const CACHE = ${JSON.stringify(version)};
const PRECACHE = ${JSON.stringify(urls)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k.startsWith('cert-study-') && k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if(event.request.method!=='GET' || new URL(event.request.url).origin!==self.location.origin) return;
  const url=new URL(event.request.url);
  if(event.request.mode==='navigate') {
    event.respondWith(caches.open(CACHE).then(cache=>cache.match('/')).then(cached=>cached||fetch(event.request)));
    return;
  }
  if(PRECACHE.includes(url.pathname)) event.respondWith(caches.open(CACHE).then(cache=>cache.match(url.pathname)).then(cached=>cached||fetch(event.request)));
});
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING') self.skipWaiting()});
`
await writeFile(join(dir,'sw.js'),sw)
await writeFile(join(dir,'_headers'),'/sw.js\n  Cache-Control: no-cache\n/manifest.webmanifest\n  Cache-Control: no-cache\n')
try { await lstat('dist') } catch { await cp(dir,'dist',{recursive:true}) }
console.log('PWA precache:',urls.length,'files')
