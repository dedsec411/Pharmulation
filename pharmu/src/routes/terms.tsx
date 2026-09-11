import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, Clause } from "@/components/LegalPage";
import { SITE_NAME, canonical } from "@/lib/site";

/**
 * Acceptable use, and the one disclaimer that actually matters here.
 *
 * A training simulator that teaches dispensing has to say plainly that it is
 * not a clinical reference, because the failure mode is somebody acting on a
 * dose they saw in a game. That clause is the reason this page exists; the
 * rest is ordinary.
 */
export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: `Terms of Use - ${SITE_NAME}` },
      {
        name: "description",
        content: "The terms for using Pharmulation: what the simulator is for, what it is not, acceptable use, and how accounts and CPD records work.",
      },
    ],
    links: [{ rel: "canonical", href: canonical("/terms") }],
  }),
  component: Terms,
});

function Terms() {
  return (
    <LegalPage title="Terms of Use" updated="11 September 2026">
      <p>
        By using Pharmulation you agree to what follows. It is short because there is not
        much to it: this is an educational simulator, it is free to use, and the important
        part is the first clause.
      </p>

      <Clause heading="This is a simulator, not a clinical reference">
        <p>
          <strong>
            Nothing in Pharmulation may be used to make a decision about a real patient.
          </strong>{" "}
          Doses, interactions, counselling points and label instructions here exist to be
          practised against and to be got wrong safely. They are drawn from real sources and
          reviewed, but they are not maintained as a clinical reference and they are not a
          substitute for the formulary, the product literature, or a qualified colleague.
        </p>
        <p>
          Some cases are deliberately wrong. Catching the error is the exercise. Treating
          the contents as guidance defeats the purpose and is unsafe.
        </p>
      </Clause>

      <Clause heading="Who it is for">
        <p>
          Pharmacy students, pharmacy technicians, practising pharmacists, and the educators
          who teach them. You need to be 16 or over to hold an account.
        </p>
      </Clause>

      <Clause heading="Your account">
        <p>
          Keep your sign-in to yourself and give an email address you actually control. You
          are responsible for what happens under your account. One account per person -
          scores, streaks and leaderboard positions mean nothing otherwise.
        </p>
      </Clause>

      <Clause heading="Acceptable use">
        <p>Do not:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Upload a photograph of a real prescription belonging to somebody who has not
            agreed to it.
          </li>
          <li>
            Attempt to manipulate scores, XP, streaks or leaderboard standing by any means
            other than playing.
          </li>
          <li>
            Scrape, bulk-download or republish the medicine catalogue or the case library.
          </li>
          <li>
            Probe, overload or attempt to reach data belonging to another learner or class.
          </li>
          <li>Use the in-app mentor to seek advice about a real patient.</li>
        </ul>
        <p>
          Accounts doing any of this can be suspended without notice.
        </p>
      </Clause>

      <Clause heading="CPD records">
        <p>
          Pharmulation records the time you spend training and can produce a certificate
          summarising it.{" "}
          <strong>
            That record is evidence of practice on this platform. It is not accreditation by
            any pharmacy council or regulator, and is not automatically recognised toward a
            registration requirement.
          </strong>{" "}
          Whether your regulator accepts self-directed learning of this kind is for you to
          check against their rules.
        </p>
      </Clause>

      <Clause heading="Content you contribute">
        <p>
          If you contribute a scanned case to the shared pool, you are confirming you had
          the right to use that document and you allow the anonymised case to be played by
          other learners. You keep nothing in it that identifies a patient, because the app
          removes that before you ever see it.
        </p>
      </Clause>

      <Clause heading="Availability">
        <p>
          This is a free platform under active development. It may be unavailable, may lose
          features, and may change without notice. Please do not make it the only place your
          CPD evidence exists.
        </p>
      </Clause>

      <Clause heading="Contact">
        <p>
          Questions go to{" "}
          <a className="text-primary underline underline-offset-4" href="mailto:wasiqahmed411@gmail.com">
            wasiqahmed411@gmail.com
          </a>.
        </p>
      </Clause>
    </LegalPage>
  );
}
