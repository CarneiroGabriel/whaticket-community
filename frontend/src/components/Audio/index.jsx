import React, { useRef, useState, useEffect } from "react";
import { IconButton, Slider, makeStyles } from "@material-ui/core";
import { PlayArrow, Pause } from "@material-ui/icons";

const LS_NAME = "audioMessageRate";
const RATES = [0.5, 1, 1.5, 2];

const useStyles = makeStyles(() => ({
  root: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: 260,
    maxWidth: "100%",
    padding: "6px 10px 6px 6px",
    backgroundColor: "rgba(0, 0, 0, 0.04)",
    borderRadius: 20,
  },
  playButton: {
    backgroundColor: "#2576d2",
    color: "#fff",
    width: 34,
    height: 34,
    flexShrink: 0,
    "&:hover": {
      backgroundColor: "#1a5fae",
    },
  },
  body: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    minWidth: 0,
  },
  slider: {
    color: "#2576d2",
    padding: "8px 0 2px",
    "& .MuiSlider-thumb": {
      width: 11,
      height: 11,
      marginTop: -4,
      boxShadow: "none",
    },
    "& .MuiSlider-rail": {
      opacity: 0.3,
    },
    "& .MuiSlider-track": {
      transition: "none",
    },
  },
  infoRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  time: {
    fontSize: 11,
    color: "#667781",
  },
  rateButton: {
    fontSize: 11,
    fontWeight: 600,
    color: "#2576d2",
    cursor: "pointer",
    userSelect: "none",
    padding: "1px 5px",
    borderRadius: 8,
    "&:hover": {
      backgroundColor: "rgba(37, 118, 210, 0.1)",
    },
  },
}));

const formatTime = seconds => {
  if (!seconds || Number.isNaN(seconds) || !Number.isFinite(seconds)) {
    return "0:00";
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export default function Audio({ url }) {
  const classes = useStyles();
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioRate, setAudioRate] = useState(
    parseFloat(localStorage.getItem(LS_NAME) || "1")
  );

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = audioRate;
    }
    localStorage.setItem(LS_NAME, audioRate);
  }, [audioRate]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleSeek = (_event, value) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value;
    setCurrentTime(value);
  };

  const toggleRate = () => {
    const currentIndex = RATES.indexOf(audioRate);
    const nextRate = RATES[(currentIndex + 1) % RATES.length];
    setAudioRate(nextRate);
  };

  return (
    <div className={classes.root}>
      <audio ref={audioRef} controls={false} preload="metadata">
        <source src={url} type="audio/ogg" />
      </audio>
      <IconButton
        size="small"
        className={classes.playButton}
        onClick={togglePlay}
      >
        {isPlaying ? (
          <Pause fontSize="small" />
        ) : (
          <PlayArrow fontSize="small" />
        )}
      </IconButton>
      <div className={classes.body}>
        <Slider
          className={classes.slider}
          size="small"
          min={0}
          max={duration || 0}
          value={Math.min(currentTime, duration || 0)}
          onChange={handleSeek}
          aria-label="progresso do áudio"
        />
        <div className={classes.infoRow}>
          <span className={classes.time}>{formatTime(currentTime)}</span>
          <span className={classes.rateButton} onClick={toggleRate}>
            {audioRate}x
          </span>
          <span className={classes.time}>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
