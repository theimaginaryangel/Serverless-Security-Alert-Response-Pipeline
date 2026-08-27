# Serverless Security & Compliance Response Pipeline

## The Problem
Security teams get flooded with hundreds of alerts every day. When humans have to check every single alert manually, they get "alert fatigue." By the time someone wakes up to check a critical alert at 3:00 AM—whether it is an active hacker or an accidentally exposed S3 bucket—the damage might have already been done.

## The Solution
This project is an automated AWS first responder. It is a serverless pipeline that catches security and compliance alarms, looks up helpful background information, and automatically locks down critical threats in seconds without waiting for a human.

## How It Works
The pipeline uses a 5-step workflow managed by AWS Step Functions:

1. **Catch (EventBridge & SQS):** When a security or compliance alarm goes off (like AWS Security Hub detecting an overly privileged IAM role or an exposed database), EventBridge catches it. It passes the alarm to an SQS queue so no alerts are ever dropped, even if a thousand come in at once.
2. **Investigate (Python Lambda):** The first script acts like a detective. It opens the raw alert and adds helpful background context (like finding out which developer owns the exposed S3 bucket).
3. **Judge (Python Lambda):** The second script looks at the evidence and decides if the threat is "Critical" (needs immediate lockdown) or "Low" (minor misconfiguration).
4. **Act (Python Lambda & SNS):** 
   - If the threat is **Critical**, the Quarantine script uses `boto3` to automatically attach a "Deny-All" policy to the compromised resource, isolating it instantly.
   - If the threat is **Low**, it skips the lockdown and sends an email/Slack message to the team via Amazon SNS.
5. **Audit (DynamoDB):** Every single action the system takes is permanently saved in a DynamoDB table so auditors can review exactly what happened and when.

## Architecture & Engineering Decisions

**Hybrid Infrastructure as Code (IaC)**
To follow strict security best practices, this project splits the infrastructure into two parts:
1. **The Security Foundation (Raw CloudFormation YAML):** The highly sensitive permissions (IAM Roles) and notification channels (SNS) are written in plain YAML. This allows a security team to easily read and approve the permissions without digging through application code.
2. **The Smart Application (AWS CDK with TypeScript):** The queues, databases, and workflow logic are built using modern AWS CDK. The CDK app imports the raw YAML file using the `CfnInclude` tool to glue the two pieces together seamlessly.
