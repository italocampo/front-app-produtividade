import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, CheckCircle, Circle, RefreshCw } from 'lucide-react';

// ✅ CONFIRA SE ESTE LINK É O DA SUA VPS (O mesmo que você testou e deu tela branca/metas)
const API_URL = 'https://bd-italocampos-backend-produtividade.t8sftf.easypanel.host';

interface Meta {
  id: number;
  titulo: string;
  categoria: string;
  concluida: boolean;
}

function App() {
  const [metas, setMetas] = useState<Meta[]>([]);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregarMetas();
  }, []);

  async function carregarMetas() {
    setLoading(true);
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const res = await axios.get(`${API_URL}/metas?data=${hoje}`);
      setMetas(res.data);
      setErro('');
    } catch (error) {
      console.error("Erro", error);
      setErro('Erro de conexão. Verifique se o backend está rodando.');
    } finally {
      setLoading(false);
    }
  }

  async function adicionarMeta(e: React.FormEvent) {
    e.preventDefault();
    if (!novoTitulo.trim()) return;

    // Optimistic Update (Atualiza na tela antes de confirmar no banco)
    const tempId = Date.now();
    const novaMetaTemp = { id: tempId, titulo: novoTitulo, categoria: 'Rotina', concluida: false };
    setMetas([...metas, novaMetaTemp]);
    setNovoTitulo('');

    try {
      const res = await axios.post(`${API_URL}/metas`, {
        titulo: novoTitulo,
        categoria: 'Rotina',
        data: new Date()
      });
      // Troca o ID temporário pelo real
      setMetas(prev => prev.map(m => m.id === tempId ? res.data : m));
    } catch {
      alert('Erro ao salvar.');
      carregarMetas();
    }
  }

  async function toggleMeta(id: number, estadoAtual: boolean) {
    const novasMetas = metas.map(m => m.id === id ? { ...m, concluida: !estadoAtual } : m);
    setMetas(novasMetas);
    await axios.patch(`${API_URL}/metas/${id}/toggle`, { concluida: !estadoAtual });
  }

  async function deletarMeta(id: number) {
    if (!confirm('Deletar meta?')) return;
    setMetas(metas.filter(m => m.id !== id));
    await axios.delete(`${API_URL}/metas/${id}`);
  }

  // Progresso
  const total = metas.length;
  const feitas = metas.filter(m => m.concluida).length;
  const progresso = total === 0 ? 0 : Math.round((feitas / total) * 100);

  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto bg-slate-900 text-white font-sans">
      <header className="p-6 pt-10 bg-slate-800 rounded-b-3xl shadow-lg border-b border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Metas do dia 🚀</h1>
            <p className="text-slate-400 text-sm">A persistência é o caminho do êxito.</p>
          </div>
          <button onClick={carregarMetas} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 transition">
            <RefreshCw size={18} className={loading ? "animate-spin text-green-400" : "text-white"} />
          </button>
        </div>
        
        {/* Barra de Progresso */}
        <div className="relative h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-700/50">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-600 to-emerald-400 transition-all duration-500" 
            style={{ width: `${progresso}%` }}
          />
        </div>
        <p className="text-right text-xs font-bold mt-2 text-green-400">{progresso}% CONCLUÍDO</p>
      </header>

      <main className="p-4 space-y-3 mt-2">
        {erro && <div className="p-3 bg-red-900/30 border border-red-800 rounded text-red-200 text-sm text-center">{erro}</div>}
        
        {loading && metas.length === 0 ? (
          <div className="text-center py-10 animate-pulse text-slate-500">Carregando...</div>
        ) : metas.map(meta => (
          <div key={meta.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${meta.concluida ? 'bg-slate-900/50 border-slate-800 opacity-60' : 'bg-slate-800 border-slate-700'}`}>
            <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => toggleMeta(meta.id, meta.concluida)}>
              {meta.concluida ? <CheckCircle className="text-green-500" /> : <Circle className="text-slate-500" />}
              <span className={meta.concluida ? 'line-through text-slate-500' : 'text-slate-100'}>{meta.titulo}</span>
            </div>
            <button onClick={() => deletarMeta(meta.id)} className="text-slate-600 hover:text-red-400 p-2"><Trash2 size={18} /></button>
          </div>
        ))}
      </main>

      <form onSubmit={adicionarMeta} className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/90 backdrop-blur border-t border-slate-800 flex gap-2 max-w-md mx-auto">
        <input 
          type="text" 
          value={novoTitulo}
          onChange={e => setNovoTitulo(e.target.value)}
          placeholder="Nova meta..." 
          className="flex-1 bg-slate-800 text-white rounded-lg px-4 py-3 outline-none border border-slate-700 focus:border-green-500"
        />
        <button type="submit" disabled={!novoTitulo} className="bg-green-600 text-white p-3 rounded-lg"><Plus /></button>
      </form>
    </div>
  );
}

export default App;