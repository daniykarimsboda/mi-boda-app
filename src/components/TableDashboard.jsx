import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const TableDashboard = () => {
  const [guests, setGuests] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [maxPerTable, setMaxPerTable] = useState(() => {
    const saved = localStorage.getItem("wedding_max_people_per_table");
    return saved ? parseInt(saved) : 10;
  });

  const loadGuests = async () => {
    const { data } = await supabase.from("guests_sheets").select("*");
    if (data) setGuests(data);
  };

  useEffect(() => {
    loadGuests();
    const subscription = supabase
      .channel("dashboard-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "guests_sheets" }, () => loadGuests())
      .subscribe();
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "wedding_max_people_per_table") {
        setMaxPerTable(parseInt(e.newValue) || 10);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Agrupar por letra de mesa
  const tablesMap = new Map();
  guests.forEach(g => {
    if (g.mesa) {
      const letter = g.mesa.split("-")[0];
      if (!tablesMap.has(letter)) tablesMap.set(letter, []);
      tablesMap.get(letter).push(g);
    }
  });

  const handleTableClick = (letter, guestsList) => {
    setSelectedTable({ letter, guests: guestsList });
  };

  if (tablesMap.size === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No hay mesas asignadas. Ve a la pestaña "Invitados" y asigna mesas desde Google Sheets.
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from(tablesMap.entries()).map(([letter, guestsList]) => (
          <div
            key={letter}
            onClick={() => handleTableClick(letter, guestsList)}
            className="bg-white/70 backdrop-blur-sm border border-[#E0BBE4]/30 rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition"
          >
            <div className="text-lg font-semibold text-[#4a3a5c]">Mesa {letter}</div>
            <div className="text-sm text-gray-500 mt-1">
              {guestsList.length} / {maxPerTable}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-[#E0BBE4] h-2 rounded-full"
                style={{ width: `${(guestsList.length / maxPerTable) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      {selectedTable && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelectedTable(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-[#4a3a5c] mb-3">Mesa {selectedTable.letter}</h3>
            <ul className="space-y-2 max-h-60 overflow-auto">
              {selectedTable.guests.map((g) => (
                <li key={g.id} className="border-b border-gray-100 pb-1">
                  {g.nombre} {g.telefono && <span className="text-xs text-gray-400">({g.telefono})</span>}
                </li>
              ))}
            </ul>
            <button
              onClick={() => setSelectedTable(null)}
              className="mt-4 w-full py-2 bg-[#E0BBE4]/30 rounded-lg text-[#7b4f8a] hover:bg-[#E0BBE4]/50 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableDashboard;
