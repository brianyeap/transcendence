# Deploying the match engine (socket server) on AWS Lightsail

Only `socket/` runs on AWS. Everything else stays where it is:

| Part | Where |
|---|---|
| Next.js web app | Vercel (`https://transcendence-duel.vercel.app`) |
| Database, auth, storage | Supabase |
| Match engine (`socket/`) | AWS Lightsail, Singapore |

Vercel can't run the match engine: it's a long-running process that keeps
live matches in memory, and Vercel only runs short-lived functions.

## What's running

| Thing | Value |
|---|---|
| Lightsail instance | `transcendence-socket` (Ubuntu 24.04, $5/mo plan: 512 MB RAM, 2 vCPU, 20 GB) |
| Region | Singapore (`ap-southeast-1a`) |
| Static IP | `transcendence-socket-ip` = `47.131.208.13` |
| Socket address | `https://47-131-208-13.sslip.io` |
| Firewall | 22 (SSH), 80 (HTTP), 443 (HTTPS) |
| Code on the server | `/home/ubuntu/transcendence` (a git clone of this repo) |
| Deploy folder | `/home/ubuntu/transcendence/deploy/socket` |

On the server, two containers run from `deploy/socket/docker-compose.yml`:

- **caddy**: the only thing open to the internet (ports 80 and 443). It gets
  a free HTTPS certificate from Let's Encrypt on its own and forwards every
  request, websockets included, to the match engine.
- **socket**: the match engine, built from `socket/Dockerfile`. It isn't
  reachable from outside; only Caddy talks to it (as `socket:4000`).

HTTPS is required: the Vercel site is HTTPS, and browsers block an HTTPS
page from opening an insecure `ws://` connection.

`sslip.io` is a free DNS service: `47-131-208-13.sslip.io` always points to
`47.131.208.13`, so we don't need to buy a domain.

## How it was set up (step by step)

### 1. Create the instance

Lightsail console → **Create instance**:

1. Location: **Singapore, Zone A**.
2. Platform: **Linux operating system**, blueprint: **Ubuntu 24.04 LTS**.
3. Plan: General purpose, Dual-stack, **$5** (512 MB).
4. Name: `transcendence-socket`.
5. **Advanced settings → Add launch script**: paste the script below. It runs
   once, as root, the first time the server boots.
6. **Create instance**.

Launch script:

```bash
# 1 GB swap so the 512 MB plan can build the image
fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
# Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu
# Code
git clone https://github.com/brianyeap/transcendence.git /home/ubuntu/transcendence
D=/home/ubuntu/transcendence/deploy/socket
mkdir -p $D
# ...then writes docker-compose.yml and Caddyfile (same content as
# deploy/socket/ in this repo) and a .env with empty secrets:
cat > $D/.env <<'XEOF'
SOCKET_DOMAIN=
NEXT_PUBLIC_SUPABASE_URL=https://mljqvfqtpargrwxifxum.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
SOCKET_ALLOWED_ORIGINS=https://transcendence-duel.vercel.app
XEOF
chown -R ubuntu:ubuntu /home/ubuntu/transcendence
```

The script writes the `deploy/socket` files itself because they weren't on
GitHub yet when the server was made. Once `deploy/socket/` is on `main`,
the `cat > ... <<'XEOF'` parts can be replaced by `cp .env.example .env`.

### 2. Networking

Instance → **Networking** tab:

1. **Attach static IP** → name it `transcendence-socket-ip`. Without it the
   public IP changes every time the instance stops and starts.
2. Firewall → **Add rule** → Application **HTTPS** (TCP 443), source
   **Anywhere IPv4**. SSH (22) and HTTP (80) are open by default. Port 80
   must stay open: Let's Encrypt uses it to check we own the domain.

### 3. Fill in `.env` on the server

Instance → **Connect using SSH** (opens a terminal in the browser), then:

```bash
cd ~/transcendence/deploy/socket
nano .env
```

| Variable | Value |
|---|---|
| `SOCKET_DOMAIN` | `47-131-208-13.sslip.io` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` key (secret, never commit it) |
| `SOCKET_ALLOWED_ORIGINS` | `https://transcendence-duel.vercel.app` (comma-separate more addresses if needed) |

Save with `Ctrl+O`, `Enter`, exit with `Ctrl+X`.

### 4. Start it

```bash
docker compose up -d --build
docker compose logs -f
```

Look for `match engine listening on :4000` (socket) and
`certificate obtained successfully` (caddy). `Ctrl+C` stops following the
logs; the containers keep running.

### 5. Check it from your own computer

Open this in a browser:

```
https://47-131-208-13.sslip.io/socket.io/?EIO=4&transport=polling
```

A reply starting with `0{"sid":` means HTTPS, Caddy and the match engine
all work.

### 6. Point Vercel at it

Vercel → project → **Settings → Environment Variables**:

```
NEXT_PUBLIC_SOCKET_URL=https://47-131-208-13.sslip.io
```

Then **Deployments → Redeploy**. `NEXT_PUBLIC_*` values are baked into the
browser code at build time, so changing the variable alone does nothing
until the next build.

### 7. Play a match

Open the Vercel site in two browsers (two accounts) and play a match.

## Everyday commands (on the server)

```bash
cd ~/transcendence/deploy/socket

docker compose ps                 # are both containers up?
docker compose logs -f socket     # match engine logs
docker compose logs -f caddy      # HTTPS / certificate logs
docker compose restart socket     # restart the engine (ends live matches)
```

### Ship a new version of the socket code

There's no auto-deploy. After pushing socket changes to `main`:

```bash
cd ~/transcendence
git pull
cd deploy/socket
docker compose up -d --build
```

This restarts the engine, so any match in progress ends. Don't do it while
people are playing.

If `git pull` complains that `deploy/socket/docker-compose.yml` or
`Caddyfile` "would be overwritten", those are the copies the launch script
made. Delete them (keep `.env`) and pull again:

```bash
rm ~/transcendence/deploy/socket/docker-compose.yml ~/transcendence/deploy/socket/Caddyfile
```

### Change an environment variable

Edit `.env`, then recreate the container so it reads the new value:

```bash
nano .env
docker compose up -d
```

If you add a new Vercel domain (e.g. a custom domain), add it to
`SOCKET_ALLOWED_ORIGINS`, otherwise the browser's connection is refused.

## Cost

$5/month for the instance, paid from the account's AWS credits. The static
IP is free while it's attached to a running instance. **If you delete the
instance, also delete the static IP** (Lightsail → Networking), or it
starts costing money on its own.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Match page stuck connecting | `NEXT_PUBLIC_SOCKET_URL` not set in Vercel, or Vercel not redeployed after setting it |
| Browser console: CORS / origin error | Vercel address missing from `SOCKET_ALLOWED_ORIGINS` (exact match, no trailing `/`) |
| Caddy log: certificate error | Port 80 or 443 closed in the Lightsail firewall, or Let's Encrypt rate limit on `sslip.io`. Fallback: a real domain or a free DuckDNS name in `SOCKET_DOMAIN` |
| Matches don't save | Wrong `SUPABASE_SERVICE_ROLE_KEY` (check `docker compose logs socket`) |
| Build killed / out of memory | Check swap is on: `free -h` should show 1 GB swap |
