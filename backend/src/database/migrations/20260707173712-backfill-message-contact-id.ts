import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Mensagens fromMe (enviadas pelo atendente) ficavam com contactId nulo por
    // causa de um bug em handleWhatsappEvents.ts que só preenchia esse campo pra
    // mensagens recebidas. Preenche a partir do Ticket.contactId correspondente,
    // pra não perder essas mensagens no histórico por contato.
    await queryInterface.sequelize.query(`
      UPDATE Messages m
      JOIN Tickets t ON t.id = m.ticketId
      SET m.contactId = t.contactId
      WHERE m.contactId IS NULL
    `);
  },

  down: async () => {
    // Backfill não é reversível com segurança (não há registro de quais linhas
    // já estavam NULL antes desta migration) - down intencionalmente não faz nada.
  }
};
