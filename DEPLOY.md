# Deploying Musafir

Live on droplet `159.65.228.41`, at `/var/code/musafir`, PM2 as root.

| What | Port | PM2 app |
|---|---|---|
| API | 5013 | `musafir-BE-5013` |
| Website | 8013 | `musafir-FE-8013` |

**These are not the fleet's ports.** InvoDrive runs `mydriver-BE-5012` and
`mydriver-FE-8012` on the same box. Two processes on one port means whichever
starts second dies on EADDRINUSE, and which one survives is down to PM2's
start order. Before adding anything here, check `ss -ltn` on the box rather
than trusting this table.

The API has **no public hostname and no certificate**, on purpose. Nothing in
the browser talks to it: every call goes through the website's own `/api/*`
route handlers, server to server over loopback. `ufw` allows only OpenSSH and
Nginx Full, so 5013 and 8013 are unreachable from the internet. Verify with
`nc -z 159.65.228.41 5013` from elsewhere; it should be refused.

## DNS

`musafircars.com` is registered at Amazon (it resolves to Amazon's parking
IPs, `76.223.105.230` and `13.248.243.5`). Point both records at the droplet:

```
musafircars.com        A    159.65.228.41
www.musafircars.com    A    159.65.228.41
```

`www` can be a CNAME to the apex instead; either works, since the application
redirects www to the apex itself (see `rentals-web/next.config.ts`).

Check it has propagated before going further:

```bash
dig +short musafircars.com A      # must print 159.65.228.41
```

## TLS

Only once DNS resolves to the droplet. Certbot's HTTP challenge has to reach
this box, and it will fail confusingly if the domain still points at Amazon.

```bash
certbot --nginx -d musafircars.com -d www.musafircars.com \
  --redirect --agree-tos -m hello@musafircars.com --no-eff-email
nginx -t && systemctl reload nginx
```

**Use `--nginx`, never `--standalone`.** A standalone authenticator fully stops
nginx to bind port 80, and this box already has one cert doing that: certbot
runs twice a day and takes every site down with it for the duration. Two
outages of about thirty hours each have been traced to exactly that path.

## Deploying a change

```bash
npm run deploy          # from a laptop: pulls, builds both halves, restarts
```

Or by hand on the box:

```bash
cd /var/code/musafir && git pull
cd backend      && yarn install --frozen-lockfile && yarn build
cd ../rentals-web && npm ci && npm run build
cd .. && pm2 restart musafir-BE-5013 musafir-FE-8013
```

### Builds need the swap file

The box has 3.9 GB of RAM, no swap until this deploy added some, and about
seventeen other Node apps resident. A Next production build needs more than the
~800 MB that leaves free, and the first attempt here was OOM-killed: load hit
67, and ssh, nginx and every site on the box stopped answering until the build
died. Nothing was damaged, but nothing was reachable either.

So there is now a 4 GB swapfile at `/swapfile`, `vm.swappiness=10` (used only
under real pressure, so normal operation is unaffected), persisted in
`/etc/fstab`. Builds also cap the heap:

```bash
NODE_OPTIONS=--max-old-space-size=2048 npm run build
```

Both matter. The cap makes Node collect garbage instead of growing until the
kernel kills it; the swap absorbs the spikes. **Do not remove the swapfile** and
expect builds to keep working, and if you add more apps to this box, watch
`free -m` during a deploy.

## First run on a fresh database

```bash
cd backend
yarn seed:agency      # creates the business + founding account, prints an id
# put that id in backend/.env as PUBLIC_AGENCY_ID, then:
pm2 restart musafir-BE-5013
```

Without `PUBLIC_AGENCY_ID` every public endpoint answers 404 and the website
shows no cars. That is deliberate: a rental site listing the wrong business's
cars is worse than one that is down.

Clear `ADMIN_PASSWORD` from `backend/.env` once you have signed in. It is only
read by the seed, and a bootstrap password left in a file on disk is a
credential nobody is rotating.

## If a site 502s

Check the upstream port with `ss -ltn` and the app name with `pm2 list`. Absent
from `pm2 list` means somebody deleted it: start it from its own directory with
`pm2 start ecosystem.config.js`, which is where its `.env` and therefore its
port comes from. `pm2 save` is not the culprit; that was tested directly and it
preserves stopped apps.
