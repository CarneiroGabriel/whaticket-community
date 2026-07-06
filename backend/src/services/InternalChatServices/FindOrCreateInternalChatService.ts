import AppError from "../../errors/AppError";
import InternalChat from "../../models/InternalChat";

interface Request {
  currentUserId: string | number;
  otherUserId: string | number;
}

const FindOrCreateInternalChatService = async ({
  currentUserId,
  otherUserId
}: Request): Promise<InternalChat> => {
  const currentId = +currentUserId;
  const otherId = +otherUserId;

  if (currentId === otherId) {
    throw new AppError("ERR_INTERNAL_CHAT_SELF");
  }

  const user1Id = Math.min(currentId, otherId);
  const user2Id = Math.max(currentId, otherId);

  const [internalChat] = await InternalChat.findOrCreate({
    where: { user1Id, user2Id },
    defaults: { user1Id, user2Id }
  });

  return internalChat;
};

export default FindOrCreateInternalChatService;
