import { join } from "path";
import { promisify } from "util";
import { writeFile } from "fs";
import * as Sentry from "@sentry/node";

import { getIO } from "../libs/socket";
import { logger } from "../utils/logger";
import { debounce } from "../helpers/Debounce";
import formatBody from "../helpers/Mustache";

import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import Message from "../models/Message";
import QueueOption from "../models/QueueOption";

import CreateMessageService from "../services/MessageServices/CreateMessageService";
import CreateOrUpdateContactService from "../services/ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../services/TicketServices/FindOrCreateTicketService";
import GetCachedWhatsAppQueues from "../services/WhatsappService/GetCachedWhatsAppQueues";
import GetCachedQueueOptions, {
  CachedQueueOption
} from "../services/QueueService/GetCachedQueueOptions";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import CreateContactService from "../services/ContactServices/CreateContactService";

import { checkBusinessHours, getSettingValue } from "../helpers/checkBusinessHours";
import { whatsappProvider } from "../providers/WhatsApp/whatsappProvider";
import { MessageType, MessageAck } from "../providers/WhatsApp/types";

const writeFileAsync = promisify(writeFile);

export interface ContactPayload {
  name: string;
  number: string;
  lid?: string;
  profilePicUrl?: string;
  isGroup: boolean;
}

export interface MessagePayload {
  id: string;
  body: string;
  fromMe: boolean;
  hasMedia: boolean;
  type: MessageType;
  timestamp: number;
  from: string;
  to: string;
  hasQuotedMsg?: boolean;
  quotedMsgId?: string;
  mediaUrl?: string;
  mediaType?: string;
  ack?: MessageAck;
}

export interface MediaPayload {
  filename: string;
  mimetype: string;
  data: string;
}

export interface WhatsappContextPayload {
  whatsappId: number;
  unreadMessages: number;
  groupContact?: ContactPayload;
}

const makeRandomId = (length: number): string => {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
};

const processLocationMessage = (
  messagePayload: MessagePayload
): MessagePayload => {
  if (messagePayload.type !== "location") return messagePayload;

  return messagePayload;
};

const saveMediaFile = async (mediaPayload: MediaPayload): Promise<string> => {
  const randomId = makeRandomId(5);
  const { filename: originalFilename } = mediaPayload;

  let filename: string;
  if (!originalFilename) {
    const [extension] = mediaPayload.mimetype.split("/")[1].split(";");
    filename = `${randomId}-${new Date().getTime()}.${extension}`;
  } else {
    const baseName = originalFilename.split(".").slice(0, -1).join(".");
    const extension = originalFilename.split(".").slice(-1)[0];
    filename = `${baseName}.${randomId}.${extension}`;
  }

  try {
    await writeFileAsync(
      join(__dirname, "..", "..", "public", filename),
      mediaPayload.data,
      "base64"
    );
  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
  }

  return filename;
};

const processVcardMessage = async (
  messagePayload: MessagePayload
): Promise<void> => {
  if (messagePayload.type !== "vcard") return;

  try {
    const array = messagePayload.body.split("\n");
    const phoneNumbers: Array<{ number: string }> = [];
    let contactName = "";

    array.forEach(line => {
      const values = line.split(":");
      values.forEach((value, index) => {
        if (value.indexOf("+") !== -1) {
          phoneNumbers.push({ number: value });
        }
        if (value.indexOf("FN") !== -1 && values[index + 1]) {
          contactName = values[index + 1];
        }
      });
    });

    await Promise.all(
      phoneNumbers.map(({ number }) =>
        CreateContactService({
          name: contactName,
          number: number.replace(/\D/g, "")
        })
      )
    );
  } catch (error) {
    logger.error("Error processing vcard message:", error);
  }
};

// \u2500\u2500\u2500 Etapas (\u00e1rvore de op\u00e7\u00f5es) dentro de uma fila \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Uma fila sem nenhuma QueueOption nunca entra nesses caminhos (as buscas por
// parentId:null retornam vazio), ent\u00e3o o comportamento pra filas simples
// existentes continua id\u00eantico ao de antes desta feature.

