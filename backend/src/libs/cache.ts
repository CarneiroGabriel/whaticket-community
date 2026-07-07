import {
  getFromRedis,
  setInRedisWithTTL,
  deleteFromRedis,
  deleteFromRedisByPattern
} from "./redisStore";
import { logger } from "../utils/logger";

// Helper genérico de cache: tenta ler do Redis, e em caso de miss (ou Redis
// indisponível) busca na fonte original e populada o cache. Nunca lança —
// se o Redis falhar, o fallback é sempre a consulta direta ao banco.
export const getOrSetCache = async <T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> => {
  const cached = await getFromRedis(key);

  if (cached !== null) {
    try {
      return JSON.parse(cached) as T;
    } catch (err) {
      logger.error({ info: "Error parsing cached value, refetching", key, err });
    }
  }

  const fresh = await fetchFn();

  await setInRedisWithTTL(key, JSON.stringify(fresh), ttlSeconds);

  return fresh;
};

export const invalidateCache = async (key: string): Promise<void> => {
  await deleteFromRedis(key);
};

export const invalidateCacheByPattern = async (
  pattern: string
): Promise<void> => {
  await deleteFromRedisByPattern(pattern);
};
