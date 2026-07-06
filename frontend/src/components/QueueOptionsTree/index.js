import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import IconButton from "@material-ui/core/IconButton";
import Button from "@material-ui/core/Button";
import Paper from "@material-ui/core/Paper";
import DeleteIcon from "@material-ui/icons/Delete";
import AddIcon from "@material-ui/icons/Add";

import { i18n } from "../../translate/i18n";

const useStyles = makeStyles(theme => ({
	node: {
		padding: theme.spacing(1),
		marginBottom: theme.spacing(1),
	},
	nodeHeader: {
		display: "flex",
		gap: theme.spacing(1),
		alignItems: "flex-start",
	},
	children: {
		marginLeft: theme.spacing(3),
		marginTop: theme.spacing(1),
	},
}));

let localIdCounter = 0;
const nextLocalId = () => {
	localIdCounter -= 1;
	return localIdCounter;
};

const emptyNode = () => ({
	_localId: nextLocalId(),
	title: "",
	message: "",
	children: [],
});

const QueueOptionNode = ({ node, onChange, onRemove }) => {
	const classes = useStyles();

	const handleFieldChange = (field, fieldValue) => {
		onChange({ ...node, [field]: fieldValue });
	};

	const handleAddChild = () => {
		const children = node.children || [];
		onChange({ ...node, children: [...children, emptyNode()] });
	};

	const handleChildChange = (index, updatedChild) => {
		const children = [...(node.children || [])];
		children[index] = updatedChild;
		onChange({ ...node, children });
	};

	const handleChildRemove = index => {
		const children = [...(node.children || [])];
		children.splice(index, 1);
		onChange({ ...node, children });
	};

	return (
		<Paper variant="outlined" className={classes.node}>
			<div className={classes.nodeHeader}>
				<TextField
					label={i18n.t("queueModal.steps.titleLabel")}
					value={node.title || ""}
					onChange={e => handleFieldChange("title", e.target.value)}
					size="small"
					variant="outlined"
					style={{ flex: 1 }}
				/>
				<IconButton
					size="small"
					onClick={onRemove}
					title={i18n.t("queueModal.steps.remove")}
				>
					<DeleteIcon fontSize="small" />
				</IconButton>
			</div>
			<TextField
				label={i18n.t("queueModal.steps.messageLabel")}
				value={node.message || ""}
				onChange={e => handleFieldChange("message", e.target.value)}
				multiline
				minRows={2}
				fullWidth
				size="small"
				variant="outlined"
				style={{ marginTop: 8 }}
			/>
			<Button
				size="small"
				startIcon={<AddIcon />}
				onClick={handleAddChild}
				style={{ marginTop: 8 }}
			>
				{i18n.t("queueModal.steps.addChild")}
			</Button>
			{node.children && node.children.length > 0 && (
				<div className={classes.children}>
					{node.children.map((child, index) => (
						<QueueOptionNode
							key={child.id ?? child._localId}
							node={child}
							onChange={updated => handleChildChange(index, updated)}
							onRemove={() => handleChildRemove(index)}
						/>
					))}
				</div>
			)}
		</Paper>
	);
};

const QueueOptionsTree = ({ value = [], onChange }) => {
	const handleAddRoot = () => {
		onChange([...value, emptyNode()]);
	};

	const handleNodeChange = (index, updatedNode) => {
		const next = [...value];
		next[index] = updatedNode;
		onChange(next);
	};

	const handleNodeRemove = index => {
		const next = [...value];
		next.splice(index, 1);
		onChange(next);
	};

	return (
		<div>
			{value.map((node, index) => (
				<QueueOptionNode
					key={node.id ?? node._localId}
					node={node}
					onChange={updated => handleNodeChange(index, updated)}
					onRemove={() => handleNodeRemove(index)}
				/>
			))}
			<Button
				startIcon={<AddIcon />}
				onClick={handleAddRoot}
				variant="outlined"
				size="small"
			>
				{i18n.t("queueModal.steps.addRoot")}
			</Button>
		</div>
	);
};

export default QueueOptionsTree;
