# Terraform: scale-to-zero EC2 deployment

Runs the COR Tracker on a single EC2 instance that's normally **stopped**,
and wakes itself up when someone visits `cor.1136mpco.com`. Nothing about
this touches the Helm chart in `../helm/cor-tracker/` — this reuses it
as-is; it just adds the AWS plumbing (and a Docker/kubectl/Helm/k9s/k3s
install) to make the same deployment start on demand and stop itself
after `20` idle minutes.

## Architecture

```
Browser → https://cor.1136mpco.com (Route53 alias, ACM cert)
        → API Gateway (HTTP API, regional custom domain)
        → Lambda "proxy" function
              ├─ instance stopped/stopping → StartInstances, return a
              │   splash page that auto-refreshes every 8s
              ├─ instance running, app not answering yet → splash page
              └─ instance running, app answering → reverse-proxies the
                  request to http://<instance EIP> (Host header set to
                  cor.1136mpco.com so Traefik/k3s ingress routes it to
                  the app), and tags the instance LastActive=<now>

EventBridge (rate(5 min)) → Lambda "idle-stopper"
        → if instance running and LastActive tag is older than
          20 minutes → StopInstances
```

`user_data` bootstraps the instance the same way `../helm/README.md`
describes doing by hand: install Docker, `kubectl`, Helm, k9s, and k3s,
then `helm upgrade --install` the chart in `../helm/cor-tracker/` (shipped
to the instance via a private S3 bucket Terraform creates and uploads it
to). The only difference from the manual flow is where `auth.password`
comes from — an SSM SecureString here instead of typed on the command
line.

## Prerequisites

1. **The container image must already be pushed and public** — the
   `container_image` variable (`ghcr.io/kamccabe44/cor:latest` by
   default) is what gets passed to Helm as `image.repository`/`image.tag`.
   See the root `README.md` / `../Dockerfile`. The instance pulls it on
   first boot; there's no build step in this Terraform.
2. **A Route53 public hosted zone for `1136mpco.com` must already exist**
   in the AWS account/region you're applying to (`data "aws_route53_zone"`
   looks it up by name — plan will fail with a clear "no matching zone"
   error if it doesn't). If the zone lives in a different account, set
   `route53_zone_id` instead and handle the alias record there yourself.
3. **A VPC to launch into.** By default this looks for the account's
   default VPC, but plenty of accounts don't have one (AWS stopped
   creating them for new accounts a while back, and older ones are often
   deleted deliberately). If `terraform plan` fails with `no matching EC2
   VPC found`, list what you've actually got and pick one:
   ```bash
   aws ec2 describe-vpcs --query 'Vpcs[].{ID:VpcId,CIDR:CidrBlock,IsDefault:IsDefault,Name:Tags[?Key==`Name`]|[0].Value}' --output table
   ```
   then pass it via `./deploy.sh --vpc-id vpc-xxxx` (or `TF_VAR_vpc_id`).
   It auto-picks a subnet within that VPC with `map_public_ip_on_launch =
   true` (the instance needs outbound internet to install k3s and pull
   the image); pass `--subnet-id subnet-xxxx` too if that heuristic picks
   wrong or finds nothing — check with:
   ```bash
   aws ec2 describe-subnets --filters Name=vpc-id,Values=vpc-xxxx --query 'Subnets[].{ID:SubnetId,AZ:AvailabilityZone,CIDR:CidrBlock,Public:MapPublicIpOnLaunch}' --output table
   ```
4. AWS credentials for `terraform apply` — this was written and
   `terraform validate`d in a sandboxed environment with no AWS access,
   so it has **not** been plan/apply-tested against a real account.
   Review it before running.
5. Terraform >= 1.6, and the `hashicorp/aws` ~> 5.0 / `hashicorp/archive`
   ~> 2.4 providers (fetched automatically by `terraform init`).

## Usage

```bash
cd terraform
aws sso login   # or however you normally authenticate
./deploy.sh
```

`deploy.sh` runs preflight checks (terraform/AWS CLI present, AWS
credentials valid), prompts for `auth_password` if it isn't already set
via `TF_VAR_auth_password` or a `.tfvars` file (input hidden, not written
to disk), then runs `init` → `validate` → `plan` → (confirm) → `apply`,
logging everything to `./deploy-logs/` — both this script's own output
and Terraform's own `TF_LOG=DEBUG` trace, so a failure at any step is
fully captured, not just what scrolled past in the terminal.

```
./deploy.sh --plan-only          # init + plan, stop before apply
./deploy.sh --auto-approve       # skip the "type yes" prompt
./deploy.sh --log-level TRACE    # even more verbose Terraform logging
./deploy.sh --vpc-id vpc-xxxx    # use a specific VPC (see Prerequisites)
./deploy.sh --subnet-id sub-xxxx # use a specific subnet within it
./deploy.sh --destroy            # tear it all down (always confirms)
./deploy.sh --force-destroy      # tear down with no prompt at all
```

