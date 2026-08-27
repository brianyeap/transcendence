FROM node:22-alpine

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY docker/entrypoint.sh /usr/local/bin/dev-entrypoint
RUN chmod +x /usr/local/bin/dev-entrypoint

EXPOSE 3000

ENTRYPOINT ["dev-entrypoint"]
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
