import { useState, useEffect } from 'react';
import { 
  Plus, Trash2, ArrowRight, Activity, Book, Briefcase, Heart, Zap, 
  CheckSquare, Square, LayoutDashboard, Smile, 
  Brain, ChevronLeft, BarChart3, Calendar, Droplets, Loader2 
} from 'lucide-react';
import type { HabitoBase, PlanoSemanal, DiaSemana } from './types';

// --- CONFIGURAÇÃO DA API ---
const API_URL = 'https://backend-apis-api-app-produtividade.t8sftf.easypanel.host';

// --- TIPOS INTERNOS ---
type TelaAtual = 'ROTINA' | 'PLANEJAMENTO' | 'HOJE' | 'ESTATISTICAS';

function App() {
  // --- FUNÇÕES AUXILIARES ---
  const getDiaReal = (): DiaSemana => {
    const map: DiaSemana[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    return map[new Date().getDay()];
  };

  const getDataFormatada = () => {
    return new Date().toISOString().split('T')[0]; // Retorna YYYY-MM-DD
  };

  // --- ESTADOS GLOBAIS ---
  const [loading, setLoading] = useState(true);
  const [tela, setTela] = useState<TelaAtual>('ROTINA');
  
  const [rotinaBase, setRotinaBase] = useState<HabitoBase[]>([]);
  const [planoSemanal, setPlanoSemanal] = useState<PlanoSemanal>({ 
    seg: [], ter: [], qua: [], qui: [], sex: [], sab: [], dom: [] 
  });
  const [concluidasHoje, setConcluidasHoje] = useState<string[]>([]);

  // --- 1. CARREGAR DADOS AO INICIAR ---
  useEffect(() => {
    const dataHoje = getDataFormatada();
    
    fetch(`${API_URL}/init?data=${dataHoje}`)
      .then(res => res.json())
      .then(data => {
        setRotinaBase(data.rotinaBase);
        setPlanoSemanal(data.planoSemanal);
        setConcluidasHoje(data.concluidasHoje);
        setLoading(false);
      })
      .catch(erro => {
        console.error("Erro ao conectar na API:", erro);
        alert("Erro ao conectar no servidor. Verifique sua internet.");
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
    } catch {
      alert("Erro ao salvar. Tente novamente.");
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
    const jaTem = habitosDoDia.includes(habitoId);
    const novos = jaTem ? habitosDoDia.filter(id => id !== habitoId) : [...habitosDoDia, habitoId];
    
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

  // --- LÓGICA DO DASHBOARD (HOJE) ---
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
        <p>Conectando ao servidor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 pb-24">
      
      {/* --- TELA 1: CADASTRO DE ROTINA --- */}
      {tela === 'ROTINA' && (
        <div className="max-w-md mx-auto space-y-6 animate-in fade-in">
          <header className="pt-8 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Rotina Base 🏗️</h1>
              <p className="text-slate-400 text-sm">Biblioteca de hábitos.</p>
            </div>
            <button onClick={() => setTela('HOJE')} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition">
               <ArrowRight />
            </button>
          </header>

          <form onSubmit={adicionarHabito} className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
            <input 
              type="text" value={novoHabito} onChange={e => setNovoHabito(e.target.value)}
              placeholder="Novo hábito..." 
              className="w-full bg-slate-800 text-white rounded-lg px-4 py-3 outline-none border border-slate-700 focus:border-blue-500"
            />
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {['Saúde', 'Trabalho', 'Estudo', 'Espírito', 'Cuidados', 'Mente', 'Outros'].map(cat => (
                <button key={cat} type="button" onClick={() => setCategoria(cat as HabitoBase['categoria'])}
                  className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${
                    categoria === cat ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <button type="submit" className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition">
              <Plus size={20} /> Criar Novo
            </button>
          </form>

          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase ml-1">Meus Hábitos Salvos</h3>
            {rotinaBase.length === 0 && <p className="text-slate-600 text-sm text-center py-4">Nenhum hábito cadastrado ainda.</p>}
            {rotinaBase.map(h => (
              <div key={h.id} className="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-slate-800 rounded-lg">{getIconeCategoria(h.categoria)}</div>
                   <span className="font-medium text-slate-200">{h.nome}</span>
                </div>
                <button onClick={() => removerHabito(h.id)} className="text-slate-600 hover:text-red-400 p-2 transition"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>

          <button onClick={() => setTela('PLANEJAMENTO')} className="fixed bottom-6 right-6 left-6 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition">
            Ir para Planejamento <ArrowRight size={20} />
          </button>
        </div>
      )}

      {/* --- TELA 2: PLANEJAMENTO --- */}
      {tela === 'PLANEJAMENTO' && (
        <div className="max-w-md mx-auto space-y-6 animate-in slide-in-from-right">
          <header className="pt-4 flex justify-between items-center">
             <div><h1 className="text-xl font-bold text-white">Planejamento 📅</h1><p className="text-slate-400 text-xs">Monte sua semana.</p></div>
             <button onClick={() => setTela('HOJE')} className="text-xs text-slate-500 underline hover:text-slate-300 transition">Voltar p/ Hoje</button>
          </header>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {(Object.keys(diasDisplay) as DiaSemana[]).map(dia => (
              <button key={dia} onClick={() => setDiaSelecionado(dia)}
                className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
                  diaSelecionado === dia ? 'bg-green-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                }`}
              >
                {diasDisplay[dia]}
              </button>
            ))}
          </div>

          <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 min-h-[400px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-slate-200">Para {diasDisplay[diaSelecionado]}:</h2>
              {diaSelecionado === 'seg' && <button onClick={replicarParaSemana} className="text-xs text-blue-400 underline hover:text-blue-300 transition">Copiar Seg p/ todos</button>}
            </div>
            
            <div className="space-y-2">
               <p className="text-xs text-slate-500 mb-2">Toque para adicionar/remover deste dia:</p>
              {rotinaBase.map(h => {
                const selecionado = planoSemanal[diaSelecionado].includes(h.id);
                return (
                  <div key={h.id} onClick={() => toggleHabitoNoDia(h.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selecionado ? 'bg-green-900/20 border-green-800' : 'bg-slate-800 border-slate-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {selecionado ? <CheckSquare className="text-green-500" /> : <Square className="text-slate-500" />}
                    <span className={selecionado ? 'text-white' : 'text-slate-400'}>{h.nome}</span>
                    <div className="ml-auto opacity-50">{getIconeCategoria(h.categoria)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={() => setTela('HOJE')} className="fixed bottom-6 right-6 left-6 bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition">
            <LayoutDashboard size={20} /> Salvar e Ver Hoje
          </button>
        </div>
      )}

      {/* --- TELA 3: DASHBOARD HOJE (PRINCIPAL) --- */}
      {tela === 'HOJE' && (
        <div className="max-w-md mx-auto space-y-6 animate-in zoom-in duration-300">
          
          {/* Header do Dia (Atualizado!) */}
          <header className="pt-6 flex justify-between items-center">
            <button onClick={() => setTela('ROTINA')} className="p-2 bg-slate-800 rounded-full text-white hover:bg-slate-700 transition flex items-center justify-center mr-4">
               <ChevronLeft size={24} />
            </button>
            <div className="flex-1">
              <p className="text-green-400 font-bold text-xs uppercase tracking-wider mb-1">Visão do Dia</p>
              <h1 className="text-3xl font-bold text-white capitalize">{diasDisplay[diaRealCodigo]}</h1>
            </div>
            <div className="flex gap-2">
               <button onClick={() => setTela('ESTATISTICAS')} className="p-3 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded-xl transition flex items-center justify-center">
                <BarChart3 size={20} />
              </button>
              <button onClick={() => setTela('PLANEJAMENTO')} className="p-3 bg-purple-600/20 text-purple-400 hover:bg-purple-600/40 rounded-xl transition flex items-center justify-center">
                <Calendar size={20} />
              </button>
            </div>
          </header>

          {/* Barra de Progresso */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-3xl border border-slate-700 shadow-xl">
            <div className="flex justify-between text-sm font-bold mb-3">
              <span className="text-slate-300 flex items-center gap-2"><Activity size={16}/> Performance</span>
              <span className="text-green-400">{progresso}%</span>
            </div>
            <div className="h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div 
                className={`h-full transition-all duration-700 ease-out ${progresso === 100 ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'bg-green-600'}`}
                style={{ width: `${progresso}%` }}
              />
            </div>
            {progresso === 100 && <p className="text-center text-xs text-green-400 mt-3 font-bold animate-pulse">META BATIDA! 🔥 PARABÉNS!</p>}
          </div>

          {/* Lista de Execução */}
          <div className="space-y-3 pb-20">
            <h2 className="text-slate-500 text-xs font-bold uppercase tracking-wider pl-1 mt-4">Sua Missão</h2>
            
            {tarefasDeHoje.length === 0 ? (
              <div className="text-center py-10 opacity-50 border-2 border-dashed border-slate-800 rounded-2xl">
                <Smile size={48} className="mx-auto mb-3 text-slate-600" />
                <p>Dia livre!</p>
                <button onClick={() => setTela('PLANEJAMENTO')} className="text-blue-400 text-sm mt-2 underline hover:text-blue-300 transition">Configurar Planejamento</button>
              </div>
            ) : (
              tarefasDeHoje.map(h => {
                const feita = concluidasHoje.includes(h.id);
                return (
                  <div key={h.id} onClick={() => toggleConclusaoHoje(h.id)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-300 ${
                      feita 
                        ? 'bg-slate-900/40 border-slate-800 opacity-40 translate-y-2' 
                        : 'bg-slate-800 border-slate-700 shadow-md hover:bg-slate-750 hover:-translate-y-1'
                    }`}
                  >
                    <div className={`p-3 rounded-xl transition-colors ${
                      feita ? 'bg-green-500/10 text-green-500' : 'bg-slate-900 text-slate-500 shadow-inner'
                    }`}>
                      {feita ? <CheckSquare size={20} /> : <Square size={20} />}
                    </div>
                    
                    <div className="flex-1">
                      <p className={`font-medium text-lg transition-all ${feita ? 'line-through text-slate-500' : 'text-white'}`}>
                        {h.nome}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        {getIconeCategoria(h.categoria)}
                        <span className="text-xs text-slate-400">{h.categoria}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* --- TELA 4: ESTATÍSTICAS --- */}
      {tela === 'ESTATISTICAS' && (
        <div className="max-w-md mx-auto space-y-6 animate-in slide-in-from-right">
           <header className="pt-6 flex items-center gap-4">
            <button onClick={() => setTela('HOJE')} className="p-2 bg-slate-800 rounded-full text-white hover:bg-slate-700 transition">
               <ChevronLeft />
            </button>
            <h1 className="text-xl font-bold text-white">Estatísticas 📊</h1>
          </header>

          {/* Gráfico de Carga Semanal */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
             <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase">Carga de Tarefas da Semana</h3>
             <div className="flex items-end justify-between h-40 gap-2">
                {(Object.keys(diasDisplay) as DiaSemana[]).map(dia => {
                   const qtd = planoSemanal[dia].length;
                   const altura = qtd > 0 ? (qtd / 10) * 100 : 5;
                   const isHoje = dia === diaRealCodigo;
                   
                   return (
                     <div key={dia} className="flex flex-col items-center gap-2 flex-1">
                        <div className="w-full relative group">
                           <div 
                              className={`w-full rounded-t-lg transition-all ${isHoje ? 'bg-green-500' : 'bg-slate-700'}`} 
                              style={{ height: `${Math.min(altura * 1.5, 100)}px` }}
                           ></div>
                           <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition">
                              {qtd}
                           </div>
                        </div>
                        <span className={`text-xs font-bold uppercase ${isHoje ? 'text-green-500' : 'text-slate-500'}`}>
                           {dia.substring(0, 1)}
                        </span>
                     </div>
                   )
                })}
             </div>
          </div>

          {/* Resumo */}
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                <p className="text-slate-500 text-xs font-bold uppercase">Total Hoje</p>
                <p className="text-3xl font-bold text-white mt-1">{tarefasDeHoje.length}</p>
             </div>
             <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                <p className="text-slate-500 text-xs font-bold uppercase">Concluídas</p>
                <p className="text-3xl font-bold text-green-400 mt-1">{concluidasHoje.length}</p>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;