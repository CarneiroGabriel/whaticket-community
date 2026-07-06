import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  HasMany
} from "sequelize-typescript";

import User from "./User";
import InternalMessage from "./InternalMessage";

@Table
class InternalChat extends Model<InternalChat> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => User)
  @Column
  user1Id: number;

  @BelongsTo(() => User, "user1Id")
  user1: User;

  @ForeignKey(() => User)
  @Column
  user2Id: number;

  @BelongsTo(() => User, "user2Id")
  user2: User;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @HasMany(() => InternalMessage)
  messages: InternalMessage[];
}

export default InternalChat;
