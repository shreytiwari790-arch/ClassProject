import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Layout from "../Layout/Layout";
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, Filler,
} from "chart.js";
import { Doughnut, Bar, Line } from "react-chartjs-2";

ChartJS.register(
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, Filler
);

const API_KEY = "K24eycEZLdVlKugLWCm9eon9K6GaWuUxUxi9OrzV";

const MEAL_META = {
  breakfast: { icon: "🌅", color: "#9FE1CB", bg: "rgba(159,225,203,0.15)" },
  lunch:     { icon: "☀️",  color: "#378ADD", bg: "rgba(55,138,221,0.12)" },
  dinner:    { icon: "🌙", color: "#7F77DD", bg: "rgba(127,119,221,0.12)" },
  snack:     { icon: "🍎", color: "#EF9F27", bg: "rgba(239,159,39,0.12)"  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Health calculations
// ─────────────────────────────────────────────────────────────────────────────
function calcBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  return weightKg / Math.pow(heightCm / 100, 2);
}

function bmiCategory(bmi) {
  if (!bmi) return { label: "—", color: "#aaa" };
  if (bmi < 18.5) return { label: "Underweight", color: "#378ADD" };
  if (bmi < 25)   return { label: "Normal",       color: "#1D9E75" };
  if (bmi < 30)   return { label: "Overweight",   color: "#EF9F27" };
  return               { label: "Obese",           color: "#D85A30" };
}

// Mifflin-St Jeor BMR
function calcBMR(weightKg, heightCm, age, gender) {
  if (!weightKg || !heightCm || !age) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === "female" ? base - 161 : base + 5;
}

// TDEE — moderate activity (×1.55)
function calcTDEE(bmr) {
  if (!bmr) return null;
  return Math.round(bmr * 1.55);
}

// Ideal body weight — Devine formula
function calcIdealWeight(heightCm, gender) {
  if (!heightCm) return null;
  const heightIn     = heightCm / 2.54;
  const inchesOver5ft = heightIn - 60;
  if (gender === "female") return +(45.5 + 2.3 * inchesOver5ft).toFixed(1);
  return +(50 + 2.3 * inchesOver5ft).toFixed(1);
}

// Dynamic macro goals from TDEE  (30% P · 45% C · 25% F)
function calcGoals(tdee) {
  const cal = tdee || 2000;
  return {
    calories: cal,
    protein:  Math.round((cal * 0.30) / 4),
    carbs:    Math.round((cal * 0.45) / 4),
    fat:      Math.round((cal * 0.25) / 9),
  };
}

function getInitials(name) {
  if (!name) return "U";
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color }) {
  const pct = Math.min(100, Math.round(((value || 0) / (max || 1)) * 100));
  return (
    <div style={{ height: 6, borderRadius: 4, background: "rgba(128,128,128,0.12)", overflow: "hidden", marginTop: 8 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.6s ease" }} />
    </div>
  );
}

function MetricCard({ label, value, unit, goal, color }) {
  return (
    <div style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.08)", borderRadius: 14, padding: "1rem 1.1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <p style={{ fontSize: 11, color: "#888", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 600, color: "#1a1a1a", lineHeight: 1.1 }}>
        {typeof value === "number" ? value.toFixed(0) : value}
      </p>
      <p style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>of {goal} {unit}</p>
      <ProgressBar value={value} max={goal} color={color} />
    </div>
  );
}

function WaterTracker() {
  const [filled, setFilled] = useState(0);
  return (
    <div>
      <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 4 }}>Water intake</p>
      <p style={{ fontSize: 11, color: "#aaa", marginBottom: 12 }}>Tap cups to track · 8 glasses = goal</p>
      <div style={{ display: "flex", gap: 6 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}
            onClick={() => setFilled(filled === i + 1 ? i : i + 1)}
            style={{
              flex: 1, height: 44, borderRadius: 6, cursor: "pointer",
              background: i < filled ? "#378ADD" : "rgba(55,138,221,0.12)",
              border: `0.5px solid ${i < filled ? "#185FA5" : "#B5D4F4"}`,
              transition: "all 0.2s",
            }}
          />
        ))}
      </div>
      <p style={{ fontSize: 11, color: "#aaa", marginTop: 6 }}>{filled} / 8 glasses</p>
    </div>
  );
}

