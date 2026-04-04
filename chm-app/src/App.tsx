
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Columns3Cog,
  DatabaseBackup,
  DollarSign,
  FileText,
  Info,
  LayoutDashboard,
  Stethoscope,
  Users
} from 'lucide-react';
import React, { useState } from 'react';

// Importação do CSS
import './App.css';

// Importação dos componentes
import { AICHM } from './components/AICHM/AICHM';
import { Backup } from './components/Backup/Backup';
import { Dashboard } from './components/Dashboard/Dashboard';
import { Especialidades } from './components/Especialidades/Especialidades';
import { Lancamentos } from './components/Lancamentos/Lancamentos';
import { Medicos } from './components/Medicos/Medicos';
import { Pacientes } from './components/Pacientes/Pacientes';
import { RelatorioItens } from './components/Relatorios/RelatorioItens';
import { Relatorios } from './components/Relatorios/Relatorios';
import RPA from './components/RPA/RPA';
import { Sobre } from './components/Sobre/Sobre';
import WhatsAppButton from './components/WhatsApp/WhatsAppButton';

// DEFINIÇÃO GLOBAL DO NOME
export const APP_TITLE = "CHM - Caixa de Honorários Médicos";

const App: React.FC = () => {
  const [abaAtiva, setAbaAtiva] = useState('pacientes');
  const [relatoriosAberto, setRelatoriosAberto] = useState(true);

  const renderConteudo = () => {
    switch (abaAtiva) {
      case 'pacientes': return <Pacientes />;
      case 'medicos': return <Medicos />;
      case 'especialidades': return <Especialidades />;
      case 'lancamentos': return <Lancamentos />;
      case 'relatorios': return <Relatorios />;
      case 'relatorio-itens': return <RelatorioItens />;
      case 'dashboard': return <Dashboard />;
      case 'backup': return <Backup />;
      case 'rpa': return <RPA />;
      case 'sobre': return <Sobre />;
      default: return <Pacientes />;
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>{APP_TITLE.split(' - ')[0]} Gestão</h2>
          <p>{APP_TITLE.split(' - ')[1]}</p>
        </div>

        <nav>
          <ul className="nav-list">
            <MenuItem
              label="Pacientes"
              icon={<Users size={20} />}
              active={abaAtiva === 'pacientes'}
              onClick={() => setAbaAtiva('pacientes')}
            />
            <MenuItem
              label="Médicos"
              icon={<Stethoscope size={20} />}
              active={abaAtiva === 'medicos'}
              onClick={() => setAbaAtiva('medicos')}
            />
            <MenuItem
              label="Especialidades"
              icon={<ClipboardList size={20} />}
              active={abaAtiva === 'especialidades'}
              onClick={() => setAbaAtiva('especialidades')}
            />
            <MenuItem
              label="Financeiro"
              icon={<DollarSign size={20} />}
              active={abaAtiva === 'lancamentos'}
              onClick={() => setAbaAtiva('lancamentos')}
            />

            <li>
              <div
                className={`menu-item relatorios-button ${(abaAtiva.includes('relatorio')) ? 'active' : ''}`}
                onClick={() => setRelatoriosAberto(!relatoriosAberto)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FileText size={20} />
                  <span className="menu-item-label">Relatórios</span>
                </div>
                {relatoriosAberto ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>

              {relatoriosAberto && (
                <ul className="submenu-list">
                  <SubMenuItem
                    label="Painel Geral"
                    icon={<Columns3Cog size={18} />}
                    active={abaAtiva === 'relatorios'}
                    onClick={() => setAbaAtiva('relatorios')}
                  />
                  <SubMenuItem
                    label="Analítico Itens"
                    icon={<ClipboardList size={18} />}
                    active={abaAtiva === 'relatorio-itens'}
                    onClick={() => setAbaAtiva('relatorio-itens')}
                  />
                </ul>
              )}
            </li>
            <MenuItem
              label="Dashboard"
              icon={<LayoutDashboard size={20} />}
              active={abaAtiva === 'dashboard'}
              onClick={() => setAbaAtiva('dashboard')}
            />
            <MenuItem
              label="Backup"
              icon={<DatabaseBackup size={20} />}
              active={abaAtiva === 'backup'}
              onClick={() => setAbaAtiva('backup')}
            />
            {/* =============================================================
                🤖 MENU RPA - Migração Firebird → MongoDB
                ============================================================= */}
            <MenuItem
              label="🤖 RPA Migração"
              icon={<Zap size={20} />}
              active={abaAtiva === 'rpa'}
              onClick={() => setAbaAtiva('rpa')}
            />
            <MenuItem
              label="Sobre"
              icon={<Info size={20} />}
              active={abaAtiva === 'sobre'}
              onClick={() => setAbaAtiva('sobre')}
            />
          </ul>
        </nav>
      </aside>

      <main className="main-content">
        <div className="content-container">
          {renderConteudo()}
        </div>
      </main>
      <WhatsAppButton />
      <AICHM />
    </div>
  );
};

// Componentes Auxiliares
const MenuItem = ({ label, icon, active, onClick }: any) => (
  <li className={`menu-item ${active ? 'active' : ''}`} onClick={onClick}>
    {icon}
    <span className="menu-item-label">{label}</span>
  </li>
);

const SubMenuItem = ({ label, icon, active, onClick }: any) => (
  <li className={`submenu-item ${active ? 'active' : ''}`} onClick={onClick}>
    {icon}
    <span>{label}</span>
  </li>
);

export default App;
