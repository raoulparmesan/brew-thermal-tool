import { useState } from "react";

export default function SimpleForm() {
  const [volume, setVolume] = useState(10);

  return (
    <div className="border p-4 rounded shadow-md w-full max-w-md">
      <label className="block mb-2 font-semibold">
        Volume d'eau (L)
      </label>
      <input
        type="number"
        value={volume}
        onChange={(e) => setVolume(Number(e.target.value))}
        className="border p-2 w-full rounded"
      />
      <p className="mt-4">Volume actuel : {volume} L</p>
    </div>
  );
}
