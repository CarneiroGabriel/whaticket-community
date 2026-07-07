import { Op, fn, col } from "sequelize";
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

  const chatIds = internalChats.map(internalChat => internalChat.id);

  // Antes: 2 queries por chat (findOne + count) dentro do map, ou seja 2N+1
  // queries na listagem. Agora: 3 queries no total, independente de N.
  const lastMessageIdRows = chatIds.length
    ? ((await InternalMessage.findAll({
        attributes: ["internalChatId", [fn("MAX", col("id")), "maxId"]],
        where: { internalChatId: chatIds },
        group: ["internalChatId"],
        raw: true
      })) as unknown as { internalChatId: number; maxId: number }[])
    : [];

  const lastMessageIds = lastMessageIdRows.map(row => row.maxId);

  const lastMessages = lastMessageIds.length
    ? await InternalMessage.findAll({ where: { id: lastMessageIds } })
    : [];
  const lastMessageByChatId = new Map(
    lastMessages.map(message => [message.internalChatId, message])
  );

  const unreadCountRows = chatIds.length
    ? ((await InternalMessage.findAll({
        attributes: ["internalChatId", [fn("COUNT", col("id")), "count"]],
        where: {
          internalChatId: chatIds,
          senderId: { [Op.ne]: currentUserId },
          read: false
        },
        group: ["internalChatId"],
        raw: true
      })) as unknown as { internalChatId: number; count: string }[])
    : [];
  const unreadCountByChatId = new Map(
    unreadCountRows.map(row => [row.internalChatId, parseInt(row.count, 10)])
  );

  const summaries = internalChats.map(internalChat => {
    const otherUser =
      internalChat.user1Id === currentUserId
        ? internalChat.user2
        : internalChat.user1;

    return {
      id: internalChat.id,
      otherUser: { id: otherUser.id, name: otherUser.name },
      lastMessage: lastMessageByChatId.get(internalChat.id) ?? null,
      unreadCount: unreadCountByChatId.get(internalChat.id) ?? 0
    };
  });

  summaries.sort((a, b) => {
    const aDate = a.lastMessage?.createdAt ?? new Date(0);
    const bDate = b.lastMessage?.createdAt ?? new Date(0);
    return +new Date(bDate) - +new Date(aDate);
  });

  return summaries;
};

export default ListInternalChatsService;
