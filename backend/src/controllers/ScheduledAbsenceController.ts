import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";

import ListScheduledAbsencesService from "../services/ScheduledAbsenceServices/ListScheduledAbsencesService";
import ShowScheduledAbsenceService from "../services/ScheduledAbsenceServices/ShowScheduledAbsenceService";
import CreateScheduledAbsenceService from "../services/ScheduledAbsenceServices/CreateScheduledAbsenceService";
import UpdateScheduledAbsenceService from "../services/ScheduledAbsenceServices/UpdateScheduledAbsenceService";
import DeleteScheduledAbsenceService from "../services/ScheduledAbsenceServices/DeleteScheduledAbsenceService";

const absenceSchema = Yup.object().shape({
  name: Yup.string().required(),
  startDate: Yup.string().required(),
  endDate: Yup.string().required(),
  message: Yup.string().required(),
  enabled: Yup.boolean()
});

export const index = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const absences = await ListScheduledAbsencesService();
  return res.status(200).json(absences);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { absenceId } = req.params;
  const absence = await ShowScheduledAbsenceService(absenceId);
  return res.status(200).json(absence);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  try {
    await absenceSchema.validate(req.body);
  } catch (err) {
    throw new AppError(err.message);
  }

  const absence = await CreateScheduledAbsenceService(req.body);

  const io = getIO();
  io.emit("scheduledAbsence", { action: "create", absence });

  return res.status(200).json(absence);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { absenceId } = req.params;

  const absence = await UpdateScheduledAbsenceService({ id: absenceId, ...req.body });

  const io = getIO();
  io.emit("scheduledAbsence", { action: "update", absence });

  return res.status(200).json(absence);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { absenceId } = req.params;
  await DeleteScheduledAbsenceService(absenceId);

  const io = getIO();
  io.emit("scheduledAbsence", { action: "delete", absenceId });

  return res.status(200).json({ message: "Scheduled absence deleted" });
};
