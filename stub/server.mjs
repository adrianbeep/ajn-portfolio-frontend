#!/usr/bin/env node
/**
 * Stub API for the frontend container build.
 *
 * Serves the endpoints the site consumes at build time, with the fixture
 * data in `fixtures/projects.json`. The shape mirrors the real backend
 * contract (ajn-portfolio-backend/docs/api-contract.md):
 *
 *   GET /projects             -> { items, total, page, pageSize }
 *   GET /projects/{slug}      -> project detail
 *   GET /contributions        -> { items, total, page, pageSize }
 *   GET /contributions/{slug} -> contribution detail
 *
 * The fixture mirrors the backend seed: 2 projects and 0 contributions.
 *
 * The point is a deterministic build: the same commit must always produce the
 * same `dist/`, so the fixtures live in the repo and never change at runtime.
 *
 * Usage:
 *   node stub/server.mjs [--port 5239] [--fixtures <path>]
 */

import http from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const options = {
    port: Number(process.env.STUB_PORT ?? 5239),
    fixtures: process.env.STUB_FIXTURES ?? resolve(here, "fixtures", "projects.json"),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--port") options.port = Number(argv[++index]);
    else if (arg === "--fixtures") options.fixtures = resolve(argv[++index]);
  }

  return options;
}

const options = parseArgs(process.argv.slice(2));

const raw = await readFile(options.fixtures, "utf8");
const fixture = JSON.parse(raw);
const projects = fixture.projects;
// The backend seed has no contributions yet: the catalogue is empty on
// purpose, and the stub has to look the same or the build is not hermetic.
const contributions = fixture.contributions ?? [];

/** Maximum page size accepted by the real API (GetProjectsQueryHandler). */
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

function toSummary(project) {
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    urlThumbnail: project.urlThumbnail,
    description: project.description,
    // The summary carries the state and the creation date: the listing card
    // shows "{year} · {state}" and must not need the detail endpoint.
    state: project.state,
    createdAt: project.createdAt,
  };
}

function toContributionSummary(contribution) {
  return {
    id: contribution.id,
    slug: contribution.slug,
    title: contribution.title,
    urlThumbnail: contribution.urlThumbnail,
    urlPrContribution: contribution.urlPrContribution,
    description: contribution.description,
    state: contribution.state,
    createdAt: contribution.createdAt,
  };
}

/** Reads the paging parameters, clamping them like the real API does. */
function readPaging(url) {
  const requestedPage = Number(url.searchParams.get("page") ?? 1);
  const requestedPageSize = Number(url.searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE);

  const page = requestedPage < 1 ? 1 : requestedPage;
  const pageSize =
    requestedPageSize < 1
      ? DEFAULT_PAGE_SIZE
      : requestedPageSize > MAX_PAGE_SIZE
        ? MAX_PAGE_SIZE
        : requestedPageSize;

  return { page, pageSize };
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${options.port}`);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (req.method !== "GET") {
    sendJson(res, 405, { title: "Method Not Allowed", status: 405 });
    return;
  }

  // GET /projects/{slug}
  const detailMatch = path.match(/^\/projects\/([^/]+)$/);
  if (detailMatch) {
    const slug = decodeURIComponent(detailMatch[1]);
    const project = projects.find((candidate) => candidate.slug === slug);

    if (!project) {
      sendJson(res, 404, {
        type: "https://tools.ietf.org/html/rfc9110#section-15.5.5",
        title: "Not Found",
        status: 404,
        detail: `Project '${slug}' was not found.`,
      });
      return;
    }

    sendJson(res, 200, project);
    return;
  }

  // GET /contributions/{slug}
  const contributionMatch = path.match(/^\/contributions\/([^/]+)$/);
  if (contributionMatch) {
    const slug = decodeURIComponent(contributionMatch[1]);
    const contribution = contributions.find((candidate) => candidate.slug === slug);

    if (!contribution) {
      sendJson(res, 404, {
        type: "https://tools.ietf.org/html/rfc9110#section-15.5.5",
        title: "Not Found",
        status: 404,
        detail: `Contribution '${slug}' was not found.`,
      });
      return;
    }

    sendJson(res, 200, contribution);
    return;
  }

  // GET /projects
  if (path === "/projects") {
    const { page, pageSize } = readPaging(url);

    const start = (page - 1) * pageSize;
    const items = projects.slice(start, start + pageSize).map(toSummary);

    sendJson(res, 200, { items, total: projects.length, page, pageSize });
    return;
  }

  // GET /contributions
  if (path === "/contributions") {
    const { page, pageSize } = readPaging(url);

    const start = (page - 1) * pageSize;
    const items = contributions.slice(start, start + pageSize).map(toContributionSummary);

    sendJson(res, 200, { items, total: contributions.length, page, pageSize });
    return;
  }

  // GET /health
  if (path === "/health") {
    sendJson(res, 200, {
      status: "healthy",
      projects: projects.length,
      contributions: contributions.length,
    });
    return;
  }

  sendJson(res, 404, { title: "Not Found", status: 404 });
});

server.listen(options.port, "0.0.0.0", () => {
  console.log(
    `stub API listening on http://0.0.0.0:${options.port} ` +
      `(${projects.length} projects, ${contributions.length} contributions from ${options.fixtures})`,
  );
});
