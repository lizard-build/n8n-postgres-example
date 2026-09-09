FROM docker.n8n.io/n8nio/n8n:2.38.5
COPY --chown=node:node scripts/ /opt/lizard-example/scripts/
COPY --chown=node:node workflows/ /opt/lizard-example/workflows/
USER node
EXPOSE 5678
ENTRYPOINT ["tini", "--", "/bin/sh", "/opt/lizard-example/scripts/start.sh"]
