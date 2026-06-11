import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import {
  Heart, Users, Clock, Sparkles, Menu, X, ChevronDown, ChevronUp,
  Plus, Trash2, Check, Download, Share2, Edit2, Save, Search,
  Flower, Music, Shirt, UtensilsCrossed, Camera, Car, Star, Gift,
  Cloud, CloudOff, Loader2, DollarSign, RefreshCw, StickyNote, Calendar
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import ErrorBoundary from "./components/ErrorBoundary";
import GuestManager from "./components/GuestManager";
import TableConfig from "./components/TableConfig";
import TableDashboard from "./components/TableDashboard";
import FinancialBreakdown from "./components/FinancialBreakdown";
import PostItBoard from "./components/PostItBoard";

const SUPABASE_URL      = "https://gruszoneusbmhkmeogvn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdydXN6b25ldXNibWhrbWVvZ3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODk1NDQsImV4cCI6MjA4OTg2NTU0NH0.Z_F4EIKj_sahMRNgywImTT6m5jMU1KhE6MWQ1oVLRpM";
const ROW_ID = 1;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Inicializar detalles y galería
const initTaskDetails = (categories) => {
  categories.forEach(cat => {
    cat.tasks.forEach(task => {
      if (!task.details) task.details = [];
      if (!task.gallery) task.gallery = [];
    });
  });
  return categories;
};

const INIT = {
  weddingDate: "2027-06-12",
  coupleName: "Dani & Karim",
  budget: 200000,
  categories: [
    { id:"banquete", icon:"UtensilsCrossed", label:"Banquete", color:"#E0BBE4", budgetEstimated:60000, budgetReal:0,
      tasks: [
        {id:"t1",text:"Cita de degustación",done:false,date:"2026-08-15",priority:"alta", details:[], gallery:[]},
        {id:"t2",text:"Menú vegetariano",done:false,date:"2026-09-01",priority:"media", details:[], gallery:[]},
      ],
      visionItems: [
        {id:"v1",url:"https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400",label:"Decoración mesa"},
        {id:"v2",url:"https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=400",label:"Pastel"},
      ]},
    { id:"flores", icon:"Flower", label:"Flores", color:"#C8E6C9", budgetEstimated:30000, budgetReal:0,
      tasks: [{id:"t5",text:"Reunión con florista",done:true,date:"2026-07-10",priority:"alta", details:[], gallery:[]}],
      visionItems: [{id:"v3",url:"https://images.unsplash.com/photo-1490750967868-88df5691cc51?w=400",label:"Ramo"}]},
    { id:"musica", icon:"Music", label:"Música", color:"#B3E5FC", budgetEstimated:25000, budgetReal:0, tasks:[], visionItems:[]},
    { id:"vestuario", icon:"Shirt", label:"Vestuario", color:"#FFE0B2", budgetEstimated:35000, budgetReal:0, tasks:[], visionItems:[]},
    { id:"logistica", icon:"Car", label:"Logística", color:"#F8BBD9", budgetEstimated:20000, budgetReal:0, tasks:[], visionItems:[]},
    { id:"foto", icon:"Camera", label:"Fotografía", color:"#E1BEE7", budgetEstimated:30000, budgetReal:0, tasks:[], visionItems:[]},
  ],
  timeline: [  // Día B (preparativos)
    {id:"tl1",time:"07:00",activity:"Despertar & Desayuno",icon:"Star"},
    {id:"tl2",time:"08:00",activity:"Maquillaje",icon:"Sparkles"},
    {id:"tl3",time:"10:00",activity:"Fotografías",icon:"Camera"},
    {id:"tl4",time:"13:00",activity:"Ceremonia",icon:"Heart"},
  ],
  ddayTimeline: [ // D‑Day (día de la boda)
    {id:"dt1",time:"14:00",activity:"Llegada de invitados",icon:"Users"},
    {id:"dt2",time:"15:00",activity:"Ceremonia religiosa",icon:"Heart"},
    {id:"dt3",time:"16:30",activity:"Cóctel",icon:"Sparkles"},
    {id:"dt4",time:"18:00",activity:"Banquete",icon:"UtensilsCrossed"},
    {id:"dt5",time:"19:30",activity:"Primer baile",icon:"Music"},
    {id:"dt6",time:"21:00",activity:"Pastel",icon:"Gift"},
    {id:"dt7",time:"22:00",activity:"Fiesta",icon:"Music"},
    {id:"dt8",time:"01:00",activity:"Despedida",icon:"Star"},
  ],
};

function safeState(raw) {
  if (raw && Array.isArray(raw.categories) && raw.categories.length > 0) {
    return {
      ...raw,
      categories: initTaskDetails(raw.categories),
      timeline: raw.timeline || INIT.timeline,
      ddayTimeline: raw.ddayTimeline || INIT.ddayTimeline,
    };
  }
  return { ...INIT, timeline: INIT.timeline, ddayTimeline: INIT.ddayTimeline };
}

const IconMap = { UtensilsCrossed, Flower, Music, Shirt, Car, Camera, Heart, Sparkles, Star, Gift, Users, Calendar };
const COLORS  = ["#E0BBE4","#B2AC88","#B3E5FC","#FFE0B2","#F8BBD9","#E1BEE7"];
const fmt = n => new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(n);
const daysUntil = d => Math.max(0,Math.ceil((new Date(d+"T12:00:00")-new Date())/86400000));

function useDebounce(fn, ms) {
  const t = useRef();
  return useCallback((...a) => { clearTimeout(t.current); t.current = setTimeout(() => fn(...a), ms); }, [fn, ms]);
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  .serif{font-family:'Cormorant Garamond',serif;}
  .glass{background:rgba(255,255,255,0.72);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.85);}
  ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-thumb{background:#E0BBE4;border-radius:10px;}
  .fade{animation:fi 0.35s ease;}
  @keyframes fi{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
  @keyframes sp{from{transform:rotate(0);}to{transform:rotate(360deg);}}
  .spin{animation:sp 1s linear infinite;display:inline-flex;}
`;

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
      background:m.bg,border:`1px solid ${m.bd}`,color:m.c,fontSize:12,fontWeight:500,whiteSpace:"nowrap"}}>
      {m.icon} {m.text}
    </span>
  );
}

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

// Componente de detalles de tarea (con Cantidad)
function TaskDetailsForm({ task, catId, upd, color }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ concepto: "", caracteristica: "", precioUnitario: "", cantidad: "", total: 0 });
  useEffect(() => {
    if (open && task.details?.[0]) {
      const d = task.details[0];
      setFormData({
        concepto: d.concepto || "",
        caracteristica: d.caracteristica || "",
        precioUnitario: d.precioUnitario === 0 ? "" : d.precioUnitario.toString(),
        cantidad: d.cantidad?.toString() || "",
        total: d.total || 0,
      });
    } else if (open) setFormData({ concepto: "", caracteristica: "", precioUnitario: "", cantidad: "", total: 0 });
  }, [open, task.details]);
  useEffect(() => {
    const pu = parseFloat(formData.precioUnitario) || 0;
    const cant = formData.cantidad === "" ? 0 : parseInt(formData.cantidad, 10);
    setFormData(prev => ({ ...prev, total: pu * (isNaN(cant) ? 0 : cant) }));
  }, [formData.precioUnitario, formData.cantidad]);
  const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const saveDetails = () => {
    let cantidadFinal = formData.cantidad === "" ? "0" : formData.cantidad;
    const finalDetails = {
      concepto: formData.concepto,
      caracteristica: formData.caracteristica,
      precioUnitario: parseFloat(formData.precioUnitario) || 0,
      cantidad: parseInt(cantidadFinal, 10),
      total: (parseFloat(formData.precioUnitario) || 0) * (parseInt(cantidadFinal, 10) || 0),
    };
    upd(x => {
      const cat = x.categories.find(c => c.id === catId);
      const t = cat.tasks.find(t => t.id === task.id);
      if (!t.details) t.details = [];
      if (t.details.length === 0) t.details.push(finalDetails);
      else t.details[0] = finalDetails;
    });
    setOpen(false);
  };
  if (!open) return <button onClick={()=>setOpen(true)} className="ml-2 text-xs px-2 py-1 rounded-full bg-white/40 text-[#7b4f8a] hover:bg-[#E0BBE4]/30">{task.details?.length ? "✏️ Editar detalles" : "📋 Agregar detalles"}</button>;
  return (
    <div className="mt-2 p-3 rounded-xl bg-white/50 border border-[#E0BBE4]/30 space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <input type="text" placeholder="Concepto" value={formData.concepto} onChange={e=>updateField("concepto",e.target.value)} className="px-2 py-1 rounded-lg border border-gray-200 text-sm"/>
        <input type="text" placeholder="Característica" value={formData.caracteristica} onChange={e=>updateField("caracteristica",e.target.value)} className="px-2 py-1 rounded-lg border border-gray-200 text-sm"/>
        <input type="text" placeholder="Precio Unitario" value={formData.precioUnitario} onChange={e=>updateField("precioUnitario",e.target.value)} className="px-2 py-1 rounded-lg border border-gray-200 text-sm"/>
        <input type="text" placeholder="Cantidad" value={formData.cantidad} onChange={e=>{ let val=e.target.value; if(val===""||/^\d+$/.test(val)) updateField("cantidad",val); }} className="px-2 py-1 rounded-lg border border-gray-200 text-sm"/>
        <div className="flex items-center gap-2 text-sm font-medium">Total: ${formData.total.toLocaleString()}</div>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={()=>setOpen(false)} className="px-3 py-1 rounded-full bg-gray-200 text-gray-700">Cancelar</button>
        <button onClick={saveDetails} className="px-3 py-1 rounded-full bg-[#E0BBE4] text-white">Guardar detalles</button>
      </div>
    </div>
  );
}

// Galería dentro de categorías
function CategoryGallery({ catId, gallery, upd }) {
  const [newUrl, setNewUrl] = useState("");
  const addImage = () => {
    if (!newUrl.trim()) return;
    upd(x => {
      const cat = x.categories.find(c => c.id === catId);
      if (!cat.gallery) cat.gallery = [];
      cat.gallery.push({ id: Date.now(), url: newUrl.trim(), label: "" });
    });
    setNewUrl("");
  };
  const removeImage = (id) => {
    upd(x => {
      const cat = x.categories.find(c => c.id === catId);
      cat.gallery = cat.gallery?.filter(img => img.id !== id) || [];
    });
  };
  return (
    <div className="mt-4">
      <div className="flex gap-2 mb-2"><input type="text" placeholder="URL de imagen" value={newUrl} onChange={e=>setNewUrl(e.target.value)} className="flex-1 p-1 rounded border border-gray-200 text-sm"/><button onClick={addImage} className="px-2 py-1 rounded-full bg-[#E0BBE4] text-white text-xs">Agregar</button></div>
      <div className="grid grid-cols-3 gap-2">{gallery?.map(img => <div key={img.id} className="relative group"><img src={img.url} alt="" className="w-full h-24 object-cover rounded-lg" onError={e=>e.target.style.display='none'}/><button onClick={()=>removeImage(img.id)} className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5"><X size={12} color="white"/></button></div>)}</div>
    </div>
  );
}

// Collage dinámico en Dashboard
function VisionBoardCollage({ categories, onRefresh }) {
  const [images, setImages] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => {
    setRefreshKey(k => k+1);
    if (onRefresh) onRefresh();
  };
  useEffect(() => {
    const allImages = [];
    categories.forEach(cat => {
      if (cat.visionItems && cat.visionItems.length) {
        const randomIndex = Math.floor(Math.random() * cat.visionItems.length);
        allImages.push({ url: cat.visionItems[randomIndex].url, label: cat.label, color: cat.color });
      }
    });
    setImages(allImages);
  }, [categories, refreshKey]);
  if (images.length === 0) return <div className="text-center py-8 text-[#aaa]">Agrega imágenes en "Vision Board" de cada categoría</div>;
  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-3"><h3 className="serif text-xl text-[#4a3a5c]">✦ Inspiración visual</h3><button onClick={refresh} className="flex items-center gap-1 text-sm px-3 py-1 rounded-full bg-[#E0BBE4]/20 border border-[#E0BBE4]/50"><RefreshCw size={14}/> Actualizar collage</button></div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 auto-rows-[180px]">
        {images.map((img, idx) => (
          <div key={idx} className="rounded-xl overflow-hidden shadow-md relative" style={{ gridRow: idx % 3 === 0 ? "span 2" : "span 1", backgroundColor: img.color }}>
            <img src={img.url} alt={img.label} className="w-full h-full object-cover" onError={e=>e.target.src='https://via.placeholder.com/300?text=Imagen+no+disponible'}/>
            <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs p-1">{img.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== COMPONENTE PRINCIPAL ====================
export default function App() {
  const [data, setData] = useState(() => safeState(JSON.parse(localStorage.getItem("wos5")) || INIT));
  const [sync, setSync] = useState("loading");
  const [tab, setTab] = useState("dashboard");
  const [sidebarOpen, setSO] = useState(true);
  const [exCat, setExCat] = useState(null);
  const [editD, setEditD] = useState(false);
  const [toast, setToast] = useState(false);
  const [guestStats, setGuestStats] = useState({ total:0, confirmados:0, pendientes:0, rechazados:0 });
  const [showNewCatModal, setShowNewCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("Heart");
  const [newCatBudget, setNewCatBudget] = useState("");
  const [editCatModal, setEditCatModal] = useState(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatIcon, setEditCatIcon] = useState("");
  const [editCatBudget, setEditCatBudget] = useState("");
  const [editTaskModal, setEditTaskModal] = useState(null);
  const [editTaskText, setEditTaskText] = useState("");
  const [editTaskDate, setEditTaskDate] = useState("");
  const [editTaskPriority, setEditTaskPriority] = useState("");

  const loadGuestStats = async () => {
    const { data: guests } = await sb.from("guests").select("rsvp");
    if (guests) setGuestStats({ total: guests.length, confirmados: guests.filter(g=>g.rsvp===true).length, pendientes: guests.filter(g=>g.rsvp===false).length, rechazados: 0 });
  };
  const recalcBudgetRealFromPayments = async (x) => {
    const { data: allPayments } = await sb.from("task_payments").select("*");
    const sums = {};
    allPayments?.forEach(p => sums[p.category_id] = (sums[p.category_id] || 0) + p.amount);
    x.categories.forEach(cat => cat.budgetReal = sums[cat.id] || 0);
    return x;
  };
  const createNewCategory = () => {
    if (!newCatName.trim()) return;
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    upd(x => {
      x.categories.push({ id: `cat_${Date.now()}`, icon: newCatIcon, label: newCatName.trim(), color: randomColor, budgetEstimated: parseFloat(newCatBudget) || 0, budgetReal: 0, tasks: [], visionItems: [], gallery: [] });
    });
    setShowNewCatModal(false);
    setNewCatName(""); setNewCatIcon("Heart"); setNewCatBudget("");
  };
  const deleteCategory = (catId) => { if (window.confirm("¿Eliminar categoría?")) upd(x => { x.categories = x.categories.filter(c => c.id !== catId); }); };
  const openEditCategory = (cat) => { setEditCatModal(cat); setEditCatName(cat.label); setEditCatIcon(cat.icon); setEditCatBudget(cat.budgetEstimated.toString()); };
  const saveEditCategory = () => {
    if (!editCatModal) return;
    upd(x => {
      const cat = x.categories.find(c => c.id === editCatModal.id);
      if (cat) { cat.label = editCatName; cat.icon = editCatIcon; cat.budgetEstimated = parseFloat(editCatBudget) || 0; }
    });
    setEditCatModal(null);
  };
  const openEditTask = (catId, task) => { setEditTaskModal({ catId, task }); setEditTaskText(task.text); setEditTaskDate(task.date); setEditTaskPriority(task.priority); };
  const saveEditTask = () => {
    if (!editTaskModal) return;
    upd(x => {
      const cat = x.categories.find(c => c.id === editTaskModal.catId);
      const task = cat.tasks.find(t => t.id === editTaskModal.task.id);
      if (task) { task.text = editTaskText; task.date = editTaskDate; task.priority = editTaskPriority; }
    });
    setEditTaskModal(null);
  };

  useEffect(() => {
    (async () => {
      try {
        const { data: row } = await sb.from("wedding_state").select("data").eq("id", ROW_ID).maybeSingle();
        let safe = row?.data ? safeState(row.data) : INIT;
        safe = await recalcBudgetRealFromPayments(safe);
        setData(safe);
        localStorage.setItem("wos5", JSON.stringify(safe));
        setSync("idle");
        await loadGuestStats();
      } catch { setSync("error"); }
    })();
  }, []);

  useEffect(() => {
    const channel = sb.channel("wedding_realtime")
      .on("postgres_changes", { event:"UPDATE", schema:"public", table:"wedding_state", filter:`id=eq.${ROW_ID}` }, (payload) => {
        if (payload.new?.data) { setData(safeState(payload.new.data)); setSync("saved"); setTimeout(()=>setSync("idle"),2500); }
      })
      .on("postgres_changes", { event:"*", schema:"public", table:"guests" }, () => loadGuestStats())
      .on("postgres_changes", { event:"*", schema:"public", table:"task_payments" }, async () => { upd(async x => await recalcBudgetRealFromPayments(x)); })
      .subscribe();
    return () => sb.removeChannel(channel);
  }, []);

  const pushToCloud = useCallback(async (payload) => {
    setSync("saving");
    const { error } = await sb.from("wedding_state").update({ data: payload }).eq("id", ROW_ID);
    if (error) setSync("error");
    else { setSync("saved"); setTimeout(()=>setSync("idle"),3000); }
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

  const spent = data.categories.reduce((a,c)=>a+(c.budgetReal||0),0);
  const estim = data.categories.reduce((a,c)=>a+(c.budgetEstimated||0),0);
  const d = daysUntil(data.weddingDate);
  const cats = data.categories.map(c => ({ ...c, pct: c.tasks.length ? Math.round(c.tasks.filter(t=>t.done).length/c.tasks.length*100) : 0 }));

  const share = () => { navigator.clipboard?.writeText(window.location.href); setToast(true); setTimeout(()=>setToast(false),3000); };
  const exportData = () => {
    const lines = [
      `💍 ${data.coupleName} — Wedding OS`,
      `Fecha: ${data.weddingDate} | Días: ${d}`,
      `PRESUPUESTO: ${fmt(data.budget)} | Gastado: ${fmt(spent)}`,
      "CATEGORÍAS:", ...data.categories.map(c=>`• ${c.label}: ${c.tasks.filter(t=>t.done).length}/${c.tasks.length} | ${fmt(c.budgetReal)}`),
      "INVITADOS:", `Confirmados: ${guestStats.confirmados}`, `Pendientes: ${guestStats.pendientes}`,
      "TIMELINE (Día B):", ...data.timeline.map(t=>`  ${t.time}  ${t.activity}`),
      "D‑DAY (Evento):", ...data.ddayTimeline.map(t=>`  ${t.time}  ${t.activity}`)
    ];
    const blob = new Blob([lines.join("\n")], {type:"text/plain"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "wedding-os.txt"; a.click();
  };

  const nav = [
    {id:"dashboard", l:"Dashboard", I:Heart},
    {id:"categorias", l:"Categorías", I:Sparkles},
    {id:"invitados", l:"Invitados", I:Users},
    {id:"mesas", l:"Mesas", I:Users},
    {id:"finanzas", l:"Finanzas", I:DollarSign},
    {id:"timeline", l:"Día B", I:Clock},
    {id:"dday", l:"D‑Day", I:Calendar},
    {id:"postits", l:"Post-its", I:StickyNote},
  ];

  return (
    <div style={{display:"flex",minHeight:"100vh",background:"linear-gradient(135deg,#F5F0F8 0%,#EFF5F0 50%,#F8F2ED 100%)",fontFamily:"'DM Sans',sans-serif"}}>
      <style>{CSS}</style>
      {toast && <div style={{position:"fixed",top:20,right:20,zIndex:999,background:"#7b4f8a",color:"white",padding:"12px 20px",borderRadius:14,fontSize:13}}>✓ Link copiado!</div>}
      {/* Sidebar */}
      <div style={{width:sidebarOpen?248:72,transition:"width .3s",flexShrink:0,background:"rgba(255,255,255,.78)",backdropFilter:"blur(28px)",borderRight:"1px solid rgba(224,187,228,.3)",display:"flex",flexDirection:"column",position:"sticky",top:0,height:"100vh",zIndex:50}}>
        <div style={{padding:"22px 18px 16px",borderBottom:"1px solid rgba(224,187,228,.2)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          {sidebarOpen && <div><div className="serif" style={{fontSize:22,color:"#4a3a5c",fontWeight:300}}>Wedding</div><div className="serif" style={{fontSize:22,color:"#B2AC88",fontStyle:"italic"}}>OS ✦</div></div>}
          <button onClick={()=>setSO(o=>!o)} style={{background:"none",border:"none",cursor:"pointer",color:"#9b8ab4"}}>{sidebarOpen?<X size={18}/>:<Menu size={18}/>}</button>
        </div>
        {sidebarOpen && <div style={{padding:"12px 18px",borderBottom:"1px solid rgba(224,187,228,.15)"}}><div className="serif" style={{fontSize:16,color:"#6b5c7e",fontStyle:"italic"}}>{data.coupleName}</div><div style={{fontSize:11,color:"#aaa",marginTop:2}}>{data.weddingDate}</div><SyncBadge status={sync}/></div>}
        <nav style={{flex:1,padding:"14px 8px",display:"flex",flexDirection:"column",gap:4}}>
          {nav.map(({id,l,I})=><button key={id} onClick={()=>setTab(id)} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 12px",borderRadius:12,background:tab===id?"rgba(224,187,228,.3)":"transparent",border:tab===id?"1px solid rgba(224,187,228,.5)":"1px solid transparent",cursor:"pointer",color:tab===id?"#7b4f8a":"#8a8aaa",fontWeight:tab===id?500:400,fontSize:14,textAlign:"left"}}><I size={18} strokeWidth={tab===id?2:1.5}/>{sidebarOpen&&l}</button>)}
        </nav>
        {sidebarOpen && <div style={{padding:"14px 16px",borderTop:"1px solid rgba(224,187,228,.2)",display:"flex",flexDirection:"column",gap:8}}>
          <button onClick={exportData} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:11,background:"rgba(178,172,136,.15)",border:"1px solid rgba(178,172,136,.35)",cursor:"pointer",color:"#7a7555",fontSize:13,fontWeight:500}}><Download size={15}/> Exportar</button>
          <button onClick={share} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:11,background:"rgba(224,187,228,.2)",border:"1px solid rgba(224,187,228,.45)",cursor:"pointer",color:"#7b4f8a",fontSize:13,fontWeight:500}}><Share2 size={15}/> Compartir</button>
        </div>}
      </div>

      {/* Main content */}
      <div style={{flex:1,overflow:"auto",padding:"32px 28px"}}>
        {tab === "dashboard" && (
          <div className="fade">
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28,flexWrap:"wrap",gap:12}}>
              <div><div className="serif" style={{fontSize:38,color:"#4a3a5c",fontWeight:300,lineHeight:1.15}}>Bienvenida, <span style={{fontStyle:"italic",color:"#B2AC88"}}>{data.coupleName.split("&")[0].trim()} ✦</span></div><div style={{fontSize:15,color:"#aaa",marginTop:6}}>Todo en un solo lugar para su día perfecto</div></div>
              <SyncBadge status={sync}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(215px,1fr))",gap:16,marginBottom:24}}>
              <div className="glass" style={{borderRadius:22,padding:"22px 24px",position:"relative",overflow:"hidden"}}>
                <div style={{fontSize:11,fontWeight:500,color:"#B2AC88",textTransform:"uppercase",letterSpacing:1.6,marginBottom:10}}>Cuenta Regresiva</div>
                <div className="serif" style={{fontSize:56,color:"#4a3a5c",fontWeight:300,lineHeight:1}}>{d}</div>
                <div style={{fontSize:13,color:"#bbb",marginTop:6}}>días restantes</div>
                {editD?(
                  <div style={{marginTop:12,display:"flex",gap:8}}><input type="date" defaultValue={data.weddingDate} id="di" style={{flex:1,padding:"7px 10px",borderRadius:9,border:"1px solid #E0BBE4",fontSize:13}}/><button onClick={()=>{upd(x=>{x.weddingDate=document.getElementById("di").value;});setEditD(false);}} style={{padding:"7px 11px",borderRadius:9,background:"#E0BBE4",border:"none",cursor:"pointer"}}><Save size={14} color="#fff"/></button></div>
                ):(
                  <button onClick={()=>setEditD(true)} style={{marginTop:10,display:"flex",alignItems:"center",gap:5,background:"none",border:"none",cursor:"pointer",color:"#c4a0cc",fontSize:12}}><Edit2 size={12}/> {data.weddingDate}</button>
                )}
                <div style={{position:"absolute",top:16,right:18,fontSize:30}}>💍</div>
              </div>
              <div className="glass" style={{borderRadius:22,padding:"22px 24px"}}>
                <div style={{fontSize:11,fontWeight:500,color:"#B2AC88",textTransform:"uppercase",letterSpacing:1.6,marginBottom:10}}>Presupuesto Total</div>
                <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:16}}><div className="serif" style={{fontSize:28,color:"#4a3a5c"}}>{fmt(data.budget)}</div><button onClick={()=>{const v=prompt("Nuevo presupuesto MXN:",data.budget);if(v&&!isNaN(v))upd(x=>{x.budget=+v;});}} style={{background:"none",border:"none",cursor:"pointer",color:"#ccc"}}><Edit2 size={13}/></button></div>
                {[{l:"Gastado",v:spent,c:"#c77daa"},{l:"Estimado",v:estim,c:"#E0BBE4"},{l:"Disponible",v:data.budget-spent,c:"#B2AC88"}].map(r=>(
                  <div key={r.l} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#888",marginBottom:4}}><span>{r.l}</span><span style={{fontWeight:500,color:"#555"}}>{fmt(r.v)}</span></div><div style={{height:5,borderRadius:3,background:"#f0e8f5"}}><div style={{height:"100%",borderRadius:3,background:r.c,width:`${Math.min(100,(r.v/data.budget)*100)}%`}}/></div></div>
                ))}
              </div>
              <div className="glass" style={{borderRadius:22,padding:"22px 24px"}}>
                <div style={{fontSize:11,fontWeight:500,color:"#B2AC88",textTransform:"uppercase",letterSpacing:1.6,marginBottom:10}}>Invitados</div>
                <div className="serif" style={{fontSize:44,color:"#4a3a5c",fontWeight:300,marginBottom:14}}>{guestStats.total}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  <div style={{background:"#B2AC8833",borderRadius:11,padding:"9px 6px",textAlign:"center"}}><div style={{fontSize:22,fontWeight:700,color:"#4a3a5c"}}>{guestStats.confirmados}</div><div style={{fontSize:10,color:"#888"}}>Conf.</div></div>
                  <div style={{background:"#FFD58033",borderRadius:11,padding:"9px 6px",textAlign:"center"}}><div style={{fontSize:22,fontWeight:700,color:"#4a3a5c"}}>{guestStats.pendientes}</div><div style={{fontSize:10,color:"#888"}}>Pend.</div></div>
                  <div style={{background:"#F4A5A533",borderRadius:11,padding:"9px 6px",textAlign:"center"}}><div style={{fontSize:22,fontWeight:700,color:"#4a3a5c"}}>{guestStats.rechazados}</div><div style={{fontSize:10,color:"#888"}}>Rech.</div></div>
                </div>
                <div style={{fontSize:10,color:"#aaa",marginTop:12,textAlign:"center"}}>Datos desde Google Sheets</div>
              </div>
              <div className="glass" style={{borderRadius:22,padding:"22px 24px"}}>
                <div style={{fontSize:11,fontWeight:500,color:"#B2AC88",textTransform:"uppercase",letterSpacing:1.6,marginBottom:12}}>Colaboración ☁</div>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}><div style={{width:44,height:44,borderRadius:14,background:"rgba(224,187,228,.25)",display:"flex",alignItems:"center",justifyContent:"center"}}>{sync==="error"?<CloudOff size={22}/>:<Cloud size={22}/>}</div><div><div style={{fontSize:13,fontWeight:600,color:"#4a3a5c"}}>Supabase Realtime</div><div style={{fontSize:11,color:"#aaa",marginTop:2}}>wedding_state · id=1</div></div></div>
                <div style={{fontSize:12,color:"#aaa",lineHeight:1.65,marginBottom:12}}>Cambios sincronizados automáticamente.</div>
                <SyncBadge status={sync}/>
              </div>
            </div>
            <div className="glass" style={{borderRadius:22,padding:"26px 30px",marginBottom:22}}><div className="serif" style={{fontSize:24,color:"#4a3a5c",marginBottom:22}}>Project Health ✦</div><div style={{display:"flex",flexWrap:"wrap",gap:28,justifyContent:"space-around"}}>{cats.map((c,i)=><Ring key={c.id} pct={c.pct} color={COLORS[i]} sz={92} label={c.label} sub={`${c.tasks.filter(t=>t.done).length}/${c.tasks.length}`}/>)}</div></div>
            <div className="glass" style={{borderRadius:22,padding:"26px 30px"}}><div className="serif" style={{fontSize:24,color:"#4a3a5c",marginBottom:18}}>Próximas Tareas ✦</div><div style={{display:"flex",flexDirection:"column",gap:10}}>
              {data.categories.flatMap(c=>c.tasks.filter(t=>!t.done).map(t=>({...t,cat:c.label,cc:c.color}))).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,5).map(t=>(
                <div key={t.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",borderRadius:13,background:"rgba(255,255,255,.55)",border:"1px solid rgba(224,187,228,.2)"}}><div style={{width:10,height:10,borderRadius:"50%",background:t.cc}}/><div style={{flex:1}}><div style={{fontSize:14,color:"#4a3a5c"}}>{t.text}</div><div style={{fontSize:11,color:"#bbb",marginTop:2}}>{t.cat} · {t.date}</div></div><span style={{fontSize:10,padding:"3px 9px",borderRadius:20,background:t.priority==="alta"?"#F4A5A530":t.priority==="media"?"#FFD58030":"#B2AC8830"}}>{t.priority}</span></div>
              ))}
            </div></div>
            <VisionBoardCollage categories={data.categories} />
          </div>
        )}
        {tab === "categorias" && (
          <div className="fade">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:26,flexWrap:"wrap",gap:12}}><div className="serif" style={{fontSize:38,color:"#4a3a5c",fontWeight:300}}>Categorías <span style={{fontStyle:"italic",color:"#B2AC88"}}>✦</span></div><SyncBadge status={sync}/></div>
            <div className="flex justify-end mb-4"><button onClick={()=>setShowNewCatModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#E0BBE4]/30 border border-[#E0BBE4]/50 text-[#7b4f8a] hover:bg-[#E0BBE4]/50 transition"><Plus size={16}/> Agregar Categoría</button></div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {cats.map(cat=>{
                const CI=IconMap[cat.icon]||Sparkles, open=exCat===cat.id, diff=cat.budgetEstimated-cat.budgetReal;
                return <div key={cat.id} className="glass" style={{borderRadius:20,overflow:"hidden"}}>
                  <div className="flex items-center justify-between w-full">
                    <button onClick={()=>setExCat(open?null:cat.id)} className="flex flex-1 items-center gap-14 p-4" style={{textAlign:"left"}}>
                      <div style={{width:42,height:42,borderRadius:13,background:cat.color+"55",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><CI size={20} color={cat.color} strokeWidth={1.5}/></div>
                      <div style={{flex:1,minWidth:0}}><div style={{fontSize:16,fontWeight:500,color:"#4a3a5c"}}>{cat.label}</div><div style={{display:"flex",gap:10,alignItems:"center",marginTop:5}}><div style={{width:90,height:5,borderRadius:3,background:"#f0e8f5",flexShrink:0}}><div style={{height:"100%",borderRadius:3,background:cat.color,width:`${cat.pct}%`}}/></div><span style={{fontSize:12,color:"#bbb"}}>{cat.pct}%</span></div></div>
                      <div style={{display:"flex",gap:16,alignItems:"center",flexShrink:0}}><div style={{textAlign:"right"}}><div style={{fontSize:14,fontWeight:500,color:"#4a3a5c"}}>{fmt(cat.budgetReal)}</div><div style={{fontSize:11,color:diff>=0?"#7a9a6a":"#c05a5a"}}>{diff>=0?"↓":"↑"} {fmt(Math.abs(diff))}</div></div>{open?<ChevronUp size={18} color="#aaa"/>:<ChevronDown size={18} color="#aaa"/>}</div>
                    </button>
                    <div className="flex gap-1 pr-2"><button onClick={()=>openEditCategory(cat)} className="p-1 text-gray-400 hover:text-[#7b4f8a]"><Edit2 size={16}/></button><button onClick={()=>deleteCategory(cat.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={16}/></button></div>
                  </div>
                  {open && <div style={{padding:"4px 22px 24px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
                    <div><div style={{fontSize:12,fontWeight:500,color:"#9b8ab4",marginBottom:12,textTransform:"uppercase",letterSpacing:1.2}}>Checklist</div><div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {cat.tasks.map(tk=>(
                        <div key={tk.id} style={{padding:"10px 12px",borderRadius:12,background:tk.done?"#B2AC8812":"rgba(255,255,255,.55)",border:"1px solid rgba(224,187,228,.2)"}}>
                          <div className="flex items-start gap-2">
                            <button onClick={()=>upd(x=>{const c=x.categories.find(c=>c.id===cat.id);const t=c.tasks.find(t=>t.id===tk.id);t.done=!t.done;})} style={{flexShrink:0,width:20,height:20,borderRadius:6,border:`2px solid ${tk.done?"#B2AC88":"#ddd"}`,background:tk.done?"#B2AC88":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>{tk.done&&<Check size={12} color="white" strokeWidth={3}/>}</button>
                            <div style={{flex:1}}><div style={{fontSize:13,color:tk.done?"#bbb":"#4a3a5c",textDecoration:tk.done?"line-through":"none"}}>{tk.text}</div><div className="flex flex-wrap gap-2 items-center mt-1"><span style={{fontSize:11,color:"#ccc"}}>{tk.date}</span><span style={{fontSize:10,padding:"1px 7px",borderRadius:20,background:tk.priority==="alta"?"#F4A5A530":tk.priority==="media"?"#FFD58030":"#B2AC8830",color:tk.priority==="alta"?"#c05a5a":tk.priority==="media"?"#8a7230":"#5a6a45"}}>{tk.priority}</span><TaskDetailsForm task={tk} catId={cat.id} upd={upd} color={cat.color}/></div></div>
                            <div className="flex"><button onClick={()=>openEditTask(cat.id, tk)} className="text-gray-400 hover:text-[#7b4f8a] mr-1"><Edit2 size={13}/></button><button onClick={()=>upd(x=>{const c=x.categories.find(c=>c.id===cat.id);c.tasks=c.tasks.filter(t=>t.id!==tk.id);})} className="text-gray-400 hover:text-red-500"><Trash2 size={13}/></button></div>
                          </div>
                        </div>
                      ))}
                      <TaskForm catId={cat.id} upd={upd} color={cat.color}/>
                    </div></div>
                    <div style={{display:"flex",flexDirection:"column",gap:16}}>
                      <div style={{padding:16,borderRadius:14,background:"rgba(255,255,255,.65)",border:"1px solid rgba(224,187,228,.25)"}}><div style={{fontSize:12,fontWeight:500,color:"#9b8ab4",marginBottom:12,textTransform:"uppercase",letterSpacing:1.2}}>Finanzas</div><div className="mb-2"><div className="text-xs text-[#aaa] mb-1">Presupuesto Estimado</div><div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-[#E0BBE4]/30"><span className="text-[#B2AC88]">$</span><input type="number" value={cat.budgetEstimated} onChange={e=>upd(x=>{x.categories.find(c=>c.id===cat.id).budgetEstimated=+e.target.value;})} className="border-none bg-transparent flex-1 text-[#4a3a5c] focus:outline-none"/></div></div><div className="mb-2"><div className="text-xs text-[#aaa] mb-1">Gasto Real (suma de pagos)</div><div className="p-2 rounded-lg bg-[#E0BBE4]/10 border border-[#E0BBE4]/30 text-[#4a3a5c] font-medium">{fmt(cat.budgetReal)}</div></div><div className="p-2 rounded-lg bg-[#B2AC88]/10 border border-[#B2AC88]/30"><div className="text-xs text-[#aaa]">Diferencia</div><div className={`font-semibold ${diff>=0?"text-[#5a7a4a]":"text-[#c05a5a]"}`}>{diff>=0?"+":""}{fmt(diff)}</div></div></div>
                      <div><div style={{fontSize:12,fontWeight:500,color:"#9b8ab4",marginBottom:12,textTransform:"uppercase",letterSpacing:1.2}}>Vision Board</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>{cat.visionItems.map(v=><div key={v.id} className="relative"><img src={v.url} alt="" className="w-full h-24 object-cover rounded-lg" onError={e=>e.target.style.display="none"}/><button onClick={()=>upd(x=>{const c=x.categories.find(c=>c.id===cat.id);c.visionItems=c.visionItems.filter(i=>i.id!==v.id);})} className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5"><X size={12} color="white"/></button></div>)}</div><VisionForm catId={cat.id} upd={upd} color={cat.color}/></div>
                      <div><div style={{fontSize:12,fontWeight:500,color:"#9b8ab4",marginBottom:12,textTransform:"uppercase",letterSpacing:1.2}}>Galería</div><CategoryGallery catId={cat.id} gallery={cat.gallery} upd={upd} /></div>
                    </div>
                  </div>}
                </div>;
              })}
            </div>
          </div>
        )}
        {tab === "invitados" && <div><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:26,flexWrap:"wrap",gap:12}}><div className="serif" style={{fontSize:38,color:"#4a3a5c",fontWeight:300}}>Invitados ✦</div><SyncBadge status={sync}/></div><ErrorBoundary><Suspense fallback={<div className="text-center py-8">Cargando módulo de invitados...</div>}><GuestManager /></Suspense></ErrorBoundary></div>}
        {tab === "mesas" && <div><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:26,flexWrap:"wrap",gap:12}}><div className="serif" style={{fontSize:38,color:"#4a3a5c",fontWeight:300}}>Mesas ✦</div><SyncBadge status={sync}/></div><div className="glass rounded-2xl p-6 space-y-6"><TableConfig /><ErrorBoundary><Suspense fallback={<div className="text-center py-8">Cargando dashboard de mesas...</div>}><TableDashboard /></Suspense></ErrorBoundary></div></div>}
        {tab === "finanzas" && <div><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:26,flexWrap:"wrap",gap:12}}><div className="serif" style={{fontSize:38,color:"#4a3a5c",fontWeight:300}}>Finanzas ✦</div><SyncBadge status={sync}/></div><FinancialBreakdown categories={data.categories} onPaymentAdded={()=>{upd(async x=>{await recalcBudgetRealFromPayments(x);});}}/></div>}
        {tab === "timeline" && (
          <div className="fade">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:26,flexWrap:"wrap",gap:12}}>
              <div className="serif" style={{fontSize:38,color:"#4a3a5c",fontWeight:300}}>Día B — Cronograma de preparativos ✦</div>
              <SyncBadge status={sync}/>
            </div>
            <div style={{maxWidth:640,margin:"0 auto",position:"relative"}}>
              <div style={{position:"absolute",left:30,top:0,bottom:0,width:2,background:"linear-gradient(to bottom,#E0BBE4,#B2AC88)",borderRadius:1}}/>
              {data.timeline.map((item,i)=>{
                const TI=IconMap[item.icon]||Star;
                return <div key={item.id} style={{display:"flex",gap:20,marginBottom:14,alignItems:"flex-start"}}>
                  <div style={{flexShrink:0,width:60,display:"flex",justifyContent:"center",paddingTop:2}}>
                    <div style={{width:40,height:40,borderRadius:"50%",background:i%2===0?"#E0BBE4":"#B2AC88",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1,boxShadow:"0 3px 10px rgba(0,0,0,.1)"}}><TI size={17} color="white" strokeWidth={1.5}/></div>
                  </div>
                  <div className="glass" style={{flex:1,borderRadius:14,padding:"12px 16px",display:"flex",gap:12,alignItems:"center"}}>
                    <input value={item.time} onChange={e=>upd(x=>{x.timeline.find(t=>t.id===item.id).time=e.target.value})} style={{width:58,padding:"5px 8px",borderRadius:8,border:"1px solid rgba(224,187,228,.35)",background:"rgba(255,255,255,.8)",fontSize:13,fontWeight:600,color:"#7b4f8a",textAlign:"center"}}/>
                    <input value={item.activity} onChange={e=>upd(x=>{x.timeline.find(t=>t.id===item.id).activity=e.target.value})} style={{flex:1,padding:"5px 8px",borderRadius:8,border:"1px solid rgba(224,187,228,.2)",background:"transparent",fontSize:14,color:"#4a3a5c"}}/>
                    <button onClick={()=>upd(x=>{x.timeline=x.timeline.filter(t=>t.id!==item.id)})} style={{background:"none",border:"none",cursor:"pointer",color:"#ddd",flexShrink:0}}><Trash2 size={13}/></button>
                  </div>
                </div>;
              })}
              <div style={{display:"flex",gap:20,alignItems:"center"}}>
                <div style={{flexShrink:0,width:60,display:"flex",justifyContent:"center"}}>
                  <div style={{width:40,height:40,borderRadius:"50%",background:"#f5f0fa",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1,border:"2px dashed #E0BBE4"}}><Plus size={18} color="#E0BBE4"/></div>
                </div>
                <TimelineForm upd={upd} target="timeline" />
              </div>
            </div>
          </div>
        )}
        {tab === "dday" && (
          <div className="fade">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:26,flexWrap:"wrap",gap:12}}>
              <div className="serif" style={{fontSize:38,color:"#4a3a5c",fontWeight:300}}>D‑Day — Cronograma del evento ✦</div>
              <SyncBadge status={sync}/>
            </div>
            <div style={{maxWidth:640,margin:"0 auto",position:"relative"}}>
              <div style={{position:"absolute",left:30,top:0,bottom:0,width:2,background:"linear-gradient(to bottom,#E0BBE4,#B2AC88)",borderRadius:1}}/>
              {data.ddayTimeline.map((item,i)=>{
                const TI=IconMap[item.icon]||Star;
                return <div key={item.id} style={{display:"flex",gap:20,marginBottom:14,alignItems:"flex-start"}}>
                  <div style={{flexShrink:0,width:60,display:"flex",justifyContent:"center",paddingTop:2}}>
                    <div style={{width:40,height:40,borderRadius:"50%",background:i%2===0?"#E0BBE4":"#B2AC88",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1,boxShadow:"0 3px 10px rgba(0,0,0,.1)"}}><TI size={17} color="white" strokeWidth={1.5}/></div>
                  </div>
                  <div className="glass" style={{flex:1,borderRadius:14,padding:"12px 16px",display:"flex",gap:12,alignItems:"center"}}>
                    <input value={item.time} onChange={e=>upd(x=>{x.ddayTimeline.find(t=>t.id===item.id).time=e.target.value})} style={{width:58,padding:"5px 8px",borderRadius:8,border:"1px solid rgba(224,187,228,.35)",background:"rgba(255,255,255,.8)",fontSize:13,fontWeight:600,color:"#7b4f8a",textAlign:"center"}}/>
                    <input value={item.activity} onChange={e=>upd(x=>{x.ddayTimeline.find(t=>t.id===item.id).activity=e.target.value})} style={{flex:1,padding:"5px 8px",borderRadius:8,border:"1px solid rgba(224,187,228,.2)",background:"transparent",fontSize:14,color:"#4a3a5c"}}/>
                    <button onClick={()=>upd(x=>{x.ddayTimeline=x.ddayTimeline.filter(t=>t.id!==item.id)})} style={{background:"none",border:"none",cursor:"pointer",color:"#ddd",flexShrink:0}}><Trash2 size={13}/></button>
                  </div>
                </div>;
              })}
              <div style={{display:"flex",gap:20,alignItems:"center"}}>
                <div style={{flexShrink:0,width:60,display:"flex",justifyContent:"center"}}>
                  <div style={{width:40,height:40,borderRadius:"50%",background:"#f5f0fa",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1,border:"2px dashed #E0BBE4"}}><Plus size={18} color="#E0BBE4"/></div>
                </div>
                <TimelineForm upd={upd} target="ddayTimeline" />
              </div>
            </div>
          </div>
        )}
        {tab === "postits" && <div><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:26,flexWrap:"wrap",gap:12}}><div className="serif" style={{fontSize:38,color:"#4a3a5c",fontWeight:300}}>Post-its ✦</div><SyncBadge status={sync}/></div><PostItBoard /></div>}
      </div>

      {/* Modales */}
      {showNewCatModal && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={()=>setShowNewCatModal(false)}><div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4" onClick={e=>e.stopPropagation()}><h3 className="serif text-2xl text-[#4a3a5c] mb-4">Nueva Categoría</h3><div className="space-y-3"><input type="text" placeholder="Nombre" value={newCatName} onChange={e=>setNewCatName(e.target.value)} className="w-full p-2 border rounded"/><div><label className="block text-sm mb-1">Icono</label><div className="flex flex-wrap gap-2">{["Heart","Users","Sparkles","Flower","Music","Shirt","UtensilsCrossed","Camera","Car","Star","Gift"].map(icon=>{const Ic=IconMap[icon];return <button key={icon} onClick={()=>setNewCatIcon(icon)} className={`p-2 rounded-lg border ${newCatIcon===icon?'bg-[#E0BBE4] border-[#E0BBE4]':'border-gray-200'}`}><Ic size={20}/></button>;})}</div></div><input type="number" placeholder="Presupuesto estimado (opcional)" value={newCatBudget} onChange={e=>setNewCatBudget(e.target.value)} className="w-full p-2 border rounded"/></div><div className="flex justify-end gap-3 mt-6"><button onClick={()=>setShowNewCatModal(false)} className="px-4 py-2 rounded-full bg-gray-200">Cancelar</button><button onClick={createNewCategory} className="px-4 py-2 rounded-full bg-[#E0BBE4] text-white">Crear</button></div></div></div>}
      {editCatModal && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={()=>setEditCatModal(null)}><div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4" onClick={e=>e.stopPropagation()}><h3 className="serif text-2xl text-[#4a3a5c] mb-4">Editar Categoría</h3><div className="space-y-3"><input type="text" placeholder="Nombre" value={editCatName} onChange={e=>setEditCatName(e.target.value)} className="w-full p-2 border rounded"/><div><label className="block text-sm mb-1">Icono</label><div className="flex flex-wrap gap-2">{["Heart","Users","Sparkles","Flower","Music","Shirt","UtensilsCrossed","Camera","Car","Star","Gift"].map(icon=>{const Ic=IconMap[icon];return <button key={icon} onClick={()=>setEditCatIcon(icon)} className={`p-2 rounded-lg border ${editCatIcon===icon?'bg-[#E0BBE4] border-[#E0BBE4]':'border-gray-200'}`}><Ic size={20}/></button>;})}</div></div><input type="number" placeholder="Presupuesto estimado" value={editCatBudget} onChange={e=>setEditCatBudget(e.target.value)} className="w-full p-2 border rounded"/></div><div className="flex justify-end gap-3 mt-6"><button onClick={()=>setEditCatModal(null)} className="px-4 py-2 rounded-full bg-gray-200">Cancelar</button><button onClick={saveEditCategory} className="px-4 py-2 rounded-full bg-[#E0BBE4] text-white">Guardar</button></div></div></div>}
      {editTaskModal && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={()=>setEditTaskModal(null)}><div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4" onClick={e=>e.stopPropagation()}><h3 className="serif text-2xl text-[#4a3a5c] mb-4">Editar Tarea</h3><div className="space-y-3"><input type="text" placeholder="Descripción" value={editTaskText} onChange={e=>setEditTaskText(e.target.value)} className="w-full p-2 border rounded"/><input type="date" value={editTaskDate} onChange={e=>setEditTaskDate(e.target.value)} className="w-full p-2 border rounded"/><select value={editTaskPriority} onChange={e=>setEditTaskPriority(e.target.value)} className="w-full p-2 border rounded"><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></div><div className="flex justify-end gap-3 mt-6"><button onClick={()=>setEditTaskModal(null)} className="px-4 py-2 rounded-full bg-gray-200">Cancelar</button><button onClick={saveEditTask} className="px-4 py-2 rounded-full bg-[#E0BBE4] text-white">Guardar</button></div></div></div>}
    </div>
  );
}

// ==================== Componentes auxiliares ====================
function TaskForm({catId,upd,color}) {
  const [open,setOpen]=useState(false); const [text,setText]=useState(""); const [date,setDate]=useState(""); const [prio,setPrio]=useState("media");
  const ok=()=>{if(!text.trim())return;upd(x=>{x.categories.find(c=>c.id===catId).tasks.push({id:"t"+Date.now(),text,done:false,date,priority:prio, details:[], gallery:[]});});setText("");setDate("");setOpen(false);};
  if(!open) return <button onClick={()=>setOpen(true)} className="flex items-center gap-2 text-sm px-3 py-1 rounded-full bg-white/40 text-[#7b4f8a] hover:bg-[#E0BBE4]/30 transition"><Plus size={14}/> Agregar tarea</button>;
  return <div className="p-3 rounded-xl bg-white/50 border border-[#E0BBE4]/30"><input placeholder="Descripción..." value={text} onChange={e=>setText(e.target.value)} className="w-full p-2 rounded border border-gray-200"/><div className="flex gap-2 mt-2"><input type="date" value={date} onChange={e=>setDate(e.target.value)} className="flex-1 p-2 rounded border border-gray-200"/><select value={prio} onChange={e=>setPrio(e.target.value)} className="p-2 rounded border border-gray-200"><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></div><div className="flex justify-end gap-2 mt-2"><button onClick={ok} className="px-3 py-1 rounded-full bg-[#E0BBE4] text-white">Guardar</button><button onClick={()=>setOpen(false)} className="px-3 py-1 rounded-full bg-gray-200">Cancelar</button></div></div>;
}
function VisionForm({catId,upd,color}) {
  const [open,setOpen]=useState(false); const [url,setUrl]=useState(""); const [label,setLabel]=useState("");
  const ok=()=>{if(!url.trim())return;upd(x=>{x.categories.find(c=>c.id===catId).visionItems.push({id:"v"+Date.now(),url,label});});setUrl("");setLabel("");setOpen(false);};
  if(!open) return <button onClick={()=>setOpen(true)} className="flex items-center gap-2 text-sm px-3 py-1 rounded-full bg-white/40 text-[#7b4f8a] hover:bg-[#E0BBE4]/30 transition w-full mt-2"><Plus size={14}/> Agregar imagen</button>;
  return <div className="p-3 rounded-xl bg-white/50 border border-[#E0BBE4]/30 mt-2"><input placeholder="URL de imagen..." value={url} onChange={e=>setUrl(e.target.value)} className="w-full p-2 rounded border border-gray-200"/><input placeholder="Etiqueta" value={label} onChange={e=>setLabel(e.target.value)} className="w-full p-2 rounded border border-gray-200 mt-1"/><div className="flex justify-end gap-2 mt-2"><button onClick={ok} className="px-3 py-1 rounded-full bg-[#E0BBE4] text-white">Agregar</button><button onClick={()=>setOpen(false)} className="px-3 py-1 rounded-full bg-gray-200">Cancelar</button></div></div>;
}
function TimelineForm({ upd, target = "timeline" }) {
  const [time,setTime]=useState("");
  const [activity,setActivity]=useState("");
  const ok=()=>{
    if(!activity.trim()) return;
    upd(x => {
      x[target].push({ id: "tl"+Date.now(), time, activity, icon:"Star" });
      x[target].sort((a,b)=>a.time.localeCompare(b.time));
    });
    setTime("");
    setActivity("");
  };
  return <div className="glass flex gap-2 p-2 rounded-xl mt-4"><input type="time" value={time} onChange={e=>setTime(e.target.value)} className="w-24 p-2 rounded border border-gray-200"/><input placeholder="Nueva actividad..." value={activity} onChange={e=>setActivity(e.target.value)} className="flex-1 p-2 rounded border border-gray-200"/><button onClick={ok} className="p-2 rounded-full bg-[#E0BBE4] text-white"><Plus size={16}/></button></div>;
}
