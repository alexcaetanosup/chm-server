require("dotenv").config();
const path = require("path");
const fs = require("fs");
const os = require("os");
const { exec } = require("child_process");
const express = require("express");
const Firebird = require("node-firebird");
const cors = require("cors");
const multer = require("multer");

// =============================================================
// 🤖 IMPORTAR RPA FIREBIRD → MONGODB
// =============================================================
const { executarMigracao } = require("./migrate-firebird-to-mongodb");

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
  // LOCAL (Windows): Aceita localhost e 5173
  corsOptions.origin = ["http://localhost:3000", "http://localhost:5173"];
  console.log("✅ CORS configurado para LOCALHOST");
} else if (isLinux) {
  // AWS/PRODUÇÃO (Linux): Aceita qualquer origem por enquanto
  corsOptions.origin = true;
  console.log("✅ CORS configurado para AWS (qualquer origem temporariamente)");
  console.log("⚠️  Recomendação: Restricione após configurar domínio\n");
}

app.use(cors(corsOptions));

app.use(express.json());

// Rota de teste
app.get("/api/health", (req, res) => res.send("Servidor Ativo!"));

// =============================================================
// 🗄️  CONFIGURAÇÃO DO FIREBIRD 2.5 (DINÂMICA)
// =============================================================
// Detecta automaticamente o caminho do banco conforme o SO:
// - Windows: C:\WWW\CHM\chm-server\CHM.FDB
// - Linux/AWS: /home/ubuntu/CHM/chm-server/CHM.FDB
// =============================================================
const dbPath = isWindows
  ? "C:\\WWW\\CHM\\chm-server\\CHM.FDB"
  : "/home/ubuntu/CHM/chm-server/CHM.FDB";

console.log(`📁 Caminho do Banco: ${dbPath}\n`);

const options = {
  host: "127.0.0.1", // Sempre localhost (servidor local)
  port: 3050, // Porta padrão Firebird
  database: dbPath, // Detectado conforme SO
  user: "SYSDBA", // Usuário padrão Firebird
  password: "masterkey", // Senha padrão
  lowercase_keys: false, // Mantém nomes de colunas como no banco
  pageSize: 4096, // Tamanho de página
};

// --- HELPER FUNCTIONS ---
function toDate(dateString) {
  if (!dateString) return null;
  // Aceita formatos: YYYY-MM-DD ou DD/MM/YYYY
  return new Date(dateString);
}

function toFloat(value) {
  if (!value) return 0.0;
  return parseFloat(value.toString().replace(",", "."));
}

function toInteger(value) {
  if (!value) return 0;
  return parseInt(value, 10);
}

//======================Tratamento da Foto==========
// =============================================================
// 📸 CONFIGURAÇÃO DE UPLOADS (Dinâmica conforme Ambiente)
// =============================================================
// Define o caminho e URL da pasta uploads conforme SO:
// - Windows: ./uploads/ (relativo ao servidor.js)
// - Linux/AWS: /home/ubuntu/CHM/chm-server/uploads/
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

//===========================================================

// 1. DASHBOARD
app.get("/api/dashboard/stats", (req, res) => {
  Firebird.attach(options, (err, db) => {
    if (err) return res.status(500).json({ error: err.message });
    const sql = `
      SELECT
        CAST(COUNT(*) AS INTEGER) as TOTAL_ATENDIMENTOS,
        CAST(COALESCE(SUM(VLPARCELA), 0) AS DOUBLE PRECISION) as FATURAMENTO_TOTAL,
        CAST(COALESCE(SUM(CASE WHEN ABERTO = 'S' THEN VLPARCELA ELSE 0 END), 0) AS DOUBLE PRECISION) as TOTAL_PENDENTE,
        CAST(COALESCE(SUM(CASE WHEN ABERTO = 'N' THEN VLPARCELA ELSE 0 END), 0) AS DOUBLE PRECISION) as TOTAL_PAGO
      FROM PARCELAM
    `;
    db.query(sql, (err, result) => {
      db.detach();
      if (err) return res.status(500).json({ error: err.message });
      res.json(
        result[0] || {
          TOTAL_ATENDIMENTOS: 0,
          FATURAMENTO_TOTAL: 0,
          TOTAL_PENDENTE: 0,
          TOTAL_PAGO: 0,
        },
      );
    });
  });
});

