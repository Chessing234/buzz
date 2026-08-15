import assert from "node:assert/strict";
import { test } from "node:test";

import { projectCloneErrorPresentation } from "./projectGitError.ts";

test("explains unsupported authenticated GitHub clones without exposing git output", () => {
  assert.deepEqual(
    projectCloneErrorPresentation(
      new Error(
        "Cloning into '/Users/person/repos/app'... remote: repository requires SSH certificate authentication. fatal: requested URL returned error: 403",
      ),
      "https://github.com/example/app.git",
    ),
    {
      title: "Repository access required",
      description:
        "This repository requires GitHub authentication. Buzz currently clones public GitHub repositories without credentials.",
    },
  );
});

test("presents missing and network failures clearly", () => {
  assert.equal(
    projectCloneErrorPresentation(new Error("Repository not found")).title,
    "Repository not found",
  );
  assert.equal(
    projectCloneErrorPresentation(new Error("Could not resolve host")).title,
    "Couldn’t reach the repository",
  );
});

test("uses a concise fallback", () => {
  assert.deepEqual(projectCloneErrorPresentation(new Error("git failed")), {
    title: "Couldn’t clone repository",
    description:
      "Try again. If the problem continues, contact the repository owner.",
  });
});

test("explains git's non-interactive credential failure instead of 'try again'", () => {
  // Buzz clears credential.helper and sets GIT_TERMINAL_PROMPT=0, so a private
  // HTTPS remote fails here — not with a 401/403 the auth branch would catch.
  const presentation = projectCloneErrorPresentation(
    new Error(
      "fatal: could not read Username for 'https://github.com': terminal prompts disabled",
    ),
    "https://github.com/example/private.git",
  );
  assert.equal(
    presentation.title,
    "Repository needs credentials Buzz can’t supply",
  );
  assert.match(presentation.description, /Buzz relay/);
  assert.doesNotMatch(presentation.description, /Try again/);
});

test("covers the no-tty wording git uses without GIT_TERMINAL_PROMPT", () => {
  const presentation = projectCloneErrorPresentation(
    new Error(
      "fatal: could not read Username for 'https://example.com': No such device or address",
    ),
    "https://example.com/team/app.git",
  );
  assert.equal(
    presentation.title,
    "Repository needs credentials Buzz can’t supply",
  );
  assert.match(presentation.description, /Buzz relay/);
});

test("still routes a real 403 to the access-required message", () => {
  assert.equal(
    projectCloneErrorPresentation(
      new Error("fatal: requested URL returned error: 403"),
      "https://github.com/example/app.git",
    ).title,
    "Repository access required",
  );
});

test("names the transport when a pasted SSH URL is refused outright", () => {
  // `configure_git_auth` allows only http/https, so git refuses before it
  // ever reaches the network — retrying can never help.
  const presentation = projectCloneErrorPresentation(
    new Error("fatal: transport 'ssh' not allowed"),
    "git@github.com:example/app.git",
  );
  assert.equal(presentation.title, "Clone URL uses an unsupported transport");
  assert.match(presentation.description, /HTTPS clone URL/);
});

test("names the transport for a git:// URL too", () => {
  assert.equal(
    projectCloneErrorPresentation(
      new Error("fatal: transport 'git' not allowed"),
      "git://example.com/app.git",
    ).title,
    "Clone URL uses an unsupported transport",
  );
});

