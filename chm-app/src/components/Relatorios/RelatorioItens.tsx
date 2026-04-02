import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import {
    Calendar,
    CheckSquare,
    Filter,
    LassoSelect,
    PanelTopClose,
    Printer,
    Repeat,
    Square,
    Trash2,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import styles from './RelatorioItens.module.css';

export const RelatorioItens: React.FC = () => {
    const [lancamentos, setLancamentos] = useState<any[]>([]);
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear().toString());
    const [modalRecibos, setModalRecibos] = useState(false);
    const [recibosSelecionados, setRecibosSelecionados] = useState<any[]>([]);



    const [flags, setFlags] = useState({
        porMedico: true,
        porPaciente: false,
        porData: false,
        porPlano: false,
        porMedicoAno: false,
        reimpressaoRecibos: false
    });

    useEffect(() => {
        fetch('http://localhost:4000/api/lancamentos')
            .then(res => res.json())
            .then(dados => {
                const ordenados = dados.sort((a: any, b: any) =>
                    new Date(b.DATATEND).getTime() - new Date(a.DATATEND).getTime()
                );
                setLancamentos(ordenados);
            })
            .catch(err => console.error("Erro ao carregar lançamentos:", err));
    }, []);

    // Solução para o erro TS2802: Usando Array.from()
    const listaAnos = useMemo(() => {
        const anos = lancamentos.map(l => new Date(l.DATATEND).getFullYear().toString());
        const unicos = Array.from(new Set(anos));
        return unicos.sort((a, b) => b.localeCompare(a));
    }, [lancamentos]);

    const selecionarFlag = (key: keyof typeof flags) => {
        const novoEstado = Object.keys(flags).reduce((acc: any, k) => {
            acc[k] = k === key;
            return acc;
        }, {});
        setFlags(novoEstado);
    };

    const limparFiltros = () => {
        setDataInicio('');
        setDataFim('');
        setAnoSelecionado(new Date().getFullYear().toString());
        selecionarFlag('porMedico');
    };

    const dadosFiltrados = useMemo(() => {
        return lancamentos.filter(l => {
            const dataAtendObj = new Date(l.DATATEND);

            if (flags.porMedicoAno) {
                return dataAtendObj.getFullYear().toString() === anoSelecionado;
            }

            const dataAtendStr = l.DATATEND.split('T')[0];
            const matchInicio = dataInicio === '' || dataAtendStr >= dataInicio;
            const matchFim = dataFim === '' || dataAtendStr <= dataFim;
            return matchInicio && matchFim;
        });
    }, [lancamentos, dataInicio, dataFim, anoSelecionado, flags.porMedicoAno]);

    const gerarRelatorioMestre = () => {
        if (dadosFiltrados.length === 0) return alert("Não há dados para os filtros selecionados.");

        const doc = new jsPDF();
        let currentY = 20;

        doc.setFontSize(16);
        doc.text("Relatório Analítico CHM", 14, 15);

        doc.setFontSize(10);
        const subtitulo = flags.porMedicoAno
            ? `Exercício Base: ${anoSelecionado}`
            : `Período: ${dataInicio || 'Início'} até ${dataFim || 'Hoje'}`;
        doc.text(subtitulo, 14, 22);

        const agrupado = dadosFiltrados.reduce((acc: any, curr) => {
            let chave = "";
            if (flags.porMedico) chave = curr.MEDICO || "Não informado";
            else if (flags.porPaciente) chave = curr.PACIENTE || "Não informado";
            else if (flags.porPlano) chave = curr.PLANO || "PARTICULAR";
            else if (flags.porData) chave = new Date(curr.DATATEND).toLocaleDateString('pt-BR');
            else if (flags.porMedicoAno) chave = `Médico: ${curr.MEDICO} - Exercício ${anoSelecionado}`;

            if (!acc[chave]) acc[chave] = [];
            acc[chave].push(curr);
            return acc;
        }, {});

        Object.keys(agrupado).forEach((grupo) => {
            if (currentY > 240) { doc.addPage(); currentY = 20; }

            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text(grupo, 14, currentY + 10);

            const totalGrupo = agrupado[grupo].reduce((sum: number, l: any) => sum + Number(l.VLPARCELA), 0);

            autoTable(doc, {
                head: [['Data', 'Paciente', '     ', 'Valor', 'Status']],
                body: agrupado[grupo].map((l: any) => [
                    new Date(l.DATATEND).toLocaleDateString('pt-BR'),
                    l.PACIENTE,
                    l.PLANO,
                    Number(l.VLPARCELA).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                    l.ABERTO === 'S' ? 'Pendente' : 'Pago'
                ]),
                startY: currentY + 15,
                theme: 'grid',
                headStyles: { fillColor: [30, 41, 59] },
                styles: { fontSize: 8 },
                foot: [[{ content: `Subtotal do Grupo: ${totalGrupo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } }]],
                didDrawPage: (d) => { if (d.cursor) currentY = d.cursor.y + 10; }
            });

            currentY = (doc as any).lastAutoTable.finalY + 10;
        });

        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.text("ACS.Info - Alex Caetano dos Santos | CHM Gestão", 14, 285);
            doc.text(`Página ${i} de ${pageCount}`, 180, 285);
        }

        doc.save(`Relatorio_${flags.porMedicoAno ? 'Anual' : 'Analitico'}.pdf`);
    };

    const gerarReimpressaoRecibos = () => {

        if (dadosFiltrados.length === 0) {
            alert("Nenhum recibo encontrado.");
            return;
        }

        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.text("Reimpressão de Recibos", 14, 15);

        autoTable(doc, {
            head: [['Data', 'Paciente', 'Médico', 'Plano', 'Valor']],

            body: dadosFiltrados.map(l => [
                new Date(l.DATATEND).toLocaleDateString('pt-BR'),
                l.PACIENTE,
                l.MEDICO,
                l.PLANO,
                Number(l.VLPARCELA).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                })
            ]),


            startY: 25,
            theme: 'grid',

            styles: {
                fontSize: 10,
                cellPadding: 3
            },

            headStyles: {
                halign: 'left'
            },

            columnStyles: {
                0: { cellWidth: 25, halign: 'center' },   // Data
                1: { cellWidth: 55 },   // Paciente
                2: { cellWidth: 45 },   // Médico
                3: { cellWidth: 30 },   // Plano
                4: { cellWidth: 35, halign: 'right' } // Valor alinhado à direita
            }

        });

        doc.save("Reimpressao_Recibos.pdf");

    };
    const toggleRecibo = (paciente: any) => {

        const existe = recibosSelecionados.find(
            r => r.paciente === paciente.paciente
        );

        if (existe) {

            setRecibosSelecionados(prev =>
                prev.filter(r => r.paciente !== paciente.paciente)
            );

        } else {

            setRecibosSelecionados(prev => [...prev, paciente]);

        }

    };

    const imprimirSelecionados = () => {

        if (recibosSelecionados.length === 0) {
            alert("Selecione um paciente.");
            return;
        }

        const doc: any = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "letter"
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        recibosSelecionados.forEach((p: any, index: number) => {

            const subtotal = p.subtotal;
            const taxa = subtotal * 0.05;
            const total = subtotal - taxa;

            if (index > 0) {
                doc.addPage();
            }

            const numeroRecibo = String(Date.now() + index).slice(-6).padStart(6, "0");

            // HEADER IGUAL AO RECIBO OFICIAL
            doc.setFont("helvetica", "bold");
            doc.setFontSize(18);

            doc.text("CAIXA DE HONORÁRIOS MÉDICOS", pageWidth / 2, 16, { align: "center" });

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");

            doc.text(`Recibo Nº ${numeroRecibo}`, pageWidth - 20, 16, { align: "right" });

            doc.text(
                `Emitido em: ${new Date().toLocaleDateString("pt-BR")}`,
                pageWidth - 20,
                22,
                { align: "right" }
            );

            doc.setFontSize(13);

            doc.text(
                "RECIBO DE ATENDIMENTO MÉDICO",
                pageWidth / 2,
                26,
                { align: "center" }
            );

            doc.rect(14, 32, pageWidth - 28, 26);

            doc.setFontSize(10);

            doc.text(`Paciente: ${p.paciente}`, 18, 40);
            doc.text(`Médico: ${p.medico}`, 18, 46);
            doc.text(`Especialidade: ${p.especialidade || ""}`, 18, 52);

            const primeiraParcela = p.parcelas[0];

            if (primeiraParcela) {

                doc.text(
                    `Data Atendimento: ${new Date(primeiraParcela.DATATEND || Date.now()).toLocaleDateString("pt-BR")}`,
                    120,
                    40
                );

                doc.text(`Plano: Particular`, 120, 46);

                doc.text(`Este recibo é a 2º Via`, 120, 52);
            }

            //TABELA
            autoTable(doc, {

                startY: 65,

                head: [['Parcela', 'Vencimento', 'Valor']],

                body: p.parcelas.map((l: any, index: number) => [

                    index + 1,

                    // (l.PARCELA),

                    l.DTPARCELA
                        ? new Date(l.DTPARCELA).toLocaleDateString('pt-BR')
                        : '',

                    Number(l.VLPARCELA).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                    })

                ]),

                theme: 'grid',

                styles: {
                    fontSize: 10
                },

                columnStyles: {

                    0: { cellWidth: 25, halign: 'center' }, // Nº parcela
                    1: { cellWidth: 45, halign: 'center' },                   // Data vencimento
                    2: { halign: 'right' }                  // Valor alinhado à direita

                }

            });

            let y = (doc as any).lastAutoTable.finalY + 10;

            // const direita = 166;
            const direita1 = pageWidth - 50;

            doc.text(
                `Subtotal: ${subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
                direita1,
                y
            );

            const direita2 = pageWidth - 50;
            y += 6;

            doc.text(
                `Taxa 5%:   ${taxa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
                direita2,
                y
            );

            const direita3 = pageWidth - 50;
            y += 6;

            doc.setFont("helvetica", "bold");

            doc.text(
                `TOTAL: ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
                direita3,
                y
            );

            doc.setFont("helvetica", "normal");

            y += 25;

            doc.text("__________________________", 60, y);
            y += 6;
            doc.text("Assinatura do Médico", 75, y);

            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.text("ACS.Info - Alex Caetano dos Santos | CHM Gestão", 14, 272);
                doc.text(`Página ${i} de ${pageCount}`, 180, 272);
            }
            // BORDA DO RECIBO
            doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

        });

        doc.save("Recibos.pdf");
    };



    const pacientesAgrupados = useMemo(() => {

        return Object.values(

            lancamentos.reduce((acc: any, l: any) => {

                if (!acc[l.PACIENTE]) {

                    acc[l.PACIENTE] = {
                        paciente: l.PACIENTE,
                        medico: l.MEDICO,
                        especialidade: l.ESPECIALIDADE,
                        parcelas: [],
                        subtotal: 0
                    };

                }

                acc[l.PACIENTE].parcelas.push(l);
                acc[l.PACIENTE].subtotal += Number(l.VLPARCELA);

                return acc;

            }, {})

        );

    }, [lancamentos]);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Configuração de Relatórios</h1>
                <p>Personalize os agrupamentos e filtros para exportação</p>
            </div>

            <div className={styles.configGrid}>
                <div className={styles.card}>
                    <h3><Calendar size={28} /> Filtro Temporal</h3>

                    {flags.porMedicoAno ? (
                        <div className={styles.inputGroupVertical}>
                            <label className={styles.labelAno}>
                                Selecione o Ano do Exercício:
                            </label>

                            <select
                                className={styles.selectAno}
                                value={anoSelecionado}
                                onChange={e => setAnoSelecionado(e.target.value)}
                            >
                                {listaAnos.length > 0 ? (
                                    listaAnos.map(ano => (
                                        <option key={ano} value={ano}>{ano}</option>
                                    ))
                                ) : (
                                    <option value={new Date().getFullYear()}>
                                        {new Date().getFullYear()}
                                    </option>
                                )}
                            </select>
                        </div>
                    ) : (

                        <div className={styles.inputGroup}>
                            <div className={styles.dateField}>
                                <label>Início   </label>
                                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
                            </div>
                            <div className={styles.dateField}>
                                <label>Fim </label>
                                <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
                            </div>
                        </div>
                    )}
                    {/* Botões de ação */}
                    <div className={styles.actionArea}>
                        <button
                            className={styles.btnReset}
                            onClick={() => {
                                setModalRecibos(false);
                                limparFiltros();
                            }}
                        >
                            <Trash2 size={18} /> Limpar Filtros
                        </button>

                        {!flags.reimpressaoRecibos && (
                            <button className={styles.btnPrimary}
                                onClick={gerarRelatorioMestre}
                            >
                                <Printer size={18} /> Gerar PDF Analítico
                            </button>
                        )}

                        {flags.reimpressaoRecibos && (
                            <button
                                className={styles.btnPrimary}
                                onClick={() => {
                                    setModalRecibos(true);
                                    setTimeout(() => {
                                        document.getElementById("recibos")?.scrollIntoView({
                                            behavior: "smooth"
                                        });
                                    }, 100);
                                }}
                            >
                                <LassoSelect size={18} /> Selecionar Recibos
                            </button>
                        )}
                    </div>
                </div>

                <div className={styles.card}>
                    <h3><Filter size={18} /> Agrupar Relatório por:</h3>
                    <div className={styles.flagGrid}>
                        <div className={styles.flagItem} onClick={() => selecionarFlag('porMedico')}>
                            {flags.porMedico ? <CheckSquare color="#38bdf8" /> : <Square color="#94a3b8" />}
                            <span className={flags.porMedico ? styles.activeText : ''}>Médico (Geral)</span>
                        </div>
                        <div className={styles.flagItem} onClick={() => selecionarFlag('porMedicoAno')}>
                            {flags.porMedicoAno ? <CheckSquare color="#38bdf8" /> : <Square color="#94a3b8" />}
                            <span className={flags.porMedicoAno ? styles.activeText : ''}>Médico / Ano</span>
                        </div>
                        <div className={styles.flagItem} onClick={() => selecionarFlag('porPaciente')}>
                            {flags.porPaciente ? <CheckSquare color="#38bdf8" /> : <Square color="#94a3b8" />}
                            <span className={flags.porPaciente ? styles.activeText : ''}>Paciente</span>
                        </div>
                        <div className={styles.flagItem} onClick={() => selecionarFlag('porPlano')}>
                            {flags.porPlano ? <CheckSquare color="#38bdf8" /> : <Square color="#94a3b8" />}
                            <span className={flags.porPlano ? styles.activeText : ''}>Plano / Convênio</span>
                        </div>
                        <div
                            className={styles.flagItem} onClick={() => selecionarFlag('reimpressaoRecibos')}>
                            {flags.reimpressaoRecibos ? <CheckSquare color="#38bdf8" /> : <Square color="#94a3b8" />}
                            <span className={flags.reimpressaoRecibos ? styles.activeText : ''}>Reimpressão de Recibos</span>
                        </div>
                    </div>
                </div>
            </div>

            {
                modalRecibos && (

                    <div className={styles.modalOverlay}>

                        <div className={styles.modalContent} style={{ maxWidth: "800px" }}>
                            <div>
                                <h2>Selecionar Recibos      <Filter size={18} style={{ marginLeft: 320 }} />
                                    {recibosSelecionados.length} recibo(s) selecionado(s)</h2>
                            </div>
                            <div style={{ maxHeight: "400px", overflowY: "auto" }}>

                                <table className={styles.table}>

                                    <thead>
                                        <tr>
                                            <th></th>
                                            <th>Paciente</th>
                                            <th>Médico</th>
                                            <th>Parcelas</th>
                                            <th style={{ textAlign: 'right' }}>Subtotal</th>
                                        </tr>
                                    </thead>

                                    <tbody>

                                        {pacientesAgrupados.map((p: any, index: number) => {

                                            const selecionado = recibosSelecionados.find(
                                                r => r.paciente === p.paciente
                                            );

                                            return (

                                                <tr key={index}>

                                                    <td>

                                                        <input
                                                            type="checkbox"
                                                            checked={!!selecionado}
                                                            onChange={() => toggleRecibo(p)}
                                                        />

                                                    </td>

                                                    <td>{p.paciente}</td>

                                                    <td>{p.medico}</td>

                                                    <td>{p.parcelas.length}</td>

                                                    <td className={styles.valorDireita}>
                                                        {p.subtotal.toLocaleString('pt-BR', {
                                                            style: 'currency',
                                                            currency: 'BRL'
                                                        })}
                                                    </td>

                                                </tr>

                                            );

                                        })}

                                    </tbody>
                                </table>

                            </div>

                            <div style={{ marginTop: 20, display: "flex", gap: 10, marginLeft: 260 }}>
                                <button
                                    className={styles.btnPrimary}
                                    onClick={imprimirSelecionados}
                                ><Repeat size={18} />
                                    Reimprimir Selecionados
                                </button>
                                <button
                                    className={styles.btnReset}
                                    onClick={() => setModalRecibos(false)}
                                ><PanelTopClose size={18} />
                                    Fechar
                                </button>
                                <div id="recibos">
                                    {/* conteúdo da seção */}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};