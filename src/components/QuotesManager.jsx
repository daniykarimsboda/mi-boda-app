import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Plus, Edit2, Trash2, Download, X, Star } from "lucide-react";

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
};

export default function QuotesManager({ categories }) {
  const [quotes, setQuotes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState("table"); // "table" o "compare"
  const [form, setForm] = useState({
    category_id: "",
    concept: "",
    conceptCustom: "",
    provider: "",
    description: "",
    quantity: 1,
    measure: "Piezas",
    unitCost: 0,
    total: 0,
    rating: 0,
    comment: "",
  });

  const loadQuotes = async () => {
    const { data } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
    if (data) setQuotes(data);
  };

  useEffect(() => { loadQuotes(); }, []);

  useEffect(() => {
    setForm(prev => ({ ...prev, total: (prev.quantity || 0) * (prev.unitCost || 0) }));
  }, [form.quantity, form.unitCost]);

  const openModal = (quote = null) => {
    if (quote) {
      setEditing(quote);
      setForm({
        category_id: quote.category_id,
        concept: quote.concept,
        conceptCustom: quote.concept === "Otro" ? quote.concept : "",
        provider: quote.provider,
        description: quote.description,
        quantity: quote.quantity,
        measure: quote.measure,
        unitCost: quote.unitCost,
        total: quote.total,
        rating: quote.rating,
        comment: quote.comment,
      });
    } else {
      setEditing(null);
      setForm({
        category_id: "",
        concept: "",
        conceptCustom: "",
        provider: "",
        description: "",
        quantity: 1,
        measure: "Piezas",
        unitCost: 0,
        total: 0,
        rating: 0,
        comment: "",
      });
    }
    setShowModal(true);
  };

  const saveQuote = async () => {
    if (!form.category_id) return alert("Selecciona una categoría");
    if (!form.provider) return alert("Proveedor es obligatorio");
    const conceptFinal = form.concept === "Otro" ? form.conceptCustom : form.concept;
    if (!conceptFinal) return alert("Concepto es obligatorio");
    const data = {
      category_id: form.category_id,
      concept: conceptFinal,
      provider: form.provider,
      description: form.description,
      quantity: form.quantity,
      measure: form.measure,
      unitCost: form.unitCost,
      total: form.total,
      rating: form.rating,
      comment: form.comment,
    };
    let error;
    if (editing) {
      const { error: e } = await supabase.from("quotes").update(data).eq("id", editing.id);
      error = e;
    } else {
      const { error: e } = await supabase.from("quotes").insert(data);
      error = e;
    }
    if (error) alert("Error: " + error.message);
    else {
      await loadQuotes();
      setShowModal(false);
      alert(editing ? "Cotización actualizada" : "Cotización agregada");
    }
  };

  const deleteQuote = async (id) => {
    if (window.confirm("¿Eliminar cotización?")) {
      const { error } = await supabase.from("quotes").delete().eq("id", id);
      if (error) alert("Error: " + error.message);
      else { await loadQuotes(); alert("Eliminada"); }
    }
  };

  const exportCSV = () => {
    if (quotes.length === 0) return alert("No hay cotizaciones");
    const rows = quotes.map(q => {
      const cat = categories.find(c => c.id === q.category_id);
      return {
        Categoría: cat?.label || "",
        Concepto: q.concept,
        Proveedor: q.provider,
        Descripción: q.description,
        Cantidad: q.quantity,
        Medida: q.measure,
        "Costo Unitario": q.unitCost,
        Total: q.total,
        Calificación: q.rating,
        Comentario: q.comment,
      };
    });
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => JSON.stringify(r[h] || "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "cotizaciones.csv"; link.click();
  };

  // Vista comparativa: agrupar por concepto y mostrar proveedores
  const compareData = () => {
    const groups = new Map();
    quotes.forEach(q => {
      const key = q.concept;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(q);
    });
    return groups;
  };

  const renderStars = (rating) => {
    return Array(5).fill(0).map((_, i) => (
      <Star key={i} size={12} fill={i < rating ? "#FFD700" : "none"} stroke="#FFD700" />
    ));
  };

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div className="flex gap-2">
          <button onClick={() => setView("table")} className={`px-4 py-2 rounded-full text-sm ${view === "table" ? "bg-[#E0BBE4] text-white" : "bg-white/50"}`}>Tabla</button>
          <button onClick={() => setView("compare")} className={`px-4 py-2 rounded-full text-sm ${view === "compare" ? "bg-[#E0BBE4] text-white" : "bg-white/50"}`}>Comparativa</button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#E0BBE4]/30 border border-[#E0BBE4]/50"><Plus size={16}/> Agregar cotización</button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#E0BBE4]/20"><Download size={16}/> CSV</button>
        </div>
      </div>

      {view === "table" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#E0BBE4]/30 text-[#9b8ab4]">
              <th className="py-2 px-2">Categoría</th><th className="py-2 px-2">Concepto</th><th className="py-2 px-2">Proveedor</th><th className="py-2 px-2">Descripción</th><th className="py-2 px-2">Cantidad</th><th className="py-2 px-2">Medida</th><th className="py-2 px-2">Costo Unitario</th><th className="py-2 px-2">Total</th><th className="py-2 px-2">Calif.</th><th className="py-2 px-2">Comentario</th><th className="py-2 px-2">Acciones</th>
              </table></thead>
            <tbody>
              {quotes.map(q => {
                const cat = categories.find(c => c.id === q.category_id);
                return (
                  <tr key={q.id} className="border-b border-[#E0BBE4]/15 hover:bg-white/20">
                    <td className="py-2 px-2">{cat?.label}</td><td className="py-2 px-2">{q.concept}</td><td className="py-2 px-2">{q.provider}</td><td className="py-2 px-2">{q.description}<td><td className="py-2 px-2 text-right">{q.quantity}</td><td className="py-2 px-2">{q.measure}</td><td className="py-2 px-2 text-right">${q.unitCost.toLocaleString()}</td><td className="py-2 px-2 text-right font-medium">${q.total.toLocaleString()}</td><td className="py-2 px-2">{renderStars(q.rating)}</td>
                    <td className="py-2 px-2">{q.comment}</td>
                    <td className="py-2 px-2 whitespace-nowrap"><button onClick={()=>openModal(q)} className="mr-2"><Edit2 size={14}/></button><button onClick={()=>deleteQuote(q.id)}><Trash2 size={14}/></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {view === "compare" && (
        <div>
          {Array.from(compareData().entries()).map(([concept, items]) => (
            <div key={concept} className="mb-8">
              <h3 className="serif text-xl text-[#4a3a5c] mb-3">{concept}</h3>
              <div className="space-y-3">
                {items.sort((a,b) => a.total - b.total).map(item => {
                  const cat = categories.find(c => c.id === item.category_id);
                  return (
                    <div key={item.id} className="bg-white/50 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex-1 min-w-[150px]"><div className="font-semibold">{item.provider}</div><div className="text-xs text-[#aaa]">{cat?.label}</div></div>
                      <div className="text-sm">Total: <span className="font-bold">${item.total.toLocaleString()}</span></div>
                      <div className="flex items-center gap-1">{renderStars(item.rating)}</div>
                      <div className="text-xs text-[#777]">{item.measure} · {item.quantity} und.</div>
                      <button onClick={() => openModal(item)} className="text-[#7b4f8a]"><Edit2 size={14}/></button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white px-5 py-3 border-b flex justify-between">
              <h3 className="serif text-xl">{editing ? "Editar cotización" : "Nueva cotización"}</h3>
              <button onClick={() => setShowModal(false)}><X size={18}/></button>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold">Categoría *</label><select value={form.category_id} onChange={e=>setForm({...form, category_id:e.target.value})} className="w-full p-2 border rounded"><option value="">Selecciona</option>{categories.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
              <div><label className="block text-xs font-semibold">Concepto *</label><select value={form.concept} onChange={e=>setForm({...form, concept:e.target.value})} className="w-full p-2 border rounded"><option value="">Selecciona</option><option value="Otro">Otro</option>{/* Aquí podrías cargar tareas de la categoría seleccionada */}</select></div>
              {form.concept === "Otro" && <div><label>Concepto personalizado</label><input type="text" value={form.conceptCustom} onChange={e=>setForm({...form, conceptCustom:e.target.value})} className="w-full p-2 border rounded"/></div>}
              <div><label>Proveedor *</label><input type="text" value={form.provider} onChange={e=>setForm({...form, provider:e.target.value})} className="w-full p-2 border rounded"/></div>
              <div><label>Descripción</label><textarea value={form.description} onChange={e=>setForm({...form, description:e.target.value})} rows={2} className="w-full p-2 border rounded"/></div>
              <div><label>Cantidad</label><input type="number" value={form.quantity} onChange={e=>setForm({...form, quantity:+e.target.value})} className="w-full p-2 border rounded"/></div>
              <div><label>Medida</label><select value={form.measure} onChange={e=>setForm({...form, measure:e.target.value})} className="w-full p-2 border rounded"><option>Horas</option><option>Invitados</option><option>Piezas</option><option>Otro</option></select></div>
              <div><label>Costo Unitario</label><input type="number" value={form.unitCost} onChange={e=>setForm({...form, unitCost:+e.target.value})} className="w-full p-2 border rounded"/></div>
              <div><label>Total</label><input type="number" value={form.total} disabled className="w-full p-2 border rounded bg-gray-100"/></div>
              <div><label>Calificación (1-5)</label><input type="number" min="1" max="5" value={form.rating} onChange={e=>setForm({...form, rating:+e.target.value})} className="w-full p-2 border rounded"/></div>
              <div className="md:col-span-2"><label>Comentario</label><textarea value={form.comment} onChange={e=>setForm({...form, comment:e.target.value})} rows={2} className="w-full p-2 border rounded"/></div>
            </div>
            <div className="sticky bottom-0 bg-white px-5 py-3 border-t flex justify-end gap-2">
              <button onClick={()=>setShowModal(false)} className="px-4 py-2 rounded-full bg-gray-200">Cancelar</button>
              <button onClick={saveQuote} className="px-4 py-2 rounded-full bg-[#E0BBE4] text-white">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
