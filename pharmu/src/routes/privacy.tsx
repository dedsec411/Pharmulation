import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, Clause } from "@/components/LegalPage";
import { SITE_NAME, canonical } from "@/lib/site";

/**
 * What we actually hold, written from the schema rather than from a template.
 *
 * Every claim here was checked against the tables the app really writes to. A
 * policy that describes a generic product is worse than none: it tells a
 * reader nothing true and it tells a regulator we did not look.
 */
export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: `Privacy - ${SITE_NAME}` },
      {
        name: "description",
        content: "What Pharmulation collects, where it is stored, who can see your results, and how prescription photographs are handled.",
      },
    ],
    links: [{ rel: "canonical", href: canonical("/privacy") }],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <LegalPage title="Privacy" updated="11 September 2026">
      <p>
        Pharmulation is a pharmacy training simulator. This page says what it holds about
        you, where that sits, and who else can see it. It describes what the software
        actually does, not what a template says a website usually does.
      </p>

      <Clause heading="What you give us">
        <p>
          When you create an account we store your <strong>email address</strong> and the{" "}
          <strong>name you choose to display</strong>. If you sign in with Google we receive
          the same two things from Google, plus your profile picture. We never see or store
          your password - authentication is handled by Supabase.
        </p>
      </Clause>

      <Clause heading="What the app records as you use it">
        <p>
          Training only works if it remembers how you did, so every completed case writes a
          row: which mode it was, the score, how long it took, how many errors were made and{" "}
          <strong>what kind of error each one was</strong> - a dose miscalculation, a missed
          interaction, a labelling slip. That last part is what builds your weakness map.
        </p>
        <p>
          Your profile also carries the totals derived from those rows: XP, level, streak,
          accuracy rate, cases completed, average time per case, and CPD hours recorded.
        </p>
      </Clause>

      <Clause heading="Who else can see it">
        <p>
          <strong>The leaderboard is public to signed-in users.</strong> Your display name,
          level and XP appear on it. Your individual case results, your errors and your
          weakness map do not.
        </p>
        <p>
          <strong>An educator can see the results of students in their own classes.</strong>{" "}
          If you join a class with a join code, the teacher who owns that class can see your
          scores, your accuracy and your weakness map, and can set you assessments. They
          cannot see results from any learner who is not in one of their classes, and no
          other learner can see yours. This is enforced by database policies rather than by
          the interface, so it holds no matter how the app is called.
        </p>
      </Clause>

      <Clause heading="Prescription photographs">
        <p>
          The Prescription Lens reads a photograph of a real document and builds a practice
          case from it. This is the most sensitive thing the app does, so it is worth being
          exact about:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            The image is sent to <strong>PrescriptoAI</strong>, a specialist prescription
            reading service, for the length of that one request.
          </li>
          <li>
            <strong>The image is never stored.</strong> Not on our servers, not in a storage
            bucket, not in a log. It is held in memory for the call and discarded.
          </li>
          <li>
            <strong>A real patient name is discarded the moment it is read</strong>, before
            anything is displayed or saved. The case you end up playing carries an invented
            name. There is no record anywhere linking the case back to the document.
          </li>
          <li>
            Only if you choose to contribute a scanned case to the shared pool is anything
            kept - and what is kept is the anonymised case, never the photograph.
          </li>
        </ul>
        <p>
          Please still use your judgement about whose prescription you photograph, and get
          their permission.
        </p>
      </Clause>

      <Clause heading="Other services we send data to">
        <p>
          <strong>Supabase</strong> hosts the database and handles sign-in. Everything above
          lives there.
        </p>
        <p>
          <strong>Google (Gemini)</strong> receives the text of your questions to the in-app
          mentor, your answers during a viva, and the figures behind your weekly report, in
          order to generate a reply. It does not receive your email address.
        </p>
        <p>
          <strong>Vercel</strong> serves the site and records anonymous, aggregate page
          traffic. It does not use cookies for this and does not build a profile of you.
        </p>
      </Clause>

      <Clause heading="Cookies">
        <p>
          Pharmulation sets one kind of cookie: the one that keeps you signed in. It is
          required for the app to work at all and is not used for advertising or tracking.
          We do not use third-party advertising or analytics cookies, which is why you are
          not being asked to dismiss a consent banner.
        </p>
      </Clause>

      <Clause heading="Deleting your account">
        <p>
          You can ask for your account and everything attached to it to be deleted. Email{" "}
          <a className="text-primary underline underline-offset-4" href="mailto:wasiqahmed411@gmail.com">
            wasiqahmed411@gmail.com
          </a>{" "}
          from the address you signed up with and it will be removed, including your scores
          and your profile. Anonymised, aggregated counts that cannot be traced back to you
          may remain.
        </p>
      </Clause>

      <Clause heading="Contact">
        <p>
          Questions about any of this go to{" "}
          <a className="text-primary underline underline-offset-4" href="mailto:wasiqahmed411@gmail.com">
            wasiqahmed411@gmail.com
          </a>.
        </p>
      </Clause>
    </LegalPage>
  );
}
