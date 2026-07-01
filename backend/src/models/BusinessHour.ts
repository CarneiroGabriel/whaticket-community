import {
  Table,
  Column,
  DataType,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  Default,
  Unique
} from "sequelize-typescript";

export interface TimeInterval {
  start: string;
  end: string;
}

@Table
class BusinessHour extends Model<BusinessHour> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Unique
  @Column
  dayOfWeek: number;

  @Default(false)
  @Column
  enabled: boolean;

  @Default("[]")
  @Column(DataType.TEXT)
  get intervals(): TimeInterval[] {
    const raw = this.getDataValue("intervals" as any);
    try {
      return JSON.parse(raw || "[]");
    } catch {
      return [];
    }
  }

  set intervals(value: TimeInterval[]) {
    (this as any).setDataValue("intervals", JSON.stringify(value));
  }

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default BusinessHour;
