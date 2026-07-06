const rules = {
	user: {
		static: [],
	},

	admin: {
		static: [
			"drawer-admin-items:view",
			"tickets-manager:showall",
			"user-modal:editProfile",
			"user-modal:editQueues",
			"queue-modal:editUsers",
			"ticket-options:deleteTicket",
			"ticket-options:transferWhatsapp",
			"contacts-page:deleteContact",
		],
	},
};

export default rules;
