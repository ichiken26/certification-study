<script setup lang="ts">
import { catalog } from './utils/catalog'
import { makeOptions, recordAnswer, selectSession } from './utils/bank.mjs'
import type { Choice, History, Question } from './utils/bank.mjs'

type Session = { exam:string; ids:string[]; index:number; choices:Choice[]; selected:number[]; answered:boolean; correct:number; writtenInput?:string; revealed?:boolean; writtenCorrect?:boolean }
const STORAGE='cert-study-v1'
const history=ref<History>({})
const session=ref<Session|null>(null)
const examId=ref('aws-saa')
const chapter=ref('')
const count=ref(10)
const ready=ref(false)
const showHome=ref(false)
const requiredChoices=computed(()=>session.value?.choices.filter(c=>c.correct).length||1)
const isWritten=computed(()=>current.value?.kind==='written')
const answerCorrect=computed(()=>isWritten.value?session.value?.writtenCorrect===true:!!session.value && session.value.selected.length===requiredChoices.value && session.value.selected.every(i=>session.value?.choices[i]?.correct))
const storageError=ref(false)
const offline=ref(false)
const offlineReady=ref(false)
const updateReady=ref(false)
let registration:ServiceWorkerRegistration|undefined
const families=[...new Set(catalog.map(e=>e.family))]
const exam=computed(()=>catalog.find(e=>e.id===examId.value)!)
const chapters=computed(()=>[...new Set(exam.value.questions.map(q=>q.chapter))])
const activeExam=computed(()=>catalog.find(e=>e.id===session.value?.exam))
const current=computed(()=>activeExam.value?.questions.find(q=>q.id===session.value?.ids[session.value.index]))
const finished=computed(()=>!!session.value && session.value.index>=session.value.ids.length)
const seen=computed(()=>exam.value.questions.filter(q=>history.value[q.id]).length)
const mastered=computed(()=>exam.value.questions.filter(q=>(history.value[q.id]?.streak||0)>=2).length)
const wrong=computed(()=>exam.value.questions.filter(q=>history.value[q.id]?.lastCorrect===false).length)
const filtered=computed(()=>exam.value.questions.filter(q=>!chapter.value||q.chapter===chapter.value))
const newCount=computed(()=>filtered.value.filter(q=>!history.value[q.id]).length)
const wrongCount=computed(()=>filtered.value.filter(q=>history.value[q.id]?.lastCorrect===false).length)
const chapterStats=computed(()=>chapters.value.map(name=>{
  const items=exam.value.questions.filter(q=>q.chapter===name)
  return {name,total:items.length,done:items.filter(q=>history.value[q.id]).length,wrong:items.filter(q=>history.value[q.id]?.lastCorrect===false).length}
}))
const save=()=>{
  if(!ready.value) return
  try { localStorage.setItem(STORAGE,JSON.stringify({history:history.value,session:session.value,examId:examId.value})); storageError.value=false }
  catch { storageError.value=true }
}
onMounted(()=>{
  try {
    const raw=localStorage.getItem(STORAGE)
    if(raw) {
      const data=JSON.parse(raw)
      if(data.history && typeof data.history==='object') history.value=data.history
      if(catalog.some(e=>e.id===data.examId)) examId.value=data.examId
      const s=data.session
      const bank=catalog.find(e=>e.id===s?.exam)?.questions
      if(s && bank && Array.isArray(s.ids) && s.ids.length && Number.isInteger(s.index) && s.index>=0 && s.index<=s.ids.length && s.ids.every((id:string)=>bank.some(q=>q.id===id)) && Array.isArray(s.choices) && (s.choices.length===4||s.choices.length===0 && bank.find(q=>q.id===s.ids[s.index])?.kind==='written')) session.value={...s,selected:Array.isArray(s.selected)?s.selected.filter((n:number)=>Number.isInteger(n)&&n>=0&&n<4):Number.isInteger(s.selected)?[s.selected]:[]}
    }
  } catch { storageError.value=true }
  ready.value=true
  offline.value=!navigator.onLine
  window.addEventListener('online',()=>offline.value=false)
  window.addEventListener('offline',()=>offline.value=true)
  if('serviceWorker' in navigator && import.meta.prod) {
    navigator.serviceWorker.register('/sw.js').then(reg=>{
      registration=reg
      updateReady.value=!!reg.waiting
      reg.addEventListener('updatefound',()=>{
        const worker=reg.installing
        worker?.addEventListener('statechange',()=>{if(worker.state==='installed' && navigator.serviceWorker.controller) updateReady.value=true})
      })
      return navigator.serviceWorker.ready
    }).then(()=>offlineReady.value=true).catch(()=>{})
  }
})
watch([history,session,examId],save,{deep:true,flush:'sync'})
watch(examId,()=>chapter.value='')
function begin(mode:string) {
  const items=selectSession(exam.value.questions,history.value,mode,count.value,chapter.value)
  if(!items.length) return
  const first=items[0]!
  session.value={exam:examId.value,ids:items.map(q=>q.id),index:0,choices:makeOptions(first,exam.value.questions),selected:[],answered:false,correct:0}
  showHome.value=false
  scrollTop()
}
function choose(i:number) {
  const s=session.value
  if(!s||s.answered) return
  if(requiredChoices.value===1) s.selected=[i]
  else if(s.selected.includes(i)) s.selected=s.selected.filter(n=>n!==i)
  else if(s.selected.length<requiredChoices.value) s.selected=[...s.selected,i]
}
function revealWritten(){
  const s=session.value
  if(!s||!isWritten.value||s.answered||!s.writtenInput?.trim()) return
  s.revealed=true
  nextTick(()=>document.getElementById('written-rubric')?.scrollIntoView({behavior:'smooth',block:'start'}))
}
function gradeWritten(correct:boolean){
  const s=session.value,q=current.value
  if(!s||!q||q.kind!=='written'||!s.revealed||s.answered)return
  s.writtenCorrect=correct;s.answered=true;s.correct+=Number(correct)
  history.value=recordAnswer(history.value,q.id,correct)
  nextTick(()=>document.getElementById('explanation')?.scrollIntoView({behavior:'smooth',block:'start'}))
}
function submit() {
  const s=session.value,q=current.value
  if(!s || !q || q.kind==='written' || s.answered || s.selected.length!==requiredChoices.value) return
  const correct=answerCorrect.value
  s.answered=true
  s.correct+=Number(correct)
  history.value=recordAnswer(history.value,q.id,correct)
  nextTick(()=>document.getElementById('explanation')?.scrollIntoView({behavior:'smooth',block:'start'}))
}
function next() {
  const s=session.value
  if(!s||!s.answered) return
  const index=s.index+1
  const q=activeExam.value?.questions.find(q=>q.id===s.ids[index])
  session.value={...s,index,selected:[],answered:false,writtenInput:'',revealed:false,writtenCorrect:undefined,choices:q?makeOptions(q,activeExam.value!.questions):s.choices}
  scrollTop()
}
function scrollTop(){ nextTick(()=>window.scrollTo({top:0,behavior:'instant'})) }
function home(){ if(finished.value)session.value=null; showHome.value=true; scrollTop() }
function resume(){ showHome.value=false; scrollTop() }
function applyUpdate(){
  if(!registration?.waiting) return
  navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true})
  registration.waiting.postMessage('SKIP_WAITING')
}
function exportProgress(){
  const a=document.createElement('a')
  const url=URL.createObjectURL(new Blob([JSON.stringify({history:history.value},null,2)],{type:'application/json'}))
  a.href=url;a.download='certification-study-progress.json';a.click();URL.revokeObjectURL(url)
}
const importMessage=ref('')
async function importProgress(event:Event){
  const input=event.target as HTMLInputElement
  const file=input.files?.[0];if(!file)return
  try {
    const data=JSON.parse(await file.text())
    const validIds=new Set(catalog.flatMap(e=>e.questions.map(q=>q.id)))
    const imported:History={}
    for(const [id,value] of Object.entries(data.history||{})){
      const r=value as History[string]
      if(validIds.has(id)&&r&&Number.isInteger(r.attempts)&&r.attempts>0&&Number.isInteger(r.correct)&&r.correct>=0&&r.correct<=r.attempts&&Number.isInteger(r.streak)&&r.streak>=0&&r.streak<=r.correct&&typeof r.lastCorrect==='boolean'&&typeof r.updatedAt==='string') {
        if(!history.value[id]||r.updatedAt>history.value[id].updatedAt) imported[id]=r
      }
    }
    history.value={...history.value,...imported};importMessage.value=Object.keys(imported).length+'件の履歴を取り込みました'
  }catch{importMessage.value='履歴ファイルを読み込めませんでした'}
  input.value=''
}
</script>

