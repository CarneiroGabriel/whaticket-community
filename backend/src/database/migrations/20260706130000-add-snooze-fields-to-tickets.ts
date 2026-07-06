import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const ticketCols = (await queryInterface.describeTable(
      "Tickets"
    )) as unknown as Record<string, unknown>;

    if (!ticketCols["snoozedUntil"]) {
      await queryInterface.addColumn("Tickets", "snoozedUntil", {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
      });
    }

    if (!ticketCols["previousStatus"]) {
      await queryInterface.addColumn("Tickets", "previousStatus", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const ticketCols = (await queryInterface.describeTable(
      "Tickets"
    )) as unknown as Record<string, unknown>;

    if (ticketCols["snoozedUntil"]) {
      await queryInterface.removeColumn("Tickets", "snoozedUntil");
    }

    if (ticketCols["previousStatus"]) {
      await queryInterface.removeColumn("Tickets", "previousStatus");
    }
  }
};
