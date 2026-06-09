// src/components/TableDashboard.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function TableDashboard() {
  const [guests, setGuests] = useState([]);
  const [maxPerTable, setMaxPerTable] = useState(10);
  const [selectedTable, setSelectedTable] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("wedding_max_people_per_table");
    if (saved) setMaxPerTable(parseInt(saved));
    fetchGuests();
    const subscription = supabase
      .channel("guests_dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "guests" }, () => fetchGuests())
      .subscribe();
    return () => subscription.unsubscribe();
  }, []);

  const fetchGuests = async () => {
    const { data } = await supabase.from("guests").select("*");
    if (data) setGuests(data);
  };

  // Agrupar por letra de mesa
  const tablesMap = new Map();
  guests.forEach(guest => {
    if (guest.mesa) {
      const letter = guest.mesa.split("-")[0];
      if (!tablesMap.has(letter)) tablesMap.set(letter, []);
      tablesMap.get(letter).push(guest);
    }
  });

  const tables = Array.from(tablesMap.entries()).map(([letter, guestsList]) => ({
    letter,
    count: guestsList.length,
    guests: guestsList,
    limit: maxPerTable,
  }));

  return (
    <div className="space-y-4">
      <h3 className="serif text-2xl text-[#4a3a5c] font-light">Distribución de Mesas</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tables.map(table => (
          <div
            key={table.letter}
            onClick={() => setSelectedTable(table.letter)}
            className="glass rounded-xl p-4 cursor-pointer hover:bg-white/40 transition-all"
          >
            <div className="serif text-xl font-medium text-[#4a3a5c]">Mesa {table.letter}</div>
            <div className="text-sm text-[#6b5c7e] mt-1">
              Ocupación: {table.count}/{table.limit}
            </div>
            <div className="w-full bg-[#E0BBE4]/30 rounded-full h-2 mt-2">
              <div
                className="bg-[#B2AC88] h-2 rounded-full"
                style={{ width: `${(table.count / table.limit) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      {tables.length === 0 && (
        <div className="text-center py-8 text-[#aaa]">No hay mesas asignadas aún.</div>
      )}

      {/* Modal estilo glass */}
      {selectedTable && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setSelectedTable(null)}
        >
          <div
            className="glass rounded-2xl p-6 max-w-md w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <h4 className="serif text-2xl text-[#4a3a5c] mb-3">Mesa {selectedTable}</h4>
            <ul className="space-y-2 max-h-64 overflow-auto">
              {tables.find(t => t.letter === selectedTable)?.guests.map(g => (
                <li key={g.id} className="flex justify-between items-center border-b border-[#E0BBE4]/20 py-1">
                  <span className="text-[#4a3a5c]">{g.nombre}</span>
                  <span className="text-xs text-[#B2AC88]">{g.rsvp ? "✅ Confirmado" : "⏳ Pendiente"}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setSelectedTable(null)}
              className="mt-4 w-full py-2 rounded-full bg-[#E0BBE4]/20 border border-[#E0BBE4]/50 text-[#7b4f8a] hover:bg-[#E0BBE4]/40 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
