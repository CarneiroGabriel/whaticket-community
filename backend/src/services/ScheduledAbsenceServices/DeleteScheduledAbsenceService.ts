import AppError from "../../errors/AppError";
import ScheduledAbsence from "../../models/ScheduledAbsence";
import { invalidateCache } from "../../libs/cache";
import { scheduledAbsenceCacheKey } from "../../helpers/checkBusinessHours";

const DeleteScheduledAbsenceService = async (
  id: string | number
): Promise<void> => {
  const absence = await ScheduledAbsence.findByPk(id);

  if (!absence) {
    throw new AppError("ERR_NO_SCHEDULED_ABSENCE_FOUND", 404);
  }

  await absence.destroy();

  await invalidateCache(
    scheduledAbsenceCacheKey(new Date().toISOString().slice(0, 10))
  );
};

export default DeleteScheduledAbsenceService;