// ==========================================
// 2. PACIENTES
// ==========================================
//

// No seu server.js
app.get("/api/pacientes", (req, res) => {
  Firebird.attach(options, (err, db) => {
    if (err) {
      console.error("Erro ao conectar no Firebird:", err);
      // Retornamos status 500, mas enviamos um ARRAY VAZIO []
      // para o .map() do React não quebrar o sistema.
      return res.status(500).json([]);
    }
    // Verifique se os nomes das colunas abaixo existem exatamente assim no seu FDB
    const sql =
      "SELECT CDPACIENTE, DCPACIENTE, CPF, CELULAR, SEXO FROM PACIENTE ORDER BY DCPACIENTE";

    db.query(sql, (err, result) => {
      db.detach();
      if (err) {
        console.error(
          "Erro na Query (verifique se a tabela/coluna existe):",
          err,
        );
        return res.status(500).json([]);
      }
      // Se o banco retornar null/undefined por algum motivo, enviamos []
      res.json(result || []);
    });
  });
});

// POST PACIENTES CORRIGIDO
app.post("/api/pacientes", (req, res) => {
  const p = req.body;

  Firebird.attach(options, (err, db) => {
    if (err) return res.status(500).json({ error: err.message });

    const isUpdate = !!p.CDPACIENTE;

    const query = isUpdate
      ? `UPDATE PACIENTE SET
           DCPACIENTE=?, CPF=?, RG=?, CELULAR=?, TELEFONE=?,
           SEXO=?, CEP=?, ENDERECO=?, BAIRRO=?, CIDADE=?,
           UF=?, OBSERVA=?
         WHERE CDPACIENTE=?`
      : `INSERT INTO PACIENTE
           (DCPACIENTE, CPF, RG, CELULAR, TELEFONE, SEXO, CEP, ENDERECO, BAIRRO, CIDADE, UF, OBSERVA)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    // LÓGICA DE LIMPEZA E TRUNCAMENTO:
    const params = [
      p.DCPACIENTE ? p.DCPACIENTE.toUpperCase().substring(0, 60) : "",
      p.CPF ? p.CPF.replace(/\D/g, "").substring(0, 11) : "", // Remove pontos/traços para caber em 11 chars
      p.RG ? p.RG.replace(/\D/g, "").substring(0, 15) : "",
      p.CELULAR ? p.CELULAR.replace(/\D/g, "").substring(0, 11) : "", // Apenas números (11 chars)
      p.TELEFONE ? p.TELEFONE.replace(/\D/g, "").substring(0, 10) : "",
      p.SEXO || "M",
      p.CEP ? p.CEP.replace(/\D/g, "").substring(0, 8) : "", // Apenas números (8 chars)
      p.ENDERECO ? p.ENDERECO.toUpperCase().substring(0, 50) : "", // Corte agressivo para 50 chars
      p.BAIRRO ? p.BAIRRO.toUpperCase().substring(0, 30) : "",
      p.CIDADE ? p.CIDADE.toUpperCase().substring(0, 30) : "",
      p.UF ? p.UF.toUpperCase().substring(0, 2) : "",
      p.OBSERVA ? p.OBSERVA.toUpperCase().substring(0, 200) : "",
    ];

    if (isUpdate) params.push(p.CDPACIENTE);

    db.query(query, params, (err) => {
      db.detach();
      if (err) {
        console.error("ERRO FIREBIRD DETALHADO:", err.message);
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ message: "OK" });
    });
  });
});

app.put("/api/pacientes/:id", (req, res) => {
  const id = req.params.id;
  const p = req.body;

  Firebird.attach(options, (err, db) => {
    if (err) return res.status(500).json({ error: err.message });

    const query = `
      UPDATE PACIENTE SET
        DCPACIENTE=?,
        CPF=?,
        RG=?,
        CELULAR=?,
        TELEFONE=?,
        SEXO=?,
        CEP=?,
        ENDERECO=?,
        BAIRRO=?,
        CIDADE=?,
        UF=?,
        OBSERVA=?
      WHERE CDPACIENTE=?`;

    const params = [
      p.DCPACIENTE ? p.DCPACIENTE.toUpperCase().substring(0, 60) : "",
      p.CPF ? p.CPF.replace(/\D/g, "").substring(0, 11) : "",
      p.RG ? p.RG.replace(/\D/g, "").substring(0, 15) : "",
      p.CELULAR ? p.CELULAR.replace(/\D/g, "").substring(0, 11) : "",
      p.TELEFONE ? p.TELEFONE.replace(/\D/g, "").substring(0, 10) : "",
      p.SEXO || "M",
      p.CEP ? p.CEP.replace(/\D/g, "").substring(0, 8) : "",
      p.ENDERECO ? p.ENDERECO.toUpperCase().substring(0, 50) : "",
      p.BAIRRO ? p.BAIRRO.toUpperCase().substring(0, 30) : "",
      p.CIDADE ? p.CIDADE.toUpperCase().substring(0, 30) : "",
      p.UF ? p.UF.toUpperCase().substring(0, 2) : "",
      p.OBSERVA ? p.OBSERVA.toUpperCase().substring(0, 200) : "",
      id,
    ];

    db.query(query, params, (err) => {
      db.detach();

      if (err) return res.status(500).json({ error: err.message });

      res.json({ message: "Paciente atualizado" });
    });
  });
});

app.delete("/api/pacientes/:id", (req, res) => {
  const { id } = req.params;
  Firebird.attach(options, (err, db) => {
    if (err) return res.status(500).json({ error: err.message });
    db.query("DELETE FROM PACIENTE WHERE CDPACIENTE = ?", [id], (err) => {
      db.detach();
      if (err) {
        return res.status(500).json({
          error:
            "Este paciente não pode ser excluído pois possui lançamentos vinculados.",
        });
      }
      res.json({ message: "OK" });
    });
  });
});

// ==========================================
// 3. ESPECIALIDADES
// ==========================================
app.get("/api/especialidades", (req, res) => {
  Firebird.attach(options, (err, db) => {
    if (err) return res.status(500).json({ error: err.message });
    db.query(
      "SELECT CDESPECIAL, DCESPECIAL FROM ESPECIALIDADE ORDER BY DCESPECIAL",
      (err, result) => {
        db.detach();
        if (err) return res.status(500).json({ error: err.message });
        res.json(result);
      },
    );
  });
});

app.post("/api/especialidades", (req, res) => {
  const { DCESPECIAL } = req.body;

  Firebird.attach(options, (err, db) => {
    if (err) return res.status(500).json({ error: err.message });

    const query = `
      INSERT INTO ESPECIALIDADE (DCESPECIAL)
      VALUES (?)
      RETURNING CDESPECIAL
    `;

    db.query(query, [DCESPECIAL], (err, result) => {
      db.detach();

      if (err) return res.status(500).json({ error: err.message });

      res.json(result[0]);
    });
  });
});

app.put("/api/especialidades/:id", (req, res) => {
  const id = req.params.id;
  const { DCESPECIAL } = req.body;

  Firebird.attach(options, (err, db) => {
    if (err) {
      console.error("ERRO AO INSERIR PARCELA:", err);
      return res.status(500).json({ error: err.message });
    }

    const query = `
      UPDATE ESPECIALIDADE
      SET DCESPECIAL = ?
      WHERE CDESPECIAL = ?
    `;

    db.query(query, [DCESPECIAL, id], (err) => {
      db.detach();

      if (err) return res.status(500).json({ error: err.message });

      res.json({ message: "Atualizado com sucesso" });
    });
  });
});

app.delete("/api/especialidades/:id", (req, res) => {
  const { id } = req.params;
  Firebird.attach(options, (err, db) => {
    if (err) return res.status(500).json({ error: err.message });
    db.query("DELETE FROM ESPECIALIDADE WHERE CDESPECIAL = ?", [id], (err) => {
      db.detach();
      if (err)
        return res
          .status(500)
          .json({ error: "Especialidade em uso por médicos." });
      res.json({ message: "OK" });
    });
  });
});

// ==========================================
// 4. MÉDICOS
// ==========================================
app.get("/api/medicos", (req, res) => {
  Firebird.attach(options, (err, db) => {
    if (err) {
      console.error("Erro ao conectar no Firebird:", err);
      return res.status(500).json({ error: "Erro de conexão com o banco" });
    }
    db.query("SELECT * FROM MEDICO ORDER BY DCMEDICO ASC", (err, result) => {
      db.detach(); // SEMPRE desconectar
      if (err) {
        console.error("Erro na query de médicos:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json(result);
    });
  });
});

app.post("/api/medicos", (req, res) => {
  const m = req.body;
  Firebird.attach(options, (err, db) => {
    if (err) return res.status(500).json({ error: err.message });

    let query, params;

    if (m.CDMEDICO) {
      // UPDATE: Mantive os campos básicos, adicionei o OBSERVA
      query = `
        UPDATE MEDICO
        SET DCMEDICO=?, CRM=?, CDESPECIALIDADE=?, CELULAR=?, OBSERVA=?
        WHERE CDMEDICO=?`;
      params = [
        m.DCMEDICO.toUpperCase(),
        m.CRM,
        m.CDESPECIALIDADE,
        m.CELULAR,
        m.OBSERVA || "",
        m.CDMEDICO,
      ];
    } else {
      // INSERT: Agora com todos os 15 campos e aspas em "FOTO-MED"
      query = `
        INSERT INTO MEDICO (
          DCMEDICO, DATANASC, CPF, CRM, CDESPECIALIDADE,
          DCESPECIAL, CELULAR, TELEFONE, CEP, ENDERECO,
          BAIRRO, CIDADE, UF, OBSERVA, "FOTO-MED"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      params = [
        m.DCMEDICO ? m.DCMEDICO.toUpperCase() : "",
        m.DATANASC || null,
        m.CPF || "",
        m.CRM || "",
        m.CDESPECIALIDADE || null,
        m.DCESPECIAL || "",
        m.CELULAR || "",
        m.TELEFONE || "",
        m.CEP || "",
        m.ENDERECO || "",
        m.BAIRRO || "",
        m.CIDADE || "",
        m.UF || "",
        m.OBSERVA || "",
        m["FOTO-MED"] || "",
      ];
    }

    db.query(query, params, (err) => {
      db.detach();
      if (err) {
        console.error("ERRO NO BANCO:", err.message);
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ message: "OK" });
    });
  });
});

