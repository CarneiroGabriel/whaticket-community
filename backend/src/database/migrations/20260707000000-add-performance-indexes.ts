import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Query mais quente do sistema: WHERE ticketId = ? ORDER BY createdAt DESC
    // (paginação de mensagens de um ticket). Sem esse índice composto, a busca
    // usa apenas o índice de FK em ticketId e faz filesort em createdAt.
    await queryInterface.addIndex("Messages", ["ticketId", "createdAt"], {
      name: "messages_ticket_id_created_at"
    });

    // FindOrCreateTicketService / CheckContactOpenTickets consultam
    // repetidamente por (contactId, whatsappId, status) a cada mensagem recebida.
    await queryInterface.addIndex(
      "Tickets",
      ["contactId", "whatsappId", "status"],
      { name: "tickets_contact_whatsapp_status" }
    );

    // ListTicketsService ordena por updatedAt e filtra por status; InactivityJob
    // filtra por status + updatedAt em lote a cada 60s.
    await queryInterface.addIndex("Tickets", ["status", "updatedAt"], {
      name: "tickets_status_updated_at"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("Messages", "messages_ticket_id_created_at");
    await queryInterface.removeIndex("Tickets", "tickets_contact_whatsapp_status");
    await queryInterface.removeIndex("Tickets", "tickets_status_updated_at");
  }
};