// Visual BMI gauge bar
function BMIGauge({ bmi }) {
  if (!bmi) return null;
  const capped = Math.min(Math.max(bmi, 10), 40);
  const pct    = ((capped - 10) / 30) * 100;
  const cat    = bmiCategory(bmi);
  const zones  = [
    { label: "Under",  color: "#378ADD", width: 28 },
    { label: "Normal", color: "#1D9E75", width: 22 },
    { label: "Over",   color: "#EF9F27", width: 17 },
    { label: "Obese",  color: "#D85A30", width: 33 },
  ];
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ position: "relative", height: 12, borderRadius: 6, overflow: "hidden", display: "flex" }}>
        {zones.map((z) => (
          <div key={z.label} style={{ width: `${z.width}%`, background: z.color, opacity: 0.35 }} />
        ))}
        <div style={{
          position: "absolute", top: 0, left: `${Math.min(pct, 97)}%`,
          width: 3, height: "100%", background: cat.color, borderRadius: 2,
          transform: "translateX(-50%)", boxShadow: "0 0 0 2px white",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        {zones.map((z) => (
          <span key={z.label} style={{ fontSize: 9, color: z.color, opacity: 0.8 }}>{z.label}</span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function DietPlan() {
  const [date, setDate]             = useState("");
  const [mealType, setMealType]     = useState("breakfast");
  const [query, setQuery]           = useState("");
  const [quantity, setQuantity]     = useState(100);
  const [meals, setMeals]           = useState([]);
  const [user, setUser]             = useState(null);
  const [profile, setProfile]       = useState(null);   // Firestore user doc
  const [savedPlans, setSavedPlans] = useState([]);
  const [activeTab, setActiveTab]   = useState("dashboard");

  // ── Auth + Firestore profile ─────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        fetchPlans(u.uid);
        fetchProfile(u.uid);
      }
    });
    return () => unsub();
  }, []);

  const fetchProfile = async (uid) => {
    try {
      // Reads the document at /users/{uid}  — adjust path if yours differs
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) setProfile(snap.data());
    } catch (err) {
      console.error("Profile fetch:", err);
    }
  };

  const fetchPlans = async (uid) => {
    try {
      const snap = await getDocs(collection(db, "users", uid, "dietPlans"));
      setSavedPlans(snap.docs.map((d) => d.data()));
    } catch (err) {
      console.error(err);
    }
  };

  // ── Derived health data ──────────────────────────────────────────────────
  const weight      = parseFloat(profile?.bodyweight || profile?.weight || 0);
  const height      = parseFloat(profile?.height || 0);
  const age         = parseInt(profile?.age || 0);
  const gender      = (profile?.gender || "male").toLowerCase();
  const name        = profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}`.trim() : profile?.name || user?.displayName || "User";
  const email       = profile?.email       || user?.email        || "—";

  const bmi         = calcBMI(weight, height);
  const bmiCat      = bmiCategory(bmi);
  const bmr         = calcBMR(weight, height, age, gender);
  const tdee        = calcTDEE(bmr);
  const idealWeight = calcIdealWeight(height, gender);
  const GOALS       = calcGoals(tdee);

  // ── Food API ─────────────────────────────────────────────────────────────
  const fetchFoodData = async () => {
    if (!query)        return alert("Enter food name");
    if (quantity <= 0) return alert("Enter valid quantity");
    try {
      const res  = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${query}&pageSize=1&api_key=${API_KEY}`);
      const data = await res.json();
      const food = data.foods?.[0];
      if (!food) return alert("Food not found");

      let calories = 0, protein = 0, carbs = 0, fat = 0;
      food.foodNutrients.forEach((n) => {
        if (n.nutrientName === "Energy")                       calories = n.value;
        if (n.nutrientName === "Protein")                      protein  = n.value;
        if (n.nutrientName === "Carbohydrate, by difference")  carbs    = n.value;
        if (n.nutrientName === "Total lipid (fat)")            fat      = n.value;
      });

      const f = quantity / 100;
      setMeals((prev) => [...prev, {
        type: mealType, name: food.description, quantity,
        calories: +(calories * f).toFixed(2),
        protein:  +(protein  * f).toFixed(2),
        carbs:    +(carbs    * f).toFixed(2),
        fat:      +(fat      * f).toFixed(2),
      }]);
      setQuery("");
      setQuantity(100);
    } catch (err) {
      console.error(err);
      alert("Error fetching food");
    }
  };

  // ── Todays Plan & Totals ─────────────────────────────────────────────────
  const tzoffset = (new Date()).getTimezoneOffset() * 60000;
  const todayDateStr = new Date(Date.now() - tzoffset).toISOString().split('T')[0];
  const todaysPlan = savedPlans.find((p) => p.date === todayDateStr) || {
    meals: [], totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0
  };

  const draftTotalCalories = meals.reduce((s, m) => s + m.calories, 0);
  const draftTotalProtein  = meals.reduce((s, m) => s + m.protein,  0);
  const draftTotalFat      = meals.reduce((s, m) => s + m.fat,      0);
  const draftTotalCarbs    = meals.reduce((s, m) => s + m.carbs,    0);

  const todaysMealTotals = ["breakfast","lunch","dinner","snack"].reduce((acc, type) => {
    const sub = todaysPlan.meals.filter((m) => m.type === type);
    acc[type] = {
      calories: sub.reduce((s, m) => s + m.calories, 0),
      protein:  sub.reduce((s, m) => s + m.protein,  0),
      carbs:    sub.reduce((s, m) => s + m.carbs,    0),
      fat:      sub.reduce((s, m) => s + m.fat,      0),
    };
    return acc;
  }, {});

  // ── Save plan ────────────────────────────────────────────────────────────
  const saveDietPlan = async () => {
    if (!user)         return alert("Login required");
    if (!date)         return alert("Select date first");
    if (!meals.length) return alert("Add at least one meal");
    try {
      const ref = doc(db, "users", user.uid, "dietPlans", date);
      const existingSnap = await getDoc(ref);
      let existingMeals = [];
      if (existingSnap.exists()) {
        existingMeals = existingSnap.data().meals || [];
      }
      
      const updatedMeals = [...existingMeals, ...meals];
      const newTotalCalories = updatedMeals.reduce((s, m) => s + m.calories, 0);
      const newTotalProtein  = updatedMeals.reduce((s, m) => s + m.protein, 0);
      const newTotalFat      = updatedMeals.reduce((s, m) => s + m.fat, 0);
      const newTotalCarbs    = updatedMeals.reduce((s, m) => s + m.carbs, 0);

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
      setDate("");
      fetchPlans(user.uid);
    } catch (err) {
      console.error(err);
      alert("Error saving");
    }
  };

  // ── Chart configs ────────────────────────────────────────────────────────
  const proteinCal    = todaysPlan.totalProtein * 4;
  const carbsCal      = todaysPlan.totalCarbs   * 4;
  const fatCal        = todaysPlan.totalFat     * 9;
  const totalMacroCal = proteinCal + carbsCal + fatCal || 1;

  const macroChartData = {
    labels: ["Protein","Carbs","Fat"],
    datasets: [{
      data: [
        Math.round((proteinCal / totalMacroCal) * 100),
        Math.round((carbsCal   / totalMacroCal) * 100),
        Math.round((fatCal     / totalMacroCal) * 100),
      ],
      backgroundColor: ["#378ADD","#EF9F27","#D85A30"],
      borderWidth: 0, hoverOffset: 8,
    }],
  };

  const mealCalChartData = {
    labels: ["Breakfast","Lunch","Dinner","Snack"],
    datasets: [{
      data: ["breakfast","lunch","dinner","snack"].map((t) => Math.round(todaysMealTotals[t].calories)),
      backgroundColor: ["#9FE1CB","#378ADD","#7F77DD","#EF9F27"],
      borderWidth: 0, borderRadius: 8,
    }],
  };

  const stackedChartData = {
    labels: ["Breakfast","Lunch","Dinner","Snack"],
    datasets: [
      { label:"Protein", data:["breakfast","lunch","dinner","snack"].map((t)=>Math.round(todaysMealTotals[t].protein)), backgroundColor:"#378ADD", borderWidth:0, borderRadius:4 },
      { label:"Carbs",   data:["breakfast","lunch","dinner","snack"].map((t)=>Math.round(todaysMealTotals[t].carbs)),   backgroundColor:"#EF9F27", borderWidth:0 },
      { label:"Fat",     data:["breakfast","lunch","dinner","snack"].map((t)=>Math.round(todaysMealTotals[t].fat)),     backgroundColor:"#D85A30", borderWidth:0 },
    ],
  };

  const weeklyData = (() => {
    const sorted = [...savedPlans].sort((a,b) => new Date(a.date)-new Date(b.date)).slice(-7);
    return {
      labels: sorted.length ? sorted.map((p) => p.date.slice(5)) : ["—"],
      datasets: [
        {
          label:"Calories",
          data: sorted.length ? sorted.map((p) => Math.round(p.totalCalories)) : [0],
          borderColor:"#1D9E75", backgroundColor:"rgba(29,158,117,0.07)",
          fill:true, tension:0.4, borderWidth:2, pointRadius:4,
        },
        {
          label:"Goal",
          data: Array(sorted.length || 1).fill(GOALS.calories),
          borderColor:"#ccc", borderDash:[5,4], borderWidth:1.5, pointRadius:0, fill:false,
        },
      ],
    };
  })();

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };

  const today      = new Date().toLocaleDateString("en-IN",{ weekday:"long", year:"numeric", month:"short", day:"numeric" });
  const card       = { background:"#fff", border:"0.5px solid rgba(0,0,0,0.08)", borderRadius:14, padding:"1.1rem 1.25rem", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" };
  const inputStyle = { border:"0.5px solid rgba(0,0,0,0.12)", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#1a1a1a", background:"#fafafa", outline:"none", width:"100%" };
  const tabStyle   = (t) => ({
    padding:"8px 20px", borderRadius:8, border:"none", cursor:"pointer",
    fontSize:13, fontWeight:500,
    background: activeTab===t ? "#1D9E75" : "transparent",
    color:      activeTab===t ? "#fff"    : "#888",
    transition:"all 0.2s",
  });

  // ── JSX ──────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div style={{ minHeight:"100vh", background:"#f5f5f0", fontFamily:"'DM Sans',sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>

        {/* ── TOPBAR ─────────────────────────────────────────────────────── */}
        <div style={{
          background:"#fff", borderBottom:"0.5px solid rgba(0,0,0,0.08)",
          padding:"14px 24px", display:"flex", alignItems:"center",
          justifyContent:"space-between", gap:16,
          position:"sticky", top:0, zIndex:50,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:46, height:46, borderRadius:"50%", background:"#1D9E75", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:"#E1F5EE", flexShrink:0 }}>
              {getInitials(name)}
            </div>
            <div>
              <p style={{ fontSize:15, fontWeight:600, color:"#1a1a1a", lineHeight:1.2 }}>{name}</p>
              <span style={{ fontSize:12, color:"#aaa" }}>{email}</span>
            </div>
          </div>

          <div style={{ display:"flex", gap:4, background:"#f5f5f0", borderRadius:10, padding:4 }}>
            {["dashboard","planner","history"].map((t) => (
              <button key={t} style={tabStyle(t)} onClick={() => setActiveTab(t)}>
                {t.charAt(0).toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>

          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ fontSize:12, color:"#888", background:"#f5f5f0", border:"0.5px solid rgba(0,0,0,0.08)", borderRadius:8, padding:"6px 12px" }}>{today}</span>
            <span style={{ fontSize:12, fontWeight:500, background:"#E1F5EE", color:"#0F6E56", borderRadius:8, padding:"6px 12px" }}>Goal: {GOALS.calories} kcal</span>
          </div>
        </div>

        <div style={{ maxWidth:980, margin:"0 auto", padding:"24px 16px" }}>

          {/* ══════════════════════════════════════════════════════════════
              DASHBOARD
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === "dashboard" && (
            <div>

              {/* ── PROFILE + HEALTH STATS CARD ─────────────────────────── */}
              <p style={{ fontSize:11, letterSpacing:"0.08em", textTransform:"uppercase", color:"#aaa", marginBottom:12 }}>profile & health stats</p>
              <div style={{ ...card, marginBottom:20 }}>
                <div style={{ display:"grid", gridTemplateColumns:"200px 1fr", gap:28, alignItems:"start" }}>

                  {/* Avatar + basic info */}
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
                    <div style={{ width:80, height:80, borderRadius:"50%", background:"#1D9E75", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, fontWeight:700, color:"#E1F5EE" }}>
                      {getInitials(name)}
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <p style={{ fontSize:16, fontWeight:700, color:"#1a1a1a" }}>{name}</p>
                      <p style={{ fontSize:12, color:"#aaa", marginTop:2 }}>{email}</p>
                      {profile?.gender && (
                        <span style={{
                          display:"inline-block", marginTop:6, fontSize:11, fontWeight:500,
                          background: gender==="female" ? "rgba(212,83,126,0.12)" : "rgba(55,138,221,0.12)",
                          color:       gender==="female" ? "#993556"                : "#185FA5",
                          borderRadius:20, padding:"3px 12px", textTransform:"capitalize",
                        }}>{profile.gender}</span>
                      )}
                    </div>
                    {/* Quick bio stats */}
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, width:"100%" }}>
                      {[
                        { label:"Age",    value: age    ? `${age} yr`    : "—" },
                        { label:"Height", value: height ? `${height} cm` : "—" },
                        { label:"Weight", value: weight ? `${weight} kg` : "—" },
                        { label:"Ideal",  value: idealWeight ? `${idealWeight} kg` : "—" },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ background:"#f5f5f0", borderRadius:8, padding:"8px 10px", textAlign:"center" }}>
                          <p style={{ fontSize:10, color:"#aaa" }}>{label}</p>
                          <p style={{ fontSize:13, fontWeight:600, color:"#1a1a1a" }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Health calculations */}
                  <div>
                    {/* BMI · BMR · TDEE row */}
                    <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:10, marginBottom:14 }}>

                      {/* BMI card */}
                      <div style={{ background:"#f5f5f0", borderRadius:12, padding:"16px 18px" }}>
                        <p style={{ fontSize:11, color:"#aaa", marginBottom:4 }}>Body Mass Index (BMI)</p>
                        <div style={{ display:"flex", alignItems:"baseline", gap:10 }}>
                          <p style={{ fontSize:32, fontWeight:700, color:bmiCat.color }}>{bmi ? bmi.toFixed(1) : "—"}</p>
                          <span style={{ fontSize:12, fontWeight:500, color:"#fff", background:bmiCat.color, borderRadius:20, padding:"2px 12px" }}>{bmiCat.label}</span>
                        </div>
                        <BMIGauge bmi={bmi} />
                        <p style={{ fontSize:10, color:"#bbb", marginTop:6 }}>Normal: 18.5 – 24.9 · kg/m²</p>
                      </div>

                      {/* BMR */}
                      <div style={{ background:"#f5f5f0", borderRadius:12, padding:"16px 18px" }}>
                        <p style={{ fontSize:11, color:"#aaa", marginBottom:6 }}>BMR</p>
                        <p style={{ fontSize:26, fontWeight:700, color:"#1D9E75" }}>{bmr ? Math.round(bmr) : "—"}</p>
                        <p style={{ fontSize:10, color:"#bbb", marginTop:4 }}>kcal/day at rest</p>
                        <p style={{ fontSize:10, color:"#bbb", marginTop:2 }}>Mifflin-St Jeor</p>
                      </div>

                      {/* TDEE */}
                      <div style={{ background:"#f5f5f0", borderRadius:12, padding:"16px 18px" }}>
                        <p style={{ fontSize:11, color:"#aaa", marginBottom:6 }}>TDEE</p>
                        <p style={{ fontSize:26, fontWeight:700, color:"#378ADD" }}>{tdee ? Math.round(tdee) : "—"}</p>
                        <p style={{ fontSize:10, color:"#bbb", marginTop:4 }}>kcal/day active</p>
                        <p style={{ fontSize:10, color:"#bbb", marginTop:2 }}>Moderate activity</p>
                      </div>
                    </div>

                    {/* Macro targets from TDEE */}
                    <div style={{ background:"#f5f5f0", borderRadius:12, padding:"14px 16px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                        <p style={{ fontSize:12, fontWeight:600, color:"#1a1a1a" }}>Your daily macro targets</p>
                        <p style={{ fontSize:11, color:"#aaa" }}>calculated from TDEE · 30% P · 45% C · 25% F</p>
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
                        {[
                          { label:"Calories", value:`${GOALS.calories}`, unit:"kcal", color:"#1D9E75" },
                          { label:"Protein",  value:`${GOALS.protein}`,  unit:"g",    color:"#378ADD" },
                          { label:"Carbs",    value:`${GOALS.carbs}`,    unit:"g",    color:"#EF9F27" },
                          { label:"Fat",      value:`${GOALS.fat}`,      unit:"g",    color:"#D85A30" },
                        ].map(({ label, value, unit, color }) => (
                          <div key={label} style={{ background:"#fff", borderRadius:10, padding:"10px 14px", textAlign:"center", border:`1.5px solid ${color}25` }}>
                            <p style={{ fontSize:10, color:"#aaa", marginBottom:4 }}>{label}</p>
                            <p style={{ fontSize:20, fontWeight:700, color }}>{value}</p>
                            <p style={{ fontSize:10, color:"#bbb" }}>{unit}</p>
                          </div>
                        ))}
                      </div>

                      {/* Weight advice */}
                      {weight > 0 && idealWeight && (
                        <div style={{ marginTop:10, padding:"10px 14px", borderRadius:8, background:"#fff", border:"0.5px solid rgba(0,0,0,0.06)" }}>
                          {(() => {
                            const diff = +(weight - idealWeight).toFixed(1);
                            if (diff > 1)   return <p style={{ fontSize:12, color:"#666" }}>You are <strong>{diff} kg</strong> above your ideal weight ({idealWeight} kg). A mild deficit of ~500 kcal/day would help reach your goal in roughly {Math.ceil(diff * 7000 / 500 / 7)} weeks.</p>;
                            if (diff < -1)  return <p style={{ fontSize:12, color:"#666" }}>You are <strong>{Math.abs(diff)} kg</strong> below your ideal weight ({idealWeight} kg). A slight surplus of ~300 kcal/day is recommended.</p>;
                            return <p style={{ fontSize:12, color:"#1D9E75" }}>You are at your ideal body weight ({idealWeight} kg). Keep it up!</p>;
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── TODAY METRIC CARDS ──────────────────────────────────── */}
              <p style={{ fontSize:11, letterSpacing:"0.08em", textTransform:"uppercase", color:"#aaa", marginBottom:12 }}>today at a glance</p>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:20 }}>
                <MetricCard label="Calories" value={todaysPlan.totalCalories} goal={GOALS.calories} unit="kcal" color="#1D9E75" />
                <MetricCard label="Protein"  value={todaysPlan.totalProtein}  goal={GOALS.protein}  unit="g"    color="#378ADD" />
                <MetricCard label="Carbs"    value={todaysPlan.totalCarbs}    goal={GOALS.carbs}    unit="g"    color="#EF9F27" />
                <MetricCard label="Fat"      value={todaysPlan.totalFat}      goal={GOALS.fat}      unit="g"    color="#D85A30" />
              </div>

              {/* ── MEAL TYPE TILES ─────────────────────────────────────── */}
              <p style={{ fontSize:11, letterSpacing:"0.08em", textTransform:"uppercase", color:"#aaa", marginBottom:12 }}>meal breakdown</p>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:20 }}>
                {["breakfast","lunch","dinner","snack"].map((type) => {
                  const meta = MEAL_META[type];
                  const t    = todaysMealTotals[type];
                  return (
                    <div key={type} style={card}>
                      <div style={{ fontSize:20, marginBottom:6 }}>{meta.icon}</div>
                      <p style={{ fontSize:11, color:"#aaa", textTransform:"capitalize", marginBottom:4 }}>{type}</p>
                      <p style={{ fontSize:22, fontWeight:600, color:"#1a1a1a" }}>{Math.round(t.calories)} kcal</p>
                      <p style={{ fontSize:10, color:"#bbb", marginTop:3 }}>P {t.protein.toFixed(0)}g · C {t.carbs.toFixed(0)}g · F {t.fat.toFixed(0)}g</p>
                      <div style={{ height:3, borderRadius:2, background:meta.color, marginTop:10, opacity:0.7 }} />
                    </div>
                  );
                })}
              </div>

              {/* ── CHARTS ROW 1 ────────────────────────────────────────── */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                <div style={card}>
                  <p style={{ fontSize:13, fontWeight:600, color:"#1a1a1a", marginBottom:4 }}>Macro distribution</p>
                  <p style={{ fontSize:11, color:"#aaa", marginBottom:10 }}>% of calories from each macro</p>
                  <div style={{ display:"flex", gap:10, marginBottom:12 }}>
                    {[["Protein","#378ADD"],["Carbs","#EF9F27"],["Fat","#D85A30"]].map(([l,c])=>(
                      <span key={l} style={{ display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#888" }}>
                        <span style={{ width:9,height:9,borderRadius:2,background:c,display:"inline-block" }}/>{l}
                      </span>
                    ))}
                  </div>
                  <div style={{ position:"relative", height:200 }}>
                    <Doughnut data={macroChartData} options={{ ...chartOpts, cutout:"70%" }} />
                  </div>
                </div>

                <div style={card}>
                  <p style={{ fontSize:13, fontWeight:600, color:"#1a1a1a", marginBottom:4 }}>Calories by meal</p>
                  <p style={{ fontSize:11, color:"#aaa", marginBottom:10 }}>kcal per eating window</p>
                  <div style={{ display:"flex", gap:10, marginBottom:12 }}>
                    {[["Breakfast","#9FE1CB"],["Lunch","#378ADD"],["Dinner","#7F77DD"],["Snack","#EF9F27"]].map(([l,c])=>(
                      <span key={l} style={{ display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#888" }}>
                        <span style={{ width:9,height:9,borderRadius:2,background:c,display:"inline-block" }}/>{l}
                      </span>
                    ))}
                  </div>
                  <div style={{ position:"relative", height:200 }}>
                    <Bar data={mealCalChartData} options={{ ...chartOpts, scales:{ x:{grid:{display:false}}, y:{grid:{color:"rgba(0,0,0,0.05)"}} } }} />
                  </div>
                </div>
              </div>

              {/* ── CHARTS ROW 2 ────────────────────────────────────────── */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
                <div style={card}>
                  <p style={{ fontSize:13, fontWeight:600, color:"#1a1a1a", marginBottom:4 }}>Weekly calories</p>
                  <p style={{ fontSize:11, color:"#aaa", marginBottom:14 }}>saved plans vs {GOALS.calories} kcal goal</p>
                  <div style={{ position:"relative", height:180 }}>
                    <Line data={weeklyData} options={{ ...chartOpts, scales:{ x:{grid:{display:false}}, y:{grid:{color:"rgba(0,0,0,0.05)"}} } }} />
                  </div>
                </div>

                <div style={card}>
                  <p style={{ fontSize:13, fontWeight:600, color:"#1a1a1a", marginBottom:4 }}>Macro balance per meal</p>
                  <p style={{ fontSize:11, color:"#aaa", marginBottom:10 }}>protein · carbs · fat stacked</p>
                  <div style={{ display:"flex", gap:10, marginBottom:10 }}>
                    {[["Protein","#378ADD"],["Carbs","#EF9F27"],["Fat","#D85A30"]].map(([l,c])=>(
                      <span key={l} style={{ display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#888" }}>
                        <span style={{ width:9,height:9,borderRadius:2,background:c,display:"inline-block" }}/>{l}
                      </span>
                    ))}
                  </div>
                  <div style={{ position:"relative", height:180 }}>
                    <Bar data={stackedChartData} options={{ ...chartOpts, scales:{ x:{stacked:true,grid:{display:false}}, y:{stacked:true,grid:{color:"rgba(0,0,0,0.05)"}} } }} />
                  </div>
                </div>
              </div>

              {/* ── FOOD LOG + SIDEBAR ──────────────────────────────────── */}
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:12 }}>
                <div style={card}>
                  <p style={{ fontSize:13, fontWeight:600, color:"#1a1a1a", marginBottom:12 }}>Today's food log</p>
                  {todaysPlan.meals.length === 0 ? (
                    <p style={{ fontSize:12, color:"#ccc", textAlign:"center", padding:"2rem 0" }}>No meals logged yet — switch to the Planner tab</p>
                  ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {todaysPlan.meals.map((m, i) => {
                        const meta = MEAL_META[m.type] || MEAL_META.snack;
                        return (
                          <div key={i} style={{ display:"flex", alignItems:"center", gap:12, background:"#fafafa", borderRadius:10, padding:"10px 14px", border:"0.5px solid rgba(0,0,0,0.06)" }}>
                            <div style={{ width:32, height:32, borderRadius:"50%", background:meta.bg, border:`0.5px solid ${meta.color}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>{meta.icon}</div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <p style={{ fontSize:13, fontWeight:500, color:"#1a1a1a", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{m.name}</p>
                              <p style={{ fontSize:11, color:"#aaa" }}>{m.type} · {m.quantity}g · P {m.protein.toFixed(0)}g · C {m.carbs.toFixed(0)}g · F {m.fat.toFixed(0)}g</p>
                            </div>
                            <p style={{ fontSize:13, fontWeight:500, color:"#1a1a1a" }}>{Math.round(m.calories)} kcal</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  <div style={card}>
                    <p style={{ fontSize:13, fontWeight:600, color:"#1a1a1a", marginBottom:14 }}>Macro goals</p>
                    {[
                      { label:"Protein", value:todaysPlan.totalProtein, goal:GOALS.protein, color:"#378ADD", unit:"g" },
                      { label:"Carbs",   value:todaysPlan.totalCarbs,   goal:GOALS.carbs,   color:"#EF9F27", unit:"g" },
                      { label:"Fat",     value:todaysPlan.totalFat,     goal:GOALS.fat,     color:"#D85A30", unit:"g" },
                    ].map(({ label, value, goal, color, unit }) => (
                      <div key={label} style={{ marginBottom:14 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#888", marginBottom:5 }}>
                          <span>{label}</span><span>{value.toFixed(0)} / {goal}{unit}</span>
                        </div>
                        <div style={{ height:8, borderRadius:4, background:"rgba(0,0,0,0.06)", overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${Math.min(100,(value/goal)*100)}%`, background:color, borderRadius:4 }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={card}><WaterTracker /></div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              PLANNER
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === "planner" && (
            <div style={{ maxWidth:720, margin:"0 auto" }}>
              <div style={{ ...card, borderRadius:16, padding:"1.5rem", marginBottom:20 }}>
                <p style={{ fontSize:18, fontWeight:600, color:"#1a1a1a", marginBottom:20, textAlign:"center" }}>Diet Planner 🍽️</p>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 2fr 1fr", gap:10, marginBottom:12 }}>
                  <input type="date" style={inputStyle} value={date} onChange={(e)=>setDate(e.target.value)} />
                  <select style={inputStyle} value={mealType} onChange={(e)=>setMealType(e.target.value)}>
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                  <input type="text" placeholder="Search food (e.g. Rice, Egg)..." style={inputStyle} value={query}
                    onChange={(e)=>setQuery(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&fetchFoodData()} />
                  <input type="number" placeholder="Qty (g)" style={inputStyle} value={quantity} onChange={(e)=>setQuantity(Number(e.target.value))} />
                </div>

                <button onClick={fetchFoodData} style={{ width:"100%", background:"#1D9E75", color:"#fff", border:"none", borderRadius:10, padding:"11px 0", fontSize:14, fontWeight:500, cursor:"pointer", marginBottom:20 }}>
                  + Add Meal
                </button>

                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {meals.map((m, i) => {
                    const meta = MEAL_META[m.type];
                    return (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:12, background:"#fafafa", borderRadius:10, padding:"12px 14px", border:"0.5px solid rgba(0,0,0,0.07)" }}>
                        <div style={{ width:36, height:36, borderRadius:"50%", background:meta.bg, border:`0.5px solid ${meta.color}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{meta.icon}</div>
                        <div style={{ flex:1 }}>
                          <p style={{ fontSize:13, fontWeight:500, color:"#1a1a1a" }}><span style={{ textTransform:"capitalize" }}>{m.type}</span> — {m.name} ({m.quantity}g)</p>
                          <p style={{ fontSize:11, color:"#aaa" }}>{Math.round(m.calories)} kcal · P {m.protein.toFixed(1)}g · Fat {m.fat.toFixed(1)}g · Carbs {m.carbs.toFixed(1)}g</p>
                        </div>
                        <button onClick={()=>setMeals(meals.filter((_,idx)=>idx!==i))} style={{ background:"rgba(216,90,48,0.1)", border:"none", color:"#D85A30", borderRadius:8, width:30, height:30, cursor:"pointer", fontSize:14 }}>✕</button>
                      </div>
                    );
                  })}
                </div>

                {meals.length > 0 && (
                  <div style={{ marginTop:20, padding:"14px 18px", background:"#f5f5f0", borderRadius:12 }}>
                    <p style={{ fontSize:13, fontWeight:600, color:"#1a1a1a", marginBottom:10 }}>Total Nutrition</p>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
                      {[
                        { label:"Calories", value:`${draftTotalCalories.toFixed(0)} kcal`, color:"#1D9E75" },
                        { label:"Protein",  value:`${draftTotalProtein.toFixed(1)} g`,     color:"#378ADD" },
                        { label:"Fat",      value:`${draftTotalFat.toFixed(1)} g`,         color:"#D85A30" },
                        { label:"Carbs",    value:`${draftTotalCarbs.toFixed(1)} g`,       color:"#EF9F27" },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ textAlign:"center" }}>
                          <p style={{ fontSize:11, color:"#aaa" }}>{label}</p>
                          <p style={{ fontSize:15, fontWeight:600, color }}>{value}</p>
                        </div>
                      ))}
                    </div>
                    {/* Remaining vs goal */}
                    <div style={{ marginTop:12, borderTop:"0.5px solid rgba(0,0,0,0.06)", paddingTop:10 }}>
                      <p style={{ fontSize:11, color:"#aaa", marginBottom:6 }}>remaining today (including logged)</p>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6 }}>
                        {[
                          { label:"Calories", left: GOALS.calories - todaysPlan.totalCalories - draftTotalCalories, unit:"kcal", color:"#1D9E75" },
                          { label:"Protein",  left: GOALS.protein  - todaysPlan.totalProtein  - draftTotalProtein,  unit:"g",    color:"#378ADD" },
                          { label:"Carbs",    left: GOALS.carbs    - todaysPlan.totalCarbs    - draftTotalCarbs,    unit:"g",    color:"#EF9F27" },
                          { label:"Fat",      left: GOALS.fat      - todaysPlan.totalFat      - draftTotalFat,      unit:"g",    color:"#D85A30" },
                        ].map(({ label, left, unit, color }) => (
                          <div key={label} style={{ textAlign:"center" }}>
                            <p style={{ fontSize:10, color:"#aaa" }}>{label} left</p>
                            <p style={{ fontSize:13, fontWeight:600, color: left < 0 ? "#D85A30" : color }}>
                              {left < 0 ? "+" : ""}{Math.abs(left).toFixed(0)}{unit}
                              {left < 0 && <span style={{ fontSize:9, marginLeft:2 }}>over</span>}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <button onClick={saveDietPlan} style={{
                  marginTop:16, width:"100%",
                  background: meals.length > 0 ? "#0F6E56" : "#ccc",
                  color:"#fff", border:"none", borderRadius:10,
                  padding:"11px 0", fontSize:14, fontWeight:500,
                  cursor: meals.length > 0 ? "pointer" : "not-allowed",
                }}>
                  💾 Save Diet Plan
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              HISTORY
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === "history" && (
            <div>
              <p style={{ fontSize:11, letterSpacing:"0.08em", textTransform:"uppercase", color:"#aaa", marginBottom:12 }}>saved diet plans</p>
              {savedPlans.length === 0 ? (
                <div style={{ textAlign:"center", padding:"4rem 0", color:"#ccc" }}>
                  <p style={{ fontSize:32, marginBottom:10 }}>📋</p>
                  <p style={{ fontSize:14 }}>No saved plans yet. Add meals in the Planner tab.</p>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  {[...savedPlans].sort((a,b)=>new Date(b.date)-new Date(a.date)).map((plan, i) => (
                    <div key={i} style={card}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                        <p style={{ fontSize:15, fontWeight:600, color:"#1a1a1a" }}>📅 {plan.date}</p>
                        <div style={{ textAlign:"right" }}>
                          <span style={{ fontSize:14, fontWeight:700, color:"#1D9E75" }}>{Math.round(plan.totalCalories)} kcal</span>
                          <p style={{ fontSize:10, color:"#aaa" }}>{GOALS.calories > 0 ? `${Math.round((plan.totalCalories/GOALS.calories)*100)}% of goal` : ""}</p>
                        </div>
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, marginBottom:12 }}>
                        {[
                          { label:"Protein", value:plan.totalProtein, color:"#378ADD" },
                          { label:"Carbs",   value:plan.totalCarbs,   color:"#EF9F27" },
                          { label:"Fat",     value:plan.totalFat,     color:"#D85A30" },
                        ].map(({ label, value, color }) => (
                          <div key={label} style={{ background:"#fafafa", borderRadius:8, padding:"8px 10px" }}>
                            <p style={{ fontSize:10, color:"#aaa" }}>{label}</p>
                            <p style={{ fontSize:14, fontWeight:600, color }}>{(value||0).toFixed(0)}g</p>
                          </div>
                        ))}
                      </div>
                      <div style={{ borderTop:"0.5px solid rgba(0,0,0,0.06)", paddingTop:10, display:"flex", flexDirection:"column", gap:4 }}>
                        {plan.meals?.map((m, j) => {
                          const meta = MEAL_META[m.type] || MEAL_META.snack;
                          return (
                            <div key={j} style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <span style={{ fontSize:13 }}>{meta.icon}</span>
                              <span style={{ fontSize:12, color:"#888" }}><span style={{ textTransform:"capitalize" }}>{m.type}</span> — {m.name} ({m.quantity}g)</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}
