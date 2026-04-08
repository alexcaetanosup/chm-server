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

    // --- FUNÇÃO DE CARREGAMENTO (MONGODB ATLAS) ---
    const carregarDados = async () => {
        try {
            setLoading(true);
            // Busca os dados das rotas do seu server.js
            const [resL, resP, resM, resE] = await Promise.all([
                fetch('http://localhost:4000/api/lancamentos'),
                fetch('http://localhost:4000/api/pacientes'),
                fetch('http://localhost:4000/api/medicos'),
                fetch('http://localhost:4000/api/especialidades')
            ]);

            const dataL = await resL.json();
            const dataP = await resP.json();
            const dataM = await resM.json();
            const dataE = await resE.json();

            setLancamentos(Array.isArray(dataL) ? dataL : []);
            setPacientes(Array.isArray(dataP) ? dataP : []);
            setMedicos(Array.isArray(dataM) ? dataM : []);
            setEspecialidades(Array.isArray(dataE) ? dataE : []);
        } catch (err) {
            console.error("Erro ao carregar dados:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarDados();
    }, []);

    const total = useMemo(() => {
        return parcelas.reduce((acc, p) => acc + p.VLPARCELA, 0);
    }, [parcelas]);

    const gerarParcelas = () => {
        const valorTotal = parseFloat(item.VALOR_TOTAL);
        const numParcelas = parseInt(item.QTD_PARCELAS);

        if (isNaN(valorTotal) || isNaN(numParcelas) || numParcelas <= 0) return;

        const valorParcela = Math.floor((valorTotal / numParcelas) * 100) / 100;
        const diferenca = valorTotal - (valorParcela * numParcelas);

        const novasParcelas: Parcela[] = [];
        const dataBase = new Date(item.DATATEND);

        for (let i = 1; i <= numParcelas; i++) {
            const dataParcela = new Date(dataBase);
            dataParcela.setMonth(dataBase.getMonth() + (i - 1));

            novasParcelas.push({
                PARCELA: i,
                VLPARCELA: i === 1 ? valorParcela + diferenca : valorParcela,
                DTPARCELA: dataParcela.toISOString().split('T')[0]
            });
        }
        setParcelas(novasParcelas);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...item,
                VALOR_TOTAL: parseFloat(item.VALOR_TOTAL),
                parcelas,
                // Procura os nomes para o PDF e para o registro
                DCPACIENTE: pacientes.find(p => String(p.CDPACIENTE) === String(item.CDPACIENTE))?.DCPACIENTE || '',
                DCMEDICO: medicos.find(m => String(m.CDMEDICO) === String(item.CDMEDICO))?.DCMEDICO || '',
                DCESPECIAL: especialidades.find(esp => String(esp.CDESPECIAL) === String(item.CDESPECIAL))?.DCESPECIAL || ''
            };

            const response = await fetch('http://localhost:4000/api/lancamentos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                // Chamada corrigida seguindo a ordem dos 5 argumentos:
                // 1. listaParcelas, 2. dados, 3. pacienteNome, 4. medicoNome, 5. especialidadeNome
                gerarReciboPDF(
                    parcelas,           // O array de parcelas que gerou
                    payload,            // O objeto com os dados do lançamento
                    payload.DCPACIENTE,  // Nome do paciente (string)
                    payload.DCMEDICO,    // Nome do médico (string)
                    payload.DCESPECIAL   // Nome da especialidade (string)
                );

                setIsModalOpen(false);
                carregarDados();
            }
        } catch (err) {
            console.error("Erro ao salvar:", err);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.titleGroup}>
                    <DollarSign size={28} />
                    <h1>Lançamentos e Faturamento</h1>
                </div>
                <button className={styles.btnNew} onClick={() => setIsModalOpen(true)}>
                    <Plus size={20} /> Novo Lançamento
                </button>
            </div>

            <div className={styles.searchBar}>
                <Search size={20} />
                <input
                    type="text"
                    placeholder="Pesquisar por paciente ou médico..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                />
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Paciente</th>
                            <th>Médico</th>
                            <th>Valor Total</th>
                            <th>Plano</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center' }}>Carregando dados do Atlas...</td></tr>
                        ) : (
                            lancamentos
                                .filter(l =>
                                    l.DCPACIENTE?.toUpperCase().includes(busca.toUpperCase()) ||
                                    l.DCMEDICO?.toUpperCase().includes(busca.toUpperCase())
                                )
                                .map((l, index) => (
                                    <tr key={l._id || index}>
                                        <td className={styles.tdCenter}>
                                            {l.DATATEND ? new Date(l.DATATEND).toLocaleDateString('pt-BR') : '-'}
                                        </td>
                                        {/* <td>{l.DCPACIENTE}</td> */}
                                        {/* <td>{pacientes.find(p => p.CDPACIENTE === l.CDPACIENTE)?.DCPACIENTE || l.CDPACIENTE}</td> */}
                                        <td>
                                            {pacientes.find(p => String(p.CDPACIENTE) === String(l.CDPACIENTE))?.DCPACIENTE || `Cód: ${l.CDPACIENTE}`}
                                        </td>
                                        alert(l.codpaciente);
                                        <td>{l.DCMEDICO}</td>
                                        <td className={styles.tdRight}>
                                            {Number(l.VALOR_TOTAL).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                        <td>{l.PLANO}</td>
                                        <td className={styles.tdCenter}>
                                            <button className={styles.btnView} onClick={() => setSelectedItem(l)}>
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className={styles.overlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h2>Novo Lançamento</h2>
                            <X size={24} onClick={() => setIsModalOpen(false)} style={{ cursor: 'pointer' }} />
                        </div>
                        <form onSubmit={handleSubmit} className={styles.modalBody}>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>Data de Atendimento</label>
                                    <input type="date" value={item.DATATEND} onChange={e => setItem({ ...item, DATATEND: e.target.value })} required />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Paciente</label>
                                    <select value={item.CDPACIENTE} onChange={e => setItem({ ...item, CDPACIENTE: e.target.value })} required>
                                        <option value="">Selecione...</option>
                                        {pacientes.map(p => <option key={p.CDPACIENTE} value={p.CDPACIENTE}>{p.DCPACIENTE}</option>)}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Médico</label>
                                    <select value={item.CDMEDICO} onChange={e => setItem({ ...item, CDMEDICO: e.target.value })} required>
                                        <option value="">Selecione...</option>
                                        {medicos.map(m => <option key={m.CDMEDICO} value={m.CDMEDICO}>{m.DCMEDICO}</option>)}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Especialidade</label>
                                    <select value={item.CDESPECIAL} onChange={e => setItem({ ...item, CDESPECIAL: e.target.value })} required>
                                        <option value="">Selecione...</option>
                                        {especialidades.map(e => <option key={e.CDESPECIAL} value={e.CDESPECIAL}>{e.DCESPECIAL}</option>)}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Valor Total (R$)</label>
                                    <input type="number" step="0.01" value={item.VALOR_TOTAL} onChange={e => setItem({ ...item, VALOR_TOTAL: e.target.value })} required />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Parcelas</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input type="number" min="1" max="12" value={item.QTD_PARCELAS} onChange={e => setItem({ ...item, QTD_PARCELAS: e.target.value })} />
                                        <button type="button" onClick={gerarParcelas} className={styles.btnCalc}><Calculator size={16} /> Gerar</button>
                                    </div>
                                </div>
                            </div>

                            {parcelas.length > 0 && (
                                <div className={styles.parcelasList}>
                                    <h4>Parcelamento Gerado</h4>
                                    <div className={styles.parcelasGrid}>
                                        {parcelas.map((p, idx) => (
                                            <div key={idx} className={styles.parcelaItem}>
                                                <span>{p.PARCELA}ª - {new Date(p.DTPARCELA).toLocaleDateString('pt-BR')}</span>
                                                <strong>{p.VLPARCELA.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                                            </div>
                                        ))}
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
            )}
        </div>
    );
};