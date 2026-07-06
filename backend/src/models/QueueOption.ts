import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Default,
  ForeignKey,
  BelongsTo,
  HasMany
} from "sequelize-typescript";

import Queue from "./Queue";

@Table
class QueueOption extends Model<QueueOption> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Queue)
  @Column
  queueId: number;

  @BelongsTo(() => Queue)
  queue: Queue;

  @ForeignKey(() => QueueOption)
  @Column(DataType.INTEGER)
  parentId: number | null;

  @BelongsTo(() => QueueOption, "parentId")
  parent: QueueOption;

  @HasMany(() => QueueOption, "parentId")
  children: QueueOption[];

  @AllowNull(false)
  @Column
  title: string;

  @Column(DataType.TEXT)
  message: string;

  @Default(0)
  @Column
  sortOrder: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default QueueOption;
