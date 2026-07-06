import { QueryInterface } from "sequelize";

const TIMEZONE_KEY = "timezone";
const DEFAULT_TIMEZONE = "America/Sao_Paulo";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const now = new Date();

    const [existingRaw] = await queryInterface.sequelize.query(
      "SELECT `key` FROM Settings WHERE `key` = ?",
      { replacements: [TIMEZONE_KEY] }
    );
    const existing = existingRaw as Array<{ key: string }>;

    if (existing.length === 0) {
      await queryInterface.bulkInsert("Settings", [
        {
          key: TIMEZONE_KEY,
          value: DEFAULT_TIMEZONE,
          createdAt: now,
          updatedAt: now
        }
      ]);
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(
      "DELETE FROM Settings WHERE `key` = ?",
      { replacements: [TIMEZONE_KEY] }
    );
  }
};
