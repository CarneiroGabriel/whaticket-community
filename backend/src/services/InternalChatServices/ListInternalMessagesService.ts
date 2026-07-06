import AppError from "../../errors/AppError";
import InternalChat from "../../models/InternalChat";
import InternalMessage from "../../models/InternalMessage";
import User from "../../models/User";

interface Request {
  internalChatId: string | number;
  userId: string | number;
  pageNumber?: string;
}

interface Response {
  messages: InternalMessage[];
  count: number;
  hasMore: boolean;
}

const ListInternalMessagesService = async ({
  internalChatId,
  userId,
  pageNumber = "1"
}: Request): Promise<Response> => {
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

  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: messages } = await InternalMessage.findAndCountAll({
    where: { internalChatId },
    include: [{ model: User, as: "sender", attributes: ["id", "name"] }],
    limit,
    offset,
    order: [["id", "DESC"]]
  });

  const hasMore = count > offset + messages.length;

  return { messages, count, hasMore };
};

export default ListInternalMessagesService;
