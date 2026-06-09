// src/components/FinancialBreakdown.jsx
import { Download } from "lucide-react";

export default function FinancialBreakdown({ categories }) {
  // Recopilar todas las tareas que tienen detalles
  const items = [];
  categories.forEach(cat => {
    cat.tasks.forEach(task => {
      if (task.details && task.details.length > 0) {
        task.details.forEach(detail => {
          items.push({
            categoria: cat.label,
            tarea: task.text,
            concepto: detail.concepto || "",
            caracteristica: detail.caracteristica || "",
            precioUnitario: detail.precioUnitario || 0,
            piezas: detail.piezas || 1,
            total: detail.total || 0,
            fecha: task.date || "",
            metodoPago: detail.metodoPago || "",
          });
        });
      }
    });
  });

  const exportToCSV = () => {
    const headers = ["Categoría", "Tarea", "Concepto", "Característica", "Precio Unitario", "Piezas", "Total", "Fecha", "Método de Pago"];
    const rows = items.map(item => [
      item.categoria,
      item.tarea,
      item.concepto,
      item.caracteristica,
      item.precioUnitario,
      item.piezas,
      item.total,
      item.fecha,
      item.metodoPago,
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "desglose_financiero.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h2 className="serif text-3xl text-[#4a3a5c] font-light">
          Desglose Financiero <span className="italic text-[#B2AC88]">✦</span>
        </h2>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#E0BBE4]/20 border border-[#E0BBE4]/50 text-[#7b4f8a] hover:bg-[#E0BBE4]/40 transition"
        >
          <Download size={16} /> Exportar CSV
        </button>
      </div>
      {items.length === 0 ? (
        <div className="text-center py-10 text-[#aaa]">
          No hay tareas con detalles financieros. Activa los detalles en el checklist.
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
                <th className="py-2 px-2 text-right">Total</th>
                <th className="py-2 px-2 text-left">Fecha</th>
                <th className="py-2 px-2 text-left">Método Pago</th>
               </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-[#E0BBE4]/15 hover:bg-white/20">
                  <td className="py-2 px-2">{item.categoria}</td>
                  <td className="py-2 px-2">{item.tarea}</td>
                  <td className="py-2 px-2">{item.concepto}</td>
                  <td className="py-2 px-2">{item.caracteristica}</td>
                  <td className="py-2 px-2 text-right">${item.precioUnitario.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right">{item.piezas}</td>
                  <td className="py-2 px-2 text-right font-medium">${item.total.toLocaleString()}</td>
                  <td className="py-2 px-2">{item.fecha}</td>
                  <td className="py-2 px-2">{item.metodoPago}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
