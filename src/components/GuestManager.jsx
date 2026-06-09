// src/components/GuestManager.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS1kv3eReuvMR3buhp2TOC3EXOBZLyzomvhLF8GXw7BxcsHzKmtW43VGY5Uvm9AdQwlL7VxmWbO_DCF/pub?gid=65042535&single=true&output=csv";

// Parseador CSV más robusto (maneja comillas, saltos de línea, etc.)
const parseCSV = (text) => {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") continue;
    const values = [];
    let inQuote = false;
    let current = "";
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        values.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    values.push(current.trim());
    const obj = {};
    headers.forEach((h, idx) => {
      let val = values[idx] || "";
      val = val.replace(/^"|"$/g, "");
      obj[h] = val;
    });
    result.push(obj);
  }
  return result;
};

// Convertir prioridad numérica a texto (opcional)
const parsePrioridad = (val) => {
  const num = parseInt(val);
  if (num === 1) return "Alta";
  if (num === 2) return "Media";
  if (num === 3) return "Baja";
  if (["Alta","Media","Baja"].includes(val)) return val;
  return "Media";
};

export default function GuestManager() {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ categoria: "", prioridad: "", nombre: "" });
  const [maxPerTable, setMaxPerTable] = useState(10);

  useEffect(() => {
    const saved = localStorage.getItem("wedding_max_people_per_table");
    if (saved) setMaxPerTable(parseInt(saved));
  }, []);

  // Obtener siguiente número de mesa (con límite)
  const getNextTableNumber = (letter, currentGuests) => {
    const prefix = `${letter}-`;
    const existing = currentGuests
      .filter(g => g.mesa && g.mesa.startsWith(prefix))
      .map(g => parseInt(g.mesa.split("-")[1]))
      .filter(n => !isNaN(n));
    for (let i = 1; i <= maxPerTable; i++) {
      if (!existing.includes(i)) return i;
    }
    return null;
  };

  // Cargar invitados desde Supabase
  const loadGuests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("guests").select("*").order("nombre");
      if (error) throw error;
      setGuests(data || []);
    } catch (err) {
      console.error(err);
      setError("Error al cargar invitados desde Supabase: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Sincronizar con Google Sheets
  const syncWithSheets = async () => {
    setSyncing(true);
    setError(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(CSV_URL, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      const rows = parseCSV(text);
      if (rows.length === 0) throw new Error("El CSV está vacío o no se pudo parsear");

      // Obtener datos existentes para no sobrescribir rsvp/alergias/mesa
      const { data: existing } = await supabase.from("guests").select("telefono, rsvp, alergias, mesa");
      const existingMap = new Map(existing?.map(e => [e.telefono, e]) || []);

      const upsertData = rows.map(row => ({
        telefono: row.Telefono?.trim() || "",
        nombre: row.Nombre?.trim() || "",
        categoria: row.Categoria?.trim() || "",
        prioridad: parsePrioridad(row.Prioridad?.trim() || "Media"),
        invitado_de: row["Invitado de"]?.trim() || "",
        comentario: row.Comentario?.trim() || "",
        rsvp: existingMap.get(row.Telefono)?.rsvp ?? false,
        alergias: existingMap.get(row.Telefono)?.alergias ?? "",
        mesa: existingMap.get(row.Telefono)?.mesa ?? null,
      })).filter(g => g.telefono);

      if (upsertData.length === 0) throw new Error("No se encontraron teléfonos válidos en el CSV");

      const { error: upsertError } = await supabase
        .from("guests")
        .upsert(upsertData, { onConflict: "telefono" });

      if (upsertError) throw upsertError;

      await loadGuests();
      alert("Sincronización completada correctamente.");
    } catch (err) {
      console.error(err);
      setError("Error al sincronizar: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  // Asignar mesa manualmente
  const assignTable = async (guestId, newLetter) => {
    if (!newLetter) return;
    const { data: allGuests } = await supabase.from("guests").select("*");
    const guest = allGuests.find(g => g.id === guestId);
    if (!guest) return;
    const currentLetter = guest.mesa?.split("-")[0];
    if (currentLetter === newLetter) return;
    const nextNum = getNextTableNumber(newLetter, allGuests);
    if (nextNum === null) {
      alert(`La mesa ${newLetter} ya está llena (límite ${maxPerTable} personas).`);
      return;
    }
    const newMesa = `${newLetter}-${nextNum}`;
    const { error } = await supabase.from("guests").update({ mesa: newMesa }).eq("id", guestId);
    if (error) console.error(error);
    else await loadGuests();
  };

  useEffect(() => {
    loadGuests();
    const subscription = supabase
      .channel("guests_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "guests" }, () => loadGuests())
      .subscribe();
    return () => subscription.unsubscribe();
  }, []);

  // Filtros
  const filteredGuests = guests.filter(g => {
    if (filters.categoria && g.categoria !== filters.categoria) return false;
    if (filters.prioridad && g.prioridad !== filters.prioridad) return false;
    if (filters.nombre && !g.nombre.toLowerCase().includes(filters.nombre.toLowerCase())) return false;
    return true;
  });

  if (loading && !syncing) {
    return <div className="p-4 text-center">Cargando invitados...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 className="text-2xl font-bold">Lista de Invitados</h2>
        <button
          onClick={syncWithSheets}
          disabled={syncing}
          className="bg-[#E0BBE4] hover:bg-[#d0aad4] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
        >
          {syncing ? "🔄 Sincronizando..." : "🔄 Sincronizar con Google Sheets"}
        </button>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 border border-red-300">{error}</div>}

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={filters.nombre}
          onChange={e => setFilters({ ...filters, nombre: e.target.value })}
          className="border p-2 rounded w-64"
        />
        <select value={filters.categoria} onChange={e => setFilters({ ...filters, categoria: e.target.value })} className="border p-2 rounded">
          <option value="">Todas las categorías</option>
          <option>Familia</option><option>Amigos</option><option>Trabajo</option><option>Conocidos</option>
        </select>
        <select value={filters.prioridad} onChange={e => setFilters({ ...filters, prioridad: e.target.value })} className="border p-2 rounded">
          <option value="">Todas las prioridades</option>
          <option>Alta</option><option>Media</option><option>Baja</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Nombre</th><th className="p-2 border">Teléfono</th><th className="p-2 border">Categoría</th>
              <th className="p-2 border">Prioridad</th><th className="p-2 border">Invitado de</th><th className="p-2 border">Comentario</th>
              <th className="p-2 border">Mesa</th><th className="p-2 border">RSVP</th><th className="p-2 border">Alergias</th><th className="p-2 border">WhatsApp</th>
            </tr>
          </thead>
          <tbody>
            {filteredGuests.map(guest => (
              <tr key={guest.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{guest.nombre}</td>
                <td className="p-2">{guest.telefono}</td>
                <td className="p-2">{guest.categoria}</td>
                <td className="p-2">{guest.prioridad}</td>
                <td className="p-2">{guest.invitado_de}</td>
                <td className="p-2">{guest.comentario}</td>
                <td className="p-2">
                  <select
                    value={guest.mesa ? guest.mesa.split("-")[0] : ""}
                    onChange={e => assignTable(guest.id, e.target.value)}
                    className="border rounded p-1"
                  >
                    <option value="">Sin mesa</option>
                    {[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(l => (
                      <option key={l} value={l}>Mesa {l}</option>
                    ))}
                  </select>
                  {guest.mesa && <span className="ml-2 text-sm text-gray-500">({guest.mesa})</span>}
                </td>
                <td className="p-2">{guest.rsvp ? "✅ Confirmado" : "⏳ Pendiente"}</td>
                <td className="p-2">{guest.alergias || "Ninguna"}</td>
                <td className="p-2">
                  <a
                    href={`https://wa.me/${guest.telefono}?text=Hola%20${encodeURIComponent(guest.nombre)}%2C%20confirma%20tu%20asistencia%20en%20${process.env.REACT_APP_RSVP_URL || "https://tursvp.com/form"}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-green-600 hover:text-green-800"
                  >
                    📱
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filteredGuests.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          No hay invitados. Haz clic en "Sincronizar con Google Sheets" para cargarlos.
        </div>
      )}
    </div>
  );
}
