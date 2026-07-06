import React, { createContext } from "react";

import useInternalChat from "../../hooks/useInternalChat";

const InternalChatContext = createContext();

const InternalChatProvider = ({ children }) => {
	const { chats, loading, unreadTotal, fetchChats, sendMessage, markAsRead } =
		useInternalChat();

	return (
		<InternalChatContext.Provider
			value={{ chats, loading, unreadTotal, fetchChats, sendMessage, markAsRead }}
		>
			{children}
		</InternalChatContext.Provider>
	);
};

export { InternalChatContext, InternalChatProvider };
