import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { format } from "date-fns";

import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";

const defaultDateTimeLocalValue = () =>
	format(new Date(Date.now() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm");

const PostponeTicketModal = ({ modalOpen, onClose, ticketid }) => {
	const history = useHistory();
	const [loading, setLoading] = useState(false);
	const [snoozedUntil, setSnoozedUntil] = useState(defaultDateTimeLocalValue());

	const handleClose = () => {
		onClose();
		setSnoozedUntil(defaultDateTimeLocalValue());
	};

	const handleSaveTicket = async e => {
		e.preventDefault();
		if (!ticketid) return;
		setLoading(true);
		try {
			await api.post(`/tickets/${ticketid}/snooze`, {
				snoozedUntil: new Date(snoozedUntil).toISOString(),
			});

			setLoading(false);
			toast.success(i18n.t("postponeTicketModal.toasts.success"));
			handleClose();
			history.push("/tickets");
		} catch (err) {
			setLoading(false);
			toastError(err);
		}
	};

	return (
		<Dialog open={modalOpen} onClose={handleClose} maxWidth="xs" fullWidth scroll="paper">
			<form onSubmit={handleSaveTicket}>
				<DialogTitle id="form-dialog-title">
					{i18n.t("postponeTicketModal.title")}
				</DialogTitle>
				<DialogContent dividers>
					<TextField
						label={i18n.t("postponeTicketModal.fieldLabel")}
						type="datetime-local"
						fullWidth
						variant="outlined"
						autoFocus
						required
						value={snoozedUntil}
						onChange={e => setSnoozedUntil(e.target.value)}
						InputLabelProps={{ shrink: true }}
						inputProps={{ min: format(new Date(), "yyyy-MM-dd'T'HH:mm") }}
					/>
				</DialogContent>
				<DialogActions>
					<Button
						onClick={handleClose}
						color="secondary"
						disabled={loading}
						variant="outlined"
					>
						{i18n.t("postponeTicketModal.buttons.cancel")}
					</Button>
					<ButtonWithSpinner
						variant="contained"
						type="submit"
						color="primary"
						loading={loading}
					>
						{i18n.t("postponeTicketModal.buttons.ok")}
					</ButtonWithSpinner>
				</DialogActions>
			</form>
		</Dialog>
	);
};

export default PostponeTicketModal;
