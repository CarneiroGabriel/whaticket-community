import React, { useContext, useState } from "react";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import Hidden from "@material-ui/core/Hidden";

import InternalChatsList from "../../components/InternalChatsList";
import InternalMessagesList from "../../components/InternalMessagesList";
import InternalMessageInput from "../../components/InternalMessageInput";
import { i18n } from "../../translate/i18n";
import { InternalChatContext } from "../../context/InternalChat/InternalChatContext";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(theme => ({
	container: {
		flex: 1,
		height: `calc(100% - 48px)`,
		overflowY: "hidden",
		backgroundColor: theme.palette.background.default,
	},
	wrapper: {
		display: "flex",
		height: "100%",
	},
	chatsWrapper: {
		display: "flex",
		height: "100%",
		flexDirection: "column",
		overflowY: "hidden",
	},
	messagesWrapper: {
		display: "flex",
		height: "100%",
		flexDirection: "column",
	},
	welcomeMsg: {
		backgroundColor: theme.palette.background.paper,
		display: "flex",
		justifyContent: "space-evenly",
		alignItems: "center",
		height: "100%",
		textAlign: "center",
	},
	header: {
		padding: theme.spacing(1, 2),
		borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
	},
}));

const InternalChat = () => {
	const classes = useStyles();
	const { chats, sendMessage, markAsRead, fetchChats } =
		useContext(InternalChatContext);
	const [selectedUser, setSelectedUser] = useState(null);

	const selectedChat = selectedUser
		? chats.find(chat => chat.otherUser.id === selectedUser.id)
		: null;

	const handleSelectUser = user => {
		setSelectedUser(user);
		const chat = chats.find(c => c.otherUser.id === user.id);
		if (chat) {
			markAsRead(chat.id).catch(toastError);
		}
	};

	const handleSend = async body => {
		try {
			await sendMessage(selectedUser.id, body);
			fetchChats();
		} catch (err) {
			toastError(err);
		}
	};

	return (
		<div className={classes.container}>
			<div className={classes.wrapper}>
				<Grid container spacing={0} style={{ height: "100%" }}>
					<Grid
						item
						xs={12}
						md={4}
						className={classes.chatsWrapper}
						component={Paper}
						elevation={0}
						square
					>
						<InternalChatsList
							selectedUserId={selectedUser?.id}
							onSelectUser={handleSelectUser}
						/>
					</Grid>
					<Grid item xs={12} md={8} className={classes.messagesWrapper}>
						{selectedUser ? (
							<>
								<Paper square elevation={0} className={classes.header}>
									<Typography variant="subtitle1">
										{selectedUser.name}
									</Typography>
								</Paper>
								<InternalMessagesList internalChatId={selectedChat?.id} />
								<InternalMessageInput onSend={handleSend} />
							</>
						) : (
							<Hidden only={["sm", "xs"]}>
								<Paper square variant="outlined" className={classes.welcomeMsg}>
									<span>{i18n.t("internalChat.noChatSelected")}</span>
								</Paper>
							</Hidden>
						)}
					</Grid>
				</Grid>
			</div>
		</div>
	);
};

export default InternalChat;
