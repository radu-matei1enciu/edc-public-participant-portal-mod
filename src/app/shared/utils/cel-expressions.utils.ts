export const PARTNER_ACCESS_EXPRESSION = {
    "@id": "cert-partner-access-policy-expression",
    leftOperand: "CounterPartyId",
    description: "Evaluate counter party ID for certificate access",
    scopes: ["catalog", "contract.negotiation", "transfer.process"],
    expression: "ctx.agent.id == this.rightOperand"
}

export function getAccessRestrictionPolicy(partnerId: string): string {
    return JSON.stringify({
        permission: [
            {
                constraint: [
                    {
                        leftOperand: "CounterPartyId",
                        operator: "eq",
                        rightOperand: partnerId
                    }
                ]
            }
        ]
    });
}