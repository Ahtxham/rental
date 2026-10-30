import type { Metadata } from "next";

import { Lead, LegalPage, PUBLISHER_CONTACT, TextLink, type LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  alternates: { canonical: "/terms" },
  title: { absolute: "Terms and conditions · Musafir Fleet" },
  description:
    "The terms for using the Musafir Fleet app and web portal (formerly InvoDrive): accounts, tracking, acceptable use, the figures, fees, ending use, liability and the law that applies.",
};

/**
 * The terms for Musafir Fleet, the fleet and driver app. Not the terms for
 * renting a car from Musafir, which are `/policies`.
 *
 * Written in the same plain voice as `/policies`, because a driver reading
 * this on a phone between shifts is the reader it has to work for. Two lines
 * hold the rest together: the fleet, not InvoSquare, decides what is tracked
 * and answers to its drivers for it, and the figures are only as right as
 * what was entered. Nothing here may read as cover of any kind; the service is
 * not insurance and the fleet's vehicles are not insured through it.
 */
const SECTIONS: LegalSection[] = [
  {
    id: "who",
    title: "Who it is for",
    blocks: [
      {
        kind: "text",
        body: "Musafir Fleet is a tool for businesses that run vehicles with drivers, and for those drivers. A fleet uses it to manage its vehicles, drivers, shifts, cash and maintenance. A driver uses it to start and finish shifts and record what happened during them.",
      },
      {
        kind: "text",
        body: "It is for people aged 18 or over, using it for work.",
      },
      {
        kind: "text",
        body: (
          <>
            A passenger who sends a complaint from the QR sticker in a vehicle does not need an account.
            Sending one passes the message, any photographs and the contact details given to the fleet that
            runs the vehicle, as the <TextLink href="/policy">privacy policy</TextLink> describes.
          </>
        ),
      },
    ],
  },
  {
    id: "accounts",
    title: "Accounts",
    blocks: [
      {
        kind: "points",
        items: [
          "A fleet's account is set up by InvoSquare for a named business. Its administrators can add other administrators and drivers.",
          "An administrator who adds a driver is responsible for having that person's agreement, for the details entered about them being accurate, and for removing the driver when they stop working for the fleet.",
          "A password an administrator sets for a new driver is only for handing over the account. The driver must replace it with their own at first sign-in.",
          "Keep your password to yourself. You are responsible for what is done with your account, so tell your administrator or us straight away if you think somebody else has used it.",
        ],
      },
    ],
  },
  {
    id: "tracking",
    title: "Tracking is the fleet's decision",
    blocks: [
      {
        kind: "points",
        items: [
          "The fleet, not InvoSquare, decides whether to record its drivers' locations, and whether to fit trackers to its vehicles.",
          "A fleet that does either is responsible for having a lawful basis for collecting its drivers' personal data and location, and for telling its drivers, clearly and before it starts, what is recorded and why.",
          "The app asks each driver for consent before it records their location on shift, and a driver can withdraw it. A fleet that requires tracking before a particular driver can start a shift is responsible for that arrangement with the driver. The app only keeps the rule the fleet sets.",
          "A tracker fitted to a vehicle reports whenever the vehicle moves, including outside shifts. A fleet that fits one is responsible for telling every driver of that vehicle.",
          "The fleet is responsible for the details it enters about other people, including a driver's emergency contact.",
        ],
      },
    ],
  },
  {
    id: "use",
    title: "Acceptable use",
    blocks: [
      {
        kind: "points",
        items: [
          "Use Musafir Fleet only to run your own fleet's vehicles and drivers.",
          "Do not use it to watch anybody who has not been told they are tracked.",
          "Do not enter information you know to be false, or upload anything that is not yours to upload.",
          "Do not try to reach another fleet's data, get around the limits of your account, or interfere with the service or its security.",
          "Do not copy, resell or rebuild the service, or reach it by any automated means other than the app and the portal.",
          "The complaint page is for passengers with something to report. Do not use it to harass a driver or a fleet.",
        ],
      },
      {
        kind: "text",
        body: (
          <>
            We can suspend an account that breaks these rules (see{" "}
            <TextLink href="#ending">suspension and ending use</TextLink>).
          </>
        ),
      },
    ],
  },
  {
    id: "figures",
    title: "The figures are yours to check",
    blocks: [
      {
        kind: "points",
        items: [
          "Earnings, a driver's share, cash due at handover, fuel, savings, accommodation and every other figure in Musafir Fleet are calculated from what users enter, under the settings the fleet chooses. A figure is only as right as the readings and amounts behind it.",
          "The fleet keeps its own accounts. Musafir Fleet keeps a record; it is not an accountant, a payroll service or a bank, and it does not hold or move anybody's money.",
          "A disagreement about pay, cash, a shift or a deduction is between the fleet and its driver to settle. We can help show what was recorded and when, but we do not decide who is right.",
          "Maintenance reminders are a help, not a guarantee. The fleet remains responsible for keeping its vehicles safe, roadworthy and with their papers in order.",
          <>
            <Lead>Musafir Fleet is not insurance.</Lead> It does not cover a vehicle, a driver, a passenger,
            or anything that happens on a shift, and nothing recorded in it is cover of any kind.
          </>,
        ],
      },
    ],
  },
  {
    id: "availability",
    title: "Availability",
    blocks: [
      {
        kind: "points",
        items: [
          "We work to keep Musafir Fleet running, but we do not promise it will always be available, uninterrupted or free of errors. It depends on phones, networks, GPS signal and services run by others.",
          "A route can have gaps where a phone had no signal, ran out of charge, or had location switched off. The app keeps fixes on the phone while there is no signal and sends them later, but it cannot record what the phone did not see.",
          "We may change, add or remove features. Where a change takes away something a fleet relies on, we will try to tell the fleet before it happens.",
        ],
      },
    ],
  },
  {
    id: "fees",
    title: "Fees",
    blocks: [
      {
        kind: "text",
        body: "The app is free to download. Any fee for a fleet's use of Musafir Fleet is agreed separately, in writing, between InvoSquare and that fleet. These terms do not set one.",
      },
    ],
  },
  {
    id: "ending",
    title: "Suspension and ending use",
    blocks: [
      {
        kind: "points",
        items: [
          "A fleet can stop using Musafir Fleet at any time by telling us. A driver can stop by uninstalling the app. A driver's shift and pay records are part of the fleet's own records, and stay with the fleet.",
          "We may suspend or close an account that breaks these terms or puts the service or other users at risk, or where fees agreed in writing go unpaid. Where we can, we will tell the fleet first and give it the chance to put things right.",
          "While a fleet is suspended, its administrators and drivers cannot sign in.",
          <>
            What happens to the data afterwards, and how to ask for it to be deleted, is set out in the{" "}
            <TextLink href="/policy">privacy policy</TextLink>.
          </>,
        ],
      },
    ],
  },
  {
    id: "liability",
    title: "Limitation of liability",
    blocks: [
      {
        kind: "points",
        items: [
          "Musafir Fleet is provided as it is. As far as the law allows, InvoSquare is not liable for indirect or consequential loss, for lost earnings or profit, or for loss that comes from a figure, a route or a record being wrong, late or missing, or from a decision a fleet or a driver makes because of one.",
          "We are not responsible for what happens to a vehicle, a driver, a passenger or anybody else on the road. Running the vehicles, and employing or engaging the drivers, is the fleet's business.",
          "Where we are liable, our total liability to a fleet is limited to the fees it paid us for Musafir Fleet in the three months before the claim arose.",
          "Nothing in these terms limits a liability that the law of Pakistan does not allow to be limited.",
        ],
      },
    ],
  },
  {
    id: "law",
    title: "The law that applies",
    blocks: [
      {
        kind: "text",
        body: "These terms are governed by the laws of Pakistan, and any dispute about them or about Musafir Fleet is for the courts at Lahore. If something has gone wrong, tell us first. Most problems are solved faster on the phone than in court.",
      },
    ],
  },
  {
    id: "changes",
    title: "Changes to these terms",
    blocks: [
      {
        kind: "text",
        body: "If we change these terms, we will update this page and change the effective date at the top. Material changes will also be shown in the app or the portal. Using Musafir Fleet after a change takes effect means accepting the updated terms.",
      },
    ],
  },
  {
    id: "contact",
    title: "Contact us",
    blocks: [{ kind: "text", body: "For any question about these terms:" }, PUBLISHER_CONTACT],
  },
];

const TermsPage = () => (
  <LegalPage
    title="Terms and conditions"
    effective="30 October 2026"
    intro={
      <>
        <p>
          These terms cover the Musafir Fleet app and web portal, which fleets use to run their vehicles and
          drivers. Renting a car from Musafir is a different service, covered by our{" "}
          <TextLink href="/policies">booking terms</TextLink>.
        </p>
        <p>
          Musafir Fleet (formerly InvoDrive) is published by InvoSquare, Lahore, Pakistan. Using its Android
          or iOS app or its web portal at fleet.musafircars.com means agreeing to these terms. What it
          collects, and why, is in the <TextLink href="/policy">privacy policy</TextLink>.
        </p>
      </>
    }
    sections={SECTIONS}
  />
);

export default TermsPage;
