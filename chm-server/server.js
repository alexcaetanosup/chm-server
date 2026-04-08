require("dotenv").config();
const mongoose = require("mongoose");

const {
  Paciente,
  Medico,
  Especialidade,
  Lancamento,
} = require("./migrate-firebird-to-mongodb");

mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => console.log("🍃 MongoDB Atlas Conectado!"))
  .catch((err) => console.error("❌ Erro MongoDB:", err));

const path = require("path");
const fs = require("fs");
const os = require("os");
const { exec } = require("child_process");
const express = require("express");
const cors = require("cors");
const multer = require("multer");

const app = express();

// =============================================================
// 🌍 DETECÇÃO DE AMBIENTE (Windows ou Linux/AWS)
// =============================================================
const isWindows = os.platform() === "win32";
const isLinux = os.platform() === "linux";

console.log(`\n🖥️  Sistema Operacional: ${isWindows ? "Windows" : "Linux"}`);
console.log(
  `📍 Ambiente: ${isLinux ? "AWS/PRODUÇÃO" : "LOCAL/DESENVOLVIMENTO"}\n`,
);

// =============================================================
// 🔒 CONFIGURAÇÃO CORS (Dinâmica conforme Ambiente)
// =============================================================
let corsOptions = {
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

if (isWindows) {
  corsOptions.origin = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
  ];
  console.log("✅ CORS configurado para LOCALHOST");
} else if (isLinux) {
  corsOptions.origin = true;
  console.log("✅ CORS configurado para AWS (qualquer origem temporariamente)");
  console.log("⚠️  Recomendação: Restricione após configurar domínio\n");
}

app.use(cors(corsOptions));
app.use(express.json());

// Rota de teste
app.get("/api/health", (req, res) => res.send("Servidor Ativo!"));

// =============================================================
// 📸 CONFIGURAÇÃO DE UPLOADS (Dinâmica conforme Ambiente)
// =============================================================
const uploadDir = isWindows
  ? "uploads/"
  : "/home/ubuntu/CHM/chm-server/uploads/";
const uploadUrl = isWindows
  ? "http://localhost:4000/uploads/"
  : `http://${process.env.AWS_IP || "seu-ip-aws"}:4000/uploads/`;

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

app.post("/upload", upload.single("foto"), (req, res) => {
  res.json({
    url: uploadUrl + req.file.filename,
  });
});

app.use("/uploads", express.static(uploadDir));

