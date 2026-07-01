import AppError from "../../errors/AppError";
import ScheduledAbsence from "../../models/ScheduledAbsence";

interface Request {
  id: string | number;
  name?: string;
  startDate?: string;
  endDate?: string;
  message?: string;
  enabled?: boolean;
}

const UpdateScheduledAbsenceService = async ({
  id,
  ...data
}: Request): Promise<ScheduledAbsence> => {
  const absence = await ScheduledAbsence.findByPk(id);

  if (!absence) {
    throw new AppError("ERR_NO_SCHEDULED_ABSENCE_FOUND", 404);
  }

  await absence.update(data);

  return absence;
};

export default UpdateScheduledAbsenceService;
