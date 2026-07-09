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

output "notifications_topic_arn" {
  description = "SNS topic the proxy/idle-stopper Lambdas publish start/stop notifications to."
  value       = aws_sns_topic.notifications.arn
}

output "notification_email_reminder" {
  description = "SNS emails a confirmation link on first apply -- notifications silently don't arrive until it's clicked."
  value       = "Check ${var.notification_email} for an AWS SNS subscription confirmation email and click 'Confirm subscription' -- notifications won't be delivered until you do."
}
