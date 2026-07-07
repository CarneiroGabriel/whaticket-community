import { Op } from "sequelize";
import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Queue from "../../models/Queue";
import ShowQueueService from "./ShowQueueService";
import SyncQueueOptionsService, {
  QueueOptionInput
} from "./SyncQueueOptionsService";
import { invalidateCacheByPattern } from "../../libs/cache";
import { whatsappQueuesCachePattern } from "../WhatsappService/GetCachedWhatsAppQueues";

interface QueueData {
  name?: string;
  color?: string;
  greetingMessage?: string;
  userIds?: number[];
  options?: QueueOptionInput[];
}

const UpdateQueueService = async (
  queueId: number | string,
  queueData: QueueData
): Promise<Queue> => {
  const { color, name } = queueData;

  const queueSchema = Yup.object().shape({
    name: Yup.string()
      .min(2, "ERR_QUEUE_INVALID_NAME")
      .test(
        "Check-unique-name",
        "ERR_QUEUE_NAME_ALREADY_EXISTS",
        async value => {
          if (value) {
            const queueWithSameName = await Queue.findOne({
              where: { name: value, id: { [Op.not]: queueId } }
            });

            return !queueWithSameName;
          }
          return true;
        }
      ),
    color: Yup.string()
      .required("ERR_QUEUE_INVALID_COLOR")
      .test("Check-color", "ERR_QUEUE_INVALID_COLOR", async value => {
        if (value) {
          const colorTestRegex = /^#[0-9a-f]{3,6}$/i;
          return colorTestRegex.test(value);
        }
        return true;
      })
      .test(
        "Check-color-exists",
        "ERR_QUEUE_COLOR_ALREADY_EXISTS",
        async value => {
          if (value) {
            const queueWithSameColor = await Queue.findOne({
              where: { color: value, id: { [Op.not]: queueId } }
            });
            return !queueWithSameColor;
          }
          return true;
        }
      )
  });

  try {
    await queueSchema.validate({ color, name });
  } catch (err) {
    throw new AppError(err.message);
  }

  const { userIds, options, ...queueAttributes } = queueData;

  const queue = await ShowQueueService(queueId);

  await queue.update(queueAttributes);

  await queue.$set("users", userIds ?? []);
  await SyncQueueOptionsService(queue.id, options ?? []);

  await queue.reload();

  // name/color/greetingMessage entram no payload que GetCachedWhatsAppQueues
  // guarda para cada conexão associada a esta fila - sem saber de antemão
  // quais são, invalida a cache de filas de todos os whatsapps.
  await invalidateCacheByPattern(whatsappQueuesCachePattern());

  return queue;
};

export default UpdateQueueService;
