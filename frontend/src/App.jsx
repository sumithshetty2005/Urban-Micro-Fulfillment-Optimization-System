import React, { useState, useEffect, useRef } from 'react';
import PricingEngine from './components/PricingEngine';
import RoutingModule from './components/RoutingModule';
import { 
  TrendingUp, 
  Map, 
  Database, 
  Cpu, 
  Activity, 
  Boxes,
  Truck,
  HelpCircle,
  Menu,
  ChevronLeft
} from 'lucide-react';

// Ambient connection network canvas (WebGL/Canvas Effect)
function NetworkCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Node configuration
    const nodeCount = Math.min(60, Math.floor((width * height) / 25000));
    const nodes = [];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 1.5 + 1,
      });
    }

    let mouse = { x: -1000, y: -1000 };
    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw connection lines
      ctx.strokeStyle = 'rgba(192, 192, 192, 0.2)';
      ctx.lineWidth = 0.8;

      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
          }
        }

        // Connect nodes to cursor
        if (mouse.x > -1000) {
          const dx = n1.x - mouse.x;
          const dy = n1.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            ctx.strokeStyle = `rgba(17, 24, 37, ${0.15 * (1 - dist / 180)})`;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(192, 192, 192, 0.2)';
          }
        }

        // Draw individual nodes
        ctx.fillStyle = 'rgba(17, 24, 37, 0.12)';
        ctx.beginPath();
        ctx.arc(n1.x, n1.y, n1.radius, 0, Math.PI * 2);
        ctx.fill();

        // Drift positions
        n1.x += n1.vx;
        n1.y += n1.vy;

        // Boundary bounce
        if (n1.x < 0 || n1.x > width) n1.vx *= -1;
        if (n1.y < 0 || n1.y > height) n1.vy *= -1;
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full pointer-events-none z-0 bg-white"
    />
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('pricing'); // 'pricing' or 'routing'
  const [backendStatus, setBackendStatus] = useState('connecting'); // 'connected', 'error', 'connecting'
  const [globalCounts, setGlobalCounts] = useState({ skus: 0, orders: 0, drivers: 0 });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Monitor API health and retrieve header stats
  useEffect(() => {
    // 1. Fetch SKUs list
    const skuPromise = fetch('/api/skus')
      .then(res => res.json())
      .then(data => data.skus?.length || 0)
      .catch(() => 0);

    // 2. Fetch Routing list
    const routingPromise = fetch('/api/routing')
      .then(res => res.json())
      .then(data => ({
        orders: data.metrics?.num_orders || 0,
        drivers: data.metrics?.num_drivers || 0
      }))
      .catch(() => ({ orders: 0, drivers: 0 }));

    Promise.all([skuPromise, routingPromise])
      .then(([skuCount, routeMetrics]) => {
        setGlobalCounts({
          skus: skuCount,
          orders: routeMetrics.orders,
          drivers: routeMetrics.drivers
        });
        
        if (skuCount > 0 || routeMetrics.orders > 0) {
          setBackendStatus('connected');
        } else {
          setBackendStatus('error');
        }
      })
      .catch(() => {
        setBackendStatus('error');
      });
  }, []);

  return (
    <div className="flex h-screen bg-white text-[#111827] overflow-hidden font-sans selection:bg-[#F0F0F0] relative">
      
      {/* Background Ambient Canvas */}
      <NetworkCanvas />

      {/* Sidebar Navigation */}
      <aside className={`transition-all duration-300 ${isSidebarCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-72'} bg-[#F0F0F0]/90 border-r border-[#C0C0C0] flex flex-col justify-between backdrop-blur-md z-20`}>
        
        {/* Brand Header */}
        <div>
          <div className="p-6 border-b border-[#C0C0C0] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="bg-[#111827] p-2 rounded-[8px] text-white">
                  <Cpu className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h1 className="font-extrabold text-sm tracking-widest text-[#111827] uppercase">
                  URBAN MFC
                </h1>
                <p className="text-[9px] text-[#4B5563] font-mono font-bold tracking-widest uppercase">
                  Optimizer Node
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsSidebarCollapsed(true)} 
              className="p-1.5 bg-[#F0F0F0] border border-[#C0C0C0] rounded-[8px] hover:bg-[#E5E5E5] transition text-[#111827] flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
              title="Collapse Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-2">
            <p className="px-3 text-[10px] font-mono font-bold text-[#4B5563] uppercase tracking-wider mb-2">
              Optimization Modules
            </p>
            
            {/* Pricing Engine */}
            <button
              onClick={() => setActiveTab('pricing')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-[8px] text-xs font-bold uppercase tracking-wider transition ${
                activeTab === 'pricing'
                  ? 'bg-[#111827] text-white'
                  : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#E5E5E5]'
              }`}
            >
              <div className="flex items-center gap-3">
                <TrendingUp className={`w-4 h-4 transition ${activeTab === 'pricing' ? 'text-white' : 'text-[#4B5563]'}`} />
                <span>Pricing Elasticity</span>
              </div>
              {globalCounts.skus > 0 && (
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'pricing' ? 'bg-white/20 text-white' : 'bg-white text-[#111827] border border-[#C0C0C0]'
                }`}>
                  {globalCounts.skus}
                </span>
              )}
            </button>

            {/* Routing Module */}
            <button
              onClick={() => setActiveTab('routing')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-[8px] text-xs font-bold uppercase tracking-wider transition ${
                activeTab === 'routing'
                  ? 'bg-[#111827] text-white'
                  : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#E5E5E5]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Map className={`w-4 h-4 transition ${activeTab === 'routing' ? 'text-white' : 'text-[#4B5563]'}`} />
                <span>Logistics & Routing</span>
              </div>
              {globalCounts.orders > 0 && (
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'routing' ? 'bg-white/20 text-white' : 'bg-white text-[#111827] border border-[#C0C0C0]'
                }`}>
                  {globalCounts.orders}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Lower Metadata Info */}
        <div className="p-4 border-t border-[#C0C0C0] space-y-4">
          
          {/* Health Status Indicator */}
          <div className="p-3 bg-white rounded-[8px] border border-[#C0C0C0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-[#4B5563]" />
              <span className="text-[10px] font-mono font-bold uppercase text-[#4B5563]">Database Server</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                backendStatus === 'connected' 
                  ? 'bg-emerald-500 animate-pulse' 
                  : backendStatus === 'connecting'
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`} />
              <span className="text-[9px] font-mono uppercase font-bold text-[#111827]">
                {backendStatus === 'connected' ? 'ONLINE' : backendStatus === 'connecting' ? 'SYNCING' : 'OFFLINE'}
              </span>
            </div>
          </div>

          <div className="flex justify-between text-[9px] text-[#4B5563] font-mono font-bold uppercase px-2">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-[#111827]" />
              Urban Preview
            </span>
            <span>v2.0</span>
          </div>

        </div>
      </aside>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        
        {/* Global Dashboard Header */}
        <header className="h-20 bg-white/80 border-b border-[#C0C0C0] flex items-center justify-between px-8 z-10 backdrop-blur-md">
          <div className="flex items-center gap-4">
            {isSidebarCollapsed && (
              <button 
                onClick={() => setIsSidebarCollapsed(false)} 
                className="p-2 bg-[#F0F0F0] border border-[#C0C0C0] rounded-[8px] hover:bg-[#E5E5E5] transition text-[#111827] flex items-center justify-center cursor-pointer shadow-sm active:scale-95 animate-pulse"
                title="Expand Sidebar"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-[#4B5563]">
                <span>Optimisation Console</span>
                <span>/</span>
                <span className="text-[#111827]">{activeTab === 'pricing' ? ' econometric OLS model' : 'CVRP solver'}</span>
              </div>
              <h2 className="text-md font-bold text-[#111827] mt-0.5 uppercase tracking-wide">
                {activeTab === 'pricing' ? 'Revenue Optimizer Panel' : 'Route Allocation Panel'}
              </h2>
            </div>
          </div>

          {/* Quick Metrics Badge Counters */}
          <div className="flex items-center gap-4">
            {globalCounts.skus > 0 && (
              <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 bg-[#F0F0F0] border border-[#C0C0C0] rounded-[8px]">
                <Boxes className="w-3.5 h-3.5 text-[#111827]" />
                <span className="text-[10px] font-mono text-[#111827] font-bold uppercase">
                  {globalCounts.skus} active SKUs
                </span>
              </div>
            )}
            
            {globalCounts.drivers > 0 && (
              <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 bg-[#F0F0F0] border border-[#C0C0C0] rounded-[8px]">
                <Truck className="w-3.5 h-3.5 text-[#111827]" />
                <span className="text-[10px] font-mono text-[#111827] font-bold uppercase">
                  {globalCounts.drivers} drivers active
                </span>
              </div>
            )}

            <div className="w-8 h-8 rounded-[8px] bg-[#F0F0F0] border border-[#C0C0C0] flex items-center justify-center text-[#111827]">
              <HelpCircle className="w-4 h-4 cursor-pointer hover:scale-105 transition" />
            </div>
          </div>
        </header>

        {/* Scrollable Viewport Frame */}
        <div className="flex-1 overflow-y-auto p-8 relative bg-transparent">
          {/* Subtle Grid Dots Layer */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#E5E5E5_1px,transparent_1px),linear-gradient(to_bottom,#E5E5E5_1px,transparent_1px)] bg-[size:40px_40px] opacity-[0.2] pointer-events-none" />

          {/* Glowing Multi-colored Neon Gradient Blobs */}
          <div className="absolute top-1/4 left-1/3 w-[30rem] h-[30rem] bg-purple-300/20 rounded-full blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-1/4 right-1/3 w-[30rem] h-[30rem] bg-teal-200/20 rounded-full blur-[120px] pointer-events-none translate-x-1/2 translate-y-1/2 animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />

          {/* Render Active Module */}
          <div className="relative z-10 max-w-7xl mx-auto h-full">
            {activeTab === 'pricing' ? (
              <PricingEngine />
            ) : (
              <RoutingModule 
                onDriversChange={(count) => setGlobalCounts(prev => ({ ...prev, drivers: count }))}
                onOrdersChange={(count) => setGlobalCounts(prev => ({ ...prev, orders: count }))}
              />
            )}
          </div>
        </div>

      </main>

    </div>
  );
}
