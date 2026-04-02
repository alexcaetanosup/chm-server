export interface Pacientes {
  id: number;
  nome: string;
  cpf: string;
  dataNascimento: string;
  telefone: string;
  convenio?: string;
}

export interface Medicos {
  id: number;
  nome: string;
  crm: string;
  especialidadeId: number;
  telefone: string;
  status: 'Ativo' | 'Inativo';
}

export interface Especialidades {
  id: number;
  descricao: string;
}

export interface Lancamentos {
  id: number;
  descricao: string;
  valor: number;
  dataVencimento: string;
  tipo: 'Receita' | 'Despesa';
  status: 'Pago' | 'Pendente';
  pacienteId?: number;
}