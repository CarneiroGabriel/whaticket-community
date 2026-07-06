import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Default,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";

import User from "./User";
import InternalChat from "./InternalChat";

@Table
class InternalMessage extends Model<InternalMessage> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => InternalChat)
  @Column
  internalChatId: number;

  @BelongsTo(() => InternalChat)
  internalChat: InternalChat;

  @ForeignKey(() => User)
  @Column
  senderId: number;

  @BelongsTo(() => User, "senderId")
  sender: User;

  @Column(DataType.TEXT)
  body: string;

  @Default(false)
  @Column
  read: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default InternalMessage;
