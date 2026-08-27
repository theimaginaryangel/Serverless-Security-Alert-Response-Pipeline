"""
This script grabs security alerts and adds helpful context to them.
"""

def lambda_handler(event, _context):
    """
    This job handles the incoming alerts.
    """
    print("‼️ Alert received! Starting enrichment process...")

    # 1. Open the delivery box ('event') to see the raw alert details
    # We use .get() so the code doesn't crash if the box is empty!
    alert_detail = event.get('detail', {})

    # 2. Find out WHAT is broken (the affected resource)
    # AWS Security Hub always stores the affected resources in a list.
    resources = alert_detail.get('resources', [])

    affected_resource = "Unknown"
    if len(resources) > 0:
        affected_resource = resources[0].get('Id', 'Unknown')

    print(f"Investigating resource: {affected_resource}")

    # 3. ENRICHMENT (Adding the context!)
    # For this MVP, we are attaching critical context to the alert.
    # (Later on, you can use Python to actually look up the AWS Tags here).
    enriched_data = {
        "owner_email": "security-team@company.com",
        "environment": "Production",
        "affected_resource_id": affected_resource
    }

    # 4. Hand the enriched paperwork back to the Step Functions Manager
    return {
        "status": "ENRICHED",
        "enrichment_context": enriched_data,
        "original_alert": event
    }
    