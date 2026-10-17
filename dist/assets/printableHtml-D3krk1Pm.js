let s=null;function r(){if(s!==null)return s;let t="";for(const e of Array.from(document.styleSheets))try{for(const l of Array.from(e.cssRules))t+=l.cssText+`
`}catch{}return t&&(s=t),t}function c(t,e="p-4 bg-white text-black print:m-0 w-[800px]"){return`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${r()}</style></head><body class="${e}">${t}</body></html>`}export{c as b};
