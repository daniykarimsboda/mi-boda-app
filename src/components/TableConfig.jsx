// src/components/TableConfig.jsx
import { useState, useEffect } from "react";

export default function TableConfig() {
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    const saved = localStorage.getItem("wedding_max_people_per_table");
    if (saved) setLimit(parseInt(saved));
  }, []);

  const saveLimit = () => {
    localStorage.setItem("wedding_max_people_per_table", limit);
    alert("Límite guardado. Se aplicará en nuevas asignaciones.");
  };

  return (
    <div className="glass rounded-2xl p-5 flex flex-wrap items-end gap-4">
      <div>
        <label className="block text-sm font-medium text-[#4a3a5c] mb-1">
          Límite de personas por mesa
        </label>
        <input
          type="number"
          min="1"
          value={limit}
          onChange={e => setLimit(parseInt(e.target.value) || 1)}
          className="px-3 py-2 rounded-xl bg-white/50 border border-[#E0BBE4]/30 text-[#4a3a5c] focus:outline-none focus:ring-1 focus:ring-[#E0BBE4] w-28"
        />
      </div>
      <button
        onClick={saveLimit}
        className="px-5 py-2 rounded-full bg-[#E0BBE4]/20 border border-[#E0BBE4]/50 text-[#7b4f8a] hover:bg-[#E0BBE4]/40 transition-all text-sm font-medium"
      >
        Guardar límite
      </button>
    </div>
  );
}
