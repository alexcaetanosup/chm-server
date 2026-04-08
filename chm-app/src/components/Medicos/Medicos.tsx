import { Edit, FileText, MapPin, Save, Search, Stethoscope, Trash2, UserPlus, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import styles from './Medicos.module.css';

export const Medicos: React.FC = () => {
    const [medicos, setMedicos] = useState<any[]>([]);
    const [especialidades, setEspecialidades] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [busca, setBusca] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

    // Estados para o autocomplete do nome do médico no modal
    const [nomeBusca, setNomeBusca] = useState('');
    const [sugestoes, setSugestoes] = useState<any[]>([]);
    const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
    const sugestaoRef = useRef<HTMLDivElement>(null);

    const initialForm = {
        CDMEDICO: '', DCMEDICO: '', DATANASC: '', CPF: '', CRM: '',
        CDESPECIALIDADE: '', DCESPECIAL: '', CELULAR: '', TELEFONE: '',
        CEP: '', ENDERECO: '', BAIRRO: '', CIDADE: '', UF: '',
        OBSERVA: '', "FOTO-MED": ''
    };

    const [form, setForm] = useState(initialForm);

    // Função para carregar médicos com filtro de busca (para a tabela)
    const carregarMedicos = async (termoBusca: string = '') => {
        try {
            setLoading(true);

            let url = 'http://localhost:4000/api/medicos';
            if (termoBusca && termoBusca.trim() !== '') {
                url = `http://localhost:4000/api/medicos?nome=${encodeURIComponent(termoBusca)}`;
            }

            const response = await fetch(url);
            const data = await response.json();
            setMedicos(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Erro ao carregar médicos:', err);
            setMedicos([]);
        } finally {
            setLoading(false);
        }
    };

    // Função para buscar médicos por nome (para o autocomplete do modal)
    const buscarMedicosPorNome = async (nome: string) => {
        if (!nome || nome.trim() === '') {
            setSugestoes([]);
            return;
        }

        try {
            const response = await fetch(`http://localhost:4000/api/medicos?nome=${encodeURIComponent(nome)}`);
            const data = await response.json();
            setSugestoes(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Erro ao buscar médicos:', err);
            setSugestoes([]);
        }
    };

    // Debounce para busca de médicos no autocomplete
    useEffect(() => {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }

        const timer = setTimeout(() => {
            if (nomeBusca.trim() !== '') {
                buscarMedicosPorNome(nomeBusca);
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

    // Função para selecionar um médico das sugestões
    const selecionarMedico = (medico: any) => {
        setForm({
            ...medico,
            CDESPECIALIDADE: medico.CDESPECIALIDADE || '',
            DCESPECIAL: medico.DCESPECIAL || ''
        });
        setNomeBusca(medico.DCMEDICO);
        setMostrarSugestoes(false);
    };

    // Função para carregar especialidades
    const carregarEspecialidades = async () => {
        try {
            const response = await fetch('http://localhost:4000/api/especialidades');
            const data = await response.json();
            setEspecialidades(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Erro ao carregar especialidades:', err);
            setEspecialidades([]);
        }
    };

    // Carregar dados iniciais
    useEffect(() => {
        carregarMedicos();
        carregarEspecialidades();
    }, []);

    // Busca com debounce para a tabela principal
    useEffect(() => {
        const timer = setTimeout(() => {
            if (busca.trim() !== '') {
                carregarMedicos(busca);
            } else {
                carregarMedicos();
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [busca]);

    // Limpar autocomplete quando fechar o modal
    useEffect(() => {
        if (!isModalOpen) {
            setNomeBusca('');
            setSugestoes([]);
            setMostrarSugestoes(false);
        }
    }, [isModalOpen]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
        if (e.key === 'Enter') {
            const target = e.target as HTMLElement;
            if (target.tagName === 'TEXTAREA') return;
            e.preventDefault();
            const focusableElements = e.currentTarget.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
                'input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
            );
            const index = Array.from(focusableElements).indexOf(target as any);
            if (index > -1 && index < focusableElements.length - 1) {
                focusableElements[index + 1].focus();
            }
        }
    };

    const mCPF = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').substring(0, 14);
    const mCEP = (v: string) => v.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').substring(0, 9);
    const mCel = (v: string) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 15);
    const mTel = (v: string) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2').substring(0, 14);

    const buscarCEP = async (cep: string) => {
        const cleanCEP = cep.replace(/\D/g, '');
        if (cleanCEP.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    setForm(prev => ({
                        ...prev,
                        ENDERECO: data.logradouro.toUpperCase(),
                        BAIRRO: data.bairro.toUpperCase(),
                        CIDADE: data.localidade.toUpperCase(),
                        UF: data.uf.toUpperCase()
                    }));
                }
            } catch (err) { console.error(err); }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const isUpdate = !!form.CDMEDICO;
        const url = isUpdate
            ? `http://localhost:4000/api/medicos/${form.CDMEDICO}`
            : 'http://localhost:4000/api/medicos';

        const method = isUpdate ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            if (response.ok) {
                alert(isUpdate ? "Médico atualizado!" : "Médico cadastrado!");
                setIsModalOpen(false);
                setForm(initialForm);
                setNomeBusca('');
                carregarMedicos(busca);
                carregarEspecialidades();
            } else {
                const erro = await response.json();
                alert("Erro: " + erro.error);
            }
        } catch (err) {
            alert("Erro de comunicação com servidor");
        }
    };

    const excluirMedico = async (id: number, nome: string) => {
        if (window.confirm(`Tem certeza que deseja excluir o médico ${nome}?`)) {
            try {
                const response = await fetch(`http://localhost:4000/api/medicos/${id}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    alert("Médico removido!");
                    carregarMedicos(busca);
                } else {
                    const erro = await response.json();
                    alert(erro.error);
                }
            } catch (err) {
                alert("Erro ao tentar excluir o médico.");
            }
        }
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.headerPage}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className={styles.iconCircle}><Stethoscope color="#fff" size={24} /></div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '22px' }}>Corpo Clínico</h2>
                        <small style={{ color: '#64748b' }}>Gestão de Profissionais</small>
                    </div>
                </div>
                <div className={styles.searchBar}>
                    <Search size={18} color="#94a3b8" />
                    <input
                        type="text"
                        placeholder="Pesquisar por nome ou especialidade..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                    />
                </div>
                <button className={styles.btnSave} onClick={() => {
                    setForm(initialForm);
                    setNomeBusca('');
                    setSugestoes([]);
                    setIsModalOpen(true);
                }}>
                    <UserPlus size={18} /> NOVO MÉDICO
                </button>
            </div>

            <div className={styles.contentArea}>
                <div className={styles.tableCard}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>CÓDIGO</th>
                                <th>NOME DO PROFISSIONAL</th>
                                <th>CRM</th>
                                <th>ESPECIALIDADE</th>
                                <th style={{ textAlign: 'right' }}>CELULAR</th>
                                <th style={{ textAlign: 'center' }}>AÇÕES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>
                                        Carregando...
                                    </td>
                                </tr>
                            ) : medicos.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>
                                        {busca ? 'Nenhum médico encontrado para esta busca.' : 'Nenhum médico cadastrado.'}
                                    </td>
                                </tr>
                            ) : (
                                medicos.map((m: any) => (
                                    <tr key={m.CDMEDICO} className={styles.tr}>
                                        <td>{m.CDMEDICO}</td>
                                        <td><strong>{m.DCMEDICO}</strong></td>
                                        <td>{m.CRM}</td>
                                        <td><span className={styles.badge}>{m.DCESPECIAL}</span></td>
                                        <td style={{ textAlign: 'right' }}>{m.CELULAR}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                                                <Edit
                                                    size={16}
                                                    color="#1e293b"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => {
                                                        setForm({ ...m });
                                                        setNomeBusca(m.DCMEDICO || '');
                                                        setIsModalOpen(true);
                                                    }}
                                                />
                                                <Trash2
                                                    size={16}
                                                    color="#ef4444"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => excluirMedico(m.CDMEDICO, m.DCMEDICO)}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className={styles.overlay}>
                    <form className={styles.modal} onKeyDown={handleKeyDown} onSubmit={handleSubmit}>
                        <div className={styles.headerModal}>
                            <h2>{form.CDMEDICO ? 'Editar Médico' : 'Novo Cadastro'}</h2>
                            <X onClick={() => { setIsModalOpen(false); setForm(initialForm); setNomeBusca(''); }} style={{ cursor: 'pointer' }} />
                        </div>

                        <div className={styles.scroll}>
                            <div className={styles.sectionTitle}><Stethoscope size={16} /> Profissional</div>
                            <div className={styles.grid}>
                                <div className={styles.formGroup} style={{ gridColumn: 'span 8', position: 'relative' }}>
                                    <label className={styles.label}>NOME COMPLETO</label>
                                    <input
                                        required
                                        className={styles.input}
                                        value={nomeBusca}
                                        onChange={e => {
                                            setNomeBusca(e.target.value);
                                            setMostrarSugestoes(true);
                                            // Se o usuário digitar, limpa o form para não manter dados antigos
                                            if (form.CDMEDICO) {
                                                setForm({ ...initialForm, CDMEDICO: '' });
                                            }
                                        }}
                                        onFocus={() => {
                                            if (nomeBusca && sugestoes.length > 0) {
                                                setMostrarSugestoes(true);
                                            }
                                        }}
                                        placeholder="Digite o nome do médico para buscar..."
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
                                            {sugestoes.map((medico) => (
                                                <div
                                                    key={medico.CDMEDICO}
                                                    onClick={() => selecionarMedico(medico)}
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
                                                    <div style={{ fontWeight: 500 }}>{medico.DCMEDICO}</div>
                                                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                        CRM: {medico.CRM} | Especialidade: {medico.DCESPECIAL || 'Não informada'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className={styles.formGroup} style={{ gridColumn: 'span 4' }}>
                                    <label className={styles.label}>DATA NASC.</label>
                                    <input type="date" className={styles.input} value={form.DATANASC} onChange={e => setForm({ ...form, DATANASC: e.target.value })} />
                                </div>
                                <div className={styles.formGroup} style={{ gridColumn: 'span 4' }}>
                                    <label className={styles.label}>CRM</label>
                                    <input required className={styles.input} value={form.CRM} onChange={e => setForm({ ...form, CRM: e.target.value })} />
                                </div>
                                <div className={styles.formGroup} style={{ gridColumn: 'span 8' }}>
                                    <label className={styles.label}>ESPECIALIDADE</label>
                                    <input
                                        list="lista-esp"
                                        className={styles.input}
                                        value={form.DCESPECIAL}
                                        onChange={e => {
                                            const esp = especialidades.find(x =>
                                                x.DCESPECIAL.toUpperCase().startsWith(e.target.value.toUpperCase())
                                            );
                                            setForm({ ...form, DCESPECIAL: e.target.value, CDESPECIALIDADE: esp ? esp.CDESPECIAL : '' });
                                        }}
                                    />
                                    <datalist id="lista-esp">
                                        {especialidades.map((e: any) => <option key={e.CDESPECIAL} value={e.DCESPECIAL} />)}
                                    </datalist>
                                </div>
                                <div className={styles.formGroup} style={{ gridColumn: 'span 4' }}>
                                    <label className={styles.label}>CPF</label>
                                    <input className={styles.input} value={form.CPF} onChange={e => setForm({ ...form, CPF: mCPF(e.target.value) })} />
                                </div>
                                <div className={styles.formGroup} style={{ gridColumn: 'span 4' }}>
                                    <label className={styles.label}>CELULAR</label>
                                    <input className={styles.input} value={form.CELULAR} onChange={e => setForm({ ...form, CELULAR: mCel(e.target.value) })} />
                                </div>
                                <div className={styles.formGroup} style={{ gridColumn: 'span 4' }}>
                                    <label className={styles.label}>TELEFONE</label>
                                    <input className={styles.input} value={form.TELEFONE} onChange={e => setForm({ ...form, TELEFONE: mTel(e.target.value) })} />
                                </div>
                            </div>

                            <div className={styles.sectionTitle}><MapPin size={16} /> Localização</div>
                            <div className={styles.grid}>
                                <div className={styles.formGroup} style={{ gridColumn: 'span 3' }}>
                                    <label className={styles.label}>CEP</label>
                                    <input className={styles.input} value={form.CEP} onChange={e => { const v = mCEP(e.target.value); setForm({ ...form, CEP: v }); buscarCEP(v); }} />
                                </div>
                                <div className={styles.formGroup} style={{ gridColumn: 'span 9' }}>
                                    <label className={styles.label}>ENDEREÇO</label>
                                    <input className={styles.input} value={form.ENDERECO} onChange={e => setForm({ ...form, ENDERECO: e.target.value.toUpperCase() })} />
                                </div>
                                <div className={styles.formGroup} style={{ gridColumn: 'span 5' }}>
                                    <label className={styles.label}>BAIRRO</label>
                                    <input className={styles.input} value={form.BAIRRO} onChange={e => setForm({ ...form, BAIRRO: e.target.value.toUpperCase() })} />
                                </div>
                                <div className={styles.formGroup} style={{ gridColumn: 'span 5' }}>
                                    <label className={styles.label}>CIDADE</label>
                                    <input className={styles.input} value={form.CIDADE} onChange={e => setForm({ ...form, CIDADE: e.target.value.toUpperCase() })} />
                                </div>
                                <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                                    <label className={styles.label}>UF</label>
                                    <input className={styles.input} maxLength={2} value={form.UF} onChange={e => setForm({ ...form, UF: e.target.value.toUpperCase() })} />
                                </div>
                            </div>

                            <div className={styles.sectionTitle}><FileText size={16} /> Extras</div>
                            <div className={styles.grid}>
                                <div className={styles.formGroup} style={{ gridColumn: 'span 12' }}>
                                    <label className={styles.label}>OBSERVAÇÕES</label>
                                    <textarea className={styles.input} style={{ minHeight: '80px' }} value={form.OBSERVA} onChange={e => setForm({ ...form, OBSERVA: e.target.value.toUpperCase() })} />
                                </div>
                                <div className={styles.formGroup} style={{ gridColumn: 'span 12' }}>
                                    <label className={styles.label}>FOTO (URL)</label>
                                    <input className={styles.input} value={form["FOTO-MED"]} onChange={e => setForm({ ...form, "FOTO-MED": e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className={styles.footer}>
                            <button type="button" onClick={() => { setIsModalOpen(false); setForm(initialForm); setNomeBusca(''); }} className={styles.btnCancel}>
                                CANCELAR
                            </button>
                            <button type="submit" className={styles.btnSave}>
                                <Save size={18} /> {form.CDMEDICO ? 'SALVAR ALTERAÇÕES' : 'GRAVAR MÉDICO'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};


// import { Edit, FileText, MapPin, Save, Search, Stethoscope, Trash2, UserPlus, X } from 'lucide-react';
// import React, { useEffect, useState } from 'react';
// import styles from './Medicos.module.css';

// export const Medicos: React.FC = () => {
//     const [medicos, setMedicos] = useState<any[]>([]);
//     const [especialidades, setEspecialidades] = useState<any[]>([]);
//     const [loading, setLoading] = useState(true);
//     const [busca, setBusca] = useState('');
//     const [isModalOpen, setIsModalOpen] = useState(false);

//     const initialForm = {
//         CDMEDICO: '', DCMEDICO: '', DATANASC: '', CPF: '', CRM: '',
//         CDESPECIALIDADE: '', DCESPECIAL: '', CELULAR: '', TELEFONE: '',
//         CEP: '', ENDERECO: '', BAIRRO: '', CIDADE: '', UF: '',
//         OBSERVA: '', "FOTO-MED": ''
//     };

//     const [form, setForm] = useState(initialForm);

//     // Dentro do componente Medicos:

//     const carregarDados = async () => {
//         try {
//             setLoading(true);
//             const [resM, resE] = await Promise.all([
//                 fetch('http://localhost:4000/api/medicos'),
//                 fetch('http://localhost:4000/api/especialidades')
//             ]);
//             const dataM = await resM.json();
//             const dataE = await resE.json();
//             setMedicos(Array.isArray(dataM) ? dataM : []);
//             setEspecialidades(Array.isArray(dataE) ? dataE : []);
//         } catch (err) {
//             console.error(err);
//         } finally {
//             setLoading(false);
//         }
//     };

//     // 2. useEffect simples (apenas no montar do componente)
//     useEffect(() => {
//         carregarDados();
//     }, []);

//     // Na renderização da tabela:
//     {
//         medicos.map((m: any) => (
//             <tr key={m.CDMEDICO} className={styles.tr}>
//                 <td>{m.CDMEDICO}</td>
//                 <td><strong>{m.DCMEDICO}</strong></td>
//                 {/* ... restante das colunas */}
//             </tr>
//         ))
//     }

//     const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
//         if (e.key === 'Enter') {
//             const target = e.target as HTMLElement;
//             if (target.tagName === 'TEXTAREA') return;
//             e.preventDefault();
//             const focusableElements = e.currentTarget.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
//                 'input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
//             );
//             const index = Array.from(focusableElements).indexOf(target as any);
//             if (index > -1 && index < focusableElements.length - 1) {
//                 focusableElements[index + 1].focus();
//             }
//         }
//     };

//     const mCPF = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').substring(0, 14);
//     const mCEP = (v: string) => v.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').substring(0, 9);
//     const mCel = (v: string) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 15);
//     const mTel = (v: string) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2').substring(0, 14);

//     const buscarCEP = async (cep: string) => {
//         const cleanCEP = cep.replace(/\D/g, '');
//         if (cleanCEP.length === 8) {
//             try {
//                 const res = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
//                 const data = await res.json();
//                 if (!data.erro) {
//                     setForm(prev => ({
//                         ...prev,
//                         ENDERECO: data.logradouro.toUpperCase(),
//                         BAIRRO: data.bairro.toUpperCase(),
//                         CIDADE: data.localidade.toUpperCase(),
//                         UF: data.uf.toUpperCase()
//                     }));
//                 }
//             } catch (err) { console.error(err); }
//         }
//     };

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         const isUpdate = !!form.CDMEDICO;
//         const url = isUpdate
//             ? `http://localhost:4000/api/medicos/${form.CDMEDICO}`
//             : 'http://localhost:4000/api/medicos';

//         const method = isUpdate ? 'PUT' : 'POST';

//         try {
//             const response = await fetch(url, {
//                 method,
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify(form)
//             });

//             if (response.ok) {
//                 alert(isUpdate ? "Médico atualizado!" : "Médico cadastrado!");
//                 setIsModalOpen(false);
//                 setForm(initialForm);
//                 carregarDados();
//             } else {
//                 const erro = await response.json();
//                 alert("Erro: " + erro.error);
//             }
//         } catch (err) {
//             alert("Erro de comunicação com servidor");
//         }
//     };

//     const excluirMedico = async (id: number, nome: string) => {
//         if (window.confirm(`Tem certeza que deseja excluir o médico ${nome}?`)) {
//             try {
//                 const response = await fetch(`http://localhost:4000/api/medicos/${id}`, {
//                     method: 'DELETE'
//                 });

//                 if (response.ok) {
//                     alert("Médico removido!");
//                     carregarDados();
//                 } else {
//                     const erro = await response.json();
//                     alert(erro.error);
//                 }
//             } catch (err) {
//                 alert("Erro ao tentar excluir o médico.");
//             }
//         }
//     };

//     return (
//         <div className={styles.pageContainer}>
//             <div className={styles.headerPage}>
//                 <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
//                     <div className={styles.iconCircle}><Stethoscope color="#fff" size={24} /></div>
//                     <div>
//                         <h2 style={{ margin: 0, fontSize: '22px' }}>Corpo Clínico</h2>
//                         <small style={{ color: '#64748b' }}>Gestão de Profissionais</small>
//                     </div>
//                 </div>
//                 <div className={styles.searchBar}>
//                     <Search size={18} color="#94a3b8" />
//                     <input type="text" placeholder="Pesquisar por nome ou CRM..." value={busca} onChange={(e) => setBusca(e.target.value)} />
//                 </div>
//                 <button className={styles.btnSave} onClick={() => {
//                     setForm(initialForm);
//                     setIsModalOpen(true);
//                 }}>
//                     <UserPlus size={18} /> NOVO MÉDICO
//                 </button>
//             </div>

//             <div className={styles.contentArea}>
//                 <div className={styles.tableCard}>
//                     <table className={styles.table}>
//                         <thead>
//                             <tr>
//                                 <th>CÓDIGO</th>
//                                 <th>NOME DO PROFISSIONAL</th>
//                                 <th>CRM</th>
//                                 <th>ESPECIALIDADE</th>
//                                 <th style={{ textAlign: 'right' }}>CELULAR</th>
//                                 <th style={{ textAlign: 'center' }}>AÇÕES</th>
//                             </tr>
//                         </thead>
//                         <tbody>
//                             {loading && medicos.length === 0 ? (
//                                 <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>Carregando...</td></tr>
//                             ) : (
//                                 // medicos.map((m: any) => (
//                                 medicos
//                                     .filter(m => m.DCMEDICO?.toUpperCase().includes(busca.toUpperCase()) || m.CPF?.includes(busca))
//                                     .map(m => (
//                                         < tr key={m.CDMEDICO} className={styles.tr}>
//                                             <td>{m.CDMEDICO}</td>
//                                             <td><strong>{m.DCMEDICO}</strong></td>
//                                             <td>{m.CRM}</td>
//                                             <td><span className={styles.badge}>{m.DCESPECIAL}</span></td>
//                                             <td style={{ textAlign: 'right' }}>{m.CELULAR}</td>
//                                             <td style={{ textAlign: 'center' }}>
//                                                 <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
//                                                     <Edit
//                                                         size={16}
//                                                         color="#1e293b"
//                                                         style={{ cursor: 'pointer' }}
//                                                         onClick={() => {
//                                                             setForm({ ...m });
//                                                             setIsModalOpen(true);
//                                                         }}
//                                                     />
//                                                     <Trash2
//                                                         size={16}
//                                                         color="#ef4444"
//                                                         style={{ cursor: 'pointer' }}
//                                                         onClick={() => excluirMedico(m.CDMEDICO, m.DCMEDICO)}
//                                                     />
//                                                 </div>
//                                             </td>
//                                         </tr>
//                                     ))
//                             )}
//                         </tbody>
//                     </table>
//                 </div>
//             </div>

//             {
//                 isModalOpen && (
//                     <div className={styles.overlay}>
//                         <form className={styles.modal} onKeyDown={handleKeyDown} onSubmit={handleSubmit}>
//                             <div className={styles.headerModal}>
//                                 <h2>{form.CDMEDICO ? 'Editar Médico' : 'Novo Cadastro'}</h2>
//                                 <X onClick={() => { setIsModalOpen(false); setForm(initialForm); }} style={{ cursor: 'pointer' }} />
//                             </div>

//                             <div className={styles.scroll}>
//                                 <div className={styles.sectionTitle}><Stethoscope size={16} /> Profissional</div>
//                                 <div className={styles.grid}>
//                                     <div className={styles.formGroup} style={{ gridColumn: 'span 8' }}><label className={styles.label}>NOME COMPLETO</label><input required className={styles.input} value={form.DCMEDICO} onChange={e => setForm({ ...form, DCMEDICO: e.target.value.toUpperCase() })} /></div>
//                                     <div className={styles.formGroup} style={{ gridColumn: 'span 4' }}><label className={styles.label}>DATA NASC.</label><input type="date" className={styles.input} value={form.DATANASC} onChange={e => setForm({ ...form, DATANASC: e.target.value })} /></div>
//                                     <div className={styles.formGroup} style={{ gridColumn: 'span 4' }}><label className={styles.label}>CRM</label><input required className={styles.input} value={form.CRM} onChange={e => setForm({ ...form, CRM: e.target.value })} /></div>
//                                     <div className={styles.formGroup} style={{ gridColumn: 'span 8' }}><label className={styles.label}>ESPECIALIDADE</label>
//                                         <input list="lista-esp" className={styles.input} value={form.DCESPECIAL} onChange={e => {
//                                             // const esp = especialidades.find(x => x.DCESPECIAL === e.target.value);
//                                             const esp = especialidades.find(x =>
//                                                 x.DCESPECIAL.toUpperCase().startsWith(e.target.value.toUpperCase())
//                                             );
//                                             setForm({ ...form, DCESPECIAL: e.target.value, CDESPECIALIDADE: esp ? esp.CDESPECIAL : '' });
//                                         }} />
//                                         <datalist id="lista-esp">{especialidades.map((e: any) => <option key={e.CDESPECIAL} value={e.DCESPECIAL} />)}</datalist>
//                                     </div>
//                                     <div className={styles.formGroup} style={{ gridColumn: 'span 4' }}><label className={styles.label}>CPF</label><input className={styles.input} value={form.CPF} onChange={e => setForm({ ...form, CPF: mCPF(e.target.value) })} /></div>
//                                     <div className={styles.formGroup} style={{ gridColumn: 'span 4' }}><label className={styles.label}>CELULAR</label><input className={styles.input} value={form.CELULAR} onChange={e => setForm({ ...form, CELULAR: mCel(e.target.value) })} /></div>
//                                     <div className={styles.formGroup} style={{ gridColumn: 'span 4' }}><label className={styles.label}>TELEFONE</label><input className={styles.input} value={form.TELEFONE} onChange={e => setForm({ ...form, TELEFONE: mTel(e.target.value) })} /></div>
//                                 </div>

//                                 <div className={styles.sectionTitle}><MapPin size={16} /> Localização</div>
//                                 <div className={styles.grid}>
//                                     <div className={styles.formGroup} style={{ gridColumn: 'span 3' }}><label className={styles.label}>CEP</label><input className={styles.input} value={form.CEP} onChange={e => { const v = mCEP(e.target.value); setForm({ ...form, CEP: v }); buscarCEP(v); }} /></div>
//                                     <div className={styles.formGroup} style={{ gridColumn: 'span 9' }}><label className={styles.label}>ENDEREÇO</label><input className={styles.input} value={form.ENDERECO} onChange={e => setForm({ ...form, ENDERECO: e.target.value.toUpperCase() })} /></div>
//                                     <div className={styles.formGroup} style={{ gridColumn: 'span 5' }}><label className={styles.label}>BAIRRO</label><input className={styles.input} value={form.BAIRRO} onChange={e => setForm({ ...form, BAIRRO: e.target.value.toUpperCase() })} /></div>
//                                     <div className={styles.formGroup} style={{ gridColumn: 'span 5' }}><label className={styles.label}>CIDADE</label><input className={styles.input} value={form.CIDADE} onChange={e => setForm({ ...form, CIDADE: e.target.value.toUpperCase() })} /></div>
//                                     <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}><label className={styles.label}>UF</label><input className={styles.input} maxLength={2} value={form.UF} onChange={e => setForm({ ...form, UF: e.target.value.toUpperCase() })} /></div>
//                                 </div>

//                                 <div className={styles.sectionTitle}><FileText size={16} /> Extras</div>
//                                 <div className={styles.grid}>
//                                     <div className={styles.formGroup} style={{ gridColumn: 'span 12' }}><label className={styles.label}>OBSERVAÇÕES</label>
//                                         <textarea className={styles.input} style={{ minHeight: '80px' }} value={form.OBSERVA} onChange={e => setForm({ ...form, OBSERVA: e.target.value.toUpperCase() })} />
//                                     </div>
//                                     <div className={styles.formGroup} style={{ gridColumn: 'span 12' }}><label className={styles.label}>FOTO (URL)</label><input className={styles.input} value={form["FOTO-MED"]} onChange={e => setForm({ ...form, "FOTO-MED": e.target.value })} /></div>
//                                 </div>
//                             </div>

//                             <div className={styles.footer}>
//                                 <button type="button" onClick={() => { setIsModalOpen(false); setForm(initialForm); }} className={styles.btnCancel}>CANCELAR</button>
//                                 <button type="submit" className={styles.btnSave}><Save size={18} /> {form.CDMEDICO ? 'SALVAR ALTERAÇÕES' : 'GRAVAR MÉDICO'}</button>
//                             </div>
//                         </form>
//                     </div>
//                 )
//             }
//         </div >
//     );
// };


