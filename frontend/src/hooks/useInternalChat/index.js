import { useState, useEffect, useCallback } from "react";
import openSocket from "../../services/socket-io";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const useInternalChat = () => {
	const [chats, setChats] = useState([]);
	const [loading, setLoading] = useState(true);

	const fetchChats = useCallback(async () => {
		try {
			const { data } = await api.get("/internalChats");
			setChats(data);
		} catch (err) {
			toastError(err);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchChats();
	}, [fetchChats]);

	useEffect(() => {
		const socket = openSocket();

		socket.on("internalMessage", () => {
			fetchChats();
		});

		return () => {
			socket.disconnect();
		};
	}, [fetchChats]);

	const sendMessage = async (receiverId, body) => {
		await api.post("/internalChats/messages", { receiverId, body });
	};

	const markAsRead = async internalChatId => {
		await api.put(`/internalChats/${internalChatId}/read`);
	};

	const unreadTotal = chats.reduce(
		(sum, chat) => sum + (chat.unreadCount || 0),
		0
	);

	return { chats, loading, unreadTotal, fetchChats, sendMessage, markAsRead };
};

export default useInternalChat;