**The logs in `deploy-logs/` are gitignored but are not safe to share
as-is** — `TF_LOG=DEBUG`/`TRACE` capture provider request bodies, which
means your `auth_password` shows up in plaintext in the Terraform log
whenever the SSM parameter is created. Redact before sharing, delete
when you're done troubleshooting.

If you'd rather run Terraform directly instead of through the script:

```bash
terraform init
TF_VAR_auth_password="choose-a-strong-password" terraform plan
TF_VAR_auth_password="choose-a-strong-password" terraform apply
```

First apply takes a while: EC2 boot, then `user_data` installs k3s, waits
for it to be ready, pulls the container image, and waits for the
Deployment to roll out (up to 5 minutes) before `user_data` is considered
done. `terraform apply` itself returns once the EC2 resources exist —
it doesn't block on `user_data` finishing, so the app may not be
reachable for another couple of minutes after `apply` completes.

After that, the instance sits stopped whenever nobody's using it. Visit
`https://cor.1136mpco.com` and the splash page starts it automatically.

### Updating the app later

`user_data` only runs on first boot — stopping/starting the instance
does **not** re-run it, so a new image push doesn't show up
automatically. To pick up a new image, SSM into the box
(`terraform output ssm_session_command`) and either restart the existing
deployment to re-pull the same tag:

```bash
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
kubectl -n cor-tracker rollout restart deployment/cor-tracker
```

or bump to a new tag with Helm directly — see `../helm/README.md`:

```bash
helm upgrade cor-tracker /opt/cor-tracker-chart --namespace cor-tracker \
  --reuse-values --set image.tag=v1.3.0
```

## Cost

Rough us-east-1 numbers, light personal use (a few hours/month running):

| Item | Cost |
| --- | --- |
| EC2 t3.small, while running | ~$0.0208/hr |
| EBS gp3 20GB | ~$1.60/mo flat, regardless of instance state |
| Elastic IP | ~$3.60/mo flat (AWS bills all EIPs hourly since 2024, attached or not) |
| API Gateway HTTP API | ~$1.00 per million requests — negligible at personal scale |
| Lambda | Well within the always-free tier for this usage pattern |
| Route53 hosted zone | $0.50/mo (skip if the zone already exists for other reasons) |
| ACM certificate | Free |

Call it **$6-8/month** baseline (EBS + EIP) plus a few cents of actual
compute time, versus ~$15/month for the same instance left running
24/7 — plus whatever you'd pay for an always-on ALB if you'd gone that
route instead of the Lambda splash page.

## Security notes

- **The app's `AUTH_PASSWORD` login screen is the real access boundary
  here, not network isolation.** The EC2 security group allows inbound
  port 80 from `0.0.0.0/0` because the Lambda proxy doesn't run in a VPC
  (keeping this cheap — no NAT Gateway or VPC endpoints), so its egress
  IPs aren't fixed and can't be allowlisted. Putting the Lambda in a VPC
  with an EC2 VPC endpoint to lock this down to Lambda-only traffic is a
  reasonable next step if you want it (~$7/mo more for the endpoint) —
  ask if you want that added.
- **The Lambda-to-EC2 hop is plain HTTP**, not HTTPS. TLS is terminated
  at API Gateway (browser traffic is encrypted end to end to the edge),
  but the second hop from Lambda to the instance's Traefik ingress is
  cleartext over the public internet. For a personal/dev tool behind a
  password this is a bounded risk (same exposure as any small HTTP-only
  site), but it does mean the password itself crosses that hop in the
  clear on login. Terminating TLS on the instance too (e.g., Traefik +
  a Let's Encrypt cert) would close this gap if it matters to you.
- `auth_password` and the generated SSM SecureString are the only
  secrets here. Nothing else needs a credential baked into the image or
  the manifests.

## Destroying

```bash
./deploy.sh --destroy
```

This deletes the EC2 instance, its EBS volume, the Elastic IP, both
Lambdas, the API Gateway domain, the ACM certificate, and the S3 bucket
holding the Helm chart. It does **not** delete the Route53 hosted zone
itself (Terraform never created it, only records inside it).

The SQLite database lives on that EBS volume and goes with it — back it
up first if you care about the data:

```bash
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
POD="$(kubectl -n cor-tracker get pod -l app.kubernetes.io/name=cor-tracker -o jsonpath='{.items[0].metadata.name}')"
kubectl -n cor-tracker cp "$POD:/app/data/cor.db" ./cor.db.bak
```

(run that over the SSM session from `terraform output ssm_session_command`,
or `scp` the file off some other way.)
