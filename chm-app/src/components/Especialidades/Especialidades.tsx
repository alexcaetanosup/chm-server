import { Edit, Plus, Save, Search, Stethoscope, Trash2, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import styles from './Especialidades.module.css';

export const Especialidades: React.FC = () => {
    const [dados, setDados] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [busca, setBusca] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [item, setItem] = useState({
        CDESPECIAL: null as number | null,
        DCESPECIAL: ''
    });

    const carregar = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:4000/api/especialidades');
            const data = await res.json();
            setDados(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Erro ao carregar especialidades:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { carregar(); }, []);

    // Rotina de busca + Ordenação Alfabética
    const filtrados = useMemo(() => {
        const res = dados.filter(i =>
            i.DCESPECIAL?.toUpperCase().includes(busca.toUpperCase())
        );

        return res.sort((a, b) => {
            const nomeA = a.DCESPECIAL || "";
            const nomeB = b.DCESPECIAL || "";
            return nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' });
        });
    }, [busca, dados]);

    const handleSubmit = async (e: React.FormEvent) => {

        e.preventDefault();

        const isUpdate = !!item.CDESPECIAL;

        const url = isUpdate
            ? `http://localhost:4000/api/especialidades/${item.CDESPECIAL}`
            : 'http://localhost:4000/api/especialidades';

        const method = isUpdate ? 'PUT' : 'POST';

        try {

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });

            if (res.ok) {

                alert(isUpdate ? "Especialidade atualizada!" : "Especialidade cadastrada!");

                setIsModalOpen(false);
                carregar();

                setItem({
                    CDESPECIAL: null,
                    DCESPECIAL: ''
                });

            } else {

                const erro = await res.json();
                alert("Erro: " + erro.error);

            }

        } catch (error) {

            alert("Erro ao salvar especialidade.");

        }
    };

    const excluirEspecialidade = async (id: number, nome: string) => {
        if (window.confirm(`Tem certeza que deseja excluir esta Especialidade ${nome}?`)) {
            try {
                const response = await fetch(`http://localhost:4000/api/especialidades/${id}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    alert("Especialidade removida!");
                    carregar(); // Atualiza a lista após excluir
                } else {
                    const erro = await response.json();
                    alert(erro.error);
                }
            } catch (err) {
                alert("Erro ao tentar excluir o especialidade.");
            }
        }
    };

    return (
        <div className={styles.pageContainer}>
            {/* ÁREA FIXA (CABEÇALHO) */}
            <div className={styles.fixedHeader}>
                <div className={styles.headerPage}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div className={styles.iconCircle} style={{ backgroundColor: '#0ea5e9' }}>
                            <Stethoscope color="#fff" size={24} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '22px' }}>Especialidades</h2>
                            <small style={{ color: '#64748b' }}>Gestão de Categorias</small>
                        </div>
                    </div>

                    <div className={styles.searchBar}>
                        <Search size={18} color="#94a3b8" />
                        <input
                            type="text"
                            placeholder="Pesquisar especialidade..."
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={() => { setItem({ CDESPECIAL: null, DCESPECIAL: '' }); setIsModalOpen(true); }}
                        className={styles.btnSave}
                    >
                        <Plus size={18} /> NOVA ESPECIALIDADE
                    </button>
                </div>
            </div>

            {/* ÁREA DE SCROLL (TABELA) */}
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ width: '120px', paddingLeft: '30px', textAlign: 'right' }}>CÓDIGO</th>
                            <th>DESCRIÇÃO DA ESPECIALIDADE</th>
                            <th style={{ textAlign: 'center', width: '120px' }}>AÇÕES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px' }}>Carregando...</td></tr>
                        ) : (
                            filtrados.map((i) => (
                                <tr key={i.CDESPECIAL}>
                                    <td style={{ paddingLeft: '30px', textAlign: 'right' }}>{i.CDESPECIAL}</td>
                                    <td><strong>{i.DCESPECIAL}</strong></td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                                            <Edit size={16} color="#1e293b" style={{ cursor: 'pointer' }} onClick={() => {
                                                setItem({ ...i });
                                                setIsModalOpen(true);
                                            }} />
                                            {/* <Trash2 size={16} color="#ef4444" style={{ cursor: 'pointer' }} /> */}
                                            <Trash2
                                                size={16}
                                                color="#ef4444"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => excluirEspecialidade(i.CDESPECIAL, i.DCESPECIAL)}
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
                            <div className={styles.formGroup}>
                                <label className={styles.label}>NOME DA ESPECIALIDADE</label>
                                <input required autoFocus className={styles.input} value={item.DCESPECIAL} onChange={e => setItem({ ...item, DCESPECIAL: e.target.value.toUpperCase() })} />
                            </div>
                        </div>
                        <div className={styles.footer}>
                            <button type="button" onClick={() => setIsModalOpen(false)} className={styles.btnCancel}>CANCELAR</button>
                            <button type="submit" className={styles.btnSave}><Save size={18} /> GRAVAR</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};