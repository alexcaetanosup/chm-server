import { gerarReciboPDF } from "../../services/reciboPdfService";
import styles from "../Lancamentos/Lancamentos.module.css";

interface Props {
    recibos: any[];
    onClose: () => void;
}

export const ModalReimpressao = ({ recibos, onClose }: Props) => {

    const imprimir = (rec: any) => {

        gerarReciboPDF(
            rec.parcelas,
            rec.dados,
            rec.paciente,
            rec.medico,
            rec.especialidade
        );

    };

    return (

        <div className={styles.modalOverlay}>

            <div className={styles.modalContent} style={{ maxWidth: "700px" }}>

                <div className={styles.modalHeader}>
                    <h2>Reimpressão de Recibos</h2>

                    <button onClick={onClose}>
                        Fechar
                    </button>
                </div>

                <div style={{ maxHeight: "250px", overflowY: "auto" }}>

                    <table className={styles.table}>

                        <thead>
                            <tr>
                                <th>Paciente</th>
                                <th>Médico</th>
                                <th>Data</th>
                                <th>Ação</th>
                            </tr>
                        </thead>

                        <tbody>

                            {recibos.map((rec: any, index) => (

                                <tr key={`${rec.NRVENDA}-${index}`}>

                                    <td>{rec.PACIENTE}</td>

                                    <td>{rec.MEDICO}</td>

                                    <td>
                                        {new Date(rec.DATATEND).toLocaleDateString("pt-BR")}
                                    </td>

                                    <td>

                                        <button
                                            className={styles.btnSecondary}
                                            onClick={() => imprimir(rec)}
                                        >
                                            Imprimir
                                        </button>

                                    </td>

                                </tr>

                            ))}

                        </tbody>

                    </table>

                </div>

            </div>

        </div>

    );
};




