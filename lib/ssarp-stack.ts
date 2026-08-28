import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as cfn_inc from 'aws-cdk-lib/cloudformation-include';

//---- NEW TOOLBOXES ARE BEING IMPORTED ----//
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as events from 'aws-cdk-lib/aws-events';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as targets from 'aws-cdk-lib/aws-events-targets';


export class SsarpStack extends cdk.Stack{
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

      // 1. The Glue(Loads your ymal file
    const securityFoundation = new cfn_inc.CfnInclude(this, 'SecurityFoundationTemplate',{
      templateFile: 'security-base.yaml',
    });

      // 2. The Filing Cabinet
    const auditTable = new dynamodb.Table(this, 'AuditedLogTable', {
      partitionKey:{ name: 'alertId', type: dynamodb.AttributeType.STRING}, 
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // Only pay exactly for what we use!
    });  

    // Publish the table name to SSM Parameter Store so the Next.js frontend can find it dynamically!
    new cdk.aws_ssm.StringParameter(this, 'AuditTableNameParam', {
      parameterName: '/ssarp/production/audit-table-name',
      stringValue: auditTable.tableName,
    });  

      // 3. The Inbox (SQS Queue)
    const alertQueue = new sqs.Queue(this, 'SecurityAlertQueue');
    
      // 4. The Security Guard (EventBridge Rule)
    const alertRule = new events.Rule(this, 'CatchSecurityAlertRule', {
      eventPattern: {
        source: ['aws.securityhub'], //Tells the Guard to specifically use guardduty alerts
      },
    });

        // 5. The Workers (Our Python Scripts)
    const enrichmentLambda = new lambda.Function(this, 'EnrichmentWorker', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'enrichment.lambda_handler',
      code: lambda.Code.fromAsset('lambdas'), // Sucks up your 'lambdas' folder!
      timeout: cdk.Duration.seconds(30),
    });

    const severityLambda = new lambda.Function(this, 'SeverityWorker', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'severity_check.lambda_handler',
      code: lambda.Code.fromAsset('lambdas'),
      timeout: cdk.Duration.seconds(30),
    });

    const quarantineLambda = new lambda.Function(this, 'QuarantineWorker', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'quarantine.lambda_handler',
      code: lambda.Code.fromAsset('lambdas'),
      timeout: cdk.Duration.seconds(30),
      environment: {
        TABLE_NAME: auditTable.tableName
      }
    });

    // CRITICAL FIX: Give the quarantine worker permission to write to the database!
    auditTable.grantReadWriteData(quarantineLambda);

    // Give the quarantine worker permission to actually attach the DenyAll policy to hacked roles
    quarantineLambda.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
      actions: ['iam:PutRolePolicy'],
      resources: ['*']
    }));

        // 6. Convert our workers into Flowchart Steps
    const enrichStep = new tasks.LambdaInvoke(this, 'Enrich Alert', {
      lambdaFunction: enrichmentLambda,
      outputPath: '$.Payload', 
    });

    const severityStep = new tasks.LambdaInvoke(this, 'Check Severity', {
      lambdaFunction: severityLambda,
      outputPath: '$.Payload',
    });

    const quarantineStep = new tasks.LambdaInvoke(this, 'Lockdown Resource', {
      lambdaFunction: quarantineLambda,
      outputPath: '$.Payload',
    });

    // 7. Draw the Flowchart!
    const flowchart = enrichStep
      .next(severityStep)
      .next(
        new sfn.Choice(this, 'Is it Critical?')
          .when(sfn.Condition.stringEquals('$.severity', 'CRITICAL'), quarantineStep)
          .otherwise(new sfn.Pass(this, 'Send to SNS (Coming soon)'))
      );

    // 8. Hire the Manager (Build the State Machine)
    const pipeline = new sfn.StateMachine(this, 'SecurityPipeline', {
      definitionBody: sfn.DefinitionBody.fromChainable(flowchart),
    });

    // Publish the State Machine ARN to SSM so the Next.js frontend can trigger it directly!
    new cdk.aws_ssm.StringParameter(this, 'StateMachineArnParam', {
      parameterName: '/ssarp/production/state-machine-arn',
      stringValue: pipeline.stateMachineArn,
    });

        // 9. Hand the Manager's phone number to the Security Guard
    alertRule.addTarget(new targets.SfnStateMachine(pipeline));

  }
}  
