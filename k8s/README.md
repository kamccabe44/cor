# Running on k3s

Personal/dev deployment for the COR Contract Tracker on
[k3s](https://k3s.io). Works the same way whether the cluster is on your
laptop or a single Ubuntu box on AWS — k3s ships with a local-path
storage provisioner (used by `10-pvc.yaml`) and Traefik as its ingress
controller, so nothing extra needs to be installed for either.

**No built-in login.** This app has no authentication — anyone who can
reach the Service can view and edit your contract data. That's fine on
your laptop, but if you put it on an AWS box, lock the security group
down to your own IP (or put it behind a WireGuard/SSH tunnel) rather than
opening it to `0.0.0.0/0`. Don't expose it publicly as-is.

## 1. Install k3s

Same command locally or on an Ubuntu EC2 instance:

```bash
curl -sfL https://get.k3s.io | sh -
sudo k3s kubectl get nodes   # sanity check
```

On AWS: use an Ubuntu AMI, open **only your own IP** for port 6443 (API
server) and whatever port you'll reach the app on (80/443 if using
Ingress, or your chosen NodePort) in the security group. Copy the
kubeconfig back to your workstation if you want to run `kubectl` from
there instead of SSHing in:

```bash
scp ubuntu@<ec2-ip>:/etc/rancher/k3s/k3s.yaml ~/.kube/config
sed -i '' "s/127.0.0.1/<ec2-ip>/" ~/.kube/config   # macOS sed; drop '' on Linux
```

## 2. Build and publish the image

The Dockerfile at the repo root builds a standalone Next.js image. Push
it somewhere both your local cluster and the AWS box can pull from — GHCR
is the natural choice since the code already lives on GitHub:

```bash
docker build -t ghcr.io/kamccabe44/cor:latest .
echo "$GITHUB_TOKEN" | docker login ghcr.io -u kamccabe44 --password-stdin
docker push ghcr.io/kamccabe44/cor:latest
```

`$GITHUB_TOKEN` needs a PAT with `write:packages`. After the first push,
make the package public (GitHub → your profile → Packages → cor →
Package settings → Change visibility) so the cluster can pull it without
an `imagePullSecret`. If you'd rather keep it private, create one:

```bash
kubectl create namespace cor-tracker
kubectl -n cor-tracker create secret docker-registry ghcr-pull \
  --docker-server=ghcr.io --docker-username=kamccabe44 \
  --docker-password="$GITHUB_TOKEN"
```

and add `imagePullSecrets: [{name: ghcr-pull}]` to the pod spec in
`20-deployment.yaml`.

**Pure local dev, no registry:** if you're only ever running this on a
single local k3s node, you can skip the registry entirely — build the
image and import it straight into k3s's containerd:

```bash
docker build -t cor-tracker:local .
docker save cor-tracker:local | sudo k3s ctr images import -
```

Then set `image: cor-tracker:local` and `imagePullPolicy: Never` in
`20-deployment.yaml`.

## 3. Deploy

```bash
kubectl apply -k k8s/
# or, without kustomize (the filenames are numbered for correct ordering):
kubectl apply -f k8s/00-namespace.yaml -f k8s/10-pvc.yaml \
  -f k8s/20-deployment.yaml -f k8s/30-service.yaml -f k8s/40-ingress.yaml

kubectl -n cor-tracker rollout status deployment/cor-tracker
```

The Deployment runs a single replica with `strategy: Recreate` on
purpose: SQLite only supports one writer, so a rolling update briefly
running two pods against the same PVC would corrupt the database. The
old pod is fully terminated before the new one starts, meaning there's a
few seconds of downtime on every deploy — acceptable for a personal tool.

## 4. Access it

Zero-config option, works anywhere `kubectl` can reach the cluster:

```bash
kubectl -n cor-tracker port-forward svc/cor-tracker 8080:80
```

then open <http://localhost:8080>.

Or via the Traefik Ingress (`40-ingress.yaml`, host `cor.localhost` by
default — edit it to your EC2 public IP or a real hostname if deploying
to AWS):

```bash
echo "127.0.0.1 cor.localhost" | sudo tee -a /etc/hosts   # local only
```

then open <http://cor.localhost>.

## 5. Updating after a code change

```bash
docker build -t ghcr.io/kamccabe44/cor:latest . && docker push ghcr.io/kamccabe44/cor:latest
kubectl -n cor-tracker rollout restart deployment/cor-tracker
```

## 6. Backing up the data

The SQLite file lives on the `cor-data` PVC, mounted at `/app/data` in
the pod. To pull a copy:

```bash
kubectl -n cor-tracker cp \
  $(kubectl -n cor-tracker get pod -l app=cor-tracker -o jsonpath='{.items[0].metadata.name}'):/app/data/cor.db \
  ./cor.db.bak
```
