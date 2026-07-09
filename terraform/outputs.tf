output "url" {
  description = "The app's public URL."
  value       = "https://${local.fqdn}"
}

output "instance_id" {
  value = aws_instance.cor.id
}

output "instance_public_ip" {
  description = "Elastic IP — stable across stop/start cycles."
  value       = aws_eip.cor.public_ip
}

output "ssm_session_command" {
  description = "Connect to the instance without opening SSH, via SSM Session Manager."
  value       = "aws ssm start-session --target ${aws_instance.cor.id} --region ${var.aws_region}"
}
