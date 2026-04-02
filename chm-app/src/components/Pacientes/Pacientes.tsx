import { Edit, IdCard, Save, Search, Trash2, User, UserPlus, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './Pacientes.module.css';

interface Paciente {
    CDPACIENTE?: string; DCPACIENTE: string; PACIENTE: string; CPF: string; RG: string;
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

    const mCEP = (v: string) => v.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').substring(0, 9);
    const mCPF = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').substring(0, 14);
    const nomeRef = useRef<HTMLInputElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.target instanceof HTMLInputElement && e.target.type !== 'submit') {
            e.preventDefault();
            const elements = Array.from(formRef.current?.elements || []) as HTMLElement[];
            const index = elements.indexOf(e.target);
            if (index > -1 && elements[index + 1]) (elements[index + 1] as HTMLElement).focus();
        }
    };

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

    const filtrados = useMemo(() => {
        const res = pacientes.filter(p =>
            p.DCPACIENTE?.toUpperCase().includes(busca.toUpperCase())
        );

        return res.sort((a, b) =>
            (a.DCPACIENTE || "").localeCompare(b.DCPACIENTE || "", 'pt-BR', { sensitivity: 'base' })
        );
    }, [busca, pacientes]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const isUpdate = !!form.CDPACIENTE;

        const url = isUpdate
            ? `http://localhost:4000/api/pacientes/${form.CDPACIENTE}`
            : `http://localhost:4000/api/pacientes`;

        const method = isUpdate ? "PUT" : "POST";

        const payload = { ...form };

        if (!isUpdate) {
            delete payload.CDPACIENTE;
        }

        try {
            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setIsModalOpen(false);
                setForm(initialForm);
                carregaDados();

                alert(isUpdate ? "Atualizado com sucesso!" : "Cadastrado com sucesso!");
            } else {
                const txt = await response.text();
                alert("Erro no servidor: " + txt);
            }

        } catch (error) {
            console.error("Erro na rotina:", error);
        }
    };

    const handleNomeChange = (valor: string) => {
        const nomeUpper = valor.toUpperCase();
        setForm({ ...form, DCPACIENTE: nomeUpper });

        if (nomeUpper.length > 2) {

            const inicio = pacientes.filter(p =>
                p.DCPACIENTE.startsWith(nomeUpper)
            );

            const contem = pacientes.filter(p =>
                p.DCPACIENTE.includes(nomeUpper) &&
                !p.DCPACIENTE.startsWith(nomeUpper)
            );

            const resultado = [...inicio, ...contem]
                .filter(p => String(p.CDPACIENTE) !== String(form.CDPACIENTE))
                .slice(0, 5);

            setSugestoes(resultado);
            setMostrarSugestoes(resultado.length > 0);

        } else {
            setMostrarSugestoes(false);
        }
    };

    const excluirPaciente = async (id: string, nome: string) => {
        if (window.confirm(`Tem certeza que deseja excluir o paciente ${nome}?`)) {
            try {
                const response = await fetch(`http://localhost:4000/api/pacientes/${id}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    alert("Paciente removido!");
                    carregaDados(); // Atualiza a lista após excluir
                } else {
                    const erro = await response.json();
                    alert(erro.error);
                }
            } catch (err) {
                alert("Erro ao tentar excluir o paciente.");
            }
        }
    };

    const mCelular = (v: string) =>
        v.replace(/\D/g, '')
            .replace(/^(\d{2})(\d)/g, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .substring(0, 15);

    const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("foto", file);

        const response = await fetch("http://localhost:4000/upload", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        setForm({
            ...form,
            "FOTO-PACIENTE": data.url
        });
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
                {/* <button onClick={() => { setForm(initialForm); setIsModalOpen(true); }} className={styles.btnSave}> */}
                <button
                    onClick={() => {
                        setForm(initialForm);
                        setSugestoes([]);
                        setMostrarSugestoes(false);
                        setIsModalOpen(true);
                    }} className={styles.btnSave}
                >
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
                                    <td><strong>{p.DCPACIENTE}</strong></td>
                                    <td style={{ textAlign: 'center' }}>{p.CPF}</td>
                                    <td style={{ textAlign: 'right' }}>{p.CELULAR}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <Edit size={18} style={{ cursor: 'pointer', marginRight: '10px', color: '#64748b' }} onClick={() => {
                                            setForm({
                                                ...initialForm,
                                                ...p
                                            });
                                            setIsModalOpen(true);
                                        }} />
                                        {/* <Trash2 size={18} color="#ef4444" style={{ cursor: 'pointer' }} /> */}
                                        <Trash2
                                            size={16}
                                            color="#ef4444"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => excluirPaciente(p.CDPACIENTE!, p.DCPACIENTE)}
                                        />
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

                        {/* AJUSTE: Nome da classe corrigido para scrollForm */}
                        <div className={styles.scrollForm}>
                            <div className={styles.sectionTitle}>Identificação Principal</div>
                            {/* AJUSTE: Nome da classe corrigido para grid12 */}
                            <div className={styles.grid12}>
                                <div style={{ gridColumn: 'span 8', position: 'relative' }} className={styles.fGroup}>
                                    <label>NOME COMPLETO (DCPACIENTE)</label>
                                    <input required value={form.DCPACIENTE} onChange={e => handleNomeChange(e.target.value)} onBlur={() => setTimeout(() => setMostrarSugestoes(false), 200)} />
                                    {mostrarSugestoes && (
                                        <ul className={styles.sugestoesList}>
                                            {sugestoes.map(p => (
                                                // <li key={p.CDPACIENTE} onClick={() => { setForm(p); setMostrarSugestoes(false); }}>
                                                <li
                                                    key={p.CDPACIENTE}
                                                    onClick={() => {
                                                        setForm({
                                                            ...initialForm,
                                                            ...p
                                                        });
                                                        setMostrarSugestoes(false);
                                                    }}
                                                >
                                                    <strong>{p.DCPACIENTE}</strong> (Cod: {p.CDPACIENTE})
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div style={{ gridColumn: 'span 4' }} className={styles.fGroup}>
                                    <label>APELIDO (PACIENTE)</label>
                                    <input value={form.PACIENTE} onChange={e => setForm({ ...form, PACIENTE: e.target.value.toUpperCase() })} />
                                </div>
                                <div style={{ gridColumn: 'span 4' }} className={styles.fGroup}>
                                    <label>CPF</label>
                                    <input value={form.CPF} onChange={e => setForm({ ...form, CPF: mCPF(e.target.value) })} />
                                </div>
                                <div style={{ gridColumn: 'span 4' }} className={styles.fGroup}>
                                    <label>RG</label>
                                    <input value={form.RG} onChange={e => setForm({ ...form, RG: e.target.value })} />
                                </div>
                                <div style={{ gridColumn: 'span 2' }} className={styles.fGroup}>
                                    <label>SEXO</label>
                                    <select value={form.SEXO} onChange={e => setForm({ ...form, SEXO: e.target.value })}>
                                        <option value="M">MASCULINO</option>
                                        <option value="F">FEMININO</option>
                                    </select>
                                </div>
                                <div style={{ gridColumn: 'span 2' }} className={styles.fGroup}>
                                    <label>RECIBO</label>
                                    <input value={form.RECIBO} onChange={e => setForm({ ...form, RECIBO: e.target.value.toUpperCase() })} />
                                </div>
                            </div>

                            <div className={styles.sectionTitle}>Contato e Localização (1)</div>
                            <div className={styles.grid12}>
                                <div style={{ gridColumn: 'span 3' }} className={styles.fGroup}>
                                    <label>CELULAR</label>
                                    {/* <input value={form.CELULAR} onChange={e => setForm({ ...form, CELULAR: e.target.value })} /> */}
                                    <input
                                        value={form.CELULAR}
                                        onChange={e =>
                                            setForm({ ...form, CELULAR: mCelular(e.target.value) })
                                        }
                                    />
                                </div>
                                <div style={{ gridColumn: 'span 3' }} className={styles.fGroup}>
                                    <label>TELEFONE</label>
                                    <input
                                        value={form.TELEFONE}
                                        onChange={e =>
                                            setForm({ ...form, TELEFONE: mCelular(e.target.value) })
                                        }
                                    />
                                    {/* <input value={form.TELEFONE} onChange={e => setForm({ ...form, TELEFONE: e.target.value })} /> */}
                                </div>
                                <div style={{ gridColumn: 'span 3' }} className={styles.fGroup}>
                                    <label>CEP</label>
                                    <input value={form.CEP} onChange={e => { setForm({ ...form, CEP: mCEP(e.target.value) }); buscarCEP(e.target.value); }} />
                                </div>
                                <div style={{ gridColumn: 'span 3' }} className={styles.fGroup}>
                                    <label>UF</label>
                                    <input maxLength={2} value={form.UF} onChange={e => setForm({ ...form, UF: e.target.value.toUpperCase() })} />
                                </div>
                                <div style={{ gridColumn: 'span 6' }} className={styles.fGroup}>
                                    <label>ENDEREÇO</label>
                                    <input value={form.ENDERECO} onChange={e => setForm({ ...form, ENDERECO: e.target.value.toUpperCase() })} />
                                </div>
                                <div style={{ gridColumn: 'span 3' }} className={styles.fGroup}>
                                    <label>BAIRRO</label>
                                    <input value={form.BAIRRO} onChange={e => setForm({ ...form, BAIRRO: e.target.value.toUpperCase() })} />
                                </div>
                                <div style={{ gridColumn: 'span 3' }} className={styles.fGroup}>
                                    <label>CIDADE</label>
                                    <input value={form.CIDADE} onChange={e => setForm({ ...form, CIDADE: e.target.value.toUpperCase() })} />
                                </div>
                            </div>

                            <div className={styles.sectionTitle}>Endereço Secundário (2)</div>
                            <div className={styles.grid12}>
                                <div style={{ gridColumn: 'span 5' }} className={styles.fGroup}>
                                    <label>ENDEREÇO 2</label>
                                    <input value={form.ENDERECO2} onChange={e => setForm({ ...form, ENDERECO2: e.target.value.toUpperCase() })} />
                                </div>
                                <div style={{ gridColumn: 'span 3' }} className={styles.fGroup}>
                                    <label>BAIRRO 2</label>
                                    <input value={form.BAIRRO2} onChange={e => setForm({ ...form, BAIRRO2: e.target.value.toUpperCase() })} />
                                </div>
                                <div style={{ gridColumn: 'span 3' }} className={styles.fGroup}>
                                    <label>CIDADE 2</label>
                                    <input value={form.CIDADE2} onChange={e => setForm({ ...form, CIDADE2: e.target.value.toUpperCase() })} />
                                </div>
                                <div style={{ gridColumn: 'span 1' }} className={styles.fGroup}>
                                    <label>UF 2</label>
                                    <input maxLength={2} value={form.UF2} onChange={e => setForm({ ...form, UF2: e.target.value.toUpperCase() })} />
                                </div>
                            </div>

                            <div className={styles.sectionTitle}>Complementos</div>
                            <div className={styles.grid12}>
                                <div style={{ gridColumn: 'span 12' }} className={styles.fGroup}>
                                    {form["FOTO-PACIENTE"] && (
                                        <div style={{ marginBottom: "10px" }}>
                                            <img
                                                src={form["FOTO-PACIENTE"]}
                                                alt="Paciente"
                                                style={{
                                                    width: "120px",
                                                    height: "120px",
                                                    objectFit: "cover",
                                                    borderRadius: "10px",
                                                    border: "1px solid #e2e8f0"
                                                }}
                                            />
                                        </div>
                                    )}
                                    <label>URL DA FOTO (FOTO-PACIENTE)</label>
                                    <input value={form["FOTO-PACIENTE"]} onChange={e => setForm({ ...form, "FOTO-PACIENTE": e.target.value })} />
                                </div>
                                <div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFotoUpload}
                                    />
                                </div>
                                <div style={{ gridColumn: 'span 12' }} className={styles.fGroup}>
                                    <label>OBSERVAÇÕES</label>
                                    <textarea rows={3} value={form.OBSERVA} onChange={e => setForm({ ...form, OBSERVA: e.target.value.toUpperCase() })} />
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