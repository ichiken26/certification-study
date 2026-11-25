<script setup lang="ts">
import { timedItemCorrect } from '../utils/bank.mjs'
import type { TimedSession, Question } from '../utils/bank.mjs'
const props=defineProps<{session:TimedSession;bank:Question[];clock:number}>()
const emit=defineEmits<{update:[TimedSession];finish:[];leave:[]}>()
const item=computed(()=>props.session.items[props.session.index])
const question=computed(()=>props.bank.find(q=>q.id===item.value?.id))
const required=computed(()=>item.value?.choices.filter(c=>c.correct).length||1)
const remaining=computed(()=>Math.max(0,Math.ceil((props.session.deadline-props.clock)/1000)))
const display=computed(()=>Math.floor(remaining.value/60)+':'+String(remaining.value%60).padStart(2,'0'))
const answered=computed(()=>props.session.items.filter(i=>i.selected.length===i.choices.filter(c=>c.correct).length).length)
const confirm=ref(false)
const reviewIncorrect=ref(false)
const review=computed(()=>props.session.items.filter(i=>!reviewIncorrect.value||!timedItemCorrect(i)))
function choose(i:number){
  const x=item.value
  if(!x||props.session.completed)return
  if(Date.now()>=props.session.deadline){emit('finish');return}
  let selected=[...x.selected]
  if(selected.includes(i))selected=selected.filter(n=>n!==i)
  else if(required.value===1)selected=[i]
  else if(selected.length<required.value)selected.push(i)
  emit('update',{...props.session,items:props.session.items.map((v,j)=>j===props.session.index?{...v,selected}:v)})
}
function go(i:number){
  if(i<0||i>=props.session.items.length||props.session.completed)return
  emit('update',{...props.session,index:i});confirm.value=false
  nextTick(()=>window.scrollTo({top:0,behavior:'instant'}))
}
function flag(){emit('update',{...props.session,items:props.session.items.map((v,j)=>j===props.session.index?{...v,flagged:!v.flagged}:v)})}
function stem(id:string){return props.bank.find(q=>q.id===id)}
</script>
<template>
  <div class="space-y-4">
    <template v-if="session.completed">
      <UCard class="text-center">
        <p class="text-sm text-muted">時間制限付き演習の結果</p>
        <h1 class="text-4xl font-bold my-4 tabular-nums">{{ session.correct }} / {{ session.items.length }}</h1>
        <p>正答率 {{ Math.round((session.correct||0)/session.items.length*100) }}%</p>
        <p class="text-sm text-muted mt-2">未回答は不正解として記録。通常問題集から出題する演習であり、公式の換算スコアではありません。</p>
        <UButton block class="mt-4" @click="emit('leave')">学習トップへ</UButton>
      </UCard>
      <label class="flex items-center gap-2 text-sm"><input type="checkbox" v-model="reviewIncorrect"> 不正解・未回答のみ表示</label>
      <UCard v-for="x in review" :key="x.id">
        <UBadge :color="timedItemCorrect(x)?'success':'error'" variant="soft">{{ timedItemCorrect(x)?'正解':x.selected.length?'不正解':'未回答' }}</UBadge>
        <h2 class="font-semibold mt-2 whitespace-pre-wrap">{{ stem(x.id)?.stem }}</h2>
        <p class="mt-2 text-sm whitespace-pre-wrap">{{ stem(x.id)?.explanation }}</p>
        <div v-for="(o,i) in x.choices" :key="i" class="border-t border-default pt-2 mt-2">
          <p class="text-sm font-medium" :class="o.correct?'text-success':x.selected.includes(i)?'text-error':''">{{ o.correct?'正解：':'' }}{{ o.label }}{{ x.selected.includes(i)?'（選択済み）':'' }}</p>
          <p class="text-xs text-muted mt-1">{{ o.explanation }}</p>
        </div>
      </UCard>
    </template>
    <template v-else-if="item && question">
      <div class="flex justify-between items-center gap-3">
        <span class="text-sm">回答済み {{ answered }}/{{ session.items.length }}</span>
        <span class="font-mono text-xl font-bold" :class="remaining<60?'text-error':''" aria-label="残り時間">{{ display }}</span>
      </div>
      <UProgress :model-value="answered" :max="session.items.length" />
      <div class="flex flex-wrap gap-2" aria-label="問題ナビゲーション">
        <UButton v-for="(x,i) in session.items" :key="x.id" size="xs" :variant="session.index===i?'solid':'outline'" :color="x.flagged?'warning':x.selected.length?'primary':'neutral'" @click="go(i)" :aria-label="'問題'+(i+1)">{{ i+1 }}</UButton>
      </div>
      <UCard>
        <div class="flex justify-between items-center gap-2 mb-3">
          <span class="text-xs text-muted">{{ question.chapter }} · {{ required }}つ選択</span>
          <UButton size="xs" :color="item.flagged?'warning':'neutral'" variant="outline" @click="flag">{{ item.flagged?'見直しを解除':'見直しに追加' }}</UButton>
        </div>
        <h1 class="font-semibold text-lg whitespace-pre-wrap break-words">{{ question.stem }}</h1>
      </UCard>
      <div class="space-y-3">
        <button v-for="(o,i) in item.choices" :key="i" type="button" :aria-pressed="item.selected.includes(i)" class="timed-answer-button w-full border rounded-xl p-4 text-left" :class="item.selected.includes(i)?'border-primary ring-2 ring-primary/30':'border-default'" @click="choose(i)">{{ ['A','B','C','D','E','F'][i] }}. {{ o.label }}</button>
      </div>
      <UCard v-if="confirm">
        <p class="font-medium">演習を終了しますか？</p><p class="text-sm text-muted">未回答 {{ session.items.length-answered }}問は不正解になります。</p>
        <div class="flex gap-2 mt-3"><UButton color="neutral" variant="outline" @click="confirm=false">続ける</UButton><UButton @click="emit('finish')">採点して終了</UButton></div>
      </UCard>
      <div class="flex gap-2 flex-wrap">
        <UButton color="neutral" variant="ghost" @click="emit('leave')">中断（時間は継続）</UButton>
        <UButton color="neutral" variant="outline" :disabled="session.index===0" @click="go(session.index-1)">前へ</UButton>
        <UButton variant="outline" :disabled="session.index+1===session.items.length" @click="go(session.index+1)">次へ</UButton>
        <UButton @click="confirm=true;nextTick(()=>window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'}))">終了</UButton>
      </div>
    </template>
  </div>
</template>
