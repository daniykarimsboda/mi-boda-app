import { useState, useEffect, useCallback } from "react";
import { Search, Phone, RefreshCw } from "lucide-react";
import { supabase } from "../supabaseClient";

const GuestManager = () => {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState("Todas");
  const [filterPriority, setFilterPriority] = useState("Todas");
  const [search, setSearch] = useState("");
  const [maxPerTable, setMaxPerTable] = useState(() => {
    const saved = localStorage.getItem("wedding_max_people_per_table");
    return saved ? parseInt(saved) : 10;
  });

  const loadGuests = useCallback(async () => {
    const { data, error } = await supabase.from("guests_sheets").select("*");
    if (error) console.error(error);
    else setGuests(data || []);
  }, []);

  const syncWithSheets = useCallback(async () => {
    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vS1kv3eReuvMR3buhp2TOC3EXOBZLyzomvhLF8GXw7BxcsHzKmtW43VGY5Uvm9AdQwlL7VxmWbO_DCF/pub?gid=65042535&single=true&output=csv",
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      const csvText = await res.text();
      const rows = csvText.split("\n").slice(1);
      const newGuests = rows
        .map(row => {
          const [Nombre, Telefono, Categoria, Prioridad, Invitado_de, Comentario] = row.split(",");
          if (!Nombre || !Telefono) return null;
          return {
            nombre: Nombre.trim(),
            telefono: Telefono.trim(),
            categoria: Categoria?.trim() || "",
            prioridad: Prioridad?.trim() || "",
            invitado_de: Invitado_de?.trim() || "",
            comentario: Comentario?.trim() || "",
          };
        })
        .filter(g => g !== null);

      for (const guest of newGuests) {
        const { error } = await supabase.from("guests_sheets").upsert(
          {
            telefono: guest.telefono,
            nombre: guest.nombre,
            categoria: guest.categoria,
            prioridad: guest.prioridad,
            invitado_de: guest.invitado_de,
            comentario: guest.comentario,
          },
          { onConflict: "telefono", ignoreDuplicates: false }
        );
        if (error) console.error(error);
      }
      await loadGuests();
      alert(`Sincronizados ${newGuests.length} invitados desde Google Sheets`);
    } catch (err) {
      console.error(err);
      alert("Error al cargar invitados desde Google Sheets");
    } finally {
      setLoading(false);
    }
  }, [loadGuests]);

  const assignTable = async (guestId, letter) => {
    const guestsInLetter = guests.filter(g => g.mesa?.startsWith(letter));
    const takenNumbers = guestsInLetter
      .map(g => parseInt(g.mesa.split("-")[1]))
      .filter(n => !isNaN(n))
      .sort((a, b) => a - b);
    let nextNumber = 1;
    for (let i = 0; i < takenNumbers.length; i++) {
      if (takenNumbers[i] === nextNumber) nextNumber++;
      else break;
    }
    if (nextNumber > maxPerTable) {
      alert(`Límite de ${maxPerTable} personas por mesa alcanzado para mesa ${letter}`);
      return;
    }
    const mesaValue = `${letter}-${nextNumber}`;
    const { error } = await supabase.from("guests_sheets").update({ mesa: mesaValue }).eq("id", guestId);
    if (error) console.error(error);
    else loadGuests();
  };

  useEffect(() => {
    loadGuests();
    const subscription = supabase
      .channel("guests-sheets-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "guests_sheets" }, () => loadGuests())
      .subscribe();
    return () => subscription.unsubscribe();
  }, [loadGuests]);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "wedding_max_people_per_table") {
        setMaxPerTable(parseInt(e.newValue) || 10);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const filteredGuests = guests.filter(g => {
    if (filterCategory !== "Todas" && g.categoria !== filterCategory) return false;
    if (filterPriority !== "Todas" && g.prioridad !== filterPriority) return false;
    if (search && !g.nombre?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Variable de entorno para RSVP (puedes cambiarla después)
  const rsvpUrl = import.meta.env.VITE_RSVP_URL || "https://tursvp.com/formulario";

  return (
    <div className="mt-6 border-t border-[#E0BBE4]/30 pt-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-[#4a3a5c]">📋 Invitados desde Google Sheets</h3>
        <button
          onClick={syncWithSheets}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#E0BBE4]/20 rounded-full text-sm text-[#7b4f8a] hover:bg-[#E0BBE4]/40 transition"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Sincronizando..." : "Sincronizar con Sheets"}
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-full text-sm bg-white/70"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-full text-sm bg-white/70"
        >
          <option>Todas</option>
          <option>Familia</option>
          <option>Amigos</option>
          <option>Trabajo</option>
          <option>Conocidos</option>
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-full text-sm bg-white/70"
        >
          <option>Todas</option>
          <option>Alta</option>
          <option>Media</option>
          <option>Baja</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#E0BBE4]/10">
            <tr>
              <th className="p-2 text-left">Nombre</th>
              <th className="p-2 text-left">Teléfono</th>
              <th className="p-2 text-left">Categoría</th>
              <th className="p-2 text-left">Prioridad</th>
              <th className="p-2 text-left">Invitado de</th>
              <th className="p-2 text-left">Mesa</th>
              <th className="p-2 text-left">WhatsApp</th>
            </tr>
          </thead>
          <tbody>
            {filteredGuests.map((g) => (
              <tr key={g.id} className="border-t border-gray-100">
                <td className="p-2">{g.nombre}</td>
                <td className="p-2">{g.telefono}</td>
                <td className="p-2">{g.categoria}</td>
                <td className="p-2">{g.prioridad}</td>
                <td className="p-2">{g.invitado_de}</td>
                <td className="p-2">
                  <select
                    value={g.mesa ? g.mesa.split("-")[0] : ""}
                    onChange={(e) => assignTable(g.id, e.target.value)}
                    className="border rounded px-1 py-0.5 text-xs"
                  >
                    <option value="">Sin mesa</option>
                    {[...Array(26)].map((_, i) => {
                      const letter = String.fromCharCode(65 + i);
                      return <option key={letter} value={letter}>{`Mesa ${letter}`}</option>;
                    })}
                  </select>
                  {g.mesa && <span className="ml-1 text-xs text-gray-500">({g.mesa})</span>}
                </td>
                <td className="p-2">
                  <a
                    href={`https://wa.me/${g.telefono}?text=Hola%20${encodeURIComponent(g.nombre)}%2C%20confirma%20tu%20asistencia%20en%20${rsvpUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-green-600 hover:text-green-800"
                  >
                    <Phone size={16} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredGuests.length === 0 && !loading && (
          <div className="text-center py-6 text-gray-400">
            No hay invitados. Haz clic en "Sincronizar con Sheets".
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestManager;
