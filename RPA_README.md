# 🤖 RPA: MIGRAÇÃO FIREBIRD → MONGODB

## 📋 O que é?

Sistema automático (RPA) que migra dados de um banco Firebird 2.5 para MongoDB, mantendo 100% da integridade dos dados.

---

## ✅ Como Funciona?

### FASE 1: Preparação

1. **Criar conta MongoDB Atlas**
   - Acesse: https://www.mongodb.com/cloud/atlas
   - Crie uma conta gratuita
   - Crie um cluster (free tier)
   - Gere uma connection string

2. **Configurar .env**
   ```bash
   cp .env.example .env
   # Edite .env e adicione:
   MONGODB_URL=mongodb+srv://usuario:senha@cluster.mongodb.net/chm
   ```

### FASE 2: Executar Migração

**Opção A: Via Interface (Recomendado)**

1. Abra a aplicação CHM
2. Clique em **"🤖 RPA Migração"** no menu
3. Clique em **"Executar Migração"**
4. Aguarde os logs...

**Opção B: Via Node.js (Programático)**

```bash
node -e "
const { executarMigracao } = require('./migrate-firebird-to-mongodb');
executarMigracao('mongodb+srv://...').then(r => console.log(r));
"
```

---

## 📊 O Que é Migrado?

✅ **Tabelas:**

- ESPECIALIDADE
- PACIENTE
- MEDICO
- PARCELAM (Lançamentos)

✅ **Dados:**

- Todos os campos são preservados
- IDs únicos mantidos
- Relacionamentos respeitados

---

## 🔄 Estrutura MongoDB

Após migração, os dados estarão em:

```
CHM
├── especialidades
│   ├── CDESPECIAL (ID)
│   └── DCESPECIAL (Nome)
├── pacientes
│   ├── CDPACIENTE (ID)
│   ├── DCPACIENTE (Nome)
│   ├── CPF
│   └── ... (14 campos)
├── medicos
│   ├── CDMEDICO (ID)
│   ├── DCMEDICO (Nome)
│   ├── CRM
│   └── ... (18 campos)
└── parcelams
    ├── NRVENDA (ID)
    ├── VLPARCELA
    ├── ABERTO
    └── ... (12 campos)
```

---

## 🚀 Próximos Passos

### Para Continuar com Firebird:

- A migração é **opcional**
- Continue desenvolvendo normalmente
- Rode de novo quando quiser sincronizar

### Para Migrar Banco Completo:

1. Execute a migração via RPA
2. Teste tudo funciona
3. Faça backup do Firebird
4. Adapte `server.js` para usar MongoDB (próxima fase)

### Para Deploy em Render:

1. Rode a migração
2. Crie conta Render + MongoDB Atlas
3. Configure variáveis de ambiente
4. Deploy automático do GitHub

---

## ⚠️ Pontos Importantes

- ✅ Migração é **não-destrutiva** (dados originais em Firebird não são alterados)
- ✅ Pode rodar **quantas vezes quiser** (limpa e refaz)
- ✅ **Rápido** (~5-30 segundos para pequenos bancos)
- ✅ **Seguro** com tratamento de erros

---

## 🆘 Troubleshooting

### Erro: "Cannot find module 'mongoose'"

```bash
npm install mongoose mongodb
```

### Erro: "MongoDB connection failed"

- Verifique a URL no .env
- Certifique-se que cluster está ativo
- Adicione seu IP nas IP Whitelist do MongoDB Atlas

### Erro: "Firebird not running"

```bash
# Windows
net start Firebird2.5

# Linux
sudo service firebird2.5-server start
```

---

## 📞 Suporte

Para dúvidas sobre a migração, consulte os logs na interface ou abra uma issue no GitHub.

---

**Desenvolvido com ❤️ para CHM - Caixa de Honorários Médicos**