<template>
  <UApp>
    <div class="min-h-dvh bg-default text-default">
      <header class="sticky top-0 z-20 border-b border-default bg-default/95 backdrop-blur">
        <div class="max-w-3xl mx-auto flex items-center justify-between px-4 py-3 gap-3">
          <div>
            <p class="text-xs font-semibold tracking-widest text-primary">CERTIFICATION STUDY</p>
            <p class="text-sm text-muted">{{ session && !showHome ? activeExam?.version : '通勤時間を、資格の勉強時間に。' }}</p>
          </div>
          <div class="flex gap-2 items-center">
            <UBadge v-if="offline" color="neutral" variant="soft">オフライン</UBadge>
            <UBadge v-else-if="offlineReady" color="success" variant="soft">オフライン準備済</UBadge>
            <UColorModeButton />
          </div>
        </div>
      </header>
      <main class="max-w-3xl mx-auto px-4 py-5 space-y-5 pb-32">
        <UAlert v-if="storageError" color="warning" title="端末に履歴を保存できません" description="ストレージ設定を確認してください。" />
        <UAlert v-if="updateReady" color="info" title="新しい問題集があります">
          <template #description><UButton size="sm" @click="applyUpdate">更新する</UButton></template>
        </UAlert>
        <div v-if="!ready" class="text-muted py-10 text-center">読み込み中…</div>
        <template v-else-if="!session || showHome">
          <div>
            <h1 class="text-2xl font-bold">今日の学習</h1>
            <p class="text-sm text-muted mt-1">資格を選んで、未回答から順番に進めよう。</p>
          </div>
          <label class="block text-sm font-medium">学習する資格
            <select v-model="examId" class="block w-full mt-1 rounded-lg border border-default bg-default p-3 text-default">
              <optgroup v-for="family in families" :key="family" :label="family">
                <option v-for="item in catalog.filter(e=>e.family===family)" :key="item.id" :value="item.id" :disabled="!item.questions.length">{{ item.name }} · {{ item.version }}（{{ item.questions.length ? item.questions.length+'問' : '準備中' }}）</option>
              </optgroup>
            </select>
          </label>
          <UCard v-if="session && !finished">
            <div class="flex items-center justify-between gap-3">
              <div><p class="font-semibold">中断した学習</p><p class="text-sm text-muted">{{ activeExam?.name }} · {{ session.index+1 }}/{{ session.ids.length }}問</p></div>
              <UButton @click="resume">再開</UButton>
            </div>
          </UCard>
          <UCard>
            <div class="flex items-center justify-between gap-3">
              <h2 class="font-bold">{{ exam.name }}</h2><UBadge color="neutral" variant="outline">未完成</UBadge>
            </div>
            <div class="grid grid-cols-3 gap-3 py-4 text-center">
              <div><div class="text-2xl font-bold tabular-nums">{{ seen }}/{{ exam.questions.length }}</div><div class="text-xs text-muted">回答済み</div></div>
              <div><div class="text-2xl font-bold tabular-nums text-success">{{ mastered }}</div><div class="text-xs text-muted">2連続正解</div></div>
              <div><div class="text-2xl font-bold tabular-nums text-error">{{ wrong }}</div><div class="text-xs text-muted">要復習</div></div>
            </div>
            <UProgress :model-value="seen" :max="exam.questions.length||1" />
            <p class="mt-2 text-xs text-muted">収録 {{ exam.questions.length }} / 暫定目標 {{ exam.targetQuestions }} 問（試験範囲の網羅・内容レビューは未完了）</p>
            <div class="mt-4 space-y-3">
              <label class="block text-sm font-medium">学習範囲
                <select v-model="chapter" class="block w-full mt-1 rounded-lg border border-default bg-default p-3 text-default">
                  <option value="">すべての分野</option>
                  <option v-for="c in chapters" :key="c" :value="c">{{ c }}</option>
                </select>
              </label>
              <div><p class="text-sm font-medium mb-2">1セットの問題数</p>
                <div class="flex gap-2 flex-wrap"><UButton v-for="n in [5,10,20,30,65]" :key="n" :variant="count===n?'solid':'outline'" :color="count===n?'primary':'neutral'" @click="count=n">{{ n }}問</UButton></div>
              </div>
              <UButton block size="xl" :disabled="newCount===0" @click="begin('new')">ロードマップ順に学習（残り{{ newCount }}問）</UButton>
              <UButton block size="lg" variant="soft" color="warning" :disabled="wrongCount===0" @click="begin('wrong')">間違えた問題を復習（{{ wrongCount }}問）</UButton>
              <UButton block size="lg" variant="outline" color="neutral" :disabled="!filtered.length" @click="begin('random')">ランダム演習</UButton>
            </div>
            <p class="mt-4 text-xs text-muted">オリジナル学習問題。合格保証・公式模試ではありません。試験の全出題範囲や記述式は未網羅です。<a :href="exam.source" target="_blank" rel="noopener noreferrer" class="text-primary underline">公式出題範囲</a></p>
          </UCard>
          <UCard>
            <h2 class="font-bold mb-3">分野別の進捗</h2>
            <div v-for="s in chapterStats" :key="s.name" class="py-3 border-b border-default last:border-0">
              <div class="flex justify-between gap-2 text-sm mb-1"><span>{{ s.name }}</span><span class="text-muted shrink-0">{{ s.done }}/{{ s.total }}</span></div>
              <UProgress :model-value="s.done" :max="s.total"/>
              <p v-if="s.wrong" class="text-xs text-error mt-1">要復習 {{ s.wrong }}問</p>
            </div>
          </UCard>
          <UCard>
            <h2 class="font-bold mb-2">端末・履歴</h2>
            <p class="text-sm text-muted mb-3">ホーム画面に追加するとアプリのように使えます。オンラインで初回読込が必要です。履歴はこの端末に保存されます。</p>
            <div class="flex flex-wrap gap-2"><UButton color="neutral" variant="outline" @click="exportProgress">履歴をエクスポート</UButton><label class="cursor-pointer rounded-md border border-default px-3 py-2 text-sm">履歴をインポート<input type="file" accept="application/json,.json" class="sr-only" @change="importProgress"></label></div>
            <p v-if="importMessage" class="text-sm mt-2">{{ importMessage }}</p>
          </UCard>
        </template>
        <template v-else-if="finished">
          <UCard class="text-center">
            <p class="text-sm text-muted">今回の学習結果</p>
            <h1 class="text-4xl font-bold my-4 tabular-nums">{{ session.correct }} / {{ session.ids.length }}</h1>
            <p class="text-lg">正答率 {{ Math.round(session.correct/session.ids.length*100) }}%</p>
            <p class="text-sm text-muted mt-2">間違えた問題は復習から再挑戦できるよ。</p>
            <UButton class="mt-5" block size="xl" @click="home">学習トップへ</UButton>
          </UCard>
        </template>
        <template v-else-if="current">
          <div class="flex items-center justify-between gap-3"><UBadge color="neutral" variant="soft">{{ current.chapter }}</UBadge><span class="text-sm text-muted tabular-nums">{{ session.index+1 }} / {{ session.ids.length }}</span></div>
          <UProgress :model-value="session.index+(session.answered?1:0)" :max="session.ids.length" />
          <UCard>
            <p class="text-xs text-muted mb-2">{{ current.topic }} · {{ isWritten ? '記述式・自己採点' : requiredChoices===1 ? '1つ選択' : requiredChoices+'つ選択' }}</p>
            <h1 class="font-semibold text-lg leading-relaxed whitespace-pre-wrap break-words">{{ current.stem }}</h1>
          </UCard>
          <UCard v-if="isWritten">
            <label for="written-answer" class="block text-sm font-semibold mb-2">あなたの回答</label>
            <textarea id="written-answer" v-model="session.writtenInput" :readonly="session.revealed||session.answered" rows="5" class="w-full rounded-lg border border-default bg-default p-3" placeholder="根拠を含めて記述してください" />
            <p class="text-xs text-muted mt-1">{{ (session.writtenInput||'').length }}文字 · 自己採点方式</p>
          </UCard>
          <UCard v-if="isWritten && session.revealed && !session.answered" id="written-rubric" class="scroll-mt-24">
            <h2 class="font-bold">模範解答</h2><p class="mt-2 whitespace-pre-wrap">{{ current.answer }}</p>
            <h3 class="font-bold mt-4">採点基準・解説</h3><p class="mt-2 whitespace-pre-wrap">{{ current.explanation }}</p>
            <p class="text-sm text-muted mt-3">表現が異なっても、必要な論点を満たしていれば正解として記録してください。</p>
            <div class="flex gap-2 mt-4"><UButton class="flex-1 justify-center" color="success" @click="gradeWritten(true)">正解として記録</UButton><UButton class="flex-1 justify-center" color="error" variant="soft" @click="gradeWritten(false)">要復習として記録</UButton></div>
          </UCard>
          <div v-if="!isWritten" class="space-y-3">
            <button v-for="(choice,i) in session.choices" :key="i" type="button" :disabled="session.answered" :aria-pressed="session.selected.includes(i)"
              class="answer-button w-full flex items-center gap-3 border rounded-xl px-4 py-4 bg-default transition-colors"
              :class="session.answered ? (choice.correct?'border-success bg-success/10':session.selected.includes(i)?'border-error bg-error/10':'border-default') : session.selected.includes(i)?'border-primary ring-2 ring-primary/30 bg-primary/5':'border-default hover:bg-elevated'"
              @click="choose(i)">
              <span class="shrink-0 text-sm font-bold rounded-full border border-default size-8 flex items-center justify-center">{{ ['A','B','C','D'][i] }}</span>
              <span class="flex-1 text-sm leading-relaxed font-medium">{{ choice.label }}</span>
              <span v-if="session.answered && choice.correct" class="text-success font-bold">✓</span>
              <span v-else-if="session.answered && session.selected.includes(i)" class="text-error font-bold">×</span>
            </button>
          </div>
          <UCard v-if="session.answered" id="explanation" class="scroll-mt-24">
            <div class="space-y-4">
              <div><UBadge :color="answerCorrect?'success':'error'" variant="soft">{{ answerCorrect?'正解！':'不正解' }}</UBadge>
                <h2 class="mt-2 font-bold text-lg">{{ current.answer }}</h2>
                <p class="leading-relaxed mt-2 whitespace-pre-wrap">{{ current.explanation }}</p>
              </div>
              <div v-for="choice in session.choices.filter(c=>requiredChoices>1 || !c.correct)" :key="choice.label" class="border-t border-default pt-3">
                <p class="text-sm font-semibold"><span :class="choice.correct?'text-success':'text-error'">{{ choice.correct?'✓':'×' }}</span> {{ choice.label }}</p><p class="text-sm leading-relaxed text-muted mt-1">{{ choice.explanation }}</p>
              </div>
              <a :href="activeExam?.source" target="_blank" rel="noopener noreferrer" class="text-xs text-primary underline">公式の試験範囲を確認する</a>
            </div>
          </UCard>
          <div class="fixed inset-x-0 bottom-0 bg-default/95 backdrop-blur border-t border-default safe-bottom z-20">
            <div class="max-w-3xl mx-auto px-4 pt-3 flex gap-2 items-center">
              <UButton color="neutral" variant="ghost" @click="home">中断</UButton>
              <UButton v-if="isWritten && !session.answered" class="flex-1 justify-center" size="xl" :disabled="!session.writtenInput?.trim()||session.revealed" @click="revealWritten">{{ session.revealed?'上の採点基準から自己採点':'模範解答を見る' }}</UButton>
              <UButton v-else-if="!session.answered" class="flex-1 justify-center" size="xl" :disabled="session.selected.length!==requiredChoices" @click="submit">回答する{{ requiredChoices>1?'（'+session.selected.length+'/'+requiredChoices+'）':'' }}</UButton>
              <UButton v-else class="flex-1 justify-center" size="xl" @click="next">{{ session.index+1===session.ids.length?'結果を見る':'次の問題' }}</UButton>
            </div>
          </div>
        </template>
      </main>
    </div>
  </UApp>
</template>
