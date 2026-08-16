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

test("covers the platform wordings git uses for the same prompt failure", () => {
  // Only the reason after the colon changes across GIT_TERMINAL_PROMPT=0, a
  // TTY-less Unix and macOS, so all three land on the same presentation.
  for (const reason of [
    "terminal prompts disabled",
    "No such device or address",
    "Device not configured",
  ]) {
    assert.equal(
      projectCloneErrorPresentation(
        new Error(
          `fatal: could not read Password for 'https://example.com': ${reason}`,
        ),
        "https://example.com/team/app.git",
      ).title,
      "Repository needs credentials Buzz can’t supply",
    );
  }
});

test("does not claim a credential failure for generic OS device errors", () => {
  // These phrases also accompany transport and filesystem failures; without
  // git's `could not read Username/Password for` prefix they carry no signal.
  for (const message of [
    "fatal: unable to access 'https://example.com/team/app.git': No such device or address",
    "error: cannot stat '.git/objects': Device not configured",
  ]) {
    assert.equal(
      projectCloneErrorPresentation(
        new Error(message),
        "https://example.com/team/app.git",
      ).title,
      "Couldn’t clone repository",
    );
  }
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
