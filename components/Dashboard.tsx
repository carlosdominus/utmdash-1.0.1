
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Filter as FilterIcon, Search, X, ChevronDown, DollarSign, TrendingUp, 
  Receipt, Wallet, Target, CheckCircle2, Calendar, LayoutGrid, 
  BarChart3, List, Layers, Info
} from 'lucide-react';
import { DashboardData } from '../types';

interface DashboardProps {
  data: DashboardData;
}

const colorMap: Record<string, { bg: string, text: string, lightBg: string }> = {
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600', lightBg: 'bg-emerald-50' },
  rose: { bg: 'bg-rose-600', text: 'text-rose-600', lightBg: 'bg-rose-50' },
  amber: { bg: 'bg-amber-600', text: 'text-amber-600', lightBg: 'bg-amber-50' },
  indigo: { bg: 'bg-indigo-600', text: 'text-indigo-600', lightBg: 'bg-indigo-50' },
};

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e'];

type ViewMode = 'central' | 'utmdash' | 'graphs' | 'database';
type DatePreset = 'all' | 'today' | '7days' | '15days' | '30days' | 'custom';

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('central');
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [manualInvestment, setManualInvestment] = useState<number>(0);
  const [groupInvestments, setGroupInvestments] = useState<Record<string, number>>({});
  const [activeHeaderFilter, setActiveHeaderFilter] = useState<string | null>(null);
  const [activeProductPopup, setActiveProductPopup] = useState<string | null>(null);
  
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const rowsWithIndex = useMemo(() => {
    return data.rows.map((row, index) => ({ ...row, _id: index }));
  }, [data.rows]);

  const findHeader = (keys: string[], indexHint?: number) => {
    if (indexHint !== undefined && data.headers[indexHint]) return data.headers[indexHint];
    return data.headers.find(h => keys.some(k => h.toLowerCase() === k.toLowerCase() || h.toLowerCase().includes(k.toLowerCase())));
  };

  const colData = findHeader(['data venda', 'data'], 1); // Coluna B
  const colProduto = findHeader(['produto'], 8); // Coluna I
  const colFaturamento = findHeader(['valor da venda', 'valor'], 12); // Coluna M
  const colSource = findHeader(['utm_source', 'source'], 29); // Coluna AD
  const colCampaign = findHeader(['utm_campaign', 'campanha'], 31); // Coluna AF
  const colContent = findHeader(['utm_content', 'conteúdo'], 33); // Coluna AH

  const categoricalFilterCols = [colProduto, colSource, colCampaign, colContent].filter(Boolean) as string[];

  const cleanUTMSource = (val: string) => {
    if (!val) return 'organic';
    const s = String(val).toLowerCase();
    if (s.includes('tiktok')) return 'tiktok';
    if (s.includes('facebook') || s.includes('fb')) return 'facebook';
    if (s.includes('instagram') || s.includes('ig')) return 'instagram';
    if (s.includes('google')) return 'google';
    if (s.includes('kwai')) return 'kwai';
    return val;
  };

  const cleanUTMCampaign = (val: string) => {
    if (!val) return 'n/a';
    return String(val).split('|')[0].trim();
  };

  const parseBrazilianDate = (dateStr: any) => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const parts = dateStr.split(' ')[0].split('/');
    if (parts.length === 3) {
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
    const isoDate = new Date(dateStr);
    return isNaN(isoDate.getTime()) ? null : isoDate;
  };

  const uniqueValuesMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    categoricalFilterCols.forEach(col => {
      const vals = Array.from(new Set<string>(data.rows.map(r => {
        const rawVal = String(r[col] ?? 'N/A');
        if (col === colSource) return cleanUTMSource(rawVal);
        if (col === colCampaign) return cleanUTMCampaign(rawVal);
        return rawVal;
      }).filter(v => v !== '')));
      map[col] = vals.sort();
    });
    return map;
  }, [data.rows, categoricalFilterCols, colSource, colCampaign]);

  const toggleFilter = (column: string, value: string) => {
    setFilters(prev => {
      const current = prev[column] || [];
      const updated = current.includes(value) 
        ? current.filter(v => v !== value) 
        : [...current, value];
      return { ...prev, [column]: updated.length > 0 ? updated : [] };
    });
  };

  const clearAllFilters = () => {
    setFilters({});
    setSearchTerm('');
    setDatePreset('all');
    setActiveHeaderFilter(null);
  };

  const filteredRows = useMemo(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    return rowsWithIndex.filter(row => {
      if (colData && datePreset !== 'all') {
        const rowDate = parseBrazilianDate(row[colData]);
        if (!rowDate) return false;
        if (datePreset === 'today') {
          const today = new Date();
          if (rowDate.toDateString() !== today.toDateString()) return false;
        } else if (datePreset === '7days') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          if (rowDate < sevenDaysAgo) return false;
        } else if (datePreset === '15days') {
          const fifteenDaysAgo = new Date();
          fifteenDaysAgo.setDate(now.getDate() - 15);
          if (rowDate < fifteenDaysAgo) return false;
        } else if (datePreset === '30days') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(now.getDate() - 30);
          if (rowDate < thirtyDaysAgo) return false;
        } else if (datePreset === 'custom' && customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          if (rowDate < start || rowDate > end) return false;
        }
      }
      const matchesFilters = Object.entries(filters).every(([col, vals]) => {
        const selectedValues = vals as string[];
        if (!selectedValues || selectedValues.length === 0) return true;
        let rowVal = String(row[col] ?? 'N/A');
        if (col === colSource) rowVal = cleanUTMSource(rowVal);
        if (col === colCampaign) rowVal = cleanUTMCampaign(rowVal);
        return selectedValues.includes(rowVal);
      });
      const matchesSearch = searchTerm === '' || data.headers.some(h => 
        String(row[h]).toLowerCase().includes(searchTerm.toLowerCase())
      );
      return matchesFilters && matchesSearch;
    });
  }, [rowsWithIndex, filters, searchTerm, datePreset, customStartDate, customEndDate, colData, colSource, colCampaign]);

  // AGRUPAMENTO POR SOURCE + CAMPAIGN APENAS
  const groupedPerformance = useMemo(() => {
    const groups: Record<string, any> = {};
    filteredRows.forEach(row => {
      const s = cleanUTMSource(String(row[colSource || ''] || ''));
      const c = cleanUTMCampaign(String(row[colCampaign || ''] || ''));
      const key = `${s}|${c}`;
      
      const prodName = String(row[colProduto || ''] || 'N/A');
      const content = String(row[colContent || ''] || 'N/A');
      const rowDateStr = String(row[colData || '']).split(' ')[0];
      const rVal = Number(row[colFaturamento || '']) || 0;

      if (!groups[key]) {
        groups[key] = {
          source: s,
          campanha: c,
          vendas: 0,
          faturamento: 0,
          minDate: rowDateStr,
          maxDate: rowDateStr,
          productsMap: {} as Record<string, number>,
          contents: new Set<string>(),
          key
        };
      }
      groups[key].vendas += 1;
      groups[key].faturamento += rVal;
      
      // Track products in this campaign
      groups[key].productsMap[prodName] = (groups[key].productsMap[prodName] || 0) + 1;
      
      // Track contents
      groups[key].contents.add(content);

      // Handle Dates
      const dCurr = parseBrazilianDate(rowDateStr);
      const dMin = parseBrazilianDate(groups[key].minDate);
      const dMax = parseBrazilianDate(groups[key].maxDate);
      if (dCurr && dMin && dCurr < dMin) groups[key].minDate = rowDateStr;
      if (dCurr && dMax && dCurr > dMax) groups[key].maxDate = rowDateStr;
    });

    return Object.values(groups).sort((a: any, b: any) => b.vendas - a.vendas);
  }, [filteredRows, colSource, colCampaign, colProduto, colContent, colData, colFaturamento]);

  const periodStats = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const d7 = new Date();
    d7.setDate(today.getDate() - 7);
    const d30 = new Date();
    d30.setDate(today.getDate() - 30);
    let countToday = 0, count7 = 0, count30 = 0;
    rowsWithIndex.forEach(row => {
      const rDate = parseBrazilianDate(row[colData || '']);
      if (!rDate) return;
      if (rDate.toDateString() === today.toDateString()) countToday++;
      if (rDate >= d7) count7++;
      if (rDate >= d30) count30++;
    });
    return { today: countToday, d7: count7, d30: count30 };
  }, [rowsWithIndex, colData]);

  const evolutionData = useMemo(() => {
    const daily: Record<string, number> = {};
    filteredRows.forEach(row => {
      const dateStr = String(row[colData || '']).split(' ')[0];
      daily[dateStr] = (daily[dateStr] || 0) + 1;
    });
    return Object.entries(daily)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => {
        const d1 = parseBrazilianDate(a.date) || new Date(0);
        const d2 = parseBrazilianDate(b.date) || new Date(0);
        return d1.getTime() - d2.getTime();
      });
  }, [filteredRows, colData]);

  const getTop5 = (colName: string | undefined) => {
    if (!colName) return [];
    const counts: Record<string, number> = {};
    filteredRows.forEach(row => {
      let val = String(row[colName] || 'N/A').trim();
      if (colName === colSource) val = cleanUTMSource(val);
      if (colName === colCampaign) val = cleanUTMCampaign(val);
      counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  };

  const top5Campaigns = useMemo(() => getTop5(colCampaign), [filteredRows, colCampaign]);
  const top5Source = useMemo(() => getTop5(colSource), [filteredRows, colSource]);
  const top5Products = useMemo(() => getTop5(colProduto), [filteredRows, colProduto]);

  const stats = useMemo(() => {
    let fat = 0;
    filteredRows.forEach(row => { fat += Number(row[colFaturamento || '']) || 0; });
    const imp = fat * 0.06;
    const gas = manualInvestment;
    const luc = fat - gas - imp;
    const avgRoas = gas > 0 ? fat / gas : 0;
    return { fat, gas, imp, luc, roas: avgRoas };
  }, [filteredRows, colFaturamento, manualInvestment]);

  const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6 pb-20 w-full">
      <style>{`
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* Menu Superior */}
      <div className="bg-slate-100/80 p-1.5 rounded-2xl w-full flex flex-wrap lg:flex-nowrap gap-2 sticky top-20 z-40 backdrop-blur-md shadow-sm border border-slate-200">
        <TabButton active={viewMode === 'central'} onClick={() => setViewMode('central')} label="Análise Central" icon={<LayoutGrid className="w-4 h-4 mr-2" />} />
        <TabButton active={viewMode === 'utmdash'} onClick={() => setViewMode('utmdash')} label="UTM DASH" icon={<Layers className="w-4 h-4 mr-2" />} />
        <TabButton active={viewMode === 'graphs'} onClick={() => setViewMode('graphs')} label="Análise Gráfica" icon={<BarChart3 className="w-4 h-4 mr-2" />} />
        <TabButton active={viewMode === 'database'} onClick={() => setViewMode('database')} label="Base de Dados" icon={<List className="w-4 h-4 mr-2" />} />
      </div>

      {/* View: UTM DASH (AGRUPADA) */}
      {viewMode === 'utmdash' && (
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl overflow-visible animate-in fade-in zoom-in duration-300 w-full">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col">
              <h4 className="font-black text-slate-800 tracking-tighter uppercase text-base flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                UTM PERFORMANCE AGRUPADO ({groupedPerformance.length} CLUSTERS)
              </h4>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">AGRUPADO POR SOURCE + CAMPAIGN</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> <span className="text-[10px] font-black text-slate-500 uppercase">LUCRO POSITIVO</span></div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-rose-500" /> <span className="text-[10px] font-black text-slate-500 uppercase">PREJUÍZO</span></div>
              </div>
              <button onClick={clearAllFilters} className="text-rose-500 text-[10px] font-black uppercase flex items-center gap-1 hover:opacity-70">
                <X className="w-3 h-3" /> Resetar
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[750px] scrollbar-thin">
            <table className="w-full text-left text-[11px] border-collapse relative">
              <thead className="sticky top-0 z-30 bg-slate-50 shadow-sm">
                <tr className="border-b border-slate-200">
                  <HeaderCell label="PERÍODO" width="140px" active={activeHeaderFilter === 'period'} onClick={() => setActiveHeaderFilter(activeHeaderFilter === 'period' ? null : 'period')} hasFilter={datePreset !== 'all'}>
                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        {['all', 'today', '7days', '15days', '30days'].map(p => (
                          <button key={p} onClick={() => { setDatePreset(p as DatePreset); setActiveHeaderFilter(null); }} className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${datePreset === p ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{p === 'all' ? 'TUDO' : p === '7days' ? '7 DIAS' : p === '15days' ? '15 DIAS' : p === '30days' ? '30 DIAS' : p.toUpperCase()}</button>
                        ))}
                      </div>
                    </div>
                  </HeaderCell>

                  <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">Produto</th>

                  <HeaderCell label="UTM SOURCE" active={activeHeaderFilter === 'source'} onClick={() => setActiveHeaderFilter(activeHeaderFilter === 'source' ? null : 'source')} hasFilter={filters[colSource || '']?.length > 0}>
                    <FilterDropdownContent col={colSource || ''} values={uniqueValuesMap[colSource || '']} filters={filters} toggle={toggleFilter} />
                  </HeaderCell>
                  
                  <HeaderCell label="UTM CAMPAIGN" active={activeHeaderFilter === 'campanha'} onClick={() => setActiveHeaderFilter(activeHeaderFilter === 'campanha' ? null : 'campanha')} hasFilter={filters[colCampaign || '']?.length > 0}>
                    <FilterDropdownContent col={colCampaign || ''} values={uniqueValuesMap[colCampaign || '']} filters={filters} toggle={toggleFilter} />
                  </HeaderCell>

                  <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">UTM Content</th>
                  
                  <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest text-center">Vendas</th>
                  <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">Faturamento</th>
                  <th className="px-4 py-4 font-black text-indigo-600 uppercase tracking-widest">Invest. Total</th>
                  <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">CPA Médio</th>
                  <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest text-right pr-6">ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupedPerformance.map((group: any) => {
                  const investment = groupInvestments[group.key] || 0;
                  const cpa = group.vendas > 0 ? investment / group.vendas : 0;
                  const roi = investment > 0 ? group.faturamento / investment : 0;
                  const hasProfit = investment > 0 && group.faturamento > investment;
                  const isLoss = investment > 0 && group.faturamento <= investment;

                  const productNames = Object.keys(group.productsMap);
                  const isMultipleProducts = productNames.length > 1;
                  const mainProduct = isMultipleProducts ? `${productNames.length} Produtos Diferentes` : productNames[0];

                  return (
                    <tr key={group.key} className={`transition-colors ${hasProfit ? 'bg-emerald-50/30' : isLoss ? 'bg-rose-50/30' : 'hover:bg-slate-50'}`}>
                      <td className="px-4 py-4 text-slate-400 font-bold leading-tight">{group.minDate} <br/> {group.maxDate}</td>
                      
                      <td className="px-4 py-4 font-black text-slate-700 relative">
                        <div className="flex items-center gap-2 group">
                          <span className={`${isMultipleProducts ? 'text-indigo-600 underline decoration-dotted' : ''}`}>{mainProduct}</span>
                          <button 
                            onClick={() => setActiveProductPopup(activeProductPopup === group.key ? null : group.key)}
                            className="p-1 hover:bg-indigo-100 rounded-md transition-colors text-indigo-400"
                          >
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeProductPopup === group.key ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                        {activeProductPopup === group.key && (
                          <div className="absolute top-full left-4 mt-1 bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 z-50 min-w-[240px] animate-in fade-in zoom-in duration-150 origin-top-left">
                            <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
                              <span className="text-[10px] font-black uppercase text-slate-400">Distribuição por Produto</span>
                              <button onClick={() => setActiveProductPopup(null)}><X className="w-3 h-3 text-slate-300" /></button>
                            </div>
                            <div className="space-y-2">
                              {Object.entries(group.productsMap).map(([name, count]: any) => (
                                <div key={name} className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-slate-600 truncate max-w-[150px]">{name}</span>
                                  <span className="text-[11px] font-black text-indigo-600">{count} vds</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4 font-bold text-indigo-500 uppercase">{group.source}</td>
                      <td className="px-4 py-4 font-medium text-slate-600 max-w-[200px] truncate" title={group.campanha}>{group.campanha}</td>
                      
                      <td className="px-4 py-4 font-medium text-slate-400 max-w-[150px] truncate">
                        {Array.from(group.contents).join(', ')}
                      </td>

                      <td className="px-4 py-4 font-black text-indigo-600 text-center text-xl tracking-tighter">{group.vendas}</td>
                      <td className="px-4 py-4 font-black text-slate-800">{formatBRL(group.faturamento)}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center px-3 py-2 bg-white border border-indigo-100 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 shadow-sm">
                          <span className="text-[10px] font-black text-slate-400 mr-1">R$</span>
                          <input type="number" className="bg-transparent border-none outline-none w-16 text-[11px] font-black text-slate-800 p-0" value={groupInvestments[group.key] || ''} onChange={(e) => setGroupInvestments(prev => ({ ...prev, [group.key]: Number(e.target.value) }))} placeholder="0,00" />
                        </div>
                      </td>
                      <td className="px-4 py-4 font-black text-slate-800">{formatBRL(cpa)}</td>
                      <td className="px-4 py-4 text-right pr-6">
                        {investment === 0 ? (
                          <span className="inline-block px-4 py-1.5 bg-slate-100 text-slate-400 rounded-full font-black text-[9px] uppercase tracking-wider">Pendente</span>
                        ) : (
                          <span className={`inline-block px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-wider shadow-sm ${roi >= 1 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>{roi.toFixed(2)}x ROI</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View: Análise Gráfica */}
      {viewMode === 'graphs' && (
        <div className="space-y-8 animate-in fade-in duration-500 w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SummaryCard label="HOJE" value={periodStats.today} color="text-indigo-600" iconColor="bg-indigo-50 text-indigo-500" />
            <SummaryCard label="7 DIAS" value={periodStats.d7} color="text-emerald-500" iconColor="bg-emerald-50 text-emerald-500" />
            <SummaryCard label="30 DIAS" value={periodStats.d30} color="text-amber-500" iconColor="bg-amber-50 text-amber-500" />
          </div>
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm w-full">
            <div className="flex items-center space-x-2 mb-10"><TrendingUp className="w-5 h-5 text-indigo-500" /><h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Evolução de Vendas</h4></div>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolutionData}>
                  <defs><linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} labelStyle={{fontWeight: 900, marginBottom: '4px'}} />
                  <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorCount)" dot={{r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6, strokeWidth: 0}} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            <DonutChartCard title="CAMPANHAS (TOP 5)" data={top5Campaigns} icon={<Target className="w-4 h-4" />} />
            <DonutChartCard title="SOURCES (TOP 5)" data={top5Source} icon={<Layers className="w-4 h-4" />} />
            <DonutChartCard title="PRODUTOS (TOP 5)" data={top5Products} icon={<Receipt className="w-4 h-4" />} />
          </div>
        </div>
      )}

      {/* View: Análise Central */}
      {viewMode === 'central' && (
        <div className="space-y-8 animate-in fade-in duration-500 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard title="Faturamento" value={formatBRL(stats.fat)} icon={<TrendingUp className="w-4 h-4" />} color="emerald" tag="Vendas" />
            <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm relative group overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3"><div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg"><Wallet className="w-4 h-4" /></div><span className="text-[9px] font-black uppercase bg-rose-50 text-rose-500 px-2 py-0.5 rounded-full">Tráfego</span></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Investido Geral</p>
                <div className="flex items-center"><span className="text-xl font-black text-slate-800 tracking-tighter mr-1">R$</span><input type="number" value={manualInvestment || ''} onChange={(e) => setManualInvestment(Number(e.target.value))} className="w-full bg-transparent border-none outline-none text-xl font-black text-slate-800 tracking-tighter focus:ring-0 p-0" placeholder="0,00" /></div>
              </div>
            </div>
            <StatCard title="Impostos" value={formatBRL(stats.imp)} icon={<Receipt className="w-4 h-4" />} color="amber" tag="6%" />
            <StatCard title="ROAS" value={`${stats.roas.toFixed(2)}x`} icon={<Target className="w-4 h-4" />} color="indigo" tag="ROI" />
            <div className="bg-indigo-600 p-5 rounded-[28px] shadow-xl text-white relative overflow-hidden group">
              <div className="relative z-10"><p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">Lucro Estimado</p><h3 className="text-2xl font-black tracking-tighter">{formatBRL(stats.luc)}</h3><p className="text-[11px] font-bold text-indigo-100 mt-2">Margem: {stats.fat > 0 ? ((stats.luc/stats.fat)*100).toFixed(1) : 0}%</p></div>
              <DollarSign className="absolute -bottom-2 -right-2 w-16 h-16 text-white opacity-10" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-8 w-full">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6"><div className="flex items-center space-x-3"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><FilterIcon className="w-5 h-5" /></div><h4 className="text-lg font-black text-slate-800 tracking-tighter uppercase">Filtros Avançados</h4></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {categoricalFilterCols.map(col => (
                <FilterColumn key={col} col={col} uniqueValues={uniqueValuesMap[col]} filters={filters} toggleFilter={toggleFilter} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* View: Base de Dados */}
      {viewMode === 'database' && (
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl overflow-hidden w-full">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50"><h4 className="font-black text-slate-800 tracking-tighter uppercase text-sm">Registro Completo ({filteredRows.length})</h4></div>
          <div className="overflow-x-auto max-h-[750px] scrollbar-thin">
            <table className="w-full text-left text-[11px] border-collapse relative">
              <thead className="sticky top-0 z-20 bg-slate-50 shadow-sm"><tr className="border-b border-slate-200">{data.headers.map(h => (<th key={h} className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>))}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <tr key={row._id} className="hover:bg-indigo-50/30 transition-colors">
                    {data.headers.map(h => (<td key={h} className="px-6 py-3 text-slate-600 font-bold whitespace-nowrap">{typeof row[h] === 'number' && h.toLowerCase().match(/(valor|faturamento|gasto|lucro|imposto|spend|receita)/) ? formatBRL(row[h]) : row[h]}</td>))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const HeaderCell = ({ label, children, active, onClick, hasFilter, width }: any) => {
  const ref = useRef<HTMLTableHeaderCellElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (active && ref.current && !ref.current.contains(e.target as Node)) onClick(); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [active, onClick]);
  return (
    <th ref={ref} className="px-4 py-4 relative group" style={{ width }}>
      <button onClick={onClick} className={`flex items-center font-black uppercase tracking-widest transition-all hover:text-indigo-600 ${hasFilter ? 'text-indigo-600' : 'text-slate-400'}`}>{label}<ChevronDown className={`w-3 h-3 ml-1.5 transition-transform ${active ? 'rotate-180 text-indigo-600' : 'opacity-40 group-hover:opacity-100'}`} /></button>
      {active && (<div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 shadow-2xl rounded-2xl z-50 animate-in fade-in zoom-in duration-150 origin-top-left min-w-[280px]">{children}</div>)}
    </th>
  );
};

const FilterDropdownContent = ({ col, values, filters, toggle }: any) => {
  const [search, setSearch] = useState('');
  return (
    <div className="p-4 space-y-3">
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" /><input autoFocus type="text" placeholder="Pesquisar..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className="max-h-60 overflow-y-auto space-y-1 scrollbar-thin">
        {values.filter((v: any) => String(v).toLowerCase().includes(search.toLowerCase())).map((val: any) => (
          <button key={val} onClick={() => toggle(col, val)} className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold flex items-center justify-between transition-colors ${filters[col]?.includes(val) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><span className="truncate flex-1">{val}</span>{filters[col]?.includes(val) && <CheckCircle2 className="w-3 h-3 ml-2 text-indigo-600" />}</button>
        ))}
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, color, iconColor }: any) => (
  <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
    <div className="space-y-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p><h3 className={`text-4xl font-black tracking-tighter ${color}`}>{value}</h3></div>
    <div className={`p-3 rounded-2xl ${iconColor} transition-transform group-hover:scale-110`}><Calendar className="w-6 h-6" /></div>
  </div>
);

const DonutChartCard = ({ title, data, icon }: any) => (
  <div className="bg-white p-7 rounded-[40px] border border-slate-100 shadow-sm flex flex-col h-full">
    <div className="flex items-center space-x-2 mb-8"><div className="p-1.5 bg-slate-50 text-slate-400 rounded-lg">{icon}</div><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</h4></div>
    <div className="h-[200px] mb-8"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{data.map((_: any, index: number) => (<Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} strokeWidth={0} />))}</Pie><Tooltip contentStyle={{borderRadius: '12px', border: 'none', fontSize: '10px'}} /></PieChart></ResponsiveContainer></div>
    <div className="flex flex-wrap gap-x-4 gap-y-2 justify-start">{data.map((entry: any, index: number) => (<div key={entry.name} className="flex items-center space-x-2"><div className="w-3 h-3 rounded-full" style={{backgroundColor: PIE_COLORS[index % PIE_COLORS.length]}} /><span className="text-[9px] font-bold text-slate-500 truncate max-w-[120px]">{entry.name}</span></div>))}</div>
  </div>
);

const FilterColumn = ({ col, uniqueValues, filters, toggleFilter }: any) => {
  const [search, setSearch] = useState('');
  return (
    <div className="space-y-3 flex flex-col">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{col}</label>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" /><input type="text" placeholder={`Buscar...`} className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <div className="flex-1 max-h-52 overflow-y-auto border border-slate-100 rounded-2xl p-2 bg-slate-50 space-y-1 scrollbar-thin shadow-inner">
        {(uniqueValues || []).filter((o: any) => String(o).toLowerCase().includes(search.toLowerCase())).map((val: any) => (
          <button key={val} onClick={() => toggleFilter(col, val)} className={`w-full flex items-center justify-between p-2.5 rounded-xl text-[10px] font-bold transition-all text-left ${filters[col]?.includes(val) ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'}`}><span className="truncate flex-1">{val}</span>{filters[col]?.includes(val) && <CheckCircle2 className="w-3.5 h-3.5 ml-2 flex-shrink-0" />}</button>
        ))}
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color, tag }: any) => {
  const styles = colorMap[color] || colorMap.indigo;
  return (
    <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm relative group overflow-hidden">
      <div className="relative z-10"><div className="flex items-center justify-between mb-3"><div className={`p-1.5 ${styles.lightBg} ${styles.text} rounded-lg`}>{icon}</div><span className={`text-[9px] font-black uppercase ${styles.lightBg} ${styles.text} px-2 py-0.5 rounded-full`}>{tag}</span></div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p><h3 className="text-xl font-black text-slate-800 tracking-tighter truncate">{value}</h3></div>
    </div>
  );
};

const TabButton = ({ active, onClick, label, icon }: any) => (
  <button onClick={onClick} className={`flex items-center px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${active ? 'bg-white text-indigo-600 shadow-md scale-105' : 'text-slate-500 hover:text-slate-800'}`}>{icon} {label}</button>
);

export default Dashboard;
