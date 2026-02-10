import { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Activity, Book, Briefcase, Heart, Zap, 
  CheckCircle2, Circle, Smile, Trophy,
  Brain, BarChart3, Calendar, Droplets, Loader2, 
  LayoutDashboard, ListChecks, ChevronLeft, ChevronRight, TrendingUp
} from 'lucide-react';
import type { HabitoBase, PlanoSemanal, DiaSemana } from './types';

// --- CONFIGURAÇÃO DA API ---
const API_URL = 'https://backend-apis-api-app-produtividade.t8sftf.easypanel.host';

// --- TIPOS ---
type TelaAtual = 'HOJE' | 'ROTINA' | 'PLANEJAMENTO' | 'ESTATISTICAS';

// --- PALETA DE CORES POR CATEGORIA ---
const CATEGORY_STYLES: Record<string, { color: string, bg: string, border: string, icon: string }> = {
  'Saúde': { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-400' },
  'Trabalho': { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: 'text-blue-400' },
  'Estudo': { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: 'text-amber-400' },
  'Espírito': { color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', icon: 'text-violet-400' },
  'Cuidados': { color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20', icon: 'text-pink-400' },
  'Mente': { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', icon: 'text-cyan-400' },
  'Outros': { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: 'text-slate-400' }
};

// --- COMPONENTE DE NAVEGAÇÃO ---
interface NavBtnProps {
  active: boolean;
  onClick: () => void;
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
    className={`flex flex-col items-center gap-1 p-2 transition-all duration-300 relative ${
      active ? 'text-indigo-400 -translate-y-2' : 'text-slate-400 hover:text-slate-200'
    }`}
  >
    {active && (
      <div className="absolute -top-2 w-8 h-8 bg-indigo-500/20 rounded-full blur-md animate-pulse"></div>
    )}
    <Icon size={24} strokeWidth={active ? 2.5 : 2} />
    <span className={`text-[10px] font-semibold tracking-wide ${active ? 'opacity-100' : 'opacity-80'}`}>{label}</span>
  </button>
);

const BottomNav = ({ tela, setTela }: BottomNavProps) => (
  <div className="fixed bottom-0 left-0 w-full bg-[#0f172a]/95 backdrop-blur-xl border-t border-white/10 pb-safe pt-3 px-6 flex justify-between items-center z-50 shadow-2xl">
    <NavBtn active={tela === 'HOJE'} onClick={() => setTela('HOJE')} icon={LayoutDashboard} label="Hoje" />
    <NavBtn active={tela === 'ROTINA'} onClick={() => setTela('ROTINA')} icon={ListChecks} label="Criar" />
    <NavBtn active={tela === 'PLANEJAMENTO'} onClick={() => setTela('PLANEJAMENTO')} icon={Calendar} label="Planejar" />
    <NavBtn active={tela === 'ESTATISTICAS'} onClick={() => setTela('ESTATISTICAS')} icon={BarChart3} label="Dados" />
  </div>
);

function App() {
  // --- HELPERS ---
  const formatarDataLocal = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const dataLocal = new Date(date.getTime() - (offset * 60 * 1000));
    return dataLocal.toISOString().split('T')[0];
  };

  const getDiaSemanaDeData = (date: Date): DiaSemana => {
    const map: DiaSemana[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    return map[date.getDay()];
  };

  // --- ESTADOS ---
  const [loading, setLoading] = useState(true);
  const [tela, setTela] = useState<TelaAtual>(() => (localStorage.getItem('app_tela_atual') as TelaAtual) || 'HOJE');
  const [dataVisualizacao, setDataVisualizacao] = useState(new Date());

  useEffect(() => { localStorage.setItem('app_tela_atual', tela); }, [tela]);
  
  const [rotinaBase, setRotinaBase] = useState<HabitoBase[]>([]);
  const [planoSemanal, setPlanoSemanal] = useState<PlanoSemanal>({ seg: [], ter: [], qua: [], qui: [], sex: [], sab: [], dom: [] });
  const [concluidasNaData, setConcluidasNaData] = useState<string[]>([]);

  // --- DATA ---
  const mudarDia = (dias: number) => {
    const novaData = new Date(dataVisualizacao);
    novaData.setDate(novaData.getDate() + dias);
    setDataVisualizacao(novaData);
    setLoading(true);
  };

  const irParaHoje = () => {
    setDataVisualizacao(new Date());
    setLoading(true);
  };

  const getLabelData = () => {
    const hoje = new Date();
    const dataAtual = dataVisualizacao;
    const d1 = new Date(hoje.setHours(0,0,0,0));
    const d2 = new Date(new Date(dataAtual).setHours(0,0,0,0));
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    if (diffDays === 0) return 'Hoje';
    if (diffDays === -1) return 'Ontem';
    if (diffDays === 1) return 'Amanhã';
    return dataAtual.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  // --- API ---
  useEffect(() => {
    const dataString = formatarDataLocal(dataVisualizacao);
    fetch(`${API_URL}/init?data=${dataString}`)
      .then(res => res.json())
      .then(data => {
        setRotinaBase(data.rotinaBase);
        setPlanoSemanal(data.planoSemanal);
        setConcluidasNaData(data.concluidasHoje);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [dataVisualizacao]);

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
      await fetch(`${API_URL}/habitos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novoHabito, categoria })
      });
      // Refresh silencioso
      const dataString = formatarDataLocal(dataVisualizacao);
      const res = await fetch(`${API_URL}/init?data=${dataString}`);
      const data = await res.json();
      setRotinaBase(data.rotinaBase);
    } catch (error) { console.error(error); }
  }

  async function removerHabito(id: string) {
    if(!confirm('Excluir hábito permanentemente?')) return;
    setRotinaBase(prev => prev.filter(h => h.id !== id));
    await fetch(`${API_URL}/habitos/${id}`, { method: 'DELETE' });
  }

  const [diaSelecionado, setDiaSelecionado] = useState<DiaSemana>(getDiaSemanaDeData(new Date()));
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
    if (!confirm('Replicar a rotina de Segunda para todos os dias?')) return;
    const modelo = planoSemanal['seg'];
    setPlanoSemanal({ seg: modelo, ter: modelo, qua: modelo, qui: modelo, sex: modelo, sab: modelo, dom: modelo });
    await fetch(`${API_URL}/plano/replicar`, { method: 'POST' });
  }

  const diaDaSemanaAtual = getDiaSemanaDeData(dataVisualizacao);
  const tarefasDoDia = rotinaBase.filter(h => planoSemanal[diaDaSemanaAtual]?.includes(h.id));
  const concluidasValidas = concluidasNaData.filter(id => tarefasDoDia.some(t => t.id === id));

  async function toggleConclusao(id: string) {
    const isDone = concluidasNaData.includes(id);
    const newList = isDone ? concluidasNaData.filter(c => c !== id) : [...concluidasNaData, id];
    setConcluidasNaData(newList);
    await fetch(`${API_URL}/execucao/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitoId: id, data: formatarDataLocal(dataVisualizacao) })
    });
  }

  const progresso = tarefasDoDia.length > 0 
    ? Math.round((concluidasValidas.length / tarefasDoDia.length) * 100) 
    : 0;

  const statsPorCategoria = tarefasDoDia.reduce((acc, t) => {
    if (!acc[t.categoria]) acc[t.categoria] = { total: 0, done: 0 };
    acc[t.categoria].total++;
    if (concluidasValidas.includes(t.id)) acc[t.categoria].done++;
    return acc;
  }, {} as Record<string, { total: number, done: number }>);

  // --- UI HELPERS ---
  const getIconeCategoria = (cat: string) => {
    switch(cat) {
      case 'Saúde': return <Heart size={18} />;
      case 'Trabalho': return <Briefcase size={18} />;
      case 'Estudo': return <Book size={18} />;
      case 'Espírito': return <Zap size={18} />;
      case 'Cuidados': return <Droplets size={18} />;
      case 'Mente': return <Brain size={18} />;
      default: return <Activity size={18} />;
    }
  };

  const getStyleCategoria = (cat: string) => {
    return CATEGORY_STYLES[cat] || CATEGORY_STYLES['Outros'];
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0b1121]"><Loader2 className="animate-spin text-indigo-500" size={40}/></div>;

  return (
    <div className="text-slate-100 font-sans antialiased selection:bg-indigo-500/30">
      <main className="p-5 pb-32 max-w-md mx-auto min-h-screen flex flex-col">

        {/* --- TELA: HOJE --- */}
        {tela === 'HOJE' && (
          <div className="animate-in fade-in zoom-in duration-500 space-y-6">
            {/* Header Data */}
            <header className="pt-8 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <button onClick={() => mudarDia(-1)} className="p-2 bg-slate-800/50 rounded-full hover:bg-slate-700 transition active:scale-95">
                  <ChevronLeft size={20} className="text-slate-400" />
                </button>
                <div className="flex flex-col items-center cursor-pointer" onClick={irParaHoje}>
                  <p className="text-indigo-400 font-bold text-[10px] uppercase tracking-widest mb-1 opacity-90">
                    {diasDisplay[diaDaSemanaAtual]}
                  </p>
                  <h1 className="text-2xl font-extrabold text-white capitalize tracking-tight flex items-center gap-2">
                    {getLabelData()} 
                    {getLabelData() !== 'Hoje' && <span className="text-[10px] bg-indigo-500/20 px-2 py-0.5 rounded-full text-indigo-300 border border-indigo-500/30">Voltar</span>}
                  </h1>
                </div>
                <button onClick={() => mudarDia(1)} className="p-2 bg-slate-800/50 rounded-full hover:bg-slate-700 transition active:scale-95">
                  <ChevronRight size={20} className="text-slate-400" />
                </button>
              </div>
            </header>

            {loading ? (
              <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-indigo-500"/></div>
            ) : (
              <>
                {/* Progress Card (Surface Elevation) */}
                <div className="bg-[#1e293b]/40 backdrop-blur-md p-6 rounded-3xl border border-white/5 relative overflow-hidden group shadow-xl">
                  <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 transition-opacity duration-700">
                    <Trophy size={140} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-slate-300 font-medium flex items-center gap-2 text-sm">
                        <Activity size={16} className="text-indigo-400"/> Desempenho
                      </span>
                      <span className="text-white font-bold text-xl">{progresso}%</span>
                    </div>
                    <div className="h-3 bg-slate-950/60 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                        style={{ width: `${progresso}%` }}
                      />
                    </div>
                    {progresso === 100 && tarefasDoDia.length > 0 && (
                      <div className="mt-4 flex justify-center">
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 animate-pulse">
                          🔥 Meta Diária Batida!
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lista de Tarefas */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1 mt-2">
                    <h2 className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                      Sua Missão
                    </h2>
                    {tarefasDoDia.length > 0 && (
                      <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400 font-medium">
                        {concluidasValidas.length}/{tarefasDoDia.length}
                      </span>
                    )}
                  </div>
                  
                  {tarefasDoDia.length === 0 ? (
                    <div className="text-center py-16 opacity-70 border border-dashed border-slate-800 rounded-3xl bg-slate-900/20 flex flex-col items-center">
                      <div className="bg-slate-800/50 p-4 rounded-full mb-3">
                        <Smile size={32} className="text-slate-500" />
                      </div>
                      <p className="text-slate-300 font-medium">Dia livre!</p>
                      <p className="text-xs text-slate-500 mb-4 max-w-[200px]">Nenhuma tarefa agendada para esta data.</p>
                      {getLabelData() === 'Hoje' && (
                        <button onClick={() => setTela('PLANEJAMENTO')} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-lg shadow-indigo-900/20">
                          Planejar agora
                        </button>
                      )}
                    </div>
                  ) : (
                    tarefasDoDia.map(h => {
                      const feita = concluidasValidas.includes(h.id);
                      const style = getStyleCategoria(h.categoria);
                      return (
                        <div key={h.id} onClick={() => toggleConclusao(h.id)}
                          className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-300 border relative overflow-hidden group ${
                            feita 
                              ? 'bg-slate-900/40 border-transparent opacity-60' 
                              : `bg-[#1e293b]/40 backdrop-blur-sm border-white/5 hover:border-indigo-500/30 hover:bg-[#1e293b]/60`
                          }`}
                        >
                          {/* Barra Lateral Colorida */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${feita ? 'bg-slate-700' : style.bg.replace('/10', '/80')}`}></div>

                          <div className={`transition-all duration-300 ${feita ? 'text-emerald-500 scale-110' : 'text-slate-600 group-hover:text-indigo-400'}`}>
                            {feita ? <CheckCircle2 size={26} className="fill-current" /> : <Circle size={26} />}
                          </div>
                          
                          <div className="flex-1">
                            <p className={`font-semibold text-[15px] transition-all ${feita ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                              {h.nome}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={`text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 px-1.5 py-0.5 rounded ${style.bg} ${style.color}`}>
                                {getIconeCategoria(h.categoria)} {h.categoria}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* --- TELA: ROTINA --- */}
        {tela === 'ROTINA' && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-6">
            <header className="pt-8">
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Criar Hábitos</h1>
              <p className="text-slate-400 text-sm mt-1">Biblioteca de atividades.</p>
            </header>

            {/* Layout Lei de Fitts: Botão perto do input */}
            <form onSubmit={adicionarHabito} className="bg-[#1e293b]/40 backdrop-blur-md p-5 rounded-3xl space-y-4 border border-white/5 shadow-xl">
              <div className="flex gap-2">
                <input 
                  type="text" value={novoHabito} onChange={e => setNovoHabito(e.target.value)}
                  placeholder="Ex: Ler 10 páginas..." 
                  className="flex-1 bg-slate-950/50 text-white rounded-xl px-4 py-3 outline-none border border-slate-700 focus:border-indigo-500 transition-colors placeholder:text-slate-600 text-sm"
                />
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl transition-all shadow-lg shadow-indigo-900/30 active:scale-95 flex items-center justify-center">
                  <Plus size={24} />
                </button>
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide pt-1">
                {Object.keys(CATEGORY_STYLES).filter(c => c !== 'Outros').map(cat => {
                  const style = getStyleCategoria(cat);
                  const isSelected = categoria === cat;
                  return (
                    <button key={cat} type="button" onClick={() => setCategoria(cat as HabitoBase['categoria'])}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        isSelected 
                          ? `${style.bg} ${style.border} ${style.color} ring-1 ring-offset-1 ring-offset-[#0f172a] ring-indigo-500` 
                          : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:bg-slate-800'
                      }`}
                    >
                      {/* Pequeno ponto de cor */}
                      <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-current' : style.bg.replace('/10','/50')}`}></div>
                      {cat}
                    </button>
                  );
                })}
              </div>
            </form>

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase ml-1">Sua Biblioteca</h3>
              {rotinaBase.map(h => {
                const style = getStyleCategoria(h.categoria);
                return (
                  <div key={h.id} className="flex justify-between items-center bg-[#1e293b]/30 backdrop-blur-sm p-4 rounded-2xl border border-white/5 hover:bg-[#1e293b]/50 transition group">
                    <div className="flex items-center gap-4">
                       <div className={`p-2.5 rounded-xl ${style.bg} ${style.color}`}>
                         {getIconeCategoria(h.categoria)}
                       </div>
                       <span className="font-semibold text-slate-200 text-sm">{h.nome}</span>
                    </div>
                    <button onClick={() => removerHabito(h.id)} className="text-slate-600 hover:text-rose-400 p-2 transition opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
                  </div>
                )
              })}
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
               <button onClick={replicarParaSemana} className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-3 py-2 rounded-lg hover:bg-indigo-500/20 transition border border-indigo-500/20">
                 Copiar Seg ➔ Semana
               </button>
            </header>

            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
              {(Object.keys(diasDisplay) as DiaSemana[]).map(dia => {
                const isActive = diaSelecionado === dia;
                return (
                  <button key={dia} onClick={() => setDiaSelecionado(dia)}
                    className={`px-5 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap border relative overflow-hidden ${
                      isActive 
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/40 scale-105' 
                        : 'bg-[#1e293b]/50 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {diasDisplay[dia]}
                  </button>
                );
              })}
            </div>

            <div className="bg-[#1e293b]/40 backdrop-blur-md border border-white/5 p-1 rounded-3xl min-h-[400px]">
              <div className="space-y-1 p-2">
                {rotinaBase.length === 0 && <p className="text-sm text-slate-500 text-center py-20">Vazio. Vá em "Criar" primeiro.</p>}
                {rotinaBase.map(h => {
                  const selecionado = planoSemanal[diaSelecionado].includes(h.id);
                  const style = getStyleCategoria(h.categoria);
                  return (
                    <div key={h.id} onClick={() => toggleHabitoNoDia(h.id)}
                      className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border ${
                        selecionado ? 'bg-indigo-500/10 border-indigo-500/30' : 'hover:bg-slate-800/30 border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className={`transition-transform ${selecionado ? 'text-indigo-400 scale-110' : 'text-slate-600'}`}>
                        {selecionado ? <CheckCircle2 size={22} className="fill-current" /> : <Circle size={22} />}
                      </div>
                      <span className={`font-medium text-sm ${selecionado ? 'text-white' : 'text-slate-400'}`}>{h.nome}</span>
                      {selecionado && <div className={`ml-auto w-2 h-2 rounded-full ${style.bg.replace('/10','/80')}`}></div>}
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

            {/* Comparativo Mockado (Dopamina) */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-4">
               <div className="p-3 bg-emerald-500/20 rounded-full text-emerald-400">
                 <TrendingUp size={24} />
               </div>
               <div>
                 <p className="text-emerald-400 font-bold text-sm">+15% Produtividade</p>
                 <p className="text-slate-400 text-xs">Comparado à semana passada.</p>
               </div>
            </div>

            {/* Carga Semanal */}
            <div className="bg-[#1e293b]/40 backdrop-blur-md p-6 rounded-3xl border border-white/5">
               <h3 className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-wider flex items-center gap-2">
                 <Calendar size={14} /> Carga Semanal
               </h3>
               <div className="flex items-end justify-between h-32 gap-3">
                  {(Object.keys(diasDisplay) as DiaSemana[]).map(dia => {
                     const qtd = planoSemanal[dia].length;
                     const altura = qtd > 0 ? (qtd / 10) * 100 : 5;
                     const isHoje = dia === getDiaSemanaDeData(new Date());
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
              <h3 className="text-xs font-bold text-slate-500 uppercase ml-1">Foco de Hoje</h3>
              {Object.keys(statsPorCategoria).length === 0 && <p className="text-slate-600 text-sm italic pl-1">Sem dados para hoje.</p>}
              
              {Object.entries(statsPorCategoria).map(([cat, stats]) => {
                const pct = Math.round((stats.done / stats.total) * 100);
                const style = getStyleCategoria(cat);
                return (
                  <div key={cat} className="bg-[#1e293b]/40 backdrop-blur-md p-4 rounded-2xl flex items-center gap-4 border border-white/5">
                    <div className={`p-3 rounded-xl ${style.bg} ${style.color}`}>
                      {getIconeCategoria(cat)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-2">
                        <span className="font-bold text-sm text-slate-200">{cat}</span>
                        <span className="text-xs font-bold text-slate-400">{stats.done}/{stats.total} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${style.bg.replace('/10', '')}`} 
                          style={{ backgroundColor: 'currentColor', color: 'inherit', width: `${pct}%` }}
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