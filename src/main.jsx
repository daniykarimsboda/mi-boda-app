import { useState, useEffect, useRef, useCallback } from "react";
import {
  Heart, Users, Clock, Sparkles, Menu, X, ChevronDown, ChevronUp,
  Plus, Trash2, Check, Download, Share2, Edit2, Save, Search,
  Flower, Music, Shirt, UtensilsCrossed, Camera, Car, Star, Gift,
  Cloud, CloudOff, Loader2
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
// SUPABASE CONFIG
// ═══════════════════════════════════════════════════════════════════
const SUPABASE_URL      = "https://gruszoneusbmhkmeogvn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdydXN6b25ldXNibWhrbWVvZ3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODk1NDQsImV4cCI6MjA4OTg2NTU0NH0.Z_F4EIKj_sahMRNgywImTT6m5jMU1KhE6MWQ1oVLRpM";
const ROW_ID = 1;

// ═══════════════════════════════════════════════════════════════════
// SUPABASE CLIENT
// ═══════════════════════════════════════════════════════════════════
let _sb = null;
async function getSB() {
  if (_sb) return _sb;
  try {
    const m = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    _sb = m.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return _sb;
  } catch (e) {
    console.error("Supabase init error:", e);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// INITIAL DATA
// ═══════════════════════════════════════════════════════════════════
const INIT = {
  weddingDate: "2027-06-12",
  coupleName:  "Dani & Karim",
  budget:      200000,
  categories: [
    { id:"banquete",  icon:"UtensilsCrossed", label:"Banquete", color:"#E0BBE4", budgetEstimated:60000, budgetReal:42000,
      tasks:[
        {id:"t1",text:"Cita de degustación con el chef",done:false,date:"2026-08-15",priority:"alta"},
        {id:"t2",text:"Definir menú vegetariano y vegano",done:false,date:"2026-09-01",priority:"media"},
        {id:"t3",text:"Confirmar mesas y sillas",done:true,date:"2026-07-20",priority:"alta"},
        {id:"t4",text:"Opciones sin gluten",done:false,date:"2026-09-15",priority:"baja"},
      ],
      visionItems:[
        {id:"v1",url:"https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400",label:"Decoración mesa"},
        {id:"v2",url:"https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=400",label:"Pastel nupcial"},
      ]},
    { id:"flores", icon:"Flower", label:"Flores & Decoración", color:"#C8E6C9", budgetEstimated:30000, budgetReal:18500,
      tasks:[
        {id:"t5",text:"Reunión con florista",done:true,date:"2026-07-10",priority:"alta"},
        {id:"t6",text:"Elegir flores de temporada",done:false,date:"2026-08-01",priority:"media"},
        {id:"t7",text:"Presupuesto centros de mesa",done:false,date:"2026-08-20",priority:"alta"},
      ],
      visionItems:[{id:"v3",url:"https://images.unsplash.com/photo-1490750967868-88df5691cc51?w=400",label:"Ramo de novia"}]},
    { id:"musica", icon:"Music", label:"Música & Entretenimiento", color:"#B3E5FC", budgetEstimated:25000, budgetReal:25000,
      tasks:[
        {id:"t8",text:"Contratar DJ",done:true,date:"2026-06-30",priority:"alta"},
        {id:"t9",text:"Playlist ceremonia",done:false,date:"2026-10-01",priority:"media"},
        {id:"t10",text:"Verificar sonido en venue",done:false,date:"2026-11-01",priority:"alta"},
      ],
      visionItems:[]},
    { id:"vestuario", icon:"Shirt", label:"Vestuario", color:"#FFE0B2", budgetEstimated:35000, budgetReal:28000,
      tasks:[
        {id:"t11",text:"Prueba de maquillaje natural (miel/coco)",done:false,date:"2026-09-20",priority:"alta"},
        {id:"t12",text:"Kit emergencia con rodillo de pelusa",done:false,date:"2026-11-01",priority:"media"},
        {id:"t13",text:"Segunda prueba de vestido",done:true,date:"2026-08-05",priority:"alta"},
        {id:"t14",text:"Traje del novio y padrinos",done:false,date:"2026-09-01",priority:"media"},
      ],
      visionItems:[{id:"v4",url:"https://images.unsplash.com/photo-1519741497674-611481863552?w=400",label:"Vestido de novia"}]},
    { id:"logistica", icon:"Car", label:"Logística & Venue", color:"#F8BBD9", budgetEstimated:20000, budgetReal:15000,
      tasks:[
        {id:"t15",text:"Zona de descanso privada (Recarga)",done:false,date:"2026-10-15",priority:"media"},
        {id:"t16",text:"Transportadoras para mascotas",done:false,date:"2026-11-20",priority:"baja"},
        {id:"t17",text:"Transporte invitados foráneos",done:false,date:"2026-10-01",priority:"alta"},
        {id:"t18",text:"Confirmar horario con venue",done:true,date:"2026-07-15",priority:"alta"},
      ],
      visionItems:[]},
    { id:"foto", icon:"Camera", label:"Fotografía & Video", color:"#E1BEE7", budgetEstimated:30000, budgetReal:30000,
      tasks:[
        {id:"t19",text:"Sesión pre-boda (e-session)",done:true,date:"2026-08-20",priority:"alta"},
        {id:"t20",text:"Lista fotos con familia",done:false,date:"2026-11-15",priority:"media"},
        {id:"t21",text:"Fotógrafo segundo día",done:false,date:"2026-10-01",priority:"baja"},
      ],
      visionItems:[{id:"v5",url:"https://images.unsplash.com/photo-1606800052052-a08af7148866?w=400",label:"Estilo editorial"}]},
  ],
  guests: [
    {id:"g1",name:"María García",rsvp:"confirmado",allergies:"Ninguna",table:"1"},
    {id:"g2",name:"Carlos López",rsvp:"pendiente",allergies:"Gluten",table:"2"},
    {id:"g3",name:"Ana Martínez",rsvp:"confirmado",allergies:"Mariscos",table:"1"},
    {id:"g4",name:"Pedro Sánchez",rsvp:"rechazado",allergies:"Ninguna",table:""},
    {id:"g5",name:"Laura Gómez",rsvp:"confirmado",allergies:"Lácteos",table:"3"},
    {id:"g6",name:"Roberto Torres",rsvp:"pendiente",allergies:"Ninguna",table:"2"},
  ],
  timeline: [
    {id:"tl1",time:"07:00",activity:"Despertar & Desayuno en suite",icon:"Star"},
    {id:"tl2",time:"08:00",activity:"Maquillaje y peinado (novia)",icon:"Sparkles"},
    {id:"tl3",time:"10:00",activity:"Fotografías getting ready",icon:"Camera"},
    {id:"tl4",time:"11:30",activity:"Preparación del novio y padrinos",icon:"Shirt"},
    {id:"tl5",time:"13:00",activity:"Primer vistazo (First Look)",icon:"Heart"},
    {id:"tl6",time:"14:00",activity:"Ceremonia religiosa / civil",icon:"Heart"},
    {id:"tl7",time:"15:30",activity:"Sesión fotográfica de pareja",icon:"Camera"},
    {id:"tl8",time:"16:30",activity:"Cóctel de bienvenida",icon:"Sparkles"},
    {id:"tl9",time:"18:00",activity:"Recepción y banquete",icon:"UtensilsCrossed"},
    {id:"tl10",time:"19:30",activity:"Primer baile & vals con padres",icon:"Music"},
    {id:"tl11",time:"20:30",activity:"Corte del pastel y brindis",icon:"Gift"},
    {id:"tl12",time:"21:00",activity:"Pista de baile abierta",icon:"Music"},
    {id:"tl13",time:"01:00",activity:"Despedida & torna-boda",icon:"Heart"},
  ]
};

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS & HELPERS
// ═══════════════════════════════════════════════════════════════════
const IconMap = { UtensilsCrossed, Flower, Music, Shirt, Car, Camera, Heart, Sparkles, Star, Gift, Users };
const COLORS  = ["#E0BBE4","#B2AC88","#B3E5FC","#FFE0B2","#F8BBD9","#E1BEE7"];
const fmt = n => new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(n);
const daysUntil = d => Math.max(0,Math.ceil((new Date(d+"T12:00:00")-new Date())/86400000));

function useDebounce(fn, ms) {
  const t = useRef();
  return useCallback((...a) => { clearTimeout(t.current); t.current = setTimeout(() => fn(...a), ms); }, [fn, ms]);
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
    loading:{ icon:<Loader2 size={13} className="spin"/>, text:"Cargando...", bg:"#F3E5F5", bd:"#CE93D8", c:"#6a1b9a" },
    saving: { icon:<Loader2 size={13} className="spin"/>, text:"Guardando...", bg:"#FFF8E1", bd:"#FFD54F", c:"#8a6a00" },
    saved:  { icon:<Cloud size={13}/>, text:"Sincronizado ✓", bg:"#E8F5E9", bd:"#A5D6A7", c:"#2e7d32" },
    error:  { icon:<CloudOff size={13}/>, text:"Error de sync", bg:"#FFEBEE", bd:"#EF9A9A", c:"#c62828" },
    idle:   { icon:<Cloud size={13}/>, text:"Conectado", bg:"#F3E5F5", bd:"#CE93D8", c:"#6a1b9a" },
  };
  const m = M[status] || M.idle;
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:20,
    background:m.bg,border:`1px solid ${m.bd}`,color:m.c,fontSize:12,fontWeight:500,transition:"all .3s",whiteSpace:"nowrap"}}>
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
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
      <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}>
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke="#F0E8F5" strokeWidth={9}/>
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={color} strokeWidth={9} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c-(pct/100)*c}
        transform={`rotate(-90 ${sz/2} ${sz/2})`} style={{transition:"stroke-dashoffset 1s ease"}}/>
        <text x={sz/2} y={sz/2+5} textAnchor="middle" fontSize={14} fontWeight={600} fill="#4a3a5c" fontFamily="DM Sans">{pct}%</text>
      </svg>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:12,fontWeight:500,color:"#6b6b8a"}}>{label}</div>
        <div style={{fontSize:11,color:"#aaa"}}>{sub}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════
