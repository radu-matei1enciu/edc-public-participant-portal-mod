import {PolicySet} from "../../core/redline";
import {CelExpression} from "../../core/models/cel-expression.model";

export const PARTNER_ACCESS_EXPRESSION: CelExpression = {
    "@id": "cert-partner-access-policy-expression",
    leftOperand: "CounterPartyId",
    description: "Evaluate counter party ID for certificate access",
    scopes: ["catalog", "contract.negotiation", "transfer.process"],
    expression: "ctx.agent.id == this.rightOperand"
}

export function getAccessRestrictionPolicy(partnerId: string): PolicySet {
    return {
        permission: [
            {
                action: "use",
                constraint: [
                    {
                        leftOperand: "CounterPartyId",
                        operator: "eq",
                        rightOperand: partnerId
                    }
                ]
            }
        ]
    };
}