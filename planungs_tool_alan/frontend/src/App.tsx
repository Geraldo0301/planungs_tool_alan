import { useEffect, useState } from "react";
import { getDemoMaterials } from "./api/demoMaterials";
import type { DemoMaterial } from "./types/demo";
import { DemoSearch } from "./components/DemoSearch";

export default function App() {
  const [clicks, setClicks] = useState(0);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<DemoMaterial | null>(null)

  const [materials, setMaterials] = useState<DemoMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  //Data Request on load
  useEffect(() => {
    const controller = new AbortController();
    getDemoMaterials(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setMaterials(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("No se pudo cargar la API");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  //Local search 
  const filtered = materials.filter((material) => {
    const code = material.materialHeader?.materialNummer ?? '';
    const name = material.materialHeader?.bezeichnung ?? '';
    return `${code} ${name}`.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <main className="p-6 space-y-4">
      <h1>Planungstool</h1>
      <p>React works</p>

      <button onClick={() => setClicks(clicks + 1)}>Pruebas: {clicks}</button>

      {loading && <p>Es wird geladen...</p>}
      {error && <p>{error}</p>}
      <p>Received materials: {materials.length}</p>
      
      <DemoSearch value={search} onChange={setSearch} />

      <ul>
        {filtered.map((material) => (
          <li
            key={material.materialHeader?.materialNummer}
            onClick={() => setSelected(material)}
            >
            {material.materialHeader?.materialNummer}
            {" - "}
            {material.materialHeader?.bezeichnung}
          </li>
        ))}
      </ul>
      {selected && (
        <section>
          <h2>{selected.materialHeader?.materialNummer}</h2>
          <p>Preis: {selected.materialHeader?.stueckPreis}</p>
          <button onClick={() => setSelected(null)}>Cerrar detalle</button>
        </section>
      )}
    </main>
  );
}
