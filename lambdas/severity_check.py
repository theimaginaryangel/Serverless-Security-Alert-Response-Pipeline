"""
Evaluates the severity of an incoming security alert.
"""
import json


def lambda_handler(event, _context):
    """
    Determines if an alert is CRITICAL, HIGH, or LOW based on keywords.
    """
    print("Starting Severity Check...")

    # 1. Check if the enrichment step already extracted a severity hint
    severity_hint = event.get('severity_hint', '')

    # 2. Also grab the original alert to search for keywords
    original_alert = event.get('original_alert', {})
    alert_text = json.dumps(original_alert).upper()

    # 3. Make a judgment (The Logic)
    severity_decision = "LOW"

    if severity_hint == "CRITICAL" or "CRITICAL" in alert_text or "UNAUTHORIZED" in alert_text:
        severity_decision = "CRITICAL"
    elif severity_hint == "HIGH" or "HIGH" in alert_text:
        severity_decision = "HIGH"

    print(f"Decision made: This alert is {severity_decision}")

    # 4. Hand the final package back to the Step Functions Manager
    return {
        "severity": severity_decision,
        "resource_to_quarantine": event.get('enrichment_context', {}).get('affected_resource_id', 'Unknown'),
        "full_details": event
    }
