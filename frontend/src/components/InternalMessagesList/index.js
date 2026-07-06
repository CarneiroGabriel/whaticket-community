import React, { useContext, useEffect, useReducer, useRef, useState } from "react";
import { format, isSameDay, parseISO } from "date-fns";

import { makeStyles } from "@material-ui/core/styles";
import CircularProgress from "@material-ui/core/CircularProgress";
import Divider from "@material-ui/core/Divider";

import openSocket from "../../services/socket-io";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles(theme => ({
	messagesListWrapper: {
		position: "relative",
		display: "flex",
		flexDirection: "column",
		flexGrow: 1,
		overflow: "hidden",
	},
	messagesList: {
		display: "flex",
		flexDirection: "column",
		flexGrow: 1,
		padding: 20,
		overflowY: "scroll",
		...theme.scrollbarStyles,
	},
	circleLoading: {
		position: "absolute",
		opacity: "70%",
		top: 0,
		left: "50%",
		marginTop: 12,
	},
	dateDivider: {
		textAlign: "center",
		margin: "10px 0",
		color: "rgb(104, 121, 146)",
		fontSize: 12,
	},
	messageLeft: {
		marginRight: 20,
		marginBottom: 6,
		maxWidth: 500,
		whiteSpace: "pre-wrap",
		backgroundColor: "#ffffff",
		color: "#303030",
		alignSelf: "flex-start",
		borderRadius: 8,
		borderTopLeftRadius: 0,
		padding: "6px 10px",
		boxShadow: "0 1px 1px #b3b3b3",
	},
	messageRight: {
		marginLeft: 20,
		marginBottom: 6,
		maxWidth: 500,
		whiteSpace: "pre-wrap",
		backgroundColor: "#dcf8c6",
		color: "#303030",
		alignSelf: "flex-end",
		borderRadius: 8,
		borderTopRightRadius: 0,
		padding: "6px 10px",
	},
	timestamp: {
		fontSize: 10,
		color: "#999",
		alignSelf: "inherit",
		marginTop: 2,
	},
}));

const reducer = (state, action) => {
	if (action.type === "LOAD_MESSAGES") {
		const incoming = [...action.payload].reverse();
		const newOnes = incoming.filter(
			m => !state.some(s => s.id === m.id)
		);
		return [...newOnes, ...state];
	}

	if (action.type === "ADD_MESSAGE") {
		const message = action.payload;
		if (state.some(m => m.id === message.id)) return state;
		return [...state, message];
	}

	if (action.type === "RESET") {
		return [];
	}
};

const InternalMessagesList = ({ internalChatId }) => {
	const classes = useStyles();
	const { user } = useContext(AuthContext);
	const [messagesList, dispatch] = useReducer(reducer, []);
	const [pageNumber, setPageNumber] = useState(1);
	const [hasMore, setHasMore] = useState(false);
	const [loading, setLoading] = useState(false);
	const lastMessageRef = useRef();
	const currentChatId = useRef(internalChatId);

	useEffect(() => {
		dispatch({ type: "RESET" });
		setPageNumber(1);
		currentChatId.current = internalChatId;
	}, [internalChatId]);

	useEffect(() => {
		if (!internalChatId) return undefined;

		setLoading(true);
		const delayDebounceFn = setTimeout(async () => {
			try {
				const { data } = await api.get(
					`/internalChats/${internalChatId}/messages`,
					{ params: { pageNumber } }
				);

				if (currentChatId.current === internalChatId) {
					dispatch({ type: "LOAD_MESSAGES", payload: data.messages });
					setHasMore(data.hasMore);
					setLoading(false);

					if (pageNumber === 1) {
						scrollToBottom();
					}
				}
			} catch (err) {
				setLoading(false);
				toastError(err);
			}
		}, 300);

		return () => clearTimeout(delayDebounceFn);
	}, [pageNumber, internalChatId]);

	useEffect(() => {
		if (!internalChatId) return undefined;

		const socket = openSocket();

		socket.on("internalMessage", data => {
			if (
				data.action === "create" &&
				data.message.internalChatId === internalChatId
			) {
				dispatch({ type: "ADD_MESSAGE", payload: data.message });
				scrollToBottom();
			}
		});

		return () => socket.disconnect();
	}, [internalChatId]);

	const scrollToBottom = () => {
		setTimeout(() => {
			if (lastMessageRef.current) {
				lastMessageRef.current.scrollIntoView({});
			}
		}, 100);
	};

	const handleScroll = e => {
		if (!hasMore || loading) return;
		const { scrollTop } = e.currentTarget;
		if (scrollTop < 50) {
			setPageNumber(prev => prev + 1);
		}
	};

	const renderMessages = () => {
		let lastDate = null;

		return messagesList.map((message, index) => {
			const isRight = message.senderId === user?.id;
			const showDateDivider =
				!lastDate || !isSameDay(parseISO(message.createdAt), lastDate);
			lastDate = parseISO(message.createdAt);

			const isLast = index === messagesList.length - 1;

			return (
				<React.Fragment key={message.id}>
					{showDateDivider && (
						<div className={classes.dateDivider}>
							<Divider />
							{format(parseISO(message.createdAt), "dd/MM/yyyy")}
						</div>
					)}
					<div
						className={isRight ? classes.messageRight : classes.messageLeft}
						ref={isLast ? lastMessageRef : null}
					>
						{message.body}
						<div className={classes.timestamp}>
							{format(parseISO(message.createdAt), "HH:mm")}
						</div>
					</div>
				</React.Fragment>
			);
		});
	};

	return (
		<div className={classes.messagesListWrapper}>
			<div className={classes.messagesList} onScroll={handleScroll}>
				{renderMessages()}
			</div>
			{loading && (
				<div>
					<CircularProgress className={classes.circleLoading} size={24} />
				</div>
			)}
		</div>
	);
};

export default InternalMessagesList;
