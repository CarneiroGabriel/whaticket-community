import AppError from "../../errors/AppError";
import Queue from "../../models/Queue";
import User from "../../models/User";

const ShowQueueService = async (queueId: number | string): Promise<Queue> => {
  const queue = await Queue.findByPk(queueId, {
    include: [{ model: User, as: "users", attributes: ["id", "name"] }]
  });

  if (!queue) {
    throw new AppError("ERR_QUEUE_NOT_FOUND");
  }

  return queue;
};

export default ShowQueueService;
