import React, { useContext, useEffect, useState } from "react";

import { makeStyles } from "@material-ui/core/styles";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import Avatar from "@material-ui/core/Avatar";
import Badge from "@material-ui/core/Badge";
import Divider from "@material-ui/core/Divider";
import InputBase from "@material-ui/core/InputBase";
import SearchIcon from "@material-ui/icons/Search";
import Typography from "@material-ui/core/Typography";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { InternalChatContext } from "../../context/InternalChat/InternalChatContext";

const useStyles = makeStyles(theme => ({
	wrapper: {
		display: "flex",
		flexDirection: "column",
		height: "100%",
		overflowY: "hidden",
	},
	searchWrapper: {
		display: "flex",
		alignItems: "center",
		padding: theme.spacing(1),
		borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
	},
	searchIcon: {
		color: "grey",
		marginRight: 6,
	},
	list: {
		flex: 1,
		overflowY: "auto",
		...theme.scrollbarStyles,
	},
}));

const InternalChatsList = ({ selectedUserId, onSelectUser }) => {
	const classes = useStyles();
	const { user: loggedInUser } = useContext(AuthContext);
	const { chats } = useContext(InternalChatContext);
	const [searchParam, setSearchParam] = useState("");
	const [users, setUsers] = useState([]);

	useEffect(() => {
		const delayDebounceFn = setTimeout(async () => {
			try {
				const { data } = await api.get("/users/", {
					params: { searchParam },
				});
				setUsers(data.users.filter(u => u.id !== loggedInUser.id));
			} catch (err) {
				toastError(err);
			}
		}, 500);
		return () => clearTimeout(delayDebounceFn);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchParam]);

	const chatByUserId = userId =>
		chats.find(chat => chat.otherUser.id === userId);

	return (
		<div className={classes.wrapper}>
			<div className={classes.searchWrapper}>
				<SearchIcon className={classes.searchIcon} />
				<InputBase
					fullWidth
					placeholder={i18n.t("internalChat.chatsList.searchPlaceholder")}
					value={searchParam}
					onChange={e => setSearchParam(e.target.value)}
				/>
			</div>
			<List className={classes.list}>
				{users.length === 0 ? (
					<ListItem>
						<ListItemText
							primary={
								<Typography variant="body2" color="textSecondary">
									{i18n.t("internalChat.chatsList.noChatsTitle")}
								</Typography>
							}
							secondary={i18n.t("internalChat.chatsList.noChatsMessage")}
						/>
					</ListItem>
				) : (
					users.map(otherUser => {
						const chat = chatByUserId(otherUser.id);
						return (
							<React.Fragment key={otherUser.id}>
								<ListItem
									button
									selected={selectedUserId === otherUser.id}
									onClick={() => onSelectUser(otherUser)}
								>
									<ListItemAvatar>
										<Avatar>{otherUser.name?.charAt(0)?.toUpperCase()}</Avatar>
									</ListItemAvatar>
									<ListItemText
										primary={otherUser.name}
										secondary={chat?.lastMessage?.body}
									/>
									{chat?.unreadCount > 0 && (
										<Badge
											badgeContent={chat.unreadCount}
											color="secondary"
										/>
									)}
								</ListItem>
								<Divider component="li" />
							</React.Fragment>
						);
					})
				)}
			</List>
		</div>
	);
};

export default InternalChatsList;
