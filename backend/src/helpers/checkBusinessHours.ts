import { Op } from "sequelize";
import Setting from "../models/Setting";
import BusinessHour, { TimeInterval } from "../models/BusinessHour";
import ScheduledAbsence from "../models/ScheduledAbsence";
import { getOrSetCache } from "../libs/cache";
import { logger } from "../utils/logger";

const DEFAULT_TIMEZONE = "America/Sao_Paulo";

// Dados de configuração: mudam raramente (só quando um admin edita), mas são
// lidos a cada mensagem recebida (handleMessage) e a cada tick do
// InactivityJob (60s). TTL curto o bastante para não incomodar um operador
// editando a config, e as escritas (Update*Service) invalidam ativamente.
const SETTINGS_CACHE_TTL_SECONDS = 300; // 5 min

export const settingCacheKey = (key: string): string => `settings:${key}`;
export const businessHourCacheKey = (dayOfWeek: number): string =>
  `businessHours:dayOfWeek:${dayOfWeek}`;
export const scheduledAbsenceCacheKey = (dateStr: string): string =>
  `scheduledAbsences:active:${dateStr}`;

interface BusinessHourStatus {
  isOpen: boolean;
  absenceMessage: string;
}

// 0 = domingo, ..., 6 = sábado - mesma convenção usada em BusinessHour.dayOfWeek
const WEEKDAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6
};

interface ZonedParts {
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm
  dayOfWeek: number;
}

// NÃO usar date-fns-tz aqui: a versão instalada (2.0.1) tem um bug real em
// utcToZonedTime - internamente ele monta o resultado com setFullYear/setHours
// (setters de horário LOCAL do processo) em vez de setUTCFullYear/setUTCHours,
// então o offset do fuso do sistema operacional acaba se misturando no cálculo.
// Nesta implantação o SO já está em America/Sao_Paulo, então o bug cancelava a
// conversão inteira (offset aplicado = alvo - sistema = 0) e o código comparava
// a hora UTC crua do container contra os intervalos em GMT-3. Intl.DateTimeFormat
// com `timeZone` é absoluto (não depende do fuso do processo) e evita o bug.
export const getZonedParts = (date: Date, timeZone: string): ZonedParts => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });

  const parts = formatter.formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {} as Record<string, string>);

  return {
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
    timeStr: `${parts.hour}:${parts.minute}`,
    dayOfWeek: WEEKDAY_INDEX[parts.weekday]
  };
};

// Compara por minutos desde a meia-noite em vez de comparação lexicográfica de
// string - "8:30" (sem zero à esquerda) quebraria "8:30" <= "12:00" como string.
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export const getSettingValue = async (key: string): Promise<string> => {
  return getOrSetCache(
    settingCacheKey(key),
    SETTINGS_CACHE_TTL_SECONDS,
    async () => {
      const setting = await Setting.findOne({ where: { key } });
      return setting ? setting.value : "";
    }
  );
};

export const checkBusinessHours = async (): Promise<BusinessHourStatus> => {
  const enabled = await getSettingValue("businessHoursEnabled");

  if (enabled !== "true") {
    return { isOpen: true, absenceMessage: "" };
  }

  const serverNow = new Date();
  const timezone = (await getSettingValue("timezone")) || DEFAULT_TIMEZONE;
  const {
    dateStr: today,
    timeStr,
    dayOfWeek
  } = getZonedParts(serverNow, timezone);

  logger.debug({
    info: "checkBusinessHours: horário calculado",
    serverNowUTC: serverNow.toISOString(),
    timezone,
    zonedDate: today,
    zonedTime: timeStr,
    dayOfWeek
  });

  const activeAbsence = await getOrSetCache<{ message: string } | null>(
    scheduledAbsenceCacheKey(today),
    SETTINGS_CACHE_TTL_SECONDS,
    async () => {
      const absence = await ScheduledAbsence.findOne({
        where: {
          enabled: true,
          startDate: { [Op.lte]: today },
          endDate: { [Op.gte]: today }
        }
      });
      return absence
        ? (absence.get({ plain: true }) as unknown as { message: string })
        : null;
    }
  );

  if (activeAbsence) {
    return { isOpen: false, absenceMessage: activeAbsence.message };
  }

  const dayConfig = await getOrSetCache<{
    enabled: boolean;
    intervals: TimeInterval[];
  } | null>(
    businessHourCacheKey(dayOfWeek),
    SETTINGS_CACHE_TTL_SECONDS,
    async () => {
      const record = await BusinessHour.findOne({ where: { dayOfWeek } });
      return record
        ? (record.get({ plain: true }) as unknown as {
            enabled: boolean;
            intervals: TimeInterval[];
          })
        : null;
    }
  );

  logger.debug({
    info: "checkBusinessHours: intervalos do dia (raw do banco)",
    dayOfWeek,
    dayConfig
  });

  if (!dayConfig || !dayConfig.enabled || dayConfig.intervals.length === 0) {
    const absenceMsg = await getSettingValue("businessHoursAbsenceMessage");
    return { isOpen: false, absenceMessage: absenceMsg };
  }

  const nowMinutes = timeToMinutes(timeStr);
  const isWithinInterval = dayConfig.intervals.some(
    ({ start, end }) =>
      nowMinutes >= timeToMinutes(start) && nowMinutes <= timeToMinutes(end)
  );

  logger.debug({
    info: "checkBusinessHours: resultado da comparação",
    zonedTime: timeStr,
    intervals: dayConfig.intervals,
    isWithinInterval
  });

  if (!isWithinInterval) {
    const absenceMsg = await getSettingValue("businessHoursAbsenceMessage");
    return { isOpen: false, absenceMessage: absenceMsg };
  }

  return { isOpen: true, absenceMessage: "" };
};
