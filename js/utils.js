export const entries=object=>Object.values(object||{});
export const initial=name=>(name||'?').trim().charAt(0);
export const countCollected=(elemental,progress)=>entries(elemental.variantes).filter(variant=>progress?.variantes?.[variant.id]).length;
export const isComplete=(elemental,progress)=>{const variants=entries(elemental.variantes);return variants.length>0&&countCollected(elemental,progress)===variants.length};
export const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
export function accentFor(id){return [...String(id)].reduce((total,char)=>total+char.charCodeAt(0),0)%360}
