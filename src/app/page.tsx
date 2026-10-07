"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import Background from "@/components/Background";
import GameOverScreen from "@/components/GameOverScreen";
import JoinScreen from "@/components/JoinScreen";
import LeaderboardScreen from "@/components/LeaderboardScreen";
import LobbyScreen from "@/components/LobbyScreen";
import { burstCorrectBurst } from "@/components/Confetti";
import QuizScreen, { type QuizStatus } from "@/components/QuizScreen";
import WelcomeScreen from "@/components/WelcomeScreen";
import { gameApi } from "@/lib/client/api";
import { subscribeRealtime } from "@/lib/client/realtime";
import {
  formatAvgSeconds,
  prepareQuestions,
  prepareRemainingQuestions,
  QUESTION_TIME_MS,
  scoreForTimeLeftMs,
  type PreparedQuestion,
} from "@/lib/questions";
import type { Game, JoinError, Player, RealtimeEvent } from "@/lib/types";

type Phase = "boot" | "welcome" | "join" | "lobby" | "quiz" | "gameover" | "leaderboard";

const STORAGE_KEY = "gmchallenge-player";

function loadStoredPlayer(gameId: string): { playerId: string; name: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { gameId?: string; playerId: string; name: string };
    return data.gameId === gameId ? data : null;
  } catch {
    return null;
  }
}

function saveStoredPlayer(gameId: string, playerId: string, name: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ gameId, playerId, name }));
  } catch {
    /* ignore */
  }
}

