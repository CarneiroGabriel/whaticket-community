import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as BusinessHourController from "../controllers/BusinessHourController";

const businessHourRoutes = Router();

businessHourRoutes.get("/businessHours", isAuth, BusinessHourController.index);
businessHourRoutes.put(
  "/businessHours/:businessHourId",
  isAuth,
  BusinessHourController.update
);

export default businessHourRoutes;
