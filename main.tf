/* terraform -version
terraform -help
terraform init
terraform validate
terraform fmt
terraform plan
terraform apply
terraform destroy 

terraform plan -out=plan
terraform show -json plan > plan.tfgraph

First use Route53 to register domain name. That should automatically create a hosted zone.
Then use AWS Certificate Manager in N. Virginia region 
to issue a public certificate using DNS validation, by adding a CNAME record to the hosted zone.
This terraform will add an A record to the hosted zone.
*/

provider "aws" {
  region = "ap-southeast-1"

  access_key = "AKIAX-------------"
  secret_key = "eRsJr-------------------------"
}

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# CODECOMMIT REPOSITORY

resource "aws_codecommit_repository" "repository" {
  repository_name = "dsai-devops"
  description     = "Repository for frontend and backend application source codes."
}

# ARTIFACT BUCKET FOR CODEPIPELINE

resource "aws_s3_bucket" "dsai_devops" {
  bucket = "dsai-devops"
}

resource "aws_s3_bucket_ownership_controls" "dsai_devops" {
  bucket = aws_s3_bucket.dsai_devops.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "dsai_devops" {
  depends_on = [aws_s3_bucket_ownership_controls.dsai_devops]

  bucket = aws_s3_bucket.dsai_devops.id
  acl    = "private"
}

# S3 BUCKET FOR HOSTING FRONTEND APP EXPOSED VIA CLOUDFRONT

resource "aws_s3_bucket" "bucket" {
  bucket = "dsai-frontend"
}

output "frontend_bucket_name" {
  value = aws_s3_bucket.bucket.bucket
}

resource "aws_s3_bucket_ownership_controls" "example" {
  bucket = aws_s3_bucket.bucket.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_public_access_block" "example" {
  bucket = aws_s3_bucket.bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_acl" "example" {
  depends_on = [
    aws_s3_bucket_ownership_controls.example,
    aws_s3_bucket_public_access_block.example,
  ]

  bucket = aws_s3_bucket.bucket.id
  acl    = "public-read"
}

resource "aws_s3_bucket_website_configuration" "website" {
  bucket = aws_s3_bucket.bucket.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "error.html"
  }

  routing_rule {
    condition {
      key_prefix_equals = "docs/"
    }
    redirect {
      replace_key_prefix_with = "documents/"
    }
  }
}

resource "aws_s3_bucket_policy" "bucket_policy" {
  bucket = aws_s3_bucket.bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.bucket.arn}/*"
      },
    ]
  })
}

# CLOUDFRONT

resource "aws_cloudfront_distribution" "s3_distribution" {
  origin {
    domain_name = aws_s3_bucket.bucket.bucket_regional_domain_name
    origin_id   = "S3Origin"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "DSAI React App CloudFront Distribution"
  default_root_object = "index.html"

  aliases = [var.DomainName]

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3Origin"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  viewer_certificate {
    acm_certificate_arn      = var.CertificateArn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2018"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  price_class = "PriceClass_100"

  tags = {
    Environment = "production"
  }

  custom_error_response {
    error_caching_min_ttl = 0
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
  }
  custom_error_response {
    error_caching_min_ttl = 0
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
  }
}

output "cloudfront_distribution_id" {
  description = "The ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.s3_distribution.id
}

resource "aws_cloudfront_origin_access_identity" "oai" {
  comment = "DSAI react app bucket's OAI"
}

resource "aws_route53_record" "www" {
  zone_id = var.HostedZoneId
  name    = var.DomainName
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.s3_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.s3_distribution.hosted_zone_id
    evaluate_target_health = false
  }
}

# CODEBUILD FOR FRONTEND

resource "aws_codebuild_project" "codebuild_frontend" {
  name          = "dsai-frontend"
  description   = "CodeBuild project for frontend"
  build_timeout = "5"
  service_role  = aws_iam_role.codebuild_service_role.arn

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/standard:4.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "AWS_REGION"
      value = "ap-southeast-1"
    }
  }

  /*
  source {
    type            = "GITHUB"
    location        = "https://github.com/danieltohzh/vidly-react-tutorial.git"
    git_clone_depth = 1
  }
  */
  source {
    type            = "CODECOMMIT"
    location = aws_codecommit_repository.repository.clone_url_http
    buildspec       = "buildspec-frontend.yml"
    git_clone_depth = 1
  }
}

