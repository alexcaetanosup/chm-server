// -----------------------------
// SANITIZAÇÃO PARA FIREBIRD
// -----------------------------

function toInteger(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = parseInt(value);
  return isNaN(n) ? null : n;
}

function toFloat(value) {
  if (value === null || value === undefined || value === "") return null;

  const n = parseFloat(String(value).replace(/\./g, "").replace(",", "."));

  return isNaN(n) ? null : n;
}

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

const express = require("express");
const Firebird = require("node-firebird");
const cors = require("cors");
const multer = require("multer");

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURAÇÃO DO FIREBIRD 2.5.9 ---
const options = {
  host: "127.0.0.1",
  port: 3050,
  database: "C:\\WWW\\CHM\\chm-server\\CHM.FDB",
  user: "SYSDBA",
  password: "masterkey",
  lowercase_keys: false,
  pageSize: 4096,
};

//======================Tratamento da Foto==========
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

app.post("/upload", upload.single("foto"), (req, res) => {
  res.json({
    url: "http://localhost:4000/uploads/" + req.file.filename,
  });
});

app.use("/uploads", express.static("uploads"));

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
    db.query(
      "DELETE FROM ESPECIALIDADE WHERE CDESPECIALIDADE = ?",
      [id],
      (err) => {
        db.detach();
        if (err)
          return res
            .status(500)
            .json({ error: "Especialidade em uso por médicos." });
        res.json({ message: "OK" });
      },
    );
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

// 5. LANÇAMENTOS (PARCELAM)
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

// --- INICIALIZAÇÃO ---
const PORT = process.env.PORT || 4000; // Garanta que aqui seja 4000
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// const PORT = 4000;
// app.listen(PORT, () => {
//   console.log(`🚀 Servidor CHM v2 rodando em http://localhost:${PORT}`);
// });
