import fs from "fs";
import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import { whatsappProvider, ProviderMessage } from "../../providers/WhatsApp";

import formatBody from "../../helpers/Mustache";

interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
  body?: string;
}

const SendWhatsAppMedia = async ({
  media,
  ticket,
  body
}: Request): Promise<ProviderMessage> => {
  try {
    if (!ticket.whatsappId) {
      throw new AppError("ERR_TICKET_NO_WHATSAPP");
    }

    const chatId = `${ticket.contact.number}@${ticket.isGroup ? "g" : "c"}.us`;

    const hasBody = body
      ? formatBody(body as string, ticket.contact)
      : undefined;

    const mediaInput = {
      filename: media.filename,
      mimetype: media.mimetype,
      path: media.path
    };

    // sendAudioAsVoice pede pro WhatsApp Web tratar o arquivo como nota de voz
    // (waveform, player nativo) - mas o cliente da Web só consegue processar
    // isso quando a fonte já é Ogg/Opus. O gravador do frontend
    // (mic-recorder-to-mp3) grava em MP3, e forçar essa flag num MP3 faz o
    // envio falhar dentro do contexto do WhatsApp Web. Só pedimos "nota de voz"
    // quando o áudio já é realmente Ogg/Opus; qualquer outro áudio (ex: MP3
    // gravado no navegador, ou um arquivo de áudio anexado pelo usuário) vai
    // como anexo de áudio normal, que o WhatsApp aceita em qualquer codec.
    const isOggOpusAudio = /ogg|opus/i.test(media.mimetype);

    const mediaOptions = {
      caption: hasBody,
      sendAudioAsVoice: isOggOpusAudio,
      sendMediaAsDocument:
        media.mimetype.startsWith("image/") &&
        !/^.*\.(jpe?g|png|gif)?$/i.exec(media.filename)
    };

    const sentMessage = await whatsappProvider.sendMedia(
      ticket.whatsappId,
      chatId,
      mediaInput,
      mediaOptions
    );

    await ticket.update({ lastMessage: body || media.filename });

    fs.unlinkSync(media.path);

    return sentMessage;
  } catch (err) {
    console.log(err);
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMedia;
