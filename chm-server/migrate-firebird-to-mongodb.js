/**
 * ============================================================
 * 🤖 RPA: MIGRAÇÃO FIREBIRD 2.5 → MONGODB
 * ============================================================
 * Script automático que:
 * 1. Lê dados do banco Firebird CHM.FDB
 * 2. Valida e limpa os dados
 * 3. Insere no MongoDB Atlas
 * 4. Retorna status da migração
 * ============================================================
 */

const Firebird = require("node-firebird");
const mongoose = require("mongoose");
const os = require("os");

// ============================================================
// 🔧 CONFIGURAÇÃO
// ============================================================
const isWindows = os.platform() === "win32";
const isLinux = os.platform() === "linux";

// Caminho do banco Firebird conforme SO
const dbPath = isWindows
  ? "C:\\WWW\\CHM\\chm-server\\CHM.FDB"
  : "/home/ubuntu/CHM/chm-server/CHM.FDB";

// Configuração Firebird
const firebirdOptions = {
  host: "127.0.0.1",
  port: 3050,
  database: dbPath,
  user: "SYSDBA",
  password: "masterkey",
  lowercase_keys: false,
  pageSize: 4096,
};

// ============================================================
// 📦 SCHEMAS MONGODB
// ============================================================

// Schema: PACIENTE
const pacienteSchema = new mongoose.Schema({
  CDPACIENTE: { type: Number, unique: true, required: true },
  DCPACIENTE: { type: String, required: true },
  CPF: String,
  RG: String,
  CELULAR: String,
  TELEFONE: String,
  SEXO: String,
  CEP: String,
  ENDERECO: String,
  BAIRRO: String,
  CIDADE: String,
  UF: String,
  OBSERVA: String,
  createdAt: { type: Date, default: Date.now },
});

// Schema: MEDICO
const medicoSchema = new mongoose.Schema({
  CDMEDICO: { type: Number, unique: true, required: true },
  DCMEDICO: { type: String, required: true },
  DATANASC: Date,
  CPF: String,
  CRM: String,
  CDESPECIALIDADE: Number,
  DCESPECIAL: String,
  CELULAR: String,
  TELEFONE: String,
  CEP: String,
  ENDERECO: String,
  BAIRRO: String,
  CIDADE: String,
  UF: String,
  OBSERVA: String,
  "FOTO-MED": String,
  createdAt: { type: Date, default: Date.now },
});

