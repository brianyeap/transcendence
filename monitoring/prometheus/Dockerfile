FROM prom/prometheus:v3.0.0 AS prometheus

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
      gettext-base \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=prometheus /bin/prometheus /bin/prometheus
COPY --from=prometheus /bin/promtool /bin/promtool
COPY --from=prometheus /etc/prometheus/ /etc/prometheus/

COPY prometheus.template.yml /etc/prometheus/prometheus.template.yml
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh \
    && mkdir -p /prometheus \
    && chown -R nobody:nogroup /etc/prometheus /prometheus

USER nobody
EXPOSE 9090
VOLUME ["/prometheus"]
WORKDIR /prometheus
ENTRYPOINT ["/entrypoint.sh"]
CMD ["--config.file=/etc/prometheus/prometheus.yml", "--storage.tsdb.path=/prometheus"]