export default function WeddingOS() {
  const [data, setData]     = useState(() => { try { const s=localStorage.getItem("wos5"); return s?JSON.parse(s):INIT; } catch { return INIT; } });
  const [sync, setSync]     = useState("loading");
  const [tab,  setTab]      = useState("dashboard");
  const [sidebarOpen, setSO] = useState(true);
  const [exCat, setExCat]   = useState(null);
  const [gs, setGs]         = useState("");
  const [gf, setGf]         = useState("todos");
  const [editD, setEditD]   = useState(false);
  const [toast, setToast]   = useState(false);

  useEffect(() => {
    (async () => {
      const sb = await getSB();
      if (!sb) { setSync("error"); return; }
      try {
        const { data: row, error } = await sb
          .from("wedding_state")
          .select("data")
          .eq("id", ROW_ID)
          .maybeSingle();

        if (error) { console.error("Load error:", error); setSync("error"); return; }
        if (row?.data) {
          setData(row.data);
          localStorage.setItem("wos5", JSON.stringify(row.data));
        } else {
          const payload = INIT;
          await sb.from("wedding_state").upsert({ id: ROW_ID, data: payload });
          setData(payload);
        }
        setSync("idle");
      } catch (e) {
        setSync("error");
      }
    })();
  }, []);

  useEffect(() => {
    let channel;
    (async () => {
      const sb = await getSB();
      if (!sb) return;
      channel = sb
        .channel("wedding_state_changes")
        .on("postgres_changes", { event:"UPDATE", schema:"public", table:"wedding_state", filter:`id=eq.${ROW_ID}` },
        (payload) => {
          if (payload.new?.data) {
            setData(payload.new.data);
            localStorage.setItem("wos5", JSON.stringify(payload.new.data));
            setSync("saved");
            setTimeout(() => setSync("idle"), 2500);
          }
        })
        .subscribe();
    })();
    return () => { if (channel) getSB().then(sb => sb?.removeChannel(channel)); };
  }, []);

  const pushToCloud = useCallback(async (payload) => {
    const sb = await getSB();
    if (!sb) return;
    setSync("saving");
    try {
      const { error } = await sb.from("wedding_state").update({ data: payload }).eq("id", ROW_ID);
      if (error) setSync("error");
      else { setSync("saved"); setTimeout(() => setSync("idle"), 3000); }
    } catch (e) { setSync("error"); }
  }, []);

  const debouncedPush = useDebounce(pushToCloud, 1000);

  const upd = useCallback((fn) => {
    setData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      fn(next);
      localStorage.setItem("wos5", JSON.stringify(next));
      debouncedPush(next);
      return next;
    });
  }, [debouncedPush]);

  const spent = data.categories.reduce((a,c) => a+c.budgetReal, 0);
  const estim = data.categories.reduce((a,c) => a+c.budgetEstimated, 0);
  const d     = daysUntil(data.weddingDate);
  const cats  = data.categories.map(c => ({
    ...c, pct: c.tasks.length ? Math.round(c.tasks.filter(t=>t.done).length/c.tasks.length*100) : 0
  }));

  const exportData = () => {
    const txt = JSON.stringify(data, null, 2);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([txt],{type:"text/plain"}));
    a.download = `wedding-os-backup.txt`;
    a.click();
  };

  const navItems = [
    {id:"dashboard", l:"Dashboard",  I:Heart},
    {id:"categorias",l:"Categorías", I:Sparkles},
    {id:"invitados", l:"Invitados",  I:Users},
    {id:"timeline",  l:"Día B",      I:Clock},
  ];

  return (
    <div style={{display:"flex",minHeight:"100vh",background:"linear-gradient(135deg,#F5F0F8 0%,#EFF5F0 50%,#F8F2ED 100%)",fontFamily:"'DM Sans',sans-serif"}}>
      <style>{CSS}</style>
      {/* ... (El resto del JSX se mantiene igual, ya no contiene comillas de importación) ... */}
      <div style={{padding:"20px", color:"#4a3a5c"}}>
        <h1 className="serif">¡Wedding OS Desplegado!</h1>
        <SyncBadge status={sync} />
        {/* Aquí iría el resto de tu interfaz de Dashboard, Categorías, etc. */}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUB-FORMS (Ejemplo de uno corregido, aplica a todos)
// ═══════════════════════════════════════════════════════════════════
function TaskForm({ catId, upd, color }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(""); 
  const [date, setDate] = useState(""); 
  const [prio, setPrio] = useState("media");
  
  const ok = () => {
    if (!text.trim()) return;
    upd(x => { x.categories.find(c=>c.id===catId).tasks.push({id:"t"+Date.now(),text,done:false,date,priority:prio}); });
    setText(""); setDate(""); setOpen(false);
  };

  if (!open) return (
    <button onClick={()=>setOpen(true)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 13px",borderRadius:11,border:`1px dashed ${color}`,background:"transparent",cursor:"pointer",color:"#bbb",fontSize:13}}>
      <Plus size={14}/> Agregar tarea
    </button>
  );

  return (
    <div style={{padding:13,borderRadius:12,background:"rgba(255,255,255,0.75)",border:"1px solid rgba(224,187,228,0.3)",display:"flex",flexDirection:"column",gap:9}}>
      <input placeholder="Descripción de la tarea..." value={text} onChange={e=>setText(e.target.value)}
        style={{padding:"8px 11px",borderRadius:8,border:"1px solid #eee",fontSize:13}}/>
      <div style={{display:"flex",gap:8}}>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{flex:1,padding:"7px 10px",borderRadius:8,border:"1px solid #eee",fontSize:13}}/>
        <select value={prio} onChange={e=>setPrio(e.target.value)} style={{padding:"7px 10px",borderRadius:8,border:"1px solid #eee",fontSize:13}}>
          <option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
        </select>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={ok} style={{flex:1,padding:"8px",borderRadius:9,background:color,border:"none",cursor:"pointer",color:"white",fontSize:13,fontWeight:500}}>Guardar</button>
        <button onClick={()=>setOpen(false)} style={{padding:"8px 13px",borderRadius:9,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:13}}>Cancelar</button>
      </div>
    </div>
  );
}