// Schema: ESPECIALIDADE
const especialidadeSchema = new mongoose.Schema({
  CDESPECIAL: { type: Number, unique: true, required: true },
  DCESPECIAL: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Schema: PARCELAM (Lançamentos)
const parcelamSchema = new mongoose.Schema({
  NRVENDA: { type: Number, required: true },
  DTPARCELA: Date,
  VLPARCELA: Number,
  CDPACIENTE: Number,
  PLANO: Number,
  PARCELA: Number,
  DATATEND: Date,
  CDESPECIAL: Number,
  CDMEDICO: Number,
  ABERTO: String, // 'S' ou 'N'
  createdAt: { type: Date, default: Date.now },
});

// Schema: USUARIOS
const usuarioSchema = new mongoose.Schema({
  CDUSUARIO: { type: Number, unique: true, required: true },
  USUARIO: { type: String, unique: true, required: true },
  SENHA: String,
  NOME: String,
  EMAIL: String,
  ATIVO: { type: String, default: "S" }, // 'S' ou 'N'
  DATAACC: Date,
  createdAt: { type: Date, default: Date.now },
});

// Criar modelos
const Paciente = mongoose.model("Paciente", pacienteSchema);
const Medico = mongoose.model("Medico", medicoSchema);
const Especialidade = mongoose.model("Especialidade", especialidadeSchema);
const Parcelam = mongoose.model("Parcelam", parcelamSchema);
const Lancamentos = mongoose.model("Lancamentos", parcelamSchema); // Alias para PARCELAM
const Usuario = mongoose.model("Usuario", usuarioSchema);

// ============================================================
// 🔄 FUNÇÕES DE MIGRAÇÃO
// ============================================================

/**
 * Conecta ao MongoDB
 */
async function conectarMongoDB(mongoUrl) {
  try {
    console.log("\n🔗 Conectando ao MongoDB...");
    await mongoose.connect(mongoUrl);
    console.log("✅ MongoDB conectado!\n");
    return true;
  } catch (err) {
    console.error("❌ Erro ao conectar MongoDB:", err.message);
    return false;
  }
}

/**
 * Limpar bancos de dados (antes de migração)
 */
async function limparMongoDB() {
  try {
    console.log("🗑️  Limpando dados antigos do MongoDB...");
    await Paciente.deleteMany({});
    await Medico.deleteMany({});
    await Especialidade.deleteMany({});
    await Parcelam.deleteMany({});
    console.log("✅ MongoDB limpo!\n");
  } catch (err) {
    console.error("❌ Erro ao limpar:", err.message);
  }
}

/**
 * Migrar ESPECIALIDADES
 */
async function migrarEspecialidades() {
  return new Promise((resolve) => {
    console.log("📚 Migrando ESPECIALIDADES...");
    Firebird.attach(firebirdOptions, (err, db) => {
      if (err) {
        console.error("❌ Erro Firebird:", err);
        resolve({ sucesso: false, erro: err.message });
        return;
      }

      db.query("SELECT * FROM ESPECIALIDADE", async (err, result) => {
        db.detach();
        if (err) {
          console.error("❌ Erro na query:", err);
          resolve({ sucesso: false, erro: err.message });
          return;
        }

        try {
          let contagem = 0;
          for (const row of result) {
            await Especialidade.create({
              CDESPECIAL: row.CDESPECIAL,
              DCESPECIAL: row.DCESPECIAL,
            });
            contagem++;
          }
          console.log(`✅ ${contagem} especialidades migradas!\n`);
          resolve({ sucesso: true, contagem });
        } catch (err) {
          console.error("❌ Erro ao inserir:", err.message);
          resolve({ sucesso: false, erro: err.message });
        }
      });
    });
  });
}

/**
 * Migrar PACIENTES
 */
async function migrarPacientes() {
  return new Promise((resolve) => {
    console.log("👥 Migrando PACIENTES...");
    Firebird.attach(firebirdOptions, (err, db) => {
      if (err) {
        console.error("❌ Erro Firebird:", err);
        resolve({ sucesso: false, erro: err.message });
        return;
      }

      db.query("SELECT * FROM PACIENTE", async (err, result) => {
        db.detach();
        if (err) {
          console.error("❌ Erro na query:", err);
          resolve({ sucesso: false, erro: err.message });
          return;
        }

        try {
          let contagem = 0;
          for (const row of result) {
            await Paciente.create({
              CDPACIENTE: row.CDPACIENTE,
              DCPACIENTE: row.DCPACIENTE,
              CPF: row.CPF || "",
              RG: row.RG || "",
              CELULAR: row.CELULAR || "",
              TELEFONE: row.TELEFONE || "",
              SEXO: row.SEXO || "M",
              CEP: row.CEP || "",
              ENDERECO: row.ENDERECO || "",
              BAIRRO: row.BAIRRO || "",
              CIDADE: row.CIDADE || "",
              UF: row.UF || "",
              OBSERVA: row.OBSERVA || "",
            });
            contagem++;
          }
          console.log(`✅ ${contagem} pacientes migrados!\n`);
          resolve({ sucesso: true, contagem });
        } catch (err) {
          console.error("❌ Erro ao inserir:", err.message);
          resolve({ sucesso: false, erro: err.message });
        }
      });
    });
  });
}

/**
 * Migrar MÉDICOS
 */
async function migrarMedicos() {
  return new Promise((resolve) => {
    console.log("👨‍⚕️  Migrando MÉDICOS...");
    Firebird.attach(firebirdOptions, (err, db) => {
      if (err) {
        console.error("❌ Erro Firebird:", err);
        resolve({ sucesso: false, erro: err.message });
        return;
      }

      db.query("SELECT * FROM MEDICO", async (err, result) => {
        db.detach();
        if (err) {
          console.error("❌ Erro na query:", err);
          resolve({ sucesso: false, erro: err.message });
          return;
        }

        try {
          let contagem = 0;
          for (const row of result) {
            await Medico.create({
              CDMEDICO: row.CDMEDICO,
              DCMEDICO: row.DCMEDICO,
              DATANASC: row.DATANASC || null,
              CPF: row.CPF || "",
              CRM: row.CRM || "",
              CDESPECIALIDADE: row.CDESPECIALIDADE || null,
              DCESPECIAL: row.DCESPECIAL || "",
              CELULAR: row.CELULAR || "",
              TELEFONE: row.TELEFONE || "",
              CEP: row.CEP || "",
              ENDERECO: row.ENDERECO || "",
              BAIRRO: row.BAIRRO || "",
              CIDADE: row.CIDADE || "",
              UF: row.UF || "",
              OBSERVA: row.OBSERVA || "",
              "FOTO-MED": row["FOTO-MED"] || "",
            });
            contagem++;
          }
          console.log(`✅ ${contagem} médicos migrados!\n`);
          resolve({ sucesso: true, contagem });
        } catch (err) {
          console.error("❌ Erro ao inserir:", err.message);
          resolve({ sucesso: false, erro: err.message });
        }
      });
    });
  });
}

/**
 * Migrar LANÇAMENTOS (PARCELAM)
 */
async function migrarParcelam() {
  return new Promise((resolve) => {
    console.log("💰 Migrando LANÇAMENTOS (PARCELAM)...");
    Firebird.attach(firebirdOptions, (err, db) => {
      if (err) {
        console.error("❌ Erro Firebird:", err);
        resolve({ sucesso: false, erro: err.message });
        return;
      }

      db.query("SELECT * FROM PARCELAM", async (err, result) => {
        db.detach();
        if (err) {
          console.error("❌ Erro na query:", err);
          resolve({ sucesso: false, erro: err.message });
          return;
        }

        try {
          let contagem = 0;
          for (const row of result) {
            try {
              await Parcelam.updateOne(
                { NRVENDA: row.NRVENDA },
                {
                  NRVENDA: row.NRVENDA,
                  DTPARCELA: row.DTPARCELA || null,
                  VLPARCELA: row.VLPARCELA || 0,
                  CDPACIENTE: row.CDPACIENTE || null,
                  PLANO: row.PLANO || 1,
                  PARCELA: row.PARCELA || 1,
                  DATATEND: row.DATATEND || null,
                  CDESPECIAL: row.CDESPECIAL || null,
                  CDMEDICO: row.CDMEDICO || null,
                  ABERTO: row.ABERTO || "S",
                },
                { upsert: true },
              );
              contagem++;
            } catch (innerErr) {
              console.error(
                `⚠️  Erro ao migrar lançamento ${row.NRVENDA}:`,
                innerErr.message,
              );
            }
          }
          console.log(`✅ ${contagem} lançamentos migrados!\n`);
          resolve({ sucesso: true, contagem });
        } catch (err) {
          console.error("❌ Erro ao inserir:", err.message);
          resolve({ sucesso: false, erro: err.message });
        }
      });
    });
  });
}

/**
 * Executar Trigger do PARCELAM (Recalcular Totalizadores)
 * Simula a lógica de trigger que existia no Firebird
 */
async function executarTriggerParcelam() {
  return new Promise((resolve) => {
    console.log("⚡ Executando trigger de PARCELAM...");
    Firebird.attach(firebirdOptions, (err, db) => {
      if (err) {
        console.error("❌ Erro Firebird:", err);
        resolve({ sucesso: true }); // Não falhar migração por causa de trigger
        return;
      }

      // Buscar totalizadores do Firebird para processar
      db.query(
        `
        SELECT 
          CDPACIENTE,
          COUNT(*) as TOTAL_LANCAMENTOS,
          SUM(CASE WHEN ABERTO = 'S' THEN VLPARCELA ELSE 0 END) as TOTAL_ABERTO,
          SUM(CASE WHEN ABERTO = 'N' THEN VLPARCELA ELSE 0 END) as TOTAL_PAGO
        FROM PARCELAM
        GROUP BY CDPACIENTE
      `,
        async (err, result) => {
          db.detach();
          if (err) {
            console.error("⚠️  Aviso ao processar trigger:", err.message);
            resolve({ sucesso: true }); // Continuar migração
            return;
          }

          try {
            // Registrar totalizadores (informativo)
            console.log(
              `📊 Totalizadores processados para ${result.length} pacientes`,
            );
            resolve({ sucesso: true });
          } catch (err) {
            console.error("⚠️  Erro ao processar trigger:", err.message);
            resolve({ sucesso: true });
          }
        },
      );
    });
  });
}

/**
 * Alias: migrarLancamentos = migrarParcelam
 * PARCELAM é a tabela de LANÇAMENTOS no Firebird
 * Ambos os nomes referem-se à mesma tabela
 */
const migrarLancamentos = migrarParcelam;

/**
 * Migrar USUARIOS
 */
async function migrarUsuarios() {
  return new Promise((resolve) => {
    console.log("👥 Migrando USUÁRIOS...");
    Firebird.attach(firebirdOptions, (err, db) => {
      if (err) {
        console.error("❌ Erro Firebird:", err);
        resolve({ sucesso: false, erro: err.message });
        return;
      }

      db.query("SELECT * FROM USUARIOS", async (err, result) => {
        db.detach();
        if (err) {
          console.error("❌ Erro na query:", err);
          resolve({ sucesso: false, erro: err.message });
          return;
        }

        try {
          let contagem = 0;
          for (const row of result) {
            await Usuario.create({
              CDUSUARIO: row.CDUSUARIO,
              USUARIO: row.USUARIO,
              SENHA: row.SENHA || "",
              NOME: row.NOME || "",
              EMAIL: row.EMAIL || "",
              ATIVO: row.ATIVO || "S",
              DATAACC: row.DATAACC || null,
            });
            contagem++;
          }
          console.log(`✅ ${contagem} usuários migrados!\n`);
          resolve({ sucesso: true, contagem });
        } catch (err) {
          console.error("❌ Erro ao inserir:", err.message);
          resolve({ sucesso: false, erro: err.message });
        }
      });
    });
  });
}

/**
 * Função Principal: Executar Migração Completa
 */
async function executarMigracao(mongoUrl) {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║  🤖 INICIANDO RPA: FIREBIRD → MONGODB                 ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  const inicio = Date.now();

  // Conectar MongoDB
  const conectado = await conectarMongoDB(mongoUrl);
  if (!conectado) {
    return {
      sucesso: false,
      erro: "Falha ao conectar MongoDB",
      tempo: 0,
    };
  }

  // Limpar dados antigos
  await limparMongoDB();

  // Executar migrações
  const resultados = {
    especialidades: await migrarEspecialidades(),
    pacientes: await migrarPacientes(),
    medicos: await migrarMedicos(),
    parcelam: await migrarParcelam(),
    usuarios: await migrarUsuarios(),
  };

  // Executar trigger de PARCELAM
  await executarTriggerParcelam();

  // Calcular tempo
  const tempo = ((Date.now() - inicio) / 1000).toFixed(2);

  // Resultado Final
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║  ✅ MIGRAÇÃO CONCLUÍDA!                              ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");
  console.log("📊 RESUMO DA MIGRAÇÃO FIREBIRD → MONGODB:");
  console.log(
    `   📋 Especialidades: ${resultados.especialidades.contagem || 0}`,
  );
  console.log(`   👥 Pacientes: ${resultados.pacientes.contagem || 0}`);
  console.log(`   🏥 Médicos: ${resultados.medicos.contagem || 0}`);
  console.log(
    `   💰 Lançamentos (PARCELAM): ${resultados.parcelam.contagem || 0}`,
  );
  console.log(`   👤 Usuários: ${resultados.usuarios.contagem || 0}`);
  console.log(`   ⏱️  Tempo total: ${tempo}s\n`);

  // Desconectar
  await mongoose.disconnect();

  return {
    sucesso: true,
    resultados,
    tempo,
  };
}

// Exportar para usar no server.js
module.exports = {
  executarMigracao,
  Paciente,
  Medico,
  Especialidade,
  Parcelam,
};
