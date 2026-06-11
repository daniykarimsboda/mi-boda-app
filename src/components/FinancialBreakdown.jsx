import { useState, useEffect } from "react";
import { Download, Plus, X, Edit2, Trash2 } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function FinancialBreakdown({ categories, onPaymentAdded }) {
  const [payments, setPayments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTask, setSelectedTask] = useState("");
  const [tasksList, setTasksList] = useState([]);
  const [form, setForm] = useState({
    paymentDate: "",
    amount: "",
    type: "Parcial",
    partialText: "",
    paymentMethod: "",
    receiptUrl: "",
    comment: "",
  });

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

  const openNewPaymentModal = () => {
    setEditingPayment(null);
    setSelectedCategory("");
    setSelectedTask("");
    setForm({ paymentDate: "", amount: "", type: "Parcial", partialText: "", paymentMethod: "", receiptUrl: "", comment: "" });
    setShowModal(true);
  };

  const openEditPaymentModal = (payment) => {
    setEditingPayment(payment);
    const cat = categories.find(c => c.id === payment.category_id);
    if (cat) setSelectedCategory(cat.id);
    const task = cat?.tasks.find(t => t.id === payment.task_id);
    if (task) setSelectedTask(task.id);
    setForm({
      paymentDate: payment.payment_date,
      amount: payment.amount.toString(),
      type: payment.type,
      partialText: payment.partial_number || "",
      paymentMethod: payment.payment_method || "",
      receiptUrl: payment.receipt_url || "",
      comment: payment.comment || "",
    });
    setShowModal(true);
  };

  const handleSavePayment = async () => {
    if (!selectedCategory || !selectedTask) return alert("Selecciona categoría y tarea");
    if (!form.paymentDate || !form.amount) return alert("Fecha y monto obligatorios");
    const amountNum = parseFloat(form.amount);
    if (isNaN(amountNum) || amountNum <= 0) return alert("Monto inválido");

    let partialNumber = null;
    if (form.type === "Anticipo" || form.type === "Parcial") {
      if (editingPayment) {
        partialNumber = form.partialText || editingPayment.partial_number;
      } else {
        const existing = payments.filter(p => p.task_id === selectedTask && p.category_id === selectedCategory);
        const count = existing.length + 1;
        partialNumber = form.partialText && form.partialText.includes("de") ? form.partialText : `${count} de ?`;
      }
    } else partialNumber = "1 de 1";

    const paymentData = {
      task_id: selectedTask,
      category_id: selectedCategory,
      payment_date: form.paymentDate,
      amount: amountNum,
      type: form.type,
      partial_number: partialNumber,
      payment_method: form.paymentMethod || null,
      receipt_url: form.receiptUrl || null,
      comment: form.comment || null,
    };

    let error;
    if (editingPayment) {
      const { error: updateError } = await supabase.from("task_payments").update(paymentData).eq("id", editingPayment.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from("task_payments").insert(paymentData);
      error = insertError;
    }

    if (error) alert("Error: " + error.message);
    else {
      await loadPayments();
      if (onPaymentAdded) onPaymentAdded();
      setShowModal(false);
      setEditingPayment(null);
      alert(editingPayment ? "Pago actualizado" : "Pago registrado");
    }
  };

  const deletePayment = async (id) => {
    if (window.confirm("¿Eliminar este pago permanentemente?")) {
      const { error } = await supabase.from("task_payments").delete().eq("id", id);
      if (error) alert("Error: " + error.message);
      else {
        await loadPayments();
        if (onPaymentAdded) onPaymentAdded();
        alert("Pago eliminado");
      }
    }
  };

  const exportToCSV = () => {
    if (payments.length === 0) return alert("No hay pagos registrados");
    const rows = payments.map(p => {
      const cat = categories.find(c => c.id === p.category_id);
      const task = cat?.tasks.find(t => t.id === p.task_id);
      const d = task?.details?.[0];
      return {
        Categoría: cat?.label || "",
        Tarea: task?.text || "",
        Concepto: d?.concepto || "",
        Característica: d?.caracteristica || "",
        "P.Unitario": d?.precioUnitario || "",
        Cantidad: d?.cantidad || "",
        Total: d?.total || "",
        "Fecha pago": p.payment_date,
        Monto: p.amount,
        "Tipo pago": p.type,
        Parcialidad: p.partial_number || "",
        "Forma pago": p.payment_method || "",
        Comprobante: p.receipt_url || "",
        Comentario: p.comment || "",
      };
    });
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => JSON.stringify(r[h] || "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "pagos.csv";
    link.click();
  };

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h2 className="serif text-3xl text-[#4a3a5c] font-light">Pagos Registrados <span className="italic text-[#B2AC88]">✦</span></h2>
        <div className="flex gap-2">
          <button onClick={openNewPaymentModal} className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#E0BBE4]/30 border border-[#E0BBE4]/50 text-[#7b4f8a] hover:bg-[#E0BBE4]/50 transition"><Plus size={16}/> Agregar pago</button>
          <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#E0BBE4]/20 border border-[#E0BBE4]/50 text-[#7b4f8a] hover:bg-[#E0BBE4]/40 transition"><Download size={16}/> Exportar CSV</button>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-10 text-[#aaa]">No hay pagos registrados.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#E0BBE4]/30 text-[#9b8ab4] font-medium">
              <th className="py-2 px-2 text-left">Categoría</th><th className="py-2 px-2 text-left">Tarea</th><th className="py-2 px-2 text-left">Concepto</th><th className="py-2 px-2 text-left">Característica</th><th className="py-2 px-2 text-right">P.Unitario</th><th className="py-2 px-2 text-right">Cantidad</th><th className="py-2 px-2 text-right">Total ref.</th><th className="py-2 px-2 text-left">Fecha pago</th><th className="py-2 px-2 text-right">Monto</th><th className="py-2 px-2 text-left">Tipo</th><th className="py-2 px-2 text-left">Parcialidad</th><th className="py-2 px-2 text-left">Forma pago</th><th className="py-2 px-2 text-left">Comprobante</th><th className="py-2 px-2 text-left">Comentario</th><th className="py-2 px-2 text-center">Acciones</th>
            </tr></thead>
            <tbody>
              {payments.map(p => {
                const cat = categories.find(c => c.id === p.category_id);
                const task = cat?.tasks.find(t => t.id === p.task_id);
                const d = task?.details?.[0];
                return (
                  <tr key={p.id} className="border-b border-[#E0BBE4]/15 hover:bg-white/20">
                    <td className="py-2 px-2">{cat?.label}</td><td className="py-2 px-2">{task?.text}</td><td className="py-2 px-2">{d?.concepto}</td><td className="py-2 px-2">{d?.caracteristica}</td><td className="py-2 px-2 text-right">${(d?.precioUnitario||0).toLocaleString()}</td><td className="py-2 px-2 text-right">{d?.cantidad??""}</td><td className="py-2 px-2 text-right">${(d?.total||0).toLocaleString()}</td><td className="py-2 px-2">{p.payment_date}</td><td className="py-2 px-2 text-right font-medium">${p.amount.toLocaleString()}</td><td className="py-2 px-2">{p.type}</td><td className="py-2 px-2">{p.partial_number||""}</td><td className="py-2 px-2">{p.payment_method||""}</td><td className="py-2 px-2">{p.receipt_url?<a href={p.receipt_url} target="_blank" rel="noreferrer" className="text-[#B2AC88] underline">Ver</a>:""}<td><td className="py-2 px-2">{p.comment||""}</td>
                    <td className="py-2 px-2 text-center"><button onClick={()=>openEditPaymentModal(p)} className="text-gray-500 hover:text-[#7b4f8a] mr-2"><Edit2 size={14}/></button><button onClick={()=>deletePayment(p.id)} className="text-gray-500 hover:text-red-500"><Trash2 size={14}/></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal rediseñado: centrado absoluto, con scroll interno y campos compactos */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex justify-between items-center">
              <h3 className="serif text-xl text-[#4a3a5c]">{editingPayment ? "Editar pago" : "Registrar pago"}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="block text-xs font-semibold text-[#6b5c7e] uppercase tracking-wide mb-1">Categoría *</label><select value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg text-sm"><option value="">Selecciona...</option>{categories.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
              <div><label className="block text-xs font-semibold text-[#6b5c7e] uppercase tracking-wide mb-1">Actividad *</label><select value={selectedTask} onChange={e=>setSelectedTask(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg text-sm" disabled={!selectedCategory}><option value="">Selecciona...</option>{tasksList.map(t=><option key={t.id} value={t.id}>{t.text}</option>)}</select></div>
              <div><label className="block text-xs font-semibold text-[#6b5c7e] uppercase tracking-wide mb-1">Fecha de pago *</label><input type="date" value={form.paymentDate} onChange={e=>setForm({...form, paymentDate:e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-sm" /></div>
              <div><label className="block text-xs font-semibold text-[#6b5c7e] uppercase tracking-wide mb-1">Monto pagado *</label><input type="number" placeholder="0.00" value={form.amount} onChange={e=>setForm({...form, amount:e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-sm" /></div>
              <div><label className="block text-xs font-semibold text-[#6b5c7e] uppercase tracking-wide mb-1">Tipo de pago</label><select value={form.type} onChange={e=>setForm({...form, type:e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-sm"><option value="Anticipo">Anticipo</option><option value="Parcial">Parcial</option><option value="Total">Total</option></select></div>
              {(form.type === "Anticipo" || form.type === "Parcial") && <div><label className="block text-xs font-semibold text-[#6b5c7e] uppercase tracking-wide mb-1">Parcialidad (ej: 1 de 2)</label><input type="text" placeholder="1 de 2" value={form.partialText} onChange={e=>setForm({...form, partialText:e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-sm" /></div>}
              <div><label className="block text-xs font-semibold text-[#6b5c7e] uppercase tracking-wide mb-1">Forma de pago (opcional)</label><input type="text" placeholder="Efectivo, Transferencia..." value={form.paymentMethod} onChange={e=>setForm({...form, paymentMethod:e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-sm" /></div>
              <div><label className="block text-xs font-semibold text-[#6b5c7e] uppercase tracking-wide mb-1">Comprobante (URL)</label><input type="text" placeholder="https://..." value={form.receiptUrl} onChange={e=>setForm({...form, receiptUrl:e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-sm" /></div>
              <div><label className="block text-xs font-semibold text-[#6b5c7e] uppercase tracking-wide mb-1">Comentario</label><textarea placeholder="Notas..." value={form.comment} onChange={e=>setForm({...form, comment:e.target.value})} rows={2} className="w-full p-2 border border-gray-200 rounded-lg text-sm" /></div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-3 flex justify-end gap-2">
              <button onClick={()=>setShowModal(false)} className="px-4 py-2 rounded-full bg-gray-200 text-gray-700 text-sm hover:bg-gray-300">Cancelar</button>
              <button onClick={handleSavePayment} className="px-4 py-2 rounded-full bg-[#E0BBE4] text-white text-sm hover:bg-[#d0aad4]">{editingPayment ? "Actualizar" : "Guardar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