# CODEBUILD FOR BACKEND

resource "aws_codebuild_project" "codebuild_backend" {
  name          = "dsai-backend"
  description   = "CodeBuild project for backend"
  build_timeout = "30"
  service_role  = aws_iam_role.codebuild_service_role.arn

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/standard:5.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "AWS_REGION"
      value = "ap-southeast-1"
    }
  }

  source {
    type            = "CODECOMMIT"
    location = aws_codecommit_repository.repository.clone_url_http
    buildspec       = "buildspec-backend.yml"
    git_clone_depth = 1
  }
}

# CODEBUILD FOR FLASKAPP

resource "aws_codebuild_project" "codebuild_flaskapp" {
  name          = "dsai-flaskapp"
  description   = "CodeBuild project for flaskapp"
  build_timeout = "30"
  service_role  = aws_iam_role.codebuild_service_role.arn

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/standard:5.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "AWS_REGION"
      value = "ap-southeast-1"
    }
  }

  source {
    type            = "CODECOMMIT"
    location = aws_codecommit_repository.repository.clone_url_http
    buildspec       = "buildspec-flask.yml"
    git_clone_depth = 1
  }
}

# EC2 AND CODEDEPLOY FOR FLASKAPP 
# terraform taint aws_instance.flask_app_instance
/*
resource "aws_instance" "flask_app_instance" {
  ami           = "ami-0a6b545f62129c495" # Replace with a valid AMI ID
  instance_type = "g4dn.xlarge"
  key_name      = "ISS-DSAI-Neo4j" # Replace with your key pair name
  
  #vpc_security_group_ids = [aws_security_group.flask_app_sg.id]
  
  subnet_id              = aws_subnet.public-ap-southeast-1a.id

  user_data = <<-EOF
              #!/bin/bash
              apt-get update
              apt-get install -y ruby wget
              cd /home/ubuntu
              wget https://aws-codedeploy-us-west-2.s3.us-west-2.amazonaws.com/latest/install
              chmod +x ./install
              ./install auto
              service codedeploy-agent start
              EOF

  tags = {
    Name = "DsaiFlaskAppInstance"
  }
}
*/

resource "aws_codedeploy_app" "flask_app" {
  name = "dsai-FlaskApp"
}

resource "aws_codedeploy_deployment_group" "flask_app_deployment_group" {
  app_name              = aws_codedeploy_app.flask_app.name
  deployment_group_name = "FlaskAppDeploymentGroup"
  service_role_arn      = aws_iam_role.codedeploy_role.arn

  deployment_config_name = "CodeDeployDefault.OneAtATime"

  ec2_tag_set {
    ec2_tag_filter {
      key   = "Name"
      type  = "KEY_AND_VALUE"
      value = "DsaiFlaskAppInstance"
    }
  }

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE"]
  }
}

resource "aws_iam_role" "codedeploy_role" {
  name = "CodeDeployServiceRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Service = "codedeploy.amazonaws.com"
        },
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_policy" "codedeploy_policy" {
  name = "CodeDeployPolicy"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "ec2:Describe*",
          "s3:Get*",
          "s3:List*",
          "autoscaling:Describe*",
          "autoscaling:UpdateAutoScalingGroup",
          "cloudwatch:Describe*",
          "cloudwatch:Get*",
          "cloudwatch:List*",
          "cloudwatch:PutMetricData",
          "codedeploy:*",
          "sns:Publish"
        ],
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "codedeploy_policy_attachment" {
  role       = aws_iam_role.codedeploy_role.name
  policy_arn = aws_iam_policy.codedeploy_policy.arn
}

# CODEPIPELINE

