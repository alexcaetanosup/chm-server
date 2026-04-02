import React, { useEffect, useState } from "react";
import * as Icons from "react-icons/fa";
// Ajuste o caminho abaixo conforme sua estrutura de pastas
import "../Medicos//medicosList.module.css";

const FaPlus = Icons.FaPlus as any;
const FaSearch = Icons.FaSearch as any;
const FaEdit = Icons.FaEdit as any;
const FaTrash = Icons.FaTrash as any;

interface Paciente {
    CDPACIENTE: number;
    DCPACIENTE: string;
    CPF: string;
    CELULAR: string;
}

const PacienteList: React.FC = () => {
    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [busca, setBusca] = useState("");
    const [loading, setLoading] = useState(false);

    const carregarPacientes = async (nomeFiltro = "") => {
        setLoading(true);
        try {
            const url = nomeFiltro
                ? `http://localhost:4000/api/pacientes?nome=${nomeFiltro}`
                : `http://localhost:4000/api/pacientes`;
            const response = await fetch(url);
            const data = await response.json();
            setPacientes(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => carregarPacientes(busca), 300);
        return () => clearTimeout(timer);
    }, [busca]);

    const excluirPaciente = async (id: number, nome: string) => {
        if (window.confirm(`Excluir paciente: ${nome}?`)) {
            const response = await fetch(`http://localhost:4000/api/pacientes/${id}`, { method: "DELETE" });
            if (response.ok) carregarPacientes(busca);
            else alert("Erro ao excluir. Verifique se há lançamentos vinculados.");
        }
    };

    return (
        <div className="medico-container">
            <div className="medico-header">
                <h1>Pacientes</h1>
                <button className="btn-novo"><FaPlus /> NOVO PACIENTE</button>
            </div>
            <div className="busca-wrapper">
                <div className="busca-input-container">
                    <FaSearch className="icon-lupa" />
                    <input
                        type="text"
                        placeholder="Pesquisar paciente..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                    />
                </div>
            </div>
            <div className="tabela-wrapper">
                <table className="tabela-premium">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>NOME</th>
                            <th>CPF</th>
                            <th>CELULAR</th>
                            <th style={{ textAlign: "center" }}>AÇÕES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pacientes.map(p => (
                            <tr key={p.CDPACIENTE}>
                                <td>{p.CDPACIENTE}</td>
                                <td className="nome-destaque">{p.DCPACIENTE}</td>
                                <td>{p.CPF}</td>
                                <td>{p.CELULAR}</td>
                                <td className="acoes-botoes">
                                    <button className="btn-acao edit"><FaEdit /></button>
                                    <button className="btn-acao delete" onClick={() => excluirPaciente(p.CDPACIENTE, p.DCPACIENTE)}><FaTrash /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {loading && <div style={{ textAlign: 'center', padding: '10px' }}>Buscando...</div>}
            </div>
        </div>
    );
};

export default PacienteList;