import { proto, WASocket } from '@whiskeysockets/baileys';

export interface CommandParams {
    sock: WASocket;
    msg: proto.IWebMessageInfo;
    sender: string;
    args: string[];
    isGroup: boolean;
    messageContent: string;
}

export interface Command {
    (params: CommandParams): Promise<void>;
}

export interface Commands {
    [key: string]: Command;
}

export interface Config {
    sessionPath: string;
    prefix: string;
    ownerNumber: string;
    botName: string;
}