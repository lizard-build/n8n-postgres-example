FROM ghcr.io/n8n-io/n8n:2.38.5@sha256:f98bb7c2e0818412e414d456ab31ef48be2dc5ce5d1e6fae7ae171fbb6923093
COPY --chown=node:node scripts/ /opt/lizard-example/scripts/
COPY --chown=node:node workflows/ /opt/lizard-example/workflows/
USER node
EXPOSE 5678
ENTRYPOINT ["tini", "--", "/bin/sh", "/opt/lizard-example/scripts/start.sh"]
