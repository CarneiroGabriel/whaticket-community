import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Queue from "../../models/Queue";
import SyncQueueOptionsService, {
  QueueOptionInput
} from "./SyncQueueOptionsService";

interface QueueData {
  name: string;
  color: string;
  greetingMessage?: string;
  userIds?: number[];
  options?: QueueOptionInput[];
}

const CreateQueueService = async (queueData: QueueData): Promise<Queue> => {
  const { color, name, userIds, options } = queueData;

  const queueSchema = Yup.object().shape({
    name: Yup.string()
      .min(2, "ERR_QUEUE_INVALID_NAME")
      .required("ERR_QUEUE_INVALID_NAME")
      .test(
        "Check-unique-name",
        "ERR_QUEUE_NAME_ALREADY_EXISTS",
        async value => {
          if (value) {
            const queueWithSameName = await Queue.findOne({
              where: { name: value }
            });

            return !queueWithSameName;
          }
          return false;
        }
      ),
    color: Yup.string()
      .required("ERR_QUEUE_INVALID_COLOR")
      .test("Check-color", "ERR_QUEUE_INVALID_COLOR", async value => {
        if (value) {
          const colorTestRegex = /^#[0-9a-f]{3,6}$/i;
          return colorTestRegex.test(value);
        }
        return false;
      })
      .test(
        "Check-color-exists",
        "ERR_QUEUE_COLOR_ALREADY_EXISTS",
        async value => {
          if (value) {
            const queueWithSameColor = await Queue.findOne({
              where: { color: value }
            });
            return !queueWithSameColor;
          }
          return false;
        }
      )
  });

  try {
    await queueSchema.validate({ color, name });
  } catch (err) {
    throw new AppError(err.message);
  }

  const { userIds: _userIds, options: _options, ...queueAttributes } = queueData;
  const queue = await Queue.create(queueAttributes);

  await queue.$set("users", userIds ?? []);
  await SyncQueueOptionsService(queue.id, options ?? []);

  await queue.reload();

  return queue;
};

export default CreateQueueService;
