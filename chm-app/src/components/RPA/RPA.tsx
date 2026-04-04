import axios from "axios";
import { useState } from "react";
import "./RPA.module.css";

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

    const executarRPA = async () => {
        setExecuting(true);
        setLogs(["🚀 Iniciando RPA...\n"]);
        setResultado(null);
        setStatus(null);

        try {
            const backendURL = process.env.REACT_APP_BACKEND_URL || "http://localhost:4000";
            const response = await axios.post(`${backendURL}/api/migrate`, {
                mongoUrl: process.env.REACT_APP_MONGO_URL || "",
            });

            if (response.data.sucesso) {
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
        <div className="rpa-container">
            <div className="rpa-header">
                <div className="rpa-header-content">
                    <h1>🤖 Migração Firebird → MongoDB</h1>
                    <p className="rpa-subtitle">Sincronize seus dados com segurança para o MongoDB Atlas</p>
                </div>
            </div>

            <div className="rpa-content">
                <div className={`rpa-card rpa-card-main ${status ? `rpa-card-${status}` : ""}`}>
                    <div className="rpa-info">
                        <div className="rpa-info-item">
                            <span className="info-label">Origem</span>
                            <span className="info-value">Firebird 2.5</span>
                        </div>
                        <div className="rpa-info-item">
                            <span className="info-label">Destino</span>
                            <span className="info-value">MongoDB Atlas</span>
                        </div>
                        <div className="rpa-info-item">
                            <span className="info-label">Status</span>
                            <span className={`info-value status-badge ${status || "pendente"}`}>
                                {status === "sucesso" && "✅ Sucesso"}
                                {status === "erro" && "❌ Erro"}
                                {!status && "⏳ Pronto"}
                            </span>
                        </div>
                    </div>

                    <div className="rpa-button-group">
                        <button
                            className={`rpa-button ${executing ? "loading" : ""} ${status ? status : ""}`}
                            onClick={executarRPA}
                            disabled={executing}
                        >
                            {executing ? (
                                <>
                                    <span className="spinner"></span>
                                    Processando migração...
                                </>
                            ) : (
                                <>
                                    <span className="icon">🚀</span>
                                    {status === "sucesso" ? "Migração Concluída" : "Executar Migração"}
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {resultado && (
                    <div className="rpa-results">
                        <h3 className="rpa-results-title">📊 Resumo da Migração</h3>
                        <div className="rpa-results-grid">
                            <div className="rpa-result-card">
                                <div className="result-icon">📋</div>
                                <div className="result-info">
                                    <div className="result-label">Especialidades</div>
                                    <div className="result-value">{resultado.especialidades?.contagem || 0}</div>
                                </div>
                            </div>
                            <div className="rpa-result-card">
                                <div className="result-icon">👥</div>
                                <div className="result-info">
                                    <div className="result-label">Pacientes</div>
                                    <div className="result-value">{resultado.pacientes?.contagem || 0}</div>
                                </div>
                            </div>
                            <div className="rpa-result-card">
                                <div className="result-icon">🏥</div>
                                <div className="result-info">
                                    <div className="result-label">Médicos</div>
                                    <div className="result-value">{resultado.medicos?.contagem || 0}</div>
                                </div>
                            </div>
                            <div className="rpa-result-card">
                                <div className="result-icon">💰</div>
                                <div className="result-info">
                                    <div className="result-label">Lançamentos</div>
                                    <div className="result-value">{resultado.parcelam?.contagem || 0}</div>
                                </div>
                            </div>
                            <div className="rpa-result-card">
                                <div className="result-icon">👤</div>
                                <div className="result-info">
                                    <div className="result-label">Usuários</div>
                                    <div className="result-value">{resultado.usuarios?.contagem || 0}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {logs.length > 0 && (
                    <div className="rpa-logs">
                        <h3 className="rpa-logs-title">📜 Logs da Migração</h3>
                        <div className="rpa-logs-content">
                            {logs.map((log, idx) => (
                                <div key={idx} className="log-line">
                                    {log}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
