import { Op } from "sequelize";
import { utcToZonedTime } from "date-fns-tz";
import Setting from "../models/Setting";
import BusinessHour, { TimeInterval } from "../models/BusinessHour";
import ScheduledAbsence from "../models/ScheduledAbsence";
import { getOrSetCache } from "../libs/cache";

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

const padTime = (n: number): string => String(n).padStart(2, "0");

export const getSettingValue = async (key: string): Promise<string> => {
  return getOrSetCache(settingCacheKey(key), SETTINGS_CACHE_TTL_SECONDS, async () => {
    const setting = await Setting.findOne({ where: { key } });
    return setting ? setting.value : "";
  });
};

// Retorna a hora atual "deslocada" para o fuso configurado: os métodos
// getUTC* dessa Date refletem o horário local do fuso (não o do processo Node).
const getZonedNow = async (): Promise<Date> => {
  const timezone = (await getSettingValue("timezone")) || DEFAULT_TIMEZONE;
  return utcToZonedTime(new Date(), timezone);
};

const zonedTimeStr = (zonedNow: Date): string =>
  `${padTime(zonedNow.getUTCHours())}:${padTime(zonedNow.getUTCMinutes())}`;

const zonedDateStr = (zonedNow: Date): string =>
  zonedNow.toISOString().slice(0, 10);

export const checkBusinessHours = async (): Promise<BusinessHourStatus> => {
  const enabled = await getSettingValue("businessHoursEnabled");

  if (enabled !== "true") {
    return { isOpen: true, absenceMessage: "" };
  }

  const zonedNow = await getZonedNow();
  const today = zonedDateStr(zonedNow);

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

  const dayOfWeek = zonedNow.getUTCDay();
  const timeStr = zonedTimeStr(zonedNow);

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

  if (!dayConfig || !dayConfig.enabled || dayConfig.intervals.length === 0) {
    const absenceMsg = await getSettingValue("businessHoursAbsenceMessage");
    return { isOpen: false, absenceMessage: absenceMsg };
  }

  const isWithinInterval = dayConfig.intervals.some(
    ({ start, end }) => timeStr >= start && timeStr <= end
  );

  if (!isWithinInterval) {
    const absenceMsg = await getSettingValue("businessHoursAbsenceMessage");
    return { isOpen: false, absenceMessage: absenceMsg };
  }

  return { isOpen: true, absenceMessage: "" };
};
