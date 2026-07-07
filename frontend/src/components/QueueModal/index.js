import React, { useState, useEffect, useRef, useContext } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Box from "@material-ui/core/Box";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import ColorPicker from "../ColorPicker";
import QueueOptionsTree from "../QueueOptionsTree";
import UserSelect from "../UserSelect";
import { check } from "../Can";
import { AuthContext } from "../../context/Auth/AuthContext";
import { IconButton, InputAdornment } from "@material-ui/core";
import { Colorize } from "@material-ui/icons";

const buildOptionsTree = flatOptions => {
	const byId = {};
	(flatOptions || []).forEach(opt => {
		byId[opt.id] = { ...opt, children: [] };
	});
	const roots = [];
	(flatOptions || []).forEach(opt => {
		const node = byId[opt.id];
		if (opt.parentId && byId[opt.parentId]) {
			byId[opt.parentId].children.push(node);
		} else {
			roots.push(node);
		}
	});
	return roots;
};

const stripLocalFields = nodes =>
	(nodes || []).map(({ _localId, children, id, ...rest }) => ({
		...rest,
		...(id ? { id } : {}),
		children: stripLocalFields(children),
	}));

const useStyles = makeStyles(theme => ({
	root: {
		display: "flex",
		flexWrap: "wrap",
	},
	textField: {
		marginRight: theme.spacing(1),
		flex: 1,
	},

	btnWrapper: {
		position: "relative",
	},

	buttonProgress: {
		color: green[500],
		position: "absolute",
		top: "50%",
		left: "50%",
		marginTop: -12,
		marginLeft: -12,
	},
	formControl: {
		margin: theme.spacing(1),
		minWidth: 120,
	},
	colorAdorment: {
		width: 20,
		height: 20,
	},
}));

const QueueSchema = Yup.object().shape({
	name: Yup.string()
		.min(2, "Too Short!")
		.max(50, "Too Long!")
		.required("Required"),
	color: Yup.string().min(3, "Too Short!").max(9, "Too Long!").required(),
	greetingMessage: Yup.string(),
});

