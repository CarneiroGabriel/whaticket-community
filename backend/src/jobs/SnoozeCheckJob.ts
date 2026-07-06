import { Op } from "sequelize";
import * as Sentry from "@sentry/node";

import { logger } from "../utils/logger";
import { getIO } from "../libs/socket";
import Ticket from "../models/Ticket";

const INTERVAL_MS = 30 * 1000;

const processSnoozedTickets = async (): Promise<void> => {
  const tickets = await Ticket.findAll({
    where: {
      status: "snoozed",
      snoozedUntil: { [Op.lte]: new Date() }
    }
  });

  if (tickets.length === 0) return;

  const io = getIO();

  for (const ticket of tickets) {
    try {
      const restoredStatus = ticket.previousStatus || "pending";

      await ticket.update({
        status: restoredStatus,
        snoozedUntil: null,
        previousStatus: null
      });

      await ticket.reload();

      io.to("snoozed").emit("ticket", {
        action: "delete",
        ticketId: ticket.id
      });

      io.to(ticket.status)
        .to("notification")
        .to(ticket.id.toString())
        .emit("ticket", {
          action: "update",
          ticket
        });

      logger.info(
        `SnoozeCheckJob: ticket #${ticket.id} restored to ${restoredStatus}`
      );
    } catch (err) {
      Sentry.captureException(err);
      logger.error(`SnoozeCheckJob: error processing ticket #${ticket.id}`, err);
    }
  }
};

export const startSnoozeCheckJob = (): NodeJS.Timeout => {
  logger.info("SnoozeCheckJob: started");
  return setInterval(async () => {
    try {
      await processSnoozedTickets();
    } catch (err) {
      Sentry.captureException(err);
      logger.error("SnoozeCheckJob: unhandled error", err);
    }
  }, INTERVAL_MS);
};
