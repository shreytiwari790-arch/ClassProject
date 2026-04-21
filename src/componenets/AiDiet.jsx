import { useState } from "react";
import { generateDietPlan } from "../geminiService";

export default function AiDiet({ onAddMeal }) {
  const [query, setQuery] = useState("");
  const [aiMeals, setAiMeals] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!query) return alert("Enter something");

    setLoading(true);
    const meals = await generateDietPlan(query);
    setAiMeals(meals);
    setLoading(false);
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow mb-6">
      <h2 className="text-xl font-bold mb-3">AI Diet Generator 🤖</h2>

      <input
        type="text"
        placeholder="e.g. weight loss diet"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="border p-2 rounded-lg w-full"
      />

      <button
        onClick={handleGenerate}
        className="bg-purple-500 text-white px-4 py-2 mt-3 rounded-lg"
      >
        {loading ? "Generating..." : "Generate Plan"}
      </button>

      {/* Results */}
      <div className="mt-4 space-y-3">
        {aiMeals.map((meal, i) => (
          <div key={i} className="border p-3 rounded-lg">
            <p className="font-semibold">
              {meal.type} - {meal.name}
            </p>
            <p className="text-sm">
              Cal: {meal.calories} | Protein: {meal.protein}g
            </p>

            <button
              onClick={() => onAddMeal(meal)}
              className="bg-green-500 text-white px-3 py-1 mt-2 rounded"
            >
              ➕ Add
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}