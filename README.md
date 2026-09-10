# Musafir Rent A Car

Car rental in Lahore, [musafircars.com](https://musafircars.com).

Customers rent a car by the day, with one of our drivers or on their own. People
who own a car can lend it to us for the days it is idle: we publish it, find the
customer, handle the agreement and the handover, take a commission, and pay the
owner once the car is back.

```
backend/       Express 5 + TypeScript + Mongoose 9 + Socket.IO   (yarn, port 5012)
rentals-web/   Next.js 16 + React 19 + Tailwind v4               (npm,  port 3100)
```

One website serves three audiences:

| Where | Who | What |
| --- | --- | --- |
| `/` | customers | search by date, see prices, ask for a car |
| `/rent-your-car`, `/lender` | car owners | list a car, set its free dates, see what it earned |
| `/admin` | the office | price and confirm bookings, approve partner cars, pay owners |

## Getting it running

You need Node 20+, yarn, and a MongoDB you can reach.

```bash
# 1. install
cd backend && yarn install && cd ..
cd rentals-web && npm install && cd ..

# 2. configure
cp backend/.env.example backend/.env      # set JWT_SECRET (32+ chars), DB_URI, ADMIN_EMAIL, ADMIN_PASSWORD
cp rentals-web/.env.example rentals-web/.env

# 3. create the business and its founding account
cd backend && yarn seed:agency
#    → prints PUBLIC_AGENCY_ID=…, put that in backend/.env

# 4. (local only) some cars to look at
cd backend && yarn seed:demo

# 5. run both halves in one terminal
npm run dev
```

Then: the website at <http://localhost:3100>, the office at
<http://localhost:3100/admin>.

**Without `PUBLIC_AGENCY_ID` the public site is off** every public endpoint
answers 404 and the website shows no cars. That is deliberate: a rental site
listing the wrong business's cars is worse than one that is down.

## How a booking actually goes

```
website request  →  enquiry      holds nothing, blocks nothing
office prices it →  confirmed    THIS is what makes the car unavailable
keys handed over →  out          odometer + fuel photographed, with the customer there
car comes back   →  returned     charges final, deposit settled
                    cancelled    either side walked away
```

A day is **24 hours, rounded up, with an hour of grace on the return**. Out at
10am Monday and back at 2pm Tuesday is two days; back at 10:40 Tuesday is one.
The same function computes the quote on the website and the charge on the
invoice, so the two can never disagree.

The deposit is **held, not earned** it is deliberately outside the booking
total, because a deposit that lands in the day's takings is a deposit somebody
spends.

## When the car belongs to somebody else

A car offered by a member of the public is a `ListedCar`, not a `Car`. It is
never published until the office has looked at it and set the price customers
pay, the owner's asking price is not a customer's price, and the gap between
them is the business.

Nothing about the owner reaches the website: not their name, not their number,
not the registration. To a customer it is simply a car from Musafir.

When the booking is confirmed, the commission percentage is **copied onto it**
from settings and never read live again, an owner promised 80% of a booking in
March still gets 80% of it when it is paid in April. It comes off the rent plus
any kilometres over the allowance; a driver's allowance and a delivery charge
are Musafir's costs and stay with Musafir. The payout is due once the car is
back, appears in `/admin/payouts`, and shows in the owner's own portal with the
transfer reference against it.

## Deploying

PM2, two processes, from `ecosystem.config.js`:

```bash
cd backend      && yarn install --frozen-lockfile && yarn build
cd rentals-web  && npm ci && npm run build
pm2 start ecosystem.config.js && pm2 save
```

`npm run deploy` does the same over SSH, building both halves before restarting
either, so a compile error is a no-op rather than an outage.

## Two things still unanswered

Both are about the lending side, and both are written down rather than buried:

1. **Insurance on a car we do not own.** Private motor policies in Pakistan
   generally exclude use "for hire or reward". A lender's car crashing
   mid-rental can have its claim denied, and the owner will come to us, not the
   insurer. `/rent-your-car` tells owners to ask their insurer in writing. That
   is honest, not a solution.
2. **Self-drive.** Built, and switchable off business-wide from Settings. It is
   where cars get stolen in this market. A partner's car is never offered
   self-drive at all.
