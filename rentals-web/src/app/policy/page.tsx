import type { Metadata } from "next";

import { Lead, LegalPage, PUBLISHER_CONTACT, TextLink, type LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  alternates: { canonical: "/policy" },
  title: { absolute: "Privacy policy · Musafir Fleet" },
  description:
    "What the Musafir Fleet app and web portal (formerly InvoDrive) collect, why, who it is shared with, how long it is kept, and how drivers can withdraw consent or ask for their data.",
};

/**
 * The privacy policy for Musafir Fleet, the fleet and driver app, and the
 * page its store listings link to as their privacy policy. It is not about
 * renting a car from Musafir; that is `/policies`.
 *
 * It was the InvoDrive policy on invosquare.com, carried over with the same
 * structure and commitments and corrected against the code in
 * `~/Documents/invo/mydriver`. Every claim here should be one somebody could
 * check in that code. Where the product changes what it collects, this page
 * changes with it, and the effective date moves.
 *
 * One claim from the old page is deliberately missing: that uploaded documents
 * "are not publicly accessible". What the app and portal show is scoped to the
 * fleet, but whether the storage behind them is private is a server setting,
 * not something the code can promise.
 */
const SECTIONS: LegalSection[] = [
  {
    id: "who",
    title: "Who this applies to",
    blocks: [
      { kind: "text", body: "Musafir Fleet has three kinds of user, and the data involved differs for each:" },
      {
        kind: "points",
        items: [
          <>
            <Lead>Drivers</Lead>, who drive a vehicle belonging to a fleet and use the app to start and
            finish shifts.
          </>,
          <>
            <Lead>Fleet administrators</Lead>, who manage a fleet, its vehicles and its drivers, in the
            app or the web portal.
          </>,
          <>
            <Lead>Passengers</Lead>, who can send a fleet a complaint from the QR sticker in one of its
            vehicles. This happens on a web page, with no account and without the app.
          </>,
        ],
      },
      {
        kind: "text",
        body: "Each fleet is a separate account. A fleet can only ever see its own drivers, vehicles and records, and data is never shared between fleets.",
      },
    ],
  },
  {
    id: "collect",
    title: "What we collect",
    blocks: [
      {
        kind: "rows",
        metaLabel: "Provided by",
        rows: [
          {
            name: "Name, email address, phone number and WhatsApp number",
            body: "To create and identify an account, and so a fleet administrator can contact a driver about a shift.",
            meta: "Entered by the fleet administrator or the driver.",
          },
          {
            name: "Password",
            body: "To sign in. Stored only as a salted hash, so we cannot read it.",
            meta: "Chosen by the user. When an administrator sets a new driver's first password, the driver has to replace it with their own at first sign-in.",
          },
          {
            name: "CNIC number and CNIC (front and back), driving licence number, expiry date and licence (front and back), a photograph of the driver, and their address",
            body: "Fleet operators are responsible for who drives their vehicles, and need to verify identity and licence validity before handing over a car.",
            meta: "Photographed by the driver during onboarding, or entered and uploaded by the fleet administrator.",
          },
          {
            name: "An emergency contact: a phone number, and that person's CNIC number",
            body: "So the fleet knows who to call if something happens to a driver on shift.",
            meta: "Entered by the fleet administrator.",
          },
          {
            name: "Precise location, including in the background, and the phone's battery level",
            body: (
              <>
                To record the route driven during a shift (see{" "}
                <TextLink href="#location">location data, in detail</TextLink>). The battery level is sent
                with each location fix, because a phone that ran out of charge is the usual reason for a gap
                in a route.
              </>
            ),
            meta: "Collected by the app on the driver's phone, with consent, during shifts only.",
          },
          {
            name: "Shift records: odometer readings, distance, number of rides, cash collected, fuel volume and cost, expenses",
            body: "To calculate what a shift earned, what a driver is owed, and what cash is due to the fleet.",
            meta: "Entered by the driver at the start and end of a shift, or by an administrator.",
          },
          {
            name: "Pay records: a monthly salary or a commission rate, earnings and payments, and the savings committee and accommodation amounts set aside from each shift",
            body: "To work out a driver's share of each shift, and to keep track of what they have been paid, what has been saved for them, and what has been charged for fleet housing.",
            meta: "Set by the fleet administrator, and calculated by the app when a shift closes.",
          },
          {
            name: "Photographs of the odometer and of the fuel pump or receipt",
            body: "So a reading or a fuel spend can be checked later if a figure is disputed.",
            meta: "Photographed by the driver when finishing a shift. Optional.",
          },
          {
            name: "Maintenance records: what was done to a vehicle, the cost, the workshop, and photographs of the bill",
            body: "So the fleet knows what each vehicle needs next and when, and a bill can be checked later.",
            meta: "Entered by the driver or the fleet administrator. Photographs are optional.",
          },
          {
            name: "Passenger complaints: the message, up to three photographs, and a phone number or email address",
            body: "So the fleet can read the complaint and reply to the passenger. The vehicle and the name of the driver on shift at the time are saved with it, so it still says who it was about after the shift ends.",
            meta: "Entered by the passenger on the page the QR sticker opens. A phone number or an email address is required, so there is a way to reply.",
          },
          {
            name: "A push notification identifier",
            body: (
              <>
                To send shift reminders and alerts (see <TextLink href="#sharing">who it is shared with</TextLink>).
              </>
            ),
            meta: "Generated by the device when notifications are permitted.",
          },
          {
            name: "A record of important changes made by administrators, such as editing a shift or recording a payment, with the IP address they were connected from",
            body: "So a change to a shift, to cash or to an account can be traced to the person who made it.",
            meta: "Recorded automatically.",
          },
        ],
      },
      {
        kind: "text",
        body: "We do not collect contacts, calendar, SMS, call logs, browsing history, microphone audio, or health data. The app does not use advertising identifiers and contains no advertising.",
      },
    ],
  },
  {
    id: "location",
    title: "Location data, in detail",
    blocks: [
      {
        kind: "text",
        body: "Musafir Fleet asks for permission to access precise location, including while the app is in the background or the screen is off (the ACCESS_BACKGROUND_LOCATION permission on Android, and “Always” location access on iOS).",
      },
      {
        kind: "text",
        body: "This is necessary because the app's purpose is to record the route a vehicle takes during a working shift. A driver cannot keep the app open and the screen on while driving, and location limited to the foreground would stop recording the moment the phone locked, leaving an incomplete and misleading record of the journey.",
      },
      { kind: "text", body: "The app collects location only when all of the following are true:" },
      {
        kind: "points",
        items: [
          "The fleet the driver works for has turned tracking on for that fleet; and",
          "The driver has read the in-app explanation and given explicit consent. Consent can be withdrawn at any time in the app, or by revoking the permission in the device settings; and",
          "The driver has started a shift, and that shift has not yet ended.",
        ],
      },
      {
        kind: "text",
        body: "When a shift ends, collection from the phone stops immediately. The app does not collect location between shifts, on rest days, or at any time a driver is not working, and nothing in the app lets an administrator locate a driver's phone when they are not on shift.",
      },
      {
        kind: "text",
        body: "Location fixes are kept on the phone when there is no signal and uploaded when the connection returns, so a route recorded in an area with poor coverage is not lost.",
      },
      {
        kind: "text",
        body: (
          <>
            <Lead>Trackers fitted to vehicles.</Lead> A fleet may fit its own GPS tracking devices to its
            vehicles. A tracker reports the vehicle's position and speed, and whether the engine is
            running where it is wired for that, straight to the service. It works independently of the
            app and of any driver's phone, and it keeps reporting when no shift is running, so the fleet
            can see a vehicle that moves outside a shift. It records where the vehicle is, which is also
            where whoever has the vehicle is. Fitting a tracker is the fleet's decision, and the fleet is
            responsible for telling its drivers that its vehicles are tracked.
          </>
        ),
      },
    ],
  },
  {
    id: "use",
    title: "How the data is used",
    blocks: [
      {
        kind: "points",
        items: [
          "To operate shifts: starting, ending, and recording what happened during them.",
          "To calculate earnings, a driver's share, and the cash a driver owes the fleet at handover.",
          "To let a fleet verify a journey, by comparing the recorded route against the odometer reading and seeing where and for how long a vehicle stopped.",
          "To verify a driver's identity and licence before they are given a vehicle.",
          "To keep track of what each vehicle needs, and when.",
          "To pass a passenger's complaint to the fleet, so it can be looked into and answered.",
          "To send operational notifications.",
          "To keep the service secure, and to investigate misuse.",
        ],
      },
      {
        kind: "text",
        body: "We do not sell personal data. We do not share it with data brokers. We do not use it for advertising, or for profiling unrelated to running the fleet.",
      },
    ],
  },
  {
    id: "sharing",
    title: "Who it is shared with",
    blocks: [
      {
        kind: "rows",
        metaLabel: "Why",
        rows: [
          {
            name: "The driver's own fleet",
            body: "Their shift records, pay records, documents and routes.",
            meta: "This is the purpose of the product. A fleet sees only its own drivers.",
          },
          {
            name: "Passengers in the vehicle",
            body: "A passenger who scans the QR sticker sees the vehicle's details and the name and photograph of the driver on shift in it at that moment. Never a phone number, an email address or anything about the shift, and the photograph stops loading as soon as the shift ends.",
            meta: "So a passenger can check a complaint is about the right driver before sending it.",
          },
          {
            name: "InvoSquare",
            body: "The people who run the service can open any fleet's account. Each time they do, it is recorded.",
            meta: "To set a fleet up, support it, fix a problem or keep the service secure, and for nothing else.",
          },
          {
            name: "OneSignal (push notification delivery)",
            body: "An anonymous account identifier and the text of the notification. Notifications are kept short and never contain a phone number, an address or a location. They can name a vehicle by its registration number, and an alert to a fleet's administrators about a complaint names the driver it is about.",
            meta: "To deliver shift reminders and alerts to a device.",
          },
          {
            name: "DigitalOcean (hosting)",
            body: "Data stored on servers operated on our behalf.",
            meta: "To run the service.",
          },
          {
            name: "Amazon Web Services (storage)",
            body: "Uploaded documents and photographs, and backup copies of the database.",
            meta: "To store files, and to be able to restore the service if something goes wrong.",
          },
          {
            name: "Map providers: Google Maps in the Android app, Apple Maps in the iOS app, OpenStreetMap in the web portal",
            body: "Requests for the map images of the area on screen. They are not sent names, accounts or shift records.",
            meta: "To draw routes and vehicles on a map.",
          },
        ],
      },
      {
        kind: "text",
        body: "We may also disclose data where we are legally required to do so, or to establish or defend a legal claim.",
      },
    ],
  },
  {
    id: "retention",
    title: "How long it is kept",
    blocks: [
      {
        kind: "points",
        items: [
          "Individual location fixes, from the app and from vehicle trackers, are deleted automatically after 90 days.",
          "A summarised route for each shift, the line the vehicle travelled and the total distance, is kept with the shift record, because it is part of the commercial record of that day's work. A tracked vehicle's movement outside a shift is kept the same way, as a summarised trip.",
          "Shift, pay and maintenance records are kept for as long as the fleet requires them for its own accounting.",
          "Identity documents are kept while the driver is active with the fleet, and deleted on request once they are not.",
          "Complaints are kept with the fleet's records of the vehicle they are about. A passenger can ask for theirs to be deleted using the contact details below.",
          "Backups of the database are kept for about a month, so something deleted from the service can remain in a backup until then.",
        ],
      },
    ],
  },
  {
    id: "rights",
    title: "Your choices and your rights",
    blocks: [
      {
        kind: "points",
        items: [
          <>
            <Lead>Refusing or withdrawing location consent.</Lead> A driver may decline tracking, or
            withdraw consent later in the app or in the device settings. The app keeps working and routes
            are simply not recorded. A fleet can, for a particular driver, require tracking before a shift
            starts; that driver cannot start a shift without it, and everything else in the app still
            works.
          </>,
          <>
            <Lead>Notifications.</Lead> These can be turned off in the device settings at any time.
          </>,
          <>
            <Lead>Access, correction and deletion.</Lead> A driver may ask their fleet administrator, or
            contact us directly using the details below, to see, correct or delete their personal data. A
            passenger can do the same for a complaint they sent. We will respond within 30 days.
          </>,
          <>
            <Lead>Uninstalling.</Lead> Removing the app stops all collection from the phone immediately.
          </>,
        ],
      },
    ],
  },
  {
    id: "security",
    title: "How it is protected",
    blocks: [
      {
        kind: "points",
        items: [
          "All traffic between the app, the web portal and our servers is encrypted in transit (HTTPS).",
          "In the app, sign-in credentials are stored in the phone's secure keychain, never in ordinary application storage.",
          "Passwords are stored only as salted hashes, and changing a password signs out every other device that was using the old one.",
          "The app and the portal show a driver's documents and photographs only to that driver and to their fleet's administrators, when signed in.",
          "Each fleet's data is isolated, and every request is checked against the fleet it belongs to.",
        ],
      },
    ],
  },
  {
    id: "children",
    title: "Children",
    blocks: [
      {
        kind: "text",
        body: "Musafir Fleet is a tool for professional drivers and fleet operators. It is not directed at children, and we do not knowingly collect data from anyone under 18.",
      },
    ],
  },
  {
    id: "changes",
    title: "Changes to this policy",
    blocks: [
      {
        kind: "text",
        body: "If we change how data is collected or used, we will update this page and change the effective date at the top. Material changes affecting drivers will also be shown in the app.",
      },
    ],
  },
  {
    id: "contact",
    title: "Contact us",
    blocks: [
      { kind: "text", body: "For any question about this policy, or to make a data request:" },
      PUBLISHER_CONTACT,
    ],
  },
];

