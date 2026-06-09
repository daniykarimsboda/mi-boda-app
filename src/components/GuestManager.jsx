// src/components/GuestManager.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS1kv3eReuvMR3buhp2TOC3EXOBZLyzomvhLF8GXw7BxcsHzKmtW43VGY5Uvm9AdQwlL7VxmWbO_DCF/pub?gid=65042535&single=true&output=csv";

// Helper para parsear CSV simple (maneja comillas)
const parseCSV = (text) => {
  const lines = text.split(/\r?\n/);
  const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
  return lines.slice(1).filter(line => line.trim()).map(line => {
    const values = [];
    let inQuote = false;
    let current = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
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
    headers.forEach((h, idx) => { obj[h] = values[idx]?.replace(/^"|"$/g, "") || ""; });
    return obj;
  });
};

export default function GuestManager() {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ categoria: "", prioridad: "", nombre: "" });
  const [maxPerTable, setMaxPerTable] = useState(10);

  // Cargar límite de mesa desde localStorage
  useEffect(() => {
    const saved = localStorage.getItem("wedding_max_people_per_table");
    if (saved) setMaxPerTable(parseInt(saved));
  }, []);

  // Función para obtener siguiente número de mesa
  const getNextTableNumber = (letter, currentGuests) => {
    const mesaPrefix = `${letter}-`;
    const existingNumbers = currentGuests
      .filter(g => g.mesa && g.mesa.startsWith(mesaPrefix))
      .map(g => parseInt(g.mesa.split("-")[1]))
      .filter(n => !isNaN(n));
    for (let i = 1; i <= maxPerTable; i++) {
      if (!existingNumbers.includes(i)) return i;
    }
    return null; // mesa llena
  };

  // Sincronizar con Google Sheets y Supabase
  const syncWithSheets = async () => {
    setLoading(true);
    setError(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(CSV_URL, { signal: controller.signal });
      clearTimeout(timeout);
      const text = await res.text();
      const rows = parseCSV(text);
      
      // Obtener invitados existentes en Supabase
      const { data: existing, error: fetchError } = await supabase.from("guests").select("telefono, rsvp, alergias, mesa");
      if (fetchError) throw fetchError;
      const existingMap = new Map(existing.map(g => [g.telefono, g]));
      
      // Preparar upsert (no sobrescribir rsvp, alergias, mesa)
      const upsertData = rows.map(row => ({
        telefono: row.Telefono || "",
        nombre: row.Nombre || "",
        categoria: row.Categoria || "",
        prioridad: row.Prioridad || "",
        invitado_de: row["Invitado de"] || "",
        comentario: row.Comentario || "",
        rsvp: existingMap.get(row.Telefono)?.rsvp ?? false,
        alergias: existingMap.get(row.Telefono)?.alergias ?? "",
        mesa: existingMap.get(row.Telefono)?.mesa ?? null,
      })).filter(g => g.telefono);
      
      const { error: upsertError } = await supabase.from("guests").upsert(upsertData, { onConflict: "telefono" });
      if (upsertError) throw upsertError;
      
      // Recargar datos actualizados
      const { data: final, error: finalError } = await supabase.from("guests").select("*");
      if (finalError) throw finalError;
      setGuests(final);
    } catch (err) {
      console.error(err);
      setError("Error al cargar invitados. Verifica la URL del CSV.");
    } finally {
      setLoading(false);
    }
  };

  // Asignar mesa manualmente
  const assignTable = async (guestId, currentMesa, newLetter) => {
    if (!newLetter) return;
    // Obtener lista actualizada de invitados
    const { data: allGuests } = await supabase.from("guests").select("*");
    const guest = allGuests.find(g => g.id === guestId);
    if (!guest) return;
    
    // Si la letra no cambió, no hacer nada
    const currentLetter = guest.mesa ? guest.mesa.split("-")[0] : null;
    if (currentLetter === newLetter) return;
    
    // Calcular nuevo número
    const nextNum = getNextTableNumber(newLetter, allGuests);
    if (nextNum === null) {
      alert(`La mesa ${newLetter} ya está llena (límite ${maxPerTable} personas).`);
      return;
    }
    const newMesa = `${newLetter}-${nextNum}`;
    
    const { error } = await supabase.from("guests").update({ mesa: newMesa }).eq("id", guestId);
    if (error) console.error(error);
    else syncWithSheets(); // refrescar
  };

  useEffect(() => {
    syncWithSheets();
    // Suscripción realtime opcional
    const subscription = supabase
      .channel("guests_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "guests" }, () => syncWithSheets())
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

  if (loading) return <div className="p-4 text-center">Cargando invitados...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Invitados</h2>
      
      {/* Filtros */}
      <div className="flex flex-wrap gap-4 mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={filters.nombre}
          onChange={e => setFilters({ ...filters, nombre: e.target.value })}
          className="border p-2 rounded"
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
              <tr key={guest.id} className="border-b">
                <td className="p-2">{guest.nombre}</td><td className="p-2">{guest.telefono}</td><td className="p-2">{guest.categoria}</td>
                <td className="p-2">{guest.prioridad}</td><td className="p-2">{guest.invitado_de}</td><td className="p-2">{guest.comentario}</td>
                <td className="p-2">
                  <select
                    value={guest.mesa ? guest.mesa.split("-")[0] : ""}
                    onChange={e => assignTable(guest.id, guest.mesa, e.target.value)}
                    className="border rounded p-1"
                  >
                    <option value="">Sin mesa</option>
                    {[..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map(letra => (
                      <option key={letra} value={letra}>Mesa {letra}</option>
                    ))}
                  </select>
                  {guest.mesa && <span className="ml-2 text-sm">({guest.mesa})</span>}
                </td>
                <td className="p-2">{guest.rsvp ? "✅ Confirmado" : "⏳ Pendiente"}</td>
                <td className="p-2">{guest.alergias || "Ninguna"}</td>
                <td className="p-2">
                  <a href={`https://wa.me/${guest.telefono}?text=Hola%20${encodeURIComponent(guest.nombre)}%2C%20confirma%20tu%20asistencia%20en%20${process.env.REACT_APP_RSVP_URL || "https://tursvp.com/form"}`} target="_blank" rel="noreferrer">
                    📱
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
