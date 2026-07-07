import ShowQueueService from "./ShowQueueService";
import { invalidateCacheByPattern } from "../../libs/cache";
import { whatsappQueuesCachePattern } from "../WhatsappService/GetCachedWhatsAppQueues";
import { queueOptionsCachePattern } from "./GetCachedQueueOptions";

const DeleteQueueService = async (queueId: number | string): Promise<void> => {
  const queue = await ShowQueueService(queueId);

  await queue.destroy();

  await invalidateCacheByPattern(whatsappQueuesCachePattern());
  await invalidateCacheByPattern(queueOptionsCachePattern(Number(queueId)));
};

export default DeleteQueueService;
