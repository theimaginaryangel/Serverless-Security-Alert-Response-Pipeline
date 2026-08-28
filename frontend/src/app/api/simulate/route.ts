import { NextResponse } from "next/server";
import { SFNClient, StartExecutionCommand, ListStateMachinesCommand } from "@aws-sdk/client-sfn";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";

const region = process.env.AWS_REGION || "us-east-1";
const sfnClient = new SFNClient({ region });
const ssmClient = new SSMClient({ region });
const ebClient = new EventBridgeClient({ region });

export async function POST() {
  const findingId = `SIM-ATTACK-${Date.now()}`;
  const mockFinding = {
    "SchemaVersion": "2018-10-08",
    "Id": findingId,
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
        "Id": "SimulatedTargetRole",
        "Partition": "aws",
        "Region": region
      }
    ]
  };

  const payload = {
    detail: {
      findings: [mockFinding]
    }
  };

  let executionArn = "";

  // 1. Direct Step Functions Execution (Guaranteed instant trigger)
  try {
    let stateMachineArn = process.env.STATE_MACHINE_ARN || "";

    if (!stateMachineArn) {
      // Try reading from SSM first
      try {
        const ssmRes = await ssmClient.send(new GetParameterCommand({ Name: "/ssarp/production/state-machine-arn" }));
        stateMachineArn = ssmRes.Parameter?.Value || "";
      } catch {
        // If SSM parameter isn't deployed yet, discover it dynamically
        const sfnList = await sfnClient.send(new ListStateMachinesCommand({ maxResults: 20 }));
        const found = sfnList.stateMachines?.find(sm => sm.name?.includes("SecurityPipeline"));
        if (found?.stateMachineArn) {
          stateMachineArn = found.stateMachineArn;
        }
      }
    }

    if (stateMachineArn) {
      const execRes = await sfnClient.send(new StartExecutionCommand({
        stateMachineArn: stateMachineArn,
        input: JSON.stringify(payload)
      }));
      executionArn = execRes.executionArn || "";
      console.log(`[Simulate] Successfully triggered Step Functions: ${executionArn}`);
    }
  } catch (sfnErr) {
    console.error("[Simulate] Direct Step Functions execution failed:", sfnErr);
  }

  // 2. Also emit to EventBridge bus for full event-driven path
  try {
    await ebClient.send(new PutEventsCommand({
      Entries: [
        {
          Source: "aws.securityhub",
          DetailType: "Security Hub Findings - Imported",
          Detail: JSON.stringify({ findings: [mockFinding] }),
          EventBusName: "default",
        },
      ],
    }));
  } catch (ebErr) {
    console.error("[Simulate] EventBridge emission notice:", ebErr);
  }

  return NextResponse.json({
    success: true,
    message: "Simulated security alert executed through Step Functions pipeline.",
    findingId: findingId,
    executionArn: executionArn
  });
}
