"""
Executes automated containment actions for critical security alerts.
"""
import json
import boto3
from botocore.exceptions import ClientError  # <-- You need to add this line!

# ==========================================
# NEW: SECURITY GUARDRAILS (ALLOWLIST)
# ==========================================
PROTECTED_ROLES = ["Admin", "AdministratorAccess", "cli-user"]


def lambda_handler(event, _context):
    """
    Isolates compromised resources by attaching a Deny-All IAM policy.
    """
    print("🔴🔴 CRITICAL ALERT! Initiating Quarantine Protocol...")

    target_resource = event.get('resource_to_quarantine', 'Unknown')
    print(f"Target locked: {target_resource}")

    if target_resource == "Unknown":
        return {"status": "FAILED", "reason": "No resource ID provided"}

    # Check if the target is in our protected list
    if target_resource in PROTECTED_ROLES:
        print(
            f"⚠️ GUARDRAIL TRIGGERED: '{target_resource}' is a protected role!")
        print("Aborting automated quarantine to prevent accidental lockout.")
        return {
            "status": "SKIPPED",
            "action_taken": "None - Guardrail Protection Active",
            "resource": target_resource,
            "audit_trail": event
        }
    # ==========================================

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

    except ClientError as e:
        print(f"FAILED to quarantine resource: {e}")
        action_status = "FAILED"

    # 4. Return the final case report
    return {
        "status": action_status,
        "action_taken": "Attached DenyAll Policy",
        "resource": target_resource,
        "audit_trail": event
    }
