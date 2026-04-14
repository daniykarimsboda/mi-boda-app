import { useState, useEffect, useRef, useCallback } from "react";
import {
Heart, Users, Clock, Sparkles, Menu, X, ChevronDown, ChevronUp,
Plus, Trash2, Check, Download, Share2, Edit2, Save, Search,
Flower, Music, Shirt, UtensilsCrossed, Camera, Car, Star, Gift,
Cloud, CloudOff, Loader2
} from “lucide-react”;

// ═══════════════════════════════════════════════════════════════════
// SUPABASE CONFIG
// ═══════════════════════════════════════════════════════════════════
const SUPABASE_URL      = “https://gruszoneusbmhkmeogvn.supabase.co”;
const SUPABASE_ANON_KEY = “eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdydXN6b25ldXNibWhrbWVvZ3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODk1NDQsImV4cCI6MjA4OTg2NTU0NH0.Z_F4EIKj_sahMRNgywImTT6m5jMU1KhE6MWQ1oVLRpM”;

// ID de fila fija en la tabla wedding_state
const ROW_ID = 1;

// ═══════════════════════════════════════════════════════════════════
// SUPABASE CLIENT — carga dinámica desde CDN
// ═══════════════════════════════════════════════════════════════════
let _sb = null;
async function getSB() {
if (_sb) return _sb;
try {
const m = await import(“https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm”);
_sb = m.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
return _sb;
} catch (e) {
console.error(“Supabase init error:”, e);
return null;
}
}