// =============================================================
// 1. DASHBOARD
// =============================================================
app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const lancamentos = await Lancamento.find();

    const totalAtendimentos = lancamentos.length;
    const faturamentoTotal = lancamentos.reduce(
      (sum, l) => sum + (Number(l.VLPARCELA) || 0),
      0,
    );
    const totalPendente = lancamentos.reduce(
      (sum, l) => sum + (l.ABERTO === "S" ? Number(l.VLPARCELA) || 0 : 0),
      0,
    );
    const totalPago = lancamentos.reduce(
      (sum, l) => sum + (l.ABERTO === "N" ? Number(l.VLPARCELA) || 0 : 0),
      0,
    );

    res.json({
      TOTAL_ATENDIMENTOS: totalAtendimentos,
      FATURAMENTO_TOTAL: faturamentoTotal,
      TOTAL_PENDENTE: totalPendente,
      TOTAL_PAGO: totalPago,
    });
  } catch (err) {
    console.error("Erro no dashboard:", err);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
// 2. PACIENTES
// =============================================================
app.get("/api/pacientes", async (req, res) => {
  try {
    const { busca } = req.query;
    let filtro = {};

    if (busca) {
      filtro = { DCPACIENTE: { $regex: busca, $options: "i" } };
    }

    const pacientes = await Paciente.find(filtro)
      .select("CDPACIENTE DCPACIENTE CPF CELULAR")
      .sort({ DCPACIENTE: 1 })
      .limit(7000);

    res.json(pacientes);
  } catch (err) {
    console.error("Erro ao buscar pacientes:", err);
    res.status(500).json([]);
  }
});

app.post("/api/pacientes", async (req, res) => {
  try {
    const p = req.body;
    if (!p.CDPACIENTE) {
      const ultimo = await Paciente.findOne().sort({ CDPACIENTE: -1 });
      p.CDPACIENTE = ultimo ? ultimo.CDPACIENTE + 1 : 1;
    }
    const filtro = { CDPACIENTE: p.CDPACIENTE };
    const atualizacao = { ...p, DCPACIENTE: p.DCPACIENTE?.toUpperCase() };

    await Paciente.findOneAndUpdate(filtro, atualizacao, {
      upsert: true,
      new: true,
    });
    res.status(201).json({ message: "OK", CDPACIENTE: p.CDPACIENTE });
  } catch (err) {
    console.error("Erro ao salvar paciente:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/pacientes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const p = req.body;

    const atualizacao = {
      ...p,
      DCPACIENTE: p.DCPACIENTE?.toUpperCase().substring(0, 60),
      CPF: p.CPF?.replace(/\D/g, "").substring(0, 11),
      CELULAR: p.CELULAR?.replace(/\D/g, "").substring(0, 11),
    };

    const paciente = await Paciente.findOneAndUpdate(
      { CDPACIENTE: parseInt(id) },
      atualizacao,
      { new: true },
    );
    res.json({ message: "Paciente atualizado", paciente });
  } catch (err) {
    console.error("Erro ao atualizar paciente:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/pacientes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const temLancamentos = await Lancamento.findOne({
      CDPACIENTE: parseInt(id),
    });

    if (temLancamentos) {
      return res
        .status(500)
        .json({ error: "Este paciente possui lançamentos vinculados." });
    }

    await Paciente.findOneAndDelete({ CDPACIENTE: parseInt(id) });
    res.json({ message: "OK" });
  } catch (err) {
    console.error("Erro ao excluir paciente:", err);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
// 3. ESPECIALIDADES
// =============================================================
app.get("/api/especialidades", async (req, res) => {
  try {
    const { q } = req.query;
    let filtro = {};

    if (q && q.trim() !== "") {
      filtro = { DCESPECIAL: { $regex: q.trim(), $options: "i" } };
    }

    const especialidades = await Especialidade.find(filtro).sort({
      DCESPECIAL: 1,
    });
    res.json(especialidades);
  } catch (err) {
    console.error("Erro ao buscar especialidades:", err);
    res.status(500).json([]);
  }
});

app.post("/api/especialidades", async (req, res) => {
  try {
    const ultima = await Especialidade.findOne().sort({ CDESPECIAL: -1 });
    const novoCodigo = ultima ? ultima.CDESPECIAL + 1 : 1;
    const nova = await Especialidade.create({
      CDESPECIAL: novoCodigo,
      DCESPECIAL: req.body.DCESPECIAL.toUpperCase(),
    });
    res.json(nova);
  } catch (err) {
    console.error("Erro ao criar especialidade:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/especialidades/:id", async (req, res) => {
  try {
    await Especialidade.findOneAndUpdate(
      { CDESPECIAL: parseInt(req.params.id) },
      { DCESPECIAL: req.body.DCESPECIAL.toUpperCase() },
    );
    res.json({ message: "OK" });
  } catch (err) {
    console.error("Erro ao atualizar especialidade:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/especialidades/:id", async (req, res) => {
  try {
    const emUso = await Medico.findOne({
      CDESPECIALIDADE: parseInt(req.params.id),
    });
    if (emUso) return res.status(500).json({ error: "Especialidade em uso." });
    await Especialidade.findOneAndDelete({
      CDESPECIAL: parseInt(req.params.id),
    });
    res.json({ message: "OK" });
  } catch (err) {
    console.error("Erro ao excluir especialidade:", err);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
// 4. MÉDICOS
// =============================================================
app.get("/api/medicos", async (req, res) => {
  try {
    const { nome } = req.query;
    let filtro = {};

    if (nome && nome.trim() !== "") {
      filtro = { DCMEDICO: { $regex: nome.trim(), $options: "i" } };
    }

    const medicos = await Medico.find(filtro).sort({ DCMEDICO: 1 });
    res.json(medicos);
  } catch (err) {
    console.error("Erro ao buscar médicos:", err);
    res.status(500).json([]);
  }
});

app.post("/api/medicos", async (req, res) => {
  try {
    const m = req.body;
    if (!m.CDMEDICO) {
      const ultimo = await Medico.findOne().sort({ CDMEDICO: -1 });
      m.CDMEDICO = ultimo ? ultimo.CDMEDICO + 1 : 1;
    }
    await Medico.findOneAndUpdate({ CDMEDICO: m.CDMEDICO }, m, {
      upsert: true,
    });
    res.status(201).json({ message: "OK", CDMEDICO: m.CDMEDICO });
  } catch (err) {
    console.error("Erro ao salvar médico:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/medicos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const m = req.body;
    await Medico.findOneAndUpdate({ CDMEDICO: parseInt(id) }, m, { new: true });
    res.json({ message: "Médico atualizado com sucesso" });
  } catch (err) {
    console.error("Erro ao atualizar médico:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/medicos/:id", async (req, res) => {
  try {
    const temAtendimentos = await Lancamento.findOne({
      CDMEDICO: parseInt(req.params.id),
    });
    if (temAtendimentos)
      return res.status(500).json({ error: "Médico possui atendimentos." });
    await Medico.findOneAndDelete({ CDMEDICO: parseInt(req.params.id) });
    res.json({ message: "OK" });
  } catch (err) {
    console.error("Erro ao excluir médico:", err);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
// 5. LANÇAMENTOS
// =============================================================
app.get("/api/lancamentos", async (req, res) => {
  try {
    const lancamentos = await Lancamento.find().sort({ DATATEND: -1 });
    res.json(lancamentos);
  } catch (err) {
    console.error("Erro no servidor:", err);
    res.status(500).json({ error: "Erro ao carregar lançamentos" });
  }
});

app.post("/api/lancamentos", async (req, res) => {
  try {
    const l = req.body;

    if (!l.CDPACIENTE || l.CDPACIENTE === "null" || l.CDPACIENTE === 0) {
      return res.status(400).json({ error: "Selecione um paciente válido." });
    }

    const ultimo = await Lancamento.findOne().sort({ NRVENDA: -1 });
    const nrVenda = ultimo ? ultimo.NRVENDA + 1 : 1;

    const planoMap = { PARTICULAR: 1, UNIMED: 2, AMIL: 3 };
    const plano = planoMap[l.PLANO] || 1;

    const novoLancamento = new Lancamento({
      NRVENDA: nrVenda,
      DTPARCELA: l.DTPARCELA ? new Date(l.DTPARCELA) : null,
      VLPARCELA: parseFloat(l.VLPARCELA) || 0,
      CDPACIENTE: parseInt(l.CDPACIENTE),
      PLANO: plano,
      PARCELA: parseInt(l.PARCELA) || 1,
      DATATEND: l.DATATEND ? new Date(l.DATATEND) : new Date(),
      CDESPECIAL: parseInt(l.CDESPECIAL) || 0,
      CDMEDICO: parseInt(l.CDMEDICO) || 0,
      ABERTO: "S",
    });

    await novoLancamento.save();
    res.status(201).json({ message: "OK", nrVenda });
  } catch (err) {
    console.error("Erro ao criar lançamento:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/lancamentos/:id/pagar", async (req, res) => {
  try {
    const { id } = req.params;
    const lancamento = await Lancamento.findOneAndUpdate(
      { NRVENDA: parseInt(id) },
      { ABERTO: "N" },
      { new: true },
    );

    if (!lancamento) {
      return res.status(404).json({ error: "Lançamento não encontrado" });
    }

    res.json({ message: "Pagamento registrado!" });
  } catch (err) {
    console.error("Erro ao registrar pagamento:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/lancamentos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const lancamento = await Lancamento.findOneAndDelete({
      NRVENDA: parseInt(id),
    });

    if (!lancamento) {
      return res.status(404).json({ error: "Lançamento não encontrado" });
    }

    res.json({ message: "Lançamento excluído!" });
  } catch (err) {
    console.error("Erro ao excluir lançamento:", err);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
// 6. BACKUP DO MONGODB (MESMO PADRÃO DO FIREBIRD)
// =============================================================
app.post("/api/backup/mongodb", async (req, res) => {
  const { tipo } = req.body; // DIARIO, MENSAL ou ANUAL

  const agora = new Date();
  const ano = agora.getFullYear().toString();
  const mes = (agora.getMonth() + 1).toString().padStart(2, "0");
  const dia = agora.getDate().toString().padStart(2, "0");
  const hora = agora.getHours().toString().padStart(2, "0");
  const minuto = agora.getMinutes().toString().padStart(2, "0");

  // =============================================================
  // 📂 ESTRUTURA DE PASTAS DE BACKUP (MESMA DO FIREBIRD)
  // =============================================================
  // Windows: C:\WWW\Backups\MongoDB\2026\04\04\DIARIO\
  // Linux/AWS: /home/ubuntu/CHM/backups/mongodb/2026/04/04/DIARIO/
  // =============================================================
  const DESTINO_DIR = isWindows
    ? path.join("C:", "WWW", "Backups", "MongoDB", ano, mes, dia, tipo)
    : `/home/ubuntu/CHM/backups/mongodb/${ano}/${mes}/${dia}/${tipo}`;

  try {
    // Cria as pastas caso não existam
    if (!fs.existsSync(DESTINO_DIR)) {
      fs.mkdirSync(DESTINO_DIR, { recursive: true });
    }

    // Nome do arquivo com timestamp para não sobrescrever
    const NOME_ARQUIVO = `BACKUP_CHM_MONGODB_${hora}${minuto}.json`;
    const CAMINHO_COMPLETO = path.join(DESTINO_DIR, NOME_ARQUIVO);

    console.log("------------------------------------------");
    console.log(`GERANDO BACKUP MONGODB EM: ${DESTINO_DIR}`);
    console.log("------------------------------------------");

    // Buscar todos os dados do MongoDB
    const [pacientes, medicos, especialidades, lancamentos] = await Promise.all(
      [
        Paciente.find().lean(),
        Medico.find().lean(),
        Especialidade.find().lean(),
        Lancamento.find().lean(),
      ],
    );

    const backupData = {
      metadata: {
        tipo: tipo,
        data: new Date().toISOString(),
        versao: "1.0",
        sistema: "CHM - Caixa de Honorários Médicos",
        banco: "MongoDB Atlas",
      },
      dados: {
        pacientes,
        medicos,
        especialidades,
        lancamentos,
      },
      estatisticas: {
        totalPacientes: pacientes.length,
        totalMedicos: medicos.length,
        totalEspecialidades: especialidades.length,
        totalLancamentos: lancamentos.length,
        totalGeral: lancamentos.reduce(
          (sum, l) => sum + (Number(l.VLPARCELA) || 0),
          0,
        ),
      },
    };

    // Salvar backup em arquivo JSON
    fs.writeFileSync(
      CAMINHO_COMPLETO,
      JSON.stringify(backupData, null, 2),
      "utf8",
    );

    console.log(`✅ SUCESSO: ${NOME_ARQUIVO} criado.`);
    res.json({
      mensagem: "Backup MongoDB gerado com sucesso!",
      arquivo: CAMINHO_COMPLETO,
      timestamp: `${dia}/${mes}/${ano} às ${hora}:${minuto}`,
      tamanho:
        (fs.statSync(CAMINHO_COMPLETO).size / (1024 * 1024)).toFixed(2) + " MB",
    });
  } catch (err) {
    console.error("ERRO DE SISTEMA:", err.message);
    res
      .status(500)
      .json({ erro: "Erro ao gerar backup", detalhe: err.message });
  }
});

// =============================================================
// 7. ROTA DE IA
// =============================================================
const Groq = require("groq-sdk");

app.post("/api/ai", async (req, res) => {
  try {
    const prompt = req.body.prompt || req.body.message;
    if (!prompt) {
      return res.status(400).json({ error: "Mensagem não enviada" });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `Você é um assistente virtual do sistema CHM - Caixa de Honorários Médicos.
Responda SEMPRE em português, de forma curta e direta (máximo 5 linhas).
Você conhece todas as funcionalidades do sistema...`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 1024,
    });

    const aiText =
      completion.choices[0]?.message?.content || "Sem resposta da IA";
    res.json({ text: aiText });
  } catch (err) {
    console.error("Erro interno IA:", err);
    res.status(500).json({ error: "Erro interno IA", detalhe: err.message });
  }
});

// =============================================================
// INICIALIZAÇÃO
// =============================================================
const PORT_FINAL = process.env.PORT || 4000;
app.listen(PORT_FINAL, () => {
  console.log(`🚀 SERVIDOR CHM RODANDO NA PORTA ${PORT_FINAL}`);
  console.log(
    `\n=============================================================`,
  );
  console.log(`📊 CONFIGURAÇÃO ATUAL:`);
  console.log(`   🖥️  SO: ${isWindows ? "Windows" : "Linux/AWS"}`);
  console.log(`   🍃 Banco: MongoDB Atlas`);
  console.log(`   📸 Uploads: ${uploadDir}`);
  console.log(
    `   🔒 CORS: ${JSON.stringify(corsOptions.origin).substring(0, 50)}...`,
  );
  console.log(
    `=============================================================\n`,
  );
});

// require("dotenv").config();
// const mongoose = require("mongoose");

// const {
//   Paciente,
//   Medico,
//   Especialidade,
//   Lancamento, // Adicione aqui
// } = require("./migrate-firebird-to-mongodb");

// mongoose
//   .connect(process.env.MONGODB_URL) // Use o nome exato do seu .env
//   .then(() => console.log("🍃 MongoDB Atlas Conectado!"))
//   .catch((err) => console.error("❌ Erro MongoDB:", err));

// const path = require("path");
// const fs = require("fs");
// const os = require("os");
// const { exec } = require("child_process");
// const express = require("express");
// const Firebird = require("node-firebird");
// const cors = require("cors");
// const multer = require("multer");

// // =============================================================
// // 🤖 IMPORTAR RPA FIREBIRD → MONGODB
// // =============================================================
// const { executarMigracao } = require("./migrate-firebird-to-mongodb");

// const app = express();

// // =============================================================
// // 🌍 DETECÇÃO DE AMBIENTE (Windows ou Linux/AWS)
// // =============================================================
// const isWindows = os.platform() === "win32";
// const isLinux = os.platform() === "linux";

// console.log(`\n🖥️  Sistema Operacional: ${isWindows ? "Windows" : "Linux"}`);
// console.log(
//   `📍 Ambiente: ${isLinux ? "AWS/PRODUÇÃO" : "LOCAL/DESENVOLVIMENTO"}\n`,
// );

// // =============================================================
// // 🔒 CONFIGURAÇÃO CORS (Dinâmica conforme Ambiente)
// // =============================================================
// let corsOptions = {
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"],
// };

// if (isWindows) {
//   // LOCAL (Windows): Aceita localhost e 5173
//   corsOptions.origin = ["http://localhost:3000", "http://localhost:5173"];
//   console.log("✅ CORS configurado para LOCALHOST");
// } else if (isLinux) {
//   // AWS/PRODUÇÃO (Linux): Aceita qualquer origem por enquanto
//   corsOptions.origin = true;
//   console.log("✅ CORS configurado para AWS (qualquer origem temporariamente)");
//   console.log("⚠️  Recomendação: Restricione após configurar domínio\n");
// }

// app.use(cors(corsOptions));

// app.use(express.json());

// // Rota de teste
// app.get("/api/health", (req, res) => res.send("Servidor Ativo!"));

// // =============================================================
// // 🗄️  CONFIGURAÇÃO DO FIREBIRD 2.5 (DINÂMICA)
// // =============================================================
// // Detecta automaticamente o caminho do banco conforme o SO:
// // - Windows: C:\WWW\CHM\chm-server\CHM.FDB
// // - Linux/AWS: /home/ubuntu/CHM/chm-server/CHM.FDB
// // =============================================================
// const dbPath = isWindows
//   ? "C:\\WWW\\CHM\\chm-server\\CHM.FDB"
//   : "/home/ubuntu/CHM/chm-server/CHM.FDB";

// console.log(`📁 Caminho do Banco: ${dbPath}\n`);

// const options = {
//   host: "127.0.0.1", // Sempre localhost (servidor local)
//   port: 3050, // Porta padrão Firebird
//   database: dbPath, // Detectado conforme SO
//   user: "SYSDBA", // Usuário padrão Firebird
//   password: "masterkey", // Senha padrão
//   lowercase_keys: false, // Mantém nomes de colunas como no banco
//   pageSize: 4096, // Tamanho de página
// };

// // --- HELPER FUNCTIONS ---
// function toDate(dateString) {
//   if (!dateString) return null;
//   // Aceita formatos: YYYY-MM-DD ou DD/MM/YYYY
//   return new Date(dateString);
// }

// function toFloat(value) {
//   if (!value) return 0.0;
//   return parseFloat(value.toString().replace(",", "."));
// }

// function toInteger(value) {
//   // Se for nulo, indefinido ou a STRING "null", retorna 0 ou null (o que seu banco aceitar)
//   if (
//     value === null ||
//     value === undefined ||
//     value === "null" ||
//     value === ""
//   ) {
//     return 0; // Usar 0 é mais seguro para campos Number que não podem ser nulos
//   }
//   const n = parseInt(value, 10);
//   return isNaN(n) ? 0 : n;
// }

// // function toInteger(value) {
// //   if (!value) return 0;
// //   return parseInt(value, 10);
// // }

// //======================Tratamento da Foto==========
// // =============================================================
// // 📸 CONFIGURAÇÃO DE UPLOADS (Dinâmica conforme Ambiente)
// // =============================================================
// // Define o caminho e URL da pasta uploads conforme SO:
// // - Windows: ./uploads/ (relativo ao servidor.js)
// // - Linux/AWS: /home/ubuntu/CHM/chm-server/uploads/
// // =============================================================
// const uploadDir = isWindows
//   ? "uploads/"
//   : "/home/ubuntu/CHM/chm-server/uploads/";
// const uploadUrl = isWindows
//   ? "http://localhost:4000/uploads/"
//   : `http://${process.env.AWS_IP || "seu-ip-aws"}:4000/uploads/`;

// const storage = multer.diskStorage({
//   destination: uploadDir,
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + "-" + file.originalname);
//   },
// });

// const upload = multer({ storage });

// app.post("/upload", upload.single("foto"), (req, res) => {
//   res.json({
//     url: uploadUrl + req.file.filename,
//   });
// });

// app.use("/uploads", express.static(uploadDir));

// //===========================================================

// // 1. DASHBOARD
// app.get("/api/dashboard/stats", (req, res) => {
//   Firebird.attach(options, (err, db) => {
//     if (err) return res.status(500).json({ error: err.message });
//     const sql = `
//       SELECT
//         CAST(COUNT(*) AS INTEGER) as TOTAL_ATENDIMENTOS,
//         CAST(COALESCE(SUM(VLPARCELA), 0) AS DOUBLE PRECISION) as FATURAMENTO_TOTAL,
//         CAST(COALESCE(SUM(CASE WHEN ABERTO = 'S' THEN VLPARCELA ELSE 0 END), 0) AS DOUBLE PRECISION) as TOTAL_PENDENTE,
//         CAST(COALESCE(SUM(CASE WHEN ABERTO = 'N' THEN VLPARCELA ELSE 0 END), 0) AS DOUBLE PRECISION) as TOTAL_PAGO
//       FROM PARCELAM
//     `;
//     db.query(sql, (err, result) => {
//       db.detach();
//       if (err) return res.status(500).json({ error: err.message });
//       res.json(
//         result[0] || {
//           TOTAL_ATENDIMENTOS: 0,
//           FATURAMENTO_TOTAL: 0,
//           TOTAL_PENDENTE: 0,
//           TOTAL_PAGO: 0,
//         },
//       );
//     });
//   });
// });

// // ==========================================
// // 2. PACIENTES
// // ==========================================
// app.get("/api/pacientes", async (req, res) => {
//   try {
//     const { busca } = req.query;
//     let filtro = {};

//     if (busca) {
//       // O 'i' torna a busca insensível a maiúsculas/minúsculas (igual ao LIKE do SQL)
//       filtro = { DCPACIENTE: { $regex: busca, $options: "i" } };
//     }

//     const pacientes = await Paciente.find(filtro)
//       .select("CDPACIENTE DCPACIENTE CPF CELULAR")
//       .sort({ DCPACIENTE: 1 })
//       .limit(7000); // Limita para manter a performance ao digitar

//     res.json(pacientes);
//   } catch (err) {
//     res.status(500).json([]);
//   }
// });
// // POST PACIENTES CORRIGIDO
// app.post("/api/pacientes", async (req, res) => {
//   try {
//     const p = req.body;
//     // Se não tiver CDPACIENTE, você pode gerar um ou usar o count do banco
//     const filtro = { CDPACIENTE: p.CDPACIENTE };
//     const atualizacao = { ...p, DCPACIENTE: p.DCPACIENTE?.toUpperCase() };

//     await Paciente.findOneAndUpdate(filtro, atualizacao, {
//       upsert: true,
//       new: true,
//     });
//     res.status(201).json({ message: "OK" });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// app.put("/api/pacientes/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const p = req.body;

//     const atualizacao = {
//       ...p,
//       DCPACIENTE: p.DCPACIENTE?.toUpperCase().substring(0, 60),
//       CPF: p.CPF?.replace(/\D/g, "").substring(0, 11),
//       CELULAR: p.CELULAR?.replace(/\D/g, "").substring(0, 11),
//       // ... demais campos seguindo a mesma lógica de limpeza
//     };

//     const paciente = await Paciente.findOneAndUpdate(
//       { CDPACIENTE: id },
//       atualizacao,
//       { new: true },
//     );
//     res.json({ message: "Paciente atualizado", paciente });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// app.delete("/api/pacientes/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const temLancamentos = await Lancamento.findOne({ CDPACIENTE: id });

//     if (temLancamentos) {
//       return res
//         .status(500)
//         .json({ error: "Este paciente possui lançamentos vinculados." });
//     }

//     await Paciente.findOneAndDelete({ CDPACIENTE: id });
//     res.json({ message: "OK" });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // --- Rota de Especialidades ---
// app.get("/api/especialidades", async (req, res) => {
//   try {
//     const { q } = req.query; // O Frontend envia como 'q'
//     let filtro = {};

//     if (q && q.trim() !== "") {
//       filtro = { DCESPECIAL: { $regex: q.trim(), $options: "i" } };
//     }

//     const especialidades = await Especialidade.find(filtro).sort({
//       DCESPECIAL: 1,
//     });
//     res.json(especialidades);
//   } catch (err) {
//     console.error("Erro ao buscar especialidades:", err);
//     res.status(500).json([]);
//   }
// });
// // CRIAR
// app.post("/api/especialidades", async (req, res) => {
//   try {
//     const ultima = await Especialidade.findOne().sort({ CDESPECIAL: -1 });
//     const novoCodigo = ultima ? ultima.CDESPECIAL + 1 : 1;
//     const nova = await Especialidade.create({
//       CDESPECIAL: novoCodigo,
//       DCESPECIAL: req.body.DCESPECIAL.toUpperCase(),
//     });
//     res.json(nova);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // EDITAR
// app.put("/api/especialidades/:id", async (req, res) => {
//   try {
//     await Especialidade.findOneAndUpdate(
//       { CDESPECIAL: req.params.id },
//       { DCESPECIAL: req.body.DCESPECIAL },
//     );
//     res.json({ message: "OK" });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // APAGAR
// app.delete("/api/especialidades/:id", async (req, res) => {
//   try {
//     const emUso = await Medico.findOne({ CDESPECIALIDADE: req.params.id });
//     if (emUso) return res.status(500).json({ error: "Especialidade em uso." });
//     await Especialidade.findOneAndDelete({ CDESPECIAL: req.params.id });
//     res.json({ message: "OK" });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // ==========================================
// // 4. MÉDICOS
// // ==========================================
// app.get("/api/medicos", async (req, res) => {
//   try {
//     const { nome } = req.query;
//     let filtro = {};

//     if (nome && nome.trim() !== "") {
//       // Usa regex para busca parcial e 'i' para ignorar maiúsculas/minúsculas
//       filtro = { DCMEDICO: { $regex: nome.trim(), $options: "i" } };
//     }

//     const medicos = await Medico.find(filtro).sort({ DCMEDICO: 1 });
//     res.json(medicos);
//   } catch (err) {
//     console.error("Erro ao buscar médicos:", err);
//     res.status(500).json([]);
//   }
// });

// // CRIAR / EDITAR (UPSERT)
// app.post("/api/medicos", async (req, res) => {
//   try {
//     const m = req.body;
//     if (!m.CDMEDICO) {
//       const ultimo = await Medico.findOne().sort({ CDMEDICO: -1 });
//       m.CDMEDICO = ultimo ? ultimo.CDMEDICO + 1 : 1;
//     }
//     await Medico.findOneAndUpdate({ CDMEDICO: m.CDMEDICO }, m, {
//       upsert: true,
//     });
//     res.status(201).json({ message: "OK", CDMEDICO: m.CDMEDICO });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// app.put("/api/medicos/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const m = req.body;

//     await Medico.findOneAndUpdate({ CDMEDICO: id }, m, { new: true });
//     res.json({ message: "Médico atualizado com sucesso" });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // APAGAR
// app.delete("/api/medicos/:id", async (req, res) => {
//   try {
//     const temAtendimentos = await Lancamento.findOne({
//       CDMEDICO: req.params.id,
//     });
//     if (temAtendimentos)
//       return res.status(500).json({ error: "Médico possui atendimentos." });
//     await Medico.findOneAndDelete({ CDMEDICO: req.params.id });
//     res.json({ message: "OK" });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// //5. LANÇAMENTOS (PARCELAM)
// app.get("/api/lancamentos", async (req, res) => {
//   try {
//     // Usamos o modelo que aponta para 'parcelams'
//     const docs = await Lancamento.find().sort({ DATATEND: -1 });
//     res.json(docs);
//   } catch (err) {
//     console.error("Erro no servidor:", err);
//     res.status(500).json({ error: "Erro ao carregar parcelams" });
//   }
// });

// // GRAVAR LANÇAMENTOS...
// app.post("/api/lancamentos", (req, res) => {
//   let { CDPACIENTE, CDMEDICO, CDESPECIAL } = req.body;

//   // Limpeza agressiva: se for a string "null", vira 0
//   const codPaciente =
//     CDPACIENTE === "null" || !CDPACIENTE ? 0 : parseInt(CDPACIENTE, 10);

//   if (codPaciente === 0) {
//     return res
//       .status(400)
//       .json({ error: "Código do paciente inválido ou não selecionado." });
//   }
//   // const l = req.body;

//   // Validação básica: Não deixa prosseguir se não houver paciente
//   if (!l.CDPACIENTE || l.CDPACIENTE === "null") {
//     return res.status(400).json({ error: "Selecione um paciente válido." });
//   }

//   const planoMap = { PARTICULAR: 1, UNIMED: 2, AMIL: 3 };
//   const plano = planoMap[l.PLANO] || 1;

//   Firebird.attach(options, (err, db) => {
//     if (err) return res.status(500).json({ error: err.message });

//     db.query(
//       "SELECT NEXT VALUE FOR GEN_NRVENDA AS NRVENDA FROM RDB$DATABASE",
//       (err, result) => {
//         if (err) {
//           db.detach();
//           return res.status(500).json(err);
//         }

//         const nrVenda = result[0].NRVENDA;
//         const query = `
//           INSERT INTO PARCELAM
//           (NRVENDA, DTPARCELA, VLPARCELA, CDPACIENTE, PLANO, PARCELA, DATATEND, CDESPECIAL, CDMEDICO, ABERTO)
//           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//         `;

//         const params = [
//           nrVenda,
//           toDate(l.DTPARCELA),
//           toFloat(l.VLPARCELA),
//           toInteger(l.CDPACIENTE), // Agora protegido pela nova toInteger
//           plano,
//           toInteger(l.PARCELA),
//           toDate(l.DATATEND),
//           toInteger(l.CDESPECIAL),
//           toInteger(l.CDMEDICO),
//           "S", // Geralmente Firebird usa 'S' para Aberto (Sim) em vez de 1
//         ];

//         console.log("🚀 Executando INSERT com params:", params);

//         db.query(query, params, (err) => {
//           db.detach();
//           if (err) {
//             console.error("❌ ERRO FIREBIRD:", err.message);
//             return res.status(500).json({ error: err.message });
//           }
//           res.status(201).json({ message: "OK", nrVenda });
//         });
//       },
//     );
//   });
// });

// app.put("/api/lancamentos/:id/pagar", (req, res) => {
//   const { id } = req.params;
//   Firebird.attach(options, (err, db) => {
//     if (err) return res.status(500).json({ error: err.message });
//     db.query(
//       "UPDATE PARCELAM SET ABERTO = 'N' WHERE NRVENDA = ?",
//       [id],
//       (err) => {
//         db.detach();
//         if (err) return res.status(500).json({ error: err.message });
//         res.json({ message: "Pagamento registrado!" });
//       },
//     );
//   });
// });

// app.delete("/api/lancamentos/:id", (req, res) => {
//   const { id } = req.params;
//   Firebird.attach(options, (err, db) => {
//     if (err) return res.status(500).json({ error: err.message });
//     db.query("DELETE FROM PARCELAM WHERE NRVENDA = ?", [id], (err) => {
//       db.detach();
//       if (err) return res.status(500).json({ error: err.message });
//       res.json({ message: "Lançamento excluído!" });
//     });
//   });
// });

// // Rota de Backup (Firebird)
// app.post("/api/backup/firebird", (req, res) => {
//   const { tipo } = req.body; // DIARIO, MENSAL ou ANUAL

//   const agora = new Date();
//   const ano = agora.getFullYear().toString();
//   const mes = (agora.getMonth() + 1).toString().padStart(2, "0");
//   const dia = agora.getDate().toString().padStart(2, "0");
//   const hora = agora.getHours().toString().padStart(2, "0");
//   const minuto = agora.getMinutes().toString().padStart(2, "0");

//   // =============================================================
//   // 🔧 DETECTAR GBAK CONFORME SO
//   // =============================================================
//   // Windows: gbak.exe na pasta do servidor
//   // Linux/AWS: comando 'gbak' instalado no sistema
//   // =============================================================
//   const GBAK_PATH = isWindows
//     ? path.resolve(__dirname, "gbak.exe")
//     : "/usr/lib/firebird/2.5/bin/gbak";

//   // =============================================================
//   // 📂 ESTRUTURA DE PASTAS DE BACKUP
//   // =============================================================
//   // Windows: C:\WWW\Backups\2026\04\04\DIARIO\
//   // Linux/AWS: /home/ubuntu/CHM/backups/2026/04/04/DIARIO/
//   // =============================================================
//   const DESTINO_DIR = isWindows
//     ? path.join("C:", "WWW", "Backups", ano, mes, dia, tipo)
//     : `/home/ubuntu/CHM/backups/${ano}/${mes}/${dia}/${tipo}`;

//   try {
//     // Cria as pastas caso não existam
//     if (!fs.existsSync(DESTINO_DIR)) {
//       fs.mkdirSync(DESTINO_DIR, { recursive: true });
//     }

//     // Nome do arquivo com timestamp para não sobrescrever
//     const NOME_ARQUIVO = `BACKUP_CHM_${hora}${minuto}.FBK`;
//     const CAMINHO_COMPLETO = path.join(DESTINO_DIR, NOME_ARQUIVO);

//     // Caminho do banco (mesmo do options acima)
//     const DB_PATH = dbPath;
//     const USER = "SYSDBA";
//     const PASS = "masterkey";

//     // =============================================================
//     // 📝 MONTAGEM DO COMANDO GBAK (adapta conforme SO)
//     // =============================================================
//     let comando;
//     if (isWindows) {
//       // Windows: aspas duplas para evitar erros de espaços
//       comando = `"${GBAK_PATH}" -v -t -user ${USER} -password ${PASS} "${DB_PATH}" "${CAMINHO_COMPLETO}"`;
//     } else {
//       // Linux: sem aspas duplas (caminho sem espaços)
//       comando = `${GBAK_PATH} -v -t -user ${USER} -password ${PASS} ${DB_PATH} ${CAMINHO_COMPLETO}`;
//     }

//     console.log("------------------------------------------");
//     console.log(`GERANDO BACKUP EM: ${DESTINO_DIR}`);
//     console.log("------------------------------------------");

//     // Execução do Processo via CLI
//     exec(comando, (error, stdout, stderr) => {
//       if (error) {
//         console.error("ERRO GBAK:", stderr || error.message);
//         return res.status(500).json({
//           erro: "Falha na extração GBAK",
//           detalhe: stderr || error.message,
//         });
//       }

//       console.log(`SUCESSO: ${NOME_ARQUIVO} criado.`);
//       res.json({
//         mensagem: "Backup FBK gerado com sucesso!",
//         arquivo: CAMINHO_COMPLETO,
//         timestamp: `${dia}/${mes}/${ano} às ${hora}:${minuto}`,
//       });
//     });
//   } catch (err) {
//     console.error("ERRO DE SISTEMA:", err.message);
//     res
//       .status(500)
//       .json({ erro: "Erro ao gerenciar pastas", detalhe: err.message });
//   }
// });

// // =============================================================
// // 7. ROTA RPA: MIGRAÇÃO FIREBIRD → MONGODB
// // =============================================================
// /**
//  * Endpoint: POST /api/migrate
//  * Descrição: Executa a migração de dados do Firebird para MongoDB
//  * Body: { mongoUrl: "mongodb+srv://..." }
//  * Resposta: { sucesso: boolean, resultados: {...}, tempo: string }
//  */
// app.post("/api/migrate", async (req, res) => {
//   try {
//     const { mongoUrl } = req.body;

//     if (!mongoUrl) {
//       return res.status(400).json({
//         erro: "MongoDB URL não fornecida",
//         dica: "Inclua 'mongoUrl' no body da requisição",
//       });
//     }

//     console.log("\n🤖 RPA INICIADA via API...\n");

//     // Executar migração
//     const resultado = await executarMigracao(mongoUrl);

//     if (resultado.sucesso) {
//       res.json(resultado);
//     } else {
//       res.status(500).json(resultado);
//     }
//   } catch (err) {
//     console.error("Erro na RPA:", err);
//     res.status(500).json({
//       sucesso: false,
//       erro: err.message,
//     });
//   }
// });

// // 6. ROTA DE IA
// const Groq = require("groq-sdk");

// app.post("/api/ai", async (req, res) => {
//   try {
//     const prompt = req.body.prompt || req.body.message;
//     if (!prompt) {
//       return res.status(400).json({ error: "Mensagem não enviada" });
//     }

//     const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

//     const completion = await groq.chat.completions.create({
//       model: "llama-3.3-70b-versatile",
//       messages: [
//         {
//           role: "system",
//           content: `Você é um assistente virtual do sistema CHM - Caixa de Honorários Médicos.
// Responda SEMPRE em português, de forma curta e direta (máximo 5 linhas).
// Você conhece todas as funcionalidades do sistema:

// - PACIENTES: Cadastro de pacientes com nome, CPF, celular, sexo e endereço.
// - MÉDICOS: Cadastro de médicos com CRM, especialidade, contato e foto.
// - ESPECIALIDADES: Cadastro das especialidades médicas.
// - FINANCEIRO (Lançamentos): Registro de atendimentos com valor, data, paciente, médico e especialidade. É possível marcar como pago.
// - RELATÓRIOS: Painel Geral com filtros de período e Analítico de Itens.
// - DASHBOARD: Gráficos e estatísticas de faturamento, pagamentos e pendências.
// - BACKUP: Gera backup do banco Firebird nos tipos Diário, Mensal ou Anual, salvando em C:\\\\WWW\\\\Backups.
// - ASSISTENTE IA: Chat inteligente para tirar dúvidas sobre o sistema.
// - WhatsApp: Botão VERDE a ESQUERDA para contato via WhatsApp.
// - Suporte Técnico: Botão AZUL a DIREITA para contato técnico.
// - Lançamentos: Antes de lançar novo valores, verificar se o paciente e o médico estão cadastrados.
// - Na dashboard, os gráficos mostram o faturamento mensal e a evolução dos pagamentos.
// - Documentação do Paciente: No cadastro do paciente, é possível adicionar observações importantes sobre o histórico do paciente, como alergias, preferências de contato ou informações relevantes para o atendimento médico.`,

//           // Se a pergunta não for sobre o sistema CHM, responda:
//           // "Só posso responder perguntas sobre o sistema CHM."`,
//         },
//         {
//           role: "user",
//           content: prompt,
//         },
//       ],
//       max_tokens: 1024,
//     });

//     const aiText =
//       completion.choices[0]?.message?.content || "Sem resposta da IA";
//     res.json({ text: aiText });
//   } catch (err) {
//     console.error("Erro interno IA:", err);
//     res.status(500).json({ error: "Erro interno IA", detalhe: err.message });
//   }
// });

// // --- INICIALIZAÇÃO ---
// const PORT_FINAL = process.env.PORT || 4000;
// app.listen(PORT_FINAL, () => {
//   console.log(`🚀 SERVIDOR CHM RODANDO NA PORTA ${PORT_FINAL}`);
//   console.log(
//     `\n=============================================================`,
//   );
//   console.log(`📊 CONFIGURAÇÃO ATUAL:`);
//   console.log(`   🖥️  SO: ${isWindows ? "Windows" : "Linux/AWS"}`);
//   console.log(`   📁 Banco: ${dbPath}`);
//   console.log(`   📸 Uploads: ${uploadDir}`);
//   console.log(
//     `   🔒 CORS: ${JSON.stringify(corsOptions.origin).substring(0, 50)}...`,
//   );
//   console.log(
//     `=============================================================\n`,
//   );
// });
