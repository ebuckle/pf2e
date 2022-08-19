import { CharacterPF2e } from "@actor";
import { OneToFour } from "@module/data";

export class SkillBuilderPopup extends Application {
    constructor(private actor: CharacterPF2e, private skill: string) {
        super();
        actor.apps[this.appId] = this;
    }

    static override get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
            classes: ["skill-builder-popup"],
            title: game.i18n.localize("PF2E.SkillsLabel"),
            template: "systems/pf2e/templates/actors/character/skill-builder.html",
            width: "auto",
        };
    }

    override get id(): string {
        return `skill-builder-${this.actor.id}-${this.skill}`;
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const { actor } = this;

        $html.find("div[data-tooltip-content]").tooltipster({
            contentAsHTML: true,
            arrow: false,
            debug: BUILD_MODE === "development",
            interactive: true,
            side: ["bottom"],
            theme: "crb-hover",
        });

        $html.find("div.tooltip").tooltipster();

        $html.find<HTMLInputElement>("input[type=text], input[type=number]").on("focus", (event) => {
            event.currentTarget.select();
        });

        $html.find<HTMLInputElement>("input[data-property]").on("blur", async (event) => {
            const $input = $(event.target);
            const propertyPath = $input.attr("data-property") ?? "";
            await actor.update({ [propertyPath]: $input.val() });
        });

        $html.find("button[data-action=close]").on("click", () => {
            this.close();
        });
    }

    override async getData(options: Partial<FormApplicationOptions> = {}): Promise<PopupData> {
        const { actor, skill } = this;
        const build = actor.system.build.abilities;

        return {
            ...(await super.getData(options)),
            actor,
            manual: build.manual,
            levelSkillData: {},
            skill,
        };
    }

    /** Remove this application from the actor's apps on close */
    override async close(options: { force?: boolean } = {}): Promise<void> {
        delete this.actor.apps[this.appId];
        return super.close(options);
    }
}

interface PopupData {
    actor: CharacterPF2e;
    manual: boolean;
    levelSkillData: Record<number, SkillData>;
    skill: string;
}

type SkillData = {
    [Prof in OneToFour]: {
        level: number;
        source: {
            type: string;
            name: string;
            img: string;
        };
        validity: {
            valid: boolean;
            reason: string;
        };
        eligible: boolean;
        taken: boolean;
    };
};
