"""
This script grabs security alerts and adds helpful context to them.
"""


def lambda_handler(event, _context):
    """
    This job handles the incoming alerts.
    """
    print("Alert received! Starting enrichment process...")

    # 1. Open the delivery box ('event') to see the raw alert details
    alert_detail = event.get('detail', {})

    # 2. Security Hub wraps findings in a list. Extract the first one.
    findings = alert_detail.get('findings', [])
    finding = findings[0] if len(findings) > 0 else {}

    # 3. Find the affected resource from the finding
    resources = finding.get('Resources', [])
    affected_resource = "Unknown"
    resource_type = "Unknown"

    if len(resources) > 0:
        affected_resource = resources[0].get('Id', 'Unknown')
        resource_type = resources[0].get('Type', 'Unknown')

    print(f"Investigating resource: {affected_resource} (Type: {resource_type})")

    # 4. Extract severity directly from the finding
    severity_label = finding.get('Severity', {}).get('Label', 'UNKNOWN')

    # 5. ENRICHMENT (Adding the context!)
    enriched_data = {
        "owner_email": "security-team@company.com",
        "environment": "Production",
        "affected_resource_id": affected_resource,
        "resource_type": resource_type
    }

    # 6. Hand the enriched paperwork back to the Step Functions Manager
    return {
        "status": "ENRICHED",
        "severity_hint": severity_label,
        "finding_id": finding.get('Id', 'UNKNOWN'),
        "finding_title": finding.get('Title', 'Security Finding'),
        "finding_description": finding.get('Description', ''),
        "finding_created": finding.get('CreatedAt', ''),
        "enrichment_context": enriched_data,
        "original_alert": event
    }