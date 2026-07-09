locals {
  k8s_manifest_files = [
    "00-namespace.yaml",
    "10-pvc.yaml",
    "20-deployment.yaml",
    "30-service.yaml",
    "40-ingress.yaml",
  ]
  k8s_manifests = join("\n---\n", [for f in local.k8s_manifest_files : file("${path.module}/../k8s/${f}")])

  user_data = templatefile("${path.module}/user_data.sh.tftpl", {
    ssm_parameter_name = aws_ssm_parameter.auth_password.name
    aws_region         = var.aws_region
    k8s_manifests      = local.k8s_manifests
  })
}

resource "aws_instance" "cor" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = local.subnet_id
  vpc_security_group_ids = [aws_security_group.cor.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name
  key_name               = var.ssh_key_name != "" ? var.ssh_key_name : null

  user_data                   = local.user_data
  user_data_replace_on_change = false

  root_block_device {
    volume_size = var.root_volume_size_gb
    volume_type = "gp3"
  }

  tags = merge(var.tags, {
    Name       = "cor-tracker"
    LastActive = tostring(timestamp())
  })

  lifecycle {
    ignore_changes = [
      tags["LastActive"], # updated at runtime by the Lambdas, not by Terraform
      ami,                # avoid forced replacement when a newer Ubuntu AMI is published
    ]
  }
}

resource "aws_eip" "cor" {
  instance = aws_instance.cor.id
  domain   = "vpc"
  tags     = var.tags
}
