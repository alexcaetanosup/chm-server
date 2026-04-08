import React, { useEffect, useMemo, useState } from "react";
import { gerarReciboPDF } from "../../services/reciboPdfService";
import styles from "./Lancamentos.module.css";

import {
    Calculator,
    DollarSign,
    Eye,
    Plus,
    Save,
    Search,
    X
} from "lucide-react";

interface Parcela {
    DTPARCELA: string;
    VLPARCELA: number;
    PARCELA: number;
}

export const Lancamentos: React.FC = () => {
    const [lancamentos, setLancamentos] = useState<any[]>([]);
    const [pacientes, setPacientes] = useState<any[]>([]);
    const [medicos, setMedicos] = useState<any[]>([]);
    const [especialidades, setEspecialidades] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [busca, setBusca] = useState('');
    const [selectedItem, setSelectedItem] = useState<any>(null);

    const [item, setItem] = useState({
        DATATEND: new Date().toISOString().split('T')[0],
        VALOR_TOTAL: '',
        CDPACIENTE: '',
        CDMEDICO: '',
        CDESPECIAL: '',
        PLANO: 'PARTICULAR',
        QTD_PARCELAS: '1'
    });

    const [parcelas, setParcelas] = useState<Parcela[]>([]);

    const subtotal = parcelas.reduce((acc, p) => {
        const valor = parseFloat(String(p.VLPARCELA)) || 0;
        return acc + valor;
    }, 0);

    const taxa = subtotal * 0.05;
    const total = subtotal - taxa;

    const listaRecibos = Object.values(
        lancamentos.reduce((acc: any, l: any) => {

            if (!acc[l.NRVENDA]) {
                acc[l.NRVENDA] = {
                    id: l.NRVENDA,
                    paciente: l.PACIENTE,
                    medico: l.MEDICO,
                    especialidade: l.ESPECIALIDADE,
                    dados: {
                        DATATEND: l.DATATEND,
                        VALOR_TOTAL: l.VLPARCELA
                    },
                    parcelas: []
                };
            }

            acc[l.NRVENDA].parcelas.push({
                DTPARCELA: l.DTPARCELA,
                VLPARCELA: l.VLPARCELA,
                PARCELA: l.PARCELA
            });

            return acc;

        }, {})
    );

    const carregarTudo = async () => {
        setLoading(true);
        try {
            const [resL, resP, resM, resE] = await Promise.all([
                fetch('http://localhost:4000/api/lancamentos'),
                fetch('http://localhost:4000/api/pacientes'),
                fetch('http://localhost:4000/api/medicos'),
                fetch('http://localhost:4000/api/especialidades')
            ]);

            const dadosL = await resL.json();
            const ordenados = dadosL.sort((a: any, b: any) =>
                new Date(b.DATATEND).getTime() - new Date(a.DATATEND).getTime()
            );

            setLancamentos(ordenados);
            setPacientes(await resP.json());
            setMedicos(await resM.json());
            setEspecialidades(await resE.json());
        } catch (err) {
            console.error("Erro ao carregar dados:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { carregarTudo(); }, []);

    const lancamentosFiltrados = useMemo(() => {
        return lancamentos.filter(l =>
            (l.PACIENTE || "").toUpperCase().includes(busca.toUpperCase()) ||
            (l.MEDICO || "").toUpperCase().includes(busca.toUpperCase())
        );
    }, [busca, lancamentos]);

    const gerarParcelas = () => {

        const total = parseFloat(item.VALOR_TOTAL || "0");

        const qtd = parseInt(item.QTD_PARCELAS);

        if (isNaN(total) || total <= 0 || isNaN(qtd) || qtd <= 0) {
            alert("Verifique valores e parcelas.");
            return;
        }

        const valorBase = parseFloat((total / qtd).toFixed(2));

        const novas: Parcela[] = [];

        for (let i = 1; i <= qtd; i++) {

            const dt = new Date(item.DATATEND);

            dt.setMonth(dt.getMonth() + (i - 1));

            novas.push({
                DTPARCELA: dt.toISOString().split('T')[0],
                VLPARCELA: i === qtd
                    ? parseFloat((total - (valorBase * (qtd - 1))).toFixed(2))
                    : valorBase,
                PARCELA: i
            });

        }

        setParcelas(novas);

    };

    const mapaPacientes = useMemo(() => {
        const novoMapa: Record<string, string> = {};
        pacientes.forEach(p => {
            novoMapa[String(p.CDPACIENTE)] = p.DCPACIENTE;
        });
        return novoMapa;
    }, [pacientes]);


    const handleSubmit = async (e: React.FormEvent) => {

        e.preventDefault();

        if (parcelas.length === 0) {
            alert("Gere as parcelas!");
            return;
        }

        const nrVenda = Date.now().toString();

        try {
            const promises = parcelas.map(async (p) => {
                const body = {
                    ...item,
                    ...p,
                    PARCELAM: item.QTD_PARCELAS,
                    NRVENDA: nrVenda,
                    ABERTO: 'S'
                };

                const res = await fetch('http://localhost:4000/api/lancamentos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (!res.ok) throw new Error("Erro ao salvar parcela");
                return res.json();
            });

            await Promise.all(promises);

            const pacienteNome =
                pacientes.find(p => p.CDPACIENTE === item.CDPACIENTE)?.DCPACIENTE || "";

            const medicoNome =
                medicos.find(m => m.CDMEDICO === item.CDMEDICO)?.DCMEDICO || "";

            const especialidadeNome =
                especialidades.find(e => e.CDESPECIAL === item.CDESPECIAL)?.DCESPECIAL || "";

            gerarReciboPDF(
                parcelas,
                item,
                pacienteNome,
                medicoNome,
                especialidadeNome
            );

            alert("Sucesso! PDF gerado.");

            setIsModalOpen(false);
            setParcelas([]);
            setItem({
                DATATEND: new Date().toISOString().split('T')[0],
                VALOR_TOTAL: '',
                CDPACIENTE: '',
                CDMEDICO: '',
                CDESPECIAL: '',
                PLANO: 'PARTICULAR',
                QTD_PARCELAS: '1'
            });
            carregarTudo();

        } catch (err) {
            console.error("ERRO COMPLETO:", err);
            alert("Erro ao salvar.");
        }
    };

    const selecionarPaciente = (nome: string) => {
        const p = pacientes.find(x => x.DCPACIENTE === nome);

        if (p) {
            setItem({
                ...item,
                CDPACIENTE: p.CDPACIENTE
            });
        }
    };

    const selecionarMedico = (nome: string) => {
        const m = medicos.find(x => x.DCMEDICO === nome);

        if (m) {
            setItem({
                ...item,
                CDMEDICO: m.CDMEDICO
            });
        }
    };

    const selecionarEspecialidade = (nome: string) => {
        const e = especialidades.find(x => x.DCESPECIAL === nome);

        if (e) {
            setItem({
                ...item,
                CDESPECIAL: e.CDESPECIAL
            });
        }
    };

    const lancamentosAgrupados = Object.values(
        lancamentos.reduce((acc: any, item: any) => {

            if (!acc[item.NRVENDA]) {
                acc[item.NRVENDA] = {
                    ...item,
                    TOTAL: 0,
                    PARCELAS: 0
                };
            }

            acc[item.NRVENDA].TOTAL += Number(item.VLPARCELA);
            acc[item.NRVENDA].PARCELAS += 1;

            return acc;

        }, {})
    );

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.titleInfo}>
                    <div className={styles.iconCircle} style={{ backgroundColor: '#f59e0b' }}><DollarSign color="#fff" /></div>
                    <div>
                        <h1>Lançamentos</h1>
                        <p>Gestão de Atendimentos e Cobranças</p>
                    </div>
                </div>
                <div className={styles.searchSection}>
                    <div className={styles.searchWrapper}>
                        <Search className={styles.searchIcon} size={20} />
                        <input
                            type="text"
                            placeholder="Pesquisar por paciente ou médico..."
                            className={styles.searchInput}
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                        />
                    </div>
                </div>
                <div>
                    <button className={styles.btnPrimary} onClick={() => setIsModalOpen(true)}>
                        <Plus size={20} /> Novo Atendimento
                    </button>
                </div>
            </div>

            <div className={styles.tableCard}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Data Atend.</th>
                            <th>Paciente</th>
                            <th>Médico</th>
                            <th style={{ textAlign: 'right' }}>Valor Parcela</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>Carregando...</td></tr>
                        ) : (
                            lancamentosFiltrados.map((l: any, idx: number) => {
                                // 🔍 Buscamos os nomes usando a lógica que você criou
                                const pacienteNome = pacientes.find(p => String(p.CDPACIENTE) === String(l.CDPACIENTE))?.DCPACIENTE || `${l.CDPACIENTE}`;
                                const medicoNome = medicos.find(m => String(m.CDMEDICO) === String(l.CDMEDICO))?.DCMEDICO || `${l.CDMEDICO}`;


                                // console.log para testar se está encontrando os pacientes corretamente
                                // console.log('Buscando Paciente:', {
                                //     idNoLancamento: l.CDPACIENTE,
                                //     tipoNoLancamento: typeof l.CDPACIENTE,
                                //     listaPacientes: pacientes
                                // });


                                return (
                                    <tr key={`${l.NRVENDA}-${l.DTPARCELA}-${idx}`}>
                                        <td>{new Date(l.DATATEND).toLocaleDateString('pt-BR')}</td>
                                        <td>{pacienteNome}</td>
                                        <td>{medicoNome}</td>
                                        <td className={styles.valorDireita}>
                                            {Number(l.VLPARCELA).toLocaleString('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL'
                                            })}
                                        </td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${l.ABERTO === 'S' ? styles.pendente : styles.pago}`}>
                                                {l.ABERTO === 'S' ? 'Pendente' : 'Pago'}
                                            </span>
                                        </td>
                                        <td>
                                            <button className={styles.btnIcon} onClick={() => setSelectedItem(l)}>
                                                <Eye size={18} color="#6366f1" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div >

            {
                isModalOpen && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalContent} style={{ maxWidth: '750px' }}>
                            <div className={styles.modalHeader}>
                                <h2>Novo Atendimento</h2>
                                <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSubmit} className={styles.modalForm}>
                                <div className={styles.formGroup}>
                                    <label>Paciente</label>
                                    <input
                                        list="l-pac"
                                        required
                                        onChange={(e) => selecionarPaciente(e.target.value)}
                                        placeholder="Digite o nome do paciente..."
                                    />
                                    <datalist id="l-pac">{pacientes.map((p, i) => <option key={i} value={p.DCPACIENTE} />)}</datalist>
                                </div>

                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}>
                                        <label>Médico</label>
                                        <input
                                            list="l-med"
                                            required
                                            onChange={(e) => selecionarMedico(e.target.value)}
                                            placeholder="Digite o nome do médico..."
                                        />

                                        <datalist id="l-med">
                                            {medicos.map((m, i) =>
                                                <option key={i} value={m.DCMEDICO} />
                                            )}
                                        </datalist>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Especialidade</label>
                                        <input
                                            list="l-esp"
                                            required
                                            onChange={(e) => selecionarEspecialidade(e.target.value)}
                                            placeholder="Digite a especialidade..."
                                        />

                                        <datalist id="l-esp">
                                            {especialidades.map((esp, i) =>
                                                <option key={i} value={esp.DCESPECIAL} />
                                            )}
                                        </datalist>
                                    </div>
                                </div>

                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}>
                                        <label>Valor Total</label>
                                        <input type="number" step="0.01" value={item.VALOR_TOTAL} onChange={(e) => setItem({ ...item, VALOR_TOTAL: e.target.value })} />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Qtd. Parcelas</label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input type="number" min="1" value={item.QTD_PARCELAS} onChange={(e) => setItem({ ...item, QTD_PARCELAS: e.target.value })} />
                                            <button type="button" onClick={gerarParcelas} className={styles.btnSecondary}><Calculator size={16} /> Gerar</button>
                                        </div>
                                    </div>
                                </div>

                                {parcelas.length > 0 && (
                                    <div
                                        style={{
                                            background: '#f8fafc',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f0'
                                        }}
                                    >
                                        <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                            {parcelas.map((p, i) => (
                                                <div
                                                    key={i}
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        marginBottom: "8px",
                                                        width: "100%"
                                                    }}
                                                >
                                                    <span style={{ fontSize: '12px', width: '60px' }}>
                                                        Parc {p.PARCELA}
                                                    </span>

                                                    <input
                                                        type="date"
                                                        value={p.DTPARCELA}
                                                        style={{ marginLeft: "10px" }}
                                                        onChange={(e) => {
                                                            const n = [...parcelas];
                                                            n[i].DTPARCELA = e.target.value;
                                                            setParcelas(n);
                                                        }}
                                                    />

                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={p.VLPARCELA}
                                                        style={{
                                                            marginLeft: "auto",
                                                            textAlign: "right",
                                                            width: "120px",
                                                            fontWeight: "bold"
                                                        }}
                                                        onChange={(e) => {
                                                            const valor = parseFloat(e.target.value) || 0;
                                                            const n = [...parcelas];
                                                            n[i].VLPARCELA = valor;
                                                            setParcelas(n);
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        {/* RESUMO */}
                                        <div
                                            style={{
                                                marginTop: "12px",
                                                paddingTop: "10px",
                                                borderTop: "1px solid #e5e7eb",
                                                display: "flex",
                                                justifyContent: "flex-end"
                                            }}
                                        >
                                            <div style={{ width: "220px", fontSize: "14px" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                    <span>Subtotal</span>
                                                    <span>
                                                        {subtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                                    </span>
                                                </div>

                                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                    <span>5%</span>
                                                    <span>
                                                        {taxa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                                    </span>
                                                </div>

                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        fontWeight: "bold",
                                                        borderTop: "1px solid #d1d5db",
                                                        paddingTop: "6px"
                                                    }}
                                                >
                                                    <span>Total</span>
                                                    <span>
                                                        {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className={styles.modalActions}>
                                    <button type="button" className={styles.btnCancel} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                                    <button type="submit" className={styles.btnConfirm} disabled={parcelas.length === 0}>
                                        <Save size={18} /> Salvar e Imprimir PDF
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};