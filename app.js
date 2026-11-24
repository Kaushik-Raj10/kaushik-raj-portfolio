'use strict';

const root=document.documentElement;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const motion=document.querySelector('#motion-toggle');
let preference;
try{preference=localStorage.getItem('kr-motion');}catch{}
let moving=preference===null||preference===undefined?!reduced.matches:preference==='on';

function setMotion(value,save){
  moving=value;
  root.classList.toggle('motion-on',value);root.classList.toggle('motion-off',!value);
  motion.setAttribute('aria-pressed',String(value));
  motion.setAttribute('aria-label',value?'Pause animations':'Resume animations');
  motion.title=motion.getAttribute('aria-label');
  document.querySelector('#motion-text').textContent=value?'Motion on':'Motion off';
  if(save){preference=value?'on':'off';try{localStorage.setItem('kr-motion',preference);}catch{}}
  window.dispatchEvent(new Event('portfolio-motion'));
}
motion.addEventListener('click',()=>setMotion(!moving,true));
reduced.addEventListener('change',()=>{if(preference==null)setMotion(!reduced.matches,false);});
setMotion(moving,false);

const menu=document.querySelector('#menu-toggle'), nav=document.querySelector('#main-nav');
function setMenu(open){
  nav.classList.toggle('open',open);menu.setAttribute('aria-expanded',String(open));
  menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');
  menu.querySelector('use').setAttribute('href',open?'#i-close':'#i-menu');
}
menu.addEventListener('click',()=>setMenu(!nav.classList.contains('open')));
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){setMenu(false);menu.focus();}});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.site-header'))setMenu(false);});
matchMedia('(min-width: 761px)').addEventListener('change',()=>setMenu(false));

const observer=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('seen');observer.unobserve(entry.target);}});
},{threshold:.08});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

const track=document.querySelector('.ticker-track'), group=track.firstElementChild;
const totalGroups=4;
for(let i=1;i<totalGroups;i++){const clone=group.cloneNode(true);clone.setAttribute('aria-hidden','true');track.append(clone);}
track.style.setProperty('--ticker-shift','-'+100/totalGroups+'%');track.classList.add('ready');

document.querySelectorAll('[data-open]').forEach(button=>{
  button.addEventListener('click',()=>{
    const dialog=document.getElementById(button.dataset.open);
    if(dialog.open)return;
    dialog.showModal();document.body.style.overflow='hidden';dialog.scrollTop=0;
    dialog.dispatchEvent(new Event('portfolio-open'));
  });
});
document.querySelectorAll('dialog').forEach(dialog=>{
  dialog.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
  dialog.addEventListener('click',e=>{
    if(e.target!==dialog)return;
    const r=dialog.getBoundingClientRect();
    if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();
  });
  dialog.addEventListener('close',()=>{document.body.style.overflow='';});
});

const copy=document.querySelector('#copy-email'), status=document.querySelector('#copy-status');
const email=document.querySelector('.email-link').getAttribute('href').slice(7);
let statusTimer;
copy.addEventListener('click',async()=>{
  let copied=false;
  try{await navigator.clipboard.writeText(email);copied=true;}catch{
    const box=document.createElement('textarea');box.value=email;box.setAttribute('readonly','');
    box.style.cssText='position:fixed;top:0;left:-2000px';document.body.append(box);box.select();
    try{copied=document.execCommand('copy');}catch{}box.remove();copy.focus();
  }
  status.textContent=copied?'Email copied':'Select the email address to copy it.';
  clearTimeout(statusTimer);statusTimer=setTimeout(()=>{status.textContent='';},3500);
});

Trefoil.mount(document.querySelector('#sculpture'),()=>moving);
SignalLab.mount(()=>moving);
