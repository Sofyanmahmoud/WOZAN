import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
  Info,
  Sun,
  Moon
} from 'lucide-react';
import { supabase } from './lib/supabase';

// --- CONFIGURATION ---
const todayString = new Date().toISOString().split('T')[0];

// Targets are dynamically handled in the App component state and scaled reactive split values.

const FOOD_DB = [
  { keywords: ['chicken', 'breast'], name: 'Chicken Breast (100g)', calories: 165, protein: 31, carbs: 0, fats: 3.6, unit: 'g' },
  { keywords: ['rice', 'white'], name: 'White Rice (1 cup)', calories: 205, protein: 4, carbs: 45, fats: 0.4, unit: 'cup' },
  { keywords: ['egg', 'eggs'], name: 'Egg', calories: 72, protein: 6, carbs: 0.4, fats: 4.8, unit: 'qty' },
  { keywords: ['almonds', 'ALMONDS'], name: 'ALMONDS 10 ', calories: 70, protein: 5, carbs: 2.5, fats: 6, unit: 'cup' },
  { keywords: ['peanut butter', 'pb'], name: 'Peanut Butter (2 tbsp)', calories: 190, protein: 7, carbs: 8, fats: 16, unit: 'qty' },
  { keywords: ['steak', 'beef'], name: 'Steak (100g)', calories: 271, protein: 26, carbs: 0, fats: 19, unit: 'g' },
  { keywords: ['banana', 'bananas'], name: 'Banana (1 medium)', calories: 105, protein: 1.3, carbs: 27, fats: 0.3, unit: 'qty' },
  { keywords: ['pasta', 'spaghetti'], name: 'Pasta (1 cup cooked)', calories: 220, protein: 8, carbs: 43, fats: 1.3, unit: 'cup' },
];

// Helper components for Dashboard
function AnimatedNumber({ value, duration = 600 }) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let startTimestamp = null;
    const startValue = displayValue;
    const endValue = value;
    if (startValue === endValue) return;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutQuad curve
      const easeProgress = progress * (2 - progress);
      const currentVal = Math.round(startValue + (endValue - startValue) * easeProgress);
      setDisplayValue(currentVal);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [value, duration]);

  return <span>{displayValue.toLocaleString()}</span>;
}