app.put("/api/medicos/:id", (req, res) => {
  const id = req.params.id;
  const m = req.body;

  Firebird.attach(options, (err, db) => {
    if (err) return res.status(500).json({ error: err.message });

    const query = `
      UPDATE MEDICO
      SET
        DCMEDICO=?,
        CRM=?,
        CDESPECIALIDADE=?,
        CELULAR=?,
        TELEFONE=?,
        CEP=?,
        ENDERECO=?,
        BAIRRO=?,
        CIDADE=?,
        UF=?,
        OBSERVA=?
      WHERE CDMEDICO=?`;

    const params = [
      m.DCMEDICO,
      m.CRM,
      m.CDESPECIALIDADE,
      m.CELULAR,
      m.TELEFONE,
      m.CEP,
      m.ENDERECO,
      m.BAIRRO,
      m.CIDADE,
      m.UF,
      m.OBSERVA,
      id,
    ];

    db.query(query, params, (err) => {
      db.detach();

      if (err) return res.status(500).json({ error: err.message });

      res.json({ message: "Atualizado" });
    });
  });
});

// Rota para excluir médico
app.delete("/api/medicos/:id", (req, res) => {
  const { id } = req.params;
  Firebird.attach(options, (err, db) => {
    if (err) return res.status(500).json({ error: err.message });

    // O Firebird lançará erro se o médico estiver vinculado a atendimentos (FK)
    db.query("DELETE FROM MEDICO WHERE CDMEDICO = ?", [id], (err) => {
      db.detach();
      if (err) {
        return res.status(500).json({
          error:
            "Não é possível excluir: Este médico possui atendimentos ou lançamentos vinculados.",
        });
      }
      res.json({ message: "Médico excluído com sucesso!" });
    });
  });
});

