# Immutable, non-root container for the documentation site.
# Build from the repository root (the site reads ../docs):
#   docker build -f website/Dockerfile -t knowme-decision-docs .
#   docker run --rm --read-only --tmpfs /tmp -p 8080:8080 knowme-decision-docs
# Served at http://localhost:8080/ (BASE_URL=/ inside the container).

FROM node:22-alpine AS build
WORKDIR /repo
COPY docs ./docs
COPY website/package.json website/package-lock.json ./website/
RUN cd website && npm ci
COPY website ./website
ENV SITE_URL=http://localhost:8080 BASE_URL=/
RUN cd website && npm run build

FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY --chown=101:101 --from=build /repo/website/build /usr/share/nginx/html
USER 101
EXPOSE 8080
