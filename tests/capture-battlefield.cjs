const {chromium}=require('playwright');const fs=require('node:fs');
(async()=>{const stage=process.argv[2]||'after',out=`artifacts/crownfall-mobile/${stage}`;fs.mkdirSync(out,{recursive:true});const b=await chromium.launch({args:['--no-sandbox']});try{const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await p.emulateMedia({reducedMotion:'reduce'});await p.addInitScript(()=>localStorage.setItem('crownfall-tour','done'));await p.goto('http://localhost:4173');await p.evaluate(()=>{CrownI18n.setLanguage('en');enterGameMode();state=E.create(1234);state.paused=false;state.aiDisabled=true;matchActive=false;sourceId=0;targetId=null;V.init(state);updateUI();V.render(state,null,0);document.getElementById('coach').classList.add('hidden');});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(200);
const frame=async(name,x,y,z,source=null,target=null)=>{await p.evaluate(({x,y,z,source,target})=>{sourceId=source;targetId=target;updateUI();V.render(state,target,source);MobileGame.animateCamera(x,y,z,0);document.getElementById('resumeNotice').style.visibility='hidden';document.getElementById('toast').style.visibility='hidden';},{x,y,z,source,target});await p.waitForTimeout(180);await p.screenshot({path:`${out}/${name}.png`});};
await frame('01-overview',1100,750,1);await frame('02-blue-selected',470,760,3.25,0);await frame('03-red-target',1730,760,3.25,0,1);await frame('04-neutral',480,1060,3.25,0,8);await frame('05-far-zoom',1100,750,.75);await frame('06-close-zoom',300,760,5,0);
await frame('03-red-target',1730,760,3.25,0,1);
await p.locator('.game-hud').screenshot({path:`${out}/07-top-hud.png`});await p.locator('#gameDock').screenshot({path:`${out}/08-bottom-command.png`});
await p.setViewportSize({width:1440,height:1000});await frame('09-desktop-overview',1100,750,1);
await p.evaluate(()=>{state.weather={type:'rain',timer:40,duration:45,index:1};updateUI();V.render(state,null,0);MobileGame.animateCamera(1100,750,1.2,0);for(let i=0;i<30;i++)V.updateWeather?.(performance.now()+i*16);});
await p.waitForTimeout(500);await p.screenshot({path:`${out}/10-rain-weather.png`});
await p.evaluate(()=>{document.getElementById('legendToggleBtn').click();});
await p.waitForTimeout(250);
await p.screenshot({path:`${out}/11-tactical-legend.png`});
await p.evaluate(()=>{document.getElementById('closeLegendBtn').click();});
await frame('12-node-labels-desktop',500,780,2.5,0,8);
await p.locator('#gameDock').screenshot({path:`${out}/13-target-inspect-dock.png`});
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});

