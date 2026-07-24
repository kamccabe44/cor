# Contract Ratings (COR) deployment options

One shared application (`contract-ratings/`) — the container serves the same
SPA + API everywhere; all differences between targets are the image source,
Kubernetes packaging, and environment variables. Never fork application code
per target. (This mirrors the `os_alerts` repo's `DEPLOYMENTS.md` layout:
`docker/` for images, `deploy/k8s/base` + overlays for kustomize,
`deploy/helm/` for the chart.)

| | 1. Docker Desktop k8s | 2. Cloud k8s (standalone) | 3. PEACEMAKER add-on (main) |
|---|---|---|---|
| **Connectivity** | Offline-capable + LAN | Full online | Full online |
| **Instances** | One, single machine/LAN | One, one host | One **per customer** (`cor.<sub>.<base>`) |
| **Image** | Built locally, never pulled | Your registry (GHCR/ECR) | ECR, pulled via refreshed secret |
| **Auth** | Shared password | Shared password | Shared password + PEACEMAKER SSO |
| **TLS** | n/a (localhost/LAN) | cert-manager Ingress | cert-manager per-host certs |
| **Deploy** | `kubectl apply -k contract-ratings/deploy/k8s/overlays/docker-desktop` | `kubectl apply -k contract-ratings/deploy/k8s/overlays/cloud` | Provisioned by the PEACEMAKER app via `contract-ratings/deploy/helm/contract-ratings` |
| **Docs** | [DOCKER_K8S.md](contract-ratings/DOCKER_K8S.md) | below | os_alerts repo's `COR_ADDON.md` |

All three run the same image built from
[`contract-ratings/docker/Dockerfile`](contract-ratings/docker/Dockerfile):
one Node process, `node:sqlite` + local disk on a PVC, no AWS at runtime.

## 1. Docker Desktop Kubernetes (local / LAN)

From the repo root, on the machine that runs Docker Desktop (Settings →
Kubernetes → Enable):

```bash
docker build -f contract-ratings/docker/Dockerfile -t contract-ratings:local contract-ratings
kubectl -n contract-ratings create secret generic contract-ratings \
  --from-literal=APP_PASSWORD='your-strong-password' --dry-run=client -o yaml \
  | kubectl apply -f -   # or edit deploy/k8s/base/secret.yaml first
kubectl apply -k contract-ratings/deploy/k8s/overlays/docker-desktop
# app at http://localhost/ — LAN machines use http://<host-ip>/
```

The image is used from the local store (`imagePullPolicy: IfNotPresent`), so
this also works disconnected: `docker save contract-ratings:local -o cor.tar`,
carry the tarball + `contract-ratings/deploy/k8s/`, `docker load`, apply.

## 2. Cloud Kubernetes (standalone, one instance)

Any cluster with internet, an ingress controller, and cert-manager:

1. Build and push the image to your registry (CI can do this — see
   `.github/workflows/image-build.yml`, which publishes
   `ghcr.io/<owner>/contract-ratings`).
2. In `contract-ratings/deploy/k8s/overlays/cloud/`: point the
   `images:` entry at your registry ref and set the real hostname in
   `ingress.yaml` (DNS for it must reach the cluster).
3. `kubectl apply -k contract-ratings/deploy/k8s/overlays/cloud`

## 3. PEACEMAKER add-on (main deployment — per customer)

The PEACEMAKER (`os_alerts`) app provisions a dedicated COR instance per
customer account at `cor.<subdomain>.<base-domain>` using the Helm chart at
[`contract-ratings/deploy/helm/contract-ratings`](contract-ratings/deploy/helm/contract-ratings):
toggling the add-on runs `helm upgrade --install cor-<sub>` in the
`cor-tenants` namespace, creates the Route53 record, and mints SSO secrets.

Publish a new build for it with
[`contract-ratings/scripts/publish-ecr.sh`](contract-ratings/scripts/publish-ecr.sh)
(pushes the image and the chart to ECR, tagged with the git SHA), then roll
tenants with the os_alerts repo's `scripts/cor-update-image.sh`. Full
runbook: the os_alerts repo's `COR_ADDON.md`.

## Migration notes (flat layout → this one)

- `contract-ratings/Dockerfile` → `contract-ratings/docker/Dockerfile`
  (same build context, add `-f`).
- `contract-ratings/k8s/` (flat manifests, default namespace) →
  `contract-ratings/deploy/k8s/` base + overlays, now namespaced
  `contract-ratings`. An old flat-apply deployment keeps running untouched in
  `default`; redeploy via an overlay and delete the old resources when
  convenient. The PVC does **not** move across namespaces — copy `/data` (or
  re-import) if you need its contents.
- `contract-ratings/helm/contract-ratings` →
  `contract-ratings/deploy/helm/contract-ratings`. Tenants provisioned by
  PEACEMAKER are unaffected: the provisioner installs the chart from ECR
  (OCI), not from this repo path. `publish-ecr.sh` already points at the new
  location.
- Unchanged on purpose: the legacy top-level `terraform/` (kept only until
  its AWS resources are torn down) and `contract-ratings/archive/aws/`.
