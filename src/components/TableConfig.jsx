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
    alert("Límite guardado. Recarga la página para aplicar cambios.");
  };

  return (
    <div className="p-4 border rounded bg-white">
      <label className="block font-medium">Límite de personas por mesa:</label>
      <input
        type="number"
        min="1"
        value={limit}
        onChange={e => setLimit(parseInt(e.target.value) || 1)}
        className="border p-2 rounded w-24 mt-1"
      />
      <button onClick={saveLimit} className="ml-2 bg-blue-500 text-white px-3 py-1 rounded">Guardar</button>
    </div>
  );
}