// ═══════════════════════════════════════════════════════════════════
// INITIAL DATA
// ═══════════════════════════════════════════════════════════════════
const INIT = {
weddingDate: “2027-06-12”,
coupleName:  “Dani & Karim”,
budget:      200000,
categories: [
{ id:“banquete”,  icon:“UtensilsCrossed”, label:“Banquete”,               color:”#E0BBE4”, budgetEstimated:60000, budgetReal:42000,
tasks:[
{id:“t1”,text:“Cita de degustación con el chef”,done:false,date:“2026-08-15”,priority:“alta”},
{id:“t2”,text:“Definir menú vegetariano y vegano”,done:false,date:“2026-09-01”,priority:“media”},
{id:“t3”,text:“Confirmar mesas y sillas”,done:true,date:“2026-07-20”,priority:“alta”},
{id:“t4”,text:“Opciones sin gluten”,done:false,date:“2026-09-15”,priority:“baja”},
],
visionItems:[
{id:“v1”,url:“https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400”,label:“Decoración mesa”},
{id:“v2”,url:“https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=400”,label:“Pastel nupcial”},
]},
{ id:“flores”,    icon:“Flower”,          label:“Flores & Decoración”,    color:”#C8E6C9”, budgetEstimated:30000, budgetReal:18500,
tasks:[
{id:“t5”,text:“Reunión con florista”,done:true,date:“2026-07-10”,priority:“alta”},
{id:“t6”,text:“Elegir flores de temporada”,done:false,date:“2026-08-01”,priority:“media”},
{id:“t7”,text:“Presupuesto centros de mesa”,done:false,date:“2026-08-20”,priority:“alta”},
],
visionItems:[{id:“v3”,url:“https://images.unsplash.com/photo-1490750967868-88df5691cc51?w=400”,label:“Ramo de novia”}]},
{ id:“musica”,    icon:“Music”,           label:“Música & Entretenimiento”,color:”#B3E5FC”, budgetEstimated:25000, budgetReal:25000,
tasks:[
{id:“t8”,text:“Contratar DJ”,done:true,date:“2026-06-30”,priority:“alta”},
{id:“t9”,text:“Playlist ceremonia”,done:false,date:“2026-10-01”,priority:“media”},
{id:“t10”,text:“Verificar sonido en venue”,done:false,date:“2026-11-01”,priority:“alta”},
],
visionItems:[]},
{ id:“vestuario”, icon:“Shirt”,           label:“Vestuario”,              color:”#FFE0B2”, budgetEstimated:35000, budgetReal:28000,
tasks:[
{id:“t11”,text:“Prueba de maquillaje natural (miel/coco)”,done:false,date:“2026-09-20”,priority:“alta”},
{id:“t12”,text:“Kit emergencia con rodillo de pelusa”,done:false,date:“2026-11-01”,priority:“media”},
{id:“t13”,text:“Segunda prueba de vestido”,done:true,date:“2026-08-05”,priority:“alta”},
{id:“t14”,text:“Traje del novio y padrinos”,done:false,date:“2026-09-01”,priority:“media”},
],
visionItems:[{id:“v4”,url:“https://images.unsplash.com/photo-1519741497674-611481863552?w=400”,label:“Vestido de novia”}]},
{ id:“logistica”, icon:“Car”,             label:“Logística & Venue”,      color:”#F8BBD9”, budgetEstimated:20000, budgetReal:15000,
tasks:[
{id:“t15”,text:“Zona de descanso privada (Recarga)”,done:false,date:“2026-10-15”,priority:“media”},
{id:“t16”,text:“Transportadoras para mascotas”,done:false,date:“2026-11-20”,priority:“baja”},
{id:“t17”,text:“Transporte invitados foráneos”,done:false,date:“2026-10-01”,priority:“alta”},
{id:“t18”,text:“Confirmar horario con venue”,done:true,date:“2026-07-15”,priority:“alta”},
],
visionItems:[]},
{ id:“foto”,      icon:“Camera”,          label:“Fotografía & Video”,     color:”#E1BEE7”, budgetEstimated:30000, budgetReal:30000,
tasks:[
{id:“t19”,text:“Sesión pre-boda (e-session)”,done:true,date:“2026-08-20”,priority:“alta”},
{id:“t20”,text:“Lista fotos con familia”,done:false,date:“2026-11-15”,priority:“media”},
{id:“t21”,text:“Fotógrafo segundo día”,done:false,date:“2026-10-01”,priority:“baja”},
],
visionItems:[{id:“v5”,url:“https://images.unsplash.com/photo-1606800052052-a08af7148866?w=400”,label:“Estilo editorial”}]},
],
guests: [
{id:“g1”,name:“María García”,rsvp:“confirmado”,allergies:“Ninguna”,table:“1”},
{id:“g2”,name:“Carlos López”,rsvp:“pendiente”,allergies:“Gluten”,table:“2”},
{id:“g3”,name:“Ana Martínez”,rsvp:“confirmado”,allergies:“Mariscos”,table:“1”},
{id:“g4”,name:“Pedro Sánchez”,rsvp:“rechazado”,allergies:“Ninguna”,table:””},
{id:“g5”,name:“Laura Gómez”,rsvp:“confirmado”,allergies:“Lácteos”,table:“3”},
{id:“g6”,name:“Roberto Torres”,rsvp:“pendiente”,allergies:“Ninguna”,table:“2”},
],
timeline: [
{id:“tl1”,time:“07:00”,activity:“Despertar & Desayuno en suite”,icon:“Star”},
{id:“tl2”,time:“08:00”,activity:“Maquillaje y peinado (novia)”,icon:“Sparkles”},
{id:“tl3”,time:“10:00”,activity:“Fotografías getting ready”,icon:“Camera”},
{id:“tl4”,time:“11:30”,activity:“Preparación del novio y padrinos”,icon:“Shirt”},
{id:“tl5”,time:“13:00”,activity:“Primer vistazo (First Look)”,icon:“Heart”},
{id:“tl6”,time:“14:00”,activity:“Ceremonia religiosa / civil”,icon:“Heart”},
{id:“tl7”,time:“15:30”,activity:“Sesión fotográfica de pareja”,icon:“Camera”},
{id:“tl8”,time:“16:30”,activity:“Cóctel de bienvenida”,icon:“Sparkles”},
{id:“tl9”,time:“18:00”,activity:“Recepción y banquete”,icon:“UtensilsCrossed”},
{id:“tl10”,time:“19:30”,activity:“Primer baile & vals con padres”,icon:“Music”},
{id:“tl11”,time:“20:30”,activity:“Corte del pastel y brindis”,icon:“Gift”},
{id:“tl12”,time:“21:00”,activity:“Pista de baile abierta”,icon:“Music”},
{id:“tl13”,time:“01:00”,activity:“Despedida & torna-boda”,icon:“Heart”},
]
};

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS & HELPERS
// ═══════════════════════════════════════════════════════════════════
const IconMap = { UtensilsCrossed, Flower, Music, Shirt, Car, Camera, Heart, Sparkles, Star, Gift, Users };
const COLORS  = [”#E0BBE4”,”#B2AC88”,”#B3E5FC”,”#FFE0B2”,”#F8BBD9”,”#E1BEE7”];
const fmt = n => new Intl.NumberFormat(“es-MX”,{style:“currency”,currency:“MXN”,maximumFractionDigits:0}).format(n);
const daysUntil = d => Math.max(0,Math.ceil((new Date(d+“T12:00:00”)-new Date())/86400000));

function useDebounce(fn, ms) {
const t = useRef();
return useCallback((…a) => { clearTimeout(t.current); t.current = setTimeout(() => fn(…a), ms); }, [fn, ms]);
}

// ═══════════════════════════════════════════════════════════════════
// GLOBAL CSS
// ═══════════════════════════════════════════════════════════════════
const CSS = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap'); *{box-sizing:border-box;margin:0;padding:0;} .serif{font-family:'Cormorant Garamond',serif;} .glass{background:rgba(255,255,255,0.72);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.85);} ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-thumb{background:#E0BBE4;border-radius:10px;} .fade{animation:fi 0.35s ease;} @keyframes fi{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}} @keyframes sp{from{transform:rotate(0);}to{transform:rotate(360deg);}} .spin{animation:sp 1s linear infinite;display:inline-flex;} @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}} .pulse{animation:pulse 2s ease infinite;} input:focus,select:focus{outline:none;border-color:#E0BBE4!important;box-shadow:0 0 0 3px rgba(224,187,228,.2);}`;

// ═══════════════════════════════════════════════════════════════════
// SYNC BADGE
// ═══════════════════════════════════════════════════════════════════
function SyncBadge({ status }) {
const M = {
loading:{ icon:<Loader2 size={13} className="spin"/>, text:“Cargando…”,      bg:”#F3E5F5”, bd:”#CE93D8”, c:”#6a1b9a” },
saving: { icon:<Loader2 size={13} className="spin"/>, text:“Guardando…”,     bg:”#FFF8E1”, bd:”#FFD54F”, c:”#8a6a00” },
saved:  { icon:<Cloud   size={13}/>,                  text:“Sincronizado ✓”, bg:”#E8F5E9”, bd:”#A5D6A7”, c:”#2e7d32” },
error:  { icon:<CloudOff size={13}/>,                 text:“Error de sync”,  bg:”#FFEBEE”, bd:”#EF9A9A”, c:”#c62828” },
idle:   { icon:<Cloud   size={13}/>,                  text:“Conectado”,      bg:”#F3E5F5”, bd:”#CE93D8”, c:”#6a1b9a” },
};
const m = M[status] || M.idle;
return (
<span style={{display:“inline-flex”,alignItems:“center”,gap:6,padding:“5px 12px”,borderRadius:20,
background:m.bg,border:`1px solid ${m.bd}`,color:m.c,fontSize:12,fontWeight:500,transition:“all .3s”,whiteSpace:“nowrap”}}>
{m.icon} {m.text}
</span>
);
}

// ═══════════════════════════════════════════════════════════════════
// CIRCULAR PROGRESS RING
// ═══════════════════════════════════════════════════════════════════
function Ring({ pct, color, sz=88, label, sub }) {
const r = (sz-14)/2, c = 2*Math.PI*r;
return (
<div style={{display:“flex”,flexDirection:“column”,alignItems:“center”,gap:6}}>
<svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}>
<circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke="#F0E8F5" strokeWidth={9}/>
<circle cx={sz/2} cy={sz/2} r={r} fill=“none” stroke={color} strokeWidth={9} strokeLinecap=“round”
strokeDasharray={c} strokeDashoffset={c-(pct/100)*c}
transform={`rotate(-90 ${sz/2} ${sz/2})`} style={{transition:“stroke-dashoffset 1s ease”}}/>
<text x={sz/2} y={sz/2+5} textAnchor="middle" fontSize={14} fontWeight={600} fill="#4a3a5c" fontFamily="DM Sans">{pct}%</text>
</svg>
<div style={{textAlign:“center”}}>
<div style={{fontSize:12,fontWeight:500,color:”#6b6b8a”}}>{label}</div>
<div style={{fontSize:11,color:”#aaa”}}>{sub}</div>
</div>
</div>
);
}

// ═══════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════
export default function WeddingOS() {
const [data, setData]     = useState(() => { try { const s=localStorage.getItem(“wos5”); return s?JSON.parse(s):INIT; } catch { return INIT; } });
const [sync, setSync]     = useState(“loading”);
const [tab,  setTab]      = useState(“dashboard”);
const [sidebarOpen, setSO] = useState(true);
const [exCat, setExCat]   = useState(null);
const [gs, setGs]         = useState(””);
const [gf, setGf]         = useState(“todos”);
const [editD, setEditD]   = useState(false);
const [toast, setToast]   = useState(false);

// ── LOAD from Supabase on mount ────────────────────────────────
useEffect(() => {
(async () => {
const sb = await getSB();
if (!sb) { setSync(“error”); return; }
try {
const { data: row, error } = await sb
.from(“wedding_state”)
.select(“data”)
.eq(“id”, ROW_ID)
.maybeSingle();

```
    if (error) { console.error("Load error:", error); setSync("error"); return; }

    if (row?.data) {
      setData(row.data);
      localStorage.setItem("wos5", JSON.stringify(row.data));
    } else {
      // Primera vez: insertar datos iniciales
      const local = (() => { try { const s=localStorage.getItem("wos5"); return s?JSON.parse(s):null; } catch { return null; } })();
      const payload = local || INIT;
      await sb.from("wedding_state").upsert({ id: ROW_ID, data: payload });
      setData(payload);
    }
    setSync("idle");
  } catch (e) {
    console.error("Load exception:", e);
    setSync("error");
  }
})();
```

}, []);

// ── REALTIME subscription ──────────────────────────────────────
useEffect(() => {
let channel;
(async () => {
const sb = await getSB();
if (!sb) return;
channel = sb
.channel(“wedding_state_changes”)
.on(“postgres_changes”, { event:“UPDATE”, schema:“public”, table:“wedding_state”, filter:`id=eq.${ROW_ID}` },
(payload) => {
if (payload.new?.data) {
setData(payload.new.data);
localStorage.setItem(“wos5”, JSON.stringify(payload.new.data));
setSync(“saved”);
setTimeout(() => setSync(“idle”), 2500);
}
})
.subscribe();
})();
return () => { if (channel) getSB().then(sb => sb?.removeChannel(channel)); };
}, []);

// ── DEBOUNCED UPSERT ───────────────────────────────────────────
const pushToCloud = useCallback(async (payload) => {
const sb = await getSB();
if (!sb) return;
setSync(“saving”);
try {
const { error } = await sb
.from(“wedding_state”)
.update({ data: payload })
.eq(“id”, ROW_ID);
if (error) { console.error(“Save error:”, error); setSync(“error”); }
else { setSync(“saved”); setTimeout(() => setSync(“idle”), 3000); }
} catch (e) { console.error(“Save exception:”, e); setSync(“error”); }
}, []);

const debouncedPush = useDebounce(pushToCloud, 1000);

// ── UNIVERSAL UPDATE ───────────────────────────────────────────
const upd = useCallback((fn) => {
setData(prev => {
const next = JSON.parse(JSON.stringify(prev));
fn(next);
localStorage.setItem(“wos5”, JSON.stringify(next));
debouncedPush(next);
return next;
});
}, [debouncedPush]);

// ── COMPUTED ───────────────────────────────────────────────────
const spent = data.categories.reduce((a,c) => a+c.budgetReal, 0);
const estim = data.categories.reduce((a,c) => a+c.budgetEstimated, 0);
const d     = daysUntil(data.weddingDate);
const cats  = data.categories.map(c => ({
…c, pct: c.tasks.length ? Math.round(c.tasks.filter(t=>t.done).length/c.tasks.length*100) : 0
}));

const share = () => {
navigator.clipboard?.writeText(window.location.href).catch(()=>{});
setToast(true); setTimeout(() => setToast(false), 3000);
};

const exportData = () => {
const txt = [
`💍 ${data.coupleName}  — Wedding OS`,
`Fecha: ${data.weddingDate}  |  Días restantes: ${d}`,
`Supabase: ${SUPABASE_URL}`, `, `━━ PRESUPUESTO ━━`, `Total: ${fmt(data.budget)}  |  Gastado: ${fmt(spent)}  |  Estimado: ${fmt(estim)}`, `,
`━━ CATEGORÍAS ━━`,
…data.categories.map(c=>`• ${c.label}: ${c.tasks.filter(t=>t.done).length}/${c.tasks.length} tareas  |  ${fmt(c.budgetReal)} gastado`), `, `━━ INVITADOS (${data.guests.length}) ━━`, `Confirmados: ${data.guests.filter(g=>g.rsvp==="confirmado").length}  |  Pendientes: ${data.guests.filter(g=>g.rsvp==="pendiente").length}  |  Rechazados: ${data.guests.filter(g=>g.rsvp==="rechazado").length}`, `,
`━━ TIMELINE ━━`,
…data.timeline.map(t=>`  ${t.time}   ${t.activity}`),
].join(”\n”);
const a = document.createElement(“a”);
a.href = URL.createObjectURL(new Blob([txt],{type:“text/plain”}));
a.download = `wedding-os-${data.coupleName.replace(/\s/g,"_")}.txt`;
a.click();
};

const navItems = [
{id:“dashboard”, l:“Dashboard”,  I:Heart},
{id:“categorias”,l:“Categorías”, I:Sparkles},
{id:“invitados”, l:“Invitados”,  I:Users},
{id:“timeline”,  l:“Día B”,      I:Clock},
];

// ══════════════════════════════════════════════════════════════
return (
<div style={{display:“flex”,minHeight:“100vh”,background:“linear-gradient(135deg,#F5F0F8 0%,#EFF5F0 50%,#F8F2ED 100%)”,fontFamily:”‘DM Sans’,sans-serif”}}>
<style>{CSS}</style>

```
  {/* ── Toast ── */}
  {toast && (
    <div style={{position:"fixed",top:20,right:20,zIndex:999,background:"#7b4f8a",color:"white",padding:"12px 20px",borderRadius:14,fontSize:13,boxShadow:"0 8px 32px rgba(123,79,138,.35)"}}>
      ✓ Link copiado — ¡Comparte con tu familia!
    </div>
  )}

  {/* ════════════════ SIDEBAR ════════════════ */}
  <div style={{width:sidebarOpen?248:72,transition:"width .3s ease",flexShrink:0,background:"rgba(255,255,255,.78)",backdropFilter:"blur(28px)",borderRight:"1px solid rgba(224,187,228,.3)",display:"flex",flexDirection:"column",position:"sticky",top:0,height:"100vh",zIndex:50}}>

    {/* Logo */}
    <div style={{padding:"22px 18px 16px",borderBottom:"1px solid rgba(224,187,228,.2)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      {sidebarOpen && (
        <div>
          <div className="serif" style={{fontSize:22,color:"#4a3a5c",fontWeight:300,lineHeight:1.1}}>Wedding</div>
          <div className="serif" style={{fontSize:22,color:"#B2AC88",fontStyle:"italic",lineHeight:1.1}}>OS ✦</div>
        </div>
      )}
      <button onClick={()=>setSO(o=>!o)} style={{background:"none",border:"none",cursor:"pointer",color:"#9b8ab4",padding:4,borderRadius:8}}>
        {sidebarOpen ? <X size={18}/> : <Menu size={18}/>}
      </button>
    </div>

    {/* Couple + sync */}
    {sidebarOpen && (
      <div style={{padding:"12px 18px",borderBottom:"1px solid rgba(224,187,228,.15)"}}>
        <div className="serif" style={{fontSize:16,color:"#6b5c7e",fontStyle:"italic"}}>{data.coupleName}</div>
        <div style={{fontSize:11,color:"#aaa",marginTop:2,marginBottom:8}}>{data.weddingDate}</div>
        <SyncBadge status={sync}/>
      </div>
    )}

    {/* Nav */}
    <nav style={{flex:1,padding:"14px 8px",display:"flex",flexDirection:"column",gap:4}}>
      {navItems.map(({id,l,I}) => {
        const active = tab===id;
        return (
          <button key={id} onClick={()=>setTab(id)} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 12px",borderRadius:12,background:active?"rgba(224,187,228,.3)":"transparent",border:active?"1px solid rgba(224,187,228,.5)":"1px solid transparent",cursor:"pointer",color:active?"#7b4f8a":"#8a8aaa",fontWeight:active?500:400,fontSize:14,transition:"all .2s",textAlign:"left"}}>
            <I size={18} strokeWidth={active?2:1.5}/>{sidebarOpen && l}
          </button>
        );
      })}
    </nav>

    {/* Actions */}
    {sidebarOpen && (
      <div style={{padding:"14px 16px",borderTop:"1px solid rgba(224,187,228,.2)",display:"flex",flexDirection:"column",gap:8}}>
        <button onClick={exportData} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:11,background:"rgba(178,172,136,.15)",border:"1px solid rgba(178,172,136,.35)",cursor:"pointer",color:"#7a7555",fontSize:13,fontWeight:500}}>
          <Download size={15}/> Exportar
        </button>
        <button onClick={share} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:11,background:"rgba(224,187,228,.2)",border:"1px solid rgba(224,187,228,.45)",cursor:"pointer",color:"#7b4f8a",fontSize:13,fontWeight:500}}>
          <Share2 size={15}/> Compartir link
        </button>
      </div>
    )}
  </div>

  {/* ════════════════ MAIN ════════════════ */}
  <div style={{flex:1,overflow:"auto",padding:"32px 28px"}}>

    {/* ──────── DASHBOARD ──────── */}
    {tab==="dashboard" && (
      <div className="fade">
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28,flexWrap:"wrap",gap:12}}>
          <div>
            <div className="serif" style={{fontSize:38,color:"#4a3a5c",fontWeight:300,lineHeight:1.15}}>
              Bienvenida, <span style={{fontStyle:"italic",color:"#B2AC88"}}>{data.coupleName.split("&")[0].trim()} ✦</span>
            </div>
            <div style={{fontSize:15,color:"#aaa",marginTop:6}}>Todo en un solo lugar para su día perfecto</div>
          </div>
          <SyncBadge status={sync}/>
        </div>

        {/* Top cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(215px,1fr))",gap:16,marginBottom:24}}>

          {/* Countdown */}
          <div className="glass" style={{borderRadius:22,padding:"22px 24px",position:"relative",overflow:"hidden"}}>
            <div style={{fontSize:11,fontWeight:500,color:"#B2AC88",textTransform:"uppercase",letterSpacing:1.6,marginBottom:10}}>Cuenta Regresiva</div>
            <div className="serif" style={{fontSize:56,color:"#4a3a5c",fontWeight:300,lineHeight:1}}>{d}</div>
            <div style={{fontSize:13,color:"#bbb",marginTop:6}}>días restantes</div>
            {editD ? (
              <div style={{marginTop:12,display:"flex",gap:8}}>
                <input type="date" defaultValue={data.weddingDate} id="di"
                  style={{flex:1,padding:"7px 10px",borderRadius:9,border:"1px solid #E0BBE4",fontSize:13}}/>
                <button onClick={()=>{upd(x=>{x.weddingDate=document.getElementById("di").value;});setEditD(false);}}
                  style={{padding:"7px 11px",borderRadius:9,background:"#E0BBE4",border:"none",cursor:"pointer"}}>
                  <Save size={14} color="#fff"/>
                </button>
              </div>
            ):(
              <button onClick={()=>setEditD(true)}
                style={{marginTop:10,display:"flex",alignItems:"center",gap:5,background:"none",border:"none",cursor:"pointer",color:"#c4a0cc",fontSize:12}}>
                <Edit2 size={12}/> {data.weddingDate}
              </button>
            )}
            <div style={{position:"absolute",top:16,right:18,fontSize:30}}>💍</div>
            <div style={{position:"absolute",bottom:-20,right:-20,width:80,height:80,borderRadius:"50%",background:"rgba(224,187,228,.15)"}}/>
          </div>

          {/* Budget */}
          <div className="glass" style={{borderRadius:22,padding:"22px 24px"}}>
            <div style={{fontSize:11,fontWeight:500,color:"#B2AC88",textTransform:"uppercase",letterSpacing:1.6,marginBottom:10}}>Presupuesto Total</div>
            <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:16}}>
              <div className="serif" style={{fontSize:28,color:"#4a3a5c"}}>{fmt(data.budget)}</div>
              <button onClick={()=>{const v=prompt("Nuevo presupuesto (MXN):",data.budget);if(v&&!isNaN(v))upd(x=>{x.budget=+v;});}}
                style={{background:"none",border:"none",cursor:"pointer",color:"#ccc"}}><Edit2 size={13}/></button>
            </div>
            {[{l:"Gastado",v:spent,c:"#c77daa"},{l:"Estimado",v:estim,c:"#E0BBE4"},{l:"Disponible",v:data.budget-spent,c:"#B2AC88"}].map(r=>(
              <div key={r.l} style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#888",marginBottom:4}}>
                  <span>{r.l}</span><span style={{fontWeight:500,color:"#555"}}>{fmt(r.v)}</span>
                </div>
                <div style={{height:5,borderRadius:3,background:"#f0e8f5"}}>
                  <div style={{height:"100%",borderRadius:3,background:r.c,width:`${Math.min(100,(r.v/data.budget)*100)}%`,transition:"width .8s"}}/>
                </div>
              </div>
            ))}
          </div>

          {/* Guests */}
          <div className="glass" style={{borderRadius:22,padding:"22px 24px"}}>
            <div style={{fontSize:11,fontWeight:500,color:"#B2AC88",textTransform:"uppercase",letterSpacing:1.6,marginBottom:10}}>Invitados</div>
            <div className="serif" style={{fontSize:44,color:"#4a3a5c",fontWeight:300,marginBottom:14}}>{data.guests.length}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {[{l:"Conf.",v:data.guests.filter(g=>g.rsvp==="confirmado").length,c:"#B2AC88"},
                {l:"Pend.",v:data.guests.filter(g=>g.rsvp==="pendiente").length,c:"#FFD580"},
                {l:"Rech.",v:data.guests.filter(g=>g.rsvp==="rechazado").length,c:"#F4A5A5"}].map(s=>(
                <div key={s.l} style={{background:s.c+"33",borderRadius:11,padding:"9px 6px",textAlign:"center"}}>
                  <div style={{fontSize:22,fontWeight:700,color:"#4a3a5c"}}>{s.v}</div>
                  <div style={{fontSize:10,color:"#888"}}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Cloud status */}
          <div className="glass" style={{borderRadius:22,padding:"22px 24px"}}>
            <div style={{fontSize:11,fontWeight:500,color:"#B2AC88",textTransform:"uppercase",letterSpacing:1.6,marginBottom:12}}>Colaboración ☁</div>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
              <div style={{width:44,height:44,borderRadius:14,background:"rgba(224,187,228,.25)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {sync==="error" ? <CloudOff size={22} color="#F4A5A5"/> : <Cloud size={22} color="#B2AC88"/>}
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:"#4a3a5c"}}>Supabase Realtime</div>
                <div style={{fontSize:11,color:"#aaa",marginTop:2}}>boda-dani-karim-2027</div>
              </div>
            </div>
            <div style={{fontSize:12,color:"#aaa",lineHeight:1.65,marginBottom:12}}>
              Todos los cambios se sincronizan automáticamente. Abre en otro dispositivo para colaborar en tiempo real.
            </div>
            <SyncBadge status={sync}/>
          </div>
        </div>

        {/* Project Health rings */}
        <div className="glass" style={{borderRadius:22,padding:"26px 30px",marginBottom:22}}>
          <div className="serif" style={{fontSize:24,color:"#4a3a5c",marginBottom:22}}>Project Health ✦</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:28,justifyContent:"space-around"}}>
            {cats.map((c,i) => (
              <Ring key={c.id} pct={c.pct} color={COLORS[i]} sz={92}
                label={c.label} sub={`${c.tasks.filter(t=>t.done).length}/${c.tasks.length}`}/>
            ))}
          </div>
        </div>

        {/* Upcoming tasks */}
        <div className="glass" style={{borderRadius:22,padding:"26px 30px"}}>
          <div className="serif" style={{fontSize:24,color:"#4a3a5c",marginBottom:18}}>Próximas Tareas ✦</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {data.categories
              .flatMap(c => c.tasks.filter(t=>!t.done).map(t=>({...t,cat:c.label,cc:c.color})))
              .sort((a,b)=>new Date(a.date)-new Date(b.date))
              .slice(0,6)
              .map(t => (
                <div key={t.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",borderRadius:13,background:"rgba(255,255,255,.55)",border:"1px solid rgba(224,187,228,.2)"}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:t.cc,flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,color:"#4a3a5c"}}>{t.text}</div>
                    <div style={{fontSize:11,color:"#bbb",marginTop:2}}>{t.cat} · {t.date}</div>
                  </div>
                  <span style={{fontSize:10,padding:"3px 9px",borderRadius:20,
                    background:t.priority==="alta"?"#F4A5A530":t.priority==="media"?"#FFD58030":"#B2AC8830",
                    color:t.priority==="alta"?"#c05a5a":t.priority==="media"?"#8a7230":"#5a6a45"}}>
                    {t.priority}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    )}

    {/* ──────── CATEGORÍAS ──────── */}
    {tab==="categorias" && (
      <div className="fade">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:26,flexWrap:"wrap",gap:12}}>
          <div className="serif" style={{fontSize:38,color:"#4a3a5c",fontWeight:300}}>Categorías <span style={{fontStyle:"italic",color:"#B2AC88"}}>✦</span></div>
          <SyncBadge status={sync}/>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {cats.map((cat) => {
            const CI = IconMap[cat.icon] || Sparkles;
            const open = exCat===cat.id;
            const diff = cat.budgetEstimated - cat.budgetReal;
            return (
              <div key={cat.id} className="glass" style={{borderRadius:20,overflow:"hidden"}}>
                <button onClick={()=>setExCat(open?null:cat.id)}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:14,padding:"18px 22px",background:"none",border:"none",cursor:"pointer",textAlign:"left"}}>
                  <div style={{width:42,height:42,borderRadius:13,background:cat.color+"55",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <CI size={20} color={cat.color} strokeWidth={1.5}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:16,fontWeight:500,color:"#4a3a5c"}}>{cat.label}</div>
                    <div style={{display:"flex",gap:10,alignItems:"center",marginTop:5}}>
                      <div style={{width:90,height:5,borderRadius:3,background:"#f0e8f5",flexShrink:0}}>
                        <div style={{height:"100%",borderRadius:3,background:cat.color,width:`${cat.pct}%`}}/>
                      </div>
                      <span style={{fontSize:12,color:"#bbb"}}>{cat.pct}%</span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:16,alignItems:"center",flexShrink:0}}>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:14,fontWeight:500,color:"#4a3a5c"}}>{fmt(cat.budgetReal)}</div>
                      <div style={{fontSize:11,color:diff>=0?"#7a9a6a":"#c05a5a"}}>{diff>=0?"↓":"↑"} {fmt(Math.abs(diff))}</div>
                    </div>
                    {open?<ChevronUp size={18} color="#aaa"/>:<ChevronDown size={18} color="#aaa"/>}
                  </div>
                </button>

                {open && (
                  <div style={{padding:"4px 22px 24px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
                    {/* Checklist */}
                    <div>
                      <div style={{fontSize:12,fontWeight:500,color:"#9b8ab4",marginBottom:12,textTransform:"uppercase",letterSpacing:1.2}}>Checklist</div>
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {cat.tasks.map(tk => (
                          <div key={tk.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",borderRadius:12,background:tk.done?"#B2AC8812":"rgba(255,255,255,.55)",border:"1px solid rgba(224,187,228,.2)"}}>
                            <button onClick={()=>upd(x=>{x.categories.find(c=>c.id===cat.id).tasks.find(t=>t.id===tk.id).done^=true;})}
                              style={{flexShrink:0,width:20,height:20,borderRadius:6,border:`2px solid ${tk.done?"#B2AC88":"#ddd"}`,background:tk.done?"#B2AC88":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                              {tk.done && <Check size={12} color="white" strokeWidth={3}/>}
                            </button>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:13,color:tk.done?"#bbb":"#4a3a5c",textDecoration:tk.done?"line-through":"none"}}>{tk.text}</div>
                              <div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap"}}>
                                <span style={{fontSize:11,color:"#ccc"}}>{tk.date}</span>
                                <span style={{fontSize:10,padding:"1px 7px",borderRadius:20,
                                  background:tk.priority==="alta"?"#F4A5A530":tk.priority==="media"?"#FFD58030":"#B2AC8830",
                                  color:tk.priority==="alta"?"#c05a5a":tk.priority==="media"?"#8a7230":"#5a6a45"}}>
                                  {tk.priority}
                                </span>
                              </div>
                            </div>
                            <button onClick={()=>upd(x=>{const c=x.categories.find(c=>c.id===cat.id);c.tasks=c.tasks.filter(t=>t.id!==tk.id);})}
                              style={{background:"none",border:"none",cursor:"pointer",color:"#ddd",padding:2,flexShrink:0}}>
                              <Trash2 size={13}/>
                            </button>
                          </div>
                        ))}
                        <TaskForm catId={cat.id} upd={upd} color={cat.color}/>
                      </div>
                    </div>

                    {/* Finanzas + Vision */}
                    <div style={{display:"flex",flexDirection:"column",gap:16}}>
                      <div style={{padding:16,borderRadius:14,background:"rgba(255,255,255,.65)",border:"1px solid rgba(224,187,228,.25)"}}>
                        <div style={{fontSize:12,fontWeight:500,color:"#9b8ab4",marginBottom:12,textTransform:"uppercase",letterSpacing:1.2}}>Finanzas</div>
                        {[["budgetEstimated","Presupuesto Estimado"],["budgetReal","Gasto Real"]].map(([f,l])=>(
                          <div key={f} style={{marginBottom:10}}>
                            <div style={{fontSize:12,color:"#aaa",marginBottom:4}}>{l}</div>
                            <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",borderRadius:10,border:"1px solid rgba(224,187,228,.3)",background:"white"}}>
                              <span style={{color:"#B2AC88",fontSize:14}}>$</span>
                              <input type="number" value={cat[f]}
                                onChange={e=>upd(x=>{x.categories.find(c=>c.id===cat.id)[f]=+e.target.value;})}
                                style={{border:"none",background:"transparent",flex:1,fontSize:14,color:"#4a3a5c"}}/>
                            </div>
                          </div>
                        ))}
                        <div style={{padding:"9px 12px",borderRadius:10,background:diff>=0?"#B2AC8815":"#F4A5A515",border:`1px solid ${diff>=0?"#B2AC8840":"#F4A5A540"}`}}>
                          <div style={{fontSize:11,color:"#aaa",marginBottom:2}}>Diferencia</div>
                          <div style={{fontSize:17,fontWeight:600,color:diff>=0?"#5a7a4a":"#c05a5a"}}>{diff>=0?"+":""}{fmt(diff)}</div>
                        </div>
                      </div>
                      <div>
                        <div style={{fontSize:12,fontWeight:500,color:"#9b8ab4",marginBottom:12,textTransform:"uppercase",letterSpacing:1.2}}>Vision Board</div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                          {cat.visionItems.map(v=>(
                            <div key={v.id} style={{position:"relative",borderRadius:12,overflow:"hidden",aspectRatio:"4/3",boxShadow:"0 3px 12px rgba(0,0,0,.08)"}}>
                              <img src={v.url} alt={v.label} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>{e.target.style.display="none";}}/>
                              <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"4px 8px",background:"rgba(0,0,0,.4)",fontSize:11,color:"white"}}>{v.label}</div>
                              <button onClick={()=>upd(x=>{const c=x.categories.find(c=>c.id===cat.id);c.visionItems=c.visionItems.filter(i=>i.id!==v.id);})}
                                style={{position:"absolute",top:5,right:5,background:"rgba(0,0,0,.45)",border:"none",borderRadius:"50%",cursor:"pointer",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center"}}>
                                <X size={12} color="white"/>
                              </button>
                            </div>
                          ))}
                        </div>
                        <VisionForm catId={cat.id} upd={upd} color={cat.color}/>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    )}

    {/* ──────── INVITADOS ──────── */}
    {tab==="invitados" && (
      <div className="fade">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:26,flexWrap:"wrap",gap:12}}>
          <div className="serif" style={{fontSize:38,color:"#4a3a5c",fontWeight:300}}>Invitados <span style={{fontStyle:"italic",color:"#B2AC88"}}>✦</span></div>
          <SyncBadge status={sync}/>
        </div>
        <div className="glass" style={{borderRadius:16,padding:"14px 20px",marginBottom:14,display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          <Search size={16} color="#ccc"/>
          <input placeholder="Buscar invitado…" value={gs} onChange={e=>setGs(e.target.value)}
            style={{flex:1,minWidth:120,border:"none",background:"transparent",fontSize:14,color:"#4a3a5c"}}/>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {["todos","confirmado","pendiente","rechazado"].map(f=>(
              <button key={f} onClick={()=>setGf(f)}
                style={{padding:"5px 13px",borderRadius:20,border:"1px solid",fontSize:12,cursor:"pointer",
                  borderColor:gf===f?"#E0BBE4":"transparent",background:gf===f?"#E0BBE420":"transparent",
                  color:gf===f?"#7b4f8a":"#aaa"}}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="glass" style={{borderRadius:20,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:"rgba(224,187,228,.1)",borderBottom:"1px solid rgba(224,187,228,.25)"}}>
                {["Nombre","RSVP","Alergias","Mesa",""].map(h=>(
                  <th key={h} style={{padding:"14px 16px",textAlign:"left",fontSize:11,color:"#9b8ab4",fontWeight:500,textTransform:"uppercase",letterSpacing:1.1}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.guests
                .filter(g=>(gf==="todos"||g.rsvp===gf)&&g.name.toLowerCase().includes(gs.toLowerCase()))
                .map((g,i)=>(
                <tr key={g.id} style={{borderBottom:"1px solid rgba(224,187,228,.1)",background:i%2===0?"transparent":"rgba(255,255,255,.35)"}}>
                  <td style={{padding:"12px 16px",fontSize:14,color:"#4a3a5c",fontWeight:500}}>{g.name}</td>
                  <td style={{padding:"12px 16px"}}>
                    <select value={g.rsvp} onChange={e=>upd(x=>{x.guests.find(y=>y.id===g.id).rsvp=e.target.value;})}
                      style={{padding:"5px 11px",borderRadius:20,border:"1px solid",fontSize:12,cursor:"pointer",
                        borderColor:g.rsvp==="confirmado"?"#B2AC88":g.rsvp==="pendiente"?"#FFD580":"#F4A5A5",
                        background:g.rsvp==="confirmado"?"#B2AC8820":g.rsvp==="pendiente"?"#FFD58020":"#F4A5A520",
                        color:g.rsvp==="confirmado"?"#5a6a45":g.rsvp==="pendiente"?"#8a7230":"#c05a5a"}}>
                      <option value="confirmado">confirmado</option>
                      <option value="pendiente">pendiente</option>
                      <option value="rechazado">rechazado</option>
                    </select>
                  </td>
                  <td style={{padding:"12px 16px"}}>
                    <input value={g.allergies} onChange={e=>upd(x=>{x.guests.find(y=>y.id===g.id).allergies=e.target.value;})}
                      style={{padding:"5px 10px",borderRadius:8,border:"1px solid #eee",background:"white",fontSize:13,width:130,color:"#555"}}/>
                  </td>
                  <td style={{padding:"12px 16px"}}>
                    <input value={g.table} onChange={e=>upd(x=>{x.guests.find(y=>y.id===g.id).table=e.target.value;})}
                      style={{padding:"5px 10px",borderRadius:8,border:"1px solid #eee",background:"white",fontSize:13,width:60,textAlign:"center",color:"#555"}}/>
                  </td>
                  <td style={{padding:"12px 16px"}}>
                    <button onClick={()=>upd(x=>{x.guests=x.guests.filter(y=>y.id!==g.id);})}
                      style={{background:"none",border:"none",cursor:"pointer",color:"#ddd"}}>
                      <Trash2 size={14}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <GuestForm upd={upd}/>
        </div>
      </div>
    )}

    {/* ──────── TIMELINE ──────── */}
    {tab==="timeline" && (
      <div className="fade">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:26,flexWrap:"wrap",gap:12}}>
          <div className="serif" style={{fontSize:38,color:"#4a3a5c",fontWeight:300}}>Día B <span style={{fontStyle:"italic",color:"#B2AC88"}}>— Cronograma ✦</span></div>
          <SyncBadge status={sync}/>
        </div>
        <div style={{maxWidth:640,margin:"0 auto",position:"relative"}}>
          <div style={{position:"absolute",left:30,top:0,bottom:0,width:2,background:"linear-gradient(to bottom,#E0BBE4 0%,#B2AC88 100%)",borderRadius:1}}/>
          {data.timeline.map((item,i)=>{
            const TI = IconMap[item.icon]||Star;
            return (
              <div key={item.id} style={{display:"flex",gap:20,marginBottom:14,alignItems:"flex-start"}}>
                <div style={{flexShrink:0,width:60,display:"flex",justifyContent:"center",paddingTop:2}}>
                  <div style={{width:40,height:40,borderRadius:"50%",background:i%2===0?"#E0BBE4":"#B2AC88",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",zIndex:1,boxShadow:"0 3px 10px rgba(0,0,0,.1)"}}>
                    <TI size={17} color="white" strokeWidth={1.5}/>
                  </div>
                </div>
                <div className="glass" style={{flex:1,borderRadius:14,padding:"12px 16px",display:"flex",gap:12,alignItems:"center"}}>
                  <input value={item.time}
                    onChange={e=>upd(x=>{x.timeline.find(t=>t.id===item.id).time=e.target.value;})}
                    style={{width:58,padding:"5px 8px",borderRadius:8,border:"1px solid rgba(224,187,228,.35)",background:"rgba(255,255,255,.8)",fontSize:13,fontWeight:600,color:"#7b4f8a",textAlign:"center"}}/>
                  <input value={item.activity}
                    onChange={e=>upd(x=>{x.timeline.find(t=>t.id===item.id).activity=e.target.value;})}
                    style={{flex:1,padding:"5px 8px",borderRadius:8,border:"1px solid rgba(224,187,228,.2)",background:"transparent",fontSize:14,color:"#4a3a5c"}}/>
                  <button onClick={()=>upd(x=>{x.timeline=x.timeline.filter(t=>t.id!==item.id);})}
                    style={{background:"none",border:"none",cursor:"pointer",color:"#ddd",flexShrink:0}}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            );
          })}
          {/* Add new */}
          <div style={{display:"flex",gap:20,alignItems:"center"}}>
            <div style={{flexShrink:0,width:60,display:"flex",justifyContent:"center"}}>
              <div style={{width:40,height:40,borderRadius:"50%",background:"#f5f0fa",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1,border:"2px dashed #E0BBE4"}}>
                <Plus size={18} color="#E0BBE4"/>
              </div>
            </div>
            <TimelineForm upd={upd}/>
          </div>
        </div>
      </div>
    )}
  </div>
</div>
```

);
}

// ═══════════════════════════════════════════════════════════════════
// SUB-FORMS
// ═══════════════════════════════════════════════════════════════════
function TaskForm({ catId, upd, color }) {
const [open, setOpen] = useState(false);
const [text, setText] = useState(””); const [date, setDate] = useState(””); const [prio, setPrio] = useState(“media”);
const ok = () => {
if (!text.trim()) return;
upd(x => { x.categories.find(c=>c.id===catId).tasks.push({id:“t”+Date.now(),text,done:false,date,priority:prio}); });
setText(””); setDate(””); setOpen(false);
};
if (!open) return (
<button onClick={()=>setOpen(true)} style={{display:“flex”,alignItems:“center”,gap:8,padding:“8px 13px”,borderRadius:11,border:`1px dashed ${color}`,background:“transparent”,cursor:“pointer”,color:”#bbb”,fontSize:13}}>
<Plus size={14}/> Agregar tarea
</button>
);
return (
<div style={{padding:13,borderRadius:12,background:“rgba(255,255,255,.75)”,border:“1px solid rgba(224,187,228,.3)”,display:“flex”,flexDirection:“column”,gap:9}}>
<input placeholder=“Descripción de la tarea…” value={text} onChange={e=>setText(e.target.value)}
style={{padding:“8px 11px”,borderRadius:8,border:“1px solid #eee”,fontSize:13}}/>
<div style={{display:“flex”,gap:8}}>
<input type=“date” value={date} onChange={e=>setDate(e.target.value)} style={{flex:1,padding:“7px 10px”,borderRadius:8,border:“1px solid #eee”,fontSize:13}}/>
<select value={prio} onChange={e=>setPrio(e.target.value)} style={{padding:“7px 10px”,borderRadius:8,border:“1px solid #eee”,fontSize:13}}>
<option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
</select>
</div>
<div style={{display:“flex”,gap:8}}>
<button onClick={ok} style={{flex:1,padding:“8px”,borderRadius:9,background:color,border:“none”,cursor:“pointer”,color:“white”,fontSize:13,fontWeight:500}}>Guardar</button>
<button onClick={()=>setOpen(false)} style={{padding:“8px 13px”,borderRadius:9,background:”#f5f5f5”,border:“none”,cursor:“pointer”,fontSize:13}}>Cancelar</button>
</div>
</div>
);
}

function VisionForm({ catId, upd, color }) {
const [open, setOpen] = useState(false);
const [url, setUrl] = useState(””); const [label, setLabel] = useState(””);
const ok = () => {
if (!url.trim()) return;
upd(x => { x.categories.find(c=>c.id===catId).visionItems.push({id:“v”+Date.now(),url,label}); });
setUrl(””); setLabel(””); setOpen(false);
};
if (!open) return (
<button onClick={()=>setOpen(true)} style={{display:“flex”,alignItems:“center”,gap:8,padding:“8px 13px”,borderRadius:11,border:`1px dashed ${color}`,background:“transparent”,cursor:“pointer”,color:”#bbb”,fontSize:13,width:“100%”}}>
<Plus size={14}/> Agregar imagen / Pinterest URL
</button>
);
return (
<div style={{padding:13,borderRadius:12,background:“rgba(255,255,255,.75)”,border:“1px solid rgba(224,187,228,.3)”,display:“flex”,flexDirection:“column”,gap:9}}>
<input placeholder=“URL de imagen (Unsplash, Pinterest…)” value={url} onChange={e=>setUrl(e.target.value)}
style={{padding:“8px 11px”,borderRadius:8,border:“1px solid #eee”,fontSize:13}}/>
<input placeholder=“Etiqueta (ej: Ramo de novia)” value={label} onChange={e=>setLabel(e.target.value)}
style={{padding:“8px 11px”,borderRadius:8,border:“1px solid #eee”,fontSize:13}}/>
<div style={{display:“flex”,gap:8}}>
<button onClick={ok} style={{flex:1,padding:“8px”,borderRadius:9,background:color,border:“none”,cursor:“pointer”,color:“white”,fontSize:13,fontWeight:500}}>Agregar</button>
<button onClick={()=>setOpen(false)} style={{padding:“8px 13px”,borderRadius:9,background:”#f5f5f5”,border:“none”,cursor:“pointer”,fontSize:13}}>Cancelar</button>
</div>
</div>
);
}

function GuestForm({ upd }) {
const [name, setName] = useState(””); const [allergies, setA] = useState(””); const [table, setT] = useState(””);
const ok = () => {
if (!name.trim()) return;
upd(x => { x.guests.push({id:“g”+Date.now(),name,rsvp:“pendiente”,allergies:allergies||“Ninguna”,table}); });
setName(””); setA(””); setT(””);
};
return (
<div style={{padding:“13px 16px”,borderTop:“1px solid rgba(224,187,228,.2)”,display:“flex”,gap:10,alignItems:“center”,background:“rgba(255,255,255,.45)”,flexWrap:“wrap”}}>
<input placeholder=“Nombre completo…” value={name} onChange={e=>setName(e.target.value)}
style={{flex:2,minWidth:140,padding:“8px 13px”,borderRadius:11,border:“1px solid rgba(224,187,228,.3)”,fontSize:13,background:“white”}}/>
<input placeholder=“Alergias” value={allergies} onChange={e=>setA(e.target.value)}
style={{flex:1,minWidth:100,padding:“8px 13px”,borderRadius:11,border:“1px solid rgba(224,187,228,.3)”,fontSize:13,background:“white”}}/>
<input placeholder=“Mesa” value={table} onChange={e=>setT(e.target.value)}
style={{width:72,padding:“8px 13px”,borderRadius:11,border:“1px solid rgba(224,187,228,.3)”,fontSize:13,background:“white”,textAlign:“center”}}/>
<button onClick={ok} style={{padding:“9px 18px”,borderRadius:11,background:”#E0BBE4”,border:“none”,cursor:“pointer”,color:“white”,fontSize:13,fontWeight:500,display:“flex”,alignItems:“center”,gap:6}}>
<Plus size={14}/> Agregar
</button>
</div>
);
}

function TimelineForm({ upd }) {
const [time, setTime] = useState(””); const [activity, setActivity] = useState(””);
const ok = () => {
if (!activity.trim()) return;
upd(x => { x.timeline.push({id:“tl”+Date.now(),time,activity,icon:“Star”}); x.timeline.sort((a,b)=>a.time.localeCompare(b.time)); });
setTime(””); setActivity(””);
};
return (
<div className=“glass” style={{flex:1,borderRadius:14,padding:“11px 16px”,display:“flex”,gap:10,alignItems:“center”}}>
<input type=“time” value={time} onChange={e=>setTime(e.target.value)}
style={{width:82,padding:“6px 9px”,borderRadius:8,border:“1px solid rgba(224,187,228,.35)”,fontSize:13,color:”#7b4f8a”}}/>
<input placeholder=“Nueva actividad…” value={activity} onChange={e=>setActivity(e.target.value)}
style={{flex:1,padding:“6px 9px”,borderRadius:8,border:“1px solid rgba(224,187,228,.2)”,background:“transparent”,fontSize:14,color:”#4a3a5c”}}/>
<button onClick={ok} style={{padding:“7px 15px”,borderRadius:9,background:”#E0BBE4”,border:“none”,cursor:“pointer”,color:“white”,display:“flex”,alignItems:“center”}}>
<Plus size={14}/>
</button>
</div>
);
}
