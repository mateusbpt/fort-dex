const KEY = 'fortdex-progress-v1';
export function getProgress(){try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return {}}}
export function saveProgress(progress){localStorage.setItem(KEY,JSON.stringify(progress))}
export function updateElemental(id, updater){const progress=getProgress();progress[id]=updater(progress[id]||{favorite:false,notes:'',variantes:{}});saveProgress(progress);return progress}
export function exportProgress(){return JSON.stringify(getProgress(),null,2)}
export function isValidProgress(value){return value&&typeof value==='object'&&!Array.isArray(value)&&Object.values(value).every(item=>item&&typeof item==='object'&&!Array.isArray(item)&&(!item.variantes||typeof item.variantes==='object'))}
