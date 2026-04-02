import { useEffect, useState } from "react";
import * as Icons from "react-icons/fa"; // Importação alternativa para facilitar o cast
import "./medicosList.module.css";

// Definindo os ícones com cast para evitar o erro TS2786
const FaPlus = Icons.FaPlus as any;
const FaSearch = Icons.FaSearch as any;
const FaEdit = Icons.FaEdit as any;
const FaTrash = Icons.FaTrash as any;

interface Medico {
    CDMEDICO: number;
    DCMEDICO: string;
    CRM: string;
    DCESPECIAL: string;
    CELULAR: string;
}

const MedicoList = () => {
    const [medicos, setMedicos] = useState<Medico[]>([]);
    const [busca, setBusca] = useState("");
    const [loading, setLoading] = useState(false);

    const carregarMedicos = async (nomeFiltro = "") => {
        setLoading(true);
        try {
            const url = nomeFiltro
                ? `http://localhost:4000/api/medicos?nome=${nomeFiltro}`
                : `http://localhost:4000/api/medicos`;

            const response = await fetch(url);
            const data = await response.json();
            setMedicos(data);
        } catch (error) {
            console.error("Erro ao buscar médicos:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            carregarMedicos(busca);
        }, 300);
        return () => clearTimeout(timer);
    }, [busca]);

    const excluirMedico = async (id: number, nome: string) => {
        if (window.confirm(`Deseja remover o profissional: ${nome}?`)) {
            try {
                const response = await fetch(`http://localhost:4000/api/medicos/${id}`, {
                    method: "DELETE",
                });

                if (response.ok) {
                    carregarMedicos(busca);
                } else {
                    const erro = await response.json();
                    alert(erro.error);
                }
            } catch (error) {
                alert("Erro ao conectar com o servidor.");
            }
        }
    };

    return (
        <div className="medico-container">
            <div className="medico-header">
                <h1>Médicos</h1>
                <button className="btn-novo">
                    <FaPlus /> NOVO MÉDICO
                </button>
            </div>

            <div className="busca-wrapper">
                <div className="busca-input-container">
                    <FaSearch className="icon-lupa" />
                    <input
                        type="text"
                        placeholder="Pesquisar por nome do profissional..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                    />
                </div>
            </div>

            <div className="tabela-wrapper">
                <table className="tabela-premium">
                    <thead>
                        <tr>
                            <th>ID SISTEMA</th>
                            <th>NOME DO PROFISSIONAL</th>
                            <th>CRM</th>
                            <th>ESPECIALIDADE</th>
                            <th>CELULAR</th>
                            <th style={{ textAlign: "center" }}>AÇÕES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {medicos.length > 0 ? (
                            medicos.map((medico) => (
                                <tr key={medico.CDMEDICO}>
                                    <td>{medico.CDMEDICO}</td>
                                    <td className="nome-destaque">{medico.DCMEDICO}</td>
                                    <td>{medico.CRM}</td>
                                    <td>{medico.DCESPECIAL}</td>
                                    <td>{medico.CELULAR}</td>
                                    <td className="acoes-botoes">
                                        <button className="btn-acao edit">
                                            <FaEdit />
                                        </button>
                                        <button
                                            className="btn-acao delete"
                                            onClick={() => excluirMedico(medico.CDMEDICO, medico.DCMEDICO)}
                                        >
                                            <FaTrash />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} style={{ textAlign: "center", padding: "20px" }}>
                                    {loading ? "Carregando..." : "Nenhum médico encontrado."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MedicoList;