resource "aws_codepipeline" "pipeline" {
  name     = "dsai-devops"
  role_arn = aws_iam_role.codepipeline_service_role.arn

  artifact_store {
    location = aws_s3_bucket.dsai_devops.bucket
    type     = "S3"
  }

  stage {
    name = "Source"

    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeCommit"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        RepositoryName = aws_codecommit_repository.repository.repository_name
        BranchName     = "master"
      }
    }
  }
  /*
  stage {
    name = "Deploy-Flaskapp"

    action {
      name             = "Deploy"
      category         = "Deploy"
      owner            = "AWS"
      provider         = "CodeDeploy"
      version          = "1"
      input_artifacts  = ["source_output"]

      configuration = {
        ApplicationName     = aws_codedeploy_app.flask_app.name
        DeploymentGroupName = aws_codedeploy_deployment_group.flask_app_deployment_group.deployment_group_name
      }
    }
  }
  */

  stage {
    name = "Build-Flaskapp"

    action {
      name             = "BuildFlaskapp"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      input_artifacts  = ["source_output"]
      output_artifacts = ["buildflaskapp_output"]
      version          = "1"

      configuration = {
        ProjectName = aws_codebuild_project.codebuild_flaskapp.name
      }
    }
  }

  stage {
    name = "Build-Backend"

    action {
      name             = "BuildBackend"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      input_artifacts  = ["source_output"]
      output_artifacts = ["buildbackend_output"]
      version          = "1"

      configuration = {
        ProjectName = aws_codebuild_project.codebuild_backend.name
      }
    }
  }

  stage {
    name = "Build-Frontend"

    action {
      name             = "BuildFrontend"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      input_artifacts  = ["source_output"]
      output_artifacts = ["buildfrontend_output"]
      version          = "1"

      configuration = {
        ProjectName = aws_codebuild_project.codebuild_frontend.name
      }
    }
  }

/*
  stage {
    name = "Deploy"

    action {
      name            = "Deploy"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "CodeDeployToEC2"
      input_artifacts = ["build_output"]
      version         = "1"

      configuration = {
        ApplicationName  = aws_codedeploy_app.example.name
        DeploymentGroupName = aws_codedeploy_deployment_group.example.deployment_group_name
      }
    }
  }
*/

}

# SERVICE ROLES FOR CODEPIPELINE AND CODEBUILD PROJECT

resource "aws_iam_role" "codepipeline_service_role" {
  name = "CodePipelineServiceRole_DSAI_DevOps"
  path = "/"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "codepipeline.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      },
      {
        Effect = "Allow"
        Principal = {
          Service = "cloudformation.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "codepipeline_policy" {
  name = "codepipeline-access"
  role = aws_iam_role.codepipeline_service_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Resource = "*"
        Effect   = "Allow"
        Action   = [
          "cloudformation:*",
          "codebuild:StartBuild",
          "codebuild:BatchGetBuilds",
          "cloudfront:UpdateDistribution",
          "cloudfront:DeleteDistribution",
          "cloudfront:CreateInvalidation",
          "codecommit:*",
          "sns:*",
          "elasticloadbalancing:*",
          "application-autoscaling:*",
          "acm:*",
          "cloudwatch:*",
          "logs:*",
          "iam:CreateRole",
          "iam:GetRole",
          "iam:ListRoleTags",
          "iam:UntagRole",
          "iam:TagRole",
          "iam:DeleteRolePolicy",
          "iam:PutRolePolicy",
          "iam:PassRole",
          "execute-api:*",
          "lambda:*",
          "dynamodb:*",
          "s3:*",
		  "codedeploy:CreateDeployment",
          "codedeploy:GetApplication",
          "codedeploy:GetApplicationRevision",
          "codedeploy:GetDeployment",
          "codedeploy:GetDeploymentConfig",
          "codedeploy:RegisterApplicationRevision"
        ]
      }
    ]
  })
}

