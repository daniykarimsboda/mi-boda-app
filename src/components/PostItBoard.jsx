import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Plus, Trash2, Save, X } from "lucide-react";

export default function PostItBoard() {
  const [notes, setNotes] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    loadNotes();
    const subscription = supabase.channel("postits_realtime").on("postgres_changes", { event: "*", schema: "public", table: "postits" }, () => loadNotes()).subscribe();
    return () => subscription.unsubscribe();
  }, []);

  const loadNotes = async () => {
    const { data } = await supabase.from("postits").select("*").order("created_at");
    setNotes(data || []);
  };

  const addNote = async () => {
    const newNote = { content: "Nueva nota", color: "#FFF9C4", position_x: 20, position_y: 20 };
    await supabase.from("postits").insert(newNote);
    loadNotes();
  };

  const updateNote = async (id, updates) => {
    await supabase.from("postits").update(updates).eq("id", id);
    loadNotes();
  };

  const deleteNote = async (id) => {
    if (window.confirm("¿Eliminar nota?")) await supabase.from("postits").delete().eq("id", id);
    loadNotes();
  };

  const colors = ["#FFF9C4", "#FFE0B2", "#F8BBD9", "#C8E6C9", "#B3E5FC", "#E1BEE7"];

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex justify-between items-center mb-6"><h2 className="serif text-3xl text-[#4a3a5c] font-light">Pizarra de notas ✦</h2><button onClick={addNote} className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#E0BBE4]/30"><Plus size={16}/> Nueva nota</button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {notes.map(note => (
          <div key={note.id} className="rounded-xl p-4 shadow-md relative" style={{ backgroundColor: note.color, minHeight: "160px" }}>
            {editingId === note.id ? (
              <div><textarea value={editText} onChange={e=>setEditText(e.target.value)} className="w-full p-2 rounded bg-white/80 border-none" rows={4} autoFocus/><div className="flex justify-end gap-2 mt-2"><button onClick={()=>{updateNote(note.id, { content: editText }); setEditingId(null);}} className="p-1 rounded-full bg-green-200"><Save size={14}/></button><button onClick={()=>setEditingId(null)} className="p-1 rounded-full bg-gray-200"><X size={14}/></button></div></div>
            ) : (
              <div><p className="whitespace-pre-wrap break-words pr-6">{note.content}</p><div className="absolute top-2 right-2 flex gap-1"><button onClick={()=>{ setEditingId(note.id); setEditText(note.content); }} className="p-1 text-gray-600 hover:text-black"><Edit2 size={14}/></button><button onClick={()=>deleteNote(note.id)} className="p-1 text-gray-600 hover:text-red-500"><Trash2 size={14}/></button></div><div className="mt-3 flex gap-1"><select value={note.color} onChange={e=>updateNote(note.id, { color: e.target.value })} className="text-xs p-1 rounded bg-white/50 border-none">{colors.map(c=><option key={c} value={c} style={{backgroundColor:c}}>{c}</option>)}</select></div></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
