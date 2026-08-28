"""
Reads buffered security alerts from the SQS queue and starts Step Functions executions.
"""
import json
import os
import boto3


def lambda_handler(event, _context):
    """
    Triggered by SQS. Each message contains a raw EventBridge event.
    Starts one Step Functions execution per message.
    """
    sfn_client = boto3.client('stepfunctions')
    state_machine_arn = os.environ['STATE_MACHINE_ARN']

    started = 0
    for record in event.get('Records', []):
        # The SQS message body is the raw EventBridge event JSON
        payload = record['body']
        print(f"Dispatching alert to Step Functions: {payload[:200]}...")

        sfn_client.start_execution(
            stateMachineArn=state_machine_arn,
            input=payload
        )
        started += 1

    print(f"Successfully dispatched {started} alert(s) to the pipeline.")
    return {"dispatched": started}
