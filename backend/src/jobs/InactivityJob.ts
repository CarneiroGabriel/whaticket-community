import { Op } from "sequelize";
import { subMinutes } from "date-fns";
import * as Sentry from "@sentry/node";

import { logger } from "../utils/logger";
import Ticket from "../models/Ticket";
import Contact from "../models/Contact";
import Whatsapp from "../models/Whatsapp";
import { getSettingValue } from "../helpers/checkBusinessHours";
import { whatsappProvider } from "../providers/WhatsApp/whatsappProvider";
import formatBody from "../helpers/Mustache";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";

const INTERVAL_MS = 60 * 1000;

const processInactiveTickets = async (): Promise<void> => {
  const enabled = await getSettingValue("inactivityEnabled");
  if (enabled !== "true") return;

  const warningMinutes = parseInt(
    await getSettingValue("inactivityWarningMinutes"),
    10
  ) || 30;

  const resolveMinutes = parseInt(
    await getSettingValue("inactivityResolveMinutes"),
    10
  ) || 60;

  const warningMessage = await getSettingValue("inactivityWarningMessage");
  const sendFarewell =
    (await getSettingValue("inactivitySendFarewellMessage")) === "true";
  const farewellMessage = await getSettingValue("inactivityFarewellMessage");
  const onlyBotTickets =
    (await getSettingValue("inactivityOnlyBotTickets")) === "true";

  const now = new Date();
  const warningThreshold = subMinutes(now, warningMinutes);
  const resolveThreshold = subMinutes(now, resolveMinutes);

  const statusFilter = onlyBotTickets ? ["pending"] : ["pending", "open"];

  const baseWhere = {
    status: { [Op.in]: statusFilter },
    updatedAt: { [Op.lte]: warningThreshold }
  };

  const whereClause = onlyBotTickets
    ? { ...baseWhere, userId: null as null }
    : baseWhere;

  const tickets = await Ticket.findAll({
    where: whereClause as any,
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name", "number"]
      },
      {
        model: Whatsapp,
        as: "whatsapp",
        attributes: ["id", "name"]
      }
    ]
  });

  for (const ticket of tickets) {
    try {
      if (
        ticket.inactivityWarningSentAt &&
        ticket.inactivityWarningSentAt <= resolveThreshold
      ) {
        if (sendFarewell && farewellMessage && ticket.contact) {
          try {
            await whatsappProvider.sendMessage(
              ticket.whatsappId,
              `${ticket.contact.number}@c.us`,
              formatBody(farewellMessage, ticket.contact)
            );
          } catch (err) {
            logger.error("InactivityJob: error sending farewell", err);
          }
        }

        await UpdateTicketService({
          ticketData: { status: "closed" },
          ticketId: ticket.id
        });

        logger.info(
          `InactivityJob: ticket #${ticket.id} closed due to inactivity`
        );
      } else if (!ticket.inactivityWarningSentAt) {
        if (warningMessage && ticket.contact) {
          try {
            await whatsappProvider.sendMessage(
              ticket.whatsappId,
              `${ticket.contact.number}@c.us`,
              formatBody(warningMessage, ticket.contact)
            );
          } catch (err) {
            logger.error("InactivityJob: error sending warning", err);
          }
        }

        await ticket.update({ inactivityWarningSentAt: now });

        logger.info(
          `InactivityJob: inactivity warning sent to ticket #${ticket.id}`
        );
      }
    } catch (err) {
      Sentry.captureException(err);
      logger.error(`InactivityJob: error processing ticket #${ticket.id}`, err);
    }
  }
};

export const startInactivityJob = (): NodeJS.Timeout => {
  logger.info("InactivityJob: started");
  return setInterval(async () => {
    try {
      await processInactiveTickets();
    } catch (err) {
      Sentry.captureException(err);
      logger.error("InactivityJob: unhandled error", err);
    }
  }, INTERVAL_MS);
};
