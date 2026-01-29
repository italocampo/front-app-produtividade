import { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Activity, Book, Briefcase, Heart, Zap, 
  CheckSquare, Square, Smile, 
  Brain, BarChart3, Calendar, Droplets, Loader2, 
  LayoutDashboard, ListChecks
} from 'lucide-react';
import type { HabitoBase, PlanoSemanal, DiaSemana } from './types';

// --- CONFIGURAÇÃO DA API ---
const API_URL = 'https://backend-apis-api-app-produtividade.t8sftf.easypanel.host';

// --- TIPOS INTERNOS ---
type TelaAtual = 'HOJE' | 'ROTINA' | 'PLANEJAMENTO' | 'ESTATISTICAS';

// --- COMPONENTE DE NAVEGAÇÃO (Agora fora do App!) ---
interface BottomNavProps {
  tela: TelaAtual;
  setTela: (t: TelaAtual) => void;
}

const BottomNav = ({ tela, setTela }: BottomNavProps) => (
  <div className="fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-800 pb-safe pt-2 px-6 flex justify-between items-center z-50 shadow-2xl">
    <button 
      onClick={() => setTela('HOJE')}
      className={`flex flex-col items-center gap-1 p-2 transition-all ${tela === 'HOJE' ? 'text-blue-400 -translate-y-1' : 'text-slate-500'}`}
    >
      <LayoutDashboard size={24} strokeWidth={tela === 'HOJE' ? 2.5 : 2} />
      <span className="text-[10px] font-bold">Hoje</span>
    </button>

    <button 
      onClick={() => setTela('ROTINA')}
      className={`flex flex-col items-center gap-1 p-2 transition-all ${tela === 'ROTINA' ? 'text-blue-400 -translate-y-1' : 'text-slate-500'}`}
    >
      <ListChecks size={24} strokeWidth={tela === 'ROTINA' ? 2.5 : 2} />
      <span className="text-[10px] font-bold">Hábitos</span>
    </button>

    <button 
      onClick={() => setTela('PLANEJAMENTO')}
      className={`flex flex-col items-center gap-1 p-2 transition-all ${tela === 'PLANEJAMENTO' ? 'text-blue-400 -translate-y-1' : 'text-slate-500'}`}
    >
      <Calendar size={24} strokeWidth={tela === 'PLANEJAMENTO' ? 2.5 : 2} />
      <span className="text-[10px] font-bold">Planejar</span>
    </button>

    <button 
      onClick={() => setTela('ESTATISTICAS')}
      className={`flex flex-col items-center gap-1 p-2 transition-all ${tela === 'ESTATISTICAS' ? 'text-blue-400 -translate-y-1' : 'text-slate-500'}`}
    >
      <BarChart3 size={24} strokeWidth={tela === 'ESTATISTICAS' ? 2.5 : 2} />
      <span className="text-[10px] font-bold">Dados</span>
    </button>
  </div>
);

