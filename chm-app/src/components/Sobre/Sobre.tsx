import React from "react";
import styles from "./Sobre.module.css";

export const Sobre: React.FC = () => {
    return (
        <div className={styles.container}>

            <h1 className={styles.titulo}>Sobre</h1>

            <div className={styles.cards}>

                {/* CARD SISTEMA */}
                <div className={styles.card}>

                    <h2>CHM App</h2>

                    <p className={styles.descricao}>
                        O CHM App é um sistema desenvolvido para controle financeiro
                        de honorários profissionais, permitindo o registro de
                        lançamentos, acompanhamento de pagamentos e análise de dados
                        financeiros através de relatórios e dashboard. O sistema foi projetado com foco em simplicidade,
                        organização e produtividade.
                    </p>

                    <div className={styles.descricao}>
                        <strong>Tecnologias utilizadas:</strong>
                    </div>

                    <ul>
                        <li>React + TypeScript</li>
                        <li>Node.js</li>
                        <li>Express</li>
                        <li>CSS Modules</li>
                    </ul>

                    <section>
                        <h3>Principais Recursos</h3>
                        <ul>
                            <li>Cadastro de pacientes</li>
                            <li>Cadastro de médicos</li>
                            <li>Gerenciamento de especialidades</li>
                            <li>Controle de lançamentos financeiros</li>
                            <li>Relatórios gerenciais</li>
                            <li>Painel de indicadores (Dashboard)</li>
                        </ul>
                    </section>
                    <h3 className={styles.info}>
                        <strong>Versão:</strong> 1.0
                    </h3>

                </div>

                {/* ----------------------------------------------------------------------------------- */}

                {/* CARD DESENVOLVEDOR */}
                <div className={styles.card}>

                    <h2>Desenvolvedor</h2>

                    <div className={styles.autor}>

                        {/* 
                        <img src="../components/Img/Alex.png"
                            alt="Desenvolvedor"
                            className={styles.foto}
                        /> */}


                        <p className={styles.nome}>
                            <h2>ACSInfo</h2>
                            <h3>+55 (15) 99768-6416</h3>
                            <h3>Alex Caetano dos Santos</h3>
                        </p>
                    </div>

                    <p className={styles.descricao}>
                        Profissional responsável pelo desenvolvimento do sistema,
                        incluindo estrutura do backend, interface do usuário e
                        organização das funcionalidades do aplicativo.
                    </p>
                    <p>
                        Este projeto foi criado com foco em organização,
                        produtividade e controle financeiro no sistema CHM.
                    </p>

                    <div className={styles.info}>
                        <strong>Contato:</strong>
                    </div>

                    <ul className={styles.gridLinks}>
                        <li><a href="https://acsinfo.net.br/" target="_blank" rel="noopener noreferrer">Web Site</a></li>
                        <li><a href="mailto:alexcaetanosuporte@gmail.com" target="_blank">e-mail</a></li>
                        <li><a href="https://www.linkedin.com/in/alex-caetano-dos-santos" target="_blank">Linkedin</a></li>
                    </ul>

                    <footer className={styles.rodape}>© {new Date().getFullYear()} - Sistema CHM - Todos os direitos reservados</footer>
                </div>
            </div>
        </div >
    );
};