const sendQueueBotMessage = async (
  whatsappId: number,
  contactPayload: ContactPayload,
  text: string
): Promise<void> => {
  const body = formatBody(`\u200e${text}`, contactPayload as any);

  try {
    await whatsappProvider.sendMessage(
      whatsappId,
      `${contactPayload.number}@c.us`,
      body
    );
  } catch (error) {
    logger.error("Error sending queue bot message:", error);
  }
};

const sendQueueOptionsMenu = (
  whatsappId: number,
  contactPayload: ContactPayload,
  ticketId: number,
  options: CachedQueueOption[]
): void => {
  let optionsText = "";
  options.forEach((option, index) => {
    optionsText += `*${index + 1}* - ${option.title}\n`;
  });

  const debouncedSendMessage = debounce(
    async () => {
      await sendQueueBotMessage(whatsappId, contactPayload, optionsText);
    },
    3000,
    ticketId
  );

  debouncedSendMessage();
};

const sendQueueRootOptionsIfAny = async (
  whatsappId: number,
  contactPayload: ContactPayload,
  ticketId: number,
  queueId: number
): Promise<void> => {
  const rootOptions = await GetCachedQueueOptions(queueId, null);

  if (rootOptions.length > 0) {
    sendQueueOptionsMenu(whatsappId, contactPayload, ticketId, rootOptions);
  }
};

const QUEUE_OPTION_BACK_COMMANDS = ["0", "voltar"];

const handleQueueOptionsLogic = async (
  whatsappId: number,
  messageBody: string,
  ticket: Ticket,
  contactPayload: ContactPayload
): Promise<void> => {
  const currentOption = ticket.currentQueueOptionId
    ? await QueueOption.findByPk(ticket.currentQueueOptionId)
    : null;

  const parentId = currentOption ? currentOption.id : null;

  const levelOptions = await GetCachedQueueOptions(ticket.queueId, parentId);

  if (levelOptions.length === 0) {
    // Defensivo: n\u00e3o deveria acontecer (isBotFlowActive s\u00f3 chama isso quando h\u00e1
    // op\u00e7\u00f5es pra navegar), mas se acontecer, libera o ticket em vez de travar.
    await ticket.update({
      currentQueueOptionId: null,
      queueOptionsResolved: true
    });
    return;
  }

  const normalized = messageBody.trim().toLowerCase();

  if (QUEUE_OPTION_BACK_COMMANDS.includes(normalized)) {
    if (!currentOption) {
      sendQueueOptionsMenu(whatsappId, contactPayload, ticket.id, levelOptions);
      return;
    }

    const grandParentId = currentOption.parentId;
    await ticket.update({ currentQueueOptionId: grandParentId });

    const newLevelOptions = await GetCachedQueueOptions(
      ticket.queueId,
      grandParentId
    );
    sendQueueOptionsMenu(whatsappId, contactPayload, ticket.id, newLevelOptions);
    return;
  }

  const chosen = levelOptions[+normalized - 1];

  if (!chosen) {
    // Escolha inv\u00e1lida: reenvia o menu do n\u00edvel atual (n\u00e3o trava, n\u00e3o avan\u00e7a errado).
    sendQueueOptionsMenu(whatsappId, contactPayload, ticket.id, levelOptions);
    return;
  }

  if (chosen.message) {
    await sendQueueBotMessage(whatsappId, contactPayload, chosen.message);
  }

  const children = await GetCachedQueueOptions(ticket.queueId, chosen.id);

  if (children.length > 0) {
    await ticket.update({ currentQueueOptionId: chosen.id });
    sendQueueOptionsMenu(whatsappId, contactPayload, ticket.id, children);
  } else {
    // N\u00f3-folha: libera o ticket pro atendimento humano normal na fila.
    // Ponto de extens\u00e3o: aqui \u00e9 onde um fluxo automatizado (ex: 2\u00aa via de
    // boleto) poderia ser disparado no futuro, olhando pra chosen.title/
    // chosen.id antes de liberar o ticket. Fora do escopo desta tarefa.
    await ticket.update({
      currentQueueOptionId: null,
      queueOptionsResolved: true
    });
  }
};

