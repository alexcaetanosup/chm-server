/**
 * ============================================================
 * 🤖 COMPONENTE REACT: RPA FIREBIRD → MONGODB
 * ============================================================
 * Componente que permite executar a migração via interface
 * com status em tempo real
 * ============================================================
 */

import axios from "axios";
import { useState } from "react";
import "./RPA.module.css";

export default function RPA() {
    const [executing, setExecuting] = useState(false);
    const [status, setStatus] = useState(null);
    const [logs, setLogs] = useState([]);
    const [resultado, setResultado] = useState(null);

    // ============================================================
    // Executar RPA
    // ============================================================
    const executarRPA = async () => {
        setExecuting(true);
        setLogs(["🚀 Iniciando RPA...\n"]);
        setResultado(null);

        try {
            const response = await axios.post("/api/migrate", {
                mongoUrl: process.env.REACT_APP_MONGO_URL || "",
            });

            if (response.data.sucesso) {
                setStatus("sucesso");
                setLogs((prev) => [
                    ...prev,
                    `\n✅ Migração concluída!\n`,
                    `📊 Resultado:\n`,
                    `   • Especialidades: ${response.data.resultados.especialidades}\n`,
                    `   • Pacientes: ${response.data.resultados.pacientes}\n`,
                    `   • Médicos: ${response.data.resultados.medicos}\n`,
                    `   • Lançamentos: ${response.data.resultados.parcelam}\n`,
                    `   ⏱️  Tempo: ${response.data.tempo}s\n`,
                ]);
                setResultado(response.data.resultados);
            } else {
                setStatus("erro");
                setLogs((prev) => [...prev, `\n❌ Erro: ${response.data.erro}\n`]);
            }
        } catch (err) {
            setStatus("erro");
            setLogs((prev) => [
                ...prev,
                `\n❌ Erro de conexão: ${err.message}\n`,
            ]);
            console.error("Erro RPA:", err);
        } finally {
            setExecuting(false);
        }
    };

    return (
        <div className="rpa-container">
            <div className="rpa-header">
                <h2>🤖 RPA - Migração Firebird → MongoDB</h2>
                <p>Sincronize seus dados do banco Firebird para MongoDB Atlas</p>
            </div>

            <div className="rpa-content">
                {/* Botão Executar */}
                <div className="rpa-button-group">
                    <button
                        className={`rpa-button ${executing ? "loading" : ""} ${status ? status : ""
                            }`}
                        onClick={executarRPA}
                        disabled={executing}
                    >
                        {executing ? (
                            <>
                                <span className="spinner"></span>
                                Executando...
                            </>
                        ) : (
                            <>
                                <span className="icon">🤖</span>
                                Executar Migração
                            </>
                        )}
                    </button>
                </div>

                {/* Status */}
                {status && (
                    <div className={`rpa-status status-${status}`}>
                        {status === "sucesso" ? (
                            <>
                                <span className="status-icon">✅</span>
                                <span>Migração concluída com sucesso!</span>
                            </>
                        ) : (
                            <>
                                <span className="status-icon">❌</span>
                                <span>Erro durante a migração</span>
                            </>
                        )}
                    </div>
                )}

                {/* Logs */}
                {logs.length > 0 && (
                    <div className="rpa-logs">
                        <h3>📋 Logs:</h3>
                        <div className="logs-content">
                            {logs.map((log, i) => (
                                <pre key={i}>{log}</pre>
                            ))}
                        </div>
                    </div>
                )}

                {/* Resultado */}
                {resultado && (
                    <div className="rpa-resultado">
                        <h3>📊 Resumo da Migração:</h3>
                        <div className="resultado-grid">
                            <div className="resultado-item">
                                <span className="item-label">Especialidades</span>
                                <span className="item-value">
                                    {resultado.especialidades?.contagem || 0}
                                </span>
                            </div>
                            <div className="resultado-item">
                                <span className="item-label">Pacientes</span>
                                <span className="item-value">
                                    {resultado.pacientes?.contagem || 0}
                                </span>
                            </div>
                            <div className="resultado-item">
                                <span className="item-label">Médicos</span>
                                <span className="item-value">
                                    {resultado.medicos?.contagem || 0}
                                </span>
                            </div>
                            <div className="resultado-item">
                                <span className="item-label">Lançamentos</span>
                                <span className="item-value">
                                    {resultado.parcelam?.contagem || 0}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
