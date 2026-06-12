import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Search, RefreshCw, Mail, X } from "lucide-react";

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS1kv3eReuvMR3buhp2TOC3EXOBZLyzomvhLF8GXw7BxcsHzKmtW43VGY5Uvm9AdQwlL7VxmWbO_DCF/pub?gid=65042535&single=true&output=csv";

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
  if (["Alta", "Media", "Baja"].includes(val)) return val;
  return "Media";
};

const generarTelefonoArtificial = (nombre) => {
  if (!nombre) return `sin_telefono_${Date.now()}`;
  return `sin_telefono_${nombre.toLowerCase().replace(/\s/g, "_")}`;
};

export default function GuestManager({ guestsFromParent, onGuestsUpdate }) {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ categoria: "", prioridad: "", nombre: "" });
  const [maxPerTable, setMaxPerTable] = useState(10);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("¡Te invitamos a nuestra boda! Confirma tu asistencia aquí:");
  const [inviteLink, setInviteLink] = useState(process.env.REACT_APP_RSVP_URL || "https://tursvp.com/form");
  const [selectedGuests, setSelectedGuests] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (guestsFromParent) setGuests(guestsFromParent);
    else loadGuests();
  }, [guestsFromParent]);

  useEffect(() => {
    const saved = localStorage.getItem("wedding_max_people_per_table");
    if (saved) setMaxPerTable(parseInt(saved));
  }, []);

  const loadGuests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("guests").select("*").order("nombre");
      if (error) throw error;
      setGuests(data || []);
      if (onGuestsUpdate) onGuestsUpdate();
    } catch (err) {
      console.error(err);
      setError("Error al cargar invitados desde Supabase");
    } finally {
      setLoading(false);
    }
  };

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

  const syncWithSheets = async () => {
    setSyncing(true);
    setError(null);
    try {
      const response = await fetch(CSV_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      const rows = parseCSV(text);
      if (rows.length === 0) throw new Error("El CSV está vacío");

      const { data: existing } = await supabase.from("guests").select("telefono, rsvp, alergias, mesa");
      const existingMap = new Map(existing?.map(e => [e.telefono, e]) || []);

      const upsertData = [];
      for (const row of rows) {
        let telefono = row.Telefono?.trim();
        const nombre = row.Nombre?.trim() || "Sin nombre";
        if (!telefono || telefono === "") {
          telefono = generarTelefonoArtificial(nombre);
        }
        let existente = existingMap.get(telefono);
        if (!existente && telefono.startsWith("sin_telefono_")) {
          existente = existingMap.get(`nombre:${nombre.toLowerCase().trim()}`);
        }
        upsertData.push({
          telefono,
          nombre,
          categoria: row.Categoria?.trim() || "",
          prioridad: parsePrioridad(row.Prioridad?.trim() || "Media"),
          invitado_de: row["Invitado de"]?.trim() || "",
          comentario: row.Comentario?.trim() || "",
          rsvp: existente?.rsvp ?? false,
          alergias: existente?.alergias ?? "",
          mesa: existente?.mesa ?? null,
        });
      }
      if (upsertData.length === 0) throw new Error("No hay datos para sincronizar");

      let successCount = 0;
      for (const item of upsertData) {
        const { error } = await supabase
          .from("guests")
          .upsert(item, { onConflict: "telefono" });
        if (!error) successCount++;
      }
      await loadGuests();
      alert(`✅ Sincronización completa: ${successCount} invitados actualizados.`);
    } catch (err) {
      console.error(err);
      setError("Error al sincronizar: " + err.message);
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

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedGuests([]);
    } else {
      setSelectedGuests(guests.map(g => g.id));
    }
    setSelectAll(!selectAll);
  };

  const toggleSelectGuest = (id) => {
    if (selectedGuests.includes(id)) {
      setSelectedGuests(selectedGuests.filter(gid => gid !== id));
      setSelectAll(false);
    } else {
      setSelectedGuests([...selectedGuests, id]);
      if (selectedGuests.length + 1 === guests.length) setSelectAll(true);
    }
  };

  const sendInvitations = () => {
    const guestsToSend = selectAll ? guests : guests.filter(g => selectedGuests.includes(g.id));
    if (guestsToSend.length === 0) return alert("Selecciona al menos un invitado");
    guestsToSend.forEach(guest => {
      if (guest.telefono && !guest.telefono.startsWith("sin_telefono_")) {
        const personalizedMessage = inviteMessage.replace("{nombre}", guest.nombre);
        const text = encodeURIComponent(`${personalizedMessage}\n\nLink: ${inviteLink}`);
        window.open(`https://wa.me/${guest.telefono}?text=${text}`, "_blank");
      }
    });
    setShowInviteModal(false);
    setSelectedGuests([]);
    setSelectAll(false);
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

  if (loading && !syncing) return <div className="flex justify-center items-center py-16">Cargando invitados...</div>;

  return (
    <div className="space-y-6">
      <div className={`${glassCard} flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
        <h2 className="serif text-3xl md:text-4xl text-[#4a3a5c] font-light">Invitados <span className="italic text-[#B2AC88]">✦</span></h2>
        <div className="flex gap-2">
          <button onClick={() => setShowInviteModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#E0BBE4]/20 border border-[#E0BBE4]/50 text-[#7b4f8a] hover:bg-[#E0BBE4]/40 transition">
            <Mail size={16} /> Invitación
          </button>
          <button onClick={syncWithSheets} disabled={syncing} className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#E0BBE4]/20 border border-[#E0BBE4]/50 text-[#7b4f8a] hover:bg-[#E0BBE4]/40 transition-all text-sm font-medium">
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Sincronizando..." : "Sincronizar con Google Sheets"}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-100/80 backdrop-blur-sm border border-red-300 text-red-700 p-3 rounded-xl">⚠️ {error}</div>}

      <div className={`${glassCard} flex flex-wrap gap-3 items-center`}>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]" />
          <input type="text" placeholder="Buscar por nombre..." value={filters.nombre} onChange={e => setFilters({ ...filters, nombre: e.target.value })} className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/50 border border-[#E0BBE4]/30 text-[#4a3a5c] focus:outline-none focus:ring-1 focus:ring-[#E0BBE4]" />
        </div>
        <select value={filters.categoria} onChange={e => setFilters({ ...filters, categoria: e.target.value })} className="px-3 py-2 rounded-xl bg-white/50 border border-[#E0BBE4]/30 text-[#4a3a5c] text-sm focus:outline-none">
          <option value="">Todas las categorías</option>
          <option>Familia</option><option>Amigos</option><option>Trabajo</option><option>Conocidos</option>
        </select>
        <select value={filters.prioridad} onChange={e => setFilters({ ...filters, prioridad: e.target.value })} className="px-3 py-2 rounded-xl bg-white/50 border border-[#E0BBE4]/30 text-[#4a3a5c] text-sm focus:outline-none">
          <option value="">Todas las prioridades</option>
          <option>Alta</option><option>Media</option><option>Baja</option>
        </select>
      </div>

      <div className={`${glassCard} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E0BBE4]/30 text-[#9b8ab4] font-medium uppercase tracking-wider">
              <th className="py-3 px-2 w-8"><input type="checkbox" checked={selectAll} onChange={handleSelectAll} /></th>
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
            <tr>
          </thead>
          <tbody>
            {filteredGuests.map((guest, idx) => (
              <tr key={guest.id} className={`border-b border-[#E0BBE4]/15 ${idx % 2 === 0 ? "bg-white/20" : "bg-transparent"} hover:bg-[#E0BBE4]/10 transition`}>
                <td className="py-2 px-2"><input type="checkbox" checked={selectedGuests.includes(guest.id)} onChange={() => toggleSelectGuest(guest.id)} /></td>
                <td className="py-2 px-2 font-medium text-[#4a3a5c]">{guest.nombre}</td>
                <td className="py-2 px-2 text-[#6b5c7e]">{guest.telefono?.startsWith("sin_telefono_") ? "—" : guest.telefono}</td>
                <td className="py-2 px-2">{guest.categoria}</td>
                <td className="py-2 px-2"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${guest.prioridad === "Alta" ? "bg-[#F4A5A5]/30 text-[#c05a5a]" : guest.prioridad === "Media" ? "bg-[#FFD580]/30 text-[#8a7230]" : "bg-[#B2AC88]/30 text-[#5a6a45]"}`}>{guest.prioridad}</span></td>
                <td className="py-2 px-2">{guest.invitado_de}</td>
                <td className="py-2 px-2 text-[#aaa]">{guest.comentario}</td>
                <td className="py-2 px-2">
                  <select value={guest.mesa ? guest.mesa.split("-")[0] : ""} onChange={e => assignTable(guest.id, e.target.value)} className="bg-white/60 border border-[#E0BBE4]/40 rounded-lg px-2 py-1 text-sm focus:outline-none">
                    <option value="">Sin mesa</option>
                    {[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(l => <option key={l} value={l}>Mesa {l}</option>)}
                  </select>
                  {guest.mesa && <span className="ml-1 text-xs text-[#B2AC88]">({guest.mesa})</span>}
                </td>
                <td className="py-2 px-2">{guest.rsvp ? "✅ Confirmado" : "⏳ Pendiente"}</td>
                <td className="py-2 px-2">{guest.alergias || "Ninguna"}</td>
                <td className="py-2 px-2">
                  {guest.telefono && !guest.telefono.startsWith("sin_telefono_") ? (
                    <a href={`https://wa.me/${guest.telefono}?text=Hola%20${encodeURIComponent(guest.nombre)}%2C%20confirma%20tu%20asistencia%20en%20${inviteLink}`} target="_blank" rel="noreferrer" className="text-[#B2AC88] hover:text-[#7a7555] transition">📱</a>
                  ) : <span className="text-gray-400 text-xs">Sin WhatsApp</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredGuests.length === 0 && !loading && <div className="text-center py-10 text-[#aaa]">No hay invitados. Sincroniza con Google Sheets para cargarlos.</div>}
      </div>

      {/* Modal de invitación */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowInviteModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="serif text-2xl text-[#4a3a5c]">Enviar invitación</h3>
              <button onClick={() => setShowInviteModal(false)}><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#4a3a5c] mb-1">Mensaje de WhatsApp (usa {nombre} para personalizar)</label>
                <textarea value={inviteMessage} onChange={e => setInviteMessage(e.target.value)} rows={3} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4a3a5c] mb-1">Link de invitación / RSVP</label>
                <input type="url" value={inviteLink} onChange={e => setInviteLink(e.target.value)} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4a3a5c] mb-1">Destinatarios</label>
                <div className="border rounded-lg p-2 max-h-40 overflow-y-auto">
                  <label className="flex items-center gap-2 mb-1"><input type="checkbox" checked={selectAll} onChange={handleSelectAll} /> <span className="font-semibold">Todos los invitados</span></label>
                  {guests.map(g => (
                    <label key={g.id} className="flex items-center gap-2 ml-4"><input type="checkbox" checked={selectedGuests.includes(g.id)} onChange={() => toggleSelectGuest(g.id)} /> {g.nombre}</label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowInviteModal(false)} className="px-4 py-2 rounded-full bg-gray-200">Cancelar</button>
              <button onClick={sendInvitations} className="px-4 py-2 rounded-full bg-[#E0BBE4] text-white">Enviar invitaciones</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
