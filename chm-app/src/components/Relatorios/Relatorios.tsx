import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Calendar, FileText, Filter, Printer, User } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import styles from './Relatorios.module.css';

export const Relatorios: React.FC = () => {
    const [lancamentos, setLancamentos] = useState<any[]>([]);
    const [medicos, setMedicos] = useState<any[]>([]);

    // Estados dos Filtros
    const [filtroMedico, setFiltroMedico] = useState('');
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [filtroStatus, setFiltroStatus] = useState('TODOS');

    useEffect(() => {
        Promise.all([
            fetch('http://localhost:4000/api/lancamentos').then(res => res.json()),
            fetch('http://localhost:4000/api/medicos').then(res => res.json())
        ]).then(([dLanc, dMed]) => {
            const ordenados = dLanc.sort((a: any, b: any) =>
                new Date(b.DATATEND).getTime() - new Date(a.DATATEND).getTime()
            );
            setLancamentos(ordenados);
            setMedicos(dMed);
        }).catch(err => console.error("Erro ao carregar dados:", err));
    }, []);

    const dadosFiltrados = useMemo(() => {
        return lancamentos.filter(l => {
            const matchMedico = filtroMedico === '' || l.CDMEDICO.toString() === filtroMedico;
            const matchStatus = filtroStatus === 'TODOS' ||
                (filtroStatus === 'PAGO' && l.ABERTO === 'N') ||
                (filtroStatus === 'PENDENTE' && l.ABERTO === 'S');

            const dataAtend = new Date(l.DATATEND).toISOString().split('T')[0];
            const matchDataIni = dataInicio === '' || dataAtend >= dataInicio;
            const matchDataFim = dataFim === '' || dataAtend <= dataFim;

            return matchMedico && matchStatus && matchDataIni && matchDataFim;
        });
    }, [lancamentos, filtroMedico, filtroStatus, dataInicio, dataFim]);

    const gerarPDF = () => {
        const doc = new jsPDF();
        doc.text('Relatório de Atendimentos', 14, 15);

        const tableData = dadosFiltrados.map(l => [
            new Date(l.DATATEND).toLocaleDateString('pt-BR'),
            l.PACIENTE,
            l.MEDICO,
            Number(l.VLPARCELA).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            l.ABERTO === 'S' ? 'Pendente' : 'Pago'
        ]);

        autoTable(doc, {
            head: [['Data', 'Paciente', 'Médico', 'Valor', 'Status']],
            body: tableData,
            startY: 20
        });

        doc.save('relatorio-atendimentos.pdf');
    };

    return (
        <div className={styles.container}>
            {/* PARTE FIXA */}
            <div className={styles.fixedHeader}>
                <div className={styles.header}>
                    <div className={styles.titleInfo}>
                        <div className={styles.iconCircle}>
                            <FileText color="#fff" size={24} />
                        </div>
                        <div>
                            <h1>Relatórios</h1>
                            <p>Consulta e exportação de atendimentos</p>
                        </div>
                    </div>
                    <button className={styles.btnPrimary} onClick={gerarPDF}>
                        <Printer size={18} /> Exportar PDF
                    </button>
                </div>

                <div className={styles.filterCard}>
                    <div className={styles.filterGrid}>
                        <div className={styles.filterGroup}>
                            <label><User size={14} /> Médico</label>
                            <select value={filtroMedico} onChange={e => setFiltroMedico(e.target.value)}>
                                <option value="">Todos os Médicos</option>
                                {medicos.map(m => (
                                    <option key={m.CDMEDICO} value={m.CDMEDICO}>{m.DCMEDICO}</option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.filterGroup}>
                            <label><Calendar size={14} /> Início</label>
                            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
                        </div>
                        <div className={styles.filterGroup}>
                            <label><Calendar size={14} /> Fim</label>
                            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
                        </div>
                        <div className={styles.filterGroup}>
                            <label><Filter size={14} /> Status</label>
                            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                                <option value="TODOS">Todos</option>
                                <option value="PENDENTE">Pendente</option>
                                <option value="PAGO">Pago</option>
                            </select>
                        </div>
                    </div>
                    <div className={styles.summaryLine}>
                        <span>Resultados encontrados: <strong>{dadosFiltrados.length} atendimentos</strong></span>
                    </div>
                </div>
            </div>

            {/* ÁREA DE SCROLL */}
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ paddingLeft: '24px' }}>Data</th>
                            <th>Paciente</th>
                            <th>Médico</th>
                            <th style={{ textAlign: 'right' }}>Valor</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dadosFiltrados.map((l, i) => (
                            <tr key={i}>
                                <td style={{ paddingLeft: '24px' }}>{new Date(l.DATATEND).toLocaleDateString('pt-BR')}</td>
                                <td><strong>{l.PACIENTE}</strong></td>
                                <td>{l.MEDICO}</td>
                                <td style={{ textAlign: 'right' }}>
                                    {Number(l.VLPARCELA).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                                <td>
                                    <span className={l.ABERTO === 'S' ? styles.statusPendente : styles.statusPago}>
                                        {l.ABERTO === 'S' ? 'Pendente' : 'Pago'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};