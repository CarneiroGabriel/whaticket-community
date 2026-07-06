import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import InternalChat from "../../models/InternalChat";
import InternalMessage from "../../models/InternalMessage";

interface Request {
  internalChatId: string | number;
  userId: string | number;
}

const MarkInternalMessagesAsReadService = async ({
  internalChatId,
  userId
}: Request): Promise<void> => {
  const currentUserId = +userId;

  const internalChat = await InternalChat.findByPk(internalChatId);

  if (!internalChat) {
    throw new AppError("ERR_NO_INTERNAL_CHAT_FOUND", 404);
  }

  if (
    internalChat.user1Id !== currentUserId &&
    internalChat.user2Id !== currentUserId
  ) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  await InternalMessage.update(
    { read: true },
    {
      where: {
        internalChatId,
        senderId: { [Op.ne]: currentUserId },
        read: false
      }
    }
  );
};

export default MarkInternalMessagesAsReadService;
