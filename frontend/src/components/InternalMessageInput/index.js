import React, { useState } from "react";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import InputBase from "@material-ui/core/InputBase";
import IconButton from "@material-ui/core/IconButton";
import SendIcon from "@material-ui/icons/Send";

import { i18n } from "../../translate/i18n";

const useStyles = makeStyles(theme => ({
	wrapper: {
		display: "flex",
		alignItems: "flex-end",
		padding: theme.spacing(1),
		borderTop: "1px solid rgba(0, 0, 0, 0.12)",
	},
	input: {
		flex: 1,
		marginRight: theme.spacing(1),
	},
}));

const InternalMessageInput = ({ onSend }) => {
	const classes = useStyles();
	const [inputMessage, setInputMessage] = useState("");

	const handleSend = () => {
		const trimmed = inputMessage.trim();
		if (!trimmed) return;
		onSend(trimmed);
		setInputMessage("");
	};

	const handleKeyDown = e => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	return (
		<Paper square elevation={0} className={classes.wrapper}>
			<InputBase
				className={classes.input}
				placeholder={i18n.t("internalChat.messageInput.placeholder")}
				multiline
				maxRows={5}
				value={inputMessage}
				onChange={e => setInputMessage(e.target.value)}
				onKeyDown={handleKeyDown}
			/>
			<IconButton color="primary" onClick={handleSend}>
				<SendIcon />
			</IconButton>
		</Paper>
	);
};

export default InternalMessageInput;
