# variables.tf
# Inputs for the bb-brackets Lambda stack. Secrets come from terraform.tfvars,
# which is gitignored; terraform.tfvars.example lists every one.

# ---------- Identity and tagging ----------

variable "service_name" {
  description = "Lambda, API, and pipeline base name"
  type        = string
  default     = "bb-brackets"
}

variable "project" {
  description = "Project tag"
  type        = string
  default     = "busterbrackets"
}

variable "owner" {
  description = "Owner tag"
  type        = string
  default     = "jduffey"
}

variable "environment" {
  description = "Environment tag"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "aws_region" {
  description = "Region for every resource, including the regional ACM certificate"
  type        = string
  default     = "us-east-2"
}

# ---------- Source and deploy ----------

variable "github_owner" {
  description = "GitHub account that owns the repo"
  type        = string
  default     = "jduffey1990"
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "busterbrackets-app-brackets"
}

variable "github_branch" {
  description = "Branch that deploys to production on push"
  type        = string
  default     = "main"
}

variable "codestar_connection_arn" {
  description = "Existing AVAILABLE GitHub connection (duffey-connect). Reused, not created here."
  type        = string
}

# ---------- Lambda ----------

variable "lambda_runtime" {
  description = "Lambda runtime. Keep in step with buildspec.yml and the Dockerfile."
  type        = string
  default     = "nodejs22.x"
}

variable "lambda_memory" {
  description = "Memory in MB. CPU scales with it, so more memory also shortens cold starts."
  type        = number
  default     = 1024
}

variable "lambda_timeout" {
  description = "Seconds. Sized for the synchronous OpenAI breakdown (aborts at 20s, see breakdownService.ts) under API Gateway's 30s cap."
  type        = number
  default     = 29

  validation {
    condition     = var.lambda_timeout <= 29
    error_message = "API Gateway HTTP APIs cut every request at 30s; a longer Lambda timeout only hides failures."
  }
}

variable "reserved_concurrency" {
  description = "Blast-radius cap on concurrent executions; requests past it get 429."
  type        = number
  default     = 25
}

variable "log_retention_days" {
  description = "CloudWatch retention for Lambda and API access logs"
  type        = number
  default     = 14
}

# ---------- Domain ----------

variable "hosted_zone_name" {
  description = "Route 53 public zone in this account"
  type        = string
  default     = "busterbrackets.com"
}

variable "api_domain_name" {
  description = "Client-facing API hostname"
  type        = string
  default     = "brackets-api.busterbrackets.com"
}

# ---------- Monitoring ----------

variable "alert_email" {
  description = "Receives alarm notifications. Confirm the SNS subscription email after the first apply."
  type        = string
}

# ---------- App configuration (Lambda environment) ----------

variable "node_env" {
  description = "NODE_ENV for the Lambda"
  type        = string
  default     = "production"
}

variable "mongo_uri" {
  description = "Atlas connection string"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "Verifies user JWTs. Must match the users service exactly or every request is a 401."
  type        = string
  sensitive   = true
}

variable "admin_user_id" {
  description = "Mongo _id of the one account allowed to write tournament data"
  type        = string
}

variable "openai_api_key" {
  description = "OpenAI key for the bracket breakdown narrative"
  type        = string
  sensitive   = true
}
