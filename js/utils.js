export const entries=object=>Object.values(object||{});
export const initial=name=>(name||'?').trim().charAt(0);
/** Variantes já lançadas — as marcadas `emBreve` não são obteníveis, então ficam fora de qualquer total. */
export const availableVariants=elemental=>entries(elemental?.variantes).filter(variant=>!variant.emBreve);
export const countCollected=(elemental,progress)=>availableVariants(elemental).filter(variant=>progress?.variantes?.[variant.id]).length;
export const isComplete=(elemental,progress)=>{const variants=availableVariants(elemental);return variants.length>0&&countCollected(elemental,progress)===variants.length};
export const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
export function accentFor(id){return [...String(id)].reduce((total,char)=>total+char.charCodeAt(0),0)%360}
