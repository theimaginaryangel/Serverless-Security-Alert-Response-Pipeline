import { NextResponse } from "next/server";
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";

const region = process.env.AWS_REGION || "eu-north-1";
const ebClient = new EventBridgeClient({ region });

export async function POST() {
  const mockAlert = {
    "SchemaVersion": "2018-10-08",
    "Id": `SIM-ATTACK-${Date.now()}`,
    "ProductArn": `arn:aws:securityhub:${region}:123456789012:product/aws/securityhub`,
    "GeneratorId": "aws-foundational-security-best-practices/v/1.0.0/IAM.1",
    "AwsAccountId": "123456789012",
    "Types": ["Software and Configuration Checks/Industry and Regulatory Standards"],
    "CreatedAt": new Date().toISOString(),
    "UpdatedAt": new Date().toISOString(),
    "Severity": { "Label": "CRITICAL" },
    "Title": "[Simulated Attack] Unauthorized IAM Privilege Escalation",
    "Description": "Simulation: A user attempted to escalate privileges by attaching AdministratorAccess to a restricted role.",
    "Resources": [
      {
        "Type": "AwsIamRole",
        "Id": "arn:aws:iam::123456789012:role/SimulatedTargetRole",
        "Partition": "aws",
        "Region": region
      }
    ]
  };

  const command = new PutEventsCommand({
    Entries: [
      {
        Source: "aws.securityhub",
        DetailType: "Security Hub Findings - Imported",
        Detail: JSON.stringify({ findings: [mockAlert] }),
        EventBusName: "default",
      },
    ],
  });

  try {
    await ebClient.send(command);
    return NextResponse.json({ success: true, message: "Simulation event dispatched to AWS EventBridge!" });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