const handleQueueLogic = async (
  whatsappId: number,
  messageBody: string,
  ticket: Ticket,
  contactPayload: ContactPayload
): Promise<void> => {
  if (ticket.queue) {
    await handleQueueOptionsLogic(
      whatsappId,
      messageBody,
      ticket,
      contactPayload
    );
    return;
  }

  const { queues, greetingMessage } = await GetCachedWhatsAppQueues(
    whatsappId
  );

  if (queues.length === 1) {
    await UpdateTicketService({
      ticketData: { queueId: queues[0].id },
      ticketId: ticket.id
    });
    await sendQueueRootOptionsIfAny(
      whatsappId,
      contactPayload,
      ticket.id,
      queues[0].id
    );
    return;
  }

  const selectedOption = messageBody;
  const choosenQueue = queues[+selectedOption - 1];

  if (choosenQueue) {
    await UpdateTicketService({
      ticketData: { queueId: choosenQueue.id },
      ticketId: ticket.id
    });

    const body = formatBody(
      `\u200e${choosenQueue.greetingMessage}`,
      contactPayload as any
    );

    try {
      await whatsappProvider.sendMessage(
        whatsappId,
        `${contactPayload.number}@c.us`,
        body
      );
    } catch (error) {
      logger.error("Error sending queue greeting message:", error);
    }

    await sendQueueRootOptionsIfAny(
      whatsappId,
      contactPayload,
      ticket.id,
      choosenQueue.id
    );
  } else {
    let options = "";
    queues.forEach((queue, index) => {
      options += `*${index + 1}* - ${queue.name}\n`;
    });

    const body = formatBody(
      `\u200e${greetingMessage}\n${options}`,
      contactPayload as any
    );

    const debouncedSentMessage = debounce(
      async () => {
        try {
          await whatsappProvider.sendMessage(
            whatsappId,
            `${contactPayload.number}@c.us`,
            body
          );
        } catch (error) {
          logger.error("Error sending queue options message:", error);
        }
      },
      3000,
      ticket.id
    );

    debouncedSentMessage();
  }
};

const isBotFlowActive = async (
  ticket: Ticket,
  whatsappQueuesCount: number
): Promise<boolean> => {
  if (whatsappQueuesCount === 0) return false;
  if (!ticket.queue) return true;
  if (ticket.queueOptionsResolved) return false;
  if (ticket.currentQueueOptionId) return true;

  const rootOptions = await GetCachedQueueOptions(ticket.queueId, null);

  return rootOptions.length > 0;
};

