import AppError from "../../errors/AppError";
import BusinessHour, { TimeInterval } from "../../models/BusinessHour";
import { invalidateCache } from "../../libs/cache";
import { businessHourCacheKey } from "../../helpers/checkBusinessHours";

interface Request {
  id: number;
  enabled: boolean;
  intervals: TimeInterval[];
}

const UpdateBusinessHourService = async ({
  id,
  enabled,
  intervals
}: Request): Promise<BusinessHour> => {
  const businessHour = await BusinessHour.findByPk(id);

  if (!businessHour) {
    throw new AppError("ERR_NO_BUSINESS_HOUR_FOUND", 404);
  }

  await businessHour.update({ enabled, intervals });

  await invalidateCache(businessHourCacheKey(businessHour.dayOfWeek));

  return businessHour;
};

export default UpdateBusinessHourService;
