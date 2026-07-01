import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("BusinessHours", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      dayOfWeek: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "0=domingo, 1=segunda, ..., 6=sabado"
      },
      enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      intervals: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "[]",
        comment: 'JSON array: [{start:"08:00",end:"12:00"},...]'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex("BusinessHours", ["dayOfWeek"], {
      unique: true,
      name: "business_hours_day_unique"
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.dropTable("BusinessHours");
  }
};
