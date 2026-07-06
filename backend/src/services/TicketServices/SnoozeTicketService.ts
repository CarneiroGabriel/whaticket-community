import AppError from "../../errors/AppError";
import { getIO } from "../../libs/socket";
import Ticket from "../../models/Ticket";
import ShowTicketService from "./ShowTicketService";

interface Request {
  ticketId: string | number;
  snoozedUntil: string | Date;
}

interface Response {
  ticket: Ticket;
  oldStatus: string;
}

const SnoozeTicketService = async ({
  ticketId,
  snoozedUntil
}: Request): Promise<Response> => {
  const ticket = await ShowTicketService(ticketId);

  const snoozeDate = new Date(snoozedUntil);

  if (Number.isNaN(snoozeDate.getTime()) || snoozeDate <= new Date()) {
    throw new AppError("ERR_SNOOZE_DATE_IN_PAST");
  }

  if (ticket.status === "closed") {
    throw new AppError("ERR_CANNOT_SNOOZE_CLOSED_TICKET");
  }

  const oldStatus = ticket.status;
  const previousStatus =
    oldStatus === "snoozed" ? ticket.previousStatus : oldStatus;

  await ticket.update({
    status: "snoozed",
    snoozedUntil: snoozeDate,
    previousStatus
  });

  await ticket.reload();

  const io = getIO();

  if (oldStatus !== "snoozed") {
    io.to(oldStatus).emit("ticket", {
      action: "delete",
      ticketId: ticket.id
    });
  }

  io.to("snoozed")
    .to("notification")
    .to(ticketId.toString())
    .emit("ticket", {
      action: "update",
      ticket
    });

  return { ticket, oldStatus };
};

export default SnoozeTicketService;
