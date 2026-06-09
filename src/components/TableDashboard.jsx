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
    <div className="p-4">
      <h3 className="text-xl font-bold mb-3">Distribución de Mesas</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tables.map(table => (
          <div
            key={table.letter}
            onClick={() => setSelectedTable(table.letter)}
            className="border rounded-lg p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition"
          >
            <div className="font-bold text-lg">Mesa {table.letter}</div>
            <div className="text-sm text-gray-600">
              Ocupación: {table.count}/{table.limit}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(table.count / table.limit) * 100}%` }}></div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal para lista de invitados al hacer clic */}
      {selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedTable(null)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h4 className="text-xl font-bold mb-2">Mesa {selectedTable}</h4>
            <ul className="list-disc pl-5">
              {tables.find(t => t.letter === selectedTable)?.guests.map(g => (
                <li key={g.id}>{g.nombre} {g.rsvp ? "✅" : "⏳"}</li>
              ))}
            </ul>
            <button className="mt-4 bg-gray-200 px-4 py-2 rounded" onClick={() => setSelectedTable(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
