"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { cloudStore } from "../lib/storage";

// ============================================================================
//  MOMENTUM (hosted) — same planner, cloud-backed storage + auth
// ============================================================================

// ---- Design tokens ---------------------------------------------------------
const C = {
  ink: "#1C1A17", inkSoft: "#4A453E", faint: "#8A8278",
  line: "#E3DCCF", lineSoft: "#EFE9DD", paper: "#FBF8F1", card: "#FFFFFF",
  accent: "#B5532A", accentSoft: "#F2E2D6",
  gold: "#C8973F", goldSoft: "#F5EAD2",
  good: "#5C7A52", goodSoft: "#E7EEE2",
  blue: "#3E5C76", blueSoft: "#E1E8EF",
};
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const SANS = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// ---- Date helpers ----------------------------------------------------------
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const DOW = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MON = ["January","February","March","April","May","June","July","August","September","October","November","December"];
function startOfWeek(d){const x=new Date(d);const day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);x.setHours(0,0,0,0);return x;}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x;}
function weekKey(d){return ymd(startOfWeek(d));}
function quarterOf(d){return Math.floor(d.getMonth()/3)+1;}
function quarterKey(d){return `${d.getFullYear()}-Q${quarterOf(d)}`;}
function quarterMonths(q){const s=(q-1)*3;return [MON[s],MON[s+1],MON[s+2]];}
function prettyDate(d){return `${DOW[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;}
function weeksRemainingInQuarter(d){const q=quarterOf(d);const end=new Date(d.getFullYear(),q*3,0);const diff=Math.ceil((startOfWeek(end)-startOfWeek(d))/(7*864e5));return Math.max(0,diff);}
const monthKeyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}`;
const money = (n) => "€" + Math.round(n).toLocaleString();

// ---- Storage layer: cloud-backed (Supabase) -------------------------------
// Same interface (get/set/list) the planner expects, but data lives in the
// cloud so every device with your login stays in sync.
const store = cloudStore;

function usePersistentState(key, initial){
  const [val,setVal]=useState(initial);
  const [loaded,setLoaded]=useState(false);
  const t=useRef(null);
  useEffect(()=>{ let alive=true; (async()=>{ const v=await store.get(key); if(alive){ if(v!==null&&v!==undefined) setVal(v); else setVal(initial); setLoaded(true);} })(); return ()=>{alive=false;}; },[key]);
  useEffect(()=>{ if(!loaded) return; if(t.current) clearTimeout(t.current); t.current=setTimeout(()=>store.set(key,val),350); return ()=>t.current&&clearTimeout(t.current); },[key,val,loaded]);
  return [val,setVal,loaded];
}

// Read-only peek at another scope's stored data (re-reads when deps change).
function usePeek(key, dep){
  const [v,setV]=useState(null);
  useEffect(()=>{ let alive=true; (async()=>{ const r=await store.get(key); if(alive) setV(r); })(); return ()=>{alive=false;}; },[key,dep]);
  return v;
}

// The banner that shows what a page ladders up to — the connective tissue.
function LaddersUp({items}){
  const real=items.filter(it=>it && it.value && String(it.value).trim());
  if(real.length===0) return null;
  return (
    <div style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:24,padding:"12px 14px",background:"linear-gradient(90deg,#FBF4EC,#FAF7F0)",border:`1px solid ${C.lineSoft}`,borderRadius:12}}>
      {real.map((it,i)=>(
        <div key={i} style={{flex:"1 1 200px",minWidth:0}}>
          <div style={{fontFamily:SANS,fontSize:9.5,letterSpacing:".1em",textTransform:"uppercase",color:it.tone||C.gold,fontWeight:700,marginBottom:3,display:"flex",alignItems:"center",gap:5}}>
            <span>{it.icon}</span>{it.label}
          </div>
          <div style={{fontFamily:SERIF,fontSize:16,fontWeight:600,color:C.ink,lineHeight:1.25,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
//  UI primitives
// ============================================================================
function Field({label,value,onChange,placeholder,multiline,rows=2}){
  const base={width:"100%",border:"none",outline:"none",background:"transparent",fontFamily:SANS,fontSize:14,color:C.ink,resize:"none",lineHeight:1.7,padding:"2px 0"};
  return (
    <label style={{display:"block",marginBottom:14}}>
      {label && <div style={{fontSize:11,letterSpacing:".09em",textTransform:"uppercase",color:C.faint,marginBottom:5,fontFamily:SANS,fontWeight:600}}>{label}</div>}
      <div style={{borderBottom:`1px solid ${C.line}`,paddingBottom:3}}>
        {multiline
          ? <textarea rows={rows} value={value||""} placeholder={placeholder} onChange={(e)=>onChange(e.target.value)} style={base}/>
          : <input value={value||""} placeholder={placeholder} onChange={(e)=>onChange(e.target.value)} style={{...base,height:26}}/>}
      </div>
    </label>
  );
}
function SectionTitle({children,hint,tone=C.accent}){
  return (
    <div style={{marginBottom:12,marginTop:4}}>
      <div style={{fontFamily:SANS,fontWeight:700,fontSize:12,letterSpacing:".12em",textTransform:"uppercase",color:tone}}>{children}</div>
      {hint && <div style={{fontFamily:SANS,fontSize:12,color:C.faint,marginTop:3,lineHeight:1.5}}>{hint}</div>}
    </div>
  );
}

// Tappable "why" — expands to explain the purpose of a field and how to fill it well.
function Why({title,children,tone=C.accent}){
  const [open,setOpen]=useState(false);
  return (
    <div style={{marginBottom:open?2:0}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:open?8:0}}>
        <div style={{fontFamily:SANS,fontWeight:700,fontSize:12,letterSpacing:".12em",textTransform:"uppercase",color:tone}}>{title}</div>
        <button onClick={()=>setOpen(o=>!o)} aria-expanded={open} aria-label="why this matters"
          style={{width:18,height:18,borderRadius:"50%",border:`1.5px solid ${open?tone:C.line}`,background:open?tone:"transparent",color:open?"#fff":C.faint,fontFamily:SERIF,fontSize:12,fontWeight:700,fontStyle:"italic",cursor:"pointer",lineHeight:1,padding:0,flex:"none",display:"flex",alignItems:"center",justifyContent:"center"}}>i</button>
      </div>
      {open && (
        <div style={{background:"#FBF6EF",border:`1px solid ${C.lineSoft}`,borderLeft:`3px solid ${tone}`,borderRadius:8,padding:"10px 13px",marginBottom:10,fontFamily:SANS,fontSize:12.5,color:C.inkSoft,lineHeight:1.6}}>
          {children}
        </div>
      )}
    </div>
  );
}
function Check({on,onClick,size=22}){
  return (
    <button onClick={onClick} aria-pressed={on}
      style={{width:size,height:size,borderRadius:6,border:`1.5px solid ${on?C.accent:C.line}`,background:on?C.accent:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flex:"none",transition:"all .15s"}}>
      {on && <svg width={size*0.6} height={size*0.6} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
    </button>
  );
}
function SessionRow({value,onChange}){
  const v=value||{target:"",actual:"",filled:0};
  const set=(patch)=>onChange({...v,...patch});
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,marginTop:6,flexWrap:"wrap"}}>
      <input value={v.target} onChange={(e)=>set({target:e.target.value})} aria-label="target sessions" style={miniBox}/>
      <div style={{display:"flex",gap:6}}>
        {[0,1,2,3,4].map((i)=>{const on=i<v.filled;return (
          <button key={i} onClick={()=>set({filled:v.filled===i+1?i:i+1})} aria-label={`session ${i+1}`}
            style={{width:20,height:20,borderRadius:"50%",border:`1.5px solid ${on?C.accent:C.line}`,background:on?C.accent:"transparent",cursor:"pointer",padding:0,transition:"all .15s"}}/>
        );})}
      </div>
      <input value={v.actual} onChange={(e)=>set({actual:e.target.value})} aria-label="actual sessions" style={miniBox}/>
      <div style={{fontFamily:SANS,fontSize:10,color:C.faint}}>target · 30-min sessions · actual</div>
    </div>
  );
}
const miniBox={width:30,height:30,textAlign:"center",border:`1.5px solid ${C.line}`,borderRadius:6,fontFamily:SANS,fontSize:13,color:C.ink,outline:"none",background:C.paper};

// ---- Lightweight SVG charts (no external deps) -----------------------------
function LineChart({series,labels,height=200,yMax,targetLine,fmt=(v)=>v,colors}){
  const pad={l:44,r:14,t:14,b:26};
  const W=640,H=height;
  const allVals=series.flatMap(s=>s.data).filter(v=>v!=null);
  const maxV=yMax!=null?yMax:Math.max(1,...allVals,targetLine?.[targetLine.length-1]||0)*1.1;
  const n=labels.length;
  const x=(i)=> pad.l + (n<=1?0:(i/(n-1))*(W-pad.l-pad.r));
  const y=(v)=> H-pad.b - (v/maxV)*(H-pad.t-pad.b);
  const palette=colors||[C.accent,C.blue,C.good];
  const gridY=[0,0.25,0.5,0.75,1].map(f=>f*maxV);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto",display:"block"}}>
      {gridY.map((gv,i)=>(
        <g key={i}>
          <line x1={pad.l} x2={W-pad.r} y1={y(gv)} y2={y(gv)} stroke={C.lineSoft} strokeWidth="1"/>
          <text x={pad.l-8} y={y(gv)+4} textAnchor="end" fontFamily={SANS} fontSize="10" fill={C.faint}>{fmt(gv)}</text>
        </g>
      ))}
      {targetLine && (
        <polyline fill="none" stroke={C.gold} strokeWidth="2" strokeDasharray="5 4"
          points={targetLine.map((v,i)=>`${x(i)},${y(v)}`).join(" ")}/>
      )}
      {series.map((s,si)=>(
        <g key={si}>
          <polyline fill="none" stroke={palette[si%palette.length]} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
            points={s.data.map((v,i)=>v==null?null:`${x(i)},${y(v)}`).filter(Boolean).join(" ")}/>
          {s.data.map((v,i)=>v==null?null:<circle key={i} cx={x(i)} cy={y(v)} r="3" fill={palette[si%palette.length]}/>)}
        </g>
      ))}
      {labels.map((lb,i)=> (i===0||i===n-1||i===Math.floor(n/2)) ? <text key={i} x={x(i)} y={H-8} textAnchor="middle" fontFamily={SANS} fontSize="10" fill={C.faint}>{lb}</text> : null)}
    </svg>
  );
}
function BarChart({data,labels,height=160,color=C.accent,fmt=(v)=>v}){
  const pad={l:40,r:12,t:12,b:24};
  const W=640,H=height;
  const maxV=Math.max(1,...data);
  const n=data.length;
  const bw=(W-pad.l-pad.r)/n*0.62;
  const x=(i)=> pad.l + (i+0.5)/n*(W-pad.l-pad.r);
  const y=(v)=> H-pad.b-(v/maxV)*(H-pad.t-pad.b);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto",display:"block"}}>
      {[0,0.5,1].map((f,i)=>(
        <g key={i}>
          <line x1={pad.l} x2={W-pad.r} y1={y(f*maxV)} y2={y(f*maxV)} stroke={C.lineSoft}/>
          <text x={pad.l-6} y={y(f*maxV)+4} textAnchor="end" fontFamily={SANS} fontSize="10" fill={C.faint}>{fmt(f*maxV)}</text>
        </g>
      ))}
      {data.map((v,i)=>(
        <rect key={i} x={x(i)-bw/2} y={y(v)} width={bw} height={Math.max(0,H-pad.b-y(v))} rx="3" fill={color} opacity={v>0?0.92:0.25}/>
      ))}
      {labels.map((lb,i)=> (n<=12||i%Math.ceil(n/12)===0) ? <text key={i} x={x(i)} y={H-8} textAnchor="middle" fontFamily={SANS} fontSize="9" fill={C.faint}>{lb}</text>:null)}
    </svg>
  );
}

// ============================================================================
//  DAILY
// ============================================================================
const MOODS=["😞","😕","😐","🙂","😄"];
const emptyTask=()=>({text:"",done:false,sessions:{target:"",actual:"",filled:0}});

function DailyView({date,data,update,ladder}){
  const d=data||{};
  const setK=(k,v)=>update({...d,[k]:v});
  const tasks=d.tasks||[emptyTask(),emptyTask(),emptyTask(),emptyTask(),emptyTask()];
  const setTask=(i,patch)=>setK("tasks",tasks.map((t,idx)=>idx===i?{...t,...patch}:t));
  const hours=[];for(let h=6;h<=23;h++){hours.push(`${pad(h)}:00`);hours.push(`${pad(h)}:30`);}
  const earlyHours=["00:00","00:30","01:00","01:30","02:00","02:30","03:00","03:30","04:00","04:30","05:00","05:30"];
  const [showEarly,setShowEarly]=useState(false);
  const allHours=showEarly?[...earlyHours,...hours]:hours;
  const schedule=d.schedule||{};
  const setHour=(h,v)=>setK("schedule",{...schedule,[h]:v});
  const taskLabel=(i)=>i===0?"Most important task":i<3?`Secondary task ${i}`:`Additional task ${i+1}`;
  return (
    <div>
      <PageHead eyebrow={DOW[date.getDay()].toUpperCase()} title={prettyDate(date)}/>
      <LaddersUp items={ladder}/>
      <div style={{display:"grid",gridTemplateColumns:"minmax(0,1.15fr) minmax(0,1fr)",gap:36}} className="daily-grid">
        <div>
          <Field label="I'm grateful for" value={d.grateful} onChange={(v)=>setK("grateful",v)} placeholder="…" multiline rows={2}/>
          <Field label="Intention for the day" value={d.intention} onChange={(v)=>setK("intention",v)} placeholder="If today goes well, what made it good?"/>
          {tasks.map((t,i)=>(
            <div key={i} style={{marginBottom:16,paddingBottom:14,borderBottom:i<4?`1px solid ${C.lineSoft}`:"none"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                <div style={{fontFamily:SERIF,fontSize:22,fontWeight:600,color:i===0?C.accent:C.faint,width:22,lineHeight:1.2,flex:"none"}}>{i===0?"★":i+1}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,letterSpacing:".08em",textTransform:"uppercase",color:C.faint,fontFamily:SANS,fontWeight:600,marginBottom:2}}>{taskLabel(i)}</div>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <Check on={t.done} onClick={()=>setTask(i,{done:!t.done})} size={20}/>
                    <input value={t.text} onChange={(e)=>setTask(i,{text:e.target.value})} placeholder="…"
                      style={{flex:1,border:"none",borderBottom:`1px solid ${C.line}`,outline:"none",background:"transparent",fontFamily:SANS,fontSize:14,color:t.done?C.faint:C.ink,textDecoration:t.done?"line-through":"none",padding:"3px 0"}}/>
                  </div>
                  <SessionRow value={t.sessions} onChange={(s)=>setTask(i,{sessions:s})}/>
                </div>
              </div>
            </div>
          ))}
          <div style={{marginTop:18}}>
            <Field label="Highlight of the day" value={d.highlight} onChange={(v)=>setK("highlight",v)} placeholder="…"/>
            <Field label="What did I learn today?" value={d.learned} onChange={(v)=>setK("learned",v)} placeholder="…" multiline rows={2}/>
            <Field label="What do I want to remember from today?" value={d.remember} onChange={(v)=>setK("remember",v)} placeholder="…" multiline rows={2}/>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:20,marginTop:8,flexWrap:"wrap"}}>
            <div>
              <div style={lblMini}>Mood</div>
              <div style={{display:"flex",gap:4}}>
                {MOODS.map((m,i)=>(<button key={i} onClick={()=>setK("mood",i)} style={{fontSize:22,opacity:d.mood===i?1:0.32,background:"none",border:"none",cursor:"pointer",padding:2,transform:d.mood===i?"scale(1.18)":"none",transition:"all .15s"}}>{m}</button>))}
              </div>
            </div>
            <div>
              <div style={lblMini}>Rate the day</div>
              <div style={{display:"flex",gap:6}}>
                {[1,2,3,4,5].map((n)=>(<button key={n} onClick={()=>setK("rating",n)} style={{width:28,height:28,borderRadius:"50%",border:`1.5px solid ${d.rating===n?C.gold:C.line}`,background:d.rating===n?C.gold:"transparent",color:d.rating===n?"#fff":C.faint,fontFamily:SANS,fontSize:13,fontWeight:600,cursor:"pointer"}}>{n}</button>))}
              </div>
            </div>
          </div>
        </div>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8}}>
            <SectionTitle>Daily planning</SectionTitle>
            <button onClick={()=>setShowEarly((s)=>!s)} style={{fontFamily:SANS,fontSize:11,color:C.accent,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>{showEarly?"− hide 0:00–5:30":"+ show 0:00–5:30"}</button>
          </div>
          <div style={{border:`1px solid ${C.lineSoft}`,borderRadius:10,overflow:"hidden"}}>
            {allHours.map((h,i)=>(
              <div key={h} style={{display:"flex",alignItems:"center",borderBottom:i<allHours.length-1?`1px solid ${C.lineSoft}`:"none",background:h.endsWith(":00")?C.card:"#FCFAF5"}}>
                <div style={{width:50,fontFamily:SANS,fontSize:11,color:h.endsWith(":00")?C.inkSoft:C.faint,fontWeight:h.endsWith(":00")?600:400,padding:"0 10px",flex:"none",textAlign:"right"}}>{h}</div>
                <input value={schedule[h]||""} onChange={(e)=>setHour(h,e.target.value)} style={{flex:1,border:"none",outline:"none",background:"transparent",fontFamily:SANS,fontSize:13,color:C.ink,padding:"7px 10px"}}/>
              </div>
            ))}
          </div>
          <div style={{marginTop:18}}>
            <SectionTitle>Notes</SectionTitle>
            <textarea value={d.notes||""} onChange={(e)=>setK("notes",e.target.value)} placeholder="…" rows={6} style={{width:"100%",border:`1px solid ${C.lineSoft}`,borderRadius:10,outline:"none",background:C.card,fontFamily:SANS,fontSize:14,color:C.ink,padding:12,resize:"vertical",lineHeight:1.7}}/>
          </div>
        </div>
      </div>
    </div>
  );
}
const lblMini={fontSize:10,letterSpacing:".08em",textTransform:"uppercase",color:C.faint,fontFamily:SANS,fontWeight:600,marginBottom:6};

