import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  Moon,
  Droplet,
  ShoppingCart,
  Users,
  TrendingUp,
  Mic,
  MicOff,
  Lock,
  Unlock,
  Camera,
  Layers,
  Terminal,
  ChevronUp,
  ChevronDown,
  RefreshCw
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
    }
  };

  const handleCardClick = (e) => {
    console.log("Card clicked:", meal.id);
    // Only toggle expansion if the card is not currently swiped/open
    if (swipeOffset >= -5) {
      setIsExpanded(!isExpanded);
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
        onClick={handleCardClick}
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

function HydrationTracker({ intake, setIntake, theme }) {
  const target = 3000;
  const percentage = Math.min((intake / target) * 100, 100);
  
  return (
    <div className={`rounded-[2.5rem] p-6 border shadow-xl relative overflow-hidden backdrop-blur-xl transition-all duration-300 ${
      theme === 'dark' ? 'bg-slate-900/40 border-white/5 shadow-blue-950/20' : 'bg-white/45 border-slate-200/50 shadow-slate-100'
    }`}>
      <div className="flex justify-between items-center z-10 relative mb-4">
        <div className="flex items-center gap-2">
           <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-500">
             <Droplet className="w-4 h-4" />
           </div>
           <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Hydration Canvas</span>
        </div>
        <span className="text-sm font-black text-blue-500">{intake} / {target} ml</span>
      </div>

      <div className={`relative w-full h-40 rounded-[2rem] overflow-hidden border shadow-inner transition-all ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100 border-slate-300'}`}>
        <div 
          className="absolute bottom-0 w-full transition-all duration-1000 ease-out flex items-center justify-center bg-blue-500"
          style={{ height: `${percentage}%` }}
        >
          <div className="absolute w-[200%] aspect-square bg-blue-400/40 rounded-[45%] bottom-[90%] left-[-50%] animate-[spin_6s_linear_infinite]" />
          <div className="absolute w-[200%] aspect-square bg-blue-500/40 rounded-[40%] bottom-[95%] left-[-50%] animate-[spin_8s_linear_infinite]" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
          <span className="text-2xl font-black text-white drop-shadow-md">Stay Hydrated</span>
        </div>
      </div>
      
      <div className="flex gap-3 mt-4">
        <button onClick={() => setIntake(prev => prev + 250)} className="flex-1 py-3 rounded-2xl bg-blue-500/10 text-blue-500 font-black text-sm border border-blue-500/20 hover:bg-blue-500/20 active:scale-95 transition-all">
          +250ml
        </button>
        <button onClick={() => setIntake(prev => prev + 500)} className="flex-1 py-3 rounded-2xl bg-blue-500 text-white font-black text-sm shadow-lg shadow-blue-500/30 hover:bg-blue-400 active:scale-95 transition-all">
          +500ml
        </button>
      </div>
    </div>
  );
}

function AICoachDrawer({ isOpen, onClose, stats, targetCalories, streak, theme, customFoods }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hey! I'm your Wozan AI Coach. Based on your live data, how can I help you optimize your gains today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        setMessages(prev => [...prev, { role: 'assistant', content: "Error: Please add VITE_GEMINI_API_KEY to your .env file." }]);
        setIsLoading(false);
        return;
      }
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const systemContext = `You are the Wozan AI Fitness & Nutrition Coach. Keep answers brief, actionable, and hyped! Use emojis.
Current User Live Data:
- Streak: ${streak} days
- Daily Goal: ${targetCalories} kcal
- Consumed Today: ${stats.calories} kcal (${stats.protein}g P / ${stats.carbs}g C / ${stats.fats}g F)
- Remaining Calories: ${Math.max(0, targetCalories - stats.calories)} kcal
- Available Foods Library: ${customFoods.map(f => f.name).join(', ')}`;

      const chatHistory = messages.map(m => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`).join('\n');
      
      const prompt = `${systemContext}\n\nChat History:\n${chatHistory}\nUser: ${userMessage}\nCoach:`;

      const result = await model.generateContent(prompt);
      const reply = await result.response.text();

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I ran into a network error connecting to the AI." }]);
    }
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col justify-end ${theme === 'dark' ? 'bg-slate-950/80' : 'bg-slate-900/40'} backdrop-blur-sm animate-in fade-in`}>
      <div className={`w-full h-[80vh] rounded-t-[2.5rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-full duration-300 ${theme === 'dark' ? 'bg-slate-900 border-t border-slate-800' : 'bg-white'}`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-800/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className={`font-black text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Wozan AI Coach</h3>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500'}`}>• Online</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-full ${theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-4 text-sm font-medium leading-relaxed shadow-sm ${
                m.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-sm' 
                  : theme === 'dark' 
                    ? 'bg-slate-800 text-slate-200 rounded-bl-sm' 
                    : 'bg-slate-100 text-slate-800 rounded-bl-sm'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className={`max-w-[85%] rounded-2xl p-4 text-sm font-medium shadow-sm rounded-bl-sm flex items-center gap-2 ${theme === 'dark' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-800'}`}>
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className={`p-4 border-t ${theme === 'dark' ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
          <div className={`flex items-center gap-2 rounded-full p-2 border ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'}`}>
            <input 
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Ask for advice or recipes..."
              className={`flex-1 bg-transparent border-none focus:outline-none px-4 text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}
              disabled={isLoading}
            />
            <button 
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className={`p-3 rounded-full transition-all flex items-center justify-center ${input.trim() && !isLoading ? 'bg-indigo-600 text-white' : 'bg-slate-500/20 text-slate-500'}`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlannerView({ customFoods, foodDb, theme, targets }) {
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateList = async () => {
    setLoading(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        alert("Please add VITE_GEMINI_API_KEY to your .env file!");
        setLoading(false);
        return;
      }
      
      const availableNames = [...foodDb, ...customFoods].map(f => f.name);
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `You are a nutrition and meal planning AI.
Based on the following food items available in the user's library:
${JSON.stringify(availableNames)}

The user has the following daily macro targets:
- Calories: ${targets.calories} kcal
- Protein: ${targets.protein}g
- Carbs: ${targets.carbs}g
- Fats: ${targets.fats}g

Generate a structured, interactive weekly grocery shopping list calibrated to help hit these exact daily macro targets.
Organize it into logical categories (e.g., Proteins, Carbs, Fats, Produce, etc.).
Recommend reasonable quantities for a week of meal prep.
Return ONLY a JSON object with a single key "categories" containing an array of objects.
Each object should have "name" (string) and "items" (array of strings with quantities).
Do not include markdown blocks around the JSON.`;

      const result = await model.generateContent(prompt);
      let text = await result.response.text();
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      setList(JSON.parse(text));
    } catch (err) {
      console.error(err);
      alert("Failed to generate list.");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className={`text-3xl font-black mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Planner</h2>
        <p className={`font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>AI Grocery Shopping List</p>
      </div>

      {!list ? (
        <div className={`rounded-[2.5rem] p-8 border shadow-xl text-center space-y-6 ${theme === 'dark' ? 'bg-slate-900/40 border-white/5' : 'bg-white/45 border-slate-200/50'}`}>
          <div className="mx-auto w-16 h-16 bg-indigo-500/20 text-indigo-500 rounded-full flex items-center justify-center">
            <ShoppingCart className="w-8 h-8" />
          </div>
          <p className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
            Let AI build your weekly grocery list based on your saved foods.
          </p>
          <button onClick={generateList} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black py-4 rounded-[2rem] shadow-lg transition-all flex items-center justify-center gap-2">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
            {loading ? "Generating..." : "Generate List"}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <button onClick={generateList} disabled={loading} className={`w-full py-3 rounded-2xl border font-black text-sm flex items-center justify-center gap-2 transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-indigo-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-indigo-600 hover:bg-slate-50'}`}>
            {loading ? <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" /> : <Zap className="w-4 h-4" />}
            Regenerate List
          </button>
          
          {list.categories?.map(cat => (
            <div key={cat.name} className={`rounded-[2rem] p-6 border shadow-lg ${theme === 'dark' ? 'bg-slate-900/40 border-white/5' : 'bg-white/45 border-slate-200/50'}`}>
              <h3 className={`text-sm font-black uppercase tracking-widest mb-4 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>{cat.name}</h3>
              <ul className="space-y-3">
                {cat.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <input type="checkbox" className="w-5 h-5 rounded-lg accent-indigo-500 cursor-pointer" />
                    <span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrendForecaster({ meals, targetCalories, theme }) {
  const [forecast, setForecast] = useState("");
  const [loading, setLoading] = useState(false);

  const generateForecast = async () => {
    setLoading(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) { setForecast("API Key missing."); setLoading(false); return; }

      const today = new Date();
      let last7DaysStats = [];
      for(let i=0; i<7; i++) {
         const d = new Date(today);
         d.setDate(d.getDate() - i);
         const dateStr = d.toISOString().split('T')[0];
         const dayMeals = meals.filter(m => (m.date || m.created_at.split('T')[0]) === dateStr);
         const cals = dayMeals.reduce((acc, m) => acc + Number(m.calories || 0), 0);
         last7DaysStats.push({ date: dateStr, calories: cals });
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `You are a premium AI fitness forecaster.
The user has a daily calorie target of ${targetCalories} kcal.
Here are their logged calories for the last 7 days:
${JSON.stringify(last7DaysStats, null, 2)}

Analyze this consistency trend. Write a short, premium, highly styled 2-3 sentence forecast predicting their progress over the next 2 weeks. Do not use markdown blocks around the text, just return the text. Be encouraging but realistic. Use a few emojis.`;

      const result = await model.generateContent(prompt);
      setForecast(result.response.text().trim());
    } catch (e) {
      console.error(e);
      setForecast("Failed to generate forecast due to an error.");
    }
    setLoading(false);
  };

  return (
    <div className={`rounded-[2.5rem] p-6 border shadow-xl relative overflow-hidden backdrop-blur-xl transition-all duration-300 ${
      theme === 'dark' ? 'bg-slate-900/40 border-white/5 shadow-indigo-950/20' : 'bg-white/45 border-slate-200/50 shadow-slate-100'
    }`}>
      <div className="flex justify-between items-center z-10 relative mb-4">
        <div className="flex items-center gap-2">
           <div className={`p-1.5 rounded-lg ${theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
             <TrendingUp className="w-4 h-4" />
           </div>
           <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Trend Forecaster</span>
        </div>
      </div>
      
      {!forecast ? (
         <button onClick={generateForecast} disabled={loading} className={`w-full py-4 rounded-2xl font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 ${
           theme === 'dark' ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white border text-indigo-600 hover:bg-slate-50'
         }`}>
           {loading ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <TrendingUp className="w-5 h-5" />}
           {loading ? "Analyzing 7-Day Data..." : "Reveal 14-Day Forecast"}
         </button>
      ) : (
         <div className="space-y-3">
           <p className={`text-sm font-medium leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
             {forecast}
           </p>
           <button onClick={generateForecast} disabled={loading} className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>
             {loading ? "Updating..." : "Recalculate"}
           </button>
         </div>
      )}
    </div>
  );
}

function InterlockingMacroBalancer({ targetCalories, pTarget, cTarget, fTarget, setMacroTargets, theme }) {
  const [locked, setLocked] = useState({ p: false, c: false, f: false });

  const handleSliderChange = (changedKey, newValue) => {
    const currentMacros = { p: pTarget, c: cTarget, f: fTarget };
    const calsDiff = newValue * (changedKey === 'f' ? 9 : 4) - currentMacros[changedKey] * (changedKey === 'f' ? 9 : 4);
    
    let otherKeys = ['p', 'c', 'f'].filter(k => k !== changedKey);
    let unlockedKeys = otherKeys.filter(k => !locked[k]);

    if (unlockedKeys.length === 0) return;

    const newMacros = { ...currentMacros, [changedKey]: newValue };
    let remainingCalsToAbsorb = -calsDiff; 

    for (let i = 0; i < unlockedKeys.length; i++) {
       const key = unlockedKeys[i];
       const calPerGram = key === 'f' ? 9 : 4;
       let calsForThisKey = i === unlockedKeys.length - 1 ? remainingCalsToAbsorb : remainingCalsToAbsorb / 2;
       let newGrams = Math.max(0, Math.round(newMacros[key] + (calsForThisKey / calPerGram)));
       let actualCalsAbsorbed = (newGrams - newMacros[key]) * calPerGram;
       newMacros[key] = newGrams;
       remainingCalsToAbsorb -= actualCalsAbsorbed;
    }

    setMacroTargets(newMacros);
  };

  const toggleLock = (key) => {
    const currentlyLocked = Object.values(locked).filter(Boolean).length;
    if (!locked[key] && currentlyLocked >= 2) return;
    setLocked({ ...locked, [key]: !locked[key] });
  };

  const renderSlider = (key, label, color, maxGrams, val) => {
    const isLocked = locked[key];
    const pct = Math.round(((val * (key === 'f' ? 9 : 4)) / targetCalories) * 100);

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => toggleLock(key)} className={`p-1.5 rounded-lg transition-all ${isLocked ? 'bg-red-500/20 text-red-500' : theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
            <span className={`text-[10px] font-black uppercase tracking-widest ${color}`}>{label}</span>
          </div>
          <span className={`font-black text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{val}g <span className={`text-[10px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>({pct}%)</span></span>
        </div>
        <input 
          type="range"
          min="0"
          max={maxGrams}
          value={val}
          onChange={(e) => handleSliderChange(key, Number(e.target.value))}
          disabled={isLocked}
          className={`w-full h-2 rounded-lg appearance-none cursor-pointer transition-all focus:outline-none ${isLocked ? 'opacity-50 grayscale cursor-not-allowed' : ''} ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}
          style={{ accentColor: isLocked ? 'gray' : undefined }}
        />
      </div>
    );
  };

  return (
    <div className={`rounded-[2.5rem] p-6 border shadow-2xl backdrop-blur-xl transition-all duration-300 ${
      theme === 'dark' ? 'bg-slate-900/40 border-white/5 shadow-indigo-950/20' : 'bg-white/40 border-slate-200/50 shadow-slate-100'
    }`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${theme === 'dark' ? 'bg-indigo-950/40 text-indigo-400' : 'bg-indigo-50 text-indigo-650'}`}>
            <Lock className="w-4 h-4 text-indigo-500" />
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Interlocking Balancer
          </span>
        </div>
        <div className="text-right">
          <span className={`block text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-indigo-650'}`}>
            {(pTarget * 4) + (cTarget * 4) + (fTarget * 9)} kcal
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {renderSlider('p', 'Protein', 'text-indigo-500', Math.round(targetCalories / 4), pTarget)}
        {renderSlider('c', 'Carbs', 'text-emerald-500', Math.round(targetCalories / 4), cTarget)}
        {renderSlider('f', 'Fats', 'text-amber-500', Math.round(targetCalories / 9), fTarget)}
      </div>
    </div>
  );
}

function SandboxView({ meals, targetCalories, proteinTarget, carbsTarget, fatsTarget, customFoods, theme }) {
  const [stats, setStats] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayMeals = meals.filter(m => (m.date || m.created_at.split('T')[0]) === todayStr);
    let cals = 0, p = 0, c = 0, f = 0;
    todayMeals.forEach(m => { cals += m.calories; p += m.protein; c += m.carbs; f += m.fats; });
    setStats({ calories: cals, protein: p, carbs: c, fats: f });
  }, [meals]);

  const [simText, setSimText] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simDiff, setSimDiff] = useState(null);

  const simulateLog = async () => {
    if (!simText.trim()) return;
    setIsSimulating(true);
    try {
      // Strip common hypothetical prefixes
      let sanitizedText = simText.toLowerCase()
        .replace(/^(what if i (eat|have|drink) |if i (eat|have|drink) |suppose i (eat|have|drink) |say i (eat|have|drink) )/i, '')
        .trim();

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) { alert("API Key missing"); setIsSimulating(false); return; }
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const availableNames = customFoods.map(f => f.name);
      const prompt = `You are a strict food parsing nutritional API. Analyze the following hypothetical food entry: "${sanitizedText}"
Database items: ${JSON.stringify(availableNames)}

You are analyzing a hypothetical food entry. If the food is not in the user's local database array, do NOT return 0. Use your internal knowledge to estimate standard nutritional values for the ENTIRE specified item or portion (e.g., a whole large pizza, 3 burgers) and return those macro values directly.

Estimate the total combined macros of the entire input. 
Return ONLY a JSON object exactly matching this schema: { "calories": number, "protein": number, "carbs": number, "fats": number }`;

      const result = await model.generateContent(prompt);
      let text = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
      const diff = JSON.parse(text);
      
      setSimDiff(diff);
    } catch (e) {
      console.error(e);
      alert("Simulation failed.");
    }
    setIsSimulating(false);
  };

  const currentStats = {
    calories: stats.calories + (simDiff ? simDiff.calories : 0),
    protein: stats.protein + (simDiff ? simDiff.protein : 0),
    carbs: stats.carbs + (simDiff ? simDiff.carbs : 0),
    fats: stats.fats + (simDiff ? simDiff.fats : 0)
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className={`text-3xl font-black mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Sandbox</h2>
        <p className={`font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Macro Strategy Simulator</p>
      </div>

      {/* Clone Progress Ring */}
      <CalorieProgressRing current={currentStats.calories} target={targetCalories} theme={theme} />

      {/* Clone Macro Circles */}
      <div className="grid grid-cols-3 gap-3">
        <MacroCircle label="Protein" current={currentStats.protein} target={proteinTarget} colorClass="text-indigo-500" strokeColor="#6366f1" theme={theme} />
        <MacroCircle label="Carbs" current={currentStats.carbs} target={carbsTarget} colorClass="text-emerald-500" strokeColor="#10b981" theme={theme} />
        <MacroCircle label="Fats" current={currentStats.fats} target={fatsTarget} colorClass="text-amber-500" strokeColor="#f59e0b" theme={theme} />
      </div>

      <div className={`rounded-[2.5rem] p-6 border shadow-xl backdrop-blur-xl ${theme === 'dark' ? 'bg-slate-900/40 border-white/5' : 'bg-white/45 border-slate-200/50'}`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-500">
            <Layers className="w-4 h-4" />
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>What-If Scenario</span>
        </div>
        
        <div className="flex items-center gap-2">
          <input 
            type="text"
            value={simText}
            onChange={e => setSimText(e.target.value)}
            placeholder="e.g. If I eat a large pizza..."
            className={`flex-1 bg-transparent border-b-2 px-2 py-2 focus:outline-none transition-all ${theme === 'dark' ? 'border-slate-800 text-white focus:border-indigo-500' : 'border-slate-200 text-slate-800 focus:border-indigo-500'}`}
            disabled={isSimulating}
          />
          <button 
            onClick={simulateLog}
            disabled={!simText.trim() || isSimulating}
            className={`p-3 rounded-xl transition-all font-black text-xs ${simText.trim() && !isSimulating ? 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95' : theme === 'dark' ? 'bg-slate-800 text-slate-600' : 'bg-slate-200 text-slate-400'}`}
          >
            {isSimulating ? "..." : "Simulate"}
          </button>
        </div>
        {simDiff && (
          <div className={`mt-4 p-3 rounded-xl text-xs font-bold text-center ${theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
            Impact: +{Math.round(simDiff.calories)} kcal (+{Math.round(simDiff.protein)}P / +{Math.round(simDiff.carbs)}C / +{Math.round(simDiff.fats)}F)
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// WEIGHT GAIN TRACKER & PREDICTOR
// ==========================================
function WeightTrackerView({ targetCalories, meals, theme }) {
  const [profile, setProfile] = useState({ currentWeight: '', goalWeight: '', tdee: '' });
  const [weightLog, setWeightLog] = useState([]);
  const [newWeight, setNewWeight] = useState('');
  const [showLogInput, setShowLogInput] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ currentWeight: '', goalWeight: '', tdee: '' });

  useEffect(() => {
    fetchWeightData();
  }, []);

  const fetchWeightData = async () => {
    const { data: pData } = await supabase.from('weight_profile').select('*').limit(1);
    if (pData && pData.length > 0) {
      const p = { currentWeight: pData[0].current_weight, goalWeight: pData[0].goal_weight, tdee: pData[0].tdee };
      setProfile(p);
      setProfileDraft(p);
    }
    const { data: logData } = await supabase.from('weight_logs').select('*').order('date', { ascending: false });
    if (logData) {
      setWeightLog(logData.map(l => ({ date: l.date, weight: l.weight })));
    }
  };

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  const recentMeals = meals.filter(m => m.date >= sevenDaysAgoStr);
  const dailyCals = {};
  recentMeals.forEach(m => {
    dailyCals[m.date] = (dailyCals[m.date] || 0) + (m.calories || 0);
  });
  
  const uniqueDaysLogged = Object.keys(dailyCals).length;
  const totalRecentCalories = Object.values(dailyCals).reduce((sum, val) => sum + val, 0);
  const averageDailyCals = uniqueDaysLogged > 0 ? totalRecentCalories / uniqueDaysLogged : targetCalories;

  const currentWeight = parseFloat(profile.currentWeight) || 0;
  const goalWeight   = parseFloat(profile.goalWeight)   || 0;
  const tdee         = parseFloat(profile.tdee)         || 0;
  const surplus      = tdee > 0 ? averageDailyCals - tdee : 0;
  const gainPerDay   = surplus / 7700;
  const gainPerWeek  = gainPerDay * 7;
  const gainPerMonth = gainPerDay * 30.4;
  const totalToGain  = goalWeight - currentWeight;
  const weeksToGoal  = gainPerWeek > 0 && totalToGain > 0 ? Math.ceil(totalToGain / gainPerWeek) : null;
  const goalDate     = weeksToGoal ? new Date(Date.now() + weeksToGoal * 7 * 24 * 60 * 60 * 1000) : null;

  const logWeight = async () => {
    const val = parseFloat(newWeight);
    if (!val || val <= 0) return;
    const today = new Date().toISOString().split('T')[0];
    
    const existing = weightLog.find(e => e.date === today);
    if (existing) {
      await supabase.from('weight_logs').update({ weight: val }).eq('date', today);
    } else {
      await supabase.from('weight_logs').insert([{ date: today, weight: val }]);
    }
    
    const updated = [{ date: today, weight: val }, ...weightLog.filter(e => e.date !== today)];
    setWeightLog(updated.slice(0, 30));
    setNewWeight('');
    setShowLogInput(false);
  };

  const deleteEntry = async (date) => {
    await supabase.from('weight_logs').delete().eq('date', date);
    setWeightLog(weightLog.filter(e => e.date !== date));
  };

  const saveProfile = async () => {
    const { data: pData } = await supabase.from('weight_profile').select('id').limit(1);
    const updates = {
      current_weight: parseFloat(profileDraft.currentWeight) || 0,
      goal_weight: parseFloat(profileDraft.goalWeight) || 0,
      tdee: parseFloat(profileDraft.tdee) || 0,
      updated_at: new Date().toISOString()
    };
    if (pData && pData.length > 0) {
      await supabase.from('weight_profile').update(updates).eq('id', pData[0].id);
    } else {
      await supabase.from('weight_profile').insert([updates]);
    }
    setProfile(profileDraft);
    setEditingProfile(false);
  };

  const chartData = [...weightLog]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-8);

  const minW  = chartData.length > 0 ? Math.min(...chartData.map(e => e.weight)) - 0.5 : (currentWeight || 60) - 1;
  const maxW  = chartData.length > 0 ? Math.max(...chartData.map(e => e.weight)) + 0.5 : (currentWeight || 60) + 1;
  const wRange = maxW - minW || 1;

  const sortedLog = [...weightLog].sort((a, b) => new Date(b.date) - new Date(a.date));
  const firstEntry = [...weightLog].sort((a, b) => new Date(a.date) - new Date(b.date))[0];

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className={`text-3xl font-black mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Weight Tracker</h2>
        <p className={`font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Predict & track your mass gains</p>
      </div>

      {/* ── Profile Panel ── */}
      <div className={`rounded-[2.5rem] p-6 border shadow-xl backdrop-blur-xl transition-all duration-300 ${
        theme === 'dark' ? 'bg-slate-900/40 border-white/5' : 'bg-white/45 border-slate-200/50 shadow-slate-100'
      }`}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${theme === 'dark' ? 'bg-indigo-950/50 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
              <Users className="w-4 h-4" />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Body Profile</span>
          </div>
          <button
            onClick={() => { setProfileDraft(profile); setEditingProfile(!editingProfile); }}
            className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all active:scale-95 ${
              editingProfile
                ? 'bg-red-500/20 text-red-400'
                : theme === 'dark' ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}
          >
            {editingProfile ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {editingProfile ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Current Weight (kg)</label>
                <input
                  type="number" step="0.1"
                  value={profileDraft.currentWeight}
                  onChange={e => setProfileDraft({ ...profileDraft, currentWeight: e.target.value })}
                  placeholder="e.g. 70"
                  className={`w-full border-2 rounded-2xl px-4 py-3 focus:outline-none transition-all font-bold text-sm ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-700 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Goal Weight (kg)</label>
                <input
                  type="number" step="0.1"
                  value={profileDraft.goalWeight}
                  onChange={e => setProfileDraft({ ...profileDraft, goalWeight: e.target.value })}
                  placeholder="e.g. 80"
                  className={`w-full border-2 rounded-2xl px-4 py-3 focus:outline-none transition-all font-bold text-sm ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-700 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500'
                  }`}
                />
              </div>
            </div>
            <div>
              <label className={`block text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Maintenance Calories / TDEE (kcal/day)</label>
              <input
                type="number"
                value={profileDraft.tdee}
                onChange={e => setProfileDraft({ ...profileDraft, tdee: e.target.value })}
                placeholder="e.g. 2500"
                className={`w-full border-2 rounded-2xl px-4 py-3 focus:outline-none transition-all font-bold text-sm ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-700 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500'
                }`}
              />
              <p className={`text-[10px] mt-1.5 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>Calories your body burns daily — use a TDEE calculator if unsure</p>
            </div>
            <button
              onClick={saveProfile}
              className="w-full font-black py-4 rounded-[2rem] bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/25 transition-all active:scale-95 uppercase tracking-widest text-sm"
            >
              Save Profile
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Current', value: currentWeight ? `${currentWeight} kg` : '—' },
              { label: 'Goal',    value: goalWeight    ? `${goalWeight} kg`    : '—' },
              { label: 'TDEE',   value: tdee           ? `${tdee} kcal`        : '—' },
            ].map(({ label, value }) => (
              <div key={label} className={`rounded-2xl p-3 text-center border ${
                theme === 'dark' ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className={`text-xs font-black ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{value}</div>
                <div className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Prediction Section ── */}
      {tdee > 0 && currentWeight > 0 ? (
        <>
          {/* Surplus / Deficit Banner */}
          <div className={`rounded-[2rem] px-5 py-3.5 flex items-center justify-between border transition-all ${
            surplus > 0
              ? theme === 'dark' ? 'bg-emerald-950/30 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
              : theme === 'dark' ? 'bg-red-950/30 border-red-500/20'         : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              <Flame className={`w-4 h-4 ${surplus > 0 ? 'text-emerald-500' : 'text-red-500'}`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${
                surplus > 0
                  ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
                  : theme === 'dark' ? 'text-red-400'     : 'text-red-700'
              }`}>
                {surplus > 0 ? 'Caloric Surplus' : surplus < 0 ? 'Caloric Deficit' : 'Maintenance'}
              </span>
            </div>
            <span className={`font-black text-base ${
              surplus > 0
                ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
                : theme === 'dark' ? 'text-red-400'     : 'text-red-700'
            }`}>
              {surplus > 0 ? '+' : ''}{Math.round(surplus)} kcal/day <span className={`text-[10px] opacity-70 ml-1 font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>(Avg Intake: {Math.round(averageDailyCals)} kcal)</span>
            </span>
          </div>

          {/* Gain Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Per Week */}
            <div className={`rounded-[2rem] p-5 border shadow-xl backdrop-blur-xl relative overflow-hidden ${
              theme === 'dark' ? 'bg-slate-900/40 border-indigo-500/10' : 'bg-white/60 border-indigo-100 shadow-indigo-50'
            }`}>
              <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
              <div className={`text-[9px] font-black uppercase tracking-widest mb-3 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-500'}`}>Per Week</div>
              <div className={`text-2xl font-black leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {gainPerWeek > 0 ? `+${gainPerWeek.toFixed(2)}` : gainPerWeek < 0 ? gainPerWeek.toFixed(2) : '0.00'}
              </div>
              <div className={`text-[10px] font-bold mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>kg expected</div>
            </div>

            {/* Per Month */}
            <div className={`rounded-[2rem] p-5 border shadow-xl backdrop-blur-xl relative overflow-hidden ${
              theme === 'dark' ? 'bg-slate-900/40 border-emerald-500/10' : 'bg-white/60 border-emerald-100 shadow-emerald-50'
            }`}>
              <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
              <div className={`text-[9px] font-black uppercase tracking-widest mb-3 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>Per Month</div>
              <div className={`text-2xl font-black leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {gainPerMonth > 0 ? `+${gainPerMonth.toFixed(2)}` : gainPerMonth < 0 ? gainPerMonth.toFixed(2) : '0.00'}
              </div>
              <div className={`text-[10px] font-bold mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>kg expected</div>
            </div>
          </div>

          {/* Goal ETA card */}
          {goalWeight > currentWeight && weeksToGoal && (
            <div className={`rounded-[2.5rem] p-6 border shadow-xl backdrop-blur-xl relative overflow-hidden ${
              theme === 'dark' ? 'bg-slate-900/40 border-white/5' : 'bg-white/45 border-slate-200/50'
            }`}>
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
              <div className="flex items-center gap-2 mb-5">
                <div className={`p-1.5 rounded-lg ${theme === 'dark' ? 'bg-amber-950/40 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Goal Timeline</span>
              </div>

              {/* Progress bar */}
              <div className="mb-5">
                <div className="flex justify-between items-end mb-2">
                  <span className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{currentWeight} kg now</span>
                  <span className={`text-xs font-bold ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>{goalWeight} kg goal</span>
                </div>
                <div className={`h-3 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}>
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-700"
                    style={{ width: `${Math.min((currentWeight / goalWeight) * 100, 100)}%` }}
                  />
                </div>
                <p className={`text-[9px] font-bold mt-1.5 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
                  {totalToGain.toFixed(1)} kg remaining
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className={`rounded-2xl p-3 border text-center ${
                  theme === 'dark' ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className={`text-lg font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{weeksToGoal}</div>
                  <div className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Weeks</div>
                </div>
                <div className={`rounded-2xl p-3 border text-center ${
                  theme === 'dark' ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className={`text-lg font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{Math.round(weeksToGoal / 4.3)}</div>
                  <div className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Months</div>
                </div>
                <div className={`rounded-2xl p-3 border text-center ${
                  theme === 'dark' ? 'bg-amber-950/30 border-amber-500/20' : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className={`text-sm font-black ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                    {goalDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>ETA</div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className={`rounded-[2rem] p-8 border text-center ${
          theme === 'dark' ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <TrendingUp className={`w-8 h-8 mx-auto mb-3 ${theme === 'dark' ? 'text-slate-700' : 'text-slate-300'}`} />
          <p className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Set up your profile above to see predictions</p>
          <p className={`text-[10px] mt-1 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-500'}`}>Enter your weight, goal, and TDEE to get started</p>
        </div>
      )}

      {/* ── Weight Log ── */}
      <div className={`rounded-[2.5rem] p-6 border shadow-xl backdrop-blur-xl ${
        theme === 'dark' ? 'bg-slate-900/40 border-white/5' : 'bg-white/45 border-slate-200/50'
      }`}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${theme === 'dark' ? 'bg-indigo-950/50 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
              <Activity className="w-4 h-4" />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Weight Log</span>
          </div>
          <button
            onClick={() => setShowLogInput(v => !v)}
            className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all active:scale-95 ${
              showLogInput
                ? theme === 'dark' ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-500'
                : 'bg-indigo-600 text-white hover:bg-indigo-500'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            {showLogInput ? 'Cancel' : 'Log Weight'}
          </button>
        </div>

        {/* Log input */}
        {showLogInput && (
          <div className="flex items-center gap-3 mb-5">
            <input
              type="number" step="0.1"
              value={newWeight}
              onChange={e => setNewWeight(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && logWeight()}
              placeholder="Your weight in kg"
              autoFocus
              className={`flex-1 border-2 rounded-2xl px-4 py-3 focus:outline-none transition-all font-bold text-sm ${
                theme === 'dark'
                  ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-700 focus:border-indigo-500'
                  : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500'
              }`}
            />
            <button
              onClick={logWeight}
              disabled={!newWeight}
              className={`p-3 rounded-xl font-black transition-all active:scale-95 ${
                newWeight ? 'bg-indigo-600 text-white hover:bg-indigo-500' : theme === 'dark' ? 'bg-slate-800 text-slate-600' : 'bg-slate-200 text-slate-400'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* SVG Chart */}
        {chartData.length >= 2 && (
          <div className="mb-5">
            <svg viewBox="0 0 300 90" className="w-full" preserveAspectRatio="none" style={{ height: '80px' }}>
              <defs>
                <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#6366f1" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={`M ${chartData.map((e, i) => `${(i / (chartData.length - 1)) * 300},${85 - ((e.weight - minW) / wRange) * 78}`).join(' L ')} L 300,90 L 0,90 Z`}
                fill="url(#wGrad)"
              />
              <polyline
                points={chartData.map((e, i) => `${(i / (chartData.length - 1)) * 300},${85 - ((e.weight - minW) / wRange) * 78}`).join(' ')}
                fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              />
              {chartData.map((e, i) => (
                <circle
                  key={i}
                  cx={(i / (chartData.length - 1)) * 300}
                  cy={85 - ((e.weight - minW) / wRange) * 78}
                  r="4"
                  fill={theme === 'dark' ? '#0f172a' : '#fff'}
                  stroke="#6366f1" strokeWidth="2"
                />
              ))}
            </svg>
            <div className="flex justify-between mt-1">
              <span className={`text-[9px] font-bold ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
                {new Date(chartData[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <span className={`text-[9px] font-bold ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
                {new Date(chartData[chartData.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        )}

        {/* Entries list */}
        {sortedLog.length === 0 ? (
          <div className={`text-center py-8 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
            <p className="text-sm font-bold">No weight entries yet</p>
            <p className="text-[10px] mt-1">Tap "Log Weight" above to record your first entry</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedLog.slice(0, 10).map((entry, idx) => {
              const daysFromStart = firstEntry
                ? Math.round((new Date(entry.date) - new Date(firstEntry.date)) / (1000 * 60 * 60 * 24))
                : 0;
              const expectedAtDate = currentWeight > 0 ? currentWeight + gainPerDay * daysFromStart : null;
              const isOnTrack = expectedAtDate !== null ? entry.weight >= expectedAtDate : null;

              return (
                <div key={entry.date} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  theme === 'dark' ? 'bg-slate-800/30 border-slate-700/40' : 'bg-slate-50/80 border-slate-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      idx === 0 ? 'bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.6)]' : theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'
                    }`} />
                    <div>
                      <div className={`text-sm font-black ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{entry.weight} kg</div>
                      <div className={`text-[9px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                        {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOnTrack !== null && (
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                        isOnTrack
                          ? theme === 'dark' ? 'bg-emerald-950/50 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                          : theme === 'dark' ? 'bg-amber-950/50 text-amber-400'   : 'bg-amber-50 text-amber-600'
                      }`}>
                        {isOnTrack ? '↑ on track' : '↓ below'}
                      </span>
                    )}
                    <button
                      onClick={() => deleteEntry(entry.date)}
                      className={`p-1.5 transition-colors ${theme === 'dark' ? 'text-slate-700 hover:text-red-500' : 'text-slate-300 hover:text-red-500'}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tip */}
      <div className={`rounded-[2rem] p-5 border flex items-start gap-3 ${
        theme === 'dark' ? 'bg-indigo-950/20 border-indigo-500/10' : 'bg-indigo-50/40 border-indigo-100'
      }`}>
        <Info className={`w-4 h-4 mt-0.5 shrink-0 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-500'}`} />
        <p className={`text-xs font-medium leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
          <span className="font-black">Weigh-in tip:</span> Step on the scale every morning after using the bathroom, before eating or drinking. This eliminates water weight variance and gives the most accurate trend data.
        </p>
      </div>
    </div>
  );
}

// ==========================================
// TECHNICAL MONOSPACE SYSTEM KERNEL LOG DRAWER
// ==========================================
function KernelLogDrawer({ systemLogs, addSystemLog, theme }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pingTime, setPingTime] = useState(15);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const logsEndRef = useRef(null);

  // Auto-scroll to bottom when new logs arrive and drawer is open
  useEffect(() => {
    if (isOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [systemLogs, isOpen]);

  // Initial diagnostics on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const start = performance.now();
      supabase.from('meals').select('count', { count: 'exact', head: true })
        .then(() => {
          const duration = Math.round(performance.now() - start);
          setPingTime(duration);
        })
        .catch(() => {
          setPingTime(99);
        });
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const runActiveDiagnostics = async () => {
    if (isRunningDiagnostics) return;
    setIsRunningDiagnostics(true);
    addSystemLog('init', 'Initializing active system diagnostics...');

    // Phase 1: Local Storage capacity audit
    await new Promise(resolve => setTimeout(resolve, 300));
    let totalBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const val = localStorage.getItem(key);
      totalBytes += (key.length + val.length) * 2; // UTF-16 bytes approx
    }
    const kbUsed = (totalBytes / 1024).toFixed(2);
    addSystemLog('state', `Storage capacity audit: ${kbUsed} KB / 5120 KB allocated.`);

    // Phase 2: Supabase database connection ping
    await new Promise(resolve => setTimeout(resolve, 300));
    const dbStart = performance.now();
    try {
      addSystemLog('sync', 'Pinging Supabase backend endpoint...');
      const { error } = await supabase.from('meals').select('count', { count: 'exact', head: true });
      const dbDuration = Math.round(performance.now() - dbStart);
      setPingTime(dbDuration);
      if (error) throw error;
      addSystemLog('sync', `Supabase connection verified. RTT Latency: ${dbDuration}ms.`, { latencyMs: dbDuration });
    } catch (err) {
      const dbDuration = Math.round(performance.now() - dbStart);
      setPingTime(dbDuration);
      addSystemLog('sync', `Supabase endpoint unresponsive: ${err.message || String(err)}`, { error: true });
    }

    // Phase 3: Service Worker Status check
    await new Promise(resolve => setTimeout(resolve, 300));
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length > 0) {
        addSystemLog('state', `PWA Service Worker detected: ACTIVE (${registrations.length} registrations)`);
      } else {
        addSystemLog('state', 'PWA Service Worker status: UNREGISTERED (Running in dev or unsupported environment)');
      }
    } else {
      addSystemLog('state', 'PWA Service Worker unsupported in client agent.', { error: true });
    }

    // Diagnostics complete
    await new Promise(resolve => setTimeout(resolve, 200));
    addSystemLog('init', 'System diagnostic diagnostics pipeline complete: STATUS OK.');
    setIsRunningDiagnostics(false);
  };

  const getLogTypeStyles = (type) => {
    switch (type) {
      case 'INIT': return 'text-purple-400 font-extrabold';
      case 'SYNC': return 'text-sky-400 font-extrabold';
      case 'AI': return 'text-teal-300 font-extrabold';
      case 'STATE': return 'text-emerald-400 font-extrabold';
      case 'ERROR': return 'text-rose-500 font-extrabold';
      default: return 'text-slate-450';
    }
  };

  return (
    <div 
      className={`fixed left-0 right-0 max-w-md mx-auto w-[calc(100%-2.5rem)] rounded-2xl border backdrop-blur-md shadow-2xl transition-all duration-300 ease-out z-35 overflow-hidden font-mono ${
        isOpen ? 'h-[260px] bottom-[86px]' : 'h-[36px] bottom-[86px]'
      } ${
        theme === 'dark' 
          ? 'bg-slate-950/95 border-emerald-500/20 shadow-emerald-950/10 text-emerald-400' 
          : 'bg-slate-900/95 border-emerald-500/20 shadow-slate-950/20 text-emerald-405'
      }`}
    >
      {/* Retracted / Header state */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-3 h-[34px] cursor-pointer hover:bg-slate-800/20 select-none border-b border-emerald-500/10"
      >
        <div className="flex items-center gap-2">
          {/* LED pulse indicator */}
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isRunningDiagnostics ? 'bg-indigo-400 shadow-[0_0_8px_#818cf8]' : 'bg-emerald-450 shadow-[0_0_8px_#34d399]'
            }`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              isRunningDiagnostics ? 'bg-indigo-500' : 'bg-emerald-500'
            }`}></span>
          </span>
          <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-extrabold flex items-center gap-1.5">
            [SYS_READY] <span className="opacity-40">|</span> LOGS: {systemLogs.length} <span className="opacity-40">|</span> PING: {pingTime}ms
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-[8px] font-black tracking-widest text-emerald-500/50 uppercase">
            {isOpen ? 'Kernel.sys' : 'Expand_Diag'}
          </span>
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-emerald-450" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-emerald-450" />
          )}
        </div>
      </div>

      {/* Expanded body (Terminal screen with CRT scanlines) */}
      {isOpen && (
        <div className="flex flex-col h-[calc(100%-34px)] relative bg-black/95">
          {/* Retro CRT overlay effects */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-5 mix-blend-overlay z-20"
            style={{
              background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)',
              backgroundSize: '100% 4px'
            }}
          />
          <div className="absolute inset-0 pointer-events-none bg-emerald-500/5 z-10 animate-[pulse_6s_ease-in-out_infinite]" />

          {/* Terminal Console Controls */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950 border-b border-emerald-500/10 z-10">
            <span className="text-[8.5px] uppercase tracking-widest text-emerald-500/60 font-black">
              System Kernel Diagnostics Console v1.0
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  runActiveDiagnostics();
                }}
                disabled={isRunningDiagnostics}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded border border-emerald-500/20 bg-emerald-950/20 text-emerald-400 text-[8px] font-bold uppercase transition-all hover:bg-emerald-900/30 active:scale-95 disabled:opacity-50 cursor-pointer`}
                title="Run active connection & capacity tests"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${isRunningDiagnostics ? 'animate-spin' : ''}`} />
                {isRunningDiagnostics ? 'Testing...' : 'Ping Test'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addSystemLog('init', 'Console logs cleared by user authority.');
                }}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-rose-500/20 bg-rose-950/10 text-rose-400 text-[8px] font-bold uppercase transition-all hover:bg-rose-950/30 active:scale-95 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Scrollable Monospace Logs */}
          <div className="flex-1 p-3 overflow-y-auto scrollbar-thin font-mono text-[9px] text-emerald-400/90 space-y-1.5 leading-normal">
            {systemLogs.length === 0 ? (
              <div className="opacity-50 text-center py-4">NO ACTIVE KERNEL TELEMETRY BUFFERED</div>
            ) : (
              systemLogs.slice().reverse().map((log) => (
                <div key={log.id} className="break-all whitespace-pre-wrap flex items-start gap-1 font-semibold text-left">
                  <span className="text-emerald-600/70 select-none shrink-0">[{log.time}]</span>
                  <span className={`${getLogTypeStyles(log.type)} shrink-0 select-none`}>[{log.type}]</span>
                  <span className="text-emerald-300/90">{log.message}</span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  // --- STATE MANAGEMENT ---
  const [systemLogs, setSystemLogs] = useState([]);

  const addSystemLog = useCallback((type, message, details = {}) => {
    setSystemLogs(prev => {
      const now = new Date();
      const ms = String(now.getMilliseconds()).padStart(3, '0');
      const timeStr = `${now.toTimeString().split(' ')[0]}.${ms}`;
      const logEntry = {
        id: Math.random().toString(36).substring(2, 9),
        time: timeStr,
        type: type.toUpperCase(),
        message,
        details
      };
      return [logEntry, ...prev].slice(0, 100);
    });
  }, []);

  const [meals, setMeals] = useState([]);
  const [targetCalories, setTargetCalories] = useState(() => {
    return Number(localStorage.getItem('wozan-target-calories')) || 3000;
  });

  const [macroTargets, setMacroTargets] = useState(() => {
    const saved = localStorage.getItem('wozan-macro-targets');
    return saved ? JSON.parse(saved) : null;
  });

  const TARGET_CALORIES = targetCalories;
  const PROTEIN_TARGET = macroTargets ? macroTargets.p : Math.round((targetCalories * 0.20) / 4);
  const CARBS_TARGET = macroTargets ? macroTargets.c : Math.round((targetCalories * 0.50) / 4);
  const FATS_TARGET = macroTargets ? macroTargets.f : Math.round((targetCalories * 0.30) / 9);

  const isTargetCalMounted = useRef(false);
  useEffect(() => {
    localStorage.setItem('wozan-target-calories', targetCalories);
    if (macroTargets) {
      const currentCals = (macroTargets.p * 4) + (macroTargets.c * 4) + (macroTargets.f * 9);
      if (Math.abs(currentCals - targetCalories) > 100) {
        setMacroTargets(null);
      }
    }
    if (isTargetCalMounted.current) {
      
    } else {
      isTargetCalMounted.current = true;
    }
  }, [targetCalories, macroTargets, addSystemLog]);

  useEffect(() => {
    if (macroTargets) {
      localStorage.setItem('wozan-macro-targets', JSON.stringify(macroTargets));
    } else {
      localStorage.removeItem('wozan-macro-targets');
    }
  }, [macroTargets]);

  const [customFoods, setCustomFoods] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'add', 'history', 'admin', 'squad', 'planner', 'weight'
  const isViewMounted = useRef(false);
  useEffect(() => {
    if (isViewMounted.current) {
      
    } else {
      isViewMounted.current = true;
    }
  }, [currentView, addSystemLog]);

  const [waterIntake, setWaterIntake] = useState(() => {
    return Number(localStorage.getItem(`wozan-water-${todayString}`)) || 0;
  });

  const isWaterMounted = useRef(false);
  useEffect(() => {
    localStorage.setItem(`wozan-water-${todayString}`, waterIntake);
    if (isWaterMounted.current) {
      
    } else {
      isWaterMounted.current = true;
    }
  }, [waterIntake, addSystemLog]);

  const [inputText, setInputText] = useState('');
  const [parsedItems, setParsedItems] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isParsingAI, setIsParsingAI] = useState(false);
  const [aiLoadingText, setAiLoadingText] = useState('Processing...');
  const [isCoachOpen, setIsCoachOpen] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Speech Recognition. Try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);

    let currentTranscript = '';
    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          setInputText(event.results[i][0].transcript);
        }
      }
      if (finalTranscript) {
        currentTranscript = finalTranscript;
        setInputText(finalTranscript);
      }
    };

    recognition.onerror = (e) => {
      console.error("Speech error", e.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (currentTranscript.trim().length > 2) {
        parseWithAI(currentTranscript);
      }
    };

    setInputText('');
    recognition.start();
  };

  // --- CAMERA & MULTIMODAL AI ---
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Camera access denied or unavailable.");
      setIsCameraOpen(false);
    }
  };

  const capturePhotoAndParse = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];
    
    // Stop camera
    const stream = video.srcObject;
    if (stream) stream.getTracks().forEach(t => t.stop());
    setIsCameraOpen(false);
    
    setAiLoadingText("Processing Image...");
    setIsParsingAI(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key missing");
      const genAI = new GoogleGenerativeAI(apiKey);

      const allFoods = [...FOOD_DB, ...customFoods];
      const availableNames = allFoods.map(f => f.name);

      const prompt = `You are a strict food parsing nutritional API with vision capabilities.
Analyze the user's provided image of their food. Estimate the foods and weights on the plate.

We already have a database of foods. Here is the list of exact food names currently available:
${JSON.stringify(availableNames)}

Your task is to parse the visually identified foods into a JSON array of objects.
For EACH food item, you must output an object with these keys:
1. "food_name" (string): The name of the food item. If it maps closely to an item in the database, use that exact name. If new, invent a clear descriptive name.
2. "matched_database_name" (string | null): The EXACT matching name from the database list if a close match is found. Otherwise, null.
3. "weight_g" (number): The estimated weight in grams, or count if applicable.
4. "is_new" (boolean): true if matched_database_name is null, false if it matches.
5. "estimated_macros" (object | null): If "is_new" is true, provide estimated macros { calories, protein, carbs, fats, unit } per 100g/unit. If "is_new" is false, this must be null.

Return ONLY the raw JSON array. Do not include markdown formatting.`;

      let result = null;
      let attempts = 0;
      const maxRetries = 3;
      let delay = 2000;

      while (true) {
        try {
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
          result = await model.generateContent([
             { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
             prompt
          ]);
          break; // Success!
        } catch (err) {
          const is503 = err.status === 503 || 
                        (err.message && err.message.includes("503")) || 
                        (err.status && err.status.toString().includes("503"));
          
          if (is503 && attempts < maxRetries) {
            attempts++;
            setAiLoadingText("Server busy, retrying upload...");
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
          } else {
            throw err; // Out of retries or non-503 error
          }
        }
      }

      let text = result.response.text();
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(text);
      
      await processParsedData(parsedData);
    } catch (err) {
      console.warn("gemini-2.5-flash failed or threw a persistent error. Attempting stable gemini-1.5-flash fallback. Error was:", err);
      
      const is503 = err.status === 503 || 
                    (err.message && err.message.includes("503")) || 
                    (err.status && err.status.toString().includes("503"));
      
      if (is503) {
        try {
          setAiLoadingText("Server busy, switching to backup model...");
          const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
          const genAI = new GoogleGenerativeAI(apiKey);
          const backupModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

          const allFoods = [...FOOD_DB, ...customFoods];
          const availableNames = allFoods.map(f => f.name);

          const prompt = `You are a strict food parsing nutritional API with vision capabilities.
Analyze the user's provided image of their food. Estimate the foods and weights on the plate.

We already have a database of foods. Here is the list of exact food names currently available:
${JSON.stringify(availableNames)}

Your task is to parse the visually identified foods into a JSON array of objects.
For EACH food item, you must output an object with these keys:
1. "food_name" (string): The name of the food item. If it maps closely to an item in the database, use that exact name. If new, invent a clear descriptive name.
2. "matched_database_name" (string | null): The EXACT matching name from the database list if a close match is found. Otherwise, null.
3. "weight_g" (number): The estimated weight in grams, or count if applicable.
4. "is_new" (boolean): true if matched_database_name is null, false if it matches.
5. "estimated_macros" (object | null): If "is_new" is true, provide estimated macros { calories, protein, carbs, fats, unit } per 100g/unit. If "is_new" is false, this must be null.

Return ONLY the raw JSON array. Do not include markdown formatting.`;

          const backupResult = await backupModel.generateContent([
             { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
             prompt
          ]);
          
          let text = backupResult.response.text();
          text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsedData = JSON.parse(text);
          
          await processParsedData(parsedData);
        } catch (backupErr) {
          console.error("Backup model gemini-1.5-flash failed too:", backupErr);
          alert("Image AI parsing failed on primary and backup models. " + backupErr.message);
        }
      } else {
        alert("Image AI parsing failed. " + err.message);
      }
    }
    setIsParsingAI(false);
  };

  // Theme State & Persistence
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('wozan-theme') || 'dark';
  });

  const [timeOfDay, setTimeOfDay] = useState('morning');
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setTimeOfDay('morning');
    else if (hour < 20) setTimeOfDay('afternoon');
    else setTimeOfDay('evening');
  }, []);

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
  // --- CLOUD SYNC (SUPABASE) & OFFLINE QUEUE ---
  const fetchSupabaseData = async () => {
    const startTime = performance.now();
    setLoading(true);
    
    try {
      const { data: foodsData, error: foodsError } = await supabase.from('foods').select('*').order('name', { ascending: true });
      if (foodsError) throw foodsError;
      if (foodsData) {
        setCustomFoods(foodsData);
        
      }
      
      const { data: mealsData, error: mealsError } = await supabase.from('meals').select('*').order('id', { ascending: false });
      if (mealsError) throw mealsError;
      if (mealsData) {
        setMeals(mealsData);
        const duration = Math.round(performance.now() - startTime);
        
      }
    } catch (err) {
      console.error("Fetch error:", err);
      addSystemLog('sync', `Supabase sync failed: ${err.message || String(err)}`, { error: true });
    }
    setLoading(false);
  };

  const syncOfflineQueue = async () => {
    const queueStr = localStorage.getItem('wozan-offline-queue');
    if (!queueStr) return;
    const queue = JSON.parse(queueStr);
    if (queue.length === 0) return;
    
    
    const startTime = performance.now();
    try {
      const { error } = await supabase.from('meals').insert(queue);
      if (!error) {
        localStorage.removeItem('wozan-offline-queue');
        const duration = Math.round(performance.now() - startTime);
        
        fetchSupabaseData(); // Refresh with real IDs
      } else {
        console.error("Offline sync error", error);
        
      }
    } catch (err) {
      console.error("Sync failed", err);
      
    }
  };

  useEffect(() => {
    const mountStart = performance.now();
    

    window.addEventListener('online', syncOfflineQueue);
    if (navigator.onLine) syncOfflineQueue();

    fetchSupabaseData().then(() => {
      const mountDuration = Math.round(performance.now() - mountStart);
      
    });

    return () => window.removeEventListener('online', syncOfflineQueue);
  }, []);

  const handleTextChange = (e) => {
    setInputText(e.target.value);
  };

  const parseWithAI = async (customText = null) => {
    const textToParse = typeof customText === 'string' ? customText : inputText;
    if (!textToParse.trim()) return;
    
    const startTime = performance.now();
    
    
    setAiLoadingText("Analyzing text entry...");
    setIsParsingAI(true);
    
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        
        alert("Please add VITE_GEMINI_API_KEY to your .env file!");
        setIsParsingAI(false);
        return;
      }

      const allFoods = [...FOOD_DB, ...customFoods];
      const availableNames = allFoods.map(f => f.name);

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `You are a strict food parsing nutritional API.
Analyze the user's text: "${textToParse}"

We already have a database of foods. Here is the list of exact food names currently available:
${JSON.stringify(availableNames)}

Your task is to parse the user's text into a JSON array of objects.
For EACH food item mentioned in the text, you must output an object with these keys:
1. "food_name" (string): The name of the food item. If it maps closely to an item in the available database foods list above, use that exact name. If it is a new food that is NOT in the database, invent a clear descriptive name (e.g. "Potato (100g)" or "Avocado (1 medium)").
2. "matched_database_name" (string | null): The EXACT matching name from the available database foods list above if a close match is found. Otherwise, null. Ignore minor casing and extra space differences when matching.
3. "weight_g" (number): The parsed weight in grams. (e.g., 1 cup of rice = 150g, 200g chicken = 200g). For naturally counted items like eggs or quantity multipliers, output weight_g as the count (e.g. 2 eggs -> weight_g = 2).
4. "is_new" (boolean): true if matched_database_name is null (meaning this food doesn't exist in our database list), false if it matches an existing database food.
5. "estimated_macros" (object | null): If "is_new" is true, provide standard estimated macros per 100g (or per 1 unit if it's naturally a unit/quantity item like "qty"). If "is_new" is false, this must be null.
   Format of estimated_macros:
   {
     "calories": number (estimated calories per 100g or per 1 unit),
     "protein": number (estimated protein in grams per 100g or per 1 unit),
     "carbs": number (estimated carbs in grams per 100g or per 1 unit),
     "fats": number (estimated fats in grams per 100g or per 1 unit),
     "unit": "g" or "qty" or "cup" (default to "g" if measured in grams/weight, or "qty" if counted as single whole items)
   }

Return ONLY the raw JSON array. Do not include markdown formatting or conversational text.`;

      
      const apiStart = performance.now();
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      const apiDuration = Math.round(performance.now() - apiStart);
      
      // Clean up markdown formatting if any
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      const parsedData = JSON.parse(text);

      
      await processParsedData(parsedData);
    } catch (err) {
      console.error("AI Parsing Error:", err);
      
      alert("Failed to parse with AI. " + err.message);
    }
    setIsParsingAI(false);
  };

  const processParsedData = async (parsedData) => {
    const allFoods = [...FOOD_DB, ...customFoods];
    try {
      
      const normalizeString = (str) => {
        return str ? str.toLowerCase().replace(/\s+/g, ' ').trim() : '';
      };

      const fuzzyMatch = (nameA, nameB) => {
        const normA = normalizeString(nameA);
        const normB = normalizeString(nameB);
        
        if (normA === normB) return true;
        
        const cleanA = normA.split('(')[0].trim();
        const cleanB = normB.split('(')[0].trim();
        if (cleanA === cleanB) return true;
        
        if (normA.includes(normB) || normB.includes(normA)) return true;
        
        return false;
      };

      let matchedItems = [];

      for (const item of parsedData) {
        let matchedFood = null;
        
        // 1. Try to find match in database/static list using fuzzy match
        const searchName = item.matched_database_name || item.food_name;
        matchedFood = allFoods.find(f => fuzzyMatch(f.name, searchName));
        
        // 2. Auto-Creation Fallback: If not in database, automatically create it!
        if (!matchedFood) {
          const newFoodName = item.food_name;
          const macros = item.estimated_macros || { calories: 100, protein: 0, carbs: 0, fats: 0, unit: 'g' };
          
          const foodToInsert = {
            name: newFoodName,
            calories: Number(macros.calories) || 0,
            protein: Number(macros.protein) || 0,
            carbs: Number(macros.carbs) || 0,
            fats: Number(macros.fats) || 0
          };
          
          try {
            console.log("Auto-creating missing food item:", newFoodName, foodToInsert);
            const { data, error } = await supabase
              .from('foods')
              .insert([foodToInsert])
              .select();
              
            if (error) {
              console.error("Supabase auto-create food error:", error);
              matchedFood = {
                name: newFoodName,
                ...foodToInsert,
                unit: macros.unit || 'g'
              };
            } else if (data && data.length > 0) {
              matchedFood = data[0];
              // Update local state so it is instantly available and displayed in the settings manager
              setCustomFoods(prev => [data[0], ...prev]);
            } else {
              matchedFood = {
                name: newFoodName,
                ...foodToInsert,
                unit: macros.unit || 'g'
              };
            }
          } catch (insertErr) {
            console.error("Insert transaction failed:", insertErr);
            matchedFood = {
              name: newFoodName,
              ...foodToInsert,
              unit: macros.unit || 'g'
            };
          }
        }
        
        // 3. Heuristic portion calculations
        if (matchedFood) {
          let qty = 1;
          const weight = item.weight_g;
          const isCup = matchedFood.name.toLowerCase().includes('(1 cup)') || matchedFood.unit === 'cup';
          const isQty = matchedFood.unit === 'qty' || (!matchedFood.name.toLowerCase().includes('g)') && !matchedFood.name.toLowerCase().includes('cup'));
          
          if (matchedFood.name.toLowerCase().includes('(100g)') || matchedFood.name.toLowerCase().includes('100g')) {
            qty = weight / 100;
          } else if (isCup) {
            qty = weight / 150;
          } else if (isQty) {
            qty = weight; // Count quantity
          } else {
            qty = weight / 100; // Default g weight heuristic
          }
          
          matchedItems.push({
            ...matchedFood,
            quantity: Number(qty.toFixed(2)),
            calcCals: matchedFood.calories * qty,
            calcP: matchedFood.protein * qty,
            calcC: matchedFood.carbs * qty,
            calcF: matchedFood.fats * qty
          });
        }
      }
      
      setParsedItems(matchedItems);
      
      if (matchedItems.length > 0) {
        await logMeal(matchedItems);
      } else {
        alert("Could not match or estimate any foods from your input.");
      }
    } catch (err) {
      console.error("Data Processing Error:", err);
      alert("Failed to process parsed data. " + err.message);
    }
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

    
    const startTime = performance.now();
    try {
      const { data, error } = await supabase
        .from('meals')
        .insert([mealToInsert])
        .select();

      if (error) throw error;

      const duration = Math.round(performance.now() - startTime);
      

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
      console.warn("Offline or insert failed. Saving locally.", err);
      const offlineMeal = { ...mealToInsert, id: 'temp-' + Date.now(), is_offline: true };
      setMeals([offlineMeal, ...meals]);
      
      

      const queue = JSON.parse(localStorage.getItem('wozan-offline-queue') || '[]');
      queue.push(mealToInsert);
      localStorage.setItem('wozan-offline-queue', JSON.stringify(queue));

      setInputText('');
      setParsedItems([]);
      const reset = {};
      Object.keys(quickQuantities).forEach(k => reset[k] = 0);
      setQuickQuantities(reset);

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setCurrentView('dashboard');
      }, 1200);
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
    const foodToDelete = customFoods.find(f => f.id === id);
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
    let prefix = "Fuel up for the day! ";
    if (timeOfDay === 'evening') prefix = "Time to recover and build! ";
    else if (timeOfDay === 'afternoon') prefix = "Keep the momentum going! ";

    const hour = new Date().getHours();
    
    // Calculate fat limit implicitly if not defined:
    const FAT_TARGET = Math.round((TARGET_CALORIES - (PROTEIN_TARGET * 4) - (CARBS_TARGET * 4)) / 9) || 100;
    
    // Rule C (On Track)
    if (Math.abs(TARGET_CALORIES - stats.calories) <= 100) {
      return {
        text: prefix + "Perfect execution today! Your macros are dialed in for recovery.",
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
        text: prefix + `You have room to grow! Consider adding a portion of ${foodName} to hit your target.`,
        icon: <Coffee className="w-5 h-5 text-amber-400" />
      };
    }

    // Rule B (Macro Mismatch)
    if (stats.fats >= (FAT_TARGET * 0.8) && stats.protein < PROTEIN_TARGET * 0.8) {
      return {
        text: prefix + "Macro Alert: You're hitting your fat limits. Focus on clean protein like Chicken Breast for the rest of the day.",
        icon: <AlertCircle className="w-5 h-5 text-rose-400" />
      };
    }

    // Morning specific context
    if (timeOfDay === 'morning' && stats.calories < TARGET_CALORIES * 0.2) {
      return {
        text: prefix + "Get those morning calories in. A big breakfast sets the tone for mass building.",
        icon: <Zap className="w-5 h-5 text-indigo-400" />
      };
    }

    // Fallback Advice
    if (stats.protein < PROTEIN_TARGET * 0.8) {
      return {
        text: prefix + "Eat some Steak or a Protein Shake to hit your muscle recovery goal.",
        icon: <Zap className="w-5 h-5 text-indigo-400" />
      };
    }

    if (stats.carbs < CARBS_TARGET * 0.8) {
      return {
        text: prefix + "Add Oats or Rice to your next meal for training energy.",
        icon: <Flame className="w-5 h-5 text-emerald-400" />
      }
    }

    return {
      text: prefix + "You're on track! Keep hitting those macros for consistent gains.",
      icon: <CheckCircle2 className="w-5 h-5 text-indigo-400" />
    };
  }, [stats.calories, stats.protein, stats.carbs, stats.fats, customFoods, timeOfDay, TARGET_CALORIES, PROTEIN_TARGET, CARBS_TARGET]);

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

  // --- APP BADGING ---
  useEffect(() => {
    if ('setAppBadge' in navigator) {
      if (progress >= 100) {
        navigator.clearAppBadge().catch(console.error);
      } else {
        navigator.setAppBadge(streakCount).catch(console.error);
      }
    }
  }, [streakCount, progress]);

  // --- PDF EXPORTER ---
  const exportPDF = async () => {
    const last7DaysStats = [];
    const today = new Date();
    for(let i=0; i<7; i++) {
         const d = new Date(today);
         d.setDate(d.getDate() - i);
         const dateStr = d.toISOString().split('T')[0];
         const dayMeals = meals.filter(m => (m.date || m.created_at.split('T')[0]) === dateStr);
         const cals = dayMeals.reduce((acc, m) => acc + Number(m.calories || 0), 0);
         last7DaysStats.push({ date: dateStr, calories: cals });
    }
    
    let summaryText = "Analyzing your consistency...";
    try {
       const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
       if (apiKey) {
         const genAI = new GoogleGenerativeAI(apiKey);
         const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
         const prompt = `Analyze this 7 day consistency for a user with target ${TARGET_CALORIES}: ${JSON.stringify(last7DaysStats)}. Write a short, highly professional medical/health analytical summary for a PDF report. Return plain text only.`;
         const res = await model.generateContent(prompt);
         summaryText = res.response.text();
       }
    } catch(e) {
      summaryText = "Data summarized correctly.";
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Wozan Health Report</title>
          <style>
             body { font-family: sans-serif; padding: 40px; color: #111; max-width: 800px; margin: 0 auto; }
             h1 { color: #4f46e5; margin-bottom: 5px; }
             table { width: 100%; border-collapse: collapse; margin-top: 20px; }
             th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
             th { background: #f8fafc; font-weight: bold; }
             .summary { background: #f8fafc; padding: 20px; border-left: 4px solid #4f46e5; margin-bottom: 30px; margin-top: 20px; border-radius: 0 8px 8px 0; }
          </style>
        </head>
        <body>
          <h1>Wozan Analytical Health Report</h1>
          <p style="color: #666;">Generated: ${new Date().toLocaleDateString()}</p>
          <div class="summary">
            <h3 style="margin-top:0;">AI Analytical Summary</h3>
            <p style="line-height: 1.6;">${summaryText}</p>
          </div>
          <h3>7-Day Log</h3>
          <table>
            <tr><th>Date</th><th>Calories Logged</th><th>Target</th><th>Status</th></tr>
            ${last7DaysStats.map(d => `<tr><td>${d.date}</td><td>${d.calories} kcal</td><td>${TARGET_CALORIES} kcal</td><td>${d.calories >= TARGET_CALORIES*0.9 ? 'On Track' : 'Needs Focus'}</td></tr>`).join('')}
          </table>
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

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

      {/* AI Parsing Loading Overlay */}
      {isParsingAI && (
        <div className={`fixed inset-0 backdrop-blur-sm z-[100] flex items-center justify-center transition-all ${theme === 'dark' ? 'bg-slate-950/80' : 'bg-white/80'}`}>
          <div className="flex flex-col items-center gap-4 text-center px-4 max-w-sm animate-in fade-in duration-300">
            <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            <p className="text-indigo-500 font-black text-xs uppercase tracking-[0.2em] animate-pulse">{aiLoadingText}</p>
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

            {/* Predictive Trend Forecaster */}
            <TrendForecaster meals={meals} targetCalories={TARGET_CALORIES} theme={theme} />

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

            {/* Interactive Fluid Canvas for Hydration */}
            <HydrationTracker intake={waterIntake} setIntake={setWaterIntake} theme={theme} />

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
                  disabled={isParsingAI || isListening}
                />
                <div className="absolute right-6 bottom-6 flex gap-3">
                  <button 
                    onClick={startCamera}
                    disabled={isParsingAI || isCameraOpen}
                    className={`p-3 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                      theme === 'dark'
                        ? 'bg-slate-800 text-slate-400 hover:text-white'
                        : 'bg-slate-200 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <Camera className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={toggleListening}
                    disabled={isParsingAI || isCameraOpen}
                    className={`p-3 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                      isListening 
                        ? 'bg-rose-500 text-white animate-pulse' 
                        : theme === 'dark'
                          ? 'bg-slate-800 text-slate-400 hover:text-white'
                          : 'bg-slate-200 text-slate-600 hover:bg-white'
                    }`}
                  >
                    {isListening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                  </button>
                  <button 
                    onClick={() => parseWithAI()}
                    disabled={inputText.length < 2 || isParsingAI || isListening || isCameraOpen}
                    className={`p-3 rounded-2xl shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center ${
                      inputText.length >= 2 && !isParsingAI && !isListening
                        ? 'bg-indigo-600 text-white' 
                        : theme === 'dark' ? 'bg-slate-800 text-slate-600' : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {isParsingAI ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap className="w-6 h-6 fill-current" />}
                  </button>
                </div>
              </div>

              {/* Camera Preview Modal */}
              {isCameraOpen && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in ${theme === 'dark' ? 'bg-slate-950/80' : 'bg-slate-900/40'}`}>
                  <div className={`w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden p-6 relative ${theme === 'dark' ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className={`font-black text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Food Camera</h3>
                      <button onClick={() => { setIsCameraOpen(false); videoRef.current?.srcObject?.getTracks().forEach(t=>t.stop()); }} className="p-2 rounded-full bg-red-500/10 text-red-500">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="relative rounded-2xl overflow-hidden bg-black mb-4 aspect-square">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      <canvas ref={canvasRef} className="hidden" />
                    </div>
                    <button 
                      onClick={capturePhotoAndParse}
                      disabled={isParsingAI}
                      className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black hover:bg-indigo-500 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      {isParsingAI ? "Processing Image..." : "Capture & Parse"}
                    </button>
                  </div>
                </div>
              )}
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

            {/* Interactive Macro Balancer */}
            <InterlockingMacroBalancer 
              targetCalories={targetCalories}
              pTarget={PROTEIN_TARGET}
              cTarget={CARBS_TARGET}
              fTarget={FATS_TARGET}
              setMacroTargets={setMacroTargets}
              theme={theme}
            />

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

        {/* VIEW: PLANNER */}
        {currentView === 'planner' && (
          <PlannerView customFoods={customFoods} foodDb={FOOD_DB} theme={theme} targets={{ calories: TARGET_CALORIES, protein: PROTEIN_TARGET, carbs: CARBS_TARGET, fats: FATS_TARGET }} />
        )}

        {/* VIEW: SANDBOX */}
        {currentView === 'sandbox' && (
          <SandboxView 
            meals={meals} 
            targetCalories={TARGET_CALORIES} 
            proteinTarget={PROTEIN_TARGET} 
            carbsTarget={CARBS_TARGET} 
            fatsTarget={FATS_TARGET} 
            customFoods={[...FOOD_DB, ...customFoods]}
            theme={theme} 
          />
        )}

        {/* VIEW: WEIGHT TRACKER */}
        {currentView === 'weight' && (
          <WeightTrackerView
            targetCalories={TARGET_CALORIES}
            meals={meals}
            theme={theme}
          />
        )}
      </main>

      {/* Floating AI Coach Button */}
      {currentView !== 'admin' && (
        <button 
          onClick={() => setIsCoachOpen(true)}
          className="fixed bottom-24 right-5 z-40 w-14 h-14 bg-indigo-600 rounded-full shadow-[0_0_20px_rgba(79,70,229,0.5)] flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all"
        >
          <Zap className="w-6 h-6 fill-current animate-pulse" />
        </button>
      )}
      
      {/* AI Coach Drawer */}
      <AICoachDrawer 
        isOpen={isCoachOpen}
        onClose={() => setIsCoachOpen(false)}
        stats={stats}
        targetCalories={TARGET_CALORIES}
        streak={streakCount}
        theme={theme}
        customFoods={[...FOOD_DB, ...customFoods]}
      />

      {/* Technical Monospace System Kernel Log Drawer */}
      <KernelLogDrawer 
        systemLogs={systemLogs} 
        addSystemLog={addSystemLog} 
        theme={theme} 
      />

      {/* Bottom Navigation */}
      <nav className={`fixed bottom-0 w-full border-t flex items-center justify-between px-6 py-3 pb-8 z-40 transition-all duration-300 overflow-x-auto gap-4 scrollbar-hide ${
        theme === 'dark' 
          ? 'bg-slate-900/90 border-slate-800/50 text-white shadow-[0_-20px_50px_rgba(0,0,0,0.5)]' 
          : 'bg-white/90 border-slate-200/50 text-slate-800 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]'
      }`}>
        <button onClick={() => setCurrentView('dashboard')} className={`flex flex-col items-center justify-center gap-1.5 transition-all ${
          currentView === 'dashboard' 
            ? theme === 'dark' ? 'text-indigo-400' : 'text-indigo-650 font-black' 
            : 'text-slate-500 dark:text-slate-600'
        }`}>
          <Activity className={`w-6 h-6 ${currentView === 'dashboard' ? 'scale-110 drop-shadow-[0_0_12px_rgba(79,70,229,0.4)]' : ''} transition-all`} />
          <span className="text-[9px] font-black tracking-widest uppercase">Dash</span>
        </button>
        <button onClick={() => setCurrentView('add')} className={`flex flex-col items-center justify-center gap-1.5 transition-all ${
          currentView === 'add' 
            ? theme === 'dark' ? 'text-indigo-400' : 'text-indigo-650 font-black' 
            : 'text-slate-500 dark:text-slate-600'
        }`}>
          <PlusCircle className={`w-6 h-6 ${currentView === 'add' ? 'scale-110 drop-shadow-[0_0_12px_rgba(79,70,229,0.4)]' : ''} transition-all`} />
          <span className="text-[9px] font-black tracking-widest uppercase">Log</span>
        </button>
        <button onClick={() => setCurrentView('planner')} className={`flex flex-col items-center justify-center gap-1.5 transition-all ${
          currentView === 'planner' 
            ? theme === 'dark' ? 'text-indigo-400' : 'text-indigo-650 font-black' 
            : 'text-slate-500 dark:text-slate-600'
        }`}>
          <ShoppingCart className={`w-6 h-6 ${currentView === 'planner' ? 'scale-110 drop-shadow-[0_0_12px_rgba(79,70,229,0.4)]' : ''} transition-all`} />
          <span className="text-[9px] font-black tracking-widest uppercase">Plan</span>
        </button>
        <button onClick={() => setCurrentView('sandbox')} className={`flex flex-col items-center justify-center gap-1.5 transition-all ${
          currentView === 'sandbox' 
            ? theme === 'dark' ? 'text-indigo-400' : 'text-indigo-650 font-black' 
            : 'text-slate-500 dark:text-slate-600'
        }`}>
          <Layers className={`w-6 h-6 ${currentView === 'sandbox' ? 'scale-110 drop-shadow-[0_0_12px_rgba(79,70,229,0.4)]' : ''} transition-all`} />
          <span className="text-[9px] font-black tracking-widest uppercase">Sim</span>
        </button>
        <button onClick={() => setCurrentView('history')} className={`flex flex-col items-center justify-center gap-1.5 transition-all ${
          currentView === 'history' 
            ? theme === 'dark' ? 'text-indigo-400' : 'text-indigo-650 font-black' 
            : 'text-slate-500 dark:text-slate-600'
        }`}>
          <History className={`w-6 h-6 ${currentView === 'history' ? 'scale-110 drop-shadow-[0_0_12px_rgba(79,70,229,0.4)]' : ''} transition-all`} />
          <span className="text-[9px] font-black tracking-widest uppercase">Logs</span>
        </button>
        <button onClick={() => setCurrentView('admin')} className={`flex flex-col items-center justify-center gap-1.5 transition-all ${
          currentView === 'admin' 
            ? theme === 'dark' ? 'text-indigo-400' : 'text-indigo-650 font-black' 
            : 'text-slate-500 dark:text-slate-600'
        }`}>
          <Settings className={`w-6 h-6 ${currentView === 'admin' ? 'scale-110 drop-shadow-[0_0_12px_rgba(79,70,229,0.4)]' : ''} transition-all`} />
          <span className="text-[9px] font-black tracking-widest uppercase">Admin</span>
        </button>
        <button onClick={() => setCurrentView('weight')} className={`flex flex-col items-center justify-center gap-1.5 transition-all ${
          currentView === 'weight' 
            ? theme === 'dark' ? 'text-indigo-400' : 'text-indigo-650 font-black' 
            : 'text-slate-500 dark:text-slate-600'
        }`}>
          <TrendingUp className={`w-6 h-6 ${currentView === 'weight' ? 'scale-110 drop-shadow-[0_0_12px_rgba(79,70,229,0.4)]' : ''} transition-all`} />
          <span className="text-[9px] font-black tracking-widest uppercase">Scale</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
