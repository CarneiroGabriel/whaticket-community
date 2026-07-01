import React, { useState, useEffect, useCallback } from "react";
import openSocket from "../../services/socket-io";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import Container from "@material-ui/core/Container";
import Select from "@material-ui/core/Select";
import TextField from "@material-ui/core/TextField";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Box from "@material-ui/core/Box";
import Switch from "@material-ui/core/Switch";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Divider from "@material-ui/core/Divider";
import Chip from "@material-ui/core/Chip";
import DeleteIcon from "@material-ui/icons/Delete";
import EditIcon from "@material-ui/icons/Edit";
import AddIcon from "@material-ui/icons/Add";
import { toast } from "react-toastify";

import api from "../../services/api";
import { i18n } from "../../translate/i18n.js";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    alignItems: "flex-start",
    padding: theme.spacing(4, 4, 3),
  },
  paper: {
    padding: theme.spacing(2),
    display: "flex",
    alignItems: "center",
    marginBottom: 12,
  },
  settingOption: {
    marginLeft: "auto",
  },
  margin: {
    margin: theme.spacing(1),
  },
  tabContent: {
    paddingTop: theme.spacing(2),
  },
  sectionTitle: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
  },
  dayRow: {
    display: "flex",
    alignItems: "center",
    marginBottom: theme.spacing(1),
    gap: theme.spacing(1),
    flexWrap: "wrap",
  },
  dayLabel: {
    width: 130,
    flexShrink: 0,
  },
  intervalChip: {
    margin: theme.spacing(0.25),
  },
  addIntervalBtn: {
    marginLeft: theme.spacing(1),
  },
  fullWidthField: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  saveBtn: {
    marginTop: theme.spacing(2),
  },
  noticeBox: {
    padding: theme.spacing(1.5),
    backgroundColor: theme.palette.info
      ? theme.palette.info.light
      : "#e3f2fd",
    borderRadius: 4,
    marginBottom: theme.spacing(2),
  },
}));

const DAY_NAMES = [
  i18n.t("settings.businessHours.days.0"),
  i18n.t("settings.businessHours.days.1"),
  i18n.t("settings.businessHours.days.2"),
  i18n.t("settings.businessHours.days.3"),
  i18n.t("settings.businessHours.days.4"),
  i18n.t("settings.businessHours.days.5"),
  i18n.t("settings.businessHours.days.6"),
];

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box pt={2}>{children}</Box>}
    </div>
  );
}

// ─── Aba Geral ────────────────────────────────────────────────────────────────
function GeneralTab({ settings, onChangeSetting }) {
  const classes = useStyles();

  const getVal = key => {
    const s = settings.find(s => s.key === key);
    return s ? s.value : "";
  };

  return (
    <>
      <Typography variant="body2" gutterBottom>
        {i18n.t("settings.title")}
      </Typography>

      <Paper className={classes.paper}>
        <Typography variant="body1">
          {i18n.t("settings.settings.userCreation.name")}
        </Typography>
        <Select
          margin="dense"
          variant="outlined"
          native
          name="userCreation"
          value={settings.length > 0 ? getVal("userCreation") : ""}
          className={classes.settingOption}
          onChange={onChangeSetting}
        >
          <option value="enabled">
            {i18n.t("settings.settings.userCreation.options.enabled")}
          </option>
          <option value="disabled">
            {i18n.t("settings.settings.userCreation.options.disabled")}
          </option>
        </Select>
      </Paper>

      <Paper className={classes.paper}>
        <TextField
          id="api-token-setting"
          label="Token Api"
          margin="dense"
          variant="outlined"
          fullWidth
          inputProps={{ readOnly: true }}
          value={settings.length > 0 ? getVal("userApiToken") : ""}
        />
      </Paper>
    </>
  );
}