const QueueModal = ({ open, onClose, queueId }) => {
	const classes = useStyles();
	const { user: loggedInUser } = useContext(AuthContext);
	// Precisa ser um <Tab> filho direto de <Tabs> (não um <Can> envolvendo um
	// <Tab>) - o Tabs do Material-UI clona seus filhos por tipo pra injetar
	// onChange/selected/indicator, e um wrapper custom quebra essa introspecção
	// silenciosamente: o clique para de trocar de aba, sem erro nenhum.
	const canEditQueueUsers = check(loggedInUser.profile, "queue-modal:editUsers");

	const initialState = {
		name: "",
		color: "",
		greetingMessage: "",
	};

	const [colorPickerModalOpen, setColorPickerModalOpen] = useState(false);
	const [queue, setQueue] = useState(initialState);
	const [activeTab, setActiveTab] = useState("general");
	const [options, setOptions] = useState([]);
	const [selectedUserIds, setSelectedUserIds] = useState([]);
	const greetingRef = useRef();

	useEffect(() => {
		(async () => {
			if (!queueId) return;
			try {
				const { data } = await api.get(`/queue/${queueId}`);
				setQueue(prevState => {
					return { ...prevState, ...data };
				});
				setOptions(buildOptionsTree(data.options));
				setSelectedUserIds((data.users || []).map(u => u.id));
			} catch (err) {
				toastError(err);
			}
		})();

		return () => {
			setQueue({
				name: "",
				color: "",
				greetingMessage: "",
			});
			setOptions([]);
			setSelectedUserIds([]);
			setActiveTab("general");
		};
	}, [queueId, open]);

	const handleClose = () => {
		onClose();
		setQueue(initialState);
	};

	const handleSaveQueue = async values => {
		try {
			const payload = {
				...values,
				userIds: selectedUserIds,
				options: stripLocalFields(options),
			};

			if (queueId) {
				await api.put(`/queue/${queueId}`, payload);
			} else {
				await api.post("/queue", payload);
			}
			toast.success(i18n.t("queueModal.success"));
			handleClose();
		} catch (err) {
			toastError(err);
		}
	};

	return (
		<div className={classes.root}>
			<Dialog open={open} onClose={handleClose} scroll="paper" maxWidth="sm" fullWidth>
				<DialogTitle>
					{queueId
						? `${i18n.t("queueModal.title.edit")}`
						: `${i18n.t("queueModal.title.add")}`}
				</DialogTitle>
				<Formik
					initialValues={queue}
					enableReinitialize={true}
					validationSchema={QueueSchema}
					onSubmit={(values, actions) => {
						setTimeout(() => {
							handleSaveQueue(values);
							actions.setSubmitting(false);
						}, 400);
					}}
				>
					{({ touched, errors, isSubmitting, values }) => (
						<Form>
							<Tabs
								value={activeTab}
								onChange={(e, value) => setActiveTab(value)}
								indicatorColor="primary"
								textColor="primary"
								variant="fullWidth"
							>
								<Tab value="general" label={i18n.t("queueModal.tabs.general")} />
								<Tab value="steps" label={i18n.t("queueModal.tabs.steps")} />
								{canEditQueueUsers && (
									<Tab value="users" label={i18n.t("queueModal.tabs.users")} />
								)}
							</Tabs>
							<DialogContent dividers>
								<Box hidden={activeTab !== "general"}>
									<Field
										as={TextField}
										label={i18n.t("queueModal.form.name")}
										autoFocus
										name="name"
										error={touched.name && Boolean(errors.name)}
										helperText={touched.name && errors.name}
										variant="outlined"
										margin="dense"
										className={classes.textField}
									/>
									<Field
										as={TextField}
										label={i18n.t("queueModal.form.color")}
										name="color"
										id="color"
										onFocus={() => {
											setColorPickerModalOpen(true);
											greetingRef.current.focus();
										}}
										error={touched.color && Boolean(errors.color)}
										helperText={touched.color && errors.color}
										InputProps={{
											startAdornment: (
												<InputAdornment position="start">
													<div
														style={{ backgroundColor: values.color }}
														className={classes.colorAdorment}
													></div>
												</InputAdornment>
											),
											endAdornment: (
												<IconButton
													size="small"
													color="default"
													onClick={() => setColorPickerModalOpen(true)}
												>
													<Colorize />
												</IconButton>
											),
										}}
										variant="outlined"
										margin="dense"
									/>
									<ColorPicker
										open={colorPickerModalOpen}
										handleClose={() => setColorPickerModalOpen(false)}
										onChange={color => {
											values.color = color;
											setQueue(() => {
												return { ...values, color };
											});
										}}
									/>
									<div>
										<Field
											as={TextField}
											label={i18n.t("queueModal.form.greetingMessage")}
											type="greetingMessage"
											multiline
											inputRef={greetingRef}
											rows={5}
											fullWidth
											name="greetingMessage"
											error={
												touched.greetingMessage && Boolean(errors.greetingMessage)
											}
											helperText={
												touched.greetingMessage && errors.greetingMessage
											}
											variant="outlined"
											margin="dense"
										/>
									</div>
								</Box>
								<Box hidden={activeTab !== "steps"}>
									<QueueOptionsTree value={options} onChange={setOptions} />
								</Box>
								{canEditQueueUsers && (
									<Box hidden={activeTab !== "users"}>
										<UserSelect
											selectedUserIds={selectedUserIds}
											onChange={setSelectedUserIds}
										/>
									</Box>
								)}
							</DialogContent>
							<DialogActions>
								<Button
									onClick={handleClose}
									color="secondary"
									disabled={isSubmitting}
									variant="outlined"
								>
									{i18n.t("queueModal.buttons.cancel")}
								</Button>
								<Button
									type="submit"
									color="primary"
									disabled={isSubmitting}
									variant="contained"
									className={classes.btnWrapper}
								>
									{queueId
										? `${i18n.t("queueModal.buttons.okEdit")}`
										: `${i18n.t("queueModal.buttons.okAdd")}`}
									{isSubmitting && (
										<CircularProgress
											size={24}
											className={classes.buttonProgress}
										/>
									)}
								</Button>
							</DialogActions>
						</Form>
					)}
				</Formik>
			</Dialog>
		</div>
	);
};

export default QueueModal;
