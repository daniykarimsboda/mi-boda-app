// src/components/GuestManager.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Search, RefreshCw } from "lucide-react";

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS1kv3eReuvMR3buhp2TOC3EXOBZLyzomvhLF8GXw7BxcsHzKmtW43VGY5Uvm9AdQwlL7VxmWbO_DCF/pub?gid=65042535&single=true&output=csv";

// Parseador CSV robusto
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
      if (ch === '"') inQuote = !inQuote;
      else if (ch === "," && !inQuote) {
        values.push(current.trim());
        current = "";
      } else current += ch;
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

  const loadGuests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("guests").select("*").order("nombre");
      if (error) throw error;
      setGuests(data || []);
    } catch (err) {
      console.error(err);
      setError("Error al cargar invitados desde Supabase");
    } finally {
      setLoading(false);
    }
  };

 const syncWithSheets = async () => {
  setSyncing(true);
  setError(null);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(CSV_URL, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const text = await response.text();
    const rows = parseCSV(text);
    
    if (rows.length === 0) throw new Error("El CSV está vacío o no se pudo parsear");

    // Normalizar nombres de columnas (quitar acentos, espacios, convertir a minúsculas)
    const normalizeKey = (key) => {
      return key.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quitar acentos
        .replace(/\s/g, ""); // quitar espacios
    };

    // Mapear cada fila usando claves normalizadas
    const normalizedRows = rows.map(row => {
      const newRow = {};
      Object.keys(row).forEach(key => {
        const normKey = normalizeKey(key);
        newRow[normKey] = row[key];
      });
      return newRow;
    });

    // Buscar posibles nombres de columna para teléfono
    const telefonoKey = Object.keys(normalizedRows[0]).find(k => 
      k === "telefono" || k === "teléfono" || k === "phone" || k === "celular"
    ) || "telefono";

    // Filtrar filas que tengan teléfono no vacío
    const validRows = normalizedRows.filter(row => {
      const tel = row[telefonoKey]?.trim();
      return tel && tel !== "";
    });
    
    if (validRows.length === 0) {
      // Mostrar las primeras filas para depuración
      console.log("Primera fila normalizada:", normalizedRows[0]);
      throw new Error(`No se encontraron filas con teléfono válido. Columnas detectadas: ${Object.keys(normalizedRows[0] || {}).join(", ")}`);
    }

    // Obtener datos existentes
    const { data: existing } = await supabase.from("guests").select("telefono, rsvp, alergias, mesa");
    const existingMap = new Map(existing?.map(e => [e.telefono, e]) || []);

    // Agrupar por teléfono
    const uniqueMap = new Map();
    for (const row of validRows) {
      const telefono = row[telefonoKey].trim();
      if (!uniqueMap.has(telefono)) {
        // Buscar columna de nombre (puede variar)
        const nombreKey = Object.keys(row).find(k => k === "nombre" || k === "name") || "nombre";
        const categoriaKey = Object.keys(row).find(k => k === "categoria" || k === "category") || "categoria";
        const prioridadKey = Object.keys(row).find(k => k === "prioridad" || k === "priority") || "prioridad";
        const invitadoDeKey = Object.keys(row).find(k => k === "invitadode" || k === "invitado_de") || "invitadode";
        const comentarioKey = Object.keys(row).find(k => k === "comentario" || k === "comment") || "comentario";

        uniqueMap.set(telefono, {
          telefono,
          nombre: row[nombreKey]?.trim() || "Sin nombre",
          categoria: row[categoriaKey]?.trim() || "",
          prioridad: parsePrioridad(row[prioridadKey]?.trim() || "Media"),
          invitado_de: row[invitadoDeKey]?.trim() || "",
          comentario: row[comentarioKey]?.trim() || "",
          rsvp: existingMap.get(telefono)?.rsvp ?? false,
          alergias: existingMap.get(telefono)?.alergias ?? "",
          mesa: existingMap.get(telefono)?.mesa ?? null,
        });
      }
    }
    const upsertData = Array.from(uniqueMap.values());
    
    // Envío uno por uno
    let successCount = 0;
    let errorCount = 0;
    for (const item of upsertData) {
      const { error } = await supabase
        .from("guests")
        .upsert(item, { onConflict: "telefono" });
      if (error) {
        console.error("Error con teléfono", item.telefono, error);
        errorCount++;
      } else {
        successCount++;
      }
    }

    if (errorCount > 0) {
      throw new Error(`${errorCount} registros fallaron.`);
    }

    await loadGuests();
    alert(`✅ Sincronización exitosa: ${successCount} invitados actualizados.`);
  } catch (err) {
    console.error(err);
    if (err.name === "AbortError") {
      setError("La sincronización tardó demasiado. Revisa tu conexión o la URL del CSV.");
    } else {
      setError("Error al sincronizar: " + err.message);
    }
  } finally {
    setSyncing(false);
  }
};

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
    await supabase.from("guests").update({ mesa: newMesa }).eq("id", guestId);
    await loadGuests();
  };

  useEffect(() => {
    loadGuests();
    const subscription = supabase
      .channel("guests_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "guests" }, () => loadGuests())
      .subscribe();
    return () => subscription.unsubscribe();
  }, []);

  const filteredGuests = guests.filter(g => {
    if (filters.categoria && g.categoria !== filters.categoria) return false;
    if (filters.prioridad && g.prioridad !== filters.prioridad) return false;
    if (filters.nombre && !g.nombre.toLowerCase().includes(filters.nombre.toLowerCase())) return false;
    return true;
  });

  const glassCard = "glass rounded-2xl p-5 md:p-6";

  if (loading && !syncing) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="text-[#4a3a5c]">Cargando invitados...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`${glassCard} flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
        <h2 className="serif text-3xl md:text-4xl text-[#4a3a5c] font-light">
          Invitados <span className="italic text-[#B2AC88]">✦</span>
        </h2>
        <button
          onClick={syncWithSheets}
          disabled={syncing}
          className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#E0BBE4]/20 border border-[#E0BBE4]/50 text-[#7b4f8a] hover:bg-[#E0BBE4]/40 transition-all text-sm font-medium"
        >
          <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Sincronizando..." : "Sincronizar con Google Sheets"}
        </button>
      </div>

      {error && (
        <div className="bg-red-100/80 backdrop-blur-sm border border-red-300 text-red-700 p-3 rounded-xl">
          ⚠️ {error}
        </div>
      )}

      <div className={`${glassCard} flex flex-wrap gap-3 items-center`}>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={filters.nombre}
            onChange={e => setFilters({ ...filters, nombre: e.target.value })}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/50 border border-[#E0BBE4]/30 text-[#4a3a5c] placeholder:text-[#aaa] focus:outline-none focus:ring-1 focus:ring-[#E0BBE4]"
          />
        </div>
        <select
          value={filters.categoria}
          onChange={e => setFilters({ ...filters, categoria: e.target.value })}
          className="px-3 py-2 rounded-xl bg-white/50 border border-[#E0BBE4]/30 text-[#4a3a5c] text-sm focus:outline-none"
        >
          <option value="">Todas las categorías</option>
          <option>Familia</option><option>Amigos</option><option>Trabajo</option><option>Conocidos</option>
        </select>
        <select
          value={filters.prioridad}
          onChange={e => setFilters({ ...filters, prioridad: e.target.value })}
          className="px-3 py-2 rounded-xl bg-white/50 border border-[#E0BBE4]/30 text-[#4a3a5c] text-sm focus:outline-none"
        >
          <option value="">Todas las prioridades</option>
          <option>Alta</option><option>Media</option><option>Baja</option>
        </select>
      </div>

      <div className={`${glassCard} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E0BBE4]/30 text-[#9b8ab4] font-medium uppercase tracking-wider">
              <th className="py-3 px-2 text-left">Nombre</th>
              <th className="py-3 px-2 text-left">Teléfono</th>
              <th className="py-3 px-2 text-left">Categoría</th>
              <th className="py-3 px-2 text-left">Prioridad</th>
              <th className="py-3 px-2 text-left">Invitado de</th>
              <th className="py-3 px-2 text-left">Comentario</th>
              <th className="py-3 px-2 text-left">Mesa</th>
              <th className="py-3 px-2 text-left">RSVP</th>
              <th className="py-3 px-2 text-left">Alergias</th>
              <th className="py-3 px-2 text-left">WhatsApp</th>
             </tr>
          </thead>
          <tbody>
            {filteredGuests.map((guest, idx) => (
              <tr key={guest.id} className={`border-b border-[#E0BBE4]/15 ${idx % 2 === 0 ? "bg-white/20" : "bg-transparent"} hover:bg-[#E0BBE4]/10 transition`}>
                <td className="py-2 px-2 font-medium text-[#4a3a5c]">{guest.nombre}</td>
                <td className="py-2 px-2 text-[#6b5c7e]">{guest.telefono}</td>
                <td className="py-2 px-2">{guest.categoria}</td>
                <td className="py-2 px-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium
                    ${guest.prioridad === "Alta" ? "bg-[#F4A5A5]/30 text-[#c05a5a]" : 
                      guest.prioridad === "Media" ? "bg-[#FFD580]/30 text-[#8a7230]" : 
                      "bg-[#B2AC88]/30 text-[#5a6a45]"}`}>
                    {guest.prioridad}
                  </span>
                </td>
                <td className="py-2 px-2">{guest.invitado_de}</td>
                <td className="py-2 px-2 text-[#aaa]">{guest.comentario}</td>
                <td className="py-2 px-2">
                  <select
                    value={guest.mesa ? guest.mesa.split("-")[0] : ""}
                    onChange={e => assignTable(guest.id, e.target.value)}
                    className="bg-white/60 border border-[#E0BBE4]/40 rounded-lg px-2 py-1 text-sm focus:outline-none"
                  >
                    <option value="">Sin mesa</option>
                    {[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(l => (
                      <option key={l} value={l}>Mesa {l}</option>
                    ))}
                  </select>
                  {guest.mesa && <span className="ml-1 text-xs text-[#B2AC88]">({guest.mesa})</span>}
                </td>
                <td className="py-2 px-2">{guest.rsvp ? "✅ Confirmado" : "⏳ Pendiente"}</td>
                <td className="py-2 px-2">{guest.alergias || "Ninguna"}</td>
                <td className="py-2 px-2">
                  <a
                    href={`https://wa.me/${guest.telefono}?text=Hola%20${encodeURIComponent(guest.nombre)}%2C%20confirma%20tu%20asistencia%20en%20${process.env.REACT_APP_RSVP_URL || "https://tursvp.com/form"}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#B2AC88] hover:text-[#7a7555] transition"
                  >
                    📱
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredGuests.length === 0 && !loading && (
          <div className="text-center py-10 text-[#aaa]">
            No hay invitados. Sincroniza con Google Sheets para cargarlos.
          </div>
        )}
      </div>
    </div>
  );
}
