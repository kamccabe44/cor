resource "aws_security_group" "cor" {
  name        = "cor-tracker"
  description = "COR Tracker EC2 instance"
  vpc_id      = data.aws_vpc.default.id
  tags        = var.tags
}

resource "aws_vpc_security_group_ingress_rule" "http" {
  security_group_id = aws_security_group.cor.id
  description       = "App traffic via Traefik (k3s ingress). Proxied through the Lambda splash page; the app's own login screen is the real access boundary here, not this rule — see terraform/README.md."
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_ingress_rule" "ssh" {
  count             = var.ssh_key_name == "" ? 0 : 1
  security_group_id = aws_security_group.cor.id
  description       = "SSH (only created when ssh_key_name is set)"
  ip_protocol       = "tcp"
  from_port         = 22
  to_port           = 22
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_egress_rule" "all" {
  security_group_id = aws_security_group.cor.id
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}
