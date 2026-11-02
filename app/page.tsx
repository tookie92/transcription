"use client";

import { ClerkLoaded, SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

function SessionClock() {
  const [stamp, setStamp] = useState("--:--:--Z");

  useEffect(() => {
    const tick = () => {
      setStamp(`${new Date().toISOString().slice(11, 19)}Z`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <time
      dateTime={stamp}
      className="font-mono text-xs tracking-widest text-muted-foreground tabular-nums"
    >
      {stamp}
    </time>
  );
}

function RecMark() {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.22em] uppercase text-foreground">
      <span
        className="kit-rec size-2 rounded-full bg-myGreen"
        aria-hidden="true"
      />
      Rec
    </span>
  );
}

function FieldDeck() {
  return (
    <aside
      className="relative border border-border bg-card p-5 md:p-6"
      aria-label="Sample interview deck"
    >
      <div className="mb-5 flex items-center justify-between gap-4 border-b border-border pb-4">
        <RecMark />
        <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
          Cassette · 00:47:12
        </span>
      </div>

      <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase mb-3">
        P1 · 00:12:41
      </p>
      <p
        className="text-xl md:text-2xl leading-snug text-foreground mb-8"
        style={{ fontFamily: "var(--font-display), sans-serif" }}
      >
        I kept looking for the export and it just wasn&apos;t there. We lost a
        week of notes in a folder nobody owned.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="border border-border bg-background p-3 rotate-[-1.5deg]">
          <p className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground mb-2">
            Slip · pain
          </p>
          <p className="text-sm leading-relaxed">Export path is missing</p>
        </div>
        <div className="border border-primary bg-primary/15 p-3 rotate-[1.2deg]">
          <p className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground mb-2">
            Slip · quote
          </p>
          <p className="text-sm leading-relaxed">A folder nobody owned</p>
        </div>
      </div>

      <p className="mt-6 font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
        On the wall · 14 slips · 3 packets
      </p>
    </aside>
  );
}

export default function Home() {
  const router = useRouter();
  const { isSignedIn } = useAuth();

  return (
    <div className="min-h-dvh bg-background text-foreground kit-grain kit-mat">
      <header className="sticky top-0 z-50 border-b border-border bg-background px-5 lg:px-12">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-5 min-w-0">
            <Image
              height={44}
              width={132}
              src="/logo.svg"
              alt="Skripta"
              className="h-9 w-auto"
              priority
            />
            <span className="hidden sm:inline font-mono text-[11px] tracking-[0.18em] uppercase text-muted-foreground truncate">
              Field kit · interview research
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <SessionClock />
            <ClerkLoaded>
              {isSignedIn ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/project")}
                    className="font-mono text-xs tracking-widest uppercase"
                  >
                    Sessions
                  </Button>
                  <UserButton />
                </>
              ) : (
                <>
                  <SignInButton mode="redirect">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="font-mono text-xs tracking-widest uppercase"
                    >
                      Sign in
                    </Button>
                  </SignInButton>
                  <SignUpButton mode="redirect" forceRedirectUrl="/project?new=1">
                    <Button
                      size="sm"
                      className="font-mono text-xs tracking-widest uppercase h-9 px-4"
                    >
                      Open a session
                    </Button>
                  </SignUpButton>
                </>
              )}
            </ClerkLoaded>
          </div>
        </div>
      </header>

      <section className="px-5 lg:px-12 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="mx-auto grid w-full max-w-[1400px] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-12 lg:gap-16 items-end">
          <div>
            <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground mb-6">
              Unit 01 · qualitative research · live
            </p>
            <h1
              className="text-5xl sm:text-6xl lg:text-7xl xl:text-[5.25rem] font-semibold leading-[0.95] tracking-tight text-foreground mb-8"
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              Record the sitting.
              <br />
              Pin the line.
              <br />
              Map the wall.
            </h1>
            <p className="text-lg md:text-xl leading-relaxed text-muted-foreground max-w-xl mb-10">
              Tape in, slips out: Quote, Pain, Follow-up. Packet them on a shared
              wall, run a Round, cast a face, publish the Issue — one study, not a
              research-ops stack.
            </p>
            <ClerkLoaded>
              {isSignedIn ? (
                <Button
                  size="lg"
                  onClick={() => router.push("/project")}
                  className="h-12 px-6 font-mono text-xs tracking-widest uppercase"
                >
                  Go to sessions
                </Button>
              ) : (
                <SignUpButton mode="redirect" forceRedirectUrl="/project?new=1">
                  <Button
                    size="lg"
                    className="h-12 px-6 font-mono text-xs tracking-widest uppercase"
                  >
                    Open a session
                  </Button>
                </SignUpButton>
              )}
            </ClerkLoaded>
          </div>
          <FieldDeck />
        </div>
      </section>

      <section className="border-t border-border px-5 lg:px-12 py-16 lg:py-20">
        <div className="mx-auto w-full max-w-[1400px]">
          <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground mb-10">
            In the kit
          </p>
          <ol className="grid sm:grid-cols-2 gap-x-12 gap-y-10">
            {[
              {
                n: "01",
                t: "Cassette",
                d: "Upload a file or capture the room. Speakers land on the tape — click a line only while it plays.",
              },
              {
                n: "02",
                t: "Pins",
                d: "Drag a line into Quote, Pain, or Follow-up (Q / P / F). The slip hits the tray, ready for the wall.",
              },
              {
                n: "03",
                t: "Packets",
                d: "Group slips into field-kit packets. Peek the cassette in place — the wall never sends you away.",
              },
              {
                n: "04",
                t: "Workshop",
                d: "Call a Round, Stick, Flip. Drop a Cast. Publish the Issue as a frozen brief — Export is .md.",
              },
            ].map((item) => (
              <li key={item.n} className="grid grid-cols-[4.5rem_1fr] gap-4">
                <span className="font-mono text-sm tracking-widest text-muted-foreground pt-1">
                  {item.n}
                </span>
                <div>
                  <h2
                    className="text-2xl font-semibold mb-2"
                    style={{ fontFamily: "var(--font-display), sans-serif" }}
                  >
                    {item.t}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">{item.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-border px-5 lg:px-12 py-16 lg:py-20">
        <div className="mx-auto w-full max-w-[1400px]">
          <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground mb-10">
            Session log
          </p>
          <ol className="divide-y divide-border border-y border-border">
            {[
              {
                t: "T+00:00",
                title: "Load the tape",
                d: "Drop MP4, MP3, WAV — or record in the browser.",
              },
              {
                t: "T+00:04",
                title: "Pin the sitting",
                d: "Transcript lands with speakers. Drag a line: Quote, Pain, Follow-up.",
              },
              {
                t: "T+00:12",
                title: "Packet the wall",
                d: "Slips fill the tray. The crew builds packets together — Notes and Find stay on the dock.",
              },
              {
                t: "T+00:25",
                title: "Round · Stick · Flip",
                d: "Stickers on packets. Flip reveals priorities. Cast if you need a face. Issue freezes the brief.",
              },
            ].map((row) => (
              <li
                key={row.t}
                className="grid sm:grid-cols-[8rem_1fr] gap-3 sm:gap-8 py-6"
              >
                <span className="font-mono text-sm tracking-widest text-foreground inline-flex items-center gap-2">
                  <span className="size-1.5 bg-primary shrink-0" aria-hidden="true" />
                  {row.t}
                </span>
                <div>
                  <h2
                    className="text-xl font-semibold mb-1"
                    style={{ fontFamily: "var(--font-display), sans-serif" }}
                  >
                    {row.title}
                  </h2>
                  <p className="text-muted-foreground">{row.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-border px-5 lg:px-12 py-16 lg:py-20">
        <div className="mx-auto w-full max-w-[1400px]">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
            <div>
              <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-muted-foreground mb-3">
                Tariff
              </p>
              <h2
                className="text-4xl md:text-5xl font-semibold tracking-tight"
                style={{ fontFamily: "var(--font-display), sans-serif" }}
              >
                Pay for the tape, not the theatre.
              </h2>
            </div>
            <p className="text-muted-foreground max-w-sm">
              Credits cover the tape, sort tray, and Cast. No card to open a
              session.
            </p>
          </div>

          <div className="overflow-x-auto border border-border">
            <table className="w-full min-w-[640px] text-left">
              <caption className="sr-only">Skripta plans and included credits</caption>
              <thead className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Rate</th>
                  <th className="px-4 py-3 font-medium">Credits / mo</th>
                  <th className="px-4 py-3 font-medium">On the bench</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-5 font-semibold">Student</td>
                  <td className="px-4 py-5 font-mono">€0</td>
                  <td className="px-4 py-5 font-mono">150</td>
                  <td className="px-4 py-5 text-muted-foreground text-sm">
                    3 sessions · packets · Round
                  </td>
                  <td className="px-4 py-5">
                    <ClerkLoaded>
                      {isSignedIn ? (
                        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                          Current
                        </span>
                      ) : (
                        <SignUpButton mode="redirect" forceRedirectUrl="/project?new=1">
                          <Button variant="outline" size="sm" className="font-mono text-xs uppercase tracking-widest">
                            Load
                          </Button>
                        </SignUpButton>
                      )}
                    </ClerkLoaded>
                  </td>
                </tr>
                <tr className="bg-primary/10">
                  <td className="px-4 py-5 font-semibold">Field</td>
                  <td className="px-4 py-5 font-mono">€19 / mo</td>
                  <td className="px-4 py-5 font-mono">500</td>
                  <td className="px-4 py-5 text-muted-foreground text-sm">
                    Unlimited sessions · team · Issue export
                  </td>
                  <td className="px-4 py-5">
                    <ClerkLoaded>
                      {isSignedIn ? (
                        <Button
                          size="sm"
                          className="font-mono text-xs uppercase tracking-widest"
                        >
                          Upgrade
                        </Button>
                      ) : (
                        <SignUpButton mode="redirect" forceRedirectUrl="/project?new=1">
                          <Button
                            size="sm"
                            className="font-mono text-xs uppercase tracking-widest"
                          >
                            Load
                          </Button>
                        </SignUpButton>
                      )}
                    </ClerkLoaded>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-5 font-semibold">Crew</td>
                  <td className="px-4 py-5 font-mono">€35 / seat</td>
                  <td className="px-4 py-5 font-mono">Open</td>
                  <td className="px-4 py-5 text-muted-foreground text-sm">
                    API · branding · named support
                  </td>
                  <td className="px-4 py-5">
                    <ClerkLoaded>
                      {isSignedIn ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="font-mono text-xs uppercase tracking-widest"
                        >
                          Sales
                        </Button>
                      ) : (
                        <SignUpButton mode="redirect" forceRedirectUrl="/project?new=1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="font-mono text-xs uppercase tracking-widest"
                          >
                            Load
                          </Button>
                        </SignUpButton>
                      )}
                    </ClerkLoaded>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <dl className="mt-8 grid sm:grid-cols-3 gap-6 font-mono text-sm">
            <div>
              <dt className="text-muted-foreground tracking-widest uppercase text-[11px] mb-1">
                Transcript
              </dt>
              <dd>20 credits / file</dd>
            </div>
            <div>
              <dt className="text-muted-foreground tracking-widest uppercase text-[11px] mb-1">
                Sort tray
              </dt>
              <dd>10 credits / run</dd>
            </div>
            <div>
              <dt className="text-muted-foreground tracking-widest uppercase text-[11px] mb-1">
                Cast
              </dt>
              <dd>15 credits / face</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="border-t border-border px-5 lg:px-12 py-20 lg:py-24">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col md:flex-row md:items-end md:justify-between gap-8">
          <h2
            className="text-4xl md:text-6xl font-semibold tracking-tight max-w-2xl"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            Take the kit into the next sitting.
          </h2>
          <ClerkLoaded>
            {isSignedIn ? (
              <Button
                size="lg"
                onClick={() => router.push("/project")}
                className="h-12 px-6 font-mono text-xs tracking-widest uppercase self-start"
              >
                Go to sessions
              </Button>
            ) : (
              <SignUpButton mode="redirect" forceRedirectUrl="/project?new=1">
                <Button
                  size="lg"
                  className="h-12 px-6 font-mono text-xs tracking-widest uppercase self-start"
                >
                  Open a session
                </Button>
              </SignUpButton>
            )}
          </ClerkLoaded>
        </div>
      </section>

      <footer className="border-t border-border px-5 lg:px-12 py-8">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="font-mono text-xs tracking-widest uppercase text-muted-foreground">
            Skripta · {new Date().getFullYear()} · field unit
          </p>
          <p className="font-mono text-xs tracking-widest uppercase text-muted-foreground">
            Pin · packet · Issue
          </p>
        </div>
      </footer>
    </div>
  );
}
