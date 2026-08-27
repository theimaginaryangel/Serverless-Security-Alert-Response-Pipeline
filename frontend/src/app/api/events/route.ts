import { NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const region = process.env.AWS_REGION || "eu-north-1";
const client = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(client);

export interface FormattedSecurityEvent {
  id: string;
  timestamp: string;
  findingType: string;
  description: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  resourceType: "IAM Role" | "S3 Bucket" | "EC2 Instance" | "Security Group" | "Unknown";
  resourceId: string;
  resolution: "ISOLATED" | "ESCALATED" | "LOGGED";
  actionDetails: string;
}

const FALLBACK_READABLE_EVENTS: FormattedSecurityEvent[] = [
  {
    id: "SEC-2026-0891",
    timestamp: "10:42:01 UTC",
    findingType: "Unauthorized Lateral Access Attempt",
    description: "Compromised credential activity detected attempting privilege escalation across account boundary.",
    severity: "CRITICAL",
    resourceType: "IAM Role",
    resourceId: "arn:aws:iam::496795891920:role/ContractorDevAccess",
    resolution: "ISOLATED",
    actionDetails: "Attached AutomatedQuarantine-DenyAll inline policy. Active sessions invalidated."
  },
  {
    id: "SEC-2026-0890",
    timestamp: "10:15:33 UTC",
    findingType: "S3 Public Read Exposure",
    description: "Bucket ACL or Policy updated with public read access on production asset storage.",
    severity: "HIGH",
    resourceType: "S3 Bucket",
    resourceId: "arn:aws:s3:::customer-billing-records-eu",
    resolution: "ESCALATED",
    actionDetails: "Notification dispatched to on-call security engineer via Amazon SNS."
  },
  {
    id: "SEC-2026-0889",
    timestamp: "09:01:12 UTC",
    findingType: "Over-Privileged Policy Attachment",
    description: "IAM Role attached with AdministratorAccess without corresponding break-glass ticket.",
    severity: "LOW",
    resourceType: "IAM Role",
    resourceId: "arn:aws:iam::496795891920:role/StagingDeployer",
    resolution: "LOGGED",
    actionDetails: "Logged to DynamoDB case history for weekly compliance review."
  },
  {
    id: "SEC-2026-0888",
    timestamp: "08:33:45 UTC",
    findingType: "Outbound C2 Communication",
    description: "EC2 instance communicating with known malicious IP address on TCP port 4444.",
    severity: "CRITICAL",
    resourceType: "EC2 Instance",
    resourceId: "i-09876543210abcedf",
    resolution: "ISOLATED",
    actionDetails: "Target isolated via automated quarantine workflow."
  }
];

export async function GET() {
  const tableName = process.env.AUDIT_TABLE_NAME;

  if (!tableName) {
    return NextResponse.json({
      source: "demo",
      message: "Set AUDIT_TABLE_NAME in .env.local to query a specific AWS DynamoDB table.",
      events: FALLBACK_READABLE_EVENTS
    });
  }

  try {
    const command = new ScanCommand({
      TableName: tableName,
      Limit: 50,
    });

    const response = await docClient.send(command);
    const items = response.Items || [];

    if (items.length === 0) {
      return NextResponse.json({
        source: "aws-empty",
        message: "Connected to AWS DynamoDB successfully. No alerts recorded yet in this table.",
        events: FALLBACK_READABLE_EVENTS
      });
    }

    const formattedEvents: FormattedSecurityEvent[] = items.map((item, index) => ({
      id: item.alert_id || item.id || `EVT-${index + 1}`,
      timestamp: item.timestamp || new Date().toISOString(),
      findingType: item.findingType || item.title || "Security Finding",
      description: item.description || "Automated security event processed by pipeline.",
      severity: (item.severity || "LOW").toUpperCase() as FormattedSecurityEvent["severity"],
      resourceType: item.resourceType || "Unknown",
      resourceId: item.resource || item.resource_to_quarantine || item.affected_resource_id || "N/A",
      resolution: item.status === "QUARANTINED" ? "ISOLATED" : item.status === "FAILED" ? "ESCALATED" : "LOGGED",
      actionDetails: item.action_taken || "Processed through Step Functions workflow."
    }));

    return NextResponse.json({
      source: "aws-live",
      message: `Successfully retrieved ${formattedEvents.length} live records from AWS DynamoDB (${tableName}).`,
      events: formattedEvents
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({
      source: "aws-fallback",
      message: `AWS Query Notice: ${errorMessage}`,
      events: FALLBACK_READABLE_EVENTS
    });
  }
}
