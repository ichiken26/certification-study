export interface Choice { label: string; explanation: string; correct: boolean }
export interface Question { id: string; exam: string; chapter: string; topic: string; stem: string; answer: string; explanation: string; explicit: Choice[] | null }
export interface Result { attempts: number; correct: number; streak: number; lastCorrect: boolean; updatedAt: string }
export type History = Record<string,Result>
export function parseBank(raw:string,exam:string):Question[]
export function shuffle<T>(items:T[],random?:()=>number):T[]
export function makeOptions(q:Question,bank:Question[],random?:()=>number):Choice[]
export function selectSession(bank:Question[],history:History,mode:string,count:number,chapter?:string,random?:()=>number):Question[]
export function recordAnswer(history:History,id:string,correct:boolean):History
