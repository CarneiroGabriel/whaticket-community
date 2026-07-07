import { WhereOptions } from "sequelize";
import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import ShowTicketService from "../TicketServices/ShowTicketService";

interface Request {
  ticketId: string;
  pageNumber?: string;
}

interface Response {
  messages: Message[];
  ticket: Ticket;
  count: number;
  hasMore: boolean;
}

const ListMessagesService = async ({
  pageNumber = "1",
  ticketId
}: Request): Promise<Response> => {
  const ticket = await ShowTicketService(ticketId);

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  // await setMessagesAsRead(ticket);
  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  // Em conversas individuais, mostra o histórico completo do contato (todos os
  // tickets antigos incluídos), não só o ticket atual. Em grupos não faz sentido:
  // Ticket.contactId é o contato do GRUPO, enquanto Message.contactId é o membro
  // que enviou cada mensagem individualmente - filtrar por contactId aí não
  // corresponderia a "histórico do grupo", então grupo continua por ticketId.
  const where: WhereOptions = ticket.isGroup
    ? { ticketId }
    : { contactId: ticket.contactId };

  const { count, rows: messages } = await Message.findAndCountAll({
    where,
    limit,
    include: [
      "contact",
      {
        model: Message,
        as: "quotedMsg",
        include: ["contact"]
      }
    ],
    offset,
    order: [["createdAt", "DESC"]]
  });

  const hasMore = count > offset + messages.length;

  return {
    messages: messages.reverse(),
    ticket,
    count,
    hasMore
  };
};

export default ListMessagesService;
