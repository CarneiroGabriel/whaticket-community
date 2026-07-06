import { Op } from "sequelize";
import { utcToZonedTime } from "date-fns-tz";
import Setting from "../models/Setting";
import BusinessHour from "../models/BusinessHour";
import ScheduledAbsence from "../models/ScheduledAbsence";

const DEFAULT_TIMEZONE = "America/Sao_Paulo";

interface BusinessHourStatus {
  isOpen: boolean;
  absenceMessage: string;
}

const padTime = (n: number): string => String(n).padStart(2, "0");

export const getSettingValue = async (key: string): Promise<string> => {
  const setting = await Setting.findOne({ where: { key } });
  return setting ? setting.value : "";
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

  const activeAbsence = await ScheduledAbsence.findOne({
    where: {
      enabled: true,
      startDate: { [Op.lte]: today },
      endDate: { [Op.gte]: today }
    }
  });

  if (activeAbsence) {
    return { isOpen: false, absenceMessage: activeAbsence.message };
  }

  const dayOfWeek = zonedNow.getUTCDay();
  const timeStr = zonedTimeStr(zonedNow);

  const dayConfig = await BusinessHour.findOne({ where: { dayOfWeek } });

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
