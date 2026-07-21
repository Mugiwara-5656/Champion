import { useState } from "react";
import { DISC, TECHS } from "./data/techniques.js";
import TechniqueDetail from "./screens/TechniqueDetail.jsx";

export default function App() {
  const [selectedTech, setSelectedTech] = useState(null);

  if (selectedTech) {
    const disc = DISC.find(d => d.id === selectedTech.discId);
    const tech = TECHS[selectedTech.discId]?.find(t => t.id === selectedTech.techId);
    if (!tech) {
      return (
        <div className="min-h-screen bg-bg0 text-ink flex items-center justify-center">
          <button onClick={() => setSelectedTech(null)} className="underline">Back</button>
        </div>
      );
    }
    return (
      <TechniqueDetail
        tech={tech}
        disc={disc}
        onBack={() => setSelectedTech(null)}
        onAskSensei={(prompt) => console.log("[Sensei prompt]", prompt)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-bg0 text-ink font-body flex flex-col items-center justify-center p-6 text-center">
      <h1 className="font-display text-accent text-5xl mb-2">CHAMPION</h1>
      <p className="text-sm text-white/50 mb-8">Task 5 stub home</p>
      <button
        onClick={() => setSelectedTech({ discId: "boxing", techId: "jab" })}
        className="px-5 py-3 rounded-lg bg-accent text-bg0 font-semibold"
      >
        Pick a technique → Jab
      </button>
    </div>
  );
}
