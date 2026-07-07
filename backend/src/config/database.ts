require("../bootstrap");

module.exports = {
  define: {
    charset: "utf8mb4",
    collate: "utf8mb4_bin"
  },
  dialect: process.env.DB_DIALECT || "mysql",
  timezone: "-03:00",
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  logging: false,
  pool: {
    // Default do Sequelize (max: 5) é baixo demais: HTTP + jobs (InactivityJob,
    // SnoozeCheckJob) + webhooks do WhatsApp disputam conexão ao mesmo tempo.
    // Valores pensados para até ~1000 atendimentos/semana, com margem de sobra;
    // ajustáveis por env sem redeploy de código.
    max: parseInt(process.env.DB_POOL_MAX || "20", 10),
    min: parseInt(process.env.DB_POOL_MIN || "2", 10),
    acquire: parseInt(process.env.DB_POOL_ACQUIRE || "30000", 10),
    idle: parseInt(process.env.DB_POOL_IDLE || "10000", 10)
  }
};