resource "aws_iam_role" "codebuild_service_role" {
  name = "CodeBuildServiceRole_DSAI_DevOps"
  path = "/"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "codebuild.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "codebuild_eks_cluster_policy" {
  role       = aws_iam_role.codebuild_service_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

resource "aws_iam_role_policy_attachment" "codebuild_eks_worker_node_policy" {
  role       = aws_iam_role.codebuild_service_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

resource "aws_iam_role_policy_attachment" "codebuild_ecr_full_access" {
  role       = aws_iam_role.codebuild_service_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess"
}

resource "aws_iam_role_policy" "codebuild_policy" {
  name = "root"
  role = aws_iam_role.codebuild_service_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Resource = "*"
        Effect   = "Allow"
        Action   = [
          "cloudfront:UpdateDistribution",
          "cloudfront:DeleteDistribution",
          "cloudfront:CreateInvalidation",
          "logs:*",
          "events:*",
          "iam:*",
          "logs:CreateLogGroup",
          "logs:DeleteLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:GetRole",
          "iam:ListRoleTags",
          "iam:UntagRole",
          "iam:TagRole",
          "iam:DeleteRolePolicy",
          "iam:PutRolePolicy",
          "iam:GetRolePolicy",
          "iam:PassRole",
          "s3:GetObject",
          "s3:PutObject",
          "s3:GetObjectVersion",
          "cloudformation:*",
          "apigateway:*",
          "execute-api:*",
          "lambda:*",
          "dynamodb:*",
          "s3:*",
          "eks:*",
          "ecr:*",
          "iam:CreateServiceLinkedRole",
          "secretsmanager:GetSecretValue"
        ]
      }
    ]
  })
}

# EKS cluster of EC2 to run containers based on ECR images 

# Create a VPC

resource "aws_vpc" "k8svpc" {
  cidr_block = "192.168.0.0/16"
  tags = {
    Name = "k8svpc"
  }
}

# Internet Gateway

resource "aws_internet_gateway" "k8svpc-igw" {
  vpc_id = aws_vpc.k8svpc.id

  tags = {
    Name = "k8svpc-igw"
  }
}

# private subnet 01

resource "aws_subnet" "private-ap-southeast-1a" {
  vpc_id            = aws_vpc.k8svpc.id
  cidr_block        = "192.168.0.0/19"
  availability_zone = "ap-southeast-1a"

  tags = {
    Name                              = "private-ap-southeast-1a"
    "kubernetes.io/role/internal-elb" = "1"
    "kubernetes.io/cluster/issdsai"      = "owned"
  }
}

# private subnet 02

resource "aws_subnet" "private-ap-southeast-1b" {
  vpc_id            = aws_vpc.k8svpc.id
  cidr_block        = "192.168.32.0/19"
  availability_zone = "ap-southeast-1b"

  tags = {
    Name                              = "private-ap-southeast-1b"
    "kubernetes.io/role/internal-elb" = "1"
    "kubernetes.io/cluster/issdsai"      = "owned"
  }
}

# public subnet 01

resource "aws_subnet" "public-ap-southeast-1a" {
  vpc_id                  = aws_vpc.k8svpc.id
  cidr_block              = "192.168.64.0/19"
  availability_zone       = "ap-southeast-1a"
  map_public_ip_on_launch = true

  tags = {
    Name                         = "public-ap-southeast-1a"
    "kubernetes.io/role/elb"     = "1" #this instruct the kubernetes to create public load balancer in these subnets
    "kubernetes.io/cluster/issdsai" = "owned"
  }
}

# public subnet 02

resource "aws_subnet" "public-ap-southeast-1b" {
  vpc_id                  = aws_vpc.k8svpc.id
  cidr_block              = "192.168.96.0/19"
  availability_zone       = "ap-southeast-1b"
  map_public_ip_on_launch = true

  tags = {
    Name                         = "public-ap-southeast-1b"
    "kubernetes.io/role/elb"     = "1" #this instruct the kubernetes to create public load balancer in these subnets
    "kubernetes.io/cluster/issdsai" = "owned"
  }
}

# NAT Gateway

resource "aws_eip" "nat" {
  vpc = true

  tags = {
    Name = "nat"
  }
}

