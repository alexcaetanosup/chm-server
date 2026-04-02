import React, { useState } from "react";
import "./AICHM.css";

interface Message {
    role: "user" | "ai";
    text: string;
}

export const AICHM: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    const callAI = async (prompt: string) => {
        try {
            setLoading(true);

            const response = await fetch("http://localhost:4000/api/ai", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ prompt }),
            });

            if (!response.ok) {
                throw new Error("Erro na resposta da API");
            }

            const data = await response.json();

            const aiText =
                data?.text || "Sem resposta da IA.";

            return aiText;
        } catch (error) {
            console.error("Erro na API:", error);
            return "Erro ao comunicar com a IA.";
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { role: "user", text: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");

        const aiResponse = await callAI(input);

        const aiMessage: Message = { role: "ai", text: aiResponse };
        setMessages((prev) => [...prev, aiMessage]);
    };

    const handleClear = () => {
        setMessages([]);
        setInput("");
    };

    return (
        <>
            <div className="ai-component-wrapper" style={{ position: 'fixed', bottom: '28px', right: '28px', zIndex: 99999 }}>
                <style>{`
                @keyframes ai-pulse-animation {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(24, 119, 242, 0.6); }
                    70% { transform: scale(1.1); box-shadow: 0 0 0 15px rgba(24, 119, 242, 0); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(24, 119, 242, 0); }
                }
                .ai-main-btn {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    text-decoration: none !important;
                    cursor: pointer;
                    background: none;
                    border: none;
                    padding: 0;
                }
                .ai-circle-btn {
                    width: 60px;
                    height: 60px;
                    background-color: #1877f2;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                    animation: ai-pulse-animation 2s infinite;
                    transition: all 0.3s ease;
                    color: white;
                }
                .ai-circle-btn:hover {
                    transform: scale(1.15);
                    background-color: #1464d8;
                }
                .ai-text-label {
                    background-color: rgba(0, 0, 0, 0.85);
                    color: white;
                    padding: 8px 14px;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: bold;
                    opacity: 0;
                    transform: translateX(10px);
                    transition: all 0.3s ease;
                    pointer-events: none;
                    white-space: nowrap;
                    border: 1px solid rgba(255,255,255,0.1);
                    backdrop-filter: blur(4px);
                }
                .ai-main-btn:hover .ai-text-label {
                    opacity: 1;
                    transform: translateX(0);
                }
            `}</style>

                <div className="ai-main-btn" onClick={() => setOpen((v) => !v)}>
                    <span className="ai-text-label">
                        Dúvidas?<br />
                        Fale c/ IA do CHM
                    </span>
                    <div className="ai-circle-btn">
                        {open ? (
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        ) : (
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        )}
                    </div>
                </div>
            </div>

            {/* Painel do chat */}
            {open && (
                <div className="ai-chat-container">
                    <div className="chat-header">
                        <span>Assistente CHM</span>
                        <button className="chat-clear" onClick={handleClear} title="Limpar conversa">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                                <path d="M10 11v6M14 11v6" />
                            </svg>
                        </button>
                    </div>

                    <div className="chat-box">
                        {messages.map((msg, index) => (
                            <div key={index} className={msg.role === "user" ? "msg-user" : "msg-ai"}>
                                {msg.text}
                            </div>
                        ))}
                        {loading && <div className="msg-ai">Pensando...</div>}
                    </div>

                    <div className="input-area">
                        <input
                            type="text"
                            placeholder="Digite sua mensagem..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        />
                        <button onClick={handleSend} disabled={loading}>
                            Enviar
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};


//     return (
//         <>
//             {/* Botão flutuante */}
//             <div className="ai-label-wrapper">
//                 <div className="ai-text-label">
//                     Alguma dúvida? <br />
//                     Pergunte à IA
//                 </div>
//                 <button
//                     className="ai-chat-toggle"
//                     onClick={() => setOpen((v) => !v)}
//                     aria-label="Abrir assistente"
//                 ></button>
//             </div>
//             <button
//                 className="ai-chat-toggle"
//                 onClick={() => setOpen((v) => !v)}
//                 aria-label="Abrir assistente"
//             >
//                 {open ? (
//                     <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
//                         <line x1="18" y1="6" x2="6" y2="18" />
//                         <line x1="6" y1="6" x2="18" y2="18" />
//                     </svg>
//                 ) : (
//                     <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//                         <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
//                     </svg>
//                 )}
//             </button>

//             {/* Painel do chat */}
//             {open && (
//                 <div className="ai-chat-container">
//                     {/* Adicione este header: */}
//                     <div className="chat-header">
//                         <span>Assistente Alex para o CHM</span>
//                         <button className="chat-clear" onClick={handleClear} title="Limpar conversa">
//                             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//                                 <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
//                                 <path d="M10 11v6M14 11v6" />
//                             </svg>
//                         </button>
//                     </div>
//                     <div className="chat-box">
//                         {messages.map((msg, index) => (
//                             <div
//                                 key={index}
//                                 className={msg.role === "user" ? "msg-user" : "msg-ai"}
//                             >
//                                 {msg.text}
//                             </div>
//                         ))}

//                         {loading && <div className="msg-ai">Pensando...</div>}
//                     </div>

//                     <div className="input-area">
//                         <input
//                             type="text"
//                             placeholder="Digite sua mensagem..."
//                             value={input}
//                             onChange={(e) => setInput(e.target.value)}
//                             onKeyDown={(e) => e.key === "Enter" && handleSend()}
//                         />
//                         <button onClick={handleSend} disabled={loading}>
//                             Enviar
//                         </button>
//                     </div>
//                 </div>
//             )}
//         </>
//     );
// };