// ============================================================================
//  WEEKLY
// ============================================================================
function WeeklyView({weekStart,data,update,ladder}){
  const d=data||{};
  const setK=(k,v)=>update({...d,[k]:v});
  const list=(key,n)=>{const arr=d[key]||Array.from({length:n},()=>({text:"",done:false}));const setItem=(i,patch)=>setK(key,arr.map((x,idx)=>idx===i?{...x,...patch}:x));return {arr,setItem};};
  const secondary=list("secondary",3),additional=list("additional",7);
  const weekEnd=addDays(weekStart,6);
  const rangeLabel=`${MON[weekStart.getMonth()].slice(0,3)} ${weekStart.getDate()} – ${MON[weekEnd.getMonth()].slice(0,3)} ${weekEnd.getDate()}`;
  const TaskList=({ctrl,startIndex=1})=>ctrl.arr.map((t,i)=>(
    <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:9}}>
      <span style={{fontFamily:SANS,fontSize:12,color:C.faint,width:16,fontWeight:600}}>{startIndex+i}.</span>
      <Check on={t.done} onClick={()=>ctrl.setItem(i,{done:!t.done})} size={18}/>
      <input value={t.text} onChange={(e)=>ctrl.setItem(i,{text:e.target.value})} placeholder="…" style={{flex:1,border:"none",borderBottom:`1px solid ${C.line}`,outline:"none",background:"transparent",fontFamily:SANS,fontSize:14,color:t.done?C.faint:C.ink,textDecoration:t.done?"line-through":"none",padding:"3px 0"}}/>
    </div>
  ));
  return (
    <div>
      <PageHead eyebrow="WEEKLY PLANNING" title={`Week of ${rangeLabel}`} sub={`The sprint toward your quarter, one week at a time · ${weekStart.getFullYear()}`}/>
      <LaddersUp items={ladder}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:36}} className="daily-grid">
        <div>
          <div style={{background:C.accentSoft,borderRadius:10,padding:"14px 16px",marginBottom:22}}>
            <Why title="Most important task of the week" tone={C.accent}>
              The <b>one</b> thing that, if it were the only thing you finished all week, you'd still call the week a win. Just one. It should ladder up to your quarter's main rock (shown at the top). Make it specific enough that you'll know for certain whether you did it — "launch and test my coaching offer to 50 leads," not "work on the offer." This single-priority discipline is the whole point: most people fail because everything is priority #1.
            </Why>
            <input value={d.mit||""} onChange={(e)=>setK("mit",e.target.value)} placeholder="…" style={{width:"100%",border:"none",borderBottom:`1.5px solid ${C.accent}`,outline:"none",background:"transparent",fontFamily:SERIF,fontSize:20,fontWeight:600,color:C.ink,padding:"4px 0"}}/>
          </div>
          <Why title="Secondary tasks of importance">
            The 2–3 things that matter — but only <b>after</b> the MIT is done. They support the same direction. The rule is real: don't touch these until the most important task is complete. That ordering stops you from doing easy busywork to dodge the hard, important thing.
          </Why>
          <TaskList ctrl={secondary} startIndex={1}/>
          <div style={{height:18}}/>
          <Why title="Additional tasks">
            Everything else — errands, admin, smaller stuff. The overflow bucket, genuinely "nice if I get to them." Don't let this list seduce you: knocking out seven small tasks <i>feels</i> productive, but if your MIT didn't move, the week didn't move.
          </Why>
          <TaskList ctrl={additional} startIndex={4}/>
        </div>
        <div>
          <Why title="Intention for the week">
            Not a task — the <b>theme</b> or feeling you want the week to have. One line. Think "who am I being this week," not "what am I doing." Like "outbound machine — volume over perfection" or "protect deep work, say no to noise." It's the lens you check decisions against when something comes up.
          </Why>
          <Field value={d.intention} onChange={(v)=>setK("intention",v)} placeholder="What's the theme of this week?" multiline rows={2}/>
          <div style={{height:6}}/>
          <Why title="Self-care commitment">
            One concrete action to keep yourself functioning — not vague "rest more." Make it measurable so you can tick it: "3 gym sessions," "phone off by 10:30, lights out." You run hard; this is the line that keeps the engine from breaking.
          </Why>
          <Field value={d.selfcare} onChange={(v)=>setK("selfcare",v)} placeholder="…" multiline rows={2}/>
          <div style={{height:6}}/>
          <Why title="Weekly overview">
            The logistics radar. Deadlines, calls, appointments — the things <i>happening</i> this week, work and personal, so nothing ambushes you. Pure facts, not goals: "Tuesday set with Carl, German class Wednesday, payment due Friday."
          </Why>
          <Field value={d.overview} onChange={(v)=>setK("overview",v)} placeholder="…" multiline rows={6}/>
          <div style={{marginTop:10}}>
            <SectionTitle>Highlights this week</SectionTitle>
            <Field value={d.highlights} onChange={(v)=>setK("highlights",v)} placeholder="What are you looking forward to?" multiline rows={4}/>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
