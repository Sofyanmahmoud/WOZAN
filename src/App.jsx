import React, { useState, useEffect } from 'react';
import { Activity, PlusCircle, History, Flame, Utensils, Send, CheckCircle2, AlertCircle, Settings, Trash2, Database, ShieldAlert } from 'lucide-react';

const FOOD_DB = [
  { keywords: ['chicken', 'breast'], name: 'Chicken Breast (100g)', calories: 165, protein: 31, carbs: 0, fats: 3.6 },
  { keywords: ['rice', 'white'], name: 'White Rice (1 cup)', calories: 205, protein: 4, carbs: 45, fats: 0.4 },
  { keywords: ['egg', 'eggs'], name: 'Large Egg (1)', calories: 72, protein: 6, carbs: 0.4, fats: 4.8 },
  { keywords: ['oat', 'oats', 'oatmeal'], name: 'Oats (1/2 cup)', calories: 150, protein: 5, carbs: 27, fats: 3 },
  { keywords: ['peanut butter', 'pb'], name: 'Peanut Butter (2 tbsp)', calories: 190, protein: 7, carbs: 8, fats: 16 },
  { keywords: ['steak', 'beef'], name: 'Steak (100g)', calories: 271, protein: 26, carbs: 0, fats: 19 },
  { keywords: ['milk', 'whole'], name: 'Whole Milk (1 cup)', calories: 149, protein: 8, carbs: 12, fats: 8 },
  { keywords: ['banana', 'bananas'], name: 'Banana (1 medium)', calories: 105, protein: 1.3, carbs: 27, fats: 0.3 },
  { keywords: ['pasta', 'spaghetti'], name: 'Pasta (1 cup cooked)', calories: 220, protein: 8, carbs: 43, fats: 1.3 },
  { keywords: ['shake', 'whey'], name: 'Protein Shake (1 scoop)', calories: 120, protein: 24, carbs: 3, fats: 1.5 },
];

