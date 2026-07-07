import AppError from "../../errors/AppError";
import Setting from "../../models/Setting";
import { invalidateCache } from "../../libs/cache";
import { settingCacheKey } from "../../helpers/checkBusinessHours";

interface Request {
  key: string;
  value: string;
}

const UpdateSettingService = async ({
  key,
  value
}: Request): Promise<Setting | undefined> => {
  const setting = await Setting.findOne({
    where: { key }
  });

  if (!setting) {
    throw new AppError("ERR_NO_SETTING_FOUND", 404);
  }

  await setting.update({ value });

  await invalidateCache(settingCacheKey(key));

  return setting;
};

export default UpdateSettingService;
