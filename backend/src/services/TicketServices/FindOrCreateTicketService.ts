import { subHours } from "date-fns";
import { Op } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import ShowTicketService from "./ShowTicketService";
import { getIO } from "../../libs/socket";

const wakeIfSnoozed = async (ticket: Ticket): Promise<void> => {
  if (ticket.status !== "snoozed") return;

  getIO().to("snoozed").emit("ticket", {
    action: "delete",
    ticketId: ticket.id
  });
};

const FindOrCreateTicketService = async (
  contact: Contact,
  whatsappId: number,
  unreadMessages: number,
  groupContact?: Contact
): Promise<Ticket> => {
  let ticket = await Ticket.findOne({
    where: {
      status: {
        [Op.or]: ["open", "pending"]
      },
      contactId: groupContact ? groupContact.id : contact.id,
      whatsappId: whatsappId
    }
  });

  if (ticket) {
    await ticket.update({ unreadMessages });
  }

  if (!ticket && groupContact) {
    ticket = await Ticket.findOne({
      where: {
        contactId: groupContact.id,
        whatsappId: whatsappId
      },
      order: [["updatedAt", "DESC"]]
    });

    if (ticket) {
      const wasSnoozed = ticket.status === "snoozed";
      await wakeIfSnoozed(ticket);
      await ticket.update({
        status: "pending",
        userId: null,
        unreadMessages,
        ...(wasSnoozed ? { snoozedUntil: null, previousStatus: null } : {})
      });
    }
  }

  if (!ticket && !groupContact) {
    ticket = await Ticket.findOne({
      where: {
        updatedAt: {
          [Op.between]: [+subHours(new Date(), 2), +new Date()]
        },
        contactId: contact.id,
        whatsappId: whatsappId
      },
      order: [["updatedAt", "DESC"]]
    });

    if (ticket) {
      const wasSnoozed = ticket.status === "snoozed";
      await wakeIfSnoozed(ticket);
      await ticket.update({
        status: "pending",
        userId: null,
        unreadMessages,
        ...(wasSnoozed ? { snoozedUntil: null, previousStatus: null } : {})
      });
    }
  }

  if (!ticket) {
    ticket = await Ticket.create({
      contactId: groupContact ? groupContact.id : contact.id,
      status: "pending",
      isGroup: !!groupContact,
      unreadMessages,
      whatsappId
    });
  }

  ticket = await ShowTicketService(ticket.id);

  return ticket;
};

export default FindOrCreateTicketService;
