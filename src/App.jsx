import React, { useState, useEffect } from 'react';
import {
  Activity,
  PlusCircle,
  History,
  Flame,
  Utensils,
  Send,
  CheckCircle2,
  AlertCircle,
  Settings,
  Trash2,
  Database,
  ShieldAlert,
  ChevronRight,
  Zap,
  Coffee,
  Info
} from 'lucide-react';
import { supabase } from './lib/supabase';

// --- CONFIGURATION ---
const todayString = new Date().toISOString().split('T')[0];

const TARGET_CALORIES = 3000;
const PROTEIN_TARGET = 150;
const CARBS_TARGET = 350;

const FOOD_DB = [
  { keywords: ['chicken', 'breast'], name: 'Chicken Breast (100g)', calories: 165, protein: 31, carbs: 0, fats: 3.6, unit: 'g' },
  { keywords: ['rice', 'white'], name: 'White Rice (1 cup)', calories: 205, protein: 4, carbs: 45, fats: 0.4, unit: 'cup' },
  { keywords: ['egg', 'eggs'], name: 'Egg', calories: 72, protein: 6, carbs: 0.4, fats: 4.8, unit: 'qty' },
  { keywords: ['almonds', 'ALMONDS'], name: 'ALMONDS 10 ', calories: 70, protein: 5, carbs: 2.5, fats: 6, unit: 'cup' },
  { keywords: ['peanut butter', 'pb'], name: 'Peanut Butter (2 tbsp)', calories: 190, protein: 7, carbs: 8, fats: 16, unit: 'qty' },
  { keywords: ['steak', 'beef'], name: 'Steak (100g)', calories: 271, protein: 26, carbs: 0, fats: 19, unit: 'g' },
  { keywords: ['milk', 'whole'], name: 'Whole Milk (1 cup)', calories: 149, protein: 8, carbs: 12, fats: 8, unit: 'cup' },
  { keywords: ['banana', 'bananas'], name: 'Banana (1 medium)', calories: 105, protein: 1.3, carbs: 27, fats: 0.3, unit: 'qty' },
  { keywords: ['pasta', 'spaghetti'], name: 'Pasta (1 cup cooked)', calories: 220, protein: 8, carbs: 43, fats: 1.3, unit: 'cup' },
  { keywords: ['shake', 'whey'], name: 'Protein Shake (2 scoop)', calories: 400, protein: 42, carbs: 60, fats: 2.5, unit: 'qty' },
];

