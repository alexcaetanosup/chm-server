const express = require("express");
const Firebird = require("node-firebird");
const cors = require("cors");

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

// ==========================================
// 1. DASHBOARD
// ==========================================
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

app.post("/api/pacientes", (req, res) => {
  const { CDPACIENTE, DCPACIENTE, CPF, CELULAR, SEXO } = req.body;
  Firebird.attach(options, (err, db) => {
    if (err) return res.status(500).json({ error: err.message });
    let query, params;
    if (CDPACIENTE) {
      query =
        "UPDATE PACIENTE SET DCPACIENTE=?, CPF=?, CELULAR=?, SEXO=? WHERE CDPACIENTE=?";
      params = [DCPACIENTE.toUpperCase(), CPF, CELULAR, SEXO, CDPACIENTE];
    } else {
      query =
        "INSERT INTO PACIENTE (DCPACIENTE, CPF, CELULAR, SEXO) VALUES (?, ?, ?, ?)";
      params = [DCPACIENTE.toUpperCase(), CPF, CELULAR, SEXO];
    }
    db.query(query, params, (err) => {
      db.detach();
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: "OK" });
    });
  });
});

app.delete("/api/pacientes/:id", (req, res) => {
  const { id } = req.params;
  Firebird.attach(options, (err, db) => {
    if (err) return res.status(500).json({ error: err.message });
    db.query("DELETE FROM PACIENTE WHERE CDPACIENTE = ?", [id], (err) => {
      db.detach();
      if (err)
        return res.status(500).json({
          error: "Erro ao excluir: Paciente vinculado a lançamentos.",
        });
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
  const { CDESPECIAL, DCESPECIAL } = req.body;
  Firebird.attach(options, (err, db) => {
    if (err) return res.status(500).json({ error: err.message });
    let query = CDESPECIAL
      ? "UPDATE ESPECIALIDADE SET DCESPECIAL=? WHERE CDESPECIAL=?"
      : "INSERT INTO ESPECIALIDADE (DCESPECIAL) VALUES (?)";
    let params = CDESPECIAL
      ? [DCESPECIAL.toUpperCase(), CDESPECIAL]
      : [DCESPECIAL.toUpperCase()];
    db.query(query, params, (err) => {
      db.detach();
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: "OK" });
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
          .json({ error: "Erro ao excluir: Especialidade em uso." });
      res.json({ message: "OK" });
    });
  });
});

// ==========================================
// 4. MÉDICOS
// ==========================================
app.get("/api/medicos", (req, res) => {
  const { nome } = req.query;
  Firebird.attach(options, (err, db) => {
    if (err) return res.status(500).json({ error: err.message });

    let sql = `
      SELECT M.CDMEDICO, M.DCMEDICO, M.CRM, M.CDESPECIALIDADE, M.CELULAR, E.DCESPECIAL 
      FROM MEDICO M
      LEFT JOIN ESPECIALIDADE E ON (E.CDESPECIAL = M.CDESPECIALIDADE)
    `;
    let params = [];

    if (nome) {
      sql += " WHERE UPPER(M.DCMEDICO) LIKE ?";
      params = [`%${nome.toUpperCase()}%`];
    }

    sql += " ORDER BY M.DCMEDICO";

    db.query(sql, params, (err, result) => {
      db.detach();
      if (err) return res.status(500).json({ error: err.message });
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
      query =
        "UPDATE MEDICO SET DCMEDICO=?, CRM=?, CDESPECIALIDADE=?, CELULAR=? WHERE CDMEDICO=?";
      params = [
        m.DCMEDICO.toUpperCase(),
        m.CRM,
        m.CDESPECIALIDADE,
        m.CELULAR,
        m.CDMEDICO,
      ];
    } else {
      query =
        "INSERT INTO MEDICO (DCMEDICO, CRM, CDESPECIALIDADE, CELULAR) VALUES (?, ?, ?, ?)";
      params = [m.DCMEDICO.toUpperCase(), m.CRM, m.CDESPECIALIDADE, m.CELULAR];
    }
    db.query(query, params, (err) => {
      db.detach();
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: "OK" });
    });
  });
});

app.delete("/api/medicos/:id", (req, res) => {
  const { id } = req.params;
  Firebird.attach(options, (err, db) => {
    if (err) return res.status(500).json({ error: err.message });
    db.query("DELETE FROM MEDICO WHERE CDMEDICO = ?", [id], (err) => {
      db.detach();
      if (err)
        return res
          .status(500)
          .json({ error: "Erro ao excluir: Médico vinculado a atendimentos." });
      res.json({ message: "OK" });
    });
  });
});

// ==========================================
// 5. LANÇAMENTOS (PARCELAM)
// ==========================================
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

app.post("/api/lancamentos", (req, res) => {
  const l = req.body;
  Firebird.attach(options, (err, db) => {
    if (err) return res.status(500).json({ error: err.message });
    const query = `
      INSERT INTO PARCELAM (DATATEND, DTPARCELA, VLPARCELA, CDPACIENTE, CDMEDICO, CDESPECIAL, PLANO, ABERTO, PARCELA)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      l.DATATEND,
      l.DTPARCELA,
      l.VLPARCELA,
      l.CDPACIENTE,
      l.CDMEDICO,
      l.CDESPECIAL,
      l.PLANO,
      "S",
      1,
    ];
    db.query(query, params, (err) => {
      db.detach();
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: "OK" });
    });
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
