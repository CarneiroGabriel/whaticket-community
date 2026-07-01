import AppError from "../../errors/AppError";
import ScheduledAbsence from "../../models/ScheduledAbsence";

const ShowScheduledAbsenceService = async (
  id: string | number
): Promise<ScheduledAbsence> => {
  const absence = await ScheduledAbsence.findByPk(id);

  if (!absence) {
    throw new AppError("ERR_NO_SCHEDULED_ABSENCE_FOUND", 404);
  }

  return absence;
};

export default ShowScheduledAbsenceService;
