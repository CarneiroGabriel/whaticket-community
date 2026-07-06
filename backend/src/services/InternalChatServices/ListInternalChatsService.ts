import { Op } from "sequelize";
import InternalChat from "../../models/InternalChat";
import InternalMessage from "../../models/InternalMessage";
import User from "../../models/User";

interface Request {
  userId: string | number;
}

interface ChatSummary {
  id: number;
  otherUser: { id: number; name: string };
  lastMessage: InternalMessage | null;
  unreadCount: number;
}

const ListInternalChatsService = async ({
  userId
}: Request): Promise<ChatSummary[]> => {
  const currentUserId = +userId;

  const internalChats = await InternalChat.findAll({
    where: {
      [Op.or]: [{ user1Id: currentUserId }, { user2Id: currentUserId }]
    },
    include: [
      { model: User, as: "user1", attributes: ["id", "name"] },
      { model: User, as: "user2", attributes: ["id", "name"] }
    ]
  });

  const summaries = await Promise.all(
    internalChats.map(async internalChat => {
      const otherUser =
        internalChat.user1Id === currentUserId
          ? internalChat.user2
          : internalChat.user1;

      const lastMessage = await InternalMessage.findOne({
        where: { internalChatId: internalChat.id },
        order: [["id", "DESC"]]
      });

      const unreadCount = await InternalMessage.count({
        where: {
          internalChatId: internalChat.id,
          senderId: { [Op.ne]: currentUserId },
          read: false
        }
      });

      return {
        id: internalChat.id,
        otherUser: { id: otherUser.id, name: otherUser.name },
        lastMessage,
        unreadCount
      };
    })
  );

  summaries.sort((a, b) => {
    const aDate = a.lastMessage?.createdAt ?? new Date(0);
    const bDate = b.lastMessage?.createdAt ?? new Date(0);
    return +new Date(bDate) - +new Date(aDate);
  });

  return summaries;
};

export default ListInternalChatsService;
