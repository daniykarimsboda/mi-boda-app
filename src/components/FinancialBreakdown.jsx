import { useState, useEffect } from "react";
import { Download, Plus } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function FinancialBreakdown({ categories, onPaymentAdded }) {
  const [payments, setPayments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTask, setSelectedTask] = useState("");
  const [tasksList, setTasksList] = useState([]);
  const [form, setForm] = useState({ paymentDate: "", amount: "", type: "Parcial", partialText: "", paymentMethod: "", receiptUrl: "", comment: "" });

  const loadPayments = async () => {
    const { data } = await supabase.from("task_payments").select("*").order("payment_date", { ascending: false });
    if (data) setPayments(data);
  };
  useEffect(() => { loadPayments(); }, []);
  useEffect(() => {
    if (selectedCategory) {
      const cat = categories.find(c => c.id === selectedCategory);
      setTasksList(cat?.tasks || []);
    }
  }, [selectedCategory, categories]);
  useEffect(() => {
    if (form.type === "Total") setForm(prev => ({ ...prev, partialText: "1 de 1" }));
    else if (form.type === "Anticipo" || form.type === "Parcial") setForm(prev => ({ ...prev, partialText: "" }));
  }, [form.type]);

  const handleAddPayment = async () => {
    if (!selectedCategory || !selectedTask) return alert("Selecciona categoría y tarea");
    if (!form.paymentDate || !form.amount) return alert("Fecha y monto obligatorios");
    const amountNum = parseFloat(form.amount);
    if (isNaN(amountNum) || amountNum <= 0) return alert("Monto inválido");
    let partialNumber = null;
    if (form.type === "Anticipo" || form.type === "Parcial") {
      const existing = payments.filter(p => p.task_id === selectedTask && p.category_id === selectedCategory);
      const count = existing.length + 1;
      partialNumber = form.partialText && form.partialText.includes("de") ? form.partialText : `${count} de ?`;
    } else partialNumber = "1 de 1";
    const { error } = await supabase.from("task_payments").insert({
      task_id: selectedTask, category_id: selectedCategory, payment_date: form.paymentDate, amount: amountNum, type: form.type,
      partial_number: partialNumber, payment_method: form.paymentMethod || null, receipt_url: form.receiptUrl || null, comment: form.comment || null,
    });
    if (error) alert("Error: " + error.message);
    else {
      await loadPayments();
      if (onPaymentAdded) onPaymentAdded();
      setShowModal(false);
      setSelectedCategory(""); setSelectedTask(""); setForm({ paymentDate: "", amount: "", type: "Parcial", partialText: "", paymentMethod: "", receiptUrl: "", comment: "" });
      alert("Pago registrado");
    }
  };

  const exportToCSV = () => {
    if (payments.length === 0) return alert("No hay pagos");
    const rows = payments.map(p => {
      const cat = categories.find(c => c.id === p.category_id);
      const task = cat?.tasks.find(t => t.id === p.task_id);
      const d = task?.details?.[0];
      return { Categoría: cat?.label || "", Tarea: task?.text || "", Concepto: d?.concepto || "", Característica: d?.caracteristica || "", "P.Unitario": d?.precioUnitario || "", Cantidad: d?.cantidad || "", Total: d?.total || "", "Fecha pago": p.payment_date, Monto: p.amount, "Tipo pago": p.type, Parcialidad: p.partial_number || "", "Forma pago": p.payment_method || "", Comprobante: p.receipt_url || "", Comentario: p.comment || "" };
    });
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => JSON.stringify(r[h] || "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "pagos.csv"; link.click();
  };

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="serif text-3xl text-[#4a3a5c] font-light">Pagos Registrados ✦</h2>
        <div className="flex gap-2"><button onClick={()=>setShowModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#E0BBE4]/30"><Plus size={16}/> Agregar pago</button><button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#E0BBE4]/20"><Download size={16}/> CSV</button></div>
      </div>
      {payments.length === 0 ? <div className="text-center py-10 text-[#aaa]">No hay pagos registrados.</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#E0BBE4]/30">{["Categoría","Tarea","Concepto","Característica","P.Unitario","Cantidad","Total ref.","Fecha pago","Monto","Tipo","Parcialidad","Forma pago","Comprobante","Comentario"].map(h=><th key={h} className="py-2 px-2 text-left">{h}</th>)}</tr></thead>
            <tbody>{payments.map(p=>{const cat=categories.find(c=>c.id===p.category_id); const task=cat?.tasks.find(t=>t.id===p.task_id); const d=task?.details?.[0]; return <tr key={p.id} className="border-b"><td className="py-1 px-2">{cat?.label}</td><td>{task?.text}</td><td>{d?.concepto}</td><td>{d?.caracteristica}</td><td className="text-right">${(d?.precioUnitario||0).toLocaleString()}</td><td className="text-right">{d?.cantidad}</td><td className="text-right">${(d?.total||0).toLocaleString()}</td><td>{p.payment_date}</td><td className="text-right font-medium">${p.amount.toLocaleString()}</td><td>{p.type}</td><td>{p.partial_number}</td><td>{p.payment_method}</td><td>{p.receipt_url?<a href={p.receipt_url} target="_blank" rel="noreferrer">Ver</a>:""}</td><td>{p.comment}</td></tr>})}</tbody>
          </table>
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={()=>setShowModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <h3 className="serif text-2xl mb-4">Registrar pago</h3>
            <div className="space-y-3">
              <select value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)} className="w-full p-2 border rounded"><option value="">Categoría</option>{categories.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select>
              <select value={selectedTask} onChange={e=>setSelectedTask(e.target.value)} className="w-full p-2 border rounded" disabled={!selectedCategory}><option value="">Tarea</option>{tasksList.map(t=><option key={t.id} value={t.id}>{t.text}</option>)}</select>
              <input type="date" placeholder="Fecha pago" value={form.paymentDate} onChange={e=>setForm({...form, paymentDate:e.target.value})} className="w-full p-2 border rounded"/>
              <input type="number" placeholder="Monto pagado" value={form.amount} onChange={e=>setForm({...form, amount:e.target.value})} className="w-full p-2 border rounded"/>
              <select value={form.type} onChange={e=>setForm({...form, type:e.target.value})} className="w-full p-2 border rounded"><option value="Anticipo">Anticipo</option><option value="Parcial">Parcial</option><option value="Total">Total</option></select>
              {(form.type === "Anticipo" || form.type === "Parcial") && <input type="text" placeholder="Ej: 1 de 2" value={form.partialText} onChange={e=>setForm({...form, partialText:e.target.value})} className="w-full p-2 border rounded"/>}
              <input type="text" placeholder="Forma de pago (opcional)" value={form.paymentMethod} onChange={e=>setForm({...form, paymentMethod:e.target.value})} className="w-full p-2 border rounded"/>
              <input type="text" placeholder="Comprobante URL (opcional)" value={form.receiptUrl} onChange={e=>setForm({...form, receiptUrl:e.target.value})} className="w-full p-2 border rounded"/>
              <textarea placeholder="Comentario (opcional)" value={form.comment} onChange={e=>setForm({...form, comment:e.target.value})} rows={2} className="w-full p-2 border rounded"></textarea>
            </div>
            <div className="flex justify-end gap-3 mt-6"><button onClick={()=>setShowModal(false)} className="px-4 py-2 rounded-full bg-gray-200">Cancelar</button><button onClick={handleAddPayment} className="px-4 py-2 rounded-full bg-[#E0BBE4] text-white">Guardar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
