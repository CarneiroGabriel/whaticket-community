import QueueOption from "../../models/QueueOption";
import { getOrSetCache } from "../../libs/cache";

// Opções do chatbot mudam raramente (edição manual da árvore de etapas),
// mas são lidas em toda navegação do fluxo de bot (handleQueueOptionsLogic,
// isBotFlowActive) - potencialmente várias vezes por mensagem recebida.
const QUEUE_CACHE_TTL_SECONDS = 600; // 10 min

const parentKeyPart = (parentId: number | null): string =>
  parentId === null ? "root" : String(parentId);

export const queueOptionsCacheKey = (
  queueId: number,
  parentId: number | null
): string => `queueOptions:${queueId}:${parentKeyPart(parentId)}`;

export const queueOptionsCachePattern = (queueId: number): string =>
  `queueOptions:${queueId}:*`;

export interface CachedQueueOption {
  id: number;
  title: string;
  message: string;
  parentId: number | null;
  sortOrder: number;
}

const GetCachedQueueOptions = async (
  queueId: number,
  parentId: number | null
): Promise<CachedQueueOption[]> => {
  return getOrSetCache(
    queueOptionsCacheKey(queueId, parentId),
    QUEUE_CACHE_TTL_SECONDS,
    async () => {
      const options = await QueueOption.findAll({
        where: { queueId, parentId },
        order: [
          ["sortOrder", "ASC"],
          ["id", "ASC"]
        ]
      });

      return options.map(
        option => option.get({ plain: true }) as unknown as CachedQueueOption
      );
    }
  );
};

export default GetCachedQueueOptions;
