import { Request, Response } from "express";
import * as Yup from "yup";
import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";
import ListBusinessHoursService from "../services/BusinessHourServices/ListBusinessHoursService";
import UpdateBusinessHourService from "../services/BusinessHourServices/UpdateBusinessHourService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const hours = await ListBusinessHoursService();
  return res.status(200).json(hours);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { businessHourId } = req.params;
  const { enabled, intervals } = req.body;

  const schema = Yup.object().shape({
    enabled: Yup.boolean().required(),
    intervals: Yup.array()
      .of(
        Yup.object().shape({
          start: Yup.string().required(),
          end: Yup.string().required()
        })
      )
      .required()
  });

  try {
    await schema.validate({ enabled, intervals });
  } catch (err) {
    throw new AppError(err.message);
  }

  const businessHour = await UpdateBusinessHourService({
    id: Number(businessHourId),
    enabled,
    intervals
  });

  const io = getIO();
  io.emit("businessHours", { action: "update", businessHour });

  return res.status(200).json(businessHour);
};
