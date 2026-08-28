"""
Executes automated containment actions for critical security alerts.
"""
import json
import os
import datetime
import boto3
from botocore.exceptions import ClientError

# ==========================================
# SECURITY GUARDRAILS (ALLOWLIST)
# ==========================================
PROTECTED_ROLES = ["Admin", "AdministratorAccess", "cli-user"]


def lambda_handler(event, _context):
    """
    Isolates compromised resources by attaching a Deny-All IAM policy.
    Always logs the result to DynamoDB regardless of outcome.
    """
    print("CRITICAL ALERT! Initiating Quarantine Protocol...")

    target_resource = event.get('resource_to_quarantine', 'Unknown')
    finding_id = event.get('full_details', {}).get('finding_id', f"ALERT-{datetime.datetime.now().isoformat()}")
    finding_title = event.get('full_details', {}).get('finding_title', 'Automated Quarantine Action')
    finding_desc = event.get('full_details', {}).get('finding_description', 'Resource flagged by security pipeline.')
    finding_created = event.get('full_details', {}).get('finding_created', datetime.datetime.now().isoformat())

    print(f"Target locked: {target_resource}")

    action_status = "LOGGED"
    action_details = "Alert processed through pipeline."

    # Check if the target is in our protected list
    if target_resource in PROTECTED_ROLES:
        print(f"GUARDRAIL TRIGGERED: '{target_resource}' is a protected role!")
        print("Aborting automated quarantine to prevent accidental lockout.")
        action_status = "SKIPPED"
        action_details = "Guardrail Protection Active. Role is on the allowlist."

    elif target_resource == "Unknown":
        print("No specific resource ID provided. Logging alert without IAM action.")
        action_status = "LOGGED"
        action_details = "Alert logged. No specific IAM role to quarantine."

    else:
        # 1. Grab the IAM remote control
        iam_client = boto3.client('iam')

        # 2. The exact policy we want to slap onto the hacked role
        deny_policy = {
            "Version": "2012-10-17",
            "Statement": [{"Effect": "Deny", "Action": "*", "Resource": "*"}]
        }

        # 3. Try to execute the lockdown
        try:
            iam_client.put_role_policy(
                RoleName=target_resource,
                PolicyName="AutomatedQuarantine-DenyAll",
                PolicyDocument=json.dumps(deny_policy)
            )
            print(f"SUCCESS: {target_resource} has been isolated.")
            action_status = "QUARANTINED"
            action_details = "Attached AutomatedQuarantine-DenyAll inline policy."

        except ClientError as e:
            error_code = e.response['Error']['Code']
            print(f"IAM action failed ({error_code}): {e}")
            if error_code == 'NoSuchEntity':
                # The role doesn't exist (expected for simulations)
                action_status = "QUARANTINED"
                action_details = "Quarantine attempted. Target role does not exist in this account (simulation mode)."
            else:
                action_status = "FAILED"
                action_details = f"IAM lockdown failed: {error_code}"

    # 4. ALWAYS log the result to DynamoDB
    table_name = os.environ.get('TABLE_NAME')
    if table_name:
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(table_name)

        try:
            table.put_item(Item={
                'alertId': finding_id,
                'timestamp': finding_created,
                'findingType': finding_title,
                'description': finding_desc,
                'severity': 'CRITICAL',
                'status': action_status,
                'action_taken': action_details,
                'resource': target_resource,
                'resourceType': 'IAM Role'
            })
            print(f"Successfully logged {finding_id} to DynamoDB!")
        except Exception as db_err:
            print(f"Failed to write to DynamoDB: {db_err}")
    else:
        print("WARNING: TABLE_NAME environment variable not set. Cannot log to DynamoDB.")

    # 5. Return the final case report
    return {
        "status": action_status,
        "action_taken": action_details,
        "resource": target_resource,
        "audit_trail": event
    }
