# Variables
DOCKER ?= podman
COMPOSE := $(DOCKER)-compose -f ./compose.yaml
IMAGE_NAME := fresh-scaffold

## Application configuration

# Note that this port is external from the view of the container
# It may still be an internal port for the TLS proxy
EXTERNAL_PORT ?= 21234

# Semi-random value for DENO_DEPLOYMENT_ID, to enable proper client caching
# see -> https://fresh.deno.dev/docs/concepts/deployment#-docker
GIT_REVISION=$(shell git rev-parse HEAD)

# Build version including timestamp
BUILD_STRING := Build $(shell date '+%Y%m%d-%H%M%S') (git $(shell git rev-parse --short HEAD))

# Export variables for docker-compose
export IMAGE_NAME
export EXTERNAL_PORT
export GIT_REVISION
export BUILD_STRING

# Default target
all: help

# Show available targets
help:
	@echo "Available targets:"
	@echo "  config     - Show current configuration"
	@echo "  build      - Build all images"
	@echo "  up         - Start services"
	@echo "  rebuild    - Start services with rebuild"
	@echo "  down       - Stop services"
	@echo "  status     - Show service status and recent logs"
	@echo "  logs       - Follow service logs"
	@echo "  versions   - Check dependency versions"
	@echo "  clean      - Remove containers and prune images"
	@echo "  prune      - Remove generated files"
	@echo "  vendor     - Vendor local copy of @fresh/plugin-vite"
	@echo "  pull       - Pull latest Deno image"

# Show current configuration
config:
	@echo "Current configuration:"
	@echo "  DOCKER:             $(DOCKER)"
	@echo "  IMAGE_NAME:         $(IMAGE_NAME)"
	@echo "  EXTERNAL_PORT:      $(EXTERNAL_PORT)"

# Build all images
build:
	$(COMPOSE) build

# Start services
up:
	$(COMPOSE) up --detach

# Start services with rebuild
rebuild: down
	$(COMPOSE) up --build --detach

# Stop services
down:
	$(COMPOSE) down

# Show service status and recent logs
status:
	@echo "=== Service Status ==="
	$(COMPOSE) ps
	@echo ""
	@echo "=== Recent Logs ==="
	$(COMPOSE) logs --tail=20

# Follow service logs
logs:
	$(COMPOSE) logs --follow

# Remove containers and prune images
clean:
	$(DOCKER) rm --all --force 2>/dev/null || true
	$(DOCKER) image prune --force

# Remove generated files (should not be necessary with .dockerignore)
prune:
	rm -rf node_modules _fresh deno.lock

# Helper function for printing lastest version from jsr.io for a package
define get_latest_version
	@printf "Latest $(1) version: "
	@curl -s 'https://jsr.io/$(1)/meta.json' | jq -r '.versions | keys[]' | sort -V | tail -n1
endef

# Show depenency versions to alert for outdated packages
versions:
	@deno task check-deps || true
	$(call get_latest_version,@fresh/core)
# 	$(call get_latest_version,@fresh/plugin-tailwind)

.PHONY: vendor
vendor:
	@mkdir -p vendor
	rm -fR vendor/plugin-vite && cp -a ../../denoland/fresh/packages/plugin-vite vendor
	rm -fR vendor/plugin-vite/{.attic,demo,tests,README.md}
	rm -fR vendor/plugin-vite/src/plugins/patches/*_test.ts

pull:
	$(DOCKER) pull docker.io/denoland/deno:latest