function App() {
  // --- FUNÇÕES AUXILIARES ---
  const getDiaReal = (): DiaSemana => {
    const map: DiaSemana[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    return map[new Date().getDay()];
  };

  const getDataFormatada = () => {
    return new Date().toISOString().split('T')[0];
  };

  // --- ESTADOS GLOBAIS ---
  const [loading, setLoading] = useState(true);
  
  const [tela, setTela] = useState<TelaAtual>(() => {
    const salvo = localStorage.getItem('app_tela_atual');
    return (salvo as TelaAtual) || 'HOJE';
  });

  useEffect(() => {
    localStorage.setItem('app_tela_atual', tela);
  }, [tela]);
  
  const [rotinaBase, setRotinaBase] = useState<HabitoBase[]>([]);
  const [planoSemanal, setPlanoSemanal] = useState<PlanoSemanal>({ 
    seg: [], ter: [], qua: [], qui: [], sex: [], sab: [], dom: [] 
  });
  const [concluidasHoje, setConcluidasHoje] = useState<string[]>([]);

  // --- CARREGAR DADOS ---
  useEffect(() => {
    const dataHoje = getDataFormatada();
    
    fetch(`${API_URL}/init?data=${dataHoje}`)
      .then(res => res.json())
      .then(data => {
        setRotinaBase(data.rotinaBase);
        setPlanoSemanal(data.planoSemanal);
        setConcluidasHoje(data.concluidasHoje);
        setLoading(false);
        // Lógica simplificada: Se não tem nada cadastrado, sugere ir para rotina
        if (data.rotinaBase.length === 0) {
           // Opcional: setTela('ROTINA');
        }
      })
      .catch(erro => {
        console.error("Erro API:", erro);
        setLoading(false);
      });
  }, []);

  // --- LÓGICA DE ROTINA ---
  const [novoHabito, setNovoHabito] = useState('');
  const [categoria, setCategoria] = useState<HabitoBase['categoria']>('Saúde');

  async function adicionarHabito(e: React.FormEvent) {
    e.preventDefault();
    if (!novoHabito.trim()) return;

    const tempId = crypto.randomUUID();
    const novoLocal: HabitoBase = { id: tempId, nome: novoHabito, categoria };
    setRotinaBase([...rotinaBase, novoLocal]);
    setNovoHabito('');

    try {
      const res = await fetch(`${API_URL}/habitos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novoHabito, categoria })
      });
      const habitoReal = await res.json();
      setRotinaBase(prev => prev.map(h => h.id === tempId ? habitoReal : h));
    } catch  {
      alert("Erro ao salvar.");
    }
  }

  async function removerHabito(id: string) {
    if(!confirm('Excluir este hábito permanentemente?')) return;
    setRotinaBase(rotinaBase.filter(h => h.id !== id));
    await fetch(`${API_URL}/habitos/${id}`, { method: 'DELETE' });
  }

  // --- LÓGICA DE PLANEJAMENTO ---
  const [diaSelecionado, setDiaSelecionado] = useState<DiaSemana>(getDiaReal());

  const diasDisplay: Record<DiaSemana, string> = {
    seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', 
    sex: 'Sexta', sab: 'Sábado', dom: 'Domingo'
  };

  async function toggleHabitoNoDia(habitoId: string) {
    const habitosDoDia = planoSemanal[diaSelecionado];
    const novos = habitosDoDia.includes(habitoId) 
      ? habitosDoDia.filter(id => id !== habitoId) 
      : [...habitosDoDia, habitoId];
    
    setPlanoSemanal({ ...planoSemanal, [diaSelecionado]: novos });

    await fetch(`${API_URL}/plano/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitoId, diaSemana: diaSelecionado })
    });
  }

  async function replicarParaSemana() {
    if (!confirm('Copiar a rotina de Segunda para toda a semana?')) return;
    const modelo = planoSemanal['seg'];
    setPlanoSemanal({
      seg: modelo, ter: modelo, qua: modelo, qui: modelo, sex: modelo, sab: modelo, dom: modelo
    });
    await fetch(`${API_URL}/plano/replicar`, { method: 'POST' });
  }

  // --- LÓGICA DO DASHBOARD ---
  const diaRealCodigo = getDiaReal();
  const tarefasDeHoje = rotinaBase.filter(habito => 
    planoSemanal[diaRealCodigo]?.includes(habito.id)
  );

  async function toggleConclusaoHoje(id: string) {
    if (concluidasHoje.includes(id)) {
      setConcluidasHoje(concluidasHoje.filter(c => c !== id));
    } else {
      setConcluidasHoje([...concluidasHoje, id]);
    }
    await fetch(`${API_URL}/execucao/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitoId: id, data: getDataFormatada() })
    });
  }

  const progresso = tarefasDeHoje.length > 0 
    ? Math.round((concluidasHoje.length / tarefasDeHoje.length) * 100) 
    : 0;

  const getIconeCategoria = (cat: string) => {
    switch(cat) {
      case 'Saúde': return <Heart size={16} className="text-red-400" />;
      case 'Trabalho': return <Briefcase size={16} className="text-blue-400" />;
      case 'Estudo': return <Book size={16} className="text-yellow-400" />;
      case 'Espírito': return <Zap size={16} className="text-purple-400" />;
      case 'Cuidados': return <Droplets size={16} className="text-cyan-400" />;
      case 'Mente': return <Brain size={16} className="text-teal-400" />;
      default: return <Activity size={16} className="text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      
      {/* Container Principal com padding no fundo para a NavBar não cobrir o conteúdo */}
      <main className="p-4 pb-32 max-w-md mx-auto min-h-screen">

        {/* --- TELA: HOJE (HOME) --- */}
        {tela === 'HOJE' && (
          <div className="animate-in fade-in zoom-in duration-300 space-y-6">
            <header className="pt-6">
              <p className="text-blue-400 font-bold text-xs uppercase tracking-wider mb-1">Visão Geral</p>
              <h1 className="text-3xl font-bold text-white capitalize">{diasDisplay[diaRealCodigo]}</h1>
            </header>

            {/* Barra de Progresso */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl relative overflow-hidden">
              <div className="flex justify-between text-sm font-bold mb-3 relative z-10">
                <span className="text-slate-300 flex items-center gap-2">Performance</span>
                <span className="text-green-400 text-lg">{progresso}%</span>
              </div>
              <div className="h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative z-10">
                <div 
                  className={`h-full transition-all duration-1000 ease-out ${progresso === 100 ? 'bg-green-400 shadow-[0_0_15px_rgba(74,222,128,0.6)]' : 'bg-blue-600'}`}
                  style={{ width: `${progresso}%` }}
                />
              </div>
              {progresso === 100 && <p className="text-center text-xs text-green-400 mt-4 font-bold animate-pulse uppercase tracking-widest">🔥 Meta Batida! 🔥</p>}
            </div>

            {/* Lista de Tarefas */}
            <div className="space-y-3">
              <div className="flex justify-between items-end px-1 mt-6">
                <h2 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Sua Missão Hoje</h2>
                <span className="text-slate-600 text-xs">{concluidasHoje.length}/{tarefasDeHoje.length} feitas</span>
              </div>
              
              {tarefasDeHoje.length === 0 ? (
                <div className="text-center py-12 opacity-50 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
                  <Smile size={48} className="mx-auto mb-4 text-slate-600" />
                  <p className="text-slate-400 font-medium">Dia livre!</p>
                  <p className="text-xs text-slate-600 mb-4">Adicione algo no menu "Planejar".</p>
                </div>
              ) : (
                tarefasDeHoje.map(h => {
                  const feita = concluidasHoje.includes(h.id);
                  return (
                    <div key={h.id} onClick={() => toggleConclusaoHoje(h.id)}
                      className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-300 group ${
                        feita 
                          ? 'bg-slate-900/40 border-slate-800/50 opacity-50' 
                          : 'bg-slate-800 border-slate-700 shadow-lg shadow-black/20 hover:bg-slate-750 hover:-translate-y-1 hover:border-slate-600'
                      }`}
                    >
                      <div className={`p-3 rounded-xl transition-colors duration-300 ${
                        feita ? 'bg-green-500/10 text-green-500' : 'bg-slate-900 text-slate-500 shadow-inner'
                      }`}>
                        {feita ? <CheckSquare size={22} /> : <Square size={22} />}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium text-lg transition-all ${feita ? 'line-through text-slate-500' : 'text-white'}`}>{h.nome}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {getIconeCategoria(h.categoria)}
                          <span className="text-xs text-slate-400 font-medium">{h.categoria}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* --- TELA: ROTINA (LISTA DE HÁBITOS) --- */}
        {tela === 'ROTINA' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
            <header className="pt-6">
              <h1 className="text-2xl font-bold text-white">Criar Hábitos 🏗️</h1>
              <p className="text-slate-400 text-sm">O que você quer fazer regularmente?</p>
            </header>

            <form onSubmit={adicionarHabito} className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
              <input 
                type="text" value={novoHabito} onChange={e => setNovoHabito(e.target.value)}
                placeholder="Ex: Ler 10 páginas..." 
                className="w-full bg-slate-800 text-white rounded-lg px-4 py-3 outline-none border border-slate-700 focus:border-blue-500 transition-colors"
              />
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {['Saúde', 'Trabalho', 'Estudo', 'Espírito', 'Cuidados', 'Mente'].map(cat => (
                  <button key={cat} type="button" onClick={() => setCategoria(cat as HabitoBase['categoria'])}
                    className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap transition-colors ${
                      categoria === cat ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition shadow-lg shadow-blue-900/20">
                <Plus size={20} /> Salvar Hábito
              </button>
            </form>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase ml-1">Biblioteca de Hábitos</h3>
              {rotinaBase.length === 0 && <p className="text-slate-600 text-sm text-center py-8 border border-dashed border-slate-800 rounded-xl">Nenhum hábito criado.</p>}
              {rotinaBase.map(h => (
                <div key={h.id} className="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-800 hover:border-slate-700 transition">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-slate-800 rounded-lg">{getIconeCategoria(h.categoria)}</div>
                     <span className="font-medium text-slate-200">{h.nome}</span>
                  </div>
                  <button onClick={() => removerHabito(h.id)} className="text-slate-600 hover:text-red-400 p-2 transition"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TELA: PLANEJAMENTO --- */}
        {tela === 'PLANEJAMENTO' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
            <header className="pt-6">
               <h1 className="text-2xl font-bold text-white">Planejamento 📅</h1>
               <p className="text-slate-400 text-sm">Defina sua semana.</p>
            </header>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {(Object.keys(diasDisplay) as DiaSemana[]).map(dia => (
                <button key={dia} onClick={() => setDiaSelecionado(dia)}
                  className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
                    diaSelecionado === dia ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {diasDisplay[dia]}
                </button>
              ))}
            </div>

            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 min-h-[400px]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-slate-200">Para {diasDisplay[diaSelecionado]}:</h2>
                {diaSelecionado === 'seg' && <button onClick={replicarParaSemana} className="text-xs text-blue-400 bg-blue-900/20 px-2 py-1 rounded hover:bg-blue-900/40 transition">Copiar p/ semana toda</button>}
              </div>
              
              <div className="space-y-2">
                {rotinaBase.length === 0 && <p className="text-sm text-slate-500 text-center py-10">Crie hábitos na aba "Hábitos" primeiro.</p>}
                {rotinaBase.map(h => {
                  const selecionado = planoSemanal[diaSelecionado].includes(h.id);
                  return (
                    <div key={h.id} onClick={() => toggleHabitoNoDia(h.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selecionado ? 'bg-blue-900/20 border-blue-500/50' : 'bg-slate-800 border-slate-700 opacity-60 hover:opacity-100'
                      }`}
                    >
                      {selecionado ? <CheckSquare className="text-blue-400" /> : <Square className="text-slate-500" />}
                      <span className={selecionado ? 'text-white' : 'text-slate-400'}>{h.nome}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* --- TELA: ESTATÍSTICAS --- */}
        {tela === 'ESTATISTICAS' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
             <header className="pt-6">
              <h1 className="text-2xl font-bold text-white">Estatísticas 📊</h1>
              <p className="text-slate-400 text-sm">Seu progresso na semana.</p>
            </header>

            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg">
               <h3 className="text-sm font-bold text-slate-400 mb-6 uppercase tracking-wider">Carga Semanal</h3>
               <div className="flex items-end justify-between h-40 gap-2">
                  {(Object.keys(diasDisplay) as DiaSemana[]).map(dia => {
                     const qtd = planoSemanal[dia].length;
                     const altura = qtd > 0 ? (qtd / 10) * 100 : 5;
                     const isHoje = dia === diaRealCodigo;
                     
                     return (
                       <div key={dia} className="flex flex-col items-center gap-3 flex-1 group">
                          <div className="w-full relative flex items-end justify-center">
                             <div 
                                className={`w-full rounded-t-md transition-all duration-500 ${isHoje ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-slate-700'}`} 
                                style={{ height: `${Math.min(altura * 1.5, 100)}px` }}
                             ></div>
                             {qtd > 0 && <div className="absolute -top-6 text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">{qtd}</div>}
                          </div>
                          <span className={`text-[10px] font-bold uppercase ${isHoje ? 'text-blue-400' : 'text-slate-600'}`}>
                             {dia.substring(0, 1)}
                          </span>
                       </div>
                     )
                  })}
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg">
                  <p className="text-slate-500 text-xs font-bold uppercase mb-2">Total Hoje</p>
                  <p className="text-4xl font-bold text-white">{tarefasDeHoje.length}</p>
               </div>
               <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg">
                  <p className="text-slate-500 text-xs font-bold uppercase mb-2">Concluídas</p>
                  <p className="text-4xl font-bold text-green-400">{concluidasHoje.length}</p>
               </div>
            </div>
          </div>
        )}

      </main>

      {/* Renderiza a Navegação Inferior Fixa */}
      {/* Agora passamos as props corretamente! */}
      <BottomNav tela={tela} setTela={setTela} />

    </div>
  );
}

export default App;