resource "aws_nat_gateway" "k8s-nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public-ap-southeast-1a.id

  tags = {
    Name = "k8s-nat"
  }

  depends_on = [aws_internet_gateway.k8svpc-igw]
}

# routing table
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.k8svpc.id

  route {
      cidr_block                 = "0.0.0.0/0"
      nat_gateway_id             = aws_nat_gateway.k8s-nat.id
    }

  tags = {
    Name = "private"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.k8svpc.id

  route {
      cidr_block                 = "0.0.0.0/0"
      gateway_id                 = aws_internet_gateway.k8svpc-igw.id
    }

  tags = {
    Name = "public"
  }
}

# routing table association

resource "aws_route_table_association" "private-ap-southeast-1a" {
  subnet_id      = aws_subnet.private-ap-southeast-1a.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private-ap-southeast-1b" {
  subnet_id      = aws_subnet.private-ap-southeast-1b.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "public-ap-southeast-1a" {
  subnet_id      = aws_subnet.public-ap-southeast-1a.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public-ap-southeast-1b" {
  subnet_id      = aws_subnet.public-ap-southeast-1b.id
  route_table_id = aws_route_table.public.id
}

# IAM role for eks

resource "aws_iam_role" "issdsai" {
  name = "eks-cluster-issdsai"
  tags = {
    tag-key = "eks-cluster-issdsai"
  }

  assume_role_policy = <<POLICY
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": [
                    "eks.amazonaws.com"
                ]
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
POLICY
}

# eks policy attachment

resource "aws_iam_role_policy_attachment" "issdsai-AmazonEKSClusterPolicy" {
  role       = aws_iam_role.issdsai.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

# bare minimum requirement of eks

resource "aws_eks_cluster" "issdsai" {
  name     = "issdsai"
  role_arn = aws_iam_role.issdsai.arn

  vpc_config {
    subnet_ids = [
      aws_subnet.private-ap-southeast-1a.id,
      aws_subnet.private-ap-southeast-1b.id,
      aws_subnet.public-ap-southeast-1a.id,
      aws_subnet.public-ap-southeast-1b.id
    ]
  }

  depends_on = [aws_iam_role_policy_attachment.issdsai-AmazonEKSClusterPolicy]
}

# role for nodegroup

resource "aws_iam_role" "nodes" {
  name = "eks-node-group-nodes"

  assume_role_policy = jsonencode({
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
    Version = "2012-10-17"
  })
}

# IAM policy attachment to nodegroup

resource "aws_iam_role_policy_attachment" "nodes-AmazonEKSWorkerNodePolicy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.nodes.name
}

resource "aws_iam_role_policy_attachment" "nodes-AmazonEKS_CNI_Policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.nodes.name
}

resource "aws_iam_role_policy_attachment" "nodes-AmazonEC2ContainerRegistryReadOnly" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.nodes.name
}

# aws node group 

resource "aws_eks_node_group" "private-nodes" {
  cluster_name    = aws_eks_cluster.issdsai.name
  node_group_name = "private-nodes"
  node_role_arn   = aws_iam_role.nodes.arn

  subnet_ids = [
    aws_subnet.private-ap-southeast-1a.id,
    aws_subnet.private-ap-southeast-1b.id
  ]

  capacity_type  = "ON_DEMAND"
  instance_types = ["g4dn.xlarge"]
  # t3a.small

  scaling_config {
    desired_size = 1
    max_size     = 3
    min_size     = 0
  }

  update_config {
    max_unavailable = 1
  }

  labels = {
    node = "kubenode02"
  }

  # taint {
  #   key    = "team"
  #   value  = "devops"
  #   effect = "NO_SCHEDULE"
  # }

  # launch_template {
  #   name    = aws_launch_template.eks-with-disks.name
  #   version = aws_launch_template.eks-with-disks.latest_version
  # }

  depends_on = [
    aws_iam_role_policy_attachment.nodes-AmazonEKSWorkerNodePolicy,
    aws_iam_role_policy_attachment.nodes-AmazonEKS_CNI_Policy,
    aws_iam_role_policy_attachment.nodes-AmazonEC2ContainerRegistryReadOnly,
  ]
}

