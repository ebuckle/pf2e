import { RuleElementPF2e } from "./base";
import { RuleElementData } from "./data";

/**
 * @category RuleElement
 */
class AdjustDescriptionRuleElement extends RuleElementPF2e {
    override beforePrepareData(): void {
        const value = this.resolveValue(this.data.value) || "";
        if (this.data.replace) {
            this.item.data.data.description.value = value.toString();
        } else {
            this.item.data.data.description.value += value.toString();
        }
    }
}

interface AdjustDescriptionRuleElement {
    data: RuleElementData & {
        replace?: boolean;
    };
}

export { AdjustDescriptionRuleElement };
