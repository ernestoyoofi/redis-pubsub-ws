#!/bin/bash

set -e

# This file is only for a temporary LXC worker to automatically build images on Labs/Homelab, it's not very important.

cd "/worker/$ID_WORKER"

# --- [ Set DNS ] ---
if grep -qE "^nameserver[[:space:]]+10.251.17.1$" /etc/resolv.conf; then
  echo "DNS already exists"
else
  echo "Adding DNS..."
  echo "nameserver 10.251.17.1" | sudo tee -a /etc/resolv.conf > /dev/null
fi

# --- [ Installing Package ] ---
sudo apt update
sudo apt install git curl unzip zip -y

curl -fsSL https://bun.sh/install | bash
curl -Ls https://get.docker.com | sudo bash

# --- [ Set Docker Registry ] ---
sudo mkdir -p /etc/docker

cat <<'EOF' | sudo tee /etc/docker/daemon.json > /dev/null
{
  "dns": ["10.251.17.1"],
  "insecure-registries": ["image-registry.labs"]
}
EOF

sudo systemctl restart docker

echo "Docker daemon.json updated and Docker restarted."

# --- [ Clone Repo ] ---
git clone https://github.com/ernestoyoofi/redis-pubsub-ws.git

cd "/worker/$ID_WORKER/redis-pubsub-ws"

# --- [ Build & Push ] ---
sudo docker build -t image-registry.labs/redis-pubsub-ws:latest .
sudo docker push image-registry.labs/redis-pubsub-ws:latest