// ─── Aba Horário de Atendimento ───────────────────────────────────────────────
function BusinessHoursTab({ settings, onChangeSetting }) {
  const classes = useStyles();
  const [businessHours, setBusinessHours] = useState([]);
  const [editingIntervals, setEditingIntervals] = useState(null);
  const [newInterval, setNewInterval] = useState({ start: "08:00", end: "18:00" });

  const getVal = key => {
    const s = settings.find(s => s.key === key);
    return s ? s.value : "";
  };

  const isSwitchOn = key => getVal(key) === "true";

  const handleSwitch = async (key, checked) => {
    try {
      await api.put(`/settings/${key}`, { value: checked ? "true" : "false" });
      toast.success(i18n.t("settings.success"));
    } catch (err) {
      toastError(err);
    }
  };

  const fetchBusinessHours = useCallback(async () => {
    try {
      const { data } = await api.get("/businessHours");
      setBusinessHours(data);
    } catch (err) {
      toastError(err);
    }
  }, []);

  useEffect(() => {
    fetchBusinessHours();
  }, [fetchBusinessHours]);

  const handleDayToggle = async (hour) => {
    try {
      await api.put(`/businessHours/${hour.id}`, {
        enabled: !hour.enabled,
        intervals: hour.intervals,
      });
      toast.success(i18n.t("settings.businessHours.saved"));
      fetchBusinessHours();
    } catch (err) {
      toastError(err);
    }
  };

  const openIntervalEditor = (hour) => {
    setEditingIntervals({ ...hour, intervals: [...(hour.intervals || [])] });
    setNewInterval({ start: "08:00", end: "18:00" });
  };

  const addInterval = () => {
    if (!editingIntervals) return;
    setEditingIntervals(prev => ({
      ...prev,
      intervals: [...prev.intervals, { ...newInterval }],
    }));
  };

  const removeInterval = (idx) => {
    setEditingIntervals(prev => ({
      ...prev,
      intervals: prev.intervals.filter((_, i) => i !== idx),
    }));
  };

  const saveIntervals = async () => {
    try {
      await api.put(`/businessHours/${editingIntervals.id}`, {
        enabled: editingIntervals.enabled,
        intervals: editingIntervals.intervals,
      });
      toast.success(i18n.t("settings.businessHours.saved"));
      setEditingIntervals(null);
      fetchBusinessHours();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <>
      <Paper className={classes.paper} style={{ flexDirection: "column", alignItems: "flex-start" }}>
        <FormControlLabel
          control={
            <Switch
              checked={isSwitchOn("businessHoursEnabled")}
              onChange={e => handleSwitch("businessHoursEnabled", e.target.checked)}
              color="primary"
            />
          }
          label={i18n.t("settings.businessHours.enabled")}
        />
        <FormControlLabel
          control={
            <Switch
              checked={isSwitchOn("businessHoursSendOnlyAfterBot")}
              onChange={e => handleSwitch("businessHoursSendOnlyAfterBot", e.target.checked)}
              color="primary"
            />
          }
          label={i18n.t("settings.businessHours.sendOnlyAfterBot")}
        />
        <FormControlLabel
          control={
            <Switch
              checked={isSwitchOn("businessHoursReplyWithBotOutOfHours")}
              onChange={e => handleSwitch("businessHoursReplyWithBotOutOfHours", e.target.checked)}
              color="primary"
            />
          }
          label={i18n.t("settings.businessHours.replyWithBotOutOfHours")}
        />
      </Paper>

      <Paper className={classes.paper} style={{ flexDirection: "column", alignItems: "flex-start" }}>
        <TextField
          label={i18n.t("settings.businessHours.absenceMessage")}
          placeholder={i18n.t("settings.businessHours.absenceMessagePlaceholder")}
          multiline
          minRows={2}
          variant="outlined"
          fullWidth
          className={classes.fullWidthField}
          value={getVal("businessHoursAbsenceMessage")}
          onChange={e =>
            onChangeSetting({
              target: { name: "businessHoursAbsenceMessage", value: e.target.value },
            })
          }
          onBlur={e =>
            api
              .put("/settings/businessHoursAbsenceMessage", { value: e.target.value })
              .then(() => toast.success(i18n.t("settings.success")))
              .catch(toastError)
          }
        />
      </Paper>

      <Typography variant="subtitle1" className={classes.sectionTitle}>
        {i18n.t("settings.businessHours.intervals")}
      </Typography>

      {businessHours.map(hour => (
        <Paper key={hour.id} className={classes.paper} style={{ flexDirection: "column", alignItems: "flex-start" }}>
          <div className={classes.dayRow}>
            <FormControlLabel
              className={classes.dayLabel}
              control={
                <Switch
                  checked={!!hour.enabled}
                  onChange={() => handleDayToggle(hour)}
                  color="primary"
                  size="small"
                />
              }
              label={DAY_NAMES[hour.dayOfWeek]}
            />
            <Box flex={1} display="flex" flexWrap="wrap" alignItems="center">
              {(hour.intervals || []).map((iv, idx) => (
                <Chip
                  key={idx}
                  className={classes.intervalChip}
                  label={`${iv.start} – ${iv.end}`}
                  size="small"
                />
              ))}
              <IconButton
                size="small"
                className={classes.addIntervalBtn}
                onClick={() => openIntervalEditor(hour)}
                title={i18n.t("settings.businessHours.addInterval")}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Box>
          </div>
        </Paper>
      ))}

      {/* Modal de edição de intervalos */}
      <Dialog open={!!editingIntervals} onClose={() => setEditingIntervals(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingIntervals ? DAY_NAMES[editingIntervals.dayOfWeek] : ""}
        </DialogTitle>
        <DialogContent>
          {editingIntervals && editingIntervals.intervals.map((iv, idx) => (
            <Box key={idx} display="flex" alignItems="center" mb={1} gap={1}>
              <TextField
                label={i18n.t("settings.businessHours.from")}
                type="time"
                value={iv.start}
                onChange={e => {
                  const intervals = [...editingIntervals.intervals];
                  intervals[idx] = { ...intervals[idx], start: e.target.value };
                  setEditingIntervals(prev => ({ ...prev, intervals }));
                }}
                InputLabelProps={{ shrink: true }}
                style={{ marginRight: 8 }}
              />
              <TextField
                label={i18n.t("settings.businessHours.to")}
                type="time"
                value={iv.end}
                onChange={e => {
                  const intervals = [...editingIntervals.intervals];
                  intervals[idx] = { ...intervals[idx], end: e.target.value };
                  setEditingIntervals(prev => ({ ...prev, intervals }));
                }}
                InputLabelProps={{ shrink: true }}
                style={{ marginRight: 8 }}
              />
              <IconButton size="small" onClick={() => removeInterval(idx)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Divider style={{ margin: "12px 0" }} />
          <Box display="flex" alignItems="center" gap={1}>
            <TextField
              label={i18n.t("settings.businessHours.from")}
              type="time"
              value={newInterval.start}
              onChange={e => setNewInterval(p => ({ ...p, start: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              style={{ marginRight: 8 }}
            />
            <TextField
              label={i18n.t("settings.businessHours.to")}
              type="time"
              value={newInterval.end}
              onChange={e => setNewInterval(p => ({ ...p, end: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              style={{ marginRight: 8 }}
            />
            <Button startIcon={<AddIcon />} onClick={addInterval} variant="outlined" size="small">
              {i18n.t("settings.businessHours.addInterval")}
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingIntervals(null)}>{i18n.t("settings.scheduledAbsences.modal.cancel")}</Button>
          <Button onClick={saveIntervals} color="primary" variant="contained">
            {i18n.t("settings.scheduledAbsences.modal.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ─── Aba Ausências Programadas ────────────────────────────────────────────────
const ABSENCE_EMPTY = { name: "", startDate: "", endDate: "", message: "", enabled: true };

function ScheduledAbsencesTab() {
  const classes = useStyles();
  const [absences, setAbsences] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(ABSENCE_EMPTY);

  const fetchAbsences = useCallback(async () => {
    try {
      const { data } = await api.get("/scheduledAbsences");
      setAbsences(data);
    } catch (err) {
      toastError(err);
    }
  }, []);

  useEffect(() => {
    fetchAbsences();
  }, [fetchAbsences]);

  const openCreate = () => {
    setEditing(null);
    setForm(ABSENCE_EMPTY);
    setModalOpen(true);
  };

  const openEdit = (absence) => {
    setEditing(absence);
    setForm({
      name: absence.name,
      startDate: absence.startDate,
      endDate: absence.endDate,
      message: absence.message,
      enabled: absence.enabled,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/scheduledAbsences/${editing.id}`, form);
        toast.success(i18n.t("settings.scheduledAbsences.toasts.updated"));
      } else {
        await api.post("/scheduledAbsences", form);
        toast.success(i18n.t("settings.scheduledAbsences.toasts.created"));
      }
      setModalOpen(false);
      fetchAbsences();
    } catch (err) {
      toastError(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(i18n.t("settings.scheduledAbsences.confirmDelete"))) return;
    try {
      await api.delete(`/scheduledAbsences/${id}`);
      toast.success(i18n.t("settings.scheduledAbsences.toasts.deleted"));
      fetchAbsences();
    } catch (err) {
      toastError(err);
    }
  };

  const t = i18n.t.bind(i18n);

  return (
    <>
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={openCreate}
        >
          {t("settings.scheduledAbsences.add")}
        </Button>
      </Box>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("settings.scheduledAbsences.table.name")}</TableCell>
              <TableCell>{t("settings.scheduledAbsences.table.startDate")}</TableCell>
              <TableCell>{t("settings.scheduledAbsences.table.endDate")}</TableCell>
              <TableCell>{t("settings.scheduledAbsences.table.enabled")}</TableCell>
              <TableCell>{t("settings.scheduledAbsences.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {absences.map(a => (
              <TableRow key={a.id}>
                <TableCell>{a.name}</TableCell>
                <TableCell>{a.startDate}</TableCell>
                <TableCell>{a.endDate}</TableCell>
                <TableCell>
                  <Switch
                    checked={!!a.enabled}
                    size="small"
                    onChange={async e => {
                      try {
                        await api.put(`/scheduledAbsences/${a.id}`, { enabled: e.target.checked });
                        fetchAbsences();
                      } catch (err) {
                        toastError(err);
                      }
                    }}
                    color="primary"
                  />
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => openEdit(a)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(a.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editing
            ? t("settings.scheduledAbsences.modal.editTitle")
            : t("settings.scheduledAbsences.modal.addTitle")}
        </DialogTitle>
        <DialogContent>
          <TextField
            label={t("settings.scheduledAbsences.modal.name")}
            fullWidth
            margin="normal"
            variant="outlined"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          />
          <Box display="flex" gap={2}>
            <TextField
              label={t("settings.scheduledAbsences.modal.startDate")}
              type="date"
              fullWidth
              margin="normal"
              variant="outlined"
              InputLabelProps={{ shrink: true }}
              value={form.startDate}
              onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
              style={{ marginRight: 8 }}
            />
            <TextField
              label={t("settings.scheduledAbsences.modal.endDate")}
              type="date"
              fullWidth
              margin="normal"
              variant="outlined"
              InputLabelProps={{ shrink: true }}
              value={form.endDate}
              onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
            />
          </Box>
          <TextField
            label={t("settings.scheduledAbsences.modal.message")}
            placeholder={t("settings.scheduledAbsences.modal.messagePlaceholder")}
            fullWidth
            multiline
            minRows={3}
            margin="normal"
            variant="outlined"
            value={form.message}
            onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
          />
          <FormControlLabel
            control={
              <Switch
                checked={!!form.enabled}
                onChange={e => setForm(p => ({ ...p, enabled: e.target.checked }))}
                color="primary"
              />
            }
            label={t("settings.scheduledAbsences.modal.enabled")}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>
            {t("settings.scheduledAbsences.modal.cancel")}
          </Button>
          <Button onClick={handleSave} color="primary" variant="contained">
            {t("settings.scheduledAbsences.modal.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ─── Aba Inatividade ──────────────────────────────────────────────────────────
function InactivityTab({ settings, onChangeSetting }) {
  const classes = useStyles();

  const getVal = key => {
    const s = settings.find(s => s.key === key);
    return s ? s.value : "";
  };

  const isSwitchOn = key => getVal(key) === "true";

  const handleSwitch = async (key, checked) => {
    try {
      await api.put(`/settings/${key}`, { value: checked ? "true" : "false" });
      toast.success(i18n.t("settings.success"));
    } catch (err) {
      toastError(err);
    }
  };

  const handleBlurSave = async (key, value) => {
    try {
      await api.put(`/settings/${key}`, { value });
      toast.success(i18n.t("settings.inactivity.saved"));
    } catch (err) {
      toastError(err);
    }
  };

  const t = i18n.t.bind(i18n);

  return (
    <Paper style={{ padding: 16 }}>
      <FormControlLabel
        control={
          <Switch
            checked={isSwitchOn("inactivityEnabled")}
            onChange={e => handleSwitch("inactivityEnabled", e.target.checked)}
            color="primary"
          />
        }
        label={t("settings.inactivity.enabled")}
      />
      <Divider style={{ margin: "12px 0" }} />

      <Box display="flex" gap={2} flexWrap="wrap">
        <TextField
          label={t("settings.inactivity.warningMinutes")}
          type="number"
          variant="outlined"
          margin="normal"
          style={{ width: 220 }}
          value={getVal("inactivityWarningMinutes")}
          onChange={e =>
            onChangeSetting({ target: { name: "inactivityWarningMinutes", value: e.target.value } })
          }
          onBlur={e => handleBlurSave("inactivityWarningMinutes", e.target.value)}
          inputProps={{ min: 1 }}
        />
        <TextField
          label={t("settings.inactivity.resolveMinutes")}
          type="number"
          variant="outlined"
          margin="normal"
          style={{ width: 260 }}
          value={getVal("inactivityResolveMinutes")}
          onChange={e =>
            onChangeSetting({ target: { name: "inactivityResolveMinutes", value: e.target.value } })
          }
          onBlur={e => handleBlurSave("inactivityResolveMinutes", e.target.value)}
          inputProps={{ min: 1 }}
        />
      </Box>

      <TextField
        label={t("settings.inactivity.warningMessage")}
        placeholder={t("settings.inactivity.warningMessagePlaceholder")}
        fullWidth
        multiline
        minRows={2}
        variant="outlined"
        className={classes.fullWidthField}
        value={getVal("inactivityWarningMessage")}
        onChange={e =>
          onChangeSetting({ target: { name: "inactivityWarningMessage", value: e.target.value } })
        }
        onBlur={e => handleBlurSave("inactivityWarningMessage", e.target.value)}
      />

      <FormControlLabel
        control={
          <Switch
            checked={isSwitchOn("inactivitySendFarewellMessage")}
            onChange={e => handleSwitch("inactivitySendFarewellMessage", e.target.checked)}
            color="primary"
          />
        }
        label={t("settings.inactivity.sendFarewellMessage")}
      />

      <TextField
        label={t("settings.inactivity.farewellMessage")}
        placeholder={t("settings.inactivity.farewellMessagePlaceholder")}
        fullWidth
        multiline
        minRows={2}
        variant="outlined"
        className={classes.fullWidthField}
        value={getVal("inactivityFarewellMessage")}
        onChange={e =>
          onChangeSetting({ target: { name: "inactivityFarewellMessage", value: e.target.value } })
        }
        onBlur={e => handleBlurSave("inactivityFarewellMessage", e.target.value)}
      />

      <FormControlLabel
        control={
          <Switch
            checked={isSwitchOn("inactivityOnlyBotTickets")}
            onChange={e => handleSwitch("inactivityOnlyBotTickets", e.target.checked)}
            color="primary"
          />
        }
        label={t("settings.inactivity.onlyBotTickets")}
      />
    </Paper>
  );
}

// ─── Aba CSAT ─────────────────────────────────────────────────────────────────
function CsatTab({ settings, onChangeSetting }) {
  const classes = useStyles();

  const getVal = key => {
    const s = settings.find(s => s.key === key);
    return s ? s.value : "";
  };

  const isSwitchOn = key => getVal(key) === "true";

  const handleSwitch = async (key, checked) => {
    try {
      await api.put(`/settings/${key}`, { value: checked ? "true" : "false" });
      toast.success(i18n.t("settings.success"));
    } catch (err) {
      toastError(err);
    }
  };

  const handleBlurSave = async (key, value) => {
    try {
      await api.put(`/settings/${key}`, { value });
      toast.success(i18n.t("settings.csat.saved"));
    } catch (err) {
      toastError(err);
    }
  };

  const t = i18n.t.bind(i18n);

  return (
    <Paper style={{ padding: 16 }}>
      <Box className={classes.noticeBox}>
        <Typography variant="body2">{t("settings.csat.notice")}</Typography>
      </Box>

      <FormControlLabel
        control={
          <Switch
            checked={isSwitchOn("csatEnabled")}
            onChange={e => handleSwitch("csatEnabled", e.target.checked)}
            color="primary"
          />
        }
        label={t("settings.csat.enabled")}
      />
      <Divider style={{ margin: "12px 0" }} />

      <TextField
        label={t("settings.csat.requestMessage")}
        placeholder={t("settings.csat.requestMessagePlaceholder")}
        fullWidth
        multiline
        minRows={2}
        variant="outlined"
        className={classes.fullWidthField}
        value={getVal("csatRequestMessage")}
        onChange={e =>
          onChangeSetting({ target: { name: "csatRequestMessage", value: e.target.value } })
        }
        onBlur={e => handleBlurSave("csatRequestMessage", e.target.value)}
      />

      <TextField
        label={t("settings.csat.thankYouMessage")}
        placeholder={t("settings.csat.thankYouMessagePlaceholder")}
        fullWidth
        multiline
        minRows={2}
        variant="outlined"
        className={classes.fullWidthField}
        value={getVal("csatThankYouMessage")}
        onChange={e =>
          onChangeSetting({ target: { name: "csatThankYouMessage", value: e.target.value } })
        }
        onBlur={e => handleBlurSave("csatThankYouMessage", e.target.value)}
      />
    </Paper>
  );
}

// ─── Componente raiz ──────────────────────────────────────────────────────────
const Settings = () => {
  const classes = useStyles();
  const [tab, setTab] = useState(0);
  const [settings, setSettings] = useState([]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get("/settings");
        setSettings(data);
      } catch (err) {
        toastError(err);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const socket = openSocket();

    socket.on("settings", data => {
      if (data.action === "update") {
        setSettings(prev => {
          const next = [...prev];
          const idx = next.findIndex(s => s.key === data.setting.key);
          if (idx >= 0) {
            next[idx] = { ...next[idx], value: data.setting.value };
          }
          return next;
        });
      }
    });

    return () => socket.disconnect();
  }, []);

  // Actualiza optimisticamente o estado local enquanto o usuário digita
  const handleChangeSetting = async e => {
    const { name, value } = e.target;

    setSettings(prev => {
      const next = [...prev];
      const idx = next.findIndex(s => s.key === name);
      if (idx >= 0) {
        next[idx] = { ...next[idx], value };
      }
      return next;
    });

    // Apenas para Select (mudança imediata), não para TextField (usa onBlur)
    if (e.type === "change" && e.target.tagName === "SELECT") {
      try {
        await api.put(`/settings/${name}`, { value });
        toast.success(i18n.t("settings.success"));
      } catch (err) {
        toastError(err);
      }
    }
  };

  const t = i18n.t.bind(i18n);

  return (
    <div className={classes.root}>
      <Container maxWidth="md">
        <Typography variant="h5" gutterBottom>
          {t("settings.title")}
        </Typography>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label={t("settings.tabs.general")} />
          <Tab label={t("settings.tabs.businessHours")} />
          <Tab label={t("settings.tabs.scheduledAbsences")} />
          <Tab label={t("settings.tabs.inactivity")} />
          <Tab label={t("settings.tabs.csat")} />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <GeneralTab settings={settings} onChangeSetting={handleChangeSetting} />
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <BusinessHoursTab settings={settings} onChangeSetting={handleChangeSetting} />
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <ScheduledAbsencesTab />
        </TabPanel>

        <TabPanel value={tab} index={3}>
          <InactivityTab settings={settings} onChangeSetting={handleChangeSetting} />
        </TabPanel>

        <TabPanel value={tab} index={4}>
          <CsatTab settings={settings} onChangeSetting={handleChangeSetting} />
        </TabPanel>
      </Container>
    </div>
  );
};

export default Settings;
