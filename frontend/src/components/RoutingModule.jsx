import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Truck, 
  Layers, 
  TrendingUp, 
  Info, 
  Map as MapIcon, 
  Package, 
  RefreshCw, 
  Navigation, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  ChevronRight,
  TrendingDown,
  DollarSign,
  Fuel,
  Users,
  Sliders,
  Sparkles,
  Clock,
  Target
} from 'lucide-react';

// Color map for drivers (premium, high-contrast colors)
const DRIVER_COLORS = {
  "driver_1": { stroke: "#8b5cf6", fill: "#c084fc", bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400" },
  "driver_2": { stroke: "#10b981", fill: "#34d399", bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400" },
  "driver_3": { stroke: "#f59e0b", fill: "#fbbf24", bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400" },
  "driver_4": { stroke: "#0ea5e9", fill: "#38bdf8", bg: "bg-sky-500/10", border: "border-sky-500/30", text: "text-sky-400" },
  "driver_5": { stroke: "#ec4899", fill: "#f472b6", bg: "bg-pink-500/10", border: "border-pink-500/30", text: "text-pink-400" },
  "driver_6": { stroke: "#f43f5e", fill: "#fb7185", bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-400" },
  "driver_7": { stroke: "#06b6d4", fill: "#22d3ee", bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-400" },
  "driver_8": { stroke: "#eab308", fill: "#facc15", bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400" },
  "driver_default": { stroke: "#64748b", fill: "#94a3b8", bg: "bg-slate-500/10", border: "border-slate-505/30", text: "text-slate-400" }
};

export default function RoutingModule({ onDriversChange, onOrdersChange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Interactive UI states
  const [activeDriver, setActiveDriver] = useState(null); // driver key hovered or selected
  const [hoveredStop, setHoveredStop] = useState(null); // stop object hovered
  const [visibleDrivers, setVisibleDrivers] = useState({}); // map of driver_id -> boolean
  const [expandedDriver, setExpandedDriver] = useState(null); // driver key showing full stop list
  const [zoom, setZoom] = useState(1);
  const [showTraffic, setShowTraffic] = useState(false);

  // Optimization Parameters State
  const [ordersCount, setOrdersCount] = useState(25);
  const [driverMode, setDriverMode] = useState('AI Recommended');
  const [driverCount, setDriverCount] = useState(7);
  const [capacity, setCapacity] = useState(15.0);
  const [fuelPrice, setFuelPrice] = useState(104.0);
  const [mileage, setMileage] = useState(35.0);
  const [maxDeliveryTime, setMaxDeliveryTime] = useState(45);
  const [optimizationGoal, setOptimizationGoal] = useState('Lowest Total Cost');
  const [enablePriority, setEnablePriority] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState(null);

  useEffect(() => {
    if (onDriversChange && typeof driverCount === 'number' && !isNaN(driverCount)) {
      onDriversChange(driverCount);
    }
  }, [driverCount, onDriversChange]);

  useEffect(() => {
    if (onOrdersChange && typeof ordersCount === 'number' && !isNaN(ordersCount)) {
      onOrdersChange(ordersCount);
    }
  }, [ordersCount, onOrdersChange]);

  const fetchRouting = () => {
    setLoading(true);
    setError(null);
    
    const params = new URLSearchParams({
      num_drivers: driverCount.toString(),
      capacity_limit_kg: capacity.toString(),
      num_orders: ordersCount.toString(),
      fuel_price: fuelPrice.toString(),
      mileage: mileage.toString(),
      max_delivery_time: maxDeliveryTime.toString(),
      optimization_goal: optimizationGoal,
      enable_priority: enablePriority ? 'true' : 'false',
      driver_mode: driverMode
    });

    fetch(`/api/routing?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error('CVRP optimization solver failed');
        return res.json();
      })
      .then(data => {
        setData(data);
        
        // Update driverCount state to recommended if AI Recommended mode is used
        if (data.ai_recommendation) {
          setAiRecommendation(data.ai_recommendation);
          setDriverCount(data.ai_recommendation.recommended_drivers);
        } else {
          setAiRecommendation(null);
          if (data.metrics && data.metrics.num_drivers) {
            setDriverCount(data.metrics.num_drivers);
          }
        }
        
        // Initialize all drivers as visible
        const vis = {};
        Object.keys(data.routes).forEach(driverKey => {
          vis[driverKey] = true;
        });
        setVisibleDrivers(vis);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Logistics optimization engine timed out. Ensure the backend is active.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRouting();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-6">
        <div className="relative w-48 h-32 flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 200 100">
            <line x1="40" y1="50" x2="100" y2="20" stroke="#8b5cf6" strokeWidth="1.5" className="animate-pulse" opacity="0.6" />
            <line x1="40" y1="50" x2="100" y2="80" stroke="#10b981" strokeWidth="1.5" className="animate-pulse" opacity="0.6" />
            <line x1="100" y1="20" x2="160" y2="50" stroke="#f59e0b" strokeWidth="1.5" />
            <line x1="100" y1="80" x2="160" y2="50" stroke="#0ea5e9" strokeWidth="1.5" />
            <line x1="100" y1="20" x2="100" y2="80" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
            
            <circle cx="40" cy="50" r="6" fill="#8b5cf6" className="animate-ping" />
            <circle cx="40" cy="50" r="5" fill="#8b5cf6" />

            <circle cx="100" cy="20" r="6" fill="#10b981" className="animate-ping" style={{ animationDelay: '0.3s' }} />
            <circle cx="100" cy="20" r="5" fill="#10b981" />

            <circle cx="100" cy="80" r="6" fill="#f59e0b" className="animate-ping" style={{ animationDelay: '0.6s' }} />
            <circle cx="100" cy="80" r="5" fill="#f59e0b" />

            <circle cx="160" cy="50" r="6" fill="#0ea5e9" className="animate-ping" style={{ animationDelay: '0.9s' }} />
            <circle cx="160" cy="50" r="5" fill="#0ea5e9" />
          </svg>
        </div>
        <div className="text-center space-y-1.5 z-10">
          <h4 className="text-sm font-bold uppercase tracking-widest text-[#111827] flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#4F46E5]" />
            Solving Capacitated Vehicle Routing
          </h4>
          <p className="text-xs text-[#4B5563] font-mono">
            Running sweep heuristics & OR-Tools integer programming...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300 max-w-xl mx-auto mt-12 space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2 text-red-400">
          <Info className="w-5 h-5" />
          Logistics Engine Offline
        </h3>
        <p className="text-sm text-slate-300">{error || 'Unknown error occurred.'}</p>
        <button 
          onClick={fetchRouting}
          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-xs font-semibold flex items-center gap-2 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Optimization
        </button>
      </div>
    );
  }

  const { routes, metrics } = data;
  const depotLat = metrics.depot.lat;
  const depotLng = metrics.depot.lng;

  // Calculate coordinates bounds across all stops & depot for adaptive SVG canvas scaling
  let allLats = [depotLat];
  let allLngs = [depotLng];

  Object.values(routes).forEach(route => {
    route.stops.forEach(stop => {
      allLats.push(stop.lat);
      allLngs.push(stop.lng);
    });
  });

  const minLat = Math.min(...allLats);
  const maxLat = Math.max(...allLats);
  const minLng = Math.min(...allLngs);
  const maxLng = Math.max(...allLngs);

  // Add 15% margin padding to map layout
  const latRange = maxLat - minLat || 0.01;
  const lngRange = maxLng - minLng || 0.01;
  const padLat = latRange * 0.15;
  const padLng = lngRange * 0.15;

  const bbox = {
    minLat: minLat - padLat,
    maxLat: maxLat + padLat,
    minLng: minLng - padLng,
    maxLng: maxLng + padLng
  };

  // SVG dimensions
  const svgWidth = 600;
  const svgHeight = 500;

  // Project Lat/Lng coordinates to SVG coordinate system
  const project = (lat, lng) => {
    const x = ((lng - bbox.minLng) / (bbox.maxLng - bbox.minLng)) * svgWidth;
    const y = ((bbox.maxLat - lat) / (bbox.maxLat - bbox.minLat)) * svgHeight;
    return { x, y };
  };

  const depotPos = project(depotLat, depotLng);

  // Toggle driver visibility
  const toggleVisibility = (driverKey) => {
    setVisibleDrivers(prev => ({
      ...prev,
      [driverKey]: !prev[driverKey]
    }));
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top dashboard header bar */}
      <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0F172A] flex items-center gap-2">
            <Truck className="text-[#4F46E5] w-5 h-5" />
            AI-Assisted Optimization Console
          </h2>
          <p className="text-[#475569] text-xs font-medium mt-0.5">
            Dynamic CVRP solver with priority routing, fleet configuration, and workload balancing.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side Control Panel: Optimization Config (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-5">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 border-b border-slate-850 pb-2.5">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Optimization Config
            </h3>
            
            {/* Orders Count Input */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Orders to Deliver</label>
              <input 
                type="number"
                value={ordersCount}
                onChange={(e) => setOrdersCount(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                onBlur={(e) => setOrdersCount(Math.max(5, Math.min(100, parseInt(e.target.value) || 25)))}
                className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500 transition font-mono font-bold"
              />
            </div>

            {/* Driver Allocation Mode */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Driver Allocation Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setDriverMode('Manual')}
                  className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg border transition ${
                    driverMode === 'Manual' 
                      ? 'bg-indigo-600 border-indigo-400/30 text-white shadow-lg' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Manual Drivers
                </button>
                <button 
                  onClick={() => setDriverMode('AI Recommended')}
                  className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg border transition flex items-center justify-center gap-1 ${
                    driverMode === 'AI Recommended' 
                      ? 'bg-violet-600 border-violet-400/30 text-white shadow-lg' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  AI Recommended
                </button>
              </div>
            </div>

            {/* Drivers Count / AI Recommendation Box */}
            {driverMode === 'Manual' ? (
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available Drivers</label>
                <input 
                  type="number"
                  value={driverCount}
                  onChange={(e) => setDriverCount(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                  onBlur={(e) => setDriverCount(Math.max(2, Math.min(20, parseInt(e.target.value) || 7)))}
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500 transition font-mono font-bold"
                />
              </div>
            ) : (
              aiRecommendation && (
                <div className="p-3 rounded-lg border border-violet-500/20 bg-violet-500/5 text-[11px] text-violet-300 space-y-2">
                  <p className="font-bold flex items-center gap-1 text-slate-100">
                    <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                    AI Recommended Drivers: <span className="font-mono text-violet-400 text-sm font-extrabold">{aiRecommendation.recommended_drivers}</span>
                  </p>
                  <p className="text-slate-450 leading-relaxed text-[10px]">{aiRecommendation.reason}</p>
                  <div className="grid grid-cols-2 gap-y-1 gap-x-2 pt-2 border-t border-violet-500/10 text-[9px] font-mono text-slate-400">
                    <div>Avg Payload: <span className="text-slate-200">{aiRecommendation.avg_payload} kg</span></div>
                    <div>Avg Dist: <span className="text-slate-200">{aiRecommendation.avg_distance} km</span></div>
                    <div>Est Time: <span className="text-slate-200">{aiRecommendation.est_delivery_time} min</span></div>
                    <div>Confidence: <span className="text-emerald-400 font-bold">{aiRecommendation.confidence}%</span></div>
                  </div>
                </div>
              )
            )}

            {/* Vehicle Capacity (kg) */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vehicle Capacity (kg)</label>
              <input 
                type="number"
                step="0.5"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                onBlur={(e) => setCapacity(Math.max(2, Math.min(100, parseFloat(e.target.value) || 15.0)))}
                className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500 transition font-mono font-bold"
              />
            </div>

            {/* Fuel Price & Average Mileage */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fuel Price (₹/L)</label>
                <input 
                  type="number"
                  value={fuelPrice}
                  onChange={(e) => setFuelPrice(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                  onBlur={(e) => setFuelPrice(Math.max(50, Math.min(200, parseFloat(e.target.value) || 104.0)))}
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500 transition font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mileage (km/L)</label>
                <input 
                  type="number"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                  onBlur={(e) => setMileage(Math.max(5, Math.min(100, parseFloat(e.target.value) || 35.0)))}
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500 transition font-mono font-bold"
                />
              </div>
            </div>

            {/* Maximum Delivery Time */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Max Delivery Time</label>
              <select 
                value={maxDeliveryTime}
                onChange={(e) => setMaxDeliveryTime(parseInt(e.target.value))}
                className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500 transition font-bold"
              >
                <option value="30">30 mins</option>
                <option value="45">45 mins</option>
                <option value="60">60 mins</option>
                <option value="90">90 mins</option>
                <option value="120">120 mins</option>
              </select>
            </div>

            {/* Optimization Goal */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Optimization Goal</label>
              <div className="space-y-1 text-[11px] text-slate-300">
                {[
                  { id: 'Lowest Fuel Cost', label: 'Lowest Fuel Cost' },
                  { id: 'Fastest Delivery', label: 'Fastest Delivery' },
                  { id: 'Balanced Workload', label: 'Balanced Workload' },
                  { id: 'Lowest Total Cost', label: 'Lowest Total Cost' },
                ].map(goal => (
                  <label key={goal.id} className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-slate-100 transition">
                    <input 
                      type="radio"
                      name="optimizationGoal"
                      value={goal.id}
                      checked={optimizationGoal === goal.id}
                      onChange={(e) => setOptimizationGoal(e.target.value)}
                      className="accent-indigo-500"
                    />
                    {goal.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Priority Orders Toggle */}
            <div className="flex items-center justify-between py-2 border-t border-slate-850">
              <div>
                <label className="text-[10px] font-bold text-slate-100 uppercase tracking-wider">Priority Orders</label>
                <p className="text-[9px] text-slate-500">Enable penalty multiplier for express deliveries</p>
              </div>
              <input 
                type="checkbox"
                checked={enablePriority}
                onChange={(e) => setEnablePriority(e.target.checked)}
                className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Run Optimization Button */}
            <button 
              onClick={fetchRouting}
              className="w-full flex items-center justify-center gap-2 bg-[#4F46E5] hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-lg border border-indigo-400/30 transition shadow-lg shadow-indigo-600/15 active:scale-[0.98]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Run Optimization
            </button>
          </div>
        </div>

        {/* Right Side Panels: KPI, Map & Cards (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel p-4 rounded-xl flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Distance</p>
                <p className="text-base font-extrabold font-mono tracking-tight text-slate-100 mt-0.5">{metrics.total_distance_km.toFixed(1)} km</p>
              </div>
            </div>
            <div className="glass-panel p-4 rounded-xl flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payload Weight</p>
                <p className="text-base font-extrabold font-mono tracking-tight text-slate-100 mt-0.5">{metrics.total_weight_kg.toFixed(2)} kg</p>
              </div>
            </div>
            <div className="glass-panel p-4 rounded-xl flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-450 border border-rose-500/20">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Depot Hub Location</p>
                <p className="text-xs font-extrabold text-slate-100 mt-0.5 truncate max-w-[150px]">{metrics.depot.name}</p>
              </div>
            </div>
          </div>

          {/* Financial cost breakdown */}
          {metrics.financials && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="glass-panel p-3 rounded-lg flex flex-col justify-center border-indigo-500/25 shadow-glow-indigo/5 bg-gradient-to-r from-indigo-950/20 to-purple-950/20">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Total Operational Cost</p>
                <p className="text-sm font-bold font-mono text-indigo-300 mt-0.5">₹{metrics.financials.total_operational_cost.toFixed(2)}</p>
              </div>
              <div className="glass-panel p-3 rounded-lg flex flex-col justify-center">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-405">Total Driver Salary</p>
                <p className="text-sm font-bold font-mono text-slate-200 mt-0.5">₹{metrics.financials.total_driver_cost.toFixed(2)}</p>
              </div>
              <div className="glass-panel p-3 rounded-lg flex flex-col justify-center">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Total Fuel Cost</p>
                <p className="text-sm font-bold font-mono text-slate-200 mt-0.5">₹{metrics.financials.total_fuel_cost.toFixed(2)}</p>
              </div>
              <div className="glass-panel p-3 rounded-lg flex flex-col justify-center">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Distance Penalty</p>
                <p className="text-sm font-bold font-mono text-slate-200 mt-0.5">₹{metrics.financials.total_distance_penalty.toFixed(2)}</p>
              </div>
              <div className="glass-panel p-3 rounded-lg flex flex-col justify-center col-span-2 sm:col-span-1">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Late Penalty</p>
                <p className="text-sm font-bold font-mono text-rose-400 mt-0.5">₹{(metrics.financials.total_late_penalty || 0).toFixed(2)}</p>
              </div>
            </div>
          )}

          {/* Subgrid: SVG Map & Driver Fleet Cards */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Interactive SVG Map (col-span-7) */}
            <div className="md:col-span-7 flex flex-col space-y-4">
              <div className="glass-panel p-4 rounded-2xl relative overflow-hidden flex flex-col justify-between flex-grow dark-map-container">
                
                {/* Map Header Overlay */}
                <div className="flex items-center justify-between z-10 bg-[#0B0F19]/95 p-2.5 rounded-xl border border-[#1E293B] backdrop-blur-md mb-3 text-[#F8FAFC]">
                  <span className="text-[10px] font-bold text-[#F1F5F9] flex items-center gap-1.5">
                    <MapIcon className="w-3.5 h-3.5 text-[#8b5cf6]" />
                    Navi Mumbai Distribution Area
                  </span>
                  <span className="text-[9px] text-[#94A3B8] font-mono">
                    {depotLat.toFixed(4)}°N, {depotLng.toFixed(4)}°E
                  </span>
                </div>

                {/* SVG Interactive Area */}
                <div className="relative aspect-video w-full bg-[#070A13] rounded-xl overflow-hidden border border-[#1E293B] shadow-inner flex items-center justify-center p-1">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.08),rgba(255,255,255,0))]" />
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#1E293B_1px,transparent_1px),linear-gradient(to_bottom,#1E293B_1px,transparent_1px)] bg-[size:24px_24px] opacity-25" />

                  <svg 
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
                    className="w-full h-full relative z-10 transition-transform duration-300"
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                  >
                    {/* Draw Route Lines */}
                    {Object.entries(routes).map(([driverKey, route]) => {
                      if (!visibleDrivers[driverKey]) return null;
                      
                      const color = DRIVER_COLORS[driverKey] || DRIVER_COLORS.driver_default;
                      const isHovered = activeDriver === driverKey;
                      
                      return (
                        <g 
                          key={`path-${driverKey}`} 
                          className="transition duration-300"
                          style={{ opacity: activeDriver && !isHovered ? 0.25 : 1 }}
                        >
                          {route.stops.map((stop, i) => {
                            if (i === 0) return null;
                            const prevPos = project(route.stops[i - 1].lat, route.stops[i - 1].lng);
                            const currPos = project(stop.lat, stop.lng);

                            return (
                              <g key={`leg-${driverKey}-${i}`}>
                                <line
                                  x1={prevPos.x}
                                  y1={prevPos.y}
                                  x2={currPos.x}
                                  y2={currPos.y}
                                  stroke={color.stroke}
                                  strokeWidth={isHovered ? 5 : 2}
                                  strokeOpacity={isHovered ? 0.4 : 0.15}
                                  className="transition duration-200"
                                />
                                <line
                                  x1={prevPos.x}
                                  y1={prevPos.y}
                                  x2={currPos.x}
                                  y2={currPos.y}
                                  stroke={color.stroke}
                                  strokeWidth={isHovered ? 2.5 : 1.5}
                                  strokeDasharray={isHovered ? "8 6" : "5 5"}
                                  strokeOpacity={isHovered ? 1 : 0.65}
                                  className="transition-all"
                                >
                                  <animate 
                                    attributeName="stroke-dashoffset" 
                                    values="100;0" 
                                    dur={isHovered ? "5s" : "10s"} 
                                    repeatCount="indefinite" 
                                  />
                                </line>
                              </g>
                            );
                          })}
                        </g>
                      );
                    })}

                    {/* Draw Customer Delivery Nodes */}
                    {Object.entries(routes).map(([driverKey, route]) => {
                      if (!visibleDrivers[driverKey]) return null;
                      const color = DRIVER_COLORS[driverKey] || DRIVER_COLORS.driver_default;
                      const isDriverHovered = activeDriver === driverKey;

                      return (
                        <g 
                          key={`nodes-${driverKey}`}
                          style={{ opacity: activeDriver && !isDriverHovered ? 0.25 : 1 }}
                          className="transition duration-300"
                        >
                          {route.stops.map((stop, idx) => {
                            if (stop.order_id === "DEPOT") return null;
                            const pos = project(stop.lat, stop.lng);
                            const isStopHovered = hoveredStop?.order_id === stop.order_id;

                            return (
                              <g 
                                key={`node-${stop.order_id}`}
                                transform={`translate(${pos.x}, ${pos.y})`}
                                onMouseEnter={() => {
                                  setHoveredStop({ ...stop, driverKey });
                                  setActiveDriver(driverKey);
                                }}
                                onMouseLeave={() => {
                                  setHoveredStop(null);
                                  setActiveDriver(null);
                                }}
                                className="cursor-pointer"
                              >
                                {isStopHovered && (
                                  <circle 
                                    r={12} 
                                    fill="none" 
                                    stroke={color.stroke} 
                                    strokeWidth={2}
                                    className="animate-ping"
                                  />
                                )}
                                <circle 
                                  r={isStopHovered ? 7.5 : 5} 
                                  fill={stop.is_priority ? "#f43f5e" : (isStopHovered ? "#0f172a" : color.fill)}
                                  stroke={stop.is_priority ? "#fb7185" : color.stroke}
                                  strokeWidth={stop.is_priority ? 3 : 2}
                                  className="transition-all duration-150 shadow-md"
                                />
                                <text
                                  y={-10}
                                  textAnchor="middle"
                                  fill={stop.is_priority ? "#f87171" : "#94a3b8"}
                                  fontSize={stop.is_priority ? 10 : 8}
                                  fontWeight="bold"
                                  className="font-mono select-none"
                                >
                                  {stop.is_priority ? "★" : `#${stop.stop_number}`}
                                </text>
                              </g>
                            );
                          })}
                        </g>
                      );
                    })}

                    {/* Draw Depot Pin */}
                    <g 
                      transform={`translate(${depotPos.x}, ${depotPos.y})`}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredStop({ order_id: "DEPOT", name: metrics.depot.name, lat: depotLat, lng: depotLng })}
                      onMouseLeave={() => setHoveredStop(null)}
                    >
                      <circle r={18} fill="rgba(244, 63, 94, 0.15)" className="animate-pulse" />
                      <circle r={8} fill="#f43f5e" stroke="#0f172a" strokeWidth={2} className="shadow-lg" />
                      <polygon 
                        points="0,-4 3,2 -3,2" 
                        fill="white"
                        transform="scale(0.8)"
                      />
                    </g>
                  </svg>

                  {/* Tooltip Hover Overlay */}
                  {hoveredStop && (
                    <div className="absolute bottom-3 left-3 right-3 glass-panel-glow p-3 rounded-xl border border-indigo-500/25 flex items-center justify-between text-xs animate-fadeIn z-30 bg-[#0B0F19]/90 text-slate-100">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${hoveredStop.order_id === 'DEPOT' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
                          {hoveredStop.order_id === 'DEPOT' ? <MapPin className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="font-bold flex items-center gap-1.5 text-slate-100 text-[11px]">
                            {hoveredStop.order_id === 'DEPOT' ? 'Central Depot' : `Order: ${hoveredStop.order_id}`}
                            {hoveredStop.is_priority && (
                              <span className="text-[8px] bg-rose-500/20 text-rose-450 px-1 py-0.5 rounded font-bold uppercase tracking-wider">
                                Express Priority
                              </span>
                            )}
                            {hoveredStop.stop_number && (
                              <span className="text-[9px] bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded font-mono border border-slate-700">
                                Stop #{hoveredStop.stop_number}
                              </span>
                            )}
                          </p>
                          <p className="text-slate-400 font-mono text-[9px] mt-0.5">
                            Lat: {hoveredStop.lat.toFixed(5)} | Lng: {hoveredStop.lng.toFixed(5)}
                          </p>
                        </div>
                      </div>
                      {hoveredStop.order_id !== 'DEPOT' && (
                        <div className="text-right">
                          <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Weight</p>
                          <p className="font-bold text-emerald-400 font-mono mt-0.5">{hoveredStop.weight_kg.toFixed(2)} KG</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Zoom Controls Overlay */}
                  <div className="absolute bottom-3 right-3 z-30 flex items-center gap-1 bg-[#0B0F19]/90 border border-[#1E293B] p-1 rounded-lg shadow-lg backdrop-blur-md">
                    <button 
                      onClick={() => setZoom(prev => Math.min(3, prev + 0.25))}
                      className="w-6 h-6 flex items-center justify-center text-xs font-bold text-slate-300 hover:text-white bg-[#1E293B] hover:bg-[#334155] rounded transition"
                    >
                      +
                    </button>
                    <button 
                      onClick={() => setZoom(prev => Math.max(1, prev - 0.25))}
                      className="w-6 h-6 flex items-center justify-center text-xs font-bold text-slate-300 hover:text-white bg-[#1E293B] hover:bg-[#334155] rounded transition"
                    >
                      -
                    </button>
                    <button 
                      onClick={() => setZoom(1)}
                      className="w-6 h-6 flex items-center justify-center text-[8px] font-bold text-slate-300 hover:text-white bg-[#1E293B] hover:bg-[#334155] rounded transition"
                    >
                      RST
                    </button>
                    <div className="w-[1px] h-3 bg-[#1E293B] mx-0.5" />
                    <button 
                      onClick={() => setShowTraffic(prev => !prev)}
                      className={`px-1.5 h-6 flex items-center gap-1 text-[8px] font-bold uppercase rounded transition ${
                        showTraffic 
                          ? 'bg-red-500/20 border border-red-500/40 text-red-400' 
                          : 'bg-[#1E293B] hover:bg-[#334155] text-slate-300 border border-transparent'
                      }`}
                    >
                      <span className={`w-1 h-1 rounded-full bg-red-500 ${showTraffic ? 'animate-ping' : ''}`} />
                      TRAFFIC
                    </button>
                  </div>
                </div>

                {/* Map Footer Legend */}
                <div className="mt-3.5 flex flex-wrap gap-2.5 text-xs font-semibold justify-center">
                  <span className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                    Depot
                  </span>
                  {Object.entries(routes).map(([driverKey, route]) => {
                    const color = DRIVER_COLORS[driverKey] || DRIVER_COLORS.driver_default;
                    return (
                      <button
                        key={`legend-${driverKey}`}
                        onClick={() => toggleVisibility(driverKey)}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] transition ${
                          visibleDrivers[driverKey] 
                            ? `${color.bg} ${color.border} ${color.text}` 
                            : 'bg-slate-900 border-slate-850 text-slate-400 line-through'
                        }`}
                      >
                        <span 
                          className="w-1.5 h-1.5 rounded-full" 
                          style={{ backgroundColor: visibleDrivers[driverKey] ? color.fill : '#64748b' }}
                        ></span>
                        {driverKey.replace('_', ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Fleet Drivers Breakdown Lists (col-span-5) */}
            <div className="md:col-span-5 flex flex-col space-y-3">
              <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-400" />
                Active Driver Assignments
              </h3>

              <div className="space-y-3.5 max-h-[440px] overflow-y-auto pr-1">
                {Object.entries(routes).map(([driverKey, route]) => {
                  const color = DRIVER_COLORS[driverKey] || DRIVER_COLORS.driver_default;
                  const isHovered = activeDriver === driverKey;
                  const isExpanded = expandedDriver === driverKey;
                  const weightPercent = (route.total_weight_kg / route.max_capacity_kg) * 100;
                  const stopsCount = route.stops.filter(s => s.order_id !== 'DEPOT').length;

                  return (
                    <div 
                      key={`card-${driverKey}`}
                      onMouseEnter={() => setActiveDriver(driverKey)}
                      onMouseLeave={() => setActiveDriver(null)}
                      className={`glass-panel p-4 rounded-xl border transition-all duration-300 relative overflow-hidden bg-slate-955/40 ${
                        isHovered ? 'border-indigo-500/40 shadow-glow-indigo' : 'border-slate-805/80'
                      }`}
                    >
                      {/* Left border active highlight */}
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-1" 
                        style={{ backgroundColor: color.stroke }}
                      />

                      {/* Header Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Truck className={`w-3.5 h-3.5 ${color.text}`} />
                          <h4 className="font-bold text-slate-100 text-xs capitalize">{driverKey.replace('_', ' ')}</h4>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => toggleVisibility(driverKey)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                            title={visibleDrivers[driverKey] ? "Hide Route" : "Show Route"}
                          >
                            {visibleDrivers[driverKey] ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                          
                          <button
                            onClick={() => setExpandedDriver(isExpanded ? null : driverKey)}
                            className={`p-1 hover:bg-slate-800 rounded text-slate-450 hover:text-white transition duration-200 ${
                              isExpanded ? 'rotate-90' : ''
                            }`}
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Weight bar */}
                      <div className="mt-3.5 space-y-1">
                        <div className="flex justify-between text-[10px] font-semibold">
                          <span className="text-slate-400">Capacity Load Util</span>
                          <span className={`font-bold font-mono ${weightPercent > 90 ? 'text-rose-400 animate-pulse' : 'text-slate-300'}`}>
                            {route.total_weight_kg.toFixed(2)} / {route.max_capacity_kg.toFixed(1)} KG ({weightPercent.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full bg-[#1E293B] h-2 rounded-full overflow-hidden border border-slate-800">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              weightPercent > 90 
                                ? 'bg-gradient-to-r from-red-500 to-rose-600 animate-pulse' 
                                : weightPercent > 60 
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-600' 
                                : 'bg-gradient-to-r from-indigo-500 to-purple-600'
                            }`}
                            style={{ width: `${Math.min(100, weightPercent)}%` }}
                          />
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-2 mt-3 bg-slate-900/50 p-2 rounded-lg border border-slate-850 text-[10px] font-semibold">
                        <div>
                          <p className="text-slate-400">Distance</p>
                          <p className="font-bold text-slate-200 mt-0.5 font-mono">{route.total_distance_km.toFixed(1)} km</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Deliveries</p>
                          <p className="font-bold text-slate-200 mt-0.5 font-mono">{stopsCount} orders</p>
                        </div>
                      </div>

                      {/* Route Financials */}
                      {route.financials && (
                        <div className="mt-2.5 bg-slate-950/40 p-2.5 rounded-lg border border-slate-900 text-[10px] font-medium space-y-1">
                          <div className="flex justify-between text-slate-400">
                            <span>Salary (Fixed):</span>
                            <span className="font-bold text-slate-300 font-mono">₹{route.financials.driver_salary.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Fuel:</span>
                            <span className="font-bold text-slate-300 font-mono">₹{route.financials.fuel_cost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Wear/Distance penalty:</span>
                            <span className="font-bold text-slate-300 font-mono">₹{route.financials.distance_penalty.toFixed(2)}</span>
                          </div>
                          {route.financials.late_delivery_penalty > 0 && (
                            <div className="flex justify-between text-rose-405 font-semibold animate-pulse">
                              <span>Late Penalty:</span>
                              <span className="font-bold font-mono">₹{route.financials.late_delivery_penalty.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="border-t border-slate-800 my-1 pt-1 flex justify-between font-bold text-indigo-405 text-[11px]">
                            <span>Route cost:</span>
                            <span className="font-mono text-slate-100">₹{route.financials.route_cost.toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      {/* Expandable stops details list */}
                      {isExpanded && (
                        <div className="mt-3 border-t border-slate-800/80 pt-3 space-y-1.5 animate-fadeIn max-h-40 overflow-y-auto pr-1">
                          {route.stops.map((stop, sidx) => {
                            const isDepot = stop.order_id === 'DEPOT';
                            const isNodeHovered = hoveredStop?.order_id === stop.order_id;
                            
                            return (
                              <div 
                                key={`stop-${stop.order_id}-${sidx}`}
                                onMouseEnter={() => setHoveredStop({ ...stop, driverKey })}
                                onMouseLeave={() => setHoveredStop(null)}
                                className={`flex items-center justify-between p-2 rounded-lg border text-[10px] font-semibold transition cursor-pointer ${
                                  isNodeHovered 
                                    ? 'bg-indigo-950/40 border-indigo-500 text-indigo-200' 
                                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[9px] bg-slate-855 text-slate-300 px-1 rounded">
                                    {sidx}
                                  </span>
                                  <span className={isDepot ? "text-rose-400" : "text-slate-200"}>
                                    {isDepot ? "Depot" : `Order #${stop.order_id}`}
                                  </span>
                                  {stop.is_priority && (
                                    <span className="text-[8px] text-rose-400 font-bold">★</span>
                                  )}
                                </div>
                                {!isDepot && (
                                  <span className="font-mono text-[9px] text-slate-400">
                                    {stop.weight_kg.toFixed(2)} KG
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
