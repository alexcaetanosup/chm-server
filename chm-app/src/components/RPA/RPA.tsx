import axios from "axios";
import { useState } from "react";
import styles from "./RPA.module.css";

interface MigrationResult {
    especialidades?: { contagem: number };
    pacientes?: { contagem: number };
    medicos?: { contagem: number };
    parcelam?: { contagem: number }; // LANÇAMENTOS
    lancamentos?: { contagem: number }; // Alias para PARCELAM
    usuarios?: { contagem: number };
}

type StatusType = "sucesso" | "erro" | null;

export default function RPA() {
    const [executing, setExecuting] = useState<boolean>(false);
    const [status, setStatus] = useState<StatusType>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [resultado, setResultado] = useState<MigrationResult | null>(null);
    const [tempoExecucao, setTempoExecucao] = useState<string>("");

    const executarRPA = async () => {
        setExecuting(true);
        setLogs(["🚀 Iniciando RPA...\n"]);
        setResultado(null);
        setStatus(null);
        setTempoExecucao("");

        const inicioTempo = Date.now();

        try {
            const backendURL = process.env.REACT_APP_BACKEND_URL || "http://localhost:4000";
            const response = await axios.post(`${backendURL}/api/migrate`, {
                mongoUrl: process.env.REACT_APP_MONGO_URL || "",
            });

            if (response.data.sucesso) {
                const tempoTotal = ((Date.now() - inicioTempo) / 1000).toFixed(2);
                setTempoExecucao(tempoTotal);
                setStatus("sucesso");
                setLogs((prev) => [...prev, `\n✅ Migração concluída com sucesso!\n`]);
                setResultado(response.data.resultados);
            } else {
                setStatus("erro");
                setLogs((prev) => [...prev, `\n❌ Erro: ${response.data.erro}\n`]);
            }
        } catch (err: any) {
            setStatus("erro");
            const errorMessage = err?.message || "Erro desconhecido";
            setLogs((prev) => [...prev, `\n❌ Erro de conexão: ${errorMessage}\n`]);
            console.error("Erro RPA:", err);
        } finally {
            setExecuting(false);
        }
    };

    return (
        <div className={styles["rpaContainer"]}>
            <div className={styles["rpa-header"]}>
                <div className={styles["rpa-header-icon"]}>🤖</div>
                <div className={styles["rpa-header-content"]}>
                    <h1>Migração Firebird → MongoDB</h1>
                    <p>Sincronize seus dados com segurança para a nuvem</p>
                </div>
            </div>

            <div className={styles["rpaContent"]}>
                {/* INFO CARDS - Origem, Destino, Status */}
                <div className={styles["rpa-info-section"]} >
                    <div className={styles["info-card"]}>
                        <div className={styles["info-icon"]}>📂</div>
                        <div className={styles["info-text"]}>
                            <span className={styles["info-label"]}>Origem</span>
                            <span className={styles["info-value"]}>Firebird 2.5</span>
                        </div>
                    </div>
                    <div className={styles["info-arrow"]}>→</div>
                    <div className={styles["info-card"]}>
                        <div className={styles["info-icon"]}>☁️</div>
                        <div className={styles["info-text"]}>
                            <span className={styles["info-label"]}>Destino</span>
                            <span className={styles["info-value"]}>MongoDB Atlas</span>
                        </div>
                    </div>
                    <div className={styles["info-arrow"]}>•</div>
                    <div className={`${styles["info-card"]} ${styles["status-card"]} ${status ? styles[status] : ""}`}>
                        <div className={styles["info-icon"]}>{status === "sucesso" ? "✅" : status === "erro" ? "❌" : "⏳"}</div>
                        <div className={styles["info-text"]}>
                            <span className={styles["info-label"]}>Status</span>
                            <span className={styles["info-value"]}>
                                {status === "sucesso" && "Sucesso"}
                                {status === "erro" && "Erro"}
                                {!status && "Pronto"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ACTION BUTTON */}
                <div className={styles["rpa-action"]}>
                    <button
                        className={`${styles["rpa-button"]} ${executing ? styles["loading"] : ""} ${status ? styles[status] : ""}`}
                        onClick={executarRPA}
                        disabled={executing}
                    >
                        {executing ? (
                            <>
                                <span className={styles["spinner"]}></span>
                                Processando...
                            </>
                        ) : (
                            <>
                                <span className={styles["icon"]}>🚀</span>
                                {status === "sucesso" ? "Migração Concluída" : "Executar Migração"}
                            </>
                        )}
                    </button>
                </div>

                {/* RESULTADOS - Grid de Estatísticas */}
                {resultado && (
                    <div className={styles["rpa-stats-section"]}>
                        <h2 className={styles["section-title"]}>📊 Resumo da Migração</h2>
                        <div className={styles["stats-grid"]}>
                            <div className={`$styles["stat-card"]} ${styles["especialidades"]}`}>
                                <div className={styles["stat-icon"]}>📋</div>
                                <div className={styles["stat-value"]}>{resultado.especialidades?.contagem || 0}</div>
                                <div className={styles["stat-label"]}>Especialidades</div>
                            </div>

                            {/* <div className={styles["stat-card pacientes"]}> */}
                            <div className={`${styles["stat-card pacientes"]} ${styles["pacientes"]}`}>
                                <div className={styles["stat-icon"]}>👥</div>
                                <div className={styles["stat-value"]}>{resultado.pacientes?.contagem || 0}</div>
                                <div className={styles["stat-label"]}>Pacientes</div>
                            </div>

                            <div className={`${styles["stat-card medicos"]} ${styles["medicos"]}`}>
                                <div className={styles["stat-icon"]}>🏥</div>
                                <div className={styles["stat-value"]}>{resultado.medicos?.contagem || 0}</div>
                                <div className={styles["stat-label"]}>Médicos</div>
                            </div>

                            <div className={`${styles["stat-card lancamentos"]} ${styles["lancamentos"]}`}>
                                <div className={styles["stat-icon"]}>💰</div>
                                <div className={styles["stat-value"]}>{resultado.parcelam?.contagem || resultado.lancamentos?.contagem || 0}</div>
                                <div className={styles["stat-label"]}>Lançamentos</div>
                            </div>

                            <div className={`${styles["stat-card usuarios"]} ${styles["usuarios"]}`}>
                                <div className={styles["stat-icon"]}>👤</div>
                                <div className={styles["stat-value"]}>{resultado.usuarios?.contagem || 0}</div>
                                <div className={styles["stat-label"]}>Usuários</div>
                            </div>

                            {tempoExecucao && (
                                <div className={`${styles["stat-card tempo"]} ${styles["tempo"]}`}>
                                    <div className={styles["stat-icon"]}>⏱️</div>
                                    <div className={styles["stat-value"]}>{tempoExecucao}s</div>
                                    <div className={styles["stat-label"]}>Tempo Total</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* LOGS */}
                {logs.length > 0 && (
                    <div className={styles["rpa-logs-section"]}>
                        <h2 className={styles["section-title"]}>📜 Logs da Migração</h2>
                        <div className={styles["rpa-logs-content"]}>
                            {logs.map((log, idx) => (
                                <div key={idx} className={styles["log-line"]}>
                                    {log}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