function clearStoredPlayer() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export default function Home() {
  // --------------------------- state ---------------------------
  const [phase, setPhaseState] = useState<Phase>("boot");
  const [game, setGame] = useState<Game | null>(null);
  const [me, setMeState] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);
  const [joinError, setJoinError] = useState<JoinError | null>(null);
  const [joinBusy, setJoinBusy] = useState(false);

  const [questions, setQuestions] = useState<PreparedQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [status, setStatusState] = useState<QuizStatus>("answering");
  const [selected, setSelected] = useState<number | null>(null);
  const [selectedCorrect, setSelectedCorrect] = useState(false);
  const [points, setPoints] = useState(0);
  const [wasTimeout, setWasTimeout] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(QUESTION_TIME_MS);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);

  const [gameover, setGameover] = useState({
    score: 0,
    correctCount: 0,
    avgSeconds: 0,
    position: 1,
    totalFinished: 0,
  });

  // --------------------------- refs ---------------------------
  const gameRef = useRef<Game | null>(null);
  const meRef = useRef<Player | null>(null);
  const phaseRef = useRef<Phase>("boot");
  const questionsRef = useRef<PreparedQuestion[]>([]);
  const quizIndexRef = useRef(0);
  const statusRef = useRef<QuizStatus>("answering");
  const deadlineRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fireTimeoutRef = useRef<() => void>(() => {});
  const nextQuestionRef = useRef<() => void>(() => {});
  const startQuestionRef = useRef<() => void>(() => {});

  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };
  const setMe = (p: Player | null) => {
    meRef.current = p;
    setMeState(p);
  };
  const setStatus = (s: QuizStatus) => {
    statusRef.current = s;
    setStatusState(s);
  };

  // --------------------------- timer helpers ---------------------------
  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (advanceRef.current) {
      clearTimeout(advanceRef.current);
      advanceRef.current = null;
    }
  }, []);

  const recordAnswer = useCallback(
    (
      q: PreparedQuestion,
      selectedIndex: number | null,
      correct: boolean,
      pts: number,
      responseTimeMs: number,
    ) => {
      const gameId = gameRef.current?.id;
      const p = meRef.current;
      if (!gameId || !p) return;
      void gameApi.answer({
        gameId,
        playerId: p.id,
        playerName: p.name,
        questionId: q.id,
        questionText: q.text,
        selectedIndex,
        correct,
        responseTimeMs,
        points: pts,
      });
    },
    [],
  );

  const finishQuiz = useCallback(async () => {
    const gameId = gameRef.current?.id;
    const p = meRef.current;
    if (!gameId || !p) return;
    try {
      const { player } = await gameApi.finish(gameId, p.id);
      const { players: lb } = await gameApi.leaderboard(gameId);
      const { players: allPlayers } = await gameApi.players(gameId);
      const full = player ?? p;
      const position = lb.findIndex((x) => x.id === full.id) + 1;
      const answered = full.correctCount + full.incorrectCount + full.unansweredCount;
      setLeaderboard(lb);
      setPlayers(allPlayers);
      setMe(full);
      setGameover({
        score: full.totalScore,
        correctCount: full.correctCount,
        avgSeconds: Number(formatAvgSeconds(full.totalResponseTimeMs, Math.max(1, answered))),
        position,
        totalFinished: lb.length,
      });
      setPhase("gameover");
    } catch {
      setPhase("gameover");
    }
  }, []);

  const fireTimeout = useCallback(() => {
    const q = questionsRef.current[quizIndexRef.current];
    if (!q || statusRef.current !== "answering") return;
    setStatus("reveal");
    setSelected(null);
    setSelectedCorrect(false);
    setPoints(0);
    setWasTimeout(true);
    setTimeLeftMs(0);
    setStreak(0);
    recordAnswer(q, null, false, 0, QUESTION_TIME_MS);
    advanceRef.current = setTimeout(() => nextQuestionRef.current(), 1500);
  }, [recordAnswer]);

  const nextQuestion = useCallback(() => {
    if (quizIndexRef.current + 1 >= questionsRef.current.length) {
      void finishQuiz();
    } else {
      quizIndexRef.current += 1;
      setQuizIndex(quizIndexRef.current);
      startQuestionRef.current();
    }
  }, [finishQuiz]);

  const startCurrentQuestion = useCallback(() => {
    clearTimers();
    setSelected(null);
    setSelectedCorrect(false);
    setPoints(0);
    setWasTimeout(false);
    setStatus("answering");
    deadlineRef.current = Date.now() + QUESTION_TIME_MS;
    setTimeLeftMs(QUESTION_TIME_MS);

    timerRef.current = setInterval(() => {
      const remaining = deadlineRef.current - Date.now();
      if (remaining <= 0) {
        clearTimers();
        fireTimeoutRef.current();
      } else {
        setTimeLeftMs(remaining);
      }
    }, 100);
  }, [clearTimers]);

  useEffect(() => {
    fireTimeoutRef.current = fireTimeout;
    nextQuestionRef.current = nextQuestion;
    startQuestionRef.current = startCurrentQuestion;
  }, [fireTimeout, nextQuestion, startCurrentQuestion]);

  const handleSelect = useCallback(
    (optionIndex: number) => {
      if (statusRef.current !== "answering") return;
      const q = questionsRef.current[quizIndexRef.current];
      if (!q) return;
      const left = deadlineRef.current - Date.now();
      const clampLeft = Math.max(0, Math.min(QUESTION_TIME_MS, left));
      const correct = optionIndex === q.correctIndex;
      const pts = correct ? scoreForTimeLeftMs(clampLeft) : 0;
      const responseTimeMs = QUESTION_TIME_MS - clampLeft;

      clearTimers();
      setStatus("reveal");
      setSelected(optionIndex);
      setSelectedCorrect(correct);
      setPoints(pts);
      setWasTimeout(false);
      if (correct) {
        setScore((s) => s + pts);
        setStreak((s) => s + 1);
        burstCorrectBurst();
      } else {
        setStreak(0);
      }
      recordAnswer(q, optionIndex, correct, pts, responseTimeMs);
      advanceRef.current = setTimeout(() => nextQuestion(), 1500);
    },
    [clearTimers, nextQuestion, recordAnswer],
  );

  // --------------------------- quiz bootstrap ---------------------------
  const startFreshQuiz = useCallback(() => {
    const qs = prepareQuestions();
    questionsRef.current = qs;
    quizIndexRef.current = 0;
    setQuestions(qs);
    setQuizIndex(0);
    setScore(0);
    setStreak(0);
    setPhase("quiz");
    startCurrentQuestion();
  }, [startCurrentQuestion]);

  const resumeQuiz = useCallback(async () => {
    const gameId = gameRef.current?.id;
    const p = meRef.current;
    if (!gameId || !p) return;
    try {
      const { answers } = await gameApi.answers(gameId, p.id);
      const answeredIds = new Set(answers.map((a) => a.questionId));
      const qs = prepareRemainingQuestions(answeredIds);
      questionsRef.current = qs;
      quizIndexRef.current = answers.length;
      setQuestions(qs);
      setQuizIndex(answers.length);
      setScore(answers.reduce((s, a) => s + a.points, 0));
      setStreak(0);
      setPhase("quiz");
      startCurrentQuestion();
    } catch {
      startFreshQuiz();
    }
  }, [startCurrentQuestion, startFreshQuiz]);

  // --------------------------- join / leave ---------------------------
  const handleJoin = useCallback(
    async (name: string) => {
      setJoinBusy(true);
      setJoinError(null);
      try {
        const gameId = gameRef.current!.id;
        const result = await gameApi.join(gameId, name);
        if (!result.ok) {
          setJoinError(result.error);
          return;
        }
        setMe(result.player);
        saveStoredPlayer(gameId, result.player.id, result.player.name);
        const { players: list } = await gameApi.players(gameId);
        setPlayers(list);
        if (result.game.status === "playing") {
          await resumeQuiz();
        } else {
          setPhase("lobby");
        }
      } catch {
        setJoinError("server");
      } finally {
        setJoinBusy(false);
      }
    },
    [resumeQuiz],
  );

  const handleLeave = useCallback(() => {
    clearStoredPlayer();
    setMe(null);
    setPhase("welcome");
  }, []);

  const handlePlayAgain = useCallback(() => {
    clearTimers();
    clearStoredPlayer();
    setMe(null);
    setLeaderboard([]);
    setPlayers([]);
    setPhase("welcome");
  }, [clearTimers]);

  // --------------------------- realtime ---------------------------
  const onRealtime = useCallback(
    (event: RealtimeEvent) => {
      if (event.type === "game-changed") {
        setGame(event.game);
        gameRef.current = event.game;
        if (
          event.game.status === "playing" &&
          phaseRef.current === "lobby" &&
          meRef.current &&
          meRef.current.status !== "finished"
        ) {
          startFreshQuiz();
        }
      } else if (event.type === "players-changed") {
        setPlayers(event.players);
      }
    },
    [startFreshQuiz],
  );

  // --------------------------- boot ---------------------------
  useEffect(() => {
    let unsub: (() => void) | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const { game: g } = await gameApi.ensure();
        if (cancelled) return;
        gameRef.current = g;
        setGame(g);
        unsub = subscribeRealtime(g.id, onRealtime);

        const stored = loadStoredPlayer(g.id);
        if (stored) {
          const { player } = await gameApi.my(g.id, stored.playerId);
          if (!cancelled && player) {
            setMe(player);
            saveStoredPlayer(g.id, player.id, player.name);
            const { players: list } = await gameApi.players(g.id);
            if (!cancelled) setPlayers(list);

            if (player.status === "finished") {
              const answered = player.correctCount + player.incorrectCount + player.unansweredCount;
              if (!cancelled) {
                const { players: lb } = await gameApi.leaderboard(g.id);
                setLeaderboard(lb);
                setGameover({
                  score: player.totalScore,
                  correctCount: player.correctCount,
                  avgSeconds: Number(
                    formatAvgSeconds(player.totalResponseTimeMs, Math.max(1, answered)),
                  ),
                  position: lb.findIndex((x) => x.id === player.id) + 1,
                  totalFinished: lb.length,
                });
                setPhase("gameover");
              }
            } else if (g.status === "playing") {
              await resumeQuiz();
            } else {
              setPhase("lobby");
            }
            return;
          }
        }
        if (!cancelled) setPhase("welcome");
      } catch {
        if (!cancelled) setPhase("welcome");
      }
    })();

    return () => {
      cancelled = true;
      clearTimers();
      unsub?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------- render ---------------------------
  const playerCount = players.length;
  const myId = me?.id ?? "";

  return (
    <div className="relative min-h-dvh">
      <Background />
      <AnimatePresence mode="wait">
        {phase === "boot" && (
          <BootScreen key="boot" />
        )}
        {phase === "welcome" && (
          <WelcomeScreen key="welcome" onStart={() => setPhase("join")} />
        )}
        {phase === "join" && (
          <JoinScreen
            key="join"
            busy={joinBusy}
            error={joinError}
            onSubmit={handleJoin}
          />
        )}
        {phase === "lobby" && me && (
          <LobbyScreen
            key="lobby"
            name={me.name}
            count={playerCount}
            maxPlayers={game?.maxPlayers ?? 27}
            onLeave={handleLeave}
          />
        )}
        {phase === "quiz" && questions[quizIndex] && (
          <QuizScreen
            key="quiz"
            quizIndex={quizIndex}
            total={questions.length}
            score={score}
            streak={streak}
            question={questions[quizIndex]}
            timeLeftMs={timeLeftMs}
            status={status}
            selected={selected}
            isCorrect={selectedCorrect}
            points={points}
            wasTimeout={wasTimeout}
            onSelect={handleSelect}
          />
        )}
        {phase === "gameover" && me && (
          <GameOverScreen
            key="gameover"
            name={me.name}
            score={gameover.score}
            correctCount={gameover.correctCount}
            totalQuestions={questions.length || 10}
            avgSeconds={gameover.avgSeconds}
            position={gameover.position}
            totalFinished={gameover.totalFinished}
            onViewLeaderboard={() => setPhase("leaderboard")}
            onPlayAgain={handlePlayAgain}
          />
        )}
        {phase === "leaderboard" && (
          <LeaderboardScreen
            key="leaderboard"
            players={leaderboard}
            meId={myId}
            onPlayAgain={handlePlayAgain}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function BootScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="anim-pulse-glow flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/30 text-2xl">
          🧬
        </div>
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-white/50">
          Loading…
        </p>
      </div>
    </div>
  );
}