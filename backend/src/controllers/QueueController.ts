import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import CreateQueueService from "../services/QueueService/CreateQueueService";
import DeleteQueueService from "../services/QueueService/DeleteQueueService";
import ListQueuesService from "../services/QueueService/ListQueuesService";
import ShowQueueService from "../services/QueueService/ShowQueueService";
import UpdateQueueService from "../services/QueueService/UpdateQueueService";
import QueueOption from "../models/QueueOption";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const queues = await ListQueuesService();

  return res.status(200).json(queues);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { name, color, greetingMessage, userIds, options } = req.body;

  const queue = await CreateQueueService({
    name,
    color,
    greetingMessage,
    userIds,
    options
  });

  const io = getIO();
  io.emit("queue", {
    action: "update",
    queue
  });

  return res.status(200).json(queue);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { queueId } = req.params;

  const queue = await ShowQueueService(queueId);

  const options = await QueueOption.findAll({
    where: { queueId },
    order: [
      ["parentId", "ASC"],
      ["sortOrder", "ASC"]
    ]
  });

  return res.status(200).json({ ...queue.toJSON(), options });
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { queueId } = req.params;
  const { name, color, greetingMessage, userIds, options } = req.body;

  const queue = await UpdateQueueService(queueId, {
    name,
    color,
    greetingMessage,
    userIds,
    options
  });

  const io = getIO();
  io.emit("queue", {
    action: "update",
    queue
  });

  return res.status(201).json(queue);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { queueId } = req.params;

  await DeleteQueueService(queueId);

  const io = getIO();
  io.emit("queue", {
    action: "delete",
    queueId: +queueId
  });

  return res.status(200).send();
};
