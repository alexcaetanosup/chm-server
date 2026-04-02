import React, { useEffect, useState } from "react";
import "./Dashboard.css";

import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";

interface Lancamento {
    DATATEND: string;
    VLPARCELA: number;
    ABERTO: string;

    MEDICO?: string;
    PACIENTE?: string;
    PROCEDIMENTO?: string;
}

interface Totais {
    honorarios: number;
    recebido: number;
    aberto: number;
    quantidade: number;
}

export const Dashboard: React.FC = () => {

    const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
    const [dadosFiltrados, setDadosFiltrados] = useState<Lancamento[]>([]);

    const [dataInicio, setDataInicio] = useState("");
    const [dataFim, setDataFim] = useState("");

    const [indicadores, setIndicadores] = useState({
        medicos: 0,
        pacientes: 0,
        procedimentos: 0,
        recebimentos: 0
    });

    const [totais, setTotais] = useState<Totais>({
        honorarios: 0,
        recebido: 0,
        aberto: 0,
        quantidade: 0,
    });

    const [graficos, setGraficos] = useState({
        pizza: true,
        mensal: false,
        linha: false,
        area: false,
        quantidade: false
    });

    // =========================
    // FORMATADORES
    // =========================

    const formatarMoeda = (valor: number) => {
        return valor.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const tooltipMoeda = (valor: number) => {
        return `R$ ${formatarMoeda(valor)}`;
    };

    const tooltipFormatter = (value: any): React.ReactNode => {
        if (value === undefined || value === null) return "";
        return tooltipMoeda(Number(value));
    };

    const tickFormatterMoeda = (value: any): string => {
        if (value === undefined || value === null) return "";
        return formatarMoeda(Number(value));
    };

    // =========================
    // FUNÇÕES
    // =========================

    const calcularTotais = (dados: Lancamento[]) => {
        const honorarios = dados.reduce((t, l) => t + l.VLPARCELA, 0);
        const recebido = dados
            .filter((l) => l.ABERTO === "N")
            .reduce((t, l) => t + l.VLPARCELA, 0);

        const aberto = honorarios - recebido;

        setTotais({
            honorarios,
            recebido,
            aberto,
            quantidade: dados.length
        });
    };

    const calcularIndicadores = (dados: Lancamento[]) => {
        const medicos = new Set<string>();
        const pacientes = new Set<string>();
        const procedimentos = new Set<string>();

        let recebimentos = 0;

        dados.forEach((l) => {
            if (l.MEDICO) medicos.add(l.MEDICO);
            if (l.PACIENTE) pacientes.add(l.PACIENTE);
            if (l.PROCEDIMENTO) procedimentos.add(l.PROCEDIMENTO);

            if (l.ABERTO === "N") recebimentos++;
        });

        setIndicadores({
            medicos: medicos.size,
            pacientes: pacientes.size,
            procedimentos: procedimentos.size,
            recebimentos
        });
    };

    const carregarLancamentos = async () => {
        const resp = await fetch("http://localhost:4000/api/lancamentos");
        const dados = await resp.json();

        const normalizados = dados.map((l: any) => ({
            DATATEND: l.DATATEND,
            VLPARCELA: Number(l.VLPARCELA || 0),
            ABERTO: l.ABERTO,
            MEDICO: l.MEDICO,
            PACIENTE: l.PACIENTE,
            PROCEDIMENTO: l.PROCEDIMENTO
        }));

        setLancamentos(normalizados);
        setDadosFiltrados(normalizados);

        calcularTotais(normalizados);
        calcularIndicadores(normalizados);
    };

    useEffect(() => {
        carregarLancamentos();
    }, []);

    // =========================
    // FILTRO
    // =========================

    const filtrar = () => {
        const filtrados = lancamentos.filter((l) => {

            if (!l.DATATEND) return false;

            const data = new Date(l.DATATEND);

            if (dataInicio) {
                const inicio = new Date(dataInicio);
                if (data < inicio) return false;
            }

            if (dataFim) {
                const fim = new Date(dataFim);
                if (data > fim) return false;
            }

            return true;
        });

        setDadosFiltrados(filtrados);
        calcularTotais(filtrados);
        calcularIndicadores(filtrados);
    };

    const limpar = () => {
        setDadosFiltrados(lancamentos);
        calcularTotais(lancamentos);
        calcularIndicadores(lancamentos);
        setDataInicio("");
        setDataFim("");
    };

    const toggle = (tipo: string) => {
        setGraficos((prev) => ({
            ...prev,
            [tipo]: !prev[tipo as keyof typeof prev]
        }));
    };

    // =========================
    // DADOS GRÁFICOS
    // =========================

    const gerarDadosMensais = () => {
        const mapa: any = {};

        dadosFiltrados.forEach((l) => {
            const d = new Date(l.DATATEND);
            const mes =
                (d.getMonth() + 1).toString().padStart(2, "0") +
                "/" +
                d.getFullYear();

            if (!mapa[mes]) {
                mapa[mes] = { mes, valor: 0, quantidade: 0 };
            }

            mapa[mes].valor += l.VLPARCELA;
            mapa[mes].quantidade += 1;
        });

        return Object.values(mapa);
    };

    const pieData = [
        { name: "Recebido", value: totais.recebido },
        { name: "Em Aberto", value: totais.aberto }
    ];

    const COLORS = ["#16a34a", "#ef4444"];
    const dadosMensais = gerarDadosMensais();

    // =========================
    // JSX
    // =========================

    return (
        <div className="dashboard">
            <h2>Painel Financeiro</h2>

            <div className="filtros">
                <div>
                    <label>Data Inicial</label>
                    <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                </div>

                <div>
                    <label>Data Final</label>
                    <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
                </div>

                <button onClick={filtrar}>Filtrar</button>
                <button onClick={limpar}>Limpar</button>
            </div>

            <div className="cards">
                <div className="card"><h3>Honorários</h3><p>R$ {formatarMoeda(totais.honorarios)}</p></div>
                <div className="card"><h3>Recebido</h3><p>R$ {formatarMoeda(totais.recebido)}</p></div>
                <div className="card"><h3>Em Aberto</h3><p>R$ {formatarMoeda(totais.aberto)}</p></div>
                <div className="card"><h3>Lançamentos</h3><p>{totais.quantidade}</p></div>
                <div className="card"><h3>Médicos</h3><p>{indicadores.medicos}</p></div>
                <div className="card"><h3>Pacientes</h3><p>{indicadores.pacientes}</p></div>
                <div className="card"><h3>Procedimentos</h3><p>{indicadores.procedimentos}</p></div>
                <div className="card"><h3>Recebimentos</h3><p>{indicadores.recebimentos}</p></div>
            </div>

            <div className="dashboardGrid">
                <div className="graficosArea">

                    {graficos.pizza && (
                        <div className="grafico">
                            <h3>Recebido vs Em Aberto</h3>
                            <ResponsiveContainer width="100%" height={320}>
                                <PieChart>
                                    <Pie data={pieData} dataKey="value" outerRadius={120} label>
                                        {pieData.map((entry, index) => (
                                            <Cell key={index} fill={COLORS[index]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={tooltipFormatter} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {graficos.mensal && (
                        <div className="grafico">
                            <h3>Faturamento Mensal</h3>
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={dadosMensais}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="mes" />
                                    <YAxis tickFormatter={tickFormatterMoeda} />
                                    <Tooltip formatter={tooltipFormatter} />
                                    <Bar dataKey="valor" fill="#2563eb" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {graficos.linha && (
                        <div className="grafico">
                            <h3>Evolução Financeira</h3>
                            <ResponsiveContainer width="100%" height={320}>
                                <LineChart data={dadosMensais}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="mes" />
                                    <YAxis tickFormatter={tickFormatterMoeda} />
                                    <Tooltip formatter={tooltipFormatter} />
                                    <Line type="monotone" dataKey="valor" stroke="#16a34a" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {graficos.area && (
                        <div className="grafico">
                            <h3>Distribuição Financeira</h3>
                            <ResponsiveContainer width="100%" height={320}>
                                <AreaChart data={dadosMensais}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="mes" />
                                    <YAxis tickFormatter={tickFormatterMoeda} />
                                    <Tooltip formatter={tooltipFormatter} />
                                    <Area type="monotone" dataKey="valor" fill="#60a5fa" stroke="#2563eb" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {graficos.quantidade && (
                        <div className="grafico">
                            <h3>Quantidade de Lançamentos</h3>
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={dadosMensais}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="mes" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="quantidade" fill="#9333ea" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                </div>

                <div className="painelDireita">
                    <h3>Gráficos</h3>

                    <label><input type="checkbox" checked={graficos.pizza} onChange={() => toggle("pizza")} /> Recebido vs Aberto</label>
                    <label><input type="checkbox" checked={graficos.mensal} onChange={() => toggle("mensal")} /> Faturamento Mensal</label>
                    <label><input type="checkbox" checked={graficos.linha} onChange={() => toggle("linha")} /> Evolução Financeira</label>
                    <label><input type="checkbox" checked={graficos.area} onChange={() => toggle("area")} /> Distribuição Financeira</label>
                    <label><input type="checkbox" checked={graficos.quantidade} onChange={() => toggle("quantidade")} /> Qtde Lançamentos</label>
                </div>
            </div>
        </div>
    );
};





// ========================================================


// import React, { useEffect, useState } from "react";
// import "./Dashboard.css";
// interface Lancamento {
//     DATATEND: string;
//     VLPARCELA: number;
//     ABERTO: string;
// }

// interface Totais {
//     honorarios: number;
//     recebido: number;
//     aberto: number;
//     quantidade: number;
// }

// export const Dashboard: React.FC = () => {

//     const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
//     const [dataInicio, setDataInicio] = useState("");
//     const [dataFim, setDataFim] = useState("");

//     const [totais, setTotais] = useState<Totais>({
//         honorarios: 0,
//         recebido: 0,
//         aberto: 0,
//         quantidade: 0
//     });

//     useEffect(() => {
//         carregarLancamentos();
//     }, []);

//     const carregarLancamentos = async () => {

//         try {

//             const resp = await fetch("http://localhost:4000/api/lancamentos");
//             const dados = await resp.json();

//             const normalizados: Lancamento[] = dados.map((l: any) => ({
//                 DATATEND: l.DATATEND,
//                 VLPARCELA: Number(l.VLPARCELA || 0),
//                 ABERTO: l.ABERTO
//             }));

//             setLancamentos(normalizados);
//             calcularTotais(normalizados);

//         } catch (erro) {
//             console.error("Erro ao carregar lançamentos:", erro);
//         }
//     };

//     const calcularTotais = (dados: Lancamento[]) => {

//         const totalHonorarios = dados.reduce(
//             (total, l) => total + Number(l.VLPARCELA || 0),
//             0
//         );

//         const totalRecebido = dados
//             .filter(l => l.ABERTO === "N")
//             .reduce(
//                 (total, l) => total + Number(l.VLPARCELA || 0),
//                 0
//             );

//         const totalAberto = totalHonorarios - totalRecebido;

//         setTotais({
//             honorarios: totalHonorarios,
//             recebido: totalRecebido,
//             aberto: totalAberto,
//             quantidade: dados.length
//         });
//     };

//     const filtrarDashboard = () => {

//         const filtrados = lancamentos.filter((l) => {

//             if (!l.DATATEND) return false;

//             const dataLanc = new Date(l.DATATEND);

//             if (dataInicio) {
//                 const inicio = new Date(dataInicio);
//                 if (dataLanc < inicio) return false;
//             }

//             if (dataFim) {
//                 const fim = new Date(dataFim);
//                 if (dataLanc > fim) return false;
//             }

//             return true;
//         });

//         calcularTotais(filtrados);
//     };

//     return (

//         <div className="dashboard">

//             <h2>Dashboard</h2>

//             <div className="filtros">

//                 <div className="campo">
//                     <label>Data Inicial</label>
//                     <input
//                         type="date"
//                         value={dataInicio}
//                         onChange={(e) => setDataInicio(e.target.value)}
//                     />
//                 </div>

//                 <div className="campo">
//                     <label>Data Final</label>
//                     <input
//                         type="date"
//                         value={dataFim}
//                         onChange={(e) => setDataFim(e.target.value)}
//                     />
//                 </div>

//                 <button onClick={filtrarDashboard}>
//                     Filtrar
//                 </button>

//             </div>

//             <div className="cards">

//                 <div className="card">
//                     <h3>Honorários</h3>
//                     <p>R$ {totais.honorarios.toFixed(2)}</p>
//                 </div>

//                 <div className="card">
//                     <h3>Recebido</h3>
//                     <p>R$ {totais.recebido.toFixed(2)}</p>
//                 </div>

//                 <div className="card">
//                     <h3>Em Aberto</h3>
//                     <p>R$ {totais.aberto.toFixed(2)}</p>
//                 </div>

//                 <div className="card">
//                     <h3>Lançamentos</h3>
//                     <p>{totais.quantidade}</p>
//                 </div>

//             </div>

//         </div>
//     );
// };