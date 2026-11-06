"use client";

import { use, useEffect, useRef, useState } from "react";

import { CountdownTimer } from "@/components/game/CountdownTimer";
import { GameShell, LoadingScreen, MessageScreen } from "@/components/game/GameShell";
import { QuestCard } from "@/components/game/QuestCard";
import { QuestMap } from "@/components/game/QuestMap";
import { Confetti, CorrectPanel, MajorityPanel, VoteBars } from "@/components/game/Results";
import { ENEMIES, HERO, Sprite, TROPHY } from "@/components/pixel/Sprite";
import { LiveDot, Panel, PixelButton, PixelHeading, Tag } from "@/components/pixel/ui";
import { useCountdown } from "@/hooks/useCountdown";
import { useRoom } from "@/hooks/useRoom";
import { api, ApiClientError } from "@/lib/api";
import { getQuest } from "@/lib/quests";
import { normalizeRoomCode } from "@/lib/room-mapper";
import {
  loadPlayerSession,
  randomHeroName,
  savePlayerSession,
  type PlayerSession,
} from "@/lib/storage";
import type { Answer, RoomState } from "@/lib/types";

export function PlayScreen({ params }: { params: Promise<{ code: string }> }) {
  const code = normalizeRoomCode(use(params).code);
  const { room, error, live, clockOffset, applyResponse } = useRoom(code);
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [joinError, setJoinError] = useState<ApiClientError | null>(null);
  const [myVotes, setMyVotes] = useState<Record<number, Answer>>({});
  const joinStarted = useRef(false);

  useEffect(() => {
    if (joinStarted.current) return;
    joinStarted.current = true;

    (async () => {
      const stored = loadPlayerSession(code);
      const sentAt = Date.now();
      try {
        const res = await api.join(code, stored);
        const next: PlayerSession = {
          playerId: res.playerId,
          playerToken: res.playerToken,
          heroName: stored?.playerId === res.playerId && stored.heroName ? stored.heroName : randomHeroName(),
        };
        savePlayerSession(code, next);
        applyResponse(res, sentAt);
        setSession(next);
        const me = await api.me(code, next);
        setMyVotes(me.votes);
      } catch (err) {
        setJoinError(err instanceof ApiClientError ? err : new ApiClientError(0, "unknown", "Could not join."));
      }
    })();
  }, [code, applyResponse]);

  const fatal = joinError ?? (error && !room ? error : null);
  if (fatal) {
    const title =
      fatal.code === "room_finished"
        ? "Adventure over"
        : fatal.code === "room_not_found"
          ? "Room not found"
          : fatal.code === "not_configured"
            ? "Setup needed"
            : "Could not join";
    return <MessageScreen title={title} message={fatal.message} />;
  }
  if (!room || !session) return <LoadingScreen label="Joining the party" />;

  return (
    <PlayerView
      room={room}
      session={session}
      live={live}
      clockOffset={clockOffset}
      myVotes={myVotes}
      onVoted={(questIndex, answer) => setMyVotes((v) => ({ ...v, [questIndex]: answer }))}
      applyResponse={applyResponse}
    />
  );
}

function PlayerView({
  room,
  session,
  live,
  clockOffset,
  myVotes,
  onVoted,
  applyResponse,
}: {
  room: RoomState;
  session: PlayerSession;
  live: ReturnType<typeof useRoom>["live"];
  clockOffset: number;
  myVotes: Record<number, Answer>;
  onVoted: (questIndex: number, answer: Answer) => void;
  applyResponse: ReturnType<typeof useRoom>["applyResponse"];
}) {
  const quest = getQuest(room.questIndex);
  const theme = room.status === "lobby" ? "lobby" : room.status === "finished" ? "victory" : quest.theme;
  const score = room.history.filter((r) => myVotes[r.questIndex] === r.correct).length;

  return (
    <GameShell theme={theme}>
      <header className="border-b-4 border-ink bg-night/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <span className="flex items-center gap-2">
            <Sprite art={HERO} scale={2} />
            <span className="font-pixel text-[0.6rem] text-gold">{session.heroName}</span>
          </span>
          <span className="flex items-center gap-3">
            <span className="font-pixel text-[0.6rem] text-lime">XP {score * 100}</span>
            <LiveDot live={live} />
          </span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-5">
        {room.status === "lobby" && <WaitingRoom room={room} heroName={session.heroName} />}

        {(room.status === "quest" || room.status === "voting") && (
          <VotePanel
            key={room.questIndex}
            room={room}
            session={session}
            clockOffset={clockOffset}
            myVote={myVotes[room.questIndex] ?? null}
            onVoted={onVoted}
            applyResponse={applyResponse}
          />
        )}

        {room.status === "revealed" && room.results && (
          <PlayerReveal room={room} myVote={myVotes[room.questIndex] ?? null} />
        )}

        {room.status === "finished" && <PlayerFinale room={room} myVotes={myVotes} score={score} heroName={session.heroName} />}

        {room.status !== "finished" && (
          <Panel className="mt-auto px-2 pb-2 pt-0">
            <QuestMap questIndex={room.questIndex} status={room.status} showNames={false} compact />
          </Panel>
        )}
      </div>
    </GameShell>
  );
}

