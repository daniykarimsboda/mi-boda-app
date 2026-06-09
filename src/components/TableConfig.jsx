import { useState, useEffect } from "react";

const TableConfig = () => {
  const [limit, setLimit] = useState(() => {
    const saved = localStorage.getItem("wedding_max_people_per_table");
    return saved ? parseInt(saved) : 10;
  });

  const handleChange = (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val > 0) {
      setLimit(val);
      localStorage.setItem("wedding_max_people_per_table", val);
    }
  };

  return (
    <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-[#E0BBE4]/30">
      <label className="block text-sm font-medium text-[#4a3a5c] mb-1">
        Límite de personas por mesa:
      </label>
      <input
        type="number"
        min="1"
        value={limit}
        onChange={handleChange}
        className="mt-1 p-2 border rounded-lg w-28 text-center bg-white"
      />
    </div>
  );
};

export default TableConfig;