function App() {
  // --- STATE MANAGEMENT ---
  const [meals, setMeals] = useState(() => {
    const saved = localStorage.getItem('massBuilderNoApi');
    return saved ? JSON.parse(saved) : [];
  });
  const [customFoods, setCustomFoods] = useState(() => {
    const saved = localStorage.getItem('massBuilderCustomFoods');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'add', 'history', 'admin'
  const [inputText, setInputText] = useState('');
  const [parsedItems, setParsedItems] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);

  // Admin State
  const [newFood, setNewFood] = useState({ name: '', calories: '', protein: '', carbs: '', fats: '' });

  // --- EFFECTS ---
  useEffect(() => {
    localStorage.setItem('massBuilderNoApi', JSON.stringify(meals));
  }, [meals]);

  useEffect(() => {
    localStorage.setItem('massBuilderCustomFoods', JSON.stringify(customFoods));
    // Trigger re-parse if input is active while a new food is added
    if (inputText.trim().length > 2) {
      setParsedItems(calculateFromText(inputText));
    }
  }, [customFoods]);

  const targetCalories = 3000;

  // --- SMART ENGINE ---
  const calculateFromText = (text) => {
    const lowerText = text.toLowerCase();
    let found = [];
    
    // Combine Default DB with Custom Foods
    const combinedDB = [
      ...FOOD_DB,
      ...customFoods.map(cf => ({
        ...cf,
        // Make the full name and split words act as keywords
        keywords: [cf.name.toLowerCase(), ...cf.name.toLowerCase().split(' ').filter(w => w.length > 2)]
      }))
    ];

    combinedDB.forEach(food => {
      // Find if any keyword from this food exists in the text
      // Sort keywords by length descending so longer phrases like "peanut butter" match before "peanut"
      const sortedKeywords = [...food.keywords].sort((a, b) => b.length - a.length);
      const matchedKeyword = sortedKeywords.find(kw => lowerText.includes(kw));
      
      if (matchedKeyword) {
        // Look for preceding numbers for quantity (e.g., "3 chicken", "2x eggs", "1.5 cups")
        // Improved regex handles decimals and 'x' characters
        const regex = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:x)?\\s*${matchedKeyword}`, 'i');
        const match = lowerText.match(regex);
        const qty = match ? parseFloat(match[1]) : 1;
        
        // Prevent duplicate detections if a food matched multiple keywords
        if (!found.some(item => item.name === food.name)) {
          found.push({
            ...food,
            quantity: qty,
            calcCals: food.calories * qty,
            calcP: food.protein * qty,
            calcC: food.carbs * qty,
            calcF: food.fats * qty
          });
        }
      }
    });
    return found;
  };

  const handleTextChange = (e) => {
    const text = e.target.value;
    setInputText(text);
    if (text.trim().length > 2) {
      setParsedItems(calculateFromText(text));
    } else {
      setParsedItems([]);
    }
  };

  const logMeal = () => {
    if (parsedItems.length === 0) return;
    
    let totalCals = 0, totalP = 0, totalC = 0, totalF = 0;
    parsedItems.forEach(item => {
      totalCals += item.calcCals;
      totalP += item.calcP;
      totalC += item.calcC;
      totalF += item.calcF;
    });

    const now = new Date();
    const newMeal = {
      id: Date.now(),
      rawText: inputText,
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: now.toLocaleDateString(), // Used for History Grouping
      totals: {
        calories: Math.round(totalCals),
        protein: Math.round(totalP),
        carbs: Math.round(totalC),
        fats: Math.round(totalF)
      },
      items: parsedItems
    };

    setMeals([newMeal, ...meals]);
    setInputText('');
    setParsedItems([]);
    
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setCurrentView('dashboard');
    }, 1500);
  };

  const deleteMeal = (id) => {
    setMeals(meals.filter(m => m.id !== id));
  };

  // --- ADMIN FUNCTIONS ---
  const handleAddCustomFood = (e) => {
    e.preventDefault();
    if (!newFood.name || !newFood.calories) return;

    const foodItem = {
      id: Date.now(),
      name: newFood.name.trim(),
      calories: Number(newFood.calories),
      protein: Number(newFood.protein) || 0,
      carbs: Number(newFood.carbs) || 0,
      fats: Number(newFood.fats) || 0,
    };

    setCustomFoods([foodItem, ...customFoods]);
    setNewFood({ name: '', calories: '', protein: '', carbs: '', fats: '' });
  };

  const deleteCustomFood = (id) => {
    setCustomFoods(customFoods.filter(f => f.id !== id));
  };

  const clearAllData = () => {
    if (window.confirm("Are you sure you want to delete ALL meals and custom foods? This cannot be undone.")) {
      setMeals([]);
      setCustomFoods([]);
    }
  };

  // --- DASHBOARD CALCULATIONS ---
  // Only calculate dashboard totals for TODAY
  const todayString = new Date().toLocaleDateString();
  const todaysMeals = meals.filter(meal => (meal.date || new Date(meal.id).toLocaleDateString()) === todayString);

  const totalCalories = todaysMeals.reduce((sum, meal) => sum + meal.totals.calories, 0);
  const totalProtein = todaysMeals.reduce((sum, meal) => sum + meal.totals.protein, 0);
  const totalCarbs = todaysMeals.reduce((sum, meal) => sum + meal.totals.carbs, 0);
  const totalFats = todaysMeals.reduce((sum, meal) => sum + meal.totals.fats, 0);
  const progress = Math.min((totalCalories / targetCalories) * 100, 100);

  // --- HISTORY GROUPING ---
  const groupedMeals = meals.reduce((acc, meal) => {
    const dateKey = meal.date || new Date(meal.id).toLocaleDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(meal);
    return acc;
  }, {});

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 font-sans pb-24 selection:bg-indigo-500/30">
      
      {/* Top App Bar */}
      <div className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 sticky top-0 z-10 flex items-center justify-center shadow-md">
        <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 tracking-tight flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-400" />
          MASS BUILDER
        </h1>
      </div>

      {/* Main Container */}
      <main className="p-4 max-w-md mx-auto w-full">
        
        {/* VIEW: DASHBOARD */}
        {currentView === 'dashboard' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl relative overflow-hidden text-center">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-2">Today's Intake</div>
              <div className="text-6xl font-black text-white tracking-tighter mb-1">
                {totalCalories.toLocaleString()}
              </div>
              <div className="text-indigo-400 font-semibold mb-6">/ {targetCalories.toLocaleString()} kcal</div>
              
              <div className="h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800 shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 text-center shadow-lg">
                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Protein</div>
                <div className="text-2xl font-black text-white">{totalProtein}<span className="text-xs text-slate-500 ml-0.5">g</span></div>
              </div>
              <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 text-center shadow-lg">
                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Carbs</div>
                <div className="text-2xl font-black text-white">{totalCarbs}<span className="text-xs text-slate-500 ml-0.5">g</span></div>
              </div>
              <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 text-center shadow-lg">
                <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">Fats</div>
                <div className="text-2xl font-black text-white">{totalFats}<span className="text-xs text-slate-500 ml-0.5">g</span></div>
              </div>
            </div>
            
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 flex items-center gap-3">
              <Flame className="w-6 h-6 text-indigo-400 shrink-0" />
              <p className="text-sm font-medium text-indigo-200">
                {progress >= 100 
                  ? 'Goal reached! You are in a caloric surplus.' 
                  : `${(targetCalories - totalCalories).toLocaleString()} kcal remaining for your surplus.`}
              </p>
            </div>
          </div>
        )}

        {/* VIEW: ADD MEAL */}
        {currentView === 'add' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            <div>
              <h2 className="text-2xl font-black text-white mb-1">Smart Entry</h2>
              <p className="text-sm text-slate-400 font-medium mb-4">Powered by your local & custom food DB.</p>
              
              <textarea 
                value={inputText}
                onChange={handleTextChange}
                placeholder="e.g. 2 chicken and 1 cup of white rice"
                className="w-full h-32 bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner resize-none text-lg"
              />
            </div>

            {parsedItems.length > 0 && (
              <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xl">
                <h3 className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-4 flex items-center gap-2">
                  <Utensils className="w-4 h-4" /> Matched Foods
                </h3>
                <div className="space-y-3">
                  {parsedItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-950 p-3.5 rounded-2xl border border-slate-800/50">
                      <div>
                        <div className="text-white font-bold">{item.name}</div>
                        <div className="text-xs font-medium text-slate-500 mt-0.5">Qty: {item.quantity}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-indigo-400 font-black">{Math.round(item.calcCals)} kcal</div>
                        <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mt-0.5">
                          {Math.round(item.calcP)}P • {Math.round(item.calcC)}C • {Math.round(item.calcF)}F
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={logMeal}
                  className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all flex items-center justify-center gap-2 tracking-wide uppercase"
                >
                  <Send className="w-5 h-5" /> Log {Math.round(parsedItems.reduce((a, b) => a + b.calcCals, 0))} kcal
                </button>
              </div>
            )}
            
            {inputText.trim().length > 2 && parsedItems.length === 0 && (
              <div className="flex items-center gap-3 text-slate-400 text-sm p-4 bg-slate-900 rounded-2xl border border-slate-800">
                <AlertCircle className="w-5 h-5 text-slate-500 shrink-0" />
                No matching foods found. Add custom foods in the Admin tab.
              </div>
            )}

            {showSuccess && (
              <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-5 py-3 rounded-full font-bold flex items-center gap-2 shadow-xl animate-in fade-in slide-in-from-top-4 z-50">
                <CheckCircle2 className="w-5 h-5" /> Saved to History!
              </div>
            )}
          </div>
        )}

        {/* VIEW: HISTORY */}
        {currentView === 'history' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-black text-white mb-2 flex items-center justify-between">
              Meal History
              <span className="text-xs font-bold tracking-widest uppercase text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                {meals.length} Total Logs
              </span>
            </h2>
            
            {meals.length === 0 ? (
              <div className="text-center py-16 text-slate-500 bg-slate-900 rounded-3xl border border-slate-800 border-dashed">
                <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-medium">Your history is empty.</p>
              </div>
            ) : (
              Object.keys(groupedMeals).sort((a, b) => new Date(b) - new Date(a)).map(date => (
                <div key={date} className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest sticky top-[72px] bg-slate-950/90 backdrop-blur-sm py-2 z-10">
                    {date === todayString ? 'Today' : date}
                  </h3>
                  
                  {groupedMeals[date].map(meal => (
                    <div key={meal.id} className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-md">
                      <div className="flex justify-between items-start mb-4">
                        <p className="text-white font-medium italic flex-1 pr-4 text-lg">"{meal.rawText}"</p>
                        <button 
                          onClick={() => deleteMeal(meal.id)}
                          className="text-slate-600 hover:text-red-400 bg-slate-950 p-2 rounded-xl transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                        </button>
                      </div>
                      
                      <div className="flex justify-between items-end border-t border-slate-800/50 pt-4">
                        <div className="text-xs font-bold tracking-wider text-slate-500 uppercase">{meal.time}</div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-indigo-400">{meal.totals.calories} <span className="text-xs font-bold text-slate-500 uppercase">kcal</span></div>
                          <div className="text-[10px] font-bold tracking-wider text-slate-600 uppercase mt-1">
                            <span className="text-indigo-400">{meal.totals.protein}P</span> • <span className="text-emerald-400">{meal.totals.carbs}C</span> • <span className="text-purple-400">{meal.totals.fats}F</span>
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
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-black text-white mb-2">Food Manager</h2>
            <p className="text-sm text-slate-400 font-medium mb-6">Create custom foods that the Smart Engine will instantly recognize.</p>
            
            {/* Create Food Form */}
            <form onSubmit={handleAddCustomFood} className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Database className="w-4 h-4" /> Add New Food
              </h3>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Food Name & Portion</label>
                <input 
                  type="text" required
                  value={newFood.name} onChange={e => setNewFood({...newFood, name: e.target.value})}
                  placeholder="e.g. Chobani Greek Yogurt (1 cup)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Calories</label>
                  <input 
                    type="number" required
                    value={newFood.calories} onChange={e => setNewFood({...newFood, calories: e.target.value})}
                    placeholder="kcal"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1.5">Protein (g)</label>
                  <input 
                    type="number"
                    value={newFood.protein} onChange={e => setNewFood({...newFood, protein: e.target.value})}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1.5">Carbs (g)</label>
                  <input 
                    type="number"
                    value={newFood.carbs} onChange={e => setNewFood({...newFood, carbs: e.target.value})}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-500 uppercase tracking-wider mb-1.5">Fats (g)</label>
                  <input 
                    type="number"
                    value={newFood.fats} onChange={e => setNewFood({...newFood, fats: e.target.value})}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all text-sm"
                  />
                </div>
              </div>

              <button type="submit" className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg text-sm uppercase tracking-wide">
                Save to Database
              </button>
            </form>

            {/* Custom Foods List */}
            {customFoods.length > 0 && (
              <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Your Custom Foods</h3>
                <div className="space-y-3">
                  {customFoods.map(food => (
                    <div key={food.id} className="flex justify-between items-center bg-slate-950 p-3 rounded-2xl border border-slate-800">
                      <div>
                        <div className="text-sm font-bold text-white">{food.name}</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                          {food.calories} kcal • {food.protein}P • {food.carbs}C • {food.fats}F
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteCustomFood(food.id)}
                        className="text-slate-600 hover:text-red-400 p-2 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Danger Zone */}
            <div className="pt-8">
              <button 
                onClick={clearAllData}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400 font-bold text-sm uppercase tracking-wider hover:bg-red-500/20 transition-all"
              >
                <ShieldAlert className="w-4 h-4" />
                Clear All App Data
              </button>
            </div>

          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-slate-900/90 backdrop-blur-lg border-t border-slate-800 grid grid-cols-4 p-2 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20">
        
        <button 
          onClick={() => setCurrentView('dashboard')}
          className={`flex flex-col items-center justify-center gap-1 p-2 transition-colors ${currentView === 'dashboard' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          <Activity className={`w-5 h-5 ${currentView === 'dashboard' ? 'scale-110 drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]' : ''} transition-all`} />
          <span className="text-[10px] font-bold tracking-widest uppercase">Dash</span>
        </button>
        
        <button 
          onClick={() => setCurrentView('add')}
          className={`flex flex-col items-center justify-center gap-1 p-2 transition-all ${currentView === 'add' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          <div className={`${currentView === 'add' ? 'bg-indigo-500/20 text-indigo-400 rounded-full p-1' : ''} transition-colors`}>
            <PlusCircle className={`w-6 h-6 ${currentView === 'add' ? 'scale-110' : ''}`} />
          </div>
          <span className={`text-[10px] font-bold tracking-widest uppercase mt-0.5`}>Add</span>
        </button>
        
        <button 
          onClick={() => setCurrentView('history')}
          className={`flex flex-col items-center justify-center gap-1 p-2 transition-colors ${currentView === 'history' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          <History className={`w-5 h-5 ${currentView === 'history' ? 'scale-110 drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]' : ''} transition-all`} />
          <span className="text-[10px] font-bold tracking-widest uppercase">Logs</span>
        </button>

        <button 
          onClick={() => setCurrentView('admin')}
          className={`flex flex-col items-center justify-center gap-1 p-2 transition-colors ${currentView === 'admin' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          <Settings className={`w-5 h-5 ${currentView === 'admin' ? 'scale-110 drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]' : ''} transition-all`} />
          <span className="text-[10px] font-bold tracking-widest uppercase">Admin</span>
        </button>

      </nav>

    </div>
  );
}

export default App;
