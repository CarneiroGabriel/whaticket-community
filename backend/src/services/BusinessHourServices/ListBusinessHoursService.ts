import BusinessHour from "../../models/BusinessHour";

const ListBusinessHoursService = async (): Promise<BusinessHour[]> => {
  const hours = await BusinessHour.findAll({ order: [["dayOfWeek", "ASC"]] });
  return hours;
};

export default ListBusinessHoursService;
