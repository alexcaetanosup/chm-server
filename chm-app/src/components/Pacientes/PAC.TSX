import { Edit, IdCard, Save, Search, Trash2, User, UserPlus, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import styles from './Pacientes.module.css';

interface Paciente {
    CDPACIENTE: string; DCPACIENTE: string; PACIENTE: string; CPF: string; RG: string;
    SEXO: string; CELULAR: string; TELEFONE: string; CEP: string; ENDERECO: string;
    BAIRRO: string; CIDADE: string; UF: string; ENDERECO2: string; BAIRRO2: string;
    CIDADE2: string; UF2: string; RECIBO: string; OBSERVA: string; "FOTO-PACIENTE": string;
}

export const Pacientes: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [busca, setBusca] = useState('');
    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const formRef = useRef<HTMLFormElement>(null);
    const [sugestoes, setSugestoes] = useState<Paciente[]>([]);
    const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

    const initialForm: Paciente = {
        CDPACIENTE: '', DCPACIENTE: '', PACIENTE: '', CPF: '', RG: '', SEXO: 'M',
        CELULAR: '', TELEFONE: '', CEP: '', ENDERECO: '', BAIRRO: '', CIDADE: '', UF: '',
        ENDERECO2: '', BAIRRO2: '', CIDADE2: '', UF2: '',
        RECIBO: '', OBSERVA: '', "FOTO-PACIENTE": ''
    };

    const [form, setForm] = useState(initialForm);

    // MÁSCARAS (Mantidas)
    const mCEP = (v: string) => v.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').substring(0, 9);
    const mCPF = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').substring(0, 14);

    // NAVEGAÇÃO POR ENTER (Mantida)
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.target instanceof HTMLInputElement && e.target.type !== 'submit') {
            e.preventDefault();
            const elements = Array.from(formRef.current?.elements || []) as HTMLElement[];
            const index = elements.indexOf(e.target);
            if (index > -1 && elements[index + 1]) (elements[index + 1] as HTMLElement).focus();
        }
    };

    // CONSULTA VIACEP (Mantida)
    const buscarCEP = async (cep: string) => {
        const value = cep.replace(/\D/g, '');
        if (value.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${value}/json/`);
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
            } catch (err) { console.error("Erro ao buscar CEP"); }
        }
    };

    const carregaDados = async () => {
        try {
            const response = await fetch('http://localhost:4000/api/pacientes');
            const data = await response.json();
            setPacientes(data);
        } catch (error) { console.error(error); }
    };

    useEffect(() => { carregaDados(); }, []);

    // SUBMIT CORRIGIDO (Removido o ID da URL para evitar o erro 404/Cannot PUT)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validação de Homônimos (Mantida)
        const homonimo = pacientes.find(p =>
            p.DCPACIENTE.trim().toUpperCase() === form.DCPACIENTE.trim().toUpperCase() &&
            p.CDPACIENTE !== form.CDPACIENTE
        );

        if (homonimo) {
            alert(`Atenção: Já existe um paciente cadastrado com o nome "${form.DCPACIENTE}". (Cód: ${homonimo.CDPACIENTE})`);
            return;
        }

        const isUpdate = !!form.CDPACIENTE;
        // AJUSTE AQUI: O seu servidor não aceita o ID na URL, então usamos a rota base para ambos
        const url = 'http://localhost:4000/api/pacientes';
        const method = isUpdate ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form) // O CDPACIENTE vai aqui dentro, que é como seu servidor identifica o registro
            });

            if (response.ok) {
                setIsModalOpen(false);
                setForm(initialForm);
                carregaDados();
                alert(isUpdate ? "Paciente atualizado com sucesso!" : "Paciente cadastrado com sucesso!");
            } else {
                const errorMsg = await response.text();
                alert("Erro ao salvar: " + errorMsg);
            }
        } catch (error) {
            console.error("Erro na rotina:", error);
        }
    };

    // SUGESTÕES (Mantida)
    const handleNomeChange = (valor: string) => {
        const nomeUpper = valor.toUpperCase();
        setForm({ ...form, DCPACIENTE: nomeUpper });

        if (nomeUpper.length > 2) {
            const filtrados = pacientes.filter(p =>
                p.DCPACIENTE.toUpperCase().includes(nomeUpper) &&
                p.CDPACIENTE !== form.CDPACIENTE
            ).slice(0, 5);

            setSugestoes(filtrados);
            setMostrarSugestoes(filtrados.length > 0);
        } else {
            setMostrarSugestoes(false);
        }
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.headerPage}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className={styles.iconCircle} style={{ backgroundColor: '#0ea5e9' }}>
                        <User color="#fff" size={24} />
                    </div>
                    <div><h2 style={{ margin: 0 }}>Pacientes</h2><small>Gestão de Cadastros</small></div>
                </div>
                <div className={styles.searchBar}>
                    <Search size={18} color="#94a3b8" />
                    <input placeholder="Buscar por nome ou CPF..." value={busca} onChange={e => setBusca(e.target.value)} />
                </div>
                <button onClick={() => { setForm(initialForm); setIsModalOpen(true); }} className={styles.btnSave}>
                    <UserPlus size={18} /> NOVO PACIENTE
                </button>
            </div>

            <div className={styles.contentArea}>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'center' }}>CÓDIGO</th>
                                <th>NOME COMPLETO</th>
                                <th style={{ textAlign: 'center' }}>CPF</th>
                                <th style={{ textAlign: 'right' }}>CELULAR</th>
                                <th style={{ textAlign: 'center' }}>AÇÕES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pacientes.filter(p => p.DCPACIENTE?.toUpperCase().includes(busca.toUpperCase())).map(p => (
                                <tr key={p.CDPACIENTE}>
                                    <td style={{ textAlign: 'center' }}>{p.CDPACIENTE}</td>
                                    <td style={{ width: '500px' }}><strong>{p.DCPACIENTE}</strong></td>
                                    <td style={{ textAlign: 'right', width: '100px' }}>{p.CPF}</td>
                                    <td style={{ textAlign: 'right' }}>{p.CELULAR}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <Edit size={18} style={{ cursor: 'pointer', marginRight: '10px', color: '#64748b' }} onClick={() => { setForm(p); setIsModalOpen(true); }} />
                                        <Trash2 size={18} color="#ef4444" style={{ cursor: 'pointer' }} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className={styles.overlay}>
                    <form ref={formRef} className={styles.modal} onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
                        <div className={styles.headerModal}>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <IdCard color="#0ea5e9" />
                                {form.CDPACIENTE ? `Alterar Paciente: ${form.CDPACIENTE}` : 'Novo Cadastro'}
                            </h2>
                            <X onClick={() => setIsModalOpen(false)} style={{ cursor: 'pointer' }} />
                        </div>

                        <div className={styles.scroll}>
                            <div className={styles.sectionTitle}>Identificação Principal</div>
                            <div className={styles.grid}>
                                <div style={{ gridColumn: 'span 8', position: 'relative' }} className={styles.formGroup}>
                                    <label className={styles.label}>NOME COMPLETO</label>
                                    <input
                                        className={styles.input}
                                        required
                                        value={form.DCPACIENTE}
                                        onChange={e => handleNomeChange(e.target.value)}
                                        onBlur={() => setTimeout(() => setMostrarSugestoes(false), 200)}
                                    />
                                    {mostrarSugestoes && (
                                        <ul className={styles.sugestoesList}>
                                            {sugestoes.map(p => (
                                                <li key={p.CDPACIENTE} onClick={() => { setForm(p); setMostrarSugestoes(false); }}>
                                                    <strong>{p.DCPACIENTE}</strong>
                                                    <span>Cod: {p.CDPACIENTE} | CPF: {p.CPF}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div style={{ gridColumn: 'span 4' }} className={styles.formGroup}>
                                    <label className={styles.label}>APELIDO</label>
                                    <input className={styles.input} value={form.PACIENTE} onChange={e => setForm({ ...form, PACIENTE: e.target.value.toUpperCase() })} />
                                </div>
                                <div style={{ gridColumn: 'span 4' }} className={styles.formGroup}>
                                    <label className={styles.label}>CPF</label>
                                    <input className={styles.input} value={form.CPF} onChange={e => setForm({ ...form, CPF: mCPF(e.target.value) })} />
                                </div>
                                <div style={{ gridColumn: 'span 3' }} className={styles.formGroup}>
                                    <label className={styles.label}>RG</label>
                                    <input className={styles.input} value={form.RG} onChange={e => setForm({ ...form, RG: e.target.value })} />
                                </div>
                                <div style={{ gridColumn: 'span 3' }} className={styles.formGroup}>
                                    <label className={styles.label}>SEXO</label>
                                    <select className={styles.input} value={form.SEXO} onChange={e => setForm({ ...form, SEXO: e.target.value })}>
                                        <option value="M">MASCULINO</option>
                                        <option value="F">FEMININO</option>
                                    </select>
                                </div>
                                <div style={{ gridColumn: 'span 2' }} className={styles.formGroup}>
                                    <label className={styles.label}>RECIBO</label>
                                    <input className={styles.input} value={form.RECIBO} onChange={e => setForm({ ...form, RECIBO: e.target.value.toUpperCase() })} />
                                </div>
                            </div>

                            <div className={styles.sectionTitle}>Contato</div>
                            <div className={styles.grid}>
                                <div style={{ gridColumn: 'span 6' }} className={styles.formGroup}>
                                    <label className={styles.label}>CELULAR</label>
                                    <input className={styles.input} value={form.CELULAR} onChange={e => setForm({ ...form, CELULAR: e.target.value })} />
                                </div>
                                <div style={{ gridColumn: 'span 6' }} className={styles.formGroup}>
                                    <label className={styles.label}>TELEFONE FIXO</label>
                                    <input className={styles.input} value={form.TELEFONE} onChange={e => setForm({ ...form, TELEFONE: e.target.value })} />
                                </div>
                            </div>

                            <div className={styles.sectionTitle}>Endereço</div>
                            <div className={styles.grid}>
                                <div style={{ gridColumn: 'span 3' }} className={styles.formGroup}>
                                    <label className={styles.label}>CEP</label>
                                    <input className={styles.input} value={form.CEP} onChange={e => { setForm({ ...form, CEP: mCEP(e.target.value) }); buscarCEP(e.target.value); }} />
                                </div>
                                <div style={{ gridColumn: 'span 7' }} className={styles.formGroup}>
                                    <label className={styles.label}>ENDEREÇO</label>
                                    <input className={styles.input} value={form.ENDERECO} onChange={e => setForm({ ...form, ENDERECO: e.target.value.toUpperCase() })} />
                                </div>
                                <div style={{ gridColumn: 'span 2' }} className={styles.formGroup}>
                                    <label className={styles.label}>UF</label>
                                    <input className={styles.input} maxLength={2} value={form.UF} onChange={e => setForm({ ...form, UF: e.target.value.toUpperCase() })} />
                                </div>
                            </div>
                        </div>

                        <div className={styles.footer}>
                            <button type="button" onClick={() => setIsModalOpen(false)} className={styles.btnCancel}>CANCELAR</button>
                            <button type="submit" className={styles.btnSave}>
                                <Save size={18} /> {form.CDPACIENTE ? 'CONFIRMAR ALTERAÇÃO' : 'GRAVAR DADOS'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};