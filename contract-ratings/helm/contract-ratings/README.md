# `contract-ratings` Helm chart

One self-contained **Contract Ratings (COR)** instance for a **single tenant**.
It's the container build from [`../../DOCKER_K8S.md`](../../DOCKER_K8S.md) —
a Node + `node:sqlite` process behind a shared password — packaged so the
`os_alerts` app can deploy one instance per customer on demand when they enable
the COR add-on.

Each customer gets their own release (`cor-<subdomain>`), PVC, password, and
host (`cor.<subdomain>.<base_domain>`). Instances are fully independent of each
other and of `os_alerts` — this chart only shares the container image.

## What it creates

| Resource   | Purpose                                                        |
| ---------- | ------------------------------------------------------------- |
| Deployment | one replica (`Recreate`), SQLite is single-writer            |
| Service    | ClusterIP, reached only via the Ingress                       |
| Ingress    | Traefik, host `ingress.host`, TLS via cert-manager           |
| PVC        | `/data` (SQLite DB + PWS files), `helm.sh/resource-policy: keep` |
| Secret     | `APP_PASSWORD` (+ optional `APP_SESSION_SECRET`)             |

## Required values

| Value               | Example                                                     |
| ------------------- | ----------------------------------------------------------- |
| `tenant`            | `1136` (the os_alerts account subdomain)                    |
| `image.repository`  | `<acct>.dkr.ecr.us-east-1.amazonaws.com/contract-ratings`   |
| `auth.appPassword`  | a generated per-tenant password                             |
| `ingress.host`      | `cor.1136.31traino.com`                                      |

## Install (what the provisioner runs)

```bash
helm upgrade --install cor-1136 ./contract-ratings/helm/contract-ratings \
  --namespace cor-tenants --create-namespace \
  --set tenant=1136 \
  --set image.repository=<acct>.dkr.ecr.us-east-1.amazonaws.com/contract-ratings \
  --set image.tag=latest \
  --set ingress.host=cor.1136.31traino.com \
  --set-string auth.appPassword='<generated>' \
  --wait --timeout 5m
```

Uninstall (add-on disabled): `helm uninstall cor-1136 -n cor-tenants`. The PVC
is kept by default (`helm.sh/resource-policy: keep`) so re-enabling restores the
tenant's data; delete the PVC explicitly to wipe it.

## Prerequisites on the cluster

- A cert-manager `ClusterIssuer` named by `ingress.clusterIssuer`
  (default `letsencrypt-prod`), created by `scripts/k3s-setup.sh`.
- The host in `ingress.host` must resolve to the k3s box so the HTTP-01
  challenge validates — the `os_alerts` provisioner creates that Route53
  A-record when the add-on is enabled.
- The node must be able to pull `image.repository` (ECR via the node's
  instance role, or an `imagePullSecrets` entry).

> Validate changes with `helm lint` and
> `helm template cor-1136 . --set tenant=1136 --set image.repository=x --set ingress.host=cor.1136.example.com --set-string auth.appPassword=x`
> before deploying.
