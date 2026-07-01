import ScheduledAbsence from "../../models/ScheduledAbsence";

const ListScheduledAbsencesService = async (): Promise<ScheduledAbsence[]> => {
  const absences = await ScheduledAbsence.findAll({
    order: [["startDate", "ASC"]]
  });
  return absences;
};

export default ListScheduledAbsencesService;
