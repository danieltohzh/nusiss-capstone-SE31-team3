
variable "aws_repository" {
  description = "The AWS CodeCommit repository where application source code is stored."
  default     = "ap-southeast-1"
}

variable "DomainName" {
  description = "Domain name of website."
  default     = "uat-demo.link"
}

variable "HostedZoneId" {
  description = "Fixed Hosted Zone ID for CloudFront dmrp2gug4es45.cloudfront.net, not Route53, otherwise alias target name does not lie within the target zone."
  default     = "Z0291755292BE62VHLGDJ"
  #default     = "Z2FDTNDATAQYW2"
}

variable "CertificateArn" {
  description = "Arn of SSL/TLS Cert Issued by ACM in us-east-1 region."
  default     = "arn:aws:acm:us-east-1:499969923602:certificate/ff69561a-6e6d-4593-ac2f-32382fc14e65"
}

variable "neo4j_instance_type" {
  description = "The EC2 instance type for Neo4j DB."
  default     = "r5.2xlarge"
}

variable "backend_instance_type" {
  description = "The EC2 instance type for backend services and MongoDB."
  default     = "t3.medium"
}

variable "ssh_public_key" {
  description = "SSH public key."
  default     = <<EOF
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDAH2HA86HVirsxcUZAzlY5kfw7nRTCBjQbBcJG/wXKCWonuO3TtmM6X9RgUmxhDLgq+V0i+XpRXzzNn3/kdCDERAMEypAaEhS2BHcNibHTxwW6Hmi6HvHBgcUmrAeEWL9L85vVUaVb6Nf3QKXXrL8eq4tt8CFbZ3E9tXDsMVGQT070T6tldF1whdBMR6/czL0US8gqHeUDkPoNnAgNxqcLksfgivzJx7vVV3uZDVdYkhku44GocFaZFzb/MolGGL5NJo+hfsr0rwGBtPSM/57fYIqviwKYXGfs1IiI9xLPm/BGbFbTk/85RJPHBytuT86Mn6wgRaLz9VNMRfhTUyeD
EOF
}
