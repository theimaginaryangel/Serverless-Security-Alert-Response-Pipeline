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

**Hybrid Infrastructure as Code (IaC) & Separation of Concerns**
Why use both CloudFormation and AWS CDK? To satisfy a strict enterprise security requirement: *Separation of Concerns*.

1. **The "Dangerous" Stuff (Raw CloudFormation YAML):** IAM Roles (which control who has power) and SNS Topics (which control data leaving the AWS account) are highly sensitive. Security Teams demand these are kept in a separate, plain-text YAML file. This allows auditors to quickly read and approve the security boundaries without digging through hundreds of lines of application code. We only created two resources here because they are the only ones security cares about!
2. **The Application Plumbing (AWS CDK with TypeScript):** The queues, databases, and workflow logic (SQS, DynamoDB, Step Functions) are just the application's "plumbing." Because security teams don't need to manually audit the plumbing, developers are free to build this rapidly using TypeScript and the AWS CDK. 

To make them work together, the CDK app uses the `CfnInclude` tool to suck up the raw YAML file, seamlessly gluing the strict security foundation and the fast application logic together into one perfect deployment.
