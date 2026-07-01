import AppError from "../../errors/AppError";
import ScheduledAbsence from "../../models/ScheduledAbsence";

const DeleteScheduledAbsenceService = async (
  id: string | number
): Promise<void> => {
  const absence = await ScheduledAbsence.findByPk(id);

  if (!absence) {
    throw new AppError("ERR_NO_SCHEDULED_ABSENCE_FOUND", 404);
  }

  await absence.destroy();
};

export default DeleteScheduledAbsenceService;
