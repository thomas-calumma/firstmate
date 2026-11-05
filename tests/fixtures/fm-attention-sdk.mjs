// Non-live guard: real Pi loader, provider stream, tool calls, native transcript
// and session persistence. No credentials, network, live fleet or audible player.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, readFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import cp from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { EventEmitter } from "node:events";
import { createHash } from "node:crypto";
const [pkgArg, labArg, repoArg] = process.argv.slice(2);
const pkg=resolve(pkgArg), lab=resolve(labArg), repo=resolve(repoArg);
const home=`${lab}/home`, agentDir=`${lab}/agent`;
for(const path of [home,agentDir,`${home}/state`,`${home}/data`,`${home}/config`]) mkdirSync(path,{recursive:true});
process.env.FM_HOME=home; process.env.PI_CODING_AGENT_DIR=agentDir;
writeFileSync(`${home}/config/calm-ship`,"enterprise\n");
writeFileSync(`${agentDir}/models.json`,JSON.stringify({providers:{"fm-attention-fixture":{baseUrl:"https://fm-attention.invalid/v1",api:"openai-completions",apiKey:"fixture-only",models:[{id:"fixture",name:"fixture",contextWindow:8192,maxTokens:1024}]}}}));
const audio=[], requests=[];
let unavailable=false, active=0, maximum=0;
cp.spawn=(file,args,options)=>{
 const visible=manager.getEntries().filter(e=>e.type==="custom"&&e.customType==="fm-attention-delivery").at(-1);
 assert(visible && rendered().includes(visible.data.message),"sound preceded native visible delivery");
 if(file!=="/usr/bin/afplay") throw Error(`Unexpected subprocess ${file} ${args}`);
 assert.equal(options.shell,false);assert.deepEqual(args,[`${repo}/.pi/extensions/lib/tos-intercom-whistle.mp3`]);
 assert.equal(createHash("sha256").update(readFileSync(args[0])).digest("hex"),"416b9210e362d8d4b4ba246983d566121ee8e140debfae3f44d148857f64e043");
 console.log(JSON.stringify({audio:"stubbed",at:new Date().toISOString(),file,args}));
 const child=new EventEmitter();child.kill=()=>{queueMicrotask(()=>child.emit("close",null));return true;};
 active++;maximum=Math.max(maximum,active);child.once("close",()=>active--);audio.push(child);
 if(unavailable) queueMicrotask(()=>{child.emit("error",Error("ENOENT"));child.emit("close",1);});
 return child;
};syncBuiltinESMExports();
const {CustomEntryComponent}=await import(pathToFileURL(`${pkg}/dist/modes/interactive/components/custom-entry.js`));
const sdk=await import(pathToFileURL(`${pkg}/dist/index.js`));
const {DefaultResourceLoader,SessionManager,SettingsManager,ModelRuntime,ModelRegistry,createAgentSession,InteractiveMode,initTheme}=sdk;initTheme("dark");
let plan=[], callId=0;
const chunk=(delta,finish=null)=>`data: ${JSON.stringify({id:"fixture",object:"chat.completion.chunk",created:1,model:"fixture",choices:[{index:0,delta,finish_reason:finish}]})}\n\n`;
globalThis.fetch=async(input,options)=>{
 const url=typeof input==="string"?input:input.url;
 assert(url.startsWith("https://fm-attention.invalid/"),`Unexpected network ${url}`);
 const body=JSON.parse(options.body); requests.push(body);
 const next=plan.shift();assert(next,"Unexpected model continuation");
 const delta=next.args?{role:"assistant",tool_calls:[{index:0,id:`attention-${++callId}`,type:"function",function:{name:"fm_attention",arguments:JSON.stringify(next.args)}}]}:{role:"assistant",content:next.text};
 return new Response(chunk(delta)+chunk({},next.args?"tool_calls":"stop")+"data: [DONE]\n\n",{headers:{"content-type":"text/event-stream"}});
};
const runtime=await ModelRuntime.create({authPath:`${agentDir}/auth.json`,modelsPath:`${agentDir}/models.json`});
const registry=new ModelRegistry(runtime);await registry.refresh();
let session,manager,interactive,api,settings,loader,replaying=false;
async function open(reopened=false,mode="tui"){
 replaying=reopened;
 settings=SettingsManager.create(home,agentDir);
 loader=new DefaultResourceLoader({cwd:home,agentDir,settingsManager:settings,additionalExtensionPaths:[`${repo}/.pi/extensions/fm-task-panel.ts`],extensionFactories:[{name:"capture",factory:pi=>{api=pi;}}],noSkills:true,noPromptTemplates:true,noThemes:true,noContextFiles:true});
 await loader.reload();assert.deepEqual(loader.getExtensions().errors,[]);
 manager=reopened?SessionManager.open(manager.getSessionFile(),`${lab}/sessions`):SessionManager.create(home,`${lab}/sessions`);
 ({session}=await createAgentSession({cwd:home,sessionManager:manager,settingsManager:settings,resourceLoader:loader,modelRuntime:runtime,model:registry.find("fm-attention-fixture","fixture"),noTools:"builtin"}));
 interactive=new InteractiveMode({session,setBeforeSessionInvalidate(){},setRebindSession(){}},{tuiMode:"regular"});
 interactive.isInitialized=true;interactive.subscribeToAgent();
 await session.bindExtensions({mode});
}
const count=()=>manager.getEntries().filter(e=>e.type==="custom"&&e.customType==="fm-attention-delivery").length;
const rendered=()=>interactive.chatContainer.children.filter(c=>c instanceof CustomEntryComponent).flatMap(c=>c.render(200)).join("\n");
const command=async name=>session.extensionRunner.getRegisteredCommands().find(c=>c.name==="fleet-panel").handler(name,session.extensionRunner.createContext());
const finishAudio=()=>{while(active) audio.at(-1).emit("close",0);};
const args=(key,kind="question",revision="1")=>({key,kind,revision,message:`Visible ${kind}: ${key} ${revision}`});
async function deliver(item,transport="main"){
 plan=[{args:item},{text:""}];
 if(transport==="main") await session.prompt("Deliver the requested result to the user.");
 else await session.sendCustomMessage({customType:"fm-branch-process",content:"Non-live supervision processing request. Check current state and deliver only the user's new result.",display:false},{triggerTurn:true});
 assert.equal(plan.length,0);
 const entry=manager.getEntries().find(e=>e.type==="custom"&&e.customType==="fm-attention-delivery"&&e.data.key===item.key&&e.data.kind===item.kind&&e.data.revision===item.revision);
 assert(entry,"tool failed to persist delivery");
 if(entry.data.message===item.message && !replaying) assert(rendered().includes(item.message),"native visible entry missing");
}
try{
 await open();
 // Real MAIN user-message and hidden branch-processing transports, scripted
 // semantic owner decisions. No claim of live model classification accuracy.
 const per=process.platform==="darwin"?1:0;
 for(const kind of ["question","review","completed","failure"]){
  const before=audio.length;await deliver(args(kind,kind),kind==="question"?"main":"branch");
  assert.equal(audio.length,before+per,`${kind} did not request playback with panel disabled`);finishAudio();
 }
 assert(requests.some(r=>JSON.stringify(r).includes("internal intermediate reviewer")),"MAIN did not receive attention policy");
 const before=audio.length, entries=count();
 // Routine branch entries and main final progress have no semantic delivery.
 api.appendEntry("fm-branch-visible-outcome",{version:1,seq:71,task:"reviewer",verdict:"captain",summary:"Internal review ready for MAIN",silent:false});
 await session.sendCustomMessage({customType:"fm-branch-merge",content:"Worker done; supervisor will inspect.",display:true},{triggerTurn:false});
 for(const text of ["Still working.","Waiting unchanged.","The intermediate reviewer is ready for MAIN."]){plan=[{text}];await session.sendCustomMessage({customType:"fm-branch-process",content:"Routine internal processing.",display:false},{triggerTurn:true});}
 assert.equal(audio.length,before);assert.equal(count(),entries);
 await deliver({...args("question"),message:"Reworded unresolved question"},"branch");
 assert.equal(audio.length,before);assert.equal(count(),entries);
 // Distinct kind, key, and revision must survive the still-open question.
 for(const item of [args("question","completed"),args("other-question"),args("question","question","2")]) await deliver(item,"branch");
 assert.equal(audio.length,before+per,"burst overlapped playback");finishAudio();assert.equal(audio.length,before+2*per,"distinct burst lost coalesced follow-up");assert.equal(maximum,per);
 await command("mute");await deliver(args("muted"));const muted=audio.length;
 await command("off");await deliver(args("muted-off"));assert.equal(audio.length,muted);
 await command("unmute");await deliver(args("muted"));assert.equal(audio.length,muted,"unmute replayed delivery");
 await deliver(args("after-unmute"));assert.equal(audio.length,muted+per);finishAudio();
 // Restore the actual saved conversation and reload extension state.
 const saved=count();interactive.unsubscribe();await session.dispose();await open(true);
 assert.equal(count(),saved);await deliver(args("question"),"branch");assert.equal(count(),saved);assert.equal(audio.length,muted+per,"resume replayed old identity");
 unavailable=true;await deliver(args("missing-player","failure"));await new Promise(r=>setTimeout(r,0));
 const failed=audio.length;await deliver(args("failure-still-visible","failure"));assert.equal(audio.length,failed,"unavailable player retried");assert(rendered().includes("failure-still-visible"));
 interactive.unsubscribe();await session.dispose();await open(true,"json");await deliver(args("noninteractive"));assert.equal(audio.length,failed,"headless audio");
 interactive.unsubscribe();await session.dispose();unlinkSync(`${home}/config/calm-ship`);await open(true);await deliver(args("stock-silent"));assert.equal(audio.length,failed,"stock default unexpectedly enabled sound");
 console.log(`ok - non-live real Pi SDK ${JSON.parse(readFileSync(`${pkg}/package.json`)).version}: MAIN/branch delivery, native visible entries, four attention kinds, routine/internal silence, identities, rapid events, mute, resume and missing player; audio stubbed`);
}finally{interactive?.unsubscribe();await session?.dispose();assert.equal(active,0,"fixture left a player pending");}

process.exit(0);