//  REVIEW
// ============================================================================
function ReviewView({weekStart,data,update,weeksRemaining}){
  const d=data||{};
  const setK=(k,v)=>update({...d,[k]:v});
  const grat=d.gratitude||["","",""];
  const setGrat=(i,v)=>setK("gratitude",grat.map((x,idx)=>idx===i?v:x));
  const weekEnd=addDays(weekStart,6);
  const rangeLabel=`${MON[weekStart.getMonth()].slice(0,3)} ${weekStart.getDate()} – ${MON[weekEnd.getMonth()].slice(0,3)} ${weekEnd.getDate()}`;
  return (
    <div>
      <PageHead eyebrow="WEEKLY REVIEW" title={`Week of ${rangeLabel}`} sub="All you need is the plan, the road map, and the courage to press on."/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:36}} className="daily-grid">
        <div>
          <SectionTitle hint="What's going well? Any wins, big or little, this week?">Weekly wins</SectionTitle>
          <Field value={d.wins} onChange={(v)=>setK("wins",v)} placeholder="…" multiline rows={4}/>
          <SectionTitle>Favorite moment of the week</SectionTitle>
          <Field label="Personal" value={d.momentPersonal} onChange={(v)=>setK("momentPersonal",v)} placeholder="…"/>
          <Field label="Professional" value={d.momentPro} onChange={(v)=>setK("momentPro",v)} placeholder="…"/>
          <SectionTitle hint="Three things you were grateful for this week.">Gratitude</SectionTitle>
          {grat.map((g,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:9}}>
              <span style={{fontFamily:SERIF,fontSize:18,color:C.gold,width:16,fontWeight:600}}>{i+1}.</span>
              <input value={g} onChange={(e)=>setGrat(i,e.target.value)} placeholder="…" style={{flex:1,border:"none",borderBottom:`1px solid ${C.line}`,outline:"none",background:"transparent",fontFamily:SANS,fontSize:14,color:C.ink,padding:"3px 0"}}/>
            </div>
          ))}
          <div style={{height:10}}/>
          <SectionTitle hint="What wasn't completed? Recommit to finishing these next week.">Review tasks from last week</SectionTitle>
          <Field value={d.incomplete} onChange={(v)=>setK("incomplete",v)} placeholder="…" multiline rows={4}/>
        </div>
        <div>
          <div style={{background:C.goodSoft,borderRadius:10,padding:"14px 16px",marginBottom:22}}>
            <SectionTitle tone={C.good} hint="Did you make progress on your quarterly rocks? Are you on track? What moves the needle next week?">Quarterly rocks check-in</SectionTitle>
            <Field value={d.rocks} onChange={(v)=>setK("rocks",v)} placeholder="…" multiline rows={5}/>
          </div>
          <SectionTitle hint="What worked or didn't? What will you start, stop, or improve?">Learn and adapt</SectionTitle>
          <Field value={d.adapt} onChange={(v)=>setK("adapt",v)} placeholder="…" multiline rows={4}/>
          <SectionTitle hint="Anything else you want to highlight or remember?">Additional</SectionTitle>
          <Field value={d.additional} onChange={(v)=>setK("additional",v)} placeholder="…" multiline rows={3}/>
          <SectionTitle hint="Who should you connect or follow up with next week?">People</SectionTitle>
          <Field label="Personal" value={d.peoplePersonal} onChange={(v)=>setK("peoplePersonal",v)} placeholder="…"/>
          <Field label="Professional" value={d.peoplePro} onChange={(v)=>setK("peoplePro",v)} placeholder="…"/>
          <div style={{marginTop:14,padding:"12px 14px",border:`1px solid ${C.lineSoft}`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontFamily:SANS,fontSize:11,letterSpacing:".1em",textTransform:"uppercase",color:C.faint,fontWeight:600}}>Weeks remaining in quarter</span>
            <span style={{fontFamily:SERIF,fontSize:30,fontWeight:600,color:C.accent}}>{weeksRemaining}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
