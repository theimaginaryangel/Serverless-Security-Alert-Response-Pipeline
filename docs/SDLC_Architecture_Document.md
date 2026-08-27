# System Design Document: Serverless Security & Compliance Pipeline

**Document Status:** Approved  
**Phase:** SDLC Phase 2 - System Design  

---

## 1. Executive Summary
Security operation teams are currently experiencing alert fatigue due to the high volume of security and compliance findings generated across the AWS Organization (e.g., active threats, exposed S3 buckets, overly privileged IAM roles). Manual triage introduces latency, increasing the risk of data exfiltration or lateral movement.

This project introduces an automated, serverless event-driven pipeline that ingests all findings from AWS Security Hub, enriches them with resource context, assesses severity, and executes automated remediation (quarantine) or escalates to human operators. 

## 2. System Requirements

### 2.1 Functional Requirements
* **Ingestion:** The system must accept incoming security and compliance alerts.
* **Enrichment:** The system must append contextual metadata to the alert (e.g., finding the owner of an exposed S3 bucket).
* **Evaluation:** The system must determine the severity of the alert (Critical, High, Medium, Low).
* **Branching Action:**
  * If `Critical`: Automatically quarantine the affected resource (e.g., block public access on S3, attach deny policy to IAM role).
  * If `< Critical`: Dispatch notifications to human operators via Email and Slack.
* **Auditability:** Every processed alert must be permanently logged with its final resolution state.

### 2.2 Non-Functional Requirements
* **Reliability:** The system must not drop alerts during high-throughput burst events (utilizing SQS buffers).
* **Separation of Duties:** The IAM roles and SNS notification topics must be defined in a separate Infrastructure-as-Code (IaC) stack (CloudFormation) from the application logic (CDK) to allow independent security auditing.
* **Observability:** The system must support distributed tracing.

---

## 3. Architecture & Engineering Decisions

### 3.1 Hybrid Infrastructure as Code (IaC) Pattern
To satisfy the strict "Separation of Duties" requirement, the project utilizes a hybrid IaC approach:
* **Tier 1 (Security Foundation):** Authored in raw AWS CloudFormation (YAML). Contains highly privileged resources: `AWS::IAM::Role` and `AWS::SNS::Topic`.
* **Tier 2 (Application Logic):** Authored in AWS CDK (TypeScript). Contains the Step Functions, SQS, DynamoDB, and Lambda configurations.
* **Integration:** The CDK application utilizes the `CfnInclude` construct to ingest the Tier 1 CloudFormation template seamlessly.

### 3.2 State Machine Definition (Step Functions)
The workflow is defined as a directed acyclic graph (DAG):
1. `Task: EnrichContext` (Python Lambda)
2. `Task: AssessSeverity` (Python Lambda)
3. `Choice: Routing`
   * Condition: `$.severity == 'CRITICAL'` -> `Task: QuarantineResource`
   * Condition: `$.severity <= 'HIGH'` -> `Task: NotifyOperators`
4. `Task: LogToDynamoDB` (Native AWS SDK Integration)
