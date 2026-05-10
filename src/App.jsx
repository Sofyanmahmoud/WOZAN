import React, { useState, useEffect } from 'react';
import { Activity, Flame, Send, Loader2, Info, AlertCircle } from 'lucide-react';

const appId = '855b0fca';
const appKey = 'f7e3d31671cb768745c54d56890cf1f9';

function App() {
  const [meals, setMeals] = useState(() => {
    const saved = localStorage.getItem('smartMealTracker');
    return saved ? JSON.parse(saved) : [];
  });
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const targetCalories = 3000;

  useEffect(() => {
    localStorage.setItem('smartMealTracker', JSON.stringify(meals));
  }, [meals]);

  const analyzeAndLogMeal = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(
        `https://api.edamam.com/api/nutrition-data?app_id=${appId}&app_key=${appKey}&ingr=${encodeURIComponent(inputText)}`
      );

      if (response.status === 403 || response.status === 401) {
        throw new Error('Authentication failed. Please verify your Edamam App ID and Key.');
      }

      if (!response.ok) {
        throw new Error('Failed to fetch nutrition data.');
      }

      const data = await response.json();

      if (!data || data.calories === undefined || data.calories === 0) {
        throw new Error("Couldn't understand the food items. Try being more specific (e.g., '1 large apple').");
      }

      const totalCals = data.calories || 0;
      const totalP = data.totalNutrients?.PROCNT?.quantity || 0;
      const totalC = data.totalNutrients?.CHOCDF?.quantity || 0;
      const totalF = data.totalNutrients?.FAT?.quantity || 0;

      const mealItems = data.ingredients && data.ingredients.length > 0
        ? data.ingredients.map(ing => ({
          name: ing.text || 'Unknown Ingredient',
          calories: Math.round(ing.parsed?.[0]?.nutrients?.ENERC_KCAL?.quantity || 0),
          protein: Math.round(ing.parsed?.[0]?.nutrients?.PROCNT?.quantity || 0),
          carbs: Math.round(ing.parsed?.[0]?.nutrients?.CHOCDF?.quantity || 0),
          fats: Math.round(ing.parsed?.[0]?.nutrients?.FAT?.quantity || 0)
        }))
        : [{
          name: inputText,
          calories: Math.round(totalCals),
          protein: Math.round(totalP),
          carbs: Math.round(totalC),
          fats: Math.round(totalF)
        }];

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
        items: mealItems
      };

      setMeals([newMeal, ...meals]);
      setInputText('');
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMeal = (id) => {
    setMeals(meals.filter(m => m.id !== id));
  };

  const totalCalories = meals.reduce((sum, meal) => sum + meal.totals.calories, 0);
  const totalProtein = meals.reduce((sum, meal) => sum + meal.totals.protein, 0);
  const totalCarbs = meals.reduce((sum, meal) => sum + meal.totals.carbs, 0);
  const totalFats = meals.reduce((sum, meal) => sum + meal.totals.fats, 0);

  const progress = Math.min((totalCalories / targetCalories) * 100, 100);
  const surplusRemaining = targetCalories - totalCalories;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* The "Mass" Dashboard */}
        <header className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                <Activity className="text-indigo-400" />
                Smart Mass Tracker
              </h1>
              <p className="text-slate-400 mt-1">NLP-powered nutrition tracking for serious gains.</p>
            </div>
            <div className="text-left md:text-right">
              <div className="text-sm text-slate-400 font-medium tracking-wide uppercase">Daily Target</div>
              <div className="text-2xl font-bold text-indigo-400">{targetCalories.toLocaleString()} <span className="text-lg text-slate-500 font-medium">kcal</span></div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col md:flex-row justify-between md:items-end gap-6 mb-6 relative z-10">
              <div>
                <div className="text-6xl font-black text-white tracking-tighter drop-shadow-sm">{totalCalories.toLocaleString()}</div>
                <div className="text-sm text-slate-400 font-bold mt-2 tracking-widest uppercase">Calories Consumed</div>
              </div>
              <div className="md:text-right">
                {surplusRemaining > 0 ? (
                  <div className="text-3xl font-bold text-emerald-400 drop-shadow-sm">{surplusRemaining.toLocaleString()}</div>
                ) : (
                  <div className="text-3xl font-bold text-indigo-400 drop-shadow-sm">+{Math.abs(surplusRemaining).toLocaleString()}</div>
                )}
                <div className="text-sm text-slate-400 font-bold mt-1 tracking-widest uppercase">
                  {surplusRemaining > 0 ? 'kcal to goal' : 'kcal surplus achieved'}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-6 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-1">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-purple-500 to-emerald-400 transition-all duration-1000 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full"></div>
              </div>
            </div>
          </div>
        </header>

        {/* Global Macros */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
            <div className="text-sm font-bold tracking-widest text-indigo-400 uppercase mb-2">Total Protein</div>
            <div className="text-4xl font-black text-white tracking-tight">{totalProtein}<span className="text-xl text-slate-600 ml-1">g</span></div>
          </div>
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
            <div className="text-sm font-bold tracking-widest text-emerald-400 uppercase mb-2">Total Carbs</div>
            <div className="text-4xl font-black text-white tracking-tight">{totalCarbs}<span className="text-xl text-slate-600 ml-1">g</span></div>
          </div>
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden group hover:border-purple-500/30 transition-colors">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
            <div className="text-sm font-bold tracking-widest text-purple-400 uppercase mb-2">Total Fats</div>
            <div className="text-4xl font-black text-white tracking-tight">{totalFats}<span className="text-xl text-slate-600 ml-1">g</span></div>
          </div>
        </section>

        {/* Main Interface Layout */}
        <div className="grid xl:grid-cols-12 gap-8 pb-12">

          {/* Smart Input Column */}
          <div className="xl:col-span-5">
            <div className="bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-800 sticky top-8 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Flame className="w-5 h-5 text-indigo-400" />
                Analyze Meal
              </h2>
              <p className="text-sm text-slate-400 mb-6">Type out everything you ate like a normal sentence. We'll extract the macros for you.</p>

              <form onSubmit={analyzeAndLogMeal} className="space-y-4">
                <div className="relative">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="e.g., 3 chicken breasts, 2 cups of white rice, and an avocado"
                    className="w-full h-36 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none shadow-inner"
                    required
                  />
                  <div className="absolute bottom-4 right-4 flex items-center gap-2 pointer-events-none opacity-50">
                    <Info className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-400 font-medium">NLP Powered</span>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.2)] hover:shadow-[0_0_25px_rgba(79,70,229,0.4)] transition-all flex items-center justify-center gap-2 group"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing Nutrition...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      Calculate & Log
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-800">
                <div className="text-xs text-slate-500 font-medium uppercase tracking-widest mb-3">API Configuration</div>
                <div className="text-sm text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  You need free Edamam API credentials. Replace <code className="text-indigo-400">appId</code> and <code className="text-indigo-400">appKey</code> at the top of <code className="text-indigo-400">App.jsx</code> to enable live parsing.
                </div>
              </div>
            </div>
          </div>

          {/* Daily Feed & Ingredients */}
          <div className="xl:col-span-7">
            <div className="bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-800 shadow-xl h-full">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  Daily Intake Log
                </h2>
                <span className="text-sm font-bold text-slate-500 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">{meals.length} Meals</span>
              </div>

              {meals.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500 bg-slate-950/50 border border-slate-800 rounded-3xl">
                  <Flame className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg font-medium text-slate-400">Your log is empty.</p>
                  <p className="text-sm mt-1 text-slate-600">Type your first meal to see the breakdown.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {meals.map((meal) => (
                    <div key={meal.id} className="bg-slate-950 rounded-2xl p-6 border border-slate-800 hover:border-slate-700 transition-colors shadow-lg">

                      {/* Meal Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 pr-4">
                          <p className="text-lg font-medium text-white italic">"{meal.rawText}"</p>
                          <span className="text-xs font-bold tracking-wider text-slate-500 uppercase mt-2 block">{meal.time}</span>
                        </div>
                        <div className="flex items-start gap-4 shrink-0">
                          <div className="text-right">
                            <span className="text-2xl font-black text-indigo-400">{meal.totals.calories}</span>
                            <span className="text-sm text-slate-500 font-medium ml-1">kcal</span>
                          </div>
                          <button
                            onClick={() => deleteMeal(meal.id)}
                            className="text-slate-600 hover:text-red-400 bg-slate-900 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                            title="Delete Log"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Ingredient Breakdown */}
                      <div className="mt-5 space-y-2">
                        <div className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-3">Ingredient Breakdown</div>
                        {meal.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm bg-slate-900 px-4 py-3 rounded-xl border border-slate-800/50">
                            <span className="font-semibold text-slate-300 capitalize flex-1">{item.name}</span>

                            <div className="flex items-center gap-4 text-xs font-medium shrink-0">
                              <span className="text-indigo-400 w-12 text-right">{item.protein}g <span className="text-slate-600">P</span></span>
                              <span className="text-emerald-400 w-12 text-right">{item.carbs}g <span className="text-slate-600">C</span></span>
                              <span className="text-purple-400 w-12 text-right">{item.fats}g <span className="text-slate-600">F</span></span>
                              <span className="text-white font-bold w-16 text-right bg-slate-800 px-2 py-1 rounded">{item.calories} <span className="text-slate-500 font-normal">cal</span></span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Meal Totals Summary */}
                      <div className="mt-4 pt-4 border-t border-slate-800/50 flex gap-4 text-sm justify-end">
                        <span className="text-slate-400 font-medium">Meal Total P: <span className="text-indigo-400 font-bold ml-1">{meal.totals.protein}g</span></span>
                        <span className="text-slate-400 font-medium">C: <span className="text-emerald-400 font-bold ml-1">{meal.totals.carbs}g</span></span>
                        <span className="text-slate-400 font-medium">F: <span className="text-purple-400 font-bold ml-1">{meal.totals.fats}g</span></span>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;