function WaitingRoom({ room, heroName }: { room: RoomState; heroName: string }) {
  return (
    <Panel className="flex flex-col items-center gap-5 p-6 text-center">
      <Tag color="grass">You&apos;re in!</Tag>
      <Sprite art={HERO} scale={7} className="animate-bob" />
      <PixelHeading className="text-base text-gold">Welcome, {heroName}</PixelHeading>
      <p className="text-2xl">
        Waiting for the host to begin the Session 1 recap
        <span className="animate-blink">...</span>
      </p>
      <p className="text-xl text-mist">
        Room <span className="font-pixel text-sm text-snow">{room.code}</span> &middot; {room.playerCount}{" "}
        {room.playerCount === 1 ? "hero" : "heroes"} in the party
      </p>
      <p className="text-lg text-mist">Your answers are anonymous. Keep this page open.</p>
    </Panel>
  );
}

function VotePanel({
  room,
  session,
  clockOffset,
  myVote,
  onVoted,
  applyResponse,
}: {
  room: RoomState;
  session: PlayerSession;
  clockOffset: number;
  myVote: Answer | null;
  onVoted: (questIndex: number, answer: Answer) => void;
  applyResponse: ReturnType<typeof useRoom>["applyResponse"];
}) {
  const quest = getQuest(room.questIndex);
  const remaining = useCountdown(room.status === "voting" ? room.timerEndsAt : null, clockOffset);
  const [selected, setSelected] = useState<Answer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  const open = room.status === "voting" && remaining !== null && remaining > 0;
  const timeUp = room.status === "voting" && remaining !== null && remaining <= 0;

  async function submit() {
    if (!selected) return;
    setSubmitting(true);
    setVoteError(null);
    const sentAt = Date.now();
    try {
      const res = await api.vote(room.code, session, room.questIndex, selected);
      applyResponse(res, sentAt);
      onVoted(room.questIndex, res.answer);
    } catch (err) {
      setVoteError(err instanceof ApiClientError ? err.message : "Could not submit your answer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {room.status === "voting" && (
        <Panel className="p-4">
          <CountdownTimer remainingMs={remaining} totalSeconds={room.timerSeconds} />
        </Panel>
      )}

      <QuestCard quest={quest} total={room.questCount} showStatement={room.status !== "quest"} />

      {myVote ? (
        <Panel variant="gold" className="animate-pop flex flex-col items-center gap-3 p-6 text-center" role="status">
          <span className="font-pixel text-sm">Answer locked in!</span>
          <span className={`font-pixel text-3xl ${myVote === "myth" ? "text-ruby" : "text-teal"}`} style={{ textShadow: "3px 3px 0 #0d0e17" }}>
            {myVote.toUpperCase()}
          </span>
          <p className="text-2xl text-ink">Your answer was submitted. Wait for the host to reveal the truth.</p>
          <p className="text-xl text-ink/70">
            {room.submittedCount} / {room.playerCount} heroes have answered
          </p>
        </Panel>
      ) : room.status === "quest" ? (
        <Panel className="flex flex-col items-center gap-3 p-5 text-center" role="status">
          <Sprite art={ENEMIES[quest.index % ENEMIES.length]} scale={4} className="animate-float" />
          <p className="text-2xl">
            Get ready! The host will start the countdown
            <span className="animate-blink">...</span>
          </p>
        </Panel>
      ) : timeUp ? (
        <Panel className="flex flex-col items-center gap-3 p-5 text-center" role="status">
          <span className="font-pixel text-sm text-ruby">Time&apos;s Up!</span>
          <p className="text-2xl">You didn&apos;t submit an answer this round. Wait for the reveal.</p>
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4" role="radiogroup" aria-label="Your answer">
            {(["myth", "fact"] as const).map((answer) => {
              const chosen = selected === answer;
              return (
                <PixelButton
                  key={answer}
                  role="radio"
                  aria-checked={chosen}
                  variant={answer}
                  size="xl"
                  disabled={!open || submitting}
                  onClick={() => setSelected(answer)}
                  className={`!py-10 ${chosen ? "outline-4 outline-offset-8 outline-gold" : selected ? "opacity-60" : ""}`}
                >
                  {chosen && <span aria-hidden>&#9654;</span>}
                  {answer}
                </PixelButton>
              );
            })}
          </div>
          <PixelButton size="lg" disabled={!selected || !open || submitting} onClick={submit}>
            {submitting ? "Sending..." : selected ? `Submit ${selected}` : "Pick myth or fact"}
          </PixelButton>
          {voteError && (
            <p role="alert" className="text-center text-xl text-ember">
              {voteError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function PlayerReveal({ room, myVote }: { room: RoomState; myVote: Answer | null }) {
  const result = room.results!;
  const correct = myVote === result.correct;

  return (
    <div className="flex flex-col gap-5">
      {correct && <Confetti key={result.revealedAt} pieces={30} />}
      <Panel variant="gold" className="flex flex-col items-center gap-3 p-6 text-center">
        <CorrectPanel result={result} />
        <p className="text-2xl text-ink">
          {myVote === null ? (
            "You didn't answer this one."
          ) : correct ? (
            <>
              You chose {myVote.toUpperCase()} - <strong>correct! +100 XP</strong>
            </>
          ) : (
            <>You chose {myVote.toUpperCase()} - not quite this time.</>
          )}
        </p>
      </Panel>
      <Panel className="p-5">
        <p className="text-2xl leading-tight">{result.explanation}</p>
      </Panel>
      <Panel className="flex flex-col gap-5 p-5">
        <MajorityPanel result={result} />
        <VoteBars result={result} />
      </Panel>
      <p className="text-center text-xl text-mist pixel-text-shadow">Waiting for the host to continue the journey...</p>
    </div>
  );
}

function PlayerFinale({
  room,
  myVotes,
  score,
  heroName,
}: {
  room: RoomState;
  myVotes: Record<number, Answer>;
  score: number;
  heroName: string;
}) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <Confetti pieces={50} />
      <Sprite art={TROPHY} scale={6} className="animate-float" title="Trophy" />
      <PixelHeading as="h1" className="text-2xl text-gold">
        Recap complete!
      </PixelHeading>
      <Panel className="flex w-full flex-col items-center gap-2 p-6">
        <span className="font-pixel text-xs uppercase text-mist">{heroName}&apos;s score</span>
        <span className="font-pixel text-5xl text-lime pixel-text-shadow">
          {score} / {room.questCount}
        </span>
        <span className="text-2xl">
          {score === room.questCount ? "Legendary! A true Playwright master." : score >= 3 ? "Well fought, hero!" : "Every hero starts somewhere. Keep questing!"}
        </span>
      </Panel>
      <Panel className="w-full p-4">
        <ol className="flex flex-col divide-y-4 divide-ink text-left">
          {room.history.map((r) => {
            const mine = myVotes[r.questIndex];
            return (
              <li key={r.questIndex} className="flex items-center justify-between gap-3 py-3">
                <span className="font-pixel text-[0.6rem]">{getQuest(r.questIndex).name}</span>
                <Tag color={mine === undefined ? "stone" : mine === r.correct ? "grass" : "ruby"}>
                  {mine === undefined ? "Skipped" : mine === r.correct ? "Correct" : "Missed"}
                </Tag>
              </li>
            );
          })}
        </ol>
      </Panel>
      <p className="text-xl text-mist">Session 1 recap complete. See you in Session 2!</p>
    </div>
  );
}
