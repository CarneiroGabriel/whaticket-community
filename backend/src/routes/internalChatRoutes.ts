import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as InternalChatController from "../controllers/InternalChatController";

const internalChatRoutes = Router();

internalChatRoutes.get(
  "/internalChats",
  isAuth,
  InternalChatController.index
);

internalChatRoutes.get(
  "/internalChats/:internalChatId/messages",
  isAuth,
  InternalChatController.showMessages
);

internalChatRoutes.post(
  "/internalChats/messages",
  isAuth,
  InternalChatController.store
);

internalChatRoutes.put(
  "/internalChats/:internalChatId/read",
  isAuth,
  InternalChatController.markAsRead
);

export default internalChatRoutes;
