# shellcheck shell=bash
# Shared Docker preflight helpers for local setup scripts.

# Print a human-actionable error for a failed `docker info` and return 1.
# Captures stderr so permission-denied is not misreported as "daemon not running".
docker_preflight_or_die() {
  local docker_info_err
  if docker_info_err="$(docker info 2>&1 >/dev/null)"; then
    return 0
  fi

  if printf '%s' "$docker_info_err" | grep -qiE 'permission denied|dial unix .*: connect: permission denied'; then
    error "Docker is installed but this user cannot talk to the daemon (permission denied)."
    error "On Linux: add your user to the docker group, then re-login:"
    error "  sudo usermod -aG docker \"\$USER\" && newgrp docker"
    error "Or run rootless Docker / start Docker Desktop and ensure your user can access it."
    return 1
  fi

  if printf '%s' "$docker_info_err" | grep -qiE 'Cannot connect|Is the docker daemon running|connection refused'; then
    error "Docker daemon is not running. Start Docker Desktop (or your engine) and try again."
    return 1
  fi

  error "Docker is unreachable:"
  error "$docker_info_err"
  return 1
}
