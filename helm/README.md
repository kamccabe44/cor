# Helm chart: cor-tracker

Deploys the COR Tracker to any Kubernetes cluster — this repo uses it on
[k3s](https://k3s.io), but nothing about the chart is k3s-specific except
the default `ingress.className: traefik` and `persistence.storageClassName:
local-path`, both of which k3s ships out of the box.

The `terraform/` deployment uses this chart automatically (it ships it to
the EC2 instance via S3 and runs `helm upgrade --install` in `user_data`).
This README is for deploying it by hand to any other k3s box — a local
VM, a bare AWS Ubuntu instance you set up yourself, whatever.

## Prerequisites

- A running k3s cluster (`curl -sfL https://get.k3s.io | sh -`)
- `kubectl` and `helm` on your path, pointed at it:
  ```bash
  export KUBECONFIG=/etc/rancher/k3s/k3s.yaml   # or sudo k3s kubectl / copy it out
  ```
- The container image already pushed and public — see the root
  [`README.md`](../README.md) and `../Dockerfile`. The chart's default
  (`ghcr.io/kamccabe44/cor:latest`) matches what that Dockerfile builds.

## Install

```bash
cd helm
helm upgrade --install cor-tracker ./cor-tracker \
  --namespace cor-tracker --create-namespace \
  --set-string auth.password='choose-a-strong-password' \
  --wait --timeout 5m
```

`auth.password` is required — the chart deliberately fails to render
without it (`helm template` will error with `auth.password is required`),
since an *empty* `AUTH_PASSWORD` silently disables the app's login gate
rather than failing safe. Don't put a real password in `values.yaml` or
any file you commit; pass it on the command line or from a secret store.

Everything else has a sane default — see `cor-tracker/values.yaml`. The
common ones to override:

```bash
helm upgrade --install cor-tracker ./cor-tracker \
  --namespace cor-tracker --create-namespace \
  --set-string auth.password='choose-a-strong-password' \
  --set image.tag=v1.2.3 \
  --set ingress.host=cor.example.com \
  --set persistence.size=5Gi \
  --wait --timeout 5m
```

## Upgrading

Same command, run again — `helm upgrade --install` is idempotent. The
Deployment uses `strategy: Recreate` (not `RollingUpdate`) on purpose:
SQLite only supports one writer, so briefly running two pods against the
same PVC during a rolling update would corrupt the database. Expect a
few seconds of downtime on every upgrade.

```bash
helm upgrade cor-tracker ./cor-tracker --namespace cor-tracker \
  --reuse-values --set image.tag=v1.3.0
```

(`--reuse-values` keeps `auth.password` and anything else you don't
explicitly override — otherwise every upgrade needs the full `--set`
list again, since Helm doesn't remember prior `--set` flags on its own.)

## Uninstalling

```bash
helm uninstall cor-tracker --namespace cor-tracker
```

This deletes the Deployment, Service, Ingress, and Secret, but **not**
the PVC (Kubernetes doesn't delete PVCs on their own — that's
deliberate, so an accidental `helm uninstall` doesn't take your data
with it). Delete it explicitly if you actually want the data gone:

```bash
kubectl -n cor-tracker delete pvc cor-data
```

## Inspecting what would change

```bash
helm template cor-tracker ./cor-tracker --set-string auth.password=x | less
helm diff upgrade cor-tracker ./cor-tracker --namespace cor-tracker --reuse-values   # needs the helm-diff plugin
```
