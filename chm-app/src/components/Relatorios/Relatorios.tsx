import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Calendar, FileText, Filter, Printer, User } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import styles from './Relatorios.module.css';

export const Relatorios: React.FC = () => {
    const [lancamentos, setLancamentos] = useState<any[]>([]);
    const [medicos, setMedicos] = useState<any[]>([]);
    const [pacientes, setPacientes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Estados dos Filtros
    const [filtroMedico, setFiltroMedico] = useState('');
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [filtroStatus, setFiltroStatus] = useState('TODOS');

    // Função para adicionar cabeçalho padrão
    const adicionarCabecalhoPadrao = (doc: jsPDF, titulo: string, subtitulo: string) => {
        const pageWidth = doc.internal.pageSize.getWidth();

        // Linha superior decorativa
        doc.setDrawColor(14, 165, 233);
        doc.setLineWidth(0.5);
        doc.line(14, 8, pageWidth - 14, 8);

        // Título principal
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("CHM - Caixa de Honorários Médicos", 14, 18);

        // Subtítulo do relatório
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(titulo, 14, 26);

        // Período/Filtro
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(subtitulo, 14, 33);

        // Linha separadora
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(14, 36, pageWidth - 14, 36);

        // Data de emissão no canto direito
        const dataEmissao = new Date().toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Emissão: ${dataEmissao}`, pageWidth - 14, 18, { align: 'right' });

        // Resetar para valores padrão
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
    };

    // Função para adicionar rodapé padrão
    const adicionarRodapePadrao = (doc: jsPDF, paginaAtual: number, totalPaginas: number) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(148, 163, 184);
        doc.text("ACS.Info System - Alex Caetano dos Santos | CHM Gestão", 14, pageHeight - 6);
        doc.text(`Página ${paginaAtual} de ${totalPaginas}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
    };

    useEffect(() => {
        const carregarDados = async () => {
            setLoading(true);
            try {
                const [lancamentosRes, medicosRes, pacientesRes] = await Promise.all([
                    fetch('http://localhost:4000/api/lancamentos'),
                    fetch('http://localhost:4000/api/medicos'),
                    fetch('http://localhost:4000/api/pacientes')
                ]);

                const lancamentosData = await lancamentosRes.json();
                const medicosData = await medicosRes.json();
                const pacientesData = await pacientesRes.json();

                // Criar maps para busca rápida
                const medicosMap = new Map();
                medicosData.forEach((m: any) => {
                    medicosMap.set(m.CDMEDICO, m);
                });

                const pacientesMap = new Map();
                pacientesData.forEach((p: any) => {
                    pacientesMap.set(p.CDPACIENTE, p);
                });

                // Enriquecer os lançamentos com dados de paciente e médico
                const lancamentosEnriquecidos = lancamentosData.map((l: any) => {
                    const medico = medicosMap.get(l.CDMEDICO);
                    const paciente = pacientesMap.get(l.CDPACIENTE);

                    return {
                        ...l,
                        DCMEDICO: medico?.DCMEDICO || 'Médico não encontrado',
                        MEDICO: medico?.DCMEDICO || 'Médico não encontrado',
                        DCPACIENTE: paciente?.DCPACIENTE || 'Paciente não encontrado',
                        PACIENTE: paciente?.DCPACIENTE || 'Paciente não encontrado'
                    };
                });

                const ordenados = lancamentosEnriquecidos.sort((a: any, b: any) =>
                    new Date(b.DATATEND).getTime() - new Date(a.DATATEND).getTime()
                );

                setLancamentos(ordenados);
                setMedicos(medicosData);
                setPacientes(pacientesData);
            } catch (err) {
                console.error("Erro ao carregar dados:", err);
            } finally {
                setLoading(false);
            }
        };

        carregarDados();
    }, []);

    const dadosFiltrados = useMemo(() => {
        return lancamentos.filter(l => {
            const matchMedico = filtroMedico === '' || l.CDMEDICO.toString() === filtroMedico;
            const matchStatus = filtroStatus === 'TODOS' ||
                (filtroStatus === 'PAGO' && l.ABERTO === 'N') ||
                (filtroStatus === 'PENDENTE' && l.ABERTO === 'S');

            const dataAtend = l.DATATEND ? new Date(l.DATATEND).toISOString().split('T')[0] : '';
            const matchDataIni = dataInicio === '' || dataAtend >= dataInicio;
            const matchDataFim = dataFim === '' || dataAtend <= dataFim;

            return matchMedico && matchStatus && matchDataIni && matchDataFim;
        });
    }, [lancamentos, filtroMedico, filtroStatus, dataInicio, dataFim]);

    const calcularTotais = () => {
        const totalGeral = dadosFiltrados.reduce((sum, l) => sum + Number(l.VLPARCELA), 0);
        const totalPago = dadosFiltrados
            .filter(l => l.ABERTO === 'N')
            .reduce((sum, l) => sum + Number(l.VLPARCELA), 0);
        const totalPendente = dadosFiltrados
            .filter(l => l.ABERTO === 'S')
            .reduce((sum, l) => sum + Number(l.VLPARCELA), 0);

        return { totalGeral, totalPago, totalPendente };
    };

    const gerarPDF = () => {
        if (dadosFiltrados.length === 0) {
            alert("Não há dados para os filtros selecionados.");
            return;
        }

        const doc = new jsPDF();

        // Construir subtítulo com os filtros aplicados
        let subtitulo = "";
        const filtrosAplicados = [];

        if (filtroMedico) {
            const medico = medicos.find(m => m.CDMEDICO.toString() === filtroMedico);
            filtrosAplicados.push(`Médico: ${medico?.DCMEDICO || filtroMedico}`);
        }
        if (dataInicio) filtrosAplicados.push(`De: ${new Date(dataInicio).toLocaleDateString('pt-BR')}`);
        if (dataFim) filtrosAplicados.push(`Até: ${new Date(dataFim).toLocaleDateString('pt-BR')}`);
        if (filtroStatus !== 'TODOS') filtrosAplicados.push(`Status: ${filtroStatus}`);

        subtitulo = filtrosAplicados.length > 0 ? filtrosAplicados.join(' | ') : 'Todos os registros';

        const { totalGeral, totalPago, totalPendente } = calcularTotais();

        // Adicionar cabeçalho APENAS na primeira página
        adicionarCabecalhoPadrao(doc, "Relatório de Atendimentos", subtitulo);

        // Preparar dados da tabela
        const tableData = dadosFiltrados.map(l => [
            new Date(l.DATATEND).toLocaleDateString('pt-BR'),
            l.DCPACIENTE || l.PACIENTE || 'Não informado',
            l.DCMEDICO || l.MEDICO || 'Não informado',
            Number(l.VLPARCELA).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            l.ABERTO === 'S' ? 'Pendente' : 'Pago'
        ]);

        autoTable(doc, {
            head: [['Data', 'Paciente', 'Médico', 'Valor', 'Status']],
            body: tableData,
            startY: 40,
            theme: 'grid',
            headStyles: {
                fillColor: [14, 165, 233],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: {
                fontSize: 9,
                cellPadding: 3
            },
            columnStyles: {
                0: { cellWidth: 30, halign: 'center' },
                1: { cellWidth: 55 },
                2: { cellWidth: 45 },
                3: { cellWidth: 35, halign: 'right' },
                4: { cellWidth: 25, halign: 'center' }
            }
        });

        // Adicionar resumo após a tabela
        const finalY = (doc as any).lastAutoTable.finalY + 10;

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("RESUMO DO PERÍODO", 14, finalY);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);

        const linhaY = finalY + 8;
        doc.text(`Total de Atendimentos: ${dadosFiltrados.length}`, 14, linhaY);
        doc.text(`Total Geral: ${totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, linhaY + 6);
        doc.text(`Total Pago: ${totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, linhaY + 12);
        doc.text(`Total Pendente: ${totalPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, linhaY + 18);

        // Adicionar rodapé em todas as páginas
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            adicionarRodapePadrao(doc, i, pageCount);
        }

        doc.save('relatorio-atendimentos.pdf');
    };

    const { totalGeral, totalPago, totalPendente } = calcularTotais();

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
                        <span className={styles.summaryValues}>
                            Total: {totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} |
                            Pago: {totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} |
                            Pendente: {totalPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                </div>
            </div>

            {/* ÁREA DE SCROLL */}
            <div className={styles.tableWrapper}>
                {loading ? (
                    <div className={styles.loadingMessage}>Carregando dados...</div>
                ) : (
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
                            {dadosFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>
                                        Nenhum atendimento encontrado com os filtros selecionados.
                                    </td>
                                </tr>
                            ) : (
                                dadosFiltrados.map((l, i) => (
                                    <tr key={i}>
                                        <td style={{ paddingLeft: '24px' }}>
                                            {l.DATATEND ? new Date(l.DATATEND).toLocaleDateString('pt-BR') : 'Data não informada'}
                                        </td>
                                        <td><strong>{l.DCPACIENTE || l.PACIENTE || 'Não informado'}</strong></td>
                                        <td>{l.DCMEDICO || l.MEDICO || 'Não informado'}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            {Number(l.VLPARCELA).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                        <td>
                                            <span className={l.ABERTO === 'S' ? styles.statusPendente : styles.statusPago}>
                                                {l.ABERTO === 'S' ? 'Pendente' : 'Pago'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};




// import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable';
// import { Calendar, FileText, Filter, Printer, User } from 'lucide-react';
// import React, { useEffect, useMemo, useState } from 'react';
// import styles from './Relatorios.module.css';

// export const Relatorios: React.FC = () => {
//     const [lancamentos, setLancamentos] = useState<any[]>([]);
//     const [medicos, setMedicos] = useState<any[]>([]);

//     // Estados dos Filtros
//     const [filtroMedico, setFiltroMedico] = useState('');
//     const [dataInicio, setDataInicio] = useState('');
//     const [dataFim, setDataFim] = useState('');
//     const [filtroStatus, setFiltroStatus] = useState('TODOS');

//     useEffect(() => {
//         Promise.all([
//             fetch('http://localhost:4000/api/lancamentos').then(res => res.json()),
//             fetch('http://localhost:4000/api/medicos').then(res => res.json())
//         ]).then(([dLanc, dMed]) => {
//             const ordenados = dLanc.sort((a: any, b: any) =>
//                 new Date(b.DATATEND).getTime() - new Date(a.DATATEND).getTime()
//             );
//             setLancamentos(ordenados);
//             setMedicos(dMed);
//         }).catch(err => console.error("Erro ao carregar dados:", err));
//     }, []);

//     const dadosFiltrados = useMemo(() => {
//         return lancamentos.filter(l => {
//             const matchMedico = filtroMedico === '' || l.CDMEDICO.toString() === filtroMedico;
//             const matchStatus = filtroStatus === 'TODOS' ||
//                 (filtroStatus === 'PAGO' && l.ABERTO === 'N') ||
//                 (filtroStatus === 'PENDENTE' && l.ABERTO === 'S');

//             const dataAtend = new Date(l.DATATEND).toISOString().split('T')[0];
//             const matchDataIni = dataInicio === '' || dataAtend >= dataInicio;
//             const matchDataFim = dataFim === '' || dataAtend <= dataFim;

//             return matchMedico && matchStatus && matchDataIni && matchDataFim;
//         });
//     }, [lancamentos, filtroMedico, filtroStatus, dataInicio, dataFim]);

//     const gerarPDF = () => {
//         const doc = new jsPDF();
//         doc.text('Relatório de Atendimentos', 14, 15);

//         const tableData = dadosFiltrados.map(l => [
//             new Date(l.DATATEND).toLocaleDateString('pt-BR'),
//             l.PACIENTE,
//             l.MEDICO,
//             Number(l.VLPARCELA).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
//             l.ABERTO === 'S' ? 'Pendente' : 'Pago'
//         ]);

//         autoTable(doc, {
//             head: [['Data', 'Paciente', 'Médico', 'Valor', 'Status']],
//             body: tableData,
//             startY: 20
//         });

//         doc.save('relatorio-atendimentos.pdf');
//     };

//     return (
//         <div className={styles.container}>
//             {/* PARTE FIXA */}
//             <div className={styles.fixedHeader}>
//                 <div className={styles.header}>
//                     <div className={styles.titleInfo}>
//                         <div className={styles.iconCircle}>
//                             <FileText color="#fff" size={24} />
//                         </div>
//                         <div>
//                             <h1>Relatórios</h1>
//                             <p>Consulta e exportação de atendimentos</p>
//                         </div>
//                     </div>
//                     <button className={styles.btnPrimary} onClick={gerarPDF}>
//                         <Printer size={18} /> Exportar PDF
//                     </button>
//                 </div>

//                 <div className={styles.filterCard}>
//                     <div className={styles.filterGrid}>
//                         <div className={styles.filterGroup}>
//                             <label><User size={14} /> Médico</label>
//                             <select value={filtroMedico} onChange={e => setFiltroMedico(e.target.value)}>
//                                 <option value="">Todos os Médicos</option>
//                                 {medicos.map(m => (
//                                     <option key={m.CDMEDICO} value={m.CDMEDICO}>{m.DCMEDICO}</option>
//                                 ))}
//                             </select>
//                         </div>
//                         <div className={styles.filterGroup}>
//                             <label><Calendar size={14} /> Início</label>
//                             <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
//                         </div>
//                         <div className={styles.filterGroup}>
//                             <label><Calendar size={14} /> Fim</label>
//                             <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
//                         </div>
//                         <div className={styles.filterGroup}>
//                             <label><Filter size={14} /> Status</label>
//                             <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
//                                 <option value="TODOS">Todos</option>
//                                 <option value="PENDENTE">Pendente</option>
//                                 <option value="PAGO">Pago</option>
//                             </select>
//                         </div>
//                     </div>
//                     <div className={styles.summaryLine}>
//                         <span>Resultados encontrados: <strong>{dadosFiltrados.length} atendimentos</strong></span>
//                     </div>
//                 </div>
//             </div>

//             {/* ÁREA DE SCROLL */}
//             <div className={styles.tableWrapper}>
//                 <table className={styles.table}>
//                     <thead>
//                         <tr>
//                             <th style={{ paddingLeft: '24px' }}>Data</th>
//                             <th>Paciente</th>
//                             <th>Médico</th>
//                             <th style={{ textAlign: 'right' }}>Valor</th>
//                             <th>Status</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {dadosFiltrados.map((l, i) => (
//                             <tr key={i}>
//                                 <td style={{ paddingLeft: '24px' }}>{new Date(l.DATATEND).toLocaleDateString('pt-BR')}</td>
//                                 <td><strong>{l.PACIENTE}</strong></td>
//                                 <td>{l.MEDICO}</td>
//                                 <td style={{ textAlign: 'right' }}>
//                                     {Number(l.VLPARCELA).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
//                                 </td>
//                                 <td>
//                                     <span className={l.ABERTO === 'S' ? styles.statusPendente : styles.statusPago}>
//                                         {l.ABERTO === 'S' ? 'Pendente' : 'Pago'}
//                                     </span>
//                                 </td>
//                             </tr>
//                         ))}
//                     </tbody>
//                 </table>
//             </div>
//         </div>
//     );
// };