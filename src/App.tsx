import { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Activity, Book, Briefcase, Heart, Zap, 
  CheckCircle2, Circle, Smile, 
  Brain, BarChart3, Calendar, Droplets, Loader2, 
  LayoutDashboard, ListChecks, ChevronLeft, ChevronRight,
  Target, Percent
} from 'lucide-react';
import type { HabitoBase, PlanoSemanal, DiaSemana } from './types';

// --- CONFIGURAÇÃO DA API ---
const API_URL = 'https://backend-apis-api-app-produtividade.t8sftf.easypanel.host';

type TelaAtual = 'HOJE' | 'ROTINA' | 'PLANEJAMENTO' | 'ESTATISTICAS';

// --- NOVA PALETA LIGHT MODE (Alta legibilidade) ---
const CATEGORY_STYLES: Record<string, { color: string, bg: string, border: string }> = {
  'Saúde': { color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200' },
  'Trabalho': { color: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-200' },
  'Estudo': { color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-200' },
  'Espírito': { color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-200' },
  'Cuidados': { color: 'text-pink-700', bg: 'bg-pink-100', border: 'border-pink-200' },
  'Mente': { color: 'text-cyan-700', bg: 'bg-cyan-100', border: 'border-cyan-200' },
  'Outros': { color: 'text-slate-700', bg: 'bg-slate-200', border: 'border-slate-300' }
};

// --- COMPONENTE DE NAVEGAÇÃO (Clean & Branca) ---
interface NavBtnProps {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType; 
  label: string;
}

const NavBtn = ({ active, onClick, icon: Icon, label }: NavBtnProps) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 p-2 transition-all duration-300 relative ${
      active ? 'text-blue-900 -translate-y-1' : 'text-slate-400 hover:text-slate-600'
    }`}
  >
    {active && (
      <div className="absolute -top-1 w-6 h-1 bg-lime-400 rounded-full"></div>
    )}
    <Icon size={24} strokeWidth={active ? 2.5 : 2} />
    <span className={`text-[10px] font-bold tracking-wide ${active ? 'opacity-100' : 'opacity-80'}`}>{label}</span>
  </button>
);

const BottomNav = ({ tela, setTela }: { tela: TelaAtual, setTela: (t: TelaAtual) => void }) => (
  <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 pb-safe pt-3 px-6 flex justify-between items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
    <NavBtn active={tela === 'HOJE'} onClick={() => setTela('HOJE')} icon={LayoutDashboard} label="Hoje" />
    <NavBtn active={tela === 'ROTINA'} onClick={() => setTela('ROTINA')} icon={ListChecks} label="Criar" />
    <NavBtn active={tela === 'PLANEJAMENTO'} onClick={() => setTela('PLANEJAMENTO')} icon={Calendar} label="Planejar" />
    <NavBtn active={tela === 'ESTATISTICAS'} onClick={() => setTela('ESTATISTICAS')} icon={BarChart3} label="Evolução" />
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

  const pularParaDiaDaSemana = (targetDiaCode: string) => {
    const mapDias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const targetIndex = mapDias.indexOf(targetDiaCode);
    const currentIndex = dataVisualizacao.getDay();
    const diff = targetIndex - currentIndex;
    mudarDia(diff);
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

  const getIconeCategoria = (cat: string) => {
    switch(cat) {
      case 'Saúde': return <Heart size={16} strokeWidth={2.5} />;
      case 'Trabalho': return <Briefcase size={16} strokeWidth={2.5} />;
      case 'Estudo': return <Book size={16} strokeWidth={2.5} />;
      case 'Espírito': return <Zap size={16} strokeWidth={2.5} />;
      case 'Cuidados': return <Droplets size={16} strokeWidth={2.5} />;
      case 'Mente': return <Brain size={16} strokeWidth={2.5} />;
      default: return <Activity size={16} strokeWidth={2.5} />;
    }
  };

  const getStyleCategoria = (cat: string) => CATEGORY_STYLES[cat] || CATEGORY_STYLES['Outros'];

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-900" size={40}/></div>;

  return (
    <div className="font-sans antialiased selection:bg-lime-300/50">
      <main className="p-5 pb-32 max-w-md mx-auto min-h-screen flex flex-col">

        {/* --- TELA: HOJE (Painel Estilo ClickUp) --- */}
        {tela === 'HOJE' && (
          <div className="animate-in fade-in zoom-in duration-500 space-y-6">
            <header className="pt-6 flex flex-col gap-5">
              <div className="flex justify-between items-center bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
                <button onClick={() => mudarDia(-1)} className="p-2 bg-slate-50 rounded-xl hover:bg-slate-100 transition active:scale-95 text-slate-500">
                  <ChevronLeft size={20} />
                </button>
                <div className="flex flex-col items-center cursor-pointer" onClick={irParaHoje}>
                  <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                    {diasDisplay[diaDaSemanaAtual]}
                  </p>
                  <h2 className="text-lg font-extrabold text-blue-900 flex items-center gap-2">
                    {getLabelData()} 
                    {getLabelData() !== 'Hoje' && <span className="text-[9px] bg-blue-100 px-2 py-0.5 rounded-full text-blue-800">Voltar</span>}
                  </h2>
                </div>
                <button onClick={() => mudarDia(1)} className="p-2 bg-slate-50 rounded-xl hover:bg-slate-100 transition active:scale-95 text-slate-500">
                  <ChevronRight size={20} />
                </button>
              </div>

              <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  Sua evolução <br/><span className="highlight-green mt-1">impulsionada</span> hoje.
                </h1>
              </div>
            </header>

            {loading ? (
              <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-900"/></div>
            ) : (
              <>
                {/* Progress Card Moderno */}
                <div className="glass p-6 rounded-[2rem] relative overflow-hidden group">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-lime-400/20 rounded-full blur-3xl"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <span className="text-slate-500 font-semibold text-xs uppercase tracking-wider">Performance</span>
                        <div className="text-3xl font-black text-blue-900 leading-none mt-1">{progresso}%</div>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-2xl text-blue-900">
                        <Activity size={24} strokeWidth={2.5}/>
                      </div>
                    </div>
                    
                    <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 shadow-inner">
                      <div 
                        className="h-full bg-lime-400 transition-all duration-1000 ease-out relative"
                        style={{ width: `${progresso}%` }}
                      >
                         {/* Efeito de brilho interno na barra */}
                         <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/30 to-transparent"></div>
                      </div>
                    </div>
                    {progresso === 100 && tarefasDoDia.length > 0 && (
                      <div className="mt-4 flex justify-center">
                        <span className="text-xs font-bold text-blue-900 bg-lime-300 px-4 py-1.5 rounded-full shadow-sm">
                          ✨ Todas as metas batidas!
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lista Estilo Trello/Notion */}
                <div className="space-y-3 mt-4">
                  <div className="flex justify-between items-center px-1">
                    <h2 className="text-slate-900 text-sm font-bold flex items-center gap-2">
                      Checklist <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full">{concluidasValidas.length}/{tarefasDoDia.length}</span>
                    </h2>
                  </div>
                  
                  {tarefasDoDia.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-[2rem] bg-white flex flex-col items-center">
                      <div className="bg-slate-50 p-4 rounded-full mb-3 text-slate-400">
                        <Smile size={32} />
                      </div>
                      <p className="text-slate-700 font-bold">Tudo limpo por aqui</p>
                      <p className="text-xs text-slate-500 mb-4 max-w-[200px] mt-1">Nenhuma tarefa no planejamento.</p>
                      {getLabelData() === 'Hoje' && (
                        <button onClick={() => setTela('PLANEJAMENTO')} className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-md shadow-blue-900/20">
                          Começar a planejar
                        </button>
                      )}
                    </div>
                  ) : (
                    tarefasDoDia.map(h => {
                      const feita = concluidasValidas.includes(h.id);
                      const style = getStyleCategoria(h.categoria);
                      return (
                        <div key={h.id} onClick={() => toggleConclusao(h.id)}
                          className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-200 border shadow-sm ${
                            feita 
                              ? 'bg-slate-50 border-slate-200 opacity-60' 
                              : `bg-white border-slate-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5`
                          }`}
                        >
                          <div className={`transition-all duration-300 ${feita ? 'text-lime-500 scale-110' : 'text-slate-300 group-hover:text-blue-400'}`}>
                            {/* Checkbox mais limpo e claro */}
                            {feita ? <CheckCircle2 size={28} className="fill-lime-100" /> : <Circle size={28} strokeWidth={1.5} />}
                          </div>
                          
                          <div className="flex-1">
                            <p className={`font-bold text-[15px] transition-all ${feita ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                              {h.nome}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 px-2 py-0.5 rounded-md ${style.bg} ${style.color}`}>
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

        {/* --- TELA: ROTINA (CRIAR) --- */}
        {tela === 'ROTINA' && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-6">
            <header className="pt-8">
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Nova <span className="highlight-green">Atividade</span>
              </h1>
              <p className="text-slate-500 text-sm mt-2">Alimente sua biblioteca de hábitos.</p>
            </header>

            <form onSubmit={adicionarHabito} className="glass p-5 rounded-[2rem] space-y-5">
              <div>
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1 mb-2 block">Nome da Tarefa</label>
                 <div className="flex gap-2">
                   <input 
                     type="text" value={novoHabito} onChange={e => setNovoHabito(e.target.value)}
                     placeholder="Ex: Ler 10 páginas..." 
                     className="flex-1 bg-slate-50 text-slate-900 font-medium rounded-xl px-4 py-3 outline-none border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all placeholder:text-slate-400"
                   />
                   <button type="submit" className="bg-lime-400 hover:bg-lime-500 text-blue-900 p-3 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center">
                     <Plus size={24} strokeWidth={3} />
                   </button>
                 </div>
              </div>
              
              <div>
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1 mb-2 block">Categoria</label>
                 <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                   {Object.keys(CATEGORY_STYLES).filter(c => c !== 'Outros').map(cat => {
                     const style = getStyleCategoria(cat);
                     const isSelected = categoria === cat;
                     return (
                       <button key={cat} type="button" onClick={() => setCategoria(cat as HabitoBase['categoria'])}
                         className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap flex items-center gap-2 ${
                           isSelected 
                             ? `${style.bg} border-transparent ${style.color} ring-2 ring-offset-2 ring-offset-white ring-${style.color.split('-')[1]}-500 shadow-sm` 
                             : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                         }`}
                       >
                         {getIconeCategoria(cat)} {cat}
                       </button>
                     );
                   })}
                 </div>
              </div>
            </form>

            <div className="space-y-3 mt-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase ml-1 flex items-center gap-2">
                <Book size={16} className="text-blue-900"/> Base de Dados
              </h3>
              {rotinaBase.length === 0 && <p className="text-sm text-slate-500 text-center py-10 bg-white rounded-3xl border border-slate-200">Sua biblioteca está vazia.</p>}
              {rotinaBase.map(h => {
                const style = getStyleCategoria(h.categoria);
                return (
                  <div key={h.id} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition group">
                    <div className="flex items-center gap-4">
                       <div className={`p-2.5 rounded-xl ${style.bg} ${style.color}`}>
                         {getIconeCategoria(h.categoria)}
                       </div>
                       <span className="font-bold text-slate-800 text-sm">{h.nome}</span>
                    </div>
                    <button onClick={() => removerHabito(h.id)} className="text-slate-300 hover:text-rose-500 p-2 transition opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
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
                 <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Organização</h1>
                 <p className="text-slate-500 text-sm mt-1">Monte a estrutura da sua semana.</p>
               </div>
            </header>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {(Object.keys(diasDisplay) as DiaSemana[]).map(dia => {
                const isActive = diaSelecionado === dia;
                return (
                  <button key={dia} onClick={() => setDiaSelecionado(dia)}
                    className={`px-5 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap border ${
                      isActive 
                        ? 'bg-blue-900 border-blue-900 text-white shadow-lg shadow-blue-900/20' 
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {diasDisplay[dia]}
                  </button>
                );
              })}
            </div>

            <div className="glass p-2 rounded-[2rem] min-h-[400px] border border-slate-200">
              <div className="flex justify-between items-center px-4 pt-3 pb-2 border-b border-slate-100 mb-2">
                 <span className="font-bold text-slate-800">Para {diasDisplay[diaSelecionado]}</span>
                 {diaSelecionado === 'seg' && (
                   <button onClick={replicarParaSemana} className="text-[10px] font-bold text-blue-900 bg-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition flex items-center gap-1">
                     Copiar p/ Todos <ChevronRight size={12}/>
                   </button>
                 )}
              </div>
              
              <div className="space-y-1 p-2">
                {rotinaBase.length === 0 && (
                  <div className="text-center py-20">
                     <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                       <ListChecks size={24} className="text-slate-400" />
                     </div>
                     <p className="text-sm text-slate-500 font-medium">Vá em "Criar" para adicionar tarefas.</p>
                  </div>
                )}
                {rotinaBase.map(h => {
                  const selecionado = planoSemanal[diaSelecionado].includes(h.id);
                  const style = getStyleCategoria(h.categoria);
                  return (
                    <div key={h.id} onClick={() => toggleHabitoNoDia(h.id)}
                      className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border ${
                        selecionado ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white hover:bg-slate-50 border-transparent hover:border-slate-200'
                      }`}
                    >
                      <div className={`transition-all ${selecionado ? 'text-blue-600 scale-110' : 'text-slate-300'}`}>
                        {selecionado ? <CheckCircle2 size={24} className="fill-blue-100" /> : <Circle size={24} />}
                      </div>
                      <span className={`font-bold text-[15px] ${selecionado ? 'text-blue-900' : 'text-slate-600'}`}>{h.nome}</span>
                      {selecionado && <div className={`ml-auto px-2 py-1 rounded text-[9px] font-bold uppercase ${style.bg} ${style.color}`}>{h.categoria}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* --- TELA: ESTATISTICAS (DASHBOARD LIGHT MODE) --- */}
        {tela === 'ESTATISTICAS' && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-6">
             <header className="pt-8">
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Painel de <span className="highlight-green">Dados</span>
              </h1>
              
              <div className="flex justify-between items-center bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mt-5">
                <button onClick={() => mudarDia(-1)} className="p-2 bg-slate-50 rounded-xl hover:bg-slate-100 transition text-slate-500">
                  <ChevronLeft size={20} />
                </button>
                <div className="flex flex-col items-center cursor-pointer" onClick={irParaHoje}>
                  <p className="text-blue-800 font-bold text-[10px] uppercase tracking-widest">
                    {diasDisplay[diaDaSemanaAtual]}
                  </p>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    {getLabelData()} 
                  </h2>
                </div>
                <button onClick={() => mudarDia(1)} className="p-2 bg-slate-50 rounded-xl hover:bg-slate-100 transition text-slate-500">
                  <ChevronRight size={20} />
                </button>
              </div>
            </header>

            {loading ? (
              <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-900"/></div>
            ) : (
              <>
                {/* KPIs Modernos */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between h-36">
                      <div className="p-2.5 bg-lime-100 rounded-xl w-fit text-lime-700"><Percent size={20} strokeWidth={2.5} /></div>
                      <div>
                        <span className="text-3xl font-black text-slate-900">{progresso}%</span>
                        <p className="text-xs text-slate-500 font-bold mt-1">Conclusão</p>
                      </div>
                   </div>
                   
                   <div className="bg-blue-900 p-5 rounded-[2rem] shadow-md flex flex-col justify-between h-36 relative overflow-hidden">
                      <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-800 rounded-full blur-2xl"></div>
                      <div className="p-2.5 bg-blue-800/50 rounded-xl w-fit text-lime-400 relative z-10"><Target size={20} strokeWidth={2.5} /></div>
                      <div className="relative z-10">
                        <span className="text-xl font-bold text-white truncate block">
                          {Object.entries(statsPorCategoria).sort((a,b) => b[1].done - a[1].done)[0]?.[0] || "Nenhum"}
                        </span>
                        <p className="text-xs text-blue-200 font-bold mt-1">Foco Principal</p>
                      </div>
                   </div>
                </div>

                {/* GRÁFICO (White Card) */}
                <div className="glass p-6 rounded-[2rem]">
                   <div className="flex justify-between items-center mb-6">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Calendar size={18} className="text-blue-600"/> Carga Semanal
                      </h3>
                   </div>
                   
                   <div className="flex items-end justify-between h-40 gap-3">
                      {(Object.keys(diasDisplay) as DiaSemana[]).map(dia => {
                         const qtd = planoSemanal[dia].length;
                         const altura = Math.min((qtd / 10) * 100, 100) || 5; // Mínimo de 5% para a barra aparecer
                         const isSelected = dia === diaDaSemanaAtual;
                         
                         return (
                           <button 
                              key={dia} 
                              onClick={() => pularParaDiaDaSemana(dia)}
                              className="flex flex-col items-center gap-2 flex-1 group focus:outline-none"
                           >
                              <div className="w-full relative flex items-end justify-center bg-slate-100 rounded-xl h-full overflow-hidden">
                                 <div 
                                    className={`w-full rounded-xl transition-all duration-500 ease-out ${isSelected ? 'bg-blue-900 shadow-md' : 'bg-slate-300 group-hover:bg-slate-400'}`} 
                                    style={{ height: `${altura}%` }}
                                 ></div>
                              </div>
                              <span className={`text-[10px] font-bold uppercase transition-colors ${isSelected ? 'text-blue-900' : 'text-slate-400'}`}>
                                 {dia.substring(0, 3)}
                              </span>
                           </button>
                         )
                      })}
                   </div>
                </div>

                {/* DETALHAMENTO */}
                <div className="space-y-3 pb-4">
                  <h3 className="text-sm font-bold text-slate-900 ml-1">Análise por Categoria</h3>
                  {Object.keys(statsPorCategoria).length === 0 && <p className="text-slate-500 text-sm text-center py-6 bg-white rounded-3xl border border-slate-200">Sem dados para exibir.</p>}
                  
                  {Object.entries(statsPorCategoria).map(([cat, stats]) => {
                    const pct = Math.round((stats.done / stats.total) * 100);
                    const style = getStyleCategoria(cat);
                    return (
                      <div key={cat} className="bg-white p-4 rounded-2xl flex items-center gap-4 border border-slate-200 shadow-sm">
                        <div className={`p-3 rounded-xl ${style.bg} ${style.color}`}>
                          {getIconeCategoria(cat)}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-end mb-2">
                            <span className="font-bold text-[15px] text-slate-800">{cat}</span>
                            <div className="flex items-center gap-2">
                               <span className="text-[10px] text-slate-400 font-bold uppercase">{stats.done}/{stats.total}</span>
                               <span className={`text-sm font-black ${pct === 100 ? 'text-lime-600' : 'text-blue-900'}`}>{pct}%</span>
                            </div>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-1000 ${pct === 100 ? 'bg-lime-400' : 'bg-blue-900'}`} 
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

      </main>
      <BottomNav tela={tela} setTela={setTela} />
    </div>
  );
}

export default App;