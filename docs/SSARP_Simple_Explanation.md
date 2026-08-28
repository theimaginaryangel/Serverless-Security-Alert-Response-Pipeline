# SSARP: The Simple Explanation

This guide explains your entire project in very simple terms. Read this before an interview, and you will understand exactly how the system you built works, from start to finish!

## 1. What does the app do?

Imagine you are the head of security at a bank. Every single day, hundreds of alarms go off. Some are real break-ins, and some are just a janitor accidentally opening the wrong door. Your security team has to manually check every single alarm, one by one. By the time someone wakes up at 3:00 AM to investigate a real break-in, the thief is already gone.

**SSARP** is an automated security guard for your entire Amazon Web Services (AWS) cloud. When an alarm goes off (like a hacker stealing credentials, or someone accidentally making a private database public), SSARP catches the alarm, investigates it, decides how dangerous it is, and if it is critical, it instantly locks down the compromised account in seconds, without waiting for a human.

It also has a live dashboard where you can watch everything happening in real time, and a big red "Launch Simulated Attack" button so recruiters can watch the entire system respond to a fake threat.

---

## 2. The Tools We Used (And why we used each one)

*   **AWS CDK with TypeScript (The Blueprint Machine):** Instead of clicking buttons in the AWS Console to create databases and queues one by one, we wrote TypeScript code that describes our entire cloud infrastructure. When we run one command, AWS reads our blueprint and builds everything automatically. This is called "Infrastructure as Code" (IaC).
*   **Raw CloudFormation YAML (The Auditor's Checklist):** For the most sensitive resources (IAM Roles that control who has power, and SNS Topics that control data leaving the account), we wrote them in a separate plain-text YAML file. This allows security auditors to read and approve just the dangerous stuff without digging through hundreds of lines of application code. This pattern is called "Separation of Duties."
*   **Amazon EventBridge (The Alarm System):** This is the motion sensor. It sits in the background constantly watching for security alarms from AWS Security Hub. The moment an alarm fires, EventBridge catches it and passes it to the next step.
*   **AWS Step Functions (The Manager):** This is the boss who runs the flowchart. It receives the alarm from EventBridge and sends it through a multi-step workflow: first to the investigator, then to the judge, and finally to the enforcer. You can literally watch a visual flowchart light up green in real time in the AWS Console.
*   **AWS Lambda with Python (The Workers):** These are three small Python scripts that do the actual work. They only run when they are needed (that is what "serverless" means), and you only pay for the exact milliseconds they run.
*   **Amazon DynamoDB (The Filing Cabinet):** Every single action the system takes is permanently saved here. If an auditor asks, "What happened to that compromised account on August 28th?", you can pull up the exact record.
*   **Amazon SNS (The Phone Tree):** For non-critical alerts that do not need automatic lockdown, SNS sends an email or Slack notification to the human security team so they can investigate at their own pace.
*   **AWS SSM Parameter Store (The Address Book):** When AWS creates your database, it gives it a random generated name. Instead of hardcoding that name, we save it in SSM. The frontend asks SSM at runtime: "What is the database name?" This is how enterprise cloud applications avoid configuration drift.
*   **AWS CodePipeline (The Automated Courier):** Every time you push code to GitHub, CodePipeline automatically downloads your code, builds it, and deploys the updated infrastructure to AWS. You never have to manually deploy again.
*   **Next.js with Tailwind CSS (The Dashboard):** This is the website you see and click on. It is a clean, minimalist, light-mode enterprise security dashboard that connects directly to your live AWS cloud.

---

## 3. The Infrastructure: What gets built when you deploy?

When you run `npx cdk deploy`, here is everything that gets created in your AWS account in a single command:

1.  **The Security Foundation (`security-base.yaml`):** AWS reads the YAML file and creates an IAM execution role (the "keys to the building") and an SNS notification topic (the "phone tree"). These are isolated in their own file so auditors can review them independently.
2.  **The Filing Cabinet (DynamoDB Table):** A database table called `AuditedLogTable` is created. Every alert that flows through the pipeline gets permanently recorded here with a unique `alertId`.
3.  **The Alarm Sensor (EventBridge Rule):** A rule is created that says: "If ANY event comes from `aws.securityhub`, catch it and send it to the Step Functions pipeline."
4.  **The Three Workers (Lambda Functions):** Three Python scripts are uploaded from your `lambdas/` folder and deployed as serverless functions with a 30-second timeout each.
5.  **The Flowchart (Step Functions State Machine):** A visual workflow is created that chains the three workers together: Enrichment, then Severity Check, then a decision branch (Critical goes to Quarantine, non-critical goes to SNS).
6.  **The Address Book (SSM Parameters):** The randomly generated DynamoDB table name and Step Functions ARN are saved to SSM so the Next.js frontend can find them dynamically.
7.  **The Permissions (IAM Grants):** The Quarantine worker is given explicit permission to read/write to DynamoDB (`grantReadWriteData`) and to attach IAM policies to compromised roles (`iam:PutRolePolicy`).

---

## 4. The Alert Flow: What happens when a real security threat is detected?

When AWS Security Hub detects a real threat (like a hacker using stolen credentials), here is the step-by-step story of what happens automatically in seconds:

1.  **Catch (EventBridge):** AWS Security Hub fires an alarm. EventBridge is watching 24/7. It catches the alarm and passes the raw JSON data to Step Functions.
2.  **Investigate (Enrichment Lambda):** The first Python worker opens the alarm and investigates it. It digs into the nested JSON to find: What resource was affected? What type is it (IAM Role? S3 Bucket? EC2 Server)? How severe does Security Hub think it is? It packages all this context together into a clean report.
3.  **Judge (Severity Check Lambda):** The second Python worker reads the enrichment report and makes a decision. It checks two things: the severity hint from the enrichment step, and the raw text of the alert for keywords like "CRITICAL" or "UNAUTHORIZED." Based on this, it stamps the alert as `CRITICAL`, `HIGH`, or `LOW`.
4.  **Decide (Step Functions Choice):** Step Functions looks at the severity stamp. If it says `CRITICAL`, the alert is routed to the Quarantine worker. If it says anything less, it gets routed to SNS for human notification.
5.  **Lockdown (Quarantine Lambda):** This is the enforcer. It does three things:
    *   **Guardrail Check:** Before touching anything, it checks if the compromised resource is on the protected allowlist (`Admin`, `AdministratorAccess`, `cli-user`). If it is, the script refuses to quarantine it and logs a safe "SKIPPED" record instead.
    *   **Attach DenyAll Policy:** If the resource is NOT protected, it uses `boto3` (the official AWS Python library) to attach an inline policy called `AutomatedQuarantine-DenyAll` directly onto the compromised IAM role. This policy says: "You are not allowed to do anything, anywhere." The compromised account is instantly frozen.
    *   **Log to DynamoDB:** Regardless of what happened (quarantined, skipped, or failed), the script ALWAYS saves a complete audit record to DynamoDB with the alert ID, timestamp, description, severity, action taken, and target resource.

---

## 5. The Simulation Flow: What happens when a recruiter clicks "Launch Simulated Attack"?

This is the feature that makes your portfolio come alive. Here is exactly what happens:

1.  **Click the Button:** The recruiter clicks the red "Launch Simulated Attack" button on the Next.js dashboard.
2.  **Build a Fake Alert:** The Next.js backend (`/api/simulate`) creates a fake Security Hub finding. It looks exactly like a real alarm, but the target resource is a made-up role called `SimulatedTargetRole` and the ID starts with `SIM-ATTACK-`.
3.  **Trigger the Pipeline Directly:** The backend uses the AWS Step Functions SDK (`StartExecutionCommand`) to directly start an execution of your live State Machine in the cloud. It also emits the same event to EventBridge for the full event-driven path.
4.  **The Pipeline Runs for Real:** Your three Python Lambdas run in the live AWS cloud, exactly like they would for a real threat. The enrichment worker extracts the target. The severity worker detects "CRITICAL" and "UNAUTHORIZED" in the text. The quarantine worker attempts to lock down `SimulatedTargetRole`.
5.  **Safe Failure:** Because `SimulatedTargetRole` does not actually exist in your AWS account, the `put_role_policy` call throws a `NoSuchEntity` error. The quarantine script catches this gracefully, marks it as "QUARANTINED (simulation mode)," and still writes the full audit record to DynamoDB.
6.  **Dashboard Updates:** After 3 seconds, the Next.js frontend automatically fetches the latest data from DynamoDB. The recruiter sees the new Critical threat appear in the table, the metrics tick up, and the status shows "ISOLATED."

### What about "Reset Sandbox"?
When the recruiter clicks "Reset Sandbox," the backend (`/api/reset`) scans DynamoDB and deletes ONLY the records whose ID starts with `SIM-`. Real production data is never touched. The dashboard returns to a clean zero state, ready for the next recruiter.

---

## 6. The CI/CD Pipeline: What happens when you push code to GitHub?

You never have to manually deploy your backend again. Here is how the automation works:

1.  **Push to GitHub:** You run `git push` from your laptop. Your code lands on the `main` branch of your GitHub repository.
2.  **AWS Detects the Push:** Your AWS CodePipeline is connected to your GitHub repo using an AWS CodeStar Connection (a secure handshake between AWS and GitHub using an ARN). The moment it sees a new commit on `main`, it wakes up.
3.  **Download and Build:** The pipeline downloads your entire repository, runs `npm ci` (installs dependencies), `npm run build` (compiles TypeScript), and `npx cdk synth` (generates CloudFormation templates from your CDK code).
4.  **Deploy to AWS:** The pipeline takes the generated templates and updates your live AWS infrastructure. New Lambda code gets uploaded, new permissions get applied, new SSM parameters get published. All automatically.

---

## 7. The Dashboard: What does each part of the screen do?

*   **Header Bar:** Shows the project name ("Security Response Pipeline") and three action buttons:
    *   **Reset Sandbox:** Clears simulated test data from DynamoDB.
    *   **Launch Simulated Attack:** Fires a fake critical threat into your live AWS pipeline.
    *   **Sync:** Manually refreshes the data from DynamoDB.
*   **Status Indicator:** The green pulsing dot shows whether the dashboard is connected to live AWS DynamoDB ("AWS Live") or running in fallback demo mode ("Active").
*   **Metrics Cards (Top Row):**
    *   **Total Monitored:** How many alerts have been processed by Step Functions.
    *   **Critical Findings:** How many of those alerts were stamped as CRITICAL.
    *   **Auto-Quarantined:** How many compromised resources were automatically isolated with a DenyAll policy.
    *   **Compliance State:** Shows "Enforced" when the guardrail allowlist is active.
*   **Filter Buttons:** Let you filter the table by severity level (ALL, CRITICAL, HIGH, LOW).
*   **Data Table:** Shows every processed alert with its finding type, description, severity badge, target resource ARN, remediation action taken, and final status (ISOLATED, ESCALATED, or LOGGED).

---

## 8. The File Structure: What does each file do?

### Backend Infrastructure (TypeScript CDK)
*   **`bin/ssarp.ts`:** The entry point. It tells CDK: "Build the Pipeline Stack," and the Pipeline Stack builds everything else.
*   **`lib/pipeline-stack.ts`:** Defines the CI/CD courier. It connects to your GitHub repo via CodeStar and runs `npm ci`, `npm run build`, `npx cdk synth` on every push.
*   **`lib/app-stage.ts`:** A wrapper that puts your entire application into a "Stage" box so the pipeline can deploy it as one unit.
*   **`lib/ssarp-stack.ts`:** The main blueprint. This single file creates EVERYTHING: the DynamoDB table, the SQS queue, the EventBridge rule, the three Lambda functions, the Step Functions state machine, the SSM parameters, and all the IAM permissions.
*   **`security-base.yaml`:** The security auditor's file. Contains only the IAM execution role and the SNS notification topic in plain YAML.

### Python Workers (Lambda Functions)
*   **`lambdas/enrichment.py`:** Opens the raw alarm, navigates the nested Security Hub JSON structure (`detail.findings[0].Resources[0].Id`), extracts the resource ID, resource type, severity label, title, and description, and packages it all into a clean report.
*   **`lambdas/severity_check.py`:** Reads the enrichment report and the raw alarm text. Searches for keywords like "CRITICAL" and "UNAUTHORIZED." Stamps the alert with a severity decision and passes the target resource ID forward.
*   **`lambdas/quarantine.py`:** The enforcer. Checks the allowlist, attempts IAM lockdown via `put_role_policy`, handles errors gracefully (including `NoSuchEntity` for simulations), and ALWAYS logs the complete audit record to DynamoDB using `table.put_item()`.

### Frontend Dashboard (Next.js)
*   **`frontend/src/app/page.tsx`:** The main React component. Renders the header, metrics cards, filter buttons, data table, and the three action buttons (Reset, Simulate, Sync). Uses `useState` and `useEffect` to manage data fetching.
*   **`frontend/src/app/api/events/route.ts`:** The data API. Discovers the DynamoDB table name from `process.env` or SSM Parameter Store, runs a `ScanCommand`, maps the raw database items into clean `FormattedSecurityEvent` objects, and returns them to the frontend.
*   **`frontend/src/app/api/simulate/route.ts`:** The simulation trigger. Builds a fake Security Hub finding, discovers the State Machine ARN from `process.env` or SSM, and fires `StartExecutionCommand` directly on the live Step Functions pipeline. Also emits to EventBridge for the full event-driven path.
*   **`frontend/src/app/api/reset/route.ts`:** The cleanup API. Scans DynamoDB, finds all records with IDs containing `SIM-`, and deletes only those records using `DeleteCommand`. Real data is never touched.

---

## 9. The Hard Challenges You Solved

In interviews, they will ask: *"What was the hardest part of building this?"* Here are five real answers you can give:

### Challenge 1: The 3-Second Death Timer (Lambda Cold Start)
*   **The Problem:** The very first time the Quarantine Lambda ran in AWS, it had to initialize the Python runtime, load the `boto3` library, and connect to both the IAM service and DynamoDB. This took 4.4 seconds total. But AWS Lambda has a default timeout of 3.0 seconds. AWS killed the function mid-execution, and the entire Step Functions pipeline showed "FAILED: Sandbox.Timedout."
*   **How you fixed it:** You increased the Lambda timeout from 3 seconds to 30 seconds in the CDK blueprint (`timeout: cdk.Duration.seconds(30)`). After the first "cold start," subsequent runs complete in under 1 second because the Python runtime stays warm.

### Challenge 2: The Self-Destruct Problem (Admin Lockout Prevention)
*   **The Problem:** The Quarantine script automatically attaches a "Deny Everything" policy to any compromised role. But what if a false alarm targets the `Admin` role? Or your own `cli-user` that you use to deploy infrastructure? The robot would lock YOU out of your own AWS account.
*   **How you fixed it:** You built a hardcoded allowlist at the very top of `quarantine.py`: `PROTECTED_ROLES = ["Admin", "AdministratorAccess", "cli-user"]`. Before the script touches any role, it checks this list first. If the target is protected, it skips the lockdown, prints "GUARDRAIL TRIGGERED," and logs a safe "SKIPPED" record to DynamoDB instead.

### Challenge 3: The Invisible Data Path (Enrichment Parsing Bug)
*   **The Problem:** When the simulation button sent a fake alert to the pipeline, the Enrichment Lambda could not find the target resource. It returned `"Unknown"` every time. Then the Quarantine Lambda saw `"Unknown"`, said "nothing to quarantine," returned `FAILED`, and stopped before ever writing to DynamoDB. The pipeline ran perfectly, but nothing appeared on the dashboard.
*   **How you fixed it:** You traced the entire data path from button click to database. You discovered that AWS Security Hub nests the resource deep inside `detail.findings[0].Resources[0].Id` (capital R), but the old enrichment code was looking for `detail.resources` (lowercase r, wrong level). You rewrote the enrichment script to correctly navigate the nested JSON. You also rewrote the quarantine script so it ALWAYS writes to DynamoDB, even when the target is "Unknown" or the IAM action fails.

### Challenge 4: The 60-Second Freeze (EC2 Metadata Timeout)
*   **The Problem:** When running the Next.js dashboard on your local laptop, every single AWS request took 30 to 60 seconds to respond. The dashboard was nearly unusable. The terminal showed `ETIMEDOUT` errors pointing to IP address `169.254.169.254`.
*   **How you fixed it:** You discovered that the AWS Node.js SDK automatically tries to check if it is running inside an Amazon EC2 server by pinging a special internal IP (`169.254.169.254`). Because you are on a Windows laptop, not an EC2 server, every request hung for 60 seconds waiting for a response that would never come. You added `AWS_EC2_METADATA_DISABLED="true"` to your environment configuration, which tells the SDK to skip the metadata check entirely and immediately use your local AWS credentials.

### Challenge 5: Proving It Works Without Breaking Things (Safe Simulation)
*   **The Problem:** Security pipelines are invisible when there are no active threats. If a recruiter opens your portfolio and sees an empty dashboard with all zeros, they have no way of knowing if your backend actually works. But you cannot launch real attacks against your own AWS account just for a demo.
*   **How you fixed it:** You built two things. First, a "Launch Simulated Attack" button that creates a fake Security Hub finding with a non-existent role (`SimulatedTargetRole`) and fires it directly into your live Step Functions pipeline using `StartExecutionCommand`. The pipeline runs for real, the IAM lockdown safely fails with `NoSuchEntity` (because the role does not exist), and the quarantine script still writes the full audit record to DynamoDB. Second, a "Reset Sandbox" button that scans DynamoDB and deletes only records with IDs starting with `SIM-`, leaving real production data untouched. This lets every recruiter experience a clean demo.