//5. LANÇAMENTOS (PARCELAM)
app.get("/api/lancamentos", (req, res) => {
  Firebird.attach(options, (err, db) => {
    if (err) return res.status(500).json({ error: err.message });
    const sql = `
      SELECT
        P.NRVENDA, P.DATATEND, P.DTPARCELA, P.VLPARCELA, P.ABERTO,
        PAC.DCPACIENTE AS PACIENTE, M.DCMEDICO AS MEDICO, E.DCESPECIAL AS ESPECIALIDADE
      FROM PARCELAM P
      LEFT JOIN PACIENTE PAC ON (PAC.CDPACIENTE = P.CDPACIENTE)
      LEFT JOIN MEDICO M ON (M.CDMEDICO = P.CDMEDICO)
      LEFT JOIN ESPECIALIDADE E ON (E.CDESPECIAL = P.CDESPECIAL)
      ORDER BY P.DATATEND DESC, PACIENTE ASC
    `;
    db.query(sql, (err, result) => {
      db.detach();
      if (err) return res.status(500).json({ error: err.message });
      res.json(result);
    });
  });
});

// GRAVAR LANÇAMENTOS...
app.post("/api/lancamentos", (req, res) => {
  const l = req.body;

  const planoMap = {
    PARTICULAR: 1,
    UNIMED: 2,
    AMIL: 3,
  };
  const plano = planoMap[l.PLANO] || 1;
  Firebird.attach(options, (err, db) => {
    if (err) return res.status(500).json({ error: err.message });
    // 🔹 pega número único
    db.query(
      "SELECT NEXT VALUE FOR GEN_NRVENDA AS NRVENDA FROM RDB$DATABASE",
      (err, result) => {
        if (err) {
          db.detach();
          return res.status(500).json(err);
        }
        const nrVenda = result[0].NRVENDA;
        const query = `
          INSERT INTO PARCELAM
          (NRVENDA, DTPARCELA, VLPARCELA, CDPACIENTE, PLANO, PARCELA, DATATEND, CDESPECIAL, CDMEDICO, ABERTO)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
          nrVenda,
          toDate(l.DTPARCELA),
          toFloat(l.VLPARCELA),
          toInteger(l.CDPACIENTE),
          plano,
          toInteger(l.PARCELA),
          toDate(l.DATATEND),
          toInteger(l.CDESPECIAL),
          toInteger(l.CDMEDICO),
          1,
        ];

        console.log("INSERT PARCELAM:", params);

        db.query(query, params, (err) => {
          db.detach();

          if (err) {
            console.error("ERRO AO INSERIR:", err);
            return res.status(500).json({ error: err.message });
          }

          res.status(201).json({ message: "OK", nrVenda });
        });
      },
    );
  });
});

app.put("/api/lancamentos/:id/pagar", (req, res) => {
  const { id } = req.params;
  Firebird.attach(options, (err, db) => {
    if (err) return res.status(500).json({ error: err.message });
    db.query(
      "UPDATE PARCELAM SET ABERTO = 'N' WHERE NRVENDA = ?",
      [id],
      (err) => {
        db.detach();
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Pagamento registrado!" });
      },
    );
  });
});

app.delete("/api/lancamentos/:id", (req, res) => {
  const { id } = req.params;
  Firebird.attach(options, (err, db) => {
    if (err) return res.status(500).json({ error: err.message });
    db.query("DELETE FROM PARCELAM WHERE NRVENDA = ?", [id], (err) => {
      db.detach();
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Lançamento excluído!" });
    });
  });
});

// Rota de Backup (Firebird)
app.post("/api/backup/firebird", (req, res) => {
  const { tipo } = req.body; // DIARIO, MENSAL ou ANUAL

  const agora = new Date();
  const ano = agora.getFullYear().toString();
  const mes = (agora.getMonth() + 1).toString().padStart(2, "0");
  const dia = agora.getDate().toString().padStart(2, "0");
  const hora = agora.getHours().toString().padStart(2, "0");
  const minuto = agora.getMinutes().toString().padStart(2, "0");

  // =============================================================
  // 🔧 DETECTAR GBAK CONFORME SO
  // =============================================================
  // Windows: gbak.exe na pasta do servidor
  // Linux/AWS: comando 'gbak' instalado no sistema
  // =============================================================
  const GBAK_PATH = isWindows
    ? path.resolve(__dirname, "gbak.exe")
    : "/usr/lib/firebird/2.5/bin/gbak";

  // =============================================================
  // 📂 ESTRUTURA DE PASTAS DE BACKUP
  // =============================================================
  // Windows: C:\WWW\Backups\2026\04\04\DIARIO\
  // Linux/AWS: /home/ubuntu/CHM/backups/2026/04/04/DIARIO/
  // =============================================================
  const DESTINO_DIR = isWindows
    ? path.join("C:", "WWW", "Backups", ano, mes, dia, tipo)
    : `/home/ubuntu/CHM/backups/${ano}/${mes}/${dia}/${tipo}`;

  try {
    // Cria as pastas caso não existam
    if (!fs.existsSync(DESTINO_DIR)) {
      fs.mkdirSync(DESTINO_DIR, { recursive: true });
    }

    // Nome do arquivo com timestamp para não sobrescrever
    const NOME_ARQUIVO = `BACKUP_CHM_${hora}${minuto}.FBK`;
    const CAMINHO_COMPLETO = path.join(DESTINO_DIR, NOME_ARQUIVO);

    // Caminho do banco (mesmo do options acima)
    const DB_PATH = dbPath;
    const USER = "SYSDBA";
    const PASS = "masterkey";

    // =============================================================
    // 📝 MONTAGEM DO COMANDO GBAK (adapta conforme SO)
    // =============================================================
    let comando;
    if (isWindows) {
      // Windows: aspas duplas para evitar erros de espaços
      comando = `"${GBAK_PATH}" -v -t -user ${USER} -password ${PASS} "${DB_PATH}" "${CAMINHO_COMPLETO}"`;
    } else {
      // Linux: sem aspas duplas (caminho sem espaços)
      comando = `${GBAK_PATH} -v -t -user ${USER} -password ${PASS} ${DB_PATH} ${CAMINHO_COMPLETO}`;
    }

    console.log("------------------------------------------");
    console.log(`GERANDO BACKUP EM: ${DESTINO_DIR}`);
    console.log("------------------------------------------");

    // Execução do Processo via CLI
    exec(comando, (error, stdout, stderr) => {
      if (error) {
        console.error("ERRO GBAK:", stderr || error.message);
        return res.status(500).json({
          erro: "Falha na extração GBAK",
          detalhe: stderr || error.message,
        });
      }

      console.log(`SUCESSO: ${NOME_ARQUIVO} criado.`);
      res.json({
        mensagem: "Backup FBK gerado com sucesso!",
        arquivo: CAMINHO_COMPLETO,
        timestamp: `${dia}/${mes}/${ano} às ${hora}:${minuto}`,
      });
    });
  } catch (err) {
    console.error("ERRO DE SISTEMA:", err.message);
    res
      .status(500)
      .json({ erro: "Erro ao gerenciar pastas", detalhe: err.message });
  }
});

// =============================================================
// 7. ROTA RPA: MIGRAÇÃO FIREBIRD → MONGODB
// =============================================================
/**
 * Endpoint: POST /api/migrate
 * Descrição: Executa a migração de dados do Firebird para MongoDB
 * Body: { mongoUrl: "mongodb+srv://..." }
 * Resposta: { sucesso: boolean, resultados: {...}, tempo: string }
 */
app.post("/api/migrate", async (req, res) => {
  try {
    const { mongoUrl } = req.body;

    if (!mongoUrl) {
      return res.status(400).json({
        erro: "MongoDB URL não fornecida",
        dica: "Inclua 'mongoUrl' no body da requisição",
      });
    }

    console.log("\n🤖 RPA INICIADA via API...\n");

    // Executar migração
    const resultado = await executarMigracao(mongoUrl);

    if (resultado.sucesso) {
      res.json(resultado);
    } else {
      res.status(500).json(resultado);
    }
  } catch (err) {
    console.error("Erro na RPA:", err);
    res.status(500).json({
      sucesso: false,
      erro: err.message,
    });
  }
});

// 6. ROTA DE IA
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
Você conhece todas as funcionalidades do sistema:

- PACIENTES: Cadastro de pacientes com nome, CPF, celular, sexo e endereço.
- MÉDICOS: Cadastro de médicos com CRM, especialidade, contato e foto.
- ESPECIALIDADES: Cadastro das especialidades médicas.
- FINANCEIRO (Lançamentos): Registro de atendimentos com valor, data, paciente, médico e especialidade. É possível marcar como pago.
- RELATÓRIOS: Painel Geral com filtros de período e Analítico de Itens.
- DASHBOARD: Gráficos e estatísticas de faturamento, pagamentos e pendências.
- BACKUP: Gera backup do banco Firebird nos tipos Diário, Mensal ou Anual, salvando em C:\\\\WWW\\\\Backups.
- ASSISTENTE IA: Chat inteligente para tirar dúvidas sobre o sistema.
- WhatsApp: Botão VERDE a ESQUERDA para contato via WhatsApp.
- Suporte Técnico: Botão AZUL a DIREITA para contato técnico.
- Lançamentos: Antes de lançar novo valores, verificar se o paciente e o médico estão cadastrados.
- Na dashboard, os gráficos mostram o faturamento mensal e a evolução dos pagamentos.
- Documentação do Paciente: No cadastro do paciente, é possível adicionar observações importantes sobre o histórico do paciente, como alergias, preferências de contato ou informações relevantes para o atendimento médico.`,

          // Se a pergunta não for sobre o sistema CHM, responda:
          // "Só posso responder perguntas sobre o sistema CHM."`,
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

// --- INICIALIZAÇÃO ---
const PORT_FINAL = process.env.PORT || 4000;
app.listen(PORT_FINAL, () => {
  console.log(`🚀 SERVIDOR CHM RODANDO NA PORTA ${PORT_FINAL}`);
  console.log(
    `\n=============================================================`,
  );
  console.log(`📊 CONFIGURAÇÃO ATUAL:`);
  console.log(`   🖥️  SO: ${isWindows ? "Windows" : "Linux/AWS"}`);
  console.log(`   📁 Banco: ${dbPath}`);
  console.log(`   📸 Uploads: ${uploadDir}`);
  console.log(
    `   🔒 CORS: ${JSON.stringify(corsOptions.origin).substring(0, 50)}...`,
  );
  console.log(
    `=============================================================\n`,
  );
});
