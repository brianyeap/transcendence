# The HTTPS front door for the whole app.
# The browser only ever talks to this container, always over HTTPS.
# It then passes each request on to the web app or the match engine
# inside Docker, where plain HTTP is allowed.
FROM nginx:1.27-alpine

# Make a self-signed certificate while the image is built.
# The browser will warn about it once (it isn't signed by a known
# authority), but the connection is still encrypted.
RUN apk add --no-cache openssl \
 && mkdir -p /etc/nginx/certs \
 && openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/nginx/certs/key.pem \
      -out /etc/nginx/certs/cert.pem \
      -subj "/CN=localhost"

# Our settings replace nginx's default site.
COPY nginx.conf /etc/nginx/conf.d/default.conf
