import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";
import { invalidateCache } from "../../libs/cache";
import { whatsappQueuesCacheKey } from "./GetCachedWhatsAppQueues";

const DeleteWhatsAppService = async (id: string): Promise<void> => {
  const whatsapp = await Whatsapp.findOne({
    where: { id }
  });

  if (!whatsapp) {
    throw new AppError("ERR_NO_WAPP_FOUND", 404);
  }

  await whatsapp.destroy();

  await invalidateCache(whatsappQueuesCacheKey(id));
};

export default DeleteWhatsAppService;