function WeeklyMatrix({ meals, theme, targetCalories }) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const mondayDiff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(today);
  const mDateVal = today.getDate() + mondayDiff;
  monday.setDate(mDateVal);
  
  const days = [];
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  const todayStr = new Date().toISOString().split('T')[0];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateKey = d.toISOString().split('T')[0];
    
    const dayMeals = meals.filter(m => {
      const mDate = m.date || (m.created_at ? m.created_at.split('T')[0] : '');
      return mDate === dateKey;
    });

    const totalCals = dayMeals.reduce((acc, m) => acc + Number(m.calories || 0), 0);

    let status = 'empty';
    if (totalCals >= targetCalories) {
      status = 'met';
    } else if (totalCals > 0) {
      status = 'partial';
    }

    days.push({
      label: dayLabels[i],
      dayName: dayNames[i],
      dateStr: dateKey,
      totalCals,
      status,
      isToday: dateKey === todayStr
    });
  }

  return (
    <div className={`rounded-[2rem] p-5 border shadow-lg transition-all duration-300 backdrop-blur-xl ${
      theme === 'dark' 
        ? 'bg-slate-900/40 border-white/5 shadow-indigo-950/20' 
        : 'bg-white/45 border-slate-200/50 shadow-slate-100'
    }`}>
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${theme === 'dark' ? 'bg-indigo-950/50 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-650'}`}>
            Weekly Consistency
          </span>
        </div>
        <span className={`text-[9px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
          Current Week
        </span>
      </div>

      <div className="grid grid-cols-7 gap-2.5">
        {days.map((day, idx) => {
          let blockBg = "";
          let labelColor = "";
          let ringStyle = "";

          if (day.status === 'met') {
            blockBg = theme === 'dark' 
              ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)] text-white' 
              : 'bg-emerald-500 border-emerald-400 text-white';
            labelColor = "text-emerald-500 dark:text-emerald-400 font-black";
          } else if (day.status === 'partial') {
            blockBg = theme === 'dark'
              ? 'bg-amber-500/25 border-amber-500/40 text-amber-300'
              : 'bg-amber-100 border-amber-200 text-amber-700';
            labelColor = "text-amber-550 dark:text-amber-400 font-bold";
          } else {
            blockBg = theme === 'dark'
              ? 'bg-slate-950/55 border-slate-850 text-slate-700'
              : 'bg-slate-50/55 border-slate-200 text-slate-400';
            labelColor = "text-slate-400 dark:text-slate-650";
          }

          if (day.isToday) {
            ringStyle = "ring-2 ring-indigo-500 ring-offset-2 " + (theme === 'dark' ? 'ring-offset-slate-900' : 'ring-offset-white');
          }

          return (
            <div key={idx} className="flex flex-col items-center gap-1.5">
              <div 
                className={`w-full aspect-square rounded-xl border flex items-center justify-center text-xs font-black transition-all duration-300 relative ${blockBg} ${ringStyle}`}
                title={`${day.dayName}: ${day.totalCals} / ${targetCalories} kcal`}
              >
                {day.label}
                {day.isToday && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                )}
              </div>
              <span className={`text-[8px] uppercase tracking-tighter transition-colors ${labelColor}`}>
                {day.dayName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistoryMealCard({ meal, todayString, date, theme, updateMealPortion, deleteMeal }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [startX, setStartX] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);

  const mealName = meal.food_name || meal.rawText || meal.raw_text || "Meal";
  const mealCals = meal.calories !== undefined ? meal.calories : (meal.totals?.calories || 0);
  const pVal = meal.protein !== undefined ? meal.protein : (meal.totals?.protein || 0);
  const cVal = meal.carbs !== undefined ? meal.carbs : (meal.totals?.carbs || 0);
  const fVal = meal.fats !== undefined ? meal.fats : (meal.totals?.fats || 0);
  const mealTime = meal.time || (meal.created_at ? new Date(meal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

  const hasMultipleItems = meal.items && meal.items.length > 1;

  const handleTouchStart = (e) => {
    setStartX(e.touches[0].clientX);
    setIsTransitioning(false);
  };

  const handleTouchMove = (e) => {
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - startX;
    if (deltaX < 0) {
      setSwipeOffset(Math.max(deltaX, -100));
    } else {
      setSwipeOffset(0);
    }
  };

  const handleTouchEnd = (e) => {
    setIsTransitioning(true);
    if (swipeOffset < -45) {
      setSwipeOffset(-80);
    } else {
      setSwipeOffset(0);
      const finalX = e.changedTouches[0].clientX;
      if (Math.abs(finalX - startX) < 5) {
        setIsExpanded(!isExpanded);
      }
    }
  };

  return (
    <div 
      className="relative overflow-hidden rounded-[2rem] shadow-md select-none group"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Underlying Swipe Delete Action Panel */}
      <div 
        onClick={() => deleteMeal(meal.id)}
        className="absolute top-0 right-0 h-full w-24 bg-rose-500 hover:bg-rose-600 flex flex-col items-center justify-center text-white active:scale-95 transition-all select-none cursor-pointer z-0 rounded-[2rem]"
      >
        <Trash2 className="w-5 h-5 text-white animate-pulse mb-1" />
        <span className="text-[9px] font-black uppercase tracking-widest text-white/90">Delete</span>
      </div>

      {/* Swipeable Foreground Card Body */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`rounded-[2rem] border transition-all duration-300 cursor-pointer z-10 relative ${
          theme === 'dark' 
            ? 'bg-slate-900/45 border-white/5 hover:border-indigo-500/30 backdrop-blur-xl' 
            : 'bg-white/45 border-slate-200/50 hover:border-indigo-500/20 shadow-sm backdrop-blur-xl'
        }`}
        style={{
          transform: `translate3d(${swipeOffset}px, 0, 0)`,
          transition: isTransitioning ? 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none'
        }}
      >
        <div className={`absolute top-0 left-0 w-1.5 h-full transition-all duration-300 ${
          isExpanded ? 'bg-indigo-500' : 'bg-indigo-600 opacity-0 group-hover:opacity-100'
        }`}></div>

        <div className="p-5 flex justify-between items-center select-none">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                theme === 'dark' ? 'bg-slate-950 text-indigo-400' : 'bg-indigo-50 text-indigo-650'
              }`}>
                {hasMultipleItems ? `${meal.items.length} Items` : "Single Item"}
              </span>
              <span className={`text-[9px] font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                {mealTime}
              </span>
            </div>
            <h4 className={`font-black text-base truncate transition-colors leading-tight ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              {mealName}
            </h4>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className={`text-xl font-black leading-none tracking-tight ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-650'}`}>
                {mealCals.toLocaleString()}
              </div>
              <div className={`text-[8px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                kcal
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${
              isExpanded ? 'rotate-90 text-indigo-500' : ''
            }`} />
          </div>
        </div>

        <div 
          onClick={(e) => e.stopPropagation()}
          className={`transition-all duration-300 ease-out overflow-hidden border-t ${
            theme === 'dark' ? 'border-slate-800/50' : 'border-slate-100'
          } ${
            isExpanded ? 'max-h-[600px] opacity-100 p-5 pt-4 bg-slate-950/20' : 'max-h-0 opacity-0 pointer-events-none'
          }`}
        >
          <div className="space-y-3 mb-5">
            <div className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
              Ingredient Breakdown
            </div>
            
            {meal.items && meal.items.length > 0 ? (
              <div className={`rounded-2xl p-3 border space-y-2 ${
                theme === 'dark' ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200/50'
              }`}>
                {meal.items.map((it, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className={`font-bold truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                        {it.name.split(' (')[0]}
                      </span>
                      <span className={`text-[9px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                        Qty: {it.quantity}x • {it.weight ? `${it.weight}g` : 'Standard portion'}
                      </span>
                    </div>
                    <span className={`font-black shrink-0 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-650'}`}>
                      {Math.round(it.calcCals)} kcal
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-xs italic p-3 rounded-2xl border text-center ${
                theme === 'dark' ? 'text-slate-550 border-slate-800' : 'text-slate-400 border-slate-200'
              }`}>
                No item details parsed
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className={`p-2 rounded-xl border text-center ${
              theme === 'dark' ? 'bg-slate-950/20 border-slate-800/60' : 'bg-slate-50 border-slate-200/50'
            }`}>
              <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest">Protein</span>
              <div className={`text-xs font-black mt-0.5 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                {pVal}g
              </div>
            </div>
            <div className={`p-2 rounded-xl border text-center ${
              theme === 'dark' ? 'bg-slate-950/20 border-slate-800/60' : 'bg-slate-50 border-slate-200/50'
            }`}>
              <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest">Carbs</span>
              <div className={`text-xs font-black mt-0.5 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                {cVal}g
              </div>
            </div>
            <div className={`p-2 rounded-xl border text-center ${
              theme === 'dark' ? 'bg-slate-950/20 border-slate-800/60' : 'bg-slate-50 border-slate-200/50'
            }`}>
              <span className="text-[8px] font-bold text-amber-400 uppercase tracking-widest">Fats</span>
              <div className={`text-xs font-black mt-0.5 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                {fVal}g
              </div>
            </div>
          </div>

          {date === todayString && (
            <div className={`flex items-center justify-between p-2.5 rounded-2xl border mb-5 ${
              theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200/60'
            }`}>
              <span className={`text-[9px] font-black uppercase tracking-widest pl-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                Portions
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateMealPortion(meal.id, -0.5)}
                  className={`w-7 h-7 flex items-center justify-center rounded-full border transition-all active:scale-90 ${
                    theme === 'dark' 
                      ? 'border-slate-800 text-indigo-500 hover:bg-indigo-500 hover:text-white' 
                      : 'border-slate-200 text-indigo-600 hover:bg-indigo-600 hover:text-white'
                  }`}
                >
                  <span className="text-sm font-black">−</span>
                </button>
                <span className={`text-xs font-black w-6 text-center ${theme === 'dark' ? 'text-white' : 'text-slate-850'}`}>
                  {meal.portionMultiplier || 1}x
                </span>
                <button
                  onClick={() => updateMealPortion(meal.id, 0.5)}
                  className={`w-7 h-7 flex items-center justify-center rounded-full border transition-all active:scale-90 ${
                    theme === 'dark' 
                      ? 'border-slate-800 text-indigo-500 hover:bg-indigo-500 hover:text-white' 
                      : 'border-slate-200 text-indigo-600 hover:bg-indigo-600 hover:text-white'
                  }`}
                >
                  <span className="text-sm font-black">+</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center border-t pt-3 border-slate-800/30">
            <span className={`text-[8px] font-black uppercase tracking-widest ${
              theme === 'dark' ? 'text-emerald-500/80' : 'text-emerald-600'
            }`}>
              ✓ Cloud Synced
            </span>
            <button
              onClick={() => deleteMeal(meal.id)}
              className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all active:scale-90 shadow-sm ${
                theme === 'dark' 
                  ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' 
                  : 'bg-red-50 border-red-100 text-red-650 hover:bg-red-100'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Log
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalorieGoalAdjuster({ value, onChange, theme }) {
  const pVal = Math.round((value * 0.20) / 4);
  const cVal = Math.round((value * 0.50) / 4);
  const fVal = Math.round((value * 0.30) / 9);

  return (
    <div className={`rounded-[2.5rem] p-6 border shadow-2xl backdrop-blur-xl transition-all duration-305 ${
      theme === 'dark' 
        ? 'bg-slate-900/40 border-white/5 shadow-indigo-950/20' 
        : 'bg-white/40 border-slate-200/50 shadow-slate-100'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${theme === 'dark' ? 'bg-indigo-950/40 text-indigo-400' : 'bg-indigo-50 text-indigo-650'}`}>
            <Settings className="w-4 h-4 text-indigo-500 animate-spin-slow" />
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Target Adjuster
          </span>
        </div>
        <span className={`text-xl font-black ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-650'}`}>
          {value.toLocaleString()} kcal
        </span>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <input 
            type="range" 
            min="1500" 
            max="5000" 
            step="50" 
            value={value} 
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 transition-all focus:outline-none"
          />
          <div className="flex justify-between text-[8px] font-bold text-slate-500 dark:text-slate-650 mt-1 select-none">
            <span>1,500 kcal</span>
            <span>3,000 (Ideal)</span>
            <span>5,000 kcal</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/10 dark:border-slate-850">
          <div className="text-center">
            <span className="text-[8px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest block">Protein (20%)</span>
            <span className={`text-sm font-black transition-all ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
              {pVal}g
            </span>
          </div>
          <div className="text-center">
            <span className="text-[8px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-widest block">Carbs (50%)</span>
            <span className={`text-sm font-black transition-all ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
              {cVal}g
            </span>
          </div>
          <div className="text-center">
            <span className="text-[8px] font-black text-amber-500 dark:text-amber-400 uppercase tracking-widest block">Fats (30%)</span>
            <span className={`text-sm font-black transition-all ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
              {fVal}g
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalorieProgressRing({ current, target, theme }) {
  const percentage = target > 0 ? (current / target) * 100 : 0;
  const displayPercentage = Math.round(percentage);
  
  const isSurplus = current > target;
  const isClose = current >= target * 0.9 && current <= target;

  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  // Cap the visualization circle progress at 100%
  const strokeDashoffset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  let strokeColor = "#6366f1"; // Indigo-500
  let glowColor = "rgba(99, 102, 241, 0.4)";
  let ringAnimation = "";

  if (isSurplus) {
    strokeColor = "#ef4444"; // Red-500
    glowColor = "rgba(239, 68, 68, 0.6)";
    ringAnimation = "animate-pulse";
  } else if (isClose) {
    strokeColor = "#f59e0b"; // Amber-500
    glowColor = "rgba(245, 158, 11, 0.5)";
    ringAnimation = "animate-pulse";
  }

  return (
    <div className={`rounded-[2.5rem] p-8 border shadow-2xl relative overflow-hidden text-center group transition-all duration-300 backdrop-blur-xl ${
      theme === 'dark' 
        ? 'bg-slate-900/40 border-white/5 shadow-indigo-950/20' 
        : 'bg-white/45 border-slate-200/50 shadow-slate-100'
    }`}>
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-600/10 transition-colors duration-700"></div>

      <div className={`text-[10px] font-black tracking-[0.2em] uppercase mb-6 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Daily Surplus Status</div>

      <div className="flex justify-center items-center mb-6">
        <div className="relative flex items-center justify-center w-40 h-40">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              className={`${theme === 'dark' ? 'stroke-slate-800/80' : 'stroke-slate-100'} fill-none`}
              strokeWidth={strokeWidth}
            />
            {/* Foreground circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={`${ringAnimation}`}
              style={{
                transition: "stroke-dashoffset 600ms cubic-bezier(0.16, 1, 0.3, 1), stroke 600ms cubic-bezier(0.16, 1, 0.3, 1)",
                filter: `drop-shadow(0 0 10px ${glowColor})`,
              }}
            />
          </svg>
 
          {/* Absolute text container inside the circle */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-[9px] font-black tracking-widest uppercase mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Intake</span>
            <div className="relative inline-block leading-none">
              <span className={`text-4xl font-black tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                <AnimatedNumber value={current} />
              </span>
            </div>
            <span className={`text-[10px] font-bold mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              of {target.toLocaleString()} kcal
            </span>
          </div>
        </div>
      </div>
 
      <div className="flex justify-center">
        <div className={`px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase flex items-center gap-1.5 transition-all ${
          isSurplus 
            ? 'bg-rose-500/10 text-rose-500 animate-pulse border border-rose-500/20' 
            : isClose 
              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
              : 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20'
        }`}>
          {isSurplus ? (
            <>
              <svg className="w-3.5 h-3.5 fill-current animate-bounce" viewBox="0 0 24 24">
                <path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6zm-1 4v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
              </svg>
              Surplus Met (+{Math.round(current - target)} kcal)
            </>
          ) : isClose ? (
            <>
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M17.66 11.57c-.77-.77-1.9-1.08-2.92-1.02.77-1.42.45-3.23-.78-4.46-1.23-1.23-3.2-1.42-4.63-.44.07-.95-.23-1.92-.98-2.67-1.2-1.2-3.14-1.2-4.34 0C2.8 4.2 2.8 6.14 4 7.34c.75.75 1.72 1.05 2.67.98-1 1.43-.8 3.4.43 4.63 1.23 1.23 3.04 1.55 4.46.78-.06 1.02.25 2.15 1.02 2.92.77.77 1.9.98 2.92.92-.77 1.42-.45 3.23.78 4.46 1.23 1.23 3.2 1.42 4.63.44-.07.95.23 1.92.98 2.67 1.2 1.2 3.14 1.2 4.34 0 1.2-1.2 1.2-3.14 0-4.34-.75-.75-1.72-1.05-2.67-.98 1-1.43.8-3.4-.43-4.63-1.23-1.23-3.04-1.55-4.46-.78z"/>
              </svg>
              Almost There!
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {displayPercentage}% Active Surplus Goal
            </>
          )}
        </div>
      </div>
    </div>
  );
}
 
function MacroCircle({ label, current, target, colorClass, strokeColor, theme }) {
  const percentage = target > 0 ? (current / target) * 100 : 0;
  const displayPercentage = Math.round(percentage);
  
  const isSurplus = current > target;
  const isClose = current >= target * 0.9 && current <= target;
 
  const radius = 34;
  const strokeWidth = 7;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(percentage, 100) / 100) * circumference;
 
  let activeStrokeColor = strokeColor;
  let animationClass = "";
  let glowColor = "";
 
  if (isSurplus) {
    activeStrokeColor = "#ef4444"; // Vivid Red
    animationClass = "animate-pulse";
    glowColor = "rgba(239, 68, 68, 0.4)";
  } else if (isClose) {
    activeStrokeColor = "#f59e0b"; // Amber/Yellow
    animationClass = "animate-pulse";
    glowColor = "rgba(245, 158, 11, 0.4)";
  } else {
    glowColor = strokeColor + "33"; // 20% opacity glow
  }
 
  return (
    <div className={`flex flex-col items-center justify-center p-4 rounded-[2rem] border transition-all duration-300 backdrop-blur-xl ${
      theme === 'dark' 
        ? 'bg-slate-900/40 border-white/5 shadow-indigo-950/20' 
        : 'bg-white/45 border-slate-200/50 shadow-slate-100 hover:shadow-md'
    }`}>
      <span className={`text-[10px] font-black uppercase tracking-widest mb-3 ${colorClass}`}>{label}</span>
      
      <div className="relative flex items-center justify-center w-20 h-20">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="40"
            cy="40"
            r={radius}
            className={`${theme === 'dark' ? 'stroke-slate-800/80' : 'stroke-slate-100'} fill-none`}
            strokeWidth={strokeWidth}
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={activeStrokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`${animationClass}`}
            style={{
              transition: "stroke-dashoffset 600ms cubic-bezier(0.16, 1, 0.3, 1), stroke 600ms cubic-bezier(0.16, 1, 0.3, 1)",
              filter: `drop-shadow(0 0 5px ${glowColor})`,
            }}
          />
        </svg>
 
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-base font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
            <AnimatedNumber value={current} />g
          </span>
          <span className="text-[8px] font-bold text-slate-500 leading-none">
            / {target}g
          </span>
        </div>
      </div>

      <div className={`text-[9px] font-black mt-3 px-2 py-0.5 rounded-full transition-all ${
        isSurplus 
          ? 'bg-rose-500/10 text-rose-500 animate-pulse border border-rose-500/10' 
          : isClose 
            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/10' 
            : theme === 'dark' 
              ? 'bg-slate-950 text-slate-400 border border-slate-800' 
              : 'bg-slate-50 text-slate-500 border border-slate-200'
      }`}>
        {displayPercentage}%
      </div>
    </div>
  );
}

function MacroBreakdown({ stats, theme }) {
  const { protein, carbs, fats } = stats;
  const totalGrams = protein + carbs + fats;

  const pPct = totalGrams > 0 ? Math.round((protein / totalGrams) * 100) : 33;
  const cPct = totalGrams > 0 ? Math.round((carbs / totalGrams) * 100) : 34;
  const fPct = totalGrams > 0 ? Math.max(0, 100 - pPct - cPct) : 33; // Ensure it sums to 100%

  const pAngle = (pPct / 100) * 360;
  const cAngle = (cPct / 100) * 360;

  const gradientStyle = {
    background: totalGrams > 0 
      ? `conic-gradient(#6366f1 0deg ${pAngle}deg, #10b981 ${pAngle}deg ${pAngle + cAngle}deg, #f59e0b ${pAngle + cAngle}deg 360deg)`
      : theme === 'dark'
        ? `conic-gradient(#334155 0deg 360deg)`
        : `conic-gradient(#e2e8f0 0deg 360deg)`
  };

  return (
    <div className={`rounded-[2.5rem] p-6 border shadow-xl transition-all duration-300 backdrop-blur-xl ${
      theme === 'dark' 
        ? 'bg-slate-900/40 border-white/5 shadow-indigo-950/20 shadow-2xl' 
        : 'bg-white/45 border-slate-200/50 shadow-slate-100 shadow-sm'
    }`}>
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 rounded-xl transition-all ${theme === 'dark' ? 'bg-indigo-950/40 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
        </div>
        <h3 className={`font-black text-xs uppercase tracking-widest ${theme === 'dark' ? 'text-indigo-300' : 'text-indigo-600'}`}>Macro Split Ratio</h3>
      </div>

      {totalGrams === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-24 h-24 rounded-full flex items-center justify-center relative mb-4" style={gradientStyle}>
            <div className={`w-18 h-18 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-slate-900 text-slate-700' : 'bg-white text-slate-300'}`}>
              <svg className="w-5 h-5 opacity-40 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <p className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
            Log meals to see your daily macro ratio split!
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-6">
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-full flex items-center justify-center relative shadow-lg" style={gradientStyle}>
              <div className={`w-18 h-18 rounded-full flex flex-col items-center justify-center shadow-inner transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
                <span className={`text-[8px] font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Total</span>
                <span className="text-sm font-black text-slate-800 dark:text-white">{totalGrams}g</span>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></span>
                <span className={`text-xs font-black ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Protein</span>
              </div>
              <span className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{pPct}% ({protein}g)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span className={`text-xs font-black ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Carbs</span>
              </div>
              <span className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{cPct}% ({carbs}g)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                <span className={`text-xs font-black ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Fats</span>
              </div>
              <span className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{fPct}% ({fats}g)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  // --- STATE MANAGEMENT ---
  const [meals, setMeals] = useState([]);
  const [targetCalories, setTargetCalories] = useState(() => {
    return Number(localStorage.getItem('wozan-target-calories')) || 3000;
  });

  const TARGET_CALORIES = targetCalories;
  const PROTEIN_TARGET = Math.round((targetCalories * 0.20) / 4);
  const CARBS_TARGET = Math.round((targetCalories * 0.50) / 4);
  const FATS_TARGET = Math.round((targetCalories * 0.30) / 9);

  useEffect(() => {
    localStorage.setItem('wozan-target-calories', targetCalories);
  }, [targetCalories]);

  const [customFoods, setCustomFoods] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'add', 'history', 'admin'
  const [inputText, setInputText] = useState('');
  const [parsedItems, setParsedItems] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isParsingAI, setIsParsingAI] = useState(false);

  // Theme State & Persistence
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('wozan-theme') || 'dark';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.className = "bg-slate-950 text-slate-100 transition-colors duration-300";
    } else {
      document.documentElement.classList.remove('dark');
      document.body.className = "bg-slate-50 text-slate-800 transition-colors duration-300";
    }
    localStorage.setItem('wozan-theme', theme);
  }, [theme]);

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

  const handleTextChange = (e) => {
    setInputText(e.target.value);
  };

  const parseWithAI = async () => {
    if (!inputText.trim()) return;
    setIsParsingAI(true);
    
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        alert("Please add VITE_GEMINI_API_KEY to your .env file!");
        setIsParsingAI(false);
        return;
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `You are a strict food parsing API. Parse the following text into a JSON array of objects. 
Each object must have exactly these keys: "food_name" (string), "weight_g" (number).
Do not output anything else except the JSON array. No conversational prose, no markdown formatting.
If the user specifies cups or other units, convert them to an approximate weight_g (e.g. 1 cup rice = 150g).
For items naturally counted (e.g. 2 eggs), output weight_g as the count (e.g. 2).

User Input: "${inputText}"`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      // Clean up markdown formatting if any
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      const parsedData = JSON.parse(text);
      
      const allFoods = [...FOOD_DB, ...customFoods];
      let matchedItems = [];

      parsedData.forEach(item => {
        let bestMatch = null;
        for (const food of allFoods) {
           const foodName = food.name.toLowerCase();
           const searchName = item.food_name.toLowerCase();
           if (foodName.includes(searchName) || searchName.includes(foodName.split(' (')[0])) {
              bestMatch = food;
              break;
           }
        }
        
        if (!bestMatch) {
            for (const food of allFoods) {
               if (food.keywords && food.keywords.some(kw => item.food_name.toLowerCase().includes(kw))) {
                   bestMatch = food;
                   break;
               }
            }
        }
        
        if (bestMatch) {
            let qty = 1;
            const weight = item.weight_g;
            if (bestMatch.name.includes('(100g)')) {
                qty = weight / 100;
            } else if (bestMatch.unit === 'cup') {
                qty = weight / 150;
            } else if (bestMatch.unit === 'qty') {
                qty = weight; // Assume AI parsed it as count
            } else {
                qty = weight / 100; // Default heuristic
            }
            
            matchedItems.push({
              ...bestMatch,
              quantity: Number(qty.toFixed(2)),
              calcCals: bestMatch.calories * qty,
              calcP: bestMatch.protein * qty,
              calcC: bestMatch.carbs * qty,
              calcF: bestMatch.fats * qty
            });
        }
      });
      
      setParsedItems(matchedItems);
      
      if (matchedItems.length > 0) {
          await logMeal(matchedItems);
      } else {
          alert("Could not match any foods from your database.");
      }
    } catch (err) {
      console.error("AI Parsing Error:", err);
      alert("Failed to parse with AI. " + err.message);
    }
    setIsParsingAI(false);
  };

  const logMeal = async (itemsToLog = null) => {
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

    // If AI provides itemsToLog directly, use them (and combine with quick select if needed)
    const activeParsedItems = itemsToLog && Array.isArray(itemsToLog) ? itemsToLog : parsedItems;
    const finalItems = [...activeParsedItems, ...quickSelectItems];

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
      const { data, error } = await supabase
        .from('meals')
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        console.error("PGRST Error (deleteMeal):", error);
        alert(`Failed to delete meal: ${error.message || JSON.stringify(error)}`);
        return;
      }

      if (!data || data.length === 0) {
        console.error("Delete failed: No rows were returned (Possible RLS issue or incorrect ID).");
        alert("Delete failed: No matching record found in the database. You might not have permission or it was already deleted.");
        return;
      }

      // Sync Check: Only remove from local state after confirming successful DB deletion
      setMeals(meals.filter(m => m.id !== id));
    } catch (err) {
      console.error("Unexpected deleteMeal error:", err);
      alert(`Unexpected error deleting meal: ${err.message || String(err)}`);
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
      const { data, error } = await supabase
        .from('foods')
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        console.error("PGRST Error (deleteFood):", error);
        alert(`Failed to delete custom food: ${error.message || JSON.stringify(error)}`);
        return;
      }

      if (!data || data.length === 0) {
        console.error("Delete failed: No rows were returned (Possible RLS issue or incorrect ID).");
        alert("Delete failed: No matching record found in the database. You might not have permission or it was already deleted.");
        return;
      }

      setCustomFoods(customFoods.filter(f => f.id !== id));
    } catch (err) {
      console.error("Unexpected deleteFood error:", err);
      alert(`Unexpected error deleting food: ${err.message || String(err)}`);
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
  const dynamicAdvice = useMemo(() => {
    const hour = new Date().getHours();
    
    // Calculate fat limit implicitly if not defined:
    const FAT_TARGET = Math.round((TARGET_CALORIES - (PROTEIN_TARGET * 4) - (CARBS_TARGET * 4)) / 9) || 100;
    
    // Rule C (On Track)
    if (Math.abs(TARGET_CALORIES - stats.calories) <= 100) {
      return {
        text: "Perfect execution today! Your macros are dialed in for recovery.",
        icon: <CheckCircle2 className="w-5 h-5 text-indigo-400" />
      };
    }

    // Rule A (Calorie Deficit)
    if (TARGET_CALORIES - stats.calories > 500 && hour >= 18) {
      let highestCalFood = null;
      let maxCals = -1;
      const allFoods = [...FOOD_DB, ...customFoods];
      for (const f of allFoods) {
        if (f.calories > maxCals) {
          maxCals = f.calories;
          highestCalFood = f;
        }
      }
      const foodName = highestCalFood ? highestCalFood.name.split(' (')[0] : 'Peanut Butter';
      return {
        text: `You have room to grow! Consider adding a portion of ${foodName} to hit your target.`,
        icon: <Coffee className="w-5 h-5 text-amber-400" />
      };
    }

    // Rule B (Macro Mismatch)
    if (stats.fats >= (FAT_TARGET * 0.8) && stats.protein < PROTEIN_TARGET * 0.8) {
      return {
        text: "Macro Alert: You're hitting your fat limits. Focus on clean protein like Chicken Breast for the rest of the day.",
        icon: <AlertCircle className="w-5 h-5 text-rose-400" />
      };
    }

    // Fallback Advice
    if (stats.protein < PROTEIN_TARGET * 0.8) {
      return {
        text: "Eat some Steak or a Protein Shake to hit your muscle recovery goal.",
        icon: <Zap className="w-5 h-5 text-indigo-400" />
      };
    }

    if (stats.carbs < CARBS_TARGET * 0.8) {
      return {
        text: "Add Oats or Rice to your next meal for training energy.",
        icon: <Flame className="w-5 h-5 text-emerald-400" />
      }
    }

    return {
      text: "You're on track! Keep hitting those macros for consistent gains.",
      icon: <CheckCircle2 className="w-5 h-5 text-indigo-400" />
    };
  }, [stats.calories, stats.protein, stats.carbs, stats.fats, customFoods]);

  const currentAdvice = dynamicAdvice;

  // --- STREAK COUNTER ---
  const streakCount = useMemo(() => {
    if (!Array.isArray(meals) || meals.length === 0) return 0;
    
    const uniqueDates = [...new Set(meals.map(m => m.date || (m.created_at ? m.created_at.split('T')[0] : '')))]
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a));

    const todayDate = new Date();
    // Use local time for dates to avoid timezone shifts
    const offset = todayDate.getTimezoneOffset()
    todayDate.setMinutes(todayDate.getMinutes() - offset);
    const todayStr = todayDate.toISOString().split('T')[0];
    
    let streak = 0;
    let currentDate = new Date(todayDate);
    
    if (!uniqueDates.includes(todayStr)) {
        const yesterdayDate = new Date(todayDate);
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
        if (!uniqueDates.includes(yesterdayStr)) {
            return 0;
        }
        currentDate = yesterdayDate;
    }

    while (true) {
        const dateStr = currentDate.toISOString().split('T')[0];
        if (uniqueDates.includes(dateStr)) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
  }, [meals]);

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
    <div className={`min-h-screen font-sans pb-28 transition-colors duration-300 relative overflow-x-hidden ${theme === 'dark' ? 'bg-slate-950 text-slate-100 selection:bg-indigo-500/30' : 'bg-slate-50 text-slate-800 selection:bg-indigo-500/10'}`}>

      {/* Glassmorphism Glowing Neon Background Blobs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-20%] w-[80vw] h-[80vw] rounded-full bg-indigo-600/8 dark:bg-indigo-600/4 blur-[120px] animate-pulse duration-[8s]"></div>
        <div className="absolute bottom-[-10%] right-[-20%] w-[80vw] h-[80vw] rounded-full bg-emerald-600/8 dark:bg-emerald-600/4 blur-[120px] animate-pulse duration-[10s]"></div>
      </div>

      {/* Top App Bar */}
      <div className={`backdrop-blur-xl border-b p-4 sticky top-0 z-30 flex items-center justify-between transition-all duration-300 ${theme === 'dark' ? 'bg-slate-950/80 border-slate-800/50 shadow-lg text-white' : 'bg-white/80 border-slate-200/50 shadow-sm text-slate-900'}`}>
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.5)]">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h1 className={`text-xl font-black tracking-tighter transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            WOZAN
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Streak Counter Badge */}
          {currentView === 'dashboard' && (
            <div className={`px-3 py-1.5 rounded-full border text-xs font-black tracking-widest uppercase flex items-center gap-1.5 transition-all duration-300 ${
              streakCount > 0 
                ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' 
                : theme === 'dark' 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-400' 
                  : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}>
              {streakCount > 0 ? (
                <>
                  <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                  {streakCount} Day Streak
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  No Streak
                </>
              )}
            </div>
          )}

          {/* Sleek Theme Toggle Switch */}
          <button
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            className={`p-2 rounded-xl border transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
              theme === 'dark'
                ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-indigo-600 hover:bg-slate-50'
            }`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className={`fixed inset-0 backdrop-blur-sm z-[100] flex items-center justify-center transition-all ${theme === 'dark' ? 'bg-slate-950/80' : 'bg-white/80'}`}>
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            <p className="text-indigo-500 font-black text-xs uppercase tracking-[0.2em]">Syncing Cloud...</p>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="p-5 max-w-md mx-auto w-full">

        {/* VIEW: DASHBOARD */}
        {currentView === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Weekly Consistency Matrix */}
            <WeeklyMatrix meals={meals} theme={theme} targetCalories={TARGET_CALORIES} />

            {/* Custom Glowing Calorie Progress Ring */}
            <CalorieProgressRing current={stats.calories} target={TARGET_CALORIES} theme={theme} />

            {/* Custom Circular Macro Progress rings */}
            <div className="grid grid-cols-3 gap-3">
              <MacroCircle 
                label="Protein" 
                current={stats.protein} 
                target={PROTEIN_TARGET} 
                colorClass="text-indigo-500 dark:text-indigo-400" 
                strokeColor="#6366f1"
                theme={theme}
              />
              <MacroCircle 
                label="Carbs" 
                current={stats.carbs} 
                target={CARBS_TARGET} 
                colorClass="text-emerald-500 dark:text-emerald-400" 
                strokeColor="#10b981"
                theme={theme}
              />
              <MacroCircle 
                label="Fats" 
                current={stats.fats} 
                target={FATS_TARGET} 
                colorClass="text-amber-500 dark:text-amber-400" 
                strokeColor="#f59e0b"
                theme={theme}
              />
            </div>

            {/* Conic-gradient Macro Ratio Breakdown Donut Chart */}
            <MacroBreakdown stats={stats} theme={theme} />

            {/* Mass Builder Advice Section */}
            <div className={`border rounded-[2.5rem] p-6 transition-all duration-300 backdrop-blur-xl ${
              theme === 'dark' 
                ? 'bg-indigo-950/20 border-indigo-500/10 text-slate-200' 
                : 'bg-indigo-50/40 border-indigo-100 text-slate-800 shadow-sm'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-indigo-950/40 text-indigo-400' : 'bg-indigo-100/50 text-indigo-600'}`}>
                  {currentAdvice.icon}
                </div>
                <h3 className={`font-black text-xs uppercase tracking-widest ${theme === 'dark' ? 'text-indigo-300' : 'text-indigo-600'}`}>Mass Builder Advice</h3>
              </div>
              <p className={`text-sm font-medium leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
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
              <h2 className={`text-3xl font-black mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Log Meal</h2>
              <p className={`font-medium mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Type naturally or use the Quick Add below</p>

              <div className="relative group">
                <textarea
                  value={inputText}
                  onChange={handleTextChange}
                  placeholder="e.g., 200g chicken breast and 1 cup of white rice..."
                  className={`w-full h-32 border-2 rounded-[2rem] p-6 focus:outline-none transition-all shadow-2xl resize-none text-xl font-medium backdrop-blur-xl ${
                    theme === 'dark' 
                      ? 'bg-slate-900/40 border-white/5 text-white placeholder-slate-700 focus:border-indigo-500' 
                      : 'bg-white/45 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500 shadow-md'
                  }`}
                  disabled={isParsingAI}
                />
                <div className="absolute right-6 bottom-6">
                  <button 
                    onClick={parseWithAI}
                    disabled={inputText.length < 2 || isParsingAI}
                    className={`p-3 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                      inputText.length > 1 && !isParsingAI 
                        ? 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 cursor-pointer' 
                        : theme === 'dark'
                          ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isParsingAI ? (
                      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <Utensils className="w-6 h-6" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Add Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className={`text-sm font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Quick Add</h3>
                <button
                  onClick={() => {
                    const reset = {};
                    Object.keys(quickQuantities).forEach(k => reset[k] = 0);
                    setQuickQuantities(reset);
                  }}
                  className={`text-[10px] font-black uppercase tracking-widest transition-colors ${theme === 'dark' ? 'text-slate-500 hover:text-indigo-400' : 'text-slate-400 hover:text-indigo-600'}`}
                >
                  Reset All
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[...FOOD_DB, ...customFoods].map((food) => (
                  <div key={food.name} className={`rounded-[2rem] p-5 border shadow-xl flex flex-col items-center gap-4 group transition-all relative ${
                    theme === 'dark' 
                      ? 'bg-slate-900 border-slate-800/50 hover:border-indigo-500/30' 
                      : 'bg-white border-slate-100 hover:border-indigo-500/20 shadow-sm hover:shadow-md'
                  }`}>
                    <div className="text-center w-full">
                      <div className={`text-sm font-black leading-tight mb-1 truncate px-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{food.name.split(' (')[0]}</div>
                      <div className={`text-[10px] font-bold uppercase tracking-tighter ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{food.calories} kcal</div>
                    </div>

                    <div className={`flex items-center justify-between w-full p-1.5 rounded-full border ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <button
                        onClick={() => updateQuickQty(food.name, -1)}
                        className={`w-11 h-11 min-w-[44px] flex items-center justify-center rounded-full border-2 transition-all active:scale-90 ${
                          theme === 'dark' 
                            ? 'border-slate-800 text-slate-500 hover:border-indigo-500 hover:text-indigo-400' 
                            : 'border-slate-200 text-slate-400 hover:border-indigo-500 hover:text-indigo-600'
                        }`}
                      >
                        <span className="text-2xl font-light">−</span>
                      </button>
                      <div className={`text-lg font-black px-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                        {quickQuantities[food.name] || 0}
                      </div>
                      <button
                        onClick={() => updateQuickQty(food.name, 1)}
                        className={`w-11 h-11 min-w-[44px] flex items-center justify-center rounded-full border-2 transition-all active:scale-90 shadow-lg ${
                          theme === 'dark'
                            ? 'border-slate-800 text-indigo-500 hover:bg-indigo-600 hover:text-white hover:border-indigo-600'
                            : 'border-slate-200 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600'
                        }`}
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
                <div className={`rounded-[2.5rem] p-6 border-2 shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-4 pointer-events-auto animate-in slide-in-from-bottom-8 duration-500 ${
                  theme === 'dark' 
                    ? 'bg-slate-900 border-indigo-500/30' 
                    : 'bg-white border-indigo-500/20 shadow-[0_15px_35px_rgba(0,0,0,0.1)]'
                }`}>
                  <div className="flex items-center justify-between px-2">
                    <h3 className={`text-[10px] font-black tracking-widest uppercase italic ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>Ready to Log</h3>
                    <div className={`font-black text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {Math.round(
                        parsedItems.reduce((a, b) => a + b.calcCals, 0) +
                        [...FOOD_DB, ...customFoods].reduce((a, b) => a + (b.calories * (quickQuantities[b.name] || 0)), 0)
                      )} <span className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} font-bold`}>kcal</span>
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

            {inputText.trim().length > 2 && parsedItems.length === 0 && !Object.values(quickQuantities).some(v => v > 0) && !isParsingAI && (
              <div className={`flex items-center gap-4 text-sm p-6 rounded-[2rem] border border-dashed ${
                theme === 'dark' 
                  ? 'text-slate-400 bg-slate-900/50 border-slate-800' 
                  : 'text-slate-600 bg-white border-slate-200 shadow-sm'
              }`}>
                <AlertCircle className={`w-6 h-6 shrink-0 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`} />
                <span>No match yet. Type a meal and click the Utensils button to parse with AI.</span>
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
                <h2 className={`text-3xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>History</h2>
                <p className={`font-medium ${theme === 'dark' ? 'text-slate-550' : 'text-slate-400'}`}>Your progress over time</p>
              </div>
              <div className={`px-4 py-2 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all ${
                theme === 'dark' 
                  ? 'bg-slate-900 border-slate-800 text-indigo-400' 
                  : 'bg-white border-slate-200 text-indigo-600 shadow-sm'
              }`}>
                {meals.length} Logs
              </div>
            </div>

            {meals.length === 0 ? (
              <div className={`text-center py-20 rounded-[3rem] border-2 border-dashed ${
                theme === 'dark' 
                  ? 'text-slate-600 bg-slate-900 border-slate-800' 
                  : 'text-slate-400 bg-white border-slate-200 shadow-sm'
              }`}>
                <History className="w-16 h-16 mx-auto mb-4 opacity-10" />
                <p className="font-black uppercase tracking-widest text-sm">No data found</p>
              </div>
            ) : (
              dateKeys.map(date => (
                <div key={date} className="space-y-4">
                  <div className={`flex items-center justify-between sticky top-[72px] backdrop-blur-md py-3 z-20 border-b ${
                    theme === 'dark' ? 'bg-slate-950/95 border-slate-900' : 'bg-slate-50/95 border-slate-200'
                  }`}>
                    <h3 className={`text-sm font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                      {date === todayString ? 'Today' : date}
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className={`text-xs font-black ${
                          groupedMeals[date].metGoal 
                            ? 'text-emerald-550 dark:text-emerald-400' 
                            : theme === 'dark' 
                              ? 'text-slate-500' 
                              : 'text-slate-400'
                        }`}>
                          {groupedMeals[date].totalCals.toLocaleString()} / {TARGET_CALORIES}
                        </div>
                      </div>
                      {groupedMeals[date].metGoal ? (
                        <div className="bg-emerald-500/20 p-1 rounded-md">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                      ) : (
                        <div className={`p-1 rounded-md ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}>
                          <Info className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                        </div>
                      )}
                    </div>
                  </div>

                  {groupedMeals[date].meals.map(meal => (
                    <HistoryMealCard
                      key={meal.id}
                      meal={meal}
                      todayString={todayString}
                      date={date}
                      theme={theme}
                      updateMealPortion={updateMealPortion}
                      deleteMeal={deleteMeal}
                    />
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
              <h2 className={`text-3xl font-black mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>System Settings</h2>
              <p className={`font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Customize Wozan targets and smart engine</p>
            </div>

            {/* Interactive Calorie & Macro Target Adjuster */}
            <CalorieGoalAdjuster value={targetCalories} onChange={setTargetCalories} theme={theme} />

            <form onSubmit={handleAddCustomFood} className={`rounded-[2.5rem] p-8 border shadow-2xl space-y-6 transition-all duration-300 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl transition-all ${theme === 'dark' ? 'bg-indigo-950/40 text-indigo-400' : 'bg-indigo-50 text-indigo-650'}`}>
                  <Database className="w-5 h-5" />
                </div>
                <h3 className={`font-black text-xs uppercase tracking-widest ${theme === 'dark' ? 'text-indigo-300' : 'text-indigo-600'}`}>Add Custom Entry</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Food Name & Portion</label>
                  <input
                    type="text" required
                    value={newFood.name} onChange={e => setNewFood({ ...newFood, name: e.target.value })}
                    placeholder="e.g. Mass Gainer (2 scoops)"
                    className={`w-full border-2 rounded-2xl px-5 py-4 focus:outline-none transition-all font-bold ${
                      theme === 'dark' 
                        ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-700 focus:border-indigo-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Calories</label>
                    <input
                      type="number" required
                      value={newFood.calories} onChange={e => setNewFood({ ...newFood, calories: e.target.value })}
                      placeholder="kcal"
                      className={`w-full border-2 rounded-2xl px-5 py-4 focus:outline-none transition-all font-bold ${
                        theme === 'dark' 
                          ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-700 focus:border-indigo-500' 
                          : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-2">Protein (g)</label>
                    <input
                      type="number"
                      value={newFood.protein} onChange={e => setNewFood({ ...newFood, protein: e.target.value })}
                      placeholder="0"
                      className={`w-full border-2 rounded-2xl px-5 py-4 focus:outline-none transition-all font-bold ${
                        theme === 'dark' 
                          ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-700 focus:border-indigo-500' 
                          : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-2">Carbs (g)</label>
                    <input
                      type="number"
                      value={newFood.carbs} onChange={e => setNewFood({ ...newFood, carbs: e.target.value })}
                      placeholder="0"
                      className={`w-full border-2 rounded-2xl px-5 py-4 focus:outline-none transition-all font-bold ${
                        theme === 'dark' 
                          ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-700 focus:border-emerald-500' 
                          : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-2">Fats (g)</label>
                    <input
                      type="number"
                      value={newFood.fats} onChange={e => setNewFood({ ...newFood, fats: e.target.value })}
                      placeholder="0"
                      className={`w-full border-2 rounded-2xl px-5 py-4 focus:outline-none transition-all font-bold ${
                        theme === 'dark' 
                          ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-700 focus:border-amber-500' 
                          : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-amber-500'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className={`w-full font-black py-5 rounded-[2rem] shadow-xl transition-all active:scale-95 uppercase tracking-widest text-sm ${
                theme === 'dark' 
                  ? 'bg-white text-slate-950 hover:bg-indigo-50' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/25'
              }`}>
                Save to Database
              </button>
            </form>

            {customFoods.length > 0 && (
              <div className="space-y-4">
                <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] px-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Custom Library</h3>
                <div className="space-y-2">
                  {customFoods.map(food => (
                    <div key={food.id} className={`flex justify-between items-center p-5 rounded-[2rem] border shadow-lg transition-all ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'
                    }`}>
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl border transition-all ${theme === 'dark' ? 'bg-slate-955 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                          <Utensils className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                        </div>
                        <div>
                          <div className={`text-sm font-black ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{food.name}</div>
                          <div className={`text-[10px] font-bold uppercase mt-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                            {food.calories} kcal • {food.protein}P • {food.carbs}C
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteCustomFood(food.id)}
                        className={`p-3 transition-colors active:scale-90 ${theme === 'dark' ? 'text-slate-700 hover:text-red-500' : 'text-slate-450 hover:text-red-500'}`}
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
                className={`w-full flex items-center justify-center gap-3 py-5 rounded-[2rem] border font-black text-[10px] uppercase tracking-[0.2em] transition-all ${
                  theme === 'dark' 
                    ? 'border-red-500/20 bg-red-500/5 text-red-500/60 hover:bg-red-500/10' 
                    : 'border-red-200 bg-red-50/50 text-red-600 hover:bg-red-100/50 shadow-sm'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                Cloud Database Info
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className={`fixed bottom-0 w-full border-t grid grid-cols-4 px-4 py-3 pb-8 z-40 transition-all duration-300 ${
        theme === 'dark' 
          ? 'bg-slate-900/90 border-slate-800/50 text-white shadow-[0_-20px_50px_rgba(0,0,0,0.5)]' 
          : 'bg-white/90 border-slate-200/50 text-slate-800 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]'
      }`}>
        <button onClick={() => setCurrentView('dashboard')} className={`flex flex-col items-center justify-center gap-1.5 transition-all ${
          currentView === 'dashboard' 
            ? theme === 'dark' 
              ? 'text-indigo-400' 
              : 'text-indigo-650 font-black' 
            : 'text-slate-500 dark:text-slate-600'
        }`}>
          <Activity className={`w-6 h-6 ${currentView === 'dashboard' ? 'scale-110 drop-shadow-[0_0_12px_rgba(79,70,229,0.4)]' : ''} transition-all`} />
          <span className="text-[9px] font-black tracking-widest uppercase">Dash</span>
        </button>
        <button onClick={() => setCurrentView('add')} className={`flex flex-col items-center justify-center gap-1.5 transition-all ${
          currentView === 'add' 
            ? theme === 'dark' 
              ? 'text-indigo-400' 
              : 'text-indigo-650 font-black' 
            : 'text-slate-500 dark:text-slate-600'
        }`}>
          <PlusCircle className={`w-6 h-6 ${currentView === 'add' ? 'scale-110 drop-shadow-[0_0_12px_rgba(79,70,229,0.4)]' : ''} transition-all`} />
          <span className="text-[9px] font-black tracking-widest uppercase">Log</span>
        </button>
        <button onClick={() => setCurrentView('history')} className={`flex flex-col items-center justify-center gap-1.5 transition-all ${
          currentView === 'history' 
            ? theme === 'dark' 
              ? 'text-indigo-400' 
              : 'text-indigo-650 font-black' 
            : 'text-slate-500 dark:text-slate-600'
        }`}>
          <History className={`w-6 h-6 ${currentView === 'history' ? 'scale-110 drop-shadow-[0_0_12px_rgba(79,70,229,0.4)]' : ''} transition-all`} />
          <span className="text-[9px] font-black tracking-widest uppercase">Logs</span>
        </button>
        <button onClick={() => setCurrentView('admin')} className={`flex flex-col items-center justify-center gap-1.5 transition-all ${
          currentView === 'admin' 
            ? theme === 'dark' 
              ? 'text-indigo-400' 
              : 'text-indigo-650 font-black' 
            : 'text-slate-500 dark:text-slate-600'
        }`}>
          <Settings className={`w-6 h-6 ${currentView === 'admin' ? 'scale-110 drop-shadow-[0_0_12px_rgba(79,70,229,0.4)]' : ''} transition-all`} />
          <span className="text-[9px] font-black tracking-widest uppercase">Admin</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
