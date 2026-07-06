import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const ticketCols = (await queryInterface.describeTable(
      "Tickets"
    )) as unknown as Record<string, unknown>;

    if (!ticketCols["currentQueueOptionId"]) {
      await queryInterface.addColumn("Tickets", "currentQueueOptionId", {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "QueueOptions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      });
    }

    if (!ticketCols["queueOptionsResolved"]) {
      await queryInterface.addColumn("Tickets", "queueOptionsResolved", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const ticketCols = (await queryInterface.describeTable(
      "Tickets"
    )) as unknown as Record<string, unknown>;

    if (ticketCols["currentQueueOptionId"]) {
      await queryInterface.removeColumn("Tickets", "currentQueueOptionId");
    }

    if (ticketCols["queueOptionsResolved"]) {
      await queryInterface.removeColumn("Tickets", "queueOptionsResolved");
    }
  }
};