# launch template if required

# resource "aws_launch_template" "eks-with-disks" {
#   name = "eks-with-disks"

#   key_name = "local-provisioner"

#   block_device_mappings {
#     device_name = "/dev/xvdb"

#     ebs {
#       volume_size = 50
#       volume_type = "gp2"
#     }
#   }
# }

# OpenID connect provider to grant permission  
# based on the service account used by cluster auto-scaler to scale nodes

data "tls_certificate" "eks" {
  url = aws_eks_cluster.issdsai.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.issdsai.identity[0].oidc[0].issuer
}

data "aws_iam_policy_document" "eks_cluster_autoscaler_assume_role_policy" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    effect  = "Allow"

    condition {
      test     = "StringEquals"
      variable = "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:sub"
      values   = ["system:serviceaccount:kube-system:cluster-autoscaler"]
    }

    principals {
      identifiers = [aws_iam_openid_connect_provider.eks.arn]
      type        = "Federated"
    }
  }
}

resource "aws_iam_role" "eks_cluster_autoscaler" {
  assume_role_policy = data.aws_iam_policy_document.eks_cluster_autoscaler_assume_role_policy.json
  name               = "eks-cluster-autoscaler"
}

resource "aws_iam_policy" "eks_cluster_autoscaler" {
  name = "eks-cluster-autoscaler"

  policy = jsonencode({
    Statement = [{
      Action = [
                "autoscaling:DescribeAutoScalingGroups",
                "autoscaling:DescribeAutoScalingInstances",
                "autoscaling:DescribeLaunchConfigurations",
                "autoscaling:DescribeTags",
                "autoscaling:SetDesiredCapacity",
                "autoscaling:TerminateInstanceInAutoScalingGroup",
                "ec2:DescribeLaunchTemplateVersions"
            ]
      Effect   = "Allow"
      Resource = "*"
    }]
    Version = "2012-10-17"
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_autoscaler_attach" {
  role       = aws_iam_role.eks_cluster_autoscaler.name
  policy_arn = aws_iam_policy.eks_cluster_autoscaler.arn
}

output "eks_cluster_autoscaler_arn" {
  value = aws_iam_role.eks_cluster_autoscaler.arn
}

# Application Load Balancer

resource "aws_route53_record" "www_api" {
  zone_id = var.HostedZoneId
  name    = "api.uat-demo.link"
  type    = "A"

  alias {
    name                   = "k8s-default-nodejsap-d470693775-250051671.ap-southeast-1.elb.amazonaws.com"
    zone_id                = "Z1LMS91P8CMLE5"
    evaluate_target_health = false
  }
}

# nslookup api.uat-demo.link

# choco install -y kubernetes-cli
# choco install -y eksctl
# choco install -y kubernetes-helm

# eksctl utils associate-iam-oidc-provider --region ap-southeast-1 --cluster issdsai --approve

# curl -o iam_policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.2.0/docs/install/iam_policy.json
# aws iam create-policy --policy-name AWSLoadBalancerControllerIAMPolicy --policy-document file://iam_policy.json

## use IAM to add "elasticloadbalancing:AddTags" to above policy before executing below

# eksctl create iamserviceaccount --cluster issdsai --namespace kube-system --name aws-load-balancer-controller --attach-policy-arn arn:aws:iam::499969923602:policy/AWSLoadBalancerControllerIAMPolicy --override-existing-serviceaccounts --approve

# helm repo add eks https://aws.github.io/eks-charts
# kubectl apply -k "github.com/kubernetes-sigs/aws-load-balancer-controller/config/crd"
# helm upgrade -i aws-load-balancer-controller eks/aws-load-balancer-controller -n kube-system --set clusterName=issdsai --set serviceAccount.create=false --set serviceAccount.name=aws-load-balancer-controller

# kubectl logs -n kube-system deployment.apps/aws-load-balancer-controller