function App() {
  // --- STATE MANAGEMENT ---
  const [meals, setMeals] = useState([]);
  const [customFoods, setCustomFoods] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'add', 'history', 'admin'
  const [inputText, setInputText] = useState('');
  const [parsedItems, setParsedItems] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);

  const [newFood, setNewFood] = useState({ name: '', calories: '', protein: '', carbs: '', fats: '' });

  // Quick Select State
  const [quickQuantities, setQuickQuantities] = useState({});

  // Initialize quickQuantities and sync when FOOD_DB or customFoods change
  useEffect(() => {
    setQuickQuantities(prev => {
      const next = { ...prev };
      const combined = [...FOOD_DB, ...customFoods];

      // Add new items
      combined.forEach(f => {
        if (next[f.name] === undefined) next[f.name] = 0;
      });

      // Remove deleted items
      const combinedNames = combined.map(f => f.name);
      Object.keys(next).forEach(key => {
        if (!combinedNames.includes(key)) delete next[key];
      });

      return next;
    });
  }, [customFoods]);

  const updateQuickQty = (name, delta) => {
    setQuickQuantities(prev => ({
      ...prev,
      [name]: Math.max(0, (prev[name] || 0) + delta)
    }));
  };

  // --- EFFECTS ---
  // --- CLOUD SYNC (SUPABASE) ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Foods
        const { data: foodsData, error: foodsError } = await supabase
          .from('foods')
          .select('*')
          .order('name', { ascending: true });

        if (foodsError) console.error("PGRST Error (foods):", foodsError);
        else setCustomFoods(foodsData || []);

        // Fetch Meals
        const { data: mealsData, error: mealsError } = await supabase
          .from('meals')
          .select('*')
          .order('id', { ascending: false });

        if (mealsError) console.error("PGRST Error (meals):", mealsError);
        else setMeals(mealsData || []);
      } catch (err) {
        console.error("Unexpected fetch error:", err);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (inputText.trim().length > 1) {
      setParsedItems(calculateFromText(inputText));
    }
  }, [customFoods, inputText]);

  // --- SMART ENGINE ---
  const calculateFromText = (text) => {
    const lowerText = text.toLowerCase();
    let found = [];
    let processedText = lowerText;

    // Helper to find and extract matches
    const searchInDB = (db, isCustom = false) => {
      db.forEach(food => {
        const keywords = isCustom
          ? [food.name.toLowerCase(), ...food.name.toLowerCase().split(' ').filter(w => w.length > 2)]
          : food.keywords;

        const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);

        sortedKeywords.forEach(kw => {
          // Regex to detect: 3 eggs, 2x chicken, 500g rice, 1.5 cup oats
          const regex = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(x|g|ml|cup|cups|scoop|scoops|tbsp)?\\s*${kw}`, 'i');
          const match = processedText.match(regex);

          if (match) {
            let qty = parseFloat(match[1]);
            const unitSuffix = match[2]?.toLowerCase();

            if (unitSuffix === 'g' && food.name.toLowerCase().includes('(100g)')) {
              qty = qty / 100;
            } else if (unitSuffix === 'g' && !food.name.toLowerCase().includes('(100g)')) {
              qty = qty / 100;
            }

            if (!found.some(item => item.name === food.name)) {
              found.push({
                ...food,
                quantity: qty,
                calcCals: food.calories * qty,
                calcP: food.protein * qty,
                calcC: food.carbs * qty,
                calcF: food.fats * qty
              });
              processedText = processedText.replace(match[0], '');
            }
          } else if (processedText.includes(kw)) {
            if (!found.some(item => item.name === food.name)) {
              found.push({
                ...food,
                quantity: 1,
                calcCals: food.calories,
                calcP: food.protein,
                calcC: food.carbs,
                calcF: food.fats
              });
              processedText = processedText.replace(kw, '');
            }
          }
        });
      });
    };

    // 1. Search Custom DB First (Priority)
    searchInDB(customFoods, true);
    // 2. Fallback to Hardcoded DB
    searchInDB(FOOD_DB, false);

    return found;
  };

  const handleTextChange = (e) => {
    const text = e.target.value;
    setInputText(text);
    if (text.trim().length > 1) {
      setParsedItems(calculateFromText(text));
    } else {
      setParsedItems([]);
    }
  };

  const logMeal = async () => {
    // Combine parsed items from text and items from quick select
    const quickSelectItems = [...FOOD_DB, ...customFoods]
      .filter(f => quickQuantities[f.name] > 0)
      .map(f => ({
        ...f,
        quantity: quickQuantities[f.name],
        calcCals: f.calories * quickQuantities[f.name],
        calcP: f.protein * quickQuantities[f.name],
        calcC: f.carbs * quickQuantities[f.name],
        calcF: f.fats * quickQuantities[f.name]
      }));

    const finalItems = [...parsedItems, ...quickSelectItems];

    if (finalItems.length === 0) return;

    let totalCals = 0, totalP = 0, totalC = 0, totalF = 0;
    finalItems.forEach(item => {
      totalCals += item.calcCals;
      totalP += item.calcP;
      totalC += item.calcC;
      totalF += item.calcF;
    });

    const now = new Date();
    const todayISO = now.toISOString().split('T')[0];

    // Exact naming logic requested by user
    const summaryName = finalItems.length === 1 ? finalItems[0].name : "Mixed Meal";

    const mealToInsert = {
      food_name: summaryName,
      calories: Math.round(totalCals),
      protein: Math.round(totalP),
      carbs: Math.round(totalC),
      fats: Math.round(totalF),
      items: finalItems,
      raw_text: inputText || (quickSelectItems.length > 0 ? "Quick Selection" : ""),
      date: todayISO
    };

    try {
      const { data, error } = await supabase
        .from('meals')
        .insert([mealToInsert])
        .select();

      if (error) {
        console.error("PGRST Error (logMeal):", error);
        return;
      }

      setMeals([data[0], ...meals]);
      setInputText('');
      setParsedItems([]);

      // Reset quick quantities
      const reset = {};
      Object.keys(quickQuantities).forEach(k => reset[k] = 0);
      setQuickQuantities(reset);

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setCurrentView('dashboard');
      }, 1200);
    } catch (err) {
      console.error("Unexpected logMeal error:", err);
    }
  };

  const updateMealPortion = (id, delta) => {
    setMeals(meals.map(m => {
      if (m.id === id) {
        const newMultiplier = Math.max(0.5, (m.portionMultiplier || 1) + delta);
        const factor = newMultiplier / (m.portionMultiplier || 1);
        return {
          ...m,
          portionMultiplier: newMultiplier,
          calories: m.calories !== undefined ? Math.round(m.calories * factor) : undefined,
          protein: m.protein !== undefined ? Math.round(m.protein * factor) : undefined,
          carbs: m.carbs !== undefined ? Math.round(m.carbs * factor) : undefined,
          fats: m.fats !== undefined ? Math.round(m.fats * factor) : undefined,
          totals: m.totals ? {
            calories: Math.round(m.totals.calories * factor),
            protein: Math.round(m.totals.protein * factor),
            carbs: Math.round(m.totals.carbs * factor),
            fats: Math.round(m.totals.fats * factor),
          } : undefined
        };
      }
      return m;
    }));
  };

  const deleteMeal = async (id) => {
    try {
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("PGRST Error (deleteMeal):", error);
        return;
      }
      setMeals(meals.filter(m => m.id !== id));
    } catch (err) {
      console.error("Unexpected deleteMeal error:", err);
    }
  };

  // --- ADMIN FUNCTIONS ---
  const handleAddCustomFood = async (e) => {
    e.preventDefault();
    if (!newFood.name || !newFood.calories) return;

    const foodItem = {
      name: newFood.name.trim(),
      calories: Number(newFood.calories),
      protein: Number(newFood.protein) || 0,
      carbs: Number(newFood.carbs) || 0,
      fats: Number(newFood.fats) || 0,
    };

    try {
      const { data, error } = await supabase
        .from('foods')
        .insert([foodItem])
        .select();

      if (error) {
        console.error("PGRST Error (addFood):", error);
        return;
      }

      setCustomFoods([data[0], ...customFoods]);
      setNewFood({ name: '', calories: '', protein: '', carbs: '', fats: '' });
    } catch (err) {
      console.error("Unexpected addFood error:", err);
    }
  };

  const deleteCustomFood = async (id) => {
    try {
      const { error } = await supabase
        .from('foods')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("PGRST Error (deleteFood):", error);
        return;
      }
      setCustomFoods(customFoods.filter(f => f.id !== id));
    } catch (err) {
      console.error("Unexpected deleteFood error:", err);
    }
  };

  // --- DASHBOARD CALCULATIONS ---
  const todaysMeals = Array.isArray(meals) ? meals.filter(meal => {
    // Compare simple date strings (YYYY-MM-DD)
    const mealDate = meal.date || (meal.created_at ? meal.created_at.split('T')[0] : '');
    return mealDate === todayString;
  }) : [];

  const stats = {
    calories: todaysMeals.reduce((sum, m) => sum + Number(m.calories || 0), 0),
    protein: todaysMeals.reduce((sum, m) => sum + Number(m.protein || 0), 0),
    carbs: todaysMeals.reduce((sum, m) => sum + Number(m.carbs || 0), 0),
    fats: todaysMeals.reduce((sum, m) => sum + Number(m.fats || 0), 0),
  };

  const progress = Math.min((stats.calories / TARGET_CALORIES) * 100, 100);

  // --- ADVICE SYSTEM ---
  const getMassBuilderAdvice = () => {
    const hour = new Date().getHours();
    const adviceList = [];

    if (stats.protein < 100) {
      adviceList.push({
        text: "Eat some Steak or a Protein Shake to hit your muscle recovery goal.",
        icon: <Zap className="w-5 h-5 text-indigo-400" />
      });
    }

    if (stats.calories < 2000 && hour >= 18) {
      adviceList.push({
        text: "Energy dense snack needed—add 2 tablespoons of Peanut Butter.",
        icon: <Coffee className="w-5 h-5 text-amber-400" />
      });
    }

    if (stats.carbs < 200) {
      adviceList.push({
        text: "Add Oats or Rice to your next meal for training energy.",
        icon: <Flame className="w-5 h-5 text-emerald-400" />
      });
    }

    if (adviceList.length === 0) {
      adviceList.push({
        text: "You're on track! Keep hitting those macros for consistent gains.",
        icon: <CheckCircle2 className="w-5 h-5 text-indigo-400" />
      });
    }

    return adviceList[0];
  };

  const currentAdvice = getMassBuilderAdvice();

  // --- HISTORY GROUPING ---
  const groupedMeals = Array.isArray(meals) ? meals.reduce((acc, meal) => {
    const dateKey = meal.date || (meal.created_at ? meal.created_at.split('T')[0] : 'Unknown Date');

    if (!acc[dateKey]) {
      acc[dateKey] = {
        meals: [],
        totalCals: 0,
        metGoal: false
      };
    }
    acc[dateKey].meals.push(meal);
    const mealCals = Number(meal.calories || 0);
    acc[dateKey].totalCals += mealCals;
    acc[dateKey].metGoal = acc[dateKey].totalCals >= TARGET_CALORIES;
    return acc;
  }, {}) : {};

  const dateKeys = Object.keys(groupedMeals).sort((a, b) => new Date(b) - new Date(a));

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 font-sans pb-28 selection:bg-indigo-500/30">

      {/* Top App Bar */}
      <div className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50 p-4 sticky top-0 z-30 flex items-center justify-center shadow-lg">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.5)]">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tighter text-white">
            WOZAN <span className="text-indigo-500"></span>
          </h1>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            <p className="text-indigo-400 font-black text-xs uppercase tracking-[0.2em]">Syncing Cloud...</p>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="p-5 max-w-md mx-auto w-full">

        {/* VIEW: DASHBOARD */}
        {currentView === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Progress Circle/Card */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 border border-slate-800 shadow-2xl relative overflow-hidden text-center group">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-600/20 transition-colors duration-700"></div>

              <div className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase mb-4">Daily Surplus Status</div>

              <div className="relative inline-block mb-4">
                <div className="text-7xl font-black text-white tracking-tighter">
                  {stats.calories.toLocaleString()}
                </div>
                <div className="absolute -right-8 bottom-2 text-indigo-500 font-bold">kcal</div>
              </div>

              <div className="text-slate-400 font-bold mb-8">
                of <span className="text-white">{TARGET_CALORIES.toLocaleString()}</span> goal
              </div>

              <div className="h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800/50 shadow-inner p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-1000 ease-out relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Macros Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900 rounded-[2rem] p-4 border border-slate-800 text-center shadow-lg">
                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Protein</div>
                <div className="text-2xl font-black text-white">{stats.protein}g</div>
              </div>
              <div className="bg-slate-900 rounded-[2rem] p-4 border border-slate-800 text-center shadow-lg">
                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Carbs</div>
                <div className="text-2xl font-black text-white">{stats.carbs}g</div>
              </div>
              <div className="bg-slate-900 rounded-[2rem] p-4 border border-slate-800 text-center shadow-lg">
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">Fats</div>
                <div className="text-2xl font-black text-white">{stats.fats}g</div>
              </div>
            </div>

            {/* Mass Builder Advice Section */}
            <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-[2rem] p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-indigo-500/20 p-2 rounded-xl">
                  {currentAdvice.icon}
                </div>
                <h3 className="font-black text-xs uppercase tracking-widest text-indigo-300">Mass Builder Advice</h3>
              </div>
              <p className="text-sm font-medium text-slate-200 leading-relaxed">
                {currentAdvice.text}
              </p>
            </div>
          </div>
        )}

        {/* VIEW: ADD MEAL */}
        {currentView === 'add' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* Text Entry Section */}
            <div className="relative">
              <h2 className="text-3xl font-black text-white mb-1">Log Meal</h2>
              <p className="text-slate-400 font-medium mb-6">Type naturally or use the Quick Add below</p>

              <div className="relative group">
                <textarea
                  value={inputText}
                  onChange={handleTextChange}
                  placeholder="e.g. 500g rice and 2x chicken"
                  className="w-full h-32 bg-slate-900 border-2 border-slate-800 rounded-[2rem] p-6 text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 transition-all shadow-2xl resize-none text-xl font-medium"
                />
                <div className="absolute right-6 bottom-6">
                  <div className={`p-3 rounded-2xl ${inputText.length > 1 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-600'} transition-all shadow-lg`}>
                    <Utensils className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Add Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Quick Add</h3>
                <button
                  onClick={() => {
                    const reset = {};
                    Object.keys(quickQuantities).forEach(k => reset[k] = 0);
                    setQuickQuantities(reset);
                  }}
                  className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-colors"
                >
                  Reset All
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[...FOOD_DB, ...customFoods].map((food) => (
                  <div key={food.name} className="bg-slate-900 rounded-[2rem] p-5 border border-slate-800/50 shadow-xl flex flex-col items-center gap-4 group transition-all hover:border-indigo-500/30 relative">
                    <div className="text-center w-full">
                      <div className="text-sm font-black text-white leading-tight mb-1 truncate px-1">{food.name.split(' (')[0]}</div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{food.calories} kcal</div>
                    </div>

                    <div className="flex items-center justify-between w-full bg-slate-950 p-1.5 rounded-full border border-slate-800">
                      <button
                        onClick={() => updateQuickQty(food.name, -1)}
                        className="w-11 h-11 min-w-[44px] flex items-center justify-center rounded-full border-2 border-slate-800 text-slate-500 hover:border-indigo-500 hover:text-indigo-400 transition-all active:scale-90"
                      >
                        <span className="text-2xl font-light">−</span>
                      </button>
                      <div className="text-lg font-black text-white px-2">
                        {quickQuantities[food.name] || 0}
                      </div>
                      <button
                        onClick={() => updateQuickQty(food.name, 1)}
                        className="w-11 h-11 min-w-[44px] flex items-center justify-center rounded-full border-2 border-slate-800 text-indigo-500 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all active:scale-90 shadow-lg"
                      >
                        <span className="text-2xl font-light">+</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Combined Logging Summary (Floating/Sticky Button Area) */}
            {(parsedItems.length > 0 || Object.values(quickQuantities).some(v => v > 0)) && (
              <div className="fixed bottom-[96px] left-1/2 -translate-x-1/2 w-full max-w-md px-5 z-40 pointer-events-none">
                <div className="bg-slate-900/95 backdrop-blur-xl rounded-[2.5rem] p-6 border-2 border-indigo-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-4 pointer-events-auto animate-in slide-in-from-bottom-8 duration-500">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-[10px] font-black text-indigo-400 tracking-widest uppercase italic">Ready to Log</h3>
                    <div className="text-white font-black text-sm">
                      {Math.round(
                        parsedItems.reduce((a, b) => a + b.calcCals, 0) +
                        [...FOOD_DB, ...customFoods].reduce((a, b) => a + (b.calories * (quickQuantities[b.name] || 0)), 0)
                      )} <span className="text-slate-500 font-bold">kcal</span>
                    </div>
                  </div>

                  <button
                    onClick={logMeal}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black py-5 rounded-[2rem] shadow-[0_10px_30px_rgba(79,70,229,0.4)] transition-all flex items-center justify-center gap-3 tracking-widest uppercase text-sm"
                  >
                    <Send className="w-5 h-5" />
                    Log {parsedItems.length + Object.values(quickQuantities).filter(v => v > 0).length} Items
                  </button>
                </div>
              </div>
            )}

            {inputText.trim().length > 2 && parsedItems.length === 0 && !Object.values(quickQuantities).some(v => v > 0) && (
              <div className="flex items-center gap-4 text-slate-400 text-sm p-6 bg-slate-900/50 rounded-[2rem] border border-slate-800 border-dashed">
                <AlertCircle className="w-6 h-6 text-slate-600 shrink-0" />
                <span>No match. Use "Quick Add" or try keywords like "chicken".</span>
              </div>
            )}

            <div className="h-40"></div> {/* Spacer for sticky button */}

            {showSuccess && (
              <div className="fixed top-12 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full font-black flex items-center gap-2 shadow-2xl animate-in fade-in slide-in-from-top-8 z-50">
                <CheckCircle2 className="w-5 h-5" /> BATCH LOG SUCCESSFUL
              </div>
            )}
          </div>
        )}

        {/* VIEW: HISTORY */}
        {currentView === 'history' && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-black text-white">History</h2>
                <p className="text-slate-500 font-medium">Your progress over time</p>
              </div>
              <div className="bg-slate-900 px-4 py-2 rounded-2xl border border-slate-800 text-xs font-black text-indigo-400 uppercase tracking-widest">
                {meals.length} Logs
              </div>
            </div>

            {meals.length === 0 ? (
              <div className="text-center py-20 text-slate-600 bg-slate-900 rounded-[3rem] border-2 border-slate-800 border-dashed">
                <History className="w-16 h-16 mx-auto mb-4 opacity-10" />
                <p className="font-black uppercase tracking-widest text-sm">No data found</p>
              </div>
            ) : (
              dateKeys.map(date => (
                <div key={date} className="space-y-4">
                  <div className="flex items-center justify-between sticky top-[72px] bg-slate-950/95 backdrop-blur-md py-3 z-20 border-b border-slate-900">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">
                      {date === todayString ? 'Today' : date}
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className={`text-xs font-black ${groupedMeals[date].metGoal ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {groupedMeals[date].totalCals.toLocaleString()} / {TARGET_CALORIES}
                        </div>
                      </div>
                      {groupedMeals[date].metGoal ? (
                        <div className="bg-emerald-500/20 p-1 rounded-md">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                      ) : (
                        <div className="bg-slate-800 p-1 rounded-md">
                          <Info className="w-4 h-4 text-slate-500" />
                        </div>
                      )}
                    </div>
                  </div>

                  {groupedMeals[date].meals.map(meal => (
                    <div key={meal.id} className="bg-slate-900 rounded-[2.5rem] p-6 border border-slate-800 shadow-xl group relative overflow-hidden transition-all hover:border-indigo-500/20">
                      <div className="absolute top-0 right-0 w-1.5 h-full bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                      <div className="flex justify-between items-start mb-6">
                        <div className="flex-1 pr-4">
                          <p className="text-white font-bold text-lg leading-tight mb-1">{meal.food_name || meal.rawText || meal.raw_text || "Meal"}</p>

                          {meal.items && meal.items.length > 1 ? (
                            <div className="flex flex-col gap-1.5 mt-2">
                              {meal.items.map((it, i) => (
                                <div key={i} className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-300 flex-1 truncate pr-2">• {it.quantity}x {it.name.split(' (')[0]}</span>
                                  <span className="text-indigo-400 font-bold bg-slate-950 px-1.5 rounded">{Math.round(it.calcCals)} kcal</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {meal.items && meal.items.slice(0, 3).map((it, i) => (
                                <span key={i} className="text-[9px] font-black bg-slate-950 text-indigo-400/70 px-2 py-0.5 rounded-md border border-slate-800/50 uppercase tracking-tighter">
                                  {it.name.split(' ')[0]}
                                </span>
                              ))}
                              {meal.items && meal.items.length > 3 && <span className="text-[9px] font-bold text-slate-600">+{meal.items.length - 3} more</span>}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => deleteMeal(meal.id)}
                          className="text-slate-700 hover:text-red-500 bg-slate-950 p-3 rounded-2xl transition-all active:scale-90 shadow-inner"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Portion Adjustment UI for Today's Logs */}
                      {date === todayString && (
                        <div className="flex items-center justify-between bg-slate-950/50 p-3 rounded-[1.5rem] border border-slate-800 mb-6">
                          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Portions</div>
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => updateMealPortion(meal.id, -0.5)}
                              className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-800 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all active:scale-90"
                            >
                              <span className="text-lg font-black">−</span>
                            </button>
                            <div className="text-sm font-black text-white w-8 text-center">
                              {meal.portionMultiplier || 1}x
                            </div>
                            <button
                              onClick={() => updateMealPortion(meal.id, 0.5)}
                              className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-800 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all active:scale-90"
                            >
                              <span className="text-lg font-black">+</span>
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-end border-t border-slate-800/50 pt-5">
                        <div className="flex flex-col gap-1">
                          <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
                            {meal.time || (meal.created_at ? new Date(meal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}
                          </div>
                          <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Surplus Tracked</div>
                        </div>
                        <div className="text-right">
                          <div className="text-4xl font-black text-indigo-500 leading-none mb-1 tracking-tighter">{meal.calories !== undefined ? meal.calories : (meal.totals?.calories || 0)}</div>
                          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            {meal.protein !== undefined ? meal.protein : (meal.totals?.protein || 0)}P • {meal.carbs !== undefined ? meal.carbs : (meal.totals?.carbs || 0)}C • {meal.fats !== undefined ? meal.fats : (meal.totals?.fats || 0)}F
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}

        {/* VIEW: ADMIN */}
        {currentView === 'admin' && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div>
              <h2 className="text-3xl font-black text-white mb-1">Food Manager</h2>
              <p className="text-slate-500 font-medium">Customize your smart recognition engine</p>
            </div>

            <form onSubmit={handleAddCustomFood} className="bg-slate-900 rounded-[2.5rem] p-8 border border-slate-800 shadow-2xl space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600/20 p-2 rounded-xl">
                  <Database className="w-5 h-5 text-indigo-500" />
                </div>
                <h3 className="font-black text-xs uppercase tracking-widest text-indigo-300">Add Custom Entry</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Food Name & Portion</label>
                  <input
                    type="text" required
                    value={newFood.name} onChange={e => setNewFood({ ...newFood, name: e.target.value })}
                    placeholder="e.g. Mass Gainer (2 scoops)"
                    className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-5 py-4 text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 transition-all font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Calories</label>
                    <input
                      type="number" required
                      value={newFood.calories} onChange={e => setNewFood({ ...newFood, calories: e.target.value })}
                      placeholder="kcal"
                      className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-5 py-4 text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 transition-all font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-2">Protein (g)</label>
                    <input
                      type="number"
                      value={newFood.protein} onChange={e => setNewFood({ ...newFood, protein: e.target.value })}
                      placeholder="0"
                      className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-5 py-4 text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 transition-all font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-2">Carbs (g)</label>
                    <input
                      type="number"
                      value={newFood.carbs} onChange={e => setNewFood({ ...newFood, carbs: e.target.value })}
                      placeholder="0"
                      className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-5 py-4 text-white placeholder-slate-700 focus:outline-none focus:border-emerald-500 transition-all font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-2">Fats (g)</label>
                    <input
                      type="number"
                      value={newFood.fats} onChange={e => setNewFood({ ...newFood, fats: e.target.value })}
                      placeholder="0"
                      className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-5 py-4 text-white placeholder-slate-700 focus:outline-none focus:border-amber-500 transition-all font-bold"
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full bg-white text-slate-950 font-black py-5 rounded-[2rem] shadow-xl transition-all active:scale-95 uppercase tracking-widest text-sm hover:bg-indigo-50">
                Save to Database
              </button>
            </form>

            {customFoods.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-4">Custom Library</h3>
                <div className="space-y-2">
                  {customFoods.map(food => (
                    <div key={food.id} className="flex justify-between items-center bg-slate-900 p-5 rounded-[2rem] border border-slate-800 shadow-lg">
                      <div className="flex items-center gap-4">
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                          <Utensils className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-white">{food.name}</div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                            {food.calories} kcal • {food.protein}P • {food.carbs}C
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteCustomFood(food.id)}
                        className="text-slate-700 hover:text-red-500 p-3 transition-colors active:scale-90"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-6">
              <button
                onClick={() => {
                  alert("To reset your account data, please manage your database tables in the Supabase Dashboard.");
                }}
                className="w-full flex items-center justify-center gap-3 py-5 rounded-[2rem] border border-red-500/20 bg-red-500/5 text-red-500/60 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-500/10 transition-all"
              >
                <ShieldAlert className="w-4 h-4" />
                Cloud Database Info
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-slate-900/90 backdrop-blur-2xl border-t border-slate-800/50 grid grid-cols-4 px-4 py-3 pb-8 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] z-40">
        <button onClick={() => setCurrentView('dashboard')} className={`flex flex-col items-center justify-center gap-1.5 transition-all ${currentView === 'dashboard' ? 'text-indigo-400' : 'text-slate-600'}`}>
          <Activity className={`w-6 h-6 ${currentView === 'dashboard' ? 'scale-110 drop-shadow-[0_0_12px_rgba(79,70,229,0.6)]' : ''} transition-all`} />
          <span className="text-[9px] font-black tracking-widest uppercase">Dash</span>
        </button>
        <button onClick={() => setCurrentView('add')} className={`flex flex-col items-center justify-center gap-1.5 transition-all ${currentView === 'add' ? 'text-indigo-400' : 'text-slate-600'}`}>
          <PlusCircle className={`w-6 h-6 ${currentView === 'add' ? 'scale-110 drop-shadow-[0_0_12px_rgba(79,70,229,0.6)]' : ''} transition-all`} />
          <span className="text-[9px] font-black tracking-widest uppercase">Log</span>
        </button>
        <button onClick={() => setCurrentView('history')} className={`flex flex-col items-center justify-center gap-1.5 transition-all ${currentView === 'history' ? 'text-indigo-400' : 'text-slate-600'}`}>
          <History className={`w-6 h-6 ${currentView === 'history' ? 'scale-110 drop-shadow-[0_0_12px_rgba(79,70,229,0.6)]' : ''} transition-all`} />
          <span className="text-[9px] font-black tracking-widest uppercase">Logs</span>
        </button>
        <button onClick={() => setCurrentView('admin')} className={`flex flex-col items-center justify-center gap-1.5 transition-all ${currentView === 'admin' ? 'text-indigo-400' : 'text-slate-600'}`}>
          <Settings className={`w-6 h-6 ${currentView === 'admin' ? 'scale-110 drop-shadow-[0_0_12px_rgba(79,70,229,0.6)]' : ''} transition-all`} />
          <span className="text-[9px] font-black tracking-widest uppercase">Admin</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
