import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const root=resolve('.output/public')
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'}
const server=createServer(async(req,res)=>{
  try {
    let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)
    if(pathname==='/')pathname='/index.html'
    const path=resolve(root,'.'+pathname)
    if(!path.startsWith(root+'/')) {res.writeHead(403);res.end();return}
    const body=await readFile(path)
    res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-cache'})
    res.end(body)
  } catch {res.writeHead(404);res.end()}
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
let browser
try {
  browser=await chromium.launch({headless:true})
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})
  const page=await context.newPage()
  page.setDefaultTimeout(20000)
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  const url='http://127.0.0.1:'+server.address().port
  await page.goto(url)
  await page.getByRole('button',{name:/ロードマップ順に学習/}).waitFor()
  await page.getByRole('button',{name:/ロードマップ順に学習/}).click()
  await page.locator('.answer-button').first().waitFor()
  assert.equal(await page.locator('.answer-button').count(),4)
  const stem=await page.locator('h1').innerText()
  await page.locator('.answer-button').first().click()
  await page.getByRole('button',{name:/回答する/}).click()
  await page.locator('#explanation').waitFor()
  assert.ok((await page.locator('#explanation').innerText()).length>20)
  await page.evaluate(()=>navigator.serviceWorker.ready)
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller)
  await page.reload()
  await page.locator('#explanation').waitFor()
  assert.equal(await page.locator('h1').innerText(),stem)
  await page.getByRole('button',{name:'中断',exact:true}).click()
  await page.getByRole('button',{name:'再開',exact:true}).click()
  await page.locator('#explanation').waitFor()
  await page.getByRole('button',{name:'次の問題',exact:true}).click()
  const nextStem=await page.locator('h1').innerText()
  assert.notEqual(nextStem,stem)
  await context.setOffline(true)
  await page.reload()
  await page.locator('.answer-button').first().waitFor()
  assert.equal(await page.locator('h1').innerText(),nextStem)
  await page.locator('.answer-button').first().click()
  await page.getByRole('button',{name:/回答する/}).click()
  await page.locator('#explanation').waitFor()
  await page.getByRole('button',{name:'中断',exact:true}).click()
  await page.getByLabel('学習する資格').selectOption('linuc-101')
  await page.getByRole('button',{name:/ロードマップ順に学習/}).click()
  await page.locator('.answer-button').first().waitFor()
  assert.equal(await page.locator('.answer-button').count(),4)
  assert.deepEqual(errors,[])
  console.log('Browser smoke passed: mobile, answer, resume, offline, switch exam')
}finally{
  await browser?.close()
  await new Promise(resolve=>server.close(resolve))
}
