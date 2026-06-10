// src/components/FinancialBreakdown.jsx
import { useState, useEffect } from "react";
import { Download, Plus } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function FinancialBreakdown({ categories, onPaymentAdded }) {
  const [payments, setPayments] = useState([]);
  const [showModal, setShowModal] = useState(false);
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

  // Cargar pagos existentes
  const loadPayments = async () => {
    const { data } = await supabase.from("task_payments").select("*");
    if (data) setPayments(data);
  };

  useEffect(() => {
    loadPayments();
  }, []);

  // Cuando se selecciona una categoría, cargar sus tareas
  useEffect(() => {
    if (selectedCategory) {
      const cat = categories.find(c => c.id === selectedCategory);
      if (cat) {
        setTasksList(cat.tasks);
      } else {
        setTasksList([]);
      }
    }
  }, [selectedCategory, categories]);

  // Manejar cambios en tipo de pago
  useEffect(() => {
    if (form.type === "Total") {
      setForm(prev => ({ ...prev, partialText: "1 de 1" }));
    } else if (form.type === "Anticipo" || form.type === "Parcial") {
      setForm(prev => ({ ...prev, partialText: "" }));
    }
  }, [form.type]);

  const handleAddPayment = async () => {
    if (!selectedCategory || !selectedTask) {
      alert("Selecciona una categoría y una tarea");
      return;
    }
    if (!form.paymentDate || !form.amount) {
      alert("Fecha de pago y monto son obligatorios");
      return;
    }

    const task = tasksList.find(t => t.id === selectedTask);
    if (!task) return;

    // Calcular el siguiente número de parcialidad si es Parcial o Anticipo
    let partialNumber = null;
    if (form.type === "Anticipo" || form.type === "Parcial") {
      // Obtener pagos existentes de esta tarea para saber cuántos van
      const existingPayments = payments.filter(p => p.task_id === selectedTask && p.category_id === selectedCategory);
      const count = existingPayments.length + 1;
      // Asumimos que el total de parcialidades lo indica el usuario en partialText
      // Por ejemplo, si escribió "1 de 2", guardamos "1 de 2". Si no, generamos automático
      if (form.partialText && form.partialText.includes("de")) {
        partialNumber = form.partialText;
      } else {
        partialNumber = `${count} de ?`; // Placeholder
      }
    } else if (form.type === "Total") {
      partialNumber = "1 de 1";
    }

    const { error } = await supabase.from("task_payments").insert({
      task_id: selectedTask,
      category_id: selectedCategory,
      payment_date: form.paymentDate,
      amount: parseFloat(form.amount),
      type: form.type,
      partial_number: partialNumber,
      payment_method: form.paymentMethod,
      receipt_url: form.receiptUrl,
      comment: form.comment,
    });

    if (error) {
      console.error(error);
      alert("Error al guardar el pago");
    } else {
      await loadPayments();
      if (onPaymentAdded) onPaymentAdded();
      setShowModal(false);
      resetForm();
      alert("Pago registrado correctamente");
    }
  };

  const resetForm = () => {
    setSelectedCategory("");
    setSelectedTask("");
    setForm({
      paymentDate: "",
      amount: "",
      type: "Parcial",
      partialText: "",
      paymentMethod: "",
      receiptUrl: "",
      comment: "",
    });
  };

  // Función para construir el CSV con un renglón por pago
  const exportToCSV = () => {
    // Para cada pago, buscar la información de la tarea y categoría
    const rows = [];
    for (const p of payments) {
      const cat = categories.find(c => c.id === p.category_id);
      const task = cat?.tasks.find(t => t.id === p.task_id);
      const detalles = task?.details && task.details.length > 0 ? task.details[0] : null;
      rows.push({
        Categoría: cat?.label || "",
        Tarea: task?.text || "",
        Concepto: detalles?.concepto || "",
        Característica: detalles?.caracteristica || "",
        "P. Unitario": detalles?.precioUnitario || "",
        Piezas: detalles?.piezas || "",
        Total: detalles?.total || "",
        "Fecha pago": p.payment_date,
        "Monto pagado": p.amount,
        "Tipo pago": p.type,
        Parcialidad: p.partial_number || "",
        "Forma pago": p.payment_method,
        Comprobante: p.receipt_url,
        Comentario: p.comment,
      });
    }
    if (rows.length === 0) {
      alert("No hay pagos registrados para exportar");
      return;
    }
    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(","),
      ...rows.map(row => headers.map(h => JSON.stringify(row[h] || "")).join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "pagos_detallados.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Calcular totales por categoría (actualizará el Gasto Real)
  // Este efecto actualizará los budgetReal en el padre (App.jsx) mediante onPaymentAdded
  // En App.jsx, al recibir onPaymentAdded, llamas a upd para recalcular budgetReal

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h2 className="serif text-3xl text-[#4a3a5c] font-light">
          Pagos Registrados <span className="italic text-[#B2AC88]">✦</span>
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#E0BBE4]/30 border border-[#E0BBE4]/50 text-[#7b4f8a] hover:bg-[#E0BBE4]/50 transition"
          >
            <Plus size={16} /> Agregar pago
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#E0BBE4]/20 border border-[#E0BBE4]/50 text-[#7b4f8a] hover:bg-[#E0BBE4]/40 transition"
          >
            <Download size={16} /> Exportar CSV
          </button>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-10 text-[#aaa]">
          No hay pagos registrados. Usa "Agregar pago" para registrar ingresos/gastos.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E0BBE4]/30 text-[#9b8ab4] font-medium">
                <th className="py-2 px-2 text-left">Categoría</th>
                <th className="py-2 px-2 text-left">Tarea</th>
                <th className="py-2 px-2 text-left">Concepto</th>
                <th className="py-2 px-2 text-left">Característica</th>
                <th className="py-2 px-2 text-right">P. Unitario</th>
                <th className="py-2 px-2 text-right">Piezas</th>
                <th className="py-2 px-2 text-right">Total ref.</th>
                <th className="py-2 px-2 text-left">Fecha pago</th>
                <th className="py-2 px-2 text-right">Monto</th>
                <th className="py-2 px-2 text-left">Tipo</th>
                <th className="py-2 px-2 text-left">Parcialidad</th>
                <th className="py-2 px-2 text-left">Forma pago</th>
                <th className="py-2 px-2 text-left">Comprobante</th>
                <th className="py-2 px-2 text-left">Comentario</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p, idx) => {
                const cat = categories.find(c => c.id === p.category_id);
                const task = cat?.tasks.find(t => t.id === p.task_id);
                const detalles = task?.details?.[0];
                return (
                  <tr key={p.id} className="border-b border-[#E0BBE4]/15 hover:bg-white/20">
                    <td className="py-2 px-2">{cat?.label || p.category_id}</td>
                    <td className="py-2 px-2">{task?.text || p.task_id}</td>
                    <td className="py-2 px-2">{detalles?.concepto || ""}</td>
                    <td className="py-2 px-2">{detalles?.caracteristica || ""}</td>
                    <td className="py-2 px-2 text-right">${(detalles?.precioUnitario || 0).toLocaleString()}</td>
                    <td className="py-2 px-2 text-right">{detalles?.piezas || ""}</td>
                    <td className="py-2 px-2 text-right">${(detalles?.total || 0).toLocaleString()}</td>
                    <td className="py-2 px-2">{p.payment_date}</td>
                    <td className="py-2 px-2 text-right font-medium">${p.amount.toLocaleString()}</td>
                    <td className="py-2 px-2">{p.type}</td>
                    <td className="py-2 px-2">{p.partial_number || ""}</td>
                    <td className="py-2 px-2">{p.payment_method || ""}</td>
                    <td className="py-2 px-2">
                      {p.receipt_url ? (
                        <a href={p.receipt_url} target="_blank" rel="noreferrer" className="text-[#B2AC88] underline">Ver</a>
                      ) : ""}
                    </td>
                    <td className="py-2 px-2">{p.comment || ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para agregar pago */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="serif text-2xl text-[#4a3a5c] mb-4">Registrar nuevo pago</h3>
            <div className="space-y-3">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full p-2 rounded-lg border border-gray-200"
              >
                <option value="">Selecciona categoría</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <select
                value={selectedTask}
                onChange={e => setSelectedTask(e.target.value)}
                className="w-full p-2 rounded-lg border border-gray-200"
                disabled={!selectedCategory}
              >
                <option value="">Selecciona actividad</option>
                {tasksList.map(t => <option key={t.id} value={t.id}>{t.text}</option>)}
              </select>
              <input type="date" placeholder="Fecha de pago" value={form.paymentDate} onChange={e => setForm({...form, paymentDate: e.target.value})} className="w-full p-2 rounded-lg border border-gray-200" />
              <input type="number" placeholder="Monto pagado" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full p-2 rounded-lg border border-gray-200" />
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full p-2 rounded-lg border border-gray-200">
                <option value="Anticipo">Anticipo</option><option value="Parcial">Parcial</option><option value="Total">Total</option>
              </select>
              {(form.type === "Anticipo" || form.type === "Parcial") && (
                <input type="text" placeholder="Ej: 1 de 2, 2 de 6" value={form.partialText} onChange={e => setForm({...form, partialText: e.target.value})} className="w-full p-2 rounded-lg border border-gray-200" />
              )}
              <input type="text" placeholder="Forma de pago" value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})} className="w-full p-2 rounded-lg border border-gray-200" />
              <input type="text" placeholder="Enlace de comprobante" value={form.receiptUrl} onChange={e => setForm({...form, receiptUrl: e.target.value})} className="w-full p-2 rounded-lg border border-gray-200" />
              <textarea placeholder="Comentario" value={form.comment} onChange={e => setForm({...form, comment: e.target.value})} className="w-full p-2 rounded-lg border border-gray-200" rows="2" />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-full bg-gray-200 text-gray-700">Cancelar</button>
              <button onClick={handleAddPayment} className="px-4 py-2 rounded-full bg-[#E0BBE4] text-white">Guardar pago</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
