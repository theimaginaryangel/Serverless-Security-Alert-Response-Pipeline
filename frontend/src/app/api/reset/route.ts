import { NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const region = process.env.AWS_REGION || "eu-north-1";
const client = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(client);
const ssmClient = new SSMClient({ region });

export async function POST() {
  let tableName = process.env.AUDIT_TABLE_NAME;

  if (!tableName) {
    try {
      const ssmCommand = new GetParameterCommand({ Name: "/ssarp/production/audit-table-name" });
      const ssmResponse = await ssmClient.send(ssmCommand);
      tableName = ssmResponse.Parameter?.Value;
    } catch (e) {}
  }

  if (!tableName) return NextResponse.json({ success: false, error: "Table name not found." }, { status: 400 });

  try {
    const scanCommand = new ScanCommand({ TableName: tableName });
    const response = await docClient.send(scanCommand);
    const items = response.Items || [];

    let deletedCount = 0;
    for (const item of items) {
       // Only delete if it's a simulation (id contains SIM)
       const alertId = item.alert_id || item.id || "";
       if (alertId.includes("SIM-")) {
         await docClient.send(new DeleteCommand({
           TableName: tableName,
           Key: { alertId: alertId } // Using alertId as the partition key defined in CDK
         }));
         deletedCount++;
       }
    }

    return NextResponse.json({ success: true, message: `Sandbox reset successfully. Cleared ${deletedCount} simulated events.` });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
