# Serverless Security Alert Response Pipeline (SSARP)

An event-driven, automated security triage and incident containment pipeline built on AWS. Automatically ingests security findings, enriches alerts with context, triages severity, applies automated quarantine to compromised resources, and visualizes incident state on an enterprise dashboard.

---

## Architecture Overview

```
[ Security Hub / Simulated Event ]
               │
               ▼
       [ EventBridge Rule ]
               │
               ▼
         [ Amazon SQS Queue ]
               │
               ▼
     [ Dispatcher Worker (Lambda) ]
               │
               ▼
     [ Step Functions Flow ]
       ├── 1. Enrichment Worker (Python Lambda)
       ├── 2. Severity Evaluation Worker (Python Lambda)
       └── 3. Choice: Severity == CRITICAL?
               ├── YES: Quarantine Worker (Python Lambda)
               │         ├── Guardrail Check (Protected Role Allowlist)
               │         ├── Attach DenyAll Policy (AWS IAM)
               │         └── Audit Persistence (DynamoDB)
               └── NO:  Notification Dispatch (Amazon SNS)
                               │
                               ▼
               [ Next.js Management Dashboard ]
                 ├── Dynamic SSM Parameter Discovery
                 ├── Live Threat Feed & Compliance Status
                 ├── Interactive Attack Simulation Engine
                 └── Sandbox Data Purge
```

---

## Core Components

### 1. Hybrid Infrastructure as Code (IaC)
- **Foundation Layer (Raw CloudFormation YAML):** Declares critical security boundaries (IAM execution roles and SNS alert topics) in clean declarative YAML to allow independent security auditing.
- **Application Layer (AWS CDK v2 TypeScript):** Declares dynamic cloud services (Step Functions state machine, EventBridge rules, SQS queues, DynamoDB table, Lambda workers) using `CfnInclude` to merge the foundation template.
- **CI/CD Pipeline Layer (AWS CodePipeline):** GitOps-driven automated build and deployment pipeline connected to GitHub via AWS CodeStar Connections. Every push to `main` triggers a complete synth and CloudFormation deployment.

### 2. Event Routing, State Machine & Automated Containment
- **Buffered Dispatch (`lambdas/dispatcher.py`):** SQS event source mapping reads queued EventBridge alerts and invokes Step Functions to prevent dropped alerts during burst traffic.
- **Enrichment (`lambdas/enrichment.py`):** Extracts resource IDs, finding types, descriptions, and metadata from raw AWS Security Hub payloads.
- **Severity Evaluation (`lambdas/severity_check.py`):** Triages findings based on compliance criteria and risk indicators.
- **Quarantine & Containment (`lambdas/quarantine.py`):** 
  - **Guardrail Protection:** Enforces a strict allowlist (`Admin`, `AdministratorAccess`, `cli-user`) to prevent automated lockout of administrative identities.
  - **Automated Quarantine:** Uses `boto3` to attach an inline `AutomatedQuarantine-DenyAll` policy directly to the compromised IAM role.
  - **Audit Logging:** Persists structured incident records to Amazon DynamoDB (`AuditedLogTable`).

### 3. Enterprise Next.js Dashboard (`/frontend`)
- **Zero Hardcoding (AWS SSM Parameter Store):** Dynamic discovery of runtime resources via `/ssarp/production/audit-table-name` and `/ssarp/production/state-machine-arn`.
- **Interactive Red Team Simulation:** A single-click "Launch Simulated Attack" button triggers the live AWS Step Functions pipeline via `@aws-sdk/client-sfn` and EventBridge.
- **Sandbox Management:** "Reset Sandbox" button purges test records (`SIM-*`) from DynamoDB without touching production data.
- **Enterprise Design:** Structured, light-mode financial/security portal layout built with Next.js App Router, Tailwind CSS, and Lucide icons.

---

## Repository Structure

```
├── bin/
│   └── ssarp.ts                 # CDK application entrypoint
├── lib/
│   ├── ssarp-stack.ts           # Core serverless backend architecture
│   ├── pipeline-stack.ts        # AWS CodePipeline CI/CD definition
│   └── app-stage.ts             # Deployment stage construct
├── lambdas/
│   ├── dispatcher.py            # SQS queue processor and Step Functions trigger
│   ├── enrichment.py            # Event context enrichment logic
│   ├── severity_check.py        # Automated severity evaluation
│   └── quarantine.py            # Automated IAM lockdown & DynamoDB audit logging
├── frontend/
│   ├── src/app/
│   │   ├── api/events/route.ts  # DynamoDB scan & event formatting API
│   │   ├── api/simulate/route.ts# Direct Step Functions & EventBridge trigger
│   │   ├── api/reset/route.ts   # DynamoDB sandbox cleanup API
│   │   ├── layout.tsx           # Base HTML shell & typography
│   │   └── page.tsx             # Enterprise incident monitoring dashboard
│   └── package.json             # Next.js frontend dependencies
├── security-base.yaml           # Security Foundation Tier 1 CloudFormation template
└── cdk.json                     # AWS CDK configuration
```

---

## Engineering Challenges & How We Solved Them

1. **Lambda Cold-Start Timeouts (3.0s Limit)**
   - **The Problem:** The first time the Quarantine Lambda ran, initializing the AWS SDK for IAM and DynamoDB took 4.4 seconds. AWS killed the function because the default timeout was 3 seconds.
   - **The Fix:** Increased the Lambda worker timeouts to 30 seconds in the CDK stack (`timeout: cdk.Duration.seconds(30)`).

2. **Preventing Accidental Admin Lockouts (Self-Destruct Prevention)**
   - **The Problem:** An automated quarantine robot could accidentally lock out administrators or the AWS CLI if a false alarm occurred.
   - **The Fix:** Built an explicit allowlist in the Python script (`PROTECTED_ROLES = ["Admin", "cli-user"]`). If an alert targets a protected identity, the script skips the lockdown and records a safe audit log.

3. **Eliminating Hardcoded Database & Pipeline Names**
   - **The Problem:** AWS generates random IDs for DynamoDB tables and Step Functions during deployment, making static `.env` files hard to maintain.
   - **The Fix:** Used AWS Systems Manager (SSM) Parameter Store. The CDK stack automatically publishes resource names into SSM paths, and the Next.js API discovers them dynamically at runtime.

4. **Local Development SDK Delays (EC2 Metadata Hang)**
   - **The Problem:** When running Next.js locally, the AWS SDK hung for 30–60 seconds trying to reach an internal EC2 server IP (`169.254.169.254`) before falling back to local credentials.
   - **The Fix:** Added `AWS_EC2_METADATA_DISABLED="true"` to local configuration to force immediate credential resolution in milliseconds.

5. **Simulating Live Threats Safely for Recruiters**
   - **The Problem:** Security pipelines are invisible when there are no active attacks, but you cannot run real destructive exploits just for a demo.
   - **The Fix:** Built an interactive simulation route (`/api/simulate`) that runs the full Step Functions workflow using harmless mock findings, alongside a "Reset Sandbox" button that purges only test records (`SIM-*`).

---

## Local Development & Verification

### 1. Backend Deployment
```bash
# Bootstrap AWS Account & Region (First time only)
npx cdk bootstrap

# Deploy the CI/CD Pipeline
npx cdk deploy SsarpPipelineStack
```

### 2. Frontend Dashboard
```bash
cd frontend
npm install

# Start local server
npm run dev
```

Open `http://localhost:3000` to access the live dashboard.