//  VISION — the top of the ladder; everything traces back here
// ============================================================================
function VisionView({data,update}){
  const d=data||{};
  const setK=(k,v)=>update({...d,[k]:v});
  const pillars=d.pillars||["","",""];
  const setPillar=(i,v)=>setK("pillars",pillars.map((x,idx)=>idx===i?v:x));
  return (
    <div>
      <PageHead eyebrow="VISION" title="The best version of me" sub="The summit everything else climbs toward. Read it often."/>
      <div style={{maxWidth:720,margin:"0 auto"}}>
        <div style={{background:"linear-gradient(135deg,#FBF1E6,#F7F3EA)",border:`1px solid ${C.lineSoft}`,borderRadius:14,padding:"22px 24px",marginBottom:26}}>
          <SectionTitle tone={C.accent} hint="One paragraph, present tense, as if it's already true. Who are you, where, doing what?">My vision</SectionTitle>
          <textarea value={d.vision||""} onChange={(e)=>setK("vision",e.target.value)} rows={5}
            placeholder="I run a location-independent business that earns 10–20K/month. I'm fit, healthy, and based somewhere warm. My personal brand pulls opportunities to me. I have a family and the freedom to live on my terms…"
            style={{width:"100%",border:"none",borderBottom:`1.5px solid ${C.accent}`,outline:"none",background:"transparent",fontFamily:SERIF,fontSize:20,fontWeight:500,color:C.ink,padding:"4px 0",lineHeight:1.5,resize:"vertical"}}/>
        </div>

        <SectionTitle tone={C.gold} hint="The 1-year north star. Concrete and measurable — you'll know if you hit it.">This year's #1 goal</SectionTitle>
        <input value={d.yearGoal||""} onChange={(e)=>setK("yearGoal",e.target.value)} placeholder="e.g. Consistent 10K/month and a personal brand that compounds"
          style={{width:"100%",border:"none",borderBottom:`1.5px solid ${C.gold}`,outline:"none",background:"transparent",fontFamily:SERIF,fontSize:22,fontWeight:600,color:C.ink,padding:"6px 0",marginBottom:24}}/>

        <SectionTitle tone={C.blue} hint="The 3–4 areas of life you're building. Your content pillars, your domains of growth.">Life pillars</SectionTitle>
        {pillars.map((p,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <span style={{fontFamily:SERIF,fontSize:18,color:C.blue,width:18,fontWeight:600}}>{i+1}.</span>
            <input value={p} onChange={(e)=>setPillar(i,e.target.value)} placeholder={["e.g. Sales mastery & income","e.g. Health, training & physique","e.g. Brand, content & freedom"][i]||"…"}
              style={{flex:1,border:"none",borderBottom:`1px solid ${C.line}`,outline:"none",background:"transparent",fontFamily:SANS,fontSize:15,color:C.ink,padding:"4px 0"}}/>
          </div>
        ))}
        <button onClick={()=>setK("pillars",[...pillars,""])} style={{fontFamily:SANS,fontSize:12,color:C.blue,background:"none",border:"none",cursor:"pointer",fontWeight:600,marginTop:4}}>+ add pillar</button>

        <div style={{marginTop:28}}>
          <SectionTitle tone={C.good} hint="Why does this matter? What's the deeper reason you're doing all this?">My why</SectionTitle>
          <Field value={d.why} onChange={(v)=>setK("why",v)} placeholder="…" multiline rows={3}/>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
//  QUARTERLY
// ============================================================================
const FOCUS_AREAS=["Health / Well-being","Self-growth","Giving / Contributing","Love / Romance","Family / Friends","Creativity / Learning","Spiritual","Time Management","Happiness","Professional","Financial"];
function QuarterlyView({qKey,data,update,ladder}){
  const d=data||{};
  const setK=(k,v)=>update({...d,[k]:v});
  const rocks=d.rocks||Array.from({length:7},()=>"");
  const setRock=(i,v)=>setK("rocks",rocks.map((x,idx)=>idx===i?v:x));
  const focus=d.focus||[];
  const toggleFocus=(f)=>setK("focus",focus.includes(f)?focus.filter(x=>x!==f):[...focus,f]);
  const [yr,q]=qKey.split("-Q");
  const months=quarterMonths(Number(q));
  return (
    <div>
      <PageHead eyebrow="QUARTERLY PLANNING" title={`Q${q} ${yr}`} sub={`${months.join(" · ")} — the 90-day horizon`}/>
      <LaddersUp items={ladder}/>
      <div style={{background:C.accentSoft,borderRadius:12,padding:"18px 20px",marginBottom:26}}>
        <div style={{fontSize:11,letterSpacing:".12em",textTransform:"uppercase",color:C.accent,fontFamily:SANS,fontWeight:700,marginBottom:6}}>Theme for the quarter</div>
        <input value={d.theme||""} onChange={(e)=>setK("theme",e.target.value)} placeholder="e.g. Freedom and Scale" style={{width:"100%",border:"none",borderBottom:`1.5px solid ${C.accent}`,outline:"none",background:"transparent",fontFamily:SERIF,fontSize:28,fontWeight:600,color:C.ink,padding:"4px 0"}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:36}} className="daily-grid">
        <div>
          <Why title="Most important rocks">
            Your top 3–7 priorities for the next 90 days, ranked. "Rocks" because they're the big things you fit in first — if you fill the jar with sand (small tasks) first, the rocks never fit. Test each one: <i>"If this were the only thing I accomplished in 90 days, would I be satisfied?"</i> Rank them honestly — #1 is what everything else bends around.
          </Why>
          {rocks.map((r,i)=>(
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:11}}>
              <span style={{fontFamily:SERIF,fontSize:20,color:i===0?C.accent:C.faint,width:18,fontWeight:600,lineHeight:1.4}}>{i+1}.</span>
              <textarea value={r} onChange={(e)=>setRock(i,e.target.value)} placeholder={i===0?"Your #1 rock…":"…"} rows={1} style={{flex:1,border:"none",borderBottom:`1px solid ${C.line}`,outline:"none",background:"transparent",fontFamily:SANS,fontSize:14,color:C.ink,padding:"3px 0",resize:"none",lineHeight:1.6}}/>
            </div>
          ))}
          <div style={{height:18}}/>
          <SectionTitle>Focus areas this quarter</SectionTitle>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {FOCUS_AREAS.map((f)=>{const on=focus.includes(f);return (
              <button key={f} onClick={()=>toggleFocus(f)} style={{fontFamily:SANS,fontSize:12,padding:"6px 12px",borderRadius:20,border:`1.5px solid ${on?C.accent:C.line}`,background:on?C.accent:"transparent",color:on?"#fff":C.inkSoft,cursor:"pointer",fontWeight:on?600:400,transition:"all .15s"}}>{f}</button>
            );})}
          </div>
          <div style={{height:22}}/>
          <SectionTitle hint="What relationships need attention? Treat them as a priority, not an afterthought.">Relationships</SectionTitle>
          <Field label="Personal" value={d.relPersonal} onChange={(v)=>setK("relPersonal",v)} placeholder="…" multiline rows={2}/>
          <Field label="Professional" value={d.relPro} onChange={(v)=>setK("relPro",v)} placeholder="…" multiline rows={2}/>
        </div>
        <div>
          <div style={{background:C.goldSoft,borderRadius:10,padding:"14px 16px",marginBottom:20}}>
            <Why title="Most important rock of the quarter ★" tone={C.gold}>
              Of your rocks, the single one that matters most — the domino that knocks the others down. This is what shows up on your weekly and daily pages as the thing to serve. Pick the one that, if you nail only it this quarter, moves you furthest toward the year's goal.
            </Why>
            <input value={d.mainRock||""} onChange={(e)=>setK("mainRock",e.target.value)} placeholder="The one that matters most…" style={{width:"100%",border:"none",borderBottom:`1.5px solid ${C.gold}`,outline:"none",background:"transparent",fontFamily:SERIF,fontSize:19,fontWeight:600,color:C.ink,padding:"4px 0",marginBottom:12}}/>
            <Why title="Your why" tone={C.gold}>
              The reason this rock matters. When motivation dips mid-quarter, this is what you come back to. Connect it to your vision: not "hit 10K" but "10K means I can travel, invest in growth, and stop trading time for safety." A strong why survives hard weeks.
            </Why>
            <Field value={d.why} onChange={(v)=>setK("why",v)} placeholder="Why is this important? How does it move you toward your vision?" multiline rows={3}/>
          </div>
          <SectionTitle hint="A few actions that move this rock forward.">Supporting actions / tasks</SectionTitle>
          <Field value={d.actions} onChange={(v)=>setK("actions",v)} placeholder="…" multiline rows={4}/>
          <SectionTitle hint="What can help you achieve this?">Resources</SectionTitle>
          <Field value={d.resources} onChange={(v)=>setK("resources",v)} placeholder="…" multiline rows={3}/>
          <SectionTitle hint="When will you accomplish this by? Break it down by month.">Timeline</SectionTitle>
          {months.map((m)=>(<Field key={m} label={m} value={(d.timeline||{})[m]} onChange={(v)=>setK("timeline",{...(d.timeline||{}),[m]:v})} placeholder="…"/>))}
          <SectionTitle hint="Do these only after you've completed the above tasks.">Reward</SectionTitle>
          <Field value={d.reward} onChange={(v)=>setK("reward",v)} placeholder="How will you celebrate?" multiline rows={2}/>
          <SectionTitle hint="What will you do for fun? What brings you joy?">Fun</SectionTitle>
          <Field value={d.fun} onChange={(v)=>setK("fun",v)} placeholder="…" multiline rows={3}/>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
//  HABITS  (+ streak calc surfaced)
// ============================================================================
function currentStreak(col, daysInMonth, todayDay){
  // counts consecutive marked days ending at the most recent marked day up to today
  let streak=0;
  for(let day=Math.min(todayDay,daysInMonth); day>=1; day--){
    if(col[day]) streak++;
    else if(day<=todayDay) break;
  }
  return streak;
}
function HabitView({monthKey,data,update,isCurrentMonth,today}){
  const d=data||{};
  const setK=(k,v)=>update({...d,[k]:v});
  const habits=d.habits||["","","","","","","",""];
  const marks=d.marks||{};
  const [y,m]=monthKey.split("-").map(Number);
  const daysInMonth=new Date(y,m,0).getDate();
  const todayDay=isCurrentMonth?today.getDate():daysInMonth;
  const setHabit=(i,v)=>setK("habits",habits.map((x,idx)=>idx===i?v:x));
  const toggleMark=(hi,day)=>{const col=marks[hi]||{};setK("marks",{...marks,[hi]:{...col,[day]:!col[day]}});};
  const total=(hi)=>Object.values(marks[hi]||{}).filter(Boolean).length;
  const slots=[0,1,2,3,4,5,6,7];
  const activeStreaks=slots.filter(i=>(habits[i]||"").trim()).map(i=>({name:habits[i],streak:currentStreak(marks[i]||{},daysInMonth,todayDay),total:total(i)}));
  return (
    <div>
      <PageHead eyebrow="HABIT TRACKER" title={`${MON[m-1]} ${y}`} sub="Small dots, compounded daily, become who you are."/>
      {activeStreaks.length>0 && (
        <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:20,justifyContent:"center"}}>
          {activeStreaks.map((s,i)=>(
            <div key={i} style={{background:s.streak>0?C.goodSoft:C.lineSoft,borderRadius:10,padding:"8px 14px",textAlign:"center",minWidth:96}}>
              <div style={{fontFamily:SERIF,fontSize:24,fontWeight:600,color:s.streak>0?C.good:C.faint}}>{s.streak>0?`🔥${s.streak}`:"—"}</div>
              <div style={{fontFamily:SANS,fontSize:10,color:C.inkSoft,marginTop:2,maxWidth:110,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{overflowX:"auto",border:`1px solid ${C.lineSoft}`,borderRadius:12}}>
        <table style={{borderCollapse:"collapse",width:"100%",minWidth:620}}>
          <thead>
            <tr>
              <th style={{position:"sticky",left:0,background:C.card,width:40,padding:"10px 6px",borderBottom:`2px solid ${C.line}`,borderRight:`1px solid ${C.lineSoft}`,fontFamily:SANS,fontSize:10,color:C.faint,fontWeight:700,letterSpacing:".06em"}}>DAY</th>
              {slots.map((i)=>(
                <th key={i} style={{padding:"8px 4px",borderBottom:`2px solid ${C.line}`,minWidth:64,verticalAlign:"bottom"}}>
                  <input value={habits[i]||""} onChange={(e)=>setHabit(i,e.target.value)} placeholder={`Habit ${i+1}`} style={{width:"100%",border:"none",borderBottom:`1px solid ${C.line}`,outline:"none",background:"transparent",fontFamily:SANS,fontSize:11,color:C.ink,padding:"2px 0",textAlign:"center"}}/>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({length:daysInMonth},(_,di)=>{
              const day=di+1;const isToday=isCurrentMonth&&day===todayDay;
              return (
                <tr key={day} style={{background:isToday?C.accentSoft:(day%2?"#FCFAF5":C.card)}}>
                  <td style={{position:"sticky",left:0,background:isToday?C.accentSoft:(day%2?"#FCFAF5":C.card),textAlign:"center",fontFamily:SANS,fontSize:11,color:isToday?C.accent:C.inkSoft,padding:"0 6px",borderRight:`1px solid ${C.lineSoft}`,fontWeight:isToday?700:500}}>{day}</td>
                  {slots.map((hi)=>{const on=(marks[hi]||{})[day];const disabled=!(habits[hi]||"").trim();return (
                    <td key={hi} style={{textAlign:"center",padding:"3px 0"}}>
                      <button onClick={()=>!disabled&&toggleMark(hi,day)} disabled={disabled} aria-label={`day ${day} habit ${hi+1}`} style={{width:18,height:18,borderRadius:"50%",border:`1.5px solid ${on?C.good:(disabled?"#EEE8DC":C.line)}`,background:on?C.good:"transparent",cursor:disabled?"default":"pointer",padding:0,transition:"all .12s"}}/>
                    </td>
                  );})}
                </tr>
              );
            })}
            <tr>
              <td style={{position:"sticky",left:0,background:C.accentSoft,textAlign:"center",fontFamily:SANS,fontSize:10,color:C.accent,fontWeight:700,padding:"8px 6px",borderTop:`2px solid ${C.line}`,borderRight:`1px solid ${C.lineSoft}`}}>TOT</td>
              {slots.map((hi)=>(<td key={hi} style={{textAlign:"center",fontFamily:SERIF,fontSize:18,fontWeight:600,color:C.accent,borderTop:`2px solid ${C.line}`,background:C.accentSoft,padding:"4px 0"}}>{(habits[hi]||"").trim()?total(hi):""}</td>))}
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{fontFamily:SANS,fontSize:12,color:C.faint,marginTop:12,lineHeight:1.6}}>Name a habit at the top of any column, then tap a dot for each day you do it. Streaks show at the top; totals at the bottom. Swipe sideways on mobile.</div>
    </div>
  );
}

// ============================================================================
//  INCOME  — deal log + revenue vs. target chart, rolls up to monthly totals
// ============================================================================
function IncomeView({monthKey,data,update,goals,setGoals}){
  const d=data||{};
  const deals=d.deals||[];
  const base=d.base!=null?d.base:0;
  const [y,m]=monthKey.split("-").map(Number);
  const daysInMonth=new Date(y,m,0).getDate();
  const target=(goals?.[monthKey]!=null)?goals[monthKey]:(goals?.default||5000);

  const [form,setForm]=useState({amount:"",day:String(new Date().getDate()),offer:"",client:""});
  const addDeal=()=>{
    const amt=parseFloat(form.amount);
    if(!amt||amt<=0) return;
    const day=Math.min(Math.max(parseInt(form.day)||1,1),daysInMonth);
    update({...d,deals:[...deals,{id:Date.now(),amount:amt,day,offer:form.offer,client:form.client}]});
    setForm({amount:"",day:String(new Date().getDate()),offer:form.offer,client:""});
  };
  const removeDeal=(id)=>update({...d,deals:deals.filter(x=>x.id!==id)});

  const commission=deals.reduce((s,x)=>s+x.amount,0);
  const monthTotal=commission+base;
  const pct=target>0?Math.min(100,Math.round(monthTotal/target*100)):0;
  const dealCount=deals.length;
  const avgDeal=dealCount?commission/dealCount:0;

  // cumulative-by-day series + straight target pace line; base is the day-1 floor
  const cum=[]; let run=base;
  const byDay={}; deals.forEach(x=>{byDay[x.day]=(byDay[x.day]||0)+x.amount;});
  for(let day=1;day<=daysInMonth;day++){ run+=byDay[day]||0; cum.push(run); }
  const targetPace=Array.from({length:daysInMonth},(_,i)=>target*((i+1)/daysInMonth));
  const labels=Array.from({length:daysInMonth},(_,i)=>String(i+1));

  const sorted=[...deals].sort((a,b)=>a.day-b.day);
  const remaining=Math.max(0,target-monthTotal);
  const dayNow=new Date().getDate();
  const isThisMonth = (new Date().getFullYear()===y && (new Date().getMonth()+1)===m);
  const effectiveDay = isThisMonth?dayNow:daysInMonth;
  const expectedByNow=target*(Math.min(effectiveDay,daysInMonth)/daysInMonth);
  const pace=monthTotal-expectedByNow; // positive = ahead
  const daysLeft=Math.max(0,daysInMonth-effectiveDay);
  const avgForNeed = avgDeal>0?avgDeal:0;
  const dealsNeeded = (avgForNeed>0 && remaining>0)?Math.ceil(remaining/avgForNeed):0;

  return (
    <div>
      <PageHead eyebrow="INCOME" title={`${MON[m-1]} ${y}`} sub="Log every deal. Watch the line climb toward your number."/>

      {/* target setter */}
      <div style={{display:"flex",gap:14,flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",marginBottom:14,padding:"14px 18px",background:C.goldSoft,borderRadius:12}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontFamily:SANS,fontSize:12,fontWeight:600,color:C.inkSoft,letterSpacing:".04em"}}>MONTHLY TARGET €</span>
          <input value={target} onChange={(e)=>setGoals({...goals,[monthKey]:parseFloat(e.target.value)||0})} type="number"
            style={{width:110,border:"none",borderBottom:`1.5px solid ${C.gold}`,background:"transparent",outline:"none",fontFamily:SERIF,fontSize:24,fontWeight:600,color:C.ink,padding:"2px 4px"}}/>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <span style={{fontFamily:SANS,fontSize:11,color:C.faint}}>quick set:</span>
          {[5000,10000,15000,20000].map(v=>(
            <button key={v} onClick={()=>setGoals({...goals,[monthKey]:v})} style={{fontFamily:SANS,fontSize:12,padding:"5px 10px",borderRadius:16,border:`1px solid ${target===v?C.gold:C.line}`,background:target===v?C.gold:"transparent",color:target===v?"#fff":C.inkSoft,cursor:"pointer",fontWeight:600}}>{money(v)}</button>
          ))}
        </div>
      </div>

      {/* base salary row */}
      <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",marginBottom:8,padding:"12px 18px",background:C.blueSoft,borderRadius:12}}>
        <span style={{fontFamily:SANS,fontSize:12,fontWeight:600,color:C.inkSoft,letterSpacing:".04em"}}>BASE / DRAW THIS MONTH €</span>
        <input value={base} onChange={(e)=>update({...d,base:parseFloat(e.target.value)||0})} type="number" placeholder="0"
          style={{width:110,border:"none",borderBottom:`1.5px solid ${C.blue}`,background:"transparent",outline:"none",fontFamily:SERIF,fontSize:22,fontWeight:600,color:C.ink,padding:"2px 4px"}}/>
        <span style={{fontFamily:SANS,fontSize:11,color:C.faint,flex:1,minWidth:160}}>Your guaranteed setter draw. Deals stack on top of this.</span>
      </div>
      <Why title="" tone={C.blue}>
        <b>Why base matters:</b> your real income is base + commission, so the gap-to-target should count both. Put your Courage to Lead draw here and the pace math reflects what you'll actually earn — not just what you close. When you add your own coaching offer later, log those closes as deals too.
      </Why>

      {/* KPI strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,marginBottom:24}}>
        <Kpi label="Total this month" value={money(monthTotal)} tone={C.accent} sub={base>0?`${money(base)} base + ${money(commission)} comm`:undefined}/>
        <Kpi label="To target" value={pct+"%"} tone={pct>=100?C.good:C.gold} sub={remaining>0?`${money(remaining)} to go`:"hit 🎉"}/>
        <Kpi label="Deals closed" value={String(dealCount)} tone={C.blue}/>
        <Kpi label="Avg deal" value={money(avgDeal)} tone={C.inkSoft}/>
        <Kpi label="Pace" value={pace>=0?"+"+money(pace):money(pace)} tone={pace>=0?C.good:C.accent} sub={pace>=0?"ahead":"behind"}/>
      </div>

      {/* progress bar */}
      <div style={{marginBottom:8,display:"flex",justifyContent:"space-between",fontFamily:SANS,fontSize:12,color:C.faint}}>
        <span>{money(monthTotal)}</span><span>{money(target)}</span>
      </div>
      <div style={{height:14,background:C.lineSoft,borderRadius:8,overflow:"hidden",marginBottom:20}}>
        <div style={{width:pct+"%",height:"100%",background:`linear-gradient(90deg,${C.accent},${C.gold})`,borderRadius:8,transition:"width .4s"}}/>
      </div>

      {/* intelligence line */}
      <div style={{background:pace>=0?C.goodSoft:"#FBEEE6",border:`1px solid ${pace>=0?"#CFE0C6":"#F0D6C4"}`,borderRadius:12,padding:"14px 18px",marginBottom:28,fontFamily:SERIF,fontSize:18,lineHeight:1.5,color:C.ink}}>
        {monthTotal===0
          ? <>Target is <b>{money(target)}</b>. Log your first deal and the engine starts tracking your pace, close-rate, and the gap.</>
          : remaining<=0
            ? <>🎉 You've hit <b>{money(monthTotal)}</b> — past your {money(target)} target. Time to raise the number. What does the next level look like?</>
            : pace>=0
              ? <>You're <b>{money(pace)} ahead</b> of pace at <b>{money(monthTotal)}</b>. {money(remaining)} to go{daysLeft>0 && <> — roughly <b>{money(remaining/daysLeft)}/day</b></>}{dealsNeeded>0 && <>, about <b>{dealsNeeded} more {dealsNeeded===1?"deal":"deals"}</b> at your {money(avgDeal)} average</>}.</>
              : <>You're <b>{money(Math.abs(pace))} behind</b> pace. {money(remaining)} left{daysLeft>0 && <> across {daysLeft} {daysLeft===1?"day":"days"} — that's <b>{money(remaining/daysLeft)}/day</b></>}{dealsNeeded>0 && <>, or about <b>{dealsNeeded} more {dealsNeeded===1?"deal":"deals"}</b> at your {money(avgDeal)} average</>}. Close the gap.</>}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"minmax(0,1.3fr) minmax(0,1fr)",gap:32}} className="daily-grid">
        {/* chart */}
        <div>
          <SectionTitle tone={C.gold} hint="Solid = your cumulative revenue. Dashed gold = the pace you'd need to hit target by month-end.">Revenue vs. target pace</SectionTitle>
          <div style={{border:`1px solid ${C.lineSoft}`,borderRadius:12,padding:"14px 8px 6px",background:C.card}}>
            <LineChart series={[{data:cum}]} labels={labels} targetLine={targetPace} fmt={(v)=>"€"+Math.round(v/1000)+"k"} colors={[C.accent]} height={220}/>
          </div>
          <div style={{fontFamily:SANS,fontSize:11,color:C.faint,marginTop:8,display:"flex",gap:16}}>
            <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:14,height:3,background:C.accent,display:"inline-block",borderRadius:2}}/>You</span>
            <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:14,height:3,background:C.gold,display:"inline-block",borderRadius:2,opacity:.8}}/>Target pace</span>
          </div>
        </div>

        {/* deal entry + log */}
        <div>
          <SectionTitle tone={C.accent}>Log a deal</SectionTitle>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:6}}>
            <input value={form.amount} onChange={(e)=>setForm({...form,amount:e.target.value})} placeholder="Amount €" type="number" style={dealInput(90)}/>
            <input value={form.day} onChange={(e)=>setForm({...form,day:e.target.value})} placeholder="Day" type="number" style={dealInput(56)}/>
            <input value={form.offer} onChange={(e)=>setForm({...form,offer:e.target.value})} placeholder="Offer" style={dealInput(110)}/>
            <input value={form.client} onChange={(e)=>setForm({...form,client:e.target.value})} placeholder="Client (optional)" style={dealInput(120)} onKeyDown={(e)=>e.key==="Enter"&&addDeal()}/>
          </div>
          <button onClick={addDeal} style={{fontFamily:SANS,fontSize:13,fontWeight:700,color:"#fff",background:C.accent,border:"none",borderRadius:8,padding:"9px 18px",cursor:"pointer",marginBottom:16}}>+ Add deal</button>

          <div style={{maxHeight:300,overflowY:"auto"}}>
            {sorted.length===0 && <div style={{fontFamily:SANS,fontSize:13,color:C.faint,fontStyle:"italic",padding:"10px 0"}}>No deals logged yet. Close one, log it, watch the line move.</div>}
            {sorted.map((x)=>(
              <div key={x.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"9px 0",borderBottom:`1px solid ${C.lineSoft}`}}>
                <div style={{minWidth:0}}>
                  <div style={{fontFamily:SERIF,fontSize:17,fontWeight:600,color:C.ink}}>{money(x.amount)}</div>
                  <div style={{fontFamily:SANS,fontSize:11,color:C.faint,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{MON[m-1].slice(0,3)} {x.day}{x.offer?` · ${x.offer}`:""}{x.client?` · ${x.client}`:""}</div>
                </div>
                <button onClick={()=>removeDeal(x.id)} aria-label="remove" style={{fontFamily:SANS,fontSize:16,color:C.faint,background:"none",border:"none",cursor:"pointer",flex:"none",lineHeight:1}}>×</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
const dealInput=(w)=>({width:w,border:`1px solid ${C.line}`,borderRadius:7,outline:"none",background:C.card,fontFamily:SANS,fontSize:13,color:C.ink,padding:"8px 10px"});
function Kpi({label,value,tone,sub}){
  return (
    <div style={{background:C.card,border:`1px solid ${C.lineSoft}`,borderRadius:12,padding:"14px 16px"}}>
      <div style={{fontFamily:SANS,fontSize:10,letterSpacing:".08em",textTransform:"uppercase",color:C.faint,fontWeight:600,marginBottom:6}}>{label}</div>
      <div style={{fontFamily:SERIF,fontSize:26,fontWeight:600,color:tone,lineHeight:1}}>{value}</div>
      {sub && <div style={{fontFamily:SANS,fontSize:11,color:C.faint,marginTop:4}}>{sub}</div>}
    </div>
  );
}

// ============================================================================
//  DASHBOARD — the scoreboard, pulls from all scopes for the visible month
// ============================================================================
function DashboardView({cursor,goals,refreshKey}){
  const [agg,setAgg]=useState(null);
  const monthKey=monthKeyOf(cursor);
  const [y,m]=[cursor.getFullYear(),cursor.getMonth()+1];
  const daysInMonth=new Date(y,m,0).getDate();

  useEffect(()=>{
    let alive=true;
    (async()=>{
      // pull each day of the month
      const ratings=[], sessions=[], moods=[];
      let tasksDone=0, daysLogged=0;
      for(let day=1;day<=daysInMonth;day++){
        const key=`day:${y}-${pad(m)}-${pad(day)}`;
        const dd=await store.get(key);
        if(dd){
          daysLogged++;
          ratings.push(dd.rating||null);
          if(typeof dd.mood==="number") moods.push(dd.mood);
          const s=(dd.tasks||[]).reduce((a,t)=>a+((t.sessions?.filled)||0),0);
          sessions.push(s);
          tasksDone += (dd.tasks||[]).filter(t=>t.done).length;
        } else { ratings.push(null); sessions.push(0); }
      }
      const income=await store.get(`income:${monthKey}`);
      const deals=income?.deals||[];
      const incomeBase=income?.base||0;
      const revenue=deals.reduce((s,x)=>s+x.amount,0)+incomeBase;
      const target=(goals?.[monthKey]!=null)?goals[monthKey]:(goals?.default||5000);

      // habit best streak this month
      const habit=await store.get(`habit:${monthKey}`);
      let bestStreak=0;
      if(habit?.marks){
        Object.values(habit.marks).forEach(col=>{
          let s=0,best=0;
          for(let day=1;day<=daysInMonth;day++){ if(col[day]){s++;best=Math.max(best,s);} else s=0; }
          bestStreak=Math.max(bestStreak,best);
        });
      }
      const avgRating=ratings.filter(r=>r).length?(ratings.filter(r=>r).reduce((a,b)=>a+b,0)/ratings.filter(r=>r).length):0;
      const totalSessions=sessions.reduce((a,b)=>a+b,0);
      if(alive) setAgg({ratings,sessions,moods,tasksDone,daysLogged,revenue,target,bestStreak,avgRating,totalSessions,deals,base:incomeBase});
    })();
    return ()=>{alive=false;};
  },[monthKey,y,m,daysInMonth,goals,refreshKey]);

  if(!agg) return <div style={{fontFamily:SANS,color:C.faint,padding:"40px 0",textAlign:"center"}}>Reading your month…</div>;
  const labels=Array.from({length:daysInMonth},(_,i)=>String(i+1));
  const pct=agg.target>0?Math.round(agg.revenue/agg.target*100):0;
  const moodAvg=agg.moods.length?(agg.moods.reduce((a,b)=>a+b,0)/agg.moods.length):null;

  return (
    <div>
      <PageHead eyebrow="DASHBOARD" title={`${MON[m-1]} ${y}`} sub="The scoreboard. Glance, then go win the day."/>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14,marginBottom:28}}>
        <BigStat label="Revenue this month" value={money(agg.revenue)} sub={`${pct}% of ${money(agg.target)}`} tone={C.accent}/>
        <BigStat label="Deals closed" value={String(agg.deals.length)} tone={C.gold}/>
        <BigStat label="Best habit streak" value={agg.bestStreak>0?`🔥 ${agg.bestStreak}`:"—"} sub="days in a row" tone={C.good}/>
        <BigStat label="Focus sessions" value={String(agg.totalSessions)} sub="30-min blocks" tone={C.blue}/>
        <BigStat label="Days logged" value={`${agg.daysLogged}/${daysInMonth}`} tone={C.inkSoft}/>
        <BigStat label="Avg day rating" value={agg.avgRating?agg.avgRating.toFixed(1):"—"} sub={moodAvg!=null?`mood ${MOODS[Math.round(moodAvg)]}`:""} tone={C.gold}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:28}} className="daily-grid">
        <div>
          <SectionTitle tone={C.accent} hint="Cumulative revenue vs. the pace needed to hit your target.">Income trajectory</SectionTitle>
          <ChartCard>
            <IncomeMiniChart deals={agg.deals} target={agg.target} daysInMonth={daysInMonth} labels={labels} base={agg.base}/>
          </ChartCard>
        </div>
        <div>
          <SectionTitle tone={C.blue} hint="Focus sessions completed each day this month.">Daily focus output</SectionTitle>
          <ChartCard>
            <BarChart data={agg.sessions} labels={labels} color={C.blue} fmt={(v)=>Math.round(v)}/>
          </ChartCard>
        </div>
        <div>
          <SectionTitle tone={C.gold} hint="How you rated each day (1–5). Look for what your best days have in common.">Day ratings</SectionTitle>
          <ChartCard>
            <BarChart data={agg.ratings.map(r=>r||0)} labels={labels} color={C.gold} fmt={(v)=>v.toFixed(0)}/>
          </ChartCard>
        </div>
        <div>
          <SectionTitle tone={C.good}>This month in one line</SectionTitle>
          <div style={{background:C.goodSoft,borderRadius:12,padding:"18px 20px",fontFamily:SERIF,fontSize:18,lineHeight:1.5,color:C.ink}}>
            {agg.revenue>0
              ? <>You've closed <b>{money(agg.revenue)}</b> across <b>{agg.deals.length}</b> {agg.deals.length===1?"deal":"deals"} — that's <b>{pct}%</b> of your {money(agg.target)} target. {pct>=100?"You hit it. Raise the number.":`${money(Math.max(0,agg.target-agg.revenue))} left to close.`}</>
              : <>No deals logged this month yet. The chart's waiting — close one and log it.</>}
          </div>
          <div style={{marginTop:14,fontFamily:SANS,fontSize:13,color:C.inkSoft,lineHeight:1.6}}>
            {agg.bestStreak>=3 && <div>🔥 Your longest streak this month is {agg.bestStreak} days. Don't break the chain.</div>}
            {agg.totalSessions>0 && <div style={{marginTop:6}}>⏱ {agg.totalSessions} focus blocks ≈ {Math.round(agg.totalSessions*0.5)} hours of deep work logged.</div>}
            {agg.daysLogged>0 && <div style={{marginTop:6}}>📓 You showed up and logged {agg.daysLogged} {agg.daysLogged===1?"day":"days"} this month.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
function IncomeMiniChart({deals,target,daysInMonth,labels,base=0}){
  const byDay={};deals.forEach(x=>{byDay[x.day]=(byDay[x.day]||0)+x.amount;});
  const cum=[];let run=base;for(let day=1;day<=daysInMonth;day++){run+=byDay[day]||0;cum.push(run);}
  const pace=Array.from({length:daysInMonth},(_,i)=>target*((i+1)/daysInMonth));
  return <LineChart series={[{data:cum}]} labels={labels} targetLine={pace} fmt={(v)=>"€"+Math.round(v/1000)+"k"} colors={[C.accent]} height={200}/>;
}
function BigStat({label,value,sub,tone}){
  return (
    <div style={{background:C.card,border:`1px solid ${C.lineSoft}`,borderRadius:14,padding:"18px 18px",boxShadow:"0 1px 2px rgba(28,26,23,0.04)"}}>
      <div style={{fontFamily:SANS,fontSize:10,letterSpacing:".08em",textTransform:"uppercase",color:C.faint,fontWeight:600,marginBottom:8}}>{label}</div>
      <div style={{fontFamily:SERIF,fontSize:34,fontWeight:600,color:tone,lineHeight:1}}>{value}</div>
      {sub && <div style={{fontFamily:SANS,fontSize:11,color:C.faint,marginTop:5}}>{sub}</div>}
    </div>
  );
}
function ChartCard({children}){
  return <div style={{border:`1px solid ${C.lineSoft}`,borderRadius:12,padding:"14px 8px 6px",background:C.card}}>{children}</div>;
}

// ============================================================================
//  PAGE HEAD
// ============================================================================
function PageHead({eyebrow,title,sub}){
  return (
    <div style={{marginBottom:26,textAlign:"center",paddingBottom:18,borderBottom:`1px solid ${C.lineSoft}`}}>
      <div style={{fontFamily:SANS,fontSize:11,letterSpacing:".22em",textTransform:"uppercase",color:C.gold,fontWeight:700,marginBottom:8}}>{eyebrow}</div>
      <h1 style={{fontFamily:SERIF,fontSize:38,fontWeight:600,color:C.ink,margin:0,lineHeight:1.05}}>{title}</h1>
      {sub && <div style={{fontFamily:SERIF,fontSize:16,fontStyle:"italic",color:C.faint,marginTop:8}}>{sub}</div>}
    </div>
  );
}

// ============================================================================
//  EXPORT / IMPORT
// ============================================================================
async function exportAll(){
  const keys=[];
  for(const p of ["day:","week:","review:","quarter:","habit:","income:","app:"]){
    const k=await store.list(p); keys.push(...k);
  }
  const out={};
  for(const k of keys){ out[k]=await store.get(k); }
  const blob={ _app:"Momentum", _version:3, _exported:new Date().toISOString(), data:out };
  const str=JSON.stringify(blob,null,2);
  const url=URL.createObjectURL(new Blob([str],{type:"application/json"}));
  const a=document.createElement("a");
  a.href=url; a.download=`momentum-backup-${ymd(new Date())}.json`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
async function importAll(file){
  const text=await file.text();
  const blob=JSON.parse(text);
  const data=blob.data||blob;
  let count=0;
  for(const [k,v] of Object.entries(data)){ await store.set(k,v); count++; }
  return count;
}

// ============================================================================
//  ROOT
// ============================================================================
const TABS=[
  {id:"dashboard",label:"Dashboard"},
  {id:"vision",label:"Vision"},
  {id:"daily",label:"Daily"},
  {id:"weekly",label:"Weekly"},
  {id:"review",label:"Review"},
  {id:"quarterly",label:"Quarterly"},
  {id:"habits",label:"Habits"},
  {id:"income",label:"Income"},
];

export default function App({ onSignOut, userEmail }){
  const [tab,setTab]=useState("dashboard");
  const [cursor,setCursor]=useState(()=>{const d=new Date();d.setHours(0,0,0,0);return d;});
  const today=useRef(new Date()).current;
  const [refreshKey,setRefreshKey]=useState(0);

  const dKey=`day:${ymd(cursor)}`;
  const wKey=`week:${weekKey(cursor)}`;
  const rKey=`review:${weekKey(cursor)}`;
  const qKey=quarterKey(cursor);
  const mKey=monthKeyOf(cursor);

  const [dayData,setDayData]=usePersistentState(dKey,{});
  const [weekData,setWeekData]=usePersistentState(wKey,{});
  const [reviewData,setReviewData]=usePersistentState(rKey,{});
  const [qData,setQData]=usePersistentState(`quarter:${qKey}`,{});
  const [habitData,setHabitData]=usePersistentState(`habit:${mKey}`,{});
  const [incomeData,setIncomeData]=usePersistentState(`income:${mKey}`,{});
  const [goals,setGoals]=usePersistentState("app:goals",{default:5000});
  const [visionData,setVisionData]=usePersistentState("app:vision",{});

  // Cross-scope peeks for the ladder banners (read-only).
  const qPeek = usePeek(`quarter:${qKey}`, JSON.stringify(qData));
  const wPeek = usePeek(`week:${weekKey(cursor)}`, JSON.stringify(weekData));
  const visionMain = (visionData?.yearGoal||"").trim();
  const qMainRock = (qPeek?.mainRock||"").trim();
  const qTheme = (qPeek?.theme||"").trim();
  const wMit = (wPeek?.mit||"").trim();

  const dailyLadder = [
    {icon:"🎯",label:"This week's #1",value:wMit,tone:C.accent},
    {icon:"⛰",label:"Quarter's main rock",value:qMainRock,tone:C.gold},
  ];
  const weeklyLadder = [
    {icon:"⛰",label:"Quarter's main rock",value:qMainRock,tone:C.gold},
    {icon:"✦",label:"Quarter theme",value:qTheme,tone:C.accent},
  ];
  const quarterlyLadder = [
    {icon:"★",label:"This year's #1 goal",value:visionMain,tone:C.gold},
  ];

  const [saved,setSaved]=useState(false);
  useEffect(()=>{setSaved(true);const t=setTimeout(()=>setSaved(false),1200);return ()=>clearTimeout(t);},[dayData,weekData,reviewData,qData,habitData,incomeData,goals,visionData]);

  // bump refresh so dashboard re-reads when leaving an editing tab
  useEffect(()=>{ if(tab==="dashboard") setRefreshKey(k=>k+1); },[tab]);

  const step=(dir)=>{
    setCursor((c)=>{
      if(tab==="daily") return addDays(c,dir);
      if(tab==="weekly"||tab==="review") return addDays(c,dir*7);
      if(tab==="quarterly"){const x=new Date(c);x.setMonth(x.getMonth()+dir*3);return x;}
      const x=new Date(c);x.setMonth(x.getMonth()+dir);return x;
    });
  };
  const goToday=()=>{const d=new Date();d.setHours(0,0,0,0);setCursor(d);};
  const scopeLabel=()=>{
    if(tab==="daily") return prettyDate(cursor);
    if(tab==="weekly"||tab==="review"){const ws=startOfWeek(cursor);const we=addDays(ws,6);return `${MON[ws.getMonth()].slice(0,3)} ${ws.getDate()} – ${MON[we.getMonth()].slice(0,3)} ${we.getDate()}, ${ws.getFullYear()}`;}
    if(tab==="quarterly") return `Q${quarterOf(cursor)} ${cursor.getFullYear()}`;
    return `${MON[cursor.getMonth()]} ${cursor.getFullYear()}`;
  };

  const fileRef=useRef(null);
  const [toast,setToast]=useState("");
  const showToast=(msg)=>{setToast(msg);setTimeout(()=>setToast(""),2600);};
  const onImport=async(e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    try{ const n=await importAll(f); showToast(`Imported ${n} entries. Reloading…`); setTimeout(()=>window.location.reload(),900); }
    catch{ showToast("Couldn't read that file — make sure it's a Momentum backup."); }
    e.target.value="";
  };

  const isCurrentMonth = today.getFullYear()===cursor.getFullYear() && today.getMonth()===cursor.getMonth();

  return (
    <div style={{minHeight:"100vh",background:C.paper,fontFamily:SANS,color:C.ink}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::placeholder { color:#C4BCAE; }
        textarea, input { font-family: inherit; }
        @media (max-width:760px){ .daily-grid { grid-template-columns: 1fr !important; } }
        button:focus-visible, input:focus-visible, textarea:focus-visible { outline:2px solid ${C.accent}; outline-offset:2px; }
        @media (prefers-reduced-motion: reduce){ * { transition:none !important; } }
      `}</style>

      <div style={{position:"sticky",top:0,zIndex:20,background:"rgba(251,248,241,0.92)",backdropFilter:"blur(10px)",borderBottom:`1px solid ${C.line}`}}>
        <div style={{maxWidth:1120,margin:"0 auto",padding:"14px 22px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"baseline",gap:12}}>
              <span style={{fontFamily:SERIF,fontSize:26,fontWeight:600,letterSpacing:".02em",color:C.ink}}>Momentum</span>
              <span style={{fontFamily:SANS,fontSize:11,color:saved?C.good:C.faint,fontWeight:600,transition:"color .3s"}}>{saved?"✓ saved":"auto-saves"}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <button onClick={exportAll} style={ghostBtn} title="Download a backup file">↓ Backup</button>
              <button onClick={()=>fileRef.current?.click()} style={ghostBtn} title="Restore from a backup file">↑ Restore</button>
              <input ref={fileRef} type="file" accept="application/json,.json" onChange={onImport} style={{display:"none"}}/>
              {onSignOut && <button onClick={onSignOut} style={ghostBtn} title={userEmail||"Sign out"}>Sign out</button>}
              <span style={{width:1,height:22,background:C.line,margin:"0 2px"}}/>
              <button onClick={()=>step(-1)} aria-label="previous" style={navArrow}>‹</button>
              <button onClick={goToday} style={{...navPill,minWidth:150}}>{scopeLabel()}</button>
              <button onClick={()=>step(1)} aria-label="next" style={navArrow}>›</button>
            </div>
          </div>
          <div style={{display:"flex",gap:4,marginTop:12,overflowX:"auto"}}>
            {TABS.map((t)=>{const on=tab===t.id;return (
              <button key={t.id} onClick={()=>setTab(t.id)} style={{fontFamily:SANS,fontSize:13,fontWeight:on?700:500,color:on?C.accent:C.inkSoft,background:on?C.accentSoft:"transparent",border:"none",borderRadius:8,padding:"8px 16px",cursor:"pointer",whiteSpace:"nowrap",transition:"all .15s"}}>{t.label}</button>
            );})}
          </div>
        </div>
      </div>

      <div style={{maxWidth:1120,margin:"0 auto",padding:"30px 22px 80px"}}>
        <div style={{background:C.card,borderRadius:16,padding:"34px 34px 40px",boxShadow:"0 1px 3px rgba(28,26,23,0.05), 0 12px 40px rgba(28,26,23,0.04)",border:`1px solid ${C.lineSoft}`}}>
          {tab==="dashboard" && <DashboardView cursor={cursor} goals={goals} refreshKey={refreshKey}/>}
          {tab==="vision" && <VisionView data={visionData} update={setVisionData}/>}
          {tab==="daily" && <DailyView date={cursor} data={dayData} update={setDayData} ladder={dailyLadder}/>}
          {tab==="weekly" && <WeeklyView weekStart={startOfWeek(cursor)} data={weekData} update={setWeekData} ladder={weeklyLadder}/>}
          {tab==="review" && <ReviewView weekStart={startOfWeek(cursor)} data={reviewData} update={setReviewData} weeksRemaining={weeksRemainingInQuarter(cursor)}/>}
          {tab==="quarterly" && <QuarterlyView qKey={qKey} data={qData} update={setQData} ladder={quarterlyLadder}/>}
          {tab==="habits" && <HabitView monthKey={mKey} data={habitData} update={setHabitData} isCurrentMonth={isCurrentMonth} today={today}/>}
          {tab==="income" && <IncomeView monthKey={mKey} data={incomeData} update={setIncomeData} goals={goals} setGoals={setGoals}/>}
        </div>
        <div style={{textAlign:"center",marginTop:24,fontFamily:SANS,fontSize:12,color:C.faint,lineHeight:1.6}}>
          Everything saves automatically inside this app. Use <b>↓ Backup</b> to download a copy, and <b>↑ Restore</b> to load it on another device. Arrows move between days, weeks, quarters, and months.
        </div>
      </div>

      {toast && (
        <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:C.ink,color:"#fff",fontFamily:SANS,fontSize:13,padding:"12px 20px",borderRadius:10,boxShadow:"0 8px 30px rgba(0,0,0,0.2)",zIndex:50}}>{toast}</div>
      )}
    </div>
  );
}
const navArrow={width:34,height:34,borderRadius:9,border:`1px solid ${C.line}`,background:C.card,color:C.inkSoft,fontSize:20,cursor:"pointer",lineHeight:1,fontFamily:SANS};
const navPill={fontFamily:SANS,fontSize:13,fontWeight:600,color:C.ink,background:C.card,border:`1px solid ${C.line}`,borderRadius:9,padding:"8px 14px",cursor:"pointer"};
const ghostBtn={fontFamily:SANS,fontSize:12,fontWeight:600,color:C.inkSoft,background:C.card,border:`1px solid ${C.line}`,borderRadius:8,padding:"7px 12px",cursor:"pointer"};
