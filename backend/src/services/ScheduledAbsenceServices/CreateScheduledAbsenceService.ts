import ScheduledAbsence from "../../models/ScheduledAbsence";

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

  return absence;
};

export default CreateScheduledAbsenceService;
