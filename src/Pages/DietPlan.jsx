import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { doc, setDoc, collection, getDocs, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Layout from "../Layout/Layout";
import AiDiet from "../componenets/AiDiet";

const API_KEY = "K24eycEZLdVlKugLWCm9eon9K6GaWuUxUxi9OrzV";

export default function DietPlan() {
  const [date, setDate] = useState("");
  const [mealType, setMealType] = useState("breakfast");
  const [query, setQuery] = useState("");
  const [quantity, setQuantity] = useState(100);
  const [meals, setMeals] = useState([]);
  const [user, setUser] = useState(null);
  const [profileName, setProfileName] = useState("");
  const [savedPlans, setSavedPlans] = useState([]);

  // ✅ Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        fetchPlans(u.uid);
        try {
          const userDoc = await getDoc(doc(db, "users", u.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setProfileName(data.firstName ? `${data.firstName} ${data.lastName || ''}`.trim() : u.email?.split("@")[0]);
          }
        } catch (error) {
          console.error("Error fetching user details", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 🔥 Fetch saved plans
  const fetchPlans = async (uid) => {
    try {
      const ref = collection(db, "users", uid, "dietPlans");
      const snapshot = await getDocs(ref);
      const plans = snapshot.docs.map((doc) => doc.data());
      // Sort plans by date descending
      plans.sort((a, b) => new Date(b.date) - new Date(a.date));
      setSavedPlans(plans);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMealFromAI = (meal) => {
    setMeals((prev) => [...prev, { quantity: 100, ...meal }]);
  };

  // 🔍 Fetch food data
  const fetchFoodData = async () => {
    if (!query) return alert("Enter food name");
    if (quantity <= 0) return alert("Enter valid quantity");

    try {
      const res = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?query=${query}&pageSize=1&api_key=${API_KEY}`
      );

      const data = await res.json();
      const food = data.foods?.[0];

      if (!food) return alert("Food not found");

      let calories = 0,
        protein = 0,
        carbs = 0,
        fat = 0;

      if (food.foodNutrients) {
        food.foodNutrients.forEach((n) => {
          const name = n.nutrientName ? n.nutrientName.toLowerCase() : "";
          // Check by USDA nutrientNumber OR name to be resilient to API changes
          if (n.nutrientNumber === "208" || name.includes("energy")) calories = n.value || 0;
          if (n.nutrientNumber === "203" || name.includes("protein")) protein = n.value || 0;
          if (n.nutrientNumber === "205" || name.includes("carbohydrate")) carbs = n.value || 0;
          if (n.nutrientNumber === "204" || name.includes("lipid") || name.includes("fat")) fat = n.value || 0;
        });
      }

      const factor = quantity / 100;

      const newMeal = {
        type: mealType,
        name: food.description || query,
        quantity,
        calories: +(calories * factor).toFixed(2),
        protein: +(protein * factor).toFixed(2),
        carbs: +(carbs * factor).toFixed(2),
        fat: +(fat * factor).toFixed(2),
      };

      setMeals((prev) => [...prev, newMeal]);
      setQuery("");
      setQuantity(100);

    } catch (err) {
      console.error(err);
      alert("Error fetching food");
    }
  };

  // 📊 Totals
  const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const totalProtein = meals.reduce((sum, m) => sum + (m.protein || 0), 0);
  const totalFat = meals.reduce((sum, m) => sum + (m.fat || 0), 0);
  const totalCarbs = meals.reduce((sum, m) => sum + (m.carbs || 0), 0);

  // 💾 Save plan
  const saveDietPlan = async () => {
    if (!user) return alert("Login required");
    if (!date) return alert("Select date first");
    if (meals.length === 0) return alert("Add at least one meal");

    try {
      const ref = doc(db, "users", user.uid, "dietPlans", date);
      const existingSnap = await getDoc(ref);
      let existingMeals = [];
      if (existingSnap.exists()) {
        existingMeals = existingSnap.data().meals || [];
      }
      
      const updatedMeals = [...existingMeals, ...meals];
      const newTotalCalories = updatedMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
      const newTotalProtein  = updatedMeals.reduce((sum, m) => sum + (m.protein || 0), 0);
      const newTotalFat      = updatedMeals.reduce((sum, m) => sum + (m.fat || 0), 0);
      const newTotalCarbs    = updatedMeals.reduce((sum, m) => sum + (m.carbs || 0), 0);

      await setDoc(ref, {
        date,
        meals: updatedMeals,
        totalCalories: newTotalCalories,
        totalProtein: newTotalProtein,
        totalFat: newTotalFat,
        totalCarbs: newTotalCarbs,
        createdAt: existingSnap.exists() ? existingSnap.data().createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      alert("✅ Saved!");

      setMeals([]);
      
      fetchPlans(user.uid);

    } catch (err) {
      console.error(err);
      alert("Error saving");
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-100 p-6">

        {/* AI DIET PLANNER */}
        <div className="max-w-3xl mx-auto mb-8">
          <AiDiet onAddMeal={handleAddMealFromAI} />
        </div>

        {/* FORM */}
        <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-2xl p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-center">
            {profileName ? `${profileName}'s Diet Planner 🍽️` : "Diet Planner 🍽️"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <input
              type="date"
              className="border p-2 rounded-lg"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />

            <select
              className="border p-2 rounded-lg bg-white"
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>

            <input
              type="text"
              placeholder="Search food (e.g. apple)..."
              className="border p-2 rounded-lg"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            <input
              type="number"
              placeholder="Quantity (g)"
              className="border p-2 rounded-lg"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              min="1"
            />
          </div>

          <button
            onClick={fetchFoodData}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
          >
            Add Meal
          </button>

          {/* Meals List */}
          <div className="mt-6 space-y-3">
            {meals.map((meal, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg bg-gray-50 flex justify-between items-center shadow-sm"
              >
                <div>
                  <p className="font-semibold text-gray-800 capitalize">
                    {meal.type} - {meal.name} <span className="font-normal text-gray-500">({meal.quantity}g)</span>
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-medium text-orange-500">Cal: {meal.calories}</span> | 
                    <span className="font-medium text-blue-500 ml-1">Protein: {meal.protein}g</span> | 
                    <span className="font-medium text-red-500 ml-1">Fat: {meal.fat}g</span> | 
                    <span className="font-medium text-green-600 ml-1">Carbs: {meal.carbs}g</span>
                  </p>
                </div>

                <button
                  onClick={() =>
                    setMeals(meals.filter((_, i) => i !== index))
                  }
                  className="text-red-500 hover:text-red-700 font-bold px-3 py-1 bg-red-100 rounded hover:bg-red-200 transition"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Totals */}
          {meals.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <h3 className="font-bold text-blue-800 mb-2">Total Nutrition (Current Entry)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-white p-2 rounded shadow-sm">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Calories</p>
                  <p className="font-bold text-orange-500 text-lg">{totalCalories.toFixed(2)}</p>
                </div>
                <div className="bg-white p-2 rounded shadow-sm">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Protein</p>
                  <p className="font-bold text-blue-500 text-lg">{totalProtein.toFixed(2)} g</p>
                </div>
                <div className="bg-white p-2 rounded shadow-sm">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Fat</p>
                  <p className="font-bold text-red-500 text-lg">{totalFat.toFixed(2)} g</p>
                </div>
                <div className="bg-white p-2 rounded shadow-sm">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Carbs</p>
                  <p className="font-bold text-green-600 text-lg">{totalCarbs.toFixed(2)} g</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={saveDietPlan}
            disabled={meals.length === 0}
            className={`mt-6 w-full py-3 rounded-lg text-white font-bold transition ${
              meals.length > 0 ? "bg-green-500 hover:bg-green-600 shadow-md" : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            Save Plan
          </button>
        </div>

        {/* SAVED DIETS */}
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold mb-4 text-gray-800">
            {profileName ? `${profileName}'s Saved Diet Plans 📊` : "Your Saved Diet Plans 📊"}
          </h2>

          {savedPlans.length === 0 ? (
           <div className="bg-white rounded-lg p-8 text-center text-gray-500 shadow-sm border border-dashed border-gray-300">
             <p className="text-lg">No diet plans saved yet.</p>
             <p className="text-sm mt-2">Add some meals above and save them to see your history!</p>
           </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {savedPlans.map((plan, i) => (
                <div key={i} className="bg-white p-6 rounded-xl shadow-md border-t-4 border-green-400">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-lg text-gray-800">
                      📅 {plan.date || "Unknown Date"}
                    </h3>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg mb-4 flex justify-between space-x-2 text-sm border">
                    <div className="text-center w-full">
                      <p className="text-xs text-gray-500">Cal</p>
                      <p className="font-semibold text-orange-600">{Number(plan.totalCalories || 0).toFixed(1)}</p>
                    </div>
                    <div className="border-r border-gray-300 h-8 mt-1"></div>
                    <div className="text-center w-full">
                      <p className="text-xs text-gray-500">Pro</p>
                      <p className="font-semibold text-blue-600">{Number(plan.totalProtein || 0).toFixed(1)}g</p>
                    </div>
                    <div className="border-r border-gray-300 h-8 mt-1"></div>
                    <div className="text-center w-full">
                      <p className="text-xs text-gray-500">Fat</p>
                      <p className="font-semibold text-red-600">{Number(plan.totalFat || 0).toFixed(1)}g</p>
                    </div>
                    <div className="border-r border-gray-300 h-8 mt-1"></div>
                    <div className="text-center w-full">
                      <p className="text-xs text-gray-500">Carbs</p>
                      <p className="font-semibold text-green-700">{Number(plan.totalCarbs || 0).toFixed(1)}g</p>
                    </div>
                  </div>

                  <div className="space-y-2 mt-2">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b pb-1">Meals</h4>
                    {plan.meals && plan.meals.map((meal, j) => (
                      <div key={j} className="text-sm flex justify-between items-start pt-1 pb-1">
                        <span className="text-gray-800 capitalize pr-2">
                          <span className="font-medium text-gray-600">{meal.type.substring(0,1).toUpperCase() + meal.type.substring(1)}:</span> {meal.name}
                        </span>
                        <span className="text-gray-500 text-xs whitespace-nowrap bg-gray-100 px-1.5 py-0.5 rounded">
                          {meal.quantity}g / {meal.calories}cal
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}