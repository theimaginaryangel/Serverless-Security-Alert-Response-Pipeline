"""
Evaluates the severity of an incoming security alert.
"""
import json


def lambda_handler(event, _context):
    """
    Determines if an alert is CRITICAL, HIGH, or LOW based on keywords.
    """
    print("Starting Severity Check...")

    # 1. Grab the original alert that our Enrichment script passed to us!
    original_alert = event.get('original_alert', {})

    # 2. Turn the whole alert into uppercase text to search it.
    alert_text = json.dumps(original_alert).upper()

    # 3. Make a judgment (The Logic)
    severity_decision = "LOW"

    if "CRITICAL" in alert_text or "UNAUTHORIZED" in alert_text:
        severity_decision = "CRITICAL"
    elif "HIGH" in alert_text:
        severity_decision = "HIGH"

    print(f"Decision made: This alert is {severity_decision}")

    # 4. Hand the final package back to the Step Functions Manager
    return {
        "severity": severity_decision,
        "resource_to_quarantine": event.get('enrichment_context', {}).get('affected_resource_id', 'Unknown'),
        "full_details": event
    }
