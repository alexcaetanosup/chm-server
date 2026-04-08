import { Edit, Plus, Save, Search, Stethoscope, Trash2, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import styles from './Especialidades.module.css';

export const Especialidades: React.FC = () => {
    const [dados, setDados] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [busca, setBusca] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

    // Estados para o autocomplete da especialidade no modal
    const [nomeBusca, setNomeBusca] = useState('');
    const [sugestoes, setSugestoes] = useState<any[]>([]);
    const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
    const sugestaoRef = useRef<HTMLDivElement>(null);

    const [item, setItem] = useState({
        CDESPECIAL: null as number | null,
        DCESPECIAL: ''
    });

    // Função para carregar especialidades com filtro de busca (para a tabela)
    const carregar = async (termoBusca: string = '') => {
        setLoading(true);
        try {
            let url = 'http://localhost:4000/api/especialidades';
            if (termoBusca && termoBusca.trim() !== '') {
                url = `http://localhost:4000/api/especialidades?q=${encodeURIComponent(termoBusca)}`;
            }
            const res = await fetch(url);
            const data = await res.json();
            setDados(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Erro ao carregar:", error);
        } finally {
            setLoading(false);
        }
    };

    // Função para buscar especialidades por nome (para o autocomplete do modal)
    const buscarEspecialidadesPorNome = async (nome: string) => {
        if (!nome || nome.trim() === '') {
            setSugestoes([]);
            return;
        }

        try {
            const response = await fetch(`http://localhost:4000/api/especialidades?q=${encodeURIComponent(nome)}`);
            const data = await response.json();
            setSugestoes(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Erro ao buscar especialidades:', err);
            setSugestoes([]);
        }
    };

    // Carregar dados iniciais
    useEffect(() => {
        carregar();
    }, []);

    // Busca com debounce para a tabela principal
    useEffect(() => {
        const timer = setTimeout(() => {
            if (busca.trim() !== '') {
                carregar(busca);
            } else {
                carregar();
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [busca]);

    // Debounce para busca de especialidades no autocomplete
    useEffect(() => {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }

        const timer = setTimeout(() => {
            if (nomeBusca.trim() !== '') {
                buscarEspecialidadesPorNome(nomeBusca);
            } else {
                setSugestoes([]);
            }
        }, 300);

        setDebounceTimer(timer);

        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [nomeBusca]);

    // Fechar sugestões ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sugestaoRef.current && !sugestaoRef.current.contains(event.target as Node)) {
                setMostrarSugestoes(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Limpar autocomplete quando fechar o modal
    useEffect(() => {
        if (!isModalOpen) {
            setNomeBusca('');
            setSugestoes([]);
            setMostrarSugestoes(false);
        }
    }, [isModalOpen]);

    // Função para selecionar uma especialidade das sugestões
    const selecionarEspecialidade = (especialidade: any) => {
        setItem({
            CDESPECIAL: especialidade.CDESPECIAL,
            DCESPECIAL: especialidade.DCESPECIAL
        });
        setNomeBusca(especialidade.DCESPECIAL);
        setMostrarSugestoes(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Verifica se a especialidade já existe (para evitar duplicatas)
        const existe = dados.some(esp =>
            esp.DCESPECIAL?.toUpperCase() === nomeBusca.toUpperCase() &&
            esp.CDESPECIAL !== item.CDESPECIAL
        );

        if (existe) {
            alert("Esta especialidade já está cadastrada!");
            return;
        }

        const isUpdate = !!item.CDESPECIAL;
        const url = isUpdate
            ? `http://localhost:4000/api/especialidades/${item.CDESPECIAL}`
            : 'http://localhost:4000/api/especialidades';

        try {
            const res = await fetch(url, {
                method: isUpdate ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ DCESPECIAL: nomeBusca })
            });

            if (res.ok) {
                alert(isUpdate ? "Especialidade atualizada!" : "Especialidade cadastrada!");
                setIsModalOpen(false);
                setItem({ CDESPECIAL: null, DCESPECIAL: '' });
                setNomeBusca('');
                carregar(busca); // Recarrega mantendo o filtro
            } else {
                const erro = await res.json();
                alert("Erro: " + erro.error);
            }
        } catch (error) {
            alert("Erro ao gravar dados.");
        }
    };

    const excluir = async (id: number, nome: string) => {
        if (!window.confirm(`Tem certeza que deseja excluir a especialidade "${nome}"?`)) return;
        try {
            const res = await fetch(`http://localhost:4000/api/especialidades/${id}`, { method: 'DELETE' });
            if (res.ok) {
                alert("Especialidade removida!");
                carregar(busca);
            } else {
                const erro = await res.json();
                alert(erro.error);
            }
        } catch (error) {
            alert("Erro ao excluir.");
        }
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.headerPage}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className={styles.iconCircle}><Stethoscope color="#fff" size={24} /></div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '22px' }}>Especialidades</h2>
                        <small style={{ color: '#64748b' }}>Configurações do Sistema</small>
                    </div>
                </div>
                <div className={styles.searchBar}>
                    <Search size={18} color="#94a3b8" />
                    <input
                        type="text"
                        placeholder="Buscar especialidade..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                    />
                </div>
                <button
                    className={styles.btnSave}
                    onClick={() => {
                        setItem({ CDESPECIAL: null, DCESPECIAL: '' });
                        setNomeBusca('');
                        setSugestoes([]);
                        setIsModalOpen(true);
                    }}
                >
                    <Plus size={18} /> NOVA ESPECIALIDADE
                </button>
            </div>

            <div className={styles.tableCard}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ width: '100px' }}>CÓDIGO</th>
                            <th>DESCRIÇÃO DA ESPECIALIDADE</th>
                            <th style={{ textAlign: 'center', width: '120px' }}>AÇÕES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && dados.length === 0 ? (
                            <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px' }}>Carregando...</td></tr>
                        ) : dados.length === 0 ? (
                            <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px' }}>
                                {busca ? 'Nenhuma especialidade encontrada para esta busca.' : 'Nenhuma especialidade cadastrada.'}
                            </td></tr>
                        ) : (
                            dados.map((i: any) => (
                                <tr key={i.CDESPECIAL} className={styles.tr}>
                                    <td>{i.CDESPECIAL}</td>
                                    <td><strong>{i.DCESPECIAL}</strong></td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                                            <Edit
                                                size={16}
                                                color="#1e293b"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => {
                                                    setItem(i);
                                                    setNomeBusca(i.DCESPECIAL || '');
                                                    setIsModalOpen(true);
                                                }}
                                            />
                                            <Trash2
                                                size={16}
                                                color="#ef4444"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => excluir(i.CDESPECIAL, i.DCESPECIAL)}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className={styles.overlay}>
                    <form className={styles.modal} onSubmit={handleSubmit}>
                        <div className={styles.headerModal}>
                            <h2>{item.CDESPECIAL ? 'Editar Especialidade' : 'Novo Registro'}</h2>
                            <X onClick={() => setIsModalOpen(false)} style={{ cursor: 'pointer' }} />
                        </div>
                        <div className={styles.scroll}>
                            <div className={styles.formGroup} style={{ position: 'relative' }}>
                                <label className={styles.label}>NOME DA ESPECIALIDADE</label>
                                <input
                                    required
                                    autoFocus
                                    className={styles.input}
                                    value={nomeBusca}
                                    onChange={e => {
                                        setNomeBusca(e.target.value.toUpperCase());
                                        setMostrarSugestoes(true);
                                        // Se o usuário digitar, limpa o item para não manter dados antigos
                                        if (item.CDESPECIAL) {
                                            setItem({ CDESPECIAL: null, DCESPECIAL: '' });
                                        }
                                    }}
                                    onFocus={() => {
                                        if (nomeBusca && sugestoes.length > 0) {
                                            setMostrarSugestoes(true);
                                        }
                                    }}
                                    placeholder="Digite o nome da especialidade para buscar..."
                                />
                                {mostrarSugestoes && sugestoes.length > 0 && (
                                    <div ref={sugestaoRef} style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        backgroundColor: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        zIndex: 1000,
                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                                    }}>
                                        {sugestoes.map((especialidade) => (
                                            <div
                                                key={especialidade.CDESPECIAL}
                                                onClick={() => selecionarEspecialidade(especialidade)}
                                                style={{
                                                    padding: '10px 12px',
                                                    cursor: 'pointer',
                                                    borderBottom: '1px solid #f1f5f9',
                                                    transition: 'background-color 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'white';
                                                }}
                                            >
                                                <div style={{ fontWeight: 500 }}>{especialidade.DCESPECIAL}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                    Código: {especialidade.CDESPECIAL}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className={styles.footer}>
                            <button type="button" onClick={() => setIsModalOpen(false)} className={styles.btnCancel}>
                                CANCELAR
                            </button>
                            <button type="submit" className={styles.btnSave}>
                                <Save size={18} /> GRAVAR
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};


// import { Edit, Plus, Save, Search, Stethoscope, Trash2, X } from 'lucide-react';
// import React, { useEffect, useState } from 'react';
// import styles from './Especialidades.module.css';

// export const Especialidades: React.FC = () => {
//     const [dados, setDados] = useState<any[]>([]);
//     const [loading, setLoading] = useState(true);
//     const [busca, setBusca] = useState('');
//     const [isModalOpen, setIsModalOpen] = useState(false);

//     const [item, setItem] = useState({
//         CDESPECIAL: null as number | null,
//         DCESPECIAL: ''
//     });

//     // Função de carregamento com filtro de Backend
//     // Dentro do componente Especialidades:

//     // 1. Carregamento simplificado
//     const carregar = async () => {
//         setLoading(true);
//         try {
//             const res = await fetch('http://localhost:4000/api/especialidades');
//             const data = await res.json();
//             setDados(Array.isArray(data) ? data : []);
//         } catch (error) {
//             console.error("Erro ao carregar:", error);
//         } finally {
//             setLoading(false);
//         }
//     };

//     // 2. useEffect sem timers/debounce (filtro será local)
//     useEffect(() => {
//         carregar();
//     }, []);

//     // Na renderização da tabela:
//     {
//         dados.map((i: any) => (
//             <tr key={i.CDESPECIAL} className={styles.tr}>
//                 <td>{i.CDESPECIAL}</td>
//                 <td><strong>{i.DCESPECIAL}</strong></td>
//                 {/* ... */}
//             </tr>
//         ))
//     }

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         const isUpdate = !!item.CDESPECIAL;
//         const url = isUpdate
//             ? `http://localhost:4000/api/especialidades/${item.CDESPECIAL}`
//             : 'http://localhost:4000/api/especialidades';

//         try {
//             const res = await fetch(url, {
//                 method: isUpdate ? 'PUT' : 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify(item)
//             });

//             if (res.ok) {
//                 setIsModalOpen(false);
//                 setItem({ CDESPECIAL: null, DCESPECIAL: '' });
//                 carregar();
//             }
//         } catch (error) {
//             alert("Erro ao gravar dados.");
//         }
//     };

//     const excluir = async (id: number) => {
//         if (!window.confirm("Deseja excluir esta especialidade?")) return;
//         try {
//             const res = await fetch(`http://localhost:4000/api/especialidades/${id}`, { method: 'DELETE' });
//             if (res.ok) carregar();
//             else {
//                 const erro = await res.json();
//                 alert(erro.error);
//             }
//         } catch (error) {
//             alert("Erro ao excluir.");
//         }
//     };

//     return (
//         <div className={styles.pageContainer}>
//             <div className={styles.headerPage}>
//                 <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
//                     <div className={styles.iconCircle}><Stethoscope color="#fff" size={24} /></div>
//                     <div>
//                         <h2 style={{ margin: 0, fontSize: '22px' }}>Especialidades</h2>
//                         <small style={{ color: '#64748b' }}>Configurações do Sistema</small>
//                     </div>
//                 </div>
//                 <div className={styles.searchBar}>
//                     <Search size={18} color="#94a3b8" />
//                     <input type="text" placeholder="Buscar especialidade..." value={busca} onChange={(e) => setBusca(e.target.value)} />
//                 </div>
//                 <button className={styles.btnSave} onClick={() => { setItem({ CDESPECIAL: null, DCESPECIAL: '' }); setIsModalOpen(true); }}>
//                     <Plus size={18} /> NOVA ESPECIALIDADE
//                 </button>
//             </div>

//             <div className={styles.tableCard}>
//                 <table className={styles.table}>
//                     <thead>
//                         <tr>
//                             <th style={{ width: '100px' }}>CÓDIGO</th>
//                             <th>DESCRIÇÃO DA ESPECIALIDADE</th>
//                             <th style={{ textAlign: 'center', width: '120px' }}>AÇÕES</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {loading && dados.length === 0 ? (
//                             <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px' }}>Carregando...</td></tr>
//                         ) : (
//                             // dados.map((i: any) => (
//                             dados
//                                 .filter(i => i.DCESPECIAL?.toUpperCase().includes(busca.toUpperCase()))
//                                 .map(i => (
//                                     <tr key={i.CDESPECIAL} className={styles.tr}>
//                                         <td>{i.CDESPECIAL}</td>
//                                         <td><strong>{i.DCESPECIAL}</strong></td>
//                                         <td style={{ textAlign: 'center' }}>
//                                             <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
//                                                 <Edit size={16} color="#1e293b" style={{ cursor: 'pointer' }} onClick={() => { setItem(i); setIsModalOpen(true); }} />
//                                                 <Trash2 size={16} color="#ef4444" style={{ cursor: 'pointer' }} onClick={() => excluir(i.CDESPECIAL)} />
//                                             </div>
//                                         </td>
//                                     </tr>
//                                 ))
//                         )}
//                     </tbody>
//                 </table>
//             </div>

//             {isModalOpen && (
//                 <div className={styles.overlay}>
//                     <form className={styles.modal} onSubmit={handleSubmit}>
//                         <div className={styles.headerModal}>
//                             <h2>{item.CDESPECIAL ? 'Editar Especialidade' : 'Novo Registro'}</h2>
//                             <X onClick={() => setIsModalOpen(false)} style={{ cursor: 'pointer' }} />
//                         </div>
//                         <div className={styles.scroll}>
//                             <div className={styles.formGroup}>
//                                 <label className={styles.label}>NOME DA ESPECIALIDADE</label>
//                                 <input required autoFocus className={styles.input} value={item.DCESPECIAL} onChange={e => setItem({ ...item, DCESPECIAL: e.target.value.toUpperCase() })} />
//                             </div>
//                         </div>
//                         <div className={styles.footer}>
//                             <button type="button" onClick={() => setIsModalOpen(false)} className={styles.btnCancel}>CANCELAR</button>
//                             <button type="submit" className={styles.btnSave}><Save size={18} /> GRAVAR</button>
//                         </div>
//                     </form>
//                 </div>
//             )}
//         </div>
//     );
// };



