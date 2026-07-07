import ShowWhatsAppService from "./ShowWhatsAppService";
import { getOrSetCache } from "../../libs/cache";

// Filas de um WhatsApp mudam pouco (só quando um admin edita a conexão ou
// a fila em si), mas ShowWhatsAppService é consultado 1-2x por mensagem
// recebida no fluxo de bot (handleMessage + handleQueueLogic). TTL mais
// longo que o de settings porque a edição de filas é uma ação ainda mais
// rara no dia a dia.
const QUEUE_CACHE_TTL_SECONDS = 600; // 10 min

export const whatsappQueuesCacheKey = (whatsappId: number | string): string =>
  `whatsapp:${whatsappId}:queues`;

// Usado quando uma fila é editada e não se sabe de antemão quais conexões a usam.
export const whatsappQueuesCachePattern = (): string => "whatsapp:*:queues";

export interface CachedWhatsAppQueue {
  id: number;
  name: string;
  color: string;
  greetingMessage: string | null;
}

export interface CachedWhatsAppQueues {
  farewellMessage: string | null;
  greetingMessage: string | null;
  queues: CachedWhatsAppQueue[];
}

// Retorna só os campos lidos pelo fluxo de mensagens (handleWhatsappEvents),
// não a instância completa do Sequelize — quem precisa atualizar o registro
// (UpdateWhatsAppService) continua usando ShowWhatsAppService diretamente.
const GetCachedWhatsAppQueues = async (
  whatsappId: number | string
): Promise<CachedWhatsAppQueues> => {
  return getOrSetCache(
    whatsappQueuesCacheKey(whatsappId),
    QUEUE_CACHE_TTL_SECONDS,
    async () => {
      const whatsapp = await ShowWhatsAppService(whatsappId);

      return {
        farewellMessage: whatsapp.farewellMessage,
        greetingMessage: whatsapp.greetingMessage,
        queues: whatsapp.queues.map(queue => ({
          id: queue.id,
          name: queue.name,
          color: queue.color,
          greetingMessage: queue.greetingMessage
        }))
      };
    }
  );
};

export default GetCachedWhatsAppQueues;
