import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as ScheduledAbsenceController from "../controllers/ScheduledAbsenceController";

const scheduledAbsenceRoutes = Router();

scheduledAbsenceRoutes.get(
  "/scheduledAbsences",
  isAuth,
  ScheduledAbsenceController.index
);
scheduledAbsenceRoutes.get(
  "/scheduledAbsences/:absenceId",
  isAuth,
  ScheduledAbsenceController.show
);
scheduledAbsenceRoutes.post(
  "/scheduledAbsences",
  isAuth,
  ScheduledAbsenceController.store
);
scheduledAbsenceRoutes.put(
  "/scheduledAbsences/:absenceId",
  isAuth,
  ScheduledAbsenceController.update
);
scheduledAbsenceRoutes.delete(
  "/scheduledAbsences/:absenceId",
  isAuth,
  ScheduledAbsenceController.remove
);

export default scheduledAbsenceRoutes;
