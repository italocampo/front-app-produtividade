import { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Activity, Book, Briefcase, Heart, Zap, 
  CheckCircle2, Circle, Smile, Trophy,
  Brain, BarChart3, Calendar, Droplets, Loader2, 
  LayoutDashboard, ListChecks
} from 'lucide-react';
import type { HabitoBase, PlanoSemanal, DiaSemana } from './types';

// --- CONFIGURAÇÃO DA API ---
const API_URL = 'https://backend-apis-api-app-produtividade.t8sftf.easypanel.host';

// --- TIPOS ---
type TelaAtual = 'HOJE' | 'ROTINA' | 'PLANEJAMENTO' | 'ESTATISTICAS';

// --- COMPONENTE DE NAVEGAÇÃO ---
interface NavBtnProps {
  active: boolean;
  onClick: () => void;
  // React.ElementType permite passar o componente do ícone como prop
  icon: React.ElementType; 
  label: string;
}

interface BottomNavProps {
  tela: TelaAtual;
  setTela: (t: TelaAtual) => void;
}

const NavBtn = ({ active, onClick, icon: Icon, label }: NavBtnProps) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 p-2 transition-all duration-300 ${
      active ? 'text-indigo-400 -translate-y-1' : 'text-slate-500 hover:text-slate-300'
    }`}
  >
    <Icon size={24} strokeWidth={active ? 2.5 : 2} />
    <span className="text-[10px] font-semibold tracking-wide">{label}</span>
  </button>
);

const BottomNav = ({ tela, setTela }: BottomNavProps) => (
  <div className="fixed bottom-0 left-0 w-full bg-[#0f172a]/90 backdrop-blur-lg border-t border-white/5 pb-safe pt-2 px-6 flex justify-between items-center z-50">
    <NavBtn active={tela === 'HOJE'} onClick={() => setTela('HOJE')} icon={LayoutDashboard} label="Hoje" />
    <NavBtn active={tela === 'ROTINA'} onClick={() => setTela('ROTINA')} icon={ListChecks} label="Hábitos" />
    <NavBtn active={tela === 'PLANEJAMENTO'} onClick={() => setTela('PLANEJAMENTO')} icon={Calendar} label="Planejar" />
    <NavBtn active={tela === 'ESTATISTICAS'} onClick={() => setTela('ESTATISTICAS')} icon={BarChart3} label="Dados" />
  </div>
);

function App() {
  // --- HELPERS ---
  const getDiaReal = (): DiaSemana => {
    const map: DiaSemana[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    return map[new Date().getDay()];
  };

  const getDataFormatada = () => new Date().toISOString().split('T')[0];

  // --- ESTADOS ---
  const [loading, setLoading] = useState(true);
  const [tela, setTela] = useState<TelaAtual>(() => (localStorage.getItem('app_tela_atual') as TelaAtual) || 'HOJE');

  useEffect(() => { localStorage.setItem('app_tela_atual', tela); }, [tela]);
  
  const [rotinaBase, setRotinaBase] = useState<HabitoBase[]>([]);
  const [planoSemanal, setPlanoSemanal] = useState<PlanoSemanal>({ seg: [], ter: [], qua: [], qui: [], sex: [], sab: [], dom: [] });
  const [concluidasHoje, setConcluidasHoje] = useState<string[]>([]);

  // --- API LOAD ---
  useEffect(() => {
    fetch(`${API_URL}/init?data=${getDataFormatada()}`)
      .then(res => res.json())
      .then(data => {
        setRotinaBase(data.rotinaBase);
        setPlanoSemanal(data.planoSemanal);
        setConcluidasHoje(data.concluidasHoje);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // --- ACTIONS ---
  const [novoHabito, setNovoHabito] = useState('');
  const [categoria, setCategoria] = useState<HabitoBase['categoria']>('Saúde');

  async function adicionarHabito(e: React.FormEvent) {
    e.preventDefault();
    if (!novoHabito.trim()) return;
    const tempId = crypto.randomUUID();
    setRotinaBase([...rotinaBase, { id: tempId, nome: novoHabito, categoria }]);
    setNovoHabito('');
    try {
      const res = await fetch(`${API_URL}/habitos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novoHabito, categoria })
      });
      const real = await res.json();
      setRotinaBase(prev => prev.map(h => h.id === tempId ? real : h));
    } catch (error) {
      // CORREÇÃO DO ERRO NO-EMPTY: Adicionado console.error
      console.error("Erro silencioso ao adicionar:", error);
    }
  }

  async function removerHabito(id: string) {
    if(!confirm('Excluir hábito?')) return;
    setRotinaBase(prev => prev.filter(h => h.id !== id));
    await fetch(`${API_URL}/habitos/${id}`, { method: 'DELETE' });
  }

  // Planejamento
  const [diaSelecionado, setDiaSelecionado] = useState<DiaSemana>(getDiaReal());
  const diasDisplay: Record<DiaSemana, string> = { seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta', sab: 'Sábado', dom: 'Domingo' };

  async function toggleHabitoNoDia(habitoId: string) {
    const dia = diaSelecionado;
    const currentList = planoSemanal[dia];
    const newList = currentList.includes(habitoId) 
      ? currentList.filter(id => id !== habitoId) 
      : [...currentList, habitoId];
    
    setPlanoSemanal({ ...planoSemanal, [dia]: newList });
    await fetch(`${API_URL}/plano/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitoId, diaSemana: dia })
    });
  }

  async function replicarParaSemana() {
    if (!confirm('Copiar Segunda para todos os dias?')) return;
    const modelo = planoSemanal['seg'];
    setPlanoSemanal({ seg: modelo, ter: modelo, qua: modelo, qui: modelo, sex: modelo, sab: modelo, dom: modelo });
    await fetch(`${API_URL}/plano/replicar`, { method: 'POST' });
  }

  // Dashboard & Toggle
  const diaRealCodigo = getDiaReal();
  const tarefasDeHoje = rotinaBase.filter(h => planoSemanal[diaRealCodigo]?.includes(h.id));
  const concluidasValidas = concluidasHoje.filter(id => tarefasDeHoje.some(t => t.id === id));

  async function toggleConclusaoHoje(id: string) {
    const isDone = concluidasHoje.includes(id);
    const newList = isDone ? concluidasHoje.filter(c => c !== id) : [...concluidasHoje, id];
    
    setConcluidasHoje(newList);
    await fetch(`${API_URL}/execucao/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitoId: id, data: getDataFormatada() })
    });
  }

  const progresso = tarefasDeHoje.length > 0 
    ? Math.round((concluidasValidas.length / tarefasDeHoje.length) * 100) 
    : 0;

  const statsPorCategoria = tarefasDeHoje.reduce((acc, t) => {
    if (!acc[t.categoria]) acc[t.categoria] = { total: 0, done: 0 };
    acc[t.categoria].total++;
    if (concluidasValidas.includes(t.id)) acc[t.categoria].done++;
    return acc;
  }, {} as Record<string, { total: number, done: number }>);

  // --- UI COMPONENTS ---
  const getIconeCategoria = (cat: string) => {
    switch(cat) {
      case 'Saúde': return <Heart size={18} className="text-rose-400" />;
      case 'Trabalho': return <Briefcase size={18} className="text-sky-400" />;
      case 'Estudo': return <Book size={18} className="text-amber-400" />;
      case 'Espírito': return <Zap size={18} className="text-violet-400" />;
      case 'Cuidados': return <Droplets size={18} className="text-cyan-400" />;
      case 'Mente': return <Brain size={18} className="text-emerald-400" />;
      default: return <Activity size={18} className="text-slate-400" />;
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0b1121]"><Loader2 className="animate-spin text-indigo-500" size={40}/></div>;

  return (
    <div className="text-slate-100 font-sans antialiased selection:bg-indigo-500/30">
      <main className="p-5 pb-32 max-w-md mx-auto min-h-screen flex flex-col">

        {/* --- TELA: HOJE (DASHBOARD) --- */}
        {tela === 'HOJE' && (
          <div className="animate-in fade-in zoom-in duration-500 space-y-8">
            <header className="pt-8 flex justify-between items-end">
              <div>
                <p className="text-indigo-400 font-bold text-xs uppercase tracking-widest mb-1 opacity-90">Visão do Dia</p>
                <h1 className="text-4xl font-extrabold text-white capitalize tracking-tight">{diasDisplay[diaRealCodigo]}</h1>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-white">{concluidasValidas.length}</span>
                <span className="text-slate-500 text-sm font-medium">/{tarefasDeHoje.length}</span>
              </div>
            </header>

            <div className="glass p-6 rounded-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 transition-opacity duration-700">
                <Trophy size={140} />
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-slate-300 font-medium flex items-center gap-2"><Activity size={16} className="text-indigo-400"/> Produtividade</span>
                  <span className="text-white font-bold text-xl">{progresso}%</span>
                </div>
                <div className="h-3 bg-slate-950/50 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                    style={{ width: `${progresso}%` }}
                  />
                </div>
                {progresso === 100 && tarefasDeHoje.length > 0 && (
                  <p className="text-center text-xs font-bold text-emerald-400 mt-4 animate-pulse uppercase tracking-widest">
                    ✨ Meta Diária Batida! ✨
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-slate-500 text-xs font-bold uppercase tracking-wider pl-1">Sua Lista</h2>
              
              {tarefasDeHoje.length === 0 ? (
                <div className="text-center py-16 opacity-60 border border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
                  <Smile size={48} className="mx-auto mb-4 text-slate-600" />
                  <p className="text-slate-300 font-medium">Dia livre!</p>
                  <button onClick={() => setTela('PLANEJAMENTO')} className="text-indigo-400 text-sm font-bold mt-2 hover:underline">
                    Adicionar tarefas
                  </button>
                </div>
              ) : (
                tarefasDeHoje.map(h => {
                  const feita = concluidasValidas.includes(h.id);
                  return (
                    <div key={h.id} onClick={() => toggleConclusaoHoje(h.id)}
                      className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-300 border ${
                        feita 
                          ? 'bg-slate-900/30 border-transparent opacity-50' 
                          : 'glass-active border-indigo-500/20 hover:border-indigo-500/50'
                      }`}
                    >
                      <div className={`transition-all duration-300 ${feita ? 'text-emerald-500 scale-110' : 'text-slate-600'}`}>
                        {feita ? <CheckCircle2 size={26} className="fill-current" /> : <Circle size={26} />}
                      </div>
                      <div className="flex-1">
                        <p className={`font-semibold text-lg transition-all ${feita ? 'line-through text-slate-500' : 'text-white'}`}>
                          {h.nome}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {getIconeCategoria(h.categoria)}
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{h.categoria}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* --- TELA: ROTINA --- */}
        {tela === 'ROTINA' && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-6">
            <header className="pt-8">
              <h1 className="text-3xl font-extrabold text-white">Criar Hábitos</h1>
              <p className="text-slate-400 text-sm mt-1">O que você quer construir?</p>
            </header>

            <form onSubmit={adicionarHabito} className="glass p-5 rounded-3xl space-y-4">
              <input 
                type="text" value={novoHabito} onChange={e => setNovoHabito(e.target.value)}
                placeholder="Ex: Treinar, Ler, Meditar..." 
                className="w-full bg-slate-950/50 text-white rounded-xl px-4 py-4 outline-none border border-slate-700 focus:border-indigo-500 transition-colors placeholder:text-slate-600"
              />
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {['Saúde', 'Trabalho', 'Estudo', 'Espírito', 'Cuidados', 'Mente'].map(cat => (
                  <button key={cat} type="button" onClick={() => setCategoria(cat as HabitoBase['categoria'])}
                    className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                      categoria === cat 
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/50' 
                        : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/30 active:scale-95">
                <Plus size={20} /> Salvar Hábito
              </button>
            </form>

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase ml-1">Biblioteca</h3>
              {rotinaBase.map(h => (
                <div key={h.id} className="flex justify-between items-center glass p-4 rounded-2xl hover:bg-slate-800/50 transition">
                  <div className="flex items-center gap-4">
                     <div className="p-3 bg-slate-900/80 rounded-xl border border-white/5">{getIconeCategoria(h.categoria)}</div>
                     <span className="font-semibold text-slate-200">{h.nome}</span>
                  </div>
                  <button onClick={() => removerHabito(h.id)} className="text-slate-600 hover:text-rose-400 p-2 transition"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TELA: PLANEJAMENTO --- */}
        {tela === 'PLANEJAMENTO' && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-6">
            <header className="pt-8 flex justify-between items-end">
               <div>
                 <h1 className="text-3xl font-extrabold text-white">Planejar</h1>
                 <p className="text-slate-400 text-sm mt-1">Organize sua semana.</p>
               </div>
               <button onClick={replicarParaSemana} className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-2 rounded-lg hover:bg-indigo-500/20 transition">
                 Copiar Seg p/ Semana
               </button>
            </header>

            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
              {(Object.keys(diasDisplay) as DiaSemana[]).map(dia => {
                const isActive = diaSelecionado === dia;
                return (
                  <button key={dia} onClick={() => setDiaSelecionado(dia)}
                    className={`px-5 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap border ${
                      isActive 
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/40 scale-105' 
                        : 'glass text-slate-400 border-slate-800'
                    }`}
                  >
                    {diasDisplay[dia]}
                  </button>
                );
              })}
            </div>

            <div className="glass p-1 rounded-3xl min-h-[400px]">
              <div className="space-y-1 p-2">
                {rotinaBase.length === 0 && <p className="text-sm text-slate-500 text-center py-20">Vazio. Vá em "Hábitos" criar.</p>}
                {rotinaBase.map(h => {
                  const selecionado = planoSemanal[diaSelecionado].includes(h.id);
                  return (
                    <div key={h.id} onClick={() => toggleHabitoNoDia(h.id)}
                      className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${
                        selecionado ? 'bg-indigo-500/10 border border-indigo-500/30' : 'hover:bg-slate-800/30 border border-transparent'
                      }`}
                    >
                      <div className={`transition-transform ${selecionado ? 'text-indigo-400 scale-110' : 'text-slate-600'}`}>
                        {selecionado ? <CheckCircle2 size={24} className="fill-current" /> : <Circle size={24} />}
                      </div>
                      <span className={`font-medium ${selecionado ? 'text-white' : 'text-slate-400'}`}>{h.nome}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* --- TELA: ESTATISTICAS --- */}
        {tela === 'ESTATISTICAS' && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-8">
             <header className="pt-8">
              <h1 className="text-3xl font-extrabold text-white">Estatísticas</h1>
              <p className="text-slate-400 text-sm mt-1">Análise de performance.</p>
            </header>

            {/* Carga Semanal */}
            <div className="glass p-6 rounded-3xl">
               <h3 className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-wider flex items-center gap-2">
                 <Calendar size={14} /> Carga Semanal
               </h3>
               <div className="flex items-end justify-between h-32 gap-3">
                  {(Object.keys(diasDisplay) as DiaSemana[]).map(dia => {
                     const qtd = planoSemanal[dia].length;
                     const altura = qtd > 0 ? (qtd / 10) * 100 : 5;
                     const isHoje = dia === diaRealCodigo;
                     return (
                       <div key={dia} className="flex flex-col items-center gap-3 flex-1 group">
                          <div className="w-full relative flex items-end justify-center bg-slate-800/50 rounded-t-lg h-full overflow-hidden">
                             <div 
                                className={`w-full rounded-t-lg transition-all duration-700 ${isHoje ? 'bg-indigo-500' : 'bg-slate-600 group-hover:bg-slate-500'}`} 
                                style={{ height: `${Math.min(altura * 1.5, 100)}%` }}
                             ></div>
                          </div>
                          <span className={`text-[10px] font-bold uppercase ${isHoje ? 'text-indigo-400' : 'text-slate-600'}`}>
                             {dia.substring(0, 3)}
                          </span>
                       </div>
                     )
                  })}
               </div>
            </div>

            {/* PERFORMANCE POR CATEGORIA */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase ml-1">Desempenho Hoje por Categoria</h3>
              {Object.keys(statsPorCategoria).length === 0 && <p className="text-slate-600 text-sm italic pl-1">Nenhuma tarefa hoje.</p>}
              
              {Object.entries(statsPorCategoria).map(([cat, stats]) => {
                const pct = Math.round((stats.done / stats.total) * 100);
                return (
                  <div key={cat} className="glass p-4 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-slate-900/50 rounded-xl border border-white/5">
                      {getIconeCategoria(cat)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-2">
                        <span className="font-bold text-sm text-slate-200">{cat}</span>
                        <span className="text-xs font-bold text-slate-400">{stats.done}/{stats.total} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 transition-all duration-1000" 
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </main>
      <BottomNav tela={tela} setTela={setTela} />
    </div>
  );
}

export default App;