const PrivacyPolicyPage = () => (
  <LegalPage
    title="Privacy policy"
    effective="30 October 2026"
    intro={
      <>
        <p>
          This policy covers the Musafir Fleet app and web portal, which fleets use to run their vehicles
          and drivers. Renting a car from Musafir is a different service, covered by our{" "}
          <TextLink href="/policies">booking terms</TextLink>.
        </p>
        <p>
          Musafir Fleet (formerly InvoDrive) is a fleet and driver management app published by
          InvoSquare, Lahore, Pakistan. This policy covers its Android and iOS apps (package
          com.invodrive.app) and its web portal at fleet.musafircars.com, and explains what they collect,
          why, who it is shared with, and how long it is kept. Using them is also governed by the{" "}
          <TextLink href="/terms">Musafir Fleet terms</TextLink>.
        </p>
      </>
    }
    summary={
      <p>
        Musafir Fleet records a driver's location from their phone only while a shift is running, and only
        after that driver has explicitly agreed to it. Recording stops the moment the shift ends, and never
        happens on a driver's own time. A fleet may also fit trackers to its vehicles, which work separately
        from the app (see <TextLink href="#location">location data, in detail</TextLink>). We do not sell
        personal data, and we do not use it for advertising.
      </p>
    }
    sections={SECTIONS}
  />
);

export default PrivacyPolicyPage;
