import InternalMessage from "../../models/InternalMessage";
import User from "../../models/User";
import FindOrCreateInternalChatService from "./FindOrCreateInternalChatService";

interface Request {
  senderId: string | number;
  receiverId: string | number;
  body: string;
}

const CreateInternalMessageService = async ({
  senderId,
  receiverId,
  body
}: Request): Promise<InternalMessage> => {
  const internalChat = await FindOrCreateInternalChatService({
    currentUserId: senderId,
    otherUserId: receiverId
  });

  const message = await InternalMessage.create({
    internalChatId: internalChat.id,
    senderId: +senderId,
    body
  });

  await message.reload({
    include: [{ model: User, as: "sender", attributes: ["id", "name"] }]
  });

  return message;
};

export default CreateInternalMessageService;
