import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import ListInternalChatsService from "../services/InternalChatServices/ListInternalChatsService";
import ListInternalMessagesService from "../services/InternalChatServices/ListInternalMessagesService";
import CreateInternalMessageService from "../services/InternalChatServices/CreateInternalMessageService";
import MarkInternalMessagesAsReadService from "../services/InternalChatServices/MarkInternalMessagesAsReadService";

type IndexMessagesQuery = {
  pageNumber: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const userId = req.user.id;

  const chats = await ListInternalChatsService({ userId });

  return res.status(200).json(chats);
};

export const showMessages = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { internalChatId } = req.params;
  const { pageNumber } = req.query as IndexMessagesQuery;
  const userId = req.user.id;

  const { messages, count, hasMore } = await ListInternalMessagesService({
    internalChatId,
    userId,
    pageNumber
  });

  return res.status(200).json({ messages, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { receiverId, body } = req.body;
  const senderId = req.user.id;

  const message = await CreateInternalMessageService({
    senderId,
    receiverId,
    body
  });

  const io = getIO();
  io.to(`internalChat-user-${receiverId}`)
    .to(`internalChat-user-${senderId}`)
    .emit("internalMessage", {
      action: "create",
      message
    });

  return res.status(200).json(message);
};

export const markAsRead = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { internalChatId } = req.params;
  const userId = req.user.id;

  await MarkInternalMessagesAsReadService({ internalChatId, userId });

  const io = getIO();
  io.to(`internalChat-user-${userId}`).emit("internalMessage", {
    action: "read",
    internalChatId: +internalChatId
  });

  return res.status(200).json({ message: "internal messages marked as read" });
};
