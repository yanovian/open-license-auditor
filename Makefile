PNPM := pnpm

.PHONY: install build lint lint-fix format format-check test test-watch coverage package verify clean stage-dist release-patch release-minor release-major

install: ## Install dependencies
	$(PNPM) install --frozen-lockfile

build: ## Type-check the project
	$(PNPM) run build

lint: ## Lint the project
	$(PNPM) run lint

lint-fix: ## Lint and auto-fix what can be fixed
	$(PNPM) run lint:fix

format: ## Format the project with Prettier
	$(PNPM) run format

format-check: ## Check formatting without writing changes
	$(PNPM) run format:check

test: ## Run the test suite once
	$(PNPM) run test

test-watch: ## Run the test suite in watch mode
	$(PNPM) run test:watch

coverage: ## Run the test suite with coverage
	$(PNPM) run coverage

package: ## Bundle src/main.ts into dist/index.js
	$(PNPM) run package

verify: format-check lint test build package ## Run everything CI runs

clean: ## Remove build artifacts
	rm -rf dist coverage lib

# dist/ is committed to the repo: GitHub runs dist/index.js directly for anyone using
# `uses: yanovian/open-license-auditor@vX`, with no build step of their own. `pnpm version`
# refuses to run against a dirty working tree, so the freshly built dist/ from `verify` must be
# committed before it runs; this only creates a commit when dist/ actually changed.
stage-dist:
	git add dist
	git diff --cached --quiet -- dist || git commit -m "chore: rebuild dist"

release-patch: verify stage-dist ## Bump patch version, tag vX.Y.Z, push (triggers GitHub release)
	$(PNPM) version patch -m "Release v%s"
	git push origin HEAD --follow-tags

release-minor: verify stage-dist ## Bump minor version, tag vX.Y.Z, push (triggers GitHub release)
	$(PNPM) version minor -m "Release v%s"
	git push origin HEAD --follow-tags

release-major: verify stage-dist ## Bump major version, tag vX.Y.Z, push (triggers GitHub release)
	$(PNPM) version major -m "Release v%s"
	git push origin HEAD --follow-tags
