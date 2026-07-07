import Redis, { RedisOptions } from "ioredis";

import { logger } from "../utils/logger";

let redisClient: Redis | null = null;

const REDIS_SESSION_TTL = 604800; // 7 days

// Suporta duas formas de configuração:
// - REDIS_URL: string de conexão completa (redis://user:pass@host:port/db), tem prioridade
// - IO_REDIS_SERVER/IO_REDIS_PORT/IO_REDIS_PASSWORD/IO_REDIS_DB_SESSION: variáveis
//   já usadas no .env real do projeto, mas que antes não eram lidas por este arquivo
//   (o cliente Redis nunca era inicializado nesse cenário, apesar de configurado)
const resolveRedisConnection = (): string | RedisOptions | null => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  if (!process.env.IO_REDIS_SERVER) return null;

  return {
    host: process.env.IO_REDIS_SERVER,
    port: parseInt(process.env.IO_REDIS_PORT || "6379", 10),
    password: process.env.IO_REDIS_PASSWORD || undefined,
    db: parseInt(
      process.env.REDIS_DB || process.env.IO_REDIS_DB_SESSION || "0",
      10
    )
  };
};

export const initRedis = async () => {
  if (redisClient) return;

  const connection = resolveRedisConnection();
  if (!connection) return;

  try {
    const options: RedisOptions = {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      disableClientInfo: true
    };

    redisClient =
      typeof connection === "string"
        ? new Redis(connection, options)
        : new Redis({ ...connection, ...options });

    redisClient.on("connect", () => {
      logger.info("Redis connected successfully");
    });

    redisClient.on("error", err => {
      logger.error({ info: "Redis connection error", err });
    });

    redisClient.on("close", () => {
      logger.warn("Redis connection closed");
    });

    redisClient.on("reconnecting", () => {
      logger.info("Redis reconnecting...");
    });

    await redisClient.connect();

    logger.info("Redis session store initialized");
  } catch (err) {
    logger.error({ info: "Failed to initialize Redis", err });
  }
};

export const setInRedis = async (key: string, data: string) => {
  if (!redisClient) return;

  try {
    await redisClient.setex(key, REDIS_SESSION_TTL, data);
    logger.debug(`Data saved to Redis: ${key}`);
  } catch (err) {
    logger.error({
      info: "Error inserting/updating data on Redis",
      key,
      err
    });
  }
};

export const getFromRedis = async (key: string) => {
  if (!redisClient) return null;

  try {
    const value = await redisClient.get(key);

    if (!value) return null;

    logger.debug(`Data found on Redis: ${key}`);

    return value;
  } catch (err) {
    logger.error({
      info: "Error getting data from Redis",
      key,
      err
    });
    return null;
  }
};

export const deleteFromRedis = async (key: string) => {
  if (!redisClient) return;

  try {
    await redisClient.del(key);
    logger.debug(`Data deleted from Redis: ${key}`);
  } catch (err) {
    logger.error({
      info: "Error deleting data from Redis",
      key,
      err
    });
  }
};

// Usada pelo cache de leitura (src/libs/cache.ts), com TTL configurável por
// chamada — diferente de setInRedis, que é fixo em 7 dias para sessão do WhatsApp.
export const setInRedisWithTTL = async (
  key: string,
  data: string,
  ttlSeconds: number
) => {
  if (!redisClient) return;

  try {
    await redisClient.setex(key, ttlSeconds, data);
    logger.debug(`Data cached in Redis: ${key} (ttl=${ttlSeconds}s)`);
  } catch (err) {
    logger.error({
      info: "Error caching data in Redis",
      key,
      err
    });
  }
};

// Invalida todas as chaves que casam com um prefixo (ex: "whatsapp:*:queues").
// Usa SCAN em vez de KEYS para não bloquear o Redis em produção.
export const deleteFromRedisByPattern = async (pattern: string) => {
  if (!redisClient) return;

  try {
    const stream = redisClient.scanStream({ match: pattern, count: 100 });
    const keysToDelete: string[] = [];

    await new Promise<void>((resolve, reject) => {
      stream.on("data", (keys: string[]) => {
        keysToDelete.push(...keys);
      });
      stream.on("end", resolve);
      stream.on("error", reject);
    });

    if (keysToDelete.length > 0) {
      await redisClient.del(...keysToDelete);
      logger.debug(
        `Data deleted from Redis by pattern "${pattern}": ${keysToDelete.length} key(s)`
      );
    }
  } catch (err) {
    logger.error({
      info: "Error deleting data from Redis by pattern",
      pattern,
      err
    });
  }
};

export const getRedisClient = () => redisClient;