export const handleMessage = async (
  messagePayload: MessagePayload,
  contactPayload: ContactPayload,
  contextPayload: WhatsappContextPayload,
  mediaPayload?: MediaPayload
): Promise<void> => {
  try {
    const processedMessage = processLocationMessage(messagePayload);

    const contact = await CreateOrUpdateContactService({
      name: contactPayload.name,
      number: contactPayload.number,
      lid: contactPayload.lid,
      profilePicUrl: contactPayload.profilePicUrl,
      isGroup: contactPayload.isGroup
    });

    let groupContact: Contact | undefined;
    if (contextPayload.groupContact) {
      groupContact = await CreateOrUpdateContactService({
        name: contextPayload.groupContact.name,
        number: contextPayload.groupContact.number,
        lid: contextPayload.groupContact.lid,
        profilePicUrl: contextPayload.groupContact.profilePicUrl,
        isGroup: contextPayload.groupContact.isGroup
      });
    }

    const whatsapp = await GetCachedWhatsAppQueues(contextPayload.whatsappId);
    if (
      contextPayload.unreadMessages === 0 &&
      whatsapp.farewellMessage &&
      formatBody(whatsapp.farewellMessage, contact) === processedMessage.body
    ) {
      return;
    }

    const ticket = await FindOrCreateTicketService(
      contact,
      contextPayload.whatsappId,
      contextPayload.unreadMessages,
      groupContact
    );

    const messageData: any = {
      id: processedMessage.id,
      ticketId: ticket.id,
      // `contact` é sempre o contato/cliente da conversa (mesmo em mensagens
      // fromMe, onde vem de wbot.getContactById(msg.to)) - precisa ser gravado
      // sempre, senão o histórico "todas as mensagens desse contato" perde as
      // mensagens enviadas pelo próprio atendente.
      contactId: contact.id,
      body: processedMessage.body,
      fromMe: processedMessage.fromMe,
      read: processedMessage.fromMe,
      mediaType: processedMessage.type,
      quotedMsgId: processedMessage.quotedMsgId,
      ack: processedMessage.ack !== undefined ? processedMessage.ack : 0
    };

    if (mediaPayload && processedMessage.hasMedia) {
      const filename = await saveMediaFile(mediaPayload);
      messageData.mediaUrl = filename;
      messageData.body = processedMessage.body || filename;
      // mediaType já foi setado acima a partir de processedMessage.type (ex:
      // "ptt", "sticker") - não sobrescrever com mediaPayload.mimetype.split("/")[0],
      // que colapsa "ptt"/"audio" em "audio" e "sticker"/"image" em "image",
      // fazendo o frontend perder a distinção entre nota de voz e arquivo de
      // áudio, e entre figurinha e foto.
    }

    let lastMessageText = "";
    if (processedMessage.type === "location") {
      lastMessageText = processedMessage.body.includes("Localization")
        ? processedMessage.body
        : "Localization";
    } else {
      lastMessageText = processedMessage.body || mediaPayload?.filename || "";
    }

    await ticket.update({ lastMessage: lastMessageText });

    await CreateMessageService({ messageData });

    await processVcardMessage(processedMessage);

    if (!processedMessage.fromMe && !contextPayload.groupContact) {
      const { isOpen, absenceMessage } = await checkBusinessHours();

      if (!isOpen && absenceMessage) {
        const sendOnlyAfterBot =
          (await getSettingValue("businessHoursSendOnlyAfterBot")) === "true";

        // se "sendOnlyAfterBot" está ativo, espera o fluxo de bot (escolha de fila
        // + navegação da árvore de etapas, se houver) terminar antes de avisar
        const botFlowDone = !(await isBotFlowActive(
          ticket,
          whatsapp.queues.length
        ));
        const shouldSendNow = !sendOnlyAfterBot || botFlowDone;

        if (shouldSendNow && !ticket.outOfHoursMsgSent) {
          try {
            await whatsappProvider.sendMessage(
              contextPayload.whatsappId,
              `${contactPayload.number}@c.us`,
              formatBody(absenceMessage, contact)
            );
          } catch (error) {
            logger.error("Error sending out-of-hours message:", error);
          }
          await ticket.update({ outOfHoursMsgSent: true });

          if (!sendOnlyAfterBot) {
            return;
          }
        }
      }
    }

    if (
      !contextPayload.groupContact &&
      !processedMessage.fromMe &&
      !ticket.userId &&
      (await isBotFlowActive(ticket, whatsapp.queues.length))
    ) {
      await handleQueueLogic(
        contextPayload.whatsappId,
        processedMessage.body,
        ticket,
        contactPayload
      );
    }
  } catch (err) {
    Sentry.captureException(err);
    logger.error({
      info: "Error handling message",
      err,
      messagePayload,
      contactPayload,
      contextPayload,
      mediaPayload
    });
  }
};

export const handleMessageAck = async (
  messageId: string,
  ack: MessageAck
): Promise<void> => {
  await new Promise(r => setTimeout(r, 500));

  const io = getIO();

  try {
    const messageToUpdate = await Message.findByPk(messageId, {
      include: [
        "contact",
        {
          model: Message,
          as: "quotedMsg",
          include: ["contact"]
        }
      ]
    });

    if (!messageToUpdate) {
      return;
    }

    await messageToUpdate.update({ ack });

    io.to(messageToUpdate.ticketId.toString()).emit("appMessage", {
      action: "update",
      message: messageToUpdate
    });
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`Error handling message ack: ${err}`);
  }
};
