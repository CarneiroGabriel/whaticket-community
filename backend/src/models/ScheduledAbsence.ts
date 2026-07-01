import {
  Table,
  Column,
  DataType,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  Default
} from "sequelize-typescript";

@Table
class ScheduledAbsence extends Model<ScheduledAbsence> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @Column(DataType.DATEONLY)
  startDate: string;

  @Column(DataType.DATEONLY)
  endDate: string;

  @Default("")
  @Column(DataType.TEXT)
  message: string;

  @Default(true)
  @Column
  enabled: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ScheduledAbsence;
