import { CharacterPF2e } from "@actor";
import { sluggify } from "@util";

export class CharacterLoreEditor extends FormApplication<CharacterPF2e> {
    get character() {
        return this.object;
    }

    static override get defaultOptions() {
        const options = super.defaultOptions;

        options.id = "character-lore-editor";
        options.classes = ["pf2e", "character"];
        options.title = game.i18n.localize("PF2E.AddLoreSkill");
        options.template = "systems/pf2e/templates/actors/lore-dialog.html";
        options.width = "auto";
        options.height = "auto";

        return options;
    }

    /** Prepare data to be sent to HTML. */
    override getData() {
        return { ...super.getData(), abilities: CONFIG.PF2E.abilities };
    }

    /**
     * Apply changes to the actor based on the data in the form.
     * @param event
     * @param formData
     */
    override async _updateObject(_event: Event, formData: Record<string, unknown>): Promise<void> {
        if (typeof formData.name === "string" && formData.name !== "") {
            const key = sluggify(formData.name);
            this.character.update({
                [`system.lores.${key}`]: {
                    name: formData.name,
                    rank: 0,
                    ability: formData.ability,
                },
            });
        }
    }
}
