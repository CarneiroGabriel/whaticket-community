import ScheduledAbsence from "../../models/ScheduledAbsence";
import { invalidateCache } from "../../libs/cache";
import { scheduledAbsenceCacheKey } from "../../helpers/checkBusinessHours";

interface Request {
  name: string;
  startDate: string;
  endDate: string;
  message: string;
  enabled?: boolean;
}

const CreateScheduledAbsenceService = async ({
  name,
  startDate,
  endDate,
  message,
  enabled = true
}: Request): Promise<ScheduledAbsence> => {
  const absence = await ScheduledAbsence.create({
    name,
    startDate,
    endDate,
    message,
    enabled
  });

  // Só o dia de hoje pode estar em cache neste momento (dias futuros ainda
  // não foram consultados por checkBusinessHours, então não há nada a
  // invalidar para eles - ver observação no relatório sobre esse limite).
  await invalidateCache(
    scheduledAbsenceCacheKey(new Date().toISOString().slice(0, 10))
  );

  return absence;
};

export default CreateScheduledAbsenceService;
