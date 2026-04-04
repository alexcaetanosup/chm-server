# 🚀 GUIA DEPLOY AWS EC2 + FIREBIRD 2.5

## 📋 FASES

---

## FASE 1: CRIAR CONTA AWS (15 min)
### Passo 1: Criar Conta
1. Acesse [aws.amazon.com](https://aws.amazon.com)
2. Clique em "Create an AWS Account"
3. Preencha dados pessoais
4. Adicione cartão de crédito (não será cobrado nos 12 meses)
5. Confirme via e-mail

### Passo 2: Criar EC2 Instance
1. Login no [AWS Console](https://console.aws.amazon.com)
2. Busque por **"EC2"**
3. Clique em **"Launch Instance"**

### Passo 3: Configurar Instância
- **Name**: CHM-Server
- **OS**: Ubuntu 22.04 LTS (Free tier eligible)
- **Instance Type**: t2.micro ✅ (Free)
- **Key Pair**: Criar novo
  - Name: `chm-key`
  - Type: `RSA`
  - Format: `.pem`
  - **Salvar arquivo em local seguro!**

### Passo 4: Security Group (Portas)
Criar novo Security Group com regras:
```
Tipo                Protocolo   Porta    Origem
SSH                 TCP         22       0.0.0.0/0 (seu IP é melhor)
HTTP                TCP         80       0.0.0.0/0
Custom TCP          TCP         3000     0.0.0.0/0 (React)
Custom TCP          TCP         4000     0.0.0.0/0 (Node.js)
Custom TCP          TCP         3050     0.0.0.0/0 (Firebird)
```

### Passo 5: Lançar Instância
- Clique em "Launch Instance"
- Aguarde 1-2 minutos
- Copie o **IP Público** (vai usar depois)

---

## FASE 2: CONECTAR VIA SSH (5 min)

### No Windows PowerShell:
```powershell
# Navegar até onde salvou a chave
cd C:\caminho\onde\salvou\chm-key.pem

# Conectar à instância (substitua IP)
ssh -i chm-key.pem ubuntu@seu-ip-publico-aws
```

**Exemplo:**
```powershell
ssh -i chm-key.pem ubuntu@54.123.456.789
```

Se der erro de permissão, execute:
```powershell
icacls chm-key.pem /inheritance:r /grant:r "%username%:F"
```

---

## FASE 3: INSTALAR DEPENDÊNCIAS NO SERVIDOR (10 min)

Após conectar via SSH, execute no terminal remoto:

### 1. Atualizar Sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Instalar Firebird 2.5
```bash
sudo apt install firebird2.5-server firebird2.5-utils -y
```

### 3. Instalar Node.js v20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y
```

### 4. Instalar Git
```bash
sudo apt install git -y
```

### 5. Criar Pasta do Projeto
```bash
mkdir -p /home/ubuntu/CHM
cd /home/ubuntu/CHM
```

---

## FASE 4: DEPLOY DO GITHUB (10 min)

```bash
# Clonar repositório
git clone https://github.com/alexcaetanosup/CHM-server.git .

# Entrar na pasta
cd /home/ubuntu/CHM

# Instalar dependências
npm install
```

---

## FASE 5: PREPARAR BANCO FIREBIRD (5 min)

### Opção A: Transferir Arquivo CHM.FDB (Recomendado)

**No seu Windows (Local):**
```powershell
# Copiar arquivo para o servidor AWS
scp -i chm-key.pem C:\WWW\CHM\chm-server\CHM.FDB ubuntu@seu-ip-aws:/home/ubuntu/CHM/chm-server/CHM.FDB
```

**No servidor AWS (SSH):**
```bash
# Ajustar permissões
sudo chown firebird:firebird /home/ubuntu/CHM/chm-server/CHM.FDB
sudo chmod 644 /home/ubuntu/CHM/chm-server/CHM.FDB
```

### Opção B: Criar Banco Vazio
```bash
# Se preferir criar um novo banco
sudo -u firebird /usr/lib/firebird/2.5/bin/isql -user sysdba -password masterkey
# Na prompt SQL:
# CREATE DATABASE '/home/ubuntu/CHM/chm-server/CHM.FDB';
# EXIT;
```

---

## FASE 6: CONFIGURAR ARQUIVO .env

```bash
# Editar arquivo .env
nano /home/ubuntu/CHM/chm-server/.env
```

**Conteúdo (adapte para seu caso):**
```
PORT=4000
GROQ_API_KEY=sua-chave-aqui
DATABASE_PATH=/home/ubuntu/CHM/chm-server/CHM.FDB
NODE_ENV=production
```

Salvar: `Ctrl+X`, depois `Y`, depois `Enter`

---

## FASE 7: RODAR O SERVIDOR (5 min)

### Iniciar Firebird
```bash
sudo service firebird2.5-server start
```

### Iniciar Node.js
```bash
cd /home/ubuntu/CHM
npm run dev
```

**Ou apenas backend:**
```bash
cd /home/ubuntu/CHM/chm-server
node server.js
```

---

## FASE 8: ACESSAR DE QUALQUER LUGAR 🎉

### No navegador (seu PC, celular, etc):
```
http://seu-ip-aws:3000    (React Frontend)
http://seu-ip-aws:4000    (Node.js Backend)
```

**Exemplo:**
```
http://54.123.456.789:3000
```

---

## 📝 CHECKLIST FINAL

- [ ] Conta AWS criada
- [ ] EC2 instance rodando
- [ ] SSH conectado
- [ ] Firebird 2.5 instalado
- [ ] Node.js instalado
- [ ] Git clone realizado
- [ ] CHM.FDB transferido
- [ ] .env configurado
- [ ] Firebird iniciado
- [ ] Node.js rodando
- [ ] Acessível remotamente ✅

---

## 🆘 TROUBLESHOOTING

### Erro: "Cannot connect to Firebird"
```bash
sudo service firebird2.5-server restart
```

### Erro: "CORS blocked"
- Adicione o IP da AWS no `server.js` (veja próxima seção)

### Erro: "Port already in use"
```bash
sudo lsof -i :4000
# Kill processo se necessário
```

---

## ⚙️ PRÓXIMAS ALTERAÇÕES NO CÓDIGO

Vou ajustar `server.js` para:
1. Caminho do Firebird em Linux
2. CORS aceitar IP da AWS
3. Caminhos absolutos para banco em Linux

**Aguarde próximas instruções...**

