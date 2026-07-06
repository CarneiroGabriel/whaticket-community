import { Op } from "sequelize";
import QueueOption from "../../models/QueueOption";

export interface QueueOptionInput {
  id?: number;
  title: string;
  message?: string;
  sortOrder?: number;
  children?: QueueOptionInput[];
}

const syncLevel = async (
  queueId: number,
  parentId: number | null,
  nodes: QueueOptionInput[],
  keepIds: Set<number>
): Promise<void> => {
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];

    let record = node.id
      ? await QueueOption.findOne({ where: { id: node.id, queueId } })
      : null;

    const data = {
      queueId,
      parentId,
      title: node.title,
      message: node.message || "",
      sortOrder: node.sortOrder ?? i
    };

    if (record) {
      await record.update(data);
    } else {
      record = await QueueOption.create(data);
    }

    keepIds.add(record.id);

    if (node.children && node.children.length > 0) {
      await syncLevel(queueId, record.id, node.children, keepIds);
    }
  }
};

const SyncQueueOptionsService = async (
  queueId: number,
  options: QueueOptionInput[] = []
): Promise<void> => {
  const keepIds = new Set<number>();

  await syncLevel(queueId, null, options, keepIds);

  await QueueOption.destroy({
    where: {
      queueId,
      id: { [Op.notIn]: Array.from(keepIds) }
    }
  });
};

export default SyncQueueOptionsService;
