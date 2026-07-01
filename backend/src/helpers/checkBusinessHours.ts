import { Op } from "sequelize";
import Setting from "../models/Setting";
import BusinessHour from "../models/BusinessHour";
import ScheduledAbsence from "../models/ScheduledAbsence";

interface BusinessHourStatus {
  isOpen: boolean;
  absenceMessage: string;
}

const padTime = (n: number): string => String(n).padStart(2, "0");

const currentTimeStr = (): string => {
  const now = new Date();
  return `${padTime(now.getHours())}:${padTime(now.getMinutes())}`;
};

const todayDateStr = (): string => {
  const now = new Date();
  return now.toISOString().slice(0, 10);
};

export const getSettingValue = async (key: string): Promise<string> => {
  const setting = await Setting.findOne({ where: { key } });
  return setting ? setting.value : "";
};

export const checkBusinessHours = async (): Promise<BusinessHourStatus> => {
  const enabled = await getSettingValue("businessHoursEnabled");

  if (enabled !== "true") {
    return { isOpen: true, absenceMessage: "" };
  }

  const today = todayDateStr();

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

  const now = new Date();
  const dayOfWeek = now.getDay();
  const timeStr = currentTimeStr();

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
