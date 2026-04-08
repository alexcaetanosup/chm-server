import { Clock, Database, History, RefreshCcw, ShieldCheck } from 'lucide-react';
import React, { useState } from 'react';
import styles from './Backup.module.css';

export const Backup: React.FC = () => {
    const [status, setStatus] = useState<string>('Sistema pronto para backup do MongoDB Atlas.');
    const [loading, setLoading] = useState(false);

    const executarBackup = async (tipo: 'DIARIO' | 'MENSAL' | 'ANUAL') => {
        setLoading(true);
        setStatus(`Executando backup ${tipo} do MongoDB... Aguarde a conclusão.`);

        try {
            // ALTERADO: agora chama a rota do MongoDB
            const response = await fetch('http://localhost:4000/api/backup/mongodb', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo })
            });

            const data = await response.json();

            if (response.ok) {
                setStatus(`✅ Sucesso! Backup salvo em: ${data.arquivo}`);
                console.log('Backup gerado:', data);
            } else {
                setStatus(`❌ Erro: ${data.erro || 'Falha no servidor'}`);
            }
        } catch (err) {
            setStatus('❌ Erro de conexão com a API do sistema.');
            console.error('Erro:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Database size={32} color="#6366f1" />
                <div>
                    <h2>Gestão de Backup MongoDB Atlas</h2>
                    <small>Backup dos dados em JSON</small>
                </div>
            </header>

            <div className={styles.mainCard}>
                <div className={styles.statusBox}>
                    <strong>Status do Processo:</strong>
                    <p>{status}</p>
                </div>

                <div className={styles.gridBotoes}>
                    <button onClick={() => executarBackup('DIARIO')} className={styles.btn} disabled={loading}>
                        <Clock size={20} /> Backup Diário
                    </button>

                    <button onClick={() => executarBackup('MENSAL')} className={styles.btn} disabled={loading}>
                        <History size={20} /> Backup Mensal
                    </button>

                    <button onClick={() => executarBackup('ANUAL')} className={styles.btn} disabled={loading}>
                        <ShieldCheck size={20} /> Backup Anual
                    </button>
                </div>

                {loading && (
                    <div className={styles.loadingArea}>
                        <RefreshCcw className={styles.spin} size={30} />
                        <span>Processando backup do MongoDB Atlas...</span>
                    </div>
                )}
            </div>

            <div className={styles.alerta}>
                <p><strong>Onde os backups são salvos?</strong></p>
                <p>
                    <strong>Windows:</strong> <code>C:\WWW\Backups\MongoDB\ANO\MES\DIA\TIPO\BACKUP_CHM_MONGODB_HORAMINUTO.json</code>
                </p>
                <p>
                    <strong>Linux/AWS:</strong> <code>/home/ubuntu/CHM/backups/mongodb/ANO/MES/DIA/TIPO/BACKUP_CHM_MONGODB_HORAMINUTO.json</code>
                </p>
                <p><strong>Exemplo:</strong> <code>C:\WWW\Backups\MongoDB\2026\04\08\DIARIO\BACKUP_CHM_MONGODB_1430.json</code></p>
            </div>
        </div>
    );
};








// import { Clock, Database, History, RefreshCcw, ShieldCheck } from 'lucide-react';
// import React, { useState } from 'react';
// import styles from './Backup.module.css';

// export const Backup: React.FC = () => {
//     const [status, setStatus] = useState<string>('Sistema pronto para backup.');
//     const [loading, setLoading] = useState(false);

//     const executarBackup = async (tipo: 'DIARIO' | 'MENSAL' | 'ANUAL') => {
//         setLoading(true);
//         setStatus(`Executando GBAK (${tipo})... Aguarde a conclusão.`);

//         try {
//             const response = await fetch('http://localhost:4000/api/backup/firebird', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({ tipo })
//             });

//             const data = await response.json();

//             if (response.ok) {
//                 setStatus(`Sucesso! Arquivo salvo em: ${data.arquivo}`);
//             } else {
//                 setStatus(`Erro: ${data.erro || 'Falha no servidor'}`);
//             }
//         } catch (err) {
//             setStatus('Erro de conexão com a API do sistema.');
//         } finally {
//             setLoading(false);
//         }
//     };

//     return (
//         <div className={styles.container}>
//             <header className={styles.header}>
//                 <Database size={32} color="#6366f1" />
//                 <div>
//                     <h2>Gestão de Backup Firebird</h2>
//                     <small>Unidade Votorantim - CHM Sistemas</small>
//                 </div>
//             </header>

//             <div className={styles.mainCard}>
//                 <div className={styles.statusBox}>
//                     <strong>Status do Processo:</strong>
//                     <p>{status}</p>
//                 </div>

//                 <div className={styles.gridBotoes}>
//                     <button onClick={() => executarBackup('DIARIO')} className={styles.btn} disabled={loading}>
//                         <Clock size={20} /> Backup Diário
//                     </button>

//                     <button onClick={() => executarBackup('MENSAL')} className={styles.btn} disabled={loading}>
//                         <History size={20} /> Backup Mensal
//                     </button>

//                     <button onClick={() => executarBackup('ANUAL')} className={styles.btn} disabled={loading}>
//                         <ShieldCheck size={20} /> Backup Anual
//                     </button>
//                 </div>

//                 {loading && (
//                     <div className={styles.loadingArea}>
//                         <RefreshCcw className={styles.spin} size={30} />
//                         <span>Processando dump de dados Firebird (.FBK)...</span>
//                     </div>
//                 )}
//             </div>

//             <div className={styles.alerta}>
//                 <p><strong>Dica de Segurança:</strong> O Firebird exige o utilitário <code>gbak</code> para backups a quente. Nunca copie o arquivo .FDB manualmente enquanto o servidor estiver rodando para evitar corrupção de páginas.</p>
//             </div>
//         </div>
//     );
// };