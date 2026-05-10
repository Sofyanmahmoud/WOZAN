import React, { useState, useEffect } from 'react';
import { Activity, PlusCircle, History, Flame, Utensils, Send, CheckCircle2, AlertCircle } from 'lucide-react';

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
  const [meals, setMeals] = useState(() => {
    const saved = localStorage.getItem('massBuilderNoApi');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'add', 'history'
  
  // Add Meal State
  const [inputText, setInputText] = useState('');
  const [parsedItems, setParsedItems] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    localStorage.setItem('massBuilderNoApi', JSON.stringify(meals));
  }, [meals]);

  const targetCalories = 3000;

  // Fuzzy Search Engine
  const calculateFromText = (text) => {
    const lowerText = text.toLowerCase();
    let found = [];
    
    FOOD_DB.forEach(food => {
      // Find if any keyword from this food exists in the text
      const matchedKeyword = food.keywords.find(kw => lowerText.includes(kw));
      if (matchedKeyword) {
        // Look for preceding numbers for quantity (e.g., "3 chicken", "2x eggs")
        const regex = new RegExp(`(\\d+)\\s*(?:x)?\\s*${matchedKeyword}`, 'i');
        const match = lowerText.match(regex);
        const qty = match ? parseInt(match[1]) : 1;
        
        found.push({
          ...food,
          quantity: qty,
          calcCals: food.calories * qty,
          calcP: food.protein * qty,
          calcC: food.carbs * qty,
          calcF: food.fats * qty
        });
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

    const newMeal = {
      id: Date.now(),
      rawText: inputText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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

  // Dashboard Totals
  const totalCalories = meals.reduce((sum, meal) => sum + meal.totals.calories, 0);
  const totalProtein = meals.reduce((sum, meal) => sum + meal.totals.protein, 0);
  const totalCarbs = meals.reduce((sum, meal) => sum + meal.totals.carbs, 0);
  const totalFats = meals.reduce((sum, meal) => sum + meal.totals.fats, 0);
  const progress = Math.min((totalCalories / targetCalories) * 100, 100);

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 font-sans pb-24 selection:bg-indigo-500/30">
      
      {/* Top App Bar */}
      <div className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 sticky top-0 z-10 flex items-center justify-center shadow-md">
        <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 tracking-tight flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-400" />
          MASS BUILDER
        </h1>
      </div>

      {/* Main Container - Mobile Constrained */}
      <main className="p-4 max-w-md mx-auto w-full">
        
        {/* VIEW: DASHBOARD */}
        {currentView === 'dashboard' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl relative overflow-hidden text-center">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-2">Total Calories</div>
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
              <p className="text-sm text-slate-400 font-medium mb-4">No APIs required. Uses local DB matching.</p>
              
              <textarea 
                value={inputText}
                onChange={handleTextChange}
                placeholder="e.g. 2 chicken and 1 rice"
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
                <AlertCircle className="w-5 h-5 text-slate-500" />
                No matching foods found in the local DB.
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
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-black text-white mb-4 flex items-center justify-between">
              History
              <span className="text-xs font-bold tracking-widest uppercase text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                {meals.length} Logs
              </span>
            </h2>
            
            {meals.length === 0 ? (
              <div className="text-center py-16 text-slate-500 bg-slate-900 rounded-3xl border border-slate-800 border-dashed">
                <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-medium">No meals logged today.</p>
              </div>
            ) : (
              meals.map(meal => (
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
              ))
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-slate-900/90 backdrop-blur-lg border-t border-slate-800 flex justify-around items-center p-2 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20">
        <button 
          onClick={() => setCurrentView('dashboard')}
          className={`flex flex-col items-center justify-center gap-1 p-2 w-20 transition-colors ${currentView === 'dashboard' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          <Activity className={`w-6 h-6 ${currentView === 'dashboard' ? 'scale-110 drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]' : ''} transition-all`} />
          <span className="text-[10px] font-bold tracking-widest uppercase">Dash</span>
        </button>
        
        <button 
          onClick={() => setCurrentView('add')}
          className={`flex flex-col items-center justify-center gap-1 p-2 w-20 -mt-8 transition-all`}
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl transition-all ${currentView === 'add' ? 'bg-indigo-500 shadow-indigo-500/50 scale-105' : 'bg-slate-800 border-2 border-slate-700 hover:border-slate-600'}`}>
            <PlusCircle className="w-7 h-7" />
          </div>
          <span className={`text-[10px] font-bold tracking-widest uppercase mt-1 ${currentView === 'add' ? 'text-indigo-400' : 'text-slate-500'}`}>Add</span>
        </button>
        
        <button 
          onClick={() => setCurrentView('history')}
          className={`flex flex-col items-center justify-center gap-1 p-2 w-20 transition-colors ${currentView === 'history' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          <History className={`w-6 h-6 ${currentView === 'history' ? 'scale-110 drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]' : ''} transition-all`} />
          <span className="text-[10px] font-bold tracking-widest uppercase">Logs</span>
        </button>
      </nav>

    </div>
  );
}

export default App;
