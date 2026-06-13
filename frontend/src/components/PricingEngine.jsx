import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceDot,
  ReferenceLine
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Percent, 
  Activity, 
  Info, 
  FileText, 
  Sliders, 
  AlertCircle,
  RotateCcw,
  Sparkles,
  Info as InfoIcon,
  HelpCircle
} from 'lucide-react';

export default function PricingEngine() {
  const [skus, setSkus] = useState([]);
  const [selectedSku, setSelectedSku] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pricingData, setPricingData] = useState(null);
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);
  const [showXaiPanel, setShowXaiPanel] = useState(true);
  const [aiExplanation, setAiExplanation] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Retraining & Log Upload States
  const [retrainPeriod, setRetrainPeriod] = useState('Last Quarter');
  const [retrainLoading, setRetrainLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [retrainStatus, setRetrainStatus] = useState(null);

  // What-If Simulation States
  const [simPrice, setSimPrice] = useState(0);
  const [simCompPrice, setSimCompPrice] = useState(0);
  const [simPromo, setSimPromo] = useState(0);
  const [simTemp, setSimTemp] = useState(25);
  const [simRain, setSimRain] = useState(0);
  const [simWeekend, setSimWeekend] = useState(0);
  const [simFestival, setSimFestival] = useState(0);
  const [simHoliday, setSimHoliday] = useState(0);
  const [simTod, setSimTod] = useState('Evening');
  const [simInventory, setSimInventory] = useState(250);

  // Fetch unique SKUs
  useEffect(() => {
    fetch('/api/skus')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch SKUs list');
        return res.json();
      })
      .then(data => {
        if (data.skus && data.skus.length > 0) {
          setSkus(data.skus);
          setSelectedSku(data.skus[0]);
        } else {
          setError('No SKUs found in the transaction log.');
        }
      })
      .catch(err => {
        console.error(err);
        setError('Error loading SKU catalog. Ensure the backend is active.');
        setLoading(false);
      });
  }, []);

  // Fetch Pricing details when selectedSku changes
  useEffect(() => {
    if (!selectedSku) return;
    setLoading(true);
    setError(null);
    fetch(`/api/pricing?sku_id=${selectedSku}`)
      .then(res => {
        if (!res.ok) throw new Error(`Optimization failed for ${selectedSku}`);
        return res.json();
      })
      .then(data => {
        setPricingData(data);
        
        // Initialize What-If Simulation Slider values to match base states
        setSimPrice(data.metrics.current_price);
        setSimCompPrice(data.baselines.mean_comp_price);
        setSimPromo(data.baselines.mean_promo > 0.5 ? 1 : 0);
        setSimTemp(data.baselines.mean_temp);
        setSimRain(data.baselines.mean_rain > 0.5 ? 1 : 0);
        setSimWeekend(data.baselines.mean_weekend > 0.5 ? 1 : 0);
        setSimFestival(data.baselines.mean_festival > 0.5 ? 1 : 0);
        setSimHoliday(data.baselines.mean_holiday > 0.5 ? 1 : 0);
        setSimTod('Evening'); // Default reference period for preview
        
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(`Failed to retrieve optimization for ${selectedSku}`);
        setLoading(false);
      });
  }, [selectedSku]);

  // Reset What-If parameters back to baseline means
  const resetToBaselines = () => {
    if (!pricingData) return;
    setSimPrice(pricingData.metrics.current_price);
    setSimCompPrice(pricingData.baselines.mean_comp_price);
    setSimPromo(pricingData.baselines.mean_promo > 0.5 ? 1 : 0);
    setSimTemp(pricingData.baselines.mean_temp);
    setSimRain(pricingData.baselines.mean_rain > 0.5 ? 1 : 0);
    setSimWeekend(pricingData.baselines.mean_weekend > 0.5 ? 1 : 0);
    setSimFestival(pricingData.baselines.mean_festival > 0.5 ? 1 : 0);
    setSimHoliday(pricingData.baselines.mean_holiday > 0.5 ? 1 : 0);
    setSimTod('Evening');
  };

  // Clear AI insights whenever simulator parameters are adjusted
  useEffect(() => {
    setAiExplanation('');
  }, [
    selectedSku,
    simPrice,
    simCompPrice,
    simPromo,
    simTemp,
    simRain,
    simWeekend,
    simFestival,
    simHoliday,
    simTod,
    simInventory
  ]);

  const fetchAiExplanation = () => {
    if (!pricingData) return;
    setAiLoading(true);
    setAiExplanation('');

    const query = new URLSearchParams({
      sku_id: selectedSku,
      price: simPrice,
      comp_price: simCompPrice,
      promo: simPromo,
      temp: simTemp,
      rain: simRain,
      weekend: simWeekend,
      festival: simFestival,
      holiday: simHoliday,
      tod: simTod,
      predicted_demand: simDemand,
      predicted_revenue: simRevenue,
      predicted_profit: simProfit,
      elasticity: pricingData.elasticity,
      unit_cost: pricingData.unit_cost,
      inventory: simInventory
    }).toString();

    fetch(`/api/pricing/explain?${query}`)
      .then(res => res.json())
      .then(data => {
        setAiExplanation(data.explanation.replace(/\*\*/g, ''));
        setAiLoading(false);
      })
      .catch(err => {
        console.error(err);
        setAiExplanation('Failed to load strategic recommendations. Verify backend connectivity.');
        setAiLoading(false);
      });
  };

  const runPresetScenario = (preset) => {
    if (!pricingData) return;
    
    let nextPrice = simPrice;
    let nextCompPrice = simCompPrice;
    let nextPromo = simPromo;
    let nextTemp = simTemp;
    let nextRain = simRain;
    let nextWeekend = simWeekend;
    let nextFestival = simFestival;
    let nextHoliday = simHoliday;
    let nextTod = simTod;
    
    if (preset === 'comp_drop') {
      nextCompPrice = pricingData.baselines.mean_comp_price * 0.9;
      setSimCompPrice(nextCompPrice);
    } else if (preset === 'max_vol') {
      nextPrice = pricingData.metrics.current_price * 0.85;
      nextPromo = 1;
      setSimPrice(nextPrice);
      setSimPromo(1);
    } else if (preset === 'rainy_weekend') {
      nextRain = 1;
      nextWeekend = 1;
      nextTod = 'Evening';
      setSimRain(1);
      setSimWeekend(1);
      setSimTod('Evening');
    }

    const { coefs, unit_cost } = pricingData;
    let baselineLog = coefs.beta_0 + 
                      (coefs.beta_2 * Math.log(nextCompPrice)) + 
                      (coefs.beta_3 * nextPromo) + 
                      (coefs.beta_temp * nextTemp) + 
                      (coefs.beta_rain * nextRain) + 
                      (coefs.beta_weekend * nextWeekend) + 
                      (coefs.beta_festival * nextFestival) + 
                      (coefs.beta_holiday * nextHoliday);

    if (nextTod === "Afternoon") baselineLog += coefs.beta_tod_afternoon;
    else if (nextTod === "Evening") baselineLog += coefs.beta_tod_evening;
    else if (nextTod === "Night") baselineLog += coefs.beta_tod_night;

    const calculatedDemand = Math.max(0, Math.exp(baselineLog + coefs.beta_1 * Math.log(nextPrice)) - 1.0);
    const calculatedRevenue = nextPrice * calculatedDemand;
    const calculatedProfit = (nextPrice - unit_cost) * calculatedDemand;

    setAiLoading(true);
    setAiExplanation('');

    const query = new URLSearchParams({
      sku_id: selectedSku,
      price: nextPrice,
      comp_price: nextCompPrice,
      promo: nextPromo,
      temp: nextTemp,
      rain: nextRain,
      weekend: nextWeekend,
      festival: nextFestival,
      holiday: nextHoliday,
      tod: nextTod,
      predicted_demand: calculatedDemand,
      predicted_revenue: calculatedRevenue,
      predicted_profit: calculatedProfit,
      elasticity: pricingData.elasticity,
      unit_cost: pricingData.unit_cost,
      inventory: simInventory
    }).toString();

    fetch(`/api/pricing/explain?${query}`)
      .then(res => res.json())
      .then(data => {
        setAiExplanation(data.explanation.replace(/\*\*/g, ''));
        setAiLoading(false);
      })
      .catch(err => {
        console.error(err);
        setAiExplanation('Failed to load strategic recommendations. Verify backend connectivity.');
        setAiLoading(false);
      });
  };

  const handleRetrain = () => {
    setRetrainLoading(true);
    setRetrainStatus(null);

    fetch(`/api/pricing/retrain?period=${retrainPeriod}`, { method: 'POST' })
      .then(res => {
        if (!res.ok) throw new Error('Retraining failed');
        return res.json();
      })
      .then(data => {
        setRetrainStatus({ type: 'success', message: data.message });
        
        // Re-fetch model coefficients with the newly active period context
        return fetch(`/api/pricing?sku_id=${selectedSku}&inventory=${simInventory}&period=${retrainPeriod}`);
      })
      .then(res => res.json())
      .then(data => {
        setPricingData(data);
        setRetrainLoading(false);
      })
      .catch(err => {
        console.error(err);
        setRetrainStatus({ type: 'error', message: 'Model retraining failed. Check server logs.' });
        setRetrainLoading(false);
      });
  };

  const handleUploadLogs = (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploadLoading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append('file', uploadFile);

    fetch('/api/upload_transactions', {
      method: 'POST',
      body: formData
    })
      .then(res => {
        if (!res.ok) throw new Error('File ingestion failed');
        return res.json();
      })
      .then(data => {
        setUploadStatus({ type: 'success', message: data.message });
        setUploadFile(null);
        setUploadLoading(false);
        
        // Trigger refitting automatically on the new logs using the selected period
        handleRetrain();
      })
      .catch(err => {
        console.error(err);
        setUploadStatus({ type: 'error', message: 'Failed to ingest log. Ensure schema matches required features.' });
        setUploadLoading(false);
      });
  };

  if (loading && skus.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="text-slate-400 font-medium animate-pulse">Initializing Pricing Engine...</p>
      </div>
    );
  }

  // Calculate What-If Simulator and Explainable AI (XAI) attributions dynamically
  let simDemand = 0;
  let simRevenue = 0;
  let simProfit = 0;
  let simCost = 0;
  let attributions = [];
  
  if (pricingData) {
    const { coefs, unit_cost } = pricingData;
    simCost = unit_cost;

    // 1. Construct log baseline demand
    let baselineLog = coefs.beta_0 + 
                      (coefs.beta_2 * Math.log(simCompPrice)) + 
                      (coefs.beta_3 * simPromo) + 
                      (coefs.beta_temp * simTemp) + 
                      (coefs.beta_rain * simRain) + 
                      (coefs.beta_weekend * simWeekend) + 
                      (coefs.beta_festival * simFestival) + 
                      (coefs.beta_holiday * simHoliday);

    // Apply Time of Day dummy coefficient shifts
    if (simTod === "Afternoon") baselineLog += coefs.beta_tod_afternoon;
    else if (simTod === "Evening") baselineLog += coefs.beta_tod_evening;
    else if (simTod === "Night") baselineLog += coefs.beta_tod_night;

    // 2. Predict quantity: Q = exp(baseline_log + beta_1 * ln(Price)) - 1
    simDemand = Math.exp(baselineLog + coefs.beta_1 * Math.log(simPrice)) - 1.0;
    simDemand = Math.max(0, simDemand);
    
    // 3. Compute revenue and profit margins
    simRevenue = simPrice * simDemand;
    simProfit = (simPrice - simCost) * simDemand;

    // 4. Calculate Explainable AI (XAI) Marginal Unit Attributions
    // We compute what the demand would be if each feature was in its baseline/zero state,
    // and subtract it from the current simulation demand.
    
    // Price Attribution (compare to current price vs a standard high price reference)
    const demandWithoutPriceEffect = Math.max(0, Math.exp(baselineLog) - 1.0);
    const priceAttr = simDemand - demandWithoutPriceEffect;

    // Competitor Price Attribution (compared to competitor price = 1.0, close to log(0))
    const baselineNoComp = baselineLog - (coefs.beta_2 * Math.log(simCompPrice));
    const demandNoComp = Math.max(0, Math.exp(baselineNoComp + coefs.beta_1 * Math.log(simPrice)) - 1.0);
    const compAttr = simDemand - demandNoComp;

    // Promo Attribution
    const baselineNoPromo = baselineLog - (coefs.beta_3 * simPromo);
    const demandNoPromo = Math.max(0, Math.exp(baselineNoPromo + coefs.beta_1 * Math.log(simPrice)) - 1.0);
    const promoAttr = simDemand - demandNoPromo;

    // Temp Attribution (deviation from 25.0°C baseline reference)
    const baselineNoTemp = baselineLog - (coefs.beta_temp * simTemp);
    const demandNoTemp = Math.max(0, Math.exp(baselineNoTemp + coefs.beta_1 * Math.log(simPrice)) - 1.0);
    const tempAttr = simDemand - demandNoTemp;

    // Rain Attribution
    const baselineNoRain = baselineLog - (coefs.beta_rain * simRain);
    const demandNoRain = Math.max(0, Math.exp(baselineNoRain + coefs.beta_1 * Math.log(simPrice)) - 1.0);
    const rainAttr = simDemand - demandNoRain;

    // Weekend Attribution
    const baselineNoWeekend = baselineLog - (coefs.beta_weekend * simWeekend);
    const demandNoWeekend = Math.max(0, Math.exp(baselineNoWeekend + coefs.beta_1 * Math.log(simPrice)) - 1.0);
    const weekendAttr = simDemand - demandNoWeekend;

    // Festival Attribution
    const baselineNoFestival = baselineLog - (coefs.beta_festival * simFestival);
    const demandNoFestival = Math.max(0, Math.exp(baselineNoFestival + coefs.beta_1 * Math.log(simPrice)) - 1.0);
    const festivalAttr = simDemand - demandNoFestival;

    // Holiday Attribution
    const baselineNoHoliday = baselineLog - (coefs.beta_holiday * simHoliday);
    const demandNoHoliday = Math.max(0, Math.exp(baselineNoHoliday + coefs.beta_1 * Math.log(simPrice)) - 1.0);
    const holidayAttr = simDemand - demandNoHoliday;

    attributions = [
      { name: "My Price Impact", value: priceAttr, label: `${priceAttr > 0 ? '+' : ''}${priceAttr.toFixed(1)} units` },
      { name: "Competitor Pricing", value: compAttr, label: `${compAttr > 0 ? '+' : ''}${compAttr.toFixed(1)} units` },
      { name: "Promotion Lift", value: promoAttr, label: `${promoAttr > 0 ? '+' : ''}${promoAttr.toFixed(1)} units` },
      { name: "Temperature Effect", value: tempAttr, label: `${tempAttr > 0 ? '+' : ''}${tempAttr.toFixed(1)} units` },
      { name: "Weather (Rain) Impact", value: rainAttr, label: `${rainAttr > 0 ? '+' : ''}${rainAttr.toFixed(1)} units` },
      { name: "Weekend Surge", value: weekendAttr, label: `${weekendAttr > 0 ? '+' : ''}${weekendAttr.toFixed(1)} units` },
      { name: "Festival Surge", value: festivalAttr, label: `${festivalAttr > 0 ? '+' : ''}${festivalAttr.toFixed(1)} units` },
      { name: "Holiday Surge", value: holidayAttr, label: `${holidayAttr > 0 ? '+' : ''}${holidayAttr.toFixed(1)} units` }
    ];
  }

  // 5. Recalculate curve and optimal price points client-side based on available inventory
  const recalculatedCurve = pricingData ? pricingData.curve.map(pt => {
    const actualSales = Math.min(simInventory, pt.predicted_demand);
    const unsoldStock = Math.max(0, simInventory - pt.predicted_demand);
    const holdingPenalty = unsoldStock * (pricingData.unit_cost * 0.2); // 20% holding cost rate
    
    return {
      ...pt,
      predicted_revenue: pt.price * actualSales,
      predicted_profit: (pt.price - pricingData.unit_cost) * actualSales - holdingPenalty
    };
  }) : [];

  let activeOptimalPrice = pricingData?.metrics.optimal_price || 0;
  let activeOptimalProfit = pricingData?.metrics.optimal_predicted_profit || 0;
  let activeOptimalDemand = pricingData?.metrics.optimal_predicted_demand || 0;
  let activeOptimalRevenue = pricingData?.metrics.optimal_predicted_revenue || 0;

  if (recalculatedCurve.length > 0) {
    let maxProfit = -999999;
    recalculatedCurve.forEach(pt => {
      if (pt.predicted_profit > maxProfit) {
        maxProfit = pt.predicted_profit;
        activeOptimalPrice = pt.price;
        activeOptimalProfit = pt.predicted_profit;
        activeOptimalDemand = pt.predicted_demand;
        activeOptimalRevenue = pt.predicted_revenue;
      }
    });
  }

  const recalculatedCurrentActualSales = Math.min(simInventory, pricingData?.metrics.current_predicted_demand || 0);
  const recalculatedCurrentUnsoldStock = Math.max(0, simInventory - (pricingData?.metrics.current_predicted_demand || 0));
  const recalculatedCurrentHoldingPenalty = recalculatedCurrentUnsoldStock * (pricingData?.unit_cost * 0.2 || 0);
  const recalculatedCurrentProfit = ((pricingData?.metrics.current_price || 0) - (pricingData?.unit_cost || 0)) * recalculatedCurrentActualSales - recalculatedCurrentHoldingPenalty;
  
  const activeProfitUplift = activeOptimalProfit - recalculatedCurrentProfit;
  const activeProfitUpliftPct = recalculatedCurrentProfit > 0 ? (activeProfitUplift / recalculatedCurrentProfit * 100) : 0;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isOptimal = pricingData && data.price === pricingData.metrics.optimal_price;
      return (
        <div className="glass-panel-glow p-4 rounded-xl border border-indigo-500/30 text-sm">
          <p className="font-bold text-slate-100 mb-2">Price Point: ₹{data.price.toFixed(2)}</p>
          <div className="space-y-1">
            <p className="flex justify-between gap-6 text-slate-300">
              Expected Profit: <span className="font-mono text-emerald-400 font-semibold">₹{data.predicted_profit.toFixed(2)}</span>
            </p>
            <p className="flex justify-between gap-6 text-slate-300">
              Expected Revenue: <span className="font-mono text-indigo-400 font-semibold">₹{data.predicted_revenue.toFixed(2)}</span>
            </p>
            <p className="flex justify-between gap-6 text-slate-300">
              Expected Demand: <span className="font-mono text-cyan-400 font-semibold">{data.predicted_demand.toFixed(1)} units</span>
            </p>
          </div>
          {isOptimal && (
            <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded text-center border border-emerald-500/20">
              Profit Optimum Sweetspot
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Selector & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#F8FAFC] p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#0F172A] flex items-center gap-2">
            <Sliders className="text-[#4F46E5] w-6 h-6" />
            Causal Profit Optimization Cockpit
          </h2>
          <p className="text-[#475569] mt-1 text-sm font-medium">
            Fits a log-log demand curve to isolate elasticity coefficients and solves for the price point that maximizes <strong className="text-[#4F46E5] font-semibold">Total Net Profit</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="sku-selector" className="text-sm font-bold text-[#475569] whitespace-nowrap">
            Select SKU:
          </label>
          <div className="relative group">
            <select
              id="sku-selector"
              value={selectedSku}
              onChange={(e) => setSelectedSku(e.target.value)}
              className="relative w-48 bg-white border border-[#CBD5E1] text-[#0F172A] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#4F46E5] cursor-pointer font-semibold shadow-sm"
            >
              {skus.map(sku => (
                <option key={sku} value={sku} className="bg-white text-[#0F172A]">
                  {sku}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">Failed to sync pricing metrics</p>
            <p className="text-xs text-red-400 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {loading && selectedSku ? (
        <div className="flex flex-col items-center justify-center h-80 space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-violet-500"></div>
          <p className="text-slate-400 text-sm animate-pulse">Running log-log regression for {selectedSku}...</p>
        </div>
      ) : (
        pricingData && (
          <>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Optimal vs Current Price */}
              <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition duration-300">
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition duration-300"></div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Profit Optimum Price</span>
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold font-mono tracking-tight text-slate-100">
                    ₹{activeOptimalPrice.toFixed(2)}
                  </p>
                  <p className="text-slate-400 text-xs">
                    Current: <span className="font-mono">₹{pricingData.metrics.current_price.toFixed(2)}</span> | Cost: <span className="font-mono text-rose-400">₹{pricingData.unit_cost.toFixed(2)}</span>
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold">
                  {activeOptimalPrice > pricingData.metrics.current_price ? (
                    <span className="text-emerald-400">
                      +{((activeOptimalPrice - pricingData.metrics.current_price) / pricingData.metrics.current_price * 100).toFixed(1)}% price hike
                    </span>
                  ) : activeOptimalPrice < pricingData.metrics.current_price ? (
                    <span className="text-amber-400">
                      {((activeOptimalPrice - pricingData.metrics.current_price) / pricingData.metrics.current_price * 100).toFixed(1)}% discount
                    </span>
                  ) : (
                    <span className="text-slate-400">Price is optimal</span>
                  )}
                  <span className="text-slate-500 font-normal">recommended</span>
                </div>
              </div>

              {/* Profit Uplift */}
              <div className="glass-panel-glow p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl"></div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Net Profit Uplift</span>
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold font-mono tracking-tight text-emerald-400">
                    +₹{activeProfitUplift.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </p>
                  <p className="text-slate-400 text-xs">
                    Uplift percentage: <span className="font-mono text-emerald-300 font-medium">+{activeProfitUpliftPct.toFixed(2)}%</span>
                  </p>
                </div>
                <div className="mt-4 text-xs text-slate-400">
                  Target Profit: <span className="font-mono font-semibold text-slate-200">₹{activeOptimalProfit.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                </div>
              </div>

              {/* Constant Price Elasticity */}
              <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition duration-300">
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-violet-500/5 rounded-full blur-xl"></div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-violet-400">Causal Elasticity</span>
                  <div className="p-2 bg-violet-500/10 text-violet-400 rounded-lg border border-violet-500/20">
                    <Percent className="w-4 h-4" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold font-mono tracking-tight text-violet-400">
                    {pricingData.elasticity.toFixed(4)}
                  </p>
                  <p className="text-slate-400 text-xs">
                    R² Goodness of fit: <span className="font-mono font-medium text-violet-300">{(pricingData.r_squared * 100).toFixed(1)}%</span>
                  </p>
                </div>
                <div className="mt-4 text-xs text-slate-400">
                  {Math.abs(pricingData.elasticity) > 1.0 ? (
                    <span className="text-violet-300 font-bold uppercase">Price Elastic (1% price change alters demand &gt; 1%)</span>
                  ) : (
                    <span className="text-slate-500 font-bold uppercase">Price Inelastic</span>
                  )}
                </div>
              </div>

              {/* Target Volume */}
              <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition duration-300">
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl"></div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Optimum Demand</span>
                  <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold font-mono tracking-tight text-slate-100">
                    {activeOptimalDemand.toFixed(1)} units
                  </p>
                  <p className="text-slate-400 text-xs">
                    Current forecast: <span className="font-mono">{pricingData.metrics.current_predicted_demand.toFixed(1)} units</span>
                  </p>
                </div>
                <div className="mt-4 text-xs text-slate-400 flex items-center gap-1">
                  <span className={activeOptimalDemand > pricingData.metrics.current_predicted_demand ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                    {(activeOptimalDemand - pricingData.metrics.current_predicted_demand).toFixed(1)} units
                  </span>
                  <span>change in demand</span>
                </div>
              </div>
            </div>

            {/* Sweep Curve Chart & Details Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Curve Chart (2 cols) */}
              <div className="lg:col-span-2 glass-panel p-6 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                      <TrendingUp className="text-indigo-400 w-5 h-5" />
                      Profit & Revenue curves comparison
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                        <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                        Net Profit (₹)
                      </span>
                      <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
                        <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                        Gross Revenue (₹)
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                        <span className="w-3 h-3 rounded-full border border-dashed border-slate-500"></span>
                        Profit-Optimal Price Barrier
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm mb-6">
                    Observe how the revenue peak and net profit peak diverge due to unit margins. Our solver aims for the profit peak.
                  </p>
                </div>

                <div className="h-80 w-full font-mono text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={recalculatedCurve} 
                      margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.3)" />
                      <XAxis 
                        dataKey="price" 
                        stroke="#64748b" 
                        tickFormatter={(v) => `₹${v.toFixed(1)}`}
                        dy={10}
                      />
                      <YAxis 
                        stroke="#64748b" 
                        tickFormatter={(v) => `₹${v}`}
                        dx={-10}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      
                      {/* Highlight Optimal Price line based on Profit */}
                      <ReferenceLine 
                        x={activeOptimalPrice} 
                        stroke="rgba(16, 185, 129, 0.4)" 
                        strokeDasharray="4 4"
                      />

                      {/* Highlight Simulated Price line and dot intersection */}
                      <ReferenceLine 
                        x={simPrice} 
                        stroke="rgba(99, 102, 241, 0.5)" 
                        strokeDasharray="3 3"
                      />
                      <ReferenceDot 
                        x={simPrice} 
                        y={simProfit} 
                        r={7} 
                        fill="#10b981" 
                        stroke="#ffffff" 
                        strokeWidth={2.5}
                      />
                      <ReferenceDot 
                        x={simPrice} 
                        y={simRevenue} 
                        r={7} 
                        fill="#6366f1" 
                        stroke="#ffffff" 
                        strokeWidth={2.5}
                      />
                      
                      {/* Revenue Curve */}
                      <Line 
                        type="monotone" 
                        dataKey="predicted_revenue" 
                        stroke="#6366f1" 
                        strokeWidth={2} 
                        dot={false}
                      />
 
                      {/* Profit Curve */}
                      <Line 
                        type="monotone" 
                        dataKey="predicted_profit" 
                        stroke="#10b981" 
                        strokeWidth={3} 
                        dot={false}
                        activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: '#0f172a' }}
                      />
 
                      {/* Optimal Profit Dot Marker */}
                      <ReferenceDot 
                        x={activeOptimalPrice} 
                        y={activeOptimalProfit} 
                        r={6} 
                        fill="#10b981" 
                        stroke="#0f172a" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Regression Stats Panel (1 col) */}
              <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                      <FileText className="text-purple-400 w-5 h-5" />
                      Econometric OLS Fit
                    </h3>
                    <button 
                      onClick={() => setShowFormulaInfo(!showFormulaInfo)} 
                      className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                      title="Show Econometric Formula"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>

                  {showFormulaInfo && (
                    <div className="mb-4 p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed animate-fadeIn">
                      <p className="font-semibold text-indigo-400 mb-1">Log-Log Econometric Model:</p>
                      <div className="font-mono bg-slate-950 p-2 rounded text-[10px] text-slate-400 overflow-x-auto mb-2">
                        ln(Q+1) = β₀ + β₁ln(P) + β₂ln(P_comp) + β₃Promo + β_temp(T) + β_rain(R) + ...
                      </div>
                      <p>
                        Fits demand elasticities as relative percentage changes. Price Coefficient (β₁) is directly the causal price elasticity multiplier.
                      </p>
                    </div>
                  )}

                  <p className="text-slate-400 text-sm mb-4">
                    Ordinary Least Squares (OLS) parameters on log-transformed variables.
                  </p>

                  <div className="space-y-3.5">
                    {/* Baseline Constant */}
                    <div className="p-2.5 rounded-xl bg-white border border-[#C0C0C0]/60 flex justify-between items-center text-xs shadow-sm">
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="font-semibold text-slate-700">Baseline Constant (β₀)</p>
                          <div className="group relative">
                            <HelpCircle className="w-3 h-3 text-slate-400 cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-[#111827] text-white p-2.5 rounded-lg text-[10px] w-52 shadow-xl z-50 leading-relaxed font-sans font-normal">
                              Base logarithmic demand intercept when prices and promotion variables are hypothetically zero.
                            </div>
                          </div>
                        </div>
                        <p className="text-sm font-bold font-mono text-slate-700 mt-0.5">
                          {pricingData.coefs.beta_0.toFixed(3)}
                        </p>
                      </div>
                      <div className="text-right text-[10px] text-slate-500 flex flex-col items-end gap-0.5">
                        <div className="group relative">
                          <p className="cursor-help underline decoration-dotted decoration-slate-400">p-val: <span className="font-mono">{pricingData.stats.p_values.Intercept.toFixed(4)}</span></p>
                          <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block bg-[#111827] text-white p-2.5 rounded-lg text-[10px] w-48 shadow-xl z-50 leading-relaxed font-sans font-normal">
                            Significance probability. Values &lt; 0.05 are statistically significant.
                          </div>
                        </div>
                        <div className="group relative">
                          <p className="cursor-help underline decoration-dotted decoration-slate-400">t-stat: <span className="font-mono">{pricingData.stats.t_stats.Intercept.toFixed(2)}</span></p>
                          <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block bg-[#111827] text-white p-2.5 rounded-lg text-[10px] w-48 shadow-xl z-50 leading-relaxed font-sans font-normal">
                            Distance from zero in standard deviations.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Price Coefficient */}
                    <div className="p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-200 flex justify-between items-center text-xs shadow-sm">
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="font-semibold text-[#4F46E5]">Price Elasticity (β₁)</p>
                          <div className="group relative">
                            <HelpCircle className="w-3 h-3 text-[#4F46E5] cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-[#111827] text-white p-2.5 rounded-lg text-[10px] w-52 shadow-xl z-50 leading-relaxed font-sans font-normal">
                              Sensitivity coefficient. A 1% increase in price drops unit demand by β₁%.
                            </div>
                          </div>
                        </div>
                        <p className="text-sm font-bold font-mono text-[#4F46E5] mt-0.5">
                          {pricingData.coefs.beta_1.toFixed(3)}
                        </p>
                      </div>
                      <div className="text-right text-[10px] text-slate-500 flex flex-col items-end gap-0.5">
                        <div className="group relative">
                          <p className="cursor-help underline decoration-dotted decoration-slate-400">p-val: <span className={`font-mono ${pricingData.stats.p_values.Price < 0.05 ? 'text-emerald-600 font-semibold' : ''}`}>{pricingData.stats.p_values.Price.toFixed(4)}</span></p>
                          <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block bg-[#111827] text-white p-2.5 rounded-lg text-[10px] w-48 shadow-xl z-50 leading-relaxed font-sans font-normal">
                            Significance index. Here p &lt; 0.05, confirming price is a strong causal driver.
                          </div>
                        </div>
                        <div className="group relative">
                          <p className="cursor-help underline decoration-dotted decoration-slate-400">t-stat: <span className="font-mono font-semibold text-[#4F46E5]">{pricingData.stats.t_stats.Price.toFixed(2)}</span></p>
                          <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block bg-[#111827] text-white p-2.5 rounded-lg text-[10px] w-48 shadow-xl z-50 leading-relaxed font-sans font-normal">
                            A strong negative t-stat indicates highly robust evidence of elasticity.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Competitor Price Coefficient */}
                    <div className="p-2.5 rounded-xl bg-white border border-[#C0C0C0]/60 flex justify-between items-center text-xs shadow-sm">
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="font-semibold text-slate-700">Competitor Price (β₂)</p>
                          <div className="group relative">
                            <HelpCircle className="w-3 h-3 text-slate-400 cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-[#111827] text-white p-2.5 rounded-lg text-[10px] w-52 shadow-xl z-50 leading-relaxed font-sans font-normal">
                              Cross-price elasticity. Positive β₂ means competitor price hikes drive volume to you.
                            </div>
                          </div>
                        </div>
                        <p className="text-sm font-bold font-mono text-slate-700 mt-0.5">
                          {pricingData.coefs.beta_2.toFixed(3)}
                        </p>
                      </div>
                      <div className="text-right text-[10px] text-slate-500 flex flex-col items-end gap-0.5">
                        <div className="group relative">
                          <p className="cursor-help underline decoration-dotted decoration-slate-400">p-val: <span className="font-mono">{pricingData.stats.p_values.Competitor_Price.toFixed(4)}</span></p>
                          <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block bg-[#111827] text-white p-2.5 rounded-lg text-[10px] w-48 shadow-xl z-50 leading-relaxed font-sans font-normal">
                            Competitor price p-value significance score.
                          </div>
                        </div>
                        <div className="group relative">
                          <p className="cursor-help underline decoration-dotted decoration-slate-400">t-stat: <span className="font-mono">{pricingData.stats.t_stats.Competitor_Price.toFixed(2)}</span></p>
                          <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block bg-[#111827] text-white p-2.5 rounded-lg text-[10px] w-48 shadow-xl z-50 leading-relaxed font-sans font-normal">
                            Measures standard deviations of competitor price impact from null effect.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Promotion Active Coefficient */}
                    <div className="p-2.5 rounded-xl bg-white border border-[#C0C0C0]/60 flex justify-between items-center text-xs shadow-sm">
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="font-semibold text-slate-700">Promotion Lift (β₃)</p>
                          <div className="group relative">
                            <HelpCircle className="w-3 h-3 text-slate-400 cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-[#111827] text-white p-2.5 rounded-lg text-[10px] w-52 shadow-xl z-50 leading-relaxed font-sans font-normal">
                              Percentage demand increase when active promotion is running.
                            </div>
                          </div>
                        </div>
                        <p className="text-sm font-bold font-mono text-slate-700 mt-0.5">
                          {pricingData.coefs.beta_3.toFixed(3)}
                        </p>
                      </div>
                      <div className="text-right text-[10px] text-slate-500 flex flex-col items-end gap-0.5">
                        <div className="group relative">
                          <p className="cursor-help underline decoration-dotted decoration-slate-400">p-val: <span className="font-mono">{pricingData.stats.p_values.Promotion_Active.toFixed(4)}</span></p>
                          <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block bg-[#111827] text-white p-2.5 rounded-lg text-[10px] w-48 shadow-xl z-50 leading-relaxed font-sans font-normal">
                            Significance probability of campaign promos.
                          </div>
                        </div>
                        <div className="group relative">
                          <p className="cursor-help underline decoration-dotted decoration-slate-400">t-stat: <span className="font-mono">{pricingData.stats.t_stats.Promotion_Active.toFixed(2)}</span></p>
                          <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block bg-[#111827] text-white p-2.5 rounded-lg text-[10px] w-48 shadow-xl z-50 leading-relaxed font-sans font-normal">
                            Measures lift significance from a zero promo control base.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-[#C0C0C0] pt-3 flex items-center justify-between text-xs text-slate-500 font-semibold font-mono">
                  <div className="group relative cursor-help">
                    <span className="underline decoration-dotted decoration-slate-400">R-Squared: <b>{(pricingData.r_squared * 100).toFixed(1)}%</b></span>
                    <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block bg-[#111827] text-white p-2.5 rounded-lg text-[10px] w-64 shadow-xl z-50 leading-relaxed font-sans font-normal">
                      Coefficient of determination. {(pricingData.r_squared * 100).toFixed(1)}% of price demand variance is explained by OLS variables.
                    </div>
                  </div>
                  <span>Obs count: <b>N = 1800</b></span>
                </div>
              </div>
            </div>

            {/* WHAT-IF SIMULATOR INTERACTIVE PANEL & XAI BREAKDOWN PANEL */}
            <div className="space-y-6">
              
              {/* Sliders and Outcome Block */}
              <div className="glass-panel p-6 rounded-2xl relative overflow-hidden border border-indigo-500/10">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                      Interactive "What-If" Market Simulator
                    </h3>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Drag pricing, weather, calendar, and environmental sliders to predict real-time sales volume, revenue, and margins.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setShowXaiPanel(!showXaiPanel)}
                      className={`px-3 py-1.5 border text-xs font-semibold rounded-lg transition ${
                        showXaiPanel 
                          ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' 
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {showXaiPanel ? 'Hide Explainable AI (XAI)' : 'Show Explainable AI (XAI)'}
                    </button>
                    <button 
                      onClick={resetToBaselines}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition group"
                    >
                      <RotateCcw className="w-3.5 h-3.5 group-hover:rotate-[-45deg] transition" />
                      Reset baselines
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Sliders Console (8 cols) */}
                  <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    
                    {/* PRICE CONTROL */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-[#4F46E5] font-bold">My Unit Price</span>
                        <span className="text-slate-100 font-mono font-bold">₹{simPrice.toFixed(2)}</span>
                      </div>
                      <input 
                        type="range"
                        min={(pricingData.metrics.current_price * 0.4).toFixed(2)}
                        max={(pricingData.metrics.current_price * 1.6).toFixed(2)}
                        step="0.05"
                        value={simPrice}
                        onChange={(e) => setSimPrice(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-[#E2E8F0] rounded-lg cursor-pointer appearance-none outline-none"
                      />
                      <div className="flex justify-between text-[10px] text-[#64748B] font-semibold">
                        <span>Min: ₹{(pricingData.metrics.current_price * 0.4).toFixed(1)}</span>
                        <span>Base: ₹{(pricingData.metrics.current_price).toFixed(2)}</span>
                        <span>Max: ₹{(pricingData.metrics.current_price * 1.6).toFixed(1)}</span>
                      </div>
                    </div>

                    {/* COMPETITOR PRICE CONTROL */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-[#A855F7] font-bold">Competitor Price</span>
                        <span className="text-slate-100 font-mono font-bold">₹{simCompPrice.toFixed(2)}</span>
                      </div>
                      <input 
                        type="range"
                        min={(pricingData.baselines.mean_comp_price * 0.4).toFixed(2)}
                        max={(pricingData.baselines.mean_comp_price * 1.6).toFixed(2)}
                        step="0.05"
                        value={simCompPrice}
                        onChange={(e) => setSimCompPrice(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-[#E2E8F0] rounded-lg cursor-pointer appearance-none outline-none competitor-range"
                      />
                      <div className="flex justify-between text-[10px] text-[#64748B] font-semibold">
                        <span>Min: ₹{(pricingData.baselines.mean_comp_price * 0.4).toFixed(1)}</span>
                        <span>Mean: ₹{(pricingData.baselines.mean_comp_price).toFixed(2)}</span>
                        <span>Max: ₹{(pricingData.baselines.mean_comp_price * 1.6).toFixed(1)}</span>
                      </div>
                    </div>

                    {/* TEMPERATURE CONTROL */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-[#F59E0B] font-bold">Local Temperature</span>
                        <span className="text-slate-100 font-mono font-bold">{simTemp.toFixed(1)}°C</span>
                      </div>
                      <input 
                        type="range"
                        min="15.0"
                        max="45.0"
                        step="0.5"
                        value={simTemp}
                        onChange={(e) => setSimTemp(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-[#E2E8F0] rounded-lg cursor-pointer appearance-none outline-none temp-range"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Cool (15°C)</span>
                        <span>Mean: {pricingData.baselines.mean_temp.toFixed(1)}°C</span>
                        <span>Hot (45°C)</span>
                      </div>
                    </div>

                    {/* TIME OF DAY SELECTOR */}
                    <div className="space-y-2 flex flex-col justify-between">
                      <label className="text-xs font-bold text-[#0F172A]">Target Time Period (Daily Shift)</label>
                      <div className="grid grid-cols-4 gap-2 bg-[#0F172A] p-1 rounded-lg border border-slate-700">
                        {['Morning', 'Afternoon', 'Evening', 'Night'].map(period => (
                          <button
                            key={period}
                            onClick={() => setSimTod(period)}
                            className={`py-1 text-[10px] font-bold rounded transition ${
                              simTod === period 
                                ? 'bg-indigo-600/90 text-white shadow' 
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {period}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* AVAILABLE INVENTORY CONTROL */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-cyan-500 font-bold">Available Inventory (Stock)</span>
                        <span className="text-slate-100 font-mono font-bold">{simInventory} units</span>
                      </div>
                      <input 
                        type="range"
                        min="50"
                        max="1000"
                        step="10"
                        value={simInventory}
                        onChange={(e) => setSimInventory(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-[#E2E8F0] rounded-lg cursor-pointer appearance-none outline-none inventory-range"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Low (50)</span>
                        <span>Mid (500)</span>
                        <span>High (1000)</span>
                      </div>
                    </div>

                    {/* BINARY TOGGLES */}
                    <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-5 gap-4 pt-2">
                      {/* Promo */}
                      <div className="bg-[#0F172A] p-2.5 rounded-xl border border-slate-700 flex flex-col justify-between items-center text-center">
                        <span className="text-[10px] uppercase font-bold text-white">Promo Active</span>
                        <button 
                          onClick={() => setSimPromo(simPromo === 1 ? 0 : 1)}
                          className={`w-full py-1 text-[10px] font-bold rounded-lg border transition mt-2 ${
                            simPromo === 1 
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                              : 'bg-[#1E293B] border-slate-600 text-slate-400'
                          }`}
                        >
                          {simPromo === 1 ? 'ON' : 'OFF'}
                        </button>
                      </div>

                      {/* Rain */}
                      <div className="bg-[#0F172A] p-2.5 rounded-xl border border-slate-700 flex flex-col justify-between items-center text-center">
                        <span className="text-[10px] uppercase font-bold text-white">Raining</span>
                        <button 
                          onClick={() => setSimRain(simRain === 1 ? 0 : 1)}
                          className={`w-full py-1 text-[10px] font-bold rounded-lg border transition mt-2 ${
                            simRain === 1 
                              ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                              : 'bg-[#1E293B] border-slate-600 text-slate-400'
                          }`}
                        >
                          {simRain === 1 ? 'YES' : 'NO'}
                        </button>
                      </div>

                      {/* Weekend */}
                      <div className="bg-[#0F172A] p-2.5 rounded-xl border border-slate-700 flex flex-col justify-between items-center text-center">
                        <span className="text-[10px] uppercase font-bold text-white">Weekend</span>
                        <button 
                          onClick={() => setSimWeekend(simWeekend === 1 ? 0 : 1)}
                          className={`w-full py-1 text-[10px] font-bold rounded-lg border transition mt-2 ${
                            simWeekend === 1 
                              ? 'bg-violet-500/10 border-violet-500/30 text-violet-400' 
                              : 'bg-[#1E293B] border-slate-600 text-slate-400'
                          }`}
                        >
                          {simWeekend === 1 ? 'YES' : 'NO'}
                        </button>
                      </div>

                      {/* Festival */}
                      <div className="bg-[#0F172A] p-2.5 rounded-xl border border-slate-700 flex flex-col justify-between items-center text-center">
                        <span className="text-[10px] uppercase font-bold text-white">Festival</span>
                        <button 
                          onClick={() => setSimFestival(simFestival === 1 ? 0 : 1)}
                          className={`w-full py-1 text-[10px] font-bold rounded-lg border transition mt-2 ${
                            simFestival === 1 
                              ? 'bg-pink-500/10 border-pink-500/30 text-pink-400' 
                              : 'bg-[#1E293B] border-slate-600 text-slate-400'
                          }`}
                        >
                          {simFestival === 1 ? 'YES' : 'NO'}
                        </button>
                      </div>

                      {/* Holiday */}
                      <div className="bg-[#0F172A] p-2.5 rounded-xl border border-slate-700 flex flex-col justify-between items-center text-center">
                        <span className="text-[10px] uppercase font-bold text-white">Holiday</span>
                        <button 
                          onClick={() => setSimHoliday(simHoliday === 1 ? 0 : 1)}
                          className={`w-full py-1 text-[10px] font-bold rounded-lg border transition mt-2 ${
                            simHoliday === 1 
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                              : 'bg-[#1E293B] border-slate-600 text-slate-400'
                          }`}
                        >
                          {simHoliday === 1 ? 'YES' : 'NO'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Outcomes Display (4 cols) */}
                  <div className="lg:col-span-4 bg-slate-950 rounded-xl border border-slate-800 p-6 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                    
                    <h4 className="text-xs uppercase font-extrabold tracking-widest text-slate-400 border-b border-slate-900 pb-3 mb-4 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-indigo-400" />
                      Simulated Output
                    </h4>

                    <div className="space-y-4 flex-grow">
                      {/* Available Stock */}
                      <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                        <span className="text-xs text-slate-400 font-semibold">Stock Inventory:</span>
                        <span className="text-sm font-bold font-mono text-[#0F172A]">{simInventory} units</span>
                      </div>

                      {/* Simulated Demand */}
                      <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                        <span className="text-xs text-slate-400 font-semibold">Predicted Demand:</span>
                        <span className="text-sm font-bold font-mono text-[#0F172A]">{simDemand.toFixed(1)} units</span>
                      </div>

                      {/* Actual Sales */}
                      <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                        <span className="text-xs text-slate-400 font-semibold">Actual Units Sold:</span>
                        <span className="text-sm font-bold font-mono text-[#0F172A]">{Math.min(simInventory, Math.round(simDemand))} units</span>
                      </div>

                      {/* Simulated Revenue */}
                      <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                        <span className="text-xs text-slate-400 font-semibold">Gross Revenue:</span>
                        <span className="text-sm font-bold font-mono text-[#0F172A]">₹{simRevenue.toFixed(2)}</span>
                      </div>

                      {/* Simulated Net Profit */}
                      <div className="flex items-center justify-between border-b border-slate-900 pb-2 bg-emerald-500/5 px-2 py-1 rounded">
                        <span className="text-xs text-emerald-400 font-bold">Expected Net Profit:</span>
                        <span className="text-sm font-bold font-mono text-emerald-400">₹{simProfit.toFixed(2)}</span>
                      </div>

                      {/* Inventory Awareness Status alert */}
                      <div className="pt-2">
                        {simDemand > simInventory ? (
                          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10.5px] text-amber-300 space-y-1">
                            <p className="font-bold flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                              Stockout Shortage Warning
                            </p>
                            <p className="leading-snug text-[#334155]">
                              Demand ({simDemand.toFixed(0)} units) exceeds stock ({simInventory}). Consider raising the price to harvest higher margins.
                            </p>
                          </div>
                        ) : simInventory > simDemand ? (
                          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[10.5px] text-rose-300 space-y-1">
                            <p className="font-bold flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                              Overstock Penalty Applied
                            </p>
                            <p className="leading-snug text-[#334155]">
                              Holding penalty of <b>₹{((simInventory - simDemand) * simCost * 0.2).toFixed(2)}</b> applied for {Math.round(simInventory - simDemand)} unsold units. Recommend discounting price or activating promo.
                            </p>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10.5px] text-emerald-300 space-y-1">
                            <p className="font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              Stock Optimally Matched
                            </p>
                            <p className="leading-snug text-[#334155]">
                              Available stock matches predicted sales volume perfectly.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="pt-2">
                        <p className="text-[10px] text-[#334155] leading-relaxed text-center font-medium">
                          Elasticity: <span className="text-[#4F46E5] font-bold font-mono">{pricingData.elasticity}</span> | Cost: <span className="font-mono text-[#E11D48]">₹{simCost.toFixed(2)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center gap-2 text-[10px] text-[#3730A3] font-medium">
                      <InfoIcon className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                      Calculates inventory holding costs in real-time.
                    </div>
                  </div>
                </div>
              </div>

              {/* EXPLAINABLE AI (XAI) PANEL */}
              {showXaiPanel && (
                <div className="glass-panel p-6 rounded-2xl border border-purple-500/10 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        Explainable AI (XAI) Causal Breakdown
                      </h3>
                      <p className="text-[#475569] text-xs mt-0.5">
                        Decomposes the simulated prediction, showing the positive or negative <b>marginal unit contributions</b> of each variable.
                      </p>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded border border-purple-500/20">
                      SHAP-Style Attribution
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Attribution List */}
                    <div className="space-y-4">
                      {attributions.map((attr, idx) => {
                        const isPositive = attr.value >= 0;
                        // Calculate percentage of demand to scale the visual bars
                        const absVal = Math.abs(attr.value);
                        const maxAttr = Math.max(...attributions.map(a => Math.abs(a.value)), 1.0);
                        const widthPct = Math.min(100, (absVal / maxAttr) * 100);

                        return (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-[#0F172A]">{attr.name}</span>
                              <span className={`font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {attr.label}
                              </span>
                            </div>
                            
                            <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden border border-[#CBD5E1] relative">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isPositive 
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500' 
                                    : 'bg-gradient-to-r from-amber-600 to-rose-500'
                                }`}
                                style={{ width: `${widthPct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Educational & LLM strategy panel */}
                    <div className="bg-[#0F172A] p-6 rounded-xl border border-slate-700 flex flex-col justify-between space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                            Urban AI Pricing Assistant
                          </h4>
                          <button
                            onClick={fetchAiExplanation}
                            disabled={aiLoading}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white rounded-lg text-[10.5px] font-bold tracking-wide transition flex items-center gap-1 shadow-md shadow-purple-600/15"
                          >
                            {aiLoading ? (
                              <>
                                <div className="w-2.5 h-2.5 border-t-2 border-r-2 border-white rounded-full animate-spin" />
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3" />
                                Get Strategy
                              </>
                            )}
                          </button>
                        </div>

                        <div className="bg-[#111827]/40 p-3 rounded-lg border border-[#C0C0C0]/25">
                          <p className="text-[10px] uppercase font-bold text-amber-400 tracking-wider mb-2">Suggested Scenarios:</p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => runPresetScenario('comp_drop')}
                              className="px-2.5 py-1 bg-[#F0F0F0] hover:bg-[#E5E5E5] border border-[#C0C0C0] text-[10.5px] text-[#111827] rounded-full font-semibold transition hover:scale-[1.02] active:scale-[0.98]"
                            >
                              📉 Competitor drops price by 10%
                            </button>
                            <button
                              onClick={() => runPresetScenario('max_vol')}
                              className="px-2.5 py-1 bg-[#F0F0F0] hover:bg-[#E5E5E5] border border-[#C0C0C0] text-[10.5px] text-[#111827] rounded-full font-semibold transition hover:scale-[1.02] active:scale-[0.98]"
                            >
                              🚀 Optimize for max volume focus
                            </button>
                            <button
                              onClick={() => runPresetScenario('rainy_weekend')}
                              className="px-2.5 py-1 bg-[#F0F0F0] hover:bg-[#E5E5E5] border border-[#C0C0C0] text-[10.5px] text-[#111827] rounded-full font-semibold transition hover:scale-[1.02] active:scale-[0.98]"
                            >
                              🌧️ Simulate rainy weekend evening
                            </button>
                          </div>
                        </div>

                        {aiExplanation ? (
                          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-white whitespace-pre-line leading-relaxed shadow-inner">
                            {aiExplanation}
                          </div>
                        ) : (
                          <p className="text-xs text-white">
                            Click <b>Get Strategy</b> to run an AI analysis on your current What-If simulation parameters.
                          </p>
                        )}
                      </div>

                      <div className="border-t border-slate-600 pt-4 space-y-3 text-xs leading-relaxed text-white">
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-slate-300" />
                          How to Read this Attribution
                        </h4>
                        <p className="text-[11px] text-white">
                          Each bar represents the <b>Marginal Unit Contribution</b> of that specific parameter compared to its baseline or reference state.
                        </p>
                        <ul className="list-disc pl-4 space-y-1 text-[11px] text-white">
                          <li>
                            <span className="text-emerald-400 font-semibold">Positive values</span> drive demand higher than baseline.
                          </li>
                          <li>
                            <span className="text-amber-400 font-semibold">Negative values</span> drag volume lower.
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </>
        )
      )}
    </div>
  );
}
