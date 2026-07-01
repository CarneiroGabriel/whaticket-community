import { QueryInterface, DataTypes } from "sequelize";

const now = new Date();

const newSettings = [
  { key: "businessHoursEnabled", value: "false" },
  { key: "businessHoursAbsenceMessage", value: "" },
  { key: "businessHoursSendOnlyAfterBot", value: "false" },
  { key: "businessHoursReplyWithBotOutOfHours", value: "false" },
  { key: "inactivityEnabled", value: "false" },
  { key: "inactivityWarningMinutes", value: "30" },
  { key: "inactivityResolveMinutes", value: "60" },
  { key: "inactivityWarningMessage", value: "" },
  { key: "inactivitySendFarewellMessage", value: "false" },
  { key: "inactivityFarewellMessage", value: "" },
  { key: "inactivityOnlyBotTickets", value: "false" },
  { key: "csatEnabled", value: "false" },
  { key: "csatRequestMessage", value: "" },
  { key: "csatThankYouMessage", value: "" }
];

const seedDays = [0, 1, 2, 3, 4, 5, 6].map(day => ({
  dayOfWeek: day,
  enabled: false,
  intervals: "[]",
  createdAt: now,
  updatedAt: now
}));

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const [existingRaw] = await queryInterface.sequelize.query(
      "SELECT `key` FROM Settings"
    );
    const existing = existingRaw as Array<{ key: string }>;
    const existingKeys = new Set(existing.map(r => r.key));

    const toInsert = newSettings
      .filter(s => !existingKeys.has(s.key))
      .map(s => ({ ...s, createdAt: now, updatedAt: now }));

    if (toInsert.length > 0) {
      await queryInterface.bulkInsert("Settings", toInsert);
    }

    const [existingDaysRaw] = await queryInterface.sequelize.query(
      "SELECT dayOfWeek FROM BusinessHours"
    );
    const existingDays = existingDaysRaw as Array<{ dayOfWeek: number }>;
    const existingDayNums = new Set(existingDays.map(r => r.dayOfWeek));
    const daysToInsert = seedDays.filter(d => !existingDayNums.has(d.dayOfWeek));

    if (daysToInsert.length > 0) {
      await queryInterface.bulkInsert("BusinessHours", daysToInsert);
    }

    const ticketCols = await queryInterface.describeTable("Tickets") as unknown as Record<string, unknown>;

    if (!ticketCols["outOfHoursMsgSent"]) {
      await queryInterface.addColumn("Tickets", "outOfHoursMsgSent", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    if (!ticketCols["inactivityWarningSentAt"]) {
      await queryInterface.addColumn("Tickets", "inactivityWarningSentAt", {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const keys = newSettings.map(s => `'${s.key}'`).join(",");
    await queryInterface.sequelize.query(
      `DELETE FROM Settings WHERE \`key\` IN (${keys})`
    );

    await queryInterface.bulkDelete("BusinessHours", {});

    const ticketCols = await queryInterface.describeTable("Tickets") as unknown as Record<string, unknown>;

    if (ticketCols["outOfHoursMsgSent"]) {
      await queryInterface.removeColumn("Tickets", "outOfHoursMsgSent");
    }

    if (ticketCols["inactivityWarningSentAt"]) {
      await queryInterface.removeColumn("Tickets", "inactivityWarningSentAt");
    }
  